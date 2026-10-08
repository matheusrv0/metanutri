import { CHAVE_AVISO_VISTO } from '@/ui/casos/AvisoPrimeiroAcesso.tsx'
import { armazenamentoDaConta } from './armazenamentoDaConta.ts'
import { CHAVE_DONO, OUTRAS_CHAVES_DA_PESSOA, apagarDadosDaConta, migrarDadosSemConta } from './donoDosDados.ts'
import type { ArmazenamentoListavel } from './persistencia.ts'

function memoria(inicial: Record<string, string> = {}): ArmazenamentoListavel & { readonly dados: Map<string, string> } {
  const dados = new Map(Object.entries(inicial))
  return {
    dados,
    get length() {
      return dados.size
    },
    key: (i) => [...dados.keys()][i] ?? null,
    getItem: (c) => dados.get(c) ?? null,
    setItem: (c, v) => void dados.set(c, v),
    removeItem: (c) => void dados.delete(c),
  }
}

/** Um aparelho com os dados de antes desta mudança, sem prefixo, e o que é do aparelho. */
const DADOS_ANTIGOS = {
  'metanutri:casos': '["x"]',
  'metanutri:caso:x': '{"nome":"Plano da Ana"}',
  'metanutri:pacientes': '[{"id":"ana"}]',
  'metanutri:perfil': '{"nome":"Maria"}',
  'metanutri:aviso-inicial-visto': '1',
} as const

const DO_APARELHO = {
  'metanutri:tema': 'escuro',
  'metanutri:email-pendente': '{"email":"x@y.z"}',
  'metanutri:destino-pendente': '#/painel',
  'sb-projeto-auth-token': '{"sessao":true}',
} as const

/** Um plano como o repositório grava em `metanutri:caso:<id>`. */
const planoGuardado = (id: string, nome: string, atualizadoEm: string) =>
  JSON.stringify({ formato: 1, versao: 1, atualizadoEm, caso: { id, nome }, plano: { refeicoes: [] } })

const nomeDoPlano = (texto: string | null): string => (JSON.parse(texto ?? '{}') as { caso?: { nome?: string } }).caso?.nome ?? ''

const semPrefixo = (arm: ReturnType<typeof memoria>) => [...arm.dados.keys()].filter((c) => !c.startsWith('metanutri:conta:'))

describe('dados de antes da mudança vão para a conta dona (spec dados-por-conta, D-123)', () => {
  it('CA-467: a conta dona entra e vê tudo como antes; o que é do aparelho fica onde está', () => {
    const arm = memoria({ [CHAVE_DONO]: 'conta-a', ...DADOS_ANTIGOS, ...DO_APARELHO })
    expect(migrarDadosSemConta(arm, 'conta-a')).toBe('movido')

    const contaA = armazenamentoDaConta(arm, 'conta-a')
    for (const [chave, valor] of Object.entries(DADOS_ANTIGOS)) expect(contaA.getItem(chave), chave).toBe(valor)
    expect(semPrefixo(arm).sort()).toEqual([CHAVE_DONO, ...Object.keys(DO_APARELHO)].sort())
    for (const [chave, valor] of Object.entries(DO_APARELHO)) expect(arm.dados.get(chave), chave).toBe(valor)
  })

  it('migração: com dono, outra conta que entra não recebe nada; os dados vão para o dono', () => {
    const arm = memoria({ [CHAVE_DONO]: 'conta-a', ...DADOS_ANTIGOS })
    expect(migrarDadosSemConta(arm, 'conta-b')).toBe('movido')
    expect(armazenamentoDaConta(arm, 'conta-b').length).toBe(0)
    expect(armazenamentoDaConta(arm, 'conta-a').getItem('metanutri:pacientes')).toBe('[{"id":"ana"}]')
    expect(arm.dados.get('metanutri:pacientes')).toBeUndefined()
  })

  it('CA-468: dados sem dono passam a ser da conta que entra', () => {
    const arm = memoria({ ...DADOS_ANTIGOS })
    expect(migrarDadosSemConta(arm, 'conta-b')).toBe('movido')
    const contaB = armazenamentoDaConta(arm, 'conta-b')
    expect(contaB.getItem('metanutri:caso:x')).toBe('{"nome":"Plano da Ana"}')
    expect(contaB.getItem('metanutri:pacientes')).toBe('[{"id":"ana"}]')
    // DP-6: o dono fica, para o que aparecer sem prefixo depois ir para ele.
    expect(arm.dados.get(CHAVE_DONO)).toBe('conta-b')
  })

  it('migração: o dono fica marcado antes da primeira cópia', () => {
    const arm = memoria({ ...DADOS_ANTIGOS })
    const gravadas: string[] = []
    const setItem = arm.setItem
    arm.setItem = (c, v) => {
      gravadas.push(c)
      setItem(c, v)
    }
    migrarDadosSemConta(arm, 'conta-b')
    expect(gravadas[0]).toBe(CHAVE_DONO)
  })

  it('CA-472: uma aba antiga grava depois da migração, e a próxima entrada mostra a edição sem perder nada', () => {
    // A conta já tem o que foi movido; a aba antiga (versão anterior do site) gravou sem prefixo depois.
    const arm = memoria({
      [CHAVE_DONO]: 'conta-a',
      'metanutri:conta:conta-a:casos': '["x"]',
      'metanutri:conta:conta-a:caso:x': planoGuardado('x', 'Plano da Ana', '2026-10-07T10:00:00.000Z'),
      'metanutri:conta:conta-a:pacientes': JSON.stringify([{ id: 'ana', nome: 'Ana' }]),
      'metanutri:casos': '["x","y"]',
      'metanutri:caso:x': planoGuardado('x', 'Plano da Ana, editado na aba antiga', '2026-10-07T12:00:00.000Z'),
      'metanutri:caso:y': planoGuardado('y', 'Plano novo da aba antiga', '2026-10-07T12:30:00.000Z'),
      'metanutri:pacientes': JSON.stringify([{ id: 'ana', nome: 'Ana (aba antiga)' }, { id: 'bia', nome: 'Bia' }]),
    })
    expect(migrarDadosSemConta(arm, 'conta-a', { gerarId: () => 'copia' })).toBe('movido')

    const contaA = armazenamentoDaConta(arm, 'conta-a')
    const indice = JSON.parse(contaA.getItem('metanutri:casos') ?? '[]') as string[]
    expect([...indice].sort()).toEqual(['copia', 'x', 'y'])
    // O mais novo fica com o id; o outro ganha id novo e continua na lista.
    expect(nomeDoPlano(contaA.getItem('metanutri:caso:x'))).toBe('Plano da Ana, editado na aba antiga')
    expect(nomeDoPlano(contaA.getItem('metanutri:caso:copia'))).toBe('Plano da Ana')
    expect(JSON.parse(contaA.getItem('metanutri:caso:copia') ?? '{}').caso.id).toBe('copia')
    expect(nomeDoPlano(contaA.getItem('metanutri:caso:y'))).toBe('Plano novo da aba antiga')
    // Mesmo id fica o da conta; o paciente novo entra.
    expect(JSON.parse(contaA.getItem('metanutri:pacientes') ?? '[]')).toEqual([
      { id: 'ana', nome: 'Ana' },
      { id: 'bia', nome: 'Bia' },
    ])
    expect(semPrefixo(arm)).toEqual([CHAVE_DONO])
  })

  it('D-127: plano da conta mais novo fica com o id; o de fora ganha id novo e entra no índice', () => {
    const arm = memoria({
      [CHAVE_DONO]: 'conta-a',
      'metanutri:conta:conta-a:casos': '["x"]',
      'metanutri:conta:conta-a:caso:x': planoGuardado('x', 'Da conta, mais novo', '2026-10-08T09:00:00.000Z'),
      'metanutri:caso:x': planoGuardado('x', 'De fora, mais velho', '2026-10-01T09:00:00.000Z'),
    })
    migrarDadosSemConta(arm, 'conta-a', { gerarId: () => 'outro' })
    const contaA = armazenamentoDaConta(arm, 'conta-a')
    expect(nomeDoPlano(contaA.getItem('metanutri:caso:x'))).toBe('Da conta, mais novo')
    expect(nomeDoPlano(contaA.getItem('metanutri:caso:outro'))).toBe('De fora, mais velho')
    expect(JSON.parse(contaA.getItem('metanutri:casos') ?? '[]')).toEqual(['x', 'outro'])
  })

  it('D-127: uma chave em conflito não impede as outras de se moverem', () => {
    const arm = memoria({
      [CHAVE_DONO]: 'conta-a',
      'metanutri:conta:conta-a:perfil': '{"nome":"Maria da conta"}',
      'metanutri:perfil': '{"nome":"Maria antiga"}',
      'metanutri:modelos': JSON.stringify([{ id: 'm1', nome: 'Gestante', plano: { refeicoes: [] } }]),
    })
    expect(migrarDadosSemConta(arm, 'conta-a')).toBe('movido')
    const contaA = armazenamentoDaConta(arm, 'conta-a')
    expect(contaA.getItem('metanutri:perfil')).toBe('{"nome":"Maria da conta"}')
    expect(JSON.parse(contaA.getItem('metanutri:modelos') ?? '[]')).toHaveLength(1)
    expect(semPrefixo(arm)).toEqual([CHAVE_DONO])
  })

  it('D-127: configurações ficam com o valor da conta; sugestões ocultas viram a união; o índice junta na ordem da conta', () => {
    const arm = memoria({
      [CHAVE_DONO]: 'conta-a',
      'metanutri:conta:conta-a:impressao': '{"trocas":true}',
      'metanutri:conta:conta-a:aviso-inicial-visto': '1',
      'metanutri:conta:conta-a:sugestoes-ocultas': '[3,5]',
      'metanutri:conta:conta-a:casos': '["b","a"]',
      'metanutri:impressao': '{"trocas":false}',
      'metanutri:aviso-inicial-visto': '0',
      'metanutri:sugestoes-ocultas': '[5,7]',
      'metanutri:casos': '["a","c"]',
    })
    migrarDadosSemConta(arm, 'conta-a')
    const contaA = armazenamentoDaConta(arm, 'conta-a')
    expect(contaA.getItem('metanutri:impressao')).toBe('{"trocas":true}')
    expect(contaA.getItem('metanutri:aviso-inicial-visto')).toBe('1')
    expect(JSON.parse(contaA.getItem('metanutri:sugestoes-ocultas') ?? '[]')).toEqual([3, 5, 7])
    expect(JSON.parse(contaA.getItem('metanutri:casos') ?? '[]')).toEqual(['b', 'a', 'c'])
    expect(semPrefixo(arm)).toEqual([CHAVE_DONO])
  })

  it('D-127: acompanhamentos juntam os itens por id, com as marcas de cada um', () => {
    const link = (id: string, nome: string) => ({ id, token: `t-${id}`, casoId: 'x', pacienteId: null, nome, criadoEm: '2026-10-07', missoes: [], marcacoes: [], usoNaoComercial: false })
    const arm = memoria({
      [CHAVE_DONO]: 'conta-a',
      'metanutri:conta:conta-a:acompanhamentos': JSON.stringify({ formato: 1, itens: [link('l1', 'Da conta')], naNuvem: ['l1'], pendentes: [] }),
      'metanutri:acompanhamentos': JSON.stringify({ formato: 1, itens: [link('l1', 'De fora'), link('l2', 'Novo')], naNuvem: ['l1', 'l2'], pendentes: ['l1', 'l2'] }),
    })
    migrarDadosSemConta(arm, 'conta-a')
    const juntado = JSON.parse(armazenamentoDaConta(arm, 'conta-a').getItem('metanutri:acompanhamentos') ?? '{}')
    expect(juntado.itens.map((a: { nome: string }) => a.nome)).toEqual(['Da conta', 'Novo'])
    expect(juntado.naNuvem).toEqual(['l1', 'l2'])
    expect(juntado.pendentes).toEqual(['l2'])
    expect(juntado.formato).toBe(1)
  })

  it('D-127: valor de fora que o app não lê sai, e a conta fica com o dela; valor da conta ilegível dá lugar ao de fora', () => {
    const arm = memoria({
      [CHAVE_DONO]: 'conta-a',
      'metanutri:conta:conta-a:pacientes': '[{"id":"ana"}]',
      'metanutri:pacientes': 'isto não é JSON',
      'metanutri:conta:conta-a:produtos': 'quebrado',
      'metanutri:produtos': '[{"id":900001,"nome":"Iogurte"}]',
    })
    expect(migrarDadosSemConta(arm, 'conta-a')).toBe('movido')
    const contaA = armazenamentoDaConta(arm, 'conta-a')
    expect(contaA.getItem('metanutri:pacientes')).toBe('[{"id":"ana"}]')
    expect(contaA.getItem('metanutri:produtos')).toBe('[{"id":900001,"nome":"Iogurte"}]')
    expect(semPrefixo(arm)).toEqual([CHAVE_DONO])
  })

  it('migração: cópia interrompida no meio termina na próxima entrada', () => {
    // Fechou o navegador depois de copiar os casos e antes de apagar o original.
    const arm = memoria({
      [CHAVE_DONO]: 'conta-a',
      ...DADOS_ANTIGOS,
      'metanutri:conta:conta-a:caso:x': '{"nome":"Plano da Ana"}',
      'metanutri:conta:conta-a:casos': '["x"]',
    })
    expect(migrarDadosSemConta(arm, 'conta-a')).toBe('movido')
    const contaA = armazenamentoDaConta(arm, 'conta-a')
    for (const [chave, valor] of Object.entries(DADOS_ANTIGOS)) expect(contaA.getItem(chave), chave).toBe(valor)
    expect(semPrefixo(arm)).toEqual([CHAVE_DONO])
  })

  it('migração: rodar duas vezes não muda nada na segunda', () => {
    const arm = memoria({ [CHAVE_DONO]: 'conta-a', ...DADOS_ANTIGOS, ...DO_APARELHO })
    migrarDadosSemConta(arm, 'conta-a')
    const depois = new Map(arm.dados)
    expect(migrarDadosSemConta(arm, 'conta-a')).toBe('nada')
    expect(migrarDadosSemConta(arm, 'conta-b')).toBe('nada')
    expect(arm.dados).toEqual(depois)
  })

  it('migração: aparelho cheio no meio não perde nada e tenta de novo depois', () => {
    const arm = memoria({ [CHAVE_DONO]: 'conta-a', ...DADOS_ANTIGOS })
    const setItem = arm.setItem
    let cheio = true
    let gravadas = 0
    arm.setItem = (c, v) => {
      // Cabe uma chave; a segunda estoura, como o QuotaExceededError do navegador.
      if (cheio && c.startsWith('metanutri:conta:') && (gravadas += 1) > 1) throw new DOMException('cheio', 'QuotaExceededError')
      setItem(c, v)
    }
    expect(migrarDadosSemConta(arm, 'conta-a')).toBe('falhou')
    const contaA = armazenamentoDaConta(arm, 'conta-a')
    for (const [chave, valor] of Object.entries(DADOS_ANTIGOS)) expect(contaA.getItem(chave) ?? arm.dados.get(chave), chave).toBe(valor)

    cheio = false
    expect(migrarDadosSemConta(arm, 'conta-a')).toBe('movido')
    for (const [chave, valor] of Object.entries(DADOS_ANTIGOS)) expect(contaA.getItem(chave), chave).toBe(valor)
  })

  it('migração: planos fora do índice e a chave antiga dos frequentes também são da pessoa', () => {
    const arm = memoria({ ...DADOS_ANTIGOS, 'metanutri:caso:solto': '{}', 'metanutri:frequentes': '{}' })
    migrarDadosSemConta(arm, 'conta-a')
    const contaA = armazenamentoDaConta(arm, 'conta-a')
    expect(contaA.getItem('metanutri:caso:solto')).toBe('{}')
    expect(contaA.getItem('metanutri:frequentes')).toBe('{}')
    expect(semPrefixo(arm)).toEqual([CHAVE_DONO])
  })

  it('o aviso de primeiro acesso é dado da pessoa (CB-122)', () => {
    expect(OUTRAS_CHAVES_DA_PESSOA).toContain(CHAVE_AVISO_VISTO)
  })

  it('CB-121: sem armazenamento, ou com um que estoura em tudo, nada quebra', () => {
    expect(migrarDadosSemConta(null, 'conta-a')).toBe('nada')
    apagarDadosDaConta(null, 'conta-a')
    const quebrado: ArmazenamentoListavel = {
      get length(): number {
        throw new DOMException('bloqueado', 'SecurityError')
      },
      key: () => {
        throw new DOMException('bloqueado', 'SecurityError')
      },
      getItem: () => {
        throw new DOMException('bloqueado', 'SecurityError')
      },
      setItem: () => {
        throw new DOMException('bloqueado', 'SecurityError')
      },
      removeItem: () => {
        throw new DOMException('bloqueado', 'SecurityError')
      },
    }
    expect(migrarDadosSemConta(quebrado, 'conta-a')).toBe('falhou')
    expect(() => apagarDadosDaConta(quebrado, 'conta-a')).not.toThrow()
  })
})

describe('sair e apagar só leva a conta que sai (spec dados-por-conta, D-124)', () => {
  const doisDonos = () =>
    memoria({
      ...DO_APARELHO,
      'metanutri:conta:conta-a:pacientes': '[{"id":"ana"}]',
      'metanutri:conta:conta-a:aviso-inicial-visto': '1',
      'metanutri:conta:conta-b:pacientes': '[{"id":"bia"}]',
      'metanutri:conta:conta-b:casos': '["y"]',
    })

  it('CA-469: somem só os dados de A; os de B e os do aparelho continuam', () => {
    const arm = doisDonos()
    apagarDadosDaConta(arm, 'conta-a')
    expect(armazenamentoDaConta(arm, 'conta-a').length).toBe(0)
    expect(armazenamentoDaConta(arm, 'conta-b').getItem('metanutri:pacientes')).toBe('[{"id":"bia"}]')
    expect(armazenamentoDaConta(arm, 'conta-b').getItem('metanutri:casos')).toBe('["y"]')
    for (const [chave, valor] of Object.entries(DO_APARELHO)) expect(arm.dados.get(chave), chave).toBe(valor)
  })

  it('CA-469: o dono que sai leva junto o que ficou sem prefixo, e deixa de ser dono', () => {
    const arm = doisDonos()
    arm.setItem(CHAVE_DONO, 'conta-a')
    arm.setItem('metanutri:pacientes', '[{"id":"velha"}]')
    apagarDadosDaConta(arm, 'conta-a')
    expect(arm.dados.has('metanutri:pacientes')).toBe(false)
    expect(arm.dados.has(CHAVE_DONO)).toBe(false)
    expect(arm.dados.get('metanutri:tema')).toBe('escuro')
  })

  it('CA-469: o que ficou sem prefixo de outro dono continua', () => {
    const arm = doisDonos()
    arm.setItem(CHAVE_DONO, 'conta-b')
    arm.setItem('metanutri:pacientes', '[{"id":"velha"}]')
    apagarDadosDaConta(arm, 'conta-a')
    expect(arm.dados.get('metanutri:pacientes')).toBe('[{"id":"velha"}]')
    expect(arm.dados.get(CHAVE_DONO)).toBe('conta-b')
  })
})
