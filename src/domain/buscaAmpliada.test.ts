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

// O "150 macarrão" saiu desta lista: com a base, o macarrão de trigo cozido vem antes do cru (D-716i, abaixo).
describe('CA-1713: a TACO vem antes', () => {
  const ENTRADAS = ['150 arroz', '150 arroz integral', '1 concha de feijão', '100 feijao', '1 banana', '200 leite', '100 frango', '1 filé de frango', '2 ovos', 'meia xícara de aveia', '100 carne', '1 maçã', '2 pães', '1 iogurte', '30 queijo', '100 batata', '100 brócolis', '100 salmão', '60 lentilha', '120 mamão', '100 alface', '1 colher de azeite', '30 castanha', '100 abóbora']

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

describe('D-716i: cereal e leguminosa cozidos antes do cru (achado 8 da revisão)', () => {
  const nomes = (texto: string) => buscar(texto).resultados.map((r) => r.alimento.descricao.trim())

  it('"150 macarrao cozido" traz primeiro o macarrão de trigo, não o soba', () => {
    registrarBaseAmpliada(BASE)
    expect(buscar('150 macarrao cozido').resultados[0]?.alimento.id).toBe(100363)
  })

  it('sem "cru" na busca, o cozido vem antes do cru, mesmo quando só a base ampliada tem o cozido', () => {
    registrarBaseAmpliada(BASE)
    const grao = nomes('100 grao de bico')
    expect(grao[0]).toBe('Grão-de-bico, cozido')
    expect(grao.indexOf('Grão-de-bico, cozido')).toBeLessThan(grao.indexOf('Grão-de-bico, cru'))
    const macarrao = nomes('150 macarrao')
    expect(macarrao[0]).toBe('Macarrão, trigo, cozido')
    expect(macarrao.indexOf('Macarrão, trigo, cozido')).toBeLessThan(macarrao.indexOf('Macarrão, trigo, cru'))
  })

  it('com "cru" na busca, o cru vem primeiro', () => {
    registrarBaseAmpliada(BASE)
    expect(nomes('100 grao de bico cru')[0]).toBe('Grão-de-bico, cru')
    expect(nomes('150 macarrao cru')[0]).toBe('Macarrão, trigo, cru')
  })

  it('o resto da TACO não muda: arroz, feijão e lentilha continuam com o mesmo 1º resultado', () => {
    const antes = ['150 arroz', '100 feijao', '60 lentilha', '150 arroz integral'].map((t) => buscar(t).resultados[0]?.alimento.id)
    registrarBaseAmpliada(BASE)
    expect(['150 arroz', '100 feijao', '60 lentilha', '150 arroz integral'].map((t) => buscar(t).resultados[0]?.alimento.id)).toEqual(antes)
  })
})
