import { FALHA_DE_REDE } from '@/ui/estado/mensagemDoBanco.ts'
import { criarAcompanhamento, type Acompanhamento } from './acompanhamento.ts'
import {
  apagarAcompanhamentosDaNuvem,
  daLinha,
  fonteSupabase,
  listarAcompanhamentosDaNuvem,
  removerAcompanhamentoDaNuvem,
  salvarLinkNaNuvem,
  subirAcompanhamento,
  LIMITE_DE_LINKS,
  PRAZO_DA_NUVEM_MS,
  type ClienteMissoes,
} from './fonteSupabase.ts'
import type { Missao } from './missoes.ts'

const MISSOES: readonly Missao[] = [{ id: 'agua', texto: 'Beber água', origem: 'Hábito' }]

const LINHA = {
  id: 'ac-1',
  token: 'kf3mq9zt7bnd',
  caso_id: 'caso-1',
  paciente_id: 'pac-1',
  nome: 'Ana',
  criado_em: '2026-09-20T10:00:00.000Z',
  missoes: MISSOES,
  marcacoes: [{ dia: '2026-09-21', feitas: ['agua'] }],
}

function acompanhamento(): Acompanhamento {
  return criarAcompanhamento(
    { casoId: 'caso-1', pacienteId: 'pac-1', nome: 'Ana', missoes: MISSOES },
    { agora: () => '2026-09-20T10:00:00.000Z', gerarId: () => 'ac-1', aleatorio: (n) => new Uint8Array(n).fill(5) },
  )
}

interface Chamada {
  readonly tipo: 'rpc' | 'upsert' | 'delete' | 'select'
  readonly nome: string
  readonly parametros: Record<string, unknown>
  readonly opcoes?: Record<string, unknown>
}

type ErroFalso = string | { readonly message: string; readonly code: string }

function clienteFalso(
  opcoes: { readonly usuario?: string | null; readonly dados?: unknown; readonly erro?: ErroFalso; readonly semResposta?: boolean } = {},
) {
  const chamadas: Chamada[] = []
  const erro = typeof opcoes.erro === 'string' ? { message: opcoes.erro } : (opcoes.erro ?? null)
  const resposta = { data: opcoes.dados ?? null, error: erro }
  // A nuvem que não responde: a promessa nunca termina.
  const responder = () => (opcoes.semResposta ? new Promise<typeof resposta>(() => undefined) : Promise.resolve(resposta))

  const cliente: ClienteMissoes = {
    rpc: (nome, parametros) => {
      chamadas.push({ tipo: 'rpc', nome, parametros })
      return responder()
    },
    from: (tabela) => ({
      select: (colunas) => ({
        eq: (coluna, valor) => {
          chamadas.push({ tipo: 'select', nome: tabela, parametros: { [coluna]: valor }, opcoes: { colunas } })
          return responder()
        },
      }),
      upsert: (linha, opcoesDoUpsert) => {
        chamadas.push({ tipo: 'upsert', nome: tabela, parametros: linha, opcoes: { ...opcoesDoUpsert } })
        return responder()
      },
      delete: () => ({
        eq: (coluna, valor) => {
          chamadas.push({ tipo: 'delete', nome: tabela, parametros: { [coluna]: valor } })
          return responder()
        },
      }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: opcoes.usuario === undefined ? null : opcoes.usuario === null ? null : { user: { id: opcoes.usuario } } } }),
    },
  }

  return { cliente, chamadas }
}

describe('Ler a linha do banco', () => {
  it('traduz os nomes de coluna para o domínio', () => {
    const a = daLinha(LINHA)
    expect(a?.casoId).toBe('caso-1')
    expect(a?.pacienteId).toBe('pac-1')
    expect(a?.missoes).toHaveLength(1)
    expect(a?.marcacoes).toEqual([{ dia: '2026-09-21', feitas: ['agua'] }])
  })

  it('linha sem os campos obrigatórios não vira acompanhamento pela metade', () => {
    expect(daLinha({ id: 'x' })).toBeNull()
    expect(daLinha(null)).toBeNull()
    expect(daLinha('nada disso')).toBeNull()
  })

  it('paciente sem ficha vira nulo, não a string "null"', () => {
    expect(daLinha({ ...LINHA, paciente_id: null })?.pacienteId).toBeNull()
  })

  it('missões ou marcações quebradas viram lista vazia em vez de derrubar a tela', () => {
    const a = daLinha({ ...LINHA, missoes: 'lixo', marcacoes: [{ nada: true }] })
    expect(a?.missoes).toEqual([])
    expect(a?.marcacoes).toEqual([])
  })
})

describe('Buscar pelo token', () => {
  it('chama a função do banco e devolve o acompanhamento', async () => {
    const { cliente, chamadas } = clienteFalso({ dados: [LINHA] })
    const a = await fonteSupabase(cliente).porToken('kf3mq9zt7bnd')

    expect(chamadas[0]).toEqual({ tipo: 'rpc', nome: 'missoes_por_token', parametros: { p_token: 'kf3mq9zt7bnd' } })
    expect(a?.nome).toBe('Ana')
  })

  it('token que não existe devolve nulo', async () => {
    const { cliente } = clienteFalso({ dados: [] })
    expect(await fonteSupabase(cliente).porToken('naoexiste')).toBeNull()
  })

  it('token vazio nem chega a bater no banco', async () => {
    const { cliente, chamadas } = clienteFalso({ dados: [LINHA] })
    expect(await fonteSupabase(cliente).porToken('')).toBeNull()
    expect(chamadas).toHaveLength(0)
  })

  it('erro de rede avisa em vez de fingir que não existe link', async () => {
    const avisos: string[] = []
    const { cliente } = clienteFalso({ erro: 'sem internet' })
    const a = await fonteSupabase(cliente, { aoFalhar: (m) => avisos.push(m) }).porToken('kf3mq9zt7bnd')

    expect(a).toBeNull()
    expect(avisos).toEqual([FALHA_DE_REDE])
  })
})

describe('Salvar', () => {
  it('paciente sem conta grava só as marcações, pela função', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: null })
    await fonteSupabase(cliente).salvar(acompanhamento())

    expect(chamadas).toHaveLength(1)
    expect(chamadas[0]?.tipo).toBe('rpc')
    expect(chamadas[0]?.nome).toBe('marcar_missoes')
    expect(Object.keys(chamadas[0]?.parametros ?? {})).toEqual(['p_token', 'p_marcacoes'])
  })

  it('nutricionista logado grava a linha inteira, com o dono', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99' })
    await fonteSupabase(cliente).salvar(acompanhamento())

    expect(chamadas[0]?.tipo).toBe('upsert')
    expect(chamadas[0]?.nome).toBe('acompanhamentos')
    expect(chamadas[0]?.parametros['nutricionista_id']).toBe('user-99')
    expect(chamadas[0]?.parametros['caso_id']).toBe('caso-1')
  })

  it('falha ao salvar avisa a tela', async () => {
    const avisos: string[] = []
    const { cliente } = clienteFalso({ usuario: 'user-99', erro: 'deu ruim' })
    await fonteSupabase(cliente, { aoFalhar: (m) => avisos.push(m) }).salvar(acompanhamento())

    expect(avisos).toEqual([FALHA_DE_REDE])
  })

  it('CA-422: link além do limite do plano: a tela recebe a frase do banco', async () => {
    const avisos: string[] = []
    const erro = { code: 'P0001', message: 'Você chegou ao limite de links do seu plano.' }
    const { cliente } = clienteFalso({ usuario: 'user-99', erro })
    await fonteSupabase(cliente, { aoFalhar: (m) => avisos.push(m) }).salvar(acompanhamento())

    expect(avisos).toEqual(['Você chegou ao limite de links do seu plano.'])
  })

  it('CA-430: erro técnico do banco ao salvar não chega cru à tela', async () => {
    const avisos: string[] = []
    const erro = { code: '42501', message: 'new row violates row-level security policy for table "acompanhamentos"' }
    const { cliente } = clienteFalso({ usuario: 'user-99', erro })
    await fonteSupabase(cliente, { aoFalhar: (m) => avisos.push(m) }).salvar(acompanhamento())

    expect(avisos).toEqual([FALHA_DE_REDE])
  })

  it('CA-430: falha do paciente ao marcar também chega traduzida', async () => {
    const avisos: string[] = []
    const { cliente } = clienteFalso({ usuario: null, erro: { code: '22023', message: 'cannot get array length of a scalar' } })
    await fonteSupabase(cliente, { aoFalhar: (m) => avisos.push(m) }).salvar(acompanhamento())

    expect(avisos).toEqual([FALHA_DE_REDE])
  })

  it('esta fonte se declara como nuvem, e a tela usa isso na mensagem de erro', () => {
    const { cliente } = clienteFalso()
    expect(fonteSupabase(cliente).naNuvem).toBe(true)
  })
})

describe('Apagar os dados da nuvem', () => {
  it('apaga só as linhas de quem está logado', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99' })
    expect(await apagarAcompanhamentosDaNuvem(cliente)).toBeNull()
    expect(chamadas[0]).toEqual({ tipo: 'delete', nome: 'acompanhamentos', parametros: { nutricionista_id: 'user-99' } })
  })

  it('sem sessão não apaga nada de ninguém', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: null })
    expect(await apagarAcompanhamentosDaNuvem(cliente)).toBeNull()
    expect(chamadas).toHaveLength(0)
  })

  it('CA-430: devolve o erro traduzido em vez de dizer que apagou', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-99', erro: { code: '42501', message: 'permission denied for table acompanhamentos' } })
    expect(await apagarAcompanhamentosDaNuvem(cliente)).toBe(FALHA_DE_REDE)
  })
})

describe('O link do paciente na nuvem, pelo lado do nutricionista (missoes-na-nuvem)', () => {
  const LIMITE = { code: 'P0001', message: 'Você chegou ao limite de links do seu plano.' }

  it('CA-441: lê os links da conta, com o que o paciente marcou no celular dele', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99', dados: [LINHA] })
    const leitura = await listarAcompanhamentosDaNuvem(cliente)

    expect(chamadas[0]).toMatchObject({ tipo: 'select', nome: 'acompanhamentos', parametros: { nutricionista_id: 'user-99' } })
    expect(leitura).toEqual({ tipo: 'lida', itens: [daLinha(LINHA)] })
    expect(leitura.tipo === 'lida' ? leitura.itens[0]?.marcacoes : null).toEqual([{ dia: '2026-09-21', feitas: ['agua'] }])
  })

  it('CA-441: linha quebrada não vira link pela metade', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-99', dados: [LINHA, { id: 'sem-token' }] })
    const leitura = await listarAcompanhamentosDaNuvem(cliente)
    expect(leitura.tipo === 'lida' ? leitura.itens.map((a) => a.id) : null).toEqual(['ac-1'])
  })

  it('CA-444: sem sessão não lê nada de ninguém', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: null, dados: [LINHA] })
    expect(await listarAcompanhamentosDaNuvem(cliente)).toEqual({ tipo: 'sem-conta' })
    expect(chamadas).toHaveLength(0)
  })

  it('CB-106: sem internet, diz que não leu em vez de devolver lista vazia', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-99', erro: 'Failed to fetch' })
    expect(await listarAcompanhamentosDaNuvem(cliente)).toEqual({ tipo: 'falhou', mensagem: FALHA_DE_REDE })
  })

  it('CA-438: criar o link grava a linha inteira, com o dono', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99' })
    expect(await salvarLinkNaNuvem(cliente, acompanhamento())).toBeNull()

    const primeira = chamadas[0]
    expect(primeira?.tipo).toBe('upsert')
    expect(primeira?.nome).toBe('acompanhamentos')
    expect(primeira?.parametros['nutricionista_id']).toBe('user-99')
    expect(primeira?.parametros['token']).toBe(acompanhamento().token)
    expect(primeira?.parametros['marcacoes']).toEqual([])
  })

  it('CB-105: gravar de novo um link que já está na nuvem não apaga o que o paciente marcou lá', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99' })
    await salvarLinkNaNuvem(cliente, acompanhamento())

    // Primeiro só cria se faltar (com as marcações deste aparelho); depois atualiza o resto, sem as marcações.
    expect(chamadas).toHaveLength(2)
    expect(chamadas[0]?.opcoes).toEqual({ onConflict: 'id', ignoreDuplicates: true })
    expect(chamadas[1]?.tipo).toBe('upsert')
    expect(chamadas[1]?.opcoes).toEqual({ onConflict: 'id' })
    expect(chamadas[1]?.parametros).not.toHaveProperty('marcacoes')
    expect(chamadas[1]?.parametros['token']).toBe(acompanhamento().token)
  })

  it('CA-442: passar do limite do plano devolve a frase do banco', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-99', erro: LIMITE })
    expect(await salvarLinkNaNuvem(cliente, acompanhamento())).toBe(LIMITE_DE_LINKS)
    expect(LIMITE_DE_LINKS).toBe('Você chegou ao limite de links do seu plano.')
  })

  it('CA-439: a nuvem recusa: devolve a falha traduzida', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-99', erro: { code: '42501', message: 'new row violates row-level security policy' } })
    expect(await salvarLinkNaNuvem(cliente, acompanhamento())).toBe(FALHA_DE_REDE)
  })

  it('CA-439: a nuvem que não responde vira falha, em vez de esperar para sempre', async () => {
    vi.useFakeTimers()
    try {
      const { cliente } = clienteFalso({ usuario: 'user-99', semResposta: true })
      const salvando = salvarLinkNaNuvem(cliente, acompanhamento())
      await vi.advanceTimersByTimeAsync(PRAZO_DA_NUVEM_MS)
      expect(await salvando).toBe(FALHA_DE_REDE)
    } finally {
      vi.useRealTimers()
    }
  })

  it('CA-443: o link que só existe neste aparelho sobe com as marcações, sem sobrescrever o que já está na nuvem', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99' })
    const comMarcas = { ...acompanhamento(), marcacoes: [{ dia: '2026-09-21', feitas: ['agua'] }] }
    expect(await subirAcompanhamento(cliente, comMarcas)).toBeNull()

    expect(chamadas).toHaveLength(1)
    expect(chamadas[0]?.opcoes).toEqual({ onConflict: 'id', ignoreDuplicates: true })
    expect(chamadas[0]?.parametros['marcacoes']).toEqual([{ dia: '2026-09-21', feitas: ['agua'] }])
  })

  it('CA-443: o que não sobe volta com o motivo', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-99', erro: LIMITE })
    expect(await subirAcompanhamento(cliente, acompanhamento())).toBe(LIMITE_DE_LINKS)
  })

  it('CA-440: remover apaga só aquele link', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99' })
    expect(await removerAcompanhamentoDaNuvem(cliente, 'ac-1')).toBeNull()
    expect(chamadas).toEqual([{ tipo: 'delete', nome: 'acompanhamentos', parametros: { id: 'ac-1' } }])
  })

  it('CA-440: falha ao remover devolve o erro traduzido', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-99', erro: 'Failed to fetch' })
    expect(await removerAcompanhamentoDaNuvem(cliente, 'ac-1')).toBe(FALHA_DE_REDE)
  })
})
