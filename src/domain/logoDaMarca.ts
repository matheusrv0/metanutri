// A logo da nutricionista (spec marca-no-link, D-951). O arquivo enviado vira uma cópia em PNG, pequena o bastante
// para o link abrir rápido no 4G do paciente. A regra mora aqui; quem desenha é o <canvas> do navegador, do lado da
// interface (`src/ui/marca/desenhistaDoNavegador.ts`), atrás da interface `Desenhista`.

/** D-951: o envio vai até 2 MB (DP-ML-4: 2 × 1024 × 1024 bytes). */
export const LOGO_ENVIO_MAX_BYTES = 2 * 1024 * 1024
/** D-951: a cópia guardada vai até 150 KB de PNG (153.600 bytes). O banco confere o mesmo teto (DP-ML-2). */
export const LOGO_MAX_BYTES = 150 * 1024
/** D-951: o lado maior da cópia, do primeiro tamanho tentado ao último. */
export const LADOS_DA_LOGO: readonly number[] = [600, 480, 360, 240]

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

const EXTENSOES: Readonly<Record<string, string>> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

export interface ArquivoDeLogo {
  readonly nome: string
  /** O tipo que o navegador diz (`File.type`); vazio quando ele não sabe. */
  readonly tipo: string
  readonly bytes: number
}

export type ConferenciaDoArquivo = { readonly tipo: 'ok'; readonly mime: string } | { readonly tipo: 'erro'; readonly mensagem: string }

/** CA-1953 e DP-ML-4: o tipo vem do navegador; sem ele, da extensão. GIF, HEIC, PDF e o resto não passam. */
export function conferirArquivoDeLogo(arquivo: ArquivoDeLogo): ConferenciaDoArquivo {
  const extensao = /\.([a-z0-9]+)$/i.exec(arquivo.nome)?.[1]?.toLowerCase() ?? ''
  const mime = arquivo.tipo ? TIPOS[arquivo.tipo.toLowerCase()] : EXTENSOES[extensao]
  if (!mime || arquivo.bytes > LOGO_ENVIO_MAX_BYTES) return { tipo: 'erro', mensagem: ERROS_DA_LOGO.formato }
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
