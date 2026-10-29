// Spec ajustes-mobile, acabamento (29/10/2026): a regra do toque (M-018, D-802) nos componentes que tinham ficado de
// fora, e a área de toque das barras do gráfico. O jsdom não aplica largura nem ponteiro: aqui vão as classes; o e2e
// `acabamento-mobile.spec.ts` mede no navegador.
import { render, screen } from '@testing-library/react'
import { Fontes } from '@ds/componentes/display/Fontes.tsx'
import { GraficoBarras } from '@ds/componentes/display/GraficoBarras.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'
import { Select, SelectTrigger, SelectValue } from '@ds/componentes/forms/select.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'
import { Sheet, SheetContent, SheetTitle } from '@ds/componentes/overlay/sheet.tsx'

const classes = (el: Element) => el.className.split(/\s+/)

describe('Toque no tablet, o que faltava (M-018)', () => {
  it('M-018: a lista de escolha volta aos 44 px e à letra de 16 px no toque a partir de 640 px', () => {
    render(
      <Select>
        <SelectTrigger aria-label="Nome da porção">
          <SelectValue placeholder="Escolha" />
        </SelectTrigger>
      </Select>,
    )
    expect(classes(screen.getByRole('combobox', { name: 'Nome da porção' }))).toEqual(
      expect.arrayContaining(['h-11', 'sm:h-10', 'sm:pointer-coarse:h-11', 'text-base', 'sm:text-sm', 'sm:pointer-coarse:text-base']),
    )
  })

  it('M-018: a caixa de texto volta à letra de 16 px no toque (o iPad aproxima a tela com 14 px)', () => {
    render(<Textarea aria-label="Orientações" />)
    expect(classes(screen.getByRole('textbox', { name: 'Orientações' }))).toEqual(expect.arrayContaining(['text-base', 'sm:text-sm', 'sm:pointer-coarse:text-base']))
  })

  it('M-018: quem troca a letra no sm: manda também no toque (D-312)', () => {
    render(<Textarea aria-label="Nota" className="text-lg sm:text-lg" />)
    expect(classes(screen.getByRole('textbox', { name: 'Nota' }))).not.toContain('sm:pointer-coarse:text-base')
  })

  it('M-018: o segmento e a opção em pílula têm 44 px no toque', () => {
    render(
      <>
        <SeletorSegmentado rotulo="Período" valor="m" aoEscolher={() => {}} opcoes={[{ valor: 'm', rotulo: 'Mensal' }]} />
        <GrupoOpcoes rotulo="Sexo" valor={null} aoEscolher={() => {}} opcoes={[{ valor: 'f', rotulo: 'Feminino' }]} />
      </>,
    )
    expect(classes(screen.getByRole('radio', { name: 'Mensal' }))).toEqual(expect.arrayContaining(['min-h-11', 'sm:min-h-9', 'sm:pointer-coarse:min-h-11']))
    const pilula = screen.getByText('Feminino').closest('label') ?? screen.getByRole('radio', { name: 'Feminino' })
    expect(classes(pilula)).toEqual(expect.arrayContaining(['max-sm:min-h-11', 'sm:pointer-coarse:min-h-11']))
  })

  it('M-018: o "Fontes" (o link das citações) tem 44 px no toque', () => {
    render(<Fontes itens={[{ texto: 'TACO 4ª edição' }]} />)
    expect(classes(screen.getByRole('button'))).toEqual(expect.arrayContaining(['max-sm:min-h-11', 'sm:pointer-coarse:min-h-11']))
  })

  it('M-018: o "Fechar" da gaveta tem 44 × 44 px no toque', () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Cobrir ferro</SheetTitle>
        </SheetContent>
      </Sheet>,
    )
    expect(classes(screen.getByRole('button', { name: 'Fechar' }))).toEqual(
      expect.arrayContaining(['max-sm:size-11', 'sm:pointer-coarse:size-11', 'sm:pointer-coarse:right-2', 'sm:pointer-coarse:top-2']),
    )
  })
})

describe('Gráfico de barras: área de toque', () => {
  it('a barra inteira, com o vão até a vizinha, é a área de toque: o espaço entre as barras vira recuo dentro do item', () => {
    render(
      <GraficoBarras
        descricao="Receita"
        marcas={[{ valor: 0, rotulo: '0' }]}
        barras={[
          { chave: 'a', rotulo: 'set', valor: 1, dica: 'set' },
          { chave: 'b', rotulo: 'out', valor: 2, dica: 'out' },
        ]}
      />,
    )
    const lista = screen.getByRole('list', { name: 'Receita' })
    expect(classes(lista)).not.toContain('gap-2')
    expect(classes(screen.getAllByRole('listitem')[0] as HTMLElement)).toEqual(expect.arrayContaining(['px-1', 'sm:px-1.75']))
  })
})
