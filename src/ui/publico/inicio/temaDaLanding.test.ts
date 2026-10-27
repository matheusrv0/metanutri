// CA-1613, CA-1614 e CA-1619 (spec landing-v3, D-608 e D-613): a escolha do tema da landing, guardada no navegador numa
// chave própria, e a marca no <html> que o primeiro desenho usa.
import type { Armazenamento } from '@/domain/persistencia.ts'
import { CHAVE_TEMA } from '@/ui/tema/contextoTema.ts'
import { CHAVE_TEMA_DA_LANDING, guardarTemaDaLanding, lerTemaDaLanding, marcarTemaNoHtml } from './temaDaLanding.ts'

function memoria(inicial: Record<string, string> = {}): Armazenamento & { readonly dados: () => Record<string, string> } {
  const dados = new Map(Object.entries(inicial))
  return {
    dados: () => Object.fromEntries(dados),
    getItem: (chave) => dados.get(chave) ?? null,
    setItem: (chave, valor) => {
      dados.set(chave, valor)
    },
    removeItem: (chave) => {
      dados.delete(chave)
    },
  }
}

const bloqueado: Armazenamento = {
  getItem: () => {
    throw new Error('bloqueado')
  },
  setItem: () => {
    throw new Error('bloqueado')
  },
  removeItem: () => {
    throw new Error('bloqueado')
  },
}

describe('temaDaLanding', () => {
  it('CA-1613: a chave é da landing, não a do tema do app', () => {
    expect(CHAVE_TEMA_DA_LANDING).toBe('metanutri:tema-da-landing')
    expect(CHAVE_TEMA_DA_LANDING).not.toBe(CHAVE_TEMA)
  })

  it('CA-1611 e CB-601: sem escolha, ou com um valor estranho, vale o escuro', () => {
    expect(lerTemaDaLanding(memoria())).toBe('escuro')
    expect(lerTemaDaLanding(memoria({ [CHAVE_TEMA_DA_LANDING]: 'azul' }))).toBe('escuro')
    expect(lerTemaDaLanding(memoria({ [CHAVE_TEMA_DA_LANDING]: '' }))).toBe('escuro')
    expect(lerTemaDaLanding(memoria({ [CHAVE_TEMA_DA_LANDING]: 'escuro' }))).toBe('escuro')
    // O tema claro do app não muda a landing (D-608).
    expect(lerTemaDaLanding(memoria({ [CHAVE_TEMA]: 'claro' }))).toBe('escuro')
  })

  it('CA-1613: guardado o claro, a landing abre clara', () => {
    const arm = memoria()
    guardarTemaDaLanding(arm, 'claro')
    expect(arm.dados()).toEqual({ [CHAVE_TEMA_DA_LANDING]: 'claro' })
    expect(lerTemaDaLanding(arm)).toBe('claro')
    guardarTemaDaLanding(arm, 'escuro')
    expect(lerTemaDaLanding(arm)).toBe('escuro')
  })

  it('CA-1614 e CB-600: sem armazenamento (nulo ou bloqueado), nada quebra e vale o escuro', () => {
    expect(lerTemaDaLanding(null)).toBe('escuro')
    expect(lerTemaDaLanding(bloqueado)).toBe('escuro')
    expect(() => guardarTemaDaLanding(null, 'claro')).not.toThrow()
    expect(() => guardarTemaDaLanding(bloqueado, 'claro')).not.toThrow()
  })

  it('CA-1619: a marca no <html> acompanha o tema: o claro marca, o escuro tira', () => {
    const html = document.createElement('html')
    marcarTemaNoHtml(html, 'claro')
    expect(html.getAttribute('data-tema-da-landing')).toBe('claro')
    marcarTemaNoHtml(html, 'escuro')
    expect(html.hasAttribute('data-tema-da-landing')).toBe(false)
    expect(() => marcarTemaNoHtml(undefined, 'claro')).not.toThrow()
  })
})
