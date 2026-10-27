import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CONTATO_EMAIL } from '@/domain/legal.ts'
import { marcarContaExcluida } from '@/ui/contaExcluida.ts'
import { CHAVE_TEMA } from '@/ui/tema/contextoTema.ts'
import { AvisoContaExcluida } from '../AvisoContaExcluida.tsx'
import { MolduraDaLanding } from './MolduraDaLanding.tsx'
import { RodapeDaLanding } from './RodapeDaLanding.tsx'
import { CHAVE_TEMA_DA_LANDING } from './temaDaLanding.ts'

const montar = (temSessao = false, aoIrPara = vi.fn()) =>
  render(
    <MolduraDaLanding temSessao={temSessao} aoIrPara={aoIrPara}>
      <section data-surge="">
        <h1>topo</h1>
      </section>
      <section data-surge="" id="funcionalidades">
        <h2>funções</h2>
      </section>
      <section data-surge="" id="como-funciona">
        <h2>meio</h2>
      </section>
      <section data-surge="" id="planos">
        <h2>planos</h2>
      </section>
    </MolduraDaLanding>,
  )

const barra = () => screen.getByRole('banner')

function rolarPara(y: number) {
  act(() => {
    Object.defineProperty(globalThis, 'scrollY', { configurable: true, value: y })
    globalThis.dispatchEvent(new Event('scroll'))
  })
}

afterEach(() => {
  Object.defineProperty(globalThis, 'scrollY', { configurable: true, value: 0 })
  localStorage.clear()
  document.documentElement.removeAttribute('data-tema-da-landing')
  document.documentElement.className = ''
})

const raizDaLanding = () => {
  const raiz = screen.getByRole('main').parentElement
  if (!raiz) throw new Error('sem a raiz da landing')
  return raiz
}
const botaoDeTema = () => within(barra()).getByRole('button', { name: /^Usar o tema (claro|escuro)$/ })

describe('MolduraDaLanding (spec landing-escura)', () => {
  it('CA-1450, CA-1611 e CB-544: a raiz é escura por padrão, em qualquer tema do app, e a classe não vai para o <html>', () => {
    montar()
    const raiz = screen.getByRole('main').parentElement
    expect(raiz?.className).toMatch(/^landing dark /)
    expect(raiz?.className).toContain('bg-landing-chao')
    expect(document.documentElement.classList.contains('landing')).toBe(false)
  })

  it('CA-1650: sem sessão, a barra tem a logo, Funcionalidades, Como funciona, Planos, o tema, Entrar e Criar conta grátis; no celular, os três primeiros saem', async () => {
    const aoIrPara = vi.fn()
    montar(false, aoIrPara)
    const nav = within(barra()).getByRole('navigation', { name: 'Principal' })
    const nomes = [...nav.querySelectorAll('a, button')].map((el) => el.getAttribute('aria-label') ?? el.textContent)
    expect(nomes).toEqual(['Funcionalidades', 'Como funciona', 'Planos', 'Usar o tema claro', 'Entrar', 'Criar conta grátis'])
    const menu = within(nav)
    for (const nome of ['Funcionalidades', 'Como funciona', 'Planos']) expect(menu.getByRole('link', { name: nome }).className).toContain('max-[720px]:hidden')
    expect(menu.getByRole('link', { name: 'Entrar' }).className).not.toContain('max-[720px]:hidden')
    expect(menu.getByText('grátis', { exact: false }).className).toContain('max-[720px]:hidden')
    expect(within(barra()).getByRole('link', { name: 'MetaNutri, início' })).toBeInTheDocument()

    const usuario = userEvent.setup()
    await usuario.click(menu.getByRole('link', { name: 'Entrar' }))
    expect(aoIrPara).toHaveBeenCalledWith('entrar')
    await usuario.click(menu.getByRole('link', { name: 'Criar conta grátis' }))
    expect(aoIrPara).toHaveBeenCalledWith('criar-conta')
    for (const [nome, id] of [
      ['Funcionalidades', 'funcionalidades'],
      ['Como funciona', 'como-funciona'],
      ['Planos', 'planos'],
    ] as const) {
      const alvo = document.getElementById(id)
      if (!alvo) throw new Error(`sem a seção ${id}`)
      alvo.scrollIntoView = vi.fn()
      await usuario.click(menu.getByRole('link', { name: nome }))
      expect(alvo.scrollIntoView, nome).toHaveBeenCalledOnce()
    }
  })

  it('CA-1458, CB-540 e CA-1650: com sessão, só "Ir para o painel"', async () => {
    const aoIrPara = vi.fn()
    montar(true, aoIrPara)
    const menu = within(within(barra()).getByRole('navigation', { name: 'Principal' }))
    expect(menu.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
    expect(menu.queryByRole('link', { name: /Criar conta/ })).not.toBeInTheDocument()
    await userEvent.setup().click(menu.getByRole('link', { name: 'Ir para o painel' }))
    expect(aoIrPara).toHaveBeenCalledWith('painel')
  })

  it('CA-1651: a barra é de vidro e fica presa no alto, em qualquer ponto da página (não pinta a seção nem sai ao descer)', () => {
    montar()
    for (const y of [0, 400, 1200, 300, 5000]) {
      rolarPara(y)
      expect(barra().className).toMatch(/\bsticky\b/)
      expect(barra().className).toContain('top-0')
      expect(barra().className).toContain('bg-landing-vidro')
      expect(barra().className).toContain('backdrop-blur-[18px]')
      expect(barra().className).not.toContain('-translate-y-full')
      expect(barra()).not.toHaveAttribute('data-tinta')
    }
  })

  it('CA-1461: o rodapé tem a frase, Voltar ao topo, Fale com a gente e os quatro links, com endereço', async () => {
    const aoIrPara = vi.fn()
    montar(false, aoIrPara)
    const rodape = within(screen.getByRole('contentinfo'))
    expect(rodape.getByText('MetaNutri: software para nutricionistas.')).toBeInTheDocument()
    expect(rodape.getByText(`Brasil, ${new Date().getFullYear()}`)).toBeInTheDocument()
    expect(rodape.getByRole('link', { name: 'Fale com a gente' })).toHaveAttribute('href', `mailto:${CONTATO_EMAIL ?? ''}`)
    const links = within(rodape.getByRole('navigation', { name: 'Rodapé' })).getAllByRole('link')
    expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
      ['Preços', 'precos/'],
      ['Termos de uso', 'termos/'],
      ['Política de privacidade', 'privacidade/'],
      ['Referências', 'fontes/'],
    ])
    for (const link of [...links, rodape.getByRole('link', { name: 'Voltar ao topo' })]) expect(link.className).toContain('min-h-11')
    // CA-1028: clique comum troca de tela pelo app; Ctrl+clique segue o endereço.
    const referencias = rodape.getByRole('link', { name: 'Referências' })
    expect(fireEvent.click(referencias)).toBe(false)
    expect(aoIrPara).toHaveBeenCalledWith('fontes')
    aoIrPara.mockClear()
    expect(fireEvent.click(referencias, { ctrlKey: true })).toBe(true)
    expect(aoIrPara).not.toHaveBeenCalled()
  })

  it('CA-1461: "Voltar ao topo" rola até o alto e leva o foco para a logo da barra', async () => {
    montar()
    const rolar = vi.fn()
    vi.stubGlobal('scrollTo', rolar)
    await userEvent.setup().click(within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Voltar ao topo' }))
    expect(rolar).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(within(barra()).getByRole('link', { name: 'MetaNutri, início' })).toHaveFocus()
    vi.unstubAllGlobals()
  })

  it('CB-542: sem e-mail de contato, o "Fale com a gente" não aparece', () => {
    render(<RodapeDaLanding aoIrPara={vi.fn()} contato={null} />)
    expect(screen.queryByRole('link', { name: 'Fale com a gente' })).not.toBeInTheDocument()
    expect(document.body.innerHTML).not.toContain('mailto:')
  })

  describe('tema claro e escuro (spec landing-v3)', () => {
    it('CA-1610 e CA-1650: o botão de tema fica entre Planos e Entrar, também no celular, com 44 px; com sessão, antes de Ir para o painel', () => {
      const { unmount } = montar()
      const nomes = (nav: HTMLElement) => [...nav.querySelectorAll('a, button')].map((el) => el.getAttribute('aria-label') ?? el.textContent)
      const menu = within(barra()).getByRole('navigation', { name: 'Principal' })
      expect(nomes(menu)).toEqual(['Funcionalidades', 'Como funciona', 'Planos', 'Usar o tema claro', 'Entrar', 'Criar conta grátis'])
      expect(botaoDeTema()).toHaveAttribute('title', 'Usar o tema claro')
      expect(botaoDeTema().className).not.toContain('hidden')
      expect(botaoDeTema().className).toContain('size-11')
      unmount()
      montar(true)
      expect(nomes(within(barra()).getByRole('navigation', { name: 'Principal' }))).toEqual([
        'Funcionalidades',
        'Como funciona',
        'Planos',
        'Usar o tema claro',
        'Ir para o painel',
      ])
    })

    it('CA-1611: sem escolha guardada, a landing abre escura, com a lua no botão', () => {
      montar()
      expect(raizDaLanding().className).toMatch(/^landing dark /)
      expect(raizDaLanding().className).not.toContain('landing-clara')
      // A lua aparece no escuro; o sol, só dentro da landing clara (pelo CSS, para valer também no primeiro desenho).
      expect(botaoDeTema().querySelector('.lucide-moon')?.getAttribute('class')).toContain('landing-clara:hidden')
      expect(botaoDeTema().querySelector('.lucide-sun')?.getAttribute('class')).toContain('hidden landing-clara:block')
    })

    it('CA-1612: o botão troca para o claro e volta, por clique, Enter e Espaço, sem perder o foco', async () => {
      montar()
      const usuario = userEvent.setup()
      await usuario.click(botaoDeTema())
      expect(raizDaLanding().className).toMatch(/^landing landing-clara tema-claro /)
      expect(raizDaLanding().className.split(' ')).not.toContain('dark')
      expect(botaoDeTema()).toHaveAccessibleName('Usar o tema escuro')
      expect(botaoDeTema()).toHaveAttribute('title', 'Usar o tema escuro')
      expect(botaoDeTema()).toHaveFocus()
      await usuario.keyboard('{Enter}')
      expect(raizDaLanding().className).toMatch(/^landing dark /)
      expect(botaoDeTema()).toHaveFocus()
      await usuario.keyboard(' ')
      expect(raizDaLanding().className).toContain('landing-clara')
    })

    it('CA-1613: a escolha fica na chave da landing, a landing reabre clara, e o tema do app não muda', async () => {
      localStorage.setItem(CHAVE_TEMA, 'escuro')
      document.documentElement.classList.add('dark')
      const { unmount } = montar()
      await userEvent.setup().click(botaoDeTema())
      expect(localStorage.getItem(CHAVE_TEMA_DA_LANDING)).toBe('claro')
      expect(localStorage.getItem(CHAVE_TEMA)).toBe('escuro')
      expect(document.documentElement.className).toBe('dark')
      // D-613: a marca do <html> acompanha, para o CSS da página pré-desenhada não contradizer o app.
      expect(document.documentElement).toHaveAttribute('data-tema-da-landing', 'claro')
      unmount()
      montar()
      expect(raizDaLanding().className).toContain('landing-clara')
      await userEvent.setup().click(botaoDeTema())
      expect(localStorage.getItem(CHAVE_TEMA_DA_LANDING)).toBe('escuro')
      expect(document.documentElement).not.toHaveAttribute('data-tema-da-landing')
    })

    it('CA-1614 e CB-600: sem armazenamento, abre escura e o botão troca o tema mesmo assim', async () => {
      const ler = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('bloqueado')
      })
      const escrever = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('bloqueado')
      })
      montar()
      expect(raizDaLanding().className).toMatch(/^landing dark /)
      await userEvent.setup().click(botaoDeTema())
      expect(raizDaLanding().className).toContain('landing-clara')
      ler.mockRestore()
      escrever.mockRestore()
    })

    it('D-614: durante a troca, a raiz fica marcada para nada animar; depois, a marca sai', async () => {
      montar()
      fireEvent.click(botaoDeTema())
      expect(raizDaLanding()).toHaveAttribute('data-trocando-tema')
      await waitFor(() => expect(raizDaLanding()).not.toHaveAttribute('data-trocando-tema'))
    })

    it('CA-1617 e CA-1651: no vidro, a logo segue o tema pelo CSS (as duas versões no HTML) e a ação é a do tema', () => {
      montar()
      const versao = (v: string) => barra().querySelector(`[data-logo="${v}"]`)
      expect(versao('escuro')?.querySelector('img')?.getAttribute('src')).toBe('marca/simbolo-fundo-escuro.svg')
      expect(versao('escuro')?.className).toBe('contents landing-clara:hidden')
      expect(versao('claro')?.querySelector('img')?.getAttribute('src')).toBe('marca/simbolo.svg')
      expect(versao('claro')?.className).toBe('hidden landing-clara:contents')
      expect(barra().className).toContain('text-landing-tinta')
      expect(within(barra()).getByRole('link', { name: 'Criar conta grátis' }).className).toContain('bg-landing-acao')
      expect(botaoDeTema().className).toContain('border-landing-borda')
    })

    it('CA-1618 e CB-602: o aviso de conta excluída segue o tema da landing, mesmo com o app no escuro', async () => {
      document.documentElement.classList.add('dark')
      marcarContaExcluida(undefined, performance.timeOrigin - 1)
      render(
        <MolduraDaLanding temSessao={false} aoIrPara={vi.fn()}>
          <AvisoContaExcluida />
        </MolduraDaLanding>,
      )
      const aviso = screen.getByRole('status')
      expect(aviso).toHaveTextContent('Sua conta foi excluída.')
      expect(aviso.closest('.dark')).toBe(raizDaLanding())
      await userEvent.setup().click(botaoDeTema())
      expect(aviso.closest('.tema-claro')).toBe(raizDaLanding())
      expect(aviso.closest('.dark')).toBe(document.documentElement)
    })
  })

  describe('D-549: a entrada das partes ao rolar', () => {
    let observados: Element[] = []
    let avisar: ((entradas: Partial<IntersectionObserverEntry>[]) => void) | null = null

    beforeEach(() => {
      observados = []
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(retorno: (entradas: Partial<IntersectionObserverEntry>[]) => void) {
            avisar = retorno
          }
          observe(el: Element) {
            observados.push(el)
          }
          unobserve(el: Element) {
            observados = observados.filter((o) => o !== el)
          }
          disconnect() {
            observados = []
          }
        },
      )
      vi.stubGlobal('matchMedia', () => ({ matches: false }))
    })

    afterEach(() => vi.unstubAllGlobals())

    it('CA-1487: o que já está na tela entra marcado; o resto espera a vez e entra uma vez', () => {
      const original = HTMLElement.prototype.getBoundingClientRect
      HTMLElement.prototype.getBoundingClientRect = function () {
        const topo = this.querySelector('h1') ? 0 : 5000
        return { top: topo, bottom: topo + 100, left: 0, right: 0, width: 0, height: 100, x: 0, y: topo, toJSON: () => ({}) }
      }
      montar()
      HTMLElement.prototype.getBoundingClientRect = original
      const [topo, meio, ...resto] = [...document.querySelectorAll('[data-surge]')]
      expect(screen.getByRole('main').parentElement).toHaveAttribute('data-entrada')
      expect(topo).toHaveAttribute('data-dentro')
      expect(meio).not.toHaveAttribute('data-dentro')
      expect(observados).toEqual([meio, ...resto])
      act(() => avisar?.([{ target: meio as Element, isIntersecting: true }]))
      expect(meio).toHaveAttribute('data-dentro')
      expect(observados).toEqual(resto)
    })

    it('CA-1674: a peça com data-revela não some; ela é observada e ganha data-dentro quando entra na tela', () => {
      render(
        <MolduraDaLanding temSessao={false} aoIrPara={vi.fn()}>
          <ol data-revela="">
            <li>passo</li>
          </ol>
        </MolduraDaLanding>,
      )
      const lista = screen.getByRole('list')
      expect(observados).toContain(lista)
      expect(lista).not.toHaveAttribute('data-dentro')
      act(() => avisar?.([{ target: lista, isIntersecting: true }]))
      expect(lista).toHaveAttribute('data-dentro')
    })

    it('CA-1486: com menos movimento, nada se esconde (a raiz não é marcada)', () => {
      vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta.includes('reduce') }))
      montar()
      expect(screen.getByRole('main').parentElement).not.toHaveAttribute('data-entrada')
    })
  })
})
