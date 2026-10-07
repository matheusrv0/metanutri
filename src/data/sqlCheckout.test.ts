import publicar from '../../.github/workflows/publicar.yml?raw'
import sql from '../../supabase/008-cartao-da-assinatura.sql?raw'

// As funções assinar, gerenciar-assinatura e webhook-mercadopago viraram ligação fina (D-88): o que
// elas decidem é testado pelo comportamento em servidorAssinar, servidorGerenciar, servidorWebhook e
// servidorOperadora, e a ligação, em servidorLigacao.test.ts.

describe('banco: o cartão da assinatura (spec checkout-proprio, 008)', () => {
  it('D-70: guarda só a bandeira, os 4 últimos números e a próxima cobrança', () => {
    expect(sql).toContain('alter table public.assinaturas add column if not exists cartao_bandeira text check (char_length(cartao_bandeira) between 1 and 40);')
    expect(sql).toContain("alter table public.assinaturas add column if not exists cartao_final text check (cartao_final ~ '^[0-9]{4}$');")
    expect(sql).toContain('alter table public.assinaturas add column if not exists proxima_cobranca timestamptz;')
  })

  it('D-70: nenhuma política nem permissão nova: quem escreve continua sendo só o servidor', () => {
    expect(sql).not.toMatch(/create policy|grant /i)
  })

  it('C1: a trava contra dois pedidos ao mesmo tempo é uma linha por conta, que só o servidor vê', () => {
    expect(sql).toContain('create table if not exists public.assinando_agora (')
    expect(sql).toContain('nutricionista_id uuid primary key references auth.users (id) on delete cascade,')
    expect(sql).toContain('desde timestamptz not null default now()')
    expect(sql).toContain('alter table public.assinando_agora enable row level security;')
    expect(sql).toContain('revoke all on public.assinando_agora from anon, authenticated;')
    expect(sql).not.toMatch(/revoke[^;]*service_role/i)
  })

  it('C1: a conferência depois de rodar também mostra a trava', () => {
    expect(sql).toMatch(/^-- select .*'public\.assinando_agora'/m)
  })
})

describe('o site publicado (D-72)', () => {
  it('a chave pública do pagamento vem de uma variável do GitHub', () => {
    expect(publicar).toContain('VITE_MERCADOPAGO_PUBLIC_KEY: ${{ vars.VITE_MERCADOPAGO_PUBLIC_KEY }}')
  })

  it('CA-432: cada ação do GitHub está fixada pelo commit, com a versão num comentário (D-100)', () => {
    const acoes = publicar.split('\n').filter((linha) => /^\s*(- )?uses:/.test(linha))
    expect(acoes).toHaveLength(5)
    for (const linha of acoes) expect(linha).toMatch(/uses: [\w.-]+\/[\w.-]+@[0-9a-f]{40} # v\d+$/)
  })
})
