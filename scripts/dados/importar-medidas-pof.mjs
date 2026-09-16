// Liga as medidas caseiras da POF 2008-2009 (IBGE) aos alimentos da TACO por regras revisadas à mão
// (dados-brutos/pof/regras-mapeamento-taco-pof.csv) e grava src/data/medidas-caseiras.json e
// src/data/medidas-revisao.md (lista para conferência humana).
// Uso: node scripts/dados/importar-medidas-pof.mjs
//
// As tabelas não compartilham códigos (ver dados-brutos/taco/dicionario-dados.md), por isso não há
// correspondência automática: só entram alimentos cobertos por uma regra.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { dividirLinhaCsv } from './importar-taco.mjs'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const POF = join(raiz, 'dados-brutos', 'pof', 'pof_medidas_caseiras.csv')
const REGRAS = join(raiz, 'dados-brutos', 'pof', 'regras-mapeamento-taco-pof.csv')
const ALIMENTOS = join(raiz, 'src', 'data', 'alimentos.json')
const DESTINO = join(raiz, 'src', 'data', 'medidas-caseiras.json')
const REVISAO = join(raiz, 'src', 'data', 'medidas-revisao.md')

/** Medidas que não são caseiras ou dependem de embalagem. */
export const MEDIDAS_DESCARTADAS = /^(GRAMA|QUILO|MILILITRO|LITRO|GARRAFA|LATA|PACOTE|SACO|SACHE)\b/

/** Preparo da TACO -> preparações da POF aceitas, em ordem de preferência. */
export const PREPAROS = {
  cru: ['CRU(A)', 'NAO SE APLICA'],
  cozido: ['CROZIDO(A)', 'NAO SE APLICA'],
  frito: ['FRITO(A)', 'NAO SE APLICA'],
  grelhado: ['GRELHADO(A)/BRASA/CHURRASCO', 'ASSADO(A)', 'NAO SE APLICA'],
  assado: ['ASSADO(A)', 'GRELHADO(A)/BRASA/CHURRASCO', 'NAO SE APLICA'],
  refogado: ['REFOGADO(A)', 'NAO SE APLICA'],
  torrado: ['NAO SE APLICA'],
  '': ['NAO SE APLICA', 'CRU(A)'],
}

const ROTULOS_MEDIDA = {
  'COLHER DE ARROZ/SERVIR': 'colher de servir',
  'COLHER DE SOPA': 'colher de sopa',
  'COLHER DE SOBREMESA': 'colher de sobremesa',
  'COLHER DE CHA': 'colher de chá',
  'COLHER DE CAFE': 'colher de café',
  'XICARA DE CHA': 'xícara de chá',
  'XICARA DE CAFE': 'xícara de café',
  'COPO AMERICANO': 'copo americano',
  'COPO MEDIO': 'copo médio',
  'COPO GRANDE': 'copo grande',
  'COPO DE REQUEIJAO': 'copo de requeijão',
  'COPO DE CAFEZINHO': 'copo de cafezinho',
  'COPO TULIPA': 'copo tulipa',
  'PRATO RASO': 'prato raso',
  'PRATO FUNDO': 'prato fundo',
  'PRATO DE SOBREMESA': 'prato de sobremesa',
  'UNIDADE PEQUENA': 'unidade pequena',
  'PONTA DE FACA': 'ponta de faca',
  PEDACO: 'pedaço',
  PORCAO: 'porção',
  PESCOCO: 'pescoço',
  FILE: 'filé',
  TACA: 'taça',
}

export function rotuloMedida(pof) {
  return ROTULOS_MEDIDA[pof] ?? pof.toLowerCase()
}

/** Em frutas inteiras, copos e canecas quase sempre descrevem suco ou vitamina, não a fruta. */
const MEDIDAS_DESCARTADAS_POR_CATEGORIA = {
  'Frutas e derivados': /^(COPO|CANECA|CANECO)\b/,
}

/** "COPO*" casa qualquer medida que começa com "COPO"; o resto exige nome exato. */
function medidaExcluida(medida, excluidas) {
  return excluidas.some((e) => (e.endsWith('*') ? medida.startsWith(e.slice(0, -1)) : medida === e))
}

function lerCsv(caminho, separador = ',') {
  const linhas = readFileSync(caminho, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '' && !l.startsWith('#'))
  const dividir = separador === ',' ? dividirLinhaCsv : (l) => l.split(separador)
  const cabecalho = dividir(linhas[0])
  return linhas.slice(1).map((l) => {
    const c = dividir(l)
    return Object.fromEntries(cabecalho.map((h, i) => [h, (c[i] ?? '').trim()]))
  })
}

export function converter() {
  const pof = lerCsv(POF)
  const regras = lerCsv(REGRAS, ';').map((r, i) => ({ ...r, linha: i + 2, re: new RegExp(r.padrao_taco) }))
  const { alimentos } = JSON.parse(readFileSync(ALIMENTOS, 'utf8'))

  const porCodigo = new Map()
  for (const r of pof) {
    if (!porCodigo.has(r.codigo_alimento)) porCodigo.set(r.codigo_alimento, [])
    porCodigo.get(r.codigo_alimento).push(r)
  }

  const saida = {}
  const revisao = []
  const regrasUsadas = new Set()
  const semMedidas = []

  for (const a of alimentos) {
    const regra = regras.find((r) => r.re.test(a.descricao))
    if (!regra) continue
    regrasUsadas.add(regra.linha)
    if (!regra.codigo_pof) continue // regra que marca explicitamente "sem mapeamento"
    const registros = porCodigo.get(regra.codigo_pof)
    if (!registros) throw new Error(`Regra da linha ${regra.linha}: código POF ${regra.codigo_pof} não existe`)

    const excluidas = regra.medidas_excluidas ? regra.medidas_excluidas.split('|') : []
    const porCategoria = MEDIDAS_DESCARTADAS_POR_CATEGORIA[a.categoria]
    const aceitos = PREPAROS[a.preparo ?? ''] ?? PREPAROS['']
    const preparo = aceitos.find((p) => registros.some((r) => r.descricao_preparacao === p))
    if (!preparo) {
      semMedidas.push(`${a.id} ${a.descricao} (sem preparação compatível na POF)`)
      continue
    }
    const vistos = new Set()
    const medidas = registros
      .filter(
        (r) =>
          r.descricao_preparacao === preparo &&
          !MEDIDAS_DESCARTADAS.test(r.descricao_medida) &&
          !(porCategoria && porCategoria.test(r.descricao_medida)) &&
          !medidaExcluida(r.descricao_medida, excluidas),
      )
      .filter((r) => (vistos.has(r.descricao_medida) ? false : vistos.add(r.descricao_medida)))
      .map((r) => ({ nome: rotuloMedida(r.descricao_medida), gramas: Number(r.quantidade_g) }))
      .filter((m) => Number.isFinite(m.gramas) && m.gramas > 0)
      .sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'))

    if (medidas.length === 0) {
      semMedidas.push(`${a.id} ${a.descricao} (preparação ${preparo} sem medidas caseiras)`)
      continue
    }
    const nomePof = registros[0].descricao_alimento
    saida[a.id] = { pof: { codigo: regra.codigo_pof, descricao: nomePof, preparacao: preparo }, medidas }
    revisao.push(`| ${a.id} | ${a.descricao} | ${nomePof} (${preparo}) | ${medidas.map((m) => `${m.nome} ${m.gramas} g`).join('; ')} |`)
  }

  const naoUsadas = regras.filter((r) => !regrasUsadas.has(r.linha)).map((r) => `linha ${r.linha}: ${r.padrao_taco}`)

  return {
    json: {
      fonte: {
        nome: 'Tabela de Medidas Referidas para os Alimentos Consumidos no Brasil (POF 2008-2009)',
        autor: 'IBGE',
        normalizacao: 'https://github.com/brolesi/taco',
        mapeamento: 'dados-brutos/pof/regras-mapeamento-taco-pof.csv (revisado à mão)',
        baixadoEm: '2026-09-15',
      },
      alimentos: saida,
    },
    revisao: [
      '# Revisão das medidas caseiras (TACO ↔ POF)',
      '',
      `Gerado por scripts/dados/importar-medidas-pof.mjs. ${revisao.length} alimentos da TACO com medidas caseiras.`,
      'Confira se o alimento da POF corresponde ao da TACO e se as medidas fazem sentido para a forma de preparo.',
      '',
      '| TACO | Descrição TACO | Alimento POF (preparação) | Medidas |',
      '|---|---|---|---|',
      ...revisao,
      '',
      '## Alimentos cobertos por regra, mas sem medidas',
      '',
      ...(semMedidas.length ? semMedidas.map((s) => `- ${s}`) : ['- nenhum']),
      '',
      '## Regras que não encontraram alimento na TACO',
      '',
      ...(naoUsadas.length ? naoUsadas.map((s) => `- ${s}`) : ['- nenhuma']),
      '',
    ].join('\n'),
    naoUsadas,
  }
}

const executadoDiretamente = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (executadoDiretamente) {
  const { json, revisao, naoUsadas } = converter()
  writeFileSync(DESTINO, JSON.stringify(json) + '\n', 'utf8')
  writeFileSync(REVISAO, revisao, 'utf8')
  console.log(`${Object.keys(json.alimentos).length} alimentos com medidas caseiras gravados em ${DESTINO}`)
  if (naoUsadas.length) console.log(`Regras sem alimento na TACO:\n  ${naoUsadas.join('\n  ')}`)
}
