import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MolduraPublica } from './MolduraPublica.tsx'

const montar = (temSessao: boolean, aoIrPara = vi.fn()) =>
  render(
    <MolduraPublica atual="inicio" temSessao={temSessao} aoIrPara={aoIrPara}>
      <p>conteúdo</p>
    </MolduraPublica>,
  )

describe('MolduraPublica', () => {
  it('CA-116: o menu tem Como funciona, O diferencial e Preços', async () => {
    const aoIrPara = vi.fn()
    montar(false, aoIrPara)
    const menu = within(screen.getByRole('navigation', { name: 'Seções' }))
    expect(menu.getByRole('button', { name: 'Como funciona' })).toBeInTheDocument()
    expect(menu.getByRole('button', { name: 'O diferencial' })).toBeInTheDocument()
    await userEvent.setup().click(menu.getByRole('button', { name: 'Preços' }))
    expect(aoIrPara).toHaveBeenCalledWith('precos')
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

  it('CA-220: o rodapé leva aos termos e à privacidade, e tem as fontes dos dados', async () => {
    const aoIrPara = vi.fn()
    montar(false, aoIrPara)
    const rodape = within(screen.getByRole('contentinfo'))
    const usuario = userEvent.setup()
    await usuario.click(rodape.getByRole('button', { name: 'Termos de uso' }))
    expect(aoIrPara).toHaveBeenCalledWith('termos')
    expect(rodape.getByRole('button', { name: 'Política de privacidade' })).toBeInTheDocument()
    expect(rodape.getByRole('heading', { name: 'Fontes dos dados' })).toHaveAttribute('id', 'fontes')
    expect(rodape.queryByText(/TACO|POF|IBGE|NEPA|UNICAMP/)).not.toBeInTheDocument()
    expect(rodape.getByText('Base MetaNutri')).toBeInTheDocument()
    const botaoBase = rodape.getByRole('button', { name: 'Fontes da base' })
    expect(botaoBase.className).toContain('min-h-11')
    await usuario.click(botaoBase)
    expect(aoIrPara).toHaveBeenCalledWith('fontes')
  })

  it('DP-26 (spec dados-na-nuvem): o rodapé não promete uso sem internet', () => {
    montar(false, vi.fn())
    const rodape = within(screen.getByRole('contentinfo'))
    expect(rodape.getByText(/Funciona no navegador, sem instalar nada\./)).toBeInTheDocument()
    expect(rodape.queryByText(/sem internet/)).not.toBeInTheDocument()
  })

  it('CA-740 (spec revisao-geral-publica): as fontes dos dados não têm separador solto, cada fonte é um item', () => {
    montar(false, vi.fn())
    const fontes = screen.getByRole('heading', { name: 'Fontes dos dados' }).closest('section')
    expect(fontes?.textContent).not.toContain('·')
    const itens = [...(fontes?.querySelectorAll('li') ?? [])].map((li) => li.textContent)
    expect(itens).toEqual(['Base MetaNutriFontes da base', 'NASEM. DRI, Apêndice J, 2019', 'OMS, 2006 e 2007', 'SISVAN, 2011'])
    // "Base MetaNutri" e o link ficam em linhas próprias, em qualquer largura.
    expect(fontes?.querySelector('li')?.className).toContain('flex-col')
  })

  it('CA-741 (spec revisao-geral-publica): no celular, a logo do topo e os links do rodapé têm 44 px e alinham à esquerda', () => {
    montar(false, vi.fn())
    expect(within(screen.getByRole('banner')).getByRole('button', { name: 'MetaNutri, início' }).className).toContain('min-h-11')
    const links = within(screen.getByRole('contentinfo')).getAllByRole('button')
    expect(links.map((b) => b.textContent)).toEqual(['Fontes da base', 'Preços', 'Começar grátis', 'Entrar', 'Termos de uso', 'Política de privacidade'])
    for (const link of links) {
      expect(link.className, link.textContent ?? '').toContain('min-h-11')
      expect(link.className, link.textContent ?? '').toContain('text-left')
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

  it('M-1 (spec revisao-geral-publica, CA-741): "Fontes da base" tem 44 px em qualquer largura, como desde 01/10', () => {
    montar(false, vi.fn())
    const fontes = within(screen.getByRole('contentinfo')).getByRole('button', { name: 'Fontes da base' })
    expect(fontes.className).toContain('min-h-11')
    expect(fontes.className).not.toContain('sm:min-h-0')
  })
})

