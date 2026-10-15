// O bloco "Hoje e esta semana" do Painel (spec whatsapp-e-retorno, D-144 a D-148).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { criarAcompanhamento, ROTULO_ESTADO, type Acompanhamento } from '@/domain/acompanhamento.ts'
import { criarRepositorioPacientes, type Paciente } from '@/domain/pacientes.ts'
import { criarRepositorio, type Armazenamento } from '@/domain/persistencia.ts'
import { criarRepositorioAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { ContextoAcompanhamentos, type ValorAcompanhamentos } from '../estado/contextoAcompanhamentos.ts'
import { ProvedorAcompanhamentos } from '../estado/ProvedorAcompanhamentos.tsx'
import { ProvedorCasos } from '../estado/ProvedorCasos.tsx'
import { ProvedorPacientes } from '../estado/ProvedorPacientes.tsx'
import { TelaPainel } from './TelaPainel.tsx'

function memoria(): Armazenamento {
  const dados = new Map<string, string>()
  return {
    getItem: (c) => dados.get(c) ?? null,
    setItem: (c, v) => void dados.set(c, v),
    removeItem: (c) => void dados.delete(c),
  }
}

/** Quarta, 14/10/2026, 10h em Brasília (13h em UTC). */
const AGORA = new Date('2026-10-14T13:00:00.000Z')
const TELEFONE = '(11) 98765-4321'

let n = 0
function link(pacienteId: string, criadoEm: string, marcacoes: readonly string[] = [], casoId?: string): Acompanhamento {
  n += 1
  const base = criarAcompanhamento(
    { casoId: casoId ?? `c${n}`, pacienteId, nome: 'x', missoes: [{ id: 'agua', texto: 'Água', origem: 'x' }] },
    { agora: () => criadoEm, gerarId: () => `ac-${n}`, aleatorio: (t) => new Uint8Array(t).fill(n) },
  )
  return { ...base, marcacoes: marcacoes.map((dia) => ({ dia, feitas: ['agua'] })) }
}

function Anfitriao({
  fichas,
  links = [],
  planos = [],
  acompanhamentos,
  children,
}: {
  readonly fichas: readonly Partial<Paciente>[]
  readonly links?: readonly Acompanhamento[]
  readonly planos?: readonly { readonly id: string; readonly pacienteId: string }[]
  readonly acompanhamentos?: ValorAcompanhamentos
  readonly children: ReactNode
}) {
  const arm = memoria()
  const ids = fichas.map((f) => f.id ?? 'p1')
  const pacientes = criarRepositorioPacientes(arm, { gerarId: () => ids.shift() ?? 'px' })
  for (const ficha of fichas) {
    const criada = pacientes.criar(ficha.nome ?? '')
    pacientes.salvar({ ...criada, ...ficha, id: criada.id })
  }
  const repoLinks = criarRepositorioAcompanhamentos(arm)
  for (const l of links) repoLinks.salvar(l)
  const idsDosPlanos = planos.map((p) => p.id)
  const casos = criarRepositorio(arm, { gerarId: () => idsDosPlanos.shift() ?? 'cx' })
  for (const plano of planos) {
    const criado = casos.criar('Plano')
    casos.salvar({ ...criado, caso: { ...criado.caso, pacienteId: plano.pacienteId } })
  }
  const miolo = (
    <ProvedorCasos repositorio={casos}>
      <ProvedorPacientes repositorio={pacientes}>{children}</ProvedorPacientes>
    </ProvedorCasos>
  )
  return acompanhamentos ? (
    <ContextoAcompanhamentos.Provider value={acompanhamentos}>{miolo}</ContextoAcompanhamentos.Provider>
  ) : (
    <ProvedorAcompanhamentos repositorio={repoLinks}>{miolo}</ProvedorAcompanhamentos>
  )
}

function painel(agora: Date = AGORA, aoCadastrarTelefone = vi.fn()) {
  return <TelaPainel aoAbrirPlano={vi.fn()} aoIrPara={vi.fn()} aoVerExemplo={vi.fn()} agora={agora} aoCadastrarTelefone={aoCadastrarTelefone} />
}

const bloco = () => within(screen.getByRole('list', { name: 'Consultas e aniversários' }))
const linhas = () => bloco().getAllByRole('listitem')
const linha = (nome: string) => {
  const li = linhas().find((l) => within(l).queryByText(nome))
  if (!li) throw new Error(`Sem a linha de ${nome}`)
  return within(li)
}

describe('Painel: Hoje e esta semana', () => {
  it('CA-518: sem consulta nem aniversário nos 7 dias, nem o título aparece', () => {
    render(
      <Anfitriao fichas={[{ id: 'p1', nome: 'Ana', proximaConsulta: '2026-10-21T08:00', nascimento: '1990-05-05' }, { id: 'p2', nome: 'Bia', proximaConsulta: '2026-10-13' }]}>
        {painel()}
      </Anfitriao>,
    )
    expect(screen.queryByRole('heading', { name: 'Hoje e esta semana' })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Consultas e aniversários' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Precisa de atenção' })).toBeInTheDocument()
  })

  it('CA-519 e CA-520: nome e quando, por dia e horário; passadas e de 7 dias em diante ficam de fora', () => {
    render(
      <Anfitriao
        fichas={[
          { id: 'p1', nome: 'Ana Souza', proximaConsulta: '2026-10-14T16:00' },
          { id: 'p2', nome: 'Bia Lima', proximaConsulta: '2026-10-15T09:00' },
          { id: 'p3', nome: 'Caio Reis', proximaConsulta: '2026-10-16T10:00' },
          { id: 'p4', nome: 'Duda Melo', proximaConsulta: '2026-10-14' },
          { id: 'p5', nome: 'Edu Prado', proximaConsulta: '2026-10-14T09:00' },
          { id: 'p6', nome: 'Fabi Cruz', proximaConsulta: '2026-10-21T08:00' },
          { id: 'p7', nome: 'Gabi Dias', proximaConsulta: '2026-10-13T08:00' },
        ]}
      >
        {painel()}
      </Anfitriao>,
    )
    expect(screen.getByRole('heading', { name: 'Hoje e esta semana' })).toBeInTheDocument()
    expect(linhas().map((l) => l.textContent)).toEqual([
      expect.stringContaining('Duda MeloHoje'),
      expect.stringContaining('Ana SouzaHoje às 16:00'),
      expect.stringContaining('Bia LimaAmanhã às 09:00'),
      expect.stringContaining('Caio ReisSexta, 16/10 às 10:00'),
    ])
  })

  it('D-146: o bloco fica na coluna da direita, acima de "Precisa de atenção"', () => {
    render(<Anfitriao fichas={[{ id: 'p1', nome: 'Ana', proximaConsulta: '2026-10-14T16:00' }]}>{painel()}</Anfitriao>)
    const onde = screen.getByRole('heading', { name: 'Onde você parou' })
    const hoje = screen.getByRole('heading', { name: 'Hoje e esta semana' })
    const atencao = screen.getByRole('heading', { name: 'Precisa de atenção' })
    expect(onde.compareDocumentPosition(hoje) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(hoje.compareDocumentPosition(atencao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const coluna = (el: HTMLElement) => el.closest('[data-slot="card"]')?.parentElement
    expect(coluna(hoje)).toBe(coluna(atencao))
  })

  it('CA-521: o selo da Adesão, do link mais recente; sem link, sem selo', () => {
    render(
      <Anfitriao
        fichas={[
          { id: 'p1', nome: 'Ana Souza', proximaConsulta: '2026-10-14T16:00' },
          { id: 'p2', nome: 'Bia Lima', proximaConsulta: '2026-10-15T09:00' },
        ]}
        links={[link('p1', '2026-09-01T10:00:00.000Z', ['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14']), link('p1', '2026-10-01T10:00:00.000Z')]}
      >
        {painel()}
      </Anfitriao>,
    )
    expect(linha('Ana Souza').getByText('Sumindo')).toBeInTheDocument()
    for (const rotulo of Object.values(ROTULO_ESTADO)) expect(linha('Bia Lima').queryByText(rotulo)).not.toBeInTheDocument()
  })

  it('D-147: plano trocado de Ana para Bia: o selo do link vai para a linha da Bia', () => {
    render(
      <Anfitriao
        fichas={[
          { id: 'p-ana', nome: 'Ana Souza', proximaConsulta: '2026-10-14T16:00' },
          { id: 'p-bia', nome: 'Bia Lima', proximaConsulta: '2026-10-15T09:00' },
        ]}
        links={[link('p-ana', '2026-10-01T10:00:00.000Z', [], 'c-trocado')]}
        planos={[{ id: 'c-trocado', pacienteId: 'p-bia' }]}
      >
        {painel()}
      </Anfitriao>,
    )
    expect(linha('Bia Lima').getByText('Sumindo')).toBeInTheDocument()
    for (const rotulo of Object.values(ROTULO_ESTADO)) expect(linha('Ana Souza').queryByText(rotulo)).not.toBeInTheDocument()
  })

  it('CA-510: o WhatsApp da consulta traz o lembrete com dia e horário', async () => {
    const usuario = userEvent.setup()
    render(<Anfitriao fichas={[{ id: 'p1', nome: 'Ana Souza', telefone: TELEFONE, proximaConsulta: '2026-10-16T14:30' }]}>{painel()}</Anfitriao>)
    await usuario.click(linha('Ana Souza').getByRole('button', { name: 'Lembrar Ana Souza da consulta pelo WhatsApp' }))
    const dialogo = within(screen.getByRole('dialog', { name: 'Enviar pelo WhatsApp' }))
    expect(dialogo.getByLabelText('Mensagem')).toHaveValue('Oi, Ana! Lembrete: sua consulta é dia 16/10 (sexta-feira) às 14:30. Até lá!')
    expect(dialogo.getByRole('link', { name: 'Abrir no WhatsApp' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=Oi%2C%20Ana!/)
  })

  it('CA-511 e CA-522: aniversários entram no bloco, sem selo, com os parabéns no WhatsApp', async () => {
    const usuario = userEvent.setup()
    render(
      <Anfitriao
        fichas={[
          { id: 'p1', nome: 'Ivo Prado', telefone: TELEFONE, nascimento: '1990-10-14' },
          { id: 'p2', nome: 'Juca Alves', nascimento: '1985-10-17' },
        ]}
        links={[link('p1', '2026-10-01T10:00:00.000Z')]}
      >
        {painel()}
      </Anfitriao>,
    )
    expect(linha('Ivo Prado').getByText('Aniversário hoje')).toBeInTheDocument()
    expect(linha('Juca Alves').getByText('Aniversário sábado, 17/10')).toBeInTheDocument()
    expect(linha('Ivo Prado').queryByText('Sumindo')).not.toBeInTheDocument()
    await usuario.click(linha('Ivo Prado').getByRole('button', { name: 'Mandar parabéns para Ivo Prado pelo WhatsApp' }))
    expect(within(screen.getByRole('dialog')).getByLabelText('Mensagem')).toHaveValue('Feliz aniversário, Ivo! Um ótimo dia para você.')
  })

  it('CA-523: perto da meia-noite, hoje é o dia de Brasília', () => {
    render(
      <Anfitriao
        fichas={[
          { id: 'p1', nome: 'Ana Souza', proximaConsulta: '2026-10-15' },
          { id: 'p2', nome: 'Bia Lima', proximaConsulta: '2026-10-16T08:00' },
        ]}
      >
        {painel(new Date('2026-10-16T02:30:00.000Z'))}
      </Anfitriao>,
    )
    expect(linha('Ana Souza').getByText('Hoje')).toBeInTheDocument()
    expect(linha('Bia Lima').getByText('Amanhã às 08:00')).toBeInTheDocument()
  })

  it('CA-505: sem telefone, o WhatsApp da linha leva à ficha', async () => {
    const usuario = userEvent.setup()
    const aoCadastrarTelefone = vi.fn()
    render(<Anfitriao fichas={[{ id: 'p1', nome: 'Ana Souza', proximaConsulta: '2026-10-16T14:30' }]}>{painel(AGORA, aoCadastrarTelefone)}</Anfitriao>)
    await usuario.click(linha('Ana Souza').getByRole('button', { name: /pelo WhatsApp/ }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cadastre o telefone na ficha' }))
    expect(aoCadastrarTelefone).toHaveBeenCalledWith('p1')
  })

  it('D-147: o bloco lê a nuvem ao aparecer; sem bloco, a nuvem não é lida', () => {
    const lerDaNuvem = vi.fn(() => Promise.resolve())
    const valor = (): ValorAcompanhamentos => ({
      repositorio: criarRepositorioAcompanhamentos(memoria()),
      fonte: { carregar: vi.fn(), salvarMarcacoes: vi.fn() } as unknown as ValorAcompanhamentos['fonte'],
      acompanhamentos: [],
      avisoArmazenamento: null,
      salvar: vi.fn(),
      remover: vi.fn(),
      lerDaNuvem,
      avisoNuvem: null,
      foraDaNuvem: new Map(),
    })
    const { unmount } = render(<Anfitriao fichas={[{ id: 'p1', nome: 'Ana' }]} acompanhamentos={valor()}>{painel()}</Anfitriao>)
    expect(lerDaNuvem).not.toHaveBeenCalled()
    unmount()
    render(<Anfitriao fichas={[{ id: 'p1', nome: 'Ana', proximaConsulta: '2026-10-14T16:00' }]} acompanhamentos={valor()}>{painel()}</Anfitriao>)
    expect(lerDaNuvem).toHaveBeenCalled()
  })

  it('sem o provedor dos links (Painel de teste antigo), o bloco aparece sem selo', () => {
    const arm = memoria()
    const pacientes = criarRepositorioPacientes(arm, { gerarId: () => 'p1' })
    const criada = pacientes.criar('Ana Souza')
    pacientes.salvar({ ...criada, proximaConsulta: '2026-10-14T16:00' })
    render(
      <ProvedorCasos repositorio={criarRepositorio(arm)}>
        <ProvedorPacientes repositorio={pacientes}>{painel()}</ProvedorPacientes>
      </ProvedorCasos>,
    )
    expect(linha('Ana Souza').getByText('Hoje às 16:00')).toBeInTheDocument()
  })
})
