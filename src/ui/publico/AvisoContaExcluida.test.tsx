import { render, screen } from '@testing-library/react'
import { contaFoiExcluida, marcarContaExcluida } from '../contaExcluida.ts'
import { AvisoContaExcluida } from './AvisoContaExcluida.tsx'

describe('AvisoContaExcluida (spec exclusao-de-conta, D-255)', () => {
  beforeEach(() => sessionStorage.clear())

  it('CA-808: depois de excluir, a página inicial diz "Sua conta foi excluída." uma vez', () => {
    marcarContaExcluida()
    const { unmount } = render(<AvisoContaExcluida />)
    expect(screen.getByRole('status')).toHaveTextContent('Sua conta foi excluída.')
    expect(contaFoiExcluida()).toBe(false)
    unmount()
    render(<AvisoContaExcluida />)
    expect(screen.queryByText('Sua conta foi excluída.')).not.toBeInTheDocument()
  })

  it('sem exclusão, nada aparece', () => {
    const { container } = render(<AvisoContaExcluida />)
    expect(container).toBeEmptyDOMElement()
  })

  it('CA-383: só o ícone da marca', () => {
    marcarContaExcluida()
    const { container } = render(<AvisoContaExcluida />)
    expect(container.querySelectorAll('svg:not([data-icone])')).toHaveLength(0)
  })
})
