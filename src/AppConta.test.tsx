import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App.tsx'
import { CHAVE_DONO } from './domain/donoDosDados.ts'
import { CHAVE_AVISO_VISTO } from './ui/casos/AvisoPrimeiroAcesso.tsx'
import type { ValorConta } from './ui/estado/usarConta.ts'
import { contaFalsa } from './ui/publico/conta/contaFalsa.test-utils.ts'
import { ProvedorTema } from './ui/tema/ProvedorTema.tsx'

const estado = vi.hoisted(() => ({ conta: null as unknown }))

vi.mock('./ui/estado/usarConta.ts', () => ({ useConta: () => estado.conta }))
vi.mock('./ui/estado/usarAssinatura.ts', () => ({
  useAssinatura: () => ({
    assinatura: { plano: 'free', planoPedido: 'free', status: 'sem-assinatura', precoTravado: false, expiraEm: null },
    carregado: true,
    carregando: false,
    vagasRestantes: 186,
    assinar: vi.fn(),
    recarregar: vi.fn(),
  }),
}))

const verificacao = vi.hoisted(() => ({
  perfil: { nome: 'Maria', situacao: 'nutricionista', crn: { regiao: 6, numero: '12345' }, statusCrn: 'em_conferencia', crnDeclaradoEm: '2026-09-30T12:00:00Z', crnDecididoEm: null } as unknown,
  ehAdmin: false,
  pedido: null as unknown,
}))

vi.mock('./ui/estado/usarPerfilConta.ts', () => ({
  usePerfilConta: () => ({
    perfil: verificacao.perfil,
    ehAdmin: verificacao.ehAdmin,
    carregado: true,
    falhou: false,
    informarSituacao: vi.fn(async () => null),
    meFormei: vi.fn(async () => null),
    corrigirCrn: vi.fn(async () => null),
    recarregar: vi.fn(),
  }),
}))
vi.mock('./ui/estado/usarPedidoEstudante.ts', () => ({
  usePedidoEstudante: () => ({ pedido: verificacao.pedido, carregado: true, enviar: vi.fn(async () => null), fecharAviso: vi.fn(async () => undefined), recarregar: vi.fn() }),
}))
vi.mock('./ui/estado/usarAprovacoes.ts', () => ({
  useAprovacoes: () => ({
    pedidos: [],
    crns: [],
    pendentes: { estudantes: 0, crn: 0, total: 0 },
    carregado: true,
    erro: null,
    decidirPedido: vi.fn(),
    decidirCrn: vi.fn(),
    abrirComprovante: vi.fn(),
    recarregar: vi.fn(),
  }),
}))

const comSessao = (id: string): ValorConta => contaFalsa({ sessao: { id, email: `${id}@exemplo.com`, nome: 'Maria' } })
const tela = () => (
  <ProvedorTema>
    <App />
  </ProvedorTema>
)

describe('App com a conta ligada (spec estilo-spora)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(CHAVE_AVISO_VISTO, '1')
    window.location.hash = ''
    estado.conta = contaFalsa()
    verificacao.perfil = { nome: 'Maria', situacao: 'nutricionista', crn: { regiao: 6, numero: '12345' }, statusCrn: 'em_conferencia', crnDeclaradoEm: '2026-09-30T12:00:00Z', crnDecididoEm: null }
    verificacao.ehAdmin = false
    verificacao.pedido = null
  })

  it('CA-148 e CA-137: tela de trabalho sem sessão mostra Entrar, e abre sozinha quando a sessão chega', () => {
    window.location.hash = '#/pacientes'
    const { rerender } = render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByText('Entre para continuar de onde parou.')).toBeInTheDocument()

    estado.conta = comSessao('conta-1')
    rerender(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Pacientes' })).toBeInTheDocument()
  })

  it('CA-149: termos abrem sem sessão', () => {
    window.location.hash = '#/termos'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Termos de uso' })).toBeInTheDocument()
  })

  it('CA-150: sem servidor, o app abre no modo local', () => {
    estado.conta = contaFalsa({ disponivel: false })
    window.location.hash = '#/pacientes'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Pacientes' })).toBeInTheDocument()
  })

  it('CA-151: a primeira conta adota os dados do aparelho', () => {
    localStorage.setItem('metanutri:casos', '[]')
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/painel'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
    expect(localStorage.getItem(CHAVE_DONO)).toBe('conta-1')
  })

  it('CA-152 e CA-153: outra conta não vê nada, e apagar pede confirmação antes', async () => {
    localStorage.setItem(CHAVE_DONO, 'conta-1')
    localStorage.setItem('metanutri:casos', '["x"]')
    localStorage.setItem('metanutri:caso:x', '{}')
    estado.conta = comSessao('conta-2')
    window.location.hash = '#/painel'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Este aparelho tem dados de outra conta' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Painel' })).not.toBeInTheDocument()

    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Apagar os dados deste aparelho e continuar' }))
    expect(localStorage.getItem('metanutri:casos')).toBe('["x"]')
    await usuario.click(screen.getByRole('button', { name: 'Apagar e continuar' }))
    expect(localStorage.getItem('metanutri:casos')).toBeNull()
    expect(localStorage.getItem('metanutri:caso:x')).toBeNull()
    expect(localStorage.getItem(CHAVE_DONO)).toBe('conta-2')
  })

  it('CA-164: checkout sem sessão pede para entrar; com sessão, abre', () => {
    window.location.hash = '#/assinar/solo/anual'
    const { rerender } = render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    estado.conta = comSessao('conta-1')
    rerender(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Revise sua assinatura' })).toBeInTheDocument()
  })

  it('CB-49: o link do paciente abre sem pedir entrada', () => {
    window.location.hash = '#/missoes/abc123'
    render(tela())
    expect(screen.queryByRole('heading', { level: 1, name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('CA-259: Criar conta no topo da landing vai para o cadastro, não para o painel', async () => {
    window.location.hash = '#/inicio'
    render(tela())
    await userEvent.setup().click(screen.getAllByRole('button', { name: /Começar grátis/ })[0] as HTMLElement)
    expect(window.location.hash).toBe('#/criar-conta')
  })

  it('CB-68: conta sem situação vê "Complete seu cadastro" antes do painel', () => {
    verificacao.perfil = null
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/painel'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Complete seu cadastro' })).toBeInTheDocument()
  })

  it('CB-68: administrador sem situação entra direto', () => {
    verificacao.perfil = null
    verificacao.ehAdmin = true
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/painel'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
  })

  it('CA-279: estudante sem pedido vê o aviso para enviar o comprovante', () => {
    verificacao.perfil = { nome: 'Júlia', situacao: 'estudante', crn: null, statusCrn: null, crnDeclaradoEm: null, crnDecididoEm: null }
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/painel'
    render(tela())
    expect(screen.getByText('Envie seu comprovante de matrícula')).toBeInTheDocument()
  })

  it('CA-292: quem não é administrador não vê Aprovações e cai no painel', () => {
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/aprovacoes'
    render(tela())
    expect(screen.queryByRole('button', { name: /Aprovações/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
  })

  it('CA-291: administrador vê Aprovações no menu e abre a tela', () => {
    verificacao.ehAdmin = true
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/aprovacoes'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Aprovações' })).toBeInTheDocument()
  })

  it('comprovar matrícula é só para estudante', () => {
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/comprovar-matricula'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
  })
})
