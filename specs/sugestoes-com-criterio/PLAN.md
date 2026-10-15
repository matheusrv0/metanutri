# PLAN — Sugestões com critério

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
| R8 | I3: trava por padrão de texto (cobrir e trocas) e lista fixa de ids | `cobrir.test.ts`, `trocas.test.ts`, `prescritivel.test.ts` | os três testes |
| R9 | M4: teste do CA-655 | `cobrir.test.ts` | `cobrir.test.ts` |
| R10 | M3 e D-199a nas trocas: forma do ovo e verdura cozida | `trocas.ts`, `trocas.test.ts` | `trocas.test.ts` |
| R11 | M1: item fora da rotina prefere o mesmo alimento | `trocas.ts`, `trocas.test.ts` | idem |
| R12 | D-199b: porção máxima por grupo e corte magro primeiro | `cobrir.ts`, `cobrir.test.ts` | `cobrir.test.ts` |
| R13 | M9: restrição antes do corte das 5 | `cobrir.ts`, `cobrir.test.ts`, `src/ui/adequacao/GavetaCobrir.tsx`, `TelaAdequacao.test.tsx` | `cobrir.test.ts`, `src/ui/adequacao` |
| R14 | Apêndices A e B regenerados do código, validação, prints e relatório | `SPEC.md`, `PLAN.md` | `npm run check`, `npx playwright test` (porta própria), `npm run build` |

Dependências: R8 vem depois de R1 a R7, porque guarda a lista final de ids. R10 e R11 dependem de R5 (a vagem crua sai
da regra). Cada tarefa de R1 a R7 atualiza a contagem do CA-664 até o R8 trocá-la pela lista fixa.

Fora desta rodada (a revisão listou, o coordenador não pediu): M2 (trocas de laticínio vazias) e M8 (vitrine).

Única mudança de tela: a `GavetaCobrir` passa as restrições para o domínio em vez de filtrar a lista pronta (R13).
