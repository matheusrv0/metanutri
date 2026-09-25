# Design System: MetaNutri

Contrato visual do projeto e **fonte da verdade dos tokens**. Os valores estão em
`design-system/tokens/tokens.css`; este documento diz o que eles significam e quando
usar cada um. Código que diverge daqui é bug: ou a regra muda primeiro, ou o código
está errado.

Registrado em 24/09/2026, a partir do export do Claude Design incorporado em
`design-system/`. A direção anterior (a **tabela de composição impressa**: papel
quase branco, fios no lugar de sombra, raio de 2 a 4 px, lombada escura no menu)
e a que veio depois dela (lime + forest) estão registradas no fim, em
*Direções anteriores* — ela explica por que várias regras
de produto existem. As regras de produto continuam; a direção visual, não.

**O vocabulário anterior foi aposentado.** Os tokens `--papel`, `--mesa`, `--tinta`,
`--fio`, `--lombada` e o utilitário `folha` — a metáfora da tabela de composição
impressa — não existem mais. Quem procura por eles deve usar os semânticos do sistema:
`--surface-card`, `--bg-page`, `--text-strong`, `--border-subtle`, e o próprio `Card`.

## Onde as coisas moram

| O quê | Onde |
|---|---|
| Valores (cor, fonte, espaço, raio, sombra, movimento) | `design-system/tokens/tokens.css` |
| Componentes, tipados, com as variantes e os estados | `design-system/componentes/` |
| Porta de entrada da biblioteca | `design-system/index.ts` (alias `@ds`) |
| A biblioteca desenhada, nos dois temas | rota `#/design-system` |
| Telas originais do export, congeladas | `design-system/referencia/index.html` |
| Tokens ligados ao shadcn/ui e ao tema do Tailwind | `src/ui/tema/globals.css` |

**Duas regras inegociáveis.** Componente novo sai de `design-system/componentes/`,
nunca escrito de novo na tela. Nenhum valor de cor, fonte, espaçamento ou raio vai
escrito no código — sempre token. O `eslint.config.js` cobra as duas.

## Overview

O mundo é um **SaaS claro e quieto, em grafite**: mesa cinza, cartões brancos de canto
largo, botão em pílula e a interface inteira em tinta neutra. **A cor não decora e não
faz marca: a cor é o estado do nutriente.** Quando a única coisa colorida na tela é a
barra de adequação, o verde e o âmbar passam a significar alguma coisa.

A assinatura do produto continua sendo a **notação**: nenhum número aparece sem dizer
de onde veio, e falta de dado vira travessão ou hachura, nunca zero.

## Colors

Estratégia: **acromática com exceção semântica**. O grafite e os neutros carregam a
tela inteira. A cor aparece em quatro lugares e em nenhum outro: dentro da meta,
abaixo, acima do limite e referência.

### Primary

`--brand-primary` `#232a33` (ink 800). A tinta do sistema: títulos, botão principal,
cartão de destaque, primeira série de gráfico.

A superfície de ação usa `--surface-inverse`, que **vira**: grafite no claro, clara
(`--ink-100`) no escuro, sempre com `--text-on-inverse` por cima. É ela que alimenta
`--primary` do shadcn — por isso o botão principal continua legível nos dois temas sem
nenhum `if` no componente.

### Accent

Não existe cor de acento. `--brand-accent` e `--surface-accent` são **ênfase neutra**
(`--ink-100` no claro, `--ink-700` no escuro): a ficha do botão suave, o selo de marca,
o marca-texto. O que precisa saltar salta pela tinta, não por uma segunda cor.

### Secondary

`--color-secondary` `#1c4f7c` (claro) · `#6aa6dd` (escuro). Azul de nota: informação,
fonte e link de referência. É estado (`--state-info`), não identidade.

### Estado — a única família colorida

| Token | Papel | Claro |
|---|---|---|
| `--state-ok` / `-bg` / `-text` | dentro da meta | `#1f9d62` |
| `--state-low` / `-bg` / `-text` | abaixo da meta, dado subestimado | `#d98324` |
| `--state-high` / `-bg` / `-text` | acima do limite (UL/CDRR), exclusão | `#e5484d` |
| `--state-info` / `-bg` / `-text` | referência, "AI em vez de RDA" | `#3a78b8` |
| `--state-nodata-a` / `-b`, `--pattern-nodata` | **sem dado**: hachura, nunca zero | cinza |

O verde do sistema (`--green-*`) existe **só** para `--state-ok`. Não há verde de marca.

### Neutral

Grafite (`--ink-950` a `--ink-100`) para tinta e ação; cinza puro (`--gray-0` a
`--gray-900`) para superfície. Superfícies: `--bg-page` (mesa), `--surface-card`,
`--surface-sunken`, `--surface-hover`. Texto: `--text-strong`, `--text-body`,
`--text-muted`, `--text-subtle`. Fios: `--border-subtle`, `--border-default`,
`--border-strong`.

O tema escuro é **carvão quase neutro**: mesa `#14171c`, cartão `#1e232a`, tinta
`#e7eaef`. O degrau entre mesa e cartão é de quase 6 pontos de L\* — abaixo disso o
olho não vê que existe um cartão ali, e a tela lê como um bloco só.
**Nenhum token existe só no escuro.**

### Named Rules

- **Cor é estado, nunca enfeite.** Verde é dentro da meta; âmbar é abaixo; vermelhão é
  acima do limite; azul é referência. Se um elemento não fala de adequação, ele é
  neutro.
- **Sem dado é hachura.** `--pattern-nodata` existe para que "não analisado" nunca seja
  desenhado como barra vazia, que se lê como zero.
- **Um herói por tela.** O cartão `tom="grafite"` aparece uma vez, no que a pessoa veio
  fazer.
- **Primitiva não entra em componente.** `--ink-800` fica nos tokens; o componente usa
  `--surface-inverse`.

## Typography

- **Títulos e rótulos:** `--font-display` — Archivo Variable, eixo de largura 80% a 92%.
- **Texto e campos:** `--font-corpo` — Figtree Variable.
- **Números:** `--font-data` — Inter Variable, com `tabular-nums` no corpo inteiro.

**Desvio consciente do export.** O export pedia Urbanist (texto) e Plus Jakarta Sans
(números), carregadas do Google Fonts. Não entraram: o app é um PWA que precisa abrir
sem internet, e adicioná-las seria dependência nova. As três fontes acima já estão
embutidas via `@fontsource` e ocupam os mesmos três papéis.

**Nomes de token renomeados.** A escala do export (`--text-*`, `--leading-*`,
`--tracking-*`) usa exatamente os nomes do namespace do Tailwind v4. Mantê-los
encolheria todo o texto do app de 14 para 13 px sem ninguém pedir. A escala mora em
`--fonte-*`, `--altura-*` e `--traco-*`; os papéis de cor (`--text-strong`, `--text-body`,
`--text-muted`…) mantêm o nome do export porque não colidem.

### Hierarchy

| Papel | Regra |
|---|---|
| Número de destaque | Archivo 32 px, peso 700, tabular |
| Título de página (h1) | Archivo 20 px, largura 92%, tracking −0.01em |
| Título de bloco (`card-title`) | Archivo 16 px, peso 600 |
| Rótulo de seção (`rotulo`) | Archivo 11 px (`text-2xs`), largura 80%, caixa alta, tracking 0.1em |
| Texto e campos | Figtree 14 px (`text-sm`) |
| Legenda | Figtree 12 px |

### Named Rules

- **Um tamanho por papel.** Escala fixa, sem tipografia fluida.
- **Versalete é rótulo, não enfeite.** `rotulo` só aparece onde o texto nomeia um dado
  (o topo de uma seção, a legenda de um gráfico). Cabeçalho de tabela não usa: ele é a
  faixa cinza descrita abaixo.
- **Número é sempre tabular.** Coluna de número usa `numeros` (`--font-data` + `tnum`).

## Layout

- Menu lateral de 264 px (`--layout-sidebar`) em telas grandes; abaixo disso vira gaveta.
- Cabeçalho de 72 px (`--layout-header`); conteúdo até 1400 px (`--layout-content-max`),
  com 24 px de margem lateral (16 no celular).
- Etapas 1 e 2 usam duas colunas: trabalho à esquerda, painel do dia à direita, 360 px
  (`--layout-rail`). Etapa 3 usa largura total, porque a tabela de micronutrientes tem
  seis colunas.
- **Coluna que encolhe.** Todo grid de duas colunas declara `minmax(0,1fr)` também no
  celular; coluna `auto` não encolhe abaixo do conteúdo e faz a página rolar para o lado.
- **Linha que empilha.** Abaixo de 640 px, a linha do alimento põe o nome numa linha e
  gramas, kcal e ações na seguinte.
- Alvo de toque mínimo de 44 px (`--tap-min`).

## Elevation & Depth

Quatro degraus macios, todos tingidos de grafite em alfa baixo: `--shadow-xs`,
`--shadow-card` (o cartão), `--shadow-raised` (cartão clicável no hover) e
`--shadow-pop` (só camada flutuante: diálogo, gaveta, menu suspenso). Nenhuma sombra
dura, nenhuma sombra colorida.

## Shapes

| Token | Valor | Onde |
|---|---|---|
| `--radius-xs` | 6 px | marcas pequenas |
| `--radius-sm` | 8 px | item de menu suspenso |
| `--radius-input` | 12 px | campos, alertas |
| `--radius-card` | 16 px | cartões |
| `--radius-xl` | 20 px | diálogo, gaveta |
| `--radius-panel` | 28 px | painel de vitrine |
| `--radius-button` | pílula | botão, selo, aba segmentada, interruptor, ficha |

## Components

A biblioteca tem **25 componentes**, na taxonomia do design system. O índice completo,
com o que cada subpasta guarda e como criar um componente novo, está em
[design-system/LEIA-ME.md](design-system/LEIA-ME.md).

### Buttons

Pílula, altura 40 px (32 sm / 48 lg). `default` grafite sólido, `accent` ficha neutra,
`outline` com fio, `soft` neutro diluído, `ghost` sem moldura, `link` sublinhado, mais
`secondary`, `lightprimary`, `lighterror` e `destructive` — `accent` e `soft` são ênfase neutra, não uma segunda
cor. Hover escurece o preenchimento;
`:active` encolhe 3%; foco é anel de 2 px com 2 px de deslocamento; `disabled` cai para
50%; `loading` mostra a roda e bloqueia o clique.

### Tabela

Cabeçalho numa faixa `--surface-sunken` de canto arredondado, em caixa normal e cor
apagada — não versalete. Linhas separadas por `--border-subtle`, sem listra alternada,
com realce suave no hover. Rodapé de notas separado por fio. Marcas de notação: `†` total possivelmente subestimado, `‡` limite
superior que não vale para a forma presente nos alimentos, `—` não analisado.

### Atalhos de alimento

Na montagem da refeição, com o campo de busca vazio, aparecem até seis alimentos mais
usados como fichas, cada uma com a última porção usada. Fora dali (janela de substituto),
não aparecem.

### Campos

Entrada de 40 px, raio 12, sufixo de unidade dentro do campo, rótulo acima ou oculto
para leitor de tela quando a coluna já nomeia o dado. Foco põe borda forte e anel;
`aria-invalid` troca a borda para a cor de erro.

## Motion

Rápido e quieto. Cor em 150 ms (`--dur-fast`), layout em 200 a 320 ms, medidores animam
em 600 ms (`--dur-meter`) com `--ease-out`. Diálogo entra com fade e escala a partir de
0.96; gaveta desliza. Nenhuma animação de entrada de página, nenhum salto.
`prefers-reduced-motion` desliga tudo.

## Superfícies do navegador

Seleção de texto, cursor de digitação e barra de rolagem usam tokens do tema; nada fica
no padrão do navegador. O `theme_color` do PWA vive em `vite.config.ts`, que é JSON e
não lê `var()`: as duas constantes de cor lá dizem qual token espelham.

---

## Direções anteriores

Registradas porque explicam decisões que continuam valendo, e porque o material de
origem ainda está no repositório.

**Tabela de composição impressa** (15/09/2026). Papel quase branco sobre mesa
cinza-esverdeada, tinta verde-preta (`#0b6e33`), fios finos no lugar de sombras, raio de
2 a 4 px, menu como "lombada" de tinta escura, versalete condensado nos cabeçalhos de
coluna. **O que sobreviveu:** o numeral tabular em tudo, a notação da TACO, "falta de
dado nunca é zero", o versalete como rótulo de seção e a regra de que cor precisa
significar alguma coisa. O resto — inclusive os nomes de token — saiu do código em
24/09/2026.

**Lime + forest** (24/09/2026, algumas horas). O export do Claude Design trazia lime
`#9FE870` com forest `#062f28`. Caiu no mesmo dia, a pedido do usuário: o forest tem
saturação 41 e passa contraste em 14,5:1 — é preto com um boato de verde, não uma cor
de ação; e o escuro derivado dele tinha só 4,6 pontos de L\* entre mesa e cartão, o que
o fazia ler como lama. **O que sobreviveu:** a estrutura inteira do sistema — pílula,
raio 16, os 25 componentes, os papéis de token e a regra de que cor significa estado.

**Kit MaterialM / SaaSable** (15 a 21/09/2026). Neutros MD3, botão pílula, raios
grandes, Archivo nos títulos e Figtree no corpo. **O que sobreviveu:** a pílula, os
raios grandes e as duas fontes, que continuam sendo as do sistema. O detalhamento e a
licença estão em [docs/design/direcao-visual.md](docs/design/direcao-visual.md) e em
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

**Não canonizado:** a legenda `Tr` da TACO ainda não aparece na interface, embora o dado
exista: entra quando a nutricionista validar a leitura (T-62).
