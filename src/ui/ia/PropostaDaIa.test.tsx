import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropostaConferida } from '@/domain/iaConferencia.ts'
import { PropostaDaIa } from './PropostaDaIa.tsx'

const PROPOSTA: PropostaConferida = {
  refeicoes: [
    {
      refeicao: 0,
      nome: 'Café da manhã',
      horario: '06:30',
      principal: [
        { alimentoId: 53, gramas: 50, marcas: [] },
        { alimentoId: 7, gramas: 30, marcas: ['Porção reduzida ao máximo do grupo'] },
      ],
      opcao2: [{ alimentoId: 182, gramas: 75, marcas: [] }],
      kcal: 268,
    },
    { refeicao: 1, nome: 'Ceia', horario: '22:00', principal: [], opcao2: [], kcal: 0 },
  ],
  retirados: [{ alimentoId: 458, nome: 'Leite, de vaca, integral', gramas: 200, refeicao: 0, opcao: 'opcao2', motivo: 'Alergia: leite e derivados' }],
  marcasDoPlano: ['Carboidrato 68% (meta até 65%)'],
  totais: { kcal: 2050, pctDaMeta: 97.6, proteinaG: 92.4, proteinaGKg: 1.36, carboidratoPct: 52.2, gorduraPct: 27.8 },
  abaixoDaMeta: [
    { nutriente: 'Cálcio', pct: 54 },
    { nutriente: 'Ferro', pct: 70 },
  ],
  pontosAConfirmar: ['Confirme o horário do sulfato ferroso.'],
}

describe('PropostaDaIa (spec assistente-ia, D-1307)', () => {
  it('CA-2367: os totais do app, as refeições com medida e gramas, a opção 2 e as marcas no item', () => {
    render(<PropostaDaIa proposta={PROPOSTA} />)
    const totais = screen.getByRole('group', { name: 'Totais calculados pelo app' })
    expect(totais).toHaveTextContent('2.050 kcal')
    expect(totais).toHaveTextContent('98% da meta')
    expect(totais).toHaveTextContent('92 g · 1,4 g/kg')
    expect(totais).toHaveTextContent('52%')
    expect(totais).toHaveTextContent('28%')
    expect(totais).toHaveTextContent('Carboidrato 68% (meta até 65%)')
    const cafe = screen.getByRole('region', { name: /Café da manhã/ })
    expect(cafe).toHaveTextContent('Pão, trigo, francês')
    expect(cafe).toHaveTextContent('50 g')
    expect(cafe).toHaveTextContent('Porção reduzida ao máximo do grupo')
    expect(cafe).toHaveTextContent('Opção 2')
  })

  it('CB-1304 e CB-1306: a refeição vazia aparece com "Sem itens sugeridos."', () => {
    render(<PropostaDaIa proposta={PROPOSTA} />)
    expect(within(screen.getByRole('region', { name: /Ceia/ })).getByText('Sem itens sugeridos.')).toBeInTheDocument()
  })

  it('CA-2367: os retirados, recolhíveis, com o alimento, onde estava e o motivo', async () => {
    render(<PropostaDaIa proposta={PROPOSTA} />)
    const botao = screen.getByRole('button', { name: /Retirados pela conferência/ })
    expect(botao).toHaveAttribute('aria-expanded', 'true')
    expect(botao).toHaveTextContent('1')
    expect(screen.getByText('Café da manhã, opção 2')).toBeInTheDocument()
    expect(screen.getByText('Alergia: leite e derivados')).toBeInTheDocument()
    await userEvent.setup().click(botao)
    expect(screen.queryByText('Alergia: leite e derivados')).not.toBeInTheDocument()
  })

  it('D-1307: abaixo da meta, com o Cobrir depois; e os pontos a confirmar só quando há', () => {
    const { rerender } = render(<PropostaDaIa proposta={PROPOSTA} />)
    expect(screen.getByText('Cálcio 54% · Ferro 70%')).toBeInTheDocument()
    expect(screen.getByText('Depois de usar, complete pelo Cobrir.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Pontos a confirmar' })).toBeInTheDocument()
    rerender(<PropostaDaIa proposta={{ ...PROPOSTA, pontosAConfirmar: [], retirados: [], abaixoDaMeta: [] }} />)
    expect(screen.queryByRole('heading', { name: 'Pontos a confirmar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Retirados/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Depois de usar, complete pelo Cobrir.')).not.toBeInTheDocument()
  })
})
