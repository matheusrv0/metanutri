import type { AssinaturaDoPlano } from './assinaturaDoPlano.ts'
import { criarCasoVazio } from './caso.ts'
import {
  assinaturaDaFolha,
  comprasDaFolha,
  gravarOpcoesImpressao,
  lerOpcoesImpressao,
  linhaDaAguaNaFolha,
  linhaFinaDaFolha,
  OPCOES_IMPRESSAO_PADRAO,
  opcoesDaRefeicao,
  TROCAS_NA_FOLHA,
  TROCAS_PEDIDAS_PELA_FOLHA,
  trocasDaFolha,
} from './folhaDieta.ts'
import { duplicarCaso } from './duplicar.ts'
import { criarExemplo } from './exemplo.ts'
import { CHAVES_DE_DADOS } from './perfil.ts'
import type { Armazenamento } from './persistencia.ts'
import { adicionarItem, criarPlanoPadrao } from './plano.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'
import type { Caso, ItemPlano, Refeicao } from './tipos.ts'
import { trocasDoPlano, type GrupoDeTrocas, type Troca } from './trocas.ts'

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

describe('a água na folha (spec conduta-da-nutricionista, D-298; spec ficha-unica, D-355)', () => {
  const mulher = { sexo: 'F', idadeAnos: 28 } as const
  it('CA-1082: sem edição, a linha automática pela fase de vida (parte em bebidas), sem depender do peso', () => {
    expect(linhaDaAguaNaFolha(caso({ ...mulher, pesoKg: 62 }))).toBe('Beba cerca de 2,2 litros de água por dia.')
    expect(linhaDaAguaNaFolha(caso({ ...mulher, pesoKg: null }))).toBe('Beba cerca de 2,2 litros de água por dia.')
    expect(linhaDaAguaNaFolha(caso({ sexo: 'F', idadeAnos: 6 }))).toBe('Beba cerca de 1,2 litro de água por dia.')
    expect(linhaDaAguaNaFolha(caso({ ...mulher, condicao: { tipo: 'gestante', semanasGestacao: 24, pesoPreGestacionalKg: 60 } }))).toBe(
      'Beba cerca de 2,3 litros de água por dia.',
    )
  })

  it('CA-932: o que a nutricionista escreveu vale; vazio tira a linha', () => {
    expect(linhaDaAguaNaFolha(caso({ ...mulher, linhaDaAgua: '  Beba 2 litros de água por dia, mais no calor.  ' }))).toBe('Beba 2 litros de água por dia, mais no calor.')
    expect(linhaDaAguaNaFolha(caso({ ...mulher, linhaDaAgua: '' }))).toBeNull()
    expect(linhaDaAguaNaFolha(caso({ ...mulher, linhaDaAgua: '   ' }))).toBeNull()
  })

  it('CA-1083: sem sexo ou sem idade e sem edição, não há linha; a escrita à mão vale sempre (CA-1084)', () => {
    expect(linhaDaAguaNaFolha(caso({ sexo: null, idadeAnos: 28 }))).toBeNull()
    expect(linhaDaAguaNaFolha(caso({ sexo: 'F', idadeAnos: null }))).toBeNull()
    expect(linhaDaAguaNaFolha(caso({ sexo: null, idadeAnos: null, linhaDaAgua: 'Beba água ao longo do dia.' }))).toBe('Beba água ao longo do dia.')
  })

  it('CB-290: plano gravado antes, sem o campo, ou com valor estranho, usa a automática', () => {
    const antigo: Pick<Caso, 'sexo' | 'idadeAnos' | 'condicao'> = { sexo: 'F', idadeAnos: 28, condicao: { tipo: 'nenhuma' } }
    expect(linhaDaAguaNaFolha(antigo)).toBe('Beba cerca de 2,2 litros de água por dia.')
    expect(linhaDaAguaNaFolha({ ...antigo, linhaDaAgua: 42 } as unknown as Caso)).toBe('Beba cerca de 2,2 litros de água por dia.')
  })

  it('CB-299: plano duplicado leva a escolha de quantidade e a linha da água', () => {
    let n = 0
    const ids = () => `d${++n}`
    const original = { caso: caso({ quantidades: 'gramas', linhaDaAgua: 'Beba 3 litros.' }), plano: criarPlanoPadrao(ids) }
    const copia = duplicarCaso(original, ids, { hoje: '2026-10-20' }).caso
    expect(copia.quantidades).toBe('gramas')
    expect(copia.linhaDaAgua).toBe('Beba 3 litros.')
  })
})

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

  it('CB-188 (revisão final da integração): mostra no máximo 2, contadas depois do corte por nome', () => {
    const PAMONHA = 47
    const grupos = [grupo(ARROZ_1, [troca(ARROZ_2), troca(POLENTA), troca(PAMONHA), troca(FEIJAO_PRETO)])]
    expect(trocasDaFolha(grupos, buscarAlimento)[0]?.trocas.map((t) => t.alimentoId)).toEqual([POLENTA, PAMONHA])
    expect(TROCAS_NA_FOLHA).toBe(2)
    expect(TROCAS_PEDIDAS_PELA_FOLHA).toBeGreaterThan(TROCAS_NA_FOLHA)
  })

  it('CB-188: no plano de exemplo, o arroz branco não fica com uma troca só', () => {
    let n = 0
    const { plano } = criarExemplo(() => `t${++n}`, '2026-10-15')
    const grupos = trocasDoPlano(plano, buscarAlimento, { alimentos: ALIMENTOS, porAlimento: TROCAS_PEDIDAS_PELA_FOLHA, restricoes: [] })
    const folha = trocasDaFolha(grupos, buscarAlimento)
    for (const g of folha) expect(g.trocas.length, g.nome).toBeLessThanOrEqual(TROCAS_NA_FOLHA)
    expect(folha.find((g) => g.nome === 'Arroz branco cozido')?.trocas).toHaveLength(2)
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

describe('Produto apagado fica fora da folha do paciente (spec revisao-geral-trabalho, D-248, CA-789)', () => {
  const APAGADO = 900_001
  let k = 0
  const ids = () => `apagado${++k}`

  it('a refeição e a lista de compras deixam o item de fora, inteiro', () => {
    let plano = criarPlanoPadrao(ids)
    const almoco = plano.refeicoes[2]
    const lanche = plano.refeicoes[3]
    if (!almoco || !lanche) throw new Error('plano padrão mudou')
    plano = adicionarItem(plano, almoco.id, 'principal', { alimentoId: 3, gramas: 150 }, ids)
    plano = adicionarItem(plano, almoco.id, 'principal', { alimentoId: APAGADO, gramas: 40 }, ids)
    plano = adicionarItem(plano, lanche.id, 'principal', { alimentoId: APAGADO, gramas: 40 }, ids)
    const almocoNaFolha = opcoesDaRefeicao(plano.refeicoes[2] as Refeicao)
    expect(almocoNaFolha.flat().map((i) => i.alimentoId)).toEqual([3])
    // Refeição só com o item apagado: fica sem opção, e a folha diz "Sem alimentos nesta refeição.".
    expect(opcoesDaRefeicao(plano.refeicoes[3] as Refeicao)).toEqual([])
    expect(comprasDaFolha(plano, buscarAlimento).map((c) => c.alimentoId)).toEqual([3])
  })
})
