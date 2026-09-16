# Design System: MetaNutri

Registrado a partir do código construído em 15/09/2026, depois do redesenho. A fonte da verdade é `src/ui/tema/globals.css`; este documento descreve o que está lá, não o que foi planejado.

## Overview

O mundo é a **tabela de composição impressa**: a mesma folha que a estudante de nutrição já lê. Papel quase branco sobre mesa cinza-esverdeada, tinta verde-preta, fios finos no lugar de sombras, versalete condensado nos cabeçalhos de coluna e numeral tabular em todo número. O menu é a lombada da publicação, em campo de tinta escura. A assinatura do sistema é a **notação**: nenhum número aparece sem dizer de onde veio, e falta de dado vira travessão ou marca de rodapé, nunca zero.

## Colors

Estratégia: **restrita**. Neutros de papel e tinta carregam a tela; a cor só aparece em ação, estado e referência.

### Primary

`--color-primary` `#0b6e33` (claro) · `#59b877` (escuro). Verde de capa. Usado em ação principal, etapa atual, seleção e estado adequado.

### Secondary

`--color-secondary` `#1c4f7c` (claro) · `#79b4de` (escuro). Azul de nota. Informação e links de fonte.

### Estado

- `--color-warning` `#a8700e` · texto `--color-warningtext` `#8a5a09`: abaixo da meta, dado possivelmente subestimado.
- `--color-error` `#b3221c` · texto `--color-errortext` `#971914`: acima do limite superior, exclusão.
- `--color-success` = primary: dentro da meta.

### Neutral

- `--papel` `#fbfbf7` · `--mesa` `#e9eae1`: folha e mesa.
- `--tinta` `#15180f`, `--tinta-media` `#4d5346`, `--tinta-fraca` `#6f7567`.
- `--fio` (tinta a 14%) e `--fio-forte` (tinta a 42%): as duas únicas espessuras de linha do sistema.
- `--lombada` `#12301c` com `--lombada-texto` `#eceee4`: o campo escuro do menu, igual nos dois temas.

O tema escuro é a **prova em negativo**: papel `#1b1f17`, mesa `#12150f`, tinta `#eceee4`, acentos clareados. Nenhum token existe só no escuro.

### Named Rules

- **Fio no lugar de sombra.** Superfícies se separam por borda de 1 px. Sombra só em camada flutuante (`--shadow-folha`, em diálogo, gaveta e menu suspenso).
- **Cor com significado.** Verde é ação e adequado; ocre é abaixo; vermelhão é acima do limite. Nenhum bloco colorido decorativo.
- **Campo de tinta só no menu.** O resto da tela é papel.

## Typography

- **Títulos e rótulos:** `Archivo Variable` (`--font-titulo`), eixo de largura entre 80% e 92%, peso 600 a 650.
- **Texto, campos e números:** `Inter Variable` (`--font-sans`), com `font-variant-numeric: tabular-nums` no corpo inteiro.

### Hierarchy

| Papel | Regra |
|---|---|
| Nome do caso (h1) | Archivo 20 px, largura 92%, tracking −0.01em |
| Título de bloco (`card-title`) | Archivo 16 px, peso 650 |
| Cabeçalho de coluna (`rotulo`) | Archivo 11 px, largura 80%, caixa alta, tracking 0.1em |
| Texto e campos | Inter 14 px |
| Número de destaque | Inter 16 a 24 px, peso 600 a 700, tabular |

### Named Rules

- **Um tamanho por papel.** Escala fixa em rem, sem tipografia fluida: a estudante usa em telas de DPI constante.
- **Versalete é coluna, não enfeite.** `rotulo` só aparece onde nomeia um dado.

## Layout

- Menu fixo de 264 px em telas de 1280 px ou mais; abaixo disso vira gaveta.
- Conteúdo em até 1400 px, com 32 px de margem lateral no desktop e 16 px no celular.
- **Coluna que encolhe.** Todo grid de duas colunas declara `minmax(0,1fr)` também no celular; coluna `auto` não encolhe abaixo do conteúdo e faz a página inteira rolar para o lado.
- **Linha que empilha.** Abaixo de 640 px, a linha do alimento põe o nome numa linha e gramas, kcal e ações na seguinte, em vez de espremer o nome.
- Etapa 3 usa largura total, com o resumo do dia em faixa horizontal, porque a tabela de micronutrientes tem seis colunas.
- Etapas 1 e 2 usam duas colunas: trabalho à esquerda, painel do dia à direita, 360 px.

## Elevation & Depth

Duas camadas apenas: folha (borda) e flutuante (`--shadow-folha`, deslocamento mais desfoque). Nenhuma sombra colorida, nenhum bloco de sombra dura.

## Shapes

Raio de 2 a 4 px em tudo (`--radius: 3px`). Nada de pílula: a única exceção é o interruptor, que é affordance padrão de sistema.

## Components

### Buttons

Retângulo de canto 2 px, altura 36 a 40 px. `default` verde sólido, `outline` com fio, `lightprimary` com tinta diluída, `ghost` sem moldura. Foco sempre com anel de 2 px em verde e 1 px de deslocamento.

### Tabela

Cabeçalho em versalete sobre fio forte, linhas separadas por fio fino, linha par com tinta a 50% de `muted`, rodapé de notas separado por fio forte. Marcas de notação: `†` total possivelmente subestimado, `‡` limite superior que não vale para a forma presente nos alimentos.

### Atalhos de alimento

Na montagem da refeição, com o campo de busca vazio, aparecem até seis alimentos mais usados como fichas de fio fino, cada uma com a última porção usada. Fora dali (janela de substituto), não aparecem.

### Campos

Entrada de 36 px com fio, sufixo de unidade dentro do campo, rótulo acima ou oculto para leitor de tela quando a coluna já nomeia o dado.

## Motion

Transições de cor de 150 a 250 ms. Nenhuma animação de entrada de página. `prefers-reduced-motion` desliga tudo.

## Superfícies do navegador

Seleção de texto, cursor de digitação e barra de rolagem usam tokens do tema; nada fica no padrão do navegador.

---

**Não canonizado:** o ícone de bandeira do tema e o botão "Novo caso" em papel sólido sobre a lombada são decisões de uma tela só, não regra de sistema. A legenda `Tr` da TACO ainda não aparece na interface, embora o dado exista: entra quando a nutricionista validar a leitura (T-62).
