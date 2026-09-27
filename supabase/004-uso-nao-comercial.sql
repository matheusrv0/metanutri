-- MetaNutri — marca de uso não comercial no link do paciente.
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
--
-- Conta de estudante pode gerar link (até 3), mas a tela do paciente precisa avisar
-- que não é atendimento profissional. É o modelo do WebDiet e o que a Lei 8.234/1991
-- pede de quem ainda não tem CRN.

alter table public.acompanhamentos
  add column if not exists uso_nao_comercial boolean not null default false;

-- A função do paciente precisa devolver a coluna nova, senão o aviso nunca aparece.
create or replace function public.missoes_por_token(p_token text)
returns table (
  id uuid,
  token text,
  caso_id text,
  paciente_id text,
  nome text,
  criado_em timestamptz,
  missoes jsonb,
  marcacoes jsonb,
  uso_nao_comercial boolean
)
language sql
security definer
set search_path = public
as $$
  select a.id, a.token, a.caso_id, a.paciente_id, a.nome, a.criado_em, a.missoes, a.marcacoes, a.uso_nao_comercial
  from public.acompanhamentos a
  where a.token = p_token
  limit 1;
$$;

revoke all on function public.missoes_por_token(text) from public;
grant execute on function public.missoes_por_token(text) to anon, authenticated;
