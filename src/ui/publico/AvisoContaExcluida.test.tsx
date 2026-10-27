import { render, screen } from '@testing-library/react'
import { contaFoiExcluida, marcarContaExcluida } from '../contaExcluida.ts'
import { AvisoContaExcluida } from './AvisoContaExcluida.tsx'

/** A marca que a exclusão deixou antes de recarregar: anterior à abertura desta página. */
const marcarAntesDaRecarga = () => marcarContaExcluida(undefined, performance.timeOrigin - 1)

describe('AvisoContaExcluida (spec exclusao-de-conta, D-255)', () => {
  beforeEach(() => sessionStorage.clear())

  it('CA-808 (DP-SA-49): depois de excluir, Entrar diz "Sua conta foi excluída." uma vez, sem moldura própria', () => {
    marcarAntesDaRecarga()
    const { unmount } = render(<AvisoContaExcluida />)
    expect(screen.getByRole('status')).toHaveTextContent('Sua conta foi excluída.')
    // Spec separacao-site-app: o aviso fica dentro do formulário de Entrar; a largura da landing saiu com ela.
    expect(document.body.innerHTML).not.toContain('max-w-[1216px]')
    expect(contaFoiExcluida(undefined, Number.POSITIVE_INFINITY)).toBe(false)
    unmount()
    render(<AvisoContaExcluida />)
    expect(screen.queryByText('Sua conta foi excluída.')).not.toBeInTheDocument()
  })

  it('CA-808: na página em que a exclusão acabou de acontecer (antes da recarga), nada aparece e o aviso fica para a próxima', () => {
    marcarContaExcluida()
    const { container } = render(<AvisoContaExcluida />)
    expect(container).toBeEmptyDOMElement()
    expect(contaFoiExcluida(undefined, Number.POSITIVE_INFINITY)).toBe(true)
  })

  it('sem exclusão, nada aparece', () => {
    const { container } = render(<AvisoContaExcluida />)
    expect(container).toBeEmptyDOMElement()
  })

  it('CA-383: só o ícone da marca', () => {
    marcarAntesDaRecarga()
    const { container } = render(<AvisoContaExcluida />)
    expect(container.querySelectorAll('svg:not([data-icone])')).toHaveLength(0)
  })
})
