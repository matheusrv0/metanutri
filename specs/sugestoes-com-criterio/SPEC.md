# SPEC — Sugestões com critério: o MetaNutri só propõe o que se prescreve

Status: **pedida pelo dono em 15/10/2026; aprovação pelas telas antes de publicar.** A estudante de nutrição revisa os
Apêndices A e C antes da publicação.

**Rodada de revisão (15/10/2026, à tarde).** A revisão da frente achou furos de classificação (fruta "calda" sem o "em",
pó doce e sal com a chave ligada, pó fortificado, pratos com charque ou miúdos) e testes que conferiam a regra com ela
mesma. O coordenador decidiu ainda: versão crua de alimento que se come cozido não é proposta, troca de ovo e de verdura
cozida respeita a forma, porção máxima por grupo calórico no cobrir, e os itens "talvez rígidos demais" ficam fora mas
vão para o Apêndice C. As mudanças estão nas decisões e critérios marcados com *(revisão)* e na seção 7.

**Conduta da nutricionista parceira (20/10/2026).** A parceira respondeu aos Apêndices A e C. Voltaram a ser
propostos os 20 itens do Apêndice C.2; saíram tapioca com manteiga, pão de queijo assado, pipoca com óleo e cream
cracker; gordura trans virou "nunca"; e as trocas passaram a ser simples, realistas e in natura primeiro. As decisões
estão na spec `conduta-da-nutricionista` (D-290 a D-296), que substitui as linhas desta spec que tratam desses itens.
Os Apêndices A e C abaixo foram atualizados em 20/10/2026.

**Fonte:** a conversa de 15/10/2026: "Você tem que ter a consciência do que você está sugerindo nas coisas do MetaNutri.
Não é para sugerir tudo só por cobrir os macros e micros. (...) você está numa plataforma de dieta, de prescrições, e eu
vi que você colocou para sugerir cerveja Pilsen. Que não tem o menor sentido."

**Specs lidas antes:** `planejador-metanutri` (CA-34 a CA-40, CA-36a, D-5, CB-06), `prescricao-rapida-e-base` (CA-82,
CA-83), `ajustes-de-uso` (D-35, D-36, listas por refeição) e `pdf-e-telas-limpas` (trocas na folha do paciente).

## 1. Onde o MetaNutri propõe alimento sozinho

| Lugar | Código | O que propõe | Nesta spec |
|---|---|---|---|
| Cobrir | `src/domain/cobrir.ts` | até 5 alimentos da base para fechar a falta de um micronutriente | passa pela regra |
| Trocas da folha do paciente | `src/domain/trocas.ts` | até 3 trocas por alimento do plano (2 na folha) | passa pela regra |
| Sugestões por refeição | `src/domain/sugestoes.ts` (`SUGESTOES_PADRAO`) | lista fixa escrita à mão (D-36) | não muda; um teste garante que todo item passa na regra |
| Plano de exemplo | `src/domain/exemplo.ts` | um dia montado como uma nutricionista montaria | não muda (D-196) |
| Vitrine da página inicial | `src/domain/vitrine.ts` | 5 itens fixos de cálcio | texto fixo de propaganda; os 5 são alimentos de rotina, mas não é o que o cobrir devolve hoje (fora de escopo) |
| Missões e lista de compras | `missoes.ts`, folha do paciente | derivam do plano | não propõem alimento novo |
| Busca, entrada rápida, substituto e edição das listas | `busca.ts`, `DialogoSubstituto`, `DialogoSugestoes` | escolha da nutricionista | nunca filtrados (D-190) |

Hoje o cobrir só tira Miscelâneas, pó, farinha e a versão crua de carne, peixe, ovo, leguminosa e cereal (CA-36a). Com o
plano de exemplo, ele sugeria "Cerveja, pilsen 2" para a piridoxina, "Bebida isotônica" para o ferro e "Caldo de carne,
tablete" para o sódio. As trocas ofereciam cerveja no lugar de refrigerante e ovo frito no lugar de ovo cozido.

## 2. Decisões

| # | Decisão | Substitui |
|---|---|---|
| D-190 | **Uma regra só, "prescritível"**, em `src/domain/prescritivel.ts`, decide o que o MetaNutri pode propor sozinho. Vale para o cobrir e para as trocas, e confere as listas fixas. A escolha manual nunca passa por ela: pela busca, qualquer alimento da base entra no plano | O filtro `ehSugerivel` do cobrir |
| D-191 | **Três níveis.** *Nunca*: bebida alcoólica e, *(revisão)*, sal, shoyu, tempero pronto e fermento, em nenhum modo. *Fora da rotina*: refrigerante, isotônico ou bebida adoçada (inclui capuccino em pó); doce, açúcar ou fruta em calda, com ou sem o "em" no nome (inclui gelatina em pó); óleo ou gordura de adição; embutido, carne processada ou curada; *(revisão)* prato com embutido, toucinho, carne curada ou miúdos; fritura; ultraprocessado, salgadinho ou petisco em conserva (inclui, *(revisão)*, pó e farinha fortificados: mingau tradicional, creme de milho e farinha de arroz enriquecida). *Forma de ingrediente*: o que já era o CA-36a, mais fécula e polvilho, tempero, molho, suco concentrado e a versão crua do que se come cozido (D-199a). A chave "Incluir ingredientes e alimentos crus" libera só o terceiro nível, como o nome dela já diz | CA-36a, que excluía só a forma de ingrediente (o CA-36a ganhou nota de substituído) |
| D-192 | **Casos de borda** decididos com o bom senso clínico da seção 2.1. Cada alimento fora da regra está no Apêndice A com o nível e o motivo | A exceção da farinha láctea no CA-36a |
| D-193 | **O cobrir não usa café nem chá como fonte**, em nenhuma forma (*(revisão)*: nem café em pó com a chave ligada; vale todo alimento cujo nome começa por "Café," ou "Chá,"). Os dois continuam prescritíveis (aparecem na lista do desjejum e nas trocas de bebida), mas infusão sem caloria passa na frente de qualquer alimento pelo critério de kcal, e a TACO traz para chá valores de B1 e B2 que não se sustentam (3 mg de tiamina em 100 ml de chá preto) | — |
| D-194 | **Trocas.** Nenhuma troca oferecida é item fora da regra, de nenhum nível; a chave do cobrir não vale aqui. Item fora da rotina posto à mão no plano ganha trocas só entre os prescritíveis do mesmo grupo e com o mesmo macro dominante e, *(revisão)*, prefere o mesmo alimento em outro preparo: ovo frito troca por ovo cozido; batata frita por outra batata inglesa (a ordem por porção parecida escolhe entre cozida e sauté). Se não sobra nenhum (margarina, doce de leite), ele fica sem trocas. Bebida alcoólica no plano nunca ganha troca. *(revisão)* Ovo inteiro só troca por outra forma de ovo inteiro (nunca gema ou clara), e verdura cozida só troca por verdura cozida. *(re-revisão)* Pão de queijo, farinha, farofa, nhoque, fécula e polvilho não contam como verdura, e corte magro e ave sem pele vêm antes de corte gordo e ave com pele, como no cobrir | O filtro `ehSugerivel` das trocas |
| D-195 | **Quando nada de rotina cobre a falta**, o cobrir diz: "Nenhum alimento de rotina cobre ao menos 10% da falta em até {porção} g. Pela busca do plano, qualquer alimento entra." | "Nenhum alimento da base cobre ao menos 10% da falta em até {porção} g." |
| D-196 | **O plano de exemplo, as listas por refeição e a vitrine não mudam.** O exemplo é um plano escrito à mão, como a nutricionista escreveria, e os 5 g de margarina no pão são prescrição comum. *(revisão)* O "Macarrão, trigo, cru" do substituto 1 do almoço também fica: a TACO só traz o macarrão cru, e 90 g de macarrão seco é como a nutricionista escreve a porção. As listas passam na regra | — |
| D-197 | **A ordem do cobrir continua a mesma**: uso comum primeiro, depois menos kcal por parte da falta coberta, e um grupo por vez (CA-35, CA-36, CA-82). Jurubeba e jamelão, frutas que só uma região conhece, entram na lista de pouco usual. *(revisão)* Saem dela "miolo de alcatra" (corte magro e comum, que o padrão "miolo" pegava) e linhaça (prescrição frequente). Entre os de uso comum, corte magro e ave sem pele vêm antes de corte gordo e ave com pele (D-199b) | — |
| D-198 | **A regra é por nome e categoria da TACO.** Alimento novo na base sem regra que o pegue entra como prescritível; *(revisão)* um teste guarda a lista fixa de ids excluídos por motivo e acusa qualquer mudança da base. A descrição é limpa antes de comparar (espaço nas pontas e espaço repetido não contam) | — |
| D-199 | *(revisão)* **a) Versão crua de verdura ou fruta que se come cozida só não é proposta quando a base tem a versão cozida do mesmo alimento** *(esclarecido pelo coordenador na re-revisão)*: saem batata, batata-doce, batata-baroa, mandioca, cará, berinjela, chuchu, abóbora cabotian e moranga e massa de pão de queijo crus. O que a base só traz cru fica (inhame, vagem, taioba, fruta-pão, jiló, broto de feijão, caruru, quiabo, pequi, abóbora menina e pescoço): a folha impressa já marca a porção como "(peso cru)". Peixe cru ou "fresco" sem preparo segue a regra antiga de carne, peixe, ovo, leguminosa e cereal crus, que saem sempre. **b) Porção máxima por grupo no cobrir** (seção 7.1), tirada das medidas caseiras da POF quando existem, e nunca acima da porção máxima que a pessoa escolheu. **c) Os itens "talvez rígidos demais"** (azeite, mel, chocolate meio amargo, leite fermentado, charque e carne seca, azeitona, ovo frito, feijoada) continuam fora por padrão e vão para o Apêndice C, como decisão do dono e da estudante. **d) O sódio não se cobre com alimento**: o cobrir do sódio não devolve sugestão e diz "O sódio não se cobre com alimento: o sal de cozinha e os temperos já completam o dia." O botão do sódio sai da tela na frente `painel-lateral-enxuto`; aqui só o domínio muda | A tabela 2.1 nos itens marcados; para o sódio, o CA-34 a CA-39 (o cobrir valia para todo micronutriente abaixo da meta) |

### 2.1 Casos de borda

| Alimento | Decisão | Por quê |
|---|---|---|
| Café e chás (infusão) | prescritível; o cobrir não usa como fonte | D-193 |
| Água de coco | prescritível | bebida natural de rotina |
| Suco natural de laranja, tangerina e limão | prescritível | é como se prescreve fruta em suco |
| Suco concentrado envasado (caju, maracujá, uva) | forma de ingrediente | precisa diluir; 100 g de concentrado não é porção |
| Caldo de cana | fora da rotina (bebida adoçada) | quase só sacarose, sem fibra |
| Bebida láctea, leite fermentado e leite achocolatado | fora da rotina (bebida adoçada) | açúcar adicionado; leite e iogurte natural cobrem o mesmo |
| Iogurte com sabor e petit suisse | fora da rotina (doce) | açúcar adicionado; o iogurte natural fica |
| Requeijão cremoso e queijo pasteurizado | prescritível | uso comum no café da manhã, em porção pequena |
| Cuscuz de milho e cuscuz paulista | prescritível | prato do dia a dia |
| Tapioca com manteiga | prescritível | é a única tapioca da base e o jeito comum de comer; já está na lista do desjejum |
| Pão de queijo | assado é prescritível; cru é forma de ingrediente | a massa crua não se come |
| Feijoada, feijão tropeiro, virado à paulista, arroz carreteiro e, *(revisão)*, maniçoba, barreado, baião de dois, dobradinha e sarapatel | fora da rotina (prato com embutido, toucinho, carne curada ou miúdos) | levam linguiça, toucinho, bacon, paio, charque ou miúdos; a feijoada e o baião vão para o Apêndice C |
| Charque e carne seca | fora da rotina (carne curada) | carne salgada; entra na conta de carne processada |
| Bacalhau salgado refogado | prescritível | peixe dessalgado antes do preparo |
| Sardinha e atum em óleo | prescritível | prescrição comum e barata; escorrer o óleo é orientação |
| Azeite de oliva e os demais óleos | fora da rotina (gordura de adição) | entra à mão, em colher; nenhum motor automático sabe a porção de gordura de adição |
| Salada de legumes com maionese e salpicão | fora da rotina (gordura de adição) | a salada no vapor cobre o mesmo |
| Azeitona e tremoço em conserva | fora da rotina (petisco em conserva) | petisco salgado; a porção que cobriria um mineral (140 g de azeitona para o ferro) não é prescrição |
| Palmito em conserva, milho e ervilha enlatados, seleta de legumes | prescritível | ingrediente de salada do dia a dia |
| Granola | não existe na base | — |
| Cereal matinal (com ou sem açúcar), mingau infantil, farinha láctea, mistura para vitamina e, *(revisão)*, mingau tradicional em pó, creme de milho em pó e farinha de arroz enriquecida | fora da rotina (ultraprocessado) | produto fortificado; aparecia como fonte de vitamina pelo enriquecimento. O creme de arroz em pó não é fortificado e segue como forma de ingrediente |
| Biscoito cream cracker | prescritível | está nas listas de equivalentes de cereais |
| Biscoito doce, recheado, wafer e maisena | fora da rotina (doce) | — |
| Biscoito de polvilho | fora da rotina (salgadinho) | — |
| Pipoca com óleo | prescritível | cereal integral, lanche comum |
| Castanhas, amêndoa e amendoim torrados e salgados | prescritível; no cobrir, até 30 g *(revisão)* | oleaginosa é prescrita; o sal é detalhe da compra; 200 g de castanha não é porção |
| Ovo frito, carne e frango à milanesa, peixe frito, bife à cavalo | fora da rotina (fritura) | existe a versão cozida, assada ou grelhada; o bife à cavalo leva ovo frito |
| Omelete | prescritível | preparo comum do ovo |
| Mel, melado, rapadura e chocolate meio amargo | fora da rotina (doce) | açúcar de adição ou doce |
| Hambúrguer bovino | fora da rotina (carne processada) | a TACO mede o hambúrguer industrializado |
| Empada de frango | fora da rotina (ultraprocessado) | salgado pré-cozido |
| Caldo de carne e de galinha em tablete, macarrão instantâneo | fora da rotina (ultraprocessado) | — |
| Limão inteiro cru | forma de ingrediente (tempero) | ninguém come 200 g de limão; o suco continua |
| Alho, alfavaca, manjericão, salsa, cebolinha e coentro | forma de ingrediente (tempero) | 70 g de alfavaca não é porção |
| Extrato, purê e molho de tomate, tucupi e cuxá | forma de ingrediente (molho) | base de preparo, não alimento do prato |
| Batata, batata-doce, batata-baroa, mandioca, cará, berinjela, chuchu e abóbora cabotian e moranga crus | forma de ingrediente (cru) | a base tem a versão cozida; mandioca crua é tóxica |
| *(re-revisão)* Inhame, vagem, taioba, fruta-pão, jiló, broto de feijão, caruru, quiabo, pequi, abóbora menina e abóbora pescoço crus | prescritível (peso cru) | a base só os traz crus; a folha marca "(peso cru)". A taioba crua irrita a boca e o broto cru tem risco microbiológico: ficam no Apêndice C |
| *(revisão)* Maxixe, mostarda e alho-poró crus | prescritível | só existem crus na base e a porção crua equivale à cozida; ficam no Apêndice C |
| *(revisão)* Peixe cru ou "fresco" sem preparo (dourada de água doce, fresca) | forma de ingrediente (cru) | é peixe cru, mesmo sem a palavra no nome |
| Fígado, coração, língua e bucho | prescritível e pouco usual (vão para o fim da lista) | já era assim (CA-82); sarapatel e dobradinha saíram (prato com miúdos) |
| *(revisão)* Capuccino e gelatina em pó | fora da rotina (bebida adoçada e doce) | voltavam com a chave ligada como "ingrediente" |
| *(revisão)* Sal, shoyu, tempero a base de sal e fermento | nunca | nem como ingrediente se prescrevem 200 g de shoyu |
| *(revisão)* Queijos, pães e biscoitos, frutas muito calóricas, cortes gordos e aves com pele | prescritíveis; no cobrir, com porção máxima do grupo (seção 7.1) | a porção de 200 g não é realista para eles |

## 3. Critérios de aceite

- **CA-650** · Dado o cobrir de qualquer nutriente, com a chave "Incluir ingredientes e alimentos crus" ligada ou desligada, então nenhuma bebida alcoólica aparece.
- **CA-651** · Dado o cobrir com a chave desligada, então não aparece nenhum item fora da rotina: refrigerante, isotônico ou bebida adoçada; doce, açúcar ou fruta em calda (*(revisão)* com ou sem o "em": "Ameixa, calda, enlatada"); óleo ou gordura de adição; embutido, carne processada ou curada; fritura; ultraprocessado, salgadinho ou petisco em conserva.
- **CA-652** · Dado o cobrir com a chave ligada, então a forma de ingrediente volta a poder aparecer, e os itens fora da rotina e as bebidas alcoólicas continuam de fora.
- **CA-653** · Dado o cobrir com a chave desligada, então também não aparece a forma de ingrediente nova: fécula e polvilho; batata, batata-doce, batata-baroa, mandioca, cará, abóbora, berinjela e chuchu crus; massa crua de pão de queijo; *(revisão)* a versão crua do D-199a; tempero e erva; limão inteiro cru; extrato, purê e molho de tomate; tucupi e cuxá; suco concentrado.
- **CA-654** · Dado o cobrir, com a chave ligada ou desligada, então café e chás não aparecem como fonte, *(revisão)* em nenhuma forma (café em pó incluído).
- **CA-655** · Dado as sugestões do cobrir, então a ordem continua: uso comum primeiro, depois menos kcal por parte da falta coberta, e grupos diferentes antes de repetir grupo.
- **CA-656** · Dado um nutriente que só alimentos fora da regra cobririam dentro da porção máxima, então o cobrir mostra "Nenhum alimento de rotina cobre ao menos 10% da falta em até {porção} g. Pela busca do plano, qualquer alimento entra." em vez de uma lista vazia.
- **CA-657** · Dado o plano de exemplo (Maria, 28 anos), quando o cobrir é pedido para cada um dos 16 micronutrientes, então nenhuma sugestão é item fora da regra; o mesmo vale para o plano vazio da mesma paciente, em que os 16 têm falta. *Atualizado pela `vitaminas-usda` (20/10/2026): a adequação tem 21 linhas; leia "16" como o número de linhas da adequação.*
- **CA-658** · Dado a lista de trocas de qualquer alimento da base, então nenhuma troca oferecida é item fora da regra, de nenhum nível.
- **CA-659** · Dado um item fora da rotina posto à mão no plano, então as trocas dele vêm só de alimentos prescritíveis do mesmo grupo e com o mesmo macro dominante (ovo frito troca por ovo cozido).
- **CA-660** · Dado um item fora da regra sem nenhum par prescritível no grupo (margarina, doce de leite), então ele não ganha trocas, e os outros alimentos do plano continuam com as suas.
- **CA-661** · Dado uma bebida alcoólica posta à mão no plano, então ela não ganha trocas.
- **CA-662** · Dado as listas padrão de sugestões por refeição (D-36), então todos os itens delas passam na regra.
- **CA-663** · Dado a busca de alimentos, então bebida alcoólica, doce e gordura continuam aparecendo: a escolha manual nunca é filtrada.
- **CA-664** · Dado a regra, então cada alimento fora dela tem um nível e um motivo, e *(revisão)* a lista de ids por motivo é a do Apêndice A, guardada fixa no teste (não só a contagem).
- **CA-665** *(revisão)* · Dado o cobrir com a chave ligada, então não aparecem café (em pó ou infusão), chá, capuccino, gelatina, sal, shoyu, tempero a base de sal nem fermento.
- **CA-666** *(revisão)* · Dado pó ou farinha fortificados (mingau tradicional em pó, creme de milho em pó, farinha de arroz enriquecida), então ficam fora da rotina, como o mingau infantil: a chave não os traz.
- **CA-667** *(revisão)* · Dado o cobrir dos 16 micronutrientes, no plano de exemplo e no plano vazio, com a chave ligada e desligada e com porção máxima de 50, 100 e 200 g, então nenhuma sugestão casa com o padrão fixo de texto do que nunca aparece (bebida alcoólica, refrigerante, isotônico, açúcar, calda, xarope, doce, fritura, margarina, óleo, manteiga, embutidos, sal, shoyu, fermento, café, chá, capuccino, gelatina, mingau e cereal fortificados); com a chave desligada, também não casa com o padrão de forma (pó, desidratado, farinha, fécula, polvilho e alimento cru que se come cozido). O padrão é escrito à mão no teste, sem usar a regra. *Atualizado pela `vitaminas-usda` (20/10/2026): a adequação tem 21 linhas; leia "16" como o número de linhas da adequação.*
- **CA-668** *(revisão)* · Dado as trocas de todos os alimentos da base, então nenhuma troca casa com os padrões fixos do CA-667 (os da chave desligada).
- **CA-669** *(revisão)* · Dado maniçoba, barreado, baião de dois, dobradinha e sarapatel, então ficam fora da rotina, com o mesmo motivo da feijoada.
- **CA-670** *(revisão, esclarecido na re-revisão)* · Dado a versão crua de verdura ou fruta que se come cozida, quando a base tem a versão cozida do mesmo alimento, então a crua não é proposta com a chave desligada; quando a base só tem a crua (inhame, vagem, taioba, fruta-pão, jiló, broto de feijão, caruru, quiabo, pequi, abóbora menina e pescoço), ela continua prescritível.
- **CA-671** *(revisão)* · Dado um ovo inteiro no plano, então as trocas dele são só outras formas de ovo inteiro, nunca gema nem clara; dado uma verdura cozida, então as trocas são só verduras cozidas. *(re-revisão)* Pão de queijo, farinha, farofa, nhoque, fécula e polvilho, que a TACO põe entre as verduras, não contam como verdura: não trocam por verdura, nem verdura troca por eles.
- **CA-672** *(revisão)* · Dado um item fora da rotina posto à mão, então a primeira troca é o mesmo alimento em outro preparo quando ele existe e é prescritível (ovo frito → ovo cozido; batata frita → batata inglesa).
- **CA-673** *(revisão)* · Dado o cobrir, então a porção sugerida de um alimento dos grupos da seção 7.1 não passa da porção máxima do grupo nem da porção máxima que a pessoa escolheu.
- **CA-674** *(revisão)* · Dado o cobrir, entre os alimentos de uso comum, então corte magro e ave sem pele vêm antes de corte gordo e ave com pele.
- **CA-675** *(revisão)* · Dado restrições do paciente, então elas filtram antes da escolha das 5 sugestões; se nada sobra, a gaveta mostra "Nenhum alimento de rotina, dentro das restrições do paciente, cobre ao menos 10% da falta em até {porção} g. Pela busca do plano, qualquer alimento entra." *(re-revisão)* A menção às restrições só aparece quando elas de fato tiraram algum alimento que cobriria a falta; senão vale a mensagem do CA-656.
- **CA-679** *(re-revisão)* · Dado as trocas de qualquer alimento, então corte magro e ave sem pele vêm antes de corte gordo e ave com pele, logo depois da preferência pelo mesmo alimento (CA-672).
- **CA-676** *(revisão)* · Dado "Carne, bovina, miolo de alcatra" e linhaça, então eles contam como uso comum.
- **CA-677** *(revisão)* · Dado uma descrição com espaço nas pontas ou espaço repetido, então a regra a classifica igual à descrição limpa.
- **CA-678** *(revisão)* · Dado o cobrir do sódio, com qualquer falta, chave ou porção máxima, então não há sugestão e o motivo é "O sódio não se cobre com alimento: o sal de cozinha e os temperos já completam o dia."

## 4. Casos de borda

| ID | Situação | Comportamento |
|---|---|---|
| CB-190 | Plano salvo antes com item agora fora da regra (cerveja, margarina) | O plano não muda; o item só deixa de ser sugerido e de ser oferecido como troca |
| CB-191 | Caso salvo com a chave "Incluir ingredientes e alimentos crus" ligada | Continua ligada; libera só a forma de ingrediente |
| CB-192 | Porção máxima pequena (5 g) ou nutriente sem fonte de rotina | Mensagem do CA-656 |
| CB-193 | Produto cadastrado pelo rótulo | Não entra no cobrir nem nas trocas, como já era (os dois usam só a base); na busca, aparece normalmente |
| CB-194 | Alimento novo na base, sem regra que o pegue | Entra como prescritível; a contagem do CA-664 acusa a mudança |
| CB-195 | Restrição do paciente ou alimento marcado "Nunca sugerir" | Continuam filtrando (CA-40, CA-83). *(revisão)* A restrição agora filtra antes do corte das 5 (CA-675), e a gaveta só mostra menos de 5 quando não há mais candidatos |
| CB-197 | *(revisão)* Porção máxima escolhida menor que a do grupo | Vale a menor |
| CB-198 | *(revisão)* Alimento de grupo com porção máxima baixa que não cobre 10% da falta | Sai da lista; se nada sobra, mensagem do CA-656 |
| CB-199 | *(revisão)* Item fora da rotina posto à mão sem o mesmo alimento prescritível em outro preparo | Segue a ordem normal das trocas |
| CB-196 | Plano em que nenhum alimento tem troca | A folha sai sem a seção de trocas, como já era |

## 5. Fora de escopo

- A busca e a ordem dos resultados dela (escolha manual).
- *(revisão)* Tirar o botão cobrir do sódio da tela: fica com a frente `painel-lateral-enxuto`. Aqui o domínio já não
  sugere nada para o sódio (D-199d).
- Porção máxima por alimento fora dos grupos da seção 7.1 (200 g de alface ainda é uma sugestão possível).
- Corrigir valores da TACO (B1 e B2 do chá, cobre do mamão formosa, vitamina A do aipo; leite integral e UHT sem kcal, por isso o leite nunca entra no cobrir nem nas trocas).
- *(revisão)* Trocas de laticínio que ficaram vazias (iogurte desnatado, amendoim) e a vitrine da página inicial, que não mostra o que o cobrir devolve hoje: ficaram para uma próxima rodada.
- Mudar o plano de exemplo, as listas por refeição e a vitrine (D-196).
- Layout da gaveta do cobrir, painel lateral e folha impressa: outras frentes cuidam deles. O texto da chave não muda.
- Classificar produtos cadastrados pelo rótulo.

## 6. Riscos

1. **Nenhuma decisão foi conferida por nutricionista.** A estudante revisa o Apêndice A antes de publicar; mudar um item
   é mudar uma linha da regra e a contagem do teste.
2. **Regra por nome.** Um alimento novo na base com nome diferente escapa até alguém escrever a regra (CB-194).
3. **Menos variedade.** Em nutriente com poucas fontes de rotina, uma porção máxima baixa leva à mensagem do CA-656 mais
   cedo do que antes.

## 7. Rodada de revisão (15/10/2026)

| Achado da revisão | O que muda | Critério |
|---|---|---|
| C1 · "Ameixa, calda, enlatada" escapava | "calda" com ou sem o "em" é doce | CA-651 |
| I1 · com a chave ligada voltavam café em pó, capuccino, gelatina, sal, shoyu, tempero e fermento | capuccino e gelatina são fora da rotina; sal, shoyu, tempero a base de sal e fermento são "nunca"; o cobrir não usa nada que comece por "Café," ou "Chá," | CA-654, CA-665 |
| I2 · pó e farinha fortificados eram só "ingrediente" | mingau tradicional, creme de milho e farinha de arroz enriquecida são ultraprocessados | CA-666 |
| I3 · os testes conferiam a regra com ela mesma | trava por padrão de texto escrito à mão e lista fixa de ids | CA-664, CA-667, CA-668 |
| I4 · pratos com charque, toucinho ou miúdos ficavam dentro | maniçoba, barreado, baião de dois, dobradinha e sarapatel saem, com a feijoada; Apêndice C | CA-669 |
| M1 · batata frita não trocava por batata | item fora da rotina prefere o mesmo alimento em outro preparo | CA-672 |
| M3 · ovo inteiro trocava por gema; brócolis cozido por vagem crua | a troca respeita a forma do ovo e o preparo da verdura | CA-671 |
| M4 · o CA-655 não tinha teste com o ID | teste próprio | CA-655 |
| M5 · o CA-36a antigo não dizia que foi substituído | nota no `planejador-metanutri` | — |
| M6 · regra sensível a espaço no nome | a descrição é limpa antes de comparar | CA-677 |
| M7 · "miolo" pegava miolo de alcatra; linhaça ia para o fim | saem da lista de pouco usual | CA-676 |
| M9 · a restrição do paciente filtrava depois do corte das 5 | filtra antes, com mensagem própria | CA-675 |
| M10 · macarrão cru do exemplo sem justificativa | D-196 | — |
| Decisões do coordenador (a), (b) e (c) | D-199 | CA-670, CA-673, CA-674 |
| Decisão do coordenador sobre o sódio (dúvida 1 do relatório) | D-199d | CA-678 |

**Respostas às dúvidas do relatório (coordenador, 15/10/2026):**

1. Sódio: não se cobre com alimento (D-199d).
2. A chave "Incluir ingredientes e alimentos crus" continua liberando só a forma de ingrediente; doce, gordura,
   embutido, fritura e ultraprocessado ficam fora mesmo com ela ligada (D-191, confirmado).
3. A revisão da estudante segue pelos Apêndices A e C.
4. A margarina do plano de exemplo fica (D-196, confirmado).

**Re-revisão (15/10/2026, fim da tarde).** A segunda revisão passou e deixou duas perguntas ao coordenador e quatro
ajustes menores:

| Item | O que muda | Critério |
|---|---|---|
| N1 · nas trocas, carne magra trocava por carne gorda ou frango com pele | o coordenador decidiu: magro antes do gordo também nas trocas | CA-679 |
| Regra (a) · o inhame saiu, mas as abóboras menina e pescoço ficaram | o coordenador esclareceu: o cru só sai quando a base tem a versão cozida do mesmo alimento; o resto fica, com "(peso cru)" na folha | D-199a, CA-670 |
| N2 · pão de queijo, farinha, farofa e nhoque contavam como "verdura cozida" nas trocas | não contam como verdura | CA-671 |
| N5 · a trava de texto não cobria todo o nível "fora da rotina" | a trava ganha os nomes que faltavam, e um teste confere que ela pega todos os ids da lista fixa | CA-667 |
| N6 · a mensagem falava da restrição mesmo quando ela não tirou nada | só fala quando a restrição tirou algum alimento | CA-675 |
| N7 · a gaveta recalculava as sugestões a cada renderização | a dependência das restrições fica estável | — |

### 7.1 Porção máxima por grupo no cobrir (D-199b)

Vale a menor entre a porção do grupo e a porção máxima que a pessoa escolheu na gaveta (200 g por padrão).

| Grupo | Como o sistema reconhece | Porção máxima | Medida caseira de referência (POF) |
|---|---|---|---|
| Oleaginosas e sementes | nome começa por castanha, amêndoa, noz, amendoim, gergelim, linhaça ou "Coco, cru" | 30 g | punhado de castanha 40 g; porção de noz 25 g; porção de linhaça 26 g |
| Queijos (menos a ricota) | nome começa por "Queijo," | 50 g | porção de minas frescal 50 g; mozarela 45 g; requeijão 45 g; prato e parmesão 30 g. A ricota é magra (porção da POF de 100 g) e fica na porção padrão |
| Pães, biscoitos e torradas | nome começa por pão, biscoito ou torrada | 50 g | pão francês: unidade 50 g; cream cracker: porção 32,5 g; torrada: porção 40 g |
| Frutas secas e muito calóricas | categoria de frutas com mais de 200 kcal em 100 g (hoje macaúba, tamarindo e tucumã) | 30 g | tamarindo: porção 25 g |
| Cortes gordos e aves com pele | nome com "com gordura", "com pele", costela, cupim, bisteca ou capa de contra-filé | 100 g | bife 100 g; pedaço de costela 40 g |

## 8. Correção A da rodada "cuidado total" (22/10/2026)

Status: **pedida pelo coordenador em 22/10/2026** depois da revisão como usuária real (`revisao-usuario.md`, G1, G3,
I6); ordem de pé do dono: "apenas faça"; aprovação pelas telas antes de publicar. Os quatro pacientes da revisão
mostraram "Alface roxa, 1 unidade · 200 g" no café da manhã de uma menina de 6 anos, "Rúcula, crua 200 g" para todo
adulto, "fígado 5 g" e fígado para gestante, e café no café da manhã da criança. Substitui a porção máxima fixa de 200 g
para os alimentos fora da tabela 7.1 (seção 5, "200 g de alface ainda é uma sugestão possível") e o CA-673 no que ele
tem de "porção do grupo".

### 8.1 Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-439 | **Porção realista por grupo e por idade** (tabela 8.2): todo alimento cai num grupo com porção máxima de adulto, tirada das porções do Guia Alimentar (2006) e das medidas da POF; a porção do grupo é multiplicada pela idade: abaixo de 1 ano ¼, de 1 a 3 anos ½, de 4 a 8 ⅔, de 9 a 13 ¾, de 14 em diante 1. A "Porção máxima por sugestão" da gaveta (200 g por padrão) continua editável e vale como teto acima de tudo. Sem idade, vale a de adulto. Sugestão que não cobre 10% da falta dentro da porção realista sai, como antes | 200 g de rúcula são uns 5 maços; uma criança de 6 anos não come 1 pé de alface |
| D-440 | **Porção mínima** em carne, ave, peixe, víscera e ovo: carne, ave, peixe e víscera ao menos 50 g (adulto, pela mesma escala de idade); ovo ao menos 1 unidade (45 g). Quando a falta se cobre com menos, a sugestão sobe para a mínima e cobre 100% | Ninguém come 5 g de fígado |
| D-441 | **"Adicionar em" começa na "Refeição de cada alimento"**: verdura, legume, leguminosa, carne, peixe, preparação e cereal cozido vão para o almoço; fruta, leite e derivados, oleaginosa e semente, para o lanche; pão, cereal matinal, aveia, tapioca, cuscuz e ovo, para o café da manhã. Sem a refeição do tipo, vale a mais perto (almoço → jantar; lanche → ceia → café da manhã; café da manhã → lanche) e, sem nenhuma, a primeira. O botão diz para onde vai ("Adicionar em Almoço"). Escolher uma refeição na lista põe todas nela, como antes | A alface entrou no café da manhã da menina e saiu no plano impresso dela |
| D-442 | **Gestação: sem fígado.** Com a condição "gestante", o fígado (de boi ou de frango, cru ou grelhado) e o sarapatel saem do Cobrir, das trocas e das sugestões da refeição, e a linha do plano que tem um deles avisa: "Na gestação, evite fígado: o excesso de vitamina A (retinol) faz mal ao bebê." No Cobrir da vitamina A da gestante, as fontes vegetais (carotenoides) vêm antes das animais (retinol). Os outros miúdos (coração, bucho, língua) não concentram retinol e ficam | Retinol pré-formado é teratogênico em excesso; o fígado tem 14.574 µg de vitamina A em 100 g |
| D-443 | **Criança sem cafeína.** Abaixo de 12 anos, café (infusão e pó), chá preto, chá-mate e refrigerante de cola e de guaraná saem das sugestões da refeição, das trocas e do Cobrir; a linha do plano que tem um deles avisa: "Café, chá preto ou mate e refrigerante com cafeína não são indicados para crianças." Chá de erva-doce, sem cafeína, fica | "Café, infusão 10% · 50 g" aparecia no café da manhã de uma criança de 6 anos |

D-442 e D-443 entram como "cuidados da fase de vida" no mesmo objeto das restrições do paciente (spec `ficha-unica`,
D-353): valem onde as restrições já valem, vêm da condição e da idade do plano (com ou sem paciente) e não mudam a
ficha.

### 8.2 Porção máxima por grupo (adulto)

A tabela 7.1 continua (oleaginosas 30 g, queijos 50 g, pães 50 g, frutas secas 30 g, cortes gordos 100 g e os grupos da
conduta da parceira) e ganha os grupos abaixo. Vale o primeiro grupo que casar, na ordem da tabela 7.1 e depois desta.

| Grupo | Como o sistema reconhece | Máxima | Mínima | Referência |
|---|---|---|---|---|
| Folha crua | verdura crua: alface, rúcula, agrião, almeirão, chicória, espinafre, mostarda, serralha, taioba, caruru, catalonha, couve, repolho, acelga | 60 g | — | prato raso de alface 50 g, de rúcula 80 g (POF) |
| Fígado e sarapatel | nome com fígado ou sarapatel | 100 g | 50 g | bife de fígado 100 g (POF) |
| Carne, ave e peixe | categorias de carnes e de pescados | 120 g | 50 g | bife 100 g, filé de peixe 120 g (POF) |
| Ovo inteiro | (tabela 7.1, 100 g) | 100 g | 45 g | unidade 45 g (POF) |
| Leguminosa cozida e tofu | leguminosas cozidas; tofu | 140 g | — | concha de feijão 140 g (POF) |
| Cereal e tubérculo cozidos | arroz, macarrão, polenta, cuscuz, batata, mandioca, cará, inhame, batata-doce e baroa cozidos | 150 g | — | porção do Guia: arroz 125 g, batata-doce 150 g |
| Verdura e legume | o resto da categoria de verduras | 100 g | — | porção do Guia: 1 a 2 porções de hortaliça por refeição |
| Fruta | frutas e derivados: a unidade da fruta quando ela pesa de 40 a 250 g; senão 150 g | 1 unidade ou 150 g | — | "fruta até 1 unidade" (revisão) |
| Leite e iogurte | leite fluido, bebida láctea e iogurte | 200 g | — | copo americano de leite 150 ml, pote de iogurte 200 g (POF) |
| Preparação | alimentos preparados | 150 g | — | — |

### 8.3 Critérios de aceite

- **CA-1245** · Dado a menina de 6 anos (fator ⅔) e o Cobrir do ferro, então nenhuma sugestão passa da porção do grupo × ⅔ (folha crua até 40 g, carne até 80 g, preparação até 100 g) nem aparece em "unidade" de folha.
- **CA-1246** · Dado um adulto, então a rúcula e a alface sugeridas não passam de 60 g e a carne de 120 g, mesmo com a "Porção máxima por sugestão" em 200 g.
- **CA-1247** · Dado as idades 0, 2, 6, 10, 16 e 35 anos, então o fator é ¼, ½, ⅔, ¾, 1 e 1; dado a "Porção máxima por sugestão" em 30 g, então ela continua valendo como teto.
- **CA-1248** · Dado uma falta que 5 g de fígado cobririam, então a sugestão do fígado é de 50 g (adulto), nunca 5 g, e cobre 100%; dado o ovo, nunca menos de 1 unidade.
- **CA-1249** · Dado a gaveta do Cobrir, então "Adicionar em" começa em "Refeição de cada alimento", e o botão de cada sugestão diz a refeição: alface e carne em "Almoço", iogurte e fruta no lanche, pão no café da manhã; escolhendo uma refeição na lista, todas vão para ela.
- **CA-1250** · Dado um plano de gestante, então o Cobrir (vitamina A, ferro, B12 e todos os outros), as trocas e as sugestões da refeição não trazem fígado nem sarapatel, e o Cobrir da vitamina A começa por fonte vegetal.
- **CA-1251** · Dado um plano de gestante com fígado numa refeição, então a linha avisa "Na gestação, evite fígado: o excesso de vitamina A (retinol) faz mal ao bebê."
- **CA-1252** · Dado um plano de criança com menos de 12 anos, então as sugestões do café da manhã não trazem café, e o Cobrir e as trocas não trazem café, chá preto, mate nem refrigerante de cola ou guaraná; com café posto à mão, a linha avisa "Café, chá preto ou mate e refrigerante com cafeína não são indicados para crianças."; com 12 anos ou mais, nada muda.

### 8.4 Casos de borda

- **CB-406** · Plano sem idade (prescrição rápida sem idade, plano antigo): porção de adulto e nenhum cuidado de criança.
- **CB-407** · Plano sem nenhuma refeição: a gaveta não tem destino, como antes.
- **CB-408** · Alimento próprio com "fígado" no nome numa gestante: o aviso e o filtro valem pelo nome.
- **CB-409** · Gestante que também tem restrição marcada: os dois avisos valem; a linha mostra o primeiro (o cuidado da fase).

## 9. Correção C da rodada "cuidado total" (22/10/2026)

Status: **pedida pelo coordenador em 22/10/2026** depois da 2ª revisão como usuária real (`revisao-usuario-2.md`, N1, N2,
N4, I16 e N7); ordem de pé do dono: "apenas faça"; aprovação pelas telas antes de publicar. A porção mínima da correção A
(D-440) subiu o fígado de 5 g para "meio bife · 50 g" no homem de 35 anos (cerca de 7.300 µg de retinol, 2,4 vezes o
limite do adulto) e "1 pedaço · 35 g" na menina de 6 anos (cerca de 5.100 µg, 5,7 vezes o limite de 900 µg), sem aviso:
o limite superior da vitamina A estava desligado para todo alimento, e a nota ‡ dizia que ele "não vale para a forma do
nutriente presente nos alimentos", o que é falso justamente no fígado. Muda o CA-30 e o CA-37 da spec
`planejador-metanutri` na vitamina A (o limite passa a valer para a parte pré-formada) e completa a D-199a (seção 2).
As trocas (fígado, ultraprocessado, fritura) ficam na spec `conduta-da-nutricionista`, seção 7.

### 9.1 Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-470 | **O limite da vitamina A vale para a parte pré-formada do plano.** A adequação soma à parte a vitamina A pré-formada (retinol): a vitamina A (RAE) dos alimentos de origem animal (categorias de carnes, pescados, ovos e leite e derivados), de todo alimento com "fígado" ou "sarapatel" no nome e do alimento próprio fora dos grupos de frutas e de verduras (no rótulo, a vitamina A é quase sempre adicionada, e a adicionada é pré-formada). A vitamina A das frutas, verduras, leguminosas, cereais e preparações vegetais é carotenoide e não tem limite. A meta continua pela vitamina A total (RAE); o limite superior (UL) da fase de vida vale contra a pré-formada. Acima dele, a linha fica vermelha e diz "N% da referência · pré-formada acima do limite"; a tabela copiada diz "Pré-formada acima do limite (UL 3.000 µg)". A nota ‡ passa a dizer: "Vitamina A: o limite superior vale para a pré-formada (fígado, miúdos, ovo, leite), não para os carotenoides dos vegetais. Magnésio, vitamina E, niacina e folato: vale para suplemento e alimento fortificado, não para o que os alimentos trazem." | O UL da vitamina A (IOM, 2001) é da vitamina A pré-formada que vem de alimento, alimento fortificado e suplemento, e não dos carotenoides. Na TACO, a vitamina A (RAE) das carnes e dos pescados é igual à coluna de retinol (fígado bovino grelhado: 14.574 µg nas duas) |
| D-471 | **No Cobrir, a sugestão nunca leva a vitamina A pré-formada do plano acima do limite.** Vale no Cobrir de todo nutriente (o fígado é a fonte mais concentrada de ferro, B12, cobre, riboflavina e folato, além da vitamina A): a porção de um alimento com vitamina A pré-formada é cortada (de 5 em 5 g, para baixo) para que a pré-formada do plano mais a da sugestão fique no limite da fase de vida; se a porção cortada fica abaixo da mínima (D-440) ou não cobre 10% da falta, o alimento não é sugerido; com o plano já acima do limite, nada com vitamina A pré-formada é sugerido. Na prática, o fígado bovino grelhado (14.574 µg em 100 g) precisaria de no máximo 20 g num adulto, abaixo dos 50 g mínimos, e nunca aparece; o único fígado que cabe num adulto é o de frango cru (3.863 µg em 100 g), só com a chave "Incluir ingredientes e alimentos crus" ligada, em até 75 g, e a sugestão de fígado diz "Fígado: no máximo 1 vez por semana." **Decidido o teto, e não a exclusão do fígado:** o teto vale para todo alimento com vitamina A pré-formada (o alimento próprio fortificado também), e a conduta continua com a nutricionista, que pode pôr o fígado pela busca | Porção que passa do limite não é sugestão. A orientação de saúde pública britânica (NHS) é que quem come fígado ou patê mais de 1 vez por semana pode estar ingerindo vitamina A demais |
| D-472 | **Criança sem fígado.** Abaixo de 12 anos (a idade da D-443), o fígado (de boi ou de frango, cru ou grelhado), o sarapatel e o alimento próprio com "fígado" no nome saem do Cobrir, das trocas e das sugestões da refeição, como na gestação (D-442); a linha do plano que tem um deles avisa: "Para crianças, evite fígado: pouca quantidade já passa do limite de vitamina A." | O limite da criança é baixo: 600 µg de 1 a 3 anos, 900 µg de 4 a 8 e 1.700 µg de 9 a 13; 35 g de fígado grelhado têm 5.100 µg. Com 12 anos ou mais, vale o teto da D-471 |
| D-473 | **O fígado nunca é troca.** Fígado e sarapatel não aparecem como troca de outro alimento: a troca tem a energia de uma porção inteira de carne (cerca de 100 g de fígado, 14.000 µg de retinol). O fígado posto à mão pela nutricionista ainda troca por outras carnes | Na lista de trocas, o paciente troca sozinho, sem a nutricionista conferir o limite |
| D-474 | **Com a chave desligada, cru só o que a parceira aprovou.** Continua o C.1 aprovado pela parceira: o que a base só tem cru e se come cozido (abóbora menina e pescoço, caruru, broto de feijão, inhame, jiló, quiabo, taioba, vagem, fruta-pão, pequi, maxixe, mostarda e alho-poró). A forma crua de legume ou verdura que se come cozida **e que tem a versão cozida do mesmo alimento na base** nunca aparece com a chave desligada: além de batata, batata-doce, batata-baroa, mandioca, cará, berinjela, chuchu e abóbora cabotiá e moranga, saem a abobrinha italiana, o brócolis, a catalonha, a couve-flor e o espinafre crus. A "Ervilha, em vagem" (ervilha fresca, crua, sem "cru" no nome) conta como leguminosa crua e sai. Um teste confere, a partir da base, que todo legume ou verdura crua que se come cozida (a lista do "(peso cru)" do nome para o paciente) e tem a versão cozida do mesmo alimento (mesma base e mesma variedade) fica de fora. Na gaveta, a sugestão crua que o paciente lê com "(peso cru)" mostra "(peso cru)" logo depois do peso: "Abóbora, menina brasileira, crua · 100 g (peso cru)" | N2: "Abobrinha" e "brócolis" crus podiam sair com a chave desligada, e a gaveta não dizia que os 100 g de abóbora são do peso cru |
| D-475 | **"Porção máxima por sugestão" vazia por padrão.** O campo fica vazio, com a dica "Automática, pelo grupo do alimento e pela idade. Digite um valor para limitar."; o número digitado vale como teto acima de tudo (D-439); apagar volta à automática. Os 200 g guardados por planos antigos contam como automática (com eles, o teto já era a porção do grupo). Sem nenhuma sugestão na porção automática, a mensagem diz "na porção de cada grupo", não "em até 200 g" | N4: o campo mostrava 200 g, e a gaveta usava 40 g de alface e 80 g de carne na menina |
| D-476 | **Gestação: o ferro e o folato vêm do suplemento.** Numa gestante, o Cobrir do ferro e o do folato começam pela nota "Na gestação, o ferro e o ácido fólico costumam vir do suplemento prescrito no pré-natal." e, com paciente vinculado, o botão "Ver Suplementação prescrita", que abre a ficha no cartão de suplementos. As sugestões de alimento continuam embaixo | A meta de ferro da gestante (27 mg) não se fecha com comida; o Ministério da Saúde (PNSF) e a OMS (2016) indicam ferro e ácido fólico diários no pré-natal |
| D-477 | **Fruta e polpa têm porção mínima; pupunha tem porção máxima.** Fruta e polpa de fruta saem com pelo menos 50 g de adulto (na escala de idade da D-439: 35 g aos 6 anos), nunca "Acerola, polpa · 5 g" nem "Jambo · 25 g". A pupunha cozida (218 kcal em 100 g) entra no grupo "Frutas secas e muito calóricas" (30 g). O atum em colher sai pela regra de medidas da D-483 (spec `alimentos-e-gramaturas`) | N7: porção pequena demais para servir e "Pupunha · 150 g · +328 kcal" num lanche |

### 9.2 Critérios de aceite

- **CA-1310** · Dado o homem de 35 anos com 50 g de fígado bovino grelhado no plano, então a linha da vitamina A fica acima do limite (a pré-formada, cerca de 7.287 µg, passa do UL de 3.000 µg), em vermelho, com "pré-formada acima do limite".
- **CA-1311** · Dado um plano só com vegetais cuja vitamina A total passa de 3.000 µg (abóbora, cenoura, manga), então a linha da vitamina A não fica acima do limite.
- **CA-1312** · Dado a etapa 3, então a nota ‡ diz o texto da D-470, e a marca ‡ continua na vitamina A, no magnésio, na vitamina E, na niacina e no folato.
- **CA-1313** · Dado o homem de 35 anos, plano vazio, com a chave desligada, então o Cobrir da vitamina A e o do ferro não trazem fígado, e nenhuma sugestão leva a vitamina A pré-formada do plano acima de 3.000 µg.
- **CA-1314** · Dado o homem de 35 anos com a chave ligada, quando o fígado de frango cru aparece no Cobrir do ferro, então a porção mantém a pré-formada do plano em até 3.000 µg (no máximo 75 g) e a sugestão diz "Fígado: no máximo 1 vez por semana."
- **CA-1315** · Dado um plano já acima do limite da vitamina A pré-formada, então o Cobrir de qualquer nutriente não sugere alimento com vitamina A pré-formada.
- **CA-1316** · Dado a menina de 6 anos, então o Cobrir (vitamina A, ferro e B12, com a chave ligada ou desligada), as trocas e as sugestões da refeição não trazem fígado nem sarapatel; com fígado posto à mão, a linha avisa "Para crianças, evite fígado: pouca quantidade já passa do limite de vitamina A." e a vitamina A fica acima do limite (UL de 900 µg).
- **CA-1317** · Dado a gestante de 28 anos, então o Cobrir não traz fígado (D-442 continua); com 50 g de fígado grelhado posto à mão, a vitamina A fica acima do limite (UL de 3.000 µg) e a linha avisa o cuidado da gestação.
- **CA-1318** · Dado 100 g de patinho grelhado no plano, então nenhuma troca é fígado ou sarapatel; dado fígado grelhado posto à mão, as trocas dele são outras carnes.
- **CA-1319** · Dado o Cobrir com a chave desligada, então não aparecem abobrinha italiana, brócolis, catalonha, couve-flor e espinafre crus nem a ervilha em vagem; e todo legume ou verdura crua que se come cozida e tem a versão cozida do mesmo alimento na base fica de fora; a abóbora menina, o jiló e o quiabo crus continuam prescritíveis.
- **CA-1320** · Dado a abóbora menina crua sugerida, então a gaveta mostra "(peso cru)" logo depois do peso; dado a cenoura crua (que se come crua), não.
- **CA-1321** · Dado a gaveta com a porção máxima no padrão (ou em 200 g, de plano antigo), então o campo "Porção máxima por sugestão" fica vazio, com a dica da D-475; digitando 30, o campo mostra 30 e as sugestões não passam de 30 g; apagando, volta à automática.
- **CA-1322** · Dado nenhuma sugestão possível na porção automática, então a mensagem diz "na porção de cada grupo"; com um teto digitado de 30 g, diz "em até 30 g".
- **CA-1323** · Dado uma gestante, quando abre o Cobrir do ferro ou do folato, então a nota da D-476 aparece antes das sugestões, que continuam; com paciente vinculado, "Ver Suplementação prescrita" abre a ficha dele no cartão "Suplementação prescrita". Fora da gestação, ou no Cobrir de outro nutriente, a nota não aparece.
- **CA-1324** · Dado a menina de 6 anos e uma falta pequena, então nenhuma fruta ou polpa sai com menos de 35 g; dado um adulto, menos de 50 g; dado a pupunha cozida, nunca mais de 30 g de adulto.

### 9.3 Casos de borda

- **CB-440** · Leite e ovo não têm vitamina A (RAE) na TACO (a coluna vem vazia; só a de retinol tem número): não entram na pré-formada nem na total, e a † de dado que falta continua a avisar.
- **CB-441** · Alimento próprio no grupo de frutas ou de verduras: a vitamina A do rótulo conta como carotenoide; em qualquer outro grupo, em "Suplementos" ou sem grupo, conta como pré-formada.
- **CB-442** · Receita no plano: a pré-formada soma pelos ingredientes, como os outros nutrientes.
- **CB-443** · Plano sem fase de vida (sem sexo ou idade): a adequação não calcula e o Cobrir não abre, como antes; sem limite, o teto da D-471 não se aplica.
- **CB-444** · Com 12 anos ou mais, o fígado volta a valer pelo teto da D-471 (de 9 a 13 anos, UL de 1.700 µg).
- **CB-445** · Gestante de 28 anos sem paciente vinculado (prescrição rápida): a nota da D-476 aparece, sem o botão.

### 9.4 Fontes

- Institute of Medicine (EUA). *Dietary Reference Intakes for Vitamin A, Vitamin K, Arsenic, Boron, Chromium, Copper,
  Iodine, Iron, Manganese, Molybdenum, Nickel, Silicon, Vanadium, and Zinc.* Washington: National Academies Press, 2001,
  cap. 4 (vitamina A): o UL vale para a vitamina A pré-formada de alimento, alimento fortificado e suplemento, não para os
  carotenoides; 600 µg/dia de 1 a 3 anos, 900 de 4 a 8, 1.700 de 9 a 13, 2.800 de 14 a 18 e 3.000 de 19 anos em diante,
  inclusive na gestação e na lactação (os valores do `dri.json`, tabelas-resumo do NASEM).
- NIH Office of Dietary Supplements. *Vitamin A and Carotenoids — Fact Sheet for Health Professionals*: o UL é só da
  vitamina A pré-formada; o fígado bovino é a fonte mais concentrada.
- NHS (Reino Unido). *Vitamin A* (nhs.uk, "Vitamins and minerals"): quem come fígado ou patê de fígado mais de 1 vez por
  semana pode estar ingerindo vitamina A demais; gestantes e quem planeja engravidar devem evitar fígado e derivados. A
  HSE da Irlanda dá a mesma orientação. Committee on Toxicity (Reino Unido), declaração sobre o excesso de vitamina A na
  saúde materna: a mesma recomendação para a gestação.
- TACO, 4ª edição (NEPA/UNICAMP, 2011): fígado bovino grelhado, 14.574 µg de retinol em 100 g; fígado bovino cru, 7.937;
  fígado de frango cru, 3.863; nas carnes e nos pescados a coluna RAE é igual à de retinol; em leite, queijo e ovo a TACO
  traz retinol e deixa o RAE vazio.
- Ministério da Saúde. *Programa Nacional de Suplementação de Ferro: manual de condutas gerais.* Brasília, 2013: sulfato
  ferroso e ácido fólico para toda gestante no pré-natal. WHO. *WHO recommendations on antenatal care for a positive
  pregnancy experience.* Genebra, 2016: ferro oral diário (30 a 60 mg de ferro elementar) e 400 µg de ácido fólico.

## Apêndice A — Alimentos que o MetaNutri deixa de propor sozinho

*(20/10/2026)* Regenerado a partir do código depois da conduta da nutricionista parceira (spec
`conduta-da-nutricionista`, D-290 a D-292); o teste do CA-664 guarda a mesma lista de ids. 282 dos 597 alimentos
(eram 298 em 15/10). A coluna "Em 15/10" diz o que mudou: "igual" quando nada mudou; o motivo de antes quando o item
trocou de motivo (as margarinas hidrogenadas e o chantilly eram gordura de adição e agora são gordura trans); e
"prescritível" para as quatro preparações que saíram em 20/10. Os 20 itens liberados estão na última tabela. Estão
agrupados pelo motivo que vale primeiro, na ordem: nunca, fora da rotina, forma de ingrediente. Todos continuam
disponíveis pela busca.

### Nível 1 — Nunca

#### Bebida alcoólica (2)

| Id | Alimento | Categoria da TACO | Em 15/10 |
|---|---|---|---|
| 472 | Cana, aguardente 1 | Bebidas (alcoólicas e não alcoólicas) | igual |
| 474 | Cerveja, pilsen 2 | Bebidas (alcoólicas e não alcoólicas) | igual |

#### Sal, shoyu, tempero pronto ou fermento (6)

| Id | Alimento | Categoria da TACO | Em 15/10 |
|---|---|---|---|
| 513 | Fermento em pó, químico | Miscelâneas | igual |
| 514 | Fermento, biológico, levedura, tablete | Miscelâneas | igual |
| 516 | Sal, dietético | Miscelâneas | igual |
| 517 | Sal, grosso | Miscelâneas | igual |
| 518 | Shoyu | Miscelâneas | igual |
| 519 | Tempero a base de sal | Miscelâneas | igual |

#### Gordura trans (hidrogenada) (3)

| Id | Alimento | Categoria da TACO | Em 15/10 |
|---|---|---|---|
| 263 | Margarina, com óleo hidrogenado, com sal (65% de lipídeos) | Gorduras e óleos | gordura (mudou em 20/10) |
| 264 | Margarina, com óleo hidrogenado, sem sal (80% de lipídeos) | Gorduras e óleos | gordura (mudou em 20/10) |
| 522 | Chantilly, spray, com gordura vegetal | Outros alimentos industrializados | gordura (mudou em 20/10) |

### Nível 2 — Fora da rotina

#### Refrigerante, isotônico ou bebida adoçada (10)

| Id | Alimento | Categoria da TACO | Em 15/10 |
|---|---|---|---|
| 446 | Bebida láctea, pêssego | Leite e derivados | igual |
| 455 | Leite, de vaca, achocolatado | Leite e derivados | igual |
| 470 | Bebida isotônica, sabores variados | Bebidas (alcoólicas e não alcoólicas) | igual |
| 473 | Cana, caldo de | Bebidas (alcoólicas e não alcoólicas) | igual |
| 479 | Refrigerante, tipo água tônica | Bebidas (alcoólicas e não alcoólicas) | igual |
| 480 | Refrigerante, tipo cola | Bebidas (alcoólicas e não alcoólicas) | igual |
| 481 | Refrigerante, tipo guaraná | Bebidas (alcoólicas e não alcoólicas) | igual |
| 482 | Refrigerante, tipo laranja | Bebidas (alcoólicas e não alcoólicas) | igual |
| 483 | Refrigerante, tipo limão | Bebidas (alcoólicas e não alcoólicas) | igual |
| 512 | Capuccino, pó | Miscelâneas | igual |

#### Doce, açúcar ou fruta em calda (50)

| Id | Alimento | Categoria da TACO | Em 15/10 |
|---|---|---|---|
| 8 | Biscoito, doce, maisena | Cereais e derivados | igual |
| 9 | Biscoito, doce, recheado com chocolate | Cereais e derivados | igual |
| 10 | Biscoito, doce, recheado com morango | Cereais e derivados | igual |
| 11 | Biscoito, doce, wafer, recheado de chocolate | Cereais e derivados | igual |
| 12 | Biscoito, doce, wafer, recheado de morango | Cereais e derivados | igual |
| 14 | Bolo, mistura para | Cereais e derivados | igual |
| 15 | Bolo, pronto, aipim | Cereais e derivados | igual |
| 16 | Bolo, pronto, chocolate | Cereais e derivados | igual |
| 17 | Bolo, pronto, coco | Cereais e derivados | igual |
| 18 | Bolo, pronto, milho | Cereais e derivados | igual |
| 20 | Canjica, com leite integral | Cereais e derivados | igual |
| 26 | Cereal matinal, milho, açúcar | Cereais e derivados | igual |
| 29 | Curau, milho verde | Cereais e derivados | igual |
| 30 | Curau, milho verde, mistura para | Cereais e derivados | igual |
| 167 | Açaí, polpa, com xarope de guaraná e glucose | Frutas e derivados | igual |
| 171 | Ameixa, calda, enlatada | Frutas e derivados | igual |
| 173 | Ameixa, em calda, enlatada, drenada | Frutas e derivados | igual |
| 176 | Banana, doce em barra | Frutas e derivados | igual |
| 195 | Figo, enlatado, em calda | Frutas e derivados | igual |
| 198 | Goiaba, doce em pasta | Frutas e derivados | igual |
| 199 | Goiaba, doce, cascão | Frutas e derivados | igual |
| 224 | Mamão, doce em calda, drenado | Frutas e derivados | igual |
| 227 | Mamão verde, doce em calda, drenado | Frutas e derivados | igual |
| 245 | Pêssego, enlatado, em calda | Frutas e derivados | igual |
| 450 | Iogurte, sabor abacaxi | Leite e derivados | igual |
| 451 | Iogurte, sabor morango | Leite e derivados | igual |
| 452 | Iogurte, sabor pêssego | Leite e derivados | igual |
| 453 | Leite, condensado | Leite e derivados | igual |
| 466 | Queijo, petit suisse, morango | Leite e derivados | igual |
| 491 | Achocolatado, pó | Produtos açucarados | igual |
| 492 | Açúcar, cristal | Produtos açucarados | igual |
| 493 | Açúcar, mascavo | Produtos açucarados | igual |
| 494 | Açúcar, refinado | Produtos açucarados | igual |
| 495 | Chocolate, ao leite | Produtos açucarados | igual |
| 496 | Chocolate, ao leite, com castanha do Pará | Produtos açucarados | igual |
| 497 | Chocolate, ao leite, dietético | Produtos açucarados | igual |
| 499 | Cocada branca | Produtos açucarados | igual |
| 500 | Doce, de abóbora, cremoso | Produtos açucarados | igual |
| 501 | Doce, de leite, cremoso | Produtos açucarados | igual |
| 502 | Geléia, mocotó, natural | Produtos açucarados | igual |
| 503 | Glicose de milho | Produtos açucarados | igual |
| 504 | Maria mole | Produtos açucarados | igual |
| 505 | Maria mole, coco queimado | Produtos açucarados | igual |
| 506 | Marmelada | Produtos açucarados | igual |
| 508 | Melado | Produtos açucarados | igual |
| 509 | Quindim | Produtos açucarados | igual |
| 510 | Rapadura | Produtos açucarados | igual |
| 515 | Gelatina, sabores variados, pó | Miscelâneas | igual |
| 579 | Paçoca, amendoim | Leguminosas e derivados | igual |
| 580 | Pé-de-moleque, amendoim | Leguminosas e derivados | igual |

#### Óleo ou gordura de adição (18)

| Id | Alimento | Categoria da TACO | Em 15/10 |
|---|---|---|---|
| 259 | Azeite, de dendê | Gorduras e óleos | igual |
| 261 | Manteiga, com sal | Gorduras e óleos | igual |
| 262 | Manteiga, sem sal | Gorduras e óleos | igual |
| 265 | Margarina, com óleo interesterificado, com sal (65%de lipídeos) | Gorduras e óleos | igual |
| 266 | Margarina, com óleo interesterificado, sem sal (65% de lipídeos) | Gorduras e óleos | igual |
| 267 | Óleo, de babaçu | Gorduras e óleos | igual |
| 268 | Óleo, de canola | Gorduras e óleos | igual |
| 269 | Óleo, de girassol | Gorduras e óleos | igual |
| 270 | Óleo, de milho | Gorduras e óleos | igual |
| 271 | Óleo, de pequi | Gorduras e óleos | igual |
| 272 | Óleo, de soja | Gorduras e óleos | igual |
| 444 | Toucinho, cru | Carnes e derivados | igual |
| 445 | Toucinho, frito | Carnes e derivados | igual |
| 447 | Creme de Leite | Leite e derivados | igual |
| 523 | Leite, de coco | Outros alimentos industrializados | igual |
| 524 | Maionese, tradicional com ovos | Outros alimentos industrializados | igual |
| 545 | Salada, de legumes, com maionese | Alimentos preparados | igual |
| 547 | Salpicão, de frango | Alimentos preparados | igual |

#### Embutido, carne processada ou curada (18)

| Id | Alimento | Categoria da TACO | Em 15/10 |
|---|---|---|---|
| 323 | Apresuntado | Carnes e derivados | igual |
| 339 | Carne, bovina, charque, cru | Carnes e derivados | igual |
| 385 | Carne, bovina, seca, crua | Carnes e derivados | igual |
| 415 | Hambúrguer, bovino, cru | Carnes e derivados | igual |
| 416 | Hambúrguer, bovino, frito | Carnes e derivados | igual |
| 417 | Hambúrguer, bovino, grelhado | Carnes e derivados | igual |
| 418 | Lingüiça, frango, crua | Carnes e derivados | igual |
| 419 | Lingüiça, frango, frita | Carnes e derivados | igual |
| 420 | Lingüiça, frango, grelhada | Carnes e derivados | igual |
| 421 | Lingüiça, porco, crua | Carnes e derivados | igual |
| 422 | Lingüiça, porco, frita | Carnes e derivados | igual |
| 423 | Lingüiça, porco, grelhada | Carnes e derivados | igual |
| 424 | Mortadela | Carnes e derivados | igual |
| 434 | Porco, orelha, salgada, crua | Carnes e derivados | igual |
| 437 | Porco, rabo, salgado, cru | Carnes e derivados | igual |
| 438 | Presunto, com capa de gordura | Carnes e derivados | igual |
| 439 | Presunto, sem capa de gordura | Carnes e derivados | igual |
| 443 | Salame | Carnes e derivados | igual |

#### Prato com embutido, toucinho, carne curada ou miúdos (3)

| Id | Alimento | Categoria da TACO | Em 15/10 |
|---|---|---|---|
| 526 | Arroz carreteiro | Alimentos preparados | igual |
| 539 | Feijão tropeiro mineiro | Alimentos preparados | igual |
| 555 | Virado à paulista | Alimentos preparados | igual |

#### Fritura ou salgado frito (30)

| Id | Alimento | Categoria da TACO | Em 15/10 |
|---|---|---|---|
| 55 | Pastel, de carne, cru | Cereais e derivados | igual |
| 56 | Pastel, de carne, frito | Cereais e derivados | igual |
| 57 | Pastel, de queijo, cru | Cereais e derivados | igual |
| 58 | Pastel, de queijo, frito | Cereais e derivados | igual |
| 59 | Pastel, massa, crua | Cereais e derivados | igual |
| 60 | Pastel, massa, frita | Cereais e derivados | igual |
| 90 | Batata, frita, tipo chips, industrializada | Verduras, hortaliças e derivados | igual |
| 93 | Batata, inglesa, frita | Verduras, hortaliças e derivados | igual |
| 132 | Mandioca, frita | Verduras, hortaliças e derivados | igual |
| 281 | Cação, posta, com farinha de trigo, frita | Pescados e frutos do mar | igual |
| 286 | Camarão, Sete Barbas, sem cabeça, com casca, frito | Pescados e frutos do mar | igual |
| 297 | Lambari, congelado, frito | Pescados e frutos do mar | igual |
| 299 | Manjuba, com farinha de trigo, frita | Pescados e frutos do mar | igual |
| 300 | Manjuba, frita | Pescados e frutos do mar | igual |
| 303 | Merluza, filé, frito | Pescados e frutos do mar | igual |
| 305 | Pescada, branca, frita | Pescados e frutos do mar | igual |
| 306 | Pescada, filé, com farinha de trigo, frito | Pescados e frutos do mar | igual |
| 308 | Pescada, filé, frito | Pescados e frutos do mar | igual |
| 320 | Sardinha, frita | Pescados e frutos do mar | igual |
| 331 | Carne, bovina, almôndegas, fritas | Carnes e derivados | igual |
| 340 | Carne, bovina, contra-filé, à milanesa | Carnes e derivados | igual |
| 386 | Coxinha de frango, frita | Carnes e derivados | igual |
| 387 | Croquete, de carne, cru | Carnes e derivados | igual |
| 388 | Croquete, de carne, frito | Carnes e derivados | igual |
| 401 | Frango, filé, à milanesa | Carnes e derivados | igual |
| 428 | Porco, bisteca, frita | Carnes e derivados | igual |
| 442 | Quibe, frito | Carnes e derivados | igual |
| 525 | Acarajé | Alimentos preparados | igual |
| 529 | Bife à cavalo, com contra filé | Alimentos preparados | igual |
| 530 | Bolinho de arroz | Alimentos preparados | igual |

#### Ultraprocessado, salgadinho ou petisco em conserva (12)

| Id | Alimento | Categoria da TACO | Em 15/10 |
|---|---|---|---|
| 23 | Cereais, mingau, milho, infantil | Cereais e derivados | igual |
| 24 | Cereais, mistura para vitamina, trigo, cevada e aveia | Cereais e derivados | igual |
| 28 | Creme de milho, pó | Cereais e derivados | igual |
| 31 | Farinha, de arroz, enriquecida | Cereais e derivados | igual |
| 36 | Farinha, láctea, de cereais | Cereais e derivados | igual |
| 39 | Macarrão, instantâneo | Cereais e derivados | igual |
| 46 | Mingau tradicional, pó | Cereais e derivados | igual |
| 99 | Biscoito, polvilho doce | Verduras, hortaliças e derivados | igual |
| 324 | Caldo de carne, tablete | Carnes e derivados | igual |
| 325 | Caldo de galinha, tablete | Carnes e derivados | igual |
| 389 | Empada de frango, pré-cozida, assada | Carnes e derivados | igual |
| 390 | Empada, de frango, pré-cozida | Carnes e derivados | igual |

#### Preparação que raramente se prescreve assim (4)

| Id | Alimento | Categoria da TACO | Em 15/10 |
|---|---|---|---|
| 13 | Biscoito, salgado, cream cracker | Cereais e derivados | prescritível (saiu em 20/10) |
| 61 | Pipoca, com óleo de soja, sem sal | Cereais e derivados | prescritível (saiu em 20/10) |
| 140 | Pão, de queijo, assado | Verduras, hortaliças e derivados | prescritível (saiu em 20/10) |
| 551 | Tapioca, com manteiga | Alimentos preparados | prescritível (saiu em 20/10) |

### Nível 3 — Forma de ingrediente (a chave do cobrir libera)

#### Ingrediente da categoria Miscelâneas (café em pó) (1)

| Id | Alimento | Categoria da TACO | Em 15/10 |
|---|---|---|---|
| 511 | Café, pó, torrado | Miscelâneas | igual |

#### Produto em pó ou desidratado (3)

| Id | Alimento | Categoria da TACO | Em 15/10 |
|---|---|---|---|
| 27 | Creme de arroz, pó | Cereais e derivados | igual |
| 114 | Coentro, folhas desidratadas | Verduras, hortaliças e derivados | igual |
| 583 | Soja, extrato solúvel, pó | Leguminosas e derivados | igual |

#### Farinha, amido ou fécula de uso culinário (11)

| Id | Alimento | Categoria da TACO | Em 15/10 |
|---|---|---|---|
| 32 | Farinha, de centeio, integral | Cereais e derivados | igual |
| 33 | Farinha, de milho, amarela | Cereais e derivados | igual |
| 34 | Farinha, de rosca | Cereais e derivados | igual |
| 35 | Farinha, de trigo | Cereais e derivados | igual |
| 42 | Milho, amido, cru | Cereais e derivados | igual |
| 43 | Milho, fubá, cru | Cereais e derivados | igual |
| 123 | Farinha, de puba | Verduras, hortaliças e derivados | igual |
| 124 | Fécula, de mandioca | Verduras, hortaliças e derivados | igual |
| 146 | Polvilho, doce | Verduras, hortaliças e derivados | igual |
| 581 | Soja, farinha | Leguminosas e derivados | igual |
| 592 | Farinha, de mesocarpo de babaçu, crua | Nozes e sementes | igual |

#### Versão crua de alimento que se come cozido (97)

| Id | Alimento | Categoria da TACO | Em 15/10 |
|---|---|---|---|
| 2 | Arroz, integral, cru | Cereais e derivados | igual |
| 4 | Arroz, tipo 1, cru | Cereais e derivados | igual |
| 6 | Arroz, tipo 2, cru | Cereais e derivados | igual |
| 19 | Canjica, branca, crua | Cereais e derivados | igual |
| 38 | Lasanha, massa fresca, crua | Cereais e derivados | igual |
| 40 | Macarrão, trigo, cru | Cereais e derivados | igual |
| 41 | Macarrão, trigo, cru, com ovos | Cereais e derivados | igual |
| 44 | Milho, verde, cru | Cereais e derivados | igual |
| 65 | Abóbora, cabotian, crua | Verduras, hortaliças e derivados | igual |
| 67 | Abóbora, moranga, crua | Verduras, hortaliças e derivados | igual |
| 87 | Batata, baroa, crua | Verduras, hortaliças e derivados | igual |
| 89 | Batata, doce, crua | Verduras, hortaliças e derivados | igual |
| 92 | Batata, inglesa, crua | Verduras, hortaliças e derivados | igual |
| 96 | Berinjela, crua | Verduras, hortaliças e derivados | igual |
| 103 | Cará, cru | Verduras, hortaliças e derivados | igual |
| 113 | Chuchu, cru | Verduras, hortaliças e derivados | igual |
| 130 | Mandioca, crua | Verduras, hortaliças e derivados | igual |
| 141 | Pão, de queijo, cru | Verduras, hortaliças e derivados | igual |
| 275 | Abadejo, filé, congelado, cru | Pescados e frutos do mar | igual |
| 278 | Atum, fresco, cru | Pescados e frutos do mar | igual |
| 279 | Bacalhau, salgado, cru | Pescados e frutos do mar | igual |
| 283 | Cação, posta, crua | Pescados e frutos do mar | igual |
| 285 | Camarão, Rio Grande, grande, cru | Pescados e frutos do mar | igual |
| 288 | Corimba, cru | Pescados e frutos do mar | igual |
| 291 | Corvina de água doce, crua | Pescados e frutos do mar | igual |
| 292 | Corvina do mar, crua | Pescados e frutos do mar | igual |
| 295 | Dourada de água doce, fresca | Pescados e frutos do mar | igual |
| 296 | Lambari, congelado, cru | Pescados e frutos do mar | igual |
| 298 | Lambari, fresco, cru | Pescados e frutos do mar | igual |
| 302 | Merluza, filé, cru | Pescados e frutos do mar | igual |
| 304 | Pescada, branca, crua | Pescados e frutos do mar | igual |
| 307 | Pescada, filé, cru | Pescados e frutos do mar | igual |
| 310 | Pescadinha, crua | Pescados e frutos do mar | igual |
| 312 | Pintado, cru | Pescados e frutos do mar | igual |
| 314 | Porquinho, cru | Pescados e frutos do mar | igual |
| 316 | Salmão, sem pele, fresco, cru | Pescados e frutos do mar | igual |
| 321 | Sardinha, inteira, crua | Pescados e frutos do mar | igual |
| 322 | Tucunaré, filé, congelado, cru | Pescados e frutos do mar | igual |
| 327 | Carne, bovina, acém, moído, cru | Carnes e derivados | igual |
| 329 | Carne, bovina, acém, sem gordura, cru | Carnes e derivados | igual |
| 330 | Carne, bovina, almôndegas, cruas | Carnes e derivados | igual |
| 333 | Carne, bovina, bucho, cru | Carnes e derivados | igual |
| 334 | Carne, bovina, capa de contra-filé, com gordura, crua | Carnes e derivados | igual |
| 336 | Carne, bovina, capa de contra-filé, sem gordura, crua | Carnes e derivados | igual |
| 341 | Carne, bovina, contra-filé de costela, cru | Carnes e derivados | igual |
| 343 | Carne, bovina, contra-filé, com gordura, cru | Carnes e derivados | igual |
| 345 | Carne, bovina, contra-filé, sem gordura, cru | Carnes e derivados | igual |
| 348 | Carne, bovina, costela, crua | Carnes e derivados | igual |
| 350 | Carne, bovina, coxão duro, sem gordura, cru | Carnes e derivados | igual |
| 352 | Carne, bovina, coxão mole, sem gordura, cru | Carnes e derivados | igual |
| 354 | Carne, bovina, cupim, cru | Carnes e derivados | igual |
| 355 | Carne, bovina, fígado, cru | Carnes e derivados | igual |
| 357 | Carne, bovina, filé mingnon, sem gordura, cru | Carnes e derivados | igual |
| 360 | Carne, bovina, flanco, sem gordura, cru | Carnes e derivados | igual |
| 362 | Carne, bovina, fraldinha, com gordura, crua | Carnes e derivados | igual |
| 364 | Carne, bovina, lagarto, cru | Carnes e derivados | igual |
| 366 | Carne, bovina, língua, crua | Carnes e derivados | igual |
| 367 | Carne, bovina, maminha, crua | Carnes e derivados | igual |
| 369 | Carne, bovina, miolo de alcatra, sem gordura, cru | Carnes e derivados | igual |
| 372 | Carne, bovina, músculo, sem gordura, cru | Carnes e derivados | igual |
| 373 | Carne, bovina, paleta, com gordura, crua | Carnes e derivados | igual |
| 375 | Carne, bovina, paleta, sem gordura, crua | Carnes e derivados | igual |
| 376 | Carne, bovina, patinho, sem gordura, cru | Carnes e derivados | igual |
| 379 | Carne, bovina, peito, sem gordura, cru | Carnes e derivados | igual |
| 380 | Carne, bovina, picanha, com gordura, crua | Carnes e derivados | igual |
| 382 | Carne, bovina, picanha, sem gordura, crua | Carnes e derivados | igual |
| 391 | Frango, asa, com pele, crua | Carnes e derivados | igual |
| 394 | Frango, coração, cru | Carnes e derivados | igual |
| 397 | Frango, coxa, com pele, crua | Carnes e derivados | igual |
| 399 | Frango, coxa, sem pele, crua | Carnes e derivados | igual |
| 400 | Frango, fígado, cru | Carnes e derivados | igual |
| 402 | Frango, inteiro, com pele, cru | Carnes e derivados | igual |
| 405 | Frango, inteiro, sem pele, cru | Carnes e derivados | igual |
| 407 | Frango, peito, com pele, cru | Carnes e derivados | igual |
| 409 | Frango, peito, sem pele, cru | Carnes e derivados | igual |
| 412 | Frango, sobrecoxa, com pele, crua | Carnes e derivados | igual |
| 414 | Frango, sobrecoxa, sem pele, crua | Carnes e derivados | igual |
| 426 | Peru, congelado, cru | Carnes e derivados | igual |
| 427 | Porco, bisteca, crua | Carnes e derivados | igual |
| 431 | Porco, costela, crua | Carnes e derivados | igual |
| 433 | Porco, lombo, cru | Carnes e derivados | igual |
| 436 | Porco, pernil, cru | Carnes e derivados | igual |
| 441 | Quibe, cru | Carnes e derivados | igual |
| 485 | Ovo, de codorna, inteiro, cru | Ovos e derivados | igual |
| 489 | Ovo, de galinha, inteiro, cru | Ovos e derivados | igual |
| 557 | Amendoim, grão, cru | Leguminosas e derivados | igual |
| 562 | Feijão, carioca, cru | Leguminosas e derivados | igual |
| 564 | Feijão, fradinho, cru | Leguminosas e derivados | igual |
| 566 | Feijão, jalo, cru | Leguminosas e derivados | igual |
| 568 | Feijão, preto, cru | Leguminosas e derivados | igual |
| 570 | Feijão, rajado, cru | Leguminosas e derivados | igual |
| 572 | Feijão, rosinha, cru | Leguminosas e derivados | igual |
| 574 | Feijão, roxo, cru | Leguminosas e derivados | igual |
| 575 | Grão-de-bico, cru | Leguminosas e derivados | igual |
| 576 | Guandu, cru | Leguminosas e derivados | igual |
| 578 | Lentilha, crua | Leguminosas e derivados | igual |
| 585 | Tremoço, cru | Leguminosas e derivados | igual |

#### Tempero, molho ou concentrado (14)

| Id | Alimento | Categoria da TACO | Em 15/10 |
|---|---|---|---|
| 81 | Alfavaca, crua | Verduras, hortaliças e derivados | igual |
| 82 | Alho, cru | Verduras, hortaliças e derivados | igual |
| 108 | Cebolinha, crua | Verduras, hortaliças e derivados | igual |
| 133 | Manjericão, cru | Verduras, hortaliças e derivados | igual |
| 153 | Salsa, crua | Verduras, hortaliças e derivados | igual |
| 158 | Tomate, extrato | Verduras, hortaliças e derivados | igual |
| 159 | Tomate, molho industrializado | Verduras, hortaliças e derivados | igual |
| 160 | Tomate, purê | Verduras, hortaliças e derivados | igual |
| 188 | Caju, suco concentrado, envasado | Frutas e derivados | igual |
| 220 | Limão, tahiti, cru | Frutas e derivados | igual |
| 234 | Maracujá, suco concentrado, envasado | Frutas e derivados | igual |
| 258 | Uva, suco concentrado, envasado | Frutas e derivados | igual |
| 535 | Cuxá, molho | Alimentos preparados | igual |
| 552 | Tucupi, com pimenta-de-cheiro | Alimentos preparados | igual |

#### Liberados pela conduta da parceira (20/10/2026)

| Id | Alimento | Categoria da TACO | Em 15/10 |
|---|---|---|---|
| 260 | Azeite, de oliva, extra virgem | Gorduras e óleos | gordura |
| 507 | Mel, de abelha | Produtos açucarados | doce |
| 498 | Chocolate, meio amargo | Produtos açucarados | doce |
| 460 | Leite, fermentado | Leite e derivados | bebida adoçada |
| 25 | Cereal matinal, milho | Cereais e derivados | ultraprocessado |
| 338 | Carne, bovina, charque, cozido | Carnes e derivados | embutido |
| 384 | Carne, bovina, seca, cozida | Carnes e derivados | embutido |
| 520 | Azeitona, preta, conserva | Outros alimentos industrializados | ultraprocessado |
| 521 | Azeitona, verde, conserva | Outros alimentos industrializados | ultraprocessado |
| 586 | Tremoço, em conserva | Leguminosas e derivados | ultraprocessado |
| 490 | Ovo, de galinha, inteiro, frito | Ovos e derivados | fritura |
| 540 | Feijoada | Alimentos preparados | prato com embutido |
| 527 | Baião de dois, arroz e feijão-de-corda | Alimentos preparados | prato com embutido |
| 528 | Barreado | Alimentos preparados | prato com embutido |
| 536 | Dobradinha | Alimentos preparados | prato com embutido |
| 543 | Maniçoba | Alimentos preparados | prato com embutido |
| 548 | Sarapatel | Alimentos preparados | prato com embutido |
| 121 | Farinha, de mandioca, crua | Verduras, hortaliças e derivados | farinha |
| 456 | Leite, de vaca, desnatado, pó | Leite e derivados | pó |
| 459 | Leite, de vaca, integral, pó | Leite e derivados | pó |

## Apêndice B — Sugestões do cobrir antes e depois

Medidas com o código da `main` (8f3ffa2) e o desta frente depois da rodada de revisão, com a chave desligada e a porção máxima de 200 g. Riscado:
saiu pela regra (o motivo vem ao lado). O que sumiu sem risco foi empurrado para fora das 5 por quem entrou, ou perdeu a frente por ser pouco usual (jurubeba e jamelão, D-197) ou por ser corte gordo (D-199b). Porções menores que antes vêm da porção máxima por grupo (seção 7.1), e o sódio não se cobre (D-199d).

### Plano de exemplo (Maria, 28 anos, gasto de 1.620 kcal)

Onze dos 16 micronutrientes já atingem a meta no exemplo e não têm o que cobrir. *(Retrato de 15/10/2026; desde a `vitaminas-usda`, 20/10/2026, a adequação tem 21 linhas.)* Os cinco com falta:

| Nutriente | Falta | Antes | Depois |
|---|---|---|---|
| Cálcio | 244 mg | Rúcula, crua (200 g); Iogurte, natural, desnatado (160 g); Sardinha, assada (60 g); ~~Limão, tahiti, cru (200 g)~~ *tempero ou molho*; Soja, queijo (tofu) (200 g) | Rúcula, crua (200 g); Iogurte, natural, desnatado (160 g); Sardinha, assada (60 g); Soja, queijo (tofu) (200 g); Laranja, da terra, crua (200 g) |
| Ferro | 7,53 mg | Alface, roxa, crua (200 g); ~~Tucupi, com pimenta-de-cheiro (200 g)~~ *tempero ou molho*; ~~Azeitona, preta, conserva (140 g)~~ *ultraprocessado*; ~~Bebida isotônica, sabores variados (200 g)~~ *bebida adoçada*; Soja, queijo (tofu) (200 g) | Alface, roxa, crua (200 g); Pão, glúten, forma (50 g); Soja, queijo (tofu) (200 g); Carne, bovina, maminha, grelhada (200 g); Estrogonofe de carne (200 g) |
| Sódio | 566 mg | ~~Caldo de carne, tablete (5 g)~~ *ultraprocessado*; Palmito, juçara, em conserva (115 g); ~~Tremoço, em conserva (35 g)~~ *ultraprocessado*; ~~Arroz carreteiro (35 g)~~ *prato com embutido*; ~~Azeitona, verde, conserva (45 g)~~ *ultraprocessado* | — *O sódio não se cobre com alimento: o sal de cozinha e os temperos já completam o dia.* |
| Vitamina A | 38 µg | Abóbora, menina brasileira, crua (10 g); Salada, de legumes, cozida no vapor (15 g); Manga, Palmer, crua (10 g); Pupunha, cozida (10 g); Milho, verde, enlatado, drenado (160 g) | Abóbora, menina brasileira, crua (10 g); Salada, de legumes, cozida no vapor (15 g); Manga, Palmer, crua (10 g); Pupunha, cozida (10 g); Milho, verde, enlatado, drenado (160 g) |
| Piridoxina (B6) | 0,39 mg | ~~Alfavaca, crua (70 g)~~ *tempero ou molho*; ~~Cereais, mingau, milho, infantil (10 g)~~ *ultraprocessado*; ~~Cerveja, pilsen 2 (200 g)~~ *bebida alcoólica*; Jamelão, cru (200 g); ~~Frango, filé, à milanesa (75 g)~~ *fritura* | Catalonha, crua (110 g); Pão, de soja (50 g); Banana, pacova, crua (200 g); Salada, de legumes, cozida no vapor (200 g); Carne, bovina, maminha, grelhada (200 g) |

### Mesma paciente, plano vazio (os 16 com falta)

| Nutriente | Falta | Antes | Depois |
|---|---|---|---|
| Cálcio | 900 mg | Rúcula, crua (200 g); Iogurte, natural, desnatado (200 g); Sardinha, assada (200 g); ~~Limão, tahiti, cru (200 g)~~ *tempero ou molho*; Soja, queijo (tofu) (200 g) | Rúcula, crua (200 g); Iogurte, natural, desnatado (200 g); Sardinha, assada (200 g); Soja, queijo (tofu) (200 g); Laranja, da terra, crua (200 g) |
| Ferro | 16 mg | Alface, roxa, crua (200 g); ~~Tucupi, com pimenta-de-cheiro (200 g)~~ *tempero ou molho*; ~~Azeitona, preta, conserva (200 g)~~ *ultraprocessado*; Pão, glúten, forma (200 g); Soja, queijo (tofu) (200 g) | Alface, roxa, crua (200 g); Pão, glúten, forma (50 g); Soja, queijo (tofu) (200 g); Carne, bovina, maminha, grelhada (200 g); Estrogonofe de carne (200 g) |
| Magnésio | 279 mg | Espinafre, Nova Zelândia, cru (200 g); ~~Tucupi, com pimenta-de-cheiro (200 g)~~ *tempero ou molho*; Feijão, rosinha, cozido (200 g); Mamão, Papaia, cru (200 g); Castanha-do-Brasil, crua (80 g) | Espinafre, Nova Zelândia, cru (200 g); Linhaça, semente (30 g); Feijão, rosinha, cozido (200 g); Mamão, Papaia, cru (200 g); Salada, de legumes, cozida no vapor (200 g) |
| Zinco | 7,20 mg | Agrião, cru (200 g); Carne, bovina, acém, moído, cozido (90 g); ~~Tucupi, com pimenta-de-cheiro (200 g)~~ *tempero ou molho*; ~~Cereal matinal, milho, açúcar (85 g)~~ *doce*; Feijão, rosinha, cozido (200 g) | Agrião, cru (200 g); Carne, bovina, acém, moído, cozido (90 g); Charuto, de repolho (200 g); Feijão, rosinha, cozido (200 g); Camarão, Rio Grande, grande, cozido (200 g) |
| Potássio | 2.340 mg | Chicória, crua (200 g); ~~Café, infusão 10% (200 g)~~ *café ou chá*; ~~Tucupi, com pimenta-de-cheiro (200 g)~~ *tempero ou molho*; Jamelão, cru (200 g); Iogurte, natural, desnatado (200 g) | Chicória, crua (200 g); Romã, crua (200 g); Coco, água de (200 g); Salada, de legumes, cozida no vapor (200 g); Iogurte, natural, desnatado (200 g) |
| Fósforo | 630 mg | Abadejo, filé, congelado, grelhado (110 g); Alface, roxa, crua (200 g); Iogurte, natural, desnatado (200 g); ~~Presunto, sem capa de gordura (200 g)~~ *embutido*; Camarão à baiana (200 g) | Abadejo, filé, congelado, grelhado (110 g); Alface, roxa, crua (200 g); Iogurte, natural, desnatado (200 g); Camarão à baiana (200 g); Soja, queijo (tofu) (200 g) |
| Sódio | 1.350 mg | ~~Caldo de carne, tablete (10 g)~~ *ultraprocessado*; Palmito, juçara, em conserva (200 g); ~~Tremoço, em conserva (75 g)~~ *ultraprocessado*; ~~Arroz carreteiro (85 g)~~ *prato com embutido*; ~~Azeitona, verde, conserva (105 g)~~ *ultraprocessado* | — *O sódio não se cobre com alimento: o sal de cozinha e os temperos já completam o dia.* |
| Cobre | 0,81 mg | Mamão, Formosa, cru (60 g); Repolho, roxo, cru (90 g); Charuto, de repolho (60 g); Quibe, assado (160 g); Castanha-de-caju, torrada, salgada (45 g) | Mamão, Formosa, cru (60 g); Repolho, roxo, cru (90 g); Charuto, de repolho (60 g); Quibe, assado (160 g); Castanha-de-caju, torrada, salgada (30 g) |
| Manganês | 1,62 mg | Palmito, juçara, em conserva (15 g); ~~Chá, mate, infusão 5% (200 g)~~ *café ou chá*; Açaí, polpa, congelada (30 g); ~~Tucupi, com pimenta-de-cheiro (200 g)~~ *tempero ou molho*; ~~Melado (65 g)~~ *doce* | Palmito, juçara, em conserva (15 g); Açaí, polpa, congelada (30 g); Coco, água de (200 g); Feijão, rosinha, cozido (200 g); Salada, de legumes, cozida no vapor (200 g) |
| Vitamina A | 630 µg | Abóbora, menina brasileira, crua (115 g); Salada, de legumes, cozida no vapor (200 g); Manga, Palmer, crua (165 g); Pupunha, cozida (145 g); ~~Pescada, branca, frita (200 g)~~ *fritura* | Abóbora, menina brasileira, crua (115 g); Salada, de legumes, cozida no vapor (200 g); Manga, Palmer, crua (165 g); Pupunha, cozida (145 g); Carne, bovina, fígado, grelhado (5 g) |
| Vitamina C | 68 mg | Acerola, polpa, congelada (15 g); Pimentão, amarelo, cru (35 g); ~~Tucupi, com pimenta-de-cheiro (150 g)~~ *tempero ou molho*; ~~Cereais, mingau, milho, infantil (65 g)~~ *ultraprocessado*; Pinhão, cozido (200 g) | Acerola, polpa, congelada (15 g); Pimentão, amarelo, cru (35 g); Salada, de legumes, cozida no vapor (200 g); Pinhão, cozido (200 g); Ervilha, em vagem (200 g) |
| Tiamina (B1) | 0,99 mg | ~~Chá, preto, infusão 5% (35 g)~~ *café ou chá*; Alface, crespa, crua (200 g); ~~Limão, tahiti, cru (200 g)~~ *tempero ou molho*; ~~Cereais, mingau, milho, infantil (30 g)~~ *ultraprocessado*; ~~Presunto, sem capa de gordura (200 g)~~ *embutido* | Alface, crespa, crua (200 g); Cupuaçu, cru (200 g); Porco, lombo, assado (135 g); Ervilha, em vagem (200 g); Biscoito, salgado, cream cracker (50 g) |
| Riboflavina (B2) | 0,99 mg | ~~Chá, preto, infusão 5% (200 g)~~ *café ou chá*; Agrião, cru (200 g); Iogurte, natural, desnatado (200 g); Acerola, polpa, congelada (200 g); ~~Cereal matinal, milho, açúcar (90 g)~~ *doce* | Agrião, cru (200 g); Iogurte, natural, desnatado (200 g); Acerola, polpa, congelada (200 g); Pão, trigo, francês (50 g); Ovo, de galinha, inteiro, cozido/10minutos (200 g) |
| Piridoxina (B6) | 1,17 mg | ~~Alfavaca, crua (200 g)~~ *tempero ou molho*; ~~Cereais, mingau, milho, infantil (25 g)~~ *ultraprocessado*; ~~Cerveja, pilsen 2 (200 g)~~ *bebida alcoólica*; Jamelão, cru (200 g); ~~Paçoca, amendoim (100 g)~~ *doce* | Catalonha, crua (200 g); Pão, de soja (50 g); Banana, pacova, crua (200 g); Carne, bovina, maminha, grelhada (200 g); Castanha-de-caju, torrada, salgada (30 g) |
| Niacina (B3) | 13 mg | Frango, peito, sem pele, grelhado (55 g); Alface, crespa, crua (200 g); Cupuaçu, cru (200 g); Cação, posta, cozida (130 g); ~~Cerveja, pilsen 2 (200 g)~~ *bebida alcoólica* | Frango, peito, sem pele, grelhado (55 g); Alface, crespa, crua (200 g); Cupuaçu, cru (200 g); Cação, posta, cozida (130 g); Feijão, rosinha, cozido (200 g) |
| Fibra alimentar | 23 g | Jambo, cru (200 g); Jurubeba, crua (95 g); Feijão, jalo, cozido (165 g); Pinhão, cozido (145 g); Salada, de legumes, cozida no vapor (200 g) | Jambo, cru (200 g); Jiló, cru (200 g); Feijão, jalo, cozido (165 g); Pinhão, cozido (145 g); Salada, de legumes, cozida no vapor (200 g) |

## Apêndice C — Para a revisão da estudante: o que ficou dentro e o que pode estar rígido demais

O Apêndice A só mostra o que saiu. Aqui estão os casos discutíveis dos dois lados. Mudar um deles é mudar uma linha da
regra e a lista fixa do teste.

*(20/10/2026)* A parceira respondeu (spec `conduta-da-nutricionista`): tudo do C.2 voltou (D-290); do C.1, saíram
tapioca com manteiga, pão de queijo assado, pipoca com óleo e cream cracker (D-291); o resto do C.1 fica, porque
preparações regionais e o resto "vão da conduta do nutricionista". As trocas do C.3 mudaram (D-294 a D-296): a coluna
"Em 20/10" mostra o que a folha imprime agora.

### C.1 Ficaram dentro (o sistema ainda propõe sozinho)

| Id | Alimento | Por que revisar |
|---|---|---|
| 554, 531 | Vatapá; Camarão à baiana | levam dendê e leite de coco, que sozinhos são gordura de adição |
| 537, 538, 556 | Estrogonofe de carne e de frango; Yakisoba | creme de leite; sódio do shoyu. Aparecem para ferro e sódio |
| 131 | Mandioca, farofa, temperada | gordura do preparo; às vezes leva bacon |
| 309 | Pescada, filé, molho escabeche | no escabeche clássico o peixe é frito antes |
| 335, 342, 344, 347, 353, 361, 381, 429, 430 | Cortes com gordura, costela, cupim, bisteca | no cobrir, até 100 g e depois dos cortes magros (D-199b) |
| 392, 396, 406, 411 | Frango com pele | no cobrir, até 100 g e depois do frango sem pele |
| 486, 487 | Ovo, clara e gema cozidas | prescritíveis, mas não trocam por ovo inteiro (CA-671) |
| 465, 468 | Queijo pasteurizado; Requeijão cremoso | ultraprocessados pela classificação NOVA; ficaram por uso comum |
| 551, 140, 61, 13 | Tapioca com manteiga; Pão de queijo assado; Pipoca com óleo; Biscoito cream cracker | decisões da seção 2.1. *(20/10: saíram, preparação que raramente se prescreve assim, D-291)* |
| 558, 587, 588 | Amendoim, amêndoa e castanha-de-caju torrados e salgados | no cobrir, até 30 g |
| 277, 319, 138, 139 | Atum e sardinha em óleo; palmitos em conserva | sódio |
| 471, 475, 476, 477 | Café e chás | o cobrir não usa como fonte, mas entram nas trocas de bebida (refrigerante troca por café) |
| 66, 69 | Abóbora menina e abóbora pescoço cruas | só existem cruas na base (D-199a); a folha marca "(peso cru)" |
| 104, 125, 126, 127, 147, 156, 162, 196, 241 | Caruru, broto de feijão, inhame, jiló, quiabo, taioba, vagem, fruta-pão e pequi crus | só existem crus na base (D-199a, re-revisão); comem-se cozidos. A taioba crua irrita a boca e o broto cru tem risco microbiológico (gestante) |
| 83, 134, 135 | Alho-poró, maxixe e mostarda crus | só existem crus; costumam ir cozidos |

### C.2 Ficaram fora e podem estar rígidos demais (decisão do dono e da estudante)

*(20/10/2026)* Todos voltaram a ser propostos (D-290), como segunda escolha e com porção máxima no cobrir (D-293).

| Id | Alimento | Motivo em 15/10 | Argumento para voltar |
|---|---|---|---|
| 260 | Azeite de oliva extra virgem | gordura de adição | prescrito com frequência; na folha fica sem trocas |
| 507, 498 | Mel; Chocolate meio amargo | doce | às vezes se prescrevem em porção pequena |
| 460 | Leite fermentado | bebida adoçada | probiótico, prescrito às vezes |
| 25 | Cereal matinal de milho sem açúcar | ultraprocessado | lanche comum |
| 338, 384 | Charque e carne seca cozidos | carne curada | base regional do Nordeste |
| 520, 521, 586 | Azeitonas; Tremoço em conserva | petisco em conserva | em porção pequena, fonte de gordura boa |
| 490 | Ovo frito | fritura | preparo comum do ovo |
| 540, 527 | Feijoada; Baião de dois | prato com embutido | pratos do dia a dia em algumas regiões |
| 528, 536, 543, 548 | Barreado; Dobradinha; Maniçoba; Sarapatel | prato com toucinho, charque ou miúdos | pratos regionais |
| 121 | Farinha de mandioca crua (farinha d'água) | farinha | no Norte se come como está; a torrada ficou dentro |
| 456, 459 | Leite em pó | pó | usado reconstituído |

### C.3 Trocas impressas que a parceira deve olhar (revisão final da integração, 15/10/2026)

Todas passam na regra (são prescritíveis), mas não são a troca mais comum. Geradas com o código já junto: a folha pede
4 trocas e mostra as 2 primeiras que sobram depois do corte por nome (CB-188 da `impressao-do-plano`). O nome e a
quantidade são os que a folha imprime. *(20/10)* A coluna "Em 20/10" traz só o nome: a quantidade agora segue a escolha
de cada plano entre medida caseira e gramas (spec `conduta-da-nutricionista`, D-297).

| Alimento do plano (id) | Troca impressa (id) | Por que olhar | Em 20/10 |
|---|---|---|---|
| Peito de frango grelhado sem pele (410) | Quibe assado (440), 2 unidades e meia · 117 g | prato de carne moída com trigo no lugar de carne magra | Peito de frango cozido sem pele (408); Contra-filé grelhado sem gordura (346) |
| Peito de frango grelhado sem pele (410) | Peito de frango cozido sem pele (408), 1 bife · 98 g | "bife" como medida de frango cozido | Peito de frango cozido sem pele (408); Contra-filé grelhado sem gordura (346) |
| Aveia em flocos (7) | Pipoca com óleo de soja sem sal (61), 4 conchas e meia | pipoca no lugar de aveia; medida estranha | Torrada de pão francês (63); Pão sovado (54) |
| Pão francês (53) | Torrada de pão francês (63), 7 unidades | quantidade alta de torradas | Pão de forma de milho (51); Aveia em flocos (7) |
| Iogurte natural (448) e Queijo minas frescal (461) | Leite de cabra (454) | leite pouco comum, e líquido no lugar de queijo | 448: Leite de cabra (454); Ricota (469) · 461: Requeijão cremoso (468); Leite de cabra (454) |
| Brócolis cozido (100) | Palmito juçara em conserva (138) | conserva, com sódio | Abobrinha italiana refogada (72); Abóbora moranga refogada (68) |
| Castanha-do-pará (589) | Castanha-de-caju torrada salgada (588) | com sal | Noz (597); Linhaça (594) |
| Arroz branco cozido (3) | Pamonha pré-cozida (47), 3 fatias · 112 g | entrou quando a folha passou a pedir 4 trocas; pamonha no lugar de arroz | Polenta pré-cozida (62); Pão de forma integral (52) |
| Maracujá (232) | Fruta-pão (peso cru) (196) | fruta que se come cozida no lugar de fruta crua | Fruta-pão (peso cru) (196); Manga Palmer (229) |
| Abacate (163), Polpa de açaí congelada (168) e Tucumã (253) | Pequi (peso cru) (241) | fruta que se come cozida, de uso regional | 163: Tucumã (253); Pequi (peso cru) (241) · 168: Abacate (163); Tucumã (253) · 253: Abacate (163); Pequi (peso cru) (241) |
