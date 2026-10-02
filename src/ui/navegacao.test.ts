import { ABAS, ehRotaLivre, ehTelaPublica, escreverRota, ETAPAS, lerRota, ROTA_INICIAL, type Rota } from './navegacao.ts'

describe('navegação por endereço', () => {
  it.each([
    ['', ROTA_INICIAL],
    ['#/', ROTA_INICIAL],
    ['#/casos', { tela: 'casos' }],
    ['#/caso/abc-123', { tela: 'planejador', casoId: 'abc-123', aba: 'caso' }],
    ['#/caso/abc-123/plano', { tela: 'planejador', casoId: 'abc-123', aba: 'plano' }],
    ['#/caso/abc-123/adequacao', { tela: 'planejador', casoId: 'abc-123', aba: 'adequacao' }],
    ['#/caso/abc-123/qualquer', { tela: 'planejador', casoId: 'abc-123', aba: 'caso' }],
    ['#/aprovacoes', { tela: 'aprovacoes' }],
    ['#/negocio', { tela: 'negocio' }],
    ['#/missoes/abc123xyz', { tela: 'missoes', token: 'abc123xyz' }],
    ['#/inexistente', ROTA_INICIAL],
    ['#/caso', ROTA_INICIAL],
    ['#/missoes', ROTA_INICIAL],
  ] as const)('"%s"', (hash, rota) => {
    expect(lerRota(hash)).toEqual(rota)
  })

  it('o link do paciente sobrevive à ida e volta', () => {
    const rota = { tela: 'missoes', token: 'kf3mq9zt7bnd' } as const
    expect(escreverRota(rota)).toBe('#/missoes/kf3mq9zt7bnd')
    expect(lerRota(escreverRota(rota))).toEqual(rota)
  })

  it('ida e volta preserva a rota, inclusive id com caracteres especiais', () => {
    const rota = { tela: 'planejador', casoId: 'caso com espaço/barra', aba: 'adequacao' } as const
    expect(lerRota(escreverRota(rota))).toEqual(rota)
    expect(escreverRota({ tela: 'casos' })).toBe('#/casos')
  })
})

describe('etapas do planejador', () => {
  it('cobrem todas as abas, na ordem, numeradas a partir de 1', () => {
    expect(ETAPAS.map((e) => e.aba)).toEqual(ABAS)
    expect(ETAPAS.map((e) => e.numero)).toEqual([1, 2, 3])
  })
})

describe('rotas da conta e do pagamento (spec estilo-spora)', () => {
  it.each([
    ['#/precos', { tela: 'precos' }],
    ['#/precos/pro', { tela: 'precos', destaque: 'pro' }],
    ['#/precos/ouro', { tela: 'precos' }],
    ['#/criar-conta', { tela: 'criar-conta' }],
    ['#/criar-conta/free', { tela: 'criar-conta' }],
    ['#/criar-conta/solo', { tela: 'criar-conta', plano: 'solo' }],
    ['#/criar-conta/solo/anual', { tela: 'criar-conta', plano: 'solo', ciclo: 'anual' }],
    ['#/criar-conta/estudante/anual', { tela: 'criar-conta', plano: 'estudante' }],
    ['#/criar-conta/clinica', { tela: 'criar-conta' }],
    ['#/confirmar-email', { tela: 'confirmar-email' }],
    ['#/confirmar-email/vencido', { tela: 'confirmar-email', vencido: true }],
    ['#/esqueci-senha', { tela: 'esqueci-senha' }],
    ['#/nova-senha', { tela: 'nova-senha' }],
    ['#/nova-senha/vencido', { tela: 'nova-senha', vencido: true }],
    ['#/termos', { tela: 'termos' }],
    ['#/privacidade', { tela: 'privacidade' }],
    ['#/assinar/pro/anual', { tela: 'assinar', plano: 'pro', ciclo: 'anual' }],
    ['#/assinar/solo', { tela: 'assinar', plano: 'solo', ciclo: 'mensal' }],
    ['#/assinar/free/mensal', { tela: 'precos' }],
    ['#/pagamento', { tela: 'pagamento' }],
  ] as const)('"%s"', (hash, rota) => {
    expect(lerRota(hash)).toEqual(rota)
  })

  it('toda rota nova sobrevive à ida e volta', () => {
    const rotas: Rota[] = [
      { tela: 'precos', destaque: 'solo' },
      { tela: 'criar-conta', plano: 'pro', ciclo: 'anual' },
      { tela: 'criar-conta', plano: 'estudante' },
      { tela: 'confirmar-email', vencido: true },
      { tela: 'nova-senha' },
      { tela: 'assinar', plano: 'solo', ciclo: 'mensal' },
      { tela: 'pagamento' },
      { tela: 'aprovacoes' },
    ]
    for (const rota of rotas) expect(lerRota(escreverRota(rota))).toEqual(rota)
  })

  it('CA-149: telas livres abrem sem sessão; checkout, pagamento e painel não', () => {
    expect(ehRotaLivre({ tela: 'termos' })).toBe(true)
    expect(ehRotaLivre({ tela: 'criar-conta' })).toBe(true)
    expect(ehRotaLivre({ tela: 'missoes', token: 'x' })).toBe(true)
    expect(ehRotaLivre({ tela: 'assinar', plano: 'solo', ciclo: 'mensal' })).toBe(false)
    expect(ehRotaLivre({ tela: 'pagamento' })).toBe(false)
    expect(ehRotaLivre({ tela: 'painel' })).toBe(false)
  })

  it('lê e escreve as rotas da verificação', () => {
    for (const rota of [{ tela: 'comprovar-matricula' }, { tela: 'aprovacoes' }] as const) {
      expect(lerRota(escreverRota(rota))).toEqual(rota)
    }
    expect(ehTelaPublica({ tela: 'comprovar-matricula' })).toBe(true)
    expect(ehRotaLivre({ tela: 'comprovar-matricula' })).toBe(false)
    expect(ehTelaPublica({ tela: 'aprovacoes' })).toBe(false)
  })

  it('CA-342: a tela Negócio tem endereço próprio e não é pública', () => {
    expect(escreverRota({ tela: 'negocio' })).toBe('#/negocio')
    expect(lerRota(escreverRota({ tela: 'negocio' }))).toEqual({ tela: 'negocio' })
    expect(ehTelaPublica({ tela: 'negocio' })).toBe(false)
  })
})

describe('Fontes da base (CA-322)', () => {
  it('#/fontes é uma página pública que abre sem conta', () => {
    expect(lerRota('#/fontes')).toEqual({ tela: 'fontes' })
    expect(escreverRota({ tela: 'fontes' })).toBe('#/fontes')
    expect(ehRotaLivre({ tela: 'fontes' })).toBe(true)
    expect(ehTelaPublica({ tela: 'fontes' })).toBe(true)
  })
})
