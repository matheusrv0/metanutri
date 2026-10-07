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
}

function clienteFalso(opcoes: OpcoesDoFalso = {}) {
  const chamadas: Chamada[] = []
  const sinais: AbortSignal[] = []
  const erro = typeof opcoes.erro === 'string' ? { message: opcoes.erro } : (opcoes.erro ?? null)

  // Um pedido do cliente: é uma promessa, aceita `.select()` e guarda o sinal de desistir.
  const pedido = (tipo: Tipo) => {
    const resposta: RespostaFalsa = { data: opcoes.dadosPor?.[tipo] ?? opcoes.dados ?? null, error: erro }
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
        return pedido('upsert')
      },
      update: (campos) => ({
        eq: (coluna, valor) => {
          chamadas.push({ tipo: 'update', nome: tabela, parametros: campos, opcoes: { [coluna]: valor } })
          return pedido('update')
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
  const LIMITE = { code: 'P0001', message: LIMITE_DE_LINKS }
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

  it('CA-422 / CA-442: passar do limite do plano devolve a frase do limite', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-99', erro: LIMITE })
    expect(await salvarLinkNaNuvem(cliente, acompanhamento(), NOVO)).toEqual({ tipo: 'falhou', motivo: LIMITE_DE_LINKS })
  })

  it('CA-442: outro P0001 do banco não é confundido com o limite', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-99', erro: { code: 'P0001', message: 'Entre na sua conta.' } })
    expect(await salvarLinkNaNuvem(cliente, acompanhamento(), NOVO)).toEqual({ tipo: 'falhou', motivo: 'Entre na sua conta.' })
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
