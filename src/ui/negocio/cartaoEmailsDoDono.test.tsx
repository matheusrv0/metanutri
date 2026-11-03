// "E-mails" no Painel do dono (spec lado-do-paciente, D-1240, CA-2273, CA-2278 e CA-2281).
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ClienteDosEmails } from '@/domain/emailsDoLink.ts'
import { emailsFalsos } from '@/domain/emailsFalsos.test-utils.ts'
import { ContextoClienteDosEmails } from '../estado/usarEmailsDoLink.ts'
import { CartaoEmailsDoDono } from './CartaoEmailsDoDono.tsx'

const PAINEL = { hoje: 12, mes: 340, teto_dia: 70, teto_mes: 2100, adiados_7d: 3, envios_7d: 250, devolucao_7d: 0.4, queixa_7d: 0, pausado_em: null, motivo: null }

function montar(cliente: ClienteDosEmails | null) {
  render(
    <ContextoClienteDosEmails.Provider value={cliente}>
      <CartaoEmailsDoDono />
    </ContextoClienteDosEmails.Provider>,
  )
  return within(screen.getByRole('region', { name: 'E-mails' }))
}

describe('CA-2281: os e-mails no Painel do dono', () => {
  it('CA-2281: enviados hoje (de 70) e no mês (de 2.100), adiados, devolução, queixa e o estado', async () => {
    const { cliente } = emailsFalsos({ rpc: { painel_emails: PAINEL } })
    const c = montar(cliente)
    expect(await c.findByText('Enviando')).toBeInTheDocument()
    expect(c.getByText('Enviados hoje').parentElement).toHaveTextContent('12 de 70')
    expect(c.getByText('No mês').parentElement).toHaveTextContent('340 de 2.100')
    expect(c.getByText('Adiados pelo teto em 7 dias').parentElement).toHaveTextContent('3')
    expect(c.getByText('Devolução em 7 dias').parentElement).toHaveTextContent('0,4%')
    expect(c.getByText('Queixa em 7 dias').parentElement).toHaveTextContent('0%')
    expect(c.queryByRole('button', { name: 'Retomar' })).not.toBeInTheDocument()
  })

  it('CA-2278: na pausa automática, "Pausado: devolução 2,4%" com "Retomar"', async () => {
    const { cliente, chamadas } = emailsFalsos({ rpc: { painel_emails: { ...PAINEL, devolucao_7d: 2.4, pausado_em: '2026-11-03T12:00:00Z', motivo: 'devolução 2,4%' } } })
    const c = montar(cliente)
    expect(await c.findByText('Pausado: devolução 2,4%')).toBeInTheDocument()
    await userEvent.setup().click(c.getByRole('button', { name: 'Retomar' }))
    await waitFor(() => expect(chamadas.some((x) => x.nome === 'retomar_avisos')).toBe(true))
  })

  it('CA-2273: com 1.900 no mês, "Avisos pausados: cota do mês"', async () => {
    const { cliente } = emailsFalsos({ rpc: { painel_emails: { ...PAINEL, mes: 1900 } } })
    const c = montar(cliente)
    expect(await c.findByText('Avisos pausados: cota do mês')).toBeInTheDocument()
  })

  it('sem servidor, o cartão diz "Indisponível no momento."', async () => {
    const c = montar(null)
    expect(await c.findByText('Indisponível no momento.')).toBeInTheDocument()
  })
})
