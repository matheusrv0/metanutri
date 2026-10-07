-- MetaNutri — segurança, lote 1 (spec seguranca-lote-1, D-95 e D-97).
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Pode rodar de novo: nada é apagado.
-- Rode DEPOIS do 001 ao 008. Se rodar o 006 de novo, rode este logo depois.
--
-- O que o navegador já avisa, o banco passa a garantir: o aviso de uso não comercial e o
-- limite de links do plano no link do paciente, o formato do token, o tamanho das
-- marcações, quem envia comprovante e quem executa as funções da verificação.

-- ---------- Link do paciente: aviso e limite do plano (D-95) ----------

-- O plano que vale para a conta segue as mesmas regras do navegador (daLinhaAssinatura,
-- em src/domain/assinatura.ts): ativa e dentro do prazo vale o plano da linha; paga
-- cancelada vale até o fim do período pago; o resto é Free. Os limites são os de
-- limiteLinksPaciente (src/domain/conta.ts): Free 2, Estudante 3, Solo 25; Pro e Clínica sem limite.
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

    if v_limite is not null then
      -- Dois links criados ao mesmo tempo (duas abas) esperam um pelo outro para contar.
      perform pg_advisory_xact_lock(hashtext('links:' || new.nutricionista_id::text));
      select count(*) into v_links from public.acompanhamentos where nutricionista_id = new.nutricionista_id;
      if v_links >= v_limite then
        raise exception 'Você chegou ao limite de links do seu plano.' using errcode = 'P0001';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists conferir_link_do_paciente on public.acompanhamentos;
create trigger conferir_link_do_paciente
  before insert or update on public.acompanhamentos
  for each row execute function public.conferir_link_do_paciente();


-- ---------- Token do link (CA-427) ----------

-- O app gera 12 letras minúsculas e números (gerarToken, em src/domain/acompanhamento.ts).
do $$
begin
  alter table public.acompanhamentos
    add constraint acompanhamentos_token_formato check (char_length(token) between 12 and 64 and token ~ '^[a-z0-9]+$');
exception
  when duplicate_object then null;
end $$;


-- ---------- Marcações do paciente (CA-426) ----------

-- A mesma função do 001, com um teto bem acima do uso real (uma marcação por dia): 1500 itens ou 1 MB.
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
  where token = p_token;
end;
$$;


-- ---------- Comprovantes: só estudante, até 10 arquivos (CA-428) ----------

-- Quantos arquivos a pessoa já tem no balde. A contagem fica numa função porque uma
-- política de storage.objects que lê storage.objects pode cair em recursão.
create or replace function public.comprovantes_da_conta()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from storage.objects
   where bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text;
$$;

revoke execute on function public.comprovantes_da_conta() from public, anon;
grant execute on function public.comprovantes_da_conta() to authenticated;

drop policy if exists "estudante envia o proprio comprovante" on storage.objects;
create policy "estudante envia o proprio comprovante" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (select 1 from public.perfis where id = auth.uid() and situacao = 'estudante')
    and public.comprovantes_da_conta() < 10
  );


-- ---------- Funções da verificação: só com login (CA-429) ----------

-- Sai de public e de anon. Fica com authenticated o que o app chama logado; eh_admin também
-- porque as políticas de leitura do 006 a usam. crn_valido só é chamada por dentro das
-- outras e não fica com ninguém. criar_perfil, o gatilho do cadastro, fica como está:
-- função de gatilho não é chamada direto.
revoke execute on function public.eh_admin() from public, anon;
revoke execute on function public.crn_valido(integer, text) from public, anon;
revoke execute on function public.informar_situacao(text, integer, text) from public, anon;
revoke execute on function public.me_formei(integer, text) from public, anon;
revoke execute on function public.corrigir_crn(integer, text) from public, anon;
revoke execute on function public.enviar_pedido_estudante(text, text, integer, date, text) from public, anon;
revoke execute on function public.fechar_aviso_estudante(uuid) from public, anon;
revoke execute on function public.pedidos_em_analise() from public, anon;
revoke execute on function public.decidir_pedido(uuid, boolean, text) from public, anon;
revoke execute on function public.crn_para_conferir() from public, anon;
revoke execute on function public.decidir_crn(uuid, text) from public, anon;
revoke execute on function public.comprovantes_para_apagar() from public, anon;
revoke execute on function public.marcar_comprovantes_apagados(text[]) from public, anon;

revoke execute on function public.crn_valido(integer, text) from authenticated;

grant execute on function public.eh_admin() to authenticated;
grant execute on function public.informar_situacao(text, integer, text) to authenticated;
grant execute on function public.me_formei(integer, text) to authenticated;
grant execute on function public.corrigir_crn(integer, text) to authenticated;
grant execute on function public.enviar_pedido_estudante(text, text, integer, date, text) to authenticated;
grant execute on function public.fechar_aviso_estudante(uuid) to authenticated;
grant execute on function public.pedidos_em_analise() to authenticated;
grant execute on function public.decidir_pedido(uuid, boolean, text) to authenticated;
grant execute on function public.crn_para_conferir() to authenticated;
grant execute on function public.decidir_crn(uuid, text) to authenticated;
grant execute on function public.comprovantes_para_apagar() to authenticated;
grant execute on function public.marcar_comprovantes_apagados(text[]) to authenticated;

-- Conferência depois de rodar (copie para uma consulta nova):
-- select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as logado
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--  where n.nspname = 'public' and p.proname in ('eh_admin', 'crn_valido', 'informar_situacao', 'me_formei', 'corrigir_crn',
--        'enviar_pedido_estudante', 'fechar_aviso_estudante', 'pedidos_em_analise', 'decidir_pedido', 'crn_para_conferir', 'decidir_crn',
--        'comprovantes_para_apagar', 'marcar_comprovantes_apagados');
-- -- 13 linhas, anon false em todas; logado false só em crn_valido
-- select tgname from pg_trigger where tgrelid = 'public.acompanhamentos'::regclass and not tgisinternal;
-- -- conferir_link_do_paciente
-- select conname from pg_constraint where conrelid = 'public.acompanhamentos'::regclass and conname = 'acompanhamentos_token_formato';
-- -- uma linha
