import { act, render, screen, waitFor } from '@testing-library/react'
import { App } from './App.tsx'
import { ESPERA_PARA_SALVAR_MS } from './domain/sincronia.ts'
import { nuvemFalsa, type NuvemFalsa } from './domain/nuvemFalsa.test-utils.ts'
import type { Backup } from './domain/perfil.ts'
import type { ValorConta } from './ui/estado/usarConta.ts'
import { contaFalsa } from './ui/publico/conta/contaFalsa.test-utils.ts'
import { ProvedorTema } from './ui/tema/ProvedorTema.tsx'

// Os testes de ponta a ponta da spec dados-na-nuvem: o App inteiro, com a tabela `copias` de mentira.
const estado = vi.hoisted(() => ({ conta: null as unknown, nuvem: null as unknown }))

vi.mock('./ui/estado/usarConta.ts', () => ({ useConta: () => estado.conta }))
vi.mock('./ui/estado/supabase.ts', () => ({
  obterSupabase: () => (estado.nuvem as NuvemFalsa | null)?.cliente ?? null,
  supabaseConfigurado: () => true,
}))
vi.mock('./ui/estado/usarAssinatura.ts', () => ({
  useAssinatura: () => ({
    assinatura: { plano: 'free', planoPedido: 'free', status: 'sem-assinatura', expiraEm: null, ciclo: null, valorCentavos: 0, cartaoBandeira: null, cartaoFinal: null, proximaCobranca: null },
    carregado: true,
    carregando: false,
    assinar: vi.fn(),
    cancelar: vi.fn(),
    previaDoCancelamento: vi.fn(),
    trocarCartao: vi.fn(),
    recarregar: vi.fn(),
  }),
}))
vi.mock('./ui/pagamento/processadorMercadoPago.ts', () => ({ processadorDoSite: () => null }))
vi.mock('./ui/estado/usarPerfilConta.ts', () => ({
  usePerfilConta: () => ({
    perfil: { nome: 'Maria', situacao: 'nutricionista', crn: { regiao: 6, numero: '12345' }, statusCrn: 'conferido', crnDeclaradoEm: '2026-09-30T12:00:00Z', crnDecididoEm: null },
    ehAdmin: false,
    carregado: true,
    falhou: false,
    informarSituacao: vi.fn(async () => null),
    meFormei: vi.fn(async () => null),
    corrigirCrn: vi.fn(async () => null),
    recarregar: vi.fn(),
  }),
}))
vi.mock('./ui/estado/usarPedidoEstudante.ts', () => ({
  usePedidoEstudante: () => ({ pedido: null, carregado: true, enviar: vi.fn(async () => null), fecharAviso: vi.fn(async () => undefined), recarregar: vi.fn() }),
}))
vi.mock('./ui/estado/usarAprovacoes.ts', () => ({
  useAprovacoes: () => ({ pedidos: [], crns: [], pendentes: { estudantes: 0, crn: 0, total: 0 }, carregado: true, erro: null, decidirPedido: vi.fn(), decidirCrn: vi.fn(), abrirComprovante: vi.fn(), recarregar: vi.fn() }),
}))
vi.mock('./ui/estado/usarNegocio.ts', () => ({
  FALHA_AO_LER_NEGOCIO: 'Não consegui ler os números agora. Confira a internet e toque em Atualizar.',
  useNegocio: () => ({ dados: null, carregando: false, erro: null, atualizar: vi.fn() }),
}))

const comSessao = (id = 'conta-a'): ValorConta => contaFalsa({ sessao: { id, email: `${id}@exemplo.com`, nome: 'Maria' } })
const tela = () => (
  <ProvedorTema>
    <App />
  </ProvedorTema>
)

const paciente = (id: string, nome: string, atualizadoEm = '2026-10-01T00:00:00.000Z') => ({ id, nome, criadoEm: '2026-10-01T00:00:00.000Z', atualizadoEm })
const copiaCom = (dados: Record<string, string>): Backup => ({ formato: 1, geradoEm: '2026-10-07T00:00:00.000Z', dados })
const pacientesNaNuvem = (nuvem: NuvemFalsa): string[] =>
  (JSON.parse((nuvem.linhas.get('conta-a')?.dados as Backup | undefined)?.dados['metanutri:pacientes'] ?? '[]') as { nome: string }[]).map((p) => p.nome).sort()

let nuvem: NuvemFalsa

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('metanutri:conta:conta-a:aviso-inicial-visto', '1')
  window.location.hash = '#/pacientes'
  nuvem = nuvemFalsa()
  estado.nuvem = nuvem
  estado.conta = comSessao()
})

describe('abrir os dados da nuvem ao entrar (spec dados-na-nuvem)', () => {
  it('CA-475: a conta entra num navegador sem nada e vê os pacientes que estão na nuvem', async () => {
    nuvem.guardar('conta-a', copiaCom({ 'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana Lima')]) }), '2026-10-07T00:00:00.000Z')
    render(tela())
    expect(screen.getByRole('status')).toHaveTextContent('Carregando seus dados…')
    expect(await screen.findByText('Ana Lima')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Pacientes' })).toBeInTheDocument()
  })

  it('CA-484: sem internet na entrada, a tela diz que não dá para abrir e tenta de novo quando a internet volta', async () => {
    nuvem.guardar('conta-a', copiaCom({ 'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana Lima')]) }), '2026-10-07T00:00:00.000Z')
    nuvem.semInternet = true
    render(tela())
    expect(await screen.findByText('Sem internet. Conecte-se para abrir seus dados.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Pacientes' })).not.toBeInTheDocument()

    nuvem.semInternet = false
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(await screen.findByText('Ana Lima')).toBeInTheDocument()
  })

  it('CA-481: os dados de antes desta mudança vão para a nuvem, juntados com a cópia que já existia, e nada some', async () => {
    // Dados sem prefixo e sem dono (de antes da conta por aparelho) e dados já no espaço da conta.
    localStorage.setItem('metanutri:pacientes', JSON.stringify([paciente('bia', 'Bia Souza')]))
    nuvem.guardar('conta-a', copiaCom({ 'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana Lima')]) }), '2026-10-07T00:00:00.000Z')
    render(tela())
    expect(await screen.findByText('Ana Lima')).toBeInTheDocument()
    expect(screen.getByText('Bia Souza')).toBeInTheDocument()
    await waitFor(() => expect(pacientesNaNuvem(nuvem)).toEqual(['Ana Lima', 'Bia Souza']))
    expect(localStorage.getItem('metanutri:pacientes')).toBeNull()
  })

  it('DP-14: sem o cliente da nuvem, a área de trabalho abre na hora, como antes', () => {
    estado.nuvem = null
    localStorage.setItem('metanutri:conta:conta-a:pacientes', JSON.stringify([paciente('ana', 'Ana Lima')]))
    render(tela())
    expect(screen.getByText('Ana Lima')).toBeInTheDocument()
    expect(screen.queryByText('Carregando seus dados…')).not.toBeInTheDocument()
  })
})

describe('o link do paciente (CB-126)', () => {
  const link = {
    formato: 1,
    itens: [{ id: 'l1', token: 'abc123', casoId: 'p1', pacienteId: null, nome: 'Ana Lima', criadoEm: '2026-10-01T00:00:00.000Z', missoes: [], marcacoes: [], usoNaoComercial: false }],
  }

  it('CB-126: sem conta, o link abre como hoje e a cópia da conta não é lida', async () => {
    estado.conta = contaFalsa()
    localStorage.setItem('metanutri:acompanhamentos', JSON.stringify(link))
    window.location.hash = '#/missoes/abc123'
    render(tela())
    expect(await screen.findByRole('heading', { level: 1, name: /Ana/ })).toBeInTheDocument()
    expect(nuvem.pedidos).toEqual([])
  })

  it('CB-126: com a conta entrando e a nuvem ainda respondendo, o link não espera a cópia', async () => {
    localStorage.setItem('metanutri:conta:conta-a:acompanhamentos', JSON.stringify(link))
    nuvem.segurar = true
    window.location.hash = '#/missoes/abc123'
    render(tela())
    expect(screen.queryByText('Carregando seus dados…')).not.toBeInTheDocument()
    nuvem.soltar()
    expect(await screen.findByRole('heading', { level: 1, name: /Ana/ })).toBeInTheDocument()
  })
})

describe('salvar sozinho (D-129)', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('CA-476: uma mudança vai para a nuvem em poucos segundos e a barra mostra "Salvo"', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(tela())
    expect(await screen.findByText('Salvo')).toBeInTheDocument()

    act(() => screen.getByRole('button', { name: 'Novo paciente' }).click())
    expect(screen.getByRole('heading', { level: 1, name: 'Paciente sem nome' })).toBeInTheDocument()
    expect(screen.getByText('Salvando…')).toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(ESPERA_PARA_SALVAR_MS))
    expect(screen.getByText('Salvo')).toBeInTheDocument()
    expect(pacientesNaNuvem(nuvem)).toEqual([''])
  })

  it('DP-14: sem nuvem, a barra não mostra estado de salvar', () => {
    estado.nuvem = null
    render(tela())
    expect(screen.queryByText('Salvo')).not.toBeInTheDocument()
    expect(screen.queryByText('Salvando…')).not.toBeInTheDocument()
  })
})
