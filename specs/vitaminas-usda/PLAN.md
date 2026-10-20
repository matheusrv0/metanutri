# Vitaminas do USDA · Plano de implementação

**Spec:** `specs/vitaminas-usda/SPEC.md` (pedida em 20/10/2026; aprovação pelas telas).

**Objetivo:** vitamina D, B12, folato, vitamina E e selênio (e gordura trans, só informativa) vindos do USDA
FoodData Central entram na base ao carregar, sem mexer na TACO; a adequação passa a 21 linhas, o Cobrir funciona
para elas e a ficha do alimento diz de onde veio cada valor.

**Arquitetura:** um script em `scripts/dados/` (como os outros importadores) lê a proposta revisada, confere e grava
`src/data/complemento-usda.json`. Um módulo novo do domínio, `src/domain/complementoUsda.ts`, junta o complemento aos
alimentos da TACO; `tabelas.ts` usa a junção ao montar `ALIMENTOS`. As listas de chaves (`CHAVES_NUTRIENTES`,
`MICRONUTRIENTES_ADEQUACAO`) ganham as chaves novas, e tudo o que soma, lista ou exporta já percorre essas listas.
A ficha do alimento (`catalogo.ts` e `TelaAlimentos.tsx`) mostra as seis linhas com a marca USDA. Fontes da base e
Ajuda ganham o texto novo.

## Restrições

- Nenhuma dependência nova. Nada em `alimentos.json`, `dri.json`, `prescritivel.ts`, `cobrir.ts` (a regra e as
  porções ficam), `sugestoes.ts`, na folha impressa nem no armazenamento (nenhuma chave nova guardada).
- TDD: teste primeiro, ver falhar, código, ver passar. `npm run check` verde no fim de cada tarefa; um commit por
  tarefa, em Conventional Commits, em português.
- Biblioteca pelo alias `@ds/...`; cor e espaço por token; Manrope; um componente por arquivo; sem `any` e sem `!`.
  Antes da UI, a skill `impeccable` (craft-floor).

## Ordem e dependências

| # | Tarefa | Arquivos | Critérios | Depende de |
|---|---|---|---|---|
| T1 | Script e arquivo do complemento | `scripts/dados/importar-usda.mjs` (novo), `src/data/complemento-usda.json` (novo, gerado), `src/data/complemento-usda.test.ts` (novo) | CA-940 a CA-947, CB-307, CB-308 | — |
| T2 | Chaves novas, junção na carga e totais | `src/domain/tipos.ts`, `src/domain/complementoUsda.ts` (novo, + teste), `src/domain/tabelas.ts`, `src/domain/tabelas.test.ts`, `src/domain/totais.ts`, `src/domain/totais.test.ts` | CA-948, CA-949, CA-950, CB-300, CB-301, CB-302 | T1 |
| T3 | Produto de rótulo com chaves nulas; dado antigo | `src/domain/produtos.ts`, `src/domain/produtos.test.ts` | CA-951, CA-952, CB-304, CB-305 | T2 |
| T4 | Adequação com 21 linhas e o Cobrir das novas | `src/domain/adequacao.ts`, `adequacao.test.ts`, `cobrir.test.ts`; testes da UI que contavam 16 (`MicrosDoDia.test.tsx`, `TelaAdequacao.test.tsx`) e os comentários de `MicrosDoDia.tsx` | CA-953 a CA-958, CA-966 (parte), CB-303, CB-306 | T2 |
| T5 | Ficha do alimento com a marca USDA | `src/domain/catalogo.ts`, `catalogo.test.ts`, `src/domain/completude.ts` (rótulos), `src/ui/alimentos/TelaAlimentos.tsx`, `TelaAlimentos.test.tsx` | CA-959 a CA-962, CB-309 | T2 |
| T6 | Fontes da base, Ajuda e vitrine | `src/domain/baseMetanutri.ts`, `baseMetanutri.test.ts`, `src/domain/complementoUsda.ts` (mês da versão), `src/ui/publico/TelaFontes.tsx`, `TelaFontes.test.tsx`, `src/ui/ajuda/TelaAjuda.tsx`, `TelaAjuda.test.tsx`, `src/domain/vitrine.ts`, `e2e/publico.spec.ts` (quatro links) | CA-963 a CA-966 | T2 |
| T7 | Exportação com 21 linhas; as cinco no cartão e na tabela | `src/export/copiar-tabela.test.ts`, `src/export/docx.test.ts`, `src/ui/adequacao/MicrosDoDia.test.tsx`, `src/ui/adequacao/TelaAdequacao.test.tsx` | CA-958, CA-967, CA-968 | T4 |
| T8 | Navegador e validação | `e2e/vitaminas-usda.spec.ts` (novo), `THIRD_PARTY_NOTICES.md` (a fonte do USDA, como as outras bases), prints, relatório | CA-969, CB-309, todos | T1 a T7 |

## Tarefas

### T1 · Script e arquivo do complemento

1. Teste (`complemento-usda.test.ts`): cabeçalho (CA-940), chaves e unidades contra o `dri.json` (CA-941), cada
   alimento (CA-942), cada valor e faixa (CA-943), 308 itens e ausência dos de confiança baixa e das preparações
   (CA-944), fortificação (CA-945), regras do dono (CA-946). Depois, o script contra uma proposta pequena escrita no
   teste, numa pasta temporária: só alta e média, valores copiados, conjunto e versão, ajuste, mesmo arquivo nas
   duas rodadas (CA-947); e as recusas (CB-307, CB-308), sem gravar nada.
2. Script `importar-usda.mjs <proposta.json> [saída]`, saída padrão `src/data/complemento-usda.json`; confere os ids
   contra `alimentos.json`; cabeçalho com as constantes da fonte (citação, conjuntos, SHA-256, download em
   2026-10-20); JSON com 1 espaço, como os outros arquivos de `src/data`.
3. Gerar o arquivo a partir de `scratchpad/usda/proposta.json` e commitar.

### T2 · Chaves novas, junção na carga e totais

1. Teste do módulo novo: alimento com equivalente ganha os valores e a origem; sem equivalente fica com as seis
   nulas e sem origem; a TACO não muda (CA-948, CA-949, CB-301, CB-302). Teste de `tabelas.ts` com a base real
   (salmão, cuscuz, aveia). Teste dos totais com as chaves novas e "sem dado" (CA-950, CB-300).
2. `tipos.ts`: as seis chaves em `ChaveNutrienteAlimento`; `OrigemUsda` e `usda?` em `Alimento`.
3. `complementoUsda.ts`: `CHAVES_USDA`, `FONTE_USDA` (do cabeçalho), `juntarComplemento(alimentos, complemento)`.
4. `tabelas.ts`: `ALIMENTOS` sai da junção. `totais.ts`: as seis em `CHAVES_NUTRIENTES`.

### T3 · Produto de rótulo e dado antigo

1. Teste: produto vira alimento com todas as chaves de `CHAVES_NUTRIENTES`, as fora do rótulo nulas; no plano, as
   cinco novas contam "sem dado" e nenhum total é `NaN` (CA-951, CB-304). Produto e plano guardados no formato de
   antes abrem e somam (CA-952, CB-305).
2. `produtoComoAlimento` parte de todas as chaves nulas.

### T4 · Adequação com 21 linhas e o Cobrir

1. Testes: 21 linhas na ordem do D-304, com referência em todos os estágios (CA-953); selênio acima do UL e ‡ no
   folato e na vitamina E (CA-954, CB-306); Cobrir da vitamina D e da B12 no plano vazio da Maria (CA-955, CA-956);
   o CA-657 e o CA-667 com as 21 e a castanha até 30 g (CA-957); cartão e tabela com as novas, "Todos os 21 na meta."
   e "Ver os N na meta" contando as 21 (CA-958). Os testes que diziam 16 passam a usar o tamanho da lista (CA-966).
2. `MICRONUTRIENTES_ADEQUACAO` com as cinco novas; comentários de `MicrosDoDia.tsx` sem o "16".

### T5 · Ficha do alimento

1. Skill `impeccable`, `reference/craft-floor.md`.
2. Testes: `composicaoDe` devolve as 20 da TACO e, com origem USDA, as seis do complemento marcadas; sem origem, só
   as 20 (CA-959, CA-961); completude continua em 20 (CA-962). Tela: marca "USDA" nos valores, texto para leitor de
   tela, rodapé com o `fdcId`, linha única sem equivalente, ficha vazia sem número (CA-959 a CA-962).
3. `catalogo.ts`: linhas do complemento com `usda: true`; `completude.ts`: rótulos das seis (sem mudar
   `NUTRIENTES_CONFERIDOS`). `TelaAlimentos.tsx`: marca, rodapé e linha única.

### T6 · Fontes da base, Ajuda e vitrine

1. Testes: Fontes com a quarta fonte e a frase contada (CA-963, CA-964); Ajuda com o limite novo e sem a frase
   antiga (CA-965); área pública com 21 (CA-966).
2. `baseMetanutri.ts`: fonte do USDA (citação e versões vindas do cabeçalho do complemento) e `comComplementoUsda` no
   resumo; `TelaFontes.tsx`: frase de abertura; `TelaAjuda.tsx`: o limite; `vitrine.ts`: saem `LACUNAS_DA_BASE` e
   `adequacaoDoExemplo`, que ninguém usa e diziam que a base não tem vitamina D.

### T7 · Exportação e as cinco na tela

1. Testes: "Copiar tabela" e o Memorial com a adequação real de um plano com 21 linhas e "*" (CA-967, CA-968); o
   cartão da etapa 2 e a tabela da etapa 3 com as cinco novas e o † num plano de cuscuz (CA-958). O código já
   percorre as linhas; os testes passam de primeira e ficam como trava.

### Ajustes feitos durante a implementação (20/10/2026)

- T4: os testes do cartão e da tabela que dependiam do exemplo trocam de nutriente (cálcio, vitamina E, vitamina D)
  ou tiram a castanha do exemplo, porque com o selênio do USDA o exemplo passa do UL de selênio (R-301). O teste
  "nenhuma sugestão passa da porção do grupo" (`cobrir.test.ts`) passa a cobrar a porção de corte gordo só de carne:
  o salmão com pele, que agora aparece para a vitamina D, é peixe, e a regra (D-199b) é de carne e ave.
- T3: o teste novo mostrou que o produto de rótulo já deixava `NaN` nos totais para as chaves fora do rótulo
  (colesterol, vitamina A). A correção é a mesma do D-303.

### T8 · Navegador e validação

1. `e2e/vitaminas-usda.spec.ts`: ficha do salmão com USDA, linha "Vitamina D" na etapa 3 do exemplo, Cobrir da
   vitamina D com sugestões, ficha a 360 px sem rolar para o lado (CA-969, CB-309).
2. `npm run check`, `npx playwright test` (configuração temporária numa porta própria), `npm run build`.
3. Prints de depois (1280 e 390): tabela da etapa 3, cartão da etapa 2, Cobrir da vitamina D e da B12, ficha com a
   marca USDA, ficha sem equivalente, Fontes da base. Relatório.

## Rodada do coordenador (20/10/2026)

| # | Tarefa | Arquivos | Critérios |
|---|---|---|---|
| R1 | Uma castanha no exemplo; aviso de limite só quando o alimento traz o nutriente | `src/domain/exemplo.ts`, `exemplo.test.ts`, `src/domain/cobrir.ts` (só o aviso), `cobrir.test.ts`; testes do cartão e da tabela que tiravam a castanha (`MicrosDoDia.test.tsx`, `TelaAdequacao.test.tsx`) voltam ao exemplo | CA-957b, CA-957c |
| R2 | Porção máxima de ovo no Cobrir | `src/domain/cobrir.ts` (`PORCOES_POR_GRUPO`), `cobrir.test.ts` | CA-957a |
| R3 | `PRODUCT.md` com 21 | `PRODUCT.md` | CA-966a |

Um commit por item, TDD; depois `npm run check`, o e2e afetado (planejador, impressão do plano, vitaminas-usda) e
`npm run build`.

## Validação (20/10/2026)

- `npm run check`: lint sem erro (1 aviso antigo, em `MolduraPublica.tsx`), typecheck limpo, 197 arquivos e 3.445
  testes passando.
- `npx playwright test` (configuração temporária na porta 4471, apagada depois): 67 passando.
- `npm run build`: limpo; o pacote principal cresce 64 kB (7,5 kB comprimido) com o complemento.
- Cada critério tem teste: CA-940 a CA-947 em `complemento-usda.test.ts`; CA-948 a CA-950 em `complementoUsda.test.ts`
  e `totais.test.ts`; CA-951 e CA-952 em `produtos.test.ts`; CA-953 a CA-957 em `adequacao.test.ts` e
  `cobrir.test.ts`; CA-958 em `MicrosDoDia.test.tsx` e `TelaAdequacao.test.tsx`; CA-959 a CA-962 em
  `catalogo.test.ts` e `TelaAlimentos.test.tsx`; CA-963 a CA-966 em `baseMetanutri.test.ts`, `TelaFontes.test.tsx`,
  `TelaAjuda.test.tsx` e `TelaInicio.test.tsx`; CA-967 e CA-968 em `copiar-tabela.test.ts` e `docx.test.ts`; CA-969 e
  CB-309 em `e2e/vitaminas-usda.spec.ts`.

## Riscos e decisões para o dono revisar

- D-307 (completude continua em 20) e D-308 (a marca USDA é a única fonte nomeada fora de Fontes da base).
- R-301: o selênio do plano de exemplo com 15 g de castanha-do-pará.
- R-302: a vitamina D quase sempre no cartão da etapa 2.
- Se algum teste de outra spec travar por causa das linhas novas (por exemplo uma contagem do exemplo), o teste
  passa a usar a lista; nenhum comportamento antigo muda de propósito.
