# PLAN — Alimentos e gramaturas

**Spec de origem:** `./SPEC.md` (D-370 a D-389, CA-1100 a CA-1163, CB-360 a CB-379)
**Status:** pedida pelo dono em 21/10/2026; aprovação pelas telas antes de publicar. Seis tarefas, uma por commit, na
ordem do coordenador. Base: `main` 78c0157.

## Abordagem

1. **Busca e leitura da entrada** ficam em `busca.ts` (puro): `interpretarEntrada` passa a devolver a medida pedida
   (nome inteiro ou curto), a quantidade (número, palavra ou fração) e a unidade (g ou ml); `buscarAlimentos` resolve a
   medida por alimento, conta unidades abaixo de 20 (D-371) e ordena pela D-370. A ordem usa duas entradas novas e
   opcionais: o uso da conta (um mapa `alimentoId → vezes`, montado dos planos pela interface) e a lista de consumo da
   POF (`consumoPof.ts`, só ids da base). `catalogo.ts` usa a mesma relevância quando há termo.
2. **A medida no item.** `ItemPlano.medida?: MedidaDoItem | null`. Um módulo puro, `medidaDoItem.ts`, lê a medida
   com segurança (CB-363), calcula a quantidade a partir dos gramas, diz se fecha em meia medida e dá a quantidade
   para o paciente (`quantidadeDoItem`). `quantidadeNaFolha.ts` ganha o modo novo, a unidade e a aproximação, e uma
   função de texto (`textoDaQuantidade`) usada por folha, link e Word: o texto sai igual em todo lugar.
3. **Modo do plano.** `ModoQuantidade = 'medida-e-gramas' | 'medida-caseira' | 'gramas'`. `criarCasoVazio` passa a
   `medida-e-gramas`; a leitura de plano gravado sem o campo completa com `medida-caseira` (`persistencia.ts`), e
   `modoDeQuantidade` lê o desconhecido como `medida-caseira`.
4. **Dados.** Macros do USDA num arquivo próprio (`src/data/macros-usda.json`), juntados em `tabelas.ts` só onde a
   TACO é nula; `Alimento.usdaMacros` marca a origem para a ficha. Regras novas em
   `dados-brutos/pof/regras-mapeamento-taco-pof.csv`, com duas colunas opcionais no script (`preparacao_pof`, para
   herdar a medida de outra preparação, e `medidas_somente`, para herdar só a unidade).
5. **Meus alimentos.** `produtos.ts` ganha os campos novos, todos opcionais na leitura, e `salvar` passa a preservar o
   que não conhece. `produtoComoAlimento` leva grupo, preparo, unidade, nome para o paciente, medidas e a marca
   `proprio`. O formulário novo fica atrás de `MEUS_ALIMENTOS_NOVOS` (publicação em duas vezes, D-383).
6. **Medidas próprias** em `medidasProprias.ts` (chave nova, repositório e registro em memória como os produtos);
   `medidasDoAlimento` junta próprias e POF.

**Suposições (para revisar):**
- O uso da conta conta itens de todos os planos guardados neste aparelho (a cópia de trabalho), lido uma vez ao abrir
  a etapa Refeições; não há chave nova para isso.
- A lista de consumo da POF é uma ordem de nomes comuns tirada da POF 2017-2018 (IBGE), sem percentual: serve só para
  desempatar.
- Densidade 1 para ml (D-378), dita na ficha do alimento próprio.
- Nenhuma dependência nova, nenhum SQL, nenhuma função do Supabase, nenhum domínio novo na CSP (a OFF já está em
  `connect-src`; `X-User-Agent` é cabeçalho permitido pelo CORS dela).

## Tarefas

| # | Tarefa | Arquivos | Verificação |
|---|---|---|---|
| T0 | Spec e plano | `specs/alimentos-e-gramaturas/SPEC.md`, `PLAN.md` | revisão |
| T1 | Entrada rápida e busca (D-370 a D-373; CA-1100 a CA-1112) | `src/domain/busca.ts`, `src/domain/consumoPof.ts` (novo), `src/domain/usoDaConta.ts` (novo), `src/domain/catalogo.ts` (só a relevância), `src/ui/plano/EntradaRapida.tsx`, `src/ui/ajuda/TelaAjuda.tsx` (só o exemplo da A2), testes `busca.test.ts`, `buscaReal.test.ts` (novo, ≥ 40 entradas), `EntradaRapida.test.tsx` | vitest |
| T2 | Medida guardada, linha do plano e modos (D-374 a D-379; CA-1113 a CA-1127) | `tipos.ts`, `medidaDoItem.ts` (novo), `plano.ts`, `caso.ts`, `persistencia.ts` (só o padrão do campo), `quantidadeNaFolha.ts`, `folhaDieta.ts`, `dietaDoLink.ts`, `dietaParaPaciente.ts`, `trocas.ts` (só a quantidade), `substitutos.ts`, `cobrir.ts` (só a porção), `aconselhamento-docx.ts`, `ui/plano/LinhaItem.tsx`, `CartaoRefeicao.tsx`, `TelaPlano.tsx`, `SeletorDeMedida.tsx` (novo), `ModoDasQuantidades.tsx` (novo), `DialogoSubstituto.tsx`, `ui/exportar/FolhaDieta.tsx`, `DialogoImprimir.tsx`, `ui/missoes/MeuPlano.tsx`, `ui/adequacao/GavetaCobrir.tsx`, `MicrosDoDia.tsx`/`TelaAdequacao.tsx` (só a medida ao adicionar), `ui/caso/CartaoIdentificacao.tsx` (tira o seletor), `AreaDeTrabalho.tsx` (passa o modo), testes | vitest + e2e |
| T3 | Base: macros do USDA e medidas da POF (D-380, D-381; CA-1128 a CA-1132) | `src/data/macros-usda.json` (novo), `tabelas.ts`, `complementoUsda.ts` (junção dos macros), `catalogo.ts` (marca USDA), `tipos.ts`, `scripts/dados/importar-medidas-pof.mjs`, `dados-brutos/pof/regras-mapeamento-taco-pof.csv`, `src/data/medidas-caseiras.json` e `medidas-revisao.md` (gerados), testes de dados | vitest |
| T4 | Código de barras (D-382; CA-1133 a CA-1138) | `codigoBarras.ts`, `ui/produtos/DialogoProduto.tsx` (só o preenchimento), testes | vitest |
| T5 | Meus alimentos e medidas próprias (D-383 a D-387; CA-1139 a CA-1162) | `produtos.ts`, `medidasProprias.ts` (novo), `perfil.ts` (`CHAVES_DE_DADOS`), `copiaDaConta.ts` (`LISTAS`), `donoDosDados.ts` (migração), `tabelas.ts`, `busca.ts` (medidas), `nomeParaPaciente.ts` (nome próprio), `receitas.ts` (fontes e "salvar como alimento"), `cobrir.ts`/`trocas.ts` (lista de candidatos, sem mudar `prescritivel.ts`), `catalogo.ts` (origem), `ui/produtos/**` (tela e formulário novos), `ui/alimentos/TelaAlimentos.tsx`, `ui/receitas/TelaReceitas.tsx`, `ui/plano/SeletorDeMedida.tsx` ("+ Nova medida…"), `ui/estado/armazenamentoDaSessao.ts`, menu e rótulos "Meus alimentos", testes de sincronia | vitest + e2e |
| T6 | Receitas na refeição (D-388; CA-1163) | `receitas.ts`, o teste da constante | vitest |
| T7 | Validação | `npm run check`, `npx playwright test` (porta própria, `--list` ≥ 247), `npm run build`, prints | relatório |

Dependências: T2 depende de T1 (a entrada devolve a medida); T5 depende de T2 (seletor) e de T4 (formulário do rótulo
por 100 g); T6 é independente.

## Riscos e decisões para o dono revisar

- **R-370 · Publicação em duas vezes de "Meus alimentos" (D-383).** A versão no ar refaz o item ao editar e apagaria os
  campos novos. Esta publicação lê e preserva; a próxima liga `MEUS_ALIMENTOS_NOVOS`. Os prints do formulário foram
  feitos com a constante ligada numa compilação local.
- **R-371 · Coco verde sem energia (D-380).** Não há equivalente honesto no USDA; o coordenador pediu os 4. Fica
  registrado como divergência.
- **R-372 · Iogurte de abacaxi com o iogurte de fruta americano** (99 kcal por 100 g contra 70 do iogurte de morango da
  TACO): confiança média, marcado USDA na ficha.
- **R-373 · Conflito provável com a frente `ficha-unica`** no `CartaoIdentificacao.tsx` (só as linhas do seletor de
  quantidades saem) e com `textos-e-promessas` na `TelaAjuda.tsx` (só a linha do exemplo da entrada rápida).
- **R-374 · "Desjejum" → "Café da manhã"** (textos.md, linha 118) muda o nome padrão da primeira refeição de plano novo;
  planos guardados não mudam.

## Integração de 22/10/2026 (seção 6 da SPEC: D-423 a D-425)

O plano das sobras da caminhada dos 4 pacientes está em `specs/conduta-da-nutricionista/PLAN.md`, seção "Integração de
22/10/2026": primeiro a importação (D-424 e D-425, com `medidas-revisao.md` regerado), depois a medida da fruta (D-423)
e por fim as trocas (D-421 e D-422).
