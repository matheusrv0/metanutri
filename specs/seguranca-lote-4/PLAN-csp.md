# Segurança, lote 4 · Plano da regra de conteúdo (CSP)

**Spec:** `specs/seguranca-lote-4/SPEC.md`, parte da CSP: D-135, CA-485, CA-486 e CB-128. Os testes de ataque (D-136)
e os pacotes (D-137) têm plano próprio.

**Objetivo:** o `index.html` do build ganha uma `<meta http-equiv="Content-Security-Policy">` que deixa rodar só o que
o site usa e bloqueia o resto: nada de script escrito dentro da página, nada de `eval`, nada de script de terceiro
fora o Mercado Pago (campos do cartão) e o Cloudflare (verificação contra robôs).

**Arquitetura:** a regra vive num lugar só, `src/seguranca/csp.ts`, com o motivo de cada origem ao lado. Um plugin do
Vite (`src/seguranca/pluginCsp.ts`, `apply: 'build'`) põe a `<meta>` logo depois do `<meta charset>`, antes de
qualquer script, só no build: o `npm run dev` e o recarregamento do Vite ficam como estão.

## Inventário (levantado em 14/10/2026, Chromium sem CSP, depois com a regra)

| O que | De onde | Diretiva |
|---|---|---|
| Pacote do site, CSS, fontes (`@fontsource`), imagens da landing, `registerSW.js` | o próprio site | `'self'` |
| Service worker (`sw.js`) e manifest do PWA | o próprio site | `worker-src`, `manifest-src` |
| Logo do perfil (vira `data:` no `FileReader`) | `data:` | `img-src` |
| Banco, login, armazenamento dos comprovantes e funções de cobrança | origem do Supabase do build | `connect-src` |
| SDK do pagamento (`/js/v2`) | `https://sdk.mercadopago.com` | `script-src` |
| Bandeira pelo BIN e registro do aparelho (`/v1/payment_methods`, `/v1/devices/widgets`) | `https://api.mercadopago.com` | `connect-src` |
| Os três campos do cartão (iframes) e uma consulta do SDK | `https://secure-fields.mercadopago.com` | `frame-src`, `connect-src` |
| Servidor reserva dos campos do cartão (o `sourceUrl` do SDK) | `https://api-static.mercadopago.com` | `frame-src`, `child-src`, `connect-src` |
| Antifraude do pagamento: consulta `etid` e pixel | `https://www.mercadolibre.com` | `connect-src`, `img-src` |
| Antifraude do pagamento: pixel do Brasil | `https://www.mercadolivre.com` | `img-src` |
| Antifraude do pagamento no domínio de produção (`.com.br`): pixel e a variante por `fetch` | `https://www.mercadopago.com.br` | `img-src`, `connect-src` |
| Métricas do SDK (`/tracks`) | `https://api.mercadolibre.com` | `connect-src` |
| Script do antifraude, escrito na página pelo SDK | `'nonce-…'` (DP-CSP-3) | `script-src` |
| Verificação contra robôs: script e iframe | `https://challenges.cloudflare.com` | `script-src`, `frame-src` |
| Rótulo pelo código de barras | `https://world.openfoodfacts.org` | `connect-src` (DP-CSP-2) |
| Estilo inline do React, Radix, motion, SDK e Turnstile | `'unsafe-inline'` | só `style-src` |

Fora da regra, de propósito: o `card_tokens` e a fonte Manrope dos campos (pedidos de dentro do iframe do Mercado
Pago, que segue a regra dele); o comprovante aberto pelo painel do dono (abre em aba nova, é navegação); o download
do Word (link `blob:` com `download`, é navegação). Realtime do Supabase não é usado: sem `wss:`.

Achado da revisão: o script do antifraude escolhe o host pelo domínio da página. Em `metanutri.com.br` ele usa
`www.mercadopago.com.br`; em `localhost`, `www.mercadolivre.com`. Por isso a bancada passou a abrir como
`https://metanutri.com.br/` (DP-CSP-7). O script também troca de variante entre visitas (`fingerprint/high` por
`fetch`, `fingerprint/medium` por imagem), então o `npm run test:csp` roda mais de uma vez antes de publicar.

## Decisões do plano (para o dono revisar)

- **DP-CSP-1 · A origem do Supabase sai do build.** O plugin lê o mesmo `VITE_SUPABASE_URL` que vai para o pacote; só
  vale `https:`. No GitHub Actions ele é a variável do repositório, então o site no ar libera
  `https://qmpljfjbdcrdbqutuvmg.supabase.co`. Trocar de projeto no Supabase não exige mexer na regra. Sem a variável
  (testes, ou `desligado`), o site não tem nuvem e a regra não libera Supabase nenhum.
- **DP-CSP-2 · Open Food Facts fica liberado em `connect-src`.** A tela de produto busca o rótulo pelo código de
  barras direto do navegador (`src/domain/codigoBarras.ts`); bloquear quebraria essa busca. O D-135 foi emendado na
  revisão e cita a Open Food Facts.
- **DP-CSP-3 · O antifraude do Mercado Pago roda com um nonce fixo.** O SDK v2 pede a `/v1/devices/widgets` um script
  de impressão digital do aparelho e o escreve dentro da página (inline). O conteúdo muda a cada visita (conferido:
  duas respostas diferentes), então um hash não serve. O SDK aceita `deviceProfileCspNonce`; o site passa o nonce que
  está na regra (`NONCE_DO_ANTIFRAUDE`). Sem isso o antifraude é bloqueado: o cartão funciona, mas o código do cartão
  sai sem o aparelho, o que a operadora usa para aprovar (e a homologação dela confere).
  **Risco:** num site estático o nonce é público e fixo. Ele não libera atributo de evento (`onerror=`), nem
  `javascript:`, nem script de outro domínio, nem `eval`; só libera um `<script nonce="…">` inteiro, e isso exige
  alguém já conseguir pôr HTML cru na página, coisa que o React não faz (nenhum `dangerouslySetInnerHTML` no
  código). **Alternativa:** `advancedFraudPrevention: false` no SDK: a regra fica sem nonce e sem os hosts do Mercado
  Livre, e o antifraude por aparelho some. O D-135 e o CA-485 foram emendados na revisão com esta exceção, e uma regra do
  ESLint (DP-CSP-8) barra os caminhos de HTML cru em `src/` e `design-system/`, para a suposição não quebrar calada.
- **DP-CSP-4 · Fonte não vira `data:`.** O Vite embutia como `data:` uma fatia da Manrope menor que 4 KB. O build
  passa a manter toda `.woff2` como arquivo (`build.assetsInlineLimit`), e `font-src` fica só `'self'`.
- **DP-CSP-5 · `child-src` de reserva (CB-128).** Navegador que não entende `frame-src` ou `worker-src` cai no
  `child-src`; ele repete as duas molduras e `'self'`. Navegador que não entende `manifest-src` cai no
  `default-src 'self'`. Nada de diretiva que a `<meta>` ignora (`frame-ancestors`, `report-uri`, `sandbox`).
- **DP-CSP-6 · Origens exatas, sem curinga** (`*.mercadopago.com`). Se o Mercado Pago ou o Cloudflare mudarem de
  endereço, o `npm run test:csp` acusa; ele usa os scripts de verdade e deve rodar antes de publicar quando um dos dois
  mudar algo.
- **DP-CSP-7 · A bancada abre como o site no ar.** O teste dos campos do cartão serve o build da bancada em
  `https://metanutri.com.br/` (interceptado pelo Playwright, nada sai para o domínio de verdade), para pegar os caminhos
  que o antifraude só usa no domínio de produção.
- **DP-CSP-8 · Sem HTML cru no código.** O ESLint (regras que já existem, `no-restricted-properties` e
  `no-restricted-syntax`, sem plugin novo) barra `innerHTML`, `outerHTML`, `insertAdjacentHTML`,
  `createContextualFragment`, `document.write`, `srcdoc` e `dangerouslySetInnerHTML` em `src/` e `design-system/`; os
  testes ficam de fora.

## Tarefas (em ordem; cada uma commitável)

1. **A regra num lugar só.** `src/seguranca/csp.ts` + `csp.test.ts`: as diretivas, o texto, a origem do Supabase, o
   nonce; testes CA-485 (texto exato, script sem `'unsafe-inline'`/`'unsafe-eval'`, só as origens do inventário) e
   CB-128 (cada diretiva que um navegador ignorar cai numa reserva que ainda libera o necessário).
2. **O plugin.** `src/seguranca/pluginCsp.ts` + `pluginCsp.test.ts` (Vitest em ambiente Node, com um build de verdade
   do Vite numa pasta temporária): a `<meta>` entra logo depois do charset no build e não entra no `dev`;
   `vite.config.ts` liga o plugin e para de embutir fontes (DP-CSP-4).
3. **O antifraude com o nonce.** `processadorMercadoPago.ts` passa `deviceProfileCspNonce` (DP-CSP-3) + teste.
4. **CA-486 no Playwright de sempre.** `e2e/csp.spec.ts`, contra o build servido pelo `vite preview`: rotas públicas,
   Entrar, confirmação por código, checkout sem nuvem, link do paciente, impressão, Word, logo do perfil e PWA, sem
   nenhuma violação; e a prova de que a regra bloqueia script inline, script de outro domínio e `eval`.
5. **CA-486 com os scripts de verdade.** `npm run test:csp` (`playwright.csp.config.ts`, fora do `npx playwright
   test`, porque baixa scripts de terceiros pela rede): o site montado com a chave de teste do Turnstile
   (`1x00000000000000000000AA`) e a bancada `e2e-csp/bancada/` com os campos reais do Mercado Pago na chave pública de
   teste, gerando o código de um cartão de teste. Mesma `<meta>` (mesmo plugin, mesmo ambiente). Zero violações.

**Rodada da revisão (14/10/2026):**

6. **SPEC emendada primeiro:** D-135 e CA-485 citam o antifraude, a Open Food Facts e a exceção do nonce.
7. **Hosts que faltavam:** `www.mercadopago.com.br` (`img-src`, `connect-src`) e `api-static.mercadopago.com`
   (`connect-src`, `frame-src`, `child-src`); `csp.test.ts` acompanha.
8. **Bancada no domínio de produção** (DP-CSP-7), rodada várias vezes.
9. **ESLint sem HTML cru** (DP-CSP-8), em `eslint.config.js`.

Arquivos: `src/seguranca/{csp,csp.test,pluginCsp,pluginCsp.test}.ts`, `vite.config.ts`, `eslint.config.js`,
`src/ui/pagamento/processadorMercadoPago{,.test}.ts`, `e2e/csp.spec.ts`, `playwright.csp.config.ts`,
`e2e-csp/{vite.config.ts,csp-terceiros.spec.ts,bancada/index.html,bancada/principal.ts}`, `package.json` (script
`test:csp`), `tsconfig.app.json` e `tsconfig.node.json` (a bancada entra no `tsc`).

## Riscos

- **R-CSP-1:** o SDK do Mercado Pago (`/js/v2`, sem versão fixa) muda e passa a pedir outro host: o pedaço novo é
  bloqueado. Os campos e a bandeira usam hosts estáveis; o que mais muda é o antifraude. Rodar `npm run test:csp`.
- **R-CSP-2:** build local de produção apontando para um Supabase `http://` (local) fica sem conexão; o `dev` não tem
  regra e segue funcionando.
- **R-CSP-3:** logo de perfil salva como endereço `https://` de fora deixa de aparecer (fecha um achado antigo);
  logo enviada pelo site é `data:` e continua.
