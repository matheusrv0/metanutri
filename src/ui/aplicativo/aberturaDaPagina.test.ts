import { marcarAbertura, paginaAbriuNaVitrine } from './aberturaDaPagina.ts'

describe('aberturaDaPagina (spec site-publico-profissional, D-320 revista, CA-1026)', () => {
  it('a página que abriu numa tela de vitrine fica marcada', () => {
    for (const hash of ['#/inicio', '#/precos', '#/precos/solo', '#/termos', '#/privacidade', '#/fontes']) {
      marcarAbertura(hash)
      expect(paginaAbriuNaVitrine(), hash).toBe(true)
    }
  })

  it('a área de trabalho, o link do paciente, as telas de conta e a raiz sem rota não são vitrine', () => {
    for (const hash of ['', '#/painel', '#/caso/abc/plano', '#/missoes/abc', '#/entrar', '#/criar-conta', '#/assinar/solo/mensal']) {
      marcarAbertura(hash)
      expect(paginaAbriuNaVitrine(), hash).toBe(false)
    }
  })
})
