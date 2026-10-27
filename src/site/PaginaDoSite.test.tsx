import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { RotaIndexavel } from '@/seo/paginas.ts'
import { PaginaDoSite } from './PaginaDoSite.tsx'

const APP = 'https://app.metanutri.com.br/'

function montar(rota: RotaIndexavel) {
  const aoIrAoApp = vi.fn()
  const abrirPagina = vi.fn()
  render(<PaginaDoSite rota={rota} aoIrAoApp={aoIrAoApp} abrirPagina={abrirPagina} />)
  return { aoIrAoApp, abrirPagina }
}

const primeiro = (nome: string) => {
  const botao = screen.getAllByRole('button', { name: nome })[0]
  if (!botao) throw new Error(`sem botão ${nome}`)
  return botao
}

describe('a página do site (spec separacao-site-app, D-502 e DP-SA-30)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('D-502: cada rota desenha a página dela, dentro da moldura pública', () => {
    const titulos: Readonly<Record<RotaIndexavel, string>> = {
      inicio: 'Planos alimentares completos em vitaminas e minerais',
      precos: 'Planos e preços',
      termos: 'Termos de uso',
      privacidade: 'Política de privacidade',
      fontes: 'Referências',
    }
    for (const [rota, titulo] of Object.entries(titulos) as [RotaIndexavel, string][]) {
      const { unmount } = render(<PaginaDoSite rota={rota} aoIrAoApp={vi.fn()} abrirPagina={vi.fn()} />)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(titulo)
      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
      unmount()
    }
  })

  it('D-501: "Entrar" leva à raiz do app e "Começar grátis", a Criar conta no app', async () => {
    const { aoIrAoApp } = montar('precos')
    const topo = within(screen.getByRole('banner'))
    const usuario = userEvent.setup()
    await usuario.click(topo.getByRole('button', { name: 'Entrar' }))
    expect(aoIrAoApp).toHaveBeenLastCalledWith(APP)
    await usuario.click(topo.getByRole('button', { name: 'Começar grátis' }))
    expect(aoIrAoApp).toHaveBeenLastCalledWith(`${APP}#/criar-conta`)
  })

  it('D-501: em Preços, cada plano leva a Criar conta no app, com o plano e o ciclo', async () => {
    const { aoIrAoApp } = montar('precos')
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('radio', { name: /Anual/ }))
    await usuario.click(primeiro('Assinar Solo'))
    expect(aoIrAoApp).toHaveBeenLastCalledWith(`${APP}#/criar-conta/solo/anual`)
    await usuario.click(primeiro('Criar conta de estudante'))
    expect(aoIrAoApp).toHaveBeenLastCalledWith(`${APP}#/criar-conta/estudante`)
  })

  it('D-501: na landing, "Criar conta grátis" do topo e os planos vão ao app', async () => {
    const { aoIrAoApp } = montar('inicio')
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Criar conta grátis' }))
    expect(aoIrAoApp).toHaveBeenLastCalledWith(`${APP}#/criar-conta`)
    await usuario.click(screen.getByRole('button', { name: 'Assinar o Solo' }))
    expect(aoIrAoApp).toHaveBeenLastCalledWith(`${APP}#/criar-conta/solo`)
  })

  it('D-503: de uma página para outra, abre o endereço da página; na mesma página, só volta ao alto', async () => {
    const rolar = vi.fn()
    vi.stubGlobal('scrollTo', rolar)
    const { abrirPagina, aoIrAoApp } = montar('precos')
    const usuario = userEvent.setup()
    await usuario.click(within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Termos de uso' }))
    expect(abrirPagina).toHaveBeenLastCalledWith(new URL('termos/', document.baseURI).href)
    abrirPagina.mockClear()
    await usuario.click(within(screen.getByRole('navigation', { name: 'Seções' })).getByRole('link', { name: 'Preços' }))
    expect(abrirPagina).not.toHaveBeenCalled()
    expect(rolar).toHaveBeenCalled()
    expect(aoIrAoApp).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
