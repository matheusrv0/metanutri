import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarRepositorioPacientes, idadeDe, listaDeRestricoes } from '@/domain/pacientes.ts'
import { criarRepositorio, type Armazenamento } from '@/domain/persistencia.ts'
import { ProvedorCasos } from '../estado/ProvedorCasos.tsx'
import { ProvedorPacientes } from '../estado/ProvedorPacientes.tsx'
import { casaRestricao } from '@/domain/restricoes.ts'
import { TelaPaciente } from './TelaPaciente.tsx'
import { TelaPacientes } from './TelaPacientes.tsx'

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
  let ms = Date.UTC(2026, 8, 16, 12, 0, 0)
  return () => new Date((ms += 60_000)).toISOString()
}

function montar(conteudo: React.ReactNode, armazenamento = new MemoriaFalsa()) {
  const pacientes = criarRepositorioPacientes(armazenamento, { agora: relogio(), gerarId: () => 'p1' })
  const casos = criarRepositorio(armazenamento, { agora: relogio() })
  render(
    <ProvedorCasos repositorio={casos}>
      <ProvedorPacientes repositorio={pacientes}>{conteudo}</ProvedorPacientes>
    </ProvedorCasos>,
  )
  return { pacientes, casos, usuario: userEvent.setup() }
}

describe('Pacientes', () => {
  it('calcula a idade a partir da data de nascimento', () => {
    expect(idadeDe('1998-03-10', new Date(2026, 8, 16))).toEqual({ anos: 28, meses: 6 })
    expect(idadeDe('2026-01-01', new Date(2026, 8, 16))?.anos).toBe(0)
    expect(idadeDe(null)).toBeNull()
    expect(idadeDe('data errada')).toBeNull()
  })

  it('lê uma restrição por linha, ignorando linhas vazias', () => {
    expect(listaDeRestricoes('leite\n\ncamarão, amendoim\n')).toEqual(['leite', 'camarão', 'amendoim'])
  })

  it('a restrição casa com o alimento mesmo sem acento', () => {
    expect(casaRestricao('Camarão, cozido', ['camarao'])).toBe(true)
    expect(casaRestricao('Leite, de vaca, integral', ['leite'])).toBe(true)
    expect(casaRestricao('Arroz, tipo 1, cozido', ['leite'])).toBe(false)
    // termo curto demais não filtra, para não apagar meia base
    expect(casaRestricao('Arroz, tipo 1, cozido', ['ar'])).toBe(false)
  })

  it('lista vazia convida a cadastrar', async () => {
    const aoAbrir = vi.fn()
    const { usuario } = montar(<TelaPacientes aoAbrir={aoAbrir} />)
    expect(screen.getByRole('heading', { name: 'Nenhum paciente ainda' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar paciente' }))
    expect(aoAbrir).toHaveBeenCalledWith('p1')
  })

  it('a ficha guarda nome, restrições e mostra o histórico vazio', async () => {
    const armazenamento = new MemoriaFalsa()
    const pacientes = criarRepositorioPacientes(armazenamento, { agora: relogio(), gerarId: () => 'p1' })
    pacientes.criar('Maria')
    const casos = criarRepositorio(armazenamento, { agora: relogio() })

    render(
      <ProvedorCasos repositorio={casos}>
        <ProvedorPacientes repositorio={pacientes}>
          <TelaPaciente pacienteId="p1" aoAbrirPlano={vi.fn()} aoNovoPlano={vi.fn()} aoVoltar={vi.fn()} />
        </ProvedorPacientes>
      </ProvedorCasos>,
    )
    const usuario = userEvent.setup()

    expect(screen.getByLabelText('Nome')).toHaveValue('Maria')
    await usuario.type(screen.getByLabelText('Não come ou não pode comer'), 'camarão')
    expect(pacientes.obter('p1')?.restricoes).toContain('camarão')
    expect(screen.getByText('Nenhum plano para este paciente ainda.')).toBeInTheDocument()
    expect(screen.getByText(/pelo menos dois planos com peso/)).toBeInTheDocument()
  })

  it('o histórico lista os planos do paciente e abre um deles', async () => {
    const armazenamento = new MemoriaFalsa()
    const pacientes = criarRepositorioPacientes(armazenamento, { agora: relogio(), gerarId: () => 'p1' })
    pacientes.criar('Maria')
    const casos = criarRepositorio(armazenamento, { agora: relogio() })
    const plano = casos.criar('Maria, retorno')
    casos.salvar({ ...plano, caso: { ...plano.caso, pacienteId: 'p1', pesoKg: 62 } })

    const aoAbrirPlano = vi.fn()
    render(
      <ProvedorCasos repositorio={casos}>
        <ProvedorPacientes repositorio={pacientes}>
          <TelaPaciente pacienteId="p1" aoAbrirPlano={aoAbrirPlano} aoNovoPlano={vi.fn()} aoVoltar={vi.fn()} />
        </ProvedorPacientes>
      </ProvedorCasos>,
    )

    const lista = within(screen.getByRole('list', { name: 'Planos do paciente' }))
    expect(lista.getByText('Maria, retorno')).toBeInTheDocument()
    await userEvent.setup().click(lista.getByRole('button', { name: 'Abrir' }))
    expect(aoAbrirPlano).toHaveBeenCalledWith(plano.caso.id)
  })
})
