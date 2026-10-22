# SPEC — A conduta da nutricionista: o que sugerir, trocas reais, quantidades, água e anamnese

Status: **pedida pelo dono em 20/10/2026, a partir da revisão da nutricionista parceira de 19/10**. O dono disse
"Apenas faça": as dúvidas foram decididas pelos princípios da parceira (abaixo) e ficam escritas aqui; a aprovação é
pelas telas antes de publicar.

**Ficha única (21/10/2026).** A spec `ficha-unica` substitui o D-299 na parte do "Trimestre" e dos blocos
"Gestação" e "Intolerâncias e alergias" (a gestação vira dado da ficha, com as semanas, e o bloco só aparece para
gestante; alergias e intolerâncias viram escolhas em Alimentação) e o D-298 na conta da água (AI da DRI por fase de
vida, no lugar de 35 ml por kg). Os dois itens da seção 4 sobre ligar o trimestre e as alergias ao plano passam a
fazer parte (D-343 e D-351 a D-353 de lá). A "Cor da urina" continua como está.

**Fonte:** as respostas da nutricionista parceira à página de revisão de 19/10/2026 (spec `sugestoes-com-criterio`,
Apêndices A e C). Os princípios dela valem para toda decisão desta spec:

1. **Nunca** sugerir bebida alcoólica, ultraprocessado ou gordura trans.
2. Preparações regionais e o resto "vão da conduta do nutricionista": **preservar a cultura alimentar do paciente**.
3. Preferir **preparações simples** e alimentos **in natura**.
4. **Troca tem de ser equivalente**.

**Specs lidas antes:** `sugestoes-com-criterio` (D-190 a D-199, Apêndices A e C), `impressao-do-plano` (D-181,
D-183, D-185, D-189), `dieta-no-link` (D-151, CA-545), `anamnese-e-prescricoes` (D-160 a D-168, CA-589),
`pdf-e-telas-limpas` (trocas na folha), `ajustes-de-uso` (D-36, listas por refeição).

**Hoje:** a regra prescritível (`src/domain/prescritivel.ts`) tira 298 dos 597 alimentos das propostas; entre eles,
itens que a parceira prescreve (azeite, mel, charque, feijoada…). As trocas da folha oferecem "Peito de frango →
Quibe assado", "Pão francês → 7 torradas" e "Castanha-do-pará → Castanha-de-caju salgada". A folha decide sozinha
quando mostra gramas (D-183, D-189). A meta de água saiu da folha em 15/10 (D-185). A anamnese não tem cor da urina,
alergias nem gestação.

## 1. Decisões

| # | Decisão | Substitui |
|---|---|---|
| D-290 | **Voltam a ser propostos** pelo app (cobrir e trocas), com a chave "Incluir ingredientes e alimentos crus" ligada ou não: azeite de oliva extra virgem; mel; chocolate meio amargo; leite fermentado; cereal matinal de milho sem açúcar; charque e carne seca cozidos; azeitonas preta e verde; tremoço em conserva; ovo frito; feijoada; baião de dois; barreado; dobradinha; maniçoba; sarapatel; farinha de mandioca crua (farinha d'água); leite em pó integral e desnatado. A regra continua por nome (D-198): uma lista curta de nomes liberados pela conduta, que vence os motivos "fora da rotina" e "forma de ingrediente", nunca o "nunca". Ficam fora os parentes que a parceira não liberou (azeite de dendê, cereal matinal com açúcar, charque e carne seca crus, feijão tropeiro, virado à paulista, arroz carreteiro) | Os itens marcados da seção 2.1 e do Apêndice C.2 da `sugestoes-com-criterio` |
| D-291 | **Saem das propostas** tapioca com manteiga, pão de queijo assado, pipoca com óleo e biscoito cream cracker: são preparações e quase nunca se prescrevem assim. Motivo novo, "Preparação que raramente se prescreve assim", no nível *fora da rotina* (a chave não os traz). Na lista padrão do desjejum (D-36), a tapioca com manteiga dá lugar ao mamão papaia (170 g), in natura; quem já salvou a própria lista fica com ela | Os itens da seção 2.1 da `sugestoes-com-criterio` e a lista padrão do desjejum |
| D-292 | **Gordura trans é "nunca"**, em todo modo: nome com "hidrogenad…" (as margarinas com óleo hidrogenado) ou com "gordura vegetal" (é o nome de rótulo da gordura hidrogenada; pega o chantilly em spray). Item "nunca" posto à mão no plano não ganha troca. O plano de exemplo troca a margarina com óleo hidrogenado pela com óleo interesterificado: o nome para o paciente continua "Margarina com sal". Ultraprocessado e álcool continuam como estavam (fora da rotina e nunca) | D-191 (o nível "nunca") e D-196 (a margarina do exemplo) |
| D-293 | **No cobrir, o que voltou vem depois.** "Segunda escolha" = corte gordo e ave com pele (D-199b) **e** os itens do D-290 que antes eram fora da rotina ou pó (todos, menos a farinha d'água): entre os de uso comum, vêm depois dos magros, in natura e preparos simples, e também depois nas trocas. A porção máxima por grupo continua e ganha grupos: gordura de adição 10 g (1 colher de sopa); mel e chocolate 25 g; azeitona e tremoço em conserva 30 g; cereal matinal e leite em pó 30 g (2 colheres de sopa); leite fermentado 80 g (1 frasco); farinha de mandioca, crua ou torrada, 30 g (2 colheres de sopa). Charque, carne seca e ovo frito entram no grupo de 100 g dos cortes gordos. A TACO não traz micronutriente nenhum do azeite (nem vitamina A, nem E): ele nunca aparece no cobrir, só nas trocas de gordura | D-199b e a seção 7.1 da `sugestoes-com-criterio` |
| D-294 | **Troca simples primeiro.** Alimento simples nunca troca por prato composto (vários ingredientes num preparo: quibe, almôndega, pamonha, omelete, farofa, nhoque, peixe ao escabeche e os pratos da categoria "Alimentos preparados", menos cuscuz de milho, frango com açafrão e quibebe, que são preparos simples; a salada de legumes no vapor mistura vários legumes e conta como composta). Prato composto posto à mão troca primeiro por preparo simples | — |
| D-295 | **Troca realista.** A troca cuja medida caseira para a paciente pede mais de 4 unidades ou pedaços (unidade, fatia, pedaço, rodela, gomo, banda, metade, bife, filé, posta, coxa, sobrecoxa, peito) sai, e a próxima da fila entra no lugar. É o mesmo número da regra antiga da folha (D-183), agora aplicado à escolha da troca. A medida caseira para a paciente é a do planejador, mas, quando ela pede mais de 4 unidades ou pedaços e outra medida do alimento serve (dentro de 15%), vale a outra: "1 unidade" de ovo frito, não "5 fatias e meia"; sem outra, fica a do planejador | — |
| D-296 | **In natura antes de processado.** Processado = salgado, em conserva, enlatado, industrializado, em pó, bebida de soja (extrato solúvel), cereal matinal, leite fermentado e carne curada (charque, carne seca, bacalhau salgado). Para um alimento do plano que não é processado, as trocas processadas saem quando existe ao menos uma troca não processada; se só existem processadas, elas ficam. Alimento processado posto à mão troca primeiro pelo não processado | — |
| D-297 | **Quantidades para o paciente: a nutricionista escolhe, por plano.** "Medida caseira" ou "Gramas", no cartão Identificação da etapa 1 ("Dados e medidas"), a primeira tela de todo plano novo; vem marcada "Medida caseira" e muda a qualquer hora. A escolha é dado do plano (vai junto para a nuvem); plano gravado antes, sem o campo, ou com valor estranho, lê "Medida caseira". **Gramas:** só o peso. **Medida caseira:** só a medida caseira para a paciente (D-295: a do planejador, ou outra de até 4 pedaços quando ela serve); o peso só quando o alimento não tem medida que sirva; manteiga e margarina em "ponta de faca" quando ela serve (CA-642). Vale para a folha impressa (refeições, lista de compras e trocas), para "Meu plano" no link e para o Word de aconselhamento. A cópia do link carrega a escolha no próprio item: em "Gramas", a medida vai vazia, e qualquer versão do app mostra o peso | D-183 e D-189 (o peso ao lado da medida vaga e "mais de 4 pedaços vira peso") da `impressao-do-plano`; a parte da `dieta-no-link` que mostrava medida e peso juntos |
| D-298 | **A meta de água volta à folha**, como linha automática no começo de "Orientações": "Beba cerca de 2,2 litros de água por dia." (35 ml por kg de peso, a mesma conta das missões). Na etapa 1, no cartão Orientações, o campo "Água na dieta" mostra a linha, que a nutricionista edita ou apaga (vazio = sai da folha); "Usar a automática" volta à conta. A linha é dado do plano: sem edição, ela acompanha o peso. Sem peso, não há linha automática. Não é lista de marcar, e não vai para o link (as missões já têm a água) nem para o Word. O exemplo deixa de dizer "Beba água ao longo do dia" nas orientações, para não repetir | D-185 da `impressao-do-plano`, só na parte da água |
| D-299 | **Anamnese:** no bloco "Água", a pergunta nova "Cor da urina", com a escala de 8 cores de Armstrong, de escolha única: cada opção mostra a cor, o número e o nome (o nome e o número fazem o rótulo; a cor sozinha não diz nada). Dois blocos novos, antes do recordatório: "Intolerâncias e alergias" (intolerâncias; alergias) e "Gestação" ("Trimestre": não gestante, 1º, 2º ou 3º trimestre; e "Anotações da gestação", texto). O tipo da pergunta vem do id dela, então renomear não muda o tipo. A resposta fica na ficha como texto legível ("3 · Amarelo-claro", "2º trimestre"). Roteiro salvo antes ganha os blocos novos (bloco que falta usa o padrão) e a "Cor da urina" uma vez só, depois de "Quanta água bebe por dia" (o roteiro guardado passa a ter versão; tirada depois, ela não volta). A anamnese continua sem sair em documento (D-168) | D-160 (os blocos fixos passam de 8 para 10) |

### 1.1 As cores da urina (escala de Armstrong)

| Nº | Nome | Leitura |
|---|---|---|
| 1 | Quase incolor | boa hidratação |
| 2 | Amarelo muito claro | boa hidratação |
| 3 | Amarelo-claro | boa hidratação |
| 4 | Amarelo | beber mais água |
| 5 | Amarelo-escuro | beber mais água |
| 6 | Âmbar | beber mais água |
| 7 | Âmbar-escuro | desidratação |
| 8 | Marrom | desidratação |

A dica embaixo do rótulo, como a de Bristol: "Escala de Armstrong: de 1 (quase incolor) a 8 (marrom); de 1 a 3,
boa hidratação." As cores são tokens do design system (`--urina-1` a `--urina-8`), as mesmas nos dois temas.

## 2. Critérios de aceite

### US-CN1 · O que o app sugere (A)

- **CA-910** · Dado cada item do D-290, então a regra o deixa propor (com a chave ligada ou desligada); dado azeite de dendê, cereal matinal com açúcar, charque cru, carne seca crua, feijão tropeiro, virado à paulista e arroz carreteiro, então continuam fora, com o motivo de antes.
- **CA-911** · Dado tapioca com manteiga, pão de queijo assado, pipoca com óleo e biscoito cream cracker, então ficam fora da rotina com o motivo "Preparação que raramente se prescreve assim", e a chave não os traz; pão de queijo cru continua forma de ingrediente.
- **CA-912** · Dado as margarinas com óleo hidrogenado e o chantilly em spray, então o nível é "nunca", em todo modo; posto à mão no plano, o item não ganha troca. As margarinas com óleo interesterificado continuam fora da rotina (gordura de adição).
- **CA-913** · Dado a regra, então a lista fixa de ids por motivo (CA-664) é a do Apêndice A regenerado, e a trava de texto escrita à mão (CA-667) pega todos esses ids; nenhuma sugestão do cobrir dos 16 micronutrientes, no exemplo e no plano vazio, com a chave ligada e desligada e porção máxima de 50, 100 e 200 g, e nenhuma troca da base casam com a trava.
- **CA-914** · Dado o cobrir, entre os alimentos de uso comum, então os de segunda escolha (D-293) vêm depois dos outros; no plano vazio da Maria, o cobrir do ferro não começa por charque, azeitona nem sarapatel.
- **CA-915** · Dado o cobrir, então a porção sugerida de um item dos grupos novos do D-293 não passa da porção do grupo nem da porção máxima escolhida.
- **CA-916** · Dado as listas padrão por refeição, então todo item passa na regra, e o desjejum tem mamão papaia (170 g) no lugar da tapioca com manteiga.
- **CA-917** · Dado o plano de exemplo, então nenhum item dele é "nunca"; a margarina é a com óleo interesterificado e sai na folha como "Margarina com sal".
- **CA-918** · Dado a spec `sugestoes-com-criterio`, então os Apêndices A e C trazem uma nota datada de 20/10/2026 apontando para esta spec, e o Apêndice A lista os ids de agora.

### US-CN2 · Trocas que a paciente faz de verdade (B)

- **CA-919** · Dado um alimento simples no plano, então nenhuma troca é prato composto: peito de frango não troca por quibe, arroz não troca por pamonha, ovo cozido não troca por omelete (troca por ovo frito, "1 unidade"), cuscuz não troca por yakisoba nem por salada de legumes.
- **CA-920** · Dado um prato composto posto à mão, então as trocas de preparo simples vêm antes das compostas.
- **CA-921** · Dado qualquer alimento da base, então nenhuma troca tem medida caseira de mais de 4 unidades ou pedaços; pão francês (70 g) não troca por "7 unidades" de torrada, e a lista dele continua com trocas (a próxima entra no lugar).
- **CA-922** · Dado um alimento não processado no plano com ao menos uma troca não processada, então nenhuma troca é processada: castanha-do-pará não troca por castanha-de-caju salgada nem amêndoa salgada; brócolis não troca por palmito em conserva; filé de merluza não troca por bacalhau salgado.
- **CA-923** · Dado um alimento processado posto à mão, então as trocas não processadas vêm antes das processadas.

### US-CN3 · Quantidades que a nutricionista escolhe (C)

- **CA-924** · Dado a etapa 1 de um plano, então o cartão Identificação tem "Quantidades para o paciente" com "Medida caseira" e "Gramas"; plano novo vem com "Medida caseira"; a escolha fica salva no plano; plano gravado antes, sem o campo, abre com "Medida caseira".
- **CA-925** · Dado "Gramas", então a folha impressa mostra só o peso em cada alimento das refeições, da lista de compras e das trocas ("Pão francês" e "70 g").
- **CA-926** · Dado "Medida caseira", então a folha mostra só a medida caseira para a paciente, sem o peso ao lado ("Maçã Fuji com casca" e "3 fatias e meia"; "Banana prata" e "1 unidade e meia", não "5 fatias"); sem medida que sirva, o peso ("Queijo minas frescal" e "30 g"). Vale na refeição, na lista de compras e nas trocas.
- **CA-927** · Dado "Medida caseira" e manteiga ou margarina que cabe em até 3 pontas de faca, dentro de 15% do peso, então a quantidade é "ponta de faca" ("1 ponta de faca"), na folha, no link e no Word.
- **CA-928** · Dado a dieta do link ("Meu plano"), então em "Gramas" cada alimento mostra só o peso, e em "Medida caseira" só a medida (o peso quando não há medida).
- **CA-929** · Dado o Word de aconselhamento, então cada alimento sai com a quantidade pela mesma escolha ("Arroz, tipo 1, cozido (150 g)" em Gramas; "(6 colheres de sopa)" em Medida caseira).
- **CA-930** · Dado um link já enviado, quando a nutricionista troca a escolha, então o cartão do link avisa que o plano mudou desde a cópia (CA-545), porque o que a paciente vê mudou.

### US-CN4 · A água na folha (D)

- **CA-931** · Dado um plano com peso (62 kg) e sem edição da água, então "Orientações" da folha começa por "Beba cerca de 2,2 litros de água por dia.", seguida do texto da nutricionista; sem texto dela, a seção traz só a linha da água.
- **CA-932** · Dado a etapa 1, então o cartão Orientações tem o campo "Água na dieta" com a linha automática; o que a nutricionista escreve vira a linha da folha; campo vazio tira a linha da folha; "Usar a automática" volta à conta pelo peso. A escolha fica salva no plano.
- **CA-933** · Dado a folha, então a linha da água não tem caixa de marcar nem lista; ela não aparece em "Meu plano" nem no Word; sem peso e sem edição, não há linha.

### US-CN5 · Anamnese (E)

- **CA-934** · Dado o bloco "Água" aberto, então "Cor da urina" mostra 8 opções em ordem, cada uma com a cor, o número e o nome, e o nome acessível de cada uma é "1 · Quase incolor" a "8 · Marrom"; a dica de Armstrong fica embaixo do rótulo. Escolher grava na ficha "3 · Amarelo-claro" e conta como respondida; tocar de novo na opção marcada apaga a resposta.
- **CA-935** · Dado a ficha, então a anamnese mostra 10 blocos, nesta ordem: Objetivo e queixa; Rotina e sono; Intestino; Água; Álcool e fumo; Atividade física; Preferências e aversões; Intolerâncias e alergias; Gestação; Recordatório de 24 horas. "Intolerâncias e alergias" tem "Intolerâncias alimentares" e "Alergias alimentares" (texto); "Gestação" tem "Trimestre" (escolha única: Não gestante, 1º trimestre, 2º trimestre, 3º trimestre) e "Anotações da gestação" (texto).
- **CA-936** · Dado um roteiro salvo antes desta versão, com perguntas editadas, então ele abre com as edições, os dois blocos novos com as perguntas padrão e a "Cor da urina" na Água, depois de "Quanta água bebe por dia" (ou no fim, se ela foi tirada); depois de salvo, tirar a "Cor da urina" vale e ela não volta.
- **CA-937** · Dado uma resposta de escolha (cor da urina ou trimestre), então ela fica nas respostas da ficha, com o texto da pergunta, como as outras (sai do roteiro sem se perder, CA-568; sobe para a nuvem com a ficha).
- **CA-938** · Dado a ficha numa tela de 360 a 390 px, então as 8 cores quebram em duas linhas de 4, cada opção tem ao menos 44 px de toque, e nada rola para o lado.
- **CA-939** · Dado "Editar roteiro", então a janela tem os 10 blocos, as perguntas de escolha se renomeiam como as outras, e "Voltar ao roteiro padrão" traz os 10 blocos com as perguntas da seção 1.

## 3. Casos de borda

| ID | Situação | Comportamento |
|---|---|---|
| CB-290 | Plano gravado antes desta versão | Abre com "Medida caseira" e com a água automática; nada é gravado só por abrir |
| CB-291 | Escolha de quantidade estragada no plano (valor que esta versão não conhece) | Vale "Medida caseira" |
| CB-292 | Link enviado antes desta versão | A cópia guardada não muda; "Meu plano" passa a mostrar só a medida (o peso quando não há). Plano com manteiga ou margarina passa a dizer "ponta de faca" e o cartão do link avisa uma vez que o plano mudou |
| CB-293 | Conta que salvou a própria lista do desjejum com a tapioca | A lista dela fica (escolha da pessoa); só a padrão muda |
| CB-294 | Plano antigo com margarina com óleo hidrogenado | O plano não muda e a folha a imprime; ela só não é sugerida e não ganha troca |
| CB-295 | Alimento sem troca simples, realista e não processada | Fica com menos trocas; sem nenhuma, sai da lista de trocas da folha (CB-196) |
| CB-296 | Versão antiga do app em outro aparelho salva o roteiro | Os blocos novos ficam guardados como blocos desconhecidos (CA-589); o roteiro volta sem versão, e a "Cor da urina" tirada pode voltar uma vez |
| CB-297 | Resposta da cor da urina que não é de 1 a 8 (escrita como texto numa versão antiga) | A pergunta mostra um campo de texto com a resposta, para nada sumir |
| CB-298 | Plano sem peso | Sem linha automática; o campo "Água na dieta" fica vazio, com a dica de informar o peso, e aceita uma linha escrita à mão |
| CB-299 | Plano duplicado | Leva a escolha de quantidade e a linha da água |

## 4. Fora de escopo

- Vitamina A, E ou K do azeite: a TACO não traz; nenhuma fonte nova de composição entra aqui.
- Trocas entre categorias da TACO (cuscuz por pão, arroz por batata): a troca continua dentro da categoria.
- A escolha de quantidade na janela de imprimir: ela mora no plano, na etapa 1.
- Ligar o "Trimestre" da anamnese à condição de gestante do plano, ou as alergias às restrições do cobrir (a
  nutricionista escreve a restrição em "Restrições e saúde", como hoje).
- Imprimir a anamnese (D-168).
- A meta de água no Word e no link; mudar a conta de 35 ml/kg.
- A vitrine da página inicial e as listas por refeição que a pessoa já salvou.

## 5. Riscos

1. **Cereal matinal de milho volta** por decisão explícita da parceira, embora seja ultraprocessado (princípio 1). Fica
   como segunda escolha e com 30 g no cobrir; mudar é tirar uma linha da lista do D-290.
2. **"Gordura vegetal" conta como trans** (D-292): pega o chantilly em spray da TACO, cujo nome não diz
   "hidrogenada". É a leitura a favor da paciente; a parceira confere.
3. **Regra por nome** (D-198): alimento novo na base escapa até alguém escrever a regra.
4. **Menos trocas**: com composto, irreal e processado fora, alguns alimentos ficam com uma troca só ou nenhuma
   (CB-295). É o que a parceira pediu: troca equivalente ou nenhuma.
5. **"Mais de 4 pedaços"** foi decidido sem a parceira (é o número da regra antiga da folha).
6. **Os nomes das cores da urina** e as perguntas novas foram escritos sem a parceira; ela confere pela tela.

## 6. Troca no papel da refeição e fruta por fruta (integração, 22/10/2026)

Status: **pedida pelo coordenador em 22/10/2026**, com o que as correções A e B viram nos 4 pacientes e deixaram de fora
(`revisao-usuario.md`, I9; relatório da correção A, "Divergências"); ordem de pé do dono: "apenas faça". Aprovação pelas
telas antes de publicar. Muda o item "Trocas entre categorias da TACO (cuscuz por pão, arroz por batata)" da seção 4:
a troca passa a seguir o papel do alimento na refeição, mesmo fora da categoria. A medida da fruta (unidade, D-423) e o
copo com um nome só (D-424) ficam na spec `alimentos-e-gramaturas`, seção 6.

### 6.1 Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-421 | **A troca fica no papel do alimento na refeição.** Três papéis: **acompanhamento** do almoço e do jantar (arroz cozido, cuscuz de milho, polenta, batata inglesa, doce e baroa cozidas, mandioca cozida, cará cozido; o arroz e o macarrão pelo peso cru também têm esse papel); **pão** (pães da categoria de cereais e a torrada de pão francês); **cereal do café** (aveia em flocos, cereal matinal, farinha láctea, mistura para vitamina). Alimento com papel troca só por alimento do mesmo papel, mesmo de outra categoria da TACO (arroz por batata); no acompanhamento, pronto troca por pronto e cru por cru. O macarrão a base só tem cru, e o cru é forma de ingrediente, que nunca é troca (CA-658 da `sugestoes-com-criterio`, a mesma regra do I9: "não oferecer ingrediente cru como troca de preparação"); o macarrão entra quando a base tiver o macarrão cozido. No papel e na fruta, o mais consumido no Brasil vem antes (lista da POF 2017-2018 de `consumoPof.ts`). Alimento sem papel troca dentro da categoria, como antes, e nunca por alimento com papel (o flocão de milho não troca por arroz nem por pão). As outras regras continuam (D-294 a D-296, D-434) | I9: arroz do almoço trocava por "Pão de forma de glúten · 3 fatias" e por flocão cru; aveia trocava por "Torrada de pão francês · 4 unidades". A categoria da TACO junta o que tem outro lugar no prato |
| D-422 | **Fruta troca por outra fruta, em unidade.** Fruta não troca pela mesma fruta de outra variedade (banana prata não troca por banana figo nem nanica); a troca de fruta precisa de medida de peça que o paciente lê (unidade, ou fatia e pedaço da fruta grande, D-423): fruta que só se leria em gramas sai e a próxima entra | "Banana figo · 2 fatias e meia (65 g)" no lugar da banana prata: é a mesma fruta, e meia fatia de outra banana não é como o paciente come |

### 6.2 Critérios de aceite

- **CA-1203** · Dado 150 g de arroz cozido, então as trocas são só de acompanhamento (arroz integral, cuscuz, polenta, batata, mandioca, cará): nenhum pão, torrada, flocos, pamonha, canjica nem curau; e entre elas há pelo menos uma que não é arroz.
- **CA-1204** · Dado 50 g de pão francês, então as trocas são só pães e torrada; dado 30 g de aveia em flocos, nenhuma troca é pão, torrada ou pipoca.
- **CA-1205** · Dado 150 g de batata inglesa cozida, então as trocas são acompanhamentos (arroz, mandioca, cuscuz…), nunca cenoura, chuchu ou outra verdura.
- **CA-1206** · Dado 75 g de banana prata, então nenhuma troca é banana; toda troca de fruta tem medida de peça (unidade ou unidade pequena; fatia ou pedaço só da fruta grande, até 2) e nenhuma diz "e meia" de fatia; dado 130 g de maçã, nenhuma troca é maçã.
- **CA-1207** · Dado o plano de exemplo impresso com trocas, então o arroz do almoço não troca por pão e a banana não troca por banana.

### 6.3 Casos de borda

- **CB-393** · Alimento sem papel na categoria de cereais (flocão de milho, fubá, canjica): troca dentro da categoria, sem pão, arroz, aveia nem outro alimento com papel; sem troca possível, sai da lista (CB-295).
- **CB-394** · Arroz cru (peso cru) no plano: as trocas cruas são forma de ingrediente (CA-658) e as prontas são de outro estado; ele fica sem troca e sai da lista (CB-295), nunca troca por arroz cozido nem por batata cozida.
- **CB-395** · Fruta sem nenhuma troca em peça (todas só em gramas): sai da lista de trocas, como o CB-295.
