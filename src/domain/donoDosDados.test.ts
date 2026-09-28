import { CHAVE_DONO, apagarDadosDoAparelho, registrarDono, situacaoAoEntrar } from './donoDosDados.ts'
import type { Armazenamento } from './persistencia.ts'

function memoria(inicial: Record<string, string> = {}): Armazenamento & { readonly dados: Map<string, string> } {
  const dados = new Map(Object.entries(inicial))
  return {
    dados,
    getItem: (c) => dados.get(c) ?? null,
    setItem: (c, v) => void dados.set(c, v),
    removeItem: (c) => void dados.delete(c),
  }
}

describe('dono dos dados do aparelho (spec estilo-spora, D-24)', () => {
  it('CA-151: aparelho sem dono é adotado pela primeira conta', () => {
    const arm = memoria({ 'metanutri:casos': '["a"]' })
    expect(situacaoAoEntrar(arm, 'conta-1')).toBe('adotar')
    registrarDono(arm, 'conta-1')
    expect(arm.dados.get(CHAVE_DONO)).toBe('conta-1')
    expect(situacaoAoEntrar(arm, 'conta-1')).toBe('mesmo')
  })

  it('CA-152: outra conta no mesmo aparelho é conflito', () => {
    const arm = memoria({ [CHAVE_DONO]: 'conta-1' })
    expect(situacaoAoEntrar(arm, 'conta-2')).toBe('conflito')
  })

  it('CA-153: apagar leva planos, pacientes, acompanhamentos e o dono', () => {
    const arm = memoria({
      [CHAVE_DONO]: 'conta-1',
      'metanutri:casos': '["x"]',
      'metanutri:caso:x': '{}',
      'metanutri:pacientes': '[]',
      'metanutri:acompanhamentos': '[]',
      'metanutri:tema': 'escuro',
    })
    apagarDadosDoAparelho(arm)
    expect([...arm.dados.keys()]).toEqual(['metanutri:tema'])
  })

  it('sem armazenamento, ninguém briga e nada quebra', () => {
    expect(situacaoAoEntrar(null, 'conta-1')).toBe('adotar')
    registrarDono(null, 'conta-1')
    apagarDadosDoAparelho(null)
  })
})
