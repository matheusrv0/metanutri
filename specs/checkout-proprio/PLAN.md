# Checkout próprio · Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa por tarefa. Os passos usam caixa (`- [ ]`) para acompanhar.

**Objetivo:** a pessoa assina, troca o cartão e cancela sem sair do MetaNutri e sem ver outra marca; o número do cartão nunca passa pelo servidor do MetaNutri.

**Arquitetura:** o banco ganha a bandeira, os 4 últimos números do cartão e a próxima cobrança (`008`). No navegador, um adaptador fino (`processadorMercadoPago.ts`) carrega o script dos campos seguros da operadora uma vez, monta três iframes (número, validade, código) dentro das caixas do site e troca o cartão por um código de uso único; o formulário (`FormularioCartao`) junta esses três campos com o nome e o CPF, que são nossos, e é o mesmo no checkout e em "Trocar cartão". A função `assinar` cria a assinatura já autorizada com esse código (o preço sai da tabela do servidor), e a função nova `gerenciar-assinatura` cancela e troca o cartão; as três funções dividem um módulo puro (`supabase/functions/_shared/cobranca.ts`) que o Vitest testa direto e de onde o navegador importa as duas contas de data. O domínio aprende que a cancelada vale até o fim do período pago (`assinatura.ts`, `assinaturaTextos.ts`, `cartao.ts`). As três telas (checkout, Conta e plano, volta do pagamento) ganham o visual do protótipo v2 e os ícones próprios da marca (`IconeMarca`, `PontosDaMarca`), sem emoji e sem Lucide.

**Stack:** React 18 + TypeScript strict + Vite + Tailwind v4 + shadcn/ui · Vitest + Testing Library · Playwright · Supabase (Postgres + Edge Functions em Deno) · script dos campos seguros da operadora por `<script>` (sem pacote npm, R-35).

**Spec:** `specs/checkout-proprio/SPEC.md` (D-65 a D-73, CA-366 a CA-383, CB-88 a CB-95). Visual aprovado no protótipo "Checkout MetaNutri" v2 (`https://claude.ai/code/artifact/4388448c-0780-43fc-9663-c75b3a55bb87`), em 02/10/2026. Pesquisa do SDK e do `/preapproval` (com o que **não** foi confirmado): `mp-secure-fields.md`, resumida em "Decisões" e "Riscos" abaixo.

## Restrições globais

- **Nenhuma dependência npm nova.** O script dos campos seguros entra por `<script src="https://sdk.mercadopago.com/js/v2">`, carregado só quando o formulário do cartão abre (R-35, aprovado com a spec).
- Import do design system pelo alias `@ds/...`; do domínio, `@/domain/...`.
- Componentes funcionais, um por arquivo, export nomeado. `exactOptionalPropertyTypes` ligado: prop opcional é `readonly x?: T | undefined`. `noUncheckedIndexedAccess` ligado. Nada de `any` (os tipos do SDK são escritos à mão).
- Lint: nada de cor hexadecimal nem `font-family` em `.ts`/`.tsx` fora dos testes; dentro de `design-system/componentes/{forms,display,navigation,nutricao}` e da vitrine também nada de `NNpx` em texto. Componente novo de interface mora em `design-system/componentes/`, entra em `design-system/index.ts`, no `LEIA-ME.md` dos componentes e na vitrine.
- O lint do React Compiler está ligado (`react-hooks/set-state-in-effect`, `refs`, `purity`): nada de `setState` síncrono dentro de efeito, nada de ler `ref.current` durante o render.
- Toque mínimo de 44 px: botão de texto e link de ação com `inline-flex min-h-11 items-center`.
- Laranja: só o botão `variant="laranja"` (laranja fechado `--orange-700`, já usado) carrega texto. O ponto laranja dos ícones e dos pontos da marca é grafismo (`fill-laranja`, `bg-laranja`).
- **Nome do processador:** só na Política de privacidade (D-71). Em código, comentários, `.env.example` e README pode aparecer; em texto visível de Checkout, Conta e plano, Preços, Termos e volta do pagamento, nunca (CA-367, CA-381).
- **Ícones:** em Checkout, Conta e plano e volta do pagamento, só `IconeMarca` e `PontosDaMarca`; nada de Lucide, emoji ou símbolo de texto como ícone (CA-383). O resto do app continua no Lucide.
- O preço sai sempre da tabela do servidor; o navegador manda só plano, ciclo e o código de uso único do cartão, mais a bandeira e os 4 últimos números (CA-375, D-70). Nenhum registro de função leva o código do cartão.
- Toda tarefa termina com `npm run check` verde (lint + typecheck + testes). Tarefa que mexe em tela roda também `npx playwright test`.
- O `.env.local` desta máquina tem `VITE_SUPABASE_ANON_KEY` em branco de propósito (os testes contam com "sem servidor"). Não mexa nele.
- Branch `feat/checkout-proprio`, saída da `main` local. Commit em Conventional Commits, em português, com a mensagem num arquivo UTF-8 (`../_msg.txt`) terminado pela linha exata `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Comando: `git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt`.

## Foco de revisão

1. **A virada do dia em Brasília no "vale até"** (CA-378). Próxima cobrança à 01h de 2/11 em Brasília (04h UTC) → vale até 23h59min59s de 1/11; o app ainda libera o plano às 23h59 de 1/11 e volta ao Free no primeiro segundo de 2/11. Testes nas Tarefas 2 e 4.
2. **Cartão múltiplo (crédito e débito no mesmo número)**, comum no Brasil: a operadora pode devolver os dois tipos para o mesmo começo de número. Conta como crédito e não trava o botão. Teste na Tarefa 7.
3. **Resposta da operadora num formato que ninguém confirmou** (recusa sem `cause`, erro do gerador do código sem `code`, busca da bandeira sem `results`). Vira a mensagem genérica e a tela segue, nunca quebra. Testes nas Tarefas 2 e 7.
4. **Linha do banco de antes do `008`** (sem cartão, sem próxima cobrança, sem ciclo). Conta e plano mostra o plano sem a linha do cartão, e a confirmação de cancelar diz "até o fim do período já pago", sem data. Testes nas Tarefas 4 e 10.
5. **Clique duplo e pedido em andamento** em Assinar, Cancelar assinatura e Salvar cartão: um pedido só (CA-371, CB-92). Testes nas Tarefas 9 e 10.

## Decisões que tomei e você revisa

1. **Os cinco campos do cartão usam a caixa do protótipo v2** (48 px, canto 12, fundo `--surface-sunken`, sem fio; no foco, fundo de cartão e anel por dentro), não o `Input` de 40 px do resto do site. O CA-368 diz "os outros campos do site"; li como os outros campos do formulário (nome e CPF), que ficam idênticos aos seguros. Se preferir o `Input` do site, é uma constante (`src/ui/pagamento/estiloDaCaixa.ts`).
2. **"Vale até" é o fim do dia anterior à próxima cobrança, em Brasília** (23h59min59s), como no protótipo ("continua até 1º de novembro" com a cobrança em 2 de novembro). A data aparece como "1 de novembro de 2026", o formato que o app já usa, não "1º de novembro".
3. **A próxima cobrança mostrada é a prevista pelo site** (mesmo dia, um ciclo depois, em Brasília) até a operadora informar uma data à frente. Data da operadora com menos de um dia à frente é ignorada ao assinar e no aviso: é a primeira cobrança, ainda por cair. No cancelamento vale qualquer data futura da operadora; sem nenhuma, a conta volta ao Free na hora.
4. **Recusa sem motivo conhecido** → "O banco recusou este cartão. Confira os dados ou use outro cartão. Nada foi cobrado." Erro que não parece recusa de cartão (configuração, conta de teste) → "Não consegui concluir a assinatura agora. Nada foi cobrado. Tente de novo em alguns minutos.", e o motivo fica no registro da função.
5. **Assinatura criada na operadora e não gravada no banco** → a função cancela na operadora na mesma hora e responde que nada foi cobrado. Ninguém paga sem ter o plano.
6. **A operadora devolver "pendente" em vez de "autorizada"** → a tela mostra "Pagamento em análise" e vale o Free até o aviso chegar; quem estava no Estudante fica no Free nesse meio-tempo. Não vi isso acontecer na documentação, mas o código trata.
7. **Assinar de novo dentro do prazo cobra na hora**; os dias que sobravam da cancelada não viram desconto.
8. **A letra Manrope dos campos seguros vem do Google Fonts** (`customFonts`, o único jeito que o SDK aceita). O navegador de quem paga pede a fonte ao Google; a Política passa a dizer isso (Tarefa 11). Alternativa: tirar a fonte e aceitar a do sistema (R-34).
9. **O CORS das funções passa a aceitar `apikey` e `x-client-info`**, que o supabase-js manda em todo pedido. A `assinar` antiga só aceitava `authorization, content-type`, e o navegador barraria o pedido antes de chegar nela.
10. **CA-383 "nessas telas" é o conteúdo de Checkout, Conta e plano e volta do pagamento**, incluindo o que Conta e plano mostra dentro dela (cartão da situação, aviso do CRN, diálogo "Me formei"). O menu lateral e o cabeçalho do app continuam com Lucide. O aviso do CRN também aparece no Painel e leva o ícone e os pontos da marca junto. Nesses lugares o botão não usa `loading` (que desenha a roda do Lucide): mostra os pontos da marca. O `DialogContent` ganha `iconeFechar` para o X da marca.
11. **O resumo usa as palavras do protótipo v2:** "Você paga hoje" (total hoje), "Solo, mensal" (plano e cobrança juntos), "Recibo para" (a conta). Os cinco itens do CA-366 estão lá, com esses nomes.
12. **Cancelada mostra um botão "Assinar de novo"**, no plano e no ciclo de antes, no lugar dos dois "Assinar Solo/Pro" (CA-380). "Trocar cartão" some quando o site não tem a chave pública.
13. **As duas contas de data do navegador vêm do arquivo do servidor** (`src/domain/assinaturaTextos.ts` importa de `supabase/functions/_shared/cobranca.ts`), para a tela dizer a mesma data que a função grava.
14. **A versão dos termos muda para o dia da implementação** (Tarefa 11), porque os Termos passam a dizer como cancelar.
15. **O tema dos campos seguros é lido quando o formulário abre.** Trocar de tema com o formulário aberto (não há botão de tema no checkout) só recolore os campos seguros na próxima abertura.
16. **O `decidir_pedido` (006) não muda:** aprovar o comprovante de uma estudante que tem uma assinatura paga **cancelada no prazo** troca a linha para o Estudante, e os dias pagos que sobravam se perdem. Raro; fica registrado.

## Lacunas da spec que encontrei

- **D-68 "se a primeira cobrança falhar, o aviso do processador derruba o plano".** O webhook só ouve a assinatura (`preapproval`); a operadora só muda a assinatura depois das novas tentativas (até 4 em 10 dias, cancela depois de 3 falhas). Até lá o plano pago vale. Ouvir os avisos de cada cobrança (`subscription_authorized_payment`) fica **fora** deste plano; diga se quer uma tarefa para isso.
- **CA-368 x protótipo v2:** ver a decisão 1.
- **Corrida rara no cancelamento:** se a gravação no banco falhar depois de a operadora cancelar e o aviso da operadora chegar antes da nova tentativa, a linha fica "cancelada" sem data e a conta volta ao Free na hora. Pedir de novo não corrige (CB-93 manda não cancelar duas vezes).

## Riscos (o que a pesquisa não confirmou)

- **A resposta do `POST /preapproval`** (`id`, `status`, `next_payment_date`) e o formato do erro de recusa não estão confirmados. O código lê tudo sem confiar no formato (Tarefa 2) e cai na mensagem genérica; o teste de ponta a ponta (Tarefa 12) confirma.
- **"cancelled" ou "canceled":** a função tenta um e, se a operadora recusar, o outro; o webhook aceita os dois.
- **Os códigos de erro do gerador do código do cartão** (205, E301…) vêm da documentação de tokenização. Se o SDK v2 devolver outros, o campo não é apontado e aparece a mensagem geral (a Tarefa 7, Step 9, confere).
- **A busca da bandeira** pode trazer o nome em `name` ou só em `id` (`master`); o código usa o que vier.
- **Os campos seguros no tema escuro:** se o iframe tiver fundo branco próprio, a caixa escura aparece com o miolo branco (a Tarefa 7, Step 9, confere; a saída seria pedir `backgroundColor` no `style`, que não está na lista confirmada).
- **R-34** (a fonte dentro dos campos) e **R-36** (no modo teste só o comprador de teste paga) continuam como na spec.

---

## Ordem e dependências

| # | Tarefa | Depende de |
|---|---|---|
| 1 | Banco: o cartão da assinatura (`008`) | — |
| 2 | Servidor: módulo comum, `assinar` com o cartão e o webhook | 1 (no código; o deploy só na 12) |
| 3 | Servidor: `gerenciar-assinatura` (cancelar e trocar cartão) | 2 |
| 4 | Domínio: assinatura paga, cancelada no prazo e textos | 2 |
| 5 | Domínio: o formulário do cartão (`cartao.ts`) | — |
| 6 | Biblioteca: `IconeMarca`, `PontosDaMarca` e o X da marca no `Dialog` | — |
| 7 | Pagamento: o adaptador dos campos seguros e a chave pública | 5 |
| 8 | Pagamento: `FormularioCartao` | 5, 6, 7 |
| 9 | Estado e tela de checkout | 4, 5, 6, 8 |
| 10 | Conta e plano: cartão, Trocar cartão e Cancelar | 4, 6, 8, 9 |
| 11 | Textos, Política, Termos e volta do pagamento | 4, 6 |
| 12 | Documentação, validação final e o que fica com você | 1 a 11 |

As Tarefas 1, 5 e 6 não dependem de nada e podem andar em paralelo. **Nenhuma função vai para o servidor antes da Tarefa 12**: a `assinar` nova não serve ao site publicado hoje (ele não manda o cartão), então funções e site sobem juntos. Rodar o `008` (Tarefa 1) e criar a variável do GitHub (Tarefa 7) antes não quebra nada.

## Mapa de arquivos

| Arquivo | Tarefa | O que faz |
|---|---|---|
| `supabase/008-cartao-da-assinatura.sql` (novo) | 1 | três colunas novas em `assinaturas` |
| `src/data/sqlCheckout.test.ts` (novo) | 1, 2, 3, 7 | travas do SQL, das funções e do build |
| `README.md` | 1, 3, 7, 12 | rodar o `008`, publicar as funções, a variável do GitHub, o que o sistema faz |
| `supabase/functions/_shared/cobranca.ts` (novo) | 2 | estado, cartão, datas e recusa, puro |
| `src/data/cobrancaServidor.test.ts` (novo) | 2 | o módulo comum, no ambiente Node |
| `supabase/functions/assinar/index.ts` | 2 | assina com o cartão, já autorizada |
| `supabase/functions/webhook-mercadopago/index.ts` | 2 | grava a próxima cobrança; estado pelo módulo comum |
| `supabase/functions/gerenciar-assinatura/index.ts` (novo) | 3 | cancelar e trocar cartão |
| `src/domain/assinatura.ts`, `assinatura.test.ts` | 4 | campos novos e a cancelada no prazo |
| `src/domain/assinaturaTextos.ts` (novo) + teste | 4 | "Solo, mensal", linha do cartão, "vale até", resumo |
| `src/AppConta.test.tsx`, `src/domain/pedidoEstudante.test.ts`, `src/ui/conta/TelaConta.test.tsx` | 4 | os literais de `Assinatura` ganham os campos novos |
| `src/domain/cartao.ts` (novo) + teste | 5 | CPF, nome, mensagens, recusas, crédito |
| `design-system/componentes/display/IconeMarca.tsx` (novo) | 6 | os nove ícones da marca |
| `design-system/componentes/display/PontosDaMarca.tsx` (novo) | 6 | os quatro pontos da logo, parados ou pulsando |
| `design-system/componentes/display/IconeMarca.test.tsx` (novo) | 6 | os dois e o X do `Dialog` |
| `design-system/componentes/overlay/dialog.tsx` | 6 | prop `iconeFechar` |
| `design-system/componentes/display/Icon.tsx`, `design-system/index.ts`, `design-system/componentes/LEIA-ME.md`, `design-system/vitrine/TelaDesignSystem.tsx`, `e2e/design-system.spec.ts` | 6 | registro dos componentes novos |
| `src/ui/pagamento/processadorCartao.ts` (novo) + teste | 7 | a interface que o formulário usa e o estilo dos campos |
| `src/ui/pagamento/processadorMercadoPago.ts` (novo) + teste | 7 | o adaptador do SDK, a chave pública |
| `.env.example`, `.github/workflows/publicar.yml` | 7 | `VITE_MERCADOPAGO_PUBLIC_KEY` |
| `src/ui/pagamento/estiloDaCaixa.ts` (novo) | 8 | a caixa dos cinco campos |
| `src/ui/pagamento/CampoDoFormulario.tsx`, `CartaoAoVivo.tsx`, `AvisoPagamento.tsx`, `FormularioCartao.tsx` (novos) | 8 | o formulário do cartão |
| `src/ui/pagamento/processadorFalso.test-utils.ts`, `FormularioCartao.test.tsx` (novos) | 8 | processador de mentira e testes |
| `src/ui/estado/usarAssinatura.ts` + teste | 9 | assinar com cartão, cancelar, trocar, um por vez |
| `src/ui/pagamento/AndamentoCheckout.tsx` (novo) | 9 | os pontos de Conta · Plano · Pagamento · Pronto |
| `src/ui/publico/TelaCheckout.tsx` + teste | 9 | o checkout repaginado |
| `src/App.tsx`, `src/App.test.tsx`, `src/AppConta.test.tsx` | 9, 10 | ligação e testes |
| `e2e/publico.spec.ts` | 9, 11 | checkout, Preços e Termos sem o nome do processador |
| `src/ui/conta/TelaConta.tsx` + teste, `MiniCartao.tsx`, `DialogoCancelarAssinatura.tsx`, `DialogoTrocarCartao.tsx` (novos) | 10 | Conta e plano |
| `src/ui/conta/CartaoSituacao.tsx`, `src/ui/conta/DialogoMeFormei.tsx`, `src/ui/painel/AvisoCrn.tsx` | 10 | sem Lucide |
| `src/ui/publico/SecaoPrecos.tsx` + teste, `TelaTermos.tsx`, `TelaPrivacidade.tsx`, `legal.test.tsx`, `TelaVoltaPagamento.tsx` + teste | 11 | textos e ícones |
| `src/domain/legal.ts`, `src/domain/legal.test.ts` | 11 | versão dos termos |
| `docs/decisoes.md`, `docs/pendencias.md`, `DESIGN.md`, `specs/checkout-proprio/SPEC.md` | 12 | registro |

---

### Tarefa 1: Banco: o cartão da assinatura (`008`)

Cobre D-70 e o lado do banco de CA-376 e CA-378.

**Files:**
- Create: `supabase/008-cartao-da-assinatura.sql`
- Create: `src/data/sqlCheckout.test.ts`
- Modify: `README.md` (seção "Projeto novo", passo 3; seção "Projeto já ligado", passo 4)

**Interfaces:**
- Consumes: tabela `public.assinaturas` (003, 005, 007).
- Produces: colunas `cartao_bandeira text` (1 a 40 letras), `cartao_final text` (exatamente 4 números), `proxima_cobranca timestamptz`. Nenhuma política nova: o navegador continua lendo só a própria linha e ninguém escreve pelo navegador.

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/data/sqlCheckout.test.ts`:

```ts
import sql from '../../supabase/008-cartao-da-assinatura.sql?raw'

describe('banco: o cartão da assinatura (spec checkout-proprio, 008)', () => {
  it('D-70: guarda só a bandeira, os 4 últimos números e a próxima cobrança', () => {
    expect(sql).toContain('alter table public.assinaturas add column if not exists cartao_bandeira text check (char_length(cartao_bandeira) between 1 and 40);')
    expect(sql).toContain("alter table public.assinaturas add column if not exists cartao_final text check (cartao_final ~ '^[0-9]{4}$');")
    expect(sql).toContain('alter table public.assinaturas add column if not exists proxima_cobranca timestamptz;')
  })

  it('D-70: nenhuma política nem permissão nova: quem escreve continua sendo só o servidor', () => {
    expect(sql).not.toMatch(/create policy|grant /i)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/data/sqlCheckout.test.ts`
Expected: FAIL — o arquivo `008-cartao-da-assinatura.sql` não existe.

- [ ] **Step 3: Escrever o SQL**

Crie `supabase/008-cartao-da-assinatura.sql`:

```sql
-- MetaNutri — o cartão da assinatura (spec checkout-proprio, D-70).
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Pode rodar de novo: nada é apagado.
--
-- Rode ANTES de publicar as funções assinar, gerenciar-assinatura e webhook-mercadopago
-- desta versão: elas gravam estas colunas.
--
-- Do cartão, o MetaNutri guarda só o que a pessoa precisa para reconhecer qual cartão
-- paga: a bandeira e os 4 últimos números. O número inteiro, a validade e o código nunca
-- chegam aqui: vão do navegador direto para a operadora de pagamento, que devolve um
-- código de uso único no lugar do cartão.
--
-- Nenhuma política nova: o navegador continua lendo só a própria linha ("dono le a
-- assinatura", do 003), e quem escreve é só o servidor, com a service_role.

alter table public.assinaturas add column if not exists cartao_bandeira text check (char_length(cartao_bandeira) between 1 and 40);
alter table public.assinaturas add column if not exists cartao_final text check (cartao_final ~ '^[0-9]{4}$');
-- Quando cai a próxima cobrança. Ao cancelar, o fim do período pago sai daqui (CA-378).
alter table public.assinaturas add column if not exists proxima_cobranca timestamptz;

-- Conferência depois de rodar (copie para uma consulta nova):
-- select column_name, data_type from information_schema.columns
--  where table_schema = 'public' and table_name = 'assinaturas'
--    and column_name in ('cartao_bandeira', 'cartao_final', 'proxima_cobranca');
-- -- três linhas: text, text e timestamp with time zone
```

- [ ] **Step 4: README**

Em "Projeto novo", passo 3, troque:

```markdown
3. No **SQL Editor**, rode os arquivos de [supabase/](supabase/) na ordem, de 001 a 007:
   `001-acompanhamentos.sql`, `002-copia-na-nuvem.sql`, `003-assinaturas.sql`, `004-uso-nao-comercial.sql`,
   `005-estudante.sql`, `006-verificacao.sql` e `007-painel-do-dono.sql`.
```

por:

```markdown
3. No **SQL Editor**, rode os arquivos de [supabase/](supabase/) na ordem, de 001 a 008:
   `001-acompanhamentos.sql`, `002-copia-na-nuvem.sql`, `003-assinaturas.sql`, `004-uso-nao-comercial.sql`,
   `005-estudante.sql`, `006-verificacao.sql`, `007-painel-do-dono.sql` e `008-cartao-da-assinatura.sql`.
```

Em "Projeto já ligado", passo 4, logo depois da linha `Nunca publique antes do 007: a coluna ainda não existiria e o checkout falharia.`, acrescente:

```markdown
   Depois rode `supabase/008-cartao-da-assinatura.sql`: ele guarda a bandeira, os 4 últimos números do cartão e a
   data da próxima cobrança (spec checkout-proprio). Rode **antes** de publicar as funções do passo 5; também pode
   rodar de novo.
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/data/sqlCheckout.test.ts` → PASS. Depois `npm run check` → verde.

- [ ] **Step 6: Commit**

```bash
git add supabase/008-cartao-da-assinatura.sql src/data/sqlCheckout.test.ts README.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(banco): bandeira, final do cartão e próxima cobrança na assinatura`

- [ ] **Step 7: Com o usuário — rodar o `008`**

Rodar cedo não quebra nada: as funções publicadas hoje não leem nem gravam estas colunas. Peça ao usuário para abrir `https://supabase.com/dashboard/project/qmpljfjbdcrdbqutuvmg/sql/new`, colar o arquivo inteiro, clicar em **Run** e depois rodar a consulta de conferência do fim: tem que voltar três linhas (`text`, `text`, `timestamp with time zone`). Não publique função nenhuma agora (Tarefa 12).

---

### Tarefa 2: Servidor: módulo comum, `assinar` com o cartão e o webhook

Cobre D-65 a D-68, D-70, CA-373, CA-375, CB-90, CB-91, CB-94 e CB-95 no servidor.

**Files:**
- Create: `supabase/functions/_shared/cobranca.ts`
- Create: `src/data/cobrancaServidor.test.ts`
- Modify: `supabase/functions/assinar/index.ts` (o arquivo inteiro)
- Modify: `supabase/functions/webhook-mercadopago/index.ts` (o arquivo inteiro)
- Modify: `src/data/sqlCheckout.test.ts`

**Interfaces:**
- Consumes: colunas do `008` (Tarefa 1), `ciclo` (007), `vagas_de_fundador_usadas()` (003).
- Produces (`supabase/functions/_shared/cobranca.ts`, puro, sem Deno e sem rede; o navegador importa as duas contas de data na Tarefa 4):

```ts
export type StatusDaAssinatura = 'ativa' | 'pausada' | 'cancelada' | 'pendente'
export function traduzirStatus(status: unknown): StatusDaAssinatura          // authorized, paused, cancelled|canceled, resto
export interface CartaoInformado { readonly bandeira: string; readonly final: string }
export function lerCartao(valor: unknown): CartaoInformado | null
export const UM_DIA_MS: number
export function dataDepoisDe(valor: unknown, limiteMs: number): string | null  // ISO, só se for data e passar do limite
export function previsaoDaProximaCobranca(agora: Date, ciclo: 'mensal' | 'anual'): string  // ISO
export function fimDoPeriodoPago(proximaCobranca: string): string | null     // ISO: 23:59:59 de Brasília da véspera
export function codigoDaRecusa(corpo: unknown): string                       // 'cc_rejected_*' | 'token-invalido' | 'recusado' | 'falha'
export const RECUSA_PADRAO: string
export const SEM_COBRANCA: string
export const CABECALHOS: { readonly 'Access-Control-Allow-Origin': '*'; readonly 'Access-Control-Allow-Headers': string; readonly 'Content-Type': 'application/json' }
export function responder(corpo: unknown, status?: number): Response
```

- Função `assinar`: recebe `{ plano, ciclo, card_token_id, cartao: { bandeira, final } }`; responde `200 { status: 'ativa' | 'pendente', proximaCobranca: string, cartao }`, `402 { erro, codigo }` (recusa), `409` (já assina, CB-91), `400` (corpo ou cartão faltando), `401` (sem sessão), `502 { erro }` (operadora fora ou gravação falhou).

- [ ] **Step 1: Escrever os testes do módulo comum**

Crie `src/data/cobrancaServidor.test.ts`:

```ts
// @vitest-environment node
import {
  CABECALHOS,
  codigoDaRecusa,
  dataDepoisDe,
  fimDoPeriodoPago,
  lerCartao,
  previsaoDaProximaCobranca,
  responder,
  traduzirStatus,
  UM_DIA_MS,
} from '../../supabase/functions/_shared/cobranca.ts'

describe('cobrança no servidor: o que as três funções fazem igual (spec checkout-proprio)', () => {
  it('traduz o estado da operadora, com "cancelled" e com "canceled"', () => {
    expect(traduzirStatus('authorized')).toBe('ativa')
    expect(traduzirStatus('paused')).toBe('pausada')
    expect(traduzirStatus('cancelled')).toBe('cancelada')
    expect(traduzirStatus('canceled')).toBe('cancelada')
    expect(traduzirStatus('pending')).toBe('pendente')
    expect(traduzirStatus(undefined)).toBe('pendente')
  })

  it('D-70: do cartão, aceita só a bandeira e os 4 últimos números', () => {
    expect(lerCartao({ bandeira: ' Mastercard ', final: '6351' })).toEqual({ bandeira: 'Mastercard', final: '6351' })
    expect(lerCartao({ bandeira: 'American Express', final: '6885' })).toEqual({ bandeira: 'American Express', final: '6885' })
    expect(lerCartao({ bandeira: 'Visa', final: '635' })).toBeNull()
    expect(lerCartao({ bandeira: 'Visa', final: '5480832801033311' })).toBeNull()
    expect(lerCartao({ bandeira: '<script>', final: '6351' })).toBeNull()
    expect(lerCartao({ bandeira: 'x'.repeat(41), final: '6351' })).toBeNull()
    expect(lerCartao(null)).toBeNull()
  })

  it('a data só vale se for data de verdade e passar do limite', () => {
    const agora = Date.parse('2026-10-02T15:00:00Z')
    expect(dataDepoisDe('2026-11-02T15:00:00Z', agora)).toBe('2026-11-02T15:00:00.000Z')
    expect(dataDepoisDe('2026-10-02T15:30:00Z', agora + UM_DIA_MS)).toBeNull()
    expect(dataDepoisDe('amanhã', agora)).toBeNull()
    expect(dataDepoisDe(null, agora)).toBeNull()
  })

  it('CA-366: a próxima cobrança prevista é o mesmo dia, um ciclo depois', () => {
    const agora = new Date('2026-10-02T15:00:00Z')
    expect(previsaoDaProximaCobranca(agora, 'mensal')).toBe('2026-11-02T15:00:00.000Z')
    expect(previsaoDaProximaCobranca(agora, 'anual')).toBe('2027-10-02T15:00:00.000Z')
  })

  it('dia que não existe no mês seguinte vira o último dia dele, e dezembro passa para janeiro', () => {
    expect(previsaoDaProximaCobranca(new Date('2027-01-31T15:00:00Z'), 'mensal')).toBe('2027-02-28T15:00:00.000Z')
    expect(previsaoDaProximaCobranca(new Date('2026-12-15T15:00:00Z'), 'mensal')).toBe('2027-01-15T15:00:00.000Z')
  })

  it('foco 1: o calendário é o de Brasília: 01h30 UTC de 1º/11 ainda é 31/10', () => {
    // 31/10 às 22h30 em Brasília → um mês depois é 30/11 (novembro não tem 31), 22h30 em Brasília.
    expect(previsaoDaProximaCobranca(new Date('2026-11-01T01:30:00Z'), 'mensal')).toBe('2026-12-01T01:30:00.000Z')
  })

  it('CA-378 e foco 1: o plano vale até 23h59min59s de Brasília da véspera da próxima cobrança', () => {
    expect(fimDoPeriodoPago('2026-11-02T15:00:00Z')).toBe('2026-11-02T02:59:59.000Z')
    // 01h de 2/11 em Brasília (04h UTC) ainda é 2/11: vale até o fim de 1/11.
    expect(fimDoPeriodoPago('2026-11-02T04:00:00Z')).toBe('2026-11-02T02:59:59.000Z')
    // 23h30 de 1/11 em Brasília (02h30 UTC de 2/11): a cobrança é de 1/11, vale até o fim de 31/10.
    expect(fimDoPeriodoPago('2026-11-02T02:30:00Z')).toBe('2026-11-01T02:59:59.000Z')
    expect(fimDoPeriodoPago('quebrada')).toBeNull()
  })

  it('CA-373, CB-90 e foco 3: lê o motivo da recusa sem confiar no formato', () => {
    expect(codigoDaRecusa({ message: 'cc_rejected_insufficient_amount', status: 400 })).toBe('cc_rejected_insufficient_amount')
    expect(codigoDaRecusa({ cause: [{ code: 'CC_REJECTED_CARD_DISABLED', description: 'x' }] })).toBe('cc_rejected_card_disabled')
    expect(codigoDaRecusa({ cause: { code: 'cc_rejected_high_risk' } })).toBe('cc_rejected_high_risk')
    expect(codigoDaRecusa({ status_detail: 'cc_rejected_call_for_authorize' })).toBe('cc_rejected_call_for_authorize')
    expect(codigoDaRecusa({ message: 'Card token service not found', status: 404 })).toBe('token-invalido')
    expect(codigoDaRecusa({ message: 'CC_VAL_433 Credit card validation has failed', cause: [{ code: 'CC_VAL_433' }] })).toBe('recusado')
    expect(codigoDaRecusa({ message: 'Both payer and collector must be real or test users' })).toBe('falha')
    expect(codigoDaRecusa(null)).toBe('falha')
    expect(codigoDaRecusa('texto solto')).toBe('falha')
  })

  it('responde JSON com o cabeçalho que o navegador exige do supabase-js', async () => {
    const resposta = responder({ erro: 'x' }, 402)
    expect(resposta.status).toBe(402)
    expect(await resposta.json()).toEqual({ erro: 'x' })
    expect(CABECALHOS['Access-Control-Allow-Headers']).toBe('authorization, x-client-info, apikey, content-type')
  })
})
```

- [ ] **Step 2: Escrever os testes das funções**

Em `src/data/sqlCheckout.test.ts`, acrescente ao topo:

```ts
import assinar from '../../supabase/functions/assinar/index.ts?raw'
import webhook from '../../supabase/functions/webhook-mercadopago/index.ts?raw'

/** As linhas que escrevem no registro da função. */
const registros = (codigo: string) => codigo.split('\n').filter((linha) => linha.includes('console.'))
```

E, depois do `describe` do banco:

```ts
describe('função assinar (spec checkout-proprio)', () => {
  it('CA-375: o preço sai da tabela do servidor; o navegador manda só plano, ciclo e o cartão', () => {
    expect(assinar).toContain('const valor = anual ? escolhido.anual : escolhido.mensal')
    expect(assinar).toContain('transaction_amount: valor,')
    expect(assinar).not.toMatch(/corpo\.(valor|preco|transaction_amount|valor_centavos)/)
  })

  it('D-68: cria a assinatura já autorizada, com o código de uso único do cartão', () => {
    expect(assinar).toContain("status: 'authorized',")
    expect(assinar).toContain('card_token_id: cartaoToken,')
    expect(assinar).not.toContain('init_point')
  })

  it('D-70: grava a bandeira, os 4 últimos números e a próxima cobrança, e devolve só isso ao navegador', () => {
    expect(assinar).toContain('cartao_bandeira: cartao.bandeira,')
    expect(assinar).toContain('cartao_final: cartao.final,')
    expect(assinar).toContain('proxima_cobranca: proxima,')
    expect(assinar).toContain('return responder({ status, proximaCobranca: proxima, cartao })')
  })

  it('CB-95: a assinatura paga não vence por data, então substitui o Estudante na hora em que o banco autoriza', () => {
    expect(assinar).toContain('expira_em: null,')
    expect(assinar).toContain("onConflict: 'nutricionista_id'")
  })

  it('CA-373: recusa vira 402 com o código; operadora fora vira 502', () => {
    expect(assinar).toContain('return erro(RECUSA_PADRAO, 402, codigo)')
    expect(assinar).toContain('if (resposta.status >= 500) return erro(SEM_COBRANCA, 502)')
  })

  it('CB-91: quem já tem assinatura paga ativa não assina de novo', () => {
    expect(assinar).toContain("return erro('Você já tem uma assinatura ativa. A troca de plano ainda não é feita pelo site.', 409)")
  })

  it('assinatura criada lá e não gravada aqui é cancelada lá na hora', () => {
    expect(assinar).toMatch(/if \(erroGravar\) \{[\s\S]*?body: JSON\.stringify\(\{ status: 'cancelled' \}\)[\s\S]*?return erro\(SEM_COBRANCA, 502\)/)
  })

  it('nenhum registro leva o código do cartão nem o corpo do pedido', () => {
    for (const linha of registros(assinar)) expect(linha).not.toMatch(/cartaoToken|card_token_id|corpo/)
  })
})

describe('webhook (spec checkout-proprio)', () => {
  it('D-70: grava a próxima cobrança só da ativa, e nunca mexe no expira_em (CA-378, CB-94)', () => {
    expect(webhook).toContain("const proxima = status === 'ativa' ? dataDepoisDe(assinatura.next_payment_date, Date.now() + UM_DIA_MS) : null")
    expect(webhook).toContain('if (proxima) Object.assign(mudanca, { proxima_cobranca: proxima })')
    expect(webhook).not.toMatch(/expira_em\s*:/)
  })

  it('traduz o estado pelo módulo comum, que aceita "cancelled" e "canceled"', () => {
    expect(webhook).toContain("from '../_shared/cobranca.ts'")
    expect(webhook).not.toContain('function traduzirStatus')
  })
})
```

Os testes do webhook em `src/data/sqlVerificacao.test.ts` (CB-63, D-27) **não mudam** e continuam valendo: a linha `const mudanca = { status, atualizado_em: new Date().toISOString() }` e o `.update(mudanca)` ficam iguais.

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/data/cobrancaServidor.test.ts src/data/sqlCheckout.test.ts`
Expected: FAIL — o módulo `_shared/cobranca.ts` não existe e a `assinar` ainda abre o link de pagamento.

- [ ] **Step 4: Escrever o módulo comum**

Crie `supabase/functions/_shared/cobranca.ts`:

```ts
// O que as funções de cobrança (assinar, gerenciar-assinatura e webhook-mercadopago)
// fazem igual: traduzir o estado da operadora, ler o cartão que o navegador manda,
// calcular as datas e entender a recusa (spec checkout-proprio).
//
// Tudo aqui é puro, sem Deno e sem rede, para o Vitest conferir direto
// (src/data/cobrancaServidor.test.ts). O navegador importa as duas contas de data, para a
// tela dizer a mesma data que a função grava (src/domain/assinaturaTextos.ts).
// A pasta começa com "_": o Supabase não publica como função, só empacota junto.

export type StatusDaAssinatura = 'ativa' | 'pausada' | 'cancelada' | 'pendente'

/** Estado do Mercado Pago → o que o MetaNutri grava. A documentação em português escreve "canceled"; a API, "cancelled". Os dois valem. */
export function traduzirStatus(status: unknown): StatusDaAssinatura {
  if (status === 'authorized') return 'ativa'
  if (status === 'paused') return 'pausada'
  if (status === 'cancelled' || status === 'canceled') return 'cancelada'
  return 'pendente'
}

export interface CartaoInformado {
  readonly bandeira: string
  readonly final: string
}

/** D-70: a bandeira e os 4 últimos números que o navegador manda. Qualquer outra coisa é recusada. */
export function lerCartao(valor: unknown): CartaoInformado | null {
  if (typeof valor !== 'object' || valor === null) return null
  const { bandeira, final } = valor as { readonly bandeira?: unknown; readonly final?: unknown }
  if (typeof bandeira !== 'string' || typeof final !== 'string') return null
  const limpa = bandeira.trim()
  if (limpa.length < 1 || limpa.length > 40 || !/^[\p{L}\p{N} .&-]+$/u.test(limpa)) return null
  if (!/^\d{4}$/.test(final)) return null
  return { bandeira: limpa, final }
}

export const UM_DIA_MS = 24 * 60 * 60 * 1000
/** Brasília é UTC−3 o ano todo: o Brasil não tem horário de verão desde 2019. */
const BRASILIA_MS = 3 * 60 * 60 * 1000

/** A data em ISO, se for data de verdade e passar do limite; senão nulo. */
export function dataDepoisDe(valor: unknown, limiteMs: number): string | null {
  if (typeof valor !== 'string') return null
  const ms = Date.parse(valor)
  return Number.isNaN(ms) || ms <= limiteMs ? null : new Date(ms).toISOString()
}

/**
 * A próxima cobrança prevista: o mesmo dia, um ciclo depois, no calendário de Brasília.
 * Dia que não existe no mês do alvo (31 de fevereiro) vira o último dia dele.
 */
export function previsaoDaProximaCobranca(agora: Date, ciclo: 'mensal' | 'anual'): string {
  const local = new Date(agora.getTime() - BRASILIA_MS)
  const ano = local.getUTCFullYear()
  const mes = local.getUTCMonth()
  const meses = ciclo === 'anual' ? 12 : 1
  const ultimoDia = new Date(Date.UTC(ano, mes + meses + 1, 0)).getUTCDate()
  const alvo = Date.UTC(ano, mes + meses, Math.min(local.getUTCDate(), ultimoDia), local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds())
  return new Date(alvo + BRASILIA_MS).toISOString()
}

/** CA-378: o plano pago vale até 23h59min59s, em Brasília, do dia anterior à próxima cobrança. */
export function fimDoPeriodoPago(proximaCobranca: string): string | null {
  const ms = Date.parse(proximaCobranca)
  if (Number.isNaN(ms)) return null
  const diaEmBrasilia = Math.floor((ms - BRASILIA_MS) / UM_DIA_MS)
  return new Date(diaEmBrasilia * UM_DIA_MS + BRASILIA_MS - 1000).toISOString()
}

/**
 * O motivo de uma recusa da operadora, lido sem confiar no formato (não confirmado na
 * documentação): junta `message`, `status_detail`, `error`, `code` e cada `cause`.
 *  - `cc_rejected_*`: o código do banco, como veio, em minúsculas;
 *  - `token-invalido`: o código de uso único do cartão venceu ou já foi usado (CB-90);
 *  - `recusado`: recusa do cartão sem motivo conhecido;
 *  - `falha`: outra coisa (configuração, conta de teste). Quem chama registra.
 */
export function codigoDaRecusa(corpo: unknown): string {
  const textos: string[] = []
  const juntar = (valor: unknown) => {
    if (typeof valor === 'string') textos.push(valor)
    else if (typeof valor === 'number') textos.push(String(valor))
  }
  if (typeof corpo === 'object' && corpo !== null) {
    const o = corpo as Record<string, unknown>
    for (const chave of ['message', 'status_detail', 'error', 'code']) juntar(o[chave])
    const causa = o['cause']
    for (const item of Array.isArray(causa) ? causa : causa === undefined ? [] : [causa]) {
      if (typeof item === 'object' && item !== null) {
        juntar((item as Record<string, unknown>)['code'])
        juntar((item as Record<string, unknown>)['description'])
      } else {
        juntar(item)
      }
    }
  }
  const tudo = textos.join(' ')
  const doBanco = /cc_rejected_[a-z_]+/i.exec(tudo)
  if (doBanco) return doBanco[0].toLowerCase()
  if (/token/i.test(tudo)) return 'token-invalido'
  if (/CC_VAL_\d+|rejected|declined|card/i.test(tudo)) return 'recusado'
  return 'falha'
}

/** A frase de reserva; a tela troca pela do código (src/domain/cartao.ts). */
export const RECUSA_PADRAO = 'O banco recusou este cartão. Confira os dados ou use outro cartão. Nada foi cobrado.'
/** CA-374: a operadora não respondeu. */
export const SEM_COBRANCA = 'Não consegui falar com o servidor de cobrança. Nada foi cobrado. Tente de novo em alguns minutos.'

/** O supabase-js manda `apikey` e `x-client-info` em todo pedido: sem eles aqui, o navegador barra antes. */
export const CABECALHOS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
} as const

export const responder = (corpo: unknown, status = 200): Response => new Response(JSON.stringify(corpo), { status, headers: CABECALHOS })
```

- [ ] **Step 5: Reescrever a função `assinar`**

Troque o conteúdo inteiro de `supabase/functions/assinar/index.ts` por:

```ts
// Assina com o cartão, dentro do site (spec checkout-proprio, D-65 a D-68).
//
// O navegador manda só o plano, o ciclo e o código de uso único do cartão, mais a
// bandeira e os 4 últimos números para mostrar em Conta e plano (D-70). O número do
// cartão nunca passa por aqui: os campos seguros mandam direto para o Mercado Pago, que
// devolve o código. O preço sai da tabela abaixo, nunca do navegador (CA-375).
//
// Isto roda no servidor porque precisa do access token do Mercado Pago, que dá poder de
// cobrar em nome do dono da conta.
//
// Deno / Supabase Edge Functions. Não faz parte do build do app.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  CABECALHOS,
  codigoDaRecusa,
  dataDepoisDe,
  lerCartao,
  previsaoDaProximaCobranca,
  RECUSA_PADRAO,
  responder,
  SEM_COBRANCA,
  traduzirStatus,
  UM_DIA_MS,
} from '../_shared/cobranca.ts'

const MP = 'https://api.mercadopago.com/preapproval'

/** Os planos que podem ser assinados, com o preço que o servidor considera verdade. */
const PLANOS: Record<string, { readonly nome: string; readonly mensal: number; readonly anual: number }> = {
  solo: { nome: 'MetaNutri Solo', mensal: 34.9, anual: 299 },
  pro: { nome: 'MetaNutri Pro', mensal: 64.9, anual: 599 },
}

const erro = (mensagem: string, status: number, codigo?: string) => responder(codigo ? { erro: mensagem, codigo } : { erro: mensagem }, status)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })
  if (req.method !== 'POST') return erro('Use POST.', 405)

  const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
  const urlSupabase = Deno.env.get('SUPABASE_URL')
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const site = (Deno.env.get('SITE_URL') ?? 'https://metanutri.com.br/').replace(/[?#].*$/, '')
  if (!token || !urlSupabase || !servico) return erro('A função não está configurada no servidor.', 500)

  // Quem está pedindo? O token do usuário vem no cabeçalho; sem ele, ninguém assina.
  const autorizacao = req.headers.get('Authorization') ?? ''
  const cliente = createClient(urlSupabase, servico)
  const { data: usuario, error: erroUsuario } = await cliente.auth.getUser(autorizacao.replace('Bearer ', ''))
  if (erroUsuario || !usuario.user?.email) return erro('Entre na sua conta antes de assinar.', 401)

  let corpo: { plano?: unknown; ciclo?: unknown; card_token_id?: unknown; cartao?: unknown }
  try {
    corpo = await req.json()
  } catch {
    return erro('Corpo da requisição inválido.', 400)
  }

  // O preço vem daqui, nunca do navegador: senão dá para assinar o Pro por R$ 1.
  const plano = typeof corpo.plano === 'string' ? corpo.plano : ''
  const escolhido = PLANOS[plano]
  if (!escolhido) return erro('Plano desconhecido.', 400)
  const anual = corpo.ciclo === 'anual'
  const valor = anual ? escolhido.anual : escolhido.mensal

  const cartaoToken = typeof corpo.card_token_id === 'string' && /^[A-Za-z0-9_-]{8,200}$/.test(corpo.card_token_id) ? corpo.card_token_id : null
  const cartao = lerCartao(corpo.cartao)
  if (!cartaoToken || !cartao) return erro('Faltam os dados do cartão. Confira e tente de novo.', 400)

  // Quem já paga não assina de novo por aqui: nasceria uma segunda cobrança (CB-91, CA-163).
  // A cancelada, mesmo dentro do prazo, pode assinar de novo (CA-380).
  const { data: atual, error: erroAtual } = await cliente.from('assinaturas').select('status, plano').eq('nutricionista_id', usuario.user.id).maybeSingle()
  if (erroAtual) {
    console.error('Não consegui conferir a assinatura atual:', erroAtual.message)
    return erro('Não consegui conferir sua assinatura agora. Tente de novo em alguns minutos.', 502)
  }
  if (atual?.status === 'ativa' && (atual.plano === 'solo' || atual.plano === 'pro')) {
    return erro('Você já tem uma assinatura ativa. A troca de plano ainda não é feita pelo site.', 409)
  }

  const agora = new Date()
  const cabecalhosMp = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  let resposta: Response
  try {
    resposta = await fetch(MP, {
      method: 'POST',
      headers: cabecalhosMp,
      body: JSON.stringify({
        reason: `${escolhido.nome} (${anual ? 'anual' : 'mensal'})`,
        external_reference: usuario.user.id,
        payer_email: usuario.user.email,
        card_token_id: cartaoToken,
        // Criada já autorizada: o banco confere o cartão agora e a primeira cobrança cai em até uma hora (D-68).
        status: 'authorized',
        back_url: site,
        auto_recurring: {
          frequency: anual ? 12 : 1,
          frequency_type: 'months',
          transaction_amount: valor,
          currency_id: 'BRL',
        },
      }),
    })
  } catch (falha) {
    console.error('Sem resposta do Mercado Pago ao assinar:', falha instanceof Error ? falha.message : 'erro de rede')
    return erro(SEM_COBRANCA, 502)
  }

  const dados: Record<string, unknown> | null = await resposta.json().catch(() => null)
  if (!resposta.ok) {
    const codigo = codigoDaRecusa(dados)
    const motivo = typeof dados?.['message'] === 'string' ? String(dados['message']).slice(0, 200) : ''
    console.error('Mercado Pago recusou a assinatura:', resposta.status, codigo, motivo)
    if (resposta.status >= 500) return erro(SEM_COBRANCA, 502)
    return erro(RECUSA_PADRAO, 402, codigo)
  }

  const id = typeof dados?.['id'] === 'string' ? dados['id'] : null
  if (!id) {
    console.error('Mercado Pago respondeu sem o id da assinatura:', resposta.status)
    return erro(SEM_COBRANCA, 502)
  }
  const status = traduzirStatus(dados?.['status'])
  // A data de hoje é a primeira cobrança, ainda por cair: a próxima é a do ciclo seguinte.
  const proxima = dataDepoisDe(dados?.['next_payment_date'], agora.getTime() + UM_DIA_MS) ?? previsaoDaProximaCobranca(agora, anual ? 'anual' : 'mensal')

  const vagas = await cliente.rpc('vagas_de_fundador_usadas')
  const travado = typeof vagas.data === 'number' && vagas.data < 200

  const { error: erroGravar } = await cliente.from('assinaturas').upsert(
    {
      nutricionista_id: usuario.user.id,
      plano,
      status,
      preapproval_id: id,
      valor_centavos: Math.round(valor * 100),
      ciclo: anual ? 'anual' : 'mensal',
      // Assinatura paga não vence por data; quem vence é o Estudante e a cancelada (CA-378).
      expira_em: null,
      preco_travado: travado,
      cartao_bandeira: cartao.bandeira,
      cartao_final: cartao.final,
      proxima_cobranca: proxima,
      atualizado_em: agora.toISOString(),
    },
    { onConflict: 'nutricionista_id' },
  )

  if (erroGravar) {
    // A assinatura existe lá, mas não aqui: cancela lá para ninguém pagar sem ter o plano.
    console.error('Assinatura criada e não gravada; cancelando no Mercado Pago:', id, erroGravar.message)
    await fetch(`${MP}/${id}`, { method: 'PUT', headers: cabecalhosMp, body: JSON.stringify({ status: 'cancelled' }) }).catch(() => undefined)
    return erro(SEM_COBRANCA, 502)
  }

  return responder({ status, proximaCobranca: proxima, cartao })
})
```

- [ ] **Step 6: Reescrever o webhook**

Troque o conteúdo inteiro de `supabase/functions/webhook-mercadopago/index.ts` por:

```ts
// Recebe as notificações do Mercado Pago e atualiza a assinatura.
//
// Duas coisas que esta função não pode fazer, e por isso estão explícitas aqui:
//   1. Confiar no corpo da notificação. Qualquer um na internet consegue mandar um
//      POST dizendo "fulano pagou". Por isso a assinatura do cabeçalho é conferida,
//      e o estado real é buscado na API do Mercado Pago, não lido do corpo.
//   2. Devolver erro por bobagem. Se responder != 200, o Mercado Pago reenvia; o
//      que não entendemos é ignorado com 200 para não virar fila infinita.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { dataDepoisDe, traduzirStatus, UM_DIA_MS } from '../_shared/cobranca.ts'

const ok = () => new Response('ok', { status: 200 })

/** Confere a assinatura do cabeçalho (x-signature) conforme o manifesto do Mercado Pago. */
async function assinaturaConfere(req: Request, id: string, segredo: string): Promise<boolean> {
  const cabecalho = req.headers.get('x-signature') ?? ''
  const requestId = req.headers.get('x-request-id') ?? ''

  const partes = Object.fromEntries(
    cabecalho
      .split(',')
      .map((p) => p.split('=').map((x) => x.trim()))
      .filter((p): p is [string, string] => p.length === 2),
  )
  const ts = partes['ts']
  const hash = partes['v1']
  if (!ts || !hash) return false

  const manifesto = `id:${id};request-id:${requestId};ts:${ts};`
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const bytes = await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(manifesto))
  const esperado = [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')

  return esperado === hash
}

Deno.serve(async (req: Request) => {
  const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
  const segredo = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET')
  const urlSupabase = Deno.env.get('SUPABASE_URL')
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token || !urlSupabase || !servico) {
    console.error('Função sem configuração; notificação descartada.')
    return ok()
  }

  let corpo: { type?: string; action?: string; data?: { id?: string } }
  try {
    corpo = await req.json()
  } catch {
    return ok()
  }

  const tipo = corpo.type ?? corpo.action ?? ''
  const id = corpo.data?.id
  if (!id || !tipo.includes('preapproval')) return ok()

  if (segredo && !(await assinaturaConfere(req, id, segredo))) {
    console.error('Assinatura do webhook não confere; notificação descartada.')
    return ok()
  }

  // O estado verdadeiro vem da API, nunca do corpo da notificação.
  const resposta = await fetch(`https://api.mercadopago.com/preapproval/${id}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!resposta.ok) {
    console.error('Não consegui ler a assinatura no Mercado Pago:', resposta.status)
    return ok()
  }

  const assinatura = await resposta.json()
  const dono = assinatura.external_reference
  if (typeof dono !== 'string' || !dono) return ok()

  const cliente = createClient(urlSupabase, servico)
  const status = traduzirStatus(assinatura.status)

  // Só o status muda; o plano escolhido ao assinar continua na linha. O app só libera
  // plano pago com status ativa (D-27), e o "Tentar de novo" reabre esse plano (CA-169).
  // Gravar Free aqui fazia um aviso de "pendente" antes da autorização deixar quem
  // pagou no Free para sempre: a autorização mudava só o status.
  const mudanca = { status, atualizado_em: new Date().toISOString() }
  // D-70: a próxima cobrança vem junto quando a API informa uma data à frente. A de hoje
  // (a primeira cobrança, ainda por cair) não conta. Este aviso nunca mexe no expira_em:
  // a cancelada pela pessoa guarda o fim do período pago que a gerenciar-assinatura
  // gravou (CA-378), e a cancelada pela operadora não tem período a respeitar (CB-94).
  const proxima = status === 'ativa' ? dataDepoisDe(assinatura.next_payment_date, Date.now() + UM_DIA_MS) : null
  if (proxima) Object.assign(mudanca, { proxima_cobranca: proxima })

  // Só a linha desta assinatura: a notificação de um checkout abandonado (ou de uma
  // assinatura antiga) não pode mexer no plano Estudante aprovado depois (CB-63).
  const { data: linhas, error } = await cliente.from('assinaturas').update(mudanca).eq('nutricionista_id', dono).eq('preapproval_id', id).select('nutricionista_id')
  if (error) {
    console.error('Não consegui atualizar a assinatura:', error)
  } else if (status === 'ativa' && (!linhas || linhas.length === 0)) {
    // Risco aceito: link de checkout antigo pago depois de outra mudança (ex.: Estudante aprovado).
    // A cobrança existe no Mercado Pago, mas nenhuma linha mudou: fica o rastro para conferir.
    console.error('Pagamento ativo sem assinatura com este preapproval_id; conferir à mão:', id, dono)
  }

  return ok()
})
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run src/data/cobrancaServidor.test.ts src/data/sqlCheckout.test.ts src/data/sqlVerificacao.test.ts src/data/sqlPainel.test.ts` → PASS (o D-59 do painel continua achando `ciclo: anual ? 'anual' : 'mensal',`). Depois `npm run check` → verde.

- [ ] **Step 8: Commit**

```bash
git add supabase/functions/_shared/cobranca.ts src/data/cobrancaServidor.test.ts supabase/functions/assinar/index.ts supabase/functions/webhook-mercadopago/index.ts src/data/sqlCheckout.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(assinar): assinatura autorizada com o cartão, sem sair do site`

Não publique a função agora: o site no ar ainda manda só plano e ciclo, e a `assinar` nova responderia "Faltam os dados do cartão". O deploy é na Tarefa 12, junto com o site.

---

### Tarefa 3: Servidor: `gerenciar-assinatura` (cancelar e trocar cartão)

Cobre D-69, CA-377 a CA-379, CB-93 e CB-94 no servidor.

**Files:**
- Create: `supabase/functions/gerenciar-assinatura/index.ts`
- Modify: `src/data/sqlCheckout.test.ts`
- Modify: `README.md` (seção "Projeto novo", passo 4; seção "Projeto já ligado", passo 5)

**Interfaces:**
- Consumes: `CABECALHOS`, `codigoDaRecusa`, `dataDepoisDe`, `fimDoPeriodoPago`, `lerCartao`, `responder`, `traduzirStatus` (Tarefa 2); colunas do `008`.
- Produces (o que a Tarefa 9 chama por `functions.invoke('gerenciar-assinatura', { body })`):
  - `{ acao: 'cancelar' }` → `200 { status: 'cancelada', expiraEm: string | null }`; `409` sem assinatura paga; `502 { erro }` operadora fora ou gravação falhou.
  - `{ acao: 'trocar_cartao', card_token_id, cartao: { bandeira, final } }` → `200 { cartao }`; `402 { erro, codigo }` recusa (o cartão antigo continua); `409` assinatura não ativa; `400` cartão faltando; `502 { erro }`.
  - `401` sem sessão em qualquer ação; `400 { erro: 'Ação desconhecida.' }`.

- [ ] **Step 1: Escrever os testes que falham**

Em `src/data/sqlCheckout.test.ts`, acrescente ao topo:

```ts
import gerenciar from '../../supabase/functions/gerenciar-assinatura/index.ts?raw'
```

E, no fim do arquivo:

```ts
describe('função gerenciar-assinatura (spec checkout-proprio)', () => {
  it('exige a sessão de quem pede e só mexe em assinatura paga', () => {
    expect(gerenciar).toContain("return erro('Entre na sua conta antes de mudar a assinatura.', 401)")
    expect(gerenciar).toContain("return erro('Esta conta não tem assinatura paga.', 409)")
  })

  it('CB-93: assinatura já cancelada aqui não chama a operadora de novo', () => {
    expect(gerenciar).toContain("if (linha.status === 'cancelada') return responder({ status: 'cancelada', expiraEm: linha.expira_em ?? null })")
  })

  it('CB-93: só cancela lá o que ainda não está cancelado lá', () => {
    expect(gerenciar).toContain("if (traduzirStatus(lida.dados?.['status']) !== 'cancelada') {")
  })

  it('CA-378: cancela lá com "cancelled" e, se a operadora recusar a palavra, com "canceled"', () => {
    expect(gerenciar).toContain("let feito = await operadora('PUT', { status: 'cancelled' })")
    expect(gerenciar).toContain("if (feito && !feito.ok && feito.status < 500) feito = await operadora('PUT', { status: 'canceled' })")
  })

  it('CA-378 e CB-94: grava cancelada com o fim do período pago; sem data de cobrança à frente, Free na hora', () => {
    expect(gerenciar).toContain("const proxima = dataDepoisDe(lida.dados?.['next_payment_date'], agora) ?? dataDepoisDe(linha.proxima_cobranca, agora)")
    expect(gerenciar).toContain('const expiraEm = proxima ? fimDoPeriodoPago(proxima) : null')
    expect(gerenciar).toContain("update({ status: 'cancelada', expira_em: expiraEm, atualizado_em: new Date(agora).toISOString() })")
  })

  it('CA-379: troca o cartão lá antes de gravar a bandeira e o final aqui; recusa vira 402 e o cartão antigo fica', () => {
    const troca = gerenciar.split("if (corpo.acao === 'trocar_cartao') {")[1] ?? ''
    const naOperadora = troca.indexOf("operadora('PUT', { card_token_id: cartaoToken })")
    expect(naOperadora).toBeGreaterThan(-1)
    expect(naOperadora).toBeLessThan(troca.indexOf('cartao_bandeira: cartao.bandeira'))
    expect(troca).toContain('return erro(RECUSA_DO_CARTAO_NOVO, 402, codigo)')
  })

  it('só mexe na linha da mesma assinatura da operadora', () => {
    expect(gerenciar.match(/\.eq\('nutricionista_id', dono\)\.eq\('preapproval_id', id\)/g)).toHaveLength(2)
  })

  it('nenhum registro leva o código do cartão nem o corpo do pedido', () => {
    for (const linha of registros(gerenciar)) expect(linha).not.toMatch(/cartaoToken|card_token_id|corpo/)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/data/sqlCheckout.test.ts`
Expected: FAIL — `gerenciar-assinatura/index.ts` não existe.

- [ ] **Step 3: Escrever a função**

Crie `supabase/functions/gerenciar-assinatura/index.ts`:

```ts
// Cancela a assinatura ou troca o cartão, sem sair do site (spec checkout-proprio, D-69,
// CA-377 a CA-379).
//
// Cancelada, ela para de cobrar no Mercado Pago, e o plano pago vale até o fim do período
// já pago (expira_em); depois o app volta sozinho para o Free (src/domain/assinatura.ts).
// Pedir para cancelar uma assinatura já cancelada não chama o Mercado Pago de novo (CB-93).
// Trocar o cartão manda o código de uso único do cartão novo; se o banco recusar, o
// cartão antigo continua (CA-379). Um pedido por vez é cuidado pela tela.
//
// Deno / Supabase Edge Functions. Não faz parte do build do app.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CABECALHOS, codigoDaRecusa, dataDepoisDe, fimDoPeriodoPago, lerCartao, responder, traduzirStatus } from '../_shared/cobranca.ts'

const MP = 'https://api.mercadopago.com/preapproval'
/** A operadora não respondeu: nada mudou lá nem aqui. */
const FORA = 'Não consegui falar com o servidor de cobrança. Nada mudou. Tente de novo em alguns minutos.'
const RECUSA_DO_CARTAO_NOVO = 'O banco recusou este cartão. Confira os dados ou use outro cartão. Nada foi cobrado.'
const PAGOS = ['solo', 'pro', 'clinica']

const erro = (mensagem: string, status: number, codigo?: string) => responder(codigo ? { erro: mensagem, codigo } : { erro: mensagem }, status)

interface RespostaDaOperadora {
  readonly ok: boolean
  readonly status: number
  readonly dados: Record<string, unknown> | null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })
  if (req.method !== 'POST') return erro('Use POST.', 405)

  const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
  const urlSupabase = Deno.env.get('SUPABASE_URL')
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token || !urlSupabase || !servico) return erro('A função não está configurada no servidor.', 500)

  // Quem está pedindo? O token do usuário vem no cabeçalho, como na assinar.
  const autorizacao = req.headers.get('Authorization') ?? ''
  const cliente = createClient(urlSupabase, servico)
  const { data: usuario, error: erroUsuario } = await cliente.auth.getUser(autorizacao.replace('Bearer ', ''))
  if (erroUsuario || !usuario.user) return erro('Entre na sua conta antes de mudar a assinatura.', 401)
  const dono = usuario.user.id

  let corpo: { acao?: unknown; card_token_id?: unknown; cartao?: unknown }
  try {
    corpo = await req.json()
  } catch {
    return erro('Corpo da requisição inválido.', 400)
  }

  const { data: linha, error: erroLinha } = await cliente
    .from('assinaturas')
    .select('plano, status, preapproval_id, proxima_cobranca, expira_em')
    .eq('nutricionista_id', dono)
    .maybeSingle()
  if (erroLinha) {
    console.error('Não consegui ler a assinatura:', erroLinha.message)
    return erro(FORA, 502)
  }
  if (!linha || !PAGOS.includes(linha.plano) || typeof linha.preapproval_id !== 'string') return erro('Esta conta não tem assinatura paga.', 409)
  const id: string = linha.preapproval_id

  const operadora = async (metodo: 'GET' | 'PUT', envio?: Record<string, unknown>): Promise<RespostaDaOperadora | null> => {
    try {
      const resposta = await fetch(`${MP}/${id}`, {
        method: metodo,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(envio ? { body: JSON.stringify(envio) } : {}),
      })
      return { ok: resposta.ok, status: resposta.status, dados: await resposta.json().catch(() => null) }
    } catch {
      return null
    }
  }

  if (corpo.acao === 'cancelar') {
    // CB-93: a resposta do cancelamento se perdeu e a pessoa pediu de novo; nada a fazer lá.
    if (linha.status === 'cancelada') return responder({ status: 'cancelada', expiraEm: linha.expira_em ?? null })

    const lida = await operadora('GET')
    if (!lida?.ok) {
      console.error('Não consegui ler a assinatura na operadora:', lida?.status ?? 'sem resposta', id)
      return erro(FORA, 502)
    }

    if (traduzirStatus(lida.dados?.['status']) !== 'cancelada') {
      let feito = await operadora('PUT', { status: 'cancelled' })
      // A documentação em português escreve "canceled"; se a API recusar uma grafia, tenta a outra.
      if (feito && !feito.ok && feito.status < 500) feito = await operadora('PUT', { status: 'canceled' })
      if (!feito?.ok) {
        console.error('A operadora não cancelou:', feito?.status ?? 'sem resposta', codigoDaRecusa(feito?.dados), id)
        return erro(FORA, 502)
      }
    }

    // O fim do período pago sai da próxima cobrança: a da operadora, se vier, senão a gravada aqui.
    const agora = Date.now()
    const proxima = dataDepoisDe(lida.dados?.['next_payment_date'], agora) ?? dataDepoisDe(linha.proxima_cobranca, agora)
    // Sem data de cobrança à frente, não há período pago a respeitar: volta ao Free na hora (CB-94).
    const expiraEm = proxima ? fimDoPeriodoPago(proxima) : null
    const { error: erroGravar } = await cliente.from('assinaturas').update({ status: 'cancelada', expira_em: expiraEm, atualizado_em: new Date(agora).toISOString() }).eq('nutricionista_id', dono).eq('preapproval_id', id)
    if (erroGravar) {
      // Pedir de novo resolve: lá já está cancelada, e esta função só grava aqui.
      console.error('Cancelada na operadora, mas não gravada aqui:', id, erroGravar.message)
      return erro('A assinatura foi cancelada, mas não consegui mostrar aqui. Abra Conta e plano de novo em alguns minutos.', 502)
    }
    return responder({ status: 'cancelada', expiraEm })
  }

  if (corpo.acao === 'trocar_cartao') {
    if (linha.status !== 'ativa') return erro('Só dá para trocar o cartão de uma assinatura ativa.', 409)
    const cartaoToken = typeof corpo.card_token_id === 'string' && /^[A-Za-z0-9_-]{8,200}$/.test(corpo.card_token_id) ? corpo.card_token_id : null
    const cartao = lerCartao(corpo.cartao)
    if (!cartaoToken || !cartao) return erro('Faltam os dados do cartão. Confira e tente de novo.', 400)

    const feito = await operadora('PUT', { card_token_id: cartaoToken })
    if (!feito || feito.status >= 500) {
      console.error('A operadora não respondeu à troca de cartão:', feito?.status ?? 'sem resposta', id)
      return erro(FORA, 502)
    }
    if (!feito.ok) {
      const codigo = codigoDaRecusa(feito.dados)
      console.error('A operadora recusou o cartão novo:', feito.status, codigo, id)
      return erro(RECUSA_DO_CARTAO_NOVO, 402, codigo)
    }

    const { error: erroGravar } = await cliente.from('assinaturas').update({ cartao_bandeira: cartao.bandeira, cartao_final: cartao.final, atualizado_em: new Date().toISOString() }).eq('nutricionista_id', dono).eq('preapproval_id', id)
    // O cartão já foi trocado lá: se a gravação falhar, só a tela mostra o antigo até a próxima troca.
    if (erroGravar) console.error('Cartão trocado na operadora, mas não gravado aqui:', id, erroGravar.message)
    return responder({ cartao })
  }

  return erro('Ação desconhecida.', 400)
})
```

- [ ] **Step 4: README**

Em "Projeto novo", passo 4, troque o bloco inteiro:

````markdown
4. Publique as duas funções, trocando `<ref>` pelo código do projeto (o pedaço antes de `.supabase.co`
   na *Project URL*), e guarde o endereço do site no segredo `SITE_URL`:
   ```bash
   npx supabase secrets set SITE_URL=https://metanutri.com.br/ --project-ref <ref>
   npx supabase functions deploy assinar --project-ref <ref>
   npx supabase functions deploy webhook-mercadopago --no-verify-jwt --project-ref <ref>
   ```
   O `--no-verify-jwt` é obrigatório na segunda: quem chama é o Mercado Pago, que não tem conta no Supabase.
````

por:

````markdown
4. Publique as três funções, trocando `<ref>` pelo código do projeto (o pedaço antes de `.supabase.co`
   na *Project URL*), e guarde o endereço do site no segredo `SITE_URL`:
   ```bash
   npx supabase secrets set SITE_URL=https://metanutri.com.br/ --project-ref <ref>
   npx supabase functions deploy gerenciar-assinatura --project-ref <ref>
   npx supabase functions deploy assinar --project-ref <ref>
   npx supabase functions deploy webhook-mercadopago --no-verify-jwt --project-ref <ref>
   ```
   O `--no-verify-jwt` é obrigatório na última: quem chama é o Mercado Pago, que não tem conta no Supabase.
````

Em "Projeto já ligado", troque o passo 5 inteiro:

```markdown
5. **Mercado Pago.** Crie a aplicação e guarde o token como `MERCADOPAGO_ACCESS_TOKEN` e o segredo do webhook
   como `MERCADOPAGO_WEBHOOK_SECRET` (`npx supabase secrets set ... --project-ref qmpljfjbdcrdbqutuvmg`). A
   `webhook-mercadopago` já está publicada; a `assinar` é publicada de novo no passo 4. Cadastre o webhook apontando para
   `https://qmpljfjbdcrdbqutuvmg.supabase.co/functions/v1/webhook-mercadopago`, evento Assinaturas.
```

por:

````markdown
5. **Mercado Pago.** Crie a aplicação e guarde o token como `MERCADOPAGO_ACCESS_TOKEN` e o segredo do webhook
   como `MERCADOPAGO_WEBHOOK_SECRET` (`npx supabase secrets set ... --project-ref qmpljfjbdcrdbqutuvmg`). Com o
   `008` rodado, publique as três funções desta versão e, logo em seguida, o site: a `assinar` nova não serve ao
   site antigo, que não manda o cartão.
   ```bash
   npx supabase functions deploy gerenciar-assinatura --project-ref qmpljfjbdcrdbqutuvmg
   npx supabase functions deploy assinar --project-ref qmpljfjbdcrdbqutuvmg
   npx supabase functions deploy webhook-mercadopago --no-verify-jwt --project-ref qmpljfjbdcrdbqutuvmg
   ```
   Cadastre o webhook apontando para `https://qmpljfjbdcrdbqutuvmg.supabase.co/functions/v1/webhook-mercadopago`,
   evento Assinaturas.
````

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/data/sqlCheckout.test.ts` → PASS. Depois `npm run check` → verde.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/gerenciar-assinatura/index.ts src/data/sqlCheckout.test.ts README.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(assinatura): cancelar e trocar o cartão pelo site`

Não publique agora: o deploy é na Tarefa 12, junto com as outras duas e o site.

---

### Tarefa 4: Domínio: assinatura paga, cancelada no prazo e textos

Cobre CA-372, CA-376 a CA-378, CB-94, D-70 e o recado de CA-381.

**Files:**
- Modify: `src/domain/assinatura.ts` (o arquivo inteiro)
- Modify: `src/domain/assinatura.test.ts` (o arquivo inteiro)
- Create: `src/domain/assinaturaTextos.ts`
- Create: `src/domain/assinaturaTextos.test.ts`
- Modify: `src/AppConta.test.tsx:15`, `src/domain/pedidoEstudante.test.ts:30`, `src/ui/conta/TelaConta.test.tsx:3,10,58,133` (os literais de `Assinatura`)

**Interfaces:**
- Consumes: `fimDoPeriodoPago`, `previsaoDaProximaCobranca` (Tarefa 2); `ehCiclo`, `ehIdPlano`, `planoPorId`, tipos `Ciclo`, `IdPlano` de `src/domain/conta.ts`; `formatarDataLonga` de `src/domain/pedidoEstudante.ts`.
- Produces:

```ts
// src/domain/assinatura.ts
export interface Assinatura {
  readonly plano: IdPlano; readonly planoPedido: IdPlano; readonly status: StatusAssinatura; readonly precoTravado: boolean
  readonly expiraEm: string | null; readonly ciclo: Ciclo | null; readonly valorCentavos: number
  readonly cartaoBandeira: string | null; readonly cartaoFinal: string | null; readonly proximaCobranca: string | null
}
export const SEM_ASSINATURA: Assinatura
export function daLinhaAssinatura(linha: unknown, agora?: Date): Assinatura
export const canceladaNoPrazo: (a: Assinatura) => boolean        // CA-378
export const temAssinaturaPaga: (a: Assinatura) => boolean       // ativa paga ou cancelada no prazo
export const RECADO_STATUS: Readonly<Record<StatusAssinatura, string>>   // sem o nome do processador
// (ASSINAVEIS, podeAssinar, RespostaDaVolta e respostaDaVolta não mudam)

// src/domain/assinaturaTextos.ts
export const emReais: (valor: number) => string                                   // 34.9 → "R$ 34,90"
export function nomeComCiclo(plano: IdPlano, ciclo: Ciclo | null): string         // "Solo, mensal"
export function recadoDaAssinatura(a: Assinatura): string
export function linhaDoCartao(a: Assinatura): string | null                       // "Mastercard final 6351"
export function linhaDaCobranca(a: Assinatura): string | null                     // próxima cobrança ou "Cancelada, vale até …"
export function valeAteSeCancelar(a: Assinatura): string | null                   // "1 de novembro de 2026"
export const proximaCobrancaPrevista: (ciclo: Ciclo, agora: Date) => string      // ISO
export function depoisDeHoje(valor: number, ciclo: Ciclo, proximaCobranca: string): string
export function fraseDaAssinaturaAtiva(plano: IdPlano, ciclo: Ciclo, email: string, proximaCobranca: string): string
```

- [ ] **Step 1: Escrever os testes que falham**

Troque o conteúdo inteiro de `src/domain/assinatura.test.ts` por:

```ts
import { canceladaNoPrazo, daLinhaAssinatura, podeAssinar, RECADO_STATUS, respostaDaVolta, SEM_ASSINATURA, temAssinaturaPaga } from './assinatura.ts'

describe('Ler a assinatura do banco', () => {
  it('assinatura ativa dá o plano pago', () => {
    expect(daLinhaAssinatura({ plano: 'pro', status: 'ativa' })).toEqual({ ...SEM_ASSINATURA, plano: 'pro', planoPedido: 'pro', status: 'ativa' })
  })

  it('assinatura pendente NÃO dá plano pago: criar e não pagar não libera nada', () => {
    expect(daLinhaAssinatura({ plano: 'pro', status: 'pendente' }).plano).toBe('free')
  })

  it.each(['pausada', 'cancelada'])('assinatura %s, sem data, volta para o Free', (status) => {
    expect(daLinhaAssinatura({ plano: 'solo', status }).plano).toBe('free')
  })

  it('status inventado não vira plano pago', () => {
    expect(daLinhaAssinatura({ plano: 'pro', status: 'ativíssima' })).toMatchObject({ plano: 'free', status: 'sem-assinatura' })
  })

  it('plano inventado com status ativo cai no Free', () => {
    expect(daLinhaAssinatura({ plano: 'ouro', status: 'ativa' }).plano).toBe('free')
  })

  it('linha vazia ou quebrada é sem assinatura', () => {
    expect(daLinhaAssinatura(null)).toEqual(SEM_ASSINATURA)
    expect(daLinhaAssinatura('nada')).toEqual(SEM_ASSINATURA)
    expect(daLinhaAssinatura({})).toEqual(SEM_ASSINATURA)
  })

  it('guarda o preço travado de fundador', () => {
    expect(daLinhaAssinatura({ plano: 'solo', status: 'ativa', preco_travado: true }).precoTravado).toBe(true)
    expect(daLinhaAssinatura({ plano: 'solo', status: 'ativa', preco_travado: 'sim' }).precoTravado).toBe(false)
  })
})

describe('O cartão e a próxima cobrança (D-70)', () => {
  it('lê o ciclo, o valor, a bandeira, o final e a próxima cobrança', () => {
    const a = daLinhaAssinatura({
      plano: 'solo',
      status: 'ativa',
      ciclo: 'mensal',
      valor_centavos: 3490,
      cartao_bandeira: ' Mastercard ',
      cartao_final: '6351',
      proxima_cobranca: '2026-11-02T15:00:00+00:00',
    })
    expect(a).toMatchObject({ ciclo: 'mensal', valorCentavos: 3490, cartaoBandeira: 'Mastercard', cartaoFinal: '6351', proximaCobranca: '2026-11-02T15:00:00+00:00' })
  })

  it('foco 4: linha de antes do 008 (e do 007) lê nulos, sem quebrar', () => {
    expect(daLinhaAssinatura({ plano: 'solo', status: 'ativa', valor_centavos: 3490 })).toMatchObject({
      plano: 'solo',
      ciclo: null,
      cartaoBandeira: null,
      cartaoFinal: null,
      proximaCobranca: null,
    })
  })

  it('final que não tem 4 números, ciclo e valor estranhos e data quebrada viram nulo ou zero', () => {
    expect(daLinhaAssinatura({ plano: 'solo', status: 'ativa', cartao_final: '635', ciclo: 'semanal', valor_centavos: -1, proxima_cobranca: 'logo' })).toMatchObject({
      cartaoFinal: null,
      ciclo: null,
      valorCentavos: 0,
      proximaCobranca: null,
    })
  })
})

describe('Cancelada vale até o fim do período pago (CA-378, CB-94)', () => {
  const agora = new Date('2026-10-20T15:00:00Z')

  it('CA-378: cancelada com expira_em à frente continua no plano pago, marcada como cancelada', () => {
    const a = daLinhaAssinatura({ plano: 'solo', status: 'cancelada', expira_em: '2026-11-02T02:59:59.000Z' }, agora)
    expect(a).toMatchObject({ plano: 'solo', planoPedido: 'solo', status: 'cancelada' })
    expect(canceladaNoPrazo(a)).toBe(true)
    expect(temAssinaturaPaga(a)).toBe(true)
  })

  it('CA-378 e foco 1: vale até 23h59min59s de 1/11 em Brasília e volta ao Free no primeiro segundo de 2/11', () => {
    const linha = { plano: 'solo', status: 'cancelada', expira_em: '2026-11-02T02:59:59.000Z' }
    expect(daLinhaAssinatura(linha, new Date('2026-11-02T02:59:58Z')).plano).toBe('solo')
    expect(daLinhaAssinatura(linha, new Date('2026-11-02T03:00:00Z')).plano).toBe('free')
  })

  it('CB-94: cancelada sem data (a operadora cancelou sozinha) volta ao Free na hora', () => {
    const a = daLinhaAssinatura({ plano: 'pro', status: 'cancelada', expira_em: null }, agora)
    expect(a.plano).toBe('free')
    expect(canceladaNoPrazo(a)).toBe(false)
    expect(temAssinaturaPaga(a)).toBe(false)
  })

  it('só plano pago tem período a respeitar: Estudante cancelado não volta por engano', () => {
    expect(daLinhaAssinatura({ plano: 'estudante', status: 'cancelada', expira_em: '2027-01-01T00:00:00Z' }, agora).plano).toBe('free')
  })

  it('ativa paga é assinatura paga; Estudante e pendente não', () => {
    expect(temAssinaturaPaga(daLinhaAssinatura({ plano: 'pro', status: 'ativa' }, agora))).toBe(true)
    expect(temAssinaturaPaga(daLinhaAssinatura({ plano: 'estudante', status: 'ativa', expira_em: '2027-07-31T23:59:59Z' }, agora))).toBe(false)
    expect(temAssinaturaPaga(daLinhaAssinatura({ plano: 'solo', status: 'pendente' }, agora))).toBe(false)
  })
})

describe('Quais planos têm botão de assinar', () => {
  it('Solo e Pro sim', () => {
    expect(podeAssinar('solo')).toBe(true)
    expect(podeAssinar('pro')).toBe(true)
  })

  it('Clínica não: é conversa, não botão', () => {
    expect(podeAssinar('clinica')).toBe(false)
  })

  it('os grátis não', () => {
    expect(podeAssinar('free')).toBe(false)
    expect(podeAssinar('estudante')).toBe(false)
  })
})

describe('Recado de cada estado', () => {
  it('todo estado tem uma frase, e nenhuma some', () => {
    for (const frase of Object.values(RECADO_STATUS)) expect(frase.length).toBeGreaterThan(10)
  })

  it('pendente explica que ainda não vale', () => {
    expect(RECADO_STATUS.pendente).toContain('Free')
  })

  it('CA-381: nenhum recado cita o processador de pagamento', () => {
    for (const frase of Object.values(RECADO_STATUS)) expect(frase).not.toMatch(/mercado ?pago/i)
  })
})

describe('Estudante vence em 12 meses (CA-175)', () => {
  const agora = new Date('2027-10-01T00:00:00Z')

  it('dentro do prazo, vale o Estudante', () => {
    expect(daLinhaAssinatura({ plano: 'estudante', status: 'ativa', expira_em: '2027-12-01T00:00:00Z' }, agora).plano).toBe('estudante')
  })

  it('passou do prazo, volta ao Free e fica marcada como vencida', () => {
    const a = daLinhaAssinatura({ plano: 'estudante', status: 'ativa', expira_em: '2027-09-01T00:00:00Z' }, agora)
    expect(a).toMatchObject({ plano: 'free', planoPedido: 'estudante', status: 'vencida', expiraEm: '2027-09-01T00:00:00Z' })
  })

  it('data quebrada não vence nem estoura', () => {
    expect(daLinhaAssinatura({ plano: 'estudante', status: 'ativa', expira_em: 'amanhã' }, agora).plano).toBe('estudante')
  })
})

describe('Resposta da volta do pagamento (CA-166 a CA-169)', () => {
  it.each([
    ['ativa', 'ativa'],
    ['pendente', 'analise'],
    ['cancelada', 'nao-concluido'],
    ['pausada', 'nao-concluido'],
    ['vencida', 'nao-concluido'],
    ['sem-assinatura', 'nao-concluido'],
  ] as const)('%s vira %s', (status, resposta) => {
    expect(respostaDaVolta({ ...SEM_ASSINATURA, status })).toBe(resposta)
  })
})
```

Crie `src/domain/assinaturaTextos.test.ts`:

```ts
import { SEM_ASSINATURA, type Assinatura } from './assinatura.ts'
import {
  depoisDeHoje,
  emReais,
  fraseDaAssinaturaAtiva,
  linhaDaCobranca,
  linhaDoCartao,
  nomeComCiclo,
  proximaCobrancaPrevista,
  recadoDaAssinatura,
  valeAteSeCancelar,
} from './assinaturaTextos.ts'

const PAGA: Assinatura = {
  ...SEM_ASSINATURA,
  plano: 'solo',
  planoPedido: 'solo',
  status: 'ativa',
  ciclo: 'mensal',
  valorCentavos: 3490,
  precoTravado: true,
  cartaoBandeira: 'Mastercard',
  cartaoFinal: '6351',
  proximaCobranca: '2026-11-02T15:00:00.000Z',
}

describe('textos da assinatura (spec checkout-proprio)', () => {
  it('dinheiro em reais, com vírgula e ponto de milhar', () => {
    expect(emReais(34.9)).toBe('R$ 34,90')
    expect(emReais(1299)).toBe('R$ 1.299,00')
  })

  it('o plano com o ciclo', () => {
    expect(nomeComCiclo('solo', 'mensal')).toBe('Solo, mensal')
    expect(nomeComCiclo('pro', 'anual')).toBe('Pro, anual')
    expect(nomeComCiclo('pro', null)).toBe('Pro')
  })

  it('CA-376: a bandeira, o final, e a próxima cobrança com o valor', () => {
    expect(linhaDoCartao(PAGA)).toBe('Mastercard final 6351')
    expect(linhaDaCobranca(PAGA)).toBe('Próxima cobrança em 2 de novembro de 2026, R$ 34,90')
    expect(recadoDaAssinatura(PAGA)).toBe('Sua assinatura está em dia.')
  })

  it('foco 4: sem o cartão gravado (antes do 008), sem a linha do cartão, sem a da cobrança e sem data para o cancelamento', () => {
    const antiga: Assinatura = { ...PAGA, cartaoBandeira: null, cartaoFinal: null, proximaCobranca: null }
    expect(linhaDoCartao(antiga)).toBeNull()
    expect(linhaDaCobranca(antiga)).toBeNull()
    expect(valeAteSeCancelar(antiga)).toBeNull()
  })

  it('CA-377: se cancelar agora, vale até a véspera da próxima cobrança', () => {
    expect(valeAteSeCancelar(PAGA)).toBe('1 de novembro de 2026')
  })

  it('CA-378: a cancelada no prazo diz até quando vale', () => {
    const cancelada: Assinatura = { ...PAGA, status: 'cancelada', expiraEm: '2026-11-02T02:59:59.000Z' }
    expect(linhaDaCobranca(cancelada)).toBe('Cancelada, vale até 1 de novembro de 2026')
    expect(recadoDaAssinatura(cancelada)).toBe('A assinatura foi cancelada e não cobra mais. O plano pago vale até o fim do período já pago.')
  })

  it('CA-366: a próxima cobrança prevista e o que vem depois de hoje', () => {
    expect(proximaCobrancaPrevista('mensal', new Date('2026-10-02T15:00:00Z'))).toBe('2026-11-02T15:00:00.000Z')
    expect(depoisDeHoje(34.9, 'mensal', '2026-11-02T15:00:00.000Z')).toBe('Depois, R$ 34,90 todo dia 2. Cancele quando quiser.')
    expect(depoisDeHoje(299, 'anual', '2027-10-02T15:00:00.000Z')).toBe('Depois, R$ 299,00 todo ano, em 2 de outubro. Cancele quando quiser.')
  })

  it('CA-372: a frase da assinatura ativa', () => {
    expect(fraseDaAssinaturaAtiva('solo', 'mensal', 'maria@exemplo.com', '2026-11-02T15:00:00.000Z')).toBe(
      'Plano Solo, mensal. O recibo vai para maria@exemplo.com e a próxima cobrança é em 2 de novembro de 2026.',
    )
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/assinatura.test.ts src/domain/assinaturaTextos.test.ts`
Expected: FAIL — `canceladaNoPrazo`, `temAssinaturaPaga` e `assinaturaTextos.ts` não existem; a linha lida não tem os campos novos.

- [ ] **Step 3: Implementar o domínio da assinatura**

Troque o conteúdo inteiro de `src/domain/assinatura.ts` por:

```ts
// O lado do navegador da assinatura. Aqui não existe preço nem cobrança: quem
// decide valor é o servidor (`supabase/functions/assinar`), porque preço que vem do
// navegador é preço que o cliente escolhe.
import { ehCiclo, ehIdPlano, type Ciclo, type IdPlano } from './conta.ts'

export type StatusAssinatura = 'ativa' | 'pendente' | 'pausada' | 'cancelada' | 'vencida' | 'sem-assinatura'

export interface Assinatura {
  /** O plano que vale agora. Só assinatura ativa e dentro do prazo, ou paga cancelada ainda no período pago, dá plano pago. */
  readonly plano: IdPlano
  /** O plano gravado na linha, valendo ou não: é o que o "Assinar de novo" reabre. */
  readonly planoPedido: IdPlano
  readonly status: StatusAssinatura
  readonly precoTravado: boolean
  /** Até quando vale: o Estudante, e a paga cancelada (o fim do período pago, CA-378). `null` quando não vence. */
  readonly expiraEm: string | null
  /** Mensal ou anual, na assinatura paga. `null` no Free, no Estudante e nas linhas de antes do 007. */
  readonly ciclo: Ciclo | null
  /** O valor de cada cobrança, em centavos. Zero quando não há. */
  readonly valorCentavos: number
  /** D-70: a bandeira e os 4 últimos números do cartão que paga. `null` nas linhas de antes do 008. */
  readonly cartaoBandeira: string | null
  readonly cartaoFinal: string | null
  /** Quando cai a próxima cobrança da assinatura paga. */
  readonly proximaCobranca: string | null
}

export const SEM_ASSINATURA: Assinatura = {
  plano: 'free',
  planoPedido: 'free',
  status: 'sem-assinatura',
  precoTravado: false,
  expiraEm: null,
  ciclo: null,
  valorCentavos: 0,
  cartaoBandeira: null,
  cartaoFinal: null,
  proximaCobranca: null,
}

/** O que o banco grava. `vencida` não está aqui: ela é calculada pela data. */
const STATUS_DO_BANCO: readonly StatusAssinatura[] = ['ativa', 'pendente', 'pausada', 'cancelada', 'sem-assinatura']

/** Os planos que se paga: só eles têm período pago a respeitar depois de cancelar. */
const PAGOS: readonly IdPlano[] = ['solo', 'pro', 'clinica']

const dataOuNulo = (valor: unknown): string | null => (typeof valor === 'string' && !Number.isNaN(new Date(valor).getTime()) ? valor : null)

/** Linha do banco → assinatura. O que não reconhece vira "sem assinatura", nunca plano pago. */
export function daLinhaAssinatura(linha: unknown, agora: Date = new Date()): Assinatura {
  if (typeof linha !== 'object' || linha === null) return SEM_ASSINATURA
  const o = linha as Record<string, unknown>

  const lido =
    typeof o['status'] === 'string' && (STATUS_DO_BANCO as readonly string[]).includes(o['status']) ? (o['status'] as StatusAssinatura) : 'sem-assinatura'
  const planoPedido: IdPlano = ehIdPlano(o['plano']) ? o['plano'] : 'free'
  const expiraEm = dataOuNulo(o['expira_em'])
  const vence = expiraEm === null ? null : new Date(expiraEm).getTime()
  // O Estudante vale 12 meses. Passou do prazo, volta ao Free sem apagar nada (CA-175).
  const status: StatusAssinatura = lido === 'ativa' && vence !== null && vence < agora.getTime() ? 'vencida' : lido
  // CA-378: a paga cancelada continua valendo até o fim do período pago. Sem data à frente
  // (a operadora cancelou sozinha depois das cobranças recusadas, CB-94), volta ao Free na hora.
  const canceladaValendo = status === 'cancelada' && PAGOS.includes(planoPedido) && vence !== null && vence > agora.getTime()

  const bandeira = o['cartao_bandeira']
  const final = o['cartao_final']
  const valor = o['valor_centavos']

  return {
    // Só assinatura ativa (ou paga cancelada no prazo) dá plano pago. Pendente, pausada ou
    // vencida volta para o Free: senão, criar a assinatura e não pagar liberaria tudo.
    plano: status === 'ativa' || canceladaValendo ? planoPedido : 'free',
    planoPedido,
    status,
    precoTravado: o['preco_travado'] === true,
    expiraEm,
    ciclo: ehCiclo(o['ciclo']) ? o['ciclo'] : null,
    valorCentavos: typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? valor : 0,
    cartaoBandeira: typeof bandeira === 'string' && bandeira.trim() !== '' ? bandeira.trim() : null,
    cartaoFinal: typeof final === 'string' && /^\d{4}$/.test(final) ? final : null,
    proximaCobranca: dataOuNulo(o['proxima_cobranca']),
  }
}

/** CA-378: cancelada, mas ainda dentro do período pago (o plano pago ainda vale). */
export const canceladaNoPrazo = (a: Assinatura): boolean => a.status === 'cancelada' && a.plano !== 'free'

/** CA-376 e CA-378: a assinatura paga que Conta e plano mostra com o cartão ou com o "vale até". */
export const temAssinaturaPaga = (a: Assinatura): boolean => (a.status === 'ativa' || canceladaNoPrazo(a)) && PAGOS.includes(a.plano)

/** CA-381: nenhum recado cita o processador de pagamento. */
export const RECADO_STATUS: Readonly<Record<StatusAssinatura, string>> = {
  ativa: 'Sua assinatura está em dia.',
  pendente: 'O banco ainda está confirmando o pagamento. Até lá, vale o plano Free.',
  pausada: 'Sua assinatura está pausada. Enquanto isso, vale o plano Free.',
  cancelada: 'Sua assinatura foi cancelada. Você continua com o plano Free.',
  vencida: 'O prazo do seu plano acabou. Você continua no Free, sem perder nada.',
  'sem-assinatura': 'Você está no plano Free.',
}

/** Planos que dá para assinar sozinho; Clínica é conversa, não botão. */
export const ASSINAVEIS: readonly IdPlano[] = ['solo', 'pro']

export function podeAssinar(plano: IdPlano): boolean {
  return ASSINAVEIS.includes(plano)
}

/** O que a tela de volta do pagamento mostra (CA-166 a CA-169), para os links antigos. */
export type RespostaDaVolta = 'ativa' | 'analise' | 'nao-concluido'

export function respostaDaVolta(assinatura: Assinatura): RespostaDaVolta {
  if (assinatura.status === 'ativa') return 'ativa'
  if (assinatura.status === 'pendente') return 'analise'
  return 'nao-concluido'
}
```

- [ ] **Step 4: Implementar os textos**

Crie `src/domain/assinaturaTextos.ts`:

```ts
// Os textos da assinatura paga no checkout e em Conta e plano (spec checkout-proprio).
// As duas contas de data vêm do mesmo arquivo que as funções do servidor usam, para a
// tela dizer a mesma data que a função grava (decisão 13 do plano).
import { fimDoPeriodoPago, previsaoDaProximaCobranca } from '../../supabase/functions/_shared/cobranca.ts'
import { canceladaNoPrazo, RECADO_STATUS, type Assinatura } from './assinatura.ts'
import { planoPorId, type Ciclo, type IdPlano } from './conta.ts'
import { formatarDataLonga } from './pedidoEstudante.ts'

const REAIS = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const DIA = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', timeZone: 'America/Sao_Paulo' })
const DIA_E_MES = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })

/** 34.9 → "R$ 34,90". */
export const emReais = (valor: number): string => `R$ ${REAIS.format(valor)}`

/** "Solo, mensal". Sem ciclo (assinatura de antes do 007), só o nome. */
export function nomeComCiclo(plano: IdPlano, ciclo: Ciclo | null): string {
  const nome = planoPorId(plano)?.nome ?? 'Free'
  return ciclo ? `${nome}, ${ciclo}` : nome
}

/** O recado embaixo de "Seu plano". A cancelada no prazo tem o seu (CA-378). */
export function recadoDaAssinatura(a: Assinatura): string {
  return canceladaNoPrazo(a) ? 'A assinatura foi cancelada e não cobra mais. O plano pago vale até o fim do período já pago.' : RECADO_STATUS[a.status]
}

/** CA-376: "Mastercard final 6351". Sem o cartão gravado (antes do 008), nulo. */
export function linhaDoCartao(a: Assinatura): string | null {
  return a.cartaoFinal ? `${a.cartaoBandeira ?? 'Cartão'} final ${a.cartaoFinal}` : null
}

/** CA-376 e CA-378: a próxima cobrança da ativa, ou até quando vale a cancelada. */
export function linhaDaCobranca(a: Assinatura): string | null {
  if (canceladaNoPrazo(a) && a.expiraEm) return `Cancelada, vale até ${formatarDataLonga(a.expiraEm)}`
  if (a.status !== 'ativa' || !a.proximaCobranca) return null
  const valor = a.valorCentavos > 0 ? `, ${emReais(a.valorCentavos / 100)}` : ''
  return `Próxima cobrança em ${formatarDataLonga(a.proximaCobranca)}${valor}`
}

/** CA-377: a data, por extenso, até quando o plano vale se cancelar agora. Nula sem a próxima cobrança gravada. */
export function valeAteSeCancelar(a: Assinatura): string | null {
  const fim = a.proximaCobranca ? fimDoPeriodoPago(a.proximaCobranca) : null
  return fim ? formatarDataLonga(fim) : null
}

/** CA-366: a próxima cobrança, antes de assinar; o servidor confirma depois. */
export const proximaCobrancaPrevista = (ciclo: Ciclo, agora: Date): string => previsaoDaProximaCobranca(agora, ciclo)

/** Embaixo do total, no cartão do resumo: "Depois, R$ 34,90 todo dia 2. Cancele quando quiser." */
export function depoisDeHoje(valor: number, ciclo: Ciclo, proximaCobranca: string): string {
  const data = new Date(proximaCobranca)
  const quando = ciclo === 'anual' ? `todo ano, em ${DIA_E_MES.format(data)}` : `todo dia ${DIA.format(data)}`
  return `Depois, ${emReais(valor)} ${quando}. Cancele quando quiser.`
}

/** CA-372: a frase da assinatura ativa. */
export function fraseDaAssinaturaAtiva(plano: IdPlano, ciclo: Ciclo, email: string, proximaCobranca: string): string {
  return `Plano ${nomeComCiclo(plano, ciclo)}. O recibo vai para ${email} e a próxima cobrança é em ${formatarDataLonga(proximaCobranca)}.`
}
```

- [ ] **Step 5: Os literais de `Assinatura` nos outros testes**

O tipo ganhou cinco campos obrigatórios, e os testes que montam `Assinatura` à mão param de compilar. Troque:

`src/AppConta.test.tsx`, linha 15:

```ts
    assinatura: { plano: 'free', planoPedido: 'free', status: 'sem-assinatura', precoTravado: false, expiraEm: null, ciclo: null, valorCentavos: 0, cartaoBandeira: null, cartaoFinal: null, proximaCobranca: null },
```

`src/domain/pedidoEstudante.test.ts`, linha 30 (o `SEM_ASSINATURA` já é importado ali):

```ts
const estudanteAtiva: Assinatura = { ...SEM_ASSINATURA, plano: 'estudante', planoPedido: 'estudante', status: 'ativa', expiraEm: '2027-07-31T23:59:59Z' }
```

`src/ui/conta/TelaConta.test.tsx`: na linha 3, troque o import por

```ts
import { SEM_ASSINATURA, type Assinatura } from '@/domain/assinatura.ts'
```

na linha 10 (dentro do `vi.hoisted`, que não enxerga imports),

```ts
  assinatura: { plano: 'free', planoPedido: 'free', status: 'sem-assinatura', precoTravado: false, expiraEm: null, ciclo: null, valorCentavos: 0, cartaoBandeira: null, cartaoFinal: null, proximaCobranca: null } as Assinatura,
```

na linha 58,

```ts
    estado.assinatura = SEM_ASSINATURA
```

e na linha 133,

```ts
    estado.assinatura = { ...SEM_ASSINATURA, plano: 'estudante', planoPedido: 'estudante', status: 'ativa', expiraEm: '2027-07-31T23:59:59Z' }
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run src/domain/assinatura.test.ts src/domain/assinaturaTextos.test.ts src/domain/pedidoEstudante.test.ts src/ui/conta/TelaConta.test.tsx src/AppConta.test.tsx` → PASS. Depois `npm run check` → verde.

- [ ] **Step 7: Commit**

```bash
git add src/domain/assinatura.ts src/domain/assinatura.test.ts src/domain/assinaturaTextos.ts src/domain/assinaturaTextos.test.ts src/AppConta.test.tsx src/domain/pedidoEstudante.test.ts src/ui/conta/TelaConta.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(assinatura): cancelada vale até o fim do período pago, e o cartão na assinatura`

---

### Tarefa 5: Domínio: o formulário do cartão (`cartao.ts`)

Cobre a regra de CA-369, CA-370, CA-373, CA-374, CB-88, CB-89 e CB-90.

**Files:**
- Create: `src/domain/cartao.ts`
- Create: `src/domain/cartao.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces:

```ts
export interface DadosDoCartao { readonly token: string; readonly bandeira: string; readonly final: string }
export type CampoSeguro = 'numero' | 'validade' | 'codigo'
export type CampoDoCartao = CampoSeguro | 'nome' | 'cpf'
export type EstadoDoCampo = 'vazio' | 'valido' | 'invalido'
export const ORDEM_DOS_CAMPOS: readonly CampoDoCartao[]
export const soDigitos: (texto: string) => string
export function mascararCpf(texto: string): string
export function cpfValido(texto: string): boolean
export const nomeValido: (texto: string) => boolean
export const MENSAGEM_DO_CAMPO: Readonly<Record<CampoDoCartao, { readonly vazio: string; readonly invalido: string }>>
export function errosDoCartao(entrada: { readonly seguros: Readonly<Record<CampoSeguro, EstadoDoCampo>>; readonly nome: string; readonly cpf: string }): Partial<Record<CampoDoCartao, string>>
export const ehCredito: (tipo: string | null) => boolean
// frases fixas (string): USE_CREDITO, CAMPOS_NAO_CARREGARAM, PAGAMENTO_INDISPONIVEL, SERVIDOR_FORA, RECUSA_PADRAO,
// CONFIRA_O_CARTAO, FALHA_DESCONHECIDA, DIGITE_O_CODIGO_DE_NOVO, ACEITE_FALTANDO
export function mensagemDaRecusa(codigo: string | null | undefined): string
export function campoDoErroDoToken(codigos: readonly string[]): CampoDoCartao | null
```

- [ ] **Step 1: Escrever os testes que falham**

Crie `src/domain/cartao.test.ts`:

```ts
import {
  ACEITE_FALTANDO,
  campoDoErroDoToken,
  CAMPOS_NAO_CARREGARAM,
  CONFIRA_O_CARTAO,
  cpfValido,
  ehCredito,
  errosDoCartao,
  FALHA_DESCONHECIDA,
  mascararCpf,
  mensagemDaRecusa,
  nomeValido,
  PAGAMENTO_INDISPONIVEL,
  RECUSA_PADRAO,
  SERVIDOR_FORA,
  USE_CREDITO,
} from './cartao.ts'

describe('CPF do titular (CA-370)', () => {
  it.each(['123.456.789-09', '12345678909', '529.982.247-25'])('%s é válido', (cpf) => {
    expect(cpfValido(cpf)).toBe(true)
  })

  it.each(['123.456.789-00', '111.111.111-11', '1234567890', '', '123.456.789-0a'])('"%s" não é válido', (cpf) => {
    expect(cpfValido(cpf)).toBe(false)
  })

  it('ganha pontos e traço enquanto digita, e para em 11 números', () => {
    expect(mascararCpf('123')).toBe('123')
    expect(mascararCpf('1234')).toBe('123.4')
    expect(mascararCpf('1234567')).toBe('123.456.7')
    expect(mascararCpf('1234567890')).toBe('123.456.789-0')
    expect(mascararCpf('12345678909')).toBe('123.456.789-09')
    expect(mascararCpf('123456789091234')).toBe('123.456.789-09')
    expect(mascararCpf('abc')).toBe('')
  })
})

describe('nome impresso no cartão', () => {
  it.each(['APRO', 'Ana P. Souza', "Ana D'Ávila", 'João-Pedro Lima'])('"%s" serve', (nome) => {
    expect(nomeValido(nome)).toBe(true)
  })

  it.each(['A', '', '   ', 'Ana 2', '.Ana'])('"%s" não serve', (nome) => {
    expect(nomeValido(nome)).toBe(false)
  })
})

describe('erros do formulário (CA-370)', () => {
  const VAZIOS = { numero: 'vazio', validade: 'vazio', codigo: 'vazio' } as const
  const VALIDOS = { numero: 'valido', validade: 'valido', codigo: 'valido' } as const

  it('tudo vazio: um erro por campo, na ordem da tela', () => {
    const erros = errosDoCartao({ seguros: VAZIOS, nome: '', cpf: '' })
    expect(erros).toEqual({
      numero: 'Digite o número do cartão.',
      validade: 'Digite a validade, como 11/30.',
      codigo: 'Digite o código de segurança.',
      nome: 'Digite o nome como está impresso no cartão.',
      cpf: 'Digite o CPF do titular do cartão.',
    })
    expect(Object.keys(erros)).toEqual(['numero', 'validade', 'codigo', 'nome', 'cpf'])
  })

  it('inválidos: os campos seguros recusados, nome com número e CPF com dígito errado', () => {
    expect(errosDoCartao({ seguros: { numero: 'invalido', validade: 'valido', codigo: 'invalido' }, nome: 'Ana 2', cpf: '123.456.789-00' })).toEqual({
      numero: 'Confira o número do cartão.',
      codigo: 'Confira o código de segurança.',
      nome: 'Use só letras no nome.',
      cpf: 'Confira o CPF: os dígitos não batem.',
    })
  })

  it('tudo certo: nenhum erro', () => {
    expect(errosDoCartao({ seguros: VALIDOS, nome: 'APRO', cpf: '123.456.789-09' })).toEqual({})
  })
})

describe('só cartão de crédito (CA-369, D-67)', () => {
  it('crédito passa; débito e pré-pago travam', () => {
    expect(ehCredito('credit_card')).toBe(true)
    expect(ehCredito('debit_card')).toBe(false)
    expect(ehCredito('prepaid_card')).toBe(false)
  })

  it('sem o tipo ainda (antes dos primeiros números, ou a operadora não disse), deixa seguir: o banco confere', () => {
    expect(ehCredito(null)).toBe(true)
  })

  it('CA-369, CA-370, CA-374, CB-88 e CB-89: as frases fixas da spec', () => {
    expect(USE_CREDITO).toBe('Use um cartão de crédito.')
    expect(CAMPOS_NAO_CARREGARAM).toBe('Não consegui abrir o formulário do cartão. Recarregue a página ou desative o bloqueador de anúncios para este site.')
    expect(PAGAMENTO_INDISPONIVEL).toBe('O pagamento não está disponível agora.')
    expect(SERVIDOR_FORA).toBe('Não consegui falar com o servidor de cobrança. Nada foi cobrado. Tente de novo em alguns minutos.')
    expect(ACEITE_FALTANDO).toBe('Marque a autorização da cobrança para assinar.')
  })
})

describe('o motivo da recusa em português (CA-373, CB-90)', () => {
  it('a recusa padrão é a frase da spec', () => {
    expect(RECUSA_PADRAO).toBe('O banco recusou este cartão. Confira os dados ou use outro cartão. Nada foi cobrado.')
    expect(mensagemDaRecusa('cc_rejected_other_reason')).toBe(RECUSA_PADRAO)
    expect(mensagemDaRecusa('recusado')).toBe(RECUSA_PADRAO)
  })

  it('cada motivo conhecido do banco tem a sua frase, e todas dizem que nada foi cobrado', () => {
    for (const codigo of [
      'cc_rejected_bad_filled_card_number',
      'cc_rejected_bad_filled_date',
      'cc_rejected_bad_filled_security_code',
      'cc_rejected_bad_filled_other',
      'cc_rejected_insufficient_amount',
      'cc_rejected_call_for_authorize',
      'cc_rejected_card_disabled',
      'cc_rejected_high_risk',
      'cc_rejected_blacklist',
      'cc_rejected_max_attempts',
    ]) {
      expect(mensagemDaRecusa(codigo), codigo).toMatch(/Nada foi cobrado\.$/)
    }
    expect(mensagemDaRecusa('cc_rejected_insufficient_amount')).toBe('O cartão não tem limite para esta cobrança. Use outro cartão. Nada foi cobrado.')
  })

  it('foco 3: código desconhecido ou vazio vira a recusa padrão', () => {
    expect(mensagemDaRecusa('cc_rejected_um_motivo_novo')).toBe(RECUSA_PADRAO)
    expect(mensagemDaRecusa(null)).toBe(RECUSA_PADRAO)
    expect(mensagemDaRecusa(undefined)).toBe(RECUSA_PADRAO)
  })

  it('CB-90: código do cartão vencido ou já usado pede para conferir o cartão de novo', () => {
    expect(mensagemDaRecusa('token-invalido')).toBe(CONFIRA_O_CARTAO)
    expect(CONFIRA_O_CARTAO).toBe('Confira os dados do cartão e tente de novo. Nada foi cobrado.')
  })

  it('falha que não é do cartão não culpa o banco', () => {
    expect(mensagemDaRecusa('falha')).toBe(FALHA_DESCONHECIDA)
    expect(FALHA_DESCONHECIDA).not.toContain('banco')
  })
})

describe('o erro do gerador do código do cartão aponta o campo (CA-370)', () => {
  it.each([
    [['205'], 'numero'],
    [['E301'], 'numero'],
    [['208'], 'validade'],
    [['326'], 'validade'],
    [['E302'], 'codigo'],
    [['224'], 'codigo'],
    [['221'], 'nome'],
    [['324'], 'cpf'],
    [['324', '205'], 'numero'],
    [['999'], null],
    [[], null],
  ] as const)('%j → %s', (codigos, campo) => {
    expect(campoDoErroDoToken(codigos)).toBe(campo)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/cartao.test.ts`
Expected: FAIL — `cartao.ts` não existe.

- [ ] **Step 3: Implementar**

Crie `src/domain/cartao.ts`:

```ts
// O formulário do cartão (spec checkout-proprio): o que é nosso de conferir (nome e CPF),
// as mensagens de cada campo e o que dizer quando o banco recusa. O número, a validade e
// o código são conferidos pelos campos seguros da operadora; aqui só chegam as respostas
// ("vazio", "válido", "inválido") e os códigos de erro.

/** O que a operadora devolve no lugar do cartão (D-66), mais o que a tela mostra (D-70). */
export interface DadosDoCartao {
  /** O código de uso único: vale para um envio só (CB-90). */
  readonly token: string
  readonly bandeira: string
  /** Os 4 últimos números. */
  readonly final: string
}

export type CampoSeguro = 'numero' | 'validade' | 'codigo'
export type CampoDoCartao = CampoSeguro | 'nome' | 'cpf'
export type EstadoDoCampo = 'vazio' | 'valido' | 'invalido'

/** A ordem da tela: o foco vai para o primeiro com erro (CA-370). */
export const ORDEM_DOS_CAMPOS: readonly CampoDoCartao[] = ['numero', 'validade', 'codigo', 'nome', 'cpf']

export const soDigitos = (texto: string): string => texto.replace(/\D/g, '')

/** "12345678909" → "123.456.789-09", enquanto digita. Para em 11 números. */
export function mascararCpf(texto: string): string {
  return soDigitos(texto)
    .slice(0, 11)
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

/** Os dois dígitos verificadores do CPF. Onze números iguais não valem. */
export function cpfValido(texto: string): boolean {
  const d = soDigitos(texto)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const digito = (quantos: number): number => {
    let soma = 0
    for (let i = 0; i < quantos; i += 1) soma += Number(d[i]) * (quantos + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(9) === Number(d[9]) && digito(10) === Number(d[10])
}

const NOME = /^\p{L}[\p{L} .'-]*$/u

/** Como está impresso: só letras, espaço, ponto, apóstrofo e hífen. "APRO" (do cartão de teste) serve. */
export const nomeValido = (texto: string): boolean => {
  const limpo = texto.trim()
  return limpo.length >= 2 && NOME.test(limpo)
}

export const MENSAGEM_DO_CAMPO: Readonly<Record<CampoDoCartao, { readonly vazio: string; readonly invalido: string }>> = {
  numero: { vazio: 'Digite o número do cartão.', invalido: 'Confira o número do cartão.' },
  validade: { vazio: 'Digite a validade, como 11/30.', invalido: 'Confira a validade do cartão.' },
  codigo: { vazio: 'Digite o código de segurança.', invalido: 'Confira o código de segurança.' },
  nome: { vazio: 'Digite o nome como está impresso no cartão.', invalido: 'Use só letras no nome.' },
  cpf: { vazio: 'Digite o CPF do titular do cartão.', invalido: 'Confira o CPF: os dígitos não batem.' },
}

/** CA-370: o erro de cada campo, na ordem da tela; só os que têm erro. */
export function errosDoCartao(entrada: {
  readonly seguros: Readonly<Record<CampoSeguro, EstadoDoCampo>>
  readonly nome: string
  readonly cpf: string
}): Partial<Record<CampoDoCartao, string>> {
  const erros: Partial<Record<CampoDoCartao, string>> = {}
  for (const campo of ['numero', 'validade', 'codigo'] as const) {
    const estado = entrada.seguros[campo]
    if (estado !== 'valido') erros[campo] = MENSAGEM_DO_CAMPO[campo][estado]
  }
  if (!entrada.nome.trim()) erros.nome = MENSAGEM_DO_CAMPO.nome.vazio
  else if (!nomeValido(entrada.nome)) erros.nome = MENSAGEM_DO_CAMPO.nome.invalido
  if (!soDigitos(entrada.cpf)) erros.cpf = MENSAGEM_DO_CAMPO.cpf.vazio
  else if (!cpfValido(entrada.cpf)) erros.cpf = MENSAGEM_DO_CAMPO.cpf.invalido
  return erros
}

/** CA-369 e D-67: débito, pré-pago ou outro tipo trava o envio. Sem tipo conhecido, deixa seguir: o banco confere. */
export const ehCredito = (tipo: string | null): boolean => tipo === null || tipo === 'credit_card'

export const USE_CREDITO = 'Use um cartão de crédito.'
/** CB-88. */
export const CAMPOS_NAO_CARREGARAM = 'Não consegui abrir o formulário do cartão. Recarregue a página ou desative o bloqueador de anúncios para este site.'
/** CB-89. */
export const PAGAMENTO_INDISPONIVEL = 'O pagamento não está disponível agora.'
/** CA-374. */
export const SERVIDOR_FORA = 'Não consegui falar com o servidor de cobrança. Nada foi cobrado. Tente de novo em alguns minutos.'
/** CA-373. */
export const RECUSA_PADRAO = 'O banco recusou este cartão. Confira os dados ou use outro cartão. Nada foi cobrado.'
/** CB-90 e erro do gerador do código do cartão. */
export const CONFIRA_O_CARTAO = 'Confira os dados do cartão e tente de novo. Nada foi cobrado.'
/** Erro que não é do cartão (configuração, conta de teste): não culpa o banco. */
export const FALHA_DESCONHECIDA = 'Não consegui concluir a assinatura agora. Nada foi cobrado. Tente de novo em alguns minutos.'
/** CA-373: depois da recusa, o código de segurança é apagado. */
export const DIGITE_O_CODIGO_DE_NOVO = 'Digite o código de novo.'
/** CA-370. */
export const ACEITE_FALTANDO = 'Marque a autorização da cobrança para assinar.'

const RECUSAS: Readonly<Record<string, string>> = {
  cc_rejected_bad_filled_card_number: 'O banco não reconheceu o número do cartão. Confira e tente de novo. Nada foi cobrado.',
  cc_rejected_bad_filled_date: 'O banco não aceitou a validade. Confira e tente de novo. Nada foi cobrado.',
  cc_rejected_bad_filled_security_code: 'O banco não aceitou o código de segurança. Confira e tente de novo. Nada foi cobrado.',
  cc_rejected_bad_filled_other: CONFIRA_O_CARTAO,
  cc_rejected_insufficient_amount: 'O cartão não tem limite para esta cobrança. Use outro cartão. Nada foi cobrado.',
  cc_rejected_call_for_authorize: 'O banco pediu para você autorizar esta cobrança. Ligue para o banco do cartão e tente de novo. Nada foi cobrado.',
  cc_rejected_card_disabled: 'Este cartão está bloqueado. Ligue para o banco ou use outro cartão. Nada foi cobrado.',
  cc_rejected_duplicated_payment: 'Já existe uma cobrança igual de poucos minutos atrás. Confira em Conta e plano antes de tentar de novo.',
  cc_rejected_high_risk: 'O pagamento foi recusado por segurança. Use outro cartão. Nada foi cobrado.',
  cc_rejected_blacklist: 'O pagamento foi recusado por segurança. Use outro cartão. Nada foi cobrado.',
  cc_rejected_max_attempts: 'Muitas tentativas com este cartão. Use outro cartão ou tente amanhã. Nada foi cobrado.',
  cc_rejected_other_reason: RECUSA_PADRAO,
  'token-invalido': CONFIRA_O_CARTAO,
  recusado: RECUSA_PADRAO,
  falha: FALHA_DESCONHECIDA,
}

/** CA-373 e CB-90: o motivo em português, pelo código que a função devolveu. Código desconhecido vira a recusa padrão. */
export function mensagemDaRecusa(codigo: string | null | undefined): string {
  return (codigo ? RECUSAS[codigo] : undefined) ?? RECUSA_PADRAO
}

/**
 * Os códigos de erro do gerador do código do cartão → o campo com problema. São os da
 * documentação de tokenização da operadora; a pesquisa de 02/10/2026 não confirmou se o
 * SDK v2 devolve os mesmos. Código que não está aqui vira erro geral (foco 3).
 */
const CAMPO_DO_CODIGO: Readonly<Record<string, CampoDoCartao>> = {
  '205': 'numero',
  E301: 'numero',
  '208': 'validade',
  '209': 'validade',
  '325': 'validade',
  '326': 'validade',
  '224': 'codigo',
  E302: 'codigo',
  E203: 'codigo',
  '221': 'nome',
  '316': 'nome',
  '212': 'cpf',
  '213': 'cpf',
  '214': 'cpf',
  '322': 'cpf',
  '323': 'cpf',
  '324': 'cpf',
}

/** O primeiro campo, na ordem da tela, que algum dos códigos aponta. */
export function campoDoErroDoToken(codigos: readonly string[]): CampoDoCartao | null {
  const campos = new Set(codigos.map((codigo) => CAMPO_DO_CODIGO[codigo]).filter((campo): campo is CampoDoCartao => campo !== undefined))
  return ORDEM_DOS_CAMPOS.find((campo) => campos.has(campo)) ?? null
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/domain/cartao.test.ts` → PASS. Depois `npm run check` → verde.

- [ ] **Step 5: Commit**

```bash
git add src/domain/cartao.ts src/domain/cartao.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(cartao): CPF, nome, mensagens e recusas do formulário do cartão`

---

### Tarefa 6: Biblioteca: `IconeMarca`, `PontosDaMarca` e o X da marca no `Dialog`

Cobre D-73 e a peça de biblioteca de CA-383.

**Files:**
- Create: `design-system/componentes/display/IconeMarca.tsx`
- Create: `design-system/componentes/display/PontosDaMarca.tsx`
- Create: `design-system/componentes/display/IconeMarca.test.tsx`
- Modify: `design-system/componentes/overlay/dialog.tsx` (o `DialogContent`)
- Modify: `design-system/componentes/display/Icon.tsx` (comentário do topo)
- Modify: `design-system/index.ts`, `design-system/componentes/LEIA-ME.md`, `design-system/vitrine/TelaDesignSystem.tsx`
- Modify: `e2e/design-system.spec.ts` (lista `SECOES`)

**Interfaces:**
- Consumes: `cn` de `@ds/lib/cn.ts`; as cores do tema `fill-laranja`/`bg-laranja` (`--color-laranja`, já no `@theme` de `globals.css`).
- Produces:

```ts
export type NomeIconeMarca = 'cadeado' | 'cartao' | 'calendario' | 'check' | 'alerta' | 'fechar' | 'recibo' | 'seta' | 'estrela'
export const NOMES_ICONE_MARCA: readonly NomeIconeMarca[]
export function IconeMarca(props: { nome: NomeIconeMarca; titulo?: string | undefined; destaque?: boolean | undefined; className?: string | undefined }): JSX.Element
// <svg viewBox="0 0 24 24" data-icone={nome}>, size-5 por padrão, aria-hidden sem título
export function PontosDaMarca(props: { pulsando?: boolean | undefined; className?: string | undefined }): JSX.Element
// <span aria-hidden data-pontos-da-marca> com 4 pontos; o último bg-laranja
// DialogContent ganha: readonly iconeFechar?: React.ReactNode   (sem ele, o X do Lucide de sempre)
```

Toda tela das Tarefas 9 a 11 confere CA-383 com `document.querySelectorAll('svg:not([data-icone])')`: o `data-icone` é o que marca um ícone da marca. A `Logo` é `<img>` e não entra na conta.

- [ ] **Step 1: Escrever os testes que falham**

Crie `design-system/componentes/display/IconeMarca.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { IconeMarca, NOMES_ICONE_MARCA } from '@ds/componentes/display/IconeMarca.tsx'
import { PontosDaMarca } from '@ds/componentes/display/PontosDaMarca.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

describe('IconeMarca (spec checkout-proprio, D-73)', () => {
  it('desenha os nove ícones no traço da marca, decorativos, na cor do texto e sem cor escrita', () => {
    const { container } = render(
      <>
        {NOMES_ICONE_MARCA.map((nome) => (
          <IconeMarca key={nome} nome={nome} />
        ))}
      </>,
    )
    const svgs = [...container.querySelectorAll('svg')]
    expect(svgs.map((svg) => svg.getAttribute('data-icone'))).toEqual(['cadeado', 'cartao', 'calendario', 'check', 'alerta', 'fechar', 'recibo', 'seta', 'estrela'])
    for (const svg of svgs) {
      expect(svg).toHaveAttribute('aria-hidden', 'true')
      expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
      expect(svg).toHaveClass('size-5')
      expect(svg.innerHTML).not.toMatch(/#[0-9a-f]{3,8}/i)
    }
  })

  it('com título, vira imagem com nome para o leitor de tela', () => {
    render(<IconeMarca nome="cadeado" titulo="Pagamento protegido" />)
    expect(screen.getByRole('img', { name: 'Pagamento protegido' })).toBeInTheDocument()
  })

  it('destaque pinta o ponto principal de laranja, como a última bolinha da logo', () => {
    const { container } = render(<IconeMarca nome="check" destaque />)
    expect(container.querySelectorAll('circle.fill-laranja')).toHaveLength(1)
  })

  it('sem destaque, nada de laranja', () => {
    const { container } = render(<IconeMarca nome="check" />)
    expect(container.querySelectorAll('.fill-laranja')).toHaveLength(0)
  })

  it('o tamanho e a cor vêm da classe', () => {
    const { container } = render(<IconeMarca nome="seta" className="size-4 text-muted-foreground" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('size-4', 'text-muted-foreground')
    expect(svg).not.toHaveClass('size-5')
  })
})

describe('PontosDaMarca', () => {
  it('quatro pontos do menor ao maior, o último laranja, escondidos do leitor de tela', () => {
    const { container } = render(<PontosDaMarca />)
    const grupo = container.querySelector('[data-pontos-da-marca]')
    expect(grupo).toHaveAttribute('aria-hidden', 'true')
    const pontos = [...(grupo?.children ?? [])]
    expect(pontos.map((p) => p.className.match(/size-[\d.]+/)?.[0])).toEqual(['size-1', 'size-1.5', 'size-2', 'size-2.5'])
    expect(pontos.at(-1)).toHaveClass('bg-laranja')
    expect(pontos.some((p) => p.className.includes('animate-pulse'))).toBe(false)
  })

  it('pulsando, os pontos pulsam só com movimento liberado', () => {
    const { container } = render(<PontosDaMarca pulsando />)
    for (const ponto of container.querySelectorAll('[data-pontos-da-marca] > span')) expect(ponto).toHaveClass('motion-safe:animate-pulse')
  })
})

describe('Dialog com o X da marca', () => {
  it('CA-383: iconeFechar troca o X da biblioteca, e o botão continua "Fechar"', () => {
    render(
      <Dialog open>
        <DialogContent iconeFechar={<IconeMarca nome="fechar" />}>
          <DialogTitle>Teste</DialogTitle>
          <DialogDescription>Só o botão de fechar importa aqui.</DialogDescription>
        </DialogContent>
      </Dialog>,
    )
    const fechar = screen.getByRole('button', { name: 'Fechar' })
    expect(fechar.querySelector('svg[data-icone="fechar"]')).not.toBeNull()
    expect(fechar.querySelectorAll('svg:not([data-icone])')).toHaveLength(0)
  })

  it('sem iconeFechar, o X de sempre continua lá', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Teste</DialogTitle>
          <DialogDescription>Nada muda para os outros diálogos.</DialogDescription>
        </DialogContent>
      </Dialog>,
    )
    expect(screen.getByRole('button', { name: 'Fechar' }).querySelector('svg')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run design-system/componentes/display/IconeMarca.test.tsx`
Expected: FAIL — os dois componentes não existem.

- [ ] **Step 3: Implementar o `IconeMarca`**

Crie `design-system/componentes/display/IconeMarca.tsx`:

```tsx
import type { ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Os ícones da marca (spec checkout-proprio, D-73): o traço arredondado de 1,8 e um ponto,
 * como a linha com pontos da logo. Desenhados no protótipo "Checkout MetaNutri" v2. Servem
 * ao checkout, a Conta e plano e à volta do pagamento, onde ícone de biblioteca não entra
 * (CA-383); o resto do app continua no Lucide, pelo `Icon`.
 *
 * A cor é a do texto (`currentColor`). `destaque` pinta o ponto principal de laranja, como
 * a última bolinha da logo: é grafismo, nunca texto. O tamanho vem da classe (`size-5`
 * por padrão). Sem `titulo`, o ícone é decorativo e fica escondido do leitor de tela.
 * O `data-icone` marca o ícone como da marca: os testes de tela contam os que não têm.
 */
export type NomeIconeMarca = 'cadeado' | 'cartao' | 'calendario' | 'check' | 'alerta' | 'fechar' | 'recibo' | 'seta' | 'estrela'

export const NOMES_ICONE_MARCA: readonly NomeIconeMarca[] = ['cadeado', 'cartao', 'calendario', 'check', 'alerta', 'fechar', 'recibo', 'seta', 'estrela']

const TRACO = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** O desenho de cada ícone. `ponto` é a classe do ponto principal, o que fica laranja no destaque. */
function desenho(nome: NomeIconeMarca, ponto: string): ReactNode {
  switch (nome) {
    case 'cadeado':
      return (
        <>
          <g {...TRACO}>
            <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
          </g>
          <circle cx="12" cy="15.5" r="1.7" className={ponto} />
        </>
      )
    case 'cartao':
      return (
        <>
          <g {...TRACO}>
            <rect x="3" y="5.5" width="18" height="13" rx="3" />
            <path d="M3 10h18" />
          </g>
          <circle cx="7.5" cy="14.8" r="1.4" className={ponto} />
          <circle cx="11" cy="14.8" r="1" className="fill-current" opacity={0.55} />
        </>
      )
    case 'calendario':
      return (
        <>
          <g {...TRACO}>
            <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
            <path d="M8 3v4M16 3v4M3.5 10h17" />
          </g>
          <circle cx="15.5" cy="15" r="1.8" className={ponto} />
        </>
      )
    case 'check':
      return (
        <>
          <path d="M4 12.5l5 5L20 6.5" {...TRACO} opacity={0.5} />
          <circle cx="4" cy="12.5" r="1.4" className="fill-current" opacity={0.55} />
          <circle cx="9" cy="17.5" r="1.8" className="fill-current" opacity={0.8} />
          <circle cx="20" cy="6.5" r="2.4" className={ponto} />
        </>
      )
    case 'alerta':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" {...TRACO} />
          <path d="M12 7.5v5" {...TRACO} />
          <circle cx="12" cy="16.2" r="1.4" className={ponto} />
        </>
      )
    case 'fechar':
      return <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...TRACO} />
    case 'recibo':
      return (
        <>
          <g {...TRACO}>
            <rect x="3" y="5.5" width="18" height="13" rx="3" />
            <path d="M3.5 7l8.5 6 8.5-6" />
          </g>
          <circle cx="18.5" cy="16" r="1.5" className={ponto} />
        </>
      )
    case 'seta':
      return (
        <>
          <path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" {...TRACO} />
          <circle cx="5" cy="12" r="1.6" className={ponto} />
        </>
      )
    case 'estrela':
      return (
        <>
          <circle cx="6" cy="16" r="1.6" className="fill-current" opacity={0.5} />
          <circle cx="11" cy="12" r="2.2" className="fill-current" opacity={0.75} />
          <circle cx="17.5" cy="7" r="3.2" className={ponto} />
        </>
      )
  }
}

interface IconeMarcaProps {
  readonly nome: NomeIconeMarca
  /** Nome para o leitor de tela. Sem ele, o ícone é decorativo. */
  readonly titulo?: string | undefined
  /** Pinta o ponto principal de laranja, como a logo. */
  readonly destaque?: boolean | undefined
  /** Tamanho e cor: `size-4`, `text-muted-foreground`. */
  readonly className?: string | undefined
}

export function IconeMarca({ nome, titulo, destaque = false, className }: IconeMarcaProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      data-icone={nome}
      focusable="false"
      aria-hidden={titulo ? undefined : true}
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      className={cn('size-5 shrink-0', className)}
    >
      {desenho(nome, destaque ? 'fill-laranja' : 'fill-current')}
    </svg>
  )
}
```

- [ ] **Step 4: Implementar os `PontosDaMarca`**

Crie `design-system/componentes/display/PontosDaMarca.tsx`:

```tsx
import { cn } from '@ds/lib/cn.ts'

/*
 * Os quatro pontos da logo, do menor ao maior; o último é laranja, a meta cumprida
 * (spec checkout-proprio, D-73). Com `pulsando`, dizem "esperando" no lugar da roda do
 * Button, que é ícone de biblioteca (CA-383): o botão fica `disabled` e `aria-busy`, com
 * os pontos dentro. Pulsam só com movimento liberado (`motion-safe`), e o
 * prefers-reduced-motion do app ainda zera a duração de toda animação.
 */
const PONTOS = [
  { tamanho: 'size-1', cor: 'bg-current opacity-45', atraso: '' },
  { tamanho: 'size-1.5', cor: 'bg-current opacity-70', atraso: '[animation-delay:150ms]' },
  { tamanho: 'size-2', cor: 'bg-current', atraso: '[animation-delay:300ms]' },
  { tamanho: 'size-2.5', cor: 'bg-laranja', atraso: '[animation-delay:450ms]' },
] as const

interface PontosDaMarcaProps {
  readonly pulsando?: boolean | undefined
  readonly className?: string | undefined
}

export function PontosDaMarca({ pulsando = false, className }: PontosDaMarcaProps) {
  return (
    <span aria-hidden="true" data-pontos-da-marca="" className={cn('inline-flex shrink-0 items-center gap-1', className)}>
      {PONTOS.map((ponto) => (
        <span key={ponto.tamanho} className={cn('block rounded-full', ponto.tamanho, ponto.cor, pulsando && 'motion-safe:animate-pulse', pulsando && ponto.atraso)} />
      ))}
    </span>
  )
}
```

- [ ] **Step 5: O X da marca no `Dialog`**

Em `design-system/componentes/overlay/dialog.tsx`, troque o `DialogContent` inteiro por:

```tsx
export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    /** O desenho do botão de fechar. Sem ele, o X do Lucide; nas telas da spec checkout-proprio, o da marca (CA-383). */
    readonly iconeFechar?: React.ReactNode
  }
>(({ className, children, iconeFechar, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // overscroll-contain: rolar até o fim do diálogo não arrasta a página de trás junto.
        'fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overscroll-contain rounded-xl border border-border bg-card p-6 text-card-foreground shadow-pop',
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-xs print:hidden p-1 text-muted-foreground hover:bg-lightprimary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {iconeFechar ?? <X className="size-5" aria-hidden="true" />}
        <span className="sr-only">Fechar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
```

- [ ] **Step 6: Biblioteca, LEIA-ME, vitrine e o comentário do `Icon`**

`design-system/index.ts`: troque ` * Os 30 componentes do sistema, na taxonomia do design system:` por ` * Os 32 componentes do sistema, na taxonomia do design system:`; acrescente ` · IconeMarca · PontosDaMarca` ao fim da linha ` *   display     Card · Badge · …`; e, depois da linha do `AnelProgresso`:

```ts
export { IconeMarca, NOMES_ICONE_MARCA, type NomeIconeMarca } from './componentes/display/IconeMarca.tsx'
export { PontosDaMarca } from './componentes/display/PontosDaMarca.tsx'
```

`design-system/componentes/display/Icon.tsx`, primeira linha do comentário do topo: troque ` * Ícone do sistema. Lucide é o único conjunto; o que este componente acrescenta` por ` * Ícone do sistema, no Lucide (o checkout e Conta e plano usam o IconeMarca); o que este componente acrescenta`.

`design-system/componentes/LEIA-ME.md`: na seção `### Icon`, troque a frase `Lucide é o único conjunto.` por:

```markdown
Lucide é o conjunto do app; o checkout, Conta e plano e a volta do pagamento usam o `IconeMarca`.
```

E, depois da última linha da seção `### GraficoBarras` (a que fala do `extra` do `CartaoNumero`), acrescente:

````markdown
### IconeMarca
Os ícones da marca, no traço da logo: linha arredondada de 1,8 e um ponto. Só no checkout, em
Conta e plano e na volta do pagamento, onde ícone de biblioteca não entra (spec checkout-proprio,
D-73 e CA-383); o resto do app continua no `Icon` (Lucide). A cor é a do texto; `destaque`
pinta o ponto principal de laranja, como a última bolinha da logo (grafismo, nunca texto). Sem
`titulo`, é decorativo e fica escondido do leitor de tela. *Nasceu no checkout próprio.*

```tsx
<IconeMarca nome="cadeado" className="size-4" />
<IconeMarca nome="check" destaque />
<IconeMarca nome="alerta" titulo="Atenção" />
```

Nomes: `cadeado` · `cartao` · `calendario` · `check` · `alerta` · `fechar` · `recibo` · `seta` · `estrela`.
O `DialogContent` aceita `iconeFechar={<IconeMarca nome="fechar" />}` no lugar do X do Lucide.

### PontosDaMarca
Os quatro pontos da logo, do menor ao maior, o último laranja. Com `pulsando`, dizem "esperando"
no lugar da roda do `Button` (que é do Lucide): o botão fica `disabled` e `aria-busy`, com os
pontos dentro. Só pulsam com movimento liberado.

```tsx
<Button disabled aria-busy>
  <PontosDaMarca pulsando />
  Confirmando com o banco…
</Button>
```
````

`design-system/vitrine/TelaDesignSystem.tsx`: junto dos imports de `display/`,

```tsx
import { IconeMarca, NOMES_ICONE_MARCA } from '@ds/componentes/display/IconeMarca.tsx'
import { PontosDaMarca } from '@ds/componentes/display/PontosDaMarca.tsx'
```

e, logo depois do `</Secao>` do `GraficoBarras`:

```tsx
        <Secao nome="IconeMarca · PontosDaMarca" arquivo="display/" descricao="Traço arredondado e um ponto, como a logo; só no checkout, em Conta e plano e na volta do pagamento">
          <Linha estado="Os nove ícones">
            {NOMES_ICONE_MARCA.map((nome) => (
              <span key={nome} className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
                <IconeMarca nome={nome} className="size-7 text-heading" />
                {nome}
              </span>
            ))}
          </Linha>
          <Linha estado="Ponto em destaque">
            <IconeMarca nome="check" destaque className="size-7 text-heading" />
            <IconeMarca nome="seta" destaque className="size-7 text-heading" />
            <IconeMarca nome="cadeado" destaque className="size-7 text-heading" />
          </Linha>
          <Linha estado="Pontos da marca: parados e pulsando">
            <PontosDaMarca className="text-heading" />
            <PontosDaMarca pulsando className="text-heading" />
          </Linha>
        </Secao>
```

`e2e/design-system.spec.ts`: na lista `SECOES`, depois de `'Recolhivel',`, acrescente `'IconeMarca · PontosDaMarca',`.

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run design-system/componentes/display/IconeMarca.test.tsx design-system/componentes/componentes.test.tsx` → PASS. Depois `npm run check` → verde e `npx playwright test` → verde (o e2e do design system abre a vitrine e procura a seção nova).

- [ ] **Step 8: Commit**

```bash
git add design-system/componentes/display/IconeMarca.tsx design-system/componentes/display/PontosDaMarca.tsx design-system/componentes/display/IconeMarca.test.tsx design-system/componentes/overlay/dialog.tsx design-system/componentes/display/Icon.tsx design-system/index.ts design-system/componentes/LEIA-ME.md design-system/vitrine/TelaDesignSystem.tsx e2e/design-system.spec.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(ds): ícones e pontos da marca, e o X da marca no diálogo`

---

### Tarefa 7: Pagamento: o adaptador dos campos seguros e a chave pública

Cobre D-66, D-72, R-34, R-35 e a parte do navegador de CA-368, CA-369, CB-88, CB-89 e CB-90.

**Files:**
- Create: `src/ui/pagamento/processadorCartao.ts`
- Create: `src/ui/pagamento/processadorCartao.test.ts`
- Create: `src/ui/pagamento/processadorMercadoPago.ts`
- Create: `src/ui/pagamento/processadorMercadoPago.test.ts`
- Modify: `.env.example` (fim do arquivo)
- Modify: `.github/workflows/publicar.yml` (o `env` do passo `npm run build`)
- Modify: `src/data/sqlCheckout.test.ts`
- Modify: `README.md` ("Projeto novo", passo 2; "Projeto já ligado", passo 7 novo)

**Interfaces:**
- Consumes: `CampoSeguro`, `DadosDoCartao` de `src/domain/cartao.ts` (Tarefa 5).
- Produces (`src/ui/pagamento/processadorCartao.ts`, a fronteira que o formulário usa):

```ts
export type EstiloDosCampos = Readonly<Record<string, string>>
export interface MontagemDosCampos { readonly alvos: Readonly<Record<CampoSeguro, string>>; readonly estilo: EstiloDosCampos;
  readonly placeholders: Readonly<Record<CampoSeguro, string>>; readonly rotulos: Readonly<Record<CampoSeguro, string>> }
export interface InfoDoCartao { readonly bandeira: string; readonly tipo: string | null; readonly bin: string }
export type EventoDosCampos =
  | { readonly tipo: 'validade'; readonly campo: CampoSeguro; readonly valido: boolean }
  | { readonly tipo: 'cartao'; readonly cartao: InfoDoCartao | null }
export class ErroDoCartao extends Error { readonly codigos: readonly string[] }
export interface ProcessadorCartao {
  montar(montagem: MontagemDosCampos, aoEvento: (evento: EventoDosCampos) => void): Promise<void>   // rejeita = CB-88
  gerarToken(titular: { readonly nome: string; readonly cpf: string }): Promise<DadosDoCartao>      // rejeita com ErroDoCartao
  limparCodigo(): void
  focar(campo: CampoSeguro): void
  desmontar(): void
}
export type CriarProcessador = () => ProcessadorCartao
export type ResultadoDoCartao = { readonly ok: true; readonly dados: DadosDoCartao } | { readonly ok: false; readonly erro: string }
export interface ControleDoCartao { conferir(): boolean; gerar(): Promise<ResultadoDoCartao>; limparCodigo(): void }  // o ref do FormularioCartao (Tarefa 8)
export const FONTE_DOS_CAMPOS: 'Manrope'
export const URL_DA_FONTE: string
export function estiloDosCampos(ler: (token: string) => string): EstiloDosCampos
export const lerTokenDoTema: (token: string) => string
```

- E (`src/ui/pagamento/processadorMercadoPago.ts`, o único arquivo que sabe da operadora):

```ts
export const URL_DO_SDK: 'https://sdk.mercadopago.com/js/v2'
export type ConstrutorDoSdk   // tipos do SDK escritos à mão: CampoDoSdk, InstanciaDoSdk
export function carregarSdk(tempoLimiteMs?: number): Promise<ConstrutorDoSdk>
export function esquecerSdk(): void                          // só para os testes
export function lerMetodoDoCartao(resposta: unknown, bin: string): InfoDoCartao | null
export function codigosDoErro(erro: unknown): string[]
export function criarProcessadorMercadoPago(chave: string, opcoes?: { carregar?: () => Promise<ConstrutorDoSdk>; tempoLimiteMs?: number }): ProcessadorCartao
export function chavePublicaDoPagamento(): string | null      // D-72
export function processadorDoSite(): CriarProcessador | null  // sempre o mesmo objeto; nulo sem a chave (CB-89)
```

- [ ] **Step 1: Escrever os testes da fronteira**

Crie `src/ui/pagamento/processadorCartao.test.ts`:

```ts
import { ErroDoCartao, estiloDosCampos, FONTE_DOS_CAMPOS } from './processadorCartao.ts'

const CLARO: Readonly<Record<string, string>> = { '--text-strong': '#1c222a', '--text-subtle': '#a3a5ab', '--fonte-md': '14px' }
const ESCURO: Readonly<Record<string, string>> = { '--text-strong': '#f6f2ea', '--text-subtle': '#6f858a', '--fonte-md': '14px' }

describe('o estilo dos campos seguros (CA-368)', () => {
  it('a cor do texto, a do placeholder e o tamanho vêm dos tokens do tema claro', () => {
    expect(estiloDosCampos((token) => CLARO[token] ?? '')).toEqual({
      color: '#1c222a',
      placeholderColor: '#a3a5ab',
      fontSize: '14px',
      fontFamily: 'Manrope',
      height: '100%',
      padding: '0',
    })
  })

  it('e do escuro', () => {
    expect(estiloDosCampos((token) => ESCURO[token] ?? '')).toMatchObject({ color: '#f6f2ea', placeholderColor: '#6f858a' })
  })

  it('token que não resolveu fica de fora, em vez de ir vazio para o iframe', () => {
    expect(estiloDosCampos(() => '')).toEqual({ fontFamily: FONTE_DOS_CAMPOS, height: '100%', padding: '0' })
  })
})

describe('ErroDoCartao', () => {
  it('é um erro e guarda os códigos da operadora', () => {
    const erro = new ErroDoCartao(['205', 'E301'])
    expect(erro).toBeInstanceOf(Error)
    expect(erro.codigos).toEqual(['205', 'E301'])
  })
})
```

- [ ] **Step 2: Escrever os testes do adaptador**

Crie `src/ui/pagamento/processadorMercadoPago.test.ts`:

```ts
import { ErroDoCartao, type EventoDosCampos, type MontagemDosCampos } from './processadorCartao.ts'
import {
  carregarSdk,
  chavePublicaDoPagamento,
  codigosDoErro,
  criarProcessadorMercadoPago,
  esquecerSdk,
  lerMetodoDoCartao,
  URL_DO_SDK,
  type ConstrutorDoSdk,
} from './processadorMercadoPago.ts'

/** Um campo seguro de mentira: guarda o que o adaptador pediu e deixa o teste disparar os eventos. */
class CampoFalso {
  readonly tipo: string
  readonly opcoes: Record<string, unknown>
  readonly ouvintes = new Map<string, (dados: unknown) => void>()
  readonly atualizacoes: Record<string, unknown>[] = []
  alvo: string | null = null
  desmontado = false
  focos = 0

  constructor(tipo: string, opcoes: Record<string, unknown>) {
    this.tipo = tipo
    this.opcoes = opcoes
  }

  mount(alvo: string) {
    this.alvo = alvo
    return this
  }

  unmount() {
    this.desmontado = true
  }

  on(evento: string, callback: (dados: unknown) => void) {
    this.ouvintes.set(evento, callback)
    return this
  }

  update(propriedades: Record<string, unknown>) {
    this.atualizacoes.push(propriedades)
  }

  focus() {
    this.focos += 1
  }

  emitir(evento: string, dados: unknown = {}) {
    this.ouvintes.get(evento)?.(dados)
  }
}

const sdk = {
  campos: [] as CampoFalso[],
  construidos: [] as { readonly chave: string; readonly locale: string }[],
  bins: [] as string[],
  tokens: [] as unknown[],
  metodos: async (): Promise<unknown> => ({ results: [] }),
  token: async (): Promise<unknown> => ({ id: 'tok_teste_1', last_four_digits: '3311' }),
}

class MercadoPagoFalso {
  readonly fields = {
    create: (tipo: string, opcoes: Record<string, unknown>) => {
      const campo = new CampoFalso(tipo, opcoes)
      sdk.campos.push(campo)
      return campo
    },
    createCardToken: (dados: unknown) => {
      sdk.tokens.push(dados)
      return sdk.token()
    },
  }

  constructor(chave: string, opcoes: { readonly locale: string }) {
    sdk.construidos.push({ chave, locale: opcoes.locale })
  }

  getPaymentMethods(filtro: { readonly bin: string }) {
    sdk.bins.push(filtro.bin)
    return sdk.metodos()
  }
}

const carregar = async () => MercadoPagoFalso as unknown as ConstrutorDoSdk

const MONTAGEM: MontagemDosCampos = {
  alvos: { numero: 'cartao-numero', validade: 'cartao-validade', codigo: 'cartao-codigo' },
  estilo: { color: '#1c222a', fontFamily: 'Manrope', height: '100%' },
  placeholders: { numero: '0000 0000 0000 0000', validade: 'MM/AA', codigo: '•••' },
  rotulos: { numero: 'Número do cartão', validade: 'Validade', codigo: 'Código de segurança' },
}

const MASTERCARD = {
  results: [{ id: 'master', name: 'Mastercard', payment_type_id: 'credit_card', settings: [{ card_number: { length: 16 }, security_code: { length: 3, mode: 'mandatory' } }] }],
}

/** O campo do tipo pedido que ainda está na página. */
const naTela = (tipo: string): CampoFalso => {
  const campo = sdk.campos.filter((c) => c.tipo === tipo && !c.desmontado).at(-1)
  if (!campo) throw new Error(`sem campo ${tipo}`)
  return campo
}

async function abrir(opcoes: { readonly tempoLimiteMs?: number } = {}) {
  const eventos: EventoDosCampos[] = []
  const processador = criarProcessadorMercadoPago('APP_USR-chave-de-teste', { carregar, ...opcoes })
  const montagem = processador.montar(MONTAGEM, (evento) => {
    eventos.push(evento)
  })
  // A recusa pode chegar antes de o teste olhar: marcar como tratada evita o aviso de rejeição solta.
  void montagem.catch(() => undefined)
  await vi.waitFor(() => expect(sdk.campos.filter((c) => !c.desmontado)).toHaveLength(3))
  return { processador, montagem, eventos }
}

async function abrirPronto() {
  const aberto = await abrir()
  for (const campo of sdk.campos) campo.emitir('ready')
  await aberto.montagem
  return aberto
}

beforeEach(() => {
  esquecerSdk()
  sdk.campos = []
  sdk.construidos = []
  sdk.bins = []
  sdk.tokens = []
  sdk.metodos = async () => MASTERCARD
  sdk.token = async () => ({ id: 'tok_teste_1', last_four_digits: '3311' })
  for (const script of document.querySelectorAll('script')) script.remove()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('o script dos campos seguros (R-35, CB-88)', () => {
  it('R-35: põe o script da operadora uma vez só e devolve o construtor quando ele carrega', async () => {
    const primeiro = carregarSdk()
    const segundo = carregarSdk()
    const scripts = document.querySelectorAll(`script[src="${URL_DO_SDK}"]`)
    expect(scripts).toHaveLength(1)
    expect(segundo).toBe(primeiro)
    vi.stubGlobal('MercadoPago', MercadoPagoFalso)
    scripts[0]?.dispatchEvent(new Event('load'))
    await expect(primeiro).resolves.toBe(MercadoPagoFalso)
  })

  it('CB-88: script que não carrega rejeita, sai da página, e a próxima tentativa põe outro', async () => {
    const tentativa = carregarSdk()
    document.querySelector(`script[src="${URL_DO_SDK}"]`)?.dispatchEvent(new Event('error'))
    await expect(tentativa).rejects.toThrow()
    expect(document.querySelectorAll(`script[src="${URL_DO_SDK}"]`)).toHaveLength(0)
    vi.useFakeTimers()
    void carregarSdk().catch(() => undefined)
    expect(document.querySelectorAll(`script[src="${URL_DO_SDK}"]`)).toHaveLength(1)
  })

  it('CB-88: script que demora demais também desiste', async () => {
    vi.useFakeTimers()
    const tentativa = carregarSdk(1000)
    vi.advanceTimersByTime(1000)
    await expect(tentativa).rejects.toThrow()
  })
})

describe('os três campos (D-66, CA-368)', () => {
  it('cria número, validade e código nos alvos, com o estilo, a fonte do site e o texto de cada um', async () => {
    const { montagem } = await abrir()
    expect(sdk.construidos).toEqual([{ chave: 'APP_USR-chave-de-teste', locale: 'pt-BR' }])
    expect(sdk.campos.map((c) => [c.tipo, c.alvo])).toEqual([
      ['cardNumber', 'cartao-numero'],
      ['expirationDate', 'cartao-validade'],
      ['securityCode', 'cartao-codigo'],
    ])
    expect(naTela('cardNumber').opcoes).toMatchObject({
      placeholder: '0000 0000 0000 0000',
      style: MONTAGEM.estilo,
      srLabel: 'Número do cartão',
      ariaRequired: true,
      enableLuhnValidation: true,
      customFonts: [{ src: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600&display=swap' }],
    })
    expect(naTela('expirationDate').opcoes).toMatchObject({ mode: 'short', placeholder: 'MM/AA' })
    for (const campo of sdk.campos) campo.emitir('ready')
    await expect(montagem).resolves.toBeUndefined()
  })

  it('CB-88: campo que dá erro antes de ficar pronto faz a montagem falhar', async () => {
    const { montagem } = await abrir()
    naTela('securityCode').emitir('error', { error: 'bloqueado' })
    await expect(montagem).rejects.toThrow()
  })

  it('CB-88: campos que não ficam prontos a tempo também', async () => {
    const { montagem } = await abrir({ tempoLimiteMs: 20 })
    await expect(montagem).rejects.toThrow()
  })

  it('validityChange vira "válido" ou "inválido" do campo', async () => {
    const { eventos } = await abrirPronto()
    naTela('cardNumber').emitir('validityChange', { field: 'cardNumber', errorMessages: [] })
    naTela('securityCode').emitir('validityChange', { field: 'securityCode', errorMessages: [{ message: 'x', cause: 'invalid_length' }] })
    expect(eventos).toEqual([
      { tipo: 'validade', campo: 'numero', valido: true },
      { tipo: 'validade', campo: 'codigo', valido: false },
    ])
  })

  it('montar depois de desmontado (o React monta duas vezes no modo estrito) não cria campo nenhum', async () => {
    const processador = criarProcessadorMercadoPago('APP_USR-chave-de-teste', { carregar })
    const montagem = processador.montar(MONTAGEM, () => undefined)
    processador.desmontar()
    await montagem
    expect(sdk.campos).toHaveLength(0)
  })

  it('reaproveita a instância da operadora para a mesma chave', async () => {
    const primeira = await abrirPronto()
    primeira.processador.desmontar()
    await abrirPronto()
    expect(sdk.construidos).toHaveLength(1)
  })
})

describe('a bandeira pelos primeiros números (CA-369)', () => {
  it('busca a bandeira, avisa crédito e ajusta o tamanho do número e do código', async () => {
    const { eventos } = await abrirPronto()
    naTela('cardNumber').emitir('binChange', { bin: '54808328', field: 'cardNumber' })
    await vi.waitFor(() => expect(eventos).toEqual([{ tipo: 'cartao', cartao: { bandeira: 'Mastercard', tipo: 'credit_card', bin: '54808328' } }]))
    expect(sdk.bins).toEqual(['54808328'])
    expect(naTela('cardNumber').atualizacoes).toEqual([{ settings: { length: 16 } }])
    expect(naTela('securityCode').atualizacoes).toEqual([{ settings: { length: 3, mode: 'mandatory' } }])
  })

  it('foco 2: cartão múltiplo (crédito e débito no mesmo número) conta como crédito', async () => {
    sdk.metodos = async () => ({
      results: [
        { id: 'debelo', name: 'Elo Débito', payment_type_id: 'debit_card' },
        { id: 'elo', name: 'Elo', payment_type_id: 'credit_card' },
      ],
    })
    const { eventos } = await abrirPronto()
    naTela('cardNumber').emitir('binChange', { bin: '50677667' })
    await vi.waitFor(() => expect(eventos).toEqual([{ tipo: 'cartao', cartao: { bandeira: 'Elo', tipo: 'credit_card', bin: '50677667' } }]))
  })

  it('CA-369: cartão só de débito chega como débito', async () => {
    sdk.metodos = async () => ({ results: [{ id: 'debelo', name: 'Elo Débito', payment_type_id: 'debit_card' }] })
    const { eventos } = await abrirPronto()
    naTela('cardNumber').emitir('binChange', { bin: '50677667' })
    await vi.waitFor(() => expect(eventos).toEqual([{ tipo: 'cartao', cartao: { bandeira: 'Elo Débito', tipo: 'debit_card', bin: '50677667' } }]))
  })

  it('o mesmo começo não busca de novo; número apagado tira a bandeira', async () => {
    const { eventos } = await abrirPronto()
    naTela('cardNumber').emitir('binChange', { bin: '54808328' })
    await vi.waitFor(() => expect(eventos).toHaveLength(1))
    naTela('cardNumber').emitir('binChange', { bin: '54808328' })
    naTela('cardNumber').emitir('binChange', { bin: null })
    expect(sdk.bins).toEqual(['54808328'])
    expect(eventos.at(-1)).toEqual({ tipo: 'cartao', cartao: null })
  })

  it('foco 3: busca que falha fica sem bandeira, sem quebrar', async () => {
    sdk.metodos = async () => {
      throw new Error('rede')
    }
    const { eventos } = await abrirPronto()
    naTela('cardNumber').emitir('binChange', { bin: '54808328' })
    await vi.waitFor(() => expect(eventos).toEqual([{ tipo: 'cartao', cartao: null }]))
  })

  it('foco 3: resposta sem "results", sem nome ou sem tipo é lida como dá', () => {
    expect(lerMetodoDoCartao({}, '54808328')).toBeNull()
    expect(lerMetodoDoCartao({ results: [] }, '54808328')).toBeNull()
    expect(lerMetodoDoCartao({ results: [{ id: 'visa' }] }, '42356477')).toEqual({ bandeira: 'visa', tipo: null, bin: '42356477' })
  })
})

describe('o código de uso único do cartão (D-66, CB-90)', () => {
  it('manda o nome e o CPF do titular e devolve o código, o final e a bandeira', async () => {
    const { processador, eventos } = await abrirPronto()
    naTela('cardNumber').emitir('binChange', { bin: '54808328' })
    await vi.waitFor(() => expect(eventos).toHaveLength(1))
    await expect(processador.gerarToken({ nome: 'APRO', cpf: '12345678909' })).resolves.toEqual({ token: 'tok_teste_1', final: '3311', bandeira: 'Mastercard' })
    expect(sdk.tokens).toEqual([{ cardholderName: 'APRO', identificationType: 'CPF', identificationNumber: '12345678909' }])
  })

  it('CB-90: cada chamada pede um código novo', async () => {
    const { processador } = await abrirPronto()
    await processador.gerarToken({ nome: 'APRO', cpf: '12345678909' })
    await processador.gerarToken({ nome: 'APRO', cpf: '12345678909' })
    expect(sdk.tokens).toHaveLength(2)
  })

  it('foco 3: o erro do gerador vira ErroDoCartao com os códigos, em qualquer formato', async () => {
    const { processador } = await abrirPronto()
    sdk.token = () => Promise.reject([{ code: '205', message: 'parameter cardNumber can not be null/empty' }])
    const falha = await processador.gerarToken({ nome: 'APRO', cpf: '12345678909' }).catch((erro: unknown) => erro)
    expect(falha).toBeInstanceOf(ErroDoCartao)
    expect((falha as ErroDoCartao).codigos).toEqual(['205'])
    expect(codigosDoErro({ cause: [{ code: 'E301' }] })).toEqual(['E301'])
    expect(codigosDoErro({ message: 'Error trying to create cardToken: The iFrame does not have a window' })).toEqual([])
    expect(codigosDoErro(null)).toEqual([])
  })

  it('resposta sem os 4 últimos números não vira código', async () => {
    const { processador } = await abrirPronto()
    sdk.token = async () => ({ id: 'tok_sem_final' })
    await expect(processador.gerarToken({ nome: 'APRO', cpf: '12345678909' })).rejects.toBeInstanceOf(ErroDoCartao)
  })

  it('sem os campos abertos, não há código', async () => {
    const processador = criarProcessadorMercadoPago('APP_USR-chave-de-teste', { carregar })
    await expect(processador.gerarToken({ nome: 'APRO', cpf: '12345678909' })).rejects.toBeInstanceOf(ErroDoCartao)
  })
})

describe('depois de uma recusa, o foco e a saída', () => {
  it('CA-373: limpar o código desmonta o campo e cria outro no mesmo alvo, com o tamanho da bandeira', async () => {
    const { processador, eventos } = await abrirPronto()
    naTela('cardNumber').emitir('binChange', { bin: '54808328' })
    await vi.waitFor(() => expect(eventos).toHaveLength(1))
    const antigo = naTela('securityCode')
    processador.limparCodigo()
    expect(antigo.desmontado).toBe(true)
    const novo = naTela('securityCode')
    expect(novo).not.toBe(antigo)
    expect(novo.alvo).toBe('cartao-codigo')
    expect(novo.atualizacoes).toEqual([{ settings: { length: 3, mode: 'mandatory' } }])
  })

  it('CA-370: focar põe o foco dentro do campo seguro', async () => {
    const { processador } = await abrirPronto()
    processador.focar('validade')
    expect(naTela('expirationDate').focos).toBe(1)
  })

  it('desmontar tira os três campos da página', async () => {
    const { processador } = await abrirPronto()
    processador.desmontar()
    expect(sdk.campos.every((c) => c.desmontado)).toBe(true)
  })
})

describe('a chave pública (D-72, CB-89)', () => {
  it('vem da variável do build, sem espaço em volta', () => {
    vi.stubEnv('VITE_MERCADOPAGO_PUBLIC_KEY', ' APP_USR-chave-de-teste ')
    expect(chavePublicaDoPagamento()).toBe('APP_USR-chave-de-teste')
  })

  it('CB-89: vazia, não há pagamento no site', () => {
    vi.stubEnv('VITE_MERCADOPAGO_PUBLIC_KEY', '')
    expect(chavePublicaDoPagamento()).toBeNull()
  })
})
```

Em `src/data/sqlCheckout.test.ts`, acrescente ao topo:

```ts
import publicar from '../../.github/workflows/publicar.yml?raw'
```

E, no fim:

```ts
describe('o site publicado (D-72)', () => {
  it('a chave pública do pagamento vem de uma variável do GitHub', () => {
    expect(publicar).toContain('VITE_MERCADOPAGO_PUBLIC_KEY: ${{ vars.VITE_MERCADOPAGO_PUBLIC_KEY }}')
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/ui/pagamento src/data/sqlCheckout.test.ts`
Expected: FAIL — os dois arquivos não existem e o `publicar.yml` ainda não passa a chave.

- [ ] **Step 4: Implementar a fronteira**

Crie `src/ui/pagamento/processadorCartao.ts`:

```ts
// O formulário do cartão fala com a operadora de pagamento por esta interface, e só por
// ela (spec checkout-proprio). A implementação de verdade é processadorMercadoPago.ts; os
// testes das telas usam a de mentira (processadorFalso.test-utils.ts). O nome da operadora
// não aparece na tela (D-71).
import type { CampoSeguro, DadosDoCartao } from '@/domain/cartao.ts'

/** O `style` dos campos seguros: o iframe não enxerga o CSS da página, então vai em valores. */
export type EstiloDosCampos = Readonly<Record<string, string>>

export interface MontagemDosCampos {
  /** O id do elemento onde cada campo seguro entra. */
  readonly alvos: Readonly<Record<CampoSeguro, string>>
  readonly estilo: EstiloDosCampos
  readonly placeholders: Readonly<Record<CampoSeguro, string>>
  /** O nome de cada campo para o leitor de tela, dentro do iframe. */
  readonly rotulos: Readonly<Record<CampoSeguro, string>>
}

/** O que a operadora reconheceu pelos primeiros números do cartão. */
export interface InfoDoCartao {
  readonly bandeira: string
  /** `credit_card`, `debit_card`, `prepaid_card`… `null` quando a operadora não disse. */
  readonly tipo: string | null
  /** Os primeiros números (até 8), para o cartão desenhado. */
  readonly bin: string
}

export type EventoDosCampos =
  | { readonly tipo: 'validade'; readonly campo: CampoSeguro; readonly valido: boolean }
  | { readonly tipo: 'cartao'; readonly cartao: InfoDoCartao | null }

/** O gerador do código do cartão recusou. `codigos` são os da operadora, quando ela diz. */
export class ErroDoCartao extends Error {
  readonly codigos: readonly string[]

  constructor(codigos: readonly string[]) {
    super('A operadora não gerou o código do cartão.')
    this.name = 'ErroDoCartao'
    this.codigos = codigos
  }
}

export interface ProcessadorCartao {
  /** Põe os três campos seguros nos alvos. Rejeita se o script ou os campos não abrirem (CB-88). */
  montar(montagem: MontagemDosCampos, aoEvento: (evento: EventoDosCampos) => void): Promise<void>
  /** Troca o cartão pelo código de uso único; um novo a cada chamada (CB-90). Rejeita com ErroDoCartao. */
  gerarToken(titular: { readonly nome: string; readonly cpf: string }): Promise<DadosDoCartao>
  /** CA-373: apaga o código de segurança, recriando o campo. */
  limparCodigo(): void
  /** CA-370: o foco vai para dentro do campo seguro. */
  focar(campo: CampoSeguro): void
  desmontar(): void
}

export type CriarProcessador = () => ProcessadorCartao

export type ResultadoDoCartao = { readonly ok: true; readonly dados: DadosDoCartao } | { readonly ok: false; readonly erro: string }

/** O que o `ref` do FormularioCartao oferece a quem o usa (checkout e Trocar cartão). */
export interface ControleDoCartao {
  /** CA-370: mostra os erros embaixo de cada campo e põe o foco no primeiro. Diz se está tudo certo. */
  conferir(): boolean
  /** Troca o cartão pelo código de uso único (CB-90: um novo a cada envio). */
  gerar(): Promise<ResultadoDoCartao>
  /** CA-373: depois de uma recusa, apaga o código de segurança. */
  limparCodigo(): void
}

/** R-34: a letra do site dentro dos campos seguros. Se a operadora não aceitar, sai a do sistema. */
export const FONTE_DOS_CAMPOS = 'Manrope'
export const URL_DA_FONTE = 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600&display=swap'

/**
 * CA-368: a cor do texto, a do placeholder e o tamanho da letra dos campos seguros, lidos
 * dos tokens do tema aplicado. A caixa em volta (altura, canto, fundo, foco) é nossa.
 * Token que não resolveu fica de fora, em vez de ir vazio para o iframe.
 */
export function estiloDosCampos(ler: (token: string) => string): EstiloDosCampos {
  const valores: Record<string, string> = {
    color: ler('--text-strong'),
    placeholderColor: ler('--text-subtle'),
    fontSize: ler('--fonte-md'),
    fontFamily: FONTE_DOS_CAMPOS,
    height: '100%',
    padding: '0',
  }
  return Object.fromEntries(Object.entries(valores).filter(([, valor]) => valor !== ''))
}

/** O valor de um token no tema aplicado agora (a classe `dark` mora no <html>). */
export const lerTokenDoTema = (token: string): string => getComputedStyle(document.documentElement).getPropertyValue(token).trim()
```

- [ ] **Step 5: Implementar o adaptador**

Crie `src/ui/pagamento/processadorMercadoPago.ts`:

```ts
// Os campos seguros da operadora de pagamento (spec checkout-proprio, D-66, R-35).
//
// O script vem de https://sdk.mercadopago.com/js/v2, carregado uma vez, só quando o
// formulário do cartão abre (nenhum pacote npm). Os três campos (número, validade e
// código) são iframes da operadora: o número do cartão nunca passa pela página nem pelo
// servidor do MetaNutri. O que volta é o código de uso único, os 4 últimos números e a
// bandeira.
//
// A pesquisa de 02/10/2026 confirmou no SDK os nomes dos métodos e dos eventos. O formato
// dos erros e o da busca da bandeira não estão confirmados: tudo o que vem da operadora é
// lido sem confiar no formato, e o que não se reconhece vira "não sei" (foco 3).
import type { CampoSeguro, DadosDoCartao } from '@/domain/cartao.ts'
import {
  ErroDoCartao,
  URL_DA_FONTE,
  type CriarProcessador,
  type EventoDosCampos,
  type InfoDoCartao,
  type MontagemDosCampos,
  type ProcessadorCartao,
} from './processadorCartao.ts'

export const URL_DO_SDK = 'https://sdk.mercadopago.com/js/v2'

/** O pedaço do SDK que o MetaNutri usa, escrito à mão. */
interface CampoDoSdk {
  mount(idDoAlvo: string): unknown
  unmount(): void
  on(evento: string, callback: (dados: unknown) => void): unknown
  update(propriedades: Record<string, unknown>): void
  readonly focus?: (() => void) | undefined
}

interface InstanciaDoSdk {
  readonly fields: {
    create(tipo: 'cardNumber' | 'expirationDate' | 'securityCode', opcoes: Record<string, unknown>): CampoDoSdk
    createCardToken(dados: { readonly cardholderName: string; readonly identificationType: 'CPF'; readonly identificationNumber: string }): Promise<unknown>
  }
  getPaymentMethods(filtro: { readonly bin: string }): Promise<unknown>
}

export type ConstrutorDoSdk = new (chave: string, opcoes: { readonly locale: 'pt-BR' }) => InstanciaDoSdk

const construtorGlobal = (): ConstrutorDoSdk | null => {
  const construtor: unknown = (globalThis as unknown as { readonly MercadoPago?: unknown }).MercadoPago
  return typeof construtor === 'function' ? (construtor as ConstrutorDoSdk) : null
}

let carregando: Promise<ConstrutorDoSdk> | null = null
/** Uma instância por chave: a operadora pede para criar uma só. */
const instancias = new Map<string, InstanciaDoSdk>()

/** Põe o script na página uma vez só. Se falhar ou demorar demais, a próxima chamada tenta de novo (CB-88). */
export function carregarSdk(tempoLimiteMs = 20_000): Promise<ConstrutorDoSdk> {
  const pronto = construtorGlobal()
  if (pronto) return Promise.resolve(pronto)
  if (carregando) return carregando
  carregando = new Promise<ConstrutorDoSdk>((resolver, rejeitar) => {
    const script = document.createElement('script')
    const falhar = () => {
      clearTimeout(relogio)
      script.remove()
      carregando = null
      rejeitar(new Error('O script dos campos seguros não carregou.'))
    }
    const relogio = setTimeout(falhar, tempoLimiteMs)
    script.src = URL_DO_SDK
    script.async = true
    script.addEventListener('error', falhar)
    script.addEventListener('load', () => {
      const construtor = construtorGlobal()
      if (!construtor) {
        falhar()
        return
      }
      clearTimeout(relogio)
      resolver(construtor)
    })
    document.head.append(script)
  })
  return carregando
}

/** Só para os testes: esquece o script e as instâncias. */
export function esquecerSdk(): void {
  carregando = null
  instancias.clear()
}

const objeto = (valor: unknown): Record<string, unknown> | null => (typeof valor === 'object' && valor !== null ? (valor as Record<string, unknown>) : null)
const texto = (valor: unknown): string | null => (typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null)

/** `validityChange`: lista de erros vazia é campo válido. */
const semErros = (dados: unknown): boolean => {
  const lista = objeto(dados)?.['errorMessages']
  return Array.isArray(lista) && lista.length === 0
}

/** O método de pagamento que vale para o cartão: o de crédito, quando o cartão é múltiplo (foco 2). */
function metodoDoCartao(resposta: unknown): Record<string, unknown> | null {
  const lista = objeto(resposta)?.['results']
  if (!Array.isArray(lista)) return null
  const metodos = lista.map(objeto).filter((metodo): metodo is Record<string, unknown> => metodo !== null)
  return metodos.find((metodo) => metodo['payment_type_id'] === 'credit_card') ?? metodos[0] ?? null
}

/** A bandeira e o tipo, lidos da busca pelos primeiros números. */
export function lerMetodoDoCartao(resposta: unknown, bin: string): InfoDoCartao | null {
  const metodo = metodoDoCartao(resposta)
  const bandeira = metodo ? (texto(metodo['name']) ?? texto(metodo['id'])) : null
  return metodo && bandeira ? { bandeira, tipo: texto(metodo['payment_type_id']), bin } : null
}

/** Os códigos do erro do gerador do código do cartão, em qualquer dos formatos conhecidos. */
export function codigosDoErro(erro: unknown): string[] {
  const codigos: string[] = []
  const visitar = (valor: unknown): void => {
    if (Array.isArray(valor)) {
      valor.forEach(visitar)
      return
    }
    const o = objeto(valor)
    if (!o) return
    const codigo = o['code']
    if (typeof codigo === 'string' || typeof codigo === 'number') codigos.push(String(codigo))
    if (o['cause'] !== undefined) visitar(o['cause'])
  }
  visitar(erro)
  return codigos
}

const TIPO_NO_SDK: Readonly<Record<CampoSeguro, 'cardNumber' | 'expirationDate' | 'securityCode'>> = {
  numero: 'cardNumber',
  validade: 'expirationDate',
  codigo: 'securityCode',
}
const CAMPOS: readonly CampoSeguro[] = ['numero', 'validade', 'codigo']

interface OpcoesDoProcessador {
  /** Os testes trocam o script por um construtor de mentira. */
  readonly carregar?: (() => Promise<ConstrutorDoSdk>) | undefined
  /** Quanto esperar os três campos ficarem prontos antes de desistir (CB-88). */
  readonly tempoLimiteMs?: number | undefined
}

export function criarProcessadorMercadoPago(chave: string, opcoes: OpcoesDoProcessador = {}): ProcessadorCartao {
  const carregar = opcoes.carregar ?? (() => carregarSdk())
  const tempoLimiteMs = opcoes.tempoLimiteMs ?? 20_000
  const campos: Partial<Record<CampoSeguro, CampoDoSdk>> = {}
  let sdk: InstanciaDoSdk | null = null
  let montagem: MontagemDosCampos | null = null
  let avisar: (evento: EventoDosCampos) => void = () => undefined
  let cartao: InfoDoCartao | null = null
  let ajusteDoCodigo: Record<string, unknown> | null = null
  let binAtual = ''
  let vivo = true

  const aoMudarBin = async (dados: unknown): Promise<void> => {
    const bin = texto(objeto(dados)?.['bin']) ?? ''
    if (bin.length < 6) {
      binAtual = ''
      cartao = null
      if (vivo) avisar({ tipo: 'cartao', cartao: null })
      return
    }
    if (bin === binAtual || !sdk) return
    binAtual = bin
    try {
      const resposta = await sdk.getPaymentMethods({ bin })
      if (!vivo || bin !== binAtual) return
      cartao = lerMetodoDoCartao(resposta, bin)
      // A operadora pede para ajustar o tamanho do número e do código à bandeira.
      const configuracoes = metodoDoCartao(resposta)?.['settings']
      const ajuste = Array.isArray(configuracoes) ? objeto(configuracoes[0]) : null
      const doNumero = ajuste ? objeto(ajuste['card_number']) : null
      ajusteDoCodigo = ajuste ? objeto(ajuste['security_code']) : null
      if (doNumero) campos.numero?.update({ settings: doNumero })
      if (ajusteDoCodigo) campos.codigo?.update({ settings: ajusteDoCodigo })
      avisar({ tipo: 'cartao', cartao })
    } catch {
      // Sem a bandeira, o envio continua: a operadora confere o cartão de qualquer jeito.
      if (vivo && bin === binAtual) avisar({ tipo: 'cartao', cartao: null })
    }
  }

  const criarCampo = (instancia: InstanciaDoSdk, campo: CampoSeguro, m: MontagemDosCampos, aoPronto: () => void, aoFalhar: () => void): CampoDoSdk => {
    const opcoesDoCampo: Record<string, unknown> = {
      placeholder: m.placeholders[campo],
      style: m.estilo,
      customFonts: [{ src: URL_DA_FONTE }],
      srLabel: m.rotulos[campo],
      ariaRequired: true,
    }
    if (campo === 'validade') opcoesDoCampo['mode'] = 'short'
    if (campo === 'numero') opcoesDoCampo['enableLuhnValidation'] = true
    const novo = instancia.fields.create(TIPO_NO_SDK[campo], opcoesDoCampo)
    novo.on('ready', aoPronto)
    novo.on('error', aoFalhar)
    novo.on('validityChange', (dados) => {
      if (vivo) avisar({ tipo: 'validade', campo, valido: semErros(dados) })
    })
    if (campo === 'numero') novo.on('binChange', (dados) => void aoMudarBin(dados))
    novo.mount(m.alvos[campo])
    campos[campo] = novo
    return novo
  }

  return {
    async montar(m, aoEvento) {
      montagem = m
      avisar = aoEvento
      const Construtor = await carregar()
      // O formulário pode ter fechado enquanto o script chegava (e o React monta duas vezes no modo estrito).
      if (!vivo) return
      const instancia = instancias.get(chave) ?? new Construtor(chave, { locale: 'pt-BR' })
      instancias.set(chave, instancia)
      sdk = instancia
      await new Promise<void>((resolver, rejeitar) => {
        const prontos = new Set<CampoSeguro>()
        let terminou = false
        const fim = (falha: Error | null) => {
          if (terminou) return
          terminou = true
          clearTimeout(relogio)
          if (falha) rejeitar(falha)
          else resolver()
        }
        const relogio = setTimeout(() => fim(new Error('Os campos seguros não ficaram prontos.')), tempoLimiteMs)
        try {
          for (const campo of CAMPOS) {
            criarCampo(
              instancia,
              campo,
              m,
              () => {
                prontos.add(campo)
                if (prontos.size === CAMPOS.length) fim(null)
              },
              () => fim(new Error('Um campo seguro falhou ao abrir.')),
            )
          }
        } catch (falha) {
          fim(falha instanceof Error ? falha : new Error('Os campos seguros não abriram.'))
        }
      })
    },

    async gerarToken(titular): Promise<DadosDoCartao> {
      if (!sdk) throw new ErroDoCartao([])
      let resposta: unknown
      try {
        resposta = await sdk.fields.createCardToken({ cardholderName: titular.nome, identificationType: 'CPF', identificationNumber: titular.cpf })
      } catch (erro) {
        throw new ErroDoCartao(codigosDoErro(erro))
      }
      const token = texto(objeto(resposta)?.['id'])
      const final = texto(objeto(resposta)?.['last_four_digits'])
      if (!token || !final || !/^\d{4}$/.test(final)) throw new ErroDoCartao(codigosDoErro(resposta))
      return { token, final, bandeira: cartao?.bandeira ?? 'Cartão' }
    },

    limparCodigo() {
      const atual = campos.codigo
      if (!sdk || !montagem || !atual) return
      try {
        atual.unmount()
      } catch {
        // o iframe já tinha saído
      }
      const novo = criarCampo(sdk, 'codigo', montagem, () => undefined, () => undefined)
      if (ajusteDoCodigo) novo.update({ settings: ajusteDoCodigo })
    },

    focar(campo) {
      const alvo = campos[campo]
      if (alvo?.focus) {
        alvo.focus()
        return
      }
      // Sem o focus do SDK, o foco vai para o iframe, e o navegador entrega ao campo de dentro.
      const id = montagem?.alvos[campo]
      const iframe = id ? document.getElementById(id)?.querySelector('iframe') : null
      iframe?.focus()
    },

    desmontar() {
      vivo = false
      for (const campo of CAMPOS) {
        try {
          campos[campo]?.unmount()
        } catch {
          // o iframe já tinha saído
        }
        delete campos[campo]
      }
    },
  }
}

/** D-72: a chave pública vem do build (`VITE_MERCADOPAGO_PUBLIC_KEY`). Sem ela, não há pagamento no site (CB-89). */
export function chavePublicaDoPagamento(): string | null {
  const chave = import.meta.env['VITE_MERCADOPAGO_PUBLIC_KEY']
  return typeof chave === 'string' && chave.trim() !== '' ? chave.trim() : null
}

let doSite: CriarProcessador | null | undefined

/** O processador do site, sempre o mesmo objeto (o formulário recria os campos quando ele muda), ou nulo sem a chave. */
export function processadorDoSite(): CriarProcessador | null {
  if (doSite === undefined) {
    const chave = chavePublicaDoPagamento()
    doSite = chave ? () => criarProcessadorMercadoPago(chave) : null
  }
  return doSite
}
```

- [ ] **Step 6: A chave no build e no exemplo**

No fim de `.env.example`, acrescente:

```bash

# Pagamento com cartão (spec checkout-proprio, D-72): a chave PÚBLICA da operadora de
# pagamento (Mercado Pago > Suas integrações > a aplicação > Credenciais > Public Key).
# Ela vai no navegador de propósito: é o que abre os campos seguros do cartão. Use a de
# teste junto com o token de teste do servidor, e a de produção junto com o de produção.
# Sem ela, o checkout mostra "O pagamento não está disponível agora." (CB-89).
VITE_MERCADOPAGO_PUBLIC_KEY=
```

Em `.github/workflows/publicar.yml`, no `env:` do passo `- run: npm run build`, depois da linha `VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}`, acrescente:

```yaml
          # A chave PÚBLICA do pagamento (D-72) abre os campos seguros do cartão. É variável,
          # não segredo: vai no JavaScript do site de qualquer jeito. Sem ela, o checkout
          # publicado diz "O pagamento não está disponível agora."
          VITE_MERCADOPAGO_PUBLIC_KEY: ${{ vars.VITE_MERCADOPAGO_PUBLIC_KEY }}
```

- [ ] **Step 7: README**

Em "Projeto novo", passo 2, troque o trecho

```markdown
preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
```

por

```markdown
preencha `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e, para o checkout, `VITE_MERCADOPAGO_PUBLIC_KEY` (a Public Key do Mercado Pago)
```

Em "Projeto já ligado", depois do passo 6 (Termos), acrescente:

````markdown
7. **Chave pública do pagamento.** No Mercado Pago, em *Suas integrações > a aplicação > Credenciais*, copie a
   **Public Key** do mesmo ambiente do token do passo 5 (a de teste enquanto o token for o de teste). Guarde como
   variável do GitHub, que o build publicado lê (`.github/workflows/publicar.yml`):
   ```bash
   gh variable set VITE_MERCADOPAGO_PUBLIC_KEY --body "<a Public Key>"
   ```
   Ela é pública de propósito: vai no navegador, para os campos seguros do cartão. Sem ela, o checkout publicado diz
   "O pagamento não está disponível agora." Para testar na sua máquina, ponha a mesma chave no `.env.local`.
````

- [ ] **Step 8: Rodar e ver passar**

Run: `npx vitest run src/ui/pagamento src/data/sqlCheckout.test.ts` → PASS. Depois `npm run check` → verde.

- [ ] **Step 9: Conferir com o script de verdade, no navegador**

O adaptador supõe coisas que a pesquisa não confirmou (o formato dos eventos, `name` da bandeira, o `focus()` do campo, o formato do erro, o fundo do iframe no tema escuro, a fonte). Confira com a chave pública **de teste** que o dono mandou, `APP_USR-5178310a-e7c1-47e6-867e-d9bb01fc0f5d` (pública; pode ir no chat e no plano).

1. Run (em segundo plano): `npx vite --port 5174 --strictPort`. O servidor de desenvolvimento entrega os arquivos `.ts` direto; não precisa de Supabase.
2. Playwright MCP: `browser_navigate` para `http://localhost:5174/#/inicio`.
3. `browser_evaluate` com:

```js
async () => {
  const sdk = await import('/src/ui/pagamento/processadorMercadoPago.ts')
  const fronteira = await import('/src/ui/pagamento/processadorCartao.ts')
  document.getElementById('conferencia-sdk')?.remove()
  const caixa = (id) => `<div style="height:3rem;border-radius:.75rem;background:var(--surface-sunken);padding:0 1rem;display:flex;align-items:center"><div id="${id}" style="height:100%;flex:1"></div></div>`
  document.body.insertAdjacentHTML('afterbegin', `<div id="conferencia-sdk" style="position:fixed;inset:0;z-index:9999;background:var(--bg-page);padding:1.5rem;display:grid;gap:.75rem;align-content:start;max-width:28rem">${caixa('c-numero')}${caixa('c-validade')}${caixa('c-codigo')}</div>`)
  window.__proc?.desmontar()
  window.__eventos = []
  window.__proc = sdk.criarProcessadorMercadoPago('APP_USR-5178310a-e7c1-47e6-867e-d9bb01fc0f5d')
  await window.__proc.montar(
    {
      alvos: { numero: 'c-numero', validade: 'c-validade', codigo: 'c-codigo' },
      estilo: fronteira.estiloDosCampos(fronteira.lerTokenDoTema),
      placeholders: { numero: '0000 0000 0000 0000', validade: 'MM/AA', codigo: '•••' },
      rotulos: { numero: 'Número do cartão', validade: 'Validade', codigo: 'Código de segurança' },
    },
    (evento) => window.__eventos.push(evento),
  )
  return 'montado'
}
```

4. `browser_snapshot`, e digite nos três iframes (pelas referências do snapshot): `5480 8328 0103 3311`, `11/30`, `123`. `browser_evaluate` `() => window.__eventos`: tem que ter os três `{ tipo: 'validade', valido: true }` e um `{ tipo: 'cartao', cartao: { bandeira: …, tipo: 'credit_card', bin: '54808328' } }`. Anote a bandeira que veio (`Mastercard` ou `master`).
5. `browser_evaluate` `async () => window.__proc.gerarToken({ nome: 'APRO', cpf: '12345678909' })` → `{ token, final: '3311', bandeira }`.
6. `browser_evaluate` `() => { window.__proc.limparCodigo(); window.__proc.focar('validade') }` → o código fica vazio e o cursor vai para a validade.
7. Troque o número para o Elo de débito `5067 7667 8388 8311` → um evento `cartao` com `tipo: 'debit_card'`.
8. Rode o passo 3 de novo (campos vazios) e `async () => window.__proc.gerarToken({ nome: 'APRO', cpf: '12345678909' }).catch((e) => e.codigos)` → anote os códigos que vieram.
9. `browser_evaluate` `() => document.documentElement.classList.add('dark')`, rode o passo 3 de novo e tire `browser_take_screenshot` nos dois temas: o texto e o placeholder seguem o tema, o fundo do iframe deixa ver o da caixa, a letra é a Manrope (R-34).

Se algum achado contrariar o adaptador (nome do evento, formato do `bin`, bandeira em `id` e não em `name`, `focus` ausente, fundo branco no escuro, erro em outro formato), corrija o adaptador **e** o teste nesta mesma tarefa e diga ao controlador o que mudou. Se os campos seguros recusarem `http://localhost`, pule este passo e faça a mesma conferência no site publicado, na Tarefa 12. Pare o servidor no fim.

- [ ] **Step 10: Commit**

```bash
git add src/ui/pagamento/processadorCartao.ts src/ui/pagamento/processadorCartao.test.ts src/ui/pagamento/processadorMercadoPago.ts src/ui/pagamento/processadorMercadoPago.test.ts .env.example .github/workflows/publicar.yml src/data/sqlCheckout.test.ts README.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(pagamento): campos seguros do cartão por um adaptador fino`

- [ ] **Step 11: Com o usuário — a variável do GitHub**

Pode ser já (o site publicado hoje ignora a variável). Com o `gh` autenticado:

Run: `gh variable set VITE_MERCADOPAGO_PUBLIC_KEY --body "APP_USR-5178310a-e7c1-47e6-867e-d9bb01fc0f5d"`
Expected: `✓ Created variable VITE_MERCADOPAGO_PUBLIC_KEY for <dono>/<repo>`. Se o `gh` pedir login, pare e avise o usuário.

---

### Tarefa 8: Pagamento: `FormularioCartao`

Cobre CA-366 (o formulário), CA-368 a CA-371, CA-373 (o código apagado), CB-88 e D-73 no formulário. É o mesmo no checkout (Tarefa 9) e em "Trocar cartão" (Tarefa 10, CA-379).

**Files:**
- Create: `src/ui/pagamento/estiloDaCaixa.ts`
- Create: `src/ui/pagamento/CampoDoFormulario.tsx`
- Create: `src/ui/pagamento/AvisoPagamento.tsx`
- Create: `src/ui/pagamento/CartaoAoVivo.tsx`
- Create: `src/ui/pagamento/FormularioCartao.tsx`
- Create: `src/ui/pagamento/processadorFalso.test-utils.ts`
- Create: `src/ui/pagamento/FormularioCartao.test.tsx`

**Interfaces:**
- Consumes: Tarefa 5 (`errosDoCartao`, `mascararCpf`, `soDigitos`, `ehCredito`, `campoDoErroDoToken`, `MENSAGEM_DO_CAMPO`, `ORDEM_DOS_CAMPOS` e as frases), Tarefa 6 (`IconeMarca`), Tarefa 7 (`ControleDoCartao`, `CriarProcessador`, `ProcessadorCartao`, `InfoDoCartao`, `ErroDoCartao`, `estiloDosCampos`, `lerTokenDoTema`); `Input` de `@ds/componentes/forms/input.tsx`.
- Produces:

```ts
// src/ui/pagamento/FormularioCartao.tsx
export const FormularioCartao: React.ForwardRefExoticComponent<{
  readonly criarProcessador: CriarProcessador
  readonly travado: boolean
  readonly aoMudarPronto: (pronto: boolean) => void
} & React.RefAttributes<ControleDoCartao>>
// rótulos: grupos "Número do cartão", "Validade", "Código de segurança"; campos "Nome impresso no cartão", "CPF do titular"

// src/ui/pagamento/AvisoPagamento.tsx
export function AvisoPagamento(props: { tipo: 'erro' | 'ok'; children: ReactNode }): JSX.Element   // alert / status, ícone da marca

// src/ui/pagamento/processadorFalso.test-utils.ts
export const CARTAO_APROVADO: DadosDoCartao                      // { token: 'tok_teste_1', bandeira: 'Mastercard', final: '6351' }
export interface ProcessadorFalso { readonly criar: CriarProcessador; criados; desmontados; montagem; falharAoMontar;
  respostaDoToken: () => Promise<DadosDoCartao>; readonly tokens; readonly focos: CampoSeguro[]; limpezas;
  emitir(evento: EventoDosCampos): void; preencher(): void }      // preencher: três campos válidos e um Mastercard de crédito, bin 50314332
export function processadorFalso(): ProcessadorFalso
```

- [ ] **Step 1: Escrever o processador de mentira**

Crie `src/ui/pagamento/processadorFalso.test-utils.ts`:

```ts
// Processador de mentira para os testes das telas do cartão (spec checkout-proprio).
// O nome não termina em `.test.ts`, então o Vitest não roda este arquivo como teste.
import { act } from '@testing-library/react'
import type { CampoSeguro, DadosDoCartao } from '@/domain/cartao.ts'
import type { CriarProcessador, EventoDosCampos, MontagemDosCampos, ProcessadorCartao } from './processadorCartao.ts'

export const CARTAO_APROVADO: DadosDoCartao = { token: 'tok_teste_1', bandeira: 'Mastercard', final: '6351' }

export interface ProcessadorFalso {
  /** Sempre o mesmo objeto, como o do site: passe para `criarProcessador`. */
  readonly criar: CriarProcessador
  criados: number
  desmontados: number
  montagem: MontagemDosCampos | null
  /** Faz a montagem falhar (CB-88). */
  falharAoMontar: boolean
  /** O que o gerador do código devolve; troque para simular erro. */
  respostaDoToken: () => Promise<DadosDoCartao>
  readonly tokens: { readonly nome: string; readonly cpf: string }[]
  readonly focos: CampoSeguro[]
  limpezas: number
  /** Dispara um evento dos campos seguros, dentro do act. */
  emitir(evento: EventoDosCampos): void
  /** Os três campos válidos e um Mastercard de crédito. */
  preencher(): void
}

export function processadorFalso(): ProcessadorFalso {
  let avisar: (evento: EventoDosCampos) => void = () => undefined
  const falso: ProcessadorFalso = {
    criados: 0,
    desmontados: 0,
    montagem: null,
    falharAoMontar: false,
    respostaDoToken: async () => CARTAO_APROVADO,
    tokens: [],
    focos: [],
    limpezas: 0,
    emitir(evento) {
      act(() => avisar(evento))
    },
    preencher() {
      for (const campo of ['numero', 'validade', 'codigo'] as const) falso.emitir({ tipo: 'validade', campo, valido: true })
      falso.emitir({ tipo: 'cartao', cartao: { bandeira: 'Mastercard', tipo: 'credit_card', bin: '50314332' } })
    },
    criar: () => {
      falso.criados += 1
      const processador: ProcessadorCartao = {
        async montar(montagem, aoEvento) {
          falso.montagem = montagem
          avisar = aoEvento
          if (falso.falharAoMontar) throw new Error('campos bloqueados')
        },
        async gerarToken(titular) {
          falso.tokens.push(titular)
          return falso.respostaDoToken()
        },
        limparCodigo() {
          falso.limpezas += 1
        },
        focar(campo) {
          falso.focos.push(campo)
        },
        desmontar() {
          falso.desmontados += 1
        },
      }
      return processador
    },
  }
  return falso
}
```

- [ ] **Step 2: Escrever os testes que falham**

Crie `src/ui/pagamento/FormularioCartao.test.tsx`:

```tsx
import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { FormularioCartao } from './FormularioCartao.tsx'
import { ErroDoCartao, type ControleDoCartao } from './processadorCartao.ts'
import { CARTAO_APROVADO, processadorFalso, type ProcessadorFalso } from './processadorFalso.test-utils.ts'

/** Uma tela mínima que usa o formulário como o checkout usa: conferir, gerar e limpar pelo ref. */
function Bancada({ falso, travado }: { readonly falso: ProcessadorFalso; readonly travado: boolean }) {
  const controle = useRef<ControleDoCartao>(null)
  const [pronto, setPronto] = useState(false)
  const [resultado, setResultado] = useState('')
  const enviar = async () => {
    const atual = controle.current
    if (!atual || !atual.conferir()) return
    const gerado = await atual.gerar()
    setResultado(gerado.ok ? gerado.dados.token : gerado.erro)
  }
  return (
    <>
      <FormularioCartao ref={controle} criarProcessador={falso.criar} travado={travado} aoMudarPronto={setPronto} />
      <p>{pronto ? 'pode enviar' : 'parado'}</p>
      <button type="button" onClick={() => void enviar()}>
        Enviar
      </button>
      <button type="button" onClick={() => controle.current?.limparCodigo()}>
        Limpar código
      </button>
      <output>{resultado}</output>
    </>
  )
}

async function montar(falso: ProcessadorFalso = processadorFalso(), travado = false) {
  const tela = render(<Bancada falso={falso} travado={travado} />)
  // A montagem dos campos seguros termina numa promessa: espera ela antes de olhar.
  await act(async () => {})
  return { ...tela, falso, usuario: userEvent.setup() }
}

const nome = () => screen.getByRole('textbox', { name: 'Nome impresso no cartão' })
const cpf = () => screen.getByRole('textbox', { name: 'CPF do titular' })

describe('FormularioCartao (spec checkout-proprio)', () => {
  it('CA-366: os cinco campos do cartão, três seguros e dois nossos', async () => {
    const { falso } = await montar()
    for (const rotulo of ['Número do cartão', 'Validade', 'Código de segurança']) expect(screen.getByRole('group', { name: rotulo })).toBeInTheDocument()
    expect(nome()).toBeInTheDocument()
    expect(cpf()).toBeInTheDocument()
    const alvos = falso.montagem?.alvos
    expect(alvos ? document.getElementById(alvos.numero) : null).not.toBeNull()
    expect(alvos?.numero).toMatch(/^[a-zA-Z0-9-]+$/)
    expect(screen.getByText('Os 3 números do verso')).toBeInTheDocument()
  })

  it('CA-368: os campos seguros recebem a fonte do site e ocupam a caixa, que é a mesma dos campos nossos', async () => {
    const { falso } = await montar()
    expect(falso.montagem?.estilo).toMatchObject({ fontFamily: 'Manrope', height: '100%', padding: '0' })
    const seguro = screen.getByRole('group', { name: 'Número do cartão' })
    for (const classe of ['h-12', 'rounded-md', 'bg-surfacesunken', 'focus-within:ring-primary']) expect(seguro).toHaveClass(classe)
    for (const classe of ['h-12', 'rounded-md', 'bg-surfacesunken', 'focus-visible:ring-primary']) expect(nome()).toHaveClass(classe)
  })

  it('CB-88: campos que não abrem mostram o aviso e o envio fica parado', async () => {
    const falso = processadorFalso()
    falso.falharAoMontar = true
    await montar(falso)
    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui abrir o formulário do cartão. Recarregue a página ou desative o bloqueador de anúncios para este site.')
    expect(screen.getByText('parado')).toBeInTheDocument()
  })

  it('CA-369: a bandeira aparece no número; débito avisa e trava o envio', async () => {
    const { falso } = await montar()
    expect(screen.getByText('pode enviar')).toBeInTheDocument()
    falso.preencher()
    expect(within(screen.getByRole('group', { name: 'Número do cartão' })).getByText('Mastercard')).toBeInTheDocument()
    falso.emitir({ tipo: 'cartao', cartao: { bandeira: 'Elo Débito', tipo: 'debit_card', bin: '50677667' } })
    expect(screen.getByText('Use um cartão de crédito.')).toBeInTheDocument()
    expect(screen.getByText('parado')).toBeInTheDocument()
  })

  it('CA-370: tudo vazio mostra o erro embaixo de cada campo, não gera o código e põe o foco no número', async () => {
    const { falso, usuario } = await montar()
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    for (const frase of [
      'Digite o número do cartão.',
      'Digite a validade, como 11/30.',
      'Digite o código de segurança.',
      'Digite o nome como está impresso no cartão.',
      'Digite o CPF do titular do cartão.',
    ]) {
      expect(screen.getByText(frase)).toBeInTheDocument()
    }
    expect(falso.tokens).toHaveLength(0)
    expect(falso.focos).toEqual(['numero'])
  })

  it('CA-370: com o cartão certo, o foco vai para o nome; o CPF com dígito errado é apontado', async () => {
    const { falso, usuario } = await montar()
    falso.preencher()
    await usuario.type(cpf(), '12345678900')
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(nome()).toHaveFocus()
    expect(screen.getByText('Confira o CPF: os dígitos não batem.')).toBeInTheDocument()
    expect(cpf()).toHaveAttribute('aria-invalid', 'true')
    expect(falso.tokens).toHaveLength(0)
  })

  it('o CPF ganha pontos e traço enquanto digita, e o erro some quando a pessoa corrige', async () => {
    const { usuario } = await montar()
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    await usuario.type(cpf(), '12345678909')
    expect(cpf()).toHaveValue('123.456.789-09')
    expect(screen.queryByText('Digite o CPF do titular do cartão.')).not.toBeInTheDocument()
  })

  it('tudo certo: gera o código com o nome e o CPF só com números', async () => {
    const { falso, usuario } = await montar()
    falso.preencher()
    await usuario.type(nome(), 'APRO')
    await usuario.type(cpf(), '12345678909')
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText(CARTAO_APROVADO.token)).toBeInTheDocument()
    expect(falso.tokens).toEqual([{ nome: 'APRO', cpf: '12345678909' }])
  })

  it('CA-370: o erro do gerador aponta o campo e põe o foco nele', async () => {
    const { falso, usuario } = await montar()
    falso.respostaDoToken = () => Promise.reject(new ErroDoCartao(['E301']))
    falso.preencher()
    await usuario.type(nome(), 'APRO')
    await usuario.type(cpf(), '12345678909')
    await usuario.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(await screen.findByText('Confira os dados do cartão e tente de novo. Nada foi cobrado.')).toBeInTheDocument()
    expect(screen.getByText('Confira o número do cartão.')).toBeInTheDocument()
    expect(falso.focos.at(-1)).toBe('numero')
  })

  it('CA-371: travado, os campos nossos não mexem e os seguros não recebem clique', async () => {
    await montar(processadorFalso(), true)
    expect(nome()).toBeDisabled()
    expect(cpf()).toBeDisabled()
    expect(screen.getByRole('group', { name: 'Número do cartão' })).toHaveClass('pointer-events-none')
  })

  it('CA-373: limpar o código recria o campo e pede para digitar de novo', async () => {
    const { falso, usuario } = await montar()
    await usuario.click(screen.getByRole('button', { name: 'Limpar código' }))
    expect(falso.limpezas).toBe(1)
    expect(screen.getByText('Digite o código de novo.')).toBeInTheDocument()
  })

  it('o cartão desenhado mostra a bandeira, os 6 primeiros números e o nome, e esconde a validade', async () => {
    const { falso, usuario } = await montar()
    falso.preencher()
    await usuario.type(nome(), 'Ana Souza')
    const desenho = document.querySelector('[data-cartao-ao-vivo]')
    expect(desenho).toHaveAttribute('aria-hidden', 'true')
    expect(desenho).toHaveTextContent('5031 43•• •••• ••••')
    expect(desenho).toHaveTextContent('ANA SOUZA')
    expect(desenho).toHaveTextContent('••/••')
  })

  it('CA-383: nenhum ícone de biblioteca no formulário', async () => {
    const { container } = await montar()
    expect(container.querySelectorAll('svg:not([data-icone])')).toHaveLength(0)
  })

  it('ao sair, desmonta os campos seguros', async () => {
    const { falso, unmount } = await montar()
    unmount()
    expect(falso.desmontados).toBe(1)
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/ui/pagamento/FormularioCartao.test.tsx`
Expected: FAIL — `FormularioCartao.tsx` não existe.

- [ ] **Step 4: Implementar as peças**

Crie `src/ui/pagamento/estiloDaCaixa.ts`:

```ts
// A caixa dos cinco campos do cartão (protótipo v2, D-73; decisão 1 do plano): 48 de
// altura, canto 12, fundo afundado e sem fio; no foco vira cartão com anel por dentro; com
// erro, fundo e anel de erro. Os três campos seguros e os dois nossos usam a mesma caixa
// (CA-368). Para voltar ao Input do resto do site, é aqui.
export const CAIXA =
  'flex h-12 w-full min-w-0 items-center gap-2.5 rounded-md border-0 bg-surfacesunken px-4 text-sm text-heading ring-inset transition-[background-color,box-shadow]'
/** O foco do campo seguro mora dentro do iframe; o :focus-within da caixa enxerga. */
export const CAIXA_FOCO_DENTRO = 'focus-within:bg-card focus-within:ring-2 focus-within:ring-primary'
/** O foco dos campos nossos: o Input já traz um anel, e aqui ele vira o da caixa. */
export const CAIXA_FOCO_INPUT = 'placeholder:text-textsubtle focus-visible:border-0 focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-primary'
export const CAIXA_ERRO = 'bg-lighterror ring-1 ring-error'
```

Crie `src/ui/pagamento/CampoDoFormulario.tsx`:

```tsx
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CampoDoFormularioProps {
  /** O id do campo (o nosso) ou do alvo do iframe (o seguro). O rótulo, o erro e a dica derivam dele. */
  readonly id: string
  readonly rotulo: string
  readonly erro?: string | undefined
  readonly dica?: string | undefined
  /** Campo seguro: o rótulo não é <label>, porque o campo de verdade está dentro do iframe. */
  readonly seguro?: boolean | undefined
  readonly className?: string | undefined
  readonly children: ReactNode
}

const ROTULO = 'text-sm font-semibold text-heading'

/** Rótulo em cima, a caixa no meio e, embaixo, o erro (CA-370) ou a dica. */
export function CampoDoFormulario({ id, rotulo, erro, dica, seguro = false, className, children }: CampoDoFormularioProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {seguro ? (
        <span id={`${id}-rotulo`} className={ROTULO}>
          {rotulo}
        </span>
      ) : (
        <label htmlFor={id} className={ROTULO}>
          {rotulo}
        </label>
      )}
      {children}
      {erro ? (
        <p id={`${id}-erro`} role="alert" className="text-xs font-semibold text-errortext">
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className="text-xs text-muted-foreground">
          {dica}
        </p>
      ) : null}
    </div>
  )
}
```

Crie `src/ui/pagamento/AvisoPagamento.tsx`:

```tsx
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'

/** Erro ou confirmação no checkout e em Conta e plano, com o ícone da marca (CA-383). Erro é `alert`; confirmação é `status`. */
export function AvisoPagamento({ tipo, children }: { readonly tipo: 'erro' | 'ok'; readonly children: ReactNode }) {
  const erro = tipo === 'erro'
  return (
    <div role={erro ? 'alert' : 'status'} className={cn('flex items-start gap-2.5 rounded-lg p-3.5 text-sm', erro ? 'bg-lighterror text-errortext' : 'bg-lightsuccess text-successtext')}>
      <IconeMarca nome={erro ? 'alerta' : 'check'} className="mt-0.5 size-4" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
```

Crie `src/ui/pagamento/CartaoAoVivo.tsx`:

```tsx
import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'

interface CartaoAoVivoProps {
  readonly bandeira: string | null
  /** Os primeiros números que a operadora devolveu (até 8); o desenho mostra os 6 primeiros. */
  readonly bin: string | null
  readonly nome: string
}

/**
 * O cartão que se desenha enquanto a pessoa digita (protótipo v2): a bandeira e os 6
 * primeiros números que a operadora reconheceu, e o nome. A validade fica escondida: ela
 * mora no campo seguro, e a página não a enxerga. É enfeite; o leitor de tela lê os campos.
 */
export function CartaoAoVivo({ bandeira, bin, nome }: CartaoAoVivoProps) {
  const seis = (bin ?? '').replace(/\D/g, '').slice(0, 6).padEnd(6, '•')
  const numero = `${seis.slice(0, 4)} ${seis.slice(4)}•• •••• ••••`
  return (
    <div
      aria-hidden="true"
      data-cartao-ao-vivo=""
      className="relative flex aspect-[1.586] w-full max-w-90 flex-col justify-between overflow-hidden rounded-xl bg-[image:var(--gradient-ink)] p-5 text-textonbrand"
    >
      <IconeMarca nome="check" destaque className="absolute -bottom-10 -right-8 size-52 opacity-15" />
      <div className="relative flex items-center justify-between gap-3">
        <span className="h-6 w-8 rounded-sm bg-marfim/60" />
        <span className="font-titulo text-sm font-extrabold tracking-wide">{bandeira ?? 'Cartão de crédito'}</span>
      </div>
      <span className="relative font-dados text-lg tracking-widest">{numero}</span>
      <div className="relative flex items-end justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-2xs uppercase tracking-widest opacity-70">Titular</span>
          <span className="block truncate font-titulo text-sm font-bold tracking-wide">{nome.trim().toUpperCase() || 'NOME NO CARTÃO'}</span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-2xs uppercase tracking-widest opacity-70">Validade</span>
          <span className="block font-dados text-sm">••/••</span>
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Implementar o formulário**

Crie `src/ui/pagamento/FormularioCartao.tsx`:

```tsx
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState } from 'react'
import {
  CAMPOS_NAO_CARREGARAM,
  campoDoErroDoToken,
  CONFIRA_O_CARTAO,
  DIGITE_O_CODIGO_DE_NOVO,
  ehCredito,
  errosDoCartao,
  mascararCpf,
  MENSAGEM_DO_CAMPO,
  ORDEM_DOS_CAMPOS,
  soDigitos,
  USE_CREDITO,
  type CampoDoCartao,
  type CampoSeguro,
  type EstadoDoCampo,
} from '@/domain/cartao.ts'
import { cn } from '@/lib/utils'
import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { AvisoPagamento } from './AvisoPagamento.tsx'
import { CampoDoFormulario } from './CampoDoFormulario.tsx'
import { CartaoAoVivo } from './CartaoAoVivo.tsx'
import { CAIXA, CAIXA_ERRO, CAIXA_FOCO_DENTRO, CAIXA_FOCO_INPUT } from './estiloDaCaixa.ts'
import {
  ErroDoCartao,
  estiloDosCampos,
  lerTokenDoTema,
  type ControleDoCartao,
  type CriarProcessador,
  type InfoDoCartao,
  type ProcessadorCartao,
} from './processadorCartao.ts'

type Erros = Partial<Record<CampoDoCartao, string>>

const VAZIOS: Readonly<Record<CampoSeguro, EstadoDoCampo>> = { numero: 'vazio', validade: 'vazio', codigo: 'vazio' }
const PLACEHOLDERS: Readonly<Record<CampoSeguro, string>> = { numero: '0000 0000 0000 0000', validade: 'MM/AA', codigo: '•••' }
const ROTULOS: Readonly<Record<CampoSeguro, string>> = { numero: 'Número do cartão', validade: 'Validade', codigo: 'Código de segurança' }

const semErro = (erros: Erros, campo: CampoDoCartao): Erros => {
  if (erros[campo] === undefined) return erros
  const resto = { ...erros }
  delete resto[campo]
  return resto
}

const descrito = (id: string, erro: string | undefined, temDica = false): string | undefined => (erro ? `${id}-erro` : temDica ? `${id}-dica` : undefined)

interface FormularioCartaoProps {
  readonly criarProcessador: CriarProcessador
  /** CA-371: enquanto o banco responde, os campos não mexem. */
  readonly travado: boolean
  /** Avisa quando dá para enviar: os campos abriram e o cartão é de crédito (CB-88, CA-369). */
  readonly aoMudarPronto: (pronto: boolean) => void
}

/**
 * O formulário do cartão de crédito (spec checkout-proprio): os três campos seguros da
 * operadora, dentro da caixa do site, mais o nome impresso e o CPF, que são nossos. É o
 * mesmo no checkout e em "Trocar cartão" (CA-379). Quem usa fala com ele pelo `ref`
 * (`ControleDoCartao`): `conferir()` mostra os erros e põe o foco no primeiro (CA-370);
 * `gerar()` troca o cartão pelo código de uso único (CB-90); `limparCodigo()` apaga o código
 * de segurança depois de uma recusa (CA-373).
 *
 * As cores dos campos seguros são lidas do tema quando o formulário abre (CA-368): os
 * campos vivem em iframes e não enxergam o CSS da página.
 */
export const FormularioCartao = forwardRef<ControleDoCartao, FormularioCartaoProps>(function FormularioCartao({ criarProcessador, travado, aoMudarPronto }, ref) {
  // Sem ":" no id: o script da operadora acha o alvo pelo id, e ":" quebra seletor de CSS.
  const idDoReact = useId()
  const base = `cartao-${idDoReact.replace(/[^a-zA-Z0-9]/g, '')}`
  const alvos = useMemo(() => ({ numero: `${base}-numero`, validade: `${base}-validade`, codigo: `${base}-codigo` }), [base])
  const processador = useRef<ProcessadorCartao | null>(null)
  const refNome = useRef<HTMLInputElement>(null)
  const refCpf = useRef<HTMLInputElement>(null)
  const [carga, setCarga] = useState<'carregando' | 'pronto' | 'falhou'>('carregando')
  const [seguros, setSeguros] = useState(VAZIOS)
  const [cartao, setCartao] = useState<InfoDoCartao | null>(null)
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [erros, setErros] = useState<Erros>({})

  useEffect(() => {
    const atual = criarProcessador()
    processador.current = atual
    let vivo = true
    atual
      .montar({ alvos, estilo: estiloDosCampos(lerTokenDoTema), placeholders: PLACEHOLDERS, rotulos: ROTULOS }, (evento) => {
        if (!vivo) return
        if (evento.tipo === 'cartao') {
          setCartao(evento.cartao)
          return
        }
        setSeguros((antes) => ({ ...antes, [evento.campo]: evento.valido ? 'valido' : 'invalido' }))
        if (evento.valido) setErros((antes) => semErro(antes, evento.campo))
      })
      .then(
        () => {
          if (vivo) setCarga('pronto')
        },
        () => {
          if (vivo) setCarga('falhou')
        },
      )
    return () => {
      vivo = false
      atual.desmontar()
      processador.current = null
    }
  }, [criarProcessador, alvos])

  const credito = ehCredito(cartao?.tipo ?? null)
  const pronto = carga === 'pronto' && credito
  useEffect(() => {
    aoMudarPronto(pronto)
  }, [pronto, aoMudarPronto])

  const focar = useCallback((campo: CampoDoCartao) => {
    if (campo === 'nome') refNome.current?.focus()
    else if (campo === 'cpf') refCpf.current?.focus()
    else processador.current?.focar(campo)
  }, [])

  useImperativeHandle(
    ref,
    (): ControleDoCartao => ({
      conferir() {
        const encontrados = errosDoCartao({ seguros, nome, cpf })
        if (!credito) encontrados.numero = USE_CREDITO
        setErros(encontrados)
        const primeiro = ORDEM_DOS_CAMPOS.find((campo) => encontrados[campo] !== undefined)
        if (primeiro) focar(primeiro)
        return primeiro === undefined
      },
      async gerar() {
        const atual = processador.current
        if (!atual) return { ok: false, erro: CAMPOS_NAO_CARREGARAM }
        try {
          return { ok: true, dados: await atual.gerarToken({ nome: nome.trim(), cpf: soDigitos(cpf) }) }
        } catch (falha) {
          const campo = falha instanceof ErroDoCartao ? campoDoErroDoToken(falha.codigos) : null
          if (campo) {
            setErros((antes) => ({ ...antes, [campo]: MENSAGEM_DO_CAMPO[campo].invalido }))
            focar(campo)
          }
          return { ok: false, erro: CONFIRA_O_CARTAO }
        }
      },
      limparCodigo() {
        processador.current?.limparCodigo()
        setSeguros((antes) => ({ ...antes, codigo: 'vazio' }))
        setErros((antes) => ({ ...antes, codigo: DIGITE_O_CODIGO_DE_NOVO }))
      },
    }),
    [seguros, nome, cpf, credito, focar],
  )

  const erroDoNumero = credito ? erros.numero : USE_CREDITO
  const caixaSegura = (erro: string | undefined) => cn(CAIXA, CAIXA_FOCO_DENTRO, erro && CAIXA_ERRO, travado && 'pointer-events-none opacity-60')
  const idNome = `${base}-nome`
  const idCpf = `${base}-cpf`

  return (
    <div className="flex flex-col gap-4">
      <CartaoAoVivo bandeira={cartao?.bandeira ?? null} bin={cartao?.bin ?? null} nome={nome} />
      {carga === 'falhou' ? <AvisoPagamento tipo="erro">{CAMPOS_NAO_CARREGARAM}</AvisoPagamento> : null}
      <fieldset disabled={travado} aria-busy={carga === 'carregando' || undefined} className="grid min-w-0 gap-3.5 sm:grid-cols-2">
        <legend className="sr-only">Dados do cartão de crédito</legend>

        <CampoDoFormulario id={alvos.numero} rotulo="Número do cartão" erro={erroDoNumero} seguro className="sm:col-span-2">
          <div role="group" aria-labelledby={`${alvos.numero}-rotulo`} aria-describedby={descrito(alvos.numero, erroDoNumero)} className={caixaSegura(erroDoNumero)}>
            <div id={alvos.numero} className="h-full min-w-0 flex-1" />
            {cartao ? (
              <span className="shrink-0 font-titulo text-xs font-bold text-muted-foreground">{cartao.bandeira}</span>
            ) : (
              <IconeMarca nome="cartao" className="text-textsubtle" />
            )}
          </div>
        </CampoDoFormulario>

        <CampoDoFormulario id={alvos.validade} rotulo="Validade" erro={erros.validade} seguro>
          <div role="group" aria-labelledby={`${alvos.validade}-rotulo`} aria-describedby={descrito(alvos.validade, erros.validade)} className={caixaSegura(erros.validade)}>
            <div id={alvos.validade} className="h-full min-w-0 flex-1" />
          </div>
        </CampoDoFormulario>

        <CampoDoFormulario id={alvos.codigo} rotulo="Código de segurança" erro={erros.codigo} dica="Os 3 números do verso" seguro>
          <div role="group" aria-labelledby={`${alvos.codigo}-rotulo`} aria-describedby={descrito(alvos.codigo, erros.codigo, true)} className={caixaSegura(erros.codigo)}>
            <div id={alvos.codigo} className="h-full min-w-0 flex-1" />
            <IconeMarca nome="cadeado" className="text-textsubtle" />
          </div>
        </CampoDoFormulario>

        <CampoDoFormulario id={idNome} rotulo="Nome impresso no cartão" erro={erros.nome} className="sm:col-span-2">
          <Input
            ref={refNome}
            id={idNome}
            value={nome}
            autoComplete="cc-name"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="Como está impresso"
            aria-invalid={erros.nome ? true : undefined}
            aria-describedby={descrito(idNome, erros.nome)}
            onChange={(e) => {
              setNome(e.target.value)
              setErros((antes) => semErro(antes, 'nome'))
            }}
            className={cn(CAIXA, CAIXA_FOCO_INPUT, erros.nome && CAIXA_ERRO)}
          />
        </CampoDoFormulario>

        <CampoDoFormulario id={idCpf} rotulo="CPF do titular" erro={erros.cpf} className="sm:col-span-2">
          <Input
            ref={refCpf}
            id={idCpf}
            value={cpf}
            inputMode="numeric"
            maxLength={14}
            placeholder="000.000.000-00"
            aria-invalid={erros.cpf ? true : undefined}
            aria-describedby={descrito(idCpf, erros.cpf)}
            onChange={(e) => {
              setCpf(mascararCpf(e.target.value))
              setErros((antes) => semErro(antes, 'cpf'))
            }}
            className={cn(CAIXA, CAIXA_FOCO_INPUT, 'numeros', erros.cpf && CAIXA_ERRO)}
          />
        </CampoDoFormulario>
      </fieldset>
    </div>
  )
})
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run src/ui/pagamento` → PASS. Depois `npm run check` → verde.

- [ ] **Step 7: Commit**

```bash
git add src/ui/pagamento/estiloDaCaixa.ts src/ui/pagamento/CampoDoFormulario.tsx src/ui/pagamento/AvisoPagamento.tsx src/ui/pagamento/CartaoAoVivo.tsx src/ui/pagamento/FormularioCartao.tsx src/ui/pagamento/processadorFalso.test-utils.ts src/ui/pagamento/FormularioCartao.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(pagamento): formulário do cartão com os campos seguros na caixa do site`

---

### Tarefa 9: Estado e tela de checkout

Cobre CA-366 a CA-375, CA-383 no checkout, CB-88 a CB-91, CB-95 e a parte do navegador de CA-378, CA-379, CB-92 e CB-93. O estado e a tela vão juntos porque a assinatura do `assinar` muda: separados, o `App` não compilaria entre os dois commits.

**Files:**
- Modify: `src/ui/estado/usarAssinatura.ts` (o arquivo inteiro)
- Modify: `src/ui/estado/usarAssinatura.test.ts` (o arquivo inteiro)
- Create: `src/ui/pagamento/AndamentoCheckout.tsx`
- Modify: `src/ui/publico/TelaCheckout.tsx` (o arquivo inteiro)
- Modify: `src/ui/publico/TelaCheckout.test.tsx` (o arquivo inteiro)
- Modify: `src/App.tsx` (um import e o bloco `rota.tela === 'assinar'`)
- Modify: `src/App.test.tsx:151`, `src/AppConta.test.tsx:13-21,147`
- Modify: `e2e/publico.spec.ts` (um teste novo no fim)

**Interfaces:**
- Consumes: `daLinhaAssinatura`, `SEM_ASSINATURA` (Tarefa 4); `depoisDeHoje`, `emReais`, `fraseDaAssinaturaAtiva`, `nomeComCiclo`, `proximaCobrancaPrevista` (Tarefa 4); `mensagemDaRecusa`, `SERVIDOR_FORA`, `ACEITE_FALTANDO`, `PAGAMENTO_INDISPONIVEL`, `DadosDoCartao` (Tarefa 5); `IconeMarca`, `PontosDaMarca` (Tarefa 6); `processadorDoSite`, `ControleDoCartao`, `CriarProcessador` (Tarefa 7); `FormularioCartao`, `AvisoPagamento`, `processadorFalso`, `CARTAO_APROVADO` (Tarefa 8); funções `assinar` e `gerenciar-assinatura` (Tarefas 2 e 3).
- Produces (o que a Tarefa 10 usa):

```ts
// src/ui/estado/usarAssinatura.ts
export type ResultadoDaAssinatura =
  | { readonly ok: true; readonly ativa: boolean; readonly proximaCobranca: string | null }
  | { readonly ok: false; readonly erro: string }
export type ResultadoDaMudanca = { readonly ok: true } | { readonly ok: false; readonly erro: string }
export const SEM_NUVEM: string
export const PEDIDO_EM_ANDAMENTO: string
export interface ValorAssinatura {
  readonly assinatura: Assinatura; readonly carregado: boolean; readonly carregando: boolean; readonly vagasRestantes: number | null
  readonly assinar: (plano: PlanoPago, ciclo: Ciclo, cartao: DadosDoCartao) => Promise<ResultadoDaAssinatura>
  readonly cancelar: () => Promise<ResultadoDaMudanca>
  readonly trocarCartao: (cartao: DadosDoCartao) => Promise<ResultadoDaMudanca>
  readonly recarregar: () => void
}
export function useAssinatura(temSessao: boolean): ValorAssinatura   // o segundo parâmetro (irParaPagamento) sai

// src/ui/pagamento/AndamentoCheckout.tsx
export function AndamentoCheckout(props: { atual: 'pagamento' | 'pronto' }): JSX.Element   // <ol aria-label="Andamento">

// src/ui/publico/TelaCheckout.tsx — props novas: criarProcessador (CriarProcessador | null), aoAssinar (no lugar de aoPagar), agora? (Date)
```

- [ ] **Step 1: Escrever os testes do estado**

Troque o conteúdo inteiro de `src/ui/estado/usarAssinatura.test.ts` por:

```ts
import { act, renderHook, waitFor } from '@testing-library/react'
import { CONFIRA_O_CARTAO, mensagemDaRecusa, SERVIDOR_FORA } from '@/domain/cartao.ts'
import { PEDIDO_EM_ANDAMENTO, useAssinatura, type ResultadoDaAssinatura, type ResultadoDaMudanca } from './usarAssinatura.ts'

const { cliente } = vi.hoisted(() => {
  const cliente = {
    linha: null as unknown,
    usadas: 14 as unknown,
    leituras: 0,
    colunas: [] as string[],
    invocar: vi.fn(),
    from: () => ({
      select: (colunas: string) => {
        cliente.colunas.push(colunas)
        return {
          maybeSingle: async () => {
            cliente.leituras += 1
            return { data: cliente.linha }
          },
        }
      },
    }),
    rpc: async () => ({ data: cliente.usadas }),
    functions: { invoke: (...args: unknown[]) => cliente.invocar(...args) },
  }
  return { cliente }
})

vi.mock('./supabase.ts', () => ({ obterSupabase: () => cliente }))

const CARTAO = { token: 'tok_teste_1', bandeira: 'Mastercard', final: '6351' }

/** Erro de função com corpo, como o supabase-js entrega (a resposta fica em `context`). */
const respondeu = (status: number, corpo: unknown) => ({ data: null, error: { context: { status, json: async () => corpo } } })

async function aberto() {
  const hook = renderHook(() => useAssinatura(true))
  await waitFor(() => expect(hook.result.current.carregado).toBe(true))
  return hook
}

describe('useAssinatura (spec checkout-proprio)', () => {
  beforeEach(() => {
    cliente.linha = null
    cliente.usadas = 14
    cliente.leituras = 0
    cliente.colunas = []
    cliente.invocar.mockReset()
  })

  it('sem sessão já está carregado, no Free', () => {
    const { result } = renderHook(() => useAssinatura(false))
    expect(result.current.carregado).toBe(true)
    expect(result.current.assinatura.plano).toBe('free')
  })

  it('com sessão, lê a linha inteira (o 008 pode ainda não ter rodado) e só então marca carregado', async () => {
    cliente.linha = { plano: 'solo', status: 'ativa', preco_travado: true, cartao_bandeira: 'Mastercard', cartao_final: '6351' }
    const { result } = renderHook(() => useAssinatura(true))
    expect(result.current.carregado).toBe(false)
    await waitFor(() => expect(result.current.carregado).toBe(true))
    expect(result.current.assinatura).toMatchObject({ plano: 'solo', cartaoBandeira: 'Mastercard', cartaoFinal: '6351' })
    expect(cliente.colunas).toEqual(['*'])
  })

  it('CA-160: conta quantas vagas de fundador sobram', async () => {
    const { result } = renderHook(() => useAssinatura(true))
    await waitFor(() => expect(result.current.vagasRestantes).toBe(186))
  })

  it('CA-160: sem resposta do servidor, a contagem fica nula', async () => {
    cliente.usadas = null
    const { result } = await aberto()
    expect(result.current.vagasRestantes).toBeNull()
  })

  it('CA-375: manda plano, ciclo e o código do cartão ao servidor, nunca o preço', async () => {
    cliente.invocar.mockResolvedValue({ data: { status: 'ativa', proximaCobranca: '2026-11-02T15:00:00.000Z', cartao: { bandeira: 'Mastercard', final: '6351' } }, error: null })
    const { result } = await aberto()
    let resposta: ResultadoDaAssinatura | null = null
    await act(async () => {
      resposta = await result.current.assinar('pro', 'anual', CARTAO)
    })
    expect(cliente.invocar).toHaveBeenCalledWith('assinar', {
      body: { plano: 'pro', ciclo: 'anual', card_token_id: 'tok_teste_1', cartao: { bandeira: 'Mastercard', final: '6351' } },
    })
    expect(resposta).toEqual({ ok: true, ativa: true, proximaCobranca: '2026-11-02T15:00:00.000Z' })
  })

  it('CA-372: autorizada, a assinatura é lida de novo e o plano pago já vale no app', async () => {
    cliente.invocar.mockImplementation(async () => {
      cliente.linha = { plano: 'solo', status: 'ativa' }
      return { data: { status: 'ativa', proximaCobranca: null }, error: null }
    })
    const { result } = await aberto()
    expect(result.current.assinatura.plano).toBe('free')
    await act(async () => {
      await result.current.assinar('solo', 'mensal', CARTAO)
    })
    await waitFor(() => expect(result.current.assinatura.plano).toBe('solo'))
  })

  it('o banco ainda confirmando volta como pedido aceito, mas não ativo', async () => {
    cliente.invocar.mockResolvedValue({ data: { status: 'pendente', proximaCobranca: '2026-11-02T15:00:00.000Z' }, error: null })
    const { result } = await aberto()
    await act(async () => {
      expect(await result.current.assinar('solo', 'mensal', CARTAO)).toEqual({ ok: true, ativa: false, proximaCobranca: '2026-11-02T15:00:00.000Z' })
    })
  })

  it('CA-373: a recusa do banco volta com o motivo em português', async () => {
    cliente.invocar.mockResolvedValue(respondeu(402, { erro: 'O banco recusou este cartão.', codigo: 'cc_rejected_insufficient_amount' }))
    const { result } = await aberto()
    await act(async () => {
      expect(await result.current.assinar('solo', 'mensal', CARTAO)).toEqual({ ok: false, erro: mensagemDaRecusa('cc_rejected_insufficient_amount') })
    })
  })

  it('CB-90: código do cartão vencido ou usado pede para conferir o cartão de novo', async () => {
    cliente.invocar.mockResolvedValue(respondeu(402, { erro: 'x', codigo: 'token-invalido' }))
    const { result } = await aberto()
    await act(async () => {
      expect(await result.current.assinar('solo', 'mensal', CARTAO)).toEqual({ ok: false, erro: CONFIRA_O_CARTAO })
    })
  })

  it('CA-374: sem resposta do servidor (rede), a frase de servidor fora', async () => {
    const { result } = await aberto()
    cliente.invocar.mockResolvedValueOnce({ data: null, error: new Error('Failed to fetch') })
    cliente.invocar.mockRejectedValueOnce(new Error('caiu'))
    await act(async () => {
      expect(await result.current.assinar('solo', 'mensal', CARTAO)).toEqual({ ok: false, erro: SERVIDOR_FORA })
      expect(await result.current.assinar('solo', 'mensal', CARTAO)).toEqual({ ok: false, erro: SERVIDOR_FORA })
    })
  })

  it('CB-91: a frase do servidor passa como veio quando não é recusa de cartão', async () => {
    cliente.invocar.mockResolvedValue(respondeu(409, { erro: 'Você já tem uma assinatura ativa. A troca de plano ainda não é feita pelo site.' }))
    const { result } = await aberto()
    await act(async () => {
      expect(await result.current.assinar('solo', 'mensal', CARTAO)).toEqual({ ok: false, erro: 'Você já tem uma assinatura ativa. A troca de plano ainda não é feita pelo site.' })
    })
  })

  it('CA-378: cancelar pede ao servidor e lê a assinatura de novo', async () => {
    cliente.invocar.mockResolvedValue({ data: { status: 'cancelada', expiraEm: '2026-11-02T02:59:59.000Z' }, error: null })
    const { result } = await aberto()
    const antes = cliente.leituras
    await act(async () => {
      expect(await result.current.cancelar()).toEqual({ ok: true })
    })
    expect(cliente.invocar).toHaveBeenCalledWith('gerenciar-assinatura', { body: { acao: 'cancelar' } })
    await waitFor(() => expect(cliente.leituras).toBeGreaterThan(antes))
  })

  it('CB-93: cancelamento que falha também lê a assinatura de novo, para a tela mostrar o que o servidor tem', async () => {
    cliente.invocar.mockResolvedValue({ data: null, error: new Error('Failed to fetch') })
    const { result } = await aberto()
    const antes = cliente.leituras
    await act(async () => {
      expect(await result.current.cancelar()).toEqual({ ok: false, erro: SERVIDOR_FORA })
    })
    await waitFor(() => expect(cliente.leituras).toBeGreaterThan(antes))
  })

  it('CA-379: trocar o cartão manda o código novo; a recusa volta em português', async () => {
    const { result } = await aberto()
    cliente.invocar.mockResolvedValueOnce({ data: { cartao: { bandeira: 'Mastercard', final: '6351' } }, error: null })
    cliente.invocar.mockResolvedValueOnce(respondeu(402, { erro: 'x', codigo: 'cc_rejected_bad_filled_security_code' }))
    await act(async () => {
      expect(await result.current.trocarCartao(CARTAO)).toEqual({ ok: true })
      expect(await result.current.trocarCartao(CARTAO)).toEqual({ ok: false, erro: mensagemDaRecusa('cc_rejected_bad_filled_security_code') })
    })
    expect(cliente.invocar).toHaveBeenCalledWith('gerenciar-assinatura', {
      body: { acao: 'trocar_cartao', card_token_id: 'tok_teste_1', cartao: { bandeira: 'Mastercard', final: '6351' } },
    })
  })

  it('CB-92 e foco 5: dois pedidos ao mesmo tempo viram um só', async () => {
    let terminar: (valor: unknown) => void = () => undefined
    cliente.invocar.mockImplementation(
      () =>
        new Promise((resolver) => {
          terminar = resolver
        }),
    )
    const { result } = await aberto()
    let primeiro: Promise<ResultadoDaMudanca> = Promise.resolve({ ok: true })
    let segundo: ResultadoDaMudanca | null = null
    await act(async () => {
      primeiro = result.current.cancelar()
      segundo = await result.current.trocarCartao(CARTAO)
    })
    expect(segundo).toEqual({ ok: false, erro: PEDIDO_EM_ANDAMENTO })
    expect(cliente.invocar).toHaveBeenCalledTimes(1)
    await act(async () => {
      terminar({ data: { status: 'cancelada', expiraEm: null }, error: null })
      await primeiro
    })
  })
})
```

- [ ] **Step 2: Escrever os testes da tela**

Troque o conteúdo inteiro de `src/ui/publico/TelaCheckout.test.tsx` por:

```tsx
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { SEM_ASSINATURA, type Assinatura } from '@/domain/assinatura.ts'
import { CAMPOS_NAO_CARREGARAM, RECUSA_PADRAO, SERVIDOR_FORA } from '@/domain/cartao.ts'
import type { Ciclo } from '@/domain/conta.ts'
import type { ResultadoDaAssinatura } from '../estado/usarAssinatura.ts'
import type { PlanoPago } from '../navegacao.ts'
import { CARTAO_APROVADO, processadorFalso, type ProcessadorFalso } from '../pagamento/processadorFalso.test-utils.ts'
import { TelaCheckout } from './TelaCheckout.tsx'

/** 02/10/2026, meio-dia em Brasília. */
const AGORA = new Date('2026-10-02T15:00:00Z')
const ATIVA: ResultadoDaAssinatura = { ok: true, ativa: true, proximaCobranca: '2026-11-02T15:00:00.000Z' }

interface Sobre {
  readonly plano?: PlanoPago
  readonly ciclo?: Ciclo
  readonly vagas?: number | null
  readonly assinatura?: Assinatura
  readonly disponivel?: boolean
  readonly semChave?: boolean
  readonly falso?: ProcessadorFalso
  readonly aoAssinar?: () => Promise<ResultadoDaAssinatura>
}

async function montar(sobre: Sobre = {}) {
  const falso = sobre.falso ?? processadorFalso()
  const props = {
    plano: sobre.plano ?? ('solo' as const),
    ciclo: sobre.ciclo ?? ('mensal' as const),
    email: 'maria@exemplo.com',
    assinaturaAtual: sobre.assinatura ?? SEM_ASSINATURA,
    vagasRestantes: sobre.vagas === undefined ? 186 : sobre.vagas,
    disponivel: sobre.disponivel ?? true,
    criarProcessador: sobre.semChave ? null : falso.criar,
    aoTrocar: vi.fn(),
    aoAssinar: vi.fn(sobre.aoAssinar ?? (async () => ATIVA)),
    aoIrParaPainel: vi.fn(),
    aoIrParaInicio: vi.fn(),
    agora: AGORA,
  }
  const tela = render(<TelaCheckout {...props} />)
  // A montagem dos campos seguros termina numa promessa: espera ela antes de olhar.
  await act(async () => {})
  return { ...props, ...tela, falso, usuario: userEvent.setup() }
}

async function preencherTudo(usuario: UserEvent, falso: ProcessadorFalso) {
  falso.preencher()
  await usuario.type(screen.getByRole('textbox', { name: 'Nome impresso no cartão' }), 'APRO')
  await usuario.type(screen.getByRole('textbox', { name: 'CPF do titular' }), '12345678909')
  await usuario.click(screen.getByRole('checkbox', { name: /Autorizo a cobrança/ }))
}

const botaoAssinar = () => screen.getByRole('button', { name: /^Assinar por/ })
const semIconeDeBiblioteca = () => expect(document.querySelectorAll('svg:not([data-icone])')).toHaveLength(0)

describe('TelaCheckout (spec checkout-proprio)', () => {
  it('CA-366: ciclo, planos, o formulário do cartão, o resumo, a autorização e o botão', async () => {
    await montar()
    expect(screen.getByRole('heading', { level: 1, name: 'Assine o MetaNutri' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Período de cobrança' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Plano' })).toBeInTheDocument()
    expect(screen.getAllByText('25 pacientes ativos').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { level: 2, name: 'Cartão de crédito' })).toBeInTheDocument()
    for (const campo of ['Número do cartão', 'Validade', 'Código de segurança']) expect(screen.getByRole('group', { name: campo })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nome impresso no cartão' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'CPF do titular' })).toBeInTheDocument()
    const resumo = screen.getByRole('region', { name: 'Resumo' })
    for (const texto of ['Você paga hoje', 'R$ 34,90', 'Solo, mensal', 'Próxima cobrança', '2 de novembro de 2026', 'Recibo para', 'maria@exemplo.com', 'Depois, R$ 34,90 todo dia 2. Cancele quando quiser.']) {
      expect(resumo).toHaveTextContent(texto)
    }
    expect(screen.getByRole('checkbox', { name: 'Autorizo a cobrança de R$ 34,90 todo mês neste cartão até eu cancelar, e li os Termos de uso.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Termos de uso' })).toHaveAttribute('href', '#/termos')
    expect(botaoAssinar()).toHaveAccessibleName('Assinar por R$ 34,90/mês')
  })

  it('CA-366: no anual, o ano inteiro, quanto sai por mês, o desconto e a cobrança de um ano depois', async () => {
    await montar({ ciclo: 'anual' })
    expect(botaoAssinar()).toHaveAccessibleName('Assinar por R$ 299,00/ano')
    expect(screen.getByRole('checkbox', { name: /R\$ 299,00 todo ano neste cartão/ })).toBeInTheDocument()
    const resumo = screen.getByRole('region', { name: 'Resumo' })
    expect(resumo).toHaveTextContent('Solo, anual')
    expect(resumo).toHaveTextContent('2 de outubro de 2027')
    expect(resumo).toHaveTextContent('Depois, R$ 299,00 todo ano, em 2 de outubro. Cancele quando quiser.')
    expect(screen.getByText(/Sai R\$ 24,92 por mês/)).toBeInTheDocument()
    expect(screen.getByText('−29%')).toBeInTheDocument()
  })

  it('CA-158: trocar o ciclo ou o plano avisa quem manda', async () => {
    const { usuario, aoTrocar } = await montar()
    await usuario.click(screen.getByRole('radio', { name: /Anual/ }))
    expect(aoTrocar).toHaveBeenCalledWith('solo', 'anual')
    await usuario.click(screen.getByRole('radio', { name: /Pro/ }))
    expect(aoTrocar).toHaveBeenCalledWith('pro', 'mensal')
  })

  it('CA-160: o preço de fundador, com a contagem; some quando acabam as vagas', async () => {
    const { unmount } = await montar({ vagas: 186 })
    expect(screen.getByText(/Restam 186 de 200 vagas/)).toBeInTheDocument()
    unmount()
    await montar({ vagas: 0 })
    expect(screen.queryByText(/Preço de fundador/)).not.toBeInTheDocument()
  })

  it('CA-367: nada cita o processador, e o aviso de segurança fala da operadora e do cartão', async () => {
    await montar()
    expect(document.body.textContent).not.toMatch(/mercado ?pago/i)
    expect(screen.getByText('O número do cartão vai criptografado direto para a operadora de pagamento. O MetaNutri não vê nem guarda o cartão.')).toBeInTheDocument()
    expect(screen.getByText('Pagamento protegido')).toBeInTheDocument()
  })

  it('CA-369: débito ou pré-pago avisa e deixa o botão parado', async () => {
    const { falso } = await montar()
    falso.preencher()
    await waitFor(() => expect(botaoAssinar()).toBeEnabled())
    falso.emitir({ tipo: 'cartao', cartao: { bandeira: 'Elo', tipo: 'debit_card', bin: '50677667' } })
    expect(screen.getByText('Use um cartão de crédito.')).toBeInTheDocument()
    expect(botaoAssinar()).toBeDisabled()
  })

  it('CA-370: sem nada preenchido, os erros aparecem, nada é enviado e o foco vai para o número', async () => {
    const { usuario, falso, aoAssinar } = await montar()
    await usuario.click(botaoAssinar())
    expect(screen.getByText('Digite o número do cartão.')).toBeInTheDocument()
    expect(screen.getByText('Digite o CPF do titular do cartão.')).toBeInTheDocument()
    expect(screen.getByText('Marque a autorização da cobrança para assinar.')).toBeInTheDocument()
    expect(falso.focos).toEqual(['numero'])
    expect(aoAssinar).not.toHaveBeenCalled()
  })

  it('CA-370: com o cartão certo e sem a autorização, o foco vai para a caixa de autorização', async () => {
    const { usuario, falso, aoAssinar } = await montar()
    falso.preencher()
    await usuario.type(screen.getByRole('textbox', { name: 'Nome impresso no cartão' }), 'APRO')
    await usuario.type(screen.getByRole('textbox', { name: 'CPF do titular' }), '12345678909')
    await usuario.click(botaoAssinar())
    expect(screen.getByRole('checkbox', { name: /Autorizo a cobrança/ })).toHaveFocus()
    expect(screen.getByText('Marque a autorização da cobrança para assinar.')).toBeInTheDocument()
    expect(aoAssinar).not.toHaveBeenCalled()
  })

  it('CA-371, CA-375 e foco 5: confirmando com o banco, campos travados, um pedido só, e só plano, ciclo e cartão', async () => {
    let terminar: (resultado: ResultadoDaAssinatura) => void = () => undefined
    const { usuario, falso, aoAssinar } = await montar({
      plano: 'pro',
      ciclo: 'anual',
      aoAssinar: () =>
        new Promise<ResultadoDaAssinatura>((resolver) => {
          terminar = resolver
        }),
    })
    await preencherTudo(usuario, falso)
    await usuario.dblClick(botaoAssinar())
    await waitFor(() => expect(aoAssinar).toHaveBeenCalledTimes(1))
    expect(aoAssinar).toHaveBeenCalledWith('pro', 'anual', CARTAO_APROVADO)
    expect(screen.getByRole('button', { name: 'Confirmando com o banco…' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Nome impresso no cartão' })).toBeDisabled()
    expect(falso.tokens).toHaveLength(1)
    await act(async () => terminar(ATIVA))
  })

  it('CA-372: banco autorizou: "Assinatura ativa" com plano, ciclo, e-mail e próxima cobrança, e o painel', async () => {
    const { usuario, falso, aoIrParaPainel } = await montar()
    await preencherTudo(usuario, falso)
    await usuario.click(botaoAssinar())
    expect(await screen.findByRole('heading', { level: 1, name: 'Assinatura ativa' })).toBeInTheDocument()
    expect(screen.getByText('Plano Solo, mensal. O recibo vai para maria@exemplo.com e a próxima cobrança é em 2 de novembro de 2026.')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Andamento' })).getByText('Pronto').closest('li')).toHaveAttribute('aria-current', 'step')
    await usuario.click(screen.getByRole('button', { name: 'Ir para o painel' }))
    expect(aoIrParaPainel).toHaveBeenCalledOnce()
  })

  it('banco ainda confirmando: "Pagamento em análise", e vale o Free até lá', async () => {
    const { usuario, falso } = await montar({ aoAssinar: async () => ({ ok: true, ativa: false, proximaCobranca: null }) })
    await preencherTudo(usuario, falso)
    await usuario.click(botaoAssinar())
    expect(await screen.findByRole('heading', { level: 1, name: 'Pagamento em análise' })).toBeInTheDocument()
    expect(screen.getByText(/Até lá, vale o Free/)).toBeInTheDocument()
  })

  it('CA-373: banco recusou: a mensagem aparece, o código de segurança é apagado e dá para tentar de novo', async () => {
    const { usuario, falso } = await montar({ aoAssinar: async () => ({ ok: false, erro: RECUSA_PADRAO }) })
    await preencherTudo(usuario, falso)
    await usuario.click(botaoAssinar())
    expect(await screen.findByText(RECUSA_PADRAO)).toBeInTheDocument()
    expect(falso.limpezas).toBe(1)
    expect(screen.getByText('Digite o código de novo.')).toBeInTheDocument()
    expect(botaoAssinar()).toBeEnabled()
    expect(screen.getByRole('textbox', { name: 'Nome impresso no cartão' })).toBeEnabled()
    expect(screen.getByRole('heading', { level: 1, name: 'Assine o MetaNutri' })).toBeInTheDocument()
  })

  it('CA-374: servidor fora: a mensagem, e o formulário volta a funcionar', async () => {
    const { usuario, falso } = await montar({ aoAssinar: async () => ({ ok: false, erro: SERVIDOR_FORA }) })
    await preencherTudo(usuario, falso)
    await usuario.click(botaoAssinar())
    expect(await screen.findByText(SERVIDOR_FORA)).toBeInTheDocument()
    expect(botaoAssinar()).toBeEnabled()
  })

  it('CB-90: cada envio gera um código novo do cartão', async () => {
    const { usuario, falso } = await montar({ aoAssinar: async () => ({ ok: false, erro: RECUSA_PADRAO }) })
    await preencherTudo(usuario, falso)
    await usuario.click(botaoAssinar())
    await screen.findByText(RECUSA_PADRAO)
    falso.emitir({ tipo: 'validade', campo: 'codigo', valido: true })
    await usuario.click(botaoAssinar())
    await waitFor(() => expect(falso.tokens).toHaveLength(2))
  })

  it('CB-88: campos que não abrem avisam e deixam o botão parado', async () => {
    const falso = processadorFalso()
    falso.falharAoMontar = true
    await montar({ falso })
    expect(screen.getByText(CAMPOS_NAO_CARREGARAM)).toBeInTheDocument()
    expect(botaoAssinar()).toBeDisabled()
  })

  it('CB-89: sem a chave pública, "O pagamento não está disponível agora." e nada do formulário', async () => {
    const { falso } = await montar({ semChave: true })
    expect(screen.getByText('O pagamento não está disponível agora.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Número do cartão' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Assinar por/ })).not.toBeInTheDocument()
    expect(falso.criados).toBe(0)
  })

  it('CB-91 e CA-163: quem já assina vê o aviso de hoje e não há formulário', async () => {
    const { falso } = await montar({ assinatura: { ...SEM_ASSINATURA, plano: 'solo', planoPedido: 'solo', status: 'ativa' } })
    expect(screen.getByText(/Você já tem uma assinatura ativa: Solo/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Assinar por/ })).not.toBeInTheDocument()
    expect(falso.criados).toBe(0)
  })

  it('CA-380: quem cancelou e ainda está no prazo pode assinar de novo', async () => {
    await montar({ assinatura: { ...SEM_ASSINATURA, plano: 'solo', planoPedido: 'solo', status: 'cancelada', expiraEm: '2026-11-02T02:59:59.000Z' } })
    expect(botaoAssinar()).toBeInTheDocument()
  })

  it('CB-95: quem está no Estudante sabe que o pago fica no lugar dele quando o banco autorizar', async () => {
    await montar({ assinatura: { ...SEM_ASSINATURA, plano: 'estudante', planoPedido: 'estudante', status: 'ativa' } })
    expect(screen.getByRole('status')).toHaveTextContent('Você está no plano Estudante. Quando o banco autorizar o cartão, o plano pago fica no lugar dele.')
    expect(botaoAssinar()).toBeInTheDocument()
  })

  it('sem a conta na nuvem, avisa e não abre o formulário', async () => {
    const { falso } = await montar({ disponivel: false })
    expect(screen.getByText('A conta na nuvem não está configurada neste MetaNutri.')).toBeInTheDocument()
    expect(falso.criados).toBe(0)
  })

  it('CA-383: nenhum ícone de biblioteca nem símbolo de texto; o andamento é de pontos', async () => {
    const { container, usuario, falso } = await montar()
    semIconeDeBiblioteca()
    expect(container.textContent).not.toMatch(/[✓✔★☆]|\p{Extended_Pictographic}/u)
    const andamento = screen.getByRole('list', { name: 'Andamento' })
    expect(andamento).toHaveTextContent('ContaPlanoPagamentoPronto')
    expect(within(andamento).getByText('Pagamento').closest('li')).toHaveAttribute('aria-current', 'step')
    await preencherTudo(usuario, falso)
    await usuario.click(botaoAssinar())
    await screen.findByRole('heading', { level: 1, name: 'Assinatura ativa' })
    semIconeDeBiblioteca()
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/ui/estado/usarAssinatura.test.ts src/ui/publico/TelaCheckout.test.tsx`
Expected: FAIL — o estado ainda leva ao pagamento por link e a tela ainda é a de "Revise sua assinatura".

- [ ] **Step 4: Implementar o estado**

Troque o conteúdo inteiro de `src/ui/estado/usarAssinatura.ts` por:

```ts
// Lê a assinatura da conta e manda assinar, cancelar e trocar o cartão (spec
// checkout-proprio). O preço não passa por aqui (CA-375): o navegador manda o plano, o
// ciclo e o código de uso único do cartão, e quem decide o valor é a função `assinar`.
// Um pedido por vez (CA-371, CB-92). Depois de cada resposta, a linha é lida de novo,
// para a tela mostrar o que o servidor gravou (CA-372, CB-93).
import { useCallback, useEffect, useRef, useState } from 'react'
import { daLinhaAssinatura, SEM_ASSINATURA, type Assinatura } from '@/domain/assinatura.ts'
import { mensagemDaRecusa, SERVIDOR_FORA, type DadosDoCartao } from '@/domain/cartao.ts'
import { VAGAS_PRECO_FUNDADOR, type Ciclo } from '@/domain/conta.ts'
import type { PlanoPago } from '../navegacao.ts'
import { obterSupabase } from './supabase.ts'

export type ResultadoDaAssinatura =
  | { readonly ok: true; readonly ativa: boolean; readonly proximaCobranca: string | null }
  | { readonly ok: false; readonly erro: string }

export type ResultadoDaMudanca = { readonly ok: true } | { readonly ok: false; readonly erro: string }

export interface ValorAssinatura {
  readonly assinatura: Assinatura
  /** A primeira resposta do servidor chegou (ou não há sessão, ou não há servidor). */
  readonly carregado: boolean
  /** Um pedido de assinar, cancelar ou trocar o cartão está em andamento. */
  readonly carregando: boolean
  /** Vagas de preço de fundador que sobram. `null` quando o servidor não respondeu (CA-160). */
  readonly vagasRestantes: number | null
  readonly assinar: (plano: PlanoPago, ciclo: Ciclo, cartao: DadosDoCartao) => Promise<ResultadoDaAssinatura>
  readonly cancelar: () => Promise<ResultadoDaMudanca>
  readonly trocarCartao: (cartao: DadosDoCartao) => Promise<ResultadoDaMudanca>
  readonly recarregar: () => void
}

export const SEM_NUVEM = 'A conta na nuvem não está configurada neste MetaNutri.'
export const PEDIDO_EM_ANDAMENTO = 'Espere terminar o pedido anterior.'

/** O que deu errado: `status` nulo é rede ou servidor fora (CA-374). */
interface Falha {
  readonly status: number | null
  readonly erro: string | null
  readonly codigo: string | null
}

const SEM_RESPOSTA: Falha = { status: null, erro: null, codigo: null }

const ehResposta = (valor: unknown): valor is { readonly status: number; json(): Promise<unknown> } =>
  typeof valor === 'object' &&
  valor !== null &&
  typeof (valor as { readonly status?: unknown }).status === 'number' &&
  typeof (valor as { readonly json?: unknown }).json === 'function'

/** A função responde erro com `{ erro, codigo }` no corpo; o supabase-js guarda a resposta em `context`. */
async function lerFalha(erro: unknown): Promise<Falha> {
  const contexto = typeof erro === 'object' && erro !== null && 'context' in erro ? (erro as { readonly context: unknown }).context : null
  if (!ehResposta(contexto)) return SEM_RESPOSTA
  try {
    const corpo: unknown = await contexto.json()
    const o = typeof corpo === 'object' && corpo !== null ? (corpo as Record<string, unknown>) : {}
    const frase = o['erro']
    const codigo = o['codigo']
    return { status: contexto.status, erro: typeof frase === 'string' ? frase : null, codigo: typeof codigo === 'string' ? codigo : null }
  } catch {
    return { status: contexto.status, erro: null, codigo: null }
  }
}

/** CA-373 e CB-90: a recusa (402) em português pelo código; o resto, a frase do servidor; sem resposta, CA-374. */
function mensagemDaFalha(falha: Falha): string {
  if (falha.status === null) return SERVIDOR_FORA
  if (falha.status === 402) return mensagemDaRecusa(falha.codigo)
  return falha.erro ?? SERVIDOR_FORA
}

async function chamar<T>(nome: string, corpo: Record<string, unknown>): Promise<{ readonly dados: T | null; readonly falha: Falha | null }> {
  const cliente = obterSupabase()
  if (!cliente) return { dados: null, falha: { status: 0, erro: SEM_NUVEM, codigo: null } }
  try {
    const { data, error } = await cliente.functions.invoke<T>(nome, { body: corpo })
    if (error) return { dados: null, falha: await lerFalha(error) }
    return { dados: data, falha: null }
  } catch {
    return { dados: null, falha: SEM_RESPOSTA }
  }
}

/** D-70: o navegador manda o código do cartão e, para mostrar em Conta e plano, a bandeira e o final. */
const doCartao = (cartao: DadosDoCartao) => ({ card_token_id: cartao.token, cartao: { bandeira: cartao.bandeira, final: cartao.final } })

export function useAssinatura(temSessao: boolean): ValorAssinatura {
  // Guardar a chave junto com o resultado deixa "sem assinatura" ser derivado do
  // render. Se o efeito tivesse que zerar o estado ao sair da conta, seria um
  // setState dentro de efeito, que dispara renderização em cascata.
  const [carga, setCarga] = useState<{ readonly chave: string; readonly assinatura: Assinatura } | null>(null)
  const [usadas, setUsadas] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [versao, setVersao] = useState(0)
  const [cliente] = useState(() => obterSupabase())
  const ocupado = useRef(false)

  const chave = temSessao ? `com-sessao:${versao}` : 'sem-sessao'
  const assinatura = carga?.chave === chave ? carga.assinatura : SEM_ASSINATURA
  const carregado = !temSessao || cliente === null || carga?.chave === chave

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useEffect(() => {
    if (!cliente || !temSessao) return
    let vivo = true
    // A linha inteira: se o 008 ainda não rodou no banco, as colunas do cartão só faltam, e nada quebra.
    void cliente
      .from('assinaturas')
      .select('*')
      .maybeSingle()
      .then(({ data }) => {
        if (vivo) setCarga({ chave, assinatura: daLinhaAssinatura(data) })
      })
    return () => {
      vivo = false
    }
  }, [cliente, temSessao, chave])

  useEffect(() => {
    if (!cliente) return
    let vivo = true
    void cliente.rpc('vagas_de_fundador_usadas').then(({ data }) => {
      if (vivo) setUsadas(typeof data === 'number' ? data : null)
    })
    return () => {
      vivo = false
    }
  }, [cliente])

  /** Um pedido por vez: o segundo, enquanto o primeiro corre, nem sai (CA-371, CB-92). */
  const umPorVez = useCallback(async <T>(ocupadoAgora: T, fazer: () => Promise<T>): Promise<T> => {
    if (ocupado.current) return ocupadoAgora
    ocupado.current = true
    setCarregando(true)
    try {
      return await fazer()
    } finally {
      ocupado.current = false
      setCarregando(false)
    }
  }, [])

  const assinar = useCallback(
    (plano: PlanoPago, ciclo: Ciclo, cartao: DadosDoCartao) =>
      umPorVez<ResultadoDaAssinatura>({ ok: false, erro: PEDIDO_EM_ANDAMENTO }, async () => {
        const { dados, falha } = await chamar<{ readonly status?: unknown; readonly proximaCobranca?: unknown }>('assinar', { plano, ciclo, ...doCartao(cartao) })
        if (falha) return { ok: false, erro: mensagemDaFalha(falha) }
        // CA-372: o plano pago já vale no app, lido do servidor.
        recarregar()
        const proxima = dados?.proximaCobranca
        return { ok: true, ativa: dados?.status === 'ativa', proximaCobranca: typeof proxima === 'string' ? proxima : null }
      }),
    [umPorVez, recarregar],
  )

  const cancelar = useCallback(
    () =>
      umPorVez<ResultadoDaMudanca>({ ok: false, erro: PEDIDO_EM_ANDAMENTO }, async () => {
        const { falha } = await chamar('gerenciar-assinatura', { acao: 'cancelar' })
        // CB-93: deu certo ou não, a tela passa a mostrar o que o servidor tem.
        recarregar()
        return falha ? { ok: false, erro: mensagemDaFalha(falha) } : { ok: true }
      }),
    [umPorVez, recarregar],
  )

  const trocarCartao = useCallback(
    (cartao: DadosDoCartao) =>
      umPorVez<ResultadoDaMudanca>({ ok: false, erro: PEDIDO_EM_ANDAMENTO }, async () => {
        const { falha } = await chamar('gerenciar-assinatura', { acao: 'trocar_cartao', ...doCartao(cartao) })
        recarregar()
        return falha ? { ok: false, erro: mensagemDaFalha(falha) } : { ok: true }
      }),
    [umPorVez, recarregar],
  )

  const vagasRestantes = usadas === null ? null : Math.max(0, VAGAS_PRECO_FUNDADOR - usadas)
  return { assinatura, carregado, carregando, vagasRestantes, assinar, cancelar, trocarCartao, recarregar }
}
```

- [ ] **Step 5: Implementar o andamento**

Crie `src/ui/pagamento/AndamentoCheckout.tsx`:

```tsx
import { Fragment } from 'react'
import { cn } from '@/lib/utils'

const PASSOS = [
  { chave: 'conta', rotulo: 'Conta', ponto: 'size-2.5' },
  { chave: 'plano', rotulo: 'Plano', ponto: 'size-3.5' },
  { chave: 'pagamento', rotulo: 'Pagamento', ponto: 'size-5' },
  { chave: 'pronto', rotulo: 'Pronto', ponto: 'size-6' },
] as const

/**
 * O andamento do checkout com os pontos da logo, que crescem a cada passo (protótipo v2,
 * CA-383), no lugar de "✓ Conta · 2 Plano". O passo de agora ganha um halo; o "Pronto"
 * fica laranja quando a assinatura é aprovada, como a última bolinha da logo.
 */
export function AndamentoCheckout({ atual }: { readonly atual: 'pagamento' | 'pronto' }) {
  const indiceAtual = PASSOS.findIndex((passo) => passo.chave === atual)
  return (
    <ol aria-label="Andamento" className="flex items-end">
      {PASSOS.map((passo, i) => {
        const feito = i < indiceAtual
        const agora = i === indiceAtual
        const ultimo = passo.chave === 'pronto'
        return (
          <Fragment key={passo.chave}>
            {i > 0 ? <li aria-hidden="true" className={cn('mb-7 h-0.5 max-w-16 flex-1', i <= indiceAtual ? 'bg-primary/50' : 'bg-borderdefault')} /> : null}
            <li aria-current={agora ? 'step' : undefined} className="flex min-w-16 flex-col items-center gap-2 sm:min-w-22">
              <span
                aria-hidden="true"
                className={cn(
                  'block rounded-full',
                  passo.ponto,
                  feito || agora ? (ultimo ? 'bg-laranja' : 'bg-primary') : 'ring-2 ring-inset ring-borderdefault',
                  feito && i === 0 && 'opacity-45',
                  feito && i === 1 && 'opacity-70',
                  agora && (ultimo ? 'ring-4 ring-laranja/20' : 'ring-4 ring-primary/15'),
                )}
              />
              <span className={cn('text-xs font-semibold', agora ? 'text-heading' : 'text-muted-foreground')}>{passo.rotulo}</span>
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}
```

- [ ] **Step 6: Implementar a tela**

Troque o conteúdo inteiro de `src/ui/publico/TelaCheckout.tsx` por:

```tsx
import { useId, useRef, useState, type ReactNode } from 'react'
import type { Assinatura } from '@/domain/assinatura.ts'
import { depoisDeHoje, emReais, fraseDaAssinaturaAtiva, nomeComCiclo, proximaCobrancaPrevista } from '@/domain/assinaturaTextos.ts'
import { ACEITE_FALTANDO, PAGAMENTO_INDISPONIVEL, type DadosDoCartao } from '@/domain/cartao.ts'
import { descontoAnualPct, mensalizadoDoAnual, planoPorId, VAGAS_PRECO_FUNDADOR, valorNoCiclo, type Ciclo } from '@/domain/conta.ts'
import { formatarDataLonga } from '@/domain/pedidoEstudante.ts'
import { cn } from '@/lib/utils'
import { IconeMarca, type NomeIconeMarca } from '@ds/componentes/display/IconeMarca.tsx'
import { Logo } from '@ds/componentes/display/Logo.tsx'
import { PontosDaMarca } from '@ds/componentes/display/PontosDaMarca.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'
import type { ResultadoDaAssinatura } from '../estado/usarAssinatura.ts'
import type { PlanoPago } from '../navegacao.ts'
import { AndamentoCheckout } from '../pagamento/AndamentoCheckout.tsx'
import { AvisoPagamento } from '../pagamento/AvisoPagamento.tsx'
import { FormularioCartao } from '../pagamento/FormularioCartao.tsx'
import type { ControleDoCartao, CriarProcessador } from '../pagamento/processadorCartao.ts'

interface TelaCheckoutProps {
  readonly plano: PlanoPago
  readonly ciclo: Ciclo
  readonly email: string
  readonly assinaturaAtual: Assinatura
  readonly vagasRestantes: number | null
  readonly disponivel: boolean
  /** Os campos seguros do cartão; nulo quando o site não tem a chave pública (CB-89). */
  readonly criarProcessador: CriarProcessador | null
  readonly aoTrocar: (plano: PlanoPago, ciclo: Ciclo) => void
  readonly aoAssinar: (plano: PlanoPago, ciclo: Ciclo, cartao: DadosDoCartao) => Promise<ResultadoDaAssinatura>
  readonly aoIrParaPainel: () => void
  readonly aoIrParaInicio: () => void
  /** Hoje, para a próxima cobrança prevista; os testes fixam a data. */
  readonly agora?: Date | undefined
}

const PAGOS: readonly PlanoPago[] = ['solo', 'pro']

/** O topo do checkout: a marca, "Pagamento protegido" e o andamento com os pontos da logo. */
function Moldura({ passo, aoIrParaInicio, children }: { readonly passo: 'pagamento' | 'pronto'; readonly aoIrParaInicio: () => void; readonly children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={aoIrParaInicio}
            aria-label="MetaNutri, início"
            className="inline-flex min-h-11 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo tamanho={28} />
          </button>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <IconeMarca nome="cadeado" className="size-4" />
            Pagamento protegido
          </span>
        </div>
        <AndamentoCheckout atual={passo} />
        {children}
      </div>
    </div>
  )
}

/** Uma linha do cartão do resumo: ícone, rótulo e valor. */
function LinhaDoResumo({ icone, rotulo, valor }: { readonly icone: NomeIconeMarca; readonly rotulo: string; readonly valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="inline-flex items-center gap-2 text-textoninverse/75">
        <IconeMarca nome={icone} className="size-4" />
        {rotulo}
      </dt>
      <dd className="min-w-0 text-right font-bold [overflow-wrap:anywhere]">{valor}</dd>
    </div>
  )
}

interface Concluida {
  readonly ativa: boolean
  readonly proximaCobranca: string
}

/** O checkout dentro do site (spec checkout-proprio, US-B1; protótipo v2). Nenhuma outra marca aparece (CA-367, D-71). */
export function TelaCheckout({
  plano,
  ciclo,
  email,
  assinaturaAtual,
  vagasRestantes,
  disponivel,
  criarProcessador,
  aoTrocar,
  aoAssinar,
  aoIrParaPainel,
  aoIrParaInicio,
  agora = new Date(),
}: TelaCheckoutProps) {
  const id = useId()
  const controle = useRef<ControleDoCartao>(null)
  const refAceite = useRef<HTMLInputElement>(null)
  const enviandoRef = useRef(false)
  const [pronto, setPronto] = useState(false)
  const [aceite, setAceite] = useState(false)
  const [erroAceite, setErroAceite] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [concluida, setConcluida] = useState<Concluida | null>(null)

  const escolhido = planoPorId(plano)
  if (!escolhido) return null

  const total = valorNoCiclo(escolhido, ciclo)
  const desconto = descontoAnualPct(escolhido)
  const prevista = proximaCobrancaPrevista(ciclo, agora)
  // CB-91: quem já paga não vê formulário. A cancelada no prazo pode assinar de novo (CA-380).
  const jaAssina = assinaturaAtual.status === 'ativa' && (assinaturaAtual.plano === 'solo' || assinaturaAtual.plano === 'pro')
  const estudanteAtivo = assinaturaAtual.status === 'ativa' && assinaturaAtual.plano === 'estudante'

  const assinar = async () => {
    const formulario = controle.current
    if (enviandoRef.current || !formulario) return
    // CA-370: confere tudo de uma vez; o foco vai para o primeiro erro, na ordem da tela.
    const cartaoCerto = formulario.conferir()
    setErroAceite(!aceite)
    setErro(null)
    if (!cartaoCerto) return
    if (!aceite) {
      refAceite.current?.focus()
      return
    }
    // CA-371: daqui até a resposta, um pedido só, mesmo com clique duplo.
    enviandoRef.current = true
    setEnviando(true)
    const gerado = await formulario.gerar()
    const resultado: ResultadoDaAssinatura = gerado.ok ? await aoAssinar(plano, ciclo, gerado.dados) : { ok: false, erro: gerado.erro }
    enviandoRef.current = false
    setEnviando(false)
    if (resultado.ok) {
      setConcluida({ ativa: resultado.ativa, proximaCobranca: resultado.proximaCobranca ?? prevista })
      return
    }
    setErro(resultado.erro)
    // CA-373: o código de uso único já foi gasto; o de segurança é apagado para a próxima tentativa.
    if (gerado.ok) formulario.limparCodigo()
  }

  if (concluida) {
    return (
      <Moldura passo={concluida.ativa ? 'pronto' : 'pagamento'} aoIrParaInicio={aoIrParaInicio}>
        <section className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 rounded-2xl bg-card p-7 sm:p-10">
          {concluida.ativa ? (
            <>
              <Logo soSimbolo tamanho={92} />
              <h1 className="font-titulo text-3xl font-bold text-heading">Assinatura ativa</h1>
              <p className="text-sm text-muted-foreground">{fraseDaAssinaturaAtiva(plano, ciclo, email, concluida.proximaCobranca)}</p>
              <Button size="lg" block onClick={aoIrParaPainel}>
                Ir para o painel
                <IconeMarca nome="seta" />
              </Button>
            </>
          ) : (
            <>
              <span aria-hidden="true" className="grid size-12 place-content-center rounded-full bg-lightwarning text-warningtext [&_svg]:size-6">
                <IconeMarca nome="calendario" />
              </span>
              <h1 className="font-titulo text-3xl font-bold text-heading">Pagamento em análise</h1>
              <p className="text-sm text-muted-foreground">O banco ainda está confirmando o cartão. Até lá, vale o Free. Assim que confirmar, o plano libera sozinho.</p>
              <Button variant="outline" size="lg" block onClick={aoIrParaPainel}>
                Ir para o painel
              </Button>
            </>
          )}
        </section>
      </Moldura>
    )
  }

  const acoes = !disponivel ? (
    <AvisoPagamento tipo="erro">A conta na nuvem não está configurada neste MetaNutri.</AvisoPagamento>
  ) : jaAssina ? (
    <>
      <AvisoPagamento tipo="ok">
        Você já tem uma assinatura ativa: {planoPorId(assinaturaAtual.plano)?.nome}. A troca de plano pago ainda não é feita pelo site.
      </AvisoPagamento>
      <Button variant="outline" size="lg" block onClick={aoIrParaPainel}>
        Ir para o painel
      </Button>
    </>
  ) : criarProcessador === null ? (
    <AvisoPagamento tipo="erro">{PAGAMENTO_INDISPONIVEL}</AvisoPagamento>
  ) : (
    <>
      {estudanteAtivo ? <AvisoPagamento tipo="ok">Você está no plano Estudante. Quando o banco autorizar o cartão, o plano pago fica no lugar dele.</AvisoPagamento> : null}
      <label htmlFor={`${id}-aceite`} className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed">
        <input
          ref={refAceite}
          id={`${id}-aceite`}
          type="checkbox"
          checked={aceite}
          disabled={enviando}
          aria-invalid={erroAceite || undefined}
          onChange={(e) => {
            setAceite(e.target.checked)
            setErroAceite(false)
          }}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-textoninverse"
        />
        <span>
          {`Autorizo a cobrança de ${emReais(total)} ${ciclo === 'anual' ? 'todo ano' : 'todo mês'} neste cartão até eu cancelar, e li os `}
          <a href="#/termos" target="_blank" rel="noreferrer" className="font-bold underline underline-offset-2">
            Termos de uso
          </a>
          .
        </span>
      </label>
      {erroAceite ? <AvisoPagamento tipo="erro">{ACEITE_FALTANDO}</AvisoPagamento> : null}
      {erro ? <AvisoPagamento tipo="erro">{erro}</AvisoPagamento> : null}
      <Button type="submit" variant="laranja" size="lg" block disabled={!pronto || enviando} aria-busy={enviando || undefined}>
        {enviando ? (
          <>
            <PontosDaMarca pulsando />
            Confirmando com o banco…
          </>
        ) : (
          <>
            {`Assinar por ${emReais(total)}${ciclo === 'anual' ? '/ano' : '/mês'}`}
            <IconeMarca nome="seta" />
          </>
        )}
      </Button>
    </>
  )

  return (
    <Moldura passo="pagamento" aoIrParaInicio={aoIrParaInicio}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void assinar()
        }}
        className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.85fr)]"
      >
        <main className="flex min-w-0 flex-col gap-7 rounded-2xl bg-card p-5 sm:p-8">
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-titulo text-3xl font-bold leading-tight text-heading">Assine o MetaNutri</h1>
              <SeletorSegmentado
                rotulo="Período de cobrança"
                valor={ciclo}
                aoEscolher={(c) => aoTrocar(plano, c)}
                opcoes={[
                  { valor: 'mensal', rotulo: 'Mensal' },
                  { valor: 'anual', rotulo: <>Anual{desconto > 0 ? <span className="font-dados text-xs font-bold text-acento">{`−${desconto}%`}</span> : null}</> },
                ]}
              />
            </div>

            <div role="radiogroup" aria-label="Plano" className="grid gap-3 sm:grid-cols-2">
              {PAGOS.map((idPlano) => {
                const p = planoPorId(idPlano)
                if (!p) return null
                const marcado = idPlano === plano
                return (
                  <button
                    key={idPlano}
                    type="button"
                    role="radio"
                    aria-checked={marcado}
                    onClick={() => aoTrocar(idPlano, ciclo)}
                    className={cn(
                      'relative flex flex-col gap-1 rounded-3xl p-4 text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      marcado ? 'bg-card ring-2 ring-inset ring-primary' : 'bg-surfacesunken hover:ring-1 hover:ring-inset hover:ring-primary/40',
                    )}
                  >
                    {marcado ? <IconeMarca nome="check" destaque className="absolute right-3.5 top-3.5 text-primary" /> : null}
                    <span className="font-semibold text-heading">{p.nome}</span>
                    <span className="font-titulo text-3xl font-bold leading-tight text-heading">
                      {emReais(valorNoCiclo(p, ciclo))} <span className="font-sans text-xs font-semibold text-muted-foreground">{ciclo === 'anual' ? '/ano' : '/mês'}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {ciclo === 'anual' ? `Sai ${emReais(mensalizadoDoAnual(p))} por mês. ` : ''}
                      {p.recursos[0]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {disponivel && !jaAssina && criarProcessador ? (
            <section aria-labelledby={`${id}-cartao`} className="flex flex-col gap-3.5">
              <h2 id={`${id}-cartao`} className="font-titulo text-lg font-bold text-heading">
                Cartão de crédito
              </h2>
              <FormularioCartao ref={controle} criarProcessador={criarProcessador} travado={enviando} aoMudarPronto={setPronto} />
            </section>
          ) : null}
        </main>

        <section aria-label="Resumo" className="flex min-w-0 flex-col gap-4 rounded-2xl bg-surfaceinverse p-5 text-textoninverse sm:p-7 lg:sticky lg:top-4">
          <p className="font-titulo text-2xs font-bold uppercase tracking-[0.12em] text-textoninverse/75">Você paga hoje</p>
          <div className="flex flex-col gap-1">
            <p className="font-titulo text-5xl font-bold leading-none tracking-tight">{emReais(total)}</p>
            <p className="text-sm text-textoninverse/75">{depoisDeHoje(total, ciclo, prevista)}</p>
          </div>
          <dl className="flex flex-col gap-2.5 border-y border-textoninverse/20 py-4 text-sm">
            <LinhaDoResumo icone="check" rotulo="Plano" valor={nomeComCiclo(plano, ciclo)} />
            <LinhaDoResumo icone="calendario" rotulo="Próxima cobrança" valor={formatarDataLonga(prevista)} />
            <LinhaDoResumo icone="recibo" rotulo="Recibo para" valor={email} />
          </dl>

          {vagasRestantes === 0 ? null : (
            <p className="flex items-start gap-2.5 text-sm">
              <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full bg-laranja" />
              <span>
                <strong>Preço de fundador.</strong> Enquanto a assinatura estiver ativa, esse valor não sobe.
                {vagasRestantes !== null ? ` Restam ${vagasRestantes} de ${VAGAS_PRECO_FUNDADOR} vagas.` : ''}
              </span>
            </p>
          )}

          {acoes}

          <p className="flex items-start gap-2.5 text-xs leading-relaxed text-textoninverse/75">
            <IconeMarca nome="cadeado" className="mt-0.5 size-4" />
            O número do cartão vai criptografado direto para a operadora de pagamento. O MetaNutri não vê nem guarda o cartão.
          </p>
        </section>
      </form>
    </Moldura>
  )
}
```

- [ ] **Step 7: Ligar no App**

Em `src/App.tsx`, logo depois da linha `import { useAssinatura } from './ui/estado/usarAssinatura.ts'`:

```ts
import { processadorDoSite } from './ui/pagamento/processadorMercadoPago.ts'
```

No bloco `if (rota.tela === 'assinar') {`, troque a linha `aoPagar={cobranca.assinar}` por:

```tsx
        criarProcessador={processadorDoSite()}
        aoAssinar={cobranca.assinar}
```

Em `src/App.test.tsx` (teste `sem servidor: #/assinar/solo/mensal mostra o checkout`) e em `src/AppConta.test.tsx` (teste `CA-164`), troque `name: 'Revise sua assinatura'` por `name: 'Assine o MetaNutri'`.

Em `src/AppConta.test.tsx`, no `vi.mock('./ui/estado/usarAssinatura.ts', …)`, logo depois de `assinar: vi.fn(),`:

```ts
    cancelar: vi.fn(),
    trocarCartao: vi.fn(),
```

- [ ] **Step 8: O e2e do checkout sem servidor**

No fim de `e2e/publico.spec.ts`:

```ts
test('CA-367: o checkout não cita o processador e, sem conta na nuvem, não carrega o script dos campos seguros', async ({ page }) => {
  await page.goto('/#/assinar/solo/mensal')
  await expect(page.getByRole('heading', { level: 1, name: 'Assine o MetaNutri' })).toBeVisible()
  await expect(page.getByText('A conta na nuvem não está configurada neste MetaNutri.')).toBeVisible()
  expect(await page.locator('body').innerText()).not.toMatch(/mercado ?pago/i)
  await expect(page.locator('script[src*="mercadopago"]')).toHaveCount(0)
})
```

O e2e roda sem servidor de conta (`playwright.config.ts`), então o formulário não aparece; o formulário com os campos de verdade é conferido na Tarefa 7 (Step 9) e na Tarefa 12.

- [ ] **Step 9: Rodar e ver passar**

Run: `npx vitest run src/ui/estado/usarAssinatura.test.ts src/ui/publico/TelaCheckout.test.tsx src/App.test.tsx src/AppConta.test.tsx` → PASS. Depois `npm run check` → verde e `npx playwright test` → verde.

- [ ] **Step 10: Commit**

```bash
git add src/ui/estado/usarAssinatura.ts src/ui/estado/usarAssinatura.test.ts src/ui/pagamento/AndamentoCheckout.tsx src/ui/publico/TelaCheckout.tsx src/ui/publico/TelaCheckout.test.tsx src/App.tsx src/App.test.tsx src/AppConta.test.tsx e2e/publico.spec.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(checkout): assinar com cartão dentro do site, sem outra marca`

---

### Tarefa 10: Conta e plano: cartão, Trocar cartão e Cancelar

Cobre CA-376 a CA-380, CB-92, CB-93 na tela, o texto de Conta e plano de CA-381 e CA-383 em Conta e plano.

**Files:**
- Create: `src/ui/conta/MiniCartao.tsx`
- Create: `src/ui/conta/DialogoCancelarAssinatura.tsx`
- Create: `src/ui/conta/DialogoTrocarCartao.tsx`
- Modify: `src/ui/conta/TelaConta.tsx` (o arquivo inteiro)
- Modify: `src/ui/conta/TelaConta.test.tsx` (o arquivo inteiro)
- Modify: `src/ui/conta/CartaoSituacao.tsx` (sem Lucide)
- Modify: `src/ui/conta/DialogoMeFormei.tsx` (sem Lucide)
- Modify: `src/ui/painel/AvisoCrn.tsx` (sem Lucide; também aparece no Painel)
- Modify: `src/App.tsx` (o bloco `rota.tela === 'conta'`)

**Interfaces:**
- Consumes: `canceladaNoPrazo`, `temAssinaturaPaga` (Tarefa 4); `emReais`, `linhaDaCobranca`, `linhaDoCartao`, `nomeComCiclo`, `recadoDaAssinatura`, `valeAteSeCancelar` (Tarefa 4); `DadosDoCartao`, `RECUSA_PADRAO` (Tarefa 5); `IconeMarca`, `PontosDaMarca`, `iconeFechar` do `DialogContent` (Tarefa 6); `CriarProcessador`, `ControleDoCartao`, `processadorDoSite` (Tarefa 7); `FormularioCartao`, `AvisoPagamento`, `processadorFalso`, `CARTAO_APROVADO` (Tarefa 8); `useAssinatura` com `cancelar` e `trocarCartao`, `ResultadoDaMudanca` (Tarefa 9).
- Produces:

```ts
// TelaConta ganha: readonly criarProcessador: CriarProcessador | null
//                  readonly aoAssinar: (plano: PlanoPago, ciclo: Ciclo) => void   (antes só o plano)
export function MiniCartao(props: { bandeira: string | null; final: string | null }): JSX.Element
export function DialogoCancelarAssinatura(props: { aberto: boolean; assinatura: Assinatura; cancelar: () => Promise<ResultadoDaMudanca>; aoFechar: () => void; aoCancelada: () => void }): JSX.Element
export function DialogoTrocarCartao(props: { aberto: boolean; criarProcessador: CriarProcessador; trocarCartao: (cartao: DadosDoCartao) => Promise<ResultadoDaMudanca>; aoFechar: () => void; aoTrocado: () => void }): JSX.Element
```

- [ ] **Step 1: Escrever os testes que falham**

Troque o conteúdo inteiro de `src/ui/conta/TelaConta.test.tsx` por:

```tsx
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SEM_ASSINATURA, type Assinatura } from '@/domain/assinatura.ts'
import { RECUSA_PADRAO } from '@/domain/cartao.ts'
import type { PedidoEstudante } from '@/domain/pedidoEstudante.ts'
import type { Crn, PerfilConta } from '@/domain/situacao.ts'
import type { ResultadoDaMudanca } from '../estado/usarAssinatura.ts'
import { CARTAO_APROVADO, processadorFalso, type ProcessadorFalso } from '../pagamento/processadorFalso.test-utils.ts'
import { contaFalsa } from '../publico/conta/contaFalsa.test-utils.ts'
import { TelaConta } from './TelaConta.tsx'

const estado = vi.hoisted(() => ({
  assinatura: {
    plano: 'free',
    planoPedido: 'free',
    status: 'sem-assinatura',
    precoTravado: false,
    expiraEm: null,
    ciclo: null,
    valorCentavos: 0,
    cartaoBandeira: null,
    cartaoFinal: null,
    proximaCobranca: null,
  } as Assinatura,
  cancelar: vi.fn(async (): Promise<ResultadoDaMudanca> => ({ ok: true })),
  trocarCartao: vi.fn(async (): Promise<ResultadoDaMudanca> => ({ ok: true })),
}))
vi.mock('../estado/usarAssinatura.ts', () => ({
  useAssinatura: () => ({ assinatura: estado.assinatura, recarregar: vi.fn(), cancelar: estado.cancelar, trocarCartao: estado.trocarCartao }),
}))

const PAGA: Assinatura = {
  ...SEM_ASSINATURA,
  plano: 'solo',
  planoPedido: 'solo',
  status: 'ativa',
  ciclo: 'mensal',
  valorCentavos: 3490,
  precoTravado: true,
  cartaoBandeira: 'Mastercard',
  cartaoFinal: '6351',
  proximaCobranca: '2026-11-02T15:00:00.000Z',
}
const CANCELADA_NO_PRAZO: Assinatura = { ...PAGA, status: 'cancelada', expiraEm: '2026-11-02T02:59:59.000Z' }

const estudante: PerfilConta = { nome: 'Júlia', situacao: 'estudante', crn: null, statusCrn: null, crnDeclaradoEm: null, crnDecididoEm: null }
const nutri: PerfilConta = {
  nome: 'Ana',
  situacao: 'nutricionista',
  crn: { regiao: 6, numero: '12345' },
  statusCrn: 'em_conferencia',
  crnDeclaradoEm: '2026-09-30T12:00:00Z',
  crnDecididoEm: null,
}
const aprovado: PedidoEstudante = {
  id: 'p1',
  instituicao: 'UFRN',
  matricula: '20230045871',
  periodo: 7,
  formatura: '2027-07',
  status: 'aprovado',
  motivo: null,
  enviadoEm: '2026-09-30T13:42:00Z',
  decididoEm: '2026-10-01T12:00:00Z',
  avisoFechado: false,
}

function montar(
  perfil: PerfilConta | null,
  pedido: PedidoEstudante | null = null,
  meFormei = vi.fn(async () => null as string | null),
  falso: ProcessadorFalso | null = processadorFalso(),
) {
  const conta = contaFalsa({ sessao: { id: 'u1', email: 'julia@ufrn.edu.br', nome: 'Júlia' } })
  const props = {
    conta,
    perfil,
    pedido,
    meFormei,
    aoMudouSituacao: vi.fn(),
    corrigirCrn: vi.fn<(crn: Crn) => Promise<string | null>>(async () => null),
    aoEnviarComprovante: vi.fn(),
    aoEntrar: vi.fn(),
    aoVerPrecos: vi.fn(),
    aoIrParaConfig: vi.fn(),
    aoAssinar: vi.fn(),
    criarProcessador: falso ? falso.criar : null,
    aoSaiu: vi.fn(),
  }
  const tela = render(<TelaConta {...props} />)
  return { ...props, ...tela, falso, usuario: userEvent.setup() }
}

describe('TelaConta', () => {
  afterEach(() => {
    estado.assinatura = SEM_ASSINATURA
    estado.cancelar = vi.fn(async (): Promise<ResultadoDaMudanca> => ({ ok: true }))
    estado.trocarCartao = vi.fn(async (): Promise<ResultadoDaMudanca> => ({ ok: true }))
  })

  it('CA-156: sair leva para fora da área de trabalho', async () => {
    const { usuario, conta, aoSaiu } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Sair' }))
    expect(conta.sair).toHaveBeenCalledOnce()
    expect(aoSaiu).toHaveBeenCalledOnce()
  })

  it('CA-282: estudante vê instituição, formatura, matrícula, selo e "Me formei"', () => {
    montar(estudante, aprovado)
    expect(screen.getByText('Estudante de Nutrição')).toBeInTheDocument()
    expect(screen.getByText('UFRN')).toBeInTheDocument()
    expect(screen.getByText('julho de 2027')).toBeInTheDocument()
    expect(screen.getByText('Matrícula verificada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Me formei' })).toBeInTheDocument()
  })

  it('CA-282: estudante sem pedido vê "Falta enviar"', () => {
    montar(estudante, null)
    expect(screen.getByText('Falta enviar')).toBeInTheDocument()
  })

  it('CA-283: nutricionista vê o CRN e o selo, sem botão de trocar situação', () => {
    montar(nutri)
    expect(screen.getByText('CRN-6 12345')).toBeInTheDocument()
    expect(screen.getByText('CRN em conferência')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Me formei' })).not.toBeInTheDocument()
  })

  it('CA-289: CRN não encontrado aparece em Conta e plano, com o prazo e a correção', async () => {
    const { usuario, corrigirCrn } = montar({ ...nutri, statusCrn: 'nao_encontrado', crnDecididoEm: new Date().toISOString() })
    const aviso = screen.getByRole('region', { name: 'CRN' })
    expect(aviso).toHaveTextContent('Não encontramos seu CRN no conselho')
    expect(aviso).toHaveTextContent('7 dias para corrigir')
    const numero = within(aviso).getByRole('textbox', { name: 'Número do CRN' })
    await usuario.clear(numero)
    await usuario.type(numero, '54321')
    await usuario.click(within(aviso).getByRole('button', { name: 'Corrigir CRN' }))
    expect(corrigirCrn).toHaveBeenCalledWith({ regiao: 6, numero: '54321' })
  })

  it('CA-289: CRN em conferência não mostra o aviso de correção', () => {
    montar(nutri)
    expect(screen.queryByText('Não encontramos seu CRN no conselho')).not.toBeInTheDocument()
  })

  it('CA-287: o cartão do nutricionista diz que nome e CRN saem na folha da dieta', () => {
    montar(nutri)
    expect(screen.getByText('Você já pode usar tudo. Seu nome e CRN saem na folha da dieta.')).toBeInTheDocument()
  })

  it('CA-304: estudante sem pedido ou recusada vê "Enviar comprovante", que leva a Comprovar matrícula', async () => {
    const { usuario, aoEnviarComprovante } = montar(estudante, null)
    await usuario.click(screen.getByRole('button', { name: 'Enviar comprovante' }))
    expect(aoEnviarComprovante).toHaveBeenCalledOnce()
  })

  it('CA-304: pedido recusado também mostra "Enviar comprovante"', () => {
    montar(estudante, { ...aprovado, status: 'recusado', motivo: 'Ilegível', decididoEm: '2026-10-01T12:00:00Z' })
    expect(screen.getByRole('button', { name: 'Enviar comprovante' })).toBeInTheDocument()
  })

  it('CA-304: pedido aprovado não mostra "Enviar comprovante"', () => {
    montar(estudante, aprovado)
    expect(screen.queryByRole('button', { name: 'Enviar comprovante' })).not.toBeInTheDocument()
  })

  it('CA-304: pedido em análise não mostra "Enviar comprovante"', () => {
    montar(estudante, { ...aprovado, status: 'em_analise', decididoEm: null })
    expect(screen.queryByRole('button', { name: 'Enviar comprovante' })).not.toBeInTheDocument()
  })

  it('CA-284: no Estudante, mostra até quando vale', () => {
    estado.assinatura = { ...SEM_ASSINATURA, plano: 'estudante', planoPedido: 'estudante', status: 'ativa', expiraEm: '2027-07-31T23:59:59Z' }
    montar(estudante, aprovado)
    expect(screen.getByText('Vale até 31 de julho de 2027.')).toBeInTheDocument()
  })

  it('CA-286 e CA-287: Me formei pede o CRN e a declaração, e confirma', async () => {
    const { usuario, meFormei, aoMudouSituacao } = montar(estudante, aprovado)
    await usuario.click(screen.getByRole('button', { name: 'Me formei' }))
    const janela = screen.getByRole('dialog', { name: 'Me formei' })
    expect(janela).toHaveTextContent('Seus planos alimentares e pacientes continuam salvos.')
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Região do CRN' }), 'CRN-6')
    await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '23891')
    await usuario.click(screen.getByRole('button', { name: 'Mudar para nutricionista' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Marque a declaração')
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro que este CRN é meu e está ativo.' }))
    await usuario.click(screen.getByRole('button', { name: 'Mudar para nutricionista' }))
    expect(meFormei).toHaveBeenCalledWith({ regiao: 6, numero: '23891' })
    expect(aoMudouSituacao).toHaveBeenCalledOnce()
  })

  it('CA-288: cancelar não muda nada', async () => {
    const { usuario, meFormei } = montar(estudante, aprovado)
    await usuario.click(screen.getByRole('button', { name: 'Me formei' }))
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(meFormei).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('CRN inválido marca o campo do CRN, não a declaração', async () => {
    const { usuario } = montar(estudante, aprovado)
    await usuario.click(screen.getByRole('button', { name: 'Me formei' }))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Região do CRN' }), 'CRN-6')
    await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '12a45')
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro que este CRN é meu e está ativo.' }))
    await usuario.click(screen.getByRole('button', { name: 'Mudar para nutricionista' }))
    expect(screen.getByRole('textbox', { name: 'Número do CRN' })).toHaveAttribute('aria-invalid', 'true')
  })

  it('declaração desmarcada marca a declaração, não o CRN válido', async () => {
    const { usuario } = montar(estudante, aprovado)
    await usuario.click(screen.getByRole('button', { name: 'Me formei' }))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Região do CRN' }), 'CRN-6')
    await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '23891')
    await usuario.click(screen.getByRole('button', { name: 'Mudar para nutricionista' }))
    expect(screen.getByRole('textbox', { name: 'Número do CRN' })).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByRole('checkbox', { name: 'Declaro que este CRN é meu e está ativo.' })).toHaveAttribute('aria-invalid', 'true')
  })

  it('foco 3: clique duplo em "Mudar para nutricionista" chama uma vez', async () => {
    let terminar: (v: string | null) => void = () => undefined
    const meFormei = vi.fn(() => new Promise<string | null>((r) => (terminar = r)))
    const { usuario } = montar(estudante, aprovado, meFormei)
    await usuario.click(screen.getByRole('button', { name: 'Me formei' }))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Região do CRN' }), 'CRN-6')
    await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '23891')
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro que este CRN é meu e está ativo.' }))
    await usuario.dblClick(screen.getByRole('button', { name: 'Mudar para nutricionista' }))
    terminar(null)
    expect(meFormei).toHaveBeenCalledTimes(1)
  })

  it('CA-376: assinatura paga ativa mostra plano e ciclo, o selo, o cartão, a próxima cobrança e os dois botões', () => {
    estado.assinatura = PAGA
    montar(nutri)
    expect(screen.getByText('Solo, mensal')).toBeInTheDocument()
    expect(screen.getByText('Ativa')).toBeInTheDocument()
    expect(screen.getByText('Mastercard final 6351')).toBeInTheDocument()
    expect(screen.getByText('Próxima cobrança em 2 de novembro de 2026, R$ 34,90')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trocar cartão' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar assinatura' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Assinar/ })).not.toBeInTheDocument()
  })

  it('CA-377: cancelar abre a confirmação com até quando vale, e "Manter assinatura" é o padrão', async () => {
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    const janela = screen.getByRole('dialog', { name: 'Cancelar a assinatura?' })
    expect(janela).toHaveTextContent('O plano Solo continua até 1 de novembro de 2026, o fim do período já pago. Depois você volta para o Free, sem perder nenhum plano.')
    await waitFor(() => expect(within(janela).getByRole('button', { name: 'Manter assinatura' })).toHaveFocus())
    await usuario.click(within(janela).getByRole('button', { name: 'Manter assinatura' }))
    expect(estado.cancelar).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('CA-378: confirmar o cancelamento pede ao servidor uma vez e fecha a confirmação', async () => {
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar assinatura' }))
    expect(estado.cancelar).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('CA-378 e CA-380: cancelada no prazo diz até quando vale e oferece assinar de novo, no mesmo plano e ciclo', async () => {
    estado.assinatura = CANCELADA_NO_PRAZO
    const { usuario, aoAssinar } = montar(nutri)
    expect(screen.getByText('Cancelada, vale até 1 de novembro de 2026')).toBeInTheDocument()
    expect(screen.getByText('Cancelada')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancelar assinatura' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Trocar cartão' })).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Assinar de novo' }))
    expect(aoAssinar).toHaveBeenCalledWith('solo', 'mensal')
  })

  it('CA-380: cancelada fora do prazo, já no Free, também oferece assinar de novo', async () => {
    estado.assinatura = { ...SEM_ASSINATURA, planoPedido: 'pro', status: 'cancelada', ciclo: 'anual', expiraEm: '2026-09-01T02:59:59.000Z' }
    const { usuario, aoAssinar } = montar(nutri)
    expect(screen.getByText('Sua assinatura foi cancelada. Você continua com o plano Free.')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Assinar de novo' }))
    expect(aoAssinar).toHaveBeenCalledWith('pro', 'anual')
  })

  it('CB-92 e foco 5: clique duplo em "Cancelar assinatura" da confirmação pede uma vez só', async () => {
    let terminar: (resultado: ResultadoDaMudanca) => void = () => undefined
    estado.cancelar = vi.fn(
      () =>
        new Promise<ResultadoDaMudanca>((resolver) => {
          terminar = resolver
        }),
    )
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    await usuario.dblClick(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar assinatura' }))
    expect(estado.cancelar).toHaveBeenCalledTimes(1)
    await act(async () => terminar({ ok: true }))
  })

  it('cancelamento que falha mostra a mensagem dentro da confirmação, que continua aberta', async () => {
    estado.cancelar = vi.fn(async (): Promise<ResultadoDaMudanca> => ({ ok: false, erro: 'Não consegui falar com o servidor de cobrança. Nada mudou. Tente de novo em alguns minutos.' }))
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    const janela = screen.getByRole('dialog')
    await usuario.click(within(janela).getByRole('button', { name: 'Cancelar assinatura' }))
    expect(await within(janela).findByRole('alert')).toHaveTextContent('Nada mudou')
  })

  it('foco 4: assinatura de antes do 008, sem cartão nem próxima cobrança: o plano aparece e a confirmação fala do fim do período, sem data', async () => {
    estado.assinatura = { ...PAGA, cartaoBandeira: null, cartaoFinal: null, proximaCobranca: null }
    const { usuario } = montar(nutri)
    expect(screen.getByText('Solo, mensal')).toBeInTheDocument()
    expect(screen.queryByText(/final \d{4}/)).not.toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('O plano Solo continua até o fim do período já pago. Depois você volta para o Free, sem perder nenhum plano.')
  })

  it('CA-379: Trocar cartão abre o mesmo formulário do checkout; autorizado, fecha e avisa', async () => {
    estado.assinatura = PAGA
    const { usuario, falso } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Trocar cartão' }))
    const janela = screen.getByRole('dialog', { name: 'Trocar cartão' })
    expect(within(janela).getByRole('group', { name: 'Número do cartão' })).toBeInTheDocument()
    await act(async () => {})
    falso?.preencher()
    await usuario.type(within(janela).getByRole('textbox', { name: 'Nome impresso no cartão' }), 'APRO')
    await usuario.type(within(janela).getByRole('textbox', { name: 'CPF do titular' }), '12345678909')
    await usuario.click(within(janela).getByRole('button', { name: 'Salvar cartão' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(estado.trocarCartao).toHaveBeenCalledWith(CARTAO_APROVADO)
    expect(screen.getByText('Cartão trocado. As próximas cobranças vão para ele.')).toBeInTheDocument()
  })

  it('CA-379: recusado, o cartão antigo continua, a mensagem aparece e o código é apagado', async () => {
    estado.assinatura = PAGA
    estado.trocarCartao = vi.fn(async (): Promise<ResultadoDaMudanca> => ({ ok: false, erro: RECUSA_PADRAO }))
    const { usuario, falso } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Trocar cartão' }))
    const janela = screen.getByRole('dialog', { name: 'Trocar cartão' })
    await act(async () => {})
    falso?.preencher()
    await usuario.type(within(janela).getByRole('textbox', { name: 'Nome impresso no cartão' }), 'APRO')
    await usuario.type(within(janela).getByRole('textbox', { name: 'CPF do titular' }), '12345678909')
    await usuario.click(within(janela).getByRole('button', { name: 'Salvar cartão' }))
    expect(await within(janela).findByText(`${RECUSA_PADRAO} O cartão antigo continua valendo.`)).toBeInTheDocument()
    expect(falso?.limpezas).toBe(1)
    expect(screen.getByRole('dialog', { name: 'Trocar cartão' })).toBeInTheDocument()
  })

  it('sem a chave pública do pagamento, não há "Trocar cartão"; cancelar continua', () => {
    estado.assinatura = PAGA
    montar(nutri, null, undefined, null)
    expect(screen.queryByRole('button', { name: 'Trocar cartão' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar assinatura' })).toBeInTheDocument()
  })

  it('CA-381: Conta e plano não cita o processador', () => {
    montar(nutri)
    expect(document.body.textContent).not.toMatch(/mercado ?pago/i)
    expect(screen.getByText('O pagamento é com cartão de crédito, aqui mesmo no site. O MetaNutri não vê nem guarda o número do cartão.')).toBeInTheDocument()
  })

  it('CA-383: nenhum ícone de biblioteca em Conta e plano, nem na confirmação', async () => {
    estado.assinatura = PAGA
    const { usuario } = montar({ ...nutri, statusCrn: 'nao_encontrado', crnDecididoEm: new Date().toISOString() })
    expect(document.querySelectorAll('svg:not([data-icone])')).toHaveLength(0)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    expect(document.querySelectorAll('svg:not([data-icone])')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/conta/TelaConta.test.tsx`
Expected: FAIL — Conta e plano ainda não mostra o cartão nem os botões novos, e ainda usa Lucide.

- [ ] **Step 3: Implementar as peças novas**

Crie `src/ui/conta/MiniCartao.tsx`:

```tsx
/** O cartão pequeno de Conta e plano (protótipo v2): a bandeira e os 4 últimos números. Enfeite: o texto ao lado diz o mesmo. */
export function MiniCartao({ bandeira, final }: { readonly bandeira: string | null; readonly final: string | null }) {
  return (
    <div aria-hidden="true" className="flex aspect-[1.586] w-24 flex-col justify-between rounded-sm bg-[image:var(--gradient-ink)] px-2.5 py-2 text-2xs text-textonbrand">
      <span className="truncate font-semibold">{bandeira ?? 'Cartão'}</span>
      <span className="font-dados text-xs tracking-wider">{`•••• ${final ?? '••••'}`}</span>
    </div>
  )
}
```

Crie `src/ui/conta/DialogoCancelarAssinatura.tsx`:

```tsx
import { useRef, useState } from 'react'
import type { Assinatura } from '@/domain/assinatura.ts'
import { valeAteSeCancelar } from '@/domain/assinaturaTextos.ts'
import { planoPorId } from '@/domain/conta.ts'
import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'
import { PontosDaMarca } from '@ds/componentes/display/PontosDaMarca.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import type { ResultadoDaMudanca } from '../estado/usarAssinatura.ts'
import { AvisoPagamento } from '../pagamento/AvisoPagamento.tsx'

interface DialogoCancelarAssinaturaProps {
  readonly aberto: boolean
  readonly assinatura: Assinatura
  readonly cancelar: () => Promise<ResultadoDaMudanca>
  readonly aoFechar: () => void
  readonly aoCancelada: () => void
}

/** CA-377 e CA-378: a confirmação diz até quando o plano vale; "Manter assinatura" vem primeiro e recebe o foco. */
export function DialogoCancelarAssinatura({ aberto, assinatura, cancelar, aoFechar, aoCancelada }: DialogoCancelarAssinaturaProps) {
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)
  const nome = planoPorId(assinatura.plano)?.nome ?? 'pago'
  const ate = valeAteSeCancelar(assinatura)

  const confirmar = async () => {
    // CB-92: o segundo clique não sai.
    if (enviandoRef.current) return
    enviandoRef.current = true
    setEnviando(true)
    setErro(null)
    const resultado = await cancelar()
    enviandoRef.current = false
    setEnviando(false)
    if (resultado.ok) aoCancelada()
    else setErro(resultado.erro)
  }

  const fechar = () => {
    if (enviandoRef.current) return
    setErro(null)
    aoFechar()
  }

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => (abrir ? undefined : fechar())}>
      <DialogContent iconeFechar={<IconeMarca nome="fechar" />}>
        <DialogHeader>
          <DialogTitle>Cancelar a assinatura?</DialogTitle>
          <DialogDescription>
            {ate
              ? `O plano ${nome} continua até ${ate}, o fim do período já pago. Depois você volta para o Free, sem perder nenhum plano.`
              : `O plano ${nome} continua até o fim do período já pago. Depois você volta para o Free, sem perder nenhum plano.`}
          </DialogDescription>
        </DialogHeader>
        {erro ? <AvisoPagamento tipo="erro">{erro}</AvisoPagamento> : null}
        <DialogFooter>
          <Button onClick={fechar} disabled={enviando}>
            Manter assinatura
          </Button>
          <Button variant="lighterror" onClick={() => void confirmar()} disabled={enviando} aria-busy={enviando || undefined}>
            {enviando ? <PontosDaMarca pulsando /> : null}
            Cancelar assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

Crie `src/ui/conta/DialogoTrocarCartao.tsx`:

```tsx
import { useRef, useState } from 'react'
import type { DadosDoCartao } from '@/domain/cartao.ts'
import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'
import { PontosDaMarca } from '@ds/componentes/display/PontosDaMarca.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import type { ResultadoDaMudanca } from '../estado/usarAssinatura.ts'
import { AvisoPagamento } from '../pagamento/AvisoPagamento.tsx'
import { FormularioCartao } from '../pagamento/FormularioCartao.tsx'
import type { ControleDoCartao, CriarProcessador } from '../pagamento/processadorCartao.ts'

interface DialogoTrocarCartaoProps {
  readonly aberto: boolean
  readonly criarProcessador: CriarProcessador
  readonly trocarCartao: (cartao: DadosDoCartao) => Promise<ResultadoDaMudanca>
  readonly aoFechar: () => void
  readonly aoTrocado: () => void
}

/** CA-379: o mesmo formulário do checkout. Recusado, o cartão antigo continua e a mensagem aparece. */
export function DialogoTrocarCartao({ aberto, criarProcessador, trocarCartao, aoFechar, aoTrocado }: DialogoTrocarCartaoProps) {
  const controle = useRef<ControleDoCartao>(null)
  const enviandoRef = useRef(false)
  const [pronto, setPronto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const salvar = async () => {
    const formulario = controle.current
    // CB-92: o segundo clique não sai.
    if (enviandoRef.current || !formulario || !formulario.conferir()) return
    enviandoRef.current = true
    setEnviando(true)
    setErro(null)
    const gerado = await formulario.gerar()
    const resultado: ResultadoDaMudanca = gerado.ok ? await trocarCartao(gerado.dados) : { ok: false, erro: gerado.erro }
    enviandoRef.current = false
    setEnviando(false)
    if (resultado.ok) {
      aoTrocado()
      return
    }
    setErro(resultado.erro)
    if (gerado.ok) formulario.limparCodigo()
  }

  const fechar = () => {
    if (enviandoRef.current) return
    setErro(null)
    aoFechar()
  }

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => (abrir ? undefined : fechar())}>
      <DialogContent iconeFechar={<IconeMarca nome="fechar" />} className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            void salvar()
          }}
          className="flex flex-col gap-4"
        >
          <DialogHeader>
            <DialogTitle>Trocar cartão</DialogTitle>
            <DialogDescription>As próximas cobranças vão para o cartão novo. Nada é cobrado agora.</DialogDescription>
          </DialogHeader>
          <FormularioCartao ref={controle} criarProcessador={criarProcessador} travado={enviando} aoMudarPronto={setPronto} />
          {erro ? <AvisoPagamento tipo="erro">{`${erro} O cartão antigo continua valendo.`}</AvisoPagamento> : null}
          <DialogFooter>
            <Button variant="outline" onClick={fechar} disabled={enviando}>
              Voltar
            </Button>
            <Button type="submit" disabled={!pronto || enviando} aria-busy={enviando || undefined}>
              {enviando ? (
                <>
                  <PontosDaMarca pulsando />
                  Confirmando com o banco…
                </>
              ) : (
                'Salvar cartão'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Conta e plano**

Troque o conteúdo inteiro de `src/ui/conta/TelaConta.tsx` por:

```tsx
import { useState } from 'react'
import { canceladaNoPrazo, temAssinaturaPaga } from '@/domain/assinatura.ts'
import { emReais, linhaDaCobranca, linhaDoCartao, nomeComCiclo, recadoDaAssinatura } from '@/domain/assinaturaTextos.ts'
import { planoPorId, PLANOS, type Ciclo } from '@/domain/conta.ts'
import { formatarDataLonga, type PedidoEstudante } from '@/domain/pedidoEstudante.ts'
import type { Crn, PerfilConta } from '@/domain/situacao.ts'
import { useAssinatura } from '../estado/usarAssinatura.ts'
import { ehPlanoPago, type PlanoPago } from '../navegacao.ts'
import { AvisoPagamento } from '../pagamento/AvisoPagamento.tsx'
import type { CriarProcessador } from '../pagamento/processadorCartao.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import type { ValorConta } from '../estado/usarConta.ts'
import { AvisoCrn } from '../painel/AvisoCrn.tsx'
import { CartaoSituacao } from './CartaoSituacao.tsx'
import { DialogoCancelarAssinatura } from './DialogoCancelarAssinatura.tsx'
import { DialogoMeFormei } from './DialogoMeFormei.tsx'
import { DialogoTrocarCartao } from './DialogoTrocarCartao.tsx'
import { MiniCartao } from './MiniCartao.tsx'

interface TelaContaProps {
  readonly conta: ValorConta
  readonly aoEntrar: () => void
  readonly aoVerPrecos: () => void
  readonly aoIrParaConfig: () => void
  /** Leva ao checkout. O "Assinar de novo" reabre o plano e o ciclo de antes (CA-380). */
  readonly aoAssinar: (plano: PlanoPago, ciclo: Ciclo) => void
  /** Os campos seguros do cartão, para "Trocar cartão"; nulo quando o site não tem a chave pública. */
  readonly criarProcessador: CriarProcessador | null
  /** Situação e CRN (spec conta-e-verificacao). Nulo no modo local, sem servidor. */
  readonly perfil: PerfilConta | null
  readonly pedido: PedidoEstudante | null
  readonly meFormei: (crn: Crn) => Promise<string | null>
  /** Avisa o App para reler o perfil e a assinatura depois do "Me formei". */
  readonly aoMudouSituacao: () => void
  /** CA-289: corrigir o CRN não encontrado também daqui. */
  readonly corrigirCrn: (crn: Crn) => Promise<string | null>
  /** CA-304: estudante sem pedido ou recusada vai para Comprovar matrícula. */
  readonly aoEnviarComprovante: () => void
  readonly aoSaiu: () => void
}

/** Estado da conta: quem está conectado, qual plano, o cartão que paga e o que fazer sem conta (spec checkout-proprio, US-B2). */
export function TelaConta({
  conta,
  aoEntrar,
  aoVerPrecos,
  aoIrParaConfig,
  aoAssinar,
  criarProcessador,
  perfil,
  pedido,
  meFormei,
  aoMudouSituacao,
  corrigirCrn,
  aoEnviarComprovante,
  aoSaiu,
}: TelaContaProps) {
  const [saindo, setSaindo] = useState(false)
  const { assinatura, recarregar, cancelar, trocarCartao } = useAssinatura(conta.sessao !== null)
  const [formando, setFormando] = useState(false)
  const [cancelando, setCancelando] = useState(false)
  const [trocando, setTrocando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const plano = planoPorId(assinatura.plano)
  const paga = temAssinaturaPaga(assinatura)
  const noPrazo = canceladaNoPrazo(assinatura)
  // CA-380: cancelada, dentro ou fora do prazo, oferece assinar de novo o mesmo plano.
  const planoDeNovo = conta.sessao && assinatura.status === 'cancelada' && ehPlanoPago(assinatura.planoPedido) ? assinatura.planoPedido : null
  const linhaCartao = linhaDoCartao(assinatura)
  const linhaCobranca = linhaDaCobranca(assinatura)
  const inicial = (conta.sessao?.nome.trim()[0] ?? conta.sessao?.email[0] ?? '?').toUpperCase()

  const sair = async () => {
    setSaindo(true)
    await conta.sair()
    setSaindo(false)
    aoSaiu()
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Sua conta</CardTitle>
          <CardDescription>
            {conta.sessao ? 'Conectado. Seus dados podem ser levados para outro aparelho.' : 'O MetaNutri funciona sem conta. Ela serve para usar em mais de um aparelho.'}
          </CardDescription>
        </CardHeader>

        {conta.carregando ? (
          <p className="text-sm text-muted-foreground">Conferindo a sessão…</p>
        ) : conta.sessao ? (
          <div className="flex flex-wrap items-center gap-4">
            <span aria-hidden="true" className="grid size-12 shrink-0 place-content-center rounded-full bg-lightprimary font-titulo text-lg font-bold text-primary">
              {inicial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-titulo text-lg font-semibold text-heading">{conta.sessao.nome}</p>
              <p className="truncate text-sm text-muted-foreground">{conta.sessao.email}</p>
            </div>
            <Button variant="outline" onClick={() => void sair()} disabled={saindo}>
              {saindo ? 'Saindo…' : 'Sair'}
            </Button>
          </div>
        ) : conta.disponivel ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">Você está usando o modo local: tudo salvo neste navegador.</p>
            <Button onClick={aoEntrar}>Entrar ou criar conta</Button>
          </div>
        ) : (
          <Alert variant="info">
            <IconeMarca nome="alerta" />
            <div>
              <p className="font-medium">A conta na nuvem ainda não foi ligada neste projeto.</p>
              <p className="mt-1 text-sm">
                Falta criar o projeto no Supabase e preencher as duas chaves em <code className="rounded-md bg-muted px-1">.env.local</code>. O passo a passo está no
                README. Enquanto isso, o backup em Configurações leva tudo para outro aparelho.
              </p>
              <Button variant="lightprimary" size="sm" className="mt-3" onClick={aoIrParaConfig}>
                Ir para o backup
              </Button>
            </div>
          </Alert>
        )}
      </Card>

      {perfil?.situacao === 'nutricionista' ? <AvisoCrn perfil={perfil} agora={new Date()} aoCorrigir={corrigirCrn} /> : null}

      {perfil ? <CartaoSituacao perfil={perfil} pedido={pedido} aoMeFormei={() => setFormando(true)} aoEnviarComprovante={aoEnviarComprovante} /> : null}

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Seu plano</CardTitle>
          <CardDescription>{recadoDaAssinatura(assinatura)}</CardDescription>
        </CardHeader>

        {paga ? (
          <div className="grid items-center gap-4 rounded-3xl bg-surfacerow p-4 sm:grid-cols-[auto_minmax(0,1fr)]">
            <MiniCartao bandeira={assinatura.cartaoBandeira} final={assinatura.cartaoFinal} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="font-titulo text-xl font-bold text-heading">{nomeComCiclo(assinatura.plano, assinatura.ciclo)}</p>
                <Badge variant={noPrazo ? 'muted' : 'lightSuccess'} dot>
                  {noPrazo ? 'Cancelada' : 'Ativa'}
                </Badge>
              </div>
              <div className="mt-1.5 flex flex-col gap-1.5 text-sm text-muted-foreground">
                {linhaCartao ? (
                  <span className="inline-flex items-center gap-2">
                    <IconeMarca nome="cartao" className="size-4" />
                    {linhaCartao}
                  </span>
                ) : null}
                {linhaCobranca ? (
                  <span className="inline-flex items-center gap-2">
                    <IconeMarca nome="calendario" className="size-4" />
                    {linhaCobranca}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-surfacerow p-4">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-content-center rounded-full bg-lightprimary text-primary">
              <IconeMarca nome="check" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-heading">{plano?.nome ?? PLANOS[0]?.nome ?? 'Free'}</p>
              <p className="text-sm text-muted-foreground">{plano?.resumo ?? PLANOS[0]?.resumo}</p>
            </div>
            <span className="numeros font-titulo text-xl font-bold text-heading">{(plano?.mensal ?? 0) === 0 ? 'Grátis' : `${emReais(plano?.mensal ?? 0)}/mês`}</span>
          </div>
        )}

        {assinatura.plano === 'estudante' && assinatura.expiraEm ? (
          <p className="text-sm text-muted-foreground">{`Vale até ${formatarDataLonga(assinatura.expiraEm)}.`}</p>
        ) : null}

        {assinatura.precoTravado ? (
          <p className="text-xs text-muted-foreground">Você entrou no preço de fundador: ele não sobe quando o preço subir.</p>
        ) : null}

        {aviso ? <AvisoPagamento tipo="ok">{aviso}</AvisoPagamento> : null}

        <div className="flex flex-wrap gap-3">
          {paga && !noPrazo ? (
            <>
              {criarProcessador ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setAviso(null)
                    setTrocando(true)
                  }}
                >
                  Trocar cartão
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={() => {
                  setAviso(null)
                  setCancelando(true)
                }}
              >
                Cancelar assinatura
              </Button>
            </>
          ) : null}

          {planoDeNovo ? <Button onClick={() => aoAssinar(planoDeNovo, assinatura.ciclo ?? 'mensal')}>Assinar de novo</Button> : null}

          <Button variant="outline" onClick={aoVerPrecos}>
            Mudar de plano
          </Button>

          {conta.sessao && assinatura.status !== 'ativa' && assinatura.status !== 'cancelada'
            ? PLANOS.filter((p) => ehPlanoPago(p.id)).map((p) => (
                <Button key={p.id} onClick={() => ehPlanoPago(p.id) && aoAssinar(p.id, 'mensal')}>
                  Assinar {p.nome} · {emReais(p.mensal)}/mês
                </Button>
              ))
            : null}
        </div>

        {conta.sessao && !paga && assinatura.status !== 'ativa' ? (
          <p className="text-xs text-muted-foreground">O pagamento é com cartão de crédito, aqui mesmo no site. O MetaNutri não vê nem guarda o número do cartão.</p>
        ) : null}
      </Card>

      <DialogoMeFormei
        aberto={formando}
        aoFechar={() => setFormando(false)}
        meFormei={meFormei}
        aoFormado={() => {
          setFormando(false)
          recarregar()
          aoMudouSituacao()
        }}
      />

      <DialogoCancelarAssinatura aberto={cancelando} assinatura={assinatura} cancelar={cancelar} aoFechar={() => setCancelando(false)} aoCancelada={() => setCancelando(false)} />

      {criarProcessador ? (
        <DialogoTrocarCartao
          aberto={trocando}
          criarProcessador={criarProcessador}
          trocarCartao={trocarCartao}
          aoFechar={() => setTrocando(false)}
          aoTrocado={() => {
            setTrocando(false)
            setAviso('Cartão trocado. As próximas cobranças vão para ele.')
          }}
        />
      ) : null}
    </div>
  )
}
```

- [ ] **Step 5: Tirar o Lucide do que Conta e plano mostra dentro dela**

`src/ui/conta/CartaoSituacao.tsx`: apague a linha `import { BadgeCheck, GraduationCap } from 'lucide-react'`. Troque

```tsx
          <div className="flex items-center gap-2.5">
            <BadgeCheck className="size-5 text-primary" aria-hidden="true" />
            <CardTitle>Nutricionista</CardTitle>
          </div>
```

por `<CardTitle>Nutricionista</CardTitle>`, e

```tsx
        <div className="flex items-center gap-2.5">
          <GraduationCap className="size-5 text-primary" aria-hidden="true" />
          <CardTitle>Estudante de Nutrição</CardTitle>
        </div>
```

por `<CardTitle>Estudante de Nutrição</CardTitle>`.

`src/ui/conta/DialogoMeFormei.tsx`: troque `import { TriangleAlert } from 'lucide-react'` por

```tsx
import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'
import { PontosDaMarca } from '@ds/componentes/display/PontosDaMarca.tsx'
```

troque `<DialogContent>` por `<DialogContent iconeFechar={<IconeMarca nome="fechar" />}>`; troque `<TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />` por `<IconeMarca nome="alerta" className="mt-0.5 size-4" />`; e troque o botão de confirmar por:

```tsx
          <Button onClick={() => void confirmar()} disabled={enviando} aria-busy={enviando || undefined}>
            {enviando ? <PontosDaMarca pulsando /> : null}
            Mudar para nutricionista
          </Button>
```

`src/ui/painel/AvisoCrn.tsx` (aparece em Conta e plano e no Painel): troque `import { TriangleAlert } from 'lucide-react'` pelos mesmos dois imports de cima; troque `<TriangleAlert className="size-5" aria-hidden="true" />` por `<IconeMarca nome="alerta" />`; e troque o botão por:

```tsx
        <Button onClick={() => void corrigir()} disabled={enviando} aria-busy={enviando || undefined}>
          {enviando ? <PontosDaMarca pulsando /> : null}
          Corrigir CRN
        </Button>
```

- [ ] **Step 6: Ligar no App**

Em `src/App.tsx`, no bloco `if (rota.tela === 'conta') {`, troque a linha `aoAssinar={(plano) => navegar({ tela: 'assinar', plano, ciclo: 'mensal' })}` por:

```tsx
          aoAssinar={(plano, ciclo) => navegar({ tela: 'assinar', plano, ciclo })}
          criarProcessador={processadorDoSite()}
```

(O import de `processadorDoSite` entrou na Tarefa 9.)

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run src/ui/conta src/ui/painel src/AppConta.test.tsx src/App.test.tsx` → PASS. Depois `npm run check` → verde e `npx playwright test` → verde.

- [ ] **Step 8: Commit**

```bash
git add src/ui/conta/MiniCartao.tsx src/ui/conta/DialogoCancelarAssinatura.tsx src/ui/conta/DialogoTrocarCartao.tsx src/ui/conta/TelaConta.tsx src/ui/conta/TelaConta.test.tsx src/ui/conta/CartaoSituacao.tsx src/ui/conta/DialogoMeFormei.tsx src/ui/painel/AvisoCrn.tsx src/App.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): cartão, trocar cartão e cancelar em Conta e plano`

---

### Tarefa 11: Textos, Política, Termos e volta do pagamento

Cobre CA-381, CA-382 e CA-383 na volta do pagamento (D-71).

**Files:**
- Modify: `src/ui/publico/SecaoPrecos.tsx:312-315` (a nota do rodapé)
- Modify: `src/ui/publico/SecaoPrecos.test.tsx` (um teste novo)
- Modify: `src/ui/publico/TelaTermos.tsx:34-40` ("Planos e pagamento")
- Modify: `src/ui/publico/TelaPrivacidade.tsx:120` (a linha do pagamento)
- Modify: `src/ui/publico/legal.test.tsx` (as datas do `vi.mock` e dois testes novos)
- Modify: `src/domain/legal.ts:13-14`, `src/domain/legal.test.ts` (o arquivo inteiro)
- Modify: `src/ui/publico/TelaVoltaPagamento.tsx` (imports, comentário e os cinco `selo`)
- Modify: `src/ui/publico/TelaVoltaPagamento.test.tsx` (um teste novo)
- Modify: `e2e/publico.spec.ts` (um teste novo no fim)

**Interfaces:**
- Consumes: `IconeMarca`, `PontosDaMarca` (Tarefa 6); `SEM_ASSINATURA`, `Assinatura` (Tarefa 4).
- Produces: `VERSAO_TERMOS = '2026-10-03'`, `DATA_TERMOS = '3 de outubro de 2026'` (veja o Step 3).

- [ ] **Step 1: Escrever os testes que falham**

Em `src/ui/publico/SecaoPrecos.test.tsx`, dentro do `describe('SecaoPrecos'`:

```tsx
  it('CA-381: a nota de pagamento fala de cartão de crédito no site e não cita o processador', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    expect(document.body.textContent).not.toMatch(/mercado ?pago/i)
    expect(screen.getByText(/O pagamento é com cartão de crédito, aqui mesmo no site, e você cancela quando quiser em Conta e plano\./)).toBeInTheDocument()
  })
```

Em `src/ui/publico/legal.test.tsx`: no `vi.mock`, troque `DATA_TERMOS: '2 de outubro de 2026',` por `DATA_TERMOS: '3 de outubro de 2026',` e `VERSAO_TERMOS: '2026-10-02',` por `VERSAO_TERMOS: '2026-10-03',`; troque `/Versão de 2 de outubro de 2026/` por `/Versão de 3 de outubro de 2026/` e `expect(texto).toContain('2 de outubro de 2026')` por `expect(texto).toContain('3 de outubro de 2026')`. Depois acrescente, dentro do `describe`:

```tsx
  it('CA-381: os termos dizem cartão de crédito, renovação sozinha e cancelamento em Conta e plano, sem citar o processador', () => {
    render(<TelaTermos />)
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('Solo e Pro são assinaturas pagas com cartão de crédito')
    expect(texto).toContain('renovam sozinhas')
    expect(texto).toContain('Para cancelar, use Conta e plano. O plano pago vale até o fim do período já pago')
    expect(texto).not.toMatch(/mercado ?pago/i)
  })

  it('CA-382: a política diz quem processa o cartão, que ele vai direto e criptografado, e o pouco que o MetaNutri guarda', () => {
    render(<TelaPrivacidade />)
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('O pagamento é processado pelo Mercado Pago.')
    expect(texto).toContain('vão direto do seu navegador para ele, criptografados, sem passar pelo MetaNutri')
    expect(texto).toContain('O MetaNutri guarda só a bandeira, os 4 últimos números do cartão e a data da próxima cobrança')
    expect(texto).not.toContain('Nenhum dado de cartão passa pelo MetaNutri')
  })
```

Troque o conteúdo inteiro de `src/domain/legal.test.ts` por:

```ts
import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  it('CA-381 e CA-382: os termos e a política mudaram com o checkout próprio, e a data acompanha', () => {
    expect(VERSAO_TERMOS).toBe('2026-10-03')
    expect(DATA_TERMOS).toBe('3 de outubro de 2026')
  })
})
```

Em `src/ui/publico/TelaVoltaPagamento.test.tsx`, dentro do `describe('TelaVoltaPagamento'`:

```tsx
  it('CA-381 e CA-383: nenhum estado cita o processador nem usa ícone de biblioteca', () => {
    const estados: [Assinatura, boolean][] = [
      [SEM_ASSINATURA, false],
      [assinatura({ plano: 'solo', planoPedido: 'solo', status: 'ativa' }), true],
      [assinatura({ planoPedido: 'solo', status: 'pendente' }), true],
      [assinatura({ planoPedido: 'pro', status: 'cancelada' }), true],
    ]
    for (const [a, carregado] of estados) {
      const { container, unmount } = montar(a, carregado)
      expect(container.textContent).not.toMatch(/mercado ?pago/i)
      expect(container.querySelectorAll('svg:not([data-icone])')).toHaveLength(0)
      unmount()
    }
    Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true })
    const { container } = montar(assinatura({ planoPedido: 'solo', status: 'pendente' }))
    expect(container.querySelectorAll('svg:not([data-icone])')).toHaveLength(0)
  })
```

No fim de `e2e/publico.spec.ts`:

```ts
test('CA-381: Preços e Termos não citam o processador', async ({ page }) => {
  await page.goto('/#/precos')
  await expect(page.getByRole('radiogroup', { name: 'Período de cobrança' }).first()).toBeVisible()
  expect(await page.locator('body').innerText()).not.toMatch(/mercado ?pago/i)

  await page.goto('/#/termos')
  await expect(page.getByRole('heading', { level: 1, name: 'Termos de uso' })).toBeVisible()
  expect(await page.locator('body').innerText()).not.toMatch(/mercado ?pago/i)
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/publico/SecaoPrecos.test.tsx src/ui/publico/legal.test.tsx src/domain/legal.test.ts src/ui/publico/TelaVoltaPagamento.test.tsx`
Expected: FAIL — Preços e Termos ainda citam o processador, a política ainda diz "Nenhum dado de cartão passa pelo MetaNutri", a data é de 2 de outubro e a volta do pagamento usa o Lucide.

- [ ] **Step 3: Implementar**

`src/domain/legal.ts`, linhas 13 e 14. **Use a data do dia em que esta tarefa for feita.** Os valores abaixo são para 3 de outubro de 2026; se for outro dia, troque aqui e nos quatro lugares do Step 1 (`legal.test.ts` e as duas linhas do mock e as duas conferências em `legal.test.tsx`). Se for o próprio 2 de outubro de 2026, a versão já é desse dia: deixe `legal.ts` como está e volte os testes para 2 de outubro.

```ts
export const VERSAO_TERMOS = '2026-10-03'
export const DATA_TERMOS = '3 de outubro de 2026'
```

`src/ui/publico/SecaoPrecos.tsx`, a nota do rodapé:

```tsx
      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
        Preço de fundador para as {VAGAS_PRECO_FUNDADOR} primeiras assinaturas: quem entra nessa faixa fica nela, mesmo quando o preço subir. O
        pagamento é com cartão de crédito, aqui mesmo no site, e você cancela quando quiser em Conta e plano.
      </p>
```

`src/ui/publico/TelaTermos.tsx`, a lista de "Planos e pagamento":

```tsx
      <ul>
        <li>Solo e Pro são assinaturas pagas com cartão de crédito, no ciclo mensal ou anual, e renovam sozinhas até você cancelar.</li>
        <li>Para cancelar, use Conta e plano. O plano pago vale até o fim do período já pago; depois a conta volta para o Free, sem perder nada.</li>
        <li>Quem entrou no preço de fundador mantém esse preço enquanto a assinatura estiver ativa.</li>
        <li>
          O plano pago começa quando o banco autoriza o cartão. Se as cobranças forem recusadas também nas novas tentativas, a assinatura é cancelada
          e a conta volta para o Free.
        </li>
      </ul>
```

`src/ui/publico/TelaPrivacidade.tsx`, troque a linha `<li>O pagamento acontece no Mercado Pago. Nenhum dado de cartão passa pelo MetaNutri.</li>` por:

```tsx
        <li>
          O pagamento é processado pelo Mercado Pago. Os dados do cartão (número, validade e código) vão direto do seu navegador para ele,
          criptografados, sem passar pelo MetaNutri. O MetaNutri guarda só a bandeira, os 4 últimos números do cartão e a data da próxima
          cobrança, para mostrar em Conta e plano. Para os campos do cartão terem a letra do site, eles buscam a fonte no Google Fonts.
        </li>
```

`src/ui/publico/TelaVoltaPagamento.tsx`:

- troque `import { Check, Clock, WifiOff, X } from 'lucide-react'` por

```tsx
import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'
import { PontosDaMarca } from '@ds/componentes/display/PontosDaMarca.tsx'
```

- troque o comentário `/** A volta do Mercado Pago (spec estilo-spora, US-1.9). O plano só muda com a confirmação do servidor. */` por `/** A volta do pagamento (spec estilo-spora, US-1.9), para os links de antes do checkout próprio. O plano só muda com a confirmação do servidor. Nenhum texto cita o processador (CA-381) e os ícones são os da marca (CA-383). */`;
- no `Cartao` de "Não consegui conferir", `selo={<WifiOff />}` vira `selo={<IconeMarca nome="alerta" />}`;
- no de "Conferindo o pagamento…", `selo={<Clock />}` vira `selo={<PontosDaMarca pulsando />}`;
- no de "Assinatura ativa", `selo={<Check />}` vira `selo={<IconeMarca nome="check" destaque />}`;
- no de "Pagamento em análise", `selo={<Clock />}` vira `selo={<IconeMarca nome="calendario" />}`;
- no de "Pagamento não concluído", `selo={<X />}` vira `selo={<IconeMarca nome="fechar" />}`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/ui/publico src/domain/legal.test.ts` → PASS. Depois `npm run check` → verde, `npx playwright test` → verde e `node scripts/conferir-publicacao.mjs` → "pode publicar".

- [ ] **Step 5: Commit**

```bash
git add src/ui/publico/SecaoPrecos.tsx src/ui/publico/SecaoPrecos.test.tsx src/ui/publico/TelaTermos.tsx src/ui/publico/TelaPrivacidade.tsx src/ui/publico/legal.test.tsx src/domain/legal.ts src/domain/legal.test.ts src/ui/publico/TelaVoltaPagamento.tsx src/ui/publico/TelaVoltaPagamento.test.tsx e2e/publico.spec.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `docs(legal): pagamento no site nos termos e o processador só na política`

---

### Tarefa 12: Documentação, validação final e o que fica com você

**Files:**
- Modify: `README.md` (seção "O que o sistema faz", a linha de "Conta e plano")
- Modify: `DESIGN.md` (seção "Campos" e uma seção nova "Ícones da marca")
- Modify: `docs/decisoes.md` (uma linha nova no fim da tabela)
- Modify: `docs/pendencias.md` (um parágrafo depois do bloco "Atualizado em 02/10")
- Modify: `specs/checkout-proprio/SPEC.md` (status)

- [ ] **Step 1: Registro**

`README.md`, em "O que o sistema faz", troque

```markdown
- **Conta e plano** — entrar, sair e ver a assinatura. Só funciona sem conta quando o
  Supabase não está configurado (modo local); com ele, a conta é obrigatória. Veja abaixo.
```

por

```markdown
- **Conta e plano** — entrar, sair, ver a assinatura, o cartão que paga e a próxima cobrança, trocar o cartão e
  cancelar. Só funciona sem conta quando o Supabase não está configurado (modo local); com ele, a conta é obrigatória.
  Veja abaixo.
- **Assinar** — o checkout do site: Solo ou Pro, mensal ou anual, com cartão de crédito, sem sair do MetaNutri. O
  número do cartão vai direto para a operadora de pagamento, em campos seguros. Precisa do
  `008-cartao-da-assinatura.sql`, das três funções e da chave pública (passos 4, 5 e 7 de "Projeto já ligado").
```

`DESIGN.md`, logo depois do parágrafo de `### Campos` (o que termina em `` `aria-invalid` troca a borda para a cor de erro. ``):

```markdown
No formulário do cartão (checkout e Trocar cartão; spec checkout-proprio, D-73) os cinco
campos usam a caixa do protótipo v2: 48 px, raio 12, fundo `--surface-sunken` e sem fio; no
foco, fundo de cartão e anel de 2 px por dentro; com erro, fundo e anel de erro. Três deles
são campos seguros da operadora (iframes): a cor do texto, a do placeholder e o tamanho da
letra vão para dentro deles lidos dos tokens do tema na hora em que o formulário abre.

### Ícones da marca

O app usa o Lucide pelo `Icon`. O checkout, Conta e plano e a volta do pagamento usam só o
`IconeMarca` (traço arredondado de 1,8 e um ponto, como a logo; o ponto principal pode ser
laranja) e os `PontosDaMarca` no lugar da roda de carregamento (spec checkout-proprio, D-73 e
CA-383). Nenhum emoji nem símbolo de texto como ícone nessas telas.
```

`docs/decisoes.md`, nova linha ao fim da tabela, antes de "Custos de referência":

```markdown
| 02/10/2026 | **Checkout próprio** (D-65 a D-73 da `specs/checkout-proprio/SPEC.md`, resumidas aqui): D-65 o pagamento é no checkout do site, com cartão de crédito, sem ir a outro site · D-66 número, validade e código em campos seguros da operadora, com o visual do site; nome impresso e CPF são campos nossos · D-67 só cartão de crédito · D-68 a assinatura nasce autorizada e o plano libera na hora · D-69 cancelar e trocar cartão em Conta e plano; cancelada vale até o fim do período pago · D-70 o banco guarda só a bandeira, os 4 últimos números e a próxima cobrança · D-71 o nome do processador só na Política de privacidade · D-72 a chave pública numa variável do site · D-73 visual novo e ícones próprios da marca no checkout, em Conta e plano e na volta do pagamento | pedido seu de 02/10/2026 ("quero bem white label"), visto no protótipo "Checkout MetaNutri" v2 | usuário |
```

`docs/pendencias.md`, logo depois do bloco que começa com `> **Atualizado em 02/10:** a tela **Negócio**` (use a data do dia, a mesma da Tarefa 11):

```markdown
> **Atualizado em 03/10:** o **checkout próprio** (spec `checkout-proprio`) leva o pagamento para dentro do site:
> cartão de crédito em campos seguros, assinatura já autorizada, e cancelar e trocar o cartão em Conta e plano. Fica
> em modo teste até o teste de ponta a ponta com o comprador de teste passar. Falta rodar o
> `supabase/008-cartao-da-assinatura.sql`, publicar as três funções e criar a variável `VITE_MERCADOPAGO_PUBLIC_KEY`
> no GitHub. Fora deste trabalho: o aviso de cada cobrança recusada (hoje o plano cai quando a operadora cancela a
> assinatura, depois das novas tentativas).
```

`specs/checkout-proprio/SPEC.md`: troque `Status: **aguardando aprovação**.` por `Status: **aprovada** em 02/10/2026.` (se a aprovação foi em outro dia, use esse dia).

- [ ] **Step 2: Validação completa**

Run: `npm run check` → verde (lint, typecheck e todos os testes).
Run: `npx playwright test` → verde.
Run: `node scripts/conferir-publicacao.mjs` → "pode publicar".
Run: `npm run build` → sem erro (o build importa `supabase/functions/_shared/cobranca.ts` pelo domínio).

- [ ] **Step 3: Cobertura dos critérios**

Run: `grep -rhoE "CA-3(6[6-9]|7[0-9]|8[0-3])|CB-(8[89]|9[0-5])" src design-system e2e --include=*.test.ts --include=*.test.tsx --include=*.spec.ts | sort -u`
Expected: de CA-366 a CA-383 e de CB-88 a CB-95, todos na lista (26 linhas). Confira com a tabela "Cobertura da spec" no fim deste plano.

Run: `grep -rn "lucide-react" src/ui/publico/TelaCheckout.tsx src/ui/conta src/ui/pagamento src/ui/publico/TelaVoltaPagamento.tsx src/ui/painel/AvisoCrn.tsx`
Expected: nada (CA-383).

Run: `grep -rniE "mercado ?pago" src --include=*.tsx | grep -v "\.test\." | grep -v "TelaPrivacidade.tsx" | grep -v "TelaNegocio.tsx"`
Expected: só comentários e o import de `processadorMercadoPago.ts` no `App.tsx`, nunca texto de tela (D-71). A `TelaNegocio` é a tela do dono, fora do alcance do D-71.

- [ ] **Step 4: Commit**

```bash
git add README.md DESIGN.md docs/decisoes.md docs/pendencias.md specs/checkout-proprio/SPEC.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `docs: checkout próprio registrado`

- [ ] **Step 5: Com o usuário — banco, funções, variável e publicação, nesta ordem**

Estes passos mexem no servidor de verdade. Faça junto com o usuário, um de cada vez, e pare se um deles falhar.

1. **`008` rodado?** Confirme que o Step 7 da Tarefa 1 foi feito (a consulta de conferência voltou três linhas). Sem ele, a `assinar` nova não grava e cancela a assinatura na operadora na hora.
2. **Juntar a branch na `main`** (com `superpowers:finishing-a-development-branch`). As funções saem do código da `main`.
3. **Publicar as três funções**, nesta ordem (a `gerenciar-assinatura` não tem versão antiga; a `assinar` nova precisa do site novo, que vem no item 5):

```bash
npx supabase functions deploy gerenciar-assinatura --project-ref qmpljfjbdcrdbqutuvmg
npx supabase functions deploy assinar --project-ref qmpljfjbdcrdbqutuvmg
npx supabase functions deploy webhook-mercadopago --no-verify-jwt --project-ref qmpljfjbdcrdbqutuvmg
```

Expected em cada uma: `Deployed Functions on project qmpljfjbdcrdbqutuvmg: <nome>`. Se pedir login, pare e avise o usuário; não peça chave no chat.

4. **A variável do GitHub** (Tarefa 7, Step 11). Run: `gh variable list` → tem `VITE_MERCADOPAGO_PUBLIC_KEY`.
5. **Publicar o site.** Run: `gh workflow run "Publicar no GitHub Pages" --ref main` e depois `gh run watch` → os dois trabalhos verdes. Entre os itens 3 e 5, o checkout do site no ar não funciona (está em modo teste; ninguém paga de verdade).

- [ ] **Step 6: Com o usuário — o teste de ponta a ponta com o comprador de teste (R-36)**

No modo teste, só um comprador de teste paga, e a conta do MetaNutri precisa ter o e-mail dele.

1. No Mercado Pago, em *Suas integrações > Contas de teste*, use (ou crie) a conta **compradora** de teste e anote o e-mail.
2. Em `https://metanutri.com.br/#/criar-conta`, crie uma conta de nutricionista com esse e-mail e confirme o e-mail.
3. Abra `https://metanutri.com.br/#/assinar/solo/mensal` e confira, nos temas claro e escuro: os cinco campos com a mesma caixa (CA-368), o texto dos campos seguros na cor do tema e o fundo da caixa aparecendo, a letra Manrope (R-34), nenhuma marca da operadora na tela (CA-367), os pontos da logo no andamento (CA-383).
4. Número `5067 7667 8388 8311` (Elo de débito): aparece "Use um cartão de crédito." e o botão fica parado (CA-369).
5. Número `5480 8328 0103 3311`, validade `11/30`, código `123`, nome **`OTHE`**, CPF `123.456.789-09`, autorização marcada: aparece a recusa em português, o código de segurança some, o botão volta (CA-373).
6. Mesmo cartão, nome **`APRO`**: "Confirmando com o banco…" e depois "Assinatura ativa", com a próxima cobrança (CA-371, CA-372). O app já libera o plano Solo.
7. No Supabase (*Table Editor > assinaturas*), a linha da conta: `status` `ativa`, `cartao_bandeira`, `cartao_final` `3311`, `proxima_cobranca` um mês à frente.
8. Em Conta e plano: o cartão final 3311, a próxima cobrança e os dois botões (CA-376). **Trocar cartão** com `4235 6477 2802 5682` (Visa), `11/30`, `123`, `APRO`: "Cartão trocado" e o final 5682 (CA-379).
9. **Cancelar assinatura** → "Manter assinatura" com o foco → confirmar: "Cancelada, vale até …" (CA-377, CA-378). No painel do Mercado Pago, a assinatura aparece cancelada; no Supabase, `status` `cancelada` e `expira_em` na véspera da próxima cobrança.
10. Se a conferência da Tarefa 7 (Step 9) foi pulada, faça-a agora, no site publicado.

Qualquer diferença vira correção antes de fechar a spec. Só depois deste teste passar troque o token do servidor e a chave pública pelos de produção (README, passos 5 e 7).

---

## Cobertura da spec

| Critério | Teste |
|---|---|
| CA-366 | `TelaCheckout.test.tsx` · `FormularioCartao.test.tsx` · `assinaturaTextos.test.ts` · `cobrancaServidor.test.ts` |
| CA-367 | `TelaCheckout.test.tsx` · `e2e/publico.spec.ts` |
| CA-368 | `processadorCartao.test.ts` · `processadorMercadoPago.test.ts` · `FormularioCartao.test.tsx` · conferência no navegador (Tarefa 7, Step 9; Tarefa 12, Step 6) |
| CA-369 | `cartao.test.ts` · `processadorMercadoPago.test.ts` · `FormularioCartao.test.tsx` · `TelaCheckout.test.tsx` |
| CA-370 | `cartao.test.ts` · `processadorMercadoPago.test.ts` · `FormularioCartao.test.tsx` · `TelaCheckout.test.tsx` |
| CA-371 | `FormularioCartao.test.tsx` · `TelaCheckout.test.tsx` |
| CA-372 | `assinaturaTextos.test.ts` · `usarAssinatura.test.ts` · `TelaCheckout.test.tsx` |
| CA-373 | `cartao.test.ts` · `cobrancaServidor.test.ts` · `sqlCheckout.test.ts` · `processadorMercadoPago.test.ts` · `FormularioCartao.test.tsx` · `usarAssinatura.test.ts` · `TelaCheckout.test.tsx` |
| CA-374 | `cartao.test.ts` · `usarAssinatura.test.ts` · `TelaCheckout.test.tsx` |
| CA-375 | `sqlCheckout.test.ts` · `usarAssinatura.test.ts` · `TelaCheckout.test.tsx` |
| CA-376 | `assinaturaTextos.test.ts` · `TelaConta.test.tsx` |
| CA-377 | `assinaturaTextos.test.ts` · `TelaConta.test.tsx` |
| CA-378 | `cobrancaServidor.test.ts` · `sqlCheckout.test.ts` · `assinatura.test.ts` · `assinaturaTextos.test.ts` · `usarAssinatura.test.ts` · `TelaConta.test.tsx` |
| CA-379 | `sqlCheckout.test.ts` · `usarAssinatura.test.ts` · `TelaConta.test.tsx` |
| CA-380 | `TelaCheckout.test.tsx` · `TelaConta.test.tsx` |
| CA-381 | `assinatura.test.ts` · `SecaoPrecos.test.tsx` · `legal.test.tsx` · `legal.test.ts` · `TelaConta.test.tsx` · `TelaVoltaPagamento.test.tsx` · `e2e/publico.spec.ts` |
| CA-382 | `legal.test.tsx` · `legal.test.ts` |
| CA-383 | `IconeMarca.test.tsx` · `FormularioCartao.test.tsx` · `TelaCheckout.test.tsx` · `TelaConta.test.tsx` · `TelaVoltaPagamento.test.tsx` |
| CB-88 | `cartao.test.ts` · `processadorMercadoPago.test.ts` · `FormularioCartao.test.tsx` · `TelaCheckout.test.tsx` |
| CB-89 | `cartao.test.ts` · `processadorMercadoPago.test.ts` · `TelaCheckout.test.tsx` |
| CB-90 | `cobrancaServidor.test.ts` · `cartao.test.ts` · `processadorMercadoPago.test.ts` · `usarAssinatura.test.ts` · `TelaCheckout.test.tsx` |
| CB-91 | `sqlCheckout.test.ts` · `usarAssinatura.test.ts` · `TelaCheckout.test.tsx` |
| CB-92 | `usarAssinatura.test.ts` · `TelaConta.test.tsx` |
| CB-93 | `sqlCheckout.test.ts` · `usarAssinatura.test.ts` |
| CB-94 | `sqlCheckout.test.ts` · `assinatura.test.ts` |
| CB-95 | `sqlCheckout.test.ts` · `TelaCheckout.test.tsx` |
| D-70 | `sqlCheckout.test.ts` · `cobrancaServidor.test.ts` · `assinatura.test.ts` |
| D-72 | `processadorMercadoPago.test.ts` · `sqlCheckout.test.ts` (o `publicar.yml`) |
| D-73 | `IconeMarca.test.tsx` · `e2e/design-system.spec.ts` |
