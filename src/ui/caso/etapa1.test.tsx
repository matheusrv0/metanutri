import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { criarCasoVazio } from '@/domain/caso.ts'
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

const adulta: Partial<Caso> = { sexo: 'F', idadeAnos: 28, pesoKg: 62, estaturaCm: 165 }

describe('Quantidades para o paciente (spec conduta-da-nutricionista, D-297)', () => {
  it('CA-924: plano novo vem com "Medida caseira", e a escolha muda o plano', async () => {
    const usuario = montar(adulta)
    const escolha = screen.getByRole('radiogroup', { name: 'Quantidades para o paciente' })
    expect(within(escolha).getByRole('radio', { name: 'Medida caseira' })).toHaveAttribute('aria-checked', 'true')
    expect(within(escolha).getByRole('radio', { name: 'Gramas' })).toHaveAttribute('aria-checked', 'false')
    await usuario.click(within(escolha).getByRole('radio', { name: 'Gramas' }))
    expect(within(escolha).getByRole('radio', { name: 'Gramas' })).toHaveAttribute('aria-checked', 'true')
    expect(within(escolha).getByRole('radio', { name: 'Medida caseira' })).toHaveAttribute('aria-checked', 'false')
  })

  it('CA-924: fica no cartão Identificação, o primeiro da etapa', () => {
    montar(adulta)
    const identificacao = screen.getByRole('heading', { name: 'Identificação' }).closest('[data-slot="card"]')
    expect(identificacao).not.toBeNull()
    expect(within(identificacao as HTMLElement).getByRole('radiogroup', { name: 'Quantidades para o paciente' })).toBeInTheDocument()
  })
})

describe('Água na dieta (spec conduta-da-nutricionista, D-298)', () => {
  it('CA-932: o campo mostra a linha automática; escrever troca, apagar tira, e "Usar a automática" volta à conta', async () => {
    const usuario = montar(adulta)
    const campo = screen.getByLabelText('Água na dieta')
    expect(campo).toHaveValue('Beba cerca de 2,2 litros de água por dia.')
    expect(screen.queryByRole('button', { name: 'Usar a automática' })).not.toBeInTheDocument()

    await usuario.clear(campo)
    expect(campo).toHaveValue('')
    await usuario.type(campo, 'Beba 2 litros de água por dia.')
    expect(campo).toHaveValue('Beba 2 litros de água por dia.')

    await usuario.click(screen.getByRole('button', { name: 'Usar a automática' }))
    expect(campo).toHaveValue('Beba cerca de 2,2 litros de água por dia.')
    expect(screen.queryByRole('button', { name: 'Usar a automática' })).not.toBeInTheDocument()
  })

  it('CA-932: a linha automática acompanha o peso enquanto não há edição', async () => {
    const usuario = montar(adulta)
    const peso = screen.getByLabelText('Peso')
    await usuario.clear(peso)
    await usuario.type(peso, '80')
    expect(screen.getByLabelText('Água na dieta')).toHaveValue('Beba cerca de 2,8 litros de água por dia.')
  })

  it('CB-298: sem peso, o campo fica vazio, com a dica de informar o peso', () => {
    montar({ ...adulta, pesoKg: null })
    const campo = screen.getByLabelText('Água na dieta')
    expect(campo).toHaveValue('')
    expect(campo).toHaveAttribute('placeholder', 'Informe o peso para a meta automática')
  })
})

describe('Etapa 1 mais limpa (US-B4)', () => {
  it('CA-329: cartões sem a frase de descrição', () => {
    montar(adulta)
    expect(screen.queryByText('Aparece no cabeçalho do documento exportado.')).not.toBeInTheDocument()
    expect(screen.queryByText(/Base da antropometria e do gasto energético/)).not.toBeInTheDocument()
    expect(screen.queryByText('Entram no documento de aconselhamento exportado.')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Condição fisiológica' })).not.toBeInTheDocument()
  })

  it('CA-330 e CA-331: masculino não vê condição; adulto não vê meses nem panturrilha', () => {
    montar({ ...adulta, sexo: 'M' })
    expect(screen.queryByRole('radiogroup', { name: 'Condição' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Meses além dos anos')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Circunferência da panturrilha')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Circunferência da cintura')).toBeInTheDocument()
  })

  it('CA-331: os campos aparecem quando a idade pede', async () => {
    const usuario = montar(adulta)
    const idade = screen.getByLabelText('Idade')
    await usuario.clear(idade)
    await usuario.type(idade, '8')
    expect(screen.getByLabelText('Meses além dos anos')).toBeInTheDocument()
    await usuario.clear(idade)
    await usuario.type(idade, '72')
    expect(screen.queryByLabelText('Meses além dos anos')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Circunferência da panturrilha')).toBeInTheDocument()
  })

  it('CB-73: campo com valor continua aparecendo', () => {
    montar({ ...adulta, idadeAnos: 45, circunferenciaPanturrilhaCm: 33, idadeMesesAdicionais: 4 })
    expect(screen.getByLabelText('Circunferência da panturrilha')).toHaveValue('33')
    expect(screen.getByLabelText('Meses além dos anos')).toHaveValue('4')
  })

  it('CA-332: composição corporal e observações recolhidas, e abrem com um clique', async () => {
    const usuario = montar(adulta)
    const composicao = screen.getByRole('button', { name: /Composição corporal/ })
    const observacoes = screen.getByRole('button', { name: /Observações/ })
    expect(composicao).toHaveAttribute('aria-expanded', 'false')
    expect(observacoes).toHaveAttribute('aria-expanded', 'false')
    await usuario.click(composicao)
    expect(composicao).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('radiogroup', { name: 'Protocolo de dobras' })).toBeVisible()
  })

  it('CA-332: já abertos quando têm dado', () => {
    const vazio = criarCasoVazio('c1')
    montar({
      ...adulta,
      observacoes: 'Prefere jantar cedo.',
      composicao: { ...vazio.composicao, dobras: { ...vazio.composicao.dobras, tricipital: 12 } },
    })
    expect(screen.getByRole('button', { name: /Composição corporal/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /Observações/ })).toHaveAttribute('aria-expanded', 'true')
  })

  it('CA-333: avaliação mostra valor e classificação na mesma linha', () => {
    montar(adulta)
    const imc = screen.getByText('22,8 kg/m²')
    expect(imc.parentElement?.textContent).toMatch(/22,8 kg\/m² · Eutrofia/)
  })
})
