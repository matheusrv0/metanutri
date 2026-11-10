import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AutorizacaoIa } from './AutorizacaoIa.tsx'

describe('A autorização de IA na ficha (spec assistente-ia, CA-2376 e CA-2365)', () => {
  it('a chave "Autorizou o uso de IA" grava com o dia, mostra o dia e desliga revogando', async () => {
    const aoMudar = vi.fn()
    const usuario = userEvent.setup()
    const { rerender } = render(<AutorizacaoIa consentimento={null} hoje="2026-11-03" aoMudar={aoMudar} aoBaixarTermo={vi.fn()} />)
    await usuario.click(screen.getByRole('switch', { name: 'Autorizou o uso de IA' }))
    expect(aoMudar).toHaveBeenLastCalledWith({ em: '2026-11-03', versao: 'ia-1' })
    rerender(<AutorizacaoIa consentimento={{ em: '2026-11-03', versao: 'ia-1' }} hoje="2026-11-05" aoMudar={aoMudar} aoBaixarTermo={vi.fn()} />)
    expect(screen.getByText('Desde 03/11/2026')).toBeInTheDocument()
    await usuario.click(screen.getByRole('switch', { name: 'Autorizou o uso de IA' }))
    expect(aoMudar).toHaveBeenLastCalledWith(null)
  })

  it('o link "Termo de autorização" baixa o termo', async () => {
    const aoBaixarTermo = vi.fn()
    render(<AutorizacaoIa consentimento={null} hoje="2026-11-03" aoMudar={vi.fn()} aoBaixarTermo={aoBaixarTermo} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Termo de autorização' }))
    expect(aoBaixarTermo).toHaveBeenCalled()
    expect(screen.getByText(/Nome, contato e nascimento não vão\./)).toBeInTheDocument()
  })
})
