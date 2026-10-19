# Segurança, lote 5 · Plano

**Spec:** `specs/seguranca-lote-5/SPEC.md` (D-260 a D-267, CA-830 a CA-857, CB-260 a CB-268, R-60 a R-62).

**Stack:** React 18 + TypeScript strict + Vite · supabase-js 2.116 no site (MFA e PKCE já vêm nele) · funções Deno
com `npm:@supabase/supabase-js@2.117.2` · Postgres do Supabase com `pg_cron`, `pg_net` e Vault · Vitest + Testing
Library · Playwright · Supabase local (`npm run test:seguranca`). **Nenhum pacote novo**: o código TOTP dos testes de
banco é calculado com `node:crypto` (RFC 6238).

## Regras que valem em todas as tarefas

- TDD: o teste de cada tarefa é escrito e visto falhar antes do código. Um teste por critério, com o ID no nome.
- Toda tarefa termina com `npm run check` verde; as tarefas de banco, também com `npm run test:seguranca` verde (numa
  cópia local com project_id e portas só desta frente, para não derrubar a pilha de outra frente).
- Nada roda contra a produção. Nenhum segredo entra no repositório.
- Um commit por tarefa, Conventional Commits em português.

## Tarefas, na ordem

1. **Spec e plano** — este arquivo e a `SPEC.md`.

2. **Funções com `npm:` (D-265, CA-852)** — `src/data/servidorLigacao.test.ts` passa a exigir
   `npm:@supabase/supabase-js@2.117.2` e nenhum `esm.sh` nos três `index.ts` e no `_shared/bancoSupabase.ts`; depois
   os quatro imports mudam. Comportamento igual (mesma versão).

3. **Supabase local com MFA** — `testes/supabase-local/supabase/config.toml` liga o TOTP (`[auth.mfa.totp]`);
   `testes/seguranca/totp.ts` calcula o código (RFC 6238, `node:crypto`) com teste próprio no `npm run check`
   (`src/seguranca/totp.test.ts`, vetores da RFC); `preparo.ts` cadastra e confirma o app do administrador de teste,
   que passa a ter sessão `aal2`; o script passa o nome do contêiner do banco para a suíte
   (`ATAQUE_CONTEINER_DO_BANCO`), que roda conferências por `psql` quando precisa ver o que a API não mostra.

4. **`014`, parte 1: o administrador com segundo fator (D-260 a D-262, CA-830 a CA-834, CA-841)** —
   `supabase/014-seguranca-lote-5.sql`, numa transação: a trava que para o arquivo se algum administrador não tem o
   app cadastrado; `eh_admin()` exige `aal2`; `admin_sem_segundo_fator()` nova (só logado). Testes de texto em
   `src/data/sqlSegurancaLote5.test.ts`; ataques em `testes/seguranca/segundoFator.test.ts` (administrador `aal1`
   barrado em cada função e leitura; `aal2` passa; conta comum e visitante; a trava do `014` rodada de novo com um
   administrador sem app).

5. **`014`, parte 2: a limpeza dos comprovantes no banco (D-263, D-264, CA-843 a CA-846, CA-849, CA-850)** —
   `comprovantes_vencidos(p_agora, p_limite)`, `anotar_comprovantes_apagados(p_caminhos)` (só marca o que já saiu
   do armazenamento), `conferir_chave_da_limpeza(p_chave)`, `pedir_limpeza_dos_comprovantes()`, a chave no Vault
   (criada só se falta), `pg_cron` e `pg_net` ligados e o agendamento diário. As duas funções do administrador do
   `006` passam a usar as novas (mesma regra, um lugar só). Testes de texto e no Supabase local.

6. **Função `limpar-comprovantes` (D-263, D-264, CA-843, CA-847, CA-848, CA-851, CB-265, CB-266)** — núcleo puro em
   `supabase/functions/_shared/limpeza.ts` (sem Deno, sem console, sem relógio), ligação ao banco em
   `_shared/limpezaSupabase.ts` (tipo estrutural do cliente, sem import), e `limpar-comprovantes/index.ts` fino.
   Testes: `src/data/servidorLimpeza.test.ts` (núcleo com banco de mentira), `servidorLigacao.test.ts` (texto do
   `index.ts`) e `testes/seguranca/limpeza.test.ts` (núcleo + ligação com o armazenamento e o banco do Supabase
   local: o arquivo sai de verdade e o pedido guarda a decisão).

7. **Telas do segundo fator (D-261, CA-835 a CA-840, CA-842, CB-260, CB-262 a CB-264, CB-267, CB-268)** —
   `usarPerfilConta.ts` lê também `admin_sem_segundo_fator` e o nível da sessão (`mfa.getAuthenticatorAssuranceLevel`)
   e devolve `ehAdmin` (liberado) e `precisaSegundoFator`; `src/ui/estado/usarSegundoFator.ts` (listar fatores,
   descartar cadastro não confirmado, cadastrar, confirmar); `src/ui/segundoFator/TelaSegundoFator.tsx`,
   `CampoCodigoDoApp.tsx` e `ChaveDoApp.tsx`; `AreaDeTrabalho.tsx` e `App.tsx` usam o portão. Antes, a skill
   `impeccable` e o `craft-floor.md`.

8. **Nova senha só com o código (D-266, CA-853, CA-854)** — `TelaNovaSenha.tsx`: troca só no modo de troca.

9. **PKCE (D-267, CA-855, CA-856)** — `src/ui/estado/supabase.ts` com `flowType: 'pkce'`; teste do cliente e do
   endereço com sessão no fragmento.

10. **Documentos (CA-857)** — `SECURITY.md` (o que protege o site) e `README.md` (o `014`, a função nova e a ordem).

11. **Validação** — `npm run check`, `npx playwright test` (cópia da configuração numa porta só desta frente),
    `npm run build`, `npm run test:seguranca` (cópia local), prints antes e depois, relatório.

## Decisões do plano

- **DP-L5-1** · O nível da sessão é lido no navegador (`getAuthenticatorAssuranceLevel`, que lê o token sem rede) e
  no banco (`auth.jwt() ->> 'aal'`). No navegador é só conforto e serve para o site novo funcionar antes do `014`
  (CA-840); quem decide é o banco.
- **DP-L5-2** · Conta de administrador = `eh_admin()` ou `admin_sem_segundo_fator()` verdadeiro. Antes do `014` a
  segunda não existe (erro tratado como "não") e a primeira já diz sim; depois, uma das duas diz sim em cada nível.
- **DP-L5-3** · O cadastro do app sai sem `friendlyName` e com `issuer: 'MetaNutri'` (é o nome que o app mostra).
  Antes de cadastrar, os fatores TOTP não confirmados da conta são descartados (CB-260).
- **DP-L5-4** · `comprovantes_vencidos` recebe a data de referência (`p_agora`, padrão `now()`): só o servidor a
  chama, e é o que deixa o teste do Supabase local ver os prazos de 30 dias e de 1 dia sem mexer no relógio.
- **DP-L5-5** · A chave da limpeza nasce no próprio banco (`gen_random_uuid` duas vezes, 244 bits aleatórios) e a
  função a confere por `conferir_chave_da_limpeza`, que só o servidor executa. Nenhum segredo para copiar.
- **DP-L5-6** · A função não lê o corpo do pedido: só o cabeçalho `x-chave-da-limpeza`.
- **DP-L5-7** · A limpeza do navegador do administrador (CA-299, `usarAprovacoes.ts`) não muda: ela continua como
  reserva e passa a marcar só o que já saiu do armazenamento, porque `marcar_comprovantes_apagados` usa a mesma
  anotação nova.
- **DP-L5-8** · Os testes de banco desta frente rodam com uma cópia temporária, fora do Git, de
  `scripts/testes-de-ataque.mjs` e da configuração local, com outro `project_id` e outras portas. A cópia é apagada
  no fim.
