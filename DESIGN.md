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

O mundo é um **SaaS claro e quieto**: mesa cinza, cartões brancos de canto largo,
botão em pílula. Desde 27/09/2026 a tinta de ação é o **teal da marca** (`#0e3b43`) e o
botão principal leva **marfim** por cima; o **laranja** da marca (`#f26a2e`) é grafismo —
a última bolinha do símbolo e o marca-texto — e nunca carrega texto nem entra em painel
de dado. **Fora disso, a cor continua sendo o estado do nutriente.** Quando a única coisa
colorida dentro de uma tabela é a barra de adequação, o verde e o âmbar passam a
significar alguma coisa.

A assinatura do produto continua sendo a **notação**: nenhum número aparece sem dizer
de onde veio, e falta de dado vira travessão ou hachura, nunca zero.

## Estilo Spora (desde 28/09/2026)

Referência: pasta `MetaNutri Design System` (imagens `spora-01` a `spora-07`). Spec: `specs/estilo-spora/SPEC.md`.

- **Mesa e cartão.** O fundo é a mesa cinza `--mesa` (#f1f0f0). Os blocos são cartões brancos com raio 24 (`rounded-3xl`), sem fio e sem sombra. Dentro do cartão branco, cada item de lista é uma linha cinza (`LinhaLista`, `bg-surfacerow`).
- **Teal no lugar do preto.** O que a referência pinta de preto (botão principal, cartão de destaque, faixa final) aqui é o teal da marca.
- **Laranja nos destaques, nunca no dado.** Botão de começar (`variant="laranja"`), seta de navegação e ponto do rótulo. Em painel de dado, nunca.
- **Seta só onde leva a algum lugar.** Cartão de número parado não tem seta (`CartaoNumero` sem `aoClicar`).
- **Foto só no topo da landing.** Uma composição de pratos recortada de fotos gratuitas, com crédito em `THIRD_PARTY_NOTICES.md`. Nenhuma outra foto no site nem no app.
- **Componentes da referência:** `CartaoNumero`, `RotuloSecao`, `LinhaLista`, `SeletorSegmentado`, `AnelProgresso` e o `Button` laranja.
- **Toque.** No celular, todo botão tem pelo menos 44 px de altura.

## Colors

Estratégia: **neutros com a marca na ação e o estado no dado.** Os neutros carregam a
tela; o teal da marca marca a ação; o laranja da marca é grafismo; e dentro de tabela,
barra e selo só existe cor de estado. Registrado em 27/09/2026 a partir do kit de marca
(`public/marca/`, LEIA-ME do designer), que trouxe três cores: base `#0e3b43`, destaque
`#f26a2e`, marfim `#f6f2ea`.

### Primary

`--brand-primary` `#0e3b43` (`--teal-900`). A tinta de ação: botão principal, cartão de
destaque do painel, foco, link, primeira série de gráfico. Os títulos continuam em
grafite (`--text-strong`): a marca colore o que se clica, não o que se lê.

A superfície de ação usa `--surface-inverse`, que **vira**: teal no claro, **marfim**
(`--ivory`) no escuro, sempre com `--text-on-inverse` por cima (marfim no claro, teal no
escuro). É ela que alimenta `--primary` do shadcn — por isso o botão principal continua
legível nos dois temas sem nenhum `if` no componente. Medido: marfim sobre teal 10,9:1.

### Accent

`--brand-accent` `#f26a2e` (`--orange-500`) existe e tem uma regra dura: **é grafismo,
nunca carrega texto.** Mede 3,05:1 sobre branco e 3,99:1 sobre teal — passa para ícone,
traço e bolinha (mínimo 3:1), reprova para letra (mínimo 4,5:1). Botão laranja com texto
em cima está proibido nos dois temas.

Onde ele aparece: a última bolinha do símbolo (a meta cumprida) e o marca-texto, que
usa `--surface-accent` — uma tinta clara do laranja (`--orange-100` no claro, `#44372f`
no escuro) com `--text-on-accent` teal por cima (10,6:1 no claro, 7,7:1 no escuro).

E onde ele **não** aparece: dentro de tabela, barra de adequação, selo de estado ou
medidor. Ali o âmbar (`--state-low`, matiz 31°) já significa "abaixo da meta", e o
laranja da marca (matiz 18°) fica perto demais para conviver no mesmo painel.

`--surface-accent-soft` (a ficha do ícone, o botão suave, o hover) é uma tinta clara do
teal (`--teal-100` no claro, `#253c42` no escuro).

### Marfim

`--ivory` `#f6f2ea`. Só sobre teal: o nome da marca no tema escuro, o texto do botão
principal no claro e a ação principal no escuro. Não é cor de mesa nem de cartão — os
neutros continuam cinza puro, e misturar um fundo quente com fios frios faria a tela
parecer suja.

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

**Correção de 27/09/2026.** `--text-muted` apontava para `--gray-600` (`#767980`), que
mede **4,04:1** sobre a mesa e 4,36:1 sobre o cartão — reprova no mínimo de 4,5:1 para
texto corrido, e o compromisso de acessibilidade do produto diz o contrário. Passou a
apontar para `--gray-700` (`#585b62`): 6,1 a 6,8:1 no claro, 6,0 a 6,9:1 no escuro. O
escuro já estava correto e não mudou.

`--text-subtle` continua em 2,3:1 e **não serve para texto**: é para glifo decorativo
que tem texto equivalente para leitor de tela, como o travessão de "não incluído".

### Neutral

Grafite (`--ink-950` a `--ink-100`) para tinta e ação; cinza puro (`--gray-0` a
`--gray-900`) para superfície. Superfícies: `--bg-page` (mesa), `--surface-card`,
`--surface-sunken`, `--surface-hover`. Texto: `--text-strong`, `--text-body`,
`--text-muted`, `--text-subtle`. Fios: `--border-subtle`, `--border-default`,
`--border-strong`.

O tema escuro é **carvão com o matiz do teal**: mesa `#101a1d`, cartão `#192a2f`, tinta
marfim. As claridades são as de antes (o degrau entre mesa e cartão continua de quase 6
pontos de L\*, que é o mínimo que o olho percebe); o que mudou em 27/09/2026 foi o
matiz, para o escuro ser da mesma família que a marca. A ação principal no escuro é
marfim com teal por cima. **Nenhum token existe só no escuro.** Medido no navegador:
texto corpo 12,7:1, texto secundário 6,6 a 7,8:1, link 7,3:1, foco 8,6:1.

### Named Rules

- **Dentro do dado, cor é estado, nunca enfeite.** Verde é dentro da meta; âmbar é
  abaixo; vermelhão é acima do limite; azul é referência. Se um elemento não fala de
  adequação, ele é neutro ou é marca — e marca é só teal na ação e laranja no grafismo.
- **O laranja claro da logo (`#f26a2e`) nunca carrega texto** (3,05:1 sobre branco). Para
  texto e botão existe o **laranja fechado `--orange-700` `#c2410c`** (5,18:1 sobre branco e
  com letra branca): é a ação principal da área pública ("Começar grátis") e os rótulos de
  destaque. Nenhum dos dois entra em painel de dado, onde se confundiriam com o âmbar de
  "abaixo da meta". Registrado em 28/09/2026, a pedido do usuário: "mais ênfase no laranja".
- **A marca entra pela `Logo`**, e só por ela. O kit proíbe recolorir, esticar, sombrear
  ou usar o símbolo claro em fundo escuro; o componente é o único caminho justamente
  para isso não acontecer.
- **Sem dado é hachura.** `--pattern-nodata` existe para que "não analisado" nunca seja
  desenhado como barra vazia, que se lê como zero.
- **Um herói por tela.** O cartão `tom="grafite"` aparece uma vez, no que a pessoa veio
  fazer.
- **Primitiva não entra em componente.** `--ink-800` fica nos tokens; o componente usa
  `--surface-inverse`.

## Typography

- **O nome da marca:** `--font-marca` — Bricolage Grotesque Variable, peso 700, tracking
  −0,035 em. Só na `Logo`; em mais nenhum lugar. Dependência aprovada pelo usuário em
  27/09/2026, embutida via `@fontsource` como as outras.
- **Manrope em tudo (05/10/2026):** títulos (`--font-display`), texto e campos
  (`--font-corpo`) e números (`--font-data`) usam Manrope Variable; os dois primeiros
  papéis apontam para `--font-corpo`. A Bricolage fica só na palavra da marca, dentro da
  `Logo`. O número usa `tabular-nums` no corpo inteiro (a Manrope tem `tnum`).

**Troca de 28/09/2026, para a referência Spora.** O export original pedia Urbanist
(texto) e Plus Jakarta Sans (números); a decisão de 24/09/2026 trocou as duas por
Archivo, Figtree e Inter para o app abrir sem internet sem puxar dependência nova. A
referência Spora trouxe Urbanist de volta — agora nos títulos e nos números grandes —
e Manrope no texto; as duas entraram como dependência nova aprovada pelo usuário,
embutidas via `@fontsource` como as demais. O Inter das colunas de número não mudou.
Plus Jakarta Sans nunca entrou.

**Troca de 05/10/2026, pedido do dono (D-75, spec limpeza-visual).** "Utilize a fonte
Manrope": o site inteiro passou a Manrope, e Urbanist e Inter saíram (imports e os dois
pacotes `@fontsource-variable`). Com a Manrope, que é mais larga e mais pesada que a
Urbanist, os títulos subiram para semibold (o `--type-display` deixou de ser light) e o
tracking dos títulos ficou entre −0.02em e −0.01em.

**Nomes de token renomeados.** A escala do export (`--text-*`, `--leading-*`,
`--tracking-*`) usa exatamente os nomes do namespace do Tailwind v4. Mantê-los
encolheria todo o texto do app de 14 para 13 px sem ninguém pedir. A escala mora em
`--fonte-*`, `--altura-*` e `--traco-*`; os papéis de cor (`--text-strong`, `--text-body`,
`--text-muted`…) mantêm o nome do export porque não colidem.

### Hierarchy

| Papel | Regra |
|---|---|
| Número de destaque | Manrope 32 px, peso 700, tabular |
| Título de página (h1) | Manrope 20 px, peso 600, tracking −0.02em |
| Título de bloco (`card-title`) | Manrope 16 px, peso 600, tracking −0.01em |
| Rótulo de seção (`rotulo`) | Manrope 11 px (`text-2xs`), peso 700, caixa alta, tracking 0.1em |
| Texto e campos | Manrope 14 px (`text-sm`) |
| Legenda | Manrope 12 px |

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

No formulário do cartão (checkout e Trocar cartão; spec checkout-proprio, D-73) os cinco
campos usam a caixa do protótipo v2: 48 px, raio 12, fundo `--surface-sunken` e sem fio; no
foco, fundo de cartão e anel de 2 px por dentro; com erro, fundo e anel de erro. Três deles
são campos seguros da operadora (iframes): a cor do texto, a do placeholder e o tamanho da
letra vão para dentro deles lidos dos tokens do tema na hora em que o formulário abre.

### Ícones da marca

O app usa o Lucide pelo `Icon`. O checkout, Conta e plano e a volta do pagamento usam só o
`IconeMarca` (traço arredondado de 1,8 e um ponto, como a logo; o ponto principal pode ser
laranja) e os `PontosDaMarca` no lugar da roda de carregamento (spec checkout-proprio, D-73 e
CA-383). Nenhum emoji nem símbolo de texto como ícone nessas telas.

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
