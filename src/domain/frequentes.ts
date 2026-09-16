// Alimentos que você mais usa: atalho para não buscar de novo o arroz de todo dia.
import type { Armazenamento } from './persistencia.ts'

const CHAVE = 'metanutri:frequentes'

/** Quantas vezes o alimento foi usado, quando foi a última e em que quantidade. */
export interface UsoAlimento {
  readonly vezes: number
  readonly ultimoUso: string
  /** Gramas da última vez: o atalho repete a porção de sempre. */
  readonly gramas: number
}

export interface AlimentoFrequente {
  readonly alimentoId: number
  readonly gramas: number
}

export interface RepositorioFrequentes {
  /** Conta mais um uso do alimento, guardando a quantidade usada. */
  registrar(alimentoId: number, gramas: number): void
  /** Do mais usado para o menos usado; empate desempata pelo uso mais recente. */
  maisUsados(limite?: number): readonly AlimentoFrequente[]
  esquecer(alimentoId: number): void
  readonly persistente: boolean
}

export const LIMITE_FREQUENTES = 6

type Mapa = Record<string, UsoAlimento>

function ehUso(v: unknown): v is UsoAlimento {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return typeof o['vezes'] === 'number' && typeof o['ultimoUso'] === 'string' && typeof o['gramas'] === 'number'
}

export interface OpcoesFrequentes {
  readonly agora?: () => string
}

export function criarRepositorioFrequentes(armazenamento: Armazenamento | null, opcoes: OpcoesFrequentes = {}): RepositorioFrequentes {
  const agora = opcoes.agora ?? (() => new Date().toISOString())
  let memoria: Mapa = {}
  let persistente = armazenamento !== null

  const ler = (): Mapa => {
    if (!persistente || !armazenamento) return memoria
    try {
      const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE) ?? '{}')
      if (typeof bruto !== 'object' || bruto === null) return {}
      const limpo: Mapa = {}
      for (const [id, uso] of Object.entries(bruto as Record<string, unknown>)) {
        if (Number.isFinite(Number(id)) && ehUso(uso)) limpo[id] = uso
      }
      return limpo
    } catch {
      return memoria
    }
  }

  const gravar = (mapa: Mapa) => {
    memoria = mapa
    if (!persistente || !armazenamento) return
    try {
      armazenamento.setItem(CHAVE, JSON.stringify(mapa))
    } catch {
      persistente = false
    }
  }

  return {
    get persistente() {
      return persistente
    },

    registrar(alimentoId, gramas) {
      const mapa = ler()
      const atual = mapa[String(alimentoId)]
      gravar({ ...mapa, [String(alimentoId)]: { vezes: (atual?.vezes ?? 0) + 1, ultimoUso: agora(), gramas } })
    },

    maisUsados(limite = LIMITE_FREQUENTES) {
      return Object.entries(ler())
        .sort(([, a], [, b]) => b.vezes - a.vezes || b.ultimoUso.localeCompare(a.ultimoUso))
        .slice(0, limite)
        .map(([id, uso]) => ({ alimentoId: Number(id), gramas: uso.gramas }))
    },

    esquecer(alimentoId) {
      const alvo = String(alimentoId)
      gravar(Object.fromEntries(Object.entries(ler()).filter(([id]) => id !== alvo)))
    },
  }
}
