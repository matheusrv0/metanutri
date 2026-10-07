import sql from '../../supabase/009-cobranca-em-producao.sql?raw'

const inicioDoRegistro = sql.indexOf('create table if not exists public.avisos_da_operadora (')
/** Só o bloco da tabela de avisos, para conferir que ela não guarda dado pessoal. */
const registro = sql.slice(inicioDoRegistro, sql.indexOf(');', inicioDoRegistro))

const inicioDasTentativas = sql.indexOf('create table if not exists public.tentativas_de_cartao (')
/** Só o bloco da tabela de tentativas de cartão. */
const tentativas = sql.slice(inicioDasTentativas, sql.indexOf(');', inicioDasTentativas))

describe('banco: cobrança em produção (spec cobranca-em-producao, 009)', () => {
  it('D-83 e D-81: a data da última mensalidade paga', () => {
    expect(sql).toContain('alter table public.assinaturas add column if not exists ultima_cobranca_paga timestamptz;')
  })

  it('D-80 e CA-393: quem encerrou a assinatura (só três valores) e quando', () => {
    expect(sql).toContain("alter table public.assinaturas add column if not exists encerrada_por text check (encerrada_por in ('pessoa', 'recusa', 'operadora'));")
    expect(sql).toContain('alter table public.assinaturas add column if not exists encerrada_em timestamptz;')
  })

  it('CA-400: a reserva guarda o cartão do pedido em andamento, com as travas de assinaturas', () => {
    expect(sql).toContain('alter table public.assinando_agora add column if not exists cartao_bandeira text check (char_length(cartao_bandeira) between 1 and 40);')
    expect(sql).toContain("alter table public.assinando_agora add column if not exists cartao_final text check (cartao_final ~ '^[0-9]{4}$');")
  })

  it('D-84 e CA-398: o registro tem a hora, o tipo, o código do recurso, se a assinatura conferiu e o resultado', () => {
    expect(inicioDoRegistro).toBeGreaterThan(-1)
    expect(registro).toContain('id bigint generated always as identity primary key,')
    expect(registro).toContain('recebido_em timestamptz not null default now(),')
    expect(registro).toContain('topico text not null check (char_length(topico) <= 80),')
    expect(registro).toContain('recurso_id text check (char_length(recurso_id) <= 80),')
    expect(registro).toContain('assinatura_confere boolean,')
    expect(registro).toContain('resultado text not null check (char_length(resultado) <= 200)')
  })

  it('D-84: o registro não guarda dado pessoal', () => {
    expect(registro).not.toMatch(/email|nutricionista_id|external_reference|payer|cpf|nome|cartao/i)
  })

  it('CA-398: índice pela data de chegada, para apagar os de mais de 90 dias', () => {
    expect(sql).toContain('create index if not exists avisos_da_operadora_por_data on public.avisos_da_operadora (recebido_em);')
  })

  it('só o servidor vê o registro; nenhuma política nem permissão nova', () => {
    expect(sql).toContain('alter table public.avisos_da_operadora enable row level security;')
    expect(sql).toContain('revoke all on public.avisos_da_operadora from anon, authenticated;')
    expect(sql).not.toMatch(/create policy|grant /i)
    expect(sql).not.toMatch(/revoke[^;]*service_role/i)
  })

  it('R6 e CA-433/CA-434: tentativas de cartão por conta, sem IP, apagadas junto com a conta', () => {
    expect(inicioDasTentativas).toBeGreaterThan(-1)
    expect(tentativas).toContain('id bigint generated always as identity primary key,')
    expect(tentativas).toContain('nutricionista_id uuid not null references auth.users (id) on delete cascade,')
    expect(tentativas).toContain('quando timestamptz not null default now(),')
    expect(tentativas).toContain('recusada boolean not null')
    expect(tentativas).not.toMatch(/(^|[^a-z])ip([^a-z]|$)/i)
    expect(sql).toContain('create index if not exists tentativas_de_cartao_por_conta on public.tentativas_de_cartao (nutricionista_id, quando);')
    expect(sql).toContain('create index if not exists tentativas_de_cartao_por_data on public.tentativas_de_cartao (quando);')
  })

  it('tentativas de cartão: só o servidor mexe', () => {
    expect(sql).toContain('alter table public.tentativas_de_cartao enable row level security;')
    expect(sql).toContain('revoke all on public.tentativas_de_cartao from anon, authenticated;')
  })

  it('pode rodar de novo: toda criação é "if not exists" e nada é apagado', () => {
    expect(sql).not.toMatch(/^\s*(drop|delete|truncate)\b/im)
    const criacoes = sql.split('\n').filter((linha) => /^\s*(create table|create index|alter table .* add column)/i.test(linha))
    expect(criacoes.length).toBeGreaterThanOrEqual(10)
    for (const linha of criacoes) expect(linha).toMatch(/if not exists/i)
  })

  it('a conferência depois de rodar mostra as colunas novas e o registro', () => {
    expect(sql).toMatch(/^--\s+and column_name in \('ultima_cobranca_paga', 'encerrada_por', 'encerrada_em'\)/m)
    expect(sql).toMatch(/^-- select .*'public\.avisos_da_operadora'/m)
  })
})
