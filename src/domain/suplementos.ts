// Suplementos do paciente e os modelos da conta para reusar (spec anamnese-e-prescricoes, D-164 a D-166).
//
// Nada aqui sugere suplemento: tudo é digitado pelo nutricionista (D-164). O suplemento mora na ficha do
// paciente; o modelo mora na conta, e usar um modelo copia os campos para o paciente (CB-165).
import type { Armazenamento } from './persistencia.ts'

export interface Suplemento {
  readonly id: string
  readonly nome: string
  readonly dose: string
  readonly horario: string
  /** "Por quanto tempo": texto livre, como "3 meses". */
  readonly duracao: string
  readonly observacao: string
}

type Campos = Pick<Suplemento, 'nome' | 'dose' | 'horario' | 'duracao' | 'observacao'>

const soCampos = (s: Campos): Campos => ({ nome: s.nome, dose: s.dose, horario: s.horario, duracao: s.duracao, observacao: s.observacao })

export const criarSuplemento = (id: string): Suplemento => ({ id, nome: '', dose: '', horario: '', duracao: '', observacao: '' })

const textoDe = (o: Record<string, unknown>, campo: string): string => (typeof o[campo] === 'string' ? (o[campo] as string) : '')

const camposDe = (o: Record<string, unknown>): Campos => ({
  nome: textoDe(o, 'nome'),
  dose: textoDe(o, 'dose'),
  horario: textoDe(o, 'horario'),
  duracao: textoDe(o, 'duracao'),
  observacao: textoDe(o, 'observacao'),
})

/** CA-588: o que não é lista vira lista vazia; item sem id sai; campo que não é texto vira vazio; o id vale uma vez. */
export function normalizarSuplementos(valor: unknown): Suplemento[] {
  if (!Array.isArray(valor)) return []
  const vistos = new Set<string>()
  return valor.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null) return []
    const o = item as Record<string, unknown>
    const id = o['id']
    if (typeof id !== 'string' || id === '' || vistos.has(id)) return []
    vistos.add(id)
    return [{ id, ...camposDe(o) }]
  })
}

/** CA-578: suplemento sem nome não sai em folha nenhuma. */
export const suplementosParaDocumento = (lista: readonly Suplemento[]): Suplemento[] => lista.filter((s) => s.nome.trim() !== '')

/** CA-576: "Dose: … · Horário: … · Por quanto tempo: …", só o que foi preenchido. */
export function descreverSuplemento(s: Suplemento): string {
  return [
    ['Dose', s.dose],
    ['Horário', s.horario],
    ['Por quanto tempo', s.duracao],
  ]
    .filter(([, valor]) => (valor ?? '').trim() !== '')
    .map(([rotulo, valor]) => `${rotulo}: ${(valor ?? '').trim()}`)
    .join(' · ')
}

// ---------- Modelos da conta (D-166) ----------

export const CHAVE_MODELOS_SUPLEMENTO = 'metanutri:modelos-suplemento'

export interface ModeloSuplemento extends Campos {
  readonly id: string
  readonly criadoEm: string
  /** A junção entre aparelhos fica com a edição mais nova de cada modelo. */
  readonly atualizadoEm: string
}

/** O mesmo nome sem diferenciar maiúscula, acento nem espaço repetido (CA-573). */
const chaveDoNome = (nome: string): string =>
  nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()

/** Usar o modelo: uma cópia com id novo, separada dele (CB-165). */
export const suplementoDoModelo = (modelo: ModeloSuplemento, id: string): Suplemento => ({ id, ...soCampos(modelo) })

export interface RepositorioModelosSuplemento {
  listar(): readonly ModeloSuplemento[]
  /** Guarda o suplemento como modelo; o mesmo nome troca o modelo. Sem nome, `null`. */
  salvarDe(suplemento: Suplemento): ModeloSuplemento | null
  excluir(id: string): void
  readonly persistente: boolean
}

function lerModelos(valor: unknown): ModeloSuplemento[] {
  if (!Array.isArray(valor)) return []
  return valor.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null) return []
    const o = item as Record<string, unknown>
    const id = o['id']
    if (typeof id !== 'string' || id === '') return []
    const criadoEm = textoDe(o, 'criadoEm')
    return [{ id, ...camposDe(o), criadoEm, atualizadoEm: textoDe(o, 'atualizadoEm') || criadoEm }]
  })
}

export interface OpcoesModelosSuplemento {
  readonly agora?: () => string
  readonly gerarId?: () => string
}

export function criarRepositorioModelosSuplemento(armazenamento: Armazenamento | null, opcoes: OpcoesModelosSuplemento = {}): RepositorioModelosSuplemento {
  const agora = opcoes.agora ?? (() => new Date().toISOString())
  const gerarId = opcoes.gerarId ?? (() => globalThis.crypto.randomUUID())
  let memoria: ModeloSuplemento[] = []
  let persistente = armazenamento !== null

  const ler = (): ModeloSuplemento[] => {
    if (!persistente || !armazenamento) return [...memoria]
    try {
      return lerModelos(JSON.parse(armazenamento.getItem(CHAVE_MODELOS_SUPLEMENTO) ?? '[]'))
    } catch {
      return [...memoria]
    }
  }

  const gravar = (lista: readonly ModeloSuplemento[]) => {
    memoria = [...lista]
    if (!persistente || !armazenamento) return
    try {
      armazenamento.setItem(CHAVE_MODELOS_SUPLEMENTO, JSON.stringify(lista))
    } catch {
      // CB-160: sem espaço, os modelos valem só nesta sessão
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

    salvarDe(suplemento) {
      const nome = suplemento.nome.trim()
      if (nome === '') return null
      const lista = ler()
      const quando = agora()
      const campos: Campos = { ...soCampos(suplemento), nome }
      const igual = lista.find((m) => chaveDoNome(m.nome) === chaveDoNome(nome))
      const modelo: ModeloSuplemento = igual ? { ...igual, ...campos, atualizadoEm: quando } : { id: gerarId(), ...campos, criadoEm: quando, atualizadoEm: quando }
      gravar(igual ? lista.map((m) => (m.id === igual.id ? modelo : m)) : [...lista, modelo])
      return modelo
    },

    excluir(id) {
      gravar(ler().filter((m) => m.id !== id))
    },
  }
}
