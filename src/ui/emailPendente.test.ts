import { CHAVE_EMAIL_PENDENTE, esquecerEmailPendente, guardarEmailPendente, lerEmailPendente } from './emailPendente.ts'

const T0 = new Date('2026-10-06T12:00:00Z')
const depois = (horas: number) => new Date(T0.getTime() + horas * 3_600_000)

describe('e-mail pendente guardado no aparelho (spec confirmacao-por-codigo)', () => {
  beforeEach(() => localStorage.clear())

  it('CA-417: guardado, o e-mail volta ao abrir de novo', () => {
    guardarEmailPendente(localStorage, 'maria@exemplo.com', T0)
    expect(lerEmailPendente(localStorage, depois(1))).toBe('maria@exemplo.com')
  })

  it('CB-103: depois de 24 horas é esquecido (e apagado do aparelho)', () => {
    guardarEmailPendente(localStorage, 'maria@exemplo.com', T0)
    expect(lerEmailPendente(localStorage, depois(23.9))).toBe('maria@exemplo.com')
    expect(lerEmailPendente(localStorage, depois(24.1))).toBeNull()
    expect(localStorage.getItem(CHAVE_EMAIL_PENDENTE)).toBeNull()
  })

  it('CA-418 e CA-419: esquecer apaga', () => {
    guardarEmailPendente(localStorage, 'maria@exemplo.com', T0)
    esquecerEmailPendente(localStorage)
    expect(lerEmailPendente(localStorage, T0)).toBeNull()
  })

  it('conteúdo estragado é ignorado, e sem armazenamento nada quebra', () => {
    localStorage.setItem(CHAVE_EMAIL_PENDENTE, '{lixo')
    expect(lerEmailPendente(localStorage, T0)).toBeNull()
    expect(() => guardarEmailPendente(null, 'a@b.com', T0)).not.toThrow()
    expect(lerEmailPendente(null, T0)).toBeNull()
    expect(() => esquecerEmailPendente(null)).not.toThrow()
  })
})
