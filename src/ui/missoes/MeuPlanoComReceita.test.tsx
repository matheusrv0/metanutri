import { render, screen, within } from '@testing-library/react'
import type { DietaDoLink } from '@/domain/dietaDoLink.ts'
import { MeuPlano } from './MeuPlano.tsx'

// Spec receitas-com-calculo, US-RC5: a receita no "Meu plano" do paciente (CA-883, CA-884).

const DIETA: DietaDoLink = {
  refeicoes: [{ horario: '07:00', nome: 'Café da manhã', opcoes: [[{ medida: '1 unidade', gramas: 120, alimento: 'Panqueca de banana', receita: true }]] }],
  orientacoes: '',
  receitas: 'Suco verde: couve, limão e água.',
  receitasDoPlano: [
    {
      nome: 'Panqueca de banana',
      rendimento: 'Rende 2 unidades (120 g cada)',
      ingredientes: [
        { medida: '2 unidades', gramas: 150, alimento: 'Banana, prata, crua' },
        { medida: null, gramas: 100, alimento: 'Ovo, de galinha, inteiro, cru' },
      ],
      preparo: 'Amasse a banana, misture o ovo.\nDoure dos dois lados.',
    },
  ],
  copiadaEm: '2026-10-19',
}

describe('a receita no Meu plano', () => {
  it('CA-883: na refeição, a porção, o peso e o nome da receita', () => {
    render(<MeuPlano dieta={DIETA} primeiroNome="Ana" />)
    const cafe = within(screen.getByRole('region', { name: '07:00 Café da manhã' }))
    expect(cafe.getByText('1 unidade')).toBeInTheDocument()
    expect(cafe.getByText('Panqueca de banana')).toBeInTheDocument()
    // Uma quantidade só (spec conduta-da-nutricionista, D-297).
    expect(cafe.getByRole('listitem')).toHaveTextContent(/^1 unidadePanqueca de banana$/)
  })

  it('CA-971 (integracao-rodada-1910): receita com o nome de um prato da base mostra a porção, como a folha', () => {
    const dieta: DietaDoLink = {
      refeicoes: [{ horario: '12:00', nome: 'Almoço', opcoes: [[{ medida: '1 porção', gramas: 300, alimento: 'Feijoada', receita: true }]] }],
      orientacoes: '',
      receitas: '',
      copiadaEm: '2026-10-20',
    }
    render(<MeuPlano dieta={dieta} primeiroNome="Ana" />)
    const almoco = within(screen.getByRole('region', { name: '12:00 Almoço' }))
    expect(almoco.getByRole('listitem')).toHaveTextContent(/^1 porçãoFeijoada$/)
  })

  it('CA-884: a seção Receitas traz a receita inteira e, depois, o texto livre', () => {
    render(<MeuPlano dieta={DIETA} primeiroNome="Ana" />)
    const secao = screen.getByRole('region', { name: 'Receitas' })
    const receita = within(secao).getByRole('article', { name: 'Panqueca de banana' })
    expect(receita).toHaveTextContent('Rende 2 unidades (120 g cada)')
    // Os ingredientes seguem as regras da folha, como os itens da refeição (spec revisao-geral-publica, D-231): o nome
    // para o paciente e a quantidade da folha, que é o que a folha impressa já mostra na seção Receitas.
    expect(within(receita).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      '2 unidadesBanana prata',
      '100 gOvo',
    ])
    expect(within(receita).getByText(/Amasse a banana/)).toHaveClass('whitespace-pre-wrap')
    expect(secao.textContent?.indexOf('Suco verde')).toBeGreaterThan(secao.textContent?.indexOf('Amasse a banana') ?? Infinity)
  })

  it('link de antes desta versão: só o texto livre, como antes', () => {
    const antiga: DietaDoLink = { refeicoes: DIETA.refeicoes, orientacoes: DIETA.orientacoes, receitas: DIETA.receitas, copiadaEm: DIETA.copiadaEm }
    render(<MeuPlano dieta={antiga} primeiroNome="Ana" />)
    const secao = screen.getByRole('region', { name: 'Receitas' })
    expect(within(secao).queryByRole('article')).not.toBeInTheDocument()
    expect(secao).toHaveTextContent('Suco verde')
  })

  it('CB-316 (integracao-rodada-1910, revisão final M-1): cópia em "Gramas" sem o campo (toda medida vazia) sai em peso, como a folha', () => {
    const semCampo: DietaDoLink = {
      refeicoes: [{ horario: '12:00', nome: 'Almoço', opcoes: [[{ medida: null, gramas: 150, alimento: 'Arroz, tipo 1, cozido' }]] }],
      orientacoes: '',
      receitas: '',
      copiadaEm: '2026-10-20',
    }
    render(<MeuPlano dieta={semCampo} primeiroNome="Ana" />)
    expect(within(screen.getByRole('region', { name: '12:00 Almoço' })).getByRole('listitem')).toHaveTextContent(/^150 gArroz branco cozido$/)
  })
})
