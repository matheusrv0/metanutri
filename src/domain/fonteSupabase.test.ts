import { DIETA_GRANDE_DEMAIS, FALHA_DE_REDE, LINK_GRANDE_DEMAIS } from '@/ui/estado/mensagemDoBanco.ts'
import { criarAcompanhamento, type Acompanhamento } from './acompanhamento.ts'
import type { DietaDoLink } from './dietaDoLink.ts'
import {
  apagarAcompanhamentosDaNuvem,
  daLinha,
  fonteDoPaciente,
  fonteSupabase,
  listarAcompanhamentosDaNuvem,
  removerAcompanhamentoDaNuvem,
  salvarLinkNaNuvem,
  subirAcompanhamento,
  LIMITE_DE_LINKS,
  LIMITE_DE_LINKS_NO_BANCO,
  PRAZO_DA_NUVEM_MS,
  type ClienteMissoes,
} from './fonteSupabase.ts'
import type { Missao } from './missoes.ts'
import type { Armazenamento } from './persistencia.ts'
import { criarRepositorioAcompanhamentos, LinkSemConexao, LinkTrocado, MarcacaoRecusada } from './repositorioAcompanhamentos.ts'

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

type Tipo = 'rpc' | 'upsert' | 'update' | 'delete' | 'select'

interface Chamada {
  readonly tipo: Tipo
  readonly nome: string
  readonly parametros: Record<string, unknown>
  readonly opcoes?: Record<string, unknown>
}

type ErroFalso = string | { readonly message: string; readonly code: string }
interface RespostaFalsa {
  readonly data: unknown
  readonly error: { readonly message: string; readonly code?: string } | null
}

interface OpcoesDoFalso {
  readonly usuario?: string | null
  /** getSession que falha (token vencido sem internet): sessão nula e erro. */
  readonly sessaoComErro?: boolean
  readonly dados?: unknown
  /** Dados por tipo de pedido, quando cada um precisa responder uma coisa. */
  readonly dadosPor?: Partial<Record<Tipo, unknown>>
  readonly erro?: ErroFalso
  readonly semResposta?: boolean
  /** Banco sem o 012: o PostgREST recusa o pedido que traz a coluna `dieta` (CB-151). */
  readonly semColunaDieta?: boolean
  /** Banco sem o 017 (spec lado-do-paciente, DP-LP-30): o PostgREST recusa o pedido que traz uma destas colunas. */
  readonly semColunas?: readonly string[]
}

/** O que o PostgREST responde quando a coluna não existe (conferido no PostgREST local em 14/10/2026). */
const SEM_COLUNA_DIETA = { code: 'PGRST204', message: "Could not find the 'dieta' column of 'acompanhamentos' in the schema cache" }

function clienteFalso(opcoes: OpcoesDoFalso = {}) {
  const chamadas: Chamada[] = []
  const sinais: AbortSignal[] = []
  const erro = typeof opcoes.erro === 'string' ? { message: opcoes.erro } : (opcoes.erro ?? null)

  // Um pedido do cliente: é uma promessa, aceita `.select()` e guarda o sinal de desistir.
  const pedido = (tipo: Tipo, linha: Record<string, unknown> = {}) => {
    const faltando = (opcoes.semColunas ?? []).find((coluna) => coluna in linha)
    const resposta: RespostaFalsa =
      opcoes.semColunaDieta && 'dieta' in linha
        ? { data: null, error: SEM_COLUNA_DIETA }
        : faltando !== undefined
          ? { data: null, error: { code: 'PGRST204', message: `Could not find the '${faltando}' column of 'acompanhamentos' in the schema cache` } }
          : { data: opcoes.dadosPor?.[tipo] ?? opcoes.dados ?? null, error: erro }
    // A nuvem que não responde: a promessa nunca termina.
    const promessa = opcoes.semResposta ? new Promise<RespostaFalsa>(() => undefined) : Promise.resolve(resposta)
    const comSinal = Object.assign(promessa, {
      abortSignal: (sinal: AbortSignal) => {
        sinais.push(sinal)
        return promessa
      },
    })
    return Object.assign(comSinal, { select: () => comSinal })
  }

  const cliente: ClienteMissoes = {
    rpc: (nome, parametros) => {
      chamadas.push({ tipo: 'rpc', nome, parametros })
      return pedido('rpc')
    },
    from: (tabela) => ({
      select: (colunas) => ({
        eq: (coluna, valor) => {
          chamadas.push({ tipo: 'select', nome: tabela, parametros: { [coluna]: valor }, opcoes: { colunas } })
          return pedido('select')
        },
      }),
      upsert: (linha, opcoesDoUpsert) => {
        chamadas.push({ tipo: 'upsert', nome: tabela, parametros: linha, opcoes: { ...opcoesDoUpsert } })
        return pedido('upsert', linha)
      },
      update: (campos) => ({
        eq: (coluna, valor) => {
          chamadas.push({ tipo: 'update', nome: tabela, parametros: campos, opcoes: { [coluna]: valor } })
          return pedido('update', campos)
        },
      }),
      delete: () => ({
        eq: (coluna, valor) => {
          chamadas.push({ tipo: 'delete', nome: tabela, parametros: { [coluna]: valor } })
          return pedido('delete')
        },
      }),
    }),
    auth: {
      getSession: () =>
        Promise.resolve(
          opcoes.sessaoComErro
            ? { data: { session: null }, error: { message: 'Invalid Refresh Token: Refresh Token Not Found' } }
            : { data: { session: opcoes.usuario === undefined || opcoes.usuario === null ? null : { user: { id: opcoes.usuario } } }, error: null },
        ),
    },
  }

  return { cliente, chamadas, sinais }
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

describe('Salvar pela tela do paciente', () => {
  it('paciente sem conta grava só as marcações, pela função', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: null })
    await fonteSupabase(cliente).salvar(acompanhamento())

    expect(chamadas).toHaveLength(1)
    expect(chamadas[0]?.tipo).toBe('rpc')
    expect(chamadas[0]?.nome).toBe('marcar_missoes')
    expect(Object.keys(chamadas[0]?.parametros ?? {})).toEqual(['p_token', 'p_marcacoes'])
  })

  it('logado, a tela do paciente também grava só as marcações: nunca a linha inteira', async () => {
    // A nutricionista testando o link no próprio aparelho, ou uma aba velha, não pode
    // desfazer o token novo nem as missões do link.
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99' })
    await fonteSupabase(cliente).salvar(acompanhamento())

    expect(chamadas).toHaveLength(1)
    expect(chamadas[0]).toMatchObject({ tipo: 'rpc', nome: 'marcar_missoes' })
  })

  it('falha ao salvar avisa a tela', async () => {
    const avisos: string[] = []
    const { cliente } = clienteFalso({ usuario: 'user-99', erro: 'deu ruim' })
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

  it('sem sessão não apaga nada de ninguém e não diz que apagou', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: null })
    expect(await apagarAcompanhamentosDaNuvem(cliente)).toBe(FALHA_DE_REDE)
    expect(chamadas).toHaveLength(0)
  })

  it('sessão que falha (token vencido sem internet) também não diz que apagou', async () => {
    const { cliente, chamadas } = clienteFalso({ sessaoComErro: true })
    expect(await apagarAcompanhamentosDaNuvem(cliente)).toBe(FALHA_DE_REDE)
    expect(chamadas).toHaveLength(0)
  })

  it('CA-430: devolve o erro traduzido em vez de dizer que apagou', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-99', erro: { code: '42501', message: 'permission denied for table acompanhamentos' } })
    expect(await apagarAcompanhamentosDaNuvem(cliente)).toBe(FALHA_DE_REDE)
  })
})

describe('O link do paciente na nuvem, pelo lado do nutricionista (missoes-na-nuvem)', () => {
  const LIMITE = { code: 'P0001', message: LIMITE_DE_LINKS_NO_BANCO }
  const NOVO = { jaEsteveNaNuvem: false }
  const JA_ESTEVE = { jaEsteveNaNuvem: true }

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

  it('servidor ligado e sem sessão: a leitura falha, em vez de parecer uma conta vazia', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: null, dados: [LINHA] })
    expect(await listarAcompanhamentosDaNuvem(cliente)).toEqual({ tipo: 'falhou', mensagem: FALHA_DE_REDE })
    expect(chamadas).toHaveLength(0)
  })

  it('sessão que falha (token vencido sem internet): a leitura falha', async () => {
    const { cliente, chamadas } = clienteFalso({ sessaoComErro: true, dados: [LINHA] })
    expect(await listarAcompanhamentosDaNuvem(cliente)).toEqual({ tipo: 'falhou', mensagem: FALHA_DE_REDE })
    expect(chamadas).toHaveLength(0)
  })

  it('CB-106: sem internet, diz que não leu em vez de devolver lista vazia', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-99', erro: 'Failed to fetch' })
    expect(await listarAcompanhamentosDaNuvem(cliente)).toEqual({ tipo: 'falhou', mensagem: FALHA_DE_REDE })
  })

  it('resposta que não é lista, mesmo sem erro, conta como falha e não como conta vazia', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-99', dados: { nada: true } })
    expect(await listarAcompanhamentosDaNuvem(cliente)).toEqual({ tipo: 'falhou', mensagem: FALHA_DE_REDE })
  })

  it('CA-438: criar o link grava a linha inteira, com o dono, e para aí quando acabou de criar', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99', dadosPor: { upsert: [{ id: 'ac-1' }] } })
    expect(await salvarLinkNaNuvem(cliente, acompanhamento(), NOVO)).toEqual({ tipo: 'salvo' })

    expect(chamadas).toHaveLength(1)
    const primeira = chamadas[0]
    expect(primeira?.tipo).toBe('upsert')
    expect(primeira?.nome).toBe('acompanhamentos')
    expect(primeira?.opcoes).toEqual({ onConflict: 'id', ignoreDuplicates: true })
    expect(primeira?.parametros['nutricionista_id']).toBe('user-99')
    expect(primeira?.parametros['token']).toBe(acompanhamento().token)
    expect(primeira?.parametros['marcacoes']).toEqual([])
  })

  it('CB-105: a linha já existia: atualiza o resto pelo id, sem as marcações do paciente', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99', dadosPor: { upsert: [], update: [{ id: 'ac-1' }] } })
    expect(await salvarLinkNaNuvem(cliente, acompanhamento(), NOVO)).toEqual({ tipo: 'salvo' })

    expect(chamadas.map((c) => c.tipo)).toEqual(['upsert', 'update'])
    expect(chamadas[1]?.opcoes).toEqual({ id: 'ac-1' })
    expect(chamadas[1]?.parametros).not.toHaveProperty('marcacoes')
    expect(chamadas[1]?.parametros['token']).toBe(acompanhamento().token)
  })

  it('CB-107: link que já esteve na nuvem só é atualizado, nunca recriado', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99', dadosPor: { update: [{ id: 'ac-1' }] } })
    expect(await salvarLinkNaNuvem(cliente, acompanhamento(), JA_ESTEVE)).toEqual({ tipo: 'salvo' })
    expect(chamadas.map((c) => c.tipo)).toEqual(['update'])
  })

  it('CB-107: a linha sumiu da nuvem (apagada em outro aparelho): diz que sumiu e não recria', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99', dadosPor: { update: [] } })
    expect(await salvarLinkNaNuvem(cliente, acompanhamento(), JA_ESTEVE)).toEqual({ tipo: 'sumiu' })
    expect(chamadas.map((c) => c.tipo)).toEqual(['update'])
  })

  it('CB-107: apagada entre os dois passos: a atualização não recria a linha', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99', dadosPor: { upsert: [], update: [] } })
    expect(await salvarLinkNaNuvem(cliente, acompanhamento(), NOVO)).toEqual({ tipo: 'sumiu' })
    expect(chamadas.map((c) => c.tipo)).toEqual(['upsert', 'update'])
  })

  it('resposta da atualização que não é lista é falha, não "sumiu"', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-99', dadosPor: { update: { nada: true } } })
    expect(await salvarLinkNaNuvem(cliente, acompanhamento(), JA_ESTEVE)).toEqual({ tipo: 'falhou', motivo: FALHA_DE_REDE })
  })

  it('CA-422 / CA-442: passar do limite do plano devolve a frase do limite', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-99', erro: LIMITE })
    expect(await salvarLinkNaNuvem(cliente, acompanhamento(), NOVO)).toEqual({ tipo: 'falhou', motivo: LIMITE_DE_LINKS })
  })

  it('CA-442: outro P0001 do banco não é confundido com o limite', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-99', erro: { code: 'P0001', message: 'Entre na sua conta.' } })
    expect(await salvarLinkNaNuvem(cliente, acompanhamento(), NOVO)).toEqual({ tipo: 'falhou', motivo: 'Entre na sua conta.' })
  })

  it('CA-446: o banco recusa o link grande demais, por qualquer das cinco travas; a tela recebe a frase de tamanho', async () => {
    const travas = ['acompanhamentos_missoes_tamanho', 'acompanhamentos_marcacoes_tamanho', 'acompanhamentos_nome_tamanho', 'acompanhamentos_caso_id_tamanho', 'acompanhamentos_paciente_id_tamanho']
    for (const trava of travas) {
      const erro = { code: '23514', message: `new row for relation "acompanhamentos" violates check constraint "${trava}"` }
      expect(await salvarLinkNaNuvem(clienteFalso({ usuario: 'user-99', erro }).cliente, acompanhamento(), NOVO), trava).toEqual({ tipo: 'falhou', motivo: LINK_GRANDE_DEMAIS })
      expect(await salvarLinkNaNuvem(clienteFalso({ usuario: 'user-99', erro }).cliente, acompanhamento(), JA_ESTEVE), trava).toEqual({ tipo: 'falhou', motivo: LINK_GRANDE_DEMAIS })
      expect(await subirAcompanhamento(clienteFalso({ usuario: 'user-99', erro }).cliente, acompanhamento()), trava).toBe(LINK_GRANDE_DEMAIS)
    }
  })

  it('CA-430 / CA-439: a nuvem recusa: devolve a falha traduzida, nunca o texto técnico', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-99', erro: { code: '42501', message: 'new row violates row-level security policy' } })
    expect(await salvarLinkNaNuvem(cliente, acompanhamento(), NOVO)).toEqual({ tipo: 'falhou', motivo: FALHA_DE_REDE })
  })

  it('CA-439: servidor ligado e sem sessão: salvar falha, sem pedido nenhum', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: null })
    expect(await salvarLinkNaNuvem(cliente, acompanhamento(), NOVO)).toEqual({ tipo: 'falhou', motivo: FALHA_DE_REDE })
    expect(chamadas).toHaveLength(0)
  })

  it('CA-439: a nuvem que não responde vira falha e o pedido é cancelado, para não chegar depois', async () => {
    vi.useFakeTimers()
    try {
      const { cliente, sinais } = clienteFalso({ usuario: 'user-99', semResposta: true })
      const salvando = salvarLinkNaNuvem(cliente, acompanhamento(), NOVO)
      await vi.advanceTimersByTimeAsync(PRAZO_DA_NUVEM_MS)
      expect(await salvando).toEqual({ tipo: 'falhou', motivo: FALHA_DE_REDE })
      expect(sinais.length).toBeGreaterThan(0)
      expect(sinais.every((s) => s.aborted)).toBe(true)
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

  it('CA-443: servidor ligado e sem sessão: não sobe e diz por quê', async () => {
    const { cliente, chamadas } = clienteFalso({ sessaoComErro: true })
    expect(await subirAcompanhamento(cliente, acompanhamento())).toBe(FALHA_DE_REDE)
    expect(chamadas).toHaveLength(0)
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

  it('CA-440: servidor ligado e sem sessão: remover falha em vez de dizer que removeu', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: null })
    expect(await removerAcompanhamentoDaNuvem(cliente, 'ac-1')).toBe(FALHA_DE_REDE)
    expect(chamadas).toHaveLength(0)
  })
})

describe('a conta esperada (spec dados-por-conta, CA-474)', () => {
  // A sessão virou a conta B enquanto o aparelho trabalhava pela conta A.
  const daOutraConta = () => clienteFalso({ usuario: 'conta-b', dados: [LINHA] })

  it('CA-474: listar, subir, salvar e remover não pedem nada quando a sessão é de outra conta', async () => {
    const { cliente, chamadas } = daOutraConta()
    expect(await listarAcompanhamentosDaNuvem(cliente, 'conta-a')).toEqual({ tipo: 'falhou', mensagem: FALHA_DE_REDE })
    expect(await subirAcompanhamento(cliente, acompanhamento(), 'conta-a')).toBe(FALHA_DE_REDE)
    expect(await salvarLinkNaNuvem(cliente, acompanhamento(), { jaEsteveNaNuvem: false, esperado: 'conta-a' })).toEqual({ tipo: 'falhou', motivo: FALHA_DE_REDE })
    expect(await removerAcompanhamentoDaNuvem(cliente, 'ac-1', 'conta-a')).toBe(FALHA_DE_REDE)
    expect(chamadas).toHaveLength(0)
  })

  it('com a sessão da conta esperada, segue como sempre', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'conta-a' })
    expect(await subirAcompanhamento(cliente, acompanhamento(), 'conta-a')).toBeNull()
    expect(chamadas[0]?.parametros['nutricionista_id']).toBe('conta-a')
  })
})

describe('apagar os acompanhamentos com a conta esperada (spec dados-por-conta, DP-19)', () => {
  it('CA-474: com a sessão de outra conta, não apaga nada e não diz que apagou', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'conta-b' })
    expect(await apagarAcompanhamentosDaNuvem(cliente, 'conta-a')).toBe(FALHA_DE_REDE)
    expect(chamadas).toHaveLength(0)
  })
})

describe('A dieta do link na nuvem (spec dieta-no-link)', () => {
  const DIETA: DietaDoLink = {
    refeicoes: [{ horario: '12:00', nome: 'Almoço', opcoes: [[{ medida: '6 colheres de sopa', gramas: 150, alimento: 'Arroz, tipo 1, cozido' }]] }],
    orientacoes: 'Beber água.',
    receitas: '',
    copiadaEm: '2026-10-14',
  }
  const comDieta = (): Acompanhamento => ({ ...acompanhamento(), dieta: DIETA })
  const NOVO = { jaEsteveNaNuvem: false }
  const JA_ESTEVE = { jaEsteveNaNuvem: true }

  it('CA-548: a linha que a função do paciente devolve traz a dieta, e o link abre com ela', async () => {
    const { cliente } = clienteFalso({ dados: [{ ...LINHA, dieta: DIETA }] })
    expect((await fonteSupabase(cliente).porToken('kf3mq9zt7bnd'))?.dieta).toEqual(DIETA)
  })

  it('CB-151: a função antiga (banco sem o 012) não traz a coluna, e o link abre sem dieta', async () => {
    const { cliente } = clienteFalso({ dados: [LINHA] })
    const a = await fonteSupabase(cliente).porToken('kf3mq9zt7bnd')
    expect(a?.missoes).toHaveLength(1)
    expect(a?.dieta).toBeNull()
  })

  it('CB-153: dieta estragada na linha conta como sem dieta, e o resto do link continua', () => {
    const a = daLinha({ ...LINHA, dieta: { refeicoes: 'lixo' } })
    expect(a?.dieta).toBeNull()
    expect(a?.missoes).toHaveLength(1)
  })

  it('CA-548: criar o link com a dieta grava a cópia na coluna', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99', dadosPor: { upsert: [{ id: 'ac-1' }] } })
    expect(await salvarLinkNaNuvem(cliente, comDieta(), NOVO)).toEqual({ tipo: 'salvo' })
    expect(chamadas[0]?.parametros['dieta']).toEqual(DIETA)
  })

  it('CA-543: desligar a dieta grava a coluna vazia, pela atualização do link', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99', dadosPor: { update: [{ id: 'ac-1' }] } })
    expect(await salvarLinkNaNuvem(cliente, acompanhamento(), JA_ESTEVE)).toEqual({ tipo: 'salvo' })
    expect(chamadas[0]?.tipo).toBe('update')
    expect(chamadas[0]?.parametros).toHaveProperty('dieta', null)
  })

  it('CA-549 e CB-158: a tela do paciente nunca manda a dieta: só o token e as marcações', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99' })
    await fonteSupabase(cliente).salvar(comDieta())
    expect(chamadas).toHaveLength(1)
    expect(chamadas[0]).toMatchObject({ tipo: 'rpc', nome: 'marcar_missoes' })
    expect(Object.keys(chamadas[0]?.parametros ?? {})).toEqual(['p_token', 'p_marcacoes'])
  })

  it('CB-151: banco sem o 012: criar o link manda de novo sem a coluna, e o link salva', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99', semColunaDieta: true, dadosPor: { upsert: [{ id: 'ac-1' }] } })
    expect(await salvarLinkNaNuvem(cliente, comDieta(), NOVO)).toEqual({ tipo: 'salvo' })
    expect(chamadas.map((c) => c.tipo)).toEqual(['upsert', 'upsert'])
    expect(chamadas[1]?.parametros).not.toHaveProperty('dieta')
    expect(chamadas[1]?.parametros['token']).toBe(acompanhamento().token)
  })

  it('CB-151: banco sem o 012: atualizar e subir o link também mandam de novo sem a coluna', async () => {
    const atualizar = clienteFalso({ usuario: 'user-99', semColunaDieta: true, dadosPor: { update: [{ id: 'ac-1' }] } })
    expect(await salvarLinkNaNuvem(atualizar.cliente, comDieta(), JA_ESTEVE)).toEqual({ tipo: 'salvo' })
    expect(atualizar.chamadas.map((c) => c.tipo)).toEqual(['update', 'update'])
    expect(atualizar.chamadas[1]?.parametros).not.toHaveProperty('dieta')

    const subir = clienteFalso({ usuario: 'user-99', semColunaDieta: true })
    expect(await subirAcompanhamento(subir.cliente, comDieta())).toBeNull()
    expect(subir.chamadas.map((c) => c.tipo)).toEqual(['upsert', 'upsert'])
    expect(subir.chamadas[1]?.parametros).not.toHaveProperty('dieta')
  })

  it('DP-154: só a recusa da coluna dieta manda de novo; outra coluna ou outro erro seguem como antes', async () => {
    const outraColuna = clienteFalso({ usuario: 'user-99', erro: { code: 'PGRST204', message: "Could not find the 'nome' column of 'acompanhamentos' in the schema cache" } })
    expect(await salvarLinkNaNuvem(outraColuna.cliente, comDieta(), NOVO)).toEqual({ tipo: 'falhou', motivo: FALHA_DE_REDE })
    expect(outraColuna.chamadas).toHaveLength(1)

    const semInternet = clienteFalso({ usuario: 'user-99', erro: 'Failed to fetch' })
    expect(await salvarLinkNaNuvem(semInternet.cliente, comDieta(), NOVO)).toEqual({ tipo: 'falhou', motivo: FALHA_DE_REDE })
    expect(semInternet.chamadas).toHaveLength(1)
  })

  it('CB-152: a dieta grande demais é recusada pela trava dela, e a tela recebe a frase da dieta', async () => {
    const erro = { code: '23514', message: 'new row for relation "acompanhamentos" violates check constraint "acompanhamentos_dieta_tamanho"' }
    expect(await salvarLinkNaNuvem(clienteFalso({ usuario: 'user-99', erro }).cliente, comDieta(), NOVO)).toEqual({ tipo: 'falhou', motivo: DIETA_GRANDE_DEMAIS })
    expect(await subirAcompanhamento(clienteFalso({ usuario: 'user-99', erro }).cliente, comDieta())).toBe(DIETA_GRANDE_DEMAIS)
  })
})

describe('A fonte do link do paciente: nuvem e cópia do aparelho (spec revisao-geral-publica, D-232)', () => {
  function memoria(): Armazenamento {
    const dados = new Map<string, string>()
    return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => void dados.set(c, v), removeItem: (c) => void dados.delete(c) }
  }

  it('CA-755: a nuvem não conhece o link e o aparelho não tem cópia: nulo ("Este link não existe mais")', async () => {
    const { cliente } = clienteFalso({ dados: [] })
    expect(await fonteDoPaciente(cliente, criarRepositorioAcompanhamentos(memoria()), vi.fn()).porToken('kf3mq9zt7bnd')).toBeNull()
  })

  it('CA-753: a nuvem não respondeu e o aparelho não tem cópia: rejeita com LinkSemConexao, em vez de dizer que o link não existe', async () => {
    const { cliente } = clienteFalso({ erro: 'TypeError: Failed to fetch' })
    await expect(fonteDoPaciente(cliente, criarRepositorioAcompanhamentos(memoria()), vi.fn()).porToken('kf3mq9zt7bnd')).rejects.toBeInstanceOf(LinkSemConexao)
  })

  it('CA-754: a nuvem não respondeu e o aparelho tem a cópia: abre pela cópia', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const copia = repo.salvar(acompanhamento())
    const { cliente } = clienteFalso({ erro: 'TypeError: Failed to fetch' })
    expect(await fonteDoPaciente(cliente, repo, vi.fn()).porToken(copia.token)).toEqual(copia)
  })

  it('a nuvem achou o link: vale o da nuvem', async () => {
    const { cliente } = clienteFalso({ dados: [LINHA] })
    expect((await fonteDoPaciente(cliente, criarRepositorioAcompanhamentos(memoria()), vi.fn()).porToken('kf3mq9zt7bnd'))?.nome).toBe('Ana')
  })

  it('CA-756: a nuvem recusou a marcação: rejeita com LinkSemConexao e não grava a cópia do aparelho', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const aoSalvar = vi.fn()
    const { cliente } = clienteFalso({ erro: 'TypeError: Failed to fetch' })
    await expect(fonteDoPaciente(cliente, repo, aoSalvar).salvar(acompanhamento())).rejects.toBeInstanceOf(LinkSemConexao)
    expect(repo.listar()).toEqual([])
    expect(aoSalvar).not.toHaveBeenCalled()
  })

  it('M-3b (CA-756): a nuvem recusou por um motivo dela, não a rede: rejeita com MarcacaoRecusada e o motivo, sem gravar aqui', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const { cliente } = clienteFalso({ erro: { code: '22023', message: 'Este link já guarda marcações demais.' } })
    const recusa = await fonteDoPaciente(cliente, repo, vi.fn())
      .salvar(acompanhamento())
      .then(
        () => null,
        (erro: unknown) => erro,
      )
    expect(recusa).toBeInstanceOf(MarcacaoRecusada)
    expect(recusa instanceof MarcacaoRecusada ? recusa.motivo : null).toBe('Este link já guarda marcações demais.')
    expect(repo.listar()).toEqual([])
  })

  it('M-3b: erro do banco que não é uma frase do MetaNutri continua contando como sem conexão', async () => {
    const { cliente } = clienteFalso({ erro: { code: '22023', message: 'cannot get array length of a scalar' } })
    await expect(fonteDoPaciente(cliente, criarRepositorioAcompanhamentos(memoria()), vi.fn()).salvar(acompanhamento())).rejects.toBeInstanceOf(LinkSemConexao)
  })

  it('CA-756: a nuvem aceitou a marcação: grava a cópia do aparelho e avisa', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const aoSalvar = vi.fn()
    const { cliente, chamadas } = clienteFalso()
    await fonteDoPaciente(cliente, repo, aoSalvar).salvar(acompanhamento())
    expect(chamadas.map((c) => c.nome)).toEqual(['marcar_missoes'])
    expect(repo.listar()).toHaveLength(1)
    expect(aoSalvar).toHaveBeenCalledOnce()
  })

  it('CB-239: sem servidor, a fonte é só a do aparelho, como antes', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const fonte = fonteDoPaciente(null, repo, vi.fn())
    expect(fonte.naNuvem).toBe(false)
    expect(await fonte.porToken('inexistente')).toBeNull()
    const salvo = await fonte.salvar(acompanhamento())
    expect(await fonte.porToken(salvo.token)).toEqual(salvo)
  })

  it('CA-2289: o endereço trocado não abre pela cópia do aparelho; a cópia sai e a lista do aparelho fica sabendo', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const copia = repo.salvar(acompanhamento())
    const aoSalvar = vi.fn()
    const { cliente } = clientePorFuncao({ missoes_por_token: { data: [], error: null }, link_trocado: { data: true, error: null } })
    await expect(fonteDoPaciente(cliente, repo, aoSalvar).porToken(copia.token)).rejects.toBeInstanceOf(LinkTrocado)
    expect(repo.porToken(copia.token)).toBeNull()
    expect(aoSalvar).toHaveBeenCalledOnce()
  })
})

/** Um cliente que responde cada função do banco pelo nome (a do paciente e a pergunta do endereço trocado). */
function clientePorFuncao(respostas: Readonly<Record<string, RespostaFalsa>>): { readonly cliente: ClienteMissoes; readonly chamadas: readonly string[] } {
  const chamadas: string[] = []
  const base = clienteFalso().cliente
  return {
    chamadas,
    cliente: {
      ...base,
      rpc: (nome) => {
        chamadas.push(nome)
        return Promise.resolve(respostas[nome] ?? { data: null, error: null })
      },
    },
  }
}

describe('o endereço trocado (revisão r1, D-1246 e CA-2289)', () => {
  it('CA-2289: o link que não abriu e foi trocado rejeita com LinkTrocado', async () => {
    const { cliente, chamadas } = clientePorFuncao({ missoes_por_token: { data: [], error: null }, link_trocado: { data: true, error: null } })
    await expect(fonteSupabase(cliente).porToken('kf3mq9zt7bnd')).rejects.toBeInstanceOf(LinkTrocado)
    expect(chamadas).toEqual(['missoes_por_token', 'link_trocado'])
  })

  it('CA-2238: o link que não abriu e não foi trocado é o "não abre mais" de sempre (nulo)', async () => {
    const { cliente } = clientePorFuncao({ missoes_por_token: { data: [], error: null }, link_trocado: { data: false, error: null } })
    expect(await fonteSupabase(cliente).porToken('kf3mq9zt7bnd')).toBeNull()
  })

  it('o banco sem a pergunta (sem o 017) ou com erro nela: vale o "não abre mais"', async () => {
    const { cliente } = clientePorFuncao({ missoes_por_token: { data: [], error: null }, link_trocado: { data: null, error: { message: 'Could not find the function public.link_trocado', code: 'PGRST202' } } })
    expect(await fonteSupabase(cliente).porToken('kf3mq9zt7bnd')).toBeNull()
  })

  it('o link que abriu não faz a pergunta', async () => {
    const { cliente, chamadas } = clientePorFuncao({ missoes_por_token: { data: [LINHA], error: null } })
    expect((await fonteSupabase(cliente).porToken('kf3mq9zt7bnd'))?.nome).toBe('Ana')
    expect(chamadas).toEqual(['missoes_por_token'])
  })
})

describe('a marca no link do paciente (spec marca-no-link)', () => {
  function memoria(): Armazenamento {
    const dados = new Map<string, string>()
    return { getItem: (c) => dados.get(c) ?? null, setItem: (c, v) => void dados.set(c, v), removeItem: (c) => void dados.delete(c) }
  }
  const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

  it('CA-1974: a linha da função traz a marca, e o link abre com ela', async () => {
    const { cliente } = clienteFalso({ dados: [{ ...LINHA, marca_logo: LOGO, marca_cor: '#7a2944' }] })
    const a = await fonteSupabase(cliente).porToken('kf3mq9zt7bnd')
    expect(a?.marca).toEqual({ logo: LOGO, cor: '#7a2944' })
    expect(a?.nome).toBe('Ana')
  })

  it('CA-1968: a função antiga (banco sem o 015) não traz as colunas, e o link abre sem marca', async () => {
    const { cliente } = clienteFalso({ dados: [LINHA] })
    expect((await fonteSupabase(cliente).porToken('kf3mq9zt7bnd'))?.marca).toEqual({ logo: null, cor: null })
  })

  it('CA-1967: a marca é lida a cada abertura, sem ficar guardada de uma vez para outra', async () => {
    const primeira = clienteFalso({ dados: [LINHA] })
    expect((await fonteSupabase(primeira.cliente).porToken('kf3mq9zt7bnd'))?.marca?.cor).toBeNull()
    const depois = clienteFalso({ dados: [{ ...LINHA, marca_cor: '#1f4e8c' }] })
    expect((await fonteSupabase(depois.cliente).porToken('kf3mq9zt7bnd'))?.marca?.cor).toBe('#1f4e8c')
  })

  it('a marca passa pela fonte do paciente; a cópia do aparelho (sem nuvem) não tem marca', async () => {
    const { cliente } = clienteFalso({ dados: [{ ...LINHA, marca_cor: '#1f4e8c' }] })
    const repo = criarRepositorioAcompanhamentos(memoria())
    expect((await fonteDoPaciente(cliente, repo, vi.fn()).porToken('kf3mq9zt7bnd'))?.marca?.cor).toBe('#1f4e8c')
    const copia = repo.salvar(acompanhamento())
    const semNuvem = clienteFalso({ dados: [] })
    expect((await fonteDoPaciente(semNuvem.cliente, repo, vi.fn()).porToken(copia.token))?.marca).toBeUndefined()
  })

  it('DP-ML-14: o link que a tela grava (as marcações) nunca leva a marca para a cópia do aparelho nem para a nuvem', async () => {
    const { cliente, chamadas } = clienteFalso({ dados: null })
    const repo = criarRepositorioAcompanhamentos(memoria())
    const fonte = fonteDoPaciente(cliente, repo, vi.fn())
    await fonte.salvar({ ...acompanhamento(), marca: { logo: LOGO, cor: '#1f4e8c' } })
    expect(JSON.stringify(chamadas)).not.toContain('iVBORw0KGgo')
    expect(JSON.stringify(repo.listar())).not.toContain('iVBORw0KGgo')
  })
})

describe('O link do paciente com a mensagem, a consulta e o link fixo (spec lado-do-paciente)', () => {
  const NOVO = { jaEsteveNaNuvem: false } as const
  const LINHA_NOVA = {
    ...LINHA,
    mensagem: 'Juliana, foco no café da manhã.',
    mensagem_em: '2026-11-03T10:00:00.000Z',
    proxima_consulta: '2026-11-17T14:30',
    ultimo_acesso: '2026-11-03',
    substituido_por: null,
    plano_em: '2026-11-01T09:00:00.000Z',
    nutricionista: 'Ana Lima',
    email_mascarado: 'j•••a@gmail.com',
    avisos: { plano: 'ligado', semana: 'desligado', lembrete: 'nao-oferecido' },
  }

  it('CA-2212, CA-2214 e CA-2239: a linha traz a mensagem, a consulta e o último acesso', () => {
    expect(daLinha(LINHA_NOVA)).toMatchObject({
      mensagem: 'Juliana, foco no café da manhã.',
      mensagemEm: '2026-11-03T10:00:00.000Z',
      proximaConsulta: '2026-11-17T14:30',
      ultimoAcesso: '2026-11-03',
      substituidoPor: null,
      planoEm: '2026-11-01T09:00:00.000Z',
    })
  })

  it('DP-LP-30: a função de antes do 017 não traz as colunas, e o link abre sem elas', () => {
    expect(daLinha(LINHA)).toMatchObject({ mensagem: null, proximaConsulta: null, ultimoAcesso: null, substituidoPor: null })
  })

  it('D-1210, CA-2235 e CA-2256: o link aberto traz o nome da nutricionista, o e-mail mascarado e os avisos', async () => {
    const { cliente } = clienteFalso({ dados: [LINHA_NOVA] })
    const link = await fonteSupabase(cliente).porToken('kf3mq9zt7bnd')
    expect(link?.doLink).toEqual({
      nutricionista: 'Ana Lima',
      emailMascarado: 'j•••a@gmail.com',
      avisos: { plano: 'ligado', semana: 'desligado', lembrete: 'nao-oferecido' },
    })
  })

  it('CA-2242: aviso com estado estranho conta como não oferecido', async () => {
    const { cliente } = clienteFalso({ dados: [{ ...LINHA_NOVA, avisos: { plano: 'talvez', semana: 7 } }] })
    const link = await fonteSupabase(cliente).porToken('kf3mq9zt7bnd')
    expect(link?.doLink?.avisos).toEqual({ plano: 'nao-oferecido', semana: 'nao-oferecido', lembrete: 'nao-oferecido' })
  })

  it('D-1208: criar o link grava a mensagem, a consulta e o fixo; o último acesso e a data do plano são da nuvem', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99', dadosPor: { upsert: [{ id: 'ac-1' }] } })
    const link = { ...acompanhamento(), mensagem: 'Olá', mensagemEm: '2026-11-03T10:00:00.000Z', proximaConsulta: '2026-11-17', ultimoAcesso: '2026-11-03', planoEm: 'x' }
    expect(await salvarLinkNaNuvem(cliente, link, NOVO)).toEqual({ tipo: 'salvo' })
    const linha = chamadas[0]?.parametros ?? {}
    expect(linha).toMatchObject({ mensagem: 'Olá', mensagem_em: '2026-11-03T10:00:00.000Z', proxima_consulta: '2026-11-17', substituido_por: null })
    expect(linha).not.toHaveProperty('ultimo_acesso')
    expect(linha).not.toHaveProperty('plano_em')
  })

  it('DP-LP-30: banco sem o 017: o link salva de novo sem as colunas novas, uma de cada vez', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-99', semColunas: ['mensagem', 'proxima_consulta'], dadosPor: { upsert: [{ id: 'ac-1' }] } })
    expect(await salvarLinkNaNuvem(cliente, acompanhamento(), NOVO)).toEqual({ tipo: 'salvo' })
    expect(chamadas).toHaveLength(3)
    expect(chamadas[2]?.parametros).not.toHaveProperty('mensagem')
    expect(chamadas[2]?.parametros).not.toHaveProperty('proxima_consulta')
    expect(chamadas[2]?.parametros).toHaveProperty('mensagem_em')
  })

  it('DP-ML-14: a tela do paciente nunca grava os dados do link nem a marca, nem na nuvem nem no aparelho', async () => {
    const { cliente, chamadas } = clienteFalso({ dados: [LINHA_NOVA] })
    const repositorio = criarRepositorioAcompanhamentos(null)
    const fonte = fonteDoPaciente(cliente, repositorio, () => undefined)
    const aberto = await fonte.porToken('kf3mq9zt7bnd')
    if (!aberto) throw new Error('o link devia abrir')
    await fonte.salvar(aberto)
    expect(chamadas.at(-1)).toMatchObject({ tipo: 'rpc', nome: 'marcar_missoes' })
    const guardado = repositorio.porToken('kf3mq9zt7bnd')
    expect(guardado).not.toBeNull()
    expect(guardado).not.toHaveProperty('doLink')
    expect(guardado).not.toHaveProperty('marca')
  })
})
