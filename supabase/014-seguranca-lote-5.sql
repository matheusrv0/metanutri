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


commit;


-- Conferência depois de rodar (copie para uma consulta nova):
-- select count(*) as administradores_sem_app from public.administradores a
--  where not exists (select 1 from auth.mfa_factors f where f.user_id = a.usuario and f.factor_type = 'totp' and f.status = 'verified');
-- -- uma linha: 0
-- select position('aal2' in pg_get_functiondef('public.eh_admin()'::regprocedure)) > 0 as exige_o_codigo;
-- -- uma linha: true
