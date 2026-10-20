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
| `e2e/exclusao-de-conta.spec.ts` | T11 | novo: no modo local, Conta e plano não oferece excluir; o aviso da página inicial aparece uma vez |

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
  - `tsconfig.seguranca.json` ganha `paths` para `npm:@supabase/supabase-js@*` e `https://esm.sh/@supabase/supabase-js@*`,
    apontando para o mesmo arquivo de tipos que `@supabase/supabase-js` usa (`dist/index.d.mts`): só o tipo; o Vitest
    apaga `import type`.
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
  - `e2e/exclusao-de-conta.spec.ts` (arquivo próprio, para não esbarrar nas outras frentes): no modo local, Conta e plano
    não mostra "Excluir conta" (CA-800); o aviso "Sua conta foi excluída." aparece no topo da página inicial e some ao
    recarregar (CA-808).
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
  de quem entrou, e isso não sai com a conta (SPEC, R4). *(Revisão de 19/10/2026: a rotina diária do 013 apaga os de
  mais de 6 meses, D-259.)*
- *(Revisão de 19/10/2026.)* Database › Extensions: `pg_cron` ligado (o 013 tenta ligar; se o SQL Editor recusar, ligue
  ali e rode o 013 de novo). Depois de um dia, a rotina precisa aparecer sem erro:
  `select status, return_message, start_time from cron.job_run_details where jobid = (select jobid from cron.job where jobname = 'metanutri-limpar-registros') order by start_time desc limit 5;`
  *(Integração de 20/10/2026, CB-318 da `integracao-rodada-1910`: o texto de antes dizia para desligar o registro de
  auditoria, o que não muda permissão nenhuma, e que "o resto da rotina continua valendo", o que era falso: o erro
  desfazia a rotina inteira.)* Agora, se o banco negar o apagamento de `auth.audit_log_entries`, a rotina avisa
  (`warning`) e segue, e as assinaturas de 5 anos continuam sendo apagadas. Para saber, a partir de abril de 2027:
  `select count(*) from auth.audit_log_entries where created_at < now() - interval '6 months';` tem que dar 0. Se não
  der, peça ao suporte do Supabase a permissão de apagar ali para o papel `postgres`.
- *(Revisão de 19/10/2026, SPEC R5.)* Authentication › Providers › Email: "Secure password change" e "Secure email
  change" ficam ligados.

### Excluir uma conta pelo painel do Supabase (pedido por e-mail)

*(Revisão de 19/10/2026.)* Pelo painel, o banco guarda o registro e fecha o histórico (CA-826), mas não fala com o
Mercado Pago nem com o armazenamento. Antes de apagar o usuário:

1. Cancele a assinatura dele no Mercado Pago (painel do Mercado Pago › Assinaturas, pelo código que está em
   `assinaturas.preapproval_id`). Sem isso, ele paga mais uma mensalidade antes de o aviso cancelar.
2. Em Storage › `comprovantes`, apague a pasta com o código da conta (`comprovantes/<código>`). Pelo painel ela fica
   para sempre: a limpeza de 30 dias parte dos pedidos, que somem junto com a conta.
3. Só então apague o usuário em Authentication › Users.

O jeito mais simples continua sendo a pessoa excluir pelo site, em Conta e plano: os três passos acontecem sozinhos.

## 7. Rodada de correção (revisão de segurança, 19/10/2026)

Da revisão `revisao-exclusao.md` (pronta com correções, nenhum achado Crítico ou Alto). Um commit por item, em TDD.

- [x] **C1 — M1, registros de acesso.** No 013: liga `pg_cron` (como o 014 da outra frente, `with schema pg_catalog`;
  o 013 não depende do 014), cria `public.limpar_registros_guardados()` (`security definer`, só o servidor) que apaga
  `auth.audit_log_entries` com mais de 6 meses, e agenda `metanutri-limpar-registros` todo dia. Testado no Supabase
  local (o papel `postgres` tem `delete` ali). A Política diz que os registros de acesso ficam 6 meses (D-259).
- [x] **C2 — L1, os 5 anos de verdade.** A mesma rotina apaga o registro de assinaturas com mais de 5 anos (CA-825).
- [x] **C3 — M2 e L8 (c).** O gatilho põe a linha "cancelada" de fechamento no histórico quando a assinatura não estava
  cancelada; o cabeçalho do 013 e a seção 6 dizem o que fazer antes de excluir pelo painel. Teste: excluir pelo painel
  uma conta ativa e conferir `receitaNoHistorico` antes e depois.
- [x] **C4 — L2.** As datas do registro (a) e do histórico da conta excluída ficam só com o dia; a Política diz "sem
  ligação direta".
- [x] **C5 — L4.** A exclusão segura a reserva de `assinando_agora` (solta a vencida, reserva, solta no fim); conta já
  reservada responde 409 com a frase `EM_ANDAMENTO`. A porta da exclusão ganha `reservar` e `soltarReserva`;
  `bancoSupabase.ts` não muda (L7: outra frente o migra).
- [x] **C6 — L5.** Falha depois de cancelar a assinatura responde a frase própria (CA-809) com o código
  `assinatura-cancelada`, e Conta e plano relê a assinatura. A janela diz que o tempo pago que falta se perde (CA-803).
- [x] **C7 — L6.** Antes de pedir a exclusão, o navegador anota no aparelho (`metanutri:exclusao-pedida`, fora de
  `CHAVES_DE_DADOS`) o código da conta. Um `SIGNED_OUT` que chega com essa anotação apaga a cópia de trabalho daquela
  conta; uma resposta do servidor (sim ou não) tira a anotação; ela vence em 1 dia. Passados 9 minutos, "Senha
  incorreta" só aparece se o servidor de login disser que a conta ainda existe; se não existe, termina como no CA-808.
- [x] **C8 — L8 (a) e (b).** No Supabase local: renovar a sessão mantém a hora da entrada no token; o token de uma conta
  com o código de outra no corpo exclui só a dona do token.
- **L7** fica como está (outra frente migra `bancoSupabase.ts` para `npm:@supabase/supabase-js@2.117.2`, a mesma versão).
- **L3** sem código: SPEC R5 e a seção 6.
