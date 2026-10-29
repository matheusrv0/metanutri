# Regras da curadoria da base ampliada (USDA → Base MetaNutri)

Spec `base-ampliada`. Vale para quem traduz e para quem revisa. **Nenhum número nutricional é escrito, conferido ou
"corrigido" aqui**: os números saem do arquivo do USDA pelo script. A curadoria decide só: entra ou não, nome em
português, grupo da TACO, preparo, nome para o paciente, `sugerivel` e as marcas de fortificação e de líquido.

## 1. Entra ou não (`decisao`)

Entra o alimento **genérico** que uma nutricionista brasileira pode usar num plano. Sai, com `motivo` curto:

| Motivo | Exemplos |
|---|---|
| `TACO já tem` (diga o id) | o mesmo alimento **no mesmo preparo** já está na TACO: "Rice, white, cooked" (TACO 3); "Broccoli, cooked" (TACO 100). Preparo novo de alimento da TACO **entra** (a TACO só tem "Frango, peito, sem pele, cozido/grelhado"; "roasted" entra como assado) |
| `duplicata` (diga o fdcId que fica) | dois itens do USDA iguais para o uso brasileiro (variedades americanas sem diferença prática, "farmed" e "wild" quase iguais, "large or small curd"); fica um |
| `duplicata da Foundation <fdcId>` | o item SR Legacy é o mesmo alimento, no mesmo preparo, de um item Foundation do lote. **A Foundation vence** e leva o SR em `complemento` |
| `não é usado no Brasil` | variedade, fruta, verdura, peixe ou corte que não se encontra no Brasil ou só em nicho (salsify, burdock, butterbur, lingcod, pompano da Flórida, chayote leaves) |
| `preparo americano` | "microwaved" sem diferença, "with margarine", "mashed with milk", "stewed with sauce", "canned with salt" quando há fresco |
| `processado ou adoçado` | adoçado, cristalizado, com corante, enlatado em calda, desidratado instantâneo, purê industrial |
| `fortificado` | traz vitamina ou mineral adicionado pela regra americana e não dá para separar (cereal matinal, bebida vegetal, leite americano). **Exceção**: se o resto do alimento serve e só um ou dois nutrientes vêm da fortificação, ele entra com esses nutrientes em `naoCopiar` |
| `suplemento ou ingrediente industrial` | proteína isolada, glúten vital, farinha desengordurada, amido modificado, lecitina |
| `sem uso clínico` | partes não comestíveis ou raras (pele de frango sozinha, gordura separável, ossos, folhas de batata-doce, sementes de algodão) |

Na dúvida entre entrar e sair, **entra** (fica só na busca) se for comida de verdade, genérica e encontrável no Brasil;
**sai** se for produto americano.

## 2. Nome no padrão da TACO (`nome`)

Formato: **"Nome-base, qualificadores, preparo"**, separado por vírgula e espaço, primeira letra maiúscula, o resto em
minúscula (menos nomes próprios de variedade: "Maçã, Gala, com casca, crua").

- O nome-base é o alimento como o brasileiro chama: "Tilápia", "Carne, bovina", "Frango", "Porco", "Queijo", "Iogurte",
  "Feijão", "Farinha", "Pão", "Óleo", "Semente", "Cogumelo".
- Carnes seguem a TACO: "Carne, bovina, <corte>, <gordura>, <preparo>"; "Porco, <corte>, <preparo>"; "Frango, <parte>,
  com pele | sem pele, <preparo>"; "Peru, ..."; "Cordeiro, ..."; "Vitela, ...".
- Queijo: "Queijo, <tipo>" ("Queijo, cottage", "Queijo, gouda"). Iogurte: "Iogurte, grego, natural, integral".
- Ovo: "Ovo, de galinha, inteiro, pochê"; "Ovo, de galinha, clara, crua"; "Ovo, de pata, inteiro, cru".
- Semente e oleaginosa: "Chia, semente"; "Semente, de abóbora, sem casca, torrada, sem sal"; "Amêndoa, crua";
  "Castanha-de-caju, crua"; "Noz-pecã, crua"; "Avelã, crua"; "Pistache, cru".
- O **preparo vai por último** e concorda com o nome principal: "Tilápia, filé, grelhada", "Atum, fresco, grelhado",
  "Carne, bovina, patinho, moído, refogado" (concorda com o corte, como a TACO).
- Sem sal: quando o USDA diz "without salt", o nome diz "sem sal" só se houver motivo (oleaginosa torrada, que a TACO
  tem salgada). Em verdura cozida "without salt" é o padrão e **não** vai no nome.
- Nada de inglês no nome, menos o que o brasileiro fala assim ("cottage", "cream cheese", "kefir", "tahine", "homus",
  "tempeh", "edamame", "shiitake", "shimeji", "portobello").
- Nunca invente informação que o original não tem (marca, origem, gordura). Pode omitir o que não muda nada para o
  Brasil ("mixed species", "Atlantic and Pacific", "farmed").

## 3. Preparo (`preparo`)

Um destes, ou `null` (sem preparo, como produto pronto, fruta seca, queijo, pão):
`cru`, `cozido`, `grelhado`, `assado`, `frito`, `refogado`, `torrado`.

| Inglês | Preparo | No nome |
|---|---|---|
| raw, fresh (sem preparo) | `cru` | cru, crua |
| boiled, simmered, stewed, braised, moist heat, steamed, poached (carne), microwaved, cooked (sem dizer como) | `cozido` | cozido(a); "no vapor" pode ir antes ("Brócolis, cozido no vapor" só se houver outro cozido) |
| cooked, dry heat (peixe); broiled; grilled; pan-broiled | `grelhado` | grelhado(a) |
| roasted, baked | `assado` | assado(a) |
| fried, pan-fried (com gordura) | `frito` | frito(a) |
| stir-fried, pan-browned (carne moída), sauteed | `refogado` | refogado(a) |
| toasted, dry roasted (oleaginosa, semente, grão) | `torrado` | torrado(a) |
| dried (fruta), dry (grão cru), canned, drained | `null` ou `cru` conforme o caso | "seca", "cru", "em conserva", "drenado" |

Grão, leguminosa e cereal "dry", "uncooked" ou "raw" são `cru`. Massa "dry" é `cru`; "cooked", `cozido`.

## 4. Grupo da TACO (`grupo`)

Exatamente um destes 15 textos:

`Cereais e derivados` · `Verduras, hortaliças e derivados` · `Frutas e derivados` · `Gorduras e óleos` ·
`Pescados e frutos do mar` · `Carnes e derivados` · `Leite e derivados` · `Bebidas (alcoólicas e não alcoólicas)` ·
`Ovos e derivados` · `Produtos açucarados` · `Miscelâneas` · `Outros alimentos industrializados` ·
`Alimentos preparados` · `Leguminosas e derivados` · `Nozes e sementes`

| USDA | Grupo |
|---|---|
| Dairy (queijo, iogurte, kefir, leite) | Leite e derivados |
| Eggs | Ovos e derivados |
| Butter, ghee, óleos, banha | Gorduras e óleos |
| Beef, Pork, Lamb, Veal, Poultry, frios de peru | Carnes e derivados |
| Finfish, Shellfish | Pescados e frutos do mar |
| Vegetables, cogumelos, algas, ervas frescas | Verduras, hortaliças e derivados |
| Fruits, sucos de fruta, azeitona | Frutas e derivados |
| Legumes (feijões, grão-de-bico, lentilha, ervilha seca, soja, tofu, tempeh, amendoim, pasta de amendoim, homus) | Leguminosas e derivados |
| Nuts and Seeds, coco | Nozes e sementes |
| Cereal grains, pasta, farinhas, pães, biscoito de arroz, pipoca, aveia | Cereais e derivados |
| Especiarias secas, fermento, cacau em pó | Miscelâneas |
| Chocolate, mel, açúcares, xaropes | Produtos açucarados |
| Chá e café em infusão, água | Bebidas (alcoólicas e não alcoólicas) |

## 5. Nome para o paciente (`paciente`)

Como a folha impressa escreve, natural e curto: "Tilápia grelhada", "Iogurte grego natural", "Quinoa cozida",
"Peito de frango assado", "Carne moída (patinho) refogada", "Chia". Alimento cru que se come cozido (carne, peixe,
grão, leguminosa, massa seca) leva " (peso cru)": "Quinoa (peso cru)", "Tilápia (peso cru)".

## 6. `sugerivel` (entra no Cobrir)

O Cobrir sugere sozinho o que comer para fechar uma vitamina ou um mineral. **Seja conservador: na dúvida, `false`**
(o alimento continua na busca). `true` só quando **todas** valem:

1. **Comum no Brasil**: está em supermercado ou feira comum (tilápia, polaca-do-alasca, atum em água, sardinha em molho
   de tomate, cavalinha, linguado, truta; cottage, iogurte grego natural; quinoa, macarrão integral; chia, amêndoa,
   castanha-de-caju, semente de abóbora e de girassol; grão-de-bico, feijão-branco, ervilha, edamame; cogumelo-paris,
   shiitake, shimeji, portobello; espinafre, couve kale, vagem, quiabo, milho verde, batata assada; mirtilo,
   framboesa, amora, cereja, ameixa seca, uva-passa, damasco seco, maçã Gala, nectarina).
2. **Prescritível como está**: não frito, não adoçado, não em calda, não ultraprocessado, não embutido nem curado, não
   suplemento, não ingrediente (farinha, farelo, amido, pó, óleo, tempero, fermento, cacau), não forma crua de
   alimento que se come cozido (carne, peixe, ovo, grão, leguminosa, massa, verdura de cozinhar), não bebida (chá,
   café, suco: a fruta inteira é a sugestão).
3. **Sem cuidado especial**: nunca miúdos (fígado, rim, coração, moela, língua, tutano), nunca peixe com muito
   mercúrio (espadarte, cação/tubarão, cavala-rei, peixe-batata, atum-azul), nunca peixe ou fruto do mar cru, nunca
   fruto do mar de exceção (ostra, mexilhão, vieira, lagosta, polvo, lula, kani), nunca queijo curado gordo de nicho
   (só cottage e ricota entram), nunca pão, biscoito, torrada, tortilha ou cereal matinal, nunca sorgo, painço,
   teff, amaranto, trigo-sarraceno, cevada, bulgur ou cuscuz marroquino (comuns só em nicho), nunca fruta exótica.
4. **Porção de verdade**: é comida que se serve numa porção caseira (filé, colher, xícara, unidade).

Quando `false`, escreva em `porqueNao` o motivo curto ("miúdo", "ingrediente", "pouco comum", "cru", "processado",
"bebida", "pão", "mercúrio", "fruto do mar de exceção").

## 7. Marcas extras

- `complemento`: só no item **Foundation**. O fdcId do item **SR Legacy** do mesmo alimento, no mesmo preparo, quando
  existir no lote. O script usa o SR só para preencher o que a Foundation não publicou (nunca troca valor).
- `naoCopiar`: lista de chaves que vêm de fortificação americana e ficam nulas (`vitamina_d_mcg`,
  `vitamina_a_rae_mcg`, `folato_dfe_mcg`, `tiamina_mg`, `riboflavina_mg`, `niacina_mg`, `ferro_mg`, `calcio_mg`,
  `vitamina_c_mg`, `vitamina_e_mg`, `vitamina_b12_mcg`).
- `ml`: `true` no líquido que se mede em ml (kefir, leite, bebida, suco, caldo). Óleo não.
- `alergenicos` (D-716b): em todo item incluído, a lista (vazia quando não tem) dos alergênicos, na ordem `trigo`,
  `gluten` (glúten sem trigo: cevada, centeio, aveia), `leite`, `lactose` (laticínio fresco), `ovo`, `soja`,
  `amendoim`, `castanhas`, `peixe`, `frutos-do-mar`. Conferida contra o nome em inglês (o teste repete as regras) e
  contra os ingredientes típicos que o nome não diz: o pão de forma e o pão de batata levam leite; o croissant, ovo; a
  massa fresca, ovo; o surimi, trigo e ovo; a lula frita, trigo; o missô, cevada; o chocolate, leite e soja ("pode
  conter"). Numa alergia, sobrar é mais seguro que faltar. O coco e a noz-moscada não são castanha.

## 8. Glossário fixo

| Inglês | Português |
|---|---|
| tilapia | tilápia |
| Alaska pollock | polaca-do-alasca |
| whiting | merluza (D-716g: não é a pescada-branca, que é Cynoscion) |
| cod (fresh) | bacalhau fresco |
| haddock | hadoque |
| hake / whiting | pescada-branca |
| flatfish (flounder, sole) | linguado |
| trout | truta |
| sea bass / bass | robalo |
| grouper | garoupa |
| snapper | pargo |
| mullet | tainha |
| croaker | corvina |
| catfish | bagre |
| carp | carpa |
| mackerel, Atlantic | cavalinha |
| mackerel, king | cavala-rei |
| mackerel, spanish | sororoca |
| herring | arenque |
| anchovy | anchova (aliche, em conserva) |
| bluefish | enchova |
| mahimahi | dourado-do-mar |
| halibut | alabote |
| swordfish | espadarte |
| shark | cação |
| tuna, light, canned in water | atum, em conserva em água |
| salmon | salmão |
| sardine | sardinha |
| shrimp | camarão |
| crab | caranguejo |
| lobster | lagosta |
| crayfish | lagostim |
| mussel | mexilhão |
| oyster | ostra |
| clam | marisco (vôngole) |
| scallop | vieira |
| squid | lula |
| octopus | polvo |
| surimi | surimi (kani) |
| beef | carne, bovina |
| ground beef X% lean | carne, bovina, moída, X% magra |
| tenderloin | filé-mignon |
| top sirloin | alcatra |
| tri-tip | maminha |
| eye of round | lagarto |
| top round | coxão mole |
| bottom round | coxão duro |
| round, tip | patinho |
| chuck | acém |
| brisket | peito |
| flank | fraldão |
| skirt | fraldinha |
| short ribs / ribs | costela |
| rib eye | contrafilé de costela (ancho) |
| short loin, top loin, strip | contrafilé |
| shank | músculo |
| oxtail | rabada |
| liver / kidney / heart / tongue / tripe | fígado / rim / coração / língua / bucho |
| separable lean only | sem gordura |
| pork loin | lombo |
| pork tenderloin | filé-mignon suíno |
| pork leg (ham), fresh | pernil |
| pork shoulder | paleta |
| spareribs | costela |
| chicken breast / drumstick / thigh / wing | peito / coxa / sobrecoxa / asa |
| meat only / meat and skin | sem pele / com pele |
| gizzard | moela |
| turkey | peru |
| duck | pato |
| lamb | cordeiro |
| veal | vitela |
| goat | cabrito |
| egg, poached / scrambled / hard-boiled | ovo pochê / mexido / cozido |
| cottage cheese | queijo cottage |
| cream cheese | cream cheese |
| Greek yogurt | iogurte grego |
| plain | natural |
| whole milk / lowfat / nonfat | integral / semidesnatado / desnatado |
| kefir | kefir |
| ghee / butter oil | manteiga clarificada (ghee) |
| lard | banha de porco |
| chickpeas | grão-de-bico |
| navy beans / great northern / white beans | feijão-branco |
| kidney beans, red | feijão-vermelho |
| pinto beans | feijão-rajado (pinto) |
| black beans | feijão-preto |
| adzuki | feijão-azuki |
| mung beans | feijão-mungo |
| lima beans | feijão-de-lima |
| split peas | ervilha seca partida |
| green peas | ervilha fresca |
| soybeans, mature | soja em grão |
| edamame | edamame |
| peanut butter | pasta de amendoim |
| hummus | homus |
| quinoa | quinoa |
| oats | aveia |
| oat bran | farelo de aveia |
| wheat bran / germ | farelo de trigo / gérmen de trigo |
| whole-wheat pasta | macarrão integral |
| pasta, cooked | macarrão, trigo, cozido |
| couscous | cuscuz marroquino |
| bulgur | trigo para quibe (bulgur) |
| barley, pearled | cevada |
| rye | centeio |
| spelt | espelta |
| buckwheat | trigo-sarraceno |
| millet | painço |
| amaranth | amaranto |
| wild rice | arroz selvagem |
| rice cakes | biscoito de arroz |
| popcorn, air-popped | pipoca, sem óleo |
| tortilla, flour / corn | tortilha, de trigo / de milho |
| pita | pão sírio |
| rye bread | pão de centeio |
| chia seeds | chia, semente |
| flaxseed | linhaça |
| pumpkin seeds | semente de abóbora |
| sunflower seeds | semente de girassol |
| almonds | amêndoa |
| cashew | castanha-de-caju |
| brazil nuts | castanha-do-pará |
| hazelnuts | avelã |
| pecans | noz-pecã |
| walnuts | noz |
| pistachio | pistache |
| macadamia | macadâmia |
| pine nuts | pinoli |
| tahini | tahine |
| coconut, desiccated | coco, seco, ralado |
| mushrooms, white | cogumelo-paris (champignon) |
| oyster mushroom | shimeji (cogumelo-ostra) |
| kale | couve kale |
| collards | couve-manteiga |
| spinach | espinafre |
| Brussels sprouts | couve-de-bruxelas |
| asparagus | aspargo |
| artichoke | alcachofra |
| leeks | alho-poró |
| fennel | erva-doce (funcho) |
| celery | aipo (salsão) |
| snap beans | vagem |
| sweet corn | milho verde |
| sweet potato | batata-doce |
| potato, baked | batata, inglesa, assada |
| squash, summer / zucchini | abobrinha |
| squash, winter / pumpkin | abóbora |
| beet greens | folha de beterraba |
| seaweed, nori / wakame | alga nori / alga wakame |
| blueberries | mirtilo |
| raspberries | framboesa |
| blackberries | amora |
| cherries, sweet | cereja |
| plums, dried (prunes) | ameixa seca |
| raisins | uva-passa |
| apricots, dried | damasco seco |
| dates | tâmara |
| figs, dried | figo seco |
| cranberries, dried | cranberry seco |
| nectarines | nectarina |
| grapefruit | toranja (grapefruit) |
| lemon | limão-siciliano |
| lime | limão-taiti |
| cantaloupe | melão cantaloupe |
| honeydew | melão |
| pomegranate | romã |
| lychee | lichia |
| dragon fruit, pitaya | pitaia |
| cocoa powder, unsweetened | cacau em pó |
| dark chocolate 70-85% | chocolate amargo 70 a 85% |
| tea, green / black / chamomile | chá verde / chá preto / chá de camomila |
| coffee, espresso | café expresso |
