import { render, screen } from '@testing-library/react'
import { AvisoMoldura } from './AvisoMoldura.tsx'
import { estaEmMoldura } from './moldura.ts'

describe('Site dentro de moldura (D-99)', () => {
  it('CA-431: só aparece o aviso, com o link que abre o site fora da moldura', () => {
    const { container } = render(<AvisoMoldura />)
    expect(container).toHaveTextContent(/^Abra o MetaNutri direto no navegador\.metanutri\.com\.br$/)
    const link = screen.getByRole('link', { name: 'metanutri.com.br' })
    expect(link).toHaveAttribute('href', 'https://metanutri.com.br/')
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
