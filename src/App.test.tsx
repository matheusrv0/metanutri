import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App.tsx'
import { PERFIL_VAZIO } from './domain/perfil.ts'
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

  it('CA-322: #/fontes abre a página de fontes, sem conta', () => {
    window.location.hash = '#/fontes'
    renderizar()
    expect(screen.getByRole('heading', { level: 1, name: 'Fontes da base' })).toBeInTheDocument()
  })

  it('abre no Painel, sem item de caso enquanto não há planos', () => {
    renderizar()
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
    expect(menuFixo().getByRole('button', { name: /Painel/ })).toHaveAttribute('aria-current', 'page')
    expect(menuFixo().queryByRole('button', { name: /Continuar plano|Plano aberto/ })).not.toBeInTheDocument()
    expect(document.title).toBe('Painel · MetaNutri')
    expect(screen.getByText('Nenhum plano ainda.')).toBeInTheDocument()
  })

  it('CA-324: o botão Novo plano do Painel fica no topo e pergunta o modo', async () => {
    renderizar()
    const usuario = userEvent.setup()
    const doTopo = screen.getAllByRole('button', { name: 'Novo plano' }).find((b) => b.closest('header') !== null)
    expect(doTopo).toBeDefined()
    await usuario.click(doTopo as HTMLElement)
    await usuario.click(screen.getByRole('menuitem', { name: /Prescrição rápida/ }))
    expect(window.location.hash).toMatch(/^#\/caso\/.+\/caso$/)
  })

  it('Novo plano cria o caso e abre a etapa 1, com trilha de volta', async () => {
    renderizar()
    const usuario = userEvent.setup()
    await usuario.click(menuFixo().getByRole('button', { name: 'Novo plano' }))
    await usuario.click(screen.getByRole('menuitem', { name: /Atendimento completo/ }))

    expect(window.location.hash).toMatch(/^#\/caso\/.+\/caso$/)
    const etapas = within(screen.getByRole('navigation', { name: 'Etapas do plano' }))
    expect(etapas.getByRole('button', { name: /Dados e medidas/ })).toHaveAttribute('aria-current', 'step')
    expect(menuFixo().getByRole('button', { name: /Plano aberto/ })).toHaveAttribute('aria-current', 'page')

    await usuario.click(etapas.getByRole('button', { name: /Adequação/ }))
    expect(window.location.hash).toMatch(/\/adequacao$/)

    await usuario.click(within(screen.getByRole('navigation', { name: 'Você está em' })).getByRole('button', { name: 'Planos' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Planos' })).toBeInTheDocument()
    expect(menuFixo().getByRole('button', { name: /Continuar plano/ })).toBeInTheDocument()
  })

  it('botão de próxima etapa avança no planejador', async () => {
    renderizar()
    const usuario = userEvent.setup()
    await usuario.click(menuFixo().getByRole('button', { name: 'Novo plano' }))
    await usuario.click(screen.getByRole('menuitem', { name: /Atendimento completo/ }))
    await usuario.click(screen.getByRole('button', { name: /Próxima etapa: Plano alimentar/ }))
    const etapas = within(screen.getByRole('navigation', { name: 'Etapas do plano' }))
    expect(etapas.getByRole('button', { name: /Plano alimentar/ })).toHaveAttribute('aria-current', 'step')
  })

  it('endereço de caso inexistente oferece volta para Planos', async () => {
    window.location.hash = '#/caso/nao-existe/plano'
    renderizar()
    expect(screen.getByRole('heading', { level: 1, name: 'Plano não encontrado' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Voltar para Planos' }))
    expect(window.location.hash).toBe('#/casos')
  })

  it('navega para Pacientes', async () => {
    renderizar()
    await userEvent.setup().click(menuFixo().getByRole('button', { name: 'Pacientes' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Pacientes' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#/pacientes')
    expect(screen.getByRole('button', { name: 'Novo paciente' })).toBeInTheDocument()
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
    await usuario.click(within(gaveta).getByRole('button', { name: 'Pacientes' }))
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Pacientes' })).toBeInTheDocument()
  })

  it('sem servidor: #/esqueci-senha mostra a tela de recuperação', () => {
    window.location.hash = '#/esqueci-senha'
    renderizar()
    expect(screen.getByRole('heading', { level: 1, name: 'Esqueci a senha' })).toBeInTheDocument()
  })

  it('sem servidor: "Começar grátis" leva ao cadastro, que oferece abrir o sistema (CA-150)', async () => {
    window.location.hash = '#/inicio'
    renderizar()
    const [botao] = screen.getAllByRole('button', { name: 'Começar grátis' })
    if (!botao) throw new Error('botão ausente')
    await userEvent.setup().click(botao)
    expect(window.location.hash).toBe('#/criar-conta')
    expect(screen.getByRole('button', { name: 'Abrir o sistema' })).toBeInTheDocument()
  })

  // O aviso "em preparação" (sem responsável ou contato) é testado em ui/publico/legal.test.tsx.
  it('sem servidor: #/termos abre os Termos de uso com responsável e contato', () => {
    window.location.hash = '#/termos'
    renderizar()
    expect(screen.getByRole('heading', { level: 1, name: 'Termos de uso' })).toBeInTheDocument()
    expect(screen.queryByText('Este texto está sendo finalizado e entra no ar em breve.')).not.toBeInTheDocument()
    expect(screen.getByText(/É oferecido por Matheus Rondon\./)).toBeInTheDocument()
  })

  it('sem servidor: #/assinar/solo/mensal mostra o checkout', () => {
    window.location.hash = '#/assinar/solo/mensal'
    renderizar()
    expect(screen.getByRole('heading', { level: 1, name: 'Assine o MetaNutri' })).toBeInTheDocument()
  })
})

describe('App: quem assina, sem servidor (CA-251, CA-253, CB-54)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(CHAVE_AVISO_VISTO, '1')
    window.location.hash = ''
  })

  const guardarPerfil = (perfil: Partial<typeof PERFIL_VAZIO>) => localStorage.setItem('metanutri:perfil', JSON.stringify({ ...PERFIL_VAZIO, ...perfil }))

  const novoPlano = async () => {
    renderizar()
    const usuario = userEvent.setup()
    await usuario.click(menuFixo().getByRole('button', { name: 'Novo plano' }))
    await usuario.click(screen.getByRole('menuitem', { name: /Atendimento completo/ }))
  }

  it('CA-253: estudante começa o plano com estagiário e preceptor preenchidos', async () => {
    guardarPerfil({ nome: 'Júlia Martins', tipo: 'estudante', responsavel: 'Carla Mendes' })
    await novoPlano()
    expect(screen.getByLabelText('Estagiário(a)')).toHaveValue('Júlia Martins')
    expect(screen.getByLabelText('Preceptor(a)')).toHaveValue('Carla Mendes')
  })

  it('CA-253: mudar Quem assina depois não muda o plano que já existe', async () => {
    guardarPerfil({ nome: 'Júlia Martins', tipo: 'estudante' })
    await novoPlano()
    const endereco = window.location.hash
    guardarPerfil({ nome: 'Outra Pessoa', tipo: 'estudante' })
    cleanup()
    window.location.hash = endereco
    renderizar()
    expect(screen.getByLabelText('Estagiário(a)')).toHaveValue('Júlia Martins')
  })

  it('CA-251 e CB-54: nutricionista em Configurações assina o plano sem digitar', async () => {
    guardarPerfil({ nome: 'Ana Souza', tipo: 'profissional', crn: 'CRN-6 12345' })
    await novoPlano()
    expect(screen.queryByLabelText('Estagiário(a)')).not.toBeInTheDocument()
    expect(screen.getByText('Ana Souza · CRN-6 12345')).toBeInTheDocument()
    expect(screen.getByText('Vem de Configurações › Quem assina.')).toBeInTheDocument()
  })
})
