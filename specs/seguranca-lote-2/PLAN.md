# Segurança, lote 2 · Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa por tarefa. Os passos usam caixa (`- [ ]`) para acompanhar.

**Objetivo:** o servidor passa a limitar o tamanho do que cada conta guarda na nuvem e quantas vezes ela chama a cobrança, e a tela diz o motivo de cada recusa nova em português.

**Arquitetura:** um arquivo novo de banco, `supabase/011-seguranca-lote-2.sql`, põe as travas de tamanho (com nomes fixos que a tela reconhece), o teto de 1000 links no gatilho do 010, a tabela e a função que contam as chamadas à cobrança, a conferência do comprovante usada pela tela e pela política de envio, e apaga a função das vagas de fundador. Nos núcleos puros de `supabase/functions/_shared/`, dois módulos novos (`corpo.ts`, o pedido até 64 KB; `chamadas.ts`, o limite de chamadas) e uma regra nova no `webhook.ts` (o registro guarda até 100 avisos não conferidos por hora); as portas novas do banco entram em `portas.ts`, no banco de mentira dos testes e em `bancoSupabase.ts`. Na tela, `mensagemDoBanco.ts` traduz as travas de tamanho, a tela de comprovante pergunta ao banco antes de enviar, e a janela de cancelar mostra o limite de pedidos.

**Stack:** React 18 + TypeScript strict + Vite + Tailwind v4 · Vitest + Testing Library · Playwright · Supabase (Postgres, Storage e Edge Functions em Deno). Nenhum pacote novo.

**Spec:** `specs/seguranca-lote-2/SPEC.md` (D-107 a D-112, CA-445 a CA-453, CB-112 a CB-115, R-40 a R-42), aprovada pelo dono em 07/10/2026 com o teto de 1000 links aceito. Ela muda o CA-399, o CA-436 e o CA-437 de `specs/cobranca-em-producao/SPEC.md`.

## Restrições globais (Global Constraints)

**Números da spec (exatos; o limite exato passa, CB-113)**
- Cópia completa: até 5 MB = `5242880` bytes.
- Cada link: missões até 256 KB = `262144`; marcações até 1 MB = `1048576`; nome até `120` caracteres; códigos de caso e de paciente até `64`.
- Links por conta: no máximo `1000`, em qualquer plano (Pro e Clínica continuam sem limite de plano).
- Pedidos com cartão (assinar e trocar cartão somados, qualquer resultado): até `10` por hora por conta.
- Pedidos de conferir se já houve cobrança e de cancelar (somados): até `20` por hora por conta.
- Registro de avisos: até `100` avisos não conferidos por hora; os conferidos sempre entram.
- Pedido às três funções de cobrança: até 64 KB = `65536` bytes; acima disso, 413.
- Comprovante: só estudante com e-mail de faculdade confirmado; o limite de 10 arquivos continua.

**Frases da tela (copiadas da spec, sem mudar nada)**
- CA-445: `A cópia passou de 5 MB, o máximo da nuvem. Seus dados continuam neste aparelho.`
- CA-446: `Este link ficou grande demais. Tire algumas missões e tente de novo.`
- CA-447: `Você chegou ao limite de links do seu plano.`
- CA-448 e CA-449 (429): `Muitas tentativas seguidas. Espere uma hora e tente de novo.`
- CA-449: essa frase entra no lugar de `Não consegui conferir se já houve cobrança.`
- CA-452: `Confirme o e-mail da faculdade antes de enviar o comprovante.`
- CA-428 (continua): `Você já enviou comprovantes demais. Fale com a gente pelo e-mail de contato.`
- CB-114: a frase de servidor de cobrança fora que cada função já usa (`SEM_COBRANCA` na `assinar`, `FORA` na `gerenciar-assinatura`).

**Código**
- Nenhuma dependência nova. Nada de `any` nem `as any`; JSON de fora é lido com `objeto()` e `typeof`.
- TypeScript ligado: `exactOptionalPropertyTypes` (opcional entra por spread condicional), `noUncheckedIndexedAccess`, `verbatimModuleSyntax` (tipo entra com `import type` ou `type` no import). ESLint strict: sem `!`.
- Componentes funcionais, um por arquivo, export nomeado.
- Núcleos de `supabase/functions/_shared/` usados pelo Vitest (`portas.ts`, `cobranca.ts`, `operadora.ts`, `tentativas.ts`, `chamadas.ts`, `corpo.ts`, `assinar.ts`, `gerenciarAssinatura.ts`, `webhook.ts`): sem `Deno.*`, sem import de `https://`, sem `console.*`, sem `Date.now()` nem `new Date()` sem argumento (o relógio vem de `agora`). Só `bancoSupabase.ts` e os `index.ts` falam com o Deno e o esm.sh.
- Testes do servidor moram em `src/data/` e começam com `// @vitest-environment node`.
- React Compiler ligado: nada de `setState` síncrono em efeito; `ref.current` só em manipulador e em `.then`.

**Texto**
- Tudo que a pessoa vê em português do Brasil, com acento, curto, sem slogan, sem ponto de exclamação. Nome do processador nunca aparece na tela (comentário, log e docs podem citar).
- O repositório é **público**: comentário, teste, doc e mensagem de commit dizem o que o sistema faz; nunca descrevem como ele poderia ter sido usado de outro jeito antes.

**Processo**
- TDD: o teste de cada passo é escrito e visto falhar antes do código.
- Toda tarefa termina com `npm run check` verde (lint + typecheck + testes). Tarefa que mexe em `supabase/functions` roda também `npx --yes deno@2 check --no-lock` nos três `index.ts`. A Tarefa 8 roda `npx playwright test`.
- Um teste por critério de aceite, com o ID no nome (`CA-445` … `CA-453`, `CB-112` … `CB-115`).
- Commit em Conventional Commits, em português. A mensagem vai num arquivo UTF-8 `../_msg.txt` (fora do repositório), terminando com uma linha em branco e `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Comando: `git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt`. Branch `feat/seguranca-lote-2` (já existe).
- O `.env.local` tem `VITE_SUPABASE_ANON_KEY` em branco de propósito. Não mexa nele.
- **Nenhum deploy dentro das tarefas**: nem SQL no Supabase, nem função, nem site. Quem roda é o dono, com os comandos da Tarefa 8.
- Faltou algo no plano: pare e escreva a suposição em "Decisões do plano" antes de seguir.

## Foco de revisão (Review Focus)

Cinco situações que a spec não cobre com critério próprio e que mais podem pegar quem usa, cada uma com o teste na tarefa dona do código:

1. **Link grande demais que ficou pendente no aparelho:** ao voltar para a aba, a leitura manda o link de novo, é recusada de novo, e o cartão continua com a frase de tamanho, sem trocar por "Não consegui salvar o link na nuvem." (Tarefa 2, teste "Foco: …").
2. **Conferência do comprovante sem resposta** (o banco ainda sem o 011, ou a rede caiu nesse pedido): o envio segue e o armazenamento decide; nenhuma frase de recusa aparece por engano (Tarefa 3, teste "Foco: …").
3. **Pedido com tamanho declarado menor que o corpo de verdade:** a leitura para logo depois de 64 KB mesmo assim (Tarefa 4, teste "Foco: …").
4. **Aviso sem o segredo com o registro da hora cheio:** a resposta continua 500, para o aviso voltar quando o segredo for posto, e nada é anotado (Tarefa 6, teste "Foco: …").
5. **Janela de cancelar fechada depois do 429 e aberta de novo:** pergunta de novo ao servidor e volta ao normal quando ele responde (Tarefa 7, teste "Foco: …").

---

## Ordem e dependências

| # | Tarefa | Depende de |
|---|---|---|
| 1 | Banco: `011-seguranca-lote-2.sql` (e o `003` sem a função das vagas) | — |
| 2 | Tela: a cópia e o link grandes demais (CA-445, CA-446) | 1 (o teste cruza com o 011) |
| 3 | Tela: o comprovante confere a conta antes de enviar (CA-452, CA-428) | 1 (o teste cruza com o 011) |
| 4 | Servidor: o pedido às três funções vai até 64 KB (CA-451) | — |
| 5 | Servidor: o limite de chamadas à cobrança (CA-448, CA-449, CB-113 a CB-115) | 4 (a linha `NUCLEOS` de `servidorLigacao.test.ts` já tem o `corpo`); no ar, precisa do 011 |
| 6 | Servidor: o registro guarda até 100 avisos não conferidos por hora (CA-450) | 5 (mesmos arquivos de porta, banco e falsos) |
| 7 | Tela: o 429 na janela de cancelar e nos pedidos com cartão (CA-448, CA-449) | 5 (a frase `MUITAS_CHAMADAS`) |
| 8 | Documentação e validação final | 1 a 7 |

As Tarefas 1 e 4 não dependem de nada. As Tarefas 2 e 3 andam depois da 1; a 5, depois da 4; a 6 e a 7, depois da 5.

## Mapa de arquivos

| Arquivo | Tarefa | O que faz |
|---|---|---|
| `specs/seguranca-lote-2/SPEC.md` | 1 | status: aprovado |
| `supabase/011-seguranca-lote-2.sql` (novo) | 1 | travas de tamanho, teto de links, `chamadas_da_cobranca` e `anotar_chamada_da_cobranca`, `conferir_envio_de_comprovante` e a política de envio, apaga `vagas_de_fundador_usadas` |
| `supabase/003-assinaturas.sql` | 1 | deixa de criar a função das vagas |
| `src/data/sqlSegurancaLote2.test.ts` (novo) | 1 | travas de texto do 011 e do 003 |
| `src/ui/estado/mensagemDoBanco.ts` + teste | 2 | `COPIA_GRANDE_DEMAIS`, `LINK_GRANDE_DEMAIS`, `TRAVAS_DE_TAMANHO` e a tradução do código 23514 |
| `src/domain/copiaNaNuvem.ts` + teste | 2 | o 413 do servidor na cópia vira a frase de tamanho (R-41) |
| `src/domain/fonteSupabase.test.ts` | 2 | o link recusado por tamanho volta com a frase |
| `src/ui/missoes/CartaoLinkMissoes.tsx`, `src/ui/missoes/missoesNaNuvem.test.tsx` | 2 | o cartão mostra a frase de tamanho, sem "Tentar de novo" |
| `src/domain/pedidoEstudante.ts` + teste | 3 | `recusaDoComprovante` e as frases |
| `src/ui/estado/usarPedidoEstudante.ts` + teste | 3 | confere antes de subir o arquivo |
| `src/ui/publico/conta/TelaComprovarMatricula.test.tsx` | 3 | a tela mostra a frase do CA-452 |
| `supabase/functions/_shared/corpo.ts` (novo) | 4 | `lerCorpo`, `CORPO_MAXIMO_BYTES`, `PEDIDO_GRANDE_DEMAIS` |
| `supabase/functions/{assinar,gerenciar-assinatura,webhook-mercadopago}/index.ts` | 4 | 413 antes de processar |
| `src/data/servidorCorpo.test.ts` (novo) | 4 | o teto de 64 KB com `Request` e `ReadableStream` de verdade |
| `src/data/servidorLigacao.test.ts` | 4, 5, 6 | travas de texto da ligação e do banco de verdade |
| `supabase/functions/_shared/portas.ts` | 5, 6 | `TipoDeChamada`, `anotarChamada`, `apagarChamadasAntesDe`, `contarAvisosNaoConferidos` |
| `supabase/functions/_shared/chamadas.ts` (novo) | 5 | `conferirChamadas` e as constantes do D-108 |
| `supabase/functions/_shared/assinar.ts`, `gerenciarAssinatura.ts` | 5 | o portão das chamadas logo antes da operadora |
| `supabase/functions/_shared/bancoSupabase.ts` | 5, 6 | as portas novas no banco de verdade |
| `src/data/servidorFalsos.test-utils.ts` | 5, 6 | as portas novas no banco de mentira |
| `src/data/servidorChamadas.test.ts` (novo) | 5 | CA-448, CA-449, CB-113 a CB-115 no servidor |
| `src/data/servidorAssinar.test.ts`, `servidorGerenciar.test.ts` | 5 | a ordem das consultas ganha a chamada anotada |
| `supabase/functions/_shared/webhook.ts`, `src/data/servidorWebhook.test.ts` | 6 | D-109 |
| `src/domain/assinaturaTextos.ts` + teste | 7 | `MUITAS_TENTATIVAS_SEGUIDAS` |
| `src/ui/conta/DialogoCancelarAssinatura.tsx`, `TelaConta.test.tsx`, `src/ui/estado/usarAssinatura.test.ts` | 7 | a janela mostra o limite e não deixa confirmar |
| `README.md`, `docs/pendencias.md`, `docs/decisoes.md`, `specs/cobranca-em-producao/SPEC.md` | 8 | registro e ordem para pôr no ar |

---

### Tarefa 1: Banco: `011-seguranca-lote-2.sql`

Cobre o lado do banco de D-107, D-108, D-111 e D-112 (CA-445, CA-446, CA-447, CA-452, CA-453, CB-112, CB-113, CB-115).

**Files:**
- Modify: `specs/seguranca-lote-2/SPEC.md:3` (só a linha de status)
- Create: `supabase/011-seguranca-lote-2.sql`
- Modify: `supabase/003-assinaturas.sql:31-43`
- Create: `src/data/sqlSegurancaLote2.test.ts`

**Interfaces:**
- Consumes: `public.copias` (002), `public.acompanhamentos` e `conferir_link_do_paciente` (001, 004, 010), `public.perfis` e `eh_email_de_faculdade` (005, 006), `comprovantes_da_conta` (010).
- Produces (nomes que as outras tarefas usam, exatos):
  - travas `copias_dados_tamanho`, `acompanhamentos_missoes_tamanho`, `acompanhamentos_marcacoes_tamanho`, `acompanhamentos_nome_tamanho`, `acompanhamentos_caso_id_tamanho`, `acompanhamentos_paciente_id_tamanho` (recusam com o código Postgres `23514` e o nome entre aspas na mensagem);
  - `public.conferir_envio_de_comprovante() returns text`, que devolve `'ok' | 'nao-estudante' | 'sem-email-de-faculdade' | 'demais'`, executável só por `authenticated`;
  - tabela `public.chamadas_da_cobranca (id, nutricionista_id, tipo 'cartao'|'conferir', quando)`;
  - `public.anotar_chamada_da_cobranca(p_conta uuid, p_tipo text, p_limite integer, p_desde timestamptz) returns boolean`, executável só por `service_role`: verdadeiro = anotou; falso = já havia `p_limite` chamadas depois de `p_desde`, e nada foi anotado.

- [ ] **Step 1: Registrar a spec e o plano**

Em `specs/seguranca-lote-2/SPEC.md`, troque o começo da linha 3, `Status: **rascunho para o dono aprovar**, 07/10/2026.`, por `Status: **aprovado pelo dono** em 07/10/2026, com o teto de 1000 links (R-40) aceito.` O resto da linha fica igual.

Escreva `../_msg.txt`:

```text
docs(spec,plan): segurança, lote 2 (D-107 a D-112)

Limites no servidor: tamanho do que a conta guarda, chamadas à
cobrança por conta, pedido até 64 KB, comprovante só com e-mail de
faculdade confirmado e a função das vagas de fundador apagada.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

```bash
git add specs/seguranca-lote-2/SPEC.md specs/seguranca-lote-2/PLAN.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

- [ ] **Step 2: Escrever o teste que falha**

Crie `src/data/sqlSegurancaLote2.test.ts`:

```ts
import { PLANOS } from '@/domain/conta.ts'
import { LIMITE_DE_LINKS } from '@/domain/fonteSupabase.ts'
import { LIMITE_DE_COMPROVANTES } from '@/domain/pedidoEstudante.ts'
import sql003 from '../../supabase/003-assinaturas.sql?raw'
import sql from '../../supabase/011-seguranca-lote-2.sql?raw'

const corpoDa = (nome: string) => sql.split(`create or replace function public.${nome}(`)[1]?.split('$$;')[0] ?? ''
const cabecalhoDa = (nome: string) => sql.split(`create or replace function public.${nome}(`)[1]?.split('as $$')[0] ?? ''
/** O que roda direto quando o arquivo roda: o SQL sem o corpo das funções. */
const foraDasFuncoes = sql.replace(/\$\$[\s\S]*?\$\$/g, '')
const inicioDaTabela = sql.indexOf('create table if not exists public.chamadas_da_cobranca (')
/** Só o bloco da tabela de chamadas. */
const tabela = sql.slice(inicioDaTabela, sql.indexOf(');', inicioDaTabela))
const ASSINATURA_DA_CHAMADA = 'public.anotar_chamada_da_cobranca(uuid, text, integer, timestamptz)'

describe('banco: segurança, lote 2 (011)', () => {
  it('pode rodar de novo: nenhum dado é apagado, cada trava sai pelo nome antes de entrar, e tabela e índices só nascem se faltam', () => {
    expect(foraDasFuncoes).not.toMatch(/\b(drop table|truncate|delete from)\b/i)
    const travas = [...sql.matchAll(/add constraint (\w+) check/g)].map((m) => m[1] ?? '')
    expect(travas).toHaveLength(6)
    for (const nome of travas) {
      const sai = sql.indexOf(`drop constraint if exists ${nome};`)
      expect(sai, nome).toBeGreaterThan(-1)
      expect(sai, nome).toBeLessThan(sql.indexOf(`add constraint ${nome} check`))
    }
    const criacoes = sql.split('\n').filter((linha) => /^\s*create (table|index)/i.test(linha))
    expect(criacoes).toHaveLength(3)
    for (const linha of criacoes) expect(linha).toMatch(/if not exists/i)
    expect(sql).toContain('drop trigger if exists conferir_link_do_paciente on public.acompanhamentos;')
    expect(sql).toContain('drop policy if exists "estudante envia o proprio comprovante" on storage.objects;')
  })

  describe('D-107: o tamanho do que a conta guarda na nuvem', () => {
    it('CA-445 e CB-113: a cópia completa vai até 5 MB, medida como o banco guarda; 5 MB exatos passam', () => {
      expect(sql).toContain('alter table public.copias add constraint copias_dados_tamanho check (pg_column_size(dados) <= 5242880);')
      expect(5242880).toBe(5 * 1024 * 1024)
    })

    it('CA-446 e CB-113: missões até 256 KB, marcações até 1 MB, nome até 120 e códigos de caso e de paciente até 64; o limite exato passa', () => {
      expect(sql).toContain('alter table public.acompanhamentos add constraint acompanhamentos_missoes_tamanho check (pg_column_size(missoes) <= 262144);')
      expect(sql).toContain('alter table public.acompanhamentos add constraint acompanhamentos_marcacoes_tamanho check (pg_column_size(marcacoes) <= 1048576);')
      expect(sql).toContain('alter table public.acompanhamentos add constraint acompanhamentos_nome_tamanho check (char_length(nome) <= 120);')
      expect(sql).toContain('alter table public.acompanhamentos add constraint acompanhamentos_caso_id_tamanho check (char_length(caso_id) <= 64);')
      expect(sql).toContain('alter table public.acompanhamentos add constraint acompanhamentos_paciente_id_tamanho check (char_length(paciente_id) <= 64);')
      expect([262144, 1048576]).toEqual([256 * 1024, 1024 * 1024])
    })

    it('CB-112: a trava é da própria tabela, sem gatilho nem limpeza antes de gravar: a cópia recusada deixa a anterior como estava', () => {
      expect(sql).not.toMatch(/on public\.copias\s+for each row/i)
      expect(sql).not.toMatch(/delete from public\.copias/i)
    })
  })

  describe('CA-447: no máximo 1000 links por conta, em qualquer plano', () => {
    const corpo = corpoDa('conferir_link_do_paciente')

    it('os limites de cada plano continuam os de limiteLinksPaciente', () => {
      expect(corpo).toContain("v_limite := case coalesce(v_plano, 'free')")
      for (const plano of PLANOS) {
        if (plano.id === 'free') expect(corpo).toMatch(new RegExp(`else ${plano.limiteLinksPaciente}\\s+end;`))
        else expect(corpo, plano.id).toContain(`when '${plano.id}' then ${plano.limiteLinksPaciente ?? 'null'}`)
      }
    })

    it('o plano sem limite fica com o teto de 1000, e nenhum plano passa dele', () => {
      const teto = corpo.indexOf('v_limite := least(coalesce(v_limite, 1000), 1000);')
      expect(teto).toBeGreaterThan(corpo.indexOf("v_limite := case coalesce(v_plano, 'free')"))
    })

    it('CB-113: com 999 links o milésimo passa; com 1000, o próximo é recusado com a frase que a tela já traduz (CA-422)', () => {
      expect(corpo).toMatch(/if v_links >= v_limite then\s+raise exception 'Você chegou ao limite de links do seu plano\.' using errcode = 'P0001';/)
      expect(corpo).toContain(`'${LIMITE_DE_LINKS}'`)
    })

    it('a contagem vale em todo plano, com a trava contra duas abas antes de contar', () => {
      expect(corpo).not.toContain('if v_limite is not null then')
      const trava = corpo.indexOf("perform pg_advisory_xact_lock(hashtext('links:' || new.nutricionista_id::text));")
      expect(trava).toBeGreaterThan(corpo.indexOf('v_limite := least('))
      expect(trava).toBeLessThan(corpo.indexOf('select count(*) into v_links from public.acompanhamentos where nutricionista_id = new.nutricionista_id;'))
    })

    it('o resto do gatilho do 010 continua: o aviso de estudante, só link novo conta, antes de criar e de alterar', () => {
      expect(corpo).toMatch(/if exists \(select 1 from public\.perfis where id = new\.nutricionista_id and situacao = 'estudante'\) then\s+new\.uso_nao_comercial := true;/)
      expect(corpo).toContain("if tg_op = 'INSERT' and not exists (select 1 from public.acompanhamentos where id = new.id) then")
      expect(sql).toMatch(/create trigger conferir_link_do_paciente\s+before insert or update on public\.acompanhamentos\s+for each row execute function public\.conferir_link_do_paciente\(\);/)
      expect(sql).not.toMatch(/(revoke|grant)[^;]*function public\.conferir_link_do_paciente\(/)
    })
  })

  describe('D-108: as chamadas de cada conta à cobrança', () => {
    const corpo = corpoDa('anotar_chamada_da_cobranca')

    it('a tabela guarda só a conta, o tipo (cartao ou conferir) e a hora', () => {
      expect(inicioDaTabela).toBeGreaterThan(-1)
      expect(tabela).toContain('id bigint generated always as identity primary key,')
      expect(tabela).toContain('nutricionista_id uuid not null references auth.users (id) on delete cascade,')
      expect(tabela).toContain("tipo text not null check (tipo in ('cartao', 'conferir')),")
      expect(tabela).toContain('quando timestamptz not null default now()')
      expect(tabela).not.toMatch(/email|\bip\b|endereco|cartao_final|token/i)
    })

    it('índices pela conta, pelo tipo e pela hora (para contar) e pela hora (para apagar as antigas)', () => {
      expect(sql).toContain('create index if not exists chamadas_da_cobranca_por_conta on public.chamadas_da_cobranca (nutricionista_id, tipo, quando);')
      expect(sql).toContain('create index if not exists chamadas_da_cobranca_por_data on public.chamadas_da_cobranca (quando);')
    })

    it('só o servidor: RLS ligado, nada para anon e authenticated, e a função só para service_role', () => {
      expect(sql).toContain('alter table public.chamadas_da_cobranca enable row level security;')
      expect(sql).toContain('revoke all on public.chamadas_da_cobranca from anon, authenticated;')
      expect(sql).toContain(`revoke all on function ${ASSINATURA_DA_CHAMADA} from public, anon, authenticated;`)
      expect(sql).toContain(`grant execute on function ${ASSINATURA_DA_CHAMADA} to service_role;`)
      expect(sql).not.toMatch(/create policy [^;]*chamadas_da_cobranca/i)
    })

    it('a função roda com as permissões de quem chama (sem security definer) e com search_path fixo', () => {
      const cabecalho = cabecalhoDa('anotar_chamada_da_cobranca')
      expect(cabecalho).toContain('returns boolean')
      expect(cabecalho).toContain('set search_path = public')
      expect(cabecalho).not.toContain('security definer')
    })

    it('CB-115: conta e anota num passo só, com a conta e o tipo travados antes de contar', () => {
      const trava = corpo.indexOf("perform pg_advisory_xact_lock(hashtext('chamadas:' || p_tipo || ':' || p_conta::text));")
      const conta = corpo.indexOf('select count(*) into v_chamadas from public.chamadas_da_cobranca')
      const anota = corpo.indexOf('insert into public.chamadas_da_cobranca (nutricionista_id, tipo) values (p_conta, p_tipo);')
      expect(trava).toBeGreaterThan(-1)
      expect(trava).toBeLessThan(conta)
      expect(conta).toBeLessThan(anota)
    })

    it('CB-113: só recusa com o limite já cheio, numa janela estrita (o 10º e o 20º passam); recusada, nada é anotado', () => {
      expect(corpo).toContain('where nutricionista_id = p_conta and tipo = p_tipo and quando > p_desde;')
      expect(corpo).toMatch(/if v_chamadas >= p_limite then\s+return false;\s+end if;\s+insert into/)
      expect(corpo).toMatch(/values \(p_conta, p_tipo\);\s+return true;/)
    })
  })

  describe('D-111: só estudante com e-mail de faculdade confirmado envia comprovante', () => {
    const corpo = corpoDa('conferir_envio_de_comprovante')

    it('CA-452: confere a situação, depois o e-mail confirmado e de faculdade, depois os arquivos', () => {
      const estudante = corpo.indexOf("if auth.uid() is null or not exists (select 1 from public.perfis where id = auth.uid() and situacao = 'estudante') then")
      const email = corpo.indexOf('if v_confirmado is null or not public.eh_email_de_faculdade(v_email) then')
      const arquivos = corpo.indexOf(`if public.comprovantes_da_conta() >= ${LIMITE_DE_COMPROVANTES} then`)
      expect(estudante).toBeGreaterThan(-1)
      expect(estudante).toBeLessThan(email)
      expect(email).toBeLessThan(arquivos)
      expect(corpo).toContain('select email, email_confirmed_at into v_email, v_confirmado from auth.users where id = auth.uid();')
      expect([...corpo.matchAll(/return '([a-z-]+)';/g)].map((m) => m[1])).toEqual(['nao-estudante', 'sem-email-de-faculdade', 'demais', 'ok'])
    })

    it('CA-452: a política de envio usa a mesma conferência, na pasta da própria pessoa', () => {
      expect(sql).toMatch(
        /create policy "estudante envia o proprio comprovante" on storage\.objects\s+for insert to authenticated\s+with check \(\s+bucket_id = 'comprovantes'\s+and \(storage\.foldername\(name\)\)\[1\] = auth\.uid\(\)::text\s+and public\.conferir_envio_de_comprovante\(\) = 'ok'\s+\);/,
      )
    })

    it('a conferência é security definer com search_path fixo, e só quem está logado a executa', () => {
      const cabecalho = cabecalhoDa('conferir_envio_de_comprovante')
      expect(cabecalho).toContain('returns text')
      expect(cabecalho).toContain('security definer')
      expect(cabecalho).toContain('set search_path = public')
      expect(sql).toContain('revoke execute on function public.conferir_envio_de_comprovante() from public, anon;')
      expect(sql).toContain('grant execute on function public.conferir_envio_de_comprovante() to authenticated;')
    })

    it('é a única política que este arquivo cria, e nada é concedido a anon nem a public', () => {
      expect([...sql.matchAll(/create policy "([^"]+)" on ([\w.]+)/g)].map((m) => `${m[2]}:${m[1]}`)).toEqual(['storage.objects:estudante envia o proprio comprovante'])
      expect(sql).not.toMatch(/grant [^;]*\bto [^;]*\b(anon|public)\b/i)
    })
  })

  describe('CA-453: a função das vagas de fundador não existe mais', () => {
    it('o 011 apaga a função de quem já a tinha', () => {
      expect(sql).toContain('drop function if exists public.vagas_de_fundador_usadas();')
    })

    it('o 003 não a cria mais', () => {
      expect(sql003).toContain('create table if not exists public.assinaturas (')
      expect(sql003).not.toContain('vagas_de_fundador_usadas')
    })
  })

  it('a conferência depois de rodar mostra as travas, a função apagada e a tabela nova', () => {
    expect(sql).toMatch(/^-- select conname from pg_constraint where conname like '%tamanho' order by conname;/m)
    expect(sql).toMatch(/^-- select to_regprocedure\('public\.vagas_de_fundador_usadas\(\)'\) as vagas;/m)
    expect(sql).toMatch(/^-- select relname, relrowsecurity from pg_class where oid = 'public\.chamadas_da_cobranca'::regclass;/m)
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run src/data/sqlSegurancaLote2.test.ts`
Expected: FAIL, porque `supabase/011-seguranca-lote-2.sql` ainda não existe (erro ao carregar o `?raw`).

- [ ] **Step 4: Escrever o SQL**

Crie `supabase/011-seguranca-lote-2.sql`:

```sql
-- MetaNutri — segurança, lote 2 (spec seguranca-lote-2, D-107 a D-112).
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Pode rodar de novo: nenhum dado é apagado.
-- Rode DEPOIS do 001 ao 010. Se rodar o 003, o 006 ou o 010 de novo, rode este logo depois.
--
-- Rode ANTES de publicar as funções assinar, gerenciar-assinatura e webhook-mercadopago desta versão:
-- elas anotam cada chamada à cobrança na tabela nova. Publicadas antes dele, assinar, trocar o cartão,
-- conferir e cancelar respondem que não conseguiram falar com o servidor de cobrança, sem cobrar.
--
-- O banco passa a limitar o tamanho do que cada conta guarda na nuvem e quantas vezes ela chama a
-- cobrança. Em 07/10/2026 não havia cópia nem link gravados em produção: nenhuma trava nova recusa
-- dado que já existe.


-- ---------- Tamanho do que a conta guarda na nuvem (D-107, CA-445 e CA-446) ----------

-- O app reconhece cada trava pelo nome para dizer o motivo na tela (TRAVAS_DE_TAMANHO, em
-- src/ui/estado/mensagemDoBanco.ts). O tamanho é o que o banco guarda (pg_column_size), e o limite
-- exato passa (CB-113). Recusada, a gravação inteira é desfeita: a cópia anterior fica (CB-112).
alter table public.copias drop constraint if exists copias_dados_tamanho;
alter table public.copias add constraint copias_dados_tamanho check (pg_column_size(dados) <= 5242880);

-- Cada link: missões até 256 KB; marcações até 1 MB, o mesmo teto que o marcar_missoes (010) já põe;
-- nome até 120 caracteres; códigos de caso e de paciente até 64 (o de paciente pode faltar).
alter table public.acompanhamentos drop constraint if exists acompanhamentos_missoes_tamanho;
alter table public.acompanhamentos add constraint acompanhamentos_missoes_tamanho check (pg_column_size(missoes) <= 262144);
alter table public.acompanhamentos drop constraint if exists acompanhamentos_marcacoes_tamanho;
alter table public.acompanhamentos add constraint acompanhamentos_marcacoes_tamanho check (pg_column_size(marcacoes) <= 1048576);
alter table public.acompanhamentos drop constraint if exists acompanhamentos_nome_tamanho;
alter table public.acompanhamentos add constraint acompanhamentos_nome_tamanho check (char_length(nome) <= 120);
alter table public.acompanhamentos drop constraint if exists acompanhamentos_caso_id_tamanho;
alter table public.acompanhamentos add constraint acompanhamentos_caso_id_tamanho check (char_length(caso_id) <= 64);
alter table public.acompanhamentos drop constraint if exists acompanhamentos_paciente_id_tamanho;
alter table public.acompanhamentos add constraint acompanhamentos_paciente_id_tamanho check (char_length(paciente_id) <= 64);


-- ---------- Teto de links por conta (D-107, CA-447) ----------

-- A mesma função do 010, com um teto técnico de 1000 links em qualquer plano. Pro e Clínica continuam
-- sem limite de plano (limiteLinksPaciente nulo, em src/domain/conta.ts), mas não passam de 1000. A
-- recusa é a mesma frase do limite do plano, que a tela já traduz.
create or replace function public.conferir_link_do_paciente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plano text;
  v_limite integer;
  v_links integer;
begin
  -- CA-421: conta de estudante, aprovada ou não, sempre grava o link com o aviso.
  if exists (select 1 from public.perfis where id = new.nutricionista_id and situacao = 'estudante') then
    new.uso_nao_comercial := true;
  end if;

  -- CA-422: só link novo conta. O upsert que regrava um link que já existe (gerar de novo,
  -- marcar) também passa por aqui como insert, e não é barrado.
  if tg_op = 'INSERT' and not exists (select 1 from public.acompanhamentos where id = new.id) then
    select case
             when a.status = 'ativa' and (a.expira_em is null or a.expira_em >= now()) then a.plano
             when a.status = 'cancelada' and a.plano in ('solo', 'pro', 'clinica') and a.expira_em > now() then a.plano
             else 'free'
           end
      into v_plano
      from public.assinaturas a
     where a.nutricionista_id = new.nutricionista_id;

    v_limite := case coalesce(v_plano, 'free')
                  when 'estudante' then 3
                  when 'solo' then 25
                  when 'pro' then null
                  when 'clinica' then null
                  else 2
                end;
    -- D-107: o plano sem limite fica com o teto técnico, e nenhum plano passa dele.
    v_limite := least(coalesce(v_limite, 1000), 1000);

    -- Dois links criados ao mesmo tempo (duas abas) esperam um pelo outro para contar.
    perform pg_advisory_xact_lock(hashtext('links:' || new.nutricionista_id::text));
    select count(*) into v_links from public.acompanhamentos where nutricionista_id = new.nutricionista_id;
    if v_links >= v_limite then
      raise exception 'Você chegou ao limite de links do seu plano.' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists conferir_link_do_paciente on public.acompanhamentos;
create trigger conferir_link_do_paciente
  before insert or update on public.acompanhamentos
  for each row execute function public.conferir_link_do_paciente();


-- ---------- Vagas de fundador (D-112, CA-453) ----------

-- Não existe mais preço de fundador (D-78) e nada no site chama esta função. O 003 não a cria mais.
drop function if exists public.vagas_de_fundador_usadas();


-- ---------- Comprovante: só estudante com e-mail de faculdade confirmado (D-111, CA-452) ----------

-- A mesma condição que enviar_pedido_estudante (006) já exige, conferida antes de o arquivo entrar no
-- balde. A tela pergunta por esta função antes de enviar, para dizer o motivo (CA-452 e CA-428); a
-- política de envio usa a mesma, e é ela que garante. Respostas: 'ok', 'nao-estudante',
-- 'sem-email-de-faculdade' ou 'demais' (10 arquivos ou mais).
create or replace function public.conferir_envio_de_comprovante()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text;
  v_confirmado timestamptz;
begin
  if auth.uid() is null or not exists (select 1 from public.perfis where id = auth.uid() and situacao = 'estudante') then
    return 'nao-estudante';
  end if;
  select email, email_confirmed_at into v_email, v_confirmado from auth.users where id = auth.uid();
  if v_confirmado is null or not public.eh_email_de_faculdade(v_email) then
    return 'sem-email-de-faculdade';
  end if;
  if public.comprovantes_da_conta() >= 10 then
    return 'demais';
  end if;
  return 'ok';
end;
$$;

revoke execute on function public.conferir_envio_de_comprovante() from public, anon;
grant execute on function public.conferir_envio_de_comprovante() to authenticated;

drop policy if exists "estudante envia o proprio comprovante" on storage.objects;
create policy "estudante envia o proprio comprovante" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'comprovantes'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.conferir_envio_de_comprovante() = 'ok'
  );


-- ---------- Chamadas à cobrança por conta (D-108, CA-448 e CA-449) ----------

-- Cada chamada das funções de cobrança à operadora, por conta e por tipo: 'cartao' (assinar e trocar o
-- cartão) ou 'conferir' (conferir se já houve cobrança e cancelar). Sem endereço de internet. As
-- funções apagam as de mais de 2 dias a cada chamada anotada. Só o servidor mexe aqui.
create table if not exists public.chamadas_da_cobranca (
  id bigint generated always as identity primary key,
  nutricionista_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('cartao', 'conferir')),
  quando timestamptz not null default now()
);
create index if not exists chamadas_da_cobranca_por_conta on public.chamadas_da_cobranca (nutricionista_id, tipo, quando);
create index if not exists chamadas_da_cobranca_por_data on public.chamadas_da_cobranca (quando);
alter table public.chamadas_da_cobranca enable row level security;
revoke all on public.chamadas_da_cobranca from anon, authenticated;

-- Conta e anota num passo só: com a conta e o tipo travados, dois pedidos ao mesmo tempo não passam
-- juntos do limite (CB-115). Verdadeiro: anotou, e a função pode chamar a operadora. Falso: já havia
-- p_limite chamadas depois de p_desde, e nada foi anotado. O limite e a janela vêm das funções
-- (supabase/functions/_shared/chamadas.ts).
create or replace function public.anotar_chamada_da_cobranca(p_conta uuid, p_tipo text, p_limite integer, p_desde timestamptz)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_chamadas integer;
begin
  perform pg_advisory_xact_lock(hashtext('chamadas:' || p_tipo || ':' || p_conta::text));
  select count(*) into v_chamadas from public.chamadas_da_cobranca
   where nutricionista_id = p_conta and tipo = p_tipo and quando > p_desde;
  if v_chamadas >= p_limite then
    return false;
  end if;
  insert into public.chamadas_da_cobranca (nutricionista_id, tipo) values (p_conta, p_tipo);
  return true;
end;
$$;

-- Só o servidor (service_role) chama. Sem security definer: ela roda com as permissões de quem chama.
revoke all on function public.anotar_chamada_da_cobranca(uuid, text, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.anotar_chamada_da_cobranca(uuid, text, integer, timestamptz) to service_role;


-- ---------- Registro de avisos (D-109, CA-450) ----------

-- Nada novo aqui: a função do aviso conta os não conferidos da última hora pelo índice por data do 009
-- (avisos_da_operadora_por_data) e, com 100 ou mais, não anota o próximo.


-- Conferência depois de rodar (copie para uma consulta nova):
-- select conname from pg_constraint where conname like '%tamanho' order by conname;
-- -- seis linhas: acompanhamentos_caso_id_tamanho, acompanhamentos_marcacoes_tamanho, acompanhamentos_missoes_tamanho,
-- --   acompanhamentos_nome_tamanho, acompanhamentos_paciente_id_tamanho e copias_dados_tamanho
-- select to_regprocedure('public.vagas_de_fundador_usadas()') as vagas;
-- -- uma linha: nulo (a função não existe mais)
-- select relname, relrowsecurity from pg_class where oid = 'public.chamadas_da_cobranca'::regclass;
-- -- uma linha: chamadas_da_cobranca, true
-- select has_function_privilege('authenticated', 'public.anotar_chamada_da_cobranca(uuid, text, integer, timestamptz)', 'execute') as logado_chamada,
--        has_function_privilege('anon', 'public.conferir_envio_de_comprovante()', 'execute') as anon_comprovante,
--        has_function_privilege('authenticated', 'public.conferir_envio_de_comprovante()', 'execute') as logado_comprovante;
-- -- uma linha: false, false, true
```

- [ ] **Step 5: Tirar a função das vagas do 003**

Em `supabase/003-assinaturas.sql`, troque o bloco das linhas 31 a 43:

```sql
-- Quantas assinaturas pagas já existem, para saber se as vagas de fundador acabaram.
-- Conta sem expor quem é quem.
create or replace function public.vagas_de_fundador_usadas()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::integer from public.assinaturas where status = 'ativa' and preco_travado;
$$;

revoke all on function public.vagas_de_fundador_usadas() from public;
grant execute on function public.vagas_de_fundador_usadas() to anon, authenticated;
```

por:

```sql
-- A função que contava as vagas de fundador saiu (D-112 da spec seguranca-lote-2): não existe mais
-- preço de fundador (D-78). O 011 a apaga de quem já tinha rodado este arquivo.
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run src/data/sqlSegurancaLote2.test.ts src/data/sqlSeguranca.test.ts`
Expected: PASS nos dois (o teste do 010 não muda: o arquivo 010 continua igual).

Run: `npm run check`
Expected: lint, typecheck e testes verdes.

- [ ] **Step 7: Commit**

`../_msg.txt`:

```text
feat(banco): limites do lote 2 de segurança (011)

Travas de tamanho na cópia e nos links, teto de 1000 links por
conta, contagem das chamadas à cobrança num passo só, comprovante só
com e-mail de faculdade confirmado e a função das vagas de fundador
apagada (também do 003).

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

```bash
git add supabase/011-seguranca-lote-2.sql supabase/003-assinaturas.sql src/data/sqlSegurancaLote2.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 2: Tela: a cópia e o link grandes demais

Cobre o lado da tela de D-107 (CA-445, CA-446, CB-112) e o risco R-41.

**Files:**
- Modify (arquivo inteiro): `src/ui/estado/mensagemDoBanco.ts`
- Modify (arquivo inteiro): `src/ui/estado/mensagemDoBanco.test.ts`
- Modify: `src/domain/copiaNaNuvem.ts:6,9-12,59-70`
- Modify: `src/domain/copiaNaNuvem.test.ts` (o falso e um `describe` novo no fim)
- Modify: `src/domain/fonteSupabase.test.ts` (import e um teste)
- Modify: `src/ui/missoes/CartaoLinkMissoes.tsx` (import e o aviso da nuvem)
- Modify: `src/ui/missoes/missoesNaNuvem.test.tsx` (o falso e um `describe` novo no fim)

**Interfaces:**
- Consumes: os nomes das seis travas do 011 (Tarefa 1).
- Produces (`src/ui/estado/mensagemDoBanco.ts`):

```ts
export const FALHA_DE_REDE: string // sem mudança
export const COPIA_GRANDE_DEMAIS = 'A cópia passou de 5 MB, o máximo da nuvem. Seus dados continuam neste aparelho.'
export const LINK_GRANDE_DEMAIS = 'Este link ficou grande demais. Tire algumas missões e tente de novo.'
export const TRAVAS_DE_TAMANHO: Readonly<Record<string, string>>
export function mensagemDoBanco(erro: { readonly message?: string; readonly code?: string } | null): string | null // agora traduz o 23514 das travas de tamanho
```

- [ ] **Step 1: Escrever os testes que falham**

Substitua `src/ui/estado/mensagemDoBanco.test.ts` inteiro por:

```ts
import sql011 from '../../../supabase/011-seguranca-lote-2.sql?raw'
import { COPIA_GRANDE_DEMAIS, FALHA_DE_REDE, LINK_GRANDE_DEMAIS, mensagemDoBanco, TRAVAS_DE_TAMANHO } from './mensagemDoBanco.ts'

/** A mensagem que o banco manda quando uma trava (check) recusa a linha. */
const recusaDaTrava = (tabela: string, trava: string) => ({ code: '23514', message: `new row for relation "${tabela}" violates check constraint "${trava}"` })

describe('mensagemDoBanco (D-98)', () => {
  it('sem erro, sem mensagem', () => {
    expect(mensagemDoBanco(null)).toBeNull()
  })

  it('a frase que o próprio banco escreve passa como veio', () => {
    expect(mensagemDoBanco({ code: 'P0001', message: 'Você já tem um comprovante em análise.' })).toBe('Você já tem um comprovante em análise.')
    expect(mensagemDoBanco({ code: '42501', message: 'Entre na sua conta.' })).toBe('Entre na sua conta.')
  })

  it('CA-422: o limite de links do plano chega com a frase da tela', () => {
    expect(mensagemDoBanco({ code: 'P0001', message: 'Você chegou ao limite de links do seu plano.' })).toBe('Você chegou ao limite de links do seu plano.')
  })

  it('CA-430: a recusa do RLS e a falta de permissão do Postgres não aparecem cruas', () => {
    expect(mensagemDoBanco({ code: '42501', message: 'new row violates row-level security policy for table "copias"' })).toBe(FALHA_DE_REDE)
    expect(mensagemDoBanco({ code: '42501', message: 'permission denied for table acompanhamentos' })).toBe(FALHA_DE_REDE)
    expect(mensagemDoBanco({ code: '42501', message: 'permission denied for function marcar_missoes' })).toBe(FALHA_DE_REDE)
  })

  it('CA-430: outros códigos e erro sem código viram a mensagem de falha', () => {
    expect(mensagemDoBanco({ code: '23514', message: 'new row for relation "acompanhamentos" violates check constraint "acompanhamentos_token_formato"' })).toBe(
      FALHA_DE_REDE,
    )
    expect(mensagemDoBanco({ code: 'PGRST301', message: 'JWT expired' })).toBe(FALHA_DE_REDE)
    expect(mensagemDoBanco({ message: 'Failed to fetch' })).toBe(FALHA_DE_REDE)
  })
})

describe('as travas de tamanho (D-107)', () => {
  it('CA-445: a cópia acima de 5 MB chega com a frase da cópia', () => {
    expect(mensagemDoBanco(recusaDaTrava('copias', 'copias_dados_tamanho'))).toBe(COPIA_GRANDE_DEMAIS)
    expect(COPIA_GRANDE_DEMAIS).toBe('A cópia passou de 5 MB, o máximo da nuvem. Seus dados continuam neste aparelho.')
  })

  it('CA-446: cada trava de tamanho do link chega com a frase do link', () => {
    for (const trava of ['acompanhamentos_missoes_tamanho', 'acompanhamentos_marcacoes_tamanho', 'acompanhamentos_nome_tamanho', 'acompanhamentos_caso_id_tamanho', 'acompanhamentos_paciente_id_tamanho']) {
      expect(mensagemDoBanco(recusaDaTrava('acompanhamentos', trava)), trava).toBe(LINK_GRANDE_DEMAIS)
    }
    expect(LINK_GRANDE_DEMAIS).toBe('Este link ficou grande demais. Tire algumas missões e tente de novo.')
  })

  it('o nome da trava vale em qualquer idioma do banco (vem entre aspas)', () => {
    expect(mensagemDoBanco({ code: '23514', message: 'novo registro da relação "copias" viola restrição de verificação "copias_dados_tamanho"' })).toBe(COPIA_GRANDE_DEMAIS)
  })

  it('o nome de uma trava fora do código 23514 não é traduzido', () => {
    expect(mensagemDoBanco({ code: '42501', message: 'permission denied "copias_dados_tamanho"' })).toBe(FALHA_DE_REDE)
  })

  it('as travas que a tela conhece são exatamente as do 011', () => {
    const doBanco = [...sql011.matchAll(/add constraint (\w+_tamanho) check/g)].map((m) => m[1] ?? '').sort()
    expect(Object.keys(TRAVAS_DE_TAMANHO).sort()).toEqual(doBanco)
  })
})
```

Em `src/domain/copiaNaNuvem.test.ts`:

1. Troque a primeira linha, `import { FALHA_DE_REDE } from '@/ui/estado/mensagemDoBanco.ts'`, por `import { COPIA_GRANDE_DEMAIS, FALHA_DE_REDE } from '@/ui/estado/mensagemDoBanco.ts'`.
2. No `clienteFalso`, troque o tipo das opções:

```ts
  opcoes: { readonly usuario?: string | null; readonly linha?: unknown; readonly erro?: string | { readonly message: string; readonly code: string } } = {},
```

por:

```ts
  opcoes: {
    readonly usuario?: string | null
    readonly linha?: unknown
    readonly erro?: string | { readonly message: string; readonly code: string }
    /** O status HTTP da gravação (R-41: o servidor pode recusar antes do banco). */
    readonly status?: number
  } = {},
```

3. Ainda no `clienteFalso`, troque a resposta do `upsert`, `return Promise.resolve({ data: null, error: erro })` (a primeira, dentro de `upsert: (linha) => {`), por:

```ts
        return Promise.resolve({ data: null, error: erro, ...(opcoes.status === undefined ? {} : { status: opcoes.status }) })
```

4. No fim do arquivo, acrescente:

```ts
describe('A cópia grande demais (D-107)', () => {
  const RECUSA_DA_TRAVA = { code: '23514', message: 'new row for relation "copias" violates check constraint "copias_dados_tamanho"' }

  it('CA-445: o banco recusa a cópia acima de 5 MB e a tela recebe a frase de tamanho', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-1', erro: RECUSA_DA_TRAVA })
    expect(await enviarCopia(cliente, BACKUP, 'Mac')).toEqual({ ok: null, erro: COPIA_GRANDE_DEMAIS })
  })

  it('CA-445 e R-41: o servidor que recusa o pedido grande antes do banco (413) mostra a mesma frase', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-1', erro: 'Payload Too Large', status: 413 })
    expect((await enviarCopia(cliente, BACKUP, 'Mac')).erro).toBe(COPIA_GRANDE_DEMAIS)
  })

  it('outro status sem trava conhecida continua com a mensagem de falha', async () => {
    const { cliente } = clienteFalso({ usuario: 'user-1', erro: 'Bad Gateway', status: 502 })
    expect((await enviarCopia(cliente, BACKUP, 'Mac')).erro).toBe(FALHA_DE_REDE)
  })

  it('CB-112: a cópia recusada não apaga a anterior: um pedido só de gravar, nenhum de apagar', async () => {
    const { cliente, chamadas } = clienteFalso({ usuario: 'user-1', erro: RECUSA_DA_TRAVA })
    await enviarCopia(cliente, BACKUP, 'Mac')
    expect(chamadas.map((c) => c.tipo)).toEqual(['upsert'])
  })
})
```

Em `src/domain/fonteSupabase.test.ts`:

1. Troque a primeira linha, `import { FALHA_DE_REDE } from '@/ui/estado/mensagemDoBanco.ts'`, por `import { FALHA_DE_REDE, LINK_GRANDE_DEMAIS } from '@/ui/estado/mensagemDoBanco.ts'`.
2. Dentro de `describe('O link do paciente na nuvem, pelo lado do nutricionista (missoes-na-nuvem)', …)`, logo antes de `it('CA-430 / CA-439: a nuvem recusa: devolve a falha traduzida, nunca o texto técnico', async () => {`, acrescente:

```ts
  it('CA-446: o banco recusa o link grande demais, por qualquer das cinco travas; a tela recebe a frase de tamanho', async () => {
    const travas = ['acompanhamentos_missoes_tamanho', 'acompanhamentos_marcacoes_tamanho', 'acompanhamentos_nome_tamanho', 'acompanhamentos_caso_id_tamanho', 'acompanhamentos_paciente_id_tamanho']
    for (const trava of travas) {
      const erro = { code: '23514', message: `new row for relation "acompanhamentos" violates check constraint "${trava}"` }
      expect(await salvarLinkNaNuvem(clienteFalso({ usuario: 'user-99', erro }).cliente, acompanhamento(), NOVO), trava).toEqual({ tipo: 'falhou', motivo: LINK_GRANDE_DEMAIS })
      expect(await salvarLinkNaNuvem(clienteFalso({ usuario: 'user-99', erro }).cliente, acompanhamento(), JA_ESTEVE), trava).toEqual({ tipo: 'falhou', motivo: LINK_GRANDE_DEMAIS })
      expect(await subirAcompanhamento(clienteFalso({ usuario: 'user-99', erro }).cliente, acompanhamento()), trava).toBe(LINK_GRANDE_DEMAIS)
    }
  })
```

Em `src/ui/missoes/missoesNaNuvem.test.tsx`:

1. Troque `import { FALHA_DE_REDE } from '@/ui/estado/mensagemDoBanco.ts'` por `import { FALHA_DE_REDE, LINK_GRANDE_DEMAIS } from '@/ui/estado/mensagemDoBanco.ts'`.
2. No objeto `nuvem` (dentro de `vi.hoisted`), logo depois de `falha: { select: false, upsert: false, delete: false },`, acrescente:

```ts
  /** O banco recusa a gravação do link pela trava de tamanho (011). */
  grandeDemais: false,
```

3. Logo depois de `const SEM_INTERNET: RespostaFalsa = { data: null, error: { message: 'TypeError: Failed to fetch' } }`, acrescente:

```ts
const GRANDE_DEMAIS: RespostaFalsa = {
  data: null,
  error: { code: '23514', message: 'new row for relation "acompanhamentos" violates check constraint "acompanhamentos_missoes_tamanho"' },
}
```

4. Nas duas respostas de gravar do `clienteDaNuvem` (a do `upsert` e a do `update`), logo depois da linha `if (nuvem.falha.upsert) return SEM_INTERNET`, acrescente, com o mesmo recuo, `if (nuvem.grandeDemais) return GRANDE_DEMAIS`.
5. No `beforeEach` do arquivo, logo depois de `nuvem.falha = { select: false, upsert: false, delete: false }`, acrescente `nuvem.grandeDemais = false`.
6. No fim do arquivo, acrescente:

```tsx
describe('O link grande demais (D-107)', () => {
  it('CA-446: a tela diz que o link ficou grande demais, sem oferecer mandar o mesmo de novo', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    nuvem.grandeDemais = true
    cartao(repo)

    await gerarLink(usuario)

    expect(await screen.findByText(LINK_GRANDE_DEMAIS)).toBeInTheDocument()
    expect(screen.queryByText(NAO_SALVOU)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
    expect(nuvem.linhas).toEqual([])
    expect(repo.porCaso('c1')).not.toBeNull()
  })

  it('Foco: o link grande demais fica pendente; ao voltar para a aba, a leitura manda de novo e a frase de tamanho continua', async () => {
    const usuario = userEvent.setup()
    const repo = criarRepositorioAcompanhamentos(memoria())
    nuvem.grandeDemais = true
    cartao(repo)
    await gerarLink(usuario)
    expect(await screen.findByText(LINK_GRANDE_DEMAIS)).toBeInTheDocument()

    nuvem.chamadas = []
    act(() => {
      fireEvent(document, new Event('visibilitychange'))
    })
    await waitFor(() => expect(nuvem.chamadas).toContain('criar-se-faltar'))
    await assentar()

    expect(screen.getByText(LINK_GRANDE_DEMAIS)).toBeInTheDocument()
    expect(screen.queryByText(NAO_SALVOU)).not.toBeInTheDocument()
    expect(nuvem.linhas).toEqual([])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/estado/mensagemDoBanco.test.ts src/domain/copiaNaNuvem.test.ts src/domain/fonteSupabase.test.ts src/ui/missoes/missoesNaNuvem.test.tsx`
Expected: FAIL. Os imports de `COPIA_GRANDE_DEMAIS`, `LINK_GRANDE_DEMAIS` e `TRAVAS_DE_TAMANHO` não existem; os testes de tamanho recebem a mensagem de falha de rede.

- [ ] **Step 3: Traduzir as travas de tamanho**

Substitua `src/ui/estado/mensagemDoBanco.ts` inteiro por:

```ts
// O banco explica os próprios erros em português (`raise exception`, com estes
// códigos). Qualquer outra coisa é rede, servidor fora ou erro que a pessoa não
// tem como resolver: vira a mensagem de falha de rede. A exceção são as travas de
// tamanho (D-107): o banco recusa pelo nome da trava, e a tela diz o motivo.
export const FALHA_DE_REDE = 'Não deu para falar com o servidor. Confira a internet e tente de novo.'

/** D-107 (CA-445): a cópia completa passou do tamanho que a nuvem guarda. */
export const COPIA_GRANDE_DEMAIS = 'A cópia passou de 5 MB, o máximo da nuvem. Seus dados continuam neste aparelho.'
/** D-107 (CA-446): o link passou de um dos tamanhos que a nuvem guarda. */
export const LINK_GRANDE_DEMAIS = 'Este link ficou grande demais. Tire algumas missões e tente de novo.'

/** D-107: as travas de tamanho do banco (supabase/011-seguranca-lote-2.sql), pelo nome, com a frase de cada uma. */
export const TRAVAS_DE_TAMANHO: Readonly<Record<string, string>> = {
  copias_dados_tamanho: COPIA_GRANDE_DEMAIS,
  acompanhamentos_missoes_tamanho: LINK_GRANDE_DEMAIS,
  acompanhamentos_marcacoes_tamanho: LINK_GRANDE_DEMAIS,
  acompanhamentos_nome_tamanho: LINK_GRANDE_DEMAIS,
  acompanhamentos_caso_id_tamanho: LINK_GRANDE_DEMAIS,
  acompanhamentos_paciente_id_tamanho: LINK_GRANDE_DEMAIS,
}

/** O código do Postgres para a trava (check) que recusou a linha. */
const TRAVA_RECUSOU = '23514'

const EXPLICADOS: readonly string[] = ['P0001', '22023', '42501']

/**
 * As frases do MetaNutri terminam em ponto; as do próprio Postgres, não (é a regra de estilo
 * dele). É o que separa "Entre na sua conta." da recusa do RLS, que chega com o mesmo 42501.
 */
const ehFraseDoMetaNutri = (texto: string): boolean => texto.trim().endsWith('.')

/** A frase da trava de tamanho citada na mensagem. O nome vem entre aspas, em qualquer idioma do banco. */
function fraseDaTrava(mensagem: string): string | null {
  for (const [nome, frase] of Object.entries(TRAVAS_DE_TAMANHO)) if (mensagem.includes(`"${nome}"`)) return frase
  return null
}

export function mensagemDoBanco(erro: { readonly message?: string; readonly code?: string } | null): string | null {
  if (!erro) return null
  if (erro.code === TRAVA_RECUSOU && erro.message) {
    const frase = fraseDaTrava(erro.message)
    if (frase) return frase
  }
  if (erro.code && EXPLICADOS.includes(erro.code) && erro.message && ehFraseDoMetaNutri(erro.message)) return erro.message
  return FALHA_DE_REDE
}
```

O link não precisa de mudança em `src/domain/fonteSupabase.ts`: `motivoDoErro` já passa por `mensagemDoBanco`.

- [ ] **Step 4: O 413 do servidor na cópia (R-41)**

Em `src/domain/copiaNaNuvem.ts`:

1. Troque a linha 6 por `import { COPIA_GRANDE_DEMAIS, FALHA_DE_REDE, mensagemDoBanco } from '@/ui/estado/mensagemDoBanco.ts'`.
2. Troque a interface `Resposta<T>` (linhas 9 a 12) por:

```ts
interface Resposta<T> {
  readonly data: T | null
  readonly error: { readonly message: string; readonly code?: string } | null
  /** O status HTTP. O servidor pode recusar a cópia grande antes de ela chegar ao banco (413). */
  readonly status?: number
}
```

3. No fim de `enviarCopia`, troque:

```ts
  const { error } = await cliente
    .from(TABELA)
    .upsert({ nutricionista_id: usuario, dados: backup, aparelho, atualizado_em: agora }, { onConflict: 'nutricionista_id' })

  return error ? { ok: null, erro: traduzido(error) } : { ok: agora, erro: null }
```

por:

```ts
  const { error, status } = await cliente
    .from(TABELA)
    .upsert({ nutricionista_id: usuario, dados: backup, aparelho, atualizado_em: agora }, { onConflict: 'nutricionista_id' })

  if (!error) return { ok: agora, erro: null }
  // R-41: o servidor pode recusar o pedido grande antes de ele chegar ao banco; a frase é a mesma da trava (CA-445).
  return { ok: null, erro: status === 413 ? COPIA_GRANDE_DEMAIS : traduzido(error) }
```

- [ ] **Step 5: O cartão do link mostra a frase de tamanho**

Em `src/ui/missoes/CartaoLinkMissoes.tsx`:

1. Logo depois de `import { useAcompanhamentos, useLerDaNuvemAoAbrir } from '@/ui/estado/contextoAcompanhamentos.ts'`, acrescente `import { LINK_GRANDE_DEMAIS } from '@/ui/estado/mensagemDoBanco.ts'`.
2. Troque o bloco do `avisoDaNuvem`:

```tsx
  // O link que não chegou à nuvem fica marcado até subir (CA-439, CA-443).
  const motivo = noLimite ? LIMITE_DE_LINKS : acompanhamento ? foraDaNuvem.get(acompanhamento.id) : undefined
  const avisoDaNuvem =
    motivo === undefined ? null : motivo === LIMITE_DE_LINKS ? (
```

por:

```tsx
  // O link que não chegou à nuvem fica marcado até subir (CA-439, CA-443). O grande demais (CA-446) não
  // oferece mandar de novo: o mesmo link seria recusado de novo; a frase diz o que fazer.
  const motivo = noLimite ? LIMITE_DE_LINKS : acompanhamento ? foraDaNuvem.get(acompanhamento.id) : undefined
  const avisoDaNuvem =
    motivo === undefined ? null : motivo === LINK_GRANDE_DEMAIS ? (
      <div role="alert" className="mt-4 rounded-xl border border-statelow/40 bg-lightwarning p-3 text-sm text-warningtext">
        <p>{LINK_GRANDE_DEMAIS}</p>
      </div>
    ) : motivo === LIMITE_DE_LINKS ? (
```

O resto da expressão (o ramo do limite e o do `NAO_SALVOU`) fica igual.

- [ ] **Step 6: Rodar e ver passar**

Run: `npx vitest run src/ui/estado/mensagemDoBanco.test.ts src/domain/copiaNaNuvem.test.ts src/domain/fonteSupabase.test.ts src/ui/missoes/missoesNaNuvem.test.tsx`
Expected: PASS.

Run: `npm run check`
Expected: verde.

- [ ] **Step 7: Commit**

`../_msg.txt`:

```text
feat(nuvem): tela diz quando a cópia ou o link passam do tamanho

As travas de tamanho do 011 chegam traduzidas pelo nome; o 413 do
servidor na cópia mostra a mesma frase. O link grande demais fica
pendente e o cartão não oferece mandar o mesmo de novo.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

```bash
git add src/ui/estado/mensagemDoBanco.ts src/ui/estado/mensagemDoBanco.test.ts src/domain/copiaNaNuvem.ts src/domain/copiaNaNuvem.test.ts src/domain/fonteSupabase.test.ts src/ui/missoes/CartaoLinkMissoes.tsx src/ui/missoes/missoesNaNuvem.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 3: Tela: o comprovante confere a conta antes de enviar

Cobre o lado da tela de D-111 (CA-452) e mantém o CA-428.

**Files:**
- Modify: `src/domain/pedidoEstudante.ts:46-48`
- Modify: `src/domain/pedidoEstudante.test.ts` (import e um `describe` no fim)
- Modify: `src/ui/estado/usarPedidoEstudante.ts:5,56-67`
- Modify (arquivo inteiro): `src/ui/estado/usarPedidoEstudante.test.ts`
- Modify: `src/ui/publico/conta/TelaComprovarMatricula.test.tsx` (import e um teste)

**Interfaces:**
- Consumes: `conferir_envio_de_comprovante()` do 011 (Tarefa 1), com as respostas `'ok' | 'nao-estudante' | 'sem-email-de-faculdade' | 'demais'`.
- Produces (`src/domain/pedidoEstudante.ts`):

```ts
export const MENSAGEM_EMAIL_DA_FACULDADE = 'Confirme o e-mail da faculdade antes de enviar o comprovante.'
export const MENSAGEM_SO_ESTUDANTE = 'Só conta de estudante envia comprovante de matrícula.'
export function recusaDoComprovante(situacao: unknown): string | null
```

- [ ] **Step 1: Escrever os testes que falham**

Em `src/domain/pedidoEstudante.test.ts`:

1. Logo depois de `import { SEM_ASSINATURA, type Assinatura } from './assinatura.ts'`, acrescente `import sql011 from '../../supabase/011-seguranca-lote-2.sql?raw'`.
2. No import de `./pedidoEstudante.ts`, acrescente (em ordem alfabética, como está) `MENSAGEM_COMPROVANTES_DEMAIS`, `MENSAGEM_EMAIL_DA_FACULDADE`, `MENSAGEM_SO_ESTUDANTE` e `recusaDoComprovante`. O bloco fica:

```ts
import {
  ARQUIVO_MAXIMO_BYTES,
  avisoDoEstudante,
  caminhoDoComprovante,
  daLinhaPedido,
  formatarDataLonga,
  formatarMesAno,
  MENSAGEM_COMPROVANTES_DEMAIS,
  MENSAGEM_EMAIL_DA_FACULDADE,
  MENSAGEM_SO_ESTUDANTE,
  mesAtual,
  recusaDoComprovante,
  validarPedido,
  type PedidoEstudante,
} from './pedidoEstudante.ts'
```

3. No fim do arquivo, acrescente:

```ts
describe('recusaDoComprovante (D-111, CA-452 e CA-428)', () => {
  it('CA-452: sem e-mail de faculdade confirmado, a frase pede para confirmar', () => {
    expect(recusaDoComprovante('sem-email-de-faculdade')).toBe('Confirme o e-mail da faculdade antes de enviar o comprovante.')
    expect(MENSAGEM_EMAIL_DA_FACULDADE).toBe('Confirme o e-mail da faculdade antes de enviar o comprovante.')
  })

  it('CA-428 e D-111: 10 arquivos e conta que não é de estudante têm a frase própria', () => {
    expect(recusaDoComprovante('demais')).toBe(MENSAGEM_COMPROVANTES_DEMAIS)
    expect(recusaDoComprovante('nao-estudante')).toBe(MENSAGEM_SO_ESTUDANTE)
    expect(MENSAGEM_SO_ESTUDANTE).toBe('Só conta de estudante envia comprovante de matrícula.')
  })

  it('"ok", resposta desconhecida ou nenhuma resposta não recusam: o armazenamento decide', () => {
    for (const situacao of ['ok', 'outra', '', null, undefined, 1]) expect(recusaDoComprovante(situacao)).toBeNull()
  })

  it('as respostas são exatamente as que o banco devolve (011)', () => {
    const corpo = sql011.split('create or replace function public.conferir_envio_de_comprovante(')[1]?.split('$$;')[0] ?? ''
    expect([...corpo.matchAll(/return '([a-z-]+)';/g)].map((m) => m[1])).toEqual(['nao-estudante', 'sem-email-de-faculdade', 'demais', 'ok'])
  })
})
```

Substitua `src/ui/estado/usarPedidoEstudante.test.ts` inteiro por:

```ts
import { act, renderHook, waitFor } from '@testing-library/react'
import { MENSAGEM_COMPROVANTES_DEMAIS } from '@/domain/pedidoEstudante.ts'
import { usePedidoEstudante } from './usarPedidoEstudante.ts'

const FALHA = 'Não deu para falar com o servidor. Confira a internet e tente de novo.'
const RECUSA_DO_ARMAZENAMENTO = { error: { message: 'new row violates row-level security policy', statusCode: '403' } }

const banco = vi.hoisted(() => ({
  linha: { data: null as unknown, error: null as unknown },
  upload: { error: null as unknown },
  rpc: { error: null as unknown },
  /** As respostas de conferir_envio_de_comprovante, uma por chamada; a última fica valendo. */
  conferencias: [{ data: 'ok' as unknown, error: null as unknown }],
  /** A conferência lança em vez de responder (a rede caiu no meio). */
  conferenciaLanca: false,
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
  rpc: async (funcao: string, args?: unknown) => {
    banco.chamadas.push({ funcao, args })
    if (funcao !== 'conferir_envio_de_comprovante') return banco.rpc
    if (banco.conferenciaLanca) throw new Error('rede caiu')
    return (banco.conferencias.length > 1 ? banco.conferencias.shift() : banco.conferencias[0]) ?? { data: null, error: null }
  },
}

vi.mock('./supabase.ts', () => ({ obterSupabase: () => cliente, supabaseConfigurado: () => true }))

const arquivo = new File(['%PDF'], 'Declaração.pdf', { type: 'application/pdf' })
const dados = { instituicao: ' UFRN ', matricula: '20230045871', periodo: 7, formatura: '2027-07' }

/** Abre o gancho, espera carregar e envia uma vez. Devolve o que a tela recebeu. */
async function enviarUmaVez(): Promise<string | null> {
  const { result } = renderHook(() => usePedidoEstudante('u1'))
  await waitFor(() => expect(result.current.carregado).toBe(true))
  let erro: string | null = 'nada'
  await act(async () => {
    erro = await result.current.enviar(dados, arquivo)
  })
  return erro
}

const funcoesChamadas = () => banco.chamadas.map((c) => c.funcao)

describe('usePedidoEstudante', () => {
  beforeEach(() => {
    banco.linha = { data: null, error: null }
    banco.upload = { error: null }
    banco.rpc = { error: null }
    banco.conferencias = [{ data: 'ok', error: null }]
    banco.conferenciaLanca = false
    banco.enviados = []
    banco.removidos = []
    banco.chamadas = []
  })

  it('lê o pedido mais recente', async () => {
    banco.linha = { data: { id: 'p1', status: 'em_analise', formatura: '2027-07-01', periodo: 7, instituicao: 'UFRN', matricula: '1', enviado_em: '2026-09-30T13:00:00Z' }, error: null }
    const { result } = renderHook(() => usePedidoEstudante('u1'))
    await waitFor(() => expect(result.current.pedido?.status).toBe('em_analise'))
  })

  it('CA-273: confere a conta, envia o arquivo para a pasta da pessoa e cria o pedido com o dia 1 do mês', async () => {
    expect(await enviarUmaVez()).toBeNull()
    expect(banco.enviados[0]).toMatch(/^u1\/\d+-declaracao\.pdf$/)
    expect(funcoesChamadas()).toEqual(['conferir_envio_de_comprovante', 'enviar_pedido_estudante'])
    expect(banco.chamadas).toContainEqual({
      funcao: 'enviar_pedido_estudante',
      args: { p_instituicao: 'UFRN', p_matricula: '20230045871', p_periodo: 7, p_formatura: '2027-07-01', p_arquivo: banco.enviados[0] },
    })
  })

  it('foco 2: banco recusou, o arquivo enviado é apagado e o motivo volta', async () => {
    banco.rpc = { error: { message: 'Confirme o e-mail da faculdade antes de enviar o comprovante.', code: '42501' } }
    expect(await enviarUmaVez()).toBe('Confirme o e-mail da faculdade antes de enviar o comprovante.')
    expect(banco.removidos).toEqual([[banco.enviados[0]]])
  })

  it('upload que falha não cria pedido', async () => {
    banco.upload = { error: { message: 'Failed to fetch' } }
    expect(await enviarUmaVez()).toBe(FALHA)
    expect(funcoesChamadas()).not.toContain('enviar_pedido_estudante')
  })

  it('CA-452: sem e-mail de faculdade confirmado, a tela recebe o motivo e nada é enviado', async () => {
    banco.conferencias = [{ data: 'sem-email-de-faculdade', error: null }]
    expect(await enviarUmaVez()).toBe('Confirme o e-mail da faculdade antes de enviar o comprovante.')
    expect(banco.enviados).toEqual([])
    expect(funcoesChamadas()).toEqual(['conferir_envio_de_comprovante'])
  })

  it('CA-428: com 10 arquivos, a conferência antes do envio já diz o motivo, sem subir o arquivo', async () => {
    banco.conferencias = [{ data: 'demais', error: null }]
    expect(await enviarUmaVez()).toBe(MENSAGEM_COMPROVANTES_DEMAIS)
    expect(banco.enviados).toEqual([])
  })

  it('D-111: conta que não é de estudante recebe a frase do banco, sem enviar', async () => {
    banco.conferencias = [{ data: 'nao-estudante', error: null }]
    expect(await enviarUmaVez()).toBe('Só conta de estudante envia comprovante de matrícula.')
    expect(banco.enviados).toEqual([])
  })

  it('CA-428 e R-42: o armazenamento recusou depois de a conferência deixar (dois envios ao mesmo tempo): ela diz o motivo de novo', async () => {
    banco.conferencias = [
      { data: 'ok', error: null },
      { data: 'demais', error: null },
    ]
    banco.upload = RECUSA_DO_ARMAZENAMENTO
    expect(await enviarUmaVez()).toBe(MENSAGEM_COMPROVANTES_DEMAIS)
    expect(funcoesChamadas()).toEqual(['conferir_envio_de_comprovante', 'conferir_envio_de_comprovante'])
  })

  it('CA-428: recusa do armazenamento sem motivo conhecido, ou sem conseguir conferir de novo, fica com a mensagem de falha', async () => {
    banco.upload = RECUSA_DO_ARMAZENAMENTO
    expect(await enviarUmaVez()).toBe(FALHA)

    banco.conferencias = [
      { data: 'ok', error: null },
      { data: null, error: { message: 'Failed to fetch' } },
    ]
    expect(await enviarUmaVez()).toBe(FALHA)
  })

  it('Foco: sem resposta da conferência (o banco ainda sem o 011, ou a rede), o envio segue e o armazenamento decide', async () => {
    banco.conferencias = [{ data: null, error: { message: 'Could not find the function public.conferir_envio_de_comprovante without parameters' } }]
    expect(await enviarUmaVez()).toBeNull()
    expect(banco.enviados).toHaveLength(1)
    expect(funcoesChamadas()).toContain('enviar_pedido_estudante')

    banco.conferenciaLanca = true
    expect(await enviarUmaVez()).toBeNull()
    expect(banco.enviados).toHaveLength(2)
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

Em `src/ui/publico/conta/TelaComprovarMatricula.test.tsx`:

1. Troque `import type { PedidoEstudante } from '@/domain/pedidoEstudante.ts'` por `import { MENSAGEM_EMAIL_DA_FACULDADE, type PedidoEstudante } from '@/domain/pedidoEstudante.ts'`.
2. Logo antes de `it('CA-281: depois da recusa, abre com os dados anteriores, menos o arquivo', () => {`, acrescente:

```tsx
  it('CA-452: sem e-mail de faculdade confirmado, a tela diz o motivo e não sai da página', async () => {
    const enviar = vi.fn(async () => MENSAGEM_EMAIL_DA_FACULDADE as string | null)
    const { usuario, aoEnviado } = montar(null, enviar)
    await preencher(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Enviar para análise' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Confirme o e-mail da faculdade antes de enviar o comprovante.')
    expect(aoEnviado).not.toHaveBeenCalled()
  })

```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/pedidoEstudante.test.ts src/ui/estado/usarPedidoEstudante.test.ts src/ui/publico/conta/TelaComprovarMatricula.test.tsx`
Expected: FAIL. `recusaDoComprovante` e as frases novas não existem; o gancho não chama `conferir_envio_de_comprovante`.

- [ ] **Step 3: A recusa pelo motivo**

Em `src/domain/pedidoEstudante.ts`, troque:

```ts
/** CA-428: quantos arquivos cada conta pode ter no balde. A política de envio do 010 usa o mesmo número. */
export const LIMITE_DE_COMPROVANTES = 10
export const MENSAGEM_COMPROVANTES_DEMAIS = 'Você já enviou comprovantes demais. Fale com a gente pelo e-mail de contato.'
```

por:

```ts
/** CA-428: quantos arquivos cada conta pode ter no balde. A conferência do 011, que a política de envio usa, tem o mesmo número. */
export const LIMITE_DE_COMPROVANTES = 10
export const MENSAGEM_COMPROVANTES_DEMAIS = 'Você já enviou comprovantes demais. Fale com a gente pelo e-mail de contato.'
/** D-111 (CA-452): a mesma frase que enviar_pedido_estudante (006) usa. */
export const MENSAGEM_EMAIL_DA_FACULDADE = 'Confirme o e-mail da faculdade antes de enviar o comprovante.'
/** A mesma frase que enviar_pedido_estudante (006) usa para quem não é estudante. */
export const MENSAGEM_SO_ESTUDANTE = 'Só conta de estudante envia comprovante de matrícula.'

/**
 * D-111 e CA-428: o motivo da recusa, pela resposta de conferir_envio_de_comprovante (011). "ok",
 * resposta desconhecida ou nenhuma resposta é nulo: o envio segue, e o armazenamento decide.
 */
export function recusaDoComprovante(situacao: unknown): string | null {
  switch (situacao) {
    case 'nao-estudante':
      return MENSAGEM_SO_ESTUDANTE
    case 'sem-email-de-faculdade':
      return MENSAGEM_EMAIL_DA_FACULDADE
    case 'demais':
      return MENSAGEM_COMPROVANTES_DEMAIS
    default:
      return null
  }
}
```

- [ ] **Step 4: Conferir antes de subir o arquivo**

Em `src/ui/estado/usarPedidoEstudante.ts`:

1. Troque a linha 5 por `import { caminhoDoComprovante, daLinhaPedido, recusaDoComprovante, type PedidoEstudante } from '@/domain/pedidoEstudante.ts'`.
2. Troque o começo de `enviar`:

```ts
      const c = obterSupabase()
      if (!c || !usuarioId) return FALHA_DE_REDE
      const caminho = caminhoDoComprovante(usuarioId, arquivo.name, new Date())
      const envio = await c.storage.from('comprovantes').upload(caminho, arquivo, { contentType: arquivo.type, upsert: false })
      if (envio.error) {
        // CA-428: a política de envio recusa quando a conta já tem o limite de arquivos. A mesma
        // contagem que ela usa diz se foi isso; qualquer outra falha fica com a mensagem de rede.
        const { data: arquivos } = await c.rpc('comprovantes_da_conta')
        return typeof arquivos === 'number' && arquivos >= LIMITE_DE_COMPROVANTES ? MENSAGEM_COMPROVANTES_DEMAIS : FALHA_DE_REDE
      }
```

por:

```ts
      const c = obterSupabase()
      if (!c || !usuarioId) return FALHA_DE_REDE
      // D-111 (CA-452) e CA-428: a mesma conferência que a política de envio usa (supabase/011) diz, antes
      // de subir o arquivo, se ele seria recusado e por quê. Sem resposta dela, o envio segue: quem decide
      // é o armazenamento.
      const motivoDaRecusa = async (): Promise<string | null> => {
        try {
          const { data } = await c.rpc('conferir_envio_de_comprovante')
          return recusaDoComprovante(data)
        } catch {
          return null
        }
      }
      const antes = await motivoDaRecusa()
      if (antes) return antes

      const caminho = caminhoDoComprovante(usuarioId, arquivo.name, new Date())
      const envio = await c.storage.from('comprovantes').upload(caminho, arquivo, { contentType: arquivo.type, upsert: false })
      // Dois envios ao mesmo tempo podem passar juntos pela conferência (R-42): na recusa, ela diz o motivo de novo.
      if (envio.error) return (await motivoDaRecusa()) ?? FALHA_DE_REDE
```

O resto de `enviar` (o `enviar_pedido_estudante` e a remoção do arquivo recusado) fica igual.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/domain/pedidoEstudante.test.ts src/ui/estado/usarPedidoEstudante.test.ts src/ui/publico/conta/TelaComprovarMatricula.test.tsx`
Expected: PASS.

Run: `npm run check`
Expected: verde (o typecheck confirma que `LIMITE_DE_COMPROVANTES` e `MENSAGEM_COMPROVANTES_DEMAIS` saíram do import do gancho).

- [ ] **Step 6: Commit**

`../_msg.txt`:

```text
feat(estudante): comprovante confere a conta antes de enviar

A tela pergunta ao banco se o envio seria aceito e diz o motivo:
e-mail de faculdade sem confirmar, conta que não é de estudante ou
comprovantes demais. Sem resposta, o envio segue e o armazenamento
decide.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

```bash
git add src/domain/pedidoEstudante.ts src/domain/pedidoEstudante.test.ts src/ui/estado/usarPedidoEstudante.ts src/ui/estado/usarPedidoEstudante.test.ts src/ui/publico/conta/TelaComprovarMatricula.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 4: Servidor: o pedido às três funções vai até 64 KB

Cobre D-110 (CA-451) e o CB-113 dos 64 KB.

**Files:**
- Create: `supabase/functions/_shared/corpo.ts`
- Create: `src/data/servidorCorpo.test.ts`
- Modify: `supabase/functions/assinar/index.ts`
- Modify: `supabase/functions/gerenciar-assinatura/index.ts`
- Modify: `supabase/functions/webhook-mercadopago/index.ts`
- Modify: `src/data/servidorLigacao.test.ts:5-18` e o `describe('as funções são só ligação (D-88)')`

**Interfaces:**
- Consumes: nada de outras tarefas.
- Produces (`supabase/functions/_shared/corpo.ts`):

```ts
export const CORPO_MAXIMO_BYTES = 65_536
export const PEDIDO_GRANDE_DEMAIS = 'O pedido é grande demais.'
export interface PedidoComCorpo {
  readonly headers: { get(nome: string): string | null }
  readonly body: ReadableStream<Uint8Array> | null
}
export type CorpoLido = { readonly grande: false; readonly json: unknown } | { readonly grande: true }
export function lerCorpo(pedido: PedidoComCorpo, limite?: number): Promise<CorpoLido>
```

- [ ] **Step 1: Escrever os testes que falham**

Crie `src/data/servidorCorpo.test.ts`:

```ts
// @vitest-environment node
// D-110 (spec seguranca-lote-2): o pedido às três funções de cobrança vai até 64 KB. Testado com o
// Request e o ReadableStream de verdade do Node, os mesmos do Deno.
import { CORPO_MAXIMO_BYTES, lerCorpo, PEDIDO_GRANDE_DEMAIS } from '../../supabase/functions/_shared/corpo.ts'

const KB = 1024
const pedido = (corpo: string | null) => new Request('https://exemplo.com/funcao', { method: 'POST', ...(corpo === null ? {} : { body: corpo }) })
/** Um JSON de exatamente `bytes` bytes: {"x":"aaa…"} (8 bytes de moldura). */
const jsonCom = (bytes: number) => JSON.stringify({ x: 'a'.repeat(bytes - 8) })

/** Um corpo que entrega um pedaço de `tamanho` bytes a cada leitura, sem fim, e conta o que foi pedido. */
function corpoSemFim(tamanho: number) {
  const estado = { puxados: 0, cancelado: false }
  const corpo = new ReadableStream<Uint8Array>(
    {
      pull(controle) {
        estado.puxados += 1
        controle.enqueue(new Uint8Array(tamanho).fill(32))
      },
      cancel() {
        estado.cancelado = true
      },
    },
    // Nada é puxado antes da primeira leitura.
    { highWaterMark: 0 },
  )
  return { corpo, estado }
}

describe('o tamanho do pedido às funções de cobrança (D-110)', () => {
  it('lê o JSON do pedido pequeno, como antes', async () => {
    expect(await lerCorpo(pedido('{"acao":"previa"}'))).toEqual({ grande: false, json: { acao: 'previa' } })
  })

  it('CB-113: 64 KB exatos passam; um byte a mais é recusado', async () => {
    expect(CORPO_MAXIMO_BYTES).toBe(64 * KB)
    expect(new TextEncoder().encode(jsonCom(64 * KB)).byteLength).toBe(64 * KB)
    expect(await lerCorpo(pedido(jsonCom(64 * KB)))).toEqual({ grande: false, json: { x: 'a'.repeat(64 * KB - 8) } })
    expect(await lerCorpo(pedido(jsonCom(64 * KB + 1)))).toEqual({ grande: true })
  })

  it('CA-451: o limite é em bytes, não em letras', async () => {
    const acentuado = JSON.stringify({ x: 'é'.repeat(33_000) })
    expect(acentuado.length).toBeLessThan(64 * KB)
    expect(await lerCorpo(pedido(acentuado))).toEqual({ grande: true })
  })

  it('CA-451: o tamanho declarado acima de 64 KB recusa sem ler o corpo', async () => {
    const { corpo, estado } = corpoSemFim(KB)
    expect(await lerCorpo({ headers: new Headers({ 'content-length': String(64 * KB + 1) }), body: corpo })).toEqual({ grande: true })
    expect(estado.puxados).toBe(0)
    expect(corpo.locked).toBe(false)
  })

  it('CA-451: sem o tamanho declarado, a leitura para logo depois de passar de 64 KB', async () => {
    const { corpo, estado } = corpoSemFim(16 * KB)
    expect(await lerCorpo({ headers: new Headers(), body: corpo })).toEqual({ grande: true })
    // Quatro pedaços de 16 KB cabem; o quinto passa e a leitura para.
    expect(estado.puxados).toBeGreaterThanOrEqual(5)
    expect(estado.puxados).toBeLessThanOrEqual(6)
    expect(estado.cancelado).toBe(true)
  })

  it('Foco: o tamanho declarado menor que o corpo de verdade não deixa passar', async () => {
    const { corpo, estado } = corpoSemFim(16 * KB)
    expect(await lerCorpo({ headers: new Headers({ 'content-length': '10' }), body: corpo })).toEqual({ grande: true })
    expect(estado.puxados).toBeLessThanOrEqual(6)
  })

  it('corpo vazio, ausente, que não é JSON ou que falha no meio vira nulo, como o req.json() de antes', async () => {
    expect(await lerCorpo(pedido(''))).toEqual({ grande: false, json: null })
    expect(await lerCorpo(pedido(null))).toEqual({ grande: false, json: null })
    expect(await lerCorpo(pedido('nada de json'))).toEqual({ grande: false, json: null })
    const quebrado = new ReadableStream<Uint8Array>({
      pull(controle) {
        controle.error(new Error('rede caiu'))
      },
    })
    expect(await lerCorpo({ headers: new Headers(), body: quebrado })).toEqual({ grande: false, json: null })
  })

  it('a frase do 413 é curta e em português', () => {
    expect(PEDIDO_GRANDE_DEMAIS).toBe('O pedido é grande demais.')
  })
})
```

Em `src/data/servidorLigacao.test.ts`:

1. Logo depois de `import cobranca from '../../supabase/functions/_shared/cobranca.ts?raw'`, acrescente `import corpoDoPedido from '../../supabase/functions/_shared/corpo.ts?raw'`.
2. Troque a linha do `NUCLEOS` por:

```ts
const NUCLEOS = { assinar: nucleoAssinar, gerenciarAssinatura: nucleoGerenciar, webhook: nucleoWebhook, operadora, portas, cobranca, tentativas, corpo: corpoDoPedido }
```

3. Dentro de `describe('as funções são só ligação (D-88)', …)`, logo depois do teste `'R6: nenhuma função lê o IP de quem pede'`, acrescente:

```ts
  it.each(Object.entries(INDICES))('CA-451: %s lê o corpo com o teto de 64 KB antes de qualquer outra coisa, sem o req.json()', (_, codigo) => {
    const ler = codigo.indexOf('const lido = await lerCorpo(req)')
    expect(ler).toBeGreaterThan(-1)
    expect(codigo).toContain("from '../_shared/corpo.ts'")
    expect(codigo).not.toContain('req.json(')
    expect(ler).toBeLessThan(codigo.indexOf("Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')"))
    expect(ler).toBeLessThan(codigo.indexOf('createClient(urlSupabase, servico)'))
    expect(codigo).toContain('corpo: lido.json,')
  })

  it('CA-451: acima de 64 KB, assinar e gerenciar respondem 413 com os cabeçalhos do site; o aviso responde 413 sem anotar nada', () => {
    for (const codigo of [assinarIndex, gerenciarIndex]) expect(codigo).toContain('if (lido.grande) return responder({ erro: PEDIDO_GRANDE_DEMAIS }, 413)')
    const grande = webhookIndex.indexOf("if (lido.grande) return new Response('grande demais', { status: 413 })")
    expect(grande).toBeGreaterThan(-1)
    expect(grande).toBeLessThan(webhookIndex.indexOf('await tratarAviso('))
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/data/servidorCorpo.test.ts src/data/servidorLigacao.test.ts`
Expected: FAIL. `corpo.ts` não existe e os `index.ts` ainda usam `req.json()`.

- [ ] **Step 3: O leitor do corpo**

Crie `supabase/functions/_shared/corpo.ts`:

```ts
// O tamanho do pedido às funções de cobrança (spec seguranca-lote-2, D-110; CA-451). Puro: usa só o
// Request e o ReadableStream padrão, que existem no Deno e no Node; sem Deno, sem rede e sem relógio
// (src/data/servidorCorpo.test.ts).

/** D-110: o pedido vai até 64 KB. */
export const CORPO_MAXIMO_BYTES = 65_536
/** A frase do 413 de assinar e gerenciar-assinatura. */
export const PEDIDO_GRANDE_DEMAIS = 'O pedido é grande demais.'

/** O que o pedido precisa ter para ser lido aqui; o Request do Deno serve. */
export interface PedidoComCorpo {
  readonly headers: { get(nome: string): string | null }
  readonly body: ReadableStream<Uint8Array> | null
}

/** O corpo lido: o JSON (nulo quando não é JSON, como o `req.json()` de antes) ou "grande demais". */
export type CorpoLido = { readonly grande: false; readonly json: unknown } | { readonly grande: true }

const GRANDE: CorpoLido = { grande: true }
const SEM_JSON: CorpoLido = { grande: false, json: null }

/**
 * CA-451: lê o corpo até `limite` bytes. O tamanho declarado acima do limite recusa sem ler nada; sem
 * ele, ou com um declarado menor que o de verdade, a leitura para no primeiro pedaço que passa do
 * limite. Corpo vazio, que não é JSON ou que falha no meio vira nulo.
 */
export async function lerCorpo(pedido: PedidoComCorpo, limite = CORPO_MAXIMO_BYTES): Promise<CorpoLido> {
  const declarado = Number(pedido.headers.get('content-length') ?? Number.NaN)
  if (declarado > limite) return GRANDE
  if (!pedido.body) return SEM_JSON
  const leitor = pedido.body.getReader()
  const decodificador = new TextDecoder()
  let texto = ''
  let lidos = 0
  try {
    for (;;) {
      const { done, value } = await leitor.read()
      if (done) break
      lidos += value.byteLength
      if (lidos > limite) {
        await leitor.cancel().catch(() => undefined)
        return GRANDE
      }
      texto += decodificador.decode(value, { stream: true })
    }
    texto += decodificador.decode()
  } catch {
    return SEM_JSON
  }
  try {
    const json: unknown = JSON.parse(texto)
    return { grande: false, json }
  } catch {
    return SEM_JSON
  }
}
```

- [ ] **Step 4: As três funções respondem 413 antes de processar**

Substitua `supabase/functions/assinar/index.ts` inteiro por:

```ts
// Assina com o cartão, dentro do site (spec checkout-proprio; spec cobranca-em-producao). A decisão
// mora em ../_shared/assinar.ts, que o Vitest executa; aqui só se liga o ambiente.
//
// Roda no servidor porque precisa do access token da operadora, que dá poder de cobrar em nome do dono.
// Deno / Supabase Edge Functions. Não faz parte do build do app.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.2'
import { assinar } from '../_shared/assinar.ts'
import { criarBanco, quemPede } from '../_shared/bancoSupabase.ts'
import { CABECALHOS, responder, SEM_COBRANCA } from '../_shared/cobranca.ts'
import { lerCorpo, PEDIDO_GRANDE_DEMAIS } from '../_shared/corpo.ts'
import { criarOperadora } from '../_shared/operadora.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })
  if (req.method !== 'POST') return responder({ erro: 'Use POST.' }, 405)
  // D-110 (CA-451): acima de 64 KB, recusa sem ler o resto e sem processar nada.
  const lido = await lerCorpo(req)
  if (lido.grande) return responder({ erro: PEDIDO_GRANDE_DEMAIS }, 413)

  try {
    const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    const urlSupabase = Deno.env.get('SUPABASE_URL')
    const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const site = (Deno.env.get('SITE_URL') ?? 'https://metanutri.com.br/').replace(/[?#].*$/, '')
    if (!token || !urlSupabase || !servico) return responder({ erro: 'A função não está configurada no servidor.' }, 500)

    const cliente = createClient(urlSupabase, servico)
    const resposta = await assinar(
      {
        conta: await quemPede(cliente, req.headers.get('Authorization')),
        corpo: lido.json,
        site,
      },
      {
        // O POST espera o banco conferir o cartão, bem antes de a reserva vencer (5 minutos) e do limite da função.
        operadora: criarOperadora(token, { prazoMs: 10_000, prazoDoPostMs: 30_000 }),
        banco: criarBanco(cliente, console.error),
        agora: () => new Date(),
        log: console.error,
      },
    )
    return responder(resposta.corpo, resposta.status)
  } catch (erro) {
    // Falha inesperada: o registro leva só a mensagem, e o navegador recebe a resposta com os cabeçalhos do site.
    console.error('Falha inesperada ao assinar:', erro instanceof Error ? erro.message : 'erro desconhecido')
    return responder({ erro: SEM_COBRANCA }, 500)
  }
})
```

Substitua `supabase/functions/gerenciar-assinatura/index.ts` inteiro por:

```ts
// Responde a prévia do cancelamento (D-81), cancela e troca o cartão, sem sair do site (spec
// checkout-proprio; spec cobranca-em-producao). A decisão mora em ../_shared/gerenciarAssinatura.ts,
// que o Vitest executa; aqui só se liga o ambiente.
//
// Deno / Supabase Edge Functions. Não faz parte do build do app.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.2'
import { criarBanco, quemPede } from '../_shared/bancoSupabase.ts'
import { CABECALHOS, responder } from '../_shared/cobranca.ts'
import { lerCorpo, PEDIDO_GRANDE_DEMAIS } from '../_shared/corpo.ts'
import { FORA, gerenciarAssinatura } from '../_shared/gerenciarAssinatura.ts'
import { criarOperadora } from '../_shared/operadora.ts'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CABECALHOS })
  if (req.method !== 'POST') return responder({ erro: 'Use POST.' }, 405)
  // D-110 (CA-451): acima de 64 KB, recusa sem ler o resto e sem processar nada.
  const lido = await lerCorpo(req)
  if (lido.grande) return responder({ erro: PEDIDO_GRANDE_DEMAIS }, 413)

  try {
    const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    const urlSupabase = Deno.env.get('SUPABASE_URL')
    const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!token || !urlSupabase || !servico) return responder({ erro: 'A função não está configurada no servidor.' }, 500)

    const cliente = createClient(urlSupabase, servico)
    const resposta = await gerenciarAssinatura(
      {
        conta: await quemPede(cliente, req.headers.get('Authorization')),
        corpo: lido.json,
      },
      {
        operadora: criarOperadora(token, { prazoMs: 10_000, prazoDoPostMs: 10_000 }),
        banco: criarBanco(cliente, console.error),
        agora: () => new Date(),
        log: console.error,
      },
    )
    return responder(resposta.corpo, resposta.status)
  } catch (erro) {
    // Falha inesperada: o registro leva só a mensagem, e o navegador recebe a resposta com os cabeçalhos do site.
    console.error('Falha inesperada ao mudar a assinatura:', erro instanceof Error ? erro.message : 'erro desconhecido')
    return responder({ erro: FORA }, 500)
  }
})
```

Substitua `supabase/functions/webhook-mercadopago/index.ts` inteiro por:

```ts
// Recebe os avisos da operadora de pagamento (spec cobranca-em-producao, D-83 e D-84). A decisão mora
// em ../_shared/webhook.ts, que o Vitest executa; aqui só se liga o ambiente. Publicada com
// --no-verify-jwt: quem chama é a operadora, que não tem conta no Supabase.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.2'
import { criarBanco } from '../_shared/bancoSupabase.ts'
import { lerCorpo } from '../_shared/corpo.ts'
import { criarOperadora } from '../_shared/operadora.ts'
import { tratarAviso } from '../_shared/webhook.ts'

/**
 * A operadora espera a resposta por 22 s. Um aviso faz até cinco pedidos a ela (a mensalidade recusada
 * sem linha: ler a mensalidade, ler a assinatura, cancelar com as duas palavras e conferir). Com 3,5 s
 * cada, são 17,5 s no pior caso, e sobra tempo para o banco e para a função acordar.
 */
const PRAZO_DO_AVISO_MS = 3_500

Deno.serve(async (req: Request) => {
  // D-110 (CA-451): acima de 64 KB, recusa sem ler o resto e sem processar nada, nem o registro de avisos.
  const lido = await lerCorpo(req)
  if (lido.grande) return new Response('grande demais', { status: 413 })
  const token = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
  const urlSupabase = Deno.env.get('SUPABASE_URL')
  const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!token || !urlSupabase || !servico) {
    // Sem configuração não dá para ler nem anotar. O 500 faz a operadora mandar de novo depois.
    console.error('Função sem configuração; o aviso volta depois.')
    return new Response('sem configuração', { status: 500 })
  }
  const url = new URL(req.url)
  const status = await tratarAviso(
    {
      corpo: lido.json,
      idNaUrl: url.searchParams.get('data.id'),
      tipoNaUrl: url.searchParams.get('type'),
      xSignature: req.headers.get('x-signature'),
      xRequestId: req.headers.get('x-request-id'),
    },
    {
      operadora: criarOperadora(token, { prazoMs: PRAZO_DO_AVISO_MS, prazoDoPostMs: PRAZO_DO_AVISO_MS }),
      banco: criarBanco(createClient(urlSupabase, servico), console.error),
      // Como está no ambiente: o núcleo apara e, sem segredo, responde 500 sem processar nada (R1).
      segredo: Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET') ?? null,
      agora: () => new Date(),
      log: console.error,
    },
  )
  return new Response(status === 200 ? 'ok' : 'tente de novo', { status })
})
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/data/servidorCorpo.test.ts src/data/servidorLigacao.test.ts`
Expected: PASS (os testes antigos da ligação continuam: o `try` segue entre a conferência do método e o primeiro `Deno.env.get`).

Run: `npm run check`
Expected: verde.

Run: `npx --yes deno@2 check --no-lock supabase/functions/assinar/index.ts supabase/functions/gerenciar-assinatura/index.ts supabase/functions/webhook-mercadopago/index.ts`
Expected: uma linha `Check file:///…/index.ts` por função e saída 0, sem erro de tipo.

- [ ] **Step 6: Commit**

`../_msg.txt`:

```text
feat(servidor): pedido às funções de cobrança até 64 KB

As três funções leem o corpo com teto de 64 KB e respondem 413 antes
de processar qualquer coisa: pelo tamanho declarado, sem ler, ou
parando a leitura logo depois do limite.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

```bash
git add supabase/functions/_shared/corpo.ts supabase/functions/assinar/index.ts supabase/functions/gerenciar-assinatura/index.ts supabase/functions/webhook-mercadopago/index.ts src/data/servidorCorpo.test.ts src/data/servidorLigacao.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 5: Servidor: o limite de chamadas à cobrança

Cobre D-108 no servidor (CA-448, CA-449, CB-113 dos 10 e dos 20, CB-114, CB-115).

**Files:**
- Modify: `supabase/functions/_shared/portas.ts` (tipo novo e duas operações em `BancoDaCobranca`)
- Create: `supabase/functions/_shared/chamadas.ts`
- Modify: `supabase/functions/_shared/assinar.ts` (import, dependências e o portão antes do `POST`)
- Modify: `supabase/functions/_shared/gerenciarAssinatura.ts` (cabeçalho, import, dependências e três portões)
- Modify: `supabase/functions/_shared/bancoSupabase.ts` (comentário do `log` e duas operações)
- Modify: `src/data/servidorFalsos.test-utils.ts`
- Create: `src/data/servidorChamadas.test.ts`
- Modify: `src/data/servidorAssinar.test.ts:131-146`
- Modify: `src/data/servidorGerenciar.test.ts` (uma constante e oito ordens)
- Modify: `src/data/servidorLigacao.test.ts`

**Interfaces:**
- Consumes: `public.anotar_chamada_da_cobranca(uuid, text, integer, timestamptz)` e `public.chamadas_da_cobranca` (Tarefa 1); `SEM_COBRANCA`, `UM_DIA_MS` (`cobranca.ts`); `FORA` (`gerenciarAssinatura.ts`).
- Produces (`portas.ts`):

```ts
export type TipoDeChamada = 'cartao' | 'conferir'
// em BancoDaCobranca:
anotarChamada(conta: string, tipo: TipoDeChamada, limite: number, desde: Date): Promise<boolean> // rejeita sem resposta
apagarChamadasAntesDe(data: Date): Promise<void> // não rejeita
```

- Produces (`chamadas.ts`):

```ts
export const MUITAS_CHAMADAS = 'Muitas tentativas seguidas. Espere uma hora e tente de novo.'
export const LIMITE_DE_CHAMADAS: Readonly<Record<TipoDeChamada, number>> // { cartao: 10, conferir: 20 }
export const JANELA_DAS_CHAMADAS_MS = 3_600_000
export const CHAMADAS_FICAM_MS = 2 * UM_DIA_MS
export type BancoDasChamadas = Pick<BancoDaCobranca, 'anotarChamada' | 'apagarChamadasAntesDe'>
export function conferirChamadas(banco: BancoDasChamadas, conta: string, tipo: TipoDeChamada, agora: Date, log: Registro, semContagem: string): Promise<RespostaDaFuncao | null>
```

- Produces (`servidorFalsos.test-utils.ts`): `ChamadaGuardada`, `cenario(...).chamadas` e `cenario(...).semearChamadas(conta, tipo, n, quando)`.
- A resposta do limite: `{ status: 429, corpo: { erro: MUITAS_CHAMADAS, codigo: 'muitas-chamadas' } }`.

- [ ] **Step 1: Escrever os testes que falham**

Crie `src/data/servidorChamadas.test.ts`:

```ts
// @vitest-environment node
// D-108 (spec seguranca-lote-2): o limite de chamadas à operadora por conta, pela assinar e pela
// gerenciar-assinatura, com o banco de mentira (src/data/servidorFalsos.test-utils.ts).
import { assinar, type PedidoDeAssinatura } from '../../supabase/functions/_shared/assinar.ts'
import { CHAMADAS_FICAM_MS, JANELA_DAS_CHAMADAS_MS, LIMITE_DE_CHAMADAS, MUITAS_CHAMADAS } from '../../supabase/functions/_shared/chamadas.ts'
import { SEM_COBRANCA, UM_DIA_MS } from '../../supabase/functions/_shared/cobranca.ts'
import { FORA, gerenciarAssinatura, type PedidoDeGerenciar } from '../../supabase/functions/_shared/gerenciarAssinatura.ts'
import type { RespostaDaOperadora } from '../../supabase/functions/_shared/portas.ts'
import { AGORA, cenario, linhaDe, responde } from './servidorFalsos.test-utils.ts'

const CONTA = { id: 'u1', email: 'ana@exemplo.com' }
const TOKEN = 'tok_teste_12345'
const ASSINAR: PedidoDeAssinatura = {
  conta: CONTA,
  corpo: { plano: 'solo', ciclo: 'mensal', card_token_id: TOKEN, cartao: { bandeira: 'Mastercard', final: '6351' } },
  site: 'https://metanutri.com.br/',
}
const pedir = (corpo: unknown): PedidoDeGerenciar => ({ conta: CONTA, corpo })
const PREVIA = pedir({ acao: 'previa' })
const CANCELAR = pedir({ acao: 'cancelar' })
const TROCAR = pedir({ acao: 'trocar_cartao', card_token_id: 'tok_novo_12345', cartao: { bandeira: 'Visa', final: '5682' } })

const ATIVA = { nutricionista_id: 'u1', plano: 'solo', status: 'ativa', ciclo: 'mensal', preapproval_id: 'pre-1', cartao_final: '6351', proxima_cobranca: '2026-11-06T15:00:00.000Z' }
const POST = 'POST /preapproval'
const GET = 'GET /preapproval/pre-1'
const PUT = 'PUT /preapproval/pre-1'
const BUSCA = 'GET /preapproval/search?payer_email=ana%40exemplo.com&limit=50'
const CRIADA = { id: 'pre-1', status: 'authorized', next_payment_date: '2026-11-06T15:00:00.000Z' }
const COBRADA = { status: 'authorized', summarized: { charged_quantity: 1 }, next_payment_date: '2026-11-06T15:00:00.000Z' }
/** A operadora respondendo bem a cada pedido. */
const ROTAS = { [POST]: [responde(201, CRIADA)], [GET]: [responde(200, COBRADA)], [PUT]: [responde(200)] }

const MUITAS = { status: 429, corpo: { erro: 'Muitas tentativas seguidas. Espere uma hora e tente de novo.', codigo: 'muitas-chamadas' } }
const SEM_CONTAGEM_ASSINAR = { status: 502, corpo: { erro: SEM_COBRANCA } }
const SEM_CONTAGEM_GERENCIAR = { status: 502, corpo: { erro: FORA } }

const HORA_MS = 3_600_000
const antes = (horas: number) => new Date(AGORA.getTime() - horas * HORA_MS)

type Rotas = Readonly<Record<string, readonly (RespostaDaOperadora | null)[]>>
type Linha = Parameters<typeof linhaDe>[0]

describe('D-108: os números da spec', () => {
  it('10 pedidos com cartão e 20 de conferir por hora; as chamadas anotadas ficam 2 dias', () => {
    expect(LIMITE_DE_CHAMADAS).toEqual({ cartao: 10, conferir: 20 })
    expect(JANELA_DAS_CHAMADAS_MS).toBe(HORA_MS)
    expect(CHAMADAS_FICAM_MS).toBe(2 * UM_DIA_MS)
    expect(MUITAS_CHAMADAS).toBe(MUITAS.corpo.erro)
  })
})

describe('D-108: o limite de pedidos com cartão (CA-448)', () => {
  it('CA-448: assinar com 10 pedidos com cartão na última hora responde 429 sem chamar a operadora; a reserva é solta', async () => {
    const c = cenario([], ROTAS)
    c.semearChamadas('u1', 'cartao', 10, antes(0.5))
    expect(await assinar(ASSINAR, c.deps)).toEqual(MUITAS)
    expect(c.pedidos).toEqual([])
    expect(c.reservas.size).toBe(0)
    expect(c.chamadas).toHaveLength(10)
    expect(c.ordem).toEqual(['contarRecusas', 'soltarReservaVencida', 'reservar', 'lerDaConta', 'anotarChamada', 'soltarReserva'])
    expect(c.log).toHaveBeenCalledWith('Chamadas demais à operadora na última hora; ela não foi chamada. Tipo:', 'cartao')
  })

  it('CA-448: trocar o cartão com 10 na última hora responde 429 sem chamar a operadora; a reserva é solta', async () => {
    const c = cenario([ATIVA], ROTAS)
    c.semearChamadas('u1', 'cartao', 10, antes(0.5))
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(MUITAS)
    expect(c.pedidos).toEqual([])
    expect(c.reservas.size).toBe(0)
    expect(c.ordem).toEqual(['lerDaConta', 'soltarReservaVencida', 'reservar', 'contarRecusas', 'anotarChamada', 'soltarReserva'])
    expect(c.assinaturas.get('u1')?.cartao_final).toBe('6351')
  })

  it('CA-448: assinar e trocar o cartão somam no mesmo limite', async () => {
    const c = cenario([], ROTAS)
    c.semearChamadas('u1', 'cartao', 9, antes(0.5))
    expect((await assinar(ASSINAR, c.deps)).status).toBe(200)
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(MUITAS)
    expect(c.pedidos.filter((p) => p.metodo === 'PUT')).toEqual([])
  })

  it('CB-113: o 10º pedido com cartão ainda passa, em assinar e em trocar o cartão', async () => {
    const assinando = cenario([], ROTAS)
    assinando.semearChamadas('u1', 'cartao', 9, antes(0.5))
    expect((await assinar(ASSINAR, assinando.deps)).status).toBe(200)
    expect(assinando.chamadas).toHaveLength(10)
    const trocando = cenario([ATIVA], ROTAS)
    trocando.semearChamadas('u1', 'cartao', 9, antes(0.5))
    expect((await gerenciarAssinatura(TROCAR, trocando.deps)).status).toBe(200)
    expect(trocando.chamadas).toHaveLength(10)
  })

  it('CB-113: a janela é estrita: os pedidos de exatamente 1 h atrás já não contam', async () => {
    const c = cenario([], ROTAS)
    c.semearChamadas('u1', 'cartao', 10, antes(1))
    expect((await assinar(ASSINAR, c.deps)).status).toBe(200)
  })

  it.each<[string, Rotas, number]>([
    ['assinou', { [POST]: [responde(201, CRIADA)] }, 200],
    ['o banco recusou o cartão', { [POST]: [responde(400, { message: 'cc_rejected_other_reason' })] }, 402],
    ['sem resposta e a busca não achou', { [POST]: [null], [BUSCA]: [responde(200, { results: [] })] }, 502],
    ['erro do lado dela e a busca não achou', { [POST]: [responde(503)], [BUSCA]: [responde(200, { results: [] })] }, 502],
  ])('CA-448: qualquer resultado conta (%s): a chamada fica anotada', async (_caso, rotas, status) => {
    const c = cenario([], rotas)
    expect((await assinar(ASSINAR, c.deps)).status).toBe(status)
    expect(c.chamadas.map((ch) => [ch.conta, ch.tipo])).toEqual([['u1', 'cartao']])
  })

  it('D-108: só conta o pedido que chegaria à operadora: quem já assina, o limite de recusas, outra aba, cartão incompleto e troca sem assinatura ativa não anotam', async () => {
    const jaAssina = cenario([ATIVA], ROTAS)
    expect((await assinar(ASSINAR, jaAssina.deps)).status).toBe(409)
    const comRecusas = cenario([], ROTAS)
    comRecusas.semearTentativas('u1', Array.from({ length: 5 }, () => ({ quando: antes(1), recusada: true })))
    expect((await assinar(ASSINAR, comRecusas.deps)).corpo['codigo']).toBe('muitas-tentativas')
    const outraAba = cenario([], ROTAS)
    outraAba.comReserva('u1')
    expect((await assinar(ASSINAR, outraAba.deps)).status).toBe(409)
    const incompleto = cenario([], ROTAS)
    expect((await assinar({ ...ASSINAR, corpo: { plano: 'solo', ciclo: 'mensal' } }, incompleto.deps)).status).toBe(400)
    const naoAtiva = cenario([{ ...ATIVA, status: 'pendente' }], ROTAS)
    expect((await gerenciarAssinatura(TROCAR, naoAtiva.deps)).status).toBe(409)
    for (const c of [jaAssina, comRecusas, outraAba, incompleto, naoAtiva]) {
      expect(c.chamadas).toEqual([])
      expect(c.ordem).not.toContain('anotarChamada')
    }
  })

  it('D-108: o limite é de cada conta: 10 pedidos de outra conta não fecham este', async () => {
    const c = cenario([], ROTAS)
    c.semearChamadas('outra', 'cartao', 10, antes(0.5))
    expect((await assinar(ASSINAR, c.deps)).status).toBe(200)
  })

  it('CB-114: sem conseguir contar, assinar responde 502 (nada foi cobrado) sem chamar a operadora; a reserva é solta', async () => {
    const c = cenario([], ROTAS)
    c.falhar('anotarChamada')
    expect(await assinar(ASSINAR, c.deps)).toEqual(SEM_CONTAGEM_ASSINAR)
    expect(c.pedidos).toEqual([])
    expect(c.reservas.size).toBe(0)
    expect(c.log).toHaveBeenCalledWith('Não consegui contar as chamadas à operadora:', 'banco fora')
  })

  it('CB-114: sem conseguir contar, trocar o cartão responde 502 (nada mudou) sem chamar a operadora; a reserva é solta', async () => {
    const c = cenario([ATIVA], ROTAS)
    c.falhar('anotarChamada')
    expect(await gerenciarAssinatura(TROCAR, c.deps)).toEqual(SEM_CONTAGEM_GERENCIAR)
    expect(c.pedidos).toEqual([])
    expect(c.reservas.size).toBe(0)
  })

  it('depois de anotar, apaga as chamadas de mais de 2 dias', async () => {
    const c = cenario([], ROTAS)
    c.semearChamadas('u1', 'cartao', 1, antes(49))
    c.semearChamadas('u1', 'conferir', 1, antes(47))
    const apagar = vi.spyOn(c.banco, 'apagarChamadasAntesDe')
    await assinar(ASSINAR, c.deps)
    expect(apagar).toHaveBeenCalledWith(new Date(AGORA.getTime() - 2 * UM_DIA_MS))
    expect(c.chamadas.map((ch) => [ch.tipo, ch.quando.toISOString()])).toEqual([
      ['conferir', antes(47).toISOString()],
      ['cartao', AGORA.toISOString()],
    ])
  })

  it('apagar as antigas que falha só vai para o registro; o pedido segue', async () => {
    const c = cenario([], ROTAS)
    const deps = { ...c.deps, banco: { ...c.banco, apagarChamadasAntesDe: () => Promise.reject(new Error('chamadas fora')) } }
    expect((await assinar(ASSINAR, deps)).status).toBe(200)
    expect(c.log).toHaveBeenCalledWith('Não consegui apagar as chamadas antigas à operadora:', 'chamadas fora')
  })

  it('nenhum registro leva o código do cartão nem o e-mail', async () => {
    const cheio = cenario([], ROTAS)
    cheio.semearChamadas('u1', 'cartao', 10, antes(0.5))
    const semContagem = cenario([], ROTAS)
    semContagem.falhar('anotarChamada')
    for (const c of [cheio, semContagem]) await assinar(ASSINAR, c.deps)
    const registros = JSON.stringify([...cheio.log.mock.calls, ...semContagem.log.mock.calls])
    expect(registros).not.toContain(TOKEN)
    expect(registros).not.toContain('ana@exemplo.com')
  })
})

describe('D-108: o limite de conferir e cancelar (CA-449)', () => {
  it.each<[string, PedidoDeGerenciar]>([
    ['prévia', PREVIA],
    ['cancelar', CANCELAR],
  ])('CA-449: %s com 20 pedidos na última hora responde 429 sem chamar a operadora; nada muda', async (_caso, pedido) => {
    const c = cenario([ATIVA], ROTAS)
    c.semearChamadas('u1', 'conferir', 20, antes(0.5))
    expect(await gerenciarAssinatura(pedido, c.deps)).toEqual(MUITAS)
    expect(c.pedidos).toEqual([])
    expect(c.ordem).toEqual(['lerDaConta', 'anotarChamada'])
    expect(c.assinaturas.get('u1')).toEqual(linhaDe(ATIVA))
    expect(c.log).toHaveBeenCalledWith('Chamadas demais à operadora na última hora; ela não foi chamada. Tipo:', 'conferir')
  })

  it.each<[string, PedidoDeGerenciar]>([
    ['prévia', PREVIA],
    ['cancelar', CANCELAR],
  ])('CB-113: o 20º pedido de %s ainda passa', async (_caso, pedido) => {
    const c = cenario([ATIVA], ROTAS)
    c.semearChamadas('u1', 'conferir', 19, antes(0.5))
    expect((await gerenciarAssinatura(pedido, c.deps)).status).toBe(200)
    expect(c.chamadas).toHaveLength(20)
  })

  it('CA-449: prévia e cancelar somam no mesmo limite', async () => {
    const c = cenario([ATIVA], ROTAS)
    c.semearChamadas('u1', 'conferir', 19, antes(0.5))
    expect((await gerenciarAssinatura(PREVIA, c.deps)).status).toBe(200)
    expect(await gerenciarAssinatura(CANCELAR, c.deps)).toEqual(MUITAS)
    expect(c.pedidos.map((p) => p.metodo)).toEqual(['GET'])
    expect(c.assinaturas.get('u1')?.status).toBe('ativa')
  })

  it.each<[string, PedidoDeGerenciar]>([
    ['prévia', PREVIA],
    ['cancelar', CANCELAR],
  ])('CB-114: sem conseguir contar, %s responde 502 sem chamar a operadora', async (_caso, pedido) => {
    const c = cenario([ATIVA], ROTAS)
    c.falhar('anotarChamada')
    expect(await gerenciarAssinatura(pedido, c.deps)).toEqual(SEM_CONTAGEM_GERENCIAR)
    expect(c.pedidos).toEqual([])
    expect(c.log).toHaveBeenCalledWith('Não consegui contar as chamadas à operadora:', 'banco fora')
  })

  it('CB-115: cinco prévias ao mesmo tempo, com 18 na última hora: só duas chegam à operadora', async () => {
    const c = cenario([ATIVA], ROTAS)
    c.semearChamadas('u1', 'conferir', 18, antes(0.5))
    const respostas = await Promise.all(Array.from({ length: 5 }, () => gerenciarAssinatura(PREVIA, c.deps)))
    expect(respostas.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 200, 429, 429, 429])
    expect(c.pedidos.filter((p) => p.metodo === 'GET')).toHaveLength(2)
    expect(c.chamadas.filter((ch) => ch.tipo === 'conferir')).toHaveLength(20)
  })

  it.each<[string, PedidoDeGerenciar, Linha]>([
    ['a prévia de uma já cancelada aqui (R11)', PREVIA, { ...ATIVA, status: 'cancelada', expira_em: '2026-11-06T02:59:59.000Z' }],
    ['cancelar uma já cancelada aqui (CB-93)', CANCELAR, { ...ATIVA, status: 'cancelada', expira_em: '2026-11-06T02:59:59.000Z' }],
    ['a prévia de uma pendente', PREVIA, { ...ATIVA, status: 'pendente' }],
    ['a conta sem assinatura paga (409)', PREVIA, { ...ATIVA, preapproval_id: null }],
  ])('D-108: %s não chega à operadora e não conta, nem com o limite cheio', async (_caso, pedido, linha) => {
    const c = cenario([linha], ROTAS)
    c.semearChamadas('u1', 'conferir', 20, antes(0.5))
    expect((await gerenciarAssinatura(pedido, c.deps)).status).not.toBe(429)
    expect(c.chamadas).toHaveLength(20)
    expect(c.pedidos).toEqual([])
  })

  it('D-108: cartão e conferir são limites separados', async () => {
    const conferir = cenario([ATIVA], ROTAS)
    conferir.semearChamadas('u1', 'cartao', 10, antes(0.5))
    expect((await gerenciarAssinatura(PREVIA, conferir.deps)).status).toBe(200)
    const cartao = cenario([ATIVA], ROTAS)
    cartao.semearChamadas('u1', 'conferir', 20, antes(0.5))
    expect((await gerenciarAssinatura(TROCAR, cartao.deps)).status).toBe(200)
  })
})
```

Em `src/data/servidorLigacao.test.ts`:

1. Logo depois de `import tentativas from '../../supabase/functions/_shared/tentativas.ts?raw'`, acrescente `import chamadas from '../../supabase/functions/_shared/chamadas.ts?raw'`.
2. Troque a linha do `NUCLEOS` por:

```ts
const NUCLEOS = { assinar: nucleoAssinar, gerenciarAssinatura: nucleoGerenciar, webhook: nucleoWebhook, operadora, portas, cobranca, tentativas, corpo: corpoDoPedido, chamadas }
```

3. Dentro de `describe('o banco de verdade (bancoSupabase.ts)', …)`, logo depois do `describe('as tentativas de cartão (D-101, R6 e R7)', …)` inteiro, acrescente:

```ts
  describe('as chamadas à cobrança (D-108)', () => {
    it('CB-115: contar e anotar são um passo só, na função do banco (011)', () => {
      expect(bancoSupabase).toContain("cliente.rpc('anotar_chamada_da_cobranca', { p_conta: conta, p_tipo: tipo, p_limite: limite, p_desde: desde.toISOString() })")
    })
    it('CB-114: sem a resposta sim ou não do banco, rejeita (a função responde 502 e não chama a operadora)', () => {
      const anotar = bancoSupabase.split('async anotarChamada(')[1]?.split('async apagarChamadasAntesDe(')[0] ?? ''
      expect(anotar).toContain('if (error) throw new Error(')
      expect(anotar).toContain("if (typeof data !== 'boolean') throw new Error(")
      expect(anotar).not.toContain('catch')
    })
    it('as chamadas antigas saem pela data, e a falha só vai para o registro', () => {
      expect(bancoSupabase).toContain(".from('chamadas_da_cobranca').delete().lt('quando', data.toISOString())")
      const apagar = bancoSupabase.split('async apagarChamadasAntesDe(')[1]?.split('// As janelas são estritas')[0] ?? ''
      expect(apagar).toContain('catch')
      expect(apagar).not.toContain('throw')
    })
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/data/servidorChamadas.test.ts src/data/servidorLigacao.test.ts`
Expected: FAIL. `chamadas.ts` não existe, o cenário não tem `semearChamadas` e o banco de verdade não tem as operações novas.

- [ ] **Step 3: As portas**

Em `supabase/functions/_shared/portas.ts`:

1. Logo depois de `export type EncerradaPor = 'pessoa' | 'recusa' | 'operadora'`, acrescente:

```ts

/** D-108: os dois limites de chamadas à operadora por conta. 'cartao': assinar e trocar o cartão; 'conferir': a prévia e o cancelamento. */
export type TipoDeChamada = 'cartao' | 'conferir'
```

2. Troque o comentário de `BancoDaCobranca`:

```ts
/**
 * As consultas das três funções. Nenhuma lança, exceto `contarRecusas`: sem a contagem, o portão
 * responde 502 e não deixa passar. Nas outras, a falha volta no resultado, como no supabase-js, ou só
 * vai para o registro (anotar e apagar tentativas).
 */
```

por:

```ts
/**
 * As consultas das três funções. Nenhuma lança, exceto as contagens (`contarRecusas` e `anotarChamada`):
 * sem elas, o portão responde 502 e não deixa passar. Nas outras, a falha volta no resultado, como no
 * supabase-js, ou só vai para o registro (anotar e apagar tentativas, apagar chamadas).
 */
```

3. Dentro de `BancoDaCobranca`, logo depois de `apagarTentativasAntesDe(data: Date): Promise<void>`, acrescente:

```ts
  /**
   * D-108 e CB-115: anota uma chamada deste tipo para a conta, só se ela ainda couber (menos de `limite`
   * anotadas depois de `desde`). Verdadeiro: anotou, e a operadora pode ser chamada; falso: cheio, e nada
   * foi anotado. Contar e anotar são um passo só no banco. Sem resposta, rejeita (CB-114).
   */
  anotarChamada(conta: string, tipo: TipoDeChamada, limite: number, desde: Date): Promise<boolean>
  /** Apaga as chamadas anotadas antes de `data` (retenção de 2 dias). Não rejeita: a falha só vai para o registro. */
  apagarChamadasAntesDe(data: Date): Promise<void>
```

- [ ] **Step 4: O módulo do limite**

Crie `supabase/functions/_shared/chamadas.ts`:

```ts
// O limite de chamadas à operadora por conta (spec seguranca-lote-2, D-108; CA-448, CA-449, CB-113 a
// CB-115). Usado pela assinar e pelas três ações da gerenciar-assinatura, logo antes de cada chamada à
// operadora. Puro: o banco, o relógio e o registro chegam de fora; sem Deno e sem rede.
import { UM_DIA_MS } from './cobranca.ts'
import { respostaDeErro as erro, type BancoDaCobranca, type Registro, type RespostaDaFuncao, type TipoDeChamada } from './portas.ts'

/** D-108 (CA-448 e CA-449): a resposta do limite atingido. */
export const MUITAS_CHAMADAS = 'Muitas tentativas seguidas. Espere uma hora e tente de novo.'
/** D-108: quantas chamadas de cada tipo a conta faz por hora. */
export const LIMITE_DE_CHAMADAS: Readonly<Record<TipoDeChamada, number>> = { cartao: 10, conferir: 20 }
/** A janela do limite: a última hora, estrita (a chamada de exatamente 1 h atrás já não conta). */
export const JANELA_DAS_CHAMADAS_MS = 60 * 60 * 1000
/** As chamadas anotadas ficam 2 dias. */
export const CHAMADAS_FICAM_MS = 2 * UM_DIA_MS

/** O que o limite usa do banco. */
export type BancoDasChamadas = Pick<BancoDaCobranca, 'anotarChamada' | 'apagarChamadasAntesDe'>

const mensagemDe = (falha: unknown): string => (falha instanceof Error ? falha.message : String(falha))

/**
 * D-108: anota a chamada que a função vai fazer à operadora, se ela ainda couber no limite da conta.
 * Nulo: anotou, e a função segue para a operadora. Senão, o que responder: 429 com o limite cheio
 * (CA-448, CA-449) ou 502 com `semContagem` quando o banco não respondeu (CB-114). Contar e anotar são
 * um passo só no banco (CB-115). Quem chama faz isso logo antes da chamada: só conta o pedido que de
 * fato chega à operadora, com qualquer resultado.
 */
export async function conferirChamadas(
  banco: BancoDasChamadas,
  conta: string,
  tipo: TipoDeChamada,
  agora: Date,
  log: Registro,
  semContagem: string,
): Promise<RespostaDaFuncao | null> {
  let coube: boolean
  try {
    coube = await banco.anotarChamada(conta, tipo, LIMITE_DE_CHAMADAS[tipo], new Date(agora.getTime() - JANELA_DAS_CHAMADAS_MS))
  } catch (falha) {
    log('Não consegui contar as chamadas à operadora:', mensagemDe(falha))
    return erro(semContagem, 502)
  }
  if (!coube) {
    log('Chamadas demais à operadora na última hora; ela não foi chamada. Tipo:', tipo)
    return erro(MUITAS_CHAMADAS, 429, 'muitas-chamadas')
  }
  try {
    await banco.apagarChamadasAntesDe(new Date(agora.getTime() - CHAMADAS_FICAM_MS))
  } catch (falha) {
    log('Não consegui apagar as chamadas antigas à operadora:', mensagemDe(falha))
  }
  return null
}
```

- [ ] **Step 5: O banco de mentira**

Em `src/data/servidorFalsos.test-utils.ts`:

1. No import de tipos de `portas.ts`, acrescente `TipoDeChamada` (fica `…, RespostaDaOperadora, TipoDeChamada,`).
2. Logo depois da interface `TentativaGuardada`, acrescente:

```ts

/** Uma chamada à operadora anotada (a tabela chamadas_da_cobranca). */
export interface ChamadaGuardada {
  readonly conta: string
  readonly tipo: TipoDeChamada
  readonly quando: Date
}
```

3. Logo depois de `const tentativas: TentativaGuardada[] = []`, acrescente `const chamadas: ChamadaGuardada[] = []`.
4. Dentro de `const banco: BancoDaCobranca = { … }`, logo depois de `apagarTentativasAntesDe`, acrescente:

```ts
    async anotarChamada(conta, tipo, limite, desde) {
      const falha = consultar('anotarChamada')
      if (falha) throw new Error(falha.mensagem)
      // A mesma janela estrita do banco: só conta o que é mais novo que `desde`. Contar e anotar sem pausa no meio.
      const naJanela = chamadas.filter((ch) => ch.conta === conta && ch.tipo === tipo && ch.quando.getTime() > desde.getTime()).length
      if (naJanela >= limite) return false
      chamadas.push({ conta, tipo, quando: AGORA })
      return true
    },
    async apagarChamadasAntesDe(data) {
      if (consultar('apagarChamadasAntesDe')) return
      const ficam = chamadas.filter((ch) => ch.quando.getTime() >= data.getTime())
      chamadas.splice(0, chamadas.length, ...ficam)
    },
```

5. No objeto devolvido por `cenario`, logo depois de `tentativas,`, acrescente `chamadas,`.
6. Troque o comentário de `falhar`:

```ts
    /** A consulta falha `vezes` vezes (padrão: sempre). Em `contarRecusas` a falha vira uma rejeição. */
```

por:

```ts
    /** A consulta falha `vezes` vezes (padrão: sempre). Em `contarRecusas` e `anotarChamada` a falha vira uma rejeição. */
```
7. No fim do objeto devolvido, logo depois de `semearTentativas`, acrescente:

```ts
    /** `n` chamadas à operadora do passado, como se a conta já tivesse pedido antes. */
    semearChamadas: (conta: string, tipo: TipoDeChamada, n: number, quando: Date) => {
      for (let i = 0; i < n; i++) chamadas.push({ conta, tipo, quando })
    },
```

- [ ] **Step 6: O portão na `assinar`**

Em `supabase/functions/_shared/assinar.ts`:

1. Troque o fim do cabeçalho, `// cobranca-em-producao, D-85, D-86 e D-101). Puro: a operadora, o banco, o relógio e o registro chegam`, por `// cobranca-em-producao, D-85, D-86 e D-101; spec seguranca-lote-2, D-108). Puro: a operadora, o banco, o relógio e o registro chegam`.
2. Logo antes de `import { cancelarNaOperadora } from './operadora.ts'`, acrescente `import { conferirChamadas, type BancoDasChamadas } from './chamadas.ts'`.
3. Em `DependenciasDeAssinar`, troque `readonly banco: Pick<BancoDaCobranca, 'lerDaConta' | 'gravar' | 'soltarReservaVencida' | 'reservar' | 'soltarReserva'> & BancoDasTentativas` por `readonly banco: Pick<BancoDaCobranca, 'lerDaConta' | 'gravar' | 'soltarReservaVencida' | 'reservar' | 'soltarReserva'> & BancoDasTentativas & BancoDasChamadas`.
4. Troque:

```ts
    if (atual && (atual.status === 'pendente' || atual.status === 'pausada') && atual.preapproval_id && atual.cartao_final !== null) return erro(ANDAMENTO_NA_CONTA, 409)

    const frequencia = FREQUENCIA[ciclo]
```

por:

```ts
    if (atual && (atual.status === 'pendente' || atual.status === 'pausada') && atual.preapproval_id && atual.cartao_final !== null) return erro(ANDAMENTO_NA_CONTA, 409)

    // D-108 (CA-448): até 10 pedidos com cartão por hora na conta, somando a troca de cartão. Contado aqui,
    // logo antes da operadora e com a conta já reservada: o que parou antes (400, 409, D-101) não conta.
    const barrado = await conferirChamadas(deps.banco, uid, 'cartao', inicio, deps.log, SEM_COBRANCA)
    if (barrado) return barrado

    const frequencia = FREQUENCIA[ciclo]
```

- [ ] **Step 7: Os portões na `gerenciar-assinatura`**

Em `supabase/functions/_shared/gerenciarAssinatura.ts`:

1. Troque as linhas 7 e 8 do cabeçalho:

```ts
// D-101 e CB-109: só a troca de cartão reserva a conta e passa pelo portão das tentativas; a prévia e
// o cancelamento, não.
```

por:

```ts
// D-101 e CB-109: só a troca de cartão reserva a conta e passa pelo portão das tentativas; a prévia e
// o cancelamento, não. D-108: as três ações passam pelo limite de chamadas logo antes de chamar a
// operadora: a troca como pedido com cartão; a prévia e o cancelamento como conferir.
```

2. Logo depois de `import { EM_ANDAMENTO, RESERVA_VENCE_MS } from './assinar.ts'`, acrescente `import { conferirChamadas, type BancoDasChamadas } from './chamadas.ts'`.
3. Em `DependenciasDeGerenciar`, troque `readonly banco: Pick<BancoDaCobranca, 'lerDaConta' | 'mudar' | 'soltarReservaVencida' | 'reservar' | 'soltarReserva'> & BancoDasTentativas` por `readonly banco: Pick<BancoDaCobranca, 'lerDaConta' | 'mudar' | 'soltarReservaVencida' | 'reservar' | 'soltarReserva'> & BancoDasTentativas & BancoDasChamadas`.
4. Na prévia, troque:

```ts
    if (linha.status !== 'ativa') return { status: 200, corpo: { cobrada: false, expiraEm: null } }
    const lida = await deps.operadora('GET', caminho)
```

por:

```ts
    if (linha.status !== 'ativa') return { status: 200, corpo: { cobrada: false, expiraEm: null } }
    // D-108 (CA-449): até 20 conferências e cancelamentos por hora na conta, contados só quando a operadora seria chamada.
    const barrado = await conferirChamadas(deps.banco, dono, 'conferir', agora, deps.log, FORA)
    if (barrado) return barrado
    const lida = await deps.operadora('GET', caminho)
```

5. No cancelamento, troque:

```ts
    if (linha.status === 'cancelada') return { status: 200, corpo: { status: 'cancelada', expiraEm: linha.expira_em } }
    const lida = await deps.operadora('GET', caminho)
```

por:

```ts
    if (linha.status === 'cancelada') return { status: 200, corpo: { status: 'cancelada', expiraEm: linha.expira_em } }
    // D-108 (CA-449): soma com a prévia no mesmo limite.
    const barrado = await conferirChamadas(deps.banco, dono, 'conferir', agora, deps.log, FORA)
    if (barrado) return barrado
    const lida = await deps.operadora('GET', caminho)
```

6. Em `trocarCartao`, troque:

```ts
  const portao = await conferirTentativas(deps.banco, dono, agora, deps.log, FORA)
  if (!portao.passa) return portao.resposta

```

por:

```ts
  const portao = await conferirTentativas(deps.banco, dono, agora, deps.log, FORA)
  if (!portao.passa) return portao.resposta
  // D-108 (CA-448): a troca soma com a assinar no limite de pedidos com cartão; a conta já está reservada.
  const barrado = await conferirChamadas(deps.banco, dono, 'cartao', agora, deps.log, FORA)
  if (barrado) return barrado

```

- [ ] **Step 8: O banco de verdade**

Em `supabase/functions/_shared/bancoSupabase.ts`:

1. Troque o comentário de `criarBanco`:

```ts
/** `log` é o registro da função: só as tentativas, que não podem rejeitar, escrevem nele. */
```

por:

```ts
/** `log` é o registro da função: só o que não pode rejeitar (anotar e apagar tentativas, apagar chamadas) escreve nele. */
```

2. Logo depois do método `apagarAvisosAntesDe` (antes do comentário `// As janelas são estritas (…)` de `contarRecusas`), acrescente:

```ts
    // D-108 e CB-115: contar e anotar são um passo só, na função do banco (011), com a conta e o tipo
    // travados: dois pedidos ao mesmo tempo não passam juntos do limite. Sem resposta sim ou não, rejeita.
    async anotarChamada(conta, tipo, limite, desde) {
      const { data, error } = await cliente.rpc('anotar_chamada_da_cobranca', { p_conta: conta, p_tipo: tipo, p_limite: limite, p_desde: desde.toISOString() })
      if (error) throw new Error(error.message || 'A contagem das chamadas falhou.')
      if (typeof data !== 'boolean') throw new Error('A contagem das chamadas veio sem resposta.')
      return data
    },
    async apagarChamadasAntesDe(data) {
      try {
        const { error } = await cliente.from('chamadas_da_cobranca').delete().lt('quando', data.toISOString())
        if (error) log('Não consegui apagar as chamadas antigas à operadora:', error.message)
      } catch (erro) {
        log('Não consegui apagar as chamadas antigas à operadora:', mensagemDe(erro))
      }
    },
```

- [ ] **Step 9: As ordens das consultas nos testes antigos**

Em `src/data/servidorAssinar.test.ts`, troque o teste das linhas 131 a 146:

```ts
  it('C1: a reserva vencida sai antes de reservar; a ordem é soltar a vencida, reservar, ler, pedir, gravar e soltar', async () => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)] })
    c.comReserva('u1', '2026-10-06T14:54:00.000Z')
    expect(await assinar(PEDIDO, c.deps)).toEqual(ASSINOU)
    expect(c.ordem).toEqual([
      'contarRecusas',
      'soltarReservaVencida',
      'reservar',
      'lerDaConta',
      'POST /preapproval',
```

por:

```ts
  it('C1: a reserva vencida sai antes de reservar; a ordem é soltar a vencida, reservar, ler, anotar a chamada (D-108), pedir, gravar e soltar', async () => {
    const c = cenario([], { [POST]: [responde(201, CRIADA)] })
    c.comReserva('u1', '2026-10-06T14:54:00.000Z')
    expect(await assinar(PEDIDO, c.deps)).toEqual(ASSINOU)
    expect(c.ordem).toEqual([
      'contarRecusas',
      'soltarReservaVencida',
      'reservar',
      'lerDaConta',
      'anotarChamada',
      'apagarChamadasAntesDe',
      'POST /preapproval',
```

Em `src/data/servidorGerenciar.test.ts`:

1. Logo depois de `const PUT = 'PUT /preapproval/pre-1'`, acrescente:

```ts
/** D-108: a chamada anotada (e as antigas apagadas) logo antes de cada pedido à operadora. */
const CHAMADA = ['anotarChamada', 'apagarChamadasAntesDe'] as const
```

2. Troque as quatro ocorrências de `expect(c.ordem).toEqual(['lerDaConta', GET])` (CA-396, a leitura 2xx com corpo que não se lê, CA-397 e "sem leitura da operadora não há cancelamento") por `expect(c.ordem).toEqual(['lerDaConta', ...CHAMADA, GET])`.
3. Troque `expect(c.ordem).toEqual(['lerDaConta', GET, PUT, 'mudar'])` por `expect(c.ordem).toEqual(['lerDaConta', ...CHAMADA, GET, PUT, 'mudar'])`.
4. Troque `expect(c.ordem).toEqual(['lerDaConta', GET, PUT, GET, 'mudar'])` por `expect(c.ordem).toEqual(['lerDaConta', ...CHAMADA, GET, PUT, GET, 'mudar'])`.
5. No teste `'R4: o sucesso é anotado depois de gravar o cartão; a recusa, sem gravar nada'`, troque:

```ts
    expect(trocou.ordem).toEqual(['lerDaConta', 'soltarReservaVencida', 'reservar', 'contarRecusas', PUT, 'mudar', 'anotarTentativa', 'apagarTentativasAntesDe', 'soltarReserva'])
```

por:

```ts
    expect(trocou.ordem).toEqual(['lerDaConta', 'soltarReservaVencida', 'reservar', 'contarRecusas', ...CHAMADA, PUT, 'mudar', 'anotarTentativa', 'apagarTentativasAntesDe', 'soltarReserva'])
```

e:

```ts
    expect(recusou.ordem).toEqual(['lerDaConta', 'soltarReservaVencida', 'reservar', 'contarRecusas', PUT, 'anotarTentativa', 'apagarTentativasAntesDe', 'soltarReserva'])
```

por:

```ts
    expect(recusou.ordem).toEqual(['lerDaConta', 'soltarReservaVencida', 'reservar', 'contarRecusas', ...CHAMADA, PUT, 'anotarTentativa', 'apagarTentativasAntesDe', 'soltarReserva'])
```

As outras ordens desses arquivos não mudam: elas param antes da chamada à operadora.

- [ ] **Step 10: Rodar e ver passar**

Run: `npx vitest run src/data/servidorChamadas.test.ts src/data/servidorAssinar.test.ts src/data/servidorGerenciar.test.ts src/data/servidorWebhook.test.ts src/data/servidorLigacao.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: verde.

Run: `npx --yes deno@2 check --no-lock supabase/functions/assinar/index.ts supabase/functions/gerenciar-assinatura/index.ts supabase/functions/webhook-mercadopago/index.ts`
Expected: saída 0, sem erro de tipo (o `criarBanco` implementa as duas operações novas).

- [ ] **Step 11: Commit**

`../_msg.txt`:

```text
feat(cobranca): limite de chamadas à operadora por conta

Até 10 pedidos com cartão (assinar e trocar) e 20 de conferir ou
cancelar por hora, contados e anotados num passo só no banco, logo
antes de chamar a operadora. Acima disso, 429; sem conseguir contar,
502 sem chamar a operadora.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

```bash
git add supabase/functions/_shared/portas.ts supabase/functions/_shared/chamadas.ts supabase/functions/_shared/assinar.ts supabase/functions/_shared/gerenciarAssinatura.ts supabase/functions/_shared/bancoSupabase.ts src/data/servidorFalsos.test-utils.ts src/data/servidorChamadas.test.ts src/data/servidorAssinar.test.ts src/data/servidorGerenciar.test.ts src/data/servidorLigacao.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 6: Servidor: o registro guarda até 100 avisos não conferidos por hora

Cobre D-109 (CA-450 e o CB-113 do 100º aviso). Muda o comportamento do registro descrito no CA-399, no CA-436 e no CA-437 da `cobranca-em-producao`; a resposta de cada aviso não muda.

**Files:**
- Modify: `supabase/functions/_shared/portas.ts` (uma operação em `BancoDaCobranca`)
- Modify: `supabase/functions/_shared/webhook.ts` (cabeçalho, dependências, constante, fim de `tratarAviso` e uma função nova)
- Modify: `supabase/functions/_shared/bancoSupabase.ts` (`numeroDa` e uma operação)
- Modify: `src/data/servidorFalsos.test-utils.ts`
- Modify: `src/data/servidorWebhook.test.ts` (import, duas ordens e um `describe` no fim)
- Modify: `src/data/servidorLigacao.test.ts`

**Interfaces:**
- Consumes: `BancoDaCobranca` com `anotarChamada` (Tarefa 5: o texto do banco de verdade é cortado por esse nome); o índice `avisos_da_operadora_por_data` (009).
- Produces:

```ts
// portas.ts, em BancoDaCobranca:
contarAvisosNaoConferidos(desde: Date): Promise<number> // rejeita sem contagem
// webhook.ts:
export const AVISOS_NAO_CONFERIDOS_POR_HORA = 100
// servidorFalsos.test-utils.ts, no cenário:
semearAvisos: (n: number, quando: Date, conferido?: boolean) => void
```

- [ ] **Step 1: Escrever os testes que falham**

Em `src/data/servidorWebhook.test.ts`:

1. No import de `../../supabase/functions/_shared/webhook.ts`, acrescente `AVISOS_NAO_CONFERIDOS_POR_HORA` (fica `assinaturaConfere, AVISOS_NAO_CONFERIDOS_POR_HORA, GUARDA_DOS_AVISOS_MS, …`).
2. No teste `'CA-436 e R1: sem o segredo configurado, …'` e no teste `'CA-399: assinatura que não confere não muda nada e fica anotada como "assinatura não confere"'`, troque `expect(c.ordem).toEqual(['anotarAviso', 'apagarAvisosAntesDe'])` por `expect(c.ordem).toEqual(['contarAvisosNaoConferidos', 'anotarAviso', 'apagarAvisosAntesDe'])`. (O terceiro, no teste `'CA-398: todo aviso fica anotado …'`, é de um aviso conferido e não muda.)
3. No fim do arquivo, acrescente:

```ts
describe('o registro guarda até 100 avisos não conferidos por hora (D-109)', () => {
  const RUIM = { xSignature: 'ts=1,v1=00' }
  const haMinutos = (minutos: number) => new Date(AGORA.getTime() - minutos * 60_000)

  it('CA-450: com 100 não conferidos na última hora, o próximo recebe a mesma resposta e não é anotado', async () => {
    const c = cenario()
    c.semearAvisos(100, haMinutos(30))
    expect(await tratarAviso(aviso('payment', 'pay1', RUIM), deps(c))).toBe(200)
    expect(c.avisos).toEqual([])
    expect(c.apagadosAntesDe).toEqual([])
    expect(c.ordem).toEqual(['contarAvisosNaoConferidos'])
    expect(c.pedidos).toEqual([])
    expect(AVISOS_NAO_CONFERIDOS_POR_HORA).toBe(100)
    expect(c.log).toHaveBeenCalledWith('Avisos não conferidos demais na última hora; este não foi anotado.')
  })

  it('CA-450: vale também para o aviso sem id e para o recurso inválido (200, sem anotar)', async () => {
    for (const recebido of [aviso(ASSINATURA, null), aviso(ASSINATURA, 'pre-1')]) {
      const c = cenario()
      c.semearAvisos(100, haMinutos(30))
      expect(await tratarAviso(recebido, deps(c))).toBe(200)
      expect(c.avisos).toEqual([])
      expect(c.pedidos).toEqual([])
    }
  })

  it('Foco: sem o segredo e com o registro da hora cheio, a resposta continua 500, para o aviso voltar, e nada é anotado', async () => {
    const c = cenario([{ ...LINHA, status: 'pendente' }], { [PRE]: [responde(200, AUTORIZADA)] })
    c.semearAvisos(100, haMinutos(30))
    expect(await tratarAviso(aviso(ASSINATURA, 'pre1'), deps(c, null))).toBe(500)
    expect(c.avisos).toEqual([])
    expect(c.pedidos).toEqual([])
    expect(c.assinaturas.get('u1')?.status).toBe('pendente')
  })

  it('CB-113: com 99 na última hora, o centésimo ainda é anotado', async () => {
    const c = cenario()
    c.semearAvisos(99, haMinutos(30))
    expect(await tratarAviso(aviso('payment', 'pay1', RUIM), deps(c))).toBe(200)
    expect(c.avisos).toEqual([{ topico: 'payment', recurso_id: 'pay1', assinatura_confere: false, resultado: 'assinatura não confere' }])
    expect(c.ordem).toEqual(['contarAvisosNaoConferidos', 'anotarAviso', 'apagarAvisosAntesDe'])
  })

  it('CB-113: a janela é estrita: os de exatamente 1 h atrás já não contam', async () => {
    const c = cenario()
    c.semearAvisos(100, haMinutos(60))
    expect(await tratarAviso(aviso('payment', 'pay1', RUIM), deps(c))).toBe(200)
    expect(c.avisos).toHaveLength(1)
  })

  it('CA-450: o aviso conferido é anotado mesmo depois dos 100, sem contar', async () => {
    const c = cenario()
    c.semearAvisos(100, haMinutos(30))
    expect(await tratarAviso(aviso('payment', '999'), deps(c))).toBe(200)
    expect(c.avisos).toEqual([{ topico: 'payment', recurso_id: '999', assinatura_confere: true, resultado: 'ignorado: pagamento' }])
    expect(c.ordem).toEqual(['anotarAviso', 'apagarAvisosAntesDe'])
  })

  it('CA-450: os conferidos não entram na conta dos 100', async () => {
    const c = cenario()
    c.semearAvisos(150, haMinutos(30), true)
    c.semearAvisos(99, haMinutos(30))
    expect(await tratarAviso(aviso('payment', 'pay1', RUIM), deps(c))).toBe(200)
    expect(c.avisos).toHaveLength(1)
  })

  it('CA-450: sem conseguir contar, não anota; a resposta é a mesma e o registro da função diz por quê', async () => {
    const c = cenario()
    c.falhar('contarAvisosNaoConferidos')
    expect(await tratarAviso(aviso('payment', 'pay1', RUIM), deps(c))).toBe(200)
    expect(c.avisos).toEqual([])
    expect(c.log).toHaveBeenCalledWith('Não consegui contar os avisos não conferidos; este não foi anotado:', 'banco fora')
  })

  it('CA-450: a contagem olha a última hora pelo relógio da função', async () => {
    const c = cenario()
    const contar = vi.spyOn(c.banco, 'contarAvisosNaoConferidos')
    await tratarAviso(aviso('payment', 'pay1', RUIM), deps(c))
    expect(contar).toHaveBeenCalledWith(new Date(AGORA.getTime() - 60 * 60_000))
  })
})
```

Em `src/data/servidorLigacao.test.ts`, dentro de `describe('o banco de verdade (bancoSupabase.ts)', …)`, logo depois do `describe('as chamadas à cobrança (D-108)', …)` da Tarefa 5, acrescente:

```ts
  describe('os avisos não conferidos (D-109)', () => {
    it('CA-450: conta os avisos com a assinatura nula ou falsa, pela data de chegada, numa janela estrita', () => {
      expect(bancoSupabase).toContain(
        ".from('avisos_da_operadora').select('id', { count: 'exact', head: true }).not('assinatura_confere', 'is', true).gt('recebido_em', desde.toISOString())",
      )
    })
    it('sem conseguir contar, rejeita (o aviso não conferido não é anotado)', () => {
      const contar = bancoSupabase.split('async contarAvisosNaoConferidos(')[1]?.split('async anotarChamada(')[0] ?? ''
      expect(contar).toContain('return numeroDa(contagem)')
      expect(contar).not.toContain('catch')
    })
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/data/servidorWebhook.test.ts src/data/servidorLigacao.test.ts`
Expected: FAIL. O cenário não tem `semearAvisos`, a porta nova não existe e o aviso não conferido ainda é sempre anotado.

- [ ] **Step 3: A porta**

Em `supabase/functions/_shared/portas.ts`, dentro de `BancoDaCobranca`, logo depois de `apagarAvisosAntesDe(data: string): Promise<FalhaDoBanco | null>`, acrescente:

```ts
  /** D-109: quantos avisos sem a assinatura conferida (nula ou falsa) foram anotados depois de `desde`. Sem conseguir contar, rejeita. */
  contarAvisosNaoConferidos(desde: Date): Promise<number>
```

E no comentário de `BancoDaCobranca` (já mexido na Tarefa 5), troque:

```ts
 * As consultas das três funções. Nenhuma lança, exceto as contagens (`contarRecusas` e `anotarChamada`):
```

por:

```ts
 * As consultas das três funções. Nenhuma lança, exceto as contagens (`contarRecusas`, `anotarChamada` e `contarAvisosNaoConferidos`):
```

- [ ] **Step 4: O banco de mentira**

Em `src/data/servidorFalsos.test-utils.ts`:

1. Logo depois de `const avisos: AvisoAnotado[] = []`, acrescente:

```ts
  /** A hora de cada aviso no registro (o banco grava recebido_em = now()) e se a assinatura dele conferiu. */
  const horasDosAvisos: { readonly quando: Date; readonly conferido: boolean }[] = []
```

2. Troque o método `anotarAviso`:

```ts
    async anotarAviso(aviso) {
      const falha = consultar('anotarAviso')
      if (!falha) avisos.push(aviso)
      return falha
    },
```

por:

```ts
    async anotarAviso(aviso) {
      const falha = consultar('anotarAviso')
      if (!falha) {
        avisos.push(aviso)
        horasDosAvisos.push({ quando: AGORA, conferido: aviso.assinatura_confere === true })
      }
      return falha
    },
```

3. Logo depois do método `apagarAvisosAntesDe`, acrescente:

```ts
    async contarAvisosNaoConferidos(desde) {
      const falha = consultar('contarAvisosNaoConferidos')
      if (falha) throw new Error(falha.mensagem)
      return horasDosAvisos.filter((a) => !a.conferido && a.quando.getTime() > desde.getTime()).length
    },
```

4. Troque o comentário de `falhar` (o da Tarefa 5) por:

```ts
    /** A consulta falha `vezes` vezes (padrão: sempre). Nas contagens (`contarRecusas`, `anotarChamada` e `contarAvisosNaoConferidos`) a falha vira uma rejeição. */
```
5. No fim do objeto devolvido, logo depois de `semearChamadas`, acrescente:

```ts
    /** `n` avisos já no registro, chegados em `quando`; `conferido` diz se a assinatura deles conferiu. Não entram em `avisos`. */
    semearAvisos: (n: number, quando: Date, conferido = false) => {
      for (let i = 0; i < n; i++) horasDosAvisos.push({ quando, conferido })
    },
```

- [ ] **Step 5: O núcleo do aviso**

Em `supabase/functions/_shared/webhook.ts`:

1. Troque a primeira linha do cabeçalho, `// Recebe os avisos da operadora de pagamento (spec checkout-proprio; spec cobranca-em-producao, D-80,`, e a segunda, `// D-83 a D-85 e D-102). Puro: a operadora, o banco, o segredo, o relógio e o registro chegam de fora`, por:

```ts
// Recebe os avisos da operadora de pagamento (spec checkout-proprio; spec cobranca-em-producao, D-80,
// D-83 a D-85 e D-102; spec seguranca-lote-2, D-109). Puro: a operadora, o banco, o segredo, o relógio e o registro chegam de fora
```

2. Troque a regra 2 do cabeçalho, `//   2. Cada aviso fica anotado, sem dado pessoal, com o que foi feito (D-84).`, por:

```ts
//   2. Cada aviso fica anotado, sem dado pessoal, com o que foi feito (D-84). Os que não foram conferidos
//      (sem segredo, sem id, recurso inválido ou assinatura que não confere), até 100 por hora (D-109).
```

3. Em `DependenciasDoWebhook`, troque `readonly banco: Pick<BancoDaCobranca, 'lerDaConta' | 'lerDaOperadora' | 'gravar' | 'mudar' | 'lerReserva' | 'anotarAviso' | 'apagarAvisosAntesDe'>` por `readonly banco: Pick<BancoDaCobranca, 'lerDaConta' | 'lerDaOperadora' | 'gravar' | 'mudar' | 'lerReserva' | 'anotarAviso' | 'apagarAvisosAntesDe' | 'contarAvisosNaoConferidos'>`.
4. Logo depois de `export const GUARDA_DOS_AVISOS_MS = 90 * UM_DIA_MS`, acrescente:

```ts
/** D-109 (CA-450): o registro guarda no máximo este tanto de avisos não conferidos por hora. */
export const AVISOS_NAO_CONFERIDOS_POR_HORA = 100
const UMA_HORA_MS = 60 * 60 * 1000
```

5. No fim de `tratarAviso`, troque:

```ts
  await anotar(deps, {
    // D-84: o registro não guarda texto livre de quem chama. Sem a assinatura conferida, o tópico só vai
    // se for um dos conhecidos; o código do recurso só vai no formato aceito (CA-437).
    topico: confere ? cortar(topico, 80) : TOPICOS_CONHECIDOS.includes(topico) ? topico : 'desconhecido',
    recurso_id: id !== null && RECURSO_VALIDO.test(id) ? id : null,
    assinatura_confere: confere,
    resultado: cortar(resultado.resultado, 200),
  })
  return resultado.status
}
```

por:

```ts
  const anotado: AvisoAnotado = {
    // D-84: o registro não guarda texto livre de quem chama. Sem a assinatura conferida, o tópico só vai
    // se for um dos conhecidos; o código do recurso só vai no formato aceito (CA-437).
    topico: confere ? cortar(topico, 80) : TOPICOS_CONHECIDOS.includes(topico) ? topico : 'desconhecido',
    recurso_id: id !== null && RECURSO_VALIDO.test(id) ? id : null,
    assinatura_confere: confere,
    resultado: cortar(resultado.resultado, 200),
  }
  // D-109 (CA-450): o conferido sempre vai para o registro; o não conferido, só enquanto couber na hora.
  // A resposta não muda.
  if (confere === true || (await cabeNaoConferido(deps))) await anotar(deps, anotado)
  return resultado.status
}

/** D-109 (CA-450): ainda cabe um aviso não conferido no registro desta hora? Sem conseguir contar, não anota. */
async function cabeNaoConferido(deps: DependenciasDoWebhook): Promise<boolean> {
  try {
    const anotados = await deps.banco.contarAvisosNaoConferidos(new Date(deps.agora().getTime() - UMA_HORA_MS))
    if (anotados < AVISOS_NAO_CONFERIDOS_POR_HORA) return true
    deps.log('Avisos não conferidos demais na última hora; este não foi anotado.')
    return false
  } catch (erro) {
    deps.log('Não consegui contar os avisos não conferidos; este não foi anotado:', mensagemDe(erro))
    return false
  }
}
```

- [ ] **Step 6: O banco de verdade**

Em `supabase/functions/_shared/bancoSupabase.ts`:

1. Troque o comentário e a mensagem de `numeroDa`:

```ts
/** O número da contagem; sem ele (erro do banco ou da rede), rejeita: o portão responde 502 e não deixa passar (R5). */
function numeroDa(contagem: ResultadoDaConsulta & { readonly count: number | null }): number {
  if (contagem.error) throw new Error(erroDa(contagem))
  if (typeof contagem.count !== 'number') throw new Error('A contagem das tentativas veio sem número.')
  return contagem.count
}
```

por:

```ts
/** O número da contagem; sem ele (erro do banco ou da rede), rejeita. Quem chama decide: o portão responde 502 (R5); o aviso não é anotado (D-109). */
function numeroDa(contagem: ResultadoDaConsulta & { readonly count: number | null }): number {
  if (contagem.error) throw new Error(erroDa(contagem))
  if (typeof contagem.count !== 'number') throw new Error('A contagem veio sem número.')
  return contagem.count
}
```

2. Logo depois do método `apagarAvisosAntesDe` (antes do comentário `// D-108 e CB-115: …` de `anotarChamada`), acrescente. A consulta fica numa linha só, como as outras do arquivo: o teste de texto a procura assim.

```ts
    // D-109: os avisos sem a assinatura conferida (nula ou falsa) que chegaram depois de `desde`.
    async contarAvisosNaoConferidos(desde) {
      const contagem = await cliente.from('avisos_da_operadora').select('id', { count: 'exact', head: true }).not('assinatura_confere', 'is', true).gt('recebido_em', desde.toISOString())
      return numeroDa(contagem)
    },
```

- [ ] **Step 7: Rodar e ver passar**

Run: `npx vitest run src/data/servidorWebhook.test.ts src/data/servidorLigacao.test.ts src/data/servidorChamadas.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: verde.

Run: `npx --yes deno@2 check --no-lock supabase/functions/assinar/index.ts supabase/functions/gerenciar-assinatura/index.ts supabase/functions/webhook-mercadopago/index.ts`
Expected: saída 0, sem erro de tipo.

- [ ] **Step 8: Commit**

`../_msg.txt`:

```text
feat(webhook): registro guarda até 100 avisos não conferidos por hora

O aviso conferido é sempre anotado. O não conferido (sem segredo,
sem id, recurso inválido ou assinatura que não confere) só entra
enquanto houver menos de 100 na última hora; a resposta não muda.
Sem conseguir contar, não anota.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

```bash
git add supabase/functions/_shared/portas.ts supabase/functions/_shared/webhook.ts supabase/functions/_shared/bancoSupabase.ts src/data/servidorFalsos.test-utils.ts src/data/servidorWebhook.test.ts src/data/servidorLigacao.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 7: Tela: o 429 na janela de cancelar e nos pedidos com cartão

Cobre o lado da tela de D-108 (CA-448 e CA-449).

**Files:**
- Modify: `src/domain/assinaturaTextos.ts` (import e uma constante)
- Modify: `src/domain/assinaturaTextos.test.ts` (import, a lista do CA-381 e um teste)
- Modify: `src/ui/conta/DialogoCancelarAssinatura.tsx` (import, fases, `.then` e a descrição)
- Modify: `src/ui/estado/usarAssinatura.test.ts` (import e dois testes)
- Modify: `src/ui/conta/TelaConta.test.tsx` (import e dois testes)

**Interfaces:**
- Consumes: `MUITAS_CHAMADAS` de `supabase/functions/_shared/chamadas.ts` (Tarefa 5).
- Produces (`src/domain/assinaturaTextos.ts`): `export const MUITAS_TENTATIVAS_SEGUIDAS: string` (a mesma frase do servidor).
- `usarAssinatura.ts` não muda: para o 429, `mensagemDaFalha` já devolve o `erro` que o servidor mandou (os testes desta tarefa confirmam).

- [ ] **Step 1: Escrever os testes que falham**

Em `src/domain/assinaturaTextos.test.ts`:

1. No import de `./assinaturaTextos.ts`, acrescente `MUITAS_TENTATIVAS_SEGUIDAS` (na ordem alfabética do bloco).
2. Logo abaixo dos imports, acrescente `import { MUITAS_CHAMADAS } from '../../supabase/functions/_shared/chamadas.ts'`.
3. No teste `'CA-381: nenhum texto da recusa ou do cancelamento cita o processador'`, acrescente `MUITAS_TENTATIVAS_SEGUIDAS,` logo depois de `PREVIA_FALHOU,` na lista `textos`.
4. Logo depois desse teste, ainda no mesmo `describe`, acrescente:

```ts
  it('CA-448 e CA-449: a frase do limite de pedidos é a mesma que o servidor manda no 429', () => {
    expect(MUITAS_TENTATIVAS_SEGUIDAS).toBe(MUITAS_CHAMADAS)
    expect(MUITAS_TENTATIVAS_SEGUIDAS).toBe('Muitas tentativas seguidas. Espere uma hora e tente de novo.')
  })
```

Em `src/ui/estado/usarAssinatura.test.ts`:

1. Logo depois de `import { CARTAO_ANTIGO, CONFIRA_O_CARTAO, mensagemDaRecusa, SERVIDOR_FORA } from '@/domain/cartao.ts'`, acrescente `import { MUITAS_TENTATIVAS_SEGUIDAS } from '@/domain/assinaturaTextos.ts'`.
2. Logo antes de `it('CB-93: cancelamento que falha também lê a assinatura de novo, para a tela mostrar o que o servidor tem', async () => {`, acrescente:

```ts
  it('CA-448: o 429 de pedidos com cartão demais mostra a frase do servidor, ao assinar e ao trocar o cartão', async () => {
    const { result } = await aberto()
    const limite = { erro: MUITAS_TENTATIVAS_SEGUIDAS, codigo: 'muitas-chamadas' }
    cliente.invocar.mockResolvedValueOnce(respondeu(429, limite))
    await act(async () => {
      expect(await result.current.assinar('solo', 'mensal', CARTAO)).toEqual({ ok: false, erro: 'Muitas tentativas seguidas. Espere uma hora e tente de novo.' })
    })
    cliente.invocar.mockResolvedValueOnce(respondeu(429, limite))
    await act(async () => {
      expect(await result.current.trocarCartao(CARTAO)).toEqual({ ok: false, erro: 'Muitas tentativas seguidas. Espere uma hora e tente de novo.' })
    })
  })

  it('CA-449: o mesmo 429 na prévia e no cancelamento volta com a frase do servidor', async () => {
    const { result } = await aberto()
    const limite = { erro: MUITAS_TENTATIVAS_SEGUIDAS, codigo: 'muitas-chamadas' }
    cliente.invocar.mockResolvedValueOnce(respondeu(429, limite))
    await act(async () => {
      expect(await result.current.previaDoCancelamento()).toEqual({ ok: false, erro: MUITAS_TENTATIVAS_SEGUIDAS })
    })
    cliente.invocar.mockResolvedValueOnce(respondeu(429, limite))
    await act(async () => {
      expect(await result.current.cancelar()).toEqual({ ok: false, erro: MUITAS_TENTATIVAS_SEGUIDAS })
    })
  })

```

Em `src/ui/conta/TelaConta.test.tsx`:

1. Troque `import { CONFERINDO_COBRANCA } from '@/domain/assinaturaTextos.ts'` por `import { CONFERINDO_COBRANCA, MUITAS_TENTATIVAS_SEGUIDAS } from '@/domain/assinaturaTextos.ts'`.
2. Logo antes de `it('CA-393: a data da recusa é a de Brasília (01h UTC de 7/11 ainda é 6/11)', () => {`, acrescente:

```tsx
  it('CA-449: com pedidos demais na última hora, a janela mostra a frase do servidor no lugar da falha de conferência e continua sem deixar confirmar', async () => {
    estado.previa = vi.fn(async (): Promise<ResultadoDaPrevia> => ({ ok: false, erro: MUITAS_TENTATIVAS_SEGUIDAS }))
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    const janela = screen.getByRole('dialog', { name: 'Cancelar a assinatura?' })
    expect(await within(janela).findByText('Muitas tentativas seguidas. Espere uma hora e tente de novo.')).toBeInTheDocument()
    expect(within(janela).queryByText('Não consegui conferir se já houve cobrança.')).not.toBeInTheDocument()
    expect(within(janela).getByRole('button', { name: 'Cancelar assinatura' })).toBeDisabled()
    // Tentar de novo agora daria a mesma resposta: o botão não aparece.
    expect(within(janela).queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
    expect(estado.cancelar).not.toHaveBeenCalled()
  })

  it('Foco: fechar a janela depois do limite e abrir de novo pergunta de novo ao servidor e volta ao normal quando ele responde', async () => {
    estado.previa = vi.fn(async (): Promise<ResultadoDaPrevia> => ({ ok: false, erro: MUITAS_TENTATIVAS_SEGUIDAS }))
    estado.assinatura = PAGA
    const { usuario } = montar(nutri)
    await usuario.click(screen.getByRole('button', { name: 'Cancelar assinatura' }))
    const primeira = screen.getByRole('dialog', { name: 'Cancelar a assinatura?' })
    expect(await within(primeira).findByText(MUITAS_TENTATIVAS_SEGUIDAS)).toBeInTheDocument()
    await usuario.click(within(primeira).getByRole('button', { name: 'Manter assinatura' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    estado.previa.mockResolvedValueOnce({ ok: true, cobrada: false, expiraEm: null })
    const janela = await abrirCancelamento(usuario)
    expect(janela).toHaveTextContent('Ainda não houve cobrança.')
    expect(janela).not.toHaveTextContent(MUITAS_TENTATIVAS_SEGUIDAS)
    expect(estado.previa).toHaveBeenCalledTimes(2)
  })

```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/assinaturaTextos.test.ts src/ui/estado/usarAssinatura.test.ts src/ui/conta/TelaConta.test.tsx`
Expected: FAIL. `MUITAS_TENTATIVAS_SEGUIDAS` não existe; a janela ainda mostra "Não consegui conferir se já houve cobrança." e o "Tentar de novo".

- [ ] **Step 3: A frase na tela**

Em `src/domain/assinaturaTextos.ts`:

1. Logo depois de `import { previsaoDaProximaCobranca } from '../../supabase/functions/_shared/cobranca.ts'`, acrescente `import { MUITAS_CHAMADAS } from '../../supabase/functions/_shared/chamadas.ts'`.
2. Logo depois de `export const PREVIA_FALHOU = 'Não consegui conferir se já houve cobrança.'`, acrescente:

```ts
/** D-108 (CA-448 e CA-449): a frase do limite de pedidos seguidos, a mesma que o servidor manda no 429. */
export const MUITAS_TENTATIVAS_SEGUIDAS = MUITAS_CHAMADAS
```

- [ ] **Step 4: A janela de cancelar**

Em `src/ui/conta/DialogoCancelarAssinatura.tsx`:

1. Troque a linha 3 por `import { CONFERINDO_COBRANCA, MUITAS_TENTATIVAS_SEGUIDAS, PREVIA_FALHOU, textoDoCancelamento, type PreviaDoCancelamento } from '@/domain/assinaturaTextos.ts'`.
2. Troque:

```tsx
type Conferencia = { readonly fase: 'conferindo' } | { readonly fase: 'falhou' } | { readonly fase: 'pronta'; readonly previa: PreviaDoCancelamento }
const CONFERINDO: Conferencia = { fase: 'conferindo' }
```

por:

```tsx
type Conferencia =
  | { readonly fase: 'conferindo' }
  | { readonly fase: 'falhou' }
  | { readonly fase: 'esperar' }
  | { readonly fase: 'pronta'; readonly previa: PreviaDoCancelamento }
const CONFERINDO: Conferencia = { fase: 'conferindo' }
const FALHOU: Conferencia = { fase: 'falhou' }
/** D-108 (CA-449): pedidos demais na última hora. Tentar de novo agora daria a mesma resposta. */
const ESPERAR: Conferencia = { fase: 'esperar' }
```

3. Troque o comentário do componente:

```tsx
/**
 * CA-377 e CA-395 a CA-397 (D-81): ao abrir, pergunta ao servidor se já houve cobrança e diz o
 * que acontece; "Cancelar assinatura" só libera com a resposta. "Manter assinatura" vem primeiro e recebe o foco.
 */
```

por:

```tsx
/**
 * CA-377 e CA-395 a CA-397 (D-81): ao abrir, pergunta ao servidor se já houve cobrança e diz o
 * que acontece; "Cancelar assinatura" só libera com a resposta. "Manter assinatura" vem primeiro e recebe o foco.
 * CA-449: com pedidos demais na última hora, diz para esperar, sem "Tentar de novo", e não deixa confirmar.
 */
```

4. Em `conferir`, troque:

```tsx
    void previa().then(
      (r) => {
        if (pedidoRef.current === meu) setConferencia(r.ok ? { fase: 'pronta', previa: { cobrada: r.cobrada, expiraEm: r.expiraEm } } : { fase: 'falhou' })
      },
      () => {
        if (pedidoRef.current === meu) setConferencia({ fase: 'falhou' })
      },
    )
```

por:

```tsx
    void previa().then(
      (r) => {
        if (pedidoRef.current !== meu) return
        if (r.ok) setConferencia({ fase: 'pronta', previa: { cobrada: r.cobrada, expiraEm: r.expiraEm } })
        else setConferencia(r.erro === MUITAS_TENTATIVAS_SEGUIDAS ? ESPERAR : FALHOU)
      },
      () => {
        if (pedidoRef.current === meu) setConferencia(FALHOU)
      },
    )
```

5. Troque a descrição:

```tsx
      : conferencia.fase === 'falhou'
        ? PREVIA_FALHOU
        : CONFERINDO_COBRANCA
```

por:

```tsx
      : conferencia.fase === 'falhou'
        ? PREVIA_FALHOU
        : conferencia.fase === 'esperar'
          ? MUITAS_TENTATIVAS_SEGUIDAS
          : CONFERINDO_COBRANCA
```

O botão "Tentar de novo" já só aparece na fase `'falhou'`, e `pronta` continua falso na fase `'esperar'`: "Cancelar assinatura" fica parado.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/domain/assinaturaTextos.test.ts src/ui/estado/usarAssinatura.test.ts src/ui/conta/TelaConta.test.tsx`
Expected: PASS.

Run: `npm run check`
Expected: verde.

- [ ] **Step 6: Commit**

`../_msg.txt`:

```text
feat(conta): janela de cancelar mostra o limite de pedidos

Com pedidos demais na última hora, a janela de cancelar diz para
esperar uma hora no lugar da falha de conferência, sem "Tentar de
novo", e continua sem deixar confirmar. Assinar e trocar o cartão
mostram a mesma frase do servidor.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

```bash
git add src/domain/assinaturaTextos.ts src/domain/assinaturaTextos.test.ts src/ui/conta/DialogoCancelarAssinatura.tsx src/ui/estado/usarAssinatura.test.ts src/ui/conta/TelaConta.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 8: Documentação e validação final

Registra o lote e deixa a ordem para pôr no ar pronta para o dono. Nenhum código muda aqui.

**Files:**
- Modify: `README.md:140,185,188,200`
- Modify: `docs/pendencias.md:92`
- Modify: `docs/decisoes.md:80`
- Modify: `specs/cobranca-em-producao/SPEC.md:42,55,56`

**Interfaces:**
- Consumes: tudo das Tarefas 1 a 7.
- Produces: nada para outras tarefas.

- [ ] **Step 1: README**

1. Em "Projeto novo", passo 3, troque a linha:

```markdown
   `009-cobranca-em-producao.sql` e `010-seguranca-lote-1.sql`.
```

por:

```markdown
   `009-cobranca-em-producao.sql`, `010-seguranca-lote-1.sql` e `011-seguranca-lote-2.sql`.
```

2. Em "Projeto já ligado", passo 4, logo depois da linha `   se rodar o 006 de novo, rode o 010 logo depois.`, acrescente:

```markdown
   Depois rode `supabase/011-seguranca-lote-2.sql` (spec seguranca-lote-2): o banco passa a limitar o tamanho da cópia
   na nuvem e de cada link, põe o teto de 1000 links por conta, conta as chamadas de cada conta à cobrança, aceita
   comprovante só de estudante com e-mail de faculdade confirmado e apaga a função antiga das vagas de fundador. Rode
   **antes** de publicar as funções do passo 5: elas anotam cada chamada à cobrança na tabela nova, e publicadas antes
   assinar, trocar o cartão, conferir e cancelar falham sem cobrar. Também pode rodar de novo; se rodar o 003, o 006
   ou o 010 de novo, rode o 011 logo depois.
```

3. No passo 5, troque o começo da linha:

```markdown
   `008` e o `009` rodados, e com o
```

por:

```markdown
   `008`, o `009` e o `011` rodados, e com o
```

4. No passo 5, troque o começo da linha:

```markdown
   *Table Editor > avisos_da_operadora*, com o resultado. Sem o segredo
```

por:

```markdown
   *Table Editor > avisos_da_operadora*, com o resultado; os que não conferem, até 100 por hora (D-109). Sem o segredo
```

- [ ] **Step 2: Pendências**

Em `docs/pendencias.md`, logo depois da linha `> do registro de avisos acontece quando chega um aviso, então meses sem nenhum deixam os velhos lá mais tempo.`, acrescente:

```markdown
>
> **Atualizado em 07/10 (segurança, lote 2):** o servidor passa a limitar quanto cada conta guarda e quantas vezes ela
> chama a cobrança (spec `seguranca-lote-2`, D-107 a D-112):
>
> - a cópia na nuvem vai até 5 MB; cada link, missões até 256 KB, marcações até 1 MB e nome até 120 caracteres; cada
>   conta guarda no máximo 1000 links, em qualquer plano;
> - cada conta faz até 10 pedidos com cartão por hora (assinar e trocar o cartão) e até 20 de conferir ou cancelar;
> - o registro de avisos guarda até 100 avisos não conferidos por hora; os conferidos sempre entram;
> - as três funções de cobrança recusam pedido acima de 64 KB;
> - só estudante com e-mail de faculdade confirmado envia comprovante, e a tela diz o motivo antes de enviar;
> - a função antiga das vagas de fundador sai do banco.
>
> **A ordem para pôr no ar (você roda; os comandos estão prontos):**
>
> 1. rodar o SQL no banco de produção (as funções novas anotam cada chamada na tabela dele; publicadas antes, assinar,
>    trocar o cartão, conferir e cancelar falham sem cobrar):
>    `npx supabase db query --linked --project-ref qmpljfjbdcrdbqutuvmg -f supabase/011-seguranca-lote-2.sql`
> 2. conferir com as consultas do fim do `011`: seis travas `_tamanho`, a função das vagas sem existir e a tabela
>    `chamadas_da_cobranca` com RLS;
> 3. juntar o ramo na `main`;
> 4. publicar as três funções:
>    `npx supabase functions deploy gerenciar-assinatura --project-ref qmpljfjbdcrdbqutuvmg`,
>    `npx supabase functions deploy assinar --project-ref qmpljfjbdcrdbqutuvmg` e
>    `npx supabase functions deploy webhook-mercadopago --no-verify-jwt --project-ref qmpljfjbdcrdbqutuvmg`;
> 5. publicar o site: `gh workflow run publicar.yml --ref main`.
>
> Fica para depois (spec, seção 4): captcha no cadastro e no login (lote 3) e a regra de conteúdo do navegador (CSP).
```

- [ ] **Step 3: Decisões e a spec da cobrança**

Em `docs/decisoes.md`, logo depois da linha da tabela que começa com `| 07/10/2026 | **Cobrança pronta para produção**`, acrescente a linha:

```markdown
| 07/10/2026 | **Segurança, lote 2** (D-107 a D-112 da `specs/seguranca-lote-2/SPEC.md`, resumidas aqui): D-107 a cópia na nuvem vai até 5 MB; cada link, missões até 256 KB, marcações até 1 MB, nome até 120 caracteres e códigos até 64; no máximo 1000 links por conta, em qualquer plano · D-108 até 10 pedidos com cartão e 20 de conferir ou cancelar por hora, por conta · D-109 o registro guarda até 100 avisos não conferidos por hora · D-110 o pedido às funções de cobrança vai até 64 KB · D-111 só estudante com e-mail de faculdade confirmado envia comprovante · D-112 a função das vagas de fundador é apagada | auditoria de segurança de 07/10/2026; teto de 1000 links aceito (R-40) | usuário |
```

Em `specs/cobranca-em-producao/SPEC.md`, acrescente ao fim de cada uma das linhas do CA-399, do CA-436 e do CA-437, depois do ponto final e de um espaço, o texto:

```markdown
Até 100 avisos não conferidos por hora (D-109 da `seguranca-lote-2`); acima disso, a resposta é a mesma e o aviso não é anotado.
```

- [ ] **Step 4: Validação completa**

Run: `npm run check`
Expected: lint, typecheck e todos os testes verdes.

Run: `npx playwright test`
Expected: todos os testes e2e passam (nenhum depende do servidor; o comportamento sem servidor não mudou).

Run: `npx --yes deno@2 check --no-lock supabase/functions/assinar/index.ts supabase/functions/gerenciar-assinatura/index.ts supabase/functions/webhook-mercadopago/index.ts`
Expected: saída 0.

Run: `npx vitest run -t "CA-44[5-9]|CA-45[0-3]|CB-11[2-5]"`
Expected: PASS, com pelo menos um teste para cada ID de CA-445 a CA-453 e de CB-112 a CB-115 (confira na lista da "Cobertura da spec" abaixo).

Run: `git grep -n "vagas_de_fundador_usadas" -- src supabase`
Expected: só em `supabase/011-seguranca-lote-2.sql` (o `drop` e a consulta de conferência) e em `src/data/sqlSegurancaLote2.test.ts`.

Run: `git grep -n "comprovantes_da_conta" -- src`
Expected: só nos testes de SQL (`sqlSeguranca.test.ts`, `sqlSegurancaLote2.test.ts`); a tela não chama mais essa função.

Confira, uma a uma, as linhas da "Cobertura da spec" e as "Decisões do plano". Qualquer diferença entre código e spec vai para o relatório final ao dono.

- [ ] **Step 5: Commit**

`../_msg.txt`:

```text
docs: segurança, lote 2 registrado e ordem para pôr no ar

README com o 011 na ordem dos SQL, pendências com os comandos para
o dono, decisões D-107 a D-112 e a nota do D-109 nos CA-399, CA-436
e CA-437 da cobrança.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

```bash
git add README.md docs/pendencias.md docs/decisoes.md specs/cobranca-em-producao/SPEC.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

## Cobertura da spec

| ID | Tarefa | Teste |
|---|---|---|
| CA-445 | 1, 2 | `sqlSegurancaLote2.test.ts` › "CA-445 e CB-113: a cópia completa vai até 5 MB…"; `mensagemDoBanco.test.ts` › "CA-445: a cópia acima de 5 MB chega com a frase da cópia"; `copiaNaNuvem.test.ts` › "CA-445: o banco recusa a cópia acima de 5 MB…" e "CA-445 e R-41: … (413) mostra a mesma frase" |
| CA-446 | 1, 2 | `sqlSegurancaLote2.test.ts` › "CA-446 e CB-113: missões até 256 KB…"; `mensagemDoBanco.test.ts` › "CA-446: cada trava de tamanho do link…"; `fonteSupabase.test.ts` › "CA-446: o banco recusa o link grande demais…"; `missoesNaNuvem.test.tsx` › "CA-446: a tela diz que o link ficou grande demais…" |
| CA-447 | 1 | `sqlSegurancaLote2.test.ts` › `describe('CA-447: …')` (teto, frase do CA-422 e contagem em todo plano). A tela usa o caminho que já existe: `fonteSupabase.test.ts` › "CA-422 / CA-442" e `missoesNaNuvem.test.tsx` › "CA-442" |
| CA-448 | 5, 7 | `servidorChamadas.test.ts` › "CA-448: assinar com 10…", "CA-448: trocar o cartão com 10…", "CA-448: assinar e trocar o cartão somam…", "CA-448: qualquer resultado conta (…)"; `usarAssinatura.test.ts` › "CA-448: o 429 de pedidos com cartão demais…" |
| CA-449 | 5, 7 | `servidorChamadas.test.ts` › "CA-449: prévia / cancelar com 20…", "CA-449: prévia e cancelar somam…"; `usarAssinatura.test.ts` › "CA-449: o mesmo 429 na prévia e no cancelamento…"; `TelaConta.test.tsx` › "CA-449: com pedidos demais na última hora, a janela…" |
| CA-450 | 6 | `servidorWebhook.test.ts` › `describe('o registro guarda até 100 avisos não conferidos por hora (D-109)')` (seis testes "CA-450"); `servidorLigacao.test.ts` › "CA-450: conta os avisos com a assinatura nula ou falsa…" |
| CA-451 | 4 | `servidorCorpo.test.ts` › "CA-451: o limite é em bytes…", "CA-451: o tamanho declarado acima de 64 KB…", "CA-451: sem o tamanho declarado…"; `servidorLigacao.test.ts` › "CA-451: %s lê o corpo com o teto de 64 KB…" e "CA-451: acima de 64 KB, … 413" |
| CA-452 | 1, 3 | `sqlSegurancaLote2.test.ts` › "CA-452: confere a situação…" e "CA-452: a política de envio usa a mesma conferência…"; `pedidoEstudante.test.ts` › "CA-452: sem e-mail de faculdade confirmado…"; `usarPedidoEstudante.test.ts` › "CA-452: … nada é enviado"; `TelaComprovarMatricula.test.tsx` › "CA-452: … a tela diz o motivo…" |
| CA-453 | 1 | `sqlSegurancaLote2.test.ts` › "o 011 apaga a função de quem já a tinha" e "o 003 não a cria mais" (no `describe('CA-453: …')`) |
| CB-112 | 1, 2 | `sqlSegurancaLote2.test.ts` › "CB-112: a trava é da própria tabela…"; `copiaNaNuvem.test.ts` › "CB-112: a cópia recusada não apaga a anterior…" |
| CB-113 | 1, 4, 5, 6 | 5 MB, 256 KB, 1 MB, 120, 64: `sqlSegurancaLote2.test.ts` (CA-445/CA-446 e CB-113); 1000º link: "CB-113: com 999 links o milésimo passa…"; 64 KB: `servidorCorpo.test.ts` › "CB-113: 64 KB exatos passam…"; 10º e 20º: `servidorChamadas.test.ts` › "CB-113: o 10º pedido…", "CB-113: o 20º pedido de %s…", "CB-113: a janela é estrita…" e `sqlSegurancaLote2.test.ts` › "CB-113: só recusa com o limite já cheio…"; 100º aviso: `servidorWebhook.test.ts` › "CB-113: com 99 na última hora…" e "CB-113: a janela é estrita…" |
| CB-114 | 5 | `servidorChamadas.test.ts` › "CB-114: sem conseguir contar, assinar…", "CB-114: … trocar o cartão…", "CB-114: sem conseguir contar, %s…"; `servidorLigacao.test.ts` › "CB-114: sem a resposta sim ou não do banco, rejeita…" |
| CB-115 | 1, 5 | `sqlSegurancaLote2.test.ts` › "CB-115: conta e anota num passo só…"; `servidorChamadas.test.ts` › "CB-115: cinco prévias ao mesmo tempo…"; `servidorLigacao.test.ts` › "CB-115: contar e anotar são um passo só…" |

## Decisões do plano

Pontos que o plano decidiu, ou achou no código, e que o dono precisa saber.

1. **CB-115 fica mais forte do que a spec pede: zero acima do limite, não "no máximo um".** Contar e depois anotar, em dois pedidos ao banco, deixa N pedidos simultâneos de conferir/cancelar passarem juntos (a prévia e o cancelamento não usam a reserva da conta, CB-109). Por isso o 011 cria `anotar_chamada_da_cobranca`, que trava a conta e o tipo, conta e anota num passo só, e devolve sim ou não. É uma função a mais no banco, só para o servidor.
2. **Só conta o pedido que de fato chega à operadora.** O portão fica logo antes da chamada: no cartão, dentro da reserva da conta e depois do portão de recusas do D-101; na prévia e no cancelamento, depois das respostas que não chamam a operadora (já cancelada aqui, pendente, sem assinatura paga). 400, 409, o 429 do D-101 e o próprio 429 do limite não são anotados. "Qualquer resultado" vale para a resposta da operadora (aprovado, recusado, sem resposta, erro). Quem espera uma hora volta a passar.
3. **O 429 do limite usa o código `muitas-chamadas`** (o do D-101 continua `muitas-tentativas`). A tela não lê esse código: mostra a frase do servidor, como já fazia com os outros erros que não são recusa de cartão (CA-448 não muda código de tela).
4. **A janela de cancelar reconhece o limite pela frase do servidor**, reexportada de `_shared/chamadas.ts` em `assinaturaTextos.ts` (sem cópia do texto), e entra numa fase própria: mostra a frase, esconde "Tentar de novo" (daria a mesma resposta) e não deixa confirmar. Fechar e abrir de novo pergunta de novo.
5. **As travas de tamanho são checks com nome fixo, traduzidas em `mensagemDoBanco` pelo código 23514 e pelo nome entre aspas** (vale com o banco em qualquer idioma). Na cópia, o 413 do servidor mostra a mesma frase (R-41). Se o Supabase recusar uma cópia grande com outro código, a tela mostra a falha de rede de sempre: o R-41 fica aberto nesse caso, para conferir na primeira cópia grande de verdade.
6. **O link grande demais fica pendente no aparelho**, ao contrário do limite de links (que volta ao que era, CA-442): voltar apagaria as missões novas. O cartão mostra a frase sem "Tentar de novo"; Adesão mostra "Ainda não está na nuvem." com a mesma frase e o botão de sempre (Adesão ficou de fora). Nome acima de 120 e códigos acima de 64 caem na mesma frase "Tire algumas missões", porque a spec escolheu uma frase só; o app gera códigos de 36 letras e a tela de renomear limita a 80.
7. **O teto de 1000 links usa `least(coalesce(limite, 1000), 1000)`** e a trava de duas abas passa a valer em todo plano (antes, só nos com limite). A tela do Pro e da Clínica não avisa antes de chegar a 1000; a recusa mostra a frase do CA-422 com o botão "Ver planos", como no limite de plano.
8. **O comprovante pergunta antes de enviar** com `conferir_envio_de_comprovante`, que a política de envio também usa (o servidor continua garantindo). Sem resposta dela (o banco ainda sem o 011, ou a rede), o envio segue e o armazenamento decide; na recusa do armazenamento, ela é chamada de novo para dizer o motivo (R-42). A tela deixa de chamar `comprovantes_da_conta`, que fica no banco (a conferência usa a contagem dela).
9. **O D-112 também tira a função do `003`**, além de apagá-la no 011; senão, rodar o 003 de novo a traria de volta. Conferido em 07/10: nada no código nem nos testes chama a função. A coluna `preco_travado` fica (a spec não pede para apagar).
10. **O D-109 não precisa de índice nem de trava novos**: a contagem usa o índice por data do 009. Avisos não conferidos que chegam no mesmo instante podem passar de 100 por poucos (sem trava, para o aviso responder rápido). Acima do limite, o aviso também não dispara a limpeza dos avisos de mais de 90 dias naquela vez.
11. **O D-110 lê o corpo antes de tudo** (antes da configuração e da sessão): o tamanho declarado acima de 64 KB recusa sem ler; sem ele, a leitura para logo depois do limite. Assinar e gerenciar respondem 413 com `O pedido é grande demais.` e os cabeçalhos do site; o aviso responde 413 em texto, sem anotar no registro.
12. **A retenção de 2 dias das chamadas é feita pelas funções**, a cada chamada anotada, como nas tentativas de cartão; a falha ao apagar só vai para o registro da função.
13. **Arquivos que o plano muda além dos que a spec cita:** a linha de status da própria spec (aprovada, Tarefa 1), o `003` (item 9), o `CartaoLinkMissoes.tsx` (item 6) e uma nota do D-109 no CA-399, no CA-436 e no CA-437 de `specs/cobranca-em-producao/SPEC.md` (Tarefa 8), porque o D-109 diz que os muda.
14. **Ordem para pôr no ar: 011, depois as funções, depois o site.** As funções novas falham sem o 011 (sem cobrar). O site novo tolera o banco sem o 011: a conferência do comprovante sem resposta deixa o envio seguir.
15. **A tela de comprovante mostra 'Só conta de estudante envia comprovante de matrícula.' para conta que não é de estudante;** a frase não está na spec, e fica (decisão do controlador em 07/10/2026).
