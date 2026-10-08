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
    expect(rodape.getByText('Base MetaNutri ·')).toBeInTheDocument()
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
})
