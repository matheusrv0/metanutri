import { CHAVES_DE_DADOS } from './perfil.ts'
import type { Armazenamento } from './persistencia.ts'
import {
  criarRepositorioSugestoes,
  NOME_DO_TIPO,
  SUGESTOES_PADRAO,
  sugestoesProntas,
  tipoDaRefeicao,
  TIPOS_REFEICAO,
  type TipoRefeicao,
} from './sugestoes.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'

const CHAVE = 'metanutri:sugestoes-por-refeicao'

function memoria(inicial: Record<string, string> = {}) {
  const dados = new Map(Object.entries(inicial))
  const arm: Armazenamento = {
    getItem: (c) => dados.get(c) ?? null,
    setItem: (c, v) => {
      dados.set(c, v)
    },
    removeItem: (c) => {
      dados.delete(c)
    },
  }
  return { arm, dados }
}

const descrever = (tipo: TipoRefeicao) => SUGESTOES_PADRAO[tipo].map((s) => `${buscarAlimento(s.alimentoId)?.descricao} · ${s.gramas}`)

describe('lista padrão (seção 3.1, D-36)', () => {
  it('traz os alimentos e as porções da spec, na ordem', () => {
    expect(descrever('desjejum')).toEqual([
      'Cuscuz, de milho, cozido com sal · 135',
      'Ovo, de galinha, inteiro, cozido/10minutos · 45',
      'Pão, trigo, francês · 50',
      'Tapioca, com manteiga · 50',
      'Café, infusão 10% · 50',
    ])
    expect(descrever('lanche')).toEqual([
      'Banana, prata, crua · 75',
      'Maçã, Fuji, com casca, crua · 150',
      'Mamão, Papaia, cru · 170',
      'Iogurte, natural · 200',
      'Aveia, flocos, crua · 15',
      'Queijo, minas, frescal · 45',
    ])
    expect(descrever('almoco')).toEqual([
      'Arroz, tipo 1, cozido · 100',
      'Feijão, carioca, cozido · 140',
      'Frango, peito, sem pele, grelhado · 100',
      'Carne, bovina, patinho, sem gordura, grelhado · 100',
      'Alface, crespa, crua · 30',
      'Tomate, com semente, cru · 80',
    ])
    expect(descrever('jantar')).toEqual([
      'Cuscuz, de milho, cozido com sal · 135',
      'Ovo, de galinha, inteiro, cozido/10minutos · 45',
      'Frango, peito, sem pele, grelhado · 100',
      'Arroz, tipo 1, cozido · 100',
      'Feijão, carioca, cozido · 140',
      'Batata, doce, cozida · 70',
    ])
    expect(descrever('ceia')).toEqual(['Iogurte, natural · 200', 'Banana, prata, crua · 75', 'Mamão, Papaia, cru · 170', 'Aveia, flocos, crua · 15'])
  })

  it('D-36: o leite integral fica fora de todas as listas', () => {
    const leite = ALIMENTOS.find((a) => a.descricao === 'Leite, de vaca, integral')
    expect(leite).toBeDefined()
    for (const tipo of TIPOS_REFEICAO) expect(SUGESTOES_PADRAO[tipo].some((s) => s.alimentoId === leite?.id)).toBe(false)
  })

  it('o nome do tipo concorda em gênero', () => {
    expect(NOME_DO_TIPO).toEqual({ desjejum: 'o desjejum', lanche: 'o lanche', almoco: 'o almoço', jantar: 'o jantar', ceia: 'a ceia' })
  })
})

describe('tipoDaRefeicao', () => {
  it.each([
    ['Desjejum', '03:00', 'desjejum'],
    ['Café da manhã', '03:00', 'desjejum'],
    ['CAFÉ DA MANHÃ', '03:00', 'desjejum'],
    ['Lanche da manhã', '03:00', 'lanche'],
    ['Colação', '03:00', 'lanche'],
    ['Almoço', '03:00', 'almoco'],
    ['almoco de domingo', '03:00', 'almoco'],
    ['Jantar', '03:00', 'jantar'],
    ['Janta', '03:00', 'jantar'],
    ['Ceia', '12:00', 'ceia'],
  ] as const)('CA-239: "%s" é reconhecido pelo nome (%s) como %s', (nome, horario, tipo) => {
    expect(tipoDaRefeicao(nome, horario)).toBe(tipo)
  })

  it.each([
    ['04:00', 'desjejum'],
    ['08:59', 'desjejum'],
    ['09:00', 'lanche'],
    ['10:59', 'lanche'],
    ['11:00', 'almoco'],
    ['14:59', 'almoco'],
    ['15:00', 'lanche'],
    ['17:59', 'lanche'],
    ['18:00', 'jantar'],
    ['20:59', 'jantar'],
    ['21:00', 'ceia'],
    ['23:59', 'ceia'],
    ['00:00', 'ceia'],
    ['03:59', 'ceia'],
  ] as const)('CA-240: "Pré-treino" às %s é %s', (horario, tipo) => {
    expect(tipoDaRefeicao('Pré-treino', horario)).toBe(tipo)
  })

  it.each(['', '25:00', '9h'])('Foco de revisão 4: horário ilegível ("%s") conta como almoço', (horario) => {
    expect(tipoDaRefeicao('Pré-treino', horario)).toBe('almoco')
  })
})

describe('repositório das sugestões (CA-243, CA-306, CB-70)', () => {
  it('sem nada guardado, vale a lista padrão', () => {
    expect(criarRepositorioSugestoes(memoria().arm).ler()).toEqual(SUGESTOES_PADRAO)
  })

  it('CA-243: salvar troca só o tipo salvo e fica no aparelho', () => {
    const { arm } = memoria()
    const nova = [{ alimentoId: 561, gramas: 140 }]
    expect(criarRepositorioSugestoes(arm).salvar('almoco', nova)).toBe(true)
    const lidas = criarRepositorioSugestoes(arm).ler()
    expect(lidas.almoco).toEqual(nova)
    expect(lidas.jantar).toEqual(SUGESTOES_PADRAO.jantar)
  })

  it('CA-306: lista vazia continua vazia', () => {
    const { arm } = memoria()
    criarRepositorioSugestoes(arm).salvar('ceia', [])
    expect(criarRepositorioSugestoes(arm).ler().ceia).toEqual([])
  })

  it('salvar a lista padrão guarda "usar a padrão", não uma cópia', () => {
    const { arm, dados } = memoria()
    const repo = criarRepositorioSugestoes(arm)
    repo.salvar('almoco', [{ alimentoId: 561, gramas: 140 }])
    repo.salvar('almoco', SUGESTOES_PADRAO.almoco)
    expect(JSON.parse(dados.get(CHAVE) ?? 'null')).toEqual({})
  })

  it('CB-70: aparelho que não guarda devolve false e não muda nada', () => {
    const { arm } = memoria()
    const cheio: Armazenamento = {
      ...arm,
      setItem: () => {
        throw new DOMException('cheio', 'QuotaExceededError')
      },
    }
    const repo = criarRepositorioSugestoes(cheio)
    expect(repo.salvar('almoco', [])).toBe(false)
    expect(repo.ler().almoco).toEqual(SUGESTOES_PADRAO.almoco)
  })

  it('sem armazenamento, lê a padrão e não salva', () => {
    const repo = criarRepositorioSugestoes(null)
    expect(repo.ler()).toEqual(SUGESTOES_PADRAO)
    expect(repo.salvar('almoco', [])).toBe(false)
  })

  it('Foco de revisão 3: dado estragado no aparelho não quebra nada', () => {
    expect(criarRepositorioSugestoes(memoria({ [CHAVE]: '{não é json' }).arm).ler()).toEqual(SUGESTOES_PADRAO)
    expect(criarRepositorioSugestoes(memoria({ [CHAVE]: '[1,2]' }).arm).ler()).toEqual(SUGESTOES_PADRAO)
    const torto = JSON.stringify({
      almoco: [{ alimentoId: 3, gramas: 100 }, { alimentoId: 'x', gramas: 1 }, { alimentoId: 5, gramas: 0 }, { alimentoId: 7, gramas: -1 }, null],
      lanche: 'oi',
      outro: [],
    })
    const lidas = criarRepositorioSugestoes(memoria({ [CHAVE]: torto }).arm).ler()
    expect(lidas.almoco).toEqual([{ alimentoId: 3, gramas: 100 }])
    expect(lidas.lanche).toEqual(SUGESTOES_PADRAO.lanche)
  })

  it('a chave entra no backup e no apagar dados do aparelho', () => {
    expect(CHAVES_DE_DADOS).toContain(CHAVE)
  })
})

describe('sugestoesProntas (CB-57)', () => {
  it('alimento que não existe mais some, e os outros continuam', () => {
    const prontas = sugestoesProntas([{ alimentoId: 999999, gramas: 100 }, { alimentoId: 3, gramas: 100 }], buscarAlimento)
    expect(prontas.map((p) => p.alimento.descricao)).toEqual(['Arroz, tipo 1, cozido'])
  })
})
