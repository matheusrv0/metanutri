import { render, screen } from '@testing-library/react'
import { IconeMarca, NOMES_ICONE_MARCA } from '@ds/componentes/display/IconeMarca.tsx'
import { PontosDaMarca } from '@ds/componentes/display/PontosDaMarca.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

describe('IconeMarca (spec checkout-proprio, D-73)', () => {
  it('desenha os nove ícones no traço da marca, decorativos, na cor do texto e sem cor escrita', () => {
    const { container } = render(
      <>
        {NOMES_ICONE_MARCA.map((nome) => (
          <IconeMarca key={nome} nome={nome} />
        ))}
      </>,
    )
    const svgs = [...container.querySelectorAll('svg')]
    expect(svgs.map((svg) => svg.getAttribute('data-icone'))).toEqual(['cadeado', 'cartao', 'calendario', 'check', 'alerta', 'fechar', 'recibo', 'seta', 'estrela'])
    for (const svg of svgs) {
      expect(svg).toHaveAttribute('aria-hidden', 'true')
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
      expect(svg).toHaveClass('size-5')
      expect(svg.innerHTML).not.toMatch(/#[0-9a-f]{3,8}/i)
    }
  })

  it('com título, vira imagem com nome para o leitor de tela', () => {
    render(<IconeMarca nome="cadeado" titulo="Pagamento protegido" />)
    expect(screen.getByRole('img', { name: 'Pagamento protegido' })).toBeInTheDocument()
  })

  it('destaque pinta o ponto principal de laranja, como a última bolinha da logo', () => {
    const { container } = render(<IconeMarca nome="check" destaque />)
    expect(container.querySelectorAll('circle.fill-laranja')).toHaveLength(1)
  })

  it('sem destaque, nada de laranja', () => {
    const { container } = render(<IconeMarca nome="check" />)
    expect(container.querySelectorAll('.fill-laranja')).toHaveLength(0)
  })

  it('o tamanho e a cor vêm da classe', () => {
    const { container } = render(<IconeMarca nome="seta" className="size-4 text-muted-foreground" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('size-4', 'text-muted-foreground')
    expect(svg).not.toHaveClass('size-5')
  })
})

describe('PontosDaMarca', () => {
  it('quatro pontos do menor ao maior, o último laranja, escondidos do leitor de tela', () => {
    const { container } = render(<PontosDaMarca />)
    const grupo = container.querySelector('[data-pontos-da-marca]')
    expect(grupo).toHaveAttribute('aria-hidden', 'true')
    const pontos = [...(grupo?.children ?? [])]
    expect(pontos.map((p) => p.className.match(/size-[\d.]+/)?.[0])).toEqual(['size-1', 'size-1.5', 'size-2', 'size-2.5'])
    expect(pontos.at(-1)).toHaveClass('bg-laranja')
    expect(pontos.some((p) => p.className.includes('animate-pulse'))).toBe(false)
  })

  it('pulsando, os pontos pulsam só com movimento liberado', () => {
    const { container } = render(<PontosDaMarca pulsando />)
    for (const ponto of container.querySelectorAll('[data-pontos-da-marca] > span')) expect(ponto).toHaveClass('motion-safe:animate-pulse')
  })
})

describe('Dialog com o X da marca', () => {
  it('CA-383: iconeFechar troca o X da biblioteca, e o botão continua "Fechar"', () => {
    render(
      <Dialog open>
        <DialogContent iconeFechar={<IconeMarca nome="fechar" />}>
          <DialogTitle>Teste</DialogTitle>
          <DialogDescription>Só o botão de fechar importa aqui.</DialogDescription>
        </DialogContent>
      </Dialog>,
    )
    const fechar = screen.getByRole('button', { name: 'Fechar' })
    expect(fechar.querySelector('svg[data-icone="fechar"]')).not.toBeNull()
    expect(fechar.querySelectorAll('svg:not([data-icone])')).toHaveLength(0)
  })

  it('sem iconeFechar, o X de sempre continua lá', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Teste</DialogTitle>
          <DialogDescription>Nada muda para os outros diálogos.</DialogDescription>
        </DialogContent>
      </Dialog>,
    )
    expect(screen.getByRole('button', { name: 'Fechar' }).querySelector('svg')).not.toBeNull()
  })
})
