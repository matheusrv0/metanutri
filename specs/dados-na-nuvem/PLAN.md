# PLAN — Dados na nuvem, presos à conta

**Spec de origem:** `./SPEC.md` (commit 2178814, D-128 a D-134, CA-475 a CA-484, CB-123 a CB-126; CB-127 acrescentado na revisão final)
**Status:** concluído, com os ajustes antes do merge (08/10/2026)

## Abordagem

A linha da conta em `copias` vira a fonte da verdade, e o espaço da conta no navegador (spec `dados-por-conta`) vira a
cópia de trabalho. Um motor de sincronia, sem React (`src/domain/sincronia.ts`), abre a cópia da nuvem ao entrar, salva
sozinho 2 s depois da última mudança com conferência de versão (`update … where atualizado_em = <a que eu conheço>`) e,
quando outro aparelho salvou antes, lê, junta item por item e salva de novo. O único ponto por onde passa toda gravação
de dado da conta é o adaptador com prefixo: ele é embrulhado por um observador que marca a hora de cada item mudado e
registra cada exclusão (lápide), dentro da própria cópia (`metanutri:mudancas`). Assim nenhum repositório muda, e o
backup restaurado, os links e as configurações entram pelo mesmo caminho.

A alternativa óbvia, uma tabela por tipo de dado com sincronização por linha, pede SQL novo, RLS nova e reescrever
todos os repositórios; a cópia inteira com junção por item cumpre a spec com a tabela que já existe (sem SQL novo). A
área de trabalho só aparece depois da abertura; sem internet ela fica coberta por uma trava (diálogo modal da
biblioteca, sem fechar). Sem servidor de conta, nada disso liga: o modo local continua como hoje (e o e2e também).

## Arquivos

| Arquivo | Ação | Motivo |
|---|---|---|
| `src/ui/config/TelaConfiguracoes.tsx` (+ testes) | alterar | some a cópia na nuvem e o "Apagar tudo" (CA-482); textos que diziam "só neste aparelho" |
| `src/ui/config/apagarNaNuvem.test.tsx` | apagar | testava o "Apagar tudo", que saiu |
| `src/domain/copiaNaNuvem.ts` (+ teste) | reescrever | ler a cópia e gravar com conferência de versão; saem enviar, trazer e apagar |
| `src/domain/nuvemFalsa.test-utils.ts` | criar | a tabela `copias` de mentira, para o domínio e as telas |
| `src/domain/copiaDaConta.ts` (+ teste) | criar | montar, aplicar e juntar cópias; marcas de mudança e lápides |
| `src/domain/sincronia.ts` (+ teste) | criar | o motor: abrir, observar, salvar, conflito, travas, parar |
| `design-system/componentes/overlay/dialog.tsx`, `design-system/componentes/LEIA-ME.md` | alterar | `semFechar` no `DialogContent`, para a trava |
| `src/ui/estado/contextoNuvem.ts`, `src/ui/estado/ProvedorNuvem.tsx` (+ teste) | criar | o motor na árvore, com o armazenamento observado |
| `src/ui/nuvem/PortaoDaNuvem.tsx`, `src/ui/nuvem/TelaAbrindoDados.tsx` | criar | "Carregando seus dados…" e o CA-484 antes da área de trabalho |
| `src/ui/estado/ProvedoresDeDados.tsx` | alterar | remonta quando a nuvem traz mudança (geração) |
| `src/App.tsx`, `src/AppConta.test.tsx`, `src/AppNuvem.test.tsx` | alterar/criar | `ProvedorNuvem` e o portão; testes de ponta a ponta com a nuvem falsa |
| `src/ui/nuvem/SituacaoDaNuvem.tsx`, `src/ui/layout/Cabecalho.tsx`, `src/ui/layout/Estrutura.tsx` | criar/alterar | "Salvo" / "Salvando…" (CA-476) e o aviso do CA-445 ao reduzir |
| `src/ui/estado/usarConta.ts` (+ teste) | alterar | `sair()` sempre apaga a cópia de trabalho da conta (D-131) |
| `src/ui/estado/usarSaida.ts` (+ teste), `src/ui/conta/DialogoSair.tsx` (+ teste) | criar/reescrever | Sair sem pergunta; CA-479 só com mudança que não foi |
| `src/ui/conta/TelaConta.tsx` (+ teste), `src/ui/publico/conta/TelaCompletarCadastro.tsx` (+ teste), `src/ui/AreaDeTrabalho.tsx` | alterar | usam a saída nova |
| `src/ui/nuvem/TravaDaNuvem.tsx` (+ teste) | criar | a capa do D-130 e do CB-123, com "Sair" |
| `src/ui/estado/ProvedorPacientes.tsx` | alterar | a lista se refaz quando outra aba grava (CB-124) |
| `src/domain/conta.ts` (+ teste), `src/ui/publico/SecaoPrecos.test.tsx` | alterar | "Dados em qualquer aparelho" sai (D-134) |
| `README.md` | alterar | a cópia manual e o "tudo só neste navegador" deixaram de ser verdade (T16) |
| `src/ui/publico/TelaPrivacidade.tsx`, `src/ui/publico/TelaTermos.tsx`, `src/ui/casos/AvisoPrimeiroAcesso.tsx`, `src/ui/layout/MenuLateral.tsx`, `src/ui/ajuda/TelaAjuda.tsx`, `src/ui/publico/conta/LadoDoPlano.tsx`, `src/ui/negocio/TelaNegocio.tsx` (+ testes) | alterar | textos verdadeiros para o D-128 (DP-16) |

## Tarefas

- [x] **T1** — Este plano.
- [x] **T2** — Configurações sem os botões de apagar e da cópia na nuvem; backup em arquivo fica.
  - Depende de: —
  - Cobre: CA-482
  - Feito quando: teste do CA-482 (nenhum dos quatro botões; baixar e restaurar continuam) e os de backup verdes.
- [x] **T3** — `copiaNaNuvem.ts`: `lerCopia` e `gravarCopia` (insert sem linha; update com conferência; 0 linhas ou
  23505 = "mudou"; 413 ou trava de tamanho = "grande"; resto, sessão de outra conta e prazo = "rede").
  - Depende de: T2 (tira o último uso das funções antigas)
  - Cobre: base de D-129, D-132, CB-123
  - Feito quando: testes com a nuvem falsa para cada resultado.
- [x] **T4** — `copiaDaConta.ts`: montar a cópia (chaves do backup, aviso de primeiro acesso e marcas), aplicar na cópia
  de trabalho, registrar mudança (marca e lápide) e juntar duas cópias (DP-3, DP-4, DP-21), podando lápides de 90 dias.
  - Depende de: —
  - Cobre: CA-480, CA-481 (domínio)
  - Feito quando: testes de itens diferentes, mesmo item (mais novo vence), excluído não volta, mudado depois volta,
    produto com id repetido, sem marcas (dados de antes), lápide velha.
- [x] **T5** — `sincronia.ts`: observador, abertura, espera de 2 s, salvar com conferência, conflito, travas, `conectou`,
  `desconectou`, `reduzir`, `parar` e o aviso às outras abas.
  - Depende de: T3, T4
  - Cobre: CA-475 a CA-481, CA-484, CB-123 a CB-125 (motor)
  - Feito quando: um teste por critério, com relógio e nuvem falsos.
- [x] **T6** — `DialogContent` com `semFechar` (sem o X).
  - Feito quando: teste do componente e LEIA-ME.
- [x] **T7** — `ProvedorNuvem` e portão: o motor por conta, o armazenamento observado na árvore, "Carregando seus
  dados…", a tela do CA-484, a remontagem pela geração; `App` ligado. O link do paciente não espera.
  - Depende de: T5
  - Cobre: CA-475, CA-481, CA-484, CB-126 (telas)
  - Feito quando: testes do `App` com a nuvem falsa; os testes de antes verdes (sem cliente = modo de hoje).
- [x] **T8** — "Salvo" / "Salvando…" na barra da área de trabalho.
  - Depende de: T7
  - Cobre: CA-476
  - Feito quando: teste do `App`: muda, espera, a nuvem tem a mudança e a barra diz "Salvo".
- [x] **T9** — Só "Sair" (D-131): `sair()` sempre apaga a cópia de trabalho; `useSaida` salva o pendente antes e só
  pergunta (CA-479) se não der; TelaConta e Complete seu cadastro sem a pergunta de apagar.
  - Depende de: T7
  - Cobre: CA-478, CA-479
  - Feito quando: testes do gancho, do diálogo e das telas.
- [x] **T10** — Trava: capa do D-130 (sem internet) e do CB-123 (tamanho, com "Reduzir os dados"), com "Sair".
  - Depende de: T6, T9
  - Cobre: CA-477, CB-123 (telas), CA-479 (pela trava)
  - Feito quando: testes da trava e do `App` (cai a internet, volta, destrava sozinha).
- [x] **T11** — Pacientes se refazem com o evento `storage` (outra aba).
  - Cobre: CB-124 (tela)
- [x] **T12** — Preços sem "Dados em qualquer aparelho".
  - Cobre: CA-483
- [x] **T13** — Textos do D-128 (DP-16): Política, Termos, aviso de primeiro acesso, menu, Ajuda, cadastro, Negócio.
- [x] **T14** — Validação: `npm run check`, `npx playwright test`, `npm run build`, `node scripts/conferir-publicacao.mjs`.
- [x] **T15** — Revisão: na primeira junção, o empate sem marca fica com o lado usado por último (DP-3).
  - Cobre: CA-481
  - Feito quando: teste da cópia mandada à mão antes das configurações daqui e da cópia mais nova que elas.
- [x] **T16** — README: Configurações sem a cópia manual, os dados na nuvem, o Sair e o endereço novo.
  - Feito quando: o README não fala mais em enviar e trazer a cópia nem em "tudo só neste navegador" com conta.

### Rodada final (revisão de 08/10/2026)

- [x] **T17** — Spec e plano: CB-127; nota do CA-445 (lote 2) e do D-124 (`dados-por-conta`); CA-420, CA-423, CA-424 e
  CA-470 marcados como substituídos pelo D-131; DP-20 a DP-27.
- [x] **T18** — C1: conferir a nuvem depois de abrir (DP-20).
  - Cobre: CB-127
  - Feito quando: teste da aba esquecida (A aberto, B edita P e salva, A volta e edita outro campo de P: a edição de B
    continua) e da tela "Atualizando…".
- [x] **T19** — I1: o id novo de produto fica acima também dos ids de marcas e lápides, na junção e no repositório (DP-21).
  - Feito quando: nuvem 900000/900001 + lápide 900002 e daqui 900000/900001 próprios → nenhum produto some.
- [x] **T20** — I2: pendência desde o início com dados que nunca subiram; Sair pergunta antes de abrir e com migração
  incompleta; o dado sem prefixo não movido fica; clique duplo em "Sair mesmo assim" (DP-22).
- [x] **T21** — I2b: navegador cheio (DP-23).
  - Feito quando: aplicar que estoura → trava "sem espaço", a cópia juntada sobe da memória e a cópia de trabalho não
    fica em dia; aplicar remove antes de gravar; o contador vai antes do dado.
- [x] **T22** — I3: prazo pelo tamanho, pedido cancelado e versão conferida antes de reenviar (DP-24).
- [x] **T23** — I4: "Sair" nas telas antes de abrir; abertura única e protegida (DP-25).
- [x] **T24** — I5: textos, aviso único da nuvem e versão dos termos (DP-26).
- [x] **T25** — Menores (DP-27): conta que saiu; cópia vazia reabre; esconder e fechar a aba; restaurar só chaves de dados;
  sair sem internet; uma aba envia por vez; outra aba refaz produtos, modelos, busca e perfil; status; trava de tamanho.
- [x] **T26** — Validação: os quatro portões verdes e o relatório com a "Rodada final".

### Rodada de fechamento (revisão de 08/10/2026)

- [x] **T27** — Plano: DP-28 a DP-30.
- [x] **T28** — C1 pelo caminho sem internet (DP-28): a trava que sai sem nada pendente entra direto em "Atualizando…" e
  confere; travada, a conferência de 60 s continua marcada, e a de quem voltou para a aba fica para quando destravar;
  foco e visibilidade juntos fazem uma conferência só; a versão tem prazo fixo de 15 s.
  - Cobre: CB-127
  - Feito quando: A fica mais de 60 s sem internet, B renomeia P e salva, A volta: vê o nome de B antes de editar, e a
    edição de A noutro campo de P deixa o nome de B na nuvem.
- [x] **T29** — Cópia parcial dividida entre abas (DP-29).
  - Feito quando: duas abas no mesmo navegador cheio: a outra aba não sobe a cópia parcial, nem ao fechar; a nuvem
    fica com os 32 pacientes; recarregar com espaço deixa a cópia inteira e em dia.
- [x] **T30** — Trava entre abas com prazo e aviso de fechar sem a trava de espaço (DP-30).
- [x] **T31** — Política: o dado de antes que ainda não foi para a conta fica até a próxima entrada (DP-30).
- [x] **T32** — Validação e relatório ("Rodada de fechamento").

### Ajustes antes do merge (08/10/2026)

- [x] **T33** — Plano: DP-31.
- [x] **T34** — Voltar para a aba no meio da conferência de 60 s faz uma conferência nova, com capa (DP-31).
  - Cobre: CB-127
  - Feito quando: a versão lida pela de 60 s antes de B salvar não basta: a aba mostra o nome de B depois da capa.
- [x] **T35** — Abertura sem linha na nuvem com a cópia daqui parcial não sobe nada e trava sem espaço (DP-31).
- [x] **T36** — A aba travada sem internet que acha tudo salvo por outra aba destrava e confere (DP-31).
- [x] **T37** — Comentários da trava entre abas e do aviso de sair citam o DP-30.
- [x] **T38** — Validação, com as sondas do revisor.

## Mapa de cobertura

| Critério | Tarefa | Teste |
|---|---|---|
| CA-475 | T5, T7 | `sincronia.test.ts` "CA-475: …"; `AppNuvem.test.tsx` "CA-475: …" |
| CA-476 | T5, T8 | `sincronia.test.ts` "CA-476: …"; `AppNuvem.test.tsx` "CA-476: …" |
| CA-477 | T3, T5, T10 | `copiaNaNuvem.test.ts`, `sincronia.test.ts`, `TravaDaNuvem.test.tsx` e `AppNuvem.test.tsx` "CA-477: …" |
| CA-478 | T9 | `usarConta.test.ts`, `usarSaida.test.tsx`, `TelaConta.test.tsx` e `TelaCompletarCadastro.test.tsx` "CA-478: …" |
| CA-479 | T9, T10 | `DialogoSair.test.tsx`, `usarSaida.test.tsx` e `TravaDaNuvem.test.tsx` "CA-479: …" |
| CA-480 | T3, T4, T5 | `copiaNaNuvem.test.ts`, `copiaDaConta.test.ts` e `sincronia.test.ts` "CA-480: …" |
| CA-481 | T4, T5, T7, T15 | `copiaDaConta.test.ts` (dois), `sincronia.test.ts` (cinco) e `AppNuvem.test.tsx` "CA-481: …" |
| CA-482 | T2 | `configuracoes.test.tsx` "CA-482: …" |
| CA-483 | T12 | `conta.test.ts` e `SecaoPrecos.test.tsx` "CA-483: …" |
| CA-484 | T3, T5, T7 | `copiaNaNuvem.test.ts`, `sincronia.test.ts` e `AppNuvem.test.tsx` "CA-484: …" |
| CB-123 | T3, T5, T10 | `copiaNaNuvem.test.ts`, `sincronia.test.ts`, `TravaDaNuvem.test.tsx` e `AppNuvem.test.tsx` "CB-123: …" |
| CB-124 | T5, T11 | `sincronia.test.ts` e `provedoresPorConta.test.tsx` "CB-124: …" |
| CB-125 | T5 | `sincronia.test.ts` "CB-125: …" |
| CB-126 | T7, T10 | `AppNuvem.test.tsx` (dois) e `TravaDaNuvem.test.tsx` "CB-126: …" |
| CB-127 | T18, T28, T34 | `sincronia.test.ts` (dois: aba esquecida e sem internet; mais o DP-31 da conferência com capa), `AppNuvem.test.tsx` e `TravaDaNuvem.test.tsx` "CB-127: …" |

## Decisões do plano

- **DP-1 · A linha de `copias` é a fonte da verdade; o espaço da conta no navegador é a cópia de trabalho.** A cópia
  continua no formato do backup (formato 1), com duas chaves a mais: `metanutri:aviso-inicial-visto` (o aviso de
  primeiro acesso não volta a cada entrada) e `metanutri:mudancas` (marcas e lápides). Sem SQL novo: a tabela, a trava
  de 5 MB e as políticas de ler, inserir e atualizar já existem.
- **DP-2 · O ponto único é o adaptador da conta, embrulhado por um observador.** Toda gravação que muda um valor da
  cópia marca a hora de cada item mudado (`planos/<id>`, `pacientes/<id>`, `produtos/<id>`, `modelos/<id>`,
  `acompanhamentos/<id>`, `chave/<nome>`) ou registra a lápide de cada item que sumiu, e soma 1 em `metanutri:nuvem`
  (só do navegador: a versão conhecida da nuvem e os contadores de mudanças e de salvas, que as abas da mesma conta
  dividem). O que o próprio motor grava (a cópia que veio da nuvem) e a migração de antes não passam pelo observador.
- **DP-3 · Junção item por item (D-132, D-133).** Planos, pacientes, produtos, modelos e links juntam por id; o resto,
  chave por chave. Vence a hora de mudança mais nova (a marca; sem marca, a data do item: `atualizadoEm` ou `criadoEm`;
  sem nada, vazio). Mesmo valor nos dois lados não é conflito. Empate com valor diferente: vence a nuvem (a D-127 deu o
  empate à conta), salvo ao abrir com dados que ainda não subiram: aí fica o lado usado por último (a data mais nova da
  cópia daqui contra a da cópia da nuvem e a hora em que ela foi gravada), para a cópia mandada à mão há dias não passar
  por cima das configurações de hoje (achado na revisão, T15). A lápide igual ou mais nova que a última mudança do item o
  apaga; o item mudado depois da exclusão volta (a mudança mais nova vence). Lápides com mais de 90 dias saem da cópia. O
  índice dos planos é refeito com os planos que ficaram.
- **DP-4 · Produto com o mesmo id e `criadoEm` diferente são dois produtos** (cada aparelho dá o próximo número): os dois
  ficam, o da nuvem no id e o daqui com id novo acima do maior; planos, modelos e sugestões que vieram daqui passam a
  apontar para o id novo.
- **DP-5 · Salvar com conferência.** `update … where nutricionista_id = <conta> and atualizado_em = <versão conhecida>`.
  Nenhuma linha = outro aparelho salvou antes: lê, junta, grava na cópia de trabalho, remonta a área de trabalho e salva
  de novo (até 5 voltas; depois, tenta na próxima mudança). Sem linha na nuvem, `insert`; se outro aparelho criou antes
  (23505), a mesma volta. `atualizado_em` é escrito pelo aparelho e serve só de versão.
- **DP-6 · Abertura.** Com a cópia de trabalho sem mudança pendente, vale a da nuvem (substitui). Com mudança pendente,
  sem histórico neste navegador (dados de antes, D-133) ou com dados levados pela migração da `dados-por-conta`, as duas
  são juntadas e o resultado sobe. Sem linha na nuvem, o que está aqui sobe como está.
- **DP-7 · Tempo.** Salva 2 s depois da última mudança. Pedido que não responde em 15 s conta como falha de rede (a
  conferência de versão resolve o pedido que chegou depois).
- **DP-8 · Trava de rede.** Falha de rede, sessão ausente ou erro do servidor que não seja o tamanho travam com a frase
  do D-130; o motor tenta de novo no `online` e a cada 15 s, e destrava ao salvar. O evento `offline` trava mesmo sem
  pendência (CA-477); no `online` sem pendência, destrava.
- **DP-9 · CB-123 sem beco sem saída.** Travar a área sem deixar reduzir faria a pessoa perder o que não subiu ao sair
  (e dados de antes acima de 5 MB nunca subiriam). A trava de tamanho tem "Reduzir os dados": a capa sai, a frase do
  CA-445 fica no alto da área de trabalho, e cada tentativa recusada com a cópia maior que a última recusada trava de
  novo. Só reduzir não trava; a primeira cópia aceita destrava.
- **DP-10 · As travas têm "Sair".** Com a área coberta, é o único caminho até o CA-479.
- **DP-11 · Sair (D-131).** Com mudança pendente e sem trava, tenta salvar na hora e sai; só pergunta (CA-479) quando
  não deu. Antes de apagar, o motor para e marca em `metanutri:nuvem` que a conta saiu: as outras abas da conta param
  antes de ver o espaço sumir. Defesa a mais: o motor nunca envia uma cópia sem dado e sem lápide (seria a cópia apagada
  por fora, não pela pessoa). Depois de sair, a página recarrega, como no "Sair e apagar" de antes.
- **DP-12 · O que não espera a nuvem.** O link do paciente não espera a abertura nem trava (CB-126); as telas públicas e
  as de conta também não.
- **DP-13 · Espaços de outras contas guardados antes desta mudança ficam** até a dona entrar (aí sobem e saem no Sair):
  sem a sessão dela não dá para enviar, e apagar perderia dado (D-133).
- **DP-14 · Sem servidor de conta, ou sem o cliente do Supabase, tudo como hoje**: sem nuvem, sem trava, sem estado na
  barra, e Configurações também sem os botões que saíram.
- **DP-15 · Links de acompanhamento.** A tabela própria continua sendo a fonte deles; na cópia, a junção os trata como
  lista por id, e a marca "pendente" que vem da nuvem não é trazida (como no restaurar backup, CB-108).
- **DP-16 · Textos.** Mudam os que diziam que os dados ficam só no aparelho: Política (onde ficam, o que some ao sair),
  Termos, aviso de primeiro acesso, rodapé do menu, Ajuda, lado do plano no cadastro e rodapé do Negócio. O aviso, o
  menu e a Ajuda continuam com o texto de hoje no modo local. A versão dos termos fica `2026-10-08` (a mudança é do mesmo
  dia).
- **DP-17 · Barra.** "Salvando…" enquanto há mudança que ainda não foi (esperando os 2 s ou indo); "Salvo" quando não há;
  nada com a área travada.
- **DP-18 · Remontar.** Quando a nuvem traz mudança para a cópia de trabalho de uma área aberta (conflito), a área de
  trabalho remonta (`key` com uma geração) e os produtos da busca são registrados de novo. A outra aba da mesma conta
  vê pelo evento `storage`, como hoje (planos, links e, agora, pacientes).
- **DP-19 · Versão do plano.** O plano que a nuvem traz por cima de outro daqui ganha a versão maior + 1, para o aviso de
  "mudou em outra aba" (CB-08) continuar valendo.

- **DP-20 · Conferir a nuvem depois de abrir (C1, CB-127).** Quando a aba volta a ficar visível ou a janela volta ao foco,
  a área fica coberta por "Atualizando…" enquanto o motor lê só o `atualizado_em`; a cada 60 s sem pendência, confere sem
  cobrir. Se a nuvem mudou: sem pendência, a cópia da nuvem vale (remonta); com pendência, salva, e a conferência de
  versão junta. Sem isso, uma aba esquecida aberta mandava o plano inteiro velho por cima da edição do outro aparelho.
- **DP-21 · Id de produto nunca reaproveitado (I1).** O id novo fica acima do maior id da lista e dos ids que aparecem em
  marcas e lápides, dos dois lados na junção e no repositório.
- **DP-22 · Dado que nunca subiu conta como pendência (I2).** Dados sem histórico neste navegador, dados levados pela
  migração e migração incompleta contam como pendentes desde o início; antes de abrir, Sair pergunta (CA-479). Sair não
  apaga os dados sem prefixo que ainda não foram para a conta: eles ficam, com o dono marcado (refina o D-124). "Sair
  mesmo assim" ignora o segundo clique de um duplo clique.
- **DP-23 · Navegador cheio (I2b).** O contador da mudança é gravado antes do dado (a pendência fica guardada); aplicar
  remove as chaves velhas antes de gravar as novas; se não couber, a área trava com "O navegador está sem espaço para
  seus dados. Feche outras abas do MetaNutri e recarregue a página.", a cópia juntada sobe da memória (nunca a parcial
  daqui), nada mais é enviado, e a cópia de trabalho nunca é dada como em dia.
- **DP-24 · Prazo (I3).** 15 s mais 1 s a cada 50 KB da cópia (na leitura, pelo tamanho da última); o pedido que estoura é
  cancelado (`abortSignal`); depois de uma falha, antes de reenviar, o motor confere a versão.
- **DP-25 · Telas antes de abrir (I4).** "Sem internet…" e "formato" têm "Sair" (com a pergunta do CA-479 quando há dado
  que não subiu); a abertura é uma só por vez, e uma exceção vira "sem conexão" com nova tentativa.
- **DP-26 · Textos (I5).** Os textos da revisão, exatos; com conta, excluir um plano diz que some de todos os aparelhos.
  Quem já usava vê uma vez "Seus planos e pacientes agora ficam salvos na nuvem, presos à sua conta. Assim você abre tudo
  em qualquer aparelho." (guardado na conta; quem é novo não vê, porque o aviso de primeiro acesso já diz). A versão dos
  termos passa a `2026-10-08.2` (o texto mudou de novo no mesmo dia; a data mostrada continua "8 de outubro de 2026").
- **DP-27 · Menores.** A cópia de quem saiu não sobe; cópia sem itens e sem lápide por cima de nuvem com itens reabre
  ("Carregando seus dados…") em vez de ficar em "Salvando…"; ao esconder ou fechar a aba, o pendente é mandado, e o
  `beforeunload` avisa; restaurar backup aceita só as chaves de dados e os planos, e diz que vale para todos os aparelhos
  da conta; sair sem internet apaga a sessão local mesmo assim; uma aba envia por vez (`navigator.locks`, quando existe);
  produtos, modelos, busca e perfil se refazem quando outra aba grava; o estado anuncia só "Salvo"; a trava de tamanho
  só reenvia quando a cópia diminui.

- **DP-28 · Conferir ao destravar (C1 pelo caminho sem internet).** Quando a trava de rede sai sem nada pendente (o
  evento `online` ou a tentativa de 15 s), a capa "Atualizando…" entra no mesmo instante e a aba confere a nuvem antes
  de deixar editar. Travada, a conferência de 60 s não é feita, mas continua marcada; quem volta para a aba (foco ou
  visibilidade) com a área travada tem a conferência guardada para quando a trava sair, mesmo que saia por um salvar.
  Foco e visibilidade juntos dividem a mesma conferência, e a capa só sai quando ela termina. A leitura da versão tem
  prazo fixo de 15 s (é um pedido pequeno).
- **DP-29 · A cópia parcial é do navegador, não da aba.** Quando a cópia de trabalho não cabe, `metanutri:nuvem` ganha
  `parcial: true`, que toda aba confere antes de montar ou mandar uma cópia (e trava com a mensagem de espaço,
  inclusive ao fechar a aba); a marca só sai numa abertura que coube inteira. Enquanto a cópia daqui está parcial, a
  versão guardada não anda (a cópia juntada sobe com a versão da nuvem que ela juntou): um envio perdido de qualquer
  aba recebe "mudou" e junta, em vez de passar por cima.
- **DP-30 · Menores do fechamento.** A trava entre abas espera 20 s; sem ela, a ida segue e o motor confere a versão
  antes de mandar (uma aba congelada não prende as outras). A trava de espaço, que pede para recarregar, não faz o
  navegador perguntar se pode sair. A Política diz que os dados de antes que ainda não foram para a conta ficam neste
  navegador até a próxima entrada; a versão dos termos continua `2026-10-08.2`, porque essa versão ainda não foi
  publicada (ninguém aceitou o texto anterior a esta mudança com ela).

- **DP-31 · Ajustes antes do merge.** (a) A conferência com capa (a pessoa voltou para a aba) nunca aproveita uma
  conferência de 60 s já a caminho: entra na fila depois dela e lê a versão de novo; só outra com capa é dividida, e
  a capa só sai quando a última termina. (b) Abrir sem linha na nuvem com a cópia daqui marcada parcial não sobe a
  cópia: trava sem espaço. (c) Uma aba travada sem internet cujo salvar acha tudo já salvo (outra aba mandou) não
  fica presa: com internet, destrava e confere; sem, tenta de novo em 15 s.

## Riscos

- **R1** — Remontar a área quando a nuvem traz mudança (conflito ou conferência, DP-20) fecha diálogo e formulário
  abertos. Só acontece quando outro aparelho salvou; o que já foi gravado fica.
- **R2** — Relógio errado num aparelho decide errado a "mudança mais nova".
- **R3** — O navegador guarda uns 5 MB: perto do limite da nuvem, o armazenamento do navegador pode encher antes
  (o aviso de armazenamento cheio de hoje continua).
- **R4** — Restaurar um backup antigo marca os itens restaurados com a hora de agora: eles vencem a nuvem.
- **R5** — Linha apagada na nuvem por fora (exclusão da conta por e-mail) com uma sessão ainda aberta: a cópia de
  trabalho sobe de novo. Ao excluir uma conta, encerrar as sessões dela.
- **R6** — Lápide dura 90 dias: um aparelho com mudança pendente que ficou mais que isso sem abrir pode trazer de volta
  um item excluído no outro.
- **R7** — `apagarAcompanhamentosDaNuvem` fica sem uso (saiu com o "Apagar tudo"); fica para a exclusão de conta.

## Divergências para o dono decidir

- ~~**V1** — "Funciona sem internet" no Free e no rodapé público.~~ Resolvido na rodada final (DP-26).
- ~~**V2** — "O primeiro acesso em cada aparelho precisa de internet." no Entrar.~~ Resolvido na rodada final (DP-26).
- **V3** — `PRODUCT.md` ("funciona offline") e `AGENTS.md` ("a conta na nuvem é opcional", "funciona offline") são
  documentos do dono e não mudaram.
- **V4** — CB-123 diz "trava como no D-130 até a pessoa reduzir os dados"; a trava ganhou "Reduzir os dados" (DP-9),
  porque sem ele não há como reduzir.

## Validação

- [x] `npm run check` (lint + typecheck + testes): 160 arquivos, 2674 testes depois dos ajustes antes do merge (2671 na
  rodada de fechamento, 2659 na final, 2612 antes dela); o único aviso do lint é de antes (`MolduraPublica.tsx`)
- [x] Sondas 1 e 2 do revisor (`vt-rev3`, fora do repositório) passam
- [x] `npx playwright test`: 41
- [x] `npm run build`
- [x] `node scripts/conferir-publicacao.mjs`
- [x] Cada CA e CB com teste que cita o ID
- [x] Divergências spec × código listadas (acima e no relatório)
