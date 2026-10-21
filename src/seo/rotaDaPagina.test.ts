import { enderecoDaVitrine, enderecoDoApp } from './rotaDaPagina.ts'

describe('enderecoDaVitrine (spec site-publico-profissional, D-337, CA-1023)', () => {
  const raiz = { hash: '', busca: '', caminho: '/', comServidor: true, vitrineEscondida: false }

  it('a raiz sem sessão, com o servidor de conta, vai para #/inicio antes de o app montar', () => {
    expect(enderecoDaVitrine(raiz)).toBe('/#/inicio')
    expect(enderecoDaVitrine({ ...raiz, hash: '#/' })).toBe('/#/inicio')
    expect(enderecoDaVitrine({ ...raiz, busca: '?origem=busca' })).toBe('/?origem=busca#/inicio')
  })

  it('não mexe sem servidor (a raiz é a área de trabalho), com a vitrine escondida (sessão), com rota no endereço ou na volta do e-mail', () => {
    expect(enderecoDaVitrine({ ...raiz, comServidor: false })).toBeNull()
    expect(enderecoDaVitrine({ ...raiz, vitrineEscondida: true })).toBeNull()
    expect(enderecoDaVitrine({ ...raiz, hash: '#/precos' })).toBeNull()
    expect(enderecoDaVitrine({ ...raiz, busca: '?volta=confirmacao&code=abc' })).toBeNull()
  })
})

describe('enderecoDoApp (spec site-publico-profissional, D-331, CA-1015)', () => {
  it('a página própria de Preços, sem rota no endereço, vira a raiz com #/precos', () => {
    expect(enderecoDoApp('precos', '', '', 'https://metanutri.com.br/')).toBe('https://metanutri.com.br/#/precos')
    expect(enderecoDoApp('fontes', '', '?origem=busca', 'https://metanutri.com.br/')).toBe('https://metanutri.com.br/?origem=busca#/fontes')
  })

  it('CA-1025: o endereço de página própria sem a barra do fim (o service worker entrega a inicial) também abre a tela dela', () => {
    expect(enderecoDoApp(undefined, '', '', 'https://metanutri.com.br/precos', '/precos')).toBe('https://metanutri.com.br/#/precos')
    expect(enderecoDoApp(undefined, '', '?x=1', 'https://metanutri.com.br/termos', '/termos')).toBe('https://metanutri.com.br/?x=1#/termos')
    expect(enderecoDoApp(undefined, '', '', 'https://metanutri.com.br/', '/')).toBeNull()
    expect(enderecoDoApp(undefined, '', '', 'https://metanutri.com.br/painel', '/painel')).toBeNull()
  })

  it('não mexe na página inicial, numa rota que já está no endereço nem em página desconhecida', () => {
    expect(enderecoDoApp(undefined, '', '', 'https://metanutri.com.br/')).toBeNull()
    expect(enderecoDoApp('inicio', '', '', 'https://metanutri.com.br/')).toBeNull()
    expect(enderecoDoApp('precos', '#/entrar', '', 'https://metanutri.com.br/')).toBeNull()
    expect(enderecoDoApp('painel', '', '', 'https://metanutri.com.br/')).toBeNull()
  })
})
