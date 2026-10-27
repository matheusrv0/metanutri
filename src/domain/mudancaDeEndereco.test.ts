import { CHAVE_TEMA } from '@/ui/tema/contextoTema.ts'
import { CHAVE_DONO } from './donoDosDados.ts'
import { apagarEntregue, CHAVE_DO_TEMA, comoReceber, gravarPacote, lerMensagem, novoCodigo, pacoteDaConta } from './mudancaDeEndereco.ts'
import type { ArmazenamentoListavel } from './persistencia.ts'

/** Um navegador: as chaves listáveis, como o `localStorage`. Com `cabem`, uma chave nova além dessas estoura. */
class Navegador implements ArmazenamentoListavel {
  readonly dados = new Map<string, string>()
  constructor(private readonly cabem = Number.POSITIVE_INFINITY) {}
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
    if (!this.dados.has(k) && this.dados.size >= this.cabem) throw new DOMException('cheio', 'QuotaExceededError')
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

const CODIGO = '0123456789abcdef0123456789abcdef'
const PENDENTE = JSON.stringify({ versao: '2026-10-20T10:00:00Z', mudancas: 5, salvas: 3, itens: 2, motor: 2 })
const EM_DIA = JSON.stringify({ versao: '2026-10-27T10:00:00Z', mudancas: 3, salvas: 3, itens: 2, motor: 2 })

/** O endereço antigo: u1 com uma mudança que não subiu, u2 com o espaço dele, dado de antes das contas e o tema. */
function enderecoAntigo(dono: string | null = 'u1'): Navegador {
  const n = new Navegador()
  n.setItem('metanutri:conta:u1:nuvem', PENDENTE)
  n.setItem('metanutri:conta:u1:pacientes', '[{"id":"p1","nome":"Ana"}]')
  n.setItem('metanutri:conta:u2:nuvem', PENDENTE)
  n.setItem('metanutri:conta:u2:pacientes', '[{"id":"p9","nome":"Bia"}]')
  n.setItem('metanutri:casos', '["c1"]')
  n.setItem('metanutri:caso:c1', '{"caso":{"id":"c1"},"atualizadoEm":"2026-10-01T10:00:00Z"}')
  if (dono !== null) n.setItem(CHAVE_DONO, dono)
  n.setItem(CHAVE_DO_TEMA, 'escuro')
  n.setItem('sb-qmpl-auth-token', '{"access_token":"x"}')
  return n
}

describe('a mudança do endereço antigo (spec separacao-site-app, D-512, D-513 e DP-SA-38)', () => {
  it('a chave do tema é a do app', () => {
    expect(CHAVE_DO_TEMA).toBe(CHAVE_TEMA)
  })

  describe('o pacote de uma conta (CA-1432)', () => {
    it('CA-1432: só o espaço da conta pedida, o dado de antes das contas dela e o tema; nada de outra conta nem da sessão', () => {
      expect(pacoteDaConta(enderecoAntigo('u1'), 'u1')).toEqual({
        'metanutri:conta:u1:nuvem': PENDENTE,
        'metanutri:conta:u1:pacientes': '[{"id":"p1","nome":"Ana"}]',
        'metanutri:casos': '["c1"]',
        'metanutri:caso:c1': '{"caso":{"id":"c1"},"atualizadoEm":"2026-10-01T10:00:00Z"}',
        [CHAVE_DO_TEMA]: 'escuro',
      })
    })

    it('CA-1432: o dado de antes das contas sem dono vai com quem pedir; com outro dono, não vai', () => {
      expect(pacoteDaConta(enderecoAntigo(null), 'u2')).toHaveProperty(['metanutri:casos'])
      expect(pacoteDaConta(enderecoAntigo(''), 'u2')).toHaveProperty(['metanutri:casos'])
      const doOutro = pacoteDaConta(enderecoAntigo('u1'), 'u2')
      expect(doOutro).not.toHaveProperty(['metanutri:casos'])
      expect(Object.keys(doOutro ?? {}).sort()).toEqual([CHAVE_DO_TEMA, 'metanutri:conta:u2:nuvem', 'metanutri:conta:u2:pacientes'].sort())
    })

    it('CB-504: conta sem espaço e sem dado de antes das contas: não há pacote (só o tema não conta)', () => {
      expect(pacoteDaConta(enderecoAntigo('u1'), 'u3')).toBeNull()
      expect(pacoteDaConta(new Navegador(), 'u1')).toBeNull()
    })

    it('CB-520: duas contas e o dado de antes sem dono: vai com a primeira que levar, e a segunda leva só o dela', () => {
      const n = enderecoAntigo(null)
      const primeiro = pacoteDaConta(n, 'u2')
      expect(primeiro).toHaveProperty(['metanutri:casos'])
      apagarEntregue(n, 'u2', primeiro ?? {})
      const segundo = pacoteDaConta(n, 'u1')
      expect(segundo).not.toHaveProperty(['metanutri:casos'])
      expect(segundo).toHaveProperty(['metanutri:conta:u1:pacientes'])
    })
  })

  describe('apagar o que foi entregue (CA-1436, o lado do site)', () => {
    it('CA-1436: sai o espaço da conta e o dado de antes que foi junto; o dono sai quando não sobra nada; o resto fica', () => {
      const n = enderecoAntigo('u1')
      apagarEntregue(n, 'u1', pacoteDaConta(n, 'u1') ?? {})
      expect([...n.dados.keys()].sort()).toEqual(['metanutri:conta:u2:nuvem', 'metanutri:conta:u2:pacientes', CHAVE_DO_TEMA, 'sb-qmpl-auth-token'].sort())
    })

    it('CB-507: apagar de novo, com o espaço já apagado, não faz nada', () => {
      const n = enderecoAntigo('u1')
      const entregue = pacoteDaConta(n, 'u1') ?? {}
      apagarEntregue(n, 'u1', entregue)
      const depois = new Map(n.dados)
      apagarEntregue(n, 'u1', entregue)
      expect(n.dados).toEqual(depois)
    })

    it('R12 (DP-SA-60): o que mudou ou apareceu depois da entrega fica, e o dono também, com dado de antes que ficou', () => {
      const n = enderecoAntigo('u1')
      const entregue = pacoteDaConta(n, 'u1') ?? {}
      n.setItem('metanutri:conta:u1:pacientes', '[{"id":"p1","nome":"Ana"},{"id":"p2","nome":"Davi"}]')
      n.setItem('metanutri:conta:u1:modelos', '[{"id":"m1"}]')
      n.setItem('metanutri:casos', '["c1","c2"]')
      apagarEntregue(n, 'u1', entregue)
      expect(n.getItem('metanutri:conta:u1:nuvem')).toBeNull()
      expect(n.getItem('metanutri:caso:c1')).toBeNull()
      expect(n.getItem('metanutri:conta:u1:pacientes')).toBe('[{"id":"p1","nome":"Ana"},{"id":"p2","nome":"Davi"}]')
      expect(n.getItem('metanutri:conta:u1:modelos')).toBe('[{"id":"m1"}]')
      expect(n.getItem('metanutri:casos')).toBe('["c1","c2"]')
      expect(n.getItem(CHAVE_DONO)).toBe('u1')
      expect(n.getItem(CHAVE_DO_TEMA)).toBe('escuro')
    })

    it('o dado de antes das contas que não foi junto, nem o dono dele, não sai', () => {
      const n = enderecoAntigo('u1')
      apagarEntregue(n, 'u2', pacoteDaConta(n, 'u2') ?? {})
      expect(n.getItem('metanutri:casos')).toBe('["c1"]')
      expect(n.getItem(CHAVE_DONO)).toBe('u1')
      expect(n.getItem('metanutri:conta:u2:pacientes')).toBeNull()
    })
  })

  describe('as mensagens (DP-SA-12, CA-1438 e CB-502)', () => {
    const dados = { tipo: 'dados', codigo: CODIGO, usuarioId: 'u1', chaves: { 'metanutri:conta:u1:pacientes': '[]', 'metanutri:casos': '[]', [CHAVE_DO_TEMA]: 'claro' } }

    it('as quatro mensagens certas são lidas', () => {
      expect(lerMensagem({ tipo: 'pedir', codigo: CODIGO, usuarioId: 'u1' })).toEqual({ tipo: 'pedir', codigo: CODIGO, usuarioId: 'u1' })
      expect(lerMensagem({ tipo: 'nada', codigo: CODIGO, usuarioId: 'u1' })).toEqual({ tipo: 'nada', codigo: CODIGO, usuarioId: 'u1' })
      expect(lerMensagem({ tipo: 'recebido', codigo: CODIGO, usuarioId: 'u1' })).toEqual({ tipo: 'recebido', codigo: CODIGO, usuarioId: 'u1' })
      expect(lerMensagem(dados)).toEqual(dados)
    })

    it('CA-1438: tipo desconhecido, código fora do formato ou conta vazia: ignorada', () => {
      for (const mensagem of [
        null,
        'texto',
        42,
        { tipo: 'apagar', codigo: CODIGO, usuarioId: 'u1' },
        { tipo: 'pedir', codigo: 'curto', usuarioId: 'u1' },
        { tipo: 'pedir', codigo: CODIGO.toUpperCase(), usuarioId: 'u1' },
        { tipo: 'pedir', codigo: CODIGO, usuarioId: '' },
        { tipo: 'pedir', codigo: CODIGO, usuarioId: 7 },
        { tipo: 'pedir', codigo: CODIGO },
      ]) {
        expect(lerMensagem(mensagem)).toBeNull()
      }
    })

    it('CB-502: dados ilegíveis (sem chaves, valor que não é texto, chave de outra conta ou de fora do MetaNutri): ignorada', () => {
      for (const chaves of [
        undefined,
        null,
        '{"metanutri:casos":"[]"}',
        ['metanutri:casos'],
        { 'metanutri:conta:u1:pacientes': 7 },
        { 'metanutri:conta:u2:pacientes': '[]' },
        { 'metanutri:conta:u1': '[]' },
        { 'metanutri:sessao': '{}' },
        { 'sb-qmpl-auth-token': '{}' },
        { 'metanutri:dono': 'u1' },
      ]) {
        expect(lerMensagem({ ...dados, chaves })).toBeNull()
      }
    })

    it('DP-SA-12: o código tem 128 bits, em hexadecimal, e muda a cada vez', () => {
      const um = novoCodigo()
      expect(um).toMatch(/^[0-9a-f]{32}$/)
      expect(novoCodigo()).not.toBe(um)
    })
  })

  describe('como o app recebe (D-513)', () => {
    const pacote = {
      'metanutri:conta:u1:nuvem': PENDENTE,
      'metanutri:conta:u1:pacientes': '[{"id":"p1","nome":"Ana"}]',
      'metanutri:casos': '["c1"]',
      [CHAVE_DO_TEMA]: 'escuro',
    }

    it('CA-1433 (a regra): espaço vazio no app grava como veio; o dado de antes das contas fica com ela como dona', () => {
      const app = new Navegador()
      expect(comoReceber(app, 'u1')).toBe('gravar')
      expect(gravarPacote(app, 'u1', pacote, 'gravar')).toBe('gravado')
      expect(Object.fromEntries(app.dados)).toEqual({ ...pacote, [CHAVE_DONO]: 'u1' })
    })

    it('CA-1434 (a regra): espaço em dia no app (já usou o app, tudo na nuvem) troca pelo que veio', () => {
      const app = new Navegador()
      app.setItem('metanutri:conta:u1:nuvem', EM_DIA)
      app.setItem('metanutri:conta:u1:modelos', '[{"id":"m1"}]')
      expect(comoReceber(app, 'u1')).toBe('trocar')
      expect(gravarPacote(app, 'u1', pacote, 'trocar')).toBe('gravado')
      expect(app.getItem('metanutri:conta:u1:modelos')).toBeNull()
      expect(app.getItem('metanutri:conta:u1:nuvem')).toBe(PENDENTE)
      expect(app.getItem('metanutri:conta:u1:pacientes')).toBe('[{"id":"p1","nome":"Ana"}]')
    })

    /** Um navegador que anota, a cada gravação ou remoção, se a situação da nuvem da conta ficou vazia. */
    class NavegadorVigiado extends Navegador {
      readonly situacaoVazia: string[] = []
      constructor(private readonly chave: string) {
        super()
      }
      private anotar(acao: string) {
        if (this.getItem(this.chave) === null) this.situacaoVazia.push(acao)
      }
      override setItem(k: string, v: string) {
        super.setItem(k, v)
        this.anotar(`setItem ${k}`)
      }
      override removeItem(k: string) {
        super.removeItem(k)
        this.anotar(`removeItem ${k}`)
      }
    }

    function appEmDia(): NavegadorVigiado {
      const app = new NavegadorVigiado('metanutri:conta:u1:nuvem')
      app.dados.set('metanutri:conta:u1:nuvem', EM_DIA)
      app.dados.set('metanutri:conta:u1:modelos', '[{"id":"m1"}]')
      app.dados.set('metanutri:conta:u1:pacientes', '[{"id":"p0","nome":"Caio"}]')
      return app
    }

    it('R9 (DP-SA-57): ao trocar, a situação da nuvem nunca fica vazia, e o que vem é regravado no lugar, sem sair antes', () => {
      const app = appEmDia()
      expect(comoReceber(app, 'u1')).toBe('trocar')
      expect(gravarPacote(app, 'u1', pacote, 'trocar')).toBe('gravado')
      expect(app.situacaoVazia).toEqual([])
      expect(app.getItem('metanutri:conta:u1:nuvem')).toBe(PENDENTE)
      expect(app.getItem('metanutri:conta:u1:pacientes')).toBe('[{"id":"p1","nome":"Ana"}]')
      expect(app.getItem('metanutri:conta:u1:modelos')).toBeNull()
    })

    it('R9 (DP-SA-57): pacote sem a situação da nuvem: a do app fica, com uma mudança a mais, e a conta deixa de estar em dia', () => {
      const app = appEmDia()
      const semSituacao = { 'metanutri:conta:u1:pacientes': '[{"id":"p1","nome":"Ana"}]' }
      expect(gravarPacote(app, 'u1', semSituacao, 'trocar')).toBe('gravado')
      expect(app.situacaoVazia).toEqual([])
      expect(JSON.parse(app.getItem('metanutri:conta:u1:nuvem') ?? 'null')).toEqual({ ...(JSON.parse(EM_DIA) as object), mudancas: 4 })
      expect(comoReceber(app, 'u1')).toBe('depois')
      expect(app.getItem('metanutri:conta:u1:pacientes')).toBe('[{"id":"p1","nome":"Ana"}]')
    })

    it('R9: não coube ao trocar sem a situação no pacote, a situação de antes volta como estava', () => {
      const app = new Navegador(3)
      app.setItem('metanutri:conta:u1:nuvem', EM_DIA)
      app.setItem('metanutri:conta:u1:modelos', '[{"id":"m1"}]')
      const semSituacao = { 'metanutri:conta:u1:pacientes': '[]', 'metanutri:casos': '["c1"]', 'metanutri:caso:c1': '{}' }
      expect(gravarPacote(app, 'u1', semSituacao, 'trocar')).toBe('sem-espaco')
      expect(Object.fromEntries(app.dados)).toEqual({ 'metanutri:conta:u1:nuvem': EM_DIA, 'metanutri:conta:u1:modelos': '[{"id":"m1"}]' })
    })

    it('CA-1435 (a regra): espaço com algo que ainda não subiu: fica para depois', () => {
      const app = new Navegador()
      app.setItem('metanutri:conta:u1:nuvem', PENDENTE)
      app.setItem('metanutri:conta:u1:pacientes', '[]')
      expect(comoReceber(app, 'u1')).toBe('depois')
    })

    it('CA-1435 (a regra): valor retido no app também é algo que só existe ali: fica para depois', () => {
      const app = new Navegador()
      app.setItem('metanutri:conta:u1:nuvem', EM_DIA)
      app.setItem('metanutri:conta:u1:retidos', '{"pacientes/p1":"2026-10-27T10:00:00Z"}')
      expect(comoReceber(app, 'u1')).toBe('depois')
    })

    it('DP-SA-38: app que já tem dado de antes das contas não recebe agora', () => {
      const app = new Navegador()
      app.setItem('metanutri:pacientes', '[]')
      expect(comoReceber(app, 'u1')).toBe('depois')
    })

    it('DP-SA-38: o tema que o app já tem fica', () => {
      const app = new Navegador()
      app.setItem(CHAVE_DO_TEMA, 'claro')
      gravarPacote(app, 'u1', pacote, 'gravar')
      expect(app.getItem(CHAVE_DO_TEMA)).toBe('claro')
    })

    it('CB-501: não coube, nada do que chegou fica gravado', () => {
      const app = new Navegador(2)
      expect(gravarPacote(app, 'u1', pacote, 'gravar')).toBe('sem-espaco')
      expect(app.dados.size).toBe(0)
    })

    it('CB-501: não coube ao trocar, o espaço em dia de antes volta como estava', () => {
      const app = new Navegador(3)
      app.setItem('metanutri:conta:u1:nuvem', EM_DIA)
      app.setItem('metanutri:conta:u1:modelos', '[{"id":"m1"}]')
      expect(gravarPacote(app, 'u1', pacote, 'trocar')).toBe('sem-espaco')
      expect(Object.fromEntries(app.dados)).toEqual({ 'metanutri:conta:u1:nuvem': EM_DIA, 'metanutri:conta:u1:modelos': '[{"id":"m1"}]' })
    })
  })
})
