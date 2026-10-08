import { CHAVE_AVISO_VISTO } from '@/ui/casos/AvisoPrimeiroAcesso.tsx'
import { armazenamentoDaConta } from './armazenamentoDaConta.ts'
import { CHAVE_DONO, OUTRAS_CHAVES_DA_PESSOA, apagarDadosDaConta, migrarDadosSemConta } from './donoDosDados.ts'
import type { ArmazenamentoListavel } from './persistencia.ts'

function memoria(inicial: Record<string, string> = {}): ArmazenamentoListavel & { readonly dados: Map<string, string> } {
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

/** Um aparelho com os dados de antes desta mudança, sem prefixo, e o que é do aparelho. */
const DADOS_ANTIGOS = {
  'metanutri:casos': '["x"]',
  'metanutri:caso:x': '{"nome":"Plano da Ana"}',
  'metanutri:pacientes': '[{"id":"ana"}]',
  'metanutri:perfil': '{"nome":"Maria"}',
  'metanutri:aviso-inicial-visto': '1',
} as const

const DO_APARELHO = {
  'metanutri:tema': 'escuro',
  'metanutri:email-pendente': '{"email":"x@y.z"}',
  'metanutri:destino-pendente': '#/painel',
  'sb-projeto-auth-token': '{"sessao":true}',
} as const

const semPrefixo = (arm: ReturnType<typeof memoria>) => [...arm.dados.keys()].filter((c) => !c.startsWith('metanutri:conta:'))

describe('dados de antes da mudança vão para a conta dona (spec dados-por-conta, D-123)', () => {
  it('CA-467: a conta dona entra e vê tudo como antes; o que é do aparelho fica onde está', () => {
    const arm = memoria({ [CHAVE_DONO]: 'conta-a', ...DADOS_ANTIGOS, ...DO_APARELHO })
    expect(migrarDadosSemConta(arm, 'conta-a')).toBe('movido')

    const contaA = armazenamentoDaConta(arm, 'conta-a')
    for (const [chave, valor] of Object.entries(DADOS_ANTIGOS)) expect(contaA.getItem(chave), chave).toBe(valor)
    expect(semPrefixo(arm).sort()).toEqual([CHAVE_DONO, ...Object.keys(DO_APARELHO)].sort())
    for (const [chave, valor] of Object.entries(DO_APARELHO)) expect(arm.dados.get(chave), chave).toBe(valor)
  })

  it('migração: com dono, outra conta que entra não recebe nada; os dados vão para o dono', () => {
    const arm = memoria({ [CHAVE_DONO]: 'conta-a', ...DADOS_ANTIGOS })
    expect(migrarDadosSemConta(arm, 'conta-b')).toBe('movido')
    expect(armazenamentoDaConta(arm, 'conta-b').length).toBe(0)
    expect(armazenamentoDaConta(arm, 'conta-a').getItem('metanutri:pacientes')).toBe('[{"id":"ana"}]')
    expect(arm.dados.get('metanutri:pacientes')).toBeUndefined()
  })

  it('CA-468: dados sem dono passam a ser da conta que entra', () => {
    const arm = memoria({ ...DADOS_ANTIGOS })
    expect(migrarDadosSemConta(arm, 'conta-b')).toBe('movido')
    const contaB = armazenamentoDaConta(arm, 'conta-b')
    expect(contaB.getItem('metanutri:caso:x')).toBe('{"nome":"Plano da Ana"}')
    expect(contaB.getItem('metanutri:pacientes')).toBe('[{"id":"ana"}]')
    // DP-6: o dono fica, para o que aparecer sem prefixo depois ir para ele.
    expect(arm.dados.get(CHAVE_DONO)).toBe('conta-b')
  })

  it('migração: o dono fica marcado antes da primeira cópia', () => {
    const arm = memoria({ ...DADOS_ANTIGOS })
    const gravadas: string[] = []
    const setItem = arm.setItem
    arm.setItem = (c, v) => {
      gravadas.push(c)
      setItem(c, v)
    }
    migrarDadosSemConta(arm, 'conta-b')
    expect(gravadas[0]).toBe(CHAVE_DONO)
  })

  it('migração: dado sem prefixo e dado da conta juntos, com valores diferentes, nada se move (DP-5)', () => {
    const arm = memoria({
      [CHAVE_DONO]: 'conta-a',
      ...DADOS_ANTIGOS,
      'metanutri:conta:conta-a:pacientes': '[{"id":"nova"}]',
    })
    const antes = new Map(arm.dados)
    expect(migrarDadosSemConta(arm, 'conta-a')).toBe('conflito')
    expect(arm.dados).toEqual(antes)
  })

  it('migração: cópia interrompida no meio termina na próxima entrada', () => {
    // Fechou o navegador depois de copiar os casos e antes de apagar o original.
    const arm = memoria({
      [CHAVE_DONO]: 'conta-a',
      ...DADOS_ANTIGOS,
      'metanutri:conta:conta-a:caso:x': '{"nome":"Plano da Ana"}',
      'metanutri:conta:conta-a:casos': '["x"]',
    })
    expect(migrarDadosSemConta(arm, 'conta-a')).toBe('movido')
    const contaA = armazenamentoDaConta(arm, 'conta-a')
    for (const [chave, valor] of Object.entries(DADOS_ANTIGOS)) expect(contaA.getItem(chave), chave).toBe(valor)
    expect(semPrefixo(arm)).toEqual([CHAVE_DONO])
  })

  it('migração: rodar duas vezes não muda nada na segunda', () => {
    const arm = memoria({ [CHAVE_DONO]: 'conta-a', ...DADOS_ANTIGOS, ...DO_APARELHO })
    migrarDadosSemConta(arm, 'conta-a')
    const depois = new Map(arm.dados)
    expect(migrarDadosSemConta(arm, 'conta-a')).toBe('nada')
    expect(migrarDadosSemConta(arm, 'conta-b')).toBe('nada')
    expect(arm.dados).toEqual(depois)
  })

  it('migração: aparelho cheio no meio não perde nada e tenta de novo depois', () => {
    const arm = memoria({ [CHAVE_DONO]: 'conta-a', ...DADOS_ANTIGOS })
    const setItem = arm.setItem
    let cheio = true
    let gravadas = 0
    arm.setItem = (c, v) => {
      // Cabe uma chave; a segunda estoura, como o QuotaExceededError do navegador.
      if (cheio && c.startsWith('metanutri:conta:') && (gravadas += 1) > 1) throw new DOMException('cheio', 'QuotaExceededError')
      setItem(c, v)
    }
    expect(migrarDadosSemConta(arm, 'conta-a')).toBe('falhou')
    const contaA = armazenamentoDaConta(arm, 'conta-a')
    for (const [chave, valor] of Object.entries(DADOS_ANTIGOS)) expect(contaA.getItem(chave) ?? arm.dados.get(chave), chave).toBe(valor)

    cheio = false
    expect(migrarDadosSemConta(arm, 'conta-a')).toBe('movido')
    for (const [chave, valor] of Object.entries(DADOS_ANTIGOS)) expect(contaA.getItem(chave), chave).toBe(valor)
  })

  it('migração: planos fora do índice e a chave antiga dos frequentes também são da pessoa', () => {
    const arm = memoria({ ...DADOS_ANTIGOS, 'metanutri:caso:solto': '{}', 'metanutri:frequentes': '{}' })
    migrarDadosSemConta(arm, 'conta-a')
    const contaA = armazenamentoDaConta(arm, 'conta-a')
    expect(contaA.getItem('metanutri:caso:solto')).toBe('{}')
    expect(contaA.getItem('metanutri:frequentes')).toBe('{}')
    expect(semPrefixo(arm)).toEqual([CHAVE_DONO])
  })

  it('o aviso de primeiro acesso é dado da pessoa (CB-122)', () => {
    expect(OUTRAS_CHAVES_DA_PESSOA).toContain(CHAVE_AVISO_VISTO)
  })

  it('CB-121: sem armazenamento, ou com um que estoura em tudo, nada quebra', () => {
    expect(migrarDadosSemConta(null, 'conta-a')).toBe('nada')
    apagarDadosDaConta(null, 'conta-a')
    const quebrado: ArmazenamentoListavel = {
      get length(): number {
        throw new DOMException('bloqueado', 'SecurityError')
      },
      key: () => {
        throw new DOMException('bloqueado', 'SecurityError')
      },
      getItem: () => {
        throw new DOMException('bloqueado', 'SecurityError')
      },
      setItem: () => {
        throw new DOMException('bloqueado', 'SecurityError')
      },
      removeItem: () => {
        throw new DOMException('bloqueado', 'SecurityError')
      },
    }
    expect(migrarDadosSemConta(quebrado, 'conta-a')).toBe('falhou')
    expect(() => apagarDadosDaConta(quebrado, 'conta-a')).not.toThrow()
  })
})

describe('sair e apagar só leva a conta que sai (spec dados-por-conta, D-124)', () => {
  const doisDonos = () =>
    memoria({
      ...DO_APARELHO,
      'metanutri:conta:conta-a:pacientes': '[{"id":"ana"}]',
      'metanutri:conta:conta-a:aviso-inicial-visto': '1',
      'metanutri:conta:conta-b:pacientes': '[{"id":"bia"}]',
      'metanutri:conta:conta-b:casos': '["y"]',
    })

  it('CA-469: somem só os dados de A; os de B e os do aparelho continuam', () => {
    const arm = doisDonos()
    apagarDadosDaConta(arm, 'conta-a')
    expect(armazenamentoDaConta(arm, 'conta-a').length).toBe(0)
    expect(armazenamentoDaConta(arm, 'conta-b').getItem('metanutri:pacientes')).toBe('[{"id":"bia"}]')
    expect(armazenamentoDaConta(arm, 'conta-b').getItem('metanutri:casos')).toBe('["y"]')
    for (const [chave, valor] of Object.entries(DO_APARELHO)) expect(arm.dados.get(chave), chave).toBe(valor)
  })

  it('CA-469: o dono que sai leva junto o que ficou sem prefixo, e deixa de ser dono', () => {
    const arm = doisDonos()
    arm.setItem(CHAVE_DONO, 'conta-a')
    arm.setItem('metanutri:pacientes', '[{"id":"velha"}]')
    apagarDadosDaConta(arm, 'conta-a')
    expect(arm.dados.has('metanutri:pacientes')).toBe(false)
    expect(arm.dados.has(CHAVE_DONO)).toBe(false)
    expect(arm.dados.get('metanutri:tema')).toBe('escuro')
  })

  it('CA-469: o que ficou sem prefixo de outro dono continua', () => {
    const arm = doisDonos()
    arm.setItem(CHAVE_DONO, 'conta-b')
    arm.setItem('metanutri:pacientes', '[{"id":"velha"}]')
    apagarDadosDaConta(arm, 'conta-a')
    expect(arm.dados.get('metanutri:pacientes')).toBe('[{"id":"velha"}]')
    expect(arm.dados.get(CHAVE_DONO)).toBe('conta-b')
  })
})
