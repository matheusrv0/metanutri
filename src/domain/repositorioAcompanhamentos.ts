// Onde os acompanhamentos ficam guardados. Hoje: o navegador de quem montou o plano.
// Amanhã: o Supabase, sem reescrever tela nenhuma — é para isso que existe a
// interface `FonteAcompanhamentos` no fim do arquivo.
import type { Acompanhamento } from './acompanhamento.ts'
import type { Armazenamento } from './persistencia.ts'

const CHAVE = 'metanutri:acompanhamentos'
const FORMATO = 1

interface ArquivoSalvo {
  readonly formato: number
  readonly itens: readonly Acompanhamento[]
}

function ehAcompanhamento(v: unknown): v is Acompanhamento {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o['id'] === 'string' &&
    typeof o['token'] === 'string' &&
    typeof o['casoId'] === 'string' &&
    typeof o['nome'] === 'string' &&
    typeof o['criadoEm'] === 'string' &&
    Array.isArray(o['missoes']) &&
    Array.isArray(o['marcacoes'])
  )
}

export function criarRepositorioAcompanhamentos(armazenamento: Armazenamento | null) {
  // Espelho em memória: é a única fonte quando o navegador bloqueia o armazenamento.
  let memoria: Acompanhamento[] = []
  let persistente = false
  let aviso: string | null = null

  if (armazenamento === null) {
    aviso = 'Este navegador não permite guardar dados: os links de missões não sobrevivem ao fechar.'
  } else {
    try {
      armazenamento.setItem(`${CHAVE}:teste`, '1')
      armazenamento.removeItem(`${CHAVE}:teste`)
      persistente = true
    } catch {
      aviso = 'O navegador bloqueou o armazenamento: os links de missões não sobrevivem ao fechar.'
    }
  }

  const ler = (): Acompanhamento[] => {
    if (!persistente || !armazenamento) return memoria
    try {
      const bruto = armazenamento.getItem(CHAVE)
      if (bruto === null) return []
      const v: unknown = JSON.parse(bruto)
      if (typeof v !== 'object' || v === null) return []
      const arquivo = v as Partial<ArquivoSalvo>
      if (arquivo.formato !== FORMATO || !Array.isArray(arquivo.itens)) return []
      return arquivo.itens.filter(ehAcompanhamento)
    } catch {
      return memoria
    }
  }

  const gravar = (itens: readonly Acompanhamento[]) => {
    memoria = [...itens]
    if (!persistente || !armazenamento) return
    try {
      armazenamento.setItem(CHAVE, JSON.stringify({ formato: FORMATO, itens } satisfies ArquivoSalvo))
    } catch {
      persistente = false
      aviso = 'O armazenamento do navegador está cheio: as marcações a partir de agora não serão salvas.'
    }
  }

  return {
    get aviso(): string | null {
      return aviso
    },

    listar(): readonly Acompanhamento[] {
      return [...ler()].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    },

    porId(id: string): Acompanhamento | null {
      return ler().find((a) => a.id === id) ?? null
    },

    /** O que o link do paciente usa. Token vazio nunca casa com nada. */
    porToken(token: string): Acompanhamento | null {
      if (!token) return null
      return ler().find((a) => a.token === token) ?? null
    },

    /** O acompanhamento vigente de um plano, se houver. */
    porCaso(casoId: string): Acompanhamento | null {
      return ler().find((a) => a.casoId === casoId) ?? null
    },

    salvar(acompanhamento: Acompanhamento): Acompanhamento {
      const itens = ler()
      const i = itens.findIndex((a) => a.id === acompanhamento.id)
      if (i === -1) gravar([...itens, acompanhamento])
      else gravar(itens.map((a) => (a.id === acompanhamento.id ? acompanhamento : a)))
      return acompanhamento
    },

    remover(id: string): void {
      gravar(ler().filter((a) => a.id !== id))
    },
  }
}

export type RepositorioAcompanhamentos = ReturnType<typeof criarRepositorioAcompanhamentos>

/**
 * A costura com o servidor. O link do paciente abre no aparelho **dele**, onde não
 * existe nada guardado — então essa busca é a única parte que precisa de rede de
 * verdade. Hoje a implementação local responde o que está neste navegador; quando
 * o Supabase entrar, basta uma segunda implementação desta mesma interface.
 */
export interface FonteAcompanhamentos {
  porToken(token: string): Promise<Acompanhamento | null>
  salvar(acompanhamento: Acompanhamento): Promise<Acompanhamento>
  /** Falso quando os dados só existem neste navegador, para a tela poder avisar. */
  readonly naNuvem: boolean
}

export function fonteLocal(repositorio: RepositorioAcompanhamentos): FonteAcompanhamentos {
  return {
    naNuvem: false,
    porToken: (token) => Promise.resolve(repositorio.porToken(token)),
    salvar: (acompanhamento) => Promise.resolve(repositorio.salvar(acompanhamento)),
  }
}
