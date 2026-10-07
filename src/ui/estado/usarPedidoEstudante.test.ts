import { act, renderHook, waitFor } from '@testing-library/react'
import { MENSAGEM_COMPROVANTES_DEMAIS } from '@/domain/pedidoEstudante.ts'
import { usePedidoEstudante } from './usarPedidoEstudante.ts'

const FALHA = 'Não deu para falar com o servidor. Confira a internet e tente de novo.'
const RECUSA_DO_ARMAZENAMENTO = { error: { message: 'new row violates row-level security policy', statusCode: '403' } }

const banco = vi.hoisted(() => ({
  linha: { data: null as unknown, error: null as unknown },
  upload: { error: null as unknown },
  rpc: { error: null as unknown },
  /** As respostas de conferir_envio_de_comprovante, uma por chamada; a última fica valendo. */
  conferencias: [{ data: 'ok' as unknown, error: null as unknown }],
  /** A conferência lança em vez de responder (a rede caiu no meio). */
  conferenciaLanca: false,
  enviados: [] as string[],
  removidos: [] as string[][],
  chamadas: [] as { funcao: string; args: unknown }[],
}))

const cliente = {
  from: () => ({
    select: () => ({
      eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => banco.linha }) }) }),
    }),
  }),
  storage: {
    from: () => ({
      upload: async (caminho: string) => {
        banco.enviados.push(caminho)
        return banco.upload
      },
      remove: async (caminhos: string[]) => {
        banco.removidos.push(caminhos)
        return { error: null }
      },
    }),
  },
  rpc: async (funcao: string, args?: unknown) => {
    banco.chamadas.push({ funcao, args })
    if (funcao !== 'conferir_envio_de_comprovante') return banco.rpc
    if (banco.conferenciaLanca) throw new Error('rede caiu')
    return (banco.conferencias.length > 1 ? banco.conferencias.shift() : banco.conferencias[0]) ?? { data: null, error: null }
  },
}

vi.mock('./supabase.ts', () => ({ obterSupabase: () => cliente, supabaseConfigurado: () => true }))

const arquivo = new File(['%PDF'], 'Declaração.pdf', { type: 'application/pdf' })
const dados = { instituicao: ' UFRN ', matricula: '20230045871', periodo: 7, formatura: '2027-07' }

/** Abre o gancho, espera carregar e envia uma vez. Devolve o que a tela recebeu. */
async function enviarUmaVez(): Promise<string | null> {
  const { result } = renderHook(() => usePedidoEstudante('u1'))
  await waitFor(() => expect(result.current.carregado).toBe(true))
  let erro: string | null = 'nada'
  await act(async () => {
    erro = await result.current.enviar(dados, arquivo)
  })
  return erro
}

const funcoesChamadas = () => banco.chamadas.map((c) => c.funcao)

describe('usePedidoEstudante', () => {
  beforeEach(() => {
    banco.linha = { data: null, error: null }
    banco.upload = { error: null }
    banco.rpc = { error: null }
    banco.conferencias = [{ data: 'ok', error: null }]
    banco.conferenciaLanca = false
    banco.enviados = []
    banco.removidos = []
    banco.chamadas = []
  })

  it('lê o pedido mais recente', async () => {
    banco.linha = { data: { id: 'p1', status: 'em_analise', formatura: '2027-07-01', periodo: 7, instituicao: 'UFRN', matricula: '1', enviado_em: '2026-09-30T13:00:00Z' }, error: null }
    const { result } = renderHook(() => usePedidoEstudante('u1'))
    await waitFor(() => expect(result.current.pedido?.status).toBe('em_analise'))
  })

  it('CA-273: confere a conta, envia o arquivo para a pasta da pessoa e cria o pedido com o dia 1 do mês', async () => {
    expect(await enviarUmaVez()).toBeNull()
    expect(banco.enviados[0]).toMatch(/^u1\/\d+-declaracao\.pdf$/)
    expect(funcoesChamadas()).toEqual(['conferir_envio_de_comprovante', 'enviar_pedido_estudante'])
    expect(banco.chamadas).toContainEqual({
      funcao: 'enviar_pedido_estudante',
      args: { p_instituicao: 'UFRN', p_matricula: '20230045871', p_periodo: 7, p_formatura: '2027-07-01', p_arquivo: banco.enviados[0] },
    })
  })

  it('foco 2: banco recusou, o arquivo enviado é apagado e o motivo volta', async () => {
    banco.rpc = { error: { message: 'Confirme o e-mail da faculdade antes de enviar o comprovante.', code: '42501' } }
    expect(await enviarUmaVez()).toBe('Confirme o e-mail da faculdade antes de enviar o comprovante.')
    expect(banco.removidos).toEqual([[banco.enviados[0]]])
  })

  it('upload que falha não cria pedido', async () => {
    banco.upload = { error: { message: 'Failed to fetch' } }
    expect(await enviarUmaVez()).toBe(FALHA)
    expect(funcoesChamadas()).not.toContain('enviar_pedido_estudante')
  })

  it('CA-452: sem e-mail de faculdade confirmado, a tela recebe o motivo e nada é enviado', async () => {
    banco.conferencias = [{ data: 'sem-email-de-faculdade', error: null }]
    expect(await enviarUmaVez()).toBe('Confirme o e-mail da faculdade antes de enviar o comprovante.')
    expect(banco.enviados).toEqual([])
    expect(funcoesChamadas()).toEqual(['conferir_envio_de_comprovante'])
  })

  it('CA-428: com 10 arquivos, a conferência antes do envio já diz o motivo, sem subir o arquivo', async () => {
    banco.conferencias = [{ data: 'demais', error: null }]
    expect(await enviarUmaVez()).toBe(MENSAGEM_COMPROVANTES_DEMAIS)
    expect(banco.enviados).toEqual([])
  })

  it('D-111: conta que não é de estudante recebe a frase do banco, sem enviar', async () => {
    banco.conferencias = [{ data: 'nao-estudante', error: null }]
    expect(await enviarUmaVez()).toBe('Só conta de estudante envia comprovante de matrícula.')
    expect(banco.enviados).toEqual([])
  })

  it('CA-428 e R-42: o armazenamento recusou depois de a conferência deixar (dois envios ao mesmo tempo): ela diz o motivo de novo', async () => {
    banco.conferencias = [
      { data: 'ok', error: null },
      { data: 'demais', error: null },
    ]
    banco.upload = RECUSA_DO_ARMAZENAMENTO
    expect(await enviarUmaVez()).toBe(MENSAGEM_COMPROVANTES_DEMAIS)
    expect(funcoesChamadas()).toEqual(['conferir_envio_de_comprovante', 'conferir_envio_de_comprovante'])
  })

  it('CA-428: recusa do armazenamento sem motivo conhecido, ou sem conseguir conferir de novo, fica com a mensagem de falha', async () => {
    banco.upload = RECUSA_DO_ARMAZENAMENTO
    expect(await enviarUmaVez()).toBe(FALHA)

    banco.conferencias = [
      { data: 'ok', error: null },
      { data: null, error: { message: 'Failed to fetch' } },
    ]
    expect(await enviarUmaVez()).toBe(FALHA)
  })

  it('Foco: sem resposta da conferência (o banco ainda sem o 011, ou a rede), o envio segue e o armazenamento decide', async () => {
    banco.conferencias = [{ data: null, error: { message: 'Could not find the function public.conferir_envio_de_comprovante without parameters' } }]
    expect(await enviarUmaVez()).toBeNull()
    expect(banco.enviados).toHaveLength(1)
    expect(funcoesChamadas()).toContain('enviar_pedido_estudante')

    banco.conferenciaLanca = true
    expect(await enviarUmaVez()).toBeNull()
    expect(banco.enviados).toHaveLength(2)
  })

  it('CA-280: fechar o aviso chama o banco', async () => {
    const { result } = renderHook(() => usePedidoEstudante('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    await act(async () => {
      await result.current.fecharAviso('p1')
    })
    expect(banco.chamadas).toContainEqual({ funcao: 'fechar_aviso_estudante', args: { p_pedido: 'p1' } })
  })
})
