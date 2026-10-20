// O cliente do Supabase do site usa o fluxo PKCE (spec seguranca-lote-5, D-267): um endereço com a sessão
// dentro (#access_token=...) não entra em conta nenhuma.

const ENDERECO = 'https://exemplo-de-teste.supabase.co'
const CHAVE = 'chave-anon-de-teste-com-mais-de-vinte-letras'
/** Um token qualquer no formato de JWT: o que um link montado por outra pessoa traria. */
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJvdXRyYS1jb250YSIsImV4cCI6NDEwMjQ0NDgwMH0.assinatura'

async function clienteNovo() {
  vi.resetModules()
  vi.stubEnv('VITE_SUPABASE_URL', ENDERECO)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', CHAVE)
  const { obterSupabase } = await import('./supabase.ts')
  return obterSupabase()
}

describe('o cliente do Supabase (D-267)', () => {
  const pedidos: string[] = []

  beforeEach(() => {
    pedidos.length = 0
    localStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (entrada: RequestInfo | URL) => {
        pedidos.push(String(entrada))
        return new Response(JSON.stringify({ id: 'outra-conta', email: 'outra@exemplo.com' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
      }),
    )
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('CA-855: usa o fluxo pkce', async () => {
    const cliente = await clienteNovo()
    expect(cliente).not.toBeNull()
    // O supabase-js guarda a escolha no cliente de login.
    expect((cliente?.auth as unknown as { flowType: string }).flowType).toBe('pkce')
  })

  it('CA-856: um endereço com a sessão no fragmento não entra em conta nenhuma', async () => {
    window.history.replaceState(null, '', `/#access_token=${TOKEN}&refresh_token=outro&expires_in=3600&token_type=bearer&type=recovery`)
    const cliente = await clienteNovo()
    const { data } = (await cliente?.auth.getSession()) ?? { data: { session: null } }
    expect(data.session).toBeNull()
    // Nem chegou a perguntar ao servidor de quem é o token.
    expect(pedidos.filter((p) => p.includes('/auth/v1/user'))).toEqual([])
  })
})
