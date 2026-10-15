// Arredondar um percentual para a tela sem desmentir o estado (spec painel-lateral-enxuto, D-209).
// Com 89,6% e limite de 90%, o mais perto daria "90%" em cor de abaixo; para baixo dá "89%".

export type SentidoDoEstado = 'abaixo' | 'acima' | 'dentro'

/** Abaixo arredonda para baixo, acima para cima; dentro, ou sem estado, para o mais perto. */
export function arredondarNoEstado(valor: number, estado: SentidoDoEstado | null): number {
  if (estado === 'abaixo') return Math.floor(valor)
  if (estado === 'acima') return Math.ceil(valor)
  return Math.round(valor)
}
