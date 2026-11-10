// O grupo de substituição de um alimento: o "Só do mesmo grupo" da busca de substitutos (spec busca-substitutos, D-1108
// e seção 3). A categoria da TACO separa arroz de batata e junta arroz com biscoito; o grupo segue o papel no prato das
// trocas da folha (D-421) e, fora dele, o grupo da tabela.
import { ehCru, ehVerdura, ehVerduraCozida, formaDoOvo, papelDe } from './trocas.ts'
import type { Alimento } from './tipos.ts'

export interface GrupoDeSubstituicao {
  /** O papel no prato ("amido", "carne"…) ou, fora dos grupos, a categoria da tabela. */
  readonly id: string
  /** Como a tela diz o grupo: "Só do mesmo grupo: cereais, tubérculos e raízes". */
  readonly nome: string
}

const nomeLimpo = (a: Alimento): string => a.descricao.trim().replace(/\s+/g, ' ')

/**
 * Os cereais e tubérculos prontos que o papel "acompanhamento" das trocas não lista: os da base ampliada (macarrão
 * cozido, arroz parboilizado, quinoa, inhame, milho verde) e a batata assada. É a lista do grupo "Cereal e tubérculo
 * cozidos" do Cobrir; lasanha e nhoque ficam de fora: são pratos compostos.
 */
const CEREAL_OU_TUBERCULO = /^(Arroz|Macarrão|Polenta|Cuscuz|Batata|Mandioca|Cará|Inhame|Quinoa|Milho, verde|Trigo para quibe)/i
const TUBERCULO = /^(Batata|Mandioca|Cará|Inhame)/i
/**
 * D-1138: a farinha de mandioca, crua (a farinha d'água) ou torrada, se come sem cozinhar e está no grupo do arroz, do pão
 * e da mandioca da lista de equivalentes (Philippi et al., Rev. Nutr. 1999;12(1):65-80). A TACO a põe entre as verduras.
 */
const FARINHA_DE_MANDIOCA = /^Farinha, de mandioca, (crua|torrada)$/i
/** No grupo do amido, o cru que vai ao fogo; a farinha de mandioca já está pronta (D-1138). */
const cruNoPrato = (a: Alimento): boolean => ehCru(a) && !FARINHA_DE_MANDIOCA.test(nomeLimpo(a))
const ehAmido = (a: Alimento): boolean =>
  papelDe(a) === 'acompanhamento' ||
  FARINHA_DE_MANDIOCA.test(nomeLimpo(a)) ||
  (CEREAL_OU_TUBERCULO.test(nomeLimpo(a)) && (a.preparo === 'cozido' || (a.preparo === 'assado' && TUBERCULO.test(nomeLimpo(a)))))

/** Amendoim, paçoca e pé-de-moleque são leguminosa na tabela e oleaginosa no prato. */
const AMENDOIM = /^(Amendoim|Paçoca|Pé-de-moleque)/i

const FRUTAS = 'Frutas e derivados'
const SUCO_OU_POLPA = /(^|[\s,])(suco|polpa)($|[\s,])/i
/**
 * O suco e a polpa da fruta ("Laranja, pêra, suco", "Acerola, polpa, congelada"): não são fruta inteira (spec
 * busca-substitutos, D-1131). O Guia Alimentar para a População Brasileira (Ministério da Saúde, 2014) prefere a fruta
 * inteira ao suco, que perde a fibra.
 */
export const ehSucoOuPolpaDeFruta = (a: Alimento): boolean => a.categoria === FRUTAS && SUCO_OU_POLPA.test(a.descricao)
/** A fruta inteira: do grupo das frutas, sem ser suco nem polpa. */
export const ehFrutaInteira = (a: Alimento): boolean => a.categoria === FRUTAS && !ehSucoOuPolpaDeFruta(a)
/** O extrato de soja (a "bebida de soja") troca com o leite. */
const EXTRATO_DE_SOJA = /^Soja, extrato solúvel/i
const QUEIJO = /^Queijo,/i

const GRUPOS: readonly (readonly [GrupoDeSubstituicao, (a: Alimento) => boolean])[] = [
  [{ id: 'amido', nome: 'cereais, tubérculos e raízes' }, ehAmido],
  [{ id: 'pao', nome: 'pães e torradas' }, (a) => papelDe(a) === 'pao'],
  [{ id: 'cereal-do-cafe', nome: 'cereais do café' }, (a) => papelDe(a) === 'cereal-do-cafe'],
  [{ id: 'oleaginosa', nome: 'castanhas, sementes e amendoim' }, (a) => a.categoria === 'Nozes e sementes' || AMENDOIM.test(nomeLimpo(a))],
  [
    { id: 'leite', nome: 'leites e iogurtes' },
    (a) => (a.categoria === 'Leite e derivados' && !QUEIJO.test(nomeLimpo(a))) || EXTRATO_DE_SOJA.test(nomeLimpo(a)),
  ],
  [{ id: 'leguminosa', nome: 'leguminosas' }, (a) => a.categoria === 'Leguminosas e derivados'],
  [{ id: 'carne', nome: 'carnes, aves e peixes' }, (a) => a.categoria === 'Carnes e derivados' || a.categoria === 'Pescados e frutos do mar'],
  [
    { id: 'ovo-queijo', nome: 'ovos e queijos' },
    (a) => a.categoria === 'Ovos e derivados' || (a.categoria === 'Leite e derivados' && QUEIJO.test(nomeLimpo(a))),
  ],
  [{ id: 'fruta', nome: 'frutas' }, (a) => a.categoria === FRUTAS],
  [{ id: 'verdura', nome: 'verduras e legumes' }, ehVerdura],
]

/** O grupo do alimento; fora dos grupos, o grupo da tabela (o do alimento próprio é o que a nutricionista escolheu). */
export function grupoDeSubstituicao(a: Alimento): GrupoDeSubstituicao {
  const achado = GRUPOS.find(([, casa]) => casa(a))
  return achado ? achado[0] : { id: a.categoria, nome: a.categoria.toLowerCase() }
}

/** O tofu e os outros derivados de soja, que a lista de equivalentes põe com os feijões. */
const DERIVADO_DE_SOJA = /^Soja,|(^|[\s,(])tofu($|[\s,)])/i

/**
 * D-1133, estreitada pela D-1136 (spec busca-substitutos, revisão rodada 4, M1): os grupos em que a própria lista de
 * equivalentes (Philippi et al., "Pirâmide alimentar adaptada", Rev. Nutr. 1999;12(1):65-80) junta alimentos de macro
 * dominante diferente, e onde o grupo já diz que a troca é equivalente: os leites e iogurtes (o integral é "de gordura";
 * o desnatado e a bebida de soja, "de carboidrato"), as verduras (macros em frações de grama) e, entre as leguminosas, o
 * derivado de soja (o tofu, "de gordura", com o tremoço). Nos outros grupos, o macro dominante continua valendo: sem ele,
 * o cupim trocava por 3 bifes de patinho, e a castanha pela pupunha.
 */
export function dispensaOMacroDominante(a: Alimento): boolean {
  const grupo = grupoDeSubstituicao(a).id
  return grupo === 'leite' || grupo === 'verdura' || (grupo === 'leguminosa' && DERIVADO_DE_SOJA.test(a.descricao))
}

/**
 * A forma do ovo, entre ovos: ovo inteiro só por ovo inteiro, gema só por gema, clara só por clara (duas gemas não são um ovo,
 * D-194). O queijo, que divide o grupo com o ovo, troca só com o ovo inteiro, nos dois sentidos (D-1108, revisão rodada
 * 2, M2): a clara cozida por proteína pedia 135 g de requeijão.
 */
function mesmaFormaDoOvo(base: Alimento, a: Alimento): boolean {
  const daBase = formaDoOvo(base) ?? 'inteiro'
  const doCandidato = formaDoOvo(a) ?? 'inteiro'
  return doCandidato === daBase
}

/**
 * "Só do mesmo grupo": o mesmo grupo e a mesma forma das trocas da folha. A forma do ovo (acima); verdura cozida só por
 * verdura cozida; no acompanhamento, pronto por pronto e cru por cru (CA-658; a farinha de mandioca é pronta, D-1138); fruta inteira só por fruta inteira, e no
 * lugar do suco ou da polpa entra qualquer fruta (D-1131).
 */
export function noMesmoGrupo(base: Alimento): (a: Alimento) => boolean {
  const grupo = grupoDeSubstituicao(base).id
  const verduraCozida = ehVerduraCozida(base)
  const acompanhamento = grupo === 'amido'
  const frutaInteira = ehFrutaInteira(base)
  return (a) =>
    grupoDeSubstituicao(a).id === grupo &&
    mesmaFormaDoOvo(base, a) &&
    (!verduraCozida || !ehCru(a)) &&
    (!acompanhamento || cruNoPrato(a) === cruNoPrato(base)) &&
    (!frutaInteira || !ehSucoOuPolpaDeFruta(a))
}
