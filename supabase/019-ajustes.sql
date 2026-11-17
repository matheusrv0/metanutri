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
--     gravada de novo com o mesmo token (D-1266, CB-1234).
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

commit;


-- Conferência depois de rodar (copie para uma consulta nova):
-- select count(*) as cortados_sem_resumo from public.acompanhamentos a
--  where a.cortado_em is not null
--    and not exists (select 1 from public.tokens_trocados t where t.token_hash = public.hash_do_token(a.token));
-- -- uma linha: 0
-- select position('returning a.token' in prosrc) > 0 as guarda_os_cortados from pg_proc where proname = 'trocar_o_endereco';
-- -- uma linha: true
