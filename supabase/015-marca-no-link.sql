-- MetaNutri — a marca da nutricionista no link do paciente (spec marca-no-link, D-952 e DP-ML-1).
-- Rode, na pasta do projeto e com a main atualizada, o comando abaixo:
--   npx supabase db query --linked --project-ref qmpljfjbdcrdbqutuvmg -f supabase/015-marca-no-link.sql
-- (Alternativa: SQL Editor > New query > cole tudo > Run; as consultas de conferência no fim valem do mesmo jeito.)
-- Pode rodar de novo: nenhum dado é apagado.
-- Rode DEPOIS do 001 ao 014 e ANTES de publicar o site desta versão. Se rodar o 004 ou o 012 de novo, rode este logo
-- depois: os dois refazem a função do paciente sem a marca.
--
-- A logo e a cor que a nutricionista salva em "Sua marca" ficam numa tabela nova, uma linha por conta. O link do
-- paciente as lê pela mesma função de sempre, pelo token, sem saber de quem é a conta (CA-1974). Ninguém sem conta toca
-- na tabela, e nenhuma conta lê a de outra (RLS só do dono). Não existe consulta que liste marcas.
-- Publicado antes deste arquivo, o site continua funcionando: "Salvar" em "Sua marca" falha com a frase de rede e o
-- link continua com a marca do MetaNutri.
--
-- Tudo numa transação só: a função do paciente é apagada e criada de novo, e quem abre o link nesse meio tempo nunca a
-- encontra faltando. Se algum passo falhar, nada fica pela metade.

begin;


-- ---------- A marca publicada (D-952) ----------

-- Uma linha por conta. A conta excluída leva a linha junto (CA-1976, spec exclusao-de-conta: on delete cascade).
create table if not exists public.marcas (
  nutricionista_id uuid primary key references auth.users (id) on delete cascade,
  logo text,
  cor text,
  atualizado_em timestamptz not null default now()
);

-- DP-ML-2 (CA-1975, D-107): a logo só vale como PNG em data URI, com a assinatura do PNG (`iVBORw0KGgo`), só base64
-- depois da vírgula e até 150 KB (153.600 bytes de PNG = 204.800 caracteres de base64, mais os 22 do começo). O app
-- reconhece a trava pelo nome (TRAVAS_DE_TAMANHO, em src/ui/estado/mensagemDoBanco.ts) e diz o que fazer.
alter table public.marcas drop constraint if exists marcas_logo_png;
alter table public.marcas add constraint marcas_logo_png check (
  logo is null
  or (
    char_length(logo) <= 204822
    and logo like 'data:image/png;base64,iVBORw0KGgo%'
    and logo ~ '^data:image/png;base64,[A-Za-z0-9+/]+={0,2}$'
  )
);

-- A cor só no formato #rrggbb, em minúscula (o app grava assim). Vazia é a cor padrão do MetaNutri (D-953).
alter table public.marcas drop constraint if exists marcas_cor_formato;
alter table public.marcas add constraint marcas_cor_formato check (cor is null or cor ~ '^#[0-9a-f]{6}$');

alter table public.marcas enable row level security;

-- A nutricionista mexe só na própria linha. Não existe política para anônimo: sem isso, um `select` anônimo
-- devolveria a tabela inteira; e o paciente lê só pela função abaixo.
drop policy if exists "dono le" on public.marcas;
create policy "dono le" on public.marcas
  for select to authenticated using (auth.uid() = nutricionista_id);

drop policy if exists "dono escreve" on public.marcas;
create policy "dono escreve" on public.marcas
  for insert to authenticated with check (auth.uid() = nutricionista_id);

drop policy if exists "dono atualiza" on public.marcas;
create policy "dono atualiza" on public.marcas
  for update to authenticated using (auth.uid() = nutricionista_id) with check (auth.uid() = nutricionista_id);

drop policy if exists "dono apaga" on public.marcas;
create policy "dono apaga" on public.marcas
  for delete to authenticated using (auth.uid() = nutricionista_id);

-- Quem não tem conta nem chega a pedir: além do RLS, sem permissão na tabela.
revoke all on public.marcas from anon;
grant select, insert, update, delete on public.marcas to authenticated;


-- ---------- A porta do paciente devolve a marca (CA-1974) ----------

-- A mesma função do 012, com a logo e a cor da marca publicada no fim. A marca vem pelo dono do link, por dentro da
-- função: o dono não sai na resposta, e um token que não existe não traz nada. Tem que derrubar antes: o Postgres não
-- deixa `create or replace` mudar o tipo de retorno de uma função que já existe.
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
  marca_cor text
)
language sql
security definer
set search_path = public
as $$
  select a.id, a.token, a.caso_id, a.paciente_id, a.nome, a.criado_em, a.missoes, a.marcacoes, a.uso_nao_comercial, a.dieta,
         m.logo, m.cor
  from public.acompanhamentos a
  left join public.marcas m on m.nutricionista_id = a.nutricionista_id
  where a.token = p_token
  limit 1;
$$;

-- Quem pode chamar: `anon` é o paciente, sem conta; `authenticated`, o nutricionista testando o link.
revoke all on function public.missoes_por_token(text) from public;
grant execute on function public.missoes_por_token(text) to anon, authenticated;

-- A API do banco passa a conhecer a tabela e a função novas na hora (o aviso sai quando a transação fecha).
notify pgrst, 'reload schema';

commit;


-- Conferência depois de rodar (copie para uma consulta nova):
-- select relname, relrowsecurity from pg_class where oid = 'public.marcas'::regclass;
-- -- uma linha: marcas, true
-- select conname from pg_constraint where conrelid = 'public.marcas'::regclass and contype = 'c' order by conname;
-- -- duas linhas: marcas_cor_formato, marcas_logo_png
-- select polname from pg_policy where polrelid = 'public.marcas'::regclass order by polname;
-- -- quatro linhas: dono apaga, dono atualiza, dono escreve, dono le
-- select has_table_privilege('anon', 'public.marcas', 'select') as anon_le;
-- -- false
-- select pg_get_function_result('public.missoes_por_token(text)'::regprocedure);
-- -- termina em "dieta jsonb, marca_logo text, marca_cor text)"
-- select has_function_privilege('anon', 'public.missoes_por_token(text)', 'execute') as anon_le, p.prosecdef as definer
--   from pg_proc p where p.oid = 'public.missoes_por_token(text)'::regprocedure;
-- -- uma linha: true, true
