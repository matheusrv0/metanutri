# SPEC — Landing v3: gramatura, tema claro e escuro, espaços menores

Status: **protótipo v3 (`LandingV3.dc.html`, Claude Design, 27/10/2026) aprovado pelo processo nas partes desta spec.**
O dono reprovou, no mesmo dia, os desenhos e os preços do protótipo: as quatro peças de "O plano sai do seu jeito", os
três desenhos de "Como funciona" e os cartões de "Quanto custa" ficam para o protótipo v4 (D-600). Esta spec registra o
que entra agora e as regras que valem acima do protótipo.

**Fonte (palavras do dono, 27/10):** "Não gostei muito da ênfase que você deu nas medidas caseiras. Por mim, deve focar
na gramatura. [...] Explique e mantenha a veracidade de como funciona. [...] Coloque o botãozinho para ficar alterando
entre modo escuro e modo claro na landing também."

**Lido antes:** `specs/landing-escura` (D-530 a D-554, que esta spec altera onde diz), `DESIGN.md` (*Landing escura*),
`specs/site-publico-profissional` (a página pré-desenhada, D-331 e D-332), o motor do Cobrir (`src/domain/cobrir.ts`),
o plano de exemplo (`src/domain/exemplo.ts`), a unidade dos líquidos (`src/domain/liquido.ts`) e a meta da adequação
(`src/domain/adequacao.ts`).

**Substitui** (registrado também em `specs/landing-escura/SPEC.md`): D-530 (a landing deixa de ser escura sempre; o
escuro passa a ser o padrão, com o botão de tema), D-535 (o título e a frase do topo), D-538 (o parágrafo do campo
vivo), D-541 nas respostas 1 e 3, a seção "Na medida da cozinha" de D-534 (vira "Grama por grama") e as medidas de D-546
(topo, foto e espaços).

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-600 | **Escopo.** Entram agora: a gramatura (topo, campo vivo, "Grama por grama" e as perguntas), o tema claro e escuro com o botão no topo, e os espaços menores. **Ficam para a v4:** as quatro peças desenhadas de "O plano sai do seu jeito", os três desenhos de "Como funciona" e os três cartões de "Quanto custa". Nessas três seções continua o componente de hoje (chaves, passos com fragmento, número grande do Solo); só muda o que o tema claro exige (D-616) e o espaço (D-615) | O dono reprovou os desenhos e os preços do protótipo v3; vai sair um v4 com desenhos mais artísticos e preços com movimento |
| D-601 | **O topo:** "Falta cálcio?" (teal claro) e "150 g de iogurte" (marfim) com a bolinha laranja no lugar do ponto (o ponto continua para o leitor de tela); a frase "Para nutricionistas: o MetaNutri calcula quanto falta de cada vitamina e mineral no plano alimentar e mostra o que comer para completar, em gramas." Os 150 g são a porção que o Cobrir de cálcio sugere de iogurte para a Maria; o texto sai de `exemploDaLanding.ts` e o teste confere no motor | Pedido do dono: foco na gramatura |
| D-602 | **O campo vivo mostra a porção só em gramas** ("150 g", em negrito da tinta, como no protótipo), pela regra do app: a unidade do alimento (`unidadeDo`: mililitro para líquido) e o "(peso cru)" quando o alimento é pesado cru, sem a medida caseira. A mesma lista serve a "Cobrir cálcio" de "Como funciona", que passa a mostrar os gramas também. O parágrafo ao lado vira "O cálculo usa as referências de ingestão para a idade e o sexo da paciente. Cada sugestão traz os gramas, quanto da falta eles cobrem e as calorias que somam ao dia. Você escolhe o que entra." | Protótipo v3; a gaveta do app mostra a medida e os gramas, a landing mostra a parte dos gramas |
| D-603 | **"Na medida da cozinha" vira "Grama por grama":** o texto "Cada alimento do plano sai com o peso e as calorias da Base MetaNutri.", as duas fotos em 16:9 com as legendas "Leite e outros líquidos entram em mililitros." e "Salada com frango grelhado, rúcula e pimentão.", e a tabela das três refeições sem a coluna da medida: o alimento, os gramas (em negrito) e as calorias (em tinta suave). Os nomes são os que a paciente lê (`nomeParaPaciente`: "Mamão Formosa", com F maiúsculo, onde o protótipo escrevia "formosa") | Protótipo v3; o nome sai do app, não do protótipo |
| D-604 | **A tabela não diz que é o dia da Maria.** O protótipo chamava a tabela de "Um dia do plano da Maria" (na legenda para o leitor de tela), mas o plano de exemplo do app tem outros alimentos e outros pesos (o almoço da Maria é arroz 150 g, feijão 100 g, frango 100 g, brócolis 80 g e cenoura 60 g: 490 g, não 507 g). A legenda fica "Um dia de plano, com os gramas e as calorias de cada alimento", e cada linha continua conferida na base | Veracidade: vale o app |
| D-605 | **"Leite e outros líquidos entram em mililitros."** é o que o app faz (`unidadeDo` dá `ml` para líquido); o teste confere com o leite e o iogurte da base | A legenda afirma uma regra do app |
| D-606 | **Perguntas:** as respostas 1 ("Da Base MetaNutri, montada a partir de tabelas oficiais de composição e organizada pela nossa equipe, com os valores de cada alimento por 100 g.") e 3 ("Você cadastra em Meus alimentos: por 100 g, pela porção do rótulo ou pelo código de barras.", com a publicação 2 ligada; desligada, continua a de hoje) são as do protótipo, sem medida caseira. A do estudante fica a de hoje: o protótipo tirava o comprovante de matrícula e os 12 meses, e o app pede os dois (D-541) | Pedido do dono, com a veracidade acima do protótipo |
| D-607 | **Tema claro e escuro na landing.** Um botão redondo no topo, antes de "Entrar" (com sessão, antes de "Ir para o painel"), também no celular, com a lua (no escuro) ou o sol (no claro) e o nome "Usar o tema claro" ou "Usar o tema escuro" (`aria-label` e `title`). O botão tem 44 px de diâmetro (o protótipo desenhava 40 px com área de toque de 44 px; a landing mede o alvo pela caixa, D-551). Os ícones são os `Moon` e `Sun` do `lucide-react`, o mesmo desenho do protótipo | Pedido do dono |
| D-608 | **O escuro é o padrão.** A escolha fica no navegador, numa chave própria da landing (`metanutri:tema-da-landing`, valores `claro` e `escuro`), separada do tema do app (`metanutri:tema`): trocar uma não muda a outra. A leitura e a escrita ficam em `try/catch`; sem armazenamento, a landing abre escura e o botão troca o tema enquanto a página estiver aberta. Qualquer outro valor guardado vale o escuro | O escuro é a cara da marca na vitrine (D-530); o tema do app é outra preferência |
| D-609 | **Tokens do claro:** os do bloco `.raiz.claro` do protótipo, como semânticos `--landing-*`. O escopo dos tokens passa a se chamar `.landing` (era `.landing-escura`), escuro por padrão; o claro vale em `.landing.landing-clara` e em `[data-tema-da-landing='claro'] .landing` (o primeiro desenho, D-613). Primitivas novas em `tokens.css`: o marfim do claro (`--marfim-200` `#efe8dc`, `--marfim-300` `#ece5d8`, `--marfim-400` `#e9e2d5`, `--marfim-500` `#e3dbcc`, `--marfim-700` `#cfc5b3`) e a tinta do claro (`--tinta-teal-900` `#13282d`, `--tinta-teal-600` `#56696d`, `--tinta-teal-500` `#5f7174`). Semânticos novos, com valor nos dois temas: destaque, borda, ação (fundo, tinta e hover), faixa final (fundo, tinta e hover), rodapé (fundo e tinta) e bloco (fundo e tinta). Ficam iguais nos dois temas: teal, teal médio, teal do fundo, teal claro, marfim, branco, laranja e a tinta da resposta (as perguntas são teal nos dois) | Cor só por token (D-531) |
| D-610 | **O que é teal fica teal nos dois temas:** o topo da página e as perguntas. **A faixa "Começar" inverte:** marfim com texto teal no escuro, teal com texto marfim no claro. No hover, o escuro vai a branco (D-532) e o claro ao teal médio; a seta fica laranja nos dois. **O rodapé** fica claro no claro (`#ece5d8`, texto teal) | Protótipo v3, com a D-532 acima dele |
| D-611 | **A raiz** leva `.landing dark` no escuro e `.landing landing-clara tema-claro` no claro: os componentes do sistema dentro dela (a logo, o aviso de conta excluída) seguem o tema da landing, não o do app. A classe fica na raiz, nunca no `<html>` (CB-544 continua) | D-530 dizia o mesmo para o escuro |
| D-612 | **A barra do topo pinta a seção nos dois temas** (D-545 continua). Sobre teal (o topo, as perguntas e a faixa final, que no claro já é teal e no escuro pede a barra teal): fundo teal, texto marfim, logo para fundo escuro, botão marfim, botão de tema com contorno marfim. Sobre chão ou afundado: o fundo da seção, texto na tinta do tema, logo para fundo claro no tema claro, botão na ação do tema (teal no claro) e contorno do tema | No protótipo a barra só passava sobre o topo teal; aqui ela desce com a página |
| D-613 | **O primeiro desenho** (página pré-desenhada, D-331): `public/preparar-pagina.js`, que já roda antes do primeiro quadro e é arquivo próprio (a CSP não aceita script escrito na página), lê a mesma chave e, com `claro`, marca o `<html>` com `data-tema-da-landing="claro"`. O CSS pinta a landing pré-desenhada de claro e mostra o sol no botão desde o primeiro quadro, sem script inline. O botão, ao trocar, escreve a chave e acerta essa marca antes de o React desenhar de novo. Sem JavaScript, o script não roda e a página fica escura (como hoje) | Quem escolheu o claro não vê o escuro piscar, e a CSP não muda |
| D-614 | **A troca de tema é instantânea**, sem transição. O protótipo animava só o fundo da raiz por 0,3 s; ele fica atrás das seções, que trocam na hora, e as peças com transição de cor (a barra, os botões, a faixa final) trocariam fora do tempo do resto. Durante a troca, a raiz fica marcada (`data-trocando-tema`) por dois quadros e nenhuma transição da landing roda; depois, a barra volta a animar a troca de seção | Uma troca, um quadro (revisão `emil-design-eng`) |
| D-615 | **Espaços menores, como no protótipo:** seções com 104 px em cima e 96 px embaixo em todas as larguras (eram 136 e 120 no computador); o topo da página com 640 px de altura mínima contando a barra e o título a 150 px do alto da página (a partir de 1100 px; abaixo, a altura é a do conteúdo, como hoje); a foto dos legumes com 420 px de altura em todas as larguras (era 64 `svh`); em "Grama por grama", as fotos a 44 px do texto, a tabela a 64 px das fotos e cada refeição a 44 px da anterior; nas perguntas, a lista a 52 px do título | Pedido do dono ("um pouco menores") |
| D-616 | **Seções da v4 no tema claro.** Para as chaves, "Como funciona" e "Quanto custa" funcionarem no claro sem mudar de desenho: as cores delas passam pelos tokens do tema (o número grande e a lista de "Quanto custa" na tinta, o "Assinar o Solo" na ação, o símbolo da marca na versão do fundo de cada tema; a faixa da chave marfim no "bloco", que é marfim no escuro e teal claro no claro). O texto delas fica como está, inclusive a chave "Medida caseira junto dos gramas" e o "1 concha de feijão" de "Como funciona": a v4 substitui as duas seções inteiras | D-600: o branch continua verde e as seções de hoje funcionam nos dois temas |
| D-617 | **O cartão do campo vivo e os exemplos ganham a borda do protótipo** (`--landing-borda`): no claro, o cartão branco sobre o afundado precisava dela; no escuro, a borda tem a cor do trilho e quase não aparece | Protótipo v3 |
| D-618 | **O foco** é o contorno de 3 px do destaque (teal claro no escuro, teal médio no claro); nas áreas teal (o topo, as perguntas, a barra teal), o teal claro nos dois temas | Contraste do foco sobre o teal |
| D-619 | **Os nomes do campo vivo continuam os do motor** ("Salmão, filé, com pele, fresco, grelhado", "Ovo, de galinha, gema, cozida"); o protótipo encurtava os dois à mão | D-537 continua |
| D-621 | **A alternância de fundo das seções continua a de hoje:** "Grama por grama" no afundado, como "Na medida da cozinha" era. O protótipo v3 pintava "Como funciona" e "Quanto custa" no afundado e "Grama por grama" no chão; como as duas primeiras ficam como estão até a v4, seguir o protótipo só em "Grama por grama" deixaria duas seções vizinhas do mesmo tom | D-600 |
| D-622 | **A barra cabe no celular com o botão de tema** (revisão `break-ui`, CB-608): até 420 px, o espaço entre os itens cai para 8 px e o "Criar conta" fica mais estreito; até 373 px, a logo da barra mostra só o símbolo (o nome continua no rótulo "MetaNutri, início"). Com o texto grande do sistema, a barra e as sugestões do Cobrir quebram em linhas em vez de esconder "Entrar" e "Criar conta". Sem isso, em 360 e 390 px o "Criar conta" passava da margem e era cortado pela raiz (`overflow-x: clip`) | Nenhum controle fora do alcance |
| D-620 | **Fora do protótipo e mantido:** Manrope do `@fontsource` (o protótipo carregava do Google, D-533), a barra presa que some ao rolar (D-545), a faixa final com hover branco no escuro (D-532), o cabeçalho da tabela para o leitor de tela (CA-1475) e a entrada das partes ao rolar (D-549) | Regras que valem acima do protótipo |

## 2. Critérios de aceite

### Gramatura

- **CA-1600** · Dado a landing, então o `h1` diz "Falta cálcio? 150 g de iogurte." (na tela, a bolinha laranja no lugar do ponto) e o topo tem "Criar conta grátis", "Ver no plano de exemplo" e a frase "Para nutricionistas: o MetaNutri calcula quanto falta de cada vitamina e mineral no plano alimentar e mostra o que comer para completar, em gramas."
- **CA-1601** · Dado o plano de exemplo, quando o teste roda o Cobrir de cálcio do motor, então há uma sugestão de iogurte com 150 g, e o "150 g de iogurte" do topo sai dela.
- **CA-1602** · Dado o campo vivo, então cada sugestão mostra só os gramas ("Rúcula, crua · 60 g · cobre 27% · +8 kcal"; "Iogurte, natural, desnatado · 150 g · cobre 91% · +62 kcal"), sem medida caseira, e o parágrafo ao lado é o da D-602.
- **CA-1603** · Dado o motor, quando o teste roda o Cobrir de cálcio, vitamina E e vitamina D da Maria, então os gramas de cada linha do campo vivo e de "Cobrir cálcio" são a porção do motor, na unidade do app, sem a medida caseira.
- **CA-1604** · Dado "Grama por grama", então há o título, o texto "Cada alimento do plano sai com o peso e as calorias da Base MetaNutri.", duas fotos em 16:9 com as legendas da D-603, e a tabela "Um dia de plano, com os gramas e as calorias de cada alimento" com três refeições e as colunas Alimento, Gramas e Energia (cabeçalho para o leitor de tela).
- **CA-1605** · Dado a tabela, quando o teste busca cada alimento na base, então o nome para a paciente, os gramas e as calorias de cada linha são os da base.
- **CA-1606** · Dado a legenda "Leite e outros líquidos entram em mililitros.", então o app dá `ml` como unidade do leite e `g` para o iogurte (o teste confere em `unidadeDo`).
- **CA-1607** · Dado "Perguntas de quem atende", então as respostas 1 e 3 são as da D-606, nenhuma resposta fala em medida caseira, e a do estudante continua com o comprovante de matrícula e os 12 meses.
- **CA-1608** · Dado o topo, o campo vivo, "Grama por grama" e as perguntas, então nenhum deles diz "medida caseira", "concha", "escumadeira" nem "copo americano".

### Tema claro e escuro

- **CA-1610** · Dado a barra da landing sem sessão, então entre "Preços" e "Entrar" há um botão com o nome "Usar o tema claro"; com sessão, ele vem antes de "Ir para o painel"; em 390 px ele continua na barra, com 44 px.
- **CA-1611** · Dado nenhuma escolha guardada, quando a landing abre, então ela é escura: a raiz leva `.landing` e `.dark`, o fundo calculado é `#101a1d`, e o botão mostra a lua.
- **CA-1612** · Dado a landing escura, quando a pessoa aciona o botão (clique, Enter ou Espaço), então a landing fica clara (a raiz leva `.landing-clara` e `.tema-claro`, sem `.dark`), o botão passa a se chamar "Usar o tema escuro" e mostra o sol, e o foco continua nele; acionado de novo, volta ao escuro.
- **CA-1613** · Dado a escolha do claro, então ela fica em `metanutri:tema-da-landing`; quando a landing abre de novo, ela abre clara; a chave do tema do app (`metanutri:tema`) e a classe do `<html>` não mudam.
- **CA-1614** · Dado o armazenamento bloqueado (ler e escrever lançam erro) ou um valor estranho guardado, quando a landing abre, então ela abre escura, sem erro, e o botão troca o tema mesmo assim.
- **CA-1615** · Dado o tema claro no navegador, então o chão é `#f6f2ea`, o texto `#13282d`, o topo e as perguntas continuam teal (`#0e3b43`), a faixa "Começar" é teal com texto marfim e o rodapé é `#ece5d8` com texto teal.
- **CA-1616** · Dado cada tema, então cada título de seção contrasta pelo menos 4,5:1 com o fundo da própria seção.
- **CA-1617** · Dado o tema claro e a barra sobre uma seção de chão, então a barra pinta o chão claro, o texto dela é escuro e a logo é a versão para fundo claro; sobre o topo teal, a barra é teal com a logo para fundo escuro, nos dois temas.
- **CA-1618** · Dado o aviso "Sua conta foi excluída." na landing, então ele segue o tema da landing (claro dentro da landing clara, mesmo com o app no escuro) e se lê nos dois.
- **CA-1619** · Dado `public/preparar-pagina.js` com `claro` guardado na chave da landing, então ele marca o `<html>` com `data-tema-da-landing="claro"`; com `escuro`, nada guardado, outro valor ou armazenamento bloqueado, não marca e não quebra.
- **CA-1620** · Dado `claro` guardado e a página pré-desenhada antes de o app montar, então a landing já aparece clara (chão `#f6f2ea`) e o botão mostra o sol; nenhum script escrito na página foi acrescentado (a CSP não muda, `npm run test:csp` passa).
- **CA-1621** · Dado o tema claro, então nenhum texto fica em laranja nem sobre laranja (CA-1453 nos dois temas), e o foco é visível em todo controle.

### Espaços

- **CA-1625** · Dado a landing a 1440 px, então cada seção tem 104 px de espaço em cima e 96 px embaixo, o topo da página mede 640 px com a barra e a foto dos legumes mede 420 px.
- **CA-1626** · Dado 390 px e 320 px, nos dois temas, então não há rolagem para o lado e todo alvo de toque tem pelo menos 44 px.

### As seções da v4

- **CA-1630** · Dado as chaves, "Como funciona" e "Quanto custa", então elas continuam funcionando como hoje (os critérios CA-1470, CA-1471, CA-1474, CA-1477 e CA-1478 da landing escura passam) e, no tema claro, os títulos e os números se leem (CA-1616).

## 3. Casos de borda

- **CB-600** · Armazenamento bloqueado (aba anônima, cookies bloqueados): a landing abre escura; o botão troca o tema; recarregar volta ao escuro.
- **CB-601** · Valor estranho guardado (`azul`, vazio): vale o escuro.
- **CB-602** · App no tema escuro e landing clara: o aviso de conta excluída e os títulos ficam claros (a raiz leva `.tema-claro`).
- **CB-603** · Trocar o tema com a página rolada: a barra repinta na hora com a cor da seção embaixo dela no tema novo.
- **CB-604** · Da landing clara para Preços: Preços segue o tema do app (a marca no `<html>` só vale dentro de `.landing`).
- **CB-605** · Duas abas abertas: a escolha numa aba vale para a outra só quando ela recarregar (sem sincronizar ao vivo).
- **CB-606** · Sem JavaScript: a página pré-desenhada fica escura (o script do `<head>` não roda) e o botão de tema não faz nada, como o resto da página inerte (D-331).
- **CB-607** · Menos movimento: a troca é instantânea nos dois casos (D-614).
- **CB-608** · 360 px, texto grande (150% e 200%) e zoom de 200%: a barra cabe (a logo, o botão de tema, "Entrar" e "Criar conta") ou quebra em linhas, sem cortar nenhum controle; o título e a tabela não estouram a largura (revisão `break-ui`, D-622).
- **CB-609** · Teclado: o botão de tema entra na ordem do Tab entre "Preços" e "Entrar"; Enter e Espaço trocam; o foco não se perde ao trocar.
- **CB-610** · A barra escondida ao rolar: com foco no botão de tema, a barra volta (`:focus-within`, CB-533).

## 4. Fora de escopo

- As quatro peças desenhadas de "O plano sai do seu jeito", os três desenhos de "Como funciona" e os três cartões de "Quanto custa" (protótipo v4). Com eles, os números novos que só os desenhos usam: o almoço da Maria em gramas, o total do prato e a meta de 90% da referência (`minimoPct` de `src/domain/adequacao.ts`).
- Seguir o tema do sistema (`prefers-color-scheme`) na landing: o padrão é o escuro.
- O tema claro nas outras telas públicas (elas seguem o tema do app) e o `theme-color` da barra do navegador.
- Sincronizar a escolha entre abas abertas.
- Mudar o motor do Cobrir, a base ou os planos.

## 5. Riscos

- **R-600** · As constantes envelhecem quando o motor muda: o teste dos números falha de propósito (R-530 continua).
- **R-601** · A marca `data-tema-da-landing` no `<html>` fica depois que a pessoa sai da landing; ela só vale dentro de `.landing`, então não pinta nenhuma outra tela.
- **R-602** · A chave "Medida caseira junto dos gramas" e o "1 concha de feijão" de "Como funciona" continuam no ar até a v4, contra o pedido do dono de tirar a ênfase da medida caseira (D-600 e D-616).

---

# Landing v9: topo em foto, adequação com o anel, adesão no celular e preços com movimento

Status: **protótipo v9 (`LandingV9.dc.html` e `LandingV9Claro.dc.html`, Claude Design) aprovado pelo dono em
27/10/2026.** Esta seção registra o que a v9 muda e as regras que valem acima do protótipo. Ela substitui, da v3: D-600
(as três seções que ficavam para a v4 saem agora), D-601 e D-602 (o topo e o campo vivo saem), D-603 (vira
"Quantidades em gramas e calorias", só o almoço), D-606 na lista de perguntas, D-612 (a barra não pinta mais a seção),
D-615 (os espaços) e D-616 (as seções de hoje saem). Da landing escura: D-534 (a ordem), D-536 a D-539 (campo vivo e
chaves), D-541 (as perguntas), D-544 ("Quanto custa"), D-545 na parte da barra que pinta a seção e sai ao descer, e a
regra "passo de Como funciona não leva número" do `DESIGN.md`.

**Fonte:** o protótipo e o pedido do coordenador de 27/10 (13 itens), com as regras de veracidade: todo número sai de
`exemploDaLanding.ts`, conferido contra o motor e a base pelo `exemploDaLanding.test.ts`; nome de alimento é o do motor
ou o de `nomeParaPaciente`; missão é o texto de `missoes.ts`; preço e limite saem de `PLANOS`.

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-650 | **A ordem da página:** a barra; o topo em foto; "Adequação de micronutrientes com sugestão do que comer" (afundado); "Acompanhamento da adesão pelo celular" (chão); "Funcionalidades" (chão); a foto dos legumes; "Como funciona" (afundado); "Quantidades em gramas e calorias" (chão); "Planos e preços" (afundado); "Perguntas frequentes" (teal nos dois temas); a faixa "Começar"; o rodapé de hoje. Saem o campo vivo, as chaves, o "Como funciona" com fragmentos, "Grama por grama" com três refeições e "Quanto custa" | Protótipo v9 |
| D-651 | **A barra é de vidro e fica presa no alto o tempo todo**: o fundo é o chão do tema com 78% (escuro) ou 82% (claro) de opacidade, com desfoque de 18 px e um fio da borda embaixo. Não pinta mais a cor da seção e não sai ao descer (substitui a parte de D-545 e D-612 que fazia isso). Itens: a logo, "Funcionalidades", "Como funciona", "Planos", o botão de tema, "Entrar" e "Criar conta grátis" (com sessão, "Ir para o painel"). Até 720 px, só a logo, o tema, "Entrar" e "Criar conta". As regras de 360 px da D-622 continuam | Protótipo v9 ("barra fixa, com fundo de vidro") |
| D-652 | **O topo em foto:** a foto de ponta a ponta com o véu (escuro no tema escuro, marfim no claro; até 1.100 px, de cima para baixo, D-687), o título "Planos alimentares completos em vitaminas e minerais", o texto de apoio "O MetaNutri calcula a adequação de 20 vitaminas e minerais e sugere os alimentos, em gramas, para completar o que falta. Depois, acompanha a adesão do paciente pelo celular.", o botão "Criar conta grátis", o link "Ver o plano de exemplo" (rola até a Adequação) e a linha "Grátis com 2 pacientes ativos. Sem cartão de crédito.". O "20" é a lista da adequação sem a fibra (`MICRONUTRIENTES_ADEQUACAO`) e o "2" é o limite do Free (`PLANOS`) | Protótipo v9; número do domínio |
| D-653 | **A etiqueta de vidro do topo** diz "No plano de exemplo, falta cálcio" e "150 g de iogurte natural desnatado cobrem 91%", montada da sugestão de iogurte do cálcio (D-657). O protótipo escrevia "iogurte natural"; o nome é o de `nomeParaPaciente`, em minúscula. Ela é enfeite (`aria-hidden`) e some até 1.023 px (revisão da v9: entre 721 e 790 px, ela ficava em cima de "Ver o plano de exemplo" e roubava o clique; o protótipo a escondia só até 720 px) | Veracidade: o nome do alimento não é inventado; o link nunca fica coberto |
| D-654 | **A foto do topo:** "Healthy Meal Prep (Unsplash)", de Sambazon, CC0, pela Wikimedia Commons (3840 × 2812). Entra como as outras (D-547): webp de 1.600 px e de 800 px, qualidade 78, gerados uma vez nesta máquina com o Pillow (ferramenta da máquina, não dependência do projeto), e o registro em `THIRD_PARTY_NOTICES.md`. Por ser a primeira coisa da tela, ela não é preguiçosa e tem `fetchpriority="high"`. O `<head>` continua sem pré-carregar imagem: a foto já está no HTML pré-desenhado, e o navegador a acha na primeira leitura | D-547; a foto do topo é o maior elemento da primeira tela |
| D-655 | **A foto assenta ao abrir** (de 107% a 100% em 2,6 s) e a etiqueta surge 0,9 s depois (subindo 14 px, de transparente e desfocada a nítida, em 0,9 s). As duas só com movimento. Na página pré-desenhada, o movimento começa no HTML do build; quando o app troca o desenho pelo dele, o movimento novo continua do ponto em que estava (atraso negativo igual ao tempo desde o primeiro desenho), em vez de recomeçar. Sem JavaScript, o movimento do CSS roda até o fim e tudo fica visível | Protótipo v9, sem o salto da troca do desenho (D-549) |
| D-656 | **Adequação**, no lugar do campo vivo e das chaves: três abas (cálcio, vitamina E e vitamina D) com o nome, "640 de 1.000 mg no dia" e o percentual da referência (64%, 36% e 14%); o painel com o anel (o trilho, a base em destaque, a soma da sugestão em marfim no escuro e teal claro no claro, e a bolinha laranja na meta de 90%); o nome e o total do nutriente; as três sugestões selecionáveis (nome, gramas, "+kcal" e a cobertura); e o centro do anel com "ainda faltam X" e "de Y", ou "com 60 g", "Meta" e "atingida" quando a sugestão cobre 100%. Abaixo das abas, "Plano de exemplo: Maria, 28 anos. A meta é 90% da referência para a idade e o sexo." O "90" é o `minimoPct` do padrão do app (`PRESETS.individual`) | Protótipo v9 |
| D-657 | **As sugestões** são as três primeiras de nome diferente que o motor dá, na ordem dele (D-537 continua), com o nome de `nomeParaPaciente`: no cálcio, "Rúcula", "Iogurte natural desnatado" e "Sardinha assada"; na vitamina E, "Almeirão cru", "Amêndoa torrada salgada" e "Abacate"; na vitamina D, "Filé de salmão fresco grelhado com pele", "Atum em óleo" e "Gema de ovo cozida". A escolhida ao abrir cada aba é o iogurte, a amêndoa e o salmão. O protótipo trazia outra ordem e outros nomes ("Rúcula crua", "Amêndoa torrada", "Abacate cru", "Salmão grelhado", "Atum em conserva") | Veracidade: a ordem e o nome são os do app |
| D-658 | **"Ainda faltam" é a falta menos o que a porção traz** (nutriente da base × gramas da sugestão), escrito como o app escreve quantidade (`quantidadeNoPlano`): no cálcio com o iogurte, "24,3 mg" (o protótipo calculava 23 mg pela cobertura arredondada); na vitamina E com o abacate, "4,6 mg" (o protótipo, 4,5). "Meta atingida" quando a cobertura é 100%. No anel, a base é o percentual mostrado e a soma é (meta − base) × cobertura | Veracidade: vale o motor |
| D-659 | **O celular** mostra a tela do link do paciente com as missões do plano de exemplo, no texto exato de `missoesDoPlano` (com a água da Maria): as nove, de "Café da manhã por volta das 6h" a "Beber cerca de 2,2 litros de água", com a origem embaixo ("Refeição do plano"). O protótipo tinha quatro missões que o plano não gera ("Café da manhã por volta das 7h", "Comer a fruta do plano"). Como nove não cabem na tela do aparelho, a lista rola dentro dele. Ao abrir, as duas da manhã estão marcadas ("2 de 9"); cada missão é um botão que marca e desmarca (`aria-pressed`), e a barra "Missões de hoje" acompanha | Veracidade; o aparelho do protótipo |
| D-660 | **A data do celular** é "Terça-feira, 27 de outubro", que é terça em 2026, e a coluna "hoje" do painel é a terça. O protótipo escrevia "Terça-feira, 28 de outubro", que em 2026 é quarta | Coerência entre o celular e o painel |
| D-661 | **O painel de Adesão** tem três pacientes de exemplo, marcados como exemplo para o leitor de tela (grupo "Pacientes de exemplo"): João Pereira, "4 dias sem marcar" (o `DIAS_PARA_SUMIR` do app), com "Mensagem pronta para retomar o plano" e a imagem do botão "Chamar no WhatsApp"; Ana Beatriz Costa, "Atenção"; e Maria Santos, cuja bolinha de hoje acende quando uma missão do celular está marcada ("Em dia · 2 de 9 hoje"; sem nenhuma, "Ainda não marcou hoje"). O estado da Maria é anunciado (`aria-live`). O botão do WhatsApp é desenho, não controle (D-550): no exemplo, não há para quem mandar | Protótipo v9; D-550 |
| D-662 | **"Em segundos"** fica entre o celular e o painel, com o ícone de sincronizar. Até 1.100 px, o celular e o painel se empilham e só o ícone gira 90°; o texto continua na horizontal (o protótipo girava o texto junto e ele ficava de lado) | Leitura |
| D-663 | **Funcionalidades:** a grade de nove itens, só texto, com os textos do protótipo, em três colunas (duas até 1.100 px, uma até 720 px), e "Todas incluídas em qualquer assinatura." Duas mudanças de texto: "com a sua logo" vira "com o seu logotipo" (glossário, CA-1170), e "Cadastro de alimentos" segue a publicação 2 (D-540): ligada, "por 100 g, pela porção do rótulo ou pelo código de barras"; desligada, "pelo rótulo ou pelo código de barras" | Glossário; veracidade |
| D-664 | **Como funciona** em quatro passos numerados ("Monte o plano", "Analise a adequação", "Complete com as sugestões", "Entregue e acompanhe"), sem os exemplos. A linha entre os números acende da esquerda para a direita (1,8 s) e cada número acende quando a linha chega nele; só com movimento e só depois que o app monta; na página pré-desenhada e com menos movimento, tudo aceso. Até 1.100 px, duas colunas sem a linha; até 720 px, uma | Protótipo v9 (substitui a regra do `DESIGN.md` de passo sem número) |
| D-665 | **"Quantidades em gramas e calorias"**: o texto "Cada alimento do plano sai com o peso e as calorias da Base MetaNutri.", as duas fotos de hoje com as legendas e a tabela só do almoço (arroz, feijão, patinho, abóbora e chuchu, conferidos na base). A legenda da tabela para o leitor de tela vira "Um almoço de plano, com os gramas e as calorias de cada alimento" (o protótipo dizia "Um dia", com um almoço só) | Protótipo v9; veracidade |
| D-666 | **Planos e preços:** o título, "Todos os planos incluem todas as funcionalidades. Muda só o número de pacientes ativos. Sem fidelidade e sem preço promocional.", a troca "Mensal" e "Anual" (polegar que desliza, `aria-pressed`), a régua "Pacientes ativos" de 1 a 60 (60 é "60+"), o veredito "Para N pacientes ativos, o plano indicado é o X." (anunciado), os cartões Free, Solo e Pro, os cartões Estudante e Clínica e a nota "O pagamento é com cartão de crédito, aqui no site. Você cancela quando quiser em Conta e assinatura." Ao abrir: mensal e 12 pacientes (Solo indicado) | Protótipo v9 |
| D-667 | **O plano indicado** é o primeiro de Free, Solo e Pro cujo limite de pacientes ativos (`PLANOS`) cabe o número da régua: até 2, Free; até 25, Solo; acima, Pro. O cartão indicado sobe 10 px, ganha o brilho em cima, a borda laranja que gira (7 s por volta, só grafismo, atrás de nada escrito) e o selo "Indicado", que nos outros fica transparente e escondido do leitor de tela. Até 1.100 px, os cartões empilham e o indicado não sobe | Protótipo v9; laranja só como grafismo (D-532) |
| D-668 | **Os preços trocam com desfoque e deslize** (0,35 s de opacidade e desfoque, 0,5 s de deslize): o que sai sobe e desfoca, o que entra sobe de baixo. Mensal: "R$ 34,90", "por mês" e "ou R$ 299 por ano"; anual: "R$ 299", "por ano" e "R$ 24,92 por mês · economize R$ 119,80" (`mensalizadoDoAnual` e 12 × mensal − anual); o mesmo no Pro. O Free não troca (o preço é o mesmo nos dois ciclos; o protótipo trocava "R$ 0" por "R$ 0"). O leitor de tela lê "R$ 34,90 por mês" de um texto escondido, e o ciclo que não vale fica escondido dele. Com menos movimento, só a opacidade troca | Protótipo v9 |
| D-669 | **A luz que segue o ponteiro:** em cada cartão de plano, um círculo de luz de 340 px segue o ponteiro, só em quem tem mouse (`hover: hover` e `pointer: fine`) | Protótipo v9 |
| D-670 | **Os botões dos planos** usam o caminho de hoje (`aoEscolher`): "Começar grátis" (Free) e "Criar conta de estudante" criam conta ("free" e "estudante"); "Assinar o Solo" e "Assinar o Pro" escolhem o ciclo da troca ("Assinar o Solo anual" no anual); "Fale com a gente" (Clínica) abre o e-mail do contato e some sem contato (CB-542). O botão do indicado é a ação cheia; os outros, a ação discreta | Pedido do coordenador; D-544 |
| D-671 | **O cartão Estudante** diz "Grátis por 12 meses ou até a formatura, o que vier antes, com o e-mail da faculdade e o comprovante de matrícula. Na formatura, os pacientes continuam na conta. Uso não comercial." O protótipo não falava do comprovante; o app pede (D-541, D-606). O "Uso não comercial." vem de `usoNaoComercial` em `PLANOS` (revisão da v9). "Na formatura, os pacientes continuam na conta" é o que o app faz: o Estudante vencido volta ao Free sem apagar nada (CA-175) | Veracidade |
| D-672 | **Perguntas frequentes:** as oito do protótipo, na ordem dele, com a do estudante de hoje (o e-mail da faculdade, o comprovante de matrícula, 12 meses ou a formatura, o que vier antes) e a do alimento que não está na base pela publicação 2 (D-540) | Protótipo v9; veracidade |
| D-673 | **A faixa "Começar"** cresce com a palavra: a altura mínima é 176 px mais 1,02 vez o tamanho da palavra (até 720 px, o maior entre 320 px e 150 px mais 1,05 vez 20vw), e a palavra fica a 22 px mais 0,22 da letra da borda de baixo. Assim a frase nunca fica embaixo da palavra e o cedilha nunca é cortado, em 2.000, 1.440 e 390 px. A frase vira "Crie sua conta e monte o primeiro plano hoje, sem cartão de crédito." (com vírgula: "Sem cartão de crédito." já é a frase do topo, e a landing não repete frase, CA-1481) | Protótipo v9; regra de texto do dono |
| D-674 | **O botão fixo "Criar conta grátis"** no pé da tela, só até 720 px, sem sessão, com 52 px de altura e 12 px das bordas; o rodapé ganha 88 px embaixo para ele não cobrir o último link. Com sessão, não aparece (a barra já tem "Ir para o painel") | Protótipo v9 |
| D-675 | **O rodapé é o de hoje**: sem a linha "[Razão social] · CNPJ…" do protótipo, que ainda não tem os dados | Pedido do coordenador |
| D-676 | **Tokens novos** (`--landing-*`, com valor nos dois temas, do bloco v9 do protótipo): vidro da barra, véu do topo (e o do celular), tinta e tinta suave do topo, vidro da etiqueta, luz do cartão, sombra do cartão (só no claro), luz do ponteiro, brilho do indicado, cartão de cima do gradiente do plano, âmbar do "Atenção", a soma do anel e as cores do aparelho (corpo, tela, tinta, missão, missão feita, contorno da caixa e do botão). Primitivas novas em `tokens.css` para os valores que não existiam | Cor só por token (D-531) |
| D-677 | **Medidas da v9:** seções com 88 px em cima e 80 px embaixo (substitui os 104 e 96 da D-615); título de seção de 30 a 56 px (`clamp(30px, 3.8vw, 56px)`, até 24 caracteres por linha); o texto de apoio com 20 px a 20 px do título; o topo com 720 px de altura mínima (640 px até 720 px de largura) | Protótipo v9 |
| D-678 | **Toque de 44 px** onde o protótipo desenhava menos: os botões "Mensal" e "Anual" (40 px no protótipo) e a régua (a caixa tem 44 px; o trilho desenhado, 6 px, e a bolinha, 26 px) | D-551 |
| D-679 | **O movimento**, todo com alternativa para menos movimento: o anel e a soma deslizam em 0,9 s; a barra de missões em 0,5 s; a bolinha da Maria cresce ao acender; o polegar da troca em 0,5 s; os preços (D-668); os cartões de plano entram ao rolar (como as outras partes, D-549) com 80 ms entre eles; o feixe gira 7 s por volta; a linha de "Como funciona" (D-664). Com menos movimento: nada desliza nem gira; os preços trocam só a opacidade; o indicado não sobe | Protótipo v9; `emil-design-eng` |
| D-680 | **A página pré-desenhada** (D-331) continua nos dois temas: o build desenha a v9 inteira, com tudo no estado final (a linha de "Como funciona" acesa, os cartões visíveis), e o script do `<head>` continua marcando o tema claro (D-613) | D-331 e D-613 continuam |
| D-681 | **Saem do código**: `VitrineDoCobrir`, `ListaDoCobrir`, `perguntaDaVitrine`, `ChavesDoPlano`, `FaixaComChave`, o `ComoFunciona` antigo e `PassoDeComoFunciona`, `GramaPorGrama` (vira `QuantidadesEmGramas`), `QuantoCusta`, `PerguntasDeQuemAtende` (vira `PerguntasFrequentes`) e `barraDoTopo`, com os testes deles; em `exemploDaLanding.ts`, os números do campo vivo, das chaves, do "Cobrir cálcio", do feijão na concha e das três refeições | D-650 |
| D-682 | **Desenho em px, controle que reflui** (revisão `break-ui`): o anel, o celular e o painel de Adesão são desenho de tela e ficam em px, como uma imagem (com o texto do sistema a 200%, o texto deles passava do círculo e do aparelho); os controles de verdade refluem: a cobertura das sugestões desce para baixo do nome, os botões dos planos e do Estudante quebram em linhas e o botão do Estudante e da Clínica desce para baixo do texto quando falta lugar. Até 720 px, o painel de Adesão aperta o avatar e as bolinhas para o nome caber em 360 px | Nenhuma peça fora da tela em 360 px, texto a 200% e zoom de 200% |
| D-683 | **A logo da barra de vidro vem do CSS**: as duas versões (para fundo escuro e para fundo claro) estão no HTML, e a variante `landing-clara:` mostra a do tema, como o sol e a lua do botão. Assim a página pré-desenhada clara já nasce com a logo certa, antes de o app montar | D-613 |
| D-684 | **O preço para o leitor de tela** é um texto escondido com "R$ 34,90", seguido do período que já está na tela ("por mês"). O protótipo usava `aria-label` num `<p>`, que os leitores não leem com segurança | Acessibilidade |
| D-685 | **Os cartões de plano entram em sequência**, com 80 ms entre eles: o `data-surge` aceita a ordem ("0", "1", "2"); sem ela, o atraso continua pela posição da parte na página. A vírgula do preço grande fica como no protótipo: a Manrope desta versão tem a mesma largura nos algarismos de tabela e nos proporcionais (medido no navegador), e a folga é do desenho da vírgula | Protótipo v9 (`.plano:nth-child`) |
| D-686 | **Pequenas trocas de marcação**: os nomes do Estudante e da Clínica são `h3` (o protótipo usava `strong`), a etiqueta do topo é enfeite (`aria-hidden`), o fundo do topo enquanto a foto carrega é o chão do fundo do tema (o protótipo fixava o carvão nos dois), e o botão fixo do celular fica no fim do `main`, depois da faixa "Começar", na ordem do Tab | Acessibilidade e coerência |
| D-687 | **Correções da revisão independente da v9.** (1) O véu da foto do topo: de cima para baixo até 1.100 px, começando em 62% (era 20%) e chegando a 85% (88% no claro) a um terço da altura; de lado, denso até 58% da largura, onde o título termina; com isso, o título tem 4,5:1 sobre qualquer pixel da foto (medido no e2e de 390 a 2.000 px, nos dois temas). (2) A etiqueta tem vidro de 75% e o "91%" em marfim no escuro (`--landing-etiqueta-numero`), e some até 1.023 px. (3) A resposta dos dados diz "Antes de gerar o link, você confirma que tem a autorização do paciente." (o app pede a declaração da nutricionista). (4) Com o botão fixo do celular, a página deixa 88 px embaixo ao rolar até o foco (`scroll-padding-bottom`). (5) O leitor de tela ouve um resumo da Adequação ("Cálcio. Iogurte natural desnatado, 150 g: ainda faltam 24,3 mg de 260 mg."), não o painel inteiro. (6) O anel da sugestão não escolhida e o da missão desmarcada usam a tinta suave (3:1 ou mais). (7) "Uso não comercial." no cartão Estudante (D-671). (8) Com menos movimento, a rolagem até a seção vai na hora. (9) Sem `first-paint` (Safari e Firefox), o topo continua pelo `first-contentful-paint` | Revisão independente de 27/10 |

## 2. Critérios de aceite

### Barra e topo

- **CA-1650** · Dado a landing sem sessão, então a barra tem a logo, "Funcionalidades", "Como funciona", "Planos", o botão de tema, "Entrar" e "Criar conta grátis", nesta ordem; os três primeiros links levam às seções; com sessão, "Ir para o painel" no lugar de "Entrar" e "Criar conta grátis".
- **CA-1651** · Dado a landing rolada até o meio, então a barra continua no alto, com o fundo de vidro do tema (chão com 78% no escuro, 82% no claro) e o desfoque, em qualquer seção.
- **CA-1652** · Dado o topo, então ele tem o `h1` "Planos alimentares completos em vitaminas e minerais", o texto de apoio da D-652, "Criar conta grátis" (chama quem manda), "Ver o plano de exemplo" (rola até a Adequação) e "Grátis com 2 pacientes ativos. Sem cartão de crédito."
- **CA-1653** · Dado o domínio, então o "20" do topo é o número de micronutrientes da adequação sem a fibra e o "2" é o limite de pacientes do Free.
- **CA-1654** · Dado o topo a 1.440 px, então a etiqueta diz "No plano de exemplo, falta cálcio" e "150 g de iogurte natural desnatado cobrem 91%", e é escondida do leitor de tela; a 390 px, ela não aparece.
- **CA-1655** · Dado a foto do topo, então ela tem texto alternativo, largura e altura, as versões de 800 e 1.600 px em webp, não é preguiçosa e tem prioridade alta; o arquivo tem no máximo 1.600 px.
- **CA-1656** · Dado movimento permitido e a landing aberta pelo app, então a foto anima de 107% a 100%; dado menos movimento, então nada anima no topo.
- **CA-1657** · Dado a página pré-desenhada e o app montando T ms depois do primeiro desenho, então a animação da foto do app começa com atraso de −T ms (continua de onde estava); aberta pelo app, começa do zero.

### Adequação

- **CA-1658** · Dado a Adequação, então há três abas (Cálcio, Vitamina E e Vitamina D), cada uma com o total do dia e o percentual da referência, e só a do cálcio pressionada ao abrir.
- **CA-1659** · Dado o motor, quando o teste roda o exemplo, então cada aba tem o total, a referência, a falta e o percentual da referência do motor, e a meta é o `minimoPct` do padrão (90).
- **CA-1660** · Dado o motor, então as três sugestões de cada nutriente são as três primeiras de nome diferente, na ordem do motor, com o nome de `nomeParaPaciente`, os gramas, as kcal e a cobertura do motor.
- **CA-1661** · Dado cada sugestão, então o "ainda faltam" é a falta menos o nutriente da porção, escrito por `quantidadeNoPlano`, e a sugestão que cobre 100% diz "Meta atingida".
- **CA-1662** · Dado o cálcio, então o iogurte está escolhido ao abrir e o centro diz "ainda faltam", "24,3 mg" e "de 260 mg"; quando a pessoa escolhe a sardinha, o centro diz "com 60 g", "Meta" e "atingida".
- **CA-1663** · Dado a aba da vitamina E, quando a pessoa a escolhe, então o painel mostra a vitamina E com a amêndoa escolhida; na vitamina D, o salmão.
- **CA-1664** · Dado o anel, então a base é o percentual mostrado, a soma começa onde a base termina e mede (meta − base) × cobertura, e a bolinha laranja fica nos 90%.
- **CA-1665** · Dado a troca de aba ou de sugestão, então o painel é anunciado (`aria-live`), e abas e sugestões são botões com `aria-pressed`, dentro de grupos com nome.

### Acompanhamento da adesão

- **CA-1666** · Dado o celular, então ele mostra "Olá, Maria", "Terça-feira, 27 de outubro", a barra "Missões de hoje" com "2 de 9" e as nove missões de `missoesDoPlano` do exemplo, com a origem de cada uma, e as duas primeiras marcadas.
- **CA-1667** · Dado o motor, então as missões do celular são, no texto e na ordem, as de `missoesDoPlano` do plano de exemplo com a água da Maria, e 27/10/2026 é terça-feira.
- **CA-1668** · Dado uma missão, quando a pessoa a marca (clique, Enter ou Espaço), então ela fica pressionada, a barra passa a "3 de 9" e a largura acompanha; marcada de novo, desmarca.
- **CA-1669** · Dado nenhuma missão marcada, então a Maria diz "Ainda não marcou hoje" e a bolinha de hoje fica vazia; quando uma é marcada, a bolinha acende e o estado vira "Em dia · 1 de 9 hoje", anunciado ao leitor de tela.
- **CA-1670** · Dado o painel, então ele está num grupo "Pacientes de exemplo", com João Pereira ("4 dias sem marcar", o `DIAS_PARA_SUMIR` do app), Ana Beatriz Costa ("Atenção") e Maria Santos, os dias S, T, Q, Q, S, S, D com a terça como hoje, e "Chamar no WhatsApp" só na linha do João, como imagem (sem foco nem clique).
- **CA-1671** · Dado a seção, então "em segundos" fica entre o celular e o painel; até 1.100 px, o texto continua na horizontal.

### Funcionalidades, Como funciona e Quantidades

- **CA-1672** · Dado "Funcionalidades", então há "Todas incluídas em qualquer assinatura." e nove itens, cada um com título (`h3`) e texto, os do protótipo com "o seu logotipo" e o cadastro de alimentos pela publicação 2.
- **CA-1673** · Dado "Como funciona", então há uma lista ordenada de quatro passos, numerados de 1 a 4, com os títulos e textos do protótipo e sem os exemplos.
- **CA-1674** · Dado movimento permitido e o app montado, quando "Como funciona" entra na tela, então a linha acende e os números acendem em sequência; na página pré-desenhada e com menos movimento, já estão acesos.
- **CA-1675** · Dado "Quantidades em gramas e calorias", então há o texto, as duas fotos com as legendas e a tabela "Um almoço de plano, com os gramas e as calorias de cada alimento", só com o almoço (cinco alimentos), cada linha conferida na base.

### Planos e preços

- **CA-1676** · Dado "Planos e preços", então há a troca Mensal e Anual (Mensal pressionado), a régua "Pacientes ativos" em 12 e o veredito "Para 12 pacientes ativos, o plano indicado é o Solo."
- **CA-1677** · Dado os cartões Free, Solo e Pro, então nome, descrição, preço, limites e botões saem de `PLANOS`, e "Todas as funções" fecha cada lista.
- **CA-1678** · Dado a troca, quando a pessoa escolhe Anual, então o Solo mostra "R$ 299", "por ano" e "R$ 24,92 por mês · economize R$ 119,80", o Pro "R$ 599" e "R$ 49,92 por mês · economize R$ 179,80", os botões viram "Assinar o Solo anual" e "Assinar o Pro anual", e o leitor de tela lê só o ciclo que vale.
- **CA-1679** · Dado a régua, quando a pessoa escolhe 1, 2, 3, 25, 26 e 60, então o indicado é Free, Free, Solo, Solo, Pro e Pro, o veredito acompanha ("60 ou mais pacientes ativos" e "60+" no 60) e só o indicado leva a classe e o selo.
- **CA-1680** · Dado os botões, quando a pessoa clica, então "Começar grátis" chama `aoEscolher('free', 'mensal')`, "Assinar o Solo" `('solo', 'mensal')`, "Assinar o Pro anual" `('pro', 'anual')`, "Criar conta de estudante" `('estudante', 'mensal')`, e "Fale com a gente" é um link para o e-mail do contato.
- **CA-1681** · Dado o cartão Estudante, então ele tem o texto da D-671; a Clínica, "Condições combinadas por e-mail."; e a nota do pagamento fica embaixo.
- **CA-1682** · Dado o navegador com movimento, quando a pessoa troca para Anual, então o preço que sai desfoca e sobe e o que entra aparece; o cartão indicado tem a borda girando; com menos movimento, nada gira nem desliza.

### Perguntas, faixa final, botão fixo e rodapé

- **CA-1683** · Dado "Perguntas frequentes", então há oito perguntas fechadas, na ordem do protótipo, com a do estudante com o comprovante de matrícula e os 12 meses, e a do alimento que não está na base pela publicação 2.
- **CA-1684** · Dado a faixa "Começar" a 2.000, 1.440 e 390 px, então a frase termina acima do alto da letra da palavra, e o desenho do cedilha termina dentro da faixa.
- **CA-1685** · Dado a faixa, então ela é um link para Criar conta com a frase "Crie sua conta e monte o primeiro plano hoje, sem cartão de crédito." e a palavra "Começar".
- **CA-1686** · Dado 390 px sem sessão, então o botão "Criar conta grátis" fica fixo no pé da tela, com pelo menos 44 px, e chama Criar conta; a 1.440 px e com sessão, não aparece; o rodapé não fica coberto no fim da página.
- **CA-1687** · Dado o rodapé, então ele é o de hoje (CA-1461) e não tem "Razão social" nem "CNPJ".

### Página toda

- **CA-1688** · Dado a landing, então os títulos são, nesta ordem, o `h1` e os `h2` "Adequação de micronutrientes com sugestão do que comer", "Acompanhamento da adesão pelo celular", "Funcionalidades", "Como funciona", "Quantidades em gramas e calorias", "Planos e preços" e "Perguntas frequentes".
- **CA-1689** · Dado cada tema, então cada título contrasta pelo menos 4,5:1 com o fundo atrás dele (o do topo, com o véu), e nenhum texto fica em laranja nem sobre laranja.
- **CA-1690** · Dado 360, 390 e 1.440 px, nos dois temas, então não há rolagem para o lado e todo alvo de toque tem pelo menos 44 px (a régua pela caixa).
- **CA-1691** · Dado o texto do sistema em 200% e o zoom de 200% (break-ui), então nenhum controle sai da tela e nenhuma seção estoura a largura.
- **CA-1692** · Dado a página pré-desenhada pelo build, então ela tem os títulos da v9, o preço do Solo e as respostas no HTML, nasce no tema guardado (escura sem escolha, clara com o claro guardado) e nada fica transparente esperando o app.
- **CA-1693** · Dado o texto de venda, então nenhuma frase se repete, nenhum nome de fonte da base aparece, e nada fala de medida caseira.
- **CA-1694** · Dado o teclado, então o foco é visível em todo controle e segue a ordem da página (barra, topo, abas, sugestões, missões, troca, régua, botões dos planos, perguntas, faixa, rodapé).

## 3. Casos de borda

- **CB-650** · Menos movimento: a foto e a etiqueta não animam; o anel, a barra das missões e o polegar trocam sem deslizar; o feixe não gira; os preços trocam só a opacidade; "Como funciona" já nasce aceso; os cartões não entram.
- **CB-651** · Sem `IntersectionObserver`: nada se esconde; "Como funciona" fica aceso e os cartões visíveis.
- **CB-652** · Sem JavaScript: a página pré-desenhada mostra tudo; os botões não fazem nada (D-331); a régua mostra 12 e o veredito do Solo.
- **CB-653** · Todas as missões desmarcadas: "0 de 9", a barra vazia, a Maria "Ainda não marcou hoje"; todas marcadas: "9 de 9" e a barra cheia.
- **CB-654** · Marcar e desmarcar rápido: o estado final é o do último toque (sem animação presa); a bolinha da Maria segue.
- **CB-655** · Trocar de aba com uma sugestão escolhida: a aba nova abre na sugestão dela (iogurte, amêndoa, salmão), não na posição da anterior.
- **CB-656** · A régua no teclado: setas mudam de 1 em 1, Home vai a 1 e End a 60; o veredito acompanha.
- **CB-657** · Trocar Mensal e Anual várias vezes seguidas: os preços terminam no ciclo escolhido e o leitor de tela lê só ele.
- **CB-658** · Sem contato configurado (`CONTATO_EMAIL` nulo): o cartão da Clínica fica sem o botão (CB-542).
- **CB-659** · Ponteiro de toque: a luz do ponteiro não aparece; o cartão indicado continua com o brilho e o feixe.
- **CB-660** · 360 px, texto em 200% e zoom de 200%: a barra quebra em linhas (D-622); os nomes longos das sugestões ("Filé de salmão fresco grelhado com pele") quebram linha sem empurrar a cobertura para fora; o painel de Adesão encolhe o nome com reticências; a tabela vira linhas de grade.
- **CB-661** · Nome longo de paciente no painel: reticências na mesma linha, sem empurrar as bolinhas.
- **CB-662** · Com sessão: a barra tem "Ir para o painel", o botão fixo do celular não aparece e o "Criar conta grátis" do topo continua (como hoje).
- **CB-663** · Trocar o tema com a página rolada: a barra de vidro e as seções trocam na hora (D-614 continua).
- **CB-664** · Duas abas da landing: o tema continua o da chave da landing (CB-605); o estado das missões, da régua e da troca não é guardado.

## 4. Fora de escopo

- A linha da razão social e do CNPJ no rodapé (os dados não existem).
- Guardar o estado do exemplo (missões, régua, ciclo) entre visitas.
- Mudar o motor, a base, as missões ou os planos.
- Uma foto do topo maior que 1.600 px.

## 5. Riscos

- **R-650** · A foto de 1.600 px em tela de 1.440 px com densidade 2 fica um pouco mole; o véu e o desfoque da própria foto escondem. Se o dono quiser mais nitidez, uma versão de 2.400 px muda a regra da D-547.
- **R-651** · As missões do exemplo mudam se o plano de exemplo mudar; o teste das missões falha de propósito (R-600).
- **R-652** · O painel de Adesão é inventado (três pacientes de exemplo); ele é marcado como exemplo para o leitor de tela e não traz número que pareça do app além do "4 dias" e do estado.
