// Escolha: a lista do navegador com o rótulo (spec antropometria-telas, D-1404, D-1439).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Escolha } from './Escolha.tsx'

const OPCOES = [
  { valor: 'aferidas', rotulo: 'Aferidos na consulta' },
  { valor: 'informadas', rotulo: 'Informados pela paciente' },
  { valor: 'estimadas', rotulo: 'Estimados', desativada: true },
] as const

describe('Escolha (spec antropometria-telas, D-1404)', () => {
  it('liga o rótulo à lista, escolhe pelo valor e não deixa escolher a desativada', async () => {
    const aoEscolher = vi.fn()
    render(<Escolha rotulo="Origem do peso e da estatura" opcoes={OPCOES} valor="aferidas" aoEscolher={aoEscolher} />)
    const lista = screen.getByRole('combobox', { name: 'Origem do peso e da estatura' })
    expect(lista).toHaveValue('aferidas')
    await userEvent.setup().selectOptions(lista, 'informadas')
    expect(aoEscolher).toHaveBeenCalledWith('informadas')
    expect(screen.getByRole('option', { name: 'Estimados' })).toBeDisabled()
  })

  it('valor nulo mostra o texto do vazio, que não se escolhe de novo', () => {
    render(<Escolha rotulo="Origem" opcoes={OPCOES} valor={null} vazio="Origem não informada" aoEscolher={() => undefined} />)
    const lista = screen.getByRole('combobox', { name: 'Origem' })
    expect(lista).toHaveDisplayValue('Origem não informada')
    expect(screen.getByRole('option', { name: 'Origem não informada' })).toBeDisabled()
  })

  it('rótulo oculto continua dando nome à lista; 44 px no toque também no compacto', () => {
    render(<Escolha rotulo="Modalidade" rotuloOculto compacto opcoes={OPCOES} valor="aferidas" aoEscolher={() => undefined} />)
    expect(screen.getByText('Modalidade')).toHaveClass('sr-only')
    const lista = screen.getByRole('combobox', { name: 'Modalidade' })
    expect(lista).toHaveClass('h-11', 'sm:h-8', 'sm:pointer-coarse:h-11')
  })
})
