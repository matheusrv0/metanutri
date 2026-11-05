// Planilhas de teste montadas à mão (spec importar-pacientes, DP-IP-2): sem o jszip nem outro pacote. O texto sai nas
// codificações que o Excel e o Google Planilhas usam; o zip sai "stored" (sem compressão) ou comprimido pelo
// `CompressionStream` do próprio ambiente; o XLSX é o mínimo que o Excel escreve. Sem import de alias: o Playwright
// também usa este arquivo (e2e/servidor-falso/importar-pacientes.spec.ts).

// ---------- Texto ----------

/** O "ANSI" do Excel no Brasil. Só os caracteres do Latin-1 (os acentos do português) e o resto do ASCII. */
export function emWindows1252(texto: string): Uint8Array {
  const bytes = new Uint8Array(texto.length)
  for (let i = 0; i < texto.length; i += 1) {
    const codigo = texto.charCodeAt(i)
    if (codigo > 0xff || (codigo >= 0x80 && codigo < 0xa0)) throw new Error(`Fora do Latin-1: ${texto[i]}`)
    bytes[i] = codigo
  }
  return bytes
}

export function emUtf8(texto: string, comBom = false): Uint8Array {
  const corpo = new TextEncoder().encode(texto)
  if (!comBom) return corpo
  const bytes = new Uint8Array(corpo.length + 3)
  bytes.set([0xef, 0xbb, 0xbf])
  bytes.set(corpo, 3)
  return bytes
}

/** O "Texto Unicode" do Excel: UTF-16 little-endian com BOM. */
export function emUtf16(texto: string, ordem: 'le' | 'be' = 'le'): Uint8Array {
  const bytes = new Uint8Array(2 + texto.length * 2)
  bytes.set(ordem === 'le' ? [0xff, 0xfe] : [0xfe, 0xff])
  for (let i = 0; i < texto.length; i += 1) {
    const codigo = texto.charCodeAt(i)
    const [a, b] = ordem === 'le' ? [codigo & 0xff, codigo >> 8] : [codigo >> 8, codigo & 0xff]
    bytes[2 + i * 2] = a
    bytes[3 + i * 2] = b
  }
  return bytes
}

// ---------- Zip ----------

const TABELA_CRC = (() => {
  const tabela = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabela[n] = c >>> 0
  }
  return tabela
})()

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of bytes) crc = (TABELA_CRC[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

async function comprimir(bytes: Uint8Array): Promise<Uint8Array> {
  const fluxo = new ReadableStream<BufferSource>({
    start(controle) {
      controle.enqueue(new Uint8Array(bytes))
      controle.close()
    },
  }).pipeThrough(new CompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(fluxo).arrayBuffer())
}

export interface EntradaDoZip {
  readonly nome: string
  readonly dados: Uint8Array | string
  /** Sem dizer, sai comprimida. */
  readonly comprimir?: boolean
  /** Marca a entrada como criptografada (o leitor recusa). */
  readonly criptografada?: boolean
}

/** Um zip com as entradas na ordem dada. */
export async function montarZip(entradas: readonly EntradaDoZip[], comprimirTudo = true): Promise<Uint8Array> {
  const locais: Uint8Array[] = []
  const centrais: Uint8Array[] = []
  let deslocamento = 0
  for (const entrada of entradas) {
    const nome = new TextEncoder().encode(entrada.nome)
    const dados = typeof entrada.dados === 'string' ? new TextEncoder().encode(entrada.dados) : entrada.dados
    const metodo = (entrada.comprimir ?? comprimirTudo) ? 8 : 0
    const guardado = metodo === 8 ? await comprimir(dados) : dados
    const crc = crc32(dados)
    const bandeiras = 0x0800 | (entrada.criptografada ? 1 : 0)

    const local = new Uint8Array(30 + nome.length + guardado.length)
    const vl = new DataView(local.buffer)
    vl.setUint32(0, 0x04034b50, true)
    vl.setUint16(4, 20, true)
    vl.setUint16(6, bandeiras, true)
    vl.setUint16(8, metodo, true)
    vl.setUint32(14, crc, true)
    vl.setUint32(18, guardado.length, true)
    vl.setUint32(22, dados.length, true)
    vl.setUint16(26, nome.length, true)
    local.set(nome, 30)
    local.set(guardado, 30 + nome.length)
    locais.push(local)

    const central = new Uint8Array(46 + nome.length)
    const vc = new DataView(central.buffer)
    vc.setUint32(0, 0x02014b50, true)
    vc.setUint16(4, 20, true)
    vc.setUint16(6, 20, true)
    vc.setUint16(8, bandeiras, true)
    vc.setUint16(10, metodo, true)
    vc.setUint32(16, crc, true)
    vc.setUint32(20, guardado.length, true)
    vc.setUint32(24, dados.length, true)
    vc.setUint16(28, nome.length, true)
    vc.setUint32(42, deslocamento, true)
    central.set(nome, 46)
    centrais.push(central)
    deslocamento += local.length
  }
  const tamanhoCentral = centrais.reduce((soma, c) => soma + c.length, 0)
  const fim = new Uint8Array(22)
  const vf = new DataView(fim.buffer)
  vf.setUint32(0, 0x06054b50, true)
  vf.setUint16(8, entradas.length, true)
  vf.setUint16(10, entradas.length, true)
  vf.setUint32(12, tamanhoCentral, true)
  vf.setUint32(16, deslocamento, true)
  const partes = [...locais, ...centrais, fim]
  const saida = new Uint8Array(partes.reduce((soma, p) => soma + p.length, 0))
  let posicao = 0
  for (const parte of partes) {
    saida.set(parte, posicao)
    posicao += parte.length
  }
  return saida
}

// ---------- XLSX ----------

/**
 * Uma célula de teste. Texto vai para os textos compartilhados (ou em linha, com `emLinha`); número é número; `data` é o
 * número de série do Excel com o estilo de data; `formula` guarda (ou não) o valor calculado.
 */
export type CelulaDeTeste =
  | string
  | number
  | null
  | { readonly emLinha: string }
  | { readonly data: number; readonly estilo?: 'embutido' | 'proprio' }
  | { readonly decimal: number }
  | { readonly formula: string; readonly valor?: string | number }
  | { readonly logico: boolean }
  | { readonly erro: string }
  | { readonly dataIso: string }

export interface AbaDeTeste {
  readonly nome: string
  readonly linhas: readonly (readonly CelulaDeTeste[] | null)[]
  readonly oculta?: boolean
  /** Linhas puladas no arquivo: a primeira linha do array vira esta (o Excel guarda `r`). */
  readonly primeiraLinha?: number
  readonly mesclas?: readonly string[]
}

export interface OpcoesDoXlsx {
  readonly abas: readonly AbaDeTeste[]
  readonly comprimir?: boolean
  readonly data1904?: boolean
  /** Um prefixo de espaço de nomes nos elementos da aba (`x:row`), como alguns geradores fazem. */
  readonly prefixo?: boolean
}

export function letraDaColuna(indice: number): string {
  let n = indice + 1
  let letras = ''
  while (n > 0) {
    const resto = (n - 1) % 26
    letras = String.fromCharCode(65 + resto) + letras
    n = Math.floor((n - 1) / 26)
  }
  return letras
}

const escapar = (texto: string): string => texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const PRINCIPAL = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const RELACOES = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

/** O XLSX mínimo: pasta de trabalho, relações, estilos (data embutida 14, data própria 164, decimal 4) e as abas. */
export async function montarXlsx({ abas, comprimir = true, data1904 = false, prefixo = false }: OpcoesDoXlsx): Promise<Uint8Array> {
  const compartilhados: string[] = []
  const indiceDe = (texto: string): number => {
    const achado = compartilhados.indexOf(texto)
    if (achado >= 0) return achado
    compartilhados.push(texto)
    return compartilhados.length - 1
  }
  const p = prefixo ? 'x:' : ''

  const celulaXml = (celula: CelulaDeTeste, ref: string): string => {
    if (celula === null) return ''
    if (typeof celula === 'string') return `<${p}c r="${ref}" t="s"><${p}v>${indiceDe(celula)}</${p}v></${p}c>`
    if (typeof celula === 'number') return `<${p}c r="${ref}"><${p}v>${celula}</${p}v></${p}c>`
    if ('emLinha' in celula) return `<${p}c r="${ref}" t="inlineStr"><${p}is><${p}t>${escapar(celula.emLinha)}</${p}t></${p}is></${p}c>`
    if ('data' in celula) return `<${p}c r="${ref}" s="${celula.estilo === 'proprio' ? 2 : 1}"><${p}v>${celula.data}</${p}v></${p}c>`
    if ('decimal' in celula) return `<${p}c r="${ref}" s="3"><${p}v>${celula.decimal}</${p}v></${p}c>`
    if ('formula' in celula) {
      const valor = celula.valor === undefined ? '' : `<${p}v>${typeof celula.valor === 'string' ? escapar(celula.valor) : celula.valor}</${p}v>`
      const tipo = typeof celula.valor === 'string' ? ' t="str"' : ''
      return `<${p}c r="${ref}"${tipo}><${p}f>${escapar(celula.formula)}</${p}f>${valor}</${p}c>`
    }
    if ('logico' in celula) return `<${p}c r="${ref}" t="b"><${p}v>${celula.logico ? 1 : 0}</${p}v></${p}c>`
    if ('erro' in celula) return `<${p}c r="${ref}" t="e"><${p}v>${escapar(celula.erro)}</${p}v></${p}c>`
    return `<${p}c r="${ref}" t="d"><${p}v>${celula.dataIso}</${p}v></${p}c>`
  }

  const abasXml = abas.map((aba) => {
    const inicio = aba.primeiraLinha ?? 1
    const linhas = aba.linhas
      .map((linha, i) => {
        if (linha === null) return ''
        const numero = inicio + i
        const celulas = linha.map((celula, j) => celulaXml(celula, `${letraDaColuna(j)}${numero}`)).join('')
        return `<${p}row r="${numero}">${celulas}</${p}row>`
      })
      .join('')
    const mesclas = aba.mesclas?.length ? `<${p}mergeCells count="${aba.mesclas.length}">${aba.mesclas.map((m) => `<${p}mergeCell ref="${m}"/>`).join('')}</${p}mergeCells>` : ''
    const raiz = prefixo ? `<x:worksheet xmlns:x="${PRINCIPAL}">` : `<worksheet xmlns="${PRINCIPAL}">`
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${raiz}<${p}sheetData>${linhas}</${p}sheetData>${mesclas}</${p}worksheet>`
  })

  const workbook =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="${PRINCIPAL}" xmlns:r="${RELACOES}">` +
    (data1904 ? '<workbookPr date1904="1"/>' : '<workbookPr/>') +
    `<sheets>${abas.map((aba, i) => `<sheet name="${escapar(aba.nome)}" sheetId="${i + 1}"${aba.oculta ? ' state="hidden"' : ''} r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`

  const relacoes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${RELACOES}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
    `<Relationship Id="rIdS" Type="${RELACOES}/sharedStrings" Target="sharedStrings.xml"/>` +
    `<Relationship Id="rIdE" Type="${RELACOES}/styles" Target="/xl/styles.xml"/></Relationships>`

  const estilos =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="${PRINCIPAL}">` +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy;@"/></numFmts>' +
    '<cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="14" applyNumberFormat="1"/><xf numFmtId="164" applyNumberFormat="1"/><xf numFmtId="4" applyNumberFormat="1"/></cellXfs></styleSheet>'

  // Os textos compartilhados só ficam prontos depois de montar as abas. O último vem em partes (texto rico), como o
  // Excel guarda uma célula com duas formatações, e com a leitura fonética, que não entra no texto.
  const textos =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<sst xmlns="${PRINCIPAL}" count="${compartilhados.length}" uniqueCount="${compartilhados.length}">` +
    compartilhados
      .map((t) => {
        const [antes, depois] = t.split('|rico|')
        return depois === undefined ? `<si><t xml:space="preserve">${escapar(t)}</t></si>` : `<si><r><t>${escapar(antes ?? '')}</t></r><r><t>${escapar(depois)}</t></r><rPh sb="0" eb="1"><t>FONETICA</t></rPh></si>`
      })
      .join('') +
    '</sst>'

  return montarZip(
    [
      { nome: '[Content_Types].xml', dados: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>' },
      { nome: '_rels/.rels', dados: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>' },
      { nome: 'xl/workbook.xml', dados: workbook },
      { nome: 'xl/_rels/workbook.xml.rels', dados: relacoes },
      ...abasXml.map((xml, i) => ({ nome: `xl/worksheets/sheet${i + 1}.xml`, dados: xml })),
      { nome: 'xl/sharedStrings.xml', dados: textos },
      { nome: 'xl/styles.xml', dados: estilos },
    ],
    comprimir,
  )
}

/** O número de série do Excel (sistema de 1900) de um dia. */
export function serialDoExcel(ano: number, mes: number, dia: number): number {
  return Math.round((Date.UTC(ano, mes - 1, dia) - Date.UTC(1899, 11, 30)) / 86_400_000)
}
