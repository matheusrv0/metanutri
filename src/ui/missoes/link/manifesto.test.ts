// O "Meu plano" instalado (spec lado-do-paciente, D-1213, DP-LP-2 e CA-2221).
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { aplicarMeuPlano, enderecoDoManifesto, ICONES_DO_MEU_PLANO, manifestoDoLink, NOME_DO_MEU_PLANO } from './manifesto.ts'

const ORIGEM = 'https://app.metanutri.com.br'
const TOKEN = 'k7q2mx9pla3r'

const lerManifesto = (href: string | null): Record<string, unknown> => {
  const prefixo = 'data:application/manifest+json,'
  if (!href?.startsWith(prefixo)) throw new Error(`não é o manifesto do link: ${href ?? 'sem href'}`)
  return JSON.parse(decodeURIComponent(href.slice(prefixo.length))) as Record<string, unknown>
}

afterEach(() => {
  document.head.innerHTML = ''
  document.title = ''
})

describe('CA-2221: o manifesto do Meu plano', () => {
  it('CA-2221: nome "Meu plano", começo e escopo no endereço do link, sem barra de endereço', () => {
    const m = manifestoDoLink(ORIGEM, TOKEN)
    expect(m).toMatchObject({
      name: 'Meu plano',
      short_name: 'Meu plano',
      start_url: `${ORIGEM}/p/${TOKEN}`,
      scope: `${ORIGEM}/p/${TOKEN}`,
      id: `${ORIGEM}/p/${TOKEN}`,
      display: 'standalone',
    })
  })

  it('CA-2221: os ícones do Meu plano existem em public/', () => {
    const m = manifestoDoLink(ORIGEM, TOKEN)
    expect(m.icons.map((i) => i.src)).toEqual([`${ORIGEM}/meu-plano-192.png`, `${ORIGEM}/meu-plano-512.png`, `${ORIGEM}/meu-plano-maskable-512.png`])
    for (const caminho of Object.values(ICONES_DO_MEU_PLANO)) expect(existsSync(join(process.cwd(), 'public', caminho))).toBe(true)
  })

  it('CA-2221: a página do link aponta para o manifesto dele; ao sair, volta o do MetaNutri', () => {
    document.head.innerHTML = '<link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="apple-touch-icon.png">'
    document.title = 'MetaNutri'
    const desfazer = aplicarMeuPlano(document, ORIGEM, TOKEN)

    const manifesto = lerManifesto(document.head.querySelector('link[rel="manifest"]')?.getAttribute('href') ?? null)
    expect(manifesto['name']).toBe(NOME_DO_MEU_PLANO)
    expect(manifesto['start_url']).toBe(`${ORIGEM}/p/${TOKEN}`)
    expect(document.head.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')).toBe('/apple-touch-icon-meu-plano.png')
    expect(document.head.querySelector('meta[name="apple-mobile-web-app-title"]')?.getAttribute('content')).toBe('Meu plano')
    expect(document.title).toBe('Meu plano')

    desfazer()
    expect(document.head.querySelector('link[rel="manifest"]')?.getAttribute('href')).toBe('/manifest.webmanifest')
    expect(document.head.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')).toBe('apple-touch-icon.png')
    expect(document.head.querySelector('meta[name="apple-mobile-web-app-title"]')).toBeNull()
    expect(document.title).toBe('MetaNutri')
  })

  it('CA-2221: sem manifesto na página (o modo de desenvolvimento), o do link entra e sai', () => {
    const desfazer = aplicarMeuPlano(document, ORIGEM, TOKEN)
    expect(lerManifesto(document.head.querySelector('link[rel="manifest"]')?.getAttribute('href') ?? null)['scope']).toBe(`${ORIGEM}/p/${TOKEN}`)
    desfazer()
    expect(document.head.querySelector('link[rel="manifest"]')).toBeNull()
  })

  it('DP-LP-2: o endereço do manifesto é data:, que a CSP aceita', () => {
    expect(enderecoDoManifesto(manifestoDoLink(ORIGEM, TOKEN)).startsWith('data:application/manifest+json,')).toBe(true)
  })
})
