// O que o MetaNutri pode propor sozinho de "Meus alimentos" (spec alimentos-e-gramaturas, D-386 e D-493).
//
// A regra da base (`prescritivel.ts`) lê o nome no formato da TACO ("Bolo,", "Biscoito, doce"); o nome do alimento
// próprio é livre, e o cadastro traz o que a TACO não tem (gordura trans, açúcares). Por isso, aqui os campos
// declarados e o grupo vêm antes, e o nome livre é a última linha de defesa. As regras da parceira valem igual à base:
// nunca álcool, ultraprocessado nem gordura trans nas sugestões.
import { REGRAS_PRESCRICAO, regraQueExclui, type NivelPrescricao, type OpcoesPrescricao, type RegraPrescricao } from './prescritivel.ts'
import { TERMOS_POR_RESTRICAO } from './restricoesDaBase.ts'
import type { Alimento } from './tipos.ts'

export interface RegraDoProprio {
  readonly id: 'gordura-trans' | 'alcool' | 'industrializado' | 'acucar' | 'bebida-adocada' | 'doce' | 'ultraprocessado'
  /** "nunca" ou "fora da rotina": as duas tiram o alimento de qualquer sugestão, com ou sem a chave do Cobrir. */
  readonly nivel: 'nunca' | 'fora-da-rotina'
  /** Como o formulário diz, depois de "Não entra no Cobrir nem nas trocas: ". */
  readonly motivo: string
}

/**
 * Os limites de "alto em açúcar adicionado" da rotulagem frontal (15 g em 100 g no sólido, 7,5 g em 100 ml no
 * líquido), aplicados ao açúcar total, que é o que o formulário pede (D-493).
 */
export const ACUCAR_SOLIDO_G = 15
export const ACUCAR_LIQUIDO_G = 7.5

const INDUSTRIALIZADOS = 'Outros alimentos industrializados'
const FRUTAS = 'Frutas e derivados'
const LEITE = 'Leite e derivados'
const SUPLEMENTOS = 'Suplementos'

/** Sem acento, em minúscula, com os espaços normalizados; o apóstrofo do celular vira o comum. */
const normalizar = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

/** No começo do nome, a palavra inteira. */
const noComeco = (termos: string) => new RegExp(`^(${termos})($|[\\s,(])`)
/** Em qualquer lugar do nome, a palavra inteira. */
const noNome = (termos: string) => new RegExp(`(^|[\\s,(])(${termos})($|[\\s,)])`)

const ALCOOL = noNome('chope|chopp|cerveja|espumante|sake|saque|gim|gin|rum|tequila|conhaque|uisque|whisky|sidra|hidromel|aguardente|cachaca|pinga|vinho|vodca|vodka|licor|caipirinha|caipiroska')

const BEBIDA_ADOCADA = [
  noComeco('nectar|refresco|refrigerante|suco em po|bebida lactea|bebida isotonica|isotonico|energetico|bebida energetica|cha gelado|cha pronto|leite fermentado|caldo de cana|groselha|limonada|xarope'),
  noNome('adocad[oa]s?|com acucar|acucarad[oa]s?'),
]

const DOCE = [
  noComeco(
    'bolo|bolos|torta doce|pudim|pudins|brigadeiro|brigadeiros|beijinho|doce|doces|geleia|sorvete|sorvetes|picole|mousse|pave|goiabada|marmelada|bananada|cocada|rapadura|bombom|bombons|achocolatado|bala|balas|pirulito|quindim|suspiro|cuca|sonho|churros|donut|donuts|panetone|chocotone|brownie|cupcake|cheesecake|leite condensado|creme de avela',
  ),
  noNome('chocolate|em calda|cristalizad[oa]s?|caramelizad[oa]s?'),
]

const ULTRAPROCESSADO = [
  noComeco(
    'biscoito|biscoitos|bolacha|bolachas|rosquinha|rosquinhas|rosca|roscas|wafer|wafers|cookie|cookies|salgadinho|salgadinhos|nugget|nuggets|empanado|empanados|macarrao instantaneo|miojo|lamen|sopa instantanea|caldo em cubo|caldo em po|tempero pronto|cereal matinal|cereais matinais|barra de cereal|barra de cereais|barra de proteina|barrinha|peito de peru',
  ),
  // D-507: "Chips de banana" e "Banana chips" são o mesmo produto frito.
  noNome('chips|recheado|recheada|recheados|recheadas|instantaneo|instantanea|sabor'),
]

const casaAlguma = (regras: readonly RegExp[], nome: string): boolean => regras.some((r) => r.test(nome))

/**
 * O embutido vegetal (D-510): o nome que a regra "Embutido, carne processada ou curada" da base pega ("Hambúrguer",
 * "Salsicha", "Linguiça") e que traz uma das exceções vegetais da restrição vegetariana (D-492: "hambúrguer vegetal",
 * "hambúrguer de grão", "salsicha vegetal", "vegano"…). A restrição e a sugestão leem a mesma lista.
 */
const EXCECOES_VEGETAIS = TERMOS_POR_RESTRICAO.vegetariano.excecoes
const REGRA_DO_EMBUTIDO = REGRAS_PRESCRICAO.find((r) => r.id === 'embutido')
const ehEmbutidoVegetal = (a: Alimento, nome: string): boolean =>
  a.proprio !== undefined && EXCECOES_VEGETAIS.some((e) => nome.includes(e)) && REGRA_DO_EMBUTIDO?.casa(a) === true

/**
 * Leite e iogurte sem adição (D-509): o açúcar deles é a lactose do próprio leite (38 g em 100 g do leite em pó integral,
 * uns 5 g no leite reconstituído). O total em 100 g não distingue a lactose do açúcar de adição; o nome distingue.
 */
const LEITE_OU_IOGURTE = noComeco('leite|iogurte')
const SEM_ADICAO = noNome('integral|desnatad[oa]|semidesnatad[oa]|semi-desnatad[oa]|natural|po')
const COM_ADICAO = [
  noNome('sabor|saborizad[oa]|achocolatad[oa]|chocolate|cacau|adocad[oa]|acucarad[oa]|acucar|condensad[oa]|fermentad[oa]|mel|calda|com'),
  // "de" só para o animal: "Leite de vaca", "Leite em pó de cabra"; "Iogurte de morango" tem a fruta e o açúcar dela.
  /(^|\s)de (?!(vaca|cabra|bufala|ovelha)($|[\s,)]))/,
]
const ehLeiteSemAdicao = (nome: string): boolean => LEITE_OU_IOGURTE.test(nome) && SEM_ADICAO.test(nome) && !casaAlguma(COM_ADICAO, nome)

/** "7,5", "15": o número como a tela escreve. */
const numeroNaTela = (n: number): string => String(n).replace('.', ',')

/**
 * O limite de açúcar do alimento, ou `null` quando o açúcar é dele: só a fruta do tipo Alimento (D-507) e o leite e o
 * iogurte sem adição (D-509) não passam pelo limite; a fruta de rótulo é produto industrial (açaí com guaraná) e a
 * preparação leva o que a receita põe. A bebida e o leite e derivados passam pelo de líquido: a lactose do leite líquido
 * fica abaixo dele.
 */
function limiteDeAcucar(a: Alimento, nome: string): number | null {
  if (a.categoria === FRUTAS && a.proprio?.tipo === 'alimento') return null
  if (ehLeiteSemAdicao(nome)) return null
  const liquido = a.unidade === 'ml' || a.categoria.startsWith('Bebidas') || a.categoria === LEITE
  return liquido ? ACUCAR_LIQUIDO_G : ACUCAR_SOLIDO_G
}

/** A regra do alimento próprio que o tira das sugestões (D-493), a mais grave; `null` quando nenhuma pega. */
export function regraDoProprio(a: Alimento): RegraDoProprio | null {
  const nome = normalizar(a.descricao)
  const trans = a.nutrientes.gordura_trans_g
  if (typeof trans === 'number' && trans > 0) return { id: 'gordura-trans', nivel: 'nunca', motivo: 'gordura trans declarada' }
  if (ALCOOL.test(nome)) return { id: 'alcool', nivel: 'nunca', motivo: 'bebida alcoólica' }
  if (a.categoria === INDUSTRIALIZADOS) return { id: 'industrializado', nivel: 'fora-da-rotina', motivo: `grupo ${INDUSTRIALIZADOS}` }
  const acucares = a.nutrientes.acucares_g
  const limite = limiteDeAcucar(a, nome)
  if (limite !== null && typeof acucares === 'number' && acucares > limite) {
    return { id: 'acucar', nivel: 'fora-da-rotina', motivo: `mais de ${numeroNaTela(limite)} g de açúcares em 100 ${a.unidade ?? 'g'}` }
  }
  if (casaAlguma(BEBIDA_ADOCADA, nome)) return { id: 'bebida-adocada', nivel: 'fora-da-rotina', motivo: 'bebida adoçada' }
  // O ultraprocessado antes do doce: o biscoito recheado de chocolate é biscoito. O hambúrguer vegetal de rótulo é
  // produto industrial (D-510).
  if (casaAlguma(ULTRAPROCESSADO, nome) || (a.proprio?.tipo === 'rotulo' && ehEmbutidoVegetal(a, nome))) {
    return { id: 'ultraprocessado', nivel: 'fora-da-rotina', motivo: 'ultraprocessado' }
  }
  if (casaAlguma(DOCE, nome)) return { id: 'doce', nivel: 'fora-da-rotina', motivo: 'doce' }
  return null
}

const comMinuscula = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1)

const GRAVIDADE: Readonly<Record<NivelPrescricao, number>> = { nunca: 0, 'fora-da-rotina': 1, ingrediente: 2 }

/**
 * A regra da base como vale para o alimento: a de `prescritivel.ts`, menos a do embutido no embutido vegetal do
 * alimento próprio (D-510), em que as outras regras da base continuam valendo. Na base, igual a `regraQueExclui`.
 */
export function regraDaBaseParaSugerir(a: Alimento): RegraPrescricao | null {
  const regra = regraQueExclui(a)
  if (regra === null || !ehEmbutidoVegetal(a, normalizar(a.descricao))) return regra
  const limpo: Alimento = { ...a, descricao: a.descricao.trim().replace(/\s+/g, ' ') }
  let pior: RegraPrescricao | null = null
  for (const r of REGRAS_PRESCRICAO) {
    if (r.id === REGRA_DO_EMBUTIDO?.id || !r.casa(limpo)) continue
    if (pior === null || GRAVIDADE[r.nivel] < GRAVIDADE[pior.nivel]) pior = r
  }
  return pior
}

/** `ehPrescritivel` com a regra da base como vale para o alimento próprio (D-510); na base, igual. O Cobrir usa esta. */
export function ehPrescritivelParaSugerir(a: Alimento, opcoes: OpcoesPrescricao = {}): boolean {
  const regra = regraDaBaseParaSugerir(a)
  return regra === null || (regra.nivel === 'ingrediente' && opcoes.incluirIngredientes === true)
}

/**
 * Por que o alimento próprio não entra no Cobrir nem nas trocas, mesmo com a chave ligada (D-386 e D-493): o grupo
 * Suplementos, a regra da base que é "nunca" ou "fora da rotina" e a regra do próprio, a mais grave primeiro. `null`
 * quando pode entrar. A forma de ingrediente (pó, farinha, cru) não conta: ela segue a chave "Incluir ingredientes" do
 * Cobrir, como na base. A energia incoerente tem o aviso dela no formulário.
 */
export function motivoParaNaoSugerir(a: Alimento): string | null {
  if (a.categoria === SUPLEMENTOS) return 'suplemento'
  const daBase = regraDaBaseParaSugerir(a)
  const base = daBase && daBase.nivel !== 'ingrediente' ? { nivel: daBase.nivel, motivo: comMinuscula(daBase.titulo) } : null
  const proprio = regraDoProprio(a)
  if (base?.nivel === 'nunca') return base.motivo
  if (proprio?.nivel === 'nunca') return proprio.motivo
  return base?.motivo ?? proprio?.motivo ?? null
}
