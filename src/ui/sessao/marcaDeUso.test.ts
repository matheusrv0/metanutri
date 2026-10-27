import { apagarMarca, CHAVE_MARCA_DA_SESSAO, deveGravarUso, GRAVAR_USO_A_CADA_MS, gravarMarca, lerMarca, ultimoUso, type MarcaDaSessao } from './marcaDeUso.ts'

const MARCA: MarcaDaSessao = { conta: 'u1', uso: 1_000_000, entrada: 900_000, admin: false, desvio: -5_000 }

describe('a marca de uso da sessão (spec separacao-site-app, D-515 e DP-SA-5)', () => {
  beforeEach(() => localStorage.clear())

  it('fica fora do espaço da conta, numa chave só, e volta como foi gravada', () => {
    gravarMarca(localStorage, MARCA)
    expect(CHAVE_MARCA_DA_SESSAO).toBe('metanutri:sessao')
    expect(Object.keys(localStorage)).toEqual(['metanutri:sessao'])
    expect(lerMarca(localStorage, 'u1')).toEqual(MARCA)
  })

  it('CA-1445: as abas dividem a marca: o uso gravado por uma vale para a outra', () => {
    const abaA = localStorage
    const abaB = localStorage
    gravarMarca(abaA, MARCA)
    gravarMarca(abaA, { ...MARCA, uso: 2_000_000 })
    expect(lerMarca(abaB, 'u1')?.uso).toBe(2_000_000)
  })

  it('CB-518: a marca de outra conta não vale para a conta que está dentro', () => {
    gravarMarca(localStorage, MARCA)
    expect(lerMarca(localStorage, 'u2')).toBeNull()
  })

  it('CB-517: sem marca (sessão aberta antes da P1, ou marca apagada), nada se lê; quem chama usa a hora da entrada', () => {
    expect(lerMarca(localStorage, 'u1')).toBeNull()
    expect(ultimoUso(null, null, 900_000)).toBe(900_000)
  })

  it('o último uso é o maior entre a marca, o da memória desta aba e a entrada (DP-SA-18)', () => {
    expect(ultimoUso(MARCA, null, 900_000)).toBe(1_000_000)
    expect(ultimoUso(MARCA, 1_500_000, 900_000)).toBe(1_500_000)
    expect(ultimoUso({ ...MARCA, uso: 100 }, null, 900_000)).toBe(900_000)
  })

  it('marca estragada ou com campo faltando não vale', () => {
    for (const valor of ['{quebrado', '"texto"', 'null', JSON.stringify({ ...MARCA, uso: 'ontem' }), JSON.stringify({ ...MARCA, conta: 7 }), JSON.stringify({ ...MARCA, desvio: null })]) {
      localStorage.setItem(CHAVE_MARCA_DA_SESSAO, valor)
      expect(lerMarca(localStorage, 'u1'), valor).toBeNull()
    }
  })

  it('a entrada pode ser nula, e o "saindo" (DP-SA-6) volta só quando é número', () => {
    gravarMarca(localStorage, { ...MARCA, entrada: null, saindo: 1_020_000 })
    expect(lerMarca(localStorage, 'u1')).toEqual({ ...MARCA, entrada: null, saindo: 1_020_000 })
    localStorage.setItem(CHAVE_MARCA_DA_SESSAO, JSON.stringify({ ...MARCA, saindo: 'logo' }))
    expect(lerMarca(localStorage, 'u1')).toEqual(MARCA)
  })

  it('apagar tira a marca', () => {
    gravarMarca(localStorage, MARCA)
    apagarMarca(localStorage)
    expect(localStorage.getItem(CHAVE_MARCA_DA_SESSAO)).toBeNull()
  })

  it('DP-SA-5: o uso é gravado no máximo a cada 60 s', () => {
    expect(GRAVAR_USO_A_CADA_MS).toBe(60_000)
    expect(deveGravarUso(null, 5_000)).toBe(true)
    expect(deveGravarUso(5_000, 5_000 + 59_999)).toBe(false)
    expect(deveGravarUso(5_000, 5_000 + 60_000)).toBe(true)
  })

  it('CB-500: navegador sem armazenamento, ou que não deixa ler nem gravar: nada quebra', () => {
    expect(lerMarca(null, 'u1')).toBeNull()
    expect(() => gravarMarca(null, MARCA)).not.toThrow()
    const bloqueado = {
      getItem: () => {
        throw new DOMException('bloqueado', 'SecurityError')
      },
      setItem: () => {
        throw new DOMException('cheio', 'QuotaExceededError')
      },
      removeItem: () => {
        throw new DOMException('bloqueado', 'SecurityError')
      },
    }
    expect(lerMarca(bloqueado, 'u1')).toBeNull()
    expect(() => gravarMarca(bloqueado, MARCA)).not.toThrow()
    expect(() => apagarMarca(bloqueado)).not.toThrow()
  })
})
