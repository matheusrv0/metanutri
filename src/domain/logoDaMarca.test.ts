// Spec marca-no-link: a logo da nutricionista (D-951). A redução de verdade usa o <canvas> do navegador (testada no
// Playwright); aqui, um desenhista falso diz quanto cada tamanho pesa, e o teste confere a regra.
import {
  AVISO_LOGO_CLARA,
  bytesDoDataUrl,
  conferirArquivoDeLogo,
  ehLogoClara,
  ehLogoPublicavel,
  ERROS_DA_LOGO,
  LOGO_MAX_BYTES,
  prepararLogo,
  svgPedeRecursoDeFora,
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

describe('logo: o arquivo enviado (D-951, CA-1953)', () => {
  it('CA-1952: PNG, JPG, WebP e SVG de até 2 MB passam', () => {
    for (const [nome, tipo] of [
      ['logo.png', 'image/png'],
      ['logo.jpg', 'image/jpeg'],
      ['logo.webp', 'image/webp'],
      ['logo.svg', 'image/svg+xml'],
    ] as const) {
      expect(conferirArquivoDeLogo({ nome, tipo, bytes: 2 * MB }), nome).toEqual({ tipo: 'ok', mime: tipo })
    }
  })

  it('CA-1953: mais de 2 MB, GIF, HEIC e PDF: "Use PNG, JPG, WebP ou SVG, até 2 MB."', () => {
    const erro = { tipo: 'erro', mensagem: 'Use PNG, JPG, WebP ou SVG, até 2 MB.' }
    expect(conferirArquivoDeLogo({ nome: 'logo.png', tipo: 'image/png', bytes: 2 * MB + 1 })).toEqual(erro)
    expect(conferirArquivoDeLogo({ nome: 'logo.gif', tipo: 'image/gif', bytes: 1000 })).toEqual(erro)
    expect(conferirArquivoDeLogo({ nome: 'foto.heic', tipo: 'image/heic', bytes: 1000 })).toEqual(erro)
    expect(conferirArquivoDeLogo({ nome: 'logo.pdf', tipo: 'application/pdf', bytes: 1000 })).toEqual(erro)
    expect(conferirArquivoDeLogo({ nome: 'logo.html', tipo: 'text/html', bytes: 1000 })).toEqual(erro)
  })

  it('DP-ML-4: sem o tipo do navegador, vale a extensão', () => {
    expect(conferirArquivoDeLogo({ nome: 'Logo.SVG', tipo: '', bytes: 1000 })).toEqual({ tipo: 'ok', mime: 'image/svg+xml' })
    expect(conferirArquivoDeLogo({ nome: 'logo.jpeg', tipo: '', bytes: 1000 })).toEqual({ tipo: 'ok', mime: 'image/jpeg' })
    expect(conferirArquivoDeLogo({ nome: 'logo.heic', tipo: '', bytes: 1000 }).tipo).toBe('erro')
    expect(conferirArquivoDeLogo({ nome: 'logo', tipo: '', bytes: 1000 }).tipo).toBe('erro')
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
