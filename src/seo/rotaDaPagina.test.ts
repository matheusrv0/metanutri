import { enderecoDoApp } from './rotaDaPagina.ts'

describe('enderecoDoApp (spec site-publico-profissional, D-331, CA-1015)', () => {
  it('a página própria de Preços, sem rota no endereço, vira a raiz com #/precos', () => {
    expect(enderecoDoApp('precos', '', '', 'https://metanutri.com.br/')).toBe('https://metanutri.com.br/#/precos')
    expect(enderecoDoApp('fontes', '', '?origem=busca', 'https://metanutri.com.br/')).toBe('https://metanutri.com.br/?origem=busca#/fontes')
  })

  it('não mexe na página inicial, numa rota que já está no endereço nem em página desconhecida', () => {
    expect(enderecoDoApp(undefined, '', '', 'https://metanutri.com.br/')).toBeNull()
    expect(enderecoDoApp('inicio', '', '', 'https://metanutri.com.br/')).toBeNull()
    expect(enderecoDoApp('precos', '#/entrar', '', 'https://metanutri.com.br/')).toBeNull()
    expect(enderecoDoApp('painel', '', '', 'https://metanutri.com.br/')).toBeNull()
  })
})
