# SPEC — Painel lateral enxuto: resumo do dia, macros e micronutrientes

Status: **pedida pelo dono em 15/10/2026; aprovação pelas telas antes de publicar.**

**Fonte:** a conversa de 15/10/2026: "E nas telas laterais ali de resumo do dia, macros, nutrientes,
micronutrientes, eu quero que você melhore, porque tá muito poluído ainda, tá muita informação. (...)
mantendo a proposta do software."

**Objetivo:** no planejador, o nutricionista vê de relance se o dia fecha energia e macros e quais
micronutrientes faltam, com o **Cobrir** à mão para eles. O detalhe continua a um clique; nada que
ajuda a decidir some de vez, e nenhuma métrica nova entra.

**Integração (15/10/2026):** esta spec entrou na mesma branch das frentes "sugestões com critério" e
"impressão do plano". A integração revê o arredondamento (D-211, no lugar do D-209), decide para onde vai
o foco depois de "Adicionar" no Cobrir (D-212) e confere o sódio sem Cobrir de ponta a ponta (CA-714).
Ver "Integração das três frentes" no §3.

**Specs que esta muda:** `pdf-e-telas-limpas` (CA-333 e CA-337 a CA-339), `estilo-spora` (CA-206) e
`planejador-metanutri` (CA-10 e CA-22, só a forma de mostrar). Nenhum cálculo muda.

## 1. Inventário do que aparece hoje

Prints de antes (main 8f3ffa2, plano de exemplo com 20 g de azeite de oliva no almoço e 20 g no
jantar, para a energia e a gordura passarem da faixa): `antes-plano-1280`, `antes-painel-1280`, `antes-painel-aberto-1280`,
`antes-adequacao-1280`, `antes-dados-1280` e os mesmos em 390, na pasta de prints da frente.

### 1.1 Resumo do dia (coluna da direita das etapas 1 e 2)

| # | O que aparece | No exemplo | Decisão |
|---|---|---|---|
| 1 | Título com ícone | "Resumo do dia" | **Fica** |
| 2 | Botão "Ajustar" (energia) | | **Fica**, e passa a levar também às metas dos macros (item 10) |
| 3 | Energia do plano | "2.029 kcal" | **Fica** |
| 4 | Rótulo e valor do alvo | "GET calculado 1.620 kcal" | **Fica** (diz se o alvo é calculado, manual ou meta do modo rápido) |
| 5 | Barra da energia | vermelha | **Fica** |
| 6 | Percentual do gasto | "125% do GET" | **Fica**, numa frase só com o item 7 |
| 7 | Selo do estado | "Acima de 110%" | **Sai como selo**: o limite entra na frase ("125% do GET, acima de 110%"). Era o mesmo fato dito três vezes (cor, número e selo) |
| 8 | Rótulo da seção | "MACRONUTRIENTES" | **Sai**: os três nomes já dizem |
| 9 | Fio entre energia e macros | | **Fica**: é o mesmo fio que separa cada linha |
| 10 | Botão "Metas" | | **Vai para dentro de "Ajustar"** ("Metas de macronutrientes") |
| 11 | Nome do macro (×3) | "Proteína" | **Fica** |
| 12 | Gramas com uma casa (×3) | "89,1 g" | **Fica sem casa**: "89 g" |
| 13 | % das kcal com uma casa (×3) | "17,6%" | **Fica sem casa**: "18%". A frase do medidor continua dando a distância exata |
| 14 | g/kg (×3) | "1,44 g/kg" | **Fica na proteína.** Carboidrato e gordura vão para "Ver cálculo" (o CA-22 pede g/kg só da proteína) |
| 15 | Medidor com a faixa e o marcador (×3) | | **Fica** |
| 16 | Frase do estado (×3) | "Passou de leve: 1,6 pontos acima" | **Fica** |
| 17 | Meta por extenso (×3) | "Meta: 10 a 35% (faixa da idade)" | **Encurta** para "10 a 35%". "Meta:" e "(faixa da idade)" se repetiam três vezes; a origem vai para "Ver cálculo". "sua meta" continua na linha quando a meta é sua |
| 18 | "Ver cálculo", recolhido | TMB, fator, adicionais, fonte | **Fica**, e recebe o g/kg de carboidrato e gordura e a origem das metas dos macros |

Saem da vista 9 pedaços de texto (o rótulo "Macronutrientes", o botão "Metas", o selo, três
"Meta:" e três "(faixa da idade)"), 2 valores em g/kg e a casa decimal de 6 números. Nada disso
some de vez: o que não fica na linha está em "Ajustar" ou em "Ver cálculo".

### 1.2 Micronutrientes (etapa 3, Adequação)

| # | O que aparece | No exemplo | Decisão |
|---|---|---|---|
| 19 | Título e subtítulo | "Micronutrientes" · "mulheres de 19 a 30 anos · meta de 90% da referência" | **Fica** |
| 20 | Seletor de referência | Individual, Coletivo, Personalizado | **Fica** |
| 21 | Tabela com as 16 linhas, sempre abertas | 5 abaixo da meta, 11 na meta | **As que pedem ação ficam à vista** (abaixo da meta e acima do limite); **as 11 na meta ficam recolhidas** em "Ver os 11 na meta", na mesma tabela |
| 22 | Colunas Nutriente, No plano, Referência (com RDA/EAR/AI), Adequação (barra e texto), ação | | **Ficam** na tela larga |
| 23 | Botão "Cobrir" com fio, só em linha abaixo da meta | | **Fica, com mais destaque** (fundo teal claro) |
| 24 | Marcas † e ‡ | † em todas as linhas do exemplo | **Ficam** (falta de dado nunca é zero) |
| 25 | Nota do † | duas frases | **Encurta** para uma frase e "Falta de dado nunca entra como zero." |
| 26 | Nota do ‡ | duas frases, uma sobre o cursor | **Encurta** para uma frase |
| 27 | Nota "Referência: RDA no preset individual, EAR no coletivo e AI..." | | **Encurta**: o seletor já diz RDA e EAR; fica só o que é novo ("AI: quando o nutriente não tem RDA nem EAR.") |
| 28 | Composição e "Fontes da base" | | **Fica** (R-29) |
| 29 | Referências de ingestão | citação completa | **Fica** |
| 30 | No celular (390 px) | a tabela rola para o lado e o **Cobrir fica fora da tela** | **Vira lista** no celular: nada rola para o lado e o Cobrir aparece em cada linha que falta |

### 1.3 Faixa do topo da etapa 3

Seis números (energia do plano, GET, % do gasto, proteína, carboidrato, gordura) e "Ajustar", uma
vez cada, numa linha. **Fica como está:** não repete nada na mesma tela.

### 1.4 Gaveta do Cobrir

Pedido do coordenador em 15/10: com o plano acima do gasto energético, a gaveta diz "Cabem -55 kcal
até o gasto energético". Número negativo de "cabem" não se lê. **Muda só o texto** (D-208); a lógica
e as sugestões não mudam.

### 1.5 O que a etapa 2 não mostra hoje

Montando o plano, o nutricionista não vê nenhum micronutriente: o que falta e o Cobrir só aparecem
na etapa 3. É o diferencial do produto escondido na etapa em que ele passa mais tempo.

## 2. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-200 | **Uma gramática por linha no Resumo do dia**: nome e valor; barra ou medidor; uma frase de estado na cor do estado. Cada fato aparece uma vez, também nas notas da tabela da etapa 3, que ficam com uma frase cada | Pedido do dono: "muita informação". O estado da energia era dito três vezes, e as notas repetiam o que o seletor e as marcas já dizem |
| D-201 | **Valores de relance sem casa decimal** (gramas e % das kcal). g/kg só na proteína (com duas casas, como a frase do medidor); carboidrato e gordura em g/kg vão para "Ver cálculo" | O CA-22 pede g/kg só da proteína. Substitui o CA-206 da `estilo-spora` para carboidrato e gordura |
| D-202 | **Meta do macro curta** ("10 a 35%"), ao lado da frase. "sua meta" aparece quando a meta é sua; a origem padrão ("faixa da idade") vai para "Ver cálculo" | "Meta:" e "(faixa da idade)" se repetiam nas três linhas |
| D-203 | **Um "Ajustar" para os alvos do dia**: energia, como hoje, e o botão "Metas de macronutrientes" | Dois botões soltos ("Ajustar" e "Metas") para a mesma ideia: mudar o alvo |
| D-204 | **Cartão "Micronutrientes" na coluna da direita da etapa 2**, abaixo do Resumo do dia: quantos estão abaixo da meta, até 5 (os mais longe da meta primeiro), cada um com "Cobrir" (fundo teal claro, nunca laranja), os acima do limite sem Cobrir, e "Ver todos" para a etapa 3. Não aparece na etapa 1 | O diferencial onde o plano é montado, ocupando o espaço vazio da coluna. **Para o dono decidir pelas telas** (é a única coisa que entra em vez de sair) |
| D-205 | **Etapa 3 mostra primeiro o que pede ação**: abaixo da meta e acima do limite ficam à vista, na ordem de sempre dentro de cada grupo; os na meta ficam recolhidos em "Ver os N na meta", fechado ao abrir a tela e a cada plano. O Cobrir tem fundo teal claro (`lightprimary`), nunca laranja | De 16 linhas para as 5 que pedem alguma coisa, sem tirar nenhuma. O laranja não entra em painel de dado (DESIGN.md) |
| D-206 | **O sódio nunca é alvo do Cobrir.** Abaixo da meta, ele não entra no cartão da etapa 2 nem na contagem, e não tem Cobrir em lugar nenhum (cartão, tabela e lista do celular); na etapa 3 continua com o valor, a referência e o estado. Acima do limite, aparece no cartão como os outros acima do limite | Decisão do coordenador em 15/10/2026, na revisão: o sal de cozinha não entra no plano, então o sódio dos alimentos fica quase sempre abaixo da AI, e subir sódio por alimento não é conduta; o que importa no sódio é o excesso. A frente "sugestões com critério" faz o domínio do Cobrir não sugerir nada para o sódio |
| D-207 | **Etapa 3 vira lista abaixo de 640 px**: em cada nutriente, nome e % com o estado, a barra, "quanto tem de quanto precisa" com a referência e o Cobrir | Em 390 px a tabela rolava para o lado e escondia o Cobrir |
| D-208 | **Na gaveta do Cobrir, o que passou do gasto se diz como passou**: "O plano já passou 55 kcal do gasto energético." no lugar de "Cabem -55 kcal". Só o texto muda | Pedido do coordenador em 15/10/2026. Número negativo depois de "cabem" não se lê |
| D-209 | *Revisto pelo D-211 na integração.* **Número na tela arredonda na direção do estado**: abaixo arredonda para baixo, acima para cima, dentro para o mais perto. Vale para o % do gasto, o % das kcal do macro com meta em %, a adequação no cartão, na tabela e na lista do celular, e a faixa do topo da etapa 3 | Revisão de 15/10/2026: com 89,6% a tela dizia "90% do GET, abaixo de 90%". O número não pode desmentir a cor e a frase |

| D-211 | **O sentido do estado só entra quando o arredondamento comum cruzaria o limite do estado.** Abaixo, se o número arredondado para o mais perto chegaria ao limite de baixo, arredonda para baixo; acima, se não passaria do limite de cima, arredonda para cima. Fora disso, e sempre dentro da faixa, arredonda para o mais perto. Vale em todo lugar do D-209: % do gasto (Resumo do dia e faixa do topo da etapa 3), % das kcal do macro com meta em %, adequação no cartão, na tabela e na lista do celular | Decisão do coordenador na integração (15/10/2026), sobre a dúvida 1 da frente: com o D-209, 125,2% saía "126%", um ponto a mais sem motivo. O número só precisa não desmentir o estado |
| D-212 | **O foco nunca se perde ao fechar a gaveta do Cobrir.** Se o botão que abriu a gaveta continua na tela, o foco volta a ele, como hoje. Se ele sumiu (o nutriente chegou à meta e saiu do cartão, ou a linha da etapa 3 perdeu o Cobrir), o foco vai para o Cobrir do próximo nutriente que estava abaixo dele na lista; sem próximo, para o título "Micronutrientes" do cartão ou da etapa 3 | Ponto em aberto 1 da frente: o foco caía no corpo da página, e quem usa teclado ou leitor de tela perdia o lugar |

Numeração revista em 15/10/2026, na rodada de revisão, para caber na faixa D-200 a D-209: as notas
curtas (era D-208) entraram no D-200; o Cobrir teal (era D-206) entrou no D-204 e no D-205; a ordem
das telas no celular (era D-209) foi para o §5; a gaveta passou de D-210 para D-208.

## 3. Critérios de aceite

### Resumo do dia (etapas 1 e 2)

- **CA-680** · Dado o Resumo do dia, então o cartão tem o título "Resumo do dia" e um só botão, "Ajustar". Não há o rótulo "Macronutrientes" nem o botão "Metas" à vista.
- **CA-681** · Dado a energia, então aparecem "Energia do plano" com as kcal, o rótulo do alvo com as kcal ("GET calculado", "GET definido manualmente", "Meta calculada", "Meta definida por você" ou "Meta de energia"), a barra na cor do estado e uma frase só, na cor do estado: "125% do GET, acima de 110%", "98% do GET, entre 90% e 110%" ou "70% do GET, abaixo de 90%". No modo rápido, a frase diz "da meta" no lugar de "do GET". Não há selo.
- **CA-682** · Dado um macro, então a linha mostra o nome, as gramas e o % das kcal sem casa decimal ("89 g · 18%") e, na proteína com peso, o g/kg com duas casas ("· 1,44 g/kg"); o medidor; e embaixo a frase do estado na cor do estado e a meta curta ("10 a 35%"). "Meta:" e "(faixa da idade)" não aparecem na linha.
- **CA-683** · Dado "Ajustar" aberto, então aparecem os controles da energia como hoje (no modo rápido, a meta de energia) e o botão "Metas de macronutrientes", que abre a janela das metas. Salvar uma meta própria muda a meta da linha para, por exemplo, "1,2 a 1,6 g/kg · sua meta".
- **CA-684** · Dado "Ver cálculo" aberto, então ele mostra o que mostra hoje (TMB, fator de atividade, adicionais e a fonte) e mais: carboidrato e gordura em g/kg, quando há peso, e a origem das metas dos macros ("faixa da idade", "suas metas" ou "faixa da idade e suas metas").

### Micronutrientes na etapa 2

- **CA-685** · Dado a etapa 2 com alimentos no plano, então a coluna da direita mostra, abaixo do Resumo do dia, o cartão "Micronutrientes" com a contagem do CA-703 e até 5 nutrientes abaixo da meta, do mais longe para o mais perto da meta, cada um com o nome, a adequação em % na cor de "abaixo" e o botão "Cobrir". *Revisto na rodada de revisão (15/10): a contagem era "N de 16 abaixo da meta"; com o sódio fora do cartão (D-206) ela passou a contar o que se cobre.*
- **CA-686** · Dado "Cobrir" no cartão, então abre a mesma gaveta do Cobrir da etapa 3 ("Cobrir Ferro", quanto falta e as sugestões). "Adicionar" põe o alimento na refeição escolhida, fecha a gaveta e o cartão se refaz com o plano novo.
- **CA-687** · Dado um nutriente acima do limite superior, então ele aparece no cartão com a adequação e "acima do limite", na cor de acima, sem "Cobrir".
- **CA-688** · Dado "Ver todos" no cartão, então o planejador vai para a etapa 3, Adequação, com a página no topo e o foco no título "Micronutrientes" (CA-701).
- **CA-689** · Dado a etapa 1, então a coluna da direita não mostra o cartão "Micronutrientes".

### Etapa 3, Adequação

- **CA-690** · Dado a tabela, então ficam à vista, na ordem de sempre, os nutrientes abaixo da meta e os acima do limite. Os que estão na meta ficam recolhidos num botão "Ver os N na meta", fechado ao abrir a tela; aberto, eles aparecem na mesma tabela, com as mesmas colunas, e o botão vira "Esconder os N na meta".
- **CA-691** · Dado um nutriente abaixo da meta, então a ação "Cobrir" tem fundo teal claro, na tabela e no cartão da etapa 2. Nutriente na meta ou acima do limite não tem Cobrir.
- **CA-692** · Dado uma tela com menos de 640 px, então a adequação é uma lista sem rolagem para o lado: cada nutriente mostra o nome com as marcas, a adequação com o estado ("48% abaixo"), a barra, "8,7 mg de 18 mg" com o tipo da referência, e "Cobrir" com pelo menos 44 px quando está abaixo da meta. O recolhimento do CA-690 vale igual.
- **CA-693** · Dado as notas da tabela, então elas dizem, uma vez cada e em uma frase cada: o que é o †, o que é o ‡, quando se usa a AI, a composição com "Fontes da base" e as referências de ingestão.
- **CA-694** · Dado a gaveta do Cobrir com o plano acima do gasto energético, então a descrição diz "O plano já passou N kcal do gasto energético." (N positivo, sem casa decimal) no lugar de "Cabem -N kcal até o gasto energético.". Com o plano no gasto ou abaixo, continua "Cabem N kcal até o gasto energético." (de -0,5 a 0 kcal, "Cabem 0 kcal"), e sem gasto calculado a frase não aparece, como hoje.

### Rodada de revisão (15/10/2026)

- **CA-695** · *Revisto pelo CA-711 na integração.* Dado a energia perto dos limites, então o % da frase arredonda na direção do estado (D-209): 89,6% sai "89% do GET, abaixo de 90%" e 110,4% sai "111% do GET, acima de 110%". Dentro da faixa, arredonda para o mais perto.
- **CA-696** · *Revisto pelo CA-712 na integração.* Dado a adequação com 89,6% e meta de 90%, então o cartão da etapa 2, a tabela e a lista do celular mostram "89%" (nunca "90%" em cor de abaixo). Do mesmo jeito, o % das kcal de um macro com meta em % arredonda para baixo quando está abaixo e para cima quando está acima, no Resumo do dia e na faixa do topo da etapa 3, e o % do gasto da faixa segue o CA-695. Acima do limite e na meta, a adequação arredonda para o mais perto.
- **CA-697** · Dado o sódio abaixo da meta (D-206), então ele não aparece no cartão da etapa 2 nem entra na contagem, e nenhum "Cobrir" do sódio aparece no cartão, na tabela ou na lista do celular; na etapa 3 ele continua à vista com o valor, a referência e "52% abaixo". Dado o sódio acima do limite, então ele aparece no cartão com "acima do limite", sem Cobrir, como os outros.
- **CA-698** · Dado "Personalizado", quando a pessoa digita no "Mínimo da meta" um número acima de 1000 (o limite que o cálculo aceita), então o número não vale: a adequação continua com o último mínimo válido, e nenhuma etapa deixa de abrir.
- **CA-699** · Dado o cartão da etapa 2 com alguma linha marcada com †, então o pé do cartão diz, à vista, sem depender de passar o cursor: "† Total possivelmente subestimado: falta o dado em algum alimento." Sem linha marcada, o pé não aparece.
- **CA-700** · Dado um leitor de tela, então todo "Cobrir" diz o nutriente ("Cobrir Ferro") no cartão, na tabela e na lista do celular, e as notas † e ‡ da tabela são lidas com o símbolo.
- **CA-701** · Dado "Ver todos" no cartão, então a etapa 3 abre com a página no topo e o foco do teclado no título "Micronutrientes".
- **CA-702** · Dado "Ver cálculo" aberto, então a ordem é: TMB, fator de atividade, adicionais e a fonte da energia; depois "Carboidrato no plano" e "Gordura no plano" em g/kg e a origem das metas dos macros. O g/kg de um macro só aparece aqui quando a meta dele é em %; com meta em g/kg, o número já está na linha e não se repete.
- **CA-703** · Dado o cartão da etapa 2, então a contagem diz "N para cobrir." quando há o que cobrir, "Nada para cobrir." quando não há (mesmo com algum acima do limite ou com só o sódio abaixo) e "Todos os 16 na meta." quando os 16 estão na meta, sempre com ponto final. A meta usada (por exemplo, 90% da referência) vai na descrição da lista para leitor de tela, sem texto a mais na tela.
- **CA-704** · Dado o recolhido "Ver os N na meta" aberto num plano, quando a pessoa troca para outro plano (inclusive pelo voltar e avançar do navegador), então a etapa 3 do outro plano abre com o recolhido fechado.

### Integração das três frentes (15/10/2026)

- **CA-711** · Dado a energia em relação ao gasto (D-211), então 89,6% sai "89% do GET, abaixo de 90%", 110,4% sai "111% do GET, acima de 110%", 125,2% sai "125% do GET, acima de 110%" e 70,6% sai "71% do GET, abaixo de 90%". O mesmo número sai na faixa do topo da etapa 3.
- **CA-712** · Dado um percentual com estado (D-211), então a adequação de 89,6% com meta de 90% sai "89%", e a de 72,7% com meta de 90% sai "73%", no cartão, na tabela e na lista do celular; o % das kcal de um macro com meta de 20 a 35% sai "36%" com 35,4%, "40%" com 40,2%, "19%" com 19,6% e "16%" com 15,6%, no Resumo do dia e na faixa do topo da etapa 3.
- **CA-713** · Dado a gaveta do Cobrir aberta pelo cartão da etapa 2 ou pela etapa 3, quando "Adicionar" leva o nutriente à meta e o Cobrir dele some, então o foco do teclado vai para o Cobrir do próximo nutriente que estava abaixo dele; sem próximo, para o título "Micronutrientes". Quando o nutriente continua abaixo da meta, ou a gaveta fecha sem adicionar, o foco volta ao Cobrir que abriu a gaveta (D-212).
- **CA-714** · Dado o sódio abaixo da meta, então não há "Cobrir Sódio" em lugar nenhum da interface: nem no cartão da etapa 2, nem na tabela da etapa 3, nem na lista do celular (D-206). Se a gaveta do Cobrir chegar a abrir para o sódio, ela não lista sugestão e mostra a mensagem do domínio: "O sódio não se cobre com alimento: o sal de cozinha e os temperos já completam o dia." (CA-678 da `sugestoes-com-criterio`).

## 4. Casos de borda

- **CB-200** · Plano sem alimentos: o cartão "Micronutrientes" da etapa 2 diz "O plano ainda não tem alimentos." e não lista nada. Na etapa 3, as 16 linhas ficam à vista (todas abaixo) e o Cobrir funciona, como hoje (CB-05).
- **CB-201** · Sem sexo ou idade para achar a referência: o cartão mostra o motivo, o mesmo da etapa 3, e não lista nada.
- **CB-202** · Nenhum abaixo da meta e nenhum acima do limite: o cartão diz "Todos os 16 na meta." e a etapa 3 mostra "Nenhum nutriente abaixo da meta." acima do botão "Ver os 16 na meta". Nenhum abaixo e algum acima do limite: o cartão diz "Nada para cobrir." e lista os acima do limite, sem Cobrir; a etapa 3 mostra os acima do limite à vista e o resto recolhido.
- **CB-203** · Mais de 5 abaixo da meta: o cartão mostra os 5 mais longe da meta, e a contagem diz o total ("8 para cobrir.").
- **CB-204** · Nutriente que chega à meta depois de um Cobrir: sai do cartão e, na etapa 3, passa para o grupo recolhido (se o grupo estiver aberto, continua aberto).
- **CB-205** · Macro sem meta (sem idade, ou plano sem energia): a linha mostra as gramas e "Sem meta: informe a idade ou defina uma meta.", como hoje; com meta e sem medidor, "Meta: 10 a 35%".
- **CB-206** · Sem peso: nenhum g/kg na linha nem em "Ver cálculo".
- **CB-207** · Modo rápido com meta digitada: "Ver cálculo" só aparece se houver o que mostrar (g/kg ou origem das metas), sem TMB nem fator.
- **CB-208** · Celular de 360 px: nada rola para o lado no Resumo do dia, no cartão "Micronutrientes" e na etapa 3.
- **CB-209** · Troca de referência (Individual, Coletivo, Personalizado): o cartão da etapa 2 e a tabela usam a referência do caso e se refazem juntos.
- **CB-211** · "Adicionar" leva à meta o único nutriente do cartão: a lista some, o cartão diz "Nada para cobrir." ou "Todos os 16 na meta." e o foco vai para o título "Micronutrientes" do cartão (D-212).

## 5. Fora de escopo, explicitamente

- Qualquer mudança de cálculo, de referência, de quais alimentos o Cobrir sugere (`cobrir.ts`, `trocas.ts`, `sugestoes.ts`, frente "sugestões com critério") e da lógica da gaveta do Cobrir. Na gaveta muda só a frase do CA-694 e, na integração, para onde vai o foco ao fechar (D-212). O sódio sem Cobrir (D-206) é só da tela; o domínio fica com a outra frente.
- O PDF e a impressão (frente "PDF do plano"), o Word e a cópia da tabela.
- A faixa do topo da etapa 3 (item 1.3), salvo o arredondamento do D-209; a Avaliação antropométrica e o resto da etapa 1.
- Resumo fixo na tela ao rolar, ou no topo da etapa 2 no celular. A ordem das telas no celular não muda: o Resumo do dia continua depois das refeições, porque pôr no topo empurraria as refeições, que são o trabalho da etapa 2, e nada flutua por cima do conteúdo (era o D-209 até a rodada de revisão).
- A tela da biblioteca (`#/design-system`), além de acompanhar a API nova do `MedidorMacro`.

## 6. Riscos para você revisar

- **R-200** · O cartão "Micronutrientes" (D-204) é a única coisa que entra. Se o dono achar que polui, sai sozinho: é um cartão à parte, e o resto da spec não depende dele.
- **R-201** · Linhas na meta recolhidas (D-205): quem confere a tabela inteira precisa de um clique a mais. O Word e a cópia da tabela continuam com as 16 linhas.
