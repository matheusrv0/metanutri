# Cobrança pronta para produção · Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa por tarefa. Os passos usam caixa (`- [ ]`) para acompanhar.

> **Emenda de 07/10/2026 (vale por cima das tarefas):** leia a seção "Emenda de 07/10/2026" no fim deste plano antes de executar as Tarefas 1, 3, 4 e 5. Ela acrescenta D-101 e D-102 (CA-433 a CA-437) e muda o comportamento "sem segredo" do aviso.

**Objetivo:** ninguém usa plano pago sem pagar, ninguém paga sem ter o plano, e o dono consegue ver se os avisos do Mercado Pago estão chegando antes de trocar as credenciais de teste pelas de produção.

**Arquitetura:** a lógica das três funções sai do `index.ts` e vai para núcleos puros em `supabase/functions/_shared/`: `assinar.ts`, `gerenciarAssinatura.ts` e `webhook.ts`. Cada núcleo recebe de fora tudo o que depende do ambiente (D-88):
- a operadora (`Operadora`): um pedido HTTP que devolve `{ ok, status, dados }`, ou `null` quando não há resposta;
- um banco pequeno (`BancoDaCobranca`), só com as consultas usadas;
- o relógio (`agora`) e o registro (`log`).

O `index.ts` de cada função fica só com a ligação: variáveis de ambiente, `createClient`, o adaptador do banco (`_shared/bancoSupabase.ts`, o único arquivo de `_shared` que importa do esm.sh) e `Deno.serve`. O Vitest executa os núcleos com uma operadora e um banco de mentira (`src/data/servidorFalsos.test-utils.ts`).

O que muda em cada parte:
- **Banco (`009`):** ganha a data da última mensalidade paga, quem encerrou a assinatura e quando, o cartão na reserva e o registro de avisos.
- **Webhook:** passa a ouvir cada mensalidade e corta na primeira recusa (D-80). Também anota cada aviso (D-84), confere a assinatura do aviso pelo manifesto certo e adota a assinatura sem dono (D-85).
- **`assinar`:** procura a assinatura quando a resposta se perde (D-85) e trata como recusa o sucesso que vem cancelado ou pausado (D-86).
- **`gerenciar-assinatura`:** ganha a ação `previa`. A janela de cancelar consulta essa ação antes de deixar confirmar, e o cancelamento usa a mesma regra (D-81).

**Stack:** React 18 + TypeScript strict + Vite + Tailwind v4 · Vitest + Testing Library · Playwright · Supabase (Postgres + Edge Functions em Deno) · Web Crypto (`crypto.subtle`) para o HMAC do aviso, sem pacote novo.

**Spec:** `specs/cobranca-em-producao/SPEC.md` (D-80 a D-88, CA-392 a CA-405, CB-96 a CB-99, R-37 a R-39). Os pontos de partida são `specs/checkout-proprio/SPEC.md` (D-65 a D-74) e a lista "Antes da produção" de `docs/pendencias.md`.

## O que a operadora faz (pesquisa de 06/10/2026, a única fonte de fato aqui)

- **Primeira mensalidade:** cai cerca de 1 hora depois do `POST /preapproval` com `status: authorized`.
- **Aviso de cada mensalidade:** chega com o tópico `subscription_authorized_payment` e é lido em `GET https://api.mercadopago.com/authorized_payments/{id}`. Os campos usados:
  - `preapproval_id`;
  - `status` (`scheduled` | `processed` | `recycling` | `canceled`);
  - `payment.id`, `payment.status` (`approved` | `rejected` | …) e `payment.status_detail`;
  - `retry_attempt` e `debit_date`.
- **`GET /preapproval/{id}`:** traz `summarized.charged_quantity`, `summarized.last_charged_date`, `next_payment_date`, `auto_recurring.transaction_amount`, `auto_recurring.frequency`, `external_reference` (o id da conta aqui) e `payer_email`.
- **`GET /preapproval/search`:** aceita os filtros `payer_email`, `status`, `q`, `offset` e `limit`. Não há filtro documentado por `external_reference`, então cada resultado é conferido no código.
- **Assinatura do aviso:**
  - o cabeçalho `x-signature` vem como `ts=…,v1=…`;
  - o manifesto é `id:[data.id do parâmetro da URL, em minúsculas];request-id:[cabeçalho x-request-id];ts:[ts];`, e a parte que falta sai do manifesto;
  - o `v1` é o HMAC-SHA256 do manifesto com o segredo, em hexadecimal.
- **Modo teste:** com credenciais de teste, a operadora não manda aviso nenhum.
- **Resposta ao aviso:** precisa ser 200 em até 22 s. Sem isso, a operadora manda de novo a cada 15 min.

O que não está nesta lista e o plano usa (o `date_created` na busca, o formato `{ results: [...] }`) é lido sem confiar no formato e aparece em "Riscos e decisões".

## Restrições globais

**Código**
- **Nenhuma dependência npm nova.** O HMAC usa `crypto.subtle`, que existe no Deno e no Node 22.
- Nada de `any`, nem `as any`. JSON da operadora é lido com `objeto()` e `typeof`.
- Configuração do TypeScript ligada:
  - `exactOptionalPropertyTypes`: propriedade opcional entra por spread condicional (`...(x ? { campo: x } : {})`), nunca `campo: undefined`;
  - `noUncheckedIndexedAccess`;
  - `verbatimModuleSyntax`: tipo entra com `import type`.
- ESLint strict: sem `!` (non-null assertion).

**Núcleos do servidor**
- Os arquivos de `supabase/functions/_shared/` usados pelo Vitest (`cobranca.ts`, `portas.ts`, `operadora.ts`, `assinar.ts`, `gerenciarAssinatura.ts`, `webhook.ts`) não podem ter:
  - `Deno.*`;
  - import de `https://`;
  - `console.*` (use o `log` recebido);
  - `Date.now()` nem `new Date()` sem argumento (use o `agora` recebido).
- Só `bancoSupabase.ts` e os `index.ts` falam com o Deno e o esm.sh.
- Os testes do servidor moram em `src/data/` e começam com `// @vitest-environment node`, como `cobrancaServidor.test.ts`.

**Interface**
- O lint do React Compiler está ligado:
  - nada de `setState` síncrono dentro de efeito;
  - nada de ler `ref.current` durante o render (em manipulador de evento e em `.then` pode).
- **Nome do processador:** só na Política de privacidade (D-71). Comentário, README, docs e o texto do registro de avisos (que só o dono vê no Supabase) podem citar. Texto visível de Conta e plano e do checkout, nunca (CA-381).
- Textos em pt-BR, sem repetição, sem enchimento, sem ponto de exclamação nem emoji. Botão é verbo.

**Processo**
- Toda tarefa termina com `npm run check` verde (lint + typecheck + testes). Tarefa que mexe em tela (8 e 9) roda também `npx playwright test`.
- Commit em Conventional Commits, em português. A mensagem vai num arquivo UTF-8 `../_msg.txt`, cuja última linha é exatamente `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Comando: `git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt`. Branch `feat/cobranca-em-producao`.
- O `.env.local` desta máquina tem `VITE_SUPABASE_ANON_KEY` em branco de propósito. Não mexa nele.
- **Nenhum deploy dentro das tarefas:** nem SQL no Supabase, nem função, nem site. A ordem de pôr no ar fica no fim, com o dono.

## Foco de revisão (os cinco caminhos do dinheiro com mais risco)

1. **Corte na primeira recusa** (D-80, CA-392, CB-96, CB-98), Tarefa 6.
   - Cancela na operadora antes de mexer na linha. Se o cancelamento não pegar, responde 500 e nada muda aqui, e o aviso volta em 15 min. Cortar só aqui deixaria a operadora cobrando quem está no Free.
   - O mesmo aviso repetido não cancela de novo.
   - Só a assinatura daquele aviso é afetada.
2. **Assinatura nova zera o passado e o cancelamento usa uma regra só** (D-81), Tarefas 3, 4 e 5.
   - A `assinar` e a adoção gravam `ultima_cobranca_paga`, `encerrada_por` e `encerrada_em` nulos. Sem isso, quem assina de novo depois de uma recusa ganharia "vale até" sem pagar (a prévia acharia a mensalidade paga da assinatura velha) e continuaria vendo o recado da recusa antiga.
   - A prévia e o cancelamento usam a mesma função, `desfechoDoCancelamento`.
3. **Adoção da assinatura sem dono** (D-85, CA-400, CA-401, R-39), Tarefa 5.
   - Só adota com um plano único achado pelo valor e pela frequência.
   - Com outra assinatura paga ativa na conta, cancela a que sobrou e nunca grava por cima de quem já paga.
   - Valor sem plano: cancela lá.
4. **Resposta perdida na `assinar`** (CA-402, CA-403, CB-99), Tarefa 3.
   - A busca confere a conta, o valor, a frequência e a hora em que a assinatura nasceu.
   - Não achando, responde 502 e mantém a reserva: o cartão dela serve à adoção.
   - Um 2xx com a assinatura cancelada ou pausada nunca vira ativa.
5. **O manifesto da assinatura do aviso e o 200/500** (CA-399), Tarefa 5.
   - Com o manifesto errado, todo aviso é descartado e nada corta.
   - Os vetores de teste foram calculados fora do código, com `openssl dgst -sha256 -hmac` e conferidos com `node:crypto`.
   - Falha passageira responde 500. O registro de avisos mostra cada um dos casos.

---

## Ordem e dependências

| # | Tarefa | Depende de |
|---|---|---|
| 1 | Banco: `009-cobranca-em-producao.sql` | — |
| 2 | Servidor: base testável (portas, operadora, tabela de preços, falsos) | — |
| 3 | Servidor: núcleo da `assinar` (D-85 na busca, D-86) | 2 |
| 4 | Servidor: núcleo da `gerenciar-assinatura` (prévia e cancelar, D-81) | 2 |
| 5 | Servidor: núcleo do aviso, parte 1 (assinatura conferida, registro, status, adoção) | 2 |
| 6 | Servidor: núcleo do aviso, parte 2 (mensalidades: paga e recusada) | 5 |
| 7 | Servidor: as três funções viram ligação fina | 1, 3, 4, 6 |
| 8 | Conta e plano: recusa e janela de cancelar que confere a cobrança | 4 (o contrato da prévia) |
| 9 | Campos do cartão: fonte do sistema como reserva (D-87) | — |
| 10 | Documentação e validação final | 1 a 9 |

As Tarefas 1, 2 e 9 não dependem de nada. As Tarefas 3, 4 e 5 podem andar em paralelo depois da 2. Até a Tarefa 7, os `index.ts` não mudam, e os testes de texto que leem esses arquivos continuam verdes.

## Mapa de arquivos

| Arquivo | Tarefa | O que faz |
|---|---|---|
| `supabase/009-cobranca-em-producao.sql` (novo) | 1 | colunas novas em `assinaturas` e `assinando_agora`; tabela `avisos_da_operadora` |
| `src/data/sqlCobranca.test.ts` (novo) | 1 | travas do `009` |
| `README.md` | 1, 10 | rodar o `009`; tópicos do webhook; ordem de pôr no ar |
| `supabase/functions/_shared/portas.ts` (novo) | 2 | tipos do que os núcleos recebem; `respostaDeErro` |
| `supabase/functions/_shared/operadora.ts` (novo) | 2 | `criarOperadora` (fetch padrão) e `cancelarNaOperadora` |
| `supabase/functions/_shared/cobranca.ts` | 2 | `objeto`, `dataOuNula`, `tokenDoCartao`, `PLANOS_DO_SERVIDOR`, `planoPeloValor`, `PAGOS`, `FREQUENCIA` |
| `src/data/servidorFalsos.test-utils.ts` (novo) | 2 | o cenário de mentira (operadora por rota, banco em memória) |
| `src/data/servidorOperadora.test.ts` (novo) | 2 | operadora e cancelamento |
| `src/data/cobrancaServidor.test.ts` | 2 | tabela de preços e leitura pelo valor |
| `supabase/functions/_shared/assinar.ts` (novo) + `src/data/servidorAssinar.test.ts` | 3 | núcleo da `assinar` |
| `supabase/functions/_shared/gerenciarAssinatura.ts` (novo) + `src/data/servidorGerenciar.test.ts` | 4 | núcleo da `gerenciar-assinatura` |
| `supabase/functions/_shared/webhook.ts` (novo) + `src/data/servidorWebhook.test.ts` | 5, 6 | núcleo do aviso |
| `supabase/functions/_shared/bancoSupabase.ts` (novo) | 7 | o banco de verdade e `quemPede` |
| `supabase/functions/{assinar,gerenciar-assinatura,webhook-mercadopago}/index.ts` | 7 | ligação fina |
| `src/data/servidorLigacao.test.ts` (novo), `src/data/sqlCheckout.test.ts` | 7 | travas de texto da ligação; os testes de texto que viraram de comportamento saem |
| `src/domain/assinatura.ts` + teste, `src/domain/assinaturaTextos.ts` + teste | 8 | campos novos, recado da recusa, texto do cancelamento |
| `src/ui/estado/usarAssinatura.ts` + teste | 8 | `previaDoCancelamento` |
| `src/ui/conta/DialogoCancelarAssinatura.tsx`, `TelaConta.tsx` + `TelaConta.test.tsx`, `src/AppConta.test.tsx`, `src/ui/limpezaVisual.test.tsx` | 8 | janela que confere a cobrança; os mocks ganham a prévia |
| `src/ui/pagamento/processadorCartao.ts` + teste, `FormularioCartao.test.tsx` | 9 | fonte com reserva |
| `docs/pendencias.md`, `docs/decisoes.md`, `specs/checkout-proprio/SPEC.md` | 10 | registro |

---

### Tarefa 1: Banco: `009-cobranca-em-producao.sql`

Cobre o lado do banco de D-80, D-81, D-83, D-84 e D-85 (CA-393, CA-398 e CA-400).

**Files:**
- Create: `supabase/009-cobranca-em-producao.sql`
- Create: `src/data/sqlCobranca.test.ts`
- Modify: `README.md`: em "Projeto novo", o passo 3; em "Projeto já ligado", o passo 4.

**Interfaces:**
- Consumes: `public.assinaturas` (003, 005, 007, 008) e `public.assinando_agora` (008).
- Produces:
  - `assinaturas.ultima_cobranca_paga timestamptz`;
  - `assinaturas.encerrada_por text`, só com os valores `'pessoa' | 'recusa' | 'operadora'`;
  - `assinaturas.encerrada_em timestamptz`;
  - `assinando_agora.cartao_bandeira text` e `assinando_agora.cartao_final text`, com as mesmas travas do 008;
  - tabela `avisos_da_operadora`:

    | coluna | tipo e regra |
    |---|---|
    | `id` | `bigint`, identity |
    | `recebido_em` | `timestamptz`, padrão `now()` |
    | `topico` | `text`, não nulo, até 80 |
    | `recurso_id` | `text`, até 80 |
    | `assinatura_confere` | `boolean`; nulo quando a função está sem o segredo |
    | `resultado` | `text`, não nulo, até 200 |

  - índice em `recebido_em`;
  - RLS ligado e `revoke all … from anon, authenticated`;
  - nenhuma política, nenhum `grant`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/data/sqlCobranca.test.ts`:

```ts
import sql from '../../supabase/009-cobranca-em-producao.sql?raw'

const inicioDoRegistro = sql.indexOf('create table if not exists public.avisos_da_operadora (')
/** Só o bloco da tabela de avisos, para conferir que ela não guarda dado pessoal. */
const registro = sql.slice(inicioDoRegistro, sql.indexOf(');', inicioDoRegistro))

describe('banco: cobrança em produção (spec cobranca-em-producao, 009)', () => {
  it('D-83 e D-81: a data da última mensalidade paga', () => {
    expect(sql).toContain('alter table public.assinaturas add column if not exists ultima_cobranca_paga timestamptz;')
  })

  it('D-80 e CA-393: quem encerrou a assinatura (só três valores) e quando', () => {
    expect(sql).toContain("alter table public.assinaturas add column if not exists encerrada_por text check (encerrada_por in ('pessoa', 'recusa', 'operadora'));")
    expect(sql).toContain('alter table public.assinaturas add column if not exists encerrada_em timestamptz;')
  })

  it('CA-400: a reserva guarda o cartão do pedido em andamento, com as travas de assinaturas', () => {
    expect(sql).toContain('alter table public.assinando_agora add column if not exists cartao_bandeira text check (char_length(cartao_bandeira) between 1 and 40);')
    expect(sql).toContain("alter table public.assinando_agora add column if not exists cartao_final text check (cartao_final ~ '^[0-9]{4}$');")
  })

  it('D-84 e CA-398: o registro tem a hora, o tipo, o código do recurso, se a assinatura conferiu e o resultado', () => {
    expect(inicioDoRegistro).toBeGreaterThan(-1)
    expect(registro).toContain('id bigint generated always as identity primary key,')
    expect(registro).toContain('recebido_em timestamptz not null default now(),')
    expect(registro).toContain('topico text not null check (char_length(topico) <= 80),')
    expect(registro).toContain('recurso_id text check (char_length(recurso_id) <= 80),')
    expect(registro).toContain('assinatura_confere boolean,')
    expect(registro).toContain('resultado text not null check (char_length(resultado) <= 200)')
  })

  it('D-84: o registro não guarda dado pessoal', () => {
    expect(registro).not.toMatch(/email|nutricionista_id|external_reference|payer|cpf|nome|cartao/i)
  })

  it('CA-398: índice pela data de chegada, para apagar os de mais de 90 dias', () => {
    expect(sql).toContain('create index if not exists avisos_da_operadora_por_data on public.avisos_da_operadora (recebido_em);')
  })

  it('só o servidor vê o registro; nenhuma política nem permissão nova', () => {
    expect(sql).toContain('alter table public.avisos_da_operadora enable row level security;')
    expect(sql).toContain('revoke all on public.avisos_da_operadora from anon, authenticated;')
    expect(sql).not.toMatch(/create policy|grant /i)
    expect(sql).not.toMatch(/revoke[^;]*service_role/i)
  })

  it('pode rodar de novo: toda criação é "if not exists" e nada é apagado', () => {
    expect(sql).not.toMatch(/^\s*(drop|delete|truncate)\b/im)
    const criacoes = sql.split('\n').filter((linha) => /^\s*(create table|create index|alter table .* add column)/i.test(linha))
    expect(criacoes.length).toBeGreaterThanOrEqual(7)
    for (const linha of criacoes) expect(linha).toMatch(/if not exists/i)
  })

  it('a conferência depois de rodar mostra as colunas novas e o registro', () => {
    expect(sql).toMatch(/^--\s+and column_name in \('ultima_cobranca_paga', 'encerrada_por', 'encerrada_em'\)/m)
    expect(sql).toMatch(/^-- select .*'public\.avisos_da_operadora'/m)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/data/sqlCobranca.test.ts`
Expected: FAIL, porque o arquivo `009-cobranca-em-producao.sql` ainda não existe.

- [ ] **Step 3: Escrever o SQL**

Crie `supabase/009-cobranca-em-producao.sql`:

```sql
-- MetaNutri — cobrança pronta para produção (spec cobranca-em-producao, D-80 a D-85).
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Pode rodar de novo: nada é apagado.
--
-- Rode ANTES de publicar as funções assinar, gerenciar-assinatura e webhook-mercadopago desta
-- versão: elas leem e gravam estas colunas e o registro de avisos. Publicadas antes, toda
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
  -- Nulo: a função está sem o segredo do aviso e não conferiu.
  assinatura_confere boolean,
  resultado text not null check (char_length(resultado) <= 200)
);
create index if not exists avisos_da_operadora_por_data on public.avisos_da_operadora (recebido_em);
alter table public.avisos_da_operadora enable row level security;
revoke all on public.avisos_da_operadora from anon, authenticated;

-- Conferência depois de rodar (copie para uma consulta nova):
-- select column_name, data_type from information_schema.columns
--  where table_schema = 'public' and table_name = 'assinaturas'
--    and column_name in ('ultima_cobranca_paga', 'encerrada_por', 'encerrada_em');
-- -- três linhas: timestamp with time zone, text e timestamp with time zone
-- select relname, relrowsecurity from pg_class where oid = 'public.avisos_da_operadora'::regclass;
-- -- uma linha: avisos_da_operadora, true (o registro existe e só o servidor mexe nele)
--
-- Depois da primeira compra em produção (D-84), os últimos avisos:
-- select recebido_em, topico, recurso_id, assinatura_confere, resultado
--   from public.avisos_da_operadora order by recebido_em desc limit 20;
```

- [ ] **Step 4: README**

Em "Projeto novo", passo 3, troque `de 001 a 008:` por `de 001 a 009:`. Troque também o fim da lista, `` `007-painel-do-dono.sql` e `008-cartao-da-assinatura.sql`. ``, por `` `007-painel-do-dono.sql`, `008-cartao-da-assinatura.sql` e `009-cobranca-em-producao.sql`. ``.

Em "Projeto já ligado", passo 4, logo depois da frase `Rode **antes** de publicar as funções do passo 5; também pode rodar de novo.`, acrescente:

```markdown
   Depois rode `supabase/009-cobranca-em-producao.sql`: ele guarda a data da última mensalidade paga, quem encerrou a
   assinatura e quando, o cartão do pedido em andamento, e cria o registro dos avisos do Mercado Pago (spec
   cobranca-em-producao). Rode **antes** de publicar as funções do passo 5: elas leem estas colunas, e publicadas antes
   toda assinatura falha. Também pode rodar de novo.
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/data/sqlCobranca.test.ts`, que deve dar PASS. Depois, `npm run check`, que deve ficar verde.

- [ ] **Step 6: Commit**

```bash
git add supabase/009-cobranca-em-producao.sql src/data/sqlCobranca.test.ts README.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(banco): registro de avisos, última mensalidade paga e quem encerrou a assinatura`

---

### Tarefa 2: Servidor: base testável (portas, operadora, tabela de preços e falsos)

Cobre a base do D-88 e do R-39.

**Files:**
- Create: `supabase/functions/_shared/portas.ts`
- Create: `supabase/functions/_shared/operadora.ts`
- Modify: `supabase/functions/_shared/cobranca.ts` (só acrescenta; nada existente muda)
- Create: `src/data/servidorFalsos.test-utils.ts`
- Create: `src/data/servidorOperadora.test.ts`
- Modify: `src/data/cobrancaServidor.test.ts`

**Interfaces:**
- Consumes: `traduzirStatus`, `CartaoInformado`, `StatusDaAssinatura` e `UM_DIA_MS`, de `cobranca.ts`.
- Produces (`cobranca.ts`, puro; o navegador continua importando só as contas de data):

```ts
export const objeto: (valor: unknown) => Readonly<Record<string, unknown>> | null
export function dataOuNula(valor: unknown): string | null
export const tokenDoCartao: (valor: unknown) => string | null
export type PlanoAssinavel = 'solo' | 'pro'
export type CicloDaAssinatura = 'mensal' | 'anual'
export const ehCicloDaAssinatura: (valor: unknown) => valor is CicloDaAssinatura
export const PLANOS_DO_SERVIDOR: Readonly<Record<PlanoAssinavel, { readonly nome: string; readonly mensal: number; readonly anual: number }>>
export const planoAssinavel: (valor: unknown) => PlanoAssinavel | null
export const FREQUENCIA: Readonly<Record<CicloDaAssinatura, 1 | 12>>
export const PAGOS: readonly string[]
export function planoPeloValor(valor: unknown, frequencia: unknown, tipoDaFrequencia: unknown): { readonly plano: PlanoAssinavel; readonly ciclo: CicloDaAssinatura } | null
```

- Produces (`operadora.ts`):

```ts
export const API_DA_OPERADORA = 'https://api.mercadopago.com'
export interface PrazosDaOperadora { readonly prazoMs: number; readonly prazoDoPostMs: number }
export function criarOperadora(token: string, prazos: PrazosDaOperadora, buscar?: typeof fetch): Operadora
export function cancelarNaOperadora(operadora: Operadora, id: string): Promise<boolean>
```

- Produces (`portas.ts`): o arquivo inteiro do Step 3.
- Produces (`servidorFalsos.test-utils.ts`): `AGORA`, `CARTAO`, `responde`, `linhaDe`, `cenario`, `LinhaGuardada` e `PedidoFeito`.

- [ ] **Step 1: Escrever os testes que falham**

Em `src/data/cobrancaServidor.test.ts`, some ao import de `../../supabase/functions/_shared/cobranca.ts` os nomes `dataOuNula, objeto, planoAssinavel, planoPeloValor, PLANOS_DO_SERVIDOR, tokenDoCartao`. Some também `import { PLANOS } from '@/domain/conta.ts'`. Depois acrescente:

```ts
describe('a tabela de preços do servidor (spec cobranca-em-producao)', () => {
  it('CA-375: o servidor cobra o mesmo preço que a página de Preços mostra', () => {
    for (const id of ['solo', 'pro'] as const) {
      const daTela = PLANOS.find((p) => p.id === id)
      expect(PLANOS_DO_SERVIDOR[id].mensal).toBe(daTela?.mensal)
      expect(PLANOS_DO_SERVIDOR[id].anual).toBe(daTela?.anual)
    }
  })

  it('o plano só vale se for chave da própria tabela', () => {
    expect(planoAssinavel('solo')).toBe('solo')
    expect(planoAssinavel('constructor')).toBeNull()
    expect(planoAssinavel('clinica')).toBeNull()
    expect(planoAssinavel(1)).toBeNull()
  })

  it('D-85: acha o plano e o ciclo pelo valor e pela frequência', () => {
    expect(planoPeloValor(34.9, 1, 'months')).toEqual({ plano: 'solo', ciclo: 'mensal' })
    expect(planoPeloValor(299, 12, 'months')).toEqual({ plano: 'solo', ciclo: 'anual' })
    expect(planoPeloValor(64.9, 1, 'months')).toEqual({ plano: 'pro', ciclo: 'mensal' })
    expect(planoPeloValor(599, 12, undefined)).toEqual({ plano: 'pro', ciclo: 'anual' })
    expect(planoPeloValor(34.900000000001, 1, 'months')).toEqual({ plano: 'solo', ciclo: 'mensal' })
  })

  it('D-85: valor ou frequência sem plano não adivinha', () => {
    expect(planoPeloValor(34.9, 12, 'months')).toBeNull()
    expect(planoPeloValor(10, 1, 'months')).toBeNull()
    expect(planoPeloValor('34.9', 1, 'months')).toBeNull()
    expect(planoPeloValor(34.9, 1, 'days')).toBeNull()
    expect(planoPeloValor(34.9, 3, 'months')).toBeNull()
  })

  it('R-39: nenhum par de planos tem o mesmo valor no mesmo ciclo (senão a adoção não acharia o plano)', () => {
    for (const ciclo of ['mensal', 'anual'] as const) {
      const valores = Object.values(PLANOS_DO_SERVIDOR).map((p) => Math.round(p[ciclo] * 100))
      expect(new Set(valores).size).toBe(valores.length)
    }
  })

  it('lê o que vem de fora sem confiar no formato', () => {
    expect(objeto({ a: 1 })).toEqual({ a: 1 })
    expect(objeto([1])).toBeNull()
    expect(objeto(null)).toBeNull()
    expect(dataOuNula('2026-11-06T13:00:00Z')).toBe('2026-11-06T13:00:00.000Z')
    expect(dataOuNula('ontem')).toBeNull()
    expect(tokenDoCartao('tok_teste_12345')).toBe('tok_teste_12345')
    expect(tokenDoCartao('curto')).toBeNull()
    expect(tokenDoCartao('tem espaço e é longo')).toBeNull()
  })
})
```

Crie `src/data/servidorOperadora.test.ts`:

```ts
// @vitest-environment node
import { cancelarNaOperadora, criarOperadora } from '../../supabase/functions/_shared/operadora.ts'
import { cenario, responde } from './servidorFalsos.test-utils.ts'

describe('a operadora de verdade (fetch padrão, D-88)', () => {
  it('manda o token, o corpo em JSON e o prazo; o POST tem o prazo maior', async () => {
    const prazo = vi.spyOn(AbortSignal, 'timeout')
    const buscar = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ id: 'pre-1', status: 'authorized' }), { status: 201 }))
    const operadora = criarOperadora('tok-servidor', { prazoMs: 10_000, prazoDoPostMs: 30_000 }, buscar)
    expect(await operadora('POST', '/preapproval', { reason: 'x' })).toEqual({ ok: true, status: 201, dados: { id: 'pre-1', status: 'authorized' } })
    expect(buscar.mock.calls[0]?.[0]).toBe('https://api.mercadopago.com/preapproval')
    expect(buscar.mock.calls[0]?.[1]).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer tok-servidor', 'Content-Type': 'application/json' }, body: '{"reason":"x"}' })
    expect(prazo).toHaveBeenLastCalledWith(30_000)
    await operadora('GET', '/preapproval/pre-1')
    expect(prazo).toHaveBeenLastCalledWith(10_000)
    expect(buscar.mock.calls[1]?.[1]).not.toHaveProperty('body')
    prazo.mockRestore()
  })

  it('sem resposta (rede caída ou prazo estourado) é null', async () => {
    const operadora = criarOperadora('t', { prazoMs: 1, prazoDoPostMs: 1 }, vi.fn<typeof fetch>(async () => { throw new TypeError('fetch failed') }))
    expect(await operadora('GET', '/preapproval/x')).toBeNull()
  })

  it('corpo que não é objeto JSON vira dados nulos, e o erro da operadora volta com o status', async () => {
    const lista = criarOperadora('t', { prazoMs: 1, prazoDoPostMs: 1 }, vi.fn<typeof fetch>(async () => new Response('[1]', { status: 200 })))
    expect(await lista('GET', '/x')).toEqual({ ok: true, status: 200, dados: null })
    const texto = criarOperadora('t', { prazoMs: 1, prazoDoPostMs: 1 }, vi.fn<typeof fetch>(async () => new Response('erro', { status: 502 })))
    expect(await texto('GET', '/x')).toEqual({ ok: false, status: 502, dados: null })
  })
})

describe('cancelar na operadora (o mesmo nas três funções)', () => {
  const PUT = 'PUT /preapproval/pre-1'
  const GET = 'GET /preapproval/pre-1'

  it('"cancelled" aceito: um pedido só', async () => {
    const c = cenario([], { [PUT]: [responde(200)] })
    expect(await cancelarNaOperadora(c.operadora, 'pre-1')).toBe(true)
    expect(c.pedidos).toEqual([{ metodo: 'PUT', caminho: '/preapproval/pre-1', corpo: { status: 'cancelled' } }])
  })

  it('a palavra recusada (4xx): tenta "canceled", como a documentação em português escreve', async () => {
    const c = cenario([], { [PUT]: [responde(400), responde(200)] })
    expect(await cancelarNaOperadora(c.operadora, 'pre-1')).toBe(true)
    expect(c.pedidos.map((p) => p.corpo)).toEqual([{ status: 'cancelled' }, { status: 'canceled' }])
  })

  it('CB-93: as duas recusadas, mas a leitura diz cancelada (a resposta se perdeu): conta como cancelada', async () => {
    const c = cenario([], { [PUT]: [responde(400)], [GET]: [responde(200, { status: 'cancelled' })] })
    expect(await cancelarNaOperadora(c.operadora, 'pre-1')).toBe(true)
  })

  it('sem resposta e sem leitura: não cancelou', async () => {
    const c = cenario()
    expect(await cancelarNaOperadora(c.operadora, 'pre-1')).toBe(false)
  })

  it('401/403 é a nossa credencial: não tenta a outra palavra', async () => {
    const c = cenario([], { [PUT]: [responde(401)], [GET]: [responde(401)] })
    expect(await cancelarNaOperadora(c.operadora, 'pre-1')).toBe(false)
    expect(c.pedidos.filter((p) => p.metodo === 'PUT')).toHaveLength(1)
  })

  it('o id vai codificado no caminho: um aviso forjado não navega pela API', async () => {
    const c = cenario()
    await cancelarNaOperadora(c.operadora, '../v1/payments')
    expect(c.pedidos[0]?.caminho).toBe('/preapproval/..%2Fv1%2Fpayments')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/data/cobrancaServidor.test.ts src/data/servidorOperadora.test.ts`
Expected: FAIL, porque faltam os nomes novos, o `operadora.ts` e os falsos.

- [ ] **Step 3: `portas.ts`**

```ts
// O que os núcleos das funções de cobrança recebem de fora (spec cobranca-em-producao, D-88): a
// operadora, o banco, o relógio e o registro. O index.ts de cada função liga os de verdade; os testes,
// os de mentira (src/data/servidorFalsos.test-utils.ts). Só tipos e a forma das respostas: sem Deno e sem rede.
import type { CartaoInformado, CicloDaAssinatura, PlanoAssinavel, StatusDaAssinatura } from './cobranca.ts'

export interface RespostaDaOperadora {
  readonly ok: boolean
  readonly status: number
  /** O corpo, quando é um objeto JSON; senão nulo. */
  readonly dados: Readonly<Record<string, unknown>> | null
}

/** Um pedido à API da operadora. `null` é sem resposta: rede caída ou prazo estourado. */
export type Operadora = (metodo: 'GET' | 'POST' | 'PUT', caminho: string, corpo?: Readonly<Record<string, unknown>>) => Promise<RespostaDaOperadora | null>

export interface FalhaDoBanco {
  readonly mensagem: string
  /** O código do Postgres; '23505' é chave repetida. */
  readonly codigo: string | null
}

export type EncerradaPor = 'pessoa' | 'recusa' | 'operadora'

/** A linha de public.assinaturas, só com as colunas que os núcleos leem. */
export interface LinhaDaAssinatura {
  readonly nutricionista_id: string
  readonly plano: string
  readonly status: string
  readonly ciclo: string | null
  readonly preapproval_id: string | null
  readonly cartao_final: string | null
  readonly proxima_cobranca: string | null
  readonly expira_em: string | null
  readonly ultima_cobranca_paga: string | null
  readonly encerrada_por: string | null
}

/** A assinatura nova, gravada por cima da linha da conta (upsert). Zera o que era da anterior (D-81). */
export interface NovaAssinatura {
  readonly nutricionista_id: string
  readonly plano: PlanoAssinavel
  readonly status: StatusDaAssinatura
  readonly preapproval_id: string
  readonly valor_centavos: number
  readonly ciclo: CicloDaAssinatura
  readonly expira_em: null
  readonly cartao_bandeira: string | null
  readonly cartao_final: string | null
  readonly proxima_cobranca: string
  readonly ultima_cobranca_paga: null
  readonly encerrada_por: null
  readonly encerrada_em: null
  readonly atualizado_em: string
}

/** O que muda numa linha que já existe. Só vai o que está aqui. */
export interface MudancaDaAssinatura {
  readonly status?: StatusDaAssinatura
  readonly proxima_cobranca?: string
  readonly expira_em?: string | null
  readonly ultima_cobranca_paga?: string
  readonly encerrada_por?: EncerradaPor
  readonly encerrada_em?: string
  readonly cartao_bandeira?: string
  readonly cartao_final?: string
  readonly atualizado_em: string
}

/** Uma linha do registro de avisos (D-84). Sem dado pessoal. */
export interface AvisoAnotado {
  readonly topico: string
  readonly recurso_id: string | null
  /** Nulo: a função está sem o segredo do aviso e não conferiu. */
  readonly assinatura_confere: boolean | null
  readonly resultado: string
}

export interface CartaoDaReserva {
  readonly cartao_bandeira: string | null
  readonly cartao_final: string | null
}

export interface LeituraDaLinha {
  readonly linha: LinhaDaAssinatura | null
  readonly falha: FalhaDoBanco | null
}

/** As consultas das três funções. Nenhuma lança: a falha volta no resultado, como no supabase-js. */
export interface BancoDaCobranca {
  /** A linha da conta (uma por conta). */
  lerDaConta(conta: string): Promise<LeituraDaLinha>
  /** A linha que tem esta assinatura da operadora (`preapproval_id` é único). */
  lerDaOperadora(preapprovalId: string): Promise<LeituraDaLinha>
  /** Upsert pela conta. */
  gravar(nova: NovaAssinatura): Promise<FalhaDoBanco | null>
  /** Só a linha desta conta com esta assinatura; diz quantas linhas mudaram. */
  mudar(conta: string, preapprovalId: string, mudanca: MudancaDaAssinatura): Promise<{ readonly linhas: number; readonly falha: FalhaDoBanco | null }>
  /** Apaga a reserva desta conta feita antes de `antesDe` (função que morreu no meio). */
  soltarReservaVencida(conta: string, antesDe: string): Promise<FalhaDoBanco | null>
  /** Reserva a conta com o cartão do pedido; já reservada volta com o código '23505'. */
  reservar(conta: string, cartao: CartaoInformado): Promise<FalhaDoBanco | null>
  /** O cartão da reserva desta conta, se houver. Falha de leitura conta como "não há". */
  lerReserva(conta: string): Promise<CartaoDaReserva | null>
  soltarReserva(conta: string): Promise<FalhaDoBanco | null>
  anotarAviso(aviso: AvisoAnotado): Promise<FalhaDoBanco | null>
  /** Apaga do registro os avisos recebidos antes de `data` (CA-398). */
  apagarAvisosAntesDe(data: string): Promise<FalhaDoBanco | null>
}

/** Quem pede, lido do token da sessão. */
export interface ContaQuePede {
  readonly id: string
  readonly email: string | null
}

/** O registro da função (no Deno, console.error). Nunca recebe o código do cartão, o e-mail nem o corpo do pedido. */
export type Registro = (...partes: readonly unknown[]) => void

/** O que assinar e gerenciar-assinatura respondem; o index.ts transforma em Response. */
export interface RespostaDaFuncao {
  readonly status: number
  readonly corpo: Readonly<Record<string, unknown>>
}

export const respostaDeErro = (mensagem: string, status: number, codigo?: string): RespostaDaFuncao => ({
  status,
  corpo: codigo ? { erro: mensagem, codigo } : { erro: mensagem },
})
```

- [ ] **Step 4: `cobranca.ts`, o que entra**

Acrescente depois de `lerCartao`. A tabela de preços sai da `assinar/index.ts`; ela continua lá até a Tarefa 7:

```ts
/** O valor, se for um objeto JSON (não lista); senão nulo. Tudo o que vem da operadora passa por aqui. */
export const objeto = (valor: unknown): Readonly<Record<string, unknown>> | null =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor) ? (valor as Record<string, unknown>) : null

/** A data em ISO, se for data de verdade; senão nulo. */
export function dataOuNula(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const ms = Date.parse(valor)
  return Number.isNaN(ms) ? null : new Date(ms).toISOString()
}

/** O código de uso único do cartão, se tiver o formato que a operadora usa. */
export const tokenDoCartao = (valor: unknown): string | null => (typeof valor === 'string' && /^[A-Za-z0-9_-]{8,200}$/.test(valor) ? valor : null)

export type PlanoAssinavel = 'solo' | 'pro'
export type CicloDaAssinatura = 'mensal' | 'anual'
export const ehCicloDaAssinatura = (valor: unknown): valor is CicloDaAssinatura => valor === 'mensal' || valor === 'anual'

/**
 * Os planos que se assina pelo site, com o preço que o servidor considera verdade (CA-375). Igual à
 * página de Preços (src/domain/conta.ts): um teste confere.
 */
export const PLANOS_DO_SERVIDOR: Readonly<Record<PlanoAssinavel, { readonly nome: string; readonly mensal: number; readonly anual: number }>> = {
  solo: { nome: 'MetaNutri Solo', mensal: 34.9, anual: 299 },
  pro: { nome: 'MetaNutri Pro', mensal: 64.9, anual: 599 },
}

/** O plano, só se for chave da própria tabela: "constructor" ou "toString" não sobem pelo protótipo. */
export const planoAssinavel = (valor: unknown): PlanoAssinavel | null =>
  typeof valor === 'string' && Object.hasOwn(PLANOS_DO_SERVIDOR, valor) ? (valor as PlanoAssinavel) : null

/** A frequência, em meses, que a operadora usa para cada ciclo. */
export const FREQUENCIA: Readonly<Record<CicloDaAssinatura, 1 | 12>> = { mensal: 1, anual: 12 }

/** Os planos que se paga: com um deles ativo, a conta já tem assinatura paga. */
export const PAGOS: readonly string[] = ['solo', 'pro', 'clinica']

/**
 * D-85 e R-39: o plano e o ciclo de uma assinatura pelo valor e pela frequência. Só acha se um único
 * plano da tabela tiver esse valor nesse ciclo; nenhum ou mais de um é nulo (não adota por palpite).
 */
export function planoPeloValor(valor: unknown, frequencia: unknown, tipoDaFrequencia: unknown): { readonly plano: PlanoAssinavel; readonly ciclo: CicloDaAssinatura } | null {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return null
  if (tipoDaFrequencia !== undefined && tipoDaFrequencia !== 'months') return null
  const ciclo: CicloDaAssinatura | null = frequencia === 1 ? 'mensal' : frequencia === 12 ? 'anual' : null
  if (!ciclo) return null
  const centavos = Math.round(valor * 100)
  const achados = (Object.keys(PLANOS_DO_SERVIDOR) as PlanoAssinavel[]).filter((p) => Math.round(PLANOS_DO_SERVIDOR[p][ciclo] * 100) === centavos)
  const [plano] = achados
  return achados.length === 1 && plano ? { plano, ciclo } : null
}
```

Atualize o comentário do topo do arquivo: além das datas, ele passa a ter a tabela de preços e as leituras que as três funções fazem igual.

- [ ] **Step 5: `operadora.ts`**

```ts
// O caminho até a API da operadora de pagamento (Mercado Pago) e o cancelamento que as três funções
// fazem igual (spec cobranca-em-producao, D-88). Usa só o fetch padrão: roda no Deno e no Node, e o
// Vitest testa com um fetch de mentira (src/data/servidorOperadora.test.ts).
import { objeto, traduzirStatus } from './cobranca.ts'
import type { Operadora } from './portas.ts'

export const API_DA_OPERADORA = 'https://api.mercadopago.com'

export interface PrazosDaOperadora {
  /** GET e PUT. */
  readonly prazoMs: number
  /** POST (criar a assinatura): o banco confere o cartão nesse tempo. */
  readonly prazoDoPostMs: number
}

export function criarOperadora(token: string, prazos: PrazosDaOperadora, buscar: typeof fetch = fetch): Operadora {
  return async (metodo, caminho, corpo) => {
    try {
      const resposta = await buscar(`${API_DA_OPERADORA}${caminho}`, {
        method: metodo,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(corpo ? { body: JSON.stringify(corpo) } : {}),
        signal: AbortSignal.timeout(metodo === 'POST' ? prazos.prazoDoPostMs : prazos.prazoMs),
      })
      const dados: unknown = await resposta.json().catch(() => null)
      return { ok: resposta.ok, status: resposta.status, dados: objeto(dados) }
    } catch {
      return null
    }
  }
}

/**
 * Cancela a assinatura na operadora e diz se ela ficou cancelada lá. Pede com "cancelled". Se a
 * operadora recusar a palavra (4xx que não é a nossa credencial), pede com "canceled", como a
 * documentação em português escreve. Sem sucesso, lê de novo: a resposta pode ter se perdido com o
 * cancelamento feito (CB-93).
 */
export async function cancelarNaOperadora(operadora: Operadora, id: string): Promise<boolean> {
  const caminho = `/preapproval/${encodeURIComponent(id)}`
  let feito = await operadora('PUT', caminho, { status: 'cancelled' })
  if (feito && !feito.ok && feito.status < 500 && feito.status !== 401 && feito.status !== 403) feito = await operadora('PUT', caminho, { status: 'canceled' })
  if (feito?.ok) return true
  const conferida = await operadora('GET', caminho)
  return conferida?.ok === true && traduzirStatus(conferida.dados?.['status']) === 'cancelada'
}
```

- [ ] **Step 6: Os falsos (`src/data/servidorFalsos.test-utils.ts`)**

```ts
// A operadora e o banco de mentira dos testes do servidor (spec cobranca-em-producao, D-88).
// O nome não termina em `.test.ts`, então o Vitest não roda este arquivo como teste.
import type { CartaoInformado } from '../../supabase/functions/_shared/cobranca.ts'
import type {
  AvisoAnotado,
  BancoDaCobranca,
  CartaoDaReserva,
  FalhaDoBanco,
  LinhaDaAssinatura,
  Operadora,
  Registro,
  RespostaDaOperadora,
} from '../../supabase/functions/_shared/portas.ts'

/** 6/10/2026, 12h em Brasília. */
export const AGORA = new Date('2026-10-06T15:00:00.000Z')
export const CARTAO: CartaoInformado = { bandeira: 'Mastercard', final: '6351' }

export const responde = (status: number, dados: Readonly<Record<string, unknown>> | null = {}): RespostaDaOperadora => ({
  ok: status >= 200 && status < 300,
  status,
  dados,
})

export interface PedidoFeito {
  readonly metodo: 'GET' | 'POST' | 'PUT'
  readonly caminho: string
  readonly corpo: Readonly<Record<string, unknown>> | undefined
}

/** O que o banco de mentira guarda por conta: a linha que os núcleos leem e o resto que foi gravado nela. */
export type LinhaGuardada = LinhaDaAssinatura & {
  readonly valor_centavos?: number
  readonly cartao_bandeira?: string | null
  readonly encerrada_em?: string | null
  readonly atualizado_em?: string
}

type LinhaParcial = Partial<LinhaDaAssinatura> & { readonly nutricionista_id: string }

export const linhaDe = (parcial: LinhaParcial): LinhaGuardada => ({
  plano: 'free',
  status: 'pendente',
  ciclo: null,
  preapproval_id: null,
  cartao_final: null,
  proxima_cobranca: null,
  expira_em: null,
  ultima_cobranca_paga: null,
  encerrada_por: null,
  ...parcial,
})

/**
 * Um cenário de teste com três peças:
 * - o banco, guardado em memória;
 * - a operadora, que responde pela rota ("PUT /preapproval/pre-1"): cada rota tem uma lista de
 *   respostas, cada pedido tira a primeira e a última fica valendo; rota sem lista, ou `null` na
 *   lista, é rede caída;
 * - o registro.
 * `ordem` guarda, em sequência, cada consulta ao banco e cada pedido à operadora.
 */
export function cenario(linhas: readonly LinhaParcial[] = [], rotas: Readonly<Record<string, readonly (RespostaDaOperadora | null)[]>> = {}) {
  const ordem: string[] = []
  const pedidos: PedidoFeito[] = []
  const filas = new Map(Object.entries(rotas).map(([rota, respostas]): [string, (RespostaDaOperadora | null)[]] => [rota, [...respostas]]))
  const operadora: Operadora = async (metodo, caminho, corpo) => {
    pedidos.push({ metodo, caminho, corpo })
    ordem.push(`${metodo} ${caminho}`)
    const fila = filas.get(`${metodo} ${caminho}`) ?? []
    return (fila.length > 1 ? fila.shift() : fila[0]) ?? null
  }

  const assinaturas = new Map<string, LinhaGuardada>(linhas.map((l) => [l.nutricionista_id, linhaDe(l)]))
  const reservas = new Map<string, { readonly desde: string } & CartaoDaReserva>()
  const avisos: AvisoAnotado[] = []
  const apagadosAntesDe: string[] = []
  const falhas = new Map<keyof BancoDaCobranca, { restam: number; readonly falha: FalhaDoBanco }>()
  /** Anota a consulta e diz se ela deve falhar desta vez. */
  const consultar = (nome: keyof BancoDaCobranca): FalhaDoBanco | null => {
    ordem.push(nome)
    const marcada = falhas.get(nome)
    if (!marcada || marcada.restam <= 0) return null
    marcada.restam -= 1
    return marcada.falha
  }

  const banco: BancoDaCobranca = {
    async lerDaConta(conta) {
      const falha = consultar('lerDaConta')
      return { linha: falha ? null : (assinaturas.get(conta) ?? null), falha }
    },
    async lerDaOperadora(preapprovalId) {
      const falha = consultar('lerDaOperadora')
      return { linha: falha ? null : ([...assinaturas.values()].find((l) => l.preapproval_id === preapprovalId) ?? null), falha }
    },
    async gravar(nova) {
      const falha = consultar('gravar')
      if (!falha) assinaturas.set(nova.nutricionista_id, { ...assinaturas.get(nova.nutricionista_id), ...nova })
      return falha
    },
    async mudar(conta, preapprovalId, mudanca) {
      const falha = consultar('mudar')
      const linha = assinaturas.get(conta)
      if (falha || !linha || linha.preapproval_id !== preapprovalId) return { linhas: 0, falha }
      assinaturas.set(conta, { ...linha, ...mudanca })
      return { linhas: 1, falha: null }
    },
    async soltarReservaVencida(conta, antesDe) {
      const falha = consultar('soltarReservaVencida')
      const reserva = reservas.get(conta)
      if (!falha && reserva && reserva.desde < antesDe) reservas.delete(conta)
      return falha
    },
    async reservar(conta, cartao) {
      const falha = consultar('reservar')
      if (falha) return falha
      if (reservas.has(conta)) return { mensagem: 'duplicate key value violates unique constraint', codigo: '23505' }
      reservas.set(conta, { desde: AGORA.toISOString(), cartao_bandeira: cartao.bandeira, cartao_final: cartao.final })
      return null
    },
    async lerReserva(conta) {
      const reserva = consultar('lerReserva') ? undefined : reservas.get(conta)
      return reserva ? { cartao_bandeira: reserva.cartao_bandeira, cartao_final: reserva.cartao_final } : null
    },
    async soltarReserva(conta) {
      const falha = consultar('soltarReserva')
      if (!falha) reservas.delete(conta)
      return falha
    },
    async anotarAviso(aviso) {
      const falha = consultar('anotarAviso')
      if (!falha) avisos.push(aviso)
      return falha
    },
    async apagarAvisosAntesDe(data) {
      const falha = consultar('apagarAvisosAntesDe')
      if (!falha) apagadosAntesDe.push(data)
      return falha
    },
  }

  const log = vi.fn<Registro>()
  const agora = () => AGORA
  return {
    operadora,
    pedidos,
    banco,
    assinaturas,
    reservas,
    avisos,
    apagadosAntesDe,
    ordem,
    log,
    /** As dependências de assinar e gerenciar-assinatura; o webhook acrescenta `segredo`. */
    deps: { operadora, banco, agora, log },
    /** A consulta falha `vezes` vezes (padrão: sempre). */
    falhar: (nome: keyof BancoDaCobranca, vezes = Number.POSITIVE_INFINITY, falha: FalhaDoBanco = { mensagem: 'banco fora', codigo: null }) => {
      falhas.set(nome, { restam: vezes, falha })
    },
    /** Uma reserva já feita, como se outro pedido de assinar estivesse em andamento. */
    comReserva: (conta: string, desde = AGORA.toISOString(), cartao: CartaoInformado = CARTAO) => {
      reservas.set(conta, { desde, cartao_bandeira: cartao.bandeira, cartao_final: cartao.final })
    },
  }
}

export type Cenario = ReturnType<typeof cenario>
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run src/data/cobrancaServidor.test.ts src/data/servidorOperadora.test.ts`, que deve dar PASS. Depois, `npm run check`, que deve ficar verde.

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/_shared/portas.ts supabase/functions/_shared/operadora.ts supabase/functions/_shared/cobranca.ts src/data/servidorFalsos.test-utils.ts src/data/servidorOperadora.test.ts src/data/cobrancaServidor.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `refactor(servidor): base testável das funções de cobrança (operadora, banco e preços por interface)`

---

### Tarefa 3: Servidor: núcleo da `assinar`

Cobre D-85 (na `assinar`) e D-86, mais os comportamentos que já existiam (D-68, D-70, CA-373, CA-375, CB-91, CB-95, C1), agora executados. Critérios: CA-402, CA-403, CA-405 e CB-99.

**Files:**
- Create: `supabase/functions/_shared/assinar.ts`
- Create: `src/data/servidorAssinar.test.ts`

**Interfaces:**
- Consumes: Tarefa 2.
- Produces:

```ts
export const RESERVA_VENCE_MS: number // 5 * 60_000
export const FOLGA_DA_BUSCA_MS: number // 2 * 60_000
export const EM_ANDAMENTO: string, JA_ASSINA: string, ANDAMENTO_NA_CONTA: string
export interface PedidoDeAssinatura { readonly conta: ContaQuePede | null; readonly corpo: unknown; readonly site: string }
export interface DependenciasDeAssinar {
  readonly operadora: Operadora
  readonly banco: Pick<BancoDaCobranca, 'lerDaConta' | 'gravar' | 'soltarReservaVencida' | 'reservar' | 'soltarReserva'>
  readonly agora: () => Date
  readonly log: Registro
}
export interface AssinaturaNaOperadora { readonly id: string; readonly dados: Readonly<Record<string, unknown>> }
export interface AlvoDaBusca { readonly email: string; readonly conta: string; readonly valor: number; readonly frequencia: 1 | 12; readonly desde: number }
export function procurarAssinaturaRecente(operadora: Operadora, alvo: AlvoDaBusca): Promise<AssinaturaNaOperadora | null>
export function assinar(pedido: PedidoDeAssinatura, deps: DependenciasDeAssinar): Promise<RespostaDaFuncao>
```

O contrato com o navegador não muda:

| Situação | Resposta |
|---|---|
| assinou | `200 { status: 'ativa' \| 'pendente', proximaCobranca, cartao }` |
| recusa | `402 { erro, codigo }` |
| já assina, em andamento ou reservada | `409` |
| corpo, plano ou cartão inválido | `400` |
| sem sessão | `401` |
| operadora fora, gravação falhou ou não achou | `502` |

- [ ] **Step 1: Escrever os testes que falham**

Crie `src/data/servidorAssinar.test.ts` com `// @vitest-environment node` na primeira linha e esta base:

```ts
import { ANDAMENTO_NA_CONTA, assinar, EM_ANDAMENTO, JA_ASSINA, type PedidoDeAssinatura } from '../../supabase/functions/_shared/assinar.ts'
import { RECUSA_PADRAO, SEM_COBRANCA } from '../../supabase/functions/_shared/cobranca.ts'
import { AGORA, CARTAO, cenario, responde } from './servidorFalsos.test-utils.ts'

const TOKEN = 'tok_teste_12345'
const CORPO = { plano: 'solo', ciclo: 'mensal', card_token_id: TOKEN, cartao: { bandeira: 'Mastercard', final: '6351' } }
const PEDIDO: PedidoDeAssinatura = { conta: { id: 'u1', email: 'ana@exemplo.com' }, corpo: CORPO, site: 'https://metanutri.com.br/' }
const POST = 'POST /preapproval'
const BUSCA = 'GET /preapproval/search?payer_email=ana%40exemplo.com&limit=50'
const CRIADA = { id: 'pre-1', status: 'authorized', next_payment_date: '2026-11-06T15:00:00.000Z' }
/** Um resultado da busca: desta conta, Solo mensal, nascido 5 s depois do começo do pedido. */
const ACHADA = { ...CRIADA, external_reference: 'u1', date_created: '2026-10-06T15:00:05.000Z', auto_recurring: { transaction_amount: 34.9, frequency: 1 } }
```

Os testes, nesta ordem (nome do `it` → o que confere):

1. **`CA-405 e CA-375: assina com o preço da tabela, já autorizada, grava a linha e devolve só o status, a próxima cobrança e o cartão`**
   - Cenário: `{ [POST]: [responde(201, CRIADA)] }`, com o corpo `{ ...CORPO, valor: 1, transaction_amount: 1 }`.
   - Resposta: `{ status: 200, corpo: { status: 'ativa', proximaCobranca: '2026-11-06T15:00:00.000Z', cartao: CARTAO } }`.
   - `c.pedidos[0]` é exatamente `{ metodo: 'POST', caminho: '/preapproval', corpo: { reason: 'MetaNutri Solo (mensal)', external_reference: 'u1', payer_email: 'ana@exemplo.com', card_token_id: TOKEN, status: 'authorized', back_url: 'https://metanutri.com.br/', auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: 34.9, currency_id: 'BRL' } } }`.
   - `c.assinaturas.get('u1')` é exatamente `{ nutricionista_id: 'u1', plano: 'solo', status: 'ativa', preapproval_id: 'pre-1', valor_centavos: 3490, ciclo: 'mensal', expira_em: null, cartao_bandeira: 'Mastercard', cartao_final: '6351', proxima_cobranca: '2026-11-06T15:00:00.000Z', ultima_cobranca_paga: null, encerrada_por: null, encerrada_em: null, atualizado_em: AGORA.toISOString() }`.
   - `c.reservas.has('u1')` é `false`.
2. **`Pro anual: 599 a cada 12 meses`**
   - O `auto_recurring` enviado é `{ frequency: 12, …, transaction_amount: 599 }`, o `reason` é `'MetaNutri Pro (anual)'` e `valor_centavos` é `59900`.
3. **`a data de hoje é a primeira cobrança: sem data depois de amanhã, a próxima é a prevista (6/11)`**
   - Com `next_payment_date: '2026-10-06T16:00:00.000Z'`, a `proximaCobranca` é `'2026-11-06T15:00:00.000Z'`.
4. **`401 sem sessão ou sem e-mail; 400 com corpo, plano ou cartão inválidos; nada é reservado nem pedido`**
   - `it.each` com estes casos:
     - `conta: null` → 401 `'Entre na sua conta antes de assinar.'`;
     - `email: null` → 401;
     - `corpo: null` → 400 `'Corpo da requisição inválido.'`;
     - `plano: 'constructor'` → 400 `'Plano desconhecido.'`;
     - `plano: 'clinica'` → 400;
     - sem `card_token_id` → 400 `'Faltam os dados do cartão. Confira e tente de novo.'`;
     - `cartao: { bandeira: 'Visa', final: '12' }` → 400.
   - Em todos, `c.ordem` fica `[]`.
5. **`CB-91: conta com Solo, Pro ou Clínica ativa leva 409 sem chamar a operadora, e a reserva é solta`**
   - `it.each(['solo', 'pro', 'clinica'])`: a resposta é `409 { erro: JA_ASSINA }`, nenhum pedido sai e `c.reservas.size` fica 0.
6. **`pendente ou pausada do fluxo do cartão leva 409; a do fluxo antigo (sem cartão) assina`**
   - Linha pendente com `preapproval_id: 'pre-0'` e `cartao_final: '1111'` → 409 `ANDAMENTO_NA_CONTA`.
   - A mesma linha com `cartao_final: null` → 200.
7. **`CA-380 e CB-95: cancelada (no prazo ou não) e Estudante ativo assinam; a linha nova não vence por data`**
   - Linha `estudante` ativa com `expira_em` → 200 e `expira_em: null`.
8. **`C1: outra aba já reservou: 409 sem ler a assinatura nem chamar a operadora`**
   - Com `c.comReserva('u1')`: a resposta é `409 { erro: EM_ANDAMENTO }` e `c.ordem` é `['soltarReservaVencida', 'reservar']`.
9. **`C1: a reserva vencida sai antes de reservar; a ordem é soltar a vencida, reservar, ler, pedir, gravar e soltar`**
   - Com `c.comReserva('u1', '2026-10-06T14:54:00.000Z')`, que é anterior a AGORA − 5 min: 200.
   - `c.ordem` é `['soltarReservaVencida', 'reservar', 'lerDaConta', 'POST /preapproval', 'gravar', 'soltarReserva']`.
10. **`outra falha ao reservar: 502 sem cobrar`**
    - Com `c.falhar('reservar')`: `502 { erro: SEM_COBRANCA }` e nenhum pedido sai.
11. **`CA-373 e CA-405: a recusa do banco vira 402 com o código; nada é gravado e a reserva é solta`**
    - `[POST]: [responde(400, { message: 'cc_rejected_insufficient_amount' })]` → `402 { erro: RECUSA_PADRAO, codigo: 'cc_rejected_insufficient_amount' }`.
    - `c.assinaturas.size` fica 0 e nenhum `GET` de busca sai.
12. **`401, 403 ou 429 da operadora não é o cartão: 502, sem procurar nem gravar`**
    - `it.each([401, 403, 429])`.
13. **`CA-402, CB-99 e CA-405: sem resposta ao pedir, procura pelo e-mail, confere a conta, o valor e a hora, e segue com a achada`**

    ```ts
    const c = cenario([], {
      [POST]: [null],
      [BUSCA]: [responde(200, { results: [
        { ...ACHADA, id: 'pre-outra-conta', external_reference: 'u2' },
        { ...ACHADA, id: 'pre-antiga', date_created: '2026-10-06T14:50:00.000Z' },
        { ...ACHADA, id: 'pre-outro-valor', auto_recurring: { transaction_amount: 64.9, frequency: 1 } },
        ACHADA,
      ] })],
    })
    expect(await assinar(PEDIDO, c.deps)).toEqual({ status: 200, corpo: { status: 'ativa', proximaCobranca: '2026-11-06T15:00:00.000Z', cartao: CARTAO } })
    expect(c.assinaturas.get('u1')).toMatchObject({ preapproval_id: 'pre-1', status: 'ativa', cartao_final: '6351' })
    expect(c.reservas.has('u1')).toBe(false)
    ```

14. **`CA-402: erro do lado da operadora (5xx) ou sucesso sem id também procuram`**
    - `it.each([responde(502), responde(201, { status: 'authorized' })])`: com a busca achando `ACHADA`, a resposta é 200.
15. **`CA-402: não achando, responde servidor fora (CA-374); nada é gravado e a reserva fica para o aviso adotar com o cartão`**
    - `[POST]: [null]` e `[BUSCA]: [responde(200, { results: [] })]` → `502 { erro: SEM_COBRANCA }`.
    - `c.assinaturas.size` fica 0.
    - `c.reservas.get('u1')` contém `{ cartao_bandeira: 'Mastercard', cartao_final: '6351' }`.
    - `c.ordem` não termina em `'soltarReserva'`.
16. **`CA-402: busca sem resposta ou fora do formato conta como "não achou"`**
    - `it.each([null, responde(200, { results: 'x' }), responde(500)])`.
17. **`entre as que conferem, vale a mais nova que não está cancelada`**
    - Duas achadas: `pre-velha` (15:00:01, `cancelled`) e `pre-1` (15:00:05, `authorized`) → grava `pre-1`.
18. **`CA-403: sucesso com a assinatura cancelada é recusa: 402, nada gravado, a reserva solta`**
    - `responde(201, { ...CRIADA, status: 'cancelled' })` → `402 { erro: RECUSA_PADRAO, codigo: 'recusado' }`.
    - Nenhum `PUT` sai.
19. **`CA-403: sucesso com a assinatura pausada é recusa e ela é cancelada lá`**
    - `status: 'paused'` → 402, e sai `PUT /preapproval/pre-1` com `{ status: 'cancelled' }`.
20. **`o banco ainda confirmando (pendente) é gravado como pendente`**
    - `status: 'pending'` → 200 com `corpo.status` igual a `'pendente'`.
21. **`gravação que falha cancela lá e responde 502; se cancelar também falha, o registro grita`**
    - Com `c.falhar('gravar')` e `PUT … [responde(200)]` → 502 e `PUT { status: 'cancelled' }` enviado.
    - Sem resposta no `PUT` e no `GET` → `c.log` chamado com uma linha que começa com `'CANCELAMENTO FALHOU'`.
22. **`D-81 (foco 2): assinar de novo depois de uma recusa zera a última paga, quem encerrou e quando`**
    - Linha cancelada com `encerrada_por: 'recusa'`, `ultima_cobranca_paga: '2026-09-06T15:00:00.000Z'` e `preapproval_id: 'pre-0'`.
    - Depois do 200, a linha tem `{ preapproval_id: 'pre-1', ultima_cobranca_paga: null, encerrada_por: null, encerrada_em: null }`.
23. **`CA-388: não existe preço de fundador`**
    - `Object.keys(c.assinaturas.get('u1') ?? {})` não contém `'preco_travado'`.
24. **`nenhum registro leva o código do cartão nem o e-mail`**
    - Rode os casos 11, 13, 15 e 21 num cenário só, ou em sequência.
    - `JSON.stringify(c.log.mock.calls)` não contém `TOKEN` nem `'ana@exemplo.com'`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/data/servidorAssinar.test.ts`
Expected: FAIL, porque `assinar.ts` ainda não existe.

- [ ] **Step 3: Escrever o núcleo**

Crie `supabase/functions/_shared/assinar.ts`:

```ts
// Assina com o cartão, dentro do site (spec checkout-proprio, D-65 a D-68; spec
// cobranca-em-producao, D-85 e D-86). Puro: a operadora, o banco, o relógio e o registro chegam de
// fora (o index.ts liga os de verdade; src/data/servidorAssinar.test.ts, os de mentira).
//
// O preço sai de PLANOS_DO_SERVIDOR, nunca do navegador (CA-375). O número do cartão nunca passa por
// aqui: chega o código de uso único, mais a bandeira e os 4 últimos números para mostrar (D-70).
import {
  codigoDaRecusa,
  dataDepoisDe,
  FREQUENCIA,
  lerCartao,
  objeto,
  PAGOS,
  planoAssinavel,
  PLANOS_DO_SERVIDOR,
  previsaoDaProximaCobranca,
  RECUSA_PADRAO,
  SEM_COBRANCA,
  tokenDoCartao,
  traduzirStatus,
  UM_DIA_MS,
  type CicloDaAssinatura,
} from './cobranca.ts'
import { cancelarNaOperadora } from './operadora.ts'
import { respostaDeErro as erro, type BancoDaCobranca, type ContaQuePede, type Operadora, type Registro, type RespostaDaFuncao } from './portas.ts'

/** A reserva de uma função que morreu no meio vence em 5 minutos (008). */
export const RESERVA_VENCE_MS = 5 * 60_000
/** D-85: a assinatura procurada nasceu depois do começo do pedido, com esta folga para o relógio da operadora. */
export const FOLGA_DA_BUSCA_MS = 2 * 60_000
export const EM_ANDAMENTO = 'Já estamos confirmando uma assinatura desta conta. Confira em Conta e plano em um minuto.'
export const JA_ASSINA = 'Você já tem uma assinatura ativa. A troca de plano ainda não é feita pelo site.'
export const ANDAMENTO_NA_CONTA = 'Você já tem uma assinatura em andamento. Confira em Conta e plano.'

export interface PedidoDeAssinatura {
  /** Quem pede, lido do token da sessão; nulo sem sessão. */
  readonly conta: ContaQuePede | null
  /** O corpo já lido como JSON; nulo se não era JSON. */
  readonly corpo: unknown
  /** Para onde a operadora devolveria a pessoa (back_url). */
  readonly site: string
}

export interface DependenciasDeAssinar {
  readonly operadora: Operadora
  readonly banco: Pick<BancoDaCobranca, 'lerDaConta' | 'gravar' | 'soltarReservaVencida' | 'reservar' | 'soltarReserva'>
  readonly agora: () => Date
  readonly log: Registro
}

export interface AssinaturaNaOperadora {
  readonly id: string
  readonly dados: Readonly<Record<string, unknown>>
}

export interface AlvoDaBusca {
  readonly email: string
  readonly conta: string
  readonly valor: number
  readonly frequencia: 1 | 12
  /** Em ms: a assinatura procurada nasceu depois disto. */
  readonly desde: number
}

/**
 * D-85 e CB-99: a assinatura que este pedido acabou de criar, pela busca da operadora. A busca não
 * filtra pela conta: filtra pelo e-mail, e cada resultado é conferido (a conta, o valor, a frequência
 * e a hora em que nasceu). Entre as que conferem, vale a mais nova que não está cancelada.
 */
export async function procurarAssinaturaRecente(operadora: Operadora, alvo: AlvoDaBusca): Promise<AssinaturaNaOperadora | null> {
  const busca = await operadora('GET', `/preapproval/search?payer_email=${encodeURIComponent(alvo.email)}&limit=50`)
  const resultados = busca?.ok ? busca.dados?.['results'] : undefined
  const lista: readonly unknown[] = Array.isArray(resultados) ? resultados : []
  const conferem: { readonly achada: AssinaturaNaOperadora; readonly nasceu: number; readonly cancelada: boolean }[] = []
  for (const item of lista) {
    const dados = objeto(item)
    if (!dados) continue
    const id = dados['id']
    const recorrencia = objeto(dados['auto_recurring'])
    const valor = recorrencia?.['transaction_amount']
    const criada = dados['date_created']
    const nasceu = typeof criada === 'string' ? Date.parse(criada) : Number.NaN
    if (typeof id !== 'string' || dados['external_reference'] !== alvo.conta) continue
    if (recorrencia?.['frequency'] !== alvo.frequencia || typeof valor !== 'number' || Math.round(valor * 100) !== Math.round(alvo.valor * 100)) continue
    if (!(nasceu >= alvo.desde)) continue
    conferem.push({ achada: { id, dados }, nasceu, cancelada: traduzirStatus(dados['status']) === 'cancelada' })
  }
  conferem.sort((a, b) => Number(a.cancelada) - Number(b.cancelada) || b.nasceu - a.nasceu)
  return conferem[0]?.achada ?? null
}

export async function assinar(pedido: PedidoDeAssinatura, deps: DependenciasDeAssinar): Promise<RespostaDaFuncao> {
  const conta = pedido.conta
  const email = conta?.email
  if (!conta || !email) return erro('Entre na sua conta antes de assinar.', 401)
  const corpo = objeto(pedido.corpo)
  if (!corpo) return erro('Corpo da requisição inválido.', 400)
  // O preço vem daqui, nunca do navegador: senão dá para assinar o Pro por R$ 1.
  const plano = planoAssinavel(corpo['plano'])
  if (!plano) return erro('Plano desconhecido.', 400)
  const ciclo: CicloDaAssinatura = corpo['ciclo'] === 'anual' ? 'anual' : 'mensal'
  const valor = PLANOS_DO_SERVIDOR[plano][ciclo]
  const cartaoToken = tokenDoCartao(corpo['card_token_id'])
  const cartao = lerCartao(corpo['cartao'])
  if (!cartaoToken || !cartao) return erro('Faltam os dados do cartão. Confira e tente de novo.', 400)

  const uid = conta.id
  const inicio = deps.agora()
  // C1 (008): duas abas mandando juntas passariam as duas pela conferência abaixo. A reserva, uma
  // linha por conta, deixa um pedido só passar; a de uma função que morreu no meio vence em 5 minutos.
  const vencida = await deps.banco.soltarReservaVencida(uid, new Date(inicio.getTime() - RESERVA_VENCE_MS).toISOString())
  if (vencida) deps.log('Não consegui apagar a reserva vencida:', vencida.mensagem)
  const reserva = await deps.banco.reservar(uid, cartao)
  if (reserva) {
    if (reserva.codigo === '23505') return erro(EM_ANDAMENTO, 409)
    deps.log('Não consegui reservar a assinatura:', reserva.mensagem)
    return erro(SEM_COBRANCA, 502)
  }

  // Sem resposta da operadora e sem achar a assinatura, a reserva fica até vencer: o aviso que adotar a
  // assinatura (D-85) lê o cartão dela, e um pedido novo nesse meio-tempo leva o 409 em vez de criar outra.
  let soltar = true
  try {
    const { linha: atual, falha } = await deps.banco.lerDaConta(uid)
    if (falha) {
      deps.log('Não consegui conferir a assinatura atual:', falha.mensagem)
      return erro('Não consegui conferir sua assinatura agora. Tente de novo em alguns minutos.', 502)
    }
    // CB-91: quem já paga não assina de novo por aqui. A cancelada, mesmo no prazo, pode (CA-380).
    if (atual?.status === 'ativa' && PAGOS.includes(atual.plano)) return erro(JA_ASSINA, 409)
    // Pendente ou pausada do fluxo do cartão também existe na operadora: assinar de novo criaria uma segunda.
    if (atual && (atual.status === 'pendente' || atual.status === 'pausada') && atual.preapproval_id && atual.cartao_final !== null) return erro(ANDAMENTO_NA_CONTA, 409)

    const frequencia = FREQUENCIA[ciclo]
    const resposta = await deps.operadora('POST', '/preapproval', {
      reason: `${PLANOS_DO_SERVIDOR[plano].nome} (${ciclo})`,
      external_reference: uid,
      payer_email: email,
      card_token_id: cartaoToken,
      // D-68: criada já autorizada; o banco confere o cartão agora e a primeira cobrança cai em até uma hora (D-82).
      status: 'authorized',
      back_url: pedido.site,
      auto_recurring: { frequency: frequencia, frequency_type: 'months', transaction_amount: valor, currency_id: 'BRL' },
    })

    if (resposta && !resposta.ok && resposta.status < 500) {
      const codigo = codigoDaRecusa(resposta.dados)
      deps.log('A operadora recusou a assinatura:', resposta.status, codigo)
      // 401/403 é a nossa credencial; 429, excesso de pedidos. Falha nossa, nunca recusa do cartão (402).
      if (resposta.status === 401 || resposta.status === 403 || resposta.status === 429) return erro(SEM_COBRANCA, 502)
      return erro(RECUSA_PADRAO, 402, codigo)
    }

    let criada: AssinaturaNaOperadora | null = null
    const idDaResposta = resposta?.dados?.['id']
    if (resposta?.ok && resposta.dados && typeof idDaResposta === 'string') criada = { id: idDaResposta, dados: resposta.dados }
    else {
      // D-85 (CA-402): sem resposta, erro do lado dela ou sucesso sem id. A assinatura pode ter nascido lá.
      deps.log('Resposta incerta ao assinar; procurando a assinatura na operadora:', resposta?.status ?? 'sem resposta')
      criada = await procurarAssinaturaRecente(deps.operadora, { email, conta: uid, valor, frequencia, desde: inicio.getTime() - FOLGA_DA_BUSCA_MS })
      if (!criada) {
        soltar = false
        return erro(SEM_COBRANCA, 502)
      }
    }

    const { id, dados } = criada
    const status = traduzirStatus(dados['status'])
    // D-86 (CA-403): sucesso com a assinatura cancelada ou pausada não vale. Conta como recusa, e a
    // pausada sai da operadora para não voltar a cobrar sozinha.
    if (status === 'cancelada' || status === 'pausada') {
      deps.log('A operadora devolveu a assinatura sem valer:', status, id)
      if (status === 'pausada' && !(await cancelarNaOperadora(deps.operadora, id))) deps.log('CANCELAMENTO FALHOU: assinatura pausada ficou na operadora; cancelar à mão:', id)
      return erro(RECUSA_PADRAO, 402, 'recusado')
    }

    // A data de hoje é a primeira cobrança, ainda por cair: a próxima é a do ciclo seguinte.
    const proxima = dataDepoisDe(dados['next_payment_date'], inicio.getTime() + UM_DIA_MS) ?? previsaoDaProximaCobranca(inicio, ciclo)
    const falhaGravar = await deps.banco.gravar({
      nutricionista_id: uid,
      plano,
      status,
      preapproval_id: id,
      valor_centavos: Math.round(valor * 100),
      ciclo,
      // CB-95: assinatura paga não vence por data, então substitui o Estudante na hora.
      expira_em: null,
      cartao_bandeira: cartao.bandeira,
      cartao_final: cartao.final,
      proxima_cobranca: proxima,
      // Assinatura nova: nada da anterior vale (a recusa, o fim e a última mensalidade paga, D-81).
      ultima_cobranca_paga: null,
      encerrada_por: null,
      encerrada_em: null,
      atualizado_em: inicio.toISOString(),
    })
    if (falhaGravar) {
      // A assinatura existe lá e não aqui: cancela lá para ninguém pagar sem ter o plano.
      deps.log('Assinatura criada e não gravada; cancelando na operadora:', id, falhaGravar.mensagem)
      if (!(await cancelarNaOperadora(deps.operadora, id))) deps.log('CANCELAMENTO FALHOU: assinatura ficou ativa na operadora sem plano aqui; cancelar à mão:', id)
      return erro(SEM_COBRANCA, 502)
    }
    return { status: 200, corpo: { status, proximaCobranca: proxima, cartao } }
  } finally {
    if (soltar) {
      const naoSoltou = await deps.banco.soltarReserva(uid)
      if (naoSoltou) deps.log('Não consegui soltar a reserva da assinatura (ela vence em 5 minutos):', naoSoltou.mensagem)
    }
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/data/servidorAssinar.test.ts`, que deve dar PASS. Depois, `npm run check`, que deve ficar verde.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/assinar.ts src/data/servidorAssinar.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(assinar): procura a assinatura quando a resposta se perde e recusa a que vem sem valer`

---

### Tarefa 4: Servidor: núcleo da `gerenciar-assinatura` (prévia e cancelar)

Cobre D-81 (CA-395, CA-396, CA-397, lado do servidor) e o `encerrada_por: 'pessoa'`, mais o que já existia (CA-378, CA-379, CB-93, CB-94), agora executado.

**Files:**
- Create: `supabase/functions/_shared/gerenciarAssinatura.ts`
- Create: `src/data/servidorGerenciar.test.ts`

**Interfaces:**
- Consumes: Tarefa 2.
- Produces:

```ts
export const FORA: string          // 'Não consegui falar com o servidor de cobrança. Nada mudou. Tente de novo em alguns minutos.'
export const GRAVADA_LA_SO: string // 'A assinatura foi cancelada, mas não consegui mostrar aqui. Abra Conta e plano de novo em alguns minutos.'
export interface PedidoDeGerenciar { readonly conta: ContaQuePede | null; readonly corpo: unknown }
export interface DependenciasDeGerenciar {
  readonly operadora: Operadora
  readonly banco: Pick<BancoDaCobranca, 'lerDaConta' | 'mudar'>
  readonly agora: () => Date
  readonly log: Registro
}
export interface Desfecho { readonly cobrada: boolean; readonly expiraEm: string | null }
export function desfechoDoCancelamento(linha: LinhaDaAssinatura, daOperadora: Readonly<Record<string, unknown>> | null, jaCanceladaLa: boolean, agora: Date): Desfecho
export function gerenciarAssinatura(pedido: PedidoDeGerenciar, deps: DependenciasDeGerenciar): Promise<RespostaDaFuncao>
```

O contrato com o navegador:
- `{ acao: 'previa' }` → `200 { cobrada: boolean, expiraEm: string | null }`, ou `502 { erro: FORA }`.
- `{ acao: 'cancelar' }` → `200 { status: 'cancelada', expiraEm }`.
- `{ acao: 'trocar_cartao', card_token_id, cartao }` → `200 { cartao }`.
- Os dois últimos não mudam.

- [ ] **Step 1: Escrever os testes que falham**

`src/data/servidorGerenciar.test.ts` (`// @vitest-environment node`). Base:

```ts
import { desfechoDoCancelamento, FORA, GRAVADA_LA_SO, gerenciarAssinatura } from '../../supabase/functions/_shared/gerenciarAssinatura.ts'
import { RECUSA_PADRAO } from '../../supabase/functions/_shared/cobranca.ts'
import { AGORA, cenario, linhaDe, responde } from './servidorFalsos.test-utils.ts'

const CONTA = { id: 'u1', email: 'ana@exemplo.com' }
const ATIVA = { nutricionista_id: 'u1', plano: 'solo', status: 'ativa', ciclo: 'mensal', preapproval_id: 'pre-1', cartao_final: '6351', proxima_cobranca: '2026-11-06T15:00:00.000Z' }
const GET = 'GET /preapproval/pre-1'
const PUT = 'PUT /preapproval/pre-1'
const COBRADA = { status: 'authorized', summarized: { charged_quantity: 1 }, next_payment_date: '2026-11-06T15:00:00.000Z' }
const SEM_COBRANCA_AINDA = { status: 'authorized', summarized: { charged_quantity: 0 }, next_payment_date: '2026-11-06T15:00:00.000Z' }
```

A tabela de `desfechoDoCancelamento` (D-81), com `it.each` e `jaCanceladaLa = false`, `agora = AGORA`:

| caso | da operadora | linha | esperado |
|---|---|---|---|
| nenhuma cobrança ainda | `SEM_COBRANCA_AINDA` | `ATIVA` | `{ cobrada: false, expiraEm: null }` |
| uma cobrança | `COBRADA` | `ATIVA` | `{ cobrada: true, expiraEm: '2026-11-06T02:59:59.000Z' }` |
| sem `charged_quantity`, com `last_charged_date` | `{ summarized: { last_charged_date: '2026-10-06T16:00:00Z' }, next_payment_date: '2026-11-06T15:00:00.000Z' }` | `ATIVA` | cobrada, mesmo fim |
| sem resumo; a última paga anotada aqui (D-83) | `{ next_payment_date: '2026-11-06T15:00:00.000Z' }` | `{ ...ATIVA, ultima_cobranca_paga: '2026-10-06T16:00:00.000Z' }` | cobrada, mesmo fim |
| cobrada, sem data da operadora: vale a gravada aqui | `{ summarized: { charged_quantity: 1 } }` | `ATIVA` | cobrada, mesmo fim |
| cobrada, a próxima a menos de um dia e nada gravado | `{ summarized: { charged_quantity: 1 }, next_payment_date: '2026-10-07T10:00:00.000Z' }` | `{ ...ATIVA, proxima_cobranca: null }` | `{ cobrada: true, expiraEm: null }` |
| pendente ou pausada nunca têm período | `COBRADA` | `{ ...ATIVA, status: 'pendente' }` | `{ cobrada: false, expiraEm: null }` |

Mais um teste: **`já cancelada lá: a data da operadora não vale, só a gravada aqui`**. A operadora traz `next_payment_date: '2026-12-06T15:00:00.000Z'` e `jaCanceladaLa = true`; o `expiraEm` sai de `ATIVA.proxima_cobranca`, ou seja, `'2026-11-06T02:59:59.000Z'`.

Os testes da função:

1. **`401 sem sessão; 400 corpo inválido ou ação desconhecida; 409 sem assinatura paga`**
   - `conta: null` → 401 `'Entre na sua conta antes de mudar a assinatura.'`.
   - Corpo `[]` → 400 `'Corpo da requisição inválido.'`.
   - `{ acao: 'x' }` → 400 `'Ação desconhecida.'`.
   - Sem linha, linha `estudante` ou linha sem `preapproval_id` → 409 `'Esta conta não tem assinatura paga.'`.
2. **`leitura do banco que falha: 502, sem falar com a operadora`**
3. **`CA-395: prévia sem cobrança ainda: { cobrada: false, expiraEm: null }, lida na operadora naquela hora`**
   - `[GET]: [responde(200, SEM_COBRANCA_AINDA)]` → `{ status: 200, corpo: { cobrada: false, expiraEm: null } }`.
   - Sai um `GET` só; `c.ordem` não tem `'mudar'`.
4. **`CA-396: prévia com cobrança: até quando vale`** → `{ cobrada: true, expiraEm: '2026-11-06T02:59:59.000Z' }`.
5. **`CA-397: prévia sem resposta da operadora (ou 5xx, ou 401): 502, nada muda`**
   - `it.each([null, responde(500), responde(401)])` → `{ status: 502, corpo: { erro: FORA } }`.
6. **`prévia de pendente ou pausada: Free na hora, sem perguntar à operadora`** → `{ cobrada: false, expiraEm: null }` e `c.pedidos` vazio.
7. **`CA-395: cancelar sem cobrança ainda: cancela lá e grava cancelada sem período, encerrada pela pessoa`**
   - `[GET]: [responde(200, SEM_COBRANCA_AINDA)]` e `[PUT]: [responde(200)]` → `{ status: 200, corpo: { status: 'cancelada', expiraEm: null } }`.
   - A linha tem `{ status: 'cancelada', expira_em: null, encerrada_por: 'pessoa', encerrada_em: AGORA.toISOString() }`.
8. **`CA-396 e CA-378: cancelar com cobrança: vale até a véspera da próxima`** → `expiraEm: '2026-11-06T02:59:59.000Z'`, e a linha tem o mesmo `expira_em`.
9. **`CB-93: já cancelada aqui não chama a operadora e devolve o fim gravado`** → `c.pedidos` vazio.
10. **`sem leitura da operadora não há cancelamento: 502 e nada gravado`**
11. **`CB-93: o PUT sem resposta, mas a leitura diz cancelada: grava`**
    - `[PUT]: [null]` e `[GET]: [responde(200, COBRADA), responde(200, { status: 'cancelled' })]` → 200.
12. **`a operadora não cancela (PUT recusado e a leitura diz autorizada): 502, nada gravado`**
13. **`a operadora já dizia cancelada: não pede de novo; o fim sai da data gravada aqui`**
14. **`CB-93: a gravação que falha é tentada de novo; falhando duas vezes, 502 com a frase própria`**
    - `c.falhar('mudar', 1)` → 200.
    - `c.falhar('mudar')` → `{ status: 502, corpo: { erro: GRAVADA_LA_SO } }`.
15. **`CA-379: trocar cartão manda o código novo lá antes de gravar a bandeira e o final aqui`**
    - `[PUT]: [responde(200)]`.
    - O pedido é `{ card_token_id: 'tok_novo_12345' }`.
    - A linha tem `cartao_final: '5682'` e a resposta é `{ cartao: { bandeira: 'Visa', final: '5682' } }`.
16. **`CA-379: recusa do cartão novo vira 402 com o código; o antigo fica`**
    - `responde(400, { message: 'cc_rejected_bad_filled_security_code' })` → 402 com `RECUSA_PADRAO`, e `cartao_final` continua `'6351'`.
17. **`CA-379: 401/403 ou sem resposta é falha nossa: 502, nunca 402`**
18. **`trocar cartão só da ativa (409) e com o cartão completo (400)`**
19. **`nenhum registro leva o código do cartão`**

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/data/servidorGerenciar.test.ts`
Expected: FAIL.

- [ ] **Step 3: Escrever o núcleo**

Crie `supabase/functions/_shared/gerenciarAssinatura.ts`:

```ts
// Diz o que vai acontecer se cancelar, cancela e troca o cartão, sem sair do site (spec
// checkout-proprio, D-69; spec cobranca-em-producao, D-81). Puro: a operadora, o banco, o relógio e o
// registro chegam de fora (src/data/servidorGerenciar.test.ts).
//
// D-81: só ganha "vale até o fim do período" quem já teve ao menos uma mensalidade cobrada. A prévia
// (que a janela de cancelar mostra) e o cancelamento usam a mesma conta, desfechoDoCancelamento.
import {
  codigoDaRecusa,
  dataDepoisDe,
  dataOuNula,
  fimDoPeriodoPago,
  lerCartao,
  objeto,
  PAGOS,
  RECUSA_PADRAO,
  tokenDoCartao,
  traduzirStatus,
  UM_DIA_MS,
} from './cobranca.ts'
import { cancelarNaOperadora } from './operadora.ts'
import { respostaDeErro as erro, type BancoDaCobranca, type ContaQuePede, type LinhaDaAssinatura, type Operadora, type Registro, type RespostaDaFuncao } from './portas.ts'

/** A operadora não respondeu: nada mudou lá nem aqui. */
export const FORA = 'Não consegui falar com o servidor de cobrança. Nada mudou. Tente de novo em alguns minutos.'
export const GRAVADA_LA_SO = 'A assinatura foi cancelada, mas não consegui mostrar aqui. Abra Conta e plano de novo em alguns minutos.'

export interface PedidoDeGerenciar {
  readonly conta: ContaQuePede | null
  readonly corpo: unknown
}

export interface DependenciasDeGerenciar {
  readonly operadora: Operadora
  readonly banco: Pick<BancoDaCobranca, 'lerDaConta' | 'mudar'>
  readonly agora: () => Date
  readonly log: Registro
}

export interface Desfecho {
  /** Já houve ao menos uma mensalidade cobrada. */
  readonly cobrada: boolean
  /** Até quando o plano pago vale depois de cancelar; nulo é Free na hora. */
  readonly expiraEm: string | null
}

/**
 * D-81: o que cancelar agora faz. "Cobrada" vale se a operadora disser (`charged_quantity` ou
 * `last_charged_date`) ou se o aviso de uma mensalidade paga já foi anotado aqui (D-83). Cobrada,
 * vale até a véspera da próxima cobrança: a da operadora (se ela ainda não tinha cancelado) ou a
 * gravada aqui. Como na assinar e no webhook, a data só conta se passar de amanhã.
 */
export function desfechoDoCancelamento(linha: LinhaDaAssinatura, daOperadora: Readonly<Record<string, unknown>> | null, jaCanceladaLa: boolean, agora: Date): Desfecho {
  // Pendente e pausada não pagaram período: voltam ao Free na hora.
  if (linha.status !== 'ativa') return { cobrada: false, expiraEm: null }
  const resumo = objeto(daOperadora?.['summarized'])
  const quantas = resumo?.['charged_quantity']
  const cobrada = (typeof quantas === 'number' && quantas >= 1) || dataOuNula(resumo?.['last_charged_date']) !== null || linha.ultima_cobranca_paga !== null
  if (!cobrada) return { cobrada: false, expiraEm: null }
  const limite = agora.getTime() + UM_DIA_MS
  const proxima = (jaCanceladaLa ? null : dataDepoisDe(daOperadora?.['next_payment_date'], limite)) ?? dataDepoisDe(linha.proxima_cobranca, limite)
  return { cobrada: true, expiraEm: proxima ? fimDoPeriodoPago(proxima) : null }
}

export async function gerenciarAssinatura(pedido: PedidoDeGerenciar, deps: DependenciasDeGerenciar): Promise<RespostaDaFuncao> {
  if (!pedido.conta) return erro('Entre na sua conta antes de mudar a assinatura.', 401)
  const corpo = objeto(pedido.corpo)
  if (!corpo) return erro('Corpo da requisição inválido.', 400)
  const dono = pedido.conta.id

  const { linha, falha } = await deps.banco.lerDaConta(dono)
  if (falha) {
    deps.log('Não consegui ler a assinatura:', falha.mensagem)
    return erro(FORA, 502)
  }
  if (!linha || !PAGOS.includes(linha.plano) || !linha.preapproval_id) return erro('Esta conta não tem assinatura paga.', 409)
  const id = linha.preapproval_id
  const caminho = `/preapproval/${encodeURIComponent(id)}`
  const agora = deps.agora()

  if (corpo['acao'] === 'previa') {
    if (linha.status !== 'ativa') return { status: 200, corpo: { cobrada: false, expiraEm: null } }
    const lida = await deps.operadora('GET', caminho)
    if (!lida?.ok) {
      deps.log('Não consegui ler a assinatura na operadora para a prévia:', lida?.status ?? 'sem resposta', id)
      return erro(FORA, 502)
    }
    const jaCanceladaLa = traduzirStatus(lida.dados?.['status']) === 'cancelada'
    return { status: 200, corpo: { ...desfechoDoCancelamento(linha, lida.dados, jaCanceladaLa, agora) } }
  }

  if (corpo['acao'] === 'cancelar') {
    // CB-93: a resposta do cancelamento se perdeu e a pessoa pediu de novo; nada a fazer lá.
    if (linha.status === 'cancelada') return { status: 200, corpo: { status: 'cancelada', expiraEm: linha.expira_em } }
    const lida = await deps.operadora('GET', caminho)
    if (!lida?.ok) {
      deps.log('Não consegui ler a assinatura na operadora:', lida?.status ?? 'sem resposta', id)
      return erro(FORA, 502)
    }
    const jaCanceladaLa = traduzirStatus(lida.dados?.['status']) === 'cancelada'
    if (!jaCanceladaLa && !(await cancelarNaOperadora(deps.operadora, id))) {
      deps.log('A operadora não cancelou:', id)
      return erro(FORA, 502)
    }
    const { expiraEm } = desfechoDoCancelamento(linha, lida.dados, jaCanceladaLa, agora)
    const mudanca = { status: 'cancelada', expira_em: expiraEm, encerrada_por: 'pessoa', encerrada_em: agora.toISOString(), atualizado_em: agora.toISOString() } as const
    let gravou = await deps.banco.mudar(dono, id, mudanca)
    if (gravou.falha) gravou = await deps.banco.mudar(dono, id, mudanca)
    if (gravou.falha) {
      // Pedir de novo não resolve se o aviso gravar antes. O registro permite acertar expira_em à mão.
      deps.log('Cancelada na operadora, mas não gravada aqui:', id, gravou.falha.mensagem)
      return erro(GRAVADA_LA_SO, 502)
    }
    return { status: 200, corpo: { status: 'cancelada', expiraEm } }
  }

  if (corpo['acao'] === 'trocar_cartao') {
    if (linha.status !== 'ativa') return erro('Só dá para trocar o cartão de uma assinatura ativa.', 409)
    const cartaoToken = tokenDoCartao(corpo['card_token_id'])
    const cartao = lerCartao(corpo['cartao'])
    if (!cartaoToken || !cartao) return erro('Faltam os dados do cartão. Confira e tente de novo.', 400)
    const feito = await deps.operadora('PUT', caminho, { card_token_id: cartaoToken })
    // Sem resposta, erro do lado dela ou a nossa credencial recusada: falha nossa, nunca recusa do cartão.
    if (!feito || feito.status >= 500 || feito.status === 401 || feito.status === 403) {
      deps.log('A operadora não respondeu à troca de cartão:', feito?.status ?? 'sem resposta', id)
      return erro(FORA, 502)
    }
    if (!feito.ok) {
      const codigo = codigoDaRecusa(feito.dados)
      deps.log('A operadora recusou o cartão novo:', feito.status, codigo, id)
      return erro(RECUSA_PADRAO, 402, codigo)
    }
    const { falha: naoGravou } = await deps.banco.mudar(dono, id, { cartao_bandeira: cartao.bandeira, cartao_final: cartao.final, atualizado_em: agora.toISOString() })
    // O cartão já foi trocado lá: se a gravação falhar, só a tela mostra o antigo até a próxima troca.
    if (naoGravou) deps.log('Cartão trocado na operadora, mas não gravado aqui:', id, naoGravou.mensagem)
    return { status: 200, corpo: { cartao } }
  }

  return erro('Ação desconhecida.', 400)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/data/servidorGerenciar.test.ts`, que deve dar PASS. Depois, `npm run check`, que deve ficar verde.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/gerenciarAssinatura.ts src/data/servidorGerenciar.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(assinatura): cancelar antes da primeira cobrança volta ao Free na hora, e a prévia diz isso antes`

---

### Tarefa 5: Servidor: núcleo do aviso, parte 1 (assinatura conferida, registro, status e adoção)

Cobre D-84, D-85 (pelo aviso) e a correção do manifesto. Critérios: CA-398, CA-399, CA-400, CA-401 e parte do CA-405.

**Files:**
- Create: `supabase/functions/_shared/webhook.ts`
- Create: `src/data/servidorWebhook.test.ts`

**Interfaces:**
- Consumes: Tarefa 2.
- Produces:

```ts
export interface AvisoRecebido {
  /** O corpo já lido como JSON; nulo se não era JSON. */
  readonly corpo: unknown
  /** `data.id` e `type` da URL do aviso (?data.id=…&type=…). */
  readonly idNaUrl: string | null
  readonly tipoNaUrl: string | null
  readonly xSignature: string | null
  readonly xRequestId: string | null
}
export interface DependenciasDoWebhook {
  readonly operadora: Operadora
  readonly banco: Pick<BancoDaCobranca, 'lerDaConta' | 'lerDaOperadora' | 'gravar' | 'mudar' | 'lerReserva' | 'anotarAviso' | 'apagarAvisosAntesDe'>
  /** Nulo quando a função está sem o segredo: processa e anota que não conferiu. */
  readonly segredo: string | null
  readonly agora: () => Date
  readonly log: Registro
}
export type StatusDoAviso = 200 | 500
export const GUARDA_DOS_AVISOS_MS: number // 90 dias
export function manifestoDoAviso(id: string, requestId: string | null, ts: string): string
export function assinaturaConfere(cabecalho: string | null, requestId: string | null, id: string, segredo: string): Promise<boolean>
export function tratarAviso(aviso: AvisoRecebido, deps: DependenciasDoWebhook): Promise<StatusDoAviso>
```

Na Tarefa 6 entra `situacaoDaMensalidade` e o tópico das mensalidades. Até lá, `subscription_authorized_payment` cai em `ignorado: tópico …`.

**O que fazer com cada aviso (qualquer tópico)**

| Situação | O que faz | Resultado anotado | Resposta |
|---|---|---|---|
| com segredo, e o `x-signature` não confere (ou falta `ts`/`v1`, ou falta o id) | nada mais: nem operadora, nem assinaturas (CA-399) | `assinatura não confere` | 200 |
| sem id (nem na URL nem no corpo) | nada | `ignorado: sem id` | 200 |
| tópico `payment` | nada | `ignorado: pagamento` | 200 |
| outro tópico | nada | `ignorado: tópico {tópico ou "vazio"}` | 200 |
| exceção inesperada | — | `falha: erro inesperado` | 500 |
| sempre, no fim | anota (`topico` até 80, `recurso_id` até 80, `assinatura_confere`, `resultado` até 200) e apaga os avisos de antes de agora − 90 dias (CA-398); falha nas duas só vai para o registro da função | — | — |

**`subscription_preapproval`: lê `GET /preapproval/{id}`**

| Situação | O que faz | Resultado | Resposta |
|---|---|---|---|
| sem resposta, 5xx ou 429 | nada | `falha: operadora fora` | 500 |
| 401 ou 403 | nada | `falha: credencial recusada` | 500 |
| outro 4xx | nada | `ignorado: assinatura não existe na operadora` | 200 |
| sem `external_reference` | nada | `ignorado: assinatura sem conta` | 200 |
| há linha com este id, mas de outra conta | nada; anota no registro da função | `ignorado: conta não confere` | 200 |
| há linha com este id, já cancelada | nada (cancelada é final) | `sem mudança: já cancelada` | 200 |
| há linha com este id, outro status | grava o status. Se ativa, grava a próxima cobrança (só se passar de amanhã). Se cancelada, grava `encerrada_por 'operadora'` e `encerrada_em` agora. `expira_em` nunca muda (CB-94) | `assinatura {status}` | 200 |
| sem linha, status não ativa | nada | `ignorado: assinatura {status} sem linha` | 200 |
| sem linha, ativa, a conta já tem outra paga ativa | cancela esta na operadora (CA-401) | `cancelada: sobra`; se o cancelamento falhar, `falha: sobra não cancelada` | 200 / 500 |
| sem linha, ativa, valor e frequência sem um plano único | cancela esta na operadora (R-39) | `cancelada: valor desconhecido` | 200 / 500 |
| sem linha, ativa, plano achado | adota (CA-400): grava a linha da conta com plano, ciclo, valor, o cartão da reserva (se houver) e a próxima cobrança; zera a recusa, o fim e a última paga | `adotada: {plano} {ciclo}` | 200 |
| falha do banco em qualquer passo | — | `falha: banco` | 500 |

- [ ] **Step 1: Escrever os testes que falham**

`src/data/servidorWebhook.test.ts` (`// @vitest-environment node`). Base:

```ts
import { assinaturaConfere, manifestoDoAviso, tratarAviso, type AvisoRecebido } from '../../supabase/functions/_shared/webhook.ts'
import { AGORA, cenario, responde, type Cenario } from './servidorFalsos.test-utils.ts'

const SEGREDO = 'segredo-de-teste'
/** Calculados fora do código: HMAC-SHA256 com `openssl dgst -sha256 -hmac segredo-de-teste`, conferidos com node:crypto. */
const ASSINADO = {
  comRequestId: '9bcf3dd498d68aa367d468eb68c2d143ff72787ba6543ba57d5223d52005787b', // id:2c938084726fca48;request-id:req-1;ts:1700000000;
  semRequestId: '865d626e3444ecbc25dff7d92ea9127fa10e10d0d566d9dbe124fd2a3cd8d6aa', // id:2c938084726fca48;ts:1700000000;
  idEmMaiusculas: 'a7a290fa1c1b4f860516daa1b16e0920e8d0e7f13137ec6fc9fabfc61e22aa29', // id:2C938084726FCA48;request-id:req-1;ts:1700000000; (errado)
  idNumerico: '96388ec824e45fce87cfb793cd29f99d8be04e81bb9dc9abc1f65a334a975ef1', // id:123456789;request-id:req-2;ts:1700000300;
}

const aviso = (topico: string, id: string | null, extra: Partial<AvisoRecebido> = {}): AvisoRecebido => ({
  corpo: { type: topico, action: 'updated', data: { id } },
  idNaUrl: id,
  tipoNaUrl: topico,
  xSignature: null,
  xRequestId: null,
  ...extra,
})
const deps = (c: Cenario, segredo: string | null = null) => ({ ...c.deps, segredo })
const ASSINATURA = 'subscription_preapproval'
const PRE = 'GET /preapproval/pre-1'
const AUTORIZADA = { id: 'pre-1', status: 'authorized', external_reference: 'u1', next_payment_date: '2026-11-06T15:00:00.000Z', auto_recurring: { transaction_amount: 34.9, frequency: 1, frequency_type: 'months' } }
```

`describe('a assinatura do aviso (CA-399)')`:

```ts
it('o manifesto leva o id em minúsculas; a parte que falta sai', () => {
  expect(manifestoDoAviso('2C938084726FCA48', 'req-1', '1700000000')).toBe('id:2c938084726fca48;request-id:req-1;ts:1700000000;')
  expect(manifestoDoAviso('2C938084726FCA48', null, '1700000000')).toBe('id:2c938084726fca48;ts:1700000000;')
})

it('confere o HMAC do manifesto, com e sem x-request-id, aceitando espaço depois da vírgula', async () => {
  expect(await assinaturaConfere(`ts=1700000000,v1=${ASSINADO.comRequestId}`, 'req-1', '2C938084726FCA48', SEGREDO)).toBe(true)
  expect(await assinaturaConfere(`ts=1700000000, v1=${ASSINADO.semRequestId}`, null, '2c938084726fca48', SEGREDO)).toBe(true)
  expect(await assinaturaConfere(`ts=1700000300,v1=${ASSINADO.idNumerico}`, 'req-2', '123456789', SEGREDO)).toBe(true)
})

it('o manifesto com o id em maiúsculas (o defeito de antes) não confere', async () => {
  expect(await assinaturaConfere(`ts=1700000000,v1=${ASSINADO.idEmMaiusculas}`, 'req-1', '2C938084726FCA48', SEGREDO)).toBe(false)
})

it('cabeçalho sem ts ou sem v1, outro segredo, outro ts ou hash cortado não confere', async () => {
  expect(await assinaturaConfere(null, 'req-1', '2c938084726fca48', SEGREDO)).toBe(false)
  expect(await assinaturaConfere(`v1=${ASSINADO.comRequestId}`, 'req-1', '2c938084726fca48', SEGREDO)).toBe(false)
  expect(await assinaturaConfere(`ts=1700000000,v1=${ASSINADO.comRequestId}`, 'req-1', '2c938084726fca48', 'outro')).toBe(false)
  expect(await assinaturaConfere(`ts=1700000001,v1=${ASSINADO.comRequestId}`, 'req-1', '2c938084726fca48', SEGREDO)).toBe(false)
  expect(await assinaturaConfere(`ts=1700000000,v1=${ASSINADO.comRequestId.slice(0, 60)}`, 'req-1', '2c938084726fca48', SEGREDO)).toBe(false)
})
```

Os demais testes da Tarefa 5:

1. **`CA-399: assinatura que não confere não muda nada e fica anotada como "assinatura não confere"`**
   - Com o segredo, um aviso de `ASSINATURA` `'pre-1'` e `xSignature: 'ts=1,v1=00'`: resposta 200, `c.pedidos` vazio, e `c.ordem` não contém `'mudar'`, `'gravar'` nem `'lerDaOperadora'`.
   - `c.avisos` é `[{ topico: 'subscription_preapproval', recurso_id: 'pre-1', assinatura_confere: false, resultado: 'assinatura não confere' }]`.
2. **`CA-399: o id da URL é o que vale para a assinatura; sem ele, vale o do corpo`**
   - `aviso(ASSINATURA, '2C938084726FCA48', { xSignature: \`ts=1700000000,v1=${ASSINADO.comRequestId}\`, xRequestId: 'req-1' })` → `assinatura_confere: true`, e sai `GET /preapproval/2C938084726FCA48`.
   - Sem `idNaUrl`, com o corpo `{ type: 'subscription_authorized_payment', data: { id: 123456789 } }`, `xRequestId: 'req-2'` e `ts=1700000300` → confere, e sai `GET /authorized_payments/123456789`. Este último só passa na Tarefa 6; até lá, confira só `assinatura_confere: true`.
3. **`sem segredo configurado, processa e anota que não conferiu (nulo)`**
4. **`CA-398: todo aviso fica anotado (hora, tipo, código do recurso, conferência, resultado) e os de mais de 90 dias saem`**
   - `aviso('payment', '999')` → 200.
   - `c.avisos[0]` é `{ topico: 'payment', recurso_id: '999', assinatura_confere: null, resultado: 'ignorado: pagamento' }`.
   - `c.apagadosAntesDe` é `['2026-07-08T15:00:00.000Z']` (AGORA − 90 dias).
5. **`tópico desconhecido ou vazio e aviso sem id: 200, anotados`**
   - Os resultados são `'ignorado: tópico subscription_preapproval_plan'`, `'ignorado: tópico vazio'` e `'ignorado: sem id'`.
6. **`o registro corta o texto no tamanho da tabela`**
   - Tópico de 120 caracteres → `topico.length` é 80.
7. **`falha ao anotar ou ao apagar os velhos não muda a resposta`**
   - Com `c.falhar('anotarAviso')` e `c.falhar('apagarAvisosAntesDe')`, a resposta continua 200 e `c.log` é chamado.
8. **`a assinatura ficou ativa: grava o status e a próxima cobrança, sem mexer no expira_em`**
   - Linha `{ nutricionista_id: 'u1', plano: 'solo', status: 'pendente', preapproval_id: 'pre-1', expira_em: '2027-01-01T00:00:00.000Z' }` e `[PRE]: [responde(200, AUTORIZADA)]`.
   - A linha fica com `{ status: 'ativa', proxima_cobranca: '2026-11-06T15:00:00.000Z', expira_em: '2027-01-01T00:00:00.000Z' }` e o resultado é `'assinatura ativa'`.
9. **`a data de hoje (a primeira cobrança) não vira próxima cobrança`**
   - `next_payment_date: '2026-10-06T16:00:00.000Z'` → `proxima_cobranca` continua nula.
10. **`pausada vira pausada; cancelada pela operadora vira cancelada, encerrada pela operadora, sem período (CB-94)`**
    - Linha ativa e `status: 'cancelled'` → `{ status: 'cancelada', encerrada_por: 'operadora', encerrada_em: AGORA.toISOString(), expira_em: null }`.
11. **`cancelada é final: aviso de "autorizada" atrasado não devolve o plano nem troca quem encerrou`**
    - Linha cancelada com `encerrada_por: 'recusa'` e a operadora dizendo `authorized` → a linha não muda, `c.ordem` não tem `'mudar'` e o resultado é `'sem mudança: já cancelada'`.
12. **`linha com este id de outra conta: nada muda`**
13. **`CA-405: operadora sem resposta (ou 5xx, ou 429) responde 500 para o aviso voltar; 401/403 também; 404 é ignorado com 200`**
14. **`falha do banco ao ler ou gravar responde 500`**
15. **`CA-400: assinatura autorizada sem linha e conta sem outra paga ativa: adota (plano e ciclo pelo valor, cartão da reserva, próxima cobrança)`**

    ```ts
    const c = cenario([{ nutricionista_id: 'u1', plano: 'estudante', status: 'ativa', expira_em: '2027-07-31T23:59:59.000Z' }], { [PRE]: [responde(200, AUTORIZADA)] })
    c.comReserva('u1')
    expect(await tratarAviso(aviso(ASSINATURA, 'pre-1'), deps(c))).toBe(200)
    expect(c.assinaturas.get('u1')).toEqual({
      nutricionista_id: 'u1', plano: 'solo', status: 'ativa', preapproval_id: 'pre-1', valor_centavos: 3490, ciclo: 'mensal',
      expira_em: null, cartao_bandeira: 'Mastercard', cartao_final: '6351', proxima_cobranca: '2026-11-06T15:00:00.000Z',
      ultima_cobranca_paga: null, encerrada_por: null, encerrada_em: null, atualizado_em: AGORA.toISOString(),
    })
    expect(c.avisos[0]?.resultado).toBe('adotada: solo mensal')
    ```

16. **`CA-400: sem reserva, adota sem o cartão; Pro anual pelo valor 599 a cada 12 meses`**
17. **`CA-400: a conta cancelada no prazo (assinou de novo e a resposta se perdeu) também adota`**
18. **`CA-401: a conta já paga outra assinatura ativa: esta é a sobra e é cancelada lá; a linha de quem paga não muda`**
    - Linha `{ plano: 'pro', status: 'ativa', preapproval_id: 'pre-paga' }`, mais `[PRE]: [responde(200, AUTORIZADA)]` e `'PUT /preapproval/pre-1': [responde(200)]`.
    - A linha continua com `preapproval_id: 'pre-paga'`, sai o `PUT { status: 'cancelled' }` para `pre-1` e o resultado é `'cancelada: sobra'`.
19. **`CA-401: a sobra que não cancela lá responde 500 para tentar de novo`**
20. **`R-39: valor sem plano único não adota: cancela lá e anota "cancelada: valor desconhecido"`**
21. **`assinatura sem linha que não está ativa não é adotada`**

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/data/servidorWebhook.test.ts`
Expected: FAIL.

- [ ] **Step 3: Escrever o núcleo**

Crie `supabase/functions/_shared/webhook.ts`:

```ts
// Recebe os avisos da operadora de pagamento (spec checkout-proprio; spec cobranca-em-producao, D-80
// e D-83 a D-85). Puro: a operadora, o banco, o segredo, o relógio e o registro chegam de fora
// (src/data/servidorWebhook.test.ts).
//
// Três regras que este arquivo não quebra:
//   1. Não confiar no corpo do aviso. A assinatura do cabeçalho é conferida, e o estado verdadeiro é
//      lido na API da operadora.
//   2. Cada aviso fica anotado, sem dado pessoal, com o que foi feito (D-84).
//   3. 200 quer dizer "entendido" (feito ou ignorado de propósito). 500 é falha passageira (operadora
//      fora, banco fora, cancelamento que não pegou): a operadora manda de novo em 15 minutos, e
//      refazer não muda nada que já foi feito.
import { dataDepoisDe, objeto, PAGOS, planoPeloValor, PLANOS_DO_SERVIDOR, previsaoDaProximaCobranca, traduzirStatus, UM_DIA_MS } from './cobranca.ts'
import { cancelarNaOperadora } from './operadora.ts'
import type { BancoDaCobranca, FalhaDoBanco, MudancaDaAssinatura, Operadora, Registro } from './portas.ts'

export interface AvisoRecebido {
  readonly corpo: unknown
  readonly idNaUrl: string | null
  readonly tipoNaUrl: string | null
  readonly xSignature: string | null
  readonly xRequestId: string | null
}

export interface DependenciasDoWebhook {
  readonly operadora: Operadora
  readonly banco: Pick<BancoDaCobranca, 'lerDaConta' | 'lerDaOperadora' | 'gravar' | 'mudar' | 'lerReserva' | 'anotarAviso' | 'apagarAvisosAntesDe'>
  readonly segredo: string | null
  readonly agora: () => Date
  readonly log: Registro
}

export type StatusDoAviso = 200 | 500
/** D-84: o registro guarda 90 dias. */
export const GUARDA_DOS_AVISOS_MS = 90 * UM_DIA_MS

interface Feito {
  readonly status: StatusDoAviso
  readonly resultado: string
}
const feito = (resultado: string, status: StatusDoAviso = 200): Feito => ({ status, resultado })
const textoCurto = (valor: unknown): string | null => (typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null)

/** O manifesto que a operadora assina: o id do recurso em minúsculas, o x-request-id (se veio) e o ts. */
export function manifestoDoAviso(id: string, requestId: string | null, ts: string): string {
  return `id:${id.toLowerCase()};${requestId ? `request-id:${requestId};` : ''}ts:${ts};`
}

/** Compara sem parar no primeiro caractere diferente: o tempo da resposta não entrega quanto do código acertou. */
function mesmoTexto(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diferenca = 0
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diferenca === 0
}

/** CA-399: confere o x-signature (`ts=…,v1=…`), que é o HMAC-SHA256 do manifesto com o segredo, em hexadecimal. */
export async function assinaturaConfere(cabecalho: string | null, requestId: string | null, id: string, segredo: string): Promise<boolean> {
  const partes = new Map<string, string>()
  for (const parte of (cabecalho ?? '').split(',')) {
    const igual = parte.indexOf('=')
    if (igual > 0) partes.set(parte.slice(0, igual).trim(), parte.slice(igual + 1).trim())
  }
  const ts = partes.get('ts')
  const v1 = partes.get('v1')
  if (!ts || !v1) return false
  const texto = new TextEncoder()
  const chave = await crypto.subtle.importKey('raw', texto.encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const assinado = new Uint8Array(await crypto.subtle.sign('HMAC', chave, texto.encode(manifestoDoAviso(id, textoCurto(requestId), ts))))
  const esperado = Array.from(assinado, (b) => b.toString(16).padStart(2, '0')).join('')
  return mesmoTexto(esperado, v1.toLowerCase())
}

/** O id do recurso no corpo (`data.id`), em texto. A operadora pode mandar número. */
function idDoCorpo(corpo: Readonly<Record<string, unknown>> | null): string | null {
  const valor = objeto(corpo?.['data'])?.['id']
  return typeof valor === 'number' && Number.isFinite(valor) ? String(valor) : textoCurto(valor)
}

/** Sem resposta, 5xx, 429 ou a nossa credencial recusada: passageiro, e o aviso volta. */
function falhaPassageira(status: number): Feito | null {
  if (status >= 500 || status === 429) return feito('falha: operadora fora', 500)
  if (status === 401 || status === 403) return feito('falha: credencial recusada', 500)
  return null
}

function falhaNoBanco(deps: DependenciasDoWebhook, falha: FalhaDoBanco, onde: string): Feito {
  deps.log(`O banco falhou ao ${onde}:`, falha.mensagem)
  return feito('falha: banco', 500)
}

async function porTopico(topico: string, id: string, deps: DependenciasDoWebhook): Promise<Feito> {
  switch (topico) {
    case 'subscription_preapproval':
      return tratarAssinatura(id, deps)
    case 'payment':
      // Pagamento avulso não é usado pelo MetaNutri: só fica anotado.
      return feito('ignorado: pagamento')
    default:
      return feito(`ignorado: tópico ${topico || 'vazio'}`)
  }
}

export async function tratarAviso(aviso: AvisoRecebido, deps: DependenciasDoWebhook): Promise<StatusDoAviso> {
  const corpo = objeto(aviso.corpo)
  const topico = textoCurto(corpo?.['type']) ?? textoCurto(aviso.tipoNaUrl) ?? ''
  // O id assinado é o da URL; o do corpo só vale quando a URL não trouxer.
  const id = textoCurto(aviso.idNaUrl) ?? idDoCorpo(corpo)
  let confere: boolean | null = null
  let resultado: Feito
  try {
    if (deps.segredo !== null) confere = id !== null && (await assinaturaConfere(aviso.xSignature, aviso.xRequestId, id, deps.segredo))
    resultado = confere === false ? feito('assinatura não confere') : id === null ? feito('ignorado: sem id') : await porTopico(topico, id, deps)
  } catch (erro) {
    deps.log('Falha inesperada ao tratar o aviso:', erro instanceof Error ? erro.message : 'erro desconhecido')
    resultado = feito('falha: erro inesperado', 500)
  }

  const naoAnotou = await deps.banco.anotarAviso({
    topico: topico.slice(0, 80),
    recurso_id: id === null ? null : id.slice(0, 80),
    assinatura_confere: confere,
    resultado: resultado.resultado.slice(0, 200),
  })
  if (naoAnotou) deps.log('Não consegui anotar o aviso:', naoAnotou.mensagem)
  const naoLimpou = await deps.banco.apagarAvisosAntesDe(new Date(deps.agora().getTime() - GUARDA_DOS_AVISOS_MS).toISOString())
  if (naoLimpou) deps.log('Não consegui apagar os avisos velhos:', naoLimpou.mensagem)
  return resultado.status
}

/** O aviso da assinatura: grava o status que a operadora diz, ou adota a assinatura sem dono (D-85). */
async function tratarAssinatura(id: string, deps: DependenciasDoWebhook): Promise<Feito> {
  const lida = await deps.operadora('GET', `/preapproval/${encodeURIComponent(id)}`)
  if (!lida) return feito('falha: operadora fora', 500)
  const passageira = falhaPassageira(lida.status)
  if (passageira) return passageira
  const assinatura = lida.dados
  if (!lida.ok || !assinatura) return feito('ignorado: assinatura não existe na operadora')
  const dono = textoCurto(assinatura['external_reference'])
  if (!dono) return feito('ignorado: assinatura sem conta')
  const status = traduzirStatus(assinatura['status'])

  const { linha, falha } = await deps.banco.lerDaOperadora(id)
  if (falha) return falhaNoBanco(deps, falha, 'ler a assinatura do aviso')
  if (!linha) return status === 'ativa' ? adotar(id, dono, assinatura, deps) : feito(`ignorado: assinatura ${status} sem linha`)
  if (linha.nutricionista_id !== dono) {
    deps.log('Aviso de assinatura com outra conta na linha; conferir à mão:', id)
    return feito('ignorado: conta não confere')
  }
  // Cancelada é final: um aviso atrasado nunca devolve o plano pago nem troca quem encerrou.
  if (linha.status === 'cancelada') return feito('sem mudança: já cancelada')

  const agora = deps.agora()
  // A data de hoje (a primeira cobrança, ainda por cair) não conta: só a que passa de amanhã.
  const proxima = status === 'ativa' ? dataDepoisDe(assinatura['next_payment_date'], agora.getTime() + UM_DIA_MS) : null
  const mudanca: MudancaDaAssinatura = {
    status,
    atualizado_em: agora.toISOString(),
    ...(proxima ? { proxima_cobranca: proxima } : {}),
    // CB-94: a cancelada pela operadora não tem período a respeitar. O expira_em fica como está (nulo na paga).
    ...(status === 'cancelada' ? { encerrada_por: 'operadora' as const, encerrada_em: agora.toISOString() } : {}),
  }
  const { falha: naoMudou } = await deps.banco.mudar(dono, id, mudanca)
  if (naoMudou) return falhaNoBanco(deps, naoMudou, 'gravar o status da assinatura')
  return feito(`assinatura ${status}`)
}

/** A assinatura que sobrou (ou que não dá para adotar) sai da operadora, para ninguém pagar sem ter o plano. */
async function cancelarSobra(id: string, motivo: string, deps: DependenciasDoWebhook): Promise<Feito> {
  if (await cancelarNaOperadora(deps.operadora, id)) return feito(`cancelada: ${motivo}`)
  deps.log('CANCELAMENTO FALHOU: assinatura sem dono continua na operadora; o aviso volta:', id)
  return feito(`falha: ${motivo} não cancelada`, 500)
}

/**
 * D-85 (CA-400 e CA-401): a assinatura autorizada que não tem linha aqui (a resposta da assinar se
 * perdeu). Se a conta já paga outra, esta é a sobra. Se não, a pessoa ganha o plano que está pagando,
 * achado pelo valor e pela frequência (R-39).
 */
async function adotar(id: string, dono: string, assinatura: Readonly<Record<string, unknown>>, deps: DependenciasDoWebhook): Promise<Feito> {
  const { linha: atual, falha } = await deps.banco.lerDaConta(dono)
  if (falha) return falhaNoBanco(deps, falha, 'ler a conta da assinatura sem dono')
  if (atual && atual.status === 'ativa' && PAGOS.includes(atual.plano) && atual.preapproval_id !== id) return cancelarSobra(id, 'sobra', deps)

  const recorrencia = objeto(assinatura['auto_recurring'])
  const achado = planoPeloValor(recorrencia?.['transaction_amount'], recorrencia?.['frequency'], recorrencia?.['frequency_type'])
  if (!achado) return cancelarSobra(id, 'valor desconhecido', deps)

  const agora = deps.agora()
  // O cartão que a pessoa digitou fica na reserva quando a resposta da operadora se perde (009).
  const reserva = await deps.banco.lerReserva(dono)
  const proxima = dataDepoisDe(assinatura['next_payment_date'], agora.getTime() + UM_DIA_MS) ?? previsaoDaProximaCobranca(agora, achado.ciclo)
  const naoGravou = await deps.banco.gravar({
    nutricionista_id: dono,
    plano: achado.plano,
    status: 'ativa',
    preapproval_id: id,
    valor_centavos: Math.round(PLANOS_DO_SERVIDOR[achado.plano][achado.ciclo] * 100),
    ciclo: achado.ciclo,
    expira_em: null,
    cartao_bandeira: reserva?.cartao_bandeira ?? null,
    cartao_final: reserva?.cartao_final ?? null,
    proxima_cobranca: proxima,
    ultima_cobranca_paga: null,
    encerrada_por: null,
    encerrada_em: null,
    atualizado_em: agora.toISOString(),
  })
  if (naoGravou) return falhaNoBanco(deps, naoGravou, 'adotar a assinatura sem dono')
  deps.log('Assinatura sem dono adotada:', id)
  return feito(`adotada: ${achado.plano} ${achado.ciclo}`)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/data/servidorWebhook.test.ts`, que deve dar PASS. Se o `tsc` reclamar do tipo do `Uint8Array` no `crypto.subtle`, passe `texto.encode(...)` direto (já é `Uint8Array<ArrayBuffer>` no TS 6); não use cast para `any`. Depois, `npm run check`, que deve ficar verde.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/webhook.ts src/data/servidorWebhook.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(webhook): registro de avisos, assinatura do aviso conferida e adoção da assinatura sem dono`

---

### Tarefa 6: Servidor: núcleo do aviso, parte 2 (mensalidades)

Cobre D-80 e D-83. Critérios: CA-392, CA-394, CB-96, CB-97, CB-98 e o resto do CA-405.

**Files:**
- Modify: `supabase/functions/_shared/webhook.ts`
- Modify: `src/data/servidorWebhook.test.ts`

**Interfaces:**
- Consumes: Tarefa 5. Do `cobranca.ts`, entram também `dataOuNula` e `ehCicloDaAssinatura`; do `portas.ts`, `LinhaDaAssinatura`.
- Produces: `export function situacaoDaMensalidade(status: unknown, statusDoPagamento: unknown): 'paga' | 'recusada' | 'outra'`, e o `case 'subscription_authorized_payment'` em `porTopico`.

**`subscription_authorized_payment`: lê `GET /authorized_payments/{id}`**

| Situação | O que faz | Resultado | Resposta |
|---|---|---|---|
| sem resposta, 5xx ou 429; 401 ou 403 | nada | `falha: operadora fora` ou `falha: credencial recusada` | 500 |
| outro 4xx | nada | `ignorado: mensalidade não existe na operadora` | 200 |
| sem `preapproval_id` | nada | `ignorado: mensalidade sem assinatura` | 200 |
| nem paga nem recusada (`scheduled`, `pending`…) | nada | `ignorado: mensalidade {status}/{payment.status}` | 200 |
| paga e sem linha | nada (a adoção vem pelo aviso da assinatura) | `ignorado: mensalidade paga sem linha` | 200 |
| paga, linha ativa | grava `ultima_cobranca_paga` = `debit_date`, só se for mais nova. Grava `proxima_cobranca` = `next_payment_date` da assinatura; se essa leitura falhar, usa a prevista a partir do `debit_date` (CA-394) | `mensalidade paga` | 200 |
| paga, linha não ativa | só `ultima_cobranca_paga` (CB-97) | `mensalidade paga` ou `sem mudança: mensalidade já anotada` | 200 |
| recusada, linha já cancelada | nada (CB-96) | `sem mudança: já cancelada` | 200 |
| recusada, linha em outro status | cancela na operadora; depois grava `cancelada`, `expira_em` nulo, `encerrada_por 'recusa'` e `encerrada_em` = `debit_date` (CA-392) | `cortada: recusa ({status_detail})` | 200 |
| recusada, o cancelamento lá falhou | nada aqui; o aviso volta | `falha: recusa sem cancelar` | 500 |
| recusada, sem linha com esta assinatura | cancela só ela, lá (CB-98) | `cancelada: recusa sem linha` | 200 |

"Paga" é `payment.status === 'approved'`. "Recusada" é `payment.status === 'rejected'`, ou `status === 'recycling'` (a operadora tentando de novo depois de uma recusa).

- [ ] **Step 1: Escrever os testes que falham**

Em `src/data/servidorWebhook.test.ts`, acrescente:

```ts
const MENSALIDADE = 'subscription_authorized_payment'
const AP = 'GET /authorized_payments/777'
const PAGA = { id: 777, preapproval_id: 'pre-1', status: 'processed', debit_date: '2026-11-06T13:00:00.000Z', payment: { id: 1, status: 'approved', status_detail: 'accredited' } }
const RECUSADA = { ...PAGA, status: 'recycling', retry_attempt: 1, payment: { id: 2, status: 'rejected', status_detail: 'cc_rejected_insufficient_amount' } }
/** Um mês depois de AGORA, uma hora depois da cobrança de 6/11. */
const NO_DIA = new Date('2026-11-06T14:00:00.000Z')
const ATIVA_PRE1 = { nutricionista_id: 'u1', plano: 'solo', status: 'ativa', ciclo: 'mensal', preapproval_id: 'pre-1', proxima_cobranca: '2026-11-06T15:00:00.000Z' }
const depsNoDia = (c: Cenario) => ({ ...deps(c), agora: () => NO_DIA })
```

`situacaoDaMensalidade`, com `it.each`:

| status | payment.status | situação |
|---|---|---|
| `'processed'` | `'approved'` | `'paga'` |
| `'processed'` | `'rejected'` | `'recusada'` |
| `'recycling'` | `'rejected'` | `'recusada'` |
| `'recycling'` | `undefined` | `'recusada'` |
| `'scheduled'` | `undefined` | `'outra'` |
| `'processed'` | `'in_process'` | `'outra'` |

Os testes:

1. **`CA-394: mensalidade paga grava a data dela e a próxima cobrança da operadora`**
   - Com `[AP]: [responde(200, PAGA)]` e `[PRE]: [responde(200, { status: 'authorized', next_payment_date: '2026-12-06T13:00:00.000Z' })]`:
   - a linha fica com `{ status: 'ativa', ultima_cobranca_paga: '2026-11-06T13:00:00.000Z', proxima_cobranca: '2026-12-06T13:00:00.000Z' }`;
   - o resultado é `'mensalidade paga'`.
2. **`CA-394: sem a leitura da assinatura, a próxima é a prevista a partir do dia da cobrança`**
   - Sem a rota `[PRE]`: `proxima_cobranca` é `'2026-12-06T13:00:00.000Z'`.
3. **`mensalidade paga mais velha que a anotada não volta a data`**
4. **`CB-97: paga depois de a pessoa cancelar: a linha continua cancelada, só a data da última paga é gravada`**
   - Linha cancelada pela pessoa (`encerrada_por: 'pessoa'`, `expira_em: null`).
   - Fica `{ status: 'cancelada', expira_em: null, encerrada_por: 'pessoa', ultima_cobranca_paga: '2026-11-06T13:00:00.000Z' }`.
   - Nenhum `GET /preapproval` sai.
5. **`paga sem linha: ignorada (a adoção vem pelo aviso da assinatura)`**
6. **`CA-392 e CA-405: mensalidade recusada cancela lá e, só depois, aqui: cancelada, sem período, encerrada por recusa no dia da cobrança`**

    ```ts
    const c = cenario([ATIVA_PRE1], { [AP]: [responde(200, RECUSADA)], 'PUT /preapproval/pre-1': [responde(200)] })
    expect(await tratarAviso(aviso(MENSALIDADE, '777'), depsNoDia(c))).toBe(200)
    expect(c.ordem.indexOf('PUT /preapproval/pre-1')).toBeLessThan(c.ordem.indexOf('mudar'))
    expect(c.assinaturas.get('u1')).toMatchObject({ status: 'cancelada', expira_em: null, encerrada_por: 'recusa', encerrada_em: '2026-11-06T13:00:00.000Z' })
    expect(daLinhaAssinatura(c.assinaturas.get('u1'), NO_DIA).plano).toBe('free')
    expect(c.avisos[0]?.resultado).toBe('cortada: recusa (cc_rejected_insufficient_amount)')
    ```

    O `daLinhaAssinatura` vem de `@/domain/assinatura.ts`: é a conta voltando ao Free na hora, dita pelo domínio.
7. **`pendente com a primeira mensalidade recusada também é cortada`**
8. **`CB-96: o mesmo aviso de recusa de novo não muda nada nem cancela de novo`**
   - Rode o caso 6 duas vezes no mesmo cenário.
   - Na segunda, o resultado é `'sem mudança: já cancelada'`, sai um `PUT` só no total e `encerrada_em` não muda.
9. **`CB-98: recusa de uma assinatura que a pessoa já trocou por outra: só aquela é afetada, e só lá`**
   - Linha `{ ...ATIVA_PRE1, preapproval_id: 'pre-novo' }`, mais `[AP]: [responde(200, RECUSADA)]` (`preapproval_id: 'pre-1'`) e `PUT /preapproval/pre-1 → [responde(200)]`.
   - A linha continua ativa com `pre-novo`, sai o `PUT` para `pre-1` e o resultado é `'cancelada: recusa sem linha'`.
10. **`D-80: o cancelamento lá não pega: 500, a linha não muda e o aviso volta`**
    - `PUT` e `GET /preapproval/pre-1` sem resposta → 500, a linha continua ativa e o resultado é `'falha: recusa sem cancelar'`.
11. **`D-80: cancelou lá e o banco falhou: 500; na volta do aviso, termina sem erro`**
    - Com `c.falhar('mudar', 1)`: 500.
    - Na segunda vez: o `PUT` recusado com 400, o `GET` dizendo `cancelled`, e o resultado vira 200 com a linha cancelada.
12. **`CA-405: mensalidade sem resposta da operadora responde 500; 404 é ignorado com 200`**
13. **`mensalidade agendada ou em análise é anotada e não muda nada`**
14. **`mensalidade sem preapproval_id é ignorada`**

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/data/servidorWebhook.test.ts`
Expected: FAIL nos testes novos.

- [ ] **Step 3: Escrever as mensalidades**

Em `webhook.ts`, acrescente ao import `dataOuNula` e `ehCicloDaAssinatura` (de `./cobranca.ts`) e `type LinhaDaAssinatura` (de `./portas.ts`). Acrescente o `case 'subscription_authorized_payment': return tratarMensalidade(id, deps)` em `porTopico` e as funções abaixo:

```ts
/** D-83: paga é pagamento aprovado; recusada é pagamento recusado ou a operadora tentando de novo depois de uma recusa. */
export function situacaoDaMensalidade(status: unknown, statusDoPagamento: unknown): 'paga' | 'recusada' | 'outra' {
  if (statusDoPagamento === 'approved') return 'paga'
  if (statusDoPagamento === 'rejected' || status === 'recycling') return 'recusada'
  return 'outra'
}

/** O aviso de cada mensalidade (D-83): paga marca a data; recusada encerra a assinatura (D-80). */
async function tratarMensalidade(id: string, deps: DependenciasDoWebhook): Promise<Feito> {
  const lida = await deps.operadora('GET', `/authorized_payments/${encodeURIComponent(id)}`)
  if (!lida) return feito('falha: operadora fora', 500)
  const passageira = falhaPassageira(lida.status)
  if (passageira) return passageira
  const mensalidade = lida.dados
  if (!lida.ok || !mensalidade) return feito('ignorado: mensalidade não existe na operadora')
  const preapprovalId = textoCurto(mensalidade['preapproval_id'])
  if (!preapprovalId) return feito('ignorado: mensalidade sem assinatura')
  const pagamento = objeto(mensalidade['payment'])
  const situacao = situacaoDaMensalidade(mensalidade['status'], pagamento?.['status'])
  if (situacao === 'outra') return feito(`ignorado: mensalidade ${String(mensalidade['status'] ?? '?')}/${String(pagamento?.['status'] ?? '?')}`)

  const agora = deps.agora()
  // O dia da cobrança: o que a operadora diz, ou agora se ela não disser.
  const quando = dataOuNula(mensalidade['debit_date']) ?? agora.toISOString()
  const { linha, falha } = await deps.banco.lerDaOperadora(preapprovalId)
  if (falha) return falhaNoBanco(deps, falha, 'ler a assinatura da mensalidade')
  return situacao === 'paga'
    ? registrarPaga(preapprovalId, linha, quando, agora, deps)
    : cortarPorRecusa(preapprovalId, linha, quando, textoCurto(pagamento?.['status_detail']), agora, deps)
}

/** CA-394: a paga marca a data e, na ativa, a próxima cobrança. CB-97: na cancelada, só a data. */
async function registrarPaga(preapprovalId: string, linha: LinhaDaAssinatura | null, quando: string, agora: Date, deps: DependenciasDoWebhook): Promise<Feito> {
  if (!linha) return feito('ignorado: mensalidade paga sem linha')
  const maisNova = linha.ultima_cobranca_paga === null || Date.parse(quando) > Date.parse(linha.ultima_cobranca_paga)
  let proxima: string | null = null
  if (linha.status === 'ativa') {
    const assinatura = await deps.operadora('GET', `/preapproval/${encodeURIComponent(preapprovalId)}`)
    const daOperadora = assinatura?.ok ? dataDepoisDe(assinatura.dados?.['next_payment_date'], agora.getTime() + UM_DIA_MS) : null
    const prevista = ehCicloDaAssinatura(linha.ciclo) ? dataDepoisDe(previsaoDaProximaCobranca(new Date(quando), linha.ciclo), agora.getTime()) : null
    proxima = daOperadora ?? prevista
  }
  if (!maisNova && !proxima) return feito('sem mudança: mensalidade já anotada')
  const { falha } = await deps.banco.mudar(linha.nutricionista_id, preapprovalId, {
    atualizado_em: agora.toISOString(),
    ...(maisNova ? { ultima_cobranca_paga: quando } : {}),
    ...(proxima ? { proxima_cobranca: proxima } : {}),
  })
  if (falha) return falhaNoBanco(deps, falha, 'gravar a mensalidade paga')
  return feito('mensalidade paga')
}

/** D-80 e CA-392: a primeira recusa encerra a assinatura na operadora e, só depois, aqui. A conta volta ao Free na hora. */
async function cortarPorRecusa(preapprovalId: string, linha: LinhaDaAssinatura | null, quando: string, motivo: string | null, agora: Date, deps: DependenciasDoWebhook): Promise<Feito> {
  // CB-96: o mesmo aviso de novo (ou outra recusa da mesma assinatura) não muda nada nem cancela de novo.
  if (linha?.status === 'cancelada') return feito('sem mudança: já cancelada')
  // Primeiro lá. Se não pegar, nada muda aqui e o aviso volta: cortar só aqui deixaria a operadora
  // cobrando de novo quem já está no Free.
  if (!(await cancelarNaOperadora(deps.operadora, preapprovalId))) {
    deps.log('CANCELAMENTO FALHOU: mensalidade recusada e a assinatura continua na operadora; o aviso volta:', preapprovalId)
    return feito('falha: recusa sem cancelar', 500)
  }
  // CB-98: sem linha com esta assinatura (a pessoa já tem outra), só ela é afetada, e só lá.
  if (!linha) return feito('cancelada: recusa sem linha')
  const { falha } = await deps.banco.mudar(linha.nutricionista_id, preapprovalId, {
    status: 'cancelada',
    expira_em: null,
    encerrada_por: 'recusa',
    encerrada_em: quando,
    atualizado_em: agora.toISOString(),
  })
  if (falha) return falhaNoBanco(deps, falha, 'gravar o corte por recusa')
  return feito(`cortada: recusa${motivo ? ` (${motivo})` : ''}`)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/data/servidorWebhook.test.ts`, que deve dar PASS, incluindo o teste do id numérico da Tarefa 5, que agora chega em `/authorized_payments/123456789`. Depois, `npm run check`, que deve ficar verde.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/_shared/webhook.ts src/data/servidorWebhook.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(webhook): mensalidade paga atualiza a cobrança; recusada encerra a assinatura na hora`

---

### Tarefa 7: Servidor: as três funções viram ligação fina

Cobre o D-88 (a ligação). Esta é a única tarefa que mexe nos `index.ts`.

**Files:**
- Create: `supabase/functions/_shared/bancoSupabase.ts`
- Modify: `supabase/functions/assinar/index.ts`, `supabase/functions/gerenciar-assinatura/index.ts` e `supabase/functions/webhook-mercadopago/index.ts` (cada um, o arquivo inteiro)
- Create: `src/data/servidorLigacao.test.ts`
- Modify: `src/data/sqlCheckout.test.ts`

**Interfaces:**
- Consumes: Tarefas 1 (colunas), 3, 4, 5 e 6.
- Produces:

```ts
// bancoSupabase.ts (Deno; o Vitest só lê o texto)
export function criarBanco(cliente: SupabaseClient): BancoDaCobranca
export function quemPede(cliente: SupabaseClient, autorizacao: string | null): Promise<ContaQuePede | null>
```

Os `index.ts` não exportam nada. Os contratos HTTP ficam como estão; muda só a resposta do webhook sem configuração, que passa a ser 500.

**Testes de texto que saem e o que os substitui:**

| Teste antigo (`sqlCheckout.test.ts`) | Vira |
|---|---|
| `describe('função assinar …')`, inteiro | `servidorAssinar.test.ts` (Tarefa 3) e as travas de ligação abaixo |
| `describe('webhook …')`, inteiro | `servidorWebhook.test.ts` (Tarefas 5 e 6) |
| `describe('função gerenciar-assinatura …')`, inteiro | `servidorGerenciar.test.ts` (Tarefa 4) |
| `C1` "o POST tem prazo de 30 s" | `servidorOperadora.test.ts` (o prazo do POST) e a trava `prazoDoPostMs: 30_000` abaixo |
| `C1` "a assinar usa o cliente com a chave de serviço" | trava abaixo, nas três funções |
| "só mexe na linha da mesma assinatura" | trava em `bancoSupabase.ts` abaixo, mais o banco falso que exige conta e assinatura |

Ficam: `describe('banco: o cartão da assinatura (spec checkout-proprio, 008)')` e `describe('o site publicado (D-72)')`. Saem os imports `?raw` das três funções e o `registros`, se ficarem sem uso.

- [ ] **Step 1: Escrever os testes de ligação que falham**

Crie `src/data/servidorLigacao.test.ts`:

```ts
import assinarIndex from '../../supabase/functions/assinar/index.ts?raw'
import gerenciarIndex from '../../supabase/functions/gerenciar-assinatura/index.ts?raw'
import webhookIndex from '../../supabase/functions/webhook-mercadopago/index.ts?raw'
import bancoSupabase from '../../supabase/functions/_shared/bancoSupabase.ts?raw'
import nucleoAssinar from '../../supabase/functions/_shared/assinar.ts?raw'
import cobranca from '../../supabase/functions/_shared/cobranca.ts?raw'
import nucleoGerenciar from '../../supabase/functions/_shared/gerenciarAssinatura.ts?raw'
import operadora from '../../supabase/functions/_shared/operadora.ts?raw'
import portas from '../../supabase/functions/_shared/portas.ts?raw'
import nucleoWebhook from '../../supabase/functions/_shared/webhook.ts?raw'

const INDICES = { assinar: assinarIndex, 'gerenciar-assinatura': gerenciarIndex, 'webhook-mercadopago': webhookIndex }
const NUCLEOS = { assinar: nucleoAssinar, gerenciarAssinatura: nucleoGerenciar, webhook: nucleoWebhook, operadora, portas, cobranca }
const registros = (codigo: string) => codigo.split('\n').filter((linha) => linha.includes('console.'))

describe('as funções são só ligação (D-88)', () => {
  it.each(Object.entries(INDICES))('%s: cliente com a chave de serviço, banco de verdade, e nenhuma decisão', (_, codigo) => {
    expect(codigo).toContain('createClient(urlSupabase, servico)')
    expect(codigo).toContain("from '../_shared/bancoSupabase.ts'")
    expect(codigo).not.toMatch(/\.from\(|api\.mercadopago\.com|traduzirStatus|preapproval|PLANOS/)
  })

  it.each(Object.entries(NUCLEOS))('%s: sem Deno, sem esm.sh, sem console e sem relógio solto', (_, codigo) => {
    expect(codigo).not.toMatch(/Deno\.|esm\.sh|console\.|Date\.now\(\)|new Date\(\)/)
  })

  it('prazos: criar a assinatura espera 30 s; gerenciar, 10 s; o aviso, 4 s por pedido (a operadora espera a resposta por 22 s)', () => {
    expect(assinarIndex).toContain('prazoDoPostMs: 30_000')
    expect(gerenciarIndex).toContain('prazoMs: 10_000')
    expect(webhookIndex).toContain('const PRAZO_DO_AVISO_MS = 4_000')
  })

  it('o aviso lê o data.id e o type da URL e os dois cabeçalhos da assinatura', () => {
    expect(webhookIndex).toContain("url.searchParams.get('data.id')")
    expect(webhookIndex).toContain("url.searchParams.get('type')")
    expect(webhookIndex).toContain("req.headers.get('x-signature')")
    expect(webhookIndex).toContain("req.headers.get('x-request-id')")
  })

  it('o aviso sem configuração responde 500, para a operadora mandar de novo depois', () => {
    expect(webhookIndex).toMatch(/if \(!token \|\| !urlSupabase \|\| !servico\) \{[\s\S]*?status: 500/)
  })

  it('nenhum registro das funções leva o corpo do pedido nem o código do cartão', () => {
    for (const codigo of Object.values(INDICES)) for (const linha of registros(codigo)) expect(linha).not.toMatch(/corpo|card_token|cartao/)
  })
})

describe('o banco de verdade (bancoSupabase.ts)', () => {
  it('só mexe na linha da conta com a mesma assinatura da operadora', () => {
    expect(bancoSupabase).toContain(".update(mudanca).eq('nutricionista_id', conta).eq('preapproval_id', preapprovalId)")
  })
  it('CB-95: a assinatura nova é gravada por cima da linha da conta', () => {
    expect(bancoSupabase).toContain("upsert(nova, { onConflict: 'nutricionista_id' })")
  })
  it('C1: a reserva vencida sai pela data, e a reserva guarda o cartão (CA-400)', () => {
    expect(bancoSupabase).toContain(".from('assinando_agora').delete().eq('nutricionista_id', conta).lt('desde', antesDe)")
    expect(bancoSupabase).toContain('insert({ nutricionista_id: conta, cartao_bandeira: cartao.bandeira, cartao_final: cartao.final })')
  })
  it('CA-398: os avisos velhos saem pela data de chegada', () => {
    expect(bancoSupabase).toContain(".from('avisos_da_operadora').delete().lt('recebido_em', data)")
  })
  it('lê as colunas do 009', () => {
    for (const coluna of ['ultima_cobranca_paga', 'encerrada_por', 'ciclo', 'cartao_final']) expect(bancoSupabase).toContain(coluna)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/data/servidorLigacao.test.ts`
Expected: FAIL, porque falta o `bancoSupabase.ts` e os `index.ts` ainda decidem tudo.

- [ ] **Step 3: `bancoSupabase.ts`**

```ts
// O banco de verdade das três funções: o supabase-js com a chave de serviço, que passa por cima do RLS
// (spec cobranca-em-producao, D-88). É o único arquivo de _shared que importa do esm.sh, e o Vitest não o
// executa: aqui só se traduz cada consulta, e src/data/servidorLigacao.test.ts confere o texto.
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import type { BancoDaCobranca, ContaQuePede, FalhaDoBanco, LinhaDaAssinatura } from './portas.ts'

const COLUNAS = 'nutricionista_id, plano, status, ciclo, preapproval_id, cartao_final, proxima_cobranca, expira_em, ultima_cobranca_paga, encerrada_por'

const falhaDe = (erro: { readonly message: string; readonly code?: string } | null): FalhaDoBanco | null =>
  erro ? { mensagem: erro.message, codigo: erro.code ?? null } : null

export function criarBanco(cliente: SupabaseClient): BancoDaCobranca {
  return {
    async lerDaConta(conta) {
      const { data, error } = await cliente.from('assinaturas').select(COLUNAS).eq('nutricionista_id', conta).maybeSingle()
      return { linha: (data as LinhaDaAssinatura | null) ?? null, falha: falhaDe(error) }
    },
    async lerDaOperadora(preapprovalId) {
      const { data, error } = await cliente.from('assinaturas').select(COLUNAS).eq('preapproval_id', preapprovalId).maybeSingle()
      return { linha: (data as LinhaDaAssinatura | null) ?? null, falha: falhaDe(error) }
    },
    async gravar(nova) {
      const { error } = await cliente.from('assinaturas').upsert(nova, { onConflict: 'nutricionista_id' })
      return falhaDe(error)
    },
    async mudar(conta, preapprovalId, mudanca) {
      const { data, error } = await cliente.from('assinaturas').update(mudanca).eq('nutricionista_id', conta).eq('preapproval_id', preapprovalId).select('nutricionista_id')
      return { linhas: data?.length ?? 0, falha: falhaDe(error) }
    },
    async soltarReservaVencida(conta, antesDe) {
      const { error } = await cliente.from('assinando_agora').delete().eq('nutricionista_id', conta).lt('desde', antesDe)
      return falhaDe(error)
    },
    async reservar(conta, cartao) {
      const { error } = await cliente.from('assinando_agora').insert({ nutricionista_id: conta, cartao_bandeira: cartao.bandeira, cartao_final: cartao.final })
      return falhaDe(error)
    },
    async lerReserva(conta) {
      const { data, error } = await cliente.from('assinando_agora').select('cartao_bandeira, cartao_final').eq('nutricionista_id', conta).maybeSingle()
      if (error || !data) return null
      const reserva = data as { readonly cartao_bandeira: string | null; readonly cartao_final: string | null }
      return { cartao_bandeira: reserva.cartao_bandeira ?? null, cartao_final: reserva.cartao_final ?? null }
    },
    async soltarReserva(conta) {
      const { error } = await cliente.from('assinando_agora').delete().eq('nutricionista_id', conta)
      return falhaDe(error)
    },
    async anotarAviso(aviso) {
      const { error } = await cliente.from('avisos_da_operadora').insert(aviso)
      return falhaDe(error)
    },
    async apagarAvisosAntesDe(data) {
      const { error } = await cliente.from('avisos_da_operadora').delete().lt('recebido_em', data)
      return falhaDe(error)
    },
  }
}

/** Quem está pedindo: o token da sessão vem no cabeçalho Authorization. Sem ele, ninguém. */
export async function quemPede(cliente: SupabaseClient, autorizacao: string | null): Promise<ContaQuePede | null> {
  const { data, error } = await cliente.auth.getUser((autorizacao ?? '').replace('Bearer ', ''))
  if (error || !data.user) return null
  return { id: data.user.id, email: data.user.email ?? null }
}
```

- [ ] **Step 4: Os três `index.ts`**

`supabase/functions/assinar/index.ts`:

```ts
// Assina com o cartão, dentro do site (spec checkout-proprio; spec cobranca-em-producao). A decisão
// mora em ../_shared/assinar.ts, que o Vitest executa; aqui só se liga o ambiente.
//
// Roda no servidor porque precisa do access token da operadora, que dá poder de cobrar em nome do dono.
// Deno / Supabase Edge Functions. Não faz parte do build do app.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { assinar } from '../_shared/assinar.ts'
import { criarBanco, quemPede } from '../_shared/bancoSupabase.ts'
import { CABECALHOS, responder } from '../_shared/cobranca.ts'
import { criarOperadora } from '../_shared/operadora.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })
  if (req.method !== 'POST') return responder({ erro: 'Use POST.' }, 405)

  const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
  const urlSupabase = Deno.env.get('SUPABASE_URL')
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const site = (Deno.env.get('SITE_URL') ?? 'https://metanutri.com.br/').replace(/[?#].*$/, '')
  if (!token || !urlSupabase || !servico) return responder({ erro: 'A função não está configurada no servidor.' }, 500)

  const cliente = createClient(urlSupabase, servico)
  const lido: unknown = await req.json().catch(() => null)
  const resposta = await assinar(
    { conta: await quemPede(cliente, req.headers.get('Authorization')), corpo: lido, site },
    // O POST espera o banco conferir o cartão, bem antes de a reserva vencer (5 minutos) e do limite da função.
    { operadora: criarOperadora(token, { prazoMs: 10_000, prazoDoPostMs: 30_000 }), banco: criarBanco(cliente), agora: () => new Date(), log: console.error },
  )
  return responder(resposta.corpo, resposta.status)
})
```

`supabase/functions/gerenciar-assinatura/index.ts`: mesma forma, chamando `gerenciarAssinatura({ conta, corpo: lido }, { operadora: criarOperadora(token, { prazoMs: 10_000, prazoDoPostMs: 10_000 }), banco: criarBanco(cliente), agora: () => new Date(), log: console.error })`. O comentário do topo diz que a função cancela, troca o cartão e responde a prévia do cancelamento (D-81), e que a decisão mora em `../_shared/gerenciarAssinatura.ts`.

`supabase/functions/webhook-mercadopago/index.ts`:

```ts
// Recebe os avisos da operadora de pagamento (spec cobranca-em-producao, D-83 e D-84). A decisão mora
// em ../_shared/webhook.ts, que o Vitest executa; aqui só se liga o ambiente. Publicada com
// --no-verify-jwt: quem chama é a operadora, que não tem conta no Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { criarBanco } from '../_shared/bancoSupabase.ts'
import { criarOperadora } from '../_shared/operadora.ts'
import { tratarAviso } from '../_shared/webhook.ts'

/** A operadora espera a resposta por 22 s. Com até quatro pedidos a ela por aviso, 4 s cada cabe. */
const PRAZO_DO_AVISO_MS = 4_000

Deno.serve(async (req: Request) => {
  const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
  const urlSupabase = Deno.env.get('SUPABASE_URL')
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token || !urlSupabase || !servico) {
    // Sem configuração não dá para ler nem anotar. O 500 faz a operadora mandar de novo depois.
    console.error('Função sem configuração; o aviso volta depois.')
    return new Response('sem configuração', { status: 500 })
  }
  const url = new URL(req.url)
  const lido: unknown = await req.json().catch(() => null)
  const status = await tratarAviso(
    {
      corpo: lido,
      idNaUrl: url.searchParams.get('data.id'),
      tipoNaUrl: url.searchParams.get('type'),
      xSignature: req.headers.get('x-signature'),
      xRequestId: req.headers.get('x-request-id'),
    },
    {
      operadora: criarOperadora(token, { prazoMs: PRAZO_DO_AVISO_MS, prazoDoPostMs: PRAZO_DO_AVISO_MS }),
      banco: criarBanco(createClient(urlSupabase, servico)),
      segredo: Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET') || null,
      agora: () => new Date(),
      log: console.error,
    },
  )
  return new Response(status === 200 ? 'ok' : 'tente de novo', { status })
})
```

Nenhum comentário dos `index.ts` pode ter a palavra `preapproval`, por causa da trava do Step 1.

- [ ] **Step 5: Tirar os testes de texto que viraram de comportamento**

Em `src/data/sqlCheckout.test.ts`, apague os três `describe` das funções e os imports e o helper que ficarem sem uso, como diz a tabela acima.

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run src/data`, que deve dar PASS. Depois, `npm run check`, que deve ficar verde.

O Deno não está instalado nesta máquina (`deno check` indisponível). A conferência dos `index.ts` no Deno acontece na publicação, com o dono. Se `npx supabase functions deploy` acusar erro de import ou de tipo, a correção vem antes de seguir.

- [ ] **Step 7: Commit**

```bash
git add supabase/functions/_shared/bancoSupabase.ts supabase/functions/assinar/index.ts supabase/functions/gerenciar-assinatura/index.ts supabase/functions/webhook-mercadopago/index.ts src/data/servidorLigacao.test.ts src/data/sqlCheckout.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `refactor(servidor): as três funções viram ligação fina para os núcleos testados`

---

### Tarefa 8: Conta e plano: recusa e janela de cancelar que confere a cobrança

Cobre D-80 e D-81 na tela. Critérios: CA-392 (no domínio), CA-393, CA-395, CA-396 e CA-397.

**Files:**
- Modify: `src/domain/assinatura.ts` e `src/domain/assinatura.test.ts`
- Modify: `src/domain/assinaturaTextos.ts` e `src/domain/assinaturaTextos.test.ts`
- Modify: `src/ui/estado/usarAssinatura.ts` e `src/ui/estado/usarAssinatura.test.ts`
- Modify: `src/ui/conta/DialogoCancelarAssinatura.tsx`, `src/ui/conta/TelaConta.tsx` e `src/ui/conta/TelaConta.test.tsx`
- Modify: `src/AppConta.test.tsx` e `src/ui/limpezaVisual.test.tsx` (os mocks de `useAssinatura`)

**Interfaces:**
- Consumes: o contrato `previa` da Tarefa 4: `200 { cobrada: boolean, expiraEm: string | null }`.
- Produces:

```ts
// assinatura.ts
export type EncerradaPor = 'pessoa' | 'recusa' | 'operadora'
interface Assinatura {
  // …os campos de hoje, mais:
  readonly ultimaCobrancaPaga: string | null
  readonly encerradaPor: EncerradaPor | null
  readonly encerradaEm: string | null
}
// SEM_ASSINATURA ganha os três como null.

// assinaturaTextos.ts
export interface PreviaDoCancelamento { readonly cobrada: boolean; readonly expiraEm: string | null }
export const CONFERINDO_COBRANCA = 'Conferindo se já houve cobrança…'
export const PREVIA_FALHOU = 'Não consegui conferir se já houve cobrança.'
export function recadoDaAssinatura(a: Assinatura): string | null           // era const; ganha a recusa
export function textoDoCancelamento(a: Assinatura, previa: PreviaDoCancelamento | null): string
// valeAteSeCancelar sai (a data agora vem do servidor)

// usarAssinatura.ts
export type ResultadoDaPrevia =
  | { readonly ok: true; readonly cobrada: boolean; readonly expiraEm: string | null }
  | { readonly ok: false; readonly erro: string }
interface ValorAssinatura { /* …os de hoje, mais: */ readonly previaDoCancelamento: () => Promise<ResultadoDaPrevia> }

// DialogoCancelarAssinatura ganha a prop:
readonly previa: () => Promise<ResultadoDaPrevia>
```

**Textos (exatos):**

| Quando | Texto |
|---|---|
| Recusa, com a data (CA-393) | `O banco recusou a cobrança de {formatarDataLonga(encerradaEm)}. A assinatura foi encerrada e a conta voltou ao Free.` |
| Recusa, sem a data | `O banco recusou a cobrança. A assinatura foi encerrada e a conta voltou ao Free.` |
| Janela, conferindo | `Conferindo se já houve cobrança…`, com os pontos da marca pulsando |
| Janela, sem cobrança ainda (CA-395) | `Ainda não houve cobrança. Cancelando agora, nada é cobrado e a conta volta ao Free na hora.` |
| Janela, com cobrança e data (CA-396, como o CA-377) | `O plano {nome} continua até {data}, o fim do período já pago. Depois você volta para o Free, sem perder nenhum plano.` |
| Janela, com cobrança e sem data à frente | `Cancelando agora, a conta volta ao Free na hora e nada mais é cobrado.` |
| Janela, pendente ou pausada (não pergunta ao servidor) | `A assinatura do plano {nome} para e nada mais é cobrado. Você continua no plano Free.` (o texto de hoje) |
| Janela, sem resposta do servidor (CA-397) | `Não consegui conferir se já houve cobrança.` e o botão `Tentar de novo`; "Cancelar assinatura" parado |

- [ ] **Step 1: Escrever os testes que falham**

`src/domain/assinatura.test.ts`:
- **`D-83 e D-80: lê a última mensalidade paga, quem encerrou e quando`**: `{ ultima_cobranca_paga, encerrada_por: 'recusa', encerrada_em }` vira `{ ultimaCobrancaPaga, encerradaPor: 'recusa', encerradaEm }`.
- **`quem encerrou desconhecido e data quebrada viram nulo`**: `encerrada_por: 'banco'` vira `null`; `encerrada_em: 'ontem'` vira `null`.
- **`linha de antes do 009 lê nulos, sem quebrar`**.
- **`CA-392: cancelada por recusa, sem data, vale o Free na hora`**: `{ plano: 'solo', status: 'cancelada', expira_em: null, encerrada_por: 'recusa' }` → `plano` igual a `'free'`.

`src/domain/assinaturaTextos.test.ts`:
- **`CA-393: o recado da recusa diz o dia da cobrança recusada`**: `{ ...SEM_ASSINATURA, planoPedido: 'solo', status: 'cancelada', encerradaPor: 'recusa', encerradaEm: '2026-11-06T13:00:00.000Z' }` → `'O banco recusou a cobrança de 6 de novembro de 2026. A assinatura foi encerrada e a conta voltou ao Free.'`.
- **`CA-393: sem a data, o recado sem data`**.
- **`a cancelada pela pessoa ou pela operadora não ganha recado (D-79)`**.
- **`CA-395: sem cobrança ainda`**: `textoDoCancelamento(PAGA, { cobrada: false, expiraEm: null })` → o texto CA-395.
- **`CA-396: com cobrança, até quando vale`**: `textoDoCancelamento(PAGA, { cobrada: true, expiraEm: '2026-11-02T02:59:59.000Z' })` → `'O plano Solo continua até 1 de novembro de 2026, o fim do período já pago. Depois você volta para o Free, sem perder nenhum plano.'`.
- **`cobrada sem data à frente: Free na hora`**.
- **`pendente e pausada: o texto de sempre, sem prévia`**: `textoDoCancelamento({ ...PAGA, plano: 'free', status: 'pendente' }, null)` → `'A assinatura do plano Solo para e nada mais é cobrado. Você continua no plano Free.'`.
- **`CA-381: nenhum texto da recusa ou do cancelamento cita o processador`**.
- Apague os testes de `valeAteSeCancelar`, que viraram estes, e tire `valeAteSeCancelar` do import.

`src/ui/estado/usarAssinatura.test.ts`:
- **`CA-395 e CA-396: a prévia pergunta ao servidor e devolve se já houve cobrança e até quando vale`**: `invoke` é chamado com `('gerenciar-assinatura', { body: { acao: 'previa' } })` e responde `{ cobrada: true, expiraEm: '2026-11-02T02:59:59.000Z' }`, que vira `{ ok: true, cobrada: true, expiraEm: '2026-11-02T02:59:59.000Z' }`.
- **`a prévia não relê a assinatura`**: `cliente.leituras` não muda.
- **`CA-397: sem resposta ou resposta fora do formato, a prévia falha`**:
  - `{ data: null, error: new Error('Failed to fetch') }` → `{ ok: false, erro: SERVIDOR_FORA }`;
  - `{ data: { cobrada: 'sim' }, error: null }` → `ok: false`;
  - `{ data: { cobrada: true }, error: null }` (sem `expiraEm`) → `ok: false`.

`src/ui/conta/TelaConta.test.tsx`:
- O `estado` ganha `previa: vi.fn(async (): Promise<ResultadoDaPrevia> => ({ ok: true, cobrada: true, expiraEm: '2026-11-02T02:59:59.000Z' }))`. O mock devolve `previaDoCancelamento: estado.previa`, e o `afterEach` volta a prévia ao padrão.
- Acrescente o helper:

```ts
/** Abre a confirmação de cancelar e espera a prévia chegar (D-81: "Cancelar assinatura" fica parado até lá). */
async function abrirCancelamento(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
  const janela = screen.getByRole('dialog', { name: 'Cancelar a assinatura?' })
  await waitFor(() => expect(within(janela).getByRole('button', { name: 'Cancelar assinatura' })).toBeEnabled())
  return janela
}
```

- Os testes que hoje clicam em confirmar logo depois de abrir passam a usar `abrirCancelamento`: CA-378, CB-92, "cancelamento que falha", CA-380 do aviso e "cancelamento que falha não avisa o App".
- Testes novos ou trocados:
  - **`CA-393: encerrada por recusa mostra a data da cobrança recusada uma vez e "Assinar de novo", que leva ao checkout no mesmo plano e ciclo`**:
    - estado `{ ...SEM_ASSINATURA, planoPedido: 'solo', status: 'cancelada', ciclo: 'mensal', encerradaPor: 'recusa', encerradaEm: '2026-10-02T13:00:00.000Z' }`;
    - o texto `'O banco recusou a cobrança de 2 de outubro de 2026. A assinatura foi encerrada e a conta voltou ao Free.'` aparece uma vez;
    - sem `Cancelar assinatura`;
    - `Assinar de novo` chama `aoAssinar('solo', 'mensal')`.
  - **`D-81: a confirmação pergunta ao servidor ao abrir e só deixa confirmar quando ele responde`**:
    - a prévia fica pendente (promessa presa);
    - o texto mostra `CONFERINDO_COBRANCA`;
    - "Cancelar assinatura" fica `toBeDisabled()` e "Manter assinatura" fica ativo;
    - quando a prévia resolve, o botão é liberado;
    - `estado.previa` é chamado uma vez.
  - **`CA-395: sem cobrança ainda, diz que nada é cobrado e a conta volta ao Free na hora; confirmar pede ao servidor uma vez`**.
  - **`CA-396 e CA-377: com cobrança, diz até quando vale, pela data do servidor`**. É o teste CA-377 de hoje, agora com a data vinda da prévia.
  - **`CA-397: sem resposta, diz que não conseguiu conferir, oferece tentar de novo e não deixa confirmar`**:
    - a prévia devolve `{ ok: false, erro: SERVIDOR_FORA }`;
    - aparece `'Não consegui conferir se já houve cobrança.'` e "Cancelar assinatura" fica parado;
    - clicar em `Tentar de novo` (com a prévia agora ok) chama a prévia pela segunda vez e libera o botão.
  - **`uma prévia atrasada da abertura anterior não troca o texto da nova`**:
    - a primeira prévia fica presa; "Manter assinatura" fecha a janela;
    - a segunda abertura resolve com `cobrada: false`;
    - solte a primeira com `cobrada: true`: o texto continua o do CA-395.
  - **`pendente do fluxo novo não pergunta ao servidor: confirma na hora, com o texto de sempre`**: `estado.previa` não é chamado.
  - **`cobrada sem data à frente: diz que a conta volta ao Free na hora`**. Este substitui o "foco 4".
  - **`CA-383: os pontos da marca no lugar da roda enquanto confere`**. Os testes CA-381 e CA-383 de hoje continuam e cobrem a janela nova.

`src/AppConta.test.tsx`: o mock ganha `previaDoCancelamento: vi.fn(async () => ({ ok: true as const, cobrada: true, expiraEm: '2026-11-02T02:59:59.000Z' }))`. O teste "CA-380: depois de cancelar…" espera o botão ser liberado antes de confirmar, com o mesmo `waitFor … toBeEnabled()`.

`src/ui/limpezaVisual.test.tsx`: o mock ganha `previaDoCancelamento: vi.fn()`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/assinatura.test.ts src/domain/assinaturaTextos.test.ts src/ui/estado/usarAssinatura.test.ts src/ui/conta/TelaConta.test.tsx src/AppConta.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Domínio**

`assinatura.ts`:
- `type EncerradaPor` e a lista `ENCERRAMENTOS: readonly EncerradaPor[] = ['pessoa', 'recusa', 'operadora']`.
- Os três campos novos na interface, com o comentário:
  - `ultimaCobrancaPaga`: "D-83: quando caiu a última mensalidade paga; nulo antes da primeira e nas linhas de antes do 009";
  - `encerradaPor`: "quem encerrou a cancelada: a pessoa, o banco ao recusar (D-80) ou a operadora sozinha";
  - `encerradaEm`: "quando: na recusa, o dia da cobrança recusada (CA-393)".
- `SEM_ASSINATURA` ganha os três como `null`.
- `daLinhaAssinatura` lê `ultima_cobranca_paga` e `encerrada_em` com `dataOuNulo`, e `encerrada_por` só se estiver em `ENCERRAMENTOS`.
- Atualize o comentário do `canceladaValendo`: a cancelada sem data à frente volta ao Free na hora, seja pela operadora (CB-94), pela recusa (D-80) ou por cancelar antes da primeira cobrança (D-81).

`assinaturaTextos.ts`:

```ts
/** D-81: o que a janela de cancelar ouviu do servidor (a ação `previa` da gerenciar-assinatura). */
export interface PreviaDoCancelamento {
  readonly cobrada: boolean
  readonly expiraEm: string | null
}

export const CONFERINDO_COBRANCA = 'Conferindo se já houve cobrança…'
export const PREVIA_FALHOU = 'Não consegui conferir se já houve cobrança.'

/** O recado embaixo de "Seu plano", ou nulo quando o cartão do plano já diz tudo (D-79). CA-393: a recusa diz o dia. */
export function recadoDaAssinatura(a: Assinatura): string | null {
  if (a.status === 'cancelada' && a.encerradaPor === 'recusa') {
    const quando = a.encerradaEm ? ` de ${formatarDataLonga(a.encerradaEm)}` : ''
    return `O banco recusou a cobrança${quando}. A assinatura foi encerrada e a conta voltou ao Free.`
  }
  return RECADO_STATUS[a.status]
}

/** CA-377, CA-395 e CA-396: o que a janela de cancelar diz. A ativa depende da prévia; pendente e pausada, não. */
export function textoDoCancelamento(a: Assinatura, previa: PreviaDoCancelamento | null): string {
  const nome = planoPorId(a.status === 'ativa' ? a.plano : a.planoPedido)?.nome ?? 'pago'
  if (a.status !== 'ativa' || !previa) return `A assinatura do plano ${nome} para e nada mais é cobrado. Você continua no plano Free.`
  if (!previa.cobrada) return 'Ainda não houve cobrança. Cancelando agora, nada é cobrado e a conta volta ao Free na hora.'
  if (previa.expiraEm) return `O plano ${nome} continua até ${formatarDataLonga(previa.expiraEm)}, o fim do período já pago. Depois você volta para o Free, sem perder nenhum plano.`
  return 'Cancelando agora, a conta volta ao Free na hora e nada mais é cobrado.'
}
```

Saem `valeAteSeCancelar`, o `aindaVem` (se ficar só com `linhaDaCobranca`, ele fica) e o import de `fimDoPeriodoPago`, se ficar sem uso.

- [ ] **Step 4: Estado**

Em `usarAssinatura.ts`:

```ts
export type ResultadoDaPrevia =
  | { readonly ok: true; readonly cobrada: boolean; readonly expiraEm: string | null }
  | { readonly ok: false; readonly erro: string }

// dentro de useAssinatura:
/** D-81: só leitura. Não entra na fila de um pedido por vez e não relê a assinatura. */
const previaDoCancelamento = useCallback(async (): Promise<ResultadoDaPrevia> => {
  const { dados, falha } = await chamar<{ readonly cobrada?: unknown; readonly expiraEm?: unknown }>('gerenciar-assinatura', { acao: 'previa' })
  if (falha) return { ok: false, erro: mensagemDaFalha(falha) }
  const cobrada = dados?.cobrada
  const expiraEm = dados?.expiraEm
  if (typeof cobrada !== 'boolean' || (expiraEm !== null && typeof expiraEm !== 'string')) return { ok: false, erro: SERVIDOR_FORA }
  return { ok: true, cobrada, expiraEm }
}, [])
```

Inclua `previaDoCancelamento` na interface `ValorAssinatura` e no `return`.

- [ ] **Step 5: A janela de cancelar**

`DialogoCancelarAssinatura.tsx`. Mantenha o `confirmar`, o `fechar` e os dois `ref` de hoje, e acrescente:

```tsx
type Conferencia = { readonly fase: 'conferindo' } | { readonly fase: 'falhou' } | { readonly fase: 'pronta'; readonly previa: PreviaDoCancelamento }
const CONFERINDO: Conferencia = { fase: 'conferindo' }

// dentro do componente:
const [conferencia, setConferencia] = useState<Conferencia>(CONFERINDO)
/** Só vale a resposta do último pedido de prévia (fechar e abrir de novo, ou "Tentar de novo"). Lido só em manipulador e em .then. */
const pedidoRef = useRef(0)
// Pendente e pausada voltam ao Free na hora, sem período: não há o que conferir (D-81).
const precisaConferir = assinatura.status === 'ativa'

const conferir = () => {
  pedidoRef.current += 1
  const meu = pedidoRef.current
  setConferencia(CONFERINDO)
  void previa().then(
    (r) => {
      if (pedidoRef.current === meu) setConferencia(r.ok ? { fase: 'pronta', previa: { cobrada: r.cobrada, expiraEm: r.expiraEm } } : { fase: 'falhou' })
    },
    () => {
      if (pedidoRef.current === meu) setConferencia({ fase: 'falhou' })
    },
  )
}

const pronta = !precisaConferir || conferencia.fase === 'pronta'
const descricao = !precisaConferir
  ? textoDoCancelamento(assinatura, null)
  : conferencia.fase === 'pronta'
    ? textoDoCancelamento(assinatura, conferencia.previa)
    : conferencia.fase === 'falhou'
      ? PREVIA_FALHOU
      : CONFERINDO_COBRANCA
```

Ligue as peças assim:
- `onOpenAutoFocus={() => { setErro(null); if (precisaConferir) conferir() }}`.
- No `onCloseAutoFocus`, além do de hoje: `pedidoRef.current += 1; setConferencia(CONFERINDO)`.
- `<DialogDescription aria-live="polite">{descricao}</DialogDescription>`.
- Logo abaixo do cabeçalho:
  - conferindo: `<PontosDaMarca pulsando />`;
  - falhou: `<Button variant="outline" size="sm" className="self-start" onClick={conferir}>Tentar de novo</Button>`.
- O botão de confirmar fica com `disabled={enviando || !pronta}`.
- O `confirmar` começa com `if (enviandoRef.current || !pronta) return`.
- O `valeAteSeCancelar` sai.
- O comentário do componente cita CA-377, CA-395 a CA-397 e D-81.

Os eventos de abrir e fechar do Radix são manipuladores de evento, não efeitos. Nada de `useEffect` aqui: o lint do React Compiler barraria o `setState` síncrono.

`TelaConta.tsx`: desestruture `previaDoCancelamento` de `useAssinatura` e passe `previa={previaDoCancelamento}` ao `DialogoCancelarAssinatura`. O recado da recusa já sai por `recadoDaAssinatura`, e o "Assinar de novo" da cancelada já existe (CA-380), então mais nada muda na tela.

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run src/domain src/ui/estado src/ui/conta src/AppConta.test.tsx src/ui/limpezaVisual.test.tsx`, que deve dar PASS. Depois, `npm run check`, que deve ficar verde, e `npx playwright test`, também verde.

- [ ] **Step 7: Commit**

```bash
git add src/domain/assinatura.ts src/domain/assinatura.test.ts src/domain/assinaturaTextos.ts src/domain/assinaturaTextos.test.ts src/ui/estado/usarAssinatura.ts src/ui/estado/usarAssinatura.test.ts src/ui/conta/DialogoCancelarAssinatura.tsx src/ui/conta/TelaConta.tsx src/ui/conta/TelaConta.test.tsx src/AppConta.test.tsx src/ui/limpezaVisual.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): recusa em Conta e plano e janela de cancelar que confere a cobrança`

---

### Tarefa 9: Campos do cartão: fonte do sistema como reserva

Cobre D-87 (CA-404). Tarefa pequena.

**Files:**
- Modify: `src/ui/pagamento/processadorCartao.ts`
- Modify: `src/ui/pagamento/processadorCartao.test.ts`
- Modify: `src/ui/pagamento/FormularioCartao.test.tsx`, linha 58

**Interfaces:**
- Produces: `export const FONTE_DOS_CAMPOS = "Manrope, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"`.
- O `style.fontFamily` do adaptador continua lendo a mesma constante, e o `customFonts` (`URL_DA_FONTE`) continua igual.
- A lista segue a `--font-corpo` de `design-system/tokens/tokens.css`, sem a `'Manrope Variable'`: dentro do iframe só existe a Manrope que vem do `customFonts`.

- [ ] **Step 1: Testes**

Em `processadorCartao.test.ts`, troque `fontFamily: 'Manrope'` por `fontFamily: FONTE_DOS_CAMPOS` e acrescente:

```ts
it('CA-404: Manrope primeiro e a fonte do sistema como reserva, nunca a serifada do navegador', () => {
  expect(FONTE_DOS_CAMPOS.split(',')[0]).toBe('Manrope')
  expect(FONTE_DOS_CAMPOS).toContain('system-ui')
  expect(FONTE_DOS_CAMPOS.trim().endsWith('sans-serif')).toBe(true)
})
```

Em `FormularioCartao.test.tsx`, troque `fontFamily: 'Manrope'` por `fontFamily: FONTE_DOS_CAMPOS`, importado de `./processadorCartao.ts`. Mantenha `CA-368` no nome do teste e acrescente `CA-404`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/pagamento/processadorCartao.test.ts`
Expected: FAIL no CA-404.

- [ ] **Step 3: A constante**

```ts
/**
 * R-34 e D-87: a letra do site dentro dos campos seguros. A Manrope vem do `customFonts`. Se ela não
 * carregar, vale a do sistema (a mesma lista da `--font-corpo`), nunca a serifada do navegador.
 */
export const FONTE_DOS_CAMPOS = "Manrope, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
```

A regra do lint barra o texto `font-family`, não o valor: a constante passa.

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run check`, que deve ficar verde. Depois, `npx playwright test`, também verde.

- [ ] **Step 5: Commit**

```bash
git add src/ui/pagamento/processadorCartao.ts src/ui/pagamento/processadorCartao.test.ts src/ui/pagamento/FormularioCartao.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `fix(pagamento): fonte do sistema como reserva nos campos do cartão`

**Conferência no navegador de verdade (obrigatória, com o dono, no site publicado; ver "Depois das tarefas", item 5).** O script dos campos seguros só abre com a chave pública e uma conta logada, então não dá para conferir em teste.
1. No DevTools, inspecione o campo dentro do iframe do número: a `font-family` calculada começa por `Manrope`.
2. Em *Network > Request blocking*, bloqueie `fonts.googleapis.com` e recarregue: o texto digitado sai sem serifa.

Se os campos não montarem, se o adaptador avisar erro, ou se a letra ficar serifada mesmo com a Manrope carregada, a operadora não aceita a lista. Nesse caso, volte a constante para `'Manrope'` e registre o R-34 como aceito.

---

### Tarefa 10: Documentação e validação final

**Files:**
- Modify: `README.md`: em "O que o sistema faz", a linha "Assinar"; em "Projeto já ligado", o passo 5.
- Modify: `docs/pendencias.md`
- Modify: `docs/decisoes.md` (uma linha nova no fim da tabela)
- Modify: `specs/checkout-proprio/SPEC.md` (a linha do D-68)

- [ ] **Step 1: README**

Em "O que o sistema faz", na linha **Assinar**, troque `` Precisa do
  `008-cartao-da-assinatura.sql`, das três funções e da chave pública `` por `` Precisa do
  `008-cartao-da-assinatura.sql`, do `009-cobranca-em-producao.sql`, das três funções e da chave pública ``.

Em "Projeto já ligado", passo 5, troque `Com o
   `008` rodado, publique as três funções desta versão e, logo em seguida, o site:` por `Com o
   `008` e o `009` rodados, publique as três funções desta versão e, logo em seguida, o site (nunca o site antes:
   a janela de cancelar nova pergunta à `gerenciar-assinatura` se já houve cobrança, e a versão antiga não sabe
   responder):`. Troque também:

```markdown
   Cadastre o webhook apontando para `https://qmpljfjbdcrdbqutuvmg.supabase.co/functions/v1/webhook-mercadopago`,
   evento Assinaturas.
```

por:

```markdown
   Cadastre o webhook apontando para `https://qmpljfjbdcrdbqutuvmg.supabase.co/functions/v1/webhook-mercadopago`,
   com os tópicos `subscription_preapproval` (a assinatura), `subscription_authorized_payment` (cada mensalidade) e
   `payments`, e guarde o segredo dele em `MERCADOPAGO_WEBHOOK_SECRET`. Cada aviso que chega fica 90 dias em
   *Table Editor > avisos_da_operadora*, com o resultado; sem o segredo, a coluna `assinatura_confere` fica vazia.
   No modo teste o Mercado Pago não manda aviso nenhum: a primeira conferência é na primeira compra em produção.
   A primeira mensalidade recusada encerra a assinatura e a conta volta ao Free na hora (D-80).
```

- [ ] **Step 2: `docs/pendencias.md`**

Troque `Atualizado em 02/10/2026.` por `Atualizado em 06/10/2026.`.

Troque o bloco que vai de `> **Premissa do D-68 corrigida.**` até a linha `>   e a troca de cartão.` (o fim da lista "Antes da produção") por:

```markdown
> **Atualizado em 06/10:** a **cobrança está pronta para produção** no código (spec `cobranca-em-producao`, D-80 a
> D-88). O que entrou:
>
> - a primeira mensalidade recusada encerra a assinatura na operadora, e a conta volta ao Free na hora;
> - cancelar antes de alguma mensalidade paga volta ao Free na hora, e a janela de cancelar diz isso antes, lido na
>   operadora;
> - cada aviso do Mercado Pago fica anotado por 90 dias em `avisos_da_operadora`, sem dado pessoal;
> - a assinatura criada lá cuja resposta se perdeu é achada (pela busca, na hora, ou pelo aviso, depois) e vale para
>   quem paga; se a conta já paga outra, a que sobrou é cancelada;
> - as três funções têm testes que executam a lógica, com a operadora e o banco simulados.
>
> **A ordem para pôr no ar** (comandos no README, "Projeto já ligado"):
>
> 1. rodar o `supabase/009-cobranca-em-producao.sql` (as funções novas leem as colunas dele; publicadas antes, toda
>    assinatura falha);
> 2. juntar o ramo na `main`;
> 3. publicar as três funções: `gerenciar-assinatura`, `assinar` e `webhook-mercadopago --no-verify-jwt`;
> 4. publicar o site. Nunca o site antes das funções.
>
> **A troca para produção (com você; spec, seção 5):**
>
> 1. ativar as credenciais de produção do app MetaNutri no Mercado Pago;
> 2. cadastrar o webhook de produção com os tópicos `subscription_preapproval`, `subscription_authorized_payment` e
>    `payments`, e colar no Supabase o token (`MERCADOPAGO_ACCESS_TOKEN`) e o segredo do webhook
>    (`MERCADOPAGO_WEBHOOK_SECRET`) de produção, nunca no chat;
> 3. mandar a chave pública de produção (pode ir no chat) para trocar a variável `VITE_MERCADOPAGO_PUBLIC_KEY` do
>    GitHub e publicar;
> 4. fazer a primeira assinatura de verdade com o próprio cartão e cancelar; conferir que os avisos aparecem em
>    `avisos_da_operadora` com `assinatura_confere` verdadeiro. Se nada aparecer, é o R-37 (o painel não manda os
>    avisos de assinatura).
>
> Fica para depois: avisar a pessoa por e-mail quando a cobrança for recusada (hoje Conta e plano avisa); a limpeza
> do registro de avisos acontece quando chega um aviso, então meses sem nenhum deixam os velhos lá mais tempo.
```

- [ ] **Step 3: `docs/decisoes.md`**

Nova linha no fim da tabela, antes de "Custos de referência":

```markdown
| 06/10/2026 | **Cobrança pronta para produção** (D-80 a D-88 da `specs/cobranca-em-producao/SPEC.md`, resumidas aqui): D-80 a primeira mensalidade recusada encerra a assinatura na operadora e a conta volta ao Free na hora, no lugar do "tenta por até 10 dias" do D-68 · D-81 cancelar antes de alguma mensalidade paga volta ao Free na hora, e a janela de cancelar diz isso antes, lido na operadora · D-82 a primeira cobrança continua em até cerca de 1 hora · D-83 o servidor ouve o aviso de cada mensalidade · D-84 cada aviso fica anotado por 90 dias, sem dado pessoal · D-85 a assinatura sem dono é adotada ou, se a conta já paga outra, cancelada · D-86 sucesso com a assinatura cancelada ou pausada conta como recusa · D-87 fonte do sistema como reserva nos campos do cartão · D-88 as três funções têm testes que executam a lógica | decisões suas de 06/10/2026 ("corta na primeira recusa", "faça") | usuário |
```

- [ ] **Step 4: `specs/checkout-proprio/SPEC.md`, o D-68 substituído**

Troque a linha inteira do D-68 por:

```markdown
| D-68 | A assinatura é criada **já autorizada** no cartão, e o plano pago **libera na hora** em que o banco autoriza. A primeira cobrança cai em até uma hora. ~~Se ela falhar, a operadora tenta de novo por até 10 dias e, sem conseguir, cancela, e aí o plano volta ao Free. Cortar já na primeira falha fica para antes da produção (decisão sua de 02/10, aprovando o plano)~~ **Substituído pelo D-80** (`specs/cobranca-em-producao/SPEC.md`, 06/10/2026): a primeira mensalidade recusada encerra a assinatura e a conta volta ao Free na hora | Quem paga quer usar na hora. O banco já validou o cartão |
```

- [ ] **Step 5: Validação completa**

Run: `npm run check`, que deve ficar verde.
Run: `npx playwright test`, que deve ficar verde.
Run: `npm run build`, que deve terminar sem erro (o domínio importa `supabase/functions/_shared/cobranca.ts`).
Run: `node scripts/conferir-publicacao.mjs`, que deve dizer "pode publicar".

- [ ] **Step 6: Cobertura dos critérios**

Run: `grep -rhoE "CA-(39[2-9]|40[0-5])|CB-(9[6-9])" src --include=*.test.ts --include=*.test.tsx | sort -u`
Expected: 18 linhas, de CA-392 a CA-405 e de CB-96 a CB-99. Confira com a tabela "Cobertura da spec".

Run: `grep -rniE "mercado ?pago" src --include=*.tsx | grep -v "\.test\." | grep -v "TelaPrivacidade.tsx" | grep -v "TelaNegocio.tsx"`
Expected: só comentários e o import de `processadorMercadoPago.ts` no `App.tsx`; nunca texto de tela (D-71, CA-381).

- [ ] **Step 7: Commit**

```bash
git add README.md docs/pendencias.md docs/decisoes.md specs/checkout-proprio/SPEC.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `docs: cobrança pronta para produção registrada`

---

## Depois das tarefas: o que fica com o dono (fora das tarefas, um passo de cada vez)

1. **Rodar o `009`.** Em `https://supabase.com/dashboard/project/qmpljfjbdcrdbqutuvmg/sql/new`, cole o arquivo inteiro e clique em **Run**. Depois rode a conferência do fim: três linhas, e `avisos_da_operadora` com `true`.
2. **Juntar o ramo na `main`** (`superpowers:finishing-a-development-branch`).
3. **Publicar as três funções, nesta ordem:** `gerenciar-assinatura`, `assinar` e `webhook-mercadopago --no-verify-jwt`. Se a publicação acusar erro de import ou de tipo do Deno, corrija antes de seguir: o Deno não roda nesta máquina.
4. **Publicar o site:** `gh workflow run "Publicar no GitHub Pages" --ref main`.
5. **No sandbox (credenciais de teste, com o comprador de teste):**
   - assine e, na primeira hora, abra "Cancelar assinatura": a janela diz "Ainda não houve cobrança…" e, confirmado, a conta volta ao Free na hora (CA-395);
   - confira a fonte dentro dos campos do cartão (Tarefa 9);
   - o registro de avisos fica vazio, porque o modo teste não manda aviso: é o esperado (D-84).
6. **A troca para produção** (spec, seção 5): os quatro passos de `docs/pendencias.md`. Na primeira compra real, confira `avisos_da_operadora`.

---

## Cobertura da spec

| Critério | Teste |
|---|---|
| CA-392 | `servidorWebhook.test.ts` (Tarefa 6) · `assinatura.test.ts` |
| CA-393 | `assinatura.test.ts` · `assinaturaTextos.test.ts` · `TelaConta.test.tsx` · `sqlCobranca.test.ts` |
| CA-394 | `servidorWebhook.test.ts` |
| CA-395 | `servidorGerenciar.test.ts` · `assinaturaTextos.test.ts` · `usarAssinatura.test.ts` · `TelaConta.test.tsx` |
| CA-396 | `servidorGerenciar.test.ts` · `assinaturaTextos.test.ts` · `usarAssinatura.test.ts` · `TelaConta.test.tsx` |
| CA-397 | `servidorGerenciar.test.ts` · `usarAssinatura.test.ts` · `TelaConta.test.tsx` |
| CA-398 | `sqlCobranca.test.ts` · `servidorWebhook.test.ts` · `servidorLigacao.test.ts` |
| CA-399 | `servidorWebhook.test.ts` |
| CA-400 | `servidorWebhook.test.ts` · `sqlCobranca.test.ts` · `servidorLigacao.test.ts` |
| CA-401 | `servidorWebhook.test.ts` |
| CA-402 | `servidorAssinar.test.ts` |
| CA-403 | `servidorAssinar.test.ts` |
| CA-404 | `processadorCartao.test.ts` · `FormularioCartao.test.tsx` · conferência no navegador (Tarefa 9) |
| CA-405 | `servidorAssinar.test.ts` · `servidorGerenciar.test.ts` · `servidorWebhook.test.ts` · `servidorOperadora.test.ts` |
| CB-96 | `servidorWebhook.test.ts` |
| CB-97 | `servidorWebhook.test.ts` |
| CB-98 | `servidorWebhook.test.ts` |
| CB-99 | `servidorAssinar.test.ts` |
| D-82 | nada muda: a `assinar` continua criando `authorized` (`servidorAssinar.test.ts`, teste 1) |
| D-88 | `servidorLigacao.test.ts` e os quatro arquivos `servidor*.test.ts` |
| R-39 | `cobrancaServidor.test.ts` (nenhum par igual) · `servidorWebhook.test.ts` (valor desconhecido) |

---

## Riscos e decisões para o dono revisar

**Riscos da spec**

1. **R-37: o painel pode não aceitar os tópicos de assinatura.**
   - Sem eles, nada corta na recusa e nada é adotado pelo aviso. O registro mostra isso: depois da primeira compra real, a tabela fica sem linhas de `subscription_*`.
   - A saída seria mandar o endereço do aviso no `POST /preapproval`, num campo que a documentação da assinatura não lista. Não está neste plano; decide-se na primeira compra.
2. **R-38 continua:** o e-mail do pagador pode não bater em produção. Confere-se na primeira compra real.

**Decisões que tomei**

3. **O webhook passou a responder 500 em falha passageira.** Isso vale para: operadora fora ou 429, credencial recusada, banco fora, cancelamento que não pegou e função sem configuração (hoje ela responde 200). O aviso volta em 15 min, e refazer não muda o que já foi feito.
   - Assinatura que não confere, tópico desconhecido e recurso que não existe continuam com 200.
   - Se a operadora desistir depois de muitas tentativas, o registro mostra as falhas.
4. **O cartão na adoção (CA-400) vem da reserva.** A `assinar` agora guarda a bandeira e o final na reserva (`009`). Quando a resposta da operadora se perde e a busca não acha a assinatura, a reserva fica até vencer (5 min). Nesse tempo:
   - o aviso que adota a assinatura grava o cartão daqui;
   - um pedido novo de assinar leva "Já estamos confirmando uma assinatura desta conta…".
   Sem reserva, a linha adotada fica sem o mini cartão até a pessoa trocar o cartão. A operadora não devolve os 4 últimos números na leitura da assinatura, pelo que foi pesquisado.
5. **Valor sem plano na adoção cancela a assinatura lá.** A alternativa seria deixar para conferência manual. Escolhi cancelar porque ninguém deve pagar sem ter o plano; a pessoa vê o Free e pode assinar de novo.
6. **Mensalidade recusada de uma assinatura sem linha aqui também é cancelada lá** (CB-98, "só aquela é afetada"). Toda assinatura desta conta da operadora é do MetaNutri.
7. **A busca da `assinar` tem três escolhas sem confirmação na pesquisa:**
   - lê `date_created` e `results`, que não estão na pesquisa;
   - usa `limit=50`;
   - aceita assinaturas que nasceram até 2 min antes do começo do pedido.
   Sem `date_created`, a busca nunca acha, e quem cobre é a adoção pelo aviso.
8. **5xx e 2xx sem id também disparam a busca, não só a falta de resposta.** Nesses casos a assinatura pode ter nascido lá.
9. **"Já houve cobrança" (D-81) vale com qualquer uma das três fontes:** `charged_quantity ≥ 1`, `last_charged_date`, ou a última paga anotada pelo aviso. Se a operadora não devolver o `summarized` (não visto no sandbox), quem cancela sem nenhum aviso anotado vai ao Free na hora.
10. **Ficou como hoje:**
    - a data da próxima cobrança só conta se passar de amanhã; quem cancela na véspera da próxima cobrança volta ao Free na hora, mesmo tendo pago;
    - a mensalidade paga não muda o status; só o aviso da assinatura muda.
11. **Na janela de cancelar, "cobrada, sem data à frente" diz "Cancelando agora, a conta volta ao Free na hora e nada mais é cobrado.".** O caso é raro, e o texto diz o que o cancelamento faz de fato.
12. **Cancelada é final no webhook:** um aviso atrasado de "autorizada" nunca devolve o plano pago nem troca quem encerrou.

**Riscos que ficam**

13. **CB-97 aceito como na spec:** quem cancela no minuto em que a primeira mensalidade cai fica no Free com a mensalidade paga. O registro mostra o caso; o reembolso é à mão.
14. **Sem o segredo configurado, o webhook processa e anota `assinatura_confere` vazio.** Em produção o segredo é obrigatório (seção 5, passo 2).
15. **Qualquer pessoa pode encher o registro com avisos falsos.** Cada um tem cerca de 100 bytes e some em 90 dias. Se isso acontecer, dá para limitar depois.
16. **D-87:** a operadora pode não aceitar a lista de fontes. A conferência no navegador decide (Tarefa 9); a volta é uma linha.
17. **Não há conferência do Deno nesta máquina.** Os `index.ts` e o `bancoSupabase.ts` só são executados de verdade na publicação.


## Emenda de 07/10/2026 (D-101, D-102; CA-433 a CA-437)

Vem da revisão de segurança de 06/10/2026. Onde esta seção contradiz uma tarefa acima, vale esta seção.

**Tarefa 1 (`009`)** ganha a tabela `tentativas_de_cartao` (`id bigint generated always as identity primary key`, `nutricionista_id uuid not null references auth.users (id) on delete cascade`, `ip text`, `quando timestamptz not null default now()`, `recusada boolean not null`), com índices por (`nutricionista_id`, `quando`) e por (`ip`, `quando`), RLS ligado e `revoke all … from anon, authenticated`, como a `assinando_agora`. Linhas com mais de 7 dias podem ser apagadas pelas próprias funções, como o registro de avisos.

**Tarefa 2** acrescenta ao `BancoDaCobranca` duas operações: `contarRecusas(conta, ip, desde)` → `{ daConta: number; doIp: number; seguidasDaConta: number }` e `anotarTentativa(conta, ip, recusada)`; o banco de mentira as implementa em memória. O IP vem do cabeçalho `x-forwarded-for` (primeiro valor) na ligação fina (Tarefa 7); nulo quando faltar (aí só vale o limite da conta).

**Tarefa 3 (`assinar`) e Tarefa 4 (`trocar_cartao`):**
- antes de chamar a operadora com um cartão, contam as recusas das últimas 24 h; com 5 ou mais da conta, ou 10 ou mais do IP, respondem 429 `{ erro: 'Muitas tentativas com cartão recusado. Tente de novo amanhã.', codigo: 'muitas-tentativas' }` sem chamar a operadora (CA-433, CA-434);
- depois da resposta da operadora, anotam a tentativa (`recusada` = foi 402 por cartão; falha de rede ou 5xx não conta como recusa);
- numa recusa em que a conta já tinha ao menos uma recusa seguida antes (sem sucesso no meio), o `codigo` devolvido é `recusado` e a mensagem é a padrão (CA-435);
- o navegador mostra a mensagem do servidor para 429 (`usarAssinatura` já mostra o `erro` de respostas que não são 402; conferir e testar).

Testes por CA-433, CA-434 e CA-435 nos dois núcleos.

**Tarefa 5 (aviso):**
- **sem segredo configurado, nada é processado**: responde 200 e anota `resultado: 'sem segredo'` (CA-436). Isto substitui o teste "sem segredo configurado, processa e anota que não conferiu" e a decisão 14 da lista de riscos;
- o código do recurso (o `data.id` da URL ou do corpo) precisa casar com `/^[A-Za-z0-9]{1,64}$/`; fora disso, 200 e `resultado: 'recurso inválido'`, sem chamar a operadora (CA-437).
