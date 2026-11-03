// Extrai as tabelas de percentis de Frisancho da cópia da pesquisa (dados-brutos/antropometria/frisancho-percentis.md)
// e grava src/data/frisancho.json (spec antropometria-completa, D-1037). Nenhum número é redigitado: cada célula sai do
// bloco CSV da pesquisa, nas unidades da fonte (1990: CB em cm, DCT em mm, áreas em cm²; 1981: CMB em mm, AMB em mm²).
// Uso: node scripts/dados/importar-frisancho.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const ORIGEM = join(raiz, 'dados-brutos', 'antropometria', 'frisancho-percentis.md')
const DESTINO = join(raiz, 'src', 'data', 'frisancho.json')

/** Seção da pesquisa → título do bloco (sem o sexo) → chave e unidade no JSON. */
const TABELAS = {
  '3.18.1': {
    'CB (cm)': { chave: 'cb', unidade: 'cm' },
    'DCT (mm)': { chave: 'dct', unidade: 'mm' },
    'AMBc — área muscular do braço CORRIGIDA, "sem osso" (cm²)': { chave: 'ambCorrigida', unidade: 'cm²' },
    'AGB — área de gordura do braço (cm²)': { chave: 'agb', unidade: 'cm²' },
  },
  '3.18.2': {
    'CMB (mm — dividir por 10 para cm)': { chave: 'cmb', unidade: 'mm' },
    'AMB SEM correção óssea (mm² — dividir por 100 para cm²)': { chave: 'amb', unidade: 'mm²' },
  },
}
const PERCENTIS = { '3.18.1': [5, 10, 15, 25, 50, 75, 85, 90, 95], '3.18.2': [5, 10, 25, 50, 75, 90, 95] }
const NOME_DA_SECAO = { '3.18.1': 'frisancho1990', '3.18.2': 'frisancho1981' }
const SEXO = { Homens: 'M', Mulheres: 'F' }

/** Lê os blocos "**Título — Sexo** · marca" seguidos de ```csv, dentro de cada seção "#### 3.18.x". */
export function extrair(texto) {
  const linhas = texto.split(/\r?\n/)
  const saida = {}
  let secao = null
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i]
    const titulo = /^#### (3\.18\.\d)/.exec(linha)
    if (titulo) {
      secao = titulo[1]
      continue
    }
    const bloco = /^\*\*(.+) — (Homens|Mulheres)\*\* · (.+)$/.exec(linha)
    if (!bloco || !secao || !TABELAS[secao]) continue
    const [, nome, sexo, marca] = bloco
    const destino = TABELAS[secao][nome]
    if (!destino) continue
    // O CSV começa duas linhas abaixo (linha em branco e a cerca ```csv).
    let j = i + 1
    while (linhas[j] !== '```csv') {
      if (j > i + 3) throw new Error(`Sem bloco CSV depois de "${linha}"`)
      j++
    }
    const cabecalho = linhas[j + 1]
    const esperado = ['idade_min', 'idade_max', ...PERCENTIS[secao].map((p) => `P${p}`)].join(',')
    if (cabecalho !== esperado) throw new Error(`Cabeçalho inesperado em "${nome} — ${sexo}": ${cabecalho}`)
    const linhasDaTabela = []
    for (let k = j + 2; linhas[k] !== '```'; k++) {
      const celulas = linhas[k].split(',').map(Number)
      if (celulas.length !== PERCENTIS[secao].length + 2 || celulas.some((c) => !Number.isFinite(c))) {
        throw new Error(`Linha inválida em "${nome} — ${sexo}": ${linhas[k]}`)
      }
      const [de, ate, ...valores] = celulas
      linhasDaTabela.push({ de, ate, valores })
    }
    const chaveSecao = NOME_DA_SECAO[secao]
    saida[chaveSecao] ??= { percentis: PERCENTIS[secao] }
    saida[chaveSecao][destino.chave] ??= { unidade: destino.unidade }
    saida[chaveSecao][destino.chave][`marca${SEXO[sexo]}`] = marca
    saida[chaveSecao][destino.chave][SEXO[sexo]] = linhasDaTabela
  }
  for (const [secao, tabelas] of Object.entries(TABELAS)) {
    for (const { chave } of Object.values(tabelas)) {
      const t = saida[NOME_DA_SECAO[secao]]?.[chave]
      if (!t?.M || !t?.F) throw new Error(`Tabela ${NOME_DA_SECAO[secao]}.${chave} incompleta`)
    }
  }
  return saida
}

/** Uma linha de tabela por linha de texto: o arquivo fica fácil de conferir contra a pesquisa. */
function serializar(dados) {
  const emLinha = (lista) => lista.replace(/\s+/g, ' ').trim()
  return (
    JSON.stringify(dados, null, 2)
      .replace(/\{\s+"de": ([\d.]+),\s+"ate": ([\d.]+),\s+"valores": \[([\s\d.,]+)\]\s+\}/g, (_, de, ate, valores) => `{ "de": ${de}, "ate": ${ate}, "valores": [${emLinha(valores)}] }`)
      .replace(/"percentis": \[([\s\d,]+)\]/g, (_, lista) => `"percentis": [${emLinha(lista)}]`) + '\n'
  )
}

const executadoDiretamente = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (executadoDiretamente) {
  const dados = {
    fonte:
      'Pesquisa "Base científica do módulo de antropometria do MetaNutri" (03/11/2026), seção 3.18, copiada sem edição em dados-brutos/antropometria/frisancho-percentis.md. Frisancho 1990: maioria entre São Camilo 2025, CEPRAN/UNESP 2014 e Anahp 2022. Frisancho 1981: o original (Am J Clin Nutr 1981;34(11):2540-5).',
    ...extrair(readFileSync(ORIGEM, 'utf8')),
  }
  writeFileSync(DESTINO, serializar(dados), 'utf8')
  console.log(`Tabelas de Frisancho gravadas em ${DESTINO}`)
}
