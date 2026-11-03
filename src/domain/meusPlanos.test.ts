// O aparelho lembra os links abertos (spec lado-do-paciente, D-1218, DP-LP-21, CA-2227, CB-1201, CB-1203 e CB-1226).
import { CHAVE_DOS_MEUS_PLANOS, esquecerPlano, lembrarPlano, lerMeusPlanos, nomeDoPlanoLembrado, trocarTokenLembrado, type PlanoLembrado } from './meusPlanos.ts'
import type { Armazenamento } from './persistencia.ts'

function memoria(): Armazenamento & { readonly dados: Map<string, string> } {
  const dados = new Map<string, string>()
  return {
    dados,
    getItem: (chave) => dados.get(chave) ?? null,
    setItem: (chave, valor) => void dados.set(chave, valor),
    removeItem: (chave) => void dados.delete(chave),
  }
}

const token = (n: number): string => `token${String(n).padStart(7, '0')}`
const plano = (n: number, extra: Partial<PlanoLembrado> = {}): PlanoLembrado => ({ token: token(n), primeiroNome: `Paciente${n}`, nutricionista: 'Ana Lima', ultimoAcesso: '2026-11-03', ...extra })

describe('CA-2227: o aparelho lembra o link aberto', () => {
  it('CA-2227: um link aberto uma vez fica lembrado, com o primeiro nome e o nome da nutricionista', () => {
    const a = memoria()
    lembrarPlano(a, { token: 'k7q2mx9pla3r', primeiroNome: 'Juliana', nutricionista: 'Ana Lima', ultimoAcesso: '2026-11-03' })
    expect(lerMeusPlanos(a)).toEqual([{ token: 'k7q2mx9pla3r', primeiroNome: 'Juliana', nutricionista: 'Ana Lima', ultimoAcesso: '2026-11-03' }])
    expect(nomeDoPlanoLembrado(lerMeusPlanos(a)[0] ?? plano(0))).toBe('Juliana · Ana Lima')
  })

  it('D-1218: o aparelho não guarda a dieta nem as missões: só o token, os dois nomes e o dia', () => {
    const a = memoria()
    lembrarPlano(a, { ...plano(1), missoes: ['x'] } as unknown as PlanoLembrado)
    const guardado = JSON.parse(a.dados.get(CHAVE_DOS_MEUS_PLANOS) ?? '[]') as Record<string, unknown>[]
    expect(Object.keys(guardado[0] ?? {}).sort()).toEqual(['nutricionista', 'primeiroNome', 'token', 'ultimoAcesso'])
  })

  it('CA-2227: com 2 links lembrados, os dois, o mais recente primeiro', () => {
    const a = memoria()
    lembrarPlano(a, plano(1))
    lembrarPlano(a, plano(2))
    expect(lerMeusPlanos(a).map((p) => p.token)).toEqual([token(2), token(1)])
  })

  it('CA-2227: com 6, só os 5 mais recentes', () => {
    const a = memoria()
    for (let n = 1; n <= 6; n++) lembrarPlano(a, plano(n))
    expect(lerMeusPlanos(a).map((p) => p.token)).toEqual([6, 5, 4, 3, 2].map(token))
  })

  it('CA-2227: abrir de novo um link já lembrado o traz para o começo, sem repetir', () => {
    const a = memoria()
    lembrarPlano(a, plano(1))
    lembrarPlano(a, plano(2))
    lembrarPlano(a, plano(1, { ultimoAcesso: '2026-11-04' }))
    expect(lerMeusPlanos(a).map((p) => [p.token, p.ultimoAcesso])).toEqual([
      [token(1), '2026-11-04'],
      [token(2), '2026-11-03'],
    ])
  })

  it('CB-1205: aberto sem internet, sem o nome da nutricionista, fica o nome que já estava guardado', () => {
    const a = memoria()
    lembrarPlano(a, plano(1))
    lembrarPlano(a, plano(1, { nutricionista: '' }))
    expect(lerMeusPlanos(a)[0]?.nutricionista).toBe('Ana Lima')
  })

  it('CB-1201: mãe e filho no mesmo aparelho: os dois links, cada um pelo primeiro nome', () => {
    const a = memoria()
    lembrarPlano(a, plano(1, { primeiroNome: 'Mariana' }))
    lembrarPlano(a, plano(2, { primeiroNome: 'Pedro' }))
    expect(lerMeusPlanos(a).map(nomeDoPlanoLembrado)).toEqual(['Pedro · Ana Lima', 'Mariana · Ana Lima'])
  })

  it('CB-1200: paciente com duas nutricionistas: cada link lembrado à parte', () => {
    const a = memoria()
    lembrarPlano(a, plano(1, { primeiroNome: 'Juliana', nutricionista: 'Ana Lima' }))
    lembrarPlano(a, plano(2, { primeiroNome: 'Juliana', nutricionista: 'Carlos Souza' }))
    expect(lerMeusPlanos(a).map(nomeDoPlanoLembrado)).toEqual(['Juliana · Carlos Souza', 'Juliana · Ana Lima'])
  })

  it('CB-1227: plano sem nome nem nutricionista: "Seu plano"', () => {
    expect(nomeDoPlanoLembrado(plano(1, { primeiroNome: '', nutricionista: '' }))).toBe('Seu plano')
  })
})

describe('CA-2228 e CB-1203: esquecer', () => {
  it('CA-2228: "Esquecer neste aparelho" tira só aquele link', () => {
    const a = memoria()
    lembrarPlano(a, plano(1))
    lembrarPlano(a, plano(2))
    esquecerPlano(a, token(1))
    expect(lerMeusPlanos(a).map((p) => p.token)).toEqual([token(2)])
  })

  it('CB-1203: o iPhone apagou o que o Safari guardou: a lista volta vazia, sem erro', () => {
    const a = memoria()
    lembrarPlano(a, plano(1))
    a.dados.clear()
    expect(lerMeusPlanos(a)).toEqual([])
  })

  it('D-1217: o endereço antigo trocado pelo do link fixo passa a lembrança para o token novo', () => {
    const a = memoria()
    lembrarPlano(a, plano(1))
    trocarTokenLembrado(a, token(1), token(9))
    expect(lerMeusPlanos(a).map((p) => p.token)).toEqual([token(9)])
  })
})

describe('CB-1226: sem armazenamento', () => {
  it('CB-1226: aba anônima (sem localStorage): nada é lembrado e nada quebra', () => {
    expect(lerMeusPlanos(null)).toEqual([])
    expect(() => lembrarPlano(null, plano(1))).not.toThrow()
  })

  it('CB-1226: armazenamento que recusa gravar: o link abre, o aparelho só não lembra', () => {
    const cheio: Armazenamento = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError') }, removeItem: () => undefined }
    expect(() => lembrarPlano(cheio, plano(1))).not.toThrow()
  })

  it('guardado estragado conta como nada; token fora do formato não entra', () => {
    const a = memoria()
    a.dados.set(CHAVE_DOS_MEUS_PLANOS, '{quebrado')
    expect(lerMeusPlanos(a)).toEqual([])
    a.dados.set(CHAVE_DOS_MEUS_PLANOS, JSON.stringify([{ token: '<script>', ultimoAcesso: '2026-11-03' }, plano(1)]))
    expect(lerMeusPlanos(a).map((p) => p.token)).toEqual([token(1)])
  })
})
