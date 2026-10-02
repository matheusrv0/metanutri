# Painel do dono (tela Negócio) · Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa por tarefa. Os passos usam caixa (`- [ ]`) para acompanhar.

**Objetivo:** o dono do MetaNutri abre a tela Negócio e vê receita por mês, assinaturas por plano, quem chegou nos últimos 30 dias e a lista de contas, lidos do banco só para o administrador.

**Arquitetura:** o banco ganha três leituras novas, todas travadas por `eh_admin()`, mais o histórico de cada mudança de assinatura (gravado por gatilho) e o ciclo mensal/anual (`007-painel-do-dono.sql`). O navegador lê as três de uma vez (`useNegocio`) e entrega as linhas a um domínio puro e testado (`negocio.ts` para as contas, a receita e o funil; `negocioTextos.ts` para dinheiro, datas em Brasília e selos). A tela só monta as peças, com um componente novo na biblioteca para o gráfico (`GraficoBarras`) e um encaixe novo no `CartaoNumero` para a barra das vagas de fundador.

**Stack:** React 18 + TypeScript strict + Vite + Tailwind v4 + shadcn/ui · Vitest + Testing Library · Playwright · Supabase (Postgres + Edge Functions em Deno).

**Spec:** `specs/painel-do-dono/SPEC.md`. Telas aprovadas no protótipo "Painel do dono MetaNutri" (`https://claude.ai/code/artifact/350562ab-0dae-4401-84b3-e08e1f6f7a6a`), em 02/10/2026.

## Restrições globais

- Nenhuma dependência nova.
- Import do design system pelo alias `@ds/...`; do domínio, `@/domain/...`.
- Componentes funcionais, um por arquivo, export nomeado. `exactOptionalPropertyTypes` ligado: prop opcional é `readonly x?: T | undefined`. `noUncheckedIndexedAccess` ligado.
- Lint: nada de cor hexadecimal nem `font-family` em `.ts`/`.tsx`; dentro de `design-system/componentes/{forms,display,navigation,nutricao}` também nada de `NNpx` em texto. Componente novo de interface mora em `design-system/componentes/`, entra em `design-system/index.ts`, no `LEIA-ME.md` dos componentes e na vitrine (`design-system/vitrine/TelaDesignSystem.tsx`).
- Toque mínimo de 44 px: botão de texto e link de ação com `inline-flex min-h-11 items-center`.
- Laranja nunca entra em painel de dado: o gráfico e as barras usam `bg-primary` (teal no claro, marfim no escuro).
- Datas e meses no **horário de Brasília** (UTC−3 o ano todo; o Brasil não tem horário de verão desde 2019).
- Frase de recusa do banco, exata: **"Só o administrador vê estes números."** (CA-344).
- A tela só lê. Nenhuma escrita nova no banco além do gatilho do histórico.
- Toda tarefa termina com `npm run check` verde (lint + typecheck + testes). Tarefa que mexe em tela roda também `npx playwright test`.
- Branch `feat/painel-do-dono`, saída da `main` local. Commit em Conventional Commits, em português, com a mensagem num arquivo UTF-8 (`../_msg.txt`) terminado pela linha exata `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Comando: `git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt`.

## Foco de revisão

1. **Virada do dia e do mês em Brasília** (CB-85). Uma conta criada às 23h50 de 30/09 em Brasília (02h50 de 01/10 em UTC) é de setembro e mostra "30/09/2026". Testes nas Tarefas 4 e 5.
2. **Assinatura anual sem ciclo no banco** (feita antes do `007` ou antes de a função `assinar` ser publicada de novo). O valor do anual decide; sem isso, um Solo anual de R$ 299 apareceria como R$ 299 por mês. Teste na Tarefa 4.
3. **Linha estranha do banco** (campo nulo, situação desconhecida, plano que não existe). Vira nulo e a tela continua, sem quebrar. Teste na Tarefa 4.
4. **A conta do próprio dono**, sem nome de perfil, sem situação e sem assinatura. Aparece como "Sem situação" e "Free", e o nome cai para o e-mail quando vazio. Testes nas Tarefas 4, 5 e 8.
5. **Falha de leitura depois de uma leitura boa e clique duplo em Atualizar** (CB-79, CB-86). Os números antigos ficam, e só uma leitura acontece por vez. Testes na Tarefa 6.

## Decisões que tomei e você revisa

1. **Quem apaga a conta some também dos meses passados do gráfico.** O histórico é apagado junto com a conta (`on delete cascade`), como todo o resto da conta, pela LGPD. A receita de meses antigos pode cair um pouco depois de uma exclusão.
2. **A receita de agora vem da tabela de assinaturas; a dos meses passados, do histórico.** O cartão de cima e a barra do mês atual sempre batem. Os meses passados dependem do histórico, que começa quando o `007` rodar (R-30).
3. **Quem começou a pagar e desistiu conta como "pagamento pendente" até mudar.** O Mercado Pago não avisa desistência; a assinatura fica pendente.
4. **O contador da lista mostra o total do grupo mesmo sem busca** ("312 de 312"). Com busca, mostra quantas sobraram ("3 de 312").
5. **Nenhum e2e novo.** A tela só existe com servidor e conta de administrador, e o e2e roda sem servidor. A cobertura vem de testes de tela com o banco simulado, como em Aprovações, mais a conferência com o servidor de verdade na Tarefa 10.
6. **As leituras do painel são negadas também ao visitante sem conta** (`revoke ... from public, anon`), além da trava `eh_admin()`. As funções de Aprovações não fazem isso; aqui custa uma linha.

---

## Ordem e dependências

| # | Tarefa | Depende de |
|---|---|---|
| 1 | Política de privacidade: Resend, finalidade da conta e data | — |
| 2 | Banco: ciclo, histórico e as três leituras (`007`) | — |
| 3 | Função `assinar` grava o ciclo | 2 rodado no servidor |
| 4 | Domínio: contas, receita, funil e lista (`negocio.ts`) | — |
| 5 | Domínio: textos do painel (`negocioTextos.ts`) | 4 |
| 6 | Estado: leitura do painel (`useNegocio`) | 4 |
| 7 | Biblioteca: `GraficoBarras` e o encaixe `extra` do `CartaoNumero` | — |
| 8 | Tela Negócio | 4, 5, 6, 7 |
| 9 | Rota, menu e App | 6, 8 |
| 10 | Documentação e validação final | 1 a 9 |

A Tarefa 1 corrige um texto que vai ao ar na publicação do site, então pode ser juntada à `main` antes do resto.

## Mapa de arquivos

| Arquivo | Tarefa | O que faz |
|---|---|---|
| `src/domain/legal.ts` | 1 | data dos termos |
| `src/domain/legal.test.ts` (novo) | 1 | a data dos termos |
| `src/ui/publico/TelaPrivacidade.tsx` | 1 | as duas frases |
| `src/ui/publico/legal.test.tsx` | 1 | CA-365 |
| `supabase/007-painel-do-dono.sql` (novo) | 2 | ciclo, histórico, gatilho e leituras |
| `src/data/sqlPainel.test.ts` (novo) | 2, 3 | travas do SQL e da função `assinar` |
| `README.md` | 2, 10 | rodar o `007`; o painel |
| `supabase/functions/assinar/index.ts` | 3 | grava o ciclo |
| `src/domain/negocio.ts` (novo) | 4 | tipos, leitura das linhas, receita, funil, lista, eixo |
| `src/domain/negocio.test-utils.ts` (novo) | 4 | contas e histórico de mentira para os testes |
| `src/domain/negocio.test.ts` (novo) | 4 | |
| `src/domain/negocioTextos.ts` (novo) | 5 | dinheiro, datas em Brasília, selos, último login |
| `src/domain/negocioTextos.test.ts` (novo) | 5 | |
| `src/ui/estado/usarNegocio.ts` (novo) | 6 | as três leituras, erro e Atualizar |
| `src/ui/estado/usarNegocio.test.ts` (novo) | 6 | |
| `design-system/componentes/display/GraficoBarras.tsx` (novo) | 7 | barras de uma série com dica |
| `design-system/componentes/display/GraficoBarras.test.tsx` (novo) | 7 | |
| `design-system/componentes/display/CartaoNumero.tsx` | 7 | prop `extra` |
| `design-system/componentes/estilo.test.tsx` | 7 | o `extra` |
| `design-system/index.ts`, `design-system/componentes/LEIA-ME.md`, `design-system/vitrine/TelaDesignSystem.tsx` | 7 | o componente novo |
| `src/ui/negocio/NumerosDoNegocio.tsx` (novo) | 8 | os quatro cartões |
| `src/ui/negocio/ReceitaPorMes.tsx` (novo) | 8 | o gráfico |
| `src/ui/negocio/AssinaturasPorPlano.tsx` (novo) | 8 | linhas por plano e selos |
| `src/ui/negocio/QuemChegou.tsx` (novo) | 8 | funil e uso |
| `src/ui/negocio/LinhaDeConta.tsx` (novo) | 8 | uma linha da lista |
| `src/ui/negocio/ListaDeContas.tsx` (novo) | 8 | grupos, busca e tabela |
| `src/ui/negocio/TelaNegocio.tsx` (novo) | 8 | a tela, o aviso e o rodapé |
| `src/ui/negocio/negocioFalso.test-utils.ts` (novo) | 8, 9 | dados de mentira para as telas |
| `src/ui/negocio/TelaNegocio.test.tsx`, `src/ui/negocio/ListaDeContas.test.tsx` (novos) | 8 | |
| `src/ui/navegacao.ts`, `src/ui/navegacao.test.ts` | 9 | rota `#/negocio` |
| `src/ui/layout/MenuLateral.tsx` | 9 | item Negócio |
| `src/App.tsx`, `src/AppConta.test.tsx` | 9 | a tela no App |
| `docs/decisoes.md`, `docs/pendencias.md`, `specs/painel-do-dono/SPEC.md` | 10 | registro |

---

### Tarefa 1: Política de privacidade: Resend, finalidade da conta e data

Cobre CA-365 (D-64).

**Files:**
- Modify: `src/domain/legal.ts:13-14`
- Create: `src/domain/legal.test.ts`
- Modify: `src/ui/publico/TelaPrivacidade.tsx:23,46`
- Modify: `src/ui/publico/legal.test.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: `VERSAO_TERMOS = '2026-10-02'`, `DATA_TERMOS = '2 de outubro de 2026'`.

- [ ] **Step 1: Escrever os testes que falham**

Crie `src/domain/legal.test.ts`:

```ts
import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  it('CA-365: os termos e a política têm a data de 2 de outubro de 2026', () => {
    expect(VERSAO_TERMOS).toBe('2026-10-02')
    expect(DATA_TERMOS).toBe('2 de outubro de 2026')
  })
})
```

Em `src/ui/publico/legal.test.tsx`, troque no `vi.mock` as duas datas e as duas conferências de data, e acrescente o teste do CA-365 dentro do `describe`:

```ts
  DATA_TERMOS: '2 de outubro de 2026',
  VERSAO_TERMOS: '2026-10-02',
```

```ts
    expect(screen.getByText(/Versão de 2 de outubro de 2026/)).toBeInTheDocument()
```

```ts
    expect(texto).toContain('2 de outubro de 2026')
```

```ts
  it('CA-365: a política diz que o responsável acompanha contas e assinaturas e que os e-mails saem pelo Resend', () => {
    render(<TelaPrivacidade />)
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('também servem para o responsável pelo MetaNutri acompanhar as contas e as assinaturas')
    expect(texto).toContain('são enviados pelo Resend')
    expect(texto).not.toContain('Gmail')
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/legal.test.ts src/ui/publico/legal.test.tsx`
Expected: FAIL — `VERSAO_TERMOS` ainda é `2026-09-30` e a política ainda fala em Gmail.

- [ ] **Step 3: Implementar**

`src/domain/legal.ts`:

```ts
export const VERSAO_TERMOS = '2026-10-02'
export const DATA_TERMOS = '2 de outubro de 2026'
```

`src/ui/publico/TelaPrivacidade.tsx`, linha 23:

```tsx
        <li>
          Nome, e-mail e senha de quem usa: para criar e manter a conta. A senha é guardada cifrada. O nome, o e-mail, a situação e o plano
          também servem para o responsável pelo MetaNutri acompanhar as contas e as assinaturas.
        </li>
```

Linha 46:

```tsx
        <li>Os e-mails de confirmação e de troca de senha são enviados pelo Resend, com o endereço do MetaNutri.</li>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/domain/legal.test.ts src/ui/publico/legal.test.tsx` → PASS. Depois `npm run check` → verde.

- [ ] **Step 5: Commit**

```bash
git add src/domain/legal.ts src/domain/legal.test.ts src/ui/publico/TelaPrivacidade.tsx src/ui/publico/legal.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `fix(legal): política diz Resend e para que o dono vê as contas`

---

### Tarefa 2: Banco: ciclo, histórico e as três leituras (`007`)

Cobre CA-344, D-58, D-59 e o lado do banco de CA-345 a CA-362.

**Files:**
- Create: `supabase/007-painel-do-dono.sql`
- Create: `src/data/sqlPainel.test.ts`
- Modify: `README.md` (seções "Projeto novo", passo 3, e "Projeto já ligado", passo 4)

**Interfaces:**
- Consumes: `public.eh_admin()`, tabelas `assinaturas`, `perfis`, `pedidos_estudante`, `acompanhamentos`, `copias` (001 a 006).
- Produces (o que a Tarefa 6 chama por `rpc`):
  - `painel_contas()` → linhas `{ id, nome, email, criada_em, email_confirmado_em, ultimo_login_em, situacao, crn_regiao, crn_status, pedido_status, plano, status, ciclo, valor_centavos, preco_travado, expira_em, assinatura_atualizada_em }`, mais nova primeiro.
  - `painel_historico_assinaturas()` → linhas `{ nutricionista_id, plano, status, ciclo, valor_centavos, preco_travado, quando }`, mais antiga primeiro.
  - `painel_uso()` → uma linha `{ links_30_dias, copias_30_dias }`.
  - Coluna nova `public.assinaturas.ciclo` (`'mensal' | 'anual' | null`).

- [ ] **Step 1: Escrever o teste que falha**

Crie `src/data/sqlPainel.test.ts`:

```ts
import sql from '../../supabase/007-painel-do-dono.sql?raw'

const corpoDa = (nome: string) => sql.split(`create or replace function public.${nome}(`)[1]?.split('$$;')[0] ?? ''

describe('SQL do painel do dono (spec painel-do-dono)', () => {
  it('CA-344: toda leitura do painel confere eh_admin antes de tudo, com a frase da spec', () => {
    for (const nome of ['painel_contas', 'painel_historico_assinaturas', 'painel_uso']) {
      expect(corpoDa(nome), nome).toMatch(
        /begin\s+if not public\.eh_admin\(\) then raise exception 'Só o administrador vê estes números\.' using errcode = '42501'; end if;/,
      )
      expect(sql, nome).toContain(`revoke all on function public.${nome}() from public, anon;`)
      expect(sql, nome).toContain(`grant execute on function public.${nome}() to authenticated;`)
    }
  })

  it('D-58: o histórico não tem política nenhuma: o gatilho escreve e as funções leem', () => {
    expect(sql).toContain('alter table public.assinaturas_historico enable row level security;')
    expect(sql).not.toMatch(/create policy "[^"]+" on public\.assinaturas_historico/)
  })

  it('D-58: o gatilho grava só quando muda o que conta para a receita', () => {
    const corpo = corpoDa('registrar_mudanca_de_assinatura')
    for (const campo of ['status', 'plano', 'ciclo', 'valor_centavos', 'preco_travado']) {
      expect(corpo, campo).toContain(`old.${campo} is distinct from new.${campo}`)
    }
    expect(sql).toContain('after insert or update on public.assinaturas')
  })

  it('D-59: as assinaturas antigas ganham o ciclo pelo preço do anual', () => {
    expect(sql).toContain("set ciclo = case when valor_centavos in (29900, 59900) then 'anual' else 'mensal' end")
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/data/sqlPainel.test.ts`
Expected: FAIL — o arquivo `007-painel-do-dono.sql` não existe.

- [ ] **Step 3: Escrever o SQL**

Crie `supabase/007-painel-do-dono.sql`:

```sql
-- MetaNutri — painel do dono (spec painel-do-dono).
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Pode rodar de novo:
-- nada é apagado, e as funções são refeitas.
--
-- Três coisas: o ciclo (mensal ou anual) de cada assinatura (D-59), o histórico de
-- cada mudança de assinatura, que o gráfico de receita lê (D-58), e as leituras do
-- painel, que só o administrador consegue chamar (CA-344).

-- ---------- Ciclo da assinatura ----------

alter table public.assinaturas add column if not exists ciclo text check (ciclo in ('mensal', 'anual'));

-- As que já existem: o anual é cobrado de uma vez, R$ 299 (Solo) ou R$ 599 (Pro).
-- Estudante e Free não têm valor e ficam sem ciclo.
update public.assinaturas
   set ciclo = case when valor_centavos in (29900, 59900) then 'anual' else 'mensal' end
 where ciclo is null and valor_centavos > 0;


-- ---------- Histórico das mudanças ----------

create table if not exists public.assinaturas_historico (
  id bigint generated always as identity primary key,
  -- Sai junto com a conta, como todo o resto dela (LGPD).
  nutricionista_id uuid not null references auth.users (id) on delete cascade,
  plano text not null,
  status text not null,
  ciclo text,
  valor_centavos integer not null,
  preco_travado boolean not null,
  quando timestamptz not null default now()
);
create index if not exists assinaturas_historico_por_conta on public.assinaturas_historico (nutricionista_id, quando);
alter table public.assinaturas_historico enable row level security;
-- Sem política nenhuma, de propósito: o gatilho escreve e as funções do painel leem.

create or replace function public.registrar_mudanca_de_assinatura()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- O webhook regrava atualizado_em a cada aviso do Mercado Pago; isso não é mudança.
  if tg_op = 'UPDATE'
     and not (old.status is distinct from new.status
              or old.plano is distinct from new.plano
              or old.ciclo is distinct from new.ciclo
              or old.valor_centavos is distinct from new.valor_centavos
              or old.preco_travado is distinct from new.preco_travado) then
    return new;
  end if;
  insert into public.assinaturas_historico (nutricionista_id, plano, status, ciclo, valor_centavos, preco_travado)
  values (new.nutricionista_id, new.plano, new.status, new.ciclo, new.valor_centavos, new.preco_travado);
  return new;
end;
$$;

revoke all on function public.registrar_mudanca_de_assinatura() from public, anon;

drop trigger if exists guardar_historico_da_assinatura on public.assinaturas;
create trigger guardar_historico_da_assinatura
  after insert or update on public.assinaturas
  for each row execute function public.registrar_mudanca_de_assinatura();

-- O ponto de partida: a situação de hoje de quem ainda não tem histórico (R-30).
insert into public.assinaturas_historico (nutricionista_id, plano, status, ciclo, valor_centavos, preco_travado)
select a.nutricionista_id, a.plano, a.status, a.ciclo, a.valor_centavos, a.preco_travado
  from public.assinaturas a
 where not exists (select 1 from public.assinaturas_historico h where h.nutricionista_id = a.nutricionista_id);


-- ---------- Leituras do painel (só administrador) ----------

create or replace function public.painel_contas()
returns table (
  id uuid,
  nome text,
  email text,
  criada_em timestamptz,
  email_confirmado_em timestamptz,
  ultimo_login_em timestamptz,
  situacao text,
  crn_regiao smallint,
  crn_status text,
  pedido_status text,
  plano text,
  status text,
  ciclo text,
  valor_centavos integer,
  preco_travado boolean,
  expira_em timestamptz,
  assinatura_atualizada_em timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.eh_admin() then raise exception 'Só o administrador vê estes números.' using errcode = '42501'; end if;
  return query
    select u.id,
           coalesce(nullif(f.nome, ''), u.raw_user_meta_data ->> 'nome', '')::text,
           u.email::text,
           u.created_at,
           u.email_confirmed_at,
           u.last_sign_in_at,
           f.situacao,
           f.crn_regiao,
           f.crn_status,
           (select p.status from public.pedidos_estudante p where p.usuario = u.id order by p.enviado_em desc limit 1),
           a.plano,
           a.status,
           a.ciclo,
           a.valor_centavos,
           a.preco_travado,
           a.expira_em,
           a.atualizado_em
      from auth.users u
      left join public.perfis f on f.id = u.id
      left join public.assinaturas a on a.nutricionista_id = u.id
     order by u.created_at desc;
end;
$$;

revoke all on function public.painel_contas() from public, anon;
grant execute on function public.painel_contas() to authenticated;

create or replace function public.painel_historico_assinaturas()
returns table (nutricionista_id uuid, plano text, status text, ciclo text, valor_centavos integer, preco_travado boolean, quando timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.eh_admin() then raise exception 'Só o administrador vê estes números.' using errcode = '42501'; end if;
  return query
    select h.nutricionista_id, h.plano, h.status, h.ciclo, h.valor_centavos, h.preco_travado, h.quando
      from public.assinaturas_historico h
     order by h.quando asc, h.id asc;
end;
$$;

revoke all on function public.painel_historico_assinaturas() from public, anon;
grant execute on function public.painel_historico_assinaturas() to authenticated;

create or replace function public.painel_uso()
returns table (links_30_dias integer, copias_30_dias integer)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
begin
  if not public.eh_admin() then raise exception 'Só o administrador vê estes números.' using errcode = '42501'; end if;
  return query
    select (select count(*)::integer from public.acompanhamentos c where c.criado_em > now() - interval '30 days'),
           (select count(*)::integer from public.copias c where c.atualizado_em > now() - interval '30 days');
end;
$$;

revoke all on function public.painel_uso() from public, anon;
grant execute on function public.painel_uso() to authenticated;

-- Conferência depois de rodar (copie para uma consulta nova):
-- select count(*) from public.assinaturas_historico;               -- igual ao número de linhas de public.assinaturas
-- select plano, ciclo, count(*) from public.assinaturas group by 1, 2; -- pagas com mensal/anual; Estudante sem ciclo
-- select * from public.painel_uso();                               -- tem que dar "Só o administrador vê estes números.":
--                                                                     no SQL Editor você não é uma conta do app
```

Antes de seguir, abra `supabase/001-acompanhamentos.sql` e `supabase/002-copia-na-nuvem.sql` e confirme que as colunas `acompanhamentos.criado_em` e `copias.atualizado_em` existem com esses nomes (existiam em 02/10/2026).

- [ ] **Step 4: README**

Em "Projeto novo", passo 3, troque "de 001 a 006" por "de 001 a 007" e acrescente `007-painel-do-dono.sql` ao fim da lista. Em "Projeto já ligado", passo 4, acrescente ao fim do parágrafo:

```markdown
   Depois rode `supabase/007-painel-do-dono.sql`: ele guarda o ciclo e o histórico das assinaturas e cria as
   leituras da tela Negócio. O histórico começa no dia em que ele rodar; também pode rodar de novo.
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/data/sqlPainel.test.ts` → PASS. Depois `npm run check` → verde.

- [ ] **Step 6: Commit**

```bash
git add supabase/007-painel-do-dono.sql src/data/sqlPainel.test.ts README.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(banco): histórico e ciclo das assinaturas e leituras do painel`

- [ ] **Step 7: Com o usuário — rodar o `007`**

Peça ao usuário para abrir `https://supabase.com/dashboard/project/qmpljfjbdcrdbqutuvmg/sql/new`, colar o arquivo inteiro e clicar em **Run**, e depois rodar as três linhas de conferência do fim. A terceira **tem** que dar o erro "Só o administrador vê estes números." Não siga para a Tarefa 3 antes da confirmação.

---

### Tarefa 3: Função `assinar` grava o ciclo

Cobre D-59 e R-33.

**Files:**
- Modify: `supabase/functions/assinar/index.ts:95-108` (o `upsert`)
- Modify: `src/data/sqlPainel.test.ts`

**Interfaces:**
- Consumes: coluna `assinaturas.ciclo` (Tarefa 2, já rodada no servidor).
- Produces: assinaturas novas com `ciclo` preenchido.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente ao topo de `src/data/sqlPainel.test.ts`:

```ts
import assinar from '../../supabase/functions/assinar/index.ts?raw'
```

E dentro do `describe`:

```ts
  it('D-59: a função assinar grava o ciclo escolhido', () => {
    expect(assinar).toContain("ciclo: anual ? 'anual' : 'mensal',")
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/data/sqlPainel.test.ts` → FAIL no teste novo.

- [ ] **Step 3: Implementar**

No `upsert` de `supabase/functions/assinar/index.ts`, logo depois de `valor_centavos: Math.round(valor * 100),`:

```ts
      ciclo: anual ? 'anual' : 'mensal',
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/data/sqlPainel.test.ts` → PASS. Depois `npm run check` → verde.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/assinar/index.ts src/data/sqlPainel.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(assinar): grava se a assinatura é mensal ou anual`

- [ ] **Step 6: Publicar a função (só depois do Step 7 da Tarefa 2)**

Com o `007` confirmado no servidor:

Run: `npx supabase functions deploy assinar --project-ref qmpljfjbdcrdbqutuvmg`
Expected: `Deployed Functions on project qmpljfjbdcrdbqutuvmg: assinar`.

Publicar antes do `007` quebra o checkout: a coluna `ciclo` ainda não existiria. Se o comando pedir login, pare e avise o usuário; não peça a chave no chat.

---

### Tarefa 4: Domínio: contas, receita, funil e lista (`negocio.ts`)

Cobre a regra de CA-346 a CA-356, CA-360, CA-361, CB-80 a CB-85, D-57, D-59 e D-62.

**Files:**
- Create: `src/domain/negocio.ts`
- Create: `src/domain/negocio.test-utils.ts`
- Create: `src/domain/negocio.test.ts`

**Interfaces:**
- Consumes: `PLANOS`, `VAGAS_PRECO_FUNDADOR`, `ehCiclo`, `ehIdPlano`, `planoPorId`, tipos `Ciclo`, `IdPlano` de `src/domain/conta.ts`; tipo `StatusCrn` de `src/domain/situacao.ts`.
- Produces:

```ts
export type StatusAssinatura = 'ativa' | 'pendente' | 'pausada' | 'cancelada'
export type StatusPedido = 'em_analise' | 'aprovado' | 'recusado'
export type GrupoDeContas = 'todas' | 'nutricionistas' | 'estudantes' | 'assinantes'
export const PLANOS_PAGOS: readonly IdPlano[]                 // solo, pro, clinica
export const FUSO_BRASILIA_MS: number
export interface AssinaturaNoPainel { plano; status; ciclo: Ciclo | null; valorCentavos; precoTravado; expiraEm: string | null; atualizadaEm: string }
export interface ContaNoPainel { id; nome; email; criadaEm; emailConfirmadoEm: string | null; ultimoLoginEm: string | null;
  situacao: 'nutricionista' | 'estudante' | null; crnRegiao: number | null; crnStatus: StatusCrn | null;
  pedidoStatus: StatusPedido | null; assinatura: AssinaturaNoPainel | null }
export interface MudancaDeAssinatura { conta; plano; status; ciclo: Ciclo | null; valorCentavos; precoTravado; quando: string }
export interface UsoNoPainel { links30Dias: number; copias30Dias: number }
export interface ResumoDoNegocio { receitaCentavos; diferenca30DiasCentavos; assinaturasAtivas; parteQuePaga: number | null;
  contas; contasNovas30Dias; fundadorUsadas; fundadorVagas }
export interface BarraDeReceita { chave: string; mes: string; centavos: number; atual: boolean }
export interface LinhaDePlano { chave: string; plano: IdPlano; ciclo: Ciclo; quantidade: number; centavosPorMes: number; parte: number }
export interface SituacoesDeAssinatura { pendentes: number; pausadas: number; canceladas30Dias: number }
export interface EtapaDoFunil { chave: 'criaram' | 'confirmaram' | 'verificadas' | 'assinaram'; rotulo: string; quantidade: number; parte: number | null }
export function cicloDe(plano: IdPlano, ciclo: unknown, valorCentavos: number): Ciclo | null
export function daLinhaContaNoPainel(linha: unknown): ContaNoPainel | null
export function daLinhaMudanca(linha: unknown): MudancaDeAssinatura | null
export function daLinhaUso(dados: unknown): UsoNoPainel
export function ehPaga(a: { plano: IdPlano; status: StatusAssinatura } | null): boolean
export function rendaMensal(a: { plano; status; ciclo; valorCentavos } | null): number   // centavos, sem arredondar
export function receitaNoHistorico(historico: readonly MudancaDeAssinatura[], ate: number): number
export function resumirNegocio(contas, historico, agora: Date): ResumoDoNegocio
export function receitaPorMes(historico, receitaDeAgora: number, agora: Date, meses?: number): BarraDeReceita[]
export function assinaturasPorPlano(contas): LinhaDePlano[]
export function situacoesDeAssinatura(contas, agora: Date): SituacoesDeAssinatura
export function ehVerificada(c: ContaNoPainel): boolean
export function funilDe30Dias(contas, agora: Date): EtapaDoFunil[]
export function filtrarContas(contas, grupo: GrupoDeContas, busca: string): { visiveis: readonly ContaNoPainel[]; totalDoGrupo: number }
export function marcasDoEixo(maiorCentavos: number): number[]
```

Todo valor de dinheiro neste arquivo é em **centavos**, e a receita **não** é arredondada aqui (o anual dividido por 12 tem fração); quem arredonda é o texto (Tarefa 5).

- [ ] **Step 1: Escrever os dados de teste**

Crie `src/domain/negocio.test-utils.ts`:

```ts
// Contas, assinaturas e histórico de mentira para os testes do painel do dono.
// O nome não termina em `.test.ts`, então o Vitest não roda este arquivo como teste.
import type { AssinaturaNoPainel, ContaNoPainel, MudancaDeAssinatura } from './negocio.ts'

/** 02/10/2026, meio-dia em Brasília. */
export const AGORA = new Date('2026-10-02T15:00:00Z')

export function paga(
  plano: 'solo' | 'pro' | 'clinica',
  ciclo: 'mensal' | 'anual',
  valorCentavos: number,
  sobre: Partial<AssinaturaNoPainel> = {},
): AssinaturaNoPainel {
  return { plano, status: 'ativa', ciclo, valorCentavos, precoTravado: true, expiraEm: null, atualizadaEm: '2026-09-21T12:00:00Z', ...sobre }
}

/** Nutricionista com CRN-6 conferido, criada em 20/09, e-mail confirmado, entrou hoje. */
export function conta(id: string, sobre: Partial<ContaNoPainel> = {}): ContaNoPainel {
  return {
    id,
    nome: `Pessoa ${id}`,
    email: `${id}@exemplo.com`,
    criadaEm: '2026-09-20T12:00:00Z',
    emailConfirmadoEm: '2026-09-20T12:05:00Z',
    ultimoLoginEm: '2026-10-02T13:00:00Z',
    situacao: 'nutricionista',
    crnRegiao: 6,
    crnStatus: 'conferido',
    pedidoStatus: null,
    assinatura: null,
    ...sobre,
  }
}

/** Solo mensal ativo, com preço de fundador. */
export function mudanca(id: string, quando: string, sobre: Partial<MudancaDeAssinatura> = {}): MudancaDeAssinatura {
  return { conta: id, plano: 'solo', status: 'ativa', ciclo: 'mensal', valorCentavos: 3490, precoTravado: true, quando, ...sobre }
}
```

- [ ] **Step 2: Escrever os testes que falham**

Crie `src/domain/negocio.test.ts`:

```ts
import {
  assinaturasPorPlano,
  cicloDe,
  daLinhaContaNoPainel,
  daLinhaMudanca,
  daLinhaUso,
  ehVerificada,
  filtrarContas,
  funilDe30Dias,
  marcasDoEixo,
  receitaNoHistorico,
  receitaPorMes,
  rendaMensal,
  resumirNegocio,
  situacoesDeAssinatura,
} from './negocio.ts'
import { AGORA, conta, mudanca, paga } from './negocio.test-utils.ts'

describe('leitura das linhas do banco', () => {
  it('lê uma conta com assinatura paga', () => {
    const lida = daLinhaContaNoPainel({
      id: 'u1',
      nome: ' Ana ',
      email: 'ana@exemplo.com',
      criada_em: '2026-09-20T12:00:00+00:00',
      email_confirmado_em: null,
      ultimo_login_em: '2026-10-01T10:00:00+00:00',
      situacao: 'nutricionista',
      crn_regiao: 6,
      crn_status: 'conferido',
      pedido_status: null,
      plano: 'pro',
      status: 'ativa',
      ciclo: 'anual',
      valor_centavos: 59900,
      preco_travado: true,
      expira_em: null,
      assinatura_atualizada_em: '2026-09-21T12:00:00+00:00',
    })
    expect(lida).toEqual({
      id: 'u1',
      nome: 'Ana',
      email: 'ana@exemplo.com',
      criadaEm: '2026-09-20T12:00:00+00:00',
      emailConfirmadoEm: null,
      ultimoLoginEm: '2026-10-01T10:00:00+00:00',
      situacao: 'nutricionista',
      crnRegiao: 6,
      crnStatus: 'conferido',
      pedidoStatus: null,
      assinatura: { plano: 'pro', status: 'ativa', ciclo: 'anual', valorCentavos: 59900, precoTravado: true, expiraEm: null, atualizadaEm: '2026-09-21T12:00:00+00:00' },
    })
  })

  it('foco 4: a conta do dono, sem situação nem assinatura', () => {
    const lida = daLinhaContaNoPainel({ id: 'dono', nome: '', email: 'dono@exemplo.com', criada_em: '2026-10-02T12:00:00+00:00', situacao: null, plano: null, status: null })
    expect(lida?.nome).toBe('')
    expect(lida?.situacao).toBeNull()
    expect(lida?.crnStatus).toBeNull()
    expect(lida?.assinatura).toBeNull()
  })

  it('foco 3: valor fora da lista vira nulo, e linha sem id ou sem data é descartada', () => {
    const lida = daLinhaContaNoPainel({ id: 'u', criada_em: '2026-09-01T00:00:00Z', situacao: 'outra', crn_status: 'talvez', pedido_status: 'x', plano: 'ouro', status: 'ativa' })
    expect(lida?.situacao).toBeNull()
    expect(lida?.crnStatus).toBeNull()
    expect(lida?.pedidoStatus).toBeNull()
    expect(lida?.assinatura).toBeNull()
    expect(daLinhaContaNoPainel({ email: 'x@exemplo.com', criada_em: '2026-09-01T00:00:00Z' })).toBeNull()
    expect(daLinhaContaNoPainel({ id: 'u' })).toBeNull()
    expect(daLinhaContaNoPainel(null)).toBeNull()
  })

  it('lê uma mudança do histórico e o uso', () => {
    expect(
      daLinhaMudanca({ nutricionista_id: 'u1', plano: 'free', status: 'cancelada', ciclo: null, valor_centavos: 3490, preco_travado: false, quando: '2026-09-30T12:00:00+00:00' }),
    ).toEqual({ conta: 'u1', plano: 'free', status: 'cancelada', ciclo: null, valorCentavos: 3490, precoTravado: false, quando: '2026-09-30T12:00:00+00:00' })
    expect(daLinhaMudanca({ plano: 'solo', status: 'ativa' })).toBeNull()
    expect(daLinhaUso([{ links_30_dias: 58, copias_30_dias: 112 }])).toEqual({ links30Dias: 58, copias30Dias: 112 })
    expect(daLinhaUso(null)).toEqual({ links30Dias: 0, copias30Dias: 0 })
  })
})

describe('ciclo da assinatura (D-59)', () => {
  it('vem do banco quando existe', () => {
    expect(cicloDe('solo', 'anual', 3490)).toBe('anual')
  })

  it('foco 2: sem ciclo no banco, o preço do anual decide', () => {
    expect(cicloDe('solo', null, 29900)).toBe('anual')
    expect(cicloDe('pro', undefined, 59900)).toBe('anual')
    expect(cicloDe('pro', null, 6490)).toBe('mensal')
    expect(cicloDe('clinica', null, 14900)).toBe('mensal')
  })

  it('CB-84: valor que não bate com preço nenhum fica mensal e rende o valor cobrado', () => {
    expect(cicloDe('solo', null, 3990)).toBe('mensal')
    expect(rendaMensal(paga('solo', 'mensal', 3990))).toBe(3990)
  })

  it('plano que não é pago não tem ciclo', () => {
    expect(cicloDe('estudante', 'mensal', 0)).toBeNull()
    expect(cicloDe('free', null, 0)).toBeNull()
  })
})

describe('resumo do negócio (CA-346 a CA-349, D-57)', () => {
  it('soma só plano pago ativo, com o anual dividido por 12', () => {
    const contas = [
      conta('a', { assinatura: paga('solo', 'mensal', 3490) }),
      conta('b', { assinatura: paga('solo', 'anual', 29900) }),
      conta('c', { assinatura: paga('pro', 'mensal', 6490, { status: 'pendente' }) }),
      conta('d', {
        situacao: 'estudante',
        crnRegiao: null,
        crnStatus: null,
        assinatura: { plano: 'estudante', status: 'ativa', ciclo: null, valorCentavos: 0, precoTravado: false, expiraEm: '2027-07-01T00:00:00Z', atualizadaEm: '2026-09-01T00:00:00Z' },
      }),
      conta('e'),
    ]
    const resumo = resumirNegocio(contas, [], AGORA)
    expect(resumo.receitaCentavos).toBeCloseTo(3490 + 29900 / 12, 6)
    expect(resumo.assinaturasAtivas).toBe(2)
    expect(resumo.parteQuePaga).toBeCloseTo(2 / 5)
    expect(resumo.contas).toBe(5)
  })

  it('CA-346: a diferença compara com a receita de 30 dias antes, pelo histórico', () => {
    const contas = [conta('a', { assinatura: paga('solo', 'mensal', 3490) }), conta('b', { assinatura: paga('pro', 'mensal', 6490) })]
    const historico = [mudanca('a', '2026-08-01T12:00:00Z'), mudanca('b', '2026-09-25T12:00:00Z', { plano: 'pro', valorCentavos: 6490 })]
    expect(resumirNegocio(contas, historico, AGORA).diferenca30DiasCentavos).toBe(6490)
  })

  it('CB-81: histórico com menos de 30 dias conta desde o começo (antes dele, zero)', () => {
    const contas = [conta('a', { assinatura: paga('solo', 'mensal', 3490) })]
    expect(resumirNegocio(contas, [mudanca('a', '2026-09-28T12:00:00Z')], AGORA).diferenca30DiasCentavos).toBe(3490)
  })

  it('CA-348: contas novas são as criadas nos últimos 30 dias', () => {
    const contas = [conta('a', { criadaEm: '2026-09-03T12:00:00Z' }), conta('b', { criadaEm: '2026-09-01T12:00:00Z' })]
    expect(resumirNegocio(contas, [], AGORA).contasNovas30Dias).toBe(1)
  })

  it('CA-349: vagas de fundador contam só pagas ativas com preço travado, de 200', () => {
    const contas = [
      conta('a', { assinatura: paga('solo', 'mensal', 3490) }),
      conta('b', { assinatura: paga('pro', 'mensal', 6490, { precoTravado: false }) }),
      conta('c', { assinatura: paga('pro', 'mensal', 6490, { status: 'cancelada' }) }),
    ]
    const resumo = resumirNegocio(contas, [], AGORA)
    expect(resumo.fundadorUsadas).toBe(1)
    expect(resumo.fundadorVagas).toBe(200)
  })

  it('sem conta nenhuma, a parte que paga é nula, não NaN', () => {
    expect(resumirNegocio([], [], AGORA).parteQuePaga).toBeNull()
  })

  it('cancelamento derruba a receita a partir dele', () => {
    const historico = [mudanca('a', '2026-08-10T12:00:00Z'), mudanca('a', '2026-09-15T12:00:00Z', { plano: 'free', status: 'cancelada', ciclo: null })]
    expect(receitaNoHistorico(historico, Date.parse('2026-08-31T12:00:00Z'))).toBe(3490)
    expect(receitaNoHistorico(historico, Date.parse('2026-09-30T12:00:00Z'))).toBe(0)
  })
})

describe('receita por mês (CA-350)', () => {
  const historico = [
    mudanca('a', '2026-07-10T12:00:00Z'),
    mudanca('b', '2026-08-20T12:00:00Z', { plano: 'pro', valorCentavos: 6490 }),
    mudanca('a', '2026-09-15T12:00:00Z', { plano: 'free', status: 'cancelada', ciclo: null }),
  ]

  it('começa no primeiro mês do histórico e termina no mês atual, que usa a receita de agora', () => {
    expect(receitaPorMes(historico, 6490, AGORA).map((b) => [b.chave, b.mes, b.centavos, b.atual])).toEqual([
      ['2026-07', 'jul', 3490, false],
      ['2026-08', 'ago', 3490 + 6490, false],
      ['2026-09', 'set', 6490, false],
      ['2026-10', 'out', 6490, true],
    ])
  })

  it('mostra no máximo 6 meses', () => {
    const barras = receitaPorMes([mudanca('a', '2025-01-10T12:00:00Z')], 3490, AGORA)
    expect(barras).toHaveLength(6)
    expect(barras[0]?.chave).toBe('2026-05')
    expect(barras.at(-1)?.chave).toBe('2026-10')
  })

  it('CB-80: sem histórico, só o mês atual', () => {
    expect(receitaPorMes([], 0, AGORA)).toEqual([{ chave: '2026-10', mes: 'out', centavos: 0, atual: true }])
  })

  it('CB-85 e foco 1: a virada do mês é meia-noite de Brasília, não de UTC', () => {
    // 01/10 às 02h50 em UTC ainda é 30/09 às 23h50 em Brasília: conta para setembro.
    const barras = receitaPorMes([mudanca('a', '2026-10-01T02:50:00Z')], 3490, AGORA)
    expect(barras.map((b) => [b.chave, b.centavos])).toEqual([
      ['2026-09', 3490],
      ['2026-10', 3490],
    ])
  })
})

describe('assinaturas por plano (CA-352, CA-353)', () => {
  it('agrupa por plano e ciclo, da que rende mais para a que rende menos, com a parte de cada uma', () => {
    const contas = [
      conta('a', { assinatura: paga('solo', 'mensal', 3490) }),
      conta('b', { assinatura: paga('solo', 'mensal', 3490) }),
      conta('c', { assinatura: paga('pro', 'mensal', 6490) }),
      conta('d', { assinatura: paga('solo', 'anual', 29900) }),
      conta('e', { assinatura: paga('pro', 'mensal', 6490, { status: 'pendente' }) }),
    ]
    const linhas = assinaturasPorPlano(contas)
    expect(linhas.map((l) => [l.chave, l.plano, l.ciclo, l.quantidade, l.centavosPorMes])).toEqual([
      ['solo-mensal', 'solo', 'mensal', 2, 6980],
      ['pro-mensal', 'pro', 'mensal', 1, 6490],
      ['solo-anual', 'solo', 'anual', 1, 29900 / 12],
    ])
    expect(linhas[0]?.parte).toBeCloseTo(6980 / (6980 + 6490 + 29900 / 12))
  })

  it('sem assinatura paga, nenhuma linha', () => {
    expect(assinaturasPorPlano([conta('a')])).toEqual([])
  })

  it('conta pendentes, pausadas e canceladas nos últimos 30 dias', () => {
    const contas = [
      conta('a', { assinatura: paga('pro', 'mensal', 6490, { status: 'pendente' }) }),
      conta('b', { assinatura: paga('pro', 'mensal', 6490, { status: 'pausada' }) }),
      conta('c', { assinatura: paga('solo', 'mensal', 3490, { status: 'cancelada', atualizadaEm: '2026-09-25T12:00:00Z' }) }),
      conta('d', { assinatura: paga('solo', 'mensal', 3490, { status: 'cancelada', atualizadaEm: '2026-08-01T12:00:00Z' }) }),
    ]
    expect(situacoesDeAssinatura(contas, AGORA)).toEqual({ pendentes: 1, pausadas: 1, canceladas30Dias: 1 })
  })
})

describe('funil dos últimos 30 dias (CA-354, D-62)', () => {
  it('conta cada etapa entre quem criou conta, com a parte sobre elas', () => {
    const contas = [
      conta('a', { assinatura: paga('solo', 'mensal', 3490) }),
      conta('b', { crnStatus: 'em_conferencia', assinatura: paga('pro', 'mensal', 6490) }),
      conta('c', { situacao: 'estudante', crnRegiao: null, crnStatus: null, pedidoStatus: 'aprovado' }),
      conta('d', { emailConfirmadoEm: null, crnStatus: 'em_conferencia' }),
      conta('velha', { criadaEm: '2026-08-01T12:00:00Z', assinatura: paga('solo', 'mensal', 3490) }),
    ]
    expect(funilDe30Dias(contas, AGORA).map((e) => [e.chave, e.rotulo, e.quantidade, e.parte])).toEqual([
      ['criaram', 'criaram conta', 4, null],
      ['confirmaram', 'confirmaram o e-mail', 3, 0.75],
      ['verificadas', 'foram verificadas', 2, 0.5],
      ['assinaram', 'assinaram um plano pago', 2, 0.5],
    ])
  })

  it('CB-82: ninguém novo, zeros e nenhuma porcentagem', () => {
    expect(funilDe30Dias([], AGORA).map((e) => [e.quantidade, e.parte])).toEqual([
      [0, null],
      [0, null],
      [0, null],
      [0, null],
    ])
  })

  it('verificada é nutricionista com CRN conferido ou estudante com matrícula aprovada', () => {
    expect(ehVerificada(conta('x'))).toBe(true)
    expect(ehVerificada(conta('y', { crnStatus: 'nao_encontrado' }))).toBe(false)
    expect(ehVerificada(conta('z', { situacao: 'estudante', crnRegiao: null, crnStatus: null, pedidoStatus: 'em_analise' }))).toBe(false)
    expect(ehVerificada(conta('w', { situacao: null, crnRegiao: null, crnStatus: null }))).toBe(false)
  })
})

describe('lista de contas (CA-356, CA-360, CA-361)', () => {
  const contas = [
    conta('1', { nome: 'Júlia Martins', email: 'julia@ufrn.edu.br', situacao: 'estudante', crnRegiao: null, crnStatus: null, criadaEm: '2026-09-10T12:00:00Z' }),
    conta('2', { nome: 'Ana Souza', email: 'ana@gmail.com', criadaEm: '2026-09-30T12:00:00Z', assinatura: paga('pro', 'mensal', 6490) }),
    conta('3', { nome: 'Bruno Lima', email: 'bruno@gmail.com', criadaEm: '2026-09-20T12:00:00Z' }),
  ]

  it('a mais nova vem primeiro', () => {
    expect(filtrarContas(contas, 'todas', '').visiveis.map((c) => c.id)).toEqual(['2', '3', '1'])
  })

  it('cada grupo mostra só as suas, com o total do grupo', () => {
    expect(filtrarContas(contas, 'nutricionistas', '').visiveis.map((c) => c.id)).toEqual(['2', '3'])
    expect(filtrarContas(contas, 'estudantes', '').visiveis.map((c) => c.id)).toEqual(['1'])
    expect(filtrarContas(contas, 'assinantes', '')).toEqual({ visiveis: [contas[1]], totalDoGrupo: 1 })
  })

  it('a busca ignora maiúscula e acento, olha nome e e-mail, dentro do grupo', () => {
    expect(filtrarContas(contas, 'todas', 'JULIA').visiveis.map((c) => c.id)).toEqual(['1'])
    expect(filtrarContas(contas, 'todas', ' gmail ').visiveis.map((c) => c.id)).toEqual(['2', '3'])
    expect(filtrarContas(contas, 'estudantes', 'souza')).toEqual({ visiveis: [], totalDoGrupo: 1 })
  })
})

describe('eixo do gráfico', () => {
  it('zero e três degraus redondos que cobrem o maior valor, com piso de R$ 150', () => {
    expect(marcasDoEixo(123585)).toEqual([0, 50000, 100000, 150000])
    expect(marcasDoEixo(30000)).toEqual([0, 10000, 20000, 30000])
    expect(marcasDoEixo(0)).toEqual([0, 5000, 10000, 15000])
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/domain/negocio.test.ts`
Expected: FAIL — `negocio.ts` não existe.

- [ ] **Step 4: Implementar**

Crie `src/domain/negocio.ts`:

```ts
// O painel do dono (spec painel-do-dono): contas, receita e funil, a partir do que o
// banco devolve para o administrador. Tudo aqui é puro; a tela só mostra.
// Dinheiro em centavos, sem arredondar: o anual dividido por 12 tem fração, e quem
// arredonda é o texto (negocioTextos.ts).
import { VAGAS_PRECO_FUNDADOR, ehCiclo, ehIdPlano, planoPorId, type Ciclo, type IdPlano } from './conta.ts'
import type { StatusCrn } from './situacao.ts'

export type StatusAssinatura = 'ativa' | 'pendente' | 'pausada' | 'cancelada'
export type StatusPedido = 'em_analise' | 'aprovado' | 'recusado'
export type GrupoDeContas = 'todas' | 'nutricionistas' | 'estudantes' | 'assinantes'

/** D-57: só estes rendem. Estudante e Free são R$ 0. */
export const PLANOS_PAGOS: readonly IdPlano[] = ['solo', 'pro', 'clinica']

/** O Brasil não tem horário de verão desde 2019: Brasília é UTC−3 o ano todo. */
export const FUSO_BRASILIA_MS = 3 * 3_600_000

const DIA_MS = 86_400_000
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const
const STATUS_ASSINATURA: readonly string[] = ['ativa', 'pendente', 'pausada', 'cancelada']
const STATUS_PEDIDO: readonly string[] = ['em_analise', 'aprovado', 'recusado']
const STATUS_CRN: readonly string[] = ['em_conferencia', 'conferido', 'nao_encontrado']

export interface AssinaturaNoPainel {
  readonly plano: IdPlano
  readonly status: StatusAssinatura
  /** Nulo em plano que não é pago (Estudante, Free). */
  readonly ciclo: Ciclo | null
  readonly valorCentavos: number
  readonly precoTravado: boolean
  readonly expiraEm: string | null
  readonly atualizadaEm: string
}

export interface ContaNoPainel {
  readonly id: string
  readonly nome: string
  readonly email: string
  readonly criadaEm: string
  readonly emailConfirmadoEm: string | null
  /** Último login com e-mail e senha (D-60), não a última vez que abriu o app. */
  readonly ultimoLoginEm: string | null
  readonly situacao: 'nutricionista' | 'estudante' | null
  readonly crnRegiao: number | null
  readonly crnStatus: StatusCrn | null
  /** O pedido de estudante mais recente. */
  readonly pedidoStatus: StatusPedido | null
  readonly assinatura: AssinaturaNoPainel | null
}

export interface MudancaDeAssinatura {
  readonly conta: string
  readonly plano: IdPlano
  readonly status: StatusAssinatura
  readonly ciclo: Ciclo | null
  readonly valorCentavos: number
  readonly precoTravado: boolean
  readonly quando: string
}

export interface UsoNoPainel {
  readonly links30Dias: number
  readonly copias30Dias: number
}

type Rende = Pick<AssinaturaNoPainel, 'plano' | 'status' | 'ciclo' | 'valorCentavos'>

const txt = (v: unknown): string => (typeof v === 'string' ? v : '')
const textoOuNulo = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null)
const numero = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const instante = (iso: string): number => Date.parse(iso)
const ha30Dias = (agora: Date): number => agora.getTime() - 30 * DIA_MS

/** D-59: o ciclo vem do banco; sem ele (assinatura de antes do 007), o preço do anual decide. */
export function cicloDe(plano: IdPlano, ciclo: unknown, valorCentavos: number): Ciclo | null {
  if (!PLANOS_PAGOS.includes(plano)) return null
  if (ehCiclo(ciclo)) return ciclo
  const anual = planoPorId(plano)?.anual ?? 0
  return anual > 0 && valorCentavos === Math.round(anual * 100) ? 'anual' : 'mensal'
}

export function daLinhaContaNoPainel(linha: unknown): ContaNoPainel | null {
  if (typeof linha !== 'object' || linha === null) return null
  const o = linha as Record<string, unknown>
  const id = o['id']
  const criadaEm = o['criada_em']
  if (typeof id !== 'string' || typeof criadaEm !== 'string') return null
  const situacao = o['situacao']
  const crnStatus = o['crn_status']
  const pedidoStatus = o['pedido_status']
  const plano = o['plano']
  const status = o['status']
  const valorCentavos = numero(o['valor_centavos'])
  return {
    id,
    nome: txt(o['nome']).trim(),
    email: txt(o['email']),
    criadaEm,
    emailConfirmadoEm: textoOuNulo(o['email_confirmado_em']),
    ultimoLoginEm: textoOuNulo(o['ultimo_login_em']),
    situacao: situacao === 'nutricionista' || situacao === 'estudante' ? situacao : null,
    crnRegiao: typeof o['crn_regiao'] === 'number' ? o['crn_regiao'] : null,
    crnStatus: typeof crnStatus === 'string' && STATUS_CRN.includes(crnStatus) ? (crnStatus as StatusCrn) : null,
    pedidoStatus: typeof pedidoStatus === 'string' && STATUS_PEDIDO.includes(pedidoStatus) ? (pedidoStatus as StatusPedido) : null,
    assinatura:
      ehIdPlano(plano) && typeof status === 'string' && STATUS_ASSINATURA.includes(status)
        ? {
            plano,
            status: status as StatusAssinatura,
            ciclo: cicloDe(plano, o['ciclo'], valorCentavos),
            valorCentavos,
            precoTravado: o['preco_travado'] === true,
            expiraEm: textoOuNulo(o['expira_em']),
            atualizadaEm: txt(o['assinatura_atualizada_em']),
          }
        : null,
  }
}

export function daLinhaMudanca(linha: unknown): MudancaDeAssinatura | null {
  if (typeof linha !== 'object' || linha === null) return null
  const o = linha as Record<string, unknown>
  const conta = o['nutricionista_id']
  const plano = o['plano']
  const status = o['status']
  const quando = o['quando']
  if (typeof conta !== 'string' || !ehIdPlano(plano) || typeof status !== 'string' || !STATUS_ASSINATURA.includes(status) || typeof quando !== 'string') return null
  const valorCentavos = numero(o['valor_centavos'])
  return {
    conta,
    plano,
    status: status as StatusAssinatura,
    ciclo: cicloDe(plano, o['ciclo'], valorCentavos),
    valorCentavos,
    precoTravado: o['preco_travado'] === true,
    quando,
  }
}

/** A função devolve uma linha só, dentro de uma lista. */
export function daLinhaUso(dados: unknown): UsoNoPainel {
  const linha: unknown = Array.isArray(dados) ? dados[0] : dados
  const o = typeof linha === 'object' && linha !== null ? (linha as Record<string, unknown>) : {}
  return { links30Dias: numero(o['links_30_dias']), copias30Dias: numero(o['copias_30_dias']) }
}

/** D-57: plano pago e ativo. */
export function ehPaga(a: Pick<AssinaturaNoPainel, 'plano' | 'status'> | null): boolean {
  return a !== null && a.status === 'ativa' && PLANOS_PAGOS.includes(a.plano)
}

/** D-57: quanto rende por mês, em centavos. O anual entra dividido por 12. */
export function rendaMensal(a: Rende | null): number {
  if (!a || !ehPaga(a)) return 0
  return a.ciclo === 'anual' ? a.valorCentavos / 12 : a.valorCentavos
}

/** A receita num instante: a última mudança de cada conta até ali (CA-350, CB-81). */
export function receitaNoHistorico(historico: readonly MudancaDeAssinatura[], ate: number): number {
  const ultima = new Map<string, MudancaDeAssinatura>()
  for (const m of historico) {
    const t = instante(m.quando)
    if (!(t <= ate)) continue
    const anterior = ultima.get(m.conta)
    if (!anterior || instante(anterior.quando) <= t) ultima.set(m.conta, m)
  }
  let total = 0
  for (const m of ultima.values()) total += rendaMensal(m)
  return total
}

export interface ResumoDoNegocio {
  readonly receitaCentavos: number
  readonly diferenca30DiasCentavos: number
  readonly assinaturasAtivas: number
  /** De 0 a 1. Nulo sem nenhuma conta. */
  readonly parteQuePaga: number | null
  readonly contas: number
  readonly contasNovas30Dias: number
  readonly fundadorUsadas: number
  readonly fundadorVagas: number
}

/** CA-346 a CA-349. A receita de agora vem das assinaturas; a de 30 dias antes, do histórico. */
export function resumirNegocio(contas: readonly ContaNoPainel[], historico: readonly MudancaDeAssinatura[], agora: Date): ResumoDoNegocio {
  const receita = contas.reduce((soma, c) => soma + rendaMensal(c.assinatura), 0)
  const pagas = contas.filter((c) => ehPaga(c.assinatura))
  return {
    receitaCentavos: receita,
    diferenca30DiasCentavos: receita - receitaNoHistorico(historico, ha30Dias(agora)),
    assinaturasAtivas: pagas.length,
    parteQuePaga: contas.length === 0 ? null : pagas.length / contas.length,
    contas: contas.length,
    contasNovas30Dias: contas.filter((c) => instante(c.criadaEm) > ha30Dias(agora)).length,
    fundadorUsadas: pagas.filter((c) => c.assinatura?.precoTravado === true).length,
    fundadorVagas: VAGAS_PRECO_FUNDADOR,
  }
}

export interface BarraDeReceita {
  /** AAAA-MM. */
  readonly chave: string
  /** "set". */
  readonly mes: string
  readonly centavos: number
  readonly atual: boolean
}

/** Índice do mês (ano × 12 + mês) de um instante, no horário de Brasília (CB-85). */
const indiceDoMes = (t: number): number => {
  const d = new Date(t - FUSO_BRASILIA_MS)
  return d.getUTCFullYear() * 12 + d.getUTCMonth()
}

/** Último milissegundo do mês, em Brasília: 00h de Brasília do mês seguinte é 03h UTC. */
const fimDoMes = (indice: number): number => Date.UTC(Math.floor((indice + 1) / 12), (indice + 1) % 12, 1) + FUSO_BRASILIA_MS - 1

/** CA-350: até `meses` meses, terminando no atual e começando no primeiro mês do histórico (D-58). */
export function receitaPorMes(historico: readonly MudancaDeAssinatura[], receitaDeAgora: number, agora: Date, meses = 6): BarraDeReceita[] {
  const atual = indiceDoMes(agora.getTime())
  const primeiro = historico.reduce((menor, m) => {
    const t = instante(m.quando)
    return Number.isFinite(t) ? Math.min(menor, indiceDoMes(t)) : menor
  }, atual)
  const barras: BarraDeReceita[] = []
  for (let indice = Math.max(primeiro, atual - meses + 1); indice <= atual; indice++) {
    const mes = indice % 12
    barras.push({
      chave: `${Math.floor(indice / 12)}-${String(mes + 1).padStart(2, '0')}`,
      mes: MESES[mes] ?? '',
      centavos: indice === atual ? receitaDeAgora : receitaNoHistorico(historico, fimDoMes(indice)),
      atual: indice === atual,
    })
  }
  return barras
}

export interface LinhaDePlano {
  /** "pro-mensal". */
  readonly chave: string
  readonly plano: IdPlano
  readonly ciclo: Ciclo
  readonly quantidade: number
  readonly centavosPorMes: number
  /** De 0 a 1 da receita. */
  readonly parte: number
}

/** CA-352: cada plano e ciclo com assinatura ativa, da que rende mais para a que rende menos. */
export function assinaturasPorPlano(contas: readonly ContaNoPainel[]): LinhaDePlano[] {
  const grupos = new Map<string, Omit<LinhaDePlano, 'parte'>>()
  for (const c of contas) {
    const a = c.assinatura
    if (!a || !ehPaga(a)) continue
    const ciclo: Ciclo = a.ciclo ?? 'mensal'
    const chave = `${a.plano}-${ciclo}`
    const grupo = grupos.get(chave) ?? { chave, plano: a.plano, ciclo, quantidade: 0, centavosPorMes: 0 }
    grupos.set(chave, { ...grupo, quantidade: grupo.quantidade + 1, centavosPorMes: grupo.centavosPorMes + rendaMensal(a) })
  }
  const total = [...grupos.values()].reduce((soma, g) => soma + g.centavosPorMes, 0)
  return [...grupos.values()]
    .map((g) => ({ ...g, parte: total > 0 ? g.centavosPorMes / total : 0 }))
    .sort((x, y) => y.centavosPorMes - x.centavosPorMes || x.chave.localeCompare(y.chave))
}

export interface SituacoesDeAssinatura {
  readonly pendentes: number
  readonly pausadas: number
  readonly canceladas30Dias: number
}

/** CA-353. A cancelada conta pela data da última mudança da assinatura. */
export function situacoesDeAssinatura(contas: readonly ContaNoPainel[], agora: Date): SituacoesDeAssinatura {
  let pendentes = 0
  let pausadas = 0
  let canceladas30Dias = 0
  for (const c of contas) {
    const a = c.assinatura
    if (!a) continue
    if (a.status === 'pendente') pendentes += 1
    else if (a.status === 'pausada') pausadas += 1
    else if (a.status === 'cancelada' && instante(a.atualizadaEm) > ha30Dias(agora)) canceladas30Dias += 1
  }
  return { pendentes, pausadas, canceladas30Dias }
}

export interface EtapaDoFunil {
  readonly chave: 'criaram' | 'confirmaram' | 'verificadas' | 'assinaram'
  readonly rotulo: string
  readonly quantidade: number
  /** De 0 a 1, sobre quem criou conta (D-62). Nulo na primeira etapa e sem ninguém novo. */
  readonly parte: number | null
}

/** Nutricionista com CRN conferido ou estudante com matrícula aprovada. */
export function ehVerificada(c: ContaNoPainel): boolean {
  return (c.situacao === 'nutricionista' && c.crnStatus === 'conferido') || (c.situacao === 'estudante' && c.pedidoStatus === 'aprovado')
}

/** CA-354: as contas criadas nos últimos 30 dias, etapa por etapa. Assinar não depende de verificar (D-62). */
export function funilDe30Dias(contas: readonly ContaNoPainel[], agora: Date): EtapaDoFunil[] {
  const novas = contas.filter((c) => instante(c.criadaEm) > ha30Dias(agora))
  const confirmaram = novas.filter((c) => c.emailConfirmadoEm !== null)
  const verificadas = confirmaram.filter(ehVerificada)
  const assinaram = confirmaram.filter((c) => ehPaga(c.assinatura))
  const parte = (n: number): number | null => (novas.length === 0 ? null : n / novas.length)
  return [
    { chave: 'criaram', rotulo: 'criaram conta', quantidade: novas.length, parte: null },
    { chave: 'confirmaram', rotulo: 'confirmaram o e-mail', quantidade: confirmaram.length, parte: parte(confirmaram.length) },
    { chave: 'verificadas', rotulo: 'foram verificadas', quantidade: verificadas.length, parte: parte(verificadas.length) },
    { chave: 'assinaram', rotulo: 'assinaram um plano pago', quantidade: assinaram.length, parte: parte(assinaram.length) },
  ]
}

const semAcento = (s: string): string => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

function noGrupo(c: ContaNoPainel, grupo: GrupoDeContas): boolean {
  if (grupo === 'nutricionistas') return c.situacao === 'nutricionista'
  if (grupo === 'estudantes') return c.situacao === 'estudante'
  if (grupo === 'assinantes') return ehPaga(c.assinatura)
  return true
}

/** CA-356, CA-360 e CA-361: a mais nova primeiro; a busca olha nome e e-mail, sem acento. */
export function filtrarContas(
  contas: readonly ContaNoPainel[],
  grupo: GrupoDeContas,
  busca: string,
): { readonly visiveis: readonly ContaNoPainel[]; readonly totalDoGrupo: number } {
  const doGrupo = contas.filter((c) => noGrupo(c, grupo)).sort((x, y) => instante(y.criadaEm) - instante(x.criadaEm))
  const termo = semAcento(busca.trim())
  const visiveis = termo === '' ? doGrupo : doGrupo.filter((c) => semAcento(`${c.nome} ${c.email}`).includes(termo))
  return { visiveis, totalDoGrupo: doGrupo.length }
}

/** Marcas do eixo, em centavos: zero e três degraus redondos (1, 2, 2,5 ou 5 × 10ⁿ). Piso de R$ 150. */
export function marcasDoEixo(maiorCentavos: number): number[] {
  const alvo = Math.max(maiorCentavos, 15000) / 3
  let potencia = 1
  while (potencia * 10 <= alvo) potencia *= 10
  const degrau = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((d) => d >= alvo) ?? 10 * potencia
  return [0, degrau, 2 * degrau, 3 * degrau]
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/domain/negocio.test.ts` → PASS. Depois `npm run check` → verde.

- [ ] **Step 6: Commit**

```bash
git add src/domain/negocio.ts src/domain/negocio.test-utils.ts src/domain/negocio.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(dominio): receita, funil e lista de contas do painel do dono`

---

### Tarefa 5: Domínio: textos do painel (`negocioTextos.ts`)

Cobre o texto de CA-346, CA-347, CA-352, CA-357, CA-358, CA-359, CA-363 e CB-85.

**Files:**
- Create: `src/domain/negocioTextos.ts`
- Create: `src/domain/negocioTextos.test.ts`

**Interfaces:**
- Consumes: `ContaNoPainel`, `FUSO_BRASILIA_MS`, `PLANOS_PAGOS`, `ehPaga` (Tarefa 4); `planoPorId`, tipos `Ciclo`, `IdPlano` de `conta.ts`.
- Produces:

```ts
export type TomDoSelo = 'sucesso' | 'info' | 'aviso' | 'neutro'
export interface Selo { readonly texto: string; readonly tom: TomDoSelo }
export interface TextoDoPlano { readonly texto: string; readonly tom: TomDoSelo | null; readonly aviso: Selo | null }
export function reais(centavos: number): string                    // "R$ 1.235,85" (espaço que não quebra)
export function inteiro(n: number): string                         // "1.234"
export function porcentagem(parte: number): string                 // "75%"
export function diferencaEm30Dias(centavos: number): string        // "+R$ 209,40 em 30 dias"
export function parteQuePaga(parte: number | null): string         // "8% das contas pagam"
export function marcaDoEixo(centavos: number): string              // "1.500"
export function detalheDoPlano(plano: IdPlano, ciclo: Ciclo): string // "mensal · R$ 64,90"
export function dataEmBrasilia(iso: string): string                // "30/09/2026"
export function horaEmBrasilia(d: Date): string                    // "14:32"
export function ultimoLogin(iso: string | null, agora: Date): string
export function seloDaSituacao(c: ContaNoPainel): { readonly situacao: string; readonly selo: Selo | null }
export function textoDoPlano(c: ContaNoPainel, agora: Date): TextoDoPlano
```

- [ ] **Step 1: Escrever os testes que falham**

Crie `src/domain/negocioTextos.test.ts`:

```ts
import { AGORA, conta, paga } from './negocio.test-utils.ts'
import {
  dataEmBrasilia,
  detalheDoPlano,
  diferencaEm30Dias,
  horaEmBrasilia,
  inteiro,
  marcaDoEixo,
  parteQuePaga,
  porcentagem,
  reais,
  seloDaSituacao,
  textoDoPlano,
  ultimoLogin,
} from './negocioTextos.ts'

describe('números', () => {
  it('reais, com o centavo arredondado só aqui', () => {
    expect(reais(123585)).toMatch(/^R\$\s1\.235,85$/)
    expect(reais((29900 / 12) * 6)).toMatch(/^R\$\s149,50$/)
    expect(reais(0)).toMatch(/^R\$\s0,00$/)
  })

  it('CA-346: diferença em 30 dias, com sinal', () => {
    expect(diferencaEm30Dias(20940)).toMatch(/^\+R\$\s209,40 em 30 dias$/)
    expect(diferencaEm30Dias(-3490)).toMatch(/^−R\$\s34,90 em 30 dias$/)
    expect(diferencaEm30Dias(0)).toBe('Igual a 30 dias atrás')
    expect(diferencaEm30Dias(0.4)).toBe('Igual a 30 dias atrás')
  })

  it('CA-347: parte das contas que pagam', () => {
    expect(parteQuePaga(25 / 312)).toBe('8% das contas pagam')
    expect(parteQuePaga(null)).toBe('Nenhuma conta ainda')
  })

  it('inteiro, porcentagem e marca do eixo', () => {
    expect(inteiro(1234)).toBe('1.234')
    expect(porcentagem(0.75)).toBe('75%')
    expect(marcaDoEixo(150000)).toBe('1.500')
    expect(marcaDoEixo(5000)).toBe('50')
  })

  it('CA-352: detalhe do plano com o preço de tabela', () => {
    expect(detalheDoPlano('pro', 'mensal')).toMatch(/^mensal · R\$\s64,90$/)
    expect(detalheDoPlano('solo', 'anual')).toMatch(/^anual · R\$\s299,00$/)
    expect(detalheDoPlano('clinica', 'mensal')).toMatch(/^mensal · R\$\s149,00$/)
  })
})

describe('datas em Brasília (CB-85)', () => {
  it('foco 1: 02h50 de 01/10 em UTC ainda é 30/09 em Brasília', () => {
    expect(dataEmBrasilia('2026-10-01T02:50:00Z')).toBe('30/09/2026')
    expect(dataEmBrasilia('não é data')).toBe('')
  })

  it('CA-363: hora da leitura', () => {
    expect(horaEmBrasilia(new Date('2026-10-02T17:32:00Z'))).toBe('14:32')
  })

  it('CA-359: último login em dias de calendário de Brasília', () => {
    expect(ultimoLogin(null, AGORA)).toBe('nunca')
    expect(ultimoLogin('2026-10-02T04:00:00Z', AGORA)).toBe('hoje')
    expect(ultimoLogin('2026-10-02T02:00:00Z', AGORA)).toBe('ontem')
    expect(ultimoLogin('2026-09-27T12:00:00Z', AGORA)).toBe('há 5 dias')
    expect(ultimoLogin('2026-09-02T12:00:00Z', AGORA)).toBe('há 30 dias')
    expect(ultimoLogin('2026-08-01T12:00:00Z', AGORA)).toBe('01/08/2026')
  })
})

describe('selos da lista (CA-357, CA-358)', () => {
  it('nutricionista', () => {
    expect(seloDaSituacao(conta('a'))).toEqual({ situacao: 'Nutricionista', selo: { texto: 'CRN-6 conferido', tom: 'sucesso' } })
    expect(seloDaSituacao(conta('b', { crnStatus: 'em_conferencia' })).selo).toEqual({ texto: 'CRN em conferência', tom: 'info' })
    expect(seloDaSituacao(conta('c', { crnStatus: 'nao_encontrado' })).selo).toEqual({ texto: 'CRN não encontrado', tom: 'aviso' })
  })

  it('estudante', () => {
    const estudante = { situacao: 'estudante', crnRegiao: null, crnStatus: null } as const
    expect(seloDaSituacao(conta('a', { ...estudante, pedidoStatus: 'aprovado' }))).toEqual({ situacao: 'Estudante', selo: { texto: 'Matrícula aprovada', tom: 'sucesso' } })
    expect(seloDaSituacao(conta('b', { ...estudante, pedidoStatus: 'em_analise' })).selo).toEqual({ texto: 'Comprovante em análise', tom: 'info' })
    expect(seloDaSituacao(conta('c', { ...estudante, pedidoStatus: 'recusado' })).selo).toEqual({ texto: 'Comprovante recusado', tom: 'aviso' })
    expect(seloDaSituacao(conta('d', { ...estudante, pedidoStatus: null })).selo).toEqual({ texto: 'Sem comprovante', tom: 'neutro' })
  })

  it('foco 4: conta sem situação, como a do dono', () => {
    expect(seloDaSituacao(conta('dono', { situacao: null, crnRegiao: null, crnStatus: null }))).toEqual({ situacao: 'Sem situação', selo: null })
  })

  it('plano pago ativo é o selo verde com o ciclo', () => {
    expect(textoDoPlano(conta('a', { assinatura: paga('pro', 'mensal', 6490) }), AGORA)).toEqual({ texto: 'Pro mensal', tom: 'sucesso', aviso: null })
    expect(textoDoPlano(conta('b', { assinatura: paga('solo', 'anual', 29900) }), AGORA).texto).toBe('Solo anual')
  })

  it('pendente e pausada mostram o plano e o aviso', () => {
    expect(textoDoPlano(conta('a', { assinatura: paga('solo', 'mensal', 3490, { status: 'pendente' }) }), AGORA)).toEqual({
      texto: 'Solo mensal',
      tom: null,
      aviso: { texto: 'Pagamento pendente', tom: 'aviso' },
    })
    // O webhook troca o plano para free quando a assinatura não está ativa.
    const pendenteFree = { plano: 'free', status: 'pendente', ciclo: null, valorCentavos: 3490, precoTravado: false, expiraEm: null, atualizadaEm: '2026-09-21T12:00:00Z' } as const
    expect(textoDoPlano(conta('b', { assinatura: pendenteFree }), AGORA)).toEqual({ texto: 'Free', tom: null, aviso: { texto: 'Pagamento pendente', tom: 'aviso' } })
    expect(textoDoPlano(conta('c', { assinatura: paga('pro', 'mensal', 6490, { status: 'pausada' }) }), AGORA).aviso).toEqual({ texto: 'Pausada', tom: 'aviso' })
  })

  it('Estudante dentro do prazo; o resto é Free', () => {
    const estudante = (expiraEm: string | null) =>
      conta('e', { assinatura: { plano: 'estudante', status: 'ativa', ciclo: null, valorCentavos: 0, precoTravado: false, expiraEm, atualizadaEm: '2026-09-01T00:00:00Z' } })
    expect(textoDoPlano(estudante('2027-07-01T00:00:00Z'), AGORA)).toEqual({ texto: 'Estudante', tom: null, aviso: null })
    expect(textoDoPlano(estudante('2026-09-01T00:00:00Z'), AGORA).texto).toBe('Free')
    expect(textoDoPlano(conta('f'), AGORA)).toEqual({ texto: 'Free', tom: null, aviso: null })
    expect(textoDoPlano(conta('g', { assinatura: paga('solo', 'mensal', 3490, { status: 'cancelada' }) }), AGORA).texto).toBe('Free')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/negocioTextos.test.ts` → FAIL (`negocioTextos.ts` não existe).

- [ ] **Step 3: Implementar**

Crie `src/domain/negocioTextos.ts`:

```ts
// Os textos do painel do dono (spec painel-do-dono): dinheiro, datas no horário de
// Brasília e os selos da lista de contas. É aqui que o centavo é arredondado.
import { planoPorId, type Ciclo, type IdPlano } from './conta.ts'
import { FUSO_BRASILIA_MS, PLANOS_PAGOS, ehPaga, type AssinaturaNoPainel, type ContaNoPainel } from './negocio.ts'

export type TomDoSelo = 'sucesso' | 'info' | 'aviso' | 'neutro'

export interface Selo {
  readonly texto: string
  readonly tom: TomDoSelo
}

export interface TextoDoPlano {
  readonly texto: string
  /** Com tom, o texto vira selo (plano pago ativo); sem tom, é texto corrido. */
  readonly tom: TomDoSelo | null
  readonly aviso: Selo | null
}

const REAIS = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const INTEIRO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const DATA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })
const HORA = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
const DIA_MS = 86_400_000

/** 123585 → "R$ 1.235,85". O Intl põe um espaço que não quebra depois do "R$". */
export const reais = (centavos: number): string => REAIS.format(Math.round(centavos) / 100)

export const inteiro = (n: number): string => INTEIRO.format(n)

export const porcentagem = (parte: number): string => `${Math.round(parte * 100)}%`

/** CA-346. O sinal de menos é o tipográfico (−), não o hífen. */
export function diferencaEm30Dias(centavos: number): string {
  const arredondado = Math.round(centavos)
  if (arredondado === 0) return 'Igual a 30 dias atrás'
  return `${arredondado > 0 ? '+' : '−'}${reais(Math.abs(arredondado))} em 30 dias`
}

/** CA-347. */
export const parteQuePaga = (parte: number | null): string => (parte === null ? 'Nenhuma conta ainda' : `${porcentagem(parte)} das contas pagam`)

/** Marca do eixo do gráfico, em reais inteiros: 150000 → "1.500". */
export const marcaDoEixo = (centavos: number): string => INTEIRO.format(centavos / 100)

/** CA-352: "mensal · R$ 64,90", com o preço de tabela do plano. */
export function detalheDoPlano(plano: IdPlano, ciclo: Ciclo): string {
  const tabela = planoPorId(plano)
  const preco = ciclo === 'anual' ? (tabela?.anual ?? 0) : (tabela?.mensal ?? 0)
  return `${ciclo} · ${reais(preco * 100)}`
}

/** CB-85: a data como se lê em Brasília. Entrada inválida devolve vazio. */
export function dataEmBrasilia(iso: string): string {
  const t = Date.parse(iso)
  return Number.isFinite(t) ? DATA.format(t) : ''
}

/** CA-363: "14:32". */
export const horaEmBrasilia = (d: Date): string => HORA.format(d)

const diaEmBrasilia = (t: number): number => Math.floor((t - FUSO_BRASILIA_MS) / DIA_MS)

/** CA-359: hoje, ontem, há N dias (até 30), a data, ou nunca. */
export function ultimoLogin(iso: string | null, agora: Date): string {
  if (!iso) return 'nunca'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return 'nunca'
  const dias = diaEmBrasilia(agora.getTime()) - diaEmBrasilia(t)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  if (dias <= 30) return `há ${dias} dias`
  return dataEmBrasilia(iso)
}

/** CA-357: as mesmas cores de Aprovações (conferido verde, em conferência azul, não encontrado âmbar). */
export function seloDaSituacao(c: ContaNoPainel): { readonly situacao: string; readonly selo: Selo | null } {
  if (c.situacao === 'nutricionista') {
    if (c.crnStatus === 'conferido') return { situacao: 'Nutricionista', selo: { texto: c.crnRegiao ? `CRN-${c.crnRegiao} conferido` : 'CRN conferido', tom: 'sucesso' } }
    if (c.crnStatus === 'nao_encontrado') return { situacao: 'Nutricionista', selo: { texto: 'CRN não encontrado', tom: 'aviso' } }
    return { situacao: 'Nutricionista', selo: { texto: 'CRN em conferência', tom: 'info' } }
  }
  if (c.situacao === 'estudante') {
    if (c.pedidoStatus === 'aprovado') return { situacao: 'Estudante', selo: { texto: 'Matrícula aprovada', tom: 'sucesso' } }
    if (c.pedidoStatus === 'em_analise') return { situacao: 'Estudante', selo: { texto: 'Comprovante em análise', tom: 'info' } }
    if (c.pedidoStatus === 'recusado') return { situacao: 'Estudante', selo: { texto: 'Comprovante recusado', tom: 'aviso' } }
    return { situacao: 'Estudante', selo: { texto: 'Sem comprovante', tom: 'neutro' } }
  }
  return { situacao: 'Sem situação', selo: null }
}

const nomeComCiclo = (a: AssinaturaNoPainel): string => {
  const nome = planoPorId(a.plano)?.nome ?? 'Free'
  return PLANOS_PAGOS.includes(a.plano) ? `${nome} ${a.ciclo ?? 'mensal'}` : nome
}

/** CA-358. */
export function textoDoPlano(c: ContaNoPainel, agora: Date): TextoDoPlano {
  const a = c.assinatura
  if (!a) return { texto: 'Free', tom: null, aviso: null }
  if (ehPaga(a)) return { texto: nomeComCiclo(a), tom: 'sucesso', aviso: null }
  if (a.status === 'pendente') return { texto: nomeComCiclo(a), tom: null, aviso: { texto: 'Pagamento pendente', tom: 'aviso' } }
  if (a.status === 'pausada') return { texto: nomeComCiclo(a), tom: null, aviso: { texto: 'Pausada', tom: 'aviso' } }
  const estudanteNoPrazo = a.plano === 'estudante' && a.status === 'ativa' && (a.expiraEm === null || Date.parse(a.expiraEm) > agora.getTime())
  return { texto: estudanteNoPrazo ? 'Estudante' : 'Free', tom: null, aviso: null }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/domain/negocioTextos.test.ts` → PASS. Depois `npm run check` → verde.

- [ ] **Step 5: Commit**

```bash
git add src/domain/negocioTextos.ts src/domain/negocioTextos.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(dominio): textos do painel do dono em reais e no horário de Brasília`

---

### Tarefa 6: Estado: leitura do painel (`useNegocio`)

Cobre CA-344 (lado do navegador), CA-363, CB-78, CB-79 e CB-86.

**Files:**
- Create: `src/ui/estado/usarNegocio.ts`
- Create: `src/ui/estado/usarNegocio.test.ts`

**Interfaces:**
- Consumes: `obterSupabase()` de `./supabase.ts`; `daLinhaContaNoPainel`, `daLinhaMudanca`, `daLinhaUso` e os tipos da Tarefa 4; RPCs da Tarefa 2.
- Produces:

```ts
export const FALHA_AO_LER_NEGOCIO = 'Não consegui ler os números agora. Confira a internet e toque em Atualizar.'
export interface DadosDoNegocio { contas: readonly ContaNoPainel[]; historico: readonly MudancaDeAssinatura[]; uso: UsoNoPainel; lidoEm: Date }
export interface ValorNegocio { dados: DadosDoNegocio | null; carregando: boolean; erro: string | null; atualizar: () => void }
export function useNegocio(ativo: boolean): ValorNegocio
```

- [ ] **Step 1: Escrever os testes que falham**

Crie `src/ui/estado/usarNegocio.test.ts`:

```ts
import { act, renderHook, waitFor } from '@testing-library/react'
import { FALHA_AO_LER_NEGOCIO, useNegocio } from './usarNegocio.ts'

const banco = vi.hoisted(() => ({
  respostas: {} as Record<string, { data: unknown; error: unknown }>,
  chamadas: [] as string[],
}))

const cliente = {
  rpc: async (funcao: string) => {
    banco.chamadas.push(funcao)
    return banco.respostas[funcao] ?? { data: null, error: null }
  },
}

vi.mock('./supabase.ts', () => ({ obterSupabase: () => cliente, supabaseConfigurado: () => true }))

const linhaConta = {
  id: 'u1',
  nome: 'Ana',
  email: 'ana@exemplo.com',
  criada_em: '2026-09-20T12:00:00Z',
  situacao: 'nutricionista',
  crn_regiao: 6,
  crn_status: 'conferido',
  plano: 'pro',
  status: 'ativa',
  ciclo: 'mensal',
  valor_centavos: 6490,
  preco_travado: true,
  assinatura_atualizada_em: '2026-09-21T12:00:00Z',
}
const falhaDeRede = { data: null, error: { message: 'TypeError: Failed to fetch', code: '' } }

describe('useNegocio', () => {
  beforeEach(() => {
    banco.respostas = {
      painel_contas: { data: [linhaConta], error: null },
      painel_historico_assinaturas: {
        data: [{ nutricionista_id: 'u1', plano: 'pro', status: 'ativa', ciclo: 'mensal', valor_centavos: 6490, preco_travado: true, quando: '2026-09-21T12:00:00Z' }],
        error: null,
      },
      painel_uso: { data: [{ links_30_dias: 3, copias_30_dias: 2 }], error: null },
    }
    banco.chamadas = []
  })

  it('CA-363: lê contas, histórico e uso ao abrir e guarda a hora da leitura', async () => {
    const { result } = renderHook(() => useNegocio(true))
    expect(result.current.carregando).toBe(true)
    await waitFor(() => expect(result.current.dados).not.toBeNull())
    expect(result.current.carregando).toBe(false)
    expect(result.current.erro).toBeNull()
    expect(result.current.dados?.contas.map((c) => c.id)).toEqual(['u1'])
    expect(result.current.dados?.historico).toHaveLength(1)
    expect(result.current.dados?.uso).toEqual({ links30Dias: 3, copias30Dias: 2 })
    expect(result.current.dados?.lidoEm).toBeInstanceOf(Date)
    expect([...banco.chamadas].sort()).toEqual(['painel_contas', 'painel_historico_assinaturas', 'painel_uso'])
  })

  it('com a tela fechada, não lê nada', async () => {
    const { result } = renderHook(() => useNegocio(false))
    await act(async () => {})
    expect(banco.chamadas).toEqual([])
    expect(result.current.carregando).toBe(false)
    expect(result.current.dados).toBeNull()
  })

  it('CB-78: primeira leitura com falha de rede fica sem números e com o aviso', async () => {
    banco.respostas['painel_uso'] = falhaDeRede
    const { result } = renderHook(() => useNegocio(true))
    await waitFor(() => expect(result.current.erro).toBe(FALHA_AO_LER_NEGOCIO))
    expect(result.current.dados).toBeNull()
    expect(result.current.carregando).toBe(false)
  })

  it('CA-344: a recusa do banco aparece com a frase do banco', async () => {
    banco.respostas['painel_contas'] = { data: null, error: { message: 'Só o administrador vê estes números.', code: '42501' } }
    const { result } = renderHook(() => useNegocio(true))
    await waitFor(() => expect(result.current.erro).toBe('Só o administrador vê estes números.'))
  })

  it('CB-79 e foco 5: falha depois de uma leitura boa mantém os números e a hora anteriores', async () => {
    const { result } = renderHook(() => useNegocio(true))
    await waitFor(() => expect(result.current.dados).not.toBeNull())
    const lidoEm = result.current.dados?.lidoEm
    banco.respostas['painel_contas'] = falhaDeRede
    act(() => result.current.atualizar())
    await waitFor(() => expect(result.current.erro).toBe(FALHA_AO_LER_NEGOCIO))
    expect(result.current.dados?.contas).toHaveLength(1)
    expect(result.current.dados?.lidoEm).toBe(lidoEm)
  })

  it('CB-86 e foco 5: atualizar duas vezes seguidas lê uma vez só', async () => {
    const { result } = renderHook(() => useNegocio(true))
    await waitFor(() => expect(result.current.dados).not.toBeNull())
    banco.chamadas = []
    act(() => {
      result.current.atualizar()
      result.current.atualizar()
    })
    await waitFor(() => expect(result.current.carregando).toBe(false))
    expect(banco.chamadas.filter((c) => c === 'painel_contas')).toHaveLength(1)
  })

  it('leitura boa depois de uma falha limpa o aviso', async () => {
    banco.respostas['painel_uso'] = falhaDeRede
    const { result } = renderHook(() => useNegocio(true))
    await waitFor(() => expect(result.current.erro).toBe(FALHA_AO_LER_NEGOCIO))
    banco.respostas['painel_uso'] = { data: [{ links_30_dias: 0, copias_30_dias: 0 }], error: null }
    act(() => result.current.atualizar())
    await waitFor(() => expect(result.current.dados).not.toBeNull())
    expect(result.current.erro).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/estado/usarNegocio.test.ts` → FAIL (`usarNegocio.ts` não existe).

- [ ] **Step 3: Implementar**

Crie `src/ui/estado/usarNegocio.ts`:

```ts
// As leituras do painel do dono (spec painel-do-dono). O banco confere eh_admin em
// cada uma (CA-344): esconder a tela de quem não é administrador é só conforto.
// Uma leitura por vez (CB-86); leitura que falha não apaga a anterior (CB-79).
import { useCallback, useEffect, useState } from 'react'
import {
  daLinhaContaNoPainel,
  daLinhaMudanca,
  daLinhaUso,
  type ContaNoPainel,
  type MudancaDeAssinatura,
  type UsoNoPainel,
} from '@/domain/negocio.ts'
import { obterSupabase } from './supabase.ts'

export const FALHA_AO_LER_NEGOCIO = 'Não consegui ler os números agora. Confira a internet e toque em Atualizar.'

export interface DadosDoNegocio {
  readonly contas: readonly ContaNoPainel[]
  readonly historico: readonly MudancaDeAssinatura[]
  readonly uso: UsoNoPainel
  readonly lidoEm: Date
}

export interface ValorNegocio {
  readonly dados: DadosDoNegocio | null
  readonly carregando: boolean
  readonly erro: string | null
  readonly atualizar: () => void
}

interface Leitura {
  readonly pedido: number
  readonly dados: DadosDoNegocio | null
  readonly erro: string | null
}

const lista = <T,>(dados: unknown, ler: (linha: unknown) => T | null): T[] =>
  Array.isArray(dados) ? dados.map(ler).filter((x): x is T => x !== null) : []

/** CA-344: a recusa do banco tem a própria frase; o resto é rede ou servidor fora (CB-78). */
const mensagem = (erro: { readonly message?: string; readonly code?: string }): string =>
  erro.code === '42501' && erro.message ? erro.message : FALHA_AO_LER_NEGOCIO

export function useNegocio(ativo: boolean): ValorNegocio {
  const [cliente] = useState(() => obterSupabase())
  const [pedido, setPedido] = useState(0)
  const [leitura, setLeitura] = useState<Leitura | null>(null)

  useEffect(() => {
    if (!cliente || !ativo) return
    let vivo = true
    const falhou = (erro: string) => setLeitura((anterior) => ({ pedido, dados: anterior?.dados ?? null, erro }))
    void Promise.all([cliente.rpc('painel_contas'), cliente.rpc('painel_historico_assinaturas'), cliente.rpc('painel_uso')]).then(
      ([contas, historico, uso]) => {
        if (!vivo) return
        const erro = contas.error ?? historico.error ?? uso.error
        if (erro) {
          falhou(mensagem(erro))
          return
        }
        setLeitura({
          pedido,
          erro: null,
          dados: {
            contas: lista(contas.data, daLinhaContaNoPainel),
            historico: lista(historico.data, daLinhaMudanca),
            uso: daLinhaUso(uso.data),
            lidoEm: new Date(),
          },
        })
      },
      () => {
        if (vivo) falhou(FALHA_AO_LER_NEGOCIO)
      },
    )
    return () => {
      vivo = false
    }
  }, [cliente, ativo, pedido])

  const carregando = ativo && cliente !== null && leitura?.pedido !== pedido
  const atualizar = useCallback(() => {
    if (!carregando) setPedido((p) => p + 1)
  }, [carregando])

  return {
    dados: leitura?.dados ?? null,
    carregando,
    erro: ativo && cliente === null ? FALHA_AO_LER_NEGOCIO : (leitura?.erro ?? null),
    atualizar,
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/ui/estado/usarNegocio.test.ts` → PASS. Depois `npm run check` → verde.

- [ ] **Step 5: Commit**

```bash
git add src/ui/estado/usarNegocio.ts src/ui/estado/usarNegocio.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(estado): leitura do painel do dono, uma por vez`

---

### Tarefa 7: Biblioteca: `GraficoBarras` e o encaixe `extra` do `CartaoNumero`

Cobre o desenho de CA-349 a CA-351.

**Files:**
- Create: `design-system/componentes/display/GraficoBarras.tsx`
- Create: `design-system/componentes/display/GraficoBarras.test.tsx`
- Modify: `design-system/componentes/display/CartaoNumero.tsx`
- Modify: `design-system/componentes/estilo.test.tsx`
- Modify: `design-system/index.ts`, `design-system/componentes/LEIA-ME.md`, `design-system/vitrine/TelaDesignSystem.tsx`

**Interfaces:**
- Consumes: `cn` de `@ds/lib/cn.ts`.
- Produces:

```ts
export interface BarraDoGrafico { chave: string; rotulo: string; valor: number; dica: string; destaque?: boolean | undefined; valorEscrito?: string | undefined }
export function GraficoBarras(props: { descricao: string; barras: readonly BarraDoGrafico[];
  marcas: readonly { valor: number; rotulo: string }[]; className?: string | undefined }): JSX.Element
// CartaoNumero ganha: readonly extra?: ReactNode | undefined  (entre o valor e o rótulo)
```

- [ ] **Step 1: Escrever os testes que falham**

Crie `design-system/componentes/display/GraficoBarras.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import { GraficoBarras } from '@ds/componentes/display/GraficoBarras.tsx'

const barras = [
  { chave: '2026-08', rotulo: 'ago', valor: 500, dica: 'ago · R$ 5,00' },
  { chave: '2026-09', rotulo: 'set', valor: 750, dica: 'set · R$ 7,50' },
  { chave: '2026-10', rotulo: 'out', valor: 1500, dica: 'out · R$ 15,00', destaque: true, valorEscrito: 'R$ 15,00' },
]
const marcas = [
  { valor: 0, rotulo: '0' },
  { valor: 500, rotulo: '5' },
  { valor: 1000, rotulo: '10' },
  { valor: 1500, rotulo: '15' },
]

describe('GraficoBarras', () => {
  it('cada barra é um item com a dica como nome, e dá para chegar pelo teclado', () => {
    render(<GraficoBarras descricao="Receita por mês" barras={barras} marcas={marcas} />)
    const itens = within(screen.getByRole('list', { name: 'Receita por mês' })).getAllByRole('listitem')
    expect(itens.map((i) => i.getAttribute('aria-label'))).toEqual(['ago · R$ 5,00', 'set · R$ 7,50', 'out · R$ 15,00'])
    expect(itens.every((i) => i.tabIndex === 0)).toBe(true)
  })

  it('a altura da barra é a parte do topo do eixo', () => {
    render(<GraficoBarras descricao="Receita" barras={barras} marcas={marcas} />)
    const itens = screen.getAllByRole('listitem')
    expect((itens[1]?.firstElementChild as HTMLElement).style.height).toBe('50%')
    expect((itens[2]?.firstElementChild as HTMLElement).style.height).toBe('100%')
  })

  it('só a barra em destaque tem o valor escrito; a dica de todas fica escondida do leitor de tela', () => {
    render(<GraficoBarras descricao="Receita" barras={barras} marcas={marcas} />)
    const itens = screen.getAllByRole('listitem')
    expect(within(itens[2] as HTMLElement).getAllByText('R$ 15,00')).toHaveLength(1)
    expect(within(itens[2] as HTMLElement).getByText('out · R$ 15,00')).toHaveAttribute('aria-hidden', 'true')
    expect(within(itens[0] as HTMLElement).queryByText('R$ 5,00')).toBeNull()
  })

  it('mostra as marcas do eixo e o rótulo de cada mês', () => {
    render(<GraficoBarras descricao="Receita" barras={barras} marcas={marcas} />)
    for (const texto of ['0', '5', '10', '15', 'ago', 'set', 'out']) expect(screen.getByText(texto)).toBeInTheDocument()
  })
})
```

Em `design-system/componentes/estilo.test.tsx`, dentro de `describe('CartaoNumero (CA-106, CA-107)'`:

```tsx
  it('o encaixe extra aparece entre o valor e o rótulo', () => {
    render(<CartaoNumero valor="25 de 200" rotulo="Preço de fundador" extra={<span>barra</span>} />)
    const valor = screen.getByText('25 de 200')
    const extra = screen.getByText('barra')
    const rotulo = screen.getByText('Preço de fundador')
    expect(valor.compareDocumentPosition(extra) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(extra.compareDocumentPosition(rotulo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run design-system/componentes/display/GraficoBarras.test.tsx design-system/componentes/estilo.test.tsx`
Expected: FAIL — o componente não existe e o `extra` não aparece.

- [ ] **Step 3: Implementar o `GraficoBarras`**

Crie `design-system/componentes/display/GraficoBarras.tsx`:

```tsx
import { cn } from '@ds/lib/cn.ts'

/*
 * Barras verticais de uma série só (a receita por mês do painel do dono). A cor é a
 * da ação, `bg-primary`: a barra em destaque cheia, as outras mais claras. Laranja
 * nunca, porque isto é painel de dado. Passar o mouse ou chegar pelo teclado numa
 * barra mostra a dica; só a barra em destaque tem o valor escrito em cima. O leitor
 * de tela lê a dica de cada barra, que é o nome do item.
 */
export interface BarraDoGrafico {
  readonly chave: string
  /** Embaixo da barra: "set". */
  readonly rotulo: string
  readonly valor: number
  /** Nome da barra e texto da dica: "set · R$ 1.026,45". */
  readonly dica: string
  readonly destaque?: boolean | undefined
  /** Escrito em cima da barra em destaque. */
  readonly valorEscrito?: string | undefined
}

interface GraficoBarrasProps {
  readonly descricao: string
  readonly barras: readonly BarraDoGrafico[]
  /** Marcas do eixo, da menor para a maior. A última é o topo do gráfico. */
  readonly marcas: readonly { readonly valor: number; readonly rotulo: string }[]
  readonly className?: string | undefined
}

export function GraficoBarras({ descricao, barras, marcas, className }: GraficoBarrasProps) {
  const topo = Math.max(marcas.at(-1)?.valor ?? 0, ...barras.map((b) => b.valor), 1)
  const altura = (valor: number) => `${Math.max(0, Math.min(100, (valor / topo) * 100))}%`

  return (
    <div className={cn('grid grid-cols-[auto_minmax(0,1fr)] gap-x-3', className)}>
      <div aria-hidden="true" className="relative h-48 w-12">
        {marcas.map((m) => (
          <span key={m.valor} className="numeros absolute right-0 translate-y-1/2 text-2xs text-muted-foreground" style={{ bottom: altura(m.valor) }}>
            {m.rotulo}
          </span>
        ))}
      </div>

      <div className="relative h-48">
        {marcas.map((m) => (
          <span
            key={m.valor}
            aria-hidden="true"
            className={cn('absolute inset-x-0 h-px', m.valor === 0 ? 'bg-borderdefault' : 'bg-border')}
            style={{ bottom: altura(m.valor) }}
          />
        ))}
        <ul aria-label={descricao} className="absolute inset-0 flex items-end gap-2 px-1 sm:gap-3.5">
          {barras.map((b) => (
            <li
              key={b.chave}
              tabIndex={0}
              aria-label={b.dica}
              className="group relative flex h-full flex-1 items-end justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn('block w-full max-w-14 rounded-t-sm transition-[filter] group-hover:brightness-110', b.destaque ? 'bg-primary' : 'bg-primary/35')}
                style={{ height: altura(b.valor) }}
              />
              {b.destaque && b.valorEscrito ? (
                <span
                  aria-hidden="true"
                  className="numeros absolute inset-x-0 text-center text-xs font-bold text-heading transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0"
                  style={{ bottom: `calc(${altura(b.valor)} + 0.375rem)` }}
                >
                  {b.valorEscrito}
                </span>
              ) : null}
              <span
                aria-hidden="true"
                className="numeros pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-heading px-2.5 py-1.5 text-xs font-semibold text-card opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                style={{ bottom: `calc(${altura(b.valor)} + 0.5rem)` }}
              >
                {b.dica}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div aria-hidden="true" />
      <div aria-hidden="true" className="flex gap-2 px-1 pt-2 sm:gap-3.5">
        {barras.map((b) => (
          <span key={b.chave} className="flex-1 text-center text-xs text-muted-foreground">
            {b.rotulo}
          </span>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implementar o `extra` do `CartaoNumero`**

Em `design-system/componentes/display/CartaoNumero.tsx`: importe `type ReactNode` de `react`, acrescente a prop e envolva o valor:

```tsx
import type { ReactNode } from 'react'
```

```tsx
  /** Entre o valor e o rótulo: uma barra de progresso, por exemplo. */
  readonly extra?: ReactNode | undefined
```

```tsx
export function CartaoNumero({ valor, rotulo, apoio, tom = 'branco', extra, aoClicar, className }: CartaoNumeroProps) {
  const conteudo = (
    <>
      <span className="flex flex-col gap-3">
        <span className="font-titulo text-4xl font-bold leading-none tracking-tight">{valor}</span>
        {extra ? <span className="block">{extra}</span> : null}
      </span>
```

(O resto do componente não muda.)

- [ ] **Step 5: Biblioteca, LEIA-ME e vitrine**

Em `design-system/index.ts`, junto dos outros de `display/`:

```ts
export { GraficoBarras, type BarraDoGrafico } from './componentes/display/GraficoBarras.tsx'
```

E acrescente `GraficoBarras` à linha de comentário `display` do topo do arquivo.

Em `design-system/componentes/LEIA-ME.md`, depois da seção `### Recolhivel`:

````markdown
### GraficoBarras
Barras verticais de uma série só, com o eixo de marcas à esquerda. A barra em destaque é
cheia e tem o valor escrito; as outras são mais claras. Passar o mouse ou chegar pelo
teclado mostra a dica, que também é o que o leitor de tela lê. Sempre na cor da ação,
nunca no laranja. *Nasceu no painel do dono (spec painel-do-dono).*

```tsx
<GraficoBarras
  descricao="Receita por mês"
  marcas={[{ valor: 0, rotulo: '0' }, { valor: 50000, rotulo: '500' }]}
  barras={[{ chave: '2026-10', rotulo: 'out', valor: 41230, dica: 'out · R$ 412,30', destaque: true, valorEscrito: 'R$ 412,30' }]}
/>
```

O `CartaoNumero` ganhou `extra`: o que vai entre o valor e o rótulo (a barra das vagas de fundador).
````

Em `design-system/vitrine/TelaDesignSystem.tsx`, importe o componente e acrescente uma seção depois da do `Recolhivel`:

```tsx
import { GraficoBarras } from '@ds/componentes/display/GraficoBarras.tsx'
```

```tsx
        <Secao nome="GraficoBarras" arquivo="display/GraficoBarras.tsx" descricao="Uma série, a barra em destaque escrita e a dica no mouse ou no teclado">
          <GraficoBarras
            descricao="Receita por mês"
            marcas={[
              { valor: 0, rotulo: '0' },
              { valor: 50000, rotulo: '500' },
              { valor: 100000, rotulo: '1.000' },
              { valor: 150000, rotulo: '1.500' },
            ]}
            barras={[
              { chave: 'jul', rotulo: 'jul', valor: 67130, dica: 'jul · R$ 671,30' },
              { chave: 'ago', rotulo: 'ago', valor: 84275, dica: 'ago · R$ 842,75' },
              { chave: 'set', rotulo: 'set', valor: 102645, dica: 'set · R$ 1.026,45' },
              { chave: 'out', rotulo: 'out', valor: 123585, dica: 'out · R$ 1.235,85', destaque: true, valorEscrito: 'R$ 1.235,85' },
            ]}
          />
        </Secao>
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run design-system/componentes/display/GraficoBarras.test.tsx design-system/componentes/estilo.test.tsx` → PASS. Depois `npm run check` → verde e `npx playwright test` → verde (o e2e do design system abre a vitrine).

- [ ] **Step 7: Commit**

```bash
git add design-system/componentes/display/GraficoBarras.tsx design-system/componentes/display/GraficoBarras.test.tsx design-system/componentes/display/CartaoNumero.tsx design-system/componentes/estilo.test.tsx design-system/index.ts design-system/componentes/LEIA-ME.md design-system/vitrine/TelaDesignSystem.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(ds): GraficoBarras e o encaixe extra do CartaoNumero`

---

### Tarefa 8: Tela Negócio

Cobre CA-345 a CA-362, CA-364, CB-78, CB-79, CB-80 e CB-83 na tela.

**Files:**
- Create: `src/ui/negocio/negocioFalso.test-utils.ts`
- Create: `src/ui/negocio/NumerosDoNegocio.tsx`
- Create: `src/ui/negocio/ReceitaPorMes.tsx`
- Create: `src/ui/negocio/AssinaturasPorPlano.tsx`
- Create: `src/ui/negocio/QuemChegou.tsx`
- Create: `src/ui/negocio/LinhaDeConta.tsx`
- Create: `src/ui/negocio/ListaDeContas.tsx`
- Create: `src/ui/negocio/TelaNegocio.tsx`
- Create: `src/ui/negocio/TelaNegocio.test.tsx`
- Create: `src/ui/negocio/ListaDeContas.test.tsx`

**Interfaces:**
- Consumes: Tarefas 4, 5, 6 e 7; `Card`, `CardTitle` de `@ds/componentes/display/card.tsx`; `Badge`; `Progress`; `Table*`; `Input`; `SeletorSegmentado`; `CartaoNumero`.
- Produces:

```ts
export const URL_MERCADO_PAGO = 'https://www.mercadopago.com.br/activities'
export function TelaNegocio(props: { readonly negocio: ValorNegocio }): JSX.Element
// negocioFalso.test-utils.ts:
export function dadosFalsos(sobre?: Partial<DadosDoNegocio>): DadosDoNegocio
export function negocioFalso(sobre?: Partial<ValorNegocio>): ValorNegocio
```

Com os `dadosFalsos` padrão, os números esperados são: receita R$ 89,82 (Pro mensal R$ 64,90 + Solo anual R$ 299 ÷ 12); "+R$ 24,92 em 30 dias"; 2 assinaturas ativas, "50% das contas pagam"; 4 contas, "+4 em 30 dias"; fundador "2 de 200", "198 vagas com preço travado para sempre".

- [ ] **Step 1: Escrever os dados de mentira**

Crie `src/ui/negocio/negocioFalso.test-utils.ts`:

```ts
// Painel do dono de mentira para os testes das telas.
// O nome não termina em `.test.ts`, então o Vitest não roda este arquivo como teste.
import { AGORA, conta, mudanca, paga } from '@/domain/negocio.test-utils.ts'
import type { DadosDoNegocio, ValorNegocio } from '../estado/usarNegocio.ts'

export function dadosFalsos(sobre: Partial<DadosDoNegocio> = {}): DadosDoNegocio {
  return {
    contas: [
      conta('a', { nome: 'Ana Souza', criadaEm: '2026-09-30T12:00:00Z', assinatura: paga('pro', 'mensal', 6490) }),
      conta('b', { nome: 'Bruno Lima', criadaEm: '2026-09-25T12:00:00Z', assinatura: paga('solo', 'anual', 29900) }),
      conta('c', { nome: 'Carla Dias', criadaEm: '2026-09-20T12:00:00Z', situacao: 'estudante', crnRegiao: null, crnStatus: null, pedidoStatus: 'em_analise' }),
      conta('d', { nome: '', email: 'sem.nome@exemplo.com', criadaEm: '2026-09-15T12:00:00Z', assinatura: paga('solo', 'mensal', 3490, { status: 'pendente' }) }),
    ],
    historico: [mudanca('a', '2026-08-10T12:00:00Z', { plano: 'pro', valorCentavos: 6490 })],
    uso: { links30Dias: 58, copias30Dias: 112 },
    lidoEm: AGORA,
    ...sobre,
  }
}

export function negocioFalso(sobre: Partial<ValorNegocio> = {}): ValorNegocio {
  return { dados: dadosFalsos(), carregando: false, erro: null, atualizar: vi.fn(), ...sobre }
}
```

- [ ] **Step 2: Escrever os testes que falham**

Crie `src/ui/negocio/TelaNegocio.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import { conta } from '@/domain/negocio.test-utils.ts'
import { FALHA_AO_LER_NEGOCIO } from '../estado/usarNegocio.ts'
import { dadosFalsos, negocioFalso } from './negocioFalso.test-utils.ts'
import { TelaNegocio, URL_MERCADO_PAGO } from './TelaNegocio.tsx'

const espacos = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ')

describe('TelaNegocio (spec painel-do-dono)', () => {
  it('CA-345: quatro cartões, nesta ordem, com a receita em destaque', () => {
    render(<TelaNegocio negocio={negocioFalso()} />)
    const resumo = screen.getByRole('region', { name: 'Resumo do negócio' })
    const texto = resumo.textContent ?? ''
    const posicoes = ['Receita por mês', 'Assinaturas ativas', 'Contas', 'Preço de fundador'].map((r) => texto.indexOf(r))
    expect(posicoes.every((p) => p >= 0)).toBe(true)
    expect([...posicoes].sort((x, y) => x - y)).toEqual(posicoes)
    expect(within(resumo).getByText(/^R\$\s89,82$/).closest('div')?.className).toContain('bg-surfacebrand')
  })

  it('CA-346 a CA-349: os números de cada cartão', () => {
    render(<TelaNegocio negocio={negocioFalso()} />)
    const resumo = within(screen.getByRole('region', { name: 'Resumo do negócio' }))
    expect(resumo.getByText(/^\+R\$\s24,92 em 30 dias$/)).toBeInTheDocument()
    expect(resumo.getByText('2')).toBeInTheDocument()
    expect(resumo.getByText('50% das contas pagam')).toBeInTheDocument()
    expect(resumo.getByText('4')).toBeInTheDocument()
    expect(resumo.getByText('+4 em 30 dias')).toBeInTheDocument()
    expect(resumo.getByText('2 de 200')).toBeInTheDocument()
    expect(resumo.getByText('198 vagas com preço travado para sempre')).toBeInTheDocument()
    expect(resumo.getByRole('progressbar', { name: '2 de 200 vagas usadas' })).toBeInTheDocument()
  })

  it('CA-350 e CA-351: uma barra por mês desde o histórico, com a dica, e só a do mês atual escrita', () => {
    render(<TelaNegocio negocio={negocioFalso()} />)
    const itens = within(screen.getByRole('list', { name: 'Receita por mês' })).getAllByRole('listitem')
    expect(itens.map((i) => espacos(i.getAttribute('aria-label')))).toEqual(['ago · R$ 64,90', 'set · R$ 64,90', 'out · R$ 89,82'])
    expect(within(itens[2] as HTMLElement).getAllByText(/R\$\s89,82/)).toHaveLength(2)
    expect(within(itens[0] as HTMLElement).getAllByText(/R\$\s64,90/)).toHaveLength(1)
  })

  it('CA-352: assinaturas por plano, da que rende mais, com a linha de total', () => {
    render(<TelaNegocio negocio={negocioFalso()} />)
    const cartao = screen.getByRole('region', { name: 'Assinaturas por plano' })
    const texto = espacos(cartao.textContent)
    expect(texto.indexOf('mensal · R$ 64,90')).toBeLessThan(texto.indexOf('anual · R$ 299,00'))
    expect(within(cartao).getByText('2 ativas')).toBeInTheDocument()
    expect(texto).toContain('R$ 24,92')
    expect(within(cartao).getAllByRole('progressbar')).toHaveLength(2)
  })

  it('CA-353: selo só para o caso que existe', () => {
    render(<TelaNegocio negocio={negocioFalso()} />)
    const cartao = within(screen.getByRole('region', { name: 'Assinaturas por plano' }))
    expect(cartao.getByText('1 com pagamento pendente')).toBeInTheDocument()
    expect(cartao.queryByText(/pausada/)).toBeNull()
    expect(cartao.queryByText(/em 30 dias/)).toBeNull()
  })

  it('CB-80: sem assinatura paga', () => {
    render(<TelaNegocio negocio={negocioFalso({ dados: dadosFalsos({ contas: [conta('x')], historico: [] }) })} />)
    expect(screen.getByText('Nenhuma assinatura paga ainda.')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Resumo do negócio' })).getByText(/^R\$\s0,00$/)).toBeInTheDocument()
    const itens = within(screen.getByRole('list', { name: 'Receita por mês' })).getAllByRole('listitem')
    expect(itens.map((i) => espacos(i.getAttribute('aria-label')))).toEqual(['out · R$ 0,00'])
  })

  it('CA-354 e CA-355: o funil com a parte sobre quem criou conta, e o uso', () => {
    render(<TelaNegocio negocio={negocioFalso()} />)
    const cartao = screen.getByRole('region', { name: 'Quem chegou nos últimos 30 dias' })
    const etapas = within(within(cartao).getByRole('list', { name: 'Etapas' })).getAllByRole('listitem')
    expect(etapas.map((e) => espacos(e.textContent))).toEqual([
      '4criaram conta',
      '4confirmaram o e-mail · 100%',
      '3foram verificadas · 75%',
      '2assinaram um plano pago · 50%',
    ])
    expect(espacos(cartao.textContent)).toContain('Links de missões criados em 30 dias58')
    expect(espacos(cartao.textContent)).toContain('Contas que atualizaram a cópia na nuvem em 30 dias112')
  })

  it('primeira leitura em andamento: avisa que está lendo', () => {
    render(<TelaNegocio negocio={negocioFalso({ dados: null, carregando: true })} />)
    expect(screen.getByRole('status')).toHaveTextContent('Lendo os números…')
  })

  it('CB-78: sem números e com erro, só o aviso', () => {
    render(<TelaNegocio negocio={negocioFalso({ dados: null, erro: FALHA_AO_LER_NEGOCIO })} />)
    expect(screen.getByRole('alert')).toHaveTextContent(FALHA_AO_LER_NEGOCIO)
    expect(screen.queryByRole('region', { name: 'Resumo do negócio' })).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('CB-79: com erro e números anteriores, os dois aparecem', () => {
    render(<TelaNegocio negocio={negocioFalso({ erro: FALHA_AO_LER_NEGOCIO })} />)
    expect(screen.getByRole('alert')).toHaveTextContent(FALHA_AO_LER_NEGOCIO)
    expect(screen.getByRole('region', { name: 'Resumo do negócio' })).toBeInTheDocument()
  })

  it('CA-364: o rodapé diz o que não aparece e leva ao Mercado Pago em outra aba', () => {
    render(<TelaNegocio negocio={negocioFalso()} />)
    expect(screen.getByText('Planos e pacientes ficam no aparelho de cada nutricionista e não aparecem aqui.')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Abrir o Mercado Pago' })
    expect(link).toHaveAttribute('href', URL_MERCADO_PAGO)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noreferrer')
  })

  it('os "30 dias" contam da hora da leitura, não do relógio', () => {
    // Lido em 30/11: as contas de setembro já não são novas.
    render(<TelaNegocio negocio={negocioFalso({ dados: dadosFalsos({ lidoEm: new Date('2026-11-30T15:00:00Z') }) })} />)
    expect(within(screen.getByRole('region', { name: 'Resumo do negócio' })).getByText('+0 em 30 dias')).toBeInTheDocument()
  })
})
```

Crie `src/ui/negocio/ListaDeContas.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AGORA, conta } from '@/domain/negocio.test-utils.ts'
import { dadosFalsos } from './negocioFalso.test-utils.ts'
import { ListaDeContas } from './ListaDeContas.tsx'

const contas = [...dadosFalsos().contas, conta('dono', { nome: '', email: 'dono@exemplo.com', criadaEm: '2026-08-01T12:00:00Z', situacao: null, crnRegiao: null, crnStatus: null, ultimoLoginEm: null })]
const linhas = () => screen.getAllByRole('row').slice(1)
const texto = (el: HTMLElement) => (el.textContent ?? '').replace(/\s/g, ' ')

describe('ListaDeContas (spec painel-do-dono)', () => {
  it('CA-356: uma linha por conta, a mais nova primeiro, com as cinco colunas', () => {
    render(<ListaDeContas contas={contas} agora={AGORA} />)
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Pessoa', 'Situação', 'Plano', 'Criou a conta', 'Último login'])
    const primeiras = linhas().map((l) => texto(within(l).getAllByRole('cell')[0] as HTMLElement))
    expect(primeiras).toEqual(['Ana Souzaa@exemplo.com', 'Bruno Limab@exemplo.com', 'Carla Diasc@exemplo.com', 'sem.nome@exemplo.com', 'dono@exemplo.com'])
  })

  it('CA-357 e CA-358: situação e plano com os selos, nas cores de Aprovações', () => {
    render(<ListaDeContas contas={contas} agora={AGORA} />)
    const [ana, , carla, semNome, dono] = linhas()
    expect(within(ana as HTMLElement).getByText('CRN-6 conferido').className).toContain('bg-lightsuccess')
    expect(within(ana as HTMLElement).getByText('Pro mensal').className).toContain('bg-lightsuccess')
    expect(within(carla as HTMLElement).getByText('Estudante')).toBeInTheDocument()
    expect(within(carla as HTMLElement).getByText('Comprovante em análise').className).toContain('bg-lightinfo')
    expect(within(carla as HTMLElement).getByText('Free')).toBeInTheDocument()
    expect(within(semNome as HTMLElement).getByText('Solo mensal')).toBeInTheDocument()
    expect(within(semNome as HTMLElement).getByText('Pagamento pendente').className).toContain('bg-lightwarning')
    expect(within(dono as HTMLElement).getByText('Sem situação')).toBeInTheDocument()
  })

  it('CA-359 e CB-83: data de criação, último login e e-mail no lugar do nome vazio', () => {
    render(<ListaDeContas contas={contas} agora={AGORA} />)
    const [ana, , , semNome, dono] = linhas()
    expect(texto(ana as HTMLElement)).toContain('30/09/2026')
    expect(texto(ana as HTMLElement)).toContain('hoje')
    expect(within(semNome as HTMLElement).getAllByText('sem.nome@exemplo.com')).toHaveLength(1)
    expect(texto(dono as HTMLElement)).toContain('nunca')
  })

  it('CA-360 e CA-362: o grupo escolhido fica marcado, filtra a lista e muda o total', async () => {
    const user = userEvent.setup()
    render(<ListaDeContas contas={contas} agora={AGORA} />)
    expect(screen.getByText('5 de 5')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Estudantes' }))
    expect(screen.getByRole('radio', { name: 'Estudantes' })).toHaveAttribute('aria-checked', 'true')
    expect(linhas()).toHaveLength(1)
    expect(screen.getByText('1 de 1')).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Assinantes' }))
    expect(linhas().map((l) => texto(within(l).getAllByRole('cell')[0] as HTMLElement))).toEqual(['Ana Souzaa@exemplo.com', 'Bruno Limab@exemplo.com'])
  })

  it('CA-361 e CA-362: a busca ignora maiúscula e acento e diz quando não acha nada', async () => {
    const user = userEvent.setup()
    render(<ListaDeContas contas={contas} agora={AGORA} />)
    const busca = screen.getByRole('searchbox', { name: 'Buscar nome ou e-mail' })
    await user.type(busca, 'SOUZA')
    expect(linhas()).toHaveLength(1)
    expect(screen.getByText('1 de 5')).toBeInTheDocument()
    await user.clear(busca)
    await user.type(busca, 'zzz')
    expect(screen.getByText('Nenhuma conta com esse nome ou e-mail.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('CA-362: grupo vazio sem busca', async () => {
    const user = userEvent.setup()
    render(<ListaDeContas contas={[conta('x')]} agora={AGORA} />)
    await user.click(screen.getByRole('radio', { name: 'Estudantes' }))
    expect(screen.getByText('Nenhuma conta neste grupo.')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/ui/negocio`
Expected: FAIL — os componentes não existem.

- [ ] **Step 4: Implementar os componentes**

`src/ui/negocio/NumerosDoNegocio.tsx`:

```tsx
import type { ResumoDoNegocio } from '@/domain/negocio.ts'
import { diferencaEm30Dias, inteiro, parteQuePaga, reais } from '@/domain/negocioTextos.ts'
import { CartaoNumero } from '@ds/componentes/display/CartaoNumero.tsx'
import { Progress } from '@ds/componentes/display/progress.tsx'

/** CA-345 a CA-349: os quatro cartões do topo. A receita é o destaque da tela. */
export function NumerosDoNegocio({ resumo }: { readonly resumo: ResumoDoNegocio }) {
  const usadas = `${inteiro(resumo.fundadorUsadas)} de ${inteiro(resumo.fundadorVagas)}`
  const sobram = Math.max(0, resumo.fundadorVagas - resumo.fundadorUsadas)
  return (
    <section aria-label="Resumo do negócio" className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      <CartaoNumero tom="teal" valor={reais(resumo.receitaCentavos)} rotulo="Receita por mês" apoio={diferencaEm30Dias(resumo.diferenca30DiasCentavos)} />
      <CartaoNumero valor={inteiro(resumo.assinaturasAtivas)} rotulo="Assinaturas ativas" apoio={parteQuePaga(resumo.parteQuePaga)} />
      <CartaoNumero valor={inteiro(resumo.contas)} rotulo="Contas" apoio={`+${inteiro(resumo.contasNovas30Dias)} em 30 dias`} />
      <CartaoNumero
        valor={usadas}
        rotulo="Preço de fundador"
        apoio={`${inteiro(sobram)} vagas com preço travado para sempre`}
        extra={<Progress value={(resumo.fundadorUsadas / resumo.fundadorVagas) * 100} aria-label={`${usadas} vagas usadas`} />}
      />
    </section>
  )
}
```

`src/ui/negocio/ReceitaPorMes.tsx`:

```tsx
import { marcasDoEixo, type BarraDeReceita } from '@/domain/negocio.ts'
import { marcaDoEixo, reais } from '@/domain/negocioTextos.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { GraficoBarras } from '@ds/componentes/display/GraficoBarras.tsx'

/** CA-350 e CA-351. */
export function ReceitaPorMes({ barras }: { readonly barras: readonly BarraDeReceita[] }) {
  const marcas = marcasDoEixo(Math.max(0, ...barras.map((b) => b.centavos))).map((c) => ({ valor: c, rotulo: marcaDoEixo(c) }))
  return (
    <section aria-labelledby="titulo-receita">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <CardTitle id="titulo-receita">Receita por mês</CardTitle>
          <p className="text-xs text-muted-foreground">Assinaturas ativas no fim de cada mês. O anual entra dividido por 12.</p>
        </div>
        <GraficoBarras
          descricao="Receita por mês"
          marcas={marcas}
          barras={barras.map((b) => ({
            chave: b.chave,
            rotulo: b.mes,
            valor: b.centavos,
            dica: `${b.mes} · ${reais(b.centavos)}`,
            destaque: b.atual,
            valorEscrito: b.atual ? reais(b.centavos) : undefined,
          }))}
        />
      </Card>
    </section>
  )
}
```

`src/ui/negocio/AssinaturasPorPlano.tsx`:

```tsx
import { planoPorId } from '@/domain/conta.ts'
import type { LinhaDePlano, SituacoesDeAssinatura } from '@/domain/negocio.ts'
import { detalheDoPlano, inteiro, reais } from '@/domain/negocioTextos.ts'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Progress } from '@ds/componentes/display/progress.tsx'

interface AssinaturasPorPlanoProps {
  readonly linhas: readonly LinhaDePlano[]
  readonly situacoes: SituacoesDeAssinatura
}

const plural = (n: number, um: string, varios: string) => `${inteiro(n)} ${n === 1 ? um : varios}`

/** CA-352 e CA-353. */
export function AssinaturasPorPlano({ linhas, situacoes }: AssinaturasPorPlanoProps) {
  const total = linhas.reduce((soma, l) => soma + l.centavosPorMes, 0)
  const ativas = linhas.reduce((soma, l) => soma + l.quantidade, 0)
  const selos = [
    situacoes.pendentes > 0 ? { texto: `${inteiro(situacoes.pendentes)} com pagamento pendente`, variante: 'lightWarning' as const } : null,
    situacoes.pausadas > 0 ? { texto: plural(situacoes.pausadas, 'pausada', 'pausadas'), variante: 'lightWarning' as const } : null,
    situacoes.canceladas30Dias > 0 ? { texto: `${plural(situacoes.canceladas30Dias, 'cancelada', 'canceladas')} em 30 dias`, variante: 'muted' as const } : null,
  ].filter((s) => s !== null)

  return (
    <section aria-labelledby="titulo-planos">
      <Card>
        <CardTitle id="titulo-planos">Assinaturas por plano</CardTitle>
        {linhas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma assinatura paga ainda.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            <p aria-hidden="true" className="grid grid-cols-[minmax(0,1fr)_3rem_6rem] gap-3 px-3.5 text-2xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              <span>Plano</span>
              <span className="text-right">Ativas</span>
              <span className="text-right">Por mês</span>
            </p>
            <ul className="flex flex-col gap-1.5">
              {linhas.map((l) => (
                <li key={l.chave} className="grid grid-cols-[minmax(0,1fr)_3rem_6rem] items-center gap-x-3 gap-y-2 rounded-lg bg-surfacerow px-3.5 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="font-semibold text-heading">{planoPorId(l.plano)?.nome ?? l.plano}</span>{' '}
                    <span className="text-xs text-muted-foreground">{detalheDoPlano(l.plano, l.ciclo)}</span>
                  </span>
                  <span className="numeros text-right">{inteiro(l.quantidade)}</span>
                  <span className="numeros text-right font-semibold text-heading">{reais(l.centavosPorMes)}</span>
                  <Progress value={l.parte * 100} aria-label={`Parte do ${planoPorId(l.plano)?.nome ?? l.plano} ${l.ciclo} na receita`} className="col-span-3 h-1" />
                </li>
              ))}
            </ul>
            <p className="flex justify-between px-3.5 pt-1 text-sm font-bold text-heading">
              <span>{plural(ativas, 'ativa', 'ativas')}</span>
              <span className="numeros">{reais(total)}</span>
            </p>
          </div>
        )}
        {selos.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selos.map((s) => (
              <Badge key={s.texto} variant={s.variante} dot>
                {s.texto}
              </Badge>
            ))}
          </div>
        ) : null}
      </Card>
    </section>
  )
}
```

`src/ui/negocio/QuemChegou.tsx`:

```tsx
import type { EtapaDoFunil, UsoNoPainel } from '@/domain/negocio.ts'
import { inteiro, porcentagem } from '@/domain/negocioTextos.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Progress } from '@ds/componentes/display/progress.tsx'

interface QuemChegouProps {
  readonly funil: readonly EtapaDoFunil[]
  readonly uso: UsoNoPainel
}

/** CA-354 e CA-355. A porcentagem é sobre quem criou conta (D-62). */
export function QuemChegou({ funil, uso }: QuemChegouProps) {
  const base = funil[0]?.quantidade ?? 0
  return (
    <section aria-labelledby="titulo-funil">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <CardTitle id="titulo-funil">Quem chegou nos últimos 30 dias</CardTitle>
          <p className="text-xs text-muted-foreground">A porcentagem é sobre quem criou conta.</p>
        </div>
        <ol aria-label="Etapas" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {funil.map((e) => (
            <li key={e.chave} className="flex flex-col gap-1.5">
              <span className="numeros font-titulo text-2xl font-bold text-heading">{inteiro(e.quantidade)}</span>
              <Progress value={base === 0 ? 0 : (e.quantidade / base) * 100} aria-label={e.rotulo} className="h-2.5" />
              <span className="text-sm text-muted-foreground">
                {e.rotulo}
                {e.parte !== null ? (
                  <>
                    {' · '}
                    <strong className="font-semibold text-foreground">{porcentagem(e.parte)}</strong>
                  </>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
        <ul className="grid gap-2 sm:grid-cols-2">
          <li className="flex items-baseline justify-between gap-3 rounded-lg bg-surfacerow px-3.5 py-2.5 text-sm">
            <span>Links de missões criados em 30 dias</span>
            <strong className="numeros text-heading">{inteiro(uso.links30Dias)}</strong>
          </li>
          <li className="flex items-baseline justify-between gap-3 rounded-lg bg-surfacerow px-3.5 py-2.5 text-sm">
            <span>Contas que atualizaram a cópia na nuvem em 30 dias</span>
            <strong className="numeros text-heading">{inteiro(uso.copias30Dias)}</strong>
          </li>
        </ul>
      </Card>
    </section>
  )
}
```

`src/ui/negocio/LinhaDeConta.tsx`:

```tsx
import type { ContaNoPainel } from '@/domain/negocio.ts'
import { dataEmBrasilia, seloDaSituacao, textoDoPlano, ultimoLogin, type TomDoSelo } from '@/domain/negocioTextos.ts'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { TableCell, TableRow } from '@ds/componentes/display/table.tsx'

/** CA-357: as mesmas variantes de Aprovações. */
const VARIANTE: Readonly<Record<TomDoSelo, 'lightSuccess' | 'lightInfo' | 'lightWarning' | 'muted'>> = {
  sucesso: 'lightSuccess',
  info: 'lightInfo',
  aviso: 'lightWarning',
  neutro: 'muted',
}

interface LinhaDeContaProps {
  readonly conta: ContaNoPainel
  readonly agora: Date
}

/** CA-356 a CA-359 e CB-83. */
export function LinhaDeConta({ conta, agora }: LinhaDeContaProps) {
  const { situacao, selo } = seloDaSituacao(conta)
  const plano = textoDoPlano(conta, agora)
  return (
    <TableRow>
      <TableCell>
        <span className="block font-semibold text-heading">{conta.nome || conta.email}</span>
        {conta.nome ? <span className="block text-xs text-muted-foreground">{conta.email}</span> : null}
      </TableCell>
      <TableCell>
        <span className="flex flex-col items-start gap-1">
          <span>{situacao}</span>
          {selo ? <Badge variant={VARIANTE[selo.tom]}>{selo.texto}</Badge> : null}
        </span>
      </TableCell>
      <TableCell>
        <span className="flex flex-col items-start gap-1">
          {plano.tom ? <Badge variant={VARIANTE[plano.tom]}>{plano.texto}</Badge> : <span>{plano.texto}</span>}
          {plano.aviso ? <Badge variant={VARIANTE[plano.aviso.tom]}>{plano.aviso.texto}</Badge> : null}
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap">{dataEmBrasilia(conta.criadaEm)}</TableCell>
      <TableCell className="whitespace-nowrap">{ultimoLogin(conta.ultimoLoginEm, agora)}</TableCell>
    </TableRow>
  )
}
```

Na conta sem situação, a coluna Situação mostra só "Sem situação", sem selo.

`src/ui/negocio/ListaDeContas.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { filtrarContas, type ContaNoPainel, type GrupoDeContas } from '@/domain/negocio.ts'
import { inteiro } from '@/domain/negocioTextos.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@ds/componentes/display/table.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'
import { LinhaDeConta } from './LinhaDeConta.tsx'

const GRUPOS: readonly { readonly valor: GrupoDeContas; readonly rotulo: string }[] = [
  { valor: 'todas', rotulo: 'Todas' },
  { valor: 'nutricionistas', rotulo: 'Nutricionistas' },
  { valor: 'estudantes', rotulo: 'Estudantes' },
  { valor: 'assinantes', rotulo: 'Assinantes' },
]

interface ListaDeContasProps {
  readonly contas: readonly ContaNoPainel[]
  readonly agora: Date
}

/** CA-356 a CA-362. */
export function ListaDeContas({ contas, agora }: ListaDeContasProps) {
  const [grupo, setGrupo] = useState<GrupoDeContas>('todas')
  const [busca, setBusca] = useState('')
  const { visiveis, totalDoGrupo } = useMemo(() => filtrarContas(contas, grupo, busca), [contas, grupo, busca])

  return (
    <section aria-labelledby="titulo-contas">
      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <CardTitle id="titulo-contas">Contas</CardTitle>
          <p className="text-xs text-muted-foreground">
            <span className="numeros">
              {inteiro(visiveis.length)} de {inteiro(totalDoGrupo)}
            </span>
            , das mais novas para as mais antigas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SeletorSegmentado<GrupoDeContas> rotulo="Grupo de contas" valor={grupo} aoEscolher={setGrupo} opcoes={GRUPOS} className="max-w-full overflow-x-auto" />
          <Input
            type="search"
            aria-label="Buscar nome ou e-mail"
            placeholder="Buscar nome ou e-mail"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full sm:ml-auto sm:w-64"
          />
        </div>
        {visiveis.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{busca.trim() ? 'Nenhuma conta com esse nome ou e-mail.' : 'Nenhuma conta neste grupo.'}</p>
        ) : (
          <Table className="min-w-[44rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Pessoa</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Criou a conta</TableHead>
                <TableHead>Último login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((c) => (
                <LinhaDeConta key={c.id} conta={c} agora={agora} />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </section>
  )
}
```

O texto "5 de 5" do teste aparece num `<span>` só porque o JSX `{a} de {b}` dentro do mesmo `<span>` vira um nó de texto contínuo para o `getByText`. Se o teste não achar, junte num template: `` {`${inteiro(visiveis.length)} de ${inteiro(totalDoGrupo)}`} ``.

`src/ui/negocio/TelaNegocio.tsx`:

```tsx
import { useMemo } from 'react'
import { assinaturasPorPlano, funilDe30Dias, receitaPorMes, resumirNegocio, situacoesDeAssinatura } from '@/domain/negocio.ts'
import type { ValorNegocio } from '../estado/usarNegocio.ts'
import { AssinaturasPorPlano } from './AssinaturasPorPlano.tsx'
import { ListaDeContas } from './ListaDeContas.tsx'
import { NumerosDoNegocio } from './NumerosDoNegocio.tsx'
import { QuemChegou } from './QuemChegou.tsx'
import { ReceitaPorMes } from './ReceitaPorMes.tsx'

export const URL_MERCADO_PAGO = 'https://www.mercadopago.com.br/activities'

/** Negócio: só para administrador (spec painel-do-dono; protótipo "Painel do dono MetaNutri"). */
export function TelaNegocio({ negocio }: { readonly negocio: ValorNegocio }) {
  const { dados, erro } = negocio

  // "Agora" é a hora da leitura: os 30 dias e o mês atual batem com os números lidos.
  const calculado = useMemo(() => {
    if (!dados) return null
    const resumo = resumirNegocio(dados.contas, dados.historico, dados.lidoEm)
    return {
      resumo,
      barras: receitaPorMes(dados.historico, resumo.receitaCentavos, dados.lidoEm),
      linhas: assinaturasPorPlano(dados.contas),
      situacoes: situacoesDeAssinatura(dados.contas, dados.lidoEm),
      funil: funilDe30Dias(dados.contas, dados.lidoEm),
    }
  }, [dados])

  return (
    <div className="flex flex-col gap-5">
      {erro ? (
        <p role="alert" className="rounded-xl bg-lighterror p-3 text-sm text-errortext">
          {erro}
        </p>
      ) : null}
      {!dados && !erro ? (
        <p role="status" className="text-sm text-muted-foreground">
          Lendo os números…
        </p>
      ) : null}
      {dados && calculado ? (
        <>
          <NumerosDoNegocio resumo={calculado.resumo} />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <ReceitaPorMes barras={calculado.barras} />
            <AssinaturasPorPlano linhas={calculado.linhas} situacoes={calculado.situacoes} />
          </div>
          <QuemChegou funil={calculado.funil} uso={dados.uso} />
          <ListaDeContas contas={dados.contas} agora={dados.lidoEm} />
        </>
      ) : null}
      <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-1 text-sm text-muted-foreground">
        <span>Planos e pacientes ficam no aparelho de cada nutricionista e não aparecem aqui.</span>
        <span>
          Taxas, estornos e repasses:{' '}
          <a
            href={URL_MERCADO_PAGO}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center font-semibold text-heading underline-offset-4 hover:underline"
          >
            Abrir o Mercado Pago
          </a>
        </span>
      </footer>
    </div>
  )
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/ui/negocio` → PASS. Depois `npm run check` → verde.

- [ ] **Step 6: Commit**

```bash
git add src/ui/negocio
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(negocio): tela Negócio com receita, planos, funil e contas`

---

### Tarefa 9: Rota, menu e App

Cobre CA-342, CA-343, CA-363 (Atualizar e "Lido às") e CB-87.

**Files:**
- Modify: `src/ui/navegacao.ts` (tipo `Rota`, `lerRota`, `escreverRota`)
- Modify: `src/ui/navegacao.test.ts`
- Modify: `src/ui/layout/MenuLateral.tsx` (import do ícone e item no grupo Administração)
- Modify: `src/App.tsx` (hook, import e bloco da rota)
- Modify: `src/AppConta.test.tsx`

**Interfaces:**
- Consumes: `useNegocio`, `ValorNegocio` (Tarefa 6), `TelaNegocio` (Tarefa 8), `horaEmBrasilia` (Tarefa 5).
- Produces: rota `{ tela: 'negocio' }` ↔ `#/negocio`.

- [ ] **Step 1: Escrever os testes que falham**

Em `src/ui/navegacao.test.ts`, acrescente ao `it.each` da leitura:

```ts
    ['#/negocio', { tela: 'negocio' }],
```

E um teste de ida e volta dentro do mesmo `describe`:

```ts
  it('CA-342: a tela Negócio tem endereço próprio e não é pública', () => {
    expect(escreverRota({ tela: 'negocio' })).toBe('#/negocio')
    expect(lerRota(escreverRota({ tela: 'negocio' }))).toEqual({ tela: 'negocio' })
    expect(ehTelaPublica({ tela: 'negocio' })).toBe(false)
  })
```

Em `src/AppConta.test.tsx`, junto dos outros `vi.mock`:

```ts
const negocio = vi.hoisted(() => ({ dados: null as unknown, atualizar: vi.fn() }))
vi.mock('./ui/estado/usarNegocio.ts', () => ({
  FALHA_AO_LER_NEGOCIO: 'Não consegui ler os números agora. Confira a internet e toque em Atualizar.',
  useNegocio: () => ({ dados: negocio.dados, carregando: false, erro: null, atualizar: negocio.atualizar }),
}))
```

No `beforeEach` do `describe` principal:

```ts
    negocio.dados = null
    negocio.atualizar = vi.fn()
```

E os testes, perto dos de Aprovações:

```tsx
  it('CA-342: administrador vê Negócio antes de Aprovações e abre a tela', () => {
    verificacao.ehAdmin = true
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/negocio'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Negócio' })).toBeInTheDocument()
    const nomes = screen.getAllByRole('button', { name: /^(Negócio|Aprovações)/ }).map((b) => b.textContent ?? '')
    expect(nomes[0]).toMatch(/^Negócio/)
    expect(nomes[1]).toMatch(/^Aprovações/)
  })

  it('CA-343 e CB-87: quem não é administrador não vê Negócio e cai no painel', () => {
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/negocio'
    render(tela())
    expect(screen.queryByRole('button', { name: /^Negócio/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
  })

  it('CA-363: a hora da leitura no subtítulo e o botão Atualizar', async () => {
    verificacao.ehAdmin = true
    negocio.dados = { contas: [], historico: [], uso: { links30Dias: 0, copias30Dias: 0 }, lidoEm: new Date('2026-10-02T17:32:00Z') }
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/negocio'
    render(tela())
    expect(screen.getByText('Lido às 14:32')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Atualizar' }))
    expect(negocio.atualizar).toHaveBeenCalledOnce()
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/navegacao.test.ts src/AppConta.test.tsx`
Expected: FAIL — a rota não existe.

- [ ] **Step 3: Rota**

Em `src/ui/navegacao.ts`: no tipo `Rota`, depois de `| { readonly tela: 'aprovacoes' }`:

```ts
  | { readonly tela: 'negocio' }
```

Em `lerRota`, depois da linha de `aprovacoes`:

```ts
  if (tela === 'negocio') return { tela: 'negocio' }
```

Em `escreverRota`, ao lado do `case 'aprovacoes'`:

```ts
    case 'negocio':
      return '#/negocio'
```

Rode `npm run typecheck`: se outro `switch` sobre `rota.tela` reclamar do caso novo, trate `negocio` igual a `aprovacoes` nesse `switch`.

- [ ] **Step 4: Menu**

Em `src/ui/layout/MenuLateral.tsx`, acrescente `ChartLine` ao import de `lucide-react` (em ordem alfabética, antes de `CircleHelp`) e, dentro de `<Secao titulo="Administração">`, antes do `ItemMenu` de Aprovações:

```tsx
            <ItemMenu icone={<ChartLine aria-hidden="true" />} rotulo="Negócio" ativo={rota.tela === 'negocio'} aoClicar={() => ir({ tela: 'negocio' })} />
```

- [ ] **Step 5: App**

Em `src/App.tsx`:

Imports (junto dos outros do mesmo tipo):

```ts
import { RefreshCw } from 'lucide-react'   // junte ao import de 'lucide-react' que já existe
import { horaEmBrasilia } from './domain/negocioTextos.ts'
import { TelaNegocio } from './ui/negocio/TelaNegocio.tsx'
import { useNegocio } from './ui/estado/usarNegocio.ts'
```

Logo depois de `const aprovacoes = useAprovacoes(perfilConta.ehAdmin)`:

```ts
  // Só lê com a tela aberta: são as contas inteiras, não precisa a cada abertura do app.
  const negocio = useNegocio(perfilConta.ehAdmin && rota.tela === 'negocio')
```

Antes do bloco `if (rota.tela === 'aprovacoes') {`:

```tsx
  if (rota.tela === 'negocio') {
    if (!perfilConta.ehAdmin) return <Redirecionar para={{ tela: 'painel' }} navegar={navegar} />
    return (
      <Estrutura
        {...base}
        titulo="Negócio"
        subtitulo={negocio.dados ? `Lido às ${horaEmBrasilia(negocio.dados.lidoEm)}` : 'Só você vê esta tela'}
        acoes={
          <Button variant="outline" loading={negocio.carregando} onClick={negocio.atualizar}>
            <RefreshCw aria-hidden="true" />
            Atualizar
          </Button>
        }
      >
        <TelaNegocio negocio={negocio} />
      </Estrutura>
    )
  }
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run src/ui/navegacao.test.ts src/AppConta.test.tsx` → PASS. Depois `npm run check` → verde e `npx playwright test` → verde.

- [ ] **Step 7: Commit**

```bash
git add src/ui/navegacao.ts src/ui/navegacao.test.ts src/ui/layout/MenuLateral.tsx src/App.tsx src/AppConta.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(app): tela Negócio no menu do administrador`

---

### Tarefa 10: Documentação e validação final

**Files:**
- Modify: `docs/decisoes.md` (uma linha nova no fim da tabela)
- Modify: `docs/pendencias.md` (um parágrafo no topo)
- Modify: `README.md` (seção "O que o sistema faz", uma linha sobre a tela Negócio)
- Modify: `specs/painel-do-dono/SPEC.md` (status)

- [ ] **Step 1: Registro**

`docs/decisoes.md`, nova linha ao fim da tabela, antes de "Custos de referência":

```markdown
| 02/10/2026 | **Painel do dono** (D-55 a D-64 da `specs/painel-do-dono/SPEC.md`, resumidas aqui): D-55 tela Negócio no grupo Administração, travada no banco · D-56 a conta do dono não tem situação e é criada no painel do Supabase · D-57 receita por mês é a soma das pagas ativas, com o anual dividido por 12 · D-58 o banco guarda o histórico das assinaturas, e o gráfico começa nele · D-59 o banco guarda o ciclo mensal/anual · D-60 "Último login" no lugar de "Último acesso" · D-61 cópias na nuvem contam contas, não cópias · D-62 a porcentagem do funil é sobre quem criou conta · D-63 a tela não mostra plano nem paciente, e o detalhe do pagamento fica no Mercado Pago · D-64 a política diz Resend e a nova finalidade | pedido seu de 02/10/2026 ("preciso desse acesso único"), visto no protótipo "Painel do dono MetaNutri" | usuário |
```

`docs/pendencias.md`, logo depois do bloco "Atualizado em 30/09":

```markdown
> **Atualizado em 02/10:** a tela **Negócio** (spec `painel-do-dono`) mostra receita, assinaturas por plano,
> quem chegou nos últimos 30 dias e a lista de contas, só para o administrador. Falta rodar o
> `supabase/007-painel-do-dono.sql`; o histórico de receita começa no dia em que ele rodar.
```

`README.md`, em "O que o sistema faz", uma linha:

```markdown
- **Negócio** (só para o administrador): receita por mês, assinaturas por plano, quem chegou nos últimos 30 dias e a lista de contas. Precisa do `007-painel-do-dono.sql`.
```

`specs/painel-do-dono/SPEC.md`: troque "Status: **aguardando aprovação**" por "Status: **aprovada** em 02/10/2026".

- [ ] **Step 2: Validação completa**

Run: `npm run check` → verde (lint, typecheck e todos os testes).
Run: `npx playwright test` → verde.
Run: `node scripts/conferir-publicacao.mjs` → "pode publicar".

- [ ] **Step 3: Cobertura dos critérios**

Confira a tabela "Cobertura da spec" abaixo: cada CA tem um teste que cita o número. Rode `grep -rn "CA-3[4-6][0-9]" src design-system --include=*.test.*` e confira que de CA-342 a CA-365 todos aparecem.

- [ ] **Step 4: Commit**

```bash
git add docs/decisoes.md docs/pendencias.md README.md specs/painel-do-dono/SPEC.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `docs: painel do dono registrado`

- [ ] **Step 5: Com o usuário — conferência no servidor de verdade**

Com o `007` rodado (Tarefa 2, Step 7), a conta de administrador criada e o site publicado ou o app local com o `.env.local` preenchido: o usuário entra com a conta de administrador, abre **Negócio** e confere que aparecem a própria conta ("Sem situação", "Free") e os números. Uma conta que não é administradora não vê o item no menu. Divergência vira correção antes de fechar.

---

## Cobertura da spec

| Critério | Teste |
|---|---|
| CA-342 | `AppConta.test.tsx` · `navegacao.test.ts` |
| CA-343, CB-87 | `AppConta.test.tsx` |
| CA-344 | `sqlPainel.test.ts` · `usarNegocio.test.ts` |
| CA-345 | `TelaNegocio.test.tsx` |
| CA-346 | `negocio.test.ts` · `negocioTextos.test.ts` · `TelaNegocio.test.tsx` |
| CA-347, CA-348, CA-349 | `negocio.test.ts` · `negocioTextos.test.ts` · `TelaNegocio.test.tsx` |
| CA-350, CA-351 | `negocio.test.ts` · `GraficoBarras.test.tsx` · `TelaNegocio.test.tsx` |
| CA-352, CA-353 | `negocio.test.ts` · `negocioTextos.test.ts` · `TelaNegocio.test.tsx` |
| CA-354, CA-355 | `negocio.test.ts` · `TelaNegocio.test.tsx` |
| CA-356 a CA-362 | `negocio.test.ts` · `negocioTextos.test.ts` · `ListaDeContas.test.tsx` |
| CA-363 | `usarNegocio.test.ts` · `negocioTextos.test.ts` · `AppConta.test.tsx` |
| CA-364 | `TelaNegocio.test.tsx` |
| CA-365 | `legal.test.ts` · `legal.test.tsx` |
| CB-78, CB-79, CB-86 | `usarNegocio.test.ts` · `TelaNegocio.test.tsx` |
| CB-80 | `negocio.test.ts` · `TelaNegocio.test.tsx` |
| CB-81, CB-82, CB-84 | `negocio.test.ts` |
| CB-83 | `ListaDeContas.test.tsx` |
| CB-85 | `negocio.test.ts` · `negocioTextos.test.ts` |
| D-58, D-59 | `sqlPainel.test.ts` · `negocio.test.ts` |
