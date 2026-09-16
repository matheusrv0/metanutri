// Salvamento dos casos no próprio navegador (SPEC CA-49, CA-50, CB-08, CB-09, D-3).
import { criarCasoVazio } from './caso.ts'
import { duplicarCaso } from './duplicar.ts'
import { criarPlanoPadrao, type GerarId } from './plano.ts'
import type { Caso, Plano } from './tipos.ts'

/** Subconjunto de `localStorage` usado aqui; permite testar sem navegador. */
export interface Armazenamento {
  getItem(chave: string): string | null
  setItem(chave: string, valor: string): void
  removeItem(chave: string): void
}

export interface CasoSalvo {
  readonly caso: Caso
  readonly plano: Plano
  /** Aumenta a cada salvamento; serve para perceber alteração feita em outra aba. */
  readonly versao: number
  readonly atualizadoEm: string
}

export interface ResumoCaso {
  readonly id: string
  readonly nome: string
  readonly atualizadoEm: string
  readonly pacienteId: string | null
  readonly modo: Caso['modo']
  readonly pesoKg: number | null
}

const PREFIXO = 'metanutri:'
const CHAVE_INDICE = `${PREFIXO}casos`
const CHAVE_TESTE = `${PREFIXO}teste`
const chaveCaso = (id: string) => `${PREFIXO}caso:${id}`
const FORMATO = 1

export interface OpcoesRepositorio {
  readonly agora?: () => string
  readonly gerarId?: GerarId
}

const gerarIdPadrao: GerarId = () => globalThis.crypto.randomUUID()

function ehCasoSalvo(v: unknown): v is CasoSalvo & { formato: number } {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    o['formato'] === FORMATO &&
    typeof o['versao'] === 'number' &&
    typeof o['atualizadoEm'] === 'string' &&
    typeof o['caso'] === 'object' &&
    o['caso'] !== null &&
    typeof (o['caso'] as Record<string, unknown>)['id'] === 'string' &&
    typeof o['plano'] === 'object' &&
    o['plano'] !== null &&
    Array.isArray((o['plano'] as Record<string, unknown>)['refeicoes'])
  )
}

function ehQuotaExcedida(erro: unknown): boolean {
  return erro instanceof DOMException && (erro.name === 'QuotaExceededError' || erro.name === 'NS_ERROR_DOM_QUOTA_REACHED')
}

export function criarRepositorio(armazenamento: Armazenamento | null, opcoes: OpcoesRepositorio = {}) {
  const agora = opcoes.agora ?? (() => new Date().toISOString())
  const gerarId = opcoes.gerarId ?? gerarIdPadrao

  // Cópia em memória: sempre atualizada; é a única fonte quando o armazenamento falha (CB-09).
  const memoria = new Map<string, CasoSalvo>()
  let persistente = false
  let aviso: string | null = null

  const desligarPersistencia = (motivo: string) => {
    persistente = false
    aviso = motivo
  }

  if (armazenamento === null) {
    desligarPersistencia('Este navegador não permite guardar dados: os casos não serão salvos ao fechar.')
  } else {
    try {
      armazenamento.setItem(CHAVE_TESTE, '1')
      armazenamento.removeItem(CHAVE_TESTE)
      persistente = true
    } catch {
      desligarPersistencia('O navegador bloqueou o armazenamento: os casos não serão salvos ao fechar.')
    }
  }

  const lerDoArmazenamento = (id: string): CasoSalvo | null => {
    if (!persistente || !armazenamento) return null
    try {
      const bruto = armazenamento.getItem(chaveCaso(id))
      if (bruto === null) return null
      const v: unknown = JSON.parse(bruto)
      if (!ehCasoSalvo(v)) return null
      // Casos gravados por versões antigas podem não ter todos os campos: completa com os padrões.
      return { caso: { ...criarCasoVazio(v.caso.id), ...v.caso }, plano: v.plano, versao: v.versao, atualizadoEm: v.atualizadoEm }
    } catch {
      return null
    }
  }

  const lerIndice = (): string[] => {
    if (!persistente || !armazenamento) return [...memoria.keys()]
    try {
      const v: unknown = JSON.parse(armazenamento.getItem(CHAVE_INDICE) ?? '[]')
      // Com armazenamento funcionando, ele é a fonte da verdade: reflete exclusões feitas em outra aba (CB-08).
      return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
    } catch {
      return [...memoria.keys()]
    }
  }

  const gravar = (registro: CasoSalvo, indice: string[]) => {
    memoria.set(registro.caso.id, registro)
    if (!persistente || !armazenamento) return
    try {
      armazenamento.setItem(chaveCaso(registro.caso.id), JSON.stringify({ formato: FORMATO, ...registro }))
      armazenamento.setItem(CHAVE_INDICE, JSON.stringify(indice))
    } catch (erro) {
      desligarPersistencia(
        ehQuotaExcedida(erro)
          ? 'O armazenamento do navegador está cheio: as alterações a partir de agora não serão salvas ao fechar.'
          : 'O navegador parou de permitir o armazenamento: as alterações a partir de agora não serão salvas ao fechar.',
      )
    }
  }

  const obter = (id: string): CasoSalvo | null => {
    if (!persistente) return memoria.get(id) ?? null
    const doArmazenamento = lerDoArmazenamento(id)
    if (doArmazenamento) memoria.set(id, doArmazenamento)
    // Sumiu do armazenamento: foi excluído em outra aba (CB-08) ou corrompido.
    else memoria.delete(id)
    return doArmazenamento
  }

  const exigir = (id: string): CasoSalvo => {
    const c = obter(id)
    if (!c) throw new Error(`Caso ${id} não encontrado.`)
    return c
  }

  const salvar = (registro: Pick<CasoSalvo, 'caso' | 'plano'>): CasoSalvo => {
    const atual = obter(registro.caso.id)
    const salvo: CasoSalvo = {
      caso: registro.caso,
      plano: registro.plano,
      versao: (atual?.versao ?? 0) + 1,
      atualizadoEm: agora(),
    }
    const indice = lerIndice()
    gravar(salvo, indice.includes(salvo.caso.id) ? indice : [...indice, salvo.caso.id])
    return salvo
  }

  return {
    get persistente() {
      return persistente
    },
    get aviso() {
      return aviso
    },

    listar(): ResumoCaso[] {
      return lerIndice()
        .map((id) => obter(id))
        .filter((c): c is CasoSalvo => c !== null)
        .map((c) => ({
          id: c.caso.id,
          nome: c.caso.nome,
          atualizadoEm: c.atualizadoEm,
          pacienteId: c.caso.pacienteId,
          modo: c.caso.modo,
          pesoKg: c.caso.pesoKg,
        }))
        .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
    },

    obter,

    criar(nome: string): CasoSalvo {
      const caso: Caso = { ...criarCasoVazio(gerarId()), nome }
      return salvar({ caso, plano: criarPlanoPadrao(gerarId) })
    },

    salvar,

    duplicar(id: string): CasoSalvo {
      const original = exigir(id)
      return salvar(duplicarCaso(original, gerarId, { hoje: agora().slice(0, 10) }))
    },

    renomear(id: string, nome: string): CasoSalvo {
      const original = exigir(id)
      return salvar({ ...original, caso: { ...original.caso, nome } })
    },

    excluir(id: string): void {
      memoria.delete(id)
      if (!persistente || !armazenamento) return
      try {
        armazenamento.removeItem(chaveCaso(id))
        armazenamento.setItem(CHAVE_INDICE, JSON.stringify(lerIndice().filter((x) => x !== id)))
      } catch {
        desligarPersistencia('O navegador parou de permitir o armazenamento: as alterações a partir de agora não serão salvas ao fechar.')
      }
    },

    /** CB-08: verdadeiro quando outra aba salvou este caso depois da versão que esta tela conhece. */
    foiAlteradoEmOutroLugar(conhecido: Pick<CasoSalvo, 'caso' | 'versao'>): boolean {
      const noArmazenamento = lerDoArmazenamento(conhecido.caso.id)
      return noArmazenamento !== null && noArmazenamento.versao > conhecido.versao
    },
  }
}

export type RepositorioCasos = ReturnType<typeof criarRepositorio>
