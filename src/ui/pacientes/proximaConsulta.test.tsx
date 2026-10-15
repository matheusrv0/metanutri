import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarRepositorioPacientes, type Paciente } from '@/domain/pacientes.ts'
import { criarRepositorio, type Armazenamento } from '@/domain/persistencia.ts'
import { ProvedorCasos } from '../estado/ProvedorCasos.tsx'
import { ProvedorPacientes } from '../estado/ProvedorPacientes.tsx'
import { TelaPaciente } from './TelaPaciente.tsx'

class MemoriaFalsa implements Armazenamento {
  readonly dados = new Map<string, string>()
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

const relogio = () => {
  let ms = Date.UTC(2026, 9, 14, 12, 0, 0)
  return () => new Date((ms += 60_000)).toISOString()
}

/** Quarta, 14/10/2026, 10h em Brasília. */
const AGORA = new Date('2026-10-14T13:00:00.000Z')

function montar(mudanca: Partial<Paciente> = {}, extra: { readonly focar?: 'telefone'; readonly armazenamento?: MemoriaFalsa } = {}) {
  const armazenamento = extra.armazenamento ?? new MemoriaFalsa()
  const pacientes = criarRepositorioPacientes(armazenamento, { agora: relogio(), gerarId: () => 'p1' })
  if (!pacientes.obter('p1')) {
    const criado = pacientes.criar('Ana Souza')
    pacientes.salvar({ ...criado, ...mudanca })
  }
  const casos = criarRepositorio(armazenamento, { agora: relogio() })
  render(
    <ProvedorCasos repositorio={casos}>
      <ProvedorPacientes repositorio={pacientes}>
        <TelaPaciente pacienteId="p1" aoAbrirPlano={vi.fn()} aoNovoPlano={vi.fn()} aoVoltar={vi.fn()} agora={AGORA} {...(extra.focar ? { focar: extra.focar } : {})} />
      </ProvedorPacientes>
    </ProvedorCasos>,
  )
  const grupo = within(screen.getByRole('group', { name: 'Próxima consulta' }))
  return { pacientes, grupo, usuario: userEvent.setup() }
}

describe('Ficha: próxima consulta', () => {
  it('CA-512: o cartão "Próxima consulta" tem Dia e Horário, vazios para quem não tem consulta', () => {
    const { grupo } = montar()
    expect(screen.getByRole('heading', { name: 'Próxima consulta' })).toBeInTheDocument()
    expect(grupo.getByLabelText('Dia')).toHaveValue('')
    expect(grupo.getByLabelText('Horário')).toHaveValue('')
  })

  it('CA-512: a ficha gravada antes do campo existir abre com os dois vazios', () => {
    const armazenamento = new MemoriaFalsa()
    armazenamento.setItem(
      'metanutri:pacientes',
      JSON.stringify([{ id: 'p1', nome: 'Ana', criadoEm: '2026-09-01T00:00:00.000Z', atualizadoEm: '2026-09-01T00:00:00.000Z' }]),
    )
    const { grupo } = montar({}, { armazenamento })
    expect(grupo.getByLabelText('Dia')).toHaveValue('')
    expect(grupo.queryByText('Essa data já passou.')).not.toBeInTheDocument()
  })

  it('CA-513: escolher dia e horário guarda AAAA-MM-DDTHH:MM e muda o atualizadoEm; só o dia, AAAA-MM-DD', () => {
    const { pacientes, grupo } = montar()
    const antes = pacientes.obter('p1')?.atualizadoEm ?? ''
    fireEvent.change(grupo.getByLabelText('Dia'), { target: { value: '2026-10-16' } })
    expect(pacientes.obter('p1')?.proximaConsulta).toBe('2026-10-16')
    fireEvent.change(grupo.getByLabelText('Horário'), { target: { value: '14:30' } })
    expect(pacientes.obter('p1')?.proximaConsulta).toBe('2026-10-16T14:30')
    expect((pacientes.obter('p1')?.atualizadoEm ?? '') > antes).toBe(true)
    expect(grupo.getByLabelText('Dia')).toHaveValue('2026-10-16')
    expect(grupo.getByLabelText('Horário')).toHaveValue('14:30')
  })

  it('CA-514: sem dia, o Horário fica desativado; "Limpar" tira dia e horário', async () => {
    const { pacientes, grupo, usuario } = montar({ proximaConsulta: '2026-10-16T14:30' })
    expect(grupo.getByLabelText('Horário')).toBeEnabled()
    await usuario.click(grupo.getByRole('button', { name: 'Limpar' }))
    expect(pacientes.obter('p1')?.proximaConsulta).toBeNull()
    expect(grupo.getByLabelText('Dia')).toHaveValue('')
    expect(grupo.getByLabelText('Horário')).toBeDisabled()
    expect(grupo.queryByRole('button', { name: 'Limpar' })).not.toBeInTheDocument()
  })

  it('CA-514: trocar o dia mantém o horário', () => {
    const { pacientes, grupo } = montar({ proximaConsulta: '2026-10-16T14:30' })
    fireEvent.change(grupo.getByLabelText('Dia'), { target: { value: '2026-10-20' } })
    expect(pacientes.obter('p1')?.proximaConsulta).toBe('2026-10-20T14:30')
  })

  it("CA-514: digitando o dia ('', '0002-10-16', '2026-10-16'), só o valor final é gravado, com o horário", () => {
    const { pacientes, grupo } = montar({ proximaConsulta: '2026-10-16T14:30' })
    const antes = pacientes.obter('p1')?.atualizadoEm
    const dia = grupo.getByLabelText('Dia')

    fireEvent.change(dia, { target: { value: '' } })
    expect(pacientes.obter('p1')?.proximaConsulta).toBe('2026-10-16T14:30')
    expect(pacientes.obter('p1')?.atualizadoEm).toBe(antes)
    expect(grupo.getByLabelText('Horário')).toHaveValue('14:30')

    fireEvent.change(dia, { target: { value: '0002-10-16' } })
    expect(pacientes.obter('p1')?.proximaConsulta).toBe('2026-10-16T14:30')
    expect(pacientes.obter('p1')?.atualizadoEm).toBe(antes)
    expect(dia).toHaveValue('0002-10-16')
    expect(grupo.getByText('Confira a data.')).toBeInTheDocument()

    fireEvent.change(dia, { target: { value: '2026-10-21' } })
    expect(pacientes.obter('p1')?.proximaConsulta).toBe('2026-10-21T14:30')
    expect(grupo.queryByText('Confira a data.')).not.toBeInTheDocument()
    expect(grupo.getByLabelText('Horário')).toHaveValue('14:30')
  })

  it('CA-514: ano antes de 1900 não é gravado nem na ficha nova', () => {
    const { pacientes, grupo } = montar()
    fireEvent.change(grupo.getByLabelText('Dia'), { target: { value: '1899-12-31' } })
    expect(pacientes.obter('p1')?.proximaConsulta).toBeNull()
    expect(grupo.getByText('Confira a data.')).toBeInTheDocument()
  })

  it('CA-514: o horário vazio no meio da digitação não grava; apagado e fora do campo, fica só o dia', () => {
    const { pacientes, grupo } = montar({ proximaConsulta: '2026-10-16T14:30' })
    const horario = grupo.getByLabelText('Horário')
    fireEvent.change(horario, { target: { value: '' } })
    expect(pacientes.obter('p1')?.proximaConsulta).toBe('2026-10-16T14:30')
    fireEvent.blur(horario)
    expect(pacientes.obter('p1')?.proximaConsulta).toBe('2026-10-16')
  })

  it('CA-515: a consulta que já passou ganha o aviso', () => {
    const { grupo } = montar({ proximaConsulta: '2026-10-13T09:00' })
    expect(grupo.getByText('Essa consulta já passou.')).toBeInTheDocument()
  })

  it('CA-515: a de hoje mais tarde não ganha o aviso', () => {
    const { grupo } = montar({ proximaConsulta: '2026-10-14T16:00' })
    expect(grupo.queryByText('Essa consulta já passou.')).not.toBeInTheDocument()
  })
})

describe('Ficha: telefone para o WhatsApp', () => {
  it('CA-516: telefone que não é do Brasil ganha a dica; o válido e o vazio não', () => {
    montar({ telefone: '1234' })
    expect(screen.getByText('Para o WhatsApp, use DDD e número do Brasil.')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '(11) 98765-4321' } })
    expect(screen.queryByText('Para o WhatsApp, use DDD e número do Brasil.')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Telefone'), { target: { value: '' } })
    expect(screen.queryByText('Para o WhatsApp, use DDD e número do Brasil.')).not.toBeInTheDocument()
  })

  it('CA-517: aberta para o telefone, a ficha põe o cursor no campo Telefone', () => {
    montar({}, { focar: 'telefone' })
    expect(screen.getByLabelText('Telefone')).toHaveFocus()
  })

  it('CA-517: aberta do jeito comum, o cursor não vai para o Telefone', () => {
    montar()
    expect(screen.getByLabelText('Telefone')).not.toHaveFocus()
  })
})
