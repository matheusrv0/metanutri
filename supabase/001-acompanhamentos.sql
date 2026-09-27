-- MetaNutri — tabela dos acompanhamentos (missões do paciente).
-- Rode uma vez no Supabase: SQL Editor > New query > cole tudo > Run.
--
-- O ponto delicado: o paciente NÃO tem conta. Ele chega com um token na URL e
-- precisa ler e marcar as próprias missões. Dar acesso anônimo à tabela vazaria
-- todos os pacientes de todos os nutricionistas, porque uma política de RLS não
-- consegue conferir um token que o próprio visitante afirma ter.
-- A saída: ninguém anônimo toca na tabela. O paciente só enxerga o banco através
-- de duas funções SECURITY DEFINER, que recebem o token e trabalham numa linha só.

create table if not exists public.acompanhamentos (
  id uuid primary key,
  nutricionista_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  caso_id text not null,
  paciente_id text,
  nome text not null default '',
  criado_em timestamptz not null default now(),
  missoes jsonb not null default '[]'::jsonb,
  marcacoes jsonb not null default '[]'::jsonb,
  atualizado_em timestamptz not null default now()
);

create index if not exists acompanhamentos_por_nutricionista on public.acompanhamentos (nutricionista_id);
create index if not exists acompanhamentos_por_caso on public.acompanhamentos (nutricionista_id, caso_id);

alter table public.acompanhamentos enable row level security;

-- O nutricionista mexe só no que é dele. Não existe política para anônimo:
-- sem isso, `select` anônimo devolveria a tabela inteira.
drop policy if exists "dono le" on public.acompanhamentos;
create policy "dono le" on public.acompanhamentos
  for select to authenticated using (auth.uid() = nutricionista_id);

drop policy if exists "dono escreve" on public.acompanhamentos;
create policy "dono escreve" on public.acompanhamentos
  for insert to authenticated with check (auth.uid() = nutricionista_id);

drop policy if exists "dono atualiza" on public.acompanhamentos;
create policy "dono atualiza" on public.acompanhamentos
  for update to authenticated using (auth.uid() = nutricionista_id) with check (auth.uid() = nutricionista_id);

drop policy if exists "dono apaga" on public.acompanhamentos;
create policy "dono apaga" on public.acompanhamentos
  for delete to authenticated using (auth.uid() = nutricionista_id);

-- A porta do paciente: devolve uma linha pelo token, sem o id do nutricionista.
create or replace function public.missoes_por_token(p_token text)
returns table (
  id uuid,
  token text,
  caso_id text,
  paciente_id text,
  nome text,
  criado_em timestamptz,
  missoes jsonb,
  marcacoes jsonb
)
language sql
security definer
set search_path = public
as $$
  select a.id, a.token, a.caso_id, a.paciente_id, a.nome, a.criado_em, a.missoes, a.marcacoes
  from public.acompanhamentos a
  where a.token = p_token
  limit 1;
$$;

-- A única escrita que o paciente pode fazer: as próprias marcações, na própria
-- linha. Ele não muda missão, nome nem dono.
create or replace function public.marcar_missoes(p_token text, p_marcacoes jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if jsonb_typeof(p_marcacoes) is distinct from 'array' then
    raise exception 'marcacoes precisa ser uma lista';
  end if;

  update public.acompanhamentos
  set marcacoes = p_marcacoes, atualizado_em = now()
  where token = p_token;
end;
$$;

-- Quem pode chamar cada função. `anon` é o visitante sem conta: o paciente.
revoke all on function public.missoes_por_token(text) from public;
revoke all on function public.marcar_missoes(text, jsonb) from public;
grant execute on function public.missoes_por_token(text) to anon, authenticated;
grant execute on function public.marcar_missoes(text, jsonb) to anon, authenticated;
