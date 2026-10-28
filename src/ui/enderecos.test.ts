import { APP_EM_PRODUCAO, ENDERECO_DO_APP, ENDERECO_DO_SITE, enderecoOficial, enderecoOuPadrao, paginaDoSite, SITE_EM_PRODUCAO, telaNoApp } from './enderecos.ts'

describe('os dois endereços (spec separacao-site-app, D-500 e DP-SA-3)', () => {
  it('DP-SA-3: sem variável, valem os endereços de produção', () => {
    expect(APP_EM_PRODUCAO).toBe('https://app.metanutri.com.br/')
    expect(SITE_EM_PRODUCAO).toBe('https://metanutri.com.br/')
    expect(ENDERECO_DO_APP).toBe(APP_EM_PRODUCAO)
    expect(ENDERECO_DO_SITE).toBe(SITE_EM_PRODUCAO)
  })

  it('DP-SA-3: a variável dos testes de navegador troca o endereço, sempre com a barra do fim', () => {
    expect(enderecoOuPadrao('http://localhost:4176', APP_EM_PRODUCAO)).toBe('http://localhost:4176/')
    expect(enderecoOuPadrao(' https://outro.exemplo/qualquer/coisa ', APP_EM_PRODUCAO)).toBe('https://outro.exemplo/')
  })

  it('DP-SA-3: vazia, inválida ou de outro protocolo, a variável não vale', () => {
    for (const valor of [undefined, null, '', '   ', 'sem protocolo', 'javascript:alert(1)', 'ftp://exemplo.com', 42]) {
      expect(enderecoOuPadrao(valor, SITE_EM_PRODUCAO)).toBe(SITE_EM_PRODUCAO)
    }
  })

  it('D-505 e DP-SA-37: a página do site, com o plano em destaque só em Preços', () => {
    expect(paginaDoSite('inicio')).toBe('https://metanutri.com.br/')
    expect(paginaDoSite('precos')).toBe('https://metanutri.com.br/precos/')
    expect(paginaDoSite('precos', 'pro')).toBe('https://metanutri.com.br/precos/?destaque=pro')
    expect(paginaDoSite('termos', 'pro')).toBe('https://metanutri.com.br/termos/')
    expect(paginaDoSite('privacidade')).toBe('https://metanutri.com.br/privacidade/')
    expect(paginaDoSite('fontes')).toBe('https://metanutri.com.br/fontes/')
  })

  it('D-510: a tela do app leva a consulta e o `#`', () => {
    expect(telaNoApp()).toBe('https://app.metanutri.com.br/')
    expect(telaNoApp('#/criar-conta/solo/anual')).toBe('https://app.metanutri.com.br/#/criar-conta/solo/anual')
    expect(telaNoApp('#/painel', '?volta=pagamento')).toBe('https://app.metanutri.com.br/?volta=pagamento#/painel')
  })

  it('CA-1417: o app num endereço da Cloudflare vai ao oficial, com a mesma consulta e o mesmo `#`', () => {
    expect(enderecoOficial({ hostname: 'metanutri.pages.dev', search: '', hash: '#/pacientes' })).toBe('https://app.metanutri.com.br/#/pacientes')
    expect(enderecoOficial({ hostname: 'a1b2c3.metanutri.pages.dev', search: '?volta=pagamento', hash: '' })).toBe(
      'https://app.metanutri.com.br/?volta=pagamento',
    )
    expect(enderecoOficial({ hostname: 'METANUTRI.PAGES.DEV', search: '', hash: '' })).toBe('https://app.metanutri.com.br/')
  })

  it('CA-1417: no endereço oficial e em qualquer outro, nada a fazer', () => {
    for (const hostname of ['app.metanutri.com.br', 'localhost', 'outro-metanutri.pages.dev', 'metanutri.pages.dev.exemplo.com', 'pages.dev']) {
      expect(enderecoOficial({ hostname, search: '', hash: '#/painel' })).toBeNull()
    }
  })
})
