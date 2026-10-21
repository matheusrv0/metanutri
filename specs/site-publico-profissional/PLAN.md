# PLAN — Site público profissional

Spec: `specs/site-publico-profissional/SPEC.md`. Cada tarefa é um commit, em TDD (teste primeiro, ver falhar, depois o
código). Nenhuma dependência nova: `react-dom/server`, a API do Vite e o Playwright já estão no projeto.

## Ordem

| # | Tarefa | Arquivos | Critérios | Depende de |
|---|---|---|---|---|
| T1 | SPEC e PLAN | `specs/site-publico-profissional/SPEC.md`, `PLAN.md` | — | — |
| T2 | **Guarda dos textos proibidos e a moldura pública**: o teste de varredura; o menu em caixa normal com "Recursos"; o rodapé novo; a recarga das telas de vitrine quando chega versão nova; os Termos sem "não foram conferidos" e a versão `2026-10-21`; a seção "Referências dos cálculos" em Fontes | `src/seo/textosProibidos.test.ts` (novo), `src/ui/publico/MolduraPublica.tsx` e `.test.tsx`, `src/ui/publico/TelaTermos.tsx`, `src/ui/publico/TelaFontes.tsx` e `.test.tsx`, `src/domain/legal.ts` e o teste da versão, `src/ui/publico/legal.test.tsx` | CA-990 a CA-996 | T1 |
| T3 | **Preços**: nota do Estudante que empilha no celular; sem animação de entrada; preço em texto; `Button` no lugar do `OriginButton` | `src/ui/publico/SecaoPrecos.tsx` e `.test.tsx`, `src/ui/limpezaVisual.test.tsx` (os dublês que deixam de ser necessários) | CA-997 a CA-999 | T1 |
| T4 | **Landing**: nova ordem e textos, números e preços do domínio, cartões que levam a Como funciona e a Fontes | `src/ui/publico/TelaInicio.tsx` e `.test.tsx`, `src/App.tsx` (a ação "Ver fontes" e "Recursos"), `e2e/publico.spec.ts` (CA-116a passa a abrir Fontes) | CA-1000 a CA-1008 | T2 (âncoras do menu) |
| T5 | **Cabeçalho, dados estruturados e arquivos de busca**: `src/seo/paginas.ts` (as cinco páginas: endereço, rota, título e descrição, montados de `PLANOS`), `src/seo/cabecalho.ts` (as tags e o JSON-LD), o `index.html` com título, descrição, canônico, Open Graph, Twitter e o script do `<head>`; `public/robots.txt`, `public/sitemap.xml`, `public/llms.txt`; a imagem de compartilhar e o script que a gera; o CA-485 aceitando só `application/ld+json` | `src/seo/paginas.ts`, `src/seo/cabecalho.ts`, `src/seo/*.test.ts`, `index.html`, `public/robots.txt`, `public/sitemap.xml`, `public/llms.txt`, `public/imagem-compartilhar.png`, `scripts/imagem-de-compartilhar.mjs`, `e2e/csp.spec.ts`, `e2e-csp/csp-terceiros.spec.ts` (se tiver a mesma regra) | CA-1009 a CA-1012, CA-1018, CA-1019 | T1 |
| T6 | **Pré-renderização e o primeiro quadro**: o plugin do build (`src/seo/pluginSeo.ts`) que injeta o JSON-LD e o pré-carregamento da fonte, desenha a landing no `#root` e escreve `/precos/`, `/termos/`, `/privacidade/` e `/fontes/`; `src/seo/vitrine.tsx` (o que o servidor desenha); `public/preparar-pagina.js` (tema e vitrine antes do primeiro quadro) e a regra `.sem-vitrine`; o `main.tsx` levando `/precos/` para `/#/precos`; a foto do topo com prioridade alta | `src/seo/pluginSeo.ts` e `.test.ts`, `src/seo/vitrine.tsx`, `src/seo/rotaDaPagina.ts` e `.test.ts`, `public/preparar-pagina.js`, `src/ui/tema/globals.css`, `src/main.tsx`, `vite.config.ts`, `src/ui/publico/TelaInicio.tsx` | CA-1013 a CA-1017, CA-1020, CA-1021 | T4, T5 |
| T7 | **Testes de navegador**: landing, Preços e rodapé em 390 e 1280, claro e escuro; tags no `dist/index.html`; landing pré-desenhada; páginas próprias abrindo o app; link do paciente sem a vitrine; tema escuro antes do app | `e2e/site-publico.spec.ts` (novo) | CA-1002, CA-1009, CA-1013 a CA-1017, CA-1020 a CA-1022 | T2 a T6 |
| T8 | Validação: `npm run check`, `npx playwright test`, `npm run build`, `npm run test:csp`, `node scripts/conferir-publicacao.mjs`; prints de depois; relatório | — | todos | T7 |

### O que mudou no caminho (registrado antes de cada commit)

- **T2** também mexeu em `e2e/servidor-falso/revisao.spec.ts`: o CA-740 conferia a lista "Fontes dos dados" do rodapé, que
  saiu (passa a conferir o rodapé só com links, CA-992), e o CA-741 conta 8 links e o do e-mail.
- **Rodada de prints (depois da T6, commit próprio):** os links do rodapé ficaram todos com 44 px em qualquer largura (o
  "Fontes da base" já era, M-1; com alturas diferentes, os vãos ficavam desiguais); os cartões de Estudante e Pro em
  "Quanto custa" passaram a branco (o cinza sumia sobre a mesa no tema claro); a foto do topo foi a 600 px, para o
  título e "Começar grátis" caberem em 1280 × 720 (CA-1002). A SPEC ganhou o CB-324 reescrito e o R-324.
- **T7** também mexeu em `e2e/csp.spec.ts` (o CA-486/CA-603 contava todo `<script>` sem `src`; o JSON-LD é a exceção do
  CA-1012), em `src/seo/montarPagina.ts` (a vitrine sai `inert`: até o app montar, os botões pré-desenhados não recebem
  toque nem foco, e o teste não clica num botão que ainda não funciona) e no `DESIGN.md` (a regra da área pública sem
  enfeite, na seção do estilo Spora).

## Riscos e decisões para o dono revisar

- **Sem hidratação (D-331).** O React desenha de novo por cima do conteúdo pré-desenhado. É o mesmo desenho, então não
  pisca; o custo é desenhar duas vezes no primeiro carregamento (milissegundos). Hidratar exigiria que o servidor
  soubesse a rota, o tema e a sessão: erro de "mismatch" garantido em algum caso.
- **Script no `<head>` (D-332).** É um arquivo do próprio site, com ~1 KB, carregado antes de desenhar. Ele lê o
  `localStorage` com a mesma chave do tema do app (`metanutri:tema`) e o nome da sessão do Supabase (`sb-…-auth-token`);
  um teste confere a chave do tema contra `CHAVE_TEMA`.
- **Páginas próprias (D-331).** Cada uma é uma cópia do `index.html` final com o conteúdo da tela, o que garante a
  mesma CSP, o mesmo pacote e o mesmo service worker. `<base href="../">` faz os arquivos resolverem na raiz.
- **CA-485 (D-330).** A regra "nenhum script sem `src`" ganha uma exceção, só para `type="application/ld+json"`, que o
  navegador não executa.
