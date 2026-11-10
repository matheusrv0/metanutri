# PLAN — Antropometria completa: as telas

**Spec de origem:** `./SPEC.md` (D-1400 a D-1460, CA-2400 a CA-2491, CB-1400 a CB-1417; correções da revisão r1:
D-1520 a D-1529 e CB-1480 a CB-1489; da revisão r2: D-1500 a D-1502 e CB-1460 a CB-1462; da implementação da F2: D-1503 a D-1513 e CB-1463 a CB-1466; da revisão r1 da F2: D-1530 a D-1538 e CB-1467 a
CB-1475; da revisão r2 da F2: D-1546 a D-1549 e CB-1496 a CB-1498).
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
- **DP-AT-12** · **Tamanho somado também no servidor** (revisto pela D-1531). A política do Storage roda antes de o
  arquivo chegar e não conhece o tamanho; o gatilho do 018 roda na gravação, já com `metadata->>'size'`, e soma a pasta
  do plano (8 MB) e a da conta (500 MB). O servidor limita ainda: tipo (D-1535), 8 MB por arquivo (no balde), 5 fotos e
  10 anexos por plano, 2.000 arquivos por conta (função `security definer`, como `comprovantes_da_conta`). O app confere
  o teto antes de enviar, para dar a frase sem gastar o envio.
- **DP-AT-13** · **URL assinada de 10 minutos** e `img-src` com a origem do Supabase (só quando o build tem Supabase). O
  anexo abre numa aba nova pela URL assinada.
- **DP-AT-14** · **Excluir o plano apaga a pasta dele** no balde (revisto pela D-1503 e pela D-1534): a tela espera o
  armazenamento; se falhar, o plano fica e o aviso diz. Excluir o paciente não apaga planos (regra de hoje), mas apaga as
  fotos e os anexos deles, também esperando o armazenamento.
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
- **DP-AT-20** · **Caminho do arquivo**: `<conta>/<plano>/fotos/<uuid>.jpg` e `<conta>/<plano>/anexos/<uuid>.pdf` (desde
  a D-1530, a imagem anexada vira foto). O nome original do anexo não vai a lugar nenhum: a lista leva o nome neutro
  "anexo-N.pdf" (D-1536).
- **DP-AT-21** · **A porta lê a pasta do plano** (`listar`, no lugar de `contar`): devolve o caminho, o tamanho e a data
  de cada arquivo de `fotos/` e de `anexos/`. Serve à recusa (D-1505 e D-1531: a contagem e a soma) e ao arquivo solto
  (D-1534). O balde que não existe conta como vazio.

## Riscos

- **R-AT-1** · O SQL 018 precisa rodar **antes** de publicar a F2; sem ele, o envio de foto falha com "Não foi possível
  enviar agora. Tente de novo." (o balde não existe, D-1547). A F1 não depende dele.
- **R-AT-2** · A exclusão da conta apaga as fotos pela função `excluir-conta`: ela precisa ser publicada de novo junto com
  o site (o código da função muda).
- **R-AT-3** · Outros ramos mexem em `AreaDeTrabalho.tsx`, `navegacao.ts`, `MenuLateral.tsx`, `tipos.ts` e nos testes de
  segurança: o merge tem conflito pequeno e previsível (linhas acrescentadas em pontos diferentes).
- **R-AT-4** · Portas e `node_modules/.tmp` divididos com outros agentes: `npm run e2e` e `npm run test:seguranca` podem
  cair por porta ocupada; repetir.
- **R-AT-5** · **A conta com 500 MB ou 2.000 arquivos** (D-1531, D-1546 e D-1547): o gatilho recusa com o código 53100, e
  o app diz "O espaço de fotos da conta acabou." (revisão r2 da F2, M1: antes, "Entre de novo para enviar fotos."). O app
  depende de o armazenamento pôr o código na mensagem ("database error, code: 53100"), como faz o local
  (`storage-api` v1.79); se a produção mudar isso, a conta cheia cai na frase genérica ("Não foi possível enviar agora.
  Tente de novo."), nunca na de sessão. O 018 desta versão precisa rodar de novo na produção para o código novo valer.
  Raro (cerca de 300 avaliações com 5 fotos); o app não mostra quanto da conta já foi usado.
- **R-AT-6** · **Cache do navegador** (D-1537) e **sem `nosniff`** (D-1535): riscos aceitos, escritos na spec.
- **R-AT-7** · **Envio retomável (TUS) pela metade** (D-1549, revisão r2 da F2, B2): risco aceito. Os bytes de um envio
  não terminado ficam no disco do armazenamento sem linha no banco, fora dos tetos; ninguém os lê, e o custo é só de
  armazenamento. **Para o dono conferir:** no painel do Supabase, "Storage > S3 Connection" desligado (o envio em
  partes do S3 tem o mesmo jeito; no local está desligado, no `config.toml`).

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
| T23 | Exclusão das fotos | `supabase/functions/_shared/exclusaoSupabase.ts`, `excluirConta.ts` (comentário), `src/data/servidorExcluirLigacao.test.ts`, `testes/seguranca/exclusao.test.ts`, `src/ui/antropometria/armazenamentoDeFotos.ts` (a porta e o contexto), `src/ui/casos/TelaCasos.tsx` (o plano), `src/ui/pacientes/TelaPaciente.tsx` (o paciente, D-1503) (+ testes) | CA-2489, CB-1464 | T22 |
| T24 | CSP | `src/seguranca/csp.ts`, `csp.test.ts` | CA-2491 | T2 |
| T25 | Fotos e anexos: a tela | `CartaoFotos.tsx`, `ListaDeFotos.tsx`, `QuadroDaFoto.tsx`, `CompararFotos.tsx`, `ListaDeAnexos.tsx`, `DialogoExcluirArquivo.tsx`, `armazenamentoDeFotos.ts`, `reduzirFoto.ts`, `VistaAvaliacao.tsx` e `TelaAntropometria.tsx` (o cartão no lugar do protótipo), `e2e/apoio/servidorFalso.ts` (o armazenamento falso) e `e2e/servidor-falso/fotos-avaliacao.spec.ts` (+ testes) | CA-2480 a CA-2487, CA-2490, CB-1413 a CB-1416, CB-1463, CB-1465, CB-1466, D-1503 a D-1513 | T21 a T24 |
| R1 | Revisão r1, M1 e B4: a suprailíaca da etapa 1 e a marcada | `src/domain/protocolosDeDobras.ts` (`dobrasUsadas`), `composicao.ts`, `documentoDaAvaliacao.ts`, `src/ui/caso/CamposComposicao.tsx`, `src/ui/antropometria/textosDaAvaliacao.ts` (+ testes) | CB-1480 a CB-1482, D-1520, D-1521 | T20 |
| R2 | Revisão r1, M2 e B3: as faixas da etapa 1 na tela nova, zero e negativo | `src/domain/caso.ts` (`erroDaFaixa`, `casoNasFaixas`), `historicoAntropometrico.ts`, `CampoMedida.tsx`, `CartaoPesoEstatura.tsx`, `CartaoCircunferencias.tsx`, `LinhaDeMedida.tsx`, `PainelEstimar.tsx`, `TelaAntropometria.tsx` (+ testes) | CB-1483 a CB-1485, D-1522 a D-1525 | T20 |
| R3 | Revisão r1, B1: a primeira e a atual no Histórico do celular | `TabelaAvaliacoes.tsx` (+ teste; e2e em 390 px) | CB-1486, D-1526 | T20 |
| R4 | Revisão r1, B2: texto do motor pelo sexo | `src/domain/prioridadeClinica.ts`, `metaDePerda.ts`, `pontoDePartida.ts`, `textosDaAvaliacao.ts` (o filtro da nota do idoso) (+ testes) | CB-1487, D-1527 | T20 |
| R5 | Revisão r1, B5: data local no plano sem data da consulta | `src/domain/avaliacoesDoPaciente.ts`, `TelaAntropometria.tsx`, `src/ui/AreaDeTrabalho.tsx` ("Ver exemplo") (+ testes) | CB-1488, D-1528 | T20 |
| R6 | Revisão r1, B6: duas avaliações no mesmo dia na lista | `src/domain/avaliacoesDoPaciente.ts` (o rótulo), `BarraDaAvaliacao.tsx` (+ testes) | CB-1489, D-1529 | R5 |
| R7 | Revisão r2, B1-r2: o foco na suprailíaca da etapa 1 | `src/ui/caso/CamposComposicao.tsx` (`key` fixa da posição) (+ teste em `etapa1Antropometria.test.tsx`) | CB-1460, D-1500 | R1 |
| R8 | Revisão r2, B2-r2: a meta de perda pelo sexo | `src/domain/metaDePerda.ts` (+ teste em `metaDePerda.test.ts`) | CB-1461, D-1501 | R4 |
| R9 | Data local no gráfico de peso da ficha | `src/ui/pacientes/TelaPaciente.tsx` (+ teste) | CB-1462, D-1502 | R5 |
| R10 | Revisão r1 da F2, M1: a imagem anexada entra como foto | `src/domain/fotosDaAvaliacao.ts` (`enviarAnexo`, a frase dos limites), `CartaoFotos.tsx` (+ testes; e2e `fotos-avaliacao.spec.ts`) | CB-1467, D-1530 | T25 |
| R11 | Revisão r1 da F2, M2: os bytes no servidor e na recusa | `supabase/018-fotos-avaliacao.sql` (o gatilho), `src/data/sqlFotosAvaliacao.test.ts`, `testes/seguranca/fotos.test.ts`, `src/domain/fotosDaAvaliacao.ts` (a porta `listar`, DP-AT-21), `armazenamentoDeFotos.ts`, `e2e/apoio/servidorFalso.ts` (a lista com o tamanho) (+ testes e falsos) | CB-1468, D-1531 | R10 |
| R12 | Revisão r1 da F2, B1: "Excluir" da foto com 44 px | `ListaDeFotos.tsx` (+ teste; e2e em 390 px) | CB-1469, D-1532 | T25 |
| R13 | Revisão r1 da F2, B2: setas no seletor segmentado | `design-system/componentes/navigation/SeletorSegmentado.tsx` (+ `estilo.test.tsx`) | CB-1470, D-1533 | — |
| R14 | Revisão r1 da F2, B5: nome neutro do anexo, com a data | `src/domain/fotosDaAvaliacao.ts`, `src/domain/tipos.ts` (o comentário do `nome`), `ListaDeAnexos.tsx` (+ testes; e2e) | CB-1474, D-1536 | R10 |
| R15 | Revisão r1 da F2, B3: a exclusão espera o armazenamento; o arquivo solto volta à lista | `src/domain/fotosDaAvaliacao.ts` (`religarSoltos`), `CartaoFotos.tsx`, `armazenamentoDeFotos.ts`, `src/ui/casos/TelaCasos.tsx`, `src/ui/pacientes/TelaPaciente.tsx` (+ testes) | CB-1471, CB-1472, D-1534 | R11, R14 |
| R16 | Revisão r1 da F2, B4: o tipo no servidor | `supabase/018-fotos-avaliacao.sql` (o caminho, o balde e o gatilho), `src/data/sqlFotosAvaliacao.test.ts`, `testes/seguranca/fotos.test.ts` | CB-1473, D-1535 | R11 |
| R17 | Revisão r1 da F2, B7: "Comparar fotos" sem `aria-pressed` | `CartaoFotos.tsx` (+ teste) | CB-1475, D-1538 | T25 |
| R18 | Revisão r2 da F2, M1: o código próprio da conta cheia no servidor | `supabase/018-fotos-avaliacao.sql` (o gatilho e o cabeçalho), `src/data/sqlFotosAvaliacao.test.ts`, `testes/seguranca/fotos.test.ts` | CB-1496, D-1546 | R16 |
| R19 | Revisão r2 da F2, M1: a frase de cada recusa no app | `src/domain/fotosDaAvaliacao.ts` (`ResultadoDoEnvio`, `FRASES`, `subir`), `src/ui/antropometria/armazenamentoDeFotos.ts` (`recusaDoArmazenamento`) (+ `fotosDaAvaliacao.test.ts`, `armazenamentoDeFotos.test.ts`, `fotos.test.tsx`) | CB-1496, CB-1497, CB-1415, D-1547 | R18 |
| R20 | Revisão r2 da F2, B1: marcar a autorização tira o alerta | `CartaoFotos.tsx` (+ `fotos.test.tsx`) | CB-1498, D-1548 | R10 |
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

- **T21** · `fotosDaAvaliacao.ts` reusa `tipoPeloConteudo` e `ladosPeloCabecalho` de `logoDaMarca.ts` (o mesmo leitor de
  cabeçalho da marca) e acrescenta o PDF. A porta do armazenamento (`ArmazenamentoDeFotos`) e o desenhista da foto
  (`DesenhistaDeFoto`) são interfaces do domínio; o envio (`enviarFoto`, `enviarAnexo`) decide a frase de cada recusa
  (D-1505) com uma porta falsa no teste.
- **T22** · O balde `fotos-avaliacao` (privado, 8 MB, JPEG, PNG e PDF), a função `pode_enviar_arquivo_da_avaliacao`
  (`security definer`, D-1504), as três políticas (enviar, ler, apagar), sem política de alteração, e o gatilho
  `limite_de_arquivos_da_avaliacao` (antes de gravar, trava a pasta da conta e conta de novo). Teste de texto em
  `src/data/sqlFotosAvaliacao.test.ts` e ataques em `testes/seguranca/fotos.test.ts` (a conta B, o anônimo, o tipo, o
  tamanho, a 6ª foto, o 11º anexo, o caminho fora do formato, duas abas ao mesmo tempo).
- **T23** · `apagarArquivos` da `excluir-conta` passa pelos dois baldes. O plano excluído em "Planos" e o paciente
  excluído (D-1503) apagam a pasta do plano pela porta, depois de sair do aparelho (melhor esforço).
- **T24** · `img-src` com a origem do Supabase do build; sem Supabase, nada.
- **T25** · A porta de verdade (`armazenamentoDeFotos.ts`, com o supabase-js) e o desenhista (`reduzirFoto.ts`:
  `createImageBitmap` com `imageOrientation: 'from-image'`, `<canvas>` com fundo branco, `toBlob('image/jpeg', 0.85)`)
  chegam à tela por um contexto (`ContextoDasFotos`); o teste de componente passa uma porta falsa, e sem servidor a
  porta é nula (modo local). Os quadros pedem a URL assinada de 10 minutos e pedem de novo uma vez quando a imagem
  falha (CB-1414). O e2e roda no app com o servidor falso, que ganha o armazenamento (enviar, assinar, baixar, listar,
  apagar), em 1440 e 390 px, e confere que o arquivo enviado não tem EXIF (CB-1465).

### R1 a R6 · Correções da revisão r1 (04/11/2026)

A revisão independente (rodada 1, ramo `antropometria-com-main`) reprovou por M1 e M2; os baixos B1 a B6 entram junto. As
sondas do revisor ficam fora do repositório e não mudam: provam o defeito, e os testes daqui provam a correção.

- **R1** · `dobrasUsadas(id, sexo, dobras)` no motor: as dobras cujo valor entra na conta (a resolução da D-1039), e a
  da linha do protocolo quando nenhuma tem valor (a média em Guedes e Faulkner). A tela (`dobrasNaTela`), o documento
  (o "●") e a etapa 1 (o campo da suprailíaca e o "Usada neste protocolo") usam a mesma função. `calcularComposicao`
  lê as dobras por `valoresDasDobras` (JP 3 da mulher pede a `suprailiacaAnt`), e a falta diz o nome da dobra.
- **R2** · `erroDaFaixa(campo, valor)` sai de `validarCaso` (as frases ficam iguais) e `casoNasFaixas(caso)` deixa vazio
  o que está fora da faixa: a tela nova passa por ela o plano com a ficha, e o Histórico e o documento, cada avaliação.
  `CampoMedida` ganha `faixa` e recusa zero e negativo; o texto recusado fica no campo e o plano recebe `null`.
- **R3** · A coluna da primeira data não some abaixo de 640 px; o ano das duas datas some (`max-sm:hidden`).
- **R4** · As frases do motor recebem o sexo do caso; o filtro do "Ponto de partida" aceita "Idoso:" e "Idosa:".
- **R5** · `diaLocal(new Date(atualizadoEm))` no lugar do `slice(0, 10)`; o "Ver exemplo" com `diaLocal()`.
- **R6** · `rotuloDaAvaliacao` no domínio: o sufixo "· Nª do dia" só quando o dia se repete, contado da alterada antes.

### R10 a R17 · Correções da revisão r1 da F2 (10/11/2026)

A revisão r1 da F2 reprovou por M1 e M2; os baixos B1 a B7 entram junto. B6 é só texto (D-1513 e D-1537), no commit
`docs`. Cada correção é um commit, com o teste antes (TDD).

- **R10** · `enviarAnexo` recebe o desenhista e o sexo: PDF segue como anexo; JPEG ou PNG, sem a autorização, devolve a
  frase da D-1508; com ela, vai por `enviarFoto` com o ângulo "Outra" e volta com `campo: 'fotos'`. A tela lê até 20 MB
  do anexo (o teto da foto) e acrescenta o resultado no campo que veio.
- **R11** · O gatilho soma `metadata->>'size'` (só números; sem tamanho, 0) da pasta do plano e da conta, com a trava que
  já existe. A porta troca `contar` por `listar` (DP-AT-21); a recusa conta e soma a pasta do plano. O servidor falso do
  e2e devolve o tamanho na lista. Ataque: três arquivos de 3 MB juntos; a conta com 500 MB (linhas postas pelo banco).
- **R12** · `min-w-11` no "Excluir"; o e2e mede em 390 px.
- **R13** · `tabIndex` 0 só na marcada (ou na primeira), `onKeyDown` com as setas, Home e End; o foco vai junto.
- **R14** · `proximoNomeDeAnexo` (o maior "anexo-N.pdf" mais 1); `EntradaDoAnexo` perde o `nome`; a lista mostra a data
  local do envio e o tamanho.
- **R15** · "Planos" e a ficha esperam `apagarArquivosDoPlano` e mostram a falha; a porta trata "Bucket not found" como
  pasta vazia. `religarSoltos` (puro) devolve a lista com o que a pasta tem a mais; o cartão lê a pasta ao abrir e
  aplica no plano como ele está na hora; a resposta de um envio substitui o item do mesmo caminho.
- **R16** · A função da política aceita só `anexos/<uuid>.pdf`; o balde, só `image/jpeg` e `application/pdf`; o gatilho,
  com o tipo na linha, exige `image/jpeg` em `fotos/` e `application/pdf` em `anexos/`, exatos.
- **R17** · Sem `aria-pressed`; o rótulo continua trocando.

### R18 a R20 · Correções da revisão r2 da F2 (10/11/2026)

A revisão r2 da F2 reprovou por M1; B1 entra junto, e B2 vira risco aceito (D-1549, R-AT-7), sem código. Cada correção
é um commit, com o teste antes (TDD).

- **R18** · No gatilho, a recusa dos 2.000 arquivos da conta sai do `if` das contagens do plano, e as duas recusas da
  conta (2.000 arquivos e 500 MB) usam `errcode = '53100'`; as do plano (contagem, 8 MB) e a do tipo ficam com
  `check_violation`. O cabeçalho do 018 diz a frase sem o 018. Ataque: com a conta em 500 MB e com 2.000 arquivos, a
  recusa traz "code: 53100"; os 8 MB do plano trazem "code: 23514"; o token inválido volta com 401, 403 ou `InvalidJWT`.
- **R19** · `ResultadoDoEnvio` ganha `sessao` e `conta-cheia`. A porta lê a recusa (`recusaDoArmazenamento`): sem
  status, `sem-rede`; "code: 53100" na mensagem, `conta-cheia`; 401, 403 ou `InvalidJWT`, `sessao`; o resto,
  `recusado`. `subir`: `conta-cheia` dá "O espaço de fotos da conta acabou."; `sessao`, a frase de sessão; `recusado`,
  a leitura da pasta, e sem limite nem teto (ou sem ler), "Não foi possível enviar agora. Tente de novo.".
- **R20** · Ao marcar a autorização, o alerta "Marque a autorização…" sai das fotos e dos anexos (só ele).

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
- **Faixas plausíveis** de cada medida (pesquisa 1.7 B): sem fonte; a tela não avisa valor fora delas. A tela nova só
  confere as 4 faixas que a etapa 1 já conferia (peso, estatura, cintura e panturrilha, D-1522).
- **Suprailíaca na etapa 1** (D-1520): em Jackson & Pollock 3 numa mulher, o campo é o da linha axilar anterior; o valor
  dos planos de antes continua como "linha não informada" e é o usado na conta enquanto a anterior estiver vazia.
- **Gasto de repouso no plano** (DP-AT-4): levar Cunningham para a energia do plano?

## Andamento (04/11/2026, ramo `antropometria-historico`)

T14 a T20 e C1 a C4 feitas, um commit cada (C2 e C3 separados). O pior caso (`break-ui`) rodou na tela real por um
script de Playwright fora do repositório (os dados entram pelo armazenamento do navegador, como os de verdade): nome
enorme, avaliação vazia, 350 kg e dobra de 90 mm, duas avaliações no mesmo dia, criança de 6 anos, idoso de 85,
gestante e diagnóstico longo, em 360, 390 e 1440 px. Os achados viraram CB-1454 e CB-1455. Falta a F2 (T21 a T25) e a
T26.

**Correções da revisão r2 da F2 (10/11/2026, ramo `antropometria-fotos`):** R18 a R20 feitas, um commit cada, depois do
commit `docs` das decisões (D-1546 a D-1549). B2 ficou como risco aceito (D-1549, R-AT-7), sem código. O 018 mudou: o
dono roda de novo o 018 inteiro no SQL Editor antes de publicar.

**Correções da revisão r1 da F2 (10/11/2026, ramo `antropometria-fotos`):** R10 a R17 feitas, um commit cada, depois
do commit `docs` das decisões (D-1530 a D-1538). O R14 também corrigiu o comentário do `nome` em `src/domain/tipos.ts`
(o anexo leva o nome neutro), e o R15 ganhou o teste da porta (`src/ui/antropometria/armazenamentoDeFotos.test.ts`).

**Correções da revisão r2 e F2 (10/11/2026, ramo `antropometria-fotos`):** R7 a R9 e T21 a T25 feitas, um commit cada
(mais a correção do gatilho do 018, que o ataque de 8 envios juntos mostrou). Falta o "Enviar por e-mail" (T27, F3,
bloqueada).

**Correções da revisão r1 (04/11/2026, ramo `antropometria-com-main`):** R1 a R6 feitas, um commit cada, depois do
commit `docs` das decisões. As sondas do revisor que afirmavam o defeito (S4, S10 e S12) agora falham na asserção do
defeito, e as contraprovas (os mesmos cenários com a asserção corrigida, fora do repositório) passam.

## Matriz CA × teste

Preenchida na validação (T26). Da F1 já feita: CA-2449 a CA-2456 e CB-1412 em `src/ui/antropometria/historico.test.tsx`;
CA-2457 a CA-2463, D-1489, D-1495, CB-1444 e CB-1451 em `documento.test.tsx`; a lógica do documento (CA-2459 a CA-2461,
D-1491 a D-1498, CB-1444, CB-1447) em `src/domain/documentoDaAvaliacao.test.ts`; CB-1448 em
`src/domain/persistencia.test.ts`; CB-1449 e CB-1450 em `src/domain/pontoDePartida.test.ts` (CA-2445 na tela); CB-1453 em
`pontoDePartida.test.tsx` e `textosDaAvaliacao.test.ts`; CA-2400, CA-2410, CA-2421, CA-2430, CA-2449, CA-2457,
CA-2470, CA-2471 e CB-1452 em `e2e/antropometria.spec.ts`.

Revisão r1: CB-1480 em `src/domain/composicao.test.ts` e `src/ui/caso/etapa1Antropometria.test.tsx`; CB-1481 em
`src/domain/protocolosDeDobras.test.ts`, `composicao.test.ts`, `documentoDaAvaliacao.test.ts`, `etapa1Antropometria.test.tsx`
e `src/ui/antropometria/dobras.test.tsx`; CB-1482 em `protocolosDeDobras.test.ts`, `composicao.test.ts` e
`etapa1Antropometria.test.tsx`; CB-1483 em `src/domain/caso.test.ts`, `pesoEstatura.test.tsx` e
`circunferencias.test.tsx`; CB-1484 em `caso.test.ts`, `historicoAntropometrico.test.ts`, `pesoEstatura.test.tsx` e
`documento.test.tsx`; CB-1485 em `pesoEstatura.test.tsx` e `circunferencias.test.tsx`; CB-1486 em `historico.test.tsx` e
`e2e/antropometria.spec.ts` (390 px); CB-1487 em `prioridadeClinica.test.ts`, `metaDePerda.test.ts`,
`pontoDePartida.test.ts` e `textosDaAvaliacao.test.ts`; CB-1488 em `avaliacoesDoPaciente.test.ts` e `src/App.test.tsx`;
CB-1489 em `avaliacoesDoPaciente.test.ts` e `telaAntropometria.test.tsx`.

Revisão r2: CB-1460 em `src/ui/caso/etapa1Antropometria.test.tsx`; CB-1461 em `src/domain/metaDePerda.test.ts`; CB-1462 em
`src/ui/pacientes/pacientes.test.tsx`.

F2 (fotos e anexos): CA-2480 em `src/ui/antropometria/fotos.test.tsx` e `e2e/servidor-falso/fotos-avaliacao.spec.ts`;
CA-2481 em `src/domain/fotosDaAvaliacao.test.ts`, `fotos.test.tsx` e o e2e (o <canvas> de verdade); CA-2482 a CA-2484 em
`fotosDaAvaliacao.test.ts` e `fotos.test.tsx`; CA-2485 em `fotos.test.tsx` e o e2e; CA-2486 em `fotosDaAvaliacao.test.ts`,
`fotos.test.tsx` e o e2e; CA-2487 em `fotos.test.tsx` e o e2e; CA-2488 em `src/data/sqlFotosAvaliacao.test.ts` e
`testes/seguranca/fotos.test.ts`; CA-2489 em `src/data/servidorExcluirLigacao.test.ts`, `testes/seguranca/exclusao.test.ts`,
`fotosDaAvaliacao.test.ts` e `src/ui/casos/TelaCasos.test.tsx`; CA-2490 em `fotos.test.tsx`; CA-2491 em
`src/seguranca/csp.test.ts` e o e2e (a imagem abre com a CSP do app, sem violação no console); CB-1412 (Comparar fotos)
em `fotos.test.tsx`; CB-1413 a CB-1416 em `fotosDaAvaliacao.test.ts` e `fotos.test.tsx` (CB-1416 no servidor:
`testes/seguranca/fotos.test.ts`, 8 envios juntos); CB-1463: o fundo branco do <canvas> (`reduzirFoto.ts`), sem teste
automático (o jsdom não desenha; o e2e usa JPEG); CB-1464 em `fotosDaAvaliacao.test.ts` e `pacientes.test.tsx`; CB-1465
no e2e; CB-1466 em `fotosDaAvaliacao.test.ts` e `fotos.test.tsx`.

Revisão r1 da F2: CB-1467 em `fotosDaAvaliacao.test.ts`, `fotos.test.tsx` e o e2e (a foto do celular, com GPS e aparelho
no EXIF, escolhida como anexo, sobe sem o EXIF); CB-1468 em `fotosDaAvaliacao.test.ts` (a recusa pelo tamanho),
`src/data/sqlFotosAvaliacao.test.ts` e `testes/seguranca/fotos.test.ts` (três arquivos de 3 MB juntos, 8 MB exatos, a
conta com 500 MB); CB-1469 em `fotos.test.tsx` e o e2e (390 px); CB-1470 em `design-system/componentes/estilo.test.tsx`;
CB-1471 em `src/ui/casos/TelaCasos.test.tsx`, `pacientes.test.tsx` e `armazenamentoDeFotos.test.ts`; CB-1472 em
`fotosDaAvaliacao.test.ts` e `fotos.test.tsx`; CB-1473 em `sqlFotosAvaliacao.test.ts` e `testes/seguranca/fotos.test.ts`;
CB-1474 em `fotosDaAvaliacao.test.ts`, `fotos.test.tsx` e o e2e; CB-1475 em `fotos.test.tsx`. D-1537 (o cache) é texto, sem
teste.

Revisão r2 da F2: CB-1496 em `src/data/sqlFotosAvaliacao.test.ts` (o código 53100 no gatilho),
`testes/seguranca/fotos.test.ts` (a conta com 500 MB e com 2.000 arquivos recebe "code: 53100"; o plano cheio, "code:
23514"), `armazenamentoDeFotos.test.ts` (a porta lê "code: 53100" como conta cheia), `fotosDaAvaliacao.test.ts` e
`fotos.test.tsx` (a frase, na foto e no anexo); CB-1497 e CB-1415 em `armazenamentoDeFotos.test.ts` (401, 403 e
`InvalidJWT` são a sessão; 23514, 5xx, 404 e 415, a recusa genérica), `testes/seguranca/fotos.test.ts` (o token
recusado volta como sessão), `fotosDaAvaliacao.test.ts` e `fotos.test.tsx`; CB-1498 em `fotos.test.tsx`. D-1549 (o TUS
pela metade) é risco aceito, sem teste.
