// "Recuperar meu link" (spec lado-do-paciente, D-1220, CA-2233 e CA-2234).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ClienteDosEmails } from '@/domain/emailsDoLink.ts'
import { TelaRecuperarLink } from './TelaRecuperarLink.tsx'
import { ligarTurnstileFalso } from './turnstileFalso.test-utils.ts'

const RESPOSTA = 'Se este e-mail estiver cadastrado por uma nutricionista, o link chega em instantes.'

function clienteFalso(resposta: 'ok' | 'limite' | 'sem-resposta' = 'ok') {
  const pedidos: Record<string, unknown>[] = []
  const cliente = {
    rpc: () => Promise.resolve({ data: null, error: null }),
    from: () => {
      throw new Error('não usado')
    },
    functions: {
      invoke: (_nome: string, { body }: { readonly body: Record<string, unknown> }) => {
        pedidos.push(body)
        if (resposta === 'sem-resposta') return Promise.reject(new Error('Failed to fetch'))
        if (resposta === 'limite') return Promise.resolve({ data: null, error: { context: new Response('{}', { status: 429 }) } })
        return Promise.resolve({ data: { ok: true }, error: null })
      },
    },
  } as unknown as ClienteDosEmails
  return { cliente, pedidos }
}

afterEach(() => vi.unstubAllEnvs())

describe('CA-2233: "Recuperar meu link"', () => {
  it('CA-2233: o texto, o e-mail e "Enviar o link"; a resposta é a frase única, e a frase do WhatsApp', async () => {
    const { cliente, pedidos } = clienteFalso()
    render(<TelaRecuperarLink aoVoltar={() => undefined} cliente={cliente} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Recuperar meu link' })).toBeInTheDocument()
    expect(screen.getByText('Digite o e-mail que você deu à sua nutricionista.')).toBeInTheDocument()
    expect(screen.getByText('O link também está na mensagem da sua nutricionista no WhatsApp.')).toBeInTheDocument()
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'juliana.martins@gmail.com')
    await usuario.click(screen.getByRole('button', { name: 'Enviar o link' }))
    expect(await screen.findByRole('status')).toHaveTextContent(RESPOSTA)
    expect(pedidos).toEqual([{ acao: 'recuperar', email: 'juliana.martins@gmail.com', turnstile: null }])
  })

  it('CA-2233: a verificação contra robôs vai junto com o pedido', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '1x00000000000000000000AA')
    const turnstile = ligarTurnstileFalso()
    const { cliente, pedidos } = clienteFalso()
    render(<TelaRecuperarLink aoVoltar={() => undefined} cliente={cliente} />)
    await turnstile.pronto()
    expect(turnstile.ativo().opcoes.action).toBe('recuperar-link')
    turnstile.aprovar('token-do-cloudflare')
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'a@b.com.br')
    await usuario.click(screen.getByRole('button', { name: 'Enviar o link' }))
    await screen.findByRole('status')
    expect(pedidos[0]).toMatchObject({ turnstile: 'token-do-cloudflare' })
  })

  it('CA-2234: o quarto pedido na mesma hora (o servidor recusa) recebe a mesma resposta', async () => {
    const { cliente } = clienteFalso('limite')
    render(<TelaRecuperarLink aoVoltar={() => undefined} cliente={cliente} />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'quem@naoexiste.com')
    await usuario.click(screen.getByRole('button', { name: 'Enviar o link' }))
    expect(await screen.findByRole('status')).toHaveTextContent(RESPOSTA)
  })

  it('e-mail sem formato: "Confira o e-mail." e nada sai; sem internet, a frase de não enviou', async () => {
    const semRede = clienteFalso('sem-resposta')
    render(<TelaRecuperarLink aoVoltar={() => undefined} cliente={semRede.cliente} />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'juliana')
    await usuario.click(screen.getByRole('button', { name: 'Enviar o link' }))
    expect(screen.getByText('Confira o e-mail.')).toBeInTheDocument()
    expect(semRede.pedidos).toHaveLength(0)
    await usuario.type(screen.getByLabelText('E-mail'), '@gmail.com')
    await usuario.click(screen.getByRole('button', { name: 'Enviar o link' }))
    expect(await screen.findByText('Não foi possível enviar agora. Tente de novo em alguns minutos.')).toBeInTheDocument()
  })

  it('"Voltar" leva à tela de entrar', async () => {
    const aoVoltar = vi.fn()
    render(<TelaRecuperarLink aoVoltar={aoVoltar} cliente={null} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Voltar' }))
    expect(aoVoltar).toHaveBeenCalled()
  })
})
