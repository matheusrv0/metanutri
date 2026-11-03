-- MetaNutri — assistente de IA (spec assistente-ia, D-1318 e D-1319).
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. As consultas de conferência estão no fim.
-- Pode rodar de novo: nenhum dado é apagado.
-- Rode DEPOIS do 001 ao 015.
--
-- Rode ANTES de publicar a função sugerir-plano: ela anota cada sugestão na tabela nova. Publicada antes deste
-- arquivo, ela responde que as sugestões com IA estão indisponíveis, sem chamar a IA.
--
-- O que muda:
--   * a tabela uso_da_ia guarda cada sugestão pedida à IA: a conta, o modo, o modelo, o resultado, os tokens, o custo
--     e a duração. Nenhum dado do paciente; consentimento_declarado só diz que a ficha tinha a autorização;
--     custo_estimado marca a chamada cortada (prazo, rede, cancelamento), anotada com uma estimativa, nunca com zero;
--   * quatro funções que só o servidor chama: reservar (conta o mês e a hora e anota, num passo só), concluir, contar
--     o mês (o contador da gaveta) e somar o custo de todas as contas desde uma data (o teto do dia).

begin;


-- ---------- O registro de uso (D-1319) ----------

-- Uma linha por pedido à IA. Nasce 'reservado' e termina 'ok', 'recusa' ou 'erro'. Só 'ok' conta no limite do mês
-- (com a reserva de menos de 10 minutos, que é um pedido em andamento); na última hora, conta tudo (DP-IA-7).
-- Apagada com a conta (cascata) e, depois de 13 meses, a cada reserva nova.
create table if not exists public.uso_da_ia (
  id bigint generated always as identity primary key,
  nutricionista_id uuid not null references auth.users (id) on delete cascade,
  modo text not null check (modo in ('gerar', 'ajustar')),
  modelo text check (char_length(modelo) <= 64),
  status text not null default 'reservado' check (status in ('reservado', 'ok', 'recusa', 'erro')),
  consentimento_declarado boolean not null check (consentimento_declarado),
  tokens_entrada integer check (tokens_entrada >= 0),
  tokens_cache_gravados integer check (tokens_cache_gravados >= 0),
  tokens_cache_lidos integer check (tokens_cache_lidos >= 0),
  tokens_saida integer check (tokens_saida >= 0),
  custo_microdolares bigint check (custo_microdolares >= 0),
  -- D-1329: o custo da chamada cortada é estimado (o que o fluxo mostrou mais a saída pelo tempo); o gasto do dia o soma.
  custo_estimado boolean not null default false,
  duracao_ms integer check (duracao_ms >= 0),
  criado_em timestamptz not null default now(),
  concluido_em timestamptz
);
create index if not exists uso_da_ia_por_conta on public.uso_da_ia (nutricionista_id, criado_em);
create index if not exists uso_da_ia_por_data on public.uso_da_ia (criado_em);
alter table public.uso_da_ia enable row level security;
-- Sem política nenhuma, de propósito: o navegador não lê nem escreve. O contador chega pela função sugerir-plano.
revoke all on public.uso_da_ia from anon, authenticated;


-- ---------- Reservar um uso (D-1318, CA-2308, CA-2309 e CA-2323) ----------

-- Conta e anota num passo só: com a conta travada, duas abas ao mesmo tempo não passam juntas do limite. Devolve a
-- reserva (o id do uso) ou o motivo de não caber: 'limite-mes' ou 'limite-hora'. O limite, o início do mês (meia-noite
-- do dia 1º em Brasília) e o limite da hora vêm da função (supabase/functions/_shared/iaContrato.ts).
create or replace function public.reservar_uso_da_ia(
  p_conta uuid,
  p_modo text,
  p_consentimento boolean,
  p_limite_mes integer,
  p_inicio_mes timestamptz,
  p_limite_hora integer
)
returns table (reserva bigint, motivo text)
language plpgsql
set search_path = public
as $$
declare
  v_mes integer;
  v_hora integer;
  v_reserva bigint;
begin
  if p_consentimento is not true then raise exception 'Sem a autorização do paciente.' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtext('uso_da_ia:' || p_conta::text));
  -- CA-2324: os usos de mais de 13 meses saem aqui, de todas as contas (o índice por data acha rápido).
  delete from public.uso_da_ia u where u.criado_em < now() - interval '13 months';

  select count(*) into v_mes from public.uso_da_ia u
   where u.nutricionista_id = p_conta and u.criado_em >= p_inicio_mes
     and (u.status = 'ok' or (u.status = 'reservado' and u.criado_em > now() - interval '10 minutes'));
  if v_mes >= p_limite_mes then
    return query select null::bigint, 'limite-mes'::text;
    return;
  end if;

  select count(*) into v_hora from public.uso_da_ia u
   where u.nutricionista_id = p_conta and u.criado_em > now() - interval '1 hour';
  if v_hora >= p_limite_hora then
    return query select null::bigint, 'limite-hora'::text;
    return;
  end if;

  insert into public.uso_da_ia (nutricionista_id, modo, consentimento_declarado)
  values (p_conta, p_modo, p_consentimento)
  returning public.uso_da_ia.id into v_reserva;
  return query select v_reserva, null::text;
end;
$$;


-- ---------- Concluir um uso (CA-2313 a CA-2318 e CA-2324) ----------

-- Só muda o uso que ainda está reservado: o mesmo uso não é concluído duas vezes. Verdadeiro quando mudou.
create or replace function public.concluir_uso_da_ia(
  p_reserva bigint,
  p_status text,
  p_modelo text,
  p_entrada integer,
  p_cache_gravados integer,
  p_cache_lidos integer,
  p_saida integer,
  p_custo bigint,
  p_duracao integer,
  p_custo_estimado boolean
)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  if p_status not in ('ok', 'recusa', 'erro') then raise exception 'Resultado de uso desconhecido.' using errcode = '22023'; end if;
  update public.uso_da_ia u
     set status = p_status,
         modelo = left(p_modelo, 64),
         tokens_entrada = p_entrada,
         tokens_cache_gravados = p_cache_gravados,
         tokens_cache_lidos = p_cache_lidos,
         tokens_saida = p_saida,
         custo_microdolares = p_custo,
         duracao_ms = p_duracao,
         custo_estimado = coalesce(p_custo_estimado, false),
         concluido_em = now()
   where u.id = p_reserva and u.status = 'reservado';
  return found;
end;
$$;


-- ---------- O contador do mês (CA-2306 e CA-2318) ----------

-- Conta igual à reserva: os usos ok e as reservas de menos de 10 minutos, desde o início do mês.
create or replace function public.uso_da_ia_no_mes(p_conta uuid, p_inicio_mes timestamptz)
returns integer
language sql
stable
set search_path = public
as $$
  select count(*)::integer from public.uso_da_ia u
   where u.nutricionista_id = p_conta and u.criado_em >= p_inicio_mes
     and (u.status = 'ok' or (u.status = 'reservado' and u.criado_em > now() - interval '10 minutes'));
$$;


-- ---------- O gasto de todas as contas (D-1318, CA-2310) ----------

-- O teto do dia: a função soma as últimas 24 h e, acima de IA_TETO_DIARIO_USD, responde que a IA está indisponível.
-- Soma também o custo estimado das chamadas cortadas (D-1329): o teto enxerga o prazo esgotado e a rede caída.
create or replace function public.custo_da_ia_desde(p_desde timestamptz)
returns bigint
language sql
stable
set search_path = public
as $$
  select coalesce(sum(u.custo_microdolares), 0)::bigint from public.uso_da_ia u where u.criado_em > p_desde;
$$;


-- Só o servidor (service_role) chama. Sem security definer: elas rodam com as permissões de quem chama.
revoke all on function public.reservar_uso_da_ia(uuid, text, boolean, integer, timestamptz, integer) from public, anon, authenticated;
grant execute on function public.reservar_uso_da_ia(uuid, text, boolean, integer, timestamptz, integer) to service_role;
revoke all on function public.concluir_uso_da_ia(bigint, text, text, integer, integer, integer, integer, bigint, integer, boolean) from public, anon, authenticated;
grant execute on function public.concluir_uso_da_ia(bigint, text, text, integer, integer, integer, integer, bigint, integer, boolean) to service_role;
revoke all on function public.uso_da_ia_no_mes(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.uso_da_ia_no_mes(uuid, timestamptz) to service_role;
revoke all on function public.custo_da_ia_desde(timestamptz) from public, anon, authenticated;
grant execute on function public.custo_da_ia_desde(timestamptz) to service_role;

notify pgrst, 'reload schema';

commit;


-- Conferência depois de rodar (copie para uma consulta nova):
-- select relname, relrowsecurity from pg_class where oid = 'public.uso_da_ia'::regclass;
-- -- uma linha: uso_da_ia, true
-- select has_table_privilege('authenticated', 'public.uso_da_ia', 'select') as logado_le, has_table_privilege('anon', 'public.uso_da_ia', 'select') as anon_le;
-- -- uma linha: false, false
-- select has_function_privilege('authenticated', 'public.reservar_uso_da_ia(uuid, text, boolean, integer, timestamptz, integer)', 'execute') as logado_reserva;
-- -- uma linha: false
-- select has_function_privilege('service_role', 'public.reservar_uso_da_ia(uuid, text, boolean, integer, timestamptz, integer)', 'execute') as servidor_reserva;
-- -- uma linha: true
