import { apelidoDoAparelho, baixarCopia, enviarCopia, SEM_CONTA, type ClienteCopia } from './copiaNaNuvem.ts'
import type { Backup } from './perfil.ts'

const BACKUP: Backup = { formato: 1, geradoEm: '2026-09-27T00:00:00.000Z', dados: { 'metanutri:casos': '["id1"]' } }

interface Chamada {
  readonly tipo: 'upsert' | 'select'
  readonly parametros: Record<string, unknown>
}

function clienteFalso(opcoes: { readonly usuario?: string | null; readonly linha?: unknown; readonly erro?: string } = {}) {
  const chamadas: Chamada[] = []
  const erro = opcoes.erro ? { message: opcoes.erro } : null

  const cliente: ClienteCopia = {
    from: () => ({
      upsert: (linha) => {
        chamadas.push({ tipo: 'upsert', parametros: linha })
        return Promise.resolve({ data: null, error: erro })
      },
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
    expect((await enviarCopia(cliente, BACKUP, 'Mac')).erro).toBe('sem rede')
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
