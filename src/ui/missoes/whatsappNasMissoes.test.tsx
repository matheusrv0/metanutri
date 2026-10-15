// O WhatsApp no cartão do link e na Adesão (spec whatsapp-e-retorno).
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { criarAcompanhamento, type Acompanhamento, type MarcacaoDia } from '@/domain/acompanhamento.ts'
import type { Missao } from '@/domain/missoes.ts'
import { criarRepositorioPacientes, type Paciente } from '@/domain/pacientes.ts'
import { criarRepositorio, type Armazenamento } from '@/domain/persistencia.ts'
import { criarRepositorioAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { ProvedorAcompanhamentos } from '@/ui/estado/ProvedorAcompanhamentos.tsx'
import { ProvedorCasos } from '@/ui/estado/ProvedorCasos.tsx'
import { ProvedorPacientes } from '@/ui/estado/ProvedorPacientes.tsx'
import { CartaoLinkMissoes } from './CartaoLinkMissoes.tsx'
import { enderecoDoPaciente } from './endereco.ts'
import { TelaAdesao } from './TelaAdesao.tsx'

const MISSOES: readonly Missao[] = [{ id: 'agua', texto: 'Beber cerca de 2 litros de água', origem: '35 ml por quilo' }]

function memoria(): Armazenamento {
  const dados = new Map<string, string>()
  return {
    getItem: (c) => dados.get(c) ?? null,
    setItem: (c, v) => void dados.set(c, v),
    removeItem: (c) => void dados.delete(c),
  }
}

let n = 0
function link(casoId: string, pacienteId: string | null, extra: { readonly criadoEm?: string; readonly nome?: string; readonly marcacoes?: readonly MarcacaoDia[] } = {}): Acompanhamento {
  n += 1
  const base = criarAcompanhamento(
    { casoId, pacienteId, nome: extra.nome ?? 'Plano da Ana', missoes: MISSOES },
    { agora: () => extra.criadoEm ?? '2026-10-01T10:00:00.000Z', gerarId: () => `ac-${n}`, aleatorio: (t) => new Uint8Array(t).fill(n) },
  )
  return { ...base, marcacoes: extra.marcacoes ?? [] }
}

const marcou = (...dias: readonly string[]): readonly MarcacaoDia[] => dias.map((dia) => ({ dia, feitas: ['agua'] }))

/** Monta os provedores com os links, as fichas e os planos dados. */
function Anfitriao({
  links,
  fichas,
  planos = [],
  children,
}: {
  readonly links: readonly Acompanhamento[]
  readonly fichas: readonly Partial<Paciente>[]
  readonly planos?: readonly { readonly id: string; readonly pacienteId: string }[]
  readonly children: ReactNode
}) {
  const arm = memoria()
  const acompanhamentos = criarRepositorioAcompanhamentos(arm)
  for (const l of links) acompanhamentos.salvar(l)
  const idsDasFichas = fichas.map((f) => f.id ?? 'p1')
  const pacientes = criarRepositorioPacientes(arm, { gerarId: () => idsDasFichas.shift() ?? 'px' })
  for (const ficha of fichas) {
    const criada = pacientes.criar(ficha.nome ?? '')
    pacientes.salvar({ ...criada, ...ficha, id: criada.id })
  }
  const idsDosPlanos = planos.map((p) => p.id)
  const casos = criarRepositorio(arm, { gerarId: () => idsDosPlanos.shift() ?? 'cx' })
  for (const plano of planos) {
    const criado = casos.criar('Plano')
    casos.salvar({ ...criado, caso: { ...criado.caso, pacienteId: plano.pacienteId } })
  }
  return (
    <ProvedorAcompanhamentos repositorio={acompanhamentos}>
      <ProvedorCasos repositorio={casos}>
        <ProvedorPacientes repositorio={pacientes}>{children}</ProvedorPacientes>
      </ProvedorCasos>
    </ProvedorAcompanhamentos>
  )
}

describe('WhatsApp no cartão do link (CA-508)', () => {
  it('ao lado de "Copiar", o WhatsApp leva o link do paciente no texto pronto', async () => {
    const l = link('c1', 'p1')
    const usuario = userEvent.setup()
    render(
      <Anfitriao links={[l]} fichas={[{ id: 'p1', nome: 'Ana Souza', telefone: '(11) 98765-4321' }]}>
        <CartaoLinkMissoes casoId="c1" pacienteId="p1" nome="Plano da Ana" missoes={MISSOES} hoje="2026-10-14" />
      </Anfitriao>,
    )
    const cartao = within(screen.getByRole('region', { name: 'Link do paciente' }))
    const copiar = cartao.getByRole('button', { name: 'Copiar' })
    const whatsapp = cartao.getByRole('button', { name: 'WhatsApp' })
    expect(copiar.parentElement).toBe(whatsapp.parentElement)

    await usuario.click(whatsapp)
    const dialogo = within(screen.getByRole('dialog', { name: 'Enviar pelo WhatsApp' }))
    const texto = (dialogo.getByLabelText('Mensagem') as HTMLTextAreaElement).value
    expect(texto.startsWith('Oi, Ana! ')).toBe(true)
    expect(texto).toContain(enderecoDoPaciente(l.token))
    expect(dialogo.getByRole('link', { name: 'Abrir no WhatsApp (abre em nova aba)' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=/)
  })

  it('o link criado antes do vínculo usa o paciente do plano; sem telefone, leva à ficha', async () => {
    const aoCadastrarTelefone = vi.fn()
    const usuario = userEvent.setup()
    render(
      <Anfitriao links={[link('c1', null)]} fichas={[{ id: 'p1', nome: 'Ana Souza', telefone: '' }]}>
        <CartaoLinkMissoes casoId="c1" pacienteId="p1" nome="Plano da Ana" missoes={MISSOES} hoje="2026-10-14" aoCadastrarTelefone={aoCadastrarTelefone} />
      </Anfitriao>,
    )
    await usuario.click(screen.getByRole('button', { name: 'WhatsApp' }))
    const dialogo = within(screen.getByRole('dialog', { name: 'Enviar pelo WhatsApp' }))
    expect(dialogo.getByText('A ficha de Ana Souza não tem telefone.')).toBeInTheDocument()
    await usuario.click(dialogo.getByRole('button', { name: 'Cadastre o telefone na ficha' }))
    expect(aoCadastrarTelefone).toHaveBeenCalledWith('p1')
  })

  it('CB-144: plano sem paciente (ou com a ficha excluída): o diálogo diz que falta vincular', async () => {
    const usuario = userEvent.setup()
    render(
      <Anfitriao links={[link('c1', 'excluido')]} fichas={[]}>
        <CartaoLinkMissoes casoId="c1" pacienteId={null} nome="Plano da Ana" missoes={MISSOES} hoje="2026-10-14" />
      </Anfitriao>,
    )
    await usuario.click(screen.getByRole('button', { name: 'WhatsApp' }))
    expect(within(screen.getByRole('dialog')).getByText(/Este plano não tem paciente vinculado/)).toBeInTheDocument()
  })

  it('antes de gerar o link, não há WhatsApp', () => {
    render(
      <Anfitriao links={[]} fichas={[{ id: 'p1', nome: 'Ana', telefone: '(11) 98765-4321' }]}>
        <CartaoLinkMissoes casoId="c1" pacienteId="p1" nome="Plano da Ana" missoes={MISSOES} hoje="2026-10-14" />
      </Anfitriao>,
    )
    expect(screen.queryByRole('button', { name: 'WhatsApp' })).not.toBeInTheDocument()
  })
})

/** Quarta, 14/10/2026, 10h em Brasília. */
const HOJE = '2026-10-14'
const AGORA = new Date('2026-10-14T13:00:00.000Z')
const TELEFONE = '(11) 98765-4321'

const linha = (nome: string) => {
  const li = screen.getByText(nome).closest('li')
  if (!li) throw new Error(`Sem a linha de ${nome}`)
  return within(li)
}

describe('WhatsApp e retorno na Adesão', () => {
  const links = () => [
    link('c1', 'p1', { nome: 'Ana Souza' }),
    link('c2', 'p2', { nome: 'Bia Lima', marcacoes: marcou('2026-10-13') }),
    link('c3', 'p3', { nome: 'Caio Reis', marcacoes: marcou('2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14') }),
    link('c4', 'p4', { nome: 'Duda Melo', criadoEm: '2026-10-13T10:00:00.000Z' }),
  ]
  const fichas = [
    { id: 'p1', nome: 'Ana Souza', telefone: TELEFONE, proximaConsulta: '2026-10-16T14:30' },
    { id: 'p2', nome: 'Bia Lima', telefone: TELEFONE, proximaConsulta: '2026-10-13' },
    { id: 'p3', nome: 'Caio Reis', telefone: TELEFONE, proximaConsulta: '2026-10-14T16:00' },
    { id: 'p4', nome: 'Duda Melo', telefone: TELEFONE, proximaConsulta: '2026-10-30' },
  ]

  it('CA-509: "WhatsApp" só para quem está sumindo ou em atenção, com a mensagem de contato', async () => {
    const usuario = userEvent.setup()
    render(
      <Anfitriao links={links()} fichas={fichas}>
        <TelaAdesao aoAbrirPlano={vi.fn()} hoje={HOJE} agora={AGORA} />
      </Anfitriao>,
    )
    expect(linha('Ana Souza').getByText('Sumindo')).toBeInTheDocument()
    expect(linha('Bia Lima').getByText('Atenção')).toBeInTheDocument()
    expect(linha('Caio Reis').queryByRole('button', { name: 'WhatsApp' })).not.toBeInTheDocument()
    expect(linha('Duda Melo').queryByRole('button', { name: 'WhatsApp' })).not.toBeInTheDocument()

    await usuario.click(linha('Ana Souza').getByRole('button', { name: 'WhatsApp' }))
    let dialogo = within(screen.getByRole('dialog', { name: 'Enviar pelo WhatsApp' }))
    expect(dialogo.getByLabelText('Mensagem')).toHaveValue(
      'Oi, Ana! Tudo bem? Vi que faz alguns dias que você não marca as missões. Como está indo com o plano? Se algo estiver difícil, me conta que a gente ajusta.',
    )
    await usuario.click(dialogo.getByRole('button', { name: 'Cancelar' }))

    await usuario.click(linha('Bia Lima').getByRole('button', { name: 'WhatsApp' }))
    dialogo = within(screen.getByRole('dialog', { name: 'Enviar pelo WhatsApp' }))
    expect((dialogo.getByLabelText('Mensagem') as HTMLTextAreaElement).value).toContain('Vi que você marcou poucas missões nesta semana.')
  })

  it('CA-524: o retorno que ainda não passou aparece ao lado do nome; o passado, não', () => {
    render(
      <Anfitriao links={links()} fichas={fichas}>
        <TelaAdesao aoAbrirPlano={vi.fn()} hoje={HOJE} agora={AGORA} />
      </Anfitriao>,
    )
    expect(linha('Ana Souza').getByText('Retorno sexta, 16/10 às 14:30')).toBeInTheDocument()
    expect(linha('Bia Lima').queryByText(/Retorno/)).not.toBeInTheDocument()
    expect(linha('Caio Reis').getByText('Retorno hoje às 16:00')).toBeInTheDocument()
    expect(linha('Duda Melo').getByText('Retorno 30/10')).toBeInTheDocument()
  })

  it('D-147: o link criado antes do vínculo usa a ficha do plano; sem telefone, leva à ficha', async () => {
    const usuario = userEvent.setup()
    const aoCadastrarTelefone = vi.fn()
    render(
      <Anfitriao
        links={[link('c9', null, { nome: 'Eva Nunes' })]}
        fichas={[{ id: 'p9', nome: 'Eva Nunes', telefone: '', proximaConsulta: '2026-10-15T08:00' }]}
        planos={[{ id: 'c9', pacienteId: 'p9' }]}
      >
        <TelaAdesao aoAbrirPlano={vi.fn()} hoje={HOJE} agora={AGORA} aoCadastrarTelefone={aoCadastrarTelefone} />
      </Anfitriao>,
    )
    expect(linha('Eva Nunes').getByText('Retorno amanhã às 08:00')).toBeInTheDocument()
    await usuario.click(linha('Eva Nunes').getByRole('button', { name: 'WhatsApp' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cadastre o telefone na ficha' }))
    expect(aoCadastrarTelefone).toHaveBeenCalledWith('p9')
  })
})

describe('D-144: a Adesão e o cartão contam pelo dia de Brasília, como o Painel', () => {
  /** Marcou de 08 a 11/10: em dia no dia 14, sumindo no dia 15. */
  const marcas = marcou('2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11')
  /** 23h30 de 14/10 em Brasília; em UTC já é 15/10. */
  const QUASE_MEIA_NOITE = new Date('2026-10-15T02:30:00.000Z')

  afterEach(() => {
    vi.useRealTimers()
  })

  it('a Adesão, sem "hoje" fixo, usa o dia de Brasília da hora que recebe', () => {
    render(
      <Anfitriao links={[link('c1', 'p1', { nome: 'Ana Souza', marcacoes: marcas })]} fichas={[{ id: 'p1', nome: 'Ana Souza' }]}>
        <TelaAdesao aoAbrirPlano={vi.fn()} agora={QUASE_MEIA_NOITE} />
      </Anfitriao>,
    )
    expect(linha('Ana Souza').getByText('Em dia')).toBeInTheDocument()
  })

  it('CA-529: com a Adesão aberta, o retorno das 16:00 sai às 17:01, sem recarregar', () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-10-14T19:59:30.000Z'))
    render(
      <Anfitriao links={[link('c1', 'p1', { nome: 'Ana Souza' })]} fichas={[{ id: 'p1', nome: 'Ana Souza', proximaConsulta: '2026-10-14T16:00' }]}>
        <TelaAdesao aoAbrirPlano={vi.fn()} />
      </Anfitriao>,
    )
    expect(linha('Ana Souza').getByText('Retorno hoje às 16:00')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(120_000)
    })
    expect(linha('Ana Souza').queryByText(/Retorno/)).not.toBeInTheDocument()
  })

  it('o selo do cartão do link, sem "hoje" fixo, também', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(QUASE_MEIA_NOITE)
    render(
      <Anfitriao links={[link('c1', 'p1', { marcacoes: marcas })]} fichas={[{ id: 'p1', nome: 'Ana Souza' }]}>
        <CartaoLinkMissoes casoId="c1" pacienteId="p1" nome="Plano da Ana" missoes={MISSOES} />
      </Anfitriao>,
    )
    expect(within(screen.getByRole('region', { name: 'Link do paciente' })).getByText('Em dia')).toBeInTheDocument()
  })
})

describe('D-147: o plano trocado de Ana para Bia', () => {
  const fichas = [
    { id: 'p-ana', nome: 'Ana Souza', telefone: '(11) 98765-4321', proximaConsulta: '2026-10-16T14:30' },
    { id: 'p-bia', nome: 'Bia Lima', telefone: '(21) 99876-5432', proximaConsulta: '2026-10-17T09:00' },
  ]

  it('o cartão e a Adesão apontam para Bia, a paciente do plano agora', async () => {
    const usuario = userEvent.setup()
    render(
      <Anfitriao links={[link('c-trocado', 'p-ana', { nome: 'Plano trocado' })]} fichas={fichas} planos={[{ id: 'c-trocado', pacienteId: 'p-bia' }]}>
        <CartaoLinkMissoes casoId="c-trocado" pacienteId="p-bia" nome="Plano trocado" missoes={MISSOES} hoje={HOJE} />
        <TelaAdesao aoAbrirPlano={vi.fn()} hoje={HOJE} agora={AGORA} />
      </Anfitriao>,
    )
    await usuario.click(within(screen.getByRole('region', { name: 'Link do paciente' })).getByRole('button', { name: 'WhatsApp' }))
    expect(within(screen.getByRole('dialog')).getByText(/^Para Bia Lima, \(21\) 99876-5432\./)).toBeInTheDocument()
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    expect(linha('Plano trocado').getByText('Retorno sábado, 17/10 às 09:00')).toBeInTheDocument()
    await usuario.click(linha('Plano trocado').getByRole('button', { name: 'WhatsApp' }))
    expect(within(screen.getByRole('dialog')).getByText(/^Para Bia Lima, \(21\) 99876-5432\./)).toBeInTheDocument()
  })
})
