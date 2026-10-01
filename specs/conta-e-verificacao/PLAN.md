# Conta obrigatória e verificação · Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa por tarefa. Os passos usam caixa (`- [ ]`) para acompanhar.

**Objetivo:** ninguém usa o MetaNutri sem conta, a situação de cada conta (estudante ou nutricionista) vem do cadastro e é comprovada, e você aprova estudantes e confere CRN numa tela só sua.

**Arquitetura:** o banco ganha o arquivo `supabase/006-verificacao.sql`: perfil com a situação e o CRN, pedidos de estudante, um balde privado para os comprovantes e administradores. O navegador só lê as próprias linhas, e toda escrita passa por funções `security definer` que conferem quem pede. No app, três ganchos novos (`usePerfilConta`, `usePedidoEstudante`, `useAprovacoes`) leem e chamam essas funções; o `App` usa os três para o portão da conta, os avisos do painel, a tela Conta e plano e a tela Aprovações. O `005-estudante.sql` (que nunca rodou) deixa de aprovar estudante sozinho.

**Stack:** React 18 + TypeScript strict + Vite + Tailwind v4 + shadcn/ui · Vitest + Testing Library · Playwright · Supabase JS v2 (banco, Auth e Storage).

**Spec:** `specs/conta-e-verificacao/SPEC.md` (aprovada em 30/09/2026). Telas aprovadas no protótipo "Verificação de conta" (`https://claude.ai/code/artifact/7cf6e45b-f62b-4d2a-90d3-2cbeb75f4761`). Este plano substitui as Tarefas 16, 18, 21, 24, 25 e 26 do `specs/estilo-spora/PLAN.md`, que ficam como referência.

## Restrições globais

- Nenhuma dependência nova.
- Import do design system pelo alias `@ds/...`; do domínio, `@/domain/...`.
- Componentes funcionais, um por arquivo, export nomeado. `exactOptionalPropertyTypes` está ligado: prop opcional é `readonly x?: T | undefined`.
- Lint: nenhuma cor hexadecimal nem `font-family` em `.ts`/`.tsx` fora dos testes. Use as classes do tema (`bg-lightprimary`, `text-errortext`, `bg-surfacerow` etc.).
- Escala de raio do projeto: `rounded-md` = 12 px (campo), `rounded-lg` = 16 px (linha e cartão de opção), `rounded-xl` = 20 px (aviso), `rounded-3xl` = 24 px (cartão), `rounded-2xl` = 28 px (moldura).
- Toque mínimo de 44 px: botão de texto usa `inline-flex min-h-11 items-center`; botão de ícone usa `size-11 sm:size-10`.
- Texto de interface em português do Brasil, simples, sem a construção "de X a Y" como slogan. Texto neutro em gênero ("Declaro ter matrícula ativa", nunca "matriculada").
- Laranja nunca carrega texto nem entra em painel de dado.
- Nunca pedir nem escrever chave do Supabase ou do Mercado Pago no código ou no chat. `RESPONSAVEL` e `CONTATO_EMAIL` ficam `null` até o usuário mandar; ninguém inventa esses valores.
- Toda tarefa termina com `npm run check` verde (lint, typecheck e testes). Tarefa que mexe em tela roda também `npx playwright test`.
- Commit em Conventional Commits, em português, com a mensagem num arquivo UTF-8 terminado pela linha `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Comando: `git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt`.
- Erro que vem do banco: as funções explicam em português com `raise exception ... using errcode = 'P0001' | '22023' | '42501'`; o app mostra essa mensagem. Qualquer outro erro vira "Não deu para falar com o servidor. Confira a internet e tente de novo."

## Foco de revisão

1. **Situação forjada pelo navegador.** Uma conta que chama `update` ou `insert` direto em `perfis`, `pedidos_estudante` ou `assinaturas`, ou chama uma função de administrador, recebe recusa. Teste estático na Tarefa 1 e a conferência manual no SQL Editor (Tarefa 13).
2. **Comprovante enviado, pedido recusado pelo banco** (sem internet no meio, e-mail não confirmado). O arquivo enviado é apagado, a tela mostra o motivo e deixa tentar de novo. Teste na Tarefa 6.
3. **Clique duplo em "Enviar para análise", "Aprovar", "Recusar" e "Mudar para nutricionista".** Uma chamada só. Testes nas Tarefas 6, 8 e 9.
4. **Pedido já decidido em outra aba (CB-61).** A segunda decisão mostra "Este pedido já foi decidido." e a lista recarrega. Teste na Tarefa 9.
5. **Mês da formatura e fuso.** "2027-07" vira "julho de 2027" e a validade aparece como "31 de julho de 2027", sem cair para junho ou agosto por causa do UTC. Testes na Tarefa 2.

---

## Ordem e dependências

| # | Tarefa | Depende de |
|---|---|---|
| 1 | Banco: 006 e o 005 sem aprovação automática | — |
| 2 | Domínio: situação, CRN e pedido do estudante | — |
| 3 | Cadastro com situação e o perfil vindo do servidor | 2 |
| 4 | Peças: `CampoCrn` e `CamposSituacao` | 2 |
| 5 | Constantes legais, Criar conta e Completar cadastro | 3, 4 |
| 6 | Comprovar matrícula | 2, 3 |
| 7 | Avisos no painel e exportação bloqueada | 2, 4 |
| 8 | Conta e plano com a situação e o Me formei | 3, 4 |
| 9 | Aprovações | 2, 3 |
| 10 | Preços com o botão certo | 5 |
| 11 | Termos e Política | 5 |
| 12 | Rotas e montagem no App | 1 a 11 |
| 13 | e2e, documentação e trava de publicação | 12 |

## Mapa de arquivos

**Criar**
- `supabase/006-verificacao.sql`, `src/data/sqlVerificacao.test.ts`
- `src/domain/situacao.ts` (+ teste), `src/domain/pedidoEstudante.ts` (+ teste), `src/domain/aprovacoes.ts` (+ teste), `src/domain/legal.ts`
- `src/ui/estado/mensagemDoBanco.ts`, `usarPerfilConta.ts` (+ teste), `usarPedidoEstudante.ts` (+ teste), `usarAprovacoes.ts` (+ teste)
- `src/ui/publico/conta/CampoCrn.tsx`, `CamposSituacao.tsx`, `pecasSituacao.test.tsx`, `TelaCriarConta.tsx` (+ teste), `TelaCompletarCadastro.tsx` (+ teste), `TelaComprovarMatricula.tsx` (+ teste), `TelaOutraConta.tsx`
- `src/ui/painel/AvisoEstudante.tsx`, `AvisoCrn.tsx`, `avisos.test.tsx`
- `src/ui/conta/CartaoSituacao.tsx`, `DialogoMeFormei.tsx`, `TelaConta.test.tsx`
- `src/ui/aprovacoes/TelaAprovacoes.tsx`, `AbaEstudantes.tsx`, `AbaCrn.tsx`, `TelaAprovacoes.test.tsx`
- `src/ui/publico/DocumentoLegal.tsx`, `TelaTermos.tsx`, `TelaPrivacidade.tsx`, `legal.test.tsx`, `SecaoPrecos.test.tsx`
- `src/ui/Redirecionar.tsx`, `src/AppConta.test.tsx`, `e2e/conta.spec.ts`, `scripts/conferir-publicacao.mjs`

**Alterar**
- `scripts/dominios-faculdades.mjs` e `supabase/005-estudante.sql` (gerado)
- `src/ui/estado/usarConta.ts` (+ teste), `src/ui/fluxoConta.ts` (+ teste), `src/ui/navegacao.ts` (+ teste)
- `src/ui/painel/TelaPainel.tsx`, `src/ui/exportar/MenuExportar.tsx`, `src/ui/conta/TelaConta.tsx`
- `src/ui/layout/Estrutura.tsx`, `src/ui/layout/MenuLateral.tsx`, `src/ui/missoes/CartaoLinkMissoes.tsx`, `src/ui/missoes/TelaAdesao.tsx`
- `src/ui/publico/SecaoPrecos.tsx`, `src/App.tsx`, `src/App.test.tsx`
- `.github/workflows/publicar.yml`, `README.md`, `docs/decisoes.md`, `docs/pendencias.md`

---

### Tarefa 1: Banco: 006 e o 005 sem aprovação automática

Cobre D-40, D-41, D-43, D-45, CA-269, CA-294, CA-297 a CA-300, CB-61, CB-63, CB-64 e CB-68 do lado do servidor.

**Arquivos:**
- Criar: `supabase/006-verificacao.sql`
- Criar: `src/data/sqlVerificacao.test.ts`
- Alterar: `scripts/dominios-faculdades.mjs` (o texto do 005 gerado)
- Regerar: `supabase/005-estudante.sql`

**Interfaces:**
- Produz, no banco (nomes exatos que as Tarefas 3, 6 e 9 chamam):
  - tabelas `perfis(id, nome, situacao, crn_regiao, crn_numero, crn_status, crn_declarado_em, crn_decidido_em, criado_em)`, `pedidos_estudante(id, usuario, instituicao, matricula, periodo, formatura, arquivo, status, motivo, enviado_em, decidido_em, aviso_fechado)`, `administradores(usuario)`
  - balde de Storage `comprovantes`, caminho `<id do usuário>/<arquivo>`
  - funções: `eh_admin()`, `informar_situacao(p_situacao, p_regiao, p_numero)`, `me_formei(p_regiao, p_numero)`, `corrigir_crn(p_regiao, p_numero)`, `enviar_pedido_estudante(p_instituicao, p_matricula, p_periodo, p_formatura, p_arquivo)`, `fechar_aviso_estudante(p_pedido)`, `pedidos_em_analise()`, `decidir_pedido(p_pedido, p_aprovar, p_motivo)`, `crn_para_conferir()`, `decidir_crn(p_usuario, p_status)`, `comprovantes_para_apagar()`, `marcar_comprovantes_apagados(p_caminhos)`
  - metadados do cadastro lidos pelo gatilho: `nome`, `situacao`, `crn_regiao`, `crn_numero`

- [ ] **Passo 1: escrever o teste que falha**

`src/data/sqlVerificacao.test.ts` (o `?raw` do Vite lê o arquivo como texto, sem precisar dos tipos do Node):

```ts
import sql005 from '../../supabase/005-estudante.sql?raw'
import sql from '../../supabase/006-verificacao.sql?raw'

const corpoDa = (nome: string) => sql.split(`create or replace function public.${nome}(`)[1]?.split('$$;')[0] ?? ''

describe('SQL da verificação (spec conta-e-verificacao)', () => {
  it('CA-269 e CA-297: perfil e pedido só têm política de leitura', () => {
    const politicas = [...sql.matchAll(/create policy "[^"]+" on public\.(perfis|pedidos_estudante)\s+for (\w+)/g)].map((m) => `${m[1]}:${m[2]}`)
    expect(politicas).toEqual(['perfis:select', 'pedidos_estudante:select'])
  })

  it('CA-297: toda função de administrador confere eh_admin antes de tudo', () => {
    for (const nome of ['pedidos_em_analise', 'decidir_pedido', 'crn_para_conferir', 'decidir_crn', 'comprovantes_para_apagar', 'marcar_comprovantes_apagados']) {
      expect(corpoDa(nome), nome).toMatch(/begin\s+if not public\.eh_admin\(\) then raise exception/)
    }
  })

  it('CA-297: as funções de quem usa exigem sessão', () => {
    for (const nome of ['informar_situacao', 'me_formei', 'corrigir_crn', 'enviar_pedido_estudante']) {
      expect(corpoDa(nome), nome).toMatch(/if auth\.uid\(\) is null then raise exception/)
    }
  })

  it('CA-298: o balde dos comprovantes é privado, com 5 MB e só PDF, JPG e PNG', () => {
    expect(sql).toContain("('comprovantes', 'comprovantes', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])")
  })

  it('CB-63: aprovar não passa por cima de assinatura paga', () => {
    expect(corpoDa('decidir_pedido')).toContain('where public.assinaturas.preapproval_id is null')
  })

  it('D-42: a validade é 12 meses ou o fim do mês da formatura, o que vier antes', () => {
    expect(corpoDa('decidir_pedido')).toContain("least(now() + interval '12 months', (v_formatura + interval '1 month')::timestamptz - interval '1 second')")
  })

  it('D-41: o 005 não aprova estudante sozinho', () => {
    expect(sql005).not.toMatch(/create trigger/i)
    expect(sql005).toContain('drop trigger if exists aprovar_estudante_ao_confirmar on auth.users;')
    expect(sql005).toContain('drop function if exists public.aprovar_estudante();')
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/data/sqlVerificacao.test.ts`
Esperado: FAIL (o 006 não existe).

- [ ] **Passo 3: o 005 sem aprovação automática**

Em `scripts/dominios-faculdades.mjs`, dentro do texto escrito em `supabase/005-estudante.sql`:

1. Troque as três primeiras linhas de comentário e o bloco "Como funciona" (até a linha antes de `alter table public.assinaturas`) por:

```
-- MetaNutri — lista de domínios de faculdade (spec conta-e-verificacao, D-41).
-- GERADO por scripts/dominios-faculdades.mjs: não edite à mão, rode o script de novo.
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Pode rodar de novo sem estragar nada.
-- Rode ANTES do 006-verificacao.sql, que usa a função eh_email_de_faculdade.
--
-- Até 30/09/2026 este arquivo dava o plano Estudante sozinho quando o e-mail era
-- confirmado. Agora quem aprova é o administrador, olhando o comprovante: por isso
-- o gatilho antigo é apagado aqui, caso alguém tenha rodado a versão anterior.
```

2. Troque o comentário logo antes de `revoke execute on function public.eh_email_de_faculdade` por:

```
-- O Supabase concede execução a "anon" e "authenticated" por padrão; tira dos
-- dois. Quem chama esta função é a enviar_pedido_estudante (006), como "security definer".
```

3. Apague a função `aprovar_estudante` inteira e o bloco `drop trigger ... create trigger ...` e ponha no lugar:

```
drop trigger if exists aprovar_estudante_ao_confirmar on auth.users;
drop function if exists public.aprovar_estudante();
```

Depois rode: `node scripts/dominios-faculdades.mjs`
Esperado: o script termina sem erro e `git diff --stat supabase/005-estudante.sql` mostra o arquivo mudado. A lista de domínios não muda.

- [ ] **Passo 4: `supabase/006-verificacao.sql`**

```sql
-- MetaNutri — situação da conta, pedidos de estudante, comprovantes e administradores
-- (spec conta-e-verificacao). Rode DEPOIS do 005-estudante.sql, que cria a função
-- eh_email_de_faculdade usada aqui.
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Pode rodar de novo sem estragar nada.
--
-- A regra que atravessa o arquivo: o navegador só LÊ as próprias linhas. Toda escrita
-- passa por uma função "security definer" que confere quem pede e o que pede. Sem
-- isso, qualquer conta se diria nutricionista ou se aprovaria como estudante editando
-- uma requisição (spec, D-40 e CA-297).

-- O app já lê esta coluna (validade do plano Estudante); era o 005 antigo que a criava.
alter table public.assinaturas add column if not exists expira_em timestamptz;

-- ---------- Administradores ----------

create table if not exists public.administradores (
  usuario uuid primary key references auth.users (id) on delete cascade
);
-- Ninguém lê nem escreve pelo navegador: o administrador é cadastrado à mão (linha no fim).
alter table public.administradores enable row level security;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.administradores where usuario = auth.uid());
$$;

-- ---------- Perfil: situação e CRN ----------

create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  situacao text not null check (situacao in ('estudante', 'nutricionista')),
  crn_regiao smallint check (crn_regiao between 1 and 11),
  crn_numero text check (crn_numero ~ '^[0-9]{1,7}P?$'),
  crn_status text check (crn_status in ('em_conferencia', 'conferido', 'nao_encontrado')),
  crn_declarado_em timestamptz,
  crn_decidido_em timestamptz,
  criado_em timestamptz not null default now(),
  -- Nutricionista sempre tem CRN; estudante nunca tem.
  constraint perfis_crn_conforme_situacao check (
    (situacao = 'nutricionista' and crn_regiao is not null and crn_numero is not null and crn_status is not null and crn_declarado_em is not null)
    or (situacao = 'estudante' and crn_regiao is null and crn_numero is null and crn_status is null)
  )
);
alter table public.perfis enable row level security;

drop policy if exists "dono ou admin le o perfil" on public.perfis;
create policy "dono ou admin le o perfil" on public.perfis
  for select to authenticated using (auth.uid() = id or public.eh_admin());
-- Sem política de escrita, de propósito: só as funções abaixo escrevem.

create or replace function public.crn_valido(p_regiao integer, p_numero text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_regiao between 1 and 11, false) and coalesce(upper(trim(p_numero)), '') ~ '^[0-9]{1,7}P?$';
$$;

-- O cadastro grava a situação nos metadados; o gatilho cria o perfil no servidor.
-- Metadado inválido não derruba o cadastro: a conta fica sem perfil e o app pede
-- para completar (CB-68). É o caso da conta criada pelo painel do Supabase.
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_situacao text := m ->> 'situacao';
  v_nome text := left(coalesce(trim(m ->> 'nome'), ''), 120);
  v_regiao integer;
begin
  if v_situacao = 'estudante' then
    insert into public.perfis (id, nome, situacao) values (new.id, v_nome, 'estudante') on conflict (id) do nothing;
  elsif v_situacao = 'nutricionista' then
    begin
      v_regiao := (m ->> 'crn_regiao')::integer;
    exception when others then
      v_regiao := null;
    end;
    if public.crn_valido(v_regiao, m ->> 'crn_numero') then
      insert into public.perfis (id, nome, situacao, crn_regiao, crn_numero, crn_status, crn_declarado_em)
      values (new.id, v_nome, 'nutricionista', v_regiao, upper(trim(m ->> 'crn_numero')), 'em_conferencia', now())
      on conflict (id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists criar_perfil_ao_cadastrar on auth.users;
create trigger criar_perfil_ao_cadastrar
  after insert on auth.users
  for each row execute function public.criar_perfil();

-- CB-68: conta sem perfil informa a situação uma vez. Depois disso, só "Me formei".
create or replace function public.informar_situacao(p_situacao text, p_regiao integer, p_numero text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  if exists (select 1 from public.perfis where id = auth.uid()) then
    raise exception 'Sua situação já está registrada. Para mudar, use "Me formei" ou fale com a gente.' using errcode = 'P0001';
  end if;
  select left(coalesce(trim(raw_user_meta_data ->> 'nome'), ''), 120) into v_nome from auth.users where id = auth.uid();
  if p_situacao = 'estudante' then
    insert into public.perfis (id, nome, situacao) values (auth.uid(), coalesce(v_nome, ''), 'estudante');
  elsif p_situacao = 'nutricionista' and public.crn_valido(p_regiao, p_numero) then
    insert into public.perfis (id, nome, situacao, crn_regiao, crn_numero, crn_status, crn_declarado_em)
    values (auth.uid(), coalesce(v_nome, ''), 'nutricionista', p_regiao, upper(trim(p_numero)), 'em_conferencia', now());
  else
    raise exception 'Confira a situação e o CRN.' using errcode = '22023';
  end if;
end;
$$;

-- CA-287: estudante vira nutricionista com o CRN em conferência, e o plano Estudante acaba.
create or replace function public.me_formei(p_regiao integer, p_numero text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  if not public.crn_valido(p_regiao, p_numero) then
    raise exception 'Confira o CRN: região de 1 a 11 e número só com algarismos.' using errcode = '22023';
  end if;
  update public.perfis
     set situacao = 'nutricionista', crn_regiao = p_regiao, crn_numero = upper(trim(p_numero)),
         crn_status = 'em_conferencia', crn_declarado_em = now(), crn_decidido_em = null
   where id = auth.uid() and situacao = 'estudante';
  if not found then raise exception 'Só conta de estudante pode informar a formatura.' using errcode = 'P0001'; end if;
  -- Assinatura paga (com preapproval) continua (CB-64).
  delete from public.assinaturas where nutricionista_id = auth.uid() and plano = 'estudante' and preapproval_id is null;
end;
$$;

-- CA-289: CRN corrigido volta para "em conferência".
create or replace function public.corrigir_crn(p_regiao integer, p_numero text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  if not public.crn_valido(p_regiao, p_numero) then
    raise exception 'Confira o CRN: região de 1 a 11 e número só com algarismos.' using errcode = '22023';
  end if;
  update public.perfis
     set crn_regiao = p_regiao, crn_numero = upper(trim(p_numero)), crn_status = 'em_conferencia',
         crn_declarado_em = now(), crn_decidido_em = null
   where id = auth.uid() and situacao = 'nutricionista';
  if not found then raise exception 'Só conta de nutricionista tem CRN para corrigir.' using errcode = 'P0001'; end if;
end;
$$;

-- ---------- Pedidos de estudante ----------

create table if not exists public.pedidos_estudante (
  id uuid primary key default gen_random_uuid(),
  usuario uuid not null references auth.users (id) on delete cascade,
  instituicao text not null check (char_length(instituicao) between 2 and 160),
  matricula text not null check (char_length(matricula) between 3 and 40),
  periodo smallint not null check (periodo between 1 and 12),
  -- Sempre o dia 1: a previsão é de mês e ano.
  formatura date not null check (extract(day from formatura) = 1),
  -- Caminho no balde "comprovantes". Fica nulo quando o arquivo é apagado (D-43).
  arquivo text,
  status text not null default 'em_analise' check (status in ('em_analise', 'aprovado', 'recusado')),
  motivo text check (motivo is null or char_length(motivo) <= 200),
  enviado_em timestamptz not null default now(),
  decidido_em timestamptz,
  aviso_fechado boolean not null default false
);
-- CA-275: um pedido em análise por vez.
create unique index if not exists pedidos_estudante_um_em_analise on public.pedidos_estudante (usuario) where status = 'em_analise';
create index if not exists pedidos_estudante_por_usuario on public.pedidos_estudante (usuario, enviado_em desc);
alter table public.pedidos_estudante enable row level security;

drop policy if exists "dono ou admin le o pedido" on public.pedidos_estudante;
create policy "dono ou admin le o pedido" on public.pedidos_estudante
  for select to authenticated using (auth.uid() = usuario or public.eh_admin());

-- ---------- Comprovantes (Storage) ----------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 5242880, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "estudante envia o proprio comprovante" on storage.objects;
create policy "estudante envia o proprio comprovante" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comprovantes' and (storage.foldername(name))[1] = auth.uid()::text);

-- CA-298: só a própria pessoa e o administrador abrem.
drop policy if exists "dono ou admin le o comprovante" on storage.objects;
create policy "dono ou admin le o comprovante" on storage.objects
  for select to authenticated
  using (bucket_id = 'comprovantes' and ((storage.foldername(name))[1] = auth.uid()::text or public.eh_admin()));

-- O dono apaga o envio que o banco recusou; o administrador apaga os vencidos.
drop policy if exists "dono ou admin apaga o comprovante" on storage.objects;
create policy "dono ou admin apaga o comprovante" on storage.objects
  for delete to authenticated
  using (bucket_id = 'comprovantes' and ((storage.foldername(name))[1] = auth.uid()::text or public.eh_admin()));

-- CA-273: o pedido só nasce se o comprovante já está no balde, na pasta da pessoa.
create or replace function public.enviar_pedido_estudante(p_instituicao text, p_matricula text, p_periodo integer, p_formatura date, p_arquivo text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_email text;
  v_confirmado timestamptz;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  if not exists (select 1 from public.perfis where id = auth.uid() and situacao = 'estudante') then
    raise exception 'Só conta de estudante envia comprovante de matrícula.' using errcode = '42501';
  end if;
  select email, email_confirmed_at into v_email, v_confirmado from auth.users where id = auth.uid();
  if v_confirmado is null or not public.eh_email_de_faculdade(v_email) then
    raise exception 'Confirme o e-mail da faculdade antes de enviar o comprovante.' using errcode = '42501';
  end if;
  if p_arquivo is null or split_part(p_arquivo, '/', 1) <> auth.uid()::text
     or not exists (select 1 from storage.objects where bucket_id = 'comprovantes' and name = p_arquivo) then
    raise exception 'O comprovante não chegou. Escolha o arquivo e envie de novo.' using errcode = '22023';
  end if;
  if p_formatura is null or date_trunc('month', p_formatura) < date_trunc('month', now()) then
    raise exception 'A previsão de formatura precisa ser deste mês em diante.' using errcode = '22023';
  end if;
  insert into public.pedidos_estudante (usuario, instituicao, matricula, periodo, formatura, arquivo)
  values (auth.uid(), trim(p_instituicao), trim(p_matricula), p_periodo, date_trunc('month', p_formatura)::date, p_arquivo)
  returning id into v_id;
  return v_id;
exception
  when unique_violation then
    raise exception 'Você já tem um comprovante em análise.' using errcode = 'P0001';
  when check_violation then
    raise exception 'Confira os dados: instituição, matrícula, período e previsão de formatura.' using errcode = '22023';
end;
$$;

-- CA-280: o aviso de aprovado fecha e não volta.
create or replace function public.fechar_aviso_estudante(p_pedido uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.pedidos_estudante set aviso_fechado = true
   where id = p_pedido and usuario = auth.uid() and status = 'aprovado';
end;
$$;

-- ---------- Funções do administrador ----------

-- CA-293: fila do mais antigo para o mais novo, com o e-mail (que só o servidor lê).
create or replace function public.pedidos_em_analise()
returns table (id uuid, usuario uuid, nome text, email text, instituicao text, matricula text, periodo smallint, formatura date, enviado_em timestamptz, arquivo text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then raise exception 'Só o administrador vê esta lista.' using errcode = '42501'; end if;
  return query
    select p.id, p.usuario, coalesce(f.nome, ''), u.email::text, p.instituicao, p.matricula, p.periodo, p.formatura, p.enviado_em, p.arquivo
      from public.pedidos_estudante p
      join auth.users u on u.id = p.usuario
      left join public.perfis f on f.id = p.usuario
     where p.status = 'em_analise'
     order by p.enviado_em asc;
end;
$$;

-- CA-294, CA-295, CB-61 e CB-63.
create or replace function public.decidir_pedido(p_pedido uuid, p_aprovar boolean, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario uuid;
  v_formatura date;
  v_expira timestamptz;
begin
  if not public.eh_admin() then raise exception 'Só o administrador decide pedidos.' using errcode = '42501'; end if;
  if not p_aprovar and coalesce(trim(p_motivo), '') = '' then
    raise exception 'Escolha o motivo da recusa.' using errcode = '22023';
  end if;
  update public.pedidos_estudante
     set status = case when p_aprovar then 'aprovado' else 'recusado' end,
         motivo = case when p_aprovar then null else left(trim(p_motivo), 200) end,
         decidido_em = now()
   where id = p_pedido and status = 'em_analise'
   returning usuario, formatura into v_usuario, v_formatura;
  if v_usuario is null then raise exception 'Este pedido já foi decidido.' using errcode = 'P0001'; end if;
  if p_aprovar then
    -- D-42: 12 meses ou o fim do mês da formatura, o que vier antes.
    v_expira := least(now() + interval '12 months', (v_formatura + interval '1 month')::timestamptz - interval '1 second');
    insert into public.assinaturas (nutricionista_id, plano, status, expira_em, atualizado_em)
    values (v_usuario, 'estudante', 'ativa', v_expira, now())
    on conflict (nutricionista_id) do update
      set plano = 'estudante', status = 'ativa', expira_em = excluded.expira_em, atualizado_em = now()
      where public.assinaturas.preapproval_id is null;
  end if;
end;
$$;

-- CA-296: em conferência primeiro; decididos nos últimos 30 dias depois.
create or replace function public.crn_para_conferir()
returns table (usuario uuid, nome text, email text, crn_regiao smallint, crn_numero text, conta_criada_em timestamptz, crn_status text, crn_decidido_em timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then raise exception 'Só o administrador vê esta lista.' using errcode = '42501'; end if;
  return query
    select f.id, f.nome, u.email::text, f.crn_regiao, f.crn_numero, u.created_at, f.crn_status, f.crn_decidido_em
      from public.perfis f
      join auth.users u on u.id = f.id
     where f.situacao = 'nutricionista'
       and (f.crn_status = 'em_conferencia' or f.crn_decidido_em > now() - interval '30 days')
     order by (f.crn_status <> 'em_conferencia'), u.created_at asc;
end;
$$;

create or replace function public.decidir_crn(p_usuario uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then raise exception 'Só o administrador confere CRN.' using errcode = '42501'; end if;
  if p_status not in ('em_conferencia', 'conferido', 'nao_encontrado') then
    raise exception 'Situação de CRN desconhecida.' using errcode = '22023';
  end if;
  update public.perfis
     set crn_status = p_status, crn_decidido_em = case when p_status = 'em_conferencia' then null else now() end
   where id = p_usuario and situacao = 'nutricionista';
  if not found then raise exception 'Esta conta não é de nutricionista.' using errcode = 'P0001'; end if;
end;
$$;

-- CA-299 e CA-300: decididos há mais de 30 dias, de conta apagada ou de envio que o
-- banco recusou. O administrador apaga do balde e marca aqui (Tarefa 9).
create or replace function public.comprovantes_para_apagar()
returns table (caminho text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then raise exception 'Só o administrador apaga comprovantes.' using errcode = '42501'; end if;
  return query
    select p.arquivo from public.pedidos_estudante p
     where p.arquivo is not null and p.decidido_em < now() - interval '30 days'
    union
    select o.name from storage.objects o
     where o.bucket_id = 'comprovantes'
       and o.created_at < now() - interval '1 day'
       and not exists (select 1 from public.pedidos_estudante p where p.arquivo = o.name);
end;
$$;

create or replace function public.marcar_comprovantes_apagados(p_caminhos text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.eh_admin() then raise exception 'Só o administrador apaga comprovantes.' using errcode = '42501'; end if;
  update public.pedidos_estudante set arquivo = null where arquivo = any (p_caminhos);
end;
$$;

-- Para se marcar como administrador, troque o e-mail e rode SÓ esta linha, sem o "--":
-- insert into public.administradores (usuario) select id from auth.users where email = 'seu-email@exemplo.com' on conflict do nothing;

-- Conferência depois de rodar (copie para uma consulta nova):
-- select count(*) as perfis from public.perfis;                                    -- 0 ou mais, sem erro
-- select public.crn_valido(6, '12345') as ok, public.crn_valido(12, '1') as regiao_ruim, public.crn_valido(6, '12a45') as numero_ruim; -- true, false, false
```

- [ ] **Passo 5: rodar e ver passar**

Rode: `npx vitest run src/data/sqlVerificacao.test.ts`
Esperado: PASS. Se o TypeScript reclamar de `?raw` no `npm run typecheck`, confira que `vite/client` está em `types` no `tsconfig.app.json` (está, hoje).

- [ ] **Passo 6: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add supabase/006-verificacao.sql supabase/005-estudante.sql scripts/dominios-faculdades.mjs src/data/sqlVerificacao.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(banco): situação da conta, pedidos de estudante e comprovantes`.

---

### Tarefa 2: Domínio: situação, CRN e pedido do estudante

Cobre as regras puras de CA-263, CA-264, CA-266, CA-268, CA-271, CA-272, CA-279, CA-285, CA-289 e CA-290, e o item 5 do foco de revisão.

**Arquivos:**
- Criar: `src/domain/situacao.ts`, `src/domain/situacao.test.ts`
- Criar: `src/domain/pedidoEstudante.ts`, `src/domain/pedidoEstudante.test.ts`

**Interfaces:**
- Consome: `ehEmailDeFaculdade` (`src/domain/estudante.ts`), `Assinatura` (`src/domain/assinatura.ts`).
- Produz (`situacao.ts`):
  - `type Situacao = 'estudante' | 'nutricionista'`, `ehSituacao(v): v is Situacao`
  - `interface Crn { regiao: number; numero: string }`, `type StatusCrn = 'em_conferencia' | 'conferido' | 'nao_encontrado'`
  - `REGIOES_CRN: readonly number[]` (1 a 11), `normalizarNumeroCrn(numero): string`, `formatarCrn(crn): string` ("CRN-6 12345")
  - `interface DadosSituacao { situacao: Situacao | null; regiao: number | null; numero: string; declarouCrn: boolean; declarouMatricula: boolean }`, `SITUACAO_VAZIA: DadosSituacao`
  - `type ErroSituacao = 'situacao-vazia' | 'crn-regiao' | 'crn-numero' | 'declaracao-crn' | 'declaracao-matricula' | 'email-faculdade'`, `MENSAGEM_ERRO_SITUACAO: Record<ErroSituacao, string>`
  - `validarCrn(regiao, numero): 'crn-regiao' | 'crn-numero' | null`, `validarSituacao(dados, email): ErroSituacao | null`, `crnDe(dados): Crn | null`
  - `interface PerfilConta { nome; situacao; crn: Crn | null; statusCrn: StatusCrn | null; crnDeclaradoEm: string | null; crnDecididoEm: string | null }`, `daLinhaPerfil(linha: unknown): PerfilConta | null`
  - `PRAZO_CORRECAO_CRN_DIAS = 7`, `diasParaCorrigir(perfil, agora): number | null`, `exportacaoBloqueada(perfil, agora): boolean`, `MOTIVO_EXPORTACAO_BLOQUEADA: string`
- Produz (`pedidoEstudante.ts`):
  - `type StatusPedido = 'em_analise' | 'aprovado' | 'recusado'`
  - `interface PedidoEstudante { id; instituicao; matricula; periodo: number; formatura: string /* AAAA-MM */; status; motivo: string | null; enviadoEm: string; decididoEm: string | null; avisoFechado: boolean }`, `daLinhaPedido(linha): PedidoEstudante | null`
  - `ARQUIVO_MAXIMO_BYTES`, `TIPOS_DE_ARQUIVO`, `ACEITA_ARQUIVO` (valor do `accept`)
  - `interface DadosPedido { instituicao; matricula; periodo: number | null; formatura: string; arquivo: { tipo: string; tamanho: number } | null }`
  - `type ErroPedido = 'instituicao' | 'matricula' | 'periodo' | 'formatura' | 'arquivo-vazio' | 'arquivo-tipo' | 'arquivo-grande'`, `MENSAGEM_ERRO_PEDIDO`, `validarPedido(dados, hoje): ErroPedido | null`
  - `MOTIVOS_RECUSA: readonly string[]`
  - `type AvisoEstudante = { tipo: 'enviar' } | { tipo: 'renovar' } | { tipo: 'analise' } | { tipo: 'recusado'; motivo: string } | { tipo: 'aprovado'; pedidoId: string; expiraEm: string } | null`, `avisoDoEstudante(pedido, assinatura): AvisoEstudante`
  - `mesAtual(hoje): string`, `formatarMesAno('2027-07'): string` ("julho de 2027"), `formatarDataLonga(iso): string` ("31 de julho de 2027", no fuso de São Paulo), `caminhoDoComprovante(usuarioId, nomeDoArquivo, agora): string`

- [ ] **Passo 1: escrever os testes que falham**

`src/domain/situacao.test.ts`:

```ts
import {
  crnDe,
  daLinhaPerfil,
  diasParaCorrigir,
  exportacaoBloqueada,
  formatarCrn,
  SITUACAO_VAZIA,
  validarCrn,
  validarSituacao,
  type PerfilConta,
} from './situacao.ts'

const nutri: PerfilConta = {
  nome: 'Ana',
  situacao: 'nutricionista',
  crn: { regiao: 6, numero: '12345' },
  statusCrn: 'nao_encontrado',
  crnDeclaradoEm: '2026-09-30T12:00:00Z',
  crnDecididoEm: '2026-10-01T12:00:00Z',
}

describe('CRN', () => {
  it('CA-264: região de 1 a 11 e número só com algarismos, com P final opcional', () => {
    expect(validarCrn(6, '12345')).toBeNull()
    expect(validarCrn(6, ' 9876p ')).toBeNull()
    expect(validarCrn(null, '12345')).toBe('crn-regiao')
    expect(validarCrn(12, '12345')).toBe('crn-regiao')
    expect(validarCrn(6, '')).toBe('crn-numero')
    expect(validarCrn(6, '12a45')).toBe('crn-numero')
    expect(validarCrn(6, '12345678')).toBe('crn-numero')
  })

  it('formata como o conselho escreve', () => {
    expect(formatarCrn({ regiao: 6, numero: '9876P' })).toBe('CRN-6 9876P')
  })
})

describe('validarSituacao', () => {
  const base = { ...SITUACAO_VAZIA }

  it('CA-268: sem escolher, não segue', () => {
    expect(validarSituacao(base, 'a@b.com')).toBe('situacao-vazia')
  })

  it('CA-263: nutricionista precisa de CRN válido e da declaração', () => {
    expect(validarSituacao({ ...base, situacao: 'nutricionista', regiao: 6, numero: '1' }, 'a@b.com')).toBe('declaracao-crn')
    expect(validarSituacao({ ...base, situacao: 'nutricionista', regiao: null, numero: '1', declarouCrn: true }, 'a@b.com')).toBe('crn-regiao')
    expect(validarSituacao({ ...base, situacao: 'nutricionista', regiao: 6, numero: '1', declarouCrn: true }, 'a@b.com')).toBeNull()
  })

  it('CA-265 e CA-266: estudante precisa do e-mail da faculdade e da declaração', () => {
    expect(validarSituacao({ ...base, situacao: 'estudante', declarouMatricula: true }, 'maria@gmail.com')).toBe('email-faculdade')
    expect(validarSituacao({ ...base, situacao: 'estudante' }, 'maria@ufrn.edu.br')).toBe('declaracao-matricula')
    expect(validarSituacao({ ...base, situacao: 'estudante', declarouMatricula: true }, ' Maria@UFRN.edu.br ')).toBeNull()
  })

  it('crnDe devolve o CRN normalizado só para nutricionista', () => {
    expect(crnDe({ ...base, situacao: 'nutricionista', regiao: 6, numero: ' 9876p ', declarouCrn: true })).toEqual({ regiao: 6, numero: '9876P' })
    expect(crnDe({ ...base, situacao: 'estudante', regiao: 6, numero: '1' })).toBeNull()
  })
})

describe('daLinhaPerfil', () => {
  it('lê a linha do banco e recusa o que não reconhece', () => {
    expect(
      daLinhaPerfil({
        nome: 'Ana',
        situacao: 'nutricionista',
        crn_regiao: 6,
        crn_numero: '12345',
        crn_status: 'em_conferencia',
        crn_declarado_em: '2026-09-30T12:00:00Z',
        crn_decidido_em: null,
      }),
    ).toEqual({ ...nutri, statusCrn: 'em_conferencia', crnDecididoEm: null })
    expect(daLinhaPerfil({ nome: 'Júlia', situacao: 'estudante' })).toEqual({
      nome: 'Júlia',
      situacao: 'estudante',
      crn: null,
      statusCrn: null,
      crnDeclaradoEm: null,
      crnDecididoEm: null,
    })
    expect(daLinhaPerfil(null)).toBeNull()
    expect(daLinhaPerfil({ situacao: 'admin' })).toBeNull()
  })
})

describe('prazo do CRN não encontrado (CA-289 e CA-290)', () => {
  it('conta os dias que faltam e bloqueia depois de 7', () => {
    expect(diasParaCorrigir(nutri, new Date('2026-10-03T12:00:00Z'))).toBe(5)
    expect(exportacaoBloqueada(nutri, new Date('2026-10-03T12:00:00Z'))).toBe(false)
    expect(diasParaCorrigir(nutri, new Date('2026-10-09T12:00:00Z'))).toBe(0)
    expect(exportacaoBloqueada(nutri, new Date('2026-10-09T12:00:00Z'))).toBe(true)
  })

  it('não bloqueia quem está em conferência, conferido ou é estudante', () => {
    const agora = new Date('2027-01-01T00:00:00Z')
    expect(exportacaoBloqueada({ ...nutri, statusCrn: 'em_conferencia', crnDecididoEm: null }, agora)).toBe(false)
    expect(exportacaoBloqueada({ ...nutri, statusCrn: 'conferido' }, agora)).toBe(false)
    expect(exportacaoBloqueada(null, agora)).toBe(false)
    expect(diasParaCorrigir({ ...nutri, statusCrn: 'conferido' }, agora)).toBeNull()
  })
})
```

`src/domain/pedidoEstudante.test.ts`:

```ts
import { SEM_ASSINATURA, type Assinatura } from './assinatura.ts'
import {
  ARQUIVO_MAXIMO_BYTES,
  avisoDoEstudante,
  caminhoDoComprovante,
  daLinhaPedido,
  formatarDataLonga,
  formatarMesAno,
  mesAtual,
  validarPedido,
  type PedidoEstudante,
} from './pedidoEstudante.ts'

const hoje = new Date('2026-09-30T15:00:00Z')
const valido = { instituicao: 'UFRN', matricula: '20230045871', periodo: 7, formatura: '2027-07', arquivo: { tipo: 'application/pdf', tamanho: 412_000 } }

const pedido: PedidoEstudante = {
  id: 'p1',
  instituicao: 'UFRN',
  matricula: '20230045871',
  periodo: 7,
  formatura: '2027-07',
  status: 'em_analise',
  motivo: null,
  enviadoEm: '2026-09-30T13:42:00Z',
  decididoEm: null,
  avisoFechado: false,
}

const estudanteAtiva: Assinatura = { plano: 'estudante', planoPedido: 'estudante', status: 'ativa', precoTravado: false, expiraEm: '2027-07-31T23:59:59Z' }

describe('validarPedido (CA-271 e CA-272)', () => {
  it('aceita o pedido completo', () => {
    expect(validarPedido(valido, hoje)).toBeNull()
  })

  it('pede cada campo, na ordem da tela', () => {
    expect(validarPedido({ ...valido, instituicao: ' ' }, hoje)).toBe('instituicao')
    expect(validarPedido({ ...valido, matricula: '12' }, hoje)).toBe('matricula')
    expect(validarPedido({ ...valido, periodo: null }, hoje)).toBe('periodo')
    expect(validarPedido({ ...valido, periodo: 13 }, hoje)).toBe('periodo')
    expect(validarPedido({ ...valido, formatura: '' }, hoje)).toBe('formatura')
    expect(validarPedido({ ...valido, formatura: '2026-08' }, hoje)).toBe('formatura')
    expect(validarPedido({ ...valido, formatura: '2026-09' }, hoje)).toBeNull()
    expect(validarPedido({ ...valido, arquivo: null }, hoje)).toBe('arquivo-vazio')
    expect(validarPedido({ ...valido, arquivo: { tipo: 'image/gif', tamanho: 10 } }, hoje)).toBe('arquivo-tipo')
    expect(validarPedido({ ...valido, arquivo: { tipo: 'image/png', tamanho: ARQUIVO_MAXIMO_BYTES + 1 } }, hoje)).toBe('arquivo-grande')
  })
})

describe('datas sem cair no fuso (foco de revisão 5)', () => {
  it('mês e ano por extenso, sem passar por Date', () => {
    expect(formatarMesAno('2027-07')).toBe('julho de 2027')
    expect(formatarMesAno('2027-01')).toBe('janeiro de 2027')
  })

  it('a validade aparece no dia de São Paulo', () => {
    expect(formatarDataLonga('2027-07-31T23:59:59Z')).toBe('31 de julho de 2027')
  })

  it('o mês atual sai em AAAA-MM', () => {
    expect(mesAtual(hoje)).toBe('2026-09')
  })
})

describe('caminhoDoComprovante', () => {
  it('fica na pasta da pessoa, com nome seguro', () => {
    expect(caminhoDoComprovante('u1', 'Declaração de matrícula (2).PDF', hoje)).toBe(`u1/${hoje.getTime()}-declaracao-de-matricula-2.pdf`)
  })
})

describe('daLinhaPedido', () => {
  it('lê a linha do banco', () => {
    expect(
      daLinhaPedido({
        id: 'p1',
        instituicao: 'UFRN',
        matricula: '20230045871',
        periodo: 7,
        formatura: '2027-07-01',
        status: 'em_analise',
        motivo: null,
        enviado_em: '2026-09-30T13:42:00Z',
        decidido_em: null,
        aviso_fechado: false,
      }),
    ).toEqual(pedido)
    expect(daLinhaPedido({ id: 'p1', status: 'outro' })).toBeNull()
  })
})

describe('avisoDoEstudante (CA-279 e CA-285)', () => {
  it('sem pedido, pede o comprovante', () => {
    expect(avisoDoEstudante(null, SEM_ASSINATURA)).toEqual({ tipo: 'enviar' })
  })

  it('em análise e recusado', () => {
    expect(avisoDoEstudante(pedido, SEM_ASSINATURA)).toEqual({ tipo: 'analise' })
    expect(avisoDoEstudante({ ...pedido, status: 'recusado', motivo: 'Ilegível' }, SEM_ASSINATURA)).toEqual({ tipo: 'recusado', motivo: 'Ilegível' })
  })

  it('aprovado mostra a validade até ser fechado', () => {
    const aprovado = { ...pedido, status: 'aprovado' as const }
    expect(avisoDoEstudante(aprovado, estudanteAtiva)).toEqual({ tipo: 'aprovado', pedidoId: 'p1', expiraEm: '2027-07-31T23:59:59Z' })
    expect(avisoDoEstudante({ ...aprovado, avisoFechado: true }, estudanteAtiva)).toBeNull()
  })

  it('plano Estudante vencido pede renovação', () => {
    const vencida: Assinatura = { ...estudanteAtiva, plano: 'free', status: 'vencida' }
    expect(avisoDoEstudante({ ...pedido, status: 'aprovado', avisoFechado: true }, vencida)).toEqual({ tipo: 'renovar' })
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/domain/situacao.test.ts src/domain/pedidoEstudante.test.ts`
Esperado: FAIL (módulos inexistentes).

- [ ] **Passo 3: `src/domain/situacao.ts`**

```ts
// Situação de quem usa o MetaNutri e o CRN (spec conta-e-verificacao, D-40 e D-44).
// Regras puras: a tela usa para avisar antes; quem decide de verdade é o banco.
import { ehEmailDeFaculdade } from './estudante.ts'

export type Situacao = 'estudante' | 'nutricionista'
export const ehSituacao = (valor: unknown): valor is Situacao => valor === 'estudante' || valor === 'nutricionista'

export interface Crn {
  readonly regiao: number
  readonly numero: string
}

export type StatusCrn = 'em_conferencia' | 'conferido' | 'nao_encontrado'
const STATUS_CRN: readonly string[] = ['em_conferencia', 'conferido', 'nao_encontrado']

/** Os 11 conselhos regionais. */
export const REGIOES_CRN: readonly number[] = Array.from({ length: 11 }, (_, i) => i + 1)

const NUMERO_CRN = /^\d{1,7}P?$/

export const normalizarNumeroCrn = (numero: string): string => numero.replace(/[\s.]/g, '').toUpperCase()

export const formatarCrn = (crn: Crn): string => `CRN-${crn.regiao} ${crn.numero}`

export function validarCrn(regiao: number | null, numero: string): 'crn-regiao' | 'crn-numero' | null {
  if (regiao === null || !REGIOES_CRN.includes(regiao)) return 'crn-regiao'
  if (!NUMERO_CRN.test(normalizarNumeroCrn(numero))) return 'crn-numero'
  return null
}

/** O que a pessoa marcou no "Você é" (cadastro e Completar cadastro). */
export interface DadosSituacao {
  readonly situacao: Situacao | null
  readonly regiao: number | null
  readonly numero: string
  readonly declarouCrn: boolean
  readonly declarouMatricula: boolean
}

export const SITUACAO_VAZIA: DadosSituacao = { situacao: null, regiao: null, numero: '', declarouCrn: false, declarouMatricula: false }

export type ErroSituacao = 'situacao-vazia' | 'crn-regiao' | 'crn-numero' | 'declaracao-crn' | 'declaracao-matricula' | 'email-faculdade'

export const MENSAGEM_ERRO_SITUACAO: Readonly<Record<ErroSituacao, string>> = {
  'situacao-vazia': 'Escolha se você é nutricionista ou estudante de Nutrição.',
  'crn-regiao': 'Escolha a região do seu CRN.',
  'crn-numero': 'O número do CRN tem só algarismos e pode terminar em P, se a inscrição for provisória.',
  'declaracao-crn': 'Marque a declaração de que o CRN é seu e está ativo.',
  'declaracao-matricula': 'Marque a declaração de matrícula ativa no curso de Nutrição.',
  'email-faculdade': 'Use o e-mail que a sua faculdade forneceu.',
}

/** CA-263 a CA-268. O e-mail entra porque estudante só cria conta com o da faculdade. */
export function validarSituacao(dados: DadosSituacao, email: string): ErroSituacao | null {
  if (dados.situacao === null) return 'situacao-vazia'
  if (dados.situacao === 'nutricionista') {
    const erroCrn = validarCrn(dados.regiao, dados.numero)
    if (erroCrn) return erroCrn
    return dados.declarouCrn ? null : 'declaracao-crn'
  }
  if (!ehEmailDeFaculdade(email)) return 'email-faculdade'
  return dados.declarouMatricula ? null : 'declaracao-matricula'
}

/** O CRN pronto para o servidor, ou nulo quando não é nutricionista. */
export function crnDe(dados: DadosSituacao): Crn | null {
  if (dados.situacao !== 'nutricionista' || dados.regiao === null) return null
  return { regiao: dados.regiao, numero: normalizarNumeroCrn(dados.numero) }
}

/** A linha de `perfis`, como o app lê. */
export interface PerfilConta {
  readonly nome: string
  readonly situacao: Situacao
  readonly crn: Crn | null
  readonly statusCrn: StatusCrn | null
  readonly crnDeclaradoEm: string | null
  readonly crnDecididoEm: string | null
}

const texto = (v: unknown): string | null => (typeof v === 'string' ? v : null)

export function daLinhaPerfil(linha: unknown): PerfilConta | null {
  if (typeof linha !== 'object' || linha === null) return null
  const o = linha as Record<string, unknown>
  if (!ehSituacao(o['situacao'])) return null
  const regiao = typeof o['crn_regiao'] === 'number' ? o['crn_regiao'] : null
  const numero = texto(o['crn_numero'])
  const status = texto(o['crn_status'])
  return {
    nome: texto(o['nome']) ?? '',
    situacao: o['situacao'],
    crn: regiao !== null && numero !== null ? { regiao, numero } : null,
    statusCrn: status !== null && STATUS_CRN.includes(status) ? (status as StatusCrn) : null,
    crnDeclaradoEm: texto(o['crn_declarado_em']),
    crnDecididoEm: texto(o['crn_decidido_em']),
  }
}

/** D-44: dias para corrigir o CRN não encontrado. */
export const PRAZO_CORRECAO_CRN_DIAS = 7
const DIA_MS = 24 * 60 * 60 * 1000

/** Quantos dias inteiros faltam (0 quando o prazo acabou). Nulo quando não há o que corrigir. */
export function diasParaCorrigir(perfil: PerfilConta | null, agora: Date): number | null {
  if (!perfil || perfil.statusCrn !== 'nao_encontrado' || !perfil.crnDecididoEm) return null
  const fim = new Date(perfil.crnDecididoEm).getTime() + PRAZO_CORRECAO_CRN_DIAS * DIA_MS
  return Math.max(0, Math.ceil((fim - agora.getTime()) / DIA_MS))
}

/** CA-290: passou do prazo sem corrigir, exportar fica bloqueado. */
export function exportacaoBloqueada(perfil: PerfilConta | null, agora: Date): boolean {
  return diasParaCorrigir(perfil, agora) === 0
}

export const MOTIVO_EXPORTACAO_BLOQUEADA = 'Exportar está bloqueado até você corrigir o CRN, no painel.'
```

- [ ] **Passo 4: `src/domain/pedidoEstudante.ts`**

```ts
// Pedido do plano Estudante: comprovante de matrícula e dados do curso (spec
// conta-e-verificacao, D-41 a D-43). Quem aprova é o administrador, no banco.
import type { Assinatura } from './assinatura.ts'

export type StatusPedido = 'em_analise' | 'aprovado' | 'recusado'
const STATUS_PEDIDO: readonly string[] = ['em_analise', 'aprovado', 'recusado']

export interface PedidoEstudante {
  readonly id: string
  readonly instituicao: string
  readonly matricula: string
  readonly periodo: number
  /** AAAA-MM. */
  readonly formatura: string
  readonly status: StatusPedido
  readonly motivo: string | null
  readonly enviadoEm: string
  readonly decididoEm: string | null
  readonly avisoFechado: boolean
}

export function daLinhaPedido(linha: unknown): PedidoEstudante | null {
  if (typeof linha !== 'object' || linha === null) return null
  const o = linha as Record<string, unknown>
  const status = o['status']
  if (typeof o['id'] !== 'string' || typeof status !== 'string' || !STATUS_PEDIDO.includes(status)) return null
  return {
    id: o['id'],
    instituicao: typeof o['instituicao'] === 'string' ? o['instituicao'] : '',
    matricula: typeof o['matricula'] === 'string' ? o['matricula'] : '',
    periodo: typeof o['periodo'] === 'number' ? o['periodo'] : 0,
    formatura: typeof o['formatura'] === 'string' ? o['formatura'].slice(0, 7) : '',
    status: status as StatusPedido,
    motivo: typeof o['motivo'] === 'string' ? o['motivo'] : null,
    enviadoEm: typeof o['enviado_em'] === 'string' ? o['enviado_em'] : '',
    decididoEm: typeof o['decidido_em'] === 'string' ? o['decidido_em'] : null,
    avisoFechado: o['aviso_fechado'] === true,
  }
}

/** D-43: até 5 MB, PDF, JPG ou PNG. O balde do Storage tem o mesmo limite. */
export const ARQUIVO_MAXIMO_BYTES = 5 * 1024 * 1024
export const TIPOS_DE_ARQUIVO: readonly string[] = ['application/pdf', 'image/jpeg', 'image/png']
export const ACEITA_ARQUIVO = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'

export interface DadosPedido {
  readonly instituicao: string
  readonly matricula: string
  readonly periodo: number | null
  /** AAAA-MM, ou vazio. */
  readonly formatura: string
  readonly arquivo: { readonly tipo: string; readonly tamanho: number } | null
}

export type ErroPedido = 'instituicao' | 'matricula' | 'periodo' | 'formatura' | 'arquivo-vazio' | 'arquivo-tipo' | 'arquivo-grande'

export const MENSAGEM_ERRO_PEDIDO: Readonly<Record<ErroPedido, string>> = {
  instituicao: 'Escreva o nome da instituição.',
  matricula: 'Escreva o número da matrícula.',
  periodo: 'Escolha o período que você está cursando.',
  formatura: 'Escolha a previsão de formatura, deste mês em diante.',
  'arquivo-vazio': 'Escolha o arquivo do comprovante.',
  'arquivo-tipo': 'O comprovante precisa ser PDF, JPG ou PNG.',
  'arquivo-grande': 'O comprovante passa de 5 MB. Tire uma foto menor ou exporte o PDF de novo.',
}

const MES = /^\d{4}-(0[1-9]|1[0-2])$/

export const mesAtual = (hoje: Date): string => `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

export function validarPedido(dados: DadosPedido, hoje: Date): ErroPedido | null {
  if (dados.instituicao.trim().length < 2) return 'instituicao'
  if (dados.matricula.trim().length < 3) return 'matricula'
  if (dados.periodo === null || dados.periodo < 1 || dados.periodo > 12) return 'periodo'
  if (!MES.test(dados.formatura) || dados.formatura < mesAtual(hoje)) return 'formatura'
  if (!dados.arquivo) return 'arquivo-vazio'
  if (!TIPOS_DE_ARQUIVO.includes(dados.arquivo.tipo)) return 'arquivo-tipo'
  if (dados.arquivo.tamanho > ARQUIVO_MAXIMO_BYTES) return 'arquivo-grande'
  return null
}

/** CA-295: motivos prontos; "Outro motivo" é escrito à mão. */
export const MOTIVOS_RECUSA: readonly string[] = ['Ilegível', 'Sem o seu nome', 'Não mostra o semestre atual', 'Outro curso']

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "2027-07" → "julho de 2027", sem passar por Date (que puxaria o fuso). */
export function formatarMesAno(mes: string): string {
  const [ano, numero] = mes.split('-')
  const nome = MESES[Number(numero) - 1]
  return nome && ano ? `${nome} de ${ano}` : mes
}

/** A data no dia de quem usa (São Paulo), por extenso: "31 de julho de 2027". */
export function formatarDataLonga(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })
}

/** Pasta da pessoa no balde e um nome sem acento nem espaço, para não quebrar a URL. */
export function caminhoDoComprovante(usuarioId: string, nomeDoArquivo: string, agora: Date): string {
  const ponto = nomeDoArquivo.lastIndexOf('.')
  const base = ponto > 0 ? nomeDoArquivo.slice(0, ponto) : nomeDoArquivo
  const extensao = ponto > 0 ? nomeDoArquivo.slice(ponto + 1).toLowerCase() : ''
  const seguro = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'comprovante'
  return `${usuarioId}/${agora.getTime()}-${seguro}${extensao ? `.${extensao}` : ''}`
}

export type AvisoEstudante =
  | { readonly tipo: 'enviar' }
  | { readonly tipo: 'renovar' }
  | { readonly tipo: 'analise' }
  | { readonly tipo: 'recusado'; readonly motivo: string }
  | { readonly tipo: 'aprovado'; readonly pedidoId: string; readonly expiraEm: string }
  | null

/** CA-279 e CA-285: o aviso que a estudante vê no painel. */
export function avisoDoEstudante(pedido: PedidoEstudante | null, assinatura: Assinatura): AvisoEstudante {
  const estudanteVencido = assinatura.planoPedido === 'estudante' && assinatura.status === 'vencida'
  if (!pedido) return estudanteVencido ? { tipo: 'renovar' } : { tipo: 'enviar' }
  if (pedido.status === 'em_analise') return { tipo: 'analise' }
  if (pedido.status === 'recusado') return { tipo: 'recusado', motivo: pedido.motivo ?? 'sem motivo informado' }
  if (estudanteVencido) return { tipo: 'renovar' }
  if (!pedido.avisoFechado && assinatura.plano === 'estudante' && assinatura.expiraEm) {
    return { tipo: 'aprovado', pedidoId: pedido.id, expiraEm: assinatura.expiraEm }
  }
  return null
}
```

- [ ] **Passo 5: rodar e ver passar**

Rode: `npx vitest run src/domain/situacao.test.ts src/domain/pedidoEstudante.test.ts`
Esperado: PASS. Se `formatarDataLonga` falhar por falta de fuso no Node, confira `node -e "console.log(Intl.DateTimeFormat().resolvedOptions())"`: o Node 18+ traz os fusos completos.

- [ ] **Passo 6: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/domain/situacao.ts src/domain/situacao.test.ts src/domain/pedidoEstudante.ts src/domain/pedidoEstudante.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(dominio): situação, CRN e pedido do plano Estudante`.

---

### Tarefa 3: Cadastro com situação e o perfil vindo do servidor

Cobre CA-269 do lado do navegador e prepara CA-282 a CA-289.

**Arquivos:**
- Criar: `src/ui/estado/mensagemDoBanco.ts`
- Alterar: `src/ui/estado/usarConta.ts`, `src/ui/estado/usarConta.test.ts`
- Criar: `src/ui/estado/usarPerfilConta.ts`, `src/ui/estado/usarPerfilConta.test.ts`

**Interfaces:**
- Consome: `Situacao`, `Crn`, `PerfilConta`, `daLinhaPerfil` (Tarefa 2).
- Produz:
  - `mensagemDoBanco(erro: { message?: string; code?: string } | null): string | null` e `FALHA_DE_REDE`
  - `DadosCadastro` com os campos novos `situacao: Situacao` e `crn: Crn | null`
  - `interface ValorPerfilConta { perfil: PerfilConta | null; ehAdmin: boolean; carregado: boolean; falhou: boolean; informarSituacao(situacao, crn): Promise<string | null>; meFormei(crn): Promise<string | null>; corrigirCrn(crn): Promise<string | null>; recarregar(): void }`
  - `usePerfilConta(usuarioId: string | null): ValorPerfilConta`

- [ ] **Passo 1: escrever os testes que falham**

Em `src/ui/estado/usarConta.test.ts`, troque a constante `dados` por:

```ts
const dados = {
  nome: 'Maria',
  email: ' maria@usp.br ',
  senha: 'senhaforte1',
  planoDesejado: 'estudante',
  versaoTermos: '2026-09-28',
  situacao: 'nutricionista',
  crn: { regiao: 6, numero: '12345' },
} as const
```

e acrescente, dentro do `describe('useConta', ...)`:

```ts
  it('CA-269: grava a situação e o CRN nos metadados do cadastro', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      await result.current.cadastrar(dados)
    })
    const pedido = auth.signUp.mock.calls[0]?.[0]
    expect(pedido.options.data).toMatchObject({ situacao: 'nutricionista', crn_regiao: 6, crn_numero: '12345' })
  })

  it('CA-269: estudante não leva CRN', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      await result.current.cadastrar({ ...dados, situacao: 'estudante', crn: null })
    })
    const pedido = auth.signUp.mock.calls[0]?.[0]
    expect(pedido.options.data.situacao).toBe('estudante')
    expect(pedido.options.data.crn_regiao).toBeUndefined()
  })
```

`src/ui/estado/usarPerfilConta.test.ts`:

```ts
import { act, renderHook, waitFor } from '@testing-library/react'
import { usePerfilConta } from './usarPerfilConta.ts'

const banco = vi.hoisted(() => ({
  perfil: { data: null as unknown, error: null as unknown },
  admin: { data: false as unknown, error: null as unknown },
  rpcErro: null as unknown,
  chamadas: [] as { funcao: string; args: unknown }[],
  filtro: null as unknown,
}))

const cliente = {
  from: () => ({
    select: () => ({
      eq: (_coluna: string, valor: unknown) => {
        banco.filtro = valor
        return { maybeSingle: async () => banco.perfil }
      },
    }),
  }),
  rpc: async (funcao: string, args?: unknown) => {
    if (funcao === 'eh_admin') return banco.admin
    banco.chamadas.push({ funcao, args })
    return { data: null, error: banco.rpcErro }
  },
}

vi.mock('./supabase.ts', () => ({ obterSupabase: () => cliente, supabaseConfigurado: () => true }))

describe('usePerfilConta', () => {
  beforeEach(() => {
    banco.perfil = { data: { nome: 'Ana', situacao: 'nutricionista', crn_regiao: 6, crn_numero: '12345', crn_status: 'em_conferencia', crn_declarado_em: '2026-09-30T12:00:00Z', crn_decidido_em: null }, error: null }
    banco.admin = { data: false, error: null }
    banco.rpcErro = null
    banco.chamadas = []
  })

  it('lê o próprio perfil, filtrando pelo id da sessão', async () => {
    const { result } = renderHook(() => usePerfilConta('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    expect(banco.filtro).toBe('u1')
    expect(result.current.perfil?.crn).toEqual({ regiao: 6, numero: '12345' })
    expect(result.current.ehAdmin).toBe(false)
    expect(result.current.falhou).toBe(false)
  })

  it('CB-68: conta sem perfil fica carregada com perfil nulo', async () => {
    banco.perfil = { data: null, error: null }
    const { result } = renderHook(() => usePerfilConta('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    expect(result.current.perfil).toBeNull()
    expect(result.current.falhou).toBe(false)
  })

  it('leitura que falha não finge que a conta não tem perfil', async () => {
    banco.perfil = { data: null, error: { message: 'Failed to fetch', code: '' } }
    const { result } = renderHook(() => usePerfilConta('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    expect(result.current.falhou).toBe(true)
  })

  it('sabe quem é administrador', async () => {
    banco.admin = { data: true, error: null }
    const { result } = renderHook(() => usePerfilConta('u1'))
    await waitFor(() => expect(result.current.ehAdmin).toBe(true))
  })

  it('CA-287: Me formei chama a função do banco com o CRN', async () => {
    const { result } = renderHook(() => usePerfilConta('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    let erro: string | null = 'x'
    await act(async () => {
      erro = await result.current.meFormei({ regiao: 6, numero: '23891' })
    })
    expect(erro).toBeNull()
    expect(banco.chamadas).toContainEqual({ funcao: 'me_formei', args: { p_regiao: 6, p_numero: '23891' } })
  })

  it('erro explicado pelo banco aparece como veio; o resto vira falha de rede', async () => {
    const { result } = renderHook(() => usePerfilConta('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    banco.rpcErro = { message: 'Só conta de estudante pode informar a formatura.', code: 'P0001' }
    await act(async () => {
      expect(await result.current.meFormei({ regiao: 6, numero: '1' })).toBe('Só conta de estudante pode informar a formatura.')
    })
    banco.rpcErro = { message: 'TypeError: Failed to fetch', code: '' }
    await act(async () => {
      expect(await result.current.corrigirCrn({ regiao: 6, numero: '1' })).toBe('Não deu para falar com o servidor. Confira a internet e tente de novo.')
    })
  })

  it('sem sessão, não pergunta nada ao banco', () => {
    const { result } = renderHook(() => usePerfilConta(null))
    expect(result.current.carregado).toBe(true)
    expect(result.current.perfil).toBeNull()
    expect(banco.filtro).toBeNull()
  })
})
```

No último teste, `banco.filtro` precisa começar nulo: acrescente `banco.filtro = null` ao `beforeEach`.

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/estado/usarConta.test.ts src/ui/estado/usarPerfilConta.test.ts`
Esperado: FAIL.

- [ ] **Passo 3: `src/ui/estado/mensagemDoBanco.ts`**

```ts
// O banco explica os próprios erros em português (`raise exception`, com estes
// códigos). Qualquer outra coisa é rede, servidor fora ou erro que a pessoa não
// tem como resolver: vira a mensagem de falha de rede.
export const FALHA_DE_REDE = 'Não deu para falar com o servidor. Confira a internet e tente de novo.'

const EXPLICADOS: readonly string[] = ['P0001', '22023', '42501']

export function mensagemDoBanco(erro: { readonly message?: string; readonly code?: string } | null): string | null {
  if (!erro) return null
  if (erro.code && EXPLICADOS.includes(erro.code) && erro.message) return erro.message
  return FALHA_DE_REDE
}
```

- [ ] **Passo 4: `usarConta.ts`, os metadados do cadastro**

1. Acrescente `import type { Crn, Situacao } from '@/domain/situacao.ts'`.
2. Em `DadosCadastro`, acrescente:

```ts
  /** O "Você é" do cadastro. O servidor cria o perfil com isto (spec conta-e-verificacao, CA-269). */
  readonly situacao: Situacao
  /** Só para nutricionista. */
  readonly crn: Crn | null
```

3. No `data` do `signUp`, logo depois de `plano_desejado: dados.planoDesejado,`, acrescente:

```ts
          situacao: dados.situacao,
          ...(dados.situacao === 'nutricionista' && dados.crn ? { crn_regiao: dados.crn.regiao, crn_numero: dados.crn.numero } : {}),
```

- [ ] **Passo 5: `src/ui/estado/usarPerfilConta.ts`**

```ts
// O perfil da conta (situação e CRN) e se ela é administradora. O navegador só lê;
// mudar a situação passa pelas funções do banco, que conferem cada pedido (spec
// conta-e-verificacao, D-40).
import { useCallback, useEffect, useState } from 'react'
import { daLinhaPerfil, type Crn, type PerfilConta, type Situacao } from '@/domain/situacao.ts'
import { mensagemDoBanco } from './mensagemDoBanco.ts'
import { obterSupabase } from './supabase.ts'

export interface ValorPerfilConta {
  readonly perfil: PerfilConta | null
  readonly ehAdmin: boolean
  /** A primeira resposta chegou (ou não há sessão, ou não há servidor). */
  readonly carregado: boolean
  /** A leitura falhou: não dá para afirmar que a conta não tem perfil. */
  readonly falhou: boolean
  readonly informarSituacao: (situacao: Situacao, crn: Crn | null) => Promise<string | null>
  readonly meFormei: (crn: Crn) => Promise<string | null>
  readonly corrigirCrn: (crn: Crn) => Promise<string | null>
  readonly recarregar: () => void
}

interface Carga {
  readonly chave: string
  readonly perfil: PerfilConta | null
  readonly ehAdmin: boolean
  readonly falhou: boolean
}

const COLUNAS = 'nome, situacao, crn_regiao, crn_numero, crn_status, crn_declarado_em, crn_decidido_em'
const SEM_SERVIDOR = 'A conta na nuvem não está configurada neste MetaNutri.'

export function usePerfilConta(usuarioId: string | null): ValorPerfilConta {
  const [cliente] = useState(() => obterSupabase())
  const [carga, setCarga] = useState<Carga | null>(null)
  const [versao, setVersao] = useState(0)

  // A chave junta conta e versão: trocar de conta ou recarregar descarta a carga velha no render.
  const chave = usuarioId ? `${usuarioId}:${versao}` : 'sem-sessao'
  const atual = carga?.chave === chave ? carga : null
  const carregado = usuarioId === null || cliente === null || atual !== null

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useEffect(() => {
    if (!cliente || !usuarioId) return
    let vivo = true
    // O administrador lê todos os perfis (RLS): sem o filtro, viriam várias linhas.
    void Promise.all([cliente.from('perfis').select(COLUNAS).eq('id', usuarioId).maybeSingle(), cliente.rpc('eh_admin')]).then(([perfil, admin]) => {
      if (!vivo) return
      setCarga({ chave, perfil: daLinhaPerfil(perfil.data), ehAdmin: admin.data === true, falhou: perfil.error !== null })
    })
    return () => {
      vivo = false
    }
  }, [cliente, usuarioId, chave])

  const chamar = useCallback(async (funcao: string, argumentos: Record<string, unknown>): Promise<string | null> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.rpc(funcao, argumentos)
    if (error) return mensagemDoBanco(error)
    setVersao((v) => v + 1)
    return null
  }, [])

  const informarSituacao = useCallback(
    (situacao: Situacao, crn: Crn | null) => chamar('informar_situacao', { p_situacao: situacao, p_regiao: crn?.regiao ?? null, p_numero: crn?.numero ?? null }),
    [chamar],
  )
  const meFormei = useCallback((crn: Crn) => chamar('me_formei', { p_regiao: crn.regiao, p_numero: crn.numero }), [chamar])
  const corrigirCrn = useCallback((crn: Crn) => chamar('corrigir_crn', { p_regiao: crn.regiao, p_numero: crn.numero }), [chamar])

  return {
    perfil: atual?.perfil ?? null,
    ehAdmin: atual?.ehAdmin ?? false,
    carregado,
    falhou: atual?.falhou ?? false,
    informarSituacao,
    meFormei,
    corrigirCrn,
    recarregar,
  }
}
```

- [ ] **Passo 6: rodar e ver passar**

Rode: `npx vitest run src/ui/estado/usarConta.test.ts src/ui/estado/usarPerfilConta.test.ts`
Esperado: PASS. O typecheck vai acusar `cadastrar` sem `situacao` em `TelaCriarConta`: ela ainda não existe (Tarefa 5), então nada mais quebra. Se algum outro chamador de `cadastrar` aparecer, ele é da Tarefa 5.

- [ ] **Passo 7: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/ui/estado/mensagemDoBanco.ts src/ui/estado/usarConta.ts src/ui/estado/usarConta.test.ts src/ui/estado/usarPerfilConta.ts src/ui/estado/usarPerfilConta.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): situação no cadastro e o perfil lido do servidor`.

---

### Tarefa 4: Peças: `CampoCrn` e `CamposSituacao`

Cobre o desenho de CA-262, CA-263, CA-265 e CA-267 (protótipo "Criar conta").

**Arquivos:**
- Criar: `src/ui/publico/conta/CampoCrn.tsx`, `src/ui/publico/conta/CamposSituacao.tsx`
- Criar: `src/ui/publico/conta/pecasSituacao.test.tsx`

**Interfaces:**
- Consome: `REGIOES_CRN`, `DadosSituacao`, `ErroSituacao`, `Situacao` (Tarefa 2).
- Produz:
  - `CampoCrn({ id: string; regiao: number | null; numero: string; aoMudar: (crn: { regiao: number | null; numero: string }) => void; invalido?: boolean; dica?: string })`
  - `CaixaDeclaracao({ id: string; marcada: boolean; aoMudar: (v: boolean) => void; invalido?: boolean; children: ReactNode })`, no mesmo arquivo de `CamposSituacao`? **Não**: um componente por arquivo. Crie `src/ui/publico/conta/CaixaDeclaracao.tsx`.
  - `CamposSituacao({ id: string; valor: DadosSituacao; aoMudar: (v: DadosSituacao) => void; erro: ErroSituacao | null; travarEstudante?: boolean })`

- [ ] **Passo 1: escrever os testes que falham**

`src/ui/publico/conta/pecasSituacao.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { SITUACAO_VAZIA, type DadosSituacao, type ErroSituacao } from '@/domain/situacao.ts'
import { CamposSituacao } from './CamposSituacao.tsx'

function Montado({ travar = false, erro = null as ErroSituacao | null, aoMudar = vi.fn() }) {
  const [valor, setValor] = useState<DadosSituacao>(SITUACAO_VAZIA)
  return (
    <CamposSituacao
      id="t"
      valor={valor}
      erro={erro}
      travarEstudante={travar}
      aoMudar={(v) => {
        setValor(v)
        aoMudar(v)
      }}
    />
  )
}

describe('CamposSituacao', () => {
  it('CA-262: mostra os dois cartões de "Você é"', () => {
    render(<Montado />)
    expect(screen.getByRole('group', { name: 'Você é' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Nutricionista/ })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: /Estudante de Nutrição/ })).not.toBeChecked()
  })

  it('CA-263: nutricionista mostra o CRN e a declaração', async () => {
    const aoMudar = vi.fn()
    render(<Montado aoMudar={aoMudar} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('radio', { name: /Nutricionista/ }))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Região do CRN' }), 'CRN-6')
    await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '12345')
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro que este CRN é meu e está ativo.' }))
    expect(aoMudar).toHaveBeenLastCalledWith({ situacao: 'nutricionista', regiao: 6, numero: '12345', declarouCrn: true, declarouMatricula: false })
  })

  it('CA-265: estudante mostra a declaração de matrícula, sem CRN', async () => {
    render(<Montado />)
    await userEvent.setup().click(screen.getByRole('radio', { name: /Estudante de Nutrição/ }))
    expect(screen.getByRole('checkbox', { name: 'Declaro ter matrícula ativa no curso de Nutrição.' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Número do CRN' })).not.toBeInTheDocument()
  })

  it('CA-267: travado no Estudante, o cartão Nutricionista fica indisponível', () => {
    render(<Montado travar />)
    expect(screen.getByRole('radio', { name: /Nutricionista/ })).toBeDisabled()
  })

  it('marca o campo com erro', async () => {
    render(<Montado erro="crn-numero" />)
    await userEvent.setup().click(screen.getByRole('radio', { name: /Nutricionista/ }))
    expect(screen.getByRole('textbox', { name: 'Número do CRN' })).toHaveAttribute('aria-invalid', 'true')
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/publico/conta/pecasSituacao.test.tsx`
Esperado: FAIL.

- [ ] **Passo 3: `CampoCrn.tsx`**

```tsx
import { REGIOES_CRN } from '@/domain/situacao.ts'
import { Input } from '@ds/componentes/forms/input.tsx'

interface CampoCrnProps {
  readonly id: string
  readonly regiao: number | null
  readonly numero: string
  readonly aoMudar: (crn: { readonly regiao: number | null; readonly numero: string }) => void
  readonly invalido?: boolean | undefined
  readonly dica?: string | undefined
}

/** CRN em duas partes: a região (CRN-1 a CRN-11) e o número da inscrição (spec conta-e-verificacao, CA-263). */
export function CampoCrn({ id, regiao, numero, aoMudar, invalido = false, dica }: CampoCrnProps) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold leading-none text-heading">CRN</legend>
      <div className="grid grid-cols-[8.25rem_minmax(0,1fr)] gap-2.5">
        <select
          id={`${id}-regiao`}
          aria-label="Região do CRN"
          value={regiao ?? ''}
          aria-invalid={invalido}
          onChange={(e) => aoMudar({ regiao: e.target.value ? Number(e.target.value) : null, numero })}
          className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground aria-[invalid=true]:border-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Região</option>
          {REGIOES_CRN.map((r) => (
            <option key={r} value={r}>{`CRN-${r}`}</option>
          ))}
        </select>
        <Input
          id={`${id}-numero`}
          aria-label="Número do CRN"
          value={numero}
          aria-invalid={invalido}
          onChange={(e) => aoMudar({ regiao, numero: e.target.value })}
          placeholder="Número"
          spellCheck={false}
        />
      </div>
      {dica ? <p className="text-xs text-muted-foreground">{dica}</p> : null}
    </fieldset>
  )
}
```

- [ ] **Passo 4: `CaixaDeclaracao.tsx`**

```tsx
import type { ReactNode } from 'react'

interface CaixaDeclaracaoProps {
  readonly id: string
  readonly marcada: boolean
  readonly aoMudar: (marcada: boolean) => void
  readonly invalido?: boolean | undefined
  readonly children: ReactNode
}

/** Caixa de declaração ou de aceite: o texto inteiro é clicável. */
export function CaixaDeclaracao({ id, marcada, aoMudar, invalido = false, children }: CaixaDeclaracaoProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input
        id={id}
        type="checkbox"
        checked={marcada}
        aria-invalid={invalido}
        onChange={(e) => aoMudar(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--brand-primary)]"
      />
      <span>{children}</span>
    </label>
  )
}
```

- [ ] **Passo 5: `CamposSituacao.tsx`**

```tsx
import type { DadosSituacao, ErroSituacao, Situacao } from '@/domain/situacao.ts'
import { cn } from '@/lib/utils'
import { CaixaDeclaracao } from './CaixaDeclaracao.tsx'
import { CampoCrn } from './CampoCrn.tsx'

interface CamposSituacaoProps {
  readonly id: string
  readonly valor: DadosSituacao
  readonly aoMudar: (valor: DadosSituacao) => void
  readonly erro: ErroSituacao | null
  /** Veio pelo botão do plano Estudante (CA-267). */
  readonly travarEstudante?: boolean | undefined
}

const OPCOES: readonly { readonly valor: Situacao; readonly titulo: string; readonly detalhe: string }[] = [
  { valor: 'nutricionista', titulo: 'Nutricionista', detalhe: 'Tenho CRN' },
  { valor: 'estudante', titulo: 'Estudante de Nutrição', detalhe: 'Ainda na faculdade' },
]

/** O "Você é" do cadastro, com o CRN ou a declaração de matrícula (protótipo "Criar conta"). */
export function CamposSituacao({ id, valor, aoMudar, erro, travarEstudante = false }: CamposSituacaoProps) {
  const mudar = (parcial: Partial<DadosSituacao>) => aoMudar({ ...valor, ...parcial })

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-semibold leading-none text-heading">Você é</legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {OPCOES.map((opcao) => {
            const marcada = valor.situacao === opcao.valor
            const indisponivel = travarEstudante && opcao.valor !== 'estudante'
            return (
              <label
                key={opcao.valor}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg p-3.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                  marcada ? 'border-2 border-primary bg-lightprimary p-[13px]' : 'border border-borderdefault bg-card',
                  indisponivel && 'cursor-not-allowed opacity-45',
                  erro === 'situacao-vazia' && !marcada && 'border-error',
                )}
              >
                <input
                  type="radio"
                  name={`${id}-situacao`}
                  value={opcao.valor}
                  checked={marcada}
                  disabled={indisponivel}
                  onChange={() => mudar({ situacao: opcao.valor })}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--brand-primary)]"
                />
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-heading">{opcao.titulo}</span>
                  <span className="text-xs text-muted-foreground">{opcao.detalhe}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {valor.situacao === 'nutricionista' ? (
        <>
          <CampoCrn
            id={id}
            regiao={valor.regiao}
            numero={valor.numero}
            aoMudar={(crn) => mudar(crn)}
            invalido={erro === 'crn-regiao' || erro === 'crn-numero'}
            dica="Vamos conferir seu registro no conselho. Você já pode usar tudo enquanto isso."
          />
          <CaixaDeclaracao id={`${id}-declara-crn`} marcada={valor.declarouCrn} aoMudar={(v) => mudar({ declarouCrn: v })} invalido={erro === 'declaracao-crn'}>
            Declaro que este CRN é meu e está ativo.
          </CaixaDeclaracao>
        </>
      ) : null}

      {valor.situacao === 'estudante' ? (
        <CaixaDeclaracao
          id={`${id}-declara-matricula`}
          marcada={valor.declarouMatricula}
          aoMudar={(v) => mudar({ declarouMatricula: v })}
          invalido={erro === 'declaracao-matricula'}
        >
          Declaro ter matrícula ativa no curso de Nutrição.
        </CaixaDeclaracao>
      ) : null}
    </div>
  )
}
```

- [ ] **Passo 6: rodar e ver passar**

Rode: `npx vitest run src/ui/publico/conta/pecasSituacao.test.tsx`
Esperado: PASS.

- [ ] **Passo 7: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/ui/publico/conta/CampoCrn.tsx src/ui/publico/conta/CaixaDeclaracao.tsx src/ui/publico/conta/CamposSituacao.tsx src/ui/publico/conta/pecasSituacao.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): peças do "Você é" e do CRN`.

---

### Tarefa 5: Constantes legais, Criar conta e Completar cadastro

Cobre CA-262 a CA-270, CB-60, CB-68 e os CA-128 e CA-130 a CA-134 da `estilo-spora`. Substitui a Tarefa 18 da `estilo-spora`.

**Arquivos:**
- Criar: `src/domain/legal.ts`
- Criar: `src/ui/publico/conta/TelaCriarConta.tsx`, `src/ui/publico/conta/TelaCriarConta.test.tsx`
- Criar: `src/ui/publico/conta/TelaCompletarCadastro.tsx`, `src/ui/publico/conta/TelaCompletarCadastro.test.tsx`

**Interfaces:**
- Consome: `MolduraConta`, `LadoDoPlano`, `CampoSenha`, `AvisoFormulario`, `AvisoSemServidor` (já existem); `validarCadastro`, `MENSAGEM_ERRO`, `SENHA_MINIMA` (`@/domain/conta.ts`); `validarSituacao`, `crnDe`, `MENSAGEM_ERRO_SITUACAO`, `SITUACAO_VAZIA` (Tarefa 2); `CamposSituacao`, `CaixaDeclaracao` (Tarefa 4); `ehPlanoPago` (`../../navegacao.ts`); `ValorPerfilConta` (Tarefa 3).
- Produz:
  - `legal.ts`: `RESPONSAVEL: string | null`, `CONTATO_EMAIL: string | null`, `VERSAO_TERMOS = '2026-09-30'`, `DATA_TERMOS = '30 de setembro de 2026'`, `PRAZO_EXCLUSAO_DIAS = 90`, `PRAZO_INCIDENTE_HORAS = 72`, `termosProntos(): boolean`
  - `interface ContaCriada { email: string; plano: IdPlano; situacao: Situacao; confirmarEmail: boolean }`
  - `TelaCriarConta({ conta; plano: IdPlano | null; ciclo: Ciclo; contato: string | null; aoCriada: (c: ContaCriada) => void; aoEntrar; aoTrocarPlano; aoIrParaInicio; aoAbrirSistema })`
  - `TelaCompletarCadastro({ email: string; informarSituacao: ValorPerfilConta['informarSituacao']; aoSair: () => void })`

- [ ] **Passo 1: `src/domain/legal.ts`**

```ts
// Quem responde pelo MetaNutri e a versão dos termos (spec conta-e-verificacao, D-46).
// RESPONSAVEL e CONTATO_EMAIL ficam nulos até o dono do projeto mandar os dois. Nulos,
// os Termos e a Política mostram "em preparação" e a publicação é barrada
// (scripts/conferir-publicacao.mjs, Tarefa 13). Ninguém inventa esses valores.

/** Pessoa física responsável pelo MetaNutri e encarregada dos dados pessoais. */
export const RESPONSAVEL: string | null = null

/** Canal de contato do MetaNutri: titular de dados, plano Clínica, faculdade que falta e suporte. */
export const CONTATO_EMAIL: string | null = null

/** Muda quando o texto dos termos ou da política mudar. Vai gravada no cadastro (CA-223). */
export const VERSAO_TERMOS = '2026-09-30'
export const DATA_TERMOS = '30 de setembro de 2026'

/** Em quantos dias os dados somem depois do pedido de exclusão. */
export const PRAZO_EXCLUSAO_DIAS = 90

/** Em quantas horas o MetaNutri avisa o nutricionista de um incidente de segurança. */
export const PRAZO_INCIDENTE_HORAS = 72

export const termosProntos = (): boolean => RESPONSAVEL !== null && CONTATO_EMAIL !== null
```

- [ ] **Passo 2: escrever os testes que falham**

`src/ui/publico/conta/TelaCriarConta.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import type { ValorConta } from '../../estado/usarConta.ts'
import { contaFalsa } from './contaFalsa.test-utils.ts'
import { TelaCriarConta } from './TelaCriarConta.tsx'

function montar(sobre: { conta?: ValorConta; plano?: 'solo' | 'estudante' | null; contato?: string | null } = {}) {
  const conta = sobre.conta ?? contaFalsa()
  const props = {
    conta,
    plano: sobre.plano ?? null,
    ciclo: 'mensal' as const,
    contato: sobre.contato ?? null,
    aoCriada: vi.fn(),
    aoEntrar: vi.fn(),
    aoTrocarPlano: vi.fn(),
    aoIrParaInicio: vi.fn(),
    aoAbrirSistema: vi.fn(),
  }
  render(<TelaCriarConta {...props} />)
  return { ...props, usuario: userEvent.setup() }
}

async function preencherBase(usuario: UserEvent, email = 'ana@gmail.com') {
  await usuario.type(screen.getByLabelText('Nome completo'), 'Ana Souza')
  await usuario.type(screen.getByLabelText(/e-mail/i), email)
  await usuario.type(screen.getByLabelText('Senha'), 'senhaforte1')
  await usuario.click(screen.getByRole('checkbox', { name: /Li e aceito/ }))
}

async function comoNutricionista(usuario: UserEvent) {
  await usuario.click(screen.getByRole('radio', { name: /Nutricionista/ }))
  await usuario.selectOptions(screen.getByRole('combobox', { name: 'Região do CRN' }), 'CRN-6')
  await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '12345')
  await usuario.click(screen.getByRole('checkbox', { name: 'Declaro que este CRN é meu e está ativo.' }))
}

const botaoCriar = () => screen.getByRole('button', { name: /^Criar conta/ })

describe('TelaCriarConta', () => {
  it('CA-262: pede nome completo, e-mail, senha, "Você é" e o aceite, e mostra o Free', () => {
    montar()
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Você é' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Termos de uso' })).toHaveAttribute('href', '#/termos')
    expect(screen.getByText('No Free você já tem')).toBeInTheDocument()
  })

  it('CA-268: sem escolher "Você é", nada vai ao servidor', async () => {
    const { usuario, conta } = montar()
    await preencherBase(usuario)
    await usuario.click(botaoCriar())
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha se você é nutricionista ou estudante de Nutrição.')
    expect(conta.cadastrar).not.toHaveBeenCalled()
  })

  it('CA-264: CRN com letra no meio não vai ao servidor', async () => {
    const { usuario, conta } = montar()
    await preencherBase(usuario)
    await usuario.click(screen.getByRole('radio', { name: /Nutricionista/ }))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Região do CRN' }), 'CRN-6')
    await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '12a45')
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro que este CRN é meu e está ativo.' }))
    await usuario.click(botaoCriar())
    expect(screen.getByRole('alert')).toHaveTextContent('O número do CRN tem só algarismos')
    expect(conta.cadastrar).not.toHaveBeenCalled()
  })

  it('CA-269: nutricionista vai com a situação e o CRN normalizado', async () => {
    const { usuario, conta, aoCriada } = montar()
    await preencherBase(usuario, '  ana@gmail.com ')
    await comoNutricionista(usuario)
    await usuario.click(botaoCriar())
    expect(conta.cadastrar).toHaveBeenCalledWith(
      expect.objectContaining({ situacao: 'nutricionista', crn: { regiao: 6, numero: '12345' }, planoDesejado: 'free', versaoTermos: '2026-09-30' }),
    )
    expect(aoCriada).toHaveBeenCalledWith({ email: 'ana@gmail.com', plano: 'free', situacao: 'nutricionista', confirmarEmail: true })
  })

  it('CA-265: estudante troca o rótulo do e-mail e mostra o passo 1 de 2', async () => {
    const { usuario } = montar()
    await usuario.click(screen.getByRole('radio', { name: /Estudante de Nutrição/ }))
    expect(screen.getByLabelText('E-mail da faculdade')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Passo 1 de 2' })).toBeInTheDocument()
  })

  it('CA-266 e CB-60: e-mail que não é de faculdade não vai, e o contato aparece', async () => {
    const { usuario, conta } = montar({ contato: 'contato@metanutri.com' })
    await usuario.click(screen.getByRole('radio', { name: /Estudante de Nutrição/ }))
    await preencherBase(usuario, 'julia@gmail.com')
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro ter matrícula ativa no curso de Nutrição.' }))
    await usuario.click(botaoCriar())
    expect(screen.getByRole('alert')).toHaveTextContent('Use o e-mail que a sua faculdade forneceu.')
    expect(screen.getByRole('alert')).toHaveTextContent('contato@metanutri.com')
    expect(conta.cadastrar).not.toHaveBeenCalled()
  })

  it('CA-267: pelo botão do Estudante, já vem em Estudante e o Nutricionista fica indisponível', () => {
    montar({ plano: 'estudante' })
    expect(screen.getByRole('radio', { name: /Estudante de Nutrição/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /Nutricionista/ })).toBeDisabled()
  })

  it('CA-270: estudante criada segue com a situação, para cair no comprovante', async () => {
    const { usuario, aoCriada } = montar({ plano: 'estudante' })
    await preencherBase(usuario, 'julia@ufrn.edu.br')
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro ter matrícula ativa no curso de Nutrição.' }))
    await usuario.click(botaoCriar())
    expect(aoCriada).toHaveBeenCalledWith({ email: 'julia@ufrn.edu.br', plano: 'estudante', situacao: 'estudante', confirmarEmail: true })
  })

  it('CA-134: clique duplo cria uma conta só', async () => {
    let terminar: (v: { ok: boolean; erro: null }) => void = () => undefined
    const conta = contaFalsa({ cadastrar: vi.fn(() => new Promise((resolver) => (terminar = resolver))) })
    const { usuario } = montar({ conta })
    await preencherBase(usuario)
    await comoNutricionista(usuario)
    await usuario.dblClick(botaoCriar())
    terminar({ ok: true, erro: null })
    expect(conta.cadastrar).toHaveBeenCalledTimes(1)
  })

  it('CA-130: e-mail com conta mostra o aviso e o atalho para entrar', async () => {
    const conta = contaFalsa({ cadastrar: vi.fn(async () => ({ ok: false, erro: 'email-em-uso' as const })) })
    const { usuario, aoEntrar } = montar({ conta })
    await preencherBase(usuario)
    await comoNutricionista(usuario)
    await usuario.click(botaoCriar())
    expect(screen.getByRole('alert')).toHaveTextContent('Este e-mail já tem conta.')
    await usuario.click(screen.getAllByRole('button', { name: 'Entrar' })[0] as HTMLElement)
    expect(aoEntrar).toHaveBeenCalled()
  })

  it('CA-128: com o Solo, mostra o passo 1 de 3 e o link para trocar de plano', async () => {
    const { usuario, aoTrocarPlano } = montar({ plano: 'solo' })
    expect(screen.getByRole('img', { name: 'Passo 1 de 3' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Trocar de plano' }))
    expect(aoTrocarPlano).toHaveBeenCalledOnce()
  })
})
```

`src/ui/publico/conta/TelaCompletarCadastro.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TelaCompletarCadastro } from './TelaCompletarCadastro.tsx'

describe('TelaCompletarCadastro (CB-68)', () => {
  it('pede a situação e grava pelo servidor', async () => {
    const informarSituacao = vi.fn(async () => null)
    render(<TelaCompletarCadastro email="ana@gmail.com" informarSituacao={informarSituacao} aoSair={vi.fn()} />)
    const usuario = userEvent.setup()
    expect(screen.getByRole('heading', { level: 1, name: 'Complete seu cadastro' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('radio', { name: /Nutricionista/ }))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Região do CRN' }), 'CRN-2')
    await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '15540')
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro que este CRN é meu e está ativo.' }))
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(informarSituacao).toHaveBeenCalledWith('nutricionista', { regiao: 2, numero: '15540' })
  })

  it('mostra o erro que o servidor devolve', async () => {
    const informarSituacao = vi.fn(async () => 'Sua situação já está registrada.')
    render(<TelaCompletarCadastro email="julia@ufrn.edu.br" informarSituacao={informarSituacao} aoSair={vi.fn()} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('radio', { name: /Estudante de Nutrição/ }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Declaro ter matrícula ativa no curso de Nutrição.' }))
    await usuario.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sua situação já está registrada.')
  })
})
```

- [ ] **Passo 3: rodar e ver falhar**

Rode: `npx vitest run src/ui/publico/conta/TelaCriarConta.test.tsx src/ui/publico/conta/TelaCompletarCadastro.test.tsx`
Esperado: FAIL.

- [ ] **Passo 4: `TelaCriarConta.tsx`**

```tsx
import { useId, useRef, useState, type FormEvent } from 'react'
import { MENSAGEM_ERRO, SENHA_MINIMA, validarCadastro, type Ciclo, type ErroConta, type IdPlano } from '@/domain/conta.ts'
import { VERSAO_TERMOS } from '@/domain/legal.ts'
import { crnDe, MENSAGEM_ERRO_SITUACAO, SITUACAO_VAZIA, validarSituacao, type DadosSituacao, type ErroSituacao, type Situacao } from '@/domain/situacao.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import type { ValorConta } from '../../estado/usarConta.ts'
import { ehPlanoPago } from '../../navegacao.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { AvisoSemServidor } from './AvisoSemServidor.tsx'
import { CaixaDeclaracao } from './CaixaDeclaracao.tsx'
import { CampoSenha } from './CampoSenha.tsx'
import { CamposSituacao } from './CamposSituacao.tsx'
import { LadoDoPlano } from './LadoDoPlano.tsx'
import { MolduraConta } from './MolduraConta.tsx'

export interface ContaCriada {
  readonly email: string
  readonly plano: IdPlano
  readonly situacao: Situacao
  readonly confirmarEmail: boolean
}

interface TelaCriarContaProps {
  readonly conta: ValorConta
  readonly plano: IdPlano | null
  readonly ciclo: Ciclo
  /** E-mail do MetaNutri, para pedir a inclusão de uma faculdade (CB-60). Nulo até existir. */
  readonly contato: string | null
  readonly aoCriada: (criada: ContaCriada) => void
  readonly aoEntrar: () => void
  readonly aoTrocarPlano: () => void
  readonly aoIrParaInicio: () => void
  readonly aoAbrirSistema: () => void
}

const LINK = 'font-semibold text-primary underline underline-offset-4'

/** Criar conta com a situação (spec conta-e-verificacao, US-B2; protótipo "Criar conta"). */
export function TelaCriarConta({ conta, plano, ciclo, contato, aoCriada, aoEntrar, aoTrocarPlano, aoIrParaInicio, aoAbrirSistema }: TelaCriarContaProps) {
  const id = useId()
  const viaEstudante = plano === 'estudante'
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [aceitou, setAceitou] = useState(false)
  const [situacao, setSituacao] = useState<DadosSituacao>(viaEstudante ? { ...SITUACAO_VAZIA, situacao: 'estudante' } : SITUACAO_VAZIA)
  const [erroConta, setErroConta] = useState<ErroConta | null>(null)
  const [erroSituacao, setErroSituacao] = useState<ErroSituacao | null>(null)
  const [enviando, setEnviando] = useState(false)
  // Trava de verdade contra o clique duplo (CA-134): o estado só muda no próximo render.
  const enviandoRef = useRef(false)

  const pago = plano !== null && ehPlanoPago(plano)
  const estudante = situacao.situacao === 'estudante'
  const passo = pago ? { atual: 1, total: 3 } : estudante ? { atual: 1, total: 2 } : undefined
  const subtitulo = pago
    ? 'Passo 1 de 3. Depois você revisa o plano e paga.'
    : estudante
      ? 'Passo 1 de 2. Depois você envia o comprovante de matrícula.'
      : 'Grátis, sem cartão.'

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    const problemaConta = validarCadastro({ nome, email, senha, aceitouTermos: aceitou })
    const problemaSituacao = problemaConta ? null : validarSituacao(situacao, email)
    setErroConta(problemaConta)
    setErroSituacao(problemaSituacao)
    if (problemaConta || problemaSituacao || situacao.situacao === null) return

    enviandoRef.current = true
    setEnviando(true)
    const resultado = await conta.cadastrar({
      nome,
      email,
      senha,
      planoDesejado: plano ?? 'free',
      versaoTermos: VERSAO_TERMOS,
      situacao: situacao.situacao,
      crn: crnDe(situacao),
    })
    enviandoRef.current = false
    setEnviando(false)
    if (!resultado.ok) {
      setErroConta(resultado.erro)
      return
    }
    aoCriada({ email: email.trim(), plano: plano ?? 'free', situacao: situacao.situacao, confirmarEmail: resultado.confirmarEmail === true })
  }

  return (
    <MolduraConta
      titulo={estudante ? 'Crie sua conta de estudante' : 'Crie sua conta'}
      subtitulo={subtitulo}
      passo={passo}
      aoIrParaInicio={aoIrParaInicio}
      lado={<LadoDoPlano plano={plano} ciclo={ciclo} aoTrocarPlano={plano !== null ? aoTrocarPlano : undefined} />}
    >
      {conta.disponivel ? null : <AvisoSemServidor aoAbrirSistema={aoAbrirSistema} />}

      <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-nome`}>Nome completo</Label>
          <Input id={`${id}-nome`} autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} aria-invalid={erroConta === 'nome-vazio'} />
          {estudante ? <p className="text-xs text-muted-foreground">Igual ao do comprovante de matrícula.</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-email`}>{estudante ? 'E-mail da faculdade' : 'E-mail'}</Label>
          <Input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={estudante ? 'voce@aluno.faculdade.br' : 'voce@exemplo.com'}
            aria-invalid={erroConta === 'email-invalido' || erroConta === 'email-em-uso' || erroSituacao === 'email-faculdade'}
          />
          {estudante ? <p className="text-xs text-muted-foreground">O e-mail que a faculdade forneceu a você. É por ele que confirmamos o vínculo.</p> : null}
        </div>

        <CampoSenha id={`${id}-senha`} rotulo="Senha" valor={senha} aoMudar={setSenha} novaSenha invalido={erroConta === 'senha-curta'} dica={`Pelo menos ${SENHA_MINIMA} caracteres.`} />

        <CamposSituacao id={id} valor={situacao} aoMudar={setSituacao} erro={erroSituacao} travarEstudante={viaEstudante} />

        <CaixaDeclaracao id={`${id}-termos`} marcada={aceitou} aoMudar={setAceitou} invalido={erroConta === 'termos'}>
          Li e aceito os{' '}
          <a href="#/termos" target="_blank" rel="noreferrer" className={LINK}>
            Termos de uso
          </a>{' '}
          e a{' '}
          <a href="#/privacidade" target="_blank" rel="noreferrer" className={LINK}>
            Política de privacidade
          </a>
          .
        </CaixaDeclaracao>

        {erroSituacao ? (
          <AvisoFormulario tipo="erro">
            {MENSAGEM_ERRO_SITUACAO[erroSituacao]}
            {erroSituacao === 'email-faculdade' && contato ? ` Se a sua faculdade não aparece, escreva para ${contato} pedindo a inclusão.` : null}
          </AvisoFormulario>
        ) : null}

        {erroConta ? (
          <AvisoFormulario tipo="erro">
            {MENSAGEM_ERRO[erroConta]}
            {erroConta === 'email-em-uso' ? (
              <>
                {' '}
                <button type="button" onClick={aoEntrar} className="font-semibold underline underline-offset-4">
                  Entrar
                </button>
              </>
            ) : null}
          </AvisoFormulario>
        ) : null}

        <Button type="submit" size="lg" block loading={enviando} disabled={!conta.disponivel}>
          {pago || estudante ? 'Criar conta e continuar' : 'Criar conta'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <button type="button" onClick={aoEntrar} className="inline-flex min-h-11 items-center rounded-sm font-semibold text-primary underline-offset-4 hover:underline">
            Entrar
          </button>
        </p>
      </form>
    </MolduraConta>
  )
}
```

No teste do CA-268 o `getByRole('alert')` acha só um aviso (o de situação), porque o de conta só aparece quando a conta tem erro.

- [ ] **Passo 5: `TelaCompletarCadastro.tsx`**

```tsx
import { useId, useRef, useState, type FormEvent } from 'react'
import { crnDe, MENSAGEM_ERRO_SITUACAO, SITUACAO_VAZIA, validarSituacao, type DadosSituacao, type ErroSituacao } from '@/domain/situacao.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import type { ValorPerfilConta } from '../../estado/usarPerfilConta.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { CamposSituacao } from './CamposSituacao.tsx'
import { MolduraConta } from './MolduraConta.tsx'

interface TelaCompletarCadastroProps {
  readonly email: string
  readonly informarSituacao: ValorPerfilConta['informarSituacao']
  readonly aoSair: () => void
}

/** CB-68: conta sem situação (criada pelo painel do Supabase) informa uma vez, antes de usar. */
export function TelaCompletarCadastro({ email, informarSituacao, aoSair }: TelaCompletarCadastroProps) {
  const id = useId()
  const [dados, setDados] = useState<DadosSituacao>(SITUACAO_VAZIA)
  const [erro, setErro] = useState<ErroSituacao | null>(null)
  const [falha, setFalha] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    const problema = validarSituacao(dados, email)
    setErro(problema)
    setFalha(null)
    if (problema || dados.situacao === null) return
    enviandoRef.current = true
    setEnviando(true)
    const resposta = await informarSituacao(dados.situacao, crnDe(dados))
    enviandoRef.current = false
    setEnviando(false)
    if (resposta) setFalha(resposta)
  }

  return (
    <MolduraConta titulo="Complete seu cadastro" subtitulo={`Falta dizer quem você é para usar o MetaNutri com ${email}.`} aoIrParaInicio={aoSair}>
      <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-4">
        <CamposSituacao id={id} valor={dados} aoMudar={setDados} erro={erro} />
        {erro ? <AvisoFormulario tipo="erro">{MENSAGEM_ERRO_SITUACAO[erro]}</AvisoFormulario> : null}
        {falha ? <AvisoFormulario tipo="erro">{falha}</AvisoFormulario> : null}
        <Button type="submit" size="lg" block loading={enviando}>
          Continuar
        </Button>
        <button type="button" onClick={aoSair} className="inline-flex min-h-11 items-center self-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Sair
        </button>
      </form>
    </MolduraConta>
  )
}
```

Depois de `informarSituacao` dar certo, o gancho recarrega o perfil e o `App` (Tarefa 12) troca de tela sozinho.

- [ ] **Passo 6: rodar e ver passar**

Rode: `npx vitest run src/ui/publico/conta`
Esperado: PASS em todos, inclusive nos testes antigos de `pecas.test.tsx`, `senha.test.tsx` e `TelaEntrar.test.tsx`. Se o `getByLabelText('Senha')` achar dois elementos, confira que o botão do olho usa `aria-label` ("Mostrar a senha") e não `<label>`.

- [ ] **Passo 7: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/domain/legal.ts src/ui/publico/conta/TelaCriarConta.tsx src/ui/publico/conta/TelaCriarConta.test.tsx src/ui/publico/conta/TelaCompletarCadastro.tsx src/ui/publico/conta/TelaCompletarCadastro.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): criar conta com "Você é" e completar cadastro`.

---

### Tarefa 6: Comprovar matrícula

Cobre CA-271 a CA-278, CA-281 e os itens 2 e 3 do foco de revisão.

**Arquivos:**
- Criar: `src/ui/estado/usarPedidoEstudante.ts`, `src/ui/estado/usarPedidoEstudante.test.ts`
- Criar: `src/ui/publico/conta/TelaComprovarMatricula.tsx`, `src/ui/publico/conta/TelaComprovarMatricula.test.tsx`

**Interfaces:**
- Consome: `PedidoEstudante`, `daLinhaPedido`, `validarPedido`, `MENSAGEM_ERRO_PEDIDO`, `ACEITA_ARQUIVO`, `caminhoDoComprovante`, `mesAtual`, `formatarDataLonga` (Tarefa 2); `mensagemDoBanco`, `FALHA_DE_REDE` (Tarefa 3); `MolduraConta`, `AvisoFormulario` (já existem).
- Produz:
  - `interface DadosEnvioPedido { instituicao: string; matricula: string; periodo: number; formatura: string /* AAAA-MM */ }`
  - `interface ValorPedidoEstudante { pedido: PedidoEstudante | null; carregado: boolean; enviar(dados, arquivo: File): Promise<string | null>; fecharAviso(pedidoId): Promise<void>; recarregar(): void }`
  - `usePedidoEstudante(usuarioId: string | null): ValorPedidoEstudante` (passe `null` quando a conta não é de estudante)
  - `TelaComprovarMatricula({ email: string; pedido: PedidoEstudante | null; enviar: ValorPedidoEstudante['enviar']; aoEnviado: () => void; aoDepois: () => void; aoIrParaInicio: () => void; hoje?: Date })`

- [ ] **Passo 1: escrever os testes que falham**

`src/ui/estado/usarPedidoEstudante.test.ts`:

```ts
import { act, renderHook, waitFor } from '@testing-library/react'
import { usePedidoEstudante } from './usarPedidoEstudante.ts'

const banco = vi.hoisted(() => ({
  linha: { data: null as unknown, error: null as unknown },
  upload: { error: null as unknown },
  rpc: { error: null as unknown },
  enviados: [] as string[],
  removidos: [] as string[][],
  chamadas: [] as { funcao: string; args: unknown }[],
}))

const cliente = {
  from: () => ({
    select: () => ({
      eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => banco.linha }) }) }),
    }),
  }),
  storage: {
    from: () => ({
      upload: async (caminho: string) => {
        banco.enviados.push(caminho)
        return banco.upload
      },
      remove: async (caminhos: string[]) => {
        banco.removidos.push(caminhos)
        return { error: null }
      },
    }),
  },
  rpc: async (funcao: string, args: unknown) => {
    banco.chamadas.push({ funcao, args })
    return banco.rpc
  },
}

vi.mock('./supabase.ts', () => ({ obterSupabase: () => cliente, supabaseConfigurado: () => true }))

const arquivo = new File(['%PDF'], 'Declaração.pdf', { type: 'application/pdf' })
const dados = { instituicao: ' UFRN ', matricula: '20230045871', periodo: 7, formatura: '2027-07' }

describe('usePedidoEstudante', () => {
  beforeEach(() => {
    banco.linha = { data: null, error: null }
    banco.upload = { error: null }
    banco.rpc = { error: null }
    banco.enviados = []
    banco.removidos = []
    banco.chamadas = []
  })

  it('lê o pedido mais recente', async () => {
    banco.linha = { data: { id: 'p1', status: 'em_analise', formatura: '2027-07-01', periodo: 7, instituicao: 'UFRN', matricula: '1', enviado_em: '2026-09-30T13:00:00Z' }, error: null }
    const { result } = renderHook(() => usePedidoEstudante('u1'))
    await waitFor(() => expect(result.current.pedido?.status).toBe('em_analise'))
  })

  it('CA-273: envia o arquivo para a pasta da pessoa e cria o pedido com o dia 1 do mês', async () => {
    const { result } = renderHook(() => usePedidoEstudante('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    let erro: string | null = 'x'
    await act(async () => {
      erro = await result.current.enviar(dados, arquivo)
    })
    expect(erro).toBeNull()
    expect(banco.enviados[0]).toMatch(/^u1\/\d+-declaracao\.pdf$/)
    expect(banco.chamadas).toContainEqual({
      funcao: 'enviar_pedido_estudante',
      args: { p_instituicao: 'UFRN', p_matricula: '20230045871', p_periodo: 7, p_formatura: '2027-07-01', p_arquivo: banco.enviados[0] },
    })
  })

  it('foco 2: banco recusou, o arquivo enviado é apagado e o motivo volta', async () => {
    banco.rpc = { error: { message: 'Confirme o e-mail da faculdade antes de enviar o comprovante.', code: '42501' } }
    const { result } = renderHook(() => usePedidoEstudante('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    let erro: string | null = null
    await act(async () => {
      erro = await result.current.enviar(dados, arquivo)
    })
    expect(erro).toBe('Confirme o e-mail da faculdade antes de enviar o comprovante.')
    expect(banco.removidos).toEqual([[banco.enviados[0]]])
  })

  it('upload que falha não cria pedido', async () => {
    banco.upload = { error: { message: 'Failed to fetch' } }
    const { result } = renderHook(() => usePedidoEstudante('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    let erro: string | null = null
    await act(async () => {
      erro = await result.current.enviar(dados, arquivo)
    })
    expect(erro).toBe('Não deu para falar com o servidor. Confira a internet e tente de novo.')
    expect(banco.chamadas.some((c) => c.funcao === 'enviar_pedido_estudante')).toBe(false)
  })

  it('CA-280: fechar o aviso chama o banco', async () => {
    const { result } = renderHook(() => usePedidoEstudante('u1'))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    await act(async () => {
      await result.current.fecharAviso('p1')
    })
    expect(banco.chamadas).toContainEqual({ funcao: 'fechar_aviso_estudante', args: { p_pedido: 'p1' } })
  })
})
```

`src/ui/publico/conta/TelaComprovarMatricula.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import type { PedidoEstudante } from '@/domain/pedidoEstudante.ts'
import { TelaComprovarMatricula } from './TelaComprovarMatricula.tsx'

const hoje = new Date('2026-09-30T15:00:00Z')
const pdf = new File(['%PDF'], 'declaracao.pdf', { type: 'application/pdf' })

function montar(pedido: PedidoEstudante | null = null, enviar = vi.fn(async () => null as string | null)) {
  const props = { email: 'julia@ufrn.edu.br', pedido, enviar, aoEnviado: vi.fn(), aoDepois: vi.fn(), aoIrParaInicio: vi.fn(), hoje }
  render(<TelaComprovarMatricula {...props} />)
  return { ...props, usuario: userEvent.setup() }
}

async function preencher(usuario: UserEvent) {
  await usuario.type(screen.getByLabelText('Instituição'), 'UFRN')
  await usuario.type(screen.getByLabelText('Matrícula'), '20230045871')
  await usuario.selectOptions(screen.getByLabelText('Período atual'), '7º')
  fireEvent.change(screen.getByLabelText('Previsão de formatura'), { target: { value: '2027-07' } })
  await usuario.upload(screen.getByLabelText('Comprovante de matrícula'), pdf)
}

const recusado: PedidoEstudante = {
  id: 'p1',
  instituicao: 'UFRN',
  matricula: '20230045871',
  periodo: 7,
  formatura: '2027-07',
  status: 'recusado',
  motivo: 'Não mostra o semestre atual',
  enviadoEm: '2026-09-29T10:00:00Z',
  decididoEm: '2026-09-30T10:00:00Z',
  avisoFechado: false,
}

describe('TelaComprovarMatricula', () => {
  it('CA-271: mostra o passo 2 de 2, o e-mail confirmado e o curso fixo', () => {
    montar()
    expect(screen.getByRole('img', { name: 'Passo 2 de 2' })).toBeInTheDocument()
    expect(screen.getByText(/julia@ufrn\.edu\.br/)).toBeInTheDocument()
    expect(screen.getByLabelText('Curso')).toHaveValue('Nutrição')
    expect(screen.getByLabelText('Curso')).toHaveAttribute('readonly')
  })

  it('CA-272: arquivo de outro tipo não é enviado', async () => {
    const { usuario, enviar } = montar()
    await usuario.type(screen.getByLabelText('Instituição'), 'UFRN')
    await usuario.type(screen.getByLabelText('Matrícula'), '20230045871')
    await usuario.selectOptions(screen.getByLabelText('Período atual'), '7º')
    fireEvent.change(screen.getByLabelText('Previsão de formatura'), { target: { value: '2027-07' } })
    fireEvent.change(screen.getByLabelText('Comprovante de matrícula'), { target: { files: [new File(['x'], 'foto.gif', { type: 'image/gif' })] } })
    await usuario.click(screen.getByRole('button', { name: 'Enviar para análise' }))
    expect(screen.getByRole('alert')).toHaveTextContent('O comprovante precisa ser PDF, JPG ou PNG.')
    expect(enviar).not.toHaveBeenCalled()
  })

  it('CA-273: enviado, avisa quem manda', async () => {
    const { usuario, enviar, aoEnviado } = montar()
    await preencher(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Enviar para análise' }))
    expect(enviar).toHaveBeenCalledWith({ instituicao: 'UFRN', matricula: '20230045871', periodo: 7, formatura: '2027-07' }, pdf)
    expect(aoEnviado).toHaveBeenCalledOnce()
  })

  it('CA-274: "Fazer isso depois" sai sem enviar', async () => {
    const { usuario, aoDepois, enviar } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Fazer isso depois' }))
    expect(aoDepois).toHaveBeenCalledOnce()
    expect(enviar).not.toHaveBeenCalled()
  })

  it('CA-275: com pedido em análise, mostra o estado e não o formulário', () => {
    montar({ ...recusado, status: 'em_analise', motivo: null, decididoEm: null })
    expect(screen.getByRole('heading', { level: 1, name: 'Comprovante em análise' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Instituição')).not.toBeInTheDocument()
  })

  it('CA-276: clique duplo envia uma vez só', async () => {
    let terminar: (v: string | null) => void = () => undefined
    const enviar = vi.fn(() => new Promise<string | null>((r) => (terminar = r)))
    const { usuario } = montar(null, enviar)
    await preencher(usuario)
    await usuario.dblClick(screen.getByRole('button', { name: 'Enviar para análise' }))
    terminar(null)
    expect(enviar).toHaveBeenCalledTimes(1)
  })

  it('CA-277: falha do servidor mantém tudo preenchido', async () => {
    const enviar = vi.fn(async () => 'Não deu para falar com o servidor. Confira a internet e tente de novo.')
    const { usuario } = montar(null, enviar)
    await preencher(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Enviar para análise' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Confira a internet')
    expect(screen.getByLabelText('Instituição')).toHaveValue('UFRN')
    expect(screen.getByRole('button', { name: 'Enviar para análise' })).toBeEnabled()
  })

  it('CA-281: depois da recusa, abre com os dados anteriores, menos o arquivo', () => {
    montar(recusado)
    expect(screen.getByLabelText('Instituição')).toHaveValue('UFRN')
    expect(screen.getByLabelText('Matrícula')).toHaveValue('20230045871')
    expect(screen.getByLabelText('Previsão de formatura')).toHaveValue('2027-07')
    expect(screen.getByText(/Não mostra o semestre atual/)).toBeInTheDocument()
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/estado/usarPedidoEstudante.test.ts src/ui/publico/conta/TelaComprovarMatricula.test.tsx`
Esperado: FAIL.

- [ ] **Passo 3: `src/ui/estado/usarPedidoEstudante.ts`**

```ts
// O pedido do plano Estudante: lê o mais recente e envia comprovante + dados.
// O arquivo vai primeiro para o balde privado; o pedido só nasce se o banco
// aceitar. Se o banco recusar, o arquivo enviado é apagado (foco de revisão 2).
import { useCallback, useEffect, useState } from 'react'
import { caminhoDoComprovante, daLinhaPedido, type PedidoEstudante } from '@/domain/pedidoEstudante.ts'
import { FALHA_DE_REDE, mensagemDoBanco } from './mensagemDoBanco.ts'
import { obterSupabase } from './supabase.ts'

export interface DadosEnvioPedido {
  readonly instituicao: string
  readonly matricula: string
  readonly periodo: number
  /** AAAA-MM. */
  readonly formatura: string
}

export interface ValorPedidoEstudante {
  readonly pedido: PedidoEstudante | null
  readonly carregado: boolean
  readonly enviar: (dados: DadosEnvioPedido, arquivo: File) => Promise<string | null>
  readonly fecharAviso: (pedidoId: string) => Promise<void>
  readonly recarregar: () => void
}

const COLUNAS = 'id, instituicao, matricula, periodo, formatura, status, motivo, enviado_em, decidido_em, aviso_fechado'

export function usePedidoEstudante(usuarioId: string | null): ValorPedidoEstudante {
  const [cliente] = useState(() => obterSupabase())
  const [carga, setCarga] = useState<{ readonly chave: string; readonly pedido: PedidoEstudante | null } | null>(null)
  const [versao, setVersao] = useState(0)
  const chave = usuarioId ? `${usuarioId}:${versao}` : 'sem-sessao'
  const atual = carga?.chave === chave ? carga : null
  const carregado = usuarioId === null || cliente === null || atual !== null

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useEffect(() => {
    if (!cliente || !usuarioId) return
    let vivo = true
    // O administrador lê todos os pedidos (RLS): o filtro garante o da própria conta.
    void cliente
      .from('pedidos_estudante')
      .select(COLUNAS)
      .eq('usuario', usuarioId)
      .order('enviado_em', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (vivo) setCarga({ chave, pedido: daLinhaPedido(data) })
      })
    return () => {
      vivo = false
    }
  }, [cliente, usuarioId, chave])

  const enviar = useCallback(
    async (dados: DadosEnvioPedido, arquivo: File): Promise<string | null> => {
      const c = obterSupabase()
      if (!c || !usuarioId) return FALHA_DE_REDE
      const caminho = caminhoDoComprovante(usuarioId, arquivo.name, new Date())
      const envio = await c.storage.from('comprovantes').upload(caminho, arquivo, { contentType: arquivo.type, upsert: false })
      if (envio.error) return FALHA_DE_REDE

      const { error } = await c.rpc('enviar_pedido_estudante', {
        p_instituicao: dados.instituicao.trim(),
        p_matricula: dados.matricula.trim(),
        p_periodo: dados.periodo,
        p_formatura: `${dados.formatura}-01`,
        p_arquivo: caminho,
      })
      if (error) {
        await c.storage.from('comprovantes').remove([caminho])
        return mensagemDoBanco(error)
      }
      setVersao((v) => v + 1)
      return null
    },
    [usuarioId],
  )

  const fecharAviso = useCallback(async (pedidoId: string) => {
    const c = obterSupabase()
    if (!c) return
    await c.rpc('fechar_aviso_estudante', { p_pedido: pedidoId })
    setVersao((v) => v + 1)
  }, [])

  return { pedido: atual?.pedido ?? null, carregado, enviar, fecharAviso, recarregar }
}
```

- [ ] **Passo 4: `TelaComprovarMatricula.tsx`**

```tsx
import { FileText } from 'lucide-react'
import { useId, useRef, useState, type FormEvent } from 'react'
import { ACEITA_ARQUIVO, formatarDataLonga, MENSAGEM_ERRO_PEDIDO, mesAtual, validarPedido, type PedidoEstudante } from '@/domain/pedidoEstudante.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import type { ValorPedidoEstudante } from '../../estado/usarPedidoEstudante.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { MolduraConta } from './MolduraConta.tsx'

interface TelaComprovarMatriculaProps {
  readonly email: string
  readonly pedido: PedidoEstudante | null
  readonly enviar: ValorPedidoEstudante['enviar']
  readonly aoEnviado: () => void
  readonly aoDepois: () => void
  readonly aoIrParaInicio: () => void
  /** Para os testes; na tela é o dia de hoje. */
  readonly hoje?: Date | undefined
}

const PERIODOS = Array.from({ length: 12 }, (_, i) => i + 1)
const BOTAO_TEXTO = 'inline-flex min-h-11 items-center self-center text-sm font-semibold text-primary underline-offset-4 hover:underline'

function Lado() {
  return (
    <>
      <div className="flex flex-col gap-3.5 rounded-3xl bg-card p-5">
        <p className="rotulo">Depois de enviar</p>
        <ol className="flex flex-col gap-3 text-sm">
          {['Você já usa o MetaNutri como Free.', 'Conferimos o comprovante em até 2 dias úteis.', 'Aprovado, o plano Estudante vale 12 meses ou até a formatura.'].map((t, i) => (
            <li key={t} className="flex gap-2.5">
              <span className="numeros grid size-6 shrink-0 place-content-center rounded-full bg-surfacerow text-xs font-semibold text-muted-foreground">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
      </div>
      <p className="text-xs text-muted-foreground">O comprovante é apagado 30 dias depois da análise.</p>
    </>
  )
}

/** Passo 2 da conta de estudante (spec conta-e-verificacao, US-B3; protótipo "Comprovar matrícula"). */
export function TelaComprovarMatricula({ email, pedido, enviar, aoEnviado, aoDepois, aoIrParaInicio, hoje = new Date() }: TelaComprovarMatriculaProps) {
  const id = useId()
  const anterior = pedido?.status === 'recusado' ? pedido : null
  const minimo = mesAtual(hoje)
  const [instituicao, setInstituicao] = useState(anterior?.instituicao ?? '')
  const [matricula, setMatricula] = useState(anterior?.matricula ?? '')
  const [periodo, setPeriodo] = useState<number | null>(anterior?.periodo ?? null)
  const [formatura, setFormatura] = useState(anterior && anterior.formatura >= minimo ? anterior.formatura : '')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  // Trava de verdade contra o clique duplo (CA-276).
  const enviandoRef = useRef(false)

  if (pedido?.status === 'em_analise') {
    return (
      <MolduraConta
        titulo="Comprovante em análise"
        subtitulo={`Enviado em ${formatarDataLonga(pedido.enviadoEm)}. Conferimos em até 2 dias úteis. Enquanto isso, use o MetaNutri como Free.`}
        aoIrParaInicio={aoIrParaInicio}
        lado={<Lado />}
      >
        <Button size="lg" block onClick={aoDepois}>
          Ir para o painel
        </Button>
      </MolduraConta>
    )
  }

  const enviarPedido = async (evento: FormEvent) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    const problema = validarPedido({ instituicao, matricula, periodo, formatura, arquivo: arquivo ? { tipo: arquivo.type, tamanho: arquivo.size } : null }, hoje)
    if (problema || periodo === null || arquivo === null) {
      setErro(MENSAGEM_ERRO_PEDIDO[problema ?? 'arquivo-vazio'])
      return
    }
    enviandoRef.current = true
    setEnviando(true)
    setErro(null)
    const falha = await enviar({ instituicao, matricula, periodo, formatura }, arquivo)
    enviandoRef.current = false
    setEnviando(false)
    if (falha) {
      setErro(falha)
      return
    }
    aoEnviado()
  }

  return (
    <MolduraConta
      titulo="Comprove sua matrícula"
      subtitulo="Passo 2 de 2. Analisamos em até 2 dias úteis."
      passo={{ atual: 2, total: 2 }}
      aoIrParaInicio={aoIrParaInicio}
      lado={<Lado />}
    >
      <AvisoFormulario tipo="ok">E-mail da faculdade confirmado: {email}</AvisoFormulario>
      {anterior ? <AvisoFormulario tipo="erro">O comprovante anterior não foi aprovado. Motivo: {anterior.motivo}.</AvisoFormulario> : null}

      <form onSubmit={(e) => void enviarPedido(e)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-instituicao`}>Instituição</Label>
          <Input id={`${id}-instituicao`} value={instituicao} onChange={(e) => setInstituicao(e.target.value)} placeholder="Universidade Federal do Rio Grande do Norte (UFRN)" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-curso`}>Curso</Label>
            <Input id={`${id}-curso`} value="Nutrição" readOnly className="bg-surfacerow text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-matricula`}>Matrícula</Label>
            <Input id={`${id}-matricula`} value={matricula} onChange={(e) => setMatricula(e.target.value)} spellCheck={false} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-periodo`}>Período atual</Label>
            <select
              id={`${id}-periodo`}
              value={periodo ?? ''}
              onChange={(e) => setPeriodo(e.target.value ? Number(e.target.value) : null)}
              className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Escolha</option>
              {PERIODOS.map((p) => (
                <option key={p} value={p}>{`${p}º`}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-formatura`}>Previsão de formatura</Label>
            <Input id={`${id}-formatura`} type="month" min={minimo} value={formatura} onChange={(e) => setFormatura(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-arquivo`}>Comprovante de matrícula</Label>
          <label
            htmlFor={`${id}-arquivo`}
            className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-borderstrong bg-surfacerow p-3.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            <span className="grid size-10 shrink-0 place-content-center rounded-md bg-lightprimary text-primary">
              <FileText className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-heading">{arquivo ? arquivo.name : 'Escolher arquivo'}</span>
              <span className="text-xs text-muted-foreground">{arquivo ? `${Math.max(1, Math.round(arquivo.size / 1024))} KB` : 'PDF, JPG ou PNG, até 5 MB'}</span>
            </span>
            <input id={`${id}-arquivo`} type="file" accept={ACEITA_ARQUIVO} className="sr-only" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
          </label>
          <p className="text-xs text-muted-foreground">Declaração ou atestado do semestre atual, com seu nome e a instituição.</p>
        </div>

        {erro ? <AvisoFormulario tipo="erro">{erro}</AvisoFormulario> : null}

        <Button type="submit" size="lg" block loading={enviando}>
          Enviar para análise
        </Button>
        <button type="button" onClick={aoDepois} className={BOTAO_TEXTO}>
          Fazer isso depois
        </button>
      </form>
    </MolduraConta>
  )
}
```

O `Label` aponta para o `input type="file"` escondido (`sr-only`), então `getByLabelText('Comprovante de matrícula')` acha o campo de arquivo. Confira que `border-borderstrong` existe nas classes do tema (`--color-borderstrong`, sim); se o lint reclamar, use `border-borderdefault`.

- [ ] **Passo 5: rodar e ver passar**

Rode: `npx vitest run src/ui/estado/usarPedidoEstudante.test.ts src/ui/publico/conta/TelaComprovarMatricula.test.tsx`
Esperado: PASS. Se o jsdom não aceitar `type="month"` com `fireEvent.change`, confira que o valor é `AAAA-MM` exato; é o formato que o jsdom aceita.

- [ ] **Passo 6: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/ui/estado/usarPedidoEstudante.ts src/ui/estado/usarPedidoEstudante.test.ts src/ui/publico/conta/TelaComprovarMatricula.tsx src/ui/publico/conta/TelaComprovarMatricula.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): comprovar matrícula com envio do comprovante`.

---

### Tarefa 7: Avisos no painel e exportação bloqueada

Cobre CA-279, CA-280, CA-285, CA-289, CA-290 e CB-65.

**Arquivos:**
- Criar: `src/ui/painel/AvisoEstudante.tsx`, `src/ui/painel/AvisoCrn.tsx`, `src/ui/painel/avisos.test.tsx`
- Alterar: `src/ui/painel/TelaPainel.tsx` (prop `aviso`)
- Alterar: `src/ui/exportar/MenuExportar.tsx` (prop `bloqueio`)

**Interfaces:**
- Consome: `AvisoEstudante` (tipo), `formatarDataLonga` (Tarefa 2); `PerfilConta`, `Crn`, `validarCrn`, `normalizarNumeroCrn`, `diasParaCorrigir`, `exportacaoBloqueada`, `MENSAGEM_ERRO_SITUACAO` (Tarefa 2); `CampoCrn` (Tarefa 4).
- Produz:
  - `AvisoEstudante({ aviso: NonNullable<AvisoEstudante>; aoEnviar: () => void; aoFechar: (pedidoId: string) => void })` (o componente se chama `AvisoDoEstudante` para não colidir com o tipo; o arquivo é `AvisoEstudante.tsx`)
  - `AvisoCrn({ perfil: PerfilConta; agora: Date; aoCorrigir: (crn: Crn) => Promise<string | null> })`, que não renderiza nada fora do "não encontrado"
  - `TelaPainel` com a prop nova `aviso?: ReactNode`
  - `MenuExportar` com a prop nova `bloqueio?: string | null`

- [ ] **Passo 1: escrever os testes que falham**

`src/ui/painel/avisos.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PerfilConta } from '@/domain/situacao.ts'
import { AvisoCrn } from './AvisoCrn.tsx'
import { AvisoDoEstudante } from './AvisoEstudante.tsx'

const nutri: PerfilConta = {
  nome: 'Ana',
  situacao: 'nutricionista',
  crn: { regiao: 6, numero: '12345' },
  statusCrn: 'nao_encontrado',
  crnDeclaradoEm: '2026-09-30T12:00:00Z',
  crnDecididoEm: '2026-10-01T12:00:00Z',
}

describe('AvisoDoEstudante (CA-279)', () => {
  it('falta enviar leva ao comprovante', async () => {
    const aoEnviar = vi.fn()
    render(<AvisoDoEstudante aviso={{ tipo: 'enviar' }} aoEnviar={aoEnviar} aoFechar={vi.fn()} />)
    expect(screen.getByText('Envie seu comprovante de matrícula')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Enviar comprovante' }))
    expect(aoEnviar).toHaveBeenCalledOnce()
  })

  it('em análise não tem botão', () => {
    render(<AvisoDoEstudante aviso={{ tipo: 'analise' }} aoEnviar={vi.fn()} aoFechar={vi.fn()} />)
    expect(screen.getByText('Comprovante em análise')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('recusado mostra o motivo e "Enviar outro"', () => {
    render(<AvisoDoEstudante aviso={{ tipo: 'recusado', motivo: 'Ilegível' }} aoEnviar={vi.fn()} aoFechar={vi.fn()} />)
    expect(screen.getByText('Motivo: Ilegível.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enviar outro' })).toBeInTheDocument()
  })

  it('CA-280: aprovado mostra a validade e fecha', async () => {
    const aoFechar = vi.fn()
    render(<AvisoDoEstudante aviso={{ tipo: 'aprovado', pedidoId: 'p1', expiraEm: '2027-07-31T23:59:59Z' }} aoEnviar={vi.fn()} aoFechar={aoFechar} />)
    expect(screen.getByText('Vale até 31 de julho de 2027.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Fechar aviso' }))
    expect(aoFechar).toHaveBeenCalledWith('p1')
  })

  it('CA-285: vencido pede renovação', () => {
    render(<AvisoDoEstudante aviso={{ tipo: 'renovar' }} aoEnviar={vi.fn()} aoFechar={vi.fn()} />)
    expect(screen.getByText('Seu plano Estudante venceu')).toBeInTheDocument()
  })
})

describe('AvisoCrn (CA-289 e CA-290)', () => {
  it('mostra o prazo e corrige', async () => {
    const aoCorrigir = vi.fn(async () => null)
    render(<AvisoCrn perfil={nutri} agora={new Date('2026-10-03T12:00:00Z')} aoCorrigir={aoCorrigir} />)
    expect(screen.getByText('Não encontramos seu CRN no conselho')).toBeInTheDocument()
    expect(screen.getByText(/5 dias para corrigir/)).toBeInTheDocument()
    const usuario = userEvent.setup()
    await usuario.clear(screen.getByRole('textbox', { name: 'Número do CRN' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Número do CRN' }), '12346')
    await usuario.click(screen.getByRole('button', { name: 'Corrigir CRN' }))
    expect(aoCorrigir).toHaveBeenCalledWith({ regiao: 6, numero: '12346' })
  })

  it('depois do prazo, avisa que exportar está bloqueado', () => {
    render(<AvisoCrn perfil={nutri} agora={new Date('2026-10-09T12:00:00Z')} aoCorrigir={vi.fn()} />)
    expect(screen.getByText('Exportar documentos está bloqueado até você corrigir o CRN.')).toBeInTheDocument()
  })

  it('não aparece para CRN em conferência', () => {
    const { container } = render(<AvisoCrn perfil={{ ...nutri, statusCrn: 'em_conferencia', crnDecididoEm: null }} agora={new Date()} aoCorrigir={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
```

Acrescente no fim de `src/ui/exportar/MenuExportar.test.tsx` (junte os imports aos que o arquivo já tem, sem repetir):

```tsx
import { criarCasoVazio } from '@/domain/caso.ts'
import { criarPlanoPadrao } from '@/domain/plano.ts'

it('CA-290: com bloqueio, o botão fica desligado e o motivo aparece', () => {
  render(<MenuExportar caso={criarCasoVazio('c1')} plano={criarPlanoPadrao(() => 'r')} bloqueio="Exportar está bloqueado até você corrigir o CRN, no painel." />)
  expect(screen.getByRole('button', { name: /Exportar/ })).toBeDisabled()
  expect(screen.getByText('Exportar está bloqueado até você corrigir o CRN, no painel.')).toBeInTheDocument()
})
```

Se o `MenuExportar` precisar de provedor no teste antigo (por exemplo, `ProvedorPacientes`), monte do mesmo jeito que os testes de lá.

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/painel/avisos.test.tsx src/ui/exportar`
Esperado: FAIL.

- [ ] **Passo 3: `AvisoEstudante.tsx`**

```tsx
import { CircleCheck, Clock, FileText, TriangleAlert, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatarDataLonga, type AvisoEstudante } from '@/domain/pedidoEstudante.ts'
import { cn } from '@/lib/utils'
import { Button } from '@ds/componentes/forms/button.tsx'

interface AvisoDoEstudanteProps {
  readonly aviso: NonNullable<AvisoEstudante>
  readonly aoEnviar: () => void
  readonly aoFechar: (pedidoId: string) => void
}

interface Tom {
  readonly icone: ReactNode
  readonly fundo: string
  readonly titulo: string
  readonly texto: string
}

function tomDo(aviso: NonNullable<AvisoEstudante>): Tom {
  switch (aviso.tipo) {
    case 'enviar':
      return { icone: <FileText aria-hidden="true" />, fundo: 'bg-lightwarning text-warningtext', titulo: 'Envie seu comprovante de matrícula', texto: 'Até a aprovação, sua conta funciona como Free.' }
    case 'renovar':
      return { icone: <FileText aria-hidden="true" />, fundo: 'bg-lightwarning text-warningtext', titulo: 'Seu plano Estudante venceu', texto: 'Envie o comprovante do semestre para renovar. Até lá, sua conta funciona como Free.' }
    case 'analise':
      return { icone: <Clock aria-hidden="true" />, fundo: 'bg-lightinfo text-infotext', titulo: 'Comprovante em análise', texto: 'Até 2 dias úteis. Enquanto isso, sua conta funciona como Free.' }
    case 'recusado':
      return { icone: <TriangleAlert aria-hidden="true" />, fundo: 'bg-lighterror text-errortext', titulo: 'Não conseguimos aprovar seu comprovante', texto: `Motivo: ${aviso.motivo}.` }
    case 'aprovado':
      return { icone: <CircleCheck aria-hidden="true" />, fundo: 'bg-lightsuccess text-successtext', titulo: 'Plano Estudante ativo', texto: `Vale até ${formatarDataLonga(aviso.expiraEm)}.` }
  }
}

/** O aviso da estudante no topo do painel (spec conta-e-verificacao, US-B4; protótipo "Aviso no painel"). */
export function AvisoDoEstudante({ aviso, aoEnviar, aoFechar }: AvisoDoEstudanteProps) {
  const tom = tomDo(aviso)
  return (
    <section aria-label="Plano Estudante" className="flex flex-wrap items-center gap-3.5 rounded-3xl bg-card p-4 sm:flex-nowrap sm:px-5">
      <span className={cn('grid size-10 shrink-0 place-content-center rounded-md [&_svg]:size-5', tom.fundo)}>{tom.icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-titulo text-base font-semibold text-heading">{tom.titulo}</span>
        <span className="text-sm text-muted-foreground">{tom.texto}</span>
      </span>
      {aviso.tipo === 'enviar' || aviso.tipo === 'renovar' ? (
        <Button size="sm" onClick={aoEnviar}>
          Enviar comprovante
        </Button>
      ) : null}
      {aviso.tipo === 'recusado' ? (
        <Button size="sm" onClick={aoEnviar}>
          Enviar outro
        </Button>
      ) : null}
      {aviso.tipo === 'aprovado' ? (
        <Button variant="ghost" size="icon" aria-label="Fechar aviso" onClick={() => aoFechar(aviso.pedidoId)}>
          <X aria-hidden="true" />
        </Button>
      ) : null}
    </section>
  )
}
```

- [ ] **Passo 4: `AvisoCrn.tsx`**

```tsx
import { TriangleAlert } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { diasParaCorrigir, exportacaoBloqueada, MENSAGEM_ERRO_SITUACAO, normalizarNumeroCrn, validarCrn, type Crn, type PerfilConta } from '@/domain/situacao.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { CampoCrn } from '../publico/conta/CampoCrn.tsx'

interface AvisoCrnProps {
  readonly perfil: PerfilConta
  readonly agora: Date
  readonly aoCorrigir: (crn: Crn) => Promise<string | null>
}

/** CA-289 e CA-290: o CRN que você não achou no conselho, com o prazo e a correção. */
export function AvisoCrn({ perfil, agora, aoCorrigir }: AvisoCrnProps) {
  const id = useId()
  const [regiao, setRegiao] = useState<number | null>(perfil.crn?.regiao ?? null)
  const [numero, setNumero] = useState(perfil.crn?.numero ?? '')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)

  if (perfil.statusCrn !== 'nao_encontrado') return null
  const dias = diasParaCorrigir(perfil, agora) ?? 0
  const bloqueado = exportacaoBloqueada(perfil, agora)

  const corrigir = async () => {
    if (enviandoRef.current) return
    const problema = validarCrn(regiao, numero)
    if (problema || regiao === null) {
      setErro(MENSAGEM_ERRO_SITUACAO[problema ?? 'crn-regiao'])
      return
    }
    enviandoRef.current = true
    setEnviando(true)
    const falha = await aoCorrigir({ regiao, numero: normalizarNumeroCrn(numero) })
    enviandoRef.current = false
    setEnviando(false)
    setErro(falha)
  }

  return (
    <section aria-label="CRN" className="flex flex-col gap-4 rounded-3xl bg-card p-5">
      <div className="flex items-start gap-3.5">
        <span className="grid size-10 shrink-0 place-content-center rounded-md bg-lighterror text-errortext">
          <TriangleAlert className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-titulo text-base font-semibold text-heading">Não encontramos seu CRN no conselho</p>
          <p className="text-sm text-muted-foreground">
            {bloqueado
              ? 'Exportar documentos está bloqueado até você corrigir o CRN.'
              : `Confira o número. Você tem ${dias} ${dias === 1 ? 'dia' : 'dias'} para corrigir; depois disso, exportar documentos fica bloqueado.`}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <CampoCrn
            id={id}
            regiao={regiao}
            numero={numero}
            aoMudar={(crn) => {
              setRegiao(crn.regiao)
              setNumero(crn.numero)
            }}
            invalido={erro !== null}
          />
        </div>
        <Button onClick={() => void corrigir()} loading={enviando}>
          Corrigir CRN
        </Button>
      </div>
      {erro ? (
        <p role="alert" className="text-sm text-errortext">
          {erro}
        </p>
      ) : null}
    </section>
  )
}
```

- [ ] **Passo 5: `TelaPainel` e `MenuExportar`**

1. `src/ui/painel/TelaPainel.tsx`: acrescente `import type { ReactNode } from 'react'` (junte com o import de React que já existir), a prop

```tsx
  /** Aviso da conta no topo (estudante ou CRN), montado pelo App. */
  readonly aviso?: ReactNode
```

receba `aviso` na função e, logo depois de `<div className="flex flex-col gap-6">` (o primeiro elemento do `return`), acrescente `{aviso}`.

2. `src/ui/exportar/MenuExportar.tsx`: acrescente a prop

```tsx
  /** Motivo para não exportar (CRN não encontrado depois do prazo, CA-290). */
  readonly bloqueio?: string | null | undefined
```

receba `bloqueio` e, no começo do `return`, antes do `<DropdownMenu>`, troque o `<p role="status" ...>` existente por uma condição: com `bloqueio`, mostre

```tsx
      {bloqueio ? (
        <p role="status" className="max-w-56 text-xs text-warningtext">
          {bloqueio}
        </p>
      ) : (
        /* o <p role="status"> que já existia, sem mudança */
      )}
```

e acrescente `disabled={Boolean(bloqueio)}` ao `<Button size="sm">` que abre o menu.

- [ ] **Passo 6: rodar e ver passar**

Rode: `npx vitest run src/ui/painel src/ui/exportar`
Esperado: PASS, inclusive os testes antigos do painel e do exportar.

- [ ] **Passo 7: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/ui/painel/AvisoEstudante.tsx src/ui/painel/AvisoCrn.tsx src/ui/painel/avisos.test.tsx src/ui/painel/TelaPainel.tsx src/ui/exportar
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(painel): avisos da estudante e do CRN, e exportar bloqueado`.

---

### Tarefa 8: Conta e plano com a situação e o Me formei

Cobre CA-282 a CA-288, CB-64 e os CA-156, CA-177 e CA-178 da `estilo-spora`. Substitui a Tarefa 25 da `estilo-spora`.

**Arquivos:**
- Criar: `src/ui/conta/CartaoSituacao.tsx`, `src/ui/conta/DialogoMeFormei.tsx`, `src/ui/conta/TelaConta.test.tsx`
- Alterar: `src/ui/conta/TelaConta.tsx`
- Alterar: `src/ui/fluxoConta.ts`, `src/ui/fluxoConta.test.ts` (`rotaDePlanos`)
- Alterar: `src/ui/missoes/CartaoLinkMissoes.tsx`, `src/ui/missoes/TelaAdesao.tsx` (`aoVerPlanos`)

**Interfaces:**
- Consome: `PerfilConta`, `formatarCrn`, `validarCrn`, `normalizarNumeroCrn`, `MENSAGEM_ERRO_SITUACAO`, `Crn` (Tarefa 2); `PedidoEstudante`, `formatarMesAno`, `formatarDataLonga` (Tarefa 2); `CampoCrn`, `CaixaDeclaracao` (Tarefa 4); `planoSeguinte` (`@/domain/conta.ts`); `Badge`, `Card`, `Dialog*`, `Button`.
- Produz:
  - `CartaoSituacao({ perfil: PerfilConta; pedido: PedidoEstudante | null; aoMeFormei: () => void })`
  - `DialogoMeFormei({ aberto: boolean; aoFechar: () => void; meFormei: (crn: Crn) => Promise<string | null>; aoFormado: () => void })`
  - `TelaConta` com as props novas `perfil: PerfilConta | null`, `pedido: PedidoEstudante | null`, `meFormei: (crn: Crn) => Promise<string | null>`, `aoMudouSituacao: () => void`, `aoSaiu: () => void`
  - `rotaDePlanos(atual: IdPlano): Rota`
  - `CartaoLinkMissoes` e `TelaAdesao` com `aoVerPlanos?: () => void`

- [ ] **Passo 1: escrever os testes que falham**

No fim de `src/ui/fluxoConta.test.ts` (acrescente `rotaDePlanos` ao import):

```ts
describe('limite leva a Preços (CA-177)', () => {
  it('abre Preços com o plano seguinte em destaque', () => {
    expect(rotaDePlanos('free')).toEqual({ tela: 'precos', destaque: 'solo' })
    expect(rotaDePlanos('solo')).toEqual({ tela: 'precos', destaque: 'pro' })
    expect(rotaDePlanos('clinica')).toEqual({ tela: 'precos' })
  })
})
```

`src/ui/conta/TelaConta.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Assinatura } from '@/domain/assinatura.ts'
import type { PedidoEstudante } from '@/domain/pedidoEstudante.ts'
import type { PerfilConta } from '@/domain/situacao.ts'
import { contaFalsa } from '../publico/conta/contaFalsa.test-utils.ts'
import { TelaConta } from './TelaConta.tsx'

const estado = vi.hoisted(() => ({
  assinatura: { plano: 'free', planoPedido: 'free', status: 'sem-assinatura', precoTravado: false, expiraEm: null } as Assinatura,
}))
vi.mock('../estado/usarAssinatura.ts', () => ({ useAssinatura: () => ({ assinatura: estado.assinatura, recarregar: vi.fn() }) }))

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

function montar(perfil: PerfilConta | null, pedido: PedidoEstudante | null = null, meFormei = vi.fn(async () => null as string | null)) {
  const conta = contaFalsa({ sessao: { id: 'u1', email: 'julia@ufrn.edu.br', nome: 'Júlia' } })
  const props = {
    conta,
    perfil,
    pedido,
    meFormei,
    aoMudouSituacao: vi.fn(),
    aoEntrar: vi.fn(),
    aoVerPrecos: vi.fn(),
    aoIrParaConfig: vi.fn(),
    aoAssinar: vi.fn(),
    aoSaiu: vi.fn(),
  }
  render(<TelaConta {...props} />)
  return { ...props, usuario: userEvent.setup() }
}

describe('TelaConta', () => {
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

  it('CA-284: no Estudante, mostra até quando vale', () => {
    estado.assinatura = { plano: 'estudante', planoPedido: 'estudante', status: 'ativa', precoTravado: false, expiraEm: '2027-07-31T23:59:59Z' }
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
})
```

Acrescente `afterEach(() => { estado.assinatura = { plano: 'free', planoPedido: 'free', status: 'sem-assinatura', precoTravado: false, expiraEm: null } })` dentro do `describe`.

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/fluxoConta.test.ts src/ui/conta/TelaConta.test.tsx`
Esperado: FAIL.

- [ ] **Passo 3: `rotaDePlanos` em `src/ui/fluxoConta.ts`**

Acrescente `planoSeguinte` ao import de `@/domain/conta.ts` e, no fim do arquivo:

```ts
/** Do aviso de limite para Preços, com o plano seguinte em destaque (CA-177). */
export function rotaDePlanos(atual: IdPlano): Rota {
  const seguinte = planoSeguinte(atual)
  return seguinte ? { tela: 'precos', destaque: seguinte } : { tela: 'precos' }
}
```

- [ ] **Passo 4: `CartaoSituacao.tsx`**

```tsx
import { BadgeCheck, GraduationCap } from 'lucide-react'
import { formatarDataLonga, formatarMesAno, type PedidoEstudante } from '@/domain/pedidoEstudante.ts'
import { formatarCrn, type PerfilConta, type StatusCrn } from '@/domain/situacao.ts'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'

interface CartaoSituacaoProps {
  readonly perfil: PerfilConta
  readonly pedido: PedidoEstudante | null
  readonly aoMeFormei: () => void
}

type Variante = 'lightSuccess' | 'lightInfo' | 'lightWarning' | 'lightError'

const SELO_CRN: Readonly<Record<StatusCrn, { readonly texto: string; readonly variante: Variante }>> = {
  em_conferencia: { texto: 'CRN em conferência', variante: 'lightInfo' },
  conferido: { texto: 'CRN conferido', variante: 'lightSuccess' },
  nao_encontrado: { texto: 'CRN não encontrado', variante: 'lightError' },
}

function seloDoPedido(pedido: PedidoEstudante | null): { readonly texto: string; readonly variante: Variante } {
  if (!pedido) return { texto: 'Falta enviar', variante: 'lightWarning' }
  if (pedido.status === 'aprovado') return { texto: 'Matrícula verificada', variante: 'lightSuccess' }
  if (pedido.status === 'em_analise') return { texto: 'Em análise', variante: 'lightInfo' }
  return { texto: 'Recusada', variante: 'lightError' }
}

function Dado({ rotulo, valor }: { readonly rotulo: string; readonly valor: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm font-semibold text-heading">{valor}</dd>
    </div>
  )
}

/** A situação da conta em Conta e plano (spec conta-e-verificacao, CA-282 e CA-283). */
export function CartaoSituacao({ perfil, pedido, aoMeFormei }: CartaoSituacaoProps) {
  if (perfil.situacao === 'nutricionista') {
    const selo = perfil.statusCrn ? SELO_CRN[perfil.statusCrn] : SELO_CRN.em_conferencia
    return (
      <Card className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BadgeCheck className="size-5 text-primary" aria-hidden="true" />
            <CardTitle>Nutricionista</CardTitle>
          </div>
          <Badge variant={selo.variante}>{selo.texto}</Badge>
        </div>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5">
          <Dado rotulo="CRN" valor={perfil.crn ? formatarCrn(perfil.crn) : 'Não informado'} />
          <Dado rotulo="Declarado em" valor={perfil.crnDeclaradoEm ? formatarDataLonga(perfil.crnDeclaradoEm) : '—'} />
        </dl>
        <p className="border-t border-border pt-3.5 text-sm text-muted-foreground">Você já pode usar tudo. Nome e CRN saem sozinhos nos documentos.</p>
      </Card>
    )
  }

  const selo = seloDoPedido(pedido)
  return (
    <Card className="gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <GraduationCap className="size-5 text-primary" aria-hidden="true" />
          <CardTitle>Estudante de Nutrição</CardTitle>
        </div>
        <Badge variant={selo.variante}>{selo.texto}</Badge>
      </div>
      {pedido ? (
        <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5">
          <Dado rotulo="Instituição" valor={pedido.instituicao} />
          <Dado rotulo="Previsão de formatura" valor={formatarMesAno(pedido.formatura)} />
          <Dado rotulo="Matrícula" valor={pedido.matricula} />
          <Dado rotulo="Verificada em" valor={pedido.status === 'aprovado' && pedido.decididoEm ? formatarDataLonga(pedido.decididoEm) : '—'} />
        </dl>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
        <span className="text-sm text-muted-foreground">Já se formou e tem CRN?</span>
        <Button variant="outline" onClick={aoMeFormei}>
          Me formei
        </Button>
      </div>
    </Card>
  )
}
```

- [ ] **Passo 5: `DialogoMeFormei.tsx`**

```tsx
import { TriangleAlert } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { MENSAGEM_ERRO_SITUACAO, normalizarNumeroCrn, validarCrn, type Crn } from '@/domain/situacao.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import { CaixaDeclaracao } from '../publico/conta/CaixaDeclaracao.tsx'
import { CampoCrn } from '../publico/conta/CampoCrn.tsx'

interface DialogoMeFormeiProps {
  readonly aberto: boolean
  readonly aoFechar: () => void
  readonly meFormei: (crn: Crn) => Promise<string | null>
  readonly aoFormado: () => void
}

/** CA-286 a CA-288: a única troca de situação que existe na tela, e ela pede o CRN. */
export function DialogoMeFormei({ aberto, aoFechar, meFormei, aoFormado }: DialogoMeFormeiProps) {
  const id = useId()
  const [regiao, setRegiao] = useState<number | null>(null)
  const [numero, setNumero] = useState('')
  const [declarou, setDeclarou] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)

  const confirmar = async () => {
    if (enviandoRef.current) return
    const problema = validarCrn(regiao, numero) ?? (declarou ? null : 'declaracao-crn')
    if (problema || regiao === null) {
      setErro(MENSAGEM_ERRO_SITUACAO[problema ?? 'crn-regiao'])
      return
    }
    enviandoRef.current = true
    setEnviando(true)
    const falha = await meFormei({ regiao, numero: normalizarNumeroCrn(numero) })
    enviandoRef.current = false
    setEnviando(false)
    if (falha) {
      setErro(falha)
      return
    }
    aoFormado()
  }

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => (abrir ? undefined : aoFechar())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Me formei</DialogTitle>
          <DialogDescription>Informe seu CRN para a conta passar a ser de nutricionista.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <CampoCrn
            id={id}
            regiao={regiao}
            numero={numero}
            aoMudar={(crn) => {
              setRegiao(crn.regiao)
              setNumero(crn.numero)
            }}
            invalido={erro !== null && !declarou}
          />
          <CaixaDeclaracao id={`${id}-declara`} marcada={declarou} aoMudar={setDeclarou}>
            Declaro que este CRN é meu e está ativo.
          </CaixaDeclaracao>
          <div className="flex items-start gap-2 rounded-xl bg-lightwarning p-3 text-sm text-warningtext">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>O plano Estudante termina agora e a conta vai para o Free. Seus planos alimentares e pacientes continuam salvos.</p>
          </div>
          {erro ? (
            <p role="alert" className="text-sm text-errortext">
              {erro}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button onClick={() => void confirmar()} loading={enviando}>
            Mudar para nutricionista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

O `DialogContent` do projeto já desenha um botão de fechar chamado "Fechar"; o teste do CA-288 usa o "Cancelar", que é outro botão.

- [ ] **Passo 6: `TelaConta.tsx`**

1. Acrescente os imports:

```tsx
import { formatarDataLonga, type PedidoEstudante } from '@/domain/pedidoEstudante.ts'
import type { Crn, PerfilConta } from '@/domain/situacao.ts'
import { CartaoSituacao } from './CartaoSituacao.tsx'
import { DialogoMeFormei } from './DialogoMeFormei.tsx'
```

2. Acrescente às props:

```tsx
  /** Situação e CRN (spec conta-e-verificacao). Nulo no modo local, sem servidor. */
  readonly perfil: PerfilConta | null
  readonly pedido: PedidoEstudante | null
  readonly meFormei: (crn: Crn) => Promise<string | null>
  /** Avisa o App para reler o perfil e a assinatura depois do "Me formei". */
  readonly aoMudouSituacao: () => void
  readonly aoSaiu: () => void
```

3. Receba as props novas. Troque `const { assinatura } = useAssinatura(conta.sessao !== null)` por `const { assinatura, recarregar } = useAssinatura(conta.sessao !== null)` e acrescente `const [formando, setFormando] = useState(false)`.

4. Troque `sair` por:

```tsx
  const sair = async () => {
    setSaindo(true)
    await conta.sair()
    setSaindo(false)
    aoSaiu()
  }
```

5. Entre o cartão "Sua conta" e o cartão "Seu plano", acrescente:

```tsx
      {perfil ? <CartaoSituacao perfil={perfil} pedido={pedido} aoMeFormei={() => setFormando(true)} /> : null}
```

6. Logo depois do bloco que mostra o nome e o preço do plano (a `div` com `BadgeCheck`), acrescente:

```tsx
        {assinatura.plano === 'estudante' && assinatura.expiraEm ? (
          <p className="text-sm text-muted-foreground">{`Vale até ${formatarDataLonga(assinatura.expiraEm)}.`}</p>
        ) : null}
```

7. No fim do `return`, antes do último `</div>`, acrescente:

```tsx
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
```

- [ ] **Passo 7: aviso de limite com "Ver planos"**

Em `src/ui/missoes/CartaoLinkMissoes.tsx`, acrescente à interface

```tsx
  /** Leva a Preços quando o limite de links acaba (CA-177). */
  readonly aoVerPlanos?: (() => void) | undefined
```

receba `aoVerPlanos` e troque o `<p>` do limite de links por:

```tsx
              <div className="mt-4 rounded-xl border border-statelow/40 bg-lightwarning p-3 text-sm text-warningtext">
                <p>
                  Você usou {planoAtual?.limiteLinksPaciente} de {planoAtual?.limiteLinksPaciente} links de missões do seu plano. Apague um acompanhamento em
                  Adesão ou mude de plano para gerar outro.
                </p>
                {aoVerPlanos ? (
                  <Button size="sm" variant="outline" className="mt-2" onClick={aoVerPlanos}>
                    Ver planos
                  </Button>
                ) : null}
              </div>
```

Em `src/ui/missoes/TelaAdesao.tsx`, acrescente a mesma prop e, dentro do cartão "Pacientes ativos", logo depois do último `<p>`:

```tsx
          {limite.excedeu && aoVerPlanos ? (
            <Button size="sm" variant="outline" className="mt-2" onClick={aoVerPlanos}>
              Ver planos
            </Button>
          ) : null}
```

Nada é apagado nem escondido: só o botão novo aparece (CA-178).

- [ ] **Passo 8: rodar e ver passar**

Rode: `npx vitest run src/ui/fluxoConta.test.ts src/ui/conta src/ui/missoes`
Esperado: PASS. O typecheck vai acusar o `App.tsx` chamando `TelaConta` sem as props novas: isso é da Tarefa 12. Para fechar esta tarefa com `npm run check` verde, passe no `App.tsx`, por enquanto, `perfil={null} pedido={null} meFormei={async () => null} aoMudouSituacao={() => undefined} aoSaiu={() => navegar({ tela: 'inicio' })}`; a Tarefa 12 troca pelos valores reais.

- [ ] **Passo 9: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/ui/conta src/ui/fluxoConta.ts src/ui/fluxoConta.test.ts src/ui/missoes/CartaoLinkMissoes.tsx src/ui/missoes/TelaAdesao.tsx src/App.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): situação em Conta e plano, Me formei e limite que leva a Preços`.

---

### Tarefa 9: Aprovações

Cobre CA-291 a CA-297, CA-299, CB-61, CB-62, CB-66 e os itens 3 e 4 do foco de revisão.

**Arquivos:**
- Criar: `src/domain/aprovacoes.ts`, `src/domain/aprovacoes.test.ts`
- Criar: `src/ui/estado/usarAprovacoes.ts`, `src/ui/estado/usarAprovacoes.test.ts`
- Criar: `src/ui/aprovacoes/TelaAprovacoes.tsx`, `src/ui/aprovacoes/AbaEstudantes.tsx`, `src/ui/aprovacoes/AbaCrn.tsx`, `src/ui/aprovacoes/TelaAprovacoes.test.tsx`
- Alterar: `src/ui/layout/MenuLateral.tsx`, `src/ui/layout/Estrutura.tsx` (item "Aprovações")

**Interfaces:**
- Consome: `Crn`, `StatusCrn`, `formatarCrn` (Tarefa 2); `formatarMesAno`, `formatarDataLonga`, `MOTIVOS_RECUSA` (Tarefa 2); `mensagemDoBanco`, `FALHA_DE_REDE` (Tarefa 3); `SeletorSegmentado`, `Badge`, `Card`, `Button`, `ItemMenu`.
- Produz:
  - `interface PedidoParaAprovar { id; usuario; nome; email; instituicao; matricula; periodo: number; formatura: string; enviadoEm: string; arquivo: string | null }`, `daLinhaPedidoParaAprovar(linha): PedidoParaAprovar | null`
  - `interface CrnParaConferir { usuario; nome; email; crn: Crn; contaCriadaEm: string; status: StatusCrn; decididoEm: string | null }`, `daLinhaCrnParaConferir(linha): CrnParaConferir | null`
  - `contarPendentes(pedidos, crns): { estudantes: number; crn: number; total: number }`
  - `URL_CONSULTA_CFN = 'https://cnn.cfn.org.br/application/index/consulta-nacional'`
  - `interface ValorAprovacoes { pedidos; crns; pendentes; carregado: boolean; erro: string | null; decidirPedido(id, aprovar, motivo): Promise<string | null>; decidirCrn(usuario, status): Promise<string | null>; abrirComprovante(caminho): Promise<string | null>; recarregar(): void }`
  - `useAprovacoes(ativo: boolean): ValorAprovacoes`
  - `TelaAprovacoes({ aprovacoes: ValorAprovacoes })`
  - `MenuLateral` e `Estrutura` com a prop nova `aprovacoesPendentes?: number | null` (nulo ou ausente = não é administrador, sem item no menu)

- [ ] **Passo 1: escrever os testes que falham**

`src/domain/aprovacoes.test.ts`:

```ts
import { contarPendentes, daLinhaCrnParaConferir, daLinhaPedidoParaAprovar } from './aprovacoes.ts'

describe('aprovações', () => {
  it('lê o pedido da fila', () => {
    expect(
      daLinhaPedidoParaAprovar({
        id: 'p1',
        usuario: 'u1',
        nome: 'Júlia Martins',
        email: 'julia@ufrn.edu.br',
        instituicao: 'UFRN',
        matricula: '20230045871',
        periodo: 7,
        formatura: '2027-07-01',
        enviado_em: '2026-09-30T13:42:00Z',
        arquivo: 'u1/1-declaracao.pdf',
      }),
    ).toEqual({
      id: 'p1',
      usuario: 'u1',
      nome: 'Júlia Martins',
      email: 'julia@ufrn.edu.br',
      instituicao: 'UFRN',
      matricula: '20230045871',
      periodo: 7,
      formatura: '2027-07',
      enviadoEm: '2026-09-30T13:42:00Z',
      arquivo: 'u1/1-declaracao.pdf',
    })
    expect(daLinhaPedidoParaAprovar({ id: 1 })).toBeNull()
  })

  it('lê o CRN da fila', () => {
    expect(
      daLinhaCrnParaConferir({
        usuario: 'u2',
        nome: 'Ana Souza',
        email: 'ana@gmail.com',
        crn_regiao: 6,
        crn_numero: '12345',
        conta_criada_em: '2026-09-30T12:00:00Z',
        crn_status: 'em_conferencia',
        crn_decidido_em: null,
      }),
    ).toEqual({
      usuario: 'u2',
      nome: 'Ana Souza',
      email: 'ana@gmail.com',
      crn: { regiao: 6, numero: '12345' },
      contaCriadaEm: '2026-09-30T12:00:00Z',
      status: 'em_conferencia',
      decididoEm: null,
    })
  })

  it('CA-291: conta só o que está pendente', () => {
    const crn = { usuario: 'u', nome: '', email: '', crn: { regiao: 6, numero: '1' }, contaCriadaEm: '', decididoEm: null }
    expect(contarPendentes([{} as never, {} as never], [{ ...crn, status: 'em_conferencia' }, { ...crn, status: 'conferido' }])).toEqual({ estudantes: 2, crn: 1, total: 3 })
  })
})
```

`src/ui/estado/usarAprovacoes.test.ts`:

```ts
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAprovacoes } from './usarAprovacoes.ts'

const banco = vi.hoisted(() => ({
  respostas: {} as Record<string, { data: unknown; error: unknown }>,
  chamadas: [] as { funcao: string; args: unknown }[],
  removidos: [] as string[][],
}))

const cliente = {
  rpc: async (funcao: string, args?: unknown) => {
    banco.chamadas.push({ funcao, args })
    return banco.respostas[funcao] ?? { data: null, error: null }
  },
  storage: {
    from: () => ({
      remove: async (caminhos: string[]) => {
        banco.removidos.push(caminhos)
        return { error: null }
      },
      createSignedUrl: async (caminho: string) => ({ data: { signedUrl: `https://assinado/${caminho}` }, error: null }),
    }),
  },
}

vi.mock('./supabase.ts', () => ({ obterSupabase: () => cliente, supabaseConfigurado: () => true }))

const pedido = { id: 'p1', usuario: 'u1', nome: 'Júlia', email: 'j@ufrn.edu.br', instituicao: 'UFRN', matricula: '123', periodo: 7, formatura: '2027-07-01', enviado_em: '2026-09-30T13:00:00Z', arquivo: 'u1/a.pdf' }

describe('useAprovacoes', () => {
  beforeEach(() => {
    banco.respostas = {
      pedidos_em_analise: { data: [pedido], error: null },
      crn_para_conferir: { data: [], error: null },
      comprovantes_para_apagar: { data: [{ caminho: 'u9/velho.pdf' }], error: null },
    }
    banco.chamadas = []
    banco.removidos = []
  })

  it('carrega as duas filas e conta o pendente', async () => {
    const { result } = renderHook(() => useAprovacoes(true))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    expect(result.current.pedidos).toHaveLength(1)
    expect(result.current.pendentes.total).toBe(1)
  })

  it('CA-299: apaga os comprovantes vencidos e marca no banco', async () => {
    renderHook(() => useAprovacoes(true))
    await waitFor(() => expect(banco.removidos).toEqual([['u9/velho.pdf']]))
    await waitFor(() => expect(banco.chamadas).toContainEqual({ funcao: 'marcar_comprovantes_apagados', args: { p_caminhos: ['u9/velho.pdf'] } }))
  })

  it('CA-294: aprovar chama o banco e recarrega', async () => {
    const { result } = renderHook(() => useAprovacoes(true))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    let erro: string | null = 'x'
    await act(async () => {
      erro = await result.current.decidirPedido('p1', true, null)
    })
    expect(erro).toBeNull()
    expect(banco.chamadas).toContainEqual({ funcao: 'decidir_pedido', args: { p_pedido: 'p1', p_aprovar: true, p_motivo: null } })
    expect(banco.chamadas.filter((c) => c.funcao === 'pedidos_em_analise').length).toBeGreaterThan(1)
  })

  it('foco 4 e CB-61: pedido já decidido devolve a mensagem e recarrega a lista', async () => {
    const { result } = renderHook(() => useAprovacoes(true))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    banco.respostas['decidir_pedido'] = { data: null, error: { message: 'Este pedido já foi decidido.', code: 'P0001' } }
    banco.respostas['pedidos_em_analise'] = { data: [], error: null }
    let erro: string | null = null
    await act(async () => {
      erro = await result.current.decidirPedido('p1', false, 'Ilegível')
    })
    expect(erro).toBe('Este pedido já foi decidido.')
    await waitFor(() => expect(result.current.pedidos).toHaveLength(0))
  })

  it('abre o comprovante por endereço temporário', async () => {
    const { result } = renderHook(() => useAprovacoes(true))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    let url: string | null = null
    await act(async () => {
      url = await result.current.abrirComprovante('u1/a.pdf')
    })
    expect(url).toBe('https://assinado/u1/a.pdf')
  })

  it('desligado, não chama nada', () => {
    renderHook(() => useAprovacoes(false))
    expect(banco.chamadas).toEqual([])
  })
})
```

`src/ui/aprovacoes/TelaAprovacoes.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CrnParaConferir, PedidoParaAprovar } from '@/domain/aprovacoes.ts'
import type { ValorAprovacoes } from '../estado/usarAprovacoes.ts'
import { TelaAprovacoes } from './TelaAprovacoes.tsx'

const pedido = (id: string, nome: string, enviadoEm: string): PedidoParaAprovar => ({
  id,
  usuario: `u-${id}`,
  nome,
  email: `${id}@ufrn.edu.br`,
  instituicao: 'UFRN',
  matricula: '20230045871',
  periodo: 7,
  formatura: '2027-07',
  enviadoEm,
  arquivo: `u-${id}/a.pdf`,
})

const crn: CrnParaConferir = {
  usuario: 'u2',
  nome: 'Ana Souza',
  email: 'ana@gmail.com',
  crn: { regiao: 6, numero: '12345' },
  contaCriadaEm: '2026-09-30T12:00:00Z',
  status: 'em_conferencia',
  decididoEm: null,
}

function aprovacoes(sobre: Partial<ValorAprovacoes> = {}): ValorAprovacoes {
  return {
    pedidos: [pedido('p1', 'Carla Dias', '2026-09-28T10:00:00Z'), pedido('p2', 'Júlia Martins', '2026-09-30T13:42:00Z')],
    crns: [crn],
    pendentes: { estudantes: 2, crn: 1, total: 3 },
    carregado: true,
    erro: null,
    decidirPedido: vi.fn(async () => null),
    decidirCrn: vi.fn(async () => null),
    abrirComprovante: vi.fn(async () => 'https://assinado/x'),
    recarregar: vi.fn(),
    ...sobre,
  }
}

describe('TelaAprovacoes', () => {
  it('CA-291: duas abas com o total pendente', () => {
    render(<TelaAprovacoes aprovacoes={aprovacoes()} />)
    expect(screen.getByRole('radio', { name: /Estudantes 2/ })).toBeChecked()
    expect(screen.getByRole('radio', { name: /CRN 1/ })).toBeInTheDocument()
  })

  it('CA-293: abre o mais antigo primeiro, com os dados e a lista do que conferir', () => {
    render(<TelaAprovacoes aprovacoes={aprovacoes()} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Carla Dias' })).toBeInTheDocument()
    expect(screen.getByText('E-mail da faculdade confirmado')).toBeInTheDocument()
    expect(screen.getByText('julho de 2027')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Semestre atual' })).toBeInTheDocument()
  })

  it('CA-294: aprovar chama a decisão do pedido aberto', async () => {
    const valor = aprovacoes()
    render(<TelaAprovacoes aprovacoes={valor} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Aprovar' }))
    expect(valor.decidirPedido).toHaveBeenCalledWith('p1', true, null)
  })

  it('CA-295: recusar exige o motivo', async () => {
    const valor = aprovacoes()
    render(<TelaAprovacoes aprovacoes={valor} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Recusar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha o motivo da recusa.')
    expect(valor.decidirPedido).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('radio', { name: 'Ilegível' }))
    await usuario.click(screen.getByRole('button', { name: 'Recusar' }))
    expect(valor.decidirPedido).toHaveBeenCalledWith('p1', false, 'Ilegível')
  })

  it('CA-295: "Outro motivo" pede o texto', async () => {
    const valor = aprovacoes()
    render(<TelaAprovacoes aprovacoes={valor} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('radio', { name: 'Outro motivo' }))
    await usuario.type(screen.getByRole('textbox', { name: 'Motivo' }), 'Documento de outra pessoa')
    await usuario.click(screen.getByRole('button', { name: 'Recusar' }))
    expect(valor.decidirPedido).toHaveBeenCalledWith('p1', false, 'Documento de outra pessoa')
  })

  it('foco 3: clique duplo em Aprovar decide uma vez', async () => {
    let terminar: (v: string | null) => void = () => undefined
    const valor = aprovacoes({ decidirPedido: vi.fn(() => new Promise<string | null>((r) => (terminar = r))) })
    render(<TelaAprovacoes aprovacoes={valor} />)
    await userEvent.setup().dblClick(screen.getByRole('button', { name: 'Aprovar' }))
    terminar(null)
    expect(valor.decidirPedido).toHaveBeenCalledTimes(1)
  })

  it('CB-61: decisão recusada pelo banco aparece na tela', async () => {
    const valor = aprovacoes({ decidirPedido: vi.fn(async () => 'Este pedido já foi decidido.') })
    render(<TelaAprovacoes aprovacoes={valor} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Aprovar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Este pedido já foi decidido.')
  })

  it('CA-296: aba CRN com o link do CFN e as duas decisões', async () => {
    const valor = aprovacoes()
    render(<TelaAprovacoes aprovacoes={valor} />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('radio', { name: /CRN 1/ }))
    expect(screen.getByRole('link', { name: /Abrir a Consulta Nacional do CFN/ })).toHaveAttribute('href', 'https://cnn.cfn.org.br/application/index/consulta-nacional')
    expect(screen.getByText('CRN-6 12345')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Conferido' }))
    expect(valor.decidirCrn).toHaveBeenCalledWith('u2', 'conferido')
  })

  it('fila vazia diz que não há nada pendente', () => {
    render(<TelaAprovacoes aprovacoes={aprovacoes({ pedidos: [], pendentes: { estudantes: 0, crn: 1, total: 1 } })} />)
    expect(screen.getByText('Nenhum comprovante esperando você.')).toBeInTheDocument()
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/domain/aprovacoes.test.ts src/ui/estado/usarAprovacoes.test.ts src/ui/aprovacoes`
Esperado: FAIL.

- [ ] **Passo 3: `src/domain/aprovacoes.ts`**

```ts
// As filas do administrador: comprovantes de estudante e CRN para conferir
// (spec conta-e-verificacao, US-B8). Os dados vêm das funções do banco.
import type { Crn, StatusCrn } from './situacao.ts'

export const URL_CONSULTA_CFN = 'https://cnn.cfn.org.br/application/index/consulta-nacional'

export interface PedidoParaAprovar {
  readonly id: string
  readonly usuario: string
  readonly nome: string
  readonly email: string
  readonly instituicao: string
  readonly matricula: string
  readonly periodo: number
  /** AAAA-MM. */
  readonly formatura: string
  readonly enviadoEm: string
  /** Nulo depois que o arquivo foi apagado. */
  readonly arquivo: string | null
}

export interface CrnParaConferir {
  readonly usuario: string
  readonly nome: string
  readonly email: string
  readonly crn: Crn
  readonly contaCriadaEm: string
  readonly status: StatusCrn
  readonly decididoEm: string | null
}

const txt = (v: unknown): string => (typeof v === 'string' ? v : '')

export function daLinhaPedidoParaAprovar(linha: unknown): PedidoParaAprovar | null {
  if (typeof linha !== 'object' || linha === null) return null
  const o = linha as Record<string, unknown>
  if (typeof o['id'] !== 'string' || typeof o['usuario'] !== 'string') return null
  return {
    id: o['id'],
    usuario: o['usuario'],
    nome: txt(o['nome']),
    email: txt(o['email']),
    instituicao: txt(o['instituicao']),
    matricula: txt(o['matricula']),
    periodo: typeof o['periodo'] === 'number' ? o['periodo'] : 0,
    formatura: txt(o['formatura']).slice(0, 7),
    enviadoEm: txt(o['enviado_em']),
    arquivo: typeof o['arquivo'] === 'string' ? o['arquivo'] : null,
  }
}

const STATUS: readonly string[] = ['em_conferencia', 'conferido', 'nao_encontrado']

export function daLinhaCrnParaConferir(linha: unknown): CrnParaConferir | null {
  if (typeof linha !== 'object' || linha === null) return null
  const o = linha as Record<string, unknown>
  const status = o['crn_status']
  if (typeof o['usuario'] !== 'string' || typeof o['crn_regiao'] !== 'number' || typeof status !== 'string' || !STATUS.includes(status)) return null
  return {
    usuario: o['usuario'],
    nome: txt(o['nome']),
    email: txt(o['email']),
    crn: { regiao: o['crn_regiao'], numero: txt(o['crn_numero']) },
    contaCriadaEm: txt(o['conta_criada_em']),
    status: status as StatusCrn,
    decididoEm: typeof o['crn_decidido_em'] === 'string' ? o['crn_decidido_em'] : null,
  }
}

export interface Pendentes {
  readonly estudantes: number
  readonly crn: number
  readonly total: number
}

/** CA-291: o que ainda espera decisão. Os CRN decididos nos últimos 30 dias não contam. */
export function contarPendentes(pedidos: readonly PedidoParaAprovar[], crns: readonly CrnParaConferir[]): Pendentes {
  const crn = crns.filter((c) => c.status === 'em_conferencia').length
  return { estudantes: pedidos.length, crn, total: pedidos.length + crn }
}
```

- [ ] **Passo 4: `src/ui/estado/usarAprovacoes.ts`**

```ts
// As filas do administrador e as decisões. Cada chamada é conferida no banco
// (eh_admin): esconder a tela de quem não é administrador é só conforto (CA-297).
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  contarPendentes,
  daLinhaCrnParaConferir,
  daLinhaPedidoParaAprovar,
  type CrnParaConferir,
  type PedidoParaAprovar,
  type Pendentes,
} from '@/domain/aprovacoes.ts'
import type { StatusCrn } from '@/domain/situacao.ts'
import { FALHA_DE_REDE, mensagemDoBanco } from './mensagemDoBanco.ts'
import { obterSupabase } from './supabase.ts'

export interface ValorAprovacoes {
  readonly pedidos: readonly PedidoParaAprovar[]
  readonly crns: readonly CrnParaConferir[]
  readonly pendentes: Pendentes
  readonly carregado: boolean
  readonly erro: string | null
  readonly decidirPedido: (id: string, aprovar: boolean, motivo: string | null) => Promise<string | null>
  readonly decidirCrn: (usuario: string, status: StatusCrn) => Promise<string | null>
  /** Endereço temporário (5 minutos) para abrir o comprovante. */
  readonly abrirComprovante: (caminho: string) => Promise<string | null>
  readonly recarregar: () => void
}

interface Carga {
  readonly versao: number
  readonly pedidos: readonly PedidoParaAprovar[]
  readonly crns: readonly CrnParaConferir[]
  readonly erro: string | null
}

const lista = <T,>(dados: unknown, ler: (linha: unknown) => T | null): T[] =>
  Array.isArray(dados) ? dados.map(ler).filter((x): x is T => x !== null) : []

export function useAprovacoes(ativo: boolean): ValorAprovacoes {
  const [cliente] = useState(() => obterSupabase())
  const [carga, setCarga] = useState<Carga | null>(null)
  const [versao, setVersao] = useState(0)
  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useEffect(() => {
    if (!cliente || !ativo) return
    let vivo = true
    void Promise.all([cliente.rpc('pedidos_em_analise'), cliente.rpc('crn_para_conferir')]).then(([pedidos, crns]) => {
      if (!vivo) return
      setCarga({
        versao,
        pedidos: lista(pedidos.data, daLinhaPedidoParaAprovar),
        crns: lista(crns.data, daLinhaCrnParaConferir),
        erro: pedidos.error || crns.error ? mensagemDoBanco(pedidos.error ?? crns.error) : null,
      })
    })
    return () => {
      vivo = false
    }
  }, [cliente, ativo, versao])

  // CA-299: a limpeza dos 30 dias acontece quando o administrador abre o app.
  useEffect(() => {
    if (!cliente || !ativo) return
    void cliente.rpc('comprovantes_para_apagar').then(async ({ data }) => {
      const caminhos = lista(data, (l) => (typeof l === 'object' && l !== null && typeof (l as { caminho?: unknown }).caminho === 'string' ? (l as { caminho: string }).caminho : null))
      if (caminhos.length === 0) return
      const { error } = await cliente.storage.from('comprovantes').remove(caminhos)
      if (!error) await cliente.rpc('marcar_comprovantes_apagados', { p_caminhos: caminhos })
    })
  }, [cliente, ativo])

  const decidir = useCallback(async (funcao: string, args: Record<string, unknown>): Promise<string | null> => {
    const c = obterSupabase()
    if (!c) return FALHA_DE_REDE
    const { error } = await c.rpc(funcao, args)
    // Recarrega mesmo no erro: "já foi decidido" precisa sumir da lista (CB-61).
    setVersao((v) => v + 1)
    return error ? mensagemDoBanco(error) : null
  }, [])

  const decidirPedido = useCallback(
    (id: string, aprovar: boolean, motivo: string | null) => decidir('decidir_pedido', { p_pedido: id, p_aprovar: aprovar, p_motivo: motivo }),
    [decidir],
  )
  const decidirCrn = useCallback((usuario: string, status: StatusCrn) => decidir('decidir_crn', { p_usuario: usuario, p_status: status }), [decidir])

  const abrirComprovante = useCallback(async (caminho: string): Promise<string | null> => {
    const c = obterSupabase()
    if (!c) return null
    const { data, error } = await c.storage.from('comprovantes').createSignedUrl(caminho, 300)
    return error ? null : data.signedUrl
  }, [])

  const pedidos = carga?.pedidos ?? []
  const crns = carga?.crns ?? []
  const pendentes = useMemo(() => contarPendentes(pedidos, crns), [pedidos, crns])

  return {
    pedidos,
    crns,
    pendentes,
    carregado: !ativo || cliente === null || carga !== null,
    erro: carga?.erro ?? null,
    decidirPedido,
    decidirCrn,
    abrirComprovante,
    recarregar,
  }
}
```

Os dois `useEffect` não fazem `setState` síncrono; o primeiro guarda a carga com a `versao` lida. Se o lint acusar `react-hooks/exhaustive-deps` no segundo efeito, ele está certo como está (só depende de `cliente` e `ativo`).

- [ ] **Passo 5: `AbaEstudantes.tsx`**

```tsx
import { Check, ExternalLink, FileText, GraduationCap, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import type { PedidoParaAprovar } from '@/domain/aprovacoes.ts'
import { formatarDataLonga, formatarMesAno, MOTIVOS_RECUSA } from '@/domain/pedidoEstudante.ts'
import { cn } from '@/lib/utils'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import type { ValorAprovacoes } from '../estado/usarAprovacoes.ts'

interface AbaEstudantesProps {
  readonly pedidos: readonly PedidoParaAprovar[]
  readonly decidirPedido: ValorAprovacoes['decidirPedido']
  readonly abrirComprovante: ValorAprovacoes['abrirComprovante']
}

const OUTRO = 'Outro motivo'
const CONFERIR = ['Nome igual ao da conta', 'Curso de Nutrição', 'Semestre atual', 'Mesma instituição do e-mail']

function Dado({ rotulo, valor }: { readonly rotulo: string; readonly valor: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm font-semibold text-heading">{valor}</dd>
    </div>
  )
}

/** Fila de comprovantes, do mais antigo para o mais novo (CA-293 a CA-295). */
export function AbaEstudantes({ pedidos, decidirPedido, abrirComprovante }: AbaEstudantesProps) {
  const id = useId()
  const [abertoId, setAbertoId] = useState<string | null>(null)
  const [motivo, setMotivo] = useState<string | null>(null)
  const [outro, setOutro] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [decidindo, setDecidindo] = useState(false)
  const decidindoRef = useRef(false)

  const aberto = pedidos.find((p) => p.id === abertoId) ?? pedidos[0] ?? null

  if (!aberto) {
    return <p className="rounded-3xl bg-card p-6 text-sm text-muted-foreground">Nenhum comprovante esperando você.</p>
  }

  const escolher = (pedidoId: string) => {
    setAbertoId(pedidoId)
    setMotivo(null)
    setOutro('')
    setErro(null)
  }

  const decidir = async (aprovar: boolean) => {
    if (decidindoRef.current) return
    const texto = motivo === OUTRO ? outro.trim() : motivo
    if (!aprovar && !texto) {
      setErro('Escolha o motivo da recusa.')
      return
    }
    decidindoRef.current = true
    setDecidindo(true)
    const falha = await decidirPedido(aberto.id, aprovar, aprovar ? null : texto)
    decidindoRef.current = false
    setDecidindo(false)
    setErro(falha)
    if (!falha) escolher('')
  }

  const abrir = async () => {
    if (!aberto.arquivo) return
    const url = await abrirComprovante(aberto.arquivo)
    if (url) globalThis.open(url, '_blank', 'noopener,noreferrer')
    else setErro('Não deu para abrir o comprovante agora. Tente de novo.')
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start">
      <ul className="flex flex-col gap-2 rounded-3xl bg-card p-3" aria-label="Comprovantes em análise">
        {pedidos.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => escolher(p.id)}
              aria-current={p.id === aberto.id}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                p.id === aberto.id ? 'bg-card ring-2 ring-primary' : 'bg-surfacerow hover:bg-muted',
              )}
            >
              <span className="grid size-9 shrink-0 place-content-center rounded-md bg-lightprimary text-primary">
                <GraduationCap className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-heading">{p.nome || p.email}</span>
                <span className="text-xs text-muted-foreground">{`${p.instituicao} · ${formatarDataLonga(p.enviadoEm)}`}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-5 rounded-3xl bg-card p-5" aria-labelledby={`${id}-nome`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id={`${id}-nome`} className="text-2xl font-bold">
              {aberto.nome || 'Sem nome'}
            </h2>
            <p className="text-sm text-muted-foreground">{aberto.email}</p>
          </div>
          <Badge variant="lightSuccess">
            <Check className="size-3" aria-hidden="true" />
            E-mail da faculdade confirmado
          </Badge>
        </div>

        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_13rem]">
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5">
              <Dado rotulo="Instituição" valor={aberto.instituicao} />
              <Dado rotulo="Curso" valor="Nutrição" />
              <Dado rotulo="Matrícula" valor={aberto.matricula} />
              <Dado rotulo="Período" valor={`${aberto.periodo}º`} />
              <Dado rotulo="Previsão de formatura" valor={formatarMesAno(aberto.formatura)} />
              <Dado rotulo="Enviado em" valor={formatarDataLonga(aberto.enviadoEm)} />
            </dl>
            <fieldset className="flex flex-col gap-2 border-t border-border pt-3.5">
              <legend className="rotulo pb-2">Confira no comprovante</legend>
              {CONFERIR.map((item) => (
                <label key={item} className="flex items-center gap-2.5 text-sm">
                  <input type="checkbox" className="size-4 accent-[var(--brand-primary)]" />
                  {item}
                </label>
              ))}
            </fieldset>
          </div>
          <div className="flex flex-col gap-2">
            <div className="grid aspect-[3/4] place-content-center rounded-md border border-border bg-surfacerow text-muted-foreground">
              <FileText className="size-8" aria-hidden="true" />
            </div>
            {aberto.arquivo ? (
              <Button variant="outline" size="sm" onClick={() => void abrir()}>
                <ExternalLink aria-hidden="true" />
                Abrir o comprovante
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">O arquivo já foi apagado.</p>
            )}
          </div>
        </div>

        <fieldset className="flex flex-col gap-2.5 border-t border-border pt-4">
          <legend className="rotulo pb-2.5">Se for recusar, o motivo</legend>
          <div className="flex flex-wrap gap-1.5">
            {[...MOTIVOS_RECUSA, OUTRO].map((m) => (
              <label
                key={m}
                className={cn(
                  'inline-flex min-h-9 cursor-pointer items-center rounded-full border px-3 text-xs font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                  motivo === m ? 'border-primary bg-lightprimary text-primary' : 'border-borderdefault bg-card text-foreground',
                )}
              >
                <input type="radio" name={`${id}-motivo`} value={m} checked={motivo === m} onChange={() => setMotivo(m)} className="sr-only" />
                {m}
              </label>
            ))}
          </div>
          {motivo === OUTRO ? <Input aria-label="Motivo" value={outro} onChange={(e) => setOutro(e.target.value)} maxLength={200} /> : null}
        </fieldset>

        {erro ? (
          <p role="alert" className="rounded-xl bg-lighterror p-3 text-sm text-errortext">
            {erro}
          </p>
        ) : null}

        <div className="flex justify-end gap-2.5">
          <Button variant="lighterror" onClick={() => void decidir(false)} disabled={decidindo}>
            <X aria-hidden="true" />
            Recusar
          </Button>
          <Button onClick={() => void decidir(true)} loading={decidindo}>
            <Check aria-hidden="true" />
            Aprovar
          </Button>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Passo 6: `AbaCrn.tsx`**

```tsx
import { ExternalLink } from 'lucide-react'
import { useRef, useState } from 'react'
import { URL_CONSULTA_CFN, type CrnParaConferir } from '@/domain/aprovacoes.ts'
import { formatarDataLonga } from '@/domain/pedidoEstudante.ts'
import { formatarCrn, type StatusCrn } from '@/domain/situacao.ts'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import type { ValorAprovacoes } from '../estado/usarAprovacoes.ts'

interface AbaCrnProps {
  readonly crns: readonly CrnParaConferir[]
  readonly decidirCrn: ValorAprovacoes['decidirCrn']
}

const SELO: Readonly<Record<StatusCrn, { readonly texto: string; readonly variante: 'lightInfo' | 'lightSuccess' | 'lightWarning' }>> = {
  em_conferencia: { texto: 'Em conferência', variante: 'lightInfo' },
  conferido: { texto: 'Conferido', variante: 'lightSuccess' },
  nao_encontrado: { texto: 'Não encontrado', variante: 'lightWarning' },
}

/** CRN para conferir na Consulta Nacional do CFN (CA-296). */
export function AbaCrn({ crns, decidirCrn }: AbaCrnProps) {
  const [erro, setErro] = useState<string | null>(null)
  const decidindoRef = useRef(false)

  const decidir = async (usuario: string, status: StatusCrn) => {
    if (decidindoRef.current) return
    decidindoRef.current = true
    setErro(await decidirCrn(usuario, status))
    decidindoRef.current = false
  }

  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-card p-5" aria-label="CRN para conferir">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Busque pelo nome na consulta do conselho e confira o número.</p>
        <a
          href={URL_CONSULTA_CFN}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-borderdefault px-5 text-sm font-medium hover:border-primary hover:text-primary sm:min-h-10"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          Abrir a Consulta Nacional do CFN
        </a>
      </div>
      {erro ? (
        <p role="alert" className="rounded-xl bg-lighterror p-3 text-sm text-errortext">
          {erro}
        </p>
      ) : null}
      {crns.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum CRN esperando conferência.</p> : null}
      <ul className="flex flex-col gap-2">
        {crns.map((c) => (
          <li key={c.usuario} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-surfacerow px-4 py-3 text-sm">
            <span className="min-w-40 flex-1">
              <span className="block font-semibold text-heading">{c.nome || c.email}</span>
              <span className="text-xs text-muted-foreground">{c.email}</span>
            </span>
            <span className="numeros w-32">{formatarCrn(c.crn)}</span>
            <span className="w-40 text-muted-foreground">{formatarDataLonga(c.contaCriadaEm)}</span>
            <Badge variant={SELO[c.status].variante}>{SELO[c.status].texto}</Badge>
            <span className="ml-auto flex gap-2">
              {c.status === 'em_conferencia' ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => void decidir(c.usuario, 'nao_encontrado')}>
                    Não encontrado
                  </Button>
                  <Button size="sm" onClick={() => void decidir(c.usuario, 'conferido')}>
                    Conferido
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => void decidir(c.usuario, 'em_conferencia')}>
                  Desfazer
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Passo 7: `TelaAprovacoes.tsx`**

```tsx
import { useState } from 'react'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'
import type { ValorAprovacoes } from '../estado/usarAprovacoes.ts'
import { AbaCrn } from './AbaCrn.tsx'
import { AbaEstudantes } from './AbaEstudantes.tsx'

type Aba = 'estudantes' | 'crn'

/** Aprovações: só para administrador (spec conta-e-verificacao, US-B8; protótipo "Aprovar estudantes" e "Conferir CRN"). */
export function TelaAprovacoes({ aprovacoes }: { readonly aprovacoes: ValorAprovacoes }) {
  const [aba, setAba] = useState<Aba>('estudantes')
  const { pendentes } = aprovacoes

  return (
    <div className="flex flex-col gap-5">
      <SeletorSegmentado<Aba>
        rotulo="Fila"
        valor={aba}
        aoEscolher={setAba}
        opcoes={[
          { valor: 'estudantes', rotulo: `Estudantes ${pendentes.estudantes}` },
          { valor: 'crn', rotulo: `CRN ${pendentes.crn}` },
        ]}
      />
      {aprovacoes.erro ? (
        <p role="alert" className="rounded-xl bg-lighterror p-3 text-sm text-errortext">
          {aprovacoes.erro}
        </p>
      ) : null}
      {aba === 'estudantes' ? (
        <AbaEstudantes pedidos={aprovacoes.pedidos} decidirPedido={aprovacoes.decidirPedido} abrirComprovante={aprovacoes.abrirComprovante} />
      ) : (
        <AbaCrn crns={aprovacoes.crns} decidirCrn={aprovacoes.decidirCrn} />
      )}
    </div>
  )
}
```

- [ ] **Passo 8: o item "Aprovações" no menu**

1. `src/ui/layout/MenuLateral.tsx`: acrescente `ShieldCheck` ao import do `lucide-react` e a prop

```tsx
  /** Pendências do administrador. Nulo ou ausente: a conta não é administradora e o item não aparece (CA-292). */
  readonly aprovacoesPendentes?: number | null | undefined
```

Receba a prop e, depois da `<Secao titulo="Sistema">…</Secao>`, acrescente:

```tsx
        {aprovacoesPendentes !== null && aprovacoesPendentes !== undefined ? (
          <Secao titulo="Administração">
            <ItemMenu
              icone={<ShieldCheck aria-hidden="true" />}
              rotulo="Aprovações"
              ativo={rota.tela === 'aprovacoes'}
              aoClicar={() => ir({ tela: 'aprovacoes' })}
              extra={
                aprovacoesPendentes > 0 ? (
                  <span className="numeros rounded-full border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">{aprovacoesPendentes}</span>
                ) : null
              }
            />
          </Secao>
        ) : null}
```

(`ir` é a função de navegar que o menu já usa.) A rota `{ tela: 'aprovacoes' }` só existe depois da Tarefa 12: por isso, **antes** deste passo, acrescente a rota em `src/ui/navegacao.ts` como está descrito no Passo 3 da Tarefa 12, item 1, só a linha do tipo, a do `lerRota` e a do `escreverRota` de `aprovacoes`.

2. `src/ui/layout/Estrutura.tsx`: acrescente a mesma prop `aprovacoesPendentes?: number | null | undefined`, receba e repasse `aprovacoesPendentes={aprovacoesPendentes}` às duas `<MenuLateral ... />`.

- [ ] **Passo 9: rodar e ver passar**

Rode: `npx vitest run src/domain/aprovacoes.test.ts src/ui/estado/usarAprovacoes.test.ts src/ui/aprovacoes src/ui/layout src/ui/navegacao.test.ts`
Esperado: PASS.

- [ ] **Passo 10: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/domain/aprovacoes.ts src/domain/aprovacoes.test.ts src/ui/estado/usarAprovacoes.ts src/ui/estado/usarAprovacoes.test.ts src/ui/aprovacoes src/ui/layout src/ui/navegacao.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(aprovacoes): fila de comprovantes e de CRN para o administrador`.

---

### Tarefa 10: Preços com o botão certo

Cobre CA-301 (CA-121 a CA-126 e a parte de Preços do CA-177 da `estilo-spora`). Substitui a Tarefa 16 da `estilo-spora`, com o contato que pode ser nulo.

**Arquivos:**
- Alterar: `src/ui/publico/SecaoPrecos.tsx`
- Criar: `src/ui/publico/SecaoPrecos.test.tsx`

**Interfaces:**
- Consome: `Ciclo`, `IdPlano`, `PlanoAssinatura`, `planoPorId`, `mensalizadoDoAnual`, `VAGAS_PRECO_FUNDADOR` (`@/domain/conta.ts`).
- Produz: `SecaoPrecos({ aoEscolher: (plano: IdPlano, ciclo: Ciclo) => void; contato: string | null; destaque?: IdPlano })`. O botão de cada plano tem o nome acessível `"<acaoTexto> <nome>"` ("Assinar Solo").

- [ ] **Passo 1: escrever os testes que falham**

`src/ui/publico/SecaoPrecos.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SecaoPrecos } from './SecaoPrecos.tsx'

const primeiro = (nome: string) => {
  const botao = screen.getAllByRole('button', { name: nome })[0]
  if (!botao) throw new Error(`sem botão ${nome}`)
  return botao
}

describe('SecaoPrecos', () => {
  it('CA-121: mantém a chave mensal/anual e a comparação', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    expect(screen.getByRole('radiogroup', { name: 'Período de cobrança' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /Comparativo dos planos/ })).toBeInTheDocument()
  })

  it('CA-122: o botão do Solo leva o plano e o ciclo escolhidos', async () => {
    const aoEscolher = vi.fn()
    render(<SecaoPrecos aoEscolher={aoEscolher} contato="contato@exemplo.com" />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('radio', { name: /Anual/ }))
    await usuario.click(primeiro('Assinar Solo'))
    expect(aoEscolher).toHaveBeenCalledWith('solo', 'anual')
  })

  it('CA-125: o Estudante tem o próprio botão, e a nota fala do comprovante', async () => {
    const aoEscolher = vi.fn()
    render(<SecaoPrecos aoEscolher={aoEscolher} contato="contato@exemplo.com" />)
    expect(screen.getAllByText(/comprovante de matrícula/).length).toBeGreaterThan(0)
    await userEvent.setup().click(primeiro('Usar o e-mail da faculdade'))
    expect(aoEscolher).toHaveBeenCalledWith('estudante', 'mensal')
  })

  it('CA-126: o Clínica mostra o contato e não tem botão', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    expect(screen.queryByRole('button', { name: /Clínica/ })).not.toBeInTheDocument()
    expect(screen.getAllByText('contato@exemplo.com').length).toBeGreaterThan(0)
  })

  it('D-46: sem contato ainda, o Clínica diz que está chegando', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato={null} />)
    expect(screen.getAllByText('Contato em breve.').length).toBeGreaterThan(0)
  })

  it('CA-177: o destaque vindo do aviso de limite troca o "Mais escolhido"', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" destaque="pro" />)
    const cabecalhos = screen.getAllByRole('columnheader')
    const doPro = cabecalhos.find((c) => c.textContent?.includes('Pro'))
    expect(doPro?.textContent).toContain('Mais escolhido')
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/publico/SecaoPrecos.test.tsx`
Esperado: FAIL.

- [ ] **Passo 3: `SecaoPrecos.tsx`**

Siga os passos 4.1 a 4.5 da Tarefa 16 do `specs/estilo-spora/PLAN.md` (linhas 3758 a 3871), com três diferenças:

1. Na interface, `readonly contato: string | null` (e o comentário "Nulo até o e-mail do MetaNutri existir: o Clínica diz 'Contato em breve.'").
2. Em `Preco`, a prop `contato` também é `string | null`, e o bloco do Clínica fica:

```tsx
      {plano.id === 'clinica' ? (
        <p className="text-center text-xs text-muted-foreground">
          {contato ? (
            <>
              Combinado por conversa:
              <br />
              <strong className="select-all text-sm text-heading">{contato}</strong>
            </>
          ) : (
            'Contato em breve.'
          )}
        </p>
      ) : (
```

(o resto da função `Preco` é o da Tarefa 16, sem mudança).

3. O texto de `NotaEstudante` passa a ser:

```tsx
        <strong className="font-semibold text-heading">Estudante de nutrição:</strong> crie a conta com o e-mail da faculdade e envie o comprovante de matrícula.
        Aprovado, o Grátis sobe para <strong>{estudante.limitePacientesAtivos} pacientes</strong> e <strong>{estudante.limiteLinksPaciente} links</strong>, por 12 meses
        ou até a formatura. Conta de estágio é de uso não comercial: o PDF sai marcado e a tela do paciente avisa que não é atendimento profissional.
```

O `App.tsx` passa a renderizar `SecaoPrecos` na Tarefa 12. Para o `npm run check` desta tarefa passar, troque já no `App.tsx` a linha `<SecaoPrecos aoEscolher={escolherPlano} />` por `<SecaoPrecos contato={CONTATO_EMAIL} aoEscolher={() => escolherPlano()} />` (importe `CONTATO_EMAIL` de `./domain/legal.ts`); a Tarefa 12 troca pelo destino certo.

- [ ] **Passo 4: rodar e ver passar**

Rode: `npx vitest run src/ui/publico/SecaoPrecos.test.tsx`
Esperado: PASS.

- [ ] **Passo 5: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/ui/publico/SecaoPrecos.tsx src/ui/publico/SecaoPrecos.test.tsx src/App.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(precos): cada plano leva ao próximo passo e o Estudante pede comprovante`.

---

### Tarefa 11: Termos e Política

Cobre CA-302 (CA-220 a CA-224 da `estilo-spora`, com o comprovante e o CRN). Substitui a Tarefa 21 da `estilo-spora`.

**Arquivos:**
- Criar: `src/ui/publico/DocumentoLegal.tsx`, `src/ui/publico/TelaTermos.tsx`, `src/ui/publico/TelaPrivacidade.tsx`, `src/ui/publico/legal.test.tsx`

**Interfaces:**
- Consome: `RESPONSAVEL`, `CONTATO_EMAIL`, `DATA_TERMOS`, `PRAZO_EXCLUSAO_DIAS`, `PRAZO_INCIDENTE_HORAS` (Tarefa 5).
- Produz: `TelaTermos()` e `TelaPrivacidade()`, sem props. Com `RESPONSAVEL` ou `CONTATO_EMAIL` nulos, mostram "Este texto está sendo finalizado e entra no ar em breve."

- [ ] **Passo 1: escrever os testes que falham**

`src/ui/publico/legal.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { TelaPrivacidade } from './TelaPrivacidade.tsx'
import { TelaTermos } from './TelaTermos.tsx'

// O vi.mock é içado para antes dos imports; os getters deixam cada teste trocar os valores.
const legal = vi.hoisted(() => ({ RESPONSAVEL: 'Fulana de Tal' as string | null, CONTATO_EMAIL: 'contato@exemplo.com' as string | null }))

vi.mock('@/domain/legal.ts', () => ({
  get RESPONSAVEL() {
    return legal.RESPONSAVEL
  },
  get CONTATO_EMAIL() {
    return legal.CONTATO_EMAIL
  },
  DATA_TERMOS: '30 de setembro de 2026',
  VERSAO_TERMOS: '2026-09-30',
  PRAZO_EXCLUSAO_DIAS: 90,
  PRAZO_INCIDENTE_HORAS: 72,
}))

describe('documentos legais', () => {
  beforeEach(() => {
    legal.RESPONSAVEL = 'Fulana de Tal'
    legal.CONTATO_EMAIL = 'contato@exemplo.com'
  })

  it('CA-222 e CA-224: termos dizem quem prescreve, quem é controlador e operador, e a data', () => {
    render(<TelaTermos />)
    expect(screen.getByRole('heading', { level: 1, name: 'Termos de uso' })).toBeInTheDocument()
    expect(screen.getByText(/Versão de 30 de setembro de 2026/)).toBeInTheDocument()
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('quem prescreve é o nutricionista')
    expect(texto).toContain('controlador')
    expect(texto).toContain('operador')
    expect(texto).toContain('uso não comercial')
    expect(texto).toContain('comprovante de matrícula')
    expect(texto).toContain('7 dias')
  })

  it('CA-221, CA-224 e CA-302: a política diz quem responde, onde ficam os dados e o que é feito do comprovante', () => {
    render(<TelaPrivacidade />)
    expect(screen.getByRole('heading', { level: 1, name: 'Política de privacidade' })).toBeInTheDocument()
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('Fulana de Tal')
    expect(texto).toContain('contato@exemplo.com')
    expect(texto).toContain('art. 18')
    expect(texto).toContain('neste aparelho')
    expect(texto).toContain('Supabase')
    expect(texto).toContain('apagado 30 dias depois')
    expect(texto).toContain('30 de setembro de 2026')
  })

  it('D-46: sem responsável ou contato, os dois mostram que estão em preparação', () => {
    legal.RESPONSAVEL = null
    render(<TelaPrivacidade />)
    expect(screen.getByText('Este texto está sendo finalizado e entra no ar em breve.')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('art. 18')
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/publico/legal.test.tsx`
Esperado: FAIL.

- [ ] **Passo 3: `DocumentoLegal.tsx`**

```tsx
import type { ReactNode } from 'react'
import { CONTATO_EMAIL, DATA_TERMOS, RESPONSAVEL } from '@/domain/legal.ts'

/** Moldura de leitura dos documentos legais. Sem responsável e contato, o texto não vai ao ar (D-46). */
export function DocumentoLegal({ titulo, children }: { readonly titulo: string; readonly children: ReactNode }) {
  const pronto = RESPONSAVEL !== null && CONTATO_EMAIL !== null
  return (
    <article className="mx-auto max-w-[72ch] px-4 py-12 text-sm leading-relaxed text-foreground sm:px-8 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="text-4xl font-bold">{titulo}</h1>
      {pronto ? (
        <>
          <p className="text-muted-foreground">Versão de {DATA_TERMOS}.</p>
          {children}
        </>
      ) : (
        <p className="text-muted-foreground">Este texto está sendo finalizado e entra no ar em breve.</p>
      )}
    </article>
  )
}
```

- [ ] **Passo 4: `TelaPrivacidade.tsx`**

Use o texto da Tarefa 21 da `estilo-spora` (linhas 5277 a 5346), com estas mudanças:

1. Os imports e o uso de `RESPONSAVEL` e `CONTATO_EMAIL` ficam iguais; como os dois podem ser nulos, escreva `{RESPONSAVEL ?? ''}` e `{CONTATO_EMAIL ?? ''}` (o `DocumentoLegal` só mostra o texto quando os dois existem).
2. Na lista "Que dados guardamos e para quê", acrescente, depois do item de nome, e-mail e senha:

```tsx
        <li>Situação (estudante ou nutricionista) e, para nutricionista, o CRN declarado: para conferir no conselho que a conta é de nutricionista.</li>
        <li>
          Para o plano Estudante: instituição, matrícula, período, previsão de formatura e o comprovante de matrícula. O comprovante fica numa área
          privada, só a própria pessoa e o administrador do MetaNutri abrem, e é apagado 30 dias depois da análise.
        </li>
```

3. Na lista "Onde os dados ficam", troque o item do Resend por:

```tsx
        <li>Os e-mails de confirmação e de troca de senha são enviados pelo Gmail do MetaNutri (Google).</li>
```

- [ ] **Passo 5: `TelaTermos.tsx`**

Use o texto da Tarefa 21 da `estilo-spora` (linhas 5349 a 5416), com estas mudanças:

1. `{RESPONSAVEL ?? ''}` e `{CONTATO_EMAIL ?? ''}`, como na política.
2. Em "Quem prescreve é o nutricionista", troque a última frase por: `Os cálculos seguem tabelas públicas de composição de alimentos e de referências nutricionais, e ainda não foram conferidos por nutricionista.`
3. Troque a seção "Plano Estudante" por:

```tsx
      <h2>Plano Estudante</h2>
      <p>
        Para estudante de Nutrição, com conta criada com o e-mail da faculdade e comprovante de matrícula aprovado pelo MetaNutri. Vale 12 meses ou até a
        formatura prevista, o que vier antes, e renova com um comprovante novo. É de uso não comercial: serve para o estágio, sob supervisão, não para
        atender por conta própria. O PDF sai marcado e a tela do paciente avisa que não é atendimento profissional.
      </p>

      <h2>Nutricionista e CRN</h2>
      <p>
        Quem cria a conta como nutricionista declara que o CRN informado é seu e está ativo. O MetaNutri confere o registro na Consulta Nacional do
        Conselho Federal de Nutrição. Se o registro não for encontrado, a conta tem 7 dias para corrigir; depois disso, exportar documentos fica bloqueado
        até a correção. A situação da conta só muda de estudante para nutricionista, informando o CRN.
      </p>
```

- [ ] **Passo 6: rodar e ver passar**

Rode: `npx vitest run src/ui/publico/legal.test.tsx`
Esperado: PASS.

- [ ] **Passo 7: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/ui/publico/DocumentoLegal.tsx src/ui/publico/TelaTermos.tsx src/ui/publico/TelaPrivacidade.tsx src/ui/publico/legal.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(legal): termos e política com comprovante e CRN`.

---

### Tarefa 12: Rotas e montagem no App

Cobre CA-258 a CA-261, CA-270, CA-273, CA-274, CA-279, CA-289, CA-290, CA-292, CB-68 e os CA-137, CA-148 a CA-153, CB-40, CB-41 e CB-49 da `estilo-spora`. Substitui a Tarefa 24 da `estilo-spora` e tira a ponte provisória de 28/09.

**Arquivos:**
- Alterar: `src/ui/navegacao.ts`, `src/ui/navegacao.test.ts`
- Alterar: `src/ui/fluxoConta.ts`, `src/ui/fluxoConta.test.ts` (`destinoDepoisDoCadastro` com a situação)
- Criar: `src/ui/Redirecionar.tsx`, `src/ui/publico/conta/TelaOutraConta.tsx`
- Alterar: `src/App.tsx`, `src/App.test.tsx`
- Criar: `src/AppConta.test.tsx`

**Interfaces:**
- Consome: tudo das Tarefas 2 a 11.
- Produz:
  - rotas `{ tela: 'comprovar-matricula' }` (`#/comprovar-matricula`, moldura pública, pede sessão) e `{ tela: 'aprovacoes' }` (`#/aprovacoes`, área de trabalho). "Complete seu cadastro" não tem rota: o portão mostra a tela no lugar da que foi pedida.
  - `destinoDepoisDoCadastro(plano: IdPlano | null, ciclo: Ciclo, situacao: Situacao): Rota`
  - `Redirecionar({ para: Rota; navegar: (r: Rota) => void })`
  - `TelaOutraConta({ email: string; aoSair: () => void; aoApagar: () => void })`

- [ ] **Passo 1: escrever os testes que falham**

No `src/ui/navegacao.test.ts`, acrescente:

```ts
it('lê e escreve as rotas da verificação', () => {
  for (const rota of [{ tela: 'comprovar-matricula' }, { tela: 'aprovacoes' }] as const) {
    expect(lerRota(escreverRota(rota))).toEqual(rota)
  }
  expect(ehTelaPublica({ tela: 'comprovar-matricula' })).toBe(true)
  expect(ehRotaLivre({ tela: 'comprovar-matricula' })).toBe(false)
  expect(ehTelaPublica({ tela: 'aprovacoes' })).toBe(false)
})
```

(acrescente `ehTelaPublica` e `ehRotaLivre` ao import se faltarem).

No `src/ui/fluxoConta.test.ts`, troque os testes de `destinoDepoisDoCadastro` pelos de três argumentos e acrescente:

```ts
it('CA-270: estudante vai para o comprovante; nutricionista segue o plano', () => {
  expect(destinoDepoisDoCadastro('estudante', 'mensal', 'estudante')).toEqual({ tela: 'comprovar-matricula' })
  expect(destinoDepoisDoCadastro(null, 'mensal', 'estudante')).toEqual({ tela: 'comprovar-matricula' })
  expect(destinoDepoisDoCadastro('solo', 'anual', 'nutricionista')).toEqual({ tela: 'assinar', plano: 'solo', ciclo: 'anual' })
  expect(destinoDepoisDoCadastro(null, 'mensal', 'nutricionista')).toEqual({ tela: 'painel' })
})
```

`src/AppConta.test.tsx`: use o arquivo da Tarefa 24 da `estilo-spora` (linhas 6036 a 6151) como base, com estas mudanças:

1. Acrescente os mocks dos ganchos novos, logo depois do mock de `usarAssinatura.ts`:

```tsx
const verificacao = vi.hoisted(() => ({
  perfil: { nome: 'Maria', situacao: 'nutricionista', crn: { regiao: 6, numero: '12345' }, statusCrn: 'em_conferencia', crnDeclaradoEm: '2026-09-30T12:00:00Z', crnDecididoEm: null } as unknown,
  ehAdmin: false,
  pedido: null as unknown,
}))

vi.mock('./ui/estado/usarPerfilConta.ts', () => ({
  usePerfilConta: () => ({
    perfil: verificacao.perfil,
    ehAdmin: verificacao.ehAdmin,
    carregado: true,
    falhou: false,
    informarSituacao: vi.fn(async () => null),
    meFormei: vi.fn(async () => null),
    corrigirCrn: vi.fn(async () => null),
    recarregar: vi.fn(),
  }),
}))
vi.mock('./ui/estado/usarPedidoEstudante.ts', () => ({
  usePedidoEstudante: () => ({ pedido: verificacao.pedido, carregado: true, enviar: vi.fn(async () => null), fecharAviso: vi.fn(async () => undefined), recarregar: vi.fn() }),
}))
vi.mock('./ui/estado/usarAprovacoes.ts', () => ({
  useAprovacoes: () => ({
    pedidos: [],
    crns: [],
    pendentes: { estudantes: 0, crn: 0, total: 0 },
    carregado: true,
    erro: null,
    decidirPedido: vi.fn(),
    decidirCrn: vi.fn(),
    abrirComprovante: vi.fn(),
    recarregar: vi.fn(),
  }),
}))
```

e, no `beforeEach`, volte `verificacao.perfil` para o nutricionista acima, `verificacao.ehAdmin = false` e `verificacao.pedido = null`.

2. Troque o teste do CA-149 pelo de Termos "em preparação" (os valores legais ainda são nulos):

```tsx
  it('CA-149: termos abrem sem sessão', () => {
    window.location.hash = '#/termos'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Termos de uso' })).toBeInTheDocument()
  })
```

3. Acrescente os testes novos:

```tsx
  it('CA-259: Criar conta no topo da landing vai para o cadastro, não para o painel', async () => {
    window.location.hash = '#/inicio'
    render(tela())
    await userEvent.setup().click(screen.getAllByRole('button', { name: /Começar grátis/ })[0] as HTMLElement)
    expect(window.location.hash).toBe('#/criar-conta')
  })

  it('CB-68: conta sem situação vê "Complete seu cadastro" antes do painel', () => {
    verificacao.perfil = null
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/painel'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Complete seu cadastro' })).toBeInTheDocument()
  })

  it('CB-68: administrador sem situação entra direto', () => {
    verificacao.perfil = null
    verificacao.ehAdmin = true
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/painel'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
  })

  it('CA-279: estudante sem pedido vê o aviso para enviar o comprovante', () => {
    verificacao.perfil = { nome: 'Júlia', situacao: 'estudante', crn: null, statusCrn: null, crnDeclaradoEm: null, crnDecididoEm: null }
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/painel'
    render(tela())
    expect(screen.getByText('Envie seu comprovante de matrícula')).toBeInTheDocument()
  })

  it('CA-292: quem não é administrador não vê Aprovações e cai no painel', () => {
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/aprovacoes'
    render(tela())
    expect(screen.queryByRole('button', { name: /Aprovações/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
  })

  it('CA-291: administrador vê Aprovações no menu e abre a tela', () => {
    verificacao.ehAdmin = true
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/aprovacoes'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Aprovações' })).toBeInTheDocument()
  })

  it('comprovar matrícula é só para estudante', () => {
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/comprovar-matricula'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
  })
```

4. Apague o teste do CA-117 da base (o novo CA-259 cobre) e o do CA-164 fica como está.

No `src/App.test.tsx`, troque os quatro testes "ponte provisória" por:

```tsx
  it('sem servidor: #/esqueci-senha mostra a tela de recuperação', () => {
    window.location.hash = '#/esqueci-senha'
    renderizar()
    expect(screen.getByRole('heading', { level: 1, name: 'Esqueci a senha' })).toBeInTheDocument()
  })

  it('sem servidor: "Começar grátis" leva ao cadastro, que oferece abrir o sistema (CA-150)', async () => {
    window.location.hash = '#/inicio'
    renderizar()
    const [botao] = screen.getAllByRole('button', { name: 'Começar grátis' })
    if (!botao) throw new Error('botão ausente')
    await userEvent.setup().click(botao)
    expect(window.location.hash).toBe('#/criar-conta')
    expect(screen.getByRole('button', { name: 'Abrir o sistema' })).toBeInTheDocument()
  })

  it('sem servidor: #/termos mostra o aviso de texto em preparação', () => {
    window.location.hash = '#/termos'
    renderizar()
    expect(screen.getByText('Este texto está sendo finalizado e entra no ar em breve.')).toBeInTheDocument()
  })
```

e mantenha o do checkout (`#/assinar/solo/mensal`) com o nome "sem servidor: #/assinar/solo/mensal mostra o checkout".

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/navegacao.test.ts src/ui/fluxoConta.test.ts src/AppConta.test.tsx src/App.test.tsx`
Esperado: FAIL.

- [ ] **Passo 3: rotas e fluxo**

1. `src/ui/navegacao.ts`:
   - em `TELAS_PUBLICAS`, acrescente `'comprovar-matricula'` depois de `'pagamento'` (não em `TELAS_LIVRES`: ela pede sessão);
   - no tipo `Rota`, acrescente `| { readonly tela: 'comprovar-matricula' }` e `| { readonly tela: 'aprovacoes' }` (se a Tarefa 9 já pôs `aprovacoes`, não repita);
   - em `lerRota`, antes do `return ROTA_INICIAL`: `if (tela === 'comprovar-matricula') return { tela: 'comprovar-matricula' }` e `if (tela === 'aprovacoes') return { tela: 'aprovacoes' }`;
   - em `escreverRota`: `case 'comprovar-matricula': return '#/comprovar-matricula'` e `case 'aprovacoes': return '#/aprovacoes'`.

2. `src/ui/fluxoConta.ts`: acrescente `import type { Situacao } from '@/domain/situacao.ts'` e troque `destinoDepoisDoCadastro` por:

```ts
/** Depois do cadastro (ou da confirmação do e-mail): estudante vai comprovar; plano pago vai pagar (CA-270). */
export function destinoDepoisDoCadastro(plano: IdPlano | null, ciclo: Ciclo, situacao: Situacao): Rota {
  if (situacao === 'estudante') return { tela: 'comprovar-matricula' }
  return plano !== null && ehPlanoPago(plano) ? { tela: 'assinar', plano, ciclo } : { tela: 'painel' }
}
```

- [ ] **Passo 4: `Redirecionar.tsx` e `TelaOutraConta.tsx`**

`src/ui/Redirecionar.tsx`:

```tsx
import { useEffect } from 'react'
import type { Rota } from './navegacao.ts'

/** Troca de rota depois de pintar: navegar durante o render atualizaria outro componente no meio do render. */
export function Redirecionar({ para, navegar }: { readonly para: Rota; readonly navegar: (rota: Rota) => void }) {
  useEffect(() => {
    navegar(para)
  }, [para, navegar])
  return null
}
```

`src/ui/publico/conta/TelaOutraConta.tsx`: copie o arquivo inteiro da Tarefa 24 da `estilo-spora` (linhas 6161 a 6210), sem mudança.

- [ ] **Passo 5: `App.tsx`, os ganchos**

1. Acrescente os imports (sem repetir os que já existem):

```tsx
import { useEffect, useState } from 'react'
import { apagarDadosDoAparelho, registrarDono, situacaoAoEntrar } from './domain/donoDosDados.ts'
import { CONTATO_EMAIL } from './domain/legal.ts'
import { avisoDoEstudante } from './domain/pedidoEstudante.ts'
import { exportacaoBloqueada, MOTIVO_EXPORTACAO_BLOQUEADA } from './domain/situacao.ts'
import { TelaAprovacoes } from './ui/aprovacoes/TelaAprovacoes.tsx'
import { useAprovacoes } from './ui/estado/usarAprovacoes.ts'
import { usePedidoEstudante } from './ui/estado/usarPedidoEstudante.ts'
import { usePerfilConta } from './ui/estado/usarPerfilConta.ts'
import { destinoDepoisDoCadastro, destinoDoPlano, guardarDestino, rotaDePlanos, tirarDestino } from './ui/fluxoConta.ts'
import { ehRotaLivre, rotaCriarConta, ETAPAS } from './ui/navegacao.ts'
import { AvisoCrn } from './ui/painel/AvisoCrn.tsx'
import { AvisoDoEstudante } from './ui/painel/AvisoEstudante.tsx'
import { TelaComprovarMatricula } from './ui/publico/conta/TelaComprovarMatricula.tsx'
import { TelaCompletarCadastro } from './ui/publico/conta/TelaCompletarCadastro.tsx'
import { TelaCriarConta } from './ui/publico/conta/TelaCriarConta.tsx'
import { TelaOutraConta } from './ui/publico/conta/TelaOutraConta.tsx'
import { TelaPrivacidade } from './ui/publico/TelaPrivacidade.tsx'
import { TelaTermos } from './ui/publico/TelaTermos.tsx'
import { Redirecionar } from './ui/Redirecionar.tsx'
```

2. Depois de `const { fonte } = useAcompanhamentos()`, acrescente:

```tsx
  const [emailPendente, setEmailPendente] = useState<string | null>(null)
  const arm = armazenamentoLocal()
  const sessao = conta.sessao

  // Dono dos dados do aparelho (spec estilo-spora, D-24): quem entra primeiro adota;
  // outra conta não vê nada até escolher (CA-151 e CA-152).
  const situacaoDoAparelho = sessao ? situacaoAoEntrar(arm, sessao.id) : 'mesmo'
  useEffect(() => {
    if (sessao && situacaoDoAparelho === 'adotar') registrarDono(armazenamentoLocal(), sessao.id)
  }, [sessao, situacaoDoAparelho])

  // Situação, pedido de estudante e filas do administrador (spec conta-e-verificacao).
  const perfilConta = usePerfilConta(sessao?.id ?? null)
  const { perfil } = perfilConta
  const pedidoEstudante = usePedidoEstudante(perfil?.situacao === 'estudante' && sessao ? sessao.id : null)
  const aprovacoes = useAprovacoes(perfilConta.ehAdmin)
  const agora = new Date()
  const bloqueio = exportacaoBloqueada(perfil, agora) ? MOTIVO_EXPORTACAO_BLOQUEADA : null
```

Todos esses ganchos ficam antes do primeiro `return` do componente (o da rota `missoes`).

3. Apague a função `escolherPlano` e troque `irPara` por:

```tsx
  const irPara = (destino: DestinoPublico) => navegar(destino === 'criar-conta' ? rotaCriarConta(null, 'mensal') : { tela: destino })
```

4. Troque `const base = { rota, navegar, casoAtual, aoNovoCaso: novoCaso } as const` por:

```tsx
  const base = { rota, navegar, casoAtual, aoNovoCaso: novoCaso, aprovacoesPendentes: perfilConta.ehAdmin ? aprovacoes.pendentes.total : null } as const
```

- [ ] **Passo 6: `App.tsx`, o portão e as rotas**

Logo depois do bloco `if (rota.tela === 'missoes') { ... }`, ponha o portão da Tarefa 24 da `estilo-spora` (linhas 6259 a 6296, com `situacao` trocado por `situacaoDoAparelho`) e, dentro do mesmo `if (conta.disponivel && !ehRotaLivre(rota))`, depois do bloco de `TelaOutraConta`, acrescente:

```tsx
    // CB-68: conta sem situação completa o cadastro antes de qualquer tela de trabalho.
    if (perfilConta.carregado && !perfilConta.falhou && perfil === null && !perfilConta.ehAdmin) {
      return (
        <TelaCompletarCadastro
          email={sessao.email}
          informarSituacao={perfilConta.informarSituacao}
          aoSair={() => void conta.sair().then(() => navegar({ tela: 'inicio' }))}
        />
      )
    }
```

Depois, troque os blocos públicos assim:

1. `inicio` e `criar-conta` deixam de dividir o bloco. O `inicio` fica:

```tsx
  if (rota.tela === 'inicio') {
    return (
      <MolduraPublica atual="inicio" temSessao={sessao !== null} aoIrPara={irPara}>
        <TelaInicio aoComecar={() => navegar(rotaCriarConta(null, 'mensal'))} aoVerPrecos={() => navegar({ tela: 'precos' })} />
      </MolduraPublica>
    )
  }
```

2. `precos`:

```tsx
  if (rota.tela === 'precos') {
    return (
      <MolduraPublica atual="precos" temSessao={sessao !== null} aoIrPara={irPara}>
        <SecaoPrecos
          contato={CONTATO_EMAIL}
          {...(rota.destaque ? { destaque: rota.destaque } : {})}
          aoEscolher={(plano, ciclo) => {
            const destino = destinoDoPlano(plano, ciclo, sessao !== null)
            if (destino) navegar(destino)
          }}
        />
      </MolduraPublica>
    )
  }
```

3. No `entrar`, troque `aoCriarConta={() => navegar({ tela: 'painel' })}` por `aoCriarConta={() => navegar(rotaCriarConta(null, 'mensal'))}` e apague o comentário da ponte.

4. Logo depois do `entrar`, acrescente o `criar-conta`:

```tsx
  if (rota.tela === 'criar-conta') {
    const ciclo = rota.ciclo ?? 'mensal'
    return (
      <TelaCriarConta
        conta={conta}
        plano={rota.plano ?? null}
        ciclo={ciclo}
        contato={CONTATO_EMAIL}
        aoCriada={(criada) => {
          const destino = destinoDepoisDoCadastro(criada.plano, ciclo, criada.situacao)
          if (!criada.confirmarEmail) return navegar(destino)
          // O link do e-mail pode ser aberto em outra aba: o destino fica no aparelho.
          guardarDestino(arm, destino)
          setEmailPendente(criada.email)
          navegar({ tela: 'confirmar-email' })
        }}
        aoEntrar={() => navegar({ tela: 'entrar' })}
        aoTrocarPlano={() => navegar({ tela: 'precos' })}
        aoIrParaInicio={() => navegar({ tela: 'inicio' })}
        aoAbrirSistema={() => navegar({ tela: 'painel' })}
      />
    )
  }
```

5. No `confirmar-email`, troque `email={null}` por `email={emailPendente}`.

6. Troque o bloco de `termos`/`privacidade` por:

```tsx
  if (rota.tela === 'termos' || rota.tela === 'privacidade') {
    return (
      <MolduraPublica atual={rota.tela} temSessao={sessao !== null} aoIrPara={irPara}>
        {rota.tela === 'termos' ? <TelaTermos /> : <TelaPrivacidade />}
      </MolduraPublica>
    )
  }
```

7. Antes do `if (rota.tela === 'assinar')`, acrescente:

```tsx
  if (rota.tela === 'comprovar-matricula') {
    if (perfilConta.carregado && perfil?.situacao !== 'estudante') return <Redirecionar para={{ tela: 'painel' }} navegar={navegar} />
    return (
      <TelaComprovarMatricula
        email={sessao?.email ?? ''}
        pedido={pedidoEstudante.pedido}
        enviar={pedidoEstudante.enviar}
        aoEnviado={() => navegar({ tela: 'painel' })}
        aoDepois={() => navegar({ tela: 'painel' })}
        aoIrParaInicio={() => navegar({ tela: 'inicio' })}
      />
    )
  }
```

8. No `painel`, passe o aviso:

```tsx
        <TelaPainel
          aoNovoPlano={(modo) => novoCaso(modo)}
          aoAbrirPlano={(casoId) => navegar({ tela: 'planejador', casoId, aba: 'caso' })}
          aoIrPara={(tela) => navegar({ tela })}
          aoVerExemplo={verExemplo}
          aviso={avisoDaConta}
        />
```

com `avisoDaConta` calculado logo antes do `if (rota.tela === 'painel')`:

```tsx
  const aviso = perfil?.situacao === 'estudante' && pedidoEstudante.carregado ? avisoDoEstudante(pedidoEstudante.pedido, assinatura) : null
  const avisoDaConta =
    perfil?.situacao === 'nutricionista' ? (
      <AvisoCrn perfil={perfil} agora={agora} aoCorrigir={perfilConta.corrigirCrn} />
    ) : aviso ? (
      <AvisoDoEstudante aviso={aviso} aoEnviar={() => navegar({ tela: 'comprovar-matricula' })} aoFechar={(id) => void pedidoEstudante.fecharAviso(id)} />
    ) : null
```

9. Depois do bloco `ajuda`, acrescente:

```tsx
  if (rota.tela === 'aprovacoes') {
    if (!perfilConta.ehAdmin) return <Redirecionar para={{ tela: 'painel' }} navegar={navegar} />
    return (
      <Estrutura {...base} titulo="Aprovações" subtitulo="Só você vê esta tela">
        <TelaAprovacoes aprovacoes={aprovacoes} />
      </Estrutura>
    )
  }
```

10. No `conta`, troque as props provisórias da Tarefa 8 pelas reais:

```tsx
        <TelaConta
          conta={conta}
          perfil={perfil}
          pedido={pedidoEstudante.pedido}
          meFormei={perfilConta.meFormei}
          aoMudouSituacao={() => {
            perfilConta.recarregar()
            pedidoEstudante.recarregar()
            cobranca.recarregar()
          }}
          aoSaiu={() => navegar({ tela: 'inicio' })}
          aoEntrar={() => navegar({ tela: 'entrar' })}
          aoVerPrecos={() => navegar({ tela: 'precos' })}
          aoIrParaConfig={() => navegar({ tela: 'config' })}
          aoAssinar={(plano) => navegar({ tela: 'assinar', plano, ciclo: 'mensal' })}
        />
```

11. No `adesao` e no `CartaoLinkMissoes` do planejador, acrescente `aoVerPlanos={() => navegar(rotaDePlanos(assinatura.plano))}`.

12. No planejador, troque `acoes={<MenuExportar caso={registro.caso} plano={registro.plano} />}` por `acoes={<MenuExportar caso={registro.caso} plano={registro.plano} bloqueio={bloqueio} />}`.

Quando a página do painel é a tela de "redirecionar" (casos `Redirecionar`), o teste espera o título "Painel": o `Redirecionar` navega no efeito e a próxima renderização mostra o painel.

- [ ] **Passo 7: rodar e ver passar**

Rode: `npx vitest run src/ui/navegacao.test.ts src/ui/fluxoConta.test.ts src/AppConta.test.tsx src/App.test.tsx`
Esperado: PASS. O `App.test.tsx` roda sem servidor (portão desligado, CA-260). Se o jsdom imprimir "Not implemented: navigation" no teste do CA-153, é o `location.reload()`: esperado, não falha o teste.

- [ ] **Passo 8: verificar tudo e fazer o commit**

Rode: `npm run check` e `npx playwright test`.

```bash
git add src/ui/navegacao.ts src/ui/navegacao.test.ts src/ui/fluxoConta.ts src/ui/fluxoConta.test.ts src/ui/Redirecionar.tsx src/ui/publico/conta/TelaOutraConta.tsx src/App.tsx src/App.test.tsx src/AppConta.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): conta obrigatória com situação, comprovante e aprovações no App`.

---

### Tarefa 13: e2e, documentação e trava de publicação

Cobre CA-303, D-46, CB-47 e CB-48 (estilo-spora) nas telas novas. Substitui a Tarefa 26 da `estilo-spora`.

**Arquivos:**
- Criar: `e2e/conta.spec.ts`, `scripts/conferir-publicacao.mjs`
- Alterar: `.github/workflows/publicar.yml`, `README.md`, `docs/decisoes.md`, `docs/pendencias.md`

- [ ] **Passo 1: escrever o e2e**

`e2e/conta.spec.ts` (sem Supabase: o `playwright.config.ts` desliga o servidor):

```ts
import { expect, test } from '@playwright/test'

test.describe('Caminhos da conta sem servidor (spec conta-e-verificacao)', () => {
  test('CA-259: Começar grátis leva ao cadastro do Free', async ({ page }) => {
    await page.goto('/#/inicio')
    await page.getByRole('banner').getByRole('button', { name: 'Começar grátis' }).click()
    await expect(page).toHaveURL(/#\/criar-conta$/)
    await expect(page.getByText('No Free você já tem')).toBeVisible()
  })

  test('CA-122: Assinar Solo no anual leva ao cadastro com o Solo anual marcado', async ({ page }) => {
    await page.goto('/#/precos')
    await page.getByRole('radio', { name: /Anual/ }).click()
    await page.getByRole('button', { name: 'Assinar Solo' }).first().click()
    await expect(page).toHaveURL(/#\/criar-conta\/solo\/anual$/)
    await expect(page.getByRole('img', { name: 'Passo 1 de 3' })).toBeVisible()
  })

  test('CA-265 e CA-267: o botão do Estudante abre o cadastro já em Estudante', async ({ page }) => {
    await page.goto('/#/precos')
    await page.getByRole('button', { name: 'Usar o e-mail da faculdade' }).first().click()
    await expect(page.getByRole('radio', { name: /Estudante de Nutrição/ })).toBeChecked()
    await expect(page.getByLabel('E-mail da faculdade')).toBeVisible()
    await expect(page.getByRole('img', { name: 'Passo 1 de 2' })).toBeVisible()
  })

  test('CA-260: sem servidor, o cadastro explica e abre o sistema', async ({ page }) => {
    await page.goto('/#/criar-conta')
    await page.getByRole('button', { name: 'Abrir o sistema' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible()
  })

  for (const rota of ['/#/criar-conta', '/#/criar-conta/estudante', '/#/criar-conta/solo', '/#/entrar', '/#/termos', '/#/privacidade']) {
    test(`CB-48: ${rota} cabe em 360 px sem rolagem para o lado`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 })
      await page.goto(rota)
      const larguras = await page.evaluate(() => ({ documento: document.documentElement.scrollWidth, janela: window.innerWidth }))
      expect(larguras.documento).toBeLessThanOrEqual(larguras.janela)
    })
  }
})
```

- [ ] **Passo 2: rodar**

Rode: `npx playwright test`
Esperado: todos os e2e passam, os antigos e os novos. Se um teste de 360 px falhar, ache o elemento largo pelo trace (`npx playwright show-trace`) e ponha `min-w-0` ou `break-words` nele.

- [ ] **Passo 3: conferência visual nos dois temas (CB-47)**

Com `npm run dev`, abra `#/criar-conta`, `#/criar-conta/estudante`, `#/criar-conta/solo/anual` e `#/termos` no tema claro e no escuro. As telas que pedem sessão (Comprovar matrícula, Conta e plano, Aprovações) só abrem com o servidor; confira essas no Passo 7, depois de publicar. Corrija o que estiver ilegível antes de seguir e junte as capturas ao relatório da tarefa.

- [ ] **Passo 4: a trava de publicação (D-46)**

`scripts/conferir-publicacao.mjs`:

```js
// Barra a publicação enquanto os Termos e a Política não têm responsável e contato
// (spec conta-e-verificacao, D-46). Roda no GitHub Actions antes do build.
import { readFileSync } from 'node:fs'

const legal = readFileSync('src/domain/legal.ts', 'utf8')
const faltando = ['RESPONSAVEL', 'CONTATO_EMAIL'].filter((nome) => new RegExp(`export const ${nome}: string \\| null = null`).test(legal))

if (faltando.length > 0) {
  console.error(`Publicação barrada: ${faltando.join(' e ')} ainda sem valor em src/domain/legal.ts.`)
  console.error('A conta obrigatória recebe documento com dado pessoal: os Termos e a Política precisam estar no ar antes (LGPD).')
  process.exit(1)
}
console.log('Termos e Política com responsável e contato: pode publicar.')
```

Em `.github/workflows/publicar.yml`, acrescente, como primeiro passo depois do checkout e antes da instalação de dependências:

```yaml
      - name: Conferir termos antes de publicar
        run: node scripts/conferir-publicacao.mjs
```

Rode: `node scripts/conferir-publicacao.mjs`
Esperado: sai com erro e a mensagem "Publicação barrada: RESPONSAVEL e CONTATO_EMAIL ainda sem valor". É o certo até o usuário mandar os dois valores.

- [ ] **Passo 5: README, decisões e pendências**

No `README.md`, troque a seção sobre Supabase, e-mail e Mercado Pago (se não houver, crie no fim) por:

```md
## Ligar conta, e-mail, verificação e pagamento

O site exige conta. Para funcionar de verdade, nesta ordem:

1. **Supabase > Authentication > URL Configuration.** *Site URL*: `https://matheusrv0.github.io/metanutri/`.
   Em *Redirect URLs*: `https://matheusrv0.github.io/metanutri/**` e `http://localhost:5173/**`.
2. **Supabase > Authentication > Sign In / Providers > Email.** *Confirm email* LIGADO e senha mínima 8.
3. **E-mail (SMTP).** Até ter domínio, os e-mails saem pelo Gmail do MetaNutri: ligue a verificação em duas
   etapas, crie uma *Senha de app* e preencha *Authentication > Emails > SMTP Settings* (host `smtp.gmail.com`,
   porta 465, usuário e remetente = o Gmail, senha = a senha de app). Sem SMTP próprio o Supabase só manda
   e-mail para a equipe do projeto, no máximo 2 por hora.
4. **SQL.** No SQL Editor, rode `supabase/005-estudante.sql` e depois `supabase/006-verificacao.sql`. Para se
   marcar como administrador, rode a linha comentada no fim do 006 com o seu e-mail.
5. **Mercado Pago.** Crie a aplicação e guarde o token como `MERCADOPAGO_ACCESS_TOKEN` e o segredo do webhook
   como `MERCADOPAGO_WEBHOOK_SECRET` (`npx supabase secrets set ... --project-ref qmpljfjbdcrdbqutuvmg`). As
   funções `assinar` e `webhook-mercadopago` já estão publicadas. Cadastre o webhook apontando para
   `https://qmpljfjbdcrdbqutuvmg.supabase.co/functions/v1/webhook-mercadopago`, evento Assinaturas.
6. **Termos.** Preencha `RESPONSAVEL` e `CONTATO_EMAIL` em `src/domain/legal.ts`. Sem os dois, o GitHub Actions
   barra a publicação (`scripts/conferir-publicacao.mjs`).

Comprovantes de estudante ficam no balde privado `comprovantes` e são apagados 30 dias depois da decisão, quando
o administrador abre a tela Aprovações.
```

Em `docs/decisoes.md`, acrescente uma entrada datada de 30/09/2026 que resume D-39 a D-47 da `specs/conta-e-verificacao/SPEC.md`, uma linha cada, e aponta para ela. Em `docs/pendencias.md`, atualize a data do topo e acrescente um bloco "Atualizado em 30/09" com: conta obrigatória e verificação prontas no código; faltam os passos 1 a 6 do README e a revisão da lista de sugestões (parte 4 do lançamento).

- [ ] **Passo 6: verificar tudo e fazer o commit**

Rode: `npm run check` e `npx playwright test`.

```bash
git add e2e/conta.spec.ts scripts/conferir-publicacao.mjs .github/workflows/publicar.yml README.md docs/decisoes.md docs/pendencias.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `docs: ligar conta e verificação, e2e da conta e trava de publicação`.

- [ ] **Passo 7: entregar e testar com o servidor de verdade (com o usuário)**

Esta etapa não roda sozinha: precisa do usuário.

1. Pedir ao usuário que rode, no SQL Editor, o `005` e o `006` (os dois arquivos) e a linha do administrador com o e-mail dele.
2. Conferir com o usuário, por consulta no SQL Editor, que o banco recusa escrita direta: com a sessão de uma conta comum no app, abrir o console do navegador e rodar `await supabase.from('perfis').update({ situacao: 'nutricionista' }).eq('id', '<id>')` não muda nada (0 linhas). Se não der para fazer pelo console, pular e registrar.
3. Com `npm run dev` e o `.env.local` preenchido pelo usuário, criar duas contas de teste: uma de nutricionista (Gmail do MetaNutri com `+teste` no e-mail) e uma de estudante (só se o usuário tiver um e-mail `.edu.br` para emprestar). Conferir: e-mail de confirmação chega; estudante cai em Comprovar matrícula; o pedido aparece em Aprovações; aprovar dá o plano Estudante com a validade certa; "Me formei" leva ao CRN em conferência; "Não encontrado" mostra o aviso com o prazo.
4. Publicar só quando `RESPONSAVEL` e `CONTATO_EMAIL` tiverem valor (a trava do Passo 4 garante): `git push`, `gh workflow run publicar.yml --ref main` e acompanhar até ficar verde.

---

## Cobertura da spec

| Critérios | Tarefa |
|---|---|
| D-39, CA-258 a CA-261 | 12, 13 |
| D-40, CA-269 | 1, 3, 5 |
| CA-262 a CA-268, CA-270 | 4, 5, 12 |
| D-41, CA-271 a CA-278 | 1, 2, 6, 12 |
| CA-279 a CA-281 | 2, 6, 7, 12 |
| CA-282 a CA-285 | 2, 8 |
| CA-286 a CA-288 | 1, 8 |
| D-44, CA-289, CA-290 | 1, 2, 7, 12 |
| D-45, CA-291 a CA-297 | 1, 9, 12 |
| D-43, CA-298 a CA-300 | 1, 9 |
| CA-301 | 10, 12 |
| CA-302 | 11 |
| D-46, CA-303 | 5, 11, 13 |
| D-42 | 1, 2 |
| D-47 | 13 (README) |
| CB-60 | 5 |
| CB-61 | 1, 9 |
| CB-62 | 9 (motivo "Ilegível") |
| CB-63, CB-64 | 1 |
| CB-65 | 1, 7 |
| CB-66 | 9 |
| CB-67 | — (zero contas em 30/09; nada a migrar) |
| CB-68 | 1, 5, 12 |
