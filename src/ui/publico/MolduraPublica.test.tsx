import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CONTATO_EMAIL } from '@/domain/legal.ts'
import { MolduraPublica } from './MolduraPublica.tsx'

// A moldura comum das telas públicas, em Preços. A página inicial tem moldura própria (spec landing-escura, D-545),
// testada em inicio/MolduraDaLanding.test.tsx. Spec separacao-site-app: só o site a usa, sem sessão (D-501).
const APP = 'https://app.metanutri.com.br/'

const montar = (aoIrPara = vi.fn()) =>
  render(
    <MolduraPublica atual="precos" aoIrPara={aoIrPara}>
      <p>conteúdo</p>
    </MolduraPublica>,
  )

describe('MolduraPublica', () => {
  it('CA-991: o menu tem Como funciona e Preços, em caixa normal (a landing escura não tem mais Recursos)', async () => {
    const aoIrPara = vi.fn()
    montar(aoIrPara)
    const menu = within(screen.getByRole('navigation', { name: 'Seções' }))
    const botoes = menu.getAllByRole('link')
    expect(botoes.map((b) => b.textContent)).toEqual(['Como funciona', 'Preços'])
    for (const botao of botoes) {
      expect(botao.className).not.toMatch(/\buppercase\b/)
      expect(botao.className).not.toMatch(/tracking-/)
    }
    expect(menu.queryByRole('button', { name: 'O diferencial' })).not.toBeInTheDocument()
    await userEvent.setup().click(menu.getByRole('link', { name: 'Preços' }))
    expect(aoIrPara).toHaveBeenCalledWith('precos')
  })

  it('CA-991 e CA-1404 (spec separacao-site-app): Como funciona é o endereço da seção na landing, que o navegador abre', () => {
    const aoIrPara = vi.fn()
    montar(aoIrPara)
    const link = within(screen.getByRole('navigation', { name: 'Seções' })).getByRole('link', { name: 'Como funciona' })
    expect(link).toHaveAttribute('href', './#como-funciona')
    // Página própria (D-503): o navegador segue o endereço, e o site não intercepta.
    expect(fireEvent.click(link)).toBe(true)
    expect(aoIrPara).not.toHaveBeenCalled()
  })

  it('CA-1028, CA-1402 e CA-1404: menu e rodapé são links com endereço; o clique comum chama o site, o de aba nova segue o endereço', () => {
    const aoIrPara = vi.fn()
    montar(aoIrPara)
    const enderecos = (raiz: HTMLElement) => within(raiz).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])
    expect(enderecos(screen.getByRole('navigation', { name: 'Seções' }))).toEqual([
      ['Como funciona', './#como-funciona'],
      ['Preços', 'precos/'],
    ])
    expect(enderecos(screen.getByRole('contentinfo'))).toEqual([
      ['Como funciona', './#como-funciona'],
      ['Preços', 'precos/'],
      ['Referências', 'fontes/'],
      ['Começar grátis', `${APP}#/criar-conta`],
      ['Entrar', APP],
      ['Termos de uso', 'termos/'],
      ['Política de privacidade', 'privacidade/'],
      [CONTATO_EMAIL, `mailto:${CONTATO_EMAIL ?? ''}`],
    ])
    const precos = within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Preços' })
    // Clique comum: o site decide (DP-SA-36) e o navegador não segue o endereço sozinho.
    expect(fireEvent.click(precos)).toBe(false)
    expect(aoIrPara).toHaveBeenCalledWith('precos')
    // Ctrl+clique (aba nova): o navegador segue o endereço e o app não faz nada.
    aoIrPara.mockClear()
    expect(fireEvent.click(precos, { ctrlKey: true })).toBe(true)
    expect(aoIrPara).not.toHaveBeenCalled()
  })

  it('CA-1402 (spec separacao-site-app): o topo tem Entrar e Começar grátis, com o endereço do app; o clique chama o site', async () => {
    const aoIrPara = vi.fn()
    montar(aoIrPara)
    const topo = within(screen.getByRole('banner'))
    expect(topo.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', APP)
    expect(topo.getByRole('link', { name: 'Começar grátis' })).toHaveAttribute('href', `${APP}#/criar-conta`)
    const usuario = userEvent.setup()
    await usuario.click(topo.getByRole('link', { name: 'Começar grátis' }))
    expect(aoIrPara).toHaveBeenLastCalledWith('criar-conta')
    await usuario.click(topo.getByRole('link', { name: 'Entrar' }))
    expect(aoIrPara).toHaveBeenLastCalledWith('entrar')
  })

  it('CA-1402 (spec separacao-site-app): "Ir para o painel" não existe no site', () => {
    montar()
    expect(screen.queryByText('Ir para o painel')).not.toBeInTheDocument()
    expect(document.body.innerHTML).not.toContain('#/painel')
  })

  it('CA-992: o rodapé tem a logo, as colunas Produto, Conta e Legal e a linha do contato', async () => {
    const aoIrPara = vi.fn()
    montar(aoIrPara)
    const rodape = within(screen.getByRole('contentinfo'))
    expect(rodape.getAllByRole('heading').map((h) => h.textContent)).toEqual(['Produto', 'Conta', 'Legal'])
    const usuario = userEvent.setup()
    await usuario.click(rodape.getByRole('link', { name: 'Termos de uso' }))
    expect(aoIrPara).toHaveBeenCalledWith('termos')
    // CA-1483 (spec landing-escura): a página das fontes se chama Referências.
    await usuario.click(rodape.getByRole('link', { name: 'Referências' }))
    expect(aoIrPara).toHaveBeenCalledWith('fontes')
    expect(rodape.getByText(new RegExp(`© ${new Date().getFullYear()} MetaNutri`))).toBeInTheDocument()
    expect(rodape.getByRole('link', { name: CONTATO_EMAIL ?? '' })).toHaveAttribute('href', `mailto:${CONTATO_EMAIL ?? ''}`)
  })

  it('CA-992: o rodapé não tem frase de apresentação, fontes técnicas, "conferidos" nem a lei', () => {
    montar()
    const texto = screen.getByRole('contentinfo').textContent ?? ''
    expect(texto).not.toMatch(/Fontes dos dados|NASEM|OMS|SISVAN|conferidos|8\.234|Funciona no navegador|programa de nutrição|sem internet/)
    expect(screen.getByRole('contentinfo').querySelectorAll('p')).toHaveLength(1)
  })

  it('CA-993 e CA-741: no celular, a logo do topo e os links do rodapé têm 44 px e alinham à esquerda', () => {
    montar()
    const logo = within(screen.getByRole('banner')).getByRole('link', { name: 'MetaNutri, início' })
    expect(logo.className).toContain('min-h-11')
    expect(logo).toHaveAttribute('href', './')
    const rodape = within(screen.getByRole('contentinfo'))
    const links = rodape.getAllByRole('link')
    expect(links.map((b) => b.textContent)).toEqual([
      'Como funciona',
      'Preços',
      'Referências',
      'Começar grátis',
      'Entrar',
      'Termos de uso',
      'Política de privacidade',
      CONTATO_EMAIL,
    ])
    for (const link of links) {
      expect(link.className, link.textContent ?? '').toContain('min-h-11')
      expect(link.className, link.textContent ?? '').toContain('text-left')
      // Todos com a mesma altura em qualquer largura: com o antigo "Fontes da base" maior, o rodapé ficava com vãos desiguais.
      expect(link.className, link.textContent ?? '').not.toContain('sm:min-h-0')
    }
  })

  it('D-235 e A-23 (spec revisao-geral-publica): até 767 px o menu fica na segunda linha, com Entrar e Começar grátis ao lado da logo', () => {
    montar()
    const menu = screen.getByRole('navigation', { name: 'Seções' })
    expect(menu.className).toContain('md:order-none')
    expect(menu.className).not.toContain('sm:order-none')
    const acoes = within(screen.getByRole('banner')).getByRole('link', { name: 'Entrar' }).parentElement
    expect(acoes?.className).toContain('md:ml-0')
    expect(acoes?.className).not.toContain('sm:ml-0')
  })

  it('M-1 (spec revisao-geral-publica, CA-741): "Referências" (antes "Fontes da base") tem 44 px em qualquer largura', () => {
    montar()
    const fontes = within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Referências' })
    expect(fontes.className).toContain('min-h-11')
    expect(fontes.className).not.toContain('sm:min-h-0')
  })

  it('CA-1450 e CA-1611 (spec landing-v3): na página inicial, a moldura é a da landing, escura por padrão, em qualquer tema do app', () => {
    render(
      <MolduraPublica atual="inicio" aoIrPara={vi.fn()}>
        <p>conteúdo</p>
      </MolduraPublica>,
    )
    const raiz = screen.getByRole('main').parentElement
    expect(raiz?.className).toMatch(/^landing dark /)
    expect(within(screen.getByRole('banner')).getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
    expect(within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Fale com a gente' })).toBeInTheDocument()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
