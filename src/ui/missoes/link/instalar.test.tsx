// "Instalar o Meu plano" no link (spec lado-do-paciente, D-1219, DP-LP-22, CA-2229 a CA-2232, CB-1220 e CB-1226).
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { FonteAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { TelaMissoesPaciente } from '../TelaMissoesPaciente.tsx'
import { linkDeTeste } from './linkDeTeste.test-utils.tsx'
import { guardarPedidoDeInstalacao, prepararPedidoParaTeste } from './pedidoDeInstalacao.ts'

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const INSTAGRAM = `${IPHONE} Instagram 350.0.0.0`

const usarAgente = (agente: string) => Object.defineProperty(globalThis.navigator, 'userAgent', { value: agente, configurable: true })

const fonte: FonteAcompanhamentos = { naNuvem: false, porToken: () => Promise.resolve(linkDeTeste()), salvar: (a) => Promise.resolve(a) }

function pedidoFalso(resposta: 'accepted' | 'dismissed') {
  const evento = new Event('beforeinstallprompt') as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
  evento.prompt = vi.fn(() => Promise.resolve())
  evento.userChoice = Promise.resolve({ outcome: resposta })
  return evento
}

const abrir = async (hoje = '2026-11-03') => {
  const tela = render(<TelaMissoesPaciente token={linkDeTeste().token} fonte={fonte} hoje={hoje} cliente={null} />)
  await screen.findByRole('heading', { level: 1 })
  return tela
}

const marcarUma = async () => userEvent.setup().click(screen.getByRole('button', { name: /litros de água/ }))

beforeEach(() => {
  localStorage.clear()
  prepararPedidoParaTeste(null)
  usarAgente(ANDROID)
})

describe('CA-2232: quando o cartão aparece', () => {
  it('CA-2232: na primeira abertura, não aparece; depois da primeira marcação, aparece', async () => {
    prepararPedidoParaTeste(pedidoFalso('accepted'))
    await abrir()
    expect(screen.queryByRole('region', { name: 'Instalar o Meu plano' })).not.toBeInTheDocument()
    await marcarUma()
    const cartao = screen.getByRole('region', { name: 'Instalar o Meu plano' })
    expect(cartao).toHaveTextContent('Um ícone na tela inicial abre o seu plano.')
    expect(within(cartao).getByRole('button', { name: 'Instalar' })).toBeInTheDocument()
  })

  it('CA-2232: a partir do segundo dia de uso, aparece sem marcação', async () => {
    prepararPedidoParaTeste(pedidoFalso('accepted'))
    const { unmount } = await abrir('2026-11-03')
    unmount()
    await abrir('2026-11-04')
    expect(screen.getByRole('region', { name: 'Instalar o Meu plano' })).toBeInTheDocument()
  })

  it('CA-2232: "Agora não" esconde o cartão', async () => {
    prepararPedidoParaTeste(pedidoFalso('accepted'))
    await abrir()
    await marcarUma()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Agora não' }))
    expect(screen.queryByRole('region', { name: 'Instalar o Meu plano' })).not.toBeInTheDocument()
  })

  it('CA-2232: no app instalado, nunca', async () => {
    prepararPedidoParaTeste(pedidoFalso('accepted'))
    vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta.includes('standalone'), addEventListener: () => undefined, removeEventListener: () => undefined }))
    await abrir('2026-11-10')
    await marcarUma()
    expect(screen.queryByRole('region', { name: 'Instalar o Meu plano' })).not.toBeInTheDocument()
    vi.unstubAllGlobals()
  })
})

describe('CA-2229 e CB-1220: o pedido do Chrome no Android', () => {
  it('CA-2229: "Instalar" abre o pedido do navegador; instalado, o cartão some e não volta', async () => {
    const pedido = pedidoFalso('accepted')
    prepararPedidoParaTeste(pedido)
    const { unmount } = await abrir()
    await marcarUma()
    await act(async () => {
      await userEvent.setup().click(screen.getByRole('button', { name: 'Instalar' }))
    })
    expect(pedido.prompt).toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'Instalar o Meu plano' })).not.toBeInTheDocument()
    unmount()

    prepararPedidoParaTeste(pedidoFalso('accepted'))
    await abrir('2026-12-01')
    expect(screen.queryByRole('region', { name: 'Instalar o Meu plano' })).not.toBeInTheDocument()
  })

  it('CA-2229: o aviso de instalação do navegador (pelo menu dele) também tira o cartão para sempre', async () => {
    const alvo = new EventTarget()
    guardarPedidoDeInstalacao(alvo as unknown as Window)
    const { unmount } = await abrir('2026-11-03')
    unmount()
    alvo.dispatchEvent(pedidoFalso('accepted'))
    await abrir('2026-11-10')
    expect(screen.getByRole('region', { name: 'Instalar o Meu plano' })).toBeInTheDocument()
    act(() => {
      alvo.dispatchEvent(new Event('appinstalled'))
    })
    expect(screen.queryByRole('region', { name: 'Instalar o Meu plano' })).not.toBeInTheDocument()
  })

  it('CB-1220: o pedido recusado conta como "Agora não": o cartão sai', async () => {
    prepararPedidoParaTeste(pedidoFalso('dismissed'))
    await abrir()
    await marcarUma()
    await act(async () => {
      await userEvent.setup().click(screen.getByRole('button', { name: 'Instalar' }))
    })
    expect(screen.queryByRole('region', { name: 'Instalar o Meu plano' })).not.toBeInTheDocument()
  })

  it('CB-1219: sem o pedido do navegador (computador, Android sem Chrome), o cartão não aparece', async () => {
    await abrir('2026-11-10')
    await marcarUma()
    expect(screen.queryByRole('region', { name: 'Instalar o Meu plano' })).not.toBeInTheDocument()
  })
})

describe('CA-2230 e CA-2231: o iPhone e o navegador de dentro do app', () => {
  it('CA-2230: no Safari do iPhone, "Instalar" abre a folha com os três passos, o nome "Meu plano" e o ícone', async () => {
    usarAgente(IPHONE)
    await abrir()
    await marcarUma()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Instalar' }))
    const folha = screen.getByRole('dialog', { name: 'Instalar o Meu plano' })
    expect(folha).toHaveTextContent('No iPhone, pelo Safari.')
    expect(within(folha).getAllByRole('listitem').map((li) => li.querySelector('p')?.textContent)).toEqual([
      'Toque em ⋯ na barra do Safari (ou em Compartilhar).',
      'Toque em Adicionar à Tela de Início.',
      'Confira o nome Meu plano e toque em Adicionar.',
    ])
    expect(folha.querySelector('img[src="/meu-plano-512.png"]')).not.toBeNull()
    await userEvent.setup().click(within(folha).getByRole('button', { name: 'Entendi' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('CA-2231: aberto dentro do WhatsApp ou do Instagram, o primeiro passo é "Abrir no navegador"', async () => {
    usarAgente(INSTAGRAM)
    await abrir()
    await marcarUma()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Instalar' }))
    const passos = within(screen.getByRole('dialog', { name: 'Instalar o Meu plano' })).getAllByRole('listitem')
    expect(passos[0]?.querySelector('p')?.textContent).toBe('Toque em ⋯ e em Abrir no navegador.')
    expect(passos[0]).toHaveTextContent('Abrir no navegador')
    expect(passos).toHaveLength(4)
  })
})
