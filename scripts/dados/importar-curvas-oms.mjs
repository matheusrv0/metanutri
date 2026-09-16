// Extrai os parâmetros LMS das curvas da OMS (IMC-para-idade e estatura-para-idade) das planilhas
// oficiais em dados-brutos/oms/ e grava src/data/curvas-oms.json, por mês de 12 a 228 meses.
// Uso: node scripts/dados/importar-curvas-oms.mjs
//
// Sem dependências: o .xlsx é um arquivo ZIP; lemos o diretório central e descomprimimos com zlib.
import { readFileSync, writeFileSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const pasta = join(raiz, 'dados-brutos', 'oms')
const DESTINO = join(raiz, 'src', 'data', 'curvas-oms.json')

/** Dias por mês usados pela OMS para converter idade em meses para dias. */
export const DIAS_POR_MES = 30.4375
const MES_INICIAL = 12
const MES_FINAL = 228

// ---------- leitura mínima de ZIP ----------

export function lerZip(buffer) {
  const fimCentral = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (fimCentral < 0) throw new Error('Arquivo não é um ZIP válido')
  const total = buffer.readUInt16LE(fimCentral + 10)
  let p = buffer.readUInt32LE(fimCentral + 16)
  const arquivos = new Map()
  for (let i = 0; i < total; i++) {
    if (buffer.readUInt32LE(p) !== 0x02014b50) throw new Error('Diretório central corrompido')
    const metodo = buffer.readUInt16LE(p + 10)
    const tamanhoComprimido = buffer.readUInt32LE(p + 20)
    const nomeLen = buffer.readUInt16LE(p + 28)
    const extraLen = buffer.readUInt16LE(p + 30)
    const comentarioLen = buffer.readUInt16LE(p + 32)
    const offsetLocal = buffer.readUInt32LE(p + 42)
    const nome = buffer.toString('utf8', p + 46, p + 46 + nomeLen)
    const localNome = buffer.readUInt16LE(offsetLocal + 26)
    const localExtra = buffer.readUInt16LE(offsetLocal + 28)
    const inicio = offsetLocal + 30 + localNome + localExtra
    const dados = buffer.subarray(inicio, inicio + tamanhoComprimido)
    arquivos.set(nome, () => (metodo === 0 ? dados : inflateRawSync(dados)).toString('utf8'))
    p += 46 + nomeLen + extraLen + comentarioLen
  }
  return arquivos
}

// ---------- leitura mínima de planilha ----------

const decodificar = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

export function lerPlanilha(caminho) {
  const zip = lerZip(readFileSync(caminho))
  const textos = zip.get('xl/sharedStrings.xml')
  const compartilhadas = textos
    ? [...textos().matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => decodificar(m[1].replace(/<[^>]+>/g, '')))
    : []
  const folha = zip.get('xl/worksheets/sheet1.xml')
  if (!folha) throw new Error(`Planilha sem sheet1: ${caminho}`)
  const linhas = []
  for (const linha of folha().matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const celulas = {}
    for (const c of linha[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const valor = (c[3] ?? '').match(/<v>([\s\S]*?)<\/v>/)?.[1]
      if (valor === undefined) continue
      celulas[c[1]] = /t="s"/.test(c[2]) ? compartilhadas[Number(valor)] : Number(valor)
    }
    linhas.push(celulas)
  }
  const [cabecalho, ...dados] = linhas
  const colunas = Object.entries(cabecalho).map(([letra, nome]) => [letra, String(nome).trim()])
  return dados.map((l) => Object.fromEntries(colunas.map(([letra, nome]) => [nome, l[letra]])))
}

// ---------- montagem ----------

const arred = (v, casas) => Math.round(v * 10 ** casas) / 10 ** casas

function linhaMensal(meses, r) {
  return {
    meses,
    L: arred(r.L, 6),
    M: arred(r.M, 6),
    S: arred(r.S, 7),
    sd2neg: arred(r.SD2neg, 3),
    sd2: arred(r.SD2, 3),
    sd3neg: arred(r.SD3neg, 3),
    sd3: arred(r.SD3, 3),
  }
}

function curva(arquivoAte5Anos, arquivo5a19) {
  const porDia = new Map(lerPlanilha(join(pasta, arquivoAte5Anos)).map((r) => [r.Day, r]))
  const porMes = new Map(lerPlanilha(join(pasta, arquivo5a19)).map((r) => [r.Month, r]))
  const saida = []
  for (let meses = MES_INICIAL; meses <= MES_FINAL; meses++) {
    if (meses <= 60) {
      const dia = Math.round(meses * DIAS_POR_MES)
      const r = porDia.get(dia)
      if (!r) throw new Error(`Dia ${dia} ausente em ${arquivoAte5Anos}`)
      saida.push(linhaMensal(meses, r))
    } else {
      const r = porMes.get(meses)
      if (!r) throw new Error(`Mês ${meses} ausente em ${arquivo5a19}`)
      saida.push(linhaMensal(meses, r))
    }
  }
  return saida
}

export function converter() {
  return {
    fonte: {
      ate5Anos: 'WHO Child Growth Standards (2006), expanded tables (z-scores), BMI-for-age e length/height-for-age',
      de5a19Anos: 'WHO Growth Reference 5-19 years (2007), BMI-for-age e height-for-age (z-scores)',
      urls: ['https://www.who.int/tools/child-growth-standards', 'https://www.who.int/tools/growth-reference-data-for-5to19-years'],
      baixadoEm: '2026-09-15',
      conversao: `Meses até 60 convertidos para dia = round(meses × ${DIAS_POR_MES}); de 61 a 228 meses, tabela mensal.`,
    },
    imcIdade: {
      M: curva('bfa-boys-zscore-expanded-tables.xlsx', 'bmi-boys-z-who-2007-exp.xlsx'),
      F: curva('bfa-girls-zscore-expanded-tables.xlsx', 'bmi-girls-z-who-2007-exp.xlsx'),
    },
    estaturaIdade: {
      M: curva('lhfa-boys-zscore-expanded-tables.xlsx', 'hfa-boys-z-who-2007-exp.xlsx'),
      F: curva('lhfa-girls-zscore-expanded-tables.xlsx', 'hfa-girls-z-who-2007-exp.xlsx'),
    },
  }
}

const executadoDiretamente = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (executadoDiretamente) {
  const saida = converter()
  writeFileSync(DESTINO, JSON.stringify(saida) + '\n', 'utf8')
  console.log(`Curvas OMS (${saida.imcIdade.M.length} meses por curva) gravadas em ${DESTINO}`)
}
