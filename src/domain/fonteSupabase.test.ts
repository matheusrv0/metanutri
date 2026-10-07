import { FALHA_DE_REDE } from '@/ui/estado/mensagemDoBanco.ts'
import { criarAcompanhamento, type Acompanhamento } from './acompanhamento.ts'
import { apagarAcompanhamentosDaNuvem, daLinha, fonteSupabase, type ClienteMissoes } from './fonteSupabase.ts'
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
  readonly tipo: 'rpc' | 'upsert' | 'delete'
  readonly nome: string
  readonly parametros: Record<string, unknown>
}

type ErroFalso = string | { readonly message: string; readonly code: string }

function clienteFalso(opcoes: { readonly usuario?: string | null; readonly dados?: unknown; readonly erro?: ErroFalso } = {}) {
  const chamadas: Chamada[] = []
  const erro = typeof opcoes.erro === 'string' ? { message: opcoes.erro } : (opcoes.erro ?? null)
  const resposta = { data: opcoes.dados ?? null, error: erro }

  const cliente: ClienteMissoes = {
    rpc: (nome, parametros) => {
      chamadas.push({ tipo: 'rpc', nome, parametros })
      return Promise.resolve(resposta)
    },
    from: (tabela) => ({
      upsert: (linha) => {
        chamadas.push({ tipo: 'upsert', nome: tabela, parametros: linha })
        return Promise.resolve(resposta)
      },
      delete: () => ({
        eq: (coluna, valor) => {
          chamadas.push({ tipo: 'delete', nome: tabela, parametros: { [coluna]: valor } })
          return Promise.resolve(resposta)
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
