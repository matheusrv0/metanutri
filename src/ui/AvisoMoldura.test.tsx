import { render, screen } from '@testing-library/react'
import { AvisoMoldura } from './AvisoMoldura.tsx'
import { estaEmMoldura } from './moldura.ts'

describe('Site dentro de moldura (D-99)', () => {
  it('CA-431 e CA-1420 (spec separacao-site-app): só aparece o aviso, com o link que abre o app fora da moldura', () => {
    const { container } = render(<AvisoMoldura />)
    expect(container).toHaveTextContent(/^Abra o MetaNutri direto no navegador\.app\.metanutri\.com\.br$/)
    const link = screen.getByRole('link', { name: 'app.metanutri.com.br' })
    expect(link).toHaveAttribute('href', 'https://app.metanutri.com.br/')
    expect(link).toHaveAttribute('target', '_top')
  })

  it('CA-431: percebe quando a janela não é a de cima', () => {
    const janela = {}
    expect(estaEmMoldura({ top: janela, self: janela })).toBe(false)
    expect(estaEmMoldura({ top: {}, self: janela })).toBe(true)
  })

  it('CA-431: se o navegador não deixa nem olhar a janela de cima, trata como moldura', () => {
    const janela = {
      get top(): unknown {
        throw new Error('bloqueado')
      },
      self: {},
    }
    expect(estaEmMoldura(janela)).toBe(true)
  })
})
