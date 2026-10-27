// CA-1459 e CA-1460 (spec landing-escura, D-545): a barra do topo pinta a cor da seção embaixo dela e sai do caminho.
import { barraSome, tintaDaBarra, type FaixaDoCapitulo } from './barraDoTopo.ts'

const PAGINA: readonly FaixaDoCapitulo[] = [
  { capitulo: 'teal', topo: 0, base: 700 },
  { capitulo: 'afundado', topo: 700, base: 1500 },
  { capitulo: 'chao', topo: 1500, base: 2600 },
  { capitulo: 'marfim', topo: 2600, base: 3000 },
  { capitulo: 'fim', topo: 3000, base: 3500 },
]

describe('tintaDaBarra', () => {
  it.each([
    [34, 'teal'],
    [699, 'teal'],
    [700, 'afundado'],
    [1600, 'chao'],
    [2700, 'teal'],
    [3100, 'escondida'],
  ] as const)('com o meio da barra em %i px, a barra é %s', (meio, tinta) => {
    expect(tintaDaBarra(PAGINA, meio)).toBe(tinta)
  })

  it('sem seção embaixo (antes de a página montar), fica teal, a cor do topo da página', () => {
    expect(tintaDaBarra([], 34)).toBe('teal')
    expect(tintaDaBarra(PAGINA, 9999)).toBe('teal')
  })
})

describe('barraSome', () => {
  it('some ao descer além de 200 px', () => {
    expect(barraSome(400, 300)).toBe(true)
  })

  it('volta ao subir, e fica no alto da página', () => {
    expect(barraSome(300, 400)).toBe(false)
    expect(barraSome(150, 100)).toBe(false)
    expect(barraSome(200, 100)).toBe(false)
  })

  it('parada, não muda de ideia para sumir', () => {
    expect(barraSome(500, 500)).toBe(false)
  })
})
