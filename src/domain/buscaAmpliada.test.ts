// Spec base-ampliada, CA-1712 a CA-1714, CB-706, CB-711 e CB-712: a busca com a base ampliada registrada.
import arquivo from '../data/base-ampliada.json'
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from './baseAmpliada.ts'
import { buscarAlimentos, leituraDoResultado, medidasDoAlimento, registrarMedidasProprias } from './busca.ts'
import { filtrarCatalogo } from './catalogo.ts'
import { alimentosComProdutos, registrarBaseAmpliada } from './tabelas.ts'

const BASE = decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada)
const TILAPIA = 100044
const daAmpliada = (id: number) => id >= 100_001 && id <= 199_999

/** O que a entrada rápida mostra: o 1º resultado (o Enter) e a lista. */
const buscar = (texto: string, uso?: ReadonlyMap<number, number>) => buscarAlimentos(texto, alimentosComProdutos(), uso ? { uso } : {})

afterEach(() => {
  registrarBaseAmpliada([])
  registrarMedidasProprias([])
})

describe('CA-1712: a tilápia na entrada rápida', () => {
  it('"150 tilápia" põe a tilápia grelhada com 150 g; "1 filé de tilápia", 1 filé de 87 g', () => {
    registrarBaseAmpliada(BASE)
    const [primeiro] = buscar('150 tilápia').resultados
    expect(primeiro?.alimento.id).toBe(TILAPIA)
    expect(primeiro?.gramas).toBe(150)
    const [file] = buscar('1 filé de tilápia').resultados
    expect(file?.alimento.id).toBe(TILAPIA)
    expect(file ? leituraDoResultado(file) : null).toBe('1 filé · 87 g')
  })

  it('sem a base registrada, "tilápia" não acha nada (a busca de antes)', () => {
    expect(buscar('150 tilápia').resultados).toEqual([])
  })
})

describe('CA-1713: a TACO vem antes', () => {
  const ENTRADAS = ['150 arroz', '150 arroz integral', '1 concha de feijão', '100 feijao', '1 banana', '200 leite', '100 frango', '1 filé de frango', '2 ovos', 'meia xícara de aveia', '100 carne', '1 maçã', '2 pães', '1 iogurte', '30 queijo', '100 batata', '100 brócolis', '150 macarrão', '100 salmão', '60 lentilha', '120 mamão', '100 alface', '1 colher de azeite', '30 castanha', '100 abóbora']

  it.each(ENTRADAS)('"%s" tem o mesmo 1º resultado com e sem a base ampliada', (texto) => {
    const antes = buscar(texto).resultados[0]?.alimento.id
    registrarBaseAmpliada(BASE)
    const depois = buscar(texto).resultados
    expect(depois[0]?.alimento.id).toBe(antes)
    // Nenhum da base ampliada antes de um da TACO (sem uso da conta).
    const primeiraAmpliada = depois.findIndex((r) => daAmpliada(r.alimento.id))
    if (primeiraAmpliada >= 0) expect(depois.slice(primeiraAmpliada).every((r) => daAmpliada(r.alimento.id))).toBe(true)
  })

  it('na Tabela de alimentos, "queijo" mostra os da TACO antes dos novos', () => {
    registrarBaseAmpliada(BASE)
    const lista = filtrarCatalogo({ termo: 'queijo' }, alimentosComProdutos())
    const primeiraAmpliada = lista.findIndex((a) => daAmpliada(a.id))
    expect(primeiraAmpliada).toBeGreaterThan(0)
    expect(lista.slice(primeiraAmpliada).every((a) => daAmpliada(a.id))).toBe(true)
  })
})

describe('CA-1714: o uso da conta vence a origem', () => {
  it('uma conta que usa muito o cottage vê o cottage primeiro em "queijo"', () => {
    registrarBaseAmpliada(BASE)
    const cottage = BASE.find((a) => a.descricao === 'Queijo, cottage')
    expect(cottage).toBeDefined()
    const uso = new Map([[cottage?.id ?? 0, 6]])
    expect(buscar('queijo', uso).resultados[0]?.alimento.id).toBe(cottage?.id)
  })
})

describe('casos de borda', () => {
  it('CB-706: a medida da conta vale num alimento da base ampliada e vem primeiro', () => {
    registrarBaseAmpliada(BASE)
    registrarMedidasProprias([{ alimentoId: TILAPIA, nome: 'posta', gramas: 120 }])
    expect(medidasDoAlimento(TILAPIA)).toEqual([
      { nome: 'posta', gramas: 120, propria: true },
      { nome: 'filé', gramas: 87 },
    ])
    expect(buscar('1 posta de tilápia').resultados[0]?.gramas).toBe(120)
  })

  it('CB-711: o kefir se mede em ml', () => {
    registrarBaseAmpliada(BASE)
    const [kefir] = buscar('200 kefir').resultados
    expect(kefir?.alimento.descricao).toBe('Kefir, natural, semidesnatado')
    expect(kefir?.unidade).toBe('ml')
  })

  it('CB-712: uma letra não acha nada, sem erro', () => {
    registrarBaseAmpliada(BASE)
    expect(buscar('t').resultados).toEqual([])
  })
})
