# Design system do MetaNutri

A biblioteca de interface do projeto. **Os valores estão em `tokens/tokens.css`; o
contrato do que eles significam está em [DESIGN.md](../DESIGN.md), na raiz.**

Veio do export do Claude Design (`design-system-export/`, incorporado em 24/09/2026)
somado aos componentes que o repositório já tinha. Uma versão de cada componente: onde
o projeto já tinha equivalente, ele foi mantido e estendido, não duplicado.

## O mapa

| Pasta | O que guarda |
|---|---|
| `tokens/` | `tokens.css` — cor, tipografia, espaço, raio, sombra, layout e movimento, nos dois temas. Fonte da verdade. |
| `componentes/` | Os 25 componentes, na taxonomia do sistema (abaixo). O que cada um faz e a API de cada um estão em [componentes/LEIA-ME.md](componentes/LEIA-ME.md). |
| `componentes/efeitos/` | Seis efeitos de animação da área pública. Vieram do repositório (21st.dev), **não** do export, e estão fora dos 25. |
| `lib/` | `cn.ts` — junta classes do Tailwind resolvendo conflito. `src/lib/utils.ts` reexporta. |
| `vitrine/` | A tela da rota `#/design-system`: a biblioteca inteira desenhada, nos dois temas. |
| `assets/logo/` | O ícone da folha: `icone.svg` (forest + lime), `icone-lime.svg` e `icone-original.svg` (paleta azul antiga). |
| `referencia/` | As telas originais do export, congeladas. Abrem no navegador, não entram no build. |
| `index.ts` | A porta de entrada. Componente novo precisa aparecer aqui. |

## Os 25 componentes

| Grupo | Componentes |
|---|---|
| `forms/` | Button · Input · CampoNumero · Label · Textarea · Select · Switch · GrupoOpcoes |
| `display/` | Card · Badge · Alert · Progress · Separator · Table · Tooltip · Icon · Fontes\* |
| `overlay/` | Dialog · Sheet · DropdownMenu |
| `navigation/` | Tabs · ItemMenu · EtapasDoCaso |
| `nutricao/` | CartaoDestaque · BarraAdequacao · MedidorMacro |

Para que serve cada um, quando usar e a API de verdade: [componentes/LEIA-ME.md](componentes/LEIA-ME.md).

`forms/CampoTexto.tsx` é arquivo de apoio do `CampoNumero`, não um dos 25.

\* `Fontes` nasceu depois, em 24/09/2026, para recolher as citações de procedência.

Os de `nutricao/` e alguns de `forms/` e `navigation/` conhecem o domínio (importam
`@/domain/...`). Isso é de propósito: este design system é do MetaNutri, não um pacote
genérico. Os de `display/` e `overlay/` não conhecem nada do produto.

## Como usar

```ts
import { Button, Card } from '@ds'                          // pelo barril
import { Button } from '@ds/componentes/forms/button.tsx'   // direto (o que o app faz)
```

O alias `@ds` aponta para esta pasta (`vite.config.ts` e `tsconfig.app.json`). O app
importa arquivo por arquivo para o Vite separar melhor o pacote — ele roda offline e o
tamanho conta. Importar por caminho relativo (`../../design-system/...`) é erro de lint.

## Como criar um componente novo

1. **Confira se já existe.** Abra `#/design-system` no app. Estender uma variante quase
   sempre é melhor que um componente novo.
2. **Escolha o grupo** entre `forms`, `display`, `overlay`, `navigation` e `nutricao`.
   Se ele conhece o domínio do MetaNutri, o lugar é `nutricao/`.
3. **Escreva o arquivo** seguindo o vizinho: componente funcional, export nomeado, props
   tipadas com `readonly`, sem `any`. Variante com mais de duas opções usa `cva`.
4. **Sem valor solto.** Cor, fonte, espaço e raio vêm de token ou de utilitário do tema
   (`bg-card`, `text-muted-foreground`, `rounded-lg`, `text-2xs`). Precisa de um valor
   que não existe? Crie o token em `tokens/tokens.css` primeiro — os dois temas.
   O lint recusa hexadecimal e px soltos dentro da biblioteca.
5. **Cubra os estados** que o componente tem: repouso, hover, `:active`, foco visível,
   desativado, carregando, erro, vazio, selecionado.
6. **Exporte em `index.ts`.**
7. **Mostre na vitrine** (`vitrine/TelaDesignSystem.tsx`), com todas as variantes e
   estados. É o que `e2e/design-system.spec.ts` confere.
8. **Rode `npm run check`.**

## A referência visual

`referencia/index.html` é o índice — abra esse arquivo no navegador. Dentro:

- `guidelines/` — 20 páginas de fundamento (cor, tipografia, espaço, marca, movimento).
  Funcionam **offline**.
- `componentes/` — cinco páginas com os componentes do export montados ao vivo.
- `ui-kit/` — o app recriado pelo export: `index.html` (1440 × 900, clicável) e
  `mobile.html` (390 px). O [LEIA-ME de lá](referencia/ui-kit/LEIA-ME.md) mapeia cada tela
  do kit para o arquivo correspondente do projeto.
- `_runtime/` — o CSS e o pacote JavaScript do export, congelados, só para essas páginas
  renderizarem. **Não é código do projeto e não deve ser importado.** O CSS aqui é o
  original (Urbanist pelo Google Fonts, sem tema escuro); o CSS de verdade é
  `tokens/tokens.css`.

As páginas de `componentes/` e `ui-kit/` montam React, Babel e Lucide da internet
(unpkg): sem conexão elas abrem em branco. As de `guidelines/` não precisam de nada.

## O que ficou fora do export

- `_ds_manifest.json`, `_ds_bundle.js` (como fonte de componente), `.thumbnail`,
  `thumbnail.html`, `SKILL.md`, `github.md` — artefatos da ferramenta. O `_ds_bundle.js`
  sobreviveu só como runtime da referência, em `referencia/_runtime/`.
- `uploads/*.png` — 32 MB de capturas de um painel financeiro de terceiros, usadas como
  referência de linguagem visual. O próprio export diz que a marca, o texto e as telas
  de lá não são usados.
- `ui_kits/app/*.jsx` como código: as telas de verdade já existem em `src/ui/`. Os
  arquivos continuam abríveis em `referencia/ui-kit/`.
