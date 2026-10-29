# Base ampliada, fase 2 · Plano de implementação

**Spec:** `specs/base-ampliada/SPEC-fase2.md` (29/10/2026; "apenas faça"; aprovação pelas telas).

**Objetivo:** os produtos brasileiros do Open Food Facts acháveis pelo nome na entrada rápida, como cópia em Meus
alimentos, com o catálogo em arquivos estáticos fatiados publicados com o app.

**Arquitetura:** um script em `scripts/dados/importar-catalogo-off.mjs` lê a exportação CSV do OFF em stream e grava
`public/catalogo-off/<versão>/` (índice, 100 fatias, aviso de licença) e o cabeçalho `src/data/catalogo-off-fonte.json`.
A tabela de conversão dos nutrientes vai para `src/data/off-nutrientes.json`, lida pelo script e por `codigoBarras.ts`.
No app, `src/domain/catalogoOff.ts` decodifica o índice e as fatias, busca sem acento e com tolerância a erro, e monta a
cópia; `src/ui/estado/catalogoOff.ts` pede os arquivos sob demanda (fetch, que tenta de novo sem guardar a falha); a
entrada rápida soma os produtos depois dos outros resultados; o código de barras procura primeiro no catálogo.

## Restrições

- Sem dependência nova; script só com o Node. Sem push, sem merge, sem Supabase de produção.
- Nenhum valor nutricional escrito à mão: tudo sai do arquivo do OFF pelo script.
- Nulo nunca vira zero.

## Ordem e dependências

| # | Tarefa | Arquivos | Critérios | Depende de |
|---|---|---|---|---|
| T1 | Tabela de conversão compartilhada | `src/data/off-nutrientes.json` (novo), `src/domain/codigoBarras.ts` (+ teste) | CA-1752 (parte do app) | — |
| T2 | Script e arquivos gerados | `scripts/dados/importar-catalogo-off.mjs` (+ `.d.mts`), `src/data/catalogo-off.test.ts` (novo), `public/catalogo-off/<versão>/`, `src/data/catalogo-off-fonte.json`, `dados-brutos/README.md` | CA-1750 a CA-1754, CB-757 | T1 |
| T3 | Domínio do catálogo | `src/domain/catalogoOff.ts` (+ teste) | CA-1755 (busca), CA-1756 a CA-1758 (cópia), CB-753, CB-754, CB-755 | T2 |
| T4 | Carregamento sob demanda | `src/ui/estado/catalogoOff.ts` (+ teste), `src/ui/estado/usarCatalogoOff.ts`, `vitest.setup.ts` | CA-1764, CB-750, CB-751, CB-752 | T3 |
| T5 | Entrada rápida | `src/ui/plano/EntradaRapida.tsx` (+ teste) | CA-1755 a CA-1757, CA-1759 | T4 |
| T6 | Código de barras: catálogo primeiro | `src/domain/codigoBarras.ts` ou `src/ui/estado/catalogoOff.ts`, `src/ui/produtos/DialogoAlimentoProprio.tsx`, `DialogoProduto.tsx` (+ testes) | CA-1762 | T4 |
| T7 | Atribuição e Fontes | `src/ui/alimentos/TelaAlimentos.tsx` (ficha), `src/domain/baseMetanutri.ts`, `src/ui/publico/TelaFontes.tsx` (+ testes), `THIRD_PARTY_NOTICES.md` | CA-1760, CA-1761 | T2 |
| T8 | Build: cache do service worker e site sem o catálogo | `src/seo/pluginAlvo.ts` (+ teste) | CA-1763 | T2 |
| T9 | Atualização mensal | `.github/workflows/atualizar-catalogo-off.yml` (novo) | D-754 | T2 |
| T10 | Navegador e validação | `e2e/catalogo-off.spec.ts` (novo), medições, relatório | CA-1755, CA-1756, CA-1764 no navegador | T1 a T9 |

## Validação

`npm run check`, `npm run e2e`, `npm run test:csp` e `npm run build:app`; os tamanhos do índice, das fatias e da
entrada principal, e o tempo de abertura antes e depois.
