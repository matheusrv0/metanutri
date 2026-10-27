# SPEC — Alimentos e gramaturas

Status: **pedida pelo dono em 21/10/2026** ("a gente está muito preso a uma base; deixe as pessoas cadastrarem os
próprios alimentos; dê mais ênfase em como funcionam as gramaturas"); **aprovação pelas telas antes de publicar**.
Rodada "cuidado total" (coordenador, `plano-geral.md`, decisões 1, 3, 4 e 7). Levantamento:
`alimentos-e-gramaturas.md` (achados A1 a A26, regras G1 a G9 e "Meus alimentos", seção 2).

**Hoje:** a entrada rápida põe o alimento errado com Enter ("150 arroz integral" adiciona arroz **cru**; "1 banana" vira
**1 grama**). O item do plano guarda só gramas, e a medida que a paciente lê é recalculada: em 68% dos testes ela lê
outra medida ("1 pote de iogurte" sai "1 copo americano e meio"). O leite integral não tem energia. "Meus produtos" só
aceita rótulo, e a leitura do código de barras tem um erro de conta (A13).

**Objetivo:** a entrada rápida acerta o alimento e a quantidade; a medida que a nutricionista escolhe é a que a
paciente lê, com os gramas ao lado; grama ↔ medida caseira fica claro na linha do plano; a nutricionista cadastra os
próprios alimentos e as próprias medidas.

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-370 | **Ordem dos resultados da busca** (entrada rápida e Tabela de alimentos com termo): (1) quando a pessoa digitou uma medida, os alimentos que têm essa medida; (2) os mais usados **por esta conta** (quantas vezes o alimento aparece nos planos dela) e os alimentos próprios; (3) a forma preparada antes da crua quando a regra prescritível marca o cru como ingrediente (`regraQueExclui(a)?.id === 'cru'`, sem mudar `prescritivel.ts`); (4) o nome que começa pelo primeiro termo; (5) uso comum (`ehDeUsoComum`); (6) a lista de consumo mais frequente da POF/IBGE (arroz, feijão, café, pão francês, carne, frango, leite, banana, ovo…), só como ordem, sem número; (7) menos vírgulas; (8) nome mais curto | O Enter põe o 1º resultado (A1). A forma crua de quem se come cozido não pode ganhar só por ter o nome curto |
| D-371 | **Número sem medida:** abaixo de 20 e com medida de contar no alimento (unidade, fatia, bife, filé, unidade pequena, pedaço, posta, coxa, sobrecoxa, peito, rodela, nesta ordem), o número conta **unidades** da primeira que o alimento tiver ("metade", "banda" e "gomo" não entram: "2 metades" não é como se pede); a partir de 20, ou com "g", são gramas. Alimento sem medida de contar: gramas, como hoje | "1 banana" era 1 g (A3). A lista mostra a leitura escolhida (D-373), então não há surpresa |
| D-372 | **A entrada entende o jeito de falar** (G6, A10): nome curto da medida ("colher" = colher de sopa e, sem ela, colher de servir; "xícara" = xícara de chá; "copo" = copo americano e, sem ele, copo médio, copo de requeijão ou copo grande); palavras ("meia"/"meio" = ½, "um"/"uma" = 1, "dois"/"duas" = 2, "três" = 3, "quatro", "cinco"); frações ("½", "1/2", "1 e meia", "1 concha e meia"); "ml", "mililitro(s)", "l" e "litro(s)" valem como gramas com densidade 1 (o litro, ×1000); plural do alimento ("ovos", "bananas", "pães": o termo vale com e sem o plural). O nome curto só vale quando o alimento tem a medida. Quando a medida come a única palavra ("1 xícara de café", "1 colher de chá"), a última palavra dela também é o alimento | Os testes reais da A10 falhavam com "Nenhum alimento encontrado" |
| D-373 | **A lista mostra a leitura** como a folha: "1 unidade · 75 g · 67 kcal", "1 concha e meia · 210 g · 160 kcal", "200 ml · 123 kcal" (A21). Fração que não é meia aparece com vírgula ("0,25 xícara de chá") | "2 colher de sopa" e "1.5 concha" saíam fora da regra |
| D-374 | **O item guarda a medida escolhida** (G1): `ItemPlano.medida?: { nome, quantidade, gramasPorMedida } \| null`. Objeto: a medida escolhida. `null`: "só gramas" para este item. Sem o campo: medida automática de hoje (`medidaParaMostrar`), marcada "auto" na linha (G5). Os gramas continuam sendo a verdade da conta; a quantidade que se mostra é `gramas ÷ gramasPorMedida`, arredondada para meia medida. Se o arredondamento não fecha com os gramas (diferença maior que 1 g e 1%), a medida é **aproximada** | O peso prescrito nunca muda sozinho; uma aba antiga que mexe nos gramas deixa a medida coerente porque a quantidade sai dos gramas |
| D-375 | **A linha do plano mostra e edita as duas coisas ligadas** (G2, G3): quantidade, seletor de medida ("gramas", as medidas próprias, as da POF na ordem de preferência, cada uma com o peso: "concha · 140 g") e gramas, com "=" entre eles; embaixo, "O paciente lê: 1 concha e meia (210 g)". Mudar a quantidade ou a medida recalcula os gramas; mudar os gramas recalcula a quantidade. Medida aproximada: "≈" em cor de aviso antes do seletor e o botão "Usar só gramas". No celular, três linhas: o nome; quantidade + medida = gramas; o que o paciente lê. A receita continua com a porção dela (spec receitas-com-calculo) | O "como funcionam as gramaturas" que o dono pediu fica na própria linha |
| D-376 | **Três modos para o paciente** (decisão 3 do coordenador, G4): "Medida e gramas" (**padrão de plano novo**: "1 concha e meia (210 g)"), "Só medida" ("1 concha e meia") e "Só gramas" ("210 g"). Plano gravado em `medida-caseira`, ou sem o campo, lê "Só medida"; em `gramas`, "Só gramas": nada muda sem a nutricionista pedir. A escolha fica **no topo da etapa Refeições** e na janela de imprimir; sai do cartão Identificação da etapa 1 | A clínica trabalha em gramas e a UBS em medida caseira; a medida da POF erra até 15% |
| D-377 | **Todas as saídas leem a medida guardada antes da automática** (G1): folha impressa, lista de compras (automática, porque soma itens), trocas, link do paciente ("Meu plano"), Word de aconselhamento. Medida aproximada sai "190 g (cerca de 1 concha e meia)" em "Medida e gramas" e em "Só medida", e "190 g" em "Só gramas". Sem medida que sirva, o peso. A cópia do link leva o texto da medida escolhida (`escolhida: true`), a marca de aproximada e a unidade ml; o link de antes desta versão abre como antes | Em 68% dos testes, a paciente lia outra medida (A5) |
| D-378 | **Líquido em ml** (G9): grupo "Bebidas", leite de vaca, leite de cabra, leite fermentado e bebida láctea, e alimento próprio com unidade ml saem em ml ("1 copo americano (150 ml)", "200 ml"). Densidade 1, dita na ficha do alimento próprio | "200 g de leite" não é como se fala |
| D-379 | **Cobrir e substituto em meia medida caseira** (G8): a porção sugerida é a meia medida mais próxima que cobre a falta (gramas = quantidade × peso da medida), limitada pela porção do grupo e pela porção máxima do plano; a cobertura e as kcal são calculadas sobre esse peso, e o item entra com a medida guardada. Sem medida que caiba, o passo de 5 g de hoje. O substituto também: os gramas equivalentes viram a meia medida mais próxima, e as diferenças são calculadas sobre ela. `prescritivel.ts` não muda | A medida que a paciente lê valia até 15% menos que o peso da conta (A18) |
| D-380 | **Macros do USDA** (A4, CC0) para os alimentos da TACO sem energia que deviam ter: leite integral (FDC 172217), leite desnatado (FDC 173432) e iogurte sabor abacaxi (FDC 170889, iogurte de fruta, confiança média), marcados "USDA" na ficha, só onde a TACO não tem o valor. **Coco verde fica sem:** o USDA não tem polpa de coco verde, e o coco maduro (354 kcal) daria quatro vezes a energia. Os sais continuam sem energia (não têm) | Leite somava "— kcal" e 0 g de proteína |
| D-381 | **Mais medidas da POF** (A9): o mapeamento TACO→POF ganha os alimentos de uso diário sem medida. O cru **herda a unidade** do cozido só quando a unidade não muda com o preparo (ovo); cortes de carne e grãos crus só ganham medida quando a POF mede o cru | 310 de 597 alimentos não tinham medida |
| D-382 | **Código de barras** (A13, A14, A23, A25): o que vem da Open Food Facts é guardado **por 100 g ou 100 ml** e nunca reescalado para uma porção que a nutricionista ainda vai digitar; a porção do rótulo vira só a medida; entram todos os micros que a OFF tiver e a adequação usa; sem sódio, o sódio sai do sal (÷ 2,5); produto por 100 ml guarda a unidade ml; a chamada manda `X-User-Agent: MetaNutri/1.0 (metanutricontato@gmail.com)` | Sem porção na OFF, os valores por 100 g entravam como da porção e eram multiplicados de novo |
| D-383 | **"Meus alimentos" evolui a chave `metanutri:produtos`** (decisão 4): tipo (alimento, preparação, rótulo), nome para o paciente, grupo, preparo, unidade (g ou ml), base (por 100 g/ml ou por porção), os 4 macros obrigatórios, micros opcionais (os 20 da adequação), medidas, fonte, observações, "Pode aparecer no Cobrir e nas trocas" e `atualizadoEm`. O item continua lido pela versão antiga (`porcaoG` e `porPorcao` sempre presentes). **Publicação em duas vezes:** esta versão lê e preserva campos desconhecidos (`{ ...anterior, ...dados }`); o formulário novo, "Copiar para Meus alimentos" e "Salvar como alimento" ficam atrás da constante `MEUS_ALIMENTOS_NOVOS = false`, ligada na publicação 2 | A versão no ar hoje (78c0157) refaz o item só com os campos que conhece ao editar (`salvar`): uma aba antiga editando um item novo apagaria grupo, medidas e nome para o paciente. A exclusão, a junção da nuvem e a leitura antiga preservam (conferido em `produtos.ts` e `copiaDaConta.ts`) |
| D-384 | **Validação** (§2.3): bloqueia nome vazio, grupo vazio, macro vazio ou negativo, porção ≤ 0 ou > 2000, açúcares acima do carboidrato, saturada acima da gordura, proteína + carboidrato + gordura + fibra acima de 105 g por 100 g. Avisa sem bloquear: energia digitada longe de 4P + 4C + 9G (mais de 20% e de 15 kcal) e micro acima do maior valor da base. Vazio é "não informado" (nulo), nunca zero | Os números entram nos cálculos do plano |
| D-385 | **Como entra no resto:** na busca com a marca "meu" e prioridade (D-370); na Tabela de alimentos, com o filtro "Origem" (Todas, Base MetaNutri, Meus alimentos) e ordem por relevância quando há termo (A15); ficha da base com "Copiar para Meus alimentos"; receita com "Salvar como alimento" (por 100 g da receita pronta, a porção vira medida); editar avisa "Está em N planos. Mudar os valores muda os cálculos deles."; excluir deixa "Alimento excluído" na linha do plano; folha, link e Word usam o nome para o paciente e a medida guardada; limite de 1.000 itens | §2.4 do levantamento |
| D-386 | **Cobrir e trocas usam alimento próprio só com a chave ligada** (§2.5): "Pode aparecer no Cobrir e nas trocas" ligado, energia e o nutriente informados, passa na regra prescritível com nome, grupo e preparo (a regra "nunca" não se desliga), grupo diferente de "Suplementos" e sem o aviso de energia incoerente. A sugestão leva a marca "meu" | O nome é texto livre; a regra prescritível lê o nome |
| D-387 | **Medidas próprias para alimentos da base** (§2.6): chave nova `metanutri:medidas-proprias`, lista com id texto `"<alimentoId>:<nome normalizado>"`, `alimentoId`, `nome`, `gramas`, `criadoEm` e `atualizadoEm`; entra em `CHAVES_DE_DADOS`, nas `LISTAS` da junção (item a item, com lápide) e na migração dos dados de antes da conta. As medidas próprias vêm antes das da POF; com o mesmo nome, vale a própria, marcada "sua". Cria-se na ficha da Tabela de alimentos ("+ Medida sua") e no seletor da linha do plano ("+ Nova medida…"). Chave nova é segura já: a versão antiga não a conhece e não a apaga (D-170) | "Concha da minha casa = 120 g" |
| D-388 | **Receitas na refeição ligadas** (decisão 7): `RECEITAS_NA_REFEICAO = true` | O PWA trocou de versão há dois dias (D-274a da receitas-com-calculo) |
| D-389 | **Textos** das telas desta frente pelo glossário (`textos.md` §1, §3.11, a parte do Cobrir de §3.12 e §3.16): "Meus alimentos" no lugar de "Meus produtos"; "Excluir" para apagar de vez e "Tirar" para tirar da lista (decisão 1 do coordenador, que vence a linha 119 de `textos.md`); "poucos nutrientes"/"parte dos nutrientes"; o Cobrir "ultrapassa" o gasto; "neste plano" | Decisão 1 do coordenador |

## 2. Critérios de aceite

### US-AG1 · A entrada rápida acerta (A1–A3, A10, A21; G6, G7)

- **CA-1100** · Dado a entrada rápida, quando digito "150 arroz", então o 1º resultado é "Arroz, tipo 1, cozido" com 150 g, e "Arroz, integral, cru" não vem antes de nenhum arroz cozido.
- **CA-1101** · Dado a entrada, quando digito "1 banana", então o 1º resultado é uma banana crua com "1 unidade · 75 g" (prata), nunca 1 g.
- **CA-1102** · Dado um número abaixo de 20 sem medida e um alimento sem medida de contar ("3 arroz"), então são gramas ("3 g").
- **CA-1103** · Dado "25 banana" ou "5 g banana", então são gramas (25 g e 5 g).
- **CA-1104** · Dado "2 colheres arroz", então "colher" é colher de sopa e o resultado é "Arroz, tipo 1, cozido" com "2 colheres de sopa · 50 g".
- **CA-1105** · Dado "meia xícara de aveia", "uma concha de feijão", "½ concha de feijão", "1 e meia concha de feijão" e "1 concha e meia de feijão", então as quantidades são ½, 1, ½, 1½ e 1½ da medida.
- **CA-1106** · Dado "200 ml de leite", então o 1º resultado é "Leite, de vaca, integral" com "200 ml".
- **CA-1107** · Dado "2 ovos", então o 1º resultado é o ovo de galinha cozido com "2 unidades · 90 g".
- **CA-1108** · Dado "1 copo de leite", então "copo" vale copo americano e o 1º resultado é "Leite, de vaca, integral" com "1 copo americano · 150 ml".
- **CA-1109** · Dado a lista de resultados, então a quantidade sai como a folha: plural ("2 colheres de sopa"), meia por extenso ("1 concha e meia"), vírgula decimal, gramas e kcal ("1 concha e meia · 210 g · 160 kcal").
- **CA-1110** · Dado uma tabela de pelo menos 40 entradas reais ("150 arroz", "1 concha de feijão", "100 frango", "2 ovos", "meia xícara de aveia"…), então cada uma dá o alimento e os gramas esperados (teste de tabela, `buscaReal.test.ts`).
- **CA-1111** · Dado uma conta que usa muito "Arroz, integral, cozido", quando digito "150 arroz", então ele vem em 1º (D-370, item 2).
- **CA-1112** · Dado a ajuda e o campo da entrada, então o exemplo que eles ensinam funciona ("1 concha de feijão").

### US-AG2 · A medida escolhida é a que o paciente lê (G1–G5, G8, G9)

- **CA-1113** · Dado "1 pote de iogurte natural" na entrada, quando adiciono, então o item guarda pote, 1 e 200 g, e a folha diz "1 pote (200 g)" no modo "Medida e gramas".
- **CA-1114** · Dado um item com medida guardada, quando mudo a quantidade para 1,5, então os gramas viram 1,5 × o peso da medida; quando troco a medida, os gramas viram quantidade × o peso da nova.
- **CA-1115** · Dado um item com medida guardada, quando mudo os gramas para um valor que não fecha em meia medida (190 g de concha de 140 g), então a linha mostra "≈" em cor de aviso e "Usar só gramas"; a folha diz "190 g (cerca de 1 concha e meia)"; o peso não muda sozinho.
- **CA-1116** · Dado "Usar só gramas" ou "gramas" no seletor, então o item guarda `medida: null` e o paciente lê só o peso.
- **CA-1117** · Dado um item sem medida guardada (plano antigo), então a linha mostra a medida automática com "auto", e mexer na quantidade ou no seletor a fixa.
- **CA-1118** · Dado o seletor de medida, então ele mostra "gramas", as medidas próprias, as da POF na ordem de preferência, cada uma com o peso ("concha · 140 g").
- **CA-1119** · Dado cada linha do plano, então embaixo aparece "O paciente lê: …" no modo do plano.
- **CA-1120** · Dado um plano novo, então o modo é "Medida e gramas"; dado um plano gravado em "medida-caseira" ou sem o campo, então é "Só medida"; em "gramas", "Só gramas".
- **CA-1121** · Dado a etapa Refeições, então o topo tem "Quantidades para o paciente" com os três modos; a janela de imprimir também; o cartão Identificação não tem mais.
- **CA-1122** · Dado os três modos, então a folha, a lista de compras, as trocas, o link e o Word mostram "1 concha e meia (210 g)", "1 concha e meia" e "210 g".
- **CA-1123** · Dado um plano com medida guardada, quando copio para o link, então "Meu plano" mostra a medida guardada (não a automática) no modo do plano; um link de antes desta versão abre como antes.
- **CA-1124** · Dado leite, bebida ou alimento próprio em ml, então a folha, o link e o Word escrevem ml ("1 copo americano (150 ml)", "200 ml").
- **CA-1125** · Dado o Cobrir, então a porção é uma meia medida caseira ("1 copo americano · 150 ml", "2 unidades · 90 g"), a cobertura e as kcal são calculadas sobre esse peso, e "Adicionar" põe o item com a medida guardada.
- **CA-1126** · Dado a calculadora de substituto, então a porção sai em meia medida, e "Usar como substituto 1" põe o item com a medida guardada.
- **CA-1127** · Dado a linha do plano no celular (360 px), então nada passa da largura e os campos têm 44 px de altura.

### US-AG3 · A base sem buracos (A4, A9)

- **CA-1128** · Dado "Leite, de vaca, integral", "Leite, de vaca, desnatado, UHT" e "Iogurte, sabor abacaxi", então têm energia, proteína, gordura, carboidrato e fibra do USDA, e a ficha marca essas linhas "USDA" com o número do alimento equivalente.
- **CA-1129** · Dado um alimento da TACO com o valor, então o complemento de macros nunca o substitui.
- **CA-1130** · Dado "Coco, verde, cru" e os sais, então continuam sem energia (travessão, nunca zero).
- **CA-1131** · Dado "Ovo, de galinha, inteiro, cru", "Farinha, de trigo" e os outros alimentos das regras novas, então têm medidas caseiras; "2 unidades de ovo cru" funciona na receita.
- **CA-1132** · Dado as regras novas, então nenhuma liga um alimento cru a medidas de alimento cozido quando o peso da unidade muda com o preparo (teste das regras).

### US-AG4 · Código de barras (A13, A14, A23, A25)

- **CA-1133** · Dado um produto da OFF sem porção, então os valores ficam por 100 g, nunca multiplicados por uma porção digitada depois.
- **CA-1134** · Dado um produto da OFF com porção, então os valores ficam por 100 g e a porção vira a medida ("porção · 30 g").
- **CA-1135** · Dado zinco, potássio, magnésio, vitamina C, fósforo, cobre, manganês, selênio, vitaminas A, D, E, B1, B2, B6, B12, niacina e folato na OFF, então entram convertidos para a unidade da adequação.
- **CA-1136** · Dado um produto sem sódio e com sal, então o sódio é o sal ÷ 2,5 (em mg).
- **CA-1137** · Dado um produto por 100 ml, então a unidade é ml.
- **CA-1138** · Dado a consulta, então ela manda o cabeçalho `X-User-Agent`.

### US-AG5 · Meus alimentos (§2)

- **CA-1139** · Dado "Meus alimentos" com a constante ligada, quando escolho "Novo alimento", então escolho o tipo (alimento, preparação, rótulo) e preencho os campos da D-383.
- **CA-1140** · Dado um alimento por 100 g ("Cuscuz da casa", 112 kcal, P 2,2, C 25, G 0,3), quando salvo, então ele entra na busca com a marca "meu" e soma no plano como os da base.
- **CA-1141** · Dado um rótulo por porção (30 g, 120 kcal), quando salvo, então a busca soma 400 kcal por 100 g e a porção vira a medida "porção · 30 g".
- **CA-1142** · Dado um dos 4 macros vazio, nome ou grupo vazio, porção ≤ 0 ou > 2000, açúcares acima do carboidrato, saturada acima da gordura, ou P + C + G + fibra acima de 105 g por 100 g, então não salva e o campo diz por quê.
- **CA-1143** · Dado a energia longe dos macros, então aparece "Pelos macros, dá 152 kcal; você digitou 252. Confira." e salva; com esse aviso, a chave do Cobrir fica desligada.
- **CA-1144** · Dado um micro acima do maior valor da base, então aparece "Confira a unidade: mg ou µg?" e salva.
- **CA-1145** · Dado um micro vazio, então ele é "não informado" (nulo) e o total do plano ganha a †.
- **CA-1146** · Dado medidas no cadastro ("fatia · 30 g"), então elas aparecem no seletor da linha do plano e na entrada rápida ("2 fatias de pão da casa").
- **CA-1147** · Dado o nome para o paciente, então a folha, o link e o Word usam esse nome; vazio, o nome.
- **CA-1148** · Dado um alimento da base, quando escolho "Copiar para Meus alimentos" na ficha, então o formulário abre com a composição, as medidas e a fonte "cópia da base".
- **CA-1149** · Dado uma receita, quando escolho "Salvar como alimento", então nasce uma preparação por 100 g da receita pronta, com a porção como medida; com macro sem dado em algum ingrediente, explica e não salva.
- **CA-1150** · Dado um alimento próprio usado em planos, quando edito, então aparece "Está em N planos. Mudar os valores muda os cálculos deles."
- **CA-1151** · Dado um alimento próprio excluído, então a linha do plano diz "Alimento excluído" e ele sai da folha e do link.
- **CA-1152** · Dado a Tabela de alimentos, então o filtro "Origem" mostra Todas, Base MetaNutri e Meus alimentos; o alimento próprio tem a marca "meu" e uma ficha "Cadastrado por você · fonte: rótulo".
- **CA-1153** · Dado um termo na Tabela de alimentos, então a ordem é por relevância (D-370): "farinha de trigo" mostra "Farinha, de trigo" antes de "Cação, posta, com farinha de trigo, frita".
- **CA-1154** · Dado um alimento próprio com "Pode aparecer no Cobrir e nas trocas", energia, o nutriente e grupo de alimento, então ele entra no Cobrir com a marca "meu"; sem a chave, com grupo "Suplementos", com aviso de energia ou com nome que a regra "nunca" pega ("cerveja artesanal"), não entra.
- **CA-1155** · Dado um item novo gravado por esta versão, quando uma versão que só conhece os campos antigos lê, então ele tem `id`, `nome`, `porcaoG` e `porPorcao` coerentes (a mesma energia por 100 g).
- **CA-1156** · Dado um item com campos que esta versão não conhece, quando ela edita e salva, então os campos desconhecidos continuam lá.
- **CA-1157** · Dado a publicação 2 (constante ligada, 23/10/2026), então "Meus alimentos" abre com "Novo alimento" e o formulário da D-383, sem o cadastro pelo rótulo de antes. Na publicação 1 (22/10), com a constante desligada, a tela mostrava o cadastro pelo rótulo de antes e nenhum botão que criasse item novo.

### US-AG6 · Medidas próprias (§2.6)

- **CA-1158** · Dado a ficha de um alimento da base, quando escolho "+ Medida sua" e salvo "concha · 120 g", então a medida aparece primeiro no seletor da linha do plano, marcada "sua", e na entrada rápida ("1 concha de feijão" dá 120 g).
- **CA-1159** · Dado o seletor da linha do plano, quando escolho "+ Nova medida…", então crio a medida ali e ela fica escolhida.
- **CA-1160** · Dado uma medida própria com o mesmo nome de uma da POF, então vale a própria.
- **CA-1161** · Dado duas cópias da conta com medidas próprias diferentes, quando juntam, então ficam as duas; a excluída num aparelho não volta pelo outro (lápide); a mais nova vence no mesmo id.
- **CA-1162** · Dado um plano antigo com medida guardada, quando a medida própria muda ou é excluída, então o item do plano não muda (a medida do item é uma cópia).

### US-AG7 · Receitas na refeição

- **CA-1163** · Dado a busca da refeição, então as receitas da conta aparecem (constante ligada).

## 3. Casos de borda

- **CB-360** · Entrada vazia, só número ("150") ou só medida ("1 concha"): nada é adicionado, sem erro.
- **CB-361** · Medida digitada que o alimento não tem: o resultado pede gramas e não inventa conversão (CB-07 continua).
- **CB-362** · Quantidade zero ou negativa na linha: zero é aceito e não soma; negativo é ignorado (CB-04).
- **CB-363** · Item com `medida` estragada (sem nome, peso ≤ 0, texto no lugar de número): vale a automática, sem quebrar.
- **CB-364** · Uma aba antiga muda os gramas de um item com medida guardada: a quantidade sai dos gramas, e a medida fica aproximada se não fechar.
- **CB-365** · Modo desconhecido gravado por uma versão mais nova: vale "Só medida".
- **CB-366** · Alimento sem medida nenhuma: o seletor só tem "gramas" (e "+ Nova medida…"), com a dica "Sem medida caseira na base. Crie a sua."; o paciente lê os gramas.
- **CB-367** · Link de antes desta versão (sem `escolhida`, sem `quantidades`): "Meu plano" mostra como antes.
- **CB-368** · OFF fora do ar, sem internet ou código inexistente: mensagem no padrão "o que aconteceu e o que fazer", nada é salvo pela metade.
- **CB-369** · Valor da OFF fora do formato (texto, negativo, NaN): fica nulo.
- **CB-370** · Lista de "Meus alimentos" com item estragado: o item é ignorado na leitura e preservado na gravação.
- **CB-371** · Mais de 1.000 alimentos próprios: o cadastro novo é recusado com o motivo.
- **CB-372** · Medida própria com nome vazio, peso ≤ 0 ou > 2000: não salva.
- **CB-373** · Medida própria de um alimento que saiu da base: fica guardada e não aparece.
- **CB-374** · Duas abas da mesma conta: gravar medidas próprias ou alimentos numa avisa a outra (`useOutraAbaGravou`).
- **CB-375** · Concorrência entre aparelhos: dois aparelhos criam o mesmo id de alimento próprio; a renumeração DP-4 continua valendo para os itens novos (os campos novos andam junto).
- **CB-376** · Sem armazenamento no navegador: alimentos e medidas próprias valem só na aba, com o aviso de sempre.
- **CB-377** · Receita salva como alimento com ingrediente excluído: o ingrediente sem dado deixa o nutriente nulo; macro sem dado impede salvar.
- **CB-378** · Cobrir com porção máxima menor que meia medida: usa o passo de 5 g.
- **CB-379** · Busca com termo de uma letra ou só "de": nenhum resultado, sem erro.

## 4. Fora de escopo

- Busca por nome na Open Food Facts (proxy, seção 4.1 do levantamento) e Cobrir de macros (seção 5): rodada seguinte.
- Parte comestível (%) e nome no plural escolhido à mão na medida (o plural segue `pluralDaMedida`).
- Medida própria de alimento próprio fora do item (mora dentro dele).
- "Adicionar em" do Cobrir começando pela refeição do tipo do alimento (A19).
- O nome para o paciente no Word do aconselhamento (A22): o Word continua com o nome da tabela.
- O botão "Tr" (traço) no formulário de "Meus alimentos": vazio é "não informado"; traço se digita como 0.
- Mudar a regra prescritível (`prescritivel.ts`).
- Na publicação 1, a tela "Meus alimentos" continua com o cadastro pelo rótulo de antes (já com a correção da A13); o
  seletor de unidade g/ml (A23) chega com o formulário novo, na publicação 2.

## 5. Correção A da rodada "cuidado total" (22/10/2026)

Status: **pedida pelo coordenador em 22/10/2026** depois da revisão como usuária real (`revisao-usuario.md`, G2, G4, G5,
G7, I3, I4, I5, I10, I11) e da revisão de código (`revisao-codigo.md`, os 3 Importantes e dois Menores da busca); ordem
de pé do dono: "apenas faça". Aprovação pelas telas antes de publicar. O diferencial "o MetaNutri diz o que comer"
propunha medidas que uma nutricionista reconhece como erro em segundos ("5 conchas de alface", "4 colheres de sopa de
chicória = 180 g", "manga em colher de servir", "2 unidades de milho enlatado", "1 fatia de lombo = 190 g"). As porções
do Cobrir, a gestação e a criança ficam na spec `sugestoes-com-criterio` (seção 8); a folha impressa, na
`impressao-do-plano` (seção 8).

### 5.1 Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-430 | **Camada de plausibilidade das medidas da POF**, aplicada na importação (`scripts/dados/importar-medidas-pof.mjs`) a todos os alimentos da base. Uma medida da POF sai quando: **(a) outro preparo**: a fonte da POF (a coluna que diz de onde veio o peso) é de preparo diferente do alimento (alimento cru com fonte cozida, refogada, frita, assada ou grelhada; alimento cozido, assado ou grelhado com fonte crua ou frita; alimento frito com fonte cozida; em carne, ave e peixe só conta cru contra pronto, porque grelhado, assado, frito e cozido dão peças do mesmo tamanho; a unidade do ovo com casca vale cru e cozido, D-381); **(b) outra variedade**: a fonte nomeia uma variedade e o alimento é de outra (unidade da banana prata na banana nanica, unidade da manga espada nas mangas Haden, Palmer e Tommy, unidade do mamão papaia no Formosa); **(c) medida por procuração**: a fonte descreve outro utensílio ("concha" de alface que é "4 colheres de sopa"; "copo americano" de arroz que é "prato fundo raso"; "garfada" e "pegador" que são "colher de sopa"); **(d) tipo que o grupo não usa**: folha crua (alface, rúcula, agrião, almeirão, chicória, espinafre, mostarda, serralha, taioba, caruru, catalonha) só em folha, ramo, pires, prato de sobremesa e prato raso; couve, repolho e acelga crus também em colher (picados); fruta inteira só em unidade, unidade pequena, fatia, pedaço, banda, metade, gomo, bago, rodela, cacho, taça e xícara de chá (abacate e cupuaçu também em colher); milho e ervilha em conserva só em colher; líquido nunca em prato nem, café, chá e leite, em unidade; carne, ave e peixe grelhado, assado ou frito nunca em colher, concha ou escumadeira; ovo frito só em unidade; gordura nunca em copo, xícara, concha nem fatia; açúcar e mel nunca em copo, xícara nem prato; **(e) peso fora do razoável**: colher de sopa acima de 45 g, de servir acima de 120 g, de sobremesa acima de 30 g, de chá acima de 12 g, de café acima de 6 g; colher de chá fora de 1/5 a 1/2 da colher de sopa do mesmo alimento, de sobremesa fora de 2/5 a 4/5, de café fora de 1/10 a 3/10; fatia acima de 100 g (fruta: 250 g); concha acima de 200 g; unidade acima de 800 g. Cada medida que sai vai para `medidas-revisao.md` com o motivo; colher de sopa entre 30 e 45 g fica, marcada para conferência | A POF mede o alimento como a família serve, e o mapeamento TACO→POF ligava o cru à medida do cozido e uma variedade à de outra. Na importação, o JSON fica limpo para todas as telas (busca, linha, Tabela, Cobrir, folha) e a regra é conferida sobre a base inteira |
| D-431 | **Correções no mapeamento** (`regras-mapeamento-taco-pof.csv`), revisadas à mão, incluindo os 18 alimentos mapeados em 21/10: manga por variedade (Haden fica com a fatia da Haden; Palmer e Tommy ficam sem medida, em gramas); pão de forma sem "banda" e "metade" (a POF chama a fatia assim); paçoca sem colher; a "folha" entra nas medidas legíveis (`PREFERENCIA_MEDIDAS`), logo depois do filé, para a medida automática da folha crua ser "3 folhas" | Sem fonte para o peso da unidade da manga Palmer, o peso fica em gramas até a nutricionista criar a medida dela (D-387) |
| D-432 | **Entrada rápida com medida que o alimento não tem** (G4): a linha do resultado mostra o nome inteiro e, embaixo, "Sem xícara de chá · tem colher de sopa (15 g), colher de servir (30 g)" (até 3); embaixo da lista, "+ Nova medida" abre a janela "Nova medida" com o nome já escrito, e ao salvar o alimento entra com a quantidade digitada na medida nova. Enter nessa linha não põe nada e diz "Nada foi adicionado: digite em gramas ou crie a medida." O aviso vai sempre numa linha própria, embaixo do nome, em qualquer largura. Na fruta, o número sem medida conta só "unidade" e "unidade pequena": sem elas, vale o mesmo aviso, nunca "1 fatia" (CA-1258) | O Enter não fazia nada e não dizia nada; a 1280 px o aviso comprido espremia o nome até sumir (`EntradaRapida.tsx:177`) |
| D-433 | **A medida do rótulo vale** (G5 e Importante 3): o texto "Medida caseira da porção" é lido pela mesma leitura da entrada rápida: "4 colheres de sopa" com porção de 40 g vira "colher de sopa · 10 g"; "1 copo (200 ml)" e "1 unidade (30 g)" tiram o peso do próprio texto; "30 g" vira "porção · 30 g". Sem peso no texto, a medida usa a porção do rótulo, e o formulário de antes grava o peso da leitura no texto ("1 porção (30 g)") para os valores por 100 g da Open Food Facts nunca virarem uma medida de 100 g. A porção do rótulo também vira a medida "porção". Sem quantidade digitada, o alimento próprio entra pela porção do rótulo ("granola" → "4 colheres de sopa · 40 g"). "+ Nova medida…" vale também para alimento próprio, gravada como medida da conta (chave `metanutri:medidas-proprias`, que a versão no ar não conhece e não apaga) | A RDC 429/2020 manda o rótulo trazer a medida caseira; ela era pedida e jogada fora |
| D-434 | **Uma tolerância só para a medida: 5%** (G7 e Menor da revisão de código). A medida automática continua escolhida entre as que ficam a até 15% do peso; quando a meia medida fica a mais de 5% (e de 1 g) dos gramas, ela é aproximada, como a escolhida: "130 g (cerca de 1 unidade e meia)" em "Medida e gramas" e em "Só medida", "130 g" em "Só gramas". A escolhida também passa de 1% para 5%. Nas trocas, os gramas da troca viram os da medida que o paciente lê ("1 copo americano (150 ml)", "1 unidade (50 g)") | O paciente nunca lê uma quantidade mais de 5% longe do prescrito sem "cerca de" ou os gramas; antes eram duas regras para a mesma situação |
| D-435 | **Trocar a medida mantém os gramas quando não havia medida guardada** (Importante 1): só o item com medida guardada (objeto) muda os gramas para quantidade × peso da medida nova (CA-1114); com a automática ou sem medida, a quantidade passa a ser gramas ÷ peso da medida nova, como "Fixar a medida" (vale também para "+ Nova medida…") | 102 g de feijão em "6 colheres de sopa" viravam 840 g ao escolher "concha" |
| D-436 | **A medida própria chega ao link** (Importante 2): quando a medida automática do item usa uma medida própria da conta, a cópia do link a leva como escolhida (`escolhida: true`), e "Meu plano" mostra o mesmo que a folha sem precisar das medidas da conta | Com "concha = 100 g", a folha dizia "1 concha (100 g)" e o link "6 colheres de sopa (100 g)" |
| D-437 | **Telas:** a ficha da Tabela de alimentos mostra todas as medidas na ordem do seletor da linha (as suas, depois as legíveis com "unidade" primeiro, depois as outras), sem o corte em 8 (I4); a janela do substituto cabe a 1280 px (I5); o rótulo de seção (`rotulo`) e o selo do `CartaoDestaque` saem da caixa alta para a caixa de frase em negrito, regra do dono (I3), a entrada rápida mostra só "poucos nutrientes" e "Do gasto" vira "% do GET" (glossário); a busca entende "2 pães franceses" (plural em "-eses") e "1.000 ml" (milhar com ponto) | Revisão como usuária (I3, I4, I5) e Menores da revisão de código |
| D-438 | **Landing:** a frase do Cobrir não promete medida que ele nem sempre dá: "o botão Cobrir propõe o alimento e a porção que fecham a diferença, em gramas e, quando a base tem, em medida caseira" (landing, `llms.txt`); a descrição da busca e do compartilhamento deixa de prometer "medida caseira" (D-403 e D-415 da `textos-e-promessas` mudam nesse ponto); as capturas (`scripts/capturas-landing.mjs`) são refeitas depois das correções, sem "Desjejum" e sem "Rúcula 200 g" | I10 e I11 |

### 5.2 Critérios de aceite

- **CA-1220** · Dado alface, rúcula, agrião, almeirão, chicória, espinafre, mostarda, serralha, taioba, caruru e catalonha crus, então as medidas deles são só folha, ramo, pires, prato de sobremesa, prato raso e porção: nenhuma colher, concha, escumadeira, unidade, metade, maço nem tigela.
- **CA-1221** · Dado um alimento cru (abóbora crua, abobrinha crua, chicória crua, berinjela crua, brócolis cru), então nenhuma medida dele tem fonte da POF de outro preparo; dado um alimento cozido, grelhado ou assado, nenhuma tem fonte crua ou frita; dado um frito, nenhuma tem fonte cozida (teste sobre a base inteira, lendo a POF bruta).
- **CA-1222** · Dado uma fruta inteira crua, então ela não tem colher, concha, escumadeira, copo, caneca, prato nem pote, menos abacate e cupuaçu, que têm colher.
- **CA-1223** · Dado milho verde e ervilha em conserva, então eles só têm colheres e porção: nenhuma unidade, espiga, punhado nem concha ("2 unidades de milho enlatado" nunca mais).
- **CA-1224** · Dado carne, ave ou peixe, então nenhuma fatia passa de 100 g (o lombo assado não tem "fatia · 190 g"), e grelhado, assado ou frito não tem colher, concha nem escumadeira; o ovo frito só tem unidade.
- **CA-1225** · Dado banana nanica, ouro, maçã, da terra, figo e pacova, então não têm a unidade da banana prata; dado as mangas Haden, Palmer e Tommy, não têm a unidade da manga espada; dado o mamão Formosa, não tem a unidade, a metade nem o pedaço do papaia.
- **CA-1226** · Dado qualquer alimento da base, então colher de sopa ≤ 45 g, de servir ≤ 120 g, de sobremesa ≤ 30 g, de chá ≤ 12 g, de café ≤ 6 g, e as colheres menores ficam na proporção da de sopa (a linhaça não tem colher de chá de 1,5 g); nenhuma medida por procuração (concha de alface, copo americano de arroz).
- **CA-1227** · Dado a importação, então `medidas-revisao.md` lista cada medida tirada com o alimento, o peso e o motivo, e a tabela da revisão cobre os 597 alimentos (com medida, sem medida e o motivo).
- **CA-1228** · Dado "meia xícara de aveia" na entrada rápida, então a linha da aveia mostra o nome inteiro (também a 1280 px) e, embaixo, "Sem xícara de chá · tem colher de sopa (15 g), colher de servir (30 g)…".
- **CA-1229** · Dado Enter numa linha sem a medida, então nada entra no plano e aparece "Nada foi adicionado: digite em gramas ou crie a medida."
- **CA-1230** · Dado "+ Nova medida" embaixo da lista, então a janela abre com "xícara de chá" no nome; ao salvar 80 g, a aveia entra com "meia xícara de chá · 40 g", e o campo fica vazio.
- **CA-1258** · Dado "1 banana nanica" (fruta sem a unidade na base, D-430), então o número não vira 1 g nem 1 fatia: a linha diz "Sem “unidade” · tem fatia (26 g), pedaço (16 g)" e oferece "+ Nova medida"; "3 arroz" continua 3 g (CA-1102).
- **CA-1231** · Dado um rótulo com porção de 40 g e medida "4 colheres de sopa", então o alimento tem "colher de sopa · 10 g" e "porção · 40 g"; "2 fatias" com 50 g dá "fatia · 25 g"; "1/2 xícara" com 40 g dá "xícara de chá · 80 g".
- **CA-1232** · Dado "1 copo (200 ml)" lido por 100 ml, então a medida é "copo · 200 ml", nunca 100; "1 unidade (30 g)" dá "unidade · 30 g"; um texto sem peso num produto gravado por 100 g da leitura não cria medida de 100 g; o formulário de antes grava a porção da leitura como "1 porção (30 g)" quando o texto não traz o peso.
- **CA-1233** · Dado "granola" (alimento próprio com porção de 40 g em "4 colheres de sopa") na entrada rápida, sem quantidade, então o resultado é "4 colheres de sopa · 40 g", não 100 g.
- **CA-1234** · Dado um alimento próprio na linha do plano, então o seletor oferece "+ Nova medida…", a medida é gravada no cadastro do alimento (publicação 2; na publicação 1 ia para as medidas da conta, que continuam valendo) e fica escolhida; sem medida nenhuma, a linha diz "Sem medida caseira cadastrada."
- **CA-1235** · Dado 130 g de banana prata sem medida guardada, então o paciente lê "130 g (cerca de 1 unidade e meia)" em "Medida e gramas" e em "Só medida", e "130 g" em "Só gramas"; dado 150 g de arroz, "6 colheres de sopa (150 g)" (fecha).
- **CA-1236** · Dado uma medida escolhida com gramas a até 5% da meia medida (200 g em concha de 140 g, 1,5 concha = 210 g), então ela não é aproximada; acima de 5% (190 g), é.
- **CA-1237** · Dado as trocas de qualquer alimento, então cada troca com medida tem os gramas iguais aos da medida ("Leite de cabra · 1 copo americano (150 ml)", "Ovo frito · 1 unidade (50 g)").
- **CA-1238** · Dado um item com medida automática (102 g de feijão), quando escolho "concha" no seletor, então os gramas continuam 102 e a medida fica aproximada; o mesmo com "+ Nova medida…"; com medida guardada, trocar a medida muda os gramas (CA-1114 continua).
- **CA-1239** · Dado a medida própria "concha = 100 g" e 100 g de feijão sem medida guardada, quando copio o plano para o link e as medidas da conta não estão no aparelho do paciente, então "Meu plano" diz "1 concha (100 g)", como a folha.
- **CA-1240** · Dado a ficha da banana prata na Tabela de alimentos, então "unidade · 75 g" é a primeira medida e todas as medidas aparecem (sem corte em 8).
- **CA-1241** · Dado o rótulo de seção e o selo do cartão de destaque, então nenhum usa caixa alta (`text-transform: uppercase`); a entrada rápida não mostra "parte dos nutrientes"; o Resumo do dia diz "% do GET".
- **CA-1242** · Dado "2 pães franceses", então o 1º resultado é o pão francês com 2 unidades; dado "1.000 ml de leite", então são 1.000 ml.
- **CA-1243** · Dado a janela do substituto a 1280 px com um resultado escolhido, então nada passa da borda dela (campo de busca, linha do resultado e o botão "Usar como substituto 2").
- **CA-1244** · Dado a landing, então a frase do Cobrir diz "em gramas e, quando a base tem, em medida caseira", nenhum texto público promete a porção "em gramas e em medida caseira" sem condição, e as capturas da seção "Como funciona" não mostram "Desjejum" nem "Rúcula, crua 200 g".

### 5.3 Casos de borda

- **CB-400** · Alimento que fica sem medida depois da camada (abóbora crua, manga Palmer): o seletor só tem "gramas" e "+ Nova medida…", e o paciente lê o peso.
- **CB-401** · Item gravado antes com uma medida que a camada tirou ("concha" de alface): fica como está, porque o item guarda uma cópia (CA-1162); a nutricionista pode trocar.
- **CB-402** · Medida própria da conta com um nome que a camada tiraria (a nutricionista cria "concha" para a alface): vale, porque é dela.
- **CB-403** · Texto do rótulo sem número ("pote"), com número e sem medida conhecida ("2 biscoitos") ou com zero: "pote" com a porção; "biscoito" com a porção ÷ 2; zero ou peso inválido, nenhuma medida.
- **CB-404** · "+ Nova medida" da entrada rápida cancelado: nada entra e o texto continua no campo.
- **CB-405** · Alimento próprio com o mesmo id em dois aparelhos (renumeração DP-4): a medida da conta é do id; depois da renumeração ela pode ficar no outro alimento. Raro (dois cadastros ao mesmo tempo, sem internet); registrado como risco.

### 5.4 Fora de escopo

- Pesos novos sem fonte (unidade da manga Palmer, da banana nanica, xícara de aveia): a nutricionista cria a medida dela
  até haver fonte citável.
- A ordem da medida automática entre "fatia" e "unidade" na fruta (maçã de 130 g lê "3 fatias e meia").


## 6. Sobras da caminhada dos 4 pacientes (integração, 22/10/2026)

Status: **pedida pelo coordenador em 22/10/2026**, depois das correções A e B, com o que as duas viram e deixaram de
fora na caminhada dos 4 pacientes (`revisao-usuario.md`, M20 e a linha da maçã; relatórios das correções); ordem de pé
do dono: "apenas faça". Aprovação pelas telas antes de publicar. Muda dois pontos da seção 5: o CA-1225 (a banana maçã
passa a ter unidade, D-425) e o segundo item de 5.4 (a ordem entre "fatia" e "unidade" na fruta entra aqui, D-423). As
trocas no papel da refeição ficam na spec `conduta-da-nutricionista`, seção 6.

### 6.1 Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-423 | **Fruta inteira se lê em unidade, ou em meia unidade.** Na fruta crua inteira (categoria "Frutas e derivados", sem suco nem polpa), a medida que o paciente lê (`medidaCaseiraParaPaciente`, a mesma da linha, da folha, do link, do Word, do Cobrir e das trocas) usa como peça só "unidade" e "unidade pequena" quando a fruta tem unidade da base de até 250 g (maçã, pera, laranja, banana prata, goiaba, kiwi); "fatia", "pedaço", "banda", "metade", "gomo" e "rodela" saem dela. Na fruta grande ou sem unidade (mamão, melão, melancia, abacaxi, abacate, manga), "fatia" e "pedaço" valem até 2 ("1 fatia de mamão", "2 pedaços de melancia"); "banda", "metade", "gomo" e "rodela" saem (a meia unidade já diz "meia unidade"). Colher, xícara e taça continuam como estão. Medida da conta (D-387) sempre vale | "Maçã · 3 fatias e meia" e "Banana figo · 2 fatias e meia": ninguém come três fatias e meia de maçã; a medida natural da fruta é a unidade, e a da fruta grande é a fatia |
| D-424 | **Um nome por copo.** Na importação, quando o mesmo alimento tem dois copos com o mesmo peso ("copo médio" e "copo de requeijão", os dois de 240 ml na POF), fica um só, na ordem copo americano, copo de requeijão, copo médio, copo grande, copo tulipa; o "copo médio" de 240 que sobra sozinho passa a se chamar "copo de requeijão", para o iogurte natural e o desnatado (e o leite de vaca e o de cabra) lerem o mesmo copo. O item gravado com "copo médio" continua com o nome dele (cópia no item, CA-1162) | M20: na mesma lista do Cobrir, "meio copo médio" de iogurte desnatado e "meio copo de requeijão" de iogurte natural, o mesmo copo de 240 ml com dois nomes |
| D-425 | **Unidade de outra variedade só com tamanho parecido.** A banana maçã recebe a unidade da banana prata (75 g, fonte da POF "Banana prata - unidade"): as duas têm de 55 a 85 g por unidade nas tabelas de porção. Banana nanica (86 a 110 g), ouro (cerca de 40 g) e figo (banana de cozinhar, sem peso de referência) ficam sem unidade, em gramas, assim como as mangas Haden, Palmer e Tommy (a única unidade da POF é a da manga espada, 140 g; a Palmer pesa cerca de 3 vezes isso). O empréstimo e as variedades em gramas ficam escritos em `medidas-revisao.md`, com o motivo | Sem fonte por variedade, emprestar a unidade só quando o erro fica dentro dos 15% da medida automática; fora disso, o paciente leria uma unidade que não existe |

### 6.2 Critérios de aceite

- **CA-1208** · Dado 130 g de maçã, então o paciente lê a maçã em unidade ("1 unidade pequena e meia" ou "cerca de 1 unidade"), nunca em fatia; dado 75 g de banana prata, "1 unidade"; dado 170 g de mamão Formosa, "1 fatia"; dado 400 g de melancia, "2 fatias"; nenhuma fruta inteira crua lê mais de 2 fatias ou pedaços, nem "banda", "metade", "gomo" ou "rodela".
- **CA-1209** · Dado qualquer alimento da base, então ele não tem dois copos com o mesmo peso; dado o iogurte natural e o iogurte natural desnatado, então os dois têm "copo de requeijão" de 240 g e nenhum tem "copo médio"; no Cobrir, 120 g dos dois se leem "meio copo de requeijão".
- **CA-1210** · Dado a banana maçã, então ela tem "unidade · 75 g" e "1 banana maçã" entra com 75 g; dado as bananas nanica, ouro e figo e as mangas Haden, Palmer e Tommy, então nenhuma tem "unidade"; `medidas-revisao.md` tem as seções "Unidade emprestada de outra variedade" e "Variedades que ficam em gramas", com cada alimento e o motivo.

### 6.3 Casos de borda

- **CB-391** · Item gravado antes com "copo médio" (escolhido): o paciente continua lendo "copo médio", porque o item guarda a medida (CA-1162); só a medida automática e o seletor passam a dizer "copo de requeijão".
- **CB-392** · Medida da conta numa fruta ("fatia" de 30 g que a nutricionista criou para a maçã): vale, porque é dela (como CB-402).

## 7. Correção C da rodada "cuidado total" (22/10/2026)

Status: **pedida pelo coordenador em 22/10/2026** depois da 2ª revisão como usuária real (`revisao-usuario-2.md`: I13,
I10/I15, as sobras do G2, N3, N8, N12, N13 e I19); ordem de pé do dono: "apenas faça"; aprovação pelas telas antes de
publicar. Completa a D-430 e a D-431 (plausibilidade, seção 5), a D-423 (fruta, seção 6) e a D-438 (capturas).

### 7.1 Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-481 | **A linha do plano não corta nada a 390 px.** O nome do alimento quebra linha em vez de terminar em reticências, na linha e, no celular, na lista da entrada rápida; no celular (abaixo de 640 px), o seletor de medida ocupa a linha com a quantidade, e "= gramas" desce para a linha de baixo, para o nome da medida caber inteiro ("copo americano · 150 ml"); as abas "Principal", "Substituto 1" e "Substituto 2" dividem a largura do cartão, sem rolar | I13: "Ovo, de galinha, inteiro…" (cozido ou frito?), "copo american▾" e a aba "Substitut…" cortados |
| D-482 | **Entrada rápida: "2 ovos" é o ovo inteiro.** Gema e clara (partes do ovo) só aparecem quando a busca diz "gema" ou "clara": "2 ovos" traz só ovos inteiros, que se contam em unidade. O alimento sem medida de contar continua em gramas, como a D-371 decidiu ("15 aveia" são 15 g); só a fruta avisa (CA-1258) | I10/I15: "2 ovos" trazia "gema … 2 g · 7 kcal" e "clara … 2 g" |
| D-483 | **Mais regras de plausibilidade (sobras do G2).** Na importação da POF: (a) cereal matinal só em xícara de chá e porção (saem colher de servir, colher de sopa, copo, punhado e xícara de café: o cereal se serve em xícara); (b) queijo e gordura com colher de sopa até 30 g (a ricota de 44 g e a manteiga e a margarina de 32 g saem; ficam fatia, colher de chá e ponta de faca); (c) pão de forma só em fatia (a "unidade" e a "porção" de 70 g do pão de milho de forma vêm do pão de milho redondo); (d) creme de leite só em colher e ponta de faca (sem copo: "1 copo de leite" não acha mais o creme de leite); (e) camarão grande só em unidade, porção e punhado (colher de sopa de 20 g de camarão grande não existe; é o N12: o mesmo camarão saía em "4 unidades" no adulto e "4 colheres de sopa" na criança). Na medida que se mostra: (f) carne, ave e peixe em colher (de sopa, de sobremesa, de servir) só até 4 colheres; acima, outra medida que sirva ou o peso. `medidas-revisao.md` é regerado com cada medida tirada e o motivo | G2: "Cereal matinal de milho · 4 colheres de servir (32 g)", "Ricota · 1 colher de sopa e meia (66 g)" (44 g por colher), "Atum · 7 colheres de sopa e meia" |
| D-484 | **Fruta inteira em peça inteira.** Na fruta inteira crua (D-423), a "unidade pequena" é sempre inteira ("1 unidade pequena e meia" sai); a "unidade" aceita a meia ("meia unidade", "1 unidade e meia" de banana). Como a fruta varia de tamanho, uma peça (ou meia) aceita até 20% do peso (com mais peças, e nas outras medidas, 15%), e a linha diz "cerca de" acima de 5% (D-434): 130 g de maçã Fuji lê "130 g (cerca de 1 unidade)". Medida escolhida pela nutricionista e medida da conta continuam como ela pôs | N8: "Maçã Fuji · 1 unidade pequena e meia (130 g)" e "Laranja pera · 1 unidade pequena e meia" soavam estranhos |
| D-485 | **"Obrigatório no rótulo" diz tudo o que a RDC 429/2020 obriga.** Logo abaixo dos campos, uma linha só de leitura: "A RDC 429/2020 também obriga açúcares adicionados e gorduras trans; os dois não entram no cálculo do plano." Os campos e a validação não mudam | I19: o título afirmava uma lista incompleta (o art. 5º da RDC 429/2020 obriga valor energético, carboidratos, açúcares totais e adicionados, proteínas, gorduras totais, saturadas e trans, fibra alimentar e sódio) |
| D-486 | **Substituto: a lista já mostra a porção equivalente.** Na janela de substituto, cada resultado da busca mostra a porção que vai entrar pelo critério escolhido ("6 colheres de sopa e meia · 117 g · 93 kcal"), não os 100 g padrão | N13: a lista mostrava "100 g · 93 kcal" e o resultado, outra porção |
| D-487 | **Capturas da landing refeitas da gaveta atual** (completa a D-438): com "O plano tem N% da referência", a porção automática e sem nenhum alimento cru que se come cozido na parte recortada (sem "Quiabo, cru") | N3: a vitrine do diferencial mostrava "Quiabo, cru · 100 g" e a gaveta antiga |

N9 não muda: a Tabela de alimentos e o seletor da linha mostram as mesmas medidas (D-437); a D-423 vale para a medida
automática, e a nutricionista ainda escolhe "fatia" à mão.

**D-482 ampliada (22/10/2026, pedido do coordenador depois da caminhada):** "2 ovos" ainda listava "Macarrão, trigo,
cru, com ovos" e "Maionese, tradicional com ovos", e "1 maçã" listava a macaúba. Regra: com um número sem medida nem
unidade (abaixo de 20, D-371) e um nome simples, quando algum resultado tem esse alimento como principal (a parte antes
da primeira vírgula: "Ovo", "Banana", "Pão", "Maçã", com e sem plural e acento), a lista fica só com eles. O composto e
o que só contém o nome no meio ("com ovos", "Torrada, pão francês", "Doce de banana", "Macaúba") saem; a omelete só
aparece quando se escreve "omelete". A ordem de dentro continua (ovo cozido, frito, de codorna). Sem número, ou com
gramas ("100 ovos" é peso, "ovos" sozinho), a busca continua larga. O nome sem vírgula (o alimento próprio "Iogurte grego da casa") tem a primeira palavra como principal (CB-454).

### 7.2 Critérios de aceite

- **CA-1341** · Dado "2 ovos", "1 banana", "2 pães" e "1 maçã", então todo resultado tem como principal o ovo, a banana, o pão e a maçã, e o primeiro lê unidades (o ovo cozido, o pão francês); "2 ovos" não traz macarrão com ovos, maionese, gema, clara nem omelete, e "2 omeletes" traz a omelete; dado "ovos" sem número, o macarrão com ovos continua na lista.

- **CA-1329** · Dado a linha do plano a 390 px com "Ovo, de galinha, inteiro, cozido/10minutos" e "Leite, de vaca, integral" em "copo americano", então o nome aparece inteiro (sem reticências), o seletor mostra "copo americano · 150 ml" inteiro, as três abas cabem sem rolar, e a página não rola para o lado.
- **CA-1330** · Dado "2 ovos" na entrada rápida, então o primeiro resultado é um ovo inteiro com "2 unidades", e nenhum resultado é gema ou clara; dado "2 gemas", a gema aparece.
- **CA-1331** · Dado "2 ovos", então todos os ovos da lista têm medida de contar (ovos inteiros); dado "15 aveia", continua a aveia em flocos com 15 g (D-371): o número não puxa para a frente quem tem medida de contar (o pão de aveia viraria 15 fatias).
- **CA-1332** · Dado o cereal matinal de milho, então ele não tem colher de servir, colher de sopa, copo nem punhado; dado a ricota, a manteiga e a margarina, nenhuma colher de sopa acima de 30 g; dado o pão de milho de forma, só "fatia"; dado o creme de leite, nenhum copo; dado o camarão grande cozido, nenhuma colher; e `medidas-revisao.md` lista cada uma com o motivo.
- **CA-1333** · Dado 120 g de atum em óleo, então a medida que se mostra não é "7 colheres de sopa e meia" (nenhuma carne, ave ou peixe lê mais de 4 colheres); dado "1 copo de leite", nenhum resultado é creme de leite.
- **CA-1334** · Dado 130 g de maçã Fuji e 135 g de laranja pera, então nenhuma lê "unidade pequena e meia" (a maçã lê "1 unidade", com "cerca de" na linha); dado 75 g de banana prata, "1 unidade"; dado 40 g de banana prata, "meia unidade".
- **CA-1335** · Dado o formulário de rótulo em Meus alimentos, então abaixo de "Obrigatório no rótulo" aparece a linha da D-485, e os campos são os mesmos.
- **CA-1336** · Dado a janela de substituto de 150 g de arroz por energia, quando a busca mostra "feijão", então cada resultado mostra a porção equivalente em gramas (a mesma que o resultado escolhido mostra), não "100 g".
- **CA-1337** · Dado as capturas `public/imagens/cobrir-claro.png` e `cobrir-escuro.png`, então elas mostram a gaveta atual ("O plano tem N% da referência") e nenhum alimento cru que se come cozido.

### 7.3 Casos de borda

- **CB-450** · Item gravado antes com a medida que saiu (ricota em "colher de sopa", 44 g): continua com a medida guardada (CA-1162, CB-391).
- **CB-451** · "2 ovos" com um alimento próprio "Ovo caipira" com unidade: ele entra entre os que têm medida de contar.
- **CB-452** · Fruta com medida da conta (D-387): vale como ela pôs, inteira ou não (CB-392).

### 7.4 3ª revisão como usuária real (22/10/2026)

Status: **pedida pelo coordenador em 22/10/2026** depois da 3ª revisão (`revisao-usuario-3.md`, R1 bloqueador, R2, R3 e
os menores R4, R6 e R7). Muda a D-371 no que ela tinha de "alimento sem medida de contar: gramas".

| # | Decisão | Motivo |
|---|---|---|
| D-482a | **Número de 20 ou mais é peso, também com nome de corte.** Filé, bife, peito, coxa, sobrecoxa e posta são medida e nome do alimento: com 20 ou mais, o número é gramas e a palavra fica no nome ("120 filé de frango" = 120 g, "100 peito de frango" = 100 g); abaixo de 20, conta peças ("2 filés de frango" = 2 filés). Medida escrita que não é corte ("25 colheres") continua medida. "1 bife" sem mais nada procura os alimentos que têm a medida "bife". **Trava:** leitura acima de 2 kg (ou 2 litros) mostra "Quantidade muito alta: confira." na lista, e o Enter não põe no plano | R1 (bloqueador): "120 filé de frango" entrava como "120 filés (12.000 g)", 19.102 kcal; "100 peito de frango", 18 kg |
| D-482b | **Número abaixo de 20 nunca vira gramas calado.** Sem medida nem unidade escritas: (1) o alimento com medida de contar conta peças (D-371); (2) a fruta sem unidade avisa (CA-1258); (3) o alimento próprio com porção do rótulo conta porções do rótulo; (4) o alimento com pote ou copo usa o primeiro de pote, copo americano, copo de requeijão e xícara de chá ("1 iogurte" = 1 pote, "1 leite" = 1 copo americano); (5) o resto avisa "Sem “unidade” · tem …", e o Enter não põe ("Nada foi adicionado: digite em gramas ou crie a medida", com "+ Nova medida"). Quem quer gramas escreve "15 g de aveia". Muda o CA-1331 no "15 aveia" | R2: "1 iogurte" entrava com 1 g, "2 pães" listava "Pão, de soja · 2 g" |
| D-482c | **Sinônimos e gênero na busca.** A busca acha "bovino" em "bovina", "moída" em "moído", "cozida" em "cozido" (as terminações -ino/-ina, -ido/-ida, -ado/-ada), e uma tabela curta de apelidos vale junto com o nome escrito: queijo branco → queijo minas frescal; filé de frango → frango, peito; pão de sal → pão francês; aipim e macaxeira → mandioca; boi → bovina. A ordem das palavras não importa | R3: "fígado bovino", "carne moída" e "queijo branco" não achavam nada |
| D-483a | **Mais plausibilidade (menores R4, R6, R7).** Legume ou verdura crua que se come cozida (a lista do "(peso cru)") não tem colher, concha nem escumadeira (são medidas do cozido); a romã não tem "unidade" (a POF pesa 70 g de parte comestível; a romã inteira passa de 200 g); filé de peixe não tem "unidade" nem "unidade pequena" | "Jiló, cru · 1 colher de servir · 95 g (peso cru)", "Romã · 1 unidade · 70 g", "Merluza, filé · meia unidade pequena" |

- **CA-1342** · Dado "120 filé de frango", "100 peito de frango" e "100 coxa de frango", então o 1º resultado é frango com 120, 100 e 100 g; dado "2 filés de frango", 2 filés (200 g); dado "1 bife", alimentos com a medida "bife", em 1 bife; dado "3000 arroz", o aviso "Quantidade muito alta: confira." e nada entra com Enter.
- **CA-1343** · Dado "2 pães", então nenhum resultado diz "2 g" (o pão de soja, sem unidade, avisa); dado "1 iogurte", 1 pote (200 g); dado "200 iogurte", 200 g; dado "15 aveia", o aviso de "unidade"; dado "15 g de aveia", 15 g.
- **CA-1344** · Dado "fígado bovino", "carne moída" e "queijo branco", então a busca acha o fígado bovino, a carne moída e o queijo minas frescal; dado "frescal minas", também.
- **CA-1345** · Dado o jiló cru, nenhuma colher; dado a romã, nenhuma "unidade"; dado o filé de merluza, nenhuma "unidade"; `medidas-revisao.md` diz o motivo de cada uma.
- **CB-455** · Alimento próprio com porção do rótulo e "2 granola": 2 porções do rótulo.
- **CB-456** · "2 litros de água": 2.000 ml entram; "3 litros", não.

## 8. Publicação 2 (23/10/2026)

Status: **ordem de pé do dono, "apenas faça"**; a D-383 previa ligar o formulário novo um dia depois da publicação 1
(22/10). Antes de publicar, uma revisão como usuária real do formulário ligado, que as três revisões anteriores não
viram.

### 8.1 Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-490 | **A constante `MEUS_ALIMENTOS_NOVOS` fica ligada.** A janela antiga do rótulo continua no código, testada com o formulário desligado, como volta segura: desligar a constante devolve a tela de antes sem perder dado, porque as duas versões leem e gravam o mesmo item | A publicação 1 ficou um dia no ar com a verificação de versão de hora em hora; todo aparelho já lê e preserva os campos novos (D-383) |
| D-491 | **A porção do formulário novo é a medida caseira escrita como no rótulo, e a D-433 vale para ela.** O campo se chama "Medida caseira da porção" (como na janela antiga e na RDC 429/2020). "4 colheres de sopa" com porção de 40 g grava a medida "colher de sopa · 10 g"; "pote" com 170 g grava "1 pote" e a medida "pote · 170 g"; "1 copo (200 ml)" grava "copo · 200 ml". Um item antigo abre com o texto inteiro da medida e salva sem perdê-la | O formulário novo gravava "1 4 colheres de sopa" e a medida "4 colheres de sopa · 40 g"; e, ao editar um rótulo antigo cuja medida não começava por "1", apagava a medida caseira |

### 8.2 Critérios de aceite

- **CA-1346** · Dado o formulário novo com porção de 40 g e "4 colheres de sopa" na medida caseira da porção, quando salvo, então o item tem a medida "colher de sopa · 10 g", nenhuma medida chamada "4 colheres de sopa", e o texto da medida fica "4 colheres de sopa"; dado "pote" com 170 g, o texto fica "1 pote" e a medida "pote · 170 g".
- **CA-1347** · Dado um rótulo gravado pela janela antiga com "4 colheres de sopa" na porção de 40 g, quando abro no formulário novo e salvo sem mudar nada, então o texto da medida e a medida "colher de sopa · 10 g" continuam lá, e o formulário não mostra a medida repetida na lista de medidas.

## 9. Correção da revisão da publicação 2 (27/10/2026)

Status: **pedida pelo coordenador em 27/10/2026** depois da revisão "como usuária" da publicação 2 (d105855): os 6
Graves, o I7 e os Importantes pequenos e localizados (I3, I4, I6, I9, I10 e I13). Os Polimentos 6, 7, 8 e 10 (parte da
porção) entram com o I7, porque são texto de mensagem de erro. Ordem de pé do dono: "apenas faça"; a publicação espera
uma nova passada dos passos 6 e 7 da revisão. Muda a D-386 (o alimento próprio passa também por uma regra que lê os
campos declarados e o grupo), o CA-1149 e o CB-377 (o aviso nomeia o ingrediente). A regra prescritível da base
(`prescritivel.ts`) continua igual, como a seção 4 pede; a do alimento próprio mora num módulo dele.

### 9.1 Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-492 | **Restrição pelo grupo do alimento próprio** (G1). Fora da base, a restrição do paciente vale pelo nome, como antes, **e pelo grupo** que a nutricionista escolheu: "Leite e derivados" liga a alergia a leite e a intolerância à lactose; "Ovos e derivados", a alergia a ovo; "Pescados e frutos do mar", a alergia a peixe e a de crustáceos e frutos do mar (o grupo junta os dois, e numa alergia sobrar é mais seguro que faltar); "Carnes e derivados" e "Pescados e frutos do mar", o vegetariano; o vegano junta os três. Pelo grupo, o nome não tira a restrição, menos "sem lactose", "zero lactose", "0% lactose" e "lactose free" na intolerância à lactose (o leite sem lactose é feito para ela). Pelo nome, "vegetal" sozinho deixa de ser exceção: valem "leite vegetal", "bebida vegetal", "iogurte vegetal", "queijo vegetal", "carne vegetal", "hambúrguer vegetal", "salsicha vegetal" e "linguiça vegetal"; "coalho" entra como leite. Vale na linha do plano, no Cobrir, nas trocas, nas sugestões da refeição e na janela de imprimir, que leem a mesma função | "Coalho do Sertão" (Leite e derivados) saía no Cobrir de cálcio e nas trocas impressas de uma paciente com APLV; "Requeijão cremoso com gordura vegetal" passava como seguro porque o nome tinha "vegetal" |
| D-493 | **Regra prescritível do alimento próprio** (G2). Além da regra da base (nome, grupo e preparo, D-386), o alimento próprio não é sugerido (Cobrir e trocas) quando: (a) **nunca**: gordura trans declarada acima de 0 g; bebida alcoólica pelo nome livre (chope, espumante, saquê, gim, rum, tequila, conhaque, uísque e sidra, além da lista da base); (b) **fora da rotina**: grupo "Outros alimentos industrializados" (ultraprocessado); açúcares totais declarados acima de 15 g em 100 g, ou acima de 7,5 g em 100 g ou 100 ml na bebida (grupo Bebidas ou medida em ml) e no grupo Leite e derivados, onde a lactose fica abaixo disso e o resto é açúcar de adição (são os limites de "alto em açúcar adicionado" da rotulagem frontal, aplicados ao açúcar total, que é o que o formulário pede); a fruta (grupo Frutas e derivados, tipo Alimento ou Rótulo) não passa pelo limite de açúcar, porque o açúcar é dela, mas a preparação de fruta passa; pelo nome livre, doce (bolo, pudim, brigadeiro, geleia, goiabada, "doce de", chocolate, sorvete, "em calda", cristalizada…), ultraprocessado (biscoito, bolacha, rosquinha, wafer, salgadinho, barra de cereal, cereal matinal, nuggets, "recheado", "instantâneo") e bebida adoçada (néctar, refresco, refrigerante, suco em pó, bebida láctea, isotônico, energético, chá pronto, leite fermentado, caldo de cana, "adoçado", "com açúcar"). O nome é a última linha de defesa: os campos declarados e o grupo pegam o que o nome não diz. No formulário, com qualquer um desses motivos (ou o grupo Suplementos), a chave "Pode aparecer no Cobrir e nas trocas" fica desligada e travada, com o motivo embaixo ("Não entra no Cobrir nem nas trocas: gordura trans declarada."), e o item grava a chave desligada; na hora de sugerir, a regra vale de novo, para o item gravado antes. A forma de ingrediente (pó, farinha, cru) segue a chave "Incluir ingredientes" do Cobrir, como na base | O Cobrir de ferro sugeria biscoito recheado, rosquinha com gordura trans declarada (200 g, +900 kcal) e bolo de chocolate; o de vitamina C, néctar de acerola. A regra da base lê o nome no formato da TACO ("Bolo,", "Biscoito, doce") e o nome livre escapava |
| D-494 | **No Cobrir, a porção máxima do alimento próprio com porção do rótulo é essa porção** (a porção dos valores com a medida caseira escrita, D-433), sem passar da porção do grupo nem dos 200 g; sem porção do rótulo, vale a do grupo, como hoje | A rosquinha ganhava a porção de um prato de cereal (200 g) |
| D-495 | **"Salvar como alimento" conta zero no que não se aplica** (G3). Na TACO, "NA" (não se aplica) e "não analisado" chegam iguais, vazios. Para a receita virar alimento, contam zero: proteína e carboidrato dos óleos e azeites (ids 259, 260 e 267 a 272), energia e os 4 macros dos sais (516 e 517), e proteína, carboidrato e gordura da aguardente (472). A Tabela de alimentos e os totais do plano não mudam. Com um macro que falta de verdade (coco verde, D-380) ou um ingrediente excluído, nada abre e um quadro de aviso (não o texto cinza da lista) nomeia o ingrediente: "“Coco, verde, cru” não tem energia na tabela. Sem os 4 macros, a receita não vira alimento: troque esse ingrediente ou cadastre a preparação em Meus alimentos." ou "Um ingrediente desta receita foi excluído de Meus alimentos. Troque-o na receita para salvá-la como alimento." | Toda receita com óleo, azeite ou sal era recusada com "Algum ingrediente não tem proteína na tabela", frase que engana quem sabe que óleo não tem proteína |
| D-496 | **Medida com número no nome é lida como no rótulo** (G4). Cada linha de "Medidas caseiras" que começa por uma quantidade ("2 fatias", "1/2 xícara", "meia xícara") vira a medida de uma unidade, com o peso dividido (D-433 e D-491): "2 fatias" com 50 g grava "fatia · 25 g". O peso entre parênteses sai do nome, e vale o do campo Peso. O nome sem número fica como foi escrito. Antes de salvar, a linha mostra a leitura ("Fica fatia · 25 g."). A mesma leitura vale para o item já gravado com "2 fatias · 50 g". "pires" é singular e não perde o "s" | "2 fatias" com 50 g fazia o paciente ler "2 2s fatiass (100 g)" |
| D-497 | **Número que não dá para ler não salva** (G5). No formulário de Meus alimentos, o ponto seguido de grupos de três algarismos, num número que não começa por zero ("1.200", "12.345,6"), é ponto de milhar, como o rótulo brasileiro escreve; o outro ponto ("2.2", "0.500") e a vírgula são decimais. Texto que não é número ("Tr", "3 g", "abc") marca o campo com "Digite só o número, sem a unidade. Traço: 0." e não deixa salvar; nos 4 macros e na porção, essa mensagem vem no lugar de "Informe…" e de "maior que zero". O resto do app (peso, estatura, metas) continua com a leitura de antes (CB-12) | "1.200" mg de sódio virava 1,2 mg, e "3 g" e "Tr" viravam "não informado", em silêncio |
| D-498 | **Item antigo sem os campos de texto abre** (G6). Na leitura de "Meus alimentos", `marca`, `codigoBarras`, `medidaCaseira` e `criadoEm` que faltam (ou não são texto) valem texto vazio; a gravação continua preservando o item como veio (CB-370) | Um item sem `medidaCaseira` derrubava a tela inteira, sem deixar nem excluir |
| D-499 | **Português das mensagens de erro** (I7 e os Polimentos 6, 7, 8 e 10). "Informe a energia: sem ela, o alimento não entra nos cálculos." (a proteína e a gordura total com "sem ela", o carboidrato com "sem ele"); "O valor não pode ser negativo." embaixo do campo, sem depender do gênero de cada nome; "Falta acertar um campo. Ele está marcado." e "Falta acertar 3 campos. Eles estão marcados.", contando campos e não mensagens; "1.000" com ponto no limite da conta; "Proteína, carboidrato, gordura e fibra passam de 105 g em 100 g (somam 105,3 g). Confira os valores."; "Confira os valores." no lugar de "Confira o rótulo." nas regras de açúcares e de saturada; "A porção não pode passar de 2.000 g ou ml." (bloqueia). A janela antiga do rótulo (volta segura, D-490) usa as mesmas frases, e o campo vazio diz "Obrigatório no rótulo." | "Informe carboidrato: sem ela", "Carboidrato não pode ser negativa", "Fibra alimentar não pode ser negativo", "Faltam acertar 3 campos" |
| D-500 | **A linha da rotulagem no tipo Rótulo do formulário novo** (completa a D-485). Logo abaixo dos campos de valores, só no tipo Rótulo: "A rotulagem também obriga açúcares adicionados; eles não entram no cálculo do plano. Gordura trans acima de zero tira o alimento do Cobrir e das trocas." A tela não cita a norma pelo número, e os campos não mudam. A janela antiga continua com a linha dela | A linha da D-485 só existia na janela antiga, e falava de gordura trans, que no formulário novo é campo |
| D-501 | **Energia acima de 900 kcal em 100 g não salva** (I10): "Energia acima de 900 kcal em 100 g. O rótulo traz kJ e kcal: use o valor em kcal." Nem óleo passa de 900 | A farinha com 1.510 kcal (o kJ do rótulo) era salva só com aviso |
| D-502 | **Medidas caseiras: o erro no campo certo e a medida repetida** (I13). O nome vazio diz "Dê um nome à medida." e o peso fora da faixa "Peso maior que 0 e até 2.000 g." (ou ml), cada um embaixo do próprio campo, marcado. Duas medidas com o mesmo nome, depois da leitura da D-496, não salvam: "Já há uma medida “fatia”." O texto-guia do nome passa a "ex.: fatia" | O erro geral não marcava campo nenhum, o texto-guia "fatia" parecia digitado e a segunda "fatia" sumia sem aviso |
| D-503 | **A lista de medidas não nega a medida da porção** (I4). Sem outra medida e com a medida caseira da porção lida, o texto é "A medida da porção (colher de sopa · 10 g) já vale. Acrescente outras, se quiser."; sem nenhuma, continua "Nenhuma medida. Sem ela, o paciente lê o peso." | Com "4 colheres de sopa" na porção, a lista dizia que não havia medida |
| D-504 | **Trocar "Na porção" por "Por 100 g" guarda a medida da porção** (I6): a medida caseira da porção digitada vira uma linha de Medidas caseiras, lida pela D-433 ("4 colheres de sopa" com 40 g dá "colher de sopa · 10 g") | O campo sumia e a medida se perdia ao salvar |
| D-505 | **"Nova medida" de alimento próprio diz onde a medida fica** (I3): "{nome}. A medida fica no cadastro deste alimento, em Meus alimentos." A frase de antes ("fica salva na sua conta e aparece primeiro, marcada “sua”") continua no alimento da base | Para o alimento próprio, a frase prometia o que não acontece |
| D-506 | **Casas decimais como a ficha** (I9). "Copiar para Meus alimentos" e "Salvar como alimento" abrem o formulário com a energia inteira e os outros valores com 1 casa abaixo de 10, inteiros a partir de 10 e com 2 casas abaixo de 1, para não zerar um micronutriente pequeno (tiamina de 0,04 mg) | "76,4241 kcal" e "5,376 g" pareciam erro de digitação |

### 9.2 Critérios de aceite

- **CA-1348** · Dado uma paciente com alergia a leite e um alimento próprio do grupo "Leite e derivados" com nome sem palavra de leite ("Coalho do Sertão"), então a linha do plano diz "Alergia: leite e derivados", ele não entra no Cobrir de cálcio nem nas trocas, e a janela de imprimir o cita; com intolerância à lactose ou vegano, ele também é pego.
- **CA-1349** · Dado um alimento próprio de nome neutro nos grupos "Ovos e derivados", "Pescados e frutos do mar" e "Carnes e derivados", então a alergia a ovo, as alergias a peixe e a crustáceos e frutos do mar, e o vegetariano o pegam, como na D-492; no grupo "Cereais e derivados", nenhuma delas o pega pelo grupo.
- **CA-1350** · Dado "Requeijão cremoso com gordura vegetal" em qualquer grupo, então a alergia a leite e a intolerância à lactose o pegam; dado "Leite vegetal de castanha", "Bebida vegetal de aveia" e "Queijo vegano", a alergia a leite não pega; dado "Hambúrguer vegetal de grão-de-bico", o vegetariano não pega.
- **CA-1351** · Dado "Leite sem lactose" no grupo "Leite e derivados", então a alergia a leite pega e a intolerância à lactose não.
- **CA-1352** · Dado um alimento próprio com gordura trans declarada acima de 0 g e a chave ligada (gravada antes desta versão), então ele não entra no Cobrir nem nas trocas.
- **CA-1353** · Dado um alimento próprio do grupo "Outros alimentos industrializados" com a chave ligada, então ele não entra no Cobrir nem nas trocas.
- **CA-1354** · Dado açúcares declarados acima de 15 g em 100 g (bolo com 35 g), acima de 7,5 g em 100 ml numa bebida (néctar com 11,5 g) ou acima de 7,5 g em 100 g no grupo Leite e derivados (iogurte de morango com 12 g), então o alimento não entra; dado uma fruta do tipo Alimento com 16 g de açúcares, entra.
- **CA-1355** · Dado os nomes "Bolo de chocolate da vó", "Biscoito recheado sabor chocolate", "Rosquinha de coco", "Néctar de acerola" e "Chope artesanal", sem açúcar nem gordura trans declarados, num grupo neutro e com a chave ligada, então nenhum entra; dado "Camu-camu, polpa congelada" (Frutas e derivados), entra com a marca "meu".
- **CA-1356** · Dado no formulário a gordura trans acima de 0, o grupo "Outros alimentos industrializados" ou "Suplementos", açúcares acima do limite ou um nome que a regra pega, então a chave "Pode aparecer no Cobrir e nas trocas" fica desligada e travada, embaixo dela aparece "Não entra no Cobrir nem nas trocas: " com o motivo, e o item grava a chave desligada.
- **CA-1357** · Dado um alimento próprio com porção de 30 g no rótulo, a chave ligada e uma falta grande no Cobrir, então a sugestão dele não passa de 30 g.
- **CA-1358** · Dado uma receita com óleo de soja, outra com azeite e outra com sal grosso, com os outros ingredientes com os 4 macros, quando escolho "Salvar como alimento", então o formulário abre, com a proteína e o carboidrato do óleo e do azeite e a energia e os macros do sal contados como zero.
- **CA-1359** · Dado uma receita com "Coco, verde, cru", quando escolho "Salvar como alimento", então nada abre e um quadro de aviso diz "“Coco, verde, cru” não tem energia na tabela." e o que fazer; dado um ingrediente excluído, o aviso diz que um ingrediente foi excluído de Meus alimentos.
- **CA-1360** · Dado "2 fatias" com 50 g em Medidas caseiras, quando salvo, então o alimento tem "fatia · 25 g" e 50 g se leem "2 fatias (50 g)"; "1/2 xícara" com 40 g grava "xícara de chá · 80 g"; antes de salvar, a linha mostra "Fica fatia · 25 g."; um item já gravado com "2 fatias · 50 g" lê "fatia · 25 g".
- **CA-1361** · Dado "1.200" em Sódio, então o item grava 1.200 mg; "2.2" e "2,2" gravam 2,2; "1.200,5" grava 1.200,5; "0.500" grava 0,5.
- **CA-1362** · Dado "Tr", "3 g" ou "abc" num campo de valor ou na porção, então o campo diz "Digite só o número, sem a unidade. Traço: 0." e o formulário não salva; num macro, essa é a mensagem do campo, não "Informe…".
- **CA-1363** · Dado um item em `metanutri:produtos` só com `id`, `nome`, `marca`, `porcaoG` e `porPorcao`, sem `medidaCaseira`, então "Meus alimentos" abre e mostra o item, "Editar" abre o formulário com a medida caseira vazia e salva, e "Excluir" o exclui.
- **CA-1364** · Dado o formulário vazio, quando salvo, então as mensagens são "Informe a energia: sem ela, o alimento não entra nos cálculos.", "Informe a proteína: sem ela, …", "Informe o carboidrato: sem ele, …" e "Informe a gordura total: sem ela, …"; dado um valor negativo em qualquer campo, "O valor não pode ser negativo."; o resumo diz "Falta acertar N campos. Eles estão marcados." ou "Falta acertar um campo. Ele está marcado.", contando campos.
- **CA-1365** · Dado o limite de 1.000 alimentos, a soma de 105,3 g e as regras de açúcares e de saturada, então as mensagens dizem "1.000", "passam de 105 g em 100 g (somam 105,3 g)" e "Confira os valores."; a porção acima de 2.000 diz "não pode passar".
- **CA-1366** · Dado o tipo Rótulo no formulário novo, então abaixo dos campos de valores aparece "A rotulagem também obriga açúcares adicionados; eles não entram no cálculo do plano. Gordura trans acima de zero tira o alimento do Cobrir e das trocas."; nos tipos Alimento e Preparação, não aparece.
- **CA-1367** · Dado 1.510 kcal em 100 g, então não salva e o campo diz "Energia acima de 900 kcal em 100 g. O rótulo traz kJ e kcal: use o valor em kcal."; dado 884 kcal, salva.
- **CA-1368** · Dado uma medida sem nome, outra com peso 0 e outra com 3.000, então cada campo errado fica marcado com a sua mensagem e o formulário não salva; dado duas medidas "fatia", a segunda diz "Já há uma medida “fatia”." e o formulário não salva.
- **CA-1369** · Dado um rótulo com "4 colheres de sopa" na porção de 40 g e nenhuma outra medida, então a lista de medidas diz "A medida da porção (colher de sopa · 10 g) já vale. Acrescente outras, se quiser."
- **CA-1370** · Dado "Na porção" com 40 g e "4 colheres de sopa", quando troco para "Por 100 g", então Medidas caseiras ganha "colher de sopa · 10 g", e o item salvo tem essa medida.
- **CA-1371** · Dado "+ Nova medida…" na linha de um alimento próprio, então a janela diz "A medida fica no cadastro deste alimento, em Meus alimentos."; num alimento da base, continua a frase de antes.
- **CA-1372** · Dado "Copiar para Meus alimentos" do feijão carioca cozido e "Salvar como alimento" de uma receita, então a energia vem inteira e os outros valores com no máximo 1 casa (2 abaixo de 1).

### 9.3 Casos de borda

- **CB-457** · Alimento próprio sem grupo (item antigo, com a categoria "Meus alimentos"): a restrição vale só pelo nome, como antes.
- **CB-458** · Receita no plano: a restrição continua pelos ingredientes e pelo nome dela; receita não tem grupo.
- **CB-459** · Açúcares não declarados (vazio): a regra do açúcar não vale; valem o grupo, a gordura trans e o nome.
- **CB-460** · Gordura trans "0" ou vazia: não tira o alimento.
- **CB-461** · Item gravado antes com a chave ligada e um motivo da D-493: não é sugerido; no formulário, a chave aparece desligada e travada, com o motivo.
- **CB-462** · Medida sem número e no plural ("fatias"): fica como foi escrita; só a que começa por quantidade é lida.
- **CB-463** · Ponto com três algarismos fora de Meus alimentos (peso "70.500" na ficha): continua decimal, como antes (CB-12).
- **CB-464** · Receita com óleo e com coco verde: o aviso nomeia o coco verde, porque o óleo conta zero.
- **CB-465** · Os micronutrientes do óleo e do sal continuam "não informado" na receita salva como alimento: só os 4 macros contam zero.

### 9.4 Fora de escopo

- Os Importantes que mudam a busca, a ficha ou o desenho da lista: I1 ("barra de cereais" na entrada rápida), I2 (o
  apóstrofo de "d’água"), I5 (rótulo antigo da Open Food Facts abre "Na porção" com 100 g), I8 (a ficha do alimento
  próprio fala como a TACO), I11 (a lista rola para o lado no celular) e I12 (a ordem dos campos no tipo Rótulo):
  publicação seguinte.
- Os Polimentos, menos os 6, 7, 8 e a parte da porção do 10, que entram com o I7.
- Contar zero no óleo e no sal na Tabela de alimentos e nos totais do plano: a marca † continua onde está.
- Mudar a regra prescritível da base (`prescritivel.ts`).
