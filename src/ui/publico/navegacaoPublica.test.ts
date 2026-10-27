// A rolagem até a seção (spec landing-v3, revisão da v9): suave com movimento, na hora com menos movimento.
import { irComAncora, rolarAoTopo, rolarAte } from './navegacaoPublica.ts'

describe('rolarAte', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })

  const secao = () => {
    const el = document.createElement('section')
    el.id = 'planos'
    el.scrollIntoView = vi.fn()
    document.body.append(el)
    return el
  }

  it('com movimento, rola suave até o começo da seção', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const el = secao()
    rolarAte('planos')
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('com menos movimento, vai na hora', () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta.includes('reduce') }))
    const el = secao()
    rolarAte('planos')
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' })
  })

  it('sem a seção, não faz nada', () => {
    expect(() => rolarAte('nao-existe')).not.toThrow()
  })
})

// Spec landing-v3, D-688: a volta ao alto segue a mesma regra.
describe('rolarAoTopo', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('CA-1695: com movimento, rola suave até o alto', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    const rolar = vi.fn()
    vi.stubGlobal('scrollTo', rolar)
    rolarAoTopo()
    expect(rolar).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('CA-1695: com menos movimento, vai ao alto na hora', () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta.includes('reduce') }))
    const rolar = vi.fn()
    vi.stubGlobal('scrollTo', rolar)
    rolarAoTopo()
    expect(rolar).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })

  it('D-688: trocar de tela sem âncora volta ao alto pela mesma regra', () => {
    vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta.includes('reduce') }))
    const rolar = vi.fn()
    vi.stubGlobal('scrollTo', rolar)
    const aoIrPara = vi.fn()
    irComAncora(aoIrPara, 'precos')
    expect(aoIrPara).toHaveBeenCalledWith('precos')
    expect(rolar).toHaveBeenCalledWith({ top: 0, behavior: 'auto' })
  })
})
