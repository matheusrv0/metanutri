# PLAN — A marca da nutricionista no link do paciente

**Spec de origem:** `./SPEC.md` (D-950 a D-963, CA-1950 a CA-1981, CB-950 a CB-963)
**Protótipo aprovado:** `MarcaNoLink.dc.html` (canvas "MetaNutri Redesenho", 29/10/2026).
**Status:** o dono aprovou o protótipo e a SPEC em 29/10/2026 ("use skills para deixar mais profissional ainda e mantendo
esse mesmo padrão"). Regra do dono: "apenas faça"; as decisões deste plano estão registradas abaixo (DP-ML-1 em diante).
Concluído em 03/11/2026, no ramo `marca-no-link`, rebaseado sobre a `main` (67fb5a4). Falta o dono rodar o
`supabase/015-marca-no-link.sql` **antes** de publicar o site (R-ML-1).

**Validação (03/11/2026):** `npm run check` (lint, tipos e 6229 testes em 332 arquivos), `npm run e2e` (479 testes; os
específicos da marca, 23, todos verdes; 5 de outras funções caíram na rodada cheia por carga e porta ocupada por outro
agente e passaram de novo sozinhos), `npm run test:csp` (3) e `npm run test:seguranca` (227, com o 015 aplicado no
Supabase local), tudo verde. Prints em 360, 390 e 1440 px nos dois temas e o pior caso (`break-ui`) em
`scratchpad/marca-no-link/prints/`.

## Abordagem

**Onde a marca mora.** A logo e a cor ficam em dois lugares (D-952):

1. no **perfil** (`metanutri:perfil`), como a logo já fica hoje, agora com `cor` e `marcaPublicada`. O perfil sobe com a
   cópia da conta e é de onde o plano impresso lê a logo (D-960, CA-1978);
2. numa **marca publicada**, uma tabela nova `marcas` (uma linha por conta), que o link do paciente lê junto com as
   missões, pela mesma função de sempre (`missoes_por_token`), sem o id da conta (CA-1974).

Não deu para evitar SQL (DP-ML-1): o perfil só existe dentro da cópia da conta, que o paciente não pode ler, e copiar a
logo para dentro de cada link encheria cada linha e não teria nem as travas do CA-1975 nem a exclusão do CA-1976.

**O caminho da logo.** O arquivo escolhido (PNG, JPG, WebP ou SVG, até 2 MB) é aberto como imagem no navegador e
redesenhado num `<canvas>` como PNG de até 600 px no lado maior; se passar de 150 KB, de novo em 480, 360 e 240 px; se
nem em 240 couber, "Use uma logo mais simples." (D-951). O SVG vira PNG nessa mesma passagem: dentro de `<img>` o
navegador desenha SVG sem script, sem evento e sem recurso de fora, e o texto do SVG nunca é guardado (CA-1955). A
regra (tipos, tamanhos, reduções, a logo clara) é do domínio e é testada com um desenhista falso; o desenho de verdade
fica num arquivo da interface, testado no navegador (Playwright).

**O caminho da cor.** O contraste e as duas cores derivadas (a sugestão mais escura e a versão do escuro) são funções
puras do domínio, com a mesma conta do protótipo (D-954, D-955). No link, a cor chega por variáveis de CSS na raiz da
tela (`--marca-claro` e `--marca-escuro`), e os tokens novos `--link-acao` e `--link-acao-texto` escolhem uma ou outra
pelo tema. Sem cor, os mesmos tokens valem o teal e o marfim de hoje: o link sem marca é o de hoje (CA-1968).

**A prévia é o link de verdade.** A tela do paciente é dividida: a parte que busca e marca (`TelaMissoesPaciente`) e a
parte que desenha (`LinkDoPaciente`, com o topo, as abas, as missões e o rodapé). A prévia de "Sua marca" desenha a
mesma `LinkDoPaciente`, com uma paciente de exemplo, num celular claro e num escuro. O que o paciente vê e o que a
nutricionista vê na prévia saem do mesmo código.

## Decisões do plano

- **DP-ML-1** · **Banco: tabela `marcas`** (`nutricionista_id` como chave, `references auth.users on delete cascade`,
  `logo`, `cor`, `atualizado_em`), RLS só do dono (ler, criar, mudar, apagar) e nenhuma política para `anon`. A função do
  link ganha `marca_logo` e `marca_cor` no fim, por `left join` com `marcas` pelo dono do link; a junção é por dentro da
  função, e o dono nunca sai (CA-1974). Não existe função nem política que liste marcas.
- **DP-ML-2** · **Os tetos no servidor** (CA-1975, D-107). Logo: 150 KB = 153.600 bytes de PNG, que em data URI dão até
  204.822 caracteres; o banco confere o prefixo `data:image/png;base64,iVBORw0KGgo` (a assinatura do PNG), que o resto é
  só base64 e o comprimento. Cor: `^#[0-9a-f]{6}$` (o app grava minúscula). As travas têm nome
  (`marcas_logo_png`, `marcas_cor_formato`) e entram em `TRAVAS_DE_TAMANHO` com a frase da tela.
- **DP-ML-3** · **SVG**: aceito no envio e convertido em PNG no navegador (decisão pedida: converter, não recusar). O
  texto do SVG é lido antes só para recusar o que pede recurso de fora (`http:`, `https:`, `//`, `@import`) com "Não
  foi possível ler esta imagem. Tente PNG ou JPG." (CB-952): desenhado sem o recurso, ele sairia diferente do que ela
  vê no programa de desenho. O SVG nunca é guardado, nem no perfil nem na nuvem.
- **DP-ML-4** · **Envio**: até 2 MB = 2 × 1024 × 1024 bytes. O tipo vem do MIME do arquivo; quando o navegador não diz,
  da extensão. GIF, HEIC, PDF e o resto: "Use PNG, JPG, WebP ou SVG, até 2 MB." (CA-1953). Reduções em 600, 480, 360 e
  240 px no lado maior, nunca aumentando a imagem; vale a primeira que couber em 150 KB.
- **DP-ML-5** · **Logo clara** (CB-950): a cópia reduzida é clara demais quando menos de 2% dos pixels visíveis (alfa de
  50% ou mais) têm contraste de 3:1 ou mais com o branco (o mínimo da WCAG 2.2 para gráfico, 1.4.11). A "média das
  partes visíveis" da SPEC acusaria todo JPG de fundo branco; contar os pixels que aparecem no branco tem a mesma
  intenção sem esse alarme falso. É aviso: "Salvar" continua habilitado. *(Divergência de redação com o CB-950.)*
- **DP-ML-6** · **Contraste e cores derivadas**: WCAG 2.2 (linearização em 0,04045). A sugestão (D-954) e a versão do
  escuro (D-955) mantêm matiz e saturação HSL e andam a claridade em passos de 0,01, para baixo até 4,5:1 com o branco
  e para cima até 7:1 com `#101a1d`, como o protótipo: `#8CC63F` sugere `#587F26` (4,69:1). O número aparece com duas
  casas e vírgula; uma cor recusada nunca aparece como "4,50" (aparece "4,49", CA-1961).
- **DP-ML-7** · **"Padrão do MetaNutri"** (`#0e3b43`, também digitado, CB-960) grava cor nula: o link fica o de hoje e a
  prévia mostra o de hoje.
- **DP-ML-8** · **Onde a cor entra** (D-956): a barra do dia e a aba escolhida, que com cor deixa a pílula branca e vira
  a pílula na cor, com o texto por cima (branco no claro, `#101a1d` no escuro). "Tentar de novo" só aparece antes de o
  link abrir, quando a marca ainda não é conhecida: fica com o teal do MetaNutri. O link aberto não tem outro botão. O
  horário de "Meu plano" é texto e não muda.
- **DP-ML-9** · **O tema da cor é escolhido no CSS**, pela classe `.dark` do `<html>` (regra
  `.dark .marca-da-nutricionista`), não no JavaScript: ao imprimir, o app tira o `.dark` (D-240) e o papel sai com a cor
  do claro (CB-958) sem código a mais. Na prévia, cada celular leva o próprio escopo (`.tema-claro` ou `.dark`), e a
  regra `.dark .tema-claro .marca-da-nutricionista` mantém o celular claro claro com o app no escuro.
- **DP-ML-10** · **Perfil**: `cor: string | null` e `marcaPublicada: boolean`. "Salvar" habilita quando o rascunho difere
  do perfil **ou** quando a conta ainda não publicou e já tem logo ou cor (a logo antiga de Configurações, CA-1951): sem
  isso, quem só quer pôr no link a logo de hoje teria "Salvar" desabilitado. "Salvo" aparece depois de salvar, até a
  próxima mudança.
- **DP-ML-11** · **Salvar = primeiro a nuvem, depois o perfil.** A nuvem recusou ou não respondeu: nada muda e a tela diz
  o motivo (D-98). Sem servidor (modo local), só o perfil; o link do modo local não mostra marca, porque não tem nuvem.
- **DP-ML-12** · **Logo antiga** (Configurações: até 500 KB, PNG, JPG ou SVG): aparece em "Sua marca" como está e continua
  no plano impresso; no primeiro "Salvar" passa pela mesma redução (vira PNG de até 600 px e 150 KB) antes de ir para o
  perfil e para a nuvem.
- **DP-ML-13** · **O link desconfia do que lê** (CA-1973): `lerMarcaDoLink` aceita só PNG em data URI dentro do teto e cor
  `#rrggbb` com 4,5:1 ou mais com o branco; o resto vira "sem logo" ou "sem cor". Imagem que não abre (`onError`) volta à
  logo do MetaNutri. A marca nunca impede o link de abrir.
- **DP-ML-14** · **A marca não viaja com as marcações**: `porToken` devolve o link com a `marca`, e a tela a separa na
  hora. O que o paciente marca, e a cópia que o aparelho guarda, nunca levam a logo.
- **DP-ML-15** · **Prévia**: a paciente de exemplo é "Juliana", com 4 missões (2 feitas hoje), 3 dias marcados na semana
  e "Meu plano" ligado (para as abas aparecerem). O celular desenha a tela de 360 px com `zoom: 0.8`. Os celulares são
  `inert` e `aria-hidden`: não entram no Tab nem no leitor de tela, que já tem a logo (texto alternativo "Sua logo"),
  o contraste e a recusa na parte da Logo e da Cor (CA-1980).
- **DP-ML-16** · **Componentes novos no design system** (regra 1 do AGENTS.md): `PlacaLogo` (display: a placa branca com a
  logo, nos tamanhos do link e do formulário), `EscolhaDeCor` (forms: as amostras como grupo de opções) e `CampoCor`
  (forms: o seletor do navegador e o campo `#RRGGBB`, com o erro ligado ao campo). Os três vão para o índice, os
  LEIA-ME e a vitrine.
- **DP-ML-17** · **Celular** (CA-1981): abaixo de 1024 px a tela é uma coluna (Logo, Cor, Salvar e depois os celulares),
  um celular embaixo do outro, como o protótipo abaixo de 900 px.
- **DP-ML-18** · **CA-1956**, "o plano impresso sai sem logo": sem a logo **dela**. O plano impresso volta à logo do
  MetaNutri, como hoje quando não há logo (D-405: "o PDF sem logotipo leva o do MetaNutri").
- **DP-ML-19** · **Teste do banco**: o 015 roda no Supabase local de `npm run test:seguranca` (Docker), com `marcas` em
  `TABELAS_DA_CONTA` (os ataques do CA-488 valem para ela sozinhos) e um arquivo novo para CA-1974, CA-1975 e CA-1976.
  O texto do 015 também tem testes no `npm run test` (`src/data/sqlMarcaNoLink.test.ts`), como o 012.
- **DP-ML-20** · **Número do arquivo**: `supabase/015-marca-no-link.sql` (o último é o 014; a `importar-pacientes` não
  tem SQL).
- **DP-ML-21** · **Hexadecimal no domínio**: as seis cores prontas (D-953), o branco do texto (D-954) e o fundo escuro do
  link (D-955) são dados da SPEC, usados em conta, e moram em `src/domain/corDaMarca.ts` num bloco
  `eslint-disable no-restricted-syntax` com o motivo. Um teste confere que `#101a1d` é o `--carvao-900` dos tokens e
  `#0e3b43`, o `--teal-900`.
- **DP-ML-22** · **Placa da logo no link** (D-957, CA-1972): branca nos dois temas, cantos de 12 px, a logo com
  `object-contain` em até 40 × 200 px (`max-h-10 max-w-50`), sem esticar. No claro, um fio por dentro para a placa não
  sumir na mesa; no escuro, sem fio.
- **DP-ML-23** · **A rota** é `{ tela: 'marca' }`, escrita `#/conta/marca`. O menu marca "Conta e assinatura" nela, e o
  título tem a trilha "Conta e assinatura".
- **DP-ML-24** · **O cartão na Conta** vem logo depois de "Sua assinatura": a placa com a logo (ou "Sem logo"), a bolinha
  da cor com o nome e o código ("Padrão do MetaNutri" sem cor) e o botão "Editar".

Decisões acrescentadas durante a implementação:

- **DP-ML-25** · **A marca do link em peças próprias** (pedido do coordenador em 03/11/2026: outro agente vai redesenhar o
  link): `TopoDoLink` (a placa ou a logo do MetaNutri), `RodapeDoLink` (o MetaNutri pequeno), `MolduraDoLink` (a raiz,
  com a classe e as variáveis da cor) e `marcaNoLink.ts` (a cor, a aba escolhida, a barra e a logo que não abre). O
  `LinkDoPaciente` só as monta; a tela não foi reorganizada.
- **DP-ML-26** · **O termo é "logo"** nesta função (D-963, aprovado no protótipo). A guarda de "logo" no lugar de
  "logotipo" (D-400 da `textos-e-promessas`) saiu de `src/textosDaFrente.test.ts`; a landing ("com o seu logotipo"), que
  é do site, não muda nesta entrega.
- **DP-ML-27** · **Texto alternativo**: no link, "Logo de quem montou seu plano" (o link não sabe o nome dela); em Sua
  marca e no cartão da Conta, "Sua logo".
- **DP-ML-28** · **A legenda de cada celular** traz o código da cor que ele usa ("Celular claro · #3F5F2A", "Celular
  escuro · #7AB455"), como o protótipo aprovado; a SPEC (D-963) lista só "Celular claro" e "Celular escuro".
- **DP-ML-29** · **Na prévia, as abas usam a altura do toque** (44 px) em qualquer largura: é um celular.
- **DP-ML-30** · **Hexadecimal nos e2e da marca**: os dois arquivos desligam a regra de cor solta com o motivo escrito
  (o código da cor é o dado do critério, digitado e conferido como a nutricionista o vê).
- **DP-ML-31** · **O seletor de arquivo** é um `<input>` dentro de um `<label>` com a cara do botão suave do sistema
  (`buttonVariants`): o `Button` com `asChild` não aceita o ícone de carregando junto do filho.

## Specs que mudam (SPEC, seção 5)

Cada uma ganha uma nota curta "*Atualizado pela `marca-no-link` (29/10/2026)*" na decisão citada:

| Spec | Onde | O que muda |
|---|---|---|
| `textos-e-promessas` | D-405 | o item da logo vira "Sua logo e sua cor no link do paciente; a logo também no plano impresso" (CA-1979) |
| `seguranca-lote-2` | D-107 | os tetos da marca publicada (DP-ML-2) |
| `seguranca-lote-4` | CA-487 | a logo só vale como imagem embutida, também no servidor (CA-1975) |
| `exclusao-de-conta` | D-252 | a marca publicada sai junto com a conta (CA-1976) |
| `dieta-no-link` | D-156 | a função do link devolve também a marca (CA-1974) |
| `missoes-na-nuvem` | função do paciente | idem |

## Arquivos (na ordem de execução)

| Arquivo | Ação | Tarefa |
|---|---|---|
| `src/domain/corDaMarca.ts` (+ teste) | criar | T1 |
| `src/domain/logoDaMarca.ts` (+ teste) | criar | T2 |
| `src/domain/perfil.ts` (+ teste) | alterar: `cor`, `marcaPublicada` | T3 |
| `src/domain/marca.ts` (+ teste) | criar: `MarcaDoLink`, `lerMarcaDoLink`, `marcaDoPerfil`, `publicarMarca` | T3 |
| `src/domain/fonteSupabase.ts` | alterar: exportar `usuarioEsperado` e `comPrazo` | T3 |
| `supabase/015-marca-no-link.sql` | criar | T4 |
| `src/data/sqlMarcaNoLink.test.ts` | criar | T4 |
| `testes/seguranca/preparo.ts`, `tabelas.test.ts`, `exclusao.test.ts`, `marca.test.ts` | alterar / criar | T4 |
| `src/ui/estado/mensagemDoBanco.ts` (+ teste) | alterar: travas da marca | T4 |
| `src/domain/repositorioAcompanhamentos.ts` | alterar: `AcompanhamentoDoLink` | T5 |
| `src/domain/fonteSupabase.ts` (+ teste) | alterar: `porToken` devolve a marca | T5 |
| `design-system/tokens/tokens.css`, `src/ui/tema/globals.css` | alterar: `--link-acao*`, placa, celular da prévia, `.marca-da-nutricionista` | T6 |
| `design-system/componentes/display/PlacaLogo.tsx` | criar | T6 |
| `design-system/componentes/forms/EscolhaDeCor.tsx`, `CampoCor.tsx` | criar | T6 |
| `design-system/componentes/marca.test.tsx` | criar | T6 |
| `design-system/index.ts`, `LEIA-ME.md`, `componentes/LEIA-ME.md`, `vitrine/TelaDesignSystem.tsx`, `DESIGN.md` | alterar | T6 |
| `src/domain/marcaNaNuvem.ts` | criar: `publicarMarca` (fora de `marca.ts`, sem import circular) | T5 |
| `src/ui/missoes/LinkDoPaciente.tsx` | criar (a parte que desenha) | T7 |
| `src/ui/missoes/TopoDoLink.tsx`, `RodapeDoLink.tsx`, `MolduraDoLink.tsx`, `marcaNoLink.ts` | criar: a marca em peças (DP-ML-25) | T7 |
| `src/ui/marca/publicarNaNuvem.ts` | criar: o "Salvar" com o cliente do Supabase | T8 |
| `src/ui/missoes/TelaMissoesPaciente.tsx` (+ teste novo `marcaNoLink.test.tsx`) | alterar | T7 |
| `src/ui/marca/desenhistaDoNavegador.ts` | criar: o `<canvas>` | T8 |
| `src/ui/marca/exemploDoLink.ts`, `PreviaDoLink.tsx`, `TelaSuaMarca.tsx`, `CartaoSuaMarca.tsx` (+ testes) | criar | T8 |
| `src/ui/navegacao.ts` (+ teste), `src/ui/layout/MenuLateral.tsx`, `src/ui/AreaDeTrabalho.tsx` | alterar: a rota | T8 |
| `src/ui/conta/TelaConta.tsx` | alterar: o cartão | T8 |
| `src/ui/config/TelaConfiguracoes.tsx`, `configuracoes.test.tsx` | alterar: sai o cartão "Logotipo" | T8 |
| `src/domain/conta.ts`, `src/recursosDosPlanos.test.tsx`, `src/ui/publico/SecaoPrecos.test.tsx` | alterar: o texto do recurso | T9 |
| specs da seção acima | alterar: nota | T9 |
| `e2e/apoio/servidorFalso.ts` | alterar: `marcas` (gravações) | T10 |
| `e2e/marca-no-link.spec.ts`, `e2e/servidor-falso/marca-no-link.spec.ts` | criar | T10 |
| `e2e/csp.spec.ts`, `e2e/design-system.spec.ts` | alterar: a logo por "Sua marca"; a seção nova | T10 |
| `README.md` | alterar: o 015 na lista e a ordem | T11 |

## Tarefas

- [x] **T1** — `corDaMarca.ts`: `normalizarCor`, `luminancia`, `contraste`, `avaliarCor` (contraste, aceita, sugestão,
  versão do escuro), `formatarContraste`, `CORES_PRONTAS`, `COR_PADRAO`.
  - Depende de: —
  - Cobre: CA-1957 (as seis passam), CA-1958 (formato), CA-1959, CA-1960, CA-1961, CA-1962 (200 sorteadas), CB-960
  - Feito quando: os testes com as cores conhecidas (`#1F4E8C` 8,31; `#8CC63F` 2,05 → `#587F26` 4,69; 4,4987 recusada e
    4,5003 aceita) passam.
- [x] **T2** — `logoDaMarca.ts`: `conferirArquivoDeLogo`, `prepararLogo(arquivo, dataUrl, textoSvg, desenhista)`,
  `ehLogoClara`, `svgPedeRecursoDeFora`, `bytesDoDataUrl`, `ehLogoPublicavel`.
  - Depende de: —
  - Cobre: CA-1952 (regra), CA-1953, CA-1954, CA-1955 (o SVG nunca sai), CB-950, CB-952, CB-953
  - Feito quando: testes com um desenhista falso que devolve tamanhos conhecidos.
- [x] **T3** — Perfil com `cor` e `marcaPublicada`; `marca.ts` com `lerMarcaDoLink`, `marcaDoPerfil` e `publicarMarca`
  (upsert em `marcas`, com o dono da sessão e o prazo da nuvem).
  - Depende de: T1, T2
  - Cobre: CA-1951 (domínio), CA-1963 (domínio), CA-1973 (leitura), CB-955
- [x] **T4** — `supabase/015-marca-no-link.sql`, os testes de texto e os testes no Supabase local; as travas em
  `mensagemDoBanco`.
  - Depende de: —
  - Cobre: CA-1974, CA-1975, CA-1976, CA-1977 (nada muda na CSP)
- [x] **T5** — `porToken` devolve `marca`; `AcompanhamentoDoLink`.
  - Depende de: T3
  - Cobre: CA-1967, CA-1974 (cliente)
- [x] **T6** — Tokens, `PlacaLogo`, `EscolhaDeCor`, `CampoCor`, vitrine, índice e DESIGN.md.
  - Depende de: T1
  - Cobre: CA-1980 (grupo de opções com nome e código, erro ligado ao campo), CB-954
- [x] **T7** — `LinkDoPaciente` e a tela do paciente com a marca.
  - Depende de: T5, T6
  - Cobre: CA-1965, CA-1966, CA-1968, CA-1969, CA-1970, CA-1971, CA-1972, CA-1973, CB-958
- [x] **T8** — "Sua marca": rota, menu, tela, prévia, cartão na Conta; sai o cartão "Logotipo"; o desenhista de verdade.
  - Depende de: T2, T3, T6, T7
  - Cobre: CA-1950, CA-1951, CA-1952 a CA-1964 (tela), CA-1978, CA-1980, CA-1981, CB-950, CB-956, CB-961
- [x] **T9** — O texto do recurso (CA-1979) e as notas nas outras specs.
  - Depende de: —
  - Cobre: CA-1979
- [x] **T10** — Ponta a ponta: "Sua marca" (modo local), o link com marca (servidor falso), a CSP com a logo por "Sua
  marca", a vitrine; prints em 360, 390 e 1440 px nos dois temas; `break-ui`.
  - Depende de: T8
  - Cobre: CA-1952, CA-1955 (no navegador), CA-1965, CA-1966, CA-1972, CA-1977, CA-1981
- [x] **T11** — README (o 015 e a ordem) e a validação no topo deste plano.

## Riscos

- **R-ML-1** · O dono publicar o site antes de rodar o 015: "Salvar" falha com a frase de rede e o link continua o de
  hoje (a função antiga não traz as colunas, e o link lê como sem marca). Nada quebra; a marca só não sai.
- **R-ML-2** · Rodar o 004 ou o 012 de novo depois do 015 refaz a função do link sem a marca: o 015 avisa no topo para
  rodar ele de novo logo depois, como o 012 já faz com o 004.
- **R-ML-3** · `zoom` na prévia: Chrome, Edge e Safari têm há anos; o Firefox desde a versão 126 (2024). Num Firefox mais
  velho a prévia sai maior e rola dentro do celular; nada quebra.
- **R-ML-4** · O `<canvas>` não existe no jsdom: a redução de verdade só é testada no Playwright.
