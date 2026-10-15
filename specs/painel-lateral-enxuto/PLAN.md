# Painel lateral enxuto · Plano de implementação

**Spec:** `specs/painel-lateral-enxuto/SPEC.md` (pedida em 15/10/2026; aprovação pelas telas).

**Objetivo:** o Resumo do dia diz cada fato uma vez; a etapa 2 mostra o que falta de micronutriente
com o Cobrir; a etapa 3 abre no que pede ação e funciona no celular. Só apresentação.

**Arquitetura:** nenhum cálculo do domínio muda; a rodada de revisão só acrescenta uma função pura
de arredondamento para a tela (`src/domain/arredondarNoEstado.ts`). O `MedidorMacro` (biblioteca)
passa a mostrar os valores sem casa decimal e a meta curta. O `ResumoDoDia` junta "Metas" dentro de
"Ajustar" e diz o estado da energia numa frase. Um componente de tela novo,
`src/ui/adequacao/MicrosDoDia.tsx`, lê `calcularAdequacao` e abre a `GavetaCobrir` que já existe; na
gaveta muda só a frase do gasto (T7, CA-694). A `TelaAdequacao` separa as linhas que pedem ação das
que estão na meta e, abaixo de 640 px, desenha uma lista.

## Restrições

- Nenhuma dependência nova. Nada em `src/domain/cobrir.ts`, `trocas.ts`, `sugestoes.ts`, no PDF,
  no Word nem na cópia da tabela. Na `GavetaCobrir`, só a frase do gasto (T7); a lógica não muda.
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
| R1 | Arredondar na direção do estado | `src/domain/arredondarNoEstado.ts` (novo, + teste), `ResumoDoDia.tsx`, `MedidorMacro.tsx`, `MicrosDoDia.tsx`, `TelaAdequacao.tsx`, `FaixaResumo.tsx` (+ testes) | CA-695, CA-696 | — |
| R2 | Mínimo da meta até 1000% | `TelaAdequacao.tsx` (+ teste) | CA-698 | — |
| R3 | Specs antigas marcadas como substituídas | `specs/estilo-spora/SPEC.md` (CA-206), `specs/pdf-e-telas-limpas/SPEC.md` (CA-333, CA-338) | — | — |
| R4 | Sódio sem Cobrir | `MicrosDoDia.tsx`, `TelaAdequacao.tsx` (+ testes) | CA-697, CA-703, CB-202 | R1 |
| R5 | Legenda do † no cartão | `MicrosDoDia.tsx` (+ teste) | CA-699 | R4 |
| R6 | Notas † e ‡ lidas com o símbolo | `TelaAdequacao.tsx` (+ teste) | CA-700 | — |
| R7 | Cobrir com o nome do nutriente | `TelaAdequacao.tsx` (+ testes, e2e) | CA-700 | — |
| R8 | "Ver todos" leva ao topo e ao título | `AreaDeTrabalho.tsx`, `TelaAdequacao.tsx` (+ teste, e2e) | CA-701 | — |
| R9 | "Ver cálculo": ordem, "no plano" e g/kg sem repetir | `ResumoDoDia.tsx`, `LinhaCalculo.tsx` (novo) (+ testes) | CA-702 | — |
| R10 | Componentes em arquivos próprios | `src/ui/adequacao/ItemListaAdequacao.tsx` (novo), `estiloAdequacao.ts` (novo), `TelaAdequacao.tsx` | — | R9 |
| R11 | Testes mais firmes | `MicrosDoDia.test.tsx`, `TelaAdequacao.test.tsx` | CB-204, CB-209, CA-694, CA-690 | R1 a R10 |
| R12 | Recolhido de cada plano | `AreaDeTrabalho.tsx` (`key` por plano), e2e | CA-704 | — |
| R13 | Prints e relatório da rodada | prints `depois-*`, relatório | todos | R1 a R12 |

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
   CB-204); acima do limite sem Cobrir (CA-687, com um plano de muito sal); "Ver todos" chama
   `aoVerTodos` (CA-688); plano vazio (CB-200); sem sexo e idade (CB-201); preset coletivo (CB-209);
   botão com a variante `lightprimary` (CA-691).
2. Ver falhar. Criar o componente: `calcularAdequacao` + ordem por `adequacaoPct`, `GavetaCobrir` sem
   mudança, `adicionarItem` do domínio para o Adicionar.
3. `npm run check`. Commit `feat(adequacao): cartão do que falta com o cobrir`.

### T4 · Cartão na coluna da etapa 2
1. `e2e/planejador.spec.ts`, no fluxo principal: na etapa 2, o cartão "Micronutrientes" aparece com
   "Cobrir" e "Ver todos" leva à etapa 3; na etapa 1, o cartão não aparece (CA-689).
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
4. **Ordem do cartão: do mais longe para o mais perto da meta.** Na etapa 3, a ordem de sempre vale
   dentro de cada grupo; com o recolhido aberto, a tabela mostra primeiro o que pede ação, então ela
   não bate linha a linha com o Word (que segue Cálcio, Ferro, Magnésio, Zinco...).

## Riscos

- **Linha que muda de grupo na hora do Cobrir.** O e2e do Cobrir procura a linha do Ferro depois de
  adicionar; se o ferro chegar à meta, ela vai para o grupo recolhido. O exemplo do e2e não chega
  (arroz e feijão); se chegar, o teste abre o grupo.
- **`matchMedia` na lista do celular.** Sem `matchMedia` (testes, primeiro quadro) vale a tabela;
  o celular troca para a lista no primeiro quadro, sem piscar, porque o `useMediaQuery` lê o
  navegador direto.

## Validação (15/10/2026)

`npm run check` verde (188 arquivos, 3.094 testes), `npx playwright test` verde (57 testes) e
`npm run build` verde. Detector do impeccable sem achados nos arquivos mudados.

| Critério | Teste |
|---|---|
| CA-680 | `ResumoDoDia.test.tsx` · "Resumo do dia num cartão só (CA-333, CA-680)" |
| CA-681 | `ResumoDoDia.test.tsx` · "CA-10 e CA-681" e "CA-681: no modo rápido" |
| CA-682 | `ResumoDoDia.test.tsx` · "CA-22, CA-23 e CA-682"; `MedidorMacro.test.tsx` · três testes CA-682 |
| CA-683 | `ResumoDoDia.test.tsx` · "CA-24 e CA-683" e "CA-683: no modo rápido" |
| CA-684 | `ResumoDoDia.test.tsx` · "CA-684" |
| CA-685 | `MicrosDoDia.test.tsx` · "CA-685 e CB-203"; e2e "etapa 2: o cartão Micronutrientes" |
| CA-686 | `MicrosDoDia.test.tsx` · "CA-686 e CB-204"; e2e "etapa 2: o cartão Micronutrientes" |
| CA-687 | `MicrosDoDia.test.tsx` · "CA-687" |
| CA-688 | `MicrosDoDia.test.tsx` · "CA-688"; e2e "etapa 2: o cartão Micronutrientes" |
| CA-689 | e2e "etapa 2: o cartão Micronutrientes" |
| CA-690 | `TelaAdequacao.test.tsx` · "CA-690" |
| CA-691 | `TelaAdequacao.test.tsx` · "CA-691"; `MicrosDoDia.test.tsx` · "CA-691" |
| CA-692 | `TelaAdequacao.test.tsx` · dois testes "CA-692"; e2e "CB-208 e CA-692" |
| CA-693 | `TelaAdequacao.test.tsx` · "CA-693" |
| CA-694 | `TelaAdequacao.test.tsx` · dois testes "CA-694" |
| CB-200 | `MicrosDoDia.test.tsx` · "CB-200"; `TelaAdequacao.test.tsx` · "CB-05" |
| CB-201 | `MicrosDoDia.test.tsx` · "CB-201" |
| CB-202 | `MicrosDoDia.test.tsx` · "CB-202"; `TelaAdequacao.test.tsx` · "CB-202" |
| CB-203 | `MicrosDoDia.test.tsx` · "CA-685 e CB-203" |
| CB-204 | `MicrosDoDia.test.tsx` · "CA-686 e CB-204"; `TelaAdequacao.test.tsx` · "CB-204" |
| CB-205 | `MedidorMacro.test.tsx` · "CB-205" |
| CB-206 | `ResumoDoDia.test.tsx` · "CB-206"; `MedidorMacro.test.tsx` · "CB-206" |
| CB-207 | `ResumoDoDia.test.tsx` · "CB-207" |
| CB-208 | e2e "CB-208 e CA-692" (etapas 2 e 3 em 360 px) |
| CB-209 | `MicrosDoDia.test.tsx` · "CB-209" |

**Divergências do plano:** a T7 (gaveta do Cobrir) entrou a pedido do coordenador, com o CA-694; o
botão do cartão virou "Ver todos" na validação, para não repetir o 16 da contagem; as marcas † e ‡
viraram dois componentes de tela (`MarcaSemDado`, `MarcaLimite`), usados pela tabela, pela lista e
pelo cartão.

## Validação da rodada de revisão (15/10/2026)

`npm run check` verde (190 arquivos, 3.120 testes), `npx playwright test` verde (58 testes) e
`npm run build` verde. Detector do impeccable sem achados.

| Critério | Teste |
|---|---|
| CA-695 | `arredondarNoEstado.test.ts`; `ResumoDoDia.test.tsx` · "CA-695" (89,6% e 110,4%) |
| CA-696 | `MedidorMacro.test.tsx`, `MicrosDoDia.test.tsx`, `FaixaResumo.test.tsx` · "CA-696"; `TelaAdequacao.test.tsx` · dois testes "CA-696" |
| CA-697 | `MicrosDoDia.test.tsx` · "CA-697"; `TelaAdequacao.test.tsx` · dois testes "CA-697"; e2e "etapa 2: o cartão Micronutrientes" |
| CA-698 | `TelaAdequacao.test.tsx` · "CA-698" |
| CA-699 | `MicrosDoDia.test.tsx` · dois testes "CA-699" |
| CA-700 | `TelaAdequacao.test.tsx` · "CA-700" e os testes de Cobrir com o nome; e2e com "Cobrir Ferro" |
| CA-701 | `TelaAdequacao.test.tsx` · dois testes "CA-701"; e2e "etapa 2: o cartão Micronutrientes" e "CB-208 e CA-692" |
| CA-702 | `ResumoDoDia.test.tsx` · dois testes "CA-702" e "CA-684" |
| CA-703 | `MicrosDoDia.test.tsx` · "CA-703 e CB-202" e "CA-703" (descrição da lista) |
| CA-704 | e2e "CA-704" (troca de plano e voltar do navegador) |
| CB-202 (2ª parte) | `MicrosDoDia.test.tsx` · "CA-703 e CB-202" |
| CB-204, CB-209, CA-694, CA-690 (mais firmes) | `MicrosDoDia.test.tsx` e `TelaAdequacao.test.tsx` · "Testes mais firmes…" |

**Divergências da rodada:** o arredondamento também vale na faixa do topo da etapa 3 (mesmo erro,
mesma regra); a contagem do cartão passou a "N para cobrir." porque, sem o sódio, "N de 16 abaixo da
meta" deixaria de ser verdade; o foco depois de "Adicionar" no cartão não foi mexido (quem devolve o
foco é a gaveta, que fica com a outra frente).

## Integração das três frentes (15/10/2026)

A branch de integração junta "sugestões com critério", "painel lateral enxuto" e "impressão do plano".
Os itens abaixo são da integração; cada tarefa é um commit, com teste antes do código.

| # | Tarefa | Arquivos | Depende de |
|---|---|---|---|
| I0 | Spec e plano: D-211, D-212, CA-711 a CA-714, CB-211 | `SPEC.md`, `PLAN.md` | — |
| I1 | (a) Arredondamento no sentido do estado só quando o comum cruzaria o limite (D-211, CA-711, CA-712) | `src/domain/arredondarNoEstado.ts` (+ teste), `src/domain/energia.ts` (a faixa padrão do gasto vira constante exportada), `src/ui/resumo/ResumoDoDia.tsx`, `src/ui/resumo/FaixaResumo.tsx`, `design-system/componentes/nutricao/MedidorMacro.tsx`, `src/ui/adequacao/MicrosDoDia.tsx`, `src/ui/adequacao/estiloAdequacao.ts`; testes em `ResumoDoDia.test.tsx`, `FaixaResumo.test.tsx`, `MedidorMacro.test.tsx`, `MicrosDoDia.test.tsx`, `TelaAdequacao.test.tsx` | I0 |
| I2 | (c) O teste do CB-204 do cartão deixa de depender de alguma sugestão cobrir 100%: a gaveta recebe uma sugestão controlada, calculada no teste para levar a vitamina A à meta sem mexer nos outros | `src/ui/adequacao/MicrosDoDia.test.tsx` | I0 |
| I3 | (b) Foco ao fechar a gaveta do Cobrir (D-212, CA-713, CB-211), no cartão e na etapa 3 | `src/ui/adequacao/focoDoCobrir.ts` (novo, + teste), `GavetaCobrir.tsx` (prop do foco ao fechar), `MicrosDoDia.tsx`, `TelaAdequacao.tsx`, `ItemListaAdequacao.tsx` (marca `data-cobrir` no botão); testes em `MicrosDoDia.test.tsx` e `TelaAdequacao.test.tsx`; a sugestão controlada do I2 passa para `cobrirControlado.test-utils.ts`, usada pelos dois | I2 |
| I4 | (d) Sódio sem Cobrir de ponta a ponta (CA-714): e2e no cartão, na tabela e na lista do celular; a gaveta aberta para o sódio mostra a mensagem do domínio | `e2e/planejador.spec.ts`, `src/ui/adequacao/GavetaCobrir.test.tsx` | I0 |
| I5 | Validação: `npm run check`, `npx playwright test`, `npm run build`, `node scripts/conferir-publicacao.mjs`, `npm run test:csp` | este plano | I1 a I4 |

**Decisões da integração para revisar:**

1. **Foco também na etapa 3 (D-212).** O ponto em aberto falava do cartão; a etapa 3 tem o mesmo defeito
   (a linha que chega à meta perde o Cobrir e vai para o recolhido), então a mesma regra vale lá.
2. **"Próximo" é o que estava abaixo dele na lista quando a gaveta abriu**, e não o que ocupa a mesma
   posição depois: a lista se reordena quando o plano muda.
3. **Sem o limite do estado**, o arredondamento fica no sentido do estado, que nunca desmente a cor. Hoje
   todo lugar passa o limite.

### Validação da integração (15/10/2026)

`npm run check` verde (195 arquivos, 3.372 testes; lint com 0 erros e o aviso antigo de
`MolduraPublica.tsx`), `npx playwright test` verde (64 testes, numa cópia da configuração na porta
4527, apagada depois), `npm run build` verde, `node scripts/conferir-publicacao.mjs` verde e
`npm run test:csp` verde (3 testes).

| Critério | Teste |
|---|---|
| CA-711 | `arredondarNoEstado.test.ts` · "CA-711"; `ResumoDoDia.test.tsx` · "CA-695" e "CA-711"; `FaixaResumo.test.tsx` · "CA-696" (com o 125,2%) |
| CA-712 | `arredondarNoEstado.test.ts` · "CA-712"; `MedidorMacro.test.tsx` · dois testes "CA-712"; `MicrosDoDia.test.tsx` · dois testes "CA-712"; `TelaAdequacao.test.tsx` · três testes "CA-712" |
| CA-713 | `focoDoCobrir.test.ts` · quatro testes "CA-713"; `MicrosDoDia.test.tsx` · quatro testes "CA-713"; `TelaAdequacao.test.tsx` · dois testes "CA-713" |
| CA-714 | e2e "CA-714" (cartão, tabela e lista do celular); `GavetaCobrir.test.tsx` · "CA-714" |
| CB-211 | `MicrosDoDia.test.tsx` · "CB-211"; `focoDoCobrir.test.ts` · "CA-713 e CB-211" |
| CB-204 (item c) | `MicrosDoDia.test.tsx` · "CB-204", com a sugestão controlada |

**Divergências da integração:** o foco já se perdia antes, até ao fechar a gaveta sem adicionar (a
gaveta não tem gatilho próprio); a correção vale para os dois casos, e o D-212 diz isso. O teste do
modo rápido voltou a "21% da meta", o número de antes do D-209. Os testes do CA-714 passaram de
primeira: são trava, porque a tela e o domínio já estavam de acordo.

## Revisão final da integração (15/10/2026)

O coordenador revisou a branch inteira (`revisao-final.md`). Um commit por item, com a nota de spec antes do código
(este commit traz as notas do I1, do M4 e do M6). O M3 (meta com casa decimal) fica para depois: já era assim antes da
integração.

| # | Item | Arquivos |
|---|---|---|
| F1 | I1 · "(peso cru)" em broto de feijão, fruta-pão e pequi, como os outros 8 que só existem crus; teste com os 11 | `src/domain/nomeParaPaciente.ts` (+ teste); spec `impressao-do-plano` (seção 2, CA-625) |
| F2 | I2 · CA-34 (`planejador-metanutri`, SPEC e VALIDATION) e CA-210 (`estilo-spora`) anotados: o sódio não tem Cobrir; os dois no cabeçalho desta spec | só specs |
| F3 | M1 · a tabela de decisões sem a linha em branco antes do D-211 | `SPEC.md` |
| F4 | M2 · CA-319 na nota do topo da `pdf-e-telas-limpas`; o cabeçalho desta spec cita só CA-333 e CA-338 dela | só specs |
| F5 | M7 · espaço que faltava em `energia.ts` | `src/domain/energia.ts` |
| F6 | M4 · o foco usa a ordem de todos os que pedem Cobrir, não só dos 5 à vista (CA-713 completo) | `MicrosDoDia.tsx`, `TelaAdequacao.tsx`, `focoDoCobrir.ts` (+ testes) |
| F7 | M5 · testes das emendas: CB-204 da etapa 3 com sugestão controlada; restrições do cartão chegam ao Cobrir; % do macro na faixa do topo (CA-712) e CA-711 em teste próprio | `TelaAdequacao.test.tsx`, `MicrosDoDia.test.tsx`, `FaixaResumo.test.tsx` |
| F8 | M6 · a folha pede 4 trocas e mostra 2 depois do corte por nome (CB-188); as trocas estranhas vão para o Apêndice C da `sugestoes-com-criterio` | `src/domain/folhaDieta.ts` (+ teste), `src/ui/exportar/FolhaDieta.tsx`; spec `sugestoes-com-criterio` (Apêndice C) |
