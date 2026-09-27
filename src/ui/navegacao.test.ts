import { ABAS, escreverRota, ETAPAS, lerRota, ROTA_INICIAL } from './navegacao.ts'

describe('navegação por endereço', () => {
  it.each([
    ['', ROTA_INICIAL],
    ['#/', ROTA_INICIAL],
    ['#/casos', { tela: 'casos' }],
    ['#/caso/abc-123', { tela: 'planejador', casoId: 'abc-123', aba: 'caso' }],
    ['#/caso/abc-123/plano', { tela: 'planejador', casoId: 'abc-123', aba: 'plano' }],
    ['#/caso/abc-123/adequacao', { tela: 'planejador', casoId: 'abc-123', aba: 'adequacao' }],
    ['#/caso/abc-123/qualquer', { tela: 'planejador', casoId: 'abc-123', aba: 'caso' }],
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
