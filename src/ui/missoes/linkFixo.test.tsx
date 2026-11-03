// O link fixo por paciente na tela da nutricionista (spec lado-do-paciente, D-1214 a D-1217).
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { criarAcompanhamento, type Acompanhamento } from '@/domain/acompanhamento.ts'
import type { ClienteDosEmails } from '@/domain/emailsDoLink.ts'
import { emailsFalsos, linhaDeEmails } from '@/domain/emailsFalsos.test-utils.ts'
import type { Missao } from '@/domain/missoes.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { criarRepositorioAcompanhamentos, type RepositorioAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { ProvedorAcompanhamentos } from '@/ui/estado/ProvedorAcompanhamentos.tsx'
import { ContextoClienteDosEmails } from '@/ui/estado/usarEmailsDoLink.ts'
import { CartaoLinkMissoes } from './CartaoLinkMissoes.tsx'
import { TelaAdesao } from './TelaAdesao.tsx'

const MISSOES: readonly Missao[] = [
  { id: 'refeicao-1', texto: 'Café da manhã por volta das 7h', origem: 'Refeição do plano' },
  { id: 'agua', texto: 'Beber água ao longo do dia', origem: 'Hábito que acompanha o plano' },
]
const NOVAS: readonly Missao[] = [
  { id: 'refeicao-1', texto: 'Café da manhã por volta das 7h30', origem: 'Refeição do plano' },
  { id: 'frutas', texto: 'Comer a fruta do plano', origem: 'Frutas que estão no plano' },
]

const HOJE = '2026-11-03'

function memoria(): Armazenamento {
  const dados = new Map<string, string>()
  return {
    getItem: (c) => dados.get(c) ?? null,
    setItem: (c, v) => void dados.set(c, v),
    removeItem: (c) => void dados.delete(c),
  }
}

let n = 0
function linkDe(dados: { readonly casoId: string; readonly pacienteId: string | null; readonly nome: string; readonly criadoEm: string } & Partial<Acompanhamento>): Acompanhamento {
  n += 1
  const base = criarAcompanhamento(
    { casoId: dados.casoId, pacienteId: dados.pacienteId, nome: dados.nome, missoes: MISSOES },
    { agora: () => dados.criadoEm, gerarId: () => `fixo-${n}`, aleatorio: (t) => new Uint8Array(t).fill(n + 3) },
  )
  return { ...base, ...dados }
}

function Anfitriao({ repositorio, cliente = null, children }: { readonly repositorio: RepositorioAcompanhamentos; readonly cliente?: ClienteDosEmails | null; readonly children: ReactNode }) {
  return (
    <ContextoClienteDosEmails.Provider value={cliente}>
      <ProvedorAcompanhamentos repositorio={repositorio}>{children}</ProvedorAcompanhamentos>
    </ContextoClienteDosEmails.Provider>
  )
}

describe('CA-2225: a migração ao abrir a versão nova', () => {
  it('CA-2225: dois links do mesmo paciente viram um: a Adesão mostra um paciente só, e o antigo aponta para o fixo', async () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    const antigo = repo.salvar(linkDe({ casoId: 'plano-1', pacienteId: 'pac-1', nome: 'Juliana', criadoEm: '2026-09-01T10:00:00.000Z' }))
    const fixo = repo.salvar(linkDe({ casoId: 'plano-2', pacienteId: 'pac-1', nome: 'Juliana', criadoEm: '2026-10-20T10:00:00.000Z' }))
    render(
      <Anfitriao repositorio={repo}>
        <TelaAdesao aoAbrirPlano={() => undefined} hoje={HOJE} />
      </Anfitriao>,
    )
    expect(await screen.findAllByText('Juliana')).toHaveLength(1)
    expect(repo.porId(antigo.id)?.substituidoPor).toBe(fixo.id)
    expect(repo.porId(fixo.id)?.substituidoPor ?? null).toBeNull()
  })
})

describe('CA-2222: o plano novo de quem já tem link', () => {
  it('CA-2222: o cartão pergunta "Juliana já tem link. Atualizar com este plano?"; atualizar mantém o endereço e as marcações', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const fixo = repo.salvar(linkDe({ casoId: 'plano-1', pacienteId: 'pac-1', nome: 'Juliana', criadoEm: '2026-09-01T10:00:00.000Z', marcacoes: [{ dia: '2026-11-02', feitas: ['agua'] }] }))
    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="plano-2" pacienteId="pac-1" nome="Juliana Martins" missoes={NOVAS} hoje={HOJE} />
      </Anfitriao>,
    )
    expect(screen.getByText('Juliana já tem link. Atualizar com este plano?')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Atualizar' }))
    const depois = repo.porId(fixo.id)
    expect(depois?.token).toBe(fixo.token)
    expect(depois?.casoId).toBe('plano-2')
    expect(depois?.missoes).toEqual(NOVAS)
    expect(depois?.marcacoes).toEqual([{ dia: '2026-11-02', feitas: ['agua'] }])
    expect(repo.listar()).toHaveLength(1)
    expect(((await screen.findByRole('textbox', { name: 'Endereço do link' })) as HTMLInputElement).value).toContain(`/p/${fixo.token}`)
  })

  it('CA-2249: com o aviso de plano aceito, "Avisar Juliana por e-mail" vem marcada e agenda o A1', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const fixo = repo.salvar(linkDe({ casoId: 'plano-1', pacienteId: 'pac-1', nome: 'Juliana', criadoEm: '2026-09-01T10:00:00.000Z' }))
    const { cliente, chamadas } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails({ aceites: [{ tipo: 'plano', aceito_em: '2026-10-22T12:00:00Z', saiu_em: null, pausado_em: null }] }) } })
    render(
      <Anfitriao repositorio={repo} cliente={cliente}>
        <CartaoLinkMissoes casoId="plano-2" pacienteId="pac-1" nome="Juliana Martins" missoes={NOVAS} hoje={HOJE} />
      </Anfitriao>,
    )
    const caixa = await screen.findByRole('checkbox', { name: 'Avisar Juliana por e-mail' })
    expect(caixa).toBeChecked()
    await usuario.click(screen.getByRole('button', { name: 'Atualizar' }))
    await waitFor(() => expect(chamadas.some((c) => c.nome === 'enviar-link')).toBe(true))
    expect(chamadas.find((c) => c.nome === 'enviar-link')?.corpo).toEqual({ acao: 'atualizou', link: fixo.id, avisar: true })
  })

  it('CA-2249: sem o aviso aceito, a caixa não aparece e nada é agendado', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(linkDe({ casoId: 'plano-1', pacienteId: 'pac-1', nome: 'Juliana', criadoEm: '2026-09-01T10:00:00.000Z' }))
    const { cliente, chamadas } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails() } })
    render(
      <Anfitriao repositorio={repo} cliente={cliente}>
        <CartaoLinkMissoes casoId="plano-2" pacienteId="pac-1" nome="Juliana" missoes={NOVAS} hoje={HOJE} />
      </Anfitriao>,
    )
    await waitFor(() => expect(chamadas.some((c) => c.nome === 'emails_do_link')).toBe(true))
    expect(screen.queryByRole('checkbox', { name: /Avisar/ })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Atualizar' }))
    expect(chamadas.some((c) => c.nome === 'enviar-link')).toBe(false)
  })
})

describe('CA-2223: "Trocar o endereço"', () => {
  it('CA-2223: com e-mail no link, o diálogo diz para onde vai o novo, e o S4 sai na hora', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const fixo = repo.salvar(linkDe({ casoId: 'plano-1', pacienteId: 'pac-1', nome: 'Juliana', criadoEm: '2026-09-01T10:00:00.000Z' }))
    const { cliente, chamadas } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails({ email: 'juliana@gmail.com' }) }, funcao: { 'enviar-link': { status: 200, corpo: { enviadoPara: 'j•••a@gmail.com' } } } })
    render(
      <Anfitriao repositorio={repo} cliente={cliente}>
        <CartaoLinkMissoes casoId="plano-1" pacienteId="pac-1" nome="Juliana Martins" missoes={MISSOES} hoje={HOJE} />
      </Anfitriao>,
    )
    await waitFor(() => expect(chamadas.some((c) => c.nome === 'emails_do_link')).toBe(true))
    await usuario.click(screen.getByRole('button', { name: 'Trocar o endereço' }))
    const dialogo = screen.getByRole('dialog', { name: 'Trocar o endereço?' })
    expect(within(dialogo).getByText('O endereço atual deixa de abrir.')).toBeInTheDocument()
    expect(within(dialogo).getByText('Juliana recebe o novo em j•••a@gmail.com.')).toBeInTheDocument()
    await usuario.click(within(dialogo).getByRole('button', { name: 'Trocar o endereço' }))
    await waitFor(() => expect(repo.porId(fixo.id)?.token).not.toBe(fixo.token))
    await waitFor(() => expect(chamadas.find((c) => c.nome === 'enviar-link')?.corpo).toEqual({ acao: 'trocou', link: fixo.id }))
    expect(await screen.findByText('Endereço trocado. O novo foi para j•••a@gmail.com.')).toBeInTheDocument()
  })

  it('CA-2223: sem e-mail, o diálogo oferece o WhatsApp, e nenhum e-mail sai', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(linkDe({ casoId: 'plano-1', pacienteId: 'pac-1', nome: 'Juliana', criadoEm: '2026-09-01T10:00:00.000Z' }))
    const { cliente, chamadas } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails({ email: null, origem: null }) } })
    render(
      <Anfitriao repositorio={repo} cliente={cliente}>
        <CartaoLinkMissoes casoId="plano-1" pacienteId="pac-1" nome="Juliana" missoes={MISSOES} hoje={HOJE} />
      </Anfitriao>,
    )
    await usuario.click(screen.getByRole('button', { name: 'Trocar o endereço' }))
    expect(within(screen.getByRole('dialog')).getByText('Sem e-mail que funcione: mande o novo pelo WhatsApp.')).toBeInTheDocument()
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Trocar o endereço' }))
    expect(await screen.findByText('Endereço trocado. Mande o novo pelo WhatsApp.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /WhatsApp/ })).toBeInTheDocument()
    expect(chamadas.some((c) => c.nome === 'enviar-link')).toBe(false)
  })

  it('CA-2223: o e-mail devolvido não conta como e-mail que funciona', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(linkDe({ casoId: 'plano-1', pacienteId: 'pac-1', nome: 'Pedro', criadoEm: '2026-09-01T10:00:00.000Z' }))
    const { cliente, chamadas } = emailsFalsos({ rpc: { emails_do_link: linhaDeEmails({ email: 'pedro.alves@gmial.com', supressao: 'devolvido' }) } })
    render(
      <Anfitriao repositorio={repo} cliente={cliente}>
        <CartaoLinkMissoes casoId="plano-1" pacienteId="pac-1" nome="Pedro" missoes={MISSOES} hoje={HOJE} />
      </Anfitriao>,
    )
    await waitFor(() => expect(chamadas.some((c) => c.nome === 'emails_do_link')).toBe(true))
    await usuario.click(screen.getByRole('button', { name: 'Trocar o endereço' }))
    expect(within(screen.getByRole('dialog')).getByText('Sem e-mail que funcione: mande o novo pelo WhatsApp.')).toBeInTheDocument()
  })
})

describe('CA-2224: o link exige paciente', () => {
  it('CA-2224: o plano sem paciente pergunta "Para quem é este link?" com o nome escrito; confirmar cria a ficha e o link é dela', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const criar = vi.fn(() => 'pac-novo')
    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="plano-solto" pacienteId={null} nome="Juliana Martins" missoes={MISSOES} hoje={HOJE} aoCriarPaciente={criar} />
      </Anfitriao>,
    )
    await usuario.click(screen.getByRole('button', { name: 'Gerar link do paciente' }))
    expect(screen.getByText('Para quem é este link?')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nome do paciente' })).toHaveValue('Juliana Martins')
    await usuario.click(screen.getByRole('button', { name: 'Criar a ficha e seguir' }))
    expect(criar).toHaveBeenCalledWith('Juliana Martins')
    await usuario.click(screen.getByRole('button', { name: /Já tenho a autorização/ }))
    expect(repo.listar()[0]?.pacienteId).toBe('pac-novo')
  })

  it('CA-2224: "Agora não" não cria ficha nem link', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    const criar = vi.fn(() => 'pac-novo')
    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="plano-solto" pacienteId={null} nome="Juliana" missoes={MISSOES} hoje={HOJE} aoCriarPaciente={criar} />
      </Anfitriao>,
    )
    await usuario.click(screen.getByRole('button', { name: 'Gerar link do paciente' }))
    await usuario.click(screen.getByRole('button', { name: 'Agora não' }))
    expect(criar).not.toHaveBeenCalled()
    expect(repo.listar()).toEqual([])
  })
})

describe('CA-2226 e CB-1224: o limite conta pacientes com link', () => {
  it('CA-2226: no Free, com 2 pacientes com link, o terceiro vê o aviso com "pacientes"', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(linkDe({ casoId: 'p1', pacienteId: 'pac-1', nome: 'Ana', criadoEm: '2026-09-01T10:00:00.000Z' }))
    repo.salvar(linkDe({ casoId: 'p2', pacienteId: 'pac-2', nome: 'Bia', criadoEm: '2026-09-02T10:00:00.000Z' }))
    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="p3" pacienteId="pac-3" nome="Carla" missoes={MISSOES} plano="free" hoje={HOJE} />
      </Anfitriao>,
    )
    expect(screen.queryByRole('button', { name: 'Gerar link do paciente' })).not.toBeInTheDocument()
    expect(screen.getByText('Você já tem 2 pacientes com link, o limite da sua assinatura. Remova um link em Adesão ou mude de assinatura para gerar outro.')).toBeInTheDocument()
  })

  it('CA-2226: dois links do mesmo paciente contam 1: no Free, ainda cabe outro paciente', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    repo.salvar(linkDe({ casoId: 'p1', pacienteId: 'pac-1', nome: 'Ana', criadoEm: '2026-09-01T10:00:00.000Z' }))
    repo.salvar(linkDe({ casoId: 'p1b', pacienteId: 'pac-1', nome: 'Ana', criadoEm: '2026-10-01T10:00:00.000Z' }))
    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="p3" pacienteId="pac-3" nome="Carla" missoes={MISSOES} plano="free" hoje={HOJE} />
      </Anfitriao>,
    )
    expect(screen.getByRole('button', { name: 'Gerar link do paciente' })).toBeInTheDocument()
  })

  it('CB-1224: a conta que vira Free com 5 pacientes com link continua com os links; só o link novo esbarra no limite', () => {
    const repo = criarRepositorioAcompanhamentos(memoria())
    for (const i of [1, 2, 3, 4, 5]) repo.salvar(linkDe({ casoId: `p${i}`, pacienteId: `pac-${i}`, nome: `Paciente ${i}`, criadoEm: `2026-09-0${i}T10:00:00.000Z` }))
    const { unmount } = render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="p1" pacienteId="pac-1" nome="Paciente 1" missoes={MISSOES} plano="free" hoje={HOJE} />
      </Anfitriao>,
    )
    expect(screen.getByRole('textbox', { name: 'Endereço do link' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trocar o endereço' })).toBeEnabled()
    unmount()
    render(
      <Anfitriao repositorio={repo}>
        <CartaoLinkMissoes casoId="p6" pacienteId="pac-6" nome="Paciente 6" missoes={MISSOES} plano="free" hoje={HOJE} />
      </Anfitriao>,
    )
    expect(screen.queryByRole('button', { name: 'Gerar link do paciente' })).not.toBeInTheDocument()
  })
})
