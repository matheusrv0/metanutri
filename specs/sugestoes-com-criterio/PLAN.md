# PLAN — Sugestões com critério

> **Atualizado pela `vitaminas-usda` (20/10/2026):** onde este plano diz "16" nutrientes ou linhas, a adequação hoje tem 21.

Lê `specs/sugestoes-com-criterio/SPEC.md`. Status: **pedido pelo dono em 15/10/2026; aprovação pelas telas antes de
publicar.** Cada tarefa é um commit, em TDD: o teste primeiro, visto falhando, depois o código.

## Arquivos, na ordem

| Tarefa | Cria | Altera |
|---|---|---|
| T1 | `specs/sugestoes-com-criterio/SPEC.md`, `PLAN.md` | — |
| T2 | `src/domain/prescritivel.ts`, `src/domain/prescritivel.test.ts` | — |
| T3 | — | `src/domain/cobrir.ts`, `src/domain/cobrir.test.ts` |
| T4 | — | `src/domain/trocas.ts`, `src/domain/trocas.test.ts` |
| T5 | — | `src/domain/sugestoes.test.ts`, `src/domain/busca.test.ts` |
| T6 | — | `specs/sugestoes-com-criterio/SPEC.md` (Apêndice B), `PLAN.md` (validação) |

Nenhum arquivo de interface muda: o texto da chave continua certo (D-191) e a mensagem do CA-656 sai do domínio.
Nenhuma dependência nova.

## T1 · docs: SPEC e PLAN

Commit dos dois antes de qualquer código.

## T2 · feat(dominio): regra "prescritível"

- `prescritivel.ts` exporta:
  - `type NivelPrescricao = 'nunca' | 'fora-da-rotina' | 'ingrediente'`;
  - `REGRAS_PRESCRICAO`: lista de regras, cada uma com `id`, `nivel`, `titulo` (o motivo do Apêndice A) e `casa(alimento)`;
  - `regraQueExclui(alimento)`: a regra de nível mais grave que pega o alimento, ou `null`;
  - `ehPrescritivel(alimento, { incluirIngredientes })`: `true` sem regra; com regra, só quando o nível é
    `ingrediente` e a chave está ligada;
  - `ehDeUsoComum(alimento)`, que sai de `cobrir.ts` para cá, com jurubeba e jamelão na lista de pouco usual (D-197).
- As regras do nível `ingrediente` levam o CA-36a de hoje (Miscelâneas, pó, farinha, versão crua) e as formas novas
  do D-191. A exceção da farinha láctea sai (ela passa a ser ultraprocessado).
- Testes (`prescritivel.test.ts`): um caso por regra com um alimento real da base (CA-650, CA-651, CA-653); a chave
  libera só o nível `ingrediente` (CA-652); os casos de borda da seção 2.1 que ficam prescritíveis (café, requeijão,
  cuscuz, tapioca com manteiga, pão de queijo assado, sardinha em óleo, cream cracker, batata-doce cozida, couve
  manteiga, alho-poró); a contagem por motivo e o total de 293 (CA-664); `ehDeUsoComum` com jurubeba e jamelão.
- Verificação: `npx vitest run src/domain/prescritivel.test.ts`.

## T3 · feat(cobrir): sugestões passam pela regra

Depende de T2.

- `cobrir.ts`: troca `ehSugerivel` por `ehPrescritivel(alimento, { incluirIngredientes })`; descarta infusão (café e
  chá) como fonte (D-193); mensagem nova quando nada sobra (D-195); importa `ehDeUsoComum` de `prescritivel.ts`.
  `ehSugerivel` deixa de existir.
- Testes (`cobrir.test.ts`): os de CA-36a passam a importar de `prescritivel.ts` e "Pescada, filé, com farinha de
  trigo, frito" e "Farinha, láctea" mudam de lado; novos: CA-650 (cerveja nunca, com a chave ligada ou não, base
  controlada e TACO), CA-651, CA-652, CA-654 (infusão), CA-656 (mensagem), CA-657 (plano de exemplo e plano vazio, 16
  micronutrientes). A ordem (CA-655) segue coberta pelos testes de CA-35, CA-36 e uso comum que já existem.
- Verificação: `npx vitest run src/domain/cobrir.test.ts src/ui/adequacao`.

## T4 · feat(trocas): trocas passam pela regra

Depende de T2.

- `trocas.ts`: o filtro dos pares troca `ehSugerivel` por `ehPrescritivel` (sem a chave); bebida alcoólica no plano
  devolve lista vazia (D-194). O filtro `NAO_EQUIVALE` continua: ele diz o que não é troca justa (pizza no lugar de
  arroz), não o que é prescritível.
- Testes (`trocas.test.ts`): CA-658 (nenhuma troca fora da regra, base inteira), CA-659 (ovo frito → ovo cozido;
  batata frita → batata cozida), CA-660 (margarina e doce de leite sem trocas; o plano de exemplo segue com trocas
  nos outros alimentos), CA-661 (cerveja sem trocas).
- Verificação: `npx vitest run src/domain/trocas.test.ts`.

## T5 · test: listas fixas e busca

Depende de T2.

- `sugestoes.test.ts`: todo item de `SUGESTOES_PADRAO` passa na regra (CA-662).
- `busca.test.ts`: "cerveja", "doce de leite" e "margarina" continuam achados pela busca (CA-663).
- Verificação: `npx vitest run src/domain/sugestoes.test.ts src/domain/busca.test.ts`.

## T6 · docs: antes e depois, validação

- Apêndice B da SPEC: as 5 primeiras sugestões de cada um dos 16 micronutrientes, antes e depois, no plano de exemplo
  e no plano vazio, medidas com o código das duas versões.
- Prints antes e depois do cobrir no plano de exemplo (piridoxina, ferro, sódio), em 1280 px e 390 px.
- `npm run check`, `npx playwright test` e `npm run build` verdes.

## Decisões para o dono revisar

1. A chave do cobrir libera só a forma de ingrediente (D-191). Refrigerante, doce, gordura, embutido, fritura e
   ultraprocessado ficam fora mesmo com ela ligada; para usar um deles, a busca.
2. Café e chá ficam fora do cobrir (D-193), mas continuam nas trocas e na lista do desjejum.
3. Item fora da rotina posto à mão ganha trocas melhores (ovo frito → ovo cozido); margarina e doce ficam sem trocas.
   Na folha do plano de exemplo, a linha de trocas da margarina some.
4. O plano de exemplo continua com margarina (D-196).
5. O cobrir do sódio continua existindo (fora de escopo, seção 5).

## Riscos

- `trocas.ts` também é lido pela frente do PDF: a mudança fica no filtro dos pares e numa guarda no começo da função,
  sem mexer na forma do resultado.
- A lista de excluídos depende do nome dos alimentos da TACO; a contagem do T2 trava qualquer mudança silenciosa.

## Validação (15/10/2026)

| Critério | Onde está o teste |
|---|---|
| CA-650 | `prescritivel.test.ts` (cerveja e aguardente, com e sem a chave); `cobrir.test.ts` "CA-650" |
| CA-651 | `prescritivel.test.ts` (60 alimentos dos seis motivos); `cobrir.test.ts` "CA-651" |
| CA-652 | `prescritivel.test.ts` (a chave libera só o nível ingrediente); `cobrir.test.ts` "CA-652" e CA-657 com a chave |
| CA-653 | `prescritivel.test.ts` (36 alimentos de forma de ingrediente) |
| CA-654 | `cobrir.test.ts` "CA-654"; o CA-657 confere que nenhuma infusão aparece |
| CA-655 | `cobrir.test.ts`: CA-35, CA-36 e "uso comum" (já existiam e continuam verdes) |
| CA-656 | `cobrir.test.ts`: só item fora da regra cobriria; porção máxima de 5 g |
| CA-657 | `cobrir.test.ts`: exemplo e plano vazio, 16 micronutrientes, com e sem a chave; piridoxina sem cerveja |
| CA-658 a CA-661 | `trocas.test.ts` |
| CA-662 | `sugestoes.test.ts` |
| CA-663 | `busca.test.ts` |
| CA-664 | `prescritivel.test.ts` (títulos na ordem do Apêndice A e contagem de 293) |
| CB-190, CB-193, CB-196 | Sem código novo: o plano salvo não é tocado; o cobrir e as trocas continuam lendo só a base |
| CB-191 | CA-652 |
| CB-192 | CA-656 com porção de 5 g |
| CB-194 | Contagem do CA-664 |
| CB-195 | `cobrir.test.ts` CA-40 e a gaveta, sem mudança |

`npm run check` verde (187 arquivos, 3.196 testes), `npx playwright test` verde (55, numa cópia temporária da
configuração na porta 4193) e `npm run build` verde.

**Divergências do plano:**

- O T4 (trocas) entrou antes do T3 (cobrir), para cada commit compilar sozinho: o T3 apaga `ehSugerivel`, que as
  trocas usavam.
- Os testes do T4 falharam antes do código pelo motivo errado (o import do T3 ainda em andamento). O comportamento
  antigo que eles barram está medido: refrigerante trocava por cerveja, cerveja por café e margarina por margarina.
- Os testes do T5 são trava do que já valia e passaram de primeira.

## Rodada de revisão (15/10/2026, à tarde)

Lê a seção 7 da SPEC. Mesmas regras: nota na spec primeiro, TDD, um commit por item, sem dependência nova.

| Tarefa | Item | Altera | Verificação |
|---|---|---|---|
| R0 | nota da rodada (SPEC D-191, D-193, D-194, D-196 a D-199, CA-651 a CA-677, CB-195 a CB-199, seção 7, Apêndice C) e M5 | `specs/sugestoes-com-criterio/SPEC.md`, `PLAN.md`, `specs/planejador-metanutri/SPEC.md` | leitura |
| R1 | C1: "calda" com ou sem "em" | `prescritivel.ts`, `prescritivel.test.ts` | `npx vitest run src/domain/prescritivel.test.ts` |
| R2 | I1: capuccino, gelatina, sal, shoyu, tempero, fermento; café e chá em qualquer forma fora do cobrir | `prescritivel.ts`, `prescritivel.test.ts`, `cobrir.ts`, `cobrir.test.ts` | os dois testes |
| R3 | I2: pó e farinha fortificados | `prescritivel.ts`, `prescritivel.test.ts` | idem |
| R4 | I4: pratos com embutido, toucinho, carne curada ou miúdos | `prescritivel.ts`, `prescritivel.test.ts` | idem |
| R5 | D-199a: versão crua do que se come cozido; peixe "fresco" | `prescritivel.ts`, `prescritivel.test.ts` | idem |
| R6 | M6: descrição limpa antes de comparar | `prescritivel.ts`, `prescritivel.test.ts` | idem |
| R7 | M7: miolo de alcatra e linhaça são de uso comum | `prescritivel.ts`, `prescritivel.test.ts` | idem |
| R8 | I3: trava por padrão de texto (cobrir e trocas) e lista fixa de ids | cria `src/domain/naoProposto.test-utils.ts` (os padrões, para os dois testes usarem o mesmo); altera `cobrir.test.ts`, `trocas.test.ts`, `prescritivel.test.ts` | os três testes |
| R9 | M4: teste do CA-655 | `cobrir.test.ts` | `cobrir.test.ts` |
| R10 | M3 e D-199a nas trocas: forma do ovo e verdura cozida | `trocas.ts`, `trocas.test.ts` | `trocas.test.ts` |
| R11 | M1: item fora da rotina prefere o mesmo alimento | `trocas.ts`, `trocas.test.ts` | idem |
| R12 | D-199b: porção máxima por grupo e corte magro primeiro | `cobrir.ts`, `cobrir.test.ts` | `cobrir.test.ts` |
| R13 | M9: restrição antes do corte das 5 | `cobrir.ts`, `cobrir.test.ts`, `src/ui/adequacao/GavetaCobrir.tsx`, `TelaAdequacao.test.tsx` | `cobrir.test.ts`, `src/ui/adequacao` |
| R15 | D-199d: o sódio não se cobre (feito antes do R14; nota na spec antes do código) | `cobrir.ts`, `cobrir.test.ts` | `cobrir.test.ts` |
| R14 | Apêndices A e B regenerados do código, validação, prints e relatório | `SPEC.md`, `PLAN.md` | `npm run check`, `npx playwright test` (porta própria), `npm run build` |

Dependências: R8 vem depois de R1 a R7, porque guarda a lista final de ids. R10 e R11 dependem de R5 (a vagem crua sai
da regra). Cada tarefa de R1 a R7 atualiza a contagem do CA-664 até o R8 trocá-la pela lista fixa.

Fora desta rodada (a revisão listou, o coordenador não pediu): M2 (trocas de laticínio vazias) e M8 (vitrine).

Única mudança de tela: a `GavetaCobrir` passa as restrições para o domínio em vez de filtrar a lista pronta (R13).

### Re-revisão (15/10/2026, fim da tarde)

| Tarefa | Item | Altera | Verificação |
|---|---|---|---|
| S0 | nota na SPEC (D-194, D-199a, CA-670, CA-671, CA-675, CA-679, seção 7, Apêndice C) | `SPEC.md`, `PLAN.md` | leitura |
| S1 | N1: magro antes do gordo nas trocas; `ehCorteGordo` passa de `cobrir.ts` para `prescritivel.ts`, para os dois usarem | `prescritivel.ts`, `cobrir.ts`, `trocas.ts`, `trocas.test.ts` | `trocas.test.ts`, `cobrir.test.ts` |
| S2 | regra (a) esclarecida: o cru só sai quando a base tem a versão cozida | `prescritivel.ts`, `prescritivel.test.ts`, `naoProposto.test-utils.ts` | `prescritivel.test.ts`, `cobrir.test.ts`, `trocas.test.ts` |
| S3 | N2: pão de queijo, farinha, farofa, nhoque, fécula e polvilho não são verdura nas trocas | `trocas.ts`, `trocas.test.ts` | `trocas.test.ts` |
| S4 | N5: a trava de texto cobre todos os ids da lista fixa | `naoProposto.test-utils.ts`, `prescritivel.test.ts` | `prescritivel.test.ts` |
| S5 | N6: a mensagem só cita a restrição quando ela tirou algo | `cobrir.ts`, `cobrir.test.ts` | `cobrir.test.ts` |
| S6 | N7: dependência estável das restrições na gaveta | `GavetaCobrir.tsx`, cria `GavetaCobrir.test.tsx` | `src/ui/adequacao` |
| S7 | Apêndices A e B regenerados, validação, relatório e prints (se o que aparece mudou) | `SPEC.md`, `PLAN.md` | `npm run check`, `npm run build`, `npx playwright test` (a gaveta mudou) |

### Validação da rodada (15/10/2026)

| Critério | Onde está o teste |
|---|---|
| CA-651 (calda) | `prescritivel.test.ts` ("Ameixa, calda, enlatada") e a trava do CA-667 |
| CA-654, CA-665 | `prescritivel.test.ts` (sal, shoyu, tempero, fermento, capuccino, gelatina); `cobrir.test.ts` "CA-654 e CA-665" e a trava do CA-667 |
| CA-655 | `cobrir.test.ts` "CA-655" |
| CA-664 | `prescritivel.test.ts`: títulos, contagem (307) e lista fixa de ids por motivo |
| CA-666 | `prescritivel.test.ts` "CA-666" |
| CA-667 | `cobrir.test.ts`: 12 variações (exemplo e vazio × chave × 50, 100 e 200 g), padrão de `naoProposto.test-utils.ts` |
| CA-668 | `trocas.test.ts` "CA-658 e CA-668" |
| CA-669 | `prescritivel.test.ts` "CA-669" |
| CA-670 | `prescritivel.test.ts` (cru e prescritível) |
| CA-671 | `trocas.test.ts` (três testes) |
| CA-672, CB-199 | `trocas.test.ts` |
| CA-673, CB-197, CB-198 | `cobrir.test.ts` "CA-673" |
| CA-674 | `cobrir.test.ts` "CA-674" |
| CA-675 | `cobrir.test.ts` (dois testes) e `TelaAdequacao.test.tsx` |
| CA-676 | `prescritivel.test.ts` "CA-676" |
| CA-677 | `prescritivel.test.ts` "CA-677" |
| CA-678 | `cobrir.test.ts` "CA-678" |

`npm run check` verde (187 arquivos, 3.269 testes; o único aviso do lint é antigo, em `MolduraPublica.tsx`),
`npx playwright test` verde (55, cópia temporária da configuração na porta 4193, já apagada) e `npm run build` verde.

**Divergências da rodada:**

- O R8 criou `naoProposto.test-utils.ts`, que não estava na lista de arquivos; o PLAN foi atualizado no mesmo commit.
- O R15 (sódio) entrou depois do R13 e antes do R14, por pedido do coordenador no meio da rodada.
- Os testes do R8 (trava e lista fixa) e do R9 (CA-655) passaram de primeira, porque guardam o que já valia. A trava foi
  conferida desfazendo a correção da calda: ela acusou a ameixa no plano vazio com porção de 50 g.
- No teste da restrição na tela (CA-675), a primeira versão usava "alface", que não estava nas 5 sugestões, e passava
  sem a correção; a versão final usa o nome da primeira sugestão e falhou antes do código.

### Validação da re-revisão (15/10/2026)

| Item | Onde está o teste |
|---|---|
| N1 · CA-679 | `trocas.test.ts` "CA-679" (patinho sem corte gordo; em toda carne de rotina, nenhum magro depois do primeiro gordo; milanesa troca primeiro por frango sem pele) |
| Regra (a) · CA-670 | `prescritivel.test.ts`: os nove crus voltam a prescritíveis; cada verdura crua que sai tem a versão cozida na base; lista fixa com 298 ids |
| N2 · CA-671 | `trocas.test.ts` "pão de queijo, farinha, farofa, nhoque, fécula e polvilho não trocam com verdura" |
| N5 · CA-667 | `prescritivel.test.ts` "a trava de texto pega todos os ids da lista fixa" |
| N6 · CA-675 | `cobrir.test.ts` "a mensagem só fala da restrição quando ela tirou algum alimento" |
| N7 | `GavetaCobrir.test.tsx` (a mesma restrição num array novo não refaz o cálculo; uma diferente refaz) |

`npm run check` verde (188 arquivos, 3.275 testes; o aviso do lint é o antigo, de `MolduraPublica.tsx`),
`npx playwright test` verde (55, porta 4193, configuração temporária já apagada, porque a gaveta mudou) e
`npm run build` verde. As sugestões que aparecem nos prints (piridoxina, ferro e sódio do exemplo) não mudaram nesta
rodada, então os prints "depois" continuam valendo.

**Divergências da re-revisão:**

- O teste do N5 não foi visto falhando como teste: antes dele, um teste descartável listou os 54 alimentos excluídos que a
  trava não pegava, e a trava foi completada.
- O peixe "fresco" (dourada) continua fora: ele segue a regra antiga de peixe cru, que vale mesmo sem versão cozida, como
  pescadinha, corvina e tucunaré crus.

## Correção C (22/10/2026): vitamina A, crus, trocas e os bloqueios da 2ª revisão

Plano único da correção C, com as decisões em cinco specs: esta (seção 9: D-470 a D-477), `conduta-da-nutricionista`
(seção 7: D-478, D-479), `impressao-do-plano` (seção 4.2: D-480), `alimentos-e-gramaturas` (seção 7: D-481 a D-487) e
`ficha-unica` (seção 11: D-488). Cada tarefa é um commit, com o teste antes do código (TDD, vendo falhar).

| # | Tarefa | Arquivos | Critérios |
|---|---|---|---|
| C1 | Vitamina A pré-formada na adequação: a soma à parte, o limite contra ela, o texto "pré-formada acima do limite" e a nota ‡ | `src/domain/vitaminaA.ts` (novo) e teste, `totais.ts`, `adequacao.ts` e testes, `src/ui/adequacao/estiloAdequacao.ts`, `TelaAdequacao.tsx` e teste, `src/export/copiar-tabela.ts` e teste | CA-1310 a CA-1312, CB-440 a CB-443 |
| C2 | Cobrir: teto da vitamina A pré-formada em todo nutriente e a nota semanal do fígado | `cobrir.ts` e teste, `GavetaCobrir.tsx` e teste | CA-1313 a CA-1315 |
| C3 | Criança sem fígado (cuidado da fase) | `restricoes.ts` e teste, `cobrir.test.ts` | CA-1316, CA-1317, CB-444 |
| C4 | O fígado nunca é troca | `trocas.ts` e teste | CA-1318 |
| C5 | Cru com a chave desligada e "(peso cru)" na gaveta | `prescritivel.ts` e teste, `GavetaCobrir.tsx` e teste; Apêndice A (lista fixa de ids) | CA-1319, CA-1320 |
| C6 | Porção máxima automática | `GavetaCobrir.tsx`, `cobrir.ts` e testes | CA-1321, CA-1322 |
| C7 | Troca sem ultraprocessado (D-478) | `prescritivel.ts`, `trocas.ts` e testes | CA-1325, CB-446 |
| C8 | Troca sem fritura (D-479) | `prescritivel.ts`, `trocas.ts` e testes | CA-1326, CB-447 |
| C9 | Aviso de restrição na janela de imprimir (D-480) | `src/domain/restricoes.ts` (lista do plano), `DialogoImprimir.tsx` e teste | CA-1327, CA-1328, CB-448, CB-449 |
| C10 | Linha do plano a 390 px (D-481) | `LinhaItem.tsx`, `CartaoRefeicao.tsx` e testes; e2e a 390 px | CA-1329 |
| C11 | Gestação: ferro e folato do suplemento (D-476) | `GavetaCobrir.tsx`, `TelaAdequacao.tsx`, `MicrosDoDia.tsx`, `TelaPlanejador`/`AreaDeTrabalho.tsx`, `navegacao.ts`, `TelaPaciente.tsx`, `CartaoSuplementos.tsx` e testes | CA-1323, CB-445 |
| C12 | Rótulo: o que a RDC 429/2020 obriga (D-485) | `DialogoProduto.tsx` e teste | CA-1335 |
| C13 | Plausibilidade das sobras do G2 e carne em colher até 4 (D-483) | `scripts/dados/importar-medidas-pof.mjs`, `src/data/medidas-caseiras.json`, `medidas-revisao.md`, `medidas-caseiras.test.ts`, `busca.ts` e teste | CA-1332, CA-1333, CB-450 |
| C14 | Entrada rápida: o número conta peças (D-482) | `busca.ts` e teste | CA-1330, CA-1331, CB-451 |
| C15 | Porção mínima de fruta e polpa; pupunha (D-477) | `cobrir.ts` e teste | CA-1324 |
| C16 | Fruta em peça inteira (D-484) | `busca.ts` e teste, `cobrir.ts` | CA-1334, CB-452 |
| C17 | Substituto mostra a porção equivalente (D-486) | `EntradaRapida.tsx`, `DialogoSubstituto.tsx` e teste | CA-1336 |
| C18 | Casa e escola pela idade (D-488) | `anamnese.ts`, `CartaoDadosDoPaciente.tsx` e testes | CA-1338, CB-453 |
| C19 | Capturas da landing (D-487) | `scripts/capturas-landing.mjs`, `public/imagens/cobrir-*.png`, `missoes-*.png` | CA-1337 |
| C20 | Testes de tela e e2e que liam o comportamento antigo; os 4 pacientes de novo, prints | e2e | todos |

**Riscos e decisões para o dono e a parceira:**
- **Teto em vez de excluir o fígado (D-471).** Na prática, o fígado grelhado nunca cabe; o de frango cru cabe num adulto
  com a chave ligada, até 75 g, com a nota "no máximo 1 vez por semana". Se a parceira preferir, tirar o fígado do Cobrir
  de vez é uma linha.
- **Leite, queijo e ovo sem vitamina A na TACO (CB-440):** a pré-formada do plano fica subestimada quando há laticínio e
  ovo (a † já avisa). Trazer o retinol da TACO para esses itens é uma mudança de dados para outra rodada.
- **Alimento próprio fora de frutas e verduras conta como pré-formada (CB-441):** escolha de segurança (a vitamina A
  do rótulo é quase sempre adicionada).
- **12 anos para o fígado da criança (D-472):** a mesma idade da cafeína (D-443).
- **A aveia fica sem troca (D-478):** o papel "cereal do café" só tem ultraprocessados além dela.

### Validação da correção C (22/10/2026)

| Critério | Onde está o teste |
|---|---|
| CA-1310, CA-1311, CA-1316/1317 (limite por fase) | `adequacao.test.ts` "o limite da vitamina A vale para a pré-formada"; `vitaminaA.test.ts`; `totais.test.ts`; `estiloAdequacao.test.ts`; `copiar-tabela.test.ts` |
| CA-1312 | `TelaAdequacao.test.tsx` "CA-693" e "CA-700" |
| CA-1313 a CA-1315 | `cobrir.test.ts` "teto da vitamina A pré-formada"; `estiloAdequacao.test.ts` (nota do fígado) |
| CA-1316 | `cuidadosDaFase.test.ts` "criança sem fígado" |
| CA-1317, CA-1250 | `cuidadosDaFase.test.ts` "gestação sem fígado" |
| CA-1318 | `trocas.test.ts` "O fígado nunca é troca" |
| CA-1319, CA-1320 | `prescritivel.test.ts` "CA-1319" e a lista fixa; `estiloAdequacao.test.ts` "CA-1320" |
| CA-1321, CA-1322 | `GavetaCobrir.test.tsx` "Porção máxima automática"; `cobrir.test.ts` (mensagens) |
| CA-1323, CB-445 | `GavetaCobrir.test.tsx` "Gestação: ferro e folato"; `navegacao.test.ts`; `proximaConsulta.test.tsx` |
| CA-1324 | `cobrir.test.ts` "porção mínima de fruta e máxima de pupunha" |
| CA-1325, CB-446 | `trocas.test.ts` "Troca sem ultraprocessado" |
| CA-1326 | `trocas.test.ts` "Troca no mesmo preparo" |
| CA-1327, CA-1328, CB-448, CB-449 | `DialogoImprimir.test.tsx` "Aviso de restrição antes de imprimir" |
| CA-1329 | `e2e/correcao-c.spec.ts` (390 e 360 px) |
| CA-1330, CA-1331 | `busca.test.ts` "o número conta peças" |
| CA-1332, CA-1333 | `medidas-caseiras.test.ts` "sobras do G2"; `busca.test.ts` "sobras do G2" |
| CA-1334 | `busca.test.ts` "fruta inteira em peça inteira"; o plano de exemplo em `quantidadeNaFolha`, `dietaParaPaciente`, `FolhaDieta`, `TelaMissoesPaciente` e o e2e do link |
| CA-1335 | `TelaProdutos.test.tsx` "CA-1335" |
| CA-1336 | `DialogoSubstituto.test.tsx` "CA-1336" |
| CA-1337 | `TelaInicio.test.tsx` "CA-1337" (texto alternativo e tamanho do PNG) |
| CA-1338, CB-453 | `anamnese.test.ts` "CA-1279 e CA-1338"; `anamnese.test.tsx`; `e2e/ficha-unica.spec.ts` |
| CA-1339 | `cobrir.test.ts` "todo alimento sugerível tem porção de grupo" |

**Desvios na execução:**
- **D-482 ficou mais estreita.** Pôr à frente quem tem medida de contar, com qualquer número, fazia "15 aveia" virar 15
  fatias de pão de aveia; ficou só a regra da gema e da clara, e o sem medida de contar continua em gramas (D-371).
- **D-484 mudou na execução.** A primeira redação deixava 130 g de maçã em gramas; ficou "130 g (cerca de 1 unidade)",
  com até 20% de folga numa peça (ou meia) de fruta. A folga para mais peças fazia a troca sair 20% acima da energia
  ("Laranja pera · 1 unidade e meia (270 g)") e foi tirada.
- **D-477 ganhou a fruta pequena** (o jambo de 40 g sai em 1 unidade na criança) e **D-489 entrou na caminhada**: a
  aveia caía nos 200 g sem grupo ("6 colheres de servir e meia · 195 g" no ferro da gestante).
- **D-483 revelou um erro antigo:** "copo médio" só era lido enquanto algum alimento ainda tinha esse copo (o cereal
  matinal); os nomes curtos agora vão do mais longo para o mais curto.
- **D-480** lista também os cuidados da fase de vida, com a frase do cuidado (sem "a ficha diz").
- A trava de texto dos testes (`naoProposto.test-utils.ts`) pegava o broto de feijão, prescritível pelo C.1; ela agora o
  deixa.
- A lista da entrada rápida também quebra o nome no celular (a caminhada a 390 px mostrou "cozido/10minut…").
