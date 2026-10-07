-- MetaNutri — cobrança pronta para produção (spec cobranca-em-producao, D-80 a D-85, D-101 e D-102).
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Pode rodar de novo: nada é apagado.
--
-- Rode ANTES de publicar as funções assinar, gerenciar-assinatura e webhook-mercadopago desta
-- versão: elas leem e gravam estas colunas e o registro de avisos e a tabela de tentativas de cartão. Publicadas antes, toda
-- assinatura falha e é cancelada na operadora na mesma hora.
--
-- Nenhuma política nova: o navegador continua lendo só a própria assinatura ("dono le a
-- assinatura", do 003). A reserva (008) e o registro de avisos, nem isso: só o servidor, com a
-- service_role.

-- D-83: a data da última mensalidade paga. D-81: ao cancelar, só quem já pagou alguma ganha o período.
alter table public.assinaturas add column if not exists ultima_cobranca_paga timestamptz;
-- Quem encerrou a assinatura e quando: a pessoa, o banco ao recusar uma mensalidade (D-80) ou a
-- operadora sozinha. Na recusa, a data é a da cobrança recusada (Conta e plano mostra, CA-393).
alter table public.assinaturas add column if not exists encerrada_por text check (encerrada_por in ('pessoa', 'recusa', 'operadora'));
alter table public.assinaturas add column if not exists encerrada_em timestamptz;

-- D-85: o cartão do pedido em andamento. Se a resposta da operadora se perder, o aviso que adota
-- a assinatura grava o cartão daqui (só a bandeira e os 4 últimos números, como em assinaturas).
alter table public.assinando_agora add column if not exists cartao_bandeira text check (char_length(cartao_bandeira) between 1 and 40);
alter table public.assinando_agora add column if not exists cartao_final text check (cartao_final ~ '^[0-9]{4}$');

-- D-84: o registro dos avisos da operadora, para saber se eles chegam. Sem dado pessoal.
-- A função do aviso apaga os de mais de 90 dias a cada aviso que chega.
create table if not exists public.avisos_da_operadora (
  id bigint generated always as identity primary key,
  recebido_em timestamptz not null default now(),
  topico text not null check (char_length(topico) <= 80),
  recurso_id text check (char_length(recurso_id) <= 80),
  -- Nulo quando não deu para conferir (sem segredo, sem id ou recurso inválido).
  assinatura_confere boolean,
  resultado text not null check (char_length(resultado) <= 200)
);
create index if not exists avisos_da_operadora_por_data on public.avisos_da_operadora (recebido_em);
alter table public.avisos_da_operadora enable row level security;
revoke all on public.avisos_da_operadora from anon, authenticated;

-- Tentativas de cartão (D-101, CA-433 e CA-434): quantas vezes cada conta tentou e quantas o banco
-- recusou, para barrar quem testa cartões em fila. Sem IP e sem dado do cartão. As funções apagam
-- as de mais de 7 dias a cada tentativa anotada.
create table if not exists public.tentativas_de_cartao (
  id bigint generated always as identity primary key,
  nutricionista_id uuid not null references auth.users (id) on delete cascade,
  quando timestamptz not null default now(),
  recusada boolean not null
);
create index if not exists tentativas_de_cartao_por_conta on public.tentativas_de_cartao (nutricionista_id, quando);
create index if not exists tentativas_de_cartao_por_data on public.tentativas_de_cartao (quando);
alter table public.tentativas_de_cartao enable row level security;
revoke all on public.tentativas_de_cartao from anon, authenticated;

-- Conferência depois de rodar (copie para uma consulta nova):
-- select column_name, data_type from information_schema.columns
--  where table_schema = 'public' and table_name = 'assinaturas'
--    and column_name in ('ultima_cobranca_paga', 'encerrada_por', 'encerrada_em');
-- -- três linhas: timestamp with time zone, text e timestamp with time zone
-- select relname, relrowsecurity from pg_class where oid = 'public.avisos_da_operadora'::regclass;
-- -- uma linha: avisos_da_operadora, true (o registro existe e só o servidor mexe nele)
-- select relname, relrowsecurity from pg_class where oid = 'public.tentativas_de_cartao'::regclass;
-- -- uma linha: tentativas_de_cartao, true (as tentativas de cartão, também só do servidor)
--
-- Depois da primeira compra em produção (D-84), os últimos avisos:
-- select recebido_em, topico, recurso_id, assinatura_confere, resultado
--   from public.avisos_da_operadora order by recebido_em desc limit 20;
