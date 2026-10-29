# Lista de conferência da base ampliada

Spec `base-ampliada`, CA-1711. 217 alimentos comuns no consultório brasileiro que a TACO não tem, montada antes
da curadoria (29/10/2026). **199 cobertos e 18 faltando**, cada um com o motivo. O teste
`src/data/base-ampliada-conferencia.test.ts` tem a mesma lista e confere, pela busca da Tabela de alimentos, que os
cobertos são achados e os que faltam não são (se um entrar depois, o teste avisa para atualizar a lista).

### Peixes e frutos do mar

| Alimento | Busca | Situação |
|---|---|---|
| Tilápia | tilápia | coberto: Tilápia, filé, grelhada; Tilápia, filé, crua |
| Panga | panga | **falta**: não existe no USDA SR Legacy nem na Foundation |
| Polaca-do-alasca | polaca | coberto: Polaca-do-alasca, filé, crua; Polaca-do-alasca, filé, cozida (+1) |
| Linguado | linguado | coberto: Linguado, filé, grelhado; Linguado, filé, cru |
| Truta | truta | coberto: Truta, grelhada; Truta, crua |
| Robalo | robalo | coberto: Robalo, grelhado; Robalo, cru |
| Bacalhau fresco | bacalhau fresco | coberto: Bacalhau, fresco, grelhado; Bacalhau, fresco, cru (+1) |
| Hadoque | hadoque | coberto: Hadoque, filé, grelhado; Hadoque, filé, cru |
| Atum em conserva em água | atum água | coberto: Atum, em conserva em água |
| Atum fresco grelhado | atum fresco grelhado | coberto: Atum, fresco, grelhado |
| Cavalinha | cavalinha | coberto: Cavalinha, grelhada; Cavalinha, crua |
| Arenque | arenque | coberto: Arenque, grelhado; Arenque, cru |
| Enchova | enchova | coberto: Enchova, grelhada; Enchova, crua |
| Aliche | aliche | coberto: Aliche, em conserva em óleo |
| Pargo | pargo | coberto: Pargo, grelhado; Pargo, cru (+2) |
| Garoupa | garoupa | coberto: Garoupa, grelhada; Garoupa, crua |
| Tainha | tainha | coberto: Tainha, grelhada; Tainha, crua |
| Dourado-do-mar | dourado | coberto: Dourado-do-mar, grelhado; Dourado-do-mar, cru |
| Sardinha em molho de tomate | sardinha molho tomate | coberto: Sardinha, em conserva em molho de tomate |
| Salmão em conserva | salmão conserva | coberto: Salmão, em conserva |
| Pescada-branca grelhada | pescada branca grelhada | coberto: Pescada, branca, grelhada |
| Bagre | bagre | coberto: Bagre, grelhado; Bagre, cru |
| Polvo | polvo | coberto: Polvo, cozido; Polvo, cru |
| Lula | lula | coberto: Lula, frita; Lula, crua |
| Mexilhão | mexilhão | coberto: Mexilhão, cozido; Mexilhão, cru |
| Ostra | ostra | coberto: Ostra, grelhada; Ostra, cozida (+2) |
| Vieira | vieira | coberto: Vieira, cozida; Vieira, crua |
| Lagosta | lagosta | coberto: Lagosta, cozida; Lagosta, crua |
| Kani | kani | coberto: Surimi (kani) |
| Siri | siri | coberto: Siri, cozido; Siri, cru (+2) |
| Merluza cozida | merluza | **falta**: o USDA não tem merluza (hake); a TACO tem crua, assada e frita |

### Carnes e aves

| Alimento | Busca | Situação |
|---|---|---|
| Peito de peru assado | peru peito assado | coberto: Peru, peito, com pele, assado; Peru, peito, sem pele, assado |
| Peito de peru fatiado | peito peru fatiado | coberto: Peito de peru, fatiado, reduzido em sódio; Peito de peru, fatiado |
| Pato | pato | coberto: Pato, inteiro, com pele, assado; Pato, inteiro, com pele, cru (+6) |
| Cordeiro | cordeiro | coberto: Cordeiro, moído, grelhado; Cordeiro, moído, cru |
| Cabrito | cabrito | coberto: Cabrito, cru; Cabrito, assado |
| Vitela | vitela | coberto: Vitela, músculo (ossobuco), sem gordura, cozido; Vitela, moída, grelhada (+15) |
| Carne moída magra | moída 95% | coberto: Carne, bovina, moída, 95% magra, refogada; Carne, bovina, moída, 95% magra, crua |
| Rabada | rabada | **falta**: não existe no USDA SR Legacy nem na Foundation |
| Coração bovino | bovina coração | coberto: Carne, bovina, coração, cozido; Carne, bovina, coração, cru |
| Rim bovino | bovina rim | coberto: Carne, bovina, rim, cozido; Carne, bovina, rim, cru |
| Fígado de frango cozido | frango fígado cozido | coberto: Frango, fígado, cozido |
| Moela | moela | coberto: Frango, moela, cozida; Frango, moela, crua |
| Peito de frango assado | frango peito sem pele assado | coberto: Frango, peito, sem pele, assado |
| Coxa de frango assada | frango coxa assada | coberto: Frango, coxa, sem pele, temperada, assada; Frango, coxa e sobrecoxa, com pele, assadas (+1) |
| Frango moído | frango moído | coberto: Frango, moído, refogado; Frango, moído, cru |
| Sobrecoxa sem pele cozida | sobrecoxa sem pele cozida | coberto: Frango, coxa e sobrecoxa, sem pele, cozidas; Frango, sobrecoxa, sem pele, cozida (+1) |
| Filé-mignon suíno | porco filé-mignon | coberto: Porco, filé-mignon, sem gordura, grelhado; Porco, filé-mignon, sem gordura, assado (+1) |
| Lombo suíno grelhado | lombo grelhado | coberto: Porco, lombo, sem gordura, grelhado |
| Costelinha suína cozida | porco costela cozida | coberto: Porco, costela, cozida |
| Copa-lombo | copa-lombo | coberto: Porco, copa-lombo, sem gordura, cozida; Porco, copa-lombo, sem gordura, crua (+2) |
| Pé de porco | porco pé | coberto: Porco, barriga, com pele, crua; Porco, pé, cozido (+1) |
| Acém grelhado | acém grelhado | coberto: Carne, bovina, acém, sem gordura, grelhado |
| Alcatra assada | alcatra assada | coberto: Carne, bovina, alcatra, sem gordura, assada |
| Fraldinha sem gordura | fraldinha sem gordura | coberto: Carne, bovina, fraldinha, sem gordura, grelhada; Carne, bovina, fraldinha, sem gordura, crua |
| Lagarto assado | lagarto assado | coberto: Carne, bovina, lagarto, sem gordura, assado |
| Patinho assado | patinho assado | coberto: Carne, bovina, patinho, sem gordura, assado |
| Maminha assada | maminha assada | coberto: Carne, bovina, maminha, sem gordura, assada |
| Filé-mignon bovino assado | bovina filé-mignon assado | coberto: Carne, bovina, filé-mignon, sem gordura, assado |
| Peru moído | peru moído | coberto: Peru, moído, 93% magro, refogado; Peru, moído, 93% magro, cru |

### Ovos e laticínios

| Alimento | Busca | Situação |
|---|---|---|
| Ovo pochê | ovo pochê | coberto: Ovo, de galinha, inteiro, pochê |
| Ovo mexido | ovo mexido | coberto: Ovo, de galinha, inteiro, mexido |
| Clara de ovo crua | clara crua | coberto: Ovo, de galinha, clara, crua |
| Albumina | albumina | coberto: Ovo, de galinha, clara, em pó (albumina) |
| Ovo de pata | ovo pata | coberto: Ovo, de pata, inteiro, cru |
| Queijo cottage | cottage | coberto: Queijo, cottage, semidesnatado; Queijo, cottage |
| Cream cheese | cream cheese | coberto: Queijo, cream cheese, semidesnatado; Queijo, cream cheese |
| Iogurte grego natural | iogurte grego natural integral | coberto: Iogurte, grego, natural, integral |
| Iogurte grego desnatado | iogurte grego desnatado | coberto: Iogurte, grego, natural, desnatado |
| Kefir | kefir | coberto: Kefir, natural, semidesnatado |
| Queijo coalho | coalho | **falta**: não existe no USDA SR Legacy nem na Foundation |
| Provolone | provolone | coberto: Queijo, provolone |
| Gouda | gouda | coberto: Queijo, gouda |
| Cheddar | cheddar | coberto: Queijo, cheddar |
| Brie | brie | coberto: Queijo, brie |
| Camembert | camembert | coberto: Queijo, camembert |
| Gorgonzola | gorgonzola | coberto: Queijo, azul (gorgonzola) |
| Feta | feta | coberto: Queijo, feta |
| Queijo de cabra | queijo cabra | coberto: Queijo, de cabra, duro; Queijo, de cabra, semiduro (+1) |
| Queijo suíço | queijo suíço | coberto: Queijo, suíço (emmental) |
| Muçarela light | mozarela semidesnatada | coberto: Queijo, mozarela, semidesnatada |
| Parmesão ralado | parmesão ralado | coberto: Queijo, parmesão, ralado |
| Leite semidesnatado | leite semidesnatado | coberto: Leite, de vaca, semidesnatado |
| Leite sem lactose | sem lactose | **falta**: o do USDA é fortificado com vitamina A e D, e a fortificação americana não é copiada (D-707) |
| Manteiga ghee | ghee | coberto: Manteiga, clarificada (ghee) |
| Coalhada | coalhada | **falta**: não existe no USDA SR Legacy nem na Foundation |

### Leguminosas

| Alimento | Busca | Situação |
|---|---|---|
| Edamame | edamame | coberto: Edamame, cozido; Edamame, congelado, cru |
| Grão-de-bico cozido | grão-de-bico cozido | coberto: Grão-de-bico, cozido |
| Feijão-branco cozido | feijão branco cozido | coberto: Feijão, branco, cozido |
| Feijão-vermelho | feijão vermelho | coberto: Feijão, vermelho, cozido; Feijão, vermelho, cru |
| Feijão-azuki | azuki | coberto: Feijão, azuki, cozido; Feijão, azuki, cru |
| Feijão-mungo | mungo | coberto: Feijão, mungo, cozido; Feijão, mungo, cru (+1) |
| Ervilha seca partida | ervilha seca partida | coberto: Ervilha, seca, partida, crua; Ervilha, seca, partida, cozida |
| Lentilha vermelha | lentilha vermelha | coberto: Lentilha, vermelha, crua |
| Soja em grão cozida | soja grão cozida | coberto: Soja, em grão, cozida |
| Tempeh | tempeh | coberto: Tempeh, cru; Tempeh, cozido |
| Tofu firme | tofu firme | coberto: Tofu, firme |
| Homus | homus | coberto: Homus |
| Pasta de amendoim | pasta amendoim | coberto: Pasta, de amendoim; Pasta, de amendoim, sem sal |
| Amendoim torrado sem sal | amendoim torrado sem sal | coberto: Amendoim, torrado, sem sal |
| Missô | missô | coberto: Missô |
| Falafel | falafel | coberto: Falafel, frito |
| Bebida de soja | bebida soja | **falta**: a do USDA é fortificada, e a fortificação americana não é copiada (D-707) |

### Cereais, farinhas e pães

| Alimento | Busca | Situação |
|---|---|---|
| Quinoa cozida | quinoa cozida | coberto: Quinoa, cozida |
| Farinha de quinoa | farinha quinoa | coberto: Farinha, de quinoa |
| Amaranto | amaranto | coberto: Amaranto, cozido; Amaranto, cru (+1) |
| Trigo-sarraceno | trigo-sarraceno | coberto: Trigo-sarraceno, cru; Trigo-sarraceno, cozido (+1) |
| Painço | painço | coberto: Painço, cozido; Painço, cru (+1) |
| Bulgur (trigo para quibe) | bulgur | coberto: Trigo para quibe (bulgur), cozido; Trigo para quibe (bulgur), cru |
| Cuscuz marroquino | cuscuz marroquino | coberto: Cuscuz marroquino, cozido; Cuscuz marroquino, cru |
| Cevada | cevada | coberto: Cevada, cozida; Cevada, crua (+1) |
| Espelta | espelta | coberto: Farinha, de espelta, integral; Espelta, cozida (+1) |
| Teff | teff | coberto: Teff, cozido; Teff, cru |
| Arroz selvagem | arroz selvagem | coberto: Arroz, selvagem, cozido; Arroz, selvagem, cru |
| Arroz parboilizado | arroz parboilizado | coberto: Arroz, parboilizado, cozido; Arroz, parboilizado, cru |
| Arroz arbóreo | arbóreo | **falta**: não existe no USDA SR Legacy nem na Foundation |
| Macarrão cozido | macarrão trigo cozido | coberto: Macarrão, trigo, com ovos, cozido; Macarrão, trigo, cozido (+1) |
| Macarrão integral cozido | macarrão integral cozido | coberto: Macarrão, trigo, integral, cozido |
| Farelo de aveia | farelo aveia | coberto: Farelo, de aveia, cozido; Farelo, de aveia, cru |
| Farelo de trigo | farelo trigo | coberto: Farelo, de trigo, cru |
| Gérmen de trigo | gérmen trigo | coberto: Gérmen, de trigo, cru |
| Mingau de aveia | aveia cozida | coberto: Aveia, flocos, cozida em água |
| Farinha de amêndoa | farinha amêndoa | coberto: Farinha, de amêndoa |
| Farinha de coco | farinha coco | coberto: Farinha, de coco |
| Farinha de aveia | farinha aveia | coberto: Farinha, de aveia |
| Farinha de trigo integral | farinha trigo integral | coberto: Farinha, de trigo, integral |
| Pão de centeio | pão centeio | coberto: Pão, de centeio |
| Pão sírio | pão sírio | coberto: Pão, sírio; Pão, sírio, integral |
| Tortilha (wrap) | tortilha | coberto: Tortilha, de milho; Tortilha, de trigo (+1) |
| Pão de forma branco | pão trigo forma | coberto: Pão, trigo, forma |
| Pão sem glúten | pão sem glúten | coberto: Pão, sem glúten, forma; Pão, sem glúten, forma, integral |
| Croissant | croissant | coberto: Croissant, de manteiga; Croissant, de queijo |
| Biscoito de arroz | biscoito arroz | coberto: Biscoito, de arroz, integral, sem sal |
| Pipoca sem óleo | pipoca sem óleo | coberto: Pipoca, sem óleo |
| Granola | granola | **falta**: a do USDA é receita americana, com açúcar e óleo; saiu na peneira como preparação |

### Verduras, legumes e cogumelos

| Alimento | Busca | Situação |
|---|---|---|
| Couve kale | kale | coberto: Couve, kale, cozida; Couve, kale, crua |
| Couve-de-bruxelas | couve-de-bruxelas | coberto: Couve-de-bruxelas, cozida; Couve-de-bruxelas, crua |
| Aspargo | aspargo | coberto: Aspargo, cozido; Aspargo, cru |
| Alcachofra | alcachofra | coberto: Alcachofra, cozida; Alcachofra, crua |
| Champignon | champignon | coberto: Cogumelo, paris (champignon), cru; Cogumelo, paris (champignon), cozido (+1) |
| Shiitake | shiitake | coberto: Cogumelo, shiitake, cru; Cogumelo, shiitake, cozido (+2) |
| Shimeji | shimeji | coberto: Cogumelo, buna-shimeji, cru; Cogumelo, shimeji (cogumelo-ostra), cru |
| Portobello | portobello | coberto: Cogumelo, portobello, cru; Cogumelo, portobello, grelhado |
| Espinafre cozido | espinafre cozido | coberto: Espinafre, Nova Zelândia, cozido; Espinafre, cozido |
| Vagem cozida | vagem cozida | coberto: Vagem, cozida; Vagem-de-metro, cozida |
| Quiabo cozido | quiabo cozido | coberto: Quiabo, cozido |
| Milho verde cozido | milho verde cozido | coberto: Milho, verde, cozido |
| Batata assada | batata inglesa assada | coberto: Batata, inglesa, com casca, assada |
| Batata-doce assada | batata doce assada | coberto: Batata, doce, polpa laranja, assada |
| Erva-doce (bulbo) | erva-doce bulbo | coberto: Erva-doce, bulbo, cru |
| Ervilha-torta | ervilha-torta | coberto: Ervilha-torta, cozida; Ervilha-torta, crua |
| Broto de alfafa | alfafa | coberto: Alfafa, broto, cru |
| Alga nori | nori | **falta**: o USDA só tem a alga fresca, e a que se vende no Brasil é a folha seca |
| Alga wakame | wakame | coberto: Alga, wakame, crua |
| Tomate grape | tomate grape | coberto: Tomate, grape, cru |
| Acelga cozida | acelga cozida | coberto: Acelga, cozida; Acelga, suíça, cozida |
| Folha de beterraba | beterraba folha | coberto: Beterraba, folha, cozida; Beterraba, folha, crua |
| Abóbora assada | abóbora assada | coberto: Abóbora, assada; Abóbora, pescoço, assada |
| Abobrinha grelhada | abobrinha grelhada | **falta**: o USDA não tem esse preparo; a TACO tem o alimento em outro preparo |
| Berinjela grelhada | berinjela grelhada | **falta**: o USDA não tem esse preparo; a TACO tem o alimento em outro preparo |
| Cenoura assada | cenoura assada | **falta**: o USDA não tem esse preparo; a TACO tem o alimento em outro preparo |

### Frutas

| Alimento | Busca | Situação |
|---|---|---|
| Mirtilo | mirtilo | coberto: Mirtilo, cru |
| Framboesa | framboesa | coberto: Framboesa, crua |
| Amora | amora | coberto: Amora, crua; Amora, de amoreira, crua |
| Cereja | cereja | coberto: Cereja, crua |
| Ameixa seca | ameixa seca | coberto: Ameixa, seca, cozida; Ameixa, seca |
| Damasco seco | damasco seco | coberto: Damasco, seco |
| Tâmara | tâmara | coberto: Tâmara, seca |
| Uva-passa | uva-passa | coberto: Pão, com uva-passa; Uva-passa, preta, sem semente (+1) |
| Figo seco | figo seco | coberto: Figo, seco |
| Cranberry seco | cranberry | coberto: Cranberry, seco, adoçado |
| Pitaia | pitaia | **falta**: não existe no USDA SR Legacy nem na Foundation |
| Lichia | lichia | coberto: Lichia, crua |
| Nectarina | nectarina | coberto: Nectarina, crua |
| Maçã Gala | maçã gala | coberto: Maçã, Gala, com casca, crua |
| Maçã verde | granny smith | coberto: Maçã, Granny Smith, com casca, crua |
| Toranja | toranja | coberto: Toranja (grapefruit), crua |
| Limão-siciliano | limão-siciliano | coberto: Limão-siciliano, suco; Limão-siciliano, cru |
| Melão cantaloupe | cantaloupe | coberto: Melão, cantaloupe, cru |
| Physalis | physalis | coberto: Physalis, crua |
| Goji | goji | coberto: Goji berry, seco |
| Coco ralado sem açúcar | coco ralado | coberto: Coco, seco, ralado, sem açúcar |
| Banana-passa | banana passa | **falta**: não existe no USDA SR Legacy nem na Foundation |
| Abacate Hass | abacate hass | coberto: Abacate, Hass (avocado), cru |
| Uva verde sem semente | uva verde | coberto: Uva, verde, sem semente, crua |
| Kiwi gold | kiwi | **falta**: no USDA só existe como produto de marca |
| Suco de laranja integral | laranja suco integral | coberto: Laranja, suco integral, sem polpa, refrigerado |
| Suco de uva integral | uva suco integral | coberto: Uva, suco integral, sem açúcar |

### Oleaginosas e sementes

| Alimento | Busca | Situação |
|---|---|---|
| Chia | chia | coberto: Chia, semente; Lichia, crua |
| Semente de abóbora | semente abóbora | coberto: Semente, de abóbora, sem casca, torrada, sem sal; Semente, de abóbora, com casca, torrada, sem sal (+1) |
| Semente de girassol | semente girassol | coberto: Semente, de girassol, sem casca, torrada, sem sal; Semente, de girassol, sem casca, crua |
| Amêndoa crua | amêndoa crua | coberto: Amêndoa, crua |
| Castanha-de-caju crua | castanha-de-caju crua | coberto: Castanha-de-caju, crua |
| Avelã | avelã | coberto: Avelã, torrada, sem sal; Avelã, crua |
| Pistache | pistache | coberto: Pistache, torrado, sem sal; Pistache, cru |
| Macadâmia | macadâmia | coberto: Macadâmia, torrada, sem sal; Macadâmia, crua |
| Noz-pecã | noz-pecã | coberto: Noz-pecã, torrada, sem sal; Noz-pecã, crua |
| Pinoli | pinoli | coberto: Pinoli, cru |
| Tahine | tahine | coberto: Pasta, de gergelim (tahine) |
| Pasta de amêndoa | pasta amêndoa | coberto: Pasta, de amêndoa |
| Castanha-portuguesa | castanha-portuguesa | coberto: Castanha-portuguesa, cozida; Castanha-portuguesa, crua (+1) |
| Linhaça moída | linhaça moída | coberto: Linhaça, moída |

### Óleos, temperos e outros

| Alimento | Busca | Situação |
|---|---|---|
| Óleo de coco | óleo coco | coberto: Óleo, de coco |
| Óleo de gergelim | óleo gergelim | coberto: Óleo, de gergelim |
| Óleo de abacate | óleo abacate | coberto: Óleo, de abacate |
| Óleo de linhaça | óleo linhaça | coberto: Óleo, de linhaça |
| Cacau em pó | cacau pó | coberto: Cacau, em pó |
| Chocolate 70% | chocolate amargo 70 | coberto: Chocolate, amargo, 70 a 85% |
| Xarope de agave | agave | coberto: Xarope, de agave |
| Canela | canela | coberto: Canela, em pó |
| Cúrcuma | cúrcuma | coberto: Cúrcuma, em pó |
| Gengibre | gengibre | coberto: Gengibre, cru; Gengibre, em pó |
| Chá verde | chá verde | coberto: Chá, verde, infusão |
| Chá de camomila | chá camomila | coberto: Chá, camomila, infusão |
| Café expresso | café expresso | coberto: Café, expresso |
| Levedura nutricional | levedura | **falta**: não existe no USDA SR Legacy nem na Foundation |
| Whey protein | whey | **falta**: suplemento; no USDA só existe como produto de marca |
