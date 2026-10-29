# Base ampliada · Plano de implementação

**Spec:** `specs/base-ampliada/SPEC.md` (pedida em 29/10/2026; "apenas faça"; aprovação pelas telas).

**Objetivo:** 614 alimentos genéricos do USDA (SR Legacy e Foundation), com nome, grupo e preparo da TACO, entram na
Base MetaNutri, carregados sob demanda; a busca os mostra depois da TACO; o Cobrir usa só os 98 `sugerivel`. A fase 2
(Open Food Facts) fica só na spec (seção 6).

**Arquitetura:** três scripts em `scripts/dados/` (leitura dos zips, peneira, importação) geram
`src/data/base-ampliada.json` e o cabeçalho pequeno `base-ampliada-fonte.json`. Um módulo do domínio,
`src/domain/baseAmpliada.ts`, transforma o arquivo em `Alimento` (com o campo novo `ampliada`) e diz se um id ou um
plano é dela. `tabelas.ts` ganha o registro da base ampliada (como os produtos), e as listas de busca, de sugestão e
de Tabela de alimentos passam a incluí-la. `src/ui/estado/baseAmpliada.ts` pede o arquivo por `import()` (pedaço
separado), registra e avisa a interface; `usarBaseAmpliada.ts` é o gancho que redesenha quem depende dela. A área de
trabalho segura o plano que tem alimento da base ampliada até ela chegar (D-711).

## Restrições

- Nenhuma dependência nova: os scripts usam `node:zlib`, `node:crypto` e `node:fs`.
- Nada muda em `alimentos.json`, `complemento-usda.json`, `macros-usda.json`, `medidas-caseiras.json` nem em
  `prescritivel.ts`. Nenhum número escrito à mão.
- TDD: teste primeiro, falha, código, passa. `npm run check` verde no fim de cada tarefa; um commit por tarefa, em
  Conventional Commits, em português, com a linha `Co-Authored-By`.
- Sem `any` e sem `!`; biblioteca pelo alias `@ds/...`; cor e espaço por token.

## Ordem e dependências

| # | Tarefa | Arquivos | Critérios | Depende de |
|---|---|---|---|---|
| T1 | Scripts, curadoria e arquivos gerados | `scripts/dados/usda-fonte.mjs` (+ `.d.mts`), `preselecionar-usda.mjs`, `importar-base-ampliada.mjs` (+ `.d.mts`), `dados-brutos/usda/regras-da-curadoria.md`, `dados-brutos/usda/curadoria-base-ampliada.json`, `src/data/base-ampliada.json`, `src/data/base-ampliada-fonte.json`, `src/data/base-ampliada.test.ts`, `.gitignore` (cache), `dados-brutos/README.md` | CA-1700 a CA-1710, CB-700, CB-701, CB-703 | — |
| T2 | Domínio: o alimento da base ampliada, registro e listas | `src/domain/tipos.ts`, `src/domain/baseAmpliada.ts` (+ teste), `src/domain/tabelas.ts`, `src/domain/tabelas.test.ts`, `src/domain/nomeParaPaciente.ts` (+ teste) | CA-1715, CA-1720, CB-702, CB-705 | T1 |
| T3 | Busca e medidas | `src/domain/busca.ts`, `src/domain/buscaAmpliada.test.ts` (novo) | CA-1712 a CA-1714, CB-706, CB-711, CB-712 | T2 |
| T4 | Tabela de alimentos e ficha (domínio) | `src/domain/catalogo.ts`, `src/domain/catalogo.test.ts` | CA-1718, CA-1719 (domínio) | T2 |
| T5 | Restrições | `src/domain/restricoesDaBase.ts`, `src/domain/restricoesAmpliada.test.ts` (novo) | CA-1723, CB-710 | T2 |
| T6 | Cobrir | `src/domain/cobrir.ts` (porções de grupo), `src/domain/cobrirAmpliada.test.ts` (novo), `src/domain/cobrirAntesDepois.test.ts` (novo) | CA-1724 a CA-1727, CB-709 | T2, T3 |
| T7 | Carregamento sob demanda e a espera do plano | `src/ui/estado/baseAmpliada.ts` (+ teste), `src/ui/estado/usarBaseAmpliada.ts`, `src/ui/AreaDeTrabalho.tsx`, `src/ui/plano/EsperaDaBase.tsx` (novo, + teste), `src/ui/plano/EntradaRapida.tsx`, `src/ui/plano/DialogoSugestoes.tsx`, `src/ui/adequacao/GavetaCobrir.tsx`, `src/ui/exportar/FolhaDieta.tsx`, `src/ui/adequacao/TelaAdequacao.tsx` (nome do oculto), `vitest.setup.ts` | CA-1716, CA-1717, CB-704, CB-708 | T2 |
| T8 | Tabela de alimentos e ficha (tela) | `src/ui/alimentos/TelaAlimentos.tsx`, `src/ui/alimentos/TelaAlimentosAmpliada.test.tsx` (novo) | CA-1718, CA-1719, CB-707 | T4, T7 |
| T9 | Fontes da base | `src/domain/baseMetanutri.ts`, `baseMetanutri.test.ts`, `src/ui/publico/TelaFontes.tsx`, `TelaFontes.test.tsx`, `THIRD_PARTY_NOTICES.md` | CA-1721, CA-1722 | T1 |
| T10 | Lista de conferência | `specs/base-ampliada/lista-de-conferencia.md`, `src/data/base-ampliada-conferencia.test.ts` | CA-1711 | T1 |
| T11 | Navegador e validação | `e2e/base-ampliada.spec.ts` (novo), medições, relatório | CA-1712, CA-1716 a CA-1718, CA-1724 (no navegador) | T1 a T10 |

## Tarefas

### T1 · Scripts, curadoria e arquivos gerados

1. Teste `src/data/base-ampliada.test.ts`: cabeçalho e contagens (CA-1700); ids, fdcIds e conjunto (CA-1701); nome,
   grupo, preparo e paciente (CA-1702); faixa (CA-1703); energia (CA-1704, com `energiaIncoerente` do app); tilápia
   (CA-1705); complemento e `naoCopiar` contra a curadoria (CA-1706, CA-1710); `montarBase` com curadoria e USDA falsos
   escritos no teste: as recusas e a mesma saída duas vezes (CA-1707, CB-701); `valoresDoAlimento` com as conversões
   (CA-1708, CB-703); `medidasDaCuradoria` (CA-1709).
2. Scripts (`usda-fonte.mjs`, `preselecionar-usda.mjs`, `importar-base-ampliada.mjs`) e as declarações `.d.mts`
   para o teste importar com tipo. O cache `dados-brutos/cache/` vai para o `.gitignore`.
3. Curadoria: 17 lotes por subagentes com o glossário, 5 revisões independentes, as correções aplicadas; gerar os dois
   arquivos e commitar.

### T2 · Domínio

1. Testes: `decodificarBaseAmpliada` monta o `Alimento` com as 29 chaves, `tracos` vazio, `medidas`, `unidade` ml,
   `ampliada` (fdcId, conjunto, versão, nome original, nome para o paciente, `sugerivel`, complemento); `ehDaBaseAmpliada`
   e `planoUsaBaseAmpliada` (item, substituto e ingrediente de receita); `registrarBaseAmpliada`:
   `buscarAlimento(100044)` acha a tilápia, `alimentosComProdutos` e `alimentosDaBase` a incluem, `alimentosParaSugerir`
   só com `sugerivel`; os totais de um plano com ela (CA-1715); `nomeParaPaciente` da curadoria (CA-1720).
2. `tipos.ts`: o campo `ampliada`. `baseAmpliada.ts`, `tabelas.ts`, `nomeParaPaciente.ts`.

### T3 · Busca e medidas

1. Testes (`buscaAmpliada.test.ts`): "150 tilápia", "1 filé de tilápia" (CA-1712); os 40 casos do `buscaReal.test.ts`
   continuam com o mesmo 1º resultado com a base registrada, e nenhum da base ampliada antes de um da TACO que casa
   (CA-1713); o uso da conta vence a origem (CA-1714); medida própria num alimento da base ampliada (CB-706); kefir em
   ml (CB-711); termo de uma letra (CB-712).
2. `busca.ts`: medidas do alimento que as traz (próprio e base ampliada); critério de origem depois do uso.

### T4 · Catálogo

1. Testes: categorias e resumo contam a base ampliada registrada; `composicaoDe` da tilápia com as 26 linhas sem marca
   USDA; de um Foundation completado, a marca SR nas chaves do complemento (CA-1718, CA-1719).
2. `catalogo.ts`: `alimentosDaBase()`; `LinhaDeComposicao.sr`.

### T5 · Restrições

1. Testes: alergia a peixe pega a tilápia (grupo e nome) e ela não entra no Cobrir; soja pega tempeh, edamame e tofu;
   glúten pega espelta (CA-1723); nenhum `sugerivel` é peixe de mercúrio nem fígado (CB-710).
2. `restricoesDaBase.ts`: os termos novos.

### T6 · Cobrir

1. Testes: nenhum não `sugerivel` (CA-1724); cada `sugerivel` passa por `ehPrescritivel`, tem porção de grupo e não é
   miúdo, frito, cru, mercúrio, pão, bebida ou ingrediente (CA-1725); as 21 linhas no exemplo e no vazio, chave ligada e
   desligada, sem passar da porção do grupo (CA-1726); a tabela de antes e depois (CA-1727).
2. `cobrir.ts`: os nomes novos nas porções de grupo (semente e chia com oleaginosa, quinoa e milho verde com cereal,
   tubérculo assado como cozido).

### T7 · Carregamento e espera

1. Testes: o carregador registra a base uma vez, avisa quem está inscrito, e o erro fica no estado com "tentar de
   novo" (CA-1716, CB-704); `EsperaDaBase` mostra "Carregando…" e o erro com o botão (CA-1717).
2. `src/ui/estado/baseAmpliada.ts` (o `import()`), `usarBaseAmpliada.ts`, a espera na área de trabalho, e a versão da
   base nos `useMemo` da busca e do Cobrir. Nos testes, o carregamento automático fica desligado (`vitest.setup.ts`); o
   teste que precisa da base a registra.

### T8 · Tela da Tabela de alimentos

1. Testes: frase de cima com o total; "Base MetaNutri" com a tilápia; ficha com "filé · 87 g", o rodapé e sem "Sem dado
   de vitamina D"; marca SR (CA-1718, CA-1719); "Copiar para Meus alimentos" (CB-707).
2. `TelaAlimentos.tsx`.

### T9 · Fontes da base

1. Testes: a fonte nova e a frase contada (CA-1721); nenhum texto público cita USDA fora de Fontes (CA-1722, o teste de
   textos proibidos que já existe).
2. `baseMetanutri.ts` (lê `base-ampliada-fonte.json`), `TelaFontes.tsx`, `THIRD_PARTY_NOTICES.md`.

### T10 · Lista de conferência

1. Teste com a lista (217 itens, termo de busca e "coberto" ou "falta: motivo") contra a base ampliada (CA-1711).
2. `lista-de-conferencia.md` com a mesma lista.

### T11 · Navegador e validação

1. `e2e/base-ampliada.spec.ts`: "150 tilápia" na entrada rápida do exemplo entra no plano; a ficha da tilápia na Tabela
   de alimentos; o Cobrir do ferro no exemplo abre com sugestões e nenhuma da base ampliada sem `sugerivel`.
2. `npm run check`, `npm run e2e` (busca, Cobrir e o novo), `npm run test:csp`, `npm run build:app`; o tamanho do
   pedaço da base e da entrada principal antes e depois; o tempo de abertura (primeira tela) antes e depois.

## Matriz critério → teste

| Critério | Teste |
|---|---|
| CA-1700 a CA-1710, CB-700, CB-701, CB-703 | `src/data/base-ampliada.test.ts` |
| CA-1711 | `src/data/base-ampliada-conferencia.test.ts` |
| CA-1712 a CA-1714, CB-706, CB-711, CB-712 | `src/domain/buscaAmpliada.test.ts`; CA-1712 também em `e2e/base-ampliada.spec.ts` |
| CA-1715, CB-702, CB-705 | `src/domain/baseAmpliada.test.ts` |
| CA-1716, CA-1717, CB-704, CB-708 | `src/ui/estado/baseAmpliada.test.ts`, `src/ui/plano/EsperaDaBase.test.tsx`; CA-1716 em `e2e/base-ampliada.spec.ts` |
| CA-1718, CA-1719, CB-707 | `src/domain/catalogo.test.ts`, `src/ui/alimentos/TelaAlimentosAmpliada.test.tsx`; CA-1718 em `e2e/base-ampliada.spec.ts` |
| CA-1720 | `src/domain/baseAmpliada.test.ts` (nome na folha e no link) |
| CA-1721, CA-1722 | `src/domain/baseMetanutri.test.ts`, `src/ui/publico/TelaFontes.test.tsx`, `src/seo/textosProibidos.test.ts` |
| CA-1723, CB-710 | `src/domain/restricoesAmpliada.test.ts` |
| CA-1724 a CA-1727, CB-709 | `src/domain/cobrirAmpliada.test.ts`, `src/domain/cobrirAntesDepois.test.ts`; CA-1724 em `e2e/base-ampliada.spec.ts` |

## Riscos e decisões para o dono revisar

- D-705: 614 alimentos, não "alguns milhares" (os milhares são a fase 2).
- D-711: o plano com alimento novo espera a base no primeiro acesso.
- D-716: os 98 `sugerivel` (lista em `src/data/base-ampliada.json`, campo `sugerivel`) para a parceira conferir.
- D-701: a Foundation de outubro de 2026 saiu ontem; o CSV dela veio incompleto, e o JSON é o arquivo usado.
- Fase 2: a recomendação (b), arquivos estáticos.
