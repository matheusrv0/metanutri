// Rótulos em caixa de frase, regra do dono (spec alimentos-e-gramaturas, correção A, D-437; I3 da revisão como
// usuária: "PARTE DOS NUTRIENTES", "SUGESTÕES", "DO GASTO").
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Scale } from 'lucide-react'
import { CartaoDestaque } from '@ds/componentes/nutricao/CartaoDestaque.tsx'
import { EntradaRapida } from '../plano/EntradaRapida.tsx'

describe('caixa de frase nos rótulos (CA-1241)', () => {
  it('o utilitário "rotulo" não põe o texto em caixa alta nem espaça as letras', () => {
    // O Vitest não carrega CSS (css: false): o arquivo é lido como texto.
    const globais = readFileSync(join(process.cwd(), 'src', 'ui', 'tema', 'globals.css'), 'utf-8')
    const bloco = /@utility rotulo \{([^}]*)\}/.exec(globais)?.[1] ?? ''
    expect(bloco).not.toBe('')
    expect(bloco).not.toMatch(/uppercase/)
    expect(bloco).not.toMatch(/letter-spacing/)
  })

  it('o selo do cartão de destaque fica em caixa de frase', () => {
    render(<CartaoDestaque icone={Scale} valor="1.800" unidade="kcal" rotulo="Energia do plano" apoio="Meta do dia" tom="branco" />)
    expect(screen.getByText('Energia do plano').className).not.toMatch(/uppercase/)
  })

  it('a entrada rápida só marca "poucos nutrientes"; "parte dos nutrientes" fica na Tabela', async () => {
    render(<EntradaRapida rotulo="Adicionar alimento" aoAdicionar={vi.fn()} />)
    await userEvent.setup().type(screen.getByRole('combobox', { name: 'Adicionar alimento' }), '150 arroz')
    expect(screen.getAllByRole('option').length).toBeGreaterThan(0)
    expect(screen.queryByText('parte dos nutrientes')).not.toBeInTheDocument()
  })
})
