import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CONTATO_EMAIL } from '@/domain/legal.ts'
import { MolduraPublica } from './MolduraPublica.tsx'

// A moldura comum das telas públicas, em Preços. A página inicial tem moldura própria (spec landing-escura, D-545),
// testada em inicio/MolduraDaLanding.test.tsx.
const montar = (temSessao: boolean, aoIrPara = vi.fn(), recarregar = vi.fn()) =>
  render(
    <MolduraPublica atual="precos" temSessao={temSessao} aoIrPara={aoIrPara} recarregar={recarregar}>
      <p>conteúdo</p>
    </MolduraPublica>,
  )

describe('MolduraPublica', () => {
  it('CA-991: o menu tem Como funciona e Preços, em caixa normal (a landing escura não tem mais Recursos)', async () => {
    const aoIrPara = vi.fn()
    montar(false, aoIrPara)
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

  it('CA-991: Como funciona leva à seção da landing', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const aoIrPara = vi.fn()
    montar(false, aoIrPara)
    const alvo = document.createElement('section')
    alvo.id = 'como-funciona'
    alvo.scrollIntoView = vi.fn()
    document.body.append(alvo)
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(
      within(screen.getByRole('navigation', { name: 'Seções' })).getByRole('link', { name: 'Como funciona' }),
    )
    act(() => void vi.advanceTimersByTime(100))
    expect(aoIrPara).toHaveBeenCalledWith('inicio')
    expect(alvo.scrollIntoView).toHaveBeenCalled()
    alvo.remove()
    vi.useRealTimers()
  })

  it('CA-1028: menu e rodapé são links com endereço; o clique comum navega pelo app, o de aba nova segue o endereço', () => {
    const aoIrPara = vi.fn()
    montar(false, aoIrPara)
    const enderecos = (raiz: HTMLElement) => within(raiz).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')])
    expect(enderecos(screen.getByRole('navigation', { name: 'Seções' }))).toEqual([
      ['Como funciona', '#/inicio'],
      ['Preços', 'precos/'],
    ])
    expect(enderecos(screen.getByRole('contentinfo'))).toEqual([
      ['Como funciona', '#/inicio'],
      ['Preços', 'precos/'],
      ['Referências', 'fontes/'],
      ['Começar grátis', '#/criar-conta'],
      ['Entrar', '#/entrar'],
      ['Termos de uso', 'termos/'],
      ['Política de privacidade', 'privacidade/'],
      [CONTATO_EMAIL, `mailto:${CONTATO_EMAIL ?? ''}`],
    ])
    const precos = within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Preços' })
    // Clique comum: o app troca de tela e o navegador não segue o endereço (não recarrega).
    expect(fireEvent.click(precos)).toBe(false)
    expect(aoIrPara).toHaveBeenCalledWith('precos')
    // Ctrl+clique (aba nova): o navegador segue o endereço e o app não faz nada.
    aoIrPara.mockClear()
    expect(fireEvent.click(precos, { ctrlKey: true })).toBe(true)
    expect(aoIrPara).not.toHaveBeenCalled()
  })

  it('CA-1028: com sessão, o rodapé leva ao painel', () => {
    montar(true)
    expect(within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Ir para o painel' })).toHaveAttribute('href', '#/painel')
  })

  it('sem sessão, o topo tem Entrar e Começar grátis', async () => {
    const aoIrPara = vi.fn()
    montar(false, aoIrPara)
    const topo = within(screen.getByRole('banner'))
    await userEvent.setup().click(topo.getByRole('button', { name: 'Começar grátis' }))
    expect(aoIrPara).toHaveBeenCalledWith('criar-conta')
    expect(topo.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('CA-118: com sessão, os dois viram Ir para o painel', () => {
    montar(true)
    const topo = within(screen.getByRole('banner'))
    expect(topo.getByRole('button', { name: 'Ir para o painel' })).toBeInTheDocument()
    expect(topo.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('CA-992: o rodapé tem a logo, as colunas Produto, Conta e Legal e a linha do contato', async () => {
    const aoIrPara = vi.fn()
    montar(false, aoIrPara)
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
    montar(false)
    const texto = screen.getByRole('contentinfo').textContent ?? ''
    expect(texto).not.toMatch(/Fontes dos dados|NASEM|OMS|SISVAN|conferidos|8\.234|Funciona no navegador|programa de nutrição|sem internet/)
    expect(screen.getByRole('contentinfo').querySelectorAll('p')).toHaveLength(1)
  })

  it('CA-993 e CA-741: no celular, a logo do topo e os links do rodapé têm 44 px e alinham à esquerda', () => {
    montar(false, vi.fn())
    expect(within(screen.getByRole('banner')).getByRole('button', { name: 'MetaNutri, início' }).className).toContain('min-h-11')
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
    montar(false, vi.fn())
    const menu = screen.getByRole('navigation', { name: 'Seções' })
    expect(menu.className).toContain('md:order-none')
    expect(menu.className).not.toContain('sm:order-none')
    const acoes = within(screen.getByRole('banner')).getByRole('button', { name: 'Entrar' }).parentElement
    expect(acoes?.className).toContain('md:ml-0')
    expect(acoes?.className).not.toContain('sm:ml-0')
  })

  it('M-1 (spec revisao-geral-publica, CA-741): "Referências" (antes "Fontes da base") tem 44 px em qualquer largura', () => {
    montar(false, vi.fn())
    const fontes = within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Referências' })
    expect(fontes.className).toContain('min-h-11')
    expect(fontes.className).not.toContain('sm:min-h-0')
  })

  it('CA-1450 e CA-1611 (spec landing-v3): na página inicial, a moldura é a da landing, escura por padrão, em qualquer tema do app', () => {
    render(
      <MolduraPublica atual="inicio" temSessao={false} aoIrPara={vi.fn()} recarregar={vi.fn()}>
        <p>conteúdo</p>
      </MolduraPublica>,
    )
    const raiz = screen.getByRole('main').parentElement
    expect(raiz?.className).toMatch(/^landing dark /)
    expect(within(screen.getByRole('banner')).getByRole('navigation', { name: 'Principal' })).toBeInTheDocument()
    expect(within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Fale com a gente' })).toBeInTheDocument()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  // Por último: o aviso de versão nova é um estado da página inteira e não volta atrás.
  it('CA-996 e CA-1026: quando a versão nova passa a valer, recarrega só a página que abriu na vitrine', async () => {
    const naVitrine = vi.fn()
    const vindaDoTrabalho = vi.fn()
    render(
      <>
        <MolduraPublica atual="inicio" temSessao={false} aoIrPara={vi.fn()} recarregar={naVitrine} abriuNaVitrine>
          <p>aberta na landing</p>
        </MolduraPublica>
        <MolduraPublica atual="fontes" temSessao aoIrPara={vi.fn()} recarregar={vindaDoTrabalho} abriuNaVitrine={false}>
          <p>aberta na área de trabalho, levada a Fontes</p>
        </MolduraPublica>
      </>,
    )
    expect(naVitrine).not.toHaveBeenCalled()
    const { avisarVersaoNova } = await import('../aplicativo/versaoNova.ts')
    act(() => avisarVersaoNova())
    expect(naVitrine).toHaveBeenCalledTimes(1)
    expect(vindaDoTrabalho).not.toHaveBeenCalled()
  })
})
