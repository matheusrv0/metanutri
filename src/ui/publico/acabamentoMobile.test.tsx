// Spec ajustes-mobile, acabamento (29/10/2026): M-021, nada de letra de 11 px nos selos e no cartão da Conta; e o
// e-mail de contato de Preços com 44 px de toque (D-802).
import { render, screen, within } from '@testing-library/react'
import { MiniCartao } from '@/ui/conta/MiniCartao.tsx'
import { SecaoPrecos } from './SecaoPrecos.tsx'

const classes = (el: Element) => el.className.split(/\s+/)

describe('Acabamento do celular (spec ajustes-mobile)', () => {
  it('M-021: o selo "Recomendado" de Preços tem letra de 12 px', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" destaque="pro" />)
    for (const selo of screen.getAllByText('Recomendado')) {
      expect(classes(selo)).toContain('text-xs')
      expect(selo.className).not.toContain('text-[11px]')
    }
  })

  it('o e-mail de contato tem 44 px de toque sem mudar a linha do texto', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    // A nota da Clínica aparece na tabela (computador) e nos cartões (celular).
    for (const nota of screen.getAllByRole('note', { name: 'Plano Clínica' })) {
      expect(classes(within(nota).getByRole('link', { name: 'contato@exemplo.com' }))).toEqual(expect.arrayContaining(['py-3.5']))
    }
  })

  it('M-021: a bandeira do mini cartão da Conta tem letra de 12 px', () => {
    render(<MiniCartao bandeira="Mastercard" final="6351" nome="Mastercard final 6351" />)
    const cartao = screen.getByRole('img', { name: 'Mastercard final 6351' })
    expect(classes(cartao)).toContain('text-xs')
    expect(classes(cartao)).not.toContain('text-2xs')
  })
})
