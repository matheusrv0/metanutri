// A rolagem até a seção (spec landing-v3, revisão da v9): suave com movimento, na hora com menos movimento.
import { rolarAte } from './navegacaoPublica.ts'

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
