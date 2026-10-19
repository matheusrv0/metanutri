# PLAN — Excluir a conta pelo site

Lê a `SPEC.md` desta pasta (D-250 a D-258, CA-800 a CA-829, CB-250 a CB-259). Cada tarefa é um commit, em TDD: o
teste primeiro, visto falhando, depois o código.

## 1. Arquivos, na ordem

| Arquivo | Tarefa | O que muda |
|---|---|---|
| `supabase/013-exclusao-de-conta.sql` | T1 | novo: registro das assinaturas de contas excluídas, o histórico sem chave estrangeira, o gatilho antes de apagar o login, o tipo de chamada `excluir` |
| `src/data/sqlExclusao.test.ts` | T1 | novo: testes de texto do 013 |
| `supabase/functions/_shared/portas.ts` | T2 | `TipoDeChamada` ganha `'excluir'` |
| `supabase/functions/_shared/chamadas.ts` | T2 | `LIMITE_DE_CHAMADAS.excluir = 5` |
| `src/data/servidorChamadas.test.ts` | T2 | o limite novo |
| `supabase/functions/_shared/excluirConta.ts` | T3 | novo: o núcleo puro da função (a decisão e a ordem dos passos) e a leitura da hora da senha no token |
| `src/data/servidorExcluir.test.ts` | T3 | novo: o núcleo com o banco e a operadora de mentira (`servidorFalsos.test-utils.ts`) |
| `supabase/functions/_shared/exclusaoSupabase.ts` | T4 | novo: o lado de verdade (quem pede, administrador, armazenamento, apagar o login), com `npm:` |
| `supabase/functions/excluir-conta/index.ts` | T4 | novo: a ligação no Deno, com `npm:` |
| `src/data/servidorExcluirLigacao.test.ts` | T4 | novo: o texto da ligação e do lado de verdade |
| `testes/seguranca/exclusao.test.ts` | T5 | novo: a exclusão de ponta a ponta no Supabase local |
| `tsconfig.seguranca.json` | T5 | `paths` para o tipo do supabase-js importado por `npm:` e por `esm.sh` |
| `src/ui/estado/usarAssinatura.ts` | T6 | `chamar` passa a ser exportada (a leitura do erro da função, sem copiar) |
| `src/ui/contaExcluida.ts` (+ teste) | T6 | novo: o aviso de uma vez para a página inicial (armazenamento da aba) |
| `src/ui/estado/usarExclusaoDaConta.ts` (+ teste) | T6 | novo: confere a senha, chama a função e termina como "Sair" |
| `src/ui/config/baixarBackup.ts` (+ teste) | T7 | novo: o backup de Configurações, para a janela usar o mesmo |
| `src/ui/config/TelaConfiguracoes.tsx` | T7 | usa `baixarBackup` |
| `src/ui/conta/FormularioExcluirConta.tsx` | T7 | novo: o que há dentro da janela (lista, backup, senha, verificação, botões) |
| `src/ui/conta/DialogoExcluirConta.tsx` (+ teste) | T7 | novo: a janela |
| `src/ui/conta/TelaConta.tsx` (+ teste) | T8 | o bloco "Excluir conta" e a janela |
| `src/ui/AreaDeTrabalho.tsx` | T8 | passa `ehAdmin` |
| `src/ui/publico/AvisoContaExcluida.tsx` (+ teste) | T9 | novo: "Sua conta foi excluída." na página inicial |
| `src/App.tsx` | T9 | põe o aviso no topo da página inicial |
| `src/ui/publico/TelaPrivacidade.tsx`, `src/ui/publico/TelaTermos.tsx`, `src/domain/legal.ts`, `src/domain/legal.test.ts`, `src/ui/publico/legal.test.tsx` | T10 | os textos legais e a versão |
| `e2e/conta.spec.ts` | T11 | no modo local, Conta e plano não oferece excluir |

## 2. Tarefas

- [ ] **T1 — O banco (013).** Depende de nada.
  - Tabela `public.assinaturas_de_contas_excluidas` (id, `preapproval_id` único, plano, ciclo, `valor_centavos`,
    `ultima_cobranca_paga`, `encerrada_por`, `encerrada_em`, `excluida_em`), com RLS e sem acesso de `anon` e
    `authenticated` (CA-818, CA-824). Sem coluna de conta, nome, e-mail ou cartão.
  - A chave estrangeira de `assinaturas_historico` sai (procurada pelo tipo, num bloco `do`): sem ela, o histórico não
    some junto com o login, e o gatilho troca o código (CA-819).
  - Função `public.guardar_ao_excluir_conta()` (`security definer`, porque quem apaga o login é o papel do servidor de
    login) e gatilho `before delete on auth.users`: guarda a linha de `assinaturas` com `preapproval_id` no registro
    (`on conflict do nothing`, CB-252), troca o `nutricionista_id` do histórico por um `gen_random_uuid()` sorteado uma
    vez por conta, e apaga do registro o que passou de 5 anos (CA-825). Antes de apagar: as linhas de `assinaturas`
    ainda existem (a cascata das chaves estrangeiras roda depois).
  - A trava de `chamadas_da_cobranca.tipo` passa a aceitar `'excluir'` (D-256).
  - Tudo numa transação, com `notify pgrst` e as consultas de conferência no fim.
  - Teste: `src/data/sqlExclusao.test.ts` (idempotente, nada apagado fora das funções, transação, colunas sem dado
    pessoal, gatilho antes do delete, `security definer` com `search_path`, 5 anos, tipo `excluir`).
- [ ] **T2 — O limite de pedidos.** Depende de T1 (a trava do banco aceita o tipo novo).
  - `TipoDeChamada = 'cartao' | 'conferir' | 'excluir'`; `LIMITE_DE_CHAMADAS.excluir = 5` (CA-822).
  - Teste: `servidorChamadas.test.ts` (o limite e o 6º pedido barrado).
- [ ] **T3 — O núcleo `excluirConta`.** Depende de T2.
  - `horaDaSenha(jwt)`: a maior hora do `amr` do token (o token chega conferido pela porta da função, `verify_jwt`).
  - `excluirConta(pedido, deps)`: quem pede (`ninguem` → 401, CA-815; `apagada` → 200 "já excluída", CA-821) →
    corpo `{ acao: 'excluir' }` → senha há no máximo 10 minutos (CA-816; hora no futuro, de relógio adiantado, passa) →
    administrador (CA-817) → limite `excluir` (CA-822) → lê a assinatura e, paga e não cancelada, chama
    `gerenciarAssinatura({ acao: 'cancelar' })` sem mudar nada nela (CA-814, CB-251) → apaga os arquivos → apaga o
    login (CA-812). Falha em qualquer passo: 502 com a frase do CA-809 e nada depois dele roda (CA-821).
  - Teste: `src/data/servidorExcluir.test.ts`, com o cenário de mentira de `servidorFalsos.test-utils.ts` e uma porta
    de exclusão de mentira no próprio teste (ordem dos passos, cada falha, idempotência, 429, administrador).
- [ ] **T4 — A função no Deno.** Depende de T3.
  - `exclusaoSupabase.ts`: `quemPedeAExclusao` (o `getUser` com `user_not_found` vira `apagada`), `ehAdmin` (lê
    `administradores` com a chave de serviço; sem resposta, rejeita), `apagarArquivos` (lista a pasta da conta em
    `comprovantes` em páginas de 100, entra nas subpastas, apaga; CB-259), `apagarLogin` (`auth.admin.deleteUser`;
    `user_not_found` conta como feito, CB-252).
  - `excluir-conta/index.ts`: como `gerenciar-assinatura` (OPTIONS, POST, corpo até 64 KB antes de tudo, CA-823;
    as três variáveis de ambiente; falha inesperada 500 com a frase do CA-809), mas com `npm:@supabase/supabase-js@2.117.2`.
  - Teste: `src/data/servidorExcluirLigacao.test.ts` (texto, como `servidorLigacao.test.ts`).
- [ ] **T5 — No Supabase local.** Depende de T1 a T4.
  - `testes/seguranca/exclusao.test.ts`: contas de teste com link (com dieta), cópia, pedido de estudante, comprovantes
    (um numa subpasta), assinatura com cartão, histórico, reserva, tentativas e chamadas; o núcleo roda com o banco e a
    porta de verdade e uma operadora de mentira (o Mercado Pago nunca é chamado). Confere CA-812 a CA-826, CB-252 e
    CB-259, e que a outra conta e o administrador não mudam.
  - `tsconfig.seguranca.json` ganha `paths` para `npm:@supabase/supabase-js@*` e `https://esm.sh/@supabase/supabase-js@*`
    (só o tipo; o Vitest apaga `import type`).
- [ ] **T6 — O navegador chama a função.** Depende de T4.
  - `chamar` exportada de `usarAssinatura.ts`.
  - `contaExcluida.ts`: marca, lê e esquece o aviso no `sessionStorage` (sobrevive ao recarregar; outra aba não vê).
    Não é dado da conta: não entra em `CHAVES_DE_DADOS`.
  - `useExclusaoDaConta(conta, aoExcluida)`: um pedido por vez (CA-807); confere a senha com `conta.entrar` (com a
    verificação, CA-811), a não ser que já tenha conferido há menos de 9 minutos (CB-250); `credencial-invalida` vira
    "Senha incorreta." (CA-806); chama `excluir-conta`; 200 → para a nuvem, `conta.sair()` (apaga a cópia de trabalho
    e encerra a sessão), marca o aviso e chama `aoExcluida` (CA-808); 401 `login-antigo` → esquece a conferência e diz
    "Confirme sua senha de novo."; 403 e 429 → a frase do servidor (CA-801, CA-810); o resto → a frase do CA-809.
- [ ] **T7 — A janela.** Depende de T6. Antes, a skill `impeccable` e o `reference/craft-floor.md` dela.
  - `baixarBackup` sai de `TelaConfiguracoes` para um arquivo próprio, e as duas telas o usam (CA-804).
  - `DialogoExcluirConta` (a janela) e `FormularioExcluirConta` (dentro dela). A verificação contra robôs fica no
    formulário, que nasce com a janela aberta: o efeito do widget precisa da caixa já na página.
  - Teste: `DialogoExcluirConta.test.tsx` (CA-802 a CA-807, CA-809 a CA-811, CA-829 nos tamanhos de toque).
- [ ] **T8 — Conta e plano.** Depende de T7.
  - O último bloco de `TelaConta`: com sessão, o botão (CA-800); administrador, a frase sem o botão (CA-801).
  - `AreaDeTrabalho` passa `ehAdmin={perfilConta.ehAdmin}`.
  - Teste: `TelaConta.test.tsx`.
- [ ] **T9 — A página inicial depois de excluir.** Depende de T6.
  - `AvisoContaExcluida`: lê o aviso ao montar, esquece em seguida e mostra "Sua conta foi excluída." no topo, dentro
    da página (role `status`), até sair dela (CA-808).
  - `App.tsx` põe o aviso antes de `TelaInicio`.
- [ ] **T10 — Textos legais.** Depende de nada.
  - Política ("Por quanto tempo") e Termos ("Encerramento") como no D-257; `VERSAO_TERMOS = '2026-10-19'`,
    `DATA_TERMOS = '19 de outubro de 2026'` (CA-827, CA-828).
- [ ] **T11 — Ponta a ponta.** Depende de T8.
  - `e2e/conta.spec.ts`: no modo local, Conta e plano não mostra "Excluir conta" (CA-800).
- [ ] **T12 — Validação.** `npm run check`, `npx playwright test` (cópia da configuração numa porta própria),
  `npm run build`, os testes de ataque no Supabase local (uma pilha própria desta frente) e os prints.

## 3. Decisões do plano (para o dono revisar)

1. **O banco faz o D-253 sozinho, por gatilho.** O que fica guardado e a troca do código no histórico acontecem dentro
   do mesmo passo que apaga o login: ou tudo acontece, ou nada. Vale também para a exclusão feita no painel do
   Supabase (CA-826).
2. **A chave estrangeira do histórico sai.** Era ela que apagava o histórico junto com a conta. Sem ela, o histórico
   fica, e o gatilho tira dele o código da conta. Uma linha do histórico com o código de uma conta apagada antes do 013
   não existe: a cascata antiga já as apagou.
3. **A confirmação usa o login de sempre.** A janela chama a mesma entrada com senha da tela Entrar, que renova a
   sessão; o servidor lê a hora dessa entrada no token (`amr`). Nada de senha passando pela função.
4. **Os comprovantes saem pela API do armazenamento, antes do login.** Apagar o login não apaga os arquivos (conferido
   no Supabase local: o arquivo fica sem dono), e uma linha apagada direto do banco deixaria o arquivo para trás.
5. **O limite usa a tabela de chamadas da cobrança**, com o tipo `excluir`, em vez de uma tabela nova.
6. **O aviso da página inicial vai no armazenamento da aba (`sessionStorage`)**, porque a saída recarrega a página.

## 4. Riscos

- **R1** · A função nova usa `npm:@supabase/supabase-js@2.117.2`; as outras ainda usam `esm.sh` (outra frente
  migra). Ela reusa `criarBanco` de `bancoSupabase.ts`, que importa só o tipo do `esm.sh`. O Supabase não confere tipos
  ao publicar; quando a outra frente terminar, os dois apontam para o mesmo pacote. Se a versão lá mudar, esta muda
  junto.
- **R2** · O Deno não está nesta máquina: a função só roda pela primeira vez na publicação. O núcleo e o lado de
  verdade rodam no Node, contra o Supabase local (T5), e o `index.ts` é conferido pelo texto (T4).
- **R3** · Os da SPEC (R1 a R4).

## 5. Ordem de publicação

1. SQL `013` no SQL Editor (antes de tudo). Publicada antes dele, a função para no limite de pedidos e não apaga nada.
2. Função `excluir-conta`.
3. O site.

## 6. O que o dono confere no painel do Supabase

- Database › Triggers: `guardar_ao_excluir_conta` em `auth.users`, antes de apagar.
- Edge Functions › `excluir-conta`: "Verify JWT" ligado.
- Edge Functions › Secrets: `MERCADOPAGO_ACCESS_TOKEN` já existe (o mesmo das outras funções).
- Authentication › (Audit Logs): se o registro de auditoria é gravado no banco, ele guarda e-mail e endereço de internet
  de quem entrou, e isso não sai com a conta (SPEC, R4).
