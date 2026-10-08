import { armazenamentoDaConta, chaveDoEvento } from './armazenamentoDaConta.ts'
import { CHAVES_DE_DADOS, montarBackup, restaurarBackup } from './perfil.ts'
import type { ArmazenamentoListavel } from './persistencia.ts'

/** Um `localStorage` de mentira, que lista as chaves na ordem em que entraram. */
function aparelho(inicial: Record<string, string> = {}): ArmazenamentoListavel & { readonly dados: Map<string, string> } {
  const dados = new Map(Object.entries(inicial))
  return {
    dados,
    get length() {
      return dados.size
    },
    key: (i) => [...dados.keys()][i] ?? null,
    getItem: (c) => dados.get(c) ?? null,
    setItem: (c, v) => void dados.set(c, v),
    removeItem: (c) => void dados.delete(c),
  }
}

const todas = (arm: ArmazenamentoListavel): string[] => Array.from({ length: arm.length }, (_, i) => arm.key(i) ?? '')

describe('armazenamento separado por conta (D-120)', () => {
  it('grava com o prefixo da conta e lê pelo nome original', () => {
    const base = aparelho()
    const contaA = armazenamentoDaConta(base, 'conta-a')
    contaA.setItem('metanutri:casos', '["x"]')
    expect(base.dados.get('metanutri:conta:conta-a:casos')).toBe('["x"]')
    expect(base.dados.has('metanutri:casos')).toBe(false)
    expect(contaA.getItem('metanutri:casos')).toBe('["x"]')
  })

  it('duas contas não se veem', () => {
    const base = aparelho()
    const contaA = armazenamentoDaConta(base, 'conta-a')
    const contaB = armazenamentoDaConta(base, 'conta-b')
    contaA.setItem('metanutri:pacientes', '[{"id":"ana"}]')
    expect(contaB.getItem('metanutri:pacientes')).toBeNull()
    contaB.setItem('metanutri:pacientes', '[{"id":"bia"}]')
    expect(contaA.getItem('metanutri:pacientes')).toBe('[{"id":"ana"}]')
  })

  it('não lê a chave sem prefixo nem a de outra conta', () => {
    const base = aparelho({ 'metanutri:casos': '["antigo"]', 'metanutri:conta:conta-b:casos': '["b"]' })
    expect(armazenamentoDaConta(base, 'conta-a').getItem('metanutri:casos')).toBeNull()
  })

  it('lista só as chaves da conta, com o nome original', () => {
    const base = aparelho({
      'metanutri:tema': 'escuro',
      'metanutri:casos': '["antigo"]',
      'sb-projeto-auth-token': '{}',
      'metanutri:conta:conta-a:casos': '["x"]',
      'metanutri:conta:conta-b:casos': '["y"]',
      'metanutri:conta:conta-a:caso:x': '{}',
    })
    const contaA = armazenamentoDaConta(base, 'conta-a')
    expect(contaA.length).toBe(2)
    expect(todas(contaA)).toEqual(['metanutri:casos', 'metanutri:caso:x'])
    expect(contaA.key(2)).toBeNull()
  })

  it('removeItem e clear só mexem na conta', () => {
    const base = aparelho({
      'metanutri:tema': 'escuro',
      'metanutri:casos': '["antigo"]',
      'sb-projeto-auth-token': '{}',
      'metanutri:conta:conta-a:casos': '["x"]',
      'metanutri:conta:conta-a:caso:x': '{}',
      'metanutri:conta:conta-b:casos': '["y"]',
    })
    const contaA = armazenamentoDaConta(base, 'conta-a')
    contaA.removeItem('metanutri:caso:x')
    expect(base.dados.has('metanutri:conta:conta-a:caso:x')).toBe(false)
    contaA.clear()
    expect([...base.dados.keys()]).toEqual(['metanutri:tema', 'metanutri:casos', 'sb-projeto-auth-token', 'metanutri:conta:conta-b:casos'])
  })

  it('um id não invade o espaço de outro que começa igual', () => {
    const base = aparelho()
    armazenamentoDaConta(base, 'a:b').setItem('metanutri:casos', '["ab"]')
    const contaA = armazenamentoDaConta(base, 'a')
    expect(contaA.length).toBe(0)
    expect(contaA.getItem('metanutri:casos')).toBeNull()
    contaA.clear()
    expect(armazenamentoDaConta(base, 'a:b').getItem('metanutri:casos')).toBe('["ab"]')
  })

  it('funciona por cima do localStorage do navegador', () => {
    localStorage.clear()
    localStorage.setItem('metanutri:tema', 'claro')
    const contaA = armazenamentoDaConta(localStorage, 'conta-a')
    contaA.setItem('metanutri:perfil', '{}')
    expect(localStorage.getItem('metanutri:conta:conta-a:perfil')).toBe('{}')
    expect(todas(contaA)).toEqual(['metanutri:perfil'])
    contaA.clear()
    expect(localStorage.getItem('metanutri:tema')).toBe('claro')
    expect(localStorage.length).toBe(1)
  })

  it('recusa chave de fora do MetaNutri e conta sem id', () => {
    const base = aparelho()
    expect(() => armazenamentoDaConta(base, 'conta-a').setItem('outro-app', '1')).toThrow()
    expect(() => armazenamentoDaConta(base, '')).toThrow()
    expect(base.dados.size).toBe(0)
  })

  it('CA-470: o backup sai com os nomes originais, só da conta, e volta para a conta que restaura', () => {
    const base = aparelho({
      'metanutri:conta:conta-a:casos': '["x"]',
      'metanutri:conta:conta-a:caso:x': '{"nome":"Plano da Ana"}',
      'metanutri:conta:conta-a:pacientes': '[{"id":"ana"}]',
      'metanutri:conta:conta-b:pacientes': '[{"id":"bia"}]',
      'metanutri:tema': 'escuro',
    })
    const backup = montarBackup(armazenamentoDaConta(base, 'conta-a'), [...CHAVES_DE_DADOS], '2026-10-07T00:00:00.000Z')
    expect(backup.dados).toEqual({
      'metanutri:casos': '["x"]',
      'metanutri:pacientes': '[{"id":"ana"}]',
      'metanutri:caso:x': '{"nome":"Plano da Ana"}',
    })

    const contaC = armazenamentoDaConta(base, 'conta-c')
    expect(restaurarBackup(contaC, JSON.stringify(backup)).restaurados).toBe(3)
    expect(base.dados.get('metanutri:conta:conta-c:pacientes')).toBe('[{"id":"ana"}]')
    expect(base.dados.get('metanutri:conta:conta-b:pacientes')).toBe('[{"id":"bia"}]')
    expect(base.dados.has('metanutri:pacientes')).toBe(false)
  })
})

describe('chave de um evento storage', () => {
  it('no armazenamento da conta, traduz a chave dela e ignora o resto', () => {
    const contaA = armazenamentoDaConta(aparelho(), 'conta-a')
    expect(chaveDoEvento(contaA, 'metanutri:conta:conta-a:casos')).toBe('metanutri:casos')
    expect(chaveDoEvento(contaA, 'metanutri:conta:conta-b:casos')).toBeNull()
    expect(chaveDoEvento(contaA, 'metanutri:casos')).toBeNull()
  })

  it('no armazenamento do aparelho, só vale a chave sem prefixo de conta', () => {
    const base = aparelho()
    expect(chaveDoEvento(base, 'metanutri:casos')).toBe('metanutri:casos')
    expect(chaveDoEvento(base, 'metanutri:conta:conta-a:casos')).toBeNull()
    expect(chaveDoEvento(null, 'metanutri:casos')).toBe('metanutri:casos')
  })
})
