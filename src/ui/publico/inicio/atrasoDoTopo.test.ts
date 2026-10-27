// CA-1657 (spec landing-v3, D-655): quando o app troca o desenho da página pré-desenhada pelo dele, o movimento do topo
// continua do ponto em que estava; aberta pelo app, a landing começa o movimento do zero.
import { atrasoDoTopo, tempoJaAnimado } from './atrasoDoTopo.ts'

describe('tempoJaAnimado', () => {
  it('CA-1657: aberta pelo app, nada foi animado ainda', () => {
    expect(tempoJaAnimado({ veioPeloApp: true, agora: 5000, primeiroDesenho: 300 })).toBe(0)
  })

  it('CA-1657: sobre a página pré-desenhada, o tempo desde o primeiro desenho', () => {
    expect(tempoJaAnimado({ veioPeloApp: false, agora: 1300, primeiroDesenho: 300 })).toBe(1000)
  })

  it('sem o registro do primeiro desenho, conta desde o começo da página', () => {
    expect(tempoJaAnimado({ veioPeloApp: false, agora: 800, primeiroDesenho: null })).toBe(800)
  })

  it('nunca é negativo (relógio fora de ordem)', () => {
    expect(tempoJaAnimado({ veioPeloApp: false, agora: 100, primeiroDesenho: 300 })).toBe(0)
  })
})

describe('atrasoDoTopo', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('aberta pelo app (sem a vitrine no HTML), a foto e a etiqueta começam do zero', () => {
    expect(atrasoDoTopo()).toBe(0)
  })

  it('sobre a vitrine, o tempo desde a primeira pintura', () => {
    document.body.innerHTML = '<div data-vitrine=""></div>'
    vi.spyOn(performance, 'now').mockReturnValue(1500)
    vi.spyOn(performance, 'getEntriesByName').mockReturnValue([{ startTime: 400 } as PerformanceEntry])
    expect(atrasoDoTopo()).toBe(1100)
  })
})
