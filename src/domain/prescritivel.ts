// O que o MetaNutri pode propor sozinho (spec sugestoes-com-criterio, D-190 a D-198).
//
// Vale para tudo que o sistema escolhe sem a nutricionista pedir: o cobrir e as trocas da folha do paciente.
// A escolha manual (busca, substituto, edição das listas) nunca passa por aqui: pela busca, qualquer alimento entra.
import type { Alimento } from './tipos.ts'

/**
 * `nunca`: não é proposto em modo nenhum.
 * `fora-da-rotina`: nutricionista não prescreve na rotina; não é proposto, nem com a chave do cobrir.
 * `ingrediente`: forma em que o alimento não se come; a chave "Incluir ingredientes e alimentos crus" libera.
 */
export type NivelPrescricao = 'nunca' | 'fora-da-rotina' | 'ingrediente'

type DadosDaRegra = Pick<Alimento, 'descricao' | 'categoria' | 'preparo'>

export interface RegraPrescricao {
  readonly id: string
  readonly nivel: NivelPrescricao
  /** O motivo, como aparece no Apêndice A da spec. */
  readonly titulo: string
  readonly casa: (alimento: DadosDaRegra) => boolean
}

/** Palavra inteira. Sem \b: em JavaScript ele não reconhece letra acentuada como parte da palavra. */
const palavra = (termos: string) => new RegExp(`(^|[\\s,])(${termos})($|[\\s,])`, 'i')

const ALCOOL = palavra('cerveja|aguardente|cacha(ç|c)a|vinho|vodca|u(í|i)sque|licor|caipirinha')

/** Nem como ingrediente alguém prescreve 200 g de shoyu (revisão I1). */
const SAL_E_FERMENTO = /^(Sal,|Shoyu|Tempero a base de sal|Fermento)/i

const BEBIDA_ADOCADA =
  /^(Refrigerante|Bebida isot(ô|o)nica|Bebida l(á|a)ctea|Cana, caldo|Leite, fermentado|Leite, de vaca, achocolatado|Capuccino)/i

const DOCE_PELO_NOME =
  /^(Biscoito, doce|Bolo,|Iogurte, sabor|Leite, condensado|Curau|Canjica, com leite|Pa(ç|c)oca|P(é|e)-de-moleque|Cereal matinal, milho, a(ç|c)(ú|u)car|Gelatina)/i
// "Batata, doce" e "Polvilho, doce" não são doce: por isso o nome inteiro, não a palavra solta.
// A calda vale com ou sem o "em": a TACO tem "Ameixa, calda, enlatada" (revisão C1).
const DOCE_NO_MEIO = /doce em (barra|pasta)|doce, casc(ã|a)o|(^|[\s,])(em )?calda($|[\s,])|xarope|petit suisse/i

const GORDURA = /^(Creme de leite|Maionese|Chantilly|Leite, de coco|Toucinho|Salada, de legumes, com maionese|Salpic(ã|a)o)/i

const EMBUTIDO = /^(Apresuntado|Mortadela|Presunto|Salame|Ling(ü|u)i(ç|c)a|Salsicha|Hamb(ú|u)rguer|Bacon|Paio)/i
const CARNE_CURADA = /charque|Carne, bovina, seca/i
/** Pratos que levam linguiça, toucinho, paio, charque ou miúdos: o mesmo critério da feijoada (revisão I4). */
const PRATO_COM_EMBUTIDO =
  /^(Feijoada|Feij(ã|a)o tropeiro|Virado (à|a) paulista|Arroz carreteiro|Mani(ç|c)oba|Barreado|Bai(ã|a)o de dois|Dobradinha|Sarapatel|Buchada)/i

const FRITO = palavra('frit(o|a|os|as)')
const FRITURA_PELO_NOME = /(à|a) milanesa|empanad/i
const SALGADO_DE_FRITAR = /^(Acaraj(é|e)|Bolinho de arroz|Coxinha|Pastel|Croquete|Bife (à|a) cavalo)/i

// Pó e farinha fortificados entram aqui, não como ingrediente: apareciam como fonte de vitamina pelo
// enriquecimento, que é o motivo de o mingau infantil sair (revisão I2).
const ULTRAPROCESSADO =
  /^(Caldo de (carne|galinha)|Macarr(ã|a)o, instant(â|a)neo|Cereal matinal|Cereais, (mingau|mistura para vitamina)|Farinha, l(á|a)ctea|Empada|Biscoito, polvilho|Azeitona|Tremo(ç|c)o, em conserva|Mingau tradicional|Creme de milho)|enriquecid/i

const PO = /(^|[\s,])pó($|[\s,])|desidratad/i
const FARINHA = palavra('farinha|amido|fubá|fécula|polvilho')
const COM_FARINHA = palavra('com farinha')
/** Farinha que se come como está, com o feijão. */
const FARINHA_CONSUMIDA = 'Farinha, de mandioca, torrada'

const CRU = palavra('cru(a|s|as)?')
const CATEGORIAS_SO_COZIDAS = new Set([
  'Carnes e derivados',
  'Pescados e frutos do mar',
  'Ovos e derivados',
  'Leguminosas e derivados',
  'Cereais e derivados',
])
/**
 * Verduras e frutas que se comem cozidas (spec sugestoes-com-criterio, D-199a). As primeiras a base também traz
 * cozidas, e a mandioca crua é tóxica; inhame, vagem, taioba, fruta-pão, jiló, broto, caruru, quiabo e pequi só
 * existem crus, e a nutricionista põe pela busca. Das abóboras, só as que têm a versão cozida (cabotian e moranga):
 * a menina e a pescoço só existem cruas e ficam.
 */
const VERDURA_SO_COZIDA =
  /^(Batata, (inglesa|doce|baroa)|Mandioca|Car(á|a)|Ab(ó|o)bora, (cabotian|moranga)|Berinjela|Chuchu|P(ã|a)o, de queijo|Inhame|Vagem|Taioba|Fruta-p(ã|a)o|Jil(ó|o)|Feij(ã|a)o, broto|Caruru|Quiabo|Pequi),/i
/** Peixe "fresco" sem preparo no nome é peixe cru ("Dourada de água doce, fresca"). */
const PEIXE_FRESCO = /(^|[\s,])fresc[oa]$/i
const CRU_CONSUMIDO = /^Aveia,/

const ERVA_OU_TEMPERO = /^(Alho|Alfavaca|Manjeric(ã|a)o|Salsa|Coentro|Cebolinha|Alecrim|Or(é|e)gano|Hortel(ã|a)),/i
const MOLHO_OU_CONCENTRADO = /^Lim(ã|a)o, [^,]+, cru|^Tomate, (extrato|pur(ê|e)|molho)|^(Tucupi|Cux(á|a))|suco concentrado/i

/** Na ordem do Apêndice A. Quando mais de uma pega o alimento, vale a de nível mais grave. */
export const REGRAS_PRESCRICAO: readonly RegraPrescricao[] = [
  { id: 'alcool', nivel: 'nunca', titulo: 'Bebida alcoólica', casa: (a) => ALCOOL.test(a.descricao) },
  { id: 'sal-e-fermento', nivel: 'nunca', titulo: 'Sal, shoyu, tempero pronto ou fermento', casa: (a) => SAL_E_FERMENTO.test(a.descricao) },
  {
    id: 'bebida-adocada',
    nivel: 'fora-da-rotina',
    titulo: 'Refrigerante, isotônico ou bebida adoçada',
    casa: (a) => BEBIDA_ADOCADA.test(a.descricao),
  },
  {
    id: 'doce',
    nivel: 'fora-da-rotina',
    titulo: 'Doce, açúcar ou fruta em calda',
    casa: (a) => a.categoria === 'Produtos açucarados' || DOCE_PELO_NOME.test(a.descricao) || DOCE_NO_MEIO.test(a.descricao),
  },
  {
    id: 'gordura',
    nivel: 'fora-da-rotina',
    titulo: 'Óleo ou gordura de adição',
    casa: (a) => a.categoria === 'Gorduras e óleos' || GORDURA.test(a.descricao),
  },
  {
    id: 'embutido',
    nivel: 'fora-da-rotina',
    titulo: 'Embutido, carne processada ou curada',
    casa: (a) =>
      EMBUTIDO.test(a.descricao) || CARNE_CURADA.test(a.descricao) || (a.categoria === 'Carnes e derivados' && /salgad[oa]/i.test(a.descricao)),
  },
  {
    id: 'prato-com-embutido',
    nivel: 'fora-da-rotina',
    titulo: 'Prato com embutido, toucinho, carne curada ou miúdos',
    casa: (a) => PRATO_COM_EMBUTIDO.test(a.descricao),
  },
  {
    id: 'fritura',
    nivel: 'fora-da-rotina',
    titulo: 'Fritura ou salgado frito',
    casa: (a) => a.preparo === 'frito' || FRITO.test(a.descricao) || FRITURA_PELO_NOME.test(a.descricao) || SALGADO_DE_FRITAR.test(a.descricao),
  },
  {
    id: 'ultraprocessado',
    nivel: 'fora-da-rotina',
    titulo: 'Ultraprocessado, salgadinho ou petisco em conserva',
    casa: (a) => ULTRAPROCESSADO.test(a.descricao),
  },
  { id: 'miscelanea', nivel: 'ingrediente', titulo: 'Ingrediente da categoria Miscelâneas (café em pó)', casa: (a) => a.categoria === 'Miscelâneas' },
  { id: 'po', nivel: 'ingrediente', titulo: 'Produto em pó ou desidratado', casa: (a) => PO.test(a.descricao) },
  {
    id: 'farinha',
    nivel: 'ingrediente',
    titulo: 'Farinha, amido ou fécula de uso culinário',
    casa: (a) => FARINHA.test(a.descricao) && !COM_FARINHA.test(a.descricao) && a.descricao !== FARINHA_CONSUMIDA,
  },
  {
    id: 'cru',
    nivel: 'ingrediente',
    titulo: 'Versão crua de alimento que se come cozido',
    casa: (a) => {
      if (a.categoria === 'Pescados e frutos do mar' && PEIXE_FRESCO.test(a.descricao)) return true
      if (a.preparo !== 'cru' && !CRU.test(a.descricao)) return false
      if (CRU_CONSUMIDO.test(a.descricao)) return false
      return CATEGORIAS_SO_COZIDAS.has(a.categoria) || VERDURA_SO_COZIDA.test(a.descricao)
    },
  },
  {
    id: 'tempero',
    nivel: 'ingrediente',
    titulo: 'Tempero, molho ou concentrado',
    casa: (a) => ERVA_OU_TEMPERO.test(a.descricao) || MOLHO_OU_CONCENTRADO.test(a.descricao),
  },
]

const GRAVIDADE: Readonly<Record<NivelPrescricao, number>> = { nunca: 0, 'fora-da-rotina': 1, ingrediente: 2 }

/**
 * A regra de nível mais grave que tira o alimento das propostas; `null` quando ele é prescritível.
 * A TACO tem descrições com espaço nas pontas (" Mamão, doce em calda"): o nome é limpo antes de comparar.
 */
export function regraQueExclui(alimento: DadosDaRegra): RegraPrescricao | null {
  const limpo: DadosDaRegra = { ...alimento, descricao: alimento.descricao.trim().replace(/\s+/g, ' ') }
  let pior: RegraPrescricao | null = null
  for (const regra of REGRAS_PRESCRICAO) {
    if (!regra.casa(limpo)) continue
    if (pior === null || GRAVIDADE[regra.nivel] < GRAVIDADE[pior.nivel]) pior = regra
  }
  return pior
}

export interface OpcoesPrescricao {
  /** A chave do cobrir "Incluir ingredientes e alimentos crus": libera só o nível `ingrediente`. */
  readonly incluirIngredientes?: boolean
}

/** Verdadeiro quando o MetaNutri pode propor o alimento sozinho. */
export function ehPrescritivel(alimento: DadosDaRegra, opcoes: OpcoesPrescricao = {}): boolean {
  const regra = regraQueExclui(alimento)
  if (regra === null) return true
  return regra.nivel === 'ingrediente' && opcoes.incluirIngredientes === true
}

/**
 * Itens que a tabela traz mas quase ninguém põe no plano de rotina:
 * vísceras, miúdos, caça, frutos do mar de exceção, pratos regionais de véspera e
 * folhas, frutas e peixes que só uma região conhece (caruru, taioba, lambari, jurubeba).
 * O usuário pediu sugestões da linguagem popular: arroz, feijão, leite, ovo, banana.
 * Não somem da lista; só perdem a frente para o que é de uso comum.
 */
const POUCO_USUAL =
  /(^|[\s,])(sarapatel|buchada|dobradinha|mocot(ó|o)|f(í|i)gado|cora(ç|c)(ã|a)o|moela|rim|l(í|i)ngua|miolo(?! de alcatra)|tutano|bucho|paio|chispe|jacar(é|e)|javali|codorna|perdiz|marisco|ostra|siri|caranguejo|lagosta|caramujo|r(ã|a)|caruru|lambari|taioba|bertalha|serralha|jambu|jurubeba|jamel(ã|a)o|ora-pro-n(ó|o)bis|mistura para vitamina|petit suisse|sete barbas|manjeric(ã|a)o|salsa|coentro|cebolinha|alecrim|or(é|e)gano|hortel(ã|a)|gergelim|cux(á|a)|tacac(á|a)|mani(ç|c)oba|vatap(á|a))($|[\s,])/i

/** Verdadeiro quando o alimento é de consumo corriqueiro; usado só para ordenar. */
export function ehDeUsoComum(alimento: Pick<Alimento, 'descricao'>): boolean {
  return !POUCO_USUAL.test(alimento.descricao)
}
