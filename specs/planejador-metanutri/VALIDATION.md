# Validação — Planejador MetaNutri

Gerado em 15/09/2026, na conclusão da fase 3.

## 1. Situação

| Item | Resultado |
|---|---|
| Critérios da SPEC | 74 |
| Critérios com teste automatizado | 74 |
| Critérios sem teste | 0 |
| Testes de unidade e de interface | 539 em 32 arquivos |
| Testes de ponta a ponta (Playwright) | 2 |
| Lint e checagem de tipos | sem erros |

Comandos: `npm run check` (lint + tipos + testes) e `npm run e2e` (ponta a ponta, sobe o build).

## 2. Matriz critério → teste

| ID | Critério | Onde é testado |
|---|---|---|
| CA-01 | Dado um caso novo, quando o usuário abre o planejador, então vê os campos: nome do caso, diagnóstico clínic... | `src/ui/caso/TelaCaso.test.tsx` |
| CA-02 | Dado peso e estatura preenchidos em um caso de 20 anos ou mais, quando qualquer um muda, então o IMC é reca... | `src/domain/antropometria.test.ts`<br>`src/ui/caso/TelaCaso.test.tsx` |
| CA-02a | Dado um caso de 1 a 19 anos, então o sistema mostra IMC-para-idade e estatura-para-idade em escore-z com a ... | `src/domain/antropometria.test.ts`<br>`src/ui/caso/TelaCaso.test.tsx` |
| CA-02b | Dado um caso marcado como gestante, então o sistema pede idade gestacional (semanas) e peso pré-gestacional... | `src/domain/antropometria.test.ts`<br>`src/ui/caso/TelaCaso.test.tsx` |
| CA-02c | Dado um caso marcado como lactante, então o sistema pede o tempo pós-parto (meses). | `src/domain/antropometria.test.ts`<br>`src/ui/caso/TelaCaso.test.tsx` |
| CA-03 | Dado sexo e circunferência da cintura preenchidos em adulto, então o sistema mostra a classificação de risc... | `src/domain/antropometria.test.ts`<br>`src/ui/caso/TelaCaso.test.tsx` |
| CA-04 | Dado idade de 60 anos ou mais e circunferência da panturrilha preenchida, então o sistema mostra a classifi... | `src/domain/antropometria.test.ts`<br>`src/ui/caso/TelaCaso.test.tsx` |
| CA-05 | Dado qualquer valor de referência antropométrica exibido, então a fonte aparece ao lado (nome e ano). | `src/domain/antropometria.test.ts`<br>`src/ui/caso/TelaCaso.test.tsx` |
| CA-06 | Dado um adulto com sexo, idade, peso e estatura válidos, quando o usuário escolhe a fórmula (Mifflin-St Jeo... | `src/domain/energia.test.ts`<br>`src/ui/resumo/ResumoDoDia.test.tsx` |
| CA-06a | Dado um caso de 1 a 18 anos, então o sistema calcula a necessidade energética com equações próprias para a ... | `src/domain/energia.test.ts`<br>`src/ui/resumo/ResumoDoDia.test.tsx` |
| CA-06b | Dado uma gestante, então o GET usa as equações de gestação (no 2º e 3º trimestres, com o depósito de energi... | `src/domain/energia.test.ts` |
| CA-06c | Dado uma lactante, então o GET soma o custo de produção de leite correspondente ao período pós-parto (0 a 6... | `src/domain/energia.test.ts`<br>`src/ui/resumo/ResumoDoDia.test.tsx` |
| CA-06d | Dado um caso de criança, adolescente, gestante ou lactante, então o nível de atividade escolhido é converti... | `src/domain/energia.test.ts`<br>`src/ui/resumo/ResumoDoDia.test.tsx` |
| CA-07 | Dado uma TMB calculada, quando o usuário escolhe o nível de atividade, então o GET = TMB × fator. Fatores p... | `src/domain/energia.test.ts`<br>`src/ui/resumo/ResumoDoDia.test.tsx` |
| CA-08 | Dado o seletor de atividade, quando o usuário digita um fator próprio, então o GET usa esse fator. | `src/domain/energia.test.ts`<br>`src/ui/resumo/ResumoDoDia.test.tsx` |
| CA-09 | Dado que o usuário prefere outra conduta, quando digita o GET manualmente, então esse valor substitui o cal... | `src/domain/energia.test.ts`<br>`src/ui/resumo/ResumoDoDia.test.tsx` |
| CA-10 | Dado um plano com alimentos, então o painel mostra kcal do plano, GET e a porcentagem do GET atingida. Abai... | `src/domain/energia.test.ts`<br>`src/ui/resumo/ResumoDoDia.test.tsx` |
| CA-11 | Dado que o usuário troca a fórmula, o fator ou o GET, então o plano montado não é alterado nem apagado. | `src/ui/resumo/ResumoDoDia.test.tsx` |
| CA-12 | Dado um caso novo, então o plano começa com seis refeições: 6:00 Desjejum, 9:00 Lanche da manhã, 12:00 Almo... | `src/domain/plano.test.ts`<br>`src/ui/plano/TelaPlano.test.tsx` |
| CA-13 | Dado uma refeição, quando o usuário renomeia, muda o horário, remove ou adiciona uma refeição, então o plan... | `src/domain/plano.test.ts`<br>`src/ui/plano/TelaPlano.test.tsx`<br>`e2e/planejador.spec.ts` |
| CA-14 | Dado cada refeição, então ela tem três opções: Principal, Substituto 1 e Substituto 2, cada uma com sua pró... | `src/domain/plano.test.ts`<br>`src/ui/plano/TelaPlano.test.tsx` |
| CA-15 | Dado o campo de entrada rápida de uma opção de refeição, quando o usuário digita quantidade e parte do nome... | `src/domain/busca.test.ts`<br>`src/ui/plano/TelaPlano.test.tsx` |
| CA-16 | Dado a lista de resultados, quando o usuário tecla Enter, então o primeiro resultado é adicionado com a qua... | `src/domain/busca.test.ts`<br>`src/ui/plano/TelaPlano.test.tsx`<br>`e2e/planejador.spec.ts` |
| CA-17 | Dado um texto sem quantidade, quando o usuário adiciona, então a quantidade padrão é 100 g e fica editável. | `src/domain/busca.test.ts`<br>`src/ui/plano/TelaPlano.test.tsx` |
| CA-18 | Dado um alimento com medida caseira cadastrada, quando o usuário digita quantidade e medida (ex.: "2 colher... | `src/domain/busca.test.ts`<br>`src/ui/plano/TelaPlano.test.tsx` |
| CA-19 | Dado um alimento adicionado, então a linha mostra gramas, medida caseira equivalente (quando houver), kcal,... | `src/domain/busca.test.ts`<br>`src/ui/plano/TelaPlano.test.tsx` |
| CA-20 | Dado um texto sem nenhum alimento correspondente, então o sistema informa que não encontrou e **não** adici... | `src/domain/busca.test.ts`<br>`src/ui/plano/TelaPlano.test.tsx` |
| CA-21 | Dado a base completa de alimentos carregada, quando o usuário digita, então os resultados aparecem em até 2... | `src/domain/busca.test.ts`<br>`src/domain/desempenho.test.ts` |
| CA-22 | Dado um plano com alimentos, então o painel mostra proteína, carboidrato e gordura em gramas, em % das kcal... | `src/domain/macros.test.ts`<br>`src/ui/resumo/ResumoDoDia.test.tsx` |
| CA-23 | Dado as metas padrão (carboidrato 45 a 65%, gordura 20 a 35%, proteína 10 a 35% das kcal), então cada macro... | `src/domain/macros.test.ts`<br>`src/ui/resumo/ResumoDoDia.test.tsx` |
| CA-24 | Dado que o usuário edita a meta de um macro (em % ou g/kg), então a indicação passa a usar a meta dele. | `src/domain/macros.test.ts`<br>`src/ui/resumo/ResumoDoDia.test.tsx` |
| CA-25 | Dado um plano, então o painel lista para cada micronutriente disponível na base: total no plano, referência... | `src/domain/adequacao.test.ts`<br>`src/ui/adequacao/TelaAdequacao.test.tsx` |
| CA-26 | Dado o preset **Individual**, então a referência é a RDA e a meta mínima é 90%. | `src/domain/adequacao.test.ts`<br>`src/ui/adequacao/TelaAdequacao.test.tsx` |
| CA-27 | Dado o preset **Coletivo**, então a referência é a EAR e a meta mínima é 50%. | `src/domain/adequacao.test.ts`<br>`src/ui/adequacao/TelaAdequacao.test.tsx` |
| CA-28 | Dado o preset **Personalizado**, então o usuário escolhe a referência (RDA ou EAR) e a porcentagem mínima. | `src/domain/adequacao.test.ts`<br>`src/ui/adequacao/TelaAdequacao.test.tsx` |
| CA-29 | Dado um nutriente sem a referência escolhida (ver D-4), então o sistema usa a AI e mostra "referência: AI". | `src/data/dri.test.ts`<br>`src/domain/adequacao.test.ts`<br>`src/ui/adequacao/TelaAdequacao.test.tsx` |
| CA-30 | Dado um nutriente com UL, quando o total do plano passa do UL, então aparece um alerta de "acima do limite ... | `src/domain/adequacao.test.ts` |
| CA-31 | Dado sexo, idade, gestação ou lactação, quando qualquer um muda, então as referências trocam para a faixa d... | `src/domain/adequacao.test.ts` |
| CA-31a | Dado um caso de 1 a 18 anos, então as metas padrão de macronutrientes usam as faixas próprias da idade, não... | `src/domain/macros.test.ts` |
| CA-32 | Dado alimentos sem dado para um nutriente, então esse nutriente mostra quantos alimentos não têm informação... | `src/data/alimentos.test.ts`<br>`src/domain/adequacao.test.ts`<br>`src/domain/cobrir.test.ts`<br>`src/domain/totais.test.ts`<br>`src/ui/adequacao/TelaAdequacao.test.tsx` |
| CA-33 | Dado a tela de adequação, então a fonte dos dados de composição e das referências fica visível. | `src/domain/adequacao.test.ts`<br>`src/ui/adequacao/TelaAdequacao.test.tsx` |
| CA-34 | Dado um micronutriente abaixo da meta, então ele exibe a ação "cobrir". | `src/domain/cobrir.test.ts`<br>`src/ui/adequacao/TelaAdequacao.test.tsx` |
| CA-35 | Dado a ação "cobrir", então o sistema mostra quanto falta para a meta e até 5 alimentos, cada um com a porç... | `src/domain/cobrir.test.ts` |
| CA-36 | Dado as sugestões, então elas priorizam cobrir a falta com o menor acréscimo de kcal, sem ultrapassar a por... | `src/domain/cobrir.test.ts`<br>`src/ui/adequacao/TelaAdequacao.test.tsx` |
| CA-36a | Dado alimentos da base que não se consomem na forma listada (itens de Miscelâneas como sal, fermento e café... | `src/domain/cobrir.test.ts`<br>`src/ui/adequacao/TelaAdequacao.test.tsx` |
| CA-37 | Dado uma sugestão que faria o plano passar do GET ou do UL de algum nutriente, então ela aparece com esse a... | `src/domain/cobrir.test.ts` |
| CA-38 | Dado uma sugestão, quando o usuário escolhe a refeição e a opção (Principal por padrão) e confirma, então o... | `src/ui/adequacao/TelaAdequacao.test.tsx`<br>`e2e/planejador.spec.ts` |
| CA-39 | Dado nenhum alimento da base capaz de cobrir ao menos parte da falta dentro da porção máxima, então o siste... | `src/domain/cobrir.test.ts` |
| CA-40 | Dado uma sugestão indesejada, quando o usuário a oculta, então ela não volta a aparecer para aquele caso. | `src/domain/cobrir.test.ts`<br>`src/ui/adequacao/TelaAdequacao.test.tsx` |
| CA-41 | Dado um alimento no Principal, quando o usuário pede um substituto e escolhe outro alimento, então o sistem... | `src/domain/substitutos.test.ts`<br>`src/ui/plano/DialogoSubstituto.test.tsx`<br>`e2e/planejador.spec.ts` |
| CA-42 | Dado um substituto calculado, então a tela mostra a porção em gramas e em medida caseira, e a diferença de ... | `src/domain/substitutos.test.ts`<br>`src/ui/plano/DialogoSubstituto.test.tsx` |
| CA-43 | Dado a decisão D-2, então os alimentos de Substituto 1 e 2 não entram nos totais nem na adequação do plano. | `src/domain/totais.test.ts`<br>`src/ui/plano/DialogoSubstituto.test.tsx` |
| CA-44 | Dado um plano, quando o usuário exporta o **Aconselhamento**, então recebe um arquivo Word com a estrutura ... | `src/export/docx.test.ts`<br>`src/ui/exportar/MenuExportar.test.tsx`<br>`e2e/planejador.spec.ts` |
| CA-45 | Dado um alimento sem medida caseira, então no Aconselhamento ele aparece em gramas. | `src/export/docx.test.ts` |
| CA-46 | Dado um plano, quando o usuário exporta o **Memorial de cálculo**, então recebe um arquivo Word com TMB, fó... | `src/export/docx.test.ts`<br>`src/ui/exportar/MenuExportar.test.tsx`<br>`e2e/planejador.spec.ts` |
| CA-47 | Dado campos vazios no caso, então o arquivo exportado deixa o espaço em branco, sem textos como "undefined"... | `src/export/docx.test.ts`<br>`src/ui/exportar/MenuExportar.test.tsx` |
| CA-48 | Dado a tabela de adequação na tela, quando o usuário usa "copiar tabela", então consegue colar no Word mant... | `src/export/copiar-tabela.test.ts`<br>`src/ui/exportar/MenuExportar.test.tsx` |
| CA-49 | Dado um plano em edição, quando o usuário fecha e reabre o navegador no mesmo aparelho, então o caso e o pl... | `src/domain/persistencia.test.ts`<br>`e2e/planejador.spec.ts` |
| CA-50 | Dado a lista de casos, quando o usuário cria, duplica, renomeia ou exclui um caso, então a lista reflete a ... | `src/domain/persistencia.test.ts`<br>`src/ui/casos/TelaCasos.test.tsx` |
| CA-51 | Dado o primeiro acesso, então o usuário vê um aviso de que a ferramenta apoia estudo e planejamento, que a ... | `src/ui/casos/TelaCasos.test.tsx`<br>`e2e/planejador.spec.ts` |
| CB-01 | Peso, estatura ou idade vazios → TMB, GET, IMC e g/kg não aparecem; o painel diz qual campo falta. Nunca mo... | `src/domain/antropometria.test.ts`<br>`src/domain/caso.test.ts`<br>`src/domain/energia.test.ts`<br>`src/domain/macros.test.ts`<br>`src/ui/caso/TelaCaso.test.tsx`<br>`src/ui/resumo/ResumoDoDia.test.tsx` |
| CB-02 | Idade menor que 1 ano (D-1) → Aviso de que o planejador cobre a partir de 1 ano; energia e referências não ... | `src/domain/caso.test.ts`<br>`src/ui/caso/TelaCaso.test.tsx` |
| CB-02a | Caso marcado como gestante e lactante ao mesmo tempo, ou gestante com sexo masculino ou idade incompatível ... | `src/domain/caso.test.ts`<br>`src/ui/caso/TelaCaso.test.tsx` |
| CB-02b | Gestante sem idade gestacional informada → Adicional energético e ganho de peso não aparecem; o painel pede... | `src/domain/caso.test.ts`<br>`src/domain/energia.test.ts` |
| CB-03 | Valores fora de faixa plausível (ex.: peso < 5 kg ou > 350 kg, estatura < 45 cm ou > 250 cm; faixas ampliad... | `src/domain/caso.test.ts`<br>`src/ui/caso/TelaCaso.test.tsx` |
| CB-04 | Quantidade 0 ou negativa → 0 é aceito e não soma nada; negativo não é aceito | `src/domain/plano.test.ts`<br>`src/domain/totais.test.ts`<br>`src/ui/plano/TelaPlano.test.tsx` |
| CB-05 | Plano sem nenhum alimento → Painel mostra 0 kcal, adequação 0% e o "cobrir" funciona normalmente | `src/domain/adequacao.test.ts`<br>`src/domain/macros.test.ts`<br>`src/domain/totais.test.ts`<br>`src/ui/adequacao/TelaAdequacao.test.tsx` |
| CB-06 | Alimento sem kcal na base → Não aparece nas sugestões do "cobrir"; pode ser adicionado manualmente com aviso | `src/domain/cobrir.test.ts` |
| CB-07 | Medida caseira digitada que não existe para aquele alimento → Sistema avisa e pede gramas; não inventa conv... | `src/data/medidas-caseiras.test.ts`<br>`src/domain/busca.test.ts` |
| CB-08 | Duas abas abertas editando o mesmo caso → A última alteração salva prevalece e a outra aba é avisada ao gan... | `src/domain/persistencia.test.ts`<br>`src/ui/casos/TelaCasos.test.tsx` |
| CB-09 | Armazenamento do navegador bloqueado ou cheio → Planejador funciona na sessão e avisa que nada será salvo | `src/domain/persistencia.test.ts`<br>`src/ui/casos/TelaCasos.test.tsx` |
| CB-10 | Sem internet depois do primeiro carregamento → Planejador, busca, cálculos e exportação continuam funcionando | `e2e/planejador.spec.ts` |
| CB-11 | Plano muito grande (ex.: 6 refeições × 3 opções × 15 alimentos) → Recalcular após qualquer edição continua ... | `src/domain/desempenho.test.ts` |
| CB-12 | Número digitado com vírgula decimal ("68,5") → Aceito como 68,5 | `src/domain/caso.test.ts`<br>`src/ui/caso/TelaCaso.test.tsx` |

## 3. Pendências antes do lançamento

1. **Revisão clínica pela nutricionista (T-62).** As oito referências da seção 6 do PLAN precisam de conferência: equações de energia para crianças e gestantes, curvas de ganho de peso na gestação, IMC do idoso, cintura, panturrilha, curvas da OMS e a regra de filtro do "cobrir" (CA-36a).
2. **Teste com uma estudante real**, do caso novo até o Word entregue no modelo do estágio.
3. **Publicação**: hospedagem, domínio e cobrança ainda não entram no MVP.
