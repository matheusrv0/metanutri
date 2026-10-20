# PLAN — A conduta da nutricionista

**Spec de origem:** `./SPEC.md` (D-290 a D-299, CA-910 a CA-939, CB-290 a CB-299)
**Status:** pedido pelo dono em 20/10/2026 ("Apenas faça"); aprovação pelas telas antes de publicar.

## Abordagem

Cinco partes, na ordem da spec, cada uma em tarefas pequenas e commitáveis, em TDD.

1. **Regra (A).** `prescritivel.ts` ganha três listas por nome: os liberados pela conduta (vencem "fora da rotina" e
   "forma de ingrediente", nunca o "nunca"), o motivo novo "preparação" (fora da rotina) e o motivo novo "gordura
   trans" (nunca). Ganha também `ehSegundaEscolha` (corte gordo + liberados de antes fora da rotina ou pó),
   `ehProcessado` e `ehPratoComposto`, usados pelo cobrir e pelas trocas. O cobrir troca a chave de ordem "magro" por
   "primeira escolha" e ganha os grupos de porção novos. A lista fixa de ids e a trava de texto mudam junto.
2. **Trocas (B).** `trocas.ts` filtra composto (base simples), medida de mais de 4 pedaços e processado (base não
   processada com alternativa não processada), e ordena simples antes de composto e primeira escolha antes de segunda.
3. **Quantidades (C).** O caso ganha `quantidades: 'medida-caseira' | 'gramas'` (padrão na leitura). Uma função de
   domínio, `quantidadeParaPaciente(alimentoId, gramas, modo)`, dá `{ medida, gramas }` com a ponta de faca; a folha,
   a cópia do link e o Word usam ela. Saem `comPeso` e `medidaVaga`. "Meu plano" mostra só a medida, ou só o peso.
4. **Água (D).** O caso ganha `linhaDaAgua: string | null` (nulo = automática). `missoes.ts` exporta a conta dos
   litros; `folhaDieta.ts` dá a linha da folha; a etapa 1 tem o campo; a folha põe a linha no começo de Orientações.
5. **Anamnese (E).** `anamnese.ts` passa a 10 blocos, ganha perguntas de escolha pelo id (cor da urina, trimestre) e
   a versão do roteiro guardado (2), que acrescenta a cor da urina uma vez. A ficha desenha as escolhas com dois
   componentes novos; as cores são tokens novos.

**Suposições (para revisar):**
- O "plano" de que a parceira fala é o caso salvo (`metanutri:caso:<id>`, caso + plano): ele já vai inteiro para a
  nuvem, então os dois campos novos do caso sobem sem chave nova em `CHAVES_DE_DADOS`.
- A "lista de compras" é a da folha impressa (é a única do app).
- A escolha de quantidade fica no cartão Identificação, que é o primeiro da etapa 1 em todo plano novo (os dois modos
  abrem nela). Não há janela nova no fluxo de "Novo plano".

## Arquivos

| Arquivo | Ação | Tarefa |
|---|---|---|
| `specs/conduta-da-nutricionista/SPEC.md`, `PLAN.md` | criar | T1 |
| `src/domain/prescritivel.ts`, `prescritivel.test.ts` | alterar | T2, T3, T5 |
| `src/domain/naoProposto.test-utils.ts` | alterar | T2 |
| `src/domain/cobrir.ts`, `cobrir.test.ts` | alterar | T3 |
| `src/domain/sugestoes.ts`, `sugestoes.test.ts` | alterar | T4 |
| `src/domain/exemplo.ts`, `exemplo.test.ts` | alterar | T4, T9 |
| `src/domain/trocas.ts`, `trocas.test.ts` | alterar | T5 |
| `specs/sugestoes-com-criterio/SPEC.md` | alterar | T6 (notas e Apêndices A e C) |
| `src/domain/tipos.ts`, `src/domain/caso.ts` | alterar | T7, T9 |
| `src/domain/quantidadeNaFolha.ts`, `quantidadeNaFolha.test.ts` | alterar | T7 |
| `src/domain/dietaDoLink.ts`, `dietaDoLink.test.ts` | alterar | T7 |
| `src/export/aconselhamento-docx.ts` (+ teste) | alterar | T7 |
| `src/ui/caso/CartaoIdentificacao.tsx`, `src/ui/caso/etapa1.test.tsx` | alterar | T8 |
| `src/ui/exportar/FolhaDieta.tsx`, `FolhaDieta.test.tsx` | alterar | T8, T9 |
| `src/ui/missoes/MeuPlano.tsx` (+ teste) | alterar | T8 |
| `src/domain/missoes.ts`, `src/domain/folhaDieta.ts` (+ testes) | alterar | T9 |
| `src/ui/caso/TelaCaso.tsx`, `src/ui/caso/CampoAgua.tsx` (novo) | alterar/criar | T9 |
| `src/domain/anamnese.ts`, `anamnese.test.ts` | alterar | T10 |
| `design-system/tokens/tokens.css` | alterar | T11 (as 8 cores da urina) |
| `src/ui/pacientes/AnamneseDaFicha.tsx`, `EscalaDaUrina.tsx` (novo), `EscolhaUnica.tsx` (novo), `anamnese.test.tsx` | alterar/criar | T11 |
| `e2e/anamnese-e-prescricoes.spec.ts`, `e2e/impressao-do-plano.spec.ts`, `e2e/planejador.spec.ts` | alterar | T12 |
| `specs/impressao-do-plano/SPEC.md`, `specs/anamnese-e-prescricoes/SPEC.md`, `specs/dieta-no-link/SPEC.md` | alterar | T12 (nota de substituição) |

## Tarefas

Cada tarefa é um commit, em TDD: o teste primeiro, vendo falhar, depois o código.

- [ ] **T1** — SPEC e PLAN. *Verifica:* revisão.
- [ ] **T2** — Regra: liberados (D-290), preparação (D-291), gordura trans (D-292); lista fixa de ids e trava de
  texto. *Testes:* CA-910, CA-911, CA-912, CA-913 (ids e trava). *Depende de:* T1.
- [ ] **T3** — Cobrir: `ehSegundaEscolha`, grupos de porção novos (D-293). *Testes:* CA-913 (varredura do cobrir),
  CA-914, CA-915. *Depende de:* T2.
- [ ] **T4** — Lista padrão do desjejum e margarina do exemplo. *Testes:* CA-916, CA-917. *Depende de:* T2.
- [ ] **T5** — Trocas: composto, medida realista, processado (D-294 a D-296). *Testes:* CA-919 a CA-923, CA-913
  (varredura das trocas), CA-912 (sem troca para "nunca"). *Depende de:* T2.
- [ ] **T6** — Apêndices A e C da `sugestoes-com-criterio`, gerados do código, com nota datada. *Verifica:* CA-918
  (o Apêndice A bate com a lista fixa do teste). *Depende de:* T5.
- [ ] **T7** — Quantidades no domínio: o campo do caso, `quantidadeParaPaciente`, a cópia do link e o Word.
  *Testes:* CA-925 a CA-930 (domínio), CB-290, CB-291. *Depende de:* T1.
- [ ] **T8** — Quantidades na tela: a escolha na etapa 1, a folha e "Meu plano". *Testes:* CA-924, CA-925, CA-926 e
  CA-928 (tela). *Depende de:* T7.
- [ ] **T9** — Água: a conta, a linha da folha, o campo da etapa 1, o exemplo sem a frase repetida. *Testes:* CA-931
  a CA-933, CB-298, CB-299. *Depende de:* T7 (mesmos arquivos do caso).
- [ ] **T10** — Anamnese no domínio: 10 blocos, perguntas de escolha, versão do roteiro. *Testes:* CA-935, CA-936,
  CA-937, CA-939 (domínio), CB-296, CB-297. *Depende de:* T1.
- [ ] **T11** — Anamnese na tela: escala da urina, escolha única, tokens. *Testes:* CA-934, CA-935, CA-938, CA-939
  (tela). *Depende de:* T10.
- [ ] **T12** — e2e, notas nas specs antigas, prints e validação (lint, typecheck, testes, Playwright, build).
  *Depende de:* todas.

## Riscos e decisões para o dono revisar

- **R-290** · A folha impressa, "Meu plano" e a etapa 1 estão sendo mudadas por outras frentes ao mesmo tempo. Aqui as
  mudanças ficam pequenas: a quantidade troca de função em três linhas da folha, a água entra numa seção que já
  existe, e o campo da água é um componente novo.
- **R-291** · `tokens.css` ganha 8 cores de dado (a escala da urina). Não são cor de marca; ficam iguais nos dois temas.
- **R-292** · A cópia do link de quem tem manteiga ou margarina no plano muda ("ponta de faca"): o cartão do link avisa
  uma vez que o plano mudou (CB-292).
