# AGENTS.md

Instruções para agentes de código que trabalham neste repositório. O
[README.md](README.md) é para pessoas; este arquivo é o que a ferramenta lê.

## O projeto em uma linha

MetaNutri: planejador alimentar para estudantes de nutrição. Roda inteiro no navegador,
sem conta e sem servidor, e precisa funcionar **offline** (PWA). Interface em pt-BR.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run check` | lint + tipos + testes. **É o portão antes de commitar.** |
| `npm run dev` | sobe em http://localhost:5173 |
| `npm run build` | build de produção em `dist/` |
| `npx playwright test` | ponta a ponta em navegador real |

## Design system

**`DESIGN.md`, na raiz, é o contrato visual e a fonte da verdade dos tokens.** Ele está
versionado; leia antes de mexer em qualquer coisa de interface.

Três regras que valem em todo código de interface:

1. **Componente novo sai da biblioteca**, em `design-system/componentes/`. Não escreva
   um botão, campo ou cartão direto na tela. O mapa da biblioteca e o passo a passo para
   criar um componente estão em [design-system/LEIA-ME.md](design-system/LEIA-ME.md).
2. **Nenhum valor de cor, fonte, espaçamento ou raio vai escrito no código.** Sempre
   token (`var(--surface-card)`) ou utilitário do tema (`bg-card`, `rounded-lg`,
   `text-2xs`). Precisa de um valor novo? Crie o token em
   `design-system/tokens/tokens.css`, nos dois temas, antes de usar.
3. **Confira na vitrine.** A rota `#/design-system` desenha a biblioteca inteira, com
   todas as variantes e estados, nos dois temas. Componente novo aparece lá.

O `eslint.config.js` cobra as regras 1 e 2: hexadecimal e `font-family` soltos são erro
em qualquer lugar; dentro da biblioteca, px solto também. Importar a biblioteca por
caminho relativo é erro — use o alias `@ds`.

Para ver a intenção original do sistema (cor exata, raio, sombra), abra
`design-system/referencia/index.html` no navegador.

## Arquitetura

```
src/domain/          regras puras, sem React: cálculo, validação, persistência (tudo testado)
src/data/            tabelas geradas por scripts/dados/*.mjs — não edite à mão
src/export/          Word (.docx) e cópia de tabela
src/ui/              telas, por assunto (caso, plano, adequação, pacientes, produtos)
design-system/       tokens, os 25 componentes, vitrine e referência visual
```

**O domínio não conhece a interface.** Se um cálculo está numa tela, ele está no lugar
errado. A interface não conhece o formato dos arquivos de dados: isso é de `src/data/`.

## Convenções

- React 18 + TypeScript strict + Tailwind 4 + shadcn/ui. Vitest + Testing Library;
  ponta a ponta no Playwright.
- Sem `any` sem comentário explicando. Componentes funcionais, um por arquivo, export
  nomeado. Estado local primeiro.
- Commits em Conventional Commits.
- **Nenhuma dependência nova sem perguntar.** O app roda offline: cada pacote novo entra
  no cache de quem usa.

## Regras do produto que não se negociam

Estão detalhadas em [PRODUCT.md](PRODUCT.md). As que mais aparecem em código de tela:

- **Falta de dado nunca é zero.** "Não analisado" vira travessão ou hachura, com a marca
  de rodapé (`†`, `‡`). Nunca uma barra vazia, que se lê como zero.
- **Todo número aparece ao lado da fonte** ("Fonte: Mifflin-St Jeor, 1990",
  "DRI 2019 · RDA").
- **Número é tabular** em tabela, campo e medidor.
- Sem emoji, sem ponto de exclamação, sem hype dentro do app. Nada de inventar
  depoimento, cliente ou métrica de uso.
- Texto em sentence case; botão é verbo ("Novo plano", "Cobrir", "Exportar").

## Documentos deste repositório

| Arquivo | Para quê |
|---|---|
| `DESIGN.md` | contrato visual e tokens |
| `PRODUCT.md` | regras de produto e de conteúdo |
| `README.md` | o projeto explicado para pessoas |
| `design-system/LEIA-ME.md` | mapa da biblioteca e como criar componente |
| `design-system/componentes/LEIA-ME.md` | os 25 componentes: para que serve cada um e a API |
| `specs/<feature>/SPEC.md` e `PLAN.md` | especificação e plano por feature |
| `docs/decisoes.md` | decisões tomadas, com o porquê |
| `docs/pendencias.md` | o que falta e por que não foi feito |
| `docs/design/direcao-visual.md` | histórico das direções visuais e a licença do template |
| `THIRD_PARTY_NOTICES.md` | licenças e créditos de terceiros |
