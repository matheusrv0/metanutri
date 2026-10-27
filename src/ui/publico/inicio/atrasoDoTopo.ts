// O movimento do topo da landing (spec landing-v3, D-655): a foto assenta e a etiqueta surge. Na página pré-desenhada
// (D-331), o movimento começa no HTML do build, antes do app; quando o React troca esse desenho pelo dele, as peças são
// novas e o CSS recomeçaria do zero (o salto que a D-549 evitava não animando). Aqui, o movimento novo começa com atraso
// negativo igual ao tempo que o antigo já correu, e continua do mesmo ponto.

interface Relogio {
  /** A landing chegou pelo app (sem a vitrine no HTML): nada foi animado ainda. */
  readonly veioPeloApp: boolean
  /** `performance.now()` agora, em ms. */
  readonly agora: number
  /** Quando a página pré-desenhada foi pintada pela primeira vez, em ms; nulo sem o registro. */
  readonly primeiroDesenho: number | null
}

/** CA-1657: quanto do movimento do topo a página pré-desenhada já correu, em ms. */
export function tempoJaAnimado({ veioPeloApp, agora, primeiroDesenho }: Relogio): number {
  if (veioPeloApp) return 0
  return Math.max(0, agora - (primeiroDesenho ?? 0))
}

/**
 * O tempo já animado, lido do navegador: a vitrine (`data-vitrine`) ainda está no HTML no primeiro desenho do app, e a
 * primeira pintura fica no registro de desempenho. No build (sem `document`), zero.
 */
export function atrasoDoTopo(): number {
  if (typeof document === 'undefined' || typeof performance === 'undefined') return 0
  const pintura = typeof performance.getEntriesByName === 'function' ? performance.getEntriesByName('first-paint')[0] : undefined
  return tempoJaAnimado({
    veioPeloApp: document.querySelector('[data-vitrine]') === null,
    agora: performance.now(),
    primeiroDesenho: pintura ? pintura.startTime : null,
  })
}
