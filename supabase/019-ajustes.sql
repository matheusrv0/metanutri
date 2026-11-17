-- MetaNutri — os ajustes da rodada de melhorias de 16/11/2026 (spec lado-do-paciente, D-1266; spec antropometria-telas,
-- D-1550).
-- Rode no SQL Editor do Supabase: SQL Editor > New query > cole tudo > Run. As consultas de conferência no fim valem
-- depois, numa consulta nova.
-- Pode rodar de novo: nenhum dado é apagado, e rodar de novo não muda nada.
-- Rode DEPOIS do 017 e do 018 (os dois já rodaram em produção). Se rodar o 017 ou o 018 de novo, rode este logo depois:
-- eles refazem as funções abaixo na versão de antes.
--
-- O que muda:
--   * "Trocar o endereço" passa a guardar também o resumo do token de cada link antigo que ela corta, e os links já
--     cortados ganham o resumo agora. Assim o endereço cortado nunca volta a abrir, nem se a linha dele for apagada e
--     gravada de novo com o mesmo token (D-1266, CB-1234);
--   * a conta cheia de fotos e anexos recusa com um código próprio do MetaNutri, `MN001`, e não mais com o `53100`, que
--     no registro do banco aparecia como "disco cheio" (D-1550, CB-1499).
--
-- Tudo numa transação só: se algum passo falhar, nada fica pela metade.

begin;


-- ---------- O endereço cortado nunca volta (D-1266, DP-LP-52) ----------

-- A mesma função do 017, com uma mudança: o `update` que corta os links antigos devolve o token de cada um, e o resumo
-- dele entra em `tokens_trocados`, preso ao link de agora, como o do token trocado. `link_trocado` e `cuidar_do_link`
-- (017) já olham essa tabela: o token cortado abre "Este link foi trocado." e nenhum link novo nasce com ele.
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
  ),
  cortados as (
    update public.acompanhamentos a
       set cortado_em = now()
     where a.cortado_em is null
       and a.id <> new.id
       and a.nutricionista_id = new.nutricionista_id
       and (a.id in (select antigos.id from antigos) or (new.paciente_id is not null and a.paciente_id = new.paciente_id))
    returning a.token
  )
  insert into public.tokens_trocados (token_hash, link_id)
  select public.hash_do_token(c.token), new.id from cortados c
  on conflict (token_hash) do nothing;

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

-- Os links cortados antes deste arquivo: o resumo do token de cada um, preso ao fixo que o cortou (o `substituido_por`
-- que não foi cortado; senão o link vigente mais novo do mesmo paciente na mesma conta; senão o próprio link). Removido o
-- fixo, o paciente sai inteiro, e os resumos saem junto (como no 017). O que já tem o resumo não muda.
insert into public.tokens_trocados (token_hash, link_id, trocado_em)
select public.hash_do_token(c.token),
       coalesce(
         (select f.id from public.acompanhamentos f where f.id = c.substituido_por and f.nutricionista_id = c.nutricionista_id and f.cortado_em is null),
         (select f.id from public.acompanhamentos f
           where c.paciente_id is not null and f.paciente_id = c.paciente_id and f.nutricionista_id = c.nutricionista_id
             and f.cortado_em is null and f.substituido_por is null
           order by f.criado_em desc, f.id desc
           limit 1),
         c.id),
       c.cortado_em
  from public.acompanhamentos c
 where c.cortado_em is not null
on conflict (token_hash) do nothing;


-- ---------- A conta cheia com o código do MetaNutri (D-1550) ----------

-- A mesma função do 018, com uma mudança: a conta cheia (2.000 arquivos ou 500 MB) recusa com o código `MN001`, que é
-- só do MetaNutri (fora das classes do Postgres), no lugar do `53100`, que é o "disco cheio" do Postgres e aparecia
-- assim no registro do banco. O app lê os dois. O gatilho do 018 continua o mesmo: aqui só o corpo da função muda, e
-- o projeto que não deixou criar o gatilho fica como estava.
create or replace function public.limite_de_arquivos_da_avaliacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conta text := split_part(new.name, '/', 1);
  v_plano text := split_part(new.name, '/', 1) || '/' || split_part(new.name, '/', 2) || '/';
  v_pasta text := split_part(new.name, '/', 1) || '/' || split_part(new.name, '/', 2) || '/' || split_part(new.name, '/', 3) || '/';
  v_limite integer := case split_part(new.name, '/', 3) when 'fotos' then 5 else 10 end;
  v_tamanho bigint := case when new.metadata->>'size' ~ '^[0-9]{1,15}$' then (new.metadata->>'size')::bigint else 0 end;
  v_mime text := new.metadata->>'mimetype';
  v_mime_do_caminho text := case split_part(new.name, '/', 3) when 'fotos' then 'image/jpeg' else 'application/pdf' end;
  v_na_conta integer;
  v_no_plano integer;
  v_bytes_na_conta bigint;
  v_bytes_no_plano bigint;
begin
  if new.bucket_id is distinct from 'fotos-avaliacao' then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('fotos-avaliacao:' || v_conta));
  select count(*)::integer, coalesce(sum(case when o.metadata->>'size' ~ '^[0-9]{1,15}$' then (o.metadata->>'size')::bigint else 0 end), 0)
    into v_na_conta, v_bytes_na_conta
    from storage.objects o
   where o.bucket_id = 'fotos-avaliacao' and starts_with(o.name, v_conta || '/') and o.name <> new.name;
  select count(*)::integer into v_no_plano
    from storage.objects o
   where o.bucket_id = 'fotos-avaliacao' and starts_with(o.name, v_pasta) and o.name <> new.name;
  select coalesce(sum(case when o.metadata->>'size' ~ '^[0-9]{1,15}$' then (o.metadata->>'size')::bigint else 0 end), 0)
    into v_bytes_no_plano
    from storage.objects o
   where o.bucket_id = 'fotos-avaliacao' and starts_with(o.name, v_plano) and o.name <> new.name;
  if v_no_plano >= v_limite then
    raise exception 'Limite de arquivos da avaliação.' using errcode = 'check_violation';
  end if;
  if v_mime is not null and v_mime is distinct from v_mime_do_caminho then
    raise exception 'Tipo do arquivo da avaliação.' using errcode = 'check_violation';
  end if;
  -- 8 MB = 8.388.608 bytes por plano; 500 MB = 524.288.000 bytes por conta (D-1506 e D-1531).
  if v_bytes_no_plano + v_tamanho > 8388608 then
    raise exception 'Espaço da avaliação cheio.' using errcode = 'check_violation';
  end if;
  -- D-1550: o código chega ao app na mensagem ("database error, code: MN001"); o texto da recusa, não.
  if v_na_conta >= 2000 or v_bytes_na_conta + v_tamanho > 524288000 then
    raise exception 'Espaço da conta cheio.' using errcode = 'MN001';
  end if;
  return new;
end;
$$;

revoke all on function public.limite_de_arquivos_da_avaliacao() from public, anon, authenticated;

commit;


-- Conferência depois de rodar (copie para uma consulta nova):
-- select count(*) as cortados_sem_resumo from public.acompanhamentos a
--  where a.cortado_em is not null
--    and not exists (select 1 from public.tokens_trocados t where t.token_hash = public.hash_do_token(a.token));
-- -- uma linha: 0
-- select position('returning a.token' in prosrc) > 0 as guarda_os_cortados from pg_proc where proname = 'trocar_o_endereco';
-- -- uma linha: true
-- select position('MN001' in prosrc) > 0 as conta_cheia_mn001, position('53100' in prosrc) = 0 as sem_53100 from pg_proc where proname = 'limite_de_arquivos_da_avaliacao';
-- -- uma linha: true, true
