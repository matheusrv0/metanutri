import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App.tsx'
import { CHAVE_AVISO_VISTO } from './ui/casos/AvisoPrimeiroAcesso.tsx'
import { ProvedorTema } from './ui/tema/ProvedorTema.tsx'

const renderizar = () =>
  render(
    <ProvedorTema>
      <App />
    </ProvedorTema>,
  )

const menuFixo = () => {
  const menu = screen.getAllByRole('navigation', { name: 'Menu principal' })[0]
  if (!menu) throw new Error('menu ausente')
  return within(menu)
}

describe('App: estrutura', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(CHAVE_AVISO_VISTO, '1')
    window.location.hash = ''
  })

  it('abre em Meus casos, sem item de caso enquanto não há casos', () => {
    renderizar()
    expect(screen.getByRole('heading', { level: 1, name: 'Meus casos' })).toBeInTheDocument()
    expect(menuFixo().getByRole('button', { name: /Meus casos/ })).toHaveAttribute('aria-current', 'page')
    expect(menuFixo().queryByRole('button', { name: /Continuar caso|Caso aberto/ })).not.toBeInTheDocument()
    expect(document.title).toBe('Meus casos · MetaNutri')
  })

  it('Novo caso cria o caso e abre a etapa 1, com trilha de volta', async () => {
    renderizar()
    const usuario = userEvent.setup()
    await usuario.click(menuFixo().getByRole('button', { name: 'Novo caso' }))

    expect(window.location.hash).toMatch(/^#\/caso\/.+\/caso$/)
    expect(screen.getByText('Etapa 1 de 3: Dados do caso')).toBeInTheDocument()
    const etapas = within(screen.getByRole('navigation', { name: 'Etapas do caso' }))
    expect(etapas.getByRole('button', { name: /Dados do caso/ })).toHaveAttribute('aria-current', 'step')
    expect(menuFixo().getByRole('button', { name: /Caso aberto/ })).toHaveAttribute('aria-current', 'page')

    await usuario.click(etapas.getByRole('button', { name: /Adequação/ }))
    expect(window.location.hash).toMatch(/\/adequacao$/)

    await usuario.click(within(screen.getByRole('navigation', { name: 'Você está em' })).getByRole('button', { name: 'Meus casos' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Meus casos' })).toBeInTheDocument()
    expect(menuFixo().getByRole('button', { name: /Continuar caso/ })).toBeInTheDocument()
  })

  it('botão de próxima etapa avança no planejador', async () => {
    renderizar()
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Criar primeiro caso' }))
    await usuario.click(screen.getByRole('button', { name: /Próxima etapa: Plano alimentar/ }))
    expect(screen.getByText('Etapa 2 de 3: Plano alimentar')).toBeInTheDocument()
  })

  it('endereço de caso inexistente oferece volta para Meus casos', async () => {
    window.location.hash = '#/caso/nao-existe/plano'
    renderizar()
    expect(screen.getByRole('heading', { level: 1, name: 'Caso não encontrado' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Voltar para Meus casos' }))
    expect(window.location.hash).toBe('#/casos')
  })

  it('navega para Fontes científicas', async () => {
    renderizar()
    await userEvent.setup().click(menuFixo().getByRole('button', { name: 'Fontes científicas' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Fontes científicas' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#/fontes')
    expect(screen.getByText(/Tabela Brasileira de Composição de Alimentos/)).toBeInTheDocument()
  })

  it('aparência com três opções: escuro, claro e sistema', async () => {
    renderizar()
    const usuario = userEvent.setup()
    const aparencia = within(menuFixo().getByRole('radiogroup', { name: 'Aparência' }))
    expect(aparencia.getByRole('radio', { name: 'Sistema' })).toHaveAttribute('aria-checked', 'true')

    await usuario.click(aparencia.getByRole('radio', { name: 'Escuro' }))
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('metanutri:tema')).toBe('escuro')

    await usuario.click(aparencia.getByRole('radio', { name: 'Claro' }))
    expect(document.documentElement).not.toHaveClass('dark')
    expect(aparencia.getByRole('radio', { name: 'Claro' })).toHaveAttribute('aria-checked', 'true')
  })

  it('abre e fecha o menu em gaveta pelo botão do cabeçalho', async () => {
    renderizar()
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Abrir menu' }))
    const gaveta = screen.getByRole('dialog', { name: 'Menu' })
    await usuario.click(within(gaveta).getByRole('button', { name: 'Fontes científicas' }))
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Fontes científicas' })).toBeInTheDocument()
  })
})
