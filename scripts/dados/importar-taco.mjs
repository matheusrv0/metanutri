// Converte dados-brutos/taco/taco_composicao.csv em src/data/alimentos.json.
// Uso: node scripts/dados/importar-taco.mjs
//
// Regras (SPEC CA-32):
// - célula vazia = não analisado -> null (nunca 0)
// - 1e-05 = traço (Tr) -> 0, e a chave entra em `tracos`
// - valores por 100 g de parte comestível
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const ORIGEM = join(raiz, 'dados-brutos', 'taco', 'taco_composicao.csv')
const DESTINO = join(raiz, 'src', 'data', 'alimentos.json')

const TRACO = 1e-5
const CASAS = 4

/** Coluna do CSV -> chave no JSON, com unidade e rótulo exibível. */
export const NUTRIENTES = [
  ['energia_kcal', 'energia_kcal', 'kcal', 'Energia'],
  ['proteina_g', 'proteina_g', 'g', 'Proteína'],
  ['lipideos_g', 'lipideos_g', 'g', 'Gordura total'],
  ['carboidrato_g', 'carboidrato_g', 'g', 'Carboidrato'],
  ['fibra_g', 'fibra_g', 'g', 'Fibra alimentar'],
  ['colesterol_mg', 'colesterol_mg', 'mg', 'Colesterol'],
  ['calcio_mg', 'calcio_mg', 'mg', 'Cálcio'],
  ['magnesio_mg', 'magnesio_mg', 'mg', 'Magnésio'],
  ['manganes_mg', 'manganes_mg', 'mg', 'Manganês'],
  ['fosforo_mg', 'fosforo_mg', 'mg', 'Fósforo'],
  ['ferro_mg', 'ferro_mg', 'mg', 'Ferro'],
  ['sodio_mg', 'sodio_mg', 'mg', 'Sódio'],
  ['potassio_mg', 'potassio_mg', 'mg', 'Potássio'],
  ['cobre_mg', 'cobre_mg', 'mg', 'Cobre'],
  ['zinco_mg', 'zinco_mg', 'mg', 'Zinco'],
  ['RAE_mcg', 'vitamina_a_rae_mcg', 'µg', 'Vitamina A (RAE)'],
  ['tiamina_mg', 'tiamina_mg', 'mg', 'Tiamina (B1)'],
  ['riboflavina_mg', 'riboflavina_mg', 'mg', 'Riboflavina (B2)'],
  ['piridoxina_mg', 'piridoxina_mg', 'mg', 'Piridoxina (B6)'],
  ['niacina_mg', 'niacina_mg', 'mg', 'Niacina (B3)'],
  ['vitamina_c_mg', 'vitamina_c_mg', 'mg', 'Vitamina C'],
]

/** Divide uma linha CSV respeitando aspas duplas (inclusive "" escapado). */
export function dividirLinhaCsv(linha) {
  const campos = []
  let atual = ''
  let entreAspas = false
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i]
    if (entreAspas) {
      if (c === '"' && linha[i + 1] === '"') {
        atual += '"'
        i++
      } else if (c === '"') {
        entreAspas = false
      } else {
        atual += c
      }
    } else if (c === '"') {
      entreAspas = true
    } else if (c === ',') {
      campos.push(atual)
      atual = ''
    } else {
      atual += c
    }
  }
  campos.push(atual)
  return campos
}

function arredondar(n) {
  const f = 10 ** CASAS
  return Math.round(n * f) / f
}

export function converter(csv) {
  const linhas = csv.split(/\r?\n/).filter((l) => l.trim() !== '')
  const cabecalho = dividirLinhaCsv(linhas[0])
  const indice = Object.fromEntries(cabecalho.map((nome, i) => [nome, i]))
  for (const [coluna] of NUTRIENTES) {
    if (!(coluna in indice)) throw new Error(`Coluna ausente no CSV: ${coluna}`)
  }

  const alimentos = linhas.slice(1).map((linha, n) => {
    const campos = dividirLinhaCsv(linha)
    if (campos.length !== cabecalho.length) {
      throw new Error(`Linha ${n + 2}: ${campos.length} campos, esperado ${cabecalho.length}`)
    }
    const valor = (coluna) => campos[indice[coluna]] ?? ''
    const nutrientes = {}
    const tracos = []
    for (const [coluna, chave] of NUTRIENTES) {
      const bruto = valor(coluna).trim()
      if (bruto === '') {
        nutrientes[chave] = null
        continue
      }
      const numero = Number(bruto)
      if (!Number.isFinite(numero)) throw new Error(`Linha ${n + 2}, ${coluna}: valor inválido "${bruto}"`)
      if (numero === TRACO) {
        nutrientes[chave] = 0
        tracos.push(chave)
      } else {
        nutrientes[chave] = arredondar(numero)
      }
    }
    const texto = (coluna) => {
      const v = valor(coluna).trim()
      return v === '' ? null : v
    }
    return {
      id: Number(valor('numero_alimento')),
      descricao: valor('descricao'),
      categoria: valor('categoria'),
      base: texto('base'),
      preparo: texto('preparo'),
      qualificadores: texto('qualificadores'),
      nutrientes,
      tracos,
    }
  })

  return {
    fonte: {
      nome: 'Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição',
      autor: 'NEPA/UNICAMP',
      ano: 2011,
      normalizacao: 'https://github.com/brolesi/taco',
      baixadoEm: '2026-09-15',
      base: '100 g de parte comestível',
    },
    nutrientes: NUTRIENTES.map(([, chave, unidade, rotulo]) => ({ chave, unidade, rotulo })),
    alimentos,
  }
}

const executadoDiretamente = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (executadoDiretamente) {
  const saida = converter(readFileSync(ORIGEM, 'utf8'))
  writeFileSync(DESTINO, JSON.stringify(saida) + '\n', 'utf8')
  console.log(`${saida.alimentos.length} alimentos gravados em ${DESTINO}`)
}
