# SPEC — Site público profissional: posicionamento, textos e busca

Status: **pedida pelo dono em 21/10/2026, olhando metanutri.com.br no iPhone, tema escuro; ordem permanente "apenas
faça" (sem perguntas: decidir pelas regras e seguir). Aprovação pelas telas antes de publicar.**

**Fonte:** "Tá ridículo, zero profissional, com taglines que pedi pra retirar todas, falando que não foi aprovado por
nutri, cadê nosso posicionamento??? Melhore isso tudo, o texto de 200,,,, textos bugados, tenha atenção, use todas as
skills necessárias, inclusive skills para posicionamento na net, como as de SEO."

**Lido antes:** `docs/plano-negocio.md` (posicionamento e preços), `docs/pesquisa-mercado-2026-09-15.md`, `PRODUCT.md`,
`DESIGN.md`, `specs/limpeza-visual` (D-75 a D-79: Manrope, sem tagline, sem preço de fundador, sem repetição),
`specs/estilo-spora` (a referência visual), `specs/pdf-e-telas-limpas` (CA-321: a área pública fala em "Base
MetaNutri"), `specs/revisao-geral-publica` (a revisão de 19/10) e `specs/dados-na-nuvem` (DP-26: nada promete uso sem
internet).

**O que o dono viu não é o código de hoje.** O "Preço de fundador para as 200 primeiras assinaturas" saiu do código em
05/10 (D-78) e o "até sem internet" saiu em 08/10 (DP-26); a `main` publicada (6a3a21a) não tem nenhum dos dois (conferido
no pacote baixado de metanutri.com.br em 21/10). O iPhone mostrou uma versão antiga que o navegador guardou: com o
service worker, a versão nova entra em segundo plano e, nas telas públicas, ninguém recarrega a página (o aviso de
versão nova só existe na área de trabalho, D-172 da `dados-na-nuvem`). Uma aba antiga do Safari, restaurada da memória,
fica na versão velha por dias. A D-320 resolve isso. O resto da reclamação vale para o código de hoje: o menu em caixa
alta, o rodapé com frase de apresentação, fontes técnicas e "Os cálculos ainda não foram conferidos por nutricionista.",
o cartão do Estudante espremido em Preços, cartões de Preços em branco até a animação terminar, e uma landing que não
diz para quem é o MetaNutri, quanto custa nem o que mais ele faz.

**Skills usadas** (o que cada uma mudou está no relatório): `impeccable` (audit, clarify, craft-floor), `frontend-design`,
`design:ux-copy`, `marketing:brand-review`, `marketing:seo-audit` e `small-business:seo-ai-visibility`.

## 1. Decisões

| # | Decisão | Motivo |
|---|---|---|
| D-320 | **Telas de vitrine recarregam sozinhas quando chega versão nova.** Na moldura pública (início, Preços, Termos, Privacidade e Fontes), quando o service worker de uma versão nova passa a valer, a página recarrega na hora. Nas telas com formulário (Entrar, Criar conta, senha, checkout) continua como hoje: nada recarrega, para não perder o que a pessoa digitou | É a causa do que o dono viu: textos tirados há duas semanas ainda na tela dele. A vitrine não tem nada digitado a perder |
| D-321 | **Menu do topo em caixa normal**, letra de 14 px, peso médio: "Como funciona", "Recursos" e "Preços". "O diferencial" sai (a seção virou parte de "Como funciona") | Versalete no menu é rótulo decorativo (D-77 da `limpeza-visual`) |
| D-322 | **Rodapé sem texto de apresentação.** Saem o parágrafo embaixo da logo, a lista "Fontes dos dados" (NASEM, OMS, SISVAN), "Os cálculos ainda não foram conferidos por nutricionista." e a linha da Lei 8.234/1991 (que já está nos Termos, em "Quem prescreve é o nutricionista"). Ficam a logo e três colunas de links: **Produto** (Como funciona, Recursos, Preços, Fontes da base), **Conta** (Começar grátis ou Ir para o painel, Entrar) e **Legal** (Termos de uso, Política de privacidade). Embaixo, uma linha: "© {ano} MetaNutri" e o e-mail de contato, como link | Pedido do dono: frase de apresentação é tagline; a frase dos cálculos diminui o produto; fonte técnica não é assunto de rodapé. O contato em texto ajuda quem procura e os buscadores (fato claro, num lugar só) |
| D-323 | **Termos sem "ainda não foram conferidos por nutricionista".** A seção "Quem prescreve é o nutricionista" continua dizendo que o MetaNutri calcula e sugere, que o nutricionista confere cada número antes de entregar e a lei do CRN. A versão dos termos passa a `2026-10-21` ("21 de outubro de 2026"), como pede o CA-391 | A proteção legal está na conferência do nutricionista e no item "Limites"; a frase só diminuía o produto |
| D-324 | **As referências dos cálculos vão para a página Fontes da base**, numa seção "Referências dos cálculos", sem link novo: DRI do NASEM (2019 e 2023), curvas da OMS (2006 e 2007), pontos de corte do SISVAN (2011) e ganho de peso gestacional de Kac (2021) | Saem do rodapé (D-322) sem sumir do site: toda conta mostra de onde veio (princípio 1 do `PRODUCT.md`) |
| D-325 | **Preços:** a nota do Estudante empilha abaixo de 640 px (ícone e texto em cima, botão embaixo, à esquerda); acima disso, texto e botão lado a lado. Saem a animação de entrada (blocos que nascem borrados e transparentes), o número que rola ao trocar Mensal/Anual e o botão com efeito de onda: o preço é texto, e o botão é o `Button` do design system | O texto da nota ficava numa coluna de 63 a 93 px, uma palavra por linha, em 360 e 390 px (`flex-1` com base zero deixava o botão na mesma linha). Os cartões abaixo do primeiro ficavam em branco até a animação acabar (1,2 a 2,4 s), o que no celular parecia defeito. Sem animação, a página também sai pronta na pré-renderização (D-331) |
| D-326 | **Landing nova, na ordem:** (1) topo com a foto dos pratos, o título "Faltou cálcio? O MetaNutri diz o que comer.", uma frase que diz para quem é e o que faz, "Começar grátis" e "Ver preços", e os cartões de 21 nutrientes e 597 alimentos; (2) **Como funciona**, em duas linhas com as telas reais: "Monte o plano e feche o que falta" (o Cobrir) e "Acompanhe o paciente entre as consultas" (missões e Adesão); (3) **Do atendimento à folha do paciente**, seis recursos que existem no produto; (4) **Quanto custa**: Estudante, Solo e Pro, com "Comparar os planos"; (5) a faixa final "Comece pelo Free". Saem "Todo programa avisa que faltou ferro…", os cartões "5 sugestões", "g + colher" e "57%", os números 01/02/03 e "O Cobrir e as missões do paciente" | O posicionamento do plano de negócio (diz o que comer; o plano sai da gaveta; grátis na faculdade, barato ao se formar) não estava na página. A frase do ferro repetia o título (D-79) e comparava com concorrentes. O cartão dos 57% vendia uma falta da base. Os números em laranja eram enfeite |
| D-327 | **Todo número e preço da área pública vem do domínio**: nutrientes de `MICRONUTRIENTES_ADEQUACAO`, alimentos de `ALIMENTOS`, preços e limites de `PLANOS`. Nenhum valor escrito à mão na tela, no título da página, na descrição nem nos dados estruturados | Mudou o preço em `conta.ts`, o site inteiro acompanha; o site não tem como afirmar o que o plano não tem |
| D-328 | **Sem comparação com concorrentes e sem promessa de resultado clínico** no site público: nada de "nenhum programa faz", "o único", "seu paciente para de abandonar a dieta". O site descreve o que o MetaNutri faz | Revisão de marca (`marketing:brand-review`): comparação sem prova pública e promessa de resultado em saúde são os dois riscos do texto |
| D-329 | **Cabeçalho para busca e compartilhamento** no `index.html`: título "MetaNutri: software de nutrição que diz o que comer" (até 60 letras), descrição de até 155 letras com o diferencial, endereço canônico `https://metanutri.com.br/`, Open Graph e cartão do X/Twitter (título, descrição, imagem), `theme-color` (já existia) e os ícones (já existiam). A imagem de compartilhar é um PNG de 1200×630 feito da marca (`public/marca`): fundo teal, símbolo e nome em marfim e uma frase curta, gerado por `scripts/imagem-de-compartilhar.mjs` | O site no ar tinha só "MetaNutri" de título e uma descrição de 15 vitaminas (são 20 e a fibra). Link mandado no WhatsApp saía sem imagem |
| D-330 | **Dados estruturados (JSON-LD)** no `<head>` da página inicial e de Preços: `Organization` (nome, endereço, logo, e-mail) e `SoftwareApplication` (categoria `HealthApplication`, sistema `Web`, idioma pt-BR, ofertas em BRL de cada plano com preço publicado). O bloco é escrito no build a partir de `PLANOS` e `legal.ts`. Sem nota, avaliação nem depoimento (não existem). A regra de conteúdo (CSP) não muda: bloco `application/ld+json` é dado, o navegador não executa; o teste CA-485 passa a recusar todo `<script>` sem `src` **exceto** esse tipo | É o padrão aberto que buscadores e assistentes leem para não errar preço e categoria |
| D-331 | **Pré-renderização no build.** Um plugin do Vite (`src/seo/pluginSeo.ts`, só no build) desenha a landing dentro da moldura pública com `react-dom/server` e a põe dentro do `#root` do `index.html`. Preços, Termos, Privacidade e Fontes ganham páginas próprias em `/precos/`, `/termos/`, `/privacidade/` e `/fontes/`, cada uma com título, descrição e endereço canônico próprios e o conteúdo da tela já escrito. Essas páginas levam `<base href="../">` (os arquivos do site resolvem na raiz) e `data-rota` no `<html>`; ao carregar, o app leva o endereço para `/#/<rota>` (sem recarregar) e segue igual. **Sem hidratação:** o React substitui o conteúdo pré-desenhado (`createRoot`), que é o mesmo desenho, então não há erro de "mismatch". Nenhuma dependência nova: `react-dom/server` e a API do Vite já estão no projeto | O site é uma SPA com rotas por `#`: quem não roda JavaScript (robôs de IA, prévia de link, Bing em parte) via uma página vazia. Página própria por endereço é o que o GitHub Pages permite sem servidor |
| D-332 | **Um script pequeno no `<head>`** (`public/preparar-pagina.js`, arquivo próprio porque a CSP não aceita script escrito na página): antes de desenhar, aplica o tema guardado (ou o do sistema) e esconde o conteúdo pré-desenhado quando o endereço pede outra tela (link do paciente, área de trabalho, volta do e-mail) ou quando há sessão aberta e o endereço é a raiz (o app vai para o painel). Sem ele, quem abre o link das missões veria a landing piscar, e o tema escuro piscaria claro | O conteúdo pré-desenhado aparece antes do JavaScript; ele precisa respeitar a rota e o tema desde o primeiro quadro |
| D-333 | **`robots.txt` libera todos os robôs**, inclusive os de assistentes de IA (GPTBot, ClaudeBot, PerplexityBot), e aponta o `sitemap.xml`, que lista as cinco páginas indexáveis. Um **`llms.txt`** na raiz descreve o MetaNutri em fatos: o que faz, para quem, planos e preços, contato e páginas. Decisão tomada pela regra "apenas faça"; bloquear os robôs de IA é uma linha no `robots.txt`, se o dono quiser | Ser lido e citado certo; nada aqui tenta influenciar recomendação de assistente |
| D-334 | **Desempenho do primeiro quadro:** a Manrope (subconjunto latino) é pré-carregada no `<head>`; a foto do topo tem prioridade alta, tamanho reservado e fica com no máximo 600 px de largura no computador, para o título e "Começar grátis" caberem na primeira tela de 1280×720 | O título é o maior elemento da primeira tela no celular; sem a fonte pré-carregada, ele trocava de fonte depois de aparecer |
| D-335 | **Fica fora:** o título da aba por tela dentro do app (as páginas estáticas têm o próprio título; navegar pelo app mantém o da página que abriu), dividir o pacote de JavaScript da área de trabalho (2,3 MB) e as telas da área de trabalho | Outra frente; registrado como risco R-321 |
| D-336 | **Google Search Console é do dono:** verificar o domínio por um registro TXT no Registro.br e enviar o `sitemap.xml`. O código não faz nada disso; os passos estão no relatório | DNS é a única mudança que pode tirar o site do ar; quem mexe é o dono |

## 2. Critérios de aceite

### Textos proibidos e posicionamento

- **CA-990** · Dado o código das telas públicas (`src/ui/publico`, sem os testes), o `index.html`, os arquivos de texto de `public/` e o `src/seo`, quando o teste de varredura roda, então ele falha se achar: "fundador", "200 primeiras", promessa de uso sem internet ("até sem internet", "funciona sem internet", "funciona offline", "abre sem internet"), "não foram conferidos", um rótulo em caixa alta com bolinha acima de título ("•" seguido de palavras em caixa alta) ou o menu do topo com `uppercase`. Frases verdadeiras sobre internet, como "Você está sem internet. Conecte-se para entrar", não são promessa e passam.
- **CA-991** · Dado o topo de qualquer tela pública, então o menu mostra "Como funciona", "Recursos" e "Preços" em caixa normal, sem `uppercase` nem espaçamento de versalete; "Como funciona" e "Recursos" levam às seções da landing.
- **CA-992** · Dado o rodapé, então ele tem a logo, as colunas Produto (Como funciona, Recursos, Preços, Fontes da base), Conta (Começar grátis ou Ir para o painel, Entrar) e Legal (Termos de uso, Política de privacidade) e a linha "© {ano} MetaNutri" com o e-mail de contato como link `mailto:`; e não tem parágrafo de apresentação, "Fontes dos dados", NASEM, OMS, SISVAN, "conferidos" nem a Lei 8.234/1991.
- **CA-993** · Dado o rodapé num celular, então cada link tem 44 px de altura e alinha à esquerda (CA-741 continua).
- **CA-994** · Dado os Termos, então a seção "Quem prescreve é o nutricionista" não diz que os cálculos não foram conferidos, continua citando a Lei 8.234/1991, e a versão mostrada é "21 de outubro de 2026" (`VERSAO_TERMOS` = `2026-10-21`).
- **CA-995** · Dado a página Fontes da base, então ela tem a seção "Referências dos cálculos" com NASEM (2019 e 2023), OMS (2006 e 2007), SISVAN (2011) e Kac (2021), e continua com os quatro links das fontes da base (CA-963).

### Atualização das telas de vitrine

- **CA-996** · Dado a moldura pública aberta (início, Preços, Termos, Privacidade ou Fontes), quando uma versão nova do site passa a valer, então a página recarrega uma vez; dado uma tela de formulário (Entrar, Criar conta, checkout), então nada recarrega.

### Preços

- **CA-997** · Dado Preços em 360 e 390 px, então o texto da nota do Estudante ocupa a largura do cartão (nenhuma linha com menos de 200 px de largura) e o botão "Usar o e-mail da faculdade" fica embaixo do texto; em 1280 px, texto e botão ficam lado a lado.
- **CA-998** · Dado Preços aberto em qualquer largura, então todos os cartões e a tabela estão visíveis desde o primeiro quadro (sem opacidade zero nem desfoque esperando animação), e o preço é texto: "R$ 34,90/mês" no Solo mensal, "R$ 24,92/mês" e "R$ 299 uma vez por ano." no anual.
- **CA-999** · Dado Preços, então o título continua o único `h1` ("Grátis na faculdade, barato ao se formar"), os botões dos planos continuam chamando o plano e o ciclo escolhidos (CA-122) e nada fala em fundador, vagas ou preço travado (CA-388).

### Landing

- **CA-1000** · Dado a landing, então os títulos aparecem nesta ordem: "Faltou cálcio? O MetaNutri diz o que comer." (`h1`), "Como funciona", "Do atendimento à folha do paciente", "Quanto custa" e "Comece pelo Free"; e não aparecem "Todo programa avisa", "Nenhum diz", "57%", "g + colher", "O diferencial" nem números de passo "01", "02", "03".
- **CA-1001** · Dado o topo da landing, então logo abaixo do título há uma frase só, que diz para quem é ("nutricionistas") e o que faz (o que falta de vitaminas e minerais e o botão Cobrir), seguida de "Começar grátis" e "Ver preços"; nenhum botão ou rótulo fica acima do título.
- **CA-1002** · Dado o topo da landing em 1280×720 e em 390×844, então o título inteiro e o botão "Começar grátis" do topo aparecem na primeira tela, sem rolar.
- **CA-1003** · Dado "Como funciona", então há duas partes com as telas reais do app (uma captura por tema, só a do tema visível): "Monte o plano e feche o que falta", com o Cobrir (até cinco alimentos de grupos diferentes, porção em gramas e em medida caseira, quanto da falta cada um cobre) e "Acompanhe o paciente entre as consultas", com as missões no link (sem baixar app nem criar conta), a Adesão (4 dias sem marcar sobe para o topo) e o WhatsApp com o texto pronto.
- **CA-1004** · Dado "Do atendimento à folha do paciente", então ela lista seis recursos que existem no produto: anamnese e avaliação, substitutos e trocas, receitas com cálculo, suplementos e exames, a folha do paciente (imprimir ou PDF, nomes que o paciente entende, Word) e os dados na conta (computador e celular). Nenhum é cartão dentro de cartão.
- **CA-1005** · Dado "Quanto custa", então aparecem Estudante (R$ 0, com o comprovante de matrícula), Solo (R$ 34,90 por mês) e Pro (R$ 64,90 por mês), com os limites de pacientes de `PLANOS`, a frase do paciente ativo e o botão "Comparar os planos", que leva a Preços.
- **CA-1006** · Dado a landing, então os números (21 nutrientes, 20 vitaminas e minerais, 597 alimentos) e os preços vêm do domínio (D-327); um teste prende os valores de hoje para avisar se mudarem sem querer.
- **CA-1007** · Dado o cartão "21 nutrientes", quando clicado, então a página rola até "Como funciona"; dado o cartão "597 alimentos", quando clicado, então abre a página Fontes da base.
- **CA-1008** · Dado a landing, então cada informação aparece uma vez (D-79): "em gramas e em medida caseira" uma vez, uma pergunta só (a do título), sem "de verdade", "nenhum programa", "o único", "para de abandonar", e TACO, POF e IBGE não aparecem (CA-321).

### Busca e compartilhamento

- **CA-1009** · Dado o `dist/index.html` depois do build, então ele tem `lang="pt-BR"`, um `<title>` de até 60 letras com "MetaNutri" e "software de nutrição", uma `meta description` de até 155 letras, `link rel="canonical"` para `https://metanutri.com.br/`, `og:title`, `og:description`, `og:url`, `og:image` (endereço absoluto do PNG de 1200×630), `og:locale` `pt_BR`, `twitter:card` `summary_large_image`, `theme-color` e os ícones.
- **CA-1010** · Dado o `public/imagem-compartilhar.png`, então ele tem 1200×630 px.
- **CA-1011** · Dado o `dist/index.html`, então ele tem um `<script type="application/ld+json">` válido (JSON que abre sem erro) com `Organization` e `SoftwareApplication`; as ofertas têm `priceCurrency` "BRL" e os preços de `PLANOS` (0, 34.90, 299, 64.90, 599, 149), sem `aggregateRating` nem `review`.
- **CA-1012** · Dado o site servido com a regra de conteúdo, então nenhum `<script>` sem `src` existe na página, fora o de `application/ld+json`, e abrir a landing não gera violação da CSP (CA-485 continua); `npm run test:csp` passa.
- **CA-1013** · Dado o `dist/index.html` lido sem JavaScript, então o `#root` já contém o `h1` "Faltou cálcio? O MetaNutri diz o que comer.", os títulos das seções, os preços de "Quanto custa" e os links do rodapé.
- **CA-1014** · Dado `dist/precos/index.html`, `dist/termos/index.html`, `dist/privacidade/index.html` e `dist/fontes/index.html`, então cada um tem o próprio título, descrição e endereço canônico (`https://metanutri.com.br/precos/` etc.), `<base href="../">`, `data-rota` com a tela, a mesma regra de conteúdo (CSP) da página inicial e o conteúdo da tela já escrito (o `h1` dela).
- **CA-1015** · Dado `/precos/` aberto no navegador, então o app abre em Preços, o endereço passa a `/#/precos` sem recarregar, e o console não tem erro; o mesmo para `/termos/`, `/privacidade/` e `/fontes/`.
- **CA-1016** · Dado a raiz aberta com o servidor de conta e sem sessão, então ela continua indo para `#/inicio` (CA-730); dado o link do paciente `#/missoes/<token>` aberto direto, então o conteúdo pré-desenhado da landing não aparece em nenhum quadro (fica escondido desde o primeiro desenho).
- **CA-1017** · Dado o tema escuro guardado (ou o do sistema, sem escolha), quando a página abre, então o `<html>` já tem a classe `dark` antes do app montar (o conteúdo pré-desenhado não pisca claro).
- **CA-1018** · Dado `public/robots.txt`, então ele libera tudo (`User-agent: *` com `Allow: /`, sem `Disallow: /`) e aponta `https://metanutri.com.br/sitemap.xml`; dado `public/sitemap.xml`, então ele lista exatamente as cinco páginas indexáveis de `src/seo/paginas.ts`.
- **CA-1019** · Dado `public/llms.txt`, então ele traz o que o MetaNutri faz, para quem, os planos com os preços de `PLANOS`, o contato de `legal.ts` e as páginas; um teste confere que os preços e o e-mail batem com o domínio.
- **CA-1020** · Dado o `dist/index.html`, então ele pré-carrega o arquivo `woff2` da Manrope (subconjunto latino) com `crossorigin`, e a foto do topo tem `fetchpriority="high"`, `width` e `height`.
- **CA-1021** · Dado o service worker, então as páginas `/precos/`, `/termos/`, `/privacidade/` e `/fontes/` entram no precache (abrem com o app guardado), e a navegação para elas não cai na página inicial.

### Testes de navegador

- **CA-1022** · Dado a landing, Preços e o rodapé em 390 e 1280 px, nos temas claro e escuro, então a página não rola para o lado, nenhum texto proibido (CA-990) aparece, o menu não está em caixa alta e, em Preços, a nota do Estudante não fica espremida (CA-997).

## 3. Casos de borda

- **CB-320** · Sem JavaScript: a landing e as quatro páginas aparecem com o texto, os links do rodapé e do menu não fazem nada (são botões do app). Quem lê sem JavaScript é robô ou prévia de link: o que importa é o texto. Fica assim.
- **CB-321** · `localStorage` bloqueado (Safari privado antigo): o script do `<head>` não quebra; vale o tema do sistema e a vitrine aparece.
- **CB-322** · Endereço da volta do e-mail (`/#access_token=…` ou `/?code=…`): a vitrine some no primeiro caso (a rota pedida não é a landing) e aparece por um instante no segundo, até o app levar à tela certa (D-332). Não muda o fluxo da volta.
- **CB-323** · Sessão aberta e endereço `/#/inicio`: a vitrine aparece com "Entrar" e "Começar grátis" e, quando o app monta, troca por "Ir para o painel". Aceito: é a mesma página.
- **CB-324** · `/precos/` (ou outra página nova) aberto direto por quem já tem o service worker de uma versão antiga, que não conhecia essas páginas: o service worker velho entrega a página inicial guardada naquele endereço, os arquivos dela não são achados a partir de `/precos/` e a página fica **em branco uma vez**. O navegador baixa o service worker novo nessa mesma visita; recarregar abre Preços. Só acontece com quem já visitou o site antes desta versão e entra direto por um endereço novo; quem entra pela raiz não vê. Nada desta versão consegue mudar o que o service worker velho entrega (R-324).
- **CB-325** · Versão nova durante a leitura de Preços com o Anual escolhido: a página recarrega e volta ao Mensal (D-320). Aceito: a escolha é de um clique.
- **CB-326** · A página `/precos/` aberta numa subpasta (o GitHub Pages sem domínio próprio): `<base href="../">` resolve um nível acima, que é a raiz do site também na subpasta.
- **CB-327** · Plano novo ou preço mudado em `PLANOS`: a landing, a página de Preços, a descrição de Preços e o JSON-LD mudam no próximo build; o `llms.txt` é texto e o teste dele (CA-1019) falha até alguém atualizá-lo.
- **CB-328** · Prévia de link no WhatsApp: usa só `og:*`; a imagem é PNG de 1200×630 com menos de 300 KB, endereço absoluto com `https`.

## 4. Fora de escopo

- As telas da área de trabalho e a ajuda (`TelaAjuda` ainda diz que energia, dobras e ganho de peso não foram conferidos; é de outra frente).
- Dividir o pacote de JavaScript (D-335), o título da aba por tela no app e a hidratação do React.
- Blog, páginas por palavra-chave, perfil no Google, diretórios e anúncios: posicionamento fora do site, para depois.
- Verificar o domínio no Google Search Console e enviar o sitemap (D-336, passos do dono).
- Mudar preços, planos, a lógica do Mercado Pago, o SQL e as funções do Supabase.

## 5. Riscos para o dono revisar

- **R-320** · A landing nova tem mais texto que a anterior (para quem é, recursos, preços). Cada frase foi conferida no código e diz uma coisa só; se ficar longa demais olhando no celular, a seção "Do atendimento à folha do paciente" é a primeira a encurtar.
- **R-321** · O pacote de JavaScript tem 2,3 MB: a pré-renderização mostra o texto antes, mas os botões só respondem depois que ele carrega (em 4G, 1 a 3 s). Dividir o pacote é a próxima melhoria de velocidade.
- **R-322** · Os robôs de IA ficam liberados (D-333). Para bloquear, uma linha no `robots.txt`.
- **R-323** · `/precos/` vira `/#/precos` na barra de endereço depois que o app abre. Quem copiar o endereço copia o com `#`, que também abre Preços.
- **R-324** · CB-324: depois de publicar, quem já tinha o site guardado (o iPhone do dono, por exemplo) e abrir direto `metanutri.com.br/precos/` vê uma página em branco uma vez; recarregar resolve. Abrir primeiro `metanutri.com.br` evita.

## Apêndice A — Auditoria das telas públicas (21/10/2026)

Feita no site montado (`vite build` + `vite preview`, sem servidor de conta) em 360, 390, 768 e 1280 px, temas claro e
escuro: início, Preços, Entrar, Criar conta (Free e Solo), Esqueci a senha, Termos, Privacidade, Fontes, rodapé, topo e
o checkout. Em cada uma: rolagem para o lado, texto espremido (6 palavras ou mais numa caixa com menos de 120 px), texto
em caixa alta, textos proibidos e erros do console. Prints de antes em
`scratchpad/site-publico/antes/` (pasta do coordenador, fora do repositório), no padrão
`<tela>-<largura>-<tema>-antes-inteira.png`. Nenhuma tela rolou para o lado e o console não teve erro.

| # | Tela | Antes | Depois | Onde |
|---|---|---|---|---|
| A-01 | Topo (todas as telas públicas) | Menu em versalete: "COMO FUNCIONA · O DIFERENCIAL · PREÇOS" | "Como funciona · Recursos · Preços", caixa normal | D-321, CA-991 |
| A-02 | Rodapé | "O programa de nutrição que mostra o que falta no plano e sugere o que comer. Funciona no navegador, sem instalar nada." (no iPhone do dono, a versão velha: "…até sem internet", falso desde 08/10) | Sem parágrafo; só a logo | D-322, D-320, CA-992 |
| A-03 | Rodapé | "Fontes dos dados: Base MetaNutri, Fontes da base, NASEM. DRI, Apêndice J, 2019, OMS, 2006 e 2007, SISVAN, 2011" | O link "Fontes da base" na coluna Produto; as referências na página Fontes | D-322, D-324, CA-992, CA-995 |
| A-04 | Rodapé | "Os cálculos ainda não foram conferidos por nutricionista." | Sai | D-322, CA-992 |
| A-05 | Rodapé | "A prescrição de dieta é privativa de nutricionista com registro no CRN (Lei 8.234/1991)." | Sai do rodapé; continua nos Termos | D-322, CA-994 |
| A-06 | Termos | "Os cálculos seguem tabelas públicas … e ainda não foram conferidos por nutricionista." | "Os cálculos seguem tabelas públicas de composição de alimentos e de referências nutricionais." | D-323, CA-994 |
| A-07 | Preços (360 e 390 px) | Nota do Estudante numa coluna de 63 e 93 px, uma palavra por linha, ao lado do botão | Texto na largura do cartão, botão embaixo | D-325, CA-997 |
| A-08 | Preços (celular) | Cartões Estudante… Clínica em branco até a animação de entrada terminar (1,2 a 2,4 s); no print de página inteira, só o Free aparecia | Tudo visível no primeiro quadro | D-325, CA-998 |
| A-09 | Preços | Preço que rola (custom element com shadow DOM: o robô não lê o número) e botão com efeito de onda | Preço em texto, `Button` do design system | D-325, CA-998 |
| A-10 | Landing | Botão "Ver como funciona" acima do título, como um rótulo; o "Começar grátis" do topo só no cabeçalho | Título primeiro; "Começar grátis" e "Ver preços" embaixo da frase | D-326, CA-1001 |
| A-11 | Landing | "Todo programa avisa que faltou ferro. Nenhum diz o que pôr no prato para fechar a conta." (repete o título e compara com concorrentes sem prova) | Sai | D-326, D-328, CA-1000 |
| A-12 | Landing | Cartão "57% dos alimentos da base não têm vitamina A medida" (vende uma falta) e cartões "5 sugestões", "g + colher" | Saem; o Cobrir é explicado em "Como funciona" | D-326, CA-1000 |
| A-13 | Landing | "01", "02", "03" em laranja nos passos | Sem números | D-326, CA-1000 |
| A-14 | Landing | "21 nutrientes conferidos em cada plano" ("conferidos" lembra a frase dos cálculos) | "21 nutrientes na adequação de cada plano" | D-326, CA-1006 |
| A-15 | Landing | Sem para quem é, sem preço, adesão numa linha só, recursos reais (anamnese, receitas, suplementos e exames, folha em PDF e Word, WhatsApp, nuvem) ausentes | Frase do topo, "Como funciona" em duas partes, "Do atendimento à folha do paciente" e "Quanto custa" | D-326, CA-1001 a CA-1005 |
| A-16 | Landing | "O Cobrir e as missões do paciente": duas funções num título | Cada uma com o próprio título dentro de "Como funciona" | D-326, CA-1003 |
| A-17 | Landing (1280×720) | Foto de 900 px de largura: o título começava na altura de 580 px e o botão de começar não existia no topo | Foto até 600 px; título e "Começar grátis" na primeira tela | D-334, CA-1002 |
| A-18 | `index.html` | Título "MetaNutri"; descrição com "15 vitaminas e minerais" (são 20 e a fibra); sem canônico, sem Open Graph, sem imagem de compartilhar, sem dados estruturados | Título, descrição, canônico, Open Graph, X/Twitter, JSON-LD | D-329, D-330, CA-1009 a CA-1011 |
| A-19 | `index.html` | `#root` vazio: sem JavaScript, nenhum texto | Landing pré-desenhada; páginas próprias para Preços, Termos, Privacidade e Fontes | D-331, CA-1013, CA-1014 |
| A-20 | Site | Sem `robots.txt`, `sitemap.xml` e `llms.txt` | Os três na raiz | D-333, CA-1018, CA-1019 |
| A-21 | Todas as telas (tema escuro) | O tema escuro só entrava depois de o app montar: a página pintava clara por um instante | Tema aplicado antes do primeiro quadro | D-332, CA-1017 |
| A-22 | Telas de vitrine | Versão nova não recarregava: o iPhone do dono mostrou textos de antes de 05/10 | Recarrega sozinha | D-320, CA-996 |
| A-23 | Entrar, Criar conta, checkout | Rótulos em caixa alta "No Free você já tem", "Plano escolhido", "Você paga hoje" | Ficam: nomeiam o dado logo abaixo (D-77 permite) | — |
| A-24 | Termos | "Sem internet, o MetaNutri não deixa editar até a conexão voltar." | Fica: é verdade e não promete uso sem internet | — |
