// O modo "Adequar com IA" (spec assistente-ia, D-1309): cada mudança que a IA propõe passa pelas mesmas conferências da
// sugestão (a barrada fica travada, com o motivo), o efeito de antes e depois é calculado pelo app, e só as mudanças
// aceitas entram no plano. Os números de refeição e de item são os do plano como estava quando o pedido saiu.
import type { MudancaSugerida, OpcaoIa } from '../../supabase/functions/_shared/iaContrato.ts'
import { calcularAdequacao } from './adequacao.ts'
import { FAIXA_DO_GASTO_PADRAO, percentualDoGasto } from './energia.ts'
import { QUANTIDADE_MAXIMA_G } from './busca.ts'
import { conferirOpcao, faixaDoAlimento, motivoParaRetirar, PORCAO_REDUZIDA, QUANTIDADE_FORA, type ContextoDaConferencia, type Retirado } from './iaConferencia.ts'
import { calcularMacros } from './macros.ts'
import { lerOpcoesDoItem } from './opcoesDoItem.ts'
import { ehItemDeReceita } from './receitaNoPlano.ts'
import { totaisDoPlano } from './totais.ts'
import type { ItemPlano, OpcaoId, Plano } from './tipos.ts'

export const ITEM_SUMIU = 'O item não está mais no plano'
export const ITEM_DE_RECEITA = 'Receita: mude pela receita'

const opcaoDoPlano = (opcao: OpcaoIa): OpcaoId => (opcao === 'principal' ? 'principal' : 'substituto1')

/**
 * O item que a mudança aceita refaz (sem a medida gravada: vale a automática), com as opções que a nutricionista escolheu
 * na busca de substitutos (spec busca-substitutos, D-1114). A opção que virou o próprio item sai, como em `substituirItem`.
 */
function itemRefeito(antes: ItemPlano, alimentoId: number, gramas: number): ItemPlano {
  const opcoes = lerOpcoesDoItem(antes).filter((o) => o.alimentoId !== alimentoId)
  const item: ItemPlano = { id: antes.id, alimentoId, gramas }
  return opcoes.length > 0 ? { ...item, opcoesDoItem: opcoes } : item
}

export interface ItemDaMudanca {
  readonly alimentoId: number
  readonly gramas: number
}

export interface MudancaConferida {
  readonly mudanca: MudancaSugerida
  /** O item do plano que muda ou sai (trocar, gramas, remover); nulo em adicionar. */
  readonly de: ItemDaMudanca | null
  /** O que entra (trocar, gramas, adicionar), já com a porção do grupo; nulo em remover. */
  readonly para: ItemDaMudanca | null
  /** As marcas do item novo (não gosta, porção reduzida, quantidade fora). */
  readonly marcas: readonly string[]
  /** O motivo de a conferência barrar; nulo quando pode ser aceita. */
  readonly barrada: string | null
  /**
   * D-1332: a porção máxima do alimento que entra, na idade (fora dos grupos, 2.000 g). Quando a mudança soma no item que
   * já existe, o total não passa dela. Nulo em remover.
   */
  readonly maximo: number | null
}

function itemDoPlano(plano: Plano, m: MudancaSugerida): ItemPlano | null {
  if (m.item === null) return null
  return plano.refeicoes[m.refeicao]?.opcoes[opcaoDoPlano(m.opcao)][m.item] ?? null
}

/** Conferências 1 a 8 no alimento que entra: retirado vira barrada; a porção sai ajustada ao grupo. */
function conferirEntrada(alimentoId: number, gramas: number, m: MudancaSugerida, ctx: ContextoDaConferencia): { readonly para: ItemDaMudanca | null; readonly marcas: readonly string[]; readonly barrada: string | null } {
  const retirados: Retirado[] = []
  const [ficou] = conferirOpcao([{ alimentoId, gramas }], m.refeicao, m.opcao, ctx, retirados)
  if (!ficou) return { para: null, marcas: [], barrada: retirados[0]?.motivo ?? motivoParaRetirar(alimentoId, ctx) ?? ITEM_SUMIU }
  return { para: { alimentoId: ficou.alimentoId, gramas: Math.round(ficou.gramas * 10) / 10 }, marcas: ficou.marcas, barrada: null }
}

/** Só a porção (conferências 7 e 8), para o alimento que já está no plano. */
function conferirPorcao(alimentoId: number, gramas: number, ctx: ContextoDaConferencia): { readonly para: ItemDaMudanca; readonly marcas: readonly string[]; readonly barrada: null } {
  const a = ctx.buscar(alimentoId)
  const faixa = a ? faixaDoAlimento(a, ctx.caso.idadeAnos) : null
  if (!faixa) return { para: { alimentoId, gramas }, marcas: [], barrada: null }
  if (gramas > faixa.maxima) return { para: { alimentoId, gramas: faixa.maxima }, marcas: [PORCAO_REDUZIDA], barrada: null }
  if (gramas < faixa.minima) return { para: { alimentoId, gramas: faixa.minima }, marcas: [QUANTIDADE_FORA], barrada: null }
  return { para: { alimentoId, gramas }, marcas: [], barrada: null }
}

/** D-1332: o máximo da porção do alimento na idade; fora dos grupos, o teto de 2.000 g. */
function maximoDe(alimentoId: number, ctx: ContextoDaConferencia): number {
  const a = ctx.buscar(alimentoId)
  return (a ? faixaDoAlimento(a, ctx.caso.idadeAnos)?.maxima : undefined) ?? QUANTIDADE_MAXIMA_G
}

/** D-1309: cada mudança conferida contra o plano atual e a ficha. */
export function conferirMudancas(mudancas: readonly MudancaSugerida[], plano: Plano, ctx: ContextoDaConferencia): readonly MudancaConferida[] {
  return mudancas.map((m): MudancaConferida => {
    const c = conferirUma(m, plano, ctx)
    return { ...c, maximo: c.para ? maximoDe(c.para.alimentoId, ctx) : null }
  })
}

function conferirUma(m: MudancaSugerida, plano: Plano, ctx: ContextoDaConferencia): Omit<MudancaConferida, 'maximo'> {
  const atual = itemDoPlano(plano, m)
  const de = atual ? { alimentoId: atual.alimentoId, gramas: atual.gramas } : null
  if (m.tipo !== 'adicionar' && (!atual || !plano.refeicoes[m.refeicao])) return { mudanca: m, de: null, para: null, marcas: [], barrada: ITEM_SUMIU }
  if (atual && ehItemDeReceita(atual)) return { mudanca: m, de, para: null, marcas: [], barrada: ITEM_DE_RECEITA }
  if (m.tipo === 'adicionar' && !plano.refeicoes[m.refeicao]) return { mudanca: m, de: null, para: null, marcas: [], barrada: ITEM_SUMIU }
  switch (m.tipo) {
    case 'remover':
      return { mudanca: m, de, para: null, marcas: [], barrada: null }
    case 'gramas':
      // O alimento já está no plano (a nutricionista escolheu): só a porção é conferida.
      return { mudanca: m, de, ...conferirPorcao(atual?.alimentoId ?? 0, m.gramas ?? atual?.gramas ?? 0, ctx) }
    case 'trocar':
    case 'adicionar':
      return { mudanca: m, de, ...conferirEntrada(m.alimentoId ?? 0, m.gramas ?? atual?.gramas ?? 0, m, ctx) }
  }
}

/**
 * CA-2351: as mudanças aceitas (os índices de `mudancas`) entram no plano; a barrada, a recusada e a que aponta para item
 * que não existe não mudam nada. Os números de item valem para o plano de antes: as trocas e os gramas mudam o item no
 * lugar, as remoções saem depois e as adições entram no fim da opção. O item que muda perde a medida gravada (vale a
 * automática); o alimento que já está na mesma opção soma os gramas no item que existe (CB-1310).
 */
export function aplicarMudancas(plano: Plano, mudancas: readonly MudancaConferida[], aceitas: ReadonlySet<number>, gerarId: () => string): Plano {
  return aplicarMudancasComMarcas(plano, mudancas, aceitas, gerarId).plano
}

export interface MudancasAplicadas {
  readonly plano: Plano
  /** D-1332 e CA-2385: as mudanças (pelo índice) cuja soma passou do máximo do grupo e foi reduzida. */
  readonly reduzidas: ReadonlySet<number>
}

/**
 * O mesmo, dizendo quais mudanças foram reduzidas (D-1332, CA-2385): a soma no item que já existe fica no máximo do grupo
 * (nunca abaixo do que o item já tinha), e a mudança ganha "Porção reduzida ao máximo do grupo".
 */
export function aplicarMudancasComMarcas(plano: Plano, mudancas: readonly MudancaConferida[], aceitas: ReadonlySet<number>, gerarId: () => string): MudancasAplicadas {
  const reduzidas = new Set<number>()
  type Vaga = { item: ItemPlano; sai: boolean }
  const vagas = plano.refeicoes.map((r) => ({
    principal: r.opcoes.principal.map((item): Vaga => ({ item, sai: false })),
    substituto1: r.opcoes.substituto1.map((item): Vaga => ({ item, sai: false })),
    novos: { principal: [] as ItemPlano[], substituto1: [] as ItemPlano[] },
  }))
  const somarOuPor = (lista: Vaga[], novos: ItemPlano[], entra: ItemDaMudanca, ignorar: Vaga | null, maximo: number | null, indice: number): boolean => {
    const igual = [...lista.filter((v) => !v.sai && v !== ignorar).map((v) => v.item), ...novos].find((i) => i.alimentoId === entra.alimentoId && !ehItemDeReceita(i))
    if (!igual) return false
    const soma = Math.round((igual.gramas + entra.gramas) * 10) / 10
    const teto = maximo ?? QUANTIDADE_MAXIMA_G
    const total = Math.max(igual.gramas, Math.min(soma, teto))
    if (total < soma) reduzidas.add(indice)
    const somado = itemRefeito(igual, igual.alimentoId, total)
    const vaga = lista.find((v) => v.item === igual)
    if (vaga) vaga.item = somado
    else novos.splice(novos.indexOf(igual), 1, somado)
    return true
  }

  mudancas.forEach((c, indice) => {
    if (!aceitas.has(indice) || c.barrada !== null) return
    const m = c.mudanca
    const refeicao = vagas[m.refeicao]
    if (!refeicao) return
    const opcao = opcaoDoPlano(m.opcao) as 'principal' | 'substituto1'
    const lista = refeicao[opcao]
    const vaga = m.item === null ? null : (lista[m.item] ?? null)
    if (m.tipo !== 'adicionar' && (!vaga || vaga.sai)) return
    if (m.tipo === 'remover' && vaga) {
      vaga.sai = true
    } else if (m.tipo === 'gramas' && vaga && c.para) {
      vaga.item = itemRefeito(vaga.item, vaga.item.alimentoId, c.para.gramas)
    } else if (m.tipo === 'trocar' && vaga && c.para) {
      if (somarOuPor(lista, refeicao.novos[opcao], c.para, vaga, c.maximo, indice)) vaga.sai = true
      else vaga.item = itemRefeito(vaga.item, c.para.alimentoId, c.para.gramas)
    } else if (m.tipo === 'adicionar' && c.para) {
      if (!somarOuPor(lista, refeicao.novos[opcao], c.para, null, c.maximo, indice)) refeicao.novos[opcao].push({ id: gerarId(), alimentoId: c.para.alimentoId, gramas: c.para.gramas })
    }
  })

  return {
    plano: {
      refeicoes: plano.refeicoes.map((r, i) => {
        const v = vagas[i]
        if (!v) return r
        const montar = (opcao: 'principal' | 'substituto1') => [...v[opcao].filter((x) => !x.sai).map((x) => x.item), ...v.novos[opcao]]
        return { ...r, opcoes: { ...r.opcoes, principal: montar('principal'), substituto1: montar('substituto1') } }
      }),
    },
    reduzidas,
  }
}

export interface ResumoDoPlano {
  readonly kcal: number
  readonly pctDaMeta: number | null
  readonly proteinaGKg: number | null
  readonly carboidratoPct: number | null
  readonly gorduraPct: number | null
  /** A adequação em % de cada nutriente pedido, pelo rótulo. */
  readonly nutrientes: Readonly<Record<string, number>>
  /** Quantos nutrientes ficam abaixo da meta (o que o Cobrir ainda teria a fazer; o sódio não conta). */
  readonly abaixoNoCobrir: number
}

/** O resumo de um plano pelo app: energia, macros, a adequação dos nutrientes pedidos e quantos ficam abaixo. */
export function resumoDoPlano(plano: Plano, ctx: Pick<ContextoDaConferencia, 'buscar' | 'caso' | 'metaKcal'>, nutrientes: readonly string[]): ResumoDoPlano {
  const totais = totaisDoPlano(plano, ctx.buscar)
  const kcal = totais.nutrientes.energia_kcal.total
  const macros = calcularMacros(totais, ctx.caso, ctx.caso.metasMacros)
  const adequacao = calcularAdequacao(totais, ctx.caso, ctx.caso.adequacao.preset)
  return {
    kcal,
    pctDaMeta: percentualDoGasto(kcal, ctx.metaKcal, FAIXA_DO_GASTO_PADRAO)?.pct ?? null,
    proteinaGKg: macros.proteina.gPorKg,
    carboidratoPct: macros.carboidrato.pctKcal,
    gorduraPct: macros.gordura.pctKcal,
    nutrientes: Object.fromEntries(adequacao.linhas.filter((l) => nutrientes.includes(l.rotulo)).map((l) => [l.rotulo, l.adequacaoPct])),
    abaixoNoCobrir: adequacao.linhas.filter((l) => l.estado === 'abaixo' && l.chave !== 'sodio_mg').length,
  }
}

/** CA-2353: o antes e o depois das mudanças aceitas, calculados pelo app; muda a cada aceitar e recusar. */
export function efeitoDasMudancas(
  plano: Plano,
  mudancas: readonly MudancaConferida[],
  aceitas: ReadonlySet<number>,
  ctx: Pick<ContextoDaConferencia, 'buscar' | 'caso' | 'metaKcal'>,
  nutrientes: readonly string[],
): { readonly antes: ResumoDoPlano; readonly depois: ResumoDoPlano; readonly reduzidas: ReadonlySet<number> } {
  let contador = 0
  const aplicadas = aplicarMudancasComMarcas(plano, mudancas, aceitas, () => `efeito-${++contador}`)
  return { antes: resumoDoPlano(plano, ctx, nutrientes), depois: resumoDoPlano(aplicadas.plano, ctx, nutrientes), reduzidas: aplicadas.reduzidas }
}
