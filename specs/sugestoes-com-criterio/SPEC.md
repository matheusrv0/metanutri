# SPEC — Sugestões com critério: o MetaNutri só propõe o que se prescreve

Status: **pedida pelo dono em 15/10/2026; aprovação pelas telas antes de publicar.** A estudante de nutrição revisa os
Apêndices A e C antes da publicação.

**Rodada de revisão (15/10/2026, à tarde).** A revisão da frente achou furos de classificação (fruta "calda" sem o "em",
pó doce e sal com a chave ligada, pó fortificado, pratos com charque ou miúdos) e testes que conferiam a regra com ela
mesma. O coordenador decidiu ainda: versão crua de alimento que se come cozido não é proposta, troca de ovo e de verdura
cozida respeita a forma, porção máxima por grupo calórico no cobrir, e os itens "talvez rígidos demais" ficam fora mas
vão para o Apêndice C. As mudanças estão nas decisões e critérios marcados com *(revisão)* e na seção 7.

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
- **CA-657** · Dado o plano de exemplo (Maria, 28 anos), quando o cobrir é pedido para cada um dos 16 micronutrientes, então nenhuma sugestão é item fora da regra; o mesmo vale para o plano vazio da mesma paciente, em que os 16 têm falta.
- **CA-658** · Dado a lista de trocas de qualquer alimento da base, então nenhuma troca oferecida é item fora da regra, de nenhum nível.
- **CA-659** · Dado um item fora da rotina posto à mão no plano, então as trocas dele vêm só de alimentos prescritíveis do mesmo grupo e com o mesmo macro dominante (ovo frito troca por ovo cozido).
- **CA-660** · Dado um item fora da regra sem nenhum par prescritível no grupo (margarina, doce de leite), então ele não ganha trocas, e os outros alimentos do plano continuam com as suas.
- **CA-661** · Dado uma bebida alcoólica posta à mão no plano, então ela não ganha trocas.
- **CA-662** · Dado as listas padrão de sugestões por refeição (D-36), então todos os itens delas passam na regra.
- **CA-663** · Dado a busca de alimentos, então bebida alcoólica, doce e gordura continuam aparecendo: a escolha manual nunca é filtrada.
- **CA-664** · Dado a regra, então cada alimento fora dela tem um nível e um motivo, e *(revisão)* a lista de ids por motivo é a do Apêndice A, guardada fixa no teste (não só a contagem).
- **CA-665** *(revisão)* · Dado o cobrir com a chave ligada, então não aparecem café (em pó ou infusão), chá, capuccino, gelatina, sal, shoyu, tempero a base de sal nem fermento.
- **CA-666** *(revisão)* · Dado pó ou farinha fortificados (mingau tradicional em pó, creme de milho em pó, farinha de arroz enriquecida), então ficam fora da rotina, como o mingau infantil: a chave não os traz.
- **CA-667** *(revisão)* · Dado o cobrir dos 16 micronutrientes, no plano de exemplo e no plano vazio, com a chave ligada e desligada e com porção máxima de 50, 100 e 200 g, então nenhuma sugestão casa com o padrão fixo de texto do que nunca aparece (bebida alcoólica, refrigerante, isotônico, açúcar, calda, xarope, doce, fritura, margarina, óleo, manteiga, embutidos, sal, shoyu, fermento, café, chá, capuccino, gelatina, mingau e cereal fortificados); com a chave desligada, também não casa com o padrão de forma (pó, desidratado, farinha, fécula, polvilho e alimento cru que se come cozido). O padrão é escrito à mão no teste, sem usar a regra.
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

## Apêndice A — Alimentos que o MetaNutri deixa de propor sozinho

*(revisão)* Gerado a partir do código no fim da rodada de revisão; o teste do CA-664 guarda a mesma lista de ids.
307 dos 597 alimentos da base (182 deles o filtro antigo deixava sugerir). "Antes" diz o que o filtro antigo
fazia: *sugeria* (podia aparecer no cobrir e nas trocas) ou *já fora* (o CA-36a já tirava). Estão agrupados pelo motivo
que vale primeiro, na ordem: nunca, fora da rotina, forma de ingrediente. Todos continuam disponíveis pela busca.

### Nível 1 — Nunca

#### Bebida alcoólica (2)

| Id | Alimento | Categoria da TACO | Antes |
|---|---|---|---|
| 472 | Cana, aguardente 1 | Bebidas (alcoólicas e não alcoólicas) | sugeria |
| 474 | Cerveja, pilsen 2 | Bebidas (alcoólicas e não alcoólicas) | sugeria |

#### Sal, shoyu, tempero pronto ou fermento (6)

| Id | Alimento | Categoria da TACO | Antes |
|---|---|---|---|
| 513 | Fermento em pó, químico | Miscelâneas | já fora |
| 514 | Fermento, biológico, levedura, tablete | Miscelâneas | já fora |
| 516 | Sal, dietético | Miscelâneas | já fora |
| 517 | Sal, grosso | Miscelâneas | já fora |
| 518 | Shoyu | Miscelâneas | já fora |
| 519 | Tempero a base de sal | Miscelâneas | já fora |

### Nível 2 — Fora da rotina

#### Refrigerante, isotônico ou bebida adoçada (11)

| Id | Alimento | Categoria da TACO | Antes |
|---|---|---|---|
| 446 | Bebida láctea, pêssego | Leite e derivados | sugeria |
| 455 | Leite, de vaca, achocolatado | Leite e derivados | sugeria |
| 460 | Leite, fermentado | Leite e derivados | sugeria |
| 470 | Bebida isotônica, sabores variados | Bebidas (alcoólicas e não alcoólicas) | sugeria |
| 473 | Cana, caldo de | Bebidas (alcoólicas e não alcoólicas) | sugeria |
| 479 | Refrigerante, tipo água tônica | Bebidas (alcoólicas e não alcoólicas) | sugeria |
| 480 | Refrigerante, tipo cola | Bebidas (alcoólicas e não alcoólicas) | sugeria |
| 481 | Refrigerante, tipo guaraná | Bebidas (alcoólicas e não alcoólicas) | sugeria |
| 482 | Refrigerante, tipo laranja | Bebidas (alcoólicas e não alcoólicas) | sugeria |
| 483 | Refrigerante, tipo limão | Bebidas (alcoólicas e não alcoólicas) | sugeria |
| 512 | Capuccino, pó | Miscelâneas | já fora |

#### Doce, açúcar ou fruta em calda (52)

| Id | Alimento | Categoria da TACO | Antes |
|---|---|---|---|
| 8 | Biscoito, doce, maisena | Cereais e derivados | sugeria |
| 9 | Biscoito, doce, recheado com chocolate | Cereais e derivados | sugeria |
| 10 | Biscoito, doce, recheado com morango | Cereais e derivados | sugeria |
| 11 | Biscoito, doce, wafer, recheado de chocolate | Cereais e derivados | sugeria |
| 12 | Biscoito, doce, wafer, recheado de morango | Cereais e derivados | sugeria |
| 14 | Bolo, mistura para | Cereais e derivados | sugeria |
| 15 | Bolo, pronto, aipim | Cereais e derivados | sugeria |
| 16 | Bolo, pronto, chocolate | Cereais e derivados | sugeria |
| 17 | Bolo, pronto, coco | Cereais e derivados | sugeria |
| 18 | Bolo, pronto, milho | Cereais e derivados | sugeria |
| 20 | Canjica, com leite integral | Cereais e derivados | sugeria |
| 26 | Cereal matinal, milho, açúcar | Cereais e derivados | sugeria |
| 29 | Curau, milho verde | Cereais e derivados | sugeria |
| 30 | Curau, milho verde, mistura para | Cereais e derivados | sugeria |
| 167 | Açaí, polpa, com xarope de guaraná e glucose | Frutas e derivados | sugeria |
| 171 | Ameixa, calda, enlatada | Frutas e derivados | sugeria |
| 173 | Ameixa, em calda, enlatada, drenada | Frutas e derivados | sugeria |
| 176 | Banana, doce em barra | Frutas e derivados | sugeria |
| 195 | Figo, enlatado, em calda | Frutas e derivados | sugeria |
| 198 | Goiaba, doce em pasta | Frutas e derivados | sugeria |
| 199 | Goiaba, doce, cascão | Frutas e derivados | sugeria |
| 224 | Mamão, doce em calda, drenado | Frutas e derivados | sugeria |
| 227 | Mamão verde, doce em calda, drenado | Frutas e derivados | sugeria |
| 245 | Pêssego, enlatado, em calda | Frutas e derivados | sugeria |
| 450 | Iogurte, sabor abacaxi | Leite e derivados | sugeria |
| 451 | Iogurte, sabor morango | Leite e derivados | sugeria |
| 452 | Iogurte, sabor pêssego | Leite e derivados | sugeria |
| 453 | Leite, condensado | Leite e derivados | sugeria |
| 466 | Queijo, petit suisse, morango | Leite e derivados | sugeria |
| 491 | Achocolatado, pó | Produtos açucarados | já fora |
| 492 | Açúcar, cristal | Produtos açucarados | sugeria |
| 493 | Açúcar, mascavo | Produtos açucarados | sugeria |
| 494 | Açúcar, refinado | Produtos açucarados | sugeria |
| 495 | Chocolate, ao leite | Produtos açucarados | sugeria |
| 496 | Chocolate, ao leite, com castanha do Pará | Produtos açucarados | sugeria |
| 497 | Chocolate, ao leite, dietético | Produtos açucarados | sugeria |
| 498 | Chocolate, meio amargo | Produtos açucarados | sugeria |
| 499 | Cocada branca | Produtos açucarados | sugeria |
| 500 | Doce, de abóbora, cremoso | Produtos açucarados | sugeria |
| 501 | Doce, de leite, cremoso | Produtos açucarados | sugeria |
| 502 | Geléia, mocotó, natural | Produtos açucarados | sugeria |
| 503 | Glicose de milho | Produtos açucarados | sugeria |
| 504 | Maria mole | Produtos açucarados | sugeria |
| 505 | Maria mole, coco queimado | Produtos açucarados | sugeria |
| 506 | Marmelada | Produtos açucarados | sugeria |
| 507 | Mel, de abelha | Produtos açucarados | sugeria |
| 508 | Melado | Produtos açucarados | sugeria |
| 509 | Quindim | Produtos açucarados | sugeria |
| 510 | Rapadura | Produtos açucarados | sugeria |
| 515 | Gelatina, sabores variados, pó | Miscelâneas | já fora |
| 579 | Paçoca, amendoim | Leguminosas e derivados | sugeria |
| 580 | Pé-de-moleque, amendoim | Leguminosas e derivados | sugeria |

#### Óleo ou gordura de adição (22)

| Id | Alimento | Categoria da TACO | Antes |
|---|---|---|---|
| 259 | Azeite, de dendê | Gorduras e óleos | sugeria |
| 260 | Azeite, de oliva, extra virgem | Gorduras e óleos | sugeria |
| 261 | Manteiga, com sal | Gorduras e óleos | sugeria |
| 262 | Manteiga, sem sal | Gorduras e óleos | sugeria |
| 263 | Margarina, com óleo hidrogenado, com sal (65% de lipídeos) | Gorduras e óleos | sugeria |
| 264 | Margarina, com óleo hidrogenado, sem sal (80% de lipídeos) | Gorduras e óleos | sugeria |
| 265 | Margarina, com óleo interesterificado, com sal (65%de lipídeos) | Gorduras e óleos | sugeria |
| 266 | Margarina, com óleo interesterificado, sem sal (65% de lipídeos) | Gorduras e óleos | sugeria |
| 267 | Óleo, de babaçu | Gorduras e óleos | sugeria |
| 268 | Óleo, de canola | Gorduras e óleos | sugeria |
| 269 | Óleo, de girassol | Gorduras e óleos | sugeria |
| 270 | Óleo, de milho | Gorduras e óleos | sugeria |
| 271 | Óleo, de pequi | Gorduras e óleos | sugeria |
| 272 | Óleo, de soja | Gorduras e óleos | sugeria |
| 444 | Toucinho, cru | Carnes e derivados | já fora |
| 445 | Toucinho, frito | Carnes e derivados | sugeria |
| 447 | Creme de Leite | Leite e derivados | sugeria |
| 522 | Chantilly, spray, com gordura vegetal | Outros alimentos industrializados | sugeria |
| 523 | Leite, de coco | Outros alimentos industrializados | sugeria |
| 524 | Maionese, tradicional com ovos | Outros alimentos industrializados | sugeria |
| 545 | Salada, de legumes, com maionese | Alimentos preparados | sugeria |
| 547 | Salpicão, de frango | Alimentos preparados | sugeria |

#### Embutido, carne processada ou curada (20)

| Id | Alimento | Categoria da TACO | Antes |
|---|---|---|---|
| 323 | Apresuntado | Carnes e derivados | sugeria |
| 338 | Carne, bovina, charque, cozido | Carnes e derivados | sugeria |
| 339 | Carne, bovina, charque, cru | Carnes e derivados | já fora |
| 384 | Carne, bovina, seca, cozida | Carnes e derivados | sugeria |
| 385 | Carne, bovina, seca, crua | Carnes e derivados | já fora |
| 415 | Hambúrguer, bovino, cru | Carnes e derivados | já fora |
| 416 | Hambúrguer, bovino, frito | Carnes e derivados | sugeria |
| 417 | Hambúrguer, bovino, grelhado | Carnes e derivados | sugeria |
| 418 | Lingüiça, frango, crua | Carnes e derivados | já fora |
| 419 | Lingüiça, frango, frita | Carnes e derivados | sugeria |
| 420 | Lingüiça, frango, grelhada | Carnes e derivados | sugeria |
| 421 | Lingüiça, porco, crua | Carnes e derivados | já fora |
| 422 | Lingüiça, porco, frita | Carnes e derivados | sugeria |
| 423 | Lingüiça, porco, grelhada | Carnes e derivados | sugeria |
| 424 | Mortadela | Carnes e derivados | sugeria |
| 434 | Porco, orelha, salgada, crua | Carnes e derivados | já fora |
| 437 | Porco, rabo, salgado, cru | Carnes e derivados | já fora |
| 438 | Presunto, com capa de gordura | Carnes e derivados | sugeria |
| 439 | Presunto, sem capa de gordura | Carnes e derivados | sugeria |
| 443 | Salame | Carnes e derivados | sugeria |

#### Prato com embutido, toucinho, carne curada ou miúdos (9)

| Id | Alimento | Categoria da TACO | Antes |
|---|---|---|---|
| 526 | Arroz carreteiro | Alimentos preparados | sugeria |
| 527 | Baião de dois, arroz e feijão-de-corda | Alimentos preparados | sugeria |
| 528 | Barreado | Alimentos preparados | sugeria |
| 536 | Dobradinha | Alimentos preparados | sugeria |
| 539 | Feijão tropeiro mineiro | Alimentos preparados | sugeria |
| 540 | Feijoada | Alimentos preparados | sugeria |
| 543 | Maniçoba | Alimentos preparados | sugeria |
| 548 | Sarapatel | Alimentos preparados | sugeria |
| 555 | Virado à paulista | Alimentos preparados | sugeria |

#### Fritura ou salgado frito (31)

| Id | Alimento | Categoria da TACO | Antes |
|---|---|---|---|
| 55 | Pastel, de carne, cru | Cereais e derivados | já fora |
| 56 | Pastel, de carne, frito | Cereais e derivados | sugeria |
| 57 | Pastel, de queijo, cru | Cereais e derivados | já fora |
| 58 | Pastel, de queijo, frito | Cereais e derivados | sugeria |
| 59 | Pastel, massa, crua | Cereais e derivados | já fora |
| 60 | Pastel, massa, frita | Cereais e derivados | sugeria |
| 90 | Batata, frita, tipo chips, industrializada | Verduras, hortaliças e derivados | sugeria |
| 93 | Batata, inglesa, frita | Verduras, hortaliças e derivados | sugeria |
| 132 | Mandioca, frita | Verduras, hortaliças e derivados | sugeria |
| 281 | Cação, posta, com farinha de trigo, frita | Pescados e frutos do mar | sugeria |
| 286 | Camarão, Sete Barbas, sem cabeça, com casca, frito | Pescados e frutos do mar | sugeria |
| 297 | Lambari, congelado, frito | Pescados e frutos do mar | sugeria |
| 299 | Manjuba, com farinha de trigo, frita | Pescados e frutos do mar | sugeria |
| 300 | Manjuba, frita | Pescados e frutos do mar | sugeria |
| 303 | Merluza, filé, frito | Pescados e frutos do mar | sugeria |
| 305 | Pescada, branca, frita | Pescados e frutos do mar | sugeria |
| 306 | Pescada, filé, com farinha de trigo, frito | Pescados e frutos do mar | sugeria |
| 308 | Pescada, filé, frito | Pescados e frutos do mar | sugeria |
| 320 | Sardinha, frita | Pescados e frutos do mar | sugeria |
| 331 | Carne, bovina, almôndegas, fritas | Carnes e derivados | sugeria |
| 340 | Carne, bovina, contra-filé, à milanesa | Carnes e derivados | sugeria |
| 386 | Coxinha de frango, frita | Carnes e derivados | sugeria |
| 387 | Croquete, de carne, cru | Carnes e derivados | já fora |
| 388 | Croquete, de carne, frito | Carnes e derivados | sugeria |
| 401 | Frango, filé, à milanesa | Carnes e derivados | sugeria |
| 428 | Porco, bisteca, frita | Carnes e derivados | sugeria |
| 442 | Quibe, frito | Carnes e derivados | sugeria |
| 490 | Ovo, de galinha, inteiro, frito | Ovos e derivados | sugeria |
| 525 | Acarajé | Alimentos preparados | sugeria |
| 529 | Bife à cavalo, com contra filé | Alimentos preparados | sugeria |
| 530 | Bolinho de arroz | Alimentos preparados | sugeria |

#### Ultraprocessado, salgadinho ou petisco em conserva (16)

| Id | Alimento | Categoria da TACO | Antes |
|---|---|---|---|
| 23 | Cereais, mingau, milho, infantil | Cereais e derivados | sugeria |
| 24 | Cereais, mistura para vitamina, trigo, cevada e aveia | Cereais e derivados | sugeria |
| 25 | Cereal matinal, milho | Cereais e derivados | sugeria |
| 28 | Creme de milho, pó | Cereais e derivados | já fora |
| 31 | Farinha, de arroz, enriquecida | Cereais e derivados | já fora |
| 36 | Farinha, láctea, de cereais | Cereais e derivados | sugeria |
| 39 | Macarrão, instantâneo | Cereais e derivados | sugeria |
| 46 | Mingau tradicional, pó | Cereais e derivados | já fora |
| 99 | Biscoito, polvilho doce | Verduras, hortaliças e derivados | sugeria |
| 324 | Caldo de carne, tablete | Carnes e derivados | sugeria |
| 325 | Caldo de galinha, tablete | Carnes e derivados | sugeria |
| 389 | Empada de frango, pré-cozida, assada | Carnes e derivados | sugeria |
| 390 | Empada, de frango, pré-cozida | Carnes e derivados | sugeria |
| 520 | Azeitona, preta, conserva | Outros alimentos industrializados | sugeria |
| 521 | Azeitona, verde, conserva | Outros alimentos industrializados | sugeria |
| 586 | Tremoço, em conserva | Leguminosas e derivados | sugeria |

### Nível 3 — Forma de ingrediente (a chave do cobrir libera)

#### Ingrediente da categoria Miscelâneas (café em pó) (1)

| Id | Alimento | Categoria da TACO | Antes |
|---|---|---|---|
| 511 | Café, pó, torrado | Miscelâneas | já fora |

#### Produto em pó ou desidratado (5)

| Id | Alimento | Categoria da TACO | Antes |
|---|---|---|---|
| 27 | Creme de arroz, pó | Cereais e derivados | já fora |
| 114 | Coentro, folhas desidratadas | Verduras, hortaliças e derivados | já fora |
| 456 | Leite, de vaca, desnatado, pó | Leite e derivados | já fora |
| 459 | Leite, de vaca, integral, pó | Leite e derivados | já fora |
| 583 | Soja, extrato solúvel, pó | Leguminosas e derivados | já fora |

#### Farinha, amido ou fécula de uso culinário (12)

| Id | Alimento | Categoria da TACO | Antes |
|---|---|---|---|
| 32 | Farinha, de centeio, integral | Cereais e derivados | já fora |
| 33 | Farinha, de milho, amarela | Cereais e derivados | já fora |
| 34 | Farinha, de rosca | Cereais e derivados | já fora |
| 35 | Farinha, de trigo | Cereais e derivados | já fora |
| 42 | Milho, amido, cru | Cereais e derivados | já fora |
| 43 | Milho, fubá, cru | Cereais e derivados | já fora |
| 121 | Farinha, de mandioca, crua | Verduras, hortaliças e derivados | já fora |
| 123 | Farinha, de puba | Verduras, hortaliças e derivados | já fora |
| 124 | Fécula, de mandioca | Verduras, hortaliças e derivados | sugeria |
| 146 | Polvilho, doce | Verduras, hortaliças e derivados | sugeria |
| 581 | Soja, farinha | Leguminosas e derivados | já fora |
| 592 | Farinha, de mesocarpo de babaçu, crua | Nozes e sementes | já fora |

#### Versão crua de alimento que se come cozido (106)

| Id | Alimento | Categoria da TACO | Antes |
|---|---|---|---|
| 2 | Arroz, integral, cru | Cereais e derivados | já fora |
| 4 | Arroz, tipo 1, cru | Cereais e derivados | já fora |
| 6 | Arroz, tipo 2, cru | Cereais e derivados | já fora |
| 19 | Canjica, branca, crua | Cereais e derivados | já fora |
| 38 | Lasanha, massa fresca, crua | Cereais e derivados | já fora |
| 40 | Macarrão, trigo, cru | Cereais e derivados | já fora |
| 41 | Macarrão, trigo, cru, com ovos | Cereais e derivados | já fora |
| 44 | Milho, verde, cru | Cereais e derivados | já fora |
| 65 | Abóbora, cabotian, crua | Verduras, hortaliças e derivados | sugeria |
| 67 | Abóbora, moranga, crua | Verduras, hortaliças e derivados | sugeria |
| 87 | Batata, baroa, crua | Verduras, hortaliças e derivados | sugeria |
| 89 | Batata, doce, crua | Verduras, hortaliças e derivados | sugeria |
| 92 | Batata, inglesa, crua | Verduras, hortaliças e derivados | sugeria |
| 96 | Berinjela, crua | Verduras, hortaliças e derivados | sugeria |
| 103 | Cará, cru | Verduras, hortaliças e derivados | sugeria |
| 104 | Caruru, cru | Verduras, hortaliças e derivados | sugeria |
| 113 | Chuchu, cru | Verduras, hortaliças e derivados | sugeria |
| 125 | Feijão, broto, cru | Verduras, hortaliças e derivados | sugeria |
| 126 | Inhame, cru | Verduras, hortaliças e derivados | sugeria |
| 127 | Jiló, cru | Verduras, hortaliças e derivados | sugeria |
| 130 | Mandioca, crua | Verduras, hortaliças e derivados | sugeria |
| 141 | Pão, de queijo, cru | Verduras, hortaliças e derivados | sugeria |
| 147 | Quiabo, cru | Verduras, hortaliças e derivados | sugeria |
| 156 | Taioba, crua | Verduras, hortaliças e derivados | sugeria |
| 162 | Vagem, crua | Verduras, hortaliças e derivados | sugeria |
| 196 | Fruta-pão, crua | Frutas e derivados | sugeria |
| 241 | Pequi, cru | Frutas e derivados | sugeria |
| 275 | Abadejo, filé, congelado, cru | Pescados e frutos do mar | já fora |
| 278 | Atum, fresco, cru | Pescados e frutos do mar | já fora |
| 279 | Bacalhau, salgado, cru | Pescados e frutos do mar | já fora |
| 283 | Cação, posta, crua | Pescados e frutos do mar | já fora |
| 285 | Camarão, Rio Grande, grande, cru | Pescados e frutos do mar | já fora |
| 288 | Corimba, cru | Pescados e frutos do mar | já fora |
| 291 | Corvina de água doce, crua | Pescados e frutos do mar | já fora |
| 292 | Corvina do mar, crua | Pescados e frutos do mar | já fora |
| 295 | Dourada de água doce, fresca | Pescados e frutos do mar | sugeria |
| 296 | Lambari, congelado, cru | Pescados e frutos do mar | já fora |
| 298 | Lambari, fresco, cru | Pescados e frutos do mar | já fora |
| 302 | Merluza, filé, cru | Pescados e frutos do mar | já fora |
| 304 | Pescada, branca, crua | Pescados e frutos do mar | já fora |
| 307 | Pescada, filé, cru | Pescados e frutos do mar | já fora |
| 310 | Pescadinha, crua | Pescados e frutos do mar | já fora |
| 312 | Pintado, cru | Pescados e frutos do mar | já fora |
| 314 | Porquinho, cru | Pescados e frutos do mar | já fora |
| 316 | Salmão, sem pele, fresco, cru | Pescados e frutos do mar | já fora |
| 321 | Sardinha, inteira, crua | Pescados e frutos do mar | já fora |
| 322 | Tucunaré, filé, congelado, cru | Pescados e frutos do mar | já fora |
| 327 | Carne, bovina, acém, moído, cru | Carnes e derivados | já fora |
| 329 | Carne, bovina, acém, sem gordura, cru | Carnes e derivados | já fora |
| 330 | Carne, bovina, almôndegas, cruas | Carnes e derivados | sugeria |
| 333 | Carne, bovina, bucho, cru | Carnes e derivados | já fora |
| 334 | Carne, bovina, capa de contra-filé, com gordura, crua | Carnes e derivados | já fora |
| 336 | Carne, bovina, capa de contra-filé, sem gordura, crua | Carnes e derivados | já fora |
| 341 | Carne, bovina, contra-filé de costela, cru | Carnes e derivados | já fora |
| 343 | Carne, bovina, contra-filé, com gordura, cru | Carnes e derivados | já fora |
| 345 | Carne, bovina, contra-filé, sem gordura, cru | Carnes e derivados | já fora |
| 348 | Carne, bovina, costela, crua | Carnes e derivados | já fora |
| 350 | Carne, bovina, coxão duro, sem gordura, cru | Carnes e derivados | já fora |
| 352 | Carne, bovina, coxão mole, sem gordura, cru | Carnes e derivados | já fora |
| 354 | Carne, bovina, cupim, cru | Carnes e derivados | já fora |
| 355 | Carne, bovina, fígado, cru | Carnes e derivados | já fora |
| 357 | Carne, bovina, filé mingnon, sem gordura, cru | Carnes e derivados | já fora |
| 360 | Carne, bovina, flanco, sem gordura, cru | Carnes e derivados | já fora |
| 362 | Carne, bovina, fraldinha, com gordura, crua | Carnes e derivados | já fora |
| 364 | Carne, bovina, lagarto, cru | Carnes e derivados | já fora |
| 366 | Carne, bovina, língua, crua | Carnes e derivados | já fora |
| 367 | Carne, bovina, maminha, crua | Carnes e derivados | já fora |
| 369 | Carne, bovina, miolo de alcatra, sem gordura, cru | Carnes e derivados | já fora |
| 372 | Carne, bovina, músculo, sem gordura, cru | Carnes e derivados | já fora |
| 373 | Carne, bovina, paleta, com gordura, crua | Carnes e derivados | já fora |
| 375 | Carne, bovina, paleta, sem gordura, crua | Carnes e derivados | já fora |
| 376 | Carne, bovina, patinho, sem gordura, cru | Carnes e derivados | já fora |
| 379 | Carne, bovina, peito, sem gordura, cru | Carnes e derivados | já fora |
| 380 | Carne, bovina, picanha, com gordura, crua | Carnes e derivados | já fora |
| 382 | Carne, bovina, picanha, sem gordura, crua | Carnes e derivados | já fora |
| 391 | Frango, asa, com pele, crua | Carnes e derivados | já fora |
| 394 | Frango, coração, cru | Carnes e derivados | já fora |
| 397 | Frango, coxa, com pele, crua | Carnes e derivados | já fora |
| 399 | Frango, coxa, sem pele, crua | Carnes e derivados | já fora |
| 400 | Frango, fígado, cru | Carnes e derivados | já fora |
| 402 | Frango, inteiro, com pele, cru | Carnes e derivados | já fora |
| 405 | Frango, inteiro, sem pele, cru | Carnes e derivados | já fora |
| 407 | Frango, peito, com pele, cru | Carnes e derivados | já fora |
| 409 | Frango, peito, sem pele, cru | Carnes e derivados | já fora |
| 412 | Frango, sobrecoxa, com pele, crua | Carnes e derivados | já fora |
| 414 | Frango, sobrecoxa, sem pele, crua | Carnes e derivados | já fora |
| 426 | Peru, congelado, cru | Carnes e derivados | já fora |
| 427 | Porco, bisteca, crua | Carnes e derivados | já fora |
| 431 | Porco, costela, crua | Carnes e derivados | já fora |
| 433 | Porco, lombo, cru | Carnes e derivados | já fora |
| 436 | Porco, pernil, cru | Carnes e derivados | já fora |
| 441 | Quibe, cru | Carnes e derivados | já fora |
| 485 | Ovo, de codorna, inteiro, cru | Ovos e derivados | já fora |
| 489 | Ovo, de galinha, inteiro, cru | Ovos e derivados | já fora |
| 557 | Amendoim, grão, cru | Leguminosas e derivados | já fora |
| 562 | Feijão, carioca, cru | Leguminosas e derivados | já fora |
| 564 | Feijão, fradinho, cru | Leguminosas e derivados | já fora |
| 566 | Feijão, jalo, cru | Leguminosas e derivados | já fora |
| 568 | Feijão, preto, cru | Leguminosas e derivados | já fora |
| 570 | Feijão, rajado, cru | Leguminosas e derivados | já fora |
| 572 | Feijão, rosinha, cru | Leguminosas e derivados | já fora |
| 574 | Feijão, roxo, cru | Leguminosas e derivados | já fora |
| 575 | Grão-de-bico, cru | Leguminosas e derivados | já fora |
| 576 | Guandu, cru | Leguminosas e derivados | já fora |
| 578 | Lentilha, crua | Leguminosas e derivados | já fora |
| 585 | Tremoço, cru | Leguminosas e derivados | já fora |

#### Tempero, molho ou concentrado (14)

| Id | Alimento | Categoria da TACO | Antes |
|---|---|---|---|
| 81 | Alfavaca, crua | Verduras, hortaliças e derivados | sugeria |
| 82 | Alho, cru | Verduras, hortaliças e derivados | sugeria |
| 108 | Cebolinha, crua | Verduras, hortaliças e derivados | sugeria |
| 133 | Manjericão, cru | Verduras, hortaliças e derivados | sugeria |
| 153 | Salsa, crua | Verduras, hortaliças e derivados | sugeria |
| 158 | Tomate, extrato | Verduras, hortaliças e derivados | sugeria |
| 159 | Tomate, molho industrializado | Verduras, hortaliças e derivados | sugeria |
| 160 | Tomate, purê | Verduras, hortaliças e derivados | sugeria |
| 188 | Caju, suco concentrado, envasado | Frutas e derivados | sugeria |
| 220 | Limão, tahiti, cru | Frutas e derivados | sugeria |
| 234 | Maracujá, suco concentrado, envasado | Frutas e derivados | sugeria |
| 258 | Uva, suco concentrado, envasado | Frutas e derivados | sugeria |
| 535 | Cuxá, molho | Alimentos preparados | sugeria |
| 552 | Tucupi, com pimenta-de-cheiro | Alimentos preparados | sugeria |

## Apêndice B — Sugestões do cobrir antes e depois

Medidas com o código da `main` (8f3ffa2) e o desta frente depois da rodada de revisão, com a chave desligada e a porção máxima de 200 g. Riscado:
saiu pela regra (o motivo vem ao lado). O que sumiu sem risco foi empurrado para fora das 5 por quem entrou, ou perdeu a frente por ser pouco usual (jurubeba e jamelão, D-197) ou por ser corte gordo (D-199b). Porções menores que antes vêm da porção máxima por grupo (seção 7.1), e o sódio não se cobre (D-199d).

### Plano de exemplo (Maria, 28 anos, gasto de 1.620 kcal)

Onze dos 16 micronutrientes já atingem a meta no exemplo e não têm o que cobrir. Os cinco com falta:

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
| Fibra alimentar | 23 g | Jambo, cru (200 g); Jurubeba, crua (95 g); Feijão, jalo, cozido (165 g); Pinhão, cozido (145 g); Salada, de legumes, cozida no vapor (200 g) | Jambo, cru (200 g); Alface, crespa, crua (200 g); Feijão, jalo, cozido (165 g); Pinhão, cozido (145 g); Salada, de legumes, cozida no vapor (200 g) |

## Apêndice C — Para a revisão da estudante: o que ficou dentro e o que pode estar rígido demais

O Apêndice A só mostra o que saiu. Aqui estão os casos discutíveis dos dois lados. Mudar um deles é mudar uma linha da
regra e a lista fixa do teste.

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
| 551, 140, 61, 13 | Tapioca com manteiga; Pão de queijo assado; Pipoca com óleo; Biscoito cream cracker | decisões da seção 2.1 |
| 558, 587, 588 | Amendoim, amêndoa e castanha-de-caju torrados e salgados | no cobrir, até 30 g |
| 277, 319, 138, 139 | Atum e sardinha em óleo; palmitos em conserva | sódio |
| 471, 475, 476, 477 | Café e chás | o cobrir não usa como fonte, mas entram nas trocas de bebida (refrigerante troca por café) |
| 66, 69 | Abóbora menina e abóbora pescoço cruas | só existem cruas na base (D-199a); a folha marca "(peso cru)" |
| 104, 125, 126, 127, 147, 156, 162, 196, 241 | Caruru, broto de feijão, inhame, jiló, quiabo, taioba, vagem, fruta-pão e pequi crus | só existem crus na base (D-199a, re-revisão); comem-se cozidos. A taioba crua irrita a boca e o broto cru tem risco microbiológico (gestante) |
| 83, 134, 135 | Alho-poró, maxixe e mostarda crus | só existem crus; costumam ir cozidos |

### C.2 Ficaram fora e podem estar rígidos demais (decisão do dono e da estudante)

| Id | Alimento | Motivo hoje | Argumento para voltar |
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
