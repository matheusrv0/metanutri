// O botão fixo do celular (spec landing-v3, D-674 e D-688): ele só aparece depois que o "Criar conta grátis" do topo
// sai da tela; escondido, não recebe foco, toque nem leitor de tela.
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { BotaoFixoDoCelular } from './BotaoFixoDoCelular.tsx'

interface Observacao {
  readonly retorno: (entradas: Partial<IntersectionObserverEntry>[]) => void
  readonly opcoes: IntersectionObserverInit | undefined
  observados: Element[]
}

let observacoes: Observacao[] = []

/** Um IntersectionObserver de mentira: guarda quem é observado, e o teste avisa quando o alvo entra ou sai da tela. */
function ligarObservador() {
  observacoes = []
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      private readonly observacao: Observacao
      constructor(retorno: Observacao['retorno'], opcoes?: IntersectionObserverInit) {
        this.observacao = { retorno, opcoes, observados: [] }
        observacoes.push(this.observacao)
      }
      observe(el: Element) {
        this.observacao.observados.push(el)
      }
      unobserve(el: Element) {
        this.observacao.observados = this.observacao.observados.filter((o) => o !== el)
      }
      disconnect() {
        this.observacao.observados = []
      }
    },
  )
}

/** O aviso do navegador: o "Criar conta grátis" do topo está, ou não, na tela. */
const avisar = (naTela: boolean) =>
  act(() => {
    for (const o of observacoes) for (const alvo of o.observados) o.retorno([{ target: alvo, isIntersecting: naTela }])
  })

/** A landing reduzida: o botão do topo (marcado como o do `HeroiDaLanding`) e o fixo. */
const montar = (aoCriarConta = vi.fn()) =>
  render(
    <>
      <button type="button" data-acao-do-topo="">
        Criar conta grátis
      </button>
      <BotaoFixoDoCelular aoCriarConta={aoCriarConta} />
    </>,
  )

const fixo = () => {
  const el = document.querySelector<HTMLElement>('[data-botao-fixo]')
  if (!el) throw new Error('sem o botão fixo')
  return el
}

function esperarEscondido(el: HTMLElement) {
  expect(el).toHaveAttribute('inert')
  expect(el).toHaveAttribute('aria-hidden', 'true')
  expect(el.className).toContain('opacity-0')
  expect(el.className).toContain('pointer-events-none')
  expect(screen.queryByRole('link', { name: 'Criar conta grátis' })).not.toBeInTheDocument()
}

function esperarAVista(el: HTMLElement) {
  expect(el).not.toHaveAttribute('inert')
  expect(el).not.toHaveAttribute('aria-hidden')
  expect(el.className).not.toContain('opacity-0')
  expect(el.className).not.toContain('pointer-events-none')
  expect(screen.getByRole('link', { name: 'Criar conta grátis' })).toBeInTheDocument()
}

afterEach(() => vi.unstubAllGlobals())

describe('BotaoFixoDoCelular (spec landing-v3, D-674 e D-688)', () => {
  describe('com IntersectionObserver', () => {
    beforeEach(ligarObservador)

    it('CA-1696: observa o "Criar conta grátis" do topo, que conta como na tela até 88 px abaixo do pé dela', () => {
      montar()
      expect(observacoes).toHaveLength(1)
      expect(observacoes[0]?.observados).toEqual([screen.getByRole('button', { name: 'Criar conta grátis' })])
      expect(observacoes[0]?.opcoes?.rootMargin).toBe('0px 0px 88px 0px')
    })

    it('CA-1696: com o do topo na tela, o fixo fica escondido: transparente, fora do leitor de tela, sem foco nem toque', () => {
      montar()
      // Antes do primeiro aviso, ele já nasce escondido: no alto da página, o do topo está na tela.
      esperarEscondido(fixo())
      avisar(true)
      esperarEscondido(fixo())
      // O espaço do celular continua: só até 720 px.
      expect(fixo().className).toContain('hidden max-[720px]:flex')
    })

    it('CA-1696 e CA-1697: quando o do topo sai da tela, o fixo aparece e chama Criar conta; com ele de volta, some', async () => {
      const aoCriarConta = vi.fn()
      montar(aoCriarConta)
      avisar(false)
      esperarAVista(fixo())
      await userEvent.setup().click(screen.getByRole('link', { name: 'Criar conta grátis' }))
      expect(aoCriarConta).toHaveBeenCalledOnce()
      avisar(true)
      esperarEscondido(fixo())
    })

    it('CA-1698: entra e sai em 200 ms, ease-out, pela opacidade e por 8 px de subida; com menos movimento, só a opacidade', () => {
      montar()
      const classes = () => fixo().className.split(' ')
      expect(classes()).toEqual(expect.arrayContaining(['transition-[opacity,translate]', 'duration-200', 'ease-out']))
      // Escondido, 8 px abaixo só com movimento; à vista, no lugar.
      expect(classes()).toContain('motion-safe:translate-y-2')
      expect(classes()).not.toContain('translate-y-2')
      avisar(false)
      expect(classes().some((c) => c.includes('translate-y'))).toBe(false)
    })

    it('D-688: sem o botão do topo na página, o fixo fica à vista e nada é observado', () => {
      render(<BotaoFixoDoCelular aoCriarConta={vi.fn()} />)
      esperarAVista(fixo())
      expect(observacoes).toHaveLength(0)
    })

    it('D-688: ao sair da landing, para de observar', () => {
      const { unmount } = montar()
      unmount()
      expect(observacoes[0]?.observados).toEqual([])
    })
  })

  it('CB-651 e D-688: sem IntersectionObserver (navegador antigo), o fixo fica à vista, como era', () => {
    expect(globalThis.IntersectionObserver).toBeUndefined()
    montar()
    esperarAVista(fixo())
  })

  it('CB-652 e D-688: na página pré-desenhada (o build), o fixo nasce escondido e inerte, mesmo sem IntersectionObserver', () => {
    expect(globalThis.IntersectionObserver).toBeUndefined()
    const html = renderToString(<BotaoFixoDoCelular aoCriarConta={vi.fn()} />)
    const caixa = html.slice(0, html.indexOf('>'))
    expect(caixa).toContain('data-botao-fixo=""')
    expect(caixa).toContain('aria-hidden="true"')
    expect(caixa).toContain('inert=""')
    expect(caixa).toContain('opacity-0')
  })
})
