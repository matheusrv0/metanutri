// O link que não abre mais (spec lado-do-paciente, D-1222, CA-2238 e CB-1204) e o endereço trocado (revisão r1, D-1246,
// CA-2289).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CHAVE_DOS_MEUS_PLANOS, lembrarPlano, lerMeusPlanos } from '@/domain/meusPlanos.ts'
import { LinkTrocado, type FonteAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { armazenamentoLocal } from '../estado/armazenamentoLocal.ts'
import { TelaMissoesPaciente } from './TelaMissoesPaciente.tsx'

const irParaOApp = vi.hoisted(() => vi.fn())
vi.mock('./endereco.ts', async (original) => ({ ...(await original<typeof import('./endereco.ts')>()), irParaOApp }))

const fonte: FonteAcompanhamentos = { naNuvem: true, porToken: () => Promise.resolve(null), salvar: (a) => Promise.resolve(a) }

describe('CA-2238: o link removido', () => {
  it('CA-2238 e CB-1204: "Este link não abre mais", "Recuperar pelo e-mail" e a frase do WhatsApp', async () => {
    render(<TelaMissoesPaciente token="removido0000" fonte={fonte} hoje="2026-11-03" cliente={null} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Este link não abre mais' })).toBeInTheDocument()
    expect(screen.getByText('O link também está na mensagem da sua nutricionista no WhatsApp.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Recuperar pelo e-mail' }))
    expect(irParaOApp).toHaveBeenCalledWith('#/recuperar-link')
  })
})

describe('CA-2289: o endereço trocado', () => {
  afterEach(() => armazenamentoLocal()?.removeItem(CHAVE_DOS_MEUS_PLANOS))

  const trocado: FonteAcompanhamentos = { naNuvem: true, porToken: () => Promise.reject(new LinkTrocado()), salvar: (a) => Promise.resolve(a) }

  it('CA-2289: mostra só "Este link foi trocado." e "Peça o novo a quem cuida do seu plano.", sem "Recuperar pelo e-mail"', async () => {
    render(<TelaMissoesPaciente token="trocado00000" fonte={trocado} hoje="2026-11-03" cliente={null} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Este link foi trocado.' })).toBeInTheDocument()
    expect(screen.getByText('Peça o novo a quem cuida do seu plano.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText(/Recuperar/)).not.toBeInTheDocument()
  })

  it('CA-2289: a lembrança do aparelho daquele endereço sai; a dos outros planos fica', async () => {
    const armazenamento = armazenamentoLocal()
    lembrarPlano(armazenamento, { token: 'outroplano00', primeiroNome: 'Pedro', nutricionista: 'Ana Lima', ultimoAcesso: '2026-11-02' })
    lembrarPlano(armazenamento, { token: 'trocado00000', primeiroNome: 'Juliana', nutricionista: 'Ana Lima', ultimoAcesso: '2026-11-02' })
    render(<TelaMissoesPaciente token="trocado00000" fonte={trocado} hoje="2026-11-03" cliente={null} />)
    await screen.findByRole('heading', { level: 1, name: 'Este link foi trocado.' })
    expect(lerMeusPlanos(armazenamento).map((p) => p.token)).toEqual(['outroplano00'])
  })
})
