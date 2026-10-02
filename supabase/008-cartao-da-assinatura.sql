-- MetaNutri — o cartão da assinatura (spec checkout-proprio, D-70).
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Pode rodar de novo: nada é apagado.
--
-- Rode ANTES de publicar as funções assinar, gerenciar-assinatura e webhook-mercadopago
-- desta versão: elas gravam estas colunas, e a assinar usa a trava do fim do arquivo.
--
-- Do cartão, o MetaNutri guarda só o que a pessoa precisa para reconhecer qual cartão
-- paga: a bandeira e os 4 últimos números. O número inteiro, a validade e o código nunca
-- chegam aqui: vão do navegador direto para a operadora de pagamento, que devolve um
-- código de uso único no lugar do cartão.
--
-- Nenhuma política nova: o navegador continua lendo só a própria linha ("dono le a
-- assinatura", do 003), e quem escreve é só o servidor, com a service_role. A trava
-- abaixo nem isso: o navegador não lê nem escreve nela.

alter table public.assinaturas add column if not exists cartao_bandeira text check (char_length(cartao_bandeira) between 1 and 40);
alter table public.assinaturas add column if not exists cartao_final text check (cartao_final ~ '^[0-9]{4}$');
-- Quando cai a próxima cobrança. Ao cancelar, o fim do período pago sai daqui (CA-378).
alter table public.assinaturas add column if not exists proxima_cobranca timestamptz;

-- Trava contra dois pedidos de assinatura ao mesmo tempo (duas abas): a chave primária deixa um só passar.
create table if not exists public.assinando_agora (
  nutricionista_id uuid primary key references auth.users (id) on delete cascade,
  desde timestamptz not null default now()
);
alter table public.assinando_agora enable row level security;
revoke all on public.assinando_agora from anon, authenticated;

-- Conferência depois de rodar (copie para uma consulta nova):
-- select column_name, data_type from information_schema.columns
--  where table_schema = 'public' and table_name = 'assinaturas'
--    and column_name in ('cartao_bandeira', 'cartao_final', 'proxima_cobranca');
-- -- três linhas: text, text e timestamp with time zone
-- select relname, relrowsecurity from pg_class where oid = 'public.assinando_agora'::regclass;
-- -- uma linha: assinando_agora, true (a trava existe e só o servidor mexe nela)
