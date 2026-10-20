-- MetaNutri — excluir a conta pelo site (spec exclusao-de-conta, D-252, D-253 e D-256).
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Pode rodar de novo: nenhum dado é apagado.
-- Rode DEPOIS do 001 ao 012 e ANTES de publicar a função excluir-conta e o site desta versão.
-- Publicada antes deste arquivo, a função para no limite de pedidos (o tipo 'excluir' ainda não existe) e não apaga nada.
--
-- Quem apaga o login é a função excluir-conta (ou o dono, no painel do Supabase). As linhas da conta saem junto, pelas
-- chaves estrangeiras de sempre (on delete cascade). Este arquivo cuida do que FICA (D-253), dentro do mesmo passo que
-- apaga o login: ou tudo acontece, ou nada.
--   (a) a última assinatura do Mercado Pago da conta, num registro sem nome, sem e-mail, sem cartão e sem o código da
--       conta, por 5 anos (obrigação fiscal e contestação de cobrança, LGPD art. 16, I);
--   (b) o histórico das mudanças de plano (o gráfico de receita do painel do dono), com o código da conta trocado por um
--       código novo, sorteado, que não leva à pessoa.
-- E uma rotina diária (pg_cron) apaga os registros de acesso do servidor de login com mais de 6 meses (D-259).
--
-- Tudo numa transação só: se algum passo falhar, nada fica pela metade.

begin;


-- ---------- (a) O registro das assinaturas de contas excluídas (CA-818, CA-824, CA-825) ----------

-- Uma linha por assinatura do Mercado Pago de uma conta excluída. O código da assinatura é o que leva às mensalidades no
-- painel do Mercado Pago, onde ficam os dados de quem pagou. Só o servidor lê; ninguém escreve além do gatilho abaixo.
create table if not exists public.assinaturas_de_contas_excluidas (
  id bigint generated always as identity primary key,
  preapproval_id text not null unique check (char_length(preapproval_id) between 1 and 80),
  plano text not null,
  ciclo text,
  valor_centavos integer not null,
  ultima_cobranca_paga timestamptz,
  encerrada_por text,
  encerrada_em timestamptz,
  excluida_em timestamptz not null default now()
);
create index if not exists assinaturas_de_contas_excluidas_por_data on public.assinaturas_de_contas_excluidas (excluida_em);
alter table public.assinaturas_de_contas_excluidas enable row level security;
revoke all on public.assinaturas_de_contas_excluidas from anon, authenticated;


-- ---------- (b) O histórico fica, sem a ligação com a conta (CA-819) ----------

-- A chave estrangeira do 007 apagava o histórico junto com a conta. Ela sai (procurada pelo tipo, para não depender do
-- nome que o Postgres deu), e o gatilho abaixo troca o código da conta antes de o login sair. O histórico continua
-- fechado para o navegador (007), e o gatilho de mudança de assinatura (007) continua gravando o código da conta.
do $$
declare
  v_nome text;
begin
  for v_nome in
    select conname from pg_constraint where conrelid = 'public.assinaturas_historico'::regclass and contype = 'f'
  loop
    execute format('alter table public.assinaturas_historico drop constraint %I', v_nome);
  end loop;
end $$;


-- ---------- O gatilho antes de apagar o login (D-252, CA-826) ----------

-- Roda antes de cada login sair de auth.users, pela função excluir-conta ou pelo painel do Supabase. Antes: as linhas
-- da conta ainda existem (a cascata das chaves estrangeiras roda depois). Security definer porque quem apaga o login é
-- o papel do servidor de login, que não alcança as tabelas do app (como o criar_perfil do 006).
create or replace function public.guardar_ao_excluir_conta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Um código só para a conta inteira: o gráfico de receita junta as mudanças de cada conta pelo código.
  v_anonimo uuid := gen_random_uuid();
begin
  -- CB-252: a mesma assinatura não entra duas vezes.
  insert into public.assinaturas_de_contas_excluidas (preapproval_id, plano, ciclo, valor_centavos, ultima_cobranca_paga, encerrada_por, encerrada_em)
  select a.preapproval_id, a.plano, a.ciclo, a.valor_centavos, a.ultima_cobranca_paga, a.encerrada_por, a.encerrada_em
    from public.assinaturas a
   where a.nutricionista_id = old.id and a.preapproval_id is not null
  on conflict (preapproval_id) do nothing;

  update public.assinaturas_historico set nutricionista_id = v_anonimo where nutricionista_id = old.id;

  -- CA-825: o registro fica 5 anos.
  delete from public.assinaturas_de_contas_excluidas where excluida_em < now() - interval '5 years';

  return old;
end;
$$;

revoke all on function public.guardar_ao_excluir_conta() from public, anon, authenticated;

drop trigger if exists guardar_ao_excluir_conta on auth.users;
create trigger guardar_ao_excluir_conta
  before delete on auth.users
  for each row execute function public.guardar_ao_excluir_conta();


-- ---------- A rotina diária (D-259, revisão de 19/10/2026) ----------

-- O servidor de login do Supabase anota cada entrada (data, hora, endereço IP e o e-mail usado) em
-- auth.audit_log_entries, que não sai com a conta. O Marco Civil da Internet (art. 15) manda guardar esses registros
-- por 6 meses; depois disso, esta rotina os apaga, todo dia. O 013 liga o pg_cron sozinho, do mesmo jeito que o 014
-- (seguranca-lote-5): um não depende do outro. Se o SQL Editor recusar a extensão, ligue pg_cron em
-- Database > Extensions e rode o arquivo de novo.
create extension if not exists pg_cron with schema pg_catalog;

-- `p_agora` só muda nos testes do Supabase local; a rotina chama sem nada. Só o servidor (e o agendador) chama.
create or replace function public.limpar_registros_guardados(p_agora timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.audit_log_entries where created_at < p_agora - interval '6 months';
  -- CA-825 (L1 da revisão): os 5 anos do registro valem mesmo sem outra exclusão.
  delete from public.assinaturas_de_contas_excluidas where excluida_em < p_agora - interval '5 years';
end;
$$;

revoke all on function public.limpar_registros_guardados(timestamptz) from public, anon, authenticated;
grant execute on function public.limpar_registros_guardados(timestamptz) to service_role;

-- Todo dia às 6h45 (UTC). O nome faz um agendamento novo trocar o anterior, em vez de duplicar.
select cron.schedule('metanutri-limpar-registros', '45 6 * * *', 'select public.limpar_registros_guardados();');


-- ---------- Limite de pedidos de exclusão (D-256, CA-822) ----------

-- O pedido de exclusão entra no mesmo registro de chamadas da cobrança (011), com um tipo próprio. O limite (5 por
-- hora) vem da função (supabase/functions/_shared/chamadas.ts).
alter table public.chamadas_da_cobranca drop constraint if exists chamadas_da_cobranca_tipo_check;
alter table public.chamadas_da_cobranca add constraint chamadas_da_cobranca_tipo_check check (tipo in ('cartao', 'conferir', 'excluir'));


-- A API do banco passa a conhecer a tabela nova na hora (o aviso sai quando a transação fecha).
notify pgrst, 'reload schema';

commit;


-- Conferência depois de rodar (copie para uma consulta nova):
-- select tgname, tgtype from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'guardar_ao_excluir_conta';
-- -- uma linha: guardar_ao_excluir_conta, 11 (antes, por linha, ao apagar)
-- select relname, relrowsecurity from pg_class where oid = 'public.assinaturas_de_contas_excluidas'::regclass;
-- -- uma linha: assinaturas_de_contas_excluidas, true
-- select count(*) from pg_constraint where conrelid = 'public.assinaturas_historico'::regclass and contype = 'f';
-- -- 0 (o histórico não sai mais junto com a conta; o gatilho tira dele o código da conta)
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'chamadas_da_cobranca_tipo_check';
-- -- CHECK ((tipo = ANY (ARRAY['cartao'::text, 'conferir'::text, 'excluir'::text])))
-- select has_table_privilege('authenticated', 'public.assinaturas_de_contas_excluidas', 'select') as logado_le;
-- -- false
-- select schedule, command, active from cron.job where jobname = 'metanutri-limpar-registros';
-- -- uma linha: 45 6 * * *, select public.limpar_registros_guardados();, true
-- Depois de um dia, a rotina sem erro (status succeeded):
-- select status, return_message, start_time from cron.job_run_details
--  where jobid = (select jobid from cron.job where jobname = 'metanutri-limpar-registros') order by start_time desc limit 5;
