// Arredondar um percentual para a tela sem desmentir o estado (spec painel-lateral-enxuto, D-211, que revê o D-209).
// Com 89,6% e limite de 90%, o mais perto daria "90%" em cor de abaixo; aí vai para baixo e sai "89%". Longe do
// limite, o mais perto: 125,2% sai "125%".

export type SentidoDoEstado = 'abaixo' | 'acima' | 'dentro'

/** Os limites do estado: `min` para "abaixo", `max` para "acima". A adequação só tem o de baixo (a meta). */
export interface LimitesDoEstado {
  readonly min?: number
  readonly max?: number
}

/**
 * Para o mais perto, salvo quando ele cruzaria o limite do estado: abaixo, se chegaria ao limite de baixo, vai para
 * baixo; acima, se não passaria do limite de cima, vai para cima. Sem o limite do estado, fica o sentido do estado,
 * que nunca desmente a cor.
 */
export function arredondarNoEstado(valor: number, estado: SentidoDoEstado | null, limites: LimitesDoEstado | null): number {
  const maisPerto = Math.round(valor)
  if (estado === 'abaixo') {
    const limite = limites?.min
    return limite === undefined || maisPerto >= limite ? Math.floor(valor) : maisPerto
  }
  if (estado === 'acima') {
    const limite = limites?.max
    return limite === undefined || maisPerto <= limite ? Math.ceil(valor) : maisPerto
  }
  return maisPerto
}
