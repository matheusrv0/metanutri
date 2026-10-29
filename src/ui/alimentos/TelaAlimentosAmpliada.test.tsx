// Spec base-ampliada, CA-1718, CA-1719 e CB-707: a Tabela de alimentos com a base ampliada.
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import arquivo from '@/data/base-ampliada.json'
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from '@/domain/baseAmpliada.ts'
import { registrarBaseAmpliada } from '@/domain/tabelas.ts'
import { carregarBaseAmpliada, prepararBaseAmpliadaParaTeste } from '../estado/baseAmpliada.ts'
import { TelaAlimentos } from './TelaAlimentos.tsx'

const ARQUIVO = arquivo as unknown as ArquivoBaseAmpliada
const TOTAL = 597 + ARQUIVO.alimentos.length

afterEach(() => {
  prepararBaseAmpliadaParaTeste({ automatico: false })
  registrarBaseAmpliada([])
})

const abrirFicha = async (busca: string, nome: string) => {
  const usuario = userEvent.setup()
  await usuario.type(screen.getByRole('searchbox', { name: 'Buscar alimento na tabela' }), busca)
  await usuario.click(within(screen.getByRole('list', { name: 'Alimentos da tabela' })).getByRole('button', { name: new RegExp(`^${nome}`) }))
  return within(screen.getByRole('dialog'))
}

describe('Tabela de alimentos com a base ampliada (spec base-ampliada)', () => {
  it('CA-1716 e CA-1718: quando a base chega, o topo conta a base inteira, sem recarregar a tela', async () => {
    prepararBaseAmpliadaParaTeste({ carregar: () => Promise.resolve(ARQUIVO), automatico: false })
    render(<TelaAlimentos />)
    expect(screen.getByText(/^Base MetaNutri · 597 alimentos/)).toBeInTheDocument()
    await act(() => carregarBaseAmpliada())
    expect(screen.getByText(new RegExp(`^Base MetaNutri · ${TOTAL} alimentos`))).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Grupo' })).toHaveTextContent(`Todos · ${TOTAL}`)
  })

  it('CA-1718: "Base MetaNutri" inclui a tilápia, e a ficha tem a medida, os nutrientes e a origem no rodapé', async () => {
    registrarBaseAmpliada(decodificarBaseAmpliada(ARQUIVO))
    render(<TelaAlimentos />)
    await userEvent.setup().selectOptions(screen.getByRole('combobox', { name: 'Origem' }), 'base')
    const ficha = await abrirFicha('tilápia', 'Tilápia, filé, grelhada')
    expect(within(ficha.getByRole('list', { name: 'Medidas caseiras' })).getByText('filé · 87 g')).toBeInTheDocument()
    const composicao = within(ficha.getByRole('list', { name: 'Composição' }))
    expect(composicao.getByText('vitamina D').closest('li')).toHaveTextContent(/^vitamina D3,7 µg$/)
    expect(composicao.queryByText('USDA')).not.toBeInTheDocument()
    expect(ficha.getByText('Valores do alimento nº 175177 do USDA FoodData Central (SR Legacy, abril de 2018): “Fish, tilapia, cooked, dry heat”.')).toBeInTheDocument()
    expect(ficha.queryByText(/^Sem dado de vitamina D/)).not.toBeInTheDocument()
    expect(ficha.getByText(/^Fonte: Base MetaNutri\./)).toBeInTheDocument()
  })

  it('CA-1719: no Foundation completado, a marca SR e o número do SR no rodapé', async () => {
    registrarBaseAmpliada(decodificarBaseAmpliada(ARQUIVO))
    render(<TelaAlimentos />)
    const ficha = await abrirFicha('tilápia crua', 'Tilápia, filé, crua')
    const composicao = within(ficha.getByRole('list', { name: 'Composição' }))
    expect(composicao.getAllByText('SR').length).toBeGreaterThan(0)
    expect(composicao.getAllByText('valor do SR Legacy')[0]).toHaveClass('sr-only')
    expect(ficha.getByText(/^Valores do alimento nº 2684442 do USDA FoodData Central \(Foundation Foods, outubro de 2026\)/)).toBeInTheDocument()
    expect(ficha.getByText('Os valores marcados SR são do nº 175176 (SR Legacy, abril de 2018), o mesmo alimento, que completa o que a Foundation não publicou.')).toBeInTheDocument()
  })

  it('CB-707: a ficha da base ampliada tem "Medida sua" e "Copiar para Meus alimentos"', async () => {
    registrarBaseAmpliada(decodificarBaseAmpliada(ARQUIVO))
    render(<TelaAlimentos formularioNovo />)
    const ficha = await abrirFicha('quinoa cozida', 'Quinoa, cozida')
    expect(ficha.getByRole('button', { name: 'Medida sua' })).toBeInTheDocument()
    expect(ficha.getByRole('button', { name: 'Copiar para Meus alimentos' })).toBeInTheDocument()
  })
})
