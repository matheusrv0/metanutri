// Spec base-ampliada, fase 2: o catálogo de rótulos no app (D-756 a D-758 e D-760; CA-1755 a CA-1758, CB-753 a CB-755).
import { produtoDosDados } from './alimentoProprio.ts'
import {
  alimentoProvisorio,
  buscarNoCatalogo,
  copiaExistente,
  dadosDaCopia,
  decodificarFatia,
  decodificarIndice,
  ehProvisorio,
  fatiaDoCodigo,
  rotuloDoCatalogo,
  type ArquivoFatia,
  type ArquivoIndice,
} from './catalogoOff.ts'
import { produtoComoAlimento, type Produto } from './produtos.ts'

const INDICE: ArquivoIndice = {
  versao: '2026-10-29',
  campos: ['codigo', 'nome', 'marca', 'porcaoG', 'porcaoTexto', 'ml', 'kcal'],
  produtos: [
    ['7891000100103', 'Iogurte Natural Integral', 'Nestlé', 170, '1 pote (170 g)', 0, 60],
    ['7891000244111', 'Requeijão Cremoso', 'Nestlé', 30, '2 colheres de sopa (30 g)', 0, 250],
    ['7896004000015', 'Iogurte Grego Morango', 'Vigor', 100, '1 pote (100 g)', 0, 110],
    ['7894900011517', 'Refrigerante de Cola', 'Coca-Cola', 200, '1 copo (200 ml)', 1, 42],
    ['7891000055502', 'Biscoito Integral', 'Marca X', null, '', 0, 430],
    ['7891000055519', 'Biscoito Integral', 'Marca Y', 30, '6 biscoitos (30 g)', 0, 420],
  ],
}
const CHAVES = ['energia_kcal', 'proteina_g', 'lipideos_g', 'carboidrato_g', 'calcio_mg', 'sodio_mg']
const FATIA: ArquivoFatia = { chaves: CHAVES, produtos: { '7891000100103': [60, 4, 3, 5, 120, null] } }

const indice = decodificarIndice(INDICE)
const nomes = (texto: string) => buscarNoCatalogo(indice, texto).map((p) => `${p.nome} · ${p.marca}`)

describe('D-758 e CA-1755: a busca no catálogo', () => {
  it('sem acento, por palavras em qualquer ordem, com a quantidade de fora', () => {
    expect(nomes('170 iogurte natural')).toEqual(['Iogurte Natural Integral · Nestlé'])
    expect(nomes('requeijao')).toEqual(['Requeijão Cremoso · Nestlé'])
    expect(nomes('natural iogurte')).toEqual(['Iogurte Natural Integral · Nestlé'])
  })

  it('tolera uma letra errada em palavra de 5 letras ou mais; a marca também conta', () => {
    expect(nomes('requeijao cremozo')).toEqual(['Requeijão Cremoso · Nestlé'])
    expect(nomes('iogurte vigor')).toEqual(['Iogurte Grego Morango · Vigor'])
  })

  it('o que começa pela primeira palavra vem antes; até 5', () => {
    expect(nomes('iogurte')).toEqual(['Iogurte Grego Morango · Vigor', 'Iogurte Natural Integral · Nestlé'])
    expect(buscarNoCatalogo(indice, 'i')).toEqual([])
  })

  it('CB-753: com menos de 3 letras, o catálogo não é consultado', () => {
    expect(buscarNoCatalogo(indice, 'io')).toEqual([])
    expect(buscarNoCatalogo(indice, '2 io')).toEqual([])
  })

  it('CB-754: o nome repetido em marcas diferentes aparece nas duas', () => {
    expect(nomes('biscoito integral')).toEqual(['Biscoito Integral · Marca X', 'Biscoito Integral · Marca Y'])
  })
})

describe('D-760: o alimento provisório da lista', () => {
  it('tem id da faixa provisória, a porção do rótulo e a unidade; nunca é id de alimento próprio', () => {
    const [cola] = buscarNoCatalogo(indice, 'refrigerante cola')
    if (!cola) throw new Error('sem cola')
    const a = alimentoProvisorio(cola, 3)
    expect(ehProvisorio(a.id)).toBe(true)
    expect(a.id).toBeGreaterThanOrEqual(800_000_000)
    expect(a.unidade).toBe('ml')
    expect(a.porcaoPadrao).toEqual({ nome: 'porção', quantidade: 1, gramasPorMedida: 200 })
    expect(ehProvisorio(900_001)).toBe(false)
  })
})

describe('D-756, D-757 e CA-1756: a cópia em Meus alimentos', () => {
  const [iogurte] = buscarNoCatalogo(indice, 'iogurte natural')
  if (!iogurte) throw new Error('sem iogurte')
  const valores = decodificarFatia(FATIA).get('7891000100103')
  const rotulo = rotuloDoCatalogo(iogurte, valores ?? {}, '2026-10-29')

  it('a fatia é a dos dois últimos dígitos; o valor ausente fica nulo', () => {
    expect(fatiaDoCodigo('7891000100103')).toBe('03')
    expect(valores?.sodio_mg).toBeNull()
    expect(valores?.calcio_mg).toBe(120)
  })

  it('a cópia é um rótulo por 100 g, com fonte, código, versão, a porção como medida e o Cobrir desligado', () => {
    const d = dadosDaCopia(rotulo)
    expect(d).toMatchObject({
      tipo: 'rotulo',
      nome: 'Iogurte Natural Integral',
      marca: 'Nestlé',
      codigoBarras: '7891000100103',
      unidade: 'g',
      base: 'por100',
      porcaoG: 100,
      fonte: { tipo: 'open-food-facts', codigo: '7891000100103', data: '2026-10-29' },
      sugerirAutomaticamente: false,
    })
    expect(d.medidas).toEqual([{ nome: 'porção', gramas: 170 }])
    expect(d.valores.proteina_g).toBe(4)
    expect(d.valores.sodio_mg).toBeNull()
    expect(rotulo.fonte).toBe('catálogo de rótulos do Open Food Facts (versão 2026-10-29)')
  })

  it('CA-1757: a cópia que a conta já tem é achada pelo código; CA-1758: a cópia guarda os números, não a referência', () => {
    const salvo: Produto = { ...produtoDosDados(dadosDaCopia(rotulo)), id: 900_123, criadoEm: '2026-10-29T10:00:00Z' } as Produto
    expect(copiaExistente([salvo], '7891000100103')?.id).toBe(900_123)
    expect(copiaExistente([salvo], '7891000244111')).toBeUndefined()
    const alimento = produtoComoAlimento(salvo)
    expect(alimento.nutrientes.proteina_g).toBe(4)
    expect(alimento.proprio?.sugerir).toBe(false)
  })

  it('CB-755: o produto em ml vira cópia em ml', () => {
    const [cola] = buscarNoCatalogo(indice, 'refrigerante')
    if (!cola) throw new Error('sem cola')
    expect(dadosDaCopia(rotuloDoCatalogo(cola, {}, '2026-10-29')).unidade).toBe('ml')
  })
})
