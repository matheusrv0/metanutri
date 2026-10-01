import { cleanup, render, screen, within } from '@testing-library/react'
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
  const aoAbrirPlano = vi.fn()
  const aoIrPara = vi.fn()
  const aoVerExemplo = vi.fn()
  render(
    <ProvedorCasos repositorio={casos}>
      <ProvedorPacientes repositorio={pacientes}>
        <TelaPainel aoAbrirPlano={aoAbrirPlano} aoIrPara={aoIrPara} aoVerExemplo={aoVerExemplo} />
      </ProvedorPacientes>
    </ProvedorCasos>,
  )
  return { aoAbrirPlano, aoIrPara, aoVerExemplo, usuario: userEvent.setup(), casos }
}

describe('Painel', () => {
  it('CA-327: sem plano, "Onde você parou" diz que não há nada e oferece o exemplo', () => {
    montar(false)
    expect(screen.getByText('Nenhum plano ainda.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ver um plano de exemplo' })).toBeInTheDocument()
    expect(screen.getByText('Nenhum paciente cadastrado')).toBeInTheDocument()
  })

  it('CA-325: três números numa faixa, contados nos últimos 14 dias', () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-20T12:00:00.000Z'))
    try {
      montar(true)
      const faixa = within(screen.getByRole('region', { name: 'Seus números' }))
      expect(faixa.getByText('planos')).toBeInTheDocument()
      expect(faixa.getByText('paciente')).toBeInTheDocument()
      expect(faixa.getByText('dia')).toBeInTheDocument()
      expect(faixa.getAllByText('2')).toHaveLength(1)
      expect(faixa.getAllByText('1')).toHaveLength(2)
    } finally {
      vi.useRealTimers()
    }
  })

  it('CA-326: "Onde você parou" abre o plano recente', async () => {
    const { aoAbrirPlano, usuario } = montar(true)
    const recentes = within(screen.getByRole('list', { name: 'Planos recentes' }))
    expect(recentes.getByText('Maria, retorno')).toBeInTheDocument()
    expect(recentes.getByText(/Prescrição rápida/)).toBeInTheDocument()
    await usuario.click(recentes.getAllByRole('button', { name: 'Abrir' })[0] as HTMLElement)
    expect(aoAbrirPlano).toHaveBeenCalled()
  })

  it('CA-328: sem os cartões grandes, o gráfico e os atalhos que repetem o menu', () => {
    montar(true)
    expect(screen.queryByRole('button', { name: 'Pacientes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cadastrar produto' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Últimos 14 dias/)).not.toBeInTheDocument()
    expect(screen.queryByText('Começar agora')).not.toBeInTheDocument()
  })

  it('sem nenhum plano, oferece o exemplo; com plano, some', async () => {
    const { aoVerExemplo, usuario } = montar(false)
    await usuario.click(screen.getByRole('button', { name: 'Ver um plano de exemplo' }))
    expect(aoVerExemplo).toHaveBeenCalledOnce()

    cleanup()
    montar(true)
    expect(screen.queryByRole('button', { name: 'Ver um plano de exemplo' })).not.toBeInTheDocument()
  })

  it('aponta plano sem nome e plano sem paciente', () => {
    montar(true)
    expect(screen.getByText('1 plano sem nome')).toBeInTheDocument()
    expect(screen.getByText('2 planos sem paciente vinculado')).toBeInTheDocument()
  })

  it('CA-326: com plano nomeado, vinculado e paciente cadastrado, aparece "Tudo em dia."', () => {
    const armazenamento = new MemoriaFalsa()
    const casos = criarRepositorio(armazenamento, { agora: relogio() })
    const pacientes = criarRepositorioPacientes(armazenamento, { agora: relogio(), gerarId: () => 'p1' })
    const paciente = pacientes.criar('Maria')
    const plano = casos.criar('Maria, retorno')
    casos.salvar({ ...plano, caso: { ...plano.caso, pacienteId: paciente.id } })
    render(
      <ProvedorCasos repositorio={casos}>
        <ProvedorPacientes repositorio={pacientes}>
          <TelaPainel aoAbrirPlano={vi.fn()} aoIrPara={vi.fn()} aoVerExemplo={vi.fn()} />
        </ProvedorPacientes>
      </ProvedorCasos>,
    )
    expect(screen.getByText('Tudo em dia.')).toBeInTheDocument()
  })
})
