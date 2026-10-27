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
      <section data-capitulo="teal" data-surge="">
        <h1>topo</h1>
      </section>
      <section data-capitulo="afundado" data-surge="" id="como-funciona">
        <h2>meio</h2>
      </section>
    </MolduraDaLanding>,
  )

const barra = () => screen.getByRole('banner')

/** Põe cada seção num lugar da janela, como o navegador faria ao rolar. */
function posicionar(caixas: Readonly<Record<string, readonly [number, number]>>) {
  for (const el of document.querySelectorAll<HTMLElement>('[data-capitulo]')) {
    const [topo, base] = caixas[el.dataset['capitulo'] ?? ''] ?? [9999, 9999]
    el.getBoundingClientRect = () => ({ top: topo, bottom: base, left: 0, right: 0, width: 0, height: base - topo, x: 0, y: topo, toJSON: () => ({}) })
  }
  Object.defineProperty(barra(), 'offsetHeight', { configurable: true, value: 68 })
}

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

  it('CA-1457: sem sessão, a barra tem a logo, Como funciona, Preços, Entrar e Criar conta grátis; no celular, só a logo, Entrar e Criar conta', async () => {
    const aoIrPara = vi.fn()
    montar(false, aoIrPara)
    const menu = within(within(barra()).getByRole('navigation', { name: 'Principal' }))
    expect(menu.getAllByRole('link').map((l) => l.textContent)).toEqual(['Como funciona', 'Preços', 'Entrar', 'Criar conta grátis'])
    expect(menu.getByRole('link', { name: 'Como funciona' }).className).toContain('max-[720px]:hidden')
    expect(menu.getByRole('link', { name: 'Preços' }).className).toContain('max-[720px]:hidden')
    expect(menu.getByRole('link', { name: 'Entrar' }).className).not.toContain('max-[720px]:hidden')
    expect(menu.getByText('grátis', { exact: false }).className).toContain('max-[720px]:hidden')
    expect(within(barra()).getByRole('link', { name: 'MetaNutri, início' })).toBeInTheDocument()

    const usuario = userEvent.setup()
    await usuario.click(menu.getByRole('link', { name: 'Entrar' }))
    expect(aoIrPara).toHaveBeenCalledWith('entrar')
    await usuario.click(menu.getByRole('link', { name: 'Criar conta grátis' }))
    expect(aoIrPara).toHaveBeenCalledWith('criar-conta')
    const alvo = document.getElementById('como-funciona')
    if (!alvo) throw new Error('sem a seção')
    alvo.scrollIntoView = vi.fn()
    await usuario.click(menu.getByRole('link', { name: 'Como funciona' }))
    expect(alvo.scrollIntoView).toHaveBeenCalled()
  })

  it('CA-1458 e CB-540: com sessão, só "Ir para o painel"', async () => {
    const aoIrPara = vi.fn()
    montar(true, aoIrPara)
    const menu = within(within(barra()).getByRole('navigation', { name: 'Principal' }))
    expect(menu.queryByRole('link', { name: 'Entrar' })).not.toBeInTheDocument()
    expect(menu.queryByRole('link', { name: /Criar conta/ })).not.toBeInTheDocument()
    await userEvent.setup().click(menu.getByRole('link', { name: 'Ir para o painel' }))
    expect(aoIrPara).toHaveBeenCalledWith('painel')
  })

  it('CA-1460: a barra pinta a cor da seção embaixo dela', () => {
    montar()
    posicionar({ teal: [0, 700], afundado: [700, 1500] })
    rolarPara(0)
    expect(barra()).toHaveAttribute('data-tinta', 'teal')
    expect(barra().className).toContain('bg-landing-teal')
    posicionar({ teal: [-700, 0], afundado: [0, 800] })
    rolarPara(700)
    expect(barra()).toHaveAttribute('data-tinta', 'afundado')
    expect(barra().className).toContain('bg-landing-afundado')
  })

  it('CA-1459 e CB-533: some ao descer além de 200 px, volta ao subir e com foco; no rodapé, sai', () => {
    montar()
    posicionar({ teal: [0, 700], afundado: [700, 1500] })
    rolarPara(100)
    expect(barra().className).not.toContain('-translate-y-full')
    rolarPara(400)
    expect(barra().className).toContain('-translate-y-full')
    // Com foco num link dela, a barra volta (o foco ganha do deslocamento).
    expect(barra().className).toContain('focus-within:translate-y-0')
    rolarPara(300)
    expect(barra().className).not.toContain('-translate-y-full')
    posicionar({ fim: [-100, 900] })
    rolarPara(200)
    expect(barra()).toHaveAttribute('data-tinta', 'escondida')
    expect(barra().className).toContain('-translate-y-full')
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
    it('CA-1610: o botão de tema fica entre Preços e Entrar, também no celular, com 44 px; com sessão, antes de Ir para o painel', () => {
      const { unmount } = montar()
      const nomes = (nav: HTMLElement) => [...nav.querySelectorAll('a, button')].map((el) => el.getAttribute('aria-label') ?? el.textContent)
      const menu = within(barra()).getByRole('navigation', { name: 'Principal' })
      expect(nomes(menu)).toEqual(['Como funciona', 'Preços', 'Usar o tema claro', 'Entrar', 'Criar conta grátis'])
      expect(botaoDeTema()).toHaveAttribute('title', 'Usar o tema claro')
      expect(botaoDeTema().className).not.toContain('hidden')
      expect(botaoDeTema().className).toContain('size-11')
      unmount()
      montar(true)
      expect(nomes(within(barra()).getByRole('navigation', { name: 'Principal' }))).toEqual(['Como funciona', 'Preços', 'Usar o tema claro', 'Ir para o painel'])
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

    it('CA-1617: sobre o teal, a barra é teal com a logo para fundo escuro; sobre o chão claro, ela clareia e a logo também', async () => {
      montar()
      const logo = () => barra().querySelector('img')?.getAttribute('src')
      posicionar({ teal: [0, 700], afundado: [700, 1500] })
      rolarPara(0)
      expect(logo()).toBe('marca/simbolo-fundo-escuro.svg')
      expect(barra().className).toContain('text-landing-marfim')
      await userEvent.setup().click(botaoDeTema())
      expect(logo()).toBe('marca/simbolo-fundo-escuro.svg')
      posicionar({ teal: [-700, 0], afundado: [0, 800] })
      rolarPara(700)
      expect(barra()).toHaveAttribute('data-tinta', 'afundado')
      expect(barra().className).toContain('text-landing-tinta')
      expect(logo()).toBe('marca/simbolo.svg')
      expect(within(barra()).getByRole('link', { name: 'Criar conta grátis' }).className).toContain('bg-landing-acao')
      // No escuro, sobre o afundado, a logo continua a do fundo escuro.
      await userEvent.setup().click(botaoDeTema())
      expect(logo()).toBe('marca/simbolo-fundo-escuro.svg')
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
        const topo = this.dataset['capitulo'] === 'teal' ? 0 : 5000
        return { top: topo, bottom: topo + 100, left: 0, right: 0, width: 0, height: 100, x: 0, y: topo, toJSON: () => ({}) }
      }
      montar()
      HTMLElement.prototype.getBoundingClientRect = original
      const [topo, meio] = [...document.querySelectorAll('[data-surge]')]
      expect(screen.getByRole('main').parentElement).toHaveAttribute('data-entrada')
      expect(topo).toHaveAttribute('data-dentro')
      expect(meio).not.toHaveAttribute('data-dentro')
      expect(observados).toEqual([meio])
      act(() => avisar?.([{ target: meio as Element, isIntersecting: true }]))
      expect(meio).toHaveAttribute('data-dentro')
      expect(observados).toEqual([])
    })

    it('CA-1486: com menos movimento, nada se esconde (a raiz não é marcada)', () => {
      vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: consulta.includes('reduce') }))
      montar()
      expect(screen.getByRole('main').parentElement).not.toHaveAttribute('data-entrada')
    })
  })
})
