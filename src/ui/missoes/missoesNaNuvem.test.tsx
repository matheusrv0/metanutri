// Spec missoes-na-nuvem: o link do paciente sai do navegador da nutricionista e vai
// para a nuvem, e a tela de Adesão lê de lá o que o paciente marcou no celular dele.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarAcompanhamento, type Acompanhamento, type MarcacaoDia } from '@/domain/acompanhamento.ts'
import { LIMITE_DE_LINKS, type ClienteMissoes } from '@/domain/fonteSupabase.ts'
import type { Missao } from '@/domain/missoes.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { criarRepositorioAcompanhamentos, type RepositorioAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { ProvedorAcompanhamentos } from '@/ui/estado/ProvedorAcompanhamentos.tsx'
import { FALHA_DE_REDE } from '@/ui/estado/mensagemDoBanco.ts'
import { CartaoLinkMissoes } from './CartaoLinkMissoes.tsx'
import { TelaAdesao } from './TelaAdesao.tsx'

const LIMITE = LIMITE_DE_LINKS
const NAO_SALVOU = 'Não consegui salvar o link na nuvem. O paciente ainda não consegue abrir. Tente de novo.'
const SEM_ATUALIZAR = 'Não consegui atualizar com a nuvem. Mostrando a cópia deste aparelho.'

type Linha = Record<string, unknown>
type Segurado = 'select' | 'upsert'

/** Uma tabela `acompanhamentos` em memória, com o limite de links do servidor (010). */
const nuvem = vi.hoisted(() => ({
  ligada: true,
  /** Servidor ligado, mas a sessão sumiu (token vencido sem internet). */
  semSessao: false,
  linhas: [] as Record<string, unknown>[],
  limite: null as number | null,
  falha: { select: false, upsert: false, delete: false },
  chamadas: [] as string[],
  /** Pedidos que só respondem quando o teste soltar: é assim que se testa a corrida. */
  segurar: { select: false, upsert: false } as Record<'select' | 'upsert', boolean>,
  soltar: [] as (() => void)[],
}))

interface RespostaFalsa {
  readonly data: unknown
  readonly error: { readonly message: string; readonly code?: string } | null
}

const SEM_INTERNET: RespostaFalsa = { data: null, error: { message: 'TypeError: Failed to fetch' } }

/** Responde agora, ou quando o teste soltar. `fazer` roda na hora da resposta. */
function responder(tipo: Segurado, fazer: () => RespostaFalsa): Promise<RespostaFalsa> {
  if (!nuvem.segurar[tipo]) return Promise.resolve(fazer())
  return new Promise((resolver) => nuvem.soltar.push(() => resolver(fazer())))
}

/** Uma promessa que também aceita `.select()`, como o pedido do cliente de verdade. */
const comSelect = (promessa: Promise<RespostaFalsa>) => Object.assign(promessa, { select: () => promessa })

function clienteDaNuvem(): ClienteMissoes {
  return {
    rpc: (nome) => {
      nuvem.chamadas.push(`rpc:${nome}`)
      return Promise.resolve({ data: null, error: null })
    },
    from: () => ({
      select: () => ({
        eq: (coluna, valor) => {
          nuvem.chamadas.push('select')
          // A foto é tirada quando o pedido chega ao banco, mesmo que a resposta demore.
          const foto: RespostaFalsa = nuvem.falha.select
            ? SEM_INTERNET
            : { data: nuvem.linhas.filter((l) => l[coluna] === valor).map((l) => ({ ...l })), error: null }
          return responder('select', () => foto)
        },
      }),
      upsert: (linha, opcoes) => {
        nuvem.chamadas.push(opcoes?.ignoreDuplicates ? 'criar-se-faltar' : 'gravar')
        return comSelect(
          responder('upsert', () => {
            if (nuvem.falha.upsert) return SEM_INTERNET
            const i = nuvem.linhas.findIndex((l) => l['id'] === linha['id'])
            if (i === -1) {
              if (nuvem.limite !== null && nuvem.linhas.length >= nuvem.limite) {
                return { data: null, error: { code: 'P0001', message: LIMITE } }
              }
              nuvem.linhas.push({ marcacoes: [], ...linha })
              return { data: [{ id: linha['id'] }], error: null }
            }
            if (!opcoes?.ignoreDuplicates) nuvem.linhas[i] = { ...nuvem.linhas[i], ...linha }
            return { data: opcoes?.ignoreDuplicates ? [] : [{ id: linha['id'] }], error: null }
          }),
        )
      },
      update: (campos) => ({
        eq: (coluna, valor) => {
          nuvem.chamadas.push('atualizar')
          return comSelect(
            responder('upsert', () => {
              if (nuvem.falha.upsert) return SEM_INTERNET
              const i = nuvem.linhas.findIndex((l) => l[coluna] === valor)
              if (i === -1) return { data: [], error: null }
              nuvem.linhas[i] = { ...nuvem.linhas[i], ...campos }
              return { data: [{ id: valor }], error: null }
            }),
          )
        },
      }),
      delete: () => ({
        eq: (coluna, valor) => {
          nuvem.chamadas.push('apagar')
          if (nuvem.falha.delete) return Promise.resolve(SEM_INTERNET)
          nuvem.linhas = nuvem.linhas.filter((l) => l[coluna] !== valor)
          return Promise.resolve({ data: null, error: null })
        },
      }),
    }),
    auth: {
      getSession: () =>
        Promise.resolve(
          nuvem.semSessao
            ? { data: { session: null }, error: { message: 'Invalid Refresh Token: Refresh Token Not Found' } }
            : { data: { session: { user: { id: 'u1' } } }, error: null },
        ),
    },
  }
}

vi.mock('@/ui/estado/supabase.ts', () => ({
  obterSupabase: () => (nuvem.ligada ? clienteDaNuvem() : null),
  supabaseConfigurado: () => nuvem.ligada,
}))

/** Solta o pedido segurado mais antigo e deixa a tela reagir. */
async function soltarUm() {
  const proximo = nuvem.soltar.shift()
  if (!proximo) throw new Error('Nenhum pedido segurado para soltar.')
  await act(async () => {
    proximo()
    await Promise.resolve()
  })
}

const MISSOES: readonly Missao[] = [
  { id: 'refeicao-1', texto: 'Café da manhã por volta das 07:00', origem: 'Refeição do plano' },
  { id: 'agua', texto: 'Beber cerca de 2 litros de água', origem: '35 ml por quilo' },
]

const HOJE = '2026-09-26'
const SEMANA_EM_DIA: readonly MarcacaoDia[] = ['2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26'].map((dia) => ({ dia, feitas: ['agua'] }))

function memoria(): Armazenamento {
  const dados = new Map<string, string>()
  return {
    getItem: (c) => dados.get(c) ?? null,
    setItem: (c, v) => void dados.set(c, v),
    removeItem: (c) => void dados.delete(c),
  }
}

let n = 0
function acompanhamentoDe(casoId: string, nome: string, marcacoes: readonly MarcacaoDia[] = []): Acompanhamento {
  n += 1
  const base = criarAcompanhamento(
    { casoId, pacienteId: null, nome, missoes: MISSOES },
    { agora: () => '2026-09-01T10:00:00.000Z', gerarId: () => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`, aleatorio: (t) => new Uint8Array(t).fill(n) },
  )
  return { ...base, marcacoes }
}

/** A mesma linha que o banco guardaria para este acompanhamento. */
function linhaDe(a: Acompanhamento): Linha {
  return {
    id: a.id,
    nutricionista_id: 'u1',
    token: a.token,
    caso_id: a.casoId,
    paciente_id: a.pacienteId,
    nome: a.nome,
    criado_em: a.criadoEm,
    missoes: a.missoes,
    marcacoes: a.marcacoes,
    uso_nao_comercial: a.usoNaoComercial,
  }
}

function cartao(repo: RepositorioAcompanhamentos, casoId = 'c1') {
  return render(
    <ProvedorAcompanhamentos repositorio={repo}>
      <CartaoLinkMissoes casoId={casoId} pacienteId={null} nome="Ana" missoes={MISSOES} plano="pro" hoje={HOJE} />
    </ProvedorAcompanhamentos>,
  )
}

function adesao(repo: RepositorioAcompanhamentos) {
  return render(
    <ProvedorAcompanhamentos repositorio={repo}>
      <TelaAdesao aoAbrirPlano={vi.fn()} plano="pro" hoje={HOJE} />
    </ProvedorAcompanhamentos>,
  )
}

async function gerarLink(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(screen.getByRole('button', { name: /Gerar link das missões/ }))
  await usuario.click(screen.getByRole('button', { name: /Já tenho a autorização/ }))
}

const linhaDoPaciente = (nome: string) => screen.getAllByRole('listitem').find((li) => within(li).queryByText(nome)) as HTMLElement

beforeEach(() => {
  nuvem.ligada = true
  nuvem.semSessao = false
  nuvem.linhas = []
  nuvem.limite = null
  nuvem.falha = { select: false, upsert: false, delete: false }
  nuvem.chamadas = []
  nuvem.segurar = { select: false, upsert: false }
  nuvem.soltar = []
})

describe('Criar e gerar de novo o link (D-103)', () => {
  it('CA-438: o link criado fica na nuvem, para o paciente abrir no celular dele', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    cartao(repo)

    await gerarLink(usuario)

    const token = repo.porCaso('c1')?.token
    expect(token).toBeTruthy()
    await waitFor(() => expect(nuvem.linhas).toHaveLength(1))
    expect(nuvem.linhas[0]).toMatchObject({ token, caso_id: 'c1', nutricionista_id: 'u1', nome: 'Ana' })
    expect((screen.getByLabelText('Link do paciente') as HTMLInputElement).value).toContain(`#/missoes/${token}`)
  })

  it('CA-438: gerar de novo troca o token também na nuvem', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const antigo = acompanhamentoDe('c1', 'Ana')
    repo.salvar(antigo)
    nuvem.linhas = [linhaDe(antigo)]
    cartao(repo)

    await usuario.click(await screen.findByRole('button', { name: /Gerar link novo/ }))

    const novo = repo.porCaso('c1')?.token
    expect(novo).not.toBe(antigo.token)
    await waitFor(() => expect(nuvem.linhas[0]?.['token']).toBe(novo))
    expect(nuvem.linhas).toHaveLength(1)
  })

  it('CB-105: gerar de novo não apaga o que o paciente marcou na nuvem depois que a tela abriu', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const antigo = acompanhamentoDe('c1', 'Ana')
    repo.salvar(antigo)
    nuvem.linhas = [linhaDe(antigo)]
    cartao(repo)
    await waitFor(() => expect(nuvem.chamadas).toContain('select'))

    // O paciente marca no celular enquanto o plano está aberto aqui.
    nuvem.linhas = [{ ...linhaDe(antigo), marcacoes: SEMANA_EM_DIA }]
    await usuario.click(screen.getByRole('button', { name: /Gerar link novo/ }))

    await waitFor(() => expect(nuvem.linhas[0]?.['token']).toBe(repo.porCaso('c1')?.token))
    expect(nuvem.linhas[0]?.['marcacoes']).toEqual(SEMANA_EM_DIA)
  })

  it('CA-439: a nuvem recusa: a tela avisa, oferece tentar de novo e a cópia do aparelho fica', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    nuvem.falha.upsert = true
    cartao(repo)

    await gerarLink(usuario)

    expect(await screen.findByText(NAO_SALVOU)).toBeInTheDocument()
    expect(repo.porCaso('c1')).not.toBeNull()
    expect(screen.getByLabelText('Link do paciente')).toBeInTheDocument()

    nuvem.falha.upsert = false
    await usuario.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    await waitFor(() => expect(screen.queryByText(NAO_SALVOU)).not.toBeInTheDocument())
    expect(nuvem.linhas[0]?.['token']).toBe(repo.porCaso('c1')?.token)
  })

  it('CA-442: passar do limite do plano avisa e não deixa link pela metade', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    nuvem.limite = 0
    cartao(repo)

    await gerarLink(usuario)

    expect(await screen.findByText(LIMITE)).toBeInTheDocument()
    expect(repo.listar()).toEqual([])
    expect(nuvem.linhas).toEqual([])
    expect(screen.queryByLabelText('Link do paciente')).not.toBeInTheDocument()
  })

  it('CB-107: o link que chegou à nuvem fica marcado no aparelho', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    cartao(repo)

    await gerarLink(usuario)

    const id = repo.porCaso('c1')?.id ?? ''
    await waitFor(() => expect(repo.estaNaNuvem(id)).toBe(true))
  })

  it('CB-107: o link que a nuvem recusou não fica marcado: ele ainda vai subir', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    nuvem.falha.upsert = true
    cartao(repo)

    await gerarLink(usuario)

    expect(await screen.findByText(NAO_SALVOU)).toBeInTheDocument()
    expect(repo.estaNaNuvem(repo.porCaso('c1')?.id ?? '')).toBe(false)
  })

  it('CB-107: gerar de novo sem internet não tira a marca de um link que já estava na nuvem', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const antigo = acompanhamentoDe('c1', 'Ana')
    repo.salvar(antigo, { naNuvem: true })
    nuvem.linhas = [linhaDe(antigo)]
    cartao(repo)
    await waitFor(() => expect(nuvem.chamadas).toContain('select'))

    nuvem.falha.upsert = true
    await usuario.click(screen.getByRole('button', { name: /Gerar link novo/ }))

    expect(await screen.findByText(NAO_SALVOU)).toBeInTheDocument()
    expect(repo.estaNaNuvem(antigo.id)).toBe(true)
  })

  it('CA-444: sem servidor, o link é gerado só no aparelho, como antes', async () => {
    nuvem.ligada = false
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    cartao(repo)

    await gerarLink(usuario)

    expect(repo.porCaso('c1')).not.toBeNull()
    expect(screen.getByLabelText('Link do paciente')).toBeInTheDocument()
    expect(screen.queryByText(NAO_SALVOU)).not.toBeInTheDocument()
    expect(nuvem.chamadas).toEqual([])
  })
})

describe('Remover o link (D-103)', () => {
  it('CA-440: remover tira o link da nuvem e do aparelho', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    repo.salvar(ana)
    nuvem.linhas = [linhaDe(ana)]
    adesao(repo)

    await usuario.click(await screen.findByRole('button', { name: 'Remover link' }))
    await usuario.click(screen.getByRole('button', { name: 'Remover' }))

    expect(await screen.findByText('Nenhum paciente acompanhando ainda')).toBeInTheDocument()
    expect(nuvem.linhas).toEqual([])
    expect(repo.listar()).toEqual([])
  })

  it('CA-440: falhando a nuvem, a tela avisa e o link continua', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    repo.salvar(ana)
    nuvem.linhas = [linhaDe(ana)]
    nuvem.falha.delete = true
    adesao(repo)

    await usuario.click(await screen.findByRole('button', { name: 'Remover link' }))
    await usuario.click(screen.getByRole('button', { name: 'Remover' }))

    expect(await screen.findByText(/Não consegui remover o link na nuvem/)).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(repo.listar()).toHaveLength(1)
    expect(nuvem.linhas).toHaveLength(1)
  })

  it('CA-440: desistir de remover não apaga nada', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    repo.salvar(ana)
    nuvem.linhas = [linhaDe(ana)]
    adesao(repo)

    await usuario.click(await screen.findByRole('button', { name: 'Remover link' }))
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByRole('button', { name: 'Remover link' })).toBeInTheDocument()
    expect(nuvem.chamadas).not.toContain('apagar')
    expect(repo.listar()).toHaveLength(1)
  })
})

describe('Adesão lê a nuvem (D-104, D-105)', () => {
  it('CA-441: o que o paciente marcou no celular dele aparece em Adesão', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    repo.salvar(ana)
    nuvem.linhas = [{ ...linhaDe(ana), marcacoes: SEMANA_EM_DIA }]
    adesao(repo)

    expect(await within(linhaDoPaciente('Ana')).findByText('Em dia')).toBeInTheDocument()
    expect(repo.porId(ana.id)?.marcacoes).toEqual(SEMANA_EM_DIA)
  })

  it('CA-441: num aparelho novo, os links da conta aparecem', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    nuvem.linhas = [{ ...linhaDe(acompanhamentoDe('c1', 'Ana')), marcacoes: SEMANA_EM_DIA }]
    adesao(repo)

    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(repo.listar()).toHaveLength(1)
  })

  it('CA-441: ao voltar para a aba, Adesão lê de novo', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    repo.salvar(ana)
    nuvem.linhas = [linhaDe(ana)]
    adesao(repo)
    await waitFor(() => expect(nuvem.chamadas).toContain('select'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(within(linhaDoPaciente('Ana')).getByText('Sumindo')).toBeInTheDocument()

    nuvem.linhas = [{ ...linhaDe(ana), marcacoes: SEMANA_EM_DIA }]
    act(() => {
      fireEvent(document, new Event('visibilitychange'))
    })

    expect(await within(linhaDoPaciente('Ana')).findByText('Em dia')).toBeInTheDocument()
  })

  it('CA-441: o cartão do link no plano também mostra o que o paciente marcou', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    repo.salvar(ana)
    nuvem.linhas = [{ ...linhaDe(ana), marcacoes: [{ dia: HOJE, feitas: ['agua'] }] }]
    cartao(repo)

    const hoje = screen.getByText('Hoje').closest('div') as HTMLElement
    expect(await within(hoje).findByText('1/2')).toBeInTheDocument()
  })

  it('CA-443: links que só existem neste aparelho sobem; o que não sobe fica marcado com o motivo', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    // Os dois têm marcações deste aparelho: qualquer um que suba precisa levá-las.
    const ana = acompanhamentoDe('c1', 'Ana', [{ dia: '2026-09-20', feitas: ['agua'] }])
    const bia = acompanhamentoDe('c2', 'Bia', [{ dia: '2026-09-21', feitas: ['refeicao-1'] }])
    repo.salvar(ana)
    repo.salvar(bia)
    nuvem.limite = 1
    adesao(repo)

    await waitFor(() => expect(nuvem.linhas).toHaveLength(1))
    const [subiu, ficou] = nuvem.linhas[0]?.['id'] === ana.id ? [ana, bia] : [bia, ana]

    expect(await within(linhaDoPaciente(ficou.nome)).findByText(`Ainda não está na nuvem. ${LIMITE}`)).toBeInTheDocument()
    expect(within(linhaDoPaciente(subiu.nome)).queryByText(/Ainda não está na nuvem/)).not.toBeInTheDocument()
    // As marcações feitas neste aparelho sobem junto.
    expect(nuvem.linhas[0]?.['marcacoes']).toEqual(subiu.marcacoes)
    expect(repo.listar()).toHaveLength(2)
  })

  it('CB-105: o mesmo link mudado em outro aparelho: vale o que está na nuvem', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const aqui = acompanhamentoDe('c1', 'Ana')
    repo.salvar(aqui)
    const laNaNuvem = { ...linhaDe(aqui), token: 'outrotokenxyz9', nome: 'Ana Souza' }
    nuvem.linhas = [laNaNuvem]
    cartao(repo)

    await waitFor(() => expect((screen.getByLabelText('Link do paciente') as HTMLInputElement).value).toContain('#/missoes/outrotokenxyz9'))
    expect(repo.porId(aqui.id)?.nome).toBe('Ana Souza')
    expect(nuvem.linhas).toEqual([laNaNuvem])
  })

  it('CB-106: sem internet, Adesão mostra a cópia do aparelho e avisa', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(acompanhamentoDe('c1', 'Ana'))
    nuvem.falha.select = true
    adesao(repo)

    expect(await screen.findByText(SEM_ATUALIZAR)).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
  })

  it('CB-106: voltando a internet, o aviso some', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(acompanhamentoDe('c1', 'Ana'))
    nuvem.falha.select = true
    adesao(repo)
    expect(await screen.findByText(SEM_ATUALIZAR)).toBeInTheDocument()

    nuvem.falha.select = false
    act(() => {
      fireEvent(document, new Event('visibilitychange'))
    })

    await waitFor(() => expect(screen.queryByText(SEM_ATUALIZAR)).not.toBeInTheDocument())
  })

  it('CA-444: sem servidor, Adesão mostra o aparelho e não fala em nuvem', async () => {
    nuvem.ligada = false
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(acompanhamentoDe('c1', 'Ana'))
    adesao(repo)

    expect(screen.getByText('Ana')).toBeInTheDocument()
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.queryByText(/nuvem/)).not.toBeInTheDocument()
    expect(nuvem.chamadas).toEqual([])
  })

  it('CB-107: link apagado em outro aparelho não volta: some deste também', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    repo.salvar(ana, { naNuvem: true })
    nuvem.linhas = []
    adesao(repo)

    expect(await screen.findByText('Nenhum paciente acompanhando ainda')).toBeInTheDocument()
    expect(repo.listar()).toEqual([])
    expect(nuvem.linhas).toEqual([])
    expect(nuvem.chamadas).not.toContain('criar-se-faltar')
  })

  it('CB-107: "Apagar tudo" em outro aparelho: sai o que já esteve na nuvem, sobe só o que nunca esteve', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    const bia = acompanhamentoDe('c2', 'Bia')
    const caio = acompanhamentoDe('c3', 'Caio')
    repo.salvar(ana, { naNuvem: true })
    repo.salvar(bia, { naNuvem: true })
    repo.salvar(caio)
    nuvem.linhas = []
    adesao(repo)

    await waitFor(() => expect(repo.listar().map((a) => a.nome)).toEqual(['Caio']))
    await waitFor(() => expect(nuvem.linhas.map((l) => l['id'])).toEqual([caio.id]))
    expect(screen.queryByText('Ana')).not.toBeInTheDocument()
    expect(screen.queryByText('Bia')).not.toBeInTheDocument()
  })

  it('CB-107: o link lido da nuvem fica marcado; se depois sumir de lá, sai daqui', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    nuvem.linhas = [linhaDe(ana)]
    adesao(repo)
    expect(await screen.findByText('Ana')).toBeInTheDocument()
    expect(repo.estaNaNuvem(ana.id)).toBe(true)

    nuvem.linhas = []
    act(() => {
      fireEvent(document, new Event('visibilitychange'))
    })

    expect(await screen.findByText('Nenhum paciente acompanhando ainda')).toBeInTheDocument()
    expect(nuvem.linhas).toEqual([])
  })

  it('CB-107: o link que sobe (D-105) passa a ficar marcado', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    repo.salvar(ana)
    adesao(repo)

    await waitFor(() => expect(repo.estaNaNuvem(ana.id)).toBe(true))
    expect(nuvem.linhas).toHaveLength(1)
  })

  it('CB-107: o link que não subiu continua sem a marca, e tenta de novo na próxima leitura', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    repo.salvar(ana)
    nuvem.limite = 0
    adesao(repo)

    expect(await screen.findByText(`Ainda não está na nuvem. ${LIMITE}`)).toBeInTheDocument()
    expect(repo.estaNaNuvem(ana.id)).toBe(false)
    expect(repo.listar()).toHaveLength(1)
  })

  it('a falha de rede da nuvem chega traduzida, nunca o texto técnico', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(acompanhamentoDe('c1', 'Ana'))
    nuvem.falha.upsert = true
    adesao(repo)

    expect(await screen.findByText(`Ainda não está na nuvem. ${FALHA_DE_REDE}`)).toBeInTheDocument()
    expect(screen.queryByText(/Failed to fetch/)).not.toBeInTheDocument()
  })
})

describe('Servidor ligado e sem sessão (token vencido sem internet)', () => {
  it('salvar não marca o link como na nuvem e avisa', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    nuvem.semSessao = true
    cartao(repo)

    await gerarLink(usuario)

    expect(await screen.findByText(NAO_SALVOU)).toBeInTheDocument()
    const id = repo.porCaso('c1')?.id ?? ''
    expect(repo.estaNaNuvem(id)).toBe(false)
    expect(nuvem.chamadas).not.toContain('criar-se-faltar')
  })

  it('remover não tira o link do aparelho', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    repo.salvar(ana, { naNuvem: true })
    nuvem.linhas = [linhaDe(ana)]
    nuvem.semSessao = true
    adesao(repo)

    await usuario.click(screen.getByRole('button', { name: 'Remover link' }))
    await usuario.click(screen.getByRole('button', { name: 'Remover' }))

    expect(await screen.findByText(/Não consegui remover o link na nuvem/)).toBeInTheDocument()
    expect(repo.listar()).toHaveLength(1)
    expect(nuvem.linhas).toHaveLength(1)
  })

  it('a leitura falha: avisa e não apaga do aparelho o que já esteve na nuvem', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    repo.salvar(ana, { naNuvem: true })
    nuvem.semSessao = true
    adesao(repo)

    expect(await screen.findByText(SEM_ATUALIZAR)).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(repo.listar()).toHaveLength(1)
  })
})

describe('Mudança que não chegou à nuvem fica pendente (CB-108)', () => {
  it('CB-108: gerar de novo sem internet: a leitura não volta ao link antigo e o aviso fica', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const antigo = acompanhamentoDe('c1', 'Ana')
    repo.salvar(antigo, { naNuvem: true })
    nuvem.linhas = [linhaDe(antigo)]
    cartao(repo)
    await waitFor(() => expect(nuvem.chamadas).toContain('select'))

    nuvem.falha.upsert = true
    await usuario.click(screen.getByRole('button', { name: /Gerar link novo/ }))
    expect(await screen.findByText(NAO_SALVOU)).toBeInTheDocument()
    const novo = repo.porCaso('c1')?.token
    expect(novo).not.toBe(antigo.token)

    // Volta para a aba: a nuvem ainda tem o token antigo, e a gravação continua falhando.
    nuvem.linhas = [{ ...linhaDe(antigo), marcacoes: [{ dia: HOJE, feitas: ['agua'] }] }]
    nuvem.chamadas = []
    act(() => {
      fireEvent(document, new Event('visibilitychange'))
    })
    await waitFor(() => expect(nuvem.chamadas).toContain('atualizar'))

    expect(repo.porCaso('c1')?.token).toBe(novo)
    expect(await screen.findByText(NAO_SALVOU)).toBeInTheDocument()
    // As marcações do paciente continuam vindo da nuvem.
    await waitFor(() => expect(repo.porCaso('c1')?.marcacoes).toEqual([{ dia: HOJE, feitas: ['agua'] }]))
  })

  it('CB-108: voltando a internet, a leitura manda a mudança pendente e o aviso some', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const antigo = acompanhamentoDe('c1', 'Ana')
    repo.salvar(antigo, { naNuvem: true })
    nuvem.linhas = [linhaDe(antigo)]
    cartao(repo)
    await waitFor(() => expect(nuvem.chamadas).toContain('select'))

    nuvem.falha.upsert = true
    await usuario.click(screen.getByRole('button', { name: /Gerar link novo/ }))
    expect(await screen.findByText(NAO_SALVOU)).toBeInTheDocument()
    const novo = repo.porCaso('c1')?.token

    nuvem.falha.upsert = false
    act(() => {
      fireEvent(document, new Event('visibilitychange'))
    })

    await waitFor(() => expect(nuvem.linhas[0]?.['token']).toBe(novo))
    await waitFor(() => expect(screen.queryByText(NAO_SALVOU)).not.toBeInTheDocument())
    expect(repo.estaPendente(repo.porCaso('c1')?.id ?? '')).toBe(false)
  })

  it('CB-108 e CB-107: pendente, mas apagado em outro aparelho: sai daqui também', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    repo.salvar(ana, { naNuvem: true, pendente: true })
    nuvem.linhas = []
    adesao(repo)

    expect(await screen.findByText('Nenhum paciente acompanhando ainda')).toBeInTheDocument()
    expect(nuvem.linhas).toEqual([])
  })

  it('Adesão: "Tentar de novo" ao lado do que não subiu manda de novo', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    repo.salvar(ana)
    nuvem.falha.upsert = true
    adesao(repo)
    expect(await screen.findByText(`Ainda não está na nuvem. ${FALHA_DE_REDE}`)).toBeInTheDocument()

    nuvem.falha.upsert = false
    await usuario.click(within(linhaDoPaciente('Ana')).getByRole('button', { name: 'Tentar de novo' }))

    await waitFor(() => expect(screen.queryByText(/Ainda não está na nuvem/)).not.toBeInTheDocument())
    expect(nuvem.linhas).toHaveLength(1)
    expect(repo.estaNaNuvem(ana.id)).toBe(true)
  })
})

describe('Corridas entre a leitura e o que a nutricionista faz', () => {
  it('a gravação que termina durante a leitura não é desfeita pela resposta, mais velha', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const antigo = acompanhamentoDe('c1', 'Ana')
    repo.salvar(antigo, { naNuvem: true })
    nuvem.linhas = [linhaDe(antigo)]
    nuvem.segurar.select = true
    cartao(repo)
    await waitFor(() => expect(nuvem.soltar).toHaveLength(1))

    // A leitura já tirou a foto (token antigo). A nutricionista gera o link novo, que grava.
    await usuario.click(screen.getByRole('button', { name: /Gerar link novo/ }))
    const novo = repo.porCaso('c1')?.token
    await waitFor(() => expect(nuvem.linhas[0]?.['token']).toBe(novo))

    await soltarUm()

    await waitFor(() => expect(nuvem.soltar).toHaveLength(0))
    expect(repo.porCaso('c1')?.token).toBe(novo)
    expect((screen.getByLabelText('Link do paciente') as HTMLInputElement).value).toContain(`#/missoes/${novo}`)
  })

  it('remover durante a subida de um link não o traz de volta', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    repo.salvar(ana)
    nuvem.segurar.upsert = true
    adesao(repo)
    // A leitura achou o link só aqui e começou a subir; a subida está a caminho.
    await waitFor(() => expect(nuvem.soltar).toHaveLength(1))

    await usuario.click(screen.getByRole('button', { name: 'Remover link' }))
    await usuario.click(screen.getByRole('button', { name: 'Remover' }))
    await soltarUm()

    expect(await screen.findByText('Nenhum paciente acompanhando ainda')).toBeInTheDocument()
    expect(nuvem.linhas).toEqual([])
    expect(repo.listar()).toEqual([])
  })

  it('o aparelho apagado (Apagar tudo) durante a subida: a linha que chegou depois sai da nuvem', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    repo.salvar(ana)
    nuvem.segurar.upsert = true
    adesao(repo)
    await waitFor(() => expect(nuvem.soltar).toHaveLength(1))

    repo.remover(ana.id)
    await soltarUm()

    await waitFor(() => expect(nuvem.chamadas).toContain('apagar'))
    expect(nuvem.linhas).toEqual([])
  })

  it('o plano e Adesão abertos juntos fazem uma leitura só', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const ana = acompanhamentoDe('c1', 'Ana')
    nuvem.linhas = [{ ...linhaDe(ana), marcacoes: SEMANA_EM_DIA }]
    nuvem.segurar.select = true
    render(
      <ProvedorAcompanhamentos repositorio={repo}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Ana" missoes={MISSOES} plano="pro" hoje={HOJE} />
        <TelaAdesao aoAbrirPlano={vi.fn()} plano="pro" hoje={HOJE} />
      </ProvedorAcompanhamentos>,
    )
    await waitFor(() => expect(nuvem.soltar).toHaveLength(1))
    expect(nuvem.chamadas.filter((c) => c === 'select')).toHaveLength(1)

    await soltarUm()

    expect(await within(linhaDoPaciente('Ana')).findByText('Em dia')).toBeInTheDocument()
    expect(nuvem.chamadas.filter((c) => c === 'select')).toHaveLength(1)
  })
})
