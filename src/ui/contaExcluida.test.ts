import { contaFoiExcluida, esquecerContaExcluida, marcarContaExcluida } from './contaExcluida.ts'

describe('o aviso de conta excluída para a página inicial (spec exclusao-de-conta, D-255)', () => {
  beforeEach(() => sessionStorage.clear())

  it('CA-808: marcado antes de recarregar, a página inicial acha o aviso; esquecido, ele não volta', () => {
    expect(contaFoiExcluida()).toBe(false)
    marcarContaExcluida()
    expect(contaFoiExcluida()).toBe(true)
    esquecerContaExcluida()
    expect(contaFoiExcluida()).toBe(false)
  })

  it('fica no armazenamento da aba, não no do aparelho (não é dado da conta)', () => {
    marcarContaExcluida()
    expect(sessionStorage.getItem('metanutri:conta-excluida')).toBe('1')
    expect(localStorage.getItem('metanutri:conta-excluida')).toBeNull()
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
