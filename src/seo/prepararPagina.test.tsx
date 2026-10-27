// O script do <head> do site (public/preparar-pagina.js), rodado como o navegador roda: antes do primeiro desenho
// (spec site-publico-profissional, D-332 e CA-1017; spec separacao-site-app, D-503, D-510 e T19). O `location` do script
// é um dublê: o jsdom não navega.
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
  /** Aberto como aplicativo instalado (o ícone do endereço antigo). */
  readonly instalado?: boolean
  /** O `data-app` que o build põe no <html> (DP-SA-2); sem ele, o script usa o de produção. */
  readonly app?: string | null
  /** O `<base href="../">` das páginas de subpasta. */
  readonly base?: string
}

interface Rodada {
  readonly classes: DOMTokenList
  /** Para onde o script mandou a página (`location.replace`), ou nulo. */
  readonly foiPara: string | null
}

const APP = 'https://app.metanutri.com.br/'

function rodar({
  hash = '',
  busca = '',
  caminho = '/',
  rotaDaPagina,
  tema,
  temaDaLanding,
  sistemaEscuro = false,
  sessao = false,
  instalado = false,
  app = APP,
  base,
}: Cenario): Rodada {
  const raiz = document.documentElement
  raiz.className = ''
  raiz.removeAttribute('style')
  raiz.removeAttribute('data-tema-da-landing')
  if (rotaDaPagina) raiz.setAttribute('data-rota', rotaDaPagina)
  else raiz.removeAttribute('data-rota')
  if (app === null) raiz.removeAttribute('data-app')
  else raiz.setAttribute('data-app', app)
  for (const velha of document.head.querySelectorAll('base')) velha.remove()
  if (base) document.head.append(Object.assign(document.createElement('base'), { href: base }))
  globalThis.history.replaceState(null, '', `${caminho}${busca}${hash}`)
  localStorage.clear()
  if (tema) localStorage.setItem(CHAVE_TEMA, tema)
  if (temaDaLanding !== undefined) localStorage.setItem(CHAVE_TEMA_DA_LANDING, temaDaLanding)
  if (sessao) {
    localStorage.setItem('sb-abcdefgh-auth-token', '{}')
    localStorage.setItem('metanutri:conta:u1:pacientes', '[]')
  }
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: (sistemaEscuro && consulta.includes('dark')) || (instalado && consulta.includes('display-mode: standalone')),
  }))
  let foiPara: string | null = null
  const local = { hash, search: busca, pathname: caminho, replace: (endereco: string) => void (foiPara = endereco) }
  // Roda o arquivo como o navegador: o texto inteiro, no escopo global, com o `location` do dublê.
  new Function('location', SCRIPT)(local)
  vi.unstubAllGlobals()
  return { classes: raiz.classList, foiPara }
}

describe('preparar-pagina.js', () => {
  afterEach(() => {
    document.documentElement.className = ''
    document.documentElement.removeAttribute('data-rota')
    document.documentElement.removeAttribute('data-app')
    document.documentElement.removeAttribute('data-tema-da-landing')
    for (const base of document.head.querySelectorAll('base')) base.remove()
    localStorage.clear()
    for (const link of document.head.querySelectorAll('link[rel="preload"]')) link.remove()
  })

  const preloadDaFoto = () => document.head.querySelector<HTMLLinkElement>('link[rel="preload"][as="image"]')

  it('CA-1485 e D-654: o <head> não pré-carrega imagem nenhuma (a foto do topo da v9 vem do HTML pré-desenhado)', () => {
    for (const cenario of [{ hash: '' }, { hash: '#/painel' }, { hash: '', sessao: true }, { rotaDaPagina: 'precos' }, { busca: '?volta=confirmacao&code=x' }]) {
      for (const link of document.head.querySelectorAll('link[rel="preload"]')) link.remove()
      rodar(cenario)
      expect(preloadDaFoto(), JSON.stringify(cenario)).toBeNull()
    }
  })

  it('CA-1017: usa a mesma chave de tema do app', () => {
    expect(SCRIPT).toContain(`'${CHAVE_TEMA}'`)
  })

  it('CA-1017: tema escuro guardado, ou o do sistema sem escolha, liga o escuro antes do app', () => {
    expect(rodar({ tema: 'escuro' }).classes.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(rodar({ sistemaEscuro: true }).classes.contains('dark')).toBe(true)
    expect(rodar({ tema: 'sistema', sistemaEscuro: true }).classes.contains('dark')).toBe(true)
    expect(rodar({ tema: 'claro', sistemaEscuro: true }).classes.contains('dark')).toBe(false)
    expect(rodar({}).classes.contains('dark')).toBe(false)
  })

  it('CA-1423 e CB-512: o link do paciente vai ao app antes de desenhar, mesmo com sessão e dados guardados', () => {
    expect(rodar({ hash: '#/missoes/abc123' }).foiPara).toBe(`${APP}#/missoes/abc123`)
    expect(rodar({ hash: '#/missoes/abc123', sessao: true }).foiPara).toBe(`${APP}#/missoes/abc123`)
    expect(rodar({ hash: '#/missoes/abc123', rotaDaPagina: 'termos', caminho: '/termos/' }).foiPara).toBe(`${APP}#/missoes/abc123`)
  })

  it('DP-SA-2: o endereço do app vem do <html>; sem ele, o de produção', () => {
    expect(rodar({ hash: '#/missoes/abc', app: 'http://localhost:4176/' }).foiPara).toBe('http://localhost:4176/#/missoes/abc')
    expect(rodar({ hash: '#/missoes/abc', app: null }).foiPara).toBe(`${APP}#/missoes/abc`)
  })

  it('CA-1405: as rotas antigas de página vão à página própria; o plano de #/precos/<plano> vai em destaque', () => {
    expect(rodar({ hash: '#/precos' }).foiPara).toBe('http://localhost:3000/precos/')
    expect(rodar({ hash: '#/precos/pro' }).foiPara).toBe('http://localhost:3000/precos/?destaque=pro')
    expect(rodar({ hash: '#/precos/inventado' }).foiPara).toBe('http://localhost:3000/precos/')
    expect(rodar({ hash: '#/termos' }).foiPara).toBe('http://localhost:3000/termos/')
    expect(rodar({ hash: '#/privacidade' }).foiPara).toBe('http://localhost:3000/privacidade/')
    expect(rodar({ hash: '#/fontes' }).foiPara).toBe('http://localhost:3000/fontes/')
    expect(rodar({ hash: '#/inicio' }).foiPara).toBe('http://localhost:3000/')
    // De uma página de subpasta, pelo <base href="../">.
    expect(rodar({ hash: '#/precos/solo', caminho: '/termos/', rotaDaPagina: 'termos', base: '../' }).foiPara).toBe(
      'http://localhost:3000/precos/?destaque=solo',
    )
  })

  it('D-501: a raiz e as páginas próprias mostram a vitrine, sem ir a lugar nenhum, com ou sem sessão guardada', () => {
    for (const cenario of [{}, { sessao: true }, { rotaDaPagina: 'precos', caminho: '/precos/' }, { hash: '#como-funciona' }, { busca: '?destaque=pro' }]) {
      const { classes, foiPara } = rodar(cenario)
      expect(classes.contains('sem-vitrine'), JSON.stringify(cenario)).toBe(false)
      expect(foiPara, JSON.stringify(cenario)).toBeNull()
    }
  })

  it('D-511: o script não procura mais sessão', () => {
    expect(SCRIPT).not.toMatch(/auth-token|sessao/)
  })

  it('D-527: tela do app, volta do e-mail ou do pagamento e o ícone instalado escondem a vitrine e deixam a decisão para o pacote', () => {
    for (const cenario of [
      { hash: '#/painel' },
      { hash: '#/caso/c1/plano' },
      { hash: '#/entrar', rotaDaPagina: 'precos', caminho: '/precos/' },
      { busca: '?volta=confirmacao&code=abc' },
      { busca: '?volta=pagamento', hash: '#/painel' },
      { instalado: true },
    ]) {
      const { classes, foiPara } = rodar(cenario)
      expect(classes.contains('sem-vitrine'), JSON.stringify(cenario)).toBe(true)
      expect(foiPara, JSON.stringify(cenario)).toBeNull()
    }
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
