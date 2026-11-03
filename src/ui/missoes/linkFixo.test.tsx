// O link fixo por paciente na tela da nutricionista (spec lado-do-paciente, D-1214 a D-1217).
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { criarAcompanhamento, type Acompanhamento } from '@/domain/acompanhamento.ts'
import type { Missao } from '@/domain/missoes.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { criarRepositorioAcompanhamentos, type RepositorioAcompanhamentos } from '@/domain/repositorioAcompanhamentos.ts'
import { ProvedorAcompanhamentos } from '@/ui/estado/ProvedorAcompanhamentos.tsx'
import { TelaAdesao } from './TelaAdesao.tsx'

const MISSOES: readonly Missao[] = [
  { id: 'refeicao-1', texto: 'Café da manhã por volta das 7h', origem: 'Refeição do plano' },
  { id: 'agua', texto: 'Beber água ao longo do dia', origem: 'Hábito que acompanha o plano' },
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

function Anfitriao({ repositorio, children }: { readonly repositorio: RepositorioAcompanhamentos; readonly children: ReactNode }) {
  return <ProvedorAcompanhamentos repositorio={repositorio}>{children}</ProvedorAcompanhamentos>
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
