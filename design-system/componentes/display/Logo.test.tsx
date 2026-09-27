import { render, screen } from '@testing-library/react'
import { Logo } from './Logo.tsx'

describe('Logo', () => {
  it('é uma imagem com o nome do produto para o leitor de tela', () => {
    render(<Logo />)
    expect(screen.getByRole('img', { name: 'MetaNutri' })).toBeInTheDocument()
  })

  it('escreve MetaNutri em uma palavra, como o produto decidiu', () => {
    render(<Logo />)
    expect(screen.getByText('MetaNutri')).toBeInTheDocument()
    expect(screen.queryByText('Meta Nutri')).not.toBeInTheDocument()
  })

  it('no automático leva os dois símbolos, um para cada tema', () => {
    const { container } = render(<Logo />)
    const fontes = [...container.querySelectorAll('img')].map((i) => i.getAttribute('src'))
    expect(fontes).toEqual(['marca/simbolo.svg', 'marca/simbolo-fundo-escuro.svg'])
  })

  it('forçada para fundo claro usa só o símbolo colorido normal', () => {
    const { container } = render(<Logo variante="claro" />)
    const fontes = [...container.querySelectorAll('img')].map((i) => i.getAttribute('src'))
    expect(fontes).toEqual(['marca/simbolo.svg'])
  })

  it('forçada para fundo escuro usa a versão fundo-escuro, nunca a clara', () => {
    const { container } = render(<Logo variante="escuro" />)
    const fontes = [...container.querySelectorAll('img')].map((i) => i.getAttribute('src'))
    expect(fontes).toEqual(['marca/simbolo-fundo-escuro.svg'])
  })

  it('só o símbolo esconde o nome, mas mantém o rótulo acessível', () => {
    render(<Logo soSimbolo />)
    expect(screen.queryByText('MetaNutri')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'MetaNutri' })).toBeInTheDocument()
  })

  it('o tamanho pedido é o do símbolo: o nome escala na proporção do kit', () => {
    render(<Logo tamanho={32} />)
    // 32 px de símbolo a 1,6× o corpo → corpo de 20 px → 1,25 rem
    // O jsdom não converte rem; o que interessa é o valor que o componente escreveu.
    expect(screen.getByRole('img', { name: 'MetaNutri' }).style.fontSize).toBe('1.25rem')
  })

  it('os símbolos são decorativos: o nome acessível está no contêiner', () => {
    const { container } = render(<Logo />)
    for (const img of container.querySelectorAll('img')) expect(img).toHaveAttribute('alt', '')
  })
})
