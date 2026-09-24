import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarCasoVazio } from '@/domain/caso.ts'
import type { Caso } from '@/domain/tipos.ts'
import { TelaCaso } from './TelaCaso.tsx'

function Anfitriao({ inicial }: { readonly inicial?: Partial<Caso> }) {
  const [caso, setCaso] = useState<Caso>({ ...criarCasoVazio('c1'), ...inicial })
  return <TelaCaso caso={caso} aoAlterar={(m) => setCaso((c) => ({ ...c, ...m }))} />
}

const montar = (inicial?: Partial<Caso>) => {
  render(<Anfitriao {...(inicial ? { inicial } : {})} />)
  return userEvent.setup()
}

const preencher = async (usuario: ReturnType<typeof userEvent.setup>, rotulo: string, valor: string) => {
  const campo = screen.getByLabelText(rotulo)
  await usuario.clear(campo)
  await usuario.type(campo, valor)
}

const painel = () => within(screen.getByRole('region', { name: 'Avaliação antropométrica' }))
const semCalculo = () => expect(painel().queryByText(/kg\/m²/)).not.toBeInTheDocument()

const adulta = { sexo: 'F', idadeAnos: 28, pesoKg: 68, estaturaCm: 165 } as const

describe('Etapa 1: dados do caso', () => {
  it('CA-01: mostra todos os campos do cabeçalho do estágio', () => {
    montar()
    for (const rotulo of [
      'Nome do plano',
      'Diagnóstico clínico',
      'Data da consulta',
      'Ocupação',
      'Estagiário(a)',
      'Preceptor(a)',
      'Idade',
      'Peso',
      'Estatura',
      'Observações',
    ]) {
      expect(screen.getByLabelText(rotulo)).toBeInTheDocument()
    }
    expect(screen.getByRole('radiogroup', { name: 'Sexo' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Objetivo' })).toBeInTheDocument()
  })

  it('CA-02, CA-05 e CB-12: IMC de adulto com vírgula decimal, classificação e fonte', async () => {
    const usuario = montar({ sexo: 'F', idadeAnos: 28 })
    await preencher(usuario, 'Peso', '68,5')
    await preencher(usuario, 'Estatura', '165')

    expect(screen.getByLabelText('Peso')).toHaveValue('68,5')
    expect(painel().getByText('25,2 kg/m²')).toBeInTheDocument()
    expect(painel().getByText('IMC (referência de adulto)')).toBeInTheDocument()
    expect(painel().getByText('Sobrepeso')).toBeInTheDocument()

    // CA-05: a fonte não fica na cara do dado, mas continua a um clique.
    const verFontes = painel().getByRole('button', { name: /Ver a(s \d+)? fontes?/ })
    expect(verFontes).toHaveAttribute('aria-expanded', 'false')
    await usuario.click(verFontes)
    expect(verFontes).toHaveAttribute('aria-expanded', 'true')
    expect(painel().getByText(/IMC:/)).toBeInTheDocument()
    expect(painel().getByText(/SISVAN/)).toBeInTheDocument()
  })

  it('CA-02: idoso usa a referência de idoso', () => {
    montar({ ...adulta, idadeAnos: 72, pesoKg: 55, estaturaCm: 158 })
    expect(painel().getByText('IMC (referência de idoso)')).toBeInTheDocument()
  })

  it('CA-02a: criança recebe escore-z de IMC e de estatura para a idade', () => {
    montar({ sexo: 'M', idadeAnos: 8, idadeMesesAdicionais: 6, pesoKg: 25, estaturaCm: 128 })
    expect(painel().getByText('IMC-para-idade')).toBeInTheDocument()
    expect(painel().getByText('Estatura-para-idade')).toBeInTheDocument()
    expect(painel().getByText(/aos 102 meses/)).toBeInTheDocument()
  })

  it('CA-02b: gestante pede idade gestacional e peso pré-gestacional e mostra o ganho recomendado', async () => {
    const usuario = montar(adulta)
    await usuario.click(screen.getByRole('radio', { name: 'Gestante' }))

    expect(screen.getByLabelText('Idade gestacional')).toBeInTheDocument()
    await preencher(usuario, 'Idade gestacional', '24')
    await preencher(usuario, 'Peso pré-gestacional', '60')

    expect(painel().getByText('IMC pré-gestacional')).toBeInTheDocument()
    expect(painel().getByText(/ganho recomendado de 8,0 a 12,0 kg/)).toBeInTheDocument()
    expect(painel().getByText(/ganho atual de 8,0 kg/)).toBeInTheDocument()
  })

  it('CA-02c: lactante pede o tempo pós-parto', async () => {
    const usuario = montar(adulta)
    await usuario.click(screen.getByRole('radio', { name: 'Lactante' }))
    expect(screen.getByLabelText('Tempo pós-parto')).toBeInTheDocument()
  })

  it('CB-02a: gestante com sexo masculino é recusada com explicação', async () => {
    const usuario = montar({ ...adulta, sexo: 'M' })
    await usuario.click(screen.getByRole('radio', { name: 'Gestante' }))
    expect(screen.getByRole('alert')).toHaveTextContent('só pode ser marcada para o sexo feminino')
  })

  it('CA-03: cintura de adulto mostra classificação e fonte', async () => {
    const usuario = montar(adulta)
    await preencher(usuario, 'Circunferência da cintura', '92')
    expect(painel().getByText('Circunferência da cintura')).toBeInTheDocument()

    // CA-05: com duas referências na tela, as duas fontes continuam registradas.
    await usuario.click(painel().getByRole('button', { name: /Ver as \d+ fontes/ }))
    expect(painel().getByText(/^IMC:/)).toBeInTheDocument()
    expect(painel().getByText(/^Cintura:/)).toBeInTheDocument()
  })

  it('CA-04: panturrilha de idoso mostra classificação', async () => {
    const usuario = montar({ sexo: 'F', idadeAnos: 72, pesoKg: 55, estaturaCm: 158 })
    await preencher(usuario, 'Circunferência da panturrilha', '29')
    expect(painel().getByText('Circunferência da panturrilha')).toBeInTheDocument()
  })

  it('CB-01: sem peso e estatura, nada é calculado e o painel diz o que falta', () => {
    montar({ sexo: 'F', idadeAnos: 28 })
    expect(painel().getByText(/Informe peso, estatura/)).toBeInTheDocument()
    semCalculo()
  })

  it('CB-02: idade abaixo de 1 ano é recusada', async () => {
    const usuario = montar(adulta)
    await preencher(usuario, 'Idade', '0')
    expect(screen.getByRole('alert')).toHaveTextContent('a partir de 1 ano')
    semCalculo()
  })

  it('CB-03: peso fora da faixa marca o campo e suspende o cálculo', async () => {
    const usuario = montar(adulta)
    await preencher(usuario, 'Peso', '400')
    expect(screen.getByLabelText('Peso')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('alert')).toHaveTextContent('entre 5 e 350 kg')
    semCalculo()
  })
})
