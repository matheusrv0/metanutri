// O WhatsApp no cartão do link e na Adesão (spec whatsapp-e-retorno).
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { criarAcompanhamento, type Acompanhamento } from '@/domain/acompanhamento.ts'
import type { Missao } from '@/domain/missoes.ts'
import { criarRepositorioPacientes, type Paciente } from '@/domain/pacientes.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { criarRepositorioAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { ProvedorAcompanhamentos } from '@/ui/estado/ProvedorAcompanhamentos.tsx'
import { ProvedorPacientes } from '@/ui/estado/ProvedorPacientes.tsx'
import { CartaoLinkMissoes } from './CartaoLinkMissoes.tsx'
import { enderecoDoPaciente } from './endereco.ts'

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
function link(casoId: string, pacienteId: string | null): Acompanhamento {
  n += 1
  return criarAcompanhamento(
    { casoId, pacienteId, nome: 'Plano da Ana', missoes: MISSOES },
    { agora: () => '2026-10-01T10:00:00.000Z', gerarId: () => `ac-${n}`, aleatorio: (t) => new Uint8Array(t).fill(n) },
  )
}

/** Monta os provedores com os links e as fichas dados. */
function Anfitriao({ links, fichas, children }: { readonly links: readonly Acompanhamento[]; readonly fichas: readonly Partial<Paciente>[]; readonly children: ReactNode }) {
  const arm = memoria()
  const acompanhamentos = criarRepositorioAcompanhamentos(arm)
  for (const l of links) acompanhamentos.salvar(l)
  const ids = fichas.map((f) => f.id ?? 'p1')
  const pacientes = criarRepositorioPacientes(arm, { gerarId: () => ids.shift() ?? 'px' })
  for (const ficha of fichas) {
    const criada = pacientes.criar(ficha.nome ?? '')
    pacientes.salvar({ ...criada, ...ficha, id: criada.id })
  }
  return (
    <ProvedorAcompanhamentos repositorio={acompanhamentos}>
      <ProvedorPacientes repositorio={pacientes}>{children}</ProvedorPacientes>
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
    const cartao = within(screen.getByRole('region', { name: 'Missões do paciente' }))
    const copiar = cartao.getByRole('button', { name: 'Copiar' })
    const whatsapp = cartao.getByRole('button', { name: 'WhatsApp' })
    expect(copiar.parentElement).toBe(whatsapp.parentElement)

    await usuario.click(whatsapp)
    const dialogo = within(screen.getByRole('dialog', { name: 'Enviar pelo WhatsApp' }))
    const texto = (dialogo.getByLabelText('Mensagem') as HTMLTextAreaElement).value
    expect(texto.startsWith('Oi, Ana! ')).toBe(true)
    expect(texto).toContain(enderecoDoPaciente(l.token))
    expect(dialogo.getByRole('link', { name: 'Abrir no WhatsApp' }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=/)
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
