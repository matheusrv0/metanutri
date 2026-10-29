// Spec ajustes-mobile (auditoria de 29/10/2026): as regras do design system que seguram as falhas do celular. O jsdom
// não aplica largura nem ponteiro; aqui se conferem as classes, e o e2e `ajustes-mobile-ds.spec.ts` mede no navegador.
import { render, screen, within } from '@testing-library/react'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { CartaoNumero } from '@ds/componentes/display/CartaoNumero.tsx'
import { GraficoBarras } from '@ds/componentes/display/GraficoBarras.tsx'
import { LinhaLista } from '@ds/componentes/display/LinhaLista.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Switch } from '@ds/componentes/forms/switch.tsx'
import { EtapasDoCaso } from '@ds/componentes/navigation/EtapasDoCaso.tsx'
import { ItemMenu } from '@ds/componentes/navigation/ItemMenu.tsx'

const classes = (el: Element) => el.className.split(/\s+/)

describe('LinhaLista (M-006)', () => {
  it('M-006: o título quebra em até duas linhas, com o nome inteiro no title, e o detalhe quebra livre', () => {
    render(<LinhaLista titulo="Ana — retorno de outubro" detalhe="Alterado hoje às 07:00 · atendimento completo" />)
    const titulo = screen.getByText('Ana — retorno de outubro')
    expect(classes(titulo)).toEqual(expect.arrayContaining(['line-clamp-2', 'break-words']))
    expect(classes(titulo)).not.toContain('truncate')
    expect(titulo).toHaveAttribute('title', 'Ana — retorno de outubro')
    const detalhe = screen.getByText('Alterado hoje às 07:00 · atendimento completo')
    expect(classes(detalhe)).not.toContain('truncate')
    expect(classes(detalhe)).toContain('break-words')
  })
})

describe('Toque no tablet (M-018)', () => {
  it('M-018: a partir de 640 px, o botão só fica na densidade de computador com mouse; no toque, 44 px', () => {
    render(
      <>
        <Button>Padrão</Button>
        <Button size="sm">Pequeno</Button>
        <Button size="icon" aria-label="Ícone" />
        <Button size="iconsm" aria-label="Ícone pequeno" />
      </>,
    )
    expect(classes(screen.getByRole('button', { name: 'Padrão' }))).toEqual(expect.arrayContaining(['h-11', 'sm:h-10', 'sm:pointer-coarse:h-11']))
    expect(classes(screen.getByRole('button', { name: 'Pequeno' }))).toEqual(expect.arrayContaining(['h-11', 'sm:h-8', 'sm:pointer-coarse:h-11']))
    expect(classes(screen.getByRole('button', { name: 'Ícone' }))).toEqual(expect.arrayContaining(['size-11', 'sm:size-10', 'sm:pointer-coarse:size-11']))
    expect(classes(screen.getByRole('button', { name: 'Ícone pequeno' }))).toEqual(expect.arrayContaining(['size-11', 'sm:size-8', 'sm:pointer-coarse:size-11']))
  })

  it('M-018: o campo volta aos 44 px e à letra de 16 px no toque a partir de 640 px', () => {
    render(<Input aria-label="Nome" />)
    expect(classes(screen.getByRole('textbox', { name: 'Nome' }))).toEqual(expect.arrayContaining(['sm:pointer-coarse:h-11', 'sm:pointer-coarse:text-base']))
  })

  it('M-018: quem troca a altura e a letra a partir de 640 px (D-312) manda também no toque', () => {
    render(<Input aria-label="Código" className="h-12 text-xl sm:h-12 sm:text-xl" />)
    const campo = screen.getByRole('textbox', { name: 'Código' })
    expect(classes(campo)).toEqual(expect.arrayContaining(['h-12', 'sm:h-12', 'text-xl', 'sm:text-xl']))
    expect(classes(campo)).not.toContain('sm:pointer-coarse:h-11')
    expect(classes(campo)).not.toContain('sm:pointer-coarse:text-base')
  })
})

describe('Interruptor (M-019)', () => {
  it('M-019: tem uma área de toque invisível de 44 × 44 px em volta dos 36 × 20 px', () => {
    render(<Switch aria-label="Trocas" />)
    const chave = screen.getByRole('switch', { name: 'Trocas' })
    expect(classes(chave)).toEqual(expect.arrayContaining(['relative', 'h-5', 'w-9', 'before:absolute', 'before:-inset-x-1.5', 'before:-inset-y-3.5']))
  })
})

describe('Item do menu lateral (M-020)', () => {
  it('M-020: tem 44 px no toque e 40 px no computador com mouse', () => {
    render(<ItemMenu icone={null} rotulo="Painel" ativo={false} aoClicar={() => {}} />)
    const item = screen.getByRole('button', { name: 'Painel' })
    expect(classes(item)).toEqual(expect.arrayContaining(['min-h-11', 'sm:min-h-10', 'sm:pointer-coarse:min-h-11']))
    expect(classes(item)).not.toContain('min-h-10')
  })
})

describe('Selo (M-021)', () => {
  it('M-021: a letra do selo tem 12 px (text-xs), não 11', () => {
    render(<Badge>CRN conferido</Badge>)
    const selo = screen.getByText('CRN conferido')
    expect(classes(selo)).toContain('text-xs')
    expect(classes(selo)).not.toContain('text-2xs')
  })
})

describe('Etapas do plano (M-027)', () => {
  it('M-027: a descrição da etapa quebra em até duas linhas em vez de ser cortada numa', () => {
    render(<EtapasDoCaso abaAtual="plano" aoEscolher={() => {}} />)
    const descricao = screen.getByText('Alimentos, substitutos e orientações')
    expect(classes(descricao)).toContain('sm:line-clamp-2')
    expect(classes(descricao)).not.toContain('truncate')
  })
})

describe('Cartão de número (M-014)', () => {
  it('M-014: o valor curto fica no tamanho de destaque', () => {
    render(<CartaoNumero valor="R$ 1.026,45" rotulo="Receita por mês" />)
    expect(classes(screen.getByText('R$ 1.026,45'))).toContain('text-4xl')
  })

  it('M-014: o valor longo desce um degrau e, se ainda não couber, quebra em vez de vazar do cartão', () => {
    render(<CartaoNumero valor="R$ 24.693.353,80" rotulo="Receita por mês" />)
    const valor = screen.getByText('R$ 24.693.353,80')
    expect(classes(valor)).toEqual(expect.arrayContaining(['text-3xl', '[overflow-wrap:anywhere]']))
    expect(classes(valor)).not.toContain('text-4xl')
  })
})

describe('Gráfico de barras (M-015)', () => {
  const marcas = [
    { valor: 0, rotulo: '0' },
    { valor: 15000, rotulo: '150' },
  ]
  const barra = (chave: string, destaque = false) => ({ chave, rotulo: chave, valor: 14900, dica: `${chave} · R$ 149,00`, destaque, valorEscrito: destaque ? 'R$ 149,00' : undefined })

  it('M-015: na última barra, o valor escrito e a dica se prendem à borda direita, sem passar do gráfico', () => {
    render(<GraficoBarras descricao="Receita" marcas={marcas} barras={[barra('set'), barra('out', true)]} />)
    const ultima = screen.getAllByRole('listitem')[1] as HTMLElement
    const escrito = within(ultima).getByText('R$ 149,00')
    expect(classes(escrito)).toEqual(expect.arrayContaining(['right-0', 'whitespace-nowrap']))
    expect(classes(escrito)).not.toContain('inset-x-0')
    expect(classes(within(ultima).getByText('out · R$ 149,00'))).toContain('right-0')
  })

  it('M-015: na primeira barra, a ponta é a esquerda; no meio, o centro', () => {
    render(<GraficoBarras descricao="Receita" marcas={marcas} barras={[barra('ago', true), barra('set', true), barra('out')]} />)
    const [primeira, meio] = screen.getAllByRole('listitem') as HTMLElement[]
    expect(classes(within(primeira as HTMLElement).getByText('R$ 149,00'))).toContain('left-0')
    expect(classes(within(meio as HTMLElement).getByText('R$ 149,00'))).toContain('left-1/2')
  })
})
