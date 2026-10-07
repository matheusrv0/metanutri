-- MetaNutri — segurança, lote 2 (spec seguranca-lote-2, D-107 a D-112).
-- Rode, na pasta do projeto e com a main atualizada, o comando abaixo:
--   npx supabase db query --linked --project-ref qmpljfjbdcrdbqutuvmg -f supabase/011-seguranca-lote-2.sql
-- (Alternativa: SQL Editor > New query > cole tudo > Run; as consultas de conferência no fim valem do mesmo jeito.)
-- Pode rodar de novo: nenhum dado é apagado.
-- Rode DEPOIS do 001 ao 010. Se rodar o 003, o 006 ou o 010 de novo, rode este logo depois.
--
-- Rode ANTES de publicar as funções assinar, gerenciar-assinatura e webhook-mercadopago desta versão:
-- elas anotam cada chamada à cobrança na tabela nova. Publicadas antes dele, assinar, trocar o cartão,
-- conferir e cancelar respondem que não conseguiram falar com o servidor de cobrança, sem cobrar.
--
-- O banco passa a limitar o tamanho do que cada conta guarda na nuvem e quantas vezes ela chama a
-- cobrança. Em 07/10/2026 não havia cópia nem link gravados em produção: nenhuma trava nova recusa
-- dado que já existe.


-- ---------- Tamanho do que a conta guarda na nuvem (D-107, CA-445 e CA-446) ----------

-- O app reconhece cada trava pelo nome para dizer o motivo na tela (TRAVAS_DE_TAMANHO, em
-- src/ui/estado/mensagemDoBanco.ts). O tamanho é conferido sobre o valor jsonb na hora de gravar
-- (pg_column_size), antes de o Postgres comprimir; por isso o limite vale para o dado como ele chega,
-- e não para o espaço no disco. O limite exato passa (CB-113). Recusada, a gravação inteira é desfeita: a cópia anterior fica (CB-112).
alter table public.copias drop constraint if exists copias_dados_tamanho;
alter table public.copias add constraint copias_dados_tamanho check (pg_column_size(dados) <= 5242880);

-- Cada link: missões até 256 KB; marcações até 1 MB, o mesmo teto que o marcar_missoes (010) já põe;
-- nome até 120 caracteres; códigos de caso e de paciente até 64 (o de paciente pode faltar).
alter table public.acompanhamentos drop constraint if exists acompanhamentos_missoes_tamanho;
alter table public.acompanhamentos add constraint acompanhamentos_missoes_tamanho check (pg_column_size(missoes) <= 262144);
alter table public.acompanhamentos drop constraint if exists acompanhamentos_marcacoes_tamanho;
alter table public.acompanhamentos add constraint acompanhamentos_marcacoes_tamanho check (pg_column_size(marcacoes) <= 1048576);
alter table public.acompanhamentos drop constraint if exists acompanhamentos_nome_tamanho;
alter table public.acompanhamentos add constraint acompanhamentos_nome_tamanho check (char_length(nome) <= 120);
alter table public.acompanhamentos drop constraint if exists acompanhamentos_caso_id_tamanho;
alter table public.acompanhamentos add constraint acompanhamentos_caso_id_tamanho check (char_length(caso_id) <= 64);
alter table public.acompanhamentos drop constraint if exists acompanhamentos_paciente_id_tamanho;
alter table public.acompanhamentos add constraint acompanhamentos_paciente_id_tamanho check (char_length(paciente_id) <= 64);


-- ---------- Teto de links por conta (D-107, CA-447) ----------

-- A mesma função do 010, com um teto técnico de 1000 links em qualquer plano. Pro e Clínica continuam
-- sem limite de plano (limiteLinksPaciente nulo, em src/domain/conta.ts), mas não passam de 1000. A
-- recusa é a mesma frase do limite do plano, que a tela já traduz.
create or replace function public.conferir_link_do_paciente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plano text;
  v_limite integer;
  v_links integer;
begin
  -- CA-421: conta de estudante, aprovada ou não, sempre grava o link com o aviso.
  if exists (select 1 from public.perfis where id = new.nutricionista_id and situacao = 'estudante') then
    new.uso_nao_comercial := true;
  end if;

  -- CA-422: só link novo conta. O upsert que regrava um link que já existe (gerar de novo,
  -- marcar) também passa por aqui como insert, e não é barrado.
  if tg_op = 'INSERT' and not exists (select 1 from public.acompanhamentos where id = new.id) then
    select case
             when a.status = 'ativa' and (a.expira_em is null or a.expira_em >= now()) then a.plano
             when a.status = 'cancelada' and a.plano in ('solo', 'pro', 'clinica') and a.expira_em > now() then a.plano
             else 'free'
           end
      into v_plano
      from public.assinaturas a
     where a.nutricionista_id = new.nutricionista_id;

    v_limite := case coalesce(v_plano, 'free')
                  when 'estudante' then 3
                  when 'solo' then 25
                  when 'pro' then null
                  when 'clinica' then null
                  else 2
                end;
    -- D-107: o plano sem limite fica com o teto técnico, e nenhum plano passa dele.
    v_limite := least(coalesce(v_limite, 1000), 1000);

    -- Dois links criados ao mesmo tempo (duas abas) esperam um pelo outro para contar.
    perform pg_advisory_xact_lock(hashtext('links:' || new.nutricionista_id::text));
    select count(*) into v_links from public.acompanhamentos where nutricionista_id = new.nutricionista_id;
    if v_links >= v_limite then
      raise exception 'Você chegou ao limite de links do seu plano.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists conferir_link_do_paciente on public.acompanhamentos;
create trigger conferir_link_do_paciente
  before insert or update on public.acompanhamentos
  for each row execute function public.conferir_link_do_paciente();


-- ---------- Vagas de fundador (D-112, CA-453) ----------

-- Não existe mais preço de fundador (D-78) e nada no site chama esta função. O 003 não a cria mais.
drop function if exists public.vagas_de_fundador_usadas();


-- ---------- Comprovante: só estudante com e-mail de faculdade confirmado (D-111, CA-452) ----------

-- A mesma condição que enviar_pedido_estudante (006) já exige, conferida antes de o arquivo entrar no
-- balde. A tela pergunta por esta função antes de enviar, para dizer o motivo (CA-452 e CA-428); a
-- política de envio usa a mesma, e é ela que garante. Respostas: 'ok', 'nao-estudante',
-- 'sem-email-de-faculdade' ou 'demais' (10 arquivos ou mais).
create or replace function public.conferir_envio_de_comprovante()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text;
  v_confirmado timestamptz;
begin
  if auth.uid() is null or not exists (select 1 from public.perfis where id = auth.uid() and situacao = 'estudante') then
    return 'nao-estudante';
  end if;
  select email, email_confirmed_at into v_email, v_confirmado from auth.users where id = auth.uid();
  if v_confirmado is null or not public.eh_email_de_faculdade(v_email) then
    return 'sem-email-de-faculdade';
  end if;
  if public.comprovantes_da_conta() >= 10 then
    return 'demais';
  end if;
  return 'ok';
end;
$$;

revoke execute on function public.conferir_envio_de_comprovante() from public, anon;
grant execute on function public.conferir_envio_de_comprovante() to authenticated;

drop policy if exists "estudante envia o proprio comprovante" on storage.objects;
create policy "estudante envia o proprio comprovante" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.conferir_envio_de_comprovante() = 'ok'
  );


-- ---------- Chamadas à cobrança por conta (D-108, CA-448 e CA-449) ----------

-- Cada chamada das funções de cobrança à operadora, por conta e por tipo: 'cartao' (assinar e trocar o
-- cartão) ou 'conferir' (conferir se já houve cobrança e cancelar). Sem endereço de internet. As
-- funções apagam as de mais de 2 dias a cada chamada anotada. Só o servidor mexe aqui.
create table if not exists public.chamadas_da_cobranca (
  id bigint generated always as identity primary key,
  nutricionista_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('cartao', 'conferir')),
  quando timestamptz not null default now()
);
create index if not exists chamadas_da_cobranca_por_conta on public.chamadas_da_cobranca (nutricionista_id, tipo, quando);
create index if not exists chamadas_da_cobranca_por_data on public.chamadas_da_cobranca (quando);
alter table public.chamadas_da_cobranca enable row level security;
revoke all on public.chamadas_da_cobranca from anon, authenticated;

-- Conta e anota num passo só: com a conta e o tipo travados, dois pedidos ao mesmo tempo não passam
-- juntos do limite (CB-115). Verdadeiro: anotou, e a função pode chamar a operadora. Falso: já havia
-- p_limite chamadas depois de p_desde, e nada foi anotado. O limite e a janela vêm das funções
-- (supabase/functions/_shared/chamadas.ts).
create or replace function public.anotar_chamada_da_cobranca(p_conta uuid, p_tipo text, p_limite integer, p_desde timestamptz)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_chamadas integer;
begin
  perform pg_advisory_xact_lock(hashtext('chamadas:' || p_tipo || ':' || p_conta::text));
  select count(*) into v_chamadas from public.chamadas_da_cobranca
   where nutricionista_id = p_conta and tipo = p_tipo and quando > p_desde;
  if v_chamadas >= p_limite then
    return false;
  end if;
  insert into public.chamadas_da_cobranca (nutricionista_id, tipo) values (p_conta, p_tipo);
  return true;
end;
$$;

-- Só o servidor (service_role) chama. Sem security definer: ela roda com as permissões de quem chama.
revoke all on function public.anotar_chamada_da_cobranca(uuid, text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.anotar_chamada_da_cobranca(uuid, text, integer, timestamptz) to service_role;


-- ---------- Registro de avisos (D-109, CA-450) ----------

-- Nada novo aqui: a função do aviso conta os não conferidos da última hora pelo índice por data do 009
-- (avisos_da_operadora_por_data) e, com 100 ou mais, não anota o próximo.


-- Conferência depois de rodar (copie para uma consulta nova):
-- select conname from pg_constraint where conname like '%tamanho' order by conname;
-- -- seis linhas: acompanhamentos_caso_id_tamanho, acompanhamentos_marcacoes_tamanho, acompanhamentos_missoes_tamanho,
-- --   acompanhamentos_nome_tamanho, acompanhamentos_paciente_id_tamanho e copias_dados_tamanho
-- select to_regprocedure('public.vagas_de_fundador_usadas()') as vagas;
-- -- uma linha: nulo (a função não existe mais)
-- select relname, relrowsecurity from pg_class where oid = 'public.chamadas_da_cobranca'::regclass;
-- -- uma linha: chamadas_da_cobranca, true
-- select has_function_privilege('authenticated', 'public.anotar_chamada_da_cobranca(uuid, text, integer, timestamptz)', 'execute') as logado_chamada,
--        has_function_privilege('anon', 'public.conferir_envio_de_comprovante()', 'execute') as anon_comprovante,
--        has_function_privilege('authenticated', 'public.conferir_envio_de_comprovante()', 'execute') as logado_comprovante;
-- -- uma linha: false, false, true
