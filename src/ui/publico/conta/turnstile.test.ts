import playwright from '../../../../playwright.config.ts?raw'
import publicar from '../../../../.github/workflows/publicar.yml?raw'
import vite from '../../../../vite.config.ts?raw'
import {
  carregarTurnstile,
  chaveDaVerificacao,
  esquecerTurnstile,
  LARGURA_MINIMA_FLEXIVEL,
  tamanhoDoWidget,
  temaDoWidget,
  URL_DO_TURNSTILE,
  type ApiDoTurnstile,
} from './turnstile.ts'

const API: ApiDoTurnstile = { render: () => 'widget-1', reset: () => undefined, remove: () => undefined }
const scripts = () => document.querySelectorAll<HTMLScriptElement>(`script[src="${URL_DO_TURNSTILE}"]`)

beforeEach(() => {
  esquecerTurnstile()
  for (const script of document.querySelectorAll('script')) script.remove()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('o script da verificação (D-113, R-43)', () => {
  it('R-43: põe o script do Cloudflare uma vez só, com a renderização explícita, e devolve o Turnstile quando ele carrega', async () => {
    const primeiro = carregarTurnstile()
    const segundo = carregarTurnstile()
    expect(URL_DO_TURNSTILE).toBe('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit')
    expect(scripts()).toHaveLength(1)
    expect(scripts()[0]?.async).toBe(true)
    expect(segundo).toBe(primeiro)
    vi.stubGlobal('turnstile', API)
    scripts()[0]?.dispatchEvent(new Event('load'))
    await expect(primeiro).resolves.toBe(API)
  })

  it('CB-119: com o Turnstile já na página, não põe outro script', async () => {
    vi.stubGlobal('turnstile', API)
    await expect(carregarTurnstile()).resolves.toBe(API)
    expect(scripts()).toHaveLength(0)
  })

  it('CA-461: script que não carrega rejeita, sai da página, e a próxima tela de conta tenta de novo', async () => {
    const tentativa = carregarTurnstile()
    scripts()[0]?.dispatchEvent(new Event('error'))
    await expect(tentativa).rejects.toThrow('O script da verificação não carregou.')
    expect(scripts()).toHaveLength(0)
    vi.useFakeTimers()
    void carregarTurnstile().catch(() => undefined)
    expect(scripts()).toHaveLength(1)
  })

  it('CA-461: script que demora demais também desiste', async () => {
    vi.useFakeTimers()
    const tentativa = carregarTurnstile(1000)
    vi.advanceTimersByTime(1000)
    await expect(tentativa).rejects.toThrow()
  })

  it('CA-461: script que carrega sem o Turnstile conta como falha', async () => {
    const tentativa = carregarTurnstile()
    scripts()[0]?.dispatchEvent(new Event('load'))
    await expect(tentativa).rejects.toThrow()
  })
})

describe('a chave pública (D-117, CA-463)', () => {
  it('D-117: a chave vem da variável do build, sem espaço em volta', () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', ' 0xCHAVE_DE_EXEMPLO_DO_SITE ')
    expect(chaveDaVerificacao()).toBe('0xCHAVE_DE_EXEMPLO_DO_SITE')
  })

  it('D-117: a chave de teste do Cloudflare também liga (só como valor, nos testes de unidade)', () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '1x00000000000000000000AA')
    expect(chaveDaVerificacao()).toBe('1x00000000000000000000AA')
  })

  it.each(['', '   ', 'desligado', 'undefined'])('CA-463: com "%s", não há verificação', (valor) => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', valor)
    expect(chaveDaVerificacao()).toBeNull()
  })

  it('Foco: nos testes de unidade, a verificação começa desligada, mesmo com a chave no .env.local desta máquina', () => {
    expect(vite).toContain("env: { VITE_TURNSTILE_SITE_KEY: 'desligado' }")
    expect(chaveDaVerificacao()).toBeNull()
  })

  it('CA-463 e R-45: os testes de navegador montam o site sem a chave', () => {
    expect(playwright).toContain("VITE_TURNSTILE_SITE_KEY: 'desligado'")
  })

  it('D-117: o site publicado recebe a chave pública de uma variável do GitHub, como a do pagamento', () => {
    expect(publicar).toContain('VITE_TURNSTILE_SITE_KEY: ${{ vars.VITE_TURNSTILE_SITE_KEY }}')
    expect(publicar).not.toMatch(/secrets\.[A-Z_]*TURNSTILE/)
  })
})

describe('o jeito do widget (CA-462, CB-118)', () => {
  it.each([
    [0, 'compact'],
    [280, 'compact'],
    [299, 'compact'],
    [300, 'flexible'],
    [432, 'flexible'],
  ] as const)('CB-118: com %i px de largura, o widget é %s', (largura, tamanho) => {
    expect(tamanhoDoWidget(largura)).toBe(tamanho)
  })

  it('CB-118: o flexível começa nos 300 px que o Cloudflare exige', () => {
    expect(LARGURA_MINIMA_FLEXIVEL).toBe(300)
  })

  it.each([
    ['claro', 'light'],
    ['escuro', 'dark'],
    [null, 'auto'],
  ] as const)('CA-462: o tema %s do site vira %s no widget', (aplicado, tema) => {
    expect(temaDoWidget(aplicado)).toBe(tema)
  })
})
