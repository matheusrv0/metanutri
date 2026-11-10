# SPEC — Busca de substitutos por nutriente

Status: **protótipo aprovado pelo dono em 03/11/2026** ("aprovo"), pedido de novo no mesmo dia ("lembre da busca por
alimentos substitutos"). Ordem de pé "apenas faça": as decisões abaixo foram tomadas pelos princípios do produto e
estão escritas para revisão.

**Revisão independente (03/11/2026): REPROVADA**, com seis achados e seis leves; a conta, as restrições (17 de 17
cenários), o teclado ao lado e a opção do item passaram. As correções mudaram a spec antes do código: D-1104, D-1106,
D-1109, D-1112, D-1114 e D-1116 revistas; D-1120 a D-1124, CA-2128 a CA-2135 e CB-1110 novos. Os pontos para a Mor
ficam no fim da seção 2.

**Revisão independente, rodada 2 (04/11/2026): REPROVADA**, com 1 alto, 3 médios e 5 baixos. As correções mudaram a spec
antes do código: D-1108, D-1109, D-1110, D-1114, D-1120 e D-1121 revistas; CA-2112, CA-2115 e CA-2129 revistos;
D-1125 a D-1132, CA-2136 a CA-2145 e CB-1111 novos.

**Revisão independente, rodada 3 (04/11/2026): REPROVADA**, com 2 médios e 1 baixo: as regras de equivalência (D-1125) e
de variedade (D-1130) da rodada 2 ficaram rígidas e esvaziaram listas boas (o grupo do leite, as verduras, os queijos).
As correções mudaram a spec antes do código, pelos princípios da Mor ("troca equivalente", "preservar a cultura
alimentar"): D-1104, D-1125 e D-1130 revistas; CA-2136, CA-2137 e CA-2143 revistos; D-1133 a D-1135 e CA-2146 a
CA-2149 novos.

**Revisão independente, rodada 4 (10/11/2026): REPROVADA**, com 1 médio e 2 baixos: a D-1133 tirou o macro dominante de
todos os grupos, e não só do leite e das verduras, e as carnes gordas e as castanhas passaram a trocar por carne magra e
pela pupunha; a alface ainda trocava por outra alface, e a farinha de mandioca ficou sem substituto. As correções mudaram
a spec antes do código, pelo princípio da Mor "troca equivalente": D-1125 (a), D-1133, D-1134 e D-1135 revistas; a
seção 3 (`amido`) revista; CA-2126, CA-2136 e CA-2148 revistos; D-1136 a D-1138 e CA-2150 a CA-2152 novos.

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
| D-1104 | **A porção.** `g = arredondar(g*)`; fora se `g < 5` ou `g > 600` (a faixa das trocas). **A faixa vale também para a porção final**, depois da meia medida: "Mamão, 2 unidades · 620 g" e "meia colher de sobremesa · 4,5 g" de leite em pó saem (revisão, achado 2). A medida é a `medidaParaMostrar` de sempre (ponta de faca; até 4 pedaços; fruta inteira até 20%, D-423 e D-484; carne em colher até 4, D-483; gordura nunca em fatia); no leite, no iogurte e na bebida, a da D-1135. Com medida, a porção é `quantidade × peso da medida` (uma casa); sem medida, os gramas inteiros. A porção que ainda pediria **mais de 4 unidades ou pedaços** sai (D-295: "7 torradas" não é troca). A medida vai junto quando o candidato entra no plano (D-379); sem medida, o item entra em "só gramas" | É a mesma porção que a calculadora, a folha e o Cobrir mostram |
| D-1105 | **A diferença e a frase.** `Δ_n = B_n × porção / 100 − alvo_n`, só dos nutrientes escolhidos (os outros ficam no Comparar). Precisão: kcal sem casa; os outros, uma casa abaixo de 100 e nenhuma de 100 em diante (a precisão da Adequação, CA-339 e CA-791). Frases: "0,7 g de carboidrato a mais", "1,2 g de proteína a menos", "12 kcal a mais", "3,5 mg de ferro a menos"; quando arredonda a zero, "{Nutriente} igual" ("Carboidrato igual", "Energia igual") | A diferença nasce do arredondamento para a medida caseira, como no Dietbox; a precisão é a que o app já usa |
| D-1106 | **Filtros clínicos**, os das trocas da folha: só alimento prescritível para sugerir (`ehPrescritivelParaSugerir`, sem a forma de ingrediente: cru, farinha, pó); só "troca razoável" (sem doce, embutido, molho, biscoito, bolo…, pela regra das trocas da folha, corrigida na origem pela D-1121); nunca café nem chá (D-1120); nunca "Produtos açucarados", nem o mel que a conduta da parceira libera no Cobrir (D-1120); nunca fígado (D-473); nunca frito (D-479); ultraprocessado só quando o original é ultraprocessado (D-478); prato composto só quando o original é composto (D-294). Candidato sem o nutriente escolhido na tabela (não analisado ou zero) não entra | Sugestão tem de ser prescritível ("cerveja Pilsen" no Cobrir, 15/10/2026); os princípios da Mor: in natura e preparo simples primeiro, nunca álcool, ultraprocessado ou trans |
| D-1107 | **Restrições do paciente, no padrão do Cobrir.** O candidato que bate com a ficha (alergia, intolerância, escolha, "não come"), com os alergênicos do rótulo ou com o cuidado da fase de vida (`restricaoDoAlimento`, D-353, D-442) **não aparece**. O que o paciente "não gosta" vai para o fim (D-354). Sem nenhum resultado e com restrição tirando alguém, a frase diz "dentro das restrições do paciente". A linha do plano continua avisando a restrição do item e passa a avisar a da opção, inclusive da opção posta à mão (D-353) | O Cobrir já faz assim (CA-675): esconder é mais seguro que marcar, e o aviso da linha cobre o que entrou à mão |
| D-1108 | **"Só do mesmo grupo"**, ligado ao abrir. O grupo de substituição vem da tabela da seção 3 (o papel no prato das trocas, D-421, e o grupo da tabela). Dentro do grupo valem as regras de forma das trocas: ovo inteiro só por ovo inteiro (gema só por gema, clara só por clara; o queijo troca **só com o ovo inteiro, nos dois sentidos**: nem queijo no lugar da clara ou da gema, nem clara ou gema no lugar do queijo; revisão rodada 2, M2), verdura cozida só por verdura cozida, acompanhamento pronto só por pronto, fruta inteira só por fruta inteira (D-1131), e a troca equivalente da D-1125. A frase do filtro diz o grupo: "Só do mesmo grupo: cereais, tubérculos e raízes". Desligado, vale qualquer grupo, com os mesmos filtros clínicos | A categoria da TACO separa arroz de batata e junta arroz com biscoito; o papel no prato é o que a nutricionista troca |
| D-1109 | **Ordem dos candidatos:** (1) o que o paciente não gosta por último; (2) uso comum antes do pouco usual (víscera, caça, fruto do mar de exceção); (3) **faixa de proximidade de 5%, contada a partir do melhor candidato** (a soma dos erros relativos dos nutrientes escolhidos menos a do melhor, em passos de 5 pontos: quem fica a menos de 5 pontos do melhor está na primeira faixa; revisão, leve 1); (4) preparo simples antes de prato composto, in natura antes de processado (o suco e a polpa de fruta contam como processados, D-1131), primeira escolha antes da segunda (D-293 a D-296); (5) com medida caseira antes de só gramas; (6) o mais consumido no Brasil (POF 2017-2018); (7) a proximidade exata; (8) o nome. **No máximo 20**; a tela mostra 6 e "Mostrar mais" | Sem a faixa, a ordem do protótipo punha "Melancia, 517 g" acima da polenta em "todos os grupos": diferença de 0,1 ponto percentual decidia contra o alimento de uso comum com medida caseira |
| D-1110 | **Os nutrientes.** Chips Carboidratos, Proteínas e Lipídeos; a lista "Outro nutriente" traz Energia, Fibra alimentar e os micronutrientes da Adequação (`MICRONUTRIENTES_ADEQUACAO`), com os nomes da Adequação; ela **guarda o nutriente escolhido**, e quem o acrescenta é o botão "Adicionar" ou o Enter na lista (D-1126). Ao abrir, vem marcado o macro que mais dá energia ao alimento do item (o "macro dominante" das trocas), e a lista já aparece. Mudar a seleção ou o filtro depois da busca mostra "Os nutrientes mudaram. Busque de novo para atualizar a lista." até buscar de novo | O protótipo aprovado faz assim: resultado sem clique a mais; a lista é a mesma da tela de Adequação |
| D-1111 | **Sem alvo.** Alimento do item sem o nutriente escolhido (não analisado ou zero): "{alimento} não tem {nutriente} na tabela. Escolha outro nutriente." Item com 0 g: "Informe os gramas de {alimento} para buscar substitutos." | Sem alvo não há conta (CB-1 da pesquisa) |
| D-1112 | **Comparar alimentos.** Janela com o alimento do item na porção dele e o candidato na porção proposta, e a diferença (substituto − original). Linhas: Energia, Carboidrato, Proteína, Lipídeos, Fibra alimentar, Cálcio, Ferro, Magnésio, Potássio, Sódio, Vitamina C e, depois, os escolhidos que não estão nessa lista. Os escolhidos levam "escolhido". Falta de dado diz "não analisado", e a diferença vira "—"; diferença que zera diz "igual". Embaixo: "“Não analisado” é falta de medição na tabela, não zero." (a frase da Tabela de alimentos). Ações: Fechar, Adicionar como opção, Substituir; quando o alimento comparado é o do próprio item (a calculadora deixa escolher), "Substituir" fica desligado e o botão de opção diz "É o mesmo alimento" (D-1124) | A notação do produto: falta de dado nunca é zero |
| D-1113 | **Substituir.** O item do Principal vira o candidato (alimento, porção e medida, D-379) **no mesmo lugar e com o mesmo id**; as opções do item ficam, menos a que for o alimento novo. O painel fecha e a refeição mostra "{alimento} trocado por {candidato}, {porção}. {Refeição} passou a somar {N} kcal." com **"Desfazer"**. Desfazer devolve o item como era (com as opções) e reabre o painel nele. O aviso some quando outra troca acontece ou quando o painel abre de novo | O protótipo aprovado; desfazer é mais rápido que confirmar |
| D-1114 | **Opção do item.** "Adicionar como opção" guarda o candidato no item (`opcoesDoItem`: alimento, gramas, medida), **no máximo 2**; o mesmo alimento não entra duas vezes nem como opção dele mesmo. O botão diz "Adicionar como opção", "Já é opção", "Já tem 2 opções" ou "É o mesmo alimento" (D-1124); desligado, ele continua focável (`aria-disabled`), para o foco não cair no corpo da página depois do clique (revisão, leve 2), e continua dizendo de qual alimento é (D-1129). O painel fica aberto. Na linha do plano, embaixo do item: "Opção 1", o alimento, a porção e "Tirar". A opção não entra na soma do dia, na adequação, na lista de compras nem nas missões (como os substitutos, CA-43) | O plano não tinha onde guardar a troca de **um** alimento: as abas Substituto 1 e 2 são a refeição inteira, e a "lista de trocas" da folha é automática |
| D-1115 | **A opção para o paciente.** Logo abaixo do item, com "ou": na folha (PDF), "ou {nome para o paciente}" na coluna do alimento e a quantidade na outra; em "Meu plano" (link), "ou", a quantidade e o nome, como o item; no Word, "{item} ou {opção}". A quantidade segue a escolha do plano (D-376). A cópia do link ganha o campo `ou` só no item que tem opção: o link de um plano sem opção fica igual ao de antes e não aparece como mudado; acrescentar ou tirar uma opção marca o link como mudado (CA-545). A opção cujo alimento foi excluído some (D-248). A janela de imprimir também avisa a opção que bate com a restrição (D-480) | "Defina como a opção aparece no PDF e no link": junto do alimento que ela troca, sem repetir a refeição inteira |
| D-1116 | **Onde o painel fica.** Em tela larga (a partir de 1280 px, o `xl` das outras telas), ao lado das refeições, preso ao rolar e com rolagem própria, no lugar da coluna do Resumo do dia e dos Micronutrientes, que descem para baixo das refeições enquanto ele está aberto. Abaixo de 1280 px, uma gaveta que sobe de baixo (`Sheet` lado `bottom`), como a ficha da Tabela de alimentos. O item ativo fica destacado e o botão dele, pressionado. Clicar no botão de outro item troca o painel para ele. Ao lado, o foco vai ao título quando o painel abre e volta ao botão do item quando ele fecha ou substitui; Esc fecha, menos dentro de um campo (lá o Esc é do campo); **o mesmo vale na gaveta** (revisão, achado 6). A chave "Só do mesmo grupo" tem 44 px de toque também no tablet com dedo (D-802). Nomes de alimento e de refeição quebram em até 2 linhas, com o resto no `title` (D-801) | Protótipo aprovado (painel ao lado; gaveta no celular) e o padrão que o app já tem na Tabela de alimentos |
| D-1117 | **Base ampliada ainda chegando.** A busca usa o que já chegou, diz "Parte da base ainda está carregando; a lista pode crescer." e se refaz quando ela chega (CB-709). Com erro: "Parte da base não carregou; a lista pode estar incompleta." | CB-4 da pesquisa |
| D-1118 | **Textos mínimos.** Sem justificativa ("por segurança"), sem subtítulo decorativo. No painel, o nome do alimento é o da base (como no resto do planejador); o nome para o paciente fica na folha, no link e no Word | Regras de texto do dono (05/10 e 27/10/2026) |
| D-1119 | **Gabarito.** Os números do protótipo aprovado (arroz por carboidrato, arroz por carboidrato + proteína, frango por proteína + lipídeo, feijão por proteína + carboidrato) viram testes do domínio | A réplica do protótipo bateu com o app em 17.014 casos |
| D-1120 | **Café, chá e açucarados nunca são substitutos** (revisão, achados 1 e 5). A busca corta `^(Café, Chá),` com a **mesma constante do Cobrir** (`CAFE_OU_CHA`, D-193 da `sugestoes-com-criterio`, agora em `prescritivel.ts`) e corta o grupo "Produtos açucarados" (o mel e o chocolate meio amargo que a conduta da parceira libera no Cobrir, D-290). O leite em pó, também liberado pela D-290, **fica, mas só no lugar de outro pó** (D-1125, regra c; revisão rodada 2, A1: a faixa da D-1104 não segurava "leite em pó desnatado 526 g" no lugar de um copo de leite). Com o item café ou chá, a busca não monta lista e manda para "Adicionar manualmente" (D-1132) | Café 525 g aparecia em 1º lugar no lugar do arroz por proteína: a POF põe o café entre os mais consumidos, e a infusão quase sem nada vira "equivalente" por qualquer nutriente |
| D-1121 | **A "troca razoável" corrigida na origem, para a folha e para a busca** (revisão, achado 4). A regra das trocas da folha (`NAO_EQUIVALE`, `trocas.ts`) casava a palavra sem limite e cortava alimento que não é doce: "Batata, doce, cozida" (que o papel "acompanhamento" lista pelo nome), "Caqui, chocolate, cru", "Mostarda, folha, crua" e "Macarrão, molho bolognesa". Agora: `doce` não vale depois de "batata, " nem de "água "; `chocolate` não vale depois de "caqui, "; `bolo` não vale antes de "gn"; `mostarda` não vale antes de ", folha". Doce de leite, doce de abóbora, goiabada, marmelada, mel e chocolate continuam fora. O nome livre (alimento próprio e cópia do catálogo) recebe o mesmo tratamento (D-1127). **A folha muda** (revisão rodada 2, M3: conferido na folha de verdade, que pede 4 trocas e mostra 2, de 30 a 400 g, em 253 porções de 12 alimentos): almeirão, nabo e repolho branco crus passam a oferecer "Folha de mostarda" (verdura por verdura); atemóia e banana pacova, "Caqui chocolate" (fruta por fruta); baião de dois, bolinho de arroz, charuto de repolho, cuscuz paulista, feijão tropeiro, tapioca com manteiga e yakisoba, "Macarrão à bolonhesa" (prato pronto por prato pronto, como a tapioca já trocava por yakisoba). A batata-doce deixa de ser cortada, mas não aparece em nenhuma folha: as 2 trocas mostradas são as mais consumidas (POF), e a batata inglesa e a mandioca vêm antes dela. A exceção da batata-doce que existia só na busca sai | Corrige na origem o que a busca contornava; a intenção do papel "acompanhamento" (D-421) sempre foi poder trocar arroz por batata-doce |
| D-1122 | **A opção da base ampliada segura o plano até a base chegar** (revisão, achado 3; D-711): `planoUsaBaseAmpliada` também olha as opções do item. E a opção da base ampliada guarda uma **cópia do nome** (o da base, o do paciente e o ml do líquido) ao entrar no plano: se a folha, o link ou o Word forem montados sem a base, a opção sai pela cópia, em gramas, e não some. A opção de alimento próprio excluído continua saindo da folha (CB-1102) | A base chega sob demanda; sem a cópia, o paciente recebia o plano sem a opção, sem aviso |
| D-1123 | **"Planos que usam este alimento"** (D-385 da `alimentos-e-gramaturas`) conta também a opção do item: editar o alimento próprio muda a opção | A opção é prescrição, como o item |
| D-1124 | **"É o mesmo alimento."** A calculadora deixa escolher o próprio alimento do item; nesse caso não há opção nem substituição: o botão de opção diz "É o mesmo alimento", e "Substituir" fica desligado no cartão e na janela Comparar | Trocar arroz por arroz não é troca |
| D-1125 | **A troca equivalente no mesmo grupo** (revisão rodada 2, A1). Com "Só do mesmo grupo" ligado (a lista que abre sozinha, D-1110), o candidato só entra se cumprir as três regras, com 1 ou mais nutrientes buscados: **(a)** o mesmo macronutriente dominante do item (o macro que mais dá energia, a regra que as trocas da folha já exigem: "trocar arroz por azeite tem a mesma energia e não é troca"), **menos nos leites e iogurtes, nas verduras e legumes e no derivado de soja entre as leguminosas** (D-1133, revista na rodada 4 pela D-1136: nos outros grupos e em "os demais" da seção 3, a regra vale); **(b)** a porção final (na meia medida, D-1104) com energia **entre metade e o dobro** da energia do item (`0,5 × E_item ≤ E_candidato ≤ 2 × E_item`); quando o alimento do item tem energia quase zero (**até 4 kcal em 100 g**, a quantidade não significativa de valor energético da rotulagem, que o rótulo declara como zero: ANVISA, IN 75/2020, Anexo IV) ou não tem energia na tabela, a (b) não vale e a (a) basta; **(c)** alimento em pó ou desidratado (leite em pó, fruta seca, uva-passa) só entra no lugar de outro em pó ou desidratado; o que volta cozido ("Carne, bovina, seca, cozida", "Ervilha, seca, partida, cozida") não é desidratado; **(d)** nas carnes, aves e peixes, a proteína da porção até 1,5 vez a do item (D-1136, revisão rodada 4). Desligado o filtro, as quatro não valem | A troca equivalente é a do mesmo grupo e da mesma energia (a lista de equivalentes, Philippi et al., Rev. Nutr. 1999;12(1):65-80, "Pirâmide alimentar adaptada"). Sem ela, a lista que abre sozinha punha "Leite, de vaca, desnatado, pó · 526 g" (1.902 kcal) no lugar de 1 copo de leite (92 kcal), "Abacate, cru · 1 unidade · 430 g" no lugar de 1 banana e castanha-do-pará 291 g no lugar do pinhão. A faixa de metade ao dobro é a tolerância desta busca: ela procura pelo nutriente, e a energia só barra o absurdo |
| D-1126 | **"Outro nutriente" pelo teclado** (revisão rodada 2, M1). A lista guarda o nutriente escolhido e não age sozinha; ao lado, o botão "Adicionar" acrescenta o escolhido, e o Enter na lista faz o mesmo. Sem nada escolhido, "Adicionar" fica desligado. Depois de acrescentar, a lista volta a "Outro nutriente" e o foco fica nela, pronto para o próximo | No Chromium do Windows, cada seta na lista fechada dispara a mudança: para chegar ao Cálcio, entravam Energia e Fibra junto. É o padrão do "Adicionar em" do Cobrir: a lista guarda um valor, e a ação vem de um botão |
| D-1127 | **O nome livre na troca razoável** (revisão rodada 2, B1). As exceções da D-1121 valem também sem a vírgula da TACO e com hífen: "Batata doce", "Batata-doce", "Caqui chocolate", "Folha de mostarda", "Mostarda folha", "à bolonhesa" ou "bolonhesa", além de "bolognesa". E "zero açúcar", "sem açúcar" e "sem adição de açúcar" não cortam o alimento: o nome diz que ele não tem açúcar. "Açúcar", "com açúcar", doce, bolo, biscoito e chocolate continuam cortados | O alimento próprio e a cópia do catálogo têm nome livre (no catálogo, 56 nomes com "batata doce", 32 com "bolonhesa" e 137 com "zero/sem açúcar"); com "Pode aparecer no Cobrir e nas trocas" ligado e sem aviso no formulário, eles sumiam da busca e das trocas sem dizer por quê |
| D-1128 | **Para onde vai o foco depois de "Tirar"** (revisão rodada 2, B2). "Tirar {nutriente}": o foco vai ao "Tirar" do nutriente que ficou no lugar dele ou, se era o último, ao do anterior; sem nenhum, à lista "Outro nutriente". "Tirar" a opção do item: o foco vai ao "Tirar" da opção que ficou no lugar dela ou ao da anterior; sem nenhuma, ao "Buscar substitutos" do item (o "⇄"), ou ao "Remover" quando o item não tem o "⇄" | O botão clicado sai da tela; sem destino, o foco caía no corpo da página e o próximo Tab voltava ao topo |
| D-1129 | **O botão de opção desligado diz o alimento** (revisão rodada 2, B3). No cartão do candidato, o nome para o leitor de tela é "{estado}: {alimento}" ("Já é opção: Polenta, pré-cozida", "Já tem 2 opções: Cará, cozido"), como o ligado já era "Adicionar como opção: {alimento}"; o texto na tela não muda. Na calculadora e na janela Comparar há um alimento só, e o botão fica como está | Com 2 opções, o leitor de tela ouvia 4 botões "Já tem 2 opções" iguais, sem saber de qual candidato era cada um |
| D-1130 | **A variedade do mesmo alimento** (revisão rodada 2, B4; refeita na rodada 3, M2), a regra das trocas da folha levada à busca, com o filtro ligado ou não, **para todo nome da lista**. "O mesmo alimento" é o da D-1134: nomes que diferem só pelo preparo, pelo estado, pelo "tipo N" ou por "com/sem" alguma coisa. Do mesmo alimento do item, **nenhum** (arroz tipo 1 → nem arroz tipo 2 nem parboilizado, mas o arroz integral, que é outro alimento; patinho grelhado → nem patinho assado). De cada outro alimento, **no máximo um**: o que o paciente não recusa, o mais consumido no Brasil (POF 2017-2018, como nas trocas do papel e da fruta, D-421 e D-422) e, empatados, o primeiro na ordem da D-1109 (batata inglesa → arroz tipo 1, não o tipo 1 e o tipo 2; patinho → um pintado e um abadejo, não pintado assado e grelhado nem três abadejos). Na fruta, a variedade é a da fruta (D-422: banana prata não troca por banana nanica, e a lista traz uma manga, não três); o suco e a polpa são outro alimento que a fruta inteira, e o in natura vem antes (D-1131): o suco de laranja troca por uma laranja, e não por outro suco de laranja. Os tipos de queijo, de feijão e de pão, a batata inglesa, a doce e a baroa (CA-2103), os cortes de carne e o leite integral e o desnatado são alimentos diferentes | "Trocar arroz tipo 1 por arroz tipo 2 não é troca" (trocas da folha); o arroz tipo 2 ocupava um dos 6 lugares da lista que abre sozinha. Na rodada 2, a regra media a variedade pela primeira palavra do nome e só para o item: todo queijo era "a mesma variedade" (os 8 queijos da TACO ficaram com 1 ou 2 trocas), a batata baroa sumia da batata inglesa, o patinho ficava com um corte bovino só, e a batata inglesa ainda trazia o arroz tipo 1 e o tipo 2, e o patinho, "Pintado, assado" e "Pintado, grelhado" |
| D-1131 | **Fruta inteira primeiro** (revisão rodada 2, B5). Com "Só do mesmo grupo", fruta inteira só por fruta inteira: o suco e a polpa da fruta ("Laranja, pêra, suco", "Acerola, polpa, congelada") não entram no lugar da fruta inteira; no lugar do suco ou da polpa, entra fruta inteira, suco ou polpa. Na ordem (D-1109, item 4), o suco e a polpa contam como processados: com o filtro desligado, vêm depois do in natura. A regra da peça da D-422 (a troca em unidade, fatia ou pedaço) fica nas trocas da folha, que o paciente lê sozinho; na busca, a nutricionista vê os gramas | "In natura primeiro" (princípio da Mor): o Guia Alimentar para a População Brasileira (Ministério da Saúde, 2ª ed., 2014) prefere a fruta inteira ao suco, que perde a fibra e sacia menos. A banana prata 100 g trazia suco de laranja 360 ml em 2º lugar; na lista que abre sozinha eram 67 casos de suco no lugar de fruta |
| D-1132 | **Café e chá como item** (revisão rodada 2, recomendação 2). Com o item café ou chá (a mesma constante da D-1120), a busca não monta lista, com o filtro ligado ou não, e diz: "Café e chá não têm substituto por nutriente. Escolha em “Adicionar manualmente”." O modo "Adicionar manualmente" (a calculadora) aceita qualquer alimento, café e chá inclusive | A D-1120 corta café e chá dos candidatos; como item, só sobrava troca sem sentido: com a base ampliada, "Coco, água de · 28 ml" no lugar de 100 ml de café; com o filtro desligado, 11 g de feijão. A infusão quase sem nada não é fonte de nutriente (D-193), e trocar café por chá é escolha da nutricionista |
| D-1133 | **O grupo da tabela já diz que a troca é equivalente** (revisão rodada 3, M1; **estreitada na rodada 4 pela D-1136**). Nos grupos de substituição da seção 3 em que a própria lista de equivalentes junta alimentos de macro dominante diferente, a regra (a) da D-1125, o mesmo macro dominante, **não vale**: os **leites e iogurtes** e as **verduras e legumes**; e, entre as **leguminosas**, quando o item ou o candidato é derivado de soja (o tofu). Nos outros grupos (cereais, tubérculos e raízes; pães; cereais do café; as outras leguminosas; carnes; ovos e queijos; frutas; castanhas e sementes) e em "os demais" (o grupo da tabela de composição, o do alimento próprio inclusive), ela vale. A (b), energia na porção entre metade e o dobro, e a (c), pó só no lugar de pó, continuam valendo para todos: são elas que seguram o leite em pó no lugar do copo de leite e o abacate no lugar da banana | Os grupos da seção 3 seguem a lista de equivalentes (Philippi et al., Rev. Nutr. 1999;12(1):65-80): dentro do grupo, a troca já é equivalente. Na TACO, o leite integral, o iogurte natural e o leite de cabra são "de gordura", e o desnatado, o iogurte desnatado, o leite fermentado e a bebida de soja, "de carboidrato": a (a) partia o grupo do leite em dois, e o paciente com intolerância à lactose e leite integral no plano ficava sem nenhum substituto, com a bebida de soja na base e no grupo. Nas verduras, os macros são frações de grama e o dominante é acaso: o agrião ficava sem nenhuma das 50 verduras. Philippi põe a soja com os feijões, embora ela seja de gordura e de proteína, e o tofu (o único derivado de leguminosa de gordura na TACO) ficava sem o tremoço |
| D-1134 | **O mesmo alimento** (revisão rodada 3, M2), para a D-1130. O nome se lê pelas partes entre vírgulas; a primeira é o alimento ("Arroz", "Queijo", "Carne"). Das outras, saem as que dizem só: o **preparo** (cru, cozido, pré-cozido, assado, grelhado, frito, refogado, torrado, ensopado, pochê, sauté, no vapor, "cozido/10minutos", "cozido com sal"); o **estado e a conservação** (congelado, fresco, enlatado, drenado, em conserva, UHT, parboilizado, salgado); o **"tipo N"** (tipo 1, tipo 2); o **"com" ou "sem"** alguma coisa (casca, pele, gordura, sal, semente, ovos); e a **forma do corte** (filé, posta, moído, a porcentagem de magra da carne moída). O que sobra é o alimento: dois nomes com o mesmo resto são o mesmo alimento. Hífen e espaço contam igual ("filé-mignon", "filé mignon", e o "filé mingnon" da TACO). **Na fruta**, o alimento é o nome da fruta (D-422), e o suco e a polpa são outro alimento que ela (D-1131). **Na verdura**, o alimento é o nome da verdura (D-1137). E os **sinônimos óbvios** são o mesmo alimento (D-1137). Assim: "Arroz, tipo 1, cozido", "Arroz, tipo 2, cozido" e "Arroz, parboilizado, cozido" são o mesmo alimento, e "Arroz, integral, cozido", outro; "Pintado, assado" e "Pintado, grelhado", o mesmo; "Queijo, minas, frescal" e "Queijo, ricota", dois; "Batata, inglesa, cozida", "Batata, doce, cozida" e "Batata, baroa, cozida", três; "Feijão, carioca" e "Feijão, preto", dois; "Leite, de vaca, integral" e "Leite, de vaca, desnatado, UHT", dois | "Juntar só o que difere por preparo ou por tipo N": o queijo minas não é variação da ricota, e a batata baroa não é variação da batata inglesa, mas o arroz tipo 2 é variação do tipo 1, e o pintado grelhado, do assado. Pela primeira palavra do nome (rodada 2), "Queijo" juntava todos os queijos e "Batata", as três batatas |
| D-1135 | **A medida do leite, do iogurte e da bebida na busca** (revisão rodada 3, B1). No candidato que sai em ml (leite, bebida, suco, D-378 da `alimentos-e-gramaturas`), a porção vem em **copo** (americano ou grande) ou, sem copo que sirva na meia medida (D-1104), **só em ml**: nunca o copo de requeijão nem a xícara. No iogurte (o grupo dos leites, em gramas), vale qualquer medida da base menos o copo de requeijão. E a bebida de soja ("Soja, extrato solúvel, natural, fluido") passa a sair em ml, como os outros leites (D-378), em todo o app; o leite semidesnatado da base ampliada já saía em ml (o arquivo da base o marca como líquido), e o nome dele entra na regra só para valer também fora da base (revisão rodada 4, recomendação 2) | "Leite, de cabra · meio copo de requeijão · 120 ml" aparecia no lugar de 1 copo americano de leite: a medida era a da conta redonda, não a de costume. O copo de requeijão é a embalagem do requeijão; leite se bebe no copo americano. Sem o copo de requeijão, a conta redonda pedia "2 xícaras de café e meia" de leite. E a bebida de soja saía em gramas ("305 g") ao lado do leite em ml |
| D-1136 | **O macro dominante volta fora do leite e das verduras** (revisão rodada 4, M1). A dispensa da regra (a) (D-1133) vale só nos dois grupos em que a própria lista de equivalentes junta macros diferentes, os **leites e iogurtes** (o integral, de gordura, com o desnatado e a bebida de soja, de carboidrato) e as **verduras e legumes** (macros em frações de grama), e no **derivado de soja** entre as leguminosas (o tofu, de gordura, com o tremoço). Nas **carnes, aves e peixes**, nos **ovos e queijos**, nas **castanhas, sementes e amendoim**, nos **cereais, tubérculos e raízes**, nos pães, nos cereais do café, nas outras **leguminosas**, nas **frutas** e em "os demais", o candidato tem o mesmo macro dominante do item. A (b) e a (c) continuam para todos. E, **nas carnes, aves e peixes**, a porção do candidato não passa de **1,5 vez a proteína** da porção do item (regra **(d)** da D-1125): a proteína é o nutriente do grupo, e a carne gorda buscada pela gordura não troca por uma porção de carne com muito mais proteína. A 1,5 vez é a tolerância desta busca, como a de metade ao dobro da energia | Sem a regra (a), a lista que abre sozinha do cupim assado 100 g (gordura) trazia, nos 6 primeiros, patinho 300 g (1,99 vez a energia e 107,7 g de proteína contra 28,6 g), acém, sobrecoxa, alcatra, pernil e picanha sem gordura; a castanha-do-pará abria com a pupunha (um fruto de amido), e o maracujá trazia o tucumã (um fruto de gordura). A regra da energia, de metade ao dobro, deixa passar essas porções: a gordura bate, mas a energia e a proteína não, e isso não é troca equivalente. Em 10cabdd8, com a regra (a) em todos os grupos, nenhum desses casos acontecia; 45 itens das carnes e 9 das castanhas passaram a ter um candidato de outro macro nos 6 primeiros. Com a (a) de volta, ainda sobrava, no lugar do cupim 100 g, "contra-filé com gordura, 1 bife e meio, 150 g": também de gordura, mas com 1,7 vez a proteína; a (d) corta 11 listas de carne gorda nesse ponto e não deixa nenhuma vazia. No grupo das carnes e ovos da lista de equivalentes, o grupo é o da proteína (Philippi et al., Rev. Nutr. 1999;12(1):65-80) |
| D-1137 | **O mesmo alimento, na verdura e nos sinônimos** (revisão rodada 4, B1), para a D-1134. **Na verdura** (o grupo `verdura` da seção 3), o alimento é o nome da verdura, como na fruta (D-422): "Alface, crespa", "Alface, lisa", "Alface, americana" e "Alface, roxa" são o mesmo alimento, e também os tomates e as abóboras; "Couve, manteiga" e "Couve-flor" são dois. **Sinônimos óbvios**: "Mexerica" e "Tangerina" são a mesma fruta; "Soja, queijo (tofu)" da TACO e o "Tofu" da base ampliada, o mesmo alimento. Assim, o alimento da base ampliada que tem o mesmo nome do da tabela (o tofu) conta como o mesmo | "Trocar arroz tipo 1 por tipo 2 não é troca" (D-1130) vale também para a alface: a alface crespa abria com a alface lisa no 1º lugar; a banana trazia a tangerina e a mexerica, que são a mesma fruta; e o tofu da TACO trocava pelo tofu da base ampliada |
| D-1138 | **A farinha de mandioca é do grupo dos cereais, tubérculos e raízes** (revisão rodada 4, B2). "Farinha, de mandioca, crua" e "Farinha, de mandioca, torrada" entram no grupo `amido` da seção 3, prontas para comer (a farinha crua da TACO é a farinha d'água, que se come sem cozinhar): trocam com o arroz, a mandioca e o cuscuz prontos, e não com o cereal cru. Elas continuam o mesmo alimento entre si (D-1134). A farinha de puba e a de milho ficam fora: vão a preparações (bolo, cuscuz, farofa) | Na lista de equivalentes (Philippi et al., Rev. Nutr. 1999;12(1):65-80), a farinha de mandioca está no grupo do arroz, do pão e da mandioca. Na TACO ela fica em "Verduras, hortaliças e derivados", que a troca não trata como verdura (CA-671); por isso caía em "os demais", onde nada equivale, e a farinha, que é da cultura alimentar do Norte e do Nordeste, ficava sem nenhum substituto na lista que abre sozinha |

**Para a Mor (revisão de 03/11/2026, corrigida na rodada 2):** a D-1121 muda as trocas da folha impressa em 12
alimentos: almeirão, nabo e repolho crus passam a oferecer folha de mostarda; atemóia e banana pacova, caqui
"chocolate" (é fruta); e baião de dois, bolinho de arroz, charuto de repolho, cuscuz paulista, feijão tropeiro, tapioca
com manteiga e yakisoba, macarrão à bolonhesa (prato pronto por prato pronto; a tapioca já trocava por yakisoba). A
batata-doce deixou de ser cortada, mas não aparece em nenhuma folha. Doces, goiabada, marmelada, mel e chocolate continuam
fora.

**Para a Mor (rodada 2):** na busca de substitutos, com "Só do mesmo grupo" ligado, a troca agora é equivalente: o mesmo
macro dominante, a energia entre metade e o dobro e o pó só no lugar de pó (D-1125). Somem o leite em pó desnatado no
lugar do leite e do iogurte, o abacate no lugar da banana, a castanha no lugar do pinhão, o queijo no lugar da clara e
da gema (D-1108), o arroz tipo 2 no lugar do tipo 1 (D-1130) e o suco no lugar da fruta inteira (D-1131). Quando o
item é café ou chá, a busca não monta lista e manda para "Adicionar manualmente", onde a nutricionista escolhe a troca (D-1132).

**Para a Mor (rodada 3):** a regra da rodada 2 ficou rígida e foi afrouxada onde o grupo já garante a troca (D-1133): no
mesmo grupo voltam o leite integral ↔ o desnatado ↔ a bebida de soja ↔ o iogurte (e a bebida de soja para quem tem
intolerância à lactose), as verduras no lugar do agrião e o tremoço no lugar do tofu. O leite em pó e o abacate continuam
fora. A variedade passa a contar o alimento, e não a primeira palavra (D-1130, D-1134): os queijos voltam a trocar entre
si, a batata baroa volta à batata inglesa e os cortes de carne voltam ao patinho; e cada alimento aparece uma vez só
(o arroz tipo 1 ou o tipo 2, um pintado, uma manga). O leite e a bebida vêm em copo ou em ml (D-1135). Para olhar: no
lugar de 1 ovo inteiro, a lista traz os queijos, e "requeijão, 2 colheres de chá e meia" é equivalente, mas é troca
fraca; e, no lugar da maçã, "tamarindo, 3 unidades e meia" também.

**Para a Mor (rodada 4):** a rodada 3 tirou o macro dominante de todos os grupos, e a carne gorda passou a trocar por
carne magra (cupim por 3 bifes de patinho) e a castanha pela pupunha. Agora o macro dominante só não vale no leite e no
iogurte, nas verduras e no tofu (D-1136): o leite integral continua trocando com o desnatado e a bebida de soja, e a
carne gorda volta a trocar por carne gorda. A alface não troca por outra alface, nem a banana pela tangerina e pela
mexerica juntas (D-1137). A farinha de mandioca entra no grupo do arroz e da mandioca (D-1138). Para olhar: no lugar do
feijão carioca, 5 dos 6 primeiros são feijões, e o grão-de-bico (da base ampliada) fica em 9º; a aveia em flocos continua
sem substituto no mesmo grupo.

## 3. Grupos de substituição (D-1108)

| Grupo | Nome na tela | Quem entra |
|---|---|---|
| `amido` | cereais, tubérculos e raízes | O papel "acompanhamento" das trocas (arroz, macarrão, cuscuz de milho, polenta, batatas, mandioca, cará) e, da base ampliada, macarrão cozido, arroz parboilizado, quinoa, inhame, milho verde e batata assada; a farinha de mandioca, crua e torrada, pronta para comer (D-1138) |
| `pao` | pães e torradas | O papel "pão" das trocas |
| `cereal-do-cafe` | cereais do café | O papel "cereal do café" das trocas (aveia, cereal matinal, flocos) |
| `leguminosa` | leguminosas | Leguminosas e derivados, menos amendoim, paçoca, pé-de-moleque e extrato de soja |
| `carne` | carnes, aves e peixes | Carnes e derivados; Pescados e frutos do mar |
| `ovo-queijo` | ovos e queijos | Ovos e derivados; os queijos de Leite e derivados (o queijo só troca com o ovo inteiro) |
| `leite` | leites e iogurtes | Leite e derivados sem os queijos; extrato de soja |
| `fruta` | frutas | Frutas e derivados (a fruta inteira só por fruta inteira, D-1131) |
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
  dado um candidato cuja porção daria menos de 5 g, mais de 600 g ou mais de 4 unidades ou pedaços, **contando a
  porção final, na meia medida**, então ele não aparece (mamão 620 g, frango 630 g, leite em pó 4,5 g, melão 660 g).

### Filtros, restrições e grupos

- **CA-2108** (D-1106, D-1120) · Dada qualquer busca, então nenhum candidato é frito, fígado, bebida alcoólica, doce,
  embutido, ingrediente cru, café, chá, mel ou outro produto açucarado, ultraprocessado (com o original não
  ultraprocessado) ou prato composto (com o original simples).
- **CA-2109** (D-1107) · Dado um paciente com alergia a leite, quando busco substituto do ovo cozido por proteína no
  mesmo grupo, então nenhum queijo aparece; dado que o paciente não gosta de um candidato, então ele aparece por último.
- **CA-2110** (D-1107) · Dado que a restrição tirou todos os candidatos, então a frase é "Nenhum substituto com esses
  nutrientes dentro das restrições do paciente. Tire um nutriente, desligue “Só do mesmo grupo” ou adicione
  manualmente."
- **CA-2111** (D-1108) · Dado arroz e "Só do mesmo grupo" ligado, então o filtro diz "Só do mesmo grupo: cereais,
  tubérculos e raízes" e nenhuma fruta aparece; desligado, aparecem alimentos de outros grupos.
- **CA-2112** (D-1108) · Dado ovo inteiro cozido no mesmo grupo, então nenhuma gema ou clara aparece, e algum queijo pode
  aparecer; dado clara ou gema no mesmo grupo, então nenhum queijo aparece; dado um queijo no mesmo grupo, então nenhuma
  clara ou gema aparece; dado brócolis cozido no mesmo grupo, então nenhuma verdura crua aparece.
- **CA-2113** (D-1102) · Dado um alimento da base ampliada marcado `sugerivel`, então ele pode aparecer (macarrão
  cozido no lugar do arroz); dado um da base ampliada não sugerível, não; dado um alimento próprio com "Pode aparecer
  no Cobrir e nas trocas" ligado, então ele pode aparecer; desligado, não.

### Ordem, seleção e mensagens

- **CA-2114** (D-1109) · Dado arroz, "Carboidratos" e o filtro desligado, então a polenta (com medida caseira) vem antes
  da melancia em gramas; dado um candidato pouco usual, então ele vem depois dos comuns; e a busca devolve no máximo 20,
  a tela mostra 6 e "Mostrar mais N", que vira "Mostrar menos".
- **CA-2115** (D-1110, D-1126) · Dado o painel, quando escolho "Cálcio" em "Outro nutriente" e clico em "Adicionar" (ou
  aperto Enter na lista), então ele entra em "Nutrientes selecionados"; quando clico em "Tirar Cálcio", ele sai; os chips de macro alternam; sem nenhum nutriente, "Buscar
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
  abaixo disso, é uma gaveta; em 360, 390, 768 e 1440 px nada rola para o lado, e no toque os alvos têm 44 px, medidos
  com a gaveta parada (depois da animação de subida: no meio dela, a medida do navegador sai com erro de arredondamento,
  43,99997 px, revisão rodada 4, recomendação 1).
- **CA-2127** (D-1117) · Dada a base ampliada carregando, então o painel diz "Parte da base ainda está carregando; a
  lista pode crescer." e a lista se refaz quando ela chega.

### Correções da revisão independente (03/11/2026)

- **CA-2128** (D-1120) · Dado arroz por proteína, batata inglesa ou banana por potássio, ou polenta por proteína, com o
  filtro desligado (e também na gestante), então nenhum candidato é café ou chá; e nenhum é do grupo "Produtos
  açucarados" (mel, chocolate).
- **CA-2129** (D-1121) · Dada a regra da troca razoável, então batata-doce, caqui "chocolate", folha de mostarda e
  macarrão à bolonhesa não são cortados por ela, e doce de leite, doce de abóbora, goiabada, marmelada e chocolate
  meio amargo continuam cortados; na folha de verdade (`TROCAS_PEDIDAS_PELA_FOLHA` trocas pedidas, `TROCAS_NA_FOLHA`
  mostradas, sem restrição, de 30 a 400 g), o almeirão cru oferece a folha de mostarda, a atemóia oferece o caqui
  "chocolate" e a tapioca com manteiga oferece o macarrão à bolonhesa, e nenhum acompanhamento oferece a batata-doce; e a
  busca da banana por carboidrato, no mesmo grupo, pode trazer o caqui "chocolate".
- **CA-2130** (D-1122) · Dado um plano cuja única coisa da base ampliada é a opção de um item, então ele espera a base
  para abrir; e dada essa opção sem a base registrada, então a folha, o link e o Word ainda a mostram, pela cópia do
  nome.
- **CA-2131** (D-1123) · Dado um alimento próprio que só aparece como opção de um item, então ele conta em "planos que
  usam este alimento".
- **CA-2132** (D-1114) · Quando clico em "Adicionar como opção", então o botão vira "Já é opção" e o foco continua nele.
- **CA-2133** (D-1116) · Na gaveta, quando aperto Esc dentro de um campo, então a gaveta continua aberta; ao lado, o foco
  volta ao "⇄" do item depois de "Fechar substitutos" e de "Substituir" (também pela janela Comparar).
- **CA-2134** (D-1124) · Dado o próprio alimento do item escolhido na calculadora, então "Substituir" fica desligado no
  resultado e na janela Comparar, e o botão de opção diz "É o mesmo alimento".
- **CA-2135** (D-1109) · Dado um candidato a menos de 5 pontos de proximidade do melhor, então ele está na primeira
  faixa, mesmo que os dois caiam em lados diferentes de um múltiplo de 5.

### Correções da revisão independente, rodada 2 (04/11/2026)

- **CA-2136** (D-1125) · Dado qualquer alimento da TACO e da base ampliada como item, com "Só do mesmo grupo", 1 ou 2
  nutrientes e porções de todo dia, então todo candidato tem o mesmo macro dominante do item (menos nos leites e iogurtes,
  nas verduras e legumes e no derivado de soja entre as leguminosas, D-1133 e D-1136), nas carnes a proteína até 1,5 vez a
  do item (D-1136), energia na porção entre metade e o dobro da do item (quando o item tem mais de 4
  kcal em 100 g) e só é pó ou desidratado se o item também for;
  e, na lista que abre sozinha, não aparecem leite em pó no lugar de 100 ou 150 ml de leite integral nem de 100 ou 170 g
  de iogurte natural, abacate no lugar de 100 g de banana prata, castanha no lugar do pinhão nem requeijão no lugar da
  clara.
- **CA-2137** (D-1125) · Dado um item com até 4 kcal em 100 g ou sem energia na tabela, então a regra da energia não vale
  (e, fora dos grupos da seção 3, o macro dominante basta); dado um item desidratado (ameixa seca), então outro desidratado (uva-passa, damasco seco) pode
  aparecer; e, com o filtro desligado, as três regras não valem.
- **CA-2138** (D-1126) · Dado o foco na lista "Outro nutriente", quando aperto a seta três vezes, então nenhum nutriente
  entra em "Nutrientes selecionados"; quando escolho "Cálcio" e aperto Enter, ou clico em "Adicionar", então ele entra, e
  a lista volta a "Outro nutriente" com o foco nela; sem nada escolhido, "Adicionar" fica desligado.
- **CA-2139** (D-1108) · Dada a clara cozida, 100 g, por proteína, ou a gema cozida, 100 g, por lipídeos, no mesmo grupo,
  então nenhum queijo aparece; dado um queijo, então nenhuma clara ou gema aparece; dado o ovo inteiro, então o queijo
  pode aparecer, e no lugar do queijo, o ovo inteiro.
- **CA-2140** (D-1127) · Dado um alimento próprio com "Pode aparecer no Cobrir e nas trocas" ligado chamado "Batata doce
  cozida", "Batata-doce cozida", "Iogurte natural integral zero açúcar", "Pão 7 grãos zero açúcar", "Macarrão à
  bolonhesa", "Folha de mostarda refogada" ou "Caqui chocolate", então ele é troca razoável e pode aparecer na busca; dado
  "Doce de leite", "Bolo de cenoura", "Iogurte com açúcar" ou "Açúcar mascavo", então ele continua cortado.
- **CA-2141** (D-1128) · Quando clico em "Tirar Proteínas" com Carboidratos e Proteínas selecionados, então o foco vai a
  "Tirar Carboidratos"; quando tiro o último nutriente, então o foco vai à lista "Outro nutriente"; quando clico em
  "Tirar" a única opção do item, então o foco vai ao "Buscar substitutos" do item; com duas opções, quando tiro a primeira,
  o foco vai ao "Tirar" da que ficou.
- **CA-2142** (D-1129) · Dadas 2 opções no item, então cada botão de opção desligado tem um nome diferente, com o alimento
  dele ("Já tem 2 opções: {alimento}", "Já é opção: {alimento}"), e o texto na tela continua "Já tem 2 opções".
- **CA-2143** (D-1130) · Dado arroz tipo 1 cozido, com o filtro ligado ou desligado, então o arroz tipo 2 e o arroz
  parboilizado não aparecem e o arroz integral aparece; dado feijão carioca cozido por proteína e carboidrato, então o
  feijão preto aparece, e cada feijão aparece uma vez só; dado banana prata, então nenhuma outra banana aparece.
- **CA-2144** (D-1131) · Dada banana prata 100 g ou mamão papaia 150 g, no mesmo grupo, então nenhum suco nem polpa
  aparece; dado o suco de laranja, no mesmo grupo, então a laranja inteira pode aparecer; e, com o filtro desligado, o
  suco vem depois do in natura da mesma faixa de proximidade.
- **CA-2145** (D-1132) · Dado café ou chá como item, com o filtro ligado ou desligado, então a busca diz "Café e chá não têm
  substituto por nutriente. Escolha em “Adicionar manualmente”." e não mostra lista; e, em "Adicionar manualmente", o
  substituto escolhido ganha a porção equivalente.

### Correções da revisão independente, rodada 3 (04/11/2026)

- **CA-2146** (D-1133) · Dado leite integral 150 ml no mesmo grupo, então a bebida de soja e o iogurte natural aparecem
  por lipídeos, e o leite desnatado aparece por proteína e por carboidrato; dado leite desnatado 200 ml por carboidrato,
  então o leite integral aparece; dado um paciente com intolerância à lactose e leite integral 150 ml (por lipídeos,
  proteína ou carboidrato) ou iogurte natural 170 g (por lipídeos), então a bebida de soja aparece; dado agrião cru 100 g
  por proteína, então aparecem verduras; dado tofu 100 g por lipídeos, então o tremoço aparece; e, no mesmo grupo, o leite
  em pó continua fora do lugar do leite e do iogurte, e o abacate, do lugar da banana; e, fora dos grupos da seção 3 (os
  pratos prontos), o macro dominante continua valendo.
- **CA-2147** (D-1130, D-1134) · Dado queijo minas frescal 30 g ou 100 g, no mesmo grupo, então aparecem pelo menos 3
  outros queijos, e cada queijo da TACO que se prescreve, em 30 g, tem pelo menos 2 outros queijos; dada batata inglesa
  cozida 150 g, então a batata-doce
  e a batata baroa aparecem, e o arroz tipo 1 e o tipo 2 não aparecem juntos; dado patinho grelhado 100 g por proteína,
  então aparece mais de um outro corte bovino, e nenhum alimento aparece duas vezes (pintado assado e grelhado, dois
  abadejos); e, em toda busca, nenhum candidato é o mesmo alimento do item, nem o mesmo alimento de outro candidato.
- **CA-2148** (D-1134) · Dados "Arroz, tipo 1, cozido", "Arroz, tipo 2, cozido" e "Arroz, parboilizado, cozido", então são
  o mesmo alimento; e também "Alface, crespa, crua", "Alface, lisa, crua" e "Alface, americana, crua" (D-1137);
  "Mexerica, Rio, crua" e "Tangerina, Poncã, crua"; "Soja, queijo (tofu)" e o tofu da base ampliada; "Pintado, assado" e "Pintado, grelhado"; os três abadejos; "Carne, bovina, filé mingnon, sem
  gordura, grelhado" e "Carne, bovina, filé-mignon, sem gordura, assado"; "Frango, peito, sem pele, grelhado" e "Frango,
  peito, com pele, assado"; "Ovo, de galinha, inteiro, cozido/10minutos" e "Ovo, de galinha, inteiro, pochê"; e "Banana,
  prata, crua" e "Banana, nanica, crua" (D-422). E não são o mesmo alimento: "Arroz, integral, cozido" e o arroz tipo 1;
  "Queijo, minas, frescal" e "Queijo, ricota"; "Couve, manteiga, crua" e "Couve-flor, crua"; as batatas inglesa, doce e baroa; o patinho e a alcatra; o feijão carioca e
  o preto; o leite integral e o desnatado; e "Laranja, pêra, suco" e "Laranja, pêra, crua".
- **CA-2149** (D-1135) · Dada qualquer busca da TACO e da base ampliada, no mesmo grupo ou não, então todo candidato em ml
  tem medida de copo (americano ou grande) ou nenhuma, e nenhum candidato do grupo dos leites tem "copo de requeijão"; dado
  leite integral 150 ml no mesmo grupo, por lipídeos, então nenhum candidato diz "copo de requeijão" nem "xícara"; e a
  bebida de soja e o leite semidesnatado saem em ml.

### Correções da revisão independente, rodada 4 (10/11/2026)

- **CA-2150** (D-1136) · Dado cupim assado, picanha com gordura, costela bovina assada, sobrecoxa com pele ou salmão
  grelhado, 100 g, ou castanha-do-pará 15 g, castanha de caju 20 g ou amendoim 30 g, na vista padrão (o macro dominante
  marcado, "Só do mesmo grupo"), então os 6 primeiros têm o mesmo macro dominante do item; e, no cupim assado 100 g,
  nenhum dos 6 passa de 1,5 vez a proteína dele; e, em toda a TACO, nenhum item das carnes e das castanhas tem, nos 6
  primeiros, um candidato de outro macro dominante; e o leite integral continua trocando com a bebida de soja e com o
  desnatado, o agrião com as verduras e o tofu com o tremoço (CA-2146).
- **CA-2151** (D-1137) · Dada alface crespa 50 g no mesmo grupo, então nenhuma outra alface aparece; dada banana prata
  100 g, então mexerica e tangerina não aparecem as duas; dado "Soja, queijo (tofu)" 100 g, com a base ampliada, então
  nenhum outro tofu aparece.
- **CA-2152** (D-1138) · Dada farinha de mandioca torrada 20 g ou crua 30 g, na vista padrão, então o grupo é "cereais,
  tubérculos e raízes" e aparecem substitutos prontos do grupo (arroz, mandioca, cuscuz), e nenhuma é a outra farinha de
  mandioca.

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
- **CB-1110** (base que não chegou) · A opção da base ampliada montada na folha, no link ou no Word sem a base sai pela
  cópia do nome, em gramas (D-1122); sem cópia (opção gravada antes dela), some, como o item excluído.
- **CB-1111** (dado faltando) · Com a regra da energia valendo (D-1125, b), o candidato sem energia na tabela não entra:
  não dá para dizer que a troca é equivalente.
- **CB-1109** (tempo) · A busca é local e roda sobre a lista inteira (cerca de 700 alimentos) a cada mudança dos
  nutrientes buscados ou dos gramas, sem travar a digitação (memorizada pelos parâmetros).

## 6. Fora de escopo

- "Carregar favoritos" do Dietbox (os Modelos de plano já cobrem parte).
- O catálogo de marcas direto na busca, a Tucunduva e a TBCA (D-1102).
- Busca para os itens das abas Substituto 1 e 2 e para receitas.
- A opção na lista de compras, nas missões e nas trocas automáticas da folha.
- **Próxima melhoria** (revisão rodada 4, recomendação 3): as trocas da folha (`trocas.ts`) ainda medem a variedade pela
  primeira palavra do nome ("Queijo", "Batata", "Feijão"); a busca mede pela D-1134. Levar a D-1134 à folha, junto com a
  "ervilha → bebida de soja" das trocas da folha (4ª troca, que a folha não imprime), muda a folha impressa e pede a
  revisão da Mor.
- Mudar a calculadora de hoje além das ações (D-1101).
- **Próxima melhoria** (revisão rodada 2, recomendação 3): separar os pratos prontos de café da manhã dos de almoço. O
  grupo "Alimentos preparados" da TACO mistura os dois (tapioca troca por yakisoba e, desde a D-1121, por macarrão à
  bolonhesa); isso é anterior a este ramo e pede o tipo da refeição na troca.
