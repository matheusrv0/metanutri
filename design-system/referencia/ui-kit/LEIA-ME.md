# Kit de telas do export — referência

Recriação clicável da área de trabalho do MetaNutri, como o Claude Design a entregou em
24/09/2026, no visual do sistema novo. **Não é código do projeto**: as telas de verdade
estão em `src/ui/`. Isto serve para comparar — o que o sistema pretendia versus o que o
app faz hoje.

Consolidado de `ui_kits/app/README.md` e `github.md` do export original.

- `index.html` — computador (≥ 1024 px, menu lateral fixo de 264 px). Abre no Painel;
  "Abrir" ou "Novo plano" leva ao planejador.
- `mobile.html` — o mesmo `App` a 390 px, duas vezes (Painel e Plano). O menu lateral
  vira gaveta à esquerda, as linhas de refeição empilham, a tabela de adequação vira lista
  de barras e o "Cobrir" abre como gaveta de baixo.

As duas montam React, Babel e Lucide da internet (unpkg): sem conexão abrem em branco.

## As telas

| Tela do kit | O que é | Onde está no projeto |
|---|---|---|
| `Shell.jsx` | menu lateral, cabeçalho (busca, atalho ⌘K, ajuda, conta) e menu de exportar | `src/ui/layout/MenuLateral.tsx`, `Cabecalho.tsx`, `Estrutura.tsx` e `design-system/componentes/navigation/ItemMenu.tsx` |
| `Painel.jsx` | quatro cartões de destaque, "Começar agora" com gráfico de atividade, "Onde você parou", "Precisa de atenção" | `src/ui/painel/TelaPainel.tsx` e `design-system/componentes/nutricao/CartaoDestaque.tsx` |
| `Plano.jsx` → etapa 1 | identificação, antropometria e fórmula de energia | `src/ui/caso/TelaCaso.tsx` |
| `Plano.jsx` → etapa 2 | cartão de refeição com abas Principal/Substituto, entrada rápida (`150 arroz integral` + Enter), fichas de alimento frequente, gramas editáveis, resumo do dia ao lado | `src/ui/plano/*` e `src/ui/resumo/*` |
| `Adequacao.jsx` | preset, tabela de micronutrientes com a notação † ‡, gaveta "Cobrir" que põe um alimento na refeição | `src/ui/adequacao/*` |
| `App.jsx` | navegação e o trilho de etapas | `src/ui/navegacao.ts` e `design-system/componentes/navigation/EtapasDoCaso.tsx` |
| `components/**` do export | os primitivos | `design-system/componentes/**` |

As outras rotas do menu aparecem como espaço reservado: existem no produto, mas o kit não
as recriou.

## Sobre os dados

`data.js` é fictício. As kcal por 100 g seguem a TACO, arredondadas; macros e
micronutrientes são estáticos. Os números da área de trabalho de verdade vêm de
`src/data/` e `src/domain/`.

## Área pública

`#/inicio`, `#/precos` e `#/entrar` existem no projeto (`src/ui/publico/`) e **não** foram
recriadas pelo kit.
