import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarCasoVazio } from '@/domain/caso.ts'
import { calcularEnergia } from '@/domain/energia.ts'
import type { Caso } from '@/domain/tipos.ts'
import { TelaCaso } from './TelaCaso.tsx'

function Anfitriao({ inicial }: { readonly inicial: Partial<Caso> }) {
  const [caso, setCaso] = useState<Caso>({ ...criarCasoVazio('c1'), ...inicial })
  return <TelaCaso caso={caso} aoAlterar={(m) => setCaso((c) => ({ ...c, ...m }))} />
}

const montar = (inicial: Partial<Caso>) => {
  render(<Anfitriao inicial={inicial} />)
  return userEvent.setup()
}

const rapido: Partial<Caso> = { modo: 'rapido', sexo: 'F', idadeAnos: 28 }

describe('Prescrição rápida', () => {
  it('pede meta de energia e não mostra circunferências', () => {
    montar(rapido)
    expect(screen.getByLabelText('Meta de energia')).toBeInTheDocument()
    expect(screen.queryByLabelText('Circunferência da cintura')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Circunferência da panturrilha')).not.toBeInTheDocument()
    expect(screen.getByText('Sem avaliação neste plano')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Avaliação antropométrica' })).not.toBeInTheDocument()
  })

  it('a meta digitada vira o gasto do dia, sem fórmula', () => {
    const caso: Caso = { ...criarCasoVazio('c1'), ...rapido, metaEnergiaKcal: 1800 }
    const energia = calcularEnergia(caso, { fator: caso.energia.fator })
    expect(energia.get).toBe(1800)
    expect(energia.metodo).toBeNull()
    expect(energia.tmb).toBeNull()
  })

  it('sem peso e sem estatura o plano continua válido', () => {
    const caso: Caso = { ...criarCasoVazio('c1'), ...rapido, metaEnergiaKcal: 1800 }
    const energia = calcularEnergia(caso, { fator: caso.energia.fator })
    expect(energia.motivoSemCalculo).toBeNull()
  })

  it('meta fora da faixa é recusada com a explicação', async () => {
    const usuario = montar(rapido)
    const campo = screen.getByLabelText('Meta de energia')
    await usuario.clear(campo)
    await usuario.type(campo, '200')
    expect(screen.getByRole('alert')).toHaveTextContent('entre 500 e 6000 kcal')
  })

  it('virar atendimento completo revela a avaliação sem perder o que foi digitado', async () => {
    const usuario = montar({ ...rapido, nome: 'Maria', metaEnergiaKcal: 1800 })
    await usuario.click(screen.getByRole('button', { name: 'Virar atendimento completo' }))

    expect(screen.getByRole('region', { name: 'Avaliação antropométrica' })).toBeInTheDocument()
    expect(screen.getByLabelText('Circunferência da cintura')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome do caso')).toHaveValue('Maria')
    expect(screen.queryByRole('button', { name: 'Virar atendimento completo' })).not.toBeInTheDocument()
  })

  it('no atendimento completo a meta de energia não aparece', () => {
    montar({ modo: 'completo', sexo: 'F', idadeAnos: 28 })
    expect(screen.queryByLabelText('Meta de energia')).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Avaliação antropométrica' })).getByText(/Informe peso, estatura/)).toBeInTheDocument()
  })
})
