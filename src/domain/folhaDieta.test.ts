import type { AssinaturaDoPlano } from './assinaturaDoPlano.ts'
import { criarCasoVazio } from './caso.ts'
import {
  assinaturaDaFolha,
  comprasDaFolha,
  gravarOpcoesImpressao,
  lerOpcoesImpressao,
  linhaFinaDaFolha,
  OPCOES_IMPRESSAO_PADRAO,
  opcoesDaRefeicao,
  trocasDaFolha,
} from './folhaDieta.ts'
import { CHAVES_DE_DADOS } from './perfil.ts'
import type { Armazenamento } from './persistencia.ts'
import { adicionarItem, criarPlanoPadrao } from './plano.ts'
import { buscarAlimento } from './tabelas.ts'
import type { Caso, ItemPlano, Refeicao } from './tipos.ts'
import type { GrupoDeTrocas, Troca } from './trocas.ts'

const ANA: AssinaturaDoPlano = { situacao: 'nutricionista', linhaNutricionista: 'Ana Souza · CRN-6 12345', origem: 'conta', nome: 'Ana Souza', responsavelTecnico: '' }
const JULIA: AssinaturaDoPlano = { situacao: 'estudante', linhaNutricionista: null, origem: 'conta', nome: 'Júlia Martins', responsavelTecnico: 'Carla Mendes' }
const caso = (p: Partial<Caso> = {}): Caso => ({ ...criarCasoVazio('c1'), nome: 'Maria, 28 anos', ...p })

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
  return arm
}

describe('assinaturaDaFolha (CA-313)', () => {
  it('nutricionista assina com a linha do cadastro', () => {
    expect(assinaturaDaFolha(ANA, caso())).toEqual({ tipo: 'nutricionista', linha: 'Ana Souza · CRN-6 12345' })
  })

  it('nutricionista sem nome e CRN ainda assina como nutricionista, com a linha vazia', () => {
    expect(assinaturaDaFolha({ ...ANA, linhaNutricionista: null }, caso())).toEqual({ tipo: 'nutricionista', linha: '' })
  })

  it('plano antigo de nutricionista com estagiário sai como estágio (CB-51)', () => {
    expect(assinaturaDaFolha(ANA, caso({ estagiario: 'Júlia Martins' }))).toEqual({ tipo: 'estagio', estagiario: 'Júlia Martins', preceptor: '' })
  })

  it('estudante sai com estagiário e preceptor do plano', () => {
    expect(assinaturaDaFolha(JULIA, caso({ estagiario: ' Júlia Martins ', preceptor: 'Carla Mendes' }))).toEqual({
      tipo: 'estagio',
      estagiario: 'Júlia Martins',
      preceptor: 'Carla Mendes',
    })
  })

  it('sem ninguém, a folha fica sem nome', () => {
    expect(assinaturaDaFolha(null, caso())).toEqual({ tipo: 'vazia' })
    expect(assinaturaDaFolha(JULIA, caso())).toEqual({ tipo: 'vazia' })
  })
})

describe('comprasDaFolha (spec impressao-do-plano, CA-628 e CB-181)', () => {
  const ARROZ_TIPO_1 = 3
  const ARROZ_TIPO_2 = 5
  const PAO_FRANCES = 53
  const BANANA = 182

  it('soma a principal pelo nome para o paciente, em ordem alfabética, e deixa os substitutos de fora', () => {
    let n = 0
    const ids = () => `i${++n}`
    let plano = criarPlanoPadrao(ids)
    const [desjejum, , almoco, , jantar] = plano.refeicoes
    if (!desjejum || !almoco || !jantar) throw new Error('plano padrão mudou')
    plano = adicionarItem(plano, desjejum.id, 'principal', { alimentoId: PAO_FRANCES, gramas: 50 }, ids)
    plano = adicionarItem(plano, almoco.id, 'principal', { alimentoId: ARROZ_TIPO_1, gramas: 150 }, ids)
    plano = adicionarItem(plano, jantar.id, 'principal', { alimentoId: ARROZ_TIPO_2, gramas: 100 }, ids)
    plano = adicionarItem(plano, almoco.id, 'substituto1', { alimentoId: BANANA, gramas: 80 }, ids)
    plano = adicionarItem(plano, jantar.id, 'principal', { alimentoId: PAO_FRANCES, gramas: 0 }, ids)
    expect(comprasDaFolha(plano, buscarAlimento)).toEqual([
      { nome: 'Arroz branco cozido', gramas: 250, alimentoId: ARROZ_TIPO_1 },
      { nome: 'Pão francês', gramas: 50, alimentoId: PAO_FRANCES },
    ])
  })
})

describe('trocasDaFolha (spec impressao-do-plano, CB-188)', () => {
  const troca = (alimentoId: number, gramas = 100): Troca => ({ alimentoId, descricao: '', gramas, medida: null })
  const grupo = (alimentoId: number, trocas: Troca[]): GrupoDeTrocas => ({ alimentoId, descricao: '', gramas: 100, medida: null, categoria: '', trocas })
  const ARROZ_1 = 3
  const ARROZ_2 = 5
  const POLENTA = 62
  const MARGARINA_HIDROGENADA = 263
  const MARGARINA_INTERESTERIFICADA = 265
  const FEIJAO_PRETO = 567

  it('não troca uma coisa por ela mesma, nem repete troca ou alimento do plano pelo nome', () => {
    const grupos = [
      grupo(ARROZ_1, [troca(ARROZ_2), troca(POLENTA), troca(POLENTA, 90)]),
      grupo(ARROZ_2, [troca(FEIJAO_PRETO)]),
      grupo(MARGARINA_HIDROGENADA, [troca(MARGARINA_INTERESTERIFICADA)]),
    ]
    expect(trocasDaFolha(grupos, buscarAlimento)).toEqual([
      { alimentoId: ARROZ_1, nome: 'Arroz branco cozido', trocas: [{ ...troca(POLENTA), nome: 'Polenta pré-cozida' }] },
    ])
  })
})

describe('opcoesDaRefeicao (spec impressao-do-plano, CA-631 e CA-632)', () => {
  const item = (id: string, gramas: number): ItemPlano => ({ id, alimentoId: 3, gramas })
  const refeicao = (opcoes: Refeicao['opcoes']): Refeicao => ({ id: 'r1', nome: 'Almoço', horario: '12:00', opcoes })

  it('a principal e os substitutos que têm alimento, nessa ordem', () => {
    const r = refeicao({ principal: [item('a', 100)], substituto1: [], substituto2: [item('b', 50), item('c', 0)] })
    expect(opcoesDaRefeicao(r).map((itens) => itens.map((i) => i.id))).toEqual([['a'], ['b']])
  })

  it('refeição só com substituto começa por ele; refeição vazia não tem opção', () => {
    expect(opcoesDaRefeicao(refeicao({ principal: [item('a', 0)], substituto1: [item('b', 30)], substituto2: [] })).map((itens) => itens.map((i) => i.id))).toEqual([['b']])
    expect(opcoesDaRefeicao(refeicao({ principal: [], substituto1: [], substituto2: [] }))).toEqual([])
  })
})

describe('linhaFinaDaFolha (CA-316)', () => {
  it('leva o nome do plano e quem assina', () => {
    expect(linhaFinaDaFolha(caso(), { tipo: 'nutricionista', linha: 'Ana Souza · CRN-6 12345' })).toEqual({
      esquerda: 'Plano alimentar · Maria, 28 anos',
      direita: 'Ana Souza · CRN-6 12345',
    })
    expect(linhaFinaDaFolha(caso({ nome: '  ' }), { tipo: 'estagio', estagiario: 'Júlia', preceptor: 'Carla' })).toEqual({
      esquerda: 'Plano alimentar · Sem nome',
      direita: 'Júlia · Carla',
    })
    expect(linhaFinaDaFolha(caso(), { tipo: 'vazia' }).direita).toBe('')
  })
})

describe('opções de impressão (CA-317, CA-320, CB-72)', () => {
  it('começa desmarcada', () => {
    expect(OPCOES_IMPRESSAO_PADRAO).toEqual({ listaDeCompras: false, trocas: false })
    expect(lerOpcoesImpressao(memoria())).toEqual(OPCOES_IMPRESSAO_PADRAO)
  })

  it('lembra o que foi marcado', () => {
    const arm = memoria()
    expect(gravarOpcoesImpressao(arm, { listaDeCompras: true, trocas: false })).toBe(true)
    expect(lerOpcoesImpressao(arm)).toEqual({ listaDeCompras: true, trocas: false })
  })

  it('Foco de revisão 4: dado estragado volta ao padrão', () => {
    expect(lerOpcoesImpressao(memoria({ 'metanutri:impressao': '{não é json' }))).toEqual(OPCOES_IMPRESSAO_PADRAO)
    expect(lerOpcoesImpressao(memoria({ 'metanutri:impressao': '{"listaDeCompras":"sim","trocas":1}' }))).toEqual(OPCOES_IMPRESSAO_PADRAO)
    expect(lerOpcoesImpressao(memoria({ 'metanutri:impressao': '[true]' }))).toEqual(OPCOES_IMPRESSAO_PADRAO)
  })

  it('CB-72: sem armazenamento, vale só para esta impressão', () => {
    expect(lerOpcoesImpressao(null)).toEqual(OPCOES_IMPRESSAO_PADRAO)
    expect(gravarOpcoesImpressao(null, { listaDeCompras: true, trocas: true })).toBe(false)
    const cheio: Armazenamento = {
      ...memoria(),
      setItem: () => {
        throw new DOMException('cheio', 'QuotaExceededError')
      },
    }
    expect(gravarOpcoesImpressao(cheio, { listaDeCompras: true, trocas: true })).toBe(false)
  })

  it('a chave entra no backup e no apagar dados do aparelho', () => {
    expect(CHAVES_DE_DADOS).toContain('metanutri:impressao')
  })
})
