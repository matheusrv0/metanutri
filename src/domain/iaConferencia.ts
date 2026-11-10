// A conferência clínica da sugestão da IA, no navegador (spec assistente-ia, D-1310 a D-1312; seção 5 da spec). Nada do
// que a IA devolve vira plano sem passar por aqui: os ids, a ficha, a fase de vida, a regra prescritível, o alimento
// próprio, o não gosta, a porção do grupo e a quantidade; depois o ajuste de energia e as marcas do plano (macros, limite
// superior e as duas regras novas, que só marcam). Os números são do app, com as funções de sempre.
import type { RefeicaoIa, RespostaDaIa } from '../../supabase/functions/_shared/iaContrato.ts'
import { calcularAdequacao } from './adequacao.ts'
import { medidaParaMostrar, medidasDoAlimento, QUANTIDADE_MAXIMA_G } from './busca.ts'
import { PASSO_PORCAO_G, porcaoDoGrupo, porcaoMaximaNaIdade, porcaoMinima } from './cobrir.ts'
import { FAIXA_DO_GASTO_PADRAO, percentualDoGasto } from './energia.ts'
import { fraseDoMacro } from './iaPedido.ts'
import { calcularMacros } from './macros.ts'
import { ehNaoGosta, restricaoDoAlimento, type RestricoesDoPaciente } from './restricoes.ts'
import { ehPrescritivelParaSugerir, motivoParaNaoSugerir, regraDaBaseParaSugerir } from './sugestaoDoProprio.ts'
import { totaisDoPlano } from './totais.ts'
import type { Alimento, BuscarAlimento, Caso, ItemPlano, Plano } from './tipos.ts'

export const FORA_DA_BASE = 'Alimento fora da base'
export const NAO_GOSTA = "Está em 'não gosta' da ficha"
export const PORCAO_REDUZIDA = 'Porção reduzida ao máximo do grupo'
export const QUANTIDADE_FORA = 'Quantidade fora do usual'
export const PORCAO_AJUSTADA = 'Porção ajustada à meta'
export const GESTACAO_ABAIXO = 'Na gestação, o plano fica abaixo do gasto calculado.'
export const LACTACAO_ABAIXO = 'Na lactação, o plano fica abaixo do gasto calculado.'
export const IDADE_ABAIXO = 'Abaixo do gasto calculado para a idade.'
export const PROPRIO_FORA_DO_COBRIR = 'No cadastro, fora do Cobrir e das trocas'
export const ENERGIA_INCOERENTE = 'A energia do cadastro não bate com os macros'

/** D-1311: o ajuste de energia multiplica as porções por um fator preso nesta faixa, no máximo 2 vezes. */
export const FATOR_MINIMO = 0.8
export const FATOR_MAXIMO = 1.25
export const RODADAS_DO_AJUSTE = 2
/** D-1312: gestante e lactante abaixo de 95% do gasto calculado; menor de 18 anos abaixo de 90%. */
export const MINIMO_NA_GESTACAO = 0.95
export const MINIMO_NO_CRESCIMENTO = 0.9

export type OpcaoDaProposta = 'principal' | 'opcao2'

export interface ItemConferido {
  readonly alimentoId: number
  readonly gramas: number
  /** As marcas discretas do item: não gosta, porção reduzida, quantidade fora, porção ajustada. */
  readonly marcas: readonly string[]
}

export interface RefeicaoConferida {
  /** O número da refeição no pedido. */
  readonly refeicao: number
  readonly nome: string
  readonly horario: string
  readonly principal: readonly ItemConferido[]
  readonly opcao2: readonly ItemConferido[]
  /** A energia da opção principal, pelo app. */
  readonly kcal: number
}

export interface Retirado {
  readonly alimentoId: number
  readonly nome: string
  readonly gramas: number
  readonly refeicao: number
  readonly opcao: OpcaoDaProposta
  readonly motivo: string
}

export interface TotaisDaProposta {
  readonly kcal: number
  /** Em % da meta; nulo sem meta. */
  readonly pctDaMeta: number | null
  readonly proteinaG: number
  readonly proteinaGKg: number | null
  readonly carboidratoPct: number | null
  readonly gorduraPct: number | null
}

export interface PropostaConferida {
  readonly refeicoes: readonly RefeicaoConferida[]
  readonly retirados: readonly Retirado[]
  /** As marcas do plano (conferências 9 a 13): energia fora depois do ajuste, macros, limite e as regras de fase. */
  readonly marcasDoPlano: readonly string[]
  readonly totais: TotaisDaProposta
  /** Os nutrientes abaixo da meta, com a adequação em % (o Cobrir resolve depois de usar). */
  readonly abaixoDaMeta: readonly { readonly nutriente: string; readonly pct: number }[]
  readonly pontosAConfirmar: readonly string[]
}

export interface ContextoDaConferencia {
  readonly buscar: BuscarAlimento
  /** O caso como vale (casoComFicha): a idade, a fase, as metas e "Incluir ingredientes". */
  readonly caso: Caso
  /** As restrições da ficha com os cuidados da fase (comCuidadosDaFase). */
  readonly restricoes: RestricoesDoPaciente
  readonly metaKcal: number
  /** O gasto calculado pela ficha, sem a meta digitada (gastoCalculado); nulo sem cálculo. */
  readonly gastoCalculado: number | null
  /** As refeições do pedido: o nome e o horário de cada número. */
  readonly refeicoes: readonly RefeicaoIa[]
  readonly idsDoCatalogo: ReadonlySet<number>
  /** Os "Meus alimentos" que foram no pedido. */
  readonly idsProprios: ReadonlySet<number>
}

const nomeDe = (a: Alimento | undefined, id: number): string => (a ? a.descricao.trim().replace(/\s+/g, ' ') : `Alimento ${id}`)

/** O motivo de o alimento sair (conferências 1 a 5), na ordem da spec; nulo quando fica. */
export function motivoParaRetirar(alimentoId: number, ctx: ContextoDaConferencia): string | null {
  const a = ctx.buscar(alimentoId)
  // 1. Só ids do catálogo ou dos próprios que foram no pedido, e que existem neste navegador (CB-1307, CB-1308).
  if (!a || (!ctx.idsDoCatalogo.has(alimentoId) && !ctx.idsProprios.has(alimentoId))) return FORA_DA_BASE
  // 2 e 3. A ficha e a fase de vida (o aviso da regra; o cuidado da fase vem antes, CB-409).
  const restricao = restricaoDoAlimento(a, ctx.restricoes)
  if (restricao) return restricao
  // 4. A regra prescritível da base, respeitando "Incluir ingredientes" do caso.
  if (!ehPrescritivelParaSugerir(a, { incluirIngredientes: ctx.caso.adequacao.incluirIngredientes })) return regraDaBaseParaSugerir(a)?.titulo ?? FORA_DA_BASE
  // 5. O alimento próprio que não pode ser sugerido.
  if (a.proprio) {
    const motivo = motivoParaNaoSugerir(a)
    if (motivo) return motivo.charAt(0).toUpperCase() + motivo.slice(1)
    if (a.proprio.energiaIncoerente) return ENERGIA_INCOERENTE
    if (!a.proprio.sugerir) return PROPRIO_FORA_DO_COBRIR
  }
  return null
}

/** A meia medida caseira mais perto dos gramas, ou o passo de 5 g sem medida que caiba. */
function arredondarPorcao(alimentoId: number, gramas: number): number {
  const referencia = medidaParaMostrar(alimentoId, gramas)
  const peso = referencia ? medidasDoAlimento(alimentoId).find((m) => m.nome === referencia.medida)?.gramas : undefined
  if (peso && peso > 0) {
    const quantidade = Math.round((gramas / peso) * 2) / 2
    if (quantidade >= 0.5) return Math.round(quantidade * peso * 10) / 10
  }
  return Math.max(PASSO_PORCAO_G, Math.round(gramas / PASSO_PORCAO_G) * PASSO_PORCAO_G)
}

/** A faixa do alimento na idade: a mínima de servir e a máxima do grupo. Fora dos grupos, sem faixa. */
export function faixaDoAlimento(a: Alimento, idade: number | null): { readonly minima: number; readonly maxima: number } | null {
  if (porcaoDoGrupo(a) === null) return null
  return { minima: porcaoMinima(a, idade) ?? 0, maxima: porcaoMaximaNaIdade(a, idade) }
}

export interface ItemDeTrabalho {
  readonly alimentoId: number
  gramas: number
  marcas: string[]
}

const marcar = (item: ItemDeTrabalho, marca: string) => {
  if (!item.marcas.includes(marca)) item.marcas.push(marca)
}

/**
 * Conferências 1 a 8 numa opção: retira, junta o repetido (CB-1305), marca o não gosta e ajusta a porção. O modo
 * adequar usa a mesma para cada mudança (iaMudancas.ts).
 */
export function conferirOpcao(
  itens: readonly { readonly alimentoId: number; readonly gramas: number }[],
  refeicao: number,
  opcao: OpcaoDaProposta,
  ctx: ContextoDaConferencia,
  retirados: Retirado[],
): ItemDeTrabalho[] {
  const ficam: ItemDeTrabalho[] = []
  for (const sugerido of itens) {
    const a = ctx.buscar(sugerido.alimentoId)
    const motivo = motivoParaRetirar(sugerido.alimentoId, ctx)
    if (motivo || !a) {
      retirados.push({ alimentoId: sugerido.alimentoId, nome: nomeDe(a, sugerido.alimentoId), gramas: sugerido.gramas, refeicao, opcao, motivo: motivo ?? FORA_DA_BASE })
      continue
    }
    const repetido = ficam.find((i) => i.alimentoId === sugerido.alimentoId)
    const item: ItemDeTrabalho = repetido ?? { alimentoId: sugerido.alimentoId, gramas: 0, marcas: [] }
    item.gramas += sugerido.gramas
    if (!repetido) ficam.push(item)
  }
  // 8. A quantidade absurda sai antes de qualquer redução, já somada a do repetido (D-1332, CA-2386).
  for (const item of [...ficam]) {
    if (item.gramas <= QUANTIDADE_MAXIMA_G) continue
    retirados.push({ alimentoId: item.alimentoId, nome: nomeDe(ctx.buscar(item.alimentoId), item.alimentoId), gramas: item.gramas, refeicao, opcao, motivo: QUANTIDADE_FORA })
    ficam.splice(ficam.indexOf(item), 1)
  }
  for (const item of ficam) {
    const a = ctx.buscar(item.alimentoId)
    if (!a) continue
    // 6. O não gosta fica e é marcado.
    if (ehNaoGosta(a, ctx.restricoes)) marcar(item, NAO_GOSTA)
    const faixa = faixaDoAlimento(a, ctx.caso.idadeAnos)
    if (!faixa) continue
    // 7. Acima do máximo do grupo na idade: reduz ao máximo.
    if (item.gramas > faixa.maxima) {
      item.gramas = faixa.maxima
      marcar(item, PORCAO_REDUZIDA)
    }
    // 8. Abaixo da porção mínima de servir: sobe à mínima.
    if (item.gramas < faixa.minima) {
      item.gramas = faixa.minima
      marcar(item, QUANTIDADE_FORA)
    }
  }
  return ficam
}

const comoPlano = (refeicoes: readonly { readonly principal: readonly ItemDeTrabalho[] }[]): Plano => ({
  refeicoes: refeicoes.map((r, i) => ({
    id: `r${i}`,
    nome: '',
    horario: '12:00',
    opcoes: { principal: r.principal.map((it, j): ItemPlano => ({ id: `${i}-${j}`, alimentoId: it.alimentoId, gramas: it.gramas })), substituto1: [], substituto2: [] },
  })),
})

/** D-1311, conferência 9: o mesmo fator em todas as porções, dentro da faixa do grupo, arredondado à meia medida. */
function ajustarEnergia(refeicoes: readonly { readonly principal: ItemDeTrabalho[]; readonly opcao2: ItemDeTrabalho[] }[], ctx: ContextoDaConferencia): void {
  for (let rodada = 0; rodada < RODADAS_DO_AJUSTE; rodada++) {
    const kcal = totaisDoPlano(comoPlano(refeicoes), ctx.buscar).nutrientes.energia_kcal.total
    const estado = percentualDoGasto(kcal, ctx.metaKcal, FAIXA_DO_GASTO_PADRAO)
    if (!estado || estado.estado === 'dentro' || kcal <= 0) return
    const fator = Math.min(FATOR_MAXIMO, Math.max(FATOR_MINIMO, ctx.metaKcal / kcal))
    for (const r of refeicoes) {
      for (const item of [...r.principal, ...r.opcao2]) {
        const a = ctx.buscar(item.alimentoId)
        if (!a) continue
        const faixa = faixaDoAlimento(a, ctx.caso.idadeAnos)
        // D-1332: o alimento sem porção de grupo (café e chás, quase sem energia) não muda no ajuste.
        if (!faixa) continue
        const alvo = Math.min(faixa.maxima, Math.max(faixa.minima, item.gramas * fator))
        const novo = Math.min(QUANTIDADE_MAXIMA_G, faixa.maxima, Math.max(faixa.minima, arredondarPorcao(item.alimentoId, alvo)))
        if (Math.abs(novo - item.gramas) >= 0.5) {
          item.gramas = novo
          marcar(item, PORCAO_AJUSTADA)
        }
      }
    }
  }
}

const umaCasa = (v: number): number => Math.round(v * 10) / 10

/**
 * A sugestão conferida (D-1311): as conferências 1 a 8 em cada opção, o ajuste de energia (9) e as marcas do plano (10
 * a 13), com os totais e o que ficou abaixo da meta. As refeições saem na ordem do pedido, com nome e horário dele; a
 * que a IA não preencheu sai vazia (CB-1304).
 */
export function conferirSugestao(resposta: RespostaDaIa, ctx: ContextoDaConferencia): PropostaConferida {
  const retirados: Retirado[] = []
  const trabalho = ctx.refeicoes.map((_, refeicao) => {
    const sugerida = resposta.refeicoes.find((r) => r.refeicao === refeicao)
    return {
      principal: conferirOpcao(sugerida?.principal ?? [], refeicao, 'principal', ctx, retirados),
      opcao2: conferirOpcao(sugerida?.opcao2 ?? [], refeicao, 'opcao2', ctx, retirados),
    }
  })

  ajustarEnergia(trabalho, ctx)

  const plano = comoPlano(trabalho)
  const totais = totaisDoPlano(plano, ctx.buscar)
  const kcal = totais.nutrientes.energia_kcal.total
  const energia = percentualDoGasto(kcal, ctx.metaKcal, FAIXA_DO_GASTO_PADRAO)
  const macros = calcularMacros(totais, ctx.caso, ctx.caso.metasMacros)
  const adequacao = calcularAdequacao(totais, ctx.caso, ctx.caso.adequacao.preset)

  const marcasDoPlano: string[] = []
  // 9. Ainda fora depois de 2 rodadas: só marca.
  if (energia && energia.estado !== 'dentro') marcasDoPlano.push(`Energia ${Math.round(energia.pct)}% da meta (fora de ${FAIXA_DO_GASTO_PADRAO.min}% a ${FAIXA_DO_GASTO_PADRAO.max}%)`)
  // 10. Macros fora da meta.
  for (const [nome, r] of [['Proteína', macros.proteina], ['Carboidrato', macros.carboidrato], ['Gordura', macros.gordura]] as const) {
    const frase = fraseDoMacro(nome, r)
    if (frase) marcasDoPlano.push(frase)
  }
  // 11. Acima do limite superior.
  // "Vitamina A (RAE)" vira "Vitamina A": a forma da medida não muda a frase.
  for (const l of adequacao.linhas.filter((x) => x.estado === 'acima-limite')) marcasDoPlano.push(`${l.rotulo.replace(/\s*\([^)]*\)$/, '')} acima do limite`)
  // 12 e 13. As regras novas, que só marcam (D-1312).
  const gasto = ctx.gastoCalculado
  if (gasto !== null && gasto > 0) {
    const condicao = ctx.caso.condicao.tipo
    if (condicao === 'gestante' && kcal < MINIMO_NA_GESTACAO * gasto) marcasDoPlano.push(GESTACAO_ABAIXO)
    if (condicao === 'lactante' && kcal < MINIMO_NA_GESTACAO * gasto) marcasDoPlano.push(LACTACAO_ABAIXO)
    if (ctx.caso.idadeAnos !== null && ctx.caso.idadeAnos < 18 && kcal < MINIMO_NO_CRESCIMENTO * gasto) marcasDoPlano.push(IDADE_ABAIXO)
  }

  const final = (itens: readonly ItemDeTrabalho[]): readonly ItemConferido[] => itens.map((i) => ({ alimentoId: i.alimentoId, gramas: umaCasa(i.gramas), marcas: [...i.marcas] }))
  const refeicoes: RefeicaoConferida[] = ctx.refeicoes.map((r, refeicao) => {
    const t = trabalho[refeicao] ?? { principal: [], opcao2: [] }
    return {
      refeicao,
      nome: r.nome,
      horario: r.horario,
      principal: final(t.principal),
      opcao2: final(t.opcao2),
      kcal: totaisDoPlano(comoPlano([t]), ctx.buscar).nutrientes.energia_kcal.total,
    }
  })

  return {
    refeicoes,
    retirados,
    marcasDoPlano,
    totais: {
      kcal,
      pctDaMeta: energia === null ? null : energia.pct,
      proteinaG: macros.proteina.gramas,
      proteinaGKg: macros.proteina.gPorKg,
      carboidratoPct: macros.carboidrato.pctKcal,
      gorduraPct: macros.gordura.pctKcal,
    },
    abaixoDaMeta: adequacao.linhas.filter((l) => l.estado === 'abaixo' && l.chave !== 'sodio_mg').map((l) => ({ nutriente: l.rotulo, pct: Math.round(l.adequacaoPct) })),
    pontosAConfirmar: resposta.pontosAConfirmar,
  }
}

/**
 * CA-2350: a proposta vira o plano editável (D-1308): as refeições do pedido, com nome e horário delas, ids novos, a
 * opção 2 em `substituto1`, `substituto2` vazio e o item sem medida gravada (vale a automática).
 */
export function propostaParaPlano(proposta: PropostaConferida, gerarId: () => string): Plano {
  const itens = (lista: readonly ItemConferido[]): ItemPlano[] => lista.map((i) => ({ id: gerarId(), alimentoId: i.alimentoId, gramas: i.gramas }))
  return {
    refeicoes: proposta.refeicoes.map((r) => ({ id: gerarId(), nome: r.nome, horario: r.horario, opcoes: { principal: itens(r.principal), substituto1: itens(r.opcao2), substituto2: [] } })),
  }
}
