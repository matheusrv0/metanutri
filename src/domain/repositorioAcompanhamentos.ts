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
  /**
   * Ids dos links que já estiveram na nuvem (spec missoes-na-nuvem, CB-107). O que já esteve
   * e sumiu de lá foi apagado em outro aparelho. Arquivo antigo, sem o campo: nenhum esteve.
   */
  readonly naNuvem?: readonly string[]
}

interface Guardado {
  readonly itens: readonly Acompanhamento[]
  readonly naNuvem: ReadonlySet<string>
}

const VAZIO: Guardado = { itens: [], naNuvem: new Set() }

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
  let memoria: Guardado = VAZIO
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

  const lerTudo = (): Guardado => {
    if (!persistente || !armazenamento) return memoria
    try {
      const bruto = armazenamento.getItem(CHAVE)
      if (bruto === null) return VAZIO
      const v: unknown = JSON.parse(bruto)
      if (typeof v !== 'object' || v === null) return VAZIO
      const arquivo = v as Partial<ArquivoSalvo>
      if (arquivo.formato !== FORMATO || !Array.isArray(arquivo.itens)) return VAZIO
      const naNuvem = Array.isArray(arquivo.naNuvem) ? arquivo.naNuvem.filter((id): id is string => typeof id === 'string') : []
      return { itens: arquivo.itens.filter(ehAcompanhamento), naNuvem: new Set(naNuvem) }
    } catch {
      return memoria
    }
  }

  const ler = (): readonly Acompanhamento[] => lerTudo().itens

  const gravar = (itens: readonly Acompanhamento[], naNuvem: ReadonlySet<string>) => {
    // A marca só vive enquanto o link existe: remover leva a marca junto.
    const marcados = [...naNuvem].filter((id) => itens.some((a) => a.id === id))
    memoria = { itens: [...itens], naNuvem: new Set(marcados) }
    if (!persistente || !armazenamento) return
    try {
      armazenamento.setItem(CHAVE, JSON.stringify({ formato: FORMATO, itens, naNuvem: marcados } satisfies ArquivoSalvo))
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

    /**
     * Grava a cópia do aparelho. `naNuvem` diz se o link está na nuvem (CB-107); sem ele, a
     * marca que já existia fica como estava (gerar de novo sem internet não tira a marca).
     */
    salvar(acompanhamento: Acompanhamento, opcoes: { readonly naNuvem?: boolean } = {}): Acompanhamento {
      const { itens, naNuvem } = lerTudo()
      const i = itens.findIndex((a) => a.id === acompanhamento.id)
      const novos = i === -1 ? [...itens, acompanhamento] : itens.map((a) => (a.id === acompanhamento.id ? acompanhamento : a))
      const marcados = new Set(naNuvem)
      if (opcoes.naNuvem === true) marcados.add(acompanhamento.id)
      if (opcoes.naNuvem === false) marcados.delete(acompanhamento.id)
      gravar(novos, marcados)
      return acompanhamento
    },

    /** Já esteve na nuvem? Se sim e sumiu de lá, foi apagado em outro aparelho (CB-107). */
    estaNaNuvem(id: string): boolean {
      return lerTudo().naNuvem.has(id)
    },

    remover(id: string): void {
      const { itens, naNuvem } = lerTudo()
      gravar(
        itens.filter((a) => a.id !== id),
        naNuvem,
      )
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
