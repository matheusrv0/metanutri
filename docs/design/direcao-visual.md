# Direção visual do MetaNutri

**Decisão do usuário (15/09/2026):** usar o template **MaterialM Free (Next.js + Tailwind)** da WrapPixel como base de design.
Cópia local: `docs/design/referencia/materialm-free-nextjs-v1.zip` (fora do git). Origem: https://github.com/wrappixel/MaterialM-Tailwind-Nextjs-Free · prévia: https://materialm-tailwind-nextjs-free.vercel.app/ · licença MIT (© 2026 WrapPixel), que permite uso comercial mantendo o aviso de copyright.

## O que o template é por dentro

| Item | No template | No MetaNutri |
|---|---|---|
| Framework | Next.js 16, React 19 | **Vite + React 18** (stack aprovada; o app é 100% no navegador e precisa funcionar sem internet) |
| Componentes | shadcn/ui estilo "new-york" + Radix | **igual** (shadcn já é a base do nosso padrão) |
| Estilo | Tailwind CSS 4 com variáveis de cor | **igual** |
| Fonte | Inter | Inter, **embutida no app** (não pela internet), para funcionar offline |
| Ícones | Iconify (Solar) + Tabler + Lucide + React Icons | **só Lucide** (padrão do shadcn, embutido; o Iconify baixa ícones da internet e quebra o offline) |
| Tema | claro e escuro (`next-themes`) | claro e escuro, com provedor próprio de poucas linhas |

## Tokens visuais extraídos (`src/app/css/theme/default-colors.css` e `globals.css` do template)

| Papel | Claro | Escuro |
|---|---|---|
| Primária | `#00A1FF` | `#00A1FF` |
| Secundária | `#16CDC7` | `#16CDC7` |
| Sucesso | `#00CEB6` | igual |
| Atenção | `#FFB900` | igual |
| Erro | `#FF6692` | igual |
| Info | `#46CAEB` | igual |
| Fundo da página | `#F8FAFD` (lightgray) | `#1A2537` |
| Cartão | `#FFFFFF` | `#111C2D` |
| Texto | `#2A3547` | `#FFFFFF` / `#7B8893` (secundário) |
| Títulos | `#111C2D` | `#FFFFFF` |
| Borda | `#E0E6EB` | `#333F55` |
| Tons claros | cor base a 12% sobre transparente (ex.: fundo do item ativo no menu) | `#00A1FF20` |

- **Raio:** 10 px base; cartões `rounded-3xl`; botões `rounded-full` (pílula).
- **Sombra:** `0 1px 4px rgba(133,146,173,.2)` nos cartões.
- **Tipografia:** Inter, corpo 14 px, títulos semibold.
- **Layout:** menu lateral fixo de 270 px à esquerda (itens em pílula; o ativo com fundo primário a 12% e texto primário), cabeçalho de ~70 px, conteúdo em fundo cinza-claro com container de até 1400 px e cartões brancos. Abaixo de 1280 px o menu vira gaveta lateral.

## Cores semânticas do produto (mapeamento)

| Estado no MetaNutri | Cor do template |
|---|---|
| Nutriente abaixo da meta | Erro `#FF6692` (tom claro de fundo) |
| Adequado / dentro da faixa | Sucesso `#00CEB6` |
| Acima do limite superior (UL/CDRR) | Atenção `#FFB900` |
| Informação, "referência: AI", fonte | Info `#46CAEB` |
| Ação principal ("cobrir", "adicionar", "exportar") | Primária `#00A1FF` |

## O que vem do template e o que fica de fora

**Vem:** tokens de cor, raio e sombra; fonte; estrutura de menu lateral + cabeçalho + área de conteúdo; alternância claro/escuro; componentes shadcn que o planejador usa (botão, cartão, campo, rótulo, seleção, abas, selo, diálogo, gaveta, menu suspenso, dica, tabela, barra de progresso, separador, interruptor, alerta, área de texto).

**Fica de fora:** páginas de demonstração (blog, tickets, notas, e-commerce, perfil), gráficos ApexCharts, carrossel Swiper, lodash, moment, redux-persist, simplebar, `tailwind-sidebar`, imagens e logotipos da WrapPixel, chamadas "Get Pro" e links externos do template.

## Crédito obrigatório (licença MIT)

O aviso de copyright da WrapPixel vai para `THIRD_PARTY_NOTICES.md` na raiz do projeto, junto com a licença da tabela TACO normalizada.
