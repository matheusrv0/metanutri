import { act, render, screen, waitFor } from '@testing-library/react'
import { App } from './App.tsx'
import { ESPERA_PARA_SALVAR_MS } from './domain/sincronia.ts'
import { nuvemFalsa, type NuvemFalsa } from './domain/nuvemFalsa.test-utils.ts'
import type { Backup } from './domain/perfil.ts'
import type { ValorConta } from './ui/estado/usarConta.ts'
import { contaFalsa } from './ui/publico/conta/contaFalsa.test-utils.ts'
import { gravarMarca } from './ui/sessao/marcaDeUso.ts'
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
  FALHA_AO_LER_NEGOCIO: 'Não foi possível ler os números agora. Confira a internet e toque em Atualizar.',
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
  localStorage.setItem('metanutri:conta:conta-a:aviso-nuvem-visto', '1')
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

describe('aba esquecida aberta (CB-127)', () => {
  it('CB-127: a janela volta ao foco, a aba confere a nuvem e mostra o que outro aparelho salvou', async () => {
    nuvem.guardar('conta-a', copiaCom({ 'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana Lima')]) }), '2026-10-07T00:00:00.000Z')
    render(tela())
    expect(await screen.findByText('Ana Lima')).toBeInTheDocument()

    // Outro aparelho salvou depois: a linha da nuvem tem versão nova.
    nuvem.guardar('conta-a', copiaCom({ 'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana Lima'), paciente('bia', 'Bia Souza')]) }), '2026-10-08T00:00:00.000Z')
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(await screen.findByText('Bia Souza')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Atualizando…' })).not.toBeInTheDocument())
  })
})

describe('textos do D-128', () => {
  it('D-128: com a conta na nuvem, o menu não diz que os planos ficam só neste aparelho', async () => {
    render(tela())
    await screen.findByText('Salvo')
    expect(screen.queryByText('Planos salvos só neste aparelho')).not.toBeInTheDocument()
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
    // DP-27: "Salvando…" aparece, mas o leitor de tela só anuncia o "Salvo".
    expect(screen.getByText('Salvando…')).toHaveAttribute('aria-hidden', 'true')

    await act(() => vi.advanceTimersByTimeAsync(ESPERA_PARA_SALVAR_MS))
    expect(screen.getByText('Salvo')).not.toHaveAttribute('aria-hidden')
    expect(screen.getByRole('status')).toHaveTextContent('Salvo')
    expect(pacientesNaNuvem(nuvem)).toEqual([''])
  })

  it('DP-14: sem nuvem, a barra não mostra estado de salvar', () => {
    estado.nuvem = null
    render(tela())
    expect(screen.queryByText('Salvo')).not.toBeInTheDocument()
    expect(screen.queryByText('Salvando…')).not.toBeInTheDocument()
  })
})

describe('sem internet e cópia grande demais (D-130, CB-123)', () => {
  const SEM_INTERNET = 'Sem internet. Suas últimas mudanças ainda não foram salvas na nuvem. Conecte-se para continuar.'

  afterEach(() => {
    vi.useRealTimers()
  })

  it('CA-477: cai a internet: a área fica coberta e não deixa editar; volta: o que faltava é salvo e a área destrava sozinha', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(tela())
    expect(await screen.findByText('Salvo')).toBeInTheDocument()

    nuvem.semInternet = true
    act(() => screen.getByRole('button', { name: 'Novo paciente' }).click())
    await act(() => vi.advanceTimersByTimeAsync(ESPERA_PARA_SALVAR_MS))
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByRole('dialog')).toHaveTextContent(SEM_INTERNET)
    // O campo do paciente continua na tela, atrás da capa, mas fora do alcance.
    expect(screen.queryByRole('textbox', { name: 'Nome' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nome', hidden: true })).toBeInTheDocument()

    nuvem.semInternet = false
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(pacientesNaNuvem(nuvem)).toEqual([''])
    expect(screen.getByText('Salvo')).toBeInTheDocument()
  })

  it('CB-123: a cópia passa do limite: a frase do CA-445 cobre a área; "Liberar espaço" deixa a frase no alto da tela', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(tela())
    expect(await screen.findByText('Salvo')).toBeInTheDocument()

    nuvem.limite = 10
    act(() => screen.getByRole('button', { name: 'Novo paciente' }).click())
    await act(() => vi.advanceTimersByTimeAsync(ESPERA_PARA_SALVAR_MS))
    const trava = screen.getByRole('dialog')
    expect(trava).toHaveTextContent('Seus dados passaram de 5 MB, o limite da conta. Exclua o que não usa mais para voltar a salvar.')

    act(() => screen.getByRole('button', { name: 'Liberar espaço' }).click())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('Seus dados passaram de 5 MB, o limite da conta. Exclua o que não usa mais para voltar a salvar.')).toBeInTheDocument()
    expect(screen.queryByText('Salvo')).not.toBeInTheDocument()
  })
})

describe('a saída por tempo com a nuvem (spec separacao-site-app, D-517)', () => {
  const MIN = 60_000
  /** A sessão de conta-a passou dos 30 minutos sem uso; a aba volta a ficar visível (CA-1458). */
  const vencerAoVoltar = () => {
    gravarMarca(localStorage, { conta: 'conta-a', uso: Date.now() - 31 * MIN, entrada: Date.now() - 60 * MIN, admin: false, desvio: 0 })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
  }

  it('CA-1447: com a nuvem em dia, a capa cobre a tela, o motor para e a conta sai apagando o espaço', async () => {
    nuvem.guardar('conta-a', copiaCom({ 'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana Lima')]) }), '2026-10-07T00:00:00.000Z')
    const conta = comSessao()
    estado.conta = conta
    render(tela())
    expect(await screen.findByText('Ana Lima')).toBeInTheDocument()
    vencerAoVoltar()
    // A volta para a aba também confere a nuvem ("Atualizando…", CB-127); a capa da saída vem junto.
    expect(screen.getByText('Encerrando a sessão…')).toBeInTheDocument()
    await waitFor(() => expect(conta.sairPorTempo).toHaveBeenCalledWith({ apagar: true, ate: expect.any(Number) }))
    // O motor parou antes: as outras abas ficam sabendo (DP-11).
    expect(JSON.parse(localStorage.getItem('metanutri:conta:conta-a:nuvem') ?? '{}')).toMatchObject({ saiu: true })
  })

  it('CA-1448: sem internet, o que não subiu segura o espaço, e a conta sai mesmo assim', async () => {
    nuvem.guardar('conta-a', copiaCom({ 'metanutri:pacientes': JSON.stringify([paciente('ana', 'Ana Lima')]) }), '2026-10-07T00:00:00.000Z')
    const conta = comSessao()
    estado.conta = conta
    render(tela())
    expect(await screen.findByText('Ana Lima')).toBeInTheDocument()
    nuvem.semInternet = true
    const chave = 'metanutri:conta:conta-a:nuvem'
    const situacao = JSON.parse(localStorage.getItem(chave) ?? '{}') as { mudancas: number }
    localStorage.setItem(chave, JSON.stringify({ ...situacao, mudancas: situacao.mudancas + 1 }))
    vencerAoVoltar()
    await waitFor(() => expect(conta.sairPorTempo).toHaveBeenCalledWith({ apagar: false, ate: expect.any(Number) }), { timeout: 15_000 })
  }, 20_000)
})
