// A dieta que vai para o link do paciente (spec dieta-no-link). É o que a folha impressa mostra
// e serve a quem come: refeição, medida caseira, substitutos e orientações. Sem kcal e sem
// nutriente (D-150). Vira texto na hora da cópia (D-151): o aparelho do paciente não tem os
// produtos próprios do nutricionista, e o nome escrito não muda quando a base muda.
import { modoDeQuantidade } from './caso.ts'
import { lerMedidaDoItem } from './medidaDoItem.ts'
import { nomeParaPaciente } from './nomeParaPaciente.ts'
import { quantidadeNaFolha } from './quantidadeNaFolha.ts'
import {
  ehItemDeReceita,
  nomeDaReceita,
  receitaComOQueComer,
  receitaDoItem,
  receitasDoPlano as receitasNoPlano,
  textoDaPorcao,
  textoDoRendimento,
} from './receitaNoPlano.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'
import { OPCOES, type BuscarAlimento, type Caso, type ItemPlano, type MedidaDoItem, type ModoQuantidade, type Plano, type ReceitaDoPlano } from './tipos.ts'

export interface ItemDaDieta {
  /**
   * "6 colheres de sopa"; nulo quando o alimento não tem medida caseira conhecida (CB-156) ou quando o plano escolheu
   * "Gramas" (spec conduta-da-nutricionista, D-297): a escolha vai no próprio item, e qualquer versão do app mostra o peso.
   */
  readonly medida: string | null
  readonly gramas: number
  readonly alimento: string
  /**
   * Só no item da refeição que é uma receita (spec integracao-rodada-1910, D-310): o nome é o da receita, e "Meu plano"
   * nunca o procura na base. Item de alimento não leva o campo, e a cópia de um plano sem receita fica igual à de antes.
   */
  readonly receita?: true
  /**
   * A medida veio da escolha da nutricionista no item (spec alimentos-e-gramaturas, G1 e D-377): "Meu plano" mostra a
   * medida guardada, sem refazer a automática. Com `medida: null`, o item é "só gramas".
   */
  readonly escolhida?: true
  /** A medida escolhida não fecha em meia medida: "190 g (cerca de 1 concha e meia)". */
  readonly aproximada?: true
  /** Só no alimento que não está na base (alimento próprio) medido em ml (D-378); o da base, "Meu plano" sabe sozinho. */
  readonly unidade?: 'ml'
}

export interface RefeicaoDaDieta {
  /** HH:MM. */
  readonly horario: string
  readonly nome: string
  /** A principal primeiro, depois os substitutos: o paciente lê "ou" entre elas. Opção vazia não entra (D-155). */
  readonly opcoes: readonly (readonly ItemDaDieta[])[]
}

/** Uma receita do plano, em texto, como o paciente lê (spec receitas-com-calculo, D-278). */
export interface ReceitaDaDieta {
  readonly nome: string
  /** "Rende 2 unidades (120 g cada)". */
  readonly rendimento: string
  /** Os ingredientes da receita inteira, com a medida caseira e o peso, como os itens da refeição. */
  readonly ingredientes: readonly ItemDaDieta[]
  readonly preparo: string
}

/** O que o plano diz agora, no que o paciente vê. */
export interface DietaDoPlano {
  readonly refeicoes: readonly RefeicaoDaDieta[]
  readonly orientacoes: string
  /** O texto livre das receitas, de antes das receitas com cálculo. */
  readonly receitas: string
  /**
   * As receitas com cálculo do plano (CA-884). Só existe quando o plano tem receita: a cópia de um plano sem receita
   * fica igual à de antes desta versão, e o link já enviado não aparece como mudado (CA-885).
   */
  readonly receitasDoPlano?: readonly ReceitaDaDieta[]
  /**
   * Só existe quando o plano escolheu "Só gramas" (spec conduta-da-nutricionista, D-297; integracao-rodada-1910, D-319)
   * ou "Medida e gramas" (spec alimentos-e-gramaturas, D-376). A cópia de um plano em "Só medida" fica sem o campo,
   * igual à de antes.
   */
  readonly quantidades?: 'gramas' | 'medida-e-gramas'
}

/** A cópia que mora no link. */
export interface DietaDoLink extends DietaDoPlano {
  /**
   * O dia da cópia (AAAA-MM-DD), no dia de Brasília (o mesmo "hoje" do Painel, spec whatsapp-e-retorno, D-144), para o
   * paciente saber se é a da última consulta (D-158).
   */
  readonly copiadaEm: string
}

const DA_BASE = new Set(ALIMENTOS.map((a) => a.id))

function alimentoDaDieta(alimentoId: number, gramas: number, buscar: BuscarAlimento, modo: ModoQuantidade, medida?: MedidaDoItem | null): ItemDaDieta {
  // A quantidade para a paciente, na escolha do plano (spec conduta-da-nutricionista, D-297), com a medida escolhida no
  // item antes da automática (spec alimentos-e-gramaturas, G1).
  const q = quantidadeNaFolha(alimentoId, gramas, modo, medida)
  const escolhida = lerMedidaDoItem(medida) !== undefined
  return {
    medida: q.medida,
    gramas,
    // O alimento próprio vai com o nome para o paciente do cadastro (D-385): o celular do paciente não o conhece.
    alimento: DA_BASE.has(alimentoId) ? (buscar(alimentoId)?.descricao ?? 'Alimento removido') : nomeParaPaciente(buscar(alimentoId)),
    ...(escolhida ? { escolhida: true as const } : {}),
    ...(q.aproximada ? { aproximada: true as const } : {}),
    ...(q.unidade === 'ml' && !DA_BASE.has(alimentoId) ? { unidade: 'ml' as const } : {}),
  }
}

/**
 * Spec receitas-com-calculo, CA-883: a receita é um item com a porção, o peso e o nome dela; em "Gramas", só o peso
 * (D-297 da conduta-da-nutricionista).
 */
function itemDaDieta(item: ItemPlano, buscar: BuscarAlimento, modo: ModoQuantidade): ItemDaDieta {
  if (!ehItemDeReceita(item)) return alimentoDaDieta(item.alimentoId, item.gramas, buscar, modo, item.medida)
  const receita = receitaDoItem(item)
  const medida = modo === 'gramas' || !receita ? null : textoDaPorcao(receita, item.gramas)
  return { medida, gramas: item.gramas, alimento: nomeDaReceita(receita), receita: true }
}

/** CA-884: cada receita do plano, inteira, em texto. O ingrediente apagado fica de fora (D-317 da integracao-rodada-1910). */
function receitaDaDieta(r: ReceitaDoPlano, buscar: BuscarAlimento, modo: ModoQuantidade): ReceitaDaDieta {
  return {
    nome: nomeDaReceita(r),
    rendimento: textoDoRendimento(r),
    ingredientes: r.ingredientes.filter((i) => i.gramas > 0 && buscar(i.alimentoId) !== undefined).map((i) => alimentoDaDieta(i.alimentoId, i.gramas, buscar, modo)),
    preparo: r.preparo.trim(),
  }
}

/** A dieta de agora, com a mesma regra da folha impressa (CA-531 a CA-534) e a escolha de quantidade do plano. */
export function dietaDoPlano(
  caso: Pick<Caso, 'orientacoes' | 'receitas'> & { readonly quantidades?: ModoQuantidade },
  plano: Plano,
  buscar: BuscarAlimento = buscarAlimento,
): DietaDoPlano {
  const modo = modoDeQuantidade(caso)
  const refeicoes = plano.refeicoes
    .map((refeicao) => ({
      horario: refeicao.horario,
      nome: refeicao.nome,
      // D-248 (spec revisao-geral-trabalho): o produto apagado não vai para o paciente. A receita vai: ela não está na
      // base, e o nome vem da cópia guardada no item (spec receitas-com-calculo, CA-883).
      opcoes: OPCOES.map((opcao) =>
        refeicao.opcoes[opcao]
          // CB-317 (integracao-rodada-1910): a receita sem o que comer também fica de fora.
          .filter((i) => i.gramas > 0 && (ehItemDeReceita(i) ? receitaComOQueComer(receitaDoItem(i), buscar) : buscar(i.alimentoId) !== undefined))
          .map((i) => itemDaDieta(i, buscar, modo)),
      ).filter((itens) => itens.length > 0),
    }))
    .filter((refeicao) => refeicao.opcoes.length > 0)
  const receitasDoPlano = receitasNoPlano(plano)
    .filter((r) => receitaComOQueComer(r, buscar))
    .map((r) => receitaDaDieta(r, buscar, modo))
  return {
    refeicoes,
    orientacoes: caso.orientacoes.trim(),
    receitas: caso.receitas.trim(),
    ...(receitasDoPlano.length > 0 ? { receitasDoPlano } : {}),
    ...(modo === 'medida-caseira' ? {} : { quantidades: modo }),
  }
}

export function copiarDieta(dieta: DietaDoPlano, dia: string): DietaDoLink {
  const { refeicoes, orientacoes, receitas, receitasDoPlano, quantidades } = dieta
  return {
    refeicoes,
    orientacoes,
    receitas,
    ...(receitasDoPlano && receitasDoPlano.length > 0 ? { receitasDoPlano } : {}),
    ...(quantidades === 'gramas' || quantidades === 'medida-e-gramas' ? { quantidades } : {}),
    copiadaEm: dia,
  }
}

/** Só o que o paciente vê: o dia da cópia não conta (DP-153). Sem receita calculada, o mesmo texto de antes (CA-885). */
const conteudo = (dieta: DietaDoPlano): string =>
  JSON.stringify([
    dieta.refeicoes,
    dieta.orientacoes,
    dieta.receitas,
    ...(dieta.receitasDoPlano && dieta.receitasDoPlano.length > 0 ? [dieta.receitasDoPlano] : []),
    // D-319 (integracao-rodada-1910) e D-376 (alimentos-e-gramaturas): trocar o modo muda o que o paciente vê.
    ...(dieta.quantidades === 'gramas' || dieta.quantidades === 'medida-e-gramas' ? [dieta.quantidades] : []),
  ])

/** O plano mudou em algo que o paciente vê desde a cópia (CA-545, CA-546). */
export function dietaMudou(noLink: DietaDoLink, doPlano: DietaDoPlano): boolean {
  return conteudo(noLink) !== conteudo(doPlano)
}

/** Há o que mostrar em "Meu plano" (CB-159). */
export function temDieta(dieta: DietaDoLink | null): dieta is DietaDoLink {
  return dieta !== null && (dieta.refeicoes.length > 0 || dieta.orientacoes !== '' || dieta.receitas !== '' || (dieta.receitasDoPlano?.length ?? 0) > 0)
}

// ---------- Leitura do que chega da nuvem ou do aparelho (CB-153, DP-155) ----------

const objeto = (v: unknown): Record<string, unknown> | null => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null)

function lerItem(v: unknown): ItemDaDieta | null {
  const o = objeto(v)
  if (!o) return null
  const { medida, gramas, alimento } = o
  if (typeof alimento !== 'string' || typeof gramas !== 'number' || !Number.isFinite(gramas)) return null
  if (medida !== null && typeof medida !== 'string') return null
  // D-310 (integracao-rodada-1910): a marca de receita só vale como `true`; outro valor é ignorado. As marcas da medida
  // escolhida também (spec alimentos-e-gramaturas, D-377).
  return {
    medida,
    gramas,
    alimento,
    ...(o['receita'] === true ? { receita: true as const } : {}),
    ...(o['escolhida'] === true ? { escolhida: true as const } : {}),
    ...(o['aproximada'] === true ? { aproximada: true as const } : {}),
    ...(o['unidade'] === 'ml' ? { unidade: 'ml' as const } : {}),
  }
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

/** Uma receita da cópia; estragada, fica de fora (spec receitas-com-calculo, CA-884). */
function lerReceita(v: unknown): ReceitaDaDieta | null {
  const o = objeto(v)
  if (!o || typeof o['nome'] !== 'string' || typeof o['rendimento'] !== 'string' || typeof o['preparo'] !== 'string' || !Array.isArray(o['ingredientes'])) return null
  return {
    nome: o['nome'],
    rendimento: o['rendimento'],
    ingredientes: o['ingredientes'].map(lerItem).filter((i): i is ItemDaDieta => i !== null),
    preparo: o['preparo'],
  }
}

/**
 * A dieta guardada, montada de novo só com os campos conhecidos: o que vier a mais (kcal, por
 * exemplo) nunca chega à tela. Formato estranho conta como link sem dieta, e nada quebra.
 */
export function lerDieta(v: unknown): DietaDoLink | null {
  const o = objeto(v)
  if (!o || !Array.isArray(o['refeicoes']) || typeof o['orientacoes'] !== 'string' || typeof o['receitas'] !== 'string') return null
  // Link de antes das receitas com cálculo: sem o campo, como era (CA-885).
  const receitasDoPlano = Array.isArray(o['receitasDoPlano']) ? o['receitasDoPlano'].map(lerReceita).filter((r): r is ReceitaDaDieta => r !== null) : []
  return {
    refeicoes: o['refeicoes'].map(lerRefeicao).filter((r): r is RefeicaoDaDieta => r !== null),
    orientacoes: o['orientacoes'],
    receitas: o['receitas'],
    ...(receitasDoPlano.length > 0 ? { receitasDoPlano } : {}),
    // D-319 (integracao-rodada-1910) e D-376: "gramas" e "medida-e-gramas" valem; link de antes não tem o campo e é
    // "Só medida".
    ...(o['quantidades'] === 'gramas' || o['quantidades'] === 'medida-e-gramas' ? { quantidades: o['quantidades'] } : {}),
    copiadaEm: typeof o['copiadaEm'] === 'string' ? o['copiadaEm'] : '',
  }
}
