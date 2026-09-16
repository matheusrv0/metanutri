// Extrai as tabelas-resumo das DRI (NASEM 2019, Apêndice J, NCBI NBK545442) salvas em
// dados-brutos/dri/ e grava src/data/dri.json.
// Uso: node scripts/dados/importar-dri.mjs
//
// Regras:
// - valor com "*" é AI (ingestão adequada); sem "*" em tabela de RDA/AI é RDA
// - "ND" ou célula vazia -> null
// - unidades convertidas para as da TACO (cobre em mg, fósforo e cloreto em mg)
// - bebês (0-12 meses) ficam de fora (SPEC D-1)
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const pasta = join(raiz, 'dados-brutos', 'dri')
const DESTINO = join(raiz, 'src', 'data', 'dri.json')
const tabela = (n) => readFileSync(join(pasta, `ncbi-NBK545442-appJ-tab${n}.html`), 'utf8')

// ---------- leitura de tabela HTML (rowspan/colspan, sobrescritos) ----------

function decodificar(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
}

export function lerGrade(html) {
  const inicio = html.indexOf('<table')
  const fim = html.indexOf('</table>')
  if (inicio < 0 || fim < 0) throw new Error('Tabela não encontrada no HTML')
  const trecho = html.slice(inicio, fim)
  const linhas = [...trecho.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[1])
  const grade = []
  linhas.forEach((linha, li) => {
    grade[li] ??= []
    let ci = 0
    for (const celula of linha.matchAll(/<(td|th)([^>]*)>([\s\S]*?)<\/\1>/g)) {
      while (grade[li][ci] !== undefined) ci++
      const atributos = celula[2]
      const rs = Number((atributos.match(/rowspan="(\d+)"/) ?? [0, 1])[1])
      const cs = Number((atributos.match(/colspan="(\d+)"/) ?? [0, 1])[1])
      const texto = decodificar(
        celula[3]
          .replace(/<sup[^>]*>[\s\S]*?<\/sup>/g, '')
          .replace(/<br\s*\/?>/g, ' ')
          .replace(/<[^>]+>/g, ''),
      )
        .replace(/\s+/g, ' ')
        .trim()
      for (let a = 0; a < rs; a++) {
        for (let b = 0; b < cs; b++) {
          grade[li + a] ??= []
          grade[li + a][ci + b] = texto
        }
      }
      ci += cs
    }
  })
  return grade
}

// ---------- estágios de vida ----------

const GRUPOS = { Children: 'crianca', Males: 'masculino', Females: 'feminino', Pregnancy: 'gestante', Lactation: 'lactante' }

function faixaEtaria(rotulo) {
  const r = rotulo.replace(/[−–-]/g, '-').replace(/\s+/g, '')
  if (/^>70y$/.test(r)) return { idadeMin: 71, idadeMax: null, sufixo: '71+' }
  const m = r.match(/^(\d+)-(\d+)y$/)
  if (!m) return null
  return { idadeMin: Number(m[1]), idadeMax: Number(m[2]), sufixo: `${m[1]}-${m[2]}` }
}

/** Linha que só nomeia o grupo ("Children", "Males"...): demais células vazias ou repetindo o nome. */
function ehLinhaDeGrupo(linha) {
  const nome = linha[0]
  if (!(nome in GRUPOS) && nome !== 'Infants') return false
  return linha.slice(1).every((c) => c === '' || c === nome)
}

/** Percorre uma tabela por estágio de vida, chamando `aoLer(estagioId, cabecalho, linha)`. */
function porEstagio(grade, aoLer) {
  const cabecalho = grade[0]
  let grupo = null
  for (const linha of grade.slice(1)) {
    if (ehLinhaDeGrupo(linha)) {
      grupo = linha[0] === 'Infants' ? null : GRUPOS[linha[0]]
      continue
    }
    const faixa = faixaEtaria(linha[0])
    if (!grupo || !faixa) continue // bebês ou linha sem faixa
    aoLer(`${grupo}-${faixa.sufixo}`, cabecalho, linha, grupo, faixa)
  }
}

/** Tabelas 2, 3 e 4 não repetem o nome do grupo em linha própria quando o grupo muda; inferimos pela ordem. */
function gradeComGrupos(grade) {
  const temLinhasDeGrupo = grade.some(ehLinhaDeGrupo)
  if (temLinhasDeGrupo) return grade
  const ordem = ['Infants', 'Children', 'Males', 'Females', 'Pregnancy', 'Lactation']
  const saida = [grade[0]]
  let grupoAtual = -1
  let ultimaIdade = Infinity
  for (const linha of grade.slice(1)) {
    const r = linha[0].replace(/[−–-]/g, '-').replace(/\s+/g, '')
    const idade = /mo$/.test(r) ? 0 : /^>70y$/.test(r) ? 71 : Number((r.match(/^(\d+)/) ?? [0, NaN])[1])
    const inicioDeBloco = idade < ultimaIdade || grupoAtual < 0
    if (inicioDeBloco) {
      grupoAtual++
      if (ordem[grupoAtual] === 'Infants' && idade > 0) grupoAtual++
      if (ordem[grupoAtual] === 'Children' && idade >= 9) grupoAtual++
      saida.push(new Array(linha.length).fill(ordem[grupoAtual]))
    }
    ultimaIdade = idade
    saida.push(linha)
  }
  return saida
}

// ---------- valores ----------

export function lerValor(bruto) {
  if (bruto === undefined) return { valor: null, ai: false }
  const s = bruto.replace(/\^[a-z,]+/g, '').trim()
  if (s === '' || /^ND/.test(s)) return { valor: null, ai: false }
  const ai = s.includes('*')
  const numero = s.replace(/\*/g, '').replace(/[a-z]+$/i, '').replace(/[,\s]/g, '')
  const valor = Number(numero)
  if (!Number.isFinite(valor)) throw new Error(`Valor inválido na tabela: "${bruto}"`)
  return { valor, ai }
}

// Coluna (início do cabeçalho) -> [chave, fator de conversão para a unidade da chave]
const COLUNAS = [
  [/^Calcium/, 'calcio_mg', 1],
  [/^Copper \(μg\/d\)/, 'cobre_mg', 1 / 1000],
  [/^Copper \(Rg\/d\)/, 'cobre_mg', 1 / 1000],
  [/^Copper$/, 'cobre_mg', 1 / 1000],
  [/^Iodine/, 'iodo_mcg', 1],
  [/^Iron/, 'ferro_mg', 1],
  [/^Magnesium/, 'magnesio_mg', 1],
  [/^Manganese/, 'manganes_mg', 1],
  [/^Phosphorus \(mg\/d\)/, 'fosforo_mg', 1],
  [/^Phosphorus \(g\/d\)/, 'fosforo_mg', 1000],
  [/^Selenium/, 'selenio_mcg', 1],
  [/^Zinc/, 'zinco_mg', 1],
  [/^Potassium/, 'potassio_mg', 1],
  [/^Sodium/, 'sodio_mg', 1],
  [/^Vitamin A/, 'vitamina_a_rae_mcg', 1],
  [/^Vitamin C/, 'vitamina_c_mg', 1],
  [/^Vitamin D/, 'vitamina_d_mcg', 1],
  [/^Vitamin E/, 'vitamina_e_mg', 1],
  [/^Thiamin/, 'tiamina_mg', 1],
  [/^Riboflavin/, 'riboflavina_mg', 1],
  [/^Niacin/, 'niacina_mg', 1],
  [/^Vitamin B6/, 'piridoxina_mg', 1],
  [/^Folate/, 'folato_dfe_mcg', 1],
  [/^Vitamin B12/, 'vitamina_b12_mcg', 1],
  [/^Total Fiber/, 'fibra_g', 1],
  [/^Carbohydrate \(g\/d\)/, 'carboidrato_g', 1],
  [/^CHO \(g\/d\)/, 'carboidrato_g', 1],
  [/^Protein\s*\(g\/kg\/d\)/, 'proteina_g_kg', 1],
  [/^Protein\s*\(g\/d\)/, 'proteina_g', 1],
]

const NUTRIENTES = {
  calcio_mg: { rotulo: 'Cálcio', unidade: 'mg' },
  cobre_mg: { rotulo: 'Cobre', unidade: 'mg' },
  ferro_mg: { rotulo: 'Ferro', unidade: 'mg' },
  fosforo_mg: { rotulo: 'Fósforo', unidade: 'mg' },
  iodo_mcg: { rotulo: 'Iodo', unidade: 'µg' },
  magnesio_mg: { rotulo: 'Magnésio', unidade: 'mg' },
  manganes_mg: { rotulo: 'Manganês', unidade: 'mg' },
  potassio_mg: { rotulo: 'Potássio', unidade: 'mg' },
  selenio_mcg: { rotulo: 'Selênio', unidade: 'µg' },
  sodio_mg: { rotulo: 'Sódio', unidade: 'mg' },
  zinco_mg: { rotulo: 'Zinco', unidade: 'mg' },
  vitamina_a_rae_mcg: { rotulo: 'Vitamina A (RAE)', unidade: 'µg' },
  vitamina_c_mg: { rotulo: 'Vitamina C', unidade: 'mg' },
  vitamina_d_mcg: { rotulo: 'Vitamina D', unidade: 'µg' },
  vitamina_e_mg: { rotulo: 'Vitamina E', unidade: 'mg' },
  tiamina_mg: { rotulo: 'Tiamina (B1)', unidade: 'mg' },
  riboflavina_mg: { rotulo: 'Riboflavina (B2)', unidade: 'mg' },
  niacina_mg: { rotulo: 'Niacina (B3)', unidade: 'mg' },
  piridoxina_mg: { rotulo: 'Piridoxina (B6)', unidade: 'mg' },
  folato_dfe_mcg: { rotulo: 'Folato (DFE)', unidade: 'µg' },
  vitamina_b12_mcg: { rotulo: 'Vitamina B12', unidade: 'µg' },
  fibra_g: { rotulo: 'Fibra alimentar', unidade: 'g' },
  carboidrato_g: { rotulo: 'Carboidrato', unidade: 'g' },
  proteina_g: { rotulo: 'Proteína', unidade: 'g' },
  proteina_g_kg: { rotulo: 'Proteína por kg', unidade: 'g/kg' },
}

/** Quando o UL não se aplica à ingestão por alimentos (notas das tabelas 8 e 9). */
const ESCOPO_UL = {
  vitamina_a_rae_mcg: { escopo: 'vitamina-a-pre-formada', nota: 'UL apenas para vitamina A pré-formada (retinol), não para carotenoides.' },
  vitamina_e_mg: { escopo: 'sintetica', nota: 'UL aplica-se a formas sintéticas de suplementos e alimentos fortificados.' },
  niacina_mg: { escopo: 'sintetica', nota: 'UL aplica-se a formas sintéticas de suplementos e alimentos fortificados.' },
  folato_dfe_mcg: { escopo: 'sintetica', nota: 'UL aplica-se a formas sintéticas de suplementos e alimentos fortificados.' },
  magnesio_mg: { escopo: 'farmacologico', nota: 'UL representa apenas magnésio de agente farmacológico; não inclui alimentos e água.' },
}

function chaveDaColuna(titulo) {
  for (const [re, chave, fator] of COLUNAS) if (re.test(titulo)) return { chave, fator }
  return null
}

export function converter() {
  const estagios = {}
  const valores = {}
  const registrar = (estagioId, grupo, faixa) => {
    if (!estagios[estagioId]) {
      estagios[estagioId] = {
        id: estagioId,
        sexo: grupo === 'masculino' ? 'M' : grupo === 'crianca' ? null : 'F',
        gestante: grupo === 'gestante',
        lactante: grupo === 'lactante',
        idadeMin: faixa.idadeMin,
        idadeMax: faixa.idadeMax,
      }
      valores[estagioId] = {}
    }
  }
  const gravar = (estagioId, chave, campo, valor) => {
    valores[estagioId][chave] ??= { ear: null, rda: null, ai: null, ul: null }
    const atual = valores[estagioId][chave][campo]
    if (atual !== null && atual !== valor) {
      throw new Error(`Conflito em ${estagioId}.${chave}.${campo}: ${atual} vs ${valor}`)
    }
    valores[estagioId][chave][campo] = valor
  }
  const arred = (v) => Math.round(v * 1e6) / 1e6

  // EAR (tab1)
  porEstagio(lerGrade(tabela(1)), (id, cab, linha, grupo, faixa) => {
    registrar(id, grupo, faixa)
    cab.forEach((titulo, i) => {
      if (i === 0) return
      const col = chaveDaColuna(titulo)
      if (!col) return
      const { valor } = lerValor(linha[i])
      if (valor !== null) gravar(id, col.chave, 'ear', arred(valor * col.fator))
    })
  })

  // RDA / AI (tab2 vitaminas, tab3 elementos, tab4 macronutrientes)
  for (const n of [2, 3, 4]) {
    porEstagio(gradeComGrupos(lerGrade(tabela(n))), (id, cab, linha, grupo, faixa) => {
      registrar(id, grupo, faixa)
      cab.forEach((titulo, i) => {
        if (i === 0) return
        const col = chaveDaColuna(titulo)
        if (!col) return
        const { valor, ai } = lerValor(linha[i])
        if (valor !== null) gravar(id, col.chave, ai ? 'ai' : 'rda', arred(valor * col.fator))
      })
    })
  }

  // UL (tab8 vitaminas, tab9 elementos)
  for (const n of [8, 9]) {
    porEstagio(gradeComGrupos(lerGrade(tabela(n))), (id, cab, linha, grupo, faixa) => {
      registrar(id, grupo, faixa)
      cab.forEach((titulo, i) => {
        if (i === 0) return
        const col = chaveDaColuna(titulo)
        if (!col) return
        const { valor } = lerValor(linha[i])
        if (valor !== null) gravar(id, col.chave, 'ul', arred(valor * col.fator))
      })
    })
  }

  // CDRR do sódio (tab7): limite para reduzir risco de doença crônica, por faixa etária (sem sexo)
  const cdrrSodio = []
  for (const linha of lerGrade(tabela(7)).slice(1)) {
    if (!/^Sodium/.test(linha[0])) continue
    const idade = linha[1].replace(/[−–]/g, '-')
    const valor = Number((linha[2].match(/above ([\d,]+) mg/) ?? [0, NaN])[1].replace(/,/g, ''))
    const adulto = /≥\s*19/.test(idade)
    const m = idade.match(/(\d+)-(\d+)/)
    if (!adulto && !m) throw new Error(`Faixa de CDRR não reconhecida: ${idade}`)
    cdrrSodio.push({ idadeMin: adulto ? 19 : Number(m[1]), idadeMax: adulto ? null : Number(m[2]), valor })
  }

  // AMDR (tab5): faixas em % das kcal
  const amdrGrade = lerGrade(tabela(5))
  const faixasAmdr = [
    { id: '1-3', idadeMin: 1, idadeMax: 3, coluna: 1 },
    { id: '4-18', idadeMin: 4, idadeMax: 18, coluna: 2 },
    { id: 'adulto', idadeMin: 19, idadeMax: null, coluna: 3 },
  ]
  const intervalo = (txt) => {
    const m = txt.replace(/[−–]/g, '-').match(/^([\d.]+)-([\d.]+)$/)
    if (!m) throw new Error(`Intervalo AMDR inválido: ${txt}`)
    return { min: Number(m[1]), max: Number(m[2]) }
  }
  const linhaAmdr = (inicio) => {
    const l = amdrGrade.find((x) => x[0].startsWith(inicio))
    if (!l) throw new Error(`Linha AMDR ausente: ${inicio}`)
    return l
  }
  const amdr = faixasAmdr.map((f) => ({
    id: f.id,
    idadeMin: f.idadeMin,
    idadeMax: f.idadeMax,
    gordura_pct: intervalo(linhaAmdr('Fat')[f.coluna]),
    carboidrato_pct: intervalo(linhaAmdr('Carbohydrate')[f.coluna]),
    proteina_pct: intervalo(linhaAmdr('Protein')[f.coluna]),
  }))

  return {
    fonte: {
      nome: 'Dietary Reference Intakes Summary Tables (Appendix J)',
      publicacao: 'NASEM. Dietary Reference Intakes for Sodium and Potassium. Washington (DC): National Academies Press; 2019.',
      url: 'https://www.ncbi.nlm.nih.gov/books/NBK545442/',
      baixadoEm: '2026-09-15',
    },
    nutrientes: Object.fromEntries(
      Object.entries(NUTRIENTES).map(([chave, info]) => [
        chave,
        { ...info, ul: ESCOPO_UL[chave] ?? { escopo: 'total', nota: null } },
      ]),
    ),
    estagios: Object.values(estagios),
    valores,
    sodioCdrr: cdrrSodio,
    amdr,
  }
}

const executadoDiretamente = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (executadoDiretamente) {
  const saida = converter()
  writeFileSync(DESTINO, JSON.stringify(saida, null, 1) + '\n', 'utf8')
  console.log(`${saida.estagios.length} estágios de vida gravados em ${DESTINO}`)
}
