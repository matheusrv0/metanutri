// Modelos de plano: um plano salvo para servir de ponto de partida do próximo.
import type { Armazenamento } from './persistencia.ts'
import type { Plano } from './tipos.ts'

const CHAVE = 'metanutri:modelos'

export interface ModeloPlano {
  readonly id: string
  readonly nome: string
  /** Para que serve: emagrecimento, gestante, vegetariano. */
  readonly descricao: string
  readonly plano: Plano
  readonly criadoEm: string
}

export interface RepositorioModelos {
  listar(): readonly ModeloPlano[]
  obter(id: string): ModeloPlano | null
  salvar(dados: { readonly nome: string; readonly descricao: string; readonly plano: Plano }): ModeloPlano
  excluir(id: string): void
  readonly persistente: boolean
}

function ehModelo(v: unknown): v is ModeloPlano {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  const plano = o['plano'] as { refeicoes?: unknown } | undefined
  return typeof o['id'] === 'string' && typeof o['nome'] === 'string' && Array.isArray(plano?.refeicoes)
}

/** Copia o plano trocando todos os ids, para o modelo e o plano novo viverem separados. */
export function clonarPlano(plano: Plano, gerarId: () => string): Plano {
  return {
    refeicoes: plano.refeicoes.map((r) => ({
      ...r,
      id: gerarId(),
      opcoes: {
        principal: r.opcoes.principal.map((i) => ({ ...i, id: gerarId() })),
        substituto1: r.opcoes.substituto1.map((i) => ({ ...i, id: gerarId() })),
        substituto2: r.opcoes.substituto2.map((i) => ({ ...i, id: gerarId() })),
      },
    })),
  }
}

export interface OpcoesModelos {
  readonly agora?: () => string
  readonly gerarId?: () => string
}

export function criarRepositorioModelos(armazenamento: Armazenamento | null, opcoes: OpcoesModelos = {}): RepositorioModelos {
  const agora = opcoes.agora ?? (() => new Date().toISOString())
  const gerarId = opcoes.gerarId ?? (() => globalThis.crypto.randomUUID())
  const memoria = new Map<string, ModeloPlano>()
  let persistente = armazenamento !== null

  const ler = (): ModeloPlano[] => {
    if (!persistente || !armazenamento) return [...memoria.values()]
    try {
      const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE) ?? '[]')
      return Array.isArray(bruto) ? bruto.filter(ehModelo) : []
    } catch {
      return [...memoria.values()]
    }
  }

  const gravar = (lista: readonly ModeloPlano[]) => {
    memoria.clear()
    for (const m of lista) memoria.set(m.id, m)
    if (!persistente || !armazenamento) return
    try {
      armazenamento.setItem(CHAVE, JSON.stringify(lista))
    } catch {
      persistente = false
    }
  }

  return {
    get persistente() {
      return persistente
    },

    listar() {
      return ler().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    },

    obter(id) {
      return ler().find((m) => m.id === id) ?? null
    },

    salvar({ nome, descricao, plano }) {
      const modelo: ModeloPlano = { id: gerarId(), nome, descricao, plano: clonarPlano(plano, gerarId), criadoEm: agora() }
      gravar([...ler(), modelo])
      return modelo
    },

    excluir(id) {
      gravar(ler().filter((m) => m.id !== id))
    },
  }
}
