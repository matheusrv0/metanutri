// As medidas caseiras da conta para os alimentos da base: "concha da minha casa = 120 g" (spec alimentos-e-gramaturas,
// D-387 e §2.6 do levantamento).
//
// Ficam na chave `metanutri:medidas-proprias`, uma lista com id texto "<alimentoId>:<nome normalizado>", que vai para a
// nuvem item por item, com lápide (`LISTAS` de `copiaDaConta.ts`). Valem para alimento da base e, desde a correção A
// (D-433), também para alimento próprio: a versão no ar refaz o alimento próprio ao editar e apagaria uma medida guardada
// dentro dele. O item do plano guarda uma cópia da medida (G1), então mudar ou excluir a medida própria não muda plano
// nenhum.
import { normalizar } from './busca.ts'
import type { Armazenamento } from './persistencia.ts'

export const CHAVE_MEDIDAS_PROPRIAS = 'metanutri:medidas-proprias'

/** O peso máximo de uma medida, o mesmo da porção do alimento próprio (D-384). */
export const PESO_MAXIMO_DA_MEDIDA = 2000

export interface MedidaPropria {
  readonly id: string
  readonly alimentoId: number
  readonly nome: string
  readonly gramas: number
  readonly criadoEm: string
  /** A hora da última mudança: decide a junção entre aparelhos. */
  readonly atualizadoEm: string
}

/** "561:concha", "3:colher de sopa": o mesmo nome no mesmo alimento é a mesma medida. */
export const idDaMedida = (alimentoId: number, nome: string): string => `${alimentoId}:${normalizar(nome).trim().replace(/\s+/g, ' ')}`

export interface ProblemaMedida {
  readonly campo: 'nome' | 'gramas' | 'alimento'
  readonly mensagem: string
}

/** CB-372: o que impede salvar. */
export function validarMedidaPropria(dados: { readonly alimentoId: number; readonly nome: string; readonly gramas: number | null }): readonly ProblemaMedida[] {
  const problemas: ProblemaMedida[] = []
  if (!Number.isInteger(dados.alimentoId) || dados.alimentoId <= 0) problemas.push({ campo: 'alimento', mensagem: 'Escolha o alimento da medida.' })
  if (dados.nome.trim() === '') problemas.push({ campo: 'nome', mensagem: 'Dê um nome à medida, como “concha”.' })
  if (dados.nome.trim().length > 40) problemas.push({ campo: 'nome', mensagem: 'O nome tem mais de 40 caracteres.' })
  if (dados.gramas === null || !Number.isFinite(dados.gramas) || dados.gramas <= 0) problemas.push({ campo: 'gramas', mensagem: 'Informe quanto pesa a medida.' })
  else if (dados.gramas > PESO_MAXIMO_DA_MEDIDA) problemas.push({ campo: 'gramas', mensagem: 'A medida não deve passar de 2.000 g.' })
  return problemas
}

const ehNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function ehMedidaPropria(v: unknown): v is MedidaPropria {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return (
    typeof o['id'] === 'string' &&
    ehNumero(o['alimentoId']) &&
    o['alimentoId'] > 0 &&
    typeof o['nome'] === 'string' &&
    o['nome'].trim() !== '' &&
    ehNumero(o['gramas']) &&
    o['gramas'] > 0
  )
}

export interface RepositorioMedidasProprias {
  listar(): readonly MedidaPropria[]
  doAlimento(alimentoId: number): readonly MedidaPropria[]
  /** Com o mesmo nome no mesmo alimento, troca a de antes; guarda a criação e o que esta versão não conhece. */
  salvar(dados: { readonly alimentoId: number; readonly nome: string; readonly gramas: number }): MedidaPropria
  excluir(id: string): void
  readonly persistente: boolean
}

/** A memória da aba quando o navegador não guarda dados, uma por armazenamento (CB-376). */
const memorias = new WeakMap<object, { lista: unknown[] }>()
const SEM_ARMAZENAMENTO = {}

export function criarRepositorioMedidasProprias(
  armazenamento: Armazenamento | null,
  agora: () => string = () => new Date().toISOString(),
): RepositorioMedidasProprias {
  const chaveDaMemoria = armazenamento ?? SEM_ARMAZENAMENTO
  const memoria = memorias.get(chaveDaMemoria) ?? { lista: [] as unknown[] }
  memorias.set(chaveDaMemoria, memoria)
  let persistente = armazenamento !== null

  // A lista como está guardada: item estragado é ignorado na leitura e preservado na gravação (CB-370).
  const lerBruto = (): unknown[] => {
    if (!persistente || !armazenamento) return memoria.lista
    try {
      const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE_MEDIDAS_PROPRIAS) ?? '[]')
      return Array.isArray(bruto) ? bruto : []
    } catch {
      return []
    }
  }

  const gravar = (lista: unknown[]) => {
    memoria.lista = lista
    if (!persistente || !armazenamento) return
    try {
      armazenamento.setItem(CHAVE_MEDIDAS_PROPRIAS, JSON.stringify(lista))
    } catch {
      persistente = false
    }
  }

  const ler = (): MedidaPropria[] => lerBruto().filter(ehMedidaPropria)
  const idDe = (v: unknown): unknown => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>)['id'] : undefined)

  return {
    get persistente() {
      return persistente
    },

    listar() {
      return ler().sort((a, b) => a.alimentoId - b.alimentoId || a.nome.localeCompare(b.nome, 'pt-BR'))
    },

    doAlimento(alimentoId) {
      return ler()
        .filter((m) => m.alimentoId === alimentoId)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    },

    salvar(dados) {
      const problemas = validarMedidaPropria(dados)
      if (problemas.length > 0) throw new RangeError(problemas.map((p) => p.mensagem).join(' '))
      const id = idDaMedida(dados.alimentoId, dados.nome)
      const bruto = lerBruto()
      const posicao = bruto.findIndex((v) => idDe(v) === id)
      const anterior = posicao === -1 ? undefined : (bruto[posicao] as Record<string, unknown>)
      const quando = agora()
      const medida: MedidaPropria = {
        ...(anterior ?? {}),
        id,
        alimentoId: dados.alimentoId,
        nome: dados.nome.trim().replace(/\s+/g, ' '),
        gramas: Math.round(dados.gramas * 10) / 10,
        criadoEm: typeof anterior?.['criadoEm'] === 'string' ? anterior['criadoEm'] : quando,
        atualizadoEm: quando,
      }
      gravar(posicao === -1 ? [...bruto, medida] : bruto.map((v, i) => (i === posicao ? medida : v)))
      return medida
    },

    excluir(id) {
      gravar(lerBruto().filter((v) => idDe(v) !== id))
    },
  }
}
