// Sugestões de alimentos para cobrir um micronutriente abaixo da meta (SPEC CA-34 a CA-40, D-5, CB-06).
// O que pode ser sugerido é decidido pela regra prescritível (spec sugestoes-com-criterio).
import type { ResultadoAdequacao } from './adequacao.ts'
import { MAXIMO_DE_PEDACOS, MEDIDAS_DE_CONTAR, medidaParaMostrar, medidasDoAlimento } from './busca.ts'
import { ehCorteGordo, ehDeUsoComum, ehPrescritivel, ehSegundaEscolha } from './prescritivel.ts'
import { casaRestricao, comoRestricoes, ehNaoGosta, type RestricoesDoPaciente } from './restricoes.ts'
import { tipoDaRefeicao, type TipoRefeicao } from './sugestoes.ts'
import type { Totais } from './totais.ts'
import type { Alimento, ChaveNutrienteAlimento, MedidaDoItem, Plano, Refeicao } from './tipos.ts'
import { vitaminaAPreFormadaPorCem } from './vitaminaA.ts'

/** A vitamina A: o limite dela vale para a parte pré-formada e vira o teto da porção (D-470, D-471). */
const VITAMINA_A: ChaveNutrienteAlimento = 'vitamina_a_rae_mcg'

/**
 * Porção máxima padrão de uma sugestão, editável pelo usuário (D-5). Desde a D-439 é a "automática": vale a porção do
 * grupo e da idade, e o campo da gaveta fica vazio (D-475).
 */
export const PORCAO_MAXIMA_PADRAO_G = 200

/** Sem medida caseira que caiba, as porções são arredondadas para cima em múltiplos deste passo. */
export const PASSO_PORCAO_G = 5

/** Abaixo desta cobertura da falta, a sugestão não ajuda de forma perceptível e é descartada. */
export const COBERTURA_MINIMA_PCT = 10

export const MAXIMO_SUGESTOES = 5

export type AvisoSugestao =
  | { readonly tipo: 'excede-gasto'; readonly kcalAcima: number }
  | { readonly tipo: 'excede-limite'; readonly chave: ChaveNutrienteAlimento; readonly rotulo: string }
  // D-471 (correção C): o fígado que cabe no limite da vitamina A, no máximo 1 vez por semana (NHS).
  | { readonly tipo: 'figado-semanal' }

export interface Sugestao {
  readonly alimentoId: number
  readonly descricao: string
  readonly gramas: number
  /** A porção em meia medida caseira, que o item guarda ao entrar no plano (spec alimentos-e-gramaturas, G8). */
  readonly medida: MedidaDoItem | null
  /** Parte da falta coberta pela porção, de 0 a 100. */
  readonly coberturaPct: number
  /** Verdadeiro quando a porção máxima não basta para cobrir toda a falta. */
  readonly parcial: boolean
  readonly kcalAdicionadas: number
  readonly avisos: readonly AvisoSugestao[]
}

export interface ResultadoCobrir {
  readonly chave: ChaveNutrienteAlimento
  readonly unidade: string
  /** Quanto falta para a meta mínima, na unidade do nutriente. 0 quando já atingiu. */
  readonly falta: number
  /** kcal que ainda cabem até o gasto energético; `null` sem gasto informado. */
  readonly kcalDisponiveis: number | null
  readonly sugestoes: readonly Sugestao[]
  readonly motivoSemSugestao: string | null
}

/**
 * Café e chá são prescritíveis, mas não são fonte (spec sugestoes-com-criterio, D-193): infusão quase sem caloria
 * passa na frente de qualquer alimento pelo critério de kcal, e a TACO traz para chá B1 e B2 que não se sustentam.
 * Vale em qualquer forma: o café em pó também não entra, nem com a chave ligada (revisão I1).
 */
const CAFE_OU_CHA = /^(Café|Chá),/i

export const SODIO_NAO_SE_COBRE = 'O sódio não se cobre com alimento: o sal de cozinha e os temperos já completam o dia.'

const nomeLimpo = (a: Alimento): string => a.descricao.trim().replace(/\s+/g, ' ')

const OLEAGINOSA = /^(Castanha|Amêndoa|Noz|Amendoim|Gergelim|Linhaça|Coco, cru|Pistache|Avelã|Macadâmia)/i
const PAO_OU_BISCOITO = /^(Pão|Biscoito|Torrada)/i
const OVO_INTEIRO = /^Ovo, de (galinha|codorna), inteiro/i
const GEMA = /^Ovo, de galinha, gema/i
const CLARA = /^Ovo, de galinha, clara/i
/** Charque e carne seca cozidos e ovo frito, que voltaram pela conduta da parceira (spec conduta-da-nutricionista, D-293). */
const CURADO_OU_FRITO = /^(Carne, bovina, (charque|seca), cozid|Ovo, de galinha, inteiro, frito)/i
/** Folha crua (D-439): folha comida em salada, inteira ou picada. */
const FOLHA = /^(Alface|Rúcula|Agrião|Almeirão|Chicória|Espinafre|Mostarda|Serralha|Taioba|Caruru|Catalonha|Couve, manteiga|Repolho|Acelga)/i
const FIGADO = /(fígado|sarapatel)/i
const CARNE: ReadonlySet<string> = new Set(['Carnes e derivados', 'Pescados e frutos do mar'])
const CEREAL_OU_TUBERCULO = /^(Arroz|Macarrão|Lasanha|Polenta|Cuscuz|Batata|Mandioca|Cará|Inhame|Nhoque)/i
/** A TACO põe pão de queijo, farinha, farofa, fécula e polvilho entre as verduras: não são verdura (CA-671). */
const NAO_E_VERDURA = /^(Pão|Farinha|Mandioca, farofa|Nhoque|Fécula|Polvilho|Biscoito)/i
const ehVerdura = (a: Alimento): boolean => a.categoria.startsWith('Verduras') && !NAO_E_VERDURA.test(nomeLimpo(a))
const OVO_INTEIRO_DE_GALINHA = /^Ovo, de galinha, inteiro/i
/** Origem animal: a vitamina A é retinol pré-formado (D-442). */
const ORIGEM_ANIMAL: ReadonlySet<string> = new Set(['Carnes e derivados', 'Pescados e frutos do mar', 'Ovos e derivados', 'Leite e derivados'])

export interface PorcaoDoGrupo {
  readonly grupo: string
  readonly gramas: number
  readonly casa: (alimento: Alimento) => boolean
}

/**
 * Porção máxima realista para grupos calóricos (spec sugestoes-com-criterio, D-199b e seção 7.1). Os números vêm das
 * medidas caseiras da POF: 200 g de castanha não é porção, como cerveja não é prescrição.
 */
export const PORCOES_POR_GRUPO: readonly PorcaoDoGrupo[] = [
  { grupo: 'Oleaginosas e sementes', gramas: 30, casa: (a) => OLEAGINOSA.test(nomeLimpo(a)) },
  { grupo: 'Queijos (menos a ricota)', gramas: 50, casa: (a) => /^Queijo,/i.test(nomeLimpo(a)) && !/ricota/i.test(a.descricao) },
  { grupo: 'Pães, biscoitos e torradas', gramas: 50, casa: (a) => PAO_OU_BISCOITO.test(nomeLimpo(a)) },
  // Ovo (spec vitaminas-usda, D-306): a gema saía com 200 g para a vitamina D, umas 11 gemas. A omelete é preparação.
  { grupo: 'Ovo inteiro (2 ovos)', gramas: 100, casa: (a) => OVO_INTEIRO.test(nomeLimpo(a)) },
  { grupo: 'Gema de ovo (2 gemas)', gramas: 40, casa: (a) => GEMA.test(nomeLimpo(a)) },
  { grupo: 'Clara de ovo', gramas: 100, casa: (a) => CLARA.test(nomeLimpo(a)) },
  {
    grupo: 'Frutas secas e muito calóricas',
    gramas: 30,
    casa: (a) => a.categoria.startsWith('Frutas') && (a.nutrientes.energia_kcal ?? 0) > 200,
  },
  {
    grupo: 'Cortes gordos, aves com pele, carne curada e ovo frito',
    gramas: 100,
    casa: (a) => ehCorteGordo(a) || CURADO_OU_FRITO.test(nomeLimpo(a)),
  },
  // Os grupos dos itens que voltaram pela conduta da parceira (spec conduta-da-nutricionista, D-293).
  { grupo: 'Gordura de adição', gramas: 10, casa: (a) => a.categoria === 'Gorduras e óleos' },
  { grupo: 'Mel e chocolate', gramas: 25, casa: (a) => /^(Mel|Chocolate),/i.test(nomeLimpo(a)) },
  { grupo: 'Azeitona e tremoço em conserva', gramas: 30, casa: (a) => /^(Azeitona,|Tremoço, em conserva)/i.test(nomeLimpo(a)) },
  { grupo: 'Cereal matinal e leite em pó', gramas: 30, casa: (a) => /^(Cereal matinal|Leite, de vaca, [^,]+, pó$)/i.test(nomeLimpo(a)) },
  { grupo: 'Leite fermentado', gramas: 80, casa: (a) => /^Leite, fermentado/i.test(nomeLimpo(a)) },
  { grupo: 'Farinha de mandioca', gramas: 30, casa: (a) => /^Farinha, de mandioca/i.test(nomeLimpo(a)) },
  // Correção A (spec sugestoes-com-criterio, D-439 e seção 8.2): todo alimento num grupo com porção de verdade.
  { grupo: 'Folha crua', gramas: 60, casa: (a) => ehVerdura(a) && a.preparo === 'cru' && FOLHA.test(nomeLimpo(a)) },
  { grupo: 'Fígado e sarapatel', gramas: 100, casa: (a) => FIGADO.test(nomeLimpo(a)) },
  { grupo: 'Carne, ave e peixe', gramas: 120, casa: (a) => CARNE.has(a.categoria) },
  { grupo: 'Leguminosa cozida e tofu', gramas: 140, casa: (a) => a.categoria.startsWith('Leguminosas') && (a.preparo === 'cozido' || /tofu/i.test(a.descricao)) },
  { grupo: 'Cereal e tubérculo cozidos', gramas: 150, casa: (a) => CEREAL_OU_TUBERCULO.test(nomeLimpo(a)) && a.preparo === 'cozido' },
  { grupo: 'Verdura e legume', gramas: 100, casa: ehVerdura },
  { grupo: 'Fruta', gramas: 150, casa: (a) => a.categoria.startsWith('Frutas') },
  { grupo: 'Leite e iogurte', gramas: 200, casa: (a) => /^(Leite, (de vaca|de cabra)|Iogurte|Bebida láctea)/i.test(nomeLimpo(a)) },
  { grupo: 'Preparação', gramas: 150, casa: (a) => a.categoria === 'Alimentos preparados' },
]

/**
 * G8 e D-379 (spec alimentos-e-gramaturas): a meia medida caseira mais perto que cobre a falta (gramas = quantidade ×
 * peso da medida), sem passar da porção máxima. A medida é a que a paciente leria para essa quantidade. `null` quando
 * nenhuma medida cabe (nem meia): o Cobrir volta ao passo de 5 g (CB-378).
 */
export function porcaoEmMedida(
  alimentoId: number,
  necessarioG: number,
  limiteG: number,
): { readonly gramas: number; readonly medida: MedidaDoItem; readonly parcial: boolean } | null {
  const alvo = Math.min(necessarioG, limiteG)
  const referencia = medidaParaMostrar(alimentoId, alvo)
  const peso = referencia ? medidasDoAlimento(alimentoId).find((m) => m.nome === referencia.medida)?.gramas : undefined
  if (!referencia || !peso) return null
  let quantidade = Math.ceil((necessarioG / peso) * 2) / 2
  let parcial = false
  if (quantidade * peso > limiteG) {
    quantidade = Math.floor((limiteG / peso) * 2) / 2
    parcial = true
  }
  if (quantidade < 0.5) return null
  // Correção A: "7 fatias de tofu" ou "5 unidades e meia de quiabo" não é como se prescreve (D-295 da
  // conduta-da-nutricionista); sem medida de até 4 pedaços que caiba, vale o peso.
  if (MEDIDAS_DE_CONTAR.has(referencia.medida) && quantidade > MAXIMO_DE_PEDACOS) return null
  return { gramas: Math.round(quantidade * peso * 10) / 10, medida: { nome: referencia.medida, quantidade, gramasPorMedida: peso }, parcial }
}

/** A unidade da fruta vale como porção quando pesa de 40 a 250 g (D-439: "fruta até 1 unidade"). */
const UNIDADE_DA_FRUTA = { minima: 40, maxima: 250 } as const

/** O grupo do alimento e a porção máxima de adulto; `null` quando ele não está em nenhum grupo da tabela. */
export function porcaoDoGrupo(alimento: Alimento): { readonly grupo: string; readonly maxima: number } | null {
  const grupo = PORCOES_POR_GRUPO.find((g) => g.casa(alimento))
  if (!grupo) return null
  if (grupo.grupo === 'Fruta') {
    const unidade = medidasDoAlimento(alimento.id).find((m) => m.nome === 'unidade')?.gramas
    if (unidade !== undefined && unidade >= UNIDADE_DA_FRUTA.minima && unidade <= UNIDADE_DA_FRUTA.maxima) return { grupo: grupo.grupo, maxima: unidade }
  }
  return { grupo: grupo.grupo, maxima: grupo.gramas }
}

/** A porção máxima do grupo do alimento, de adulto; `null` quando ele não está em nenhum grupo da tabela. */
export function porcaoMaximaDoGrupo(alimento: Alimento): number | null {
  return porcaoDoGrupo(alimento)?.maxima ?? null
}

/**
 * D-439: a porção da criança e do adolescente é uma parte da do adulto: abaixo de 1 ano ¼, de 1 a 3 anos ½, de 4 a 8 ⅔,
 * de 9 a 13 ¾, de 14 em diante 1. Sem idade, a do adulto (CB-406).
 */
export function fatorDaIdade(idadeAnos: number | null | undefined): number {
  if (idadeAnos === null || idadeAnos === undefined || !Number.isFinite(idadeAnos)) return 1
  if (idadeAnos < 1) return 0.25
  if (idadeAnos < 4) return 0.5
  if (idadeAnos < 9) return 2 / 3
  if (idadeAnos < 14) return 0.75
  return 1
}

/** D-440: carne, ave, peixe e víscera ao menos 50 g; ovo ao menos 1 unidade (45 g), de adulto. */
const MINIMA_DE_CARNE_G = 50
const MINIMA_DE_OVO_G = 45

/**
 * A porção mínima do alimento na idade, arredondada para cima de 5 em 5 g: ninguém come 5 g de fígado. `null` quando o
 * grupo não tem mínima.
 */
export function porcaoMinima(alimento: Alimento, idadeAnos?: number | null): number | null {
  const adulto = CARNE.has(alimento.categoria) || FIGADO.test(nomeLimpo(alimento)) ? MINIMA_DE_CARNE_G : OVO_INTEIRO_DE_GALINHA.test(nomeLimpo(alimento)) ? MINIMA_DE_OVO_G : null
  if (adulto === null) return null
  return Math.ceil((adulto * fatorDaIdade(idadeAnos)) / PASSO_PORCAO_G) * PASSO_PORCAO_G
}

/** A porção máxima do grupo na idade, arredondada para baixo de 5 em 5 g, nunca menos que 5 g. */
function porcaoMaximaNaIdade(alimento: Alimento, idadeAnos: number | null | undefined): number {
  const adulto = porcaoMaximaDoGrupo(alimento) ?? PORCAO_MAXIMA_PADRAO_G
  return Math.max(PASSO_PORCAO_G, Math.floor((adulto * fatorDaIdade(idadeAnos)) / PASSO_PORCAO_G) * PASSO_PORCAO_G)
}

/** O tipo de refeição de cada alimento (D-441). */
function tipoDoAlimento(alimento: Alimento): TipoRefeicao {
  const nome = nomeLimpo(alimento)
  if (/^(Pão|Biscoito|Torrada|Cereal matinal|Cereais|Aveia|Tapioca|Cuscuz|Ovo|Omelete|Mingau|Farinha, láctea)/i.test(nome)) return 'desjejum'
  if (alimento.categoria.startsWith('Frutas') || alimento.categoria === 'Leite e derivados' || alimento.categoria === 'Nozes e sementes' || /^(Amendoim|Castanha|Paçoca)/i.test(nome)) return 'lanche'
  return 'almoco'
}

/** Sem a refeição do tipo, a mais perto (CB-407). */
const ORDEM_DOS_TIPOS: Readonly<Record<TipoRefeicao, readonly TipoRefeicao[]>> = {
  desjejum: ['desjejum', 'lanche', 'ceia', 'almoco', 'jantar'],
  lanche: ['lanche', 'ceia', 'desjejum', 'almoco', 'jantar'],
  almoco: ['almoco', 'jantar', 'lanche', 'desjejum', 'ceia'],
  jantar: ['jantar', 'almoco', 'lanche', 'ceia', 'desjejum'],
  ceia: ['ceia', 'lanche', 'jantar', 'desjejum', 'almoco'],
}

/**
 * D-441: a refeição para onde a sugestão do Cobrir vai quando a nutricionista não escolheu uma: verdura, carne e
 * leguminosa no almoço; fruta, laticínio e oleaginosa no lanche; pão, cereal e ovo no café da manhã. `null` sem refeição.
 */
export function refeicaoIndicada(plano: Plano, alimento: Alimento): Refeicao | null {
  const tipos = plano.refeicoes.map((r) => tipoDaRefeicao(r.nome, r.horario))
  for (const tipo of ORDEM_DOS_TIPOS[tipoDoAlimento(alimento)]) {
    const i = tipos.indexOf(tipo)
    if (i >= 0) return plano.refeicoes[i] ?? null
  }
  return plano.refeicoes[0] ?? null
}

export interface OpcoesCobrir {
  readonly alimentos: readonly Alimento[]
  /** A chave "Incluir ingredientes e alimentos crus": libera só a forma de ingrediente (D-191). */
  readonly incluirIngredientes?: boolean
  /** GET do caso em kcal; `null` quando ainda não calculado. */
  readonly gastoEnergetico: number | null
  readonly porcaoMaximaG?: number
  /** Ids de alimentos que o usuário ocultou para este caso (CA-40). */
  readonly ocultos?: ReadonlySet<number>
  /** O que o paciente não come; filtra antes da escolha das 5, para não deixar a gaveta vazia (CA-675). */
  readonly restricoes?: RestricoesDoPaciente | readonly string[]
  /**
   * A porção em meia medida caseira (G8, padrão ligado). Desligada, vale só o passo de 5 g: serve aos testes que medem
   * a regra dos gramas com alimentos inventados, cujos ids caem em medidas de alimentos de verdade.
   */
  readonly porcaoEmMedidaCaseira?: boolean
  /** A idade do paciente, que encolhe a porção do grupo na criança e no adolescente (D-439). Sem ela, a de adulto. */
  readonly idadeAnos?: number | null
}

/**
 * Escolhe a melhor sugestão de cada grupo alimentar (categoria da TACO), na ordem de prioridade,
 * e completa com as seguintes se houver menos grupos que o máximo de sugestões.
 */
function variarPorGrupo(ordenadas: readonly Sugestao[], alimentos: readonly Alimento[]): Sugestao[] {
  const categoria = new Map(alimentos.map((a) => [a.id, a.categoria]))
  const escolhidas: Sugestao[] = []
  const grupos = new Set<string>()
  for (const s of ordenadas) {
    const g = categoria.get(s.alimentoId) ?? ''
    if (grupos.has(g)) continue
    grupos.add(g)
    escolhidas.push(s)
    if (escolhidas.length === MAXIMO_SUGESTOES) return escolhidas
  }
  for (const s of ordenadas) {
    if (escolhidas.length === MAXIMO_SUGESTOES) break
    if (!escolhidas.includes(s)) escolhidas.push(s)
  }
  // Mantém a ordem de prioridade original entre as escolhidas.
  return escolhidas.sort((a, b) => ordenadas.indexOf(a) - ordenadas.indexOf(b))
}

export function sugerirParaCobrir(
  chave: ChaveNutrienteAlimento,
  totais: Totais,
  adequacao: ResultadoAdequacao,
  opcoes: OpcoesCobrir,
): ResultadoCobrir {
  const kcalPlano = totais.nutrientes.energia_kcal.total
  // Spec revisao-geral-trabalho, D-248: sem o dado de energia de algum alimento (produto apagado, alimento sem energia
  // na tabela), a energia do plano é só uma parte; a folga até o gasto não é conhecida, e o Cobrir não a usa.
  const energiaIncompleta = totais.nutrientes.energia_kcal.semDado > 0
  const kcalDisponiveis = opcoes.gastoEnergetico === null || energiaIncompleta ? null : opcoes.gastoEnergetico - kcalPlano
  const linha = adequacao.linhas.find((l) => l.chave === chave)
  const vazio = (unidade: string, falta: number, motivo: string): ResultadoCobrir => ({
    chave,
    unidade,
    falta,
    kcalDisponiveis,
    sugestoes: [],
    motivoSemSugestao: motivo,
  })

  if (!linha) return vazio('', 0, 'Sem referências para este plano: complete sexo, idade e condição.')

  const meta = (linha.referencia.valor * linha.metaPct) / 100
  const falta = Math.max(0, meta - linha.total)
  // Subir sódio com alimento não é conduta: o sal de cozinha não entra no plano (spec sugestoes-com-criterio, D-199d).
  if (chave === 'sodio_mg') return vazio(linha.unidade, falta, SODIO_NAO_SE_COBRE)
  if (falta === 0) return vazio(linha.unidade, 0, `${linha.rotulo} já atingiu a meta.`)

  const porcaoMaxima = opcoes.porcaoMaximaG ?? PORCAO_MAXIMA_PADRAO_G
  if (!(porcaoMaxima > 0)) throw new RangeError(`Porção máxima inválida: ${porcaoMaxima} g.`)

  const limites = adequacao.linhas.filter((l) => l.limite !== null && l.chave !== chave && l.chave !== VITAMINA_A)
  // D-471 (correção C): quanto ainda cabe de vitamina A pré-formada até o limite da fase de vida; `null` sem limite.
  const linhaVitaminaA = adequacao.linhas.find((l) => l.chave === VITAMINA_A)
  const folgaPreFormada = linhaVitaminaA?.limite ? linhaVitaminaA.limite.valor - linhaVitaminaA.totalNoLimite : null
  const restricoes = comoRestricoes(opcoes.restricoes)
  let restricaoTirouAlguem = false
  // D-442: na gestação, a vitamina A vem primeiro das fontes vegetais (carotenoides), não do retinol das animais.
  const vegetalPrimeiro = chave === 'vitamina_a_rae_mcg' && (restricoes.cuidados ?? []).some((c) => c.id === 'gestacao-figado')

  const candidatas: (Sugestao & { readonly comum: boolean; readonly primeira: boolean; readonly naoGosta: boolean; readonly animal: boolean })[] = []
  for (const alimento of opcoes.alimentos) {
    if (opcoes.ocultos?.has(alimento.id)) continue
    if (!ehPrescritivel(alimento, { incluirIngredientes: opcoes.incluirIngredientes === true })) continue
    if (CAFE_OU_CHA.test(alimento.descricao.trim())) continue
    const porCem = alimento.nutrientes[chave]
    const kcalPorCem = alimento.nutrientes.energia_kcal
    if (porCem === null || porCem <= 0 || kcalPorCem === null) continue

    // Vale a menor entre a porção do grupo na idade do paciente e a que a pessoa escolheu (CB-197; D-439), e nunca acima
    // do que cabe de vitamina A pré-formada (D-471): com o plano no limite, nada que a traga.
    const preFormadaPorCem = vitaminaAPreFormadaPorCem(alimento)
    const tetoDaVitaminaA =
      folgaPreFormada !== null && preFormadaPorCem > 0
        ? Math.floor((Math.max(0, folgaPreFormada) / preFormadaPorCem) * (100 / PASSO_PORCAO_G)) * PASSO_PORCAO_G
        : Number.POSITIVE_INFINITY
    const porcaoDoAlimento = Math.min(porcaoMaxima, porcaoMaximaNaIdade(alimento, opcoes.idadeAnos), tetoDaVitaminaA)
    if (porcaoDoAlimento <= 0) continue
    // D-440: carne e ovo têm porção mínima; a que não cabe na porção máxima escolhida não é porção de verdade.
    const minima = porcaoMinima(alimento, opcoes.idadeAnos)
    if (minima !== null && minima > porcaoDoAlimento) continue
    const necessarioG = Math.max((falta / porCem) * 100, minima ?? 0)
    // G8: em meia medida caseira; sem medida que caiba, o passo de 5 g.
    const emMedida = opcoes.porcaoEmMedidaCaseira === false ? null : porcaoEmMedida(alimento.id, necessarioG, porcaoDoAlimento)
    const necessario = Math.ceil(necessarioG / PASSO_PORCAO_G) * PASSO_PORCAO_G
    const gramas = emMedida ? emMedida.gramas : Math.min(necessario, porcaoDoAlimento)
    const parcial = emMedida ? emMedida.parcial : necessario > porcaoDoAlimento
    const coberturaPct = Math.min(100, ((porCem * gramas) / 100 / falta) * 100)
    if (coberturaPct < COBERTURA_MINIMA_PCT) continue
    // A restrição só conta para a mensagem quando tira alguém que cobriria a falta (revisão N6).
    if (casaRestricao(alimento, restricoes)) {
      restricaoTirouAlguem = true
      continue
    }

    const kcalAdicionadas = (kcalPorCem * gramas) / 100
    const avisos: AvisoSugestao[] = []
    if (kcalDisponiveis !== null && kcalAdicionadas > kcalDisponiveis) {
      avisos.push({ tipo: 'excede-gasto', kcalAcima: kcalAdicionadas - kcalDisponiveis })
    }
    for (const l of limites) {
      const extra = ((alimento.nutrientes[l.chave] ?? 0) * gramas) / 100
      // Só avisa quem traz o nutriente: com o plano já acima do limite, o aviso ia para toda sugestão, até a que
      // não tem nada dele (spec vitaminas-usda, D-306 e CA-957b).
      if (l.limite && extra > 0 && l.totalNoLimite + extra > l.limite.valor) {
        avisos.push({ tipo: 'excede-limite', chave: l.chave, rotulo: l.rotulo })
      }
    }
    if (FIGADO.test(alimento.descricao)) avisos.push({ tipo: 'figado-semanal' })

    candidatas.push({
      animal: vegetalPrimeiro && ORIGEM_ANIMAL.has(alimento.categoria),
      comum: ehDeUsoComum(alimento),
      naoGosta: ehNaoGosta(alimento, restricoes),
      primeira: !ehSegundaEscolha(alimento),
      alimentoId: alimento.id,
      descricao: alimento.descricao,
      gramas,
      medida: emMedida?.medida ?? null,
      coberturaPct,
      parcial,
      kcalAdicionadas,
      avisos,
    })
  }

  // Menor acréscimo de kcal por parte da falta coberta (densidade do nutriente por kcal);
  // no empate, a que cobre mais. Assim uma verdura rica vem antes de um doce que cobre tudo de uma vez.
  const kcalPorFaltaInteira = (s: Sugestao) => s.kcalAdicionadas / (s.coberturaPct / 100)
  // Alimento de uso comum vem primeiro: víscera e fruto do mar de exceção só aparecem se sobrar espaço.
  // Depois, a primeira escolha antes da segunda: corte magro e ave sem pele antes de corte gordo e ave com pele
  // (D-199b), e o que voltou pela conduta da parceira depois do resto (spec conduta-da-nutricionista, D-293).
  candidatas.sort(
    (a, b) =>
      // O que o paciente não gosta vai para o fim, sem sair (spec ficha-unica, D-354).
      Number(a.naoGosta) - Number(b.naoGosta) ||
      Number(a.animal) - Number(b.animal) ||
      Number(b.comum) - Number(a.comum) ||
      Number(b.primeira) - Number(a.primeira) ||
      kcalPorFaltaInteira(a) - kcalPorFaltaInteira(b) ||
      b.coberturaPct - a.coberturaPct,
  )

  const sugestoes = variarPorGrupo(candidatas, opcoes.alimentos)
  return {
    chave,
    unidade: linha.unidade,
    falta,
    kcalDisponiveis,
    sugestoes,
    // "De rotina": o que passa na regra prescritível. O resto da base continua a uma busca de distância (D-195).
    motivoSemSugestao:
      sugestoes.length === 0
        ? `Nenhum alimento de rotina${restricaoTirouAlguem ? ', dentro das restrições do paciente,' : ''} cobre ao menos ${COBERTURA_MINIMA_PCT}% da falta ${
            // D-475 (correção C): na porção automática, o teto é a porção de cada grupo, não 200 g.
            porcaoMaxima >= PORCAO_MAXIMA_PADRAO_G ? 'na porção de cada grupo' : `em até ${porcaoMaxima} g`
          }. Você ainda pode adicionar qualquer alimento pela busca da refeição.`
        : null,
  }
}
