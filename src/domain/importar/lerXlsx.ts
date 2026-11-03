// O XLSX aberto no navegador (spec importar-pacientes, D-902): o zip pelo `zip.ts`, o XML pelo `DOMParser`. Sai cada
// aba visível com as linhas como texto, como o CSV (DP-IP-10): a data do Excel vira o dia (AAAA-MM-DD, sem
// ambiguidade), o número inteiro vira todos os dígitos (CB-908), o decimal usa vírgula, a fórmula vale o valor guardado
// (CB-903). Nada é escrito em lugar nenhum: o arquivo fica na memória da aba (D-914).
import { LIMITE_DE_COLUNAS } from './colunas.ts'
import { decodificar, registroComTexto, type Registro } from './lerTexto.ts'
import { abrirZip, type Zip } from './zip.ts'

export interface AbaLida {
  readonly nome: string
  /** As linhas, com o número de cada uma no arquivo. Junta até o limite de linhas com texto. */
  readonly registros: Registro[]
  /** A aba tinha mais linhas com texto que o limite: o que passou não foi lido (CA-1910). */
  readonly cortada: boolean
}

export interface OpcoesDeLeitura {
  /** Quantas linhas com texto juntar, no máximo, de cada aba. */
  readonly limiteDeLinhas: number
  readonly sinal?: AbortSignal | undefined
  /** Dá a vez ao navegador entre as partes (CB-911). */
  readonly darAVez?: (() => Promise<void>) | undefined
}

const RELACAO_DOCUMENTO = /\/officeDocument$/
const RELACAO_TEXTOS = /\/sharedStrings$/
const RELACAO_ESTILOS = /\/styles$/

/** Formatos de data embutidos do Excel (os de hora sozinha ficam de fora: nascimento não é hora). */
const FORMATOS_DE_DATA = new Set([14, 15, 16, 17, 22, ...Array.from({ length: 10 }, (_, i) => 27 + i), ...Array.from({ length: 9 }, (_, i) => 50 + i)])

const DIA_MS = 86_400_000

/**
 * D-920 e CB-928: Excel, Google Planilhas e LibreOffice não escrevem DTD. O XML que declara DTD ou entidade é recusado
 * antes do `DOMParser`, que é síncrono: uma explosão de entidades num arquivo de 300 bytes congelava a aba.
 */
const DTD = /<!DOCTYPE|<!ENTITY/i

function xml(texto: string): Document {
  if (DTD.test(texto)) throw new Error('XML com DTD.')
  const documento = new DOMParser().parseFromString(texto, 'application/xml')
  if (documento.getElementsByTagName('parsererror').length > 0) throw new Error('XML estragado.')
  return documento
}

async function lerXml(zip: Zip, caminho: string): Promise<Document | null> {
  const bytes = await zip.ler(caminho)
  return bytes === null ? null : xml(decodificar(bytes).texto)
}

const filhos = (elemento: Element, nome: string): Element[] => Array.from(elemento.children).filter((filho) => filho.localName === nome)
const filho = (elemento: Element, nome: string): Element | null => filhos(elemento, nome)[0] ?? null
const todos = (raiz: Document | Element, nome: string): Element[] => Array.from(raiz.getElementsByTagNameNS('*', nome))

/** O caminho dentro do zip de um alvo de relação, a partir da pasta de quem aponta. */
function resolver(pasta: string, alvo: string): string {
  if (alvo.startsWith('/')) return alvo.slice(1)
  const partes = pasta === '' ? [] : pasta.split('/')
  for (const parte of alvo.split('/')) {
    if (parte === '..') partes.pop()
    else if (parte !== '.' && parte !== '') partes.push(parte)
  }
  return partes.join('/')
}

const pastaDe = (caminho: string): string => caminho.slice(0, Math.max(0, caminho.lastIndexOf('/')))

interface Relacao {
  readonly tipo: string
  readonly caminho: string
}

async function relacoesDe(zip: Zip, caminho: string): Promise<Map<string, Relacao>> {
  const pasta = pastaDe(caminho)
  const nome = caminho.slice(caminho.lastIndexOf('/') + 1)
  const documento = await lerXml(zip, `${pasta === '' ? '' : `${pasta}/`}_rels/${nome}.rels`)
  const mapa = new Map<string, Relacao>()
  if (documento === null) return mapa
  for (const relacao of todos(documento, 'Relationship')) {
    const id = relacao.getAttribute('Id')
    const alvo = relacao.getAttribute('Target')
    if (id === null || alvo === null || relacao.getAttribute('TargetMode') === 'External') continue
    mapa.set(id, { tipo: relacao.getAttribute('Type') ?? '', caminho: resolver(pasta, alvo) })
  }
  return mapa
}

/** O texto de um `si` ou `is`: os `t` dele, sem a leitura fonética (`rPh`). */
function textoRico(elemento: Element): string {
  return todos(elemento, 't')
    .filter((t) => t.parentElement?.localName !== 'rPh')
    .map((t) => t.textContent ?? '')
    .join('')
}

/** O formato de data escrito à mão: tem dia ou ano fora das aspas, das barras de escape e dos colchetes. */
function ehFormatoDeData(codigo: string): boolean {
  const limpo = codigo
    .replace(/"[^"]*"/g, '')
    .replace(/\\./g, '')
    .replace(/\[[^\]]*\]/g, '')
  return /[dy]/i.test(limpo) && !/^general$/i.test(limpo.trim())
}

/** Quais estilos de célula (o `s`) são de data. */
function estilosDeData(documento: Document | null): ReadonlySet<number> {
  const datas = new Set<number>()
  if (documento === null) return datas
  const proprios = new Map<number, string>()
  for (const formato of todos(documento, 'numFmt')) proprios.set(Number(formato.getAttribute('numFmtId')), formato.getAttribute('formatCode') ?? '')
  const celulas = todos(documento, 'cellXfs')[0]
  if (celulas === undefined) return datas
  filhos(celulas, 'xf').forEach((xf, indice) => {
    const id = Number(xf.getAttribute('numFmtId') ?? 0)
    const codigo = proprios.get(id)
    if (FORMATOS_DE_DATA.has(id) || (codigo !== undefined && ehFormatoDeData(codigo))) datas.add(indice)
  })
  return datas
}

/** O dia de um número de série do Excel. Hora sozinha (menor que 1 no sistema de 1900) não é dia. */
function diaDoSerial(serial: number, data1904: boolean): string | null {
  const dias = Math.floor(serial)
  if (!data1904 && dias < 1) return null
  // O Excel conta o 29/02/1900, que não existiu: a partir do dia 60 a base é um dia antes.
  const base = data1904 ? Date.UTC(1904, 0, 1) : dias > 59 ? Date.UTC(1899, 11, 30) : Date.UTC(1899, 11, 31)
  const data = new Date(base + dias * DIA_MS)
  return Number.isNaN(data.getTime()) ? null : data.toISOString().slice(0, 10)
}

/** O número como texto: inteiro com todos os dígitos; decimal com vírgula. */
function numeroComoTexto(valor: string): string {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return valor
  if (Number.isInteger(numero) && Math.abs(numero) < 1e21) return numero.toFixed(0)
  const texto = String(numero)
  return /e/i.test(texto) ? texto : texto.replace('.', ',')
}

/** A coluna da referência ("B2" → 1). */
/** XFD, a última coluna do Excel (a 16.384ª): referência além dela não existe (D-919, CB-927). */
const ULTIMA_COLUNA = 16_383

/** A coluna da referência ("B2" → 1); `null` sem referência; `Infinity` além de XFD. */
function colunaDa(referencia: string | null): number | null {
  const letras = referencia?.match(/^[A-Z]+/i)?.[0]
  if (!letras) return null
  if (letras.length > 3) return Number.POSITIVE_INFINITY
  let indice = 0
  for (const letra of letras.toUpperCase()) indice = indice * 26 + (letra.charCodeAt(0) - 64)
  return indice - 1
}

interface Contexto {
  readonly textos: readonly string[]
  readonly datas: ReadonlySet<number>
  readonly data1904: boolean
}

function valorDa(celula: Element, contexto: Contexto): string {
  const tipo = celula.getAttribute('t')
  const v = filho(celula, 'v')?.textContent ?? null
  if (tipo === 'inlineStr') {
    const is = filho(celula, 'is')
    return is === null ? '' : textoRico(is)
  }
  if (v === null) return ''
  if (tipo === 's') return contexto.textos[Number(v)] ?? ''
  if (tipo === 'str' || tipo === 'e') return v
  if (tipo === 'b') return v === '1' ? 'VERDADEIRO' : 'FALSO'
  if (tipo === 'd') return /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : v
  const estilo = Number(celula.getAttribute('s') ?? 0)
  if (contexto.datas.has(estilo)) {
    const numero = Number(v)
    const dia = Number.isFinite(numero) ? diaDoSerial(numero, contexto.data1904) : null
    if (dia !== null) return dia
  }
  return numeroComoTexto(v)
}

/** As abas visíveis do XLSX, na ordem do arquivo; se todas forem ocultas, todas. Lança quando o arquivo não é XLSX. */
export async function lerXlsx(bytes: Uint8Array, { limiteDeLinhas, sinal, darAVez }: OpcoesDeLeitura): Promise<AbaLida[]> {
  const zip = await abrirZip(bytes)
  const raiz = await relacoesDe(zip, '')
  const caminhoDoLivro = [...raiz.values()].find((r) => RELACAO_DOCUMENTO.test(r.tipo))?.caminho ?? 'xl/workbook.xml'
  const livro = await lerXml(zip, caminhoDoLivro)
  if (livro === null) throw new Error('Sem a pasta de trabalho.')
  const relacoes = await relacoesDe(zip, caminhoDoLivro)
  const pasta = pastaDe(caminhoDoLivro)
  const caminhoDe = (tipo: RegExp, reserva: string) => [...relacoes.values()].find((r) => tipo.test(r.tipo))?.caminho ?? resolver(pasta, reserva)

  const documentoDeTextos = await lerXml(zip, caminhoDe(RELACAO_TEXTOS, 'sharedStrings.xml'))
  const textos = documentoDeTextos === null ? [] : todos(documentoDeTextos, 'si').map(textoRico)
  const datas = estilosDeData(await lerXml(zip, caminhoDe(RELACAO_ESTILOS, 'styles.xml')))
  const propriedades = todos(livro, 'workbookPr')[0]
  const data1904 = propriedades?.getAttribute('date1904') === '1' || propriedades?.getAttribute('date1904') === 'true'
  const contexto: Contexto = { textos, datas, data1904 }

  const declaradas = todos(livro, 'sheet').map((aba) => ({
    nome: aba.getAttribute('name') ?? '',
    oculta: aba.getAttribute('state') === 'hidden' || aba.getAttribute('state') === 'veryHidden',
    id: aba.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') ?? aba.getAttribute('r:id'),
  }))
  const visiveis = declaradas.some((aba) => !aba.oculta) ? declaradas.filter((aba) => !aba.oculta) : declaradas

  const abas: AbaLida[] = []
  for (const aba of visiveis) {
    const caminho = aba.id === null ? undefined : relacoes.get(aba.id)?.caminho
    const documento = caminho === undefined ? null : await lerXml(zip, caminho)
    if (documento === null) continue
    const registros: Registro[] = []
    let comTexto = 0
    let cortada = false
    let anterior = 0
    let lidas = 0
    for (const linha of todos(documento, 'row')) {
      lidas += 1
      if (lidas % 250 === 0) {
        if (sinal?.aborted) throw new DOMException('Leitura cancelada.', 'AbortError')
        await darAVez?.()
      }
      // D-921 e CB-925: as marcas e as correções são guardadas pelo número; o que não avança vira o seguinte.
      const declarado = Number(linha.getAttribute('r'))
      const numero = Number.isInteger(declarado) && declarado > anterior ? declarado : anterior + 1
      anterior = numero
      const celulas: string[] = []
      let coluna = -1
      for (const celula of filhos(linha, 'c')) {
        coluna = colunaDa(celula.getAttribute('r')) ?? coluna + 1
        // CB-927: a célula além de XFD é ignorada.
        if (coluna > ULTIMA_COLUNA) continue
        // D-919: a célula além da 200ª coluna não estica a linha; o texto dela vai para a 201ª, que a análise corta e
        // só usa para saber que havia colunas além das 200.
        const valor = valorDa(celula, contexto)
        if (coluna >= LIMITE_DE_COLUNAS) {
          while (celulas.length < LIMITE_DE_COLUNAS) celulas.push('')
          if (valor.trim() !== '') celulas[LIMITE_DE_COLUNAS] = valor
          continue
        }
        while (celulas.length < coluna) celulas.push('')
        celulas[coluna] = valor
      }
      if (!registroComTexto(celulas)) continue
      if (comTexto === limiteDeLinhas) {
        cortada = true
        break
      }
      comTexto += 1
      registros.push({ numero, celulas })
    }
    if (sinal?.aborted) throw new DOMException('Leitura cancelada.', 'AbortError')
    abas.push({ nome: aba.nome, registros, cortada })
  }
  if (abas.length === 0) throw new Error('Sem abas.')
  return abas
}
