// Spec missoes-na-nuvem: o link do paciente sai do navegador da nutricionista e vai
// para a nuvem, e a tela de Adesão lê de lá o que o paciente marcou no celular dele.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarAcompanhamento, type Acompanhamento, type MarcacaoDia } from '@/domain/acompanhamento.ts'
import type { ClienteMissoes } from '@/domain/fonteSupabase.ts'
import type { Missao } from '@/domain/missoes.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { criarRepositorioAcompanhamentos, type RepositorioAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { ProvedorAcompanhamentos } from '@/ui/estado/ProvedorAcompanhamentos.tsx'
import { FALHA_DE_REDE } from '@/ui/estado/mensagemDoBanco.ts'
import { CartaoLinkMissoes } from './CartaoLinkMissoes.tsx'
import { TelaAdesao } from './TelaAdesao.tsx'

const LIMITE = 'Você chegou ao limite de links do seu plano.'
const NAO_SALVOU = 'Não consegui salvar o link na nuvem. O paciente ainda não consegue abrir. Tente de novo.'
const SEM_ATUALIZAR = 'Não consegui atualizar com a nuvem. Mostrando a cópia deste aparelho.'

type Linha = Record<string, unknown>

/** Uma tabela `acompanhamentos` em memória, com o limite de links do servidor (010). */
const nuvem = vi.hoisted(() => ({
  ligada: true,
  linhas: [] as Record<string, unknown>[],
  limite: null as number | null,
  falha: { select: false, upsert: false, delete: false },
  chamadas: [] as string[],
}))

const RESPOSTA_OK = { data: null, error: null }
const SEM_INTERNET = { data: null, error: { message: 'TypeError: Failed to fetch' } }

function clienteDaNuvem(): ClienteMissoes {
  return {
    rpc: (nome) => {
      nuvem.chamadas.push(`rpc:${nome}`)
      return Promise.resolve(RESPOSTA_OK)
    },
    from: () => ({
      select: () => ({
        eq: (coluna, valor) => {
          nuvem.chamadas.push('select')
          if (nuvem.falha.select) return Promise.resolve(SEM_INTERNET)
          return Promise.resolve({ data: nuvem.linhas.filter((l) => l[coluna] === valor).map((l) => ({ ...l })), error: null })
        },
      }),
      upsert: (linha, opcoes) => {
        nuvem.chamadas.push(opcoes?.ignoreDuplicates ? 'criar-se-faltar' : 'gravar')
        if (nuvem.falha.upsert) return Promise.resolve(SEM_INTERNET)
        const i = nuvem.linhas.findIndex((l) => l['id'] === linha['id'])
        if (i === -1) {
          if (nuvem.limite !== null && nuvem.linhas.length >= nuvem.limite) {
            return Promise.resolve({ data: null, error: { code: 'P0001', message: LIMITE } })
          }
          nuvem.linhas.push({ marcacoes: [], ...linha })
        } else if (!opcoes?.ignoreDuplicates) {
          nuvem.linhas[i] = { ...nuvem.linhas[i], ...linha }
        }
        return Promise.resolve(RESPOSTA_OK)
      },
      delete: () => ({
        eq: (coluna, valor) => {
          nuvem.chamadas.push('apagar')
          if (nuvem.falha.delete) return Promise.resolve(SEM_INTERNET)
          nuvem.linhas = nuvem.linhas.filter((l) => l[coluna] !== valor)
          return Promise.resolve(RESPOSTA_OK)
        },
      }),
    }),
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1' } } } }) },
  }
}

vi.mock('@/ui/estado/supabase.ts', () => ({
  obterSupabase: () => (nuvem.ligada ? clienteDaNuvem() : null),
  supabaseConfigurado: () => nuvem.ligada,
}))

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
  nuvem.linhas = []
  nuvem.limite = null
  nuvem.falha = { select: false, upsert: false, delete: false }
  nuvem.chamadas = []
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
    const ana = acompanhamentoDe('c1', 'Ana', [{ dia: '2026-09-20', feitas: ['agua'] }])
    const bia = acompanhamentoDe('c2', 'Bia')
    repo.salvar(ana)
    repo.salvar(bia)
    nuvem.limite = 1
    adesao(repo)

    await waitFor(() => expect(nuvem.linhas).toHaveLength(1))
    const subiu = nuvem.linhas[0]?.['id'] === ana.id ? 'Ana' : 'Bia'
    const ficou = subiu === 'Ana' ? 'Bia' : 'Ana'

    expect(await within(linhaDoPaciente(ficou)).findByText(`Ainda não está na nuvem. ${LIMITE}`)).toBeInTheDocument()
    expect(within(linhaDoPaciente(subiu)).queryByText(/Ainda não está na nuvem/)).not.toBeInTheDocument()
    // As marcações feitas neste aparelho sobem junto.
    if (subiu === 'Ana') expect(nuvem.linhas[0]?.['marcacoes']).toEqual([{ dia: '2026-09-20', feitas: ['agua'] }])
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

  it('a falha de rede da nuvem chega traduzida, nunca o texto técnico', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(acompanhamentoDe('c1', 'Ana'))
    nuvem.falha.upsert = true
    adesao(repo)

    expect(await screen.findByText(`Ainda não está na nuvem. ${FALHA_DE_REDE}`)).toBeInTheDocument()
    expect(screen.queryByText(/Failed to fetch/)).not.toBeInTheDocument()
  })
})
