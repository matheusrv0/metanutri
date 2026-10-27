# PLAN — Site e app separados, com a sessão que expira

**Spec:** `specs/separacao-site-app/SPEC.md` (D-500 a D-528, CA-1400 a CA-1463, CB-500 a CB-528). Em 27/10/2026 o
dono aprovou as telas com dois ajustes: texto mínimo (D-526, no lugar do D-519) e a mudança obrigatória para o app, com
a P3 logo depois do site da P2 (D-527 e D-528).
**Base:** `main` em `afa3815` (27/10/2026, já com a publicação 2 de alimentos). A P1 foi feita no ramo
`separacao-site-app`; a P2 e a P3 vão em ramos próprios, a partir da `main` do dia (`separacao-p2`, `separacao-p3`).
A P2 partiu da `main` em `fd95b8f`, já com a landing v9 (DP-SA-29).
**Dependências novas:** nenhuma. A Cloudflare liga ao repositório pelo painel dela; o domínio, as variáveis e a regra
de redirecionamento ficam lá. O teste da mudança no Firefox e no WebKit usa navegadores do Playwright que já está no
projeto (`npx playwright install firefox webkit`, sem pacote novo).

**Suposições** (vindas do README e da pesquisa; o dono confirma nos passos dele):
- O repositório é `matheusrv0/metanutri`; o projeto do Supabase é `qmpljfjbdcrdbqutuvmg`, no plano Free.
- O dono já tem conta na Cloudflare (o Turnstile está lá) e a zona DNS de `metanutri.com.br` fica no Registro.br.
- Ninguém usa `app.metanutri.com.br` nem `metanutri-app` na Cloudflare hoje.

## 0. Decisões do plano

- **DP-SA-1 · Alvo do build pelo modo.** `vite build` (modo padrão) monta o **app** em `dist/`; `vite build --mode
  site` monta o **site** em `dist-site/`. Os comandos de hoje (Playwright, `test:csp`, capturas da landing) continuam
  montando o app sem mudar. `npm run build` monta os dois.
- **DP-SA-2 · Um `index.html` só.** Um plugin novo (`src/seo/pluginAlvo.ts`) ajusta a página por alvo. No site: a
  entrada passa de `/src/main.tsx` a `/src/site/main.tsx`, e o `<html>` ganha `data-app` com o endereço do app (o
  `preparar-pagina.js` lê dali). No app: o bloco `<!-- seo:inicio -->…<!-- seo:fim -->` vira a cabeça do D-506, e
  `preparar-pagina.js` vira `preparar-app.js`. No fim do build, cada pasta perde o que é do outro (`robots.txt`,
  `sitemap.xml`, `llms.txt` e `preparar-pagina.js` saem do app; `preparar-app.js` sai do site). Plano B, se a troca da
  entrada não pegar no build: um `site.html` como entrada do site, renomeado para `index.html` no fim (R-511).
- **DP-SA-3 · Endereços.** `src/ui/enderecos.ts` tem `ENDERECO_DO_APP` e `ENDERECO_DO_SITE`, lidos de
  `VITE_ENDERECO_DO_APP` e `VITE_ENDERECO_DO_SITE`, com os de produção como padrão. Só os testes de navegador mudam os
  dois (portas locais). Um teste prende os padrões. O canônico e o SEO (`src/seo/paginas.ts`) continuam fixos em
  `https://metanutri.com.br/`.
- **DP-SA-4 · Hora da entrada e relógio.** A hora da entrada é o menor `timestamp` do `amr` do token de acesso, lido do
  próprio token (base64url, sem pacote). O desvio do relógio é o `iat` do token recebido agora (eventos `SIGNED_IN` e
  `TOKEN_REFRESHED`) menos `Date.now()`, guardado com a marca para valer ao reabrir. Sem `amr` legível, vale a hora que o
  app gravou no `SIGNED_IN`; sem as duas, a sessão conta como vencida.
- **DP-SA-5 · As marcas no navegador.** `metanutri:sessao` = `{ conta, uso, admin, desvio }`; `metanutri:sessao:saida`
  = `{ ate, pendente }` (D-526: o texto não muda com o motivo nem com o tipo de conta, então a marca não guarda os
  dois). As duas ficam fora do espaço da conta, não vão para a nuvem nem para o backup. O uso é gravado no máximo a cada 60 s; dentro da aba vale o valor exato, em memória. Marca de
  outra conta não vale (CB-518). Entrar lê o motivo uma vez e o apaga.
- **DP-SA-6 · Uma aba só faz a saída.** `navigator.locks.request('metanutri:saida', { ifAvailable: true })` quando
  existe; sem ele, `saindo` com prazo de 20 s na `metanutri:sessao` (o mesmo padrão da trava entre abas, DP-30 da
  `dados-na-nuvem`). As outras abas param pelo `SIGNED_OUT` que o supabase-js espalha e pela marca `saiu` (DP-11), e
  mostram o motivo gravado.
- **DP-SA-7 · "Em dia" é uma função só** (`src/domain/contaEmDia.ts`), com a opção de contar o valor retido. O site e o
  receptor contam (D-511, D-513); a saída por tempo não conta (D-517, igual ao "Sair").
- **DP-SA-8 · Envios antes de sair.** Um contexto pequeno (`src/ui/sessao/contextoEnvios.ts`) onde o
  `ProvedorAcompanhamentos` registra o `lerDaNuvem` enquanto está montado (ele já reenvia os links pendentes, D-105 e
  CB-108). A saída chama `nuvem.salvarAgora()` e os envios registrados juntos, com 10 s no total.
- **DP-SA-9 · A marca `saiu` velha.** Ao abrir uma conta, o motor tira o `saiu` da situação. Sem isso, o espaço guardado
  por uma saída com pendência nunca subiria (o DP-27 da `dados-na-nuvem` para o envio quando vê `saiu`).
- **DP-SA-10 · Encerrar a sessão local.** `signOut({ scope: 'local' })`. Se a chave `sb-<ref>-auth-token` ainda existir
  depois (no supabase-js 2.116, quando a renovação falha sem rede antes do encerramento, a sessão não é apagada), o app
  apaga a chave e o `-code-verifier`.
- **DP-SA-11 · A mudança antes dos dados.** Com a rota `mudanca`, o `usuarioId` passado a `ProvedorArmazenamento` e
  `ProvedorNuvem` fica nulo até a mudança terminar (recebida, recusada ou 10 s). A sessão já existe; só os dados esperam.
- **DP-SA-12 · As mensagens.** App → site: `{ tipo: 'pedir', codigo, usuarioId }`. Site → app: `{ tipo: 'dados',
  codigo, usuarioId, chaves }` ou `{ tipo: 'nada', codigo, usuarioId }`. App → site: `{ tipo: 'recebido', codigo,
  usuarioId }`. Sempre `postMessage(mensagem, origemExata)`; quem recebe confere `event.origin` exato e
  `event.source` (o `window.opener` no app; a janela aberta, no site). O código tem 128 bits (`crypto.getRandomValues`),
  em hexadecimal, só na memória da aba do site.
- **DP-SA-13 · Site sem service worker.** No build do site, o vite-plugin-pwa vai com `selfDestroying: true`, sem
  manifesto e sem registro: quem tinha o service worker velho recebe o que se desliga; quem nunca teve não registra nada.
- **DP-SA-14 · App instalável.** O manifesto do app ganha `id: '/'`; `start_url` e `scope` na raiz. O registro do
  service worker (`registrarAplicativo.ts`) e o aviso de versão nova (D-172) não mudam.
- ~~**DP-SA-15 · Portão da Cloudflare.** O comando de build da Cloudflare é `npm run publicar:app` = `node
  scripts/conferir-publicacao.mjs && npm run check && npm audit --omit=dev --audit-level=high && npm run build:app`, a
  mesma conferência do `publicar.yml` de hoje. Saída: `dist`.~~ Substituída pelo DP-SA-31 (sem o `npm run check`).
- **DP-SA-16 · `_headers`.** O `pluginCsp.ts` escreve o `dist/_headers` do app a partir do `csp.ts`, a fonte única.
- **DP-SA-17 · Duas origens nos testes.** App sem conta em `localhost:4173`; app com conta falsa em `localhost:4176`;
  site em `localhost:4178`. O site aponta para o app de `4176`; os dois apps apontam para o site de `4178`. O servidor
  falso passa a responder no contexto do navegador (`context.route`), para valer também na aba que o "Continuar" abre.

**Decisões da implementação da P1 (27/10/2026).** Tomadas ao ler o código, sem perguntar (regra "apenas faça"); cada
uma diz o porquê.

- **DP-SA-18 · O `SIGNED_IN` não prova entrada nova.** O supabase-js 2.116 também manda `SIGNED_IN` ao restaurar a
  sessão guardada no navegador e quando outra aba entra. Por isso: o uso vale `max(uso da marca da mesma conta, hora da
  entrada)`, e uma entrada nova já tem a hora da entrada de agora; o desvio do relógio só vem de token recém-emitido
  (`TOKEN_REFRESHED` e as entradas que o próprio app faz: entrar, confirmar o código, código de troca de senha). A hora
  que o app grava (a reserva do `amr`, DP-SA-4) é a dessas entradas, e a marca guarda `entrada` para isso. O
  `usarConta` confere a sessão sempre que a aba passa de "sem sessão" para "com sessão" (o `getSession`, o
  `INITIAL_SESSION` e o `SIGNED_IN` de outra aba); com a sessão aberta, quem confere é o vigia.
- **DP-SA-19 · O motivo da saída fica até alguém entrar.** No lugar de "Entrar lê o motivo uma vez e o apaga" (DP-SA-5):
  a marca `metanutri:sessao:saida` sai quando uma sessão é aceita (qualquer conta) e no "Sair". Assim as duas abas
  mostram "Entre de novo" (CA-1445), e recarregar Entrar não perde o aviso.
- **DP-SA-20 · A raiz com motivo abre Entrar.** Na P1, a raiz sem sessão abre a landing (CA-730). Com o motivo da saída
  guardado, abre Entrar com "Entre de novo": o CA-1450 vale também em `metanutri.com.br/`. Na P2 isso some: no app, a
  raiz sem sessão já é Entrar (D-504).
- **DP-SA-21 · Onde o vigia mora.** `src/App.tsx` ganha um componente interno entre os provedores e o `Conteudo`: ele lê
  o perfil (o `usePerfilConta` sobe do `Conteudo`, que passa a recebê-lo pronto), roda o vigia, dá os contextos e desenha
  o aviso e a capa por cima de qualquer tela da conta (CB-510). A rota do paciente vem do endereço (`hashchange`), sem
  um segundo `useRota`: a guarda de saída do CA-863a rodaria duas vezes. Arquivo novo: `src/ui/sessao/contextoSessao.ts`
  (a hora do fim, para a faixa dentro da `Estrutura`).
- **DP-SA-22 · "Entre de novo" é título e subtítulo.** O aviso do D-526 é uma frase só e vai no subtítulo da tela
  Entrar, sem caixa à parte. Sai `src/ui/publico/conta/AvisoEntreDeNovo.tsx`; o texto vem de `motivoDaSaida.ts`.
- **DP-SA-23 · Espaço vazio está em dia.** Sem dado da nuvem no espaço e sem dado de antes das contas da pessoa, não há
  o que perder: conta como em dia mesmo sem a situação da nuvem. Sem isso, a saída diria "Entre para enviar o que ficou
  neste navegador" sem nada para enviar.
- **DP-SA-24 · T7 só prende o que o motor já faz.** O `abrirAgora` de `sincronia.ts` já regrava a situação inteira ao
  abrir, sem o `saiu`. A T7 escreve o teste (CA-1449, CB-528) e só mexe no motor se ele falhar.
- **DP-SA-25 · Encerrar a sessão local com prazo.** O `signOut({ scope: 'local' })` espera no máximo 5 s. Depois, as
  chaves `sb-…-auth-token` que sobraram (com `-code-verifier` e `-user`) saem e a renovação automática para (DP-SA-10):
  sem isso, uma renovação atrasada gravaria a sessão de novo.
- **DP-SA-26 · A aba que não faz a saída.** Fica com a capa; quando a sessão cai (`SIGNED_OUT`), vai para Entrar. Se a
  aba que saía for fechada no meio, ela tenta de novo a cada 20 s.
- **DP-SA-27 · Quando o vigia confere.** Ao montar, no próximo instante em que algo muda (aviso, faixa ou saída), no
  máximo a cada 60 s, e em `visibilitychange`, `focus` e no `storage` da marca: o uso em outra aba fecha o aviso aqui
  (CB-508).
- **DP-SA-28 · No navegador, a sessão entra pelo formulário.** O `sessao.spec.ts` entra por Entrar (servidor falso com
  `entrar: 'ok'`): o script de abertura do servidor falso põe a sessão de volta a cada recarga, e a saída recarrega. O
  `ligarServidorFalso` passa a devolver os `logout` pedidos, com o `scope`.

**Decisões da P2 (27/10/2026).** Do coordenador ou tomadas ao ler o código, sem perguntar (regra "apenas faça"); cada
uma diz o porquê.

- **DP-SA-29 · Base e ordem.** A P2 parte da `main` em `fd95b8f` (com a landing v9), no ramo `separacao-p2`; a P3, no
  `separacao-p3`, a partir da P2 pronta. Ordem: T14, T15, T16, T22, T27, T18, T19, T26, R4, R8, T17, T20, T21, T23, T24,
  T25, T28, T29, T30. As tarefas que não tocam a landing vêm antes: o ramo `landing-ajustes` mexe em
  `BotaoFixoDoCelular.tsx`, `RodapeDaLanding.tsx` e `navegacaoPublica.ts`, e a T17 vem depois de trazer a `main` com ele.
- **DP-SA-30 · A `PaginaDoSite` nasce na T18.** Com a T18 antes da T17, a página do site (a moldura com a tela da rota,
  que o build pré-desenha e o pacote do site monta) nasce na T18, com os links de hoje; a T17 só muda os links.
  `src/site/PaginaDoSite.tsx`, `.test.tsx` e `src/seo/vitrine.tsx` passam da T17 para a T18.
- **DP-SA-31 · `publicar:app` sem o `npm run check`** (no lugar do DP-SA-15; o R-507 vale desde já: o build grátis da
  Cloudflare para em 20 minutos): `node scripts/conferir-publicacao.mjs && npm audit --omit=dev --audit-level=high &&
  npm run build:app`. O `check` é obrigatório antes do merge na `main` (já é a prática). O `conferir-publicacao.mjs` só lê
  `src/domain/legal.ts`, sem variável de ambiente: roda igual na Cloudflare, sem ajuste.
- **DP-SA-32 · `.node-version` na raiz, ~~com `22`~~ com a versão exata do DP-SA-62.** O `engines` pede `>=22.12.0`, o
  `publicar.yml` usa 22 e a máquina do projeto, 22.16. A Cloudflare lê o arquivo; o passo 5 do dono não tem mais
  `NODE_VERSION`. Arquivo novo, na T28.
- **DP-SA-33 · Nomes fixos na Cloudflare** (o dono cria em paralelo): projeto `metanutri-app`, ramo `main`, build `npm run
  publicar:app`, saída `dist`, variáveis `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MERCADOPAGO_PUBLIC_KEY` e
  `VITE_TURNSTILE_SITE_KEY`. O código não pede outro nome.
- **DP-SA-34 · Versão dos termos: 28/10/2026.** O dia em que o site da P2 vai ao ar depende do DNS. `VERSAO_TERMOS` e
  `DATA_TERMOS` (`src/domain/legal.ts`) e o teste delas (`src/domain/legal.test.ts`) são o único lugar a trocar, se for
  outro dia.
- **DP-SA-35 · A landing v9 na T17.** Os links do site para o app, na landing de hoje: `MolduraDaLanding.tsx` (sem
  `temSessao`; o botão fixo sempre, D-501), `BarraDaLanding.tsx` ("Entrar" e "Criar conta grátis" com o endereço do app;
  sai "Ir para o painel"), `BotaoFixoDoCelular.tsx` e `FaixaComecar.tsx` (o endereço de Criar conta no app), todos em
  `src/ui/publico/inicio/`, e `src/ui/publico/navegacaoPublica.ts` (sai `painel` do `DestinoPublico`). O topo
  (`HeroiDaLanding`) e os planos (`PlanosEPrecos`) não mudam: os botões chamam `aoComecar` e `aoEscolher`, que o site
  liga ao app. No rodapé (`RodapeDaLanding.tsx`), só o endereço do "Voltar ao topo" muda, de `#/inicio` para `./`: no site,
  `#/inicio` é rota antiga, que recarrega a página (CA-1405). As seções da barra passam a `#<seção>`, e o "Ver o plano de
  exemplo" do topo (`HeroiDaLanding.tsx`), a `#adequacao`; o resto do topo não muda.
- **DP-SA-36 · No site, o clique decide; o endereço é de verdade.** Os links levam o endereço certo (o app ou a página do
  site), para a aba nova e os robôs. No clique comum, "Entrar", "Começar grátis"/"Criar conta grátis", os planos e o
  botão fixo chamam o site, que vai ao app ou, com dado só aqui, abre "Continuar" (D-527). De uma página do site para
  outra, a navegação é a comum; a página em que a pessoa já está só rola ao topo. Com Ctrl, Cmd ou o botão do meio, o
  navegador segue o endereço do app sem "Continuar": a aba nova é escolha da pessoa, e o dado fica no endereço antigo
  até a próxima ida pelo site (D-525).
- **DP-SA-37 · Destaque e marca na consulta.** Preços do site recebe o plano em `?destaque=<plano>`
  (`/precos/?destaque=pro`); a marca do ícone antigo vai ao app em `?icone-antigo` (D-524). Na consulta, e não no `#`: o
  `#` do app é a rota, e o do site fica para as seções da landing.
- **DP-SA-38 · O pacote da mudança é o próprio armazenamento.** `chaves` traz as chaves do navegador com o nome de lá: as
  do espaço da conta (`metanutri:conta:<id>:…`), as de antes das contas, quando o dono é ela ou ninguém (sem o
  `metanutri:dono`: quem marca o dono é o app), e `metanutri:tema`. O app grava como vieram, marca ela como dona das de
  antes das contas e só grava o tema se ainda não tiver um. Daí a migração de sempre (D-123) leva o de antes para o
  espaço dela, e o motor junta com a nuvem (D-513). Chave fora dessas três famílias torna a mensagem ilegível (CB-502).
  Se o app já tiver dado de antes das contas (só no modo local, nunca no endereço novo), a mudança fica para depois,
  como no espaço com pendência: assim nada de fora cai no espaço de outra conta.
- **DP-SA-39 · A confirmação mora dentro dos provedores.** O pedido e a gravação acontecem em `App`, antes dos provedores
  (DP-SA-11); quem vê que a nuvem tem tudo (fase pronta, nada pendente nem salvando, sem trava, `contaEmDia` sem contar
  retidos, migração completa) é um gancho dentro deles, no mesmo `usarMudanca.ts`, que manda o `recebido` uma vez.
- **DP-SA-40 · Sem a aba do site, não espera.** Sem `window.opener`, ou com ele já fechado, o app abre a conta na hora:
  nenhuma resposta pode chegar. Com a aba aberta e calada, espera os 10 s (CA-1437).
- **DP-SA-41 · "Sem espaço neste navegador" tem "Continuar".** A tela do D-526 aparece no lugar de "Trazendo seus
  dados…", e "Continuar" abre a conta com a nuvem (CB-501). Sem o botão, a pessoa ficaria presa nela.
- **DP-SA-42 · Os testes de navegador da landing vão para o site.** `e2e/landing-escura.spec.ts`, `e2e/landing-v3.spec.ts`
  e `e2e/landing-v9.spec.ts`, escritos depois deste plano, também passam a `e2e/site/` (T29). O
  `scripts/capturas-landing.mjs` não existe mais e sai da T28.
- **DP-SA-43 · R4: a recarga da saída não pergunta.** O motor ganha `parada` (verdadeiro depois do `parar()` e do
  `saiuEmOutraAba()`), e o aviso de fechar com pendência (`ProvedorNuvem`) não vale com o motor parado: a conta está
  saindo, e o que não subiu fica no navegador (D-517) ou ficou por escolha da pessoa (CA-479). Vale para a saída por
  tempo e para o "Sair mesmo assim".
- **DP-SA-44 · R8: os links antes da cópia.** Na saída por tempo, os links pendentes vão primeiro e a cópia depois, dentro
  dos mesmos 10 s: o reenvio do link grava no espaço da conta e conta uma mudança, que assim já vai na cópia. Se os links
  tomarem o prazo inteiro, a cópia não sai e o espaço fica.
- **DP-SA-45 · R6 fica registrada, sem código.** Acertar o desvio no meio da sessão pede a hora do servidor a cada
  conferência (um pedido a mais por minuto) ou a data de uma resposta do Supabase; nenhum dos dois é trivial nem está na
  spec. O erro dura até a próxima renovação do token (no máximo 1 hora).
- **DP-SA-46 · O `data-rota` convive com o `data-app`.** O `pluginAlvo` põe `data-app` no `<html>` do site antes de o
  pré-desenho rodar; o `montarPagina` passa a acrescentar o `data-rota` ao `<html>` que vier, em vez de trocar o texto
  exato `<html lang="pt-BR">`. Sem isso, as páginas de subpasta perdiam o `data-rota` e abriam a landing.
- **DP-SA-47 · O site não confere moldura.** O aviso de moldura (D-99) protege a conta e os dados, que agora só existem no
  app, onde ele continua, com o `frame-ancestors 'none'` do cabeçalho (D-507). A vitrine numa moldura não tem o que
  proteger: "Entrar" e os planos abrem o app, que se recusa a abrir dentro dela. O pacote do site fica menor.
- **DP-SA-48 · Os dois endereços sempre definidos no build.** Quando uma variável `VITE_` lida no código não existe, o Vite
  troca a leitura pelo objeto inteiro das variáveis, e o pacote do site levava o endereço e a chave do Supabase do
  `.env.local` (achado ao montar o site, contra o CA-1406). O `pluginAlvo` define `VITE_ENDERECO_DO_APP` e
  `VITE_ENDERECO_DO_SITE` sempre, nos dois alvos (vazias valem o padrão de produção), e `src/ui/enderecos.ts` as lê pelo
  nome, sem colchete. O `pluginAlvo.test.ts` monta um pacote com o Supabase no ambiente e confere; o teste de navegador
  da T29 lê o pacote servido.
- **DP-SA-49 · "Sua conta foi excluída." no Entrar do app.** Depois de excluir a conta, o app ia à landing, que mostrava o
  aviso (CA-808). Agora a landing é de outro endereço, que não lê o armazenamento da aba do app, e a saída leva a Entrar
  (D-504). O aviso vai para o alto de Entrar, uma vez, como era na landing. O CA-808 fica adaptado: "abre Entrar com
  'Sua conta foi excluída.' no topo".
- **DP-SA-50 · Sair do app para o site por uma função.** `sairParaOSite(endereco)` (`src/ui/enderecos.ts`) faz o
  `location.replace`: os testes de tela trocam a função (o jsdom não navega), e o app tem um lugar só que deixa o endereço.
- **DP-SA-51 · Criar conta com sessão vai aonde o plano levaria só quando a sessão já existia.** O app só redireciona
  `#/criar-conta[...]` se a pessoa chegou nele com sessão; a sessão que nasce do próprio cadastro (sem a confirmação do
  e-mail, no modo de teste) segue pelo caminho do cadastro (`destinoDepoisDoCadastro`), sem dois destinos na mesma hora.
- **DP-SA-52 · A raiz sem sessão mostra Entrar sem o "Entre para continuar".** O subtítulo de tela pedida (CA-148) vale
  para a tela de trabalho; na raiz, Entrar abre com o subtítulo de sempre, "Continue de onde parou.".
- **DP-SA-53 · O site é um componente que troca a página por "Continuar".** `src/site/Site.tsx` (novo, com
  `Site.test.tsx`) mostra a página da rota ou, quando um caminho para o app acha dado que só existe aqui, a tela
  "Continuar" ligada ao remetente; o `main.tsx` só faz a limpeza, decide entre ir direto ao app e montar o `Site`. Um
  componente por arquivo: o `main.tsx` não ganha componente. O endereço do app para cada pedido do site (tela, volta,
  ícone instalado) é uma função pura de `limpeza.ts`, testada ali (CA-1424 a CA-1426).
- **DP-SA-54 · Quem conta como dado só aqui.** Depois da limpeza, sobra dado só aqui quando fica algum espaço de conta ou
  algum dado de antes das contas. As marcas da sessão (`metanutri:sessao`, `metanutri:sessao:saida`), o tema e os
  pendentes do aparelho (`metanutri:destino-pendente`, `metanutri:email-pendente`) não são dado da pessoa e não
  levam a "Continuar".
- **DP-SA-55 · O fim da mudança troca o `#` no lugar.** O app vai ao Painel com `history.replaceState` e o aviso de
  `hashchange`, sem navegar. Achado no teste do WebKit: com o `upgrade-insecure-requests` da CSP, uma navegação para o
  mesmo endereço em http vira https e recarrega a aba em outra origem, que perde o que gravou e a ligação com o site.
  No ar é tudo https; trocar sem navegar vale nos dois casos. Nos testes do WebKit, os arquivos pedidos em https voltam
  ao http do servidor local (`e2e/site/mudanca.spec.ts`).
- **DP-SA-56 · A landing "aberta pelo app" (CA-1656, spec landing-v3) não acontece mais.** O app não tem a landing
  (D-502) e, no site, cada página é um endereço próprio, que sempre abre sobre o HTML pré-desenhado. No navegador, o
  teste confere a foto assentando no site, continuando o desenho pronto (CA-1657); o caso "do zero" segue coberto no
  componente (`src/ui/publico/TelaInicio.test.tsx`). Não há código a mudar: só o teste de navegador.

Da revisão independente da P2 (27/10/2026), uma tarefa cada (R9 a R15):

- **DP-SA-57 · A troca nunca esvazia a situação da nuvem (R9).** No modo "trocar" (D-513), as chaves que o pacote traz
  são regravadas no lugar, sem sair antes, e só saem as outras do espaço. Se o pacote não traz a situação da nuvem, a
  do app ganha uma mudança a mais, como na migração (R1), em vez de sair. Motivo: outra aba do app na mesma conta lê a
  situação vazia como "a conta saiu nesta aba" (DP-11) e para o motor até recarregar, presa em "Salvando…". A mudança a
  mais faz o motor juntar o que veio com a nuvem, item por item, como faria sem a situação, e a conta só fica em dia
  depois de subir.
- **DP-SA-58 · O link de paciente antigo também limpa a sessão (R10).** O script do `<head>` apaga as chaves
  `sb-…-auth-token` (e `-code-verifier` e `-user`) antes de mandar o `#/missoes/…` ao app. Motivo: a limpeza do D-511 é
  "em toda visita", e o link do paciente é a visita mais comum ao endereço antigo; ele sai antes de o pacote do site
  carregar. Só a sessão: o espaço das contas fica para a próxima visita, como hoje (CB-512).
- **DP-SA-59 · A limpeza também apaga as marcas do aparelho (R11).** `metanutri:sessao`, `metanutri:sessao:saida`,
  `metanutri:destino-pendente` e `metanutri:email-pendente` saem em toda visita ao site: só o app as usa, e o e-mail é
  dado pessoal (minimização do D-511). O tema fica: o site usa. Elas continuam fora do "dado só aqui" (DP-SA-54). Os
  nomes ficam escritos em `src/site/limpeza.ts` (o pacote do site não importa as telas do app); o teste confere que são
  os mesmos das constantes do app. A `metanutri:sessao:saida` entra pelo mesmo motivo das outras três.
- **DP-SA-60 · O site apaga só o que não mudou desde a entrega (R12).** O remetente guarda o pacote entregue (chave e
  valor); no "recebido", saem só as chaves do pacote, do espaço da conta e de antes das contas, cujo valor ainda é o
  entregue. O que mudou depois fica e conta como dado só aqui na próxima visita. O dono sai quando não sobra dado de antes
  das contas; o tema fica, como antes.
- **DP-SA-61 · O manifesto do app sem frase de venda (R13).** `name` e `short_name` "MetaNutri", sem `description`. A
  regra do dono é sem tagline (05/10/2026), e o site já não é instalável.
- **DP-SA-62 · Node exato: 22.23.4 (R14).** O `undici` pede 22.19 ou mais e o `jsdom` dos testes, 22.22.2 ou mais; 22.23.4
  é a última do 22. Com "22", a Cloudflare podia pegar uma menor. A máquina do projeto tem 22.16: a conferência roda o
  `npm run publicar:app` e o `npm run check` com o 22.23.4 pelo `npx -p node@22.23.4`, sem instalar nada no projeto.
- **DP-SA-63 · No iPhone, o ícone antigo pode abrir o "Continuar" sem `window.opener` (R15).** No modo instalado do iOS,
  a aba nova pode não ter a ligação com a do site: o app não espera (DP-SA-40), abre com a nuvem e o dado fica no
  endereço antigo, sem perda. O roteiro do dono ganha esse teste (README, passo 11: o ícone antigo só abre o site novo
  depois que ele vai ao ar).

## 1. Tarefas

Cada tarefa é um commit (Conventional Commits, em português) que passa em `npm run lint`, `npm run typecheck` e
`npm run test` sozinho. "Verifica" diz o teste que prova. Nenhum arquivo fora desta lista; se faltar algum, o PLAN muda
antes.

### P1 · Sessão com tempo e funções com a lista (no endereço de hoje)

- [x] **T1 · Spec: notas da P1.** `specs/dados-na-nuvem/SPEC.md` (nota no D-131: a saída por tempo guarda o que não
  subiu, D-517), `specs/dados-na-nuvem/PLAN.md` (nota no DP-27: o "Sair" encerra a sessão local, D-520),
  `specs/seguranca-lote-1/SPEC.md` (nota no D-97 e no CA-425: a lista, D-521). Depende de: SPEC e PLAN aprovados.
  Verifica: leitura.
- [x] **T2 · Funções com a lista de endereços.** `supabase/functions/_shared/cobranca.ts` (`ORIGENS_PERMITIDAS` com os
  dois endereços; `cabecalhosPara(origem)` dá permissão só a endereço da lista e manda sempre `Vary: Origin`;
  `responder(corpo, status, origem)`), `supabase/functions/assinar/index.ts`,
  `supabase/functions/gerenciar-assinatura/index.ts` e `supabase/functions/excluir-conta/index.ts` (passam
  `req.headers.get('Origin')` no `OPTIONS` e em toda resposta; o padrão do `SITE_URL` em `assinar` vira
  `https://app.metanutri.com.br/`), `src/data/cobrancaServidor.test.ts`, `src/data/servidorLigacao.test.ts`,
  `src/data/servidorExcluirLigacao.test.ts`. Depende de: T1. Verifica: CA-1459, CA-1461.
- [x] **T3 · Regras do tempo (puras).** `src/domain/tempoDeSessao.ts` e `.test.ts`: os limites (D-514), os avisos
  (D-516), a hora da entrada e o desvio (DP-SA-4), a situação da sessão (`seguir`, `avisar`, `faixa`,
  `sair-inatividade`, `sair-limite`, com a hora em que termina) e o texto da hora ("as 15:42", "ontem às 15:42",
  "25/10 às 15:42"). Depende de: —. Verifica: CA-1440 a CA-1444 (a regra), CA-1454, CB-516, CB-517, CB-526.
- [x] **T4 · "Em dia" (puro).** `src/domain/contaEmDia.ts` e `.test.ts` (DP-SA-7: situação, parcial, retidos opcionais,
  `pendentes` dos links, dado sem conta da pessoa; e a lista das contas com espaço no navegador),
  `src/domain/donoDosDados.ts` (exporta `chavesSemConta`). Não importa nada de `src/ui/estado/supabase.ts`: o site vai
  usar. Depende de: —. Verifica: CA-1427 e CA-1428 (a regra, um caso por motivo).
- [x] **T5 · Marca de uso e motivo da saída.** `src/ui/sessao/marcaDeUso.ts` e `.test.ts`,
  `src/ui/sessao/motivoDaSaida.ts` e `.test.ts` (DP-SA-5). Depende de: T3. Verifica: CA-1445 (a marca dividida entre
  abas), CB-517, CB-518.
- [x] **T6 · A conta: "Sair" local, saída por tempo e conferência ao abrir.** `src/ui/estado/usarConta.ts` e
  `usarConta.test.ts`: o "Sair" com `scope: 'local'` (D-520); `sairPorTempo({ apagar, ate })` (DP-SA-5); depois do
  `getSession` e antes do primeiro `setSessao`, a sessão vencida sai (D-518: apaga se em dia sem contar retidos, guarda
  se não) e grava o motivo; DP-SA-10; no `SIGNED_IN`, a marca e o desvio; no `TOKEN_REFRESHED`, o desvio (DP-SA-18).
  `src/ui/estado/usarSaida.test.tsx` (o "Sair" continua igual por fora). `src/ui/publico/conta/contaFalsa.test-utils.ts`
  (a conta falsa das telas ganha o `sairPorTempo`). `e2e/apoio/servidorFalso.ts` (o token falso ganha `amr` e `iat` já
  aqui: sem eles, a sessão dos testes de navegador contaria como vencida até a T12). Depende de: T3, T4, T5. Verifica:
  CA-1450, CA-1451, CA-1452, CA-1453, CB-506.
- [x] **T7 · O motor tira o `saiu` velho.** `src/domain/sincronia.ts` e `src/domain/sincronia.test.ts` (DP-SA-9).
  Depende de: —. Verifica: CA-1449, CB-528.
- [x] **T8 · Envios antes de sair.** `src/ui/sessao/contextoEnvios.ts` e `contextoEnvios.test.tsx` (novos),
  `src/ui/estado/ProvedorAcompanhamentos.tsx` (registra o `lerDaNuvem`). Depende de: —. Verifica: CA-1447 (a parte dos
  links), CB-510.
- [x] **T9 · O vigia da sessão.** `src/ui/sessao/usarTempoDeSessao.ts` e `usarTempoDeSessao.test.tsx` (relógio falso):
  escuta `keydown`, `pointerdown`, `touchstart`, `wheel` e `scroll` (não `pointermove` nem `mousemove`); confere ao
  montar, a cada 60 s, em `visibilitychange` e em `focus`; expõe o aviso, a faixa, a capa e `continuar()`; sai na ordem
  do D-517, com uma aba só (DP-SA-6). Depende de: T3 a T8. Verifica: CA-1440, CA-1441, CA-1442, CA-1443, CA-1445,
  CA-1446, CA-1447, CA-1448, CA-1458, CB-508, CB-509, CB-522, CB-527.
- [x] **T10 · As telas da sessão.** Novos, um componente por arquivo, com os componentes do design system:
  `src/ui/sessao/AvisoDeInatividade.tsx`, `src/ui/sessao/FaixaDoLimite.tsx`, `src/ui/sessao/CapaEncerrando.tsx`,
  `src/ui/sessao/contextoSessao.ts` (DP-SA-21); `src/ui/publico/conta/TelaEntrar.tsx` (título "Entre de novo" e o aviso
  no subtítulo quando há motivo, DP-SA-22); testes `src/ui/sessao/telasDaSessao.test.tsx` e `src/ui/publico/conta/TelaEntrar.test.tsx`. Textos
  exatos do D-526. Depende de: T3, T5. Verifica: CA-1442 e CA-1444 (as telas), CA-1447 e CA-1448 (os textos), CB-516.
- [x] **T11 · Ligar no app.** `src/App.tsx` (o vigia roda com servidor e sessão e nunca na rota `missoes`; o aviso e a
  capa por cima; depois da saída, a rota vai para Entrar; a raiz com motivo abre Entrar, DP-SA-20; DP-SA-21), `src/ui/layout/Estrutura.tsx` (a faixa no topo da área, no
  fluxo, como o aviso de versão nova), `src/AppConta.test.tsx` e `src/AppNuvem.test.tsx`. Depende de: T9, T10.
  Verifica: CA-1444 (o lugar), CA-1455, CA-1456, CA-1457.
- [x] **T12 · No navegador (P1).** `e2e/apoio/servidorFalso.ts` (token com `amr` e `iat`; o `logout` guarda o `scope`
  pedido), `e2e/servidor-falso/sessao.spec.ts` (novo): `page.clock` para 28 e 30 minutos e para 12 horas; reabrir
  (contexto novo com o mesmo `storageState`); duas abas; sem internet na saída (`context.setOffline`). Depende de: T11.
  Verifica: CA-1440, CA-1442, CA-1443, CA-1445, CA-1447, CA-1448, CA-1449, CA-1450, CA-1451, CA-1453.
- [x] **T13 · README e fechamento da P1.** `README.md` (seção "Ordem para publicar a P1 da separação": as funções antes
  do site, e como conferir a lista com `curl`). Rodar `npm run check`, `npm run e2e` e `npm run test:csp`; conferir na
  matriz cada CA da P1. Depende de: T2 a T12.
  *Feita em 27/10/2026, no ramo `separacao-site-app`: `npm run check` (287 arquivos, 5195 testes), `npm run e2e` (288) e
  `npm run test:csp` (3) passaram; todo CA da P1 tem teste na matriz. A T7 ficou só no teste (DP-SA-24) e a
  `usarSaida.test.tsx` não precisou mudar: o "Sair" é o mesmo por fora.*

#### Correções da revisão independente da P1 (27/10/2026)

As três funções já estão em produção com o código deste ramo; nenhuma correção mexe nelas. Cada uma é um commit, com o
teste que falha antes.

- [x] **R1 · A saída por tempo não apaga o que não chegou à nuvem (grave).** Com a migração do D-123, o pendente ficava
  só na memória do motor (`sujo`); sem o motor abrir, o `parar()` gravava uma situação zerada e o `contaEmDia` dava "em
  dia". Duas partes: (a) `src/ui/sessao/usarTempoDeSessao.ts` e `.test.tsx`: guarda o resultado do `salvarAgora()` e
  decide `apagar` (salvou e em dia) antes do `parar()`; sem motor, vale só o `contaEmDia`. (b) Na raiz:
  `src/domain/donoDosDados.ts` e `src/domain/donoDosDados.test.ts` (a migração conta uma mudança no espaço da conta
  que recebeu os dados, com `contarMudanca`) e `src/domain/contaEmDia.ts` e `.test.ts` (situação com `versao` nula e
  dado na conta não está em dia: a nuvem nunca confirmou). Protege também o D-518 e o site da P2.
- [x] **R2 · Duas abas não saem antes da hora.** `src/ui/sessao/usarTempoDeSessao.ts` e `.test.tsx`: o `conferir()`
  grava a marca quando o uso em memória é mais novo que o dela, e a aba grava também ao ficar oculta
  (`visibilitychange`) e no `pagehide`. O uso continua indo no máximo a cada 60 s pelos eventos (DP-SA-5).
- [x] **R3 · Uso depois do prazo não renova a sessão vencida.** `src/ui/sessao/usarTempoDeSessao.ts` e `.test.tsx`: o
  `usar()` confere antes; vencida, sai sem gravar o uso (o computador acordou e a primeira tecla chegou antes do
  relógio do vigia).
- [x] **R5 · Rolagem do app não é uso.** `src/ui/sessao/usarTempoDeSessao.ts` e `.test.tsx`: sai o `scroll` da lista
  (D-515). A rolagem da pessoa chega por `wheel`, `touchstart`, `keydown` e `pointerdown`.
- [x] **R7 · A saída ao abrir não troca o motivo que já existe.** `src/ui/estado/usarConta.ts` e `usarConta.test.ts`:
  com o motivo de uma saída anterior guardado, a hora fica a dele (a do último uso); a pendência só soma.

*Feitas em 27/10/2026, uma por commit, com o teste antes: `npm run check` (287 arquivos, 5207 testes), `npm run e2e`
(288) e `npm run test:csp` (3) passaram.*

**Pendências da revisão, para a P2** (registradas, sem código agora):
- **R4 · `beforeunload` na saída sem internet:** a recarga do D-517, passo 5, pode cair no aviso de fechar com
  pendência (`avisarAoFechar`), já que o motor parou com algo pendente.
- **R6 · Desvio do relógio com token antigo, ou relógio corrigido no meio da sessão:** o desvio só muda com token
  recém-emitido; um relógio acertado durante a sessão desloca a conta até a próxima renovação.
- **R8 · Ordem entre o envio dos links e o `salvarAgora()`:** hoje os dois vão juntos; um link pendente salvo depois da
  cópia pode deixar a situação com mudança nova no fim da saída.

Na P2, cada uma com o teste que falha antes e um commit (DP-SA-43 a DP-SA-45):
- [x] **R4 · A recarga da saída não pergunta.** `src/domain/sincronia.ts` e `src/domain/sincronia.test.ts` (`parada`),
  `src/ui/estado/ProvedorNuvem.tsx` e `src/ui/estado/ProvedorNuvem.test.tsx` (o `beforeunload` com o motor parado não
  avisa). Verifica: R4.
- [x] **R8 · Os links antes da cópia.** `src/ui/sessao/usarTempoDeSessao.ts` e `usarTempoDeSessao.test.tsx`. Verifica: R8
  e CA-1447 (a ordem).
- **R6** fica registrada, sem código (DP-SA-45).

### P2 · App no endereço novo, site com os repasses e a mudança dos dados

- [x] **T14 · Spec: notas da P2.** `specs/estilo-spora/SPEC.md` (CA-730), `specs/site-publico-profissional/SPEC.md`
  (D-320, D-331, D-332, D-337, D-338, D-339, CA-992, CA-996, CA-1015, CA-1016, CA-1021, CA-1023 a CA-1026, CA-1028,
  CB-322, CB-323, R-323, R-324), `specs/seguranca-lote-1/SPEC.md` (D-99, CA-431), `specs/seguranca-lote-4/SPEC.md`
  (D-135, CA-485). Depende de: P1 no ar. Verifica: leitura.
- [x] **T15 · Endereços.** `src/ui/enderecos.ts` e `.test.ts` (DP-SA-3; `paginaDoSite(rota, destaque?)`,
  `telaNoApp(hash, busca)` e `enderecoOficial(local)` para o `*.pages.dev`), `src/vite-env.d.ts` (tipos das duas
  variáveis), `src/ui/moldura.ts`, `src/ui/AvisoMoldura.tsx` e `src/ui/AvisoMoldura.test.tsx` (o link do aviso é o app).
  Depende de: T14. Verifica: CA-1420; os padrões de produção; a regra do CA-1417.
- [x] **T16 · CSP por alvo e cabeçalhos do app.** `src/seguranca/csp.ts` (`diretivasDoSite()`; `cabecalhosDoApp()`, o
  texto do `_headers` com o D-507), `src/seguranca/pluginCsp.ts` (recebe o alvo; no site, a política do site; no app, a
  de hoje e o `_headers`, DP-SA-16), `src/seguranca/csp.test.ts`, `src/seguranca/pluginCsp.test.ts`. Depende de: T14.
  Verifica: CA-1406 (a CSP), CA-1419 (o texto dos cabeçalhos).
- [x] **T17 · Os links das páginas do site.** ~~`src/site/PaginaDoSite.tsx` e `.test.tsx` (novos: a moldura com a tela
  da página, os links do D-501 e do D-503)~~ (nascem na T18, DP-SA-30; aqui ganham os links do D-501 e do D-503),
  `src/ui/publico/MolduraPublica.tsx` (sem `temSessao`, `abriuNaVitrine` e `recarregar`;
  links de verdade entre as páginas; "Entrar" e "Começar grátis" para o app; o rodapé sem "Ir para o painel"),
  ~~`src/ui/publico/TelaInicio.tsx` ("Começar grátis" para o app; "Ver preços" para `precos/`)~~ (a landing v9, DP-SA-35:
  `src/ui/publico/inicio/MolduraDaLanding.tsx`, `BarraDaLanding.tsx`, `BotaoFixoDoCelular.tsx`, `FaixaComecar.tsx`,
  `RodapeDaLanding.tsx`, `HeroiDaLanding.tsx` e `MolduraDaLanding.test.tsx`, e `src/ui/publico/navegacaoPublica.ts`),
  `src/ui/publico/SecaoPrecos.tsx` (destaque pelo `?destaque=`; os planos levam a Criar conta no app),
  ~~`src/seo/vitrine.tsx` (desenha a `PaginaDoSite`)~~ (T18), `src/App.tsx` (só as props da moldura que saíram), testes
  `src/ui/publico/MolduraPublica.test.tsx`, `src/ui/publico/TelaInicio.test.tsx`, `src/ui/publico/SecaoPrecos.test.tsx`,
  `src/seo/vitrine.test.tsx`, `src/site/main.tsx` (o destaque da consulta). Depende de: T15, T18. Verifica: CA-1402,
  CA-1403, CA-1404.
  *Feita: `SecaoPrecos.tsx` e `.test.tsx` não precisaram mudar. O destaque já vinha por propriedade (a `PaginaDoSite`
  passa o da consulta) e os botões dos planos chamam `aoEscolher`, que a `PaginaDoSite` leva ao app ou a "Continuar".
  Os planos continuam botões: o Ctrl+clique do DP-SA-36 vale para os links (Entrar, Começar grátis e o botão fixo).*
- [x] **T18 · A entrada do site e os dois builds.** `src/site/main.tsx` (novo: monta a `PaginaDoSite` da `data-rota`),
  `src/site/PaginaDoSite.tsx` e `.test.tsx` (novos, DP-SA-30: a moldura com a tela da rota; as páginas e o app pelos
  endereços de verdade), `src/seo/vitrine.tsx` (desenha a `PaginaDoSite`),
  `src/seo/pluginAlvo.ts` e `.test.ts` (novos, DP-SA-2), `vite.config.ts` (DP-SA-1: no site, `dist-site`, `pluginSeo`,
  `pluginAlvo` e a CSP do site; no app, `dist`, sem pré-desenho), `index.html` (as marcas que o plugin troca, sem mudar o
  texto do site), `public/preparar-app.js` (novo: só o tema), `package.json` (`build` monta os dois; `build:app`,
  `build:site`, `dev:site`, `preview:site`, `publicar:app` do DP-SA-31), `.gitignore` (`dist-site/`),
  `src/seo/arquivosDoSite.test.ts` (o que vai em cada pasta), `src/seo/cabecalho.test.ts`, `src/seo/montarPagina.ts` e
  `.test.ts` (o `data-rota` entra no `<html>` que já tem o `data-app`, DP-SA-46), `src/ui/enderecos.ts` (a leitura das
  variáveis pelo nome, DP-SA-48). Depende de: T15, T16 (antes
  da T17, DP-SA-29). Verifica: CA-1418 (a cabeça do app, pelo plugin), CA-1408 (o pré-desenho continua no site).
- [x] **T19 · O `<head>` do site.** `public/preparar-pagina.js` (o tema; `#/missoes/…` vai ao app na hora; `#/inicio`,
  `#/precos[/<plano>]`, `#/termos`, `#/privacidade` e `#/fontes` vão à página própria; tela do app, `?volta=` e modo
  instalado escondem a vitrine e deixam a decisão para o pacote; não procura mais sessão),
  `src/seo/prepararPagina.test.tsx`. Depende de: T18. Verifica: CA-1405, CA-1423, CB-511, CB-512.
- [x] **T20 · As rotas do app.** `src/App.tsx` (raiz sem sessão vai a Entrar; `inicio`, `precos`, `termos`,
  `privacidade` e `fontes` vão à página do site com `location.replace`; Criar conta com sessão vai a `destinoDoPlano`;
  depois do "Sair", Entrar), `src/ui/navegacao.ts` (`TELAS_DO_SITE` e `enderecoNoSite`), `src/ui/enderecos.ts` e `.test.ts`
  (`sairParaOSite`, DP-SA-50), `src/main.tsx` (saem `enderecoDoApp`,
  `enderecoDaVitrine` e `marcarAbertura`; entra o `enderecoOficial` antes de tudo), `src/seo/rotaDaPagina.ts` e
  `src/seo/rotaDaPagina.test.ts` (saem), `src/ui/aplicativo/aberturaDaPagina.ts` e
  `src/ui/aplicativo/aberturaDaPagina.test.ts` (saem), `src/ui/publico/conta/TelaEntrar.tsx` e
  ~~`src/ui/publico/conta/MolduraConta.tsx`~~ ("Conheça o MetaNutri" e a logo levam ao site: a logo já chama `#/inicio`, que o
  app manda ao site, e a moldura não muda), `src/ui/publico/AvisoContaExcluida.tsx` e `.test.tsx` (DP-SA-49),
  testes `src/App.test.tsx`,
  `src/AppConta.test.tsx`, `src/ui/navegacao.test.ts`, `src/ui/telasComServidor.test.tsx`,
  `src/ui/publico/conta/TelaEntrar.test.tsx`, `src/ui/estado/usarConta.test.ts` (o endereço de volta sai da origem do
  app). Depende de: T15, T18. Verifica: CA-1409, CA-1410, CA-1411, CA-1412, CA-1413, CA-1415, CA-1417, CA-1463.
  *Feita. `src/ui/telasComServidor.test.tsx` não precisou mudar. O teste de navegador da T29 achou o aviso de conta
  excluída abaixo do título; o DP-SA-49 o quer no topo: `MolduraConta.tsx` ganhou o lugar do aviso, antes do título
  (commit próprio, com o teste antes).*
- [x] **T21 · Links do app para o site.** `src/ui/AreaDeTrabalho.tsx` (Fontes, nas duas telas que a abrem, em aba nova;
  "Ver preços" vai a Preços do site), `src/ui/fluxoConta.ts` e `src/ui/fluxoConta.test.ts` (o aviso de limite leva a
  Preços do site com o plano seguinte), `src/ui/publico/conta/TelaCriarConta.tsx` e
  `src/ui/publico/conta/TelaCriarConta.test.tsx` (Termos e Política no site, em aba nova; "Trocar plano" vai a Preços
  do site), `src/ui/publico/TelaCheckout.tsx` e `src/ui/publico/TelaCheckout.test.tsx` (o link dos Termos). Depende de:
  T20. Verifica: CA-1412 (o destaque), CA-1414.
  *Feita: `src/ui/fluxoConta.ts` e `.test.ts` não precisaram mudar. O aviso de limite já dava a rota de Preços com o
  plano seguinte, e o app manda essa rota ao site com o destaque (T20).*
- [x] **T22 · A mudança (pura).** `src/domain/mudancaDeEndereco.ts` e `.test.ts`: o pacote de uma conta (o espaço, o
  dado sem conta dela ou sem dono, o tema), a leitura de mensagem (DP-SA-12), como receber (`gravar`, `trocar` ou
  `depois`, pelo T4 com retidos), gravar o pacote (desfaz tudo se não couber) e apagar do site o que foi entregue.
  Depende de: T4. Verifica: CA-1432, CA-1433, CA-1434, CA-1435 e CA-1438 (as regras), CB-501, CB-502, CB-504, CB-520.
- [x] **T23 · Limpeza e remetente no site.** `src/site/limpeza.ts` e `.test.ts` (em toda visita, apaga toda
  `sb-*-auth-token` e as contas em dia; diz se sobrou dado só aqui), `src/site/remetente.ts` e `.test.ts` (abre o app em
  aba nova sem `noopener`; responde ao pedido; apaga no `recebido`), `src/site/TelaContinuar.tsx` e `.test.tsx` (os
  quatro estados do D-526, só com o botão "Continuar"), `src/site/Site.tsx` e `.test.tsx` (novos, DP-SA-53),
  `src/site/main.tsx` (a ordem: limpeza, depois repasse ou
  "Continuar", depois a página; com dado só aqui, as telas do app, `?volta=`, "Entrar", "Começar grátis", os planos e o
  modo instalado abrem "Continuar", D-527; o modo instalado leva a marca do D-524, também na aba do "Continuar").
  Depende de: T18, T19, T22. Verifica: CA-1401, CA-1424, CA-1425, CA-1427, CA-1428, CA-1429, CA-1430, CA-1436 (o lado do site), CB-500, CB-503,
  CB-507, CB-513 (a volta antiga do pagamento), CB-519.
- [x] **T24 · O receptor no app.** `src/ui/navegacao.ts` e `src/ui/navegacao.test.ts` (a rota `mudanca/<código>`, que
  pede sessão), `src/ui/mudanca/usarMudanca.ts` e `.test.ts` (pede ao `window.opener`; espera 10 s; grava pelo T22;
  confirma quando a nuvem tem tudo, D-513), `src/ui/mudanca/TelaTrazendoDados.tsx` ("Trazendo seus dados…" e "Sem
  espaço neste navegador", D-526), `src/App.tsx` (DP-SA-11; no fim, o Painel), `src/AppNuvem.test.tsx`. Depende de:
  T20, T22. Verifica: CA-1431, CA-1433, CA-1434, CA-1435, CA-1436 (o lado do app), CA-1437, CA-1439, CB-505.
- [x] **T25 · O aviso do ícone antigo.** `src/ui/aplicativo/AvisoIconeAntigo.tsx` e `.test.tsx` (novos, textos do
  D-526), `src/ui/layout/Estrutura.tsx` (mostra uma vez e tira a marca do endereço). Depende de: T20, T23. Verifica: CA-1426.
- [x] **T26 · O aplicativo instalado.** `vite.config.ts` (DP-SA-13 no site; DP-SA-14 no app), `src/seo/pluginAlvo.ts` (a configuração do PWA de cada
  alvo sai do `vite.config.ts` para uma função que o teste lê), `src/seo/pluginAlvo.test.ts`
  (confere a configuração do PWA de cada alvo e monta o site com ela). Depende de: T18. Verifica: CA-1407 (a configuração), CA-1421.
- [x] **T27 · Política, termos e `llms.txt`.** `src/ui/publico/TelaPrivacidade.tsx` (D-522), `src/domain/legal.ts`
  (versão e data = o dia da P2; publicando em outro dia, troca as duas e o teste), `src/domain/legal.test.ts`,
  `src/ui/publico/legal.test.tsx`, `public/llms.txt` (a linha do Entrar), `src/seo/arquivosDoSite.test.ts` (CA-1019 e
  a linha do Entrar). Depende de: T14. Verifica: CA-1408 (o `llms.txt`), CA-1462.
- [x] **T28 · A publicação.** `.github/workflows/publicar.yml` (só o site: `npm run build:site` e `dist-site`; saem do
  build as chaves do Supabase, do Mercado Pago e do Turnstile), `README.md` ("Projeto já ligado", passos 1, 4 e 8, com
  os endereços novos; seção "Ordem para publicar a P2 e a P3", com os passos do dono da seção 4 deste plano: a P3 vem
  logo depois do site da P2, D-528),
  ~~`scripts/capturas-landing.mjs` (o comentário do comando; o roteiro não muda)~~ (não existe mais, DP-SA-42),
  `.node-version` (novo, DP-SA-32), `src/data/sqlCheckout.test.ts` e `src/ui/publico/conta/turnstile.test.ts` (eles
  liam no `publicar.yml` as chaves do pagamento e da verificação; agora conferem que o site publicado não as leva e que
  o app as recebe da Cloudflare, DP-SA-33). Depende de: T18. Verifica: leitura do
  workflow; `npm run build:site` sem `.env.local` monta e passa no CA-1406.
- [x] **T29 · Testes de navegador com duas origens.** `playwright.config.ts` (DP-SA-17: os três servidores; o projeto
  `site`; Firefox e WebKit só para a mudança), `playwright.csp.config.ts` (confere que monta o app),
  `e2e/apoio/servidorFalso.ts` (responde no contexto). As partes de vitrine de `e2e/publico.spec.ts`,
  `e2e/site-publico.spec.ts`, `e2e/textos-e-promessas.spec.ts`, `e2e/servidor-falso/site-publico.spec.ts`,
  `e2e/servidor-falso/telas-publicas.spec.ts` e `e2e/servidor-falso/textos-e-promessas.spec.ts` passam a abrir o site
  (`e2e/site/`, mesmos nomes), como `e2e/landing-escura.spec.ts`, `e2e/landing-v3.spec.ts` e `e2e/landing-v9.spec.ts`
  (DP-SA-42); o resto fica onde está. Também mudam: `e2e/conta.spec.ts` e `e2e/csp.spec.ts` (os caminhos da landing e
  de Preços até o cadastro passam a `e2e/site/repasses.spec.ts`; a CSP do app sem os dados estruturados do site),
  `e2e/missoes.spec.ts` (CA-1416: o endereço do link criado é o do app), `e2e/servidor-falso/telas-publicas.spec.ts`
  (as páginas do site vão para `e2e/site/telas-publicas.spec.ts`; a raiz do app abre Entrar),
  `e2e/servidor-falso/revisao.spec.ts` (o rodapé e o topo públicos, D-235, e Preços, D-234, passam a
  `e2e/site/revisao.spec.ts`; o M-5 abre uma tela do app), `e2e/exclusao-de-conta.spec.ts` (CA-808: o aviso fica em
  Entrar, DP-SA-49), `e2e/fundacao.spec.ts` (CA-100: as fontes conferidas em Entrar, já que `#/inicio` leva ao
  site), `e2e/site/landing-v3.spec.ts` (o "Entrar" da barra é o endereço do app) e
  `e2e/site/landing-v9.spec.ts` (CA-1656, DP-SA-56), e sai
  `e2e/servidor-falso/site-publico.spec.ts` (o CA-1023, que sai com o D-337). Novos: `e2e/site/repasses.spec.ts`,
  `e2e/site/revisao.spec.ts`, `e2e/site/mudanca.spec.ts`
  (de ponta a ponta, nos três navegadores) e `e2e/servidor-falso/app-separado.spec.ts`. Depende de: T15 a T28.
  Verifica, no navegador: CA-1400, CA-1401, CA-1404, CA-1405, CA-1406 (o pacote servido), CA-1408, CA-1409 a CA-1418,
  CA-1422 (`npm run test:csp`), CA-1423 a CA-1425 e CA-1429 a CA-1439.
- [x] **T30 · Fechamento da P2.** Rodar `npm run check`, `npm run e2e` e `npm run test:csp`; conferir a matriz; anotar no
  relatório qualquer diferença entre o código e a spec. Depende de: T14 a T29. Também as notas que faltavam nas specs
  antigas: `specs/exclusao-de-conta/SPEC.md` (CA-808, DP-SA-49) e `specs/landing-v3/SPEC.md` (CA-1656, DP-SA-56).
  *Feita em 27/10/2026, no ramo `separacao-p2`, sem `.env.local`: `npm run check` (298 arquivos, 5390 testes), `npm run e2e`
  (352: 129 no app local, 85 no app com o servidor falso, 134 no site e a mudança no Firefox e no WebKit, 2 em cada),
  `npm run test:csp` (3), `npm run build`, `npm run build:site` e `npm run build:app` passaram. Numa das rodadas do
  `npm run e2e`, o CA-1442 de `e2e/servidor-falso/sessao.spec.ts` (P1) falhou uma vez, com a máquina cheia; passou em
  13 repetições seguidas e na rodada inteira de novo. Todo CA da P2 tem teste na matriz. Diferenças entre o código e a
  spec estão no relatório da P2 (DP-SA-36 nos planos, CA-1656 pelo DP-SA-56, CA-1417, CA-1419 e CA-1407 sem navegador).*

#### Correções da revisão independente da P2 (27/10/2026)

Cada uma com o teste que falha antes e um commit, no ramo `separacao-p2`; o `separacao-p3` é refeito por cima.

- [x] **R9 · A troca não para a outra aba (média).** `src/domain/mudancaDeEndereco.ts` e `.test.ts` (a situação nunca
  fica vazia durante a troca, com e sem ela no pacote; DP-SA-57), `e2e/site/mudanca-outra-aba.spec.ts` (novo, só no
  Chromium: com outra aba do app aberta, a troca acontece e o paciente novo dela sobe; e o CB-507, duas abas do site com
  "Continuar"). Verifica: CA-1434, CB-124, CB-507.
- [x] **R10 · O link de paciente antigo limpa a sessão.** `public/preparar-pagina.js`, `src/seo/prepararPagina.test.tsx`
  (DP-SA-58). Verifica: D-511 (a), CA-1423.
- [x] **R11 · As marcas do aparelho saem do endereço antigo.** `src/site/limpeza.ts` e `.test.ts` (DP-SA-59). Verifica:
  D-511, DP-SA-54.
- [x] **R12 · Apagar só o que foi entregue sem mudar.** `src/domain/mudancaDeEndereco.ts` e `.test.ts` (`apagarEntregue`
  recebe o pacote), `src/site/remetente.ts` e `.test.ts` (guarda o pacote entregue). Verifica: CA-1436, CB-507
  (DP-SA-60).
- [x] **R13 · O manifesto sem frase de venda.** `src/seo/pluginAlvo.ts` e `.test.ts` (DP-SA-61). Verifica: CA-1421.
- [x] **R14 · Node exato.** `.node-version` e `src/data/sqlCheckout.test.ts` (o teste que já lê a publicação confere a
  versão exata e mínima; DP-SA-62).
- [x] **R15 · O iPhone com o ícone antigo no roteiro do dono.** `README.md` (passo 11 da "Ordem para publicar a P2 e a P3";
  DP-SA-63). Sem teste automático.

*Feitas em 27/10/2026, uma por commit, com o teste antes (a R15 é só texto): `npm run check` (298 arquivos, 5400 testes,
também com o Node 22.23.4), `npm run e2e` (354, com os 2 de `e2e/site/mudanca-outra-aba.spec.ts`) e `npm run test:csp`
(3) passaram; o `npm run publicar:app` passou com o Node 22.23.4.*

### P3 · O endereço antigo fecha (logo depois do site da P2, D-528)

- [ ] **T31 · Só o app nas funções.** `supabase/functions/_shared/cobranca.ts` (a lista fica só com o app),
  `src/data/cobrancaServidor.test.ts`, `specs/separacao-site-app/SPEC.md` (nota de fechamento com a data),
  `README.md` (os passos da P3 feitos). Fica pronta junto com a P2, num ramo próprio, para entrar no mesmo dia. Depende
  de: o passo 14 do dono (o site da P2 no ar). Verifica: CA-1460.

## 2. Matriz: critério → tarefa → teste

| Critério | Tarefa | Teste |
|---|---|---|
| CA-1400, CA-1401 | T23, T29 | `src/site/limpeza.test.ts`; `e2e/site/repasses.spec.ts` |
| CA-1402, CA-1403, CA-1404 | T17, T29 | `src/site/PaginaDoSite.test.tsx`, `MolduraPublica.test.tsx`, `src/seo/vitrine.test.tsx`; `e2e/site/repasses.spec.ts` (CA-1402, CA-1403), `e2e/site/site-publico.spec.ts` (CA-1404) |
| CA-1405 | T19, T29 | `src/seo/prepararPagina.test.tsx`; `e2e/site/repasses.spec.ts` |
| CA-1406 | T16, T18, T29 | `src/seguranca/csp.test.ts`; `e2e/site/repasses.spec.ts` (lê o pacote servido) |
| CA-1407 | T26 | `src/seo/pluginAlvo.test.ts`; conferência manual do dono (passo P2-12) |
| CA-1408 | T18, T27 | `src/seo/arquivosDoSite.test.ts`, `src/seo/cabecalho.test.ts`; testes de SEO movidos para `e2e/site/` |
| CA-1409 a CA-1413, CA-1415 | T20, T29 | `src/App.test.tsx`, `src/AppConta.test.tsx` (CA-1409 a CA-1413); `e2e/servidor-falso/app-separado.spec.ts` (todos) |
| CA-1414 | T21 | `src/ui/fluxoConta.test.ts`, `TelaCriarConta.test.tsx`, `TelaCheckout.test.tsx`, `src/AppConta.test.tsx` |
| CA-1416 | T20, T29 | `e2e/servidor-falso/app-separado.spec.ts` (o endereço do link criado) |
| CA-1417 | T15, T20 | `src/ui/enderecos.test.ts` |
| CA-1418 | T18 | `src/seo/pluginAlvo.test.ts`, `src/seo/arquivosDoSite.test.ts` |
| CA-1419 | T16 | `src/seguranca/pluginCsp.test.ts`; `curl -I` do dono (passo P2-9) |
| CA-1420 | T15 | `src/ui/AvisoMoldura.test.tsx` |
| CA-1421 | T26 | `src/seo/pluginAlvo.test.ts`; os testes do aviso de versão (CA-602) continuam |
| CA-1422 | T29 | `npm run test:csp` (`e2e-csp/csp-terceiros.spec.ts`, no build do app) |
| CA-1423 | T19, T29 | `src/seo/prepararPagina.test.tsx`; `e2e/site/repasses.spec.ts` |
| CA-1424, CA-1425 | T23, T29 | `src/site/limpeza.test.ts`; `e2e/site/repasses.spec.ts` |
| CA-1426 | T23, T25 | `src/site/limpeza.test.ts`, `AvisoIconeAntigo.test.tsx` |
| CA-1427, CA-1428 | T4, T23 | `src/domain/contaEmDia.test.ts`, `src/site/limpeza.test.ts` |
| CA-1429, CA-1430 | T23, T29 | `src/site/TelaContinuar.test.tsx`, `src/site/remetente.test.ts`; `e2e/site/mudanca.spec.ts` |
| CA-1431 | T24, T29 | `src/AppNuvem.test.tsx`; `e2e/site/mudanca.spec.ts` |
| CA-1432 | T22, T23 | `src/domain/mudancaDeEndereco.test.ts`, `src/site/remetente.test.ts` |
| CA-1433 a CA-1435 | T22, T24, T29, R9 | `src/domain/mudancaDeEndereco.test.ts`, `src/ui/mudanca/usarMudanca.test.ts`; `e2e/site/mudanca.spec.ts`, `e2e/site/mudanca-outra-aba.spec.ts` (CA-1434 com outra aba aberta) |
| CA-1436, CA-1437 | T23, T24, T29, R12 | `src/site/remetente.test.ts`, `src/ui/mudanca/usarMudanca.test.ts`, `src/domain/mudancaDeEndereco.test.ts`; `e2e/site/mudanca.spec.ts`, `e2e/site/mudanca-outra-aba.spec.ts` (CB-507) |
| CA-1438 | T22, T23, T24 | `src/domain/mudancaDeEndereco.test.ts`, `src/site/remetente.test.ts`, `usarMudanca.test.ts` |
| CA-1439 | T24 | `src/ui/mudanca/usarMudanca.test.ts` (com o motor de verdade e a nuvem falsa) |
| CA-1440, CA-1441, CA-1443 | T3, T9, T12 | `src/domain/tempoDeSessao.test.ts`, `usarTempoDeSessao.test.tsx`; `e2e/servidor-falso/sessao.spec.ts` |
| CA-1442, CA-1444 | T3, T9, T10, T11 | `tempoDeSessao.test.ts`, `usarTempoDeSessao.test.tsx`, `telasDaSessao.test.tsx`; `sessao.spec.ts` |
| CA-1445 | T5, T9, T12 | `marcaDeUso.test.ts`, `usarTempoDeSessao.test.tsx`; `sessao.spec.ts` |
| CA-1446 | T9 | `usarTempoDeSessao.test.tsx` |
| CA-1447, CA-1448 | T8, T9, T10, T12 | `contextoEnvios.test.tsx`, `usarTempoDeSessao.test.tsx`, `telasDaSessao.test.tsx`; `sessao.spec.ts` |
| CA-1449 | T7, T12 | `src/domain/sincronia.test.ts`; `sessao.spec.ts` |
| CA-1450, CA-1451 | T6, T12 | `src/ui/estado/usarConta.test.ts`; `sessao.spec.ts` |
| CA-1452 | T6, T9 | `usarConta.test.ts` (a saída por tempo pede só `scope: 'local'`) |
| CA-1453 | T6, T12 | `usarConta.test.ts`, `usarSaida.test.tsx`; `sessao.spec.ts` (o `logout` pedido com `scope=local`) |
| CA-1454 | T3 | `tempoDeSessao.test.ts` |
| CA-1455, CA-1456, CA-1457 | T11 | `src/AppConta.test.tsx`, `src/AppNuvem.test.tsx` |
| CA-1458 | T9 | `usarTempoDeSessao.test.tsx` |
| CA-1459, CA-1461 | T2 | `src/data/cobrancaServidor.test.ts`, `servidorLigacao.test.ts`, `servidorExcluirLigacao.test.ts` |
| CA-1460 | T31 | `src/data/cobrancaServidor.test.ts` |
| CA-1462 | T27 | `src/domain/legal.test.ts`, `src/ui/publico/legal.test.tsx` |
| CA-1463 | T20 | `src/ui/estado/usarConta.test.ts` (o endereço de volta sai da origem em que o app está) |
| CB-500 a CB-528 | a tarefa que cita cada um em "Verifica" | os testes dessa tarefa. Sem teste automático: CB-514, CB-515, CB-524 e CB-525 (o dono confere nos passos 12 e 14); CB-521 (D-525, nada a fazer); CB-523 (continua coberto pelos testes do CB-125) |

## 3. Riscos e pontos para revisar

- **R-500 · Todos entram de novo duas vezes:** na P1 (a sessão aberta antes não tem marca de uso e vale a hora da
  entrada, CB-517) e na P2 (endereço novo). O administrador precisa do celular com o app autenticador.
- **R-501 · Ícone instalado:** é preciso instalar de novo. No iPhone, o ícone velho abre numa janela com barra de
  navegador até a pessoa trocar.
- **R-502 · Service worker antigo:** na primeira visita depois da P2, o app velho aparece por segundos (CB-515).
- **R-503 · Certificado do subdomínio:** pode levar horas. Se a zona do Registro.br tiver registro `CAA`, ele precisa
  permitir as autoridades da Cloudflare (`letsencrypt.org`, `pki.goog`, `ssl.com`). O site da P2 só sai com
  `app.metanutri.com.br` *Active*.
- **R-504 · `Cross-Origin-Opener-Policy`:** ligado antes da P3, corta a mudança (D-507).
- **R-505 · Supabase Free:** a sessão encerrada é invalidada no servidor, mas uma cópia do token feita antes continua
  valendo até alguém sair. Só o Pro corta no servidor.
- **R-506 · `amr`:** a documentação diz que o token renovado mantém a hora da entrada. Confirmar no primeiro teste real
  (passo P1-3 do dono); se não mantiver, vale a hora gravada no `SIGNED_IN` (DP-SA-4).
- **R-507 · Tempo do build na Cloudflare:** o plano grátis para o build em 20 minutos. Se o `npm run check` passar
  disso, o comando fica só com a conferência, o `audit` e o build, e o `check` passa a ser obrigatório antes do merge.
- **R-508 · Instalação na Cloudflare:** se ela não instalar as dependências sozinha, o comando vira
  `npm ci && npm run publicar:app`.
- **R-509 · Publicação automática do app:** com a integração, cada mudança na `main` publica o app (ponto do dono 1).
- **R-510 · Duas regras do PWA:** um erro na configuração do site (DP-SA-13) poderia registrar de novo um service worker
  no endereço antigo. O teste do T26 prende a configuração.
- **R-511 · Troca da entrada pelo plugin:** se não pegar no build, vale o plano B do DP-SA-2 (sem dependência nova).
- **R-512 · Safari e a janela:** se algum navegador abrir a aba nova sem `window.opener`, a mudança não acontece e cai
  no CA-1437, sem perda. O teste no WebKit cobre o caso comum.
- **R-513 · Dado esquecido no endereço antigo** de quem nunca volta (D-525, ponto do dono 2). Com o D-527, quem volta
  leva na primeira tentativa de entrar.
- **R-515 · P3 no mesmo dia do site da P2 (D-528):** uma aba do app velho que ficou aberta no endereço antigo, sem
  recarregar, perde o checkout, o cancelamento e a exclusão de conta (as funções recusam o endereço) até recarregar; a
  recarga já leva ao site e ao app. A sincronia não passa pelas funções e continua.
- **R-516 · "Continuar" é a única saída (D-527):** com a janela bloqueada e sem permissão, a pessoa não chega ao app por
  aquele navegador até permitir. O texto da janela bloqueada diz o que fazer (CB-519).
- **R-514 · Versão dos termos:** a P2 muda a Política; a versão é o dia da publicação (procedimento de sempre, T27).

## 4. Passos que só o dono faz

Os valores entre aspas são para copiar. "Terminal" é a pasta do projeto, com a `main` atualizada.

### P1 (depois do merge da P1 na `main`)

1. **Supabase › Organization › Billing:** conferir que o projeto está no Free. No Pro, ver o ponto do dono 3.
2. **Terminal:** publicar as três funções com a lista, **antes** do site:
   ```bash
   npx supabase functions deploy assinar --project-ref qmpljfjbdcrdbqutuvmg
   npx supabase functions deploy gerenciar-assinatura --project-ref qmpljfjbdcrdbqutuvmg
   npx supabase functions deploy excluir-conta --project-ref qmpljfjbdcrdbqutuvmg
   ```
   Conferir (deve aparecer `access-control-allow-origin: https://app.metanutri.com.br` e `vary: Origin`):
   ```bash
   curl -i -X OPTIONS https://qmpljfjbdcrdbqutuvmg.supabase.co/functions/v1/assinar -H "Origin: https://app.metanutri.com.br"
   ```
3. **GitHub › Actions › Publicar no GitHub Pages › Run workflow.** Depois, no site: entrar, ficar 28 minutos parado
   (aparece "Você ainda está aí?") e mais 2 (aparece "Entre de novo"). Depois, usar o site por mais de 1 hora seguida
   (o token se renova a cada hora) e conferir que ele não sai antes da hora: isso confirma o R-506.

### P2 (depois do merge da P2 na `main`; o app primeiro, o site por último)

4. **Cloudflare › Workers & Pages › Create › Pages › Import an existing Git repository (Connect to Git) › GitHub:**
   autorizar o aplicativo da Cloudflare **só** no repositório `matheusrv0/metanutri`.
5. **Na mesma tela (Set up builds and deployments):**
   - Project name: `metanutri-app`
   - Production branch: `main`
   - Framework preset: `None`
   - Build command: `npm run publicar:app`
   - Build output directory: `dist`
   - Root directory: vazio
   - Environment variables (Production), sem `NODE_VERSION`: o `.node-version` do repositório diz a versão (DP-SA-32):
     - `VITE_SUPABASE_URL` = `https://qmpljfjbdcrdbqutuvmg.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = a chave `anon` `public` de *Supabase › Project Settings › API Keys* (a mesma do
       `.env.local`), com *Encrypt*
     - `VITE_MERCADOPAGO_PUBLIC_KEY` = o valor da variável de mesmo nome em *GitHub › Settings › Secrets and variables ›
       Actions › Variables* (a Public Key de produção)
     - `VITE_TURNSTILE_SITE_KEY` = o valor da variável de mesmo nome, na mesma tela do GitHub

   *Save and Deploy*, e esperar o build ficar verde. Em `https://metanutri-app.pages.dev` o Turnstile e as funções não
   funcionam: é o esperado (CB-525).
6. **Projeto `metanutri-app` › Settings › Builds › Branch control:** Production branch `main`; *Automatic production
   branch deployments* ligado (ponto do dono 1); *Preview branch*: `None`.
7. **Projeto `metanutri-app` › Custom domains › Set up a custom domain:** `app.metanutri.com.br` › *Continue* ›
   *Begin CNAME setup*. A Cloudflare mostra o alvo `metanutri-app.pages.dev`. Isto vem **antes** do DNS.
8. **Registro.br › metanutri.com.br › DNS › Editar zona › Nova entrada:** tipo `CNAME`, nome `app`, dados
   `metanutri-app.pages.dev` › *Salvar*. Esperar o domínio ficar *Active* na Cloudflare (minutos a horas; R-503).
9. **Conferir os cabeçalhos** (CA-1419):
   ```bash
   curl -sI https://app.metanutri.com.br/ | grep -iE "content-security-policy|x-content-type|referrer-policy|strict-transport|x-robots|cross-origin-opener"
   ```
   Devem aparecer os cinco primeiros e **não** o `cross-origin-opener-policy`.
10. **Cloudflare › (página inicial da conta) › Bulk Redirects › Create Bulk Redirect List:** nome
    `metanutri_pages_dev`, tipo *Redirect*; item: Source URL `metanutri-app.pages.dev`, Target URL
    `https://app.metanutri.com.br`, Status `301`, marcar *Preserve query string*, *Include subdomains*,
    *Subpath matching* e *Preserve path suffix*. Depois *Create Bulk Redirect Rule* com essa lista (nome
    `metanutri-pages-dev`) › *Save and Deploy*.
11. **Supabase › Authentication › URL Configuration › Redirect URLs › Add URL:** `https://app.metanutri.com.br/**`.
    Ficam também `https://metanutri.com.br/**`, `https://matheusrv0.github.io/metanutri/**` e
    `http://localhost:5173/**` (até a P3).
12. **Turnstile › widget MetaNutri › Settings › Hostname Management:** conferir `metanutri.com.br`, `localhost` e
    `127.0.0.1`. Nada a acrescentar: o domínio cobre `app.`. Só se o teste abaixo mostrar "A verificação de segurança
    não carregou", acrescentar `app.metanutri.com.br` (CB-524). Não acrescentar `metanutri-app.pages.dev`.

    **Testar em `https://app.metanutri.com.br`:** criar uma conta de teste (com a verificação) e confirmar pelo código;
    entrar; administrador abre Aprovações e digita o código do app; checkout até os campos do cartão aparecerem, sem
    erro de CSP no console (F12); criar um link de paciente e abrir no celular; "Sair"; o aviso dos 28 minutos.
13. **Supabase › Authentication › URL Configuration › Site URL:** `https://app.metanutri.com.br/`. **Terminal:**
    ```bash
    npx supabase secrets set SITE_URL=https://app.metanutri.com.br/ --project-ref qmpljfjbdcrdbqutuvmg
    npx supabase functions deploy assinar --project-ref qmpljfjbdcrdbqutuvmg
    ```
14. **GitHub › Actions › Publicar no GitHub Pages › Run workflow** (o site). Depois, conferir: `metanutri.com.br`
    abre a landing; "Entrar" leva ao app; um link de paciente antigo (`metanutri.com.br/#/missoes/<token>`) abre a
    tela do paciente no app; `metanutri.com.br/#/painel` leva ao app; num navegador que já usava o MetaNutri, a
    primeira visita recarrega uma vez e depois mostra o site (CB-515). **Logo em seguida, no mesmo dia, a P3 (passos
    18 e 19).**
15. **Mercado Pago › Suas integrações › aplicação MetaNutri › Webhooks:** conferir, sem mudar, a URL de produção
    `https://qmpljfjbdcrdbqutuvmg.supabase.co/functions/v1/webhook-mercadopago` e os eventos de assinaturas
    (`subscription_preapproval`, `subscription_authorized_payment`) e de pagamentos. O `back_url` vem do `SITE_URL`
    (passo 13); não há campo no painel para ele. A primeira compra real (pendente desde 21/10) já é feita no app novo.
16. **Recomendado: GitHub › Settings (da conta) › Pages › Verified domains › Add a domain:** `metanutri.com.br`. O
    GitHub mostra um registro TXT (nome `_github-pages-challenge-matheusrv0`, valor = o código mostrado); criar no
    Registro.br (nova entrada, tipo `TXT`) e clicar em *Verify*. Protege os subdomínios contra uso por outra conta do
    GitHub.
17. **Avisar quem já usa:** "O MetaNutri mudou para app.metanutri.com.br. Entre de novo e, se usa o ícone no celular
    ou no computador, instale de novo."

### P3 (logo depois do passo 14, no mesmo dia; D-528)

18. Merge da P3 na `main` (o ramo `separacao-p3`, pronto junto com a P2); **Terminal:** as três funções do passo 2 de
    novo (agora só com o app).
19. **Supabase › Authentication › URL Configuration › Redirect URLs:** tirar `https://metanutri.com.br/**` e
    `https://matheusrv0.github.io/metanutri/**`.

## 5. Pontos que só o dono decide

1. **Publicação automática do app** a cada mudança na `main` (passo 6). Recomendo ligada, com as prévias desligadas: o
   merge vira a publicação, e o app sempre sai antes do site. A alternativa é desligar e publicar à mão no painel da
   Cloudflare.
2. **Prazo para apagar o dado esquecido no endereço antigo** (D-525). Recomendo nenhum agora e rever 90 dias depois do
   site da P2, olhando se ainda há gente com "Continuar".
3. **Supabase Pro** (corte da sessão no servidor: *time-box* de 13 h e inatividade de 2 h). Recomendo quando a receita
   cobrir; até lá, o app faz a parte dele.
4. **Duas decisões tomadas nesta spec, fáceis de voltar atrás:** o "Sair" encerra só a sessão deste navegador (D-520)
   e a Política passa a citar também o GitHub, que entrega o site (D-522).
5. ~~**As oito telas que faltam no protótipo** (SPEC, seção 6), antes de publicar a P1 (telas 1 a 4) e a P2 (5 a 8).~~
   Aprovadas em 27/10/2026, com os textos do D-526.
