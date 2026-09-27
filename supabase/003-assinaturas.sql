-- MetaNutri — assinaturas (Mercado Pago).
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
--
-- Quem escreve aqui é só o servidor. O navegador pode ler a própria assinatura,
-- mas nunca gravar: se pudesse, qualquer pessoa se daria o plano Pro de graça
-- editando uma requisição. A escrita vem das Edge Functions, que usam a
-- service_role e passam por cima do RLS.

create table if not exists public.assinaturas (
  nutricionista_id uuid primary key references auth.users (id) on delete cascade,
  plano text not null default 'free',
  status text not null default 'pendente',
  -- Id da assinatura no Mercado Pago, para casar a notificação com a pessoa.
  preapproval_id text unique,
  valor_centavos integer not null default 0,
  -- Preço de fundador: quem entrou nas primeiras vagas não sobe quando o preço subir.
  preco_travado boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists assinaturas_por_preapproval on public.assinaturas (preapproval_id);

alter table public.assinaturas enable row level security;

-- Ler a própria: sim. Escrever: ninguém pelo navegador.
drop policy if exists "dono le a assinatura" on public.assinaturas;
create policy "dono le a assinatura" on public.assinaturas
  for select to authenticated using (auth.uid() = nutricionista_id);

-- Quantas assinaturas pagas já existem, para saber se as vagas de fundador acabaram.
-- Conta sem expor quem é quem.
create or replace function public.vagas_de_fundador_usadas()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer from public.assinaturas where status = 'ativa' and preco_travado;
$$;

revoke all on function public.vagas_de_fundador_usadas() from public;
grant execute on function public.vagas_de_fundador_usadas() to anon, authenticated;
