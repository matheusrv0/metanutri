-- MetaNutri — fotos e anexos da avaliação antropométrica (spec antropometria-telas, D-1457 e D-1504; CA-2488).
-- Rode no SQL Editor do Supabase: SQL Editor > New query > cole tudo > Run. As consultas de conferência no fim valem
-- depois, numa consulta nova.
-- Pode rodar de novo: nenhum dado é apagado.
-- Rode DEPOIS do 001 ao 015 e ANTES de publicar o site desta versão. Sem ele, o app diz "Entre de novo para enviar
-- fotos." ao enviar (a política não existe) e o resto continua igual.
--
-- O que faz: um balde PRIVADO, "fotos-avaliacao", para as fotos e os anexos da avaliação. Cada arquivo mora em
-- <conta>/<plano>/fotos/<id>.jpg ou <conta>/<plano>/anexos/<id>.<pdf|jpg|png>. Cada conta envia, lê e apaga só na
-- própria pasta; ninguém lista a pasta de outra; quem não tem conta não faz nada. Ninguém troca nem move arquivo.
-- O servidor também confere: o tipo (JPEG, PNG ou PDF), até 8 MB por arquivo, até 5 fotos e 10 anexos por plano e até
-- 2.000 arquivos por conta. O teto de 8 MB somando a avaliação inteira fica com o app (DP-AT-12): o tamanho só chega
-- depois do envio.
--
-- CFN 599/2018, art. 58: as fotos são do prontuário. Nada aqui as torna públicas: o balde não tem endereço público, e a
-- imagem só abre por um link assinado de 10 minutos, pedido pela própria conta.
--
-- A exclusão da conta pelo site apaga a pasta da conta neste balde (função excluir-conta, publicada junto com o site).

begin;


-- ---------- O balde (D-1457) ----------

-- Privado; 8 MB por arquivo (8 × 1024 × 1024, D-1506); só os três tipos. Rodar de novo repõe isso, se alguém mudou.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-avaliacao', 'fotos-avaliacao', false, 8388608, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;


-- ---------- Quem pode enviar (D-1504) ----------

-- Confere o caminho inteiro e as contagens. Roda como dono do banco (security definer) para contar os arquivos da
-- própria conta sem cair na política que está sendo conferida (a mesma ideia do comprovantes_da_conta, 010).
-- A trava (pg_advisory_xact_lock) segura a pasta da conta até o fim do envio: duas abas enviando juntas não passam de
-- 5 fotos, porque a segunda só conta depois que a primeira terminou (CB-1416).
create or replace function public.pode_enviar_arquivo_da_avaliacao(p_nome text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_conta text := auth.uid()::text;
  v_plano text;
  v_tipo text;
  v_pasta text;
  v_na_conta integer;
  v_no_plano integer;
begin
  if v_conta is null or p_nome is null then
    return false;
  end if;
  -- <conta>/<plano>/fotos/<uuid>.jpg ou <conta>/<plano>/anexos/<uuid>.<pdf|jpg|png> (DP-AT-20); nada além disso.
  if p_nome !~ ('^' || v_conta || '/[A-Za-z0-9_-]{1,64}/(fotos/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg|anexos/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png))$') then
    return false;
  end if;
  v_plano := split_part(p_nome, '/', 2);
  v_tipo := split_part(p_nome, '/', 3);
  v_pasta := v_conta || '/' || v_plano || '/' || v_tipo || '/';

  perform pg_advisory_xact_lock(hashtext('fotos-avaliacao:' || v_conta));

  select count(*)::integer into v_na_conta
    from storage.objects o
   where o.bucket_id = 'fotos-avaliacao' and starts_with(o.name, v_conta || '/');
  if v_na_conta >= 2000 then
    return false;
  end if;

  select count(*)::integer into v_no_plano
    from storage.objects o
   where o.bucket_id = 'fotos-avaliacao' and starts_with(o.name, v_pasta);
  return v_no_plano < case v_tipo when 'fotos' then 5 else 10 end;
end;
$$;

revoke all on function public.pode_enviar_arquivo_da_avaliacao(text) from public, anon;
grant execute on function public.pode_enviar_arquivo_da_avaliacao(text) to authenticated;


-- ---------- As políticas (CA-2488) ----------

drop policy if exists "fotos da avaliacao: dono envia" on storage.objects;
create policy "fotos da avaliacao: dono envia" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'fotos-avaliacao'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.pode_enviar_arquivo_da_avaliacao(name)
  );

-- Ler serve para baixar, listar e assinar o link de 10 minutos.
drop policy if exists "fotos da avaliacao: dono le" on storage.objects;
create policy "fotos da avaliacao: dono le" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos-avaliacao' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "fotos da avaliacao: dono apaga" on storage.objects;
create policy "fotos da avaliacao: dono apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos-avaliacao' and (storage.foldername(name))[1] = auth.uid()::text);

-- Sem política de alteração (update): ninguém sobrescreve nem move arquivo neste balde.

commit;


-- Conferência depois de rodar (copie para uma consulta nova):
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'fotos-avaliacao';
-- -- uma linha: fotos-avaliacao, false, 8388608, {image/jpeg,image/png,application/pdf}
-- select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'fotos da avaliacao:%' order by policyname;
-- -- três linhas: dono apaga (DELETE), dono envia (INSERT), dono le (SELECT)
-- select has_function_privilege('anon', 'public.pode_enviar_arquivo_da_avaliacao(text)', 'execute') as anon_chama, p.prosecdef as definer
--   from pg_proc p where p.oid = 'public.pode_enviar_arquivo_da_avaliacao(text)'::regprocedure;
-- -- uma linha: false, true
