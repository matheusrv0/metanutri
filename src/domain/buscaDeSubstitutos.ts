// Busca de substitutos por nutriente (spec busca-substitutos). Dado o alimento de um item do plano e um ou mais
// nutrientes, procura na base o que dá a mesma quantidade deles, na meia medida caseira, com os filtros clínicos das
// trocas da folha e as restrições do paciente. A tela mostra; a conta mora aqui.
import { MICRONUTRIENTES_ADEQUACAO } from './adequacao.ts'
import { MAXIMO_DE_PEDACOS, MEDIDAS_DE_CONTAR, medidaParaMostrar, medidasDoAlimento } from './busca.ts'
import { posicaoNoConsumo } from './consumoPof.ts'
import { ehFrutaInteira, ehSucoOuPolpaDeFruta, noMesmoGrupo, temGrupoConhecido } from './grupoDeSubstituicao.ts'
import { unidadeDo } from './liquido.ts'
import { CAFE_OU_CHA, ehDeUsoComum, ehFrito, ehPoOuDesidratado, ehPratoComposto, ehProcessado, ehSegundaEscolha, ehUltraprocessado } from './prescritivel.ts'
import { casaRestricao, comoRestricoes, ehNaoGosta, type RestricoesDoPaciente } from './restricoes.ts'
import { ehPrescritivelParaSugerir } from './sugestaoDoProprio.ts'
import { ehTrocaRazoavel, macroDominante } from './trocas.ts'
import type { Alimento, BuscarAlimento, ChaveNutrienteAlimento, MedidaDoItem } from './tipos.ts'
import { FIGADO } from './vitaminaA.ts'

// ---------- Os nutrientes (D-1110) ----------

export interface InfoDoNutriente {
  readonly chave: ChaveNutrienteAlimento
  /** No chip e na lista: "Carboidratos", "Cálcio". */
  readonly nome: string
  /** Na frase: "0,7 g de carboidrato a mais". */
  readonly curto: string
  /** Na linha do Comparar e no "igual": "Carboidrato", "Cálcio". */
  readonly rotulo: string
  readonly unidade: 'g' | 'kcal' | 'mg' | 'µg'
}

const MICROS: Readonly<Partial<Record<ChaveNutrienteAlimento, readonly [nome: string, curto: string, unidade: 'g' | 'mg' | 'µg']>>> = {
  calcio_mg: ['Cálcio', 'cálcio', 'mg'],
  ferro_mg: ['Ferro', 'ferro', 'mg'],
  magnesio_mg: ['Magnésio', 'magnésio', 'mg'],
  zinco_mg: ['Zinco', 'zinco', 'mg'],
  potassio_mg: ['Potássio', 'potássio', 'mg'],
  fosforo_mg: ['Fósforo', 'fósforo', 'mg'],
  sodio_mg: ['Sódio', 'sódio', 'mg'],
  cobre_mg: ['Cobre', 'cobre', 'mg'],
  manganes_mg: ['Manganês', 'manganês', 'mg'],
  selenio_mcg: ['Selênio', 'selênio', 'µg'],
  vitamina_a_rae_mcg: ['Vitamina A (RAE)', 'vitamina A', 'µg'],
  vitamina_c_mg: ['Vitamina C', 'vitamina C', 'mg'],
  vitamina_d_mcg: ['Vitamina D', 'vitamina D', 'µg'],
  vitamina_e_mg: ['Vitamina E', 'vitamina E', 'mg'],
  tiamina_mg: ['Tiamina (B1)', 'tiamina', 'mg'],
  riboflavina_mg: ['Riboflavina (B2)', 'riboflavina', 'mg'],
  piridoxina_mg: ['Piridoxina (B6)', 'piridoxina', 'mg'],
  niacina_mg: ['Niacina (B3)', 'niacina', 'mg'],
  folato_dfe_mcg: ['Folato (DFE)', 'folato', 'µg'],
  vitamina_b12_mcg: ['Vitamina B12', 'vitamina B12', 'µg'],
  fibra_g: ['Fibra alimentar', 'fibra', 'g'],
}

const DOS_MACROS: Readonly<Partial<Record<ChaveNutrienteAlimento, InfoDoNutriente>>> = {
  carboidrato_g: { chave: 'carboidrato_g', nome: 'Carboidratos', curto: 'carboidrato', rotulo: 'Carboidrato', unidade: 'g' },
  proteina_g: { chave: 'proteina_g', nome: 'Proteínas', curto: 'proteína', rotulo: 'Proteína', unidade: 'g' },
  lipideos_g: { chave: 'lipideos_g', nome: 'Lipídeos', curto: 'lipídeo', rotulo: 'Lipídeos', unidade: 'g' },
  energia_kcal: { chave: 'energia_kcal', nome: 'Energia', curto: 'energia', rotulo: 'Energia', unidade: 'kcal' },
}

/** O nome, a frase e a unidade de um nutriente da busca. */
export function infoDoNutriente(chave: ChaveNutrienteAlimento): InfoDoNutriente {
  const macro = DOS_MACROS[chave]
  if (macro) return macro
  const micro = MICROS[chave]
  if (micro) {
    const [nome, curto, unidade] = micro
    return { chave, nome, curto, rotulo: nome.replace(/ \(.+\)$/, ''), unidade }
  }
  return { chave, nome: chave, curto: chave, rotulo: chave, unidade: 'g' }
}

/** Os chips: Carboidratos, Proteínas e Lipídeos. */
export const MACROS_DA_BUSCA: readonly ChaveNutrienteAlimento[] = ['carboidrato_g', 'proteina_g', 'lipideos_g']

/** "Outro nutriente": energia, fibra e os micronutrientes da Adequação, na ordem dela (D-1110). */
export const OUTROS_NUTRIENTES_DA_BUSCA: readonly ChaveNutrienteAlimento[] = [
  'energia_kcal',
  'fibra_g',
  ...MICRONUTRIENTES_ADEQUACAO.filter((c) => c !== 'fibra_g'),
]

const KCAL_POR_GRAMA: readonly (readonly [ChaveNutrienteAlimento, number])[] = [
  ['carboidrato_g', 4],
  ['proteina_g', 4],
  ['lipideos_g', 9],
]

/** CA-2102: o macro que mais dá energia ao alimento (o "macro dominante" das trocas); sem macro, a energia. */
export function nutrienteInicial(a: Alimento): ChaveNutrienteAlimento {
  let melhor: { chave: ChaveNutrienteAlimento; kcal: number } | null = null
  for (const [chave, fator] of KCAL_POR_GRAMA) {
    const kcal = (a.nutrientes[chave] ?? 0) * fator
    if (kcal > 0 && (melhor === null || kcal > melhor.kcal)) melhor = { chave, kcal }
  }
  return melhor?.chave ?? 'energia_kcal'
}

// ---------- Números e frases (D-1105) ----------

const formatadores = new Map<number, Intl.NumberFormat>()
function formatar(valor: number, casas: number): string {
  let f = formatadores.get(casas)
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
    formatadores.set(casas, f)
  }
  return f.format(valor)
}

/** Energia sem casa; o resto com uma casa abaixo de 100 e nenhuma de 100 em diante (a precisão da Adequação). */
function casasDe(chave: ChaveNutrienteAlimento, valor: number): number {
  if (chave === 'energia_kcal') return 0
  return Math.round(Math.abs(valor) * 10) / 10 < 100 ? 1 : 0
}

const arredondar = (valor: number, casas: number): number => Math.round(valor * 10 ** casas) / 10 ** casas

/** "1,2 g", "543 mg", "192 kcal". */
function quantidade(chave: ChaveNutrienteAlimento, valor: number): string {
  return `${formatar(Math.abs(valor), casasDe(chave, valor))} ${infoDoNutriente(chave).unidade}`
}

/** CA-2106: "0,7 g de carboidrato a mais", "12 kcal a menos", "Carboidrato igual". */
export function fraseDaDiferenca(chave: ChaveNutrienteAlimento, valor: number): { readonly texto: string; readonly igual: boolean } {
  const info = infoDoNutriente(chave)
  if (arredondar(valor, casasDe(chave, valor)) === 0) return { texto: `${info.rotulo} igual`, igual: true }
  const quanto = info.unidade === 'kcal' ? quantidade(chave, valor) : `${quantidade(chave, valor)} de ${info.curto}`
  return { texto: `${quanto} ${valor > 0 ? 'a mais' : 'a menos'}`, igual: false }
}

// ---------- A busca (D-1103 a D-1109) ----------

/** No máximo 20 candidatos (D-1109). */
export const LIMITE_DA_BUSCA = 20
/** Acima desta nota de ajuste, o candidato não equivale à combinação de nutrientes (D-1103). */
export const MAXIMO_DE_AJUSTE = 0.25
/** A faixa de proximidade em que o desempate clínico decide (D-1109). */
const FAIXA_DE_PROXIMIDADE = 0.05
/** A porção que alguém come (a faixa das trocas da folha). */
const PORCAO_MINIMA_G = 5
const PORCAO_MAXIMA_G = 600

export interface OpcoesDaBusca {
  readonly nutrientes: readonly ChaveNutrienteAlimento[]
  readonly mesmoGrupo: boolean
  /** A lista onde procurar: `alimentosParaSugerir()` (D-1102). */
  readonly alimentos: readonly Alimento[]
  readonly restricoes?: RestricoesDoPaciente | readonly string[] | undefined
  /** Padrão: `LIMITE_DA_BUSCA`. */
  readonly limite?: number | undefined
}

export interface DiferencaNaPorcao {
  readonly chave: ChaveNutrienteAlimento
  /** Substituto na porção − original no item. */
  readonly valor: number
  readonly texto: string
  readonly igual: boolean
}

export interface Candidato {
  readonly alimento: Alimento
  /** A porção: quantidade × peso da medida, ou os gramas inteiros sem medida. */
  readonly gramas: number
  /** A medida que vai para o item (D-379); `null` = só gramas. */
  readonly medida: MedidaDoItem | null
  /** "2 unidades e meia"; `null` sem medida. */
  readonly textoDaMedida: string | null
  /** Só dos nutrientes buscados, na ordem deles. */
  readonly diferencas: readonly DiferencaNaPorcao[]
  /** Soma dos erros relativos dos nutrientes buscados, na porção. */
  readonly proximidade: number
  /** A nota de ajuste, com 2 ou mais nutrientes; `null` com 1. */
  readonly ajuste: number | null
}

/** O que a tela precisa para substituir ou pôr como opção: o candidato da busca ou o resultado da calculadora. */
export type PorcaoDoSubstituto = Pick<Candidato, 'alimento' | 'gramas' | 'medida' | 'textoDaMedida'>

export type ResultadoDaBusca =
  | { readonly tipo: 'lista'; readonly candidatos: readonly Candidato[]; readonly restricaoTirou: boolean }
  | { readonly tipo: 'sem-alvo'; readonly motivo: string }

/** "2 unidades e meia · 350 g"; sem medida, "259 g"; no líquido, ml. */
export function textoDaPorcao(c: Pick<Candidato, 'alimento' | 'gramas' | 'textoDaMedida'>): string {
  const peso = `${formatar(c.gramas, 0)} ${unidadeDo(c.alimento)}`
  return c.textoDaMedida ? `${c.textoDaMedida} · ${peso}` : peso
}

/** CB-1100 e CA-2110. */
export function mensagemSemCandidato(restricaoTirou: boolean): string {
  return `Nenhum substituto com esses nutrientes${restricaoTirou ? ' dentro das restrições do paciente' : ''}. Tire um nutriente, desligue “Só do mesmo grupo” ou adicione manualmente.`
}

/** A porção na meia medida caseira (D-1104); `null` quando ela não serve (fora de 5 a 600 g ou mais de 4 pedaços). */
function porcaoDe(a: Alimento, gramasIdeais: number): Pick<Candidato, 'gramas' | 'medida' | 'textoDaMedida'> | null {
  const gramas = Math.round(gramasIdeais)
  if (gramas < PORCAO_MINIMA_G || gramas > PORCAO_MAXIMA_G) return null
  const medida = medidaParaMostrar(a.id, gramas)
  if (medida && MEDIDAS_DE_CONTAR.has(medida.medida) && medida.quantidade > MAXIMO_DE_PEDACOS) return null
  const peso = medida ? medidasDoAlimento(a.id).find((m) => m.nome === medida.medida)?.gramas : undefined
  if (!medida || !peso) return { gramas, medida: null, textoDaMedida: null }
  const naMedida = Math.round(medida.quantidade * peso * 10) / 10
  // CA-2107 (revisão, achado 2): a faixa vale também para a porção final, depois da meia medida (mamão 620 g não entra).
  if (naMedida < PORCAO_MINIMA_G || naMedida > PORCAO_MAXIMA_G) return null
  return {
    gramas: naMedida,
    medida: { nome: medida.medida, quantidade: medida.quantidade, gramasPorMedida: peso },
    textoDaMedida: medida.texto,
  }
}

/**
 * D-1103: os gramas que deixam o erro relativo menor. Com 1 nutriente, `alvo / b`; com 2 ou mais, mínimos quadrados,
 * `Σ(b/alvo) ÷ Σ(b/alvo)²`, e a nota de ajuste, `√ média((b·g/alvo − 1)²)`.
 */
function gramasIdeais(porGrama: readonly number[], alvos: readonly number[]): { readonly gramas: number; readonly ajuste: number | null } {
  if (porGrama.length === 1) return { gramas: (alvos[0] ?? 0) / (porGrama[0] ?? 1), ajuste: null }
  const razoes = porGrama.map((b, i) => b / (alvos[i] ?? 1))
  const gramas = razoes.reduce((s, r) => s + r, 0) / razoes.reduce((s, r) => s + r * r, 0)
  const ajuste = Math.sqrt(razoes.reduce((s, r) => s + (r * gramas - 1) ** 2, 0) / razoes.length)
  return { gramas, ajuste }
}

interface Ordenavel {
  readonly candidato: Candidato
  readonly naoGosta: boolean
}

/**
 * D-1109 e CA-2135: a faixa de 5% contada a partir do melhor candidato. Quem fica a menos de 5 pontos do melhor está na
 * faixa 0, mesmo que os dois caiam em lados diferentes de um múltiplo de 5.
 */
export function faixaDeProximidade(proximidade: number, melhor: number): number {
  return Math.floor((proximidade - melhor) / FAIXA_DE_PROXIMIDADE + 1e-9)
}

/** D-1109, item 4, e D-1131: o processado (D-296) e o suco e a polpa de fruta vêm depois do in natura. */
const naoEhInNatura = (a: Alimento): boolean => ehProcessado(a) || ehSucoOuPolpaDeFruta(a)

/** A posição no consumo do Brasil (POF 2017-2018); quem não está nela vai para o fim. */
const naPof = (a: Alimento): number => Math.min(posicaoNoConsumo(a.id), 1e6)

/** D-1109: não gosta por último, uso comum, faixa de 5%, desempate clínico, medida caseira, POF, proximidade, nome. */
const compararCandidatos =
  (melhor: number) =>
  ({ candidato: x, naoGosta: xNaoGosta }: Ordenavel, { candidato: y, naoGosta: yNaoGosta }: Ordenavel): number => {
    const faixa = (c: Candidato) => faixaDeProximidade(c.proximidade, melhor)
    return (
      Number(xNaoGosta) - Number(yNaoGosta) ||
      Number(ehDeUsoComum(y.alimento)) - Number(ehDeUsoComum(x.alimento)) ||
      faixa(x) - faixa(y) ||
      Number(ehPratoComposto(x.alimento)) - Number(ehPratoComposto(y.alimento)) ||
      Number(naoEhInNatura(x.alimento)) - Number(naoEhInNatura(y.alimento)) ||
      Number(ehSegundaEscolha(x.alimento)) - Number(ehSegundaEscolha(y.alimento)) ||
      Number(y.medida !== null) - Number(x.medida !== null) ||
      naPof(x.alimento) - naPof(y.alimento) ||
      x.proximidade - y.proximidade ||
      x.alimento.descricao.localeCompare(y.alimento.descricao, 'pt-BR')
    )
  }

const listaDeNomes = (nomes: readonly string[]): string => nomes.join(' nem ')

/**
 * D-1125, regra b: o item com até 4 kcal em 100 g tem energia quase zero (a quantidade não significativa de valor
 * energético da rotulagem, que o rótulo declara como zero: ANVISA, IN 75/2020, Anexo IV). A razão de energia não diz nada
 * nele: a regra da energia não vale, e o macro dominante basta.
 */
export const ENERGIA_QUASE_ZERO_KCAL = 4
/** D-1125, regra b: a porção do candidato fica entre metade e o dobro da energia do item. */
const MENOR_RAZAO_DE_ENERGIA = 0.5
const MAIOR_RAZAO_DE_ENERGIA = 2

/**
 * D-1125: a troca equivalente no mesmo grupo, a lista de equivalentes (Philippi et al., "Pirâmide alimentar adaptada",
 * Rev. Nutr. 1999;12(1):65-80): o mesmo macro dominante das trocas da folha (a), a energia na porção entre metade e o
 * dobro (b) e o pó ou desidratado só no lugar de outro (c). A faixa de metade ao dobro é a tolerância desta busca, que
 * procura pelo nutriente: a energia só barra o absurdo ("leite em pó 526 g" no lugar de um copo de leite).
 * D-1133: a regra (a) vale só quando o grupo do item ou do candidato é desconhecido. Dentro de um grupo da tabela, o grupo
 * já diz que a troca é equivalente: o leite integral ("de gordura") troca com o desnatado e a bebida de soja ("de
 * carboidrato"), e as verduras, cujos macros são frações de grama, trocam entre si.
 */
export function naTrocaEquivalente(base: Alimento, gramas: number): (candidato: Alimento, gramasDoCandidato: number) => boolean {
  const macro = macroDominante(base)
  const itemNoGrupo = temGrupoConhecido(base)
  const kcalPorCem = base.nutrientes.energia_kcal
  const energiaDoItem = kcalPorCem !== null && kcalPorCem > ENERGIA_QUASE_ZERO_KCAL ? (kcalPorCem * gramas) / 100 : null
  const baseEmPo = ehPoOuDesidratado(base)
  return (a, gramasDoCandidato) => {
    if (!(itemNoGrupo && temGrupoConhecido(a)) && macroDominante(a) !== macro) return false
    if (!baseEmPo && ehPoOuDesidratado(a)) return false
    if (energiaDoItem === null) return true
    // CB-1111: sem energia na tabela, não dá para dizer que a troca é equivalente.
    const kcal = a.nutrientes.energia_kcal
    if (kcal === null) return false
    const razao = (kcal * gramasDoCandidato) / 100 / energiaDoItem
    return razao >= MENOR_RAZAO_DE_ENERGIA - 1e-9 && razao <= MAIOR_RAZAO_DE_ENERGIA + 1e-9
  }
}

/**
 * D-1134: a parte do nome que diz só o preparo, o estado e a conservação, o "tipo N", o "com" ou "sem" alguma coisa ou a
 * forma do corte. Dois nomes que diferem só nessas partes são o mesmo alimento ("Arroz, tipo 1, cozido" e "Arroz, tipo 2,
 * cozido"; "Pintado, assado" e "Pintado, grelhado"); o que sobra diz o alimento ("Queijo, minas, frescal" não é
 * "Queijo, ricota").
 */
const SO_PREPARO =
  /^(crus?|cruas?|(pré )?cozid[oa]s?(\/\d+ ?minutos)?( (com|sem) sal| no vapor)?|assad[oa]s?|grelhad[oa]s?|frit[oa]s?|refogad[oa]s?|torrad[oa]s?|ensopad[oa]s?|pochê|sauté|tipo \d+|(com|sem) .+|salgad[oa]s?|congelad[oa]s?|fresc[oa]s?|enlatad[oa]s?|drenad[oa]s?|(em )?conserva( em .+)?|uht|parboilizad[oa]s?|filé|posta|moíd[oa]s?|\d+% magr[oa]s?)$/

/** As partes do nome, em minúsculas; hífen e espaço contam igual, e o "filé mingnon" da TACO é o filé-mignon. */
const partesDoNome = (descricao: string): readonly string[] =>
  descricao
    .split(',')
    .map((p) => p.trim().toLowerCase().replace(/-/g, ' ').replace(/\s+/g, ' ').replace('mingnon', 'mignon'))
    .filter((p) => p !== '')

/**
 * D-1134: o alimento, pelo nome sem o preparo. Na fruta, o nome da fruta (D-422: banana prata e banana nanica são a mesma
 * fruta); o suco e a polpa são outro alimento que a fruta inteira (D-1131).
 */
export function mesmoAlimentoDe(a: Alimento): string {
  const [alimento = '', ...resto] = partesDoNome(a.descricao)
  if (ehSucoOuPolpaDeFruta(a)) return `${alimento} (suco ou polpa)`
  if (ehFrutaInteira(a)) return alimento
  return [alimento, ...resto.filter((p) => !SO_PREPARO.test(p))].join(', ')
}

/** D-422: a fruta inteira não troca pela mesma fruta, nem pelo suco dela. */
const daMesmaFruta = (base: Alimento): ((a: Alimento) => boolean) => {
  if (!ehFrutaInteira(base)) return () => false
  const fruta = mesmoAlimentoDe(base)
  return (a) => (ehFrutaInteira(a) || ehSucoOuPolpaDeFruta(a)) && partesDoNome(a.descricao)[0] === fruta
}

/**
 * D-1130: a regra de variedade das trocas da folha ("trocar arroz tipo 1 por arroz tipo 2 não é troca"), sobre a lista já
 * ordenada e para todo nome dela, com "o mesmo alimento" da D-1134. Do mesmo alimento do item, nenhum (arroz tipo 1 → nem
 * tipo 2 nem parboilizado; a fruta inteira, nem outra variedade nem o suco da mesma fruta, D-422). De cada outro alimento,
 * um: o que o paciente não recusa, o mais consumido no Brasil (POF 2017-2018, como nas trocas do papel e da fruta) e,
 * empatados, o primeiro na ordem (batata inglesa → arroz tipo 1, não o tipo 1 e o tipo 2; patinho → um pintado só).
 */
function umDeCadaAlimento(base: Alimento, ordenados: readonly Ordenavel[]): readonly Ordenavel[] {
  const doItem = mesmoAlimentoDe(base)
  const mesmaFruta = daMesmaFruta(base)
  // `x` vem antes na ordem: no empate, ele fica.
  const melhor = (x: Ordenavel, y: Ordenavel): Ordenavel => {
    if (x.naoGosta !== y.naoGosta) return x.naoGosta ? y : x
    return naPof(y.candidato.alimento) < naPof(x.candidato.alimento) ? y : x
  }
  const porAlimento = new Map<string, Ordenavel>()
  for (const o of ordenados) {
    const alimento = mesmoAlimentoDe(o.candidato.alimento)
    if (alimento === doItem || mesmaFruta(o.candidato.alimento)) continue
    const atual = porAlimento.get(alimento)
    porAlimento.set(alimento, atual === undefined ? o : melhor(atual, o))
  }
  const ficam = new Set(porAlimento.values())
  return ordenados.filter((o) => ficam.has(o))
}

/** CA-2145: a frase do painel quando o item é café ou chá. */
const CAFE_OU_CHA_SEM_BUSCA = 'Café e chá não têm substituto por nutriente. Escolha em “Adicionar manualmente”.'

/** D-1120: o mel e o chocolate que a conduta da parceira libera no Cobrir (D-290) não são substitutos. */
const ACUCARADOS = 'Produtos açucarados'

/**
 * Os substitutos do alimento `original` na quantidade dele, pelos nutrientes escolhidos. A lista sai ordenada e cortada
 * em `limite`; `restricaoTirou` diz se alguma restrição do paciente tirou um candidato que serviria (CA-2110).
 */
export function buscarSubstitutos(
  original: { readonly alimentoId: number; readonly gramas: number },
  opcoes: OpcoesDaBusca,
  buscar: BuscarAlimento,
): ResultadoDaBusca {
  const base = buscar(original.alimentoId)
  if (!base) return { tipo: 'sem-alvo', motivo: 'Este alimento não está mais na base.' }
  // D-1132: café e chá não são fonte de nutriente (D-193); como item, só sobrava troca sem sentido (água de coco 28 ml no
  // lugar de 100 ml de café). A calculadora, no modo manual, aceita qualquer alimento.
  if (CAFE_OU_CHA.test(base.descricao.trim())) return { tipo: 'sem-alvo', motivo: CAFE_OU_CHA_SEM_BUSCA }
  const nutrientes = [...new Set(opcoes.nutrientes)]
  if (nutrientes.length === 0) return { tipo: 'sem-alvo', motivo: 'Selecione um ou mais nutrientes.' }
  if (!(original.gramas > 0)) return { tipo: 'sem-alvo', motivo: `Informe os gramas de ${base.descricao.trim()} para buscar substitutos.` }
  const semAlvo = nutrientes.filter((k) => !((base.nutrientes[k] ?? 0) > 0))
  if (semAlvo.length > 0) {
    const nomes = semAlvo.map((k) => infoDoNutriente(k).curto)
    return { tipo: 'sem-alvo', motivo: `${base.descricao.trim()} não tem ${listaDeNomes(nomes)} na tabela. Escolha outro nutriente.` }
  }
  const alvos = nutrientes.map((k) => ((base.nutrientes[k] ?? 0) * original.gramas) / 100)

  const restricoes = comoRestricoes(opcoes.restricoes)
  const doGrupo = opcoes.mesmoGrupo ? noMesmoGrupo(base) : () => true
  // D-1125: no mesmo grupo, a troca equivalente, com 1 ou mais nutrientes; desligado o filtro, as três regras não valem.
  const equivalente = opcoes.mesmoGrupo ? naTrocaEquivalente(base, original.gramas) : () => true
  // D-478 e D-294: ultraprocessado e prato composto só no lugar de quem já é.
  const baseUltraprocessada = ehUltraprocessado(base)
  const baseSimples = !ehPratoComposto(base)

  let restricaoTirou = false
  const candidatos: Ordenavel[] = []
  for (const a of opcoes.alimentos) {
    if (a.id === base.id || !doGrupo(a)) continue
    // D-1106: os filtros clínicos das trocas da folha.
    if (!ehPrescritivelParaSugerir(a) || !ehTrocaRazoavel(a) || FIGADO.test(a.descricao) || ehFrito(a)) continue
    // D-1120: café e chá (a constante do Cobrir) e os açucarados nunca são substitutos.
    if (CAFE_OU_CHA.test(a.descricao.trim()) || a.categoria === ACUCARADOS) continue
    if (!baseUltraprocessada && ehUltraprocessado(a)) continue
    if (baseSimples && ehPratoComposto(a)) continue
    const porCem = nutrientes.map((k) => a.nutrientes[k])
    if (porCem.some((v) => v === null || !(v > 0))) continue
    const ideal = gramasIdeais(
      porCem.map((v) => (v ?? 0) / 100),
      alvos,
    )
    if (ideal.ajuste !== null && ideal.ajuste > MAXIMO_DE_AJUSTE) continue
    const porcao = porcaoDe(a, ideal.gramas)
    if (!porcao || !equivalente(a, porcao.gramas)) continue
    // D-1107: a restrição tira o candidato; conta para a mensagem só quem serviria (como no Cobrir, revisão N6).
    if (casaRestricao(a, restricoes)) {
      restricaoTirou = true
      continue
    }
    const diferencas = nutrientes.map((chave, i): DiferencaNaPorcao => {
      const valor = ((a.nutrientes[chave] ?? 0) * porcao.gramas) / 100 - (alvos[i] ?? 0)
      return { chave, valor, ...fraseDaDiferenca(chave, valor) }
    })
    const proximidade = diferencas.reduce((s, d, i) => s + Math.abs(d.valor) / (alvos[i] ?? 1), 0)
    candidatos.push({ candidato: { alimento: a, ...porcao, diferencas, proximidade, ajuste: ideal.ajuste }, naoGosta: ehNaoGosta(a, restricoes) })
  }

  const melhor = candidatos.reduce((m, o) => Math.min(m, o.candidato.proximidade), Number.POSITIVE_INFINITY)
  const ordenados = umDeCadaAlimento(base, candidatos.sort(compararCandidatos(melhor)))
    .slice(0, opcoes.limite ?? LIMITE_DA_BUSCA)
    .map((o) => o.candidato)
  return { tipo: 'lista', candidatos: ordenados, restricaoTirou }
}

// ---------- Comparar alimentos (D-1112) ----------

/** As linhas fixas do Comparar; os escolhidos de fora entram depois. */
const LINHAS_DO_COMPARAR: readonly ChaveNutrienteAlimento[] = [
  'energia_kcal',
  'carboidrato_g',
  'proteina_g',
  'lipideos_g',
  'fibra_g',
  'calcio_mg',
  'ferro_mg',
  'magnesio_mg',
  'potassio_mg',
  'sodio_mg',
  'vitamina_c_mg',
]

export const NAO_ANALISADO = 'não analisado'

export interface LinhaDaComparacao {
  readonly chave: ChaveNutrienteAlimento
  readonly rotulo: string
  readonly escolhido: boolean
  /** "42,1 g" ou "não analisado". */
  readonly original: string
  readonly substituto: string
  /** "+0,3 g", "−12 kcal", "igual" ou "—" quando falta dado. */
  readonly diferenca: string
  readonly semDado: { readonly original: boolean; readonly substituto: boolean }
}

/** CA-2117: os dois alimentos nas porções, nutriente por nutriente. */
export function compararNaPorcao(
  original: { readonly alimento: Alimento; readonly gramas: number },
  substituto: { readonly alimento: Alimento; readonly gramas: number },
  escolhidos: readonly ChaveNutrienteAlimento[],
): readonly LinhaDaComparacao[] {
  const chaves = [...LINHAS_DO_COMPARAR, ...escolhidos.filter((k) => !LINHAS_DO_COMPARAR.includes(k))]
  const naPorcao = (a: Alimento, gramas: number, k: ChaveNutrienteAlimento): number | null => {
    const v = a.nutrientes[k]
    return v === null ? null : (v * gramas) / 100
  }
  return chaves.map((chave) => {
    const a = naPorcao(original.alimento, original.gramas, chave)
    const b = naPorcao(substituto.alimento, substituto.gramas, chave)
    const texto = (v: number | null) => (v === null ? NAO_ANALISADO : quantidade(chave, v))
    let diferenca = '—'
    if (a !== null && b !== null) {
      const d = b - a
      diferenca = arredondar(d, casasDe(chave, d)) === 0 ? 'igual' : `${d > 0 ? '+' : '−'}${quantidade(chave, d)}`
    }
    return {
      chave,
      rotulo: infoDoNutriente(chave).rotulo,
      escolhido: escolhidos.includes(chave),
      original: texto(a),
      substituto: texto(b),
      diferenca,
      semDado: { original: a === null, substituto: b === null },
    }
  })
}
