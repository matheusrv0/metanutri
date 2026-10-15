-- MetaNutri — a dieta no link do paciente (spec dieta-no-link, D-156).
-- Rode, na pasta do projeto e com a main atualizada, o comando abaixo:
--   npx supabase db query --linked --project-ref qmpljfjbdcrdbqutuvmg -f supabase/012-dieta-no-link.sql
-- (Alternativa: SQL Editor > New query > cole tudo > Run; as consultas de conferência no fim valem do mesmo jeito.)
-- Pode rodar de novo: nenhum dado é apagado.
-- Rode DEPOIS do 001 ao 011 e ANTES de publicar o site desta versão. Se rodar o 004 de novo, rode este logo depois:
-- o 004 refaz a função do paciente sem a dieta.
--
-- O link do paciente passa a poder mostrar o plano alimentar ("Meu plano"), quando o nutricionista liga a opção.
-- A dieta é uma cópia em texto, feita pelo site do nutricionista e gravada pela tabela (RLS do 001: só o dono).
-- O paciente só lê, pela mesma função de sempre. A única escrita dele, marcar_missoes, não muda e não toca na dieta.
-- Publicado antes deste arquivo, o site salva o link sem a dieta e o paciente vê só as missões.
--
-- Tudo numa transação só (CA-550): a função do paciente é apagada e criada de novo, e quem abre o link nesse meio
-- tempo nunca a encontra faltando. Se algum passo falhar, nada fica pela metade.

begin;


-- ---------- A coluna da dieta (D-152 e D-156) ----------

-- Opcional: vazia quando o nutricionista desliga a dieta ou quando o link é de antes desta versão.
alter table public.acompanhamentos add column if not exists dieta jsonb;

-- Até 256 KB, o mesmo teto das missões (011), medido como o banco guarda o valor. O app reconhece a trava pelo nome
-- (TRAVAS_DE_TAMANHO, em src/ui/estado/mensagemDoBanco.ts) e diz o que fazer (CB-152). Vazia, a trava não pesa.
alter table public.acompanhamentos drop constraint if exists acompanhamentos_dieta_tamanho;
alter table public.acompanhamentos add constraint acompanhamentos_dieta_tamanho check (pg_column_size(dieta) <= 262144);


-- ---------- A porta do paciente devolve a dieta (CA-548) ----------

-- A mesma função do 004, com a dieta no fim. Tem que derrubar antes: o Postgres não deixa `create or replace`
-- mudar o tipo de retorno de uma função que já existe.
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
  dieta jsonb
)
language sql
security definer
set search_path = public
as $$
  select a.id, a.token, a.caso_id, a.paciente_id, a.nome, a.criado_em, a.missoes, a.marcacoes, a.uso_nao_comercial, a.dieta
  from public.acompanhamentos a
  where a.token = p_token
  limit 1;
$$;

-- Quem pode chamar: `anon` é o paciente, sem conta; `authenticated`, o nutricionista testando o link.
revoke all on function public.missoes_por_token(text) from public;
grant execute on function public.missoes_por_token(text) to anon, authenticated;

-- A API do banco passa a conhecer a coluna nova na hora (o aviso sai quando a transação fecha).
notify pgrst, 'reload schema';

commit;


-- Conferência depois de rodar (copie para uma consulta nova):
-- select column_name, data_type, is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'acompanhamentos' and column_name = 'dieta';
-- -- uma linha: dieta, jsonb, YES
-- select conname from pg_constraint where conname = 'acompanhamentos_dieta_tamanho';
-- -- uma linha
-- select pg_get_function_result('public.missoes_por_token(text)'::regprocedure);
-- -- termina em "uso_nao_comercial boolean, dieta jsonb)"
-- select has_function_privilege('anon', 'public.missoes_por_token(text)', 'execute') as anon_le, p.prosecdef as definer
--   from pg_proc p where p.oid = 'public.missoes_por_token(text)'::regprocedure;
-- -- uma linha: true, true
