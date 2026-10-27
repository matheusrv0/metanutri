// O script do <head> (public/preparar-pagina.js), rodado como o navegador roda: antes do primeiro desenho
// (spec site-publico-profissional, D-332, CA-1016 e CA-1017).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHAVE_TEMA_DA_LANDING } from '@/ui/publico/inicio/temaDaLanding.ts'
import { CHAVE_TEMA } from '@/ui/tema/contextoTema.ts'

const SCRIPT = readFileSync(join(process.cwd(), 'public', 'preparar-pagina.js'), 'utf8')

interface Cenario {
  readonly hash?: string
  readonly busca?: string
  readonly caminho?: string
  readonly rotaDaPagina?: string
  readonly tema?: string
  /** A escolha guardada pelo botão de tema da landing (spec landing-v3, D-613). */
  readonly temaDaLanding?: string
  readonly sistemaEscuro?: boolean
  readonly sessao?: boolean
}

function rodar({ hash = '', busca = '', caminho = '/', rotaDaPagina, tema, temaDaLanding, sistemaEscuro = false, sessao = false }: Cenario): DOMTokenList {
  const raiz = document.documentElement
  raiz.className = ''
  raiz.removeAttribute('style')
  raiz.removeAttribute('data-tema-da-landing')
  if (rotaDaPagina) raiz.setAttribute('data-rota', rotaDaPagina)
  else raiz.removeAttribute('data-rota')
  globalThis.history.replaceState(null, '', `${caminho}${busca}${hash}`)
  localStorage.clear()
  if (tema) localStorage.setItem(CHAVE_TEMA, tema)
  if (temaDaLanding !== undefined) localStorage.setItem(CHAVE_TEMA_DA_LANDING, temaDaLanding)
  if (sessao) localStorage.setItem('sb-abcdefgh-auth-token', '{}')
  vi.stubGlobal('matchMedia', (consulta: string) => ({ matches: sistemaEscuro && consulta.includes('dark') }))
  // Roda o arquivo como o navegador: o texto inteiro, no escopo global.
  new Function(SCRIPT)()
  vi.unstubAllGlobals()
  return raiz.classList
}

describe('preparar-pagina.js', () => {
  afterEach(() => {
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-rota')
    document.documentElement.removeAttribute('data-tema-da-landing')
    localStorage.clear()
    for (const link of document.head.querySelectorAll('link[rel="preload"]')) link.remove()
  })

  const preloadDaFoto = () => document.head.querySelector<HTMLLinkElement>('link[rel="preload"][as="image"]')

  it('CA-1485 e D-654: o <head> não pré-carrega imagem nenhuma (a foto do topo da v9 vem do HTML pré-desenhado)', () => {
    for (const cenario of [{ hash: '#/inicio' }, { hash: '' }, { hash: '#/missoes/abc' }, { hash: '', sessao: true }, { rotaDaPagina: 'precos' }, { busca: '?volta=confirmacao&code=x' }]) {
      for (const link of document.head.querySelectorAll('link[rel="preload"]')) link.remove()
      rodar(cenario)
      expect(preloadDaFoto(), JSON.stringify(cenario)).toBeNull()
    }
  })

  it('CA-1017: usa a mesma chave de tema do app', () => {
    expect(SCRIPT).toContain(`'${CHAVE_TEMA}'`)
  })

  it('CA-1017: tema escuro guardado, ou o do sistema sem escolha, liga o escuro antes do app', () => {
    expect(rodar({ tema: 'escuro' }).contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(rodar({ sistemaEscuro: true }).contains('dark')).toBe(true)
    expect(rodar({ tema: 'sistema', sistemaEscuro: true }).contains('dark')).toBe(true)
    expect(rodar({ tema: 'claro', sistemaEscuro: true }).contains('dark')).toBe(false)
    expect(rodar({}).contains('dark')).toBe(false)
  })

  it('CA-1016: a vitrine aparece na raiz, em #/inicio e na página própria sem rota', () => {
    expect(rodar({ hash: '' }).contains('sem-vitrine')).toBe(false)
    expect(rodar({ hash: '#/inicio' }).contains('sem-vitrine')).toBe(false)
    expect(rodar({ hash: '', rotaDaPagina: 'precos' }).contains('sem-vitrine')).toBe(false)
    expect(rodar({ hash: '#/precos', rotaDaPagina: 'precos' }).contains('sem-vitrine')).toBe(false)
  })

  it('CA-1016: o link do paciente, a área de trabalho e a volta do e-mail escondem a vitrine desde o primeiro quadro', () => {
    expect(rodar({ hash: '#/missoes/abc123' }).contains('sem-vitrine')).toBe(true)
    expect(rodar({ hash: '#/painel' }).contains('sem-vitrine')).toBe(true)
    expect(rodar({ hash: '#/precos' }).contains('sem-vitrine')).toBe(true)
    expect(rodar({ hash: '#access_token=x&type=signup' }).contains('sem-vitrine')).toBe(true)
    expect(rodar({ hash: '#/entrar', rotaDaPagina: 'precos' }).contains('sem-vitrine')).toBe(true)
  })

  it('CA-1025: a página inicial entregue em /precos (sem barra, pelo service worker) não mostra a landing', () => {
    expect(rodar({ caminho: '/precos' }).contains('sem-vitrine')).toBe(true)
    expect(rodar({ caminho: '/precos/', rotaDaPagina: 'precos' }).contains('sem-vitrine')).toBe(false)
    expect(rodar({ caminho: '/' }).contains('sem-vitrine')).toBe(false)
  })

  it('CA-1024: a volta do e-mail (?volta=…) esconde a vitrine desde o primeiro quadro', () => {
    expect(rodar({ busca: '?volta=confirmacao&code=abc' }).contains('sem-vitrine')).toBe(true)
    expect(rodar({ busca: '?volta=recuperacao&code=abc' }).contains('sem-vitrine')).toBe(true)
    expect(rodar({ busca: '?origem=busca' }).contains('sem-vitrine')).toBe(false)
  })

  it('CA-1016: com sessão aberta, a raiz vai para o painel e a vitrine não aparece; a página própria aparece', () => {
    expect(rodar({ hash: '', sessao: true }).contains('sem-vitrine')).toBe(true)
    expect(rodar({ hash: '#/inicio', sessao: true }).contains('sem-vitrine')).toBe(false)
    expect(rodar({ hash: '', rotaDaPagina: 'termos', sessao: true }).contains('sem-vitrine')).toBe(false)
  })

  describe('o tema da landing (spec landing-v3, D-613)', () => {
    const marca = () => document.documentElement.getAttribute('data-tema-da-landing')

    it('CA-1619: lê a mesma chave do botão de tema da landing', () => {
      expect(SCRIPT).toContain(`'${CHAVE_TEMA_DA_LANDING}'`)
    })

    it('CA-1619: com o claro guardado, marca o <html> antes do primeiro desenho; o tema do app não muda', () => {
      rodar({ temaDaLanding: 'claro' })
      expect(marca()).toBe('claro')
      expect(document.documentElement.classList.contains('dark')).toBe(false)
      rodar({ temaDaLanding: 'claro', tema: 'escuro' })
      expect(marca()).toBe('claro')
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('CA-1619 e CB-601: escuro, nada guardado ou outro valor não marcam', () => {
      for (const temaDaLanding of ['escuro', 'azul', '', undefined]) {
        rodar(temaDaLanding === undefined ? {} : { temaDaLanding })
        expect(marca(), String(temaDaLanding)).toBeNull()
      }
      // O tema claro do app não é o da landing.
      rodar({ tema: 'claro' })
      expect(marca()).toBeNull()
    })
  })

  it('CB-321 e CA-1619: sem localStorage, nada quebra, vale o tema do sistema e a landing fica escura', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    const key = vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(() => rodar({ sistemaEscuro: true })).not.toThrow()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.hasAttribute('data-tema-da-landing')).toBe(false)
    getItem.mockRestore()
    key.mockRestore()
  })
})
