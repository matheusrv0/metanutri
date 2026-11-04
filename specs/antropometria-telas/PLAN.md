# PLAN — Antropometria completa: as telas

**Spec de origem:** `./SPEC.md` (D-1400 a D-1460, CA-2400 a CA-2491, CB-1400 a CB-1417).
**Motor:** `specs/antropometria-completa/` (D-1000 a D-1042), na `main` desde o 8a96bc8.
**Protótipo aprovado:** `AvaliacaoAntropometrica.dc.html`, `HistoricoAntropometrico.dc.html` e
`DocumentoAvaliacao.dc.html` (canvas "MetaNutri Redesenho", 03/11/2026).
**Status:** "apenas faça": o dono decide pela tela; este plano segue sem esperar aprovação. Ramo
`antropometria-telas`, a partir da `main` 8a96bc8.

## Abordagem

**Um dado só.** A avaliação é o plano completo do paciente (D-1400). A tela nova lê e grava o mesmo `Caso` que a etapa 1
usa, pelo mesmo `useCasoAberto` (salva a cada mudança e sobe para a nuvem pelo caminho de sempre). Nada é copiado.

**A tela só desenha.** Cada número, faixa, rótulo e fonte vem do motor (`resultadoAntropometrico`, `estimativas`,
`pesoDeReferencia`, `pontoDePartida`, `prioridadeClinica`, `metaDePerda`, `mudancaMinima`). O que é lógica de tela
(agrupar as linhas, a frase do que falta, o detalhe curto, a linha do protocolo, a série do histórico, o documento) mora
em módulos puros testados: `src/domain/historicoAntropometrico.ts`, `src/domain/documentoDaAvaliacao.ts`,
`src/domain/fotosDaAvaliacao.ts` e, do lado da interface, `src/ui/antropometria/textosDaAvaliacao.ts` (como
`estiloAdequacao.ts`).

**Pedaço separado.** A tela, o histórico e o documento entram por `lazy()` em `AreaDeTrabalho`, num pedaço do JavaScript
pedido quando o endereço abre (DP-AT-10). O service worker guarda o pedaço com o resto do app.

**Componentes.** Os da biblioteca (`Card`, `Button`, `CampoNumero`, `Select`, `SeletorSegmentado`, `Badge`, `Alert`,
`Dialog`, `Textarea`, `Switch`, `Label`). Um componente novo na biblioteca: `GraficoLinha` (display), com a vitrine e o
LEIA-ME (DP-AT-9). Na tela, um componente por arquivo, em `src/ui/antropometria/`.

## Restrições

- **Nenhuma dependência nova.** As imagens viram WebP por um script de Python fora do repositório, com o Pillow que já
  está na máquina (registrado aqui, DP-AT-19); o app não ganha pacote.
- TDD na lógica (skill `tdd`): teste primeiro, falha, código, passa. Um teste por CA e por CB, com o ID no nome. Um
  commit por tarefa, em Conventional Commits, em português, com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Sem `any` e sem `!`. Nenhum valor de cor, fonte, espaço ou raio no código: tokens e utilitários do tema (o
  `eslint.config.js` cobra). Laranja nunca leva texto.
- Arquivos de outros ramos, mexidos o mínimo e registrados: `src/domain/tipos.ts` (busca-substitutos), `AreaDeTrabalho.tsx`,
  `MenuLateral.tsx` e `navegacao.ts` (importar-pacientes, marca-no-link, lado-do-paciente), `testes/seguranca/preparo.ts`
  e `tabelas.test.ts` (marca, lado, ia). Nada é reorganizado neles.
- Nunca falar com o Supabase de produção. O SQL 018 é do dono.

## Decisões do plano (DP-AT)

- **DP-AT-1** · **Endereço pelo plano** (`#/antropometria/<plano>`), não pelo paciente: o plano sem paciente (caso de
  estudo) também abre a tela, e a ficha leva à avaliação mais recente por `#/paciente/<id>/antropometria`, que só
  redireciona (D-1401).
- **DP-AT-2** · **Duas abas** (Ficha e Antropometria) em vez das 5 do protótipo (D-1402). As abas moram num componente
  (`AbasDaFicha`) usado pela ficha e pela tela nova.
- **DP-AT-3** · **Sem "Salvar"** (D-1403): o app salva a cada mudança desde o CA-49; o "Salvo" do cabeçalho é o da nuvem.
- **DP-AT-4** · **O gasto de repouso não vai para o plano.** "Levar para o plano" leva só a proteína (D-1421). Juntar
  Cunningham às fórmulas de energia do plano (`energia.ts`, o Word, o resumo) é outra spec; fica para o dono decidir.
- **DP-AT-5** · **Proteína do idoso com doença**: qualquer doença marcada na ficha conta como "doença aguda ou crônica" do
  PROT-AGE (D-1420). É inferência; vai para a Mor.
- **DP-AT-6** · **Slaughter desligado acima de 18 anos**, como o protótipo. O motor calcula fora da faixa com aviso; a
  tela segue o protótipo. Um plano antigo com Slaughter e a pessoa já com 19 anos continua mostrando a conta com o aviso.
- **DP-AT-7** · **"Usar os estimados" pede os dois** (altura e peso), como o protótipo: a origem é uma só (D-1408).
- **DP-AT-8** · **Nomes na tela e no papel.** A tabela da tela usa os nomes curtos do protótipo ("Braço (CB)", "Músculo
  (CMB)", "Área muscular (AMBc)"); o documento, os nomes do protótipo do documento ("Circunferência do braço (CB)").
  Linhas que o protótipo não tem usam o nome do motor.
- **DP-AT-9** · **`GraficoLinha` na biblioteca** (o pedido do design system: componente novo sai de
  `design-system/componentes/`). Linha da série no teal de ação, ponto por valor, rótulo do último, colunas
  focáveis com a dica, sem segundo eixo. Valor `null` não vira ponto.
- **DP-AT-10** · **`lazy()`** para a tela nova (como a importação de pacientes, DP-IP-1). O `frisancho.json` vai junto no
  pedaço.
- **DP-AT-11** · **Foto reduzida no aparelho** (D-1453): `createImageBitmap` com `imageOrientation: 'from-image'`,
  `<canvas>` com o lado maior até 1600 px, `toBlob('image/jpeg', 0.85)`. O desenho mora na interface; a regra (tipos,
  limites, tamanhos) no domínio, testada com um desenhista falso, como a `marca-no-link`.
- **DP-AT-12** · **Tamanho somado só no app.** A política do Storage não conhece o tamanho na hora do envio. O servidor
  limita: tipo, 8 MB por arquivo (no balde), 5 fotos e 10 anexos por plano, 2.000 arquivos por conta (função
  `security definer`, como `comprovantes_da_conta`). O teto de 8 MB por avaliação é do app.
- **DP-AT-13** · **URL assinada de 10 minutos** e `img-src` com a origem do Supabase (só quando o build tem Supabase). O
  anexo abre numa aba nova pela URL assinada.
- **DP-AT-14** · **Excluir o plano apaga a pasta dele** no balde (melhor esforço: se falhar, o plano sai e a pasta fica até
  a exclusão da conta, que limpa tudo). Excluir o paciente não apaga planos (regra de hoje) nem fotos.
- **DP-AT-15** · **Versão antiga do app** (PWA em cache) lendo um plano com protocolo novo: o `calcularComposicao` antigo
  cai no primeiro protocolo (JP 3) sem quebrar. Risco curto, até a versão nova chegar; registrado.
- **DP-AT-16** · **Imagens**: as 15 do protótipo, em WebP, com até 800 px no lado maior (2× o maior desenho na ajuda) e
  qualidade 82; desenhos em tons de cinza ficam em tons de cinza. Nenhuma alteração de conteúdo (regra do CDC); o recorte
  não é usado. O diâmetro do punho fica sem imagem (pesquisa 7.5, D16: redesenhar antes).
- **DP-AT-17** · **Selo**: "grave" usa o mesmo estado de "alterado" (vermelho); a diferença fica no rótulo do motor. O
  design system tem um vermelho só para estado.
- **DP-AT-18** · **Rascunho do diagnóstico** (D-1432): frase montada só com as situações e as fontes do motor, sem
  adjetivo, sem conclusão clínica; a nutricionista edita. Nenhuma IA.
- **DP-AT-19** · **Script das imagens** (fora do repositório, rodado uma vez): Pillow 12, `Image.thumbnail((800, 800))`,
  `save(..., 'WEBP', quality=82, method=6)`. O resultado entra no commit; o script fica descrito aqui para o dono
  repetir.
- **DP-AT-20** · **Caminho do arquivo**: `<conta>/<plano>/fotos/<uuid>.jpg` e `<conta>/<plano>/anexos/<uuid>.<pdf|jpg|png>`.
  O nome original do anexo vai só na lista do plano (para a tela), nunca no caminho.

## Riscos

- **R-AT-1** · O SQL 018 precisa rodar **antes** de publicar a F2; sem ele, o envio de foto falha com "Entre de novo para
  enviar fotos." (a política não existe). A F1 não depende dele.
- **R-AT-2** · A exclusão da conta apaga as fotos pela função `excluir-conta`: ela precisa ser publicada de novo junto com
  o site (o código da função muda).
- **R-AT-3** · Outros ramos mexem em `AreaDeTrabalho.tsx`, `navegacao.ts`, `MenuLateral.tsx`, `tipos.ts` e nos testes de
  segurança: o merge tem conflito pequeno e previsível (linhas acrescentadas em pontos diferentes).
- **R-AT-4** · Portas e `node_modules/.tmp` divididos com outros agentes: `npm run e2e` e `npm run test:seguranca` podem
  cair por porta ocupada; repetir.

## Ordem e dependências

| # | Tarefa | Arquivos | Critérios | Depende de |
|---|---|---|---|---|
| T1 | SPEC | `specs/antropometria-telas/SPEC.md` | — | — |
| T2 | PLAN | `specs/antropometria-telas/PLAN.md` | — | T1 |
| T3 | Divergência 2 no motor | `src/domain/pontoDePartida.ts`, `metaDePerda.ts`, `pesoDeReferencia.ts` (+ testes novos em `origemDoPercentual.test.ts`) | CA-2446 a CA-2448 | T2 |
| T4 | Modelo da avaliação e leitura | `src/domain/tipos.ts`, `caso.ts`, `caso.test.ts` (+ `avaliacaoNoPlano.test.ts`) | CA-2464, CA-2465, CB-1400 | T2 |
| T5 | Duplicação | `src/domain/duplicar.ts`, `duplicar.test.ts` | CA-2466, CA-2467 | T4 |
| T6 | Etapa 1 com protocolo novo | `src/ui/caso/CamposComposicao.tsx`, `PainelAntropometria.tsx`, `TelaCaso.tsx` (+ `etapa1Antropometria.test.tsx`) | CA-2406, CA-2468 | T4 |
| T7 | Endereços e moldura | `src/ui/navegacao.ts`, `AreaDeTrabalho.tsx`, `layout/MenuLateral.tsx`, `pacientes/TelaPaciente.tsx`, `antropometria/TelaAntropometria.tsx`, `AbasDaFicha.tsx`, `BarraDaAvaliacao.tsx`, `avaliacoesDoPaciente.ts` (domínio) (+ testes) | CA-2400 a CA-2405, CA-2407 a CA-2409, CA-2469 | T4, T5 |
| T8 | Imagens e ajuda | `public/imagens/antropometria/*.webp`, `THIRD_PARTY_NOTICES.md`, `src/ui/antropometria/ajudas.ts`, `ajudaAberta.ts`, `AjudaDaMedida.tsx` (+ testes) | CA-2427 a CA-2429 | T7 |
| T9 | Peso e estatura, estimativas e peso ideal | `CartaoPesoEstatura.tsx`, `PainelEstimar.tsx`, `PainelPesoIdeal.tsx`, `CampoMedida.tsx`, `textosDaAvaliacao.ts`, `VistaAvaliacao.tsx` (+ testes) | CA-2410 a CA-2415 | T8 |
| T10 | Circunferências e diâmetros | `CartaoCircunferencias.tsx`, `LinhaDeMedida.tsx`, `CartaoDiametros.tsx` (+ testes) | CA-2416 a CA-2419 | T8 |
| T11 | Dobras | `CartaoDobras.tsx`, `textosDaAvaliacao.ts`, `ajudas.ts` (a peitoral sem sexo, D-1464; "suprailíaca" sem hífen) (+ testes) | CA-2420 a CA-2426 | T8 |
| T12 | Resultado | `CartaoResultado.tsx`, `LinhaDoResultado.tsx`, `SeloDaSituacao.tsx`, `textosDaAvaliacao.ts` (+ testes) | CA-2430 a CA-2435, CB-1402 a CB-1406, CB-1411 | T7 |
| T13 | Ponto de partida | `CartaoPontoDePartida.tsx`, `BlocoProteina.tsx`, `BlocoMetaDePerda.tsx`, `textosDaAvaliacao.ts` (+ testes) | CA-2436 a CA-2445 | T3, T12 |
| T14 | `GraficoLinha` no design system | `design-system/componentes/display/GraficoLinha.tsx`, `index.ts`, `vitrine/TelaDesignSystem.tsx`, `componentes/LEIA-ME.md`, `DESIGN.md` (contagem) (+ teste) | (D-1426, D-1487) | T2 |
| T15 | Histórico: o domínio | `src/domain/historicoAntropometrico.ts` (+ teste) | CA-2449 a CA-2455 (lógica), D-1480 a D-1488, CB-1440 a CB-1443 | T4 |
| T16 | Histórico: a tela | `VistaHistorico.tsx` (a da T7), `CartaoEvolucao.tsx`, `CartaoMudancaMinima.tsx`, `TabelaAvaliacoes.tsx`, `BarraDaAvaliacao.tsx` e `TelaAntropometria.tsx` (no Histórico, o resumo no lugar da lista, como o protótipo) (+ testes) | CA-2449 a CA-2456, CB-1412 | T14, T15 |
| T17 | Documento: o domínio | `src/domain/documentoDaAvaliacao.ts` (+ teste) | CA-2458 a CA-2461 e CA-2463 (lógica), D-1490 a D-1498, CB-1444, CB-1447 | T4, T15 |
| T18 | Documento: a prévia e o papel | `DialogoDocumentoAvaliacao.tsx`, `FolhaAvaliacao.tsx`, `TelaAntropometria.tsx` (o botão e a janela), `AreaDeTrabalho.tsx` (passa quem assina e o bloqueio) (+ testes) | CA-2457 a CA-2463, D-1489, D-1499, CB-1445, CB-1446 | T17 |
| C1 | Data local no "Duplicar" e na "Nova avaliação" | `src/domain/persistencia.ts` (+ teste em `persistencia.test.ts`) | CB-1448, CA-2403 | — |
| C2 | Motivo da proteína na lactação | `src/domain/pontoDePartida.ts`, `BlocoProteina.tsx`, `CartaoPontoDePartida.tsx` (+ testes) | CB-1449, CA-2445 | — |
| C3 | IMC-alvo digitado na proteína | `src/domain/pontoDePartida.ts` (+ teste por fórmula) | CB-1450 | — |
| C4 | Datas para gente em dd/mm/aaaa | conferência das telas; os dados dos prints | CB-1451 | — |
| T19 | Celular, pior caso e texto do protótipo | os componentes da tela (correções), `BarraDaAvaliacao.tsx` (a lista a 390 px), `CartaoPontoDePartida.tsx`, `BlocoProteina.tsx`, `BlocoMetaDePerda.tsx` e os outros cartões com texto fora do protótipo, `break-ui` | CA-2470 a CA-2472, CB-1407 a CB-1409, CB-1417, CB-1452, CB-1453 | T9 a T18, C1 a C4 |
| T20 | Ponta a ponta da F1 | `e2e/antropometria.spec.ts` (1440 e 390 px) | CA-2400, CA-2410, CA-2421, CA-2430, CA-2449, CA-2457, CA-2470, CA-2471 | T19 |
| T21 | Fotos: o domínio | `src/domain/fotosDaAvaliacao.ts` (+ teste) | CA-2481 a CA-2484 (lógica) | T4 |
| T22 | SQL 018 e ataques | `supabase/018-fotos-avaliacao.sql`, `src/data/sqlFotosAvaliacao.test.ts`, `testes/seguranca/fotos.test.ts`, `preparo.ts`, `tabelas.test.ts` | CA-2488 | T21 |
| T23 | Exclusão das fotos | `supabase/functions/_shared/exclusaoSupabase.ts`, `excluirConta.ts` (comentário), `src/data/servidorExcluirLigacao.test.ts`, `testes/seguranca/exclusao.test.ts`, `src/ui/casos/DialogoExcluir.tsx` | CA-2489 | T22 |
| T24 | CSP | `src/seguranca/csp.ts`, `csp.test.ts` | CA-2491 | T2 |
| T25 | Fotos e anexos: a tela | `CartaoFotos.tsx`, `ListaDeFotos.tsx`, `CompararFotos.tsx`, `ListaDeAnexos.tsx`, `armazenamentoDeFotos.ts`, `reduzirFoto.ts` (+ testes) | CA-2480 a CA-2487, CA-2490, CB-1413 a CB-1416 | T21 a T24 |
| T26 | Validação | este plano (checklist e matriz), prints | todos | T3 a T25 |
| T27 | **F3, bloqueada:** "Enviar por e-mail" | (quando o Resend do `lado-do-paciente` entrar) | D-1460 | infraestrutura do Resend |

## Tarefas

### T3 · Divergência 2

1. Testes que falham: o gasto, a proteína (Helms e base massa magra), a meta (com gordura alvo) e o peso de referência
   trazem `origemDoPercentual` e repassam os avisos de `GorduraDoCaso` (CA-2446, CA-2447); o aviso da faixa troca com a
   bioimpedância e o número não muda (CA-2448).
2. `OrigemDoPercentual = { origem, metodo }` exportado de `indicadoresDeGordura.ts` (função `origemDoPercentual(g)`);
   `GastoDeRepouso`, `SugestaoDeProteina`, `MetaDePerda` e `PesoDeReferencia` ganham o campo; os avisos vêm depois dos
   da sugestão. `GastoDeRepouso` ganha `evidencia: 'limitada'` (D-1419).

### T4 · Modelo da avaliação

1. Testes: plano novo com `avaliacao` vazio; plano antigo sem o grupo abre igual; parcial completa só o que falta; valor
   desconhecido fica (CA-2464); os 8 ids gravam e relêem (CA-2465).
2. `tipos.ts`: `composicao.protocolo: IdProtocolo` (import de tipo do motor); `DadosDaAvaliacao`, `ArquivoDaAvaliacao`,
   `Caso.avaliacao`. `caso.ts`: `AVALIACAO_VAZIA`, `criarCasoVazio`, `completarCasoLido`.

### T5 · Duplicação

Classe nova `arquivo do dia` (sempre vazia na cópia, com ou sem paciente); `NA_DUPLICACAO.avaliacao` (D-1436); testes
CA-2466 e CA-2467.

### T6 · Etapa 1

`PainelAntropometria` com "Abrir a avaliação completa" (prop `aoAbrirAvaliacao`); `CamposComposicao` com o protocolo
novo (D-1437). O `GrupoOpcoes` continua com os 2 de hoje.

### T7 · Endereços e moldura

`Rota` ganha `{ tela: 'antropometria', casoId, vista }` e `{ tela: 'antropometria-do-paciente', pacienteId }`;
`lerRota`/`escreverRota`; `MenuLateral` marca "Pacientes" nas duas (1 linha). `avaliacoesDoPaciente(pacienteId,
registros)` no domínio (ordem por data da consulta, depois alteração). `TelaAntropometria` monta abas, linha do
paciente, barra e a vista; o vazio e o "não existe mais".

### T8 · Imagens e ajuda

Script do DP-AT-19 → 15 WebP; `THIRD_PARTY_NOTICES.md` com o crédito de cada uma; `ajudas.ts` com os textos do
protótipo, o caminho, a proporção, o texto alternativo e o crédito; `AjudaDaMedida` (botão "?" com `aria-expanded`,
painel `role="dialog"`, Esc, foco de volta, no celular preso embaixo).

### T9 a T13 · A vista Avaliação

`VistaAvaliacao.tsx` (da T7) recebe cada cartão na tarefa dele e guarda a ajuda aberta (`ajudaAberta.ts`, D-1461). As
decisões de tela tomadas na implementação estão na SPEC, D-1461 a D-1469.

Cada cartão com o seu teste de componente (Testing Library), pelos CA da tabela. `textosDaAvaliacao.ts` (puro, testado):
`textoDoReal`, `textoDaFalta`, `detalheCurto`, `grupoDaLinha`, `tomDoNivel`, `linhaDoProtocolo`, `foraDaPopulacao`,
`dobrasNaTela` (a marca da suprailíaca, D-1413), `nomeNaTela` (DP-AT-8), `rotuloDoPerfil`, `faixaEmDezenas`.

### T14 a T16 · Histórico

`historicoAntropometrico(avaliacoes)`: linhas (valor por data), variações com a leitura (MMD do motor), séries dos
gráficos (sem `null`), leitura em frase, marcas de "mesmo protocolo/ponto". A tela desenha.

Feitas no ramo `antropometria-historico`, que agora parte da ponta da T13 (`antropometria-telas`, rebase de 04/11).
Os textos do Histórico vêm prontos do domínio (`historicoAntropometrico`); a tela só desenha, sem arquivo de textos
próprio. No Histórico, a barra mostra o resumo ("4 avaliações · de ... a ...") no lugar da lista, como o protótipo.

O documento usa as peças reais da T12: `apresentarLinha` (o valor nas casas do motor, a recomendação, o selo ou o que
falta) e `SeloDaSituacao` na tabela "Resultados". A `LinhaDoResultado` da tela não vai ao papel: ela leva o "ⓘ", que é
botão. Os nomes da tabela são os do protótipo do documento (DP-AT-8, D-1491).

### T17 e T18 · Documento

`documentoDaAvaliacao(entrada)`: os blocos com o que tem dado, as referências sem repetir, o tipo da avaliação, a
comparação, o rascunho do diagnóstico. A prévia dentro de `.area-impressao` com `.folha-documento papel`; "Salvar em
PDF" chama `window.print()`.

### C1 a C4 · Correções do dono (04/11)

- **C1** · `repositorio.duplicar` data a cópia com `diaLocal` (o relógio de quem usa), como `criarPlano`; teste às 21h30
  de Brasília (00h30 UTC do dia seguinte).
- **C2** · `proteinaPorObjetivo` devolve, na lactante adulta, `{ calculou: false, motivo }` com o motivo do motor, como
  `metaDePerda`; a tela mostra o motivo do motor e perde o texto próprio.
- **C3** · `proteinaPorObjetivo` repassa `caso.avaliacao.imcAlvo` a `pesoDeReferencia`; teste pela fórmula (IMC-alvo ×
  estatura² × g/kg).
- **C4** · Nenhuma tela escreve AAAA-MM-DD; o nome do plano na barra lateral é o gravado, e os prints usam o nome que o
  app dá.

### T19 e T20 · Celular, pior caso e ponta a ponta

`break-ui` com o pior caso; e2e novo em 1440 e 390 px (sem rolagem lateral, toque de 44 px, fluxo de digitar medidas,
ver resultado, histórico e documento). Prints em `scratchpad/antropometria-telas/prints/` (390 e 1440, escuro e claro).

### T21 a T25 · Fotos e anexos

Domínio com tipo pelo conteúdo, lados pelo cabeçalho (JPEG SOF, PNG IHDR), limites, caminhos e comparação. SQL 018 com
balde, políticas e contagem; ataques no Supabase local. Exclusão na função e no plano. CSP. A tela.

### T27 · F3 (bloqueada)

Quando a infraestrutura do Resend do `lado-do-paciente` entrar: a função que gera o link com prazo de 7 dias, o envio pelo
Resend, o registro na ficha e o painel "Enviar a avaliação por e-mail" do protótipo (D-1460). **Não implementar agora.**

## Para a Mor

- **Linha da suprailíaca** (D-1039 e D-1413): Jackson & Pollock na axilar anterior; Durnin & Womersley e Petroski na axilar
  média; Guedes e Faulkner, sem linha registrada na pesquisa, na axilar média por padrão.
- **Rabito pelo lado esquerdo** (D-1030 revista): o estudo mediu no lado esquerdo; a tela usa o esquerdo e, sem ele, o
  direito, e diz qual.
- **Diâmetro do joelho**: "Técnica em conferência" (a técnica do fêmur é [NV]); nenhum cálculo usa.
- **IMC do idoso**: SISVAN (> 22 e < 27), com a nota da Caderneta; a OPAS fica como opção futura.
- **ESPEN no idoso com IMC de 27 a 29,99**: a meta de perda aparece com o aviso da ESPEN (D-1034, CA-2092).
- **Panturrilha do idoso**: Pagotto (< 34 / < 33 cm) no motor; o protótipo mostrava o < 31 da Caderneta (D-1029).
- **Proteína do idoso com doença** inferida da ficha (DP-AT-5) e a pergunta da TFGe para quem tem doença renal (D-1420).
- **Slaughter só até 18 anos** na escolha (DP-AT-6).
- **Rascunho do diagnóstico** (DP-AT-18): conferir se o texto ajuda ou atrapalha.
- **Faixas plausíveis** de cada medida (pesquisa 1.7 B): sem fonte; a tela não avisa valor fora delas.
- **Gasto de repouso no plano** (DP-AT-4): levar Cunningham para a energia do plano?

## Matriz CA × teste

Preenchida na validação (T26).
