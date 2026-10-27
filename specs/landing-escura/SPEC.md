# SPEC — Landing escura

Status: **protótipo aprovado pelo dono em 27/10/2026.** A tela foi decidida olhando o protótipo no Claude Design
(`Main.dc.html`, seção por seção) e o rascunho em HTML puro da mesma página (`index2.html`, já medido pelo inspetor da
skill `design-taste-frontend`). Esta spec registra o que foi aprovado e as regras do dono que valem acima do protótipo.

**Fonte:** "Site amador" (23/10): landing, layout, fontes, textos e imagens fracos. O dono pediu uma página nova, com
direção de arte da skill `design-taste-frontend` (direção `type-only-statement`, palete e tipo da marca mantidos) e
aprovou o protótipo escuro em 27/10.

**Lido antes:** `DESIGN.md`, `PRODUCT.md`, `specs/site-publico-profissional` (D-320 a D-339, a pré-renderização D-331 e
a guarda CA-990), `specs/textos-e-promessas` (D-402 a D-407), `specs/limpeza-visual` (sem tagline, Manrope),
`specs/pdf-e-telas-limpas` (CA-321: a área pública fala em "Base MetaNutri"), o motor do Cobrir (`src/domain/cobrir.ts`)
e o plano de exemplo (`src/domain/exemplo.ts`).

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-530 | **A landing é escura sempre**, em qualquer tema do app e do sistema: carvão com matiz teal (chão `#101a1d`, afundado `#142226`, cartão `#192a2f`), texto `#eef2f1` e `#a9bfc2`, teal `#0e3b43` e `#7cc0cb`, marfim `#f6f2ea` na ação, laranja `#f26a2e` só como grafismo. As outras telas públicas (Preços, Termos, Privacidade, Referências, Entrar) continuam seguindo o tema | Regra do dono. O escuro é a cara da marca na vitrine; as telas de formulário e de leitura longa não mudam nesta spec |
| D-531 | **Cores só por token.** O escuro da marca vira primitivas em `design-system/tokens/tokens.css` (`--carvao-*`, `--teal-950`) e semânticos num escopo próprio, `.landing-escura` (`--landing-*`), ligados ao Tailwind em `globals.css` (`bg-landing-chao`, `text-landing-tinta`…). O `DESIGN.md` ganha a seção "Landing escura" | Nenhuma cor escrita fora dos tokens (o lint cobra no TS; a revisão cobra no CSS) |
| D-532 | **O laranja nunca fica atrás de texto.** No protótipo, a faixa "Começar" ficava laranja no hover, com o texto teal por cima (4,1:1, reprova para texto de 20 px). No código, o hover da faixa vai a branco, e a seta passa a laranja e anda | `DESIGN.md` > Accent: botão laranja com texto em cima está proibido nos dois temas |
| D-533 | **Manrope em tudo**, pela fonte já embutida (`@fontsource`); Bricolage só no nome da marca, pelo componente `Logo`. Nada de Google Fonts: a CSP não permite e não vai permitir | Regra do dono; o protótipo carregava as duas do Google |
| D-534 | **Ordem da página** (a do protótipo): topo; o campo vivo "O que falta no plano da Maria, 28 anos?"; "O plano sai do seu jeito" (cinco chaves); a foto dos legumes; "Como funciona" (três passos); "Na medida da cozinha" (duas fotos e um dia em medidas caseiras); "Quanto custa"; "Perguntas de quem atende"; a faixa "Começar"; o rodapé | Aprovado no protótipo |
| D-535 | **O topo é só texto**: "Falta cálcio?" (teal claro) e "1 copo de iogurte" (marfim) com a bolinha laranja no lugar do ponto (o ponto continua para o leitor de tela), "Criar conta grátis", "Ver no plano de exemplo" e a frase "Para nutricionistas: o MetaNutri calcula quanto falta de cada vitamina e mineral no plano alimentar e mostra o que comer para completar, em medida caseira." | Direção `type-only-statement`: a primeira tela é feita de palavras; as fotos chegam depois, como alívio |
| D-536 | **O campo vivo** ("a coisa viva" da direção): um campo de texto grande com "falta cálcio"; o que se digita escolhe o cartão do Cobrir de cálcio, vitamina E ou vitamina D do plano de exemplo; três botões preenchem o campo. Sem um dos três, o cartão diz "Neste exemplo" e "Experimente cálcio, vitamina E ou vitamina D." | O visitante vê o diferencial funcionando, com os números do app |
| D-537 | **Os números do campo vivo e de "Como funciona" são os do motor.** Ficam em constantes (`src/ui/publico/inicio/exemploDaLanding.ts`), porque o motor e a base pesam no pacote da página; um teste roda `criarExemplo` → `totaisDoPlano` → `calcularAdequacao` → `sugerirParaCobrir` (com o gasto de `calcularEnergia`) e falha se uma letra divergir. O cartão mostra as três primeiras sugestões com o primeiro nome diferente (a vitamina D trazia dois salmões); "Como funciona" mostra as cinco do cálcio | Regra do dono. O teste é a prova; as constantes, o desempenho |
| D-538 | **Sai "Cabem mais 495 kcal no dia"** do cartão e de "Cobrir cálcio". O motor dá 15 kcal para o exemplo (gasto 1.620 kcal, plano 1.605 kcal). O parágrafo ao lado deixa de dizer "sem passar das calorias do dia" (o Cobrir avisa quando passa; não impede): "O cálculo usa as referências de ingestão para a idade e o sexo da paciente. Cada sugestão traz a porção, quanto da falta ela cobre e as calorias que soma ao dia. Você escolhe o que entra." | O número do protótipo não era o do motor, e a frase prometia o que o motor não faz |
| D-539 | **As cinco chaves** (medida caseira, água pelo peso, alergia a leite, plano no celular, alimentos que a base não tem) começam com as duas primeiras ligadas; ligada, a faixa ganha a cor dela e mostra o efeito. Cada efeito é verdade conferida por teste: a concha de feijão (140 g), a água da Maria (35 ml × 62 kg = 2,2 L), o iogurte fora do Cobrir de cálcio com alergia a leite | Aprovado no protótipo; a frase não pode afirmar o que o app não faz |
| D-540 | **Alimento próprio segue a publicação 2.** Com `MEUS_ALIMENTOS_NOVOS` desligado (a `main` hoje), a chave e a pergunta dizem "pelo rótulo ou pelo código de barras"; ligado, dizem o texto do protótipo ("por 100 g ou pela porção do rótulo, com as medidas caseiras que você usa"). Um teste cobre os dois estados | O formulário novo de Meus alimentos só vale na publicação 2 (D-383); o site não promete antes |
| D-541 | **Perguntas de quem atende**, com as respostas que o app sustenta. Saem do protótipo: "a conta sai sozinha depois de 30 minutos sem uso" (não existe na `main`; vem com a separação site × app), "vê o plano" sem condição (o link mostra o plano só se a nutricionista quiser) e "com o e-mail da faculdade" sem o comprovante (o Estudante pede os dois e vale 12 meses ou até a formatura). "Cada alimento com as medidas caseiras" vira "a maioria com as medidas caseiras" | O texto do site não promete o que o app não faz (D-328) |
| D-542 | **Autoridade própria.** O texto de venda fala em "Base MetaNutri" e em "referências de ingestão"; não nomeia TACO, IBGE, POF, USDA, NASEM, DRI nem Open Food Facts. A página "Fontes" passa a se chamar **Referências** (título, rótulo no rodapé, `<title>`, `llms.txt`); o endereço `/fontes/` e a rota `#/fontes` ficam. A citação que a licença exige fica só lá | Regra do dono |
| D-543 | **A guarda CA-990 cobra os nomes das fontes** no texto de venda: a landing (`src/ui/publico/inicio/`, `TelaInicio.tsx`), a moldura pública, Preços, o `index.html`, o `llms.txt` e os títulos e descrições das páginas indexáveis que não são Referências | Regra do dono |
| D-544 | **Preços saem de `src/domain/conta.ts`**: o Solo em destaque (R$ 34,90 por mês, 25 pacientes ativos, 25 links, R$ 299 por ano) e uma linha para Free, Pro, Estudante e Clínica. "Assinar o Solo" faz o mesmo que o "Assinar" do Solo mensal em Preços | Nada escrito à mão de novo (D-327) |
| D-545 | **Topo e rodapé próprios da landing.** O topo: a logo, "Como funciona", "Preços", "Entrar" e "Criar conta grátis" ("Criar conta" no celular); com sessão, só "Ir para o painel". Ele fica preso no alto, pinta-se da cor da seção que está embaixo dele, some ao rolar para baixo e volta ao rolar para cima, ao receber foco ou no alto da página; no rodapé, sai. O rodapé: "MetaNutri: software para nutricionistas.", "Voltar ao topo", "Fale com a gente" (o `CONTATO_EMAIL`, por `mailto:`), Preços, Termos de uso, Política de privacidade, Referências e "Brasil, {ano}". A `MolduraPublica` usa esse topo e esse rodapé quando a tela é a inicial | O comportamento do topo é o do rascunho em HTML (`index2.html`); no Claude Design ele ficava parado porque a tela do canvas não rola |
| D-546 | **Medidas do rascunho medido** (`index2.html`) onde ele e o canvas diferem: altura do topo da página em `svh`, a foto em 64 `svh`, a faixa "Começar" em 46 `svh` e o rodapé em 56 `svh` | O canvas tem 8.000 px de altura fixa e não mede a tela de verdade |
| D-547 | **Três fotos, CC0**, em `public/imagens/` com nome em português e versão de 800 px: `legumes-na-bancada`, `dois-copos-de-leite`, `salada-com-frango` (webp, qualidade 78, no máximo 1.600 px). Sem foto regional e sem regionalismo como argumento | Aprovado no protótipo; licença sem crédito obrigatório, registrada em `THIRD_PARTY_NOTICES.md` |
| D-548 | **Saem as capturas e a foto da landing antiga**: `public/imagens/cobrir-*.png`, `missoes-*.png`, `pratos-heroi*.webp`, `scripts/capturas-landing.mjs`, `scripts/pratos_heroi.py` e o pré-carregamento da foto em `public/preparar-pagina.js` | A página nova não usa nenhum deles |
| D-549 | **Movimento só com `prefers-reduced-motion: no-preference`**: o título sobe ao abrir; as partes de cada seção sobem 22 px com opacidade ao entrar na tela, uma vez; a foto dos legumes deriva devagar; o cursor da chamada pisca; as chaves e as faixas trocam de cor com transição. Na página pré-desenhada e sem JavaScript, nada nasce escondido: o escondido só vale depois que o app monta e marca a raiz, e o que já está na tela nesse momento entra visível | CA-998 continua: nada sai invisível esperando animação |
| D-550 | **Fragmentos de interface** (o cartão do Cobrir, a adequação, o seletor de medida) são desenho do app, marcados com `data-ui`; os botões "Adicionar" e "Cobrir" deles são imagem, não controle: não recebem foco nem clique | Botão que não faz nada é armadilha para teclado e leitor de tela |
| D-551 | **Alvos de 44 px** em tudo que se toca: botões do topo, exemplos do campo, chaves (a área de toque passa da bolinha), perguntas e links do rodapé | Regra de acessibilidade do projeto |
| D-552 | **A landing vira um conjunto de componentes**, um por arquivo, em `src/ui/publico/inicio/`; `TelaInicio.tsx` só os junta. `TelaInicio` passa a receber `aoEscolher(plano, ciclo)` (o "Assinar o Solo") no lugar de `aoVerPrecos` | Convenção do projeto |
| D-553 | **Fica fora:** a separação site × app (domínios, sessão com tempo), as telas do app (inclusive os botões "Fontes da base" de Adequação, Ajuda e Alimentos, que continuam com esse nome e abrem a página Referências), Preços, Termos e Privacidade no escuro, e o `theme-color` da barra do navegador na landing | Outras specs |

## 2. Critérios de aceite

### Escuro, tokens e fontes

- **CA-1450** · Dado o app no tema claro (guardado ou do sistema), quando a landing abre, então o fundo dela é o chão escuro (`#101a1d`, cor calculada), o topo é teal e o texto corrido é `#eef2f1`.
- **CA-1451** · Dado o código da landing (`src/ui/publico/inicio/`), quando o lint roda, então não há cor escrita (hexadecimal) nem `font-family`; as cores da landing existem em `tokens.css` como primitivas e semânticos `--landing-*` e estão descritas no `DESIGN.md`.
- **CA-1452** · Dado a landing no navegador, então todo texto usa Manrope (fonte calculada) e só o nome na logo usa Bricolage; nenhum pedido sai para `fonts.googleapis.com` ou `fonts.gstatic.com`.
- **CA-1453** · Dado qualquer estado da landing (hover incluído), então nenhum texto fica em laranja nem sobre fundo laranja; o laranja aparece só na bolinha do título, nas chaves ligadas, no cursor, na seta da faixa final e na logo.

### Topo

- **CA-1454** · Dado a landing, então o `h1` diz "Falta cálcio? 1 copo de iogurte." (o ponto existe para o leitor de tela; na tela, a bolinha laranja), e logo depois vêm "Criar conta grátis", "Ver no plano de exemplo" e a frase "Para nutricionistas: o MetaNutri calcula quanto falta de cada vitamina e mineral no plano alimentar e mostra o que comer para completar, em medida caseira."
- **CA-1455** · Dado o topo, quando a pessoa aciona "Criar conta grátis", então o app vai para Criar conta; quando aciona "Ver no plano de exemplo", então a página rola até o campo vivo.
- **CA-1456** · Dado 1280×720 e 390×844, então o `h1` e "Criar conta grátis" cabem inteiros na primeira tela.

### Barra do topo e rodapé

- **CA-1457** · Dado a landing sem sessão, então a barra tem a logo, "Como funciona", "Preços", "Entrar" e "Criar conta grátis"; em 390 px, só a logo, "Entrar" e "Criar conta". "Como funciona" e "Preços" rolam até as seções; "Entrar" e "Criar conta grátis" vão para as telas delas.
- **CA-1458** · Dado a landing com sessão, então a barra mostra "Ir para o painel" no lugar de "Entrar" e "Criar conta grátis".
- **CA-1459** · Dado a pessoa rolando a página para baixo além de 200 px, então a barra sai de cima; rolando para cima, volta; com foco num link dela, aparece; no rodapé, sai.
- **CA-1460** · Dado a barra sobre cada seção, então ela pinta a cor da seção: teal no topo, nas perguntas e na faixa final; chão nas seções de chão; afundado nas seções afundadas.
- **CA-1461** · Dado o rodapé, então ele tem "MetaNutri: software para nutricionistas.", "Voltar ao topo", "Fale com a gente" com `mailto:` do `CONTATO_EMAIL`, e os links Preços (`precos/`), Termos de uso (`termos/`), Política de privacidade (`privacidade/`) e Referências (`fontes/`), e "Brasil, {ano}". Clique comum troca de tela pelo app; com Ctrl ou botão do meio, o navegador segue o endereço (CA-1028 continua).

### Campo vivo

- **CA-1462** · Dado a seção "O que falta no plano da Maria, 28 anos?", então o campo começa com "falta cálcio", o cartão mostra "Cálcio", "640 de 1.000 mg no dia", "Faltam 260 mg para a meta." e Rúcula, Iogurte e Sardinha com porção, cobertura e calorias, e o botão "falta cálcio" está pressionado.
- **CA-1463** · Dado o campo, quando a pessoa digita "vitamina e" (qualquer caixa, com ou sem acento, ou terminando em " e"), então o cartão vira o da vitamina E ("5,4 de 15 mg no dia", "Faltam 8,1 mg"); com "vitamina d", o da vitamina D ("2,1 de 15 µg no dia", "Faltam 11,4 µg"); com "calcio" ou "cálcio", o do cálcio.
- **CA-1464** · Dado um dos três botões de exemplo, quando a pessoa aciona, então o campo recebe o texto do botão, o cartão troca e só esse botão fica pressionado.
- **CA-1465** · Dado o campo com um texto que não é cálcio, vitamina E nem vitamina D (ou vazio), então o cartão diz "Neste exemplo" e "Experimente cálcio, vitamina E ou vitamina D.", sem lista, e nenhum botão fica pressionado.
- **CA-1466** · Dado o cartão, quando ele troca, então o leitor de tela é avisado (`aria-live="polite"`); o campo tem rótulo ("Digite o nutriente que falta").

### Números do motor

- **CA-1467** · Dado o plano de exemplo, quando o teste roda o motor do app, então o total, a referência, a falta, a porção, a cobertura e as calorias de cada linha do campo vivo (cálcio, vitamina E e vitamina D) são iguais, letra por letra, aos das constantes da landing.
- **CA-1468** · Dado o mesmo teste, então as cinco sugestões de "Cobrir cálcio" em "Como funciona" e as três linhas da adequação (64%, 36%, 14%) são as do motor, e o título "1 copo de iogurte" corresponde a uma sugestão do cálcio de 1 copo americano de iogurte.
- **CA-1469** · Dado a tabela "Um dia em medidas caseiras" e a linha "Feijão, carioca, cozido · 140 g · 107 kcal", então cada alimento, medida, peso e caloria vem da Base MetaNutri (o teste busca cada um e confere).

### Chaves

- **CA-1470** · Dado "O plano sai do seu jeito", então há cinco chaves (`role="switch"`), com nome; as duas primeiras começam ligadas e mostram o efeito; as outras, desligadas, sem efeito.
- **CA-1471** · Dado uma chave, quando a pessoa aciona com clique, Enter ou Espaço, então ela liga ou desliga, `aria-checked` acompanha, a faixa troca de cor e o efeito aparece ou some.
- **CA-1472** · Dado os efeitos, então "Feijão carioca, cozido: 1 concha (140 g).", "Maria, 62 kg: 35 ml por quilo dá 2,2 litros por dia." e "O iogurte sai das sugestões de cálcio" são o que o app dá (o teste confere a concha na base, a água com `aguaDoCaso` e o Cobrir com alergia a leite sem iogurte).
- **CA-1473** · Dado `MEUS_ALIMENTOS_NOVOS` desligado, então a chave e a pergunta dos alimentos próprios falam em rótulo e código de barras, sem "por 100 g" nem "medidas caseiras que você usa"; ligado, falam no texto do protótipo.

### Como funciona, cozinha e fotos

- **CA-1474** · Dado "Como funciona", então há três passos, nesta ordem e sem número: "Primeiro, digite o que a paciente come.", "Depois, veja quanto falta." e "Então, cubra o que falta.", cada um com a chamada e o fragmento do app.
- **CA-1475** · Dado "Na medida da cozinha", então há a frase "A paciente lê o plano como come: em concha, escumadeira e copo americano. Os gramas ficam ao lado, para quem pesa.", as duas fotos com legenda e a tabela de três refeições com alimento, medida, gramas e calorias (cabeçalho para o leitor de tela).
- **CA-1476** · Dado as três fotos, então cada uma tem texto alternativo, largura e altura reservadas, `srcset` com a versão de 800 px e carregamento preguiçoso; os arquivos têm no máximo 1.600 px de largura.

### Preços, perguntas e faixa final

- **CA-1477** · Dado "Quanto custa", então o número grande é o mensal do Solo de `PLANOS` ("R$ 34,90 por mês"), a lista diz "Solo: 25 pacientes ativos", "25 links do paciente", "Adequação com o Cobrir, PDF e documentos em Word" e "Ou R$ 299 por ano", e Free, Pro, Estudante e Clínica têm uma linha cada, tudo de `PLANOS`; mudou o preço em `conta.ts`, a landing acompanha.
- **CA-1478** · Dado "Assinar o Solo", quando a pessoa aciona, então o app recebe `aoEscolher('solo', 'mensal')`.
- **CA-1479** · Dado "Perguntas de quem atende", então há seis perguntas fechadas, que abrem e fecham com clique, Enter ou Espaço, e as respostas são as da D-541 (sem "30 minutos", com o comprovante de matrícula e "se você quiser" no link do paciente).
- **CA-1480** · Dado a faixa final, então ela é um link para Criar conta com "Crie a conta e monte o primeiro plano hoje. Sem cartão." e "Começar"; no hover e no foco, o fundo fica branco e a seta, laranja.

### Texto

- **CA-1481** · Dado o texto da landing, então não há tagline, rótulo acima de título, número de passo, comparação com concorrente, promessa de resultado clínico, "30 minutos" nem "495 kcal"; cada frase aparece uma vez.
- **CA-1482** · Dado o texto de venda (D-543), quando a guarda CA-990 roda, então ela falha se achar TACO, IBGE, POF, USDA, NASEM, DRI ou Open Food Facts; a página Referências e o `paginas.ts` de Referências podem citar.
- **CA-1483** · Dado a página `/fontes/` (ou `#/fontes`), então o `h1` e o `<title>` dizem "Referências"; o rodapé de todas as telas públicas diz "Referências" no lugar de "Fontes da base"; o `llms.txt` também.

### Página pré-desenhada e movimento

- **CA-1484** · Dado o `dist/index.html` do build, então a landing sai escrita no `#root`: o `h1`, todas as seções com título, o campo com "falta cálcio" e o cartão do cálcio, as perguntas com as respostas e o rodapé com os quatro links; nenhum elemento sai com `opacity: 0`.
- **CA-1485** · Dado o `public/preparar-pagina.js`, então ele não pré-carrega foto nenhuma (a landing não tem foto no topo); o resto (tema, vitrine escondida) continua.
- **CA-1486** · Dado `prefers-reduced-motion: reduce`, então nada na landing se move (sem animação nem transição de deslocamento) e nada fica escondido.
- **CA-1487** · Dado `prefers-reduced-motion: no-preference`, quando a página abre e rola, então o título sobe, as partes das seções entram uma vez e a foto dos legumes deriva; o que já está na tela quando o app monta não pisca.

### Celular e teclado

- **CA-1488** · Dado 390 px, então não há rolagem para o lado, cada seção vira uma coluna, a tabela vira linhas de alimento com a medida, os gramas e as calorias embaixo, e o texto não encosta na borda (margem de 16 px).
- **CA-1489** · Dado 390 px, então todo alvo de toque da landing tem pelo menos 44 px de altura (chaves pela área de toque).
- **CA-1490** · Dado o teclado, quando a pessoa tabula pela landing, então o foco é visível em todo controle, segue a ordem da leitura e nunca cai num botão de fragmento (D-550).

### Limpeza

- **CA-1491** · Dado o repositório, então não existem `public/imagens/cobrir-*.png`, `missoes-*.png`, `pratos-heroi*.webp`, `scripts/capturas-landing.mjs` e `scripts/pratos_heroi.py`, e nada os cita fora das specs e dos documentos antigos.

## 3. Casos de borda

- **CB-530** · Celular a 390 px: o título em duas linhas cabe sem cortar ("1 copo de iogurte" em `clamp(28px, 8,6vw, 60px)`); o campo vivo em `10vw` não estoura a largura.
- **CB-531** · Celular a 320 px: nada rola para o lado; o botão do topo encolhe para "Criar conta".
- **CB-532** · Teclado: Tab do topo ao rodapé; Espaço e Enter ligam as chaves e abrem as perguntas; Esc não faz nada (não há diálogo).
- **CB-533** · Foco num link da barra escondida: a barra volta (`:focus-within`).
- **CB-534** · Menos movimento: sem subir, sem derivar, sem piscar; a barra some e volta sem deslizar.
- **CB-535** · Sem JavaScript: a página pré-desenhada mostra tudo (inerte, como hoje, D-331); as perguntas fechadas têm a resposta no HTML.
- **CB-536** · Campo vivo vazio: cartão "Neste exemplo", nenhum botão pressionado.
- **CB-537** · Campo vivo com texto longo (500 letras): o campo rola por dentro, a página não.
- **CB-538** · Campo vivo com "vitamina d3", "vit d", "Vitamina D": "vit d" e "Vitamina D" valem a vitamina D; "vitamina d3" não vale (o exemplo não tem D3).
- **CB-539** · Campo vivo com "ferro" ou "vitamina a": cartão "Neste exemplo" (o exemplo só traz três nutrientes).
- **CB-540** · Sessão aberta: a barra e o rodapé não mostram "Entrar" nem "Criar conta".
- **CB-541** · Aviso de conta excluída (CA-808): aparece abaixo da barra, legível no escuro.
- **CB-542** · `CONTATO_EMAIL` nulo: o "Fale com a gente" não aparece (nunca um `mailto:` vazio).
- **CB-543** · Âncora com a barra presa: "Como funciona", "Preços" e "Ver no plano de exemplo" param com o título da seção à vista, sem ficar embaixo da barra.
- **CB-544** · Tema claro do app e voltar da landing para Preços: Preços continua no tema do app (a classe escura é só da landing, nunca do `<html>`).
- **CB-545** · Fotos que não carregam: o espaço fica reservado (largura e altura) e o texto alternativo aparece; nada salta.
- **CB-546** · Rolar rápido até o fim: a barra sai no rodapé e volta ao subir; nada fica escondido sem entrar.
- **CB-547** · Versão nova do site com a landing aberta: recarrega como hoje (D-320), com o topo e o rodapé novos.
- **CB-548** · Motor muda (porção, base ou referência): o teste dos números (CA-1467) falha e diz qual linha divergiu.
- **CB-549** · Preço muda em `conta.ts`: a landing, o `<title>` de Preços e o JSON-LD acompanham sem tocar na landing.

## 4. Fora de escopo

- A separação site × app (domínios separados, sessão com tempo de uso) e as telas do app: outras specs.
- Preços, Termos, Privacidade, Referências, Entrar e Criar conta no escuro fixo.
- Renomear os botões "Fontes da base" de dentro do app (Adequação, Ajuda, Alimentos).
- O `theme-color` da barra do navegador na landing.
- Mudar o motor do Cobrir, a base ou os planos.

## 5. Riscos

- **R-530** · As constantes do campo vivo envelhecem quando o motor muda: o teste CA-1467 falha de propósito e mostra a diferença; quem muda o motor atualiza as constantes no mesmo commit.
- **R-531** · O inspetor da skill mede movimento; nesta máquina o Windows está com animações desligadas, o Chrome pede menos movimento e o inspetor avisa "still-page". O aviso é do ambiente, não da página (o e2e confere o movimento com `reducedMotion: 'no-preference'`).
- **R-532** · A barra que some ao rolar pode esconder o "Criar conta grátis" de quem rola para baixo; a faixa final e o topo da página têm a mesma ação.
