import { localizarFonte, montarPagina } from './montarPagina.ts'
import { MARCA_FIM, MARCA_INICIO } from './marcas.ts'

/** O index.html como o build o deixa: a CSP depois do charset, o bloco de busca, o script e o #root vazio. */
const CONSTRUIDO = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'" />
    <script src="./preparar-pagina.js"></script>
    ${MARCA_INICIO}
    <title>velho</title>
    ${MARCA_FIM}
    <script type="module" crossorigin src="./assets/index-abc.js"></script>
    <link rel="stylesheet" crossorigin href="./assets/index-abc.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`

const inicio = { rota: 'inicio', caminho: '', cabecalho: '<title>Início</title>', corpo: '<header>topo</header><main><h1>Faltou cálcio?</h1></main>' }
const precos = { rota: 'precos', caminho: 'precos/', cabecalho: '<title>Preços</title>', corpo: '<main><h1>Planos e preços</h1></main>' }

describe('montarPagina (spec site-publico-profissional, D-331)', () => {
  it('CA-1013: a página inicial ganha o cabeçalho dela e o conteúdo dentro do #root, marcado como vitrine', () => {
    const html = montarPagina(CONSTRUIDO, inicio, { fonte: null })
    // `inert`: os botões pré-desenhados não fazem nada; até o app montar, nada ali recebe toque nem foco.
    expect(html).toContain('<div id="root"><div data-vitrine="" inert="">' + inicio.corpo + '</div></div>')
    expect(html).toContain('<title>Início</title>')
    expect(html).not.toContain('<title>velho</title>')
    expect(html).not.toContain(MARCA_INICIO)
    expect(html).not.toContain(MARCA_FIM)
    expect(html).not.toContain('<base')
    expect(html).toContain('<html lang="pt-BR">')
  })

  it('CA-1014: Preços leva <base href="../"> logo depois da CSP e data-rota no <html>', () => {
    const html = montarPagina(CONSTRUIDO, precos, { fonte: null })
    expect(html).toContain(`<meta http-equiv="Content-Security-Policy" content="default-src 'self'" />\n    <base href="../" />`)
    expect(html).toContain('<html lang="pt-BR" data-rota="precos">')
    expect(html).toContain('<title>Preços</title>')
    expect(html).toContain('<h1>Planos e preços</h1>')
  })

  it('DP-SA-46 (spec separacao-site-app): o data-rota entra no <html> que já traz o endereço do app', () => {
    const doSite = CONSTRUIDO.replace('<html lang="pt-BR">', '<html lang="pt-BR" data-app="https://app.metanutri.com.br/">')
    const html = montarPagina(doSite, precos, { fonte: null })
    expect(html).toContain('<html lang="pt-BR" data-app="https://app.metanutri.com.br/" data-rota="precos">')
    expect(montarPagina(doSite, inicio, { fonte: null })).toContain('<html lang="pt-BR" data-app="https://app.metanutri.com.br/">')
  })

  it('CA-1020: a fonte pré-carregada entra antes do pacote, com crossorigin', () => {
    const html = montarPagina(CONSTRUIDO, inicio, { fonte: 'assets/manrope-latin-wght-normal-XYZ.woff2' })
    const preload = '<link rel="preload" href="./assets/manrope-latin-wght-normal-XYZ.woff2" as="font" type="font/woff2" crossorigin />'
    expect(html).toContain(preload)
    expect(html.indexOf(preload)).toBeLessThan(html.indexOf('<script type="module"'))
  })

  it('para o build em vez de publicar uma página sem o #root, sem as marcas ou sem a CSP', () => {
    expect(() => montarPagina(CONSTRUIDO.replace('<div id="root"></div>', ''), inicio, { fonte: null })).toThrow(/#root/)
    expect(() => montarPagina(CONSTRUIDO.replace(MARCA_INICIO, ''), inicio, { fonte: null })).toThrow(/marcas/)
    expect(() => montarPagina(CONSTRUIDO.replace(/<meta http-equiv[^>]*>/, ''), precos, { fonte: null })).toThrow(/CSP/)
  })

  it('CA-1020: acha o woff2 latino da Manrope entre os arquivos do build', () => {
    expect(
      localizarFonte(['index-abc.js', 'manrope-latin-ext-wght-normal-Ch3.woff2', 'manrope-latin-wght-normal-DHI.woff2', 'bricolage-grotesque-latin-wght-normal-DLo.woff2']),
    ).toBe('assets/manrope-latin-wght-normal-DHI.woff2')
    expect(localizarFonte(['index-abc.js'])).toBeNull()
  })
})
