# Busca de substitutos · Plano de implementação

**Spec:** `specs/busca-substitutos/SPEC.md` (protótipo aprovado em 03/11/2026; "apenas faça").

**Objetivo:** no Principal da refeição, cada alimento abre um painel que busca substitutos por um ou mais nutrientes,
com porção em medida caseira, diferença por nutriente, Comparar, Substituir (com Desfazer) e Adicionar como opção; a
opção do item aparece embaixo dele no plano, na folha, no link e no Word.

**Arquitetura:**
- **Domínio da busca** (puro, testável sem tela): `src/domain/buscaDeSubstitutos.ts` faz a conta (D-1103 a D-1105), os
  filtros (D-1106, D-1107), a ordem (D-1109), as frases e a comparação (D-1112). `src/domain/grupoDeSubstituicao.ts`
  diz o grupo de cada alimento (D-1108). `trocas.ts` só passa a **exportar** os ajudantes que a busca reaproveita
  (troca razoável, papel no prato, forma do ovo e da verdura, cru), sem mudar o resultado da folha.
- **Domínio da opção:** o tipo `OpcaoDoItem` e o campo opcional `ItemPlano.opcoesDoItem` (`tipos.ts`, só o trecho do
  item); a leitura segura em `src/domain/opcoesDoItem.ts`; as operações imutáveis em `plano.ts` (substituir, devolver,
  pôr e tirar opção).
- **Para o paciente:** a folha (`folhaDieta.ts` + `FolhaDieta.tsx`), o link (`dietaDoLink.ts` + `MeuPlano.tsx`), o Word
  (`aconselhamento-docx.ts`) e o aviso da janela de imprimir (`restricoes.ts`).
- **Tela:** o estado do painel mora em `TelaPlano` (um painel por tela). Em `xl`, `TelaPlano` ocupa as duas colunas da
  grade da área de trabalho e põe o painel ao lado das refeições (D-1116); abaixo, o painel é um `Sheet` de baixo, pelo
  `useMediaQuery`, como a ficha da Tabela de alimentos. Componentes novos, um por arquivo: `PainelSubstitutos`,
  `BuscaDeSubstitutos`, `CartaoCandidato`, `CalculadoraDeSubstituto` (a calculadora que saiu de `DialogoSubstituto`),
  `JanelaComparar`, `AvisoDeTroca` e `OpcoesDoItem`. `DialogoSubstituto.tsx` sai.

## Restrições

- Sem dependência nova. Sem mexer em `.env.local`, `.claude/settings*`, nem nos arquivos dos ramos em andamento
  (`AreaDeTrabalho.tsx`, `persistencia.ts`, `duplicar.ts`, `caso.ts`, `TelaMissoesPaciente.tsx`, os de antropometria e
  os de importar pacientes). Em `tipos.ts` (também mexido pelo ramo `motor-antropometria`), só o trecho do item.
- TDD: o teste do critério primeiro, vermelho, depois o código. `npm run check` verde ao fim de cada tarefa; um commit
  por tarefa, em Conventional Commits, em português, terminando com a linha `Co-Authored-By`.
- Sem `any`, sem `!`; biblioteca pelo alias `@ds/...`; cor, espaço e raio por token; tema claro e escuro pelos tokens.

## Ordem e dependências

| # | Tarefa | Arquivos | Critérios | Depende de |
|---|---|---|---|---|
| T1 | Spec e plano | `specs/busca-substitutos/SPEC.md`, `PLAN.md` | — | — |
| T2 | Grupos de substituição | `src/domain/grupoDeSubstituicao.ts` (+ teste), `src/domain/trocas.ts` (só `export`) | CA-2111, CA-2112 (domínio) | T1 |
| T3 | A busca: conta, porção, frases, filtros, restrições, ordem e comparação | `src/domain/buscaDeSubstitutos.ts` (+ teste) | CA-2102 a CA-2116 (domínio), CA-2117 (linhas), CB-1100, CB-1109 | T2 |
| T4 | A opção do item no domínio | `src/domain/tipos.ts` (`OpcaoDoItem`, campo no item), `src/domain/opcoesDoItem.ts` (+ teste), `src/domain/plano.ts` (+ teste) | CA-2118 a CA-2120 (domínio), CB-1101, CB-1105, CB-1106, CB-1108 | T1 |
| T5 | A opção para o paciente | `src/domain/folhaDieta.ts`, `src/ui/exportar/FolhaDieta.tsx`, `src/domain/dietaDoLink.ts`, `src/ui/missoes/MeuPlano.tsx`, `src/export/aconselhamento-docx.ts`, `src/domain/restricoes.ts` e os testes deles | CA-2122 a CA-2125, CB-1102, CB-1103 | T4 |
| T6 | O painel na tela | `src/ui/plano/PainelSubstitutos.tsx`, `BuscaDeSubstitutos.tsx`, `CartaoCandidato.tsx`, `CalculadoraDeSubstituto.tsx`, `JanelaComparar.tsx`, `AvisoDeTroca.tsx`, `OpcoesDoItem.tsx` (novos); `TelaPlano.tsx`, `CartaoRefeicao.tsx`, `LinhaItem.tsx`; sai `DialogoSubstituto.tsx`; testes: `painelSubstitutos.test.tsx` (novo, no lugar de `DialogoSubstituto.test.tsx`), `LinhaItem.test.tsx`, `receitaNaRefeicao.test.tsx` | CA-2100 a CA-2102, CA-2115 a CA-2121, CA-2125 (linha), CA-2127, CB-1104, CB-1107 | T3, T4 |
| T7 | No navegador | `e2e/busca-substitutos.spec.ts` (novo); `e2e/planejador.spec.ts` e `e2e/correcao-a.spec.ts` (o fluxo antigo da calculadora vira o modo manual do painel) | CA-2101, CA-2103, CA-2117 a CA-2121, CA-2126 | T6 |
| T8 | Validação e acabamento | prints em 360, 390 e 1440 px nos dois temas (`scratchpad/substitutos/prints/`); passada de `impeccable`, `emil-design-eng`, `ui-ux-pro-max` e `break-ui`; correções que saírem delas | todos | T7 |

## Verificação de cada tarefa

- T2 e T3: `npx vitest run src/domain/grupoDeSubstituicao.test.ts src/domain/buscaDeSubstitutos.test.ts src/domain/trocas.test.ts`
  (as trocas da folha não mudam).
- T4: `npx vitest run src/domain/plano.test.ts src/domain/opcoesDoItem.test.ts`.
- T5: `npx vitest run src/domain/folhaDieta.test.ts src/domain/dietaDoLink.test.ts src/ui/exportar src/ui/missoes src/export src/domain/restricoesNoPlano.test.ts`.
- T6: `npx vitest run src/ui/plano`.
- T7: `npx playwright test e2e/busca-substitutos.spec.ts e2e/planejador.spec.ts e2e/correcao-a.spec.ts`.
- T8: `npm run check`, `npm run e2e`, `npm run test:csp`.

## Riscos e decisões para revisar

1. **A coluna do Resumo do dia desce enquanto o painel está aberto (D-1116).** Pôr o painel exatamente no lugar dela
   exigiria mexer em `AreaDeTrabalho.tsx`, que dois ramos em andamento estão mudando. `TelaPlano` ocupa as duas colunas
   só com o painel aberto; ao fechar, tudo volta. Depois dos merges, dá para mover o painel para a coluna da direita
   sem mudar o comportamento.
2. **"Usar como substituto 1/2" sai do painel (D-1101).** As abas Substituto 1 e 2 continuam com a entrada rápida; a
   porção equivalente passa a ir para a opção do item. Os testes de CA-41 a CA-43 e o e2e do planejador mudam junto.
3. **A ordem tem faixa de 5% (D-1109)** e diverge do protótipo, que ordenava só pela proximidade.
4. **Campo novo no item do plano.** A cópia na nuvem e o armazenamento guardam o plano inteiro, sem lista de campos:
   o campo passa sem migração. Versões antigas do app ignoram o campo e o preservam ao editar (o item é copiado com
   `...item`).
5. **`tipos.ts` também muda no ramo `motor-antropometria`** (tipos do caso); aqui só o trecho do item: o merge não deve
   conflitar.
