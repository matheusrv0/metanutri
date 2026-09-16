// Alimentos que a pessoa nunca quer ver nas sugestões, em qualquer plano deste aparelho.
const CHAVE = 'metanutri:sugestoes-ocultas'

function armazenamento(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

const memoria = new Set<number>()

export function lerOcultosGlobais(): ReadonlySet<number> {
  const guardado = armazenamento()
  if (!guardado) return memoria
  try {
    const bruto: unknown = JSON.parse(guardado.getItem(CHAVE) ?? '[]')
    return new Set(Array.isArray(bruto) ? bruto.filter((x): x is number => typeof x === 'number') : [])
  } catch {
    return memoria
  }
}

export function ocultarGlobalmente(alimentoId: number): void {
  const lista = [...lerOcultosGlobais(), alimentoId]
  memoria.add(alimentoId)
  try {
    armazenamento()?.setItem(CHAVE, JSON.stringify([...new Set(lista)]))
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
}

export function mostrarNovamente(alimentoId: number): void {
  memoria.delete(alimentoId)
  try {
    armazenamento()?.setItem(CHAVE, JSON.stringify([...lerOcultosGlobais()].filter((id) => id !== alimentoId)))
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
}
