// A medida caseira do rótulo vale (spec alimentos-e-gramaturas, correção A, D-433; G5 da revisão como usuária e
// Importante 3 da revisão de código).
import { buscarAlimentos, leituraDoResultado, medidasDoAlimento, registrarMedidasProprias } from './busca.ts'
import { lerMedidaDaLista, lerMedidaDoRotulo, medidaCaseiraDaLeitura } from './medidaDoRotulo.ts'
import { produtoComoAlimento, type Produto } from './produtos.ts'
import { alimentosComProdutos, registrarProdutos } from './tabelas.ts'

const produto = (dados: Partial<Produto>): Produto => ({
  id: 900_001,
  codigoBarras: '',
  nome: 'Granola',
  marca: '',
  porcaoG: 40,
  medidaCaseira: '4 colheres de sopa',
  porPorcao: { energia_kcal: 170, carboidrato_g: 26, proteina_g: 4, lipideos_g: 5.6 },
  criadoEm: '2026-10-22T10:00:00.000Z',
  ...dados,
})

const medidas = (p: Produto) => produtoComoAlimento(p).medidas ?? []

afterEach(() => {
  registrarProdutos([])
  registrarMedidasProprias([])
})

describe('lerMedidaDoRotulo', () => {
  it('CA-1231: "4 colheres de sopa" com 40 g dá a colher de sopa de 10 g e a porção de 40 g', () => {
    expect(lerMedidaDoRotulo('4 colheres de sopa', 40)).toEqual({ medida: { nome: 'colher de sopa', quantidade: 4, gramas: 10 }, porcaoG: 40 })
    expect(lerMedidaDoRotulo('2 fatias', 50)).toEqual({ medida: { nome: 'fatia', quantidade: 2, gramas: 25 }, porcaoG: 50 })
    expect(lerMedidaDoRotulo('1/2 xícara', 40)).toEqual({ medida: { nome: 'xícara de chá', quantidade: 0.5, gramas: 80 }, porcaoG: 40 })
    expect(lerMedidaDoRotulo('meia xícara (chá)', 40)?.medida).toEqual({ nome: 'xícara de chá', quantidade: 0.5, gramas: 80 })
    expect(lerMedidaDoRotulo('3 colheres', 30)?.medida).toEqual({ nome: 'colher de sopa', quantidade: 3, gramas: 10 })
  })

  it('CA-1232: o peso entre parênteses vale mais que a porção (a leitura da Open Food Facts grava 100)', () => {
    expect(lerMedidaDoRotulo('1 copo (200 ml)', 100)).toEqual({ medida: { nome: 'copo', quantidade: 1, gramas: 200 }, porcaoG: 200 })
    expect(lerMedidaDoRotulo('1 unidade (30 g)', 100)).toEqual({ medida: { nome: 'unidade', quantidade: 1, gramas: 30 }, porcaoG: 30 })
    expect(lerMedidaDoRotulo('30 g', 100)).toEqual({ medida: null, porcaoG: 30 })
    expect(lerMedidaDoRotulo('2 biscoitos (25 g)', 100)?.medida).toEqual({ nome: 'biscoito', quantidade: 2, gramas: 12.5 })
  })

  it('CB-403: sem número é 1; zero, vazio ou sem peso nenhum não dá medida', () => {
    expect(lerMedidaDoRotulo('pote', 170)?.medida).toEqual({ nome: 'pote', quantidade: 1, gramas: 170 })
    expect(lerMedidaDoRotulo('', 40)).toBeNull()
    expect(lerMedidaDoRotulo('0 colher', 40)?.medida ?? null).toBeNull()
    expect(lerMedidaDoRotulo('1 pote', null)).toBeNull()
  })
})

describe('a porção lida na Open Food Facts (Importante 3 da revisão de código)', () => {
  it('CA-1232: o texto sempre leva o peso: "1 unidade (30 g)", "1 porção (30 g)"; o que já tem peso fica', () => {
    expect(medidaCaseiraDaLeitura({ gramas: 30, texto: '1 unidade' }, 'g')).toBe('1 unidade (30 g)')
    expect(medidaCaseiraDaLeitura({ gramas: 30, texto: '' }, 'g')).toBe('1 porção (30 g)')
    expect(medidaCaseiraDaLeitura({ gramas: 200, texto: '1 copo (200 ml)' }, 'ml')).toBe('1 copo (200 ml)')
    expect(medidaCaseiraDaLeitura({ gramas: 25, texto: '25 g' }, 'g')).toBe('25 g')
    expect(medidaCaseiraDaLeitura(null, 'g')).toBe('')
    // Gravado por 100 g, o produto lido fica com a medida do texto, nunca de 100 g.
    const lido = produto({ porcaoG: 100, medidaCaseira: medidaCaseiraDaLeitura({ gramas: 30, texto: '1 unidade' }, 'g') })
    expect(medidas(lido)).toEqual([
      { nome: 'unidade', gramas: 30 },
      { nome: 'porção', gramas: 30 },
    ])
  })
})

describe('o alimento próprio com a medida do rótulo', () => {
  it('CA-1231: granola de 40 g em "4 colheres de sopa" tem "colher de sopa · 10 g" e "porção · 40 g"', () => {
    expect(medidas(produto({}))).toEqual([
      { nome: 'colher de sopa', gramas: 10 },
      { nome: 'porção', gramas: 40 },
    ])
  })

  it('CA-1232: "1 copo (200 ml)" lido por 100 ml dá o copo de 200, nunca de 100; texto sem peso da Open Food Facts não cria medida de 100 g', () => {
    const lido = produto({ porcaoG: 100, medidaCaseira: '1 copo (200 ml)', codigoBarras: '7891000100103' })
    expect(medidas(lido)).toEqual([
      { nome: 'copo', gramas: 200 },
      { nome: 'porção', gramas: 200 },
    ])
    const semPeso = produto({ porcaoG: 100, medidaCaseira: '1 pote', fonte: { tipo: 'open-food-facts', codigo: '789', data: '2026-10-22' } })
    expect(medidas(semPeso)).toEqual([])
    // O rótulo de antes, com a porção de verdade, continua com a medida dele (A11).
    expect(medidas(produto({ porcaoG: 170, medidaCaseira: '1 pote' }))).toEqual([
      { nome: 'pote', gramas: 170 },
      { nome: 'porção', gramas: 170 },
    ])
  })

  it('CA-1233: "granola" sem quantidade entra pela porção do rótulo: "4 colheres de sopa · 40 g", não 100 g', () => {
    registrarProdutos([produtoComoAlimento(produto({}))])
    const r = buscarAlimentos('granola', alimentosComProdutos()).resultados[0]
    expect(r?.alimento.id).toBe(900_001)
    expect(r?.medida).toEqual({ nome: 'colher de sopa', quantidade: 4, gramasPorMedida: 10 })
    expect(r ? leituraDoResultado(r) : null).toBe('4 colheres de sopa · 40 g')
    expect(buscarAlimentos('1 porção de granola', alimentosComProdutos()).resultados[0]?.gramas).toBe(40)
    expect(buscarAlimentos('2 colheres de granola', alimentosComProdutos()).resultados[0]?.gramas).toBe(20)
  })

  it('CA-1234: a medida da conta vale também para o alimento próprio', () => {
    registrarProdutos([produtoComoAlimento(produto({}))])
    registrarMedidasProprias([{ alimentoId: 900_001, nome: 'xícara de chá', gramas: 90 }])
    expect(medidasDoAlimento(900_001)).toEqual([
      { nome: 'xícara de chá', gramas: 90, propria: true },
      { nome: 'colher de sopa', gramas: 10 },
      { nome: 'porção', gramas: 40 },
    ])
  })
})

describe('a medida da lista de Medidas caseiras (D-496)', () => {
  it('CA-1360: "2 fatias" com 50 g é a fatia de 25 g; "1/2 xícara" com 40 g, a xícara de chá de 80 g', () => {
    expect(lerMedidaDaLista('2 fatias', 50)).toEqual({ nome: 'fatia', gramas: 25 })
    expect(lerMedidaDaLista('1/2 xícara', 40)).toEqual({ nome: 'xícara de chá', gramas: 80 })
    expect(lerMedidaDaLista('meia xícara de chá', 40)).toEqual({ nome: 'xícara de chá', gramas: 80 })
    expect(lerMedidaDaLista('3 colheres (sopa)', 30)).toEqual({ nome: 'colher de sopa', gramas: 10 })
  })

  it('o peso entre parênteses sai do nome, e vale o do campo', () => {
    expect(lerMedidaDaLista('2 fatias (60 g)', 50)).toEqual({ nome: 'fatia', gramas: 25 })
    expect(lerMedidaDaLista('fatia (30 g)', 25)).toEqual({ nome: 'fatia', gramas: 25 })
  })

  it('CB-462 e CB-469: o nome sem número fica como foi escrito, menos o plural; "pires" não perde o "s"', () => {
    expect(lerMedidaDaLista('fatia', 25)).toEqual({ nome: 'fatia', gramas: 25 })
    expect(lerMedidaDaLista('  concha da casa ', 120)).toEqual({ nome: 'concha da casa', gramas: 120 })
    expect(lerMedidaDaLista('pires', 50)).toEqual({ nome: 'pires', gramas: 50 })
    expect(lerMedidaDaLista('prato simples', 300)).toEqual({ nome: 'prato simples', gramas: 300 })
    expect(lerMedidaDaLista('2 pires', 60)).toEqual({ nome: 'pires', gramas: 30 })
    expect(lerMedidaDaLista('', 30)).toEqual({ nome: '', gramas: 30 })
  })

  it('CA-1374 (D-508): o nome sem número no plural passa ao singular, com o peso do campo', () => {
    expect(lerMedidaDaLista('fatias', 30)).toEqual({ nome: 'fatia', gramas: 30 })
    expect(lerMedidaDaLista('fatias grossas', 40)).toEqual({ nome: 'fatia grossa', gramas: 40 })
    expect(lerMedidaDaLista('colheres de sopa', 15)).toEqual({ nome: 'colher de sopa', gramas: 15 })
    expect(lerMedidaDaLista('Conchas da casa (120 g)', 120)).toEqual({ nome: 'Concha da casa', gramas: 120 })
    expect(lerMedidaDaLista('porções', 80)).toEqual({ nome: 'porção', gramas: 80 })
    expect(medidas(produto({ medidaCaseira: '', medidas: [{ nome: 'fatias', gramas: 30 }] }))).toEqual([{ nome: 'fatia', gramas: 30 }])
  })

  it('CA-1360: o item gravado com "2 fatias · 50 g" lê "fatia · 25 g"', () => {
    expect(medidas(produto({ medidaCaseira: '', medidas: [{ nome: '2 fatias', gramas: 50 }] }))).toEqual([{ nome: 'fatia', gramas: 25 }])
  })
})
