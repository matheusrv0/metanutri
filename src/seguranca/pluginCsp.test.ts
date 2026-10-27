// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build, createServer } from 'vite'
import { cabecalhosDoApp, diretivasDaPolitica, diretivasDoSite, textoDaPolitica, type AlvoDoBuild } from './csp.ts'
import { injetarPolitica, metaDaPolitica, pluginPoliticaDeConteudo } from './pluginCsp.ts'

const SUPABASE = 'https://abcdefghijklmnopqrst.supabase.co'
const HTML = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>teste</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./principal.js"></script>
  </body>
</html>
`

/** Uma pasta com um site de uma página, para o Vite montar de verdade. */
function pastaDoSite(): string {
  const pasta = mkdtempSync(join(tmpdir(), 'metanutri-csp-'))
  writeFileSync(join(pasta, 'index.html'), HTML)
  writeFileSync(join(pasta, 'principal.js'), "document.getElementById('root').textContent = 'oi'\n")
  return pasta
}

let pasta = ''
beforeEach(() => {
  pasta = pastaDoSite()
  vi.stubEnv('VITE_SUPABASE_URL', SUPABASE)
})
afterEach(() => {
  vi.unstubAllEnvs()
  rmSync(pasta, { recursive: true, force: true })
})

/** Monta o site de teste em memória e devolve os arquivos de texto da saída, pelo nome. */
async function montar(alvo?: AlvoDoBuild): Promise<ReadonlyMap<string, string>> {
  const saida = await build({
    root: pasta,
    base: './',
    configFile: false,
    envDir: pasta,
    logLevel: 'silent',
    plugins: [alvo === undefined ? pluginPoliticaDeConteudo() : pluginPoliticaDeConteudo(alvo)],
    build: { write: false },
  })
  const resultados = Array.isArray(saida) ? saida : [saida]
  const arquivos = resultados.flatMap((resultado) => ('output' in resultado ? resultado.output : []))
  return new Map(arquivos.flatMap((arquivo) => (arquivo.type === 'asset' ? [[arquivo.fileName, String(arquivo.source)] as const] : [])))
}

describe('a <meta> da regra de conteúdo (D-135)', () => {
  it('CA-485: no build, a <meta> sai com a regra exata do csp.ts, logo depois do charset e antes de qualquer script', async () => {
    const html = (await montar()).get('index.html') ?? ''

    const esperada = metaDaPolitica(textoDaPolitica(diretivasDaPolitica({ supabase: SUPABASE })))
    expect(html).toContain(`<meta charset="UTF-8" />\n    ${esperada}`)
    expect(html.split('Content-Security-Policy')).toHaveLength(2)
    const posicao = html.indexOf(esperada)
    expect(posicao).toBeGreaterThan(0)
    expect(posicao).toBeLessThan(html.indexOf('<script'))
    expect(posicao).toBeLessThan(html.indexOf('<title>'))
  })

  it('CA-485: no servidor de desenvolvimento não há <meta>, e o recarregamento do Vite segue', async () => {
    expect(pluginPoliticaDeConteudo().apply).toBe('build')
    const servidor = await createServer({
      root: pasta,
      configFile: false,
      envDir: pasta,
      logLevel: 'silent',
      plugins: [pluginPoliticaDeConteudo()],
      server: { middlewareMode: true, ws: false },
    })
    try {
      const html = await servidor.transformIndexHtml('/index.html', HTML)
      expect(html).not.toContain('Content-Security-Policy')
    } finally {
      await servidor.close()
    }
  })

  it('CA-1406 (spec separacao-site-app): no build do site, a <meta> leva a regra do site, sem Supabase nenhum', async () => {
    const html = (await montar('site')).get('index.html') ?? ''
    expect(html).toContain(`<meta charset="UTF-8" />\n    ${metaDaPolitica(textoDaPolitica(diretivasDoSite()))}`)
    expect(html).not.toContain('supabase')
  })

  it('CA-1419 (spec separacao-site-app): o build do app escreve o _headers com a regra do mesmo build; o do site, não', async () => {
    const doApp = await montar('app')
    expect(doApp.get('_headers')).toBe(cabecalhosDoApp(textoDaPolitica(diretivasDaPolitica({ supabase: SUPABASE }))))
    expect((await montar()).get('_headers')).toBe(doApp.get('_headers'))
    expect((await montar('site')).has('_headers')).toBe(false)
  })

  it('o build para, com o motivo, se o index.html perder o <meta charset>', () => {
    expect(() => injetarPolitica('<html><head><title>x</title></head></html>', "default-src 'self'")).toThrow(/meta charset/)
  })

  it('a <meta> entra uma vez só, mesmo com charset escrito de outro jeito', () => {
    const html = injetarPolitica('<head><META CHARSET=utf-8><script src="x.js"></script></head>', "default-src 'self'")
    expect(html).toBe(`<head><META CHARSET=utf-8>\n    <meta http-equiv="Content-Security-Policy" content="default-src 'self'" /><script src="x.js"></script></head>`)
  })
})
