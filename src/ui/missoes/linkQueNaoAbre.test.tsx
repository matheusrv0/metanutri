// O link que não abre mais (spec lado-do-paciente, D-1222, CA-2238 e CB-1204).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FonteAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { TelaMissoesPaciente } from './TelaMissoesPaciente.tsx'

const irParaOApp = vi.hoisted(() => vi.fn())
vi.mock('./endereco.ts', async (original) => ({ ...(await original<typeof import('./endereco.ts')>()), irParaOApp }))

const fonte: FonteAcompanhamentos = { naNuvem: true, porToken: () => Promise.resolve(null), salvar: (a) => Promise.resolve(a) }

describe('CA-2238: o link removido ou de endereço trocado', () => {
  it('CA-2238 e CB-1204: "Este link não abre mais", "Recuperar pelo e-mail" e a frase do WhatsApp', async () => {
    render(<TelaMissoesPaciente token="trocado00000" fonte={fonte} hoje="2026-11-03" cliente={null} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Este link não abre mais' })).toBeInTheDocument()
    expect(screen.getByText('O link também está na mensagem da sua nutricionista no WhatsApp.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Recuperar pelo e-mail' }))
    expect(irParaOApp).toHaveBeenCalledWith('#/recuperar-link')
  })
})
