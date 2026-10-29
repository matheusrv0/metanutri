// Grava a base ampliada (spec base-ampliada) a partir dos arquivos oficiais do USDA e da curadoria revisada.
// Uso: node scripts/dados/importar-base-ampliada.mjs [pasta do cache]
//
// Entradas: o cache com os zips oficiais (dados-brutos/cache/usda, fora do git, SHA-256 conferido) e
// dados-brutos/usda/curadoria-base-ampliada.json (nome, grupo, preparo, `sugerivel` de cada fdcId, revisados).
// Saídas: src/data/base-ampliada.json (carregado sob demanda) e src/data/base-ampliada-fonte.json (a citação e as
// contagens, pequeno, que a página Fontes da base lê).
//
// Regras (D-700 a D-712):
// - todo número sai do arquivo do USDA, pela conversão de `usda-fonte.mjs`; a curadoria nunca escreve valor;
// - nutriente que a fonte não traz é nulo, nunca zero;
// - Foundation vence; o SR Legacy do mesmo alimento (`complemento`) só preenche o que a Foundation deixou nulo, e cada
//   chave preenchida fica marcada;
// - `naoCopiar` (fortificação americana) zera para nulo, nunca para zero;
// - o id de um fdcId nunca muda: se a saída de antes tinha o fdcId com outro id, o script para;
// - qualquer problema para o script antes de gravar: nada é escrito pela metade.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { ARQUIVOS_USDA, CACHE_PADRAO, carregarUsda } from './preselecionar-usda.mjs'
import { valoresDoAlimento } from './usda-fonte.mjs'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
export const CURADORIA = join(raiz, 'dados-brutos', 'usda', 'curadoria-base-ampliada.json')
export const DESTINO = join(raiz, 'src', 'data', 'base-ampliada.json')
export const DESTINO_FONTE = join(raiz, 'src', 'data', 'base-ampliada-fonte.json')
const TACO = join(raiz, 'src', 'data', 'alimentos.json')

/** A faixa de ids da base ampliada: acima da TACO (1 a 597) e abaixo dos alimentos próprios (900.000). */
export const PRIMEIRO_ID = 100_001
export const ULTIMO_ID = 199_999

export const GRUPOS = [
  'Cereais e derivados',
  'Verduras, hortaliças e derivados',
  'Frutas e derivados',
  'Gorduras e óleos',
  'Pescados e frutos do mar',
  'Carnes e derivados',
  'Leite e derivados',
  'Bebidas (alcoólicas e não alcoólicas)',
  'Ovos e derivados',
  'Produtos açucarados',
  'Miscelâneas',
  'Outros alimentos industrializados',
  'Alimentos preparados',
  'Leguminosas e derivados',
  'Nozes e sementes',
]
export const PREPAROS = ['cru', 'cozido', 'grelhado', 'assado', 'frito', 'refogado', 'torrado']

/** A ordem dos valores em cada alimento: as chaves de `ChaveNutrienteAlimento`. */
export const CHAVES = [
  'energia_kcal', 'proteina_g', 'lipideos_g', 'carboidrato_g', 'acucares_g', 'gordura_saturada_g', 'fibra_g', 'colesterol_mg',
  'calcio_mg', 'magnesio_mg', 'manganes_mg', 'fosforo_mg', 'ferro_mg', 'sodio_mg', 'potassio_mg', 'cobre_mg', 'zinco_mg',
  'vitamina_a_rae_mcg', 'tiamina_mg', 'riboflavina_mg', 'piridoxina_mg', 'niacina_mg', 'vitamina_c_mg', 'vitamina_d_mcg',
  'vitamina_e_mg', 'folato_dfe_mcg', 'vitamina_b12_mcg', 'selenio_mcg', 'gordura_trans_g',
]

/** O máximo plausível por 100 g de cada chave (os maiores valores reais de alimento, com folga; a banha, gordura pura, tem 902 kcal). */
export const MAXIMOS = {
  energia_kcal: 902, proteina_g: 100, lipideos_g: 100, carboidrato_g: 100, acucares_g: 100, gordura_saturada_g: 100,
  fibra_g: 100, colesterol_mg: 3100, calcio_mg: 2500, magnesio_mg: 800, manganes_mg: 160, fosforo_mg: 2000, ferro_mg: 130,
  sodio_mg: 40000, potassio_mg: 6000, cobre_mg: 15, zinco_mg: 100, vitamina_a_rae_mcg: 12000, tiamina_mg: 30,
  riboflavina_mg: 20, piridoxina_mg: 10, niacina_mg: 100, vitamina_c_mg: 2000, vitamina_d_mcg: 60, vitamina_e_mg: 160,
  folato_dfe_mcg: 1000, vitamina_b12_mcg: 100, selenio_mcg: 2000, gordura_trans_g: 10,
}

export const FONTE = {
  nome: 'USDA FoodData Central',
  autor: 'U.S. Department of Agriculture, Agricultural Research Service',
  citacao: 'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019. fdc.nal.usda.gov.',
  licenca: 'CC0 1.0 Universal (domínio público)',
  url: 'https://fdc.nal.usda.gov/',
  baixadoEm: '2026-10-29',
  base: '100 g de parte comestível',
  conjuntos: [ARQUIVOS_USDA.srLegacy, ARQUIVOS_USDA.foundation].map(({ nome, versao, arquivo, url, sha256 }) => ({ nome, versao, arquivo, url, sha256 })),
  criterio:
    'Alimentos genéricos que a TACO não tem, com nome em português, grupo da TACO e preparo, revisados em duas passadas em 29/10/2026. A TACO vence quando tem o mesmo alimento no mesmo preparo; a Foundation vence o SR Legacy, que só completa o que ela não publicou. Fortificação americana não é copiada.',
}

// ---------- Medidas caseiras: a porção do USDA com nome da POF ----------

/** A porção do USDA vira medida da POF; a primeira regra que casa vale. `null` = não é medida caseira. */
const MEDIDAS = [
  { re: /^(cup|cups)\b/, nome: 'xícara de chá' },
  { re: /^(tbsp|tablespoons?)\b/, nome: 'colher de sopa' },
  { re: /^(tsp|teaspoons?)\b/, nome: 'colher de chá' },
  { re: /^fillets?\b/, nome: 'filé' },
  { re: /^steaks?\b/, nome: 'bife' },
  { re: /^chops?\b(?!.*yield)/, nome: 'bisteca' },
  { re: /^slices?\b(?!, (thin|large))/, nome: 'fatia' },
  { re: /^(medium|fruit|fruit without refuse|egg|whole)\b/, nome: 'unidade' },
  { re: /^large\b/, nome: 'unidade grande' },
  { re: /^small\b/, nome: 'unidade pequena' },
  { re: /^pieces?\b(?!.*yield)/, nome: 'pedaço' },
  { re: /^breasts?\b/, nome: 'peito' },
  { re: /^drumsticks?\b/, nome: 'coxa' },
  { re: /^thighs?\b/, nome: 'sobrecoxa' },
  { re: /^wings?\b/, nome: 'asa' },
  { re: /^leaf|^leaves\b/, nome: 'folha' },
  { re: /^(pita|tortilla|croissant, medium|crackers?|nuts?|kernels?|mushrooms?|pepper|artichoke, medium|pod|sprout|anchov(y|ies)|clove)\b/, nome: 'unidade' },
]

/** O que cada grupo aceita (a camada de plausibilidade da POF, D-430, no que vale para o USDA). */
const SO_PECAS = new Set(['filé', 'bife', 'fatia', 'pedaço', 'unidade', 'unidade grande', 'unidade pequena', 'peito', 'coxa', 'sobrecoxa', 'asa', 'bisteca'])
const FOLHA_CRUA = /^(Alface|Rúcula|Agrião|Almeirão|Chicória|Espinafre|Mostarda|Couve|Acelga|Escarola|Endívia|Radicchio)/i
const PESO_MAXIMO = { 'colher de sopa': 45, 'colher de chá': 12, 'xícara de chá': 300, fatia: 100, unidade: 800, 'unidade grande': 800, 'unidade pequena': 400, filé: 400, bife: 400, bisteca: 400, pedaço: 300 }

function nomeDaMedida(p) {
  const texto = [p.unidade, p.modificador].filter(Boolean).join(' ').toLowerCase().trim()
  if (/yield|racc|nlea|serving|package|\bcan\b|\boz\b|\blb\b|cubic|fl oz|roast|bunch|dash|block|wedge|head|bird|\bunit\b|half|ribs?\b|melted|whipped|mashed|crumbled|ground/.test(texto)) return null
  return MEDIDAS.find((m) => m.re.test(texto))?.nome ?? null
}

/** Uma medida por nome, na ordem do USDA (a primeira é a de costume), filtrada pelo grupo e pelo peso. */
export function medidasDaCuradoria(item, porcoes) {
  const medidas = []
  for (const p of [...porcoes].sort((a, b) => a.ordem - b.ordem)) {
    const lida = nomeDaMedida(p)
    // O ovo "large" do USDA (50 g) é o ovo comum do Brasil: a unidade.
    const nome = item.grupo === 'Ovos e derivados' && lida === 'unidade grande' ? 'unidade' : lida
    if (!nome || !p.gramas || !p.quantidade || p.quantidade <= 0) continue
    const gramas = Math.round((p.gramas / p.quantidade) * 10) / 10
    if (medidas.some((m) => m[0] === nome)) continue
    if ((item.grupo === 'Carnes e derivados' || item.grupo === 'Pescados e frutos do mar') && !SO_PECAS.has(nome)) continue
    if (item.grupo === 'Pescados e frutos do mar' && nome === 'bife') continue
    if (item.grupo === 'Gorduras e óleos' && !nome.startsWith('colher')) continue
    if (item.grupo === 'Verduras, hortaliças e derivados' && item.preparo === 'cru' && FOLHA_CRUA.test(item.nome) && nome !== 'folha' && nome !== 'unidade') continue
    const maximo = nome === 'fatia' && item.grupo === 'Frutas e derivados' ? 250 : (PESO_MAXIMO[nome] ?? 800)
    if (!(gramas > 0) || gramas > maximo) continue
    medidas.push([nome, gramas])
  }
  return medidas
}

// ---------- Conferência e montagem ----------

function falhar(mensagem) {
  throw new Error(mensagem)
}

/** Energia longe de 4P + 4C + 9G (a mesma regra de `energiaIncoerente`, spec alimentos-e-gramaturas, D-384). */
export function energiaIncoerente(v) {
  if ([v.energia_kcal, v.proteina_g, v.lipideos_g, v.carboidrato_g].some((x) => x === null)) return false
  const pelosMacros = 4 * v.proteina_g + 4 * v.carboidrato_g + 9 * v.lipideos_g
  const diferenca = Math.abs(v.energia_kcal - pelosMacros)
  return diferenca > 15 && diferenca > 0.2 * Math.max(v.energia_kcal, pelosMacros)
}

/**
 * Confere a curadoria e monta a base. `usda` é o Map fdcId → alimento lido do arquivo; `nomesDaTaco`, as descrições
 * da TACO em minúscula; `idsDeAntes`, o Map fdcId → id da saída anterior (para o id nunca mudar).
 */
export function montarBase(curadoria, usda, nomesDaTaco, idsDeAntes = new Map()) {
  if (!Array.isArray(curadoria)) falhar('A curadoria precisa ser uma lista.')
  const vistos = new Set()
  const ids = new Set()
  const nomes = new Set()
  const alimentos = []
  for (const item of curadoria) {
    if (!Number.isInteger(item.fdcId) || vistos.has(item.fdcId)) falhar(`fdcId ${item.fdcId} repetido ou inválido.`)
    vistos.add(item.fdcId)
    if (!usda.has(item.fdcId)) falhar(`fdcId ${item.fdcId} não está nos arquivos do USDA.`)
    if (item.decisao === 'excluir') {
      if (typeof item.motivo !== 'string' || item.motivo.trim() === '') falhar(`fdcId ${item.fdcId}: exclusão sem motivo.`)
      continue
    }
    if (item.decisao !== 'incluir') falhar(`fdcId ${item.fdcId}: decisão "${item.decisao}".`)
    const bruto = usda.get(item.fdcId)
    const onde = `fdcId ${item.fdcId} (${item.nome})`
    if (!Number.isInteger(item.id) || item.id < PRIMEIRO_ID || item.id > ULTIMO_ID || ids.has(item.id)) falhar(`${onde}: id ${item.id} fora da faixa ou repetido.`)
    if (idsDeAntes.has(item.fdcId) && idsDeAntes.get(item.fdcId) !== item.id) falhar(`${onde}: o id mudou de ${idsDeAntes.get(item.fdcId)} para ${item.id}.`)
    ids.add(item.id)
    if (typeof item.nome !== 'string' || !/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/.test(item.nome) || !item.nome.includes(',') && item.nome.split(' ').length > 3) falhar(`${onde}: nome fora do padrão.`)
    const chave = item.nome.toLowerCase()
    if (nomes.has(chave) || nomesDaTaco.has(chave)) falhar(`${onde}: nome repetido (na base ampliada ou na TACO).`)
    nomes.add(chave)
    if (!GRUPOS.includes(item.grupo)) falhar(`${onde}: grupo "${item.grupo}".`)
    if (item.preparo !== null && !PREPAROS.includes(item.preparo)) falhar(`${onde}: preparo "${item.preparo}".`)
    if (typeof item.paciente !== 'string' || item.paciente.trim() === '') falhar(`${onde}: sem nome para o paciente.`)
    if (typeof item.sugerivel !== 'boolean') falhar(`${onde}: sugerivel não é verdadeiro ou falso.`)

    const valores = valoresDoAlimento(bruto)
    const doComplemento = []
    let porcoes = bruto.porcoes
    if (item.complemento !== undefined) {
      const comp = usda.get(item.complemento)
      if (!comp || comp.conjunto !== 'SR Legacy' || bruto.conjunto !== 'Foundation Foods') falhar(`${onde}: complemento ${item.complemento} precisa ser SR Legacy de um item Foundation.`)
      const dele = valoresDoAlimento(comp)
      for (const c of CHAVES) {
        if (valores[c] === null && dele[c] !== null) {
          valores[c] = dele[c]
          doComplemento.push(c)
        }
      }
      porcoes = [...porcoes, ...comp.porcoes]
    }
    for (const c of item.naoCopiar ?? []) {
      if (!CHAVES.includes(c)) falhar(`${onde}: naoCopiar com chave desconhecida "${c}".`)
      valores[c] = null
    }
    for (const c of CHAVES) {
      const v = valores[c]
      if (v !== null && (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > MAXIMOS[c])) falhar(`${onde}: ${c} = ${v} fora da faixa (0 a ${MAXIMOS[c]}).`)
    }
    if (valores.energia_kcal === null) falhar(`${onde}: sem energia.`)
    if (energiaIncoerente(valores)) falhar(`${onde}: energia incoerente com os macros.`)

    const saida = {
      id: item.id,
      fdcId: item.fdcId,
      conjunto: bruto.conjunto,
      nome: item.nome,
      grupo: item.grupo,
      preparo: item.preparo,
      paciente: item.paciente,
      original: bruto.descricao,
      sugerivel: item.sugerivel,
      valores: CHAVES.map((c) => (valores[c] === null ? null : Math.round(valores[c] * 10000) / 10000)),
      medidas: medidasDaCuradoria(item, porcoes),
    }
    if (item.ml === true) saida.ml = true
    if (doComplemento.length > 0) saida.complemento = { fdcId: item.complemento, chaves: doComplemento }
    alimentos.push(saida)
  }
  alimentos.sort((a, b) => a.id - b.id)
  return { chaves: CHAVES, alimentos }
}

/** O cabeçalho que a página Fontes da base lê: a citação e as contagens. */
export function montarFonte(base) {
  const porGrupo = {}
  for (const a of base.alimentos) porGrupo[a.grupo] = (porGrupo[a.grupo] ?? 0) + 1
  return {
    fonte: FONTE,
    alimentos: base.alimentos.length,
    sugeriveis: base.alimentos.filter((a) => a.sugerivel).length,
    porConjunto: {
      'Foundation Foods': base.alimentos.filter((a) => a.conjunto === 'Foundation Foods').length,
      'SR Legacy': base.alimentos.filter((a) => a.conjunto === 'SR Legacy').length,
    },
    porGrupo: Object.fromEntries(GRUPOS.filter((g) => porGrupo[g]).map((g) => [g, porGrupo[g]])),
  }
}

function principal(argumentos) {
  const [cache = CACHE_PADRAO] = argumentos
  let base
  try {
    const usda = new Map(carregarUsda(cache).map((a) => [a.fdcId, a]))
    const curadoria = JSON.parse(readFileSync(CURADORIA, 'utf8'))
    const nomesDaTaco = new Set(JSON.parse(readFileSync(TACO, 'utf8')).alimentos.map((a) => a.descricao.trim().toLowerCase()))
    const idsDeAntes = existsSync(DESTINO) ? new Map(JSON.parse(readFileSync(DESTINO, 'utf8')).alimentos.map((a) => [a.fdcId, a.id])) : new Map()
    base = montarBase(curadoria, usda, nomesDaTaco, idsDeAntes)
  } catch (erro) {
    console.error(`Base ampliada recusada: ${erro.message}`)
    process.exit(1)
  }
  // Um alimento por linha: o arquivo fica compacto e a diferença entre duas versões se lê por alimento.
  writeFileSync(DESTINO, `{"chaves":${JSON.stringify(base.chaves)},"alimentos":[\n${base.alimentos.map((a) => JSON.stringify(a)).join(',\n')}\n]}\n`)
  writeFileSync(DESTINO_FONTE, `${JSON.stringify(montarFonte(base), null, 1)}\n`)
  console.log(`${base.alimentos.length} alimentos gravados em ${DESTINO}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) principal(process.argv.slice(2))
