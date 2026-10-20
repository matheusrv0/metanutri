# SPEC — Vitaminas D, B12, folato, vitamina E e selênio do USDA

Status: **pedida pelo dono em 20/10/2026 ("vamos de 2 apenas, sem fazer contatos"); aprovação pelas telas antes
de publicar.** Em 20/10 o dono também disse "Apenas faça": nenhuma pergunta para ele nem para a parceira de
nutrição. As decisões abaixo foram tomadas pela frente e estão escritas para ele revisar.

**Fonte:** a escolha 2 da proposta de 20/10/2026 (só o USDA, sem TBCA e sem contatar ninguém) e a revisão dos
dados feita no mesmo dia (`revisao.md` e `proposta.json`, fora do repositório): para cada um dos 597 alimentos da
TACO, o equivalente na base pública do governo americano, com grau de confiança, ajuste de densidade e alertas de
fortificação.

**Objetivo:** a TACO não traz vitamina D, vitamina B12, folato, vitamina E nem selênio. Hoje a adequação mostra 16
linhas e ignora esses cinco. Com o complemento, a adequação passa a 21 linhas, o Cobrir funciona para os cinco e a
nutricionista sabe, na ficha do alimento, que aquele valor veio de um alimento equivalente americano. A TACO
continua como está.

**Rodada do coordenador (20/10/2026, depois da primeira entrega):** sobre as dúvidas 1, 5 e 7 do relatório, o
coordenador decidiu, sob o "Apenas faça" do dono: o plano de exemplo usa uma castanha-do-pará no lugar de 15 g (4 g, a unidade da POF: a folha imprime "1 unidade"; com 5 g ela imprimiria "5 g"); o
aviso de limite do Cobrir só aparece quando o alimento sugerido traz o nutriente que passou; o Cobrir ganha porção
máxima para ovo; e o `PRODUCT.md` passa a dizer 21. Ficam o D-301, o D-306 e o D-309 revistos, o R-301 resolvido e os
critérios CA-957a a CA-957c e CA-966a. As outras dúvidas (2, 3, 4 e 6) ficam como estavam.

**Specs que esta muda:** `painel-lateral-enxuto` (CA-703, CB-200, CB-202, CB-211 e R-201 falam em "16"; leia "o
número de linhas da adequação", hoje 21), `sugestoes-com-criterio` (CA-657 e CA-667, "os 16 micronutrientes"),
`estilo-spora` (CA-113 e CA-114, o cartão "16 nutrientes" da área pública, que já é contado e passa a 21) e
`pdf-e-telas-limpas` (CA-321: a marca "USDA" na ficha do alimento é a única exceção à regra de só citar fontes na
página Fontes da base; CA-322: a página passa a citar quatro fontes). Essas specs não são editadas aqui, porque
outras frentes mexem nelas ao mesmo tempo.

## 1. O que existe hoje

- `src/data/alimentos.json`: TACO 4ª edição (NEPA/UNICAMP, 2011), 597 alimentos, 23 chaves por alimento (açúcares e
  gordura saturada são sempre nulos, vêm só de rótulo).
- `src/data/dri.json` já tem referência para `vitamina_d_mcg`, `vitamina_b12_mcg`, `folato_dfe_mcg`,
  `vitamina_e_mg` e `selenio_mcg` em todos os estágios de vida; nenhum alimento tem esses valores.
- A adequação (`MICRONUTRIENTES_ADEQUACAO`) avalia 16 nutrientes. A Ajuda diz "A tabela de composição não traz
  vitamina D, vitamina B12 nem folato".
- A ficha do alimento lista os 20 nutrientes da TACO; a completude ("18 de 20 nutrientes", "dado parcial") conta
  esses 20.
- O produto de "Meus produtos" vira alimento só com as chaves do rótulo; as outras ficam indefinidas.

## 2. Os dados

| | Alta | Média | Baixa | Sem | Total |
|---|---|---|---|---|---|
| Alimentos da TACO | 260 | 48 | 13 | 276 | 597 |

Entram **308** alimentos (alta e média). Valores não nulos entre eles: vitamina D 270, B12 306, folato 305, vitamina
E 279, selênio 301, gordura trans 206. Das 308 escolhas, 307 vêm do SR Legacy e 1 do Foundation Foods (a aveia).

Citação pedida pelo USDA: *U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019.
fdc.nal.usda.gov.* Conjuntos: SR Legacy, versão de abril de 2018 (final); Foundation Foods, versão de abril de 2026.
Baixados em 20/10/2026 de https://fdc.nal.usda.gov/download-datasets/. Licença: domínio público, CC0 1.0 Universal.

## 3. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-300 | **Só o USDA FoodData Central, só o que a TACO não tem**: vitamina D (µg), vitamina B12 (µg), folato em DFE (µg), vitamina E como alfa-tocoferol (mg), selênio (µg) e gordura trans (g, só informativa). Nenhum valor da TACO é trocado. TBCA não entra e ninguém é contatado | Escolha 2 do dono, 20/10/2026. A base americana é de domínio público (CC0) e pede só a citação |
| D-301 | **Regras do dono aplicadas aos dados**: entra confiança alta e média; baixa e sem ficam nulas (melhor sem dado que número errado); o folato de farinha enriquecida fica (a farinha brasileira é enriquecida por lei, RDC 604/2022); o ajuste de água e energia fica; "Cereais, milho, flocos" é flocão (sem enriquecimento); castanha-do-pará com 1.917 µg de selênio em 100 g; nunca copiar fortificação americana (leite, cereal, margarina). *Revisto na rodada do coordenador:* com esse selênio, o plano de exemplo passa a ter **uma castanha (4 g, a unidade da POF)** no lugar de 15 g, a orientação clínica de costume | Decisões do dono sobre a revisão de 20/10. Com 15 g, o selênio do exemplo passava do UL (406,5 µg contra 400 µg). Leite entra pela versão americana sem vitamina D adicionada; cereal matinal, mingau infantil, farinha láctea e margarina ficam sem; a vitamina D do leite de cabra e do minas frescal não é copiada |
| D-302 | **Arquivo próprio, gerado por script**: `src/data/complemento-usda.json`, feito por `scripts/dados/importar-usda.mjs <proposta.json>`. Cabeçalho com fonte, conjuntos, versões, data de download, licença e citação; por alimento, o id da TACO, o número do alimento no USDA (`fdcId`), o conjunto, a versão, a confiança, os seis valores e o ajuste de densidade quando houve. O repositório não guarda os CSVs do USDA | A proposta e os CSVs ficam fora do repositório; o script é a ponte conferível. O arquivo não tem data de geração, para o script dar sempre o mesmo resultado |
| D-303 | **A junção acontece ao carregar**: `alimentos.json` não muda; cada alimento da base ganha as seis chaves (nulas quando não há equivalente) e a origem USDA (`fdcId`, conjunto, versão). Produto de "Meus produtos" fica com as seis nulas, e toda chave que o rótulo não traz passa a nula, nunca indefinida | A TACO fica intacta e auditável. Nada guardado na conta tem nutriente: o plano guarda id e gramas, e o produto guarda o rótulo; os valores saem da base a cada abertura |
| D-304 | **Adequação de 16 para 21 linhas**, nesta ordem: cálcio, ferro, magnésio, zinco, potássio, fósforo, sódio, cobre, manganês, **selênio**, vitamina A, vitamina C, **vitamina D**, **vitamina E**, tiamina, riboflavina, piridoxina, niacina, **folato**, **vitamina B12**, fibra. A gordura trans entra nos totais, mas não na adequação (não tem DRI) nem no planejador: aparece só na ficha do alimento | Minerais com minerais, vitaminas lipossolúveis juntas, complexo B junto. O pedido é trans "informativa" |
| D-305 | **A marca † vale igual**: alimento do plano sem o valor deixa a linha com †. As preparações brasileiras quase todas ficam sem equivalente, então os cinco novos vão aparecer muito com † | Falta de dado nunca entra como zero (princípio do produto, CA-32) |
| D-306 | **O Cobrir não ganha regra prescritível nova**: `prescritivel.ts` vale como está. Para vitamina D saem peixe e ovo; para B12, carne, peixe, leite e ovo; fígado e miúdos só no fim, como pouco usuais. A castanha-do-pará cobre o selênio com 5 g. *Revisto na rodada do coordenador:* (a) a tabela de porção máxima por grupo (a mesma do D-199b da `sugestoes-com-criterio`) ganha três linhas de ovo: **ovo inteiro, de galinha ou de codorna, em qualquer preparo, até 100 g (2 ovos); gema até 40 g (2 gemas); clara até 100 g**. A omelete é preparação e fica fora; (b) o aviso "Passa do limite superior de X." só aparece quando **o alimento sugerido traz X** (valor maior que zero) e o total com ele passa do limite; um plano que já passou do limite não espalha o aviso em toda sugestão | O pedido é usar a regra existente. Conferido no plano de exemplo e no plano vazio (CA-954 a CA-957c). A gema saía com 200 g (umas 11 gemas) para a vitamina D; e no exemplo, com o selênio acima do UL, toda sugestão de qualquer nutriente dizia que passava do limite de selênio, até o kiwi |
| D-307 | **A completude continua medida nos 20 nutrientes da TACO** ("18 de 20 nutrientes", "dado parcial", filtro e ordem "Mais completos") | O complemento cobre metade da base. Contar os cinco marcaria quase toda preparação brasileira como "dado parcial" na busca do plano, e a marca perderia sentido. A falta desses cinco aparece pelo † |
| D-308 | **Proveniência à vista, sem barulho**: na ficha do alimento, depois dos 20 da TACO, vêm vitamina D, vitamina E, folato, vitamina B12, selênio e gordura trans, cada valor com a marca pequena "USDA"; o rodapé da ficha diz de onde veio ("alimento equivalente nº 175168 do USDA FoodData Central, SR Legacy, abril de 2018"). Alimento sem equivalente mostra uma linha só, em cinza: "Sem dado de vitamina D, vitamina E, folato, vitamina B12, selênio e gordura trans." A página Fontes da base cita o USDA ao lado da TACO | Pedido do dono: proveniência visível, mas quieta. A marca USDA é a única fonte nomeada fora da página Fontes da base (exceção ao CA-321 da `pdf-e-telas-limpas`), porque o valor é de outro alimento, não medido no brasileiro |
| D-309 | **Nenhum "16" escrito à mão**: a contagem da adequação sai da lista (21 hoje); os textos que diziam que a base não tem vitamina D, B12 e folato mudam; a ficha deixa de dizer "os 20 nutrientes". *Revisto na rodada do coordenador:* o `PRODUCT.md` também passa a dizer 21 (cinco do USDA). As specs antigas ficam; a integração as anota | O número certo muda sozinho se a lista mudar. A Ajuda e a vitrine diziam coisa que deixa de ser verdade |

## 4. Critérios de aceite

### Dados (`complemento-usda.json` e o script)

- **CA-940** · Dado o complemento, então o cabeçalho traz a fonte "USDA FoodData Central", o autor (U.S. Department of Agriculture, Agricultural Research Service), a citação recomendada, a licença "CC0 1.0 Universal (domínio público)", a data de download 2026-10-20, a base "100 g de parte comestível" e os dois conjuntos com nome, versão, arquivo e SHA-256: SR Legacy 2018-04 e Foundation Foods 2026-04.
- **CA-941** · Dado o complemento, então ele declara as seis chaves com unidade e rótulo, e as unidades das cinco que têm DRI são as mesmas do `dri.json` (µg, µg, µg, mg, µg).
- **CA-942** · Dado cada alimento do complemento, então o id existe na TACO e aparece uma vez só, o `fdcId` é inteiro positivo, o conjunto é "SR Legacy" (versão 2018-04) ou "Foundation Foods" (versão 2026-04), a confiança é "alta" ou "media" e há ao menos um valor não nulo.
- **CA-943** · Dado cada valor, então ele é número finito maior ou igual a zero, ou nulo; e fica dentro da faixa plausível da unidade: vitamina D até 50 µg, B12 até 100 µg, folato até 1.000 µg, vitamina E até 50 mg, selênio até 2.000 µg e gordura trans até 5 g por 100 g.
- **CA-944** · Dado o complemento, então ele tem 308 alimentos, e os 13 de confiança baixa (ids 10, 16, 195, 224, 324, 325, 418, 419, 420, 455, 465, 468 e 512) e as preparações brasileiras sem equivalente (por exemplo 15 bolo de aipim, 533 cuscuz, 551 tapioca com manteiga) não estão nele.
- **CA-945** · Dado a fortificação americana (D-301), então cereal matinal (25, 26), mingau infantil (23), mistura para vitamina (24), farinha láctea (36), mingau em pó (46) e as quatro margarinas (263 a 266) não estão no complemento; o leite integral, o desnatado e os em pó (456 a 459) têm vitamina D de no máximo 0,5 µg; o leite de cabra (454) e o queijo minas frescal (461) têm vitamina D nula.
- **CA-946** · Dado as regras do dono, então a castanha-do-pará (589) tem 1.917 µg de selênio; os flocos de milho (21, 22) têm folato de 30 µg (flocão, sem enriquecimento); a farinha de trigo (35) tem folato de pelo menos 140 µg (enriquecida); e o feijão carioca cozido (561) tem o ajuste de energia (folato 91,92 µg, fator 0,5344).
- **CA-947** · Dado uma proposta com alimentos de confiança alta, média, baixa e sem, quando o script roda, então o arquivo gerado tem só os de alta e média, com os valores propostos copiados sem mudança, o conjunto e a versão do candidato escolhido, e o ajuste quando houve; rodar duas vezes dá o mesmo arquivo, byte a byte.

### Modelo do alimento e totais

- **CA-948** · Dado um alimento da TACO com equivalente, então ele tem as seis chaves com os valores do complemento e a origem USDA (`fdcId`, conjunto e versão); os 23 valores da TACO continuam iguais aos do `alimentos.json`.
- **CA-949** · Dado um alimento da TACO sem equivalente, então ele tem as seis chaves nulas e não tem origem USDA.
- **CA-950** · Dado um plano, então os totais somam as seis chaves como as outras (gramas × valor ÷ 100) e contam como "sem dado" cada alimento com valor nulo.
- **CA-951** · Dado um produto de "Meus produtos", então ele entra nos cálculos com as seis chaves nulas e toda chave fora do rótulo nula; no plano, os totais nunca saem como "NaN".
- **CA-952** · Dado um plano e um produto guardados antes desta mudança (sem as chaves novas), quando são abertos, então nada quebra: o plano soma as 21 linhas a partir da base e o produto conta como "sem dado" nas cinco novas.

### Adequação

- **CA-953** · Dado o cálculo da adequação, então ele devolve 21 linhas na ordem do D-304, cada uma com o rótulo e a unidade do `dri.json`, para todos os estágios de vida (nenhum estágio fica sem referência para as cinco novas).
- **CA-954** · Dado a linha do selênio com total acima do UL (por exemplo, 30 g de castanha-do-pará), então o estado é "acima do limite". Dado o folato e a vitamina E, então o UL não é usado como alerta (vale só para a forma sintética) e a linha tem a nota ‡, como hoje.
- **CA-955** · Dado o plano vazio da Maria (28 anos, individual), quando o Cobrir é pedido para a vitamina D, então as sugestões são peixe e ovo (por exemplo salmão grelhado, atum em conserva, sardinha em conserva, ovo cozido), nenhuma é leite ou derivado com vitamina D de fortificação, nenhuma é fígado antes de alimento de uso comum, e nenhuma passa da porção máxima.
- **CA-956** · Dado o mesmo plano, quando o Cobrir é pedido para a vitamina B12, então as sugestões incluem carne, peixe, leite ou derivado e ovo, com fígado e miúdos só depois dos de uso comum, e nenhuma passa da porção máxima nem da porção do grupo (queijo até 50 g).
- **CA-957** · Dado o plano de exemplo e o plano vazio, com a chave de ingredientes ligada e desligada e porção máxima de 50, 100 e 200 g, quando o Cobrir é pedido para cada uma das 21 linhas, então nenhuma sugestão é item fora da regra prescritível (CA-657 e CA-667 da `sugestoes-com-criterio`, agora com as 21) e a castanha-do-pará, quando sugerida para o selênio, não passa de 30 g.
- **CA-957a** *(rodada do coordenador)* · Dado o Cobrir de qualquer nutriente, no plano vazio e no de exemplo, com porção máxima de 200 g, então ovo inteiro (de galinha cozido, cru ou frito, e de codorna) sai com no máximo 100 g, gema com no máximo 40 g e clara com no máximo 100 g; a porção escolhida menor que essas continua valendo (a menor das duas). A omelete não tem porção de grupo.
- **CA-957b** *(rodada do coordenador)* · Dado um plano com um nutriente acima do limite superior, quando o Cobrir sugere um alimento que não traz esse nutriente (valor zero ou sem dado), então a sugestão não tem o aviso "Passa do limite superior de X."; quando o alimento traz o nutriente, o aviso aparece, como hoje. Para o nutriente abaixo do limite, o aviso continua aparecendo só quando a porção o faria passar.
- **CA-957c** *(rodada do coordenador)* · Dado o plano de exemplo, então ele tem uma castanha-do-pará (4 g, a unidade da POF, que a folha imprime como "1 unidade"), o selênio do dia fica abaixo do UL (400 µg) e nenhum nutriente do exemplo fica acima do limite; a energia do dia continua entre 90% e 110% do gasto.
- **CA-958** · Dado o cartão "Micronutrientes" da etapa 2 e a tabela da etapa 3, então os cinco novos aparecem como os outros: no cartão, entre os 5 mais longe da meta quando for o caso, com † quando falta dado; na tabela, com "Ver os N na meta" contando as 21; e com todos na meta, o cartão diz "Todos os 21 na meta.".

### Ficha do alimento

- **CA-959** · Dado a ficha de um alimento com equivalente (por exemplo "Salmão, sem pele, fresco, grelhado"), então depois dos 20 da TACO aparecem vitamina D, vitamina E, folato, vitamina B12, selênio e gordura trans, cada valor com a marca "USDA" (para leitor de tela, "valor do USDA"); nulo aparece como "não analisado", sem marca.
- **CA-960** · Dado a mesma ficha, então o rodapé diz, numa frase, que os valores marcados USDA são do alimento equivalente nº `fdcId` do USDA FoodData Central, com o conjunto e o mês e ano da versão.
- **CA-961** · Dado a ficha de um alimento sem equivalente (por exemplo cuscuz), então aparece uma linha só, em cinza: "Sem dado de vitamina D, vitamina E, folato, vitamina B12, selênio e gordura trans." e nenhuma marca USDA.
- **CA-962** · Dado a ficha, então a completude continua "N de 20 nutrientes" (D-307); e com nenhum alimento escolhido, a ficha vazia não diz um número de nutrientes.

### Fontes, Ajuda e textos

- **CA-963** · Dado a página Fontes da base, então ela cita o USDA ao lado da TACO, com assunto "Vitaminas D, B12, folato, E e selênio", a citação recomendada, os dois conjuntos com versão, a data de download, a licença CC0 e o link para o FoodData Central; o que vem dela diz que são valores de alimento equivalente para os alimentos sem esses dados na TACO, e quantos alimentos têm.
- **CA-964** · Dado a frase de abertura de Fontes da base, então ela diz quantos alimentos a base tem, os 20 nutrientes da tabela brasileira e quantos alimentos têm o complemento do USDA, tudo contado na base em uso.
- **CA-965** · Dado a Ajuda, então "Limites que você precisa conhecer" diz que vitamina D, B12, folato, vitamina E e selênio vêm de alimento equivalente do USDA e faltam em boa parte das preparações brasileiras, e que a falta aparece com †. A frase antiga ("não traz vitamina D, vitamina B12 nem folato") não aparece.
- **CA-966** · Dado o código, então nenhum texto, teste ou comentário fala em "16" nutrientes da adequação: a contagem vem da lista. A área pública mostra 21 no cartão de nutrientes.

### Exportação

- **CA-966a** *(rodada do coordenador)* · Dado o `PRODUCT.md`, então ele diz que o Cobrir trabalha com 21 linhas (20 vitaminas e minerais e a fibra), que 5 delas (vitamina D, E, folato, B12 e selênio) vêm de alimento equivalente do USDA FoodData Central para 308 dos 597 alimentos, e não diz mais que vitamina D, B12 e folato só existem em produto de rótulo.
- **CA-967** · Dado "Copiar tabela", então o HTML e o texto têm as 21 linhas, com "*" nas que têm alimento sem dado.
- **CA-968** · Dado o Word "Memorial de cálculo", então a tabela de adequação tem as 21 linhas.
- **CA-969** · Dado o site no navegador (e2e), então a ficha do salmão mostra a marca USDA, a tabela da etapa 3 do exemplo tem a linha "Vitamina D", e o Cobrir da vitamina D abre com sugestões.

## 5. Casos de borda

- **CB-300** · Alimento sem equivalente: as seis chaves nulas; no plano, as cinco linhas novas levam †; na ficha, a linha única do CA-961.
- **CB-301** · Zero publicado pelo USDA (inclusive "zero assumido"): é zero, conta como dado e não leva †.
- **CB-302** · Equivalente com algum valor nulo (por exemplo a aveia, sem vitamina D, B12 e E): só aquele valor fica nulo, mostrado como "não analisado"; o alimento continua com a origem USDA.
- **CB-303** · Plano vazio: as 21 linhas abaixo da meta (o sódio sem Cobrir), e o Cobrir funciona para as cinco novas.
- **CB-304** · Produto de rótulo no plano: as cinco novas levam †; o total nunca é "NaN".
- **CB-305** · Dado guardado antes desta mudança: abre igual; nada é migrado, porque nenhum nutriente fica guardado.
- **CB-306** · Selênio acima do limite por castanha-do-pará: "acima do limite" na tabela e no cartão; a sugestão de outro nutriente que passaria do UL de selênio recebe o aviso "Passa do limite superior de Selênio.", como qualquer limite.
- **CB-307** · Proposta com id que não existe na TACO, id repetido, confiança desconhecida, valor negativo ou fora da faixa, nutriente marcado "não copiar" com valor, ou conjunto desconhecido: o script para com mensagem e não grava nada.
- **CB-308** · Script sem o caminho da proposta, ou com arquivo que não é JSON: para com mensagem de uso e não grava nada.
- **CB-309** · Tela de 360 px: a ficha com as seis linhas e a marca USDA não rola para o lado.

## 6. Fora de escopo

- TBCA, rótulo de produto e qualquer contato com terceiros (pedido do dono).
- Trocar valor que a TACO já tem, ou propor equivalente de confiança baixa.
- Gordura trans no rótulo de "Meus produtos", no planejador ou na adequação.
- Separar no folato o ácido fólico da farinha (o UL do folato continua sem alerta, como hoje).
- Mudar a regra prescritível (`prescritivel.ts`). O plano de exemplo e as porções de grupo mudam só no que a rodada do coordenador pediu (D-301, D-306).
- Receitas (outra frente); aqui só a soma fica genérica sobre a lista de chaves.
- Citar o USDA no Word, no PDF ou na nota da adequação (a nota já leva a "Fontes da base").

## 7. Riscos

- **R-300** · Valor americano não é medida do alimento brasileiro: variedade, solo e ração mudam selênio, vitamina D
  (ovo e peixe) e vitamina E (óleos e frituras). A marca USDA e o rodapé da ficha dizem isso por fonte.
- **R-301** · *Resolvido na rodada do coordenador (D-301 e D-306).* O plano de exemplo tinha 15 g de castanha-do-pará: com 1.917 µg em 100 g, o selênio do exemplo fica em
  406,5 µg, acima do UL de 400 µg ("acima do limite" no cartão e na tabela). Como o aviso do Cobrir olha o total do
  plano, toda sugestão do Cobrir no exemplo passa a dizer "Passa do limite superior de Selênio.". É verdade dos dados
  (o dono escolheu o valor do SR; 3 castanhas por dia já são quase o UL), mas aparece logo na primeira tela. Nada
  disso muda aqui (o exemplo e o Cobrir são de outras specs); está nos prints. Saídas possíveis para o dono: o
  exemplo com 5 g de castanha (uma unidade), ou o aviso só quando o alimento sugerido traz o nutriente que passou.
- **R-302** · Com as cinco novas, a vitamina D tende a ficar entre as primeiras do cartão da etapa 2 em quase todo
  plano brasileiro. É o retrato certo do consumo, mas muda o que o cartão mostra hoje.
