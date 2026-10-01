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
    expect(screen.getByLabelText('Nome do plano')).toHaveValue('Maria')
    expect(screen.queryByRole('button', { name: 'Virar atendimento completo' })).not.toBeInTheDocument()
  })

  it('no atendimento completo a meta de energia não aparece', () => {
    montar({ modo: 'completo', sexo: 'F', idadeAnos: 28 })
    expect(screen.queryByLabelText('Meta de energia')).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Avaliação antropométrica' })).getByText(/Informe peso, estatura/)).toBeInTheDocument()
  })
})

describe('Meta de energia no modo rápido (CA-225 a CA-230, CA-232, CA-233)', () => {
  const comMedidas: Partial<Caso> = { ...rapido, pesoKg: 62, estaturaCm: 163, energia: { fator: 1.55, formula: 'mifflin', getManual: null } }
  const meta = () => screen.getByLabelText('Meta de energia')

  it('CA-225: o nível de atividade vem logo depois de peso e estatura, com o fator de cada um', () => {
    montar(rapido)
    const grupo = screen.getByRole('radiogroup', { name: 'Nível de atividade' })
    expect(within(grupo).getAllByRole('radio').map((r) => r.textContent)).toEqual([
      'Sedentário (1,2)',
      'Pouco ativo (1,37)',
      'Moderadamente ativo (1,55)',
      'Muito ativo (1,7)',
      'Extremamente ativo (1,9)',
    ])
    expect(screen.getByLabelText('Estatura').compareDocumentPosition(grupo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('CA-226: com sexo, idade, peso e estatura, a meta aparece calculada', () => {
    montar(comMedidas)
    expect(meta()).toHaveValue('')
    expect(meta()).toHaveAttribute('placeholder', '2.074')
    expect(screen.getByText('calculada')).toBeInTheDocument()
    // item 5: o número calculado também chega a quem usa leitor de tela
    expect(meta()).toHaveAccessibleDescription(/Calculada: 2\.074 kcal/)
  })

  it('CA-227: trocar o nível ou o peso muda a meta na hora', async () => {
    const usuario = montar(comMedidas)
    await usuario.click(screen.getByRole('radio', { name: 'Sedentário (1,2)' }))
    expect(meta()).toHaveAttribute('placeholder', '1.605')
    await usuario.clear(screen.getByLabelText('Peso'))
    await usuario.type(screen.getByLabelText('Peso'), '70')
    expect(meta()).toHaveAttribute('placeholder', '1.701')
  })

  it('CA-228: o número digitado vale mais, e mudar o nível não o altera', async () => {
    const usuario = montar(comMedidas)
    await usuario.type(meta(), '1800')
    expect(screen.getByText('definida por você')).toBeInTheDocument()
    expect(screen.getByText('Vale o seu número. Apague o campo para voltar à calculada (2.074 kcal).')).toBeInTheDocument()
    await usuario.click(screen.getByRole('radio', { name: 'Muito ativo (1,7)' }))
    expect(meta()).toHaveValue('1800')
  })

  it('CA-229: apagar a meta digitada volta à calculada', async () => {
    const usuario = montar({ ...comMedidas, metaEnergiaKcal: 1800 })
    await usuario.clear(meta())
    expect(meta()).toHaveValue('')
    expect(meta()).toHaveAttribute('placeholder', '2.074')
    expect(screen.getByText('calculada')).toBeInTheDocument()
  })

  it('CA-230: sem peso ou estatura, o nível continua e a tela diz o que falta', () => {
    montar(rapido)
    expect(screen.getByRole('radiogroup', { name: 'Nível de atividade' })).toBeInTheDocument()
    expect(screen.getByText('Informe peso e estatura para calcular a meta.')).toBeInTheDocument()
    expect(meta()).toHaveAttribute('placeholder', 'Digite a meta')
  })

  it('CA-232: fator próprio não marca nenhuma opção e aparece escrito', async () => {
    const usuario = montar({ ...rapido, energia: { fator: 1.45, formula: 'mifflin', getManual: null } })
    const niveis = within(screen.getByRole('radiogroup', { name: 'Nível de atividade' }))
    expect(niveis.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true')).toHaveLength(0)
    expect(screen.getByText('Fator próprio: 1,45')).toBeInTheDocument()
    await usuario.click(niveis.getByRole('radio', { name: 'Pouco ativo (1,37)' }))
    expect(niveis.getByRole('radio', { name: 'Pouco ativo (1,37)' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.queryByText('Fator próprio: 1,45')).not.toBeInTheDocument()
  })

  it('CA-233: com peso e estatura, o modo rápido continua sem IMC', () => {
    montar(comMedidas)
    expect(screen.queryByText(/kg\/m²/)).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Avaliação antropométrica' })).not.toBeInTheDocument()
  })

  it('Foco de revisão 1: vírgula sem decimal fica, e apagar tudo não devolve número ao campo', async () => {
    const usuario = montar(comMedidas)
    await usuario.type(meta(), '1800,')
    expect(meta()).toHaveValue('1800,')
    await usuario.clear(meta())
    expect(meta()).toHaveValue('')
    await usuario.type(meta(), '2')
    expect(meta()).toHaveValue('2')
  })
})
