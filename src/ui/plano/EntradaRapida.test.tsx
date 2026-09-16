import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EntradaRapida } from './EntradaRapida.tsx'

const adicionados: { alimentoId: number; gramas: number }[] = []

beforeEach(() => {
  localStorage.clear()
  adicionados.length = 0
})

const montar = () => {
  render(<EntradaRapida rotulo="Adicionar alimento" aoAdicionar={(alimentoId, gramas) => adicionados.push({ alimentoId, gramas })} comAtalhos />)
  return userEvent.setup()
}

describe('Alimentos usados com frequência', () => {
  it('sem comAtalhos, nada é lembrado (é o caso da janela de substituto)', async () => {
    render(<EntradaRapida rotulo="Escolher substituto" aoAdicionar={(alimentoId, gramas) => adicionados.push({ alimentoId, gramas })} />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByRole('combobox', { name: 'Escolher substituto' }), '150 arroz integral{Enter}')
    expect(adicionados).toHaveLength(1)
    expect(screen.queryByText('Você usa muito')).not.toBeInTheDocument()
  })

  it('não mostra atalho nenhum antes do primeiro uso', () => {
    montar()
    expect(screen.queryByText('Você usa muito')).not.toBeInTheDocument()
  })

  it('o alimento adicionado vira atalho com a mesma porção', async () => {
    const usuario = montar()
    const campo = screen.getByRole('combobox', { name: 'Adicionar alimento' })
    await usuario.type(campo, '150 arroz integral')
    await usuario.keyboard('{Enter}')

    expect(adicionados).toHaveLength(1)
    expect(adicionados[0]?.gramas).toBe(150)

    expect(screen.getByText('Você usa muito')).toBeInTheDocument()
    const atalho = screen.getByRole('button', { name: /150 g$/ })
    await usuario.click(atalho)

    expect(adicionados).toHaveLength(2)
    expect(adicionados[1]).toEqual(adicionados[0])
  })

  it('o atalho some enquanto você está digitando uma busca', async () => {
    const usuario = montar()
    const campo = screen.getByRole('combobox', { name: 'Adicionar alimento' })
    await usuario.type(campo, '150 arroz integral')
    await usuario.keyboard('{Enter}')
    expect(screen.getByText('Você usa muito')).toBeInTheDocument()

    await usuario.type(campo, 'feijão')
    expect(screen.queryByText('Você usa muito')).not.toBeInTheDocument()
  })
})
