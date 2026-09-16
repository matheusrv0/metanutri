import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { criarRepositorioPacientes } from '@/domain/pacientes.ts'
import { criarRepositorio, type Armazenamento } from '@/domain/persistencia.ts'
import { ProvedorCasos } from '../estado/ProvedorCasos.tsx'
import { ProvedorPacientes } from '../estado/ProvedorPacientes.tsx'
import { TelaPainel } from './TelaPainel.tsx'

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

function montar(comDados: boolean) {
  const armazenamento = new MemoriaFalsa()
  const casos = criarRepositorio(armazenamento, { agora: relogio() })
  const pacientes = criarRepositorioPacientes(armazenamento, { agora: relogio(), gerarId: () => 'p1' })
  if (comDados) {
    const plano = casos.criar('Maria, retorno')
    casos.salvar({ ...plano, caso: { ...plano.caso, modo: 'rapido' } })
    casos.criar('')
    pacientes.criar('Maria')
  }
  const aoNovoPlano = vi.fn()
  const aoAbrirPlano = vi.fn()
  const aoIrPara = vi.fn()
  render(
    <ProvedorCasos repositorio={casos}>
      <ProvedorPacientes repositorio={pacientes}>
        <TelaPainel aoNovoPlano={aoNovoPlano} aoAbrirPlano={aoAbrirPlano} aoIrPara={aoIrPara} />
      </ProvedorPacientes>
    </ProvedorCasos>,
  )
  return { aoNovoPlano, aoAbrirPlano, aoIrPara, usuario: userEvent.setup(), casos }
}

describe('Painel', () => {
  it('sem dados, mostra o caminho para começar', () => {
    montar(false)
    expect(screen.getByText('Nenhum plano ainda. Comece pelo botão acima.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum paciente cadastrado')).toBeInTheDocument()
  })

  it('conta pacientes e planos, e abre o plano recente', async () => {
    const { aoAbrirPlano, usuario } = montar(true)
    const numeros = screen.getAllByRole('button').map((b) => b.textContent)
    expect(numeros).toContain('2Planos')
    expect(numeros).toContain('1Pacientes')

    const recentes = within(screen.getByRole('list', { name: 'Planos recentes' }))
    expect(recentes.getByText('Maria, retorno')).toBeInTheDocument()
    expect(recentes.getByText(/Prescrição rápida/)).toBeInTheDocument()
    await usuario.click(recentes.getAllByRole('button', { name: 'Abrir' })[0] as HTMLElement)
    expect(aoAbrirPlano).toHaveBeenCalled()
  })

  it('aponta plano sem nome e plano sem paciente', () => {
    montar(true)
    expect(screen.getByText('1 plano sem nome')).toBeInTheDocument()
    expect(screen.getByText('2 planos sem paciente vinculado')).toBeInTheDocument()
  })

  it('o botão de novo plano pergunta o modo', async () => {
    const { aoNovoPlano, usuario } = montar(false)
    await usuario.click(screen.getByRole('button', { name: 'Novo plano' }))
    await usuario.click(screen.getByRole('menuitem', { name: /Prescrição rápida/ }))
    expect(aoNovoPlano).toHaveBeenCalledWith('rapido')
  })
})
