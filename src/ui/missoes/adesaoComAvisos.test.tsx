// A Adesão com o último acesso e o envelope dos avisos (spec lado-do-paciente, CA-2239 e CA-2269).
import { render, screen, within } from '@testing-library/react'
import { criarAcompanhamento } from '@/domain/acompanhamento.ts'
import type { ClienteDosEmails } from '@/domain/emailsDoLink.ts'
import { emailsFalsos } from '@/domain/emailsFalsos.test-utils.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { criarRepositorioAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { ProvedorAcompanhamentos } from '@/ui/estado/ProvedorAcompanhamentos.tsx'
import { ContextoClienteDosEmails } from '@/ui/estado/usarEmailsDoLink.ts'
import { TelaAdesao } from './TelaAdesao.tsx'

const HOJE = '2026-11-03'

function memoria(): Armazenamento {
  const dados = new Map<string, string>()
  return {
    getItem: (c) => dados.get(c) ?? null,
    setItem: (c, v) => void dados.set(c, v),
    removeItem: (c) => void dados.delete(c),
  }
}

function montar(cliente: ClienteDosEmails | null) {
  const repo = criarRepositorioAcompanhamentos(memoria())
  const opcoes = (id: string) => ({ agora: () => '2026-10-01T10:00:00.000Z', gerarId: () => id })
  repo.salvar({
    ...criarAcompanhamento({ casoId: 'c1', pacienteId: 'p1', nome: 'Juliana Martins', missoes: [] }, opcoes('l1')),
    ultimoAcesso: '2026-11-03',
    marcacoes: [{ dia: '2026-10-29', feitas: ['agua'] }],
  })
  repo.salvar({ ...criarAcompanhamento({ casoId: 'c2', pacienteId: 'p2', nome: 'Pedro Alves', missoes: [] }, opcoes('l2')) })
  render(
    <ContextoClienteDosEmails.Provider value={cliente}>
      <ProvedorAcompanhamentos repositorio={repo}>
        <TelaAdesao aoAbrirPlano={() => undefined} hoje={HOJE} />
      </ProvedorAcompanhamentos>
    </ContextoClienteDosEmails.Provider>,
  )
}

const linhaDe = (nome: string) => within(screen.getByText(nome).closest('li') as HTMLElement)

describe('CA-2239: o último acesso na Adesão', () => {
  it('CA-2239: a linha diz "Abriu hoje · marcou há 5 dias", ou "Nunca abriu"', () => {
    montar(null)
    expect(linhaDe('Juliana Martins').getByText(/Abriu hoje · marcou há 5 dias/)).toBeInTheDocument()
    expect(linhaDe('Pedro Alves').getByText(/Nunca abriu/)).toBeInTheDocument()
  })
})

describe('CA-2269: o envelope de quem recebe avisos', () => {
  it('CA-2269: o paciente com aviso aceito tem o envelope "Recebe avisos por e-mail"; o outro, não', async () => {
    const { cliente } = emailsFalsos({ rpc: { avisos_aceitos_da_conta: [{ link_id: 'l1' }] } })
    montar(cliente)
    expect(await linhaDe('Juliana Martins').findByRole('img', { name: 'Recebe avisos por e-mail' })).toBeInTheDocument()
    expect(linhaDe('Pedro Alves').queryByRole('img', { name: 'Recebe avisos por e-mail' })).not.toBeInTheDocument()
  })
})
