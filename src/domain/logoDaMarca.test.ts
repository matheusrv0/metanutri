// Spec marca-no-link: a logo da nutricionista (D-951). A redução de verdade usa o <canvas> do navegador (testada no
// Playwright); aqui, um desenhista falso diz quanto cada tamanho pesa, e o teste confere a regra.
import {
  AVISO_LOGO_CLARA,
  bytesDoDataUrl,
  conferirArquivoDeLogo,
  ehLogoClara,
  ehLogoPublicavel,
  ERROS_DA_LOGO,
  LADO_MAXIMO_DO_ENVIO,
  ladosPeloCabecalho,
  LOGO_MAX_BYTES,
  logoCabeNoLink,
  prepararLogo,
  svgPedeRecursoDeFora,
  tipoPeloConteudo,
  type Desenhista,
} from './logoDaMarca.ts'

const PREFIXO_PNG = 'data:image/png;base64,'
/** A assinatura do PNG em base64: todo PNG começa assim. */
const ASSINATURA = 'iVBORw0KGgo'

/** Um "PNG" em data URI com exatamente `bytes` bytes depois de decodificado (múltiplo de 3, sem "="). */
function pngDe(bytes: number): string {
  const caracteres = (bytes / 3) * 4
  return PREFIXO_PNG + ASSINATURA + 'A'.repeat(caracteres - ASSINATURA.length)
}

/** Pixels RGBA: `escuros` pixels pretos opacos e o resto na cor dada. */
function pixels(total: number, escuros: number, resto: readonly [number, number, number, number] = [255, 255, 255, 255]): Uint8ClampedArray {
  const p = new Uint8ClampedArray(total * 4)
  for (let i = 0; i < total; i++) p.set(i < escuros ? [0, 0, 0, 255] : resto, i * 4)
  return p
}

interface Chamada {
  readonly largura: number
  readonly altura: number
}

/** Abre uma imagem de `largura × altura`; cada desenho pesa o que `peso` disser para o tamanho. */
function desenhistaFalso(largura: number, altura: number, peso: (lado: number) => number, opcoes: { readonly falhaAoAbrir?: boolean } = {}) {
  const chamadas: Chamada[] = []
  const abertos: string[] = []
  const desenhista: Desenhista = {
    async abrir(dataUrl) {
      abertos.push(dataUrl)
      if (opcoes.falhaAoAbrir) throw new Error('imagem estragada')
      return {
        largura,
        altura,
        desenhar(l, a) {
          chamadas.push({ largura: l, altura: a })
          return { dataUrl: pngDe(peso(Math.max(l, a))), pixels: pixels(100, 50) }
        },
      }
    },
  }
  return { desenhista, chamadas, abertos }
}

const MB = 1024 * 1024

/** Bytes de números e de texto ASCII, na ordem. */
function junta(...partes: readonly (readonly number[] | string)[]): Uint8Array {
  return Uint8Array.from(partes.flatMap((p) => (typeof p === 'string' ? Array.from(p, (c) => c.charCodeAt(0)) : [...p])))
}
const be16 = (n: number) => [(n >> 8) & 0xff, n & 0xff]
const be32 = (n: number) => [(n >>> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
const le16 = (n: number) => [n & 0xff, (n >> 8) & 0xff]
const le24 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff]
const le32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff]
const daBase64 = (texto: string) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0))

/** Um PNG de 1 × 1 de verdade. */
const PNG_1X1 = daBase64('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
/** Um GIF de 1 × 1 de verdade: o da revisão de 03/11/2026 (provas V2 e V2b). */
const GIF_1X1 = daBase64('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')

/** O começo de um PNG: a assinatura e o IHDR com os lados pedidos. */
const pngDeLados = (largura: number, altura: number) => junta([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], be32(13), 'IHDR', be32(largura), be32(altura), [8, 6, 0, 0, 0], [0, 0, 0, 0])

/** Um JPEG até o começo da imagem: JFIF, um EXIF de `exif` bytes, bytes soltos e o SOF (`sof`, C0 ou C2). */
function jpegDeLados(largura: number, altura: number, opcoes: { readonly exif?: number; readonly sof?: number } = {}): Uint8Array {
  const exif = opcoes.exif ?? 0
  return junta(
    [0xff, 0xd8],
    [0xff, 0xe0], be16(16), 'JFIF', [0, 1, 1, 0, 0, 1, 0, 1, 0, 0],
    exif ? [0xff, 0xe1, ...be16(exif + 2), ...new Array<number>(exif).fill(0x41)] : [],
    // Bytes soltos antes do marcador: o decodificador pula, e a leitura também.
    [0x00, 0x13],
    [0xff, 0xff, opcoes.sof ?? 0xc0], be16(17), [8], be16(altura), be16(largura), [3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1],
    [0xff, 0xda], be16(12), [3, 1, 0, 2, 0x11, 3, 0x11, 0, 0x3f, 0],
  )
}

const riff = (pedaco: Uint8Array) => junta('RIFF', le32(pedaco.length + 4), 'WEBP', [...pedaco])
const webpVp8x = (largura: number, altura: number) => riff(junta('VP8X', le32(10), [0x10, 0, 0, 0], le24(largura - 1), le24(altura - 1)))
const webpVp8 = (largura: number, altura: number) => riff(junta('VP8 ', le32(10), [0x50, 0x02, 0x00], [0x9d, 0x01, 0x2a], le16(largura), le16(altura)))
const webpVp8l = (largura: number, altura: number) => riff(junta('VP8L', le32(5), [0x2f], le32((largura - 1) | ((altura - 1) << 14))))

/** O texto em UTF-8, como o arquivo SVG chega (o BOM vira EF BB BF). */
const svg = (texto: string) => new TextEncoder().encode(texto)
const SVG_SIMPLES = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'

const ok = (mime: string) => ({ tipo: 'ok', mime })
const ERRO_FORMATO = { tipo: 'erro', mensagem: 'Use PNG, JPG, WebP ou SVG, até 2 MB.' }
const ERRO_LEITURA = { tipo: 'erro', mensagem: 'Não foi possível ler esta imagem. Tente PNG ou JPG.' }
const ERRO_PESADA = { tipo: 'erro', mensagem: 'Use uma logo mais simples.' }

describe('logo: o arquivo enviado (D-951, CA-1953)', () => {
  it('CA-1952: PNG, JPG, WebP e SVG de até 2 MB passam, pelo conteúdo', () => {
    expect(conferirArquivoDeLogo(PNG_1X1)).toEqual(ok('image/png'))
    expect(conferirArquivoDeLogo(jpegDeLados(1200, 400))).toEqual(ok('image/jpeg'))
    expect(conferirArquivoDeLogo(webpVp8x(1200, 400))).toEqual(ok('image/webp'))
    expect(conferirArquivoDeLogo(svg(SVG_SIMPLES))).toEqual(ok('image/svg+xml'))
    const noLimite = new Uint8Array(2 * MB)
    noLimite.set(pngDeLados(600, 200))
    expect(conferirArquivoDeLogo(noLimite)).toEqual(ok('image/png'))
  })

  it('CA-1953: mais de 2 MB, GIF, HEIC e PDF: "Use PNG, JPG, WebP ou SVG, até 2 MB."', () => {
    const grande = new Uint8Array(2 * MB + 1)
    grande.set(pngDeLados(600, 200))
    expect(conferirArquivoDeLogo(grande)).toEqual(ERRO_FORMATO)
    expect(conferirArquivoDeLogo(GIF_1X1)).toEqual(ERRO_FORMATO)
    expect(conferirArquivoDeLogo(junta(be32(24), 'ftypheic', be32(0), 'mif1heic'))).toEqual(ERRO_FORMATO)
    expect(conferirArquivoDeLogo(junta('%PDF-1.7\n'))).toEqual(ERRO_FORMATO)
    expect(conferirArquivoDeLogo(junta('<!DOCTYPE html><html><body><svg/></body></html>'))).toEqual(ERRO_FORMATO)
    expect(conferirArquivoDeLogo(new Uint8Array(0))).toEqual(ERRO_FORMATO)
  })

  it('CA-1953 e DP-ML-4: o GIF disfarçado (as provas V2 e V2b) é recusado: o nome e o tipo do navegador não contam mais', () => {
    expect(tipoPeloConteudo(GIF_1X1)).toBeNull()
    expect(tipoPeloConteudo(junta('GIF87a', [1, 0, 1, 0]))).toBeNull()
    expect(conferirArquivoDeLogo(GIF_1X1)).toEqual(ERRO_FORMATO)
  })

  it('DP-ML-4: o tipo pelo conteúdo, o WebP pelo RIFF com WEBP (um WAV também é RIFF)', () => {
    expect(tipoPeloConteudo(PNG_1X1)).toBe('image/png')
    expect(tipoPeloConteudo(jpegDeLados(10, 10))).toBe('image/jpeg')
    expect(tipoPeloConteudo(webpVp8l(10, 10))).toBe('image/webp')
    expect(tipoPeloConteudo(junta('RIFF', le32(4), 'WAVE'))).toBeNull()
  })

  it('DP-ML-4: o SVG é reconhecido depois do <?xml, de comentários, do BOM e do <!DOCTYPE (com entidades)', () => {
    const doIllustrator =
      '\uFEFF<?xml version="1.0" encoding="utf-8"?>\n<!-- Generator: Adobe Illustrator 27.0.0 -->\n' +
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
      '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100"><rect width="400" height="100"/></svg>'
    expect(conferirArquivoDeLogo(svg(doIllustrator))).toEqual(ok('image/svg+xml'))
    const comEntidade = '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY nome "Ana">]>\n<svg xmlns="http://www.w3.org/2000/svg"><text>&nome;</text></svg>'
    expect(conferirArquivoDeLogo(svg(comEntidade))).toEqual(ok('image/svg+xml'))
    expect(conferirArquivoDeLogo(svg('  \n<svg>'))).toEqual(ok('image/svg+xml'))
    // Texto que não é SVG, ou que não fecha a declaração do começo, não passa.
    expect(conferirArquivoDeLogo(svg('<svgx/>'))).toEqual(ERRO_FORMATO)
    expect(conferirArquivoDeLogo(svg('<?xml version="1.0"'))).toEqual(ERRO_FORMATO)
    expect(conferirArquivoDeLogo(svg('<!-- sem fim <svg/>'))).toEqual(ERRO_FORMATO)
  })
})

describe('logo: os lados pelo cabeçalho, antes de abrir (CB-967, DP-ML-32)', () => {
  it('PNG pelo IHDR', () => {
    expect(ladosPeloCabecalho(PNG_1X1, 'image/png')).toEqual({ largura: 1, altura: 1 })
    expect(ladosPeloCabecalho(pngDeLados(40_000, 24_000), 'image/png')).toEqual({ largura: 40_000, altura: 24_000 })
  })

  it('JPEG pelo primeiro SOF, depois do JFIF e de um EXIF grande, pulando bytes soltos; progressivo também', () => {
    expect(ladosPeloCabecalho(jpegDeLados(1200, 400), 'image/jpeg')).toEqual({ largura: 1200, altura: 400 })
    expect(ladosPeloCabecalho(jpegDeLados(9000, 300, { exif: 60_000 }), 'image/jpeg')).toEqual({ largura: 9000, altura: 300 })
    expect(ladosPeloCabecalho(jpegDeLados(640, 480, { sof: 0xc2 }), 'image/jpeg')).toEqual({ largura: 640, altura: 480 })
    // Sem SOF antes da imagem (SOS), não dá para saber.
    expect(ladosPeloCabecalho(junta([0xff, 0xd8, 0xff, 0xda], be16(2)), 'image/jpeg')).toBeNull()
    expect(ladosPeloCabecalho(junta([0xff, 0xd8, 0xff]), 'image/jpeg')).toBeNull()
  })

  it('WebP por VP8X, VP8 e VP8L', () => {
    expect(ladosPeloCabecalho(webpVp8x(9000, 20), 'image/webp')).toEqual({ largura: 9000, altura: 20 })
    expect(ladosPeloCabecalho(webpVp8(1200, 400), 'image/webp')).toEqual({ largura: 1200, altura: 400 })
    expect(ladosPeloCabecalho(webpVp8l(16_000, 3), 'image/webp')).toEqual({ largura: 16_000, altura: 3 })
    expect(ladosPeloCabecalho(riff(junta('ALPH', le32(4), [0, 0, 0, 0])), 'image/webp')).toBeNull()
  })

  it('CB-967: acima de 8.000 px de lado, "Use uma logo mais simples."; 8.000 × 8.000 continua aceita (CB-953)', () => {
    expect(conferirArquivoDeLogo(pngDeLados(8000, 8000))).toEqual(ok('image/png'))
    expect(conferirArquivoDeLogo(pngDeLados(8001, 40))).toEqual(ERRO_PESADA)
    expect(conferirArquivoDeLogo(pngDeLados(40, 24_000))).toEqual(ERRO_PESADA)
    expect(conferirArquivoDeLogo(jpegDeLados(9000, 300, { exif: 60_000 }))).toEqual(ERRO_PESADA)
    expect(conferirArquivoDeLogo(jpegDeLados(8000, 6000))).toEqual(ok('image/jpeg'))
    expect(conferirArquivoDeLogo(webpVp8x(8001, 1))).toEqual(ERRO_PESADA)
    expect(conferirArquivoDeLogo(webpVp8(8000, 8000))).toEqual(ok('image/webp'))
    expect(conferirArquivoDeLogo(webpVp8l(16_000, 3))).toEqual(ERRO_PESADA)
    expect(LADO_MAXIMO_DO_ENVIO).toBe(8000)
  })

  it('DP-ML-32: o cabeçalho que não diz os lados não é aberto: "Não foi possível ler esta imagem. Tente PNG ou JPG."', () => {
    expect(conferirArquivoDeLogo(junta([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], be32(0), 'IEND'))).toEqual(ERRO_LEITURA)
    expect(conferirArquivoDeLogo(junta([0xff, 0xd8, 0xff, 0xd9]))).toEqual(ERRO_LEITURA)
    expect(conferirArquivoDeLogo(riff(junta('VP8 ', le32(4), [0, 0, 0, 0])))).toEqual(ERRO_LEITURA)
  })

  it('DP-ML-32: o SVG não tem conta de pixels: o navegador o desenha no tamanho da cópia', () => {
    expect(conferirArquivoDeLogo(svg('<svg xmlns="http://www.w3.org/2000/svg" width="100000" height="100000"/>'))).toEqual(ok('image/svg+xml'))
  })
})

describe('logo: a cópia reduzida (D-951)', () => {
  it('CA-1952: a logo guardada é PNG, com o lado maior de até 600 px e até 150 KB, na proporção', async () => {
    const { desenhista, chamadas } = desenhistaFalso(1200, 400, () => 90_000)
    const r = await prepararLogo({ dataUrl: 'data:image/jpeg;base64,/9j/', mime: 'image/jpeg' }, desenhista)
    expect(r).toMatchObject({ tipo: 'ok', largura: 600, altura: 200, clara: false })
    if (r.tipo !== 'ok') return
    expect(r.logo.startsWith(PREFIXO_PNG + ASSINATURA)).toBe(true)
    expect(bytesDoDataUrl(r.logo)).toBeLessThanOrEqual(LOGO_MAX_BYTES)
    expect(chamadas).toEqual([{ largura: 600, altura: 200 }])
  })

  it('D-951: se 600 px passa de 150 KB, tenta 480, 360 e 240 px, e fica com a primeira que cabe', async () => {
    const { desenhista, chamadas } = desenhistaFalso(1000, 1000, (lado) => (lado > 360 ? 200_000 : 150_000))
    const r = await prepararLogo({ dataUrl: 'data:image/png;base64,iVBORw0KGgo', mime: 'image/png' }, desenhista)
    expect(r).toMatchObject({ tipo: 'ok', largura: 360, altura: 360 })
    expect(chamadas.map((c) => c.largura)).toEqual([600, 480, 360])
  })

  it('CA-1954: reduzida a 240 px e ainda acima de 150 KB: "Use uma logo mais simples."', async () => {
    const { desenhista, chamadas } = desenhistaFalso(1000, 500, () => LOGO_MAX_BYTES + 3)
    const r = await prepararLogo({ dataUrl: 'data:image/png;base64,iVBORw0KGgo', mime: 'image/png' }, desenhista)
    expect(r).toEqual({ tipo: 'erro', mensagem: 'Use uma logo mais simples.' })
    expect(chamadas.map((c) => c.largura)).toEqual([600, 480, 360, 240])
  })

  it('D-951: imagem menor que 600 px não aumenta; tenta só os tamanhos menores que ela', async () => {
    const { desenhista, chamadas } = desenhistaFalso(300, 100, () => 200_000)
    await prepararLogo({ dataUrl: 'data:image/png;base64,iVBORw0KGgo', mime: 'image/png' }, desenhista)
    expect(chamadas).toEqual([
      { largura: 300, altura: 100 },
      { largura: 240, altura: 80 },
    ])
  })

  it('CB-953: imagem enorme (8000 × 8000) é aceita e reduzida', async () => {
    const { desenhista } = desenhistaFalso(8000, 8000, () => 120_000)
    expect(await prepararLogo({ dataUrl: 'data:image/png;base64,iVBORw0KGgo', mime: 'image/png' }, desenhista)).toMatchObject({ tipo: 'ok', largura: 600, altura: 600 })
  })

  it('imagem que o navegador não abre: "Não foi possível ler esta imagem. Tente PNG ou JPG."', async () => {
    const { desenhista } = desenhistaFalso(100, 100, () => 1000, { falhaAoAbrir: true })
    expect(await prepararLogo({ dataUrl: 'data:image/png;base64,lixo', mime: 'image/png' }, desenhista)).toEqual({
      tipo: 'erro',
      mensagem: 'Não foi possível ler esta imagem. Tente PNG ou JPG.',
    })
  })

  it('imagem sem tamanho (0 × 0) também não é lida', async () => {
    const { desenhista } = desenhistaFalso(0, 0, () => 1000)
    expect(await prepararLogo({ dataUrl: 'data:image/png;base64,iVBORw0KGgo', mime: 'image/png' }, desenhista)).toEqual({ tipo: 'erro', mensagem: ERROS_DA_LOGO.leitura })
  })

  it('DP-ML-4: a imagem é aberta com o tipo conferido, não com o que o navegador escreveu no data URI', async () => {
    const { desenhista, abertos } = desenhistaFalso(100, 100, () => 1000)
    await prepararLogo({ dataUrl: 'data:application/octet-stream;base64,PHN2Zy8+', mime: 'image/svg+xml' }, desenhista)
    expect(abertos).toEqual(['data:image/svg+xml;base64,PHN2Zy8+'])
  })
})

describe('logo: SVG vira PNG (CA-1955, CB-952)', () => {
  const svgComScript = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" onload="alert(1)"><script>alert(2)</script><rect width="10" height="10"/></svg>'
  const emBase64 = (texto: string) => `data:image/svg+xml;base64,${btoa(texto)}`

  it('CA-1955: o SVG com <script> e onload sai como PNG; o texto do SVG não sobra em lugar nenhum', async () => {
    const { desenhista } = desenhistaFalso(10, 10, () => 2000)
    const r = await prepararLogo({ dataUrl: emBase64(svgComScript), mime: 'image/svg+xml' }, desenhista)
    expect(r.tipo).toBe('ok')
    if (r.tipo !== 'ok') return
    expect(r.logo.startsWith(PREFIXO_PNG)).toBe(true)
    expect(JSON.stringify(r)).not.toMatch(/svg|script|onload/i)
  })

  it('CB-952: SVG que pede recurso de fora (fonte, imagem, folha de estilo) não é lido', async () => {
    const deFora = [
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://exemplo.com/a.png"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="//exemplo.com/a.png"/></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><style>@import url(https://fonts.example/f.css);</style></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg"><style>text { font-family: X; src: url( "http://exemplo.com/f.woff" ) }</style></svg>',
    ]
    for (const svg of deFora) {
      expect(svgPedeRecursoDeFora(svg), svg).toBe(true)
      const { desenhista, abertos } = desenhistaFalso(10, 10, () => 2000)
      expect(await prepararLogo({ dataUrl: emBase64(svg), mime: 'image/svg+xml' }, desenhista)).toEqual({ tipo: 'erro', mensagem: ERROS_DA_LOGO.leitura })
      expect(abertos).toEqual([])
    }
  })

  it('CB-952: o endereço do próprio formato SVG (xmlns) não conta como recurso de fora', () => {
    expect(svgPedeRecursoDeFora('<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use href="#a"/></svg>')).toBe(false)
  })

  it('SVG escrito sem base64 (data:image/svg+xml,...) também é lido', async () => {
    const { desenhista } = desenhistaFalso(10, 10, () => 2000)
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"><image href="https://x.com/a.png"/></svg>')}`
    expect(await prepararLogo({ dataUrl, mime: 'image/svg+xml' }, desenhista)).toEqual({ tipo: 'erro', mensagem: ERROS_DA_LOGO.leitura })
  })
})

describe('logo: clara demais para o fundo branco (CB-950, DP-ML-5)', () => {
  it('CB-950: letra branca em fundo transparente é clara demais', () => {
    expect(ehLogoClara(pixels(1000, 0, [255, 255, 255, 255]))).toBe(true)
  })

  it('CB-950: só tons pastéis (menos de 3:1 com o branco) também', () => {
    expect(ehLogoClara(pixels(1000, 0, [244, 194, 194, 255]))).toBe(true)
  })

  it('DP-ML-5: JPG de fundo branco com a letra escura não é clara (o aviso não dispara à toa)', () => {
    expect(ehLogoClara(pixels(1000, 100))).toBe(false)
  })

  it('DP-ML-5: o limite é 2% dos pixels visíveis; os transparentes não contam', () => {
    expect(ehLogoClara(pixels(1000, 19))).toBe(true)
    expect(ehLogoClara(pixels(1000, 20))).toBe(false)
    // 15 pretos entre 100 visíveis e 900 transparentes (pretos, mas de alfa zero): 15% dos visíveis, não é clara,
    // mesmo sendo 1,5% de todos os pixels.
    const misto = new Uint8ClampedArray(1000 * 4)
    for (let i = 0; i < 1000; i++) misto.set(i < 15 ? [0, 0, 0, 255] : i < 100 ? [255, 255, 255, 255] : [0, 0, 0, 0], i * 4)
    expect(ehLogoClara(misto)).toBe(false)
  })

  it('imagem toda transparente é clara demais (não aparece)', () => {
    expect(ehLogoClara(pixels(100, 0, [0, 0, 0, 0]))).toBe(true)
  })

  it('a logo preparada diz se é clara', async () => {
    const desenhista: Desenhista = {
      abrir: async () => ({ largura: 10, altura: 10, desenhar: () => ({ dataUrl: pngDe(3000), pixels: pixels(100, 0) }) }),
    }
    expect(await prepararLogo({ dataUrl: 'data:image/png;base64,iVBORw0KGgo', mime: 'image/png' }, desenhista)).toMatchObject({ tipo: 'ok', clara: true })
    expect(AVISO_LOGO_CLARA).toBe('A logo é clara demais para o fundo branco.')
  })
})

describe('logo publicável: a mesma regra do servidor (DP-ML-2)', () => {
  it('PNG em data URI de até 150 KB passa', () => {
    expect(ehLogoPublicavel(pngDe(LOGO_MAX_BYTES))).toBe(true)
    expect(bytesDoDataUrl(pngDe(LOGO_MAX_BYTES))).toBe(153_600)
  })

  it('CA-1975: acima de 150 KB, outro tipo, sem a assinatura do PNG ou com caractere fora do base64 não passa', () => {
    expect(ehLogoPublicavel(pngDe(LOGO_MAX_BYTES + 3))).toBe(false)
    expect(ehLogoPublicavel('data:image/jpeg;base64,/9j/4AAQ')).toBe(false)
    expect(ehLogoPublicavel('data:image/svg+xml;base64,PHN2Zy8+')).toBe(false)
    expect(ehLogoPublicavel('data:image/png;base64,AAAA')).toBe(false)
    expect(ehLogoPublicavel(`${PREFIXO_PNG}${ASSINATURA}A"onerror="x`)).toBe(false)
    expect(ehLogoPublicavel('https://exemplo.com/logo.png')).toBe(false)
  })

  it('o tamanho decodificado desconta o "=" do fim', () => {
    expect(bytesDoDataUrl('data:image/png;base64,AAAA')).toBe(3)
    expect(bytesDoDataUrl('data:image/png;base64,AAA=')).toBe(2)
    expect(bytesDoDataUrl('data:image/png;base64,AA==')).toBe(1)
  })
})

describe('a logo publicada no link: até o tamanho da cópia (CA-1973, DP-ML-33)', () => {
  /** A logo publicada com o IHDR dos lados pedidos (o resto não importa: o link não abre a imagem para conferir). */
  const publicadaDe = (largura: number, altura: number) => {
    const inicio = pngDeLados(largura, altura)
    return PREFIXO_PNG + btoa(String.fromCharCode(...inicio, ...new Array<number>(30).fill(0)))
  }

  it('até 600 px de lado, a logo vale; acima, não (a revisão publicou um PNG de 24.000 × 24.000 em 70 KB)', () => {
    expect(logoCabeNoLink(publicadaDe(600, 200))).toBe(true)
    expect(logoCabeNoLink(publicadaDe(240, 600))).toBe(true)
    expect(logoCabeNoLink(publicadaDe(601, 10))).toBe(false)
    expect(logoCabeNoLink(publicadaDe(24_000, 24_000))).toBe(false)
  })

  it('sem IHDR legível, quem decide é o navegador (a imagem que não abre volta ao MetaNutri)', () => {
    expect(logoCabeNoLink(pngDe(3000))).toBe(true)
    expect(logoCabeNoLink('data:image/jpeg;base64,/9j/4AAQ')).toBe(false)
  })
})
