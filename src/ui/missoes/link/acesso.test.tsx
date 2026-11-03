// O link com o leitor de tela, o teclado e o dedo (spec lado-do-paciente, D-1211, CA-2217 e CA-2218).
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { abrirLink, HOJE, linkDeTeste } from './linkDeTeste.test-utils.tsx'

describe('CA-2217: o leitor de tela', () => {
  it('CA-2217: a barra de baixo é navegação com três links nomeados, a atual marcada', () => {
    abrirLink()
    const barra = screen.getByRole('navigation', { name: 'Partes do plano' })
    expect(within(barra).getAllByRole('link').map((l) => l.textContent)).toEqual(['Hoje', 'Plano', 'Semana'])
    expect(within(barra).getByRole('link', { current: 'page' })).toHaveTextContent('Hoje')
  })

  it('CA-2217: a missão é botão de alternar com o nome e o estado ("Almoço por volta das 12h30, feita")', () => {
    abrirLink(linkDeTeste({ marcacoes: [{ dia: HOJE, feitas: ['refeicao-almoco'] }] }))
    const almoco = screen.getByRole('button', { name: 'Almoço por volta das 12h30, feita' })
    expect(almoco).toHaveAttribute('aria-pressed', 'true')
    expect(almoco).toHaveAccessibleDescription('Refeição do plano')
    expect(screen.getByRole('button', { name: 'Lanche por volta das 16h' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('CA-2217: "Ver" é botão com o nome da refeição', () => {
    abrirLink()
    expect(screen.getByRole('button', { name: 'Ver o lanche no plano' })).toBeInTheDocument()
  })

  it('CA-2217: o seletor de opções é um grupo de abas', async () => {
    abrirLink()
    await userEvent.setup().click(screen.getByRole('link', { name: 'Plano' }))
    const seletor = within(screen.getByRole('region', { name: '12:30 Almoço' })).getByRole('tablist')
    expect(within(seletor).getAllByRole('tab')).toHaveLength(2)
  })

  it('CA-2217: tudo funciona com o teclado: Tab chega na missão e Espaço marca', async () => {
    abrirLink()
    const usuario = userEvent.setup()
    const cafe = screen.getByRole('button', { name: 'Café da manhã por volta das 7h' })
    cafe.focus()
    await usuario.keyboard(' ')
    expect(screen.getByRole('button', { name: 'Café da manhã por volta das 7h, feita' })).toHaveAttribute('aria-pressed', 'true')
    await usuario.tab()
    expect(screen.getByRole('button', { name: 'Ver o café da manhã no plano' })).toHaveFocus()
  })
})

describe('CA-2218: o toque', () => {
  it('CA-2218: a missão tem 64 px e o "Ver" 44 px; a linha da semana, 56 px', () => {
    abrirLink()
    expect(screen.getByRole('button', { name: 'Café da manhã por volta das 7h' }).className).toContain('min-h-16')
    expect(screen.getByRole('button', { name: 'Ver o café da manhã no plano' }).className).toContain('h-11')
    expect(screen.getByRole('button', { name: /de 7 dias nesta semana/ }).className).toContain('min-h-14')
  })

  it('CA-2218 e CB-1218: textos longos quebram em qualquer ponto (nada rola de lado)', () => {
    const longo = 'Missão com um nome enorme sem espaço AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
    abrirLink(linkDeTeste({ missoes: [{ id: 'x', texto: longo, origem: 'Hábito' }] }))
    expect(screen.getByText(longo).className).toContain('[overflow-wrap:anywhere]')
  })
})
