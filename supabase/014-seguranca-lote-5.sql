-- MetaNutri — segurança, lote 5 (spec seguranca-lote-5, D-260 a D-264).
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. As consultas de conferência estão no fim.
-- Pode rodar de novo: nenhum dado é apagado.
-- Rode DEPOIS do 001 ao 012 (e do 013, se ele já rodou: um não depende do outro).
--
-- ORDEM (D-262), para o administrador não ficar trancado do lado de fora:
--   1. o site desta versão no ar (ele já pede o código do app nas telas do administrador);
--   2. em Authentication > Multi-Factor, o "TOTP (App Authenticator)" ligado;
--   3. cada administrador entra no site, abre Aprovações e ativa a verificação em duas etapas;
--   4. só então este arquivo. Se algum administrador ainda não ativou, ele para logo no começo e não muda nada.
--
-- O que muda:
--   * o banco só reconhece o administrador numa sessão confirmada pelo código do app autenticador (aal2);
--   * os comprovantes passam a ser apagados pelo servidor, uma vez por dia, pela função limpar-comprovantes.
--
-- Perdeu o celular do app? Rode SÓ esta linha, com o seu e-mail, e ative o app de novo pelo site:
-- delete from auth.mfa_factors where user_id = (select id from auth.users where email = 'seu-email@exemplo.com');
--
-- Para desfazer o segundo fator (volta o eh_admin de antes, sem o código), rode SÓ esta linha:
-- create or replace function public.eh_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.administradores where usuario = auth.uid()); $$;

begin;


-- ---------- A trava contra ficar trancado do lado de fora (D-262, CA-841) ----------

-- Um fator só cadastrado, sem confirmar o primeiro código, não conta: o administrador ainda não consegue
-- entrar com ele.
do $$
begin
  if exists (
    select 1 from public.administradores a
     where not exists (
       select 1 from auth.mfa_factors f
        where f.user_id = a.usuario and f.factor_type = 'totp' and f.status = 'verified'
     )
  ) then
    raise exception 'Antes de rodar este arquivo, cada administrador precisa ativar a verificação em duas etapas no site (Aprovações). Nada foi mudado.';
  end if;
end;
$$;


-- ---------- O administrador só com o código do app (D-260, CA-830 a CA-834) ----------

-- O login do Supabase põe no token o nível da sessão: aal1 depois da senha, aal2 depois do código do app.
-- Todas as funções do administrador e as regras de leitura de perfis, pedidos e comprovantes perguntam a esta
-- função; com ela exigindo aal2, a sessão só com a senha vira uma conta comum.
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (select 1 from public.administradores where usuario = auth.uid());
$$;

revoke execute on function public.eh_admin() from public, anon;
grant execute on function public.eh_admin() to authenticated;

-- O site pergunta se a conta é de administrador e ainda falta o código, para mostrar o passo do app em
-- Negócio e Aprovações (D-261). Só fala da própria conta.
create or replace function public.admin_sem_segundo_fator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() ->> 'aal', '') <> 'aal2'
     and exists (select 1 from public.administradores where usuario = auth.uid());
$$;

revoke execute on function public.admin_sem_segundo_fator() from public, anon;
grant execute on function public.admin_sem_segundo_fator() to authenticated;


-- ---------- A limpeza dos comprovantes pelo servidor (D-263 e D-264, CA-843 a CA-851) ----------

-- Apagar a linha de storage.objects pelo SQL deixaria o arquivo guardado: quem apaga é a função
-- limpar-comprovantes, pelo armazenamento do Supabase. O banco diz o que venceu, confere a chave do pedido,
-- anota o que saiu e agenda a chamada diária.

-- A regra do D-43: o arquivo sai 30 dias depois da decisão; o arquivo sem pedido (envio abandonado ou conta
-- excluída), 1 dia depois de enviado. Pedido em análise nunca. A data de referência é um parâmetro só para o
-- teste do Supabase local enxergar os prazos (DP-L5-4); só o servidor chama.
create or replace function public.comprovantes_vencidos(p_agora timestamptz default now(), p_limite integer default 1000)
returns table (caminho text)
language sql
stable
security definer
set search_path = public
as $$
  select v.caminho
    from (
      select p.arquivo as caminho from public.pedidos_estudante p
       where p.arquivo is not null and p.decidido_em < p_agora - interval '30 days'
      union
      select o.name from storage.objects o
       where o.bucket_id = 'comprovantes' and o.created_at < p_agora - interval '1 day'
         and not exists (select 1 from public.pedidos_estudante p where p.arquivo = o.name)
    ) v
   order by v.caminho
   limit least(greatest(coalesce(p_limite, 1000), 0), 1000);
$$;

revoke all on function public.comprovantes_vencidos(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.comprovantes_vencidos(timestamptz, integer) to service_role;

-- O pedido guarda os dados digitados e a decisão; só perde o caminho do arquivo, e só quando o arquivo já
-- saiu do armazenamento (CA-849). Devolve quantos pedidos foram marcados.
create or replace function public.anotar_comprovantes_apagados(p_caminhos text[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_marcados integer;
begin
  update public.pedidos_estudante p set arquivo = null
   where p.arquivo = any (p_caminhos)
     and not exists (select 1 from storage.objects o where o.bucket_id = 'comprovantes' and o.name = p.arquivo);
  get diagnostics v_marcados = row_count;
  return v_marcados;
end;
$$;

revoke all on function public.anotar_comprovantes_apagados(text[]) from public, anon, authenticated;
grant execute on function public.anotar_comprovantes_apagados(text[]) to service_role;

-- As duas funções do administrador (006) continuam: a limpeza que o navegador dele faz ao abrir Aprovações
-- fica como reserva (DP-L5-7), com as mesmas regras de cima.
create or replace function public.comprovantes_para_apagar()
returns table (caminho text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then raise exception 'Só o administrador apaga comprovantes.' using errcode = '42501'; end if;
  return query select v.caminho from public.comprovantes_vencidos(now(), 1000) v;
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
  perform public.anotar_comprovantes_apagados(p_caminhos);
end;
$$;

revoke execute on function public.comprovantes_para_apagar() from public, anon;
revoke execute on function public.marcar_comprovantes_apagados(text[]) from public, anon;
grant execute on function public.comprovantes_para_apagar() to authenticated;
grant execute on function public.marcar_comprovantes_apagados(text[]) to authenticated;

-- D-264: a chave que o agendamento manda e a função confere. Nasce aqui, aleatória (244 bits), e fica só no
-- cofre do Supabase (Vault): ninguém precisa copiá-la. Rodar o arquivo de novo não a troca.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'metanutri_chave_da_limpeza') then
    perform vault.create_secret(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'metanutri_chave_da_limpeza',
      'Chave que o agendamento manda para a função limpar-comprovantes (spec seguranca-lote-5, D-264).');
  end if;
end;
$$;

create or replace function public.conferir_chave_da_limpeza(p_chave text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(length(p_chave), 0) >= 32
     and exists (select 1 from vault.decrypted_secrets s where s.name = 'metanutri_chave_da_limpeza' and s.decrypted_secret = p_chave);
$$;

revoke all on function public.conferir_chave_da_limpeza(text) from public, anon, authenticated;
grant execute on function public.conferir_chave_da_limpeza(text) to service_role;

-- O pedido diário à função. O endereço do projeto fica no cofre (o dono grava numa linha, veja o fim); sem
-- ele, nada sai e nada dá erro (CA-846).
create or replace function public.pedir_limpeza_dos_comprovantes()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_chave text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'metanutri_url_do_projeto';
  select decrypted_secret into v_chave from vault.decrypted_secrets where name = 'metanutri_chave_da_limpeza';
  if coalesce(v_url, '') = '' or coalesce(v_chave, '') = '' then
    return null;
  end if;
  return net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/limpar-comprovantes',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-chave-da-limpeza', v_chave),
    timeout_milliseconds := 60000
  );
end;
$$;

-- Só o agendamento chama, como o dono das funções (postgres).
revoke all on function public.pedir_limpeza_dos_comprovantes() from public, anon, authenticated, service_role;

-- R-62: as duas extensões do Supabase. Se o SQL Editor recusar, ligue pg_cron e pg_net em
-- Database > Extensions e rode o arquivo de novo.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Todo dia às 06:15 UTC (03:15 em Brasília). Pelo nome: rodar de novo só atualiza o mesmo agendamento.
select cron.schedule('metanutri-limpar-comprovantes', '15 6 * * *', 'select public.pedir_limpeza_dos_comprovantes();');


commit;


-- Depois de rodar, grave o endereço do projeto no cofre (uma vez só; troque pelo seu, se for outro projeto):
-- select vault.create_secret('https://qmpljfjbdcrdbqutuvmg.supabase.co', 'metanutri_url_do_projeto', 'Endereço do projeto para o agendamento da limpeza (spec seguranca-lote-5).');

-- Conferência depois de rodar (copie para uma consulta nova):
-- select count(*) as administradores_sem_app from public.administradores a
--  where not exists (select 1 from auth.mfa_factors f where f.user_id = a.usuario and f.factor_type = 'totp' and f.status = 'verified');
-- -- uma linha: 0
-- select position('aal2' in pg_get_functiondef('public.eh_admin()'::regprocedure)) > 0 as exige_o_codigo;
-- -- uma linha: true
-- select schedule, command, active from cron.job where jobname = 'metanutri-limpar-comprovantes';
-- -- uma linha: 15 6 * * *, select public.pedir_limpeza_dos_comprovantes();, true
-- select name from vault.secrets where name in ('metanutri_chave_da_limpeza', 'metanutri_url_do_projeto') order by name;
-- -- duas linhas (depois de gravar o endereço): metanutri_chave_da_limpeza e metanutri_url_do_projeto
-- select has_function_privilege('authenticated', 'public.comprovantes_vencidos(timestamptz, integer)', 'execute') as logado_vencidos,
--        has_function_privilege('anon', 'public.admin_sem_segundo_fator()', 'execute') as visitante_sem_fator,
--        has_function_privilege('authenticated', 'public.admin_sem_segundo_fator()', 'execute') as logado_sem_fator;
-- -- uma linha: false, false, true
-- Um dia depois, a primeira limpeza (status 200 e a resposta com os números):
-- select status_code, content from net._http_response order by created desc limit 1;
