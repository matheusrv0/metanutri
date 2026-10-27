// O que o MetaNutri pode propor sozinho de "Meus alimentos" (spec alimentos-e-gramaturas, D-386 e D-493).
//
// A regra da base (`prescritivel.ts`) lê o nome no formato da TACO ("Bolo,", "Biscoito, doce"); o nome do alimento
// próprio é livre, e o cadastro traz o que a TACO não tem (gordura trans, açúcares). Por isso, aqui os campos
// declarados e o grupo vêm antes, e o nome livre é a última linha de defesa. As regras da parceira valem igual à base:
// nunca álcool, ultraprocessado nem gordura trans nas sugestões.
import { regraQueExclui } from './prescritivel.ts'
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
    'biscoito|biscoitos|bolacha|bolachas|rosquinha|rosquinhas|rosca|roscas|wafer|wafers|cookie|cookies|salgadinho|salgadinhos|chips|nugget|nuggets|empanado|empanados|macarrao instantaneo|miojo|lamen|sopa instantanea|caldo em cubo|caldo em po|tempero pronto|cereal matinal|cereais matinais|barra de cereal|barra de cereais|barra de proteina|barrinha|peito de peru',
  ),
  noNome('recheado|recheada|recheados|recheadas|instantaneo|instantanea|sabor'),
]

const casaAlguma = (regras: readonly RegExp[], nome: string): boolean => regras.some((r) => r.test(nome))

/** "7,5", "15": o número como a tela escreve. */
const numeroNaTela = (n: number): string => String(n).replace('.', ',')

/**
 * O limite de açúcar do alimento, ou `null` quando o açúcar é dele: a fruta (grupo Frutas e derivados, menos a
 * preparação) não passa pelo limite. A bebida e o leite e derivados passam pelo de líquido: a lactose fica abaixo dele.
 */
function limiteDeAcucar(a: Alimento): number | null {
  if (a.categoria === FRUTAS && a.proprio?.tipo !== 'preparacao') return null
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
  const limite = limiteDeAcucar(a)
  if (limite !== null && typeof acucares === 'number' && acucares > limite) {
    return { id: 'acucar', nivel: 'fora-da-rotina', motivo: `mais de ${numeroNaTela(limite)} g de açúcares em 100 ${a.unidade ?? 'g'}` }
  }
  if (casaAlguma(BEBIDA_ADOCADA, nome)) return { id: 'bebida-adocada', nivel: 'fora-da-rotina', motivo: 'bebida adoçada' }
  // O ultraprocessado antes do doce: o biscoito recheado de chocolate é biscoito.
  if (casaAlguma(ULTRAPROCESSADO, nome)) return { id: 'ultraprocessado', nivel: 'fora-da-rotina', motivo: 'ultraprocessado' }
  if (casaAlguma(DOCE, nome)) return { id: 'doce', nivel: 'fora-da-rotina', motivo: 'doce' }
  return null
}

const comMinuscula = (s: string): string => s.charAt(0).toLowerCase() + s.slice(1)

/**
 * Por que o alimento próprio não entra no Cobrir nem nas trocas, mesmo com a chave ligada (D-386 e D-493): o grupo
 * Suplementos, a regra da base que é "nunca" ou "fora da rotina" e a regra do próprio, a mais grave primeiro. `null`
 * quando pode entrar. A forma de ingrediente (pó, farinha, cru) não conta: ela segue a chave "Incluir ingredientes" do
 * Cobrir, como na base. A energia incoerente tem o aviso dela no formulário.
 */
export function motivoParaNaoSugerir(a: Alimento): string | null {
  if (a.categoria === SUPLEMENTOS) return 'suplemento'
  const daBase = regraQueExclui(a)
  const base = daBase && daBase.nivel !== 'ingrediente' ? { nivel: daBase.nivel, motivo: comMinuscula(daBase.titulo) } : null
  const proprio = regraDoProprio(a)
  if (base?.nivel === 'nunca') return base.motivo
  if (proprio?.nivel === 'nunca') return proprio.motivo
  return base?.motivo ?? proprio?.motivo ?? null
}
