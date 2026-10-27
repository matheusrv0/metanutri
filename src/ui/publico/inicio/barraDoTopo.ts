// A barra do topo da landing (spec landing-escura, D-545): pinta a cor da seção que está embaixo dela e sai do caminho
// de quem desce a página. O comportamento é o do rascunho medido (index2.html).

/** O campo de cor de cada seção, marcado nela com `data-capitulo`. */
export type Capitulo = 'teal' | 'chao' | 'afundado' | 'marfim' | 'fim'

export type TintaDaBarra = 'teal' | 'chao' | 'afundado' | 'escondida'

export interface FaixaDoCapitulo {
  readonly capitulo: Capitulo
  /** Em px, a partir do alto da janela (`getBoundingClientRect`). */
  readonly topo: number
  readonly base: number
}

const TINTA: Readonly<Record<Capitulo, TintaDaBarra>> = {
  teal: 'teal',
  // Sobre a faixa marfim, a barra fica teal: marfim sobre marfim sumiria.
  marfim: 'teal',
  chao: 'chao',
  afundado: 'afundado',
  // No rodapé, a barra sai: o rodapé tem os mesmos caminhos.
  fim: 'escondida',
}

/** CA-1460: a tinta pela seção que está embaixo do meio da barra; sem seção embaixo, a do topo da página. */
export function tintaDaBarra(faixas: readonly FaixaDoCapitulo[], meioDaBarra: number): TintaDaBarra {
  const embaixo = faixas.find((f) => f.topo <= meioDaBarra && f.base > meioDaBarra)
  return embaixo ? TINTA[embaixo.capitulo] : 'teal'
}

/** A partir de quanto rolado a barra pode sair, em px: no alto da página, ela fica. */
export const ROLAGEM_PARA_SUMIR = 200

/** CA-1459: some ao descer além de 200 px; volta ao subir. */
export function barraSome(yAtual: number, yAnterior: number): boolean {
  return yAtual > yAnterior && yAtual > ROLAGEM_PARA_SUMIR
}
