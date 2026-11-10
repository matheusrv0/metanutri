import { render, screen, within } from '@testing-library/react'
import type { DietaDoLink } from '@/domain/dietaDoLink.ts'
import { MeuPlano } from './MeuPlano.tsx'

// Spec busca-substitutos, D-1115: a opção do item no "Meu plano" do paciente (CA-2123).

const DIETA: DietaDoLink = {
  refeicoes: [
    {
      horario: '12:00',
      nome: 'Almoço',
      opcoes: [
        [
          {
            medida: '6 colheres de sopa',
            gramas: 150,
            alimento: 'Arroz, tipo 1, cozido',
            escolhida: true,
            ou: [{ medida: '2 unidades e meia', gramas: 350, alimento: 'Batata, inglesa, cozida', escolhida: true }],
          },
        ],
      ],
    },
  ],
  orientacoes: '',
  receitas: '',
  quantidades: 'medida-e-gramas',
  copiadaEm: '2026-11-03',
}

describe('a opção do item no Meu plano', () => {
  it('CA-2123: "ou", a quantidade e o nome, dentro do item', () => {
    render(<MeuPlano dieta={DIETA} primeiroNome="Ana" />)
    const almoco = within(screen.getByRole('region', { name: '12:00 Almoço' }))
    const item = almoco.getByRole('listitem')
    expect(item).toHaveTextContent(/^6 colheres de sopa \(150 g\)Arroz.*ou2 unidades e meia \(350 g\)Batata/)
  })
})
