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
 * primeira pintura fica no registro de desempenho (o first-paint, ou o first-contentful-paint onde ele não existe). No build
 * (sem `document`), zero.
 */
export function atrasoDoTopo(): number {
  if (typeof document === 'undefined' || typeof performance === 'undefined') return 0
  // O Safari e o Firefox não registram o first-paint; neles vale o first-contentful-paint (revisão da v9).
  const registro = (nome: string) => (typeof performance.getEntriesByName === 'function' ? performance.getEntriesByName(nome)[0] : undefined)
  const pintura = registro('first-paint') ?? registro('first-contentful-paint')
  return tempoJaAnimado({
    veioPeloApp: document.querySelector('[data-vitrine]') === null,
    agora: performance.now(),
    primeiroDesenho: pintura ? pintura.startTime : null,
  })
}
