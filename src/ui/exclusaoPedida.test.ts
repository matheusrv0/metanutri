import { CHAVES_DE_DADOS } from '@/domain/perfil.ts'
import { anotarExclusaoPedida, EXCLUSAO_PEDIDA_VALE_MS, esquecerExclusaoPedida, exclusaoPedidaPor } from './exclusaoPedida.ts'

describe('a anotação de exclusão pedida (spec exclusao-de-conta, CB-250, L6 da revisão)', () => {
  beforeEach(() => localStorage.clear())

  it('anotada para uma conta, vale para ela e não para outra; esquecida, some', () => {
    anotarExclusaoPedida('u1', undefined, 1_000)
    expect(exclusaoPedidaPor('u1', undefined, 2_000)).toBe(true)
    expect(exclusaoPedidaPor('u2', undefined, 2_000)).toBe(false)
    esquecerExclusaoPedida()
    expect(exclusaoPedidaPor('u1', undefined, 2_000)).toBe(false)
  })

  it('vence em 1 dia', () => {
    anotarExclusaoPedida('u1', undefined, 1_000)
    expect(EXCLUSAO_PEDIDA_VALE_MS).toBe(24 * 60 * 60 * 1000)
    expect(exclusaoPedidaPor('u1', undefined, 1_000 + EXCLUSAO_PEDIDA_VALE_MS)).toBe(true)
    expect(exclusaoPedidaPor('u1', undefined, 1_001 + EXCLUSAO_PEDIDA_VALE_MS)).toBe(false)
  })

  it('fica no aparelho, fora dos dados da conta (não vai para a nuvem nem para o backup)', () => {
    anotarExclusaoPedida('u1')
    expect(localStorage.getItem('metanutri:exclusao-pedida')).not.toBeNull()
    expect(CHAVES_DE_DADOS).not.toContain('metanutri:exclusao-pedida')
  })

  it('anotação ilegível não vale, e armazenamento que falha não quebra nada', () => {
    localStorage.setItem('metanutri:exclusao-pedida', 'lixo')
    expect(exclusaoPedidaPor('u1')).toBe(false)
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
    expect(() => anotarExclusaoPedida('u1', quebrado)).not.toThrow()
    expect(exclusaoPedidaPor('u1', quebrado)).toBe(false)
    expect(() => esquecerExclusaoPedida(quebrado)).not.toThrow()
  })
})
