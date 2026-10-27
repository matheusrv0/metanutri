# PLAN — Landing escura

Spec: `specs/landing-escura/SPEC.md`. Cada tarefa é um commit (Conventional Commits, em português), em TDD onde há
lógica (o campo vivo, as chaves, a barra do topo, os números do motor): teste primeiro, ver falhar, depois o código.
Nenhuma dependência nova: as fotos são convertidas com o Pillow que já está na máquina, fora do projeto.

## Ordem

| # | Tarefa | Arquivos | Critérios | Depende de |
|---|---|---|---|---|
| T1 | SPEC e PLAN | `specs/landing-escura/SPEC.md`, `PLAN.md` | — | — |
| T2 | **Tokens do escuro da marca**: primitivas `--carvao-*` e `--teal-950`; o escopo `.landing-escura` com os semânticos `--landing-*` (cores, tamanhos de letra e margem); as cores no `@theme` do Tailwind; as animações (`sobe`, `deriva`, `piscar`); a seção "Landing escura" no `DESIGN.md` | `design-system/tokens/tokens.css`, `src/ui/tema/globals.css`, `DESIGN.md` | CA-1451 | T1 |
| T3 | **Fotos**: as três em webp (1.600 e 800 px) e o registro de licença | `public/imagens/legumes-na-bancada*.webp`, `dois-copos-de-leite*.webp`, `salada-com-frango*.webp`, `THIRD_PARTY_NOTICES.md` | CA-1476 (arquivos) | T1 |
| T4 | **Números da landing** (TDD): as constantes do campo vivo, da adequação, do Cobrir de cálcio, da tabela da cozinha e dos efeitos das chaves, e o teste que roda o motor e a base; o texto dos alimentos próprios pela chave `MEUS_ALIMENTOS_NOVOS` | `src/ui/publico/inicio/exemploDaLanding.ts` e `.test.ts` | CA-1467 a CA-1469, CA-1472, CA-1473 | T1 |
| T5 | **Lógica do campo vivo e da barra** (TDD): `chaveDaPergunta` (texto → cálcio, vitamina E, vitamina D ou nada); a tinta da barra pela seção embaixo dela e quando ela some | `src/ui/publico/inicio/perguntaDaVitrine.ts` e `.test.ts`, `src/ui/publico/inicio/barraDoTopo.ts` e `.test.ts` | CA-1463, CA-1465, CA-1459, CA-1460 | T1 |
| T6 | **Seções da landing**: o topo, o campo vivo, as chaves, a foto, Como funciona, a cozinha, Quanto custa, as perguntas e a faixa final, um componente por arquivo; a entrada das partes ao rolar (`useEntradaAoRolar`); `TelaInicio` junta tudo e recebe `aoEscolher` | `src/ui/publico/inicio/*.tsx` (novos), `src/ui/publico/inicio/useEntradaAoRolar.ts`, `src/ui/publico/TelaInicio.tsx` e `.test.tsx` | CA-1454, CA-1455, CA-1462 a CA-1466, CA-1470, CA-1471, CA-1474 a CA-1481, CA-1486, CA-1487, CA-1490 | T2 a T5 |
| T7 | **Barra e rodapé da landing na moldura**: `BarraDaLanding` e `RodapeDaLanding`; a `MolduraPublica` usa os dois (e a raiz `.landing-escura dark`) quando a tela é a inicial; o `App` e a vitrine do build passam `aoEscolher`; "Referências" no rodapé de todas as telas públicas, no título da página e no `<title>` | `src/ui/publico/inicio/BarraDaLanding.tsx`, `RodapeDaLanding.tsx`, `src/ui/publico/MolduraPublica.tsx` e `.test.tsx`, `src/App.tsx`, `src/seo/vitrine.tsx` e `.test.tsx`, `src/ui/publico/TelaFontes.tsx` e `.test.tsx`, `src/seo/paginas.ts` e o teste dele, `public/llms.txt`, `src/App.test.tsx`, `src/AppConta.test.tsx` | CA-1450, CA-1457 a CA-1461, CA-1483, CA-1484 | T6 |
| T8 | **Guarda dos nomes das fontes** (CA-990 ampliada) e a varredura de termos da frente olhando a pasta nova | `src/seo/textosProibidos.test.ts`, `src/textosDaFrente.test.ts`, `src/ui/limpezaVisual.test.tsx` | CA-1482 | T7 |
| T9 | **Limpeza**: saem as capturas, a foto e os roteiros antigos e o pré-carregamento da foto; os testes que os citavam | `public/imagens/cobrir-*.png`, `missoes-*.png`, `pratos-heroi*.webp`, `scripts/capturas-landing.mjs`, `scripts/pratos_heroi.py`, `public/preparar-pagina.js`, `src/seo/prepararPagina.test.tsx`, `THIRD_PARTY_NOTICES.md` | CA-1485, CA-1491 | T7 |
| T10 | **Testes de navegador**: os que olhavam a landing antiga passam a olhar a nova; o e2e novo da landing escura (tema claro, primeira tela, campo vivo, chaves, barra, 390 px, 44 px, teclado, menos movimento, pré-desenhada, sem Google Fonts) | `e2e/landing-escura.spec.ts` (novo), `e2e/site-publico.spec.ts`, `e2e/publico.spec.ts`, `e2e/textos-e-promessas.spec.ts`, `e2e/conta.spec.ts`, `e2e/servidor-falso/*.spec.ts` (os que citam a landing) | CA-1450, CA-1452, CA-1453, CA-1456, CA-1459, CA-1484, CA-1486 a CA-1490 | T6 a T9 |
| T11 | **Validação**: `npm run check`, `npx playwright test` (configuração temporária com portas próprias, apagada depois), `npm run test:csp`, `npm run build`; o inspetor da skill no `vite preview` em 1440, 768 e 390; capturas em 1440 e 390; ajustes que as capturas pedirem (commit próprio); relatório | — | todos | T10 |

## Riscos e decisões para o dono revisar

- **D-532 (hover da faixa final).** O protótipo pintava a faixa de laranja com texto por cima; isso fere a regra do
  laranja. No código, o hover é branco com a seta laranja. Se o dono preferir outro hover, é uma linha.
- **D-538 (sai "Cabem mais 495 kcal").** O motor dá 15 kcal para o exemplo. Mostrar "15 kcal" seria verdade, mas faria
  o exemplo parecer um plano sem espaço; a frase saiu. Se o dono quiser o número de volta, o caminho certo é mexer no
  plano de exemplo (o que muda o app), não na landing.
- **D-540 (alimento próprio).** O texto do protótipo só vale com a publicação 2. Até lá, a landing fala em rótulo e
  código de barras. Quando a publicação 2 ligar `MEUS_ALIMENTOS_NOVOS`, o texto troca sozinho.
- **D-541 (perguntas).** Três respostas do protótipo prometiam o que a `main` não faz; foram ajustadas. A da sessão de
  30 minutos volta quando a separação site × app for publicada.
- **D-545 (barra que some).** Vem do rascunho medido (`index2.html`), não do canvas. Se o dono preferir a barra parada no
  alto, como no canvas, é tirar o efeito de rolagem.
- **Constantes em vez de motor ao vivo (D-537).** A landing não carrega a base nem o motor; a separação site × app vai
  querer a vitrine leve. O teste CA-1467 é a garantia.
