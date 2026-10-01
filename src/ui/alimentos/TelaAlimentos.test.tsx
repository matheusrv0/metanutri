import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TelaAlimentos } from './TelaAlimentos.tsx'

describe('Tabela de alimentos (US-B4)', () => {
  it('CA-321 e CA-323: topo diz Base MetaNutri e leva às fontes', async () => {
    const aoAbrirFontes = vi.fn()
    render(<TelaAlimentos aoAbrirFontes={aoAbrirFontes} />)
    expect(screen.getByText(/^Base MetaNutri · 597 alimentos · valores por 100 g/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/TACO|POF|IBGE|NEPA|UNICAMP/)
    const botao = screen.getByRole('button', { name: 'Fontes da base' })
    expect(botao).toHaveClass('min-h-11')
    await userEvent.setup().click(botao)
    expect(aoAbrirFontes).toHaveBeenCalledOnce()
  })

  it('CA-340: grupo, ordem e completude são listas de escolha', async () => {
    render(<TelaAlimentos />)
    const usuario = userEvent.setup()
    expect(screen.getByRole('searchbox', { name: 'Buscar alimento na tabela' })).toBeInTheDocument()
    const grupo = screen.getByRole('combobox', { name: 'Grupo' })
    const ordem = screen.getByRole('combobox', { name: 'Ordem' })
    const completude = screen.getByRole('combobox', { name: 'Completude do dado' })
    expect(screen.queryByRole('button', { name: /^Todas · / })).not.toBeInTheDocument()

    await usuario.selectOptions(completude, 'minimo')
    const lista = within(screen.getByRole('list', { name: 'Alimentos da tabela' }))
    expect(lista.getAllByText(', dado mínimo').length).toBeGreaterThan(0)
    expect(lista.queryByText(', dado parcial')).not.toBeInTheDocument()

    await usuario.selectOptions(completude, '')
    await usuario.selectOptions(grupo, 'Cereais e derivados')
    await usuario.selectOptions(ordem, 'energia')
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument()
  })

  it('CA-341: a linha mostra nome, grupo e kcal, e a legenda explica as marcas', () => {
    render(<TelaAlimentos />)
    const legenda = screen.getByRole('list', { name: 'Legenda' })
    expect(within(legenda).getByText('dado parcial')).toBeInTheDocument()
    expect(within(legenda).getByText('dado mínimo')).toBeInTheDocument()
    const primeira = within(screen.getByRole('list', { name: 'Alimentos da tabela' })).getAllByRole('listitem')[0] as HTMLElement
    expect(primeira.textContent).toMatch(/kcal|— kcal/)
    expect(primeira.querySelector('.text-muted-foreground')?.textContent).not.toBe('')
  })

  it('a ficha fala em Base MetaNutri, sem nome de origem', async () => {
    render(<TelaAlimentos />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar alimento na tabela' }), 'arroz integral cozido')
    await usuario.click(within(screen.getByRole('list', { name: 'Alimentos da tabela' })).getAllByRole('button')[0] as HTMLElement)
    const ficha = within(screen.getByRole('dialog'))
    expect(ficha.getByText(/^Fonte: Base MetaNutri\./)).toBeInTheDocument()
    expect(ficha.queryByText(/TACO|POF|IBGE/)).not.toBeInTheDocument()
  })
})
