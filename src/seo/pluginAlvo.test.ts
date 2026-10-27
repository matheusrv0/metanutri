// @vitest-environment node
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'vite'
import { APP_EM_PRODUCAO, enderecoOuPadrao } from '@/ui/enderecos.ts'
import { MARCA_FIM, MARCA_INICIO } from './marcas.ts'
import { APP_PADRAO, cabecaDoApp, enderecoDoApp, prepararHtml, pluginAlvo, SO_DO_APP, SO_DO_SITE } from './pluginAlvo.ts'

const APP = 'https://app.metanutri.com.br/'
const HTML = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <script src="./preparar-pagina.js"></script>
    ${MARCA_INICIO}
    <title>Vitrine</title>
    <meta name="description" content="Texto de venda" />
    <meta property="og:description" content="Texto de venda" />
    ${MARCA_FIM}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`

describe('o alvo do build (spec separacao-site-app, DP-SA-1 e DP-SA-2)', () => {
  it('DP-SA-3: o endereço padrão do app é o de produção, e a variável vale como em src/ui/enderecos.ts', () => {
    expect(APP_PADRAO).toBe(APP_EM_PRODUCAO)
    for (const valor of [undefined, '', 'http://localhost:4176', 'https://outro.exemplo/x', 'javascript:alert(1)']) {
      expect(enderecoDoApp(valor)).toBe(enderecoOuPadrao(valor, APP_EM_PRODUCAO))
    }
  })

  it('DP-SA-2: no site, a entrada passa ao pacote do site e o <html> ganha o endereço do app; o resto fica', () => {
    const html = prepararHtml(HTML, 'site', APP)
    expect(html).toContain('<script type="module" src="/src/site/main.tsx"></script>')
    expect(html).not.toContain('/src/main.tsx')
    expect(html).toContain(`<html lang="pt-BR" data-app="${APP}">`)
    expect(html).toContain('<script src="./preparar-pagina.js"></script>')
    expect(html).toContain('<title>Vitrine</title>')
  })

  it('CA-1418: no app, a cabeça é só "MetaNutri", sem buscador nem texto de venda, com o ícone na prévia', () => {
    const html = prepararHtml(HTML, 'app', APP)
    expect(html).toContain(cabecaDoApp(APP))
    expect(html).toContain('<title>MetaNutri</title>')
    expect(html).toContain('<meta name="robots" content="noindex" />')
    expect(html).toContain(`<meta property="og:image" content="${APP}icon-512.png" />`)
    expect(html).toContain('<meta property="og:title" content="MetaNutri" />')
    expect(html).not.toMatch(/description|Texto de venda|Vitrine|canonical|ld\+json/)
    expect(html).toContain('<script src="./preparar-app.js"></script>')
    expect(html).not.toContain('preparar-pagina.js')
    expect(html).toContain('<script type="module" src="/src/main.tsx"></script>')
  })

  it('CA-1418: no index.html de verdade, a cabeça do app não tem descrição nem Open Graph de venda', () => {
    const html = prepararHtml(readFileSync(join(process.cwd(), 'index.html'), 'utf8'), 'app', APP)
    const cabeca = html.slice(0, html.indexOf('</head>'))
    expect(cabeca).toContain('<meta name="robots" content="noindex" />')
    expect(cabeca.match(/<title>([^<]*)<\/title>/)?.[1]).toBe('MetaNutri')
    expect(cabeca).not.toMatch(/name="description"|og:description|twitter:|diz o que comer|Comece grátis/)
  })

  it('DP-SA-2: sem as marcas que troca, o build para com o motivo', () => {
    expect(() => prepararHtml(HTML.replace('/src/main.tsx', '/src/outro.tsx'), 'site', APP)).toThrow(/main\.tsx/)
    expect(() => prepararHtml(HTML.replace(MARCA_INICIO, ''), 'app', APP)).toThrow(/seo:inicio/)
    expect(() => prepararHtml(HTML.replace('./preparar-pagina.js', './outro.js'), 'app', APP)).toThrow(/preparar-pagina/)
  })

  it('DP-SA-2: cada pasta perde o que é do outro', () => {
    expect([...SO_DO_SITE].sort()).toEqual(['llms.txt', 'preparar-pagina.js', 'robots.txt', 'sitemap.xml'])
    expect(SO_DO_APP).toEqual(['preparar-app.js'])
  })
})

describe('o plugin do alvo no build de verdade (R-511)', () => {
  let pasta = ''
  beforeEach(() => {
    pasta = mkdtempSync(join(tmpdir(), 'metanutri-alvo-'))
    writeFileSync(join(pasta, 'index.html'), HTML)
    mkdirSync(join(pasta, 'src', 'site'), { recursive: true })
    writeFileSync(join(pasta, 'src', 'main.tsx'), "document.body.dataset['pacote'] = 'pacote-do-app'\n")
    writeFileSync(join(pasta, 'src', 'site', 'main.tsx'), "document.body.dataset['pacote'] = 'pacote-do-site'\n")
    mkdirSync(join(pasta, 'public'))
    for (const arquivo of [...SO_DO_SITE, ...SO_DO_APP, 'icon-512.png']) writeFileSync(join(pasta, 'public', arquivo), arquivo)
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    rmSync(pasta, { recursive: true, force: true })
  })

  async function montar(alvo: 'app' | 'site'): Promise<{ readonly html: string; readonly arquivos: readonly string[]; readonly pacote: string }> {
    const saida = join(pasta, `dist-${alvo}`)
    await build({ root: pasta, base: './', configFile: false, envDir: pasta, logLevel: 'silent', plugins: [pluginAlvo(alvo)], build: { outDir: saida } })
    const assets = readdirSync(join(saida, 'assets'))
    const pacote = assets.filter((a) => a.endsWith('.js')).map((a) => readFileSync(join(saida, 'assets', a), 'utf8')).join('\n')
    return { html: readFileSync(join(saida, 'index.html'), 'utf8'), arquivos: readdirSync(saida), pacote }
  }

  it('DP-SA-1: o site monta o pacote do site, com o endereço do app no <html>, e sem o script do app', async () => {
    vi.stubEnv('VITE_ENDERECO_DO_APP', 'http://localhost:4176')
    const { html, arquivos, pacote } = await montar('site')
    expect(pacote).toContain('pacote-do-site')
    expect(pacote).not.toContain('pacote-do-app')
    expect(html).toContain('data-app="http://localhost:4176/"')
    expect(arquivos).toEqual(expect.arrayContaining([...SO_DO_SITE]))
    expect(arquivos).not.toContain('preparar-app.js')
  })

  it('CA-1406 e DP-SA-48: o pacote do site que lê o endereço do app não leva as outras variáveis do ambiente', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://falso-e2e.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'chave-que-nao-pode-vazar')
    writeFileSync(
      join(pasta, 'src', 'site', 'main.tsx'),
      "document.body.dataset['pacote'] = 'pacote-do-site:' + import.meta.env.VITE_ENDERECO_DO_APP + '|' + import.meta.env.VITE_ENDERECO_DO_SITE\n",
    )
    vi.stubEnv('VITE_ENDERECO_DO_SITE', 'http://localhost:4178')
    const { pacote } = await montar('site')
    expect(pacote).toContain('pacote-do-site')
    // Sem a variável, vazio (o código usa o de produção); com ela, o valor dela.
    expect(pacote).toMatch(/\|http:\/\/localhost:4178/)
    expect(pacote).not.toMatch(/supabase|chave-que-nao-pode-vazar/)
  })

  it('DP-SA-1 e CA-1418: o app monta o pacote do app, sem a busca e o script da vitrine', async () => {
    const { html, arquivos, pacote } = await montar('app')
    expect(pacote).toContain('pacote-do-app')
    expect(pacote).not.toContain('pacote-do-site')
    expect(html).toContain('<meta name="robots" content="noindex" />')
    expect(html).toContain(`content="${APP}icon-512.png"`)
    for (const arquivo of SO_DO_SITE) expect(arquivos).not.toContain(arquivo)
    expect(arquivos).toContain('preparar-app.js')
    expect(existsSync(join(pasta, 'dist-app', 'icon-512.png'))).toBe(true)
  })
})
