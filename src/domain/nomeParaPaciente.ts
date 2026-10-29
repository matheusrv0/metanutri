// O nome do alimento que o paciente lê na folha (spec impressao-do-plano, D-181, D-182 e seção 2).
//
// O planejador, a busca, a tabela e o Word continuam com o nome da base ("Pão, trigo, francês"): é por ele que a
// nutricionista escolhe. Na folha do paciente sai "Pão francês". A ordem das regras é a da spec: produto cadastrado
// sai como foi escrito; depois vale a lista revisada à mão; depois a regra geral sobre as partes do nome.
import { ALIMENTOS } from './tabelas.ts'
import type { Alimento } from './tipos.ts'

/**
 * Os alimentos comuns cuja regra geral não sai natural, pelo id da base. Mudou a regra, confira esta lista: ela vale
 * antes da regra geral.
 */
export const NOMES_REVISADOS: Readonly<Record<number, string>> = {
  3: 'Arroz branco cozido',
  4: 'Arroz branco (peso cru)',
  5: 'Arroz branco cozido',
  6: 'Arroz branco (peso cru)',
  7: 'Aveia em flocos',
  8: 'Biscoito maisena',
  9: 'Biscoito recheado de chocolate',
  10: 'Biscoito recheado de morango',
  11: 'Biscoito wafer de chocolate',
  12: 'Biscoito wafer de morango',
  13: 'Biscoito cream cracker',
  14: 'Mistura para bolo',
  15: 'Bolo de aipim',
  16: 'Bolo de chocolate',
  17: 'Bolo de coco',
  18: 'Bolo de milho',
  21: 'Flocos de milho com sal',
  22: 'Flocos de milho sem sal',
  23: 'Mingau de milho infantil',
  24: 'Mistura de cereais para vitamina',
  25: 'Cereal matinal de milho',
  26: 'Cereal matinal de milho com açúcar',
  29: 'Curau de milho verde',
  30: 'Mistura para curau',
  37: 'Massa de lasanha fresca cozida',
  38: 'Massa de lasanha fresca (peso cru)',
  40: 'Macarrão (peso cru)',
  41: 'Macarrão com ovos (peso cru)',
  42: 'Amido de milho',
  43: 'Fubá',
  47: 'Pamonha pré-cozida',
  48: 'Pão de forma de aveia',
  50: 'Pão de forma de glúten',
  51: 'Pão de forma de milho',
  52: 'Pão de forma integral',
  53: 'Pão francês',
  54: 'Pão sovado',
  63: 'Torrada de pão francês',
  90: 'Batata frita de pacote',
  99: 'Biscoito de polvilho doce',
  114: 'Coentro desidratado',
  119: 'Espinafre (peso cru)',
  120: 'Espinafre refogado',
  125: 'Broto de feijão (peso cru)',
  131: 'Farofa de mandioca',
  135: 'Folha de mostarda (peso cru)',
  136: 'Nhoque de batata cozido',
  157: 'Tomate',
  167: 'Açaí com xarope de guaraná',
  171: 'Ameixa em calda',
  173: 'Ameixa em calda escorrida',
  176: 'Bananada',
  184: 'Cajá-manga',
  195: 'Figo em calda',
  198: 'Goiabada',
  199: 'Goiabada cascão',
  224: 'Doce de mamão em calda escorrido',
  227: 'Doce de mamão verde em calda escorrido',
  245: 'Pêssego em calda',
  277: 'Atum em óleo',
  281: 'Posta de cação empanada frita',
  284: 'Camarão grande cozido',
  285: 'Camarão grande (peso cru)',
  286: 'Camarão frito com casca',
  299: 'Manjuba empanada frita',
  306: 'Filé de pescada empanado frito',
  309: 'Filé de pescada ao escabeche',
  319: 'Sardinha em óleo',
  324: 'Caldo de carne em tablete',
  325: 'Caldo de galinha em tablete',
  389: 'Empada de frango assada',
  418: 'Linguiça de frango (peso cru)',
  419: 'Linguiça de frango frita',
  420: 'Linguiça de frango grelhada',
  421: 'Linguiça de porco (peso cru)',
  422: 'Linguiça de porco frita',
  423: 'Linguiça de porco grelhada',
  441: 'Quibe cru',
  446: 'Bebida láctea de pêssego',
  447: 'Creme de leite',
  455: 'Leite achocolatado',
  456: 'Leite em pó desnatado',
  457: 'Leite desnatado',
  458: 'Leite integral',
  459: 'Leite em pó integral',
  463: 'Queijo muçarela',
  465: 'Queijo processado',
  466: 'Petit suisse de morango',
  468: 'Requeijão cremoso',
  469: 'Ricota',
  472: 'Cachaça',
  473: 'Caldo de cana',
  475: 'Chá de erva-doce',
  478: 'Água de coco',
  479: 'Água tônica',
  480: 'Refrigerante de cola',
  481: 'Refrigerante de guaraná',
  482: 'Refrigerante de laranja',
  483: 'Refrigerante de limão',
  485: 'Ovo de codorna',
  486: 'Clara de ovo cozida',
  487: 'Gema de ovo cozida',
  488: 'Ovo cozido',
  489: 'Ovo',
  490: 'Ovo frito',
  496: 'Chocolate ao leite com castanha-do-pará',
  497: 'Chocolate ao leite diet',
  502: 'Geleia de mocotó',
  504: 'Maria-mole',
  505: 'Maria-mole de coco queimado',
  507: 'Mel',
  512: 'Cappuccino em pó',
  513: 'Fermento químico em pó',
  514: 'Fermento biológico',
  515: 'Gelatina com sabor em pó',
  519: 'Tempero à base de sal',
  522: 'Chantilly em spray',
  524: 'Maionese',
  527: 'Baião de dois',
  529: 'Bife a cavalo',
  542: 'Macarrão à bolonhesa',
  557: 'Amendoim (peso cru)',
  579: 'Paçoca de amendoim',
  580: 'Pé de moleque',
  582: 'Bebida de soja',
  583: 'Extrato de soja em pó',
  584: 'Tofu',
  589: 'Castanha-do-pará',
  593: 'Gergelim',
  594: 'Linhaça',
}

// ---------- Regra geral (seção 2, item 3) ----------

/** Parte inteira que é ficha técnica, não comida. */
const RUIDO = /^(industrializad[oa]s?|envasad[oa]s?|com óleo hidrogenado|com óleo interesterificado|sabores variados)$/i
/** "Drenado" é como se serve: vira "escorrido", em todos (revisão de 15/10). */
const DRENADO = /^drenad([oa]s?)$/i
const PREPARO = /^(crus?|cruas?|cozid[oa]s?|grelhad[oa]s?|assad[oa]s?|frit[oa]s?|refogad[oa]s?|torrad[oa]s?)$/i
const CRU = /^(crus?|cruas?)$/i
const CONGELADO = /^congelad[oa]s?$/i
/** Como preparar: vai para o fim do nome. */
const NOTA = /^(sem|com) (pele|gordura|casca|capa de gordura)$/i
/** A parte do animal ou do alimento que vira o começo do nome: "Peito de frango", "Polpa de acerola". */
const PARTES = new Set([
  'filé',
  'peito',
  'coxa',
  'sobrecoxa',
  'asa',
  'coração',
  'fígado',
  'posta',
  'bisteca',
  'costela',
  'lombo',
  'pernil',
  'orelha',
  'rabo',
  'língua',
  'polpa',
  'suco',
  'suco concentrado',
  'extrato',
  'purê',
  'molho',
  'salada',
  'farinha',
  'massa',
])
/** Grupos em que "cru" não diz nada: come-se assim. */
const GRUPOS_SEM_CRU = new Set(['Frutas e derivados', 'Nozes e sementes'])
const GRUPO_VERDURAS = 'Verduras, hortaliças e derivados'
/** Grupos em que o peso prescrito é do alimento cru, e ele se come preparado: o "cru" vira "(peso cru)". */
const GRUPOS_PESO_CRU = /^(Cereais|Leguminosas|Carnes|Pescados)/
/**
 * Legumes e verduras que se comem cozidos: o "cru" também vira "(peso cru)" (seção 2 da spec). A regra prescritível
 * usa a mesma lista no teste do cru (spec sugestoes-com-criterio, D-474).
 */
export const VERDURAS_QUE_SE_COMEM_COZIDAS: ReadonlySet<string> = new Set([
  'Batata',
  'Mandioca',
  'Cará',
  'Inhame',
  'Abóbora',
  'Abobrinha',
  'Berinjela',
  'Chuchu',
  'Brócolis',
  'Couve-flor',
  'Espinafre',
  'Catalonha',
  'Taioba',
  'Caruru',
  'Serralha',
  'Mostarda',
  'Jiló',
  'Maxixe',
  'Quiabo',
  'Vagem',
  'Jurubeba',
])
/** Frutas que se comem cozidas e a base só tem cruas: o "cru" também vira "(peso cru)" (revisão final da integração). */
const FRUTAS_COZIDAS = new Set(['Fruta-pão', 'Pequi'])
const PESO_CRU = ' (peso cru)'
const ORTOGRAFIA: readonly (readonly [RegExp, string])[] = [
  [/Lingüiça/g, 'Linguiça'],
  [/\bpêra\b/g, 'pera'],
  [/\bPêra\b/g, 'Pera'],
  [/mingnon/g, 'mignon'],
  [/Geléia/g, 'Geleia'],
  [/Atemóia/g, 'Atemoia'],
  [/cabotian/g, 'cabotiá'],
]

/** Os ids da base: só neles valem a lista e as regras (produto cadastrado sai como foi escrito). */
const IDS_DA_BASE = new Set(ALIMENTOS.map((a) => a.id))

/** Bases que a tabela também tem preparadas: nelas, "cru" diz alguma coisa ("Cenoura crua" e "Cenoura cozida"). */
const BASES_COM_PREPARO = new Set(ALIMENTOS.filter((a) => a.preparo !== null && a.preparo !== 'cru').map((a) => a.base))

const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const minuscula = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** Tira de uma parte o que é ficha técnica: teor de gordura, tempo de cozimento, concentração, número de amostra. */
function limpar(parte: string): string {
  return parte
    .replace(/\s*\(\s*\d+\s*%[^)]*\)/g, '')
    .replace(/\/\s*\d+\s*minutos/g, '')
    .replace(/\binfusão\s+\d+\s*%/g, '')
    .replace(/\s+industrializad[oa]s?\b/g, '')
    .replace(/(?<!\btipo)\s+\d+$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function pelaRegra(alimento: Alimento): string {
  let texto = alimento.descricao.trim()
  for (const [de, para] of ORTOGRAFIA) texto = texto.replace(de, para)
  const [base = '', ...demais] = texto
    .split(',')
    .map(limpar)
    .filter((p) => p !== '' && !RUIDO.test(p))
  let resto = demais

  const preparo = resto.find((p) => PREPARO.test(p)) ?? null
  // Já preparado, o "congelado" de quando se comprou não muda nada.
  if (preparo !== null && !CRU.test(preparo)) resto = resto.filter((p) => !CONGELADO.test(p))

  let cabeca = base
  let animal = minuscula(base)
  // Carne bovina: o nome é o corte ("Patinho"); o que não é corte vira "de boi" ("Fígado de boi").
  if (base === 'Carne' && resto[0] === 'bovina') {
    resto = resto.slice(1)
    animal = 'boi'
    const corte = resto[0]
    if (corte !== undefined && !PARTES.has(corte)) {
      cabeca = corte === 'seca' ? 'Carne seca' : maiuscula(corte)
      resto = resto.slice(1)
    }
  }
  const parte = resto.find((p) => PARTES.has(p))
  if (parte !== undefined) {
    cabeca = `${maiuscula(parte)} de ${animal}`
    resto = resto.filter((p) => p !== parte)
  }

  // O "cru": vira "(peso cru)" onde o peso é do cru e se come preparado; sai onde não diz nada; fica onde importa.
  const verdura = alimento.categoria === GRUPO_VERDURAS
  const baseDaTabela = alimento.base ?? ''
  const pesoCru =
    resto.some((p) => CRU.test(p)) &&
    (GRUPOS_PESO_CRU.test(alimento.categoria) || (verdura && VERDURAS_QUE_SE_COMEM_COZIDAS.has(baseDaTabela)) || FRUTAS_COZIDAS.has(baseDaTabela))
  const tirarCru = pesoCru || GRUPOS_SEM_CRU.has(alimento.categoria) || (verdura && !BASES_COM_PREPARO.has(alimento.base))
  const palavras = resto
    .filter((p) => !NOTA.test(p) && !(tirarCru && CRU.test(p)))
    .map((p) => (p === 'pó' ? 'em pó' : p === 'conserva' ? 'em conserva' : p.replace(DRENADO, 'escorrid$1')))
  const notas = resto.filter((p) => NOTA.test(p))
  const nome = maiuscula([cabeca, ...palavras, ...notas].join(' ').replace(/\s+/g, ' ').trim())
  return pesoCru ? `${nome}${PESO_CRU}` : nome
}

/** O nome na folha do paciente (CA-623 a CA-626). Sem alimento, "Alimento removido" (CB-180). */
export function nomeParaPaciente(alimento: Alimento | undefined): string {
  if (!alimento) return 'Alimento removido'
    // D-385 (spec alimentos-e-gramaturas): o alimento próprio sai com o nome para o paciente do cadastro; sem ele, como foi escrito.
  // Spec base-ampliada, D-718: o alimento da base ampliada sai com o nome da curadoria ("Tilápia grelhada").
  if (!IDS_DA_BASE.has(alimento.id)) return alimento.proprio?.nomeParaPaciente || alimento.ampliada?.nomeParaPaciente || alimento.descricao.trim() || 'Alimento sem nome'
  return NOMES_REVISADOS[alimento.id] ?? pelaRegra(alimento)
}
