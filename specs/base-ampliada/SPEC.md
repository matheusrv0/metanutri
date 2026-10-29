# SPEC — Base ampliada: alimentos genéricos do USDA (fase 1) e produtos de marca (fase 2, só especificada)

Status: **pedida pelo dono em 29/10/2026**; ordem de pé "apenas faça": as decisões abaixo foram tomadas pelos princípios
do produto e estão escritas para ele revisar. Aprovação pelas telas antes de publicar.

**Pedido do dono (29/10/2026):** "preciso de mais alimentos nesse projeto, me perguntaram pq e como já não tinha uma
simples tilápia já cadastrada, não faz sentido termos tão pouco alimento, e ter uma base tão dependente de cadastro
manual, precisamos ser completo e melhor que os concorrentes."

**Fontes:** a pesquisa de fontes de 26/10/2026 (`fontes-de-alimentos.md`, fora do repositório: USDA FoodData Central
para genéricos, Open Food Facts para marcas, TBCA proibida sem licença, APIs pagas proíbem guardar os dados, raspar
concorrente é proibido) e as specs `vitaminas-usda`, `alimentos-e-gramaturas`, `sugestoes-com-criterio` e
`prescricao-rapida-e-base`.

**Hoje:** a base tem os 597 alimentos da TACO, o complemento do USDA (vitamina D, E, folato, B12, selênio e trans para
308 deles) e as medidas da POF. Não há tilápia, quinoa cozida, iogurte grego, cottage, chia, cogumelo, mirtilo nem
macarrão cozido. O que falta, a nutricionista cadastra à mão em Meus alimentos.

**Objetivo da fase 1:** os alimentos **genéricos** que o consultório brasileiro usa e a TACO não tem entram na Base
MetaNutri, com nome em português no padrão da TACO, grupo, preparo, medidas caseiras e todos os nutrientes que a fonte
publica; aparecem na busca depois dos da TACO; os comuns e prescritíveis entram no Cobrir, com bom senso clínico. A
abertura do app não fica mais lenta.

## 1. Os dados

| | Quantos |
|---|---|
| Alimentos lidos do USDA (SR Legacy 7.793 + Foundation 424) | 8.217 |
| Depois da peneira automática (marca, fast food, prato pronto, infantil, caça, álcool, fortificação, duplicatas óbvias) | 2.610 |
| **Entram na base ampliada**, depois da curadoria em duas passadas | **614** |
| Deles, `sugerivel` (podem entrar no Cobrir) | **98** |
| Deles, Foundation Foods (os outros, SR Legacy) | 128 |
| Base MetaNutri depois desta fase (TACO + ampliada) | 1.211 |

Por grupo: Carnes 164, Verduras 101, Cereais 85, Pescados 73, Frutas 49, Leguminosas 39, Nozes e sementes 33,
Leite 25, Miscelâneas 17, Gorduras 9, Ovos 7, Produtos açucarados 6, Bebidas 4, Outros industrializados 1, Preparados 1.

Citação pedida pelo USDA: *U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019.
fdc.nal.usda.gov.* Conjuntos: SR Legacy, versão de abril de 2018 (final, CSV); Foundation Foods, versão de outubro de
2026 (JSON). Baixados em 29/10/2026 de https://fdc.nal.usda.gov/download-datasets/. Licença: CC0 1.0 Universal.

## 2. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-700 | **Fonte só do arquivo oficial, por script.** `scripts/dados/preselecionar-usda.mjs` lê os zips do cache `dados-brutos/cache/usda/` (fora do git), confere o SHA-256 de cada um e lê com o que o Node já tem (zlib, sem biblioteca). Nenhum número é escrito, conferido ou "corrigido" à mão nem por modelo de linguagem: a curadoria decide só nome, grupo, preparo, nome para o paciente e as marcas (`sugerivel`, `naoCopiar`, `ml`) | Pedido do dono e regra do projeto (D-302 da `vitaminas-usda`) |
| D-701 | **Foundation de outubro de 2026 em JSON.** O pacote CSV da Foundation de 29/10/2026 saiu sem `food.csv`, `food_nutrient.csv` e `food_portion.csv`; o JSON da mesma versão está completo e é o arquivo oficial do mesmo lançamento. O SR Legacy continua o CSV de abril de 2018 (o mesmo SHA-256 do complemento de 20/10) | O CSV de outubro não tem os alimentos |
| D-702 | **Peneira automática escrita** (`preselecionar-usda.mjs`): sai categoria inteira (infantil, fast food, restaurante, prato pronto, sopa e molho, indígena americano), marca (palavra toda em maiúscula), fortificação americana, imitação, caça e carne exótica, prato pronto e empanado, doce industrializado, conserva e tempero pronto, fruta em calda, queijo processado, gordura hidrogenada, cereal matinal, salgadinho, embutido americano, bebida industrializada e alcoólica, carne curada, classificação americana de carne ("choice", "select", "prime"), aparo de gordura e as duplicatas óbvias (com sal quando há sem sal, congelado e enlatado quando há fresco, enriquecido quando há sem enriquecimento). Cinco exceções conferidas e escritas no script: kefir natural (o único do USDA), cabrito (cru e assado, comum no Nordeste), sardinha em molho de tomate e suco de uva integral | A curadoria recebe só o que pode ser comida genérica brasileira |
| D-703 | **Curadoria em duas passadas, com glossário fixo** (`dados-brutos/usda/regras-da-curadoria.md`): 17 lotes traduzidos por subagentes e 5 revisões independentes item a item contra o inglês (45 correções). Tudo fica em `dados-brutos/usda/curadoria-base-ampliada.json`: uma linha por candidato, com o nome original, o fdcId, a decisão e o motivo de cada exclusão | O dono pediu tradução coerente e revisão; a decisão fica auditável |
| D-704 | **A TACO vence; a Foundation vence o SR Legacy.** Alimento que a TACO já tem no mesmo preparo não entra (preparo novo entra: "Frango, peito, sem pele, assado"). Quando Foundation e SR têm o mesmo alimento no mesmo preparo, fica a Foundation, e o SR (`complemento`) só preenche o nutriente que a Foundation não publicou, nunca troca um valor; cada chave preenchida fica marcada | Nada de dois "arroz branco cozido"; a regra de uma fonte principal por alimento da pesquisa (seção 4.5) |
| D-705 | **"Alguns milhares" não cabe nos genéricos.** Depois de tirar marca, prato americano, duplicata e o que a TACO tem, o SR Legacy e a Foundation rendem 614 alimentos genéricos relevantes ao Brasil (mais do que dobra a base: 597 → 1.211). Inchar a base com as variações americanas (cortes "choice" e "select", "microwaved", "with salt") seria a "base com duplicata" que o dono não quer. Os milhares chegam com os produtos de marca (fase 2, seção 6) | A meta era "alguns milhares de alimentos relevantes"; o relevante manda |
| D-706 | **Conversão das unidades num lugar só** (`usda-fonte.mjs`): energia "Energy" (1008), sem ela Atwater específico (2048) e geral (2047); carboidrato só por diferença (1005), como a TACO; vitamina A em RAE (1106) ou, sem ela, retinol + betacaroteno ÷ 12 + alfacaroteno e betacriptoxantina ÷ 24 (UI de vitamina A nunca é convertida: não diz quanto é retinol); vitamina D em µg (1114) ou UI ÷ 40; folato em DFE (1190) ou folato do alimento + 1,7 × ácido fólico, ou o total só no alimento sem "enriched"/"fortified"; mg ↔ µg pela unidade do arquivo, que o script confere. Valor negativo publicado (carboidrato por diferença com erro de análise) é nulo, nunca zero. Ausente é nulo | O pedido: "converta as unidades com cuidado: mg, µg e UI para µg, e equivalentes de retinol" |
| D-707 | **Fortificação americana não é copiada** (D-301 da `vitaminas-usda`): `naoCopiar` deixa nulas as chaves que vêm dela (kefir: vitamina A e D; pães e tortilhas de farinha enriquecida americana: tiamina, riboflavina e niacina, porque a farinha brasileira só leva ferro e ácido fólico, RDC 150/2017) | Valor americano de fortificação não é o alimento brasileiro |
| D-708 | **Coerência e faixa** na importação: energia incoerente com os macros pela regra do app (`energiaIncoerente`, D-384) tira o alimento (24 saíram: farelos, especiarias secas, cacau em pó, limão, alfarroba; todos de fibra alta, que o 4/4/9 superestima); valor fora da faixa plausível por 100 g para o script (a banha, gordura pura, tem 902 kcal; o fermento seco, com 2.340 µg de folato, saiu) | Os testes de dados do pedido: faixa plausível e energia coerente |
| D-709 | **Id estável na faixa 100.001 a 199.999**, gravado na curadoria por fdcId. O app guarda ids numéricos (o plano guarda só id e gramas) e trata 900.000 em diante como alimento próprio; a TACO vai de 1 a 597. O script recusa gravar se um fdcId já publicado mudar de id. O "usda:<fdcId>" do pedido fica no próprio alimento (`fdcId`) | Os planos que existem não mudam, e um plano com um alimento novo abre igual amanhã |
| D-710 | **Arquivo próprio, carregado sob demanda.** `src/data/base-ampliada.json` (os 614, gerado) vira um pedaço separado do JavaScript, pedido logo depois de a área de trabalho abrir, sem segurar a primeira tela; o service worker guarda junto com o resto (todo `.js` do app já entra no cache). `src/data/base-ampliada-fonte.json` (citação e contagens, 2 KB) é o único que o site e a página Fontes da base leem | "Para não pesar a abertura"; o site não carrega a base |
| D-711 | **Plano com alimento da base ampliada espera a base.** Enquanto ela não chegou, o planejador desse plano mostra "Carregando a base de alimentos…"; se não chegar (sem internet no primeiro acesso), "Não foi possível carregar a base de alimentos. Confira a conexão e tente de novo." com "Tentar de novo". Plano só com TACO abre na hora, como hoje | Sem a espera, o item apareceria como "Alimento removido" e os totais sairiam parciais por um instante |
| D-712 | **Busca: depois da TACO.** A ordem da D-370 ganha um primeiro critério: a TACO e os alimentos próprios antes da base ampliada; o alimento da base ampliada que a conta já usa concorre como os outros (pela medida digitada, pelo uso e pelo resto da D-370). O preparo que só a base ampliada tem não empurra o cru da TACO para baixo (D-370, item 3, conta só os preparos de fora da base ampliada para os da TACO). "150 arroz" continua no arroz da TACO; "tilápia" acha a tilápia. Vale na entrada rápida (plano, prescrição rápida), na busca do substituto, nas receitas e na Tabela de alimentos | "Os alimentos novos entram na busca, depois dos da TACO" |
| D-713 | **Medidas do USDA com nome da POF**, por script: "1 fillet" vira "filé · 87 g", "1 cup" vira "xícara de chá", "tbsp" "colher de sopa", "medium" "unidade", "large" do ovo "unidade"; gramas por unidade (porção ÷ quantidade); uma medida por nome; onça, libra, embalagem, "serving" e RACC não viram medida. A camada de plausibilidade da POF (D-430) vale no que se aplica: carne e peixe só em peça (filé, bife, fatia, pedaço, unidade, peito, coxa, sobrecoxa, asa, bisteca), gordura só em colher, folha crua só em folha ou unidade, e os pesos máximos (colher de sopa 45 g, colher de chá 12 g, xícara 300 g, fatia 100 g, fruta 250 g) | "As medidas caseiras do USDA traduzidas ('1 filé' = 87 g)" |
| D-714 | **Ficha com a origem, sem barulho.** A ficha do alimento da base ampliada diz no rodapé de onde vêm os valores ("Valores do alimento nº 175177 do USDA FoodData Central (SR Legacy, abril de 2018): “Fish, tilapia, cooked, dry heat”."); quando o SR completou a Foundation, os valores que vieram dele levam a marca "SR" e o rodapé diz o número dele. Como todos os valores são do USDA, as linhas não levam a marca "USDA" uma a uma; a frase "Sem dado de vitamina D…" não aparece | Como a ficha já faz com o complemento (D-308), sem repetir a marca em 26 linhas |
| D-715 | **Fontes da base e venda.** A página Fontes da base ganha "Alimentos que a TACO não tem": a citação do USDA, os dois conjuntos com versão, a data de download, a licença CC0, quantos alimentos e o critério; a frase de abertura conta a base em uso (1.211). Texto de venda continua dizendo só "Base MetaNutri" | Regra do dono: venda sem citar fonte |
| D-716 | **Cobrir com lista de permissão.** O alimento da base ampliada só entra no Cobrir se `sugerivel` (curadoria conservadora: comum no Brasil, prescritível como está, sem cuidado especial, com porção caseira) **e** se passa por `ehPrescritivel`, como qualquer alimento. Nunca são `sugerivel`: miúdo, peixe com muito mercúrio (espadarte, cação, cavala-rei, peixe-batata, atum-azul), cru, frito, adoçado, embutido, bebida, pão, ingrediente, fruto do mar de exceção, queijo curado de nicho, grão de nicho. As porções de grupo do Cobrir (D-199b e D-439) ganham os nomes novos: semente e chia com as oleaginosas (30 g), quinoa e milho verde com cereal e tubérculo cozidos (150 g), e o tubérculo assado como o cozido | O dono já reclamou do Cobrir sugerindo cerveja (`bom-senso-clinico`); a regra prescritível libera o que não reconhece |
| D-717 | **Restrições do paciente** valem para a base ampliada pelo nome e pelo grupo, como no alimento próprio (D-492): "Pescados e frutos do mar" liga peixe e crustáceo, "Leite e derivados" liga leite e lactose, "Ovos" liga ovo, carne e pescado ligam vegetariano. Os termos do trigo e do glúten ganham espelta, triticale, kamut, farro, sêmola e semolina; os da soja ganham tempeh, natto e edamame | Numa alergia, sobrar é mais seguro que faltar; o nome em português já leva os termos |
| D-718 | **Nome para o paciente da curadoria** ("Tilápia grelhada", "Quinoa (peso cru)"): a folha, o link e o Word usam esse nome, como no alimento próprio | A regra geral do nome (D-181) foi escrita para os nomes da TACO |

## 3. Critérios de aceite

### Dados (`base-ampliada.json`, `base-ampliada-fonte.json`, scripts)

- **CA-1700** · Dado `base-ampliada-fonte.json`, então ele traz a fonte "USDA FoodData Central", o autor, a citação, a licença "CC0 1.0 Universal (domínio público)", a data de download 2026-10-29, os dois conjuntos (SR Legacy 2018-04 e Foundation Foods 2026-10) com arquivo, endereço e SHA-256, e as contagens que batem com `base-ampliada.json` (total, `sugerivel`, por conjunto e por grupo).
- **CA-1701** · Dado cada alimento da base ampliada, então o id é inteiro de 100.001 a 199.999 e aparece uma vez só, o fdcId é inteiro positivo e aparece uma vez só, o conjunto é "SR Legacy" ou "Foundation Foods", e o nome original em inglês está guardado.
- **CA-1702** · Dado cada alimento, então o nome está em português no padrão da TACO (começa por maiúscula, partes separadas por vírgula), não repete nenhum nome da base ampliada nem da TACO, o grupo é um dos 15 da TACO, o preparo é um de cru, cozido, grelhado, assado, frito, refogado, torrado ou nulo, e o nome para o paciente não é vazio.
- **CA-1703** · Dado cada valor, então ele é número finito maior ou igual a zero, ou nulo, e fica dentro da faixa plausível da chave (energia até 902 kcal, proteína, gordura, carboidrato, açúcares e fibra até 100 g, colesterol até 3.100 mg, cálcio até 2.500 mg, ferro até 130 mg, vitamina D até 60 µg, folato até 1.000 µg, B12 até 100 µg, selênio até 2.000 µg e as outras da tabela do script).
- **CA-1704** · Dado cada alimento, então a energia é coerente com os macros pela regra `energiaIncoerente` do app, e todo alimento tem energia.
- **CA-1705** · Dado a tilápia, então a base tem "Tilápia, filé, grelhada" (fdcId 175177, SR Legacy) com a medida "filé · 87 g" e a energia, a proteína, a vitamina D, a B12 e o selênio do arquivo, e "Tilápia, filé, crua" da Foundation (2684442), completada pelo SR 175176.
- **CA-1706** · Dado um item Foundation com `complemento`, então todo valor que a Foundation publicou é o dela, e só as chaves nulas nela vêm do SR, listadas em `complemento.chaves`; dado `naoCopiar`, a chave é nula.
- **CA-1707** · Dado o script de importação com uma curadoria pequena escrita no teste, então ele recusa (e não grava nada): id fora da faixa, id repetido, id que mudou para um fdcId já publicado, nome repetido ou igual a um da TACO, grupo ou preparo desconhecido, `complemento` que não é SR de um item Foundation, `naoCopiar` com chave desconhecida, valor fora da faixa e energia incoerente; e monta igual duas vezes.
- **CA-1708** · Dado a leitura do USDA, então a conversão segue a D-706: UI de vitamina D ÷ 40, vitamina A pela soma das partes em RAE quando não há RAE, folato do alimento + 1,7 × ácido fólico quando não há DFE, valor negativo vira nulo, e unidade inesperada para o script.
- **CA-1709** · Dado as medidas, então seguem a D-713: nomes da POF, uma por nome, nenhuma em onça, libra, embalagem ou "serving", carne e peixe só em peça, gordura só em colher e nenhuma acima do peso máximo do nome.
- **CA-1710** · Dado a fortificação (D-707), então o kefir tem vitamina A e D nulas, os pães de farinha enriquecida americana têm tiamina, riboflavina e niacina nulas, e nenhum nome da base ampliada diz "fortificado".

### Lista de conferência

- **CA-1711** · Dado a lista de conferência (`specs/base-ampliada/lista-de-conferencia.md`, 217 alimentos comuns no consultório que a TACO não tem: 195 cobertos, 22 faltando), então cada um marcado "coberto" é achado pela busca da Tabela de alimentos na base ampliada, e cada um marcado "falta" tem o motivo escrito.

### No app

- **CA-1712** · Dado a base ampliada carregada, quando digito "150 tilápia" na entrada rápida, então o 1º resultado é uma tilápia da base ampliada com 150 g; dado "1 filé de tilápia", "1 filé · 87 g".
- **CA-1713** · Dado a base carregada, quando digito "150 arroz", "1 banana" ou "100 frango", então o 1º resultado continua o mesmo de antes (TACO), e nenhum alimento da base ampliada que a conta não usa vem antes de um da TACO que casa com o termo (também na Tabela de alimentos).
- **CA-1714** · Dado uma conta que usa muito "Queijo, cottage", quando digito "queijo", então o cottage aparece entre os primeiros (o uso da conta vence a origem).
- **CA-1715** · Dado o alimento da base ampliada num plano, então o plano guarda só o id e os gramas (e a medida escolhida, como os outros), os totais somam os nutrientes dele, e um plano gravado antes desta mudança abre e soma igual.
- **CA-1716** · Dado a área de trabalho, então a base ampliada é pedida depois da primeira tela, num pedaço separado do JavaScript; antes de ela chegar, a busca acha só a TACO e os próprios; quando chega, a busca, a Tabela de alimentos e o Cobrir passam a ver os alimentos novos sem recarregar a página.
- **CA-1717** · Dado um plano com um alimento da base ampliada e a base ainda não carregada, então o planejador mostra "Carregando a base de alimentos…" e, quando ela chega, o plano; se o carregamento falha, "Não foi possível carregar a base de alimentos. Confira a conexão e tente de novo." e "Tentar de novo".
- **CA-1718** · Dado a Tabela de alimentos, então a frase de cima conta a base em uso (TACO + ampliada), a origem "Base MetaNutri" inclui os alimentos novos, as categorias contam os dois, e a ficha da tilápia mostra o grupo, as medidas ("filé · 87 g"), os 20 nutrientes da tabela e os seis do complemento, e o rodapé com o fdcId, o conjunto, o mês da versão e o nome original; a linha "Sem dado de vitamina D…" não aparece.
- **CA-1719** · Dado um alimento Foundation completado pelo SR, então a ficha marca "SR" nos valores que vieram do SR (leitor de tela: "valor do SR Legacy") e o rodapé diz o número do SR.
- **CA-1720** · Dado um alimento da base ampliada na folha, no link do paciente e no Word, então sai o nome para o paciente da curadoria ("Tilápia grelhada").
- **CA-1721** · Dado a página Fontes da base, então ela tem a fonte "Alimentos que a TACO não tem" com a citação do USDA, os dois conjuntos com versão, a data de download, a licença CC0 e quantos alimentos; e a frase de abertura diz quantos alimentos a base tem, contando a ampliada.
- **CA-1722** · Dado o site e os textos de venda, então nenhum cita USDA, TACO nem outra fonte fora da página Fontes da base; continua "Base MetaNutri".
- **CA-1723** · Dado uma paciente com alergia a peixe, então "Tilápia, filé, grelhada" pega a restrição na linha do plano e não entra no Cobrir; dado alergia a soja, tempeh, edamame e tofu pegam; dado glúten, "Farinha, de espelta" pega.

### Cobrir

- **CA-1724** · Dado o Cobrir de qualquer nutriente, com a base carregada, então nenhum alimento da base ampliada sem `sugerivel` aparece, e todo alimento da base ampliada que aparece passa por `ehPrescritivel` (com a chave de ingredientes desligada).
- **CA-1725** · Dado cada alimento `sugerivel`, então ele passa por `ehPrescritivel`, tem porção de grupo no Cobrir (`porcaoDoGrupo` não é nulo), e nenhum é miúdo, frito, cru de quem se come cozido, peixe com muito mercúrio, pão, bebida ou ingrediente.
- **CA-1726** · Dado o plano de exemplo e o plano vazio, com a base carregada, quando o Cobrir é pedido para cada uma das 21 linhas, então nenhuma sugestão passa da porção máxima do grupo (sementes e chia até 30 g; quinoa até 150 g), e o CA-957 continua valendo.
- **CA-1727** · Dado o plano de exemplo, então a tabela de antes e depois das 5 sugestões do Cobrir para ferro, B6, vitamina D, cálcio, B12 e folato (seção 5) é a do teste, e nenhuma sugestão nova é alface, aipo, pão ou bebida.

## 4. Casos de borda

- **CB-700** · Cache sem o zip, ou com SHA-256 diferente: o script para dizendo qual arquivo e de onde baixar; nada é gravado.
- **CB-701** · Curadoria com fdcId que não está no arquivo do USDA, decisão desconhecida ou exclusão sem motivo: o script para.
- **CB-702** · Nutriente que a Foundation não publicou e o SR também não: nulo; na ficha "não analisado"; no plano, a linha leva †.
- **CB-703** · Zero publicado pela fonte: é zero, conta como dado.
- **CB-704** · Primeiro acesso sem internet (o service worker ainda não guardou a base): busca só com TACO e próprios; plano com item da base ampliada mostra o erro da D-711 com "Tentar de novo".
- **CB-705** · Alimento que sai da base ampliada numa versão futura: o plano mostra "Alimento removido", como hoje; o id nunca é reaproveitado.
- **CB-706** · Medida própria (D-387) num alimento da base ampliada: vale e vem primeiro, como na TACO.
- **CB-707** · "Copiar para Meus alimentos" de um alimento da base ampliada: abre o formulário com a composição e as medidas, como na TACO.
- **CB-708** · Receita com ingrediente da base ampliada: soma como os outros; o plano que tem essa receita espera a base (D-711); a tela Receitas se redesenha quando a base chega.
- **CB-709** · Cobrir pedido antes de a base chegar: sugere só da TACO e dos próprios; quando ela chega, a gaveta aberta se refaz.
- **CB-710** · Paciente gestante: nenhum peixe com muito mercúrio é `sugerivel`; o fígado da base ampliada não é `sugerivel` (o cuidado da fase continua valendo pelo nome).
- **CB-711** · Alimento da base ampliada medido em ml (kefir, chá, café, suco): a folha escreve ml.
- **CB-712** · Termo de busca de uma letra: nenhum resultado, sem erro (CB-379 continua).

## 5. Antes e depois do Cobrir (plano de exemplo)

A tabela fica no PLAN (validação), gerada pelo teste `cobrirAntesDepois.test.ts` com o plano de exemplo da Maria, a
porção automática e a chave de ingredientes desligada.

## 6. Fase 2 — produtos de marca do Open Food Facts (só especificada, não implementada)

**Objetivo:** a nutricionista acha pelo nome os cerca de 37 mil produtos brasileiros do Open Food Facts (OFF), com os
valores do rótulo e a porção, sem cadastrar à mão. O produto entra no plano, nunca no Cobrir (rótulo quase nunca traz
vitamina e mineral; regra C da pesquisa).

### 6.1 As duas arquiteturas

| | (a) Catálogo no Supabase | (b) Arquivos estáticos fatiados na Cloudflare Pages |
|---|---|---|
| Como | tabela `catalogo_alimentos` + função `buscar_alimentos` (texto em português, `unaccent`, `pg_trgm`), chamada a cada busca | o script gera um índice de nomes (nome, marca, id; ~600 KB comprimido) e fatias de detalhe por prefixo do código de barras (~30 KB cada); publicados com o app, baixados sob demanda e guardados pelo service worker |
| Licença ODbL (atribuição e "compartilhar igual") | o catálogo derivado é usado em público pela busca: precisa ser oferecido em ODbL; a oferta é um arquivo à parte, que ainda teria de ser gerado | os próprios arquivos são a oferta: publicados com a nota da ODbL e o link para o OFF, separados da TACO e do USDA (nenhuma mistura "contamina" a base) |
| Tamanho | 60 a 100 MB no banco (estimativa da pesquisa), dentro do plano gratuito | ~10 MB de fatias hospedadas; o aparelho só baixa o índice e as fatias usadas |
| Atualização | carga de 37 mil linhas pelo **SQL Editor**, que só o dono roda, do celular: colar milhares de linhas no editor do celular é impraticável e arriscado em produção | o script roda no GitHub Actions e publica com o `publicar.yml` que o dono já liberou; nada no banco |
| Busca sem acento e com erro de digitação | `unaccent` + `pg_trgm` (extensões a ligar e conferir no painel) | normalização sem acento e trigramas no navegador, sobre o índice (37 mil nomes respondem em menos de 50 ms) |
| Sem internet | não funciona | funciona depois do primeiro uso |
| Privacidade | o servidor vê cada busca | a busca não sai do aparelho |
| Custo | saída de dados do Supabase (perto do limite gratuito com 100 nutricionistas, pesquisa 4.12) | nenhum (a Cloudflare Pages não cobra tráfego) |
| Ponto fraco | depende do SQL do dono e da rede | atualização só a cada publicação; índice de ~600 KB no primeiro uso |

### 6.2 Recomendação: **(b), arquivos estáticos fatiados**

O que decide: o SQL de produção só o dono roda, pelo SQL Editor do celular, e a carga e a atualização de 37 mil
produtos por ali não é viável; os arquivos estáticos cumprem a ODbL de forma limpa (o arquivo publicado é a oferta),
funcionam sem internet, não custam e não mandam a busca da nutricionista para o servidor.

### 6.3 O que a fase 2 precisa decidir antes do código

- O id do produto: a faixa 200.000 a 899.999 por código de barras não cabe (13 dígitos); o produto escolhido vira uma
  **cópia** em Meus alimentos (como a pesquisa, seção 4.4), e o plano aponta para a cópia. Isso mantém o "o plano guarda
  só id e gramas" e o plano não muda quando o OFF muda.
- A nota de atribuição na ficha ("Rótulo: Open Food Facts", com link para o produto) e na página Fontes.
- O que fica fora: produto sem energia ou com energia incoerente, sem nome, com "nutrition data incomplete"; foto
  (CC BY-SA, pode ter marca de terceiro) não aparece.
- Atualização: o script mensal sobre a cópia completa do OFF (os arquivos diários não dizem o que foi apagado).

## 7. Fora de escopo

- Produtos de marca (fase 2, seção 6), FNDDS, TBCA, outras tabelas estrangeiras, APIs pagas, raspar concorrente.
- Trocar valor da TACO ou do complemento de 20/10; misturar valores de duas fontes num nutriente (só preencher nulo).
- Mudar `prescritivel.ts` (a lista de proibições continua igual; a permissão da base ampliada é a curadoria).
- Cobrir de macronutrientes; produto de marca no Cobrir.
- Medida caseira que o USDA não publica (o iogurte grego e a carne moída ficam em gramas até a nutricionista criar a
  medida dela, D-387).
- Contar a base ampliada na completude ("N de 20 nutrientes" continua sobre os 20 da TACO, D-307).

## 8. Riscos

- **R-700** · Valor americano não é o alimento brasileiro (o mesmo R-300): variedade, ração e solo. A ficha diz a
  origem; a TACO vence quando tem o alimento.
- **R-701** · A curadoria é tradução de modelo de linguagem com revisão de modelo de linguagem; nenhum nutricionista
  revisou os 614 nomes. Os 98 `sugerivel` são os que mais pesam: estão listados no PLAN para a parceira conferir.
- **R-702** · O Cobrir muda de cara (alimentos novos competem com os da TACO pela densidade do nutriente): a tabela da
  seção 5 mostra o efeito no exemplo.
- **R-703** · Primeiro acesso sem internet não tem a base ampliada (CB-704).
