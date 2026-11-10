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
-- 2.000 arquivos por conta.
-- O gatilho, que roda na gravação já com o tamanho, soma também os bytes: até 8 MB por plano (fotos e anexos) e até
-- 500 MB por conta (D-1531).
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
-- O armazenamento confere a política antes de receber o arquivo e grava a linha depois: dois envios juntos passariam
-- os dois por aqui. Quem segura o limite nesse caso é o gatilho mais abaixo (CB-1416).
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


-- ---------- O limite também com dois envios ao mesmo tempo (D-1504, CB-1416) e os bytes (D-1531, CB-1468) ----------

-- Antes de gravar a linha de um arquivo novo do balde, o gatilho trava a pasta da conta até o fim da gravação
-- (pg_advisory_xact_lock) e só então conta e soma: o segundo envio espera o primeiro terminar e já o vê. Passou de 5
-- fotos ou 10 anexos no plano, ou de 2.000 arquivos na conta, a gravação é recusada e nada fica. Passou de 8 MB somando
-- o plano (fotos e anexos) ou de 500 MB somando a conta, também.
-- O tamanho vem do armazenamento, em metadata->>'size'. Antes de receber o arquivo, o armazenamento confere a permissão
-- gravando uma linha de teste sem o tamanho (que ele desfaz): ela conta 0. A gravação de verdade já traz o tamanho.
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
  if v_na_conta >= 2000 or v_no_plano >= v_limite then
    raise exception 'Limite de arquivos da avaliação.' using errcode = 'check_violation';
  end if;
  -- 8 MB = 8.388.608 bytes por plano; 500 MB = 524.288.000 bytes por conta (D-1506 e D-1531).
  if v_bytes_no_plano + v_tamanho > 8388608 or v_bytes_na_conta + v_tamanho > 524288000 then
    raise exception 'Espaço da avaliação ou da conta cheio.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function public.limite_de_arquivos_da_avaliacao() from public, anon, authenticated;

-- A tabela do armazenamento é do Supabase. Se o projeto não deixar criar o gatilho, o resto deste arquivo vale do mesmo
-- jeito (o limite fica só pela política, que já recusa a 6ª foto enviada depois das outras, mas não soma bytes) e o
-- aviso diz isso.
do $$
begin
  drop trigger if exists limite_de_arquivos_da_avaliacao on storage.objects;
  create trigger limite_de_arquivos_da_avaliacao
    before insert on storage.objects
    for each row execute function public.limite_de_arquivos_da_avaliacao();
exception
  when insufficient_privilege then
    raise warning 'Sem permissão para criar o gatilho em storage.objects: o limite de fotos vale pela política, sem a trava de dois envios juntos e sem os tetos de 8 MB por avaliação e 500 MB por conta.';
end;
$$;

commit;


-- Conferência depois de rodar (copie para uma consulta nova):
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'fotos-avaliacao';
-- -- uma linha: fotos-avaliacao, false, 8388608, {image/jpeg,image/png,application/pdf}
-- select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'fotos da avaliacao:%' order by policyname;
-- -- três linhas: dono apaga (DELETE), dono envia (INSERT), dono le (SELECT)
-- select has_function_privilege('anon', 'public.pode_enviar_arquivo_da_avaliacao(text)', 'execute') as anon_chama, p.prosecdef as definer
--   from pg_proc p where p.oid = 'public.pode_enviar_arquivo_da_avaliacao(text)'::regprocedure;
-- -- uma linha: false, true
-- select tgname from pg_trigger where tgrelid = 'storage.objects'::regclass and tgname = 'limite_de_arquivos_da_avaliacao';
-- -- uma linha: limite_de_arquivos_da_avaliacao (sem ela, o aviso do gatilho apareceu ao rodar; o resto vale, sem os tetos de bytes)
-- select position('524288000' in prosrc) > 0 as soma_bytes from pg_proc where proname = 'limite_de_arquivos_da_avaliacao';
-- -- uma linha: true (o gatilho é o desta versão, que soma os bytes)
