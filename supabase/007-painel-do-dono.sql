-- MetaNutri — painel do dono (spec painel-do-dono).
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Pode rodar de novo:
-- nada é apagado, e as funções são refeitas.
--
-- Três coisas: o ciclo (mensal ou anual) de cada assinatura (D-59), o histórico de
-- cada mudança de assinatura, que o gráfico de receita lê (D-58), e as leituras do
-- painel, que só o administrador consegue chamar (CA-344).

-- ---------- Ciclo da assinatura ----------

alter table public.assinaturas add column if not exists ciclo text check (ciclo in ('mensal', 'anual'));

-- As que já existem: o anual é cobrado de uma vez, R$ 299 (Solo) ou R$ 599 (Pro).
-- Estudante e Free não têm valor e ficam sem ciclo.
update public.assinaturas
   set ciclo = case when valor_centavos in (29900, 59900) then 'anual' else 'mensal' end
 where ciclo is null and valor_centavos > 0;


-- ---------- Histórico das mudanças ----------

create table if not exists public.assinaturas_historico (
  id bigint generated always as identity primary key,
  -- Sai junto com a conta, como todo o resto dela (LGPD).
  nutricionista_id uuid not null references auth.users (id) on delete cascade,
  plano text not null,
  status text not null,
  ciclo text,
  valor_centavos integer not null,
  preco_travado boolean not null,
  quando timestamptz not null default now()
);
create index if not exists assinaturas_historico_por_conta on public.assinaturas_historico (nutricionista_id, quando);
alter table public.assinaturas_historico enable row level security;
revoke all on public.assinaturas_historico from anon, authenticated;
-- Sem política nenhuma, de propósito: o gatilho escreve e as funções do painel leem.

create or replace function public.registrar_mudanca_de_assinatura()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- O webhook regrava atualizado_em a cada aviso do Mercado Pago; isso não é mudança.
  if tg_op = 'UPDATE'
     and not (old.status is distinct from new.status
              or old.plano is distinct from new.plano
              or old.ciclo is distinct from new.ciclo
              or old.valor_centavos is distinct from new.valor_centavos
              or old.preco_travado is distinct from new.preco_travado) then
    return new;
  end if;
  insert into public.assinaturas_historico (nutricionista_id, plano, status, ciclo, valor_centavos, preco_travado)
  values (new.nutricionista_id, new.plano, new.status, new.ciclo, new.valor_centavos, new.preco_travado);
  return new;
end;
$$;

revoke all on function public.registrar_mudanca_de_assinatura() from public, anon;

drop trigger if exists guardar_historico_da_assinatura on public.assinaturas;
create trigger guardar_historico_da_assinatura
  after insert or update on public.assinaturas
  for each row execute function public.registrar_mudanca_de_assinatura();

-- O ponto de partida: a situação de hoje de quem ainda não tem histórico (R-30).
insert into public.assinaturas_historico (nutricionista_id, plano, status, ciclo, valor_centavos, preco_travado)
select a.nutricionista_id, a.plano, a.status, a.ciclo, a.valor_centavos, a.preco_travado
  from public.assinaturas a
 where not exists (select 1 from public.assinaturas_historico h where h.nutricionista_id = a.nutricionista_id);


-- ---------- Leituras do painel (só administrador) ----------

create or replace function public.painel_contas()
returns table (
  id uuid,
  nome text,
  email text,
  criada_em timestamptz,
  email_confirmado_em timestamptz,
  ultimo_login_em timestamptz,
  situacao text,
  crn_regiao smallint,
  crn_status text,
  pedido_status text,
  plano text,
  status text,
  ciclo text,
  valor_centavos integer,
  preco_travado boolean,
  expira_em timestamptz,
  assinatura_atualizada_em timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.eh_admin() then raise exception 'Só o administrador vê estes números.' using errcode = '42501'; end if;
  return query
    select u.id,
           coalesce(nullif(f.nome, ''), u.raw_user_meta_data ->> 'nome', '')::text,
           u.email::text,
           u.created_at,
           u.email_confirmed_at,
           u.last_sign_in_at,
           f.situacao,
           f.crn_regiao,
           f.crn_status,
           (select p.status from public.pedidos_estudante p where p.usuario = u.id order by p.enviado_em desc limit 1),
           a.plano,
           a.status,
           a.ciclo,
           a.valor_centavos,
           a.preco_travado,
           a.expira_em,
           a.atualizado_em
      from auth.users u
      left join public.perfis f on f.id = u.id
      left join public.assinaturas a on a.nutricionista_id = u.id
     order by u.created_at desc, u.id;
end;
$$;

revoke all on function public.painel_contas() from public, anon;
grant execute on function public.painel_contas() to authenticated;

create or replace function public.painel_historico_assinaturas()
returns table (nutricionista_id uuid, plano text, status text, ciclo text, valor_centavos integer, preco_travado boolean, quando timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.eh_admin() then raise exception 'Só o administrador vê estes números.' using errcode = '42501'; end if;
  return query
    select h.nutricionista_id, h.plano, h.status, h.ciclo, h.valor_centavos, h.preco_travado, h.quando
      from public.assinaturas_historico h
     order by h.quando asc, h.id asc;
end;
$$;

revoke all on function public.painel_historico_assinaturas() from public, anon;
grant execute on function public.painel_historico_assinaturas() to authenticated;

create or replace function public.painel_uso()
returns table (links_30_dias integer, copias_30_dias integer)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.eh_admin() then raise exception 'Só o administrador vê estes números.' using errcode = '42501'; end if;
  return query
    select (select count(*)::integer from public.acompanhamentos c where c.criado_em > now() - interval '30 days'),
           (select count(*)::integer from public.copias c where c.atualizado_em > now() - interval '30 days');
end;
$$;

revoke all on function public.painel_uso() from public, anon;
grant execute on function public.painel_uso() to authenticated;

-- Conferência depois de rodar (copie para uma consulta nova):
-- select count(*) from public.assinaturas_historico;               -- igual ao número de linhas de public.assinaturas
-- select plano, ciclo, count(*) from public.assinaturas group by 1, 2; -- pagas com mensal/anual; Estudante sem ciclo
-- select * from public.painel_uso();                               -- tem que dar "Só o administrador vê estes números.":
--                                                                     no SQL Editor você não é uma conta do app
-- Conta logada que NÃO é administradora (troque o uuid por um de auth.users que não esteja em administradores):
-- begin; set local role authenticated; select set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true); select * from public.painel_uso(); rollback;
--   tem que dar "Só o administrador vê estes números."; com o uuid do administrador, devolve uma linha.
