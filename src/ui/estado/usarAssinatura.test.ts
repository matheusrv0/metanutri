import { act, renderHook, waitFor } from '@testing-library/react'
import { CARTAO_ANTIGO, CONFIRA_O_CARTAO, mensagemDaRecusa, SERVIDOR_FORA } from '@/domain/cartao.ts'
import { PEDIDO_EM_ANDAMENTO, SESSAO_TERMINOU, useAssinatura, type ResultadoDaAssinatura, type ResultadoDaMudanca } from './usarAssinatura.ts'

const { cliente } = vi.hoisted(() => {
  const cliente = {
    linha: null as unknown,
    leituras: 0,
    rejeitar: false,
    /** O supabase-js não rejeita em erro de banco ou de rede: resolve com `{ data: null, error }`. */
    erroDoBanco: null as { readonly message: string } | null,
    espera: Promise.resolve() as Promise<unknown>,
    colunas: [] as string[],
    filtros: [] as [string, unknown][],
    invocar: vi.fn(),
    from: () => ({
      select: (colunas: string) => {
        cliente.colunas.push(colunas)
        return {
          eq: (coluna: string, valor: unknown) => {
            cliente.filtros.push([coluna, valor])
            return {
              maybeSingle: async () => {
                cliente.leituras += 1
                await cliente.espera
                if (cliente.rejeitar) throw new Error('rede caiu')
                return cliente.erroDoBanco ? { data: null, error: cliente.erroDoBanco } : { data: cliente.linha, error: null }
              },
            }
          },
        }
      },
    }),
    rpc: vi.fn(async () => ({ data: 14 })),
    functions: { invoke: (...args: unknown[]) => cliente.invocar(...args) },
  }
  return { cliente }
})

vi.mock('./supabase.ts', () => ({ obterSupabase: () => cliente }))

const CARTAO = { token: 'tok_teste_1', bandeira: 'Mastercard', final: '6351' }

/** Erro de função com corpo, como o supabase-js entrega (a resposta fica em `context`). */
const respondeu = (status: number, corpo: unknown) => ({ data: null, error: { context: { status, json: async () => corpo } } })

async function aberto() {
  const hook = renderHook(() => useAssinatura('u1'))
  await waitFor(() => expect(hook.result.current.carregado).toBe(true))
  return hook
}

describe('useAssinatura (spec checkout-proprio)', () => {
  beforeEach(() => {
    cliente.linha = null
    cliente.rpc.mockClear()
    cliente.leituras = 0
    cliente.rejeitar = false
    cliente.erroDoBanco = null
    cliente.espera = Promise.resolve()
    cliente.colunas = []
    cliente.filtros = []
    cliente.invocar.mockReset()
  })

  it('sem sessão já está carregado, no Free', () => {
    const { result } = renderHook(() => useAssinatura(null))
    expect(result.current.carregado).toBe(true)
    expect(result.current.assinatura.plano).toBe('free')
  })

  it('com sessão, lê a linha inteira (o 008 pode ainda não ter rodado) e só então marca carregado', async () => {
    cliente.linha = { plano: 'solo', status: 'ativa', cartao_bandeira: 'Mastercard', cartao_final: '6351' }
    const { result } = renderHook(() => useAssinatura('u1'))
    expect(result.current.carregado).toBe(false)
    await waitFor(() => expect(result.current.carregado).toBe(true))
    expect(result.current.assinatura).toMatchObject({ plano: 'solo', cartaoBandeira: 'Mastercard', cartaoFinal: '6351' })
    expect(cliente.colunas).toEqual(['*'])
  })

  it('M7: a leitura filtra pela conta de quem está entrando, não depende só do RLS', async () => {
    await aberto()
    expect(cliente.filtros).toEqual([['nutricionista_id', 'u1']])
  })

  it('CA-388: não pergunta ao servidor pelas vagas de fundador nem devolve contagem de vagas', async () => {
    const { result } = await aberto()
    expect(cliente.rpc).not.toHaveBeenCalled()
    expect(Object.keys(result.current)).not.toContain('vagasRestantes')
  })

  it('CA-375: manda plano, ciclo e o código do cartão ao servidor, nunca o preço', async () => {
    cliente.invocar.mockResolvedValue({ data: { status: 'ativa', proximaCobranca: '2026-11-02T15:00:00.000Z', cartao: { bandeira: 'Mastercard', final: '6351' } }, error: null })
    const { result } = await aberto()
    let resposta: ResultadoDaAssinatura | null = null
    await act(async () => {
      resposta = await result.current.assinar('pro', 'anual', CARTAO)
    })
    expect(cliente.invocar).toHaveBeenCalledWith('assinar', {
      body: { plano: 'pro', ciclo: 'anual', card_token_id: 'tok_teste_1', cartao: { bandeira: 'Mastercard', final: '6351' } },
    })
    expect(resposta).toEqual({ ok: true, ativa: true, proximaCobranca: '2026-11-02T15:00:00.000Z' })
  })

  it('CA-372: autorizada, a assinatura é lida de novo e o plano pago já vale no app', async () => {
    cliente.invocar.mockImplementation(async () => {
      cliente.linha = { plano: 'solo', status: 'ativa' }
      return { data: { status: 'ativa', proximaCobranca: null }, error: null }
    })
    const { result } = await aberto()
    expect(result.current.assinatura.plano).toBe('free')
    await act(async () => {
      await result.current.assinar('solo', 'mensal', CARTAO)
    })
    await waitFor(() => expect(result.current.assinatura.plano).toBe('solo'))
  })

  it('o banco ainda confirmando volta como pedido aceito, mas não ativo', async () => {
    cliente.invocar.mockResolvedValue({ data: { status: 'pendente', proximaCobranca: '2026-11-02T15:00:00.000Z' }, error: null })
    const { result } = await aberto()
    await act(async () => {
      expect(await result.current.assinar('solo', 'mensal', CARTAO)).toEqual({ ok: true, ativa: false, proximaCobranca: '2026-11-02T15:00:00.000Z' })
    })
  })

  it('CA-373: a recusa do banco volta com o motivo em português', async () => {
    cliente.invocar.mockResolvedValue(respondeu(402, { erro: 'O banco recusou este cartão.', codigo: 'cc_rejected_insufficient_amount' }))
    const { result } = await aberto()
    await act(async () => {
      expect(await result.current.assinar('solo', 'mensal', CARTAO)).toEqual({ ok: false, erro: mensagemDaRecusa('cc_rejected_insufficient_amount') })
    })
  })

  it('CB-90: código do cartão vencido ou usado pede para conferir o cartão de novo', async () => {
    cliente.invocar.mockResolvedValue(respondeu(402, { erro: 'x', codigo: 'token-invalido' }))
    const { result } = await aberto()
    await act(async () => {
      expect(await result.current.assinar('solo', 'mensal', CARTAO)).toEqual({ ok: false, erro: CONFIRA_O_CARTAO })
    })
  })

  it('CA-374: sem resposta do servidor (rede), a frase de servidor fora', async () => {
    const { result } = await aberto()
    cliente.invocar.mockResolvedValueOnce({ data: null, error: new Error('Failed to fetch') })
    cliente.invocar.mockRejectedValueOnce(new Error('caiu'))
    await act(async () => {
      expect(await result.current.assinar('solo', 'mensal', CARTAO)).toEqual({ ok: false, erro: SERVIDOR_FORA })
      expect(await result.current.assinar('solo', 'mensal', CARTAO)).toEqual({ ok: false, erro: SERVIDOR_FORA })
    })
  })

  it('CB-91: a frase do servidor passa como veio quando não é recusa de cartão', async () => {
    cliente.invocar.mockResolvedValue(respondeu(409, { erro: 'Você já tem uma assinatura ativa. A troca de plano ainda não é feita pelo site.' }))
    const { result } = await aberto()
    await act(async () => {
      expect(await result.current.assinar('solo', 'mensal', CARTAO)).toEqual({ ok: false, erro: 'Você já tem uma assinatura ativa. A troca de plano ainda não é feita pelo site.' })
    })
  })

  it('CA-378: cancelar pede ao servidor e lê a assinatura de novo', async () => {
    cliente.invocar.mockResolvedValue({ data: { status: 'cancelada', expiraEm: '2026-11-02T02:59:59.000Z' }, error: null })
    const { result } = await aberto()
    const antes = cliente.leituras
    await act(async () => {
      expect(await result.current.cancelar()).toEqual({ ok: true })
    })
    expect(cliente.invocar).toHaveBeenCalledWith('gerenciar-assinatura', { body: { acao: 'cancelar' } })
    await waitFor(() => expect(cliente.leituras).toBeGreaterThan(antes))
  })

  it('CA-395 e CA-396: a prévia pergunta ao servidor e devolve se já houve cobrança e até quando vale', async () => {
    cliente.invocar.mockResolvedValue({ data: { cobrada: true, expiraEm: '2026-11-02T02:59:59.000Z' }, error: null })
    const { result } = await aberto()
    let resposta: unknown
    await act(async () => {
      resposta = await result.current.previaDoCancelamento()
    })
    expect(cliente.invocar).toHaveBeenCalledWith('gerenciar-assinatura', { body: { acao: 'previa' } })
    expect(resposta).toEqual({ ok: true, cobrada: true, expiraEm: '2026-11-02T02:59:59.000Z' })
  })

  it('a prévia não relê a assinatura', async () => {
    cliente.invocar.mockResolvedValue({ data: { cobrada: false, expiraEm: null }, error: null })
    const { result } = await aberto()
    const antes = cliente.leituras
    await act(async () => {
      expect(await result.current.previaDoCancelamento()).toEqual({ ok: true, cobrada: false, expiraEm: null })
    })
    expect(cliente.leituras).toBe(antes)
  })

  it('CA-397: sem resposta ou resposta fora do formato, a prévia falha', async () => {
    const { result } = await aberto()
    cliente.invocar.mockResolvedValueOnce({ data: null, error: new Error('Failed to fetch') })
    await act(async () => {
      expect(await result.current.previaDoCancelamento()).toEqual({ ok: false, erro: SERVIDOR_FORA })
    })
    cliente.invocar.mockResolvedValueOnce({ data: { cobrada: 'sim', expiraEm: null }, error: null })
    await act(async () => {
      expect(await result.current.previaDoCancelamento()).toMatchObject({ ok: false })
    })
    cliente.invocar.mockResolvedValueOnce({ data: { cobrada: true }, error: null })
    await act(async () => {
      expect(await result.current.previaDoCancelamento()).toMatchObject({ ok: false })
    })
  })

  it('CA-433: o 429 de cartão recusado em excesso mostra a frase do servidor, ao assinar e ao trocar o cartão', async () => {
    const frase = 'Muitas tentativas com cartão recusado. Tente de novo amanhã.'
    const { result } = await aberto()
    cliente.invocar.mockResolvedValueOnce(respondeu(429, { erro: frase, codigo: 'muitas-tentativas' }))
    await act(async () => {
      expect(await result.current.assinar('solo', 'mensal', CARTAO)).toEqual({ ok: false, erro: frase })
    })
    cliente.invocar.mockResolvedValueOnce(respondeu(429, { erro: frase, codigo: 'muitas-tentativas' }))
    await act(async () => {
      expect(await result.current.trocarCartao(CARTAO)).toEqual({ ok: false, erro: frase })
    })
  })

  it('CB-93: cancelamento que falha também lê a assinatura de novo, para a tela mostrar o que o servidor tem', async () => {
    cliente.invocar.mockResolvedValue({ data: null, error: new Error('Failed to fetch') })
    const { result } = await aberto()
    const antes = cliente.leituras
    await act(async () => {
      expect(await result.current.cancelar()).toEqual({ ok: false, erro: SERVIDOR_FORA })
    })
    await waitFor(() => expect(cliente.leituras).toBeGreaterThan(antes))
  })

  it('CA-379: erro de servidor ao trocar o cartão não promete o cartão antigo (o processador pode ter aceitado o novo)', async () => {
    const { result } = await aberto()
    cliente.invocar.mockResolvedValueOnce(respondeu(500, { erro: 'Falha no servidor.', codigo: 'x' }))
    await act(async () => {
      expect(await result.current.trocarCartao(CARTAO)).toEqual({ ok: false, erro: 'Falha no servidor.' })
    })
  })

  it('CA-379: trocar o cartão manda o código novo; a recusa volta em português', async () => {
    const { result } = await aberto()
    cliente.invocar.mockResolvedValueOnce({ data: { cartao: { bandeira: 'Mastercard', final: '6351' } }, error: null })
    cliente.invocar.mockResolvedValueOnce(respondeu(402, { erro: 'x', codigo: 'cc_rejected_bad_filled_security_code' }))
    await act(async () => {
      expect(await result.current.trocarCartao(CARTAO)).toEqual({ ok: true })
      expect(await result.current.trocarCartao(CARTAO)).toEqual({ ok: false, erro: `${mensagemDaRecusa('cc_rejected_bad_filled_security_code')} ${CARTAO_ANTIGO}` })
    })
    expect(cliente.invocar).toHaveBeenCalledWith('gerenciar-assinatura', {
      body: { acao: 'trocar_cartao', card_token_id: 'tok_teste_1', cartao: { bandeira: 'Mastercard', final: '6351' } },
    })
  })

  it('CB-92 e foco 5: dois pedidos ao mesmo tempo viram um só', async () => {
    let terminar: (valor: unknown) => void = () => undefined
    cliente.invocar.mockImplementation(
      () =>
        new Promise((resolver) => {
          terminar = resolver
        }),
    )
    const { result } = await aberto()
    let primeiro: Promise<ResultadoDaMudanca> = Promise.resolve({ ok: true })
    let segundo: ResultadoDaMudanca | null = null
    await act(async () => {
      primeiro = result.current.cancelar()
      segundo = await result.current.trocarCartao(CARTAO)
    })
    expect(segundo).toEqual({ ok: false, erro: PEDIDO_EM_ANDAMENTO })
    expect(cliente.invocar).toHaveBeenCalledTimes(1)
    await act(async () => {
      terminar({ data: { status: 'cancelada', expiraEm: null }, error: null })
      await primeiro
    })
  })

  it('resposta perdida ou erro de servidor ao assinar: a assinatura é lida de novo; recusa (402) não', async () => {
    const { result } = await aberto()
    let antes = cliente.leituras
    cliente.invocar.mockResolvedValueOnce(respondeu(502, { erro: 'x' }))
    await act(async () => {
      await result.current.assinar('solo', 'mensal', CARTAO)
    })
    await waitFor(() => expect(cliente.leituras).toBeGreaterThan(antes))
    antes = cliente.leituras
    cliente.invocar.mockResolvedValueOnce({ data: null, error: new Error('Failed to fetch') })
    await act(async () => {
      await result.current.assinar('solo', 'mensal', CARTAO)
    })
    await waitFor(() => expect(cliente.leituras).toBeGreaterThan(antes))
    antes = cliente.leituras
    cliente.invocar.mockResolvedValueOnce(respondeu(402, { erro: 'x', codigo: 'cc_rejected_other_reason' }))
    await act(async () => {
      await result.current.assinar('solo', 'mensal', CARTAO)
    })
    expect(cliente.leituras).toBe(antes)
  })

  it('sessão vencida (401 sem frase) pede para entrar de novo', async () => {
    cliente.invocar.mockResolvedValue(respondeu(401, {}))
    const { result } = await aberto()
    await act(async () => {
      expect(await result.current.assinar('solo', 'mensal', CARTAO)).toEqual({ ok: false, erro: SESSAO_TERMINOU })
    })
  })

  it('reler a assinatura não derruba carregado: segue true, com os dados antigos, e carregando fica true até a leitura chegar', async () => {
    cliente.linha = { plano: 'solo', status: 'ativa' }
    const { result } = await aberto()
    expect(result.current.assinatura.plano).toBe('solo')
    let liberar: () => void = () => undefined
    cliente.espera = new Promise<void>((resolver) => {
      liberar = resolver
    })
    cliente.linha = { plano: 'pro', status: 'ativa' }
    act(() => result.current.recarregar())
    expect(result.current.carregado).toBe(true)
    expect(result.current.carregando).toBe(true)
    expect(result.current.assinatura.plano).toBe('solo')
    await act(async () => liberar())
    await waitFor(() => expect(result.current.assinatura.plano).toBe('pro'))
    expect(result.current.carregando).toBe(false)
    expect(result.current.carregado).toBe(true)
  })

  it('outro usuário nunca vê os dados do anterior: vazio e não carregado até a leitura dele chegar', async () => {
    cliente.linha = { plano: 'solo', status: 'ativa' }
    let id = 'u1'
    const { result, rerender } = renderHook(() => useAssinatura(id))
    await waitFor(() => expect(result.current.assinatura.plano).toBe('solo'))
    let liberar: () => void = () => undefined
    cliente.espera = new Promise<void>((resolver) => {
      liberar = resolver
    })
    cliente.linha = { plano: 'pro', status: 'ativa' }
    id = 'u2'
    rerender()
    expect(result.current.carregado).toBe(false)
    expect(result.current.assinatura.plano).toBe('free')
    await act(async () => liberar())
    await waitFor(() => expect(result.current.assinatura.plano).toBe('pro'))
    expect(result.current.carregado).toBe(true)
  })

  it('leitura que falha não trava: carregando volta a false, e a primeira leitura vira Free já carregado', async () => {
    cliente.rejeitar = true
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { result } = renderHook(() => useAssinatura('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    expect(result.current.carregando).toBe(false)
    expect(result.current.assinatura.plano).toBe('free')
    expect(erro).toHaveBeenCalledWith(expect.stringContaining('rede caiu'))
    erro.mockRestore()
  })

  it('I1: a releitura que volta com erro do banco (sem rejeitar) mantém o plano pago, não vira Free', async () => {
    cliente.linha = { plano: 'pro', status: 'ativa' }
    const { result } = await aberto()
    expect(result.current.assinatura.plano).toBe('pro')
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const antes = cliente.leituras
    cliente.erroDoBanco = { message: 'banco fora' }
    act(() => result.current.recarregar())
    await waitFor(() => expect(cliente.leituras).toBeGreaterThan(antes))
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(result.current.assinatura.plano).toBe('pro')
    expect(result.current.carregado).toBe(true)
    expect(erro).toHaveBeenCalledWith('Não consegui ler a assinatura: banco fora')
    erro.mockRestore()
  })

  it('I1: a primeira leitura que volta com erro do banco fica carregada, no Free, e registra só a mensagem', async () => {
    cliente.linha = { plano: 'pro', status: 'ativa' }
    cliente.erroDoBanco = { message: 'banco fora' }
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { result } = renderHook(() => useAssinatura('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    expect(result.current.carregando).toBe(false)
    expect(result.current.assinatura.plano).toBe('free')
    expect(erro).toHaveBeenCalledWith('Não consegui ler a assinatura: banco fora')
    erro.mockRestore()
  })
})
