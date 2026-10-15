# Painel lateral enxuto · Plano de implementação

**Spec:** `specs/painel-lateral-enxuto/SPEC.md` (pedida em 15/10/2026; aprovação pelas telas).

**Objetivo:** o Resumo do dia diz cada fato uma vez; a etapa 2 mostra o que falta de micronutriente
com o Cobrir; a etapa 3 abre no que pede ação e funciona no celular. Só apresentação.

**Arquitetura:** nenhum arquivo de domínio muda. O `MedidorMacro` (biblioteca) passa a mostrar os
valores sem casa decimal e a meta curta. O `ResumoDoDia` junta "Metas" dentro de "Ajustar" e diz o
estado da energia numa frase. Um componente de tela novo, `src/ui/adequacao/MicrosDoDia.tsx`, lê
`calcularAdequacao` e abre a `GavetaCobrir` que já existe, sem mudar nada nela. A `TelaAdequacao`
separa as linhas que pedem ação das que estão na meta e, abaixo de 640 px, desenha uma lista.

## Restrições

- Nenhuma dependência nova. Nada em `src/domain/cobrir.ts`, `trocas.ts`, `sugestoes.ts`, na
  `GavetaCobrir`, no PDF, no Word nem na cópia da tabela.
- Biblioteca pelo alias `@ds/...`; cor, espaço e raio só por token. Um componente por arquivo, export
  nomeado, sem `any` e sem `!`. Toque de 44 px no celular (os `Button` já garantem).
- TDD: teste primeiro, ver falhar, código, ver passar. `npm run check` verde no fim de cada tarefa;
  um commit por tarefa, em Conventional Commits, em português.

## Ordem e dependências

| # | Tarefa | Arquivos | Critérios | Depende de |
|---|---|---|---|---|
| T1 | Medidor do macro enxuto | `design-system/componentes/nutricao/MedidorMacro.tsx`, `MedidorMacro.test.tsx` (novo), vitrine `TelaDesignSystem.tsx`, `design-system/componentes/LEIA-ME.md` | CA-682 (linha), CB-205, CB-206 | — |
| T2 | Resumo do dia: energia numa frase, Ajustar com metas, Ver cálculo | `src/ui/resumo/ResumoDoDia.tsx`, `ResumoDoDia.test.tsx` | CA-680, CA-681, CA-682, CA-683, CA-684, CB-206, CB-207 | T1 |
| T3 | Cartão Micronutrientes | `src/ui/adequacao/MicrosDoDia.tsx` (novo), `MicrosDoDia.test.tsx` (novo) | CA-685, CA-686, CA-687, CA-688, CA-691 (cartão), CB-200 a CB-204, CB-209 | — |
| T4 | Cartão na coluna da etapa 2 | `src/ui/AreaDeTrabalho.tsx`, `e2e/planejador.spec.ts` | CA-685, CA-688, CA-689 | T3 |
| T5 | Etapa 3: o que pede ação primeiro, Cobrir em destaque, notas curtas | `src/ui/adequacao/TelaAdequacao.tsx`, `TelaAdequacao.test.tsx` | CA-690, CA-691, CA-693, CB-202, CB-204 | — |
| T6 | Etapa 3 em lista no celular | `src/ui/adequacao/TelaAdequacao.tsx`, `TelaAdequacao.test.tsx` | CA-692, CB-208 | T5 |
| T7 | Gaveta do Cobrir: o que passou do gasto (pedido do coordenador em 15/10) | `src/ui/adequacao/GavetaCobrir.tsx` (só o texto), `TelaAdequacao.test.tsx` | CA-694 | — |
| T8 | Validação | prints, relatório | todos | T1 a T7 |

## Tarefas

### T1 · Medidor do macro enxuto
1. Teste novo `MedidorMacro.test.tsx`: valores "89 g · 18%" sem casa; com `comGPorKg` e peso,
   "· 1,44 g/kg"; sem `comGPorKg`, nada de g/kg; com meta em g/kg, o g/kg aparece mesmo sem
   `comGPorKg`; a meta curta aparece ao lado da frase; sem medidor e com meta, "Meta: 10 a 35%"; sem
   meta, a frase de hoje.
2. Ver falhar. Mudar o componente: prop nova `comGPorKg?: boolean | undefined`; `meta` passa a ser a
   meta curta. Vitrine e LEIA-ME com a API nova.
3. `npm run check`. Commit `refactor(medidor): valores sem casa e meta curta no macro`.

### T2 · Resumo do dia
1. Atualizar `ResumoDoDia.test.tsx` com os IDs novos: CA-680 (sem "Macronutrientes" e sem "Metas"
   à vista), CA-681 (frase "23% do GET, abaixo de 90%", sem selo; "da meta" no rápido), CA-682 (linha
   da proteína do plano com arroz: "8 g · 8% · 0,13 g/kg"), CA-683 ("Ajustar" → "Metas de
   macronutrientes" → salvar → "1,2 a 1,6 g/kg · sua meta"), CA-684 (Ver cálculo com g/kg de
   carboidrato e gordura e "faixa da idade"), CB-207 (rápido com meta digitada). Os testes de CA-06
   a CA-11 e CB-01 continuam como estão.
2. Ver falhar. Mudar `ResumoDoDia.tsx`. A frase da energia nasce de `percentualDoGasto`, sem conta
   nova.
3. `npm run check` e `npx playwright test e2e/planejador.spec.ts`. Commit
   `feat(resumo): resumo do dia diz cada fato uma vez`.

### T3 · Cartão Micronutrientes
1. `MicrosDoDia.test.tsx`: contagem e até 5 linhas do mais longe para o mais perto (CA-685, CB-203);
   Cobrir abre a gaveta com "Cobrir Ferro" e Adicionar põe o alimento e refaz o cartão (CA-686,
   CB-204); acima do limite sem Cobrir (CA-687, com um plano de muito sal); "Ver os 16" chama
   `aoVerTodos` (CA-688); plano vazio (CB-200); sem sexo e idade (CB-201); preset coletivo (CB-209);
   botão com a variante `lightprimary` (CA-691).
2. Ver falhar. Criar o componente: `calcularAdequacao` + ordem por `adequacaoPct`, `GavetaCobrir` sem
   mudança, `adicionarItem` do domínio para o Adicionar.
3. `npm run check`. Commit `feat(adequacao): cartão do que falta com o cobrir`.

### T4 · Cartão na coluna da etapa 2
1. `e2e/planejador.spec.ts`, no fluxo principal: na etapa 2, o cartão "Micronutrientes" aparece com
   "Cobrir" e "Ver os 16" leva à etapa 3; na etapa 1, o cartão não aparece (CA-689).
2. Ver falhar. Em `AreaDeTrabalho.tsx`, a etapa 2 põe `ResumoDoDia` e `MicrosDoDia` numa coluna;
   o gasto energético é calculado uma vez e serve à etapa 2 e à 3.
3. `npm run check` e `npx playwright test`. Commit `feat(planejador): micronutrientes na coluna da
   etapa 2`.

### T5 · Etapa 3: o que pede ação primeiro
1. `TelaAdequacao.test.tsx` com IDs novos: só as linhas abaixo da meta e acima do limite à vista;
   "Ver os N na meta" abre o resto na mesma tabela e vira "Esconder os N na meta" (CA-690); Cobrir
   com `lightprimary` e só em linha abaixo (CA-691); notas em uma frase cada (CA-693); nenhum abaixo
   (CB-202); grupo aberto continua aberto depois de um Cobrir (CB-204). Os testes que usam nutriente
   na meta abrem o grupo antes.
2. Ver falhar. Mudar a tabela: um `tbody` à vista e outro com `hidden`, botão com `aria-expanded` e
   `aria-controls`.
3. `npm run check` e `npx playwright test`. Commit `feat(adequacao): tabela abre no que pede ação`.

### T6 · Etapa 3 em lista no celular
1. Teste com `matchMedia` falso de 639 px: lista com nome, "48% abaixo", barra, "8,7 mg de 18 mg"
   com o tipo, e Cobrir; recolhimento igual (CA-692).
2. Ver falhar. `useMediaQuery('(max-width: 639px)')` escolhe entre a tabela e a lista; as linhas
   saem de uma função só por grupo, para as duas formas usarem o mesmo dado.
3. `npm run check`. Commit `feat(adequacao): adequação em lista no celular`.

### T7 · Gaveta do Cobrir: o que passou do gasto
1. Em `TelaAdequacao.test.tsx`, com o gasto abaixo das kcal do plano, a gaveta diz "O plano já passou
   N kcal do gasto energético." e não diz "Cabem -"; com o gasto acima, continua "Cabem N kcal".
2. Ver falhar. Mudar só a frase da descrição na `GavetaCobrir`; nada da lógica nem das sugestões.
3. `npm run check`. Commit `fix(cobrir): gaveta diz quanto passou do gasto`.

### T8 · Validação
1. `npm run check`, `npx playwright test`, `npm run build`.
2. Detector do impeccable nos arquivos mudados.
3. Prints `depois-*` em 1280 e 390 com o mesmo roteiro dos `antes-*`.
4. Relatório em `ajustes-1510/painel-lateral-enxuto-report.md`.

## Decisões para o dono revisar

1. **Cartão novo na etapa 2 (D-204).** É o único acréscimo. Mostra no máximo 5 linhas; se ficar
   pesado, sai sem afetar o resto.
2. **Linhas na meta recolhidas na etapa 3 (D-205).** Fechado toda vez que a tela abre; não guarda a
   escolha.
3. **"Metas" dentro de "Ajustar" (D-203):** um clique a mais para mudar a meta de um macro.
4. **Ordem do cartão: do mais longe para o mais perto da meta.** Na etapa 3, a ordem continua a de
   sempre, para a tabela bater com o Word.

## Riscos

- **Linha que muda de grupo na hora do Cobrir.** O e2e do Cobrir procura a linha do Ferro depois de
  adicionar; se o ferro chegar à meta, ela vai para o grupo recolhido. O exemplo do e2e não chega
  (arroz e feijão); se chegar, o teste abre o grupo.
- **`matchMedia` na lista do celular.** Sem `matchMedia` (testes, primeiro quadro) vale a tabela;
  o celular troca para a lista no primeiro quadro, sem piscar, porque o `useMediaQuery` lê o
  navegador direto.
