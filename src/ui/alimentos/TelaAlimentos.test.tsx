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

  it('CA-794 (spec revisao-geral-trabalho): "100 g" não quebra entre o número e a unidade', () => {
    render(<TelaAlimentos aoAbrirFontes={vi.fn()} />)
    expect(screen.getByText(/valores por 100/).textContent).toContain('100\u00a0g')
  })

  it('CA-340: grupo, ordem e completude são listas de escolha', async () => {
    render(<TelaAlimentos />)
    const usuario = userEvent.setup()
    expect(screen.getByRole('searchbox', { name: 'Buscar alimento na tabela' })).toBeInTheDocument()
    const grupo = screen.getByRole('combobox', { name: 'Grupo' })
    const ordem = screen.getByRole('combobox', { name: 'Ordem' })
    const completude = screen.getByRole('combobox', { name: 'Nutrientes disponíveis' })
    expect(screen.queryByRole('button', { name: /^Todas · / })).not.toBeInTheDocument()

    await usuario.selectOptions(completude, 'minimo')
    const lista = within(screen.getByRole('list', { name: 'Alimentos da tabela' }))
    expect(lista.getAllByText(', poucos nutrientes').length).toBeGreaterThan(0)
    expect(lista.queryByText(', parte dos nutrientes')).not.toBeInTheDocument()

    await usuario.selectOptions(completude, '')
    await usuario.selectOptions(grupo, 'Cereais e derivados')
    await usuario.selectOptions(ordem, 'energia')
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument()
  })

  it('CA-341: a linha mostra nome, grupo e kcal, e a legenda explica as marcas', () => {
    render(<TelaAlimentos />)
    const legenda = screen.getByRole('list', { name: 'Legenda' })
    expect(within(legenda).getByText('parte dos nutrientes')).toBeInTheDocument()
    expect(within(legenda).getByText('poucos nutrientes')).toBeInTheDocument()
    const primeira = within(screen.getByRole('list', { name: 'Alimentos da tabela' })).getAllByRole('listitem')[0] as HTMLElement
    expect(primeira.textContent).toMatch(/kcal|— kcal/)
    expect(primeira.querySelector('.text-muted-foreground')?.textContent).not.toBe('')
  })

  const abrirFicha = async (busca: string) => {
    render(<TelaAlimentos />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByRole('searchbox', { name: 'Buscar alimento na tabela' }), busca)
    await usuario.click(within(screen.getByRole('list', { name: 'Alimentos da tabela' })).getAllByRole('button')[0] as HTMLElement)
    return within(screen.getByRole('dialog'))
  }

  it('CA-959 e CA-960 (spec vitaminas-usda): os valores do USDA levam a marca, e o rodapé diz de onde vieram', async () => {
    const ficha = await abrirFicha('salmão sem pele grelhado')
    const composicao = within(ficha.getByRole('list', { name: 'Composição' }))
    const vitaminaD = composicao.getByText('vitamina D').closest('li') as HTMLElement
    expect(vitaminaD).toHaveTextContent(/^vitamina D13 µgUSDAvalor do USDA$/)
    expect(within(vitaminaD).getByText('valor do USDA')).toHaveClass('sr-only')
    // O que é da TACO não leva marca; o nulo do equivalente aparece como não analisado, sem marca.
    expect(composicao.getByText('ferro').closest('li')).not.toHaveTextContent('USDA')
    expect(composicao.getByText('gordura trans').closest('li')).toHaveTextContent(/^gordura transnão analisado$/)
    expect(composicao.getAllByText('USDA')).toHaveLength(5)
    expect(ficha.getByText('Os valores marcados USDA são do alimento equivalente nº 175168 do USDA FoodData Central (SR Legacy, abril de 2018).')).toBeInTheDocument()
    expect(ficha.getByText(/^\d+ de 20 nutrientes$/)).toBeInTheDocument()
  })

  it('CA-961 (spec vitaminas-usda): sem equivalente, uma linha só e nenhuma marca', async () => {
    const ficha = await abrirFicha('cuscuz milho')
    expect(ficha.getByText('Sem dado de vitamina D, vitamina E, folato, vitamina B12, selênio e gordura trans.')).toBeInTheDocument()
    expect(ficha.queryByText('USDA')).not.toBeInTheDocument()
    expect(ficha.queryByText(/FoodData Central/)).not.toBeInTheDocument()
  })

  it('CA-962 (spec vitaminas-usda): a ficha vazia não diz um número de nutrientes', () => {
    render(<TelaAlimentos />)
    expect(screen.getByText('Escolha um alimento da lista para ver a composição, as medidas caseiras e o que a tabela não mediu.')).toBeInTheDocument()
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
