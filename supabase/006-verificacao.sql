-- MetaNutri — situação da conta, pedidos de estudante, comprovantes e administradores
-- (spec conta-e-verificacao). Rode DEPOIS do 005-estudante.sql, que cria a função
-- eh_email_de_faculdade usada aqui.
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Pode rodar de novo sem estragar nada.
--
-- A regra que atravessa o arquivo: o navegador só LÊ as próprias linhas. Toda escrita
-- passa por uma função "security definer" que confere quem pede e o que pede. Sem
-- isso, qualquer conta se diria nutricionista ou se aprovaria como estudante editando
-- uma requisição (spec, D-40 e CA-297).

-- O app já lê esta coluna (validade do plano Estudante); era o 005 antigo que a criava.
alter table public.assinaturas add column if not exists expira_em timestamptz;

-- ---------- Administradores ----------

create table if not exists public.administradores (
  usuario uuid primary key references auth.users (id) on delete cascade
);
-- Ninguém lê nem escreve pelo navegador: o administrador é cadastrado à mão (linha no fim).
alter table public.administradores enable row level security;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.administradores where usuario = auth.uid());
$$;

-- ---------- Perfil: situação e CRN ----------

create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  situacao text not null check (situacao in ('estudante', 'nutricionista')),
  crn_regiao smallint check (crn_regiao between 1 and 11),
  crn_numero text check (crn_numero ~ '^[0-9]{1,7}P?$'),
  crn_status text check (crn_status in ('em_conferencia', 'conferido', 'nao_encontrado')),
  crn_declarado_em timestamptz,
  crn_decidido_em timestamptz,
  criado_em timestamptz not null default now(),
  -- Nutricionista sempre tem CRN; estudante nunca tem.
  constraint perfis_crn_conforme_situacao check (
    (situacao = 'nutricionista' and crn_regiao is not null and crn_numero is not null and crn_status is not null and crn_declarado_em is not null)
    or (situacao = 'estudante' and crn_regiao is null and crn_numero is null and crn_status is null)
  )
);
alter table public.perfis enable row level security;

drop policy if exists "dono ou admin le o perfil" on public.perfis;
create policy "dono ou admin le o perfil" on public.perfis
  for select to authenticated using (auth.uid() = id or public.eh_admin());
-- Sem política de escrita, de propósito: só as funções abaixo escrevem.

create or replace function public.crn_valido(p_regiao integer, p_numero text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_regiao between 1 and 11, false) and coalesce(upper(trim(p_numero)), '') ~ '^[0-9]{1,7}P?$';
$$;

-- O cadastro grava a situação nos metadados; o gatilho cria o perfil no servidor.
-- Metadado inválido não derruba o cadastro: a conta fica sem perfil e o app pede
-- para completar (CB-68). É o caso da conta criada pelo painel do Supabase.
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_situacao text := m ->> 'situacao';
  v_nome text := left(coalesce(trim(m ->> 'nome'), ''), 120);
  v_regiao integer;
begin
  if v_situacao = 'estudante' then
    insert into public.perfis (id, nome, situacao) values (new.id, v_nome, 'estudante') on conflict (id) do nothing;
  elsif v_situacao = 'nutricionista' then
    begin
      v_regiao := (m ->> 'crn_regiao')::integer;
    exception when others then
      v_regiao := null;
    end;
    if public.crn_valido(v_regiao, m ->> 'crn_numero') then
      insert into public.perfis (id, nome, situacao, crn_regiao, crn_numero, crn_status, crn_declarado_em)
      values (new.id, v_nome, 'nutricionista', v_regiao, upper(trim(m ->> 'crn_numero')), 'em_conferencia', now())
      on conflict (id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists criar_perfil_ao_cadastrar on auth.users;
create trigger criar_perfil_ao_cadastrar
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- CB-68: conta sem perfil informa a situação uma vez. Depois disso, só "Me formei".
create or replace function public.informar_situacao(p_situacao text, p_regiao integer, p_numero text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  if exists (select 1 from public.perfis where id = auth.uid()) then
    raise exception 'Sua situação já está registrada. Para mudar, use "Me formei" ou fale com a gente.' using errcode = 'P0001';
  end if;
  select left(coalesce(trim(raw_user_meta_data ->> 'nome'), ''), 120) into v_nome from auth.users where id = auth.uid();
  if p_situacao = 'estudante' then
    insert into public.perfis (id, nome, situacao) values (auth.uid(), coalesce(v_nome, ''), 'estudante');
  elsif p_situacao = 'nutricionista' and public.crn_valido(p_regiao, p_numero) then
    insert into public.perfis (id, nome, situacao, crn_regiao, crn_numero, crn_status, crn_declarado_em)
    values (auth.uid(), coalesce(v_nome, ''), 'nutricionista', p_regiao, upper(trim(p_numero)), 'em_conferencia', now());
  else
    raise exception 'Confira a situação e o CRN.' using errcode = '22023';
  end if;
end;
$$;

-- CA-287: estudante vira nutricionista com o CRN em conferência, e o plano Estudante acaba.
create or replace function public.me_formei(p_regiao integer, p_numero text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  if not public.crn_valido(p_regiao, p_numero) then
    raise exception 'Confira o CRN: região de 1 a 11 e número só com algarismos.' using errcode = '22023';
  end if;
  update public.perfis
     set situacao = 'nutricionista', crn_regiao = p_regiao, crn_numero = upper(trim(p_numero)),
         crn_status = 'em_conferencia', crn_declarado_em = now(), crn_decidido_em = null
   where id = auth.uid() and situacao = 'estudante';
  if not found then raise exception 'Só conta de estudante pode informar a formatura.' using errcode = 'P0001'; end if;
  -- Assinatura paga (com preapproval) continua (CB-64).
  delete from public.assinaturas where nutricionista_id = auth.uid() and plano = 'estudante' and preapproval_id is null;
end;
$$;

-- CA-289: CRN corrigido volta para "em conferência".
create or replace function public.corrigir_crn(p_regiao integer, p_numero text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  if not public.crn_valido(p_regiao, p_numero) then
    raise exception 'Confira o CRN: região de 1 a 11 e número só com algarismos.' using errcode = '22023';
  end if;
  update public.perfis
     set crn_regiao = p_regiao, crn_numero = upper(trim(p_numero)), crn_status = 'em_conferencia',
         crn_declarado_em = now(), crn_decidido_em = null
   where id = auth.uid() and situacao = 'nutricionista';
  if not found then raise exception 'Só conta de nutricionista tem CRN para corrigir.' using errcode = 'P0001'; end if;
end;
$$;

-- ---------- Pedidos de estudante ----------

create table if not exists public.pedidos_estudante (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null references auth.users (id) on delete cascade,
  instituicao text not null check (char_length(instituicao) between 2 and 160),
  matricula text not null check (char_length(matricula) between 3 and 40),
  periodo smallint not null check (periodo between 1 and 12),
  -- Sempre o dia 1: a previsão é de mês e ano.
  formatura date not null check (extract(day from formatura) = 1),
  -- Caminho no balde "comprovantes". Fica nulo quando o arquivo é apagado (D-43).
  arquivo text,
  status text not null default 'em_analise' check (status in ('em_analise', 'aprovado', 'recusado')),
  motivo text check (motivo is null or char_length(motivo) <= 200),
  enviado_em timestamptz not null default now(),
  decidido_em timestamptz,
  aviso_fechado boolean not null default false
);
-- CA-275: um pedido em análise por vez.
create unique index if not exists pedidos_estudante_um_em_analise on public.pedidos_estudante (usuario) where status = 'em_analise';
create index if not exists pedidos_estudante_por_usuario on public.pedidos_estudante (usuario, enviado_em desc);
alter table public.pedidos_estudante enable row level security;

drop policy if exists "dono ou admin le o pedido" on public.pedidos_estudante;
create policy "dono ou admin le o pedido" on public.pedidos_estudante
  for select to authenticated using (auth.uid() = usuario or public.eh_admin());

-- ---------- Comprovantes (Storage) ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "estudante envia o proprio comprovante" on storage.objects;
create policy "estudante envia o proprio comprovante" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text);

-- CA-298: só a própria pessoa e o administrador abrem.
drop policy if exists "dono ou admin le o comprovante" on storage.objects;
create policy "dono ou admin le o comprovante" on storage.objects
  for select to authenticated
  using (bucket_id = 'comprovantes' and ((storage.foldername(name))[1] = auth.uid()::text or public.eh_admin()));

-- O dono apaga o envio que o banco recusou; o administrador apaga os vencidos.
drop policy if exists "dono ou admin apaga o comprovante" on storage.objects;
create policy "dono ou admin apaga o comprovante" on storage.objects
  for delete to authenticated
  using (bucket_id = 'comprovantes' and ((storage.foldername(name))[1] = auth.uid()::text or public.eh_admin()));

-- CA-273: o pedido só nasce se o comprovante já está no balde, na pasta da pessoa.
create or replace function public.enviar_pedido_estudante(p_instituicao text, p_matricula text, p_periodo integer, p_formatura date, p_arquivo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text;
  v_confirmado timestamptz;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  if not exists (select 1 from public.perfis where id = auth.uid() and situacao = 'estudante') then
    raise exception 'Só conta de estudante envia comprovante de matrícula.' using errcode = '42501';
  end if;
  select email, email_confirmed_at into v_email, v_confirmado from auth.users where id = auth.uid();
  if v_confirmado is null or not public.eh_email_de_faculdade(v_email) then
    raise exception 'Confirme o e-mail da faculdade antes de enviar o comprovante.' using errcode = '42501';
  end if;
  if p_arquivo is null or split_part(p_arquivo, '/', 1) <> auth.uid()::text
     or not exists (select 1 from storage.objects where bucket_id = 'comprovantes' and name = p_arquivo) then
    raise exception 'O comprovante não chegou. Escolha o arquivo e envie de novo.' using errcode = '22023';
  end if;
  if p_formatura is null or date_trunc('month', p_formatura) < date_trunc('month', now()) then
    raise exception 'A previsão de formatura precisa ser deste mês em diante.' using errcode = '22023';
  end if;
  insert into public.pedidos_estudante (usuario, instituicao, matricula, periodo, formatura, arquivo)
  values (auth.uid(), trim(p_instituicao), trim(p_matricula), p_periodo, date_trunc('month', p_formatura)::date, p_arquivo)
  returning id into v_id;
  return v_id;
exception
  when unique_violation then
    raise exception 'Você já tem um comprovante em análise.' using errcode = 'P0001';
  when check_violation then
    raise exception 'Confira os dados: instituição, matrícula, período e previsão de formatura.' using errcode = '22023';
end;
$$;

-- CA-280: o aviso de aprovado fecha e não volta.
create or replace function public.fechar_aviso_estudante(p_pedido uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.pedidos_estudante set aviso_fechado = true
   where id = p_pedido and usuario = auth.uid() and status = 'aprovado';
end;
$$;

-- ---------- Funções do administrador ----------

-- CA-293: fila do mais antigo para o mais novo, com o e-mail (que só o servidor lê).
create or replace function public.pedidos_em_analise()
returns table (id uuid, usuario uuid, nome text, email text, instituicao text, matricula text, periodo smallint, formatura date, enviado_em timestamptz, arquivo text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then raise exception 'Só o administrador vê esta lista.' using errcode = '42501'; end if;
  return query
    select p.id, p.usuario, coalesce(f.nome, ''), u.email::text, p.instituicao, p.matricula, p.periodo, p.formatura, p.enviado_em, p.arquivo
      from public.pedidos_estudante p
      join auth.users u on u.id = p.usuario
      left join public.perfis f on f.id = p.usuario
     where p.status = 'em_analise'
     order by p.enviado_em asc;
end;
$$;

-- CA-294, CA-295, CB-61 e CB-63.
create or replace function public.decidir_pedido(p_pedido uuid, p_aprovar boolean, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid;
  v_formatura date;
  v_expira timestamptz;
begin
  if not public.eh_admin() then raise exception 'Só o administrador decide pedidos.' using errcode = '42501'; end if;
  if not p_aprovar and coalesce(trim(p_motivo), '') = '' then
    raise exception 'Escolha o motivo da recusa.' using errcode = '22023';
  end if;
  update public.pedidos_estudante
     set status = case when p_aprovar then 'aprovado' else 'recusado' end,
         motivo = case when p_aprovar then null else left(trim(p_motivo), 200) end,
         decidido_em = now()
   where id = p_pedido and status = 'em_analise'
   returning usuario, formatura into v_usuario, v_formatura;
  if v_usuario is null then raise exception 'Este pedido já foi decidido.' using errcode = 'P0001'; end if;
  if p_aprovar then
    -- D-42: 12 meses ou o fim do mês da formatura, o que vier antes.
    v_expira := least(now() + interval '12 months', (v_formatura + interval '1 month')::timestamptz - interval '1 second');
    insert into public.assinaturas (nutricionista_id, plano, status, expira_em, atualizado_em)
    values (v_usuario, 'estudante', 'ativa', v_expira, now())
    on conflict (nutricionista_id) do update
      set plano = 'estudante', status = 'ativa', expira_em = excluded.expira_em, atualizado_em = now()
      where public.assinaturas.preapproval_id is null;
  end if;
end;
$$;

-- CA-296: em conferência primeiro; decididos nos últimos 30 dias depois.
create or replace function public.crn_para_conferir()
returns table (usuario uuid, nome text, email text, crn_regiao smallint, crn_numero text, conta_criada_em timestamptz, crn_status text, crn_decidido_em timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then raise exception 'Só o administrador vê esta lista.' using errcode = '42501'; end if;
  return query
    select f.id, f.nome, u.email::text, f.crn_regiao, f.crn_numero, u.created_at, f.crn_status, f.crn_decidido_em
      from public.perfis f
      join auth.users u on u.id = f.id
     where f.situacao = 'nutricionista'
       and (f.crn_status = 'em_conferencia' or f.crn_decidido_em > now() - interval '30 days')
     order by (f.crn_status <> 'em_conferencia'), u.created_at asc;
end;
$$;

create or replace function public.decidir_crn(p_usuario uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then raise exception 'Só o administrador confere CRN.' using errcode = '42501'; end if;
  if p_status not in ('em_conferencia', 'conferido', 'nao_encontrado') then
    raise exception 'Situação de CRN desconhecida.' using errcode = '22023';
  end if;
  update public.perfis
     set crn_status = p_status, crn_decidido_em = case when p_status = 'em_conferencia' then null else now() end
   where id = p_usuario and situacao = 'nutricionista';
  if not found then raise exception 'Esta conta não é de nutricionista.' using errcode = 'P0001'; end if;
end;
$$;

-- CA-299 e CA-300: decididos há mais de 30 dias, de conta apagada ou de envio que o
-- banco recusou. O administrador apaga do balde e marca aqui (Tarefa 9).
create or replace function public.comprovantes_para_apagar()
returns table (caminho text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then raise exception 'Só o administrador apaga comprovantes.' using errcode = '42501'; end if;
  return query
    select p.arquivo from public.pedidos_estudante p
     where p.arquivo is not null and p.decidido_em < now() - interval '30 days'
    union
    select o.name from storage.objects o
     where o.bucket_id = 'comprovantes'
       and o.created_at < now() - interval '1 day'
       and not exists (select 1 from public.pedidos_estudante p where p.arquivo = o.name);
end;
$$;

create or replace function public.marcar_comprovantes_apagados(p_caminhos text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then raise exception 'Só o administrador apaga comprovantes.' using errcode = '42501'; end if;
  update public.pedidos_estudante set arquivo = null where arquivo = any (p_caminhos);
end;
$$;

-- Para se marcar como administrador, troque o e-mail e rode SÓ esta linha, sem o "--":
-- insert into public.administradores (usuario) select id from auth.users where email = 'seu-email@exemplo.com' on conflict do nothing;

-- Conferência depois de rodar (copie para uma consulta nova):
-- select count(*) as perfis from public.perfis;                                    -- 0 ou mais, sem erro
-- select public.crn_valido(6, '12345') as ok, public.crn_valido(12, '1') as regiao_ruim, public.crn_valido(6, '12a45') as numero_ruim; -- true, false, false
