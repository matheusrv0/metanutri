// A dieta que vai para o link do paciente (spec dieta-no-link). É o que a folha impressa mostra
// e serve a quem come: refeição, medida caseira, substitutos e orientações. Sem kcal e sem
// nutriente (D-150). Vira texto na hora da cópia (D-151): o aparelho do paciente não tem os
// produtos próprios do nutricionista, e o nome escrito não muda quando a base muda.
import { medidaEquivalente } from './busca.ts'
import { buscarAlimento } from './tabelas.ts'
import { OPCOES, type BuscarAlimento, type Caso, type ItemPlano, type Plano } from './tipos.ts'

export interface ItemDaDieta {
  /** "6 colheres de sopa"; nulo quando o alimento não tem medida caseira conhecida (CB-156). */
  readonly medida: string | null
  readonly gramas: number
  readonly alimento: string
}

export interface RefeicaoDaDieta {
  /** HH:MM. */
  readonly horario: string
  readonly nome: string
  /** A principal primeiro, depois os substitutos: o paciente lê "ou" entre elas. Opção vazia não entra (D-155). */
  readonly opcoes: readonly (readonly ItemDaDieta[])[]
}

/** O que o plano diz agora, no que o paciente vê. */
export interface DietaDoPlano {
  readonly refeicoes: readonly RefeicaoDaDieta[]
  readonly orientacoes: string
  readonly receitas: string
}

/** A cópia que mora no link. */
export interface DietaDoLink extends DietaDoPlano {
  /**
   * O dia da cópia (AAAA-MM-DD), no dia de Brasília (o mesmo "hoje" do Painel, spec whatsapp-e-retorno, D-144), para o
   * paciente saber se é a da última consulta (D-158).
   */
  readonly copiadaEm: string
}

function itemDaDieta(item: ItemPlano, buscar: BuscarAlimento): ItemDaDieta {
  return {
    medida: medidaEquivalente(item.alimentoId, item.gramas)?.texto ?? null,
    gramas: item.gramas,
    alimento: buscar(item.alimentoId)?.descricao ?? 'Alimento removido',
  }
}

/** A dieta de agora, com a mesma regra da folha impressa (CA-531 a CA-534). */
export function dietaDoPlano(caso: Pick<Caso, 'orientacoes' | 'receitas'>, plano: Plano, buscar: BuscarAlimento = buscarAlimento): DietaDoPlano {
  const refeicoes = plano.refeicoes
    .map((refeicao) => ({
      horario: refeicao.horario,
      nome: refeicao.nome,
      opcoes: OPCOES.map((opcao) => refeicao.opcoes[opcao].filter((i) => i.gramas > 0).map((i) => itemDaDieta(i, buscar))).filter((itens) => itens.length > 0),
    }))
    .filter((refeicao) => refeicao.opcoes.length > 0)
  return { refeicoes, orientacoes: caso.orientacoes.trim(), receitas: caso.receitas.trim() }
}

export function copiarDieta(dieta: DietaDoPlano, dia: string): DietaDoLink {
  return { refeicoes: dieta.refeicoes, orientacoes: dieta.orientacoes, receitas: dieta.receitas, copiadaEm: dia }
}

/** Só o que o paciente vê: o dia da cópia não conta (DP-153). */
const conteudo = (dieta: DietaDoPlano): string => JSON.stringify([dieta.refeicoes, dieta.orientacoes, dieta.receitas])

/** O plano mudou em algo que o paciente vê desde a cópia (CA-545, CA-546). */
export function dietaMudou(noLink: DietaDoLink, doPlano: DietaDoPlano): boolean {
  return conteudo(noLink) !== conteudo(doPlano)
}

/** Há o que mostrar em "Meu plano" (CB-159). */
export function temDieta(dieta: DietaDoLink | null): dieta is DietaDoLink {
  return dieta !== null && (dieta.refeicoes.length > 0 || dieta.orientacoes !== '' || dieta.receitas !== '')
}

// ---------- Leitura do que chega da nuvem ou do aparelho (CB-153, DP-155) ----------

const objeto = (v: unknown): Record<string, unknown> | null => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null)

function lerItem(v: unknown): ItemDaDieta | null {
  const o = objeto(v)
  if (!o) return null
  const { medida, gramas, alimento } = o
  if (typeof alimento !== 'string' || typeof gramas !== 'number' || !Number.isFinite(gramas)) return null
  if (medida !== null && typeof medida !== 'string') return null
  return { medida, gramas, alimento }
}

function lerRefeicao(v: unknown): RefeicaoDaDieta | null {
  const o = objeto(v)
  if (!o || typeof o['horario'] !== 'string' || typeof o['nome'] !== 'string' || !Array.isArray(o['opcoes'])) return null
  const opcoes = o['opcoes']
    .filter((opcao): opcao is unknown[] => Array.isArray(opcao))
    .map((opcao) => opcao.map(lerItem).filter((i): i is ItemDaDieta => i !== null))
    .filter((itens) => itens.length > 0)
  return opcoes.length > 0 ? { horario: o['horario'], nome: o['nome'], opcoes } : null
}

/**
 * A dieta guardada, montada de novo só com os campos conhecidos: o que vier a mais (kcal, por
 * exemplo) nunca chega à tela. Formato estranho conta como link sem dieta, e nada quebra.
 */
export function lerDieta(v: unknown): DietaDoLink | null {
  const o = objeto(v)
  if (!o || !Array.isArray(o['refeicoes']) || typeof o['orientacoes'] !== 'string' || typeof o['receitas'] !== 'string') return null
  return {
    refeicoes: o['refeicoes'].map(lerRefeicao).filter((r): r is RefeicaoDaDieta => r !== null),
    orientacoes: o['orientacoes'],
    receitas: o['receitas'],
    copiadaEm: typeof o['copiadaEm'] === 'string' ? o['copiadaEm'] : '',
  }
}
