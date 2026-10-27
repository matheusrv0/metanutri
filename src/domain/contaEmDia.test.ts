import { contaEmDia, contasComEspaco } from './contaEmDia.ts'
import { CHAVE_DONO } from './donoDosDados.ts'
import type { ArmazenamentoListavel } from './persistencia.ts'

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

const SITUACAO_EM_DIA = JSON.stringify({ versao: '2026-10-27T10:00:00Z', mudancas: 3, salvas: 3, itens: 2, motor: 2 })

/** A conta u1 com a cópia de trabalho em dia: a situação da nuvem e dois itens que já subiram. */
function contaEmDiaNoNavegador(): Navegador {
  const n = new Navegador()
  n.setItem('metanutri:conta:u1:nuvem', SITUACAO_EM_DIA)
  n.setItem('metanutri:conta:u1:pacientes', '[{"id":"p1","nome":"Ana"}]')
  n.setItem('metanutri:conta:u1:acompanhamentos', JSON.stringify({ formato: 1, itens: [{ id: 'a1' }], naNuvem: ['a1'], pendentes: [] }))
  n.setItem('metanutri:tema', 'escuro')
  return n
}

const COM_RETIDOS = { contarRetidos: true } as const
const SEM_RETIDOS = { contarRetidos: false } as const

describe('a conta está em dia neste navegador (spec separacao-site-app, D-511 e DP-SA-7)', () => {
  it('CA-1427 (a regra): situação da nuvem, nada além do que foi salvo, nada retido nem pendente: em dia', () => {
    const n = contaEmDiaNoNavegador()
    expect(contaEmDia(n, 'u1', COM_RETIDOS)).toBe(true)
    expect(contaEmDia(n, 'u1', SEM_RETIDOS)).toBe(true)
  })

  it('a marca de saída de uma sessão anterior (DP-11) não muda nada: conta só o que foi ou não para a nuvem', () => {
    const n = contaEmDiaNoNavegador()
    n.setItem('metanutri:conta:u1:nuvem', JSON.stringify({ ...JSON.parse(SITUACAO_EM_DIA), saiu: true }))
    expect(contaEmDia(n, 'u1', COM_RETIDOS)).toBe(true)
  })

  describe('CA-1428 (a regra): um motivo de cada vez tira a conta do dia', () => {
    it('mudança que não foi enviada (mais mudanças que salvas)', () => {
      const n = contaEmDiaNoNavegador()
      n.setItem('metanutri:conta:u1:nuvem', JSON.stringify({ ...JSON.parse(SITUACAO_EM_DIA), mudancas: 4 }))
      expect(contaEmDia(n, 'u1', COM_RETIDOS)).toBe(false)
      expect(contaEmDia(n, 'u1', SEM_RETIDOS)).toBe(false)
    })

    it('cópia parcial (não coube no navegador, DP-29)', () => {
      const n = contaEmDiaNoNavegador()
      n.setItem('metanutri:conta:u1:nuvem', JSON.stringify({ ...JSON.parse(SITUACAO_EM_DIA), parcial: true }))
      expect(contaEmDia(n, 'u1', SEM_RETIDOS)).toBe(false)
    })

    it('valor retido (DP-39): conta para o site e para o app que recebe; não conta para a saída (D-517, como o "Sair")', () => {
      const n = contaEmDiaNoNavegador()
      n.setItem('metanutri:conta:u1:retidos', JSON.stringify({ 'chave/metanutri:perfil': '2026-10-27T09:00:00.000Z' }))
      expect(contaEmDia(n, 'u1', COM_RETIDOS)).toBe(false)
      expect(contaEmDia(n, 'u1', SEM_RETIDOS)).toBe(true)
    })

    it('link de paciente com mudança que não chegou à nuvem (CB-108)', () => {
      const n = contaEmDiaNoNavegador()
      n.setItem('metanutri:conta:u1:acompanhamentos', JSON.stringify({ formato: 1, itens: [{ id: 'a1' }], naNuvem: ['a1'], pendentes: ['a1'] }))
      expect(contaEmDia(n, 'u1', SEM_RETIDOS)).toBe(false)
    })

    it('dado de antes das contas cujo dono é ela', () => {
      const n = contaEmDiaNoNavegador()
      n.setItem('metanutri:pacientes', '[{"id":"antigo"}]')
      n.setItem(CHAVE_DONO, 'u1')
      expect(contaEmDia(n, 'u1', SEM_RETIDOS)).toBe(false)
    })

    it('dado de antes das contas sem dono', () => {
      const n = contaEmDiaNoNavegador()
      n.setItem('metanutri:casos', '["c9"]')
      expect(contaEmDia(n, 'u1', SEM_RETIDOS)).toBe(false)
    })

    it('dado na conta sem a situação da nuvem (nunca chegou a abrir)', () => {
      const n = contaEmDiaNoNavegador()
      n.removeItem('metanutri:conta:u1:nuvem')
      expect(contaEmDia(n, 'u1', SEM_RETIDOS)).toBe(false)
    })
  })

  it('o dado de antes das contas que é de outra conta não tira esta do dia', () => {
    const n = contaEmDiaNoNavegador()
    n.setItem('metanutri:pacientes', '[{"id":"antigo"}]')
    n.setItem(CHAVE_DONO, 'u2')
    expect(contaEmDia(n, 'u1', COM_RETIDOS)).toBe(true)
  })

  it('o espaço de outra conta não conta para esta', () => {
    const n = contaEmDiaNoNavegador()
    n.setItem('metanutri:conta:u2:nuvem', JSON.stringify({ versao: null, mudancas: 5, salvas: 0, itens: 0 }))
    expect(contaEmDia(n, 'u1', COM_RETIDOS)).toBe(true)
    expect(contaEmDia(n, 'u2', COM_RETIDOS)).toBe(false)
  })

  it('DP-SA-23: espaço sem dado da nuvem e sem dado de antes dela está em dia: não há o que perder', () => {
    const n = new Navegador()
    n.setItem('metanutri:tema', 'claro')
    expect(contaEmDia(n, 'u1', COM_RETIDOS)).toBe(true)
  })

  it('situação ilegível com dado na conta: não está em dia', () => {
    const n = contaEmDiaNoNavegador()
    n.setItem('metanutri:conta:u1:nuvem', '{quebrado')
    expect(contaEmDia(n, 'u1', COM_RETIDOS)).toBe(false)
  })

  it('CB-500: o navegador não deixa ler: não dá para afirmar que está em dia', () => {
    const n = contaEmDiaNoNavegador()
    n.getItem = () => {
      throw new DOMException('bloqueado', 'SecurityError')
    }
    expect(contaEmDia(n, 'u1', COM_RETIDOS)).toBe(false)
  })
})

describe('as contas com espaço neste navegador', () => {
  it('lista cada conta uma vez, com o id decodificado, e ignora o resto', () => {
    const n = contaEmDiaNoNavegador()
    n.setItem('metanutri:conta:u2:casos', '[]')
    n.setItem('metanutri:conta:u2:nuvem', SITUACAO_EM_DIA)
    n.setItem(`metanutri:conta:${encodeURIComponent('id:com:dois-pontos')}:casos`, '[]')
    n.setItem('metanutri:pacientes', '[]')
    n.setItem('sb-qmpljfjbdcrdbqutuvmg-auth-token', '{}')
    expect(contasComEspaco(n).sort()).toEqual(['id:com:dois-pontos', 'u1', 'u2'])
  })

  it('navegador vazio ou que não deixa ler: nenhuma', () => {
    expect(contasComEspaco(new Navegador())).toEqual([])
    const bloqueado = new Navegador()
    bloqueado.setItem('metanutri:conta:u1:casos', '[]')
    bloqueado.key = () => {
      throw new DOMException('bloqueado', 'SecurityError')
    }
    expect(contasComEspaco(bloqueado)).toEqual([])
  })
})
