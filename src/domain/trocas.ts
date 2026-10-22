// Lista de trocas: o paciente troca sozinho, dentro do grupo, sem ligar para a nutricionista.
import { MAXIMO_DE_PEDACOS, MEDIDAS_DE_CONTAR, medidaCaseiraParaPaciente, medidaEquivalente, type MedidaEquivalente } from './busca.ts'
import { ehDeUsoComum, ehPratoComposto, ehPrescritivel, ehProcessado, ehSegundaEscolha, regraQueExclui } from './prescritivel.ts'
import { posicaoNoConsumo } from './consumoPof.ts'
import { casaRestricao, comoRestricoes, type RestricoesDoPaciente } from './restricoes.ts'
import type { Alimento, BuscarAlimento, Plano } from './tipos.ts'
import { FIGADO } from './vitaminaA.ts'

export interface Troca {
  readonly alimentoId: number
  readonly descricao: string
  readonly gramas: number
  readonly medida: MedidaEquivalente | null
}

export interface GrupoDeTrocas {
  /** O alimento do plano que pode ser trocado. */
  readonly alimentoId: number
  readonly descricao: string
  readonly gramas: number
  readonly medida: MedidaEquivalente | null
  readonly categoria: string
  readonly trocas: readonly Troca[]
}

export interface OpcoesTrocas {
  /** Quantas trocas por alimento; o papel não aguenta mais do que três. */
  readonly porAlimento?: number
  /** Restrições do paciente, uma por linha ou já em lista. */
  readonly restricoes?: RestricoesDoPaciente | readonly string[]
  /** A lista inteira, para procurar os pares do mesmo grupo. */
  readonly alimentos: readonly Alimento[]
}

const kcalPorCem = (a: Alimento): number | null => {
  const v = a.nutrientes.energia_kcal
  return v === null || v <= 0 ? null : v
}

/**
 * A categoria da TACO é grossa: "Cereais e derivados" junta arroz e biscoito recheado.
 * Numa folha entregue ao paciente, isso é conselho ruim, então esses saem da lista.
 * O que é prescritível decide a regra comum (prescritivel.ts); esta lista diz só o que não é troca justa.
 */
const NAO_EQUIVALE =
  /(^|[\s,])(biscoito|bolo|torta|chocolate|bombom|brigadeiro|doce|docinho|goiabada|geleia|sorvete|picol(é|e)|pudim|mousse|refrigerante|suco em p(ó|o)|achocolatado|salgadinho|pizza|hamb(ú|u)rguer|nuggets|empanado|salsicha|lingui(ç|c)a|mortadela|salame|presunto|bacon|toucinho|maionese|catchup|ketchup|mostarda|leite condensado|creme de leite|a(ç|c)(ú|u)car)/i

const ehTrocaRazoavel = (a: Alimento): boolean => !NAO_EQUIVALE.test(a.descricao)

type Macro = 'proteina_g' | 'carboidrato_g' | 'lipideos_g'
const KCAL_POR_GRAMA: Readonly<Record<Macro, number>> = { proteina_g: 4, carboidrato_g: 4, lipideos_g: 9 }

/** Qual macronutriente carrega a energia do alimento; `null` quando a tabela não sabe. */
function macroDominante(a: Alimento): Macro | null {
  const energias = (Object.keys(KCAL_POR_GRAMA) as Macro[]).map((m) => ({ m, kcal: (a.nutrientes[m] ?? 0) * KCAL_POR_GRAMA[m] }))
  const maior = energias.reduce((x, y) => (y.kcal > x.kcal ? y : x))
  return maior.kcal <= 0 ? null : maior.m
}

/** Ovo inteiro só troca por ovo inteiro: duas gemas não equivalem a um ovo (spec sugestoes-com-criterio, D-194). */
function formaDoOvo(a: Alimento): 'gema' | 'clara' | 'inteiro' | null {
  if (a.categoria !== 'Ovos e derivados') return null
  if (/(^|[\s,])gema($|[\s,])/i.test(a.descricao)) return 'gema'
  if (/(^|[\s,])clara($|[\s,])/i.test(a.descricao)) return 'clara'
  return 'inteiro'
}

const ehCru = (a: Alimento): boolean => a.preparo === 'cru' || /(^|[\s,])cru(a|s|as)?($|[\s,])/i.test(a.descricao)

/**
 * A TACO põe pão de queijo, farinha de mandioca, farofa, nhoque, fécula e polvilho entre as verduras. Para a troca,
 * eles não são verdura: couve refogada por pão de queijo não é troca (spec sugestoes-com-criterio, CA-671).
 */
const NAO_E_VERDURA = /^(Pão|Farinha|Mandioca, farofa|Nhoque|Fécula|Polvilho|Biscoito)/i
const ehVerdura = (a: Alimento): boolean => a.categoria.startsWith('Verduras') && !NAO_E_VERDURA.test(a.descricao.trim())

/** Verdura cozida troca só por verdura cozida: brócolis cozido por vagem crua não é troca de prato. */
const ehVerduraCozida = (a: Alimento): boolean => ehVerdura(a) && !ehCru(a)

const mesmaForma = (base: Alimento) => (a: Alimento): boolean =>
  formaDoOvo(a) === formaDoOvo(base) && ehVerdura(a) === ehVerdura(base) && (!ehVerduraCozida(base) || !ehCru(a))

const partesDoNome = (descricao: string): string[] => descricao.split(',').map((p) => p.trim().toLowerCase())

/**
 * Quantas partes do nome, a contar do começo, a troca tem em comum com o original:
 * "Batata, inglesa, frita" e "Batata, inglesa, cozida" têm 2; "Batata, doce, cozida" tem 1 (revisão M1).
 */
function partesEmComum(original: string): (descricao: string) => number {
  const doOriginal = partesDoNome(original)
  return (descricao) => {
    const partes = partesDoNome(descricao)
    let iguais = 0
    while (iguais < partes.length && iguais < doOriginal.length && partes[iguais] === doOriginal[iguais]) iguais += 1
    return iguais
  }
}

/**
 * A troca é realista quando a medida caseira que a paciente lê não pede mais de 4 unidades ou pedaços (spec
 * conduta-da-nutricionista, D-295): "Pão francês → 7 torradas" não é troca. Sem medida caseira, vale o peso, e a troca
 * fica.
 */
function ehRealista(alimentoId: number, gramas: number): boolean {
  const medida = medidaCaseiraParaPaciente(alimentoId, gramas)
  return medida === null || !MEDIDAS_DE_CONTAR.has(medida.medida) || medida.quantidade <= MAXIMO_DE_PEDACOS
}

/**
 * D-421 (spec conduta-da-nutricionista, seção 6): o papel do alimento na refeição. A categoria da TACO junta arroz e pão
 * de forma, e separa arroz de batata; a troca segue o lugar no prato. Lista por nome: alimento novo fica sem papel até
 * alguém o incluir.
 */
type Papel = 'acompanhamento' | 'pao' | 'cereal-do-cafe'
const PAPEIS: readonly (readonly [Papel, RegExp])[] = [
  [
    'acompanhamento',
    /^(Arroz, (integral|tipo 1|tipo 2), (cozido|cru)|Macarrão, trigo, cru(, com ovos)?|Cuscuz, de milho, cozido( com sal)?|Polenta, pré-cozida|Batata, (inglesa|doce|baroa), cozida|Mandioca, cozida|Cará, cozido)$/,
  ],
  ['pao', /^(Pão, (aveia|de soja|glúten|milho|trigo)|Torrada, pão francês)/],
  ['cereal-do-cafe', /^(Aveia, flocos|Cereal matinal|Cereais, mistura para vitamina|Farinha, láctea)/],
]
const papelDe = (a: Alimento): Papel | null => PAPEIS.find(([, re]) => re.test(a.descricao.trim()))?.[0] ?? null

/**
 * No acompanhamento, pronto troca por pronto e cru por cru. O cru (arroz e macarrão pelo peso cru) é forma de
 * ingrediente e nunca é troca (CA-658): o arroz cru fica sem troca (CB-394).
 */
const mesmoEstado = (base: Alimento, a: Alimento): boolean => ehCru(base) === ehCru(a)

/** Com papel, o mesmo papel (de qualquer categoria); sem papel, a mesma categoria e também sem papel. */
function noMesmoPapel(base: Alimento): (a: Alimento) => boolean {
  const papel = papelDe(base)
  if (papel === null) return (a) => a.categoria === base.categoria && papelDe(a) === null && mesmaForma(base)(a)
  return (a) => papelDe(a) === papel && (papel !== 'acompanhamento' || mesmoEstado(base, a))
}

const FRUTAS = 'Frutas e derivados'
/** D-422: a troca de fruta é em peça que o paciente conta (a peça da fruta segue a D-423 de `busca.ts`). */
const PECAS_DE_FRUTA: ReadonlySet<string> = new Set(['unidade', 'unidade pequena', 'fatia', 'pedaço'])

/** "Arroz, tipo 1, cozido" → "arroz": o que vem antes da primeira vírgula. */
const nomeBase = (descricao: string): string => (descricao.split(',')[0] ?? descricao).trim().toLowerCase()

/** Todo pão começa por "Pão,": o que distingue o pão é a parte seguinte ("Pão, milho", "Pão, trigo"). */
const nomeDaVariedade = (a: Alimento): string =>
  papelDe(a) === 'pao' ? partesDoNome(a.descricao).slice(0, 2).join(', ') : nomeBase(a.descricao)

/**
 * Trocar arroz tipo 1 por arroz tipo 2 não é troca. Deixa passar uma variação do
 * mesmo alimento (arroz branco por integral, que muda de verdade) e corta o resto.
 */
function variedade(baseDoOriginal: string) {
  const vistos = new Map<string, number>()
  return ({ a }: { readonly a: Alimento }): boolean => {
    const nome = nomeDaVariedade(a)
    const limite = nome === baseDoOriginal ? 1 : 2
    const quantos = vistos.get(nome) ?? 0
    if (quantos >= limite) return false
    vistos.set(nome, quantos + 1)
    return true
  }
}

/**
 * Trocas equivalentes em energia, dentro da mesma categoria da tabela.
 * Alimento sem energia na tabela fica de fora: não dá para dizer o que equivale.
 * Só alimento prescritível é oferecido; item fora da rotina posto à mão troca por um prescritível (ovo frito
 * por ovo cozido), e bebida alcoólica não ganha troca (spec sugestoes-com-criterio, D-194).
 */
export function trocasDoAlimento(
  original: { readonly alimentoId: number; readonly gramas: number },
  opcoes: OpcoesTrocas,
): readonly Troca[] {
  const limite = opcoes.porAlimento ?? 3
  const restricoes = comoRestricoes(opcoes.restricoes)
  const base = opcoes.alimentos.find((a) => a.id === original.alimentoId)
  const kcalBase = base ? kcalPorCem(base) : null
  if (!base || kcalBase === null || original.gramas <= 0) return []
  const regraDaBase = regraQueExclui(base)
  if (regraDaBase?.nivel === 'nunca') return []
  // Item fora da rotina posto à mão: o melhor conselho é o mesmo alimento em outro preparo (batata frita → batata cozida).
  const parecidoComABase = regraDaBase?.nivel === 'fora-da-rotina' ? partesEmComum(base.descricao) : () => 0
  // Alimento simples nunca troca por prato composto (spec conduta-da-nutricionista, D-294).
  const baseSimples = !ehPratoComposto(base)

  // D-422: fruta troca por outra fruta (nunca pela mesma de outra variedade), em peça que o paciente conta.
  const fruta = base.categoria === FRUTAS
  const papel = papelDe(base)
  const candidatas = opcoes.alimentos
    // D-473 (spec sugestoes-com-criterio, correção C): o fígado nunca é troca; a porção de uma carne em fígado passa
    // muito do limite de vitamina A, e o paciente troca sozinho.
    .filter((a) => a.id !== base.id && ehPrescritivel(a) && ehTrocaRazoavel(a) && !FIGADO.test(a.descricao))
    // D-421: no papel do alimento na refeição; sem papel, na categoria (e na forma: ovo, verdura cozida).
    .filter(noMesmoPapel(base))
    .filter((a) => !fruta || nomeBase(a.descricao) !== nomeBase(base.descricao))
    // Trocar arroz por azeite tem a mesma energia e não é troca: o macro que sustenta precisa ser o mesmo.
    .filter((a) => macroDominante(a) === macroDominante(base))
    .filter((a) => !casaRestricao(a, restricoes))
    .filter((a) => !baseSimples || !ehPratoComposto(a))
    .map((a) => ({ a, kcal: kcalPorCem(a) }))
    .filter((x): x is { a: Alimento; kcal: number } => x.kcal !== null)
    .map(({ a, kcal }) => {
      const gramas = Math.round((kcalBase * original.gramas) / kcal)
      return { a, gramas }
    })
    // Porção que ninguém come na vida real não ajuda o paciente, nem 7 torradas no lugar de um pão (D-295).
    .filter(({ a, gramas }) => gramas >= 5 && gramas <= 600 && ehRealista(a.id, gramas))
    .filter(({ a, gramas }) => !fruta || PECAS_DE_FRUTA.has(medidaCaseiraParaPaciente(a.id, gramas)?.medida ?? ''))

  // In natura antes de processado: com uma troca não processada à mão, as processadas saem (D-296).
  const semProcessadas = !ehProcessado(base) && candidatas.some(({ a }) => !ehProcessado(a))
  return candidatas
    .filter(({ a }) => !semProcessadas || !ehProcessado(a))
    .sort((x, y) => {
      const mesmoAlimento = parecidoComABase(y.a.descricao) - parecidoComABase(x.a.descricao)
      if (mesmoAlimento !== 0) return mesmoAlimento
      // Preparo simples antes de prato composto, e in natura antes de processado (D-294, D-296).
      const simples = Number(ehPratoComposto(x.a)) - Number(ehPratoComposto(y.a))
      if (simples !== 0) return simples
      const natural = Number(ehProcessado(x.a)) - Number(ehProcessado(y.a))
      if (natural !== 0) return natural
      // Corte magro e ave sem pele antes de corte gordo e ave com pele, como no cobrir (CA-679), e o que voltou pela
      // conduta da parceira depois do resto (D-293).
      const primeira = Number(ehSegundaEscolha(x.a)) - Number(ehSegundaEscolha(y.a))
      if (primeira !== 0) return primeira
      const comum = Number(ehDeUsoComum(y.a)) - Number(ehDeUsoComum(x.a))
      if (comum !== 0) return comum
      // D-421 e D-422: no papel e na fruta, o mais consumido no Brasil antes (POF 2017-2018): banana por maçã, não por pinha.
      if (papel !== null || fruta) {
        const consumo = Math.min(posicaoNoConsumo(x.a.id), 1e6) - Math.min(posicaoNoConsumo(y.a.id), 1e6)
        if (consumo !== 0) return consumo
      }
      // Depois do uso comum, quem tem medida caseira ganha: é o que o paciente entende.
      const medida = Number(medidaEquivalente(y.a.id, y.gramas) !== null) - Number(medidaEquivalente(x.a.id, x.gramas) !== null)
      if (medida !== 0) return medida
      // Porção parecida com a original faz a troca parecer natural no prato.
      const perto = Math.abs(x.gramas - original.gramas) - Math.abs(y.gramas - original.gramas)
      if (perto !== 0) return perto
      return x.a.descricao.localeCompare(y.a.descricao, 'pt-BR')
    })
    .filter(variedade(nomeDaVariedade(base)))
    .slice(0, limite)
    .map(({ a, gramas }) => {
      // D-434 (spec alimentos-e-gramaturas, correção A): a troca é uma sugestão de equivalência; os gramas viram os da
      // medida que o paciente lê ("1 copo americano (150 ml)", não "(138 ml)"), a até 15% da energia equivalente.
      const medida = medidaCaseiraParaPaciente(a.id, gramas)
      return { alimentoId: a.id, descricao: a.descricao, gramas: medida ? medida.gramasEquivalentes : gramas, medida }
    })
}

/**
 * Uma entrada por alimento distinto usado na opção principal do plano.
 * Repetido no dia (arroz no almoço e no jantar) aparece uma vez só, na maior porção.
 */
export function trocasDoPlano(plano: Plano, buscar: BuscarAlimento, opcoes: OpcoesTrocas): readonly GrupoDeTrocas[] {
  const maiorPorcao = new Map<number, number>()
  for (const refeicao of plano.refeicoes) {
    for (const item of refeicao.opcoes.principal) {
      maiorPorcao.set(item.alimentoId, Math.max(maiorPorcao.get(item.alimentoId) ?? 0, item.gramas))
    }
  }

  const grupos: GrupoDeTrocas[] = []
  for (const [alimentoId, gramas] of maiorPorcao) {
    const alimento = buscar(alimentoId)
    if (!alimento) continue
    const trocas = trocasDoAlimento({ alimentoId, gramas }, opcoes)
    if (trocas.length === 0) continue
    grupos.push({
      alimentoId,
      descricao: alimento.descricao,
      gramas,
      medida: medidaCaseiraParaPaciente(alimentoId, gramas),
      categoria: alimento.categoria,
      trocas,
    })
  }
  return grupos.sort((a, b) => a.categoria.localeCompare(b.categoria, 'pt-BR') || a.descricao.localeCompare(b.descricao, 'pt-BR'))
}
