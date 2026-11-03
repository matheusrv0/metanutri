# Antropometria completa (motor) · Plano de implementação

**Spec:** `specs/antropometria-completa/SPEC.md` (03/11/2026; "apenas faça"; revisão do dono e da Mor pelas decisões
D-1000 a D-1037).

**Objetivo:** o motor da tela nova de Antropometria, puro e testado, em `src/domain`: medidas novas no plano, oito
protocolos de dobras, os indicadores com recomendação, situação e fonte, e o ponto de partida. Nenhuma tela.

**Arquitetura:** o plano ganha as 4 dobras novas em `composicao.dobras` e o grupo `medidasCorporais`
(circunferências, diâmetros, altura do joelho e semienvergadura); `completarCasoLido` completa o plano gravado antes.
Um módulo por assunto, cada um com o seu teste: `protocolosDeDobras.ts` (catálogo, equações, conversão),
`linhaDoResultado.ts` (a forma da linha "Real | Recomendação | Situação" e a classificação nas casas da tela),
`fontesAntropometria.ts` (citações), `indicadoresCorporais.ts`, `indicadoresDeGordura.ts`, `indicadoresDoBraco.ts`,
`pesoDeReferencia.ts`, `estimativas.ts`, `resultadoAntropometrico.ts` (junta as linhas), `pontoDePartida.ts` (gasto de
repouso e proteína), `prioridadeClinica.ts`, `metaDePerda.ts` e `mudancaMinima.ts`. As tabelas de Frisancho saem da
pesquisa por script para `src/data/frisancho.json`.

## Restrições

- Nenhuma dependência nova; nenhum arquivo de `src/ui`; `composicao.ts` e `antropometria.ts` não mudam de
  comportamento (o painel de hoje continua igual).
- TDD: teste primeiro, falha, código, passa. Cada teste cita o CA. Um commit por tarefa, em Conventional Commits, em
  português, com a linha `Co-Authored-By`.
- Sem `any` e sem `!`. Comentários curtos em português, com a fonte junto de cada equação. Nenhum número da pesquisa
  marcado [NV].
- `npm run check` verde no fim de cada tarefa.

## Ordem e dependências

| # | Tarefa | Arquivos | Critérios | Depende de |
|---|---|---|---|---|
| T1 | SPEC | `specs/antropometria-completa/SPEC.md` | — | — |
| T2 | PLAN | `specs/antropometria-completa/PLAN.md` | — | T1 |
| T3 | Modelo das medidas e leitura retrocompatível | `src/domain/tipos.ts`, `src/domain/caso.ts`, `src/domain/caso.test.ts`, `src/domain/persistencia.ts`, `src/domain/persistencia.test.ts`, `src/domain/duplicar.ts`, `src/domain/duplicar.test.ts`, `src/domain/composicao.ts` (só o tipo `Dobras`) | CA-2000 a CA-2003, CB-1008 | T2 |
| T4 | Fontes e a linha do resultado | `src/domain/fontesAntropometria.ts`, `src/domain/linhaDoResultado.ts`, `src/domain/linhaDoResultado.test.ts` | CA-2030, CB-1000, CB-1004 | T2 |
| T5 | Protocolos de dobras | `src/domain/protocolosDeDobras.ts`, `src/domain/protocolosDeDobras.test.ts` | CA-2010 a CA-2025, CB-1001, CB-1002 (dobras), CB-1009 a CB-1011 | T3, T4 |
| T6 | Tabelas de Frisancho | `dados-brutos/antropometria/frisancho-percentis.md`, `dados-brutos/README.md`, `scripts/dados/importar-frisancho.mjs` (+ `.d.mts`, para o teste importar o script com tipo), `src/data/frisancho.json`, `src/data/frisancho.test.ts` | CA-2044 | T2 |
| T7 | IMC, cintura, RCQ, RCE, pescoço e panturrilha | `src/domain/indicadoresCorporais.ts`, `src/domain/indicadoresCorporais.test.ts` | CA-2031 a CA-2033, CA-2036 a CA-2039, CA-2046, CB-1002, CB-1003, CB-1005, CB-1007, CB-1008 | T3, T4 |
| T8 | % de gordura, massas e soma de dobras | `src/domain/indicadoresDeGordura.ts`, `src/domain/indicadoresDeGordura.test.ts` | CA-2034, CA-2035 | T5 |
| T9 | Braço: CB, DCT, CMB, AMB, AGB e adequação | `src/domain/indicadoresDoBraco.ts`, `src/domain/indicadoresDoBraco.test.ts` | CA-2040 a CA-2043, CA-2045, CB-1006, CB-1007 | T4, T6 |
| T10 | Compleição, peso ideal, ajustado e de referência | `src/domain/pesoDeReferencia.ts`, `src/domain/pesoDeReferencia.test.ts` | CA-2047 a CA-2050 | T4 |
| T11 | Estimativas de altura e peso | `src/domain/estimativas.ts`, `src/domain/estimativas.test.ts` | CA-2051 a CA-2055 | T4 |
| T12 | Resultado completo | `src/domain/resultadoAntropometrico.ts`, `src/domain/resultadoAntropometrico.test.ts` | CA-2056 | T7 a T10 |
| T13 | Gasto de repouso e proteína | `src/domain/pontoDePartida.ts`, `src/domain/pontoDePartida.test.ts` | CA-2060 a CA-2064, CB-1013 | T8, T10 |
| T14 | Nível de prioridade | `src/domain/prioridadeClinica.ts`, `src/domain/prioridadeClinica.test.ts` | CA-2065, CA-2066 | T4 |
| T15 | Meta de perda | `src/domain/metaDePerda.ts`, `src/domain/metaDePerda.test.ts` | CA-2067 a CA-2069, CB-1012 | T14 |
| T16 | Mudança mínima detectável | `src/domain/mudancaMinima.ts`, `src/domain/mudancaMinima.test.ts` | CA-2070, CB-1014 | T4 |
| T17 | Validação | este plano (checklist), `npm run check` | todos | T3 a T16 |

## Tarefas

### T3 · Modelo das medidas e leitura retrocompatível

1. Testes: plano novo com cada campo novo `null` (CA-2000); plano gravado sem `medidasCorporais` e com 6 dobras abre
   com os mesmos valores e os novos `null`, e o parcial completa só o que falta (CA-2001); ponto da cintura com valor
   desconhecido fica como veio (CB-1008); duplicar limpa toda medida nova e copia o ponto da cintura (CA-2002); a lista
   do D-367 cobre os campos novos e a lista das medidas do dia ganha os caminhos novos (CA-2003).
2. `tipos.ts`: `PontoDaCintura`, `MedidasCorporais`, as 4 dobras novas em `ComposicaoCorporal['dobras']`,
   `Caso.medidasCorporais`.
3. `caso.ts`: `MEDIDAS_CORPORAIS_VAZIAS`, os campos novos em `criarCasoVazio` e `completarCasoLido` (completa o plano
   lido: o nível de cima, `composicao`, `composicao.dobras` e `medidasCorporais`).
4. `persistencia.ts`: a leitura usa `completarCasoLido`, com a regra de `quantidades` de hoje.
5. `duplicar.ts`: `ClassificacaoDoPlano` desce em `medidasCorporais`; `NA_DUPLICACAO` ganha cada campo novo.
6. `composicao.ts`: o tipo `Dobras` passa a ser o do plano (`ComposicaoCorporal['dobras']`, 10 dobras) e
   `DOBRAS_VAZIAS` ganha as 4 novas. Sem isso a tela de hoje não compila (ela confere a dobra da lista do protocolo
   contra as do plano). Nenhuma conta muda: os dois protocolos de hoje usam as mesmas 6 dobras.

### T4 · Fontes e a linha do resultado

1. Testes: `naPrecisao` (o valor nas casas da tela, como o `Intl.NumberFormat`); `situacaoNaFaixa` com cada tipo de
   limite (inclusivo, exclusivo, aberto) e a fronteira decidida nas casas (CA-2030, CB-1004); `medidaValida` trata 0,
   negativo, `NaN` e `Infinity` como não medido (CB-1000).
2. `fontesAntropometria.ts`: as fontes da seção 7 da spec, citação curta e completa.
3. `linhaDoResultado.ts`: os tipos `LinhaDoResultado`, `Recomendacao`, `Situacao`, `NivelDaSituacao`, `FaixaRotulada`,
   `Detalhe` e as funções acima.

### T5 · Protocolos de dobras

1. Testes, um por equação, com o caso numérico da pesquisa (CA-2012 a CA-2021); a grade de Durnin & Womersley (24
   linhas) e a Tabela 9 (CA-2016); conversões (CA-2022, CA-2023); massas e soma (CA-2024); fora da população,
   implausível e gestação (CA-2025); catálogo e aplicação (CA-2010, CA-2011); `jackson-pollock-3` e `faulkner-4` contra
   `calcularComposicao` (CA-2015); protocolo desconhecido (CB-1009).
2. `protocolosDeDobras.ts`: `PROTOCOLOS_DE_DOBRAS` (metadados por sexo), `aplicacaoDoProtocolo`, `calcularProtocolo`,
   `siri`, `brozek`, `lohman`, `converterDensidade`.

### T6 · Tabelas de Frisancho

1. `dados-brutos/antropometria/frisancho-percentis.md`: cópia, sem edição, das seções 3.18.1, 3.18.2 e 3.18.4 da
   pesquisa; o README de `dados-brutos` ganha a linha.
2. `scripts/dados/importar-frisancho.mjs`: lê os blocos CSV pelos títulos e grava `src/data/frisancho.json` (1990: CB,
   DCT, AMB corrigida e AGB; 1981: CMB e AMB sem correção), nas unidades da fonte, com a fonte e a marca de cada tabela.
3. Teste `src/data/frisancho.test.ts`: ordem crescente, faixas de 1 a 74,9 sem buraco, as células resolvidas (CA-2044).

### T7 · IMC, cintura, RCQ, RCE, pescoço e panturrilha

1. Testes pelos CA-2031 a CA-2033, CA-2036 a CA-2039 e CA-2046, com os casos de borda CB-1002, CB-1003, CB-1005,
   CB-1007 e CB-1008.
2. `indicadoresCorporais.ts`: `linhaImc`, `linhaCintura`, `linhaRcq`, `linhaRce`, `linhaPescoco`, `linhaPanturrilha` e
   `faseDaVida`. O IMC da criança e da gestante reaproveita `avaliarAntropometria`; o do adulto e do idoso usa as faixas
   de `antropometria.json`, decididas nas 2 casas.

### T8 · % de gordura, massas e soma de dobras

1. Testes pelos CA-2034 e CA-2035 e pela origem do % (D-1019).
2. `indicadoresDeGordura.ts`: `gorduraDoCaso` (dobras, senão bioimpedância), `linhaGordura` (Gallagher 2000),
   `linhaMassaGorda`, `linhaMassaMagra`, `linhaSomaDeDobras`.

### T9 · Braço

1. Testes pelos CA-2040 a CA-2043 e CA-2045, CB-1006 e CB-1007; a regressão do Dietbox (CB 35 e DCT 13,5).
2. `indicadoresDoBraco.ts`: `medidasDoBraco` (fórmulas), `linhaCb`, `linhaDct`, `linhaCmb`, `linhaAmb`, `linhaAgb`,
   `linhaAdequacao` (CB, DCT, CMB) e a leitura das tabelas de Frisancho (com a conversão de unidade de 1981).

### T10 · Compleição, peso ideal, ajustado e de referência

1. Testes pelos CA-2047 a CA-2050.
2. `pesoDeReferencia.ts`: `linhaCompleicao`, `pesoIdeal`, `pesoAjustado`, `pesoDeReferencia`.

### T11 · Estimativas de altura e peso

1. Testes pelos CA-2051 a CA-2055.
2. `estimativas.ts`: `chumlea1985Altura`, `chumlea1988Peso`, `rabitoAlturaVII`, `rabitoPesoIII`, `rabitoPesoIV`,
   `rabitoPesoV`, `estimativasDeAltura`, `estimativasDePeso`.

### T12 · Resultado completo

1. Teste pelo CA-2056: a ordem das linhas, a linha que não vale não vem, a que falta dado diz o quê.
2. `resultadoAntropometrico.ts`: `resultadoAntropometrico(caso, opcoes)`.

### T13 · Gasto de repouso e proteína

1. Testes pelos CA-2060 a CA-2064 e CB-1013.
2. `pontoDePartida.ts`: `gastoDeRepouso`, `proteinaPorObjetivo`.

### T14 · Nível de prioridade

1. Testes pelos 8 casos da pesquisa (CA-2065) e o CA-2066.
2. `prioridadeClinica.ts`: `nivelDePrioridade`.

### T15 · Meta de perda

1. Testes pelos CA-2067 a CA-2069 e CB-1012.
2. `metaDePerda.ts`: `pesoAlvo`, `metaDePerda`.

### T16 · Mudança mínima detectável

1. Testes pelo CA-2070 e CB-1014.
2. `mudancaMinima.ts`: `mudancaMinimaDetectavel`, `compararAvaliacoes`.

### T17 · Validação

`npm run check` (lint, typecheck e testes) e a checklist abaixo, CA por CA, com o teste que o cobre.

## Riscos e decisões para revisar

- **Revisão clínica (Mor):** a conversão automática (D-1009: Lohman até 19 anos, Siri depois, também na mulher); o
  esquema de percentis do braço (D-1025, São Camilo, [V1]); o IMC-alvo do idoso (D-1027: 24,5); o peso ajustado sobre o
  IMC 25 (D-1027, igual à água); a proteína por objetivo (D-1032, com linhas que são proposta nossa); o nível de
  prioridade e a meta de perda (D-1033, D-1034: regras montadas pela pesquisa a partir de fontes fortes e limitadas);
  a panturrilha do idoso continua Pagotto 2018 (D-1029), e a pesquisa sugere rever para o MS < 31.
- **Tipo do protocolo gravado:** continua com os dois de hoje (D-1007). A tela nova precisa ampliar o tipo de
  `composicao.protocolo` para `IdProtocolo` e trocar o seletor; sem isso, os protocolos novos não ficam gravados.
- **Entradas que o plano ainda não guarda:** maturação sexual e grupo do estudo (Slaughter), perfil de atividade,
  doença aguda ou crônica, função renal, % de gordura alvo, ETM do avaliador. O motor as recebe; a tela decide onde
  perguntar.
- **Divergência consciente com o painel de hoje:** o painel mostra o IMC com 1 casa e classifica pelo valor cru; o
  motor novo decide nas 2 casas que mostra (D-1001). Só muda em valores como 24,996.
- **Tabelas de Frisancho 1990** vêm de reproduções (maioria de três manuais), não do livro; o teste de ordem crescente
  e as células resolvidas pela pesquisa são a defesa contra erro de transcrição.

## Checklist de validação (T17)

Preenchida no fim da implementação: cada CA com o arquivo de teste que o cobre.

| CA | Teste |
|---|---|
| CA-2000 a CA-2003 | `caso.test.ts`, `persistencia.test.ts`, `duplicar.test.ts` |
| CA-2010 a CA-2025 | `protocolosDeDobras.test.ts` |
| CA-2030 | `linhaDoResultado.test.ts` |
| CA-2031 a CA-2033, CA-2036 a CA-2039, CA-2046 | `indicadoresCorporais.test.ts` |
| CA-2034, CA-2035 | `indicadoresDeGordura.test.ts` |
| CA-2040 a CA-2043, CA-2045 | `indicadoresDoBraco.test.ts` |
| CA-2044 | `src/data/frisancho.test.ts` |
| CA-2047 a CA-2050 | `pesoDeReferencia.test.ts` |
| CA-2051 a CA-2055 | `estimativas.test.ts` |
| CA-2056 | `resultadoAntropometrico.test.ts` |
| CA-2060 a CA-2064 | `pontoDePartida.test.ts` |
| CA-2065, CA-2066 | `prioridadeClinica.test.ts` |
| CA-2067 a CA-2069 | `metaDePerda.test.ts` |
| CA-2070 | `mudancaMinima.test.ts` |
