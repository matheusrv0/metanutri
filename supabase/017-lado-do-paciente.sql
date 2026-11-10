-- MetaNutri — o lado do paciente: o link fixo, a mensagem, o "Meu plano" e os e-mails (spec lado-do-paciente).
-- Rode, na pasta do projeto e com a main atualizada, o comando abaixo:
--   npx supabase db query --linked --project-ref qmpljfjbdcrdbqutuvmg -f supabase/017-lado-do-paciente.sql
-- (Alternativa: SQL Editor > New query > cole tudo > Run; as consultas de conferência no fim valem do mesmo jeito.)
-- Pode rodar de novo: nenhum dado é apagado (a migração do link fixo só marca os links antigos de cada paciente).
-- Rode DEPOIS do 001 ao 015 e ANTES de publicar o site e as funções desta versão. Se rodar o 004, o 012 ou o 015 de
-- novo, rode este logo depois: os três refazem a função do paciente sem as colunas novas. Se rodar o 011 de novo,
-- também: ele refaz o limite de links contando os links substituídos. Se rodar o 010 de novo, também: ele refaz a
-- marcação do paciente sem o corte do endereço trocado.
--
-- O que muda:
--   * o link passa a ser do paciente (D-1214): ganha a mensagem, a próxima consulta, o último acesso, a data do plano e o
--     `substituido_por` da migração (D-1217); o limite da assinatura conta pacientes com link (DP-LP-6);
--   * "Trocar o endereço" corta todos os endereços antigos do paciente e devolve o link ao e-mail da ficha (D-1246 e
--     D-1248, revisão de 04/11): o banco guarda só o resumo do token trocado;
--   * os e-mails ganham tabelas próprias, nenhuma aberta a quem não tem conta: o e-mail do link e as ofertas, os
--     aceites, as chaves das páginas de aceite e de descadastro, o histórico de envios, a supressão (só o resumo do
--     endereço), os limites de pedido, a configuração de e-mail da conta e o estado dos avisos;
--   * o paciente só chega ao banco pelo token, por funções; a nutricionista lê o que é dela e escreve por funções que
--     conferem o dono; as funções do servidor (Edge Functions) usam a chave de serviço;
--   * o agendamento chama a função `avisos` em quatro horários e apaga o que venceu uma vez por dia.
--
-- Publicado antes deste arquivo, o site salva o link sem as colunas novas e abre como antes (DP-LP-30); os e-mails
-- respondem que não deu para enviar.
--
-- Tudo numa transação só: a função do paciente é apagada e criada de novo, e quem abre o link nesse meio tempo nunca a
-- encontra faltando. Se algum passo falhar, nada fica pela metade.

begin;


-- ---------- O link do paciente: colunas novas (D-1208, D-1209, D-1217, D-1223, D-1230) ----------

alter table public.acompanhamentos add column if not exists mensagem text;
alter table public.acompanhamentos add column if not exists mensagem_em timestamptz;
alter table public.acompanhamentos add column if not exists proxima_consulta text;
alter table public.acompanhamentos add column if not exists ultimo_acesso date;
-- DP-LP-5: o link antigo aponta para o fixo do mesmo paciente. Removido o fixo, os antigos saem junto: eles só abriam
-- o fixo.
alter table public.acompanhamentos add column if not exists substituido_por uuid references public.acompanhamentos (id) on delete cascade;
-- O A1 agendado (DP-LP-10): só as funções do servidor escrevem.
alter table public.acompanhamentos add column if not exists a1_para timestamptz;
-- D-1246 (DP-LP-32): o link antigo que "Trocar o endereço" cortou. Só o banco escreve: cortado, nunca volta a abrir.
alter table public.acompanhamentos add column if not exists cortado_em timestamptz;

-- A data do plano (o lembrete e o A1 contam a partir dela). Na primeira vez, vale a criação do link; depois, o gatilho
-- abaixo a muda quando as missões, a dieta ou o plano do link mudam.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'acompanhamentos' and column_name = 'plano_em'
  ) then
    alter table public.acompanhamentos add column plano_em timestamptz;
    update public.acompanhamentos set plano_em = criado_em;
    alter table public.acompanhamentos alter column plano_em set default now();
    alter table public.acompanhamentos alter column plano_em set not null;
  end if;
end;
$$;

create index if not exists acompanhamentos_por_substituido on public.acompanhamentos (substituido_por);

-- D-1208 e CA-2213: a mensagem até 400 caracteres. A tela confere antes (DP-LP-29); o banco só garante.
alter table public.acompanhamentos drop constraint if exists acompanhamentos_mensagem_tamanho;
alter table public.acompanhamentos add constraint acompanhamentos_mensagem_tamanho check (mensagem is null or char_length(mensagem) <= 400);
-- D-143: a próxima consulta como a ficha grava, AAAA-MM-DD ou AAAA-MM-DDTHH:MM.
alter table public.acompanhamentos drop constraint if exists acompanhamentos_proxima_consulta_formato;
alter table public.acompanhamentos add constraint acompanhamentos_proxima_consulta_formato
  check (proxima_consulta is null or proxima_consulta ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}(T[0-9]{2}:[0-9]{2})?$');
alter table public.acompanhamentos drop constraint if exists acompanhamentos_substituido_por_outro;
alter table public.acompanhamentos add constraint acompanhamentos_substituido_por_outro check (substituido_por is null or substituido_por <> id);


-- ---------- O endereço trocado (D-1246, DP-LP-32, revisão de 04/11) ----------

-- Os endereços que "Trocar o endereço" aposentou: só o resumo (SHA-256) do token, para a tela dizer "Este link foi
-- trocado." e para nenhum link voltar a abrir com ele. Removido o link, os resumos dele saem junto. Ninguém lê pela API.
create table if not exists public.tokens_trocados (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  link_id uuid not null references public.acompanhamentos (id) on delete cascade,
  trocado_em timestamptz not null default now()
);
create index if not exists tokens_trocados_por_link on public.tokens_trocados (link_id);
alter table public.tokens_trocados enable row level security;
revoke all on public.tokens_trocados from anon, authenticated;

-- O resumo do token, como o banco o guarda.
create or replace function public.hash_do_token(p_token text)
returns text
language sql
immutable
set search_path = public
as $$
  select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex');
$$;

revoke all on function public.hash_do_token(text) from public, anon, authenticated;

-- CA-2289: o endereço que foi trocado (o resumo guardado) ou o link antigo que a troca cortou. A tela do paciente
-- pergunta só quando o link não abriu; a resposta é sim ou não, sem nada do link.
create or replace function public.link_trocado(p_token text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p_token, '') <> '' and (
    exists (select 1 from public.tokens_trocados t where t.token_hash = public.hash_do_token(p_token))
    or exists (select 1 from public.acompanhamentos a where a.token = p_token and a.cortado_em is not null)
  );
$$;

revoke all on function public.link_trocado(text) from public;
grant execute on function public.link_trocado(text) to anon, authenticated;


-- ---------- O limite conta pacientes com link (DP-LP-6) e o fixo é da mesma conta ----------

-- A mesma função do 011, com duas mudanças: os links substituídos não contam no limite, e o `substituido_por` só aponta
-- para um link da mesma conta (sem isso, uma conta faria o próprio token abrir o link de outra). A frase do limite não
-- muda: o app a reconhece.
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

  -- DP-LP-5: o link fixo é outro link da mesma conta.
  if new.substituido_por is not null and not exists (
    select 1 from public.acompanhamentos f where f.id = new.substituido_por and f.nutricionista_id = new.nutricionista_id
  ) then
    raise exception 'O link fixo precisa ser da mesma conta.' using errcode = '42501';
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

    -- Dois links criados ao mesmo tempo (duas abas) esperam um pelo outro para contar. DP-LP-6: só os links fixos
    -- (um por paciente) contam; o cortado pela troca do endereço (D-1246) não abre e não conta.
    perform pg_advisory_xact_lock(hashtext('links:' || new.nutricionista_id::text));
    select count(*) into v_links from public.acompanhamentos where nutricionista_id = new.nutricionista_id and substituido_por is null and cortado_em is null;
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

-- A data do plano e o que só a nuvem escreve. O app (papel `authenticated`) não grava o último acesso, o A1 agendado
-- nem o corte da troca do endereço: o primeiro vem do paciente, pelo token; o segundo, das funções do servidor; o
-- terceiro, do gatilho da troca (D-1246). E o endereço trocado nunca volta (CA-2290): a aba antiga que grava o link com
-- o token de antes fica com o token de agora, e nenhum link novo nasce com ele.
create or replace function public.cuidar_do_link()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.plano_em := now();
    if current_user in ('authenticated', 'anon') then
      new.ultimo_acesso := null;
      new.a1_para := null;
      new.cortado_em := null;
    end if;
    -- Só o link novo: o upsert que regrava um link que já existe segue para o conflito, como antes.
    if public.link_trocado(new.token) and not exists (select 1 from public.acompanhamentos where id = new.id) then
      raise exception 'Este endereço já foi usado.' using errcode = '23505';
    end if;
    return new;
  end if;

  if new.missoes is distinct from old.missoes or new.dieta is distinct from old.dieta or new.caso_id is distinct from old.caso_id then
    new.plano_em := now();
  else
    new.plano_em := old.plano_em;
  end if;
  if current_user in ('authenticated', 'anon') then
    new.ultimo_acesso := old.ultimo_acesso;
    new.a1_para := old.a1_para;
    new.cortado_em := old.cortado_em;
  end if;
  if new.token is distinct from old.token then
    if public.link_trocado(new.token) then
      new.token := old.token;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.cuidar_do_link() from public, anon, authenticated;

drop trigger if exists cuidar_do_link on public.acompanhamentos;
create trigger cuidar_do_link
  before insert or update on public.acompanhamentos
  for each row execute function public.cuidar_do_link();


-- ---------- A migração para o link fixo (D-1217, DP-LP-5) ----------

-- Em cada conta, o link mais recente de cada paciente é o fixo; os outros do mesmo paciente passam a abrir o fixo e
-- guardam as marcações deles. Link sem paciente fica como está. Rodar de novo não muda o que já foi marcado. O link
-- cortado pela troca do endereço (D-1246) não entra: ele nunca volta a ser o fixo.
with ordenados as (
  select a.id,
         first_value(a.id) over (partition by a.nutricionista_id, a.paciente_id order by a.criado_em desc, a.id desc) as fixo
    from public.acompanhamentos a
   where a.paciente_id is not null and a.substituido_por is null and a.cortado_em is null
)
update public.acompanhamentos a
   set substituido_por = o.fixo
  from ordenados o
 where a.id = o.id and o.fixo <> a.id;


-- ---------- As tabelas dos e-mails ----------

-- A configuração de e-mail da conta (DP-LP-8, CA-2266): o nome e o e-mail de resposta do Perfil, publicados pelo app, e
-- os dois interruptores de Configurações › E-mails. Uma linha por conta, só do dono.
create table if not exists public.config_de_emails (
  nutricionista_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  responder_para text,
  resumo_da_adesao boolean not null default true,
  oferecer_aos_novos boolean not null default true,
  atualizado_em timestamptz not null default now()
);
alter table public.config_de_emails drop constraint if exists config_de_emails_nome_tamanho;
alter table public.config_de_emails add constraint config_de_emails_nome_tamanho check (char_length(nome) <= 120);
alter table public.config_de_emails drop constraint if exists config_de_emails_responder_para_formato;
alter table public.config_de_emails add constraint config_de_emails_responder_para_formato
  check (responder_para is null or (char_length(responder_para) <= 254 and responder_para ~ '^[^@[:space:]]+@[^@[:space:].]+(\.[^@[:space:].]+)+$'));

-- O e-mail do link e as ofertas da nutricionista (D-1227, DP-LP-7). O endereço guardado já normalizado (CB-1211).
create table if not exists public.emails_dos_links (
  link_id uuid primary key references public.acompanhamentos (id) on delete cascade,
  nutricionista_id uuid not null references auth.users (id) on delete cascade,
  email text,
  email_hash text,
  origem text check (origem in ('ficha', 'paciente')),
  email_ficha text,
  confirmado_em timestamptz,
  oferta_plano boolean not null default true,
  oferta_semana boolean not null default true,
  oferta_lembrete boolean not null default true,
  parou_tudo_em timestamptz,
  convite_em timestamptz,
  atualizado_em timestamptz not null default now()
);
create index if not exists emails_dos_links_por_conta on public.emails_dos_links (nutricionista_id);
create index if not exists emails_dos_links_por_hash on public.emails_dos_links (email_hash);
alter table public.emails_dos_links drop constraint if exists emails_dos_links_email_formato;
alter table public.emails_dos_links add constraint emails_dos_links_email_formato check (
  (email is null or (char_length(email) <= 254 and email = lower(email) and email ~ '^[^@[:space:]]+@[^@[:space:].]+(\.[^@[:space:].]+)+$'))
  and (email_ficha is null or (char_length(email_ficha) <= 254 and email_ficha = lower(email_ficha)))
  and (email_hash is null or email_hash ~ '^[0-9a-f]{64}$')
  and ((email is null) = (email_hash is null))
);

-- Os aceites (D-1226, D-1243): o tipo, o dia e a hora, a versão do texto e o resumo do endereço. Um ativo por link,
-- aviso e endereço. Removido o link, o aceite fica sem ele e encerrado; a rotina diária o apaga 6 meses depois.
create table if not exists public.aceites (
  id bigint generated always as identity primary key,
  link_id uuid references public.acompanhamentos (id) on delete set null,
  nutricionista_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('plano', 'semana', 'lembrete')),
  email_hash text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  versao text not null default 'avisos-v1' check (char_length(versao) <= 40),
  aceito_em timestamptz not null default now(),
  -- 0 é domingo, no dia de Brasília: o resumo da semana sai no dia da semana do aceite (D-1229).
  dia_da_semana smallint not null default (extract(dow from (now() at time zone 'America/Sao_Paulo'))::smallint) check (dia_da_semana between 0 and 6),
  saiu_em timestamptz,
  -- D-1229: o resumo parou sozinho depois de 3 semanas sem uso; volta quando o paciente marca de novo.
  pausado_em timestamptz
);
create unique index if not exists aceites_um_ativo on public.aceites (link_id, tipo, email_hash) where saiu_em is null;
create index if not exists aceites_por_conta on public.aceites (nutricionista_id);
create index if not exists aceites_por_link on public.aceites (link_id);

-- O link que sai deixa o aceite encerrado (a chave estrangeira o desliga; aqui fica a data, para a limpeza de 6 meses).
create or replace function public.encerrar_aceite_sem_link()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.link_id is not null and new.link_id is null then
    new.saiu_em := coalesce(new.saiu_em, now());
  end if;
  return new;
end;
$$;

revoke all on function public.encerrar_aceite_sem_link() from public, anon, authenticated;

drop trigger if exists encerrar_aceite_sem_link on public.aceites;
create trigger encerrar_aceite_sem_link
  before update of link_id on public.aceites
  for each row execute function public.encerrar_aceite_sem_link();

-- As chaves das páginas de aceite e de descadastro (DP-LP-20): 32 letras e números sorteados pelo servidor. O aceite
-- vale 7 dias e uma vez (CB-1222); o descadastro não vence. Só o servidor lê e escreve.
create table if not exists public.chaves_de_aviso (
  chave text primary key check (chave ~ '^[A-Za-z0-9]{32}$'),
  link_id uuid references public.acompanhamentos (id) on delete cascade,
  nutricionista_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('aceite', 'sair')),
  avisos text[] not null,
  email_hash text check (email_hash is null or email_hash ~ '^[0-9a-f]{64}$'),
  criado_em timestamptz not null default now(),
  vence_em timestamptz,
  usado_em timestamptz,
  desfazer jsonb check (desfazer is null or pg_column_size(desfazer) <= 4096)
);
-- D-1247 (DP-LP-34, revisão de 04/11): o e-mail que o paciente digitou no link espera a confirmação aqui, na chave do
-- aceite, e só o "Confirmar" o leva ao link. Com ele, a chave vale sem nenhum aviso marcado.
alter table public.chaves_de_aviso add column if not exists email text;
alter table public.chaves_de_aviso drop constraint if exists chaves_de_aviso_avisos_check;
alter table public.chaves_de_aviso add constraint chaves_de_aviso_avisos_check check (
  cardinality(avisos) <= 6
  and avisos <@ array['plano', 'semana', 'lembrete', 's2', 'todos', 'n1']::text[]
  and (cardinality(avisos) >= 1 or (tipo = 'aceite' and email is not null))
);
alter table public.chaves_de_aviso drop constraint if exists chaves_de_aviso_email_formato;
alter table public.chaves_de_aviso add constraint chaves_de_aviso_email_formato check (
  email is null
  or (tipo = 'aceite' and email_hash is not null and char_length(email) <= 254 and email = lower(email)
      and email ~ '^[^@[:space:]]+@[^@[:space:].]+(\.[^@[:space:].]+)+$')
);
-- D-1256 (DP-LP-42, revisão de 10/11): a chave do aceite guarda o resumo (SHA-256, `hash_do_token`) do endereço do link
-- com que foi pedida. A regra entra `not valid`: vale para toda chave nova, e rodar de novo não confere as velhas.
alter table public.chaves_de_aviso add column if not exists token_hash text;
alter table public.chaves_de_aviso drop constraint if exists chaves_de_aviso_token_hash_formato;
alter table public.chaves_de_aviso add constraint chaves_de_aviso_token_hash_formato check (token_hash is null or token_hash ~ '^[0-9a-f]{64}$');
alter table public.chaves_de_aviso drop constraint if exists chaves_de_aviso_aceite_com_endereco;
alter table public.chaves_de_aviso add constraint chaves_de_aviso_aceite_com_endereco check (tipo <> 'aceite' or token_hash is not null) not valid;
create index if not exists chaves_de_aviso_por_link on public.chaves_de_aviso (link_id);
create index if not exists chaves_de_aviso_por_conta on public.chaves_de_aviso (nutricionista_id);
create index if not exists chaves_de_aviso_por_vencimento on public.chaves_de_aviso (vence_em);

-- O histórico de envios (D-1243, CA-2264): o tipo, o assunto, o estado e a data, com o resumo do endereço (nunca o
-- endereço). A chave única por endereço, tipo, dia e link impede o mesmo aviso duas vezes (CA-2276, DP-LP-13).
create table if not exists public.envios (
  id bigint generated always as identity primary key,
  link_id uuid references public.acompanhamentos (id) on delete set null,
  nutricionista_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('S1', 'S2', 'S3', 'S4', 'A1', 'A2', 'A3', 'A4', 'N1')),
  email_hash text not null check (email_hash ~ '^[0-9a-f]{64}$'),
  assunto text not null check (char_length(assunto) <= 200),
  estado text not null check (estado in ('enviado', 'entregue', 'devolvido', 'devolucao-temporaria', 'queixa', 'adiado', 'pausado', 'falhou')),
  resend_id text unique check (resend_id is null or char_length(resend_id) <= 100),
  chave_unica text unique check (chave_unica is null or char_length(chave_unica) <= 200),
  -- O dia de Brasília do envio (as regras dos avisos contam por ele, DP-LP-11).
  dia date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  -- O S1 da recuperação com mais de um plano grava uma linha por link; só a primeira conta no teto.
  conta_no_teto boolean not null default true,
  extra jsonb check (extra is null or pg_column_size(extra) <= 4096),
  criado_em timestamptz not null default now()
);
create index if not exists envios_por_data on public.envios (criado_em);
create index if not exists envios_por_link on public.envios (link_id, criado_em);
create index if not exists envios_por_endereco on public.envios (email_hash, criado_em);
create index if not exists envios_por_conta on public.envios (nutricionista_id);

-- A supressão (D-1239, D-1243): o resumo do endereço que não recebe mais aviso, de nenhuma conta. Fica para sempre, mesmo
-- depois de a conta sair (CA-2284). Só o servidor lê e escreve.
create table if not exists public.supressao (
  email_hash text primary key check (email_hash ~ '^[0-9a-f]{64}$'),
  motivo text not null check (motivo in ('devolvido', 'queixa')),
  criado_em timestamptz not null default now()
);

-- Os limites de pedido (D-1220, D-1221, CA-2262): uma linha por pedido, por chave ('rec-email:<resumo>', 'rec-ip:<resumo>',
-- 'link:<id>', 'conta:<id>'). Sem endereço de internet: a chave leva só o resumo. Apagadas em 2 dias.
create table if not exists public.limites_de_envio (
  id bigint generated always as identity primary key,
  chave text not null check (char_length(chave) between 1 and 200),
  quando timestamptz not null default now()
);
create index if not exists limites_de_envio_por_chave on public.limites_de_envio (chave, quando);
create index if not exists limites_de_envio_por_data on public.limites_de_envio (quando);

-- O estado dos avisos (D-1239, D-1240): a pausa automática e os tetos que a função leu na última chamada. Uma linha só.
create table if not exists public.estado_dos_avisos (
  id smallint primary key default 1 check (id = 1),
  pausado_em timestamptz,
  motivo text check (motivo is null or char_length(motivo) <= 200),
  teto_dia integer,
  teto_mes integer,
  atualizado_em timestamptz not null default now()
);
insert into public.estado_dos_avisos (id) values (1) on conflict (id) do nothing;


-- ---------- "Trocar o endereço" corta quem tinha o link (D-1246, D-1248, DP-LP-32, DP-LP-35) ----------

-- Depois de o token do link mudar: o resumo do token de antes fica guardado (CA-2289, CB-1231); os links antigos do
-- mesmo paciente na mesma conta, os que a migração fez apontar para este (em cadeia) e os do mesmo `paciente_id`,
-- ficam cortados; e o link volta ao e-mail da ficha (CA-2293): o e-mail que o paciente deu sai, as confirmações
-- abertas caem e os aceites de outro endereço se encerram. Roda como o dono das funções: o app não escreve o corte.
create or replace function public.trocar_o_endereco()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.token is not distinct from old.token then
    return null;
  end if;
  insert into public.tokens_trocados (token_hash, link_id) values (public.hash_do_token(old.token), new.id)
    on conflict (token_hash) do nothing;

  with recursive antigos (id) as (
    select a.id from public.acompanhamentos a
     where a.substituido_por = new.id and a.nutricionista_id = new.nutricionista_id
    union
    select a.id from public.acompanhamentos a
      join antigos on a.substituido_por = antigos.id
     where a.nutricionista_id = new.nutricionista_id
  )
  update public.acompanhamentos a
     set cortado_em = now()
   where a.cortado_em is null
     and a.id <> new.id
     and a.nutricionista_id = new.nutricionista_id
     and (a.id in (select antigos.id from antigos) or (new.paciente_id is not null and a.paciente_id = new.paciente_id));

  update public.emails_dos_links e
     set email = e.email_ficha,
         email_hash = case when e.email_ficha is null then null else public.hash_do_email(e.email_ficha) end,
         origem = case when e.email_ficha is null then null else 'ficha' end,
         confirmado_em = null,
         atualizado_em = now()
   where e.link_id = new.id and e.origem = 'paciente';
  update public.aceites x set saiu_em = now()
   where x.link_id = new.id and x.saiu_em is null
     and x.email_hash is distinct from (select e.email_hash from public.emails_dos_links e where e.link_id = new.id);
  delete from public.chaves_de_aviso k where k.link_id = new.id and k.tipo = 'aceite' and k.usado_em is null;
  return null;
end;
$$;

revoke all on function public.trocar_o_endereco() from public, anon, authenticated;

drop trigger if exists trocar_o_endereco on public.acompanhamentos;
create trigger trocar_o_endereco
  after update of token on public.acompanhamentos
  for each row execute function public.trocar_o_endereco();

-- D-1256 e CB-1232 (revisão de 10/11): a chave do aceite só nasce se o link ainda tem o endereço com que ela foi pedida.
-- O `for share` espera a troca que esteja no meio (o `update` do token segura a linha); depois dela, a releitura vê o
-- token novo e a chave é recusada. Se a chave grava antes, é a troca que espera, e a limpeza dela a apaga (D-1248). Assim
-- a confirmação pedida antes da troca nunca vale depois dela.
create or replace function public.conferir_chave_do_aceite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  if new.tipo <> 'aceite' then
    return new;
  end if;
  select a.token into v_token
    from public.acompanhamentos a
   where a.id = new.link_id and a.cortado_em is null
     for share;
  if v_token is null or new.token_hash is distinct from public.hash_do_token(v_token) then
    raise exception 'O endereço do link mudou.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.conferir_chave_do_aceite() from public, anon, authenticated;

drop trigger if exists conferir_chave_do_aceite on public.chaves_de_aviso;
create trigger conferir_chave_do_aceite
  before insert or update of token_hash, link_id, tipo on public.chaves_de_aviso
  for each row execute function public.conferir_chave_do_aceite();

-- D-1261 e CB-1232 (revisão r3, DP-LP-47): o "Confirmar" num passo só. O link vem antes da chave, como na troca e no
-- gatilho acima: a troca que esteja no meio segura o link, o "Confirmar" espera, relê o token novo e recusa; se o
-- "Confirmar" segura o link antes, é a troca que espera, e a limpeza dela devolve o link ao e-mail da ficha (D-1248).
-- Nada é gravado antes de a chave e o link conferirem. Responde 'confirmado', 'usada' (outro "Confirmar" da mesma chave
-- chegou antes) ou 'nao-vale'. Só a chave de serviço chama; os avisos chegam já filtrados pelo que a nutricionista oferece.
create or replace function public.confirmar_email_do_paciente(
  p_chave text,
  p_avisos text[],
  p_dia_da_semana smallint,
  p_ofertas_padrao boolean,
  p_agora timestamptz
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link_id uuid;
  v_token text;
  v_nutri uuid;
  v_email_do_link text;
  v_email_hash_do_link text;
  v_avisos text[] := coalesce(p_avisos, '{}'::text[]);
  k public.chaves_de_aviso%rowtype;
begin
  select c.link_id into v_link_id from public.chaves_de_aviso c where c.chave = p_chave and c.tipo = 'aceite';
  if v_link_id is null then
    return 'nao-vale';
  end if;
  select a.token, a.nutricionista_id into v_token, v_nutri
    from public.acompanhamentos a
   where a.id = v_link_id and a.cortado_em is null
     for share;
  if v_token is null then
    return 'nao-vale';
  end if;
  -- Relida depois de segurar o link: a troca que acabou de passar já a apagou.
  select * into k from public.chaves_de_aviso c where c.chave = p_chave for update;
  if not found or k.tipo <> 'aceite' or k.link_id is distinct from v_link_id or k.email_hash is null then
    return 'nao-vale';
  end if;
  if k.usado_em is not null then
    return 'usada';
  end if;
  if (k.vence_em is not null and k.vence_em < p_agora) or k.token_hash is distinct from public.hash_do_token(v_token) then
    return 'nao-vale';
  end if;

  if k.email is not null then
    -- D-1247: o e-mail digitado vai ao link. A linha nasce com as ofertas da conta; o mesmo endereço só ganha a data.
    insert into public.emails_dos_links (link_id, nutricionista_id, oferta_plano, oferta_semana, oferta_lembrete)
      values (v_link_id, v_nutri, p_ofertas_padrao, p_ofertas_padrao, p_ofertas_padrao)
      on conflict (link_id) do nothing;
    select e.email into v_email_do_link from public.emails_dos_links e where e.link_id = v_link_id for update;
    if v_email_do_link is not distinct from k.email then
      update public.emails_dos_links set confirmado_em = p_agora where link_id = v_link_id;
    else
      update public.emails_dos_links
         set email = k.email, email_hash = k.email_hash, origem = 'paciente', confirmado_em = p_agora, atualizado_em = now()
       where link_id = v_link_id;
    end if;
  else
    -- CA-2257: a chave do e-mail que o link já tem só vale enquanto ele for o do link.
    select e.email_hash into v_email_hash_do_link from public.emails_dos_links e where e.link_id = v_link_id for update;
    if v_email_hash_do_link is distinct from k.email_hash then
      return 'nao-vale';
    end if;
  end if;

  insert into public.aceites (link_id, nutricionista_id, tipo, email_hash, aceito_em, dia_da_semana)
    select distinct v_link_id, v_nutri, t, k.email_hash, p_agora, p_dia_da_semana from unnest(v_avisos) as t
    on conflict (link_id, tipo, email_hash) where saiu_em is null do nothing;
  if cardinality(v_avisos) > 0 then
    -- Quem confirma os avisos volta a querer e-mail deste plano.
    update public.emails_dos_links set parou_tudo_em = null, atualizado_em = now() where link_id = v_link_id and parou_tudo_em is not null;
    if k.email is null then
      update public.emails_dos_links set confirmado_em = p_agora where link_id = v_link_id;
    end if;
  end if;
  update public.chaves_de_aviso set usado_em = p_agora, desfazer = null where chave = p_chave;
  return 'confirmado';
end;
$$;

revoke all on function public.confirmar_email_do_paciente(text, text[], smallint, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.confirmar_email_do_paciente(text, text[], smallint, boolean, timestamptz) to service_role;


-- ---------- Quem lê e quem escreve as tabelas novas ----------

alter table public.config_de_emails enable row level security;
alter table public.emails_dos_links enable row level security;
alter table public.aceites enable row level security;
alter table public.chaves_de_aviso enable row level security;
alter table public.envios enable row level security;
alter table public.supressao enable row level security;
alter table public.limites_de_envio enable row level security;
alter table public.estado_dos_avisos enable row level security;

-- Quem não tem conta nem chega a pedir, e a conta comum só tem o que está abaixo.
revoke all on public.config_de_emails from anon, authenticated;
revoke all on public.emails_dos_links from anon, authenticated;
revoke all on public.aceites from anon, authenticated;
revoke all on public.chaves_de_aviso from anon, authenticated;
revoke all on public.envios from anon, authenticated;
revoke all on public.supressao from anon, authenticated;
revoke all on public.limites_de_envio from anon, authenticated;
revoke all on public.estado_dos_avisos from anon, authenticated;

-- A configuração: a nutricionista lê e grava só a própria linha.
grant select, insert, update, delete on public.config_de_emails to authenticated;
drop policy if exists "dono le" on public.config_de_emails;
create policy "dono le" on public.config_de_emails
  for select to authenticated using (auth.uid() = nutricionista_id);
drop policy if exists "dono escreve" on public.config_de_emails;
create policy "dono escreve" on public.config_de_emails
  for insert to authenticated with check (auth.uid() = nutricionista_id);
drop policy if exists "dono atualiza" on public.config_de_emails;
create policy "dono atualiza" on public.config_de_emails
  for update to authenticated using (auth.uid() = nutricionista_id) with check (auth.uid() = nutricionista_id);
drop policy if exists "dono apaga" on public.config_de_emails;
create policy "dono apaga" on public.config_de_emails
  for delete to authenticated using (auth.uid() = nutricionista_id);

-- O e-mail do link, os aceites e os envios: a nutricionista só lê os dela; quem escreve são as funções.
grant select on public.emails_dos_links to authenticated;
drop policy if exists "dono le" on public.emails_dos_links;
create policy "dono le" on public.emails_dos_links
  for select to authenticated using (auth.uid() = nutricionista_id);

grant select on public.aceites to authenticated;
drop policy if exists "dono le" on public.aceites;
create policy "dono le" on public.aceites
  for select to authenticated using (auth.uid() = nutricionista_id);

grant select on public.envios to authenticated;
drop policy if exists "dono le" on public.envios;
create policy "dono le" on public.envios
  for select to authenticated using (auth.uid() = nutricionista_id);

-- As chaves, a supressão, os limites e o estado: nenhuma política. Só a chave de serviço (que passa por cima do RLS).


-- ---------- As contas que o banco faz com o endereço ----------

-- DP-LP-16: o resumo do endereço normalizado (sem espaço, minúsculo), em SHA-256 hexadecimal. É a mesma conta de
-- `hashDoEmail`, em supabase/functions/_shared/avisos/email.ts.
create or replace function public.hash_do_email(p_email text)
returns text
language sql
immutable
set search_path = public
as $$
  select encode(sha256(convert_to(lower(regexp_replace(coalesce(p_email, ''), '\s', '', 'g')), 'UTF8')), 'hex');
$$;

-- D-1221 e CA-2235: "j•••a@gmail.com". A primeira e a última letra antes do @ (com uma ou duas letras, só a primeira),
-- como `mascararEmail` do app. Sem e-mail, nulo.
create or replace function public.mascarar_email(p_email text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
           when p_email is null or p_email !~ '^[^@]+@[^@]+$' then null
           else left(split_part(p_email, '@', 1), 1) || '•••'
                || case when char_length(split_part(p_email, '@', 1)) > 2 then right(split_part(p_email, '@', 1), 1) else '' end
                || '@' || split_part(p_email, '@', 2)
         end;
$$;

-- CA-2242 e CA-2256: cada aviso do link, para o paciente. Ligado: a nutricionista oferece, há aceite ativo para o
-- endereço de agora, o paciente não parou tudo e o endereço não está na supressão. Desligado: oferecido e não ligado.
-- Sem linha de e-mail, vale a oferta padrão da conta e nada está ligado.
create or replace function public.avisos_do_link(p_link uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with e as (
    select l.email_hash, l.parou_tudo_em, l.oferta_plano, l.oferta_semana, l.oferta_lembrete
      from public.emails_dos_links l
     where l.link_id = p_link
  ),
  padrao as (
    select coalesce((
      select c.oferecer_aos_novos
        from public.config_de_emails c
        join public.acompanhamentos a on a.nutricionista_id = c.nutricionista_id
       where a.id = p_link
    ), true) as oferece
  ),
  t (tipo) as (values ('plano'), ('semana'), ('lembrete'))
  select jsonb_object_agg(
           t.tipo,
           case
             when not coalesce(case t.tipo when 'plano' then e.oferta_plano when 'semana' then e.oferta_semana else e.oferta_lembrete end, (select oferece from padrao))
               then 'nao-oferecido'
             when e.email_hash is not null
                  and e.parou_tudo_em is null
                  and not exists (select 1 from public.supressao s where s.email_hash = e.email_hash)
                  and exists (
                    select 1 from public.aceites x
                     where x.link_id = p_link and x.tipo = t.tipo and x.email_hash = e.email_hash and x.saiu_em is null
                  )
               then 'ligado'
             else 'desligado'
           end
         )
    from t
    left join e on true;
$$;

revoke all on function public.hash_do_email(text) from public, anon, authenticated;
revoke all on function public.mascarar_email(text) from public, anon, authenticated;
revoke all on function public.avisos_do_link(uuid) from public, anon, authenticated;
grant execute on function public.hash_do_email(text) to service_role;
grant execute on function public.mascarar_email(text) to service_role;
grant execute on function public.avisos_do_link(uuid) to service_role;


-- ---------- A porta do paciente (D-1210, D-1213, D-1217, CA-2212, CA-2235, CA-2256) ----------

-- A mesma função do 015, com as colunas novas no fim. O token antigo de um paciente abre o link fixo dele (DP-LP-5): o
-- `token` devolvido é o do fixo, e a tela troca o endereço. O token cortado pela troca do endereço não abre nada
-- (D-1246): ele nunca chega ao token novo. O nome da nutricionista vem do Perfil publicado ou da conta
-- (DP-LP-8); o e-mail, só mascarado. O dono do link nunca sai na resposta (CA-1974). Tem que derrubar antes: o Postgres
-- não deixa `create or replace` mudar o tipo de retorno de uma função que já existe.
drop function if exists public.missoes_por_token(text);

create function public.missoes_por_token(p_token text)
returns table (
  id uuid,
  token text,
  caso_id text,
  paciente_id text,
  nome text,
  criado_em timestamptz,
  missoes jsonb,
  marcacoes jsonb,
  uso_nao_comercial boolean,
  dieta jsonb,
  marca_logo text,
  marca_cor text,
  mensagem text,
  mensagem_em timestamptz,
  proxima_consulta text,
  ultimo_acesso date,
  substituido_por uuid,
  plano_em timestamptz,
  nutricionista text,
  email_mascarado text,
  avisos jsonb
)
language sql
security definer
set search_path = public
as $$
  with pedido as (
    select p.id, p.substituido_por, p.nutricionista_id
      from public.acompanhamentos p
     where p.token = p_token and p.cortado_em is null
     limit 1
  ),
  alvo as (
    select coalesce(f.id, pedido.id) as id
      from pedido
      left join public.acompanhamentos f on f.id = pedido.substituido_por and f.nutricionista_id = pedido.nutricionista_id and f.cortado_em is null
  )
  select a.id, a.token, a.caso_id, a.paciente_id, a.nome, a.criado_em, a.missoes, a.marcacoes, a.uso_nao_comercial, a.dieta,
         m.logo, m.cor,
         a.mensagem, a.mensagem_em, a.proxima_consulta, a.ultimo_acesso, a.substituido_por, a.plano_em,
         coalesce(nullif(btrim(c.nome), ''), nullif(btrim(pf.nome), '')),
         public.mascarar_email(e.email),
         public.avisos_do_link(a.id)
    from alvo
    join public.acompanhamentos a on a.id = alvo.id
    left join public.marcas m on m.nutricionista_id = a.nutricionista_id
    left join public.config_de_emails c on c.nutricionista_id = a.nutricionista_id
    left join public.perfis pf on pf.id = a.nutricionista_id
    left join public.emails_dos_links e on e.link_id = a.id
   limit 1;
$$;

-- Quem pode chamar: `anon` é o paciente, sem conta; `authenticated`, o nutricionista testando o link.
revoke all on function public.missoes_por_token(text) from public;
grant execute on function public.missoes_por_token(text) to anon, authenticated;

-- D-1223 e CA-2239: o link registra o dia (de Brasília) em que foi aberto, só a data, uma vez por dia. O token antigo
-- registra no fixo; o cortado pela troca do endereço não registra nada (CA-2289).
create or replace function public.registrar_acesso(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_link uuid;
begin
  select coalesce(f.id, p.id) into v_link
    from public.acompanhamentos p
    left join public.acompanhamentos f on f.id = p.substituido_por and f.nutricionista_id = p.nutricionista_id and f.cortado_em is null
   where p.token = p_token and p.cortado_em is null
   limit 1;
  if v_link is null then
    return;
  end if;
  update public.acompanhamentos set ultimo_acesso = v_hoje where id = v_link and ultimo_acesso is distinct from v_hoje;
end;
$$;

-- CA-2256: o paciente desliga um aviso no próprio link, na hora (ligar manda o S3, pela função `meu-link`). O token
-- cortado pela troca do endereço não mexe em nada (CA-2289).
create or replace function public.desligar_aviso(p_token text, p_tipo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link uuid;
begin
  if p_tipo is null or p_tipo not in ('plano', 'semana', 'lembrete') then
    raise exception 'Aviso desconhecido.' using errcode = '22023';
  end if;
  select coalesce(f.id, p.id) into v_link
    from public.acompanhamentos p
    left join public.acompanhamentos f on f.id = p.substituido_por and f.nutricionista_id = p.nutricionista_id and f.cortado_em is null
   where p.token = p_token and p.cortado_em is null
   limit 1;
  if v_link is null then
    return;
  end if;
  update public.aceites set saiu_em = now() where link_id = v_link and tipo = p_tipo and saiu_em is null;
end;
$$;

-- A marcação do paciente (a do 010, CA-426), com o corte: o token cortado pela troca do endereço não grava nada
-- (CA-2289). Sem erro: a tela dele já mostra "Este link foi trocado.".
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

  if pg_column_size(p_marcacoes) > 1048576 or jsonb_array_length(p_marcacoes) > 1500 then
    raise exception 'Este link já guarda marcações demais.' using errcode = '22023';
  end if;

  update public.acompanhamentos
  set marcacoes = p_marcacoes, atualizado_em = now()
  where token = p_token and cortado_em is null;
end;
$$;

revoke all on function public.registrar_acesso(text) from public;
revoke all on function public.desligar_aviso(text, text) from public;
revoke all on function public.marcar_missoes(text, jsonb) from public;
grant execute on function public.registrar_acesso(text) to anon, authenticated;
grant execute on function public.desligar_aviso(text, text) to anon, authenticated;
grant execute on function public.marcar_missoes(text, jsonb) to anon, authenticated;


-- ---------- A nutricionista: o e-mail do link e as ofertas (D-1227, DP-LP-7) ----------

-- O dono do link, ou o erro de permissão. Usada pelas funções da nutricionista abaixo.
create or replace function public.dono_do_link(p_link uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_dono uuid;
begin
  select a.nutricionista_id into v_dono from public.acompanhamentos a where a.id = p_link;
  if v_dono is null or v_dono is distinct from auth.uid() then
    raise exception 'Este link não é seu.' using errcode = '42501';
  end if;
  return v_dono;
end;
$$;

revoke all on function public.dono_do_link(uuid) from public, anon, authenticated;

-- DP-LP-7: o app publica o e-mail da ficha quando ele difere do último publicado. Vale o mais recente: a ficha nova troca
-- o endereço do link (e o aceite do endereço antigo deixa de valer, CA-2257); a ficha que não mudou não desfaz o
-- endereço que o paciente deu no link. Vazio apaga o da ficha (e o do link, se era o da ficha).
create or replace function public.definir_email_da_ficha(p_link uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dono uuid := public.dono_do_link(p_link);
  v_email text := nullif(lower(regexp_replace(coalesce(p_email, ''), '\s', '', 'g')), '');
  v_oferece boolean;
  v_atual public.emails_dos_links%rowtype;
begin
  if v_email is not null and (char_length(v_email) > 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:].]+(\.[^@[:space:].]+)+$') then
    raise exception 'Confira o e-mail.' using errcode = '22023';
  end if;
  select coalesce((select c.oferecer_aos_novos from public.config_de_emails c where c.nutricionista_id = v_dono), true) into v_oferece;
  insert into public.emails_dos_links (link_id, nutricionista_id, oferta_plano, oferta_semana, oferta_lembrete)
  values (p_link, v_dono, v_oferece, v_oferece, v_oferece)
  on conflict (link_id) do nothing;

  select * into v_atual from public.emails_dos_links where link_id = p_link for update;
  if v_atual.email_ficha is not distinct from v_email then
    return;
  end if;

  if v_email is not null then
    update public.emails_dos_links
       set email_ficha = v_email, email = v_email, email_hash = public.hash_do_email(v_email), origem = 'ficha', confirmado_em = null, atualizado_em = now()
     where link_id = p_link;
  elsif v_atual.origem = 'ficha' then
    update public.emails_dos_links
       set email_ficha = null, email = null, email_hash = null, origem = null, confirmado_em = null, atualizado_em = now()
     where link_id = p_link;
  else
    update public.emails_dos_links set email_ficha = null, atualizado_em = now() where link_id = p_link;
  end if;
end;
$$;

-- D-1227 e CA-2263: os interruptores da nutricionista. Desligar vale na hora; ligar só oferece.
create or replace function public.definir_ofertas(p_link uuid, p_plano boolean, p_semana boolean, p_lembrete boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dono uuid := public.dono_do_link(p_link);
begin
  insert into public.emails_dos_links (link_id, nutricionista_id, oferta_plano, oferta_semana, oferta_lembrete)
  values (p_link, v_dono, coalesce(p_plano, true), coalesce(p_semana, true), coalesce(p_lembrete, true))
  on conflict (link_id) do update
     set oferta_plano = coalesce(p_plano, emails_dos_links.oferta_plano),
         oferta_semana = coalesce(p_semana, emails_dos_links.oferta_semana),
         oferta_lembrete = coalesce(p_lembrete, emails_dos_links.oferta_lembrete),
         atualizado_em = now();
end;
$$;

-- CA-2260 a CA-2265: tudo o que a ficha mostra dos e-mails de um link, numa leitura. Os aceites e os pedidos pendentes
-- são os do endereço de agora; os envios, dos últimos 30 dias, do mais novo para o mais antigo.
create or replace function public.emails_do_link(p_link uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_dono uuid := public.dono_do_link(p_link);
  v_oferece boolean;
  v_resposta jsonb;
begin
  select coalesce((select c.oferecer_aos_novos from public.config_de_emails c where c.nutricionista_id = v_dono), true) into v_oferece;
  select jsonb_build_object(
           'email', e.email,
           -- D-1248: o diálogo de troca mostra o e-mail da ficha (o S4 só vai para ele).
           'email_ficha', e.email_ficha,
           'origem', e.origem,
           'confirmado_em', e.confirmado_em,
           'ofertas', jsonb_build_object(
             'plano', coalesce(e.oferta_plano, v_oferece),
             'semana', coalesce(e.oferta_semana, v_oferece),
             'lembrete', coalesce(e.oferta_lembrete, v_oferece)
           ),
           'aceites', coalesce((
             select jsonb_agg(jsonb_build_object('tipo', x.tipo, 'aceito_em', x.aceito_em, 'saiu_em', x.saiu_em, 'pausado_em', x.pausado_em) order by x.aceito_em desc)
               from public.aceites x
              where x.link_id = p_link and x.email_hash = e.email_hash
           ), '[]'::jsonb),
           'pendentes', coalesce((
             select jsonb_agg(distinct t.aviso)
               from public.chaves_de_aviso k
               cross join lateral unnest(k.avisos) as t (aviso)
              where k.link_id = p_link and k.tipo = 'aceite' and k.usado_em is null and (k.vence_em is null or k.vence_em > now())
                and k.email_hash = e.email_hash and t.aviso in ('plano', 'semana', 'lembrete')
           ), '[]'::jsonb),
           'supressao', (select s.motivo from public.supressao s where s.email_hash = e.email_hash),
           'parou_tudo_em', e.parou_tudo_em,
           'convite_em', e.convite_em,
           'a1_para', a.a1_para,
           'envios', coalesce((
             select jsonb_agg(jsonb_build_object('criado_em', v.criado_em, 'tipo', v.tipo, 'assunto', v.assunto, 'estado', v.estado) order by v.criado_em desc)
               from public.envios v
              where v.link_id = p_link and v.criado_em > now() - interval '30 days'
           ), '[]'::jsonb)
         )
    into v_resposta
    from public.acompanhamentos a
    left join public.emails_dos_links e on e.link_id = a.id
   where a.id = p_link;
  return v_resposta;
end;
$$;

-- CA-2269: os links da conta com algum aviso ligado (o envelope da Adesão).
create or replace function public.avisos_aceitos_da_conta()
returns table (link_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select a.id
    from public.acompanhamentos a
   where a.nutricionista_id = auth.uid()
     and a.substituido_por is null
     and exists (select 1 from jsonb_each_text(public.avisos_do_link(a.id)) v where v.value = 'ligado');
$$;

-- DP-LP-26 e CA-2284: excluir o paciente apaga o e-mail, os aceites, as chaves e os envios do link, antes de o link sair.
-- A supressão fica. D-1264 (revisão r4, DP-LP-50): o link vem primeiro, como na troca e no "Confirmar"; o "Confirmar"
-- que chegar no meio espera e, sem a chave, responde 'nao-vale'. Sem isso, os dois esperavam um pelo outro (deadlock).
create or replace function public.apagar_emails_do_link(p_link uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dono uuid := public.dono_do_link(p_link);
begin
  perform 1 from public.acompanhamentos where id = p_link for update;
  delete from public.aceites where link_id = p_link and nutricionista_id = v_dono;
  delete from public.envios where link_id = p_link and nutricionista_id = v_dono;
  delete from public.chaves_de_aviso where link_id = p_link and nutricionista_id = v_dono;
  delete from public.emails_dos_links where link_id = p_link and nutricionista_id = v_dono;
end;
$$;

revoke all on function public.definir_email_da_ficha(uuid, text) from public, anon;
revoke all on function public.definir_ofertas(uuid, boolean, boolean, boolean) from public, anon;
revoke all on function public.emails_do_link(uuid) from public, anon;
revoke all on function public.avisos_aceitos_da_conta() from public, anon;
revoke all on function public.apagar_emails_do_link(uuid) from public, anon;
grant execute on function public.definir_email_da_ficha(uuid, text) to authenticated;
grant execute on function public.definir_ofertas(uuid, boolean, boolean, boolean) to authenticated;
grant execute on function public.emails_do_link(uuid) to authenticated;
grant execute on function public.avisos_aceitos_da_conta() to authenticated;
grant execute on function public.apagar_emails_do_link(uuid) to authenticated;


-- ---------- O Painel do dono: "E-mails" (D-1240, CA-2281) ----------

-- Enviados hoje e no mês (o dia e o mês do Resend, em UTC: DP-LP-11), adiados, devolução e queixa nos últimos 7 dias
-- (em porcentagem dos enviados), os tetos que a função leu e o estado. Só o administrador.
create or replace function public.painel_emails()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_enviados7 integer;
  v_resposta jsonb;
begin
  if not public.eh_admin() then
    raise exception 'Só o administrador vê o painel.' using errcode = '42501';
  end if;
  select count(*) into v_enviados7
    from public.envios
   where conta_no_teto and estado in ('enviado', 'entregue', 'devolvido', 'devolucao-temporaria', 'queixa')
     and criado_em > now() - interval '7 days';
  select jsonb_build_object(
           'hoje', (select count(*) from public.envios
                     where conta_no_teto and estado in ('enviado', 'entregue', 'devolvido', 'devolucao-temporaria', 'queixa')
                       and criado_em >= date_trunc('day', now(), 'UTC')),
           'mes', (select count(*) from public.envios
                    where conta_no_teto and estado in ('enviado', 'entregue', 'devolvido', 'devolucao-temporaria', 'queixa')
                      and criado_em >= date_trunc('month', now(), 'UTC')),
           'adiados_7d', (select count(*) from public.envios where estado = 'adiado' and criado_em > now() - interval '7 days'),
           'envios_7d', v_enviados7,
           'devolucao_7d', case when v_enviados7 = 0 then 0 else round(100.0 * (
             select count(*) from public.envios where estado = 'devolvido' and criado_em > now() - interval '7 days') / v_enviados7, 2) end,
           'queixa_7d', case when v_enviados7 = 0 then 0 else round(100.0 * (
             select count(*) from public.envios where estado = 'queixa' and criado_em > now() - interval '7 days') / v_enviados7, 2) end,
           'teto_dia', s.teto_dia,
           'teto_mes', s.teto_mes,
           'pausado_em', s.pausado_em,
           'motivo', s.motivo
         )
    into v_resposta
    from public.estado_dos_avisos s
   where s.id = 1;
  return v_resposta;
end;
$$;

-- D-1240: "Retomar" tira a pausa automática.
create or replace function public.retomar_avisos()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then
    raise exception 'Só o administrador retoma os avisos.' using errcode = '42501';
  end if;
  update public.estado_dos_avisos set pausado_em = null, motivo = null, atualizado_em = now() where id = 1;
end;
$$;

revoke all on function public.painel_emails() from public, anon;
revoke all on function public.retomar_avisos() from public, anon;
grant execute on function public.painel_emails() to authenticated;
grant execute on function public.retomar_avisos() to authenticated;


-- ---------- O servidor: limites, a chave dos avisos e a limpeza ----------

-- Conta e anota num passo só (como `anotar_chamada_da_cobranca`, do 011): dois pedidos ao mesmo tempo não passam juntos
-- do limite. Verdadeiro: anotou; falso: já havia p_limite pedidos com esta chave depois de p_desde. O limite e a janela
-- vêm das funções (supabase/functions/_shared/avisos/).
create or replace function public.anotar_limite(p_chave text, p_limite integer, p_desde timestamptz)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_pedidos integer;
begin
  perform pg_advisory_xact_lock(hashtext('limite:' || p_chave));
  select count(*) into v_pedidos from public.limites_de_envio where chave = p_chave and quando > p_desde;
  if v_pedidos >= p_limite then
    return false;
  end if;
  insert into public.limites_de_envio (chave) values (p_chave);
  return true;
end;
$$;

-- A chave que o agendamento manda e a função `avisos` confere (como a da limpeza, no 014). Nasce aqui, aleatória, e fica
-- só no cofre do Supabase. Rodar o arquivo de novo não a troca.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'metanutri_chave_dos_avisos') then
    perform vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'metanutri_chave_dos_avisos',
      'Chave que o agendamento manda para a função avisos (spec lado-do-paciente, D-1236).');
  end if;
end;
$$;

create or replace function public.conferir_chave_dos_avisos(p_chave text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(length(p_chave), 0) >= 32
     and exists (select 1 from vault.decrypted_secrets s where s.name = 'metanutri_chave_dos_avisos' and s.decrypted_secret = p_chave);
$$;

-- CA-2285 e D-1243: o que venceu sai uma vez por dia. Os envios com mais de 6 meses; as chaves de aceite vencidas; os
-- limites com mais de 2 dias; os aceites sem link (o link saiu) encerrados há mais de 6 meses. A supressão fica.
-- `p_agora` só muda nos testes do Supabase local.
create or replace function public.limpar_emails_antigos(p_agora timestamptz default now())
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.envios where criado_em < p_agora - interval '6 months';
  delete from public.chaves_de_aviso where tipo = 'aceite' and vence_em < p_agora;
  delete from public.limites_de_envio where quando < p_agora - interval '2 days';
  delete from public.aceites where link_id is null and saiu_em < p_agora - interval '6 months';
end;
$$;

-- D-1247 e CA-2292: o pedido do paciente que não saiu (o Resend fora ou o teto) não conta nos 3 do dia. Tira a anotação
-- mais nova da chave.
create or replace function public.devolver_limite(p_chave text)
returns void
language plpgsql
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('limite:' || p_chave));
  delete from public.limites_de_envio
   where id = (select max(l.id) from public.limites_de_envio l where l.chave = p_chave);
end;
$$;

revoke all on function public.anotar_limite(text, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.devolver_limite(text) from public, anon, authenticated;
revoke all on function public.conferir_chave_dos_avisos(text) from public, anon, authenticated;
revoke all on function public.limpar_emails_antigos(timestamptz) from public, anon, authenticated;
grant execute on function public.anotar_limite(text, integer, timestamptz) to service_role;
grant execute on function public.devolver_limite(text) to service_role;
grant execute on function public.conferir_chave_dos_avisos(text) to service_role;
grant execute on function public.limpar_emails_antigos(timestamptz) to service_role;

-- O pedido à função `avisos` (D-1236, DP-LP-10). O endereço do projeto fica no cofre (o mesmo do 014); sem ele, nada
-- sai e nada dá erro. `p_vez`: 'n1' (segunda 7h), 'manha' (8h), 'tarde' (18h) ou 'a1' (o A1 vencido).
create or replace function public.pedir_avisos(p_vez text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_chave text;
begin
  if p_vez is null or p_vez not in ('n1', 'manha', 'tarde', 'a1') then
    return null;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'metanutri_url_do_projeto';
  select decrypted_secret into v_chave from vault.decrypted_secrets where name = 'metanutri_chave_dos_avisos';
  if coalesce(v_url, '') = '' or coalesce(v_chave, '') = '' then
    return null;
  end if;
  return net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/avisos',
    body := jsonb_build_object('vez', p_vez),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-chave-dos-avisos', v_chave),
    timeout_milliseconds := 120000
  );
end;
$$;

-- Só o agendamento chama, como o dono das funções (postgres).
revoke all on function public.pedir_avisos(text) from public, anon, authenticated, service_role;


-- ---------- O agendamento (D-1236, DP-LP-10, CA-2270, CB-1215) ----------

-- R-62: as duas extensões do Supabase (o 014 já as liga). Se o SQL Editor recusar, ligue pg_cron e pg_net em
-- Database > Extensions e rode o arquivo de novo.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Em UTC; Brasília não tem horário de verão desde 2019 (CB-1215). Pelo nome: rodar de novo só atualiza.
-- Segunda 7h (N1); todo dia 8h (A1 da noite, A2) e 18h (A3, A4); a cada 15 minutos das 8h às 20h45 (A1 vencido).
select cron.schedule('metanutri-avisos-n1', '0 10 * * 1', 'select public.pedir_avisos(''n1'');');
select cron.schedule('metanutri-avisos-manha', '0 11 * * *', 'select public.pedir_avisos(''manha'');');
select cron.schedule('metanutri-avisos-tarde', '0 21 * * *', 'select public.pedir_avisos(''tarde'');');
select cron.schedule('metanutri-avisos-a1', '*/15 11-23 * * *', 'select public.pedir_avisos(''a1'');');
-- Todo dia às 6h30 UTC (3h30 em Brasília), depois das outras limpezas.
select cron.schedule('metanutri-limpar-emails', '30 6 * * *', 'select public.limpar_emails_antigos();');


-- A API do banco passa a conhecer as tabelas, as colunas e as funções novas na hora (o aviso sai quando a transação fecha).
notify pgrst, 'reload schema';

commit;


-- Conferência depois de rodar (copie para uma consulta nova):
-- select column_name from information_schema.columns where table_schema = 'public' and table_name = 'acompanhamentos'
--    and column_name in ('mensagem', 'mensagem_em', 'proxima_consulta', 'ultimo_acesso', 'substituido_por', 'plano_em', 'a1_para', 'cortado_em') order by 1;
-- -- oito linhas
-- select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relname in
--    ('config_de_emails', 'emails_dos_links', 'aceites', 'chaves_de_aviso', 'envios', 'supressao', 'limites_de_envio', 'estado_dos_avisos', 'tokens_trocados') order by 1;
-- -- nove linhas, todas true
-- select tgname from pg_trigger where tgrelid = 'public.acompanhamentos'::regclass and tgname in ('cuidar_do_link', 'trocar_o_endereco') order by 1;
-- -- duas linhas (D-1246: a troca do endereço corta os endereços antigos)
-- select tgname from pg_trigger where tgrelid = 'public.chaves_de_aviso'::regclass and tgname = 'conferir_chave_do_aceite';
-- -- uma linha (D-1256: a confirmação só nasce com o endereço de agora do link)
-- select has_function_privilege('anon', 'public.confirmar_email_do_paciente(text, text[], smallint, boolean, timestamptz)', 'execute') as anon_confirma,
--        has_function_privilege('service_role', 'public.confirmar_email_do_paciente(text, text[], smallint, boolean, timestamptz)', 'execute') as servico_confirma;
-- -- false, true (D-1261: o "Confirmar" num passo só do banco)
-- select has_table_privilege('anon', 'public.envios', 'select') as anon_le, has_table_privilege('authenticated', 'public.supressao', 'select') as logado_le_supressao;
-- -- false, false
-- select pg_get_function_result('public.missoes_por_token(text)'::regprocedure);
-- -- termina em "plano_em timestamp with time zone, nutricionista text, email_mascarado text, avisos jsonb)"
-- select jobname, schedule, command from cron.job where jobname like 'metanutri-avisos%' or jobname = 'metanutri-limpar-emails' order by 1;
-- -- cinco linhas: a1 (*/15 11-23 * * *), manha (0 11 * * *), n1 (0 10 * * 1), tarde (0 21 * * *) e limpar-emails (30 6 * * *)
-- select name from vault.secrets where name in ('metanutri_chave_dos_avisos', 'metanutri_url_do_projeto') order by name;
-- -- duas linhas (o endereço do projeto o 014 já pediu para gravar)
-- select count(*) as links_substituidos from public.acompanhamentos where substituido_por is not null;
-- -- quantos links antigos passaram a abrir o fixo do paciente (D-1217)
-- select public.hash_do_email(' Teste@Exemplo.com ') = encode(sha256(convert_to('teste@exemplo.com', 'UTF8')), 'hex') as hash_confere;
-- -- true
-- Depois de um dia, o agendamento sem erro (status succeeded):
-- select j.jobname, d.status, d.start_time from cron.job_run_details d join cron.job j using (jobid)
--  where j.jobname like 'metanutri-avisos%' order by d.start_time desc limit 10;
