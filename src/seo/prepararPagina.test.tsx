// O script do <head> (public/preparar-pagina.js), rodado como o navegador roda: antes do primeiro desenho
// (spec site-publico-profissional, D-332, CA-1016 e CA-1017).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHAVE_TEMA } from '@/ui/tema/contextoTema.ts'

const SCRIPT = readFileSync(join(process.cwd(), 'public', 'preparar-pagina.js'), 'utf8')

interface Cenario {
  readonly hash?: string
  readonly busca?: string
  readonly caminho?: string
  readonly rotaDaPagina?: string
  readonly tema?: string
  readonly sistemaEscuro?: boolean
  readonly sessao?: boolean
}

function rodar({ hash = '', busca = '', caminho = '/', rotaDaPagina, tema, sistemaEscuro = false, sessao = false }: Cenario): DOMTokenList {
  const raiz = document.documentElement
  raiz.className = ''
  raiz.removeAttribute('style')
  if (rotaDaPagina) raiz.setAttribute('data-rota', rotaDaPagina)
  else raiz.removeAttribute('data-rota')
  globalThis.history.replaceState(null, '', `${caminho}${busca}${hash}`)
  localStorage.clear()
  if (tema) localStorage.setItem(CHAVE_TEMA, tema)
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
    localStorage.clear()
    for (const link of document.head.querySelectorAll('link[rel="preload"]')) link.remove()
  })

  const preloadDaFoto = () => document.head.querySelector<HTMLLinkElement>('link[rel="preload"][as="image"]')

  it('CA-1485 (spec landing-escura): a landing escura não tem foto no topo; o <head> não pré-carrega imagem nenhuma', () => {
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

  it('CB-321: sem localStorage, nada quebra e vale o tema do sistema', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    const key = vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(() => rodar({ sistemaEscuro: true })).not.toThrow()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    getItem.mockRestore()
    key.mockRestore()
  })
})
