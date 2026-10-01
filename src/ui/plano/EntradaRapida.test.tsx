import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EntradaRapida } from './EntradaRapida.tsx'

const adicionados: { alimentoId: number; gramas: number }[] = []

beforeEach(() => {
  localStorage.clear()
  adicionados.length = 0
})

const montar = () => {
  render(<EntradaRapida rotulo="Adicionar alimento" aoAdicionar={(alimentoId, gramas) => adicionados.push({ alimentoId, gramas })} />)
  return userEvent.setup()
}

describe('Conteúdo com o campo vazio (CA-307)', () => {
  it('aparece com o campo vazio e some enquanto se digita', async () => {
    render(
      <EntradaRapida
        rotulo="Adicionar alimento"
        aoAdicionar={(alimentoId, gramas) => adicionados.push({ alimentoId, gramas })}
        quandoVazio={<p>Sugestões de teste</p>}
      />,
    )
    const usuario = userEvent.setup()
    const campo = screen.getByRole('combobox', { name: 'Adicionar alimento' })
    expect(screen.getByText('Sugestões de teste')).toBeInTheDocument()
    await usuario.type(campo, 'arroz')
    expect(screen.queryByText('Sugestões de teste')).not.toBeInTheDocument()
    await usuario.clear(campo)
    expect(screen.getByText('Sugestões de teste')).toBeInTheDocument()
  })

  it('CB-55: adicionar pela busca não grava mais histórico no aparelho', async () => {
    const usuario = montar()
    await usuario.type(screen.getByRole('combobox', { name: 'Adicionar alimento' }), '150 arroz integral{Enter}')
    expect(adicionados).toHaveLength(1)
    expect(localStorage.getItem('metanutri:frequentes')).toBeNull()
    expect(screen.queryByText('Você usa muito')).not.toBeInTheDocument()
  })
})

describe('Honestidade do dado', () => {
  it('alimento sem energia na tabela mostra travessão, não zero', async () => {
    const usuario = montar()
    await usuario.type(screen.getByRole('combobox', { name: 'Adicionar alimento' }), 'leite de vaca integral')
    const opcao = screen.getAllByRole('option').find((o) => o.textContent?.includes('Leite, de vaca, integral'))
    expect(opcao).toBeDefined()
    expect(opcao?.textContent).toContain('— kcal')
    expect(opcao?.textContent).not.toContain('0 kcal')
  })

  it('alimento com dado faltando sai marcado na lista', async () => {
    const usuario = montar()
    await usuario.type(screen.getByRole('combobox', { name: 'Adicionar alimento' }), 'leite de vaca integral')
    const opcao = screen.getAllByRole('option').find((o) => o.textContent?.includes('Leite, de vaca, integral'))
    expect(opcao?.textContent).toMatch(/dado (parcial|mínimo)/)
  })
})
