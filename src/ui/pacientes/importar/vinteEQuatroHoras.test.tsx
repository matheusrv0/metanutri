// Depois de importar (spec importar-pacientes, D-912, D-913): a linha das 24 horas em Pacientes (CA-1943) e "Importado em"
// na ficha (CA-1937), com o que veio da planilha como texto (CA-1946).
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarPacienteVazio, criarRepositorioPacientes, type Paciente } from '@/domain/pacientes.ts'
import { criarRepositorio } from '@/domain/persistencia.ts'
import { ProvedorCasos } from '../../estado/ProvedorCasos.tsx'
import { ProvedorPacientes } from '../../estado/ProvedorPacientes.tsx'
import { TelaPaciente } from '../TelaPaciente.tsx'
import { TelaPacientes } from '../TelaPacientes.tsx'
import { Memoria } from './montarTela.test-utils.tsx'

/** 29/10/2026, 14:32 no relógio de quem usa. */
const EM = new Date(2026, 9, 29, 14, 32).toISOString()

const importado = (id: string, nome: string, importacao = { id: 'imp1', em: EM }): Paciente => ({ ...criarPacienteVazio(id, importacao.em), nome, importacao })

function montar(pacientes: readonly Paciente[], conteudo: (repo: ReturnType<typeof criarRepositorioPacientes>) => React.ReactNode) {
  const armazenamento = new Memoria()
  const repo = criarRepositorioPacientes(armazenamento)
  repo.criarVarios(pacientes)
  render(
    <ProvedorCasos repositorio={criarRepositorio(armazenamento)}>
      <ProvedorPacientes repositorio={repo}>{conteudo(repo)}</ProvedorPacientes>
    </ProvedorCasos>,
  )
  return repo
}

describe('CA-1943: a linha das 24 horas em Pacientes', () => {
  const cinco = ['Ana', 'Bia', 'Caio', 'Duda', 'Enzo'].map((nome, i) => importado(`p${i}`, nome))

  it('menos de 24 horas depois: "Importação de hoje, 14:32 · 5 pacientes · Desfazer"', async () => {
    const repo = montar(cinco, () => <TelaPacientes aoAbrir={vi.fn()} agora={new Date(2026, 9, 29, 16, 0)} />)
    const linha = screen.getByText('Importação de hoje, 14:32').closest('div') as HTMLElement
    expect(linha).toHaveTextContent('Importação de hoje, 14:32 · 5 pacientes')
    await userEvent.click(screen.getByRole('button', { name: 'Desfazer a importação de hoje, 14:32' }))
    expect(screen.getByRole('status')).toHaveTextContent('Importação desfeita.')
    expect(repo.listar()).toEqual([])
  })

  it('24 horas depois, a linha não aparece mais e os pacientes ficam', () => {
    montar(cinco, () => <TelaPacientes aoAbrir={vi.fn()} agora={new Date(new Date(EM).getTime() + 24 * 60 * 60 * 1000)} />)
    expect(screen.queryByText(/Importação de/)).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Pacientes' }).children).toHaveLength(5)
  })

  it('o paciente da importação que já foi mudado fica, e a tela diz', async () => {
    const editada = { ...importado('p9', 'Fábio'), atualizadoEm: new Date(2026, 9, 29, 15, 0).toISOString() }
    const repo = montar([...cinco.slice(0, 2), editada], () => <TelaPacientes aoAbrir={vi.fn()} agora={new Date(2026, 9, 29, 16, 0)} />)
    expect(screen.getByText(/^Importação de hoje/).closest('div')).toHaveTextContent('· 3 pacientes')
    await userEvent.click(screen.getByRole('button', { name: /Desfazer a importação/ }))
    expect(screen.getByRole('status')).toHaveTextContent('Importação desfeita. 1 paciente ficou porque já foi mudado.')
    expect(repo.listar().map((p) => p.nome)).toEqual(['Fábio'])
  })
})

describe('CA-1937: a ficha do importado', () => {
  it('mostra "Importado em 29/10/2026"; a ficha cadastrada à mão, não', () => {
    montar([importado('p1', 'Ana Souza')], () => <TelaPaciente pacienteId="p1" aoAbrirPlano={vi.fn()} aoNovoPlano={vi.fn()} aoVoltar={vi.fn()} />)
    expect(screen.getByText('Importado em 29/10/2026')).toBeInTheDocument()
  })

  it('cadastrada à mão, sem a linha', () => {
    montar([{ ...criarPacienteVazio('p1', EM), nome: 'Ana' }], () => <TelaPaciente pacienteId="p1" aoAbrirPlano={vi.fn()} aoNovoPlano={vi.fn()} aoVoltar={vi.fn()} />)
    expect(screen.queryByText(/Importado em/)).not.toBeInTheDocument()
  })

  it('CA-1946: o nome que parece HTML é texto na ficha e na lista', () => {
    const nome = '<img src=x onerror=alert(1)>'
    montar([importado('p1', nome)], () => <TelaPacientes aoAbrir={vi.fn()} />)
    expect(screen.getAllByText(nome).length).toBeGreaterThan(0)
    expect(document.querySelector('img')).toBeNull()
  })
})
