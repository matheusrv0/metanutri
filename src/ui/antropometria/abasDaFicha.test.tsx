// As abas da ficha do paciente (spec antropometria-telas, D-1402).
import { screen, within } from '@testing-library/react'
import { TelaPaciente } from '../pacientes/TelaPaciente.tsx'
import { AGORA, montarComDados, RENATA } from './apoioDosTestes.test-utils.tsx'

describe('as abas da ficha (spec antropometria-telas, CA-2404)', () => {
  it('CA-2404: a ficha mostra "Ficha" marcada e "Antropometria" leva à aba nova', async () => {
    const aoAbrir = vi.fn()
    const { usuario } = montarComDados({ pacientes: [RENATA] }, () => (
      <TelaPaciente pacienteId="renata" aoAbrirPlano={vi.fn()} aoNovoPlano={vi.fn()} aoVoltar={vi.fn()} aoAbrirAntropometria={aoAbrir} agora={AGORA} />
    ))
    const abas = within(screen.getByRole('navigation', { name: 'Ficha do paciente' }))
    expect(abas.getByRole('button', { name: 'Ficha' })).toHaveAttribute('aria-current', 'page')
    expect(abas.getByRole('button', { name: 'Antropometria' })).not.toHaveAttribute('aria-current')
    await usuario.click(abas.getByRole('button', { name: 'Antropometria' }))
    expect(aoAbrir).toHaveBeenCalledTimes(1)
  })
})
