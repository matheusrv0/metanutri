import { COPIA_GRANDE_DEMAIS, FALHA_DE_REDE } from '@/ui/estado/mensagemDoBanco.ts'
import { apagarCopiaDaNuvem, apelidoDoAparelho, baixarCopia, enviarCopia, SEM_CONTA, type ClienteCopia } from './copiaNaNuvem.ts'
import type { Backup } from './perfil.ts'

const BACKUP: Backup = { formato: 1, geradoEm: '2026-09-27T00:00:00.000Z', dados: { 'metanutri:casos': '["id1"]' } }

interface Chamada {
  readonly tipo: 'upsert' | 'select' | 'delete'
  readonly parametros: Record<string, unknown>
}

function clienteFalso(
  opcoes: {
    readonly usuario?: string | null
    readonly linha?: unknown
    readonly erro?: string | { readonly message: string; readonly code: string }
    /** O status HTTP da gravação (R-41: o servidor pode recusar antes do banco). */
    readonly status?: number
  } = {},
) {
  const chamadas: Chamada[] = []
  const erro = typeof opcoes.erro === 'string' ? { message: opcoes.erro } : (opcoes.erro ?? null)

  const cliente: ClienteCopia = {
    from: () => ({
      upsert: (linha) => {
        chamadas.push({ tipo: 'upsert', parametros: linha })
        return Promise.resolve({ data: null, error: erro, ...(opcoes.status === undefined ? {} : { status: opcoes.status }) })
      },
      delete: () => ({
        eq: (coluna, valor) => {
          chamadas.push({ tipo: 'delete', parametros: { [coluna]: valor } })
          return Promise.resolve({ data: null, error: erro })
        },
      }),
      select: () => ({
        eq: (coluna, valor) => ({
          maybeSingle: () => {
            chamadas.push({ tipo: 'select', parametros: { [coluna]: valor } })
            return Promise.resolve({ data: opcoes.linha ?? null, error: erro })
          },
        }),
      }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: opcoes.usuario ? { user: { id: opcoes.usuario } } : null } }),
    },
  }

  return { cliente, chamadas }
}

describe('Enviar a cópia', () => {
  it('grava o backup na linha do usuário', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-1' })
    const { ok, erro } = await enviarCopia(cliente, BACKUP, 'Windows')

    expect(erro).toBeNull()
    expect(ok).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(chamadas[0]?.parametros['nutricionista_id']).toBe('user-1')
    expect(chamadas[0]?.parametros['aparelho']).toBe('Windows')
  })

  it('sem conta, não tenta gravar e explica o que fazer', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: null })
    const { ok, erro } = await enviarCopia(cliente, BACKUP, 'Windows')

    expect(ok).toBeNull()
    expect(erro).toBe(SEM_CONTA)
    expect(chamadas).toHaveLength(0)
  })

  it('erro do banco volta como erro, não como sucesso', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-1', erro: 'sem rede' })
    expect((await enviarCopia(cliente, BACKUP, 'Mac')).erro).toBe(FALHA_DE_REDE)
  })
})

describe('Baixar a cópia', () => {
  it('devolve o backup, de que aparelho veio e quando', async () => {
    const linha = { dados: BACKUP, aparelho: 'Celular Android', atualizado_em: '2026-09-26T10:00:00.000Z' }
    const { cliente } = clienteFalso({ usuario: 'user-1', linha })
    const { ok, erro } = await baixarCopia(cliente)

    expect(erro).toBeNull()
    expect(ok?.backup.dados).toEqual(BACKUP.dados)
    expect(ok?.aparelho).toBe('Celular Android')
    expect(ok?.atualizadoEm).toBe('2026-09-26T10:00:00.000Z')
  })

  it('conta sem cópia nenhuma diz isso, em vez de devolver vazio', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-1', linha: null })
    expect((await baixarCopia(cliente)).erro).toContain('Ainda não existe cópia')
  })

  it('cópia num formato estranho não vira restauração pela metade', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-1', linha: { dados: { formato: 99 } } })
    const { ok, erro } = await baixarCopia(cliente)

    expect(ok).toBeNull()
    expect(erro).toContain('formato')
  })

  it('sem conta, avisa', async () => {
    const { cliente } = clienteFalso({ usuario: null })
    expect((await baixarCopia(cliente)).erro).toBe(SEM_CONTA)
  })
})

describe('Apelido do aparelho', () => {
  it.each([
    ['Mozilla/5.0 (Linux; Android 14) AppleWebKit', 'Celular Android'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 'iPhone ou iPad'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 'Mac'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Windows'],
    ['coisa desconhecida', 'Este aparelho'],
  ])('%s', (agente, esperado) => {
    expect(apelidoDoAparelho(agente)).toBe(esperado)
  })
})

describe('Apagar a cópia da nuvem (D-94)', () => {
  it('CA-420: apaga só a cópia de quem está logado', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-1' })
    expect(await apagarCopiaDaNuvem(cliente)).toBeNull()
    expect(chamadas).toEqual([{ tipo: 'delete', parametros: { nutricionista_id: 'user-1' } }])
  })

  it('sem sessão não apaga nada de ninguém e não diz que apagou', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: null })
    expect(await apagarCopiaDaNuvem(cliente)).toBe(FALHA_DE_REDE)
    expect(chamadas).toHaveLength(0)
  })

  it('CA-430: a recusa do banco volta traduzida, não como texto técnico', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-1', erro: { code: '42501', message: 'permission denied for table copias' } })
    expect(await apagarCopiaDaNuvem(cliente)).toBe(FALHA_DE_REDE)
  })
})

describe('Erros do banco na cópia (D-98)', () => {
  it('CA-430: erro técnico ao enviar ou trazer vira a mensagem traduzida', async () => {
    const erro = { code: '42501', message: 'new row violates row-level security policy for table "copias"' }
    expect((await enviarCopia(clienteFalso({ usuario: 'user-1', erro }).cliente, BACKUP, 'Mac')).erro).toBe(FALHA_DE_REDE)
    expect((await baixarCopia(clienteFalso({ usuario: 'user-1', erro }).cliente)).erro).toBe(FALHA_DE_REDE)
  })
})

describe('A cópia grande demais (D-107)', () => {
  const RECUSA_DA_TRAVA = { code: '23514', message: 'new row for relation "copias" violates check constraint "copias_dados_tamanho"' }

  it('CA-445: o banco recusa a cópia acima de 5 MB e a tela recebe a frase de tamanho', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-1', erro: RECUSA_DA_TRAVA })
    expect(await enviarCopia(cliente, BACKUP, 'Mac')).toEqual({ ok: null, erro: COPIA_GRANDE_DEMAIS })
  })

  it('CA-445 e R-41: o servidor que recusa o pedido grande antes do banco (413) mostra a mesma frase', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-1', erro: 'Payload Too Large', status: 413 })
    expect((await enviarCopia(cliente, BACKUP, 'Mac')).erro).toBe(COPIA_GRANDE_DEMAIS)
  })

  it('outro status sem trava conhecida continua com a mensagem de falha', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-1', erro: 'Bad Gateway', status: 502 })
    expect((await enviarCopia(cliente, BACKUP, 'Mac')).erro).toBe(FALHA_DE_REDE)
  })

  it('CB-112: a cópia recusada não apaga a anterior: um pedido só de gravar, nenhum de apagar', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-1', erro: RECUSA_DA_TRAVA })
    await enviarCopia(cliente, BACKUP, 'Mac')
    expect(chamadas.map((c) => c.tipo)).toEqual(['upsert'])
  })
})
