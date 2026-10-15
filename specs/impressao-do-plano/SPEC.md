# SPEC — Plano alimentar impresso limpo e fácil de ler

Status: **pedida pelo dono em 15/10/2026; aprovação pelas telas antes de publicar**. Escrita em 15/10/2026, a partir
do PDF que o dono imprimiu do plano de exemplo ("Exemplo — Maria, 28 anos") pelo Chrome, e do pedido dele: "esses
PDFs aí, tá saindo bem ruim de ver. Dá uma melhorada geral. Não gostei da forma que ele saiu. Achei muita informação
também."

**Hoje:** a folha da dieta (`src/ui/exportar/FolhaDieta.tsx`, spec `pdf-e-telas-limpas`, US-B1) sai pela impressão do
navegador ("Imprimir ou salvar em PDF"). O PDF do dono tem cinco defeitos, todos reproduzidos no Chromium 153:

1. O horário das refeições quase some: ele usa a cor de ação do tema, que no tema escuro é marfim.
2. "Opção 2" e "Opção 3" saem em caixas quase pretas com letra escura: o fundo é a superfície funda do tema escuro,
   e a impressão força as cores de fundo da folha.
3. O nome do alimento é o da tabela: "Margarina, com óleo hidrogenado, com sal (65% de lipídeos)", "Ovo, de galinha,
   inteiro, cozido/10minutos", "Pão, trigo, francês".
4. Informação demais: medida caseira **e** gramas em toda linha, a régua laranja, "No dia a dia" com caixinhas, e a
   linha "A prescrição é responsabilidade do nutricionista. Composição dos alimentos: Base MetaNutri.".
5. O cabeçalho e o rodapé do próprio Chrome: data e hora, título da página e o endereço do sistema com o código do
   caso (`…/#/caso/67c8…/plano`).

O app seguia o tema do Windows (escuro), e a folha herdava as cores do tema. As folhas de suplementação e de pedido de
exames (spec `anamnese-e-prescricoes`) usam a mesma moldura e têm os defeitos 2 (a frase de estágio numa caixa) e 5.

**Objetivo:** o paciente recebe uma folha que se lê de longe, em qualquer tema do app, só com o que ele vai comer e o
que a nutricionista escreveu, sem nada do sistema por cima.

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-180 | **O papel é sempre claro.** A folha (a prévia na janela e o papel) usa as cores do tema claro mesmo com o app no tema escuro; na impressão, o texto sai preto. Nada na folha tem fundo de cor | Os defeitos 1 e 2 vêm do tema escuro. Uma folha é papel: a prévia mostra o que vai sair |
| D-181 | **Nome do alimento para o paciente**, só nas folhas do paciente: sai do nome da base por regras fixas (seção 2) mais uma lista curta revisada à mão para os alimentos comuns. O planejador, a busca, a tabela de alimentos e o Word continuam com o nome da base. **Substitui o D-50** da spec `pdf-e-telas-limpas` | O paciente compra "pão francês", não "Pão, trigo, francês". A nutricionista precisa do nome da tabela para escolher; o paciente, não |
| D-182 | **Nome escrito pela nutricionista é dela.** O app não tem renomear item do plano; o que ela escreve é o nome do produto cadastrado ("Meus produtos"), e esse sai como ela escreveu | Respeitar o que ela digitou. Renomear item do plano seria função nova (fora de escopo) |
| D-183 | **Uma quantidade por linha:** a medida caseira; o peso em gramas só quando o alimento não tem medida caseira. A lista de compras continua em gramas | É a medida que o paciente usa em casa. A regra da medida (`medidaEquivalente`) já fica a no máximo 15% do peso prescrito, em passos de meia medida; o peso exato continua no planejador e no Word de aconselhamento. A lista de compras é quanto comprar |
| D-184 | **As opções da refeição são alternativas, sem caixa:** a principal vem primeiro, sem rótulo; cada substituto vem abaixo, depois de um "ou" sobre um fio fino. Sai o rótulo "Opção 2"/"Opção 3" | É como a dieta do link já mostra (spec `dieta-no-link`: "o paciente lê 'ou' entre elas"). O "ou" diz o que fazer; "Opção 2" pedia caixa para separar |
| D-185 | **Sai da folha:** a régua laranja e teal do topo; "No dia a dia" (as frutas e os vegetais repetem as refeições, e a água de 35 ml/kg é recomendação automática, que a nutricionista não escreveu; os três continuam nas missões do link); e a linha "A prescrição é responsabilidade… Base MetaNutri." (a folha não mostra composição de alimento, e a responsabilidade é a assinatura). **Fica:** logo, "Plano alimentar", paciente e data, quem assina, as refeições, "Orientações", "Suplementos" (opção da janela), "Receitas" e a assinatura; e, só em prescrição rápida, "Plano montado em prescrição rápida, sem avaliação antropométrica." | Pedido do dono: "muita informação". A frase da prescrição rápida fica porque a spec `prescricao-rapida-e-base` (princípio 4) pede que o documento diga que não houve avaliação. A assinatura fica porque é o que dá validade à prescrição (e, no estágio, à proposta) |
| D-186 | **Sem cabeçalho e rodapé do navegador.** Na impressão, a primeira página não tem margem em cima nem embaixo, e os 14 mm vêm da própria folha: o topo, pelo espaço da folha; o pé de cada página, por um espaço que se repete em toda página (`box-decoration-break: clone`). Da segunda página em diante, os 14 mm de cima continuam sendo margem da página, com a linha fina do CA-316. O Chrome e o Edge decidem pela primeira página se cabem a data, o título e o endereço: sem espaço nela, não saem em página nenhuma, e a caixa de impressão nem oferece "Cabeçalhos e rodapés" | Defeito 5: o endereço com o código do caso não pode ir para o paciente. Testado no Chromium 153 com o cabeçalho ligado à força: não sai. Navegador sem `box-decoration-break: clone` (Safari) fica com as margens de hoje, para nada encostar na borda |
| D-187 | **As folhas curtas** (Suplementação e Solicitação de exames) ganham as correções de papel (D-180 e D-186), perdem a régua laranja, e a frase de estágio sai em negrito, sem caixa. O conteúdo delas não muda | O mesmo defeito, a mesma moldura. O pedido do dono é sobre como elas saem, não sobre o que dizem |
| D-188 | **Um caminho só para imprimir e para PDF.** "Imprimir ou salvar em PDF" abre a impressão do navegador; "Salvar como PDF" e a impressora usam as mesmas regras. O app não tem outro gerador de PDF | Mesma saída nos dois, por construção |

## 2. As regras do nome para o paciente (D-181)

Em ordem; a primeira que decide vale.

1. **Produto cadastrado** ("Meus produtos"): o nome que a nutricionista escreveu, sem mudar nada (só os espaços das
   pontas). Alimento que não existe mais na base: "Alimento removido", como hoje.
2. **Lista revisada à mão**: os alimentos comuns cuja regra geral não fica natural ("Pão, trigo, francês" → "Pão
   francês"; "Ovo, de galinha, inteiro, cozido/10minutos" → "Ovo cozido"; "Arroz, tipo 1, cozido" → "Arroz branco
   cozido"; "Leite, de vaca, integral" → "Leite integral"; "Castanha-do-Brasil, crua" → "Castanha-do-pará"). São 121
   dos 597 alimentos.
3. **Regra geral**, sobre as partes do nome separadas por vírgula:
   - sai o que é ficha técnica: teor de gordura entre parênteses ("(65% de lipídeos)"), tempo de cozimento
     ("/10minutos"), concentração ("infusão 5%"), número de amostra ("pilsen 2"), "industrializado", "envasado",
     "drenado", "pré-cozido", "sabores variados", o tipo de óleo da margarina, e "congelado" quando o alimento já está
     preparado (assado, cozido, grelhado, frito);
   - a parte do animal ou do alimento vem antes: "Peito de frango", "Filé de merluza", "Lombo de porco", "Polpa de
     acerola", "Suco de laranja pera", "Extrato de tomate"; da carne bovina sai o corte ("Patinho", "Acém moído"), e o
     que não é corte vira "de boi" ("Fígado de boi", "Costela de boi");
   - **cru** sai onde não muda nada: fruta, castanha e semente, e verdura que a base só tem crua ("Alface crespa",
     "Cebola"); **cru fica** onde o peso é do alimento cru e o preparo muda o peso — cereais e massas, leguminosas,
     carnes, peixes, ovos e verdura que a base tem crua e cozida ("Macarrão cru", "Feijão carioca cru", "Cenoura
     crua"); cozido, grelhado, assado, frito, refogado e torrado ficam sempre;
   - "sem pele", "com pele", "sem gordura", "com gordura", "com casca", "sem casca" e "com capa de gordura" vão para o
     fim: dizem como preparar ("Peito de frango grelhado sem pele");
   - "pó" vira "em pó", "conserva" vira "em conserva";
   - ortografia de hoje: "Lingüiça" → "Linguiça", "pêra" → "pera", "Geléia" → "Geleia", "mingnon" → "mignon",
     "cabotian" → "cabotiá";
   - as vírgulas viram espaço, e a primeira letra fica maiúscula.

O resultado nunca tem vírgula, parêntese, barra ou "%", e tem no máximo 48 letras.

## 3. Histórias e critérios de aceite

Pessoas: **nutricionista** e **estudante** (quem imprime) e **paciente** (quem recebe a folha).

### US-IP1 · Papel claro em qualquer tema (2 pts)

Como nutricionista que usa o app no tema escuro, quero que a folha saia igual à do tema claro, para o paciente
conseguir ler.

- **CA-620** · Dado o app no tema escuro, quando abro "Dieta para imprimir", então a prévia mostra a folha em fundo branco com texto escuro, e o horário de cada refeição na mesma cor escura do nome da refeição.
- **CA-621** · Dado o app no tema escuro, quando imprimo ou salvo em PDF, então a folha sai igual à do tema claro: fundo branco, horário e nome da refeição em preto, nenhum elemento da folha com fundo escuro.
- **CA-622** · Dado "Gráficos de fundo" ligado na caixa de impressão, quando imprimo com o app no tema escuro, então nada escuro aparece em volta da folha nem no pé das páginas.

### US-IP2 · Nome que o paciente entende (3 pts)

Como paciente, quero ler o nome do alimento como eu falo, para saber o que comprar e o que preparar.

- **CA-623** · Dado o plano de exemplo, quando imprimo, então os alimentos saem assim: Pão francês, Margarina com sal, Queijo minas frescal, Mamão Formosa, Banana prata, Castanha-do-pará, Arroz branco cozido, Feijão carioca cozido, Peito de frango grelhado sem pele, Brócolis cozido, Cenoura crua, Macarrão cru, Patinho grelhado sem gordura, Batata inglesa cozida, Filé de merluza assado, Iogurte natural, Aveia em flocos, Arroz integral cozido, Lentilha cozida, Ovo cozido, Alface crespa e Maçã Fuji com casca.
- **CA-624** · Dado qualquer um dos 597 alimentos da base, então o nome para o paciente não é vazio, não tem vírgula, parêntese, barra nem "%", não tem "tipo 1" nem número de amostra, e tem no máximo 48 letras.
- **CA-625** · Dado um alimento cru que muda de peso ao preparar (cereal, massa, leguminosa, carne, peixe, ovo, ou verdura que a base também tem cozida), então o nome guarda "cru" ou "crua"; dado uma fruta, castanha ou semente, ou verdura que a base só tem crua, então "cru" não aparece. Cozido, grelhado, assado, frito, refogado e torrado nunca saem do nome.
- **CA-626** · Dado um produto cadastrado em "Meus produtos" no plano, então a folha mostra o nome como a nutricionista escreveu, vírgulas e maiúsculas incluídas.
- **CA-627** · Dado o planejador, a busca, a tabela de alimentos e o Word de aconselhamento, então eles continuam com o nome da base.
- **CA-628** · Dado "Lista de compras" e "Trocas" marcadas, então as duas usam o nome para o paciente; a lista de compras fica em ordem alfabética desse nome.

### US-IP3 · Uma quantidade por linha (1 pt)

Como paciente, quero uma quantidade só em cada alimento, para não ter de escolher entre dois números.

- **CA-629** · Dado um alimento com medida caseira, então a linha mostra o nome do alimento e a medida ("Pão francês · 1 unidade e meia"), sem o peso em gramas.
- **CA-630** · Dado um alimento sem medida caseira, então a linha mostra o peso ("Margarina com sal · 5 g").

### US-IP4 · Opções como alternativas (1 pt)

Como paciente, quero entender que posso trocar o almoço inteiro por outra opção, sem caixa escura no meio.

- **CA-631** · Dado uma refeição com substitutos, então eles vêm abaixo da principal, cada um depois de uma linha com "ou" e um fio fino, sem fundo, sem caixa e sem o rótulo "Opção 2" ou "Opção 3". Substituto vazio não aparece.
- **CA-632** · Dado uma refeição só com substituto, então a primeira opção que tem alimento vem sem "ou" na frente, e a folha não diz que a refeição está vazia.

### US-IP5 · Menos informação (1 pt)

Como paciente, quero só o que eu vou usar.

- **CA-633** · Dado a folha, então ela traz, nesta ordem: o topo (logo, "Plano alimentar", paciente e data por extenso, e quem assina à direita), as refeições, "Orientações" (se houver texto), "Suplementos" (se marcada na janela), "Receitas" (se houver texto) e a assinatura. Não traz "No dia a dia", a régua de cor do topo, nem a linha "A prescrição é responsabilidade do nutricionista. Composição dos alimentos: Base MetaNutri.".
- **CA-634** · Dado um plano em prescrição rápida, então a última linha da folha, pequena, depois da assinatura, é "Plano montado em prescrição rápida, sem avaliação antropométrica."; no atendimento completo, a folha termina na assinatura.
- **CA-635** · Dado a janela "Dieta para imprimir", então a frase abaixo do título diz "As refeições, as orientações e a assinatura sempre vão. Marque o que mais quer entregar."

### US-IP6 · Sem nada do sistema no papel (2 pts)

Como nutricionista, quero que o PDF não leve o endereço do sistema nem a data da impressão, para entregar só a folha.

- **CA-636** · Dado a impressão no Chrome ou no Edge, com as margens no padrão, então a primeira página não tem margem de página em cima nem embaixo, e a caixa de impressão não oferece "Cabeçalhos e rodapés": o PDF sai sem data, título e endereço.
- **CA-637** · Dado a folha impressa, então em toda página o texto fica a pelo menos 14 mm da borda de cima, de baixo e dos lados; da segunda página em diante, a linha fina do CA-316 continua no topo, na fonte da folha.
- **CA-638** · Dado uma folha longa (lista de compras e trocas marcadas), então ela continua correndo por várias páginas, nenhuma refeição se parte entre duas páginas (salvo se sozinha passar de uma) e a assinatura não fica sozinha no topo de uma página (CA-315).

### US-IP7 · As folhas curtas (1 pt)

Como nutricionista, quero que a suplementação e o pedido de exames saiam com o mesmo cuidado da dieta.

- **CA-639** · Dado o app no tema escuro, quando abro e imprimo "Suplementação" ou "Solicitação de exames", então a folha sai em fundo branco com texto preto, sem a régua de cor do topo, sem cabeçalho e rodapé do navegador (CA-636 e CA-637), com o mesmo conteúdo de hoje.
- **CA-640** · Dado uma conta de estudante, então a frase "Proposta do estágio para avaliação do(a) preceptor(a). Só vale com a assinatura do(a) preceptor(a)." sai em negrito, sem caixa de fundo.

## 4. Casos de borda

- **CB-180** · Alimento que saiu da base: a linha diz "Alimento removido", como hoje.
- **CB-181** · Dois alimentos diferentes com o mesmo nome para o paciente na lista de compras (por exemplo, arroz tipo 1 e tipo 2, os dois "Arroz branco cozido"): uma linha só, com os gramas somados.
- **CB-182** · Produto cadastrado com nome vazio: sai "Alimento sem nome", nunca uma linha em branco.
- **CB-183** · Quem imprime escolhe "Margens: mínimo" ou "Personalizado", ou liga "Cabeçalhos e rodapés" num navegador que ainda ofereça: o navegador pode pôr de volta a data e o endereço. O resto da folha sai igual. Não dá para impedir por código.
- **CB-184** · Safari e navegadores sem `box-decoration-break: clone`: as margens de página continuam as de hoje (14 mm em volta) e o cabeçalho do navegador segue a opção dele; nada encosta na borda.
- **CB-185** · Plano sem nenhum alimento: cada refeição diz "Sem alimentos nesta refeição.", como hoje (CB-71).
- **CB-186** · Ctrl+P fora da janela "Dieta para imprimir": sai página em branco, como hoje.
- **CB-187** · Nome de produto com código (script, imagem com onerror): sai como texto, nada executa.
- **CB-188** · Troca que, com o nome para o paciente, fica igual ao alimento do plano (arroz tipo 1 e tipo 2 viram os
  dois "Arroz branco cozido"; as margarinas de óleos diferentes viram "Margarina com sal"): não aparece, para a folha
  não mandar trocar uma coisa por ela mesma. Duas trocas com o mesmo nome aparecem uma vez; alimento do plano que fica
  sem troca sai da lista de trocas; dois alimentos do plano com o mesmo nome aparecem uma vez. *(visto nos prints de
  15/10)*

## 5. Fora de escopo, explicitamente

- A dieta do link do paciente ("Meu plano", spec `dieta-no-link`): continua com o nome da base e com os gramas. Mudar
  ali faria todo link já enviado aparecer como "o plano mudou" (CA-545) — ver R-182.
- O Word de aconselhamento e o memorial de cálculo.
- Renomear um item do plano (D-182).
- A escolha das trocas e da medida caseira (`trocas.ts`, `busca.ts`): a folha só troca o nome que mostra.
- O conteúdo das folhas de suplementação e de pedido de exames.
- Imprimir pelo Ctrl+P sem a janela aberta (CB-186).

## 6. O que fica com você

1. Olhar os prints de antes e depois (lista no relatório) e aprovar antes de publicar.
2. Pedir à nutricionista parceira uma passada na lista dos 597 nomes (no relatório): é a lista que o paciente lê.

## 7. Riscos para você revisar

- **R-180** · O sumiço do cabeçalho e rodapé do navegador (D-186) segue uma regra do Chrome e do Edge (ele decide pela
  primeira página), documentada pelo Google e testada no Chromium 153, mas não é uma garantia escrita: uma versão
  futura pode mudar. O teste automático confere a regra de página; a caixa de impressão do Chrome não abre em teste
  automático. Conferir uma vez: Ctrl+P na janela da dieta, "Mais definições": "Cabeçalhos e rodapés" não aparece.
- **R-181** · Os nomes para o paciente (seção 2) foram escritos sem a revisão de uma nutricionista. Um nome errado
  confunde a compra; a lista completa está no relatório.
- **R-182** · A folha e a dieta do link agora diferem no nome e nos gramas. Para igualar, o link teria de mudar junto,
  e todo link já enviado apareceria como "o plano mudou" uma vez.
- **R-183** · Sem os gramas na folha (D-183), quem pesa a comida (clínica, atleta) perde o número no papel; ele
  continua no planejador e no Word. Se uma nutricionista pedir, cabe uma opção "Peso em gramas" na janela de imprimir.
