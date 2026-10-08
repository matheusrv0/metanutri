# PLAN — Dados por conta no aparelho

**Spec de origem:** `./SPEC.md` (commit c8720d1, D-120 a D-126, CA-465 a CA-471, CB-120 a CB-122)
**Status:** concluído, com a rodada de fechamento da revisão (08/10/2026)

## Abordagem

Os dados da pessoa continuam no `localStorage`, mas cada conta ganha um espaço próprio: um adaptador da interface
`Armazenamento` põe `metanutri:conta:<id>:` na frente de cada chave e, ao listar, devolve só as chaves daquela conta,
com o nome original. Tudo o que lê ou grava dado da pessoa passa a receber esse adaptador (por um contexto do React),
então backup, cópia na nuvem e repositórios seguem usando os nomes de sempre (`metanutri:casos`…) sem saber da conta.
Ao entrar, os dados de antes desta mudança (chaves sem prefixo) vão para o espaço de quem é dono deles (D-123).

A parte que mostra dado (provedores, área de trabalho e link do paciente) é remontada quando a conta muda, com o
armazenamento escolhido no mesmo render em que a sessão chega: não existe um quadro com a conta anterior (CB-120). A
alternativa óbvia, trocar o repositório dentro dos provedores sem remontar, deixaria estado antigo em telas que guardam
cópia local (formulários, modelos, produtos, sugestões, o plano aberto), e cada uma teria de ser lembrada. As telas de
conta (Entrar, código, troca de senha) ficam fora da parte remontada, porque a sessão chega no meio do fluxo delas (DP-11).

## Arquivos

| Arquivo | Ação | Motivo |
|---|---|---|
| `src/domain/persistencia.ts` | alterar | tipo `ArmazenamentoListavel` (o `localStorage` com `length`/`key`) |
| `src/domain/armazenamentoDaConta.ts` (+ teste) | criar | o adaptador com prefixo por conta |
| `src/domain/donoDosDados.ts` (+ teste) | reescrever | migração dos dados antigos e apagar só a conta que sai; sai o "conflito" |
| `src/ui/estado/armazenamentoLocal.ts` | alterar | devolve o tipo listável |
| `src/ui/estado/contextoArmazenamento.ts` | criar | contexto + `useArmazenamento()` (sem provedor: o do aparelho, como hoje) |
| `src/ui/estado/armazenamentoDaSessao.ts` (+ teste) | criar | escolhe o armazenamento da sessão e troca o que fica em memória (produtos, ocultos) |
| `src/ui/estado/ProvedorArmazenamento.tsx` (+ teste) | criar | dá à árvore o armazenamento da sessão, sem remontar nada |
| `src/ui/estado/ProvedoresDeDados.tsx` | criar | os três provedores de dados, remontados quando a conta muda (T6b) |
| `src/ui/AreaDeTrabalho.tsx` | criar | as telas que mostram dado da conta saem do `App` para dentro dos provedores de dados (T6b) |
| `src/ui/estado/ProvedorCasos.tsx`, `ProvedorPacientes.tsx`, `ProvedorAcompanhamentos.tsx` | alterar | leem do contexto; o aviso de outra aba entende a chave com prefixo |
| `src/ui/estado/ocultosGlobais.ts`, `src/ui/adequacao/GavetaCobrir.tsx` | alterar | recebem o armazenamento; a memória de reserva esquece a conta anterior |
| `src/ui/modelos/DialogoModelos.tsx`, `src/ui/config/TelaConfiguracoes.tsx`, `src/ui/casos/AvisoPrimeiroAcesso.tsx`, `src/ui/estado/usarSugestoes.ts`, `src/ui/exportar/DialogoImprimir.tsx`, `src/ui/exportar/FolhaDieta.tsx`, `src/ui/produtos/TelaProdutos.tsx`, `src/ui/estado/usarPerfilConta.ts` | alterar | leem o armazenamento do contexto |
| `src/main.tsx` | alterar | os produtos deixam de ser lidos na abertura, antes de haver sessão |
| `src/ui/config/dadosPorConta.test.tsx` | criar | CA-470 na tela de Configurações |
| `src/ui/estado/usarConta.ts` (+ teste) | alterar | "Sair e apagar" apaga só a conta que sai (D-124) |
| `src/App.tsx`, `src/AppConta.test.tsx` | alterar | `useConta` sobe para `App`; árvore por conta; sai o caminho do conflito |
| `src/ui/publico/conta/TelaOutraConta.tsx` | apagar | D-122 |
| `src/ui/publico/TelaTermos.tsx` | alterar | a frase sobre "sair ou apagar" deixa de ser verdade (DP-9) |
| `specs/estilo-spora/SPEC.md`, `specs/seguranca-lote-1/SPEC.md` | alterar | nota: CA-152/CA-153 substituídos pelo D-122; D-96 refinado pelo D-124 |

## Tarefas

- [x] **T1** — Adaptador `armazenamentoDaConta(base, usuarioId)`: `getItem`/`setItem`/`removeItem` com prefixo;
  `length`/`key(i)` listam só as chaves da conta, sem o prefixo; `clear()` apaga só as da conta; `chaveOriginal()`
  traduz a chave de um evento `storage`.
  - Depende de: —
  - Cobre: base de D-120, D-125
  - Feito quando: testes de prefixo, listagem, isolamento entre duas contas, `removeItem`/`clear` só da conta,
    chaves do aparelho e da sessão intocadas, backup com nomes originais.
- [x] **T2** — `migrarDadosSemConta(base, usuarioId)` e `apagarDadosDaConta(base, usuarioId)` em `donoDosDados.ts`
  (as funções antigas ficam até a T6, que tira o último uso).
  - Depende de: T1
  - Cobre: CA-467, CA-468, CA-469, CB-121 (domínio)
  - Feito quando: testes da migração com dono = quem entra, dono = outra conta, sem dono, cru e da conta juntos
    (conflito), cópia interrompida, rodar duas vezes, armazenamento que falha; apagar só a conta que sai.
- [x] **T3** — Contexto `useArmazenamento()`, `armazenamentoDaSessao()` e `ProvedorArmazenamento`: sem sessão ou sem
  servidor, o armazenamento do aparelho; com sessão, migra e devolve o da conta; registra os produtos da conta na busca e
  esquece os ocultos em memória da anterior. Os ocultos (e a GavetaCobrir, único
  uso) já passam a receber o armazenamento aqui, porque o teste da troca em memória usa a função nova.
  - Depende de: T2
  - Cobre: CB-121 (sessão), base de CB-120
  - Feito quando: testes da escolha (com e sem sessão, sem servidor, navegador bloqueado) e dos produtos por conta.
- [x] **T4** — Todo leitor de dado da pessoa usa `useArmazenamento()`: os três provedores (com o evento `storage`
  traduzido), DialogoModelos, Configurações (backup, nuvem, apagar), AvisoPrimeiroAcesso,
  sugestões, impressão, folha da dieta, produtos, perfil da conta.
  - Depende de: T3
  - Cobre: CA-470, CB-122 (aviso por conta)
  - Feito quando: teste de Configurações com duas contas (baixar, restaurar, enviar e trazer da nuvem só da conta
    que está dentro) e do aviso de primeiro acesso por conta; o resto da suíte continua verde (sem provedor = aparelho).
- [x] **T5** — `sair({ apagarDoAparelho: true })` apaga só os dados da conta da sessão.
  - Depende de: T2
  - Cobre: CA-469
  - Feito quando: teste do gancho com A e B no aparelho: só A some; tema e dados de B ficam; "Só sair" não apaga nada.
- [x] **T6** — `App`: `useConta` uma vez, em `App`; `ProvedorArmazenamento` com o id da conta por fora dos
  provedores; `main.tsx` deixa de registrar produtos na abertura (passa a ser do provedor, junto com a conta; antes
  da T6 ninguém mais os registraria); sai `situacaoAoEntrar`/`registrarDono`/`apagarDadosDoAparelho`, a tela `TelaOutraConta` e os testes
  CA-151 a CA-153 (trocados pelos novos).
  - Depende de: T3, T4, T5
  - Cobre: CA-465, CA-466, CA-467, CA-468, CA-471, CB-120, CB-122
  - Feito quando: testes do `App` com a troca de conta na mesma aba e a tela de outra conta ausente.
- [x] **T6b** — Só a área de trabalho remonta (DP-11): `ProvedorArmazenamento` só dá o contexto; `ProvedoresDeDados`
  (com a `key`) envolve os três provedores e a nova `AreaDeTrabalho`, que recebe do `App` as rotas de trabalho e o
  link do paciente. Achado na revisão da T6: com tudo remontando, a sessão de recuperação que chega depois do código
  recomeçava a tela da troca de senha e perdia o erro e o código já aceito.
  - Depende de: T6
  - Cobre: CB-120 (troca direta de conta), DP-11
  - Feito quando: teste do `App` com a sessão chegando no meio da troca de senha, e com a troca direta de A para B.
- [x] **T7** — Termos sem "precisa sair ou apagar os dados do aparelho".
  - Depende de: T6
  - Cobre: D-122 (texto)
  - Feito quando: a frase sai e os testes de Termos continuam verdes.
- [x] **T8** — Notas nas specs `estilo-spora` (CA-152/CA-153 → D-122) e `seguranca-lote-1` (D-96 → D-124).
  - Depende de: T6
  - Feito quando: as duas notas no lugar.

### Rodada final (revisão de 08/10/2026)

- [x] **T9** — Spec e plano: D-127, CA-472 a CA-474, textos do D-124; DP-5, R1 e R3 revistos; DP-12 a DP-17.
- [x] **T10** — Conflito junta, nunca esconde (D-127, DP-5): `donoDosDados.ts` resolve chave por chave e nunca sai cedo.
  - Cobre: CA-472
  - Feito quando: teste da aba antiga que grava depois da migração e de "uma chave em conflito não impede as outras";
    sai o teste que travava o comportamento antigo.
- [x] **T11** — Espaço cheio (DP-12): cada plano movido entra no índice na hora; `QuotaExceededError` libera a chave
  crua e tenta de novo na mesma tarefa; o resultado sobe pelo contexto e a área de trabalho mostra o aviso do CA-473.
  - Cobre: CA-473
  - Feito quando: falha no meio → a conta vê os planos movidos (com índice) e o aviso; perto do limite → avança.
- [x] **T12** — Nuvem por conta (DP-13): as funções da nuvem recebem a conta esperada; o provedor confere se ainda está
  montado depois de cada espera.
  - Cobre: CA-474
  - Feito quando: a leitura começa como A, a sessão vira B no meio: nenhum envio como B e nada gravado no espaço de A.
- [x] **T13** — "Apagar tudo" de Configurações com conta usa `apagarDadosDaConta` (DP-14); sem servidor, como hoje.
  - Feito quando: planos fora do índice, aviso de primeiro acesso e `frequentes` somem.
- [x] **T14** — Textos do D-124 (Configurações, Sair, Política, Sugestões), sem contar que outra conta usa o aparelho.
- [x] **T15** — Troca direta de conta numa tela de trabalho vai para o painel (DP-15); comentários sobre o `useMemo`
  idempotente e o custo de listar por índice.
- [x] **T16** — Versão dos termos e da política `2026-10-08` ("8 de outubro de 2026"): a Política mudou na T14 e o ramo
  sai nesse dia. O passo do lote 3 nas pendências, que confere "Versão de 7 de outubro de 2026", fica como registro
  daquele lote; no README ele deixa de fixar uma data (T22).

### Rodada de fechamento (revisão de 08/10/2026)

- [x] **T17** — Spec e plano: D-127 refinada; DP-5, DP-16 e R4 revistos; DP-18 a DP-21.
- [x] **T18** — Junção por id sem apagar o que perde (D-127, DP-16, DP-20): pacientes pela data; produtos e modelos com
  id novo; acompanhamentos pendentes de fora.
  - Feito quando: a edição de paciente da aba antiga aparece (CA-472); produto e modelo diferentes no mesmo id ficam os dois.
- [x] **T19** — O plano entra no índice antes de ser movido; no conflito em que o da conta é mais novo, o id dele também (DP-21).
- [x] **T20** — O aviso do CA-473 só para o dono do que sobrou (DP-18).
- [x] **T21** — Configurações com a conta esperada nas chamadas da nuvem (DP-19, CA-474).
- [x] **T22** — README sem fixar a data da versão; comentário do DP-8 em Configurações trocado pelo DP-14.

## Mapa de cobertura

| Critério | Tarefa | Teste |
|---|---|---|
| CA-465 | T6 | `AppConta.test.tsx` "CA-465: …" |
| CA-466 | T6 | `AppConta.test.tsx` "CA-466: …" |
| CA-467 | T2, T6 | `donoDosDados.test.ts` "CA-467: …"; `AppConta.test.tsx` "CA-467: …" |
| CA-468 | T2, T6 | `donoDosDados.test.ts` "CA-468: …"; `AppConta.test.tsx` "CA-468: …" |
| CA-469 | T2, T5 | `donoDosDados.test.ts` "CA-469: …"; `usarConta.test.ts` "CA-469: …" |
| CA-470 | T1, T4 | `armazenamentoDaConta.test.ts` "CA-470: …"; `dadosPorConta.test.tsx` "CA-470: …" |
| CA-471 | T6 | `AppConta.test.tsx` "CA-471: …" |
| CB-120 | T3, T6, T6b | `AppConta.test.tsx` "CB-120: …" (duas); `ProvedorArmazenamento.test.tsx` "CB-120: …" |
| CB-121 | T2, T3 | `donoDosDados.test.ts` "CB-121: …"; `armazenamentoDaSessao.test.ts` "CB-121: …" |
| CB-122 | T4, T6 | `dadosPorConta.test.tsx` "CB-122: …"; `AppConta.test.tsx` "CB-122: …" |
| CA-472 | T10 | `donoDosDados.test.ts` "CA-472: …"; `AppConta.test.tsx` "CA-472: …" |
| CA-473 | T11 | `donoDosDados.test.ts` "CA-473: …"; `AppConta.test.tsx` "CA-473: …" |
| CA-474 | T12 | `nuvemPorConta.test.tsx` "CA-474: …"; `fonteSupabase.test.ts` "CA-474: …" |

## Decisões do plano

- **DP-1 · Nome das chaves.** `metanutri:conta:<id>:` + o resto da chave original (`metanutri:casos` →
  `metanutri:conta:<id>:casos`). O id passa por `encodeURIComponent`, então o prefixo de uma conta nunca é começo do
  de outra. Chave fora de `metanutri:` é recusada com erro (nenhum código usa). Backup e cópia na nuvem continuam com o
  nome original: um backup de uma conta restaura em outra conta ou em outro aparelho.
- **DP-2 · O que é da pessoa e o que é do aparelho.** Da pessoa (vai para o espaço da conta): `CHAVES_DE_DADOS`
  (casos, pacientes, produtos, modelos, perfil, sugestões ocultas, acompanhamentos, sugestões por refeição, perfil da
  conta, impressão), todo `metanutri:caso:<id>` do aparelho (não só os do índice), `metanutri:aviso-inicial-visto`
  (CB-122) e `metanutri:frequentes` (chave antiga, sem uso, mas é da pessoa). Do aparelho (fica como está): tema,
  e-mail pendente, destino pendente, `metanutri:dono`, `metanutri:teste` e a sessão do Supabase (`sb-…`), que nunca é
  lida nem apagada aqui.
- **DP-3 · Sem servidor de conta (CA-150) ou sem sessão: chaves sem prefixo, como hoje.** Sem sessão, o portão já
  fecha as telas de trabalho; o link do paciente continua guardando a cópia no aparelho para abrir sem internet.
- **DP-4 · Migração chave por chave, não "copiar tudo e depois apagar".** Para cada chave: copia, confere e só então
  apaga a crua. Em nenhum momento a chave some dos dois lugares ao mesmo tempo, então fechar o navegador no
  meio não perde nada, e a próxima entrada termina o serviço. Copiar tudo antes dobraria o espaço ocupado de uma vez: com
  logo e muitos planos, o `localStorage` (cerca de 5 MB) estoura no meio e nada é movido.
- **DP-5 · Conflito: junta chave por chave, nunca esconde (D-127; substitui o "nada se move" da primeira rodada).**
  Valor igual nos dois lados é cópia interrompida e segue. Com valor diferente: o índice `metanutri:casos` junta os ids
  (a ordem da conta primeiro, depois os de fora que faltam); um plano `metanutri:caso:<id>` diferente fica nos dois
  (o mais novo pelo `atualizadoEm` fica com o id; o outro ganha id novo, `crypto.randomUUID()` como o app já gera, e entra
  no índice); listas com id juntam por id (refinado na T18): no mesmo paciente fica o mais novo pelo `atualizadoEm`
  (sem data, ou na mesma data, o da conta); produto ou modelo diferente com o mesmo id fica nos dois, o da conta no id e o
  de fora com id novo (produto: acima do maior id, como o repositório gera; modelo: `crypto.randomUUID()`); o mesmo link
  de acompanhamento fica com o da conta, salvo quando só o de fora está pendente de nuvem (DP-20), e cada item leva as
  próprias marcas; configurações (perfil, impressão, perfil da conta,
  sugestões por refeição, aviso de primeiro acesso, `frequentes`) ficam com o valor da conta e a cópia crua sai;
  sugestões ocultas viram a união. Valor cru que o app não consegue ler fica fora (a conta mantém o dela); valor da conta
  ilegível dá lugar ao cru.
- **DP-6 · `metanutri:dono` fica depois da migração** (o pedido dizia apagar). É gravado antes da primeira cópia e
  continua lá: se uma aba ainda na versão anterior do site (o app é PWA) gravar chaves sem prefixo depois, elas vão
  para o dono, e não para a próxima conta que entrar. Sai só quando o dono escolhe "Sair e apagar os dados deste
  aparelho", junto com os dados dele.
- **DP-7 · Os dados e a área de trabalho são remontados a cada conta** (`key` com o id). Produtos registrados na
  busca e sugestões ocultas em memória (estado de módulo) trocam no mesmo render.
- **DP-8 · "Apagar todos os dados deste aparelho" (Configurações) apaga só os da conta que está dentro** (D-121:
  trocar de conta não apaga nada de outra). O texto do botão continua o mesmo; fica para o dono decidir se muda.
- **DP-9 · Termos.** "Se outra conta entrar no mesmo aparelho, ela não vê os seus dados: precisa sair ou apagar os
  dados do aparelho." perde a segunda parte, que deixou de ser verdade (D-122). Só sai texto; nada novo é escrito.
  Como a rodada final (T14) também muda a Política e o ramo sai em 08/10/2026, a versão dos termos e da política passa
  a ser `2026-10-08` ("Versão de 8 de outubro de 2026", T16).
- **DP-10 · "Sair e apagar" sem sessão não apaga nada:** não há conta saindo.
- **DP-11 · As telas de conta ficam fora da parte remontada.** A troca de senha por código confere o código (a sessão
  de recuperação chega aqui) e só depois grava a senha; remontando junto, a tela perdia o erro da gravação e o código já
  aceito, e a nova tentativa caía em "código inválido". Com servidor de conta e sem sessão, a área de trabalho só monta
  para o link do paciente (com os dados do aparelho, DP-3); nas telas de trabalho o portão mostra Entrar antes.

- **DP-12 · Espaço cheio (CA-473).** Cada chave: se gravar com prefixo estourar (`QuotaExceededError`), na mesma
  tarefa síncrona o valor fica em memória, a chave crua sai e a com prefixo é gravada; se ainda assim falhar, a crua é
  regravada (cabe, porque o espaço acabou de ser liberado). Cada plano movido entra no índice da conta na hora. A migração
  não para na primeira falha; sobrando chave crua, o resultado é `incompleto`, sobe pelo contexto e a área de trabalho
  mostra o aviso do CA-473.
- **DP-13 · Nuvem por conta (CA-474).** As funções da nuvem recebem a conta esperada e falham (sem pedir nada) quando a
  sessão é de outra; o provedor de acompanhamentos tem uma marca de "montado" que cai ao desmontar e é conferida depois
  de cada espera, antes de gravar no aparelho ou enviar.
- **DP-14 · "Apagar todos os seus dados deste aparelho" (Configurações), com conta, apaga o espaço inteiro da conta**,
  igual ao "Sair e apagar" (planos fora do índice, aviso de primeiro acesso, `frequentes`). Substitui o DP-8. Sem
  servidor de conta, segue o caminho de hoje (as chaves de dados sem prefixo).
- **DP-15 · Trocar de conta direto (A → B na mesma aba) numa tela de trabalho leva ao painel**, em vez de deixar no
  endereço o plano ou o paciente de A.
- **DP-16 · Produto diferente com o mesmo id fica nos dois** (substitui "fica o da conta"): o da conta continua no id
  e o de fora ganha id novo, acima do maior id da lista, como o repositório de produtos gera. Nenhum produto some. As
  referências dos planos não são remapeadas, porque não dá para saber qual produto o plano de uma aba antiga quis dizer
  (R4).
- **DP-17 · Fechar o navegador no meio de um conflito de plano pode deixar uma cópia a mais** do plano mais velho (com
  outro id). Nunca perde dado.
- **DP-18 · O aviso do CA-473 é só do dono dos dados que sobraram.** Se o que não coube é de outra conta (o dono é
  outro), quem entrou não vê aviso nenhum: para ela, nada ficou para trás.
- **DP-19 · Configurações também usa a conta esperada na nuvem** (CA-474): enviar e trazer a cópia, e apagar a cópia e
  os acompanhamentos, só pedem algo com a sessão da conta que está dentro.
- **DP-20 · Acompanhamentos: no mesmo link, fica o da conta, salvo quando só o de fora está pendente de nuvem.** Dar id
  novo a um link duplicaria o token que o paciente tem na mão. A nuvem é a fonte desses links e, na próxima leitura, vale
  o que está nela (CB-105); a única cópia que pode existir só no aparelho é a mudança pendente, e ela é a que fica.
- **DP-21 · O plano entra no índice da conta antes de ser movido** (substitui "depois", da T11). Se o índice não couber,
  nada é movido; se o plano não couber, o índice aponta para um plano que ainda não chegou e que a lista ignora até a
  próxima entrada. Assim nenhum plano movido fica fora do índice.

## Riscos

- **R1** — Aba aberta com a versão anterior grava chaves sem prefixo depois da migração → na próxima entrada vão para
  o dono (DP-6) e são juntadas ao que a conta já tem (DP-5, CA-472).
- **R2** — Leitura da nuvem em andamento que termina depois de "Sair e apagar" grava de volta no espaço da conta que
  saiu (a página recarrega logo em seguida). Já acontecia com as chaves sem prefixo.
- **R3** — `localStorage` cheio no meio da migração → move o que couber (DP-12), mostra o aviso do CA-473 e tenta o
  resto na próxima entrada; a conta vê exatamente o que foi movido, com os planos no índice.
- **R4** — Um plano criado numa aba antiga, usando um produto criado nessa mesma aba antiga, continua apontando para o
  produto da conta com aquele id (o produto da aba antiga ganha id novo e fica na lista, DP-16). Os números do plano
  podem sair do produto errado até a pessoa trocar o alimento.

## Validação

- [x] `npm run check` (lint + typecheck + testes)
- [x] `npx playwright test`
- [x] `npm run build`
- [x] Cada CA e CB com teste que cita o ID
- [x] Divergências spec × código listadas no relatório
