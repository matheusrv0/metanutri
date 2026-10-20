# PLAN — Receitas com cálculo

**Spec de origem:** `./SPEC.md` (D-270 a D-279, CA-860 a CA-889, CB-270 a CB-279)
**Status:** pedido pelo dono em 19/10/2026 ("resolva todo o resto"); aprovação pelas telas antes de publicar; T1 a
T12 feitas em 19/10/2026. Os testes de tela novos ficaram em arquivos próprios (não nos de sempre), para não brigar com
a frente que revisa as telas da área de trabalho ao mesmo tempo.

## Abordagem

1. **A cópia no item do plano.** `ItemPlano` ganha um campo opcional `receita` com a cópia da receita (nome,
   ingredientes `{ alimentoId, gramas }`, porções, nome da porção, peso pronto e preparo). O item de receita guarda
   `alimentoId: 0` (nenhum alimento da base tem id 0) e `gramas` = o peso da receita pronta que vai no prato. Ficar no
   item (e não numa lista do plano) faz a cópia andar sozinha em tudo que já copia itens: `clonarPlano` (modelo e
   duplicar), a troca de id de produto na junção da nuvem (`trocarAlimentos` troca `alimentoId` em qualquer
   profundidade, então os ingredientes acompanham) e a cópia do plano na nuvem.
2. **Um módulo puro para a cópia**, `receitaNoPlano.ts`: lê a cópia com segurança (CB-273), calcula peso pronto, peso
   da porção, porções, o texto da porção em meias medidas e os ingredientes na quantidade servida. `totais.ts` abre o
   item de receita nos ingredientes proporcionais: a falta de dado conta por ingrediente (D-275), e ingrediente que
   sumiu conta como sem dado em vez de quebrar (CB-271). Tudo que soma pelo `totaisDeItens`/`totaisDoPlano` (cartão,
   painel, adequação, cobrir, memorial, missões) passa a somar receita sem mudar.
3. **A biblioteca**, `receitas.ts`: o tipo `Receita`, validação, repositório na chave `metanutri:receitas` (ids texto
   aleatórios, que não colidem entre aparelhos), duplicar, a cópia para o plano e a busca de receitas com a mesma
   leitura da entrada rápida (`interpretarEntrada`). A chave entra em `CHAVES_DE_DADOS`, nas `LISTAS` da junção
   (`copiaDaConta.ts`, item por item com lápide) e na migração dos dados de antes da conta (`donoDosDados.ts`).
4. **Telas.** `TelaReceitas` (lista e editor no mesmo lugar) na rota `#/receitas`, com item no menu. O editor usa a
   `EntradaRapida` para os ingredientes e a `LinhaItem` para cada ingrediente (o ingrediente tem a mesma forma de um
   item). Na refeição, a `EntradaRapida` mostra as receitas quando recebe `aoAdicionarReceita`; a `LinhaItem` mostra a
   receita. Mudança mínima em `CartaoRefeicao` e `TelaPlano`, porque outra frente mexe nas telas da área de trabalho.
5. **Saídas.** Folha (`folhaDieta.ts`, `FolhaDieta.tsx`), link (`dietaDoLink.ts`, `MeuPlano.tsx`) e Word
   (`aconselhamento-docx.ts`) leem a cópia pelo mesmo módulo.

**Suposições (para revisar):**
- `alimentoId: 0` marca o item de receita; a TACO começa no id 1 e os produtos em 900 000 (conferido em
  `src/data/alimentos.json` e `produtos.ts`).
- Nenhuma dependência nova; nenhum SQL; nenhuma função do Supabase.
- A trava de 256 KB do link e a de 5 MB da cópia da conta continuam bastando (uma receita tem algumas centenas de bytes).
- "porção" passa a ser feminino em `formatarQuantidadeMedida` ("meia porção"); nenhuma medida da base usa "porção"
  na escolha de medida (`PREFERENCIA_MEDIDAS` não tem), então nada muda para alimento.

## Arquivos

| Arquivo | Ação | Tarefa |
|---|---|---|
| `specs/receitas-com-calculo/SPEC.md`, `PLAN.md` | criar | T1 |
| `src/domain/tipos.ts` | alterar: `IngredienteReceita`, `ReceitaDoPlano`, `ItemPlano.receita?` | T2 |
| `src/domain/receitaNoPlano.ts` (+ teste) | criar | T2 |
| `src/domain/totais.ts` (+ teste) | alterar: abre a receita nos ingredientes | T2 |
| `src/domain/busca.ts` | alterar: "porção" feminina | T2 |
| `src/domain/plano.ts` (+ teste) | alterar: `adicionarReceita` | T2 |
| `src/domain/receitas.ts` (+ teste) | criar | T3 |
| `src/domain/perfil.ts`, `copiaDaConta.ts`, `donoDosDados.ts` (+ testes, `sincronia.test.ts`) | alterar | T4 |
| `src/ui/estado/usarReceitas.ts` | criar | T5 |
| `src/ui/receitas/TelaReceitas.tsx`, `EditorReceita.tsx`, `ResumoDaPorcao.tsx` (+ teste) | criar | T5 |
| `src/ui/navegacao.ts` (+ teste), `src/ui/layout/MenuLateral.tsx`, `src/ui/AreaDeTrabalho.tsx` | alterar: rota e menu | T5 |
| `src/ui/plano/EntradaRapida.tsx`, `LinhaItem.tsx`, `CartaoRefeicao.tsx`, `TelaPlano.tsx` | alterar | T6 |
| `src/ui/plano/receitaNaRefeicao.test.tsx` | criar (arquivo novo de teste, para não brigar com a frente que mexe nos testes da área de trabalho) | T6 |
| `src/domain/receitaNasRegras.test.ts` | criar: testes de guarda de cobrir, missões, trocas, modelo e duplicar | T7 |
| `src/domain/folhaDieta.ts`, `src/ui/exportar/FolhaDieta.tsx` | alterar | T8 |
| `src/domain/folhaComReceita.test.ts`, `src/ui/exportar/FolhaComReceita.test.tsx` | criar (testes novos em arquivo próprio) | T8 |
| `src/domain/dietaDoLink.ts`, `src/ui/missoes/MeuPlano.tsx` | alterar | T9 |
| `src/domain/dietaComReceita.test.ts`, `src/ui/missoes/MeuPlanoComReceita.test.tsx` | criar (testes novos em arquivo próprio) | T9 |
| `src/export/aconselhamento-docx.ts` | alterar | T10 |
| `src/export/docxComReceita.test.ts` | criar (teste novo em arquivo próprio) | T10 |
| `src/seguranca/xssReceitas.test.tsx`, `src/domain/receitaDadosAntigos.test.ts` | criar: nome e preparo com código; dados de antes | T11 |
| `e2e/receitas.spec.ts` | criar | T12 |
| `docs/backlog.md` | alterar: B-32 pronto, à espera da aprovação (as decisões só entram em `docs/decisoes.md` quando o dono aprovar) | T12 |

## Tarefas

Cada tarefa é um commit, em TDD: o teste primeiro, vendo falhar, depois o código.

- [x] **T1** — SPEC e PLAN. *Verifica:* revisão.
- [x] **T2** — A cópia da receita no plano. `ReceitaDoPlano` e `ItemPlano.receita?` em `tipos.ts`;
  `receitaNoPlano.ts` com `ID_DE_RECEITA`, `receitaDoItem` (cópia válida ou `null`, CB-273), `itemDeReceita` (item
  com cópia, válida ou não), `pesoProntoDe`, `pesoDaPorcao`, `porcoesDe`, `textoDaPorcao` (meias medidas a 15%,
  CB-279), `ingredientesNaQuantidade`, `receitasDoPlano` (cópias distintas, CB-278); `totaisDeItens` abre a receita
  (CA-874, CA-875, CB-271, CB-272, CB-273); `adicionarReceita` em `plano.ts`. *Testes:* `receitaNoPlano.test.ts`,
  `totais.test.ts`, `plano.test.ts`. *Depende de:* T1.
- [x] **T3** — A biblioteca. `receitas.ts`: `Receita`, `validarReceita` (CB-270), `criarRepositorioReceitas`
  (listar por nome, obter, salvar com `atualizadoEm`, duplicar com `nomeDaCopia`, excluir; sem armazenamento, em
  memória), `copiaParaOPlano`, `totaisDaPorcao`, `filtrarReceitas` (CA-866) e `buscarReceitas` (CA-871, CA-872).
  *Testes:* `receitas.test.ts`. *Depende de:* T2.
- [x] **T4** — As receitas na nuvem. `metanutri:receitas` em `CHAVES_DE_DADOS`, em `LISTAS` (`receitas/<id>`, tempo
  `atualizadoEm`) e em `juntar` da migração (como os modelos). *Testes:* `copiaDaConta.test.ts` (CA-867, CA-868),
  `donoDosDados.test.ts` (CA-867), `sincronia.test.ts` (CA-868, CA-869, CB-275). *Depende de:* T3.
- [x] **T5** — A tela Receitas. `usarReceitas` (lê ao montar, relê quando outra aba grava), `TelaReceitas` (lista,
  busca, vazia, aviso sem armazenamento, excluir com `DialogoExcluir`), `EditorReceita` (nome, ingredientes com
  `EntradaRapida` e `LinhaItem`, rendimento, nome da porção, peso pronto, preparo, erros do CB-270) e `ResumoDaPorcao`
  (CA-862, †). Rota `#/receitas`, item "Receitas" no grupo Alimentos. *Testes:* `TelaReceitas.test.tsx` (CA-860 a
  CA-866, CB-270, CB-274), `navegacao.test.ts`. *Depende de:* T3.
- [x] **T6** — A receita na refeição. `EntradaRapida` com `aoAdicionarReceita` (CA-871, CA-872); `LinhaItem` mostra
  a receita (CA-873); `CartaoRefeicao` e `TelaPlano` levam a receita ao plano como cópia. *Testes:*
  `receitaNaRefeicao.test.tsx` (CA-870 a CA-874 na tela). *Depende de:* T5.
- [x] **T7** — Onde a receita não entra. Testes de guarda (o código atual já ignora o id 0; se algum falhar, a
  correção vai junto): cobrir (CA-877), missões (CA-878), trocas (CA-882), modelo e duplicar (CA-876). *Depende de:* T2.
- [x] **T8** — A folha impressa. `linhaDaFolha` (nome e quantidade de alimento ou receita, CA-879),
  `receitasDaFolha` (CA-880, CB-278) e `comprasDaFolha` abrindo a receita (CA-881) em `folhaDieta.ts`; `FolhaDieta`
  usa as três. *Testes:* `folhaComReceita.test.ts`, `FolhaComReceita.test.tsx`. *Depende de:* T2.
- [x] **T9** — O link do paciente. `itemDaDieta` com receita (CA-883), `receitasDoPlano` na cópia e em `lerDieta`
  (CA-884, CA-885), `MeuPlano` com a seção. *Testes:* `dietaComReceita.test.ts`, `MeuPlanoComReceita.test.tsx`.
  *Depende de:* T2.
- [x] **T10** — O Word. `descreverItem` com receita (CA-886) e as receitas na seção (CA-887). *Testes:*
  `docxComReceita.test.ts`. *Depende de:* T2.
- [x] **T11** — Dados antigos e texto com código. *Testes:* CA-888 (`receitaDadosAntigos.test.ts`: plano, backup e
  campo de texto de antes), CB-276 (`xssReceitas.test.tsx`). *Depende de:* T5 a T10.
- [x] **T12** — Ponta a ponta, prints e documentos. `e2e/receitas.spec.ts` (criar receita, pôr na refeição, painel,
  folha, link, 360 px: CA-889); prints de antes e depois; B-32 no backlog.
  *Verifica:* `npm run check`, `npx playwright test`, `npm run build`. *Depende de:* todas.

## Riscos e decisões para revisar

- R-270 a R-274 da spec.
- **DP-270** · O item de receita tem `alimentoId: 0` em vez de um tipo separado de item. Separar o tipo obrigaria todo
  arquivo que lê item a mudar junto (inclusive telas que outra frente está mexendo); o id 0 nunca acha alimento, então
  quem não conhece receita a trata como "alimento não encontrado" (trocas e missões já ignoram). Os que precisam
  calcular (totais, folha, link, Word, linha do plano) leem a cópia por `receitaNoPlano.ts`.
- **DP-271** · As gramas do item são o peso da receita pronta servida; a porção é derivada (gramas ÷ peso da porção).
  Assim todo filtro "gramas > 0" e a soma proporcional continuam valendo.

## Rodada da revisão (19/10/2026)

Revisão do coordenador em `…\scratchpad\rodada-1910\revisao-receitas.md`: 0 crítico, 2 importantes (I-1, I-2), 11
menores (M-1 a M-11). Decisão do coordenador para o I-1: publicar em duas vezes (D-274a), com tela de erro na raiz
(D-274b) e conferência da versão nova ao voltar para a aba e a cada 60 min (D-274c). Um commit por item, em TDD.

| Arquivo | Ação | Item |
|---|---|---|
| `specs/receitas-com-calculo/SPEC.md`, `PLAN.md` | alterar | R0 |
| `src/domain/receitas.ts`, `src/ui/plano/TelaPlano.tsx`, `src/ui/plano/receitaNaRefeicao.test.tsx`, `e2e/receitas.spec.ts` | alterar: a constante `RECEITAS_NA_REFEICAO` | R1 |
| `src/ui/aplicativo/LimiteDeErro.tsx`, `TelaDeErro.tsx`, `recarregarComVersaoNova.ts` (+ `LimiteDeErro.test.tsx`), `src/main.tsx` | criar e alterar: tela de erro na raiz | R2 |
| `src/ui/aplicativo/registrarAplicativo.ts` (+ `registrarAplicativo.test.ts`) | alterar: conferir ao voltar e a cada 60 min | R3 |
| `src/domain/receitas.ts`, `src/ui/plano/EntradaRapida.tsx` e os testes | alterar: receita acima só sem alimento com o mesmo começo | R4 |
| `src/domain/receitas.ts` (+ teste) | alterar: sem número, o texto todo é o nome | R5 |
| `src/domain/receitaNoPlano.ts`, `src/domain/receitas.ts` (+ testes), `src/domain/donoDosDados.test.ts` | alterar: ao menos um ingrediente com gramas | R6 |
| `src/domain/receitas.ts` (+ teste) | alterar: memória única sem armazenamento | R7 |
| `src/domain/receitas.ts`, `src/ui/receitas/EditorReceita.tsx` (+ testes) | alterar: limites com contagem | R8 |
| `src/domain/folhaDieta.ts` (+ teste) | alterar: compras sem o ingrediente removido | R9 |
| `src/domain/busca.ts`, `src/domain/receitaNoPlano.ts`, `src/domain/receitas.ts` (+ testes) | alterar: concordância | R10 |
| `src/ui/receitas/TelaReceitas.tsx` (+ teste) | alterar: "— kcal" | R11 |
| `src/domain/dietaComReceita.test.ts`, `src/domain/copiaDaConta.test.ts`, `e2e/receitas.spec.ts` | alterar: testes que faltavam (CB-277, D-170, CA-889 na linha do plano) | R12 |
| `src/ui/receitas/EditorReceita.tsx` | alterar: título de seção sem caixa alta | R13 |
| `src/domain/receitas.ts` (`fontesDaSoma`), `src/ui/receitas/ResumoDaPorcao.tsx` (+ `ResumoDaPorcao.test.tsx`) | alterar: a fonte de cada parte | R14 |
| `src/ui/usarRota.ts`, `src/ui/receitas/EditorReceita.tsx` (+ `sairSemSalvar.test.tsx`) | alterar: perguntar antes de sair sem salvar | R15 |

- [ ] **R0** — Notas na SPEC e no PLAN (D-274, D-274a a D-274c, CAs, CBs e R-270 revistos; M-10; M-11). *Verifica:* revisão.
- [ ] **R1** — I-1a: `RECEITAS_NA_REFEICAO = false`; `TelaPlano` só passa a entrada de receita com ela ligada (prop
  `receitasNaRefeicao`, padrão a constante). *Testes:* as duas situações (CA-871a); o e2e põe a receita no plano pelos
  dados, não pela busca.
- [ ] **R2** — I-1b: `LimiteDeErro` na raiz, com "Recarregar" (`recarregarComVersaoNova`: `getRegistration()`,
  `update()` com prazo, `reload()`). *Testes:* CA-888a, nada apagado.
- [ ] **R3** — I-1c: `registrarAplicativo` confere a versão no `visibilitychange` e a cada 60 min (`onRegisteredSW`).
  *Testes:* CA-888b.
- [ ] **R4** — I-2: `buscarReceitas` recebe os alimentos achados; receita acima só sem alimento que comece pelo termo.
  *Testes:* "Banana amassada com aveia" e "Arroz com legumes" (CA-871).
- [ ] **R5** — M-1. *Testes:* "copo da felicidade", "fatia húngara" (CA-872).
- [ ] **R6** — M-2. *Testes:* CB-273.
- [ ] **R7** — M-3. *Testes:* CB-274.
- [ ] **R8** — M-4: 120 e 4.000 letras, contagem visível, validação. *Testes:* CA-861a.
- [ ] **R9** — M-5. *Testes:* CB-271.
- [ ] **R10** — M-6. *Testes:* CA-872, CB-279.
- [ ] **R11** — M-7. *Testes:* CA-861.
- [ ] **R12** — M-8. *Testes:* CB-277, D-170 da chave das receitas, CA-889 na linha do plano.
- [ ] **R13** — M-9a. *Verifica:* teste da tela (o título "Ingredientes").
- [ ] **R14** — M-9b. *Testes:* CA-862.
- [ ] **R15** — M-9c. *Testes:* CA-863a.
- [ ] **R16** — Prints de depois refeitos (publicação 1, e a busca também com a constante ligada, para a publicação 2),
  `npm run check`, `npx playwright test`, `npm run build`, relatório.

**M-11 (um componente por arquivo):** `ReceitaNaFolha` (em `FolhaDieta.tsx`) e `ReceitaDoLink` e `Receitas` (em
`MeuPlano.tsx`) ficam no arquivo da tela, como os outros pedaços que esses arquivos já tinham (`Quantidade`, `Itens`,
`RotuloDaOpcao`, `Texto`). Decisão do coordenador: manter o padrão do arquivo; fica anotado para o dono.

**DP-272** · A tela de erro é um componente de classe: o React só segura erro de desenho com `componentDidCatch` e
`getDerivedStateFromError`, que não existem em componente de função. É a única exceção à convenção.
