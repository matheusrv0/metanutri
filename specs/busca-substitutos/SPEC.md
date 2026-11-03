# SPEC — Busca de substitutos por nutriente

Status: **protótipo aprovado pelo dono em 03/11/2026** ("aprovo"), pedido de novo no mesmo dia ("lembre da busca por
alimentos substitutos"). Ordem de pé "apenas faça": as decisões abaixo foram tomadas pelos princípios do produto e
estão escritas para revisão.

**Por quê:** o app foi posto em teste e "praticamente reprovado" (03/11/2026). Um dos motivos: o Dietbox tem
"Buscar substitutos" (escolher carboidrato, proteína ou lipídeo, "Buscar alimentos", "0,72 g de carboidrato a mais",
"Comparar alimentos", "Adicionar") e o MetaNutri só tinha a calculadora, em que a nutricionista precisa saber e
digitar o substituto.

**Fontes da verdade:**
- O protótipo aprovado `BuscarSubstitutos` (Claude Design, 03/11/2026). A medida caseira da réplica do protótipo bateu
  com a do app em 17.014 casos; os números dele viram gabarito dos testes (D-1119).
- A seção 5 de `lacunas.md` (pesquisa de 03/11/2026, fora do repositório): a conta, as bases e o rascunho dos critérios.
- As specs `alimentos-e-gramaturas` (D-379, D-386, D-423, D-484, D-486), `conduta-da-nutricionista` (D-293 a D-296,
  D-421), `sugestoes-com-criterio` (D-194, D-473, D-478, D-479), `ficha-unica` (D-353, D-354), `impressao-do-plano`
  (D-480), `dieta-no-link` (D-150 a D-158), `base-ampliada` (D-710, D-711, D-716) e `ajustes-mobile` (D-800 a D-805).

**Hoje:** o "⇄" do item abre a janela "Substituto equivalente" (CA-41, CA-42): um critério (energia, proteína ou
carboidrato), a nutricionista digita o alimento, a porção sai na meia medida caseira (D-486) e o botão "Usar como
substituto 1/2" põe o alimento na aba Substituto 1 ou 2 da refeição. As "trocas da folha" (`trocas.ts`) escolhem
sozinhas, mas só por energia e só para a folha impressa.

## 1. O que muda

1. No Principal da refeição, cada alimento tem o botão **"Buscar substitutos"** (o "⇄").
2. Ele abre o **painel de substitutos** do item, com dois modos: **"Buscar substitutos"** (novo, o padrão) e
   **"Adicionar manualmente"** (a calculadora de hoje).
3. A busca: escolher um ou mais nutrientes (chips Carboidratos, Proteínas e Lipídeos e, pela lista, energia, fibra e os
   micronutrientes), o filtro **"Só do mesmo grupo"** e o botão **"Buscar alimentos"**. Cada candidato vem com a porção
   em medida caseira e gramas e com "X g de carboidrato a mais/a menos" ("igual" quando zera).
4. Ações de cada candidato: **"Comparar"** (janela lado a lado), **"Substituir"** (com **"Desfazer"**) e
   **"Adicionar como opção"** (até 2 opções por item).
5. A opção do item aparece embaixo dele no plano e, para o paciente, na folha (PDF), no link e no Word, com "ou".
6. No celular e no tablet, o painel é uma gaveta.

## 2. Decisões

| ID | Decisão | Por quê |
|---|---|---|
| D-1100 | **Onde a busca mora.** O botão "Buscar substitutos para {alimento}" fica em cada alimento do **Principal** da refeição, no lugar do "Substituir {alimento}" da calculadora. Item de receita e item cujo alimento foi excluído não têm o botão (CA-873, D-248). Os itens das abas Substituto 1 e 2 também não | O protótipo põe o botão em cada alimento do plano; a receita e o excluído não têm o que comparar; as abas de substituto já são alternativa da refeição inteira |
| D-1101 | **Dois modos no painel.** "Buscar substitutos" é o padrão; "Adicionar manualmente" é a calculadora de hoje (CA-41, CA-42, D-486: "Equivalente por" energia, proteína ou carboidrato, a entrada rápida e a porção na meia medida). O resultado da calculadora ganha as mesmas ações do candidato da busca (Comparar, Adicionar como opção, Substituir). **"Usar como substituto 1/2" sai do painel:** as abas Substituto 1 e 2 da refeição continuam, com a entrada rápida delas | Duas palavras para a mesma coisa no mesmo painel ("Usar como substituto 1" e "Adicionar como opção") confundiriam; a opção do item é o que o protótipo aprovou |
| D-1102 | **Bases.** Entram exatamente as listas que o Cobrir já usa (`alimentosParaSugerir`): a TACO inteira (com o complemento do USDA), da base ampliada só os 97 `sugerivel` (D-716) e de Meus alimentos só os que têm "Pode aparecer no Cobrir e nas trocas" ligado (D-386, com as regras do próprio da D-493 e D-510). O catálogo de marcas entra só pela cópia em Meus alimentos. Tucunduva e TBCA não entram (sem licença) | É a regra que já existe para sugerir alimento sozinho; o catálogo traz só energia no índice e quase tudo cairia na regra prescritível |
| D-1103 | **A conta.** `A` é o alimento do item, com `gA` gramas; `alvo_n = A_n × gA / 100` para cada nutriente escolhido; `b_n = B_n / 100` para o candidato `B`. **Com 1 nutriente**, `g* = alvo / b` (a conta da calculadora de hoje). **Com 2 ou mais**, mínimos quadrados do erro relativo: `g* = Σ(b_n/alvo_n) ÷ Σ(b_n/alvo_n)²`; a **nota de ajuste** é `√ média((b_n·g*/alvo_n − 1)²)` e o candidato com nota **acima de 25%** sai | Conta direta, sem tentativa e erro, igual à do protótipo aprovado; acima de 25% o alimento não equivale àquela combinação (atum para "carboidrato + proteína") |
| D-1104 | **A porção.** `g = arredondar(g*)`; fora se `g < 5` ou `g > 600` (a faixa das trocas). A medida é a `medidaParaMostrar` de sempre (ponta de faca; até 4 pedaços; fruta inteira até 20%, D-423 e D-484; carne em colher até 4, D-483; gordura nunca em fatia). Com medida, a porção é `quantidade × peso da medida` (uma casa); sem medida, os gramas inteiros. A porção que ainda pediria **mais de 4 unidades ou pedaços** sai (D-295: "7 torradas" não é troca). A medida vai junto quando o candidato entra no plano (D-379); sem medida, o item entra em "só gramas" | É a mesma porção que a calculadora, a folha e o Cobrir mostram |
| D-1105 | **A diferença e a frase.** `Δ_n = B_n × porção / 100 − alvo_n`, só dos nutrientes escolhidos (os outros ficam no Comparar). Precisão: kcal sem casa; os outros, uma casa abaixo de 100 e nenhuma de 100 em diante (a precisão da Adequação, CA-339 e CA-791). Frases: "0,7 g de carboidrato a mais", "1,2 g de proteína a menos", "12 kcal a mais", "3,5 mg de ferro a menos"; quando arredonda a zero, "{Nutriente} igual" ("Carboidrato igual", "Energia igual") | A diferença nasce do arredondamento para a medida caseira, como no Dietbox; a precisão é a que o app já usa |
| D-1106 | **Filtros clínicos**, os das trocas da folha: só alimento prescritível para sugerir (`ehPrescritivelParaSugerir`, sem a forma de ingrediente: cru, farinha, pó); só "troca razoável" (sem doce, embutido, molho, biscoito, bolo…); nunca fígado (D-473); nunca frito (D-479); ultraprocessado só quando o original é ultraprocessado (D-478); prato composto só quando o original é composto (D-294). Candidato sem o nutriente escolhido na tabela (não analisado ou zero) não entra | Sugestão tem de ser prescritível ("cerveja Pilsen" no Cobrir, 15/10/2026); os princípios da Mor: in natura e preparo simples primeiro, nunca álcool, ultraprocessado ou trans |
| D-1107 | **Restrições do paciente, no padrão do Cobrir.** O candidato que bate com a ficha (alergia, intolerância, escolha, "não come"), com os alergênicos do rótulo ou com o cuidado da fase de vida (`restricaoDoAlimento`, D-353, D-442) **não aparece**. O que o paciente "não gosta" vai para o fim (D-354). Sem nenhum resultado e com restrição tirando alguém, a frase diz "dentro das restrições do paciente". A linha do plano continua avisando a restrição do item e passa a avisar a da opção, inclusive da opção posta à mão (D-353) | O Cobrir já faz assim (CA-675): esconder é mais seguro que marcar, e o aviso da linha cobre o que entrou à mão |
| D-1108 | **"Só do mesmo grupo"**, ligado ao abrir. O grupo de substituição vem da tabela da seção 3 (o papel no prato das trocas, D-421, e o grupo da tabela). Dentro do grupo valem as regras de forma das trocas: ovo inteiro só por ovo inteiro (gema e clara só entre si), verdura cozida só por verdura cozida, acompanhamento pronto só por pronto. A frase do filtro diz o grupo: "Só do mesmo grupo: cereais, tubérculos e raízes". Desligado, vale qualquer grupo, com os mesmos filtros clínicos | A categoria da TACO separa arroz de batata e junta arroz com biscoito; o papel no prato é o que a nutricionista troca |
| D-1109 | **Ordem dos candidatos:** (1) o que o paciente não gosta por último; (2) uso comum antes do pouco usual (víscera, caça, fruto do mar de exceção); (3) **faixa de proximidade de 5%**, pela soma dos erros relativos dos nutrientes escolhidos; (4) preparo simples antes de prato composto, in natura antes de processado, primeira escolha antes da segunda (D-293 a D-296); (5) com medida caseira antes de só gramas; (6) o mais consumido no Brasil (POF 2017-2018); (7) a proximidade exata; (8) o nome. **No máximo 20**; a tela mostra 6 e "Mostrar mais" | Sem a faixa, a ordem do protótipo punha "Melancia, 517 g" acima da polenta em "todos os grupos": diferença de 0,1 ponto percentual decidia contra o alimento de uso comum com medida caseira |
| D-1110 | **Os nutrientes.** Chips Carboidratos, Proteínas e Lipídeos; a lista "Outro nutriente" traz Energia, Fibra alimentar e os micronutrientes da Adequação (`MICRONUTRIENTES_ADEQUACAO`), com os nomes da Adequação. Ao abrir, vem marcado o macro que mais dá energia ao alimento do item (o "macro dominante" das trocas), e a lista já aparece. Mudar a seleção ou o filtro depois da busca mostra "Os nutrientes mudaram. Busque de novo para atualizar a lista." até buscar de novo | O protótipo aprovado faz assim: resultado sem clique a mais; a lista é a mesma da tela de Adequação |
| D-1111 | **Sem alvo.** Alimento do item sem o nutriente escolhido (não analisado ou zero): "{alimento} não tem {nutriente} na tabela. Escolha outro nutriente." Item com 0 g: "Informe os gramas de {alimento} para buscar substitutos." | Sem alvo não há conta (CB-1 da pesquisa) |
| D-1112 | **Comparar alimentos.** Janela com o alimento do item na porção dele e o candidato na porção proposta, e a diferença (substituto − original). Linhas: Energia, Carboidrato, Proteína, Lipídeos, Fibra alimentar, Cálcio, Ferro, Magnésio, Potássio, Sódio, Vitamina C e, depois, os escolhidos que não estão nessa lista. Os escolhidos levam "escolhido". Falta de dado diz "não analisado", e a diferença vira "—"; diferença que zera diz "igual". Embaixo: "“Não analisado” é falta de medição na tabela, não zero." (a frase da Tabela de alimentos). Ações: Fechar, Adicionar como opção, Substituir | A notação do produto: falta de dado nunca é zero |
| D-1113 | **Substituir.** O item do Principal vira o candidato (alimento, porção e medida, D-379) **no mesmo lugar e com o mesmo id**; as opções do item ficam, menos a que for o alimento novo. O painel fecha e a refeição mostra "{alimento} trocado por {candidato}, {porção}. {Refeição} passou a somar {N} kcal." com **"Desfazer"**. Desfazer devolve o item como era (com as opções) e reabre o painel nele. O aviso some quando outra troca acontece ou quando o painel abre de novo | O protótipo aprovado; desfazer é mais rápido que confirmar |
| D-1114 | **Opção do item.** "Adicionar como opção" guarda o candidato no item (`opcoesDoItem`: alimento, gramas, medida), **no máximo 2**; o mesmo alimento não entra duas vezes nem como opção dele mesmo. O botão diz "Adicionar como opção", "Já é opção" ou "Já tem 2 opções". O painel fica aberto. Na linha do plano, embaixo do item: "Opção 1", o alimento, a porção e "Tirar". A opção não entra na soma do dia, na adequação, na lista de compras nem nas missões (como os substitutos, CA-43) | O plano não tinha onde guardar a troca de **um** alimento: as abas Substituto 1 e 2 são a refeição inteira, e a "lista de trocas" da folha é automática |
| D-1115 | **A opção para o paciente.** Logo abaixo do item, com "ou": na folha (PDF), "ou {nome para o paciente}" na coluna do alimento e a quantidade na outra; em "Meu plano" (link), "ou", a quantidade e o nome, como o item; no Word, "{item} ou {opção}". A quantidade segue a escolha do plano (D-376). A cópia do link ganha o campo `ou` só no item que tem opção: o link de um plano sem opção fica igual ao de antes e não aparece como mudado; acrescentar ou tirar uma opção marca o link como mudado (CA-545). A opção cujo alimento foi excluído some (D-248). A janela de imprimir também avisa a opção que bate com a restrição (D-480) | "Defina como a opção aparece no PDF e no link": junto do alimento que ela troca, sem repetir a refeição inteira |
| D-1116 | **Onde o painel fica.** Em tela larga (a partir de 1280 px, o `xl` das outras telas), ao lado das refeições, preso ao rolar e com rolagem própria, no lugar da coluna do Resumo do dia e dos Micronutrientes, que descem para baixo das refeições enquanto ele está aberto. Abaixo de 1280 px, uma gaveta que sobe de baixo (`Sheet` lado `bottom`), como a ficha da Tabela de alimentos. O item ativo fica destacado e o botão dele, pressionado. Clicar no botão de outro item troca o painel para ele | Protótipo aprovado (painel ao lado; gaveta no celular) e o padrão que o app já tem na Tabela de alimentos |
| D-1117 | **Base ampliada ainda chegando.** A busca usa o que já chegou, diz "Parte da base ainda está carregando; a lista pode crescer." e se refaz quando ela chega (CB-709). Com erro: "Parte da base não carregou; a lista pode estar incompleta." | CB-4 da pesquisa |
| D-1118 | **Textos mínimos.** Sem justificativa ("por segurança"), sem subtítulo decorativo. No painel, o nome do alimento é o da base (como no resto do planejador); o nome para o paciente fica na folha, no link e no Word | Regras de texto do dono (05/10 e 27/10/2026) |
| D-1119 | **Gabarito.** Os números do protótipo aprovado (arroz por carboidrato, arroz por carboidrato + proteína, frango por proteína + lipídeo, feijão por proteína + carboidrato) viram testes do domínio | A réplica do protótipo bateu com o app em 17.014 casos |

## 3. Grupos de substituição (D-1108)

| Grupo | Nome na tela | Quem entra |
|---|---|---|
| `amido` | cereais, tubérculos e raízes | O papel "acompanhamento" das trocas (arroz, macarrão, cuscuz de milho, polenta, batatas, mandioca, cará) e, da base ampliada, macarrão cozido, arroz parboilizado, quinoa, inhame, milho verde e batata assada |
| `pao` | pães e torradas | O papel "pão" das trocas |
| `cereal-do-cafe` | cereais do café | O papel "cereal do café" das trocas (aveia, cereal matinal, flocos) |
| `leguminosa` | leguminosas | Leguminosas e derivados, menos amendoim, paçoca, pé-de-moleque e extrato de soja |
| `carne` | carnes, aves e peixes | Carnes e derivados; Pescados e frutos do mar |
| `ovo-queijo` | ovos e queijos | Ovos e derivados; os queijos de Leite e derivados |
| `leite` | leites e iogurtes | Leite e derivados sem os queijos; extrato de soja |
| `fruta` | frutas | Frutas e derivados |
| `verdura` | verduras e legumes | As verduras das trocas (D-421, CA-671), fora as do `amido` |
| `oleaginosa` | castanhas, sementes e amendoim | Nozes e sementes; amendoim, paçoca e pé-de-moleque |
| os demais | o grupo da tabela, em minúsculas | Pelo grupo da tabela (alimento próprio inclusive) |

## 4. Critérios de aceite

Cada critério tem um teste que cita o ID.

### O botão e o painel

- **CA-2100** (D-1100) · Dado um alimento no Principal de uma refeição, então a linha tem o botão "Buscar substitutos
  para {alimento}"; dado um item de receita, um item cujo alimento foi excluído ou um item da aba Substituto 1, então
  não tem.
- **CA-2101** (D-1116) · Dado o plano aberto, quando clico em "Buscar substitutos para Arroz, tipo 1, cozido", então
  abre o painel "Substitutos de Arroz, tipo 1, cozido" com a porção e a refeição ("… · 150 g · almoço"), o botão fica
  pressionado e a linha destacada; quando clico de novo, o painel fecha; quando clico no botão de outro item, o painel
  passa a ser dele.
- **CA-2102** (D-1110) · Dado o painel aberto num arroz, então "Carboidratos" já vem marcado e a lista já aparece,
  sem clicar em "Buscar alimentos".

### A conta

- **CA-2103** (D-1103, D-1104, D-1119) · Dado arroz tipo 1 cozido, 150 g, "Carboidratos" e "Só do mesmo grupo",
  quando busco, então aparecem, entre outros: Polenta, pré-cozida, "3 colheres de servir · 180 g", "0,1 g de
  carboidrato a menos"; Batata, inglesa, cozida, "2 unidades e meia · 350 g", "0,3 g de carboidrato a menos"; Cará,
  cozido, "7 colheres de sopa e meia · 225 g", "0,3 g de carboidrato a mais"; Cuscuz, de milho, cozido com sal,
  "7 colheres de servir · 168 g", "0,4 g de carboidrato a mais"; Batata, baroa, cozida, "4 colheres de servir · 220 g",
  "0,4 g de carboidrato a menos"; Batata, doce, cozida, "5 colheres de sopa e meia · 231 g", "0,5 g de carboidrato a
  mais"; Arroz, integral, cozido, "8 colheres de sopa · 160 g", "0,8 g de carboidrato a menos".
- **CA-2104** (D-1103, D-1119) · Dado arroz tipo 1 cozido, 150 g, "Carboidratos" e "Proteínas", então cada candidato
  mostra as duas diferenças: Cuscuz "168 g" (0,4 g de carboidrato a mais; 0,2 g de proteína a menos), Batata inglesa
  "350 g" (0,3 g a menos; 0,3 g a mais), Polenta "5 colheres de sopa · 175 g" (1,3 g a menos; 0,2 g a mais); e
  mandioca, batata doce e batata baroa, com nota de ajuste acima de 25%, não aparecem.
- **CA-2105** (D-1103, D-1119) · Dado frango, peito, sem pele, grelhado, 100 g, "Proteínas" e "Lipídeos", então a
  maminha grelhada aparece (103 g) e o patinho, a alcatra e a merluza (nota acima de 25%) não aparecem; e dado feijão
  carioca cozido, 140 g, "Proteínas" e "Carboidratos", então o feijão preto aparece em "1 concha · 140 g", com "0,4 g
  de proteína a menos" e "0,6 g de carboidrato a mais".
- **CA-2106** (D-1105) · Dada uma diferença positiva, então a frase diz "a mais"; negativa, "a menos"; que arredonda a
  zero, "{Nutriente} igual"; e a energia sai sem casa ("12 kcal a mais"), o grama com uma casa e o micronutriente com
  uma casa abaixo de 100 e nenhuma de 100 em diante.
- **CA-2107** (D-1104) · Dado um candidato sem medida caseira que sirva, então a porção sai em gramas inteiros;
  dado um candidato cuja porção daria menos de 5 g, mais de 600 g ou mais de 4 unidades ou pedaços, então ele não
  aparece.

### Filtros, restrições e grupos

- **CA-2108** (D-1106) · Dada qualquer busca, então nenhum candidato é frito, fígado, bebida alcoólica, doce,
  embutido, ingrediente cru, ultraprocessado (com o original não ultraprocessado) ou prato composto (com o original
  simples).
- **CA-2109** (D-1107) · Dado um paciente com alergia a leite, quando busco substituto do ovo cozido por proteína no
  mesmo grupo, então nenhum queijo aparece; dado que o paciente não gosta de um candidato, então ele aparece por último.
- **CA-2110** (D-1107) · Dado que a restrição tirou todos os candidatos, então a frase é "Nenhum substituto com esses
  nutrientes dentro das restrições do paciente. Tire um nutriente, desligue “Só do mesmo grupo” ou adicione
  manualmente."
- **CA-2111** (D-1108) · Dado arroz e "Só do mesmo grupo" ligado, então o filtro diz "Só do mesmo grupo: cereais,
  tubérculos e raízes" e nenhuma fruta aparece; desligado, aparecem alimentos de outros grupos.
- **CA-2112** (D-1108) · Dado ovo inteiro cozido no mesmo grupo, então nenhuma gema ou clara aparece; dado brócolis
  cozido no mesmo grupo, então nenhuma verdura crua aparece.
- **CA-2113** (D-1102) · Dado um alimento da base ampliada marcado `sugerivel`, então ele pode aparecer (macarrão
  cozido no lugar do arroz); dado um da base ampliada não sugerível, não; dado um alimento próprio com "Pode aparecer
  no Cobrir e nas trocas" ligado, então ele pode aparecer; desligado, não.

### Ordem, seleção e mensagens

- **CA-2114** (D-1109) · Dado arroz, "Carboidratos" e o filtro desligado, então a polenta (com medida caseira) vem antes
  da melancia em gramas; dado um candidato pouco usual, então ele vem depois dos comuns; e a busca devolve no máximo 20,
  a tela mostra 6 e "Mostrar mais N", que vira "Mostrar menos".
- **CA-2115** (D-1110) · Dado o painel, quando escolho "Cálcio" em "Outro nutriente", então ele entra em "Nutrientes
  selecionados"; quando clico em "Tirar Cálcio", ele sai; os chips de macro alternam; sem nenhum nutriente, "Buscar
  alimentos" fica desligado; e mudar a seleção depois da busca mostra "Os nutrientes mudaram. Busque de novo para
  atualizar a lista." até eu buscar.
- **CA-2116** (D-1111) · Dado arroz e "Vitamina C", então a frase é "Arroz, tipo 1, cozido não tem vitamina C na
  tabela. Escolha outro nutriente."; dado um item com 0 g, então "Informe os gramas de {alimento} para buscar
  substitutos."

### Comparar, substituir e opção

- **CA-2117** (D-1112) · Dado um candidato, quando clico em "Comparar", então abre "Comparar alimentos" com as duas
  porções, as linhas de energia, macros, fibra e micros, os nutrientes escolhidos marcados, "não analisado" onde falta
  dado (e "—" na diferença) e as ações Fechar, Adicionar como opção e Substituir.
- **CA-2118** (D-1113) · Quando clico em "Substituir" na batata inglesa, então o arroz vira "Batata, inglesa, cozida",
  350 g, na medida "2 unidades e meia", no mesmo lugar da lista; o painel fecha; a refeição diz "Arroz, tipo 1, cozido
  trocado por Batata, inglesa, cozida, 2 unidades e meia · 350 g. Almoço passou a somar N kcal." e o total do dia muda.
- **CA-2119** (D-1113) · Depois de substituir, quando clico em "Desfazer", então o arroz volta como era (gramas, medida
  e opções), o aviso some e o painel reabre no arroz.
- **CA-2120** (D-1114) · Quando clico em "Adicionar como opção", então "Opção 1" aparece embaixo do item com o alimento e
  a porção, o botão daquele candidato diz "Já é opção" e o painel continua aberto; com 2 opções, os outros dizem "Já
  tem 2 opções"; "Tirar" remove a opção; e o total do dia não muda.
- **CA-2121** (D-1101) · Quando escolho "Adicionar manualmente", então vejo a calculadora ("Equivalente por", "Escolher
  alimento substituto", a porção equivalente e as diferenças), e o resultado tem Comparar, Adicionar como opção e
  Substituir.

### Para o paciente

- **CA-2122** (D-1115) · Dado um item com opção, então a folha mostra, embaixo dele, "ou" e o nome da opção para o
  paciente, com a quantidade na escolha do plano.
- **CA-2123** (D-1115) · Dado um item com opção, então a cópia do link leva `ou` no item e "Meu plano" mostra "ou", a
  quantidade e o nome; dado um plano sem opção, então a cópia é igual à de antes; e acrescentar uma opção faz o link
  aparecer como mudado.
- **CA-2124** (D-1115) · Dado um item com opção, então o Word diz "{item} ou {opção}".
- **CA-2125** (D-1107, D-1115) · Dada uma opção que bate com a restrição da ficha, então a linha do plano avisa embaixo
  dela e a janela de imprimir também avisa.

### Tela

- **CA-2126** (D-1116, D-800, D-802) · Dada a tela a partir de 1280 px, então o painel fica ao lado das refeições;
  abaixo disso, é uma gaveta; em 360, 390, 768 e 1440 px nada rola para o lado, e no toque os alvos têm 44 px.
- **CA-2127** (D-1117) · Dada a base ampliada carregando, então o painel diz "Parte da base ainda está carregando; a
  lista pode crescer." e a lista se refaz quando ela chega.

## 5. Casos de borda

- **CB-1100** (vazio) · Sem nenhum candidato: "Nenhum substituto com esses nutrientes. Tire um nutriente, desligue “Só
  do mesmo grupo” ou adicione manualmente."
- **CB-1101** (erro de dado) · O campo `opcoesDoItem` estragado (não lista, sem número, gramas inválidos, mais de 2) é
  lido com segurança: o que não serve fica de fora, no máximo 2; nada quebra (como a medida, CB-363).
- **CB-1102** (excluído) · A opção cujo alimento foi excluído some da folha, do link e do Word; na linha do plano ela
  diz o nome do que aconteceu ("Alimento removido") e mantém o "Tirar".
- **CB-1103** (plano antigo) · O plano gravado antes, sem o campo, não tem opção; a folha, o link e o Word ficam iguais.
- **CB-1104** (item some) · Removido o item com o painel aberto, o painel fecha. Mudados os gramas com o painel aberto,
  a lista acompanha os gramas novos.
- **CB-1105** (opção = alimento novo) · Substituir pelo alimento que já era opção tira essa opção; Desfazer a devolve.
- **CB-1106** (repetida) · O candidato que já é opção, ou que é o próprio alimento do item, não entra como opção.
- **CB-1107** (permissão) · A busca não vai ao servidor nem pede permissão: quem edita o plano usa a busca. O plano de
  estágio e a prescrição rápida usam igual.
- **CB-1108** (concorrência) · O painel lê o plano de agora a cada mudança; o Desfazer só troca o item trocado, e só se
  ele ainda estiver no plano (removido depois, o Desfazer não faz nada e o aviso some).
- **CB-1109** (tempo) · A busca é local e roda sobre a lista inteira (cerca de 700 alimentos) a cada mudança dos
  nutrientes buscados ou dos gramas, sem travar a digitação (memorizada pelos parâmetros).

## 6. Fora de escopo

- "Carregar favoritos" do Dietbox (os Modelos de plano já cobrem parte).
- O catálogo de marcas direto na busca, a Tucunduva e a TBCA (D-1102).
- Busca para os itens das abas Substituto 1 e 2 e para receitas.
- A opção na lista de compras, nas missões e nas trocas automáticas da folha.
- Mudar a calculadora de hoje além das ações (D-1101).
