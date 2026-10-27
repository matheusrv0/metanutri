import type { ArmazenamentoListavel } from '@/domain/persistencia.ts'
import { ehLinkDoPaciente, enderecoNoApp, limparEnderecoAntigo } from './limpeza.ts'

/** Um navegador: as chaves listáveis, como o `localStorage`. */
class Navegador implements ArmazenamentoListavel {
  readonly dados = new Map<string, string>()
  get length() {
    return this.dados.size
  }
  key(i: number) {
    return [...this.dados.keys()][i] ?? null
  }
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

const EM_DIA = JSON.stringify({ versao: '2026-10-27T10:00:00Z', mudancas: 3, salvas: 3, itens: 1, motor: 2 })
const APP = 'https://app.metanutri.com.br/'

/** A conta u1 em dia: a situação da nuvem e um paciente que já subiu. */
function contaEmDia(n: Navegador, conta = 'u1') {
  n.setItem(`metanutri:conta:${conta}:nuvem`, EM_DIA)
  n.setItem(`metanutri:conta:${conta}:pacientes`, '[{"id":"p1"}]')
}

describe('a limpeza do endereço antigo (spec separacao-site-app, D-511)', () => {
  it('CA-1401: toda sessão guardada sai, com as chaves dela; o site não usa nenhuma', () => {
    const n = new Navegador()
    for (const chave of ['sb-qmpl-auth-token', 'sb-qmpl-auth-token-code-verifier', 'sb-qmpl-auth-token-user', 'sb-outro-auth-token']) n.setItem(chave, '{}')
    n.setItem(`metanutri:tema`, 'escuro')
    expect(limparEnderecoAntigo(n)).toBe(false)
    expect([...n.dados.keys()]).toEqual(['metanutri:tema'])
  })

  it('CA-1427: o espaço de cada conta em dia sai, e não sobra dado só aqui', () => {
    const n = new Navegador()
    contaEmDia(n, 'u1')
    contaEmDia(n, 'u2')
    n.setItem('metanutri:sessao', '{"conta":"u1"}')
    expect(limparEnderecoAntigo(n)).toBe(false)
    expect([...n.dados.keys()]).toEqual(['metanutri:sessao'])
  })

  describe('CA-1428: o que não está em dia fica inteiro, e sobra dado só aqui (um teste por motivo)', () => {
    const fica = (preparar: (n: Navegador) => void) => {
      const n = new Navegador()
      contaEmDia(n, 'u1')
      preparar(n)
      const antes = new Map([...n.dados].filter(([chave]) => chave.startsWith('metanutri:conta:u1:')))
      expect(limparEnderecoAntigo(n)).toBe(true)
      for (const [chave, valor] of antes) expect(n.getItem(chave), chave).toBe(valor)
    }

    it('mudança que não foi enviada', () => {
      fica((n) => n.setItem('metanutri:conta:u1:nuvem', JSON.stringify({ ...JSON.parse(EM_DIA), mudancas: 4 })))
    })
    it('cópia parcial', () => {
      fica((n) => n.setItem('metanutri:conta:u1:nuvem', JSON.stringify({ ...JSON.parse(EM_DIA), parcial: true })))
    })
    it('valor retido', () => {
      fica((n) => n.setItem('metanutri:conta:u1:retidos', '{"pacientes/p1":"2026-10-27T10:00:00Z"}'))
    })
    it('link de paciente pendente', () => {
      fica((n) => n.setItem('metanutri:conta:u1:acompanhamentos', JSON.stringify({ formato: 1, itens: [{ id: 'a1' }], naNuvem: [], pendentes: ['a1'] })))
    })
    it('dado de antes das contas, dela', () => {
      fica((n) => {
        n.setItem('metanutri:dono', 'u1')
        n.setItem('metanutri:pacientes', '[{"id":"p9"}]')
      })
    })
    it('dado de antes das contas, sem dono', () => {
      fica((n) => n.setItem('metanutri:pacientes', '[{"id":"p9"}]'))
    })
    it('sem a situação da nuvem', () => {
      fica((n) => n.removeItem('metanutri:conta:u1:nuvem'))
    })
  })

  it('DP-SA-54: marcas da sessão, tema e pendentes do aparelho não são dado da pessoa', () => {
    const n = new Navegador()
    for (const chave of ['metanutri:sessao', 'metanutri:sessao:saida', 'metanutri:tema', 'metanutri:destino-pendente', 'metanutri:email-pendente']) n.setItem(chave, 'x')
    expect(limparEnderecoAntigo(n)).toBe(false)
  })

  it('CB-503: navegador vazio, nada a fazer e nada só aqui', () => {
    expect(limparEnderecoAntigo(new Navegador())).toBe(false)
  })

  it('CB-500: armazenamento bloqueado: não lê nem apaga nada, e "Continuar" nunca aparece', () => {
    const bloqueado: ArmazenamentoListavel = {
      get length(): number {
        throw new Error('bloqueado')
      },
      key: () => {
        throw new Error('bloqueado')
      },
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
    expect(limparEnderecoAntigo(bloqueado)).toBe(false)
    expect(limparEnderecoAntigo(null)).toBe(false)
  })
})

describe('para onde o site leva (spec separacao-site-app, D-510 e D-527)', () => {
  const sem = { hash: '', search: '' }

  it('CA-1424: tela do app vai com o mesmo #', () => {
    expect(enderecoNoApp({ hash: '#/painel', search: '' }, false)).toBe(`${APP}#/painel`)
    expect(enderecoNoApp({ hash: '#/caso/c1/plano', search: '' }, false)).toBe(`${APP}#/caso/c1/plano`)
  })

  it('CA-1425 e CB-513: a volta do e-mail ou do pagamento vai com a mesma consulta e o mesmo #', () => {
    expect(enderecoNoApp({ hash: '', search: '?volta=pagamento' }, false)).toBe(`${APP}?volta=pagamento`)
    expect(enderecoNoApp({ hash: '#/painel', search: '?volta=confirmacao&code=abc' }, false)).toBe(`${APP}?volta=confirmacao&code=abc#/painel`)
    expect(enderecoNoApp({ hash: '#error=access_denied', search: '?volta=recuperacao' }, false)).toBe(`${APP}?volta=recuperacao#error=access_denied`)
  })

  it('CA-1426 e D-524: o ícone instalado vai ao app com a marca na consulta', () => {
    expect(enderecoNoApp(sem, true)).toBe(`${APP}?icone-antigo`)
    expect(enderecoNoApp({ hash: '#/pacientes', search: '?volta=pagamento' }, true)).toBe(`${APP}?volta=pagamento&icone-antigo#/pacientes`)
  })

  it('CA-1423 e CB-512: o link do paciente vai direto ao app, sempre (mesmo com dado só aqui, que fica para depois)', () => {
    expect(ehLinkDoPaciente('#/missoes/abc123')).toBe(true)
    expect(enderecoNoApp({ hash: '#/missoes/abc123', search: '' }, false)).toBe(`${APP}#/missoes/abc123`)
    for (const hash of ['#/missoes', '#/missoes/', '#/painel', '', '#missoes/abc']) expect(ehLinkDoPaciente(hash), hash).toBe(false)
  })

  it('D-501: a página do site fica no site', () => {
    expect(enderecoNoApp(sem, false)).toBeNull()
    expect(enderecoNoApp({ hash: '#como-funciona', search: '?destaque=pro' }, false)).toBeNull()
  })
})
