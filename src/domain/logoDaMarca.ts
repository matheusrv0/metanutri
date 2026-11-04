// A logo da nutricionista (spec marca-no-link, D-951). O arquivo enviado vira uma cópia em PNG, pequena o bastante
// para o link abrir rápido no 4G do paciente. A regra mora aqui; quem desenha é o <canvas> do navegador, do lado da
// interface (`src/ui/marca/desenhistaDoNavegador.ts`), atrás da interface `Desenhista`.

/** D-951: o envio vai até 2 MB (DP-ML-4: 2 × 1024 × 1024 bytes). */
export const LOGO_ENVIO_MAX_BYTES = 2 * 1024 * 1024
/** D-951: a cópia guardada vai até 150 KB de PNG (153.600 bytes). O banco confere o mesmo teto (DP-ML-2). */
export const LOGO_MAX_BYTES = 150 * 1024
/** D-951: o maior lado da cópia guardada. */
export const LADO_DA_COPIA = 600
/** D-951: o lado maior da cópia, do primeiro tamanho tentado ao último. */
export const LADOS_DA_LOGO: readonly number[] = [LADO_DA_COPIA, 480, 360, 240]
/** CB-967 e DP-ML-32: o maior lado aceito no envio, lido no cabeçalho do arquivo antes de abrir a imagem. */
export const LADO_MAXIMO_DO_ENVIO = 8000

/** D-963: as frases da logo. */
export const ERROS_DA_LOGO = {
  formato: 'Use PNG, JPG, WebP ou SVG, até 2 MB.',
  leitura: 'Não foi possível ler esta imagem. Tente PNG ou JPG.',
  pesada: 'Use uma logo mais simples.',
} as const

/** CB-950: aviso, não erro. */
export const AVISO_LOGO_CLARA = 'A logo é clara demais para o fundo branco.'

/** O começo de toda logo guardada: PNG em base64, com a assinatura do PNG (`\x89PNG\r\n\x1a\n` = `iVBORw0KGgo`). */
export const PREFIXO_DA_LOGO = 'data:image/png;base64,'
const ASSINATURA_DO_PNG = 'iVBORw0KGgo'

const TIPOS: Readonly<Record<string, string>> = {
  'image/png': 'image/png',
  'image/jpeg': 'image/jpeg',
  'image/webp': 'image/webp',
  'image/svg+xml': 'image/svg+xml',
}

export type ConferenciaDoArquivo = { readonly tipo: 'ok'; readonly mime: string } | { readonly tipo: 'erro'; readonly mensagem: string }

/** A largura e a altura de uma imagem, em pixels. */
export interface Lados {
  readonly largura: number
  readonly altura: number
}

const ASCII = (texto: string): readonly number[] => Array.from(texto, (c) => c.charCodeAt(0))
const ASSINATURA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const ASSINATURA_JPEG = [0xff, 0xd8, 0xff]

/** Os bytes `esperados` estão em `bytes`, a partir de `inicio`. */
const temEm = (bytes: Uint8Array, inicio: number, esperados: readonly number[]): boolean => esperados.every((b, i) => bytes[inicio + i] === b)
const byte = (bytes: Uint8Array, i: number): number => bytes[i] ?? 0
const be16 = (bytes: Uint8Array, i: number): number => (byte(bytes, i) << 8) | byte(bytes, i + 1)
const be32 = (bytes: Uint8Array, i: number): number => byte(bytes, i) * 2 ** 24 + (byte(bytes, i + 1) << 16) + (byte(bytes, i + 2) << 8) + byte(bytes, i + 3)
const le16 = (bytes: Uint8Array, i: number): number => byte(bytes, i) | (byte(bytes, i + 1) << 8)
const le24 = (bytes: Uint8Array, i: number): number => le16(bytes, i) | (byte(bytes, i + 2) << 16)

/** Quanto do começo de um texto é lido para achar o `<svg`: sobra para o `<?xml`, comentários e o `<!DOCTYPE`. */
const INICIO_DO_SVG = 64 * 1024

/** O fim de `marca` a partir de `desde`, ou -1. */
function depoisDe(texto: string, marca: string, desde = 0): number {
  const i = texto.indexOf(marca, desde)
  return i < 0 ? -1 : i + marca.length
}

/** Onde termina a declaração do começo do texto: `<?xml …?>`, `<!-- … -->` ou `<!DOCTYPE …>` (com ou sem `[…]`). */
function fimDaDeclaracao(texto: string): number {
  if (texto.startsWith('<?')) return depoisDe(texto, '?>')
  if (texto.startsWith('<!--')) return depoisDe(texto, '-->')
  const colchete = texto.indexOf('[')
  const maior = texto.indexOf('>')
  if (colchete >= 0 && (maior < 0 || colchete < maior)) {
    const fecha = texto.indexOf(']', colchete)
    return fecha < 0 ? -1 : depoisDe(texto, '>', fecha)
  }
  return maior < 0 ? -1 : maior + 1
}

/** DP-ML-4: o SVG é texto que, depois do `<?xml`, dos comentários e do `<!DOCTYPE`, começa por `<svg`. */
function ehTextoDeSvg(bytes: Uint8Array): boolean {
  // O TextDecoder já tira o BOM do UTF-8 do começo.
  let texto = new TextDecoder().decode(bytes.subarray(0, INICIO_DO_SVG)).trimStart()
  while (texto.startsWith('<?') || texto.startsWith('<!')) {
    const fim = fimDaDeclaracao(texto)
    if (fim < 0) return false
    texto = texto.slice(fim).trimStart()
  }
  return /^<svg[\s/>]/.test(texto)
}

/**
 * CA-1953 e DP-ML-4: o tipo pelo conteúdo, nunca pelo nome nem pelo tipo que o navegador diz. PNG, JPEG e WebP pela
 * assinatura dos primeiros bytes; SVG pelo texto. GIF (`GIF87a`, `GIF89a`), HEIC, PDF e o resto: nulo.
 */
export function tipoPeloConteudo(bytes: Uint8Array): string | null {
  if (temEm(bytes, 0, ASSINATURA_PNG)) return 'image/png'
  if (temEm(bytes, 0, ASSINATURA_JPEG)) return 'image/jpeg'
  if (temEm(bytes, 0, ASCII('RIFF')) && temEm(bytes, 8, ASCII('WEBP'))) return 'image/webp'
  return ehTextoDeSvg(bytes) ? 'image/svg+xml' : null
}

/** O PNG diz a largura e a altura no IHDR, o primeiro pedaço, logo depois da assinatura. */
function ladosDoPng(bytes: Uint8Array): Lados | null {
  if (bytes.length < 24 || !temEm(bytes, 12, ASCII('IHDR'))) return null
  return { largura: be32(bytes, 16), altura: be32(bytes, 20) }
}

/** Os marcadores SOF do JPEG trazem a altura e a largura: C0 a CF, menos C4 (DHT), C8 (JPG) e CC (DAC). */
const ehSof = (marcador: number): boolean => marcador >= 0xc0 && marcador <= 0xcf && marcador !== 0xc4 && marcador !== 0xc8 && marcador !== 0xcc
/** Marcadores sem tamanho: o começo (D8), o TEM (01), os RST (D0 a D7) e o byte de enchimento (00). */
const semTamanho = (marcador: number): boolean => marcador === 0xd8 || marcador === 0x01 || marcador === 0x00 || (marcador >= 0xd0 && marcador <= 0xd7)

/** O JPEG diz os lados no primeiro SOF, antes do começo da imagem (SOS). Anda de segmento em segmento, como o decodificador. */
function ladosDoJpeg(bytes: Uint8Array): Lados | null {
  let i = 2
  while (i < bytes.length) {
    // Bytes soltos antes do marcador e os FF de enchimento são pulados, como o decodificador faz.
    while (i < bytes.length && bytes[i] !== 0xff) i++
    while (i < bytes.length && bytes[i] === 0xff) i++
    const marcador = bytes[i]
    if (marcador === undefined) return null
    i++
    if (semTamanho(marcador)) continue
    // O fim (D9) ou o começo da imagem (DA) sem um SOF antes: não dá para saber o tamanho.
    if (marcador === 0xd9 || marcador === 0xda) return null
    if (ehSof(marcador)) return i + 7 <= bytes.length ? { altura: be16(bytes, i + 3), largura: be16(bytes, i + 5) } : null
    const tamanho = be16(bytes, i)
    if (tamanho < 2) return null
    i += tamanho
  }
  return null
}

/** O WebP diz os lados no primeiro pedaço: VP8X (o formato estendido), VP8 (com perda) ou VP8L (sem perda). */
function ladosDoWebp(bytes: Uint8Array): Lados | null {
  if (temEm(bytes, 12, ASCII('VP8X')) && bytes.length >= 30) return { largura: 1 + le24(bytes, 24), altura: 1 + le24(bytes, 27) }
  if (temEm(bytes, 12, ASCII('VP8 ')) && temEm(bytes, 23, [0x9d, 0x01, 0x2a]) && bytes.length >= 30) {
    return { largura: le16(bytes, 26) & 0x3fff, altura: le16(bytes, 28) & 0x3fff }
  }
  if (temEm(bytes, 12, ASCII('VP8L')) && bytes[20] === 0x2f && bytes.length >= 25) {
    const [b1, b2, b3, b4] = [byte(bytes, 21), byte(bytes, 22), byte(bytes, 23), byte(bytes, 24)]
    return { largura: 1 + (((b2 & 0x3f) << 8) | b1), altura: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)) }
  }
  return null
}

/** DP-ML-32: a largura e a altura lidas no cabeçalho, sem abrir a imagem. Nulo quando o cabeçalho não diz (ou é SVG). */
export function ladosPeloCabecalho(bytes: Uint8Array, mime: string): Lados | null {
  if (mime === 'image/png') return ladosDoPng(bytes)
  if (mime === 'image/jpeg') return ladosDoJpeg(bytes)
  if (mime === 'image/webp') return ladosDoWebp(bytes)
  return null
}

/**
 * CA-1953, CB-967, DP-ML-4 e DP-ML-32: a conferência do arquivo enviado, pelos bytes dele, antes de abrir a imagem. Até
 * 2 MB; PNG, JPEG, WebP ou SVG pelo conteúdo; e, menos no SVG (que o navegador desenha direto no tamanho da cópia), até
 * 8.000 px de lado pelo cabeçalho. Uma imagem maior trava o aparelho ao abrir, mesmo com poucos bytes.
 */
export function conferirArquivoDeLogo(bytes: Uint8Array): ConferenciaDoArquivo {
  const formato = { tipo: 'erro', mensagem: ERROS_DA_LOGO.formato } as const
  if (bytes.length > LOGO_ENVIO_MAX_BYTES) return formato
  const mime = tipoPeloConteudo(bytes)
  if (mime === null) return formato
  if (mime === 'image/svg+xml') return { tipo: 'ok', mime }
  const lados = ladosPeloCabecalho(bytes, mime)
  if (lados === null) return { tipo: 'erro', mensagem: ERROS_DA_LOGO.leitura }
  if (Math.max(lados.largura, lados.altura) > LADO_MAXIMO_DO_ENVIO) return { tipo: 'erro', mensagem: ERROS_DA_LOGO.pesada }
  return { tipo: 'ok', mime }
}

/** O que o <canvas> devolve de um desenho: o PNG e os pixels (RGBA), para a conferência da logo clara. */
export interface Desenho {
  readonly dataUrl: string
  readonly pixels: Uint8ClampedArray
}

export interface ImagemAberta {
  readonly largura: number
  readonly altura: number
  /** Desenha a imagem inteira neste tamanho e devolve o PNG. Pode lançar (o navegador recusou). */
  desenhar(largura: number, altura: number): Desenho
}

/** Quem abre e desenha a imagem: o navegador, na interface; um falso, nos testes. */
export interface Desenhista {
  /** Rejeita quando a imagem não abre. */
  abrir(dataUrl: string): Promise<ImagemAberta>
}

export type LogoPreparada =
  | { readonly tipo: 'ok'; readonly logo: string; readonly largura: number; readonly altura: number; readonly clara: boolean }
  | { readonly tipo: 'erro'; readonly mensagem: string }

/** Os bytes do conteúdo de um data URI em base64, sem decodificar. */
export function bytesDoDataUrl(dataUrl: string): number {
  const virgula = dataUrl.indexOf(',')
  const base64 = virgula < 0 ? '' : dataUrl.slice(virgula + 1)
  const sobra = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - sobra
}

/** O maior data URI que cabe nos 150 KB: o prefixo mais os 204.800 caracteres de base64. */
const CARACTERES_NO_MAXIMO = PREFIXO_DA_LOGO.length + Math.ceil(LOGO_MAX_BYTES / 3) * 4

/** DP-ML-2: a mesma regra da trava `marcas_logo_png` do banco. O link desconfia do que lê com ela (DP-ML-13). */
export function ehLogoPublicavel(logo: string): boolean {
  if (logo.length > CARACTERES_NO_MAXIMO || !logo.startsWith(PREFIXO_DA_LOGO + ASSINATURA_DO_PNG)) return false
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(logo.slice(PREFIXO_DA_LOGO.length))) return false
  return bytesDoDataUrl(logo) <= LOGO_MAX_BYTES
}

/**
 * CA-1973 e DP-ML-33: o link não abre uma logo publicada maior que a cópia que o app faz (600 px de lado). Lê só os 24
 * primeiros bytes (32 caracteres de base64): a assinatura e o IHDR. Sem IHDR legível, quem decide é o navegador, e a
 * imagem que não abre volta à logo do MetaNutri.
 */
export function logoCabeNoLink(logo: string): boolean {
  if (!logo.startsWith(PREFIXO_DA_LOGO)) return false
  let inicio: Uint8Array
  try {
    inicio = Uint8Array.from(atob(logo.slice(PREFIXO_DA_LOGO.length, PREFIXO_DA_LOGO.length + 32)), (c) => c.charCodeAt(0))
  } catch {
    return false
  }
  const lados = ladosDoPng(inicio)
  return lados === null || Math.max(lados.largura, lados.altura) <= LADO_DA_COPIA
}

/**
 * CB-952 e DP-ML-3: o SVG que pede algo de fora (imagem, fonte, folha de estilo). Dentro de <img> o navegador não busca,
 * e o desenho sairia diferente do que ela vê no programa. O `xmlns` não conta: é o nome do formato, não um pedido.
 */
export function svgPedeRecursoDeFora(texto: string): boolean {
  return /(?:href|src)\s*=\s*["']?\s*(?:https?:|\/\/)|url\(\s*["']?\s*(?:https?:|\/\/)|@import/i.test(texto)
}

/** O texto de um data URI de SVG, em base64 ou escrito por extenso. */
function textoDoDataUrl(dataUrl: string): string {
  const virgula = dataUrl.indexOf(',')
  if (virgula < 0) return ''
  const cabecalho = dataUrl.slice(0, virgula)
  const corpo = dataUrl.slice(virgula + 1)
  try {
    if (/;base64$/i.test(cabecalho)) {
      const binario = atob(corpo)
      return new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)))
    }
    return decodeURIComponent(corpo)
  } catch {
    return ''
  }
}

/** O mesmo conteúdo com o tipo conferido no cabeçalho: SVG só desenha em <img> com o tipo certo. */
function comTipo(dataUrl: string, mime: string): string {
  const virgula = dataUrl.indexOf(',')
  if (virgula < 0) return dataUrl
  const base64 = /;base64$/i.test(dataUrl.slice(0, virgula))
  return `data:${mime}${base64 ? ';base64' : ';charset=utf-8'},${dataUrl.slice(virgula + 1)}`
}

/** A linearização da WCAG 2.2 para cada valor de canal, calculada uma vez. */
const LINEAR = Array.from({ length: 256 }, (_, v) => {
  const c = v / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
})

/** Luminância de quem tem 3:1 com o branco: (1 + 0,05) / 3 − 0,05. Abaixo dela, o pixel aparece no branco. */
const LUMINANCIA_QUE_APARECE = 1.05 / 3 - 0.05
/** DP-ML-5: menos que isto dos pixels visíveis aparecendo no branco, a logo é clara demais. */
const PARTE_QUE_APARECE = 0.02

/**
 * CB-950 e DP-ML-5: clara demais quando menos de 2% dos pixels visíveis (alfa de 50% ou mais) têm 3:1 ou mais de
 * contraste com o branco (WCAG 2.2, 1.4.11). Toda transparente também é clara: não aparece.
 */
export function ehLogoClara(pixels: Uint8ClampedArray): boolean {
  let visiveis = 0
  let aparecem = 0
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if ((pixels[i + 3] ?? 0) < 128) continue
    visiveis += 1
    const l = 0.2126 * (LINEAR[pixels[i] ?? 0] ?? 0) + 0.7152 * (LINEAR[pixels[i + 1] ?? 0] ?? 0) + 0.0722 * (LINEAR[pixels[i + 2] ?? 0] ?? 0)
    if (l <= LUMINANCIA_QUE_APARECE) aparecem += 1
  }
  return visiveis === 0 || aparecem / visiveis < PARTE_QUE_APARECE
}

/** Os tamanhos a tentar, do maior ao menor, sem nunca aumentar a imagem e sem repetir. */
function tamanhosATentar(largura: number, altura: number): { readonly largura: number; readonly altura: number }[] {
  const maior = Math.max(largura, altura)
  const vistos = new Set<string>()
  const tamanhos: { largura: number; altura: number }[] = []
  for (const lado of LADOS_DA_LOGO) {
    const escala = Math.min(1, lado / maior)
    const t = { largura: Math.max(1, Math.round(largura * escala)), altura: Math.max(1, Math.round(altura * escala)) }
    const chave = `${t.largura}x${t.altura}`
    if (vistos.has(chave)) continue
    vistos.add(chave)
    tamanhos.push(t)
  }
  return tamanhos
}

/**
 * D-951: a cópia que vai para o perfil e para o link. Abre a imagem (com o tipo conferido) e desenha em PNG com o lado
 * maior em 600 px; se passar de 150 KB, em 480, 360 e 240. O SVG também sai em PNG: o texto dele nunca volta daqui
 * (CA-1955). O que pede recurso de fora não é aberto (CB-952).
 */
export async function prepararLogo(entrada: { readonly dataUrl: string; readonly mime: string }, desenhista: Desenhista): Promise<LogoPreparada> {
  const leitura = { tipo: 'erro', mensagem: ERROS_DA_LOGO.leitura } as const
  if (entrada.mime === 'image/svg+xml' && svgPedeRecursoDeFora(textoDoDataUrl(entrada.dataUrl))) return leitura

  let imagem: ImagemAberta
  try {
    imagem = await desenhista.abrir(comTipo(entrada.dataUrl, entrada.mime))
  } catch {
    return leitura
  }
  if (!(imagem.largura > 0) || !(imagem.altura > 0)) return leitura

  for (const tamanho of tamanhosATentar(imagem.largura, imagem.altura)) {
    let desenho: Desenho
    try {
      desenho = imagem.desenhar(tamanho.largura, tamanho.altura)
    } catch {
      return leitura
    }
    if (!desenho.dataUrl.startsWith(PREFIXO_DA_LOGO)) return leitura
    if (bytesDoDataUrl(desenho.dataUrl) <= LOGO_MAX_BYTES) {
      return { tipo: 'ok', logo: desenho.dataUrl, largura: tamanho.largura, altura: tamanho.altura, clara: ehLogoClara(desenho.pixels) }
    }
  }
  return { tipo: 'erro', mensagem: ERROS_DA_LOGO.pesada }
}

/** O tipo de uma logo já guardada (a de Configurações, DP-ML-12), para passá-la pela mesma redução. */
export function tipoDaLogoGuardada(logo: string): string | null {
  const mime = /^data:([^;,]+)/i.exec(logo)?.[1]?.toLowerCase() ?? ''
  return TIPOS[mime] ?? null
}
