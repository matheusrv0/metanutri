// Extrai as equações de EER das DRI de Energia (NASEM 2023, tabelas S-2 a S-6, NCBI NBK591034)
// salvas em dados-brutos/energia/ e grava src/data/energia.json.
// Uso: node scripts/dados/importar-energia.mjs
//
// Unidades das equações (notas das tabelas): idade em anos, estatura em cm, peso em kg,
// gestação em semanas; resultado em kcal/dia.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { lerGrade } from './importar-dri.mjs'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const pasta = join(raiz, 'dados-brutos', 'energia')
const DESTINO = join(raiz, 'src', 'data', 'energia.json')
const tabela = (n) => readFileSync(join(pasta, `ncbi-NBK591034-tabS${n}.html`), 'utf8')

const CATEGORIAS = { Inactive: 'inativo', 'Low active': 'pouco-ativo', Active: 'ativo', 'Very active': 'muito-ativo' }

const numero = (s) => Number(s.replace(/,/g, ''))
const sinal = (s) => (/[–−-]/.test(s) ? -1 : 1)

/** "EER = –447.51 + (3.68 × age) + (13.01 × height) + ..." -> coeficientes. */
export function lerEquacao(texto) {
  const t = texto.replace(/\s+/g, ' ')
  const constante = t.match(/=\s*([–−-])?\s*([\d,]+\.?\d*)/)
  if (!constante) throw new Error(`Constante não encontrada: ${texto}`)
  const termo = (nome) => {
    const m = t.match(new RegExp(`([+–−-])\\s*\\(\\s*([\\d.]+)\\s*×\\s*${nome}\\s*\\)`))
    return m ? sinal(m[1]) * Number(m[2]) : 0
  }
  return {
    constante: (constante[1] ? -1 : 1) * numero(constante[2]),
    idade: termo('age'),
    estatura: termo('height'),
    peso: termo('weight'),
    gestacaoSemanas: termo('gestation'),
  }
}

function porCategoria(linhas, filtro) {
  const saida = {}
  for (const l of linhas.filter(filtro)) {
    const categoria = CATEGORIAS[l.pal]
    if (!categoria) throw new Error(`Categoria de atividade desconhecida: ${l.pal}`)
    saida[categoria] = lerEquacao(l.equacao)
  }
  if (Object.keys(saida).length !== 4) throw new Error('Esperadas 4 categorias de atividade')
  return saida
}

export function converter() {
  // S-2: crianças e adolescentes
  const s2 = lerGrade(tabela(2))
    .slice(1)
    .map(([faixa, sexo, pal, equacao]) => ({ faixa, sexo, pal, equacao }))
  const bebes = (sexo) => {
    const l = s2.find((x) => x.faixa.startsWith('6 months') && x.sexo === sexo)
    if (!l) throw new Error(`Equação 6 meses a 2,99 anos (${sexo}) ausente`)
    return lerEquacao(l.equacao)
  }
  const escolares = (sexo) => porCategoria(s2, (x) => x.faixa.startsWith('3 to 13') && x.sexo === sexo)
  const adolescentes = (sexo) => porCategoria(s2, (x) => x.faixa.startsWith('14 to 18') && x.sexo === sexo)

  // S-3: adultos
  const s3 = lerGrade(tabela(3))
    .slice(1)
    .map(([faixa, sexo, pal, equacao]) => ({ faixa, sexo, pal, equacao }))

  // S-4: gestação (2º e 3º trimestres)
  const s4 = lerGrade(tabela(4))
    .slice(1)
    .map(([, pal, equacao]) => ({ pal, equacao }))

  const semCrescimento = (eqs) => JSON.stringify(eqs)
  // As equações de 3-13 e 14-18 anos só diferem no custo de crescimento; conferimos isso.
  for (const sexo of ['M', 'F']) {
    if (semCrescimento(escolares(sexo)) !== semCrescimento(adolescentes(sexo))) {
      throw new Error(`Equações de 3-13 e 14-18 anos diferem para ${sexo}; revisar o importador`)
    }
  }

  // Constantes das notas de rodapé (conferidas contra o texto das notas em src/data/energia.test.ts)
  const custoCrescimento = [
    { sexo: 'M', idadeMin: 1, idadeMax: 2, kcal: 20, nota: 'meninos de 6 meses a 2,99 anos: 20 kcal/d' },
    { sexo: 'M', idadeMin: 3, idadeMax: 3, kcal: 20, nota: 'meninos, 3 anos: 20 kcal/d' },
    { sexo: 'M', idadeMin: 4, idadeMax: 8, kcal: 15, nota: 'meninos, 4 a 8 anos: 15 kcal/d' },
    { sexo: 'M', idadeMin: 9, idadeMax: 13, kcal: 25, nota: 'meninos, 9 a 13 anos: 25 kcal/d' },
    { sexo: 'M', idadeMin: 14, idadeMax: 18, kcal: 20, nota: 'meninos, 14 a 18 anos: 20 kcal/d' },
    { sexo: 'F', idadeMin: 1, idadeMax: 2, kcal: 15, nota: 'meninas de 12 a 35,99 meses: 15 kcal/d' },
    { sexo: 'F', idadeMin: 3, idadeMax: 3, kcal: 15, nota: 'meninas, 3 anos: 15 kcal/d' },
    { sexo: 'F', idadeMin: 4, idadeMax: 8, kcal: 15, nota: 'meninas, 4 a 8 anos: 15 kcal/d' },
    { sexo: 'F', idadeMin: 9, idadeMax: 13, kcal: 30, nota: 'meninas, 9 a 13 anos: 30 kcal/d' },
    { sexo: 'F', idadeMin: 14, idadeMax: 18, kcal: 20, nota: 'meninas, 14 a 18 anos: 20 kcal/d' },
  ]

  return {
    fonte: {
      nome: 'Dietary Reference Intakes for Energy, Summary Tables S-1 a S-6',
      publicacao: 'NASEM. Dietary Reference Intakes for Energy. Washington (DC): National Academies Press; 2023.',
      url: 'https://www.ncbi.nlm.nih.gov/books/NBK591034/',
      baixadoEm: '2026-09-15',
    },
    unidades: { idade: 'anos', estatura: 'cm', peso: 'kg', gestacao: 'semanas', resultado: 'kcal/dia' },
    categoriasAtividade: ['inativo', 'pouco-ativo', 'ativo', 'muito-ativo'],
    equacoes: {
      'crianca-1-2-M': bebes('M'),
      'crianca-1-2-F': bebes('F'),
      '3-18-M': escolares('M'),
      '3-18-F': escolares('F'),
      'adulto-M': porCategoria(s3, (x) => x.sexo === 'M'),
      'adulto-F': porCategoria(s3, (x) => x.sexo === 'F'),
      gestacao: porCategoria(s4, () => true),
    },
    custoCrescimento,
    gestacao: {
      semanaInicioSegundoTrimestre: 14,
      notaPrimeiroTrimestre: 'No 1º trimestre usa-se a equação de não gestante; depósito considerado desprezível.',
      depositoPorImcPreGestacional: { 'baixo-peso': 300, eutrofia: 200, sobrepeso: 150, obesidade: -50 },
    },
    lactacao: {
      exclusiva: { mesesMin: 0, mesesMax: 6, producaoLeite: 540, mobilizacao: 140 },
      parcial: { mesesMin: 7, mesesMax: 12, producaoLeite: 380, mobilizacao: 0 },
      notaAposDozeMeses: 'Sem valor definido nas tabelas para mais de 12 meses pós-parto.',
    },
  }
}

const executadoDiretamente = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (executadoDiretamente) {
  const saida = converter()
  writeFileSync(DESTINO, JSON.stringify(saida, null, 1) + '\n', 'utf8')
  console.log(`Equações de energia gravadas em ${DESTINO}`)
}
