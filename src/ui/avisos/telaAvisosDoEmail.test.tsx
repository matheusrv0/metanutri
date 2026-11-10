// As páginas do aceite e do descadastro (spec lado-do-paciente, DP-LP-20, seção 6; CA-2241, CA-2243, CA-2253 a CA-2255).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ClienteDosEmails } from '@/domain/emailsDoLink.ts'
import { TelaAvisosDoEmail } from './TelaAvisosDoEmail.tsx'

const CHAVE = 'Ab3dEf6hIj9kLm2nOp5qRs8tUv1wXy4z'

type Pagina = Record<string, unknown>

/** O servidor de mentira: guarda o estado da chave e responde cada ação como `avisos-resposta`. */
function servidor(inicial: Pagina | 'nao-vale') {
  const acoes: Record<string, unknown>[] = []
  let pagina = inicial
  const responder = (corpo: Record<string, unknown>) => {
    acoes.push(corpo)
    if (pagina === 'nao-vale') return { status: 404, corpo: { erro: 'Este endereço não vale. Abra o botão do e-mail mais recente.' } }
    const atual: Pagina = pagina
    if (corpo['acao'] === 'confirmar') pagina = { ...atual, feito: true, escolhidos: corpo['avisos'] }
    if (corpo['acao'] === 'sair') pagina = { ...atual, feito: true }
    if (corpo['acao'] === 'parar-todos') pagina = { ...atual, feito: true, aviso: 'todos' }
    if (corpo['acao'] === 'desfazer') pagina = { ...atual, feito: false }
    return { status: 200, corpo: pagina }
  }
  const cliente = {
    rpc: () => Promise.resolve({ data: null, error: null }),
    from: () => {
      throw new Error('não usado')
    },
    functions: {
      invoke: (_nome: string, { body }: { readonly body: Record<string, unknown> }) => {
        const r = responder(body)
        return r.status < 300 ? Promise.resolve({ data: r.corpo, error: null }) : Promise.resolve({ data: null, error: { context: new Response(JSON.stringify(r.corpo), { status: r.status }) } })
      },
    },
  } as unknown as ClienteDosEmails
  return { cliente, acoes }
}

const ACEITE: Pagina = { tipo: 'aceite', nutricionista: 'Ana Lima', avisos: ['plano', 'semana', 'lembrete'], escolhidos: ['semana', 'lembrete'], aviso: null, feito: false }
const SAIR_DO_RESUMO: Pagina = { tipo: 'sair', nutricionista: 'Ana Lima', avisos: [], escolhidos: [], aviso: 'semana', feito: false }

describe('CA-2241 e CA-2243: o aceite', () => {
  it('CA-2241: abrir a página não aceita nada: ela só lê a chave e mostra os avisos, com os escolhidos marcados', async () => {
    const { cliente, acoes } = servidor(ACEITE)
    render(<TelaAvisosDoEmail chave={CHAVE} cliente={cliente} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Avisos de Ana Lima por e-mail' })).toBeInTheDocument()
    expect(acoes).toEqual([{ acao: 'ler', chave: CHAVE }])
    const caixas = screen.getAllByRole('checkbox')
    expect(caixas.map((c) => [c.closest('label')?.textContent, (c as HTMLInputElement).checked])).toEqual([
      ['Plano atualizado', false],
      ['Resumo da semana', true],
      ['Lembrete', true],
    ])
  })

  it('CA-2241: só "Confirmar" registra o aceite; depois, "Pronto. Você vai receber: Resumo da semana, Lembrete." e "Abrir meu plano"', async () => {
    const { cliente, acoes } = servidor(ACEITE)
    const aoAbrirPlano = vi.fn()
    render(<TelaAvisosDoEmail chave={CHAVE} cliente={cliente} aoAbrirPlano={aoAbrirPlano} />)
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('button', { name: 'Confirmar' }))
    expect(acoes.at(-1)).toEqual({ acao: 'confirmar', chave: CHAVE, avisos: ['semana', 'lembrete'] })
    expect(await screen.findByRole('status')).toHaveTextContent('Pronto. Você vai receber: Resumo da semana, Lembrete.')
    await usuario.click(screen.getByRole('button', { name: 'Abrir meu plano' }))
    expect(aoAbrirPlano).toHaveBeenCalledWith('Ana Lima')
  })

  it('CA-2243: o paciente marca ou desmarca antes de confirmar; nenhum marcado, "Confirmar" fica desligado', async () => {
    const { cliente, acoes } = servidor(ACEITE)
    render(<TelaAvisosDoEmail chave={CHAVE} cliente={cliente} />)
    const usuario = userEvent.setup()
    await usuario.click(await screen.findByRole('checkbox', { name: 'Plano atualizado' }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Lembrete' }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(acoes.at(-1)).toMatchObject({ avisos: ['plano', 'semana'] })
  })

  it('CA-2243: sem nenhum aviso marcado, "Confirmar" fica desligado', async () => {
    const { cliente } = servidor({ ...ACEITE, escolhidos: [] })
    render(<TelaAvisosDoEmail chave={CHAVE} cliente={cliente} />)
    expect(await screen.findByRole('button', { name: 'Confirmar' })).toBeDisabled()
  })
})

describe('CA-2291: confirmar o e-mail digitado no link (D-1247)', () => {
  const DO_EMAIL: Pagina = { ...ACEITE, escolhidos: ['semana'], emailNovo: 'p•••o@gmail.com' }

  it('CA-2291: "Confirmar o seu e-mail", o endereço mascarado e os avisos marcados; depois, "Pronto. Este e-mail vale no seu plano."', async () => {
    const { cliente, acoes } = servidor(DO_EMAIL)
    render(<TelaAvisosDoEmail chave={CHAVE} cliente={cliente} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Confirmar o seu e-mail' })).toBeInTheDocument()
    expect(screen.getByText('p•••o@gmail.com passa a valer no seu plano com Ana Lima.')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Avisos' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Resumo da semana' })).toBeChecked()
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(acoes.at(-1)).toEqual({ acao: 'confirmar', chave: CHAVE, avisos: ['semana'] })
    expect(await screen.findByRole('status')).toHaveTextContent('Pronto. Este e-mail vale no seu plano. Você vai receber: Resumo da semana.')
  })

  it('CA-2291: sem nenhum aviso marcado, "Confirmar" vale do mesmo jeito', async () => {
    const { cliente, acoes } = servidor({ ...DO_EMAIL, escolhidos: [] })
    render(<TelaAvisosDoEmail chave={CHAVE} cliente={cliente} />)
    const confirmar = await screen.findByRole('button', { name: 'Confirmar' })
    expect(confirmar).toBeEnabled()
    await userEvent.setup().click(confirmar)
    expect(acoes.at(-1)).toEqual({ acao: 'confirmar', chave: CHAVE, avisos: [] })
    expect(await screen.findByRole('status')).toHaveTextContent(/^Pronto\. Este e-mail vale no seu plano\.Abrir meu plano$/)
  })
})

describe('CA-2253 e CA-2254: o descadastro', () => {
  it('CA-2253: abrir não descadastra; o botão descadastra e mostra "Pronto.", "Parar todos" e "Desfazer"', async () => {
    const { cliente, acoes } = servidor(SAIR_DO_RESUMO)
    render(<TelaAvisosDoEmail chave={CHAVE} cliente={cliente} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Não receber mais o resumo da semana?' })).toBeInTheDocument()
    expect(acoes).toEqual([{ acao: 'ler', chave: CHAVE }])
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Não quero mais receber' }))
    expect(acoes.at(-1)).toEqual({ acao: 'sair', chave: CHAVE })
    const pronto = await screen.findByRole('status')
    expect(pronto).toHaveTextContent('Pronto. Você não recebe mais o resumo da semana.')
    expect(within(pronto).getByRole('button', { name: 'Parar todos os e-mails deste plano' })).toBeInTheDocument()
    expect(within(pronto).getByRole('button', { name: 'Desfazer' })).toBeInTheDocument()
  })

  it('CA-2253: "Desfazer" volta como estava, sem novo aceite', async () => {
    const { cliente, acoes } = servidor({ ...SAIR_DO_RESUMO, feito: true })
    render(<TelaAvisosDoEmail chave={CHAVE} cliente={cliente} />)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Desfazer' }))
    expect(acoes.at(-1)).toEqual({ acao: 'desfazer', chave: CHAVE })
    expect(await screen.findByRole('heading', { level: 1, name: 'Não receber mais o resumo da semana?' })).toBeInTheDocument()
  })

  it('CA-2254: "Parar todos os e-mails deste plano" tira os avisos e o S2 daquele link', async () => {
    const { cliente, acoes } = servidor({ ...SAIR_DO_RESUMO, feito: true })
    render(<TelaAvisosDoEmail chave={CHAVE} cliente={cliente} />)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Parar todos os e-mails deste plano' }))
    expect(acoes.at(-1)).toEqual({ acao: 'parar-todos', chave: CHAVE })
    expect(await screen.findByRole('status')).toHaveTextContent('Pronto. Você não recebe mais os e-mails deste plano.')
  })

  it('o descadastro do S2 e o do resumo da adesão (N1) dizem o que sai; sem "Parar todos"', async () => {
    const { cliente } = servidor({ ...SAIR_DO_RESUMO, aviso: 'n1', nutricionista: 'MetaNutri', feito: true })
    render(<TelaAvisosDoEmail chave={CHAVE} cliente={cliente} />)
    expect(await screen.findByText('Pronto. Você não recebe mais o resumo da adesão.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Parar todos/ })).not.toBeInTheDocument()
  })
})

describe('CA-2255: a chave que não vale', () => {
  it('CA-2255: chave alterada à mão: "Este endereço não vale. Abra o botão do e-mail mais recente."', async () => {
    const { cliente } = servidor('nao-vale')
    render(<TelaAvisosDoEmail chave={CHAVE} cliente={cliente} />)
    expect(await screen.findByRole('heading', { level: 1, name: 'Este endereço não vale. Abra o botão do e-mail mais recente.' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
