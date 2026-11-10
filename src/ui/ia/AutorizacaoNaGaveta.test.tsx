import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AutorizacaoNaGaveta } from './AutorizacaoNaGaveta.tsx'

describe('AutorizacaoNaGaveta (spec assistente-ia, D-1304)', () => {
  it('CA-2365: desligada, a chave liga; ligada, mostra "Desde DD/MM/AAAA" e desligar revoga', async () => {
    const aoMudar = vi.fn()
    const usuario = userEvent.setup()
    const { rerender } = render(<AutorizacaoNaGaveta desde={null} aoMudar={aoMudar} aoBaixarTermo={vi.fn()} />)
    const chave = screen.getByRole('switch', { name: 'Paciente autorizou o uso de IA' })
    expect(chave).not.toBeChecked()
    await usuario.click(chave)
    expect(aoMudar).toHaveBeenLastCalledWith(true)
    rerender(<AutorizacaoNaGaveta desde="2026-11-03" aoMudar={aoMudar} aoBaixarTermo={vi.fn()} />)
    expect(screen.getByText('Desde 03/11/2026')).toBeInTheDocument()
    await usuario.click(screen.getByRole('switch'))
    expect(aoMudar).toHaveBeenLastCalledWith(false)
  })

  it('D-1304: a linha do que vai e do que não vai, e o termo', async () => {
    const aoBaixarTermo = vi.fn()
    render(<AutorizacaoNaGaveta desde={null} aoMudar={vi.fn()} aoBaixarTermo={aoBaixarTermo} />)
    expect(screen.getByText(/Vão idade, sexo, medidas, saúde, restrições e rotina\. Nome, contato e nascimento não vão\./)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Termo de autorização' }))
    expect(aoBaixarTermo).toHaveBeenCalled()
  })
})
