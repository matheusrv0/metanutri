# SPEC — Base ampliada, fase 2: produtos de marca do Open Food Facts, pelo nome

Status: **pedida pelo coordenador em 29/10/2026**, sob o "apenas faça" do dono, depois da aprovação da fase 1
(`specs/base-ampliada/SPEC.md`, seção 6, recomendação (b): arquivos estáticos fatiados). Aprovação pelas telas antes de
publicar.

**Objetivo:** a nutricionista acha pelo nome, na entrada rápida do plano, os produtos brasileiros do Open Food Facts
(OFF), com marca e porção. Ao escolher um, o produto vira uma cópia em Meus alimentos e entra no plano. Hoje isso só
existe pelo código de barras e com internet.

## 1. Números (medidos em 29/10/2026)

| | |
|---|---|
| Arquivo da fonte | `en.openfoodfacts.org.products.csv.gz`, 1,52 GB (CSV com tabulação, todos os países), exportação oficial de 29/10/2026 |
| A outra exportação | `openfoodfacts-products.jsonl.gz`, 13,3 GB: mesmos nutrientes por 100 g; descartada pelo tamanho |
| Download aqui | 164 s (9,3 MB/s) |
| Leitura em stream | 84 s no script (que só abre as linhas com "en:brazil"); 6 min para ler as 4.881.991 linhas inteiras |
| Do Brasil (`countries_tags` com `en:brazil`) | 37.689 |
| Depois da peneira (D-752) | **23.096** (saem 7.324 sem energia ou acima de 900 kcal, 2.837 com energia incoerente, 2.710 sem um dos macros ou com macro impossível, 1.709 sem nome e 13 sem código) |
| Índice de nomes | 1,75 MB (515 KB com gzip, como a Cloudflare serve) |
| Fatias de detalhe | 100 fatias, 3,8 MB no total (605 KB com gzip; cerca de 47 KB, ou 7,6 KB com gzip, cada) |
| Impacto na abertura do app | nada do catálogo é pedido até a primeira busca com 3 letras; a entrada principal cresce 2,2 kB com gzip (o código da busca e da cópia) |

## 2. Decisões

| # | Decisão | Por quê |
|---|---|---|
| D-750 | **Fonte: a exportação oficial em CSV**, lida por script em stream (`zlib` e `readline` do Node, sem dependência nova). Fica só o produto com `en:brazil` em `countries_tags`. O arquivo de 1,52 GB vai para `dados-brutos/cache/off/` (fora do git, como o cache do USDA); o script baixa com `--baixar` e grava o SHA-256 e a data da exportação no cabeçalho do resultado | O CSV tem os mesmos campos `*_100g` que a API e que `codigoBarras.ts` lê, com um nono do tamanho do JSONL |
| D-751 | **Conversão de unidades igual à do código de barras.** A tabela de nutrientes do OFF (chave, campo, fator) sai de `codigoBarras.ts` para `src/data/off-nutrientes.json`, lida pelos dois: o script e a leitura ao vivo. Energia em kcal; sem ela, kJ ÷ 4,184; sódio do campo de sódio; sem ele, do sal ÷ 2,5. Valor ausente, texto, negativo ou NaN é **nulo, nunca zero** | Um produto lido pelo catálogo e o mesmo lido pelo código têm os mesmos números |
| D-752 | **Peneira.** Sai o produto: sem código numérico de 8 a 14 dígitos; sem nome (`product_name_pt`, ou `product_name`); sem energia; sem proteína, gordura ou carboidrato (sem eles a coerência não se confere); com energia incoerente pela regra de Meus alimentos (D-384, a mesma `energiaIncoerente`); com macro acima de 100 g em 100 g, ou com soma de macros acima de 105 g; duplicado (fica o de nome mais completo). Foto não entra | "Descartar produto sem energia ou com tabela incoerente"; a regra de Meus alimentos já é a do app |
| D-753 | **O que é publicado.** Em `public/catalogo-off/<versão>/` (a versão é a data da exportação): `indice.json` (código, nome, marca, porção em gramas, texto da porção, unidade e kcal por 100, em listas compactas), 100 fatias `fatias/NN.json` pelos dois últimos dígitos do código (distribuição uniforme; os códigos brasileiros começam todos por 789) com os 31 valores por 100 g, e `LICENCA.txt`. O cabeçalho pequeno `src/data/catalogo-off-fonte.json` (versão, data, contagem, SHA-256, licença) entra no pacote do app. Só no app: o build do site apaga a pasta | Os arquivos são a oferta da ODbL; separados da TACO e do USDA |
| D-754 | **Atualização: o resultado compacto é commitado; um GitHub Actions mensal o regenera e abre um pull request.** O workflow `atualizar-catalogo-off.yml` (mensal e manual) baixa a exportação, roda o script e abre o PR; o dono revisa e faz o merge, e a Cloudflare publica o app a partir da `main`, como sempre (o `publicar.yml` é só o site). **Não** no build da Cloudflare: cada publicação baixaria 1,5 GB, o build passaria a depender do OFF no ar e gastaria uns 5 min dos 20 a cada deploy, para um dado que muda devagar. O tamanho commitado (5,5 MB, 1,1 MB com gzip) cabe no git; com os arquivos ordenados pelo código, a diferença de um mês para o outro é só o que mudou | Publicar não pode depender de um site de terceiros; o dono vê o que muda antes |
| D-755 | **ODbL.** A ficha do produto copiado diz "Rótulo: Open Food Facts" com o link para a página do produto (`https://world.openfoodfacts.org/product/<código>`) e a versão do catálogo. A página Fontes ganha "Produtos de marca": citação, versão, data, quantos produtos, licença ODbL (base) e DbCL (conteúdo), e o link para os arquivos publicados com o aviso de licença ao lado (a oferta "compartilhar igual"). Nada do OFF se mistura com a TACO ou o USDA | Atribuição e "compartilhar igual" da ODbL |
| D-756 | **No plano, uma cópia.** Escolher um produto do catálogo grava uma cópia em Meus alimentos, com a estrutura que já existe: fonte `open-food-facts` (código e versão do catálogo), valores por 100 g ou 100 ml, marca, porção como medida, "Pode aparecer no Cobrir" desligado. O plano aponta para a cópia (id de alimento próprio); atualizar o catálogo nunca muda o plano. Se a conta já tem a cópia do mesmo código, usa essa, sem duplicar | O plano guarda só id e gramas; a fonte não pode mudar o plano sozinha |
| D-757 | **Cobrir: o catálogo não entra.** A cópia nasce com "Pode aparecer no Cobrir e nas trocas" desligado (nível C da pesquisa: o rótulo quase nunca traz vitamina e mineral). A nutricionista pode ligar na cópia, como em qualquer alimento próprio | Regra C |
| D-758 | **Busca.** Na entrada rápida, os produtos do catálogo vêm **depois** da TACO, da base ampliada e de Meus alimentos, com a marca e a porção na linha e a marca "rótulo". O índice de nomes é pedido na primeira busca com 3 letras ou mais e fica no service worker. A busca é sem acento e sem pontuação, por palavras (todas presentes, em qualquer ordem), tolerante a um erro de digitação em palavra de 5 letras ou mais; o nome que começa pela primeira palavra vem antes; até 5 produtos. A quantidade digitada vale como nos outros: "150 iogurte" são 150 g; "1 iogurte X" é a porção do rótulo | O que a nutricionista digita hoje continua igual; o catálogo só soma |
| D-759 | **Código de barras: primeiro o catálogo.** No cadastro de Meus alimentos, o código procura primeiro na fatia do catálogo; só se não achar chama o OFF ao vivo, como hoje. Achado no catálogo, o aviso diz "do catálogo de rótulos (versão …)" | Funciona sem internet depois do primeiro uso e poupa o OFF |
| D-760 | **Ids.** O produto do catálogo na lista da busca tem um id provisório da faixa 800.000.000 a 899.999.999, que nunca vai para o plano: ao escolher, vira a cópia com id de alimento próprio | O id de 13 dígitos do código não cabe nas faixas de id |
| D-761 | **Alergênicos do rótulo** (revisão da fase 2, achado 1, alta). O script grava por produto o que "contém" (as tags `allergens` do OFF e as palavras dos ingredientes, em português, inglês e espanhol: trigo, cevada, centeio, aveia, malte, glúten; leite, soro, caseína, lactose, manteiga, queijo; ovo; soja e lecitina; amendoim; castanhas; peixe; crustáceos e moluscos) e o que "pode conter" (as `traces_tags` e o trecho dos ingredientes depois de "pode conter"), como bits no fim de cada produto da fatia, e marca "sem informação" quando o OFF não traz tag, traço nem ingrediente. O que lembra e não é sai antes de procurar ("leite de coco", "manteiga de cacau", "óleo de soja", "noz-moscada", "en polvo"); o produto "zero lactose" não liga a lactose. A cópia em Meus alimentos grava `alergenicos` ("contém" e "pode conter" separados), e `restricaoDoAlimento` lê o campo nos alimentos próprios, como já lia o da base ampliada. "Pode conter" acusa nas alergias e no glúten, com "(pode conter)" no aviso; na intolerância à lactose, só "contém" acusa. Sem informação, com alergia ou intolerância marcada, a linha diz "Sem informação de alergênicos: confira a embalagem." | Erro de alergia é o mais grave; o nome e a marca não dizem o ingrediente |
| D-762 | **A porção que não é porção sai** (revisão da fase 2, achado 2). A porção do rótulo é descartada, e o produto fica só por 100 g, quando é igual ou maior que a embalagem (`product_quantity`), passa de 300 g, ou é molho ou condimento (pelo nome ou pela categoria do OFF) com mais de 50 g. Saem "Shoyu Light" com 500 g, "Maionese verde" com 872 g e "Pão de queijo" com 1.000 g | "1 iogurte" e "1 porção" têm de ser o que se serve |
| D-763 | **Pó é em gramas** (revisão da fase 2, achado 4). Whey, achocolatado, cappuccino, leite em pó, composto lácteo e fórmula infantil ficam em g, mesmo quando a embalagem ou a porção do rótulo traz ml (o preparo). A mesma expressão vale no script e na leitura ao vivo do código de barras (um teste confere) | "1 colher de Nescau" não é 20 ml |

**Acerto de alergênicos na régua da revisão** (`alergia.py`: os 23.096 produtos, contra o que o próprio OFF publica):

| Alergênico | "Contém" no OFF: antes | depois | "Pode conter" no OFF: antes | depois | Só nos ingredientes: antes | depois |
|---|---|---|---|---|---|---|
| Glúten | 57 de 212 (27%) | 212 (100%) | 163 de 585 | 585 | 546 de 2.255 | 2.255 |
| Leite | 63 de 217 (29%) | 217 (100%) | 58 de 392 | 392 | 748 de 1.544 | 1.517 |
| Ovo | 4 de 47 (9%) | 47 (100%) | 4 de 195 | 195 | 49 de 327 | 327 |
| Soja | 10 de 215 (5%) | 215 (100%) | 1 de 338 | 338 | 28 de 983 | 919 |
| Amendoim | 21 de 39 (54%) | 39 (100%) | 2 de 204 | 204 | 92 de 250 | 250 |
| Castanhas | 14 de 39 (36%) | 39 (100%) | 27 de 365 | 365 | 62 de 300 | 294 |
| Peixe | 8 de 10 (80%) | 10 (100%) | 0 de 30 | 30 | 43 de 55 | 55 |
| Crustáceos e moluscos | 0 de 4 (0%) | 4 (100%) | 0 de 28 | 28 | 5 de 777 | 64 |

Nos ingredientes, o que fica de fora é de propósito: "leite de coco" e "manteiga de cacau" (leite), "óleo de soja" refinado (soja) e "cacao en polvo", que a régua da revisão lia como polvo; dos 777 produtos que a régua conta em crustáceos, quase todos são esse "en polvo".

## 3. Critérios de aceite

### Script e arquivos

- **CA-1750** · Dado o CSV do OFF, quando o script roda, então só ficam produtos com `en:brazil` em `countries_tags`, cada um com código, nome, energia, proteína, gordura e carboidrato, e nenhum com energia incoerente (D-752).
- **CA-1751** · Dado um produto com um nutriente ausente, em texto ou negativo, então o valor gravado é nulo, nunca zero (D-751).
- **CA-1752** · Dada a mesma linha do OFF, então os valores por 100 do script são os de `nutrientesPor100` de `codigoBarras.ts`, inclusive kJ e sal (D-751).
- **CA-1753** · Dado o resultado, então o índice e as 100 fatias estão em `public/catalogo-off/<versão>/` com `LICENCA.txt`, todo código do índice está na sua fatia, e o cabeçalho conta os produtos do índice (D-753).
- **CA-1754** · Dado o mesmo CSV duas vezes, então a saída é idêntica (ordem pelo código).

### Busca e plano

- **CA-1755** · Dado o índice carregado, quando a nutricionista digita o nome de um produto (sem acento, ou com uma letra errada), então ele aparece na entrada rápida depois dos alimentos da TACO, da base ampliada e de Meus alimentos, com a marca e a porção (D-758).
- **CA-1756** · Dado um produto do catálogo na lista, quando ela escolhe, então uma cópia é gravada em Meus alimentos com fonte Open Food Facts, código, versão, valores por 100, porção como medida e Cobrir desligado, e o item que entra no plano aponta para a cópia (D-756, D-757).
- **CA-1757** · Dada a cópia já gravada, quando ela escolhe o mesmo produto de novo, então nenhuma cópia nova é criada.
- **CA-1758** · Dado o plano com a cópia, quando o catálogo é atualizado (outra versão), então o plano e a cópia não mudam.
- **CA-1759** · Dado o Cobrir de qualquer nutriente, então nenhum produto do catálogo aparece, e a cópia só aparece se a nutricionista ligar o Cobrir nela (D-757).

### Atribuição e código de barras

- **CA-1760** · Dada a ficha de uma cópia do catálogo, então o rodapé diz "Rótulo: Open Food Facts", com o link para o produto, e a versão (D-755).
- **CA-1761** · Dada a página Fontes, então ela tem "Produtos de marca" com a citação, a versão, a contagem, a ODbL e o link para os arquivos e o aviso de licença (D-755).
- **CA-1762** · Dado um código que está no catálogo, quando a nutricionista o lê no cadastro, então os valores vêm da fatia, sem chamar o OFF ao vivo; dado um que não está, então o OFF ao vivo é chamado como hoje (D-759).
- **CA-1763** · Dado o build do app, então a pasta do catálogo está em `dist/` e fora do precache do service worker (cache sob demanda), e o build do site não a tem (D-753).
- **CA-1764** · Dada a abertura do app, então nenhum arquivo do catálogo é pedido antes da primeira busca com 3 letras (D-758).

## 4. Casos de borda

- **CB-750** · Sem internet e sem o índice no cache: a entrada rápida funciona com a TACO, a base ampliada e Meus alimentos, e uma linha discreta diz que os produtos de marca precisam de internet no primeiro uso; nada trava.
- **CB-751** · A fatia não carrega na hora de escolher: o item não entra, a linha diz "Não foi possível carregar o produto. Tente de novo." e nenhuma cópia pela metade é gravada.
- **CB-752** · O produto não está mais na fatia (versão nova entre o índice e a fatia): tratado como o CB-751.
- **CB-753** · Busca de 1 ou 2 letras: o catálogo não é consultado.
- **CB-754** · Produto com nome repetido em marcas diferentes: as duas linhas, cada uma com a sua marca.
- **CB-755** · Produto em ml (bebida): a cópia é em ml, como na leitura ao vivo.
- **CB-756** · Restrições do paciente: a cópia é um alimento próprio e passa pelas restrições pelo nome e pelo grupo, como hoje (D-492).
- **CB-757** · O CSV muda de colunas: o script para dizendo qual coluna falta, sem gravar.

## 5. Fora de escopo

- O catálogo na Tabela de alimentos (só a entrada rápida e o código de barras nesta fase).
- Foto do produto e Nutri-Score. (Os alergênicos saíram daqui: D-761.)
- Atualização automática sem revisão (o PR mensal é revisado pelo dono).
- Produtos de outros países.
- Rodar o workflow mensal aqui (sem push); a primeira execução é manual, depois do merge.

## 6. Riscos

- **R-750** · Dado colaborativo: o OFF é preenchido por voluntários. A cópia diz a fonte e a versão; a ficha manda conferir com a embalagem (como a leitura ao vivo).
- **R-751** · O tamanho cresce com o OFF: o PR mensal mostra o tamanho; acima de 30 MB, rever a fatia.
- **R-752** · Workflow mensal não testado aqui (sem push): a primeira execução é manual, e o repositório precisa permitir que o GitHub Actions abra pull requests (Settings > Actions > General).
