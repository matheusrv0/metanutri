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
  `JanelaComparar`, `AvisoDeTroca` e `OpcoesDoItem`. `DialogoSubstituto.tsx` sai. A ficha que liga e desliga (os chips de
  nutriente) entra na biblioteca como `ChipAlternavel`, no desenho do `GrupoOpcoes` (atualização do plano durante a T6).

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
| T6 | O painel na tela | `src/ui/plano/PainelSubstitutos.tsx`, `BuscaDeSubstitutos.tsx`, `CartaoCandidato.tsx`, `CalculadoraDeSubstituto.tsx`, `JanelaComparar.tsx`, `AvisoDeTroca.tsx`, `OpcoesDoItem.tsx`, `rotuloDaOpcao.ts` (novos); na biblioteca, `design-system/componentes/forms/ChipAlternavel.tsx` (novo, a ficha de escolha múltipla dos nutrientes) e a entrada dele no `LEIA-ME.md`; `TelaPlano.tsx`, `CartaoRefeicao.tsx`, `LinhaItem.tsx`; sai `DialogoSubstituto.tsx`; testes: `painelSubstitutos.test.tsx` (novo, no lugar de `DialogoSubstituto.test.tsx`), `LinhaItem.test.tsx`, `receitaNaRefeicao.test.tsx` | CA-2100 a CA-2102, CA-2115 a CA-2121, CA-2125 (linha), CA-2127, CB-1104, CB-1107 | T3, T4 |
| T7 | No navegador | `e2e/busca-substitutos.spec.ts` (novo); `e2e/planejador.spec.ts` e `e2e/correcao-a.spec.ts` (o fluxo antigo da calculadora vira o modo manual do painel) | CA-2101, CA-2103, CA-2117 a CA-2121, CA-2126 | T6 |
| T8 | Validação e acabamento | prints em 360, 390 e 1440 px nos dois temas (`scratchpad/substitutos/prints/`); passada de `impeccable`, `emil-design-eng`, `ui-ux-pro-max` e `break-ui`; correções que saírem delas | todos | T7 |
| T9 | Correções da revisão no domínio da busca e das trocas | `src/domain/prescritivel.ts` (a constante `CAFE_OU_CHA`, que sai de `cobrir.ts`), `src/domain/cobrir.ts` (só o import), `src/domain/trocas.ts` (a regex `NAO_EQUIVALE`), `src/domain/buscaDeSubstitutos.ts` (café e chá, açucarados, faixa na porção final, faixa de 5% a partir do melhor, sem a exceção da batata-doce); testes: `buscaDeSubstitutos.test.ts`, `trocaRazoavel.test.ts` (novo) e os de `trocas` e da folha que a D-1121 mude | CA-2107, CA-2108, CA-2128, CA-2129, CA-2135 | T8 |
| T10 | A opção da base ampliada e o uso da opção | `src/domain/tipos.ts` (a cópia do nome na opção), `src/domain/opcoesDoItem.ts`, `src/domain/plano.ts`, `src/domain/baseAmpliada.ts` (`planoUsaBaseAmpliada`), `src/domain/folhaDieta.ts`, `src/domain/dietaDoLink.ts`, `src/export/aconselhamento-docx.ts`, `src/domain/usoDaConta.ts` (`planosComAlimento`), `src/ui/plano/OpcoesDoItem.tsx`; testes: `opcaoDaBaseAmpliada.test.ts` (novo), `usoDaConta.test.ts` | CA-2130, CA-2131, CB-1110 | T9 |
| T11 | Correções da revisão na tela | `src/ui/plano/PainelSubstitutos.tsx` (Esc na gaveta), `CartaoCandidato.tsx` e `JanelaComparar.tsx` (`aria-disabled`, "É o mesmo alimento"), `CalculadoraDeSubstituto.tsx`, `BuscaDeSubstitutos.tsx` (chave de 44 px no toque); testes: `painelSubstitutos.test.tsx`, `e2e/busca-substitutos.spec.ts` | CA-2132, CA-2133, CA-2134 | T10 |
| T12 | Validação da revisão | `npm run check`, `npm run e2e` (com `busca-substitutos` e `planejador`), `npm run test:csp` e as sondas do revisor (`scratchpad/revisao-substitutos/sondas`) | todos | T11 |
| T13 | Spec e plano da rodada 2 | `specs/busca-substitutos/SPEC.md`, `PLAN.md` | — | T12 |
| T14 | A troca equivalente no mesmo grupo (A1) | `src/domain/prescritivel.ts` (`ehPoOuDesidratado`), `src/domain/trocas.ts` (só `export` do `macroDominante`), `src/domain/buscaDeSubstitutos.ts`; teste novo `src/domain/trocaEquivalente.test.ts` | CA-2136, CA-2137, CB-1111 | T13 |
| T15 | "Outro nutriente" pelo teclado (M1) | `src/ui/plano/BuscaDeSubstitutos.tsx`; testes: `src/ui/plano/painelSubstitutos.test.tsx`, `e2e/busca-substitutos.spec.ts` | CA-2115, CA-2138 | T14 |
| T16 | O queijo só com o ovo inteiro (M2) | `src/domain/grupoDeSubstituicao.ts` (+ teste) | CA-2112, CA-2139 | T15 |
| T17 | A folha de verdade no CA-2129 (M3) | `src/domain/trocaRazoavel.test.ts` | CA-2129 | T16 |
| T18 | O nome livre na troca razoável (B1) | `src/domain/trocas.ts` (a regex `NAO_EQUIVALE`); teste: `src/domain/trocaRazoavel.test.ts` | CA-2140 | T17 |
| T19 | O foco depois de "Tirar" (B2) | `src/ui/plano/BuscaDeSubstitutos.tsx`, `src/ui/plano/OpcoesDoItem.tsx`, `src/ui/plano/LinhaItem.tsx` (o endereço do "Remover"); teste: `painelSubstitutos.test.tsx` | CA-2141 | T18 |
| T20 | O botão desligado diz o alimento (B3) | `src/ui/plano/CartaoCandidato.tsx`; testes: `painelSubstitutos.test.tsx` (CA-2120, CA-2132, CA-2134 passam a ler o nome novo) | CA-2142 | T19 |
| T21 | A variedade do mesmo alimento (B4) | `src/domain/trocas.ts` (só `export` do nome da variedade), `src/domain/buscaDeSubstitutos.ts`; teste: `trocaEquivalente.test.ts` | CA-2143 | T20 |
| T22 | Fruta inteira primeiro (B5) | `src/domain/grupoDeSubstituicao.ts` (`ehSucoOuPolpaDeFruta` e a forma da fruta), `src/domain/buscaDeSubstitutos.ts` (a ordem); testes: `grupoDeSubstituicao.test.ts`, `trocaEquivalente.test.ts` | CA-2144 | T21 |
| T23 | Café e chá como item (recomendação 2) | `src/domain/buscaDeSubstitutos.ts`; testes: `buscaDeSubstitutos.test.ts`, `painelSubstitutos.test.tsx` | CA-2145 | T22 |
| T24 | Validação da rodada 2 | `npm run lint`, `npm run typecheck`, `npx vitest run --maxWorkers=4`; e2e `busca-substitutos` e `planejador` (`--workers=2`, na configuração normal, com a trava `trava-e2e` da rodada: vários testes têm a porta escrita dentro); `npm run build` e `npm run test:csp` (com as travas); as sondas r2 e s1 a s8; prints da lista que abre sozinha (leite 150 ml, banana 100 g, arroz 150 g) em 1440 e 390 px | todos | T23 |
| T25 | O toque de 44 px na lista "Outro nutriente" (achado na T24) | `src/ui/plano/BuscaDeSubstitutos.tsx` (a lista transparente cobre também a borda da caixa); teste: `e2e/busca-substitutos.spec.ts` (CA-2126 já confere a lista desde a T15) | CA-2126 | T24 |
| T26 | Spec e plano da rodada 3 | `specs/busca-substitutos/SPEC.md`, `PLAN.md` | — | T25 |
| T27 | O grupo conhecido dispensa o macro dominante (M1) | `src/domain/grupoDeSubstituicao.ts` (`temGrupoConhecido`), `src/domain/buscaDeSubstitutos.ts` (`naTrocaEquivalente`); testes: `src/domain/trocaEquivalente.test.ts` (CA-2136 com a regra a só fora dos grupos; CA-2146 novo) | CA-2136, CA-2137, CA-2146 | T26 |
| T28 | O mesmo alimento, em toda a lista (M2) | `src/domain/buscaDeSubstitutos.ts` (`mesmoAlimentoDe` e a variedade sobre a lista inteira), `src/domain/trocas.ts` (o `nomeDaVariedade` deixa de ser exportado: só a folha o usa, e a folha não muda); testes: `trocaEquivalente.test.ts` (CA-2143 revisto; CA-2147 e CA-2148 novos) | CA-2143, CA-2147, CA-2148 | T27 |
| T29 | A medida do leite e da bebida (B1) | `src/domain/busca.ts` (`medidaParaMostrar` aceita, sem mudar quem já a chama, um filtro das medidas), `src/domain/liquido.ts` (a bebida de soja e o leite semidesnatado em ml), `src/domain/buscaDeSubstitutos.ts` (a porção do líquido em copo ou ml); testes: `buscaDeSubstitutos.test.ts` (CA-2149) | CA-2149 | T28 |
| T30 | O toque de 44 px no "Adicionar em" do Cobrir (recomendação leve 2 da rodada 3: o mesmo defeito da T25, na gaveta do Cobrir; fora da busca, D-802) | `src/ui/adequacao/GavetaCobrir.tsx` (a lista transparente cobre também a borda); teste: `e2e/celular-planejador.spec.ts` (M-010 mede o toque da lista) | D-802 | T29 |
| T31 | Validação da rodada 3 | `npm run lint`, `npm run typecheck`, `npx vitest run --maxWorkers=4`; e2e `busca-substitutos`, `planejador` e `celular-planejador` (`--workers=2`, configuração normal, `trava-e2e`); `npm run build`; as sondas r2 e r3 (`r2-2` e `r2-4` valem pelas cópias `r3-2` e `r3-4`); a varredura da vista padrão antes e depois; prints (leite integral 150 ml, queijo minas, batata inglesa e arroz) | todos | T30 |
| T32 | Spec e plano da rodada 4 | `specs/busca-substitutos/SPEC.md` (D-1125 a, D-1133, D-1134, D-1135, seção 3, CA-2126, CA-2136, CA-2148 revistos; D-1136 a D-1138 e CA-2150 a CA-2152 novos; nota "Para a Mor (rodada 4)"), `PLAN.md`; `src/domain/liquido.ts` (só o comentário do leite semidesnatado, recomendação leve 2) | — | T31 |
| T33 | O macro dominante volta fora do leite e das verduras (M1) | `src/domain/grupoDeSubstituicao.ts` (`dispensaOMacroDominante` no lugar de `temGrupoConhecido`), `src/domain/buscaDeSubstitutos.ts` (`naTrocaEquivalente`); testes: `src/domain/trocaEquivalente.test.ts` (CA-2136 com a regra nova; CA-2150 novo; CA-2146 continua) | CA-2136, CA-2146, CA-2150 | T32 |
| T34 | O mesmo alimento na verdura e nos sinônimos (B1) | `src/domain/buscaDeSubstitutos.ts` (`mesmoAlimentoDe` e `daMesmaFruta`); testes: `trocaEquivalente.test.ts` (CA-2148 revisto; CA-2151 novo) | CA-2148, CA-2151 | T33 |
| T35 | A farinha de mandioca no grupo do arroz e da mandioca (B2) | `src/domain/grupoDeSubstituicao.ts` (o grupo `amido` e o "pronto por pronto"); testes: `src/domain/grupoDeSubstituicao.test.ts` e `trocaEquivalente.test.ts` (CA-2152 novo) | CA-2152 | T34 |
| T36 | Os 44 px medidos com a gaveta parada (recomendação leve 1) | `e2e/busca-substitutos.spec.ts` (CA-2126 espera a animação de subida terminar antes de medir; o limite continua 44 px). O componente já tem `min-h-11` (44 px, valor inteiro): os 43,99997 px são erro de arredondamento da medida no meio da animação, e não altura do componente | CA-2126 | T35 |
| T37 | Validação da rodada 4 | `npm run lint`, `npm run typecheck`, `npx vitest run --maxWorkers=4`; e2e `busca-substitutos`, `planejador` e `celular-planejador` (`--workers=2`, configuração normal, `trava-e2e`); `npm run build`; as sondas r2 (pelas cópias `r3-2` e `r3-4`), r3 e r4; a varredura da vista padrão (sem candidato, com 1 ou 2, e o macro trocado nos 6 primeiros das carnes e das castanhas) | todos | T36 |

## Verificação de cada tarefa

- T2 e T3: `npx vitest run src/domain/grupoDeSubstituicao.test.ts src/domain/buscaDeSubstitutos.test.ts src/domain/trocas.test.ts`
  (as trocas da folha não mudam).
- T4: `npx vitest run src/domain/plano.test.ts src/domain/opcoesDoItem.test.ts`.
- T5: `npx vitest run src/domain/folhaDieta.test.ts src/domain/dietaDoLink.test.ts src/ui/exportar src/ui/missoes src/export src/domain/restricoesNoPlano.test.ts`.
- T6: `npx vitest run src/ui/plano`.
- T7: `npx playwright test e2e/busca-substitutos.spec.ts e2e/planejador.spec.ts e2e/correcao-a.spec.ts`.
- T8: `npm run check`, `npm run e2e`, `npm run test:csp`.

## Riscos e decisões para revisar

0. **Revisão independente de 03/11/2026 (T9 a T12).** A D-1121 corrige a troca razoável na origem e **muda as trocas da
   folha impressa** em 12 alimentos (conferido na rodada 2 com a folha de verdade, 4 trocas pedidas e 2 mostradas):
   almeirão, nabo e repolho crus passam a oferecer folha de mostarda; atemóia e banana pacova, caqui "chocolate"; e sete
   pratos prontos (tapioca com manteiga, baião de dois, yakisoba…), macarrão à bolonhesa. Ponto para a Mor. A D-1122 põe
   uma cópia do nome na opção da base ampliada, além de segurar o plano até a base chegar.

   **Rodada 2 (T13 a T24).** A D-1125 tira da lista que abre sozinha o que não é troca equivalente (macro dominante,
   energia de metade ao dobro, pó só por pó): a lista de alguns alimentos encurta (o pinhão fica quase sem candidato no
   mesmo grupo, porque as castanhas são de gordura). A D-1130 corta a segunda variação do mesmo alimento (leite integral →
   só um outro leite). A D-1132 troca a lista do café e do chá por uma frase. A recomendação 3 (pratos de café da manhã
   contra almoço) fica para a próxima melhoria.

   **Rodada 3 (T26 a T31).** A D-1133 devolve a troca dentro dos grupos da seção 3 (o leite integral volta a trocar com
   o desnatado e a bebida de soja; as verduras e o tofu voltam a ter lista); a energia e o pó continuam barrando o
   absurdo. A D-1134 mede "o mesmo alimento" pelo nome sem o preparo, e a D-1130 passa a valer para toda a lista: os
   queijos e as batatas voltam, e cada alimento aparece uma vez só. A farinha de mandioca crua e a torrada são o mesmo
   alimento e deixam de trocar entre si no mesmo grupo. A D-1135 tira o copo de requeijão do leite e põe a bebida de soja e
   o leite semidesnatado em ml **em todo o app** (plano, folha, link), não só na busca: é a regra D-378 de sempre, que
   esses dois nomes não pegavam. A T30 mexe no Cobrir (fora desta spec), porque é o mesmo defeito de 2 px da T25 e a
   correção é de uma linha.

   **Rodada 4 (T32 a T37).** A D-1136 estreita a D-1133: o macro dominante só deixa de valer no leite e no iogurte, nas
   verduras e no derivado de soja entre as leguminosas (o tofu). **Decisão para revisar:** o pedido da rodada era "só o
   leite e as verduras", mas também manter o tofu com o tremoço (CA-2146, sonda `r4-1`). O tofu é de gordura e o tremoço,
   de carboidrato; com a regra (a) em toda a leguminosa, o tofu fica sem nenhum substituto (como em 10cabdd8). A saída
   foi dispensar a regra só para o derivado de soja (a lista de equivalentes põe a soja com os feijões), e não para as
   leguminosas inteiras. A D-1137 junta as variedades da verdura e dois sinônimos (mexerica e tangerina; o tofu da TACO e
   o da base ampliada). A D-1138 põe a farinha de mandioca no `amido`: ela passa a aparecer também no lugar do arroz e da
   mandioca. A T36 não muda o componente: a chave já tem `min-h-11` (44 px), e o teste passa a medir com a gaveta parada.

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
