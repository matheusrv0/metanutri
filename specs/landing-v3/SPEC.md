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
- **CB-608** · 360 px, texto grande (200%) e zoom de 200%: a barra cabe (a logo, o botão de tema, "Entrar" e "Criar conta"), o título e a tabela não estouram a largura (revisão `break-ui`).
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
