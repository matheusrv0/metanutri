import { contaFoiExcluida, esquecerContaExcluida, marcarContaExcluida } from './contaExcluida.ts'

describe('o aviso de conta excluída para a página inicial (spec exclusao-de-conta, D-255)', () => {
  beforeEach(() => sessionStorage.clear())

  it('CA-808: marcado antes de recarregar, a página aberta depois acha o aviso; esquecido, ele não volta', () => {
    expect(contaFoiExcluida()).toBe(false)
    marcarContaExcluida(undefined, 1_000)
    expect(contaFoiExcluida(undefined, 2_000)).toBe(true)
    esquecerContaExcluida()
    expect(contaFoiExcluida(undefined, 2_000)).toBe(false)
  })

  it('CA-808: a página em que a exclusão aconteceu (aberta antes da marca) não mostra nem gasta o aviso: ele é da página que abre depois da recarga', () => {
    marcarContaExcluida(undefined, 5_000)
    expect(contaFoiExcluida(undefined, 4_000)).toBe(false)
    expect(sessionStorage.getItem('metanutri:conta-excluida')).toBe('5000')
  })

  it('a abertura padrão é a desta página: marcado agora, só a próxima página vê', () => {
    marcarContaExcluida()
    expect(contaFoiExcluida()).toBe(false)
    expect(contaFoiExcluida(undefined, Date.now() + 1)).toBe(true)
  })

  it('fica no armazenamento da aba, não no do aparelho (não é dado da conta)', () => {
    marcarContaExcluida(undefined, 1_000)
    expect(sessionStorage.getItem('metanutri:conta-excluida')).toBe('1000')
    expect(localStorage.getItem('metanutri:conta-excluida')).toBeNull()
  })

  it('marca que não é número não vale', () => {
    sessionStorage.setItem('metanutri:conta-excluida', 'sim')
    expect(contaFoiExcluida(undefined, Date.now())).toBe(false)
  })

  it('armazenamento que falha (navegador sem armazenamento, modo privado) não quebra nada', () => {
    const quebrado = {
      getItem: () => {
        throw new Error('sem armazenamento')
      },
      setItem: () => {
        throw new Error('sem armazenamento')
      },
      removeItem: () => {
        throw new Error('sem armazenamento')
      },
    }
    expect(() => marcarContaExcluida(quebrado)).not.toThrow()
    expect(contaFoiExcluida(quebrado)).toBe(false)
    expect(() => esquecerContaExcluida(quebrado)).not.toThrow()
    expect(contaFoiExcluida(null)).toBe(false)
  })
})
