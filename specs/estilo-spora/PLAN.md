# Estilo Spora · Fundação e Onda 1 · Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (escolhida pelo usuário) para executar este plano tarefa por tarefa. Os passos usam caixa (`- [ ]`) para acompanhar.

**Objetivo:** dar ao MetaNutri a base visual da referência Spora e entregar a Onda 1: landing nova, Preços com o botão certo, conta obrigatória, criar conta, entrar, recuperar senha, checkout, volta do pagamento, Estudante pelo e-mail da faculdade e termos com aceite.

**Arquitetura:** a Fundação troca fontes, superfícies e raios nos tokens e cria seis componentes base no design system. A Onda 1 acrescenta rotas por endereço (`#/criar-conta`, `#/assinar/...`), regras puras e testáveis em `src/domain` e `src/ui` (fluxo da conta, volta de e-mail e pagamento, dono dos dados, e-mail de faculdade), telas novas em `src/ui/publico` e a montagem em `src/App.tsx`. O servidor muda em dois arquivos: a função `assinar` (ciclo anual e endereço de volta) e o SQL `005-estudante.sql` (aprovação automática do Estudante). Publicar e rodar o SQL fica com o usuário.

**Stack:** React 18.3 + TypeScript strict + Vite 8 + Tailwind v4 + shadcn/ui · Vitest 5 + Testing Library · Playwright · Supabase JS v2 · Deno (Edge Functions).

**Spec:** `specs/estilo-spora/SPEC.md` (aprovada em 28/09/2026). Mockups em `specs/estilo-spora/mockups/`. As Ondas 2 e 3 da spec ganham planos próprios depois que esta for publicada.

## Dados do responsável (preencher antes da Tarefa 16)

O usuário vai mandar os dois valores abaixo. Quem orquestra a execução substitui as duas linhas **antes** de despachar a Tarefa 16. Nenhum subagente inventa esses valores.

- `RESPONSAVEL`: nome completo do usuário, pessoa física.
- `CONTATO_EMAIL`: o e-mail do MetaNutri que o usuário vai criar.

## Restrições globais

- Dependências novas permitidas: só `@fontsource-variable/urbanist` e `@fontsource-variable/manrope`. Nenhuma outra sem perguntar ao usuário.
- Lint: nenhuma cor hexadecimal nem `font-family` em arquivo `.ts`/`.tsx` fora dos testes. Dentro de `design-system/componentes/{forms,display,navigation,nutricao}` e da vitrine, nenhum número em `px` num literal de string.
- Import do design system pelo alias: `@ds/...`. Nunca caminho relativo para `design-system/`.
- Escala de raio deste projeto (difere do Tailwind padrão): `rounded-lg` = 16 px, `rounded-xl` = 20 px, `rounded-3xl` = 24 px (Tarefa 2), `rounded-2xl` = 28 px. Linha de lista usa 16; aviso e painel interno, 20; cartão, 24.
- Componentes funcionais, um por arquivo, export nomeado. `exactOptionalPropertyTypes` está ligado: prop opcional é `readonly x?: T | undefined`.
- Texto de interface em português do Brasil, simples. Nunca a construção "de X a Y" ou "do X ao Y" como slogan. Nunca inventar número: todo número vem do sistema ou da TACO.
- Laranja `#f26a2e` (`bg-laranja`) nunca carrega texto; texto ou botão laranja usa `--accent-strong`/`--accent-fill` (`text-acento`, `bg-acentofundo`). Laranja nunca entra em painel de dado.
- A seta laranja em círculo só aparece em elemento que leva a algum lugar (SPEC D-29).
- Toda tarefa termina com `npm run check` verde (lint, typecheck, testes). Tarefa que mexe em tela pública também roda o e2e indicado.
- Commit em Conventional Commits, em português. A mensagem vai num arquivo UTF-8 e termina com a linha `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Comando: `git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt`.
- Nunca pedir nem escrever chave do Supabase ou do Mercado Pago no código ou no chat.

## Foco de revisão

1. **O Supabase devolve a pessoa com dados no `#`** (`#access_token=...` ou `#error=...`), e o MetaNutri navega pelo `#`. A pessoa precisa cair na tela certa, com sessão, e o endereço precisa ficar limpo. Testes na Tarefa 8 (`lerVolta`, `destinoDaVolta`).
2. **Segunda conta no mesmo navegador.** Ela não pode ver nenhum paciente da primeira antes de escolher sair ou apagar. Testes nas Tarefas 9 e 24.
3. **Clique duplo em "Criar conta" ou em "Pagar".** Só uma chamada ao servidor. Testes nas Tarefas 18 e 22.
4. **E-mail com maiúscula, espaço ou subdomínio**, como `" Maria@Aluno.UFRJ.br "`. A regra do Estudante normaliza antes de conferir. Teste na Tarefa 10.
5. **Sem internet no login ou na volta do pagamento.** A tela avisa, sem quebrar. Testes nas Tarefas 19 e 23.

## Ordem e dependências

| # | Tarefa | Depende de |
|---|---|---|
| 1 | Fontes Urbanist e Manrope | — |
| 2 | Superfícies, raios e cartão | 1 |
| 3 | CartaoNumero, RotuloSecao e LinhaLista | 2 |
| 4 | SeletorSegmentado, AnelProgresso, botão laranja e DESIGN.md | 3 |
| 5 | Domínio da conta: ciclo, erros, cadastro, assinatura | — |
| 6 | Rotas novas | 5 |
| 7 | Fluxo da conta (para onde cada botão leva) | 6 |
| 8 | Volta do e-mail e do pagamento | 6, 7 |
| 9 | Dono dos dados do aparelho | — |
| 10 | E-mail de faculdade e SQL 005 | 5 |
| 11 | Função `assinar` com ciclo anual | 10 |
| 12 | `useConta` completo e plano vindo do servidor | 5 |
| 13 | `useAssinatura` com ciclo, vagas e carregado | 6, 12 |
| 14 | Moldura pública | 4, 6 |
| 15 | Landing nova | 4, 14 |
| 16 | Preços com o botão certo e constantes legais | 7, 14 |
| 17 | Peças das telas de conta | 4, 12 |
| 18 | Tela Criar conta | 10, 16, 17 |
| 19 | Tela Entrar | 17 |
| 20 | Confirmar e-mail, Esqueci a senha, Nova senha | 17 |
| 21 | Termos e Privacidade | 16 |
| 22 | Checkout | 13, 17 |
| 23 | Volta do pagamento | 13, 17 |
| 24 | Montagem no App: rotas, portão, dono, volta | 8, 9, 15, 16, 18–23 |
| 25 | Conta e plano, limite leva a planos | 24 |
| 26 | e2e da conta, documentação e publicação | 25 |

## Mapa de arquivos

**Criar**
- `design-system/componentes/display/CartaoNumero.tsx`, `RotuloSecao.tsx`, `LinhaLista.tsx`, `AnelProgresso.tsx`
- `design-system/componentes/navigation/SeletorSegmentado.tsx`
- `design-system/componentes/estilo.test.tsx`
- `e2e/fundacao.spec.ts`, `e2e/publico.spec.ts`, `e2e/conta.spec.ts`
- `src/ui/fluxoConta.ts` (+ teste), `src/ui/voltaExterna.ts` (+ teste)
- `src/domain/donoDosDados.ts` (+ teste), `src/domain/estudante.ts` (+ teste), `src/domain/legal.ts`
- `src/data/dominios-faculdades-br.json` (gerado), `scripts/dominios-faculdades.mjs`, `scripts/pratos_heroi.py`
- `supabase/005-estudante.sql` (gerado)
- `public/imagens/pratos-heroi.webp`, `public/imagens/pratos-heroi-800.webp` (gerados)
- `src/ui/estado/usarConta.test.ts`, `src/ui/estado/usarAssinatura.test.ts`
- `src/ui/publico/MolduraPublica.test.tsx`, `TelaInicio.test.tsx`, `SecaoPrecos.test.tsx`
- `src/ui/publico/conta/`: `MolduraConta.tsx`, `LadoDoPlano.tsx`, `CampoSenha.tsx`, `AvisoFormulario.tsx`, `AvisoSemServidor.tsx`, `contaFalsa.test-utils.ts`, `pecas.test.tsx`, `TelaCriarConta.tsx` (+ teste), `TelaEntrar.tsx` (+ teste), `TelaConfirmarEmail.tsx`, `TelaEsqueciSenha.tsx`, `TelaNovaSenha.tsx`, `senha.test.tsx`, `TelaOutraConta.tsx`
- `src/ui/publico/TelaTermos.tsx`, `TelaPrivacidade.tsx`, `legal.test.tsx`
- `src/ui/publico/TelaCheckout.tsx` (+ teste), `TelaVoltaPagamento.tsx` (+ teste)
- `src/AppConta.test.tsx`

**Alterar**
- `package.json`, `package-lock.json`, `src/main.tsx`, `vite.config.ts`, `playwright.config.ts`
- `design-system/tokens/tokens.css`, `src/ui/tema/globals.css`
- `design-system/componentes/display/card.tsx`, `design-system/componentes/forms/button.tsx`, `design-system/componentes/componentes.test.tsx`, `design-system/index.ts`, `design-system/vitrine/TelaDesignSystem.tsx`
- `src/domain/conta.ts` (+ teste), `src/domain/assinatura.ts` (+ teste)
- `src/ui/navegacao.ts` (+ teste), `src/ui/estado/usarConta.ts`, `src/ui/estado/usarAssinatura.ts`
- `src/ui/publico/MolduraPublica.tsx`, `TelaInicio.tsx`, `SecaoPrecos.tsx`
- `src/ui/conta/TelaConta.tsx`, `src/ui/missoes/CartaoLinkMissoes.tsx`, `src/ui/missoes/TelaAdesao.tsx`
- `src/App.tsx`, `supabase/functions/assinar/index.ts`
- `DESIGN.md`, `THIRD_PARTY_NOTICES.md`, `README.md`, `docs/decisoes.md`, `docs/pendencias.md`

**Apagar**
- `src/ui/publico/TelaEntrar.tsx`, que vira `src/ui/publico/conta/TelaEntrar.tsx` na Tarefa 19.

---

## Fundação

### Tarefa 1: Fontes Urbanist e Manrope

Cobre CA-100 e CA-101. O CA-101 continua com a Inter tabular em `numeros`, como hoje.

**Arquivos:**
- Alterar: `package.json`, `package-lock.json` (pelo npm)
- Alterar: `src/main.tsx:3-6`
- Alterar: `design-system/tokens/tokens.css:243-250`
- Alterar: `src/ui/tema/globals.css:236-248` (títulos), `:274-280` (`card-title`), `:283-291` (`rotulo`)
- Alterar: `playwright.config.ts` (`webServer.env`)
- Alterar: `THIRD_PARTY_NOTICES.md`
- Criar: `e2e/fundacao.spec.ts`

**Interfaces:**
- Produz: `--font-display` = Urbanist e `--font-corpo` = Manrope. O resto do plano usa `font-titulo` (Urbanist) e `font-sans` (Manrope) pelo Tailwind.
- Produz: e2e sempre sem Supabase (`VITE_SUPABASE_URL=desligado`). Nos testes de navegador, o portão da conta fica desligado (CA-150).

- [ ] **Passo 1: escrever o teste que falha**

`e2e/fundacao.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

// Fundação visual da spec estilo-spora.
test.describe('Fundação visual', () => {
  test('CA-100: títulos em Urbanist, texto em Manrope e o nome em Bricolage', async ({ page }) => {
    await page.goto('/#/inicio')
    const fonte = (seletor: string) => page.locator(seletor).first().evaluate((el) => getComputedStyle(el).fontFamily)
    expect(await fonte('h1')).toContain('Urbanist')
    expect(await fonte('body')).toContain('Manrope')
    expect(await fonte('.font-marca')).toContain('Bricolage')
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx playwright test e2e/fundacao.spec.ts`
Esperado: FAIL, com `fontFamily` contendo `Archivo`/`Figtree`.

- [ ] **Passo 3: trocar as dependências**

```bash
npm install @fontsource-variable/urbanist@5.3.0 @fontsource-variable/manrope@5.3.0
npm uninstall @fontsource-variable/archivo @fontsource-variable/figtree
```

- [ ] **Passo 4: trocar os imports em `src/main.tsx`**

Substitua as linhas 3 a 6:

```ts
import '@fontsource-variable/urbanist'
import '@fontsource-variable/manrope'
import '@fontsource-variable/inter'
// Só o nome da marca usa esta (kit de 27/09/2026); embutida, como as outras, porque o app roda offline.
import '@fontsource-variable/bricolage-grotesque'
```

- [ ] **Passo 5: trocar as famílias em `design-system/tokens/tokens.css`**

Substitua o bloco das linhas 243 a 250 (o comentário e as quatro `--font-*`):

```css
  /* Fontes (spec estilo-spora, 28/09/2026): Urbanist nos títulos e números grandes,
   * Manrope no texto. Embutidas pelo @fontsource porque o app roda offline.
   * A Inter continua nas colunas de número (--font-data): algarismo tabular. */
  --font-corpo: 'Manrope Variable', 'Manrope', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-display: 'Urbanist Variable', 'Urbanist', ui-sans-serif, system-ui, sans-serif;
  /* Só o nome da marca usa esta fonte (kit de 27/09/2026, peso 700). */
  --font-marca: 'Bricolage Grotesque Variable', var(--font-display);
  --font-data: 'Inter Variable', 'Inter', ui-sans-serif, system-ui, sans-serif;
```

- [ ] **Passo 6: tirar o `font-stretch` da Archivo em `src/ui/tema/globals.css`**

A Urbanist não tem eixo de largura. Nos títulos (linhas 236 a 248), troque `font-stretch: 92%;` e `letter-spacing: var(--traco-tight);` por uma linha só:

```css
    letter-spacing: var(--traco-display);
```

No `@utility card-title`, apague `font-stretch: 90%;`. No `@utility rotulo`, apague `font-stretch: 80%;` e troque `font-weight: 650;` por `font-weight: var(--weight-bold);`.

- [ ] **Passo 7: e2e sempre sem Supabase**

Em `playwright.config.ts`, dentro de `webServer`, acrescente:

```ts
    // Sem servidor de conta nos testes de navegador: o app abre no modo local
    // (SPEC CA-150), mesmo que exista um .env.local com as chaves nesta máquina.
    env: { VITE_SUPABASE_URL: 'desligado', VITE_SUPABASE_ANON_KEY: 'desligado' },
```

- [ ] **Passo 8: rodar e ver passar**

Rode: `npx playwright test e2e/fundacao.spec.ts`
Esperado: PASS. Se aparecer `reuseExistingServer`, feche antes qualquer `vite preview` aberto na porta 4173.

- [ ] **Passo 9: licenças**

Em `THIRD_PARTY_NOTICES.md`, apague as seções de Archivo e de Figtree, se existirem, e acrescente no fim:

```md
## Urbanist e Manrope (fontes)

Títulos em Urbanist e texto em Manrope desde 28/09/2026, embutidas pelos pacotes
`@fontsource-variable/urbanist` e `@fontsource-variable/manrope`.
Licença: SIL Open Font License 1.1 — https://openfontlicense.org
Urbanist: Copyright 2021 The Urbanist Project Authors. Manrope: Copyright 2018 The Manrope Project Authors.
```

- [ ] **Passo 10: verificar tudo**

Rode: `npm run check`
Esperado: lint, typecheck e testes passam.

- [ ] **Passo 11: commit**

```bash
git add package.json package-lock.json src/main.tsx design-system/tokens/tokens.css src/ui/tema/globals.css playwright.config.ts THIRD_PARTY_NOTICES.md e2e/fundacao.spec.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(fundacao): títulos em Urbanist e texto em Manrope`.

### Tarefa 2: Superfícies, raios e cartão

Cobre CA-102.

**Arquivos:**
- Alterar: `design-system/tokens/tokens.css` (primitivas, claro, escuro, raio)
- Alterar: `src/ui/tema/globals.css` (`@theme inline`)
- Alterar: `vite.config.ts:9-12`
- Alterar: `design-system/componentes/display/card.tsx:5-22`
- Alterar: `design-system/componentes/componentes.test.tsx`
- Alterar: `e2e/fundacao.spec.ts`

**Interfaces:**
- Produz: token `--mesa` (`#f1f0f0`), `--surface-row` e utilitário `bg-surfacerow`. Linha cinza dentro de cartão branco.
- Produz: `--radius-card` = 24 px, utilitário `rounded-3xl` = 24 px. `Card` padrão fica sem fio e sem sombra, com `rounded-3xl`.

- [ ] **Passo 1: escrever os testes que falham**

No fim do `describe` de `design-system/componentes/componentes.test.tsx`:

```tsx
  it('CA-102: cartão padrão é branco e arredondado, sem fio', () => {
    render(<Card>conteúdo</Card>)
    const cartao = screen.getByText('conteúdo')
    expect(cartao.className).toContain('rounded-3xl')
    expect(cartao.className).not.toContain('border')
  })
```

No `describe` de `e2e/fundacao.spec.ts`:

```ts
  test('CA-102: fundo cinza de superfície e cartão com raio de 24 px', async ({ page }) => {
    await page.goto('/#/painel')
    const fundo = await page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(fundo).toBe('rgb(241, 240, 240)')
    const raio = await page.locator('[data-slot="card"]').first().evaluate((el) => getComputedStyle(el).borderTopLeftRadius)
    expect(raio).toBe('24px')
  })
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run design-system/componentes/componentes.test.tsx`
Esperado: FAIL em "cartão padrão é branco e arredondado".

- [ ] **Passo 3: tokens**

Em `design-system/tokens/tokens.css`, na camada 1, logo depois de `--gray-900: #1f2226;`:

```css

  /* Mesa da referência Spora (28/09/2026): o cinza quente de fundo e das linhas
   * dentro de cartão branco. Um fio mais quente que --gray-100. */
  --mesa: #f1f0f0;
```

Na camada 2 (claro), troque `--bg-page: var(--gray-100);` por `--bg-page: var(--mesa);`. Logo depois de `--surface-sunken: var(--gray-50);`, acrescente:

```css
  /* Linha de lista dentro de cartão branco (LinhaLista, seletor em pílula). */
  --surface-row: var(--mesa);
```

Na camada 3 (`.dark`), depois de `--surface-sunken: #142226;`:

```css
  --surface-row: #142226;
```

Na escala de raio, depois de `--radius-2xl: 28px;`, acrescente `--radius-3xl: 24px;` e troque `--radius-card: var(--radius-lg);` por `--radius-card: var(--radius-3xl);`.

- [ ] **Passo 4: tema do Tailwind**

Em `src/ui/tema/globals.css`, dentro de `@theme inline`, depois de `--radius-2xl: 28px;`:

```css
  --radius-3xl: 24px;
```

E depois de `--color-surfacesunken: var(--surface-sunken);`:

```css
  --color-surfacerow: var(--surface-row);
```

- [ ] **Passo 5: cor de fundo do PWA**

Em `vite.config.ts`, troque o comentário e a constante:

```ts
// O manifest do PWA é JSON puro: não lê var(). Estes dois espelham
// --mesa e --ink-800 de design-system/tokens/tokens.css — mudou lá, muda aqui.
const COR_FUNDO_PWA = '#f1f0f0'
```

- [ ] **Passo 6: cartão**

Em `design-system/componentes/display/card.tsx`, troque o comentário e as variantes:

```tsx
/*
 * Cartão da referência Spora: branco, raio 24, sem fio nem sombra sobre o cinza.
 *   default  o cartão de sempre
 *   sunken   painel interno cinza (a linha da mesa), raio 20
 *   flat     com fio fino, para quando está sobre outra superfície branca
 *   sheen    painel de vitrine, gradiente cinza e raio 28
 * `tight` aperta o respiro para listas densas.
 */
export const cardVariants = cva('text-card-foreground flex flex-col min-w-0', {
  variants: {
    variant: {
      default: 'bg-card rounded-3xl',
      sunken: 'bg-surfacerow rounded-xl',
      flat: 'bg-card ring-1 ring-inset ring-border rounded-xl',
      sheen: 'rounded-2xl bg-[image:var(--gradient-sheen)] shadow-[var(--shadow-inset-sheen)]',
    },
    tight: { true: 'gap-3 p-3.5', false: 'gap-4 p-5' },
  },
  defaultVariants: { variant: 'default', tight: false },
})
```

- [ ] **Passo 7: rodar e ver passar**

Rode: `npx vitest run design-system/componentes/componentes.test.tsx` e `npx playwright test e2e/fundacao.spec.ts`
Esperado: PASS nos dois.

- [ ] **Passo 8: verificar tudo e fazer o commit**

Rode: `npm run check` (verde).

```bash
git add design-system/tokens/tokens.css src/ui/tema/globals.css vite.config.ts design-system/componentes/display/card.tsx design-system/componentes/componentes.test.tsx e2e/fundacao.spec.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(fundacao): mesa cinza, linha de lista e cartão de raio 24`.

### Tarefa 3: CartaoNumero, RotuloSecao e LinhaLista

Cobre CA-106 (parte) e CA-107.

**Arquivos:**
- Criar: `design-system/componentes/display/CartaoNumero.tsx`
- Criar: `design-system/componentes/display/RotuloSecao.tsx`
- Criar: `design-system/componentes/display/LinhaLista.tsx`
- Criar: `design-system/componentes/estilo.test.tsx`
- Alterar: `design-system/index.ts` (bloco `display`)
- Alterar: `design-system/vitrine/TelaDesignSystem.tsx` (nova `Secao`)

**Interfaces:**
- Produz:
  - `CartaoNumero({ valor: string; rotulo: string; apoio?: string; tom?: 'branco' | 'cinza' | 'teal'; aoClicar?: () => void; className?: string })`
  - `RotuloSecao({ children: ReactNode; className?: string })`
  - `LinhaLista({ titulo: ReactNode; detalhe?: ReactNode; inicio?: ReactNode; fim?: ReactNode; aoClicar?: () => void; marcada?: boolean; className?: string })`

- [ ] **Passo 1: escrever os testes que falham**

`design-system/componentes/estilo.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CartaoNumero } from '@ds/componentes/display/CartaoNumero.tsx'
import { LinhaLista } from '@ds/componentes/display/LinhaLista.tsx'
import { RotuloSecao } from '@ds/componentes/display/RotuloSecao.tsx'

describe('CartaoNumero (CA-106, CA-107)', () => {
  it('sem destino não é botão e não tem seta', () => {
    const { container } = render(<CartaoNumero valor="9" rotulo="Dias trabalhados" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(container.querySelector('svg')).toBeNull()
    expect(screen.getByText('9')).toBeInTheDocument()
  })

  it('com destino, o cartão inteiro é um botão com a seta', async () => {
    const aoClicar = vi.fn()
    const { container } = render(<CartaoNumero valor="12" rotulo="Planos" apoio="7 mexidos em 14 dias" aoClicar={aoClicar} />)
    expect(container.querySelector('svg')).not.toBeNull()
    await userEvent.setup().click(screen.getByRole('button', { name: /12\s*Planos/ }))
    expect(aoClicar).toHaveBeenCalledOnce()
  })

  it('o tom teal usa a superfície da marca', () => {
    const { container } = render(<CartaoNumero valor="2" rotulo="Precisa de atenção" tom="teal" />)
    expect(container.firstElementChild?.className).toContain('bg-surfacebrand')
  })
})

describe('RotuloSecao', () => {
  it('mostra o texto, com o ponto laranja escondido do leitor de tela', () => {
    const { container } = render(<RotuloSecao>Como funciona</RotuloSecao>)
    expect(screen.getByText('Como funciona')).toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')?.className).toContain('bg-laranja')
  })
})

describe('LinhaLista', () => {
  it('parada, é só uma linha', () => {
    render(<LinhaLista titulo="1 plano sem nome" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('clicável, a linha inteira é o botão', async () => {
    const aoClicar = vi.fn()
    render(<LinhaLista titulo="Ana · reeducação" detalhe="há 2 horas" aoClicar={aoClicar} />)
    await userEvent.setup().click(screen.getByRole('button', { name: /Ana · reeducação/ }))
    expect(aoClicar).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run design-system/componentes/estilo.test.tsx`
Esperado: FAIL, com "Failed to resolve import ...CartaoNumero.tsx".

- [ ] **Passo 3: `CartaoNumero.tsx`**

```tsx
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Cartão de número da referência Spora: valor grande em cima, rótulo e apoio embaixo.
 * A seta laranja só aparece quando o cartão leva a algum lugar (spec estilo-spora,
 * D-29): seta em cartão parado parece botão e engana.
 */
export type TomCartaoNumero = 'branco' | 'cinza' | 'teal'

interface CartaoNumeroProps {
  readonly valor: string
  readonly rotulo: string
  readonly apoio?: string | undefined
  readonly tom?: TomCartaoNumero | undefined
  readonly aoClicar?: (() => void) | undefined
  readonly className?: string | undefined
}

const TONS: Readonly<Record<TomCartaoNumero, string>> = {
  branco: 'bg-card text-card-foreground',
  cinza: 'bg-surfacerow text-foreground',
  teal: 'bg-surfacebrand text-textonbrand',
}

const APOIO: Readonly<Record<TomCartaoNumero, string>> = {
  branco: 'text-muted-foreground',
  cinza: 'text-muted-foreground',
  teal: 'text-textonbrandmuted',
}

export function CartaoNumero({ valor, rotulo, apoio, tom = 'branco', aoClicar, className }: CartaoNumeroProps) {
  const conteudo = (
    <>
      <span className="font-titulo text-4xl font-bold leading-none tracking-tight">{valor}</span>
      <span className="mt-6 flex items-end justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{rotulo}</span>
          {apoio ? <span className={cn('mt-0.5 block text-xs leading-snug', APOIO[tom])}>{apoio}</span> : null}
        </span>
        {aoClicar ? (
          <span aria-hidden="true" className="grid size-9 shrink-0 place-content-center rounded-full bg-acentofundo text-textoacento">
            <ArrowUpRight className="size-4" />
          </span>
        ) : null}
      </span>
    </>
  )

  const base = cn('flex min-h-36 w-full flex-col justify-between rounded-3xl p-5 text-left', TONS[tom], className)
  if (!aoClicar) return <div className={base}>{conteudo}</div>

  return (
    <button
      type="button"
      onClick={aoClicar}
      className={cn(
        base,
        'transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      {conteudo}
    </button>
  )
}
```

- [ ] **Passo 4: `RotuloSecao.tsx`**

```tsx
import type { ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'

/** Rótulo de seção da referência Spora: versalete pequeno com o ponto laranja da marca. */
export function RotuloSecao({ children, className }: { readonly children: ReactNode; readonly className?: string | undefined }) {
  return (
    <p className={cn('flex items-center gap-2 text-2xs font-bold uppercase tracking-[0.08em] text-foreground', className)}>
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-laranja" />
      {children}
    </p>
  )
}
```

- [ ] **Passo 5: `LinhaLista.tsx`**

```tsx
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Linha de lista em cinza, dentro de cartão branco (referência Spora). Quando recebe
 * `aoClicar`, a linha inteira vira o botão e ganha a seta no fim.
 */
interface LinhaListaProps {
  readonly titulo: ReactNode
  readonly detalhe?: ReactNode | undefined
  readonly inicio?: ReactNode | undefined
  readonly fim?: ReactNode | undefined
  readonly aoClicar?: (() => void) | undefined
  readonly marcada?: boolean | undefined
  readonly className?: string | undefined
}

export function LinhaLista({ titulo, detalhe, inicio, fim, aoClicar, marcada = false, className }: LinhaListaProps) {
  const base = cn(
    'flex min-h-14 w-full items-center gap-3 rounded-lg bg-surfacerow px-3.5 py-2.5 text-left',
    marcada && 'bg-surfaceaccentsoft ring-1 ring-inset ring-primary/30',
    className,
  )

  const miolo = (
    <>
      {inicio ? <span className="grid size-9 shrink-0 place-content-center rounded-xl bg-card text-primary [&_svg]:size-4">{inicio}</span> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-heading">{titulo}</span>
        {detalhe ? <span className="block truncate text-xs text-muted-foreground">{detalhe}</span> : null}
      </span>
      {fim ?? (aoClicar ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null)}
    </>
  )

  if (!aoClicar) return <div className={base}>{miolo}</div>

  return (
    <button
      type="button"
      onClick={aoClicar}
      className={cn(base, 'transition-[filter] hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
    >
      {miolo}
    </button>
  )
}
```

- [ ] **Passo 6: exportar e mostrar na vitrine**

Em `design-system/index.ts`, no fim do bloco `// display`:

```ts
export { CartaoNumero, type TomCartaoNumero } from './componentes/display/CartaoNumero.tsx'
export { RotuloSecao } from './componentes/display/RotuloSecao.tsx'
export { LinhaLista } from './componentes/display/LinhaLista.tsx'
```

Atualize a contagem no comentário do topo ("Os 25 componentes" vira "Os 28 componentes") e acrescente `CartaoNumero · RotuloSecao · LinhaLista` na linha `display`.

Em `design-system/vitrine/TelaDesignSystem.tsx`, importe os três pelo caminho `../componentes/display/...` (mesmo padrão dos outros imports do arquivo) e acrescente, antes da `Secao` de `CartaoDestaque`:

```tsx
        <Secao nome="CartaoNumero · RotuloSecao · LinhaLista" arquivo="display/" descricao="Referência Spora: número grande, rótulo com ponto e linha cinza. Seta só onde leva a algum lugar">
          <RotuloSecao>Como funciona</RotuloSecao>
          <div className="grid gap-3 sm:grid-cols-3">
            <CartaoNumero valor="12" rotulo="Planos" apoio="7 mexidos em 14 dias" aoClicar={() => undefined} />
            <CartaoNumero valor="9" rotulo="Dias trabalhados" apoio="nos últimos 14 dias" tom="cinza" />
            <CartaoNumero valor="2" rotulo="Precisa de atenção" apoio="Coisas que atrapalham na entrega" tom="teal" aoClicar={() => undefined} />
          </div>
          <div className="flex flex-col gap-2">
            <LinhaLista titulo="Ana · reeducação" detalhe="Atendimento completo · há 2 horas" aoClicar={() => undefined} />
            <LinhaLista titulo="1 plano sem nome" />
          </div>
        </Secao>
```

- [ ] **Passo 7: rodar e ver passar**

Rode: `npx vitest run design-system/componentes/estilo.test.tsx`
Esperado: PASS (6 testes).

- [ ] **Passo 8: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add design-system/componentes/display/CartaoNumero.tsx design-system/componentes/display/RotuloSecao.tsx design-system/componentes/display/LinhaLista.tsx design-system/componentes/estilo.test.tsx design-system/index.ts design-system/vitrine/TelaDesignSystem.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(design-system): cartão de número, rótulo de seção e linha de lista`.

### Tarefa 4: SeletorSegmentado, AnelProgresso, botão laranja e DESIGN.md

Cobre CA-106 (resto), CA-108, CA-109 (conferência) e CA-110.

**Arquivos:**
- Criar: `design-system/componentes/navigation/SeletorSegmentado.tsx`
- Criar: `design-system/componentes/display/AnelProgresso.tsx`
- Alterar: `design-system/componentes/forms/button.tsx:7-39`
- Alterar: `design-system/componentes/estilo.test.tsx`, `design-system/componentes/componentes.test.tsx`
- Alterar: `design-system/index.ts`, `design-system/vitrine/TelaDesignSystem.tsx`
- Alterar: `DESIGN.md`

**Interfaces:**
- Produz:
  - `SeletorSegmentado<T extends string>({ rotulo: string; opcoes: readonly { valor: T; rotulo: ReactNode }[]; valor: T; aoEscolher: (v: T) => void; className?: string })`, que é um `radiogroup` com `radio`s.
  - `AnelProgresso({ valor: number; maximo: number; rotulo: string; tom?: 'marca' | 'ok' | 'abaixo' | 'acima'; grande?: boolean; children?: ReactNode })`, que é um `progressbar`.
  - `Button` com `variant="laranja"`. O tamanho padrão tem 44 px de altura no celular.

- [ ] **Passo 1: escrever os testes que falham**

No fim de `design-system/componentes/estilo.test.tsx`:

```tsx
import { AnelProgresso } from '@ds/componentes/display/AnelProgresso.tsx'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'

describe('SeletorSegmentado', () => {
  it('marca a opção atual e avisa a escolha', async () => {
    const aoEscolher = vi.fn()
    render(
      <SeletorSegmentado
        rotulo="Período de cobrança"
        opcoes={[
          { valor: 'mensal', rotulo: 'Mensal' },
          { valor: 'anual', rotulo: 'Anual' },
        ]}
        valor="mensal"
        aoEscolher={aoEscolher}
      />,
    )
    expect(screen.getByRole('radio', { name: 'Mensal' })).toHaveAttribute('aria-checked', 'true')
    await userEvent.setup().click(screen.getByRole('radio', { name: 'Anual' }))
    expect(aoEscolher).toHaveBeenCalledWith('anual')
  })
})

describe('AnelProgresso', () => {
  it('é uma barra de progresso com o valor escrito no meio', () => {
    render(
      <AnelProgresso valor={2} maximo={5} rotulo="Missões feitas hoje">
        <span>2/5</span>
      </AnelProgresso>,
    )
    const anel = screen.getByRole('progressbar', { name: 'Missões feitas hoje' })
    expect(anel).toHaveAttribute('aria-valuenow', '2')
    expect(anel).toHaveAttribute('aria-valuemax', '5')
    expect(screen.getByText('2/5')).toBeInTheDocument()
  })

  it('não passa de 100% nem quebra com máximo zero', () => {
    const { rerender } = render(<AnelProgresso valor={9} maximo={5} rotulo="x" />)
    expect(screen.getByRole('progressbar').style.getPropertyValue('--anel-pct')).toBe('100%')
    rerender(<AnelProgresso valor={1} maximo={0} rotulo="x" />)
    expect(screen.getByRole('progressbar').style.getPropertyValue('--anel-pct')).toBe('0%')
  })
})
```

Os dois `import` novos sobem para o topo do arquivo, junto dos outros.

Em `design-system/componentes/componentes.test.tsx`, dentro do `describe`:

```tsx
  it('CA-108: variante laranja usa o acento da marca e o toque tem 44 px no celular', () => {
    render(<Button variant="laranja">Começar grátis</Button>)
    const botao = screen.getByRole('button', { name: 'Começar grátis' })
    expect(botao.className).toContain('bg-acentofundo')
    expect(botao.className).toContain('h-11')
  })
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run design-system/componentes`
Esperado: FAIL (imports inexistentes e a variante `laranja` não existe).

- [ ] **Passo 3: `SeletorSegmentado.tsx`**

```tsx
import type { ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Escolha entre poucas opções vizinhas, em pílula (referência Spora): mensal ou anual,
 * as etapas do plano, as opções de uma refeição. A opção marcada ganha o fundo branco.
 */
interface SeletorSegmentadoProps<T extends string> {
  readonly rotulo: string
  readonly opcoes: readonly { readonly valor: T; readonly rotulo: ReactNode }[]
  readonly valor: T
  readonly aoEscolher: (valor: T) => void
  readonly className?: string | undefined
}

export function SeletorSegmentado<T extends string>({ rotulo, opcoes, valor, aoEscolher, className }: SeletorSegmentadoProps<T>) {
  return (
    <div role="radiogroup" aria-label={rotulo} className={cn('inline-flex w-fit gap-1 rounded-full bg-surfacerow p-1', className)}>
      {opcoes.map((opcao) => {
        const marcada = opcao.valor === valor
        return (
          <button
            key={opcao.valor}
            type="button"
            role="radio"
            aria-checked={marcada}
            onClick={() => aoEscolher(opcao.valor)}
            className={cn(
              'inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors sm:min-h-9',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              marcada ? 'bg-card text-heading shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opcao.rotulo}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Passo 4: `AnelProgresso.tsx`**

```tsx
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Anel de progresso: missões feitas no dia, energia do plano sobre o gasto.
 * A cor segue o estado quando é dado (ok, abaixo, acima) e a marca quando é só
 * contagem. O número vai escrito no meio, para não depender da cor.
 */
export type TomAnel = 'marca' | 'ok' | 'abaixo' | 'acima'

const COR: Readonly<Record<TomAnel, string>> = {
  marca: 'var(--chart-1)',
  ok: 'var(--state-ok)',
  abaixo: 'var(--state-low)',
  acima: 'var(--state-high)',
}

interface AnelProgressoProps {
  readonly valor: number
  readonly maximo: number
  readonly rotulo: string
  readonly tom?: TomAnel | undefined
  readonly grande?: boolean | undefined
  readonly children?: ReactNode
}

export function AnelProgresso({ valor, maximo, rotulo, tom = 'marca', grande = false, children }: AnelProgressoProps) {
  const pct = maximo > 0 ? Math.min(100, Math.max(0, (valor / maximo) * 100)) : 0
  // Variáveis CSS e não `background` direto: o gradiente cônico fica no utilitário,
  // e o componente só informa quanto e com que cor (o jsdom também guarda variável).
  const estilo = { '--anel-pct': `${Math.round(pct)}%`, '--anel-cor': COR[tom] } as CSSProperties

  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={maximo}
      aria-valuenow={Math.min(valor, maximo)}
      style={estilo}
      className={cn(
        'grid shrink-0 place-content-center rounded-full bg-[conic-gradient(var(--anel-cor)_var(--anel-pct),var(--surface-row)_0%)]',
        grande ? 'size-24' : 'size-16',
      )}
    >
      <span className={cn('grid place-content-center rounded-full bg-card text-center', grande ? 'size-19' : 'size-12')}>{children}</span>
    </div>
  )
}
```

- [ ] **Passo 5: botão**

Em `design-system/componentes/forms/button.tsx`, troque o comentário do topo:

```tsx
/*
 * Botão pílula do sistema (referência Spora, 28/09/2026).
 *   default      teal da marca (ação principal)   laranja   acento da marca (chamar para começar)
 *   secondary    azul de nota                     soft      teal diluído
 *   outline      fio, fundo do cartão             ghost     sem moldura
 *   lightprimary tinta diluída                    link      só texto sublinhado
 *   destructive  vermelhão                        lighterror vermelhão diluído
 * No celular todo botão tem pelo menos 44 px de altura (spec estilo-spora, CA-108).
 */
```

Na lista `variant`, depois de `default`:

```tsx
        laranja: 'bg-acentofundo text-textoacento hover:brightness-110',
```

Troque o bloco `size`:

```tsx
      size: {
        default: 'h-11 px-5 py-2 sm:h-10',
        sm: 'h-11 px-3.5 text-xs sm:h-8',
        lg: 'h-12 px-7',
        icon: 'size-11 px-0 sm:size-10',
        iconsm: 'size-11 px-0 sm:size-8',
      },
```

- [ ] **Passo 6: exportar e mostrar na vitrine**

`design-system/index.ts`: no bloco `display`, `export { AnelProgresso, type TomAnel } from './componentes/display/AnelProgresso.tsx'`. No bloco `navigation`, `export { SeletorSegmentado } from './componentes/navigation/SeletorSegmentado.tsx'`. A contagem do comentário vai a 30.

Na vitrine, logo depois da `Secao` criada na Tarefa 3:

```tsx
        <Secao nome="SeletorSegmentado · AnelProgresso" arquivo="navigation/ · display/" descricao="Pílula de escolha e anel com o número escrito no meio">
          <SeletorVitrine />
          <div className="flex gap-4">
            <AnelProgresso valor={2} maximo={5} rotulo="Missões feitas hoje">
              <span className="font-titulo text-lg font-bold">2/5</span>
            </AnelProgresso>
            <AnelProgresso valor={95} maximo={100} rotulo="Energia do plano" tom="ok" grande>
              <span className="font-titulo text-xl font-bold">95%</span>
            </AnelProgresso>
          </div>
        </Secao>
```

E, fora de `TelaDesignSystem`, no mesmo arquivo:

```tsx
function SeletorVitrine() {
  const [ciclo, setCiclo] = React.useState<'mensal' | 'anual'>('mensal')
  return (
    <SeletorSegmentado
      rotulo="Período de cobrança"
      opcoes={[
        { valor: 'mensal', rotulo: 'Mensal' },
        { valor: 'anual', rotulo: 'Anual' },
      ]}
      valor={ciclo}
      aoEscolher={setCiclo}
    />
  )
}
```

Se o arquivo não importa `React` como namespace, use `import { useState } from 'react'` e `useState`.

Na `Secao` do `Button`, acrescente um exemplo `<Button variant="laranja">Começar grátis</Button>`.

- [ ] **Passo 7: DESIGN.md (CA-110)**

1. Na seção **Typography**, troque Figtree e Archivo por **Manrope** (texto) e **Urbanist** (títulos e números grandes). A Inter continua nas colunas de número.
2. Logo depois de **Overview**, acrescente esta seção:

```md
## Estilo Spora (desde 28/09/2026)

Referência: pasta `MetaNutri Design System` (imagens `spora-01` a `spora-07`). Spec: `specs/estilo-spora/SPEC.md`.

- **Mesa e cartão.** O fundo é a mesa cinza `--mesa` (#f1f0f0). Os blocos são cartões brancos com raio 24 (`rounded-3xl`), sem fio e sem sombra. Dentro do cartão branco, cada item de lista é uma linha cinza (`LinhaLista`, `bg-surfacerow`).
- **Teal no lugar do preto.** O que a referência pinta de preto (botão principal, cartão de destaque, faixa final) aqui é o teal da marca.
- **Laranja nos destaques, nunca no dado.** Botão de começar (`variant="laranja"`), seta de navegação e ponto do rótulo. Em painel de dado, nunca.
- **Seta só onde leva a algum lugar.** Cartão de número parado não tem seta (`CartaoNumero` sem `aoClicar`).
- **Foto só no topo da landing.** Uma composição de pratos recortada de fotos gratuitas, com crédito em `THIRD_PARTY_NOTICES.md`. Nenhuma outra foto no site nem no app.
- **Componentes da referência:** `CartaoNumero`, `RotuloSecao`, `LinhaLista`, `SeletorSegmentado`, `AnelProgresso` e o `Button` laranja.
- **Toque.** No celular, todo botão tem pelo menos 44 px de altura.
```

- [ ] **Passo 8: rodar e ver passar**

Rode: `npx vitest run design-system/componentes` e depois `npm run check`
Esperado: PASS. Confira também CA-109: o bloco `prefers-reduced-motion` em `globals.css` continua lá (linhas 262 a 270). Não precisa mexer.

- [ ] **Passo 9: commit**

```bash
git add design-system DESIGN.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(design-system): seletor em pílula, anel de progresso e botão laranja`.

---

## Onda 1 · Regras e servidor

### Tarefa 5: Domínio da conta: ciclo, erros, cadastro e assinatura

Base de CA-129, CA-130, CA-136, CA-139, CA-143, CA-159, CA-166 a CA-169, CA-175 e CA-177.

**Arquivos:**
- Alterar: `src/domain/conta.ts` (topo, `PlanoAssinatura`, `PLANOS`, `ErroConta`, `MENSAGEM_ERRO`, `validarCadastro`)
- Alterar: `src/domain/conta.test.ts:45-50`, `:150-153` e testes novos no fim
- Alterar: `src/domain/assinatura.ts` (arquivo inteiro)
- Alterar: `src/domain/assinatura.test.ts:5`, `:17` e testes novos no fim
- Alterar: `src/ui/publico/TelaEntrar.tsx:4` e `:39` (remendo até a Tarefa 19)

**Interfaces:**
- Produz, em `conta.ts`:
  - `type Ciclo = 'mensal' | 'anual'`, `ehCiclo(v: unknown): v is Ciclo`, `ehIdPlano(v: unknown): v is IdPlano`
  - `valorNoCiclo(plano: PlanoAssinatura, ciclo: Ciclo): number`, que é o que se paga de uma vez
  - `planoSeguinte(plano: IdPlano): IdPlano | null`
  - `PlanoAssinatura.exigeEmailDeFaculdade: boolean`, que substitui `exigeComprovante`
  - `ErroConta` ganha `'nome-vazio' | 'termos' | 'email-nao-confirmado' | 'link-vencido' | 'muitas-tentativas'`
  - `validarCadastro(dados: { nome: string; email: string; senha: string; aceitouTermos: boolean }): ErroConta | null`
- Produz, em `assinatura.ts`:
  - `Assinatura = { plano; planoPedido; status; precoTravado; expiraEm: string | null }`
  - `StatusAssinatura` ganha `'vencida'`
  - `daLinhaAssinatura(linha: unknown, agora?: Date)`
  - `type RespostaDaVolta = 'ativa' | 'analise' | 'nao-concluido'` e `respostaDaVolta(a: Assinatura): RespostaDaVolta`

- [ ] **Passo 1: escrever os testes que falham**

Em `src/domain/conta.test.ts`, troque o teste da linha 150 ("no cadastro, cobra a confirmação igual") por:

```ts
  it('CA-129: cadastro pede nome, e-mail válido, senha de 8 e o aceite dos termos', () => {
    const certo = { nome: 'Maria', email: 'maria@exemplo.com', senha: 'senhaforte1', aceitouTermos: true }
    expect(validarCadastro(certo)).toBeNull()
    expect(validarCadastro({ ...certo, nome: '   ' })).toBe('nome-vazio')
    expect(validarCadastro({ ...certo, email: 'maria' })).toBe('email-invalido')
    expect(validarCadastro({ ...certo, senha: '1234567' })).toBe('senha-curta')
    expect(validarCadastro({ ...certo, aceitouTermos: false })).toBe('termos')
  })
```

No teste da linha 45, troque o nome para `'Free e Estudante carregam marca no PDF; só o Estudante exige e-mail de faculdade'` e `p.exigeComprovante` por `p.exigeEmailDeFaculdade`.

No fim do arquivo:

```ts
describe('Ciclo de cobrança (CA-159)', () => {
  it('reconhece só mensal e anual', () => {
    expect(ehCiclo('anual')).toBe(true)
    expect(ehCiclo('semestral')).toBe(false)
    expect(ehCiclo(undefined)).toBe(false)
  })

  it('o que se paga de uma vez: o mês no mensal, o ano no anual', () => {
    const solo = planoPorId('solo')
    if (!solo) throw new Error('Solo sumiu')
    expect(valorNoCiclo(solo, 'mensal')).toBe(34.9)
    expect(valorNoCiclo(solo, 'anual')).toBe(299)
  })

  it('plano sem anual cobra o mensal mesmo no anual', () => {
    const clinica = planoPorId('clinica')
    if (!clinica) throw new Error('Clínica sumiu')
    expect(valorNoCiclo(clinica, 'anual')).toBe(149)
  })

  it('reconhece id de plano e recusa o que não existe', () => {
    expect(ehIdPlano('pro')).toBe(true)
    expect(ehIdPlano('ouro')).toBe(false)
  })
})

describe('Plano seguinte, para o aviso de limite (CA-177)', () => {
  it.each([
    ['free', 'solo'],
    ['estudante', 'solo'],
    ['solo', 'pro'],
    ['pro', 'clinica'],
    ['clinica', null],
  ] as const)('%s sobe para %s', (atual, seguinte) => {
    expect(planoSeguinte(atual)).toBe(seguinte)
  })
})

describe('Mensagens de erro da conta', () => {
  it('toda mensagem existe e é frase de verdade', () => {
    for (const texto of Object.values(MENSAGEM_ERRO)) expect(texto.length).toBeGreaterThan(10)
  })

  it('CA-136: credencial errada não diz qual dos dois errou', () => {
    expect(MENSAGEM_ERRO['credencial-invalida']).toBe('E-mail ou senha não conferem.')
  })
})
```

Acrescente `ehCiclo`, `ehIdPlano`, `MENSAGEM_ERRO`, `planoSeguinte` e `valorNoCiclo` ao import do topo do arquivo, e também `planoPorId`, se ainda não estiver lá.

Em `src/domain/assinatura.test.ts`, troque a expectativa da linha 5 por:

```ts
    expect(daLinhaAssinatura({ plano: 'pro', status: 'ativa' })).toEqual({ plano: 'pro', planoPedido: 'pro', status: 'ativa', precoTravado: false, expiraEm: null })
```

Troque a da linha 17 por:

```ts
    expect(daLinhaAssinatura({ plano: 'pro', status: 'ativíssima' })).toMatchObject({ plano: 'free', status: 'sem-assinatura' })
```

No fim do arquivo (acrescente `respostaDaVolta` ao import):

```ts
describe('Estudante vence em 12 meses (CA-175)', () => {
  const agora = new Date('2027-10-01T00:00:00Z')

  it('dentro do prazo, vale o Estudante', () => {
    expect(daLinhaAssinatura({ plano: 'estudante', status: 'ativa', expira_em: '2027-12-01T00:00:00Z' }, agora).plano).toBe('estudante')
  })

  it('passou do prazo, volta ao Free e fica marcada como vencida', () => {
    const a = daLinhaAssinatura({ plano: 'estudante', status: 'ativa', expira_em: '2027-09-01T00:00:00Z' }, agora)
    expect(a).toMatchObject({ plano: 'free', planoPedido: 'estudante', status: 'vencida', expiraEm: '2027-09-01T00:00:00Z' })
  })

  it('data quebrada não vence nem estoura', () => {
    expect(daLinhaAssinatura({ plano: 'estudante', status: 'ativa', expira_em: 'amanhã' }, agora).plano).toBe('estudante')
  })
})

describe('Resposta da volta do pagamento (CA-166 a CA-169)', () => {
  it.each([
    ['ativa', 'ativa'],
    ['pendente', 'analise'],
    ['cancelada', 'nao-concluido'],
    ['pausada', 'nao-concluido'],
    ['vencida', 'nao-concluido'],
    ['sem-assinatura', 'nao-concluido'],
  ] as const)('%s vira %s', (status, resposta) => {
    expect(respostaDaVolta({ ...SEM_ASSINATURA, status })).toBe(resposta)
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/domain/conta.test.ts src/domain/assinatura.test.ts`
Esperado: FAIL (funções e campos novos não existem).

- [ ] **Passo 3: `src/domain/conta.ts`**

1. Troque as duas linhas de comentário do topo por:

```ts
// Conta e assinatura. Com o servidor configurado, a conta é obrigatória (spec
// estilo-spora, D-23); sem servidor, o app roda inteiro no modo local.
```

2. Logo depois de `export type IdPlano = ...`:

```ts

/** Como a assinatura é cobrada. O anual cobra o ano inteiro de uma vez, a cada 12 meses (spec estilo-spora, D-26). */
export type Ciclo = 'mensal' | 'anual'

export const ehCiclo = (valor: unknown): valor is Ciclo => valor === 'mensal' || valor === 'anual'
```

3. Em `PlanoAssinatura`, troque o campo e o comentário:

```ts
  /** Só vale para conta criada com e-mail de faculdade (spec estilo-spora, D-28). */
  readonly exigeEmailDeFaculdade: boolean
```

Nos cinco planos, troque `exigeComprovante:` por `exigeEmailDeFaculdade:` com os mesmos valores. No Estudante, troque `acaoTexto: 'Enviar comprovante'` por `acaoTexto: 'Usar o e-mail da faculdade'`. No comentário acima de `PLANOS`, a frase "O plano Estudante segue o modelo do WebDiet" ganha no fim: "A conta entra pelo e-mail da faculdade, aprovada pelo servidor (spec estilo-spora, D-28)."

4. Logo depois do array `PLANOS`:

```ts

export const ehIdPlano = (valor: unknown): valor is IdPlano => typeof valor === 'string' && PLANOS.some((p) => p.id === valor)
```

5. Depois de `descontoAnualPct`:

```ts

/** O que se paga de uma vez no ciclo: o mês no mensal, o ano no anual. Sem anual, vale o mensal. */
export function valorNoCiclo(plano: PlanoAssinatura, ciclo: Ciclo): number {
  return ciclo === 'anual' && plano.anual > 0 ? plano.anual : plano.mensal
}

const SEGUINTE: Readonly<Record<IdPlano, IdPlano | null>> = { free: 'solo', estudante: 'solo', solo: 'pro', pro: 'clinica', clinica: null }

/** O plano para onde o aviso de limite aponta (CA-177). */
export const planoSeguinte = (plano: IdPlano): IdPlano | null => SEGUINTE[plano]
```

6. Troque `ErroConta` e `MENSAGEM_ERRO` por:

```ts
export type ErroConta =
  | 'nome-vazio'
  | 'email-invalido'
  | 'senha-curta'
  | 'senha-diferente'
  | 'termos'
  | 'credencial-invalida'
  | 'email-em-uso'
  | 'email-nao-confirmado'
  | 'link-vencido'
  | 'muitas-tentativas'
  | 'sem-servidor'
  | 'falha-rede'

export const MENSAGEM_ERRO: Readonly<Record<ErroConta, string>> = {
  'nome-vazio': 'Digite como quer ser chamada ou chamado.',
  'email-invalido': 'Digite um e-mail válido, como voce@exemplo.com.',
  'senha-curta': 'A senha precisa de pelo menos 8 caracteres.',
  'senha-diferente': 'As duas senhas não são iguais.',
  termos: 'Para criar a conta, marque que leu e aceita os termos.',
  'credencial-invalida': 'E-mail ou senha não conferem.',
  'email-em-uso': 'Este e-mail já tem conta.',
  'email-nao-confirmado': 'Falta confirmar o e-mail. Abra o link que mandamos para você.',
  'link-vencido': 'Este link não vale mais. Peça outro.',
  'muitas-tentativas': 'Muitas tentativas seguidas. Espere um minuto e tente de novo.',
  'sem-servidor': 'A conta na nuvem ainda não foi configurada neste MetaNutri. O sistema funciona normalmente sem ela.',
  'falha-rede': 'Não deu para falar com o servidor. Confira a internet e tente de novo.',
}
```

7. Troque `validarCadastro` por:

```ts
export interface DadosDoFormulario {
  readonly nome: string
  readonly email: string
  readonly senha: string
  readonly aceitouTermos: boolean
}

/** Erros do formulário de cadastro antes de qualquer chamada de rede (CA-129, CA-134a). */
export function validarCadastro(dados: DadosDoFormulario): ErroConta | null {
  if (dados.nome.trim() === '') return 'nome-vazio'
  const erro = validarEntrada(dados.email, dados.senha)
  if (erro) return erro
  if (!dados.aceitouTermos) return 'termos'
  return null
}
```

- [ ] **Passo 4: `src/domain/assinatura.ts` inteiro**

```ts
// O lado do navegador da assinatura. Aqui não existe preço nem cobrança: quem
// decide valor é o servidor (`supabase/functions/assinar`), porque preço que vem do
// navegador é preço que o cliente escolhe.
import { ehIdPlano, type IdPlano } from './conta.ts'

export type StatusAssinatura = 'ativa' | 'pendente' | 'pausada' | 'cancelada' | 'vencida' | 'sem-assinatura'

export interface Assinatura {
  /** O plano que vale agora. Só assinatura ativa e dentro do prazo dá plano pago. */
  readonly plano: IdPlano
  /** O plano gravado na linha, valendo ou não: é o que o "Tentar de novo" reabre. */
  readonly planoPedido: IdPlano
  readonly status: StatusAssinatura
  readonly precoTravado: boolean
  /** Até quando vale (plano Estudante). `null` quando não vence. */
  readonly expiraEm: string | null
}

export const SEM_ASSINATURA: Assinatura = { plano: 'free', planoPedido: 'free', status: 'sem-assinatura', precoTravado: false, expiraEm: null }

/** O que o banco grava. `vencida` não está aqui: ela é calculada pela data. */
const STATUS_DO_BANCO: readonly StatusAssinatura[] = ['ativa', 'pendente', 'pausada', 'cancelada', 'sem-assinatura']

/** Linha do banco → assinatura. O que não reconhece vira "sem assinatura", nunca plano pago. */
export function daLinhaAssinatura(linha: unknown, agora: Date = new Date()): Assinatura {
  if (typeof linha !== 'object' || linha === null) return SEM_ASSINATURA
  const o = linha as Record<string, unknown>

  const lido =
    typeof o['status'] === 'string' && (STATUS_DO_BANCO as readonly string[]).includes(o['status']) ? (o['status'] as StatusAssinatura) : 'sem-assinatura'
  const planoPedido: IdPlano = ehIdPlano(o['plano']) ? o['plano'] : 'free'
  const bruto = o['expira_em']
  const expiraEm = typeof bruto === 'string' && !Number.isNaN(new Date(bruto).getTime()) ? bruto : null
  // O Estudante vale 12 meses. Passou do prazo, volta ao Free sem apagar nada (CA-175).
  const status: StatusAssinatura = lido === 'ativa' && expiraEm !== null && new Date(expiraEm).getTime() < agora.getTime() ? 'vencida' : lido

  return {
    // Só assinatura ativa dá plano pago. Pendente, cancelada ou vencida volta para o
    // Free: senão, criar a assinatura e não pagar liberaria o produto inteiro.
    plano: status === 'ativa' ? planoPedido : 'free',
    planoPedido,
    status,
    precoTravado: o['preco_travado'] === true,
    expiraEm,
  }
}

export const RECADO_STATUS: Readonly<Record<StatusAssinatura, string>> = {
  ativa: 'Sua assinatura está em dia.',
  pendente: 'Falta concluir o pagamento no Mercado Pago. Até lá, vale o plano Free.',
  pausada: 'Sua assinatura está pausada. Enquanto isso, vale o plano Free.',
  cancelada: 'Sua assinatura foi cancelada. Você continua com o plano Free.',
  vencida: 'O prazo do seu plano acabou. Você continua no Free, sem perder nada.',
  'sem-assinatura': 'Você está no plano Free.',
}

/** Planos que dá para assinar sozinho; Clínica é conversa, não botão. */
export const ASSINAVEIS: readonly IdPlano[] = ['solo', 'pro']

export function podeAssinar(plano: IdPlano): boolean {
  return ASSINAVEIS.includes(plano)
}

/** O que a tela de volta do Mercado Pago mostra (CA-166 a CA-169). */
export type RespostaDaVolta = 'ativa' | 'analise' | 'nao-concluido'

export function respostaDaVolta(assinatura: Assinatura): RespostaDaVolta {
  if (assinatura.status === 'ativa') return 'ativa'
  if (assinatura.status === 'pendente') return 'analise'
  return 'nao-concluido'
}
```

- [ ] **Passo 5: remendo em `src/ui/publico/TelaEntrar.tsx` (a Tarefa 19 apaga este arquivo)**

No import da linha 4, acrescente `nomeSugerido`. Troque a linha 39 por:

```ts
    const problema =
      modo === 'entrar'
        ? validarEntrada(email, senha)
        : (validarCadastro({ nome: nomeSugerido(email), email, senha, aceitouTermos: true }) ?? (senha !== confirmacao ? 'senha-diferente' : null))
```

- [ ] **Passo 6: rodar e ver passar**

Rode: `npx vitest run src/domain`
Esperado: PASS.

- [ ] **Passo 7: verificar tudo e fazer o commit**

Rode: `npm run check`. Se o typecheck apontar outro uso de `exigeComprovante`, troque pelo nome novo.

```bash
git add src/domain/conta.ts src/domain/conta.test.ts src/domain/assinatura.ts src/domain/assinatura.test.ts src/ui/publico/TelaEntrar.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): ciclo de cobrança, erros novos e Estudante que vence`.

### Tarefa 6: Rotas novas

Base de CA-122, CA-123, CA-143, CA-147, CA-149 e CA-164.

**Arquivos:**
- Alterar: `src/ui/navegacao.ts` (tipo `Rota`, `lerRota`, `escreverRota`, telas públicas)
- Alterar: `src/ui/navegacao.test.ts`

**Interfaces:**
- Consome: `Ciclo`, `ehCiclo`, `IdPlano`, `ehIdPlano` (Tarefa 5).
- Produz:
  - `type PlanoPago = 'solo' | 'pro'` e `ehPlanoPago(v: unknown): v is PlanoPago`
  - Rotas novas: `{ tela: 'precos'; destaque?: IdPlano }`, `{ tela: 'criar-conta'; plano?: IdPlano; ciclo?: Ciclo }`, `{ tela: 'confirmar-email'; vencido?: true }`, `{ tela: 'esqueci-senha' }`, `{ tela: 'nova-senha'; vencido?: true }`, `{ tela: 'termos' }`, `{ tela: 'privacidade' }`, `{ tela: 'assinar'; plano: PlanoPago; ciclo: Ciclo }` e `{ tela: 'pagamento' }`
  - `rotaCriarConta(plano: IdPlano | null, ciclo: Ciclo): Rota`, que não grava o que é padrão (Free, mensal)
  - `TELAS_LIVRES`, `ehRotaLivre(rota: Rota): boolean` e `ehTelaPublica(rota: Rota): boolean`, que agora inclui `assinar` e `pagamento`

- [ ] **Passo 1: escrever os testes que falham**

No fim de `src/ui/navegacao.test.ts` (acrescente `ehRotaLivre` e `type Rota` ao import):

```ts
describe('rotas da conta e do pagamento (spec estilo-spora)', () => {
  it.each([
    ['#/precos', { tela: 'precos' }],
    ['#/precos/pro', { tela: 'precos', destaque: 'pro' }],
    ['#/precos/ouro', { tela: 'precos' }],
    ['#/criar-conta', { tela: 'criar-conta' }],
    ['#/criar-conta/free', { tela: 'criar-conta' }],
    ['#/criar-conta/solo', { tela: 'criar-conta', plano: 'solo' }],
    ['#/criar-conta/solo/anual', { tela: 'criar-conta', plano: 'solo', ciclo: 'anual' }],
    ['#/criar-conta/estudante/anual', { tela: 'criar-conta', plano: 'estudante' }],
    ['#/criar-conta/clinica', { tela: 'criar-conta' }],
    ['#/confirmar-email', { tela: 'confirmar-email' }],
    ['#/confirmar-email/vencido', { tela: 'confirmar-email', vencido: true }],
    ['#/esqueci-senha', { tela: 'esqueci-senha' }],
    ['#/nova-senha', { tela: 'nova-senha' }],
    ['#/nova-senha/vencido', { tela: 'nova-senha', vencido: true }],
    ['#/termos', { tela: 'termos' }],
    ['#/privacidade', { tela: 'privacidade' }],
    ['#/assinar/pro/anual', { tela: 'assinar', plano: 'pro', ciclo: 'anual' }],
    ['#/assinar/solo', { tela: 'assinar', plano: 'solo', ciclo: 'mensal' }],
    ['#/assinar/free/mensal', { tela: 'precos' }],
    ['#/pagamento', { tela: 'pagamento' }],
  ] as const)('"%s"', (hash, rota) => {
    expect(lerRota(hash)).toEqual(rota)
  })

  it('toda rota nova sobrevive à ida e volta', () => {
    const rotas: Rota[] = [
      { tela: 'precos', destaque: 'solo' },
      { tela: 'criar-conta', plano: 'pro', ciclo: 'anual' },
      { tela: 'criar-conta', plano: 'estudante' },
      { tela: 'confirmar-email', vencido: true },
      { tela: 'nova-senha' },
      { tela: 'assinar', plano: 'solo', ciclo: 'mensal' },
      { tela: 'pagamento' },
    ]
    for (const rota of rotas) expect(lerRota(escreverRota(rota))).toEqual(rota)
  })

  it('CA-149: telas livres abrem sem sessão; checkout, pagamento e painel não', () => {
    expect(ehRotaLivre({ tela: 'termos' })).toBe(true)
    expect(ehRotaLivre({ tela: 'criar-conta' })).toBe(true)
    expect(ehRotaLivre({ tela: 'missoes', token: 'x' })).toBe(true)
    expect(ehRotaLivre({ tela: 'assinar', plano: 'solo', ciclo: 'mensal' })).toBe(false)
    expect(ehRotaLivre({ tela: 'pagamento' })).toBe(false)
    expect(ehRotaLivre({ tela: 'painel' })).toBe(false)
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/navegacao.test.ts`
Esperado: FAIL (as rotas novas caem no Painel).

- [ ] **Passo 3: `src/ui/navegacao.ts`**

1. Troque o comentário da linha 1 e acrescente os imports e o tipo de plano pago:

```ts
// Navegação por endereço (#/casos, #/caso/<id>/<aba>, #/assinar/solo/anual), sem biblioteca de rotas (PLAN R-8).
import { ehCiclo, ehIdPlano, type Ciclo, type IdPlano } from '@/domain/conta.ts'
```

e, logo depois de `export type AbaPlanejador = ...`:

```ts

/** Os planos que se paga pelo checkout. Clínica é conversa; Free e Estudante não pagam. */
export type PlanoPago = 'solo' | 'pro'
export const ehPlanoPago = (valor: unknown): valor is PlanoPago => valor === 'solo' || valor === 'pro'
```

2. Troque o bloco `TELAS_PUBLICAS`/`TelaPublica` (linhas 5 a 7) por:

```ts
/** Telas que abrem sem sessão, mesmo com o servidor configurado (spec estilo-spora, CA-149). */
export const TELAS_LIVRES = ['inicio', 'precos', 'entrar', 'criar-conta', 'confirmar-email', 'esqueci-senha', 'nova-senha', 'termos', 'privacidade', 'missoes'] as const

/** Telas fora da moldura do app (sem menu lateral). Checkout e volta do pagamento pedem sessão. */
export const TELAS_PUBLICAS = [...TELAS_LIVRES, 'assinar', 'pagamento'] as const
export type TelaPublica = (typeof TELAS_PUBLICAS)[number]
```

3. No tipo `Rota`, troque a linha de `precos` e acrescente as novas depois de `entrar`:

```ts
  | { readonly tela: 'precos'; readonly destaque?: IdPlano }
  | { readonly tela: 'entrar' }
  // Sem `plano`, é o Free. Sem `ciclo`, é o mensal.
  | { readonly tela: 'criar-conta'; readonly plano?: IdPlano; readonly ciclo?: Ciclo }
  | { readonly tela: 'confirmar-email'; readonly vencido?: true }
  | { readonly tela: 'esqueci-senha' }
  | { readonly tela: 'nova-senha'; readonly vencido?: true }
  | { readonly tela: 'termos' }
  | { readonly tela: 'privacidade' }
  | { readonly tela: 'assinar'; readonly plano: PlanoPago; readonly ciclo: Ciclo }
  | { readonly tela: 'pagamento' }
```

4. Depois de `ROTA_INICIAL`:

```ts

/** A rota de Criar conta, sem gravar o que é padrão (Free, mensal). Ciclo só vale para plano pago. */
export function rotaCriarConta(plano: IdPlano | null, ciclo: Ciclo): Rota {
  if (plano === null || plano === 'free' || plano === 'clinica') return { tela: 'criar-conta' }
  return ciclo === 'anual' && ehPlanoPago(plano) ? { tela: 'criar-conta', plano, ciclo } : { tela: 'criar-conta', plano }
}
```

5. Em `lerRota`, troque as linhas de `precos` e `entrar` por:

```ts
  if (tela === 'precos') return ehIdPlano(id) ? { tela: 'precos', destaque: id } : { tela: 'precos' }
  if (tela === 'entrar') return { tela: 'entrar' }
  if (tela === 'criar-conta') return rotaCriarConta(ehIdPlano(id) ? id : null, aba === 'anual' ? 'anual' : 'mensal')
  if (tela === 'confirmar-email') return id === 'vencido' ? { tela: 'confirmar-email', vencido: true } : { tela: 'confirmar-email' }
  if (tela === 'esqueci-senha') return { tela: 'esqueci-senha' }
  if (tela === 'nova-senha') return id === 'vencido' ? { tela: 'nova-senha', vencido: true } : { tela: 'nova-senha' }
  if (tela === 'termos') return { tela: 'termos' }
  if (tela === 'privacidade') return { tela: 'privacidade' }
  if (tela === 'assinar') return ehPlanoPago(id) ? { tela: 'assinar', plano: id, ciclo: ehCiclo(aba) ? aba : 'mensal' } : { tela: 'precos' }
  if (tela === 'pagamento') return { tela: 'pagamento' }
```

6. Em `escreverRota`, troque o `case 'precos'` e acrescente os novos:

```ts
    case 'precos':
      return rota.destaque ? `#/precos/${rota.destaque}` : '#/precos'
    case 'criar-conta':
      return rota.plano ? `#/criar-conta/${rota.plano}${rota.ciclo === 'anual' ? '/anual' : ''}` : '#/criar-conta'
    case 'confirmar-email':
      return rota.vencido ? '#/confirmar-email/vencido' : '#/confirmar-email'
    case 'esqueci-senha':
      return '#/esqueci-senha'
    case 'nova-senha':
      return rota.vencido ? '#/nova-senha/vencido' : '#/nova-senha'
    case 'termos':
      return '#/termos'
    case 'privacidade':
      return '#/privacidade'
    case 'assinar':
      return `#/assinar/${rota.plano}/${rota.ciclo}`
    case 'pagamento':
      return '#/pagamento'
```

7. No fim do arquivo, troque `ehTelaPublica` e acrescente `ehRotaLivre`:

```ts
/** A moldura da área pública é outra: sem menu lateral. */
export function ehTelaPublica(rota: Rota): boolean {
  return (TELAS_PUBLICAS as readonly string[]).includes(rota.tela)
}

/** Abre sem sessão mesmo com o servidor configurado (CA-149). */
export function ehRotaLivre(rota: Rota): boolean {
  return (TELAS_LIVRES as readonly string[]).includes(rota.tela)
}
```

- [ ] **Passo 4: rodar e ver passar**

Rode: `npx vitest run src/ui/navegacao.test.ts`
Esperado: PASS.

- [ ] **Passo 5: verificar tudo e fazer o commit**

Rode: `npm run check`. O `App.tsx` continua compilando: as telas novas ainda caem na lista de Planos até a Tarefa 24.

```bash
git add src/ui/navegacao.ts src/ui/navegacao.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(rotas): endereços de conta, checkout, pagamento e termos`.

### Tarefa 7: Fluxo da conta (para onde cada botão leva)

Base de CA-117, CA-122 a CA-126, CA-133 e CA-138.

**Arquivos:**
- Criar: `src/ui/fluxoConta.ts`
- Criar: `src/ui/fluxoConta.test.ts`

**Interfaces:**
- Consome: `rotaCriarConta`, `ehPlanoPago`, `escreverRota`, `lerRota` e `Rota` (Tarefa 6); `Armazenamento` (`src/domain/persistencia.ts`).
- Produz:
  - `destinoDoPlano(plano: IdPlano, ciclo: Ciclo, temSessao: boolean): Rota | null`, que é `null` no Clínica
  - `destinoDepoisDoCadastro(plano: IdPlano | null, ciclo: Ciclo): Rota`
  - `CHAVE_DESTINO = 'metanutri:destino-pendente'`
  - `guardarDestino(arm: Armazenamento | null, rota: Rota): void`
  - `tirarDestino(arm: Armazenamento | null): Rota | null`, que lê e apaga

- [ ] **Passo 1: escrever os testes que falham**

`src/ui/fluxoConta.test.ts`:

```ts
import type { Armazenamento } from '@/domain/persistencia.ts'
import { CHAVE_DESTINO, destinoDepoisDoCadastro, destinoDoPlano, guardarDestino, tirarDestino } from './fluxoConta.ts'

function memoria(): Armazenamento & { readonly dados: Map<string, string> } {
  const dados = new Map<string, string>()
  return {
    dados,
    getItem: (c) => dados.get(c) ?? null,
    setItem: (c, v) => void dados.set(c, v),
    removeItem: (c) => void dados.delete(c),
  }
}

describe('para onde vai o botão de cada plano', () => {
  it('CA-117 e CA-124: Free sem sessão vai criar conta; com sessão, painel', () => {
    expect(destinoDoPlano('free', 'mensal', false)).toEqual({ tela: 'criar-conta' })
    expect(destinoDoPlano('free', 'anual', true)).toEqual({ tela: 'painel' })
  })

  it('CA-122: Solo ou Pro sem sessão vai criar conta com o plano e o ciclo marcados', () => {
    expect(destinoDoPlano('solo', 'anual', false)).toEqual({ tela: 'criar-conta', plano: 'solo', ciclo: 'anual' })
    expect(destinoDoPlano('pro', 'mensal', false)).toEqual({ tela: 'criar-conta', plano: 'pro' })
  })

  it('CA-123: com sessão, Solo ou Pro vão direto ao checkout', () => {
    expect(destinoDoPlano('pro', 'anual', true)).toEqual({ tela: 'assinar', plano: 'pro', ciclo: 'anual' })
  })

  it('CA-125: Estudante sem sessão cria conta; com sessão vai para Conta e plano', () => {
    expect(destinoDoPlano('estudante', 'anual', false)).toEqual({ tela: 'criar-conta', plano: 'estudante' })
    expect(destinoDoPlano('estudante', 'mensal', true)).toEqual({ tela: 'conta' })
  })

  it('CA-126: Clínica não navega (a tela mostra o contato)', () => {
    expect(destinoDoPlano('clinica', 'mensal', false)).toBeNull()
  })
})

describe('depois do cadastro (CA-133)', () => {
  it('plano pago vai pagar; Free, Estudante ou nenhum vão para o painel', () => {
    expect(destinoDepoisDoCadastro('solo', 'anual')).toEqual({ tela: 'assinar', plano: 'solo', ciclo: 'anual' })
    expect(destinoDepoisDoCadastro('estudante', 'mensal')).toEqual({ tela: 'painel' })
    expect(destinoDepoisDoCadastro(null, 'mensal')).toEqual({ tela: 'painel' })
  })
})

describe('destino guardado para depois da confirmação', () => {
  it('guarda, devolve uma vez só e apaga', () => {
    const arm = memoria()
    guardarDestino(arm, { tela: 'assinar', plano: 'pro', ciclo: 'mensal' })
    expect(arm.dados.get(CHAVE_DESTINO)).toBe('#/assinar/pro/mensal')
    expect(tirarDestino(arm)).toEqual({ tela: 'assinar', plano: 'pro', ciclo: 'mensal' })
    expect(tirarDestino(arm)).toBeNull()
  })

  it('sem armazenamento não quebra', () => {
    guardarDestino(null, { tela: 'painel' })
    expect(tirarDestino(null)).toBeNull()
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/fluxoConta.test.ts`
Esperado: FAIL, com "Failed to resolve import './fluxoConta.ts'".

- [ ] **Passo 3: `src/ui/fluxoConta.ts`**

```ts
// Para onde cada botão de plano leva e para onde a pessoa vai depois do cadastro
// (spec estilo-spora, CA-117 e CA-122 a CA-133). Regras puras: a tela só navega.
import type { Ciclo, IdPlano } from '@/domain/conta.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { ehPlanoPago, escreverRota, lerRota, rotaCriarConta, type Rota } from './navegacao.ts'

/** O destino do botão de um plano. `null` no Clínica: ele mostra o contato em vez de navegar. */
export function destinoDoPlano(plano: IdPlano, ciclo: Ciclo, temSessao: boolean): Rota | null {
  if (plano === 'clinica') return null
  if (ehPlanoPago(plano)) return temSessao ? { tela: 'assinar', plano, ciclo } : rotaCriarConta(plano, ciclo)
  if (plano === 'estudante') return temSessao ? { tela: 'conta' } : rotaCriarConta('estudante', 'mensal')
  return temSessao ? { tela: 'painel' } : rotaCriarConta(null, 'mensal')
}

/** Depois do cadastro (ou da confirmação do e-mail): quem escolheu plano pago vai pagar. */
export function destinoDepoisDoCadastro(plano: IdPlano | null, ciclo: Ciclo): Rota {
  return plano !== null && ehPlanoPago(plano) ? { tela: 'assinar', plano, ciclo } : { tela: 'painel' }
}

/*
 * O destino fica guardado no aparelho, não na aba: a pessoa pode confirmar o e-mail
 * em outra aba e precisa cair no checkout mesmo assim.
 */
export const CHAVE_DESTINO = 'metanutri:destino-pendente'

export function guardarDestino(arm: Armazenamento | null, rota: Rota): void {
  try {
    arm?.setItem(CHAVE_DESTINO, escreverRota(rota))
  } catch {
    // sem armazenamento: depois da confirmação, a pessoa cai no painel
  }
}

/** Devolve o destino guardado e apaga, para ele valer uma vez só. */
export function tirarDestino(arm: Armazenamento | null): Rota | null {
  try {
    const hash = arm?.getItem(CHAVE_DESTINO) ?? null
    arm?.removeItem(CHAVE_DESTINO)
    return hash ? lerRota(hash) : null
  } catch {
    return null
  }
}
```

- [ ] **Passo 4: rodar e ver passar**

Rode: `npx vitest run src/ui/fluxoConta.test.ts`
Esperado: PASS.

- [ ] **Passo 5: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/ui/fluxoConta.ts src/ui/fluxoConta.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): destino de cada botão de plano e do pós-cadastro`.

### Tarefa 8: Volta do e-mail e do pagamento

Base de CA-142, CA-143, CA-145, CA-147 e CA-166 (a pessoa volta com sessão e na tela certa). Cobre o item 1 do foco de revisão.

**Arquivos:**
- Criar: `src/ui/voltaExterna.ts`
- Criar: `src/ui/voltaExterna.test.ts`
- Alterar: `src/main.tsx` (tratar a volta antes de desenhar a tela)

**Interfaces:**
- Consome: `Rota` e `escreverRota` (Tarefa 6); `tirarDestino` (Tarefa 7); `obterSupabase` (`src/ui/estado/supabase.ts`); `armazenamentoLocal` (`src/ui/estado/armazenamentoLocal.ts`).
- Produz:
  - `type TipoVolta = 'confirmacao' | 'recuperacao' | 'pagamento'`
  - `interface Volta { tipo: TipoVolta | null; linkVencido: boolean }`
  - `lerVolta(search: string, hash: string): Volta`
  - `destinoDaVolta(volta: Volta, guardado: Rota | null): Rota`
  - Contrato com o servidor: o Supabase e o Mercado Pago devolvem para `<site>?volta=confirmacao|recuperacao|pagamento`. As Tarefas 11 e 12 montam esses endereços.

- [ ] **Passo 1: escrever os testes que falham**

`src/ui/voltaExterna.test.ts`:

```ts
import { destinoDaVolta, lerVolta } from './voltaExterna.ts'

describe('lerVolta: o que o Supabase e o Mercado Pago deixam no endereço', () => {
  it('endereço comum não é volta nenhuma', () => {
    expect(lerVolta('', '#/painel')).toEqual({ tipo: null, linkVencido: false })
    expect(lerVolta('', '')).toEqual({ tipo: null, linkVencido: false })
  })

  it('confirmação de e-mail: o motivo vem na consulta e o login no #', () => {
    expect(lerVolta('?volta=confirmacao', '#access_token=abc&type=signup')).toEqual({ tipo: 'confirmacao', linkVencido: false })
  })

  it('troca de senha, mesmo sem o motivo na consulta', () => {
    expect(lerVolta('', '#access_token=abc&type=recovery')).toEqual({ tipo: 'recuperacao', linkVencido: false })
  })

  it('CA-143 e CA-147: link vencido chega como erro no #', () => {
    expect(lerVolta('?volta=recuperacao', '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')).toEqual({
      tipo: 'recuperacao',
      linkVencido: true,
    })
  })

  it('volta do Mercado Pago, que acrescenta os próprios parâmetros', () => {
    expect(lerVolta('?volta=pagamento&preapproval_id=2c93', '')).toEqual({ tipo: 'pagamento', linkVencido: false })
  })

  it('motivo desconhecido é ignorado', () => {
    expect(lerVolta('?volta=qualquer', '')).toEqual({ tipo: null, linkVencido: false })
  })
})

describe('destinoDaVolta', () => {
  it('confirmação leva ao destino guardado, ou ao painel', () => {
    expect(destinoDaVolta({ tipo: 'confirmacao', linkVencido: false }, { tela: 'assinar', plano: 'solo', ciclo: 'anual' })).toEqual({
      tela: 'assinar',
      plano: 'solo',
      ciclo: 'anual',
    })
    expect(destinoDaVolta({ tipo: 'confirmacao', linkVencido: false }, null)).toEqual({ tela: 'painel' })
  })

  it('troca de senha abre Nova senha; pagamento abre a volta do pagamento', () => {
    expect(destinoDaVolta({ tipo: 'recuperacao', linkVencido: false }, null)).toEqual({ tela: 'nova-senha' })
    expect(destinoDaVolta({ tipo: 'pagamento', linkVencido: false }, null)).toEqual({ tela: 'pagamento' })
  })

  it('link vencido cai na tela que pede outro link', () => {
    expect(destinoDaVolta({ tipo: 'recuperacao', linkVencido: true }, null)).toEqual({ tela: 'nova-senha', vencido: true })
    expect(destinoDaVolta({ tipo: 'confirmacao', linkVencido: true }, null)).toEqual({ tela: 'confirmar-email', vencido: true })
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/voltaExterna.test.ts`
Esperado: FAIL (módulo inexistente).

- [ ] **Passo 3: `src/ui/voltaExterna.ts`**

```ts
// A volta de fora: o link do e-mail (Supabase) e o fim do pagamento (Mercado Pago).
//
// Os dois devolvem a pessoa para `<site>?volta=<motivo>`, endereço que nós mesmos
// pedimos. Vai na consulta, e não no `#`, por dois motivos: o MetaNutri navega pelo
// `#`, e o Mercado Pago pode descartar o que vem depois dele (spec estilo-spora, R-11).
// O Supabase ainda escreve no `#` o resultado do link: o login ou o erro.
import type { Rota } from './navegacao.ts'

export type TipoVolta = 'confirmacao' | 'recuperacao' | 'pagamento'

export interface Volta {
  readonly tipo: TipoVolta | null
  readonly linkVencido: boolean
}

const TIPOS: readonly string[] = ['confirmacao', 'recuperacao', 'pagamento']

export function lerVolta(search: string, hash: string): Volta {
  const consulta = new URLSearchParams(search.replace(/^\?/, ''))
  // `#/painel` é rota do app; `#access_token=...` ou `#error=...` é o Supabase.
  const fragmento = hash.startsWith('#/') ? new URLSearchParams() : new URLSearchParams(hash.replace(/^#/, ''))

  const pedido = consulta.get('volta') ?? ''
  const tipoDoLink = fragmento.get('type')
  const tipo: TipoVolta | null = TIPOS.includes(pedido)
    ? (pedido as TipoVolta)
    : tipoDoLink === 'recovery'
      ? 'recuperacao'
      : tipoDoLink === 'signup'
        ? 'confirmacao'
        : null

  const linkVencido = fragmento.has('error') || fragmento.has('error_code') || consulta.has('error_code')
  return { tipo, linkVencido }
}

/** A tela onde a pessoa cai. `guardado` é o destino do pós-cadastro (Tarefa 7). */
export function destinoDaVolta(volta: Volta, guardado: Rota | null): Rota {
  if (volta.linkVencido) return volta.tipo === 'recuperacao' ? { tela: 'nova-senha', vencido: true } : { tela: 'confirmar-email', vencido: true }
  if (volta.tipo === 'recuperacao') return { tela: 'nova-senha' }
  if (volta.tipo === 'pagamento') return { tela: 'pagamento' }
  return guardado ?? { tela: 'painel' }
}
```

- [ ] **Passo 4: `src/main.tsx`, tratar a volta antes de desenhar**

Acrescente aos imports:

```ts
import { armazenamentoLocal } from './ui/estado/armazenamentoLocal.ts'
import { obterSupabase } from './ui/estado/supabase.ts'
import { tirarDestino } from './ui/fluxoConta.ts'
import { escreverRota } from './ui/navegacao.ts'
import { destinoDaVolta, lerVolta } from './ui/voltaExterna.ts'
```

Troque o bloco final (`const raiz = ...` até o `render`) por:

```tsx
const raiz = document.getElementById('root')
if (!raiz) throw new Error('Elemento #root não encontrado em index.html')

/*
 * Volta do e-mail ou do pagamento (spec estilo-spora, R-10 e R-11). O Supabase lê o
 * login que veio no endereço quando o cliente nasce; só depois de `getSession` dá
 * para limpar o endereço e pôr a rota certa, sem perder a sessão.
 */
async function tratarVolta(): Promise<void> {
  const volta = lerVolta(globalThis.location.search, globalThis.location.hash)
  if (volta.tipo === null && !volta.linkVencido) return
  await obterSupabase()
    ?.auth.getSession()
    .catch(() => undefined)
  const guardado = volta.tipo === 'confirmacao' ? tirarDestino(armazenamentoLocal()) : null
  globalThis.history.replaceState(null, '', `${globalThis.location.pathname}${escreverRota(destinoDaVolta(volta, guardado))}`)
}

void tratarVolta().finally(() => {
  createRoot(raiz).render(
    <StrictMode>
      <ProvedorTema>
        <App />
      </ProvedorTema>
    </StrictMode>,
  )
})
```

- [ ] **Passo 5: rodar e ver passar**

Rode: `npx vitest run src/ui/voltaExterna.test.ts`
Esperado: PASS.

- [ ] **Passo 6: verificar tudo e fazer o commit**

Rode: `npm run check` e `npx playwright test` (os e2e antigos continuam abrindo: sem `?volta`, nada muda).

```bash
git add src/ui/voltaExterna.ts src/ui/voltaExterna.test.ts src/main.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): volta do e-mail e do Mercado Pago cai na tela certa`.

### Tarefa 9: Dono dos dados do aparelho

Base de CA-151 a CA-153. Cobre o item 2 do foco de revisão.

**Arquivos:**
- Criar: `src/domain/donoDosDados.ts`
- Criar: `src/domain/donoDosDados.test.ts`

**Interfaces:**
- Consome: `CHAVES_DE_DADOS` e `expandirChaves` (`src/domain/perfil.ts`); `Armazenamento`.
- Produz:
  - `CHAVE_DONO = 'metanutri:dono'` e `type SituacaoAoEntrar = 'mesmo' | 'adotar' | 'conflito'`
  - `situacaoAoEntrar(arm: Armazenamento | null, usuarioId: string): SituacaoAoEntrar`
  - `registrarDono(arm: Armazenamento | null, usuarioId: string): void`
  - `apagarDadosDoAparelho(arm: Armazenamento | null): void`

- [ ] **Passo 1: escrever os testes que falham**

`src/domain/donoDosDados.test.ts`:

```ts
import { CHAVE_DONO, apagarDadosDoAparelho, registrarDono, situacaoAoEntrar } from './donoDosDados.ts'
import type { Armazenamento } from './persistencia.ts'

function memoria(inicial: Record<string, string> = {}): Armazenamento & { readonly dados: Map<string, string> } {
  const dados = new Map(Object.entries(inicial))
  return {
    dados,
    getItem: (c) => dados.get(c) ?? null,
    setItem: (c, v) => void dados.set(c, v),
    removeItem: (c) => void dados.delete(c),
  }
}

describe('dono dos dados do aparelho (spec estilo-spora, D-24)', () => {
  it('CA-151: aparelho sem dono é adotado pela primeira conta', () => {
    const arm = memoria({ 'metanutri:casos': '["a"]' })
    expect(situacaoAoEntrar(arm, 'conta-1')).toBe('adotar')
    registrarDono(arm, 'conta-1')
    expect(arm.dados.get(CHAVE_DONO)).toBe('conta-1')
    expect(situacaoAoEntrar(arm, 'conta-1')).toBe('mesmo')
  })

  it('CA-152: outra conta no mesmo aparelho é conflito', () => {
    const arm = memoria({ [CHAVE_DONO]: 'conta-1' })
    expect(situacaoAoEntrar(arm, 'conta-2')).toBe('conflito')
  })

  it('CA-153: apagar leva planos, pacientes, acompanhamentos e o dono', () => {
    const arm = memoria({
      [CHAVE_DONO]: 'conta-1',
      'metanutri:casos': '["x"]',
      'metanutri:caso:x': '{}',
      'metanutri:pacientes': '[]',
      'metanutri:acompanhamentos': '[]',
      'metanutri:tema': 'escuro',
    })
    apagarDadosDoAparelho(arm)
    expect([...arm.dados.keys()]).toEqual(['metanutri:tema'])
  })

  it('sem armazenamento, ninguém briga e nada quebra', () => {
    expect(situacaoAoEntrar(null, 'conta-1')).toBe('adotar')
    registrarDono(null, 'conta-1')
    apagarDadosDoAparelho(null)
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/domain/donoDosDados.test.ts`
Esperado: FAIL (módulo inexistente).

- [ ] **Passo 3: `src/domain/donoDosDados.ts`**

```ts
// De quem são os planos e pacientes guardados neste aparelho (spec estilo-spora, D-24).
//
// Os dados continuam no navegador, e a conta passou a ser obrigatória. Sem dono, uma
// segunda pessoa que entrasse no mesmo navegador veria os pacientes da primeira.
import { CHAVES_DE_DADOS, expandirChaves } from './perfil.ts'
import type { Armazenamento } from './persistencia.ts'

export const CHAVE_DONO = 'metanutri:dono'

export type SituacaoAoEntrar = 'mesmo' | 'adotar' | 'conflito'

function lerDono(arm: Armazenamento | null): string | null {
  try {
    return arm?.getItem(CHAVE_DONO) ?? null
  } catch {
    return null
  }
}

/** Aparelho sem dono é adotado (inclusive dados de antes da conta existir, CA-151). */
export function situacaoAoEntrar(arm: Armazenamento | null, usuarioId: string): SituacaoAoEntrar {
  const dono = lerDono(arm)
  if (dono === null) return 'adotar'
  return dono === usuarioId ? 'mesmo' : 'conflito'
}

export function registrarDono(arm: Armazenamento | null, usuarioId: string): void {
  try {
    arm?.setItem(CHAVE_DONO, usuarioId)
  } catch {
    // sem armazenamento: não há dado para proteger
  }
}

/** Apaga tudo o que o MetaNutri guarda de paciente neste aparelho, e o dono (CA-153). */
export function apagarDadosDoAparelho(arm: Armazenamento | null): void {
  if (!arm) return
  for (const chave of expandirChaves(arm, [...CHAVES_DE_DADOS])) arm.removeItem(chave)
  arm.removeItem(CHAVE_DONO)
}
```

- [ ] **Passo 4: rodar e ver passar**

Rode: `npx vitest run src/domain/donoDosDados.test.ts`
Esperado: PASS.

- [ ] **Passo 5: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/domain/donoDosDados.ts src/domain/donoDosDados.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): o aparelho sabe de quem são os dados`.

### Tarefa 10: E-mail de faculdade e SQL 005

Base de CA-171 a CA-175. Cobre o item 4 do foco de revisão.

**Arquivos:**
- Criar: `scripts/dominios-faculdades.mjs`
- Criar (gerado): `src/data/dominios-faculdades-br.json`, `supabase/005-estudante.sql`
- Criar: `src/domain/estudante.ts`, `src/domain/estudante.test.ts`
- Alterar: `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Produz:
  - `DOMINIOS_FACULDADE: ReadonlySet<string>`
  - `dominioDoEmail(email: string): string | null`
  - `ehEmailDeFaculdade(email: string, dominios?: ReadonlySet<string>): boolean`
  - No banco: tabela `dominios_faculdade`, coluna `assinaturas.expira_em`, função `eh_email_de_faculdade(text)` e gatilho `aprovar_estudante_ao_confirmar` em `auth.users`.
- A regra do navegador e a do servidor são a mesma: o domínio exato, um subdomínio de um domínio da lista, ou qualquer `.edu.br`.

- [ ] **Passo 1: escrever os testes que falham**

`src/domain/estudante.test.ts`:

```ts
import { DOMINIOS_FACULDADE, dominioDoEmail, ehEmailDeFaculdade } from './estudante.ts'

describe('e-mail de faculdade (spec estilo-spora, D-28)', () => {
  const lista = new Set(['usp.br', 'ufrj.br'])

  it('aceita o domínio exato e o subdomínio de aluno', () => {
    expect(ehEmailDeFaculdade('maria@usp.br', lista)).toBe(true)
    expect(ehEmailDeFaculdade('maria@aluno.ufrj.br', lista)).toBe(true)
  })

  it('aceita qualquer .edu.br, que só instituição de ensino registra', () => {
    expect(ehEmailDeFaculdade('joao@alguma.edu.br', lista)).toBe(true)
  })

  it('normaliza maiúscula e espaço antes de conferir', () => {
    expect(ehEmailDeFaculdade('  Maria@Aluno.UFRJ.br ', lista)).toBe(true)
  })

  it('recusa e-mail pessoal e domínio que só parece de faculdade', () => {
    expect(ehEmailDeFaculdade('maria@gmail.com', lista)).toBe(false)
    expect(ehEmailDeFaculdade('maria@falsausp.br', lista)).toBe(false)
    expect(ehEmailDeFaculdade('maria@usp.br.golpe.com', lista)).toBe(false)
  })

  it('recusa texto que não é e-mail', () => {
    expect(ehEmailDeFaculdade('maria', lista)).toBe(false)
    expect(ehEmailDeFaculdade('a@b@usp.br', lista)).toBe(false)
    expect(dominioDoEmail('sem-arroba')).toBeNull()
  })

  it('a lista gerada tem as grandes e as que faltavam na fonte pública', () => {
    expect(DOMINIOS_FACULDADE.size).toBeGreaterThan(190)
    for (const d of ['usp.br', 'ufrj.br', 'unicamp.br', 'unifesp.br', 'unip.br']) expect(DOMINIOS_FACULDADE.has(d)).toBe(true)
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/domain/estudante.test.ts`
Esperado: FAIL (módulo inexistente).

- [ ] **Passo 3: `scripts/dominios-faculdades.mjs`**

```js
// Gera a lista de domínios de e-mail de faculdades brasileiras do plano Estudante
// (spec estilo-spora, D-28) e o SQL que aprova a conta sozinho no servidor.
//
// Fonte: Hipo/university-domains-list (licença MIT), mais um complemento revisado à
// mão com universidades que faltam na fonte. Qualquer .edu.br também vale: só
// instituição de ensino registra esse domínio.
//
// Saídas: src/data/dominios-faculdades-br.json (a tela avisa antes do cadastro) e
// supabase/005-estudante.sql (o servidor decide). Uso: node scripts/dominios-faculdades.mjs
import { writeFileSync } from 'node:fs'

const FONTE = 'https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json'

const COMPLEMENTO = [
  'unifesp.br', 'unesp.br', 'ufrgs.br', 'ufc.br', 'ufpr.br', 'ufg.br', 'ufv.br', 'ufla.br', 'uff.br', 'uerj.br',
  'ufscar.br', 'unirio.br', 'ufjf.br', 'ufop.br', 'ufu.br', 'ufrn.br', 'ufpb.br', 'ufal.br', 'ufs.br', 'ufpi.br',
  'ufma.br', 'ufpa.br', 'ufmt.br', 'ufms.br', 'ufes.br', 'ufsm.br', 'uel.br', 'uem.br', 'unioeste.br', 'uepg.br',
  'uece.br', 'uefs.br', 'uneb.br', 'upe.br', 'uenf.br', 'unip.br', 'mackenzie.br', 'pucsp.br', 'pucrs.br',
  'pucpr.br', 'pucminas.br', 'unisinos.br', 'ulbra.br', 'univali.br', 'unisul.br', 'fmu.br', 'usjt.br',
  'unicsul.br', 'unaerp.br', 'unifor.br', 'unicap.br', 'ucsal.br',
]

const resposta = await fetch(FONTE)
if (!resposta.ok) throw new Error(`Fonte fora do ar: ${resposta.status}`)
const universidades = await resposta.json()

const valido = (d) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)
const dominios = [
  ...new Set(
    [...universidades.filter((u) => u.country === 'Brazil').flatMap((u) => u.domains ?? []), ...COMPLEMENTO]
      .map((d) => String(d).trim().toLowerCase())
      .filter(valido),
  ),
].sort()

writeFileSync('src/data/dominios-faculdades-br.json', `${JSON.stringify(dominios, null, 2)}\n`)

const valores = dominios.map((d) => `  ('${d}')`).join(',\n')
writeFileSync(
  'supabase/005-estudante.sql',
  `-- MetaNutri — plano Estudante aprovado sozinho pelo e-mail da faculdade (spec estilo-spora, D-28).
-- GERADO por scripts/dominios-faculdades.mjs: não edite à mão, rode o script de novo.
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run. Pode rodar de novo sem estragar nada.
--
-- Como funciona: quem cria a conta marcando o Estudante grava "plano_desejado" no
-- cadastro. Quando o e-mail é confirmado, o gatilho confere se o domínio é de
-- faculdade e, se for, dá o plano Estudante por 12 meses. O navegador não consegue
-- se dar o plano: ele não escreve em "assinaturas" (RLS, 003-assinaturas.sql).

alter table public.assinaturas add column if not exists expira_em timestamptz;

create table if not exists public.dominios_faculdade (dominio text primary key);
-- Ninguém lê nem escreve pelo navegador: só a função abaixo consulta.
alter table public.dominios_faculdade enable row level security;

create or replace function public.eh_email_de_faculdade(email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    split_part(lower(trim(email)), '@', 2) like '%.edu.br'
    or exists (
      select 1 from public.dominios_faculdade d
      where split_part(lower(trim(email)), '@', 2) = d.dominio
         or split_part(lower(trim(email)), '@', 2) like ('%.' || d.dominio)
    ),
    false
  );
$$;

revoke all on function public.eh_email_de_faculdade(text) from public;

create or replace function public.aprovar_estudante()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is null then return new; end if;
  if tg_op = 'UPDATE' and old.email_confirmed_at is not null then return new; end if;
  if coalesce(new.raw_user_meta_data ->> 'plano_desejado', '') <> 'estudante' then return new; end if;
  if not public.eh_email_de_faculdade(new.email) then return new; end if;

  insert into public.assinaturas (nutricionista_id, plano, status, expira_em, atualizado_em)
  values (new.id, 'estudante', 'ativa', now() + interval '12 months', now())
  on conflict (nutricionista_id) do update
    set plano = 'estudante', status = 'ativa', expira_em = excluded.expira_em, atualizado_em = now()
    where public.assinaturas.status <> 'ativa';
  return new;
end;
$$;

drop trigger if exists aprovar_estudante_ao_confirmar on auth.users;
create trigger aprovar_estudante_ao_confirmar
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.aprovar_estudante();

-- Para aceitar uma faculdade que falta: insert into public.dominios_faculdade values ('dominio.br');
insert into public.dominios_faculdade (dominio) values
${valores}
on conflict (dominio) do nothing;
`,
)

console.log(`${dominios.length} domínios gravados.`)
```

- [ ] **Passo 4: gerar a lista e o SQL**

Rode: `node scripts/dominios-faculdades.mjs`
Esperado: "199 domínios gravados." (ou mais, se a fonte crescer) e os dois arquivos criados. Abra `supabase/005-estudante.sql` e confira que termina com a lista de `insert`.

- [ ] **Passo 5: `src/domain/estudante.ts`**

```ts
// Plano Estudante pelo e-mail da faculdade (spec estilo-spora, D-28).
//
// A tela usa isto só para avisar antes do cadastro (CA-172). Quem decide é o
// servidor, com a mesma regra, quando o e-mail é confirmado (supabase/005-estudante.sql).
import lista from '@/data/dominios-faculdades-br.json'

/** Domínios de faculdade, gerados por scripts/dominios-faculdades.mjs. */
export const DOMINIOS_FACULDADE: ReadonlySet<string> = new Set(lista)

export function dominioDoEmail(email: string): string | null {
  const partes = email.trim().toLowerCase().split('@')
  return partes.length === 2 && partes[0] && partes[1] ? partes[1] : null
}

export function ehEmailDeFaculdade(email: string, dominios: ReadonlySet<string> = DOMINIOS_FACULDADE): boolean {
  const dominio = dominioDoEmail(email)
  if (!dominio) return false
  if (dominio.endsWith('.edu.br')) return true
  for (const d of dominios) if (dominio === d || dominio.endsWith(`.${d}`)) return true
  return false
}
```

- [ ] **Passo 6: crédito da lista**

No fim de `THIRD_PARTY_NOTICES.md`:

```md
## University Domains List (domínios de faculdades)

Base da lista de domínios de e-mail de faculdades brasileiras do plano Estudante
(`src/data/dominios-faculdades-br.json` e `supabase/005-estudante.sql`), somada a um
complemento revisado à mão. Gerada por `scripts/dominios-faculdades.mjs`.
Fonte: https://github.com/Hipo/university-domains-list — Licença MIT, Copyright (c) 2016 Hipo.
```

- [ ] **Passo 7: rodar e ver passar**

Rode: `npx vitest run src/domain/estudante.test.ts`
Esperado: PASS.

- [ ] **Passo 8: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add scripts/dominios-faculdades.mjs src/data/dominios-faculdades-br.json supabase/005-estudante.sql src/domain/estudante.ts src/domain/estudante.test.ts THIRD_PARTY_NOTICES.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(estudante): plano aprovado sozinho pelo e-mail da faculdade`.

### Tarefa 11: Função `assinar` com ciclo anual e volta sem `#`

Base de CA-161 e CA-163 (lado do servidor). Não roda no Vitest: é Deno. Quem revisa confere a leitura.

**Arquivos:**
- Alterar: `supabase/functions/assinar/index.ts`

**Interfaces:**
- Consome: o corpo `{ plano: 'solo' | 'pro', ciclo: 'mensal' | 'anual' }` (Tarefa 13 manda).
- Produz: `200 { pagamento: string }`, `409 { erro }` quando já existe assinatura paga ativa, `400`/`401`/`502 { erro }` como hoje. `back_url` = `<SITE_URL>?volta=pagamento`.

- [ ] **Passo 1: preços por ciclo**

Troque a constante `PLANOS`:

```ts
/** Os planos que podem ser assinados, com o preço que o servidor considera verdade. */
const PLANOS: Record<string, { readonly nome: string; readonly mensal: number; readonly anual: number }> = {
  solo: { nome: 'MetaNutri Solo', mensal: 34.9, anual: 299 },
  pro: { nome: 'MetaNutri Pro', mensal: 64.9, anual: 599 },
}
```

- [ ] **Passo 2: ciclo, bloqueio de segunda assinatura e endereço de volta**

Troque o trecho que vai de `let corpo: { plano?: string }` até antes de `const resposta = await fetch(MP, {` por:

```ts
  let corpo: { plano?: string; ciclo?: string }
  try {
    corpo = await req.json()
  } catch {
    return erro('Corpo da requisição inválido.', 400)
  }

  // O preço vem daqui, nunca do navegador: senão dá para assinar o Pro por R$ 1.
  const escolhido = PLANOS[corpo.plano ?? '']
  if (!escolhido) return erro('Plano desconhecido.', 400)
  const anual = corpo.ciclo === 'anual'
  const valor = anual ? escolhido.anual : escolhido.mensal

  // Quem já paga não assina de novo por aqui: nasceria uma segunda cobrança (spec CA-163).
  const { data: atual } = await cliente.from('assinaturas').select('status, plano').eq('nutricionista_id', usuario.user.id).maybeSingle()
  if (atual?.status === 'ativa' && (atual.plano === 'solo' || atual.plano === 'pro')) {
    return erro('Você já tem uma assinatura ativa. A troca de plano ainda não é feita pelo site.', 409)
  }

  // A volta vai sem `#`: o Mercado Pago pode descartar o que vem depois dele (spec R-11).
  const volta = `${site.replace(/[?#].*$/, '')}?volta=pagamento`
```

- [ ] **Passo 3: o pedido ao Mercado Pago e o registro**

No `body` do `fetch(MP, ...)`, troque `reason`, `back_url` e `auto_recurring`:

```ts
      reason: `${escolhido.nome} (${anual ? 'anual' : 'mensal'})`,
      external_reference: usuario.user.id,
      payer_email: usuario.user.email,
      back_url: volta,
      status: 'pending',
      auto_recurring: {
        frequency: anual ? 12 : 1,
        frequency_type: 'months',
        transaction_amount: valor,
        currency_id: 'BRL',
      },
```

No `upsert` de `assinaturas`, troque `valor_centavos` e acrescente `expira_em`:

```ts
      valor_centavos: Math.round(valor * 100),
      // Assinatura paga não vence por data; quem vence é o Estudante.
      expira_em: null,
```

- [ ] **Passo 4: verificar e fazer o commit**

Rode: `npm run check` (o lint também lê este arquivo). Releia o arquivo inteiro: `volta` e `valor` precisam ser usados, e nenhuma referência a `escolhido.mensal` pode sobrar fora da linha de `valor`.

```bash
git add supabase/functions/assinar/index.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(cobranca): assinatura anual e volta do Mercado Pago sem #`.

### Tarefa 12: `useConta` completo e plano vindo do servidor

Base de CA-130, CA-132, CA-139, CA-140 a CA-146, CA-174 e CA-223. Também fecha uma brecha: o plano não sai mais do cadastro, que a própria pessoa edita, e passa a sair só da assinatura, que só o servidor grava.

**Arquivos:**
- Alterar: `src/domain/conta.ts` (`Sessao` sem `plano`)
- Alterar: `src/ui/estado/usarConta.ts` (arquivo inteiro)
- Criar: `src/ui/estado/usarConta.test.ts`
- Alterar: `src/App.tsx` (duas passagens de `conta.sessao.plano`)
- Alterar: `src/ui/conta/TelaConta.tsx:26`
- Alterar: `src/ui/publico/TelaEntrar.tsx` (chamada de `cadastrar`)

**Interfaces:**
- Consome: `ErroConta`, `IdPlano` e `nomeSugerido` (Tarefa 5).
- Produz:
  - `interface Sessao { id: string; email: string; nome: string }`
  - `interface Resultado { ok: boolean; erro: ErroConta | null; confirmarEmail?: boolean }`
  - `interface DadosCadastro { nome: string; email: string; senha: string; planoDesejado: IdPlano; versaoTermos: string }`
  - `interface ValorConta { sessao; carregando; disponivel; emRecuperacao: boolean; entrar(email, senha); cadastrar(dados: DadosCadastro); reenviarConfirmacao(email); pedirTrocaDeSenha(email); trocarSenha(senha); sair() }`. Todas as ações devolvem `Promise<Resultado>`, menos `sair`, que devolve `Promise<void>`.
  - `traduzir(mensagem: string): ErroConta` e `enderecoDeVolta(motivo: Exclude<TipoVolta, 'pagamento'>): string` (`TipoVolta` importado de `src/ui/voltaExterna.ts`).

- [ ] **Passo 1: escrever os testes que falham**

`src/ui/estado/usarConta.test.ts`:

```ts
import { AuthRetryableFetchError } from '@supabase/supabase-js'
import { act, renderHook, waitFor } from '@testing-library/react'
import { traduzir, useConta } from './usarConta.ts'

const { auth, avisar } = vi.hoisted(() => {
  let ouvinte: ((evento: string, sessao: unknown) => void) | null = null
  const auth = {
    getSession: vi.fn(async () => ({ data: { session: null } })),
    onAuthStateChange: vi.fn((cb: (evento: string, sessao: unknown) => void) => {
      ouvinte = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    }),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    resend: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
  }
  return { auth, avisar: (evento: string, sessao: unknown) => ouvinte?.(evento, sessao) }
})

vi.mock('./supabase.ts', () => ({ obterSupabase: () => ({ auth }), supabaseConfigurado: () => true }))

const dados = { nome: 'Maria', email: ' maria@usp.br ', senha: 'senhaforte1', planoDesejado: 'estudante', versaoTermos: '2026-09-28' } as const

describe('useConta', () => {
  beforeEach(() => vi.clearAllMocks())

  it('CA-223: cadastro grava nome, plano desejado e a versão dos termos, e volta para a confirmação', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))

    let resposta: Awaited<ReturnType<typeof result.current.cadastrar>> | undefined
    await act(async () => {
      resposta = await result.current.cadastrar(dados)
    })

    expect(resposta).toEqual({ ok: true, erro: null, confirmarEmail: true })
    const pedido = auth.signUp.mock.calls[0]?.[0]
    expect(pedido.email).toBe('maria@usp.br')
    expect(pedido.options.data).toMatchObject({ nome: 'Maria', plano_desejado: 'estudante', termos_versao: '2026-09-28' })
    expect(pedido.options.data.plano).toBeUndefined()
    expect(pedido.options.emailRedirectTo).toMatch(/\?volta=confirmacao$/)
  })

  it('cadastro sem versão dos termos não grava termos_versao nem termos_aceitos_em', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      await result.current.cadastrar({ ...dados, versaoTermos: '' })
    })
    const pedido = auth.signUp.mock.calls[0]?.[0]
    expect(pedido.options.data.termos_versao).toBeUndefined()
    expect(pedido.options.data.termos_aceitos_em).toBeUndefined()
  })

  it('CA-130: com confirmação ligada, e-mail repetido volta sem identidade e vira "já tem conta"', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { identities: [] }, session: null }, error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.cadastrar(dados)).toEqual({ ok: false, erro: 'email-em-uso' })
    })
  })

  it('CA-139: entrar sem confirmar o e-mail diz isso', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: 'Email not confirmed' } })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.entrar('maria@usp.br', 'senhaforte1')).toEqual({ ok: false, erro: 'email-nao-confirmado' })
    })
  })

  it('CA-144: pedir troca de senha responde igual, exista a conta ou não', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: { message: 'User not found' } })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.pedirTrocaDeSenha('ninguem@exemplo.com')).toEqual({ ok: true, erro: null })
    })
    expect(auth.resetPasswordForEmail.mock.calls[0]?.[1].redirectTo).toMatch(/\?volta=recuperacao$/)
  })

  it('CA-144: o limite de tentativas também vira resposta neutra, ele só dispara quando a conta existe', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: { message: 'email rate limit exceeded' } })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.pedirTrocaDeSenha('maria@usp.br')).toEqual({ ok: true, erro: null })
    })
  })

  it('CA-144: só a falta de internet aparece, e é achada pelo tipo do erro (WebKit não fala "fetch")', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: new AuthRetryableFetchError('Load failed', 0) })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.pedirTrocaDeSenha('maria@usp.br')).toEqual({ ok: false, erro: 'falha-rede' })
    })
  })

  it('CA-145: o link de troca de senha liga o modo de recuperação', async () => {
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    act(() => avisar('PASSWORD_RECOVERY', { user: { id: 'u1', email: 'maria@usp.br', user_metadata: {} } }))
    expect(result.current.emRecuperacao).toBe(true)
    expect(result.current.sessao).toEqual({ id: 'u1', email: 'maria@usp.br', nome: 'Maria' })
  })

  it('CA-146: trocar a senha desliga o modo de recuperação', async () => {
    auth.updateUser.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    act(() => avisar('PASSWORD_RECOVERY', { user: { id: 'u1', email: 'maria@usp.br', user_metadata: {} } }))
    await act(async () => {
      expect(await result.current.trocarSenha('novasenha1')).toEqual({ ok: true, erro: null })
    })
    expect(result.current.emRecuperacao).toBe(false)
  })

  it('sair desliga o modo de recuperação', async () => {
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    act(() => avisar('PASSWORD_RECOVERY', { user: { id: 'u1', email: 'maria@usp.br', user_metadata: {} } }))
    expect(result.current.emRecuperacao).toBe(true)
    await act(async () => {
      await result.current.sair()
    })
    expect(result.current.emRecuperacao).toBe(false)
  })

  it('o evento SIGNED_OUT também desliga o modo de recuperação', async () => {
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    act(() => avisar('PASSWORD_RECOVERY', { user: { id: 'u1', email: 'maria@usp.br', user_metadata: {} } }))
    expect(result.current.emRecuperacao).toBe(true)
    act(() => avisar('SIGNED_OUT', null))
    expect(result.current.emRecuperacao).toBe(false)
  })

  it('reenviarConfirmacao chama auth.resend com o tipo signup, o e-mail sem espaços e volta para a confirmação', async () => {
    auth.resend.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.reenviarConfirmacao(' maria@usp.br ')).toEqual({ ok: true, erro: null })
    })
    const pedido = auth.resend.mock.calls[0]?.[0]
    expect(pedido.type).toBe('signup')
    expect(pedido.email).toBe('maria@usp.br')
    expect(pedido.options.emailRedirectTo).toMatch(/\?volta=confirmacao$/)
  })
})

describe('traduzir as mensagens do Supabase', () => {
  it.each([
    ['User already registered', 'email-em-uso'],
    ['Invalid login credentials', 'credencial-invalida'],
    ['Email not confirmed', 'email-nao-confirmado'],
    ['Email link is invalid or has expired', 'link-vencido'],
    ['email rate limit exceeded', 'muitas-tentativas'],
    ['For security purposes, you can only request this after 45 seconds.', 'muitas-tentativas'],
    ['Failed to fetch', 'falha-rede'],
  ] as const)('"%s" vira %s', (mensagem, erro) => {
    expect(traduzir(mensagem)).toBe(erro)
  })
})
```

A mensagem de `user_metadata` vazia usa `nomeSugerido('maria@usp.br')`, que dá `'Maria'`.

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/estado/usarConta.test.ts`
Esperado: FAIL (`traduzir` não é exportada e `cadastrar` recebe outra coisa).

- [ ] **Passo 3: `Sessao` sem plano**

Em `src/domain/conta.ts`, troque `Sessao` por:

```ts
/** Quem está conectado. O plano não mora aqui: vem da assinatura, que só o servidor grava. */
export interface Sessao {
  readonly id: string
  readonly email: string
  readonly nome: string
}
```

- [ ] **Passo 4: `src/ui/estado/usarConta.ts` inteiro**

```ts
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import { nomeSugerido, type ErroConta, type IdPlano, type Sessao } from '@/domain/conta.ts'
import type { TipoVolta } from '../voltaExterna.ts'
import { obterSupabase, supabaseConfigurado } from './supabase.ts'

export interface Resultado {
  readonly ok: boolean
  readonly erro: ErroConta | null
  /** Cadastro com confirmação por e-mail pendente. */
  readonly confirmarEmail?: boolean
}

export interface DadosCadastro {
  readonly nome: string
  readonly email: string
  readonly senha: string
  /** O que a pessoa marcou. Não dá plano: quem dá é o servidor (spec estilo-spora, CA-174). */
  readonly planoDesejado: IdPlano
  readonly versaoTermos: string
}

export interface ValorConta {
  readonly sessao: Sessao | null
  readonly carregando: boolean
  /** Falso quando o projeto não tem chaves do Supabase: o app roda no modo local. */
  readonly disponivel: boolean
  /** Chegou pelo link de troca de senha e ainda não trocou. */
  readonly emRecuperacao: boolean
  readonly entrar: (email: string, senha: string) => Promise<Resultado>
  readonly cadastrar: (dados: DadosCadastro) => Promise<Resultado>
  readonly reenviarConfirmacao: (email: string) => Promise<Resultado>
  readonly pedirTrocaDeSenha: (email: string) => Promise<Resultado>
  readonly trocarSenha: (senha: string) => Promise<Resultado>
  readonly sair: () => Promise<void>
}

const SEM_SERVIDOR: Resultado = { ok: false, erro: 'sem-servidor' }
const OK: Resultado = { ok: true, erro: null }

/** As mensagens do Supabase, em inglês, viram os erros que a tela sabe explicar. */
export function traduzir(mensagem: string): ErroConta {
  const texto = mensagem.toLowerCase()
  if (texto.includes('already registered') || texto.includes('already been registered')) return 'email-em-uso'
  if (texto.includes('invalid login') || texto.includes('invalid credentials')) return 'credencial-invalida'
  if (texto.includes('not confirmed')) return 'email-nao-confirmado'
  if (texto.includes('expired')) return 'link-vencido'
  if (texto.includes('rate limit') || texto.includes('security purposes') || texto.includes('too many')) return 'muitas-tentativas'
  return 'falha-rede'
}

/** Para onde o e-mail do Supabase devolve a pessoa: o próprio site, com o motivo (spec R-10). */
export function enderecoDeVolta(motivo: Exclude<TipoVolta, 'pagamento'>): string {
  const { origin, pathname } = globalThis.location
  return `${origin}${pathname}?volta=${motivo}`
}

type Usuario = { id: string; email?: string | undefined; user_metadata?: Record<string, unknown> } | null

function montarSessao(usuario: Usuario): Sessao | null {
  if (!usuario?.email) return null
  const meta = usuario.user_metadata ?? {}
  const nome = typeof meta['nome'] === 'string' && meta['nome'].trim() ? (meta['nome'] as string) : nomeSugerido(usuario.email)
  return { id: usuario.id, email: usuario.email, nome }
}

/** Sessão da conta na nuvem. Sem Supabase configurado, devolve sessão nula e `disponivel: false`. */
export function useConta(): ValorConta {
  const disponivel = supabaseConfigurado()
  // Criado uma vez, fora da renderização: assim o estado inicial já sabe se há servidor.
  const [cliente] = useState(() => obterSupabase())
  const [sessao, setSessao] = useState<Sessao | null>(null)
  const [carregando, setCarregando] = useState(cliente !== null)
  const [emRecuperacao, setEmRecuperacao] = useState(false)

  useEffect(() => {
    if (!cliente) return
    let vivo = true

    void cliente.auth.getSession().then(({ data }) => {
      if (!vivo) return
      setSessao(montarSessao(data.session?.user ?? null))
      setCarregando(false)
    })

    const { data: inscricao } = cliente.auth.onAuthStateChange((evento, nova) => {
      if (!vivo) return
      if (evento === 'PASSWORD_RECOVERY') setEmRecuperacao(true)
      // Sair no meio da troca de senha não deve deixar o modo de recuperação ligado.
      if (evento === 'SIGNED_OUT') setEmRecuperacao(false)
      setSessao(montarSessao(nova?.user ?? null))
    })

    return () => {
      vivo = false
      inscricao.subscription.unsubscribe()
    }
  }, [cliente])

  const entrar = useCallback(async (email: string, senha: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.signInWithPassword({ email: email.trim(), password: senha })
    return error ? { ok: false, erro: traduzir(error.message) } : OK
  }, [])

  const cadastrar = useCallback(async (dados: DadosCadastro): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const email = dados.email.trim()
    const versaoTermos = dados.versaoTermos.trim()
    const { data, error } = await c.auth.signUp({
      email,
      password: dados.senha,
      options: {
        emailRedirectTo: enderecoDeVolta('confirmacao'),
        data: {
          nome: dados.nome.trim() || nomeSugerido(email),
          plano_desejado: dados.planoDesejado,
          // Sem versão (remendo do cadastro antigo, Tarefa 19 apaga), não grava aceite:
          // não houve termos para aceitar, então não é para constar como se tivesse.
          ...(versaoTermos ? { termos_versao: versaoTermos, termos_aceitos_em: new Date().toISOString() } : {}),
        },
      },
    })
    if (error) return { ok: false, erro: traduzir(error.message) }
    // Com confirmação ligada, o Supabase não conta que o e-mail já existe (para não
    // revelar quem tem conta): devolve um usuário sem identidade. É o mesmo aviso.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return { ok: false, erro: 'email-em-uso' }
    return { ok: true, erro: null, confirmarEmail: data.session === null }
  }, [])

  const reenviarConfirmacao = useCallback(async (email: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: enderecoDeVolta('confirmacao') } })
    return error ? { ok: false, erro: traduzir(error.message) } : OK
  }, [])

  const pedirTrocaDeSenha = useCallback(async (email: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.resetPasswordForEmail(email.trim(), { redirectTo: enderecoDeVolta('recuperacao') })
    if (!error) return OK
    // CA-144: a tela diz a mesma coisa exista a conta ou não — até o limite de
    // tentativas, que só dispara quando a conta existe de verdade, fica calado. Só a
    // falta de internet aparece, e é achada pelo tipo do erro, não por palavra no
    // texto: no WebKit (Safari e todo navegador de iPhone) a queda de rede chega como
    // "Load failed", que não contém "fetch" nem "network".
    if (isAuthRetryableFetchError(error) && error.status === 0) return { ok: false, erro: 'falha-rede' }
    return OK
  }, [])

  const trocarSenha = useCallback(async (senha: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.updateUser({ password: senha })
    if (error) return { ok: false, erro: traduzir(error.message) }
    setEmRecuperacao(false)
    return OK
  }, [])

  const sair = useCallback(async () => {
    const c = obterSupabase()
    if (!c) return
    await c.auth.signOut()
    setSessao(null)
    setEmRecuperacao(false)
  }, [])

  return { sessao, carregando, disponivel, emRecuperacao, entrar, cadastrar, reenviarConfirmacao, pedirTrocaDeSenha, trocarSenha, sair }
}
```

Atenção: `'Failed to fetch'` não contém `expired` nem `invalid`, então cai em `falha-rede` (via `traduzir`, usado por `entrar`/`cadastrar`/`reenviarConfirmacao`/`trocarSenha`). A mensagem de link vencido do Supabase contém `expired`. Já `pedirTrocaDeSenha` não usa `traduzir`: ele precisa saber, sem ambiguidade, se o erro é queda de rede (para mostrar) ou outra coisa (para ficar calado, CA-144) — por isso usa `isAuthRetryableFetchError` do próprio pacote em vez de procurar palavras no texto, que falha no WebKit (`"Load failed"`).

- [ ] **Passo 5: quem usava `sessao.plano`**

Em `src/App.tsx`:
1. Importe `useAssinatura` de `./ui/estado/usarAssinatura.ts`.
2. Logo depois de `const conta = useConta()`, acrescente `const { assinatura } = useAssinatura(conta.sessao !== null)`.
3. Nas duas linhas `{...(conta.sessao ? { plano: conta.sessao.plano } : {})}`, troque por `{...(conta.sessao ? { plano: assinatura.plano } : {})}`.

Em `src/ui/conta/TelaConta.tsx`, troque a linha 26 por:

```tsx
  const plano = planoPorId(assinatura.plano)
```

e apague o comentário das linhas 24 e 25, que falava do plano da sessão.

Em `src/ui/publico/TelaEntrar.tsx`, troque a chamada de cadastro por:

```ts
      : await conta.cadastrar({ nome: nomeSugerido(email), email, senha, planoDesejado: 'free', versaoTermos: '' })
```

(é remendo: a Tarefa 19 apaga este arquivo, e a Tarefa 18 cria o cadastro de verdade).

- [ ] **Passo 6: rodar e ver passar**

Rode: `npx vitest run src/ui/estado/usarConta.test.ts`
Esperado: PASS.

- [ ] **Passo 7: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/domain/conta.ts src/ui/estado/usarConta.ts src/ui/estado/usarConta.test.ts src/App.tsx src/ui/conta/TelaConta.tsx src/ui/publico/TelaEntrar.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): cadastro com termos, reenvio, troca de senha e plano vindo do servidor`.

### Tarefa 13: `useAssinatura` com ciclo, vagas e carregado

Base de CA-160, CA-161, CA-162, CA-167 e CA-190.

**Arquivos:**
- Alterar: `src/ui/estado/usarAssinatura.ts` (arquivo inteiro)
- Criar: `src/ui/estado/usarAssinatura.test.ts`
- Alterar: `src/ui/conta/TelaConta.tsx` (o botão Assinar navega para o checkout)
- Alterar: `src/App.tsx` (passar `aoAssinar` para `TelaConta`)

**Interfaces:**
- Consome: `PlanoPago` (Tarefa 6), `Ciclo` e `VAGAS_PRECO_FUNDADOR` (Tarefa 5).
- Produz: `useAssinatura(temSessao: boolean, irParaPagamento?: (url: string) => void): ValorAssinatura`, com `ValorAssinatura = { assinatura: Assinatura; carregado: boolean; carregando: boolean; vagasRestantes: number | null; assinar(plano: PlanoPago, ciclo: Ciclo): Promise<string | null>; recarregar(): void }`. `assinar` devolve a mensagem de erro, ou `null` quando levou ao pagamento.
- Produz: `TelaConta` com a prop nova `aoAssinar: (plano: PlanoPago) => void`.

- [ ] **Passo 1: escrever os testes que falham**

`src/ui/estado/usarAssinatura.test.ts`:

```ts
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAssinatura } from './usarAssinatura.ts'

const { cliente } = vi.hoisted(() => {
  const cliente = {
    linha: null as unknown,
    usadas: 14 as unknown,
    invocar: vi.fn(),
    from: () => ({ select: () => ({ maybeSingle: async () => ({ data: cliente.linha }) }) }),
    rpc: async () => ({ data: cliente.usadas }),
    functions: { invoke: (...args: unknown[]) => cliente.invocar(...args) },
  }
  return { cliente }
})

vi.mock('./supabase.ts', () => ({ obterSupabase: () => cliente }))

describe('useAssinatura', () => {
  beforeEach(() => {
    cliente.linha = null
    cliente.usadas = 14
    cliente.invocar.mockReset()
  })

  it('sem sessão já está carregado, no Free', () => {
    const { result } = renderHook(() => useAssinatura(false))
    expect(result.current.carregado).toBe(true)
    expect(result.current.assinatura.plano).toBe('free')
  })

  it('com sessão, lê a assinatura e só então marca carregado', async () => {
    cliente.linha = { plano: 'solo', status: 'ativa', preco_travado: true }
    const { result } = renderHook(() => useAssinatura(true))
    expect(result.current.carregado).toBe(false)
    await waitFor(() => expect(result.current.carregado).toBe(true))
    expect(result.current.assinatura.plano).toBe('solo')
  })

  it('CA-160: conta quantas vagas de fundador sobram', async () => {
    const { result } = renderHook(() => useAssinatura(true))
    await waitFor(() => expect(result.current.vagasRestantes).toBe(186))
  })

  it('CA-160: sem resposta do servidor, a contagem fica nula', async () => {
    cliente.usadas = null
    const { result } = renderHook(() => useAssinatura(true))
    await waitFor(() => expect(result.current.carregado).toBe(true))
    expect(result.current.vagasRestantes).toBeNull()
  })

  it('CA-161: manda plano e ciclo ao servidor, nunca o preço', async () => {
    cliente.invocar.mockResolvedValue({ data: { pagamento: 'https://mp.exemplo/pagar' }, error: null })
    const ir = vi.fn()
    const { result } = renderHook(() => useAssinatura(true, ir))
    await act(async () => {
      expect(await result.current.assinar('pro', 'anual')).toBeNull()
    })
    expect(cliente.invocar).toHaveBeenCalledWith('assinar', { body: { plano: 'pro', ciclo: 'anual' } })
    expect(ir).toHaveBeenCalledWith('https://mp.exemplo/pagar')
  })

  it('CA-162: erro do servidor volta como mensagem, sem sair da tela', async () => {
    cliente.invocar.mockResolvedValue({ data: null, error: new Error('falhou') })
    const { result } = renderHook(() => useAssinatura(true))
    await act(async () => {
      expect(await result.current.assinar('solo', 'mensal')).toMatch(/servidor de cobrança/)
    })
  })
})
```

O segundo argumento de `useAssinatura` é quem leva o navegador ao pagamento. Ele existe porque o jsdom não deixa trocar `location.assign` num teste.

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/estado/usarAssinatura.test.ts`
Esperado: FAIL (`carregado` e `vagasRestantes` não existem; `assinar` recebe um argumento só).

- [ ] **Passo 3: `src/ui/estado/usarAssinatura.ts` inteiro**

```ts
// Lê a assinatura da conta e manda assinar. O preço não passa por aqui: quem decide
// valor é a Edge Function, porque preço vindo do navegador é preço escolhido por
// quem paga.
import { useCallback, useEffect, useState } from 'react'
import { daLinhaAssinatura, SEM_ASSINATURA, type Assinatura } from '@/domain/assinatura.ts'
import { VAGAS_PRECO_FUNDADOR, type Ciclo } from '@/domain/conta.ts'
import type { PlanoPago } from '../navegacao.ts'
import { obterSupabase } from './supabase.ts'

export interface ValorAssinatura {
  readonly assinatura: Assinatura
  /** A primeira resposta do servidor chegou (ou não há sessão, ou não há servidor). */
  readonly carregado: boolean
  readonly carregando: boolean
  /** Vagas de preço de fundador que sobram. `null` quando o servidor não respondeu (CA-160). */
  readonly vagasRestantes: number | null
  /** Devolve a mensagem de erro, ou nulo quando o navegador foi levado ao pagamento. */
  readonly assinar: (plano: PlanoPago, ciclo: Ciclo) => Promise<string | null>
  readonly recarregar: () => void
}

const ERRO_GENERICO = 'Não consegui falar com o servidor de cobrança. Tente de novo em alguns minutos.'

/** A Edge Function responde erro com `{ erro }` no corpo; o supabase-js guarda a resposta em `context`. */
async function mensagemDoServidor(erro: unknown): Promise<string | null> {
  const contexto = typeof erro === 'object' && erro !== null && 'context' in erro ? (erro as { context: unknown }).context : null
  if (!(contexto instanceof Response)) return null
  try {
    const corpo: unknown = await contexto.json()
    return typeof corpo === 'object' && corpo !== null && typeof (corpo as { erro?: unknown }).erro === 'string' ? (corpo as { erro: string }).erro : null
  } catch {
    return null
  }
}

/** O pagamento acontece no Mercado Pago, não aqui: nenhum dado de cartão encosta no MetaNutri. */
const irParaUrl = (url: string) => globalThis.location.assign(url)

export function useAssinatura(temSessao: boolean, irParaPagamento: (url: string) => void = irParaUrl): ValorAssinatura {
  // Guardar a chave junto com o resultado deixa "sem assinatura" ser derivado do
  // render. Se o efeito tivesse que zerar o estado ao sair da conta, seria um
  // setState dentro de efeito, que dispara renderização em cascata.
  const [carga, setCarga] = useState<{ readonly chave: string; readonly assinatura: Assinatura } | null>(null)
  const [usadas, setUsadas] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [versao, setVersao] = useState(0)
  const [cliente] = useState(() => obterSupabase())

  const chave = temSessao ? `com-sessao:${versao}` : 'sem-sessao'
  const assinatura = carga?.chave === chave ? carga.assinatura : SEM_ASSINATURA
  const carregado = !temSessao || cliente === null || carga?.chave === chave

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useEffect(() => {
    if (!cliente || !temSessao) return
    let vivo = true
    void cliente
      .from('assinaturas')
      .select('plano, status, preco_travado, expira_em')
      .maybeSingle()
      .then(({ data }) => {
        if (vivo) setCarga({ chave, assinatura: daLinhaAssinatura(data) })
      })
    return () => {
      vivo = false
    }
  }, [cliente, temSessao, chave])

  useEffect(() => {
    if (!cliente) return
    let vivo = true
    void cliente.rpc('vagas_de_fundador_usadas').then(({ data }) => {
      if (vivo) setUsadas(typeof data === 'number' ? data : null)
    })
    return () => {
      vivo = false
    }
  }, [cliente])

  const assinar = useCallback(
    async (plano: PlanoPago, ciclo: Ciclo): Promise<string | null> => {
      const c = obterSupabase()
      if (!c) return 'A conta na nuvem não está configurada neste MetaNutri.'

      setCarregando(true)
      try {
        const { data, error } = await c.functions.invoke<{ pagamento?: string; erro?: string }>('assinar', { body: { plano, ciclo } })
        if (error) return (await mensagemDoServidor(error)) ?? ERRO_GENERICO
        if (!data?.pagamento) return data?.erro ?? 'O servidor de cobrança não devolveu o link de pagamento.'
        irParaPagamento(data.pagamento)
        return null
      } finally {
        setCarregando(false)
      }
    },
    [irParaPagamento],
  )

  const vagasRestantes = usadas === null ? null : Math.max(0, VAGAS_PRECO_FUNDADOR - usadas)
  return { assinatura, carregado, carregando, vagasRestantes, assinar, recarregar }
}
```

- [ ] **Passo 4: Conta e plano navega para o checkout (CA-190)**

Em `src/ui/conta/TelaConta.tsx`:
1. Acrescente ao import de `../navegacao.ts` (crie a linha): `import { ehPlanoPago, type PlanoPago } from '../navegacao.ts'`. Tire `CreditCard` do import do lucide-react apenas se deixar de ser usado. Tire `podeAssinar` e `IdPlano` do import, que deixam de ser usados.
2. Em `TelaContaProps`, acrescente `readonly aoAssinar: (plano: PlanoPago) => void`, e receba `aoAssinar` na função.
3. Apague `erroCobranca`, `irPagar` e o `Alert` de `erroCobranca`. Troque `const { assinatura, carregando, assinar } = useAssinatura(...)` por `const { assinatura } = useAssinatura(conta.sessao !== null)`.
4. Troque o `map` dos botões de assinar por:

```tsx
          {conta.sessao && assinatura.status !== 'ativa'
            ? PLANOS.filter((p) => ehPlanoPago(p.id)).map((p) => (
                <Button key={p.id} onClick={() => ehPlanoPago(p.id) && aoAssinar(p.id)}>
                  <CreditCard aria-hidden="true" />
                  Assinar {p.nome} · R$ {p.mensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                </Button>
              ))
            : null}
```

5. Troque o texto do botão "Ver os planos" por "Mudar de plano".

Em `src/App.tsx`, na `TelaConta`, acrescente:

```tsx
          aoAssinar={(plano) => navegar({ tela: 'assinar', plano, ciclo: 'mensal' })}
```

- [ ] **Passo 5: rodar e ver passar**

Rode: `npx vitest run src/ui/estado/usarAssinatura.test.ts`
Esperado: PASS.

- [ ] **Passo 6: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/ui/estado/usarAssinatura.ts src/ui/estado/usarAssinatura.test.ts src/ui/conta/TelaConta.tsx src/App.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(cobranca): assinatura com ciclo, vagas de fundador e carregado`.

---

## Onda 1 · Telas

### Tarefa 14: Moldura pública

Cobre CA-116, CA-118 e CA-220 (os links do rodapé).

**Arquivos:**
- Alterar: `src/ui/publico/MolduraPublica.tsx` (arquivo inteiro)
- Criar: `src/ui/publico/MolduraPublica.test.tsx`
- Alterar: `src/App.tsx` (`irPara` e a prop `temSessao`)

**Interfaces:**
- Consome: `Button` (Tarefa 4), `Logo`.
- Produz:
  - `type DestinoPublico = 'inicio' | 'precos' | 'entrar' | 'criar-conta' | 'painel' | 'termos' | 'privacidade'`
  - `MolduraPublica({ atual: DestinoPublico | null; temSessao: boolean; aoIrPara: (d: DestinoPublico) => void; children })`
  - `irComAncora(aoIrPara, destino, ancora?)` exportada
  - O rodapé tem `<h2 id="fontes">`: a landing rola até ele (CA-116a).

- [ ] **Passo 1: escrever os testes que falham**

`src/ui/publico/MolduraPublica.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MolduraPublica } from './MolduraPublica.tsx'

const montar = (temSessao: boolean, aoIrPara = vi.fn()) =>
  render(
    <MolduraPublica atual="inicio" temSessao={temSessao} aoIrPara={aoIrPara}>
      <p>conteúdo</p>
    </MolduraPublica>,
  )

describe('MolduraPublica', () => {
  it('CA-116: o menu tem Como funciona, O diferencial e Preços', async () => {
    const aoIrPara = vi.fn()
    montar(false, aoIrPara)
    const menu = within(screen.getByRole('navigation', { name: 'Seções' }))
    expect(menu.getByRole('button', { name: 'Como funciona' })).toBeInTheDocument()
    expect(menu.getByRole('button', { name: 'O diferencial' })).toBeInTheDocument()
    await userEvent.setup().click(menu.getByRole('button', { name: 'Preços' }))
    expect(aoIrPara).toHaveBeenCalledWith('precos')
  })

  it('sem sessão, o topo tem Entrar e Começar grátis', async () => {
    const aoIrPara = vi.fn()
    montar(false, aoIrPara)
    const topo = within(screen.getByRole('banner'))
    await userEvent.setup().click(topo.getByRole('button', { name: 'Começar grátis' }))
    expect(aoIrPara).toHaveBeenCalledWith('criar-conta')
    expect(topo.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('CA-118: com sessão, os dois viram Ir para o painel', () => {
    montar(true)
    const topo = within(screen.getByRole('banner'))
    expect(topo.getByRole('button', { name: 'Ir para o painel' })).toBeInTheDocument()
    expect(topo.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('CA-220: o rodapé leva aos termos e à privacidade, e tem as fontes dos dados', async () => {
    const aoIrPara = vi.fn()
    montar(false, aoIrPara)
    const rodape = within(screen.getByRole('contentinfo'))
    await userEvent.setup().click(rodape.getByRole('button', { name: 'Termos de uso' }))
    expect(aoIrPara).toHaveBeenCalledWith('termos')
    expect(rodape.getByRole('button', { name: 'Política de privacidade' })).toBeInTheDocument()
    expect(rodape.getByRole('heading', { name: 'Fontes dos dados' })).toHaveAttribute('id', 'fontes')
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/publico/MolduraPublica.test.tsx`
Esperado: FAIL (a prop `temSessao` não existe; não há "O diferencial" nem os links legais).

- [ ] **Passo 3: `src/ui/publico/MolduraPublica.tsx` inteiro**

```tsx
import { Logo } from '@ds/componentes/display/Logo.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type DestinoPublico = 'inicio' | 'precos' | 'entrar' | 'criar-conta' | 'painel' | 'termos' | 'privacidade'

interface MolduraPublicaProps {
  readonly atual: DestinoPublico | null
  readonly temSessao: boolean
  readonly aoIrPara: (destino: DestinoPublico) => void
  readonly children: ReactNode
}

const LINKS: readonly { readonly texto: string; readonly destino: DestinoPublico; readonly ancora?: string }[] = [
  { texto: 'Como funciona', destino: 'inicio', ancora: 'como-funciona' },
  { texto: 'O diferencial', destino: 'inicio', ancora: 'o-diferencial' },
  { texto: 'Preços', destino: 'precos' },
]

/** Vai para a tela e, se houver âncora, rola até ela depois que a tela montar. */
export function irComAncora(aoIrPara: (d: DestinoPublico) => void, destino: DestinoPublico, ancora?: string) {
  aoIrPara(destino)
  if (!ancora) return globalThis.scrollTo?.({ top: 0 })
  globalThis.setTimeout(() => globalThis.document.getElementById(ancora)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
}

const LINK_RODAPE =
  'rounded-sm text-muted-foreground hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/**
 * Moldura das telas públicas no estilo da referência Spora: menu reto sobre a mesa
 * cinza, em versalete, e o botão de começar em pílula de contorno.
 */
export function MolduraPublica({ atual, temSessao, aoIrPara, children }: MolduraPublicaProps) {
  const itemMenu =
    'inline-flex items-center min-h-11 sm:min-h-9 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-50 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1216px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-8 sm:py-4">
          <button
            type="button"
            onClick={() => irComAncora(aoIrPara, 'inicio')}
            aria-label="MetaNutri, início"
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo tamanho={28} />
          </button>

          <nav aria-label="Seções" className="order-3 flex w-full justify-center gap-1 sm:order-none sm:mx-auto sm:w-auto">
            {LINKS.map((link) => {
              const aqui = atual === link.destino && !link.ancora
              return (
                <button
                  key={link.texto}
                  type="button"
                  onClick={() => irComAncora(aoIrPara, link.destino, link.ancora)}
                  aria-current={aqui ? 'page' : undefined}
                  className={cn(itemMenu, aqui ? 'text-heading underline underline-offset-8' : 'text-foreground hover:bg-card')}
                >
                  {link.texto}
                </button>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            {temSessao ? (
              <Button onClick={() => aoIrPara('painel')}>Ir para o painel</Button>
            ) : (
              <>
                <button type="button" onClick={() => aoIrPara('entrar')} className={cn(itemMenu, 'text-sm normal-case tracking-normal text-foreground hover:bg-card')}>
                  Entrar
                </button>
                <Button variant="outline" className="border-heading bg-transparent text-heading" onClick={() => aoIrPara('criar-conta')}>
                  Começar grátis
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="conteudo" className="flex-1">
        {children}
      </main>

      <footer className="bg-card px-4 pb-8 pt-14 sm:px-8">
        <div className="mx-auto grid max-w-[1216px] gap-9 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <Logo tamanho={28} />
            <p className="mt-3.5 max-w-[38ch] text-sm text-muted-foreground">
              O programa de nutrição que mostra o que falta no plano e sugere o que comer. Funciona no navegador, até sem internet.
            </p>
          </div>
          <section aria-labelledby="fontes">
            <h2 id="fontes" className="mb-3.5 scroll-mt-24 text-sm font-semibold text-muted-foreground">
              Fontes dos dados
            </h2>
            <ul className="grid gap-2.5 text-sm text-muted-foreground">
              <li>NEPA/UNICAMP. TACO, 4ª ed., 2011</li>
              <li>IBGE. POF 2008-2009</li>
              <li>NASEM. DRI, Apêndice J, 2019</li>
              <li>OMS, 2006 e 2007 · SISVAN, 2011</li>
            </ul>
          </section>
          <div>
            <h2 className="mb-3.5 text-sm font-semibold text-muted-foreground">Produto</h2>
            <ul className="grid gap-2.5 text-sm">
              <li>
                <button type="button" onClick={() => aoIrPara('precos')} className={LINK_RODAPE}>
                  Preços
                </button>
              </li>
              <li>
                <button type="button" onClick={() => aoIrPara(temSessao ? 'painel' : 'criar-conta')} className={LINK_RODAPE}>
                  {temSessao ? 'Ir para o painel' : 'Começar grátis'}
                </button>
              </li>
              {temSessao ? null : (
                <li>
                  <button type="button" onClick={() => aoIrPara('entrar')} className={LINK_RODAPE}>
                    Entrar
                  </button>
                </li>
              )}
            </ul>
          </div>
          <div>
            <h2 className="mb-3.5 text-sm font-semibold text-muted-foreground">Legal</h2>
            <ul className="grid gap-2.5 text-sm">
              <li>
                <button type="button" onClick={() => aoIrPara('termos')} className={LINK_RODAPE}>
                  Termos de uso
                </button>
              </li>
              <li>
                <button type="button" onClick={() => aoIrPara('privacidade')} className={LINK_RODAPE}>
                  Política de privacidade
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-[1216px] gap-2 border-t border-border pt-6 text-sm text-muted-foreground">
          <p>A prescrição de dieta é privativa de nutricionista com registro no CRN (Lei 8.234/1991).</p>
          <p>Os cálculos ainda não foram conferidos por nutricionista.</p>
        </div>
      </footer>
    </div>
  )
}
```

- [ ] **Passo 4: `App.tsx`**

Troque `irPara` por:

```tsx
  const irPara = (destino: DestinoPublico) => navegar(destino === 'criar-conta' ? rotaCriarConta(null, 'mensal') : { tela: destino })
```

(importe `rotaCriarConta` de `./ui/navegacao.ts`). Em cada `<MolduraPublica ...>`, acrescente `temSessao={conta.sessao !== null}`.

- [ ] **Passo 5: rodar e ver passar**

Rode: `npx vitest run src/ui/publico/MolduraPublica.test.tsx`
Esperado: PASS.

- [ ] **Passo 6: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/ui/publico/MolduraPublica.tsx src/ui/publico/MolduraPublica.test.tsx src/App.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(publico): menu no estilo Spora, com conta e links legais`.

### Tarefa 15: Landing nova

Cobre CA-111 (fotos), CA-112 a CA-120 e CA-116a.

**Arquivos:**
- Criar: `scripts/pratos_heroi.py`
- Criar (gerado): `public/imagens/pratos-heroi.webp`, `public/imagens/pratos-heroi-800.webp`
- Alterar: `src/ui/publico/TelaInicio.tsx` (arquivo inteiro)
- Criar: `src/ui/publico/TelaInicio.test.tsx`
- Criar: `e2e/publico.spec.ts`
- Alterar: `src/App.tsx` (props da `TelaInicio`)
- Alterar: `THIRD_PARTY_NOTICES.md`

**Interfaces:**
- Consome: `CartaoNumero`, `RotuloSecao` e `Button` (Tarefas 3 e 4); o `id="fontes"` do rodapé (Tarefa 14).
- Produz: `TelaInicio({ aoComecar: () => void; aoVerPrecos: () => void })`, com as seções de `id="como-funciona"` e `id="o-diferencial"`.

- [ ] **Passo 1: gerar a foto do topo**

Crie `scripts/pratos_heroi.py` com este conteúdo:

```python
"""Gera public/imagens/pratos-heroi*.webp: três pratos recortados em círculo, em arco.

Fotos do Unsplash (Licença Unsplash, uso livre). Créditos em THIRD_PARTY_NOTICES.md.
Uso: python scripts/pratos_heroi.py   (precisa de Pillow e de internet)
"""
import io
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

# id da foto no Unsplash, centro e raio do prato na foto com 1400 px de largura
FOTOS = [
    ('1512621776951-a57141f2eefd', 746, 446, 438),  # Anna Pelzer
    ('1546069901-ba9599a7e63c', 693, 706, 480),     # Anh Nguyen
    ('1490645935967-10de6ba17061', 784, 324, 322),  # Stuart Petrie
]
# onde cada prato entra na tela de 2600 × 1000 e com que raio; o do meio fica na frente
LUGAR = [((640, 560), 360), ((1300, 460), 420), ((1960, 560), 340)]
SAIDAS = [(1600, 'pratos-heroi.webp'), (800, 'pratos-heroi-800.webp')]
LIMITE_BYTES = 300 * 1024


def baixar(id_foto: str) -> Image.Image:
    url = f'https://images.unsplash.com/photo-{id_foto}?w=1400&q=90'
    with urllib.request.urlopen(url, timeout=60) as resposta:
        return Image.open(io.BytesIO(resposta.read())).convert('RGBA')


def circulo(foto: Image.Image, cx: int, cy: int, r: int, ss: int = 4) -> Image.Image:
    r = int(r * 0.975)  # entra um pouco na borda do prato para não pegar a mesa
    recorte = foto.crop((cx - r, cy - r, cx + r, cy + r))
    mascara = Image.new('L', (2 * r * ss, 2 * r * ss), 0)
    ImageDraw.Draw(mascara).ellipse((0, 0, 2 * r * ss - 1, 2 * r * ss - 1), fill=255)
    recorte.putalpha(mascara.resize((2 * r, 2 * r), Image.LANCZOS))
    return recorte


def compor() -> Image.Image:
    pratos = [circulo(baixar(i), cx, cy, r) for i, cx, cy, r in FOTOS]
    tela = Image.new('RGBA', (2600, 1000), (0, 0, 0, 0))
    sombra = Image.new('RGBA', tela.size, (0, 0, 0, 0))
    desenho = ImageDraw.Draw(sombra)
    for (x, y), r in LUGAR:
        desenho.ellipse((x - r * 0.95, y - r * 0.85 + 40, x + r * 0.95, y + r * 1.02 + 40), fill=(14, 59, 67, 70))
    tela.alpha_composite(sombra.filter(ImageFilter.GaussianBlur(38)))
    for ordem in (0, 2, 1):
        (x, y), r = LUGAR[ordem]
        tela.alpha_composite(pratos[ordem].resize((2 * r, 2 * r), Image.LANCZOS), (x - r, y - r))
    caixa = tela.getbbox()
    if caixa is None:
        sys.exit('composição vazia')
    return tela.crop(caixa)


def salvar(tela: Image.Image, destino: Path) -> None:
    destino.mkdir(parents=True, exist_ok=True)
    for largura, nome in SAIDAS:
        altura = round(tela.height * largura / tela.width)
        menor = tela.resize((largura, altura), Image.LANCZOS)
        for qualidade in (82, 76, 70, 64, 58):
            arquivo = destino / nome
            menor.save(arquivo, 'WEBP', quality=qualidade, method=6)
            if arquivo.stat().st_size <= LIMITE_BYTES:
                break
        print(nome, menor.size, arquivo.stat().st_size, 'bytes')


if __name__ == '__main__':
    salvar(compor(), Path(__file__).resolve().parent.parent / 'public' / 'imagens')
```

Rode: `python scripts/pratos_heroi.py`
Esperado: `pratos-heroi.webp (1600, 712)` com menos de 307200 bytes e `pratos-heroi-800.webp (800, 356)`. Abra a imagem e confira os três pratos redondos, sem pedaço de mesa. Se a altura não for 712, use a altura impressa nos atributos `height` do Passo 4 e do teste.

- [ ] **Passo 2: créditos das fotos (CA-111)**

No fim de `THIRD_PARTY_NOTICES.md`:

```md
## Fotos da landing (Unsplash)

Composição `public/imagens/pratos-heroi*.webp`, gerada por `scripts/pratos_heroi.py` a partir de três
fotos, recortadas em círculo. Licença Unsplash (uso livre, inclusive comercial): https://unsplash.com/license

- Anna Pelzer — https://unsplash.com/photos/IGfIGP5ONV0 (tigela de salada com grão-de-bico e abacate)
- Anh Nguyen — https://images.unsplash.com/photo-1546069901-ba9599a7e63c (tigela com tofu, milho e legumes)
- Stuart Petrie — https://images.unsplash.com/photo-1490645935967-10de6ba17061 (prato azul com ovo, tomate e abobrinha)
```

- [ ] **Passo 3: escrever os testes que falham**

`src/ui/publico/TelaInicio.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MICRONUTRIENTES_ADEQUACAO } from '@/domain/adequacao.ts'
import { ALIMENTOS } from '@/domain/tabelas.ts'
import { coberturaDeCalcio, pctAlimentosSemVitaminaA } from '@/domain/vitrine.ts'
import { TelaInicio } from './TelaInicio.tsx'

const titulos = () => screen.getAllByRole('heading').map((h) => h.textContent ?? '')
const posicao = (padrao: RegExp) => titulos().findIndex((t) => padrao.test(t))

describe('TelaInicio', () => {
  it('CA-112: topo, problema, como funciona, o diferencial e a faixa final, nesta ordem', () => {
    render(<TelaInicio aoComecar={vi.fn()} aoVerPrecos={vi.fn()} />)
    const ordem = [/Faltou cálcio/, /Todo programa avisa/, /Um plano completo em minutos/, /O diferencial, na tela de verdade/, /Monte o próximo plano/].map(posicao)
    expect(ordem.every((p) => p >= 0)).toBe(true)
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem)
  })

  it('CA-113: o título do topo é o combinado', () => {
    render(<TelaInicio aoComecar={vi.fn()} aoVerPrecos={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Faltou cálcio? O MetaNutri diz o que comer.')
  })

  it('CA-114: só números verdadeiros, calculados do sistema e da TACO', () => {
    render(<TelaInicio aoComecar={vi.fn()} aoVerPrecos={vi.fn()} />)
    const numeros = [String(MICRONUTRIENTES_ADEQUACAO.length), String(ALIMENTOS.length), String(coberturaDeCalcio().length), `${pctAlimentosSemVitaminaA()}%`]
    // Prende o dado de hoje: se algum desses números mudar sem querer, o teste avisa.
    expect(numeros).toEqual(['16', '597', '5', '57%'])
    for (const numero of numeros) expect(screen.getByText(numero)).toBeInTheDocument()
  })

  it('CA-115: o diferencial mostra telas reais do app', () => {
    render(<TelaInicio aoComecar={vi.fn()} aoVerPrecos={vi.fn()} />)
    expect(screen.getByAltText(/botão Cobrir/)).toHaveAttribute('src', expect.stringContaining('imagens/cobrir.png'))
    expect(screen.getByAltText(/missões do paciente/)).toHaveAttribute('src', expect.stringContaining('imagens/missoes-paciente.png'))
  })

  it('CA-117: Começar grátis e Ver preços chamam quem manda', async () => {
    const aoComecar = vi.fn()
    const aoVerPrecos = vi.fn()
    render(<TelaInicio aoComecar={aoComecar} aoVerPrecos={aoVerPrecos} />)
    const usuario = userEvent.setup()
    for (const botao of screen.getAllByRole('button', { name: /Começar grátis/ })) await usuario.click(botao)
    expect(aoComecar).toHaveBeenCalledTimes(2)
    await usuario.click(screen.getByRole('button', { name: 'Ver preços' }))
    expect(aoVerPrecos).toHaveBeenCalledOnce()
  })

  it('CA-119: a foto do topo tem o tamanho reservado', () => {
    render(<TelaInicio aoComecar={vi.fn()} aoVerPrecos={vi.fn()} />)
    const foto = screen.getByAltText(/Três pratos/)
    expect(foto).toHaveAttribute('width', '1600')
    expect(foto).toHaveAttribute('height', '712')
  })
})
```

`e2e/publico.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test.describe('Landing (spec estilo-spora)', () => {
  test('CA-119 e CA-120: no celular de 360 px, sem rolagem para o lado e com o título inteiro na primeira tela', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 })
    await page.goto('/#/inicio')
    const larguras = await page.evaluate(() => ({ documento: document.documentElement.scrollWidth, janela: window.innerWidth }))
    expect(larguras.documento).toBeLessThanOrEqual(larguras.janela)
    const titulo = await page.getByRole('heading', { level: 1 }).boundingBox()
    expect(titulo).not.toBeNull()
    expect((titulo?.y ?? 0) + (titulo?.height ?? 0)).toBeLessThanOrEqual(740)
  })

  test('CA-119: a foto do topo carrega', async ({ page }) => {
    await page.goto('/#/inicio')
    const foto = page.getByAltText(/Três pratos/)
    await expect(foto).toBeVisible()
    expect(await foto.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  })

  test('CA-116a: o cartão de 597 alimentos rola até as fontes dos dados', async ({ page }) => {
    await page.goto('/#/inicio')
    await page.getByRole('button', { name: /597/ }).click()
    await expect(page.getByRole('heading', { name: 'Fontes dos dados' })).toBeInViewport()
  })
})
```

- [ ] **Passo 4: rodar e ver falhar**

Rode: `npx vitest run src/ui/publico/TelaInicio.test.tsx`
Esperado: FAIL (a landing antiga não tem esses títulos nem a prop `aoComecar`).

- [ ] **Passo 5: `src/ui/publico/TelaInicio.tsx` inteiro**

```tsx
import { ArrowUpRight } from 'lucide-react'
import { MICRONUTRIENTES_ADEQUACAO } from '@/domain/adequacao.ts'
import { ALIMENTOS } from '@/domain/tabelas.ts'
import { coberturaDeCalcio, pctAlimentosSemVitaminaA } from '@/domain/vitrine.ts'
import { CartaoNumero } from '@ds/componentes/display/CartaoNumero.tsx'
import { RotuloSecao } from '@ds/componentes/display/RotuloSecao.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'

interface TelaInicioProps {
  readonly aoComecar: () => void
  readonly aoVerPrecos: () => void
}

const BASE = import.meta.env.BASE_URL

function rolarAte(id: string) {
  globalThis.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const PASSOS = [
  { n: '01', titulo: 'Monte o plano', texto: 'Digite "150 arroz" e tecle Enter. O alimento entra na refeição.' },
  { n: '02', titulo: 'Veja o que falta', texto: 'O botão Cobrir sugere o alimento e a quantidade para fechar a meta.' },
  { n: '03', titulo: 'O paciente acompanha', texto: 'Ele marca pelo celular o que cumpriu. Você vê quem está sumindo.' },
] as const

const TITULO_SECAO = 'mt-4 text-[clamp(28px,3.4vw,36px)] font-bold leading-tight'

/**
 * Landing no estilo da referência Spora (mockup landing v2, spec estilo-spora).
 * Foto só no topo (D-22); daqui para baixo, texto, números verdadeiros e telas reais.
 */
export function TelaInicio({ aoComecar, aoVerPrecos }: TelaInicioProps) {
  return (
    <>
      <section aria-labelledby="titulo-inicio" className="overflow-hidden px-4 pb-12 sm:px-8">
        <div className="mx-auto max-w-[1216px]">
          <div className="relative">
            <p
              aria-hidden="true"
              className="pointer-events-none select-none text-center font-marca text-[clamp(88px,19vw,250px)] font-bold leading-none tracking-[-0.05em] text-card"
            >
              metanutri
            </p>
            <img
              src={`${BASE}imagens/pratos-heroi.webp`}
              srcSet={`${BASE}imagens/pratos-heroi-800.webp 800w, ${BASE}imagens/pratos-heroi.webp 1600w`}
              sizes="(max-width: 640px) 92vw, 900px"
              width={1600}
              height={712}
              decoding="async"
              alt="Três pratos vistos de cima: salada com grão-de-bico, tigela com tofu e legumes, prato com ovo e tomate."
              className="relative mx-auto -mt-[clamp(56px,13vw,190px)] h-auto w-[92%] max-w-[900px]"
            />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr_auto] lg:items-end">
            <div>
              <Button onClick={() => rolarAte('como-funciona')}>Ver como funciona</Button>
              <h1 id="titulo-inicio" className="mt-4 text-[clamp(34px,5vw,52px)] font-bold leading-[1.02]">
                Faltou cálcio?{' '}
                <br />O MetaNutri diz{' '}
                <br />o que comer.
              </h1>
            </div>
            <p className="max-w-[42ch] text-sm leading-relaxed text-muted-foreground">
              Monte o plano e veja o que falta de vitaminas e minerais. O MetaNutri sugere alimentos do dia a dia, com a quantidade em gramas e em medida
              caseira.
            </p>
            <div className="grid grid-cols-2 gap-3 lg:w-[400px]">
              <CartaoNumero
                valor={String(MICRONUTRIENTES_ADEQUACAO.length)}
                rotulo="nutrientes"
                apoio="conferidos em cada plano"
                aoClicar={() => rolarAte('o-diferencial')}
              />
              <CartaoNumero valor={String(ALIMENTOS.length)} rotulo="alimentos" apoio="da tabela brasileira (TACO)" aoClicar={() => rolarAte('fontes')} />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-problema" className="rounded-t-[36px] bg-card px-4 pb-20 pt-16 sm:px-14">
        <div className="mx-auto max-w-[1216px]">
          <RotuloSecao>O problema</RotuloSecao>
          <h2 id="titulo-problema" className="ml-auto mt-4 max-w-[26ch] text-right text-[clamp(26px,3.4vw,36px)] font-semibold leading-tight">
            Todo programa avisa que faltou ferro. <span className="text-muted-foreground">Nenhum diz o que pôr no prato para fechar a conta.</span>
          </h2>
          <p className="mt-4 text-right text-sm text-muted-foreground">O MetaNutri mostra o que falta e já sugere o alimento, com a quantidade.</p>

          <div className="mt-14 grid gap-4 md:grid-cols-[1fr_1fr_1.3fr]">
            <CartaoNumero tom="cinza" valor={String(coberturaDeCalcio().length)} rotulo="sugestões" apoio="de alimento para cada nutriente que falta" />
            <CartaoNumero tom="cinza" valor="g + colher" rotulo="quantidade" apoio="em gramas e em medida caseira" />
            <CartaoNumero
              tom="teal"
              valor={`${pctAlimentosSemVitaminaA()}%`}
              rotulo="dos alimentos da TACO"
              apoio="não têm vitamina A medida. Aqui a falta de dado aparece, nunca vira zero."
            />
          </div>

          <div id="como-funciona" className="mt-28 scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <RotuloSecao>Como funciona</RotuloSecao>
                <h2 className={`${TITULO_SECAO} max-w-[16ch]`}>Um plano completo em minutos</h2>
              </div>
              <p className="max-w-[34ch] text-sm text-muted-foreground">Três passos, sem planilha e sem conta de cabeça.</p>
            </div>
            <ol className="mt-9 grid gap-6 md:grid-cols-3">
              {PASSOS.map((passo) => (
                <li key={passo.n} className="border-t border-border pt-5">
                  <span className="font-titulo text-sm font-bold text-acento">{passo.n}</span>
                  <h3 className="mt-2 text-xl font-bold">{passo.titulo}</h3>
                  <p className="mt-2 max-w-[30ch] text-sm leading-relaxed text-muted-foreground">{passo.texto}</p>
                </li>
              ))}
            </ol>
          </div>

          <div id="o-diferencial" className="mt-28 grid scroll-mt-24 items-center gap-8 rounded-2xl bg-surfacerow p-6 sm:p-12 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <RotuloSecao>O diferencial</RotuloSecao>
              <h2 className={`${TITULO_SECAO} max-w-[14ch]`}>O diferencial, na tela de verdade</h2>
              <p className="mt-4 max-w-[36ch] text-sm leading-relaxed text-muted-foreground">
                Cálcio abaixo do recomendado? Um clique mostra o que comer e quanto. O paciente acompanha pelo celular.
              </p>
              <Button variant="laranja" className="mt-6" onClick={aoComecar}>
                Começar grátis
                <ArrowUpRight aria-hidden="true" />
              </Button>
            </div>
            <div className="relative min-h-[400px]">
              <figure className="absolute left-0 top-0 h-[370px] w-[min(300px,80%)] overflow-hidden rounded-xl bg-card px-4 pt-4 shadow-raised">
                <img src={`${BASE}imagens/cobrir.png`} alt="Tela do botão Cobrir sugerindo rúcula, iogurte e sardinha para completar o cálcio." className="w-full" loading="lazy" />
              </figure>
              <figure className="absolute bottom-0 right-0 h-[280px] w-[min(240px,62%)] overflow-hidden rounded-xl border-[6px] border-card bg-surfacerow shadow-raised">
                <img src={`${BASE}imagens/missoes-paciente.png`} alt="Tela de missões do paciente com 2 de 5 missões feitas no dia." className="w-full" loading="lazy" />
              </figure>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="titulo-fecho" className="bg-surfacebrand px-4 py-14 sm:px-14">
        <div className="mx-auto flex max-w-[1216px] flex-wrap items-center justify-between gap-6">
          <h2 id="titulo-fecho" className="max-w-[18ch] text-[clamp(26px,3.2vw,34px)] font-bold leading-tight text-textonbrand">
            Monte o próximo plano em minutos
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="laranja" onClick={aoComecar}>
              Começar grátis
              <ArrowUpRight aria-hidden="true" />
            </Button>
            <Button variant="outline" className="border-borderonbrand bg-transparent text-textonbrand hover:border-textonbrand hover:text-textonbrand" onClick={aoVerPrecos}>
              Ver preços
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
```

- [ ] **Passo 6: `App.tsx`**

Troque a renderização da `TelaInicio` por:

```tsx
        <TelaInicio
          aoComecar={() => navegar(conta.sessao ? { tela: 'painel' } : rotaCriarConta(null, 'mensal'))}
          aoVerPrecos={() => navegar({ tela: 'precos' })}
        />
```

O `verExemplo` continua existindo: o Painel usa.

- [ ] **Passo 7: rodar e ver passar**

Rode: `npx vitest run src/ui/publico/TelaInicio.test.tsx` e `npx playwright test e2e/publico.spec.ts e2e/fundacao.spec.ts`
Esperado: PASS.

- [ ] **Passo 8: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add scripts/pratos_heroi.py public/imagens/pratos-heroi.webp public/imagens/pratos-heroi-800.webp src/ui/publico/TelaInicio.tsx src/ui/publico/TelaInicio.test.tsx e2e/publico.spec.ts src/App.tsx THIRD_PARTY_NOTICES.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(landing): landing no estilo Spora, com foto só no topo`.

### Tarefa 16: Preços com o botão certo e constantes legais

Cobre CA-121 a CA-126 e a parte de Preços do CA-177.

**Antes de começar:** confira a seção "Dados do responsável", no topo do plano. Se `RESPONSAVEL` ou `CONTATO_EMAIL` ainda não tiverem valor, **pare e peça ao orquestrador**. Nunca invente esses dois valores.

**Arquivos:**
- Criar: `src/domain/legal.ts`
- Alterar: `src/ui/publico/SecaoPrecos.tsx` (props, `Preco`, `NotaEstudante`, fundo e nota final)
- Criar: `src/ui/publico/SecaoPrecos.test.tsx`
- Alterar: `src/App.tsx` (renderização de `SecaoPrecos`)

**Interfaces:**
- Consome: `destinoDoPlano` (Tarefa 7), `Ciclo` (Tarefa 5).
- Produz:
  - `RESPONSAVEL`, `CONTATO_EMAIL`, `VERSAO_TERMOS = '2026-09-28'`, `DATA_TERMOS = '28 de setembro de 2026'`, `PRAZO_EXCLUSAO_DIAS = 90` e `PRAZO_INCIDENTE_HORAS = 72`
  - `SecaoPrecos({ aoEscolher: (plano: IdPlano, ciclo: Ciclo) => void; contato: string; destaque?: IdPlano })`
  - O botão de cada plano tem o nome acessível `"<acaoTexto> <nome>"`, por exemplo "Assinar Solo".

- [ ] **Passo 1: `src/domain/legal.ts`**

```ts
// Quem responde pelo MetaNutri e a versão dos termos (spec estilo-spora, D-31).
// Os dois primeiros valores vêm do usuário (PLAN, seção "Dados do responsável").

/** Pessoa física responsável pelo MetaNutri e encarregada dos dados pessoais. */
export const RESPONSAVEL = 'COLE AQUI O NOME COMPLETO DA SEÇÃO DADOS DO RESPONSÁVEL'

/** Canal de contato do MetaNutri: titular de dados, plano Clínica e suporte. */
export const CONTATO_EMAIL = 'COLE AQUI O E-MAIL DA SEÇÃO DADOS DO RESPONSÁVEL'

/** Muda quando o texto dos termos ou da política mudar. Vai gravada no cadastro (CA-223). */
export const VERSAO_TERMOS = '2026-09-28'
export const DATA_TERMOS = '28 de setembro de 2026'

/** Em quantos dias os dados somem depois do pedido de exclusão. */
export const PRAZO_EXCLUSAO_DIAS = 90

/** Em quantas horas o MetaNutri avisa o nutricionista de um incidente de segurança. */
export const PRAZO_INCIDENTE_HORAS = 72
```

As duas primeiras constantes recebem os valores reais antes do commit. Um commit com "COLE AQUI" é erro.

- [ ] **Passo 2: escrever os testes que falham**

`src/ui/publico/SecaoPrecos.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SecaoPrecos } from './SecaoPrecos.tsx'

const primeiro = (nome: string) => {
  const botao = screen.getAllByRole('button', { name: nome })[0]
  if (!botao) throw new Error(`sem botão ${nome}`)
  return botao
}

describe('SecaoPrecos', () => {
  it('CA-121: mantém a chave mensal/anual e a comparação', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    expect(screen.getByRole('radiogroup', { name: 'Período de cobrança' })).toBeInTheDocument()
    expect(screen.getByRole('table', { name: /Comparativo dos planos/ })).toBeInTheDocument()
  })

  it('CA-122: o botão do Solo leva o plano e o ciclo escolhidos', async () => {
    const aoEscolher = vi.fn()
    render(<SecaoPrecos aoEscolher={aoEscolher} contato="contato@exemplo.com" />)
    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('radio', { name: /Anual/ }))
    await usuario.click(primeiro('Assinar Solo'))
    expect(aoEscolher).toHaveBeenCalledWith('solo', 'anual')
  })

  it('CA-125: o Estudante tem o próprio botão', async () => {
    const aoEscolher = vi.fn()
    render(<SecaoPrecos aoEscolher={aoEscolher} contato="contato@exemplo.com" />)
    await userEvent.setup().click(primeiro('Usar o e-mail da faculdade'))
    expect(aoEscolher).toHaveBeenCalledWith('estudante', 'mensal')
  })

  it('CA-126: o Clínica mostra o contato e não tem botão', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" />)
    expect(screen.queryByRole('button', { name: /Clínica/ })).not.toBeInTheDocument()
    expect(screen.getAllByText('contato@exemplo.com').length).toBeGreaterThan(0)
  })

  it('CA-177: o destaque vindo do aviso de limite troca o "Mais escolhido"', () => {
    render(<SecaoPrecos aoEscolher={vi.fn()} contato="contato@exemplo.com" destaque="pro" />)
    const cabecalhos = screen.getAllByRole('columnheader')
    const doPro = cabecalhos.find((c) => c.textContent?.includes('Pro'))
    expect(doPro?.textContent).toContain('Mais escolhido')
  })
})
```

- [ ] **Passo 3: rodar e ver falhar**

Rode: `npx vitest run src/ui/publico/SecaoPrecos.test.tsx`
Esperado: FAIL.

- [ ] **Passo 4: `SecaoPrecos.tsx`**

1. Acrescente `type Ciclo` ao import de `@/domain/conta.ts` e troque as props:

```tsx
interface SecaoPrecosProps {
  readonly aoEscolher: (plano: IdPlano, ciclo: Ciclo) => void
  /** E-mail do MetaNutri: o Clínica é combinado por conversa (CA-126). */
  readonly contato: string
  /** Plano em destaque vindo do aviso de limite (CA-177). Sem ele, vale o destaque do próprio plano. */
  readonly destaque?: IdPlano | undefined
}
```

2. Troque a função `Preco` inteira por:

```tsx
/** O preço de uma coluna, com a ação embaixo. É a única parte que muda com a chave. */
function Preco({
  plano,
  anual,
  destacado,
  contato,
  aoEscolher,
}: {
  readonly plano: PlanoAssinatura
  readonly anual: boolean
  readonly destacado: boolean
  readonly contato: string
  readonly aoEscolher: () => void
}) {
  const temAnual = plano.anual > 0
  const valor = anual && temAnual ? mensalizadoDoAnual(plano) : plano.mensal
  const casas = Number.isInteger(valor) ? 0 : 2
  const gratis = plano.mensal === 0

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-baseline gap-1">
        <span className="numeros font-titulo text-lg font-semibold text-muted-foreground">R$</span>
        <NumberFlow value={valor} locales="pt-BR" format={{ minimumFractionDigits: casas, maximumFractionDigits: casas }} className="numeros font-titulo text-4xl font-bold text-heading" />
        {gratis ? null : <span className="text-sm text-muted-foreground">/mês</span>}
      </div>

      <p className="h-8 text-xs text-muted-foreground">
        {gratis ? 'Para sempre, sem cartão.' : anual && temAnual ? `R$ ${plano.anual.toLocaleString('pt-BR')} uma vez por ano.` : anual ? 'Só no mensal.' : 'Cancele quando quiser.'}
      </p>

      {plano.id === 'clinica' ? (
        <p className="text-center text-xs text-muted-foreground">
          Combinado por conversa:
          <br />
          <strong className="select-all text-sm text-heading">{contato}</strong>
        </p>
      ) : (
        <OriginButton
          onClick={aoEscolher}
          tom={destacado ? 'verde' : 'contorno'}
          aria-label={`${plano.acaoTexto} ${plano.nome}`}
          className={cn(
            'w-full',
            destacado ? 'border-transparent bg-primary text-primary-foreground hover:bg-primaryemphasis' : 'border-borderdefault bg-transparent text-foreground hover:border-primary',
          )}
        >
          {plano.acaoTexto}
        </OriginButton>
      )}
    </div>
  )
}
```

3. Troque `NotaEstudante` por uma versão que recebe `aoEscolher` e tem botão:

```tsx
/** A nota do plano Estudante, que não merece uma coluna: é o Grátis com e-mail de faculdade. */
function NotaEstudante({ aoEscolher }: { readonly aoEscolher: () => void }) {
  const estudante = planoPorId('estudante')
  if (!estudante) return null

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-3xl bg-card p-5">
      <GraduationCap className="mt-0.5 size-5 shrink-0 text-infotext" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-sm text-foreground">
        <strong className="font-semibold text-heading">Estudante de nutrição:</strong> crie a conta com o e-mail da faculdade e o Grátis sobe para{' '}
        <strong>{estudante.limitePacientesAtivos} pacientes</strong> e <strong>{estudante.limiteLinksPaciente} links</strong>, por 12 meses. Conta de estágio é
        de uso não comercial: o PDF sai marcado e a tela do paciente avisa que não é atendimento profissional.
      </p>
      <Button variant="outline" size="sm" onClick={aoEscolher}>
        {estudante.acaoTexto}
      </Button>
    </div>
  )
}
```

(importe `Button` de `@ds/componentes/forms/button.tsx`).

4. Em `SecaoPrecos`, receba `{ aoEscolher, contato, destaque }`, defina `const ciclo: Ciclo = anual ? 'anual' : 'mensal'` e `const estaEmDestaque = (p: PlanoAssinatura) => (destaque ? p.id === destaque : p.destaque)`. Em todo lugar que hoje lê `plano.destaque` (o fundo da coluna, o selo "Mais escolhido" e a borda do cartão do celular), use `estaEmDestaque(plano)`. As duas chamadas de `Preco` passam a ser:

```tsx
<Preco plano={plano} anual={anual} destacado={estaEmDestaque(plano)} contato={contato} aoEscolher={() => aoEscolher(plano.id, ciclo)} />
```

As duas `<NotaEstudante />` passam a ser `<NotaEstudante aoEscolher={() => aoEscolher('estudante', 'mensal')} />`.

5. Troque o fundo `bg-[image:var(--gradient-brand-soft)]` do contêiner por `bg-background`. Troque o parágrafo final por:

```tsx
      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
        Preço de fundador para as {VAGAS_PRECO_FUNDADOR} primeiras assinaturas: quem entra nessa faixa fica nela, mesmo quando o preço subir. O
        pagamento é pelo Mercado Pago, com cartão.
      </p>
```

- [ ] **Passo 5: `App.tsx`**

Troque a renderização de `SecaoPrecos` e apague a função `escolherPlano`:

```tsx
        <SecaoPrecos
          contato={CONTATO_EMAIL}
          {...(rota.destaque ? { destaque: rota.destaque } : {})}
          aoEscolher={(plano, ciclo) => {
            const destino = destinoDoPlano(plano, ciclo, conta.sessao !== null)
            if (destino) navegar(destino)
          }}
        />
```

Importe `CONTATO_EMAIL` de `./domain/legal.ts` e `destinoDoPlano` de `./ui/fluxoConta.ts`.

- [ ] **Passo 6: rodar e ver passar**

Rode: `npx vitest run src/ui/publico/SecaoPrecos.test.tsx`
Esperado: PASS.

- [ ] **Passo 7: verificar tudo e fazer o commit**

Rode: `npm run check` e confira que `src/domain/legal.ts` não tem mais "COLE AQUI".

```bash
git add src/domain/legal.ts src/ui/publico/SecaoPrecos.tsx src/ui/publico/SecaoPrecos.test.tsx src/App.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(precos): cada plano leva ao próximo passo dele`.

### Tarefa 17: Peças das telas de conta

Base de CA-127 e CA-135 (o desenho dividido) e de CA-108 no campo de senha.

**Arquivos:**
- Criar em `src/ui/publico/conta/`: `MolduraConta.tsx`, `LadoDoPlano.tsx`, `CampoSenha.tsx`, `AvisoFormulario.tsx`, `AvisoSemServidor.tsx`, `contaFalsa.test-utils.ts` e `pecas.test.tsx`

**Interfaces:**
- Consome: `ValorConta` (Tarefa 12), `valorNoCiclo`, `planoPorId` e `Ciclo` (Tarefa 5).
- Produz:
  - `MolduraConta({ titulo: string; subtitulo: string; passo?: { atual: number; total: number }; lado?: ReactNode; aoIrParaInicio: () => void; children })`
  - `LadoDoPlano({ plano: IdPlano | null; ciclo: Ciclo; aoTrocarPlano?: () => void })`
  - `CampoSenha({ id: string; rotulo: string; valor: string; aoMudar: (v: string) => void; novaSenha: boolean; invalido?: boolean; dica?: string })`
  - `AvisoFormulario({ tipo: 'erro' | 'ok'; children })`. Erro é `role="alert"` e confirmação é `role="status"`.
  - `AvisoSemServidor({ aoAbrirSistema: () => void })`
  - `contaFalsa(sobre?: Partial<ValorConta>): ValorConta`, só para os testes

- [ ] **Passo 1: escrever os testes que falham**

`src/ui/publico/conta/pecas.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CampoSenha } from './CampoSenha.tsx'
import { LadoDoPlano } from './LadoDoPlano.tsx'
import { MolduraConta } from './MolduraConta.tsx'

describe('peças das telas de conta', () => {
  it('sem plano escolhido, o lado mostra o que o Free inclui', () => {
    render(<LadoDoPlano plano={null} ciclo="mensal" />)
    expect(screen.getByText('No Free você já tem')).toBeInTheDocument()
    expect(screen.getByText('2 pacientes ativos')).toBeInTheDocument()
  })

  it('com o Solo anual, mostra o preço do ano e o link para trocar', async () => {
    const aoTrocarPlano = vi.fn()
    render(<LadoDoPlano plano="solo" ciclo="anual" aoTrocarPlano={aoTrocarPlano} />)
    expect(screen.getByText('Plano escolhido')).toBeInTheDocument()
    expect(screen.getByText(/R\$ 299/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Trocar de plano' }))
    expect(aoTrocarPlano).toHaveBeenCalledOnce()
  })

  it('o campo de senha mostra e esconde o que foi digitado', async () => {
    render(<CampoSenha id="s" rotulo="Senha" valor="segredo12" aoMudar={vi.fn()} novaSenha />)
    const campo = screen.getByLabelText('Senha')
    expect(campo).toHaveAttribute('type', 'password')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Mostrar a senha' }))
    expect(campo).toHaveAttribute('type', 'text')
    expect(campo).toHaveAttribute('autocomplete', 'new-password')
  })

  it('a moldura mostra o passo quando existe', () => {
    render(
      <MolduraConta titulo="Crie sua conta" subtitulo="x" passo={{ atual: 1, total: 3 }} aoIrParaInicio={vi.fn()}>
        <p>formulário</p>
      </MolduraConta>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Crie sua conta' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Passo 1 de 3' })).toBeInTheDocument()
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/publico/conta/pecas.test.tsx`
Esperado: FAIL (arquivos inexistentes).

- [ ] **Passo 3: `MolduraConta.tsx`**

```tsx
import { Logo } from '@ds/componentes/display/Logo.tsx'
import type { ReactNode } from 'react'

/*
 * As telas de conta (criar, entrar, senha) no desenho aprovado: o formulário à
 * esquerda e, à direita, em cinza, o que a pessoa leva (spec estilo-spora, CA-127 e CA-135).
 */
interface MolduraContaProps {
  readonly titulo: string
  readonly subtitulo: string
  readonly passo?: { readonly atual: number; readonly total: number } | undefined
  readonly lado?: ReactNode
  readonly aoIrParaInicio: () => void
  readonly children: ReactNode
}

export function MolduraConta({ titulo, subtitulo, passo, lado, aoIrParaInicio, children }: MolduraContaProps) {
  return (
    <div className="min-h-dvh bg-background px-4 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto grid max-w-[1000px] overflow-hidden rounded-2xl bg-card lg:grid-cols-[1.05fr_0.95fr]">
        <main className="flex flex-col gap-4 p-6 sm:p-10">
          <button
            type="button"
            onClick={aoIrParaInicio}
            aria-label="MetaNutri, início"
            className="inline-flex min-h-11 w-fit items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo tamanho={24} />
          </button>
          {passo ? (
            <div role="img" aria-label={`Passo ${passo.atual} de ${passo.total}`} className="flex gap-1.5">
              {Array.from({ length: passo.total }, (_, i) => (
                <span key={i} className={i < passo.atual ? 'h-1.5 flex-1 rounded-full bg-primary' : 'h-1.5 flex-1 rounded-full bg-surfacerow'} />
              ))}
            </div>
          ) : null}
          <div>
            <h1 className="text-3xl font-bold leading-tight">{titulo}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{subtitulo}</p>
          </div>
          {children}
        </main>
        {lado ? <aside className="flex flex-col justify-between gap-4 bg-surfacerow p-6 sm:p-8">{lado}</aside> : null}
      </div>
    </div>
  )
}
```

- [ ] **Passo 4: `LadoDoPlano.tsx`**

```tsx
import { Check } from 'lucide-react'
import { planoPorId, valorNoCiclo, type Ciclo, type IdPlano } from '@/domain/conta.ts'

interface LadoDoPlanoProps {
  readonly plano: IdPlano | null
  readonly ciclo: Ciclo
  readonly aoTrocarPlano?: (() => void) | undefined
}

const reais = (valor: number) =>
  valor.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(valor) ? 0 : 2, maximumFractionDigits: 2 })

/** O que a pessoa leva: o plano escolhido, ou o Free quando não escolheu nenhum. */
export function LadoDoPlano({ plano, ciclo, aoTrocarPlano }: LadoDoPlanoProps) {
  const escolhido = planoPorId(plano ?? 'free')
  if (!escolhido) return null
  const itens = [...escolhido.recursos, ...escolhido.inclui.slice(1)].slice(0, 5)
  const valor = valorNoCiclo(escolhido, ciclo)
  const anualDeVerdade = ciclo === 'anual' && escolhido.anual > 0

  return (
    <>
      <div className="rounded-3xl bg-card p-5">
        <p className="rotulo">{plano === null ? 'No Free você já tem' : 'Plano escolhido'}</p>
        <p className="mt-2 font-titulo text-xl font-bold text-heading">{escolhido.nome}</p>
        {escolhido.mensal > 0 ? (
          <p className="mt-2 font-titulo text-3xl font-bold text-heading">
            R$ {reais(valor)} <span className="font-sans text-sm font-semibold text-muted-foreground">{anualDeVerdade ? '/ano' : '/mês'}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm font-semibold text-heading">Grátis</p>
        )}
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {itens.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      {aoTrocarPlano ? (
        <button
          type="button"
          onClick={aoTrocarPlano}
          className="inline-flex min-h-11 w-fit items-center rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Trocar de plano
        </button>
      ) : (
        <p className="text-xs text-muted-foreground">Seus planos ficam salvos no aparelho e funcionam sem internet depois do primeiro acesso.</p>
      )}
    </>
  )
}
```

- [ ] **Passo 5: `CampoSenha.tsx`**

```tsx
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'

interface CampoSenhaProps {
  readonly id: string
  readonly rotulo: string
  readonly valor: string
  readonly aoMudar: (valor: string) => void
  /** `true` no cadastro e na troca: o navegador sugere senha forte. */
  readonly novaSenha: boolean
  readonly invalido?: boolean | undefined
  readonly dica?: string | undefined
}

/** Campo de senha com o olho para mostrar o que foi digitado (mockup conta e checkout v1). */
export function CampoSenha({ id, rotulo, valor, aoMudar, novaSenha, invalido = false, dica }: CampoSenhaProps) {
  const [visivel, setVisivel] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visivel ? 'text' : 'password'}
          autoComplete={novaSenha ? 'new-password' : 'current-password'}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          aria-invalid={invalido}
          aria-describedby={dica ? `${id}-dica` : undefined}
          className="pr-12"
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? 'Esconder a senha' : 'Mostrar a senha'}
          aria-pressed={visivel}
          className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-content-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:size-10"
        >
          {visivel ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
      {dica ? (
        <p id={`${id}-dica`} className="text-xs text-muted-foreground">
          {dica}
        </p>
      ) : null}
    </div>
  )
}
```

- [ ] **Passo 6: `AvisoFormulario.tsx` e `AvisoSemServidor.tsx`**

```tsx
import { CheckCircle2, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Erro ou confirmação dentro de um formulário de conta. Erro é `alert`; confirmação é `status`. */
export function AvisoFormulario({ tipo, children }: { readonly tipo: 'erro' | 'ok'; readonly children: ReactNode }) {
  const erro = tipo === 'erro'
  return (
    <div role={erro ? 'alert' : 'status'} className={cn('flex items-start gap-2 rounded-xl p-3 text-sm', erro ? 'bg-lighterror text-errortext' : 'bg-lightprimary text-primary')}>
      {erro ? <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <div className="min-w-0">{children}</div>
    </div>
  )
}
```

```tsx
import { Info } from 'lucide-react'

/** Sem as chaves do Supabase (desenvolvimento), não há conta: o app abre no modo local (CA-150). */
export function AvisoSemServidor({ aoAbrirSistema }: { readonly aoAbrirSistema: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-surfacerow p-4 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
      <div>
        <p className="font-semibold text-heading">A conta na nuvem não está ligada neste MetaNutri.</p>
        <p className="mt-1 text-muted-foreground">Neste modo, tudo fica salvo neste navegador e não precisa de conta.</p>
        <button
          type="button"
          onClick={aoAbrirSistema}
          className="mt-2 inline-flex min-h-11 items-center rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Abrir o sistema
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Passo 7: `contaFalsa.test-utils.ts`**

```ts
// Conta de mentira para os testes das telas: tudo dá certo, a menos que o teste diga.
// O nome não termina em `.test.ts`, então o Vitest não roda este arquivo como teste.
import type { ValorConta } from '../../estado/usarConta.ts'

export function contaFalsa(sobre: Partial<ValorConta> = {}): ValorConta {
  return {
    sessao: null,
    carregando: false,
    disponivel: true,
    emRecuperacao: false,
    entrar: vi.fn(async () => ({ ok: true, erro: null })),
    cadastrar: vi.fn(async () => ({ ok: true, erro: null, confirmarEmail: true })),
    reenviarConfirmacao: vi.fn(async () => ({ ok: true, erro: null })),
    pedirTrocaDeSenha: vi.fn(async () => ({ ok: true, erro: null })),
    trocarSenha: vi.fn(async () => ({ ok: true, erro: null })),
    sair: vi.fn(async () => undefined),
    ...sobre,
  }
}
```

- [ ] **Passo 8: rodar e ver passar**

Rode: `npx vitest run src/ui/publico/conta/pecas.test.tsx`
Esperado: PASS.

- [ ] **Passo 9: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/ui/publico/conta
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): moldura, lado do plano, campo de senha e avisos das telas de conta`.

### Tarefa 18: Tela Criar conta

Cobre CA-127 a CA-134a, CA-171, CA-172 e CA-176 (parte). Cobre também o item 3 do foco de revisão.

**Arquivos:**
- Criar: `src/ui/publico/conta/TelaCriarConta.tsx`
- Criar: `src/ui/publico/conta/TelaCriarConta.test.tsx`

**Interfaces:**
- Consome: as peças da Tarefa 17; `validarCadastro`, `MENSAGEM_ERRO` e `SENHA_MINIMA` (Tarefa 5); `ehEmailDeFaculdade` (Tarefa 10); `VERSAO_TERMOS` (Tarefa 16); `ehPlanoPago` (Tarefa 6).
- Produz:
  - `interface ContaCriada { email: string; plano: IdPlano; confirmarEmail: boolean }`
  - `TelaCriarConta({ conta; plano: IdPlano | null; ciclo: Ciclo; aoCriada: (c: ContaCriada) => void; aoEntrar; aoTrocarPlano; aoIrParaInicio; aoAbrirSistema })`

- [ ] **Passo 1: escrever os testes que falham**

`src/ui/publico/conta/TelaCriarConta.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import type { ValorConta } from '../../estado/usarConta.ts'
import { contaFalsa } from './contaFalsa.test-utils.ts'
import { TelaCriarConta } from './TelaCriarConta.tsx'

function montar(sobre: { conta?: ValorConta; plano?: 'solo' | 'estudante' | null } = {}) {
  const conta = sobre.conta ?? contaFalsa()
  const props = {
    conta,
    plano: sobre.plano ?? null,
    ciclo: 'mensal' as const,
    aoCriada: vi.fn(),
    aoEntrar: vi.fn(),
    aoTrocarPlano: vi.fn(),
    aoIrParaInicio: vi.fn(),
    aoAbrirSistema: vi.fn(),
  }
  render(<TelaCriarConta {...props} />)
  return { ...props, usuario: userEvent.setup() }
}

async function preencher(usuario: UserEvent, email = 'maria@exemplo.com', aceitar = true) {
  await usuario.type(screen.getByLabelText('Nome'), 'Maria')
  await usuario.type(screen.getByLabelText(/e-mail/i), email)
  await usuario.type(screen.getByLabelText('Senha'), 'senhaforte1')
  if (aceitar) await usuario.click(screen.getByRole('checkbox'))
}

const botaoCriar = () => screen.getByRole('button', { name: /^Criar conta/ })

describe('TelaCriarConta', () => {
  it('CA-127: pede nome, e-mail e senha, e mostra o que o Free inclui', () => {
    montar()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.getByText('No Free você já tem')).toBeInTheDocument()
  })

  it('CA-128: com o Solo, mostra o passo 1 de 3 e o link para trocar de plano', async () => {
    const { usuario, aoTrocarPlano } = montar({ plano: 'solo' })
    expect(screen.getByRole('img', { name: 'Passo 1 de 3' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Trocar de plano' }))
    expect(aoTrocarPlano).toHaveBeenCalledOnce()
  })

  it('CA-129: campo errado não vai ao servidor', async () => {
    const { usuario, conta } = montar()
    await usuario.click(botaoCriar())
    expect(screen.getByRole('alert')).toHaveTextContent('Digite como quer ser chamada ou chamado.')
    expect(conta.cadastrar).not.toHaveBeenCalled()
  })

  it('CA-134a: sem marcar os termos, a conta não é criada', async () => {
    const { usuario, conta } = montar()
    await preencher(usuario, 'maria@exemplo.com', false)
    await usuario.click(botaoCriar())
    expect(screen.getByRole('alert')).toHaveTextContent('marque que leu e aceita os termos')
    expect(conta.cadastrar).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Termos de uso' })).toHaveAttribute('href', '#/termos')
  })

  it('CA-130: e-mail com conta mostra o aviso e o atalho para entrar', async () => {
    const conta = contaFalsa({ cadastrar: vi.fn(async () => ({ ok: false, erro: 'email-em-uso' as const })) })
    const { usuario, aoEntrar } = montar({ conta })
    await preencher(usuario)
    await usuario.click(botaoCriar())
    expect(screen.getByRole('alert')).toHaveTextContent('Este e-mail já tem conta.')
    await usuario.click(screen.getAllByRole('button', { name: 'Entrar' })[0] as HTMLElement)
    expect(aoEntrar).toHaveBeenCalled()
  })

  it('CA-131: sem internet, avisa e deixa tentar de novo com tudo preenchido', async () => {
    const conta = contaFalsa({ cadastrar: vi.fn(async () => ({ ok: false, erro: 'falha-rede' as const })) })
    const { usuario } = montar({ conta })
    await preencher(usuario)
    await usuario.click(botaoCriar())
    expect(screen.getByRole('alert')).toHaveTextContent('Confira a internet')
    expect(screen.getByLabelText('Nome')).toHaveValue('Maria')
    expect(botaoCriar()).toBeEnabled()
  })

  it('CA-132 e CA-133: conta criada avisa quem manda, com o e-mail e o plano', async () => {
    const { usuario, aoCriada, conta } = montar({ plano: 'solo' })
    await preencher(usuario, '  maria@exemplo.com ')
    await usuario.click(botaoCriar())
    expect(conta.cadastrar).toHaveBeenCalledWith(expect.objectContaining({ planoDesejado: 'solo', versaoTermos: '2026-09-28' }))
    expect(aoCriada).toHaveBeenCalledWith({ email: 'maria@exemplo.com', plano: 'solo', confirmarEmail: true })
  })

  it('CA-134: clique duplo cria uma conta só', async () => {
    let terminar: (v: { ok: boolean; erro: null }) => void = () => undefined
    const conta = contaFalsa({ cadastrar: vi.fn(() => new Promise((resolver) => (terminar = resolver))) })
    const { usuario } = montar({ conta })
    await preencher(usuario)
    await usuario.dblClick(botaoCriar())
    terminar({ ok: true, erro: null })
    expect(conta.cadastrar).toHaveBeenCalledTimes(1)
  })

  it('CA-171: com o Estudante, o campo pede o e-mail da faculdade', () => {
    montar({ plano: 'estudante' })
    expect(screen.getByLabelText('E-mail da faculdade')).toBeInTheDocument()
  })

  it('CA-172: e-mail que não é de faculdade é avisado antes, e dá para seguir no Free', async () => {
    const { usuario, conta } = montar({ plano: 'estudante' })
    await preencher(usuario, 'maria@gmail.com')
    await usuario.click(botaoCriar())
    expect(conta.cadastrar).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('button', { name: 'Criar a conta no Free' }))
    expect(conta.cadastrar).toHaveBeenCalledWith(expect.objectContaining({ planoDesejado: 'free' }))
  })

  it('CA-173 (lado da tela): e-mail de faculdade segue como Estudante', async () => {
    const { usuario, conta } = montar({ plano: 'estudante' })
    await preencher(usuario, 'maria@usp.br')
    await usuario.click(botaoCriar())
    expect(conta.cadastrar).toHaveBeenCalledWith(expect.objectContaining({ planoDesejado: 'estudante' }))
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/publico/conta/TelaCriarConta.test.tsx`
Esperado: FAIL (arquivo inexistente).

- [ ] **Passo 3: `TelaCriarConta.tsx`**

```tsx
import { useId, useRef, useState, type FormEvent } from 'react'
import { MENSAGEM_ERRO, SENHA_MINIMA, validarCadastro, type Ciclo, type ErroConta, type IdPlano } from '@/domain/conta.ts'
import { ehEmailDeFaculdade } from '@/domain/estudante.ts'
import { VERSAO_TERMOS } from '@/domain/legal.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import type { ValorConta } from '../../estado/usarConta.ts'
import { ehPlanoPago } from '../../navegacao.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { AvisoSemServidor } from './AvisoSemServidor.tsx'
import { CampoSenha } from './CampoSenha.tsx'
import { LadoDoPlano } from './LadoDoPlano.tsx'
import { MolduraConta } from './MolduraConta.tsx'

export interface ContaCriada {
  readonly email: string
  readonly plano: IdPlano
  readonly confirmarEmail: boolean
}

interface TelaCriarContaProps {
  readonly conta: ValorConta
  readonly plano: IdPlano | null
  readonly ciclo: Ciclo
  readonly aoCriada: (criada: ContaCriada) => void
  readonly aoEntrar: () => void
  readonly aoTrocarPlano: () => void
  readonly aoIrParaInicio: () => void
  readonly aoAbrirSistema: () => void
}

function subtitulo(plano: IdPlano | null): string {
  if (plano !== null && ehPlanoPago(plano)) return 'Passo 1 de 3. Depois você revisa o plano e paga.'
  if (plano === 'estudante') return 'Use o e-mail da faculdade: é ele que libera o plano Estudante.'
  return 'Leva menos de um minuto. Não precisa de cartão.'
}

const LINK = 'font-semibold text-primary underline underline-offset-4'

/** Criar conta (spec estilo-spora, US-1.3 e US-1.10; mockup conta e checkout v1). */
export function TelaCriarConta({ conta, plano, ciclo, aoCriada, aoEntrar, aoTrocarPlano, aoIrParaInicio, aoAbrirSistema }: TelaCriarContaProps) {
  const id = useId()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [aceitou, setAceitou] = useState(false)
  const [erro, setErro] = useState<ErroConta | null>(null)
  const [avisoEstudante, setAvisoEstudante] = useState(false)
  const [enviando, setEnviando] = useState(false)
  // Trava de verdade contra o clique duplo (CA-134): o estado só muda no próximo render.
  const enviandoRef = useRef(false)

  const pago = plano !== null && ehPlanoPago(plano)
  const estudante = plano === 'estudante'

  const criar = async (planoDesejado: IdPlano) => {
    if (enviandoRef.current) return
    const problema = validarCadastro({ nome, email, senha, aceitouTermos: aceitou })
    if (problema) {
      setErro(problema)
      return
    }
    setErro(null)
    // CA-172: e-mail que não é de faculdade é avisado antes, e a pessoa escolhe.
    if (planoDesejado === 'estudante' && !ehEmailDeFaculdade(email)) {
      setAvisoEstudante(true)
      return
    }

    enviandoRef.current = true
    setEnviando(true)
    const resultado = await conta.cadastrar({ nome, email, senha, planoDesejado, versaoTermos: VERSAO_TERMOS })
    enviandoRef.current = false
    setEnviando(false)
    if (!resultado.ok) {
      setErro(resultado.erro)
      return
    }
    aoCriada({ email: email.trim(), plano: planoDesejado, confirmarEmail: resultado.confirmarEmail === true })
  }

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    void criar(plano ?? 'free')
  }

  const usarOutroEmail = () => {
    setAvisoEstudante(false)
    globalThis.document.getElementById(`${id}-email`)?.focus()
  }

  const criarNoFree = () => {
    setAvisoEstudante(false)
    void criar('free')
  }

  return (
    <MolduraConta
      titulo="Crie sua conta"
      subtitulo={subtitulo(plano)}
      passo={pago ? { atual: 1, total: 3 } : undefined}
      aoIrParaInicio={aoIrParaInicio}
      lado={<LadoDoPlano plano={plano} ciclo={ciclo} aoTrocarPlano={plano !== null ? aoTrocarPlano : undefined} />}
    >
      {conta.disponivel ? null : <AvisoSemServidor aoAbrirSistema={aoAbrirSistema} />}

      <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-nome`}>Nome</Label>
          <Input
            id={`${id}-nome`}
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Como quer ser chamada ou chamado"
            aria-invalid={erro === 'nome-vazio'}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-email`}>{estudante ? 'E-mail da faculdade' : 'E-mail'}</Label>
          <Input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setAvisoEstudante(false)
            }}
            placeholder={estudante ? 'voce@aluno.faculdade.br' : 'voce@exemplo.com'}
            aria-invalid={erro === 'email-invalido' || erro === 'email-em-uso'}
          />
        </div>

        <CampoSenha id={`${id}-senha`} rotulo="Senha" valor={senha} aoMudar={setSenha} novaSenha invalido={erro === 'senha-curta'} dica={`Pelo menos ${SENHA_MINIMA} caracteres.`} />

        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" checked={aceitou} onChange={(e) => setAceitou(e.target.checked)} aria-invalid={erro === 'termos'} className="mt-0.5 size-4 shrink-0 accent-[var(--brand-primary)]" />
          <span>
            Li e aceito os{' '}
            <a href="#/termos" target="_blank" rel="noreferrer" className={LINK}>
              Termos de uso
            </a>{' '}
            e a{' '}
            <a href="#/privacidade" target="_blank" rel="noreferrer" className={LINK}>
              Política de privacidade
            </a>
            .
          </span>
        </label>

        {avisoEstudante ? (
          <AvisoFormulario tipo="erro">
            <p>Este e-mail não é de uma faculdade que conhecemos. O plano Estudante vale só para conta criada com o e-mail da faculdade.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={usarOutroEmail}>
                Usar outro e-mail
              </Button>
              <Button size="sm" onClick={criarNoFree}>
                Criar a conta no Free
              </Button>
            </div>
          </AvisoFormulario>
        ) : null}

        {erro ? (
          <AvisoFormulario tipo="erro">
            {MENSAGEM_ERRO[erro]}
            {erro === 'email-em-uso' ? (
              <>
                {' '}
                <button type="button" onClick={aoEntrar} className="font-semibold underline underline-offset-4">
                  Entrar
                </button>
              </>
            ) : null}
          </AvisoFormulario>
        ) : null}

        <Button type="submit" size="lg" block loading={enviando} disabled={!conta.disponivel}>
          {pago ? 'Criar conta e continuar' : 'Criar conta'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <button type="button" onClick={aoEntrar} className="rounded-sm font-semibold text-primary underline-offset-4 hover:underline">
            Entrar
          </button>
        </p>
      </form>
    </MolduraConta>
  )
}
```

- [ ] **Passo 4: rodar e ver passar**

Rode: `npx vitest run src/ui/publico/conta/TelaCriarConta.test.tsx`
Esperado: PASS. Se o `getByLabelText('Senha')` achar dois elementos, confira que o botão do olho usa `aria-label` ("Mostrar a senha") e não `<label>`.

- [ ] **Passo 5: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/ui/publico/conta/TelaCriarConta.tsx src/ui/publico/conta/TelaCriarConta.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): tela Criar conta com plano escolhido, termos e Estudante`.

### Tarefa 19: Tela Entrar

Cobre CA-135, CA-136, CA-139 e CA-155. Cobre também o item 5 do foco de revisão.

**Arquivos:**
- Criar: `src/ui/publico/conta/TelaEntrar.tsx`
- Criar: `src/ui/publico/conta/TelaEntrar.test.tsx`
- Apagar: `src/ui/publico/TelaEntrar.tsx`
- Alterar: `src/App.tsx` (import e props da `TelaEntrar`)

**Interfaces:**
- Consome: as peças da Tarefa 17; `validarEntrada` e `MENSAGEM_ERRO` (Tarefa 5).
- Produz: `TelaEntrar({ conta; aoEntrou: () => void; aoCriarConta: () => void; aoEsqueci: () => void; aoIrParaInicio: () => void; aoAbrirSistema: () => void; pedidoPorTela?: boolean })`

- [ ] **Passo 1: escrever os testes que falham**

`src/ui/publico/conta/TelaEntrar.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ValorConta } from '../../estado/usarConta.ts'
import { contaFalsa } from './contaFalsa.test-utils.ts'
import { TelaEntrar } from './TelaEntrar.tsx'

function montar(conta: ValorConta = contaFalsa()) {
  const props = { conta, aoEntrou: vi.fn(), aoCriarConta: vi.fn(), aoEsqueci: vi.fn(), aoIrParaInicio: vi.fn(), aoAbrirSistema: vi.fn() }
  render(<TelaEntrar {...props} />)
  return { ...props, usuario: userEvent.setup() }
}

async function entrar(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
  await usuario.type(screen.getByLabelText('Senha'), 'senhaforte1')
  await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('TelaEntrar', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis.navigator, 'onLine')
  })

  it('CA-135: pede e-mail e senha e tem os atalhos', async () => {
    const { usuario, aoEsqueci, aoCriarConta } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Esqueci a senha' }))
    await usuario.click(screen.getByRole('button', { name: 'Criar grátis' }))
    expect(aoEsqueci).toHaveBeenCalledOnce()
    expect(aoCriarConta).toHaveBeenCalledOnce()
    expect(screen.getByText('No Free você já tem')).toBeInTheDocument()
  })

  it('CA-137: deu certo, avisa quem manda', async () => {
    const { usuario, aoEntrou, conta } = montar()
    await entrar(usuario)
    expect(conta.entrar).toHaveBeenCalledWith('maria@exemplo.com', 'senhaforte1')
    expect(aoEntrou).toHaveBeenCalledOnce()
  })

  it('CA-136: e-mail ou senha errados, sem dizer qual', async () => {
    const { usuario, aoEntrou } = montar(contaFalsa({ entrar: vi.fn(async () => ({ ok: false, erro: 'credencial-invalida' as const })) }))
    await entrar(usuario)
    expect(screen.getByRole('alert')).toHaveTextContent('E-mail ou senha não conferem.')
    expect(aoEntrou).not.toHaveBeenCalled()
  })

  it('CA-139: e-mail sem confirmar oferece reenviar o link', async () => {
    const conta = contaFalsa({ entrar: vi.fn(async () => ({ ok: false, erro: 'email-nao-confirmado' as const })) })
    const { usuario } = montar(conta)
    await entrar(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Reenviar o link' }))
    expect(conta.reenviarConfirmacao).toHaveBeenCalledWith('maria@exemplo.com')
    expect(screen.getByRole('status')).toHaveTextContent('Mandamos outro link para maria@exemplo.com.')
  })

  it('CA-155: sem internet, avisa que o primeiro acesso precisa de internet', () => {
    Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true })
    montar()
    expect(screen.getByRole('alert')).toHaveTextContent('O primeiro acesso em cada aparelho precisa de internet.')
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/publico/conta/TelaEntrar.test.tsx`
Esperado: FAIL (arquivo inexistente).

- [ ] **Passo 3: `src/ui/publico/conta/TelaEntrar.tsx`**

```tsx
import { useId, useRef, useState, type FormEvent } from 'react'
import { MENSAGEM_ERRO, validarEntrada, type ErroConta } from '@/domain/conta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import type { ValorConta } from '../../estado/usarConta.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { AvisoSemServidor } from './AvisoSemServidor.tsx'
import { CampoSenha } from './CampoSenha.tsx'
import { LadoDoPlano } from './LadoDoPlano.tsx'
import { MolduraConta } from './MolduraConta.tsx'

interface TelaEntrarProps {
  readonly conta: ValorConta
  readonly aoEntrou: () => void
  readonly aoCriarConta: () => void
  readonly aoEsqueci: () => void
  readonly aoIrParaInicio: () => void
  readonly aoAbrirSistema: () => void
  /** Veio de uma tela que pede sessão (CA-148): o subtítulo diz isso. */
  readonly pedidoPorTela?: boolean | undefined
}

type Reenvio = 'nada' | 'enviado' | ErroConta

const BOTAO_TEXTO = 'rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Entrar (spec estilo-spora, US-1.4; mockup conta e checkout v1). */
export function TelaEntrar({ conta, aoEntrou, aoCriarConta, aoEsqueci, aoIrParaInicio, aoAbrirSistema, pedidoPorTela = false }: TelaEntrarProps) {
  const id = useId()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<ErroConta | null>(null)
  const [reenvio, setReenvio] = useState<Reenvio>('nada')
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)
  const [reenviando, setReenviando] = useState(false)
  const reenviandoRef = useRef(false)
  const semInternet = globalThis.navigator?.onLine === false

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    const problema = validarEntrada(email, senha)
    if (problema) {
      setErro(problema)
      return
    }
    setErro(null)
    setReenvio('nada')
    enviandoRef.current = true
    setEnviando(true)
    const resultado = await conta.entrar(email, senha)
    enviandoRef.current = false
    setEnviando(false)
    if (!resultado.ok) {
      setErro(resultado.erro)
      return
    }
    aoEntrou()
  }

  const reenviar = async () => {
    if (reenviandoRef.current) return
    reenviandoRef.current = true
    setReenviando(true)
    const resultado = await conta.reenviarConfirmacao(email)
    reenviandoRef.current = false
    setReenviando(false)
    setReenvio(resultado.ok ? 'enviado' : (resultado.erro ?? 'falha-rede'))
  }

  return (
    <MolduraConta
      titulo="Entrar"
      subtitulo={pedidoPorTela ? 'Entre para continuar de onde parou.' : 'Continue de onde parou.'}
      aoIrParaInicio={aoIrParaInicio}
      lado={<LadoDoPlano plano={null} ciclo="mensal" />}
    >
      {conta.disponivel ? null : <AvisoSemServidor aoAbrirSistema={aoAbrirSistema} />}
      {semInternet ? <AvisoFormulario tipo="erro">Você está sem internet. O primeiro acesso em cada aparelho precisa de internet.</AvisoFormulario> : null}

      <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-email`}>E-mail</Label>
          <Input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            aria-invalid={erro === 'email-invalido' || erro === 'credencial-invalida'}
          />
        </div>

        <CampoSenha id={`${id}-senha`} rotulo="Senha" valor={senha} aoMudar={setSenha} novaSenha={false} invalido={erro === 'senha-curta' || erro === 'credencial-invalida'} />

        <button type="button" onClick={aoEsqueci} className={`-mt-2 self-end text-sm ${BOTAO_TEXTO}`}>
          Esqueci a senha
        </button>

        {erro ? (
          <AvisoFormulario tipo="erro">
            {MENSAGEM_ERRO[erro]}
            {erro === 'email-nao-confirmado' ? (
              <div className="mt-2">
                <Button size="sm" variant="outline" loading={reenviando} onClick={() => void reenviar()}>
                  Reenviar o link
                </Button>
              </div>
            ) : null}
          </AvisoFormulario>
        ) : null}

        {reenvio === 'enviado' ? <AvisoFormulario tipo="ok">Mandamos outro link para {email.trim()}.</AvisoFormulario> : null}
        {reenvio !== 'nada' && reenvio !== 'enviado' ? <AvisoFormulario tipo="erro">{MENSAGEM_ERRO[reenvio]}</AvisoFormulario> : null}

        <Button type="submit" size="lg" block loading={enviando} disabled={!conta.disponivel}>
          Entrar
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem conta?{' '}
          <button type="button" onClick={aoCriarConta} className={BOTAO_TEXTO}>
            Criar grátis
          </button>
        </p>
      </form>
    </MolduraConta>
  )
}
```

- [ ] **Passo 4: trocar no `App.tsx` e apagar a antiga**

Apague `src/ui/publico/TelaEntrar.tsx` (`git rm src/ui/publico/TelaEntrar.tsx`). No `App.tsx`, troque o import para `./ui/publico/conta/TelaEntrar.tsx` e a renderização da rota `entrar` por:

```tsx
  if (rota.tela === 'entrar') {
    return (
      <TelaEntrar
        conta={conta}
        aoEntrou={() => navegar(tirarDestino(armazenamentoLocal()) ?? { tela: 'painel' })}
        aoCriarConta={() => navegar(rotaCriarConta(null, 'mensal'))}
        aoEsqueci={() => navegar({ tela: 'esqueci-senha' })}
        aoIrParaInicio={() => navegar({ tela: 'inicio' })}
        aoAbrirSistema={() => navegar({ tela: 'painel' })}
      />
    )
  }
```

(importe `tirarDestino` de `./ui/fluxoConta.ts` e `armazenamentoLocal` de `./ui/estado/armazenamentoLocal.ts`).

- [ ] **Passo 5: rodar e ver passar**

Rode: `npx vitest run src/ui/publico/conta/TelaEntrar.test.tsx`
Esperado: PASS.

- [ ] **Passo 6: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/ui/publico/conta/TelaEntrar.tsx src/ui/publico/conta/TelaEntrar.test.tsx src/App.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): tela Entrar com reenvio de confirmação e aviso sem internet`.

### Tarefa 20: Confirmar e-mail, Esqueci a senha e Nova senha

Cobre CA-140 a CA-147.

**Arquivos:**
- Alterar: `src/domain/conta.ts` (export `ehEmailValido`)
- Criar em `src/ui/publico/conta/`: `TelaConfirmarEmail.tsx`, `TelaEsqueciSenha.tsx`, `TelaNovaSenha.tsx` e `senha.test.tsx`

**Interfaces:**
- Produz:
  - `ehEmailValido(email: string): boolean` (em `conta.ts`)
  - `TelaConfirmarEmail({ conta; email: string | null; vencido: boolean; aoIrParaInicio; aoEntrar })`
  - `TelaEsqueciSenha({ conta; aoIrParaInicio; aoEntrar })`
  - `TelaNovaSenha({ conta; vencido: boolean; aoSenhaTrocada: () => void; aoPedirOutro: () => void; aoIrParaInicio })`

- [ ] **Passo 1: escrever os testes que falham**

`src/ui/publico/conta/senha.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { contaFalsa } from './contaFalsa.test-utils.ts'
import { TelaConfirmarEmail } from './TelaConfirmarEmail.tsx'
import { TelaEsqueciSenha } from './TelaEsqueciSenha.tsx'
import { TelaNovaSenha } from './TelaNovaSenha.tsx'

describe('TelaConfirmarEmail', () => {
  afterEach(() => vi.useRealTimers())

  it('CA-140 e CA-141: mostra o e-mail e segura o reenvio por 60 segundos', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const conta = contaFalsa()
    render(<TelaConfirmarEmail conta={conta} email="maria@exemplo.com" vencido={false} aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    expect(screen.getByText(/maria@exemplo\.com/)).toBeInTheDocument()

    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole('button', { name: 'Reenviar o link' }))
    expect(conta.reenviarConfirmacao).toHaveBeenCalledWith('maria@exemplo.com')
    expect(screen.getByRole('button', { name: /Reenviar em 60 s/ })).toBeDisabled()

    for (let i = 0; i < 60; i++) act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('button', { name: 'Reenviar o link' })).toBeEnabled()
  })

  it('CA-143: link vencido pede outro', () => {
    render(<TelaConfirmarEmail conta={contaFalsa()} email={null} vencido aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Este link não vale mais' })).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mandar outro link' })).toBeInTheDocument()
  })
})

describe('TelaEsqueciSenha', () => {
  it('CA-144: responde igual, exista a conta ou não', async () => {
    const conta = contaFalsa()
    render(<TelaEsqueciSenha conta={conta} aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.click(screen.getByRole('button', { name: 'Mandar o link' }))
    expect(conta.pedirTrocaDeSenha).toHaveBeenCalledWith('maria@exemplo.com')
    expect(screen.getByRole('status')).toHaveTextContent('Se existir conta com esse e-mail, o link chega em alguns minutos.')
  })

  it('e-mail inválido não vai ao servidor', async () => {
    const conta = contaFalsa()
    render(<TelaEsqueciSenha conta={conta} aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria')
    await usuario.click(screen.getByRole('button', { name: 'Mandar o link' }))
    expect(conta.pedirTrocaDeSenha).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})

describe('TelaNovaSenha', () => {
  it('CA-147: sem o link de troca, pede outro', async () => {
    const aoPedirOutro = vi.fn()
    render(<TelaNovaSenha conta={contaFalsa()} vencido={false} aoSenhaTrocada={vi.fn()} aoPedirOutro={aoPedirOutro} aoIrParaInicio={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Este link não vale mais' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Pedir outro link' }))
    expect(aoPedirOutro).toHaveBeenCalledOnce()
  })

  it('CA-145 e CA-146: com o link, troca a senha e segue', async () => {
    const conta = contaFalsa({ emRecuperacao: true })
    const aoSenhaTrocada = vi.fn()
    render(<TelaNovaSenha conta={conta} vencido={false} aoSenhaTrocada={aoSenhaTrocada} aoPedirOutro={vi.fn()} aoIrParaInicio={vi.fn()} />)
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('Senha nova'), 'novasenha1')
    await usuario.type(screen.getByLabelText('Repita a senha'), 'outrasenha')
    await usuario.click(screen.getByRole('button', { name: 'Salvar a senha' }))
    expect(screen.getByRole('alert')).toHaveTextContent('As duas senhas não são iguais.')
    expect(conta.trocarSenha).not.toHaveBeenCalled()

    await usuario.clear(screen.getByLabelText('Repita a senha'))
    await usuario.type(screen.getByLabelText('Repita a senha'), 'novasenha1')
    await usuario.click(screen.getByRole('button', { name: 'Salvar a senha' }))
    expect(conta.trocarSenha).toHaveBeenCalledWith('novasenha1')
    expect(aoSenhaTrocada).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/publico/conta/senha.test.tsx`
Esperado: FAIL.

- [ ] **Passo 3: `ehEmailValido` em `conta.ts`**

Logo depois de `const EMAIL = ...`:

```ts
export const ehEmailValido = (email: string): boolean => EMAIL.test(email.trim())
```

- [ ] **Passo 4: `TelaConfirmarEmail.tsx`**

```tsx
import { useEffect, useId, useRef, useState } from 'react'
import { ehEmailValido, MENSAGEM_ERRO, type ErroConta } from '@/domain/conta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import type { ValorConta } from '../../estado/usarConta.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { MolduraConta } from './MolduraConta.tsx'

interface TelaConfirmarEmailProps {
  readonly conta: ValorConta
  /** O e-mail do cadastro recém-feito. `null` quando a página foi aberta de novo. */
  readonly email: string | null
  readonly vencido: boolean
  readonly aoIrParaInicio: () => void
  readonly aoEntrar: () => void
}

const ESPERA_S = 60

/** Confira seu e-mail e o link vencido (spec estilo-spora, US-1.5). */
export function TelaConfirmarEmail({ conta, email, vencido, aoIrParaInicio, aoEntrar }: TelaConfirmarEmailProps) {
  const id = useId()
  const [digitado, setDigitado] = useState(email ?? '')
  const [espera, setEspera] = useState(0)
  const [resultado, setResultado] = useState<'nada' | 'enviado' | ErroConta>('nada')
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)

  useEffect(() => {
    if (espera <= 0) return
    const relogio = globalThis.setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => globalThis.clearTimeout(relogio)
  }, [espera])

  const reenviar = async () => {
    if (enviandoRef.current) return
    if (!ehEmailValido(digitado)) {
      setResultado('email-invalido')
      return
    }
    enviandoRef.current = true
    setEnviando(true)
    const r = await conta.reenviarConfirmacao(digitado)
    enviandoRef.current = false
    setEnviando(false)
    setResultado(r.ok ? 'enviado' : (r.erro ?? 'falha-rede'))
    if (r.ok) setEspera(ESPERA_S)
  }

  const rotuloBotao = espera > 0 ? `Reenviar em ${espera} s` : vencido ? 'Mandar outro link' : 'Reenviar o link'

  return (
    <MolduraConta
      titulo={vencido ? 'Este link não vale mais' : 'Confira seu e-mail'}
      subtitulo={
        vencido
          ? 'O link de confirmação venceu ou já foi usado. Peça outro abaixo.'
          : `Mandamos um link para ${email ?? 'o seu e-mail'}. Clique nele para ativar a conta. Não chegou? Olhe a caixa de spam.`
      }
      aoIrParaInicio={aoIrParaInicio}
    >
      {email === null ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-email`}>E-mail</Label>
          <Input id={`${id}-email`} type="email" autoComplete="email" value={digitado} onChange={(e) => setDigitado(e.target.value)} placeholder="voce@exemplo.com" />
        </div>
      ) : null}

      {resultado === 'enviado' ? <AvisoFormulario tipo="ok">Mandamos outro link para {digitado.trim()}.</AvisoFormulario> : null}
      {resultado !== 'nada' && resultado !== 'enviado' ? <AvisoFormulario tipo="erro">{MENSAGEM_ERRO[resultado]}</AvisoFormulario> : null}

      <Button variant={vencido ? 'default' : 'outline'} size="lg" block disabled={espera > 0} loading={enviando} onClick={() => void reenviar()}>
        {rotuloBotao}
      </Button>
      <button type="button" onClick={aoEntrar} className="inline-flex min-h-11 items-center self-center rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline">
        Já confirmei, quero entrar
      </button>
    </MolduraConta>
  )
}
```

- [ ] **Passo 5: `TelaEsqueciSenha.tsx`**

```tsx
import { useId, useState, type FormEvent } from 'react'
import { ehEmailValido, MENSAGEM_ERRO, type ErroConta } from '@/domain/conta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import type { ValorConta } from '../../estado/usarConta.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { MolduraConta } from './MolduraConta.tsx'

interface TelaEsqueciSenhaProps {
  readonly conta: ValorConta
  readonly aoIrParaInicio: () => void
  readonly aoEntrar: () => void
}

/** Pedir o link de troca de senha (spec estilo-spora, CA-144). */
export function TelaEsqueciSenha({ conta, aoIrParaInicio, aoEntrar }: TelaEsqueciSenhaProps) {
  const id = useId()
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<'nada' | 'enviado' | ErroConta>('nada')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!ehEmailValido(email)) {
      setEstado('email-invalido')
      return
    }
    setEnviando(true)
    const resultado = await conta.pedirTrocaDeSenha(email)
    setEnviando(false)
    setEstado(resultado.ok ? 'enviado' : (resultado.erro ?? 'falha-rede'))
  }

  return (
    <MolduraConta titulo="Esqueci a senha" subtitulo="Digite o e-mail da conta. Mandamos um link para criar uma senha nova." aoIrParaInicio={aoIrParaInicio}>
      <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-email`}>E-mail</Label>
          <Input id={`${id}-email`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
        </div>
        {estado === 'enviado' ? <AvisoFormulario tipo="ok">Se existir conta com esse e-mail, o link chega em alguns minutos. Olhe também o spam.</AvisoFormulario> : null}
        {estado !== 'nada' && estado !== 'enviado' ? <AvisoFormulario tipo="erro">{MENSAGEM_ERRO[estado]}</AvisoFormulario> : null}
        <Button type="submit" size="lg" block loading={enviando}>
          Mandar o link
        </Button>
        <button type="button" onClick={aoEntrar} className="self-center rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Lembrei, quero entrar
        </button>
      </form>
    </MolduraConta>
  )
}
```

- [ ] **Passo 6: `TelaNovaSenha.tsx`**

```tsx
import { useId, useState, type FormEvent } from 'react'
import { MENSAGEM_ERRO, SENHA_MINIMA, type ErroConta } from '@/domain/conta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import type { ValorConta } from '../../estado/usarConta.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { CampoSenha } from './CampoSenha.tsx'
import { MolduraConta } from './MolduraConta.tsx'

interface TelaNovaSenhaProps {
  readonly conta: ValorConta
  readonly vencido: boolean
  readonly aoSenhaTrocada: () => void
  readonly aoPedirOutro: () => void
  readonly aoIrParaInicio: () => void
}

/** Senha nova, depois do link do e-mail (spec estilo-spora, CA-145 a CA-147). */
export function TelaNovaSenha({ conta, vencido, aoSenhaTrocada, aoPedirOutro, aoIrParaInicio }: TelaNovaSenhaProps) {
  const id = useId()
  const [senha, setSenha] = useState('')
  const [repetida, setRepetida] = useState('')
  const [erro, setErro] = useState<ErroConta | null>(null)
  const [salvando, setSalvando] = useState(false)
  // Só dá para trocar quem chegou pelo link (modo de recuperação) ou já está conectado.
  const podeTrocar = !vencido && (conta.emRecuperacao || conta.sessao !== null)

  if (!podeTrocar) {
    return (
      <MolduraConta titulo="Este link não vale mais" subtitulo="O link de troca de senha venceu ou já foi usado. Peça outro, ele chega em alguns minutos." aoIrParaInicio={aoIrParaInicio}>
        <Button size="lg" block onClick={aoPedirOutro}>
          Pedir outro link
        </Button>
      </MolduraConta>
    )
  }

  const salvar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (senha.length < SENHA_MINIMA) {
      setErro('senha-curta')
      return
    }
    if (senha !== repetida) {
      setErro('senha-diferente')
      return
    }
    setErro(null)
    setSalvando(true)
    const resultado = await conta.trocarSenha(senha)
    setSalvando(false)
    if (!resultado.ok) {
      setErro(resultado.erro)
      return
    }
    aoSenhaTrocada()
  }

  return (
    <MolduraConta titulo="Crie uma senha nova" subtitulo={`Pelo menos ${SENHA_MINIMA} caracteres.`} aoIrParaInicio={aoIrParaInicio}>
      <form onSubmit={(e) => void salvar(e)} noValidate className="flex flex-col gap-4">
        <CampoSenha id={`${id}-nova`} rotulo="Senha nova" valor={senha} aoMudar={setSenha} novaSenha invalido={erro === 'senha-curta'} />
        <CampoSenha id={`${id}-repetida`} rotulo="Repita a senha" valor={repetida} aoMudar={setRepetida} novaSenha invalido={erro === 'senha-diferente'} />
        {erro ? <AvisoFormulario tipo="erro">{MENSAGEM_ERRO[erro]}</AvisoFormulario> : null}
        <Button type="submit" size="lg" block loading={salvando}>
          Salvar a senha
        </Button>
      </form>
    </MolduraConta>
  )
}
```

Os hooks ficam todos antes do `return` antecipado: essa ordem é obrigatória.

- [ ] **Passo 7: rodar e ver passar**

Rode: `npx vitest run src/ui/publico/conta/senha.test.tsx`
Esperado: PASS.

- [ ] **Passo 8: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/domain/conta.ts src/ui/publico/conta/TelaConfirmarEmail.tsx src/ui/publico/conta/TelaEsqueciSenha.tsx src/ui/publico/conta/TelaNovaSenha.tsx src/ui/publico/conta/senha.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): confirmar e-mail, esqueci a senha e senha nova`.

### Tarefa 21: Termos de uso e Política de privacidade

Cobre CA-220 a CA-222 e CA-224. O CA-223 vem da Tarefa 12, que grava a versão no cadastro.

**Arquivos:**
- Criar: `src/ui/publico/DocumentoLegal.tsx`, `src/ui/publico/TelaTermos.tsx`, `src/ui/publico/TelaPrivacidade.tsx` e `src/ui/publico/legal.test.tsx`

**Interfaces:**
- Consome: `RESPONSAVEL`, `CONTATO_EMAIL`, `DATA_TERMOS`, `PRAZO_EXCLUSAO_DIAS` e `PRAZO_INCIDENTE_HORAS` (Tarefa 16).
- Produz: `TelaTermos()` e `TelaPrivacidade()`, sem props. Ficam dentro da `MolduraPublica` (Tarefa 24).

- [ ] **Passo 1: escrever os testes que falham**

`src/ui/publico/legal.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { CONTATO_EMAIL, DATA_TERMOS, RESPONSAVEL } from '@/domain/legal.ts'
import { TelaPrivacidade } from './TelaPrivacidade.tsx'
import { TelaTermos } from './TelaTermos.tsx'

describe('documentos legais', () => {
  it('CA-222 e CA-224: termos dizem quem prescreve, quem é controlador e operador, e a data', () => {
    render(<TelaTermos />)
    expect(screen.getByRole('heading', { level: 1, name: 'Termos de uso' })).toBeInTheDocument()
    expect(screen.getByText(new RegExp(`Versão de ${DATA_TERMOS}`))).toBeInTheDocument()
    const texto = document.body.textContent ?? ''
    expect(texto).toContain('quem prescreve é o nutricionista')
    expect(texto).toContain('controlador')
    expect(texto).toContain('operador')
    expect(texto).toContain('uso não comercial')
  })

  it('CA-221 e CA-224: a política diz quem responde, onde os dados ficam e como pedir', () => {
    render(<TelaPrivacidade />)
    expect(screen.getByRole('heading', { level: 1, name: 'Política de privacidade' })).toBeInTheDocument()
    const texto = document.body.textContent ?? ''
    expect(texto).toContain(RESPONSAVEL)
    expect(texto).toContain(CONTATO_EMAIL)
    expect(texto).toContain('art. 18')
    expect(texto).toContain('neste aparelho')
    expect(texto).toContain('Supabase')
    expect(texto).toContain(DATA_TERMOS)
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/publico/legal.test.tsx`
Esperado: FAIL.

- [ ] **Passo 3: `DocumentoLegal.tsx`**

```tsx
import type { ReactNode } from 'react'
import { DATA_TERMOS } from '@/domain/legal.ts'

/** Moldura de leitura dos documentos legais: coluna estreita, título e versão. */
export function DocumentoLegal({ titulo, children }: { readonly titulo: string; readonly children: ReactNode }) {
  return (
    <article className="mx-auto max-w-[72ch] px-4 py-12 text-sm leading-relaxed text-foreground sm:px-8 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="text-4xl font-bold">{titulo}</h1>
      <p className="text-muted-foreground">Versão de {DATA_TERMOS}.</p>
      {children}
    </article>
  )
}
```

- [ ] **Passo 4: `TelaPrivacidade.tsx`**

```tsx
import { CONTATO_EMAIL, PRAZO_EXCLUSAO_DIAS, PRAZO_INCIDENTE_HORAS, RESPONSAVEL } from '@/domain/legal.ts'
import { DocumentoLegal } from './DocumentoLegal.tsx'

/** Política de privacidade (spec estilo-spora, CA-221). Escrita sem advogado, por decisão do dono (R-14). */
export function TelaPrivacidade() {
  return (
    <DocumentoLegal titulo="Política de privacidade">
      <h2>Quem responde</h2>
      <p>
        O MetaNutri é um programa de planejamento alimentar e acompanhamento de pacientes. Quem responde por ele, inclusive como encarregado dos dados
        pessoais, é {RESPONSAVEL}. Contato: {CONTATO_EMAIL}.
      </p>

      <h2>Quem é quem</h2>
      <p>
        Nos dados dos pacientes, o nutricionista é o controlador: é ele quem decide registrar, coleta o consentimento e responde pelo atendimento. O
        MetaNutri é o operador: trata esses dados só para o serviço funcionar e segundo as instruções do nutricionista. Nos dados da conta do próprio
        nutricionista, o MetaNutri é o controlador.
      </p>

      <h2>Que dados guardamos e para quê</h2>
      <ul>
        <li>Nome, e-mail e senha de quem usa: para criar e manter a conta. A senha é guardada cifrada.</li>
        <li>Plano assinado, data e versão dos termos aceitos: para cobrar certo e provar o aceite.</li>
        <li>Dados do paciente (nome, sexo, idade, medidas, restrições e condições clínicas): para calcular o plano alimentar.</li>
        <li>Missões marcadas pelo paciente e as datas: para mostrar a adesão ao nutricionista.</li>
      </ul>
      <p>
        Os dados de saúde são dados pessoais sensíveis. Eles são tratados para a tutela da saúde por profissional de saúde e com o consentimento do
        paciente, colhido pelo nutricionista (LGPD, art. 11).
      </p>

      <h2>Onde os dados ficam</h2>
      <ul>
        <li>Os planos e as fichas de paciente ficam salvos neste aparelho, no navegador de quem usa.</li>
        <li>
          A conta, a assinatura, a cópia na nuvem e as missões do link do paciente ficam na Supabase, que hospeda o banco de dados do MetaNutri. Os
          servidores podem ficar fora do Brasil.
        </li>
        <li>O pagamento acontece no Mercado Pago. Nenhum dado de cartão passa pelo MetaNutri.</li>
        <li>Os e-mails de confirmação e de troca de senha são enviados pelo Resend.</li>
      </ul>
      <p>Não vendemos dados, não usamos para publicidade e não treinamos modelos de inteligência artificial com eles.</p>

      <h2>Por quanto tempo</h2>
      <p>
        Enquanto a conta existir. Depois do pedido de exclusão, os dados na nuvem são apagados em até {PRAZO_EXCLUSAO_DIAS} dias, salvo obrigação legal de
        guardar. O que está neste aparelho some quando você usa "Apagar tudo", em Configurações.
      </p>

      <h2>Seus direitos</h2>
      <p>
        Quem usa o MetaNutri e cada paciente podem pedir confirmação, acesso, correção, anonimização, portabilidade e eliminação dos dados, e revogar o
        consentimento (LGPD, art. 18). O paciente pode pedir ao nutricionista ou direto pelo {CONTATO_EMAIL}. Respondemos em até 15 dias.
      </p>

      <h2>Segurança</h2>
      <p>
        Acesso por senha, conexão cifrada e separação por conta no banco: um nutricionista não alcança os dados de outro. O link de missões usa um endereço
        secreto e mostra só as missões daquele paciente. Se houver incidente de segurança, o nutricionista é avisado em até {PRAZO_INCIDENTE_HORAS} horas.
      </p>

      <h2>Mudanças</h2>
      <p>Quando esta política mudar de forma relevante, avisamos por e-mail e a data no topo muda.</p>
    </DocumentoLegal>
  )
}
```

- [ ] **Passo 5: `TelaTermos.tsx`**

```tsx
import { CONTATO_EMAIL, PRAZO_EXCLUSAO_DIAS, RESPONSAVEL } from '@/domain/legal.ts'
import { DocumentoLegal } from './DocumentoLegal.tsx'

/** Termos de uso (spec estilo-spora, CA-222). Escritos sem advogado, por decisão do dono (R-14). */
export function TelaTermos() {
  return (
    <DocumentoLegal titulo="Termos de uso">
      <h2>O que é o MetaNutri</h2>
      <p>
        Um programa de planejamento alimentar para nutricionistas: monta o plano, mostra o que falta de vitaminas e minerais, sugere alimentos e acompanha o
        paciente por missões diárias. É oferecido por {RESPONSAVEL}.
      </p>

      <h2>Quem prescreve é o nutricionista</h2>
      <p>
        O MetaNutri calcula e sugere; quem prescreve é o nutricionista, que confere cada número antes de entregar ao paciente. A prescrição de dieta é
        privativa de nutricionista com registro no CRN (Lei 8.234/1991). Os cálculos seguem tabelas públicas (TACO, DRI, OMS) e ainda não foram conferidos
        por nutricionista.
      </p>

      <h2>Os dados dos pacientes</h2>
      <p>
        O nutricionista é o controlador dos dados dos pacientes e o MetaNutri é o operador (LGPD, art. 39). Cabe ao nutricionista colher o consentimento do
        paciente antes de registrar os dados dele. O MetaNutri não usa esses dados para nenhuma finalidade própria. Detalhes na Política de privacidade.
      </p>

      <h2>Conta</h2>
      <ul>
        <li>Cada conta é de uma pessoa. Não compartilhe a senha.</li>
        <li>Os planos ficam salvos no aparelho. Guarde o backup, em Configurações, para não depender de um só aparelho.</li>
        <li>Se outra conta entrar no mesmo aparelho, ela não vê os seus dados: precisa sair ou apagar os dados do aparelho.</li>
      </ul>

      <h2>Planos e pagamento</h2>
      <ul>
        <li>Solo e Pro são assinaturas no Mercado Pago, pagas com cartão, no ciclo mensal ou anual, e renovam sozinhas.</li>
        <li>Para cancelar, cancele a assinatura no Mercado Pago. O plano pago vale até o fim do período já pago.</li>
        <li>Quem entrou no preço de fundador mantém esse preço enquanto a assinatura estiver ativa.</li>
        <li>O plano só muda quando o pagamento é confirmado.</li>
      </ul>

      <h2>Plano Estudante</h2>
      <p>
        Para estudante de nutrição, com conta criada com o e-mail da faculdade. Vale 12 meses e é de uso não comercial: serve para o estágio, sob supervisão,
        não para atender por conta própria. O PDF sai marcado e a tela do paciente avisa que não é atendimento profissional.
      </p>

      <h2>Encerramento</h2>
      <p>
        Você pode parar de usar quando quiser. Peça a exclusão da conta pelo {CONTATO_EMAIL}: os dados na nuvem são apagados em até {PRAZO_EXCLUSAO_DIAS} dias.
        Contas usadas para fraude ou para atender sem registro no CRN, fora do plano Estudante, podem ser encerradas.
      </p>

      <h2>Limites</h2>
      <p>
        O MetaNutri é oferecido como está, sem garantia de funcionar sem interrupção. Não respondemos por decisão clínica tomada com base nele sem a
        conferência do nutricionista. Estes termos seguem a lei brasileira.
      </p>

      <h2>Contato</h2>
      <p>{CONTATO_EMAIL}</p>
    </DocumentoLegal>
  )
}
```

- [ ] **Passo 6: rodar e ver passar**

Rode: `npx vitest run src/ui/publico/legal.test.tsx`
Esperado: PASS.

- [ ] **Passo 7: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/ui/publico/DocumentoLegal.tsx src/ui/publico/TelaTermos.tsx src/ui/publico/TelaPrivacidade.tsx src/ui/publico/legal.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(legal): termos de uso e política de privacidade`.

### Tarefa 22: Checkout

Cobre CA-157 a CA-165 e CB-43. Cobre também o item 3 do foco de revisão.

**Arquivos:**
- Criar: `src/ui/publico/TelaCheckout.tsx`
- Criar: `src/ui/publico/TelaCheckout.test.tsx`

**Interfaces:**
- Consome: `SeletorSegmentado` e `Button` (Tarefa 4); `AvisoFormulario` (Tarefa 17); `valorNoCiclo`, `descontoAnualPct`, `mensalizadoDoAnual`, `planoPorId` e `VAGAS_PRECO_FUNDADOR`; `Assinatura`.
- Produz: `TelaCheckout({ plano: PlanoPago; ciclo: Ciclo; email: string; assinaturaAtual: Assinatura; vagasRestantes: number | null; disponivel: boolean; aoTrocar: (p: PlanoPago, c: Ciclo) => void; aoPagar: (p: PlanoPago, c: Ciclo) => Promise<string | null>; aoIrParaPainel: () => void; aoIrParaInicio: () => void })`

- [ ] **Passo 1: escrever os testes que falham**

`src/ui/publico/TelaCheckout.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SEM_ASSINATURA, type Assinatura } from '@/domain/assinatura.ts'
import type { Ciclo } from '@/domain/conta.ts'
import type { PlanoPago } from '../navegacao.ts'
import { TelaCheckout } from './TelaCheckout.tsx'

function montar(sobre: { plano?: PlanoPago; ciclo?: Ciclo; vagas?: number | null; assinatura?: Assinatura; aoPagar?: () => Promise<string | null> } = {}) {
  const props = {
    plano: sobre.plano ?? ('solo' as const),
    ciclo: sobre.ciclo ?? ('mensal' as const),
    email: 'maria@exemplo.com',
    assinaturaAtual: sobre.assinatura ?? SEM_ASSINATURA,
    vagasRestantes: sobre.vagas === undefined ? 186 : sobre.vagas,
    disponivel: true,
    aoTrocar: vi.fn(),
    aoPagar: vi.fn(sobre.aoPagar ?? (async () => null)),
    aoIrParaPainel: vi.fn(),
    aoIrParaInicio: vi.fn(),
  }
  render(<TelaCheckout {...props} />)
  return { ...props, usuario: userEvent.setup() }
}

describe('TelaCheckout', () => {
  it('CA-157: passo 2 de 3, escolha do ciclo e do plano, o que inclui e o resumo', () => {
    montar()
    expect(screen.getByRole('heading', { level: 1, name: 'Revise sua assinatura' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Período de cobrança' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Plano' })).toBeInTheDocument()
    expect(screen.getAllByText('25 pacientes ativos').length).toBeGreaterThan(0)
    const resumo = screen.getByRole('region', { name: 'Resumo' })
    expect(resumo).toHaveTextContent('maria@exemplo.com')
    expect(resumo).toHaveTextContent('R$ 34,90')
  })

  it('CA-158: trocar o ciclo ou o plano avisa quem manda', async () => {
    const { usuario, aoTrocar } = montar()
    await usuario.click(screen.getByRole('radio', { name: /Anual/ }))
    expect(aoTrocar).toHaveBeenCalledWith('solo', 'anual')
    await usuario.click(screen.getByRole('radio', { name: /Pro/ }))
    expect(aoTrocar).toHaveBeenCalledWith('pro', 'mensal')
  })

  it('CA-159: no anual, mostra o ano, quanto sai por mês e o desconto', () => {
    montar({ ciclo: 'anual' })
    expect(screen.getByRole('region', { name: 'Resumo' })).toHaveTextContent('R$ 299,00')
    expect(screen.getByText(/Sai R\$ 24,92 por mês/)).toBeInTheDocument()
    expect(screen.getByText('−29%')).toBeInTheDocument()
  })

  it('CA-160: vagas de fundador sobrando mostram a contagem', () => {
    montar({ vagas: 186 })
    expect(screen.getByText(/Restam 186 de 200 vagas/)).toBeInTheDocument()
  })

  it('CA-160: sem contagem do servidor, o aviso aparece sem número', () => {
    montar({ vagas: null })
    expect(screen.getByText(/Preço de fundador/)).toBeInTheDocument()
    expect(screen.queryByText(/Restam/)).not.toBeInTheDocument()
  })

  it('CA-160: vagas esgotadas somem com o aviso', () => {
    montar({ vagas: 0 })
    expect(screen.queryByText(/Preço de fundador/)).not.toBeInTheDocument()
  })

  it('CA-161: pagar manda o plano e o ciclo', async () => {
    const { usuario, aoPagar } = montar({ plano: 'pro', ciclo: 'anual' })
    await usuario.click(screen.getByRole('button', { name: 'Pagar com Mercado Pago' }))
    expect(aoPagar).toHaveBeenCalledWith('pro', 'anual')
  })

  it('CA-162: erro de cobrança aparece e o botão volta', async () => {
    const { usuario } = montar({ aoPagar: async () => 'O Mercado Pago não aceitou agora.' })
    await usuario.click(screen.getByRole('button', { name: 'Pagar com Mercado Pago' }))
    expect(screen.getByRole('alert')).toHaveTextContent('O Mercado Pago não aceitou agora.')
    expect(screen.getByRole('button', { name: 'Pagar com Mercado Pago' })).toBeEnabled()
  })

  it('CA-163: quem já assina não vê o botão de pagar', () => {
    montar({ assinatura: { ...SEM_ASSINATURA, plano: 'solo', planoPedido: 'solo', status: 'ativa' } })
    expect(screen.queryByRole('button', { name: 'Pagar com Mercado Pago' })).not.toBeInTheDocument()
    expect(screen.getByText(/Você já tem uma assinatura ativa: Solo/)).toBeInTheDocument()
  })

  it('CA-165: explica que o pagamento termina no Mercado Pago, com cartão', () => {
    montar()
    expect(screen.getByText(/Nenhum dado de cartão passa pelo MetaNutri/)).toBeInTheDocument()
  })

  it('CB-43: clique duplo em pagar vai ao Mercado Pago uma vez só', async () => {
    let terminar: (v: string | null) => void = () => undefined
    const { usuario, aoPagar } = montar({ aoPagar: () => new Promise((resolver) => (terminar = resolver)) })
    await usuario.dblClick(screen.getByRole('button', { name: 'Pagar com Mercado Pago' }))
    terminar(null)
    expect(aoPagar).toHaveBeenCalledTimes(1)
  })

  it('quem tem Estudante ativa vê o aviso de que ele deixa de valer, e o botão de pagar continua', () => {
    montar({ assinatura: { ...SEM_ASSINATURA, plano: 'estudante', planoPedido: 'estudante', status: 'ativa' } })
    expect(screen.getByRole('status')).toHaveTextContent('Você está no plano Estudante. Ao assinar, ele deixa de valer, e até o pagamento confirmar vale o Free.')
    expect(screen.getByRole('button', { name: 'Pagar com Mercado Pago' })).toBeInTheDocument()
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/publico/TelaCheckout.test.tsx`
Esperado: FAIL.

- [ ] **Passo 3: `TelaCheckout.tsx`**

```tsx
import { Check, LockKeyhole, Star } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Assinatura } from '@/domain/assinatura.ts'
import { descontoAnualPct, mensalizadoDoAnual, planoPorId, VAGAS_PRECO_FUNDADOR, valorNoCiclo, type Ciclo } from '@/domain/conta.ts'
import { cn } from '@/lib/utils'
import { Logo } from '@ds/componentes/display/Logo.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'
import type { PlanoPago } from '../navegacao.ts'
import { AvisoFormulario } from './conta/AvisoFormulario.tsx'

interface TelaCheckoutProps {
  readonly plano: PlanoPago
  readonly ciclo: Ciclo
  readonly email: string
  readonly assinaturaAtual: Assinatura
  readonly vagasRestantes: number | null
  readonly disponivel: boolean
  readonly aoTrocar: (plano: PlanoPago, ciclo: Ciclo) => void
  readonly aoPagar: (plano: PlanoPago, ciclo: Ciclo) => Promise<string | null>
  readonly aoIrParaPainel: () => void
  readonly aoIrParaInicio: () => void
}

const PAGOS: readonly PlanoPago[] = ['solo', 'pro']
const reais = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Revisar e pagar (spec estilo-spora, US-1.8; mockup conta e checkout v1). */
export function TelaCheckout({ plano, ciclo, email, assinaturaAtual, vagasRestantes, disponivel, aoTrocar, aoPagar, aoIrParaPainel, aoIrParaInicio }: TelaCheckoutProps) {
  const [erro, setErro] = useState<string | null>(null)
  const [pagando, setPagando] = useState(false)
  const pagandoRef = useRef(false)

  const escolhido = planoPorId(plano)
  if (!escolhido) return null

  const total = valorNoCiclo(escolhido, ciclo)
  const desconto = descontoAnualPct(escolhido)
  const jaAssina = assinaturaAtual.status === 'ativa' && (assinaturaAtual.plano === 'solo' || assinaturaAtual.plano === 'pro')
  // O servidor troca a linha para "pendente" assim que a assinatura é aberta: quem está
  // no Estudante precisa saber, antes de pagar, que ele deixa de valer na hora (CB-controlador).
  const estudanteAtivo = assinaturaAtual.status === 'ativa' && assinaturaAtual.plano === 'estudante'

  const pagar = async () => {
    if (pagandoRef.current) return
    pagandoRef.current = true
    setPagando(true)
    setErro(null)
    const mensagem = await aoPagar(plano, ciclo)
    pagandoRef.current = false
    setPagando(false)
    if (mensagem) setErro(mensagem)
  }

  return (
    <div className="min-h-dvh bg-background px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-[1100px]">
        <button
          type="button"
          onClick={aoIrParaInicio}
          aria-label="MetaNutri, início"
          className="mb-6 inline-flex min-h-11 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo tamanho={26} />
        </button>

        <div className="grid overflow-hidden rounded-2xl bg-card lg:grid-cols-[1.25fr_0.9fr]">
          <main className="flex flex-col gap-5 p-6 sm:p-9">
            <ol aria-label="Etapas" className="flex gap-4 text-xs font-semibold text-muted-foreground">
              <li className="text-successtext">✓ Conta</li>
              <li aria-current="step" className="text-heading">
                2 Plano
              </li>
              <li>3 Pagamento</li>
            </ol>
            <h1 className="text-3xl font-bold">Revise sua assinatura</h1>

            <SeletorSegmentado
              rotulo="Período de cobrança"
              valor={ciclo}
              aoEscolher={(c) => aoTrocar(plano, c)}
              opcoes={[
                { valor: 'mensal', rotulo: 'Mensal' },
                { valor: 'anual', rotulo: <>Anual{desconto > 0 ? <span className="text-acento">{`−${desconto}%`}</span> : null}</> },
              ]}
            />

            <div role="radiogroup" aria-label="Plano" className="grid gap-3 sm:grid-cols-2">
              {PAGOS.map((id) => {
                const p = planoPorId(id)
                if (!p) return null
                const marcado = id === plano
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={marcado}
                    onClick={() => aoTrocar(id, ciclo)}
                    className={cn(
                      'flex flex-col gap-1 rounded-3xl p-4 text-left ring-1 ring-inset transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      marcado ? 'ring-2 ring-primary' : 'ring-border hover:ring-primary/50',
                    )}
                  >
                    <span className="font-semibold text-heading">{p.nome}</span>
                    <span className="font-titulo text-2xl font-bold text-heading">
                      R$ {reais(valorNoCiclo(p, ciclo))} <span className="font-sans text-xs font-semibold text-muted-foreground">{ciclo === 'anual' ? '/ano' : '/mês'}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {ciclo === 'anual' ? `Sai R$ ${reais(mensalizadoDoAnual(p))} por mês. ` : ''}
                      {p.recursos[0]}
                    </span>
                  </button>
                )
              })}
            </div>

            {vagasRestantes === 0 ? null : (
              <div className="flex items-start gap-3 rounded-xl bg-acentoclaro p-4 text-sm">
                <span className="grid size-8 shrink-0 place-content-center rounded-full bg-acentofundo text-textoacento">
                  <Star className="size-4" aria-hidden="true" />
                </span>
                <p>
                  <strong>Preço de fundador.</strong> Enquanto a assinatura estiver ativa, esse valor não sobe.
                  {vagasRestantes !== null ? ` Restam ${vagasRestantes} de ${VAGAS_PRECO_FUNDADOR} vagas.` : ''}
                </p>
              </div>
            )}

            <ul className="flex flex-col gap-2 text-sm">
              {[...escolhido.recursos, 'Cancele quando quiser'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </main>

          <section aria-label="Resumo" className="flex flex-col gap-4 bg-surfacerow p-6 sm:p-9">
            <p className="rotulo">Resumo</p>
            <dl className="flex flex-col gap-2.5 rounded-3xl bg-card p-5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Plano</dt>
                <dd className="font-semibold text-heading">{escolhido.nome}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Cobrança</dt>
                <dd className="font-semibold text-heading">{ciclo === 'anual' ? 'Anual' : 'Mensal'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Conta</dt>
                <dd className="truncate font-semibold text-heading">{email}</dd>
              </div>
              <div className="mt-1 flex items-end justify-between gap-3 border-t border-border pt-3">
                <dt className="text-muted-foreground">Total hoje</dt>
                <dd className="font-titulo text-3xl font-bold text-heading">R$ {reais(total)}</dd>
              </div>
            </dl>

            {!disponivel ? (
              <AvisoFormulario tipo="erro">A conta na nuvem não está configurada neste MetaNutri.</AvisoFormulario>
            ) : jaAssina ? (
              <>
                <AvisoFormulario tipo="ok">
                  Você já tem uma assinatura ativa: {planoPorId(assinaturaAtual.plano)?.nome}. A troca de plano pago ainda não é feita pelo site.
                </AvisoFormulario>
                <Button size="lg" block onClick={aoIrParaPainel}>
                  Ir para o painel
                </Button>
              </>
            ) : (
              <>
                {estudanteAtivo ? (
                  <AvisoFormulario tipo="ok">Você está no plano Estudante. Ao assinar, ele deixa de valer, e até o pagamento confirmar vale o Free.</AvisoFormulario>
                ) : null}
                <Button variant="laranja" size="lg" block loading={pagando} onClick={() => void pagar()}>
                  Pagar com Mercado Pago
                </Button>
              </>
            )}

            {erro ? <AvisoFormulario tipo="erro">{erro}</AvisoFormulario> : null}

            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Você termina o pagamento no site do Mercado Pago, com cartão. Nenhum dado de cartão passa pelo MetaNutri. Depois você volta para cá sozinho.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
```

Os hooks (`useState`, `useRef`) ficam antes do `return null`: a ordem é obrigatória. Se o nome acessível do botão virar "Pagar com Mercado Pago" com a roda de carregando, o `Button` já põe `aria-busy`: o nome não muda.

- [ ] **Passo 4: rodar e ver passar**

Rode: `npx vitest run src/ui/publico/TelaCheckout.test.tsx`
Esperado: PASS.

- [ ] **Passo 5: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/ui/publico/TelaCheckout.tsx src/ui/publico/TelaCheckout.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(cobranca): checkout com ciclo, plano, fundador e resumo`.

### Tarefa 23: Volta do pagamento

Cobre CA-166 a CA-170. Cobre também o item 5 do foco de revisão.

**Arquivos:**
- Criar: `src/ui/publico/TelaVoltaPagamento.tsx`
- Criar: `src/ui/publico/TelaVoltaPagamento.test.tsx`

**Interfaces:**
- Consome: `respostaDaVolta` e `Assinatura` (Tarefa 5); `ehPlanoPago` e `PlanoPago` (Tarefa 6).
- Produz: `TelaVoltaPagamento({ assinatura: Assinatura; carregado: boolean; recarregar: () => void; aoIrParaPainel: () => void; aoTentarDeNovo: (plano: PlanoPago) => void })`, com as constantes `INTERVALO_MS = 10_000` e `LIMITE_MS = 600_000`.

- [ ] **Passo 1: escrever os testes que falham**

`src/ui/publico/TelaVoltaPagamento.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SEM_ASSINATURA, type Assinatura } from '@/domain/assinatura.ts'
import { TelaVoltaPagamento } from './TelaVoltaPagamento.tsx'

const assinatura = (sobre: Partial<Assinatura>): Assinatura => ({ ...SEM_ASSINATURA, ...sobre })

function montar(a: Assinatura, carregado = true) {
  const props = { assinatura: a, carregado, recarregar: vi.fn(), aoIrParaPainel: vi.fn(), aoTentarDeNovo: vi.fn() }
  const tela = render(<TelaVoltaPagamento {...props} />)
  return { ...props, ...tela }
}

describe('TelaVoltaPagamento', () => {
  afterEach(() => {
    vi.useRealTimers()
    Reflect.deleteProperty(globalThis.navigator, 'onLine')
  })

  it('enquanto confere, diz isso', () => {
    montar(SEM_ASSINATURA, false)
    expect(screen.getByRole('heading', { level: 1, name: /Conferindo o pagamento/ })).toBeInTheDocument()
  })

  it('CA-166: assinatura ativa, com o nome do plano', async () => {
    const { aoIrParaPainel } = montar(assinatura({ plano: 'solo', planoPedido: 'solo', status: 'ativa' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Assinatura ativa' })).toBeInTheDocument()
    expect(screen.getByText(/Seu plano agora é o Solo/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Ir para o painel' }))
    expect(aoIrParaPainel).toHaveBeenCalledOnce()
  })

  it('CA-167: em análise confere de 10 em 10 segundos e, passados 10 minutos, oferece conferir de novo', () => {
    vi.useFakeTimers()
    const pendente = assinatura({ planoPedido: 'solo', status: 'pendente' })
    const { recarregar, rerender } = montar(pendente)
    expect(screen.getByRole('heading', { level: 1, name: 'Pagamento em análise' })).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(10_000))
    expect(recarregar).toHaveBeenCalledTimes(1)

    vi.setSystemTime(Date.now() + 10 * 60_000)
    rerender(<TelaVoltaPagamento assinatura={{ ...pendente }} carregado recarregar={recarregar} aoIrParaPainel={vi.fn()} aoTentarDeNovo={vi.fn()} />)
    act(() => vi.advanceTimersByTime(10_000))
    expect(screen.getByRole('button', { name: 'Conferir de novo' })).toBeInTheDocument()
  })

  it('CA-168: quando confirma, a tela muda sozinha', () => {
    const { rerender, recarregar } = montar(assinatura({ planoPedido: 'pro', status: 'pendente' }))
    rerender(
      <TelaVoltaPagamento assinatura={assinatura({ plano: 'pro', planoPedido: 'pro', status: 'ativa' })} carregado recarregar={recarregar} aoIrParaPainel={vi.fn()} aoTentarDeNovo={vi.fn()} />,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Assinatura ativa' })).toBeInTheDocument()
  })

  it('CA-169: não concluído avisa que nada foi cobrado e reabre o mesmo plano', async () => {
    const { aoTentarDeNovo } = montar(assinatura({ planoPedido: 'pro', status: 'cancelada' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Pagamento não concluído' })).toBeInTheDocument()
    expect(screen.getByText(/Nada foi cobrado/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(aoTentarDeNovo).toHaveBeenCalledWith('pro')
  })

  it('CA-170: sem internet, avisa e deixa conferir de novo', async () => {
    Object.defineProperty(globalThis.navigator, 'onLine', { value: false, configurable: true })
    const { recarregar } = montar(assinatura({ planoPedido: 'solo', status: 'pendente' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Não consegui conferir' })).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Conferir de novo' }))
    expect(recarregar).toHaveBeenCalled()
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/publico/TelaVoltaPagamento.test.tsx`
Esperado: FAIL.

- [ ] **Passo 3: `TelaVoltaPagamento.tsx`**

```tsx
import { Check, Clock, WifiOff, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { respostaDaVolta, type Assinatura } from '@/domain/assinatura.ts'
import { planoPorId } from '@/domain/conta.ts'
import { cn } from '@/lib/utils'
import { Logo } from '@ds/componentes/display/Logo.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { ehPlanoPago, type PlanoPago } from '../navegacao.ts'

interface TelaVoltaPagamentoProps {
  readonly assinatura: Assinatura
  readonly carregado: boolean
  readonly recarregar: () => void
  readonly aoIrParaPainel: () => void
  readonly aoTentarDeNovo: (plano: PlanoPago) => void
}

const INTERVALO_MS = 10_000
const LIMITE_MS = 10 * 60_000

function Cartao({ selo, tom, titulo, children }: { readonly selo: ReactNode; readonly tom: 'ok' | 'analise' | 'erro' | 'neutro'; readonly titulo: string; readonly children: ReactNode }) {
  const cores = { ok: 'bg-lightsuccess text-successtext', analise: 'bg-lightwarning text-warningtext', erro: 'bg-lighterror text-errortext', neutro: 'bg-surfacerow text-muted-foreground' }
  return (
    <div className="min-h-dvh bg-background px-4 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto flex max-w-[560px] flex-col gap-4 rounded-2xl bg-card p-7 sm:p-10">
        <Logo tamanho={24} />
        <span className={cn('grid size-12 place-content-center rounded-full [&_svg]:size-6', cores[tom])} aria-hidden="true">
          {selo}
        </span>
        <h1 className="text-3xl font-bold">{titulo}</h1>
        {children}
      </div>
    </div>
  )
}

/** A volta do Mercado Pago (spec estilo-spora, US-1.9). O plano só muda com a confirmação do servidor. */
export function TelaVoltaPagamento({ assinatura, carregado, recarregar, aoIrParaPainel, aoTentarDeNovo }: TelaVoltaPagamentoProps) {
  const [inicio, setInicio] = useState(() => Date.now())
  const [esgotou, setEsgotou] = useState(false)
  const resposta = respostaDaVolta(assinatura)
  const semInternet = globalThis.navigator?.onLine === false

  // CA-167: enquanto está em análise, confere de novo a cada 10 s, por até 10 minutos.
  useEffect(() => {
    if (!carregado || resposta !== 'analise' || esgotou || semInternet) return
    const relogio = globalThis.setTimeout(() => {
      if (Date.now() - inicio >= LIMITE_MS) setEsgotou(true)
      else recarregar()
    }, INTERVALO_MS)
    return () => globalThis.clearTimeout(relogio)
  }, [carregado, resposta, esgotou, semInternet, inicio, recarregar, assinatura])

  const conferirDeNovo = () => {
    setInicio(Date.now())
    setEsgotou(false)
    recarregar()
  }

  if (semInternet) {
    return (
      <Cartao selo={<WifiOff />} tom="neutro" titulo="Não consegui conferir">
        <p className="text-sm text-muted-foreground">Parece que você está sem internet. Assim que voltar, confira de novo.</p>
        <Button size="lg" block onClick={conferirDeNovo}>
          Conferir de novo
        </Button>
      </Cartao>
    )
  }

  if (!carregado) {
    return (
      <Cartao selo={<Clock />} tom="neutro" titulo="Conferindo o pagamento…">
        <p role="status" className="text-sm text-muted-foreground">
          Um instante.
        </p>
      </Cartao>
    )
  }

  if (resposta === 'ativa') {
    return (
      <Cartao selo={<Check />} tom="ok" titulo="Assinatura ativa">
        <p className="text-sm text-muted-foreground">Seu plano agora é o {planoPorId(assinatura.plano)?.nome}. Já dá para usar tudo o que ele inclui.</p>
        <Button size="lg" block onClick={aoIrParaPainel}>
          Ir para o painel
        </Button>
      </Cartao>
    )
  }

  if (resposta === 'analise') {
    return (
      <Cartao selo={<Clock />} tom="analise" titulo="Pagamento em análise">
        <p className="text-sm text-muted-foreground">Alguns pagamentos levam uns minutos para confirmar. Até lá, vale o Free. Esta tela confere sozinha.</p>
        {esgotou ? (
          <Button size="lg" block onClick={conferirDeNovo}>
            Conferir de novo
          </Button>
        ) : null}
        <Button variant="outline" size="lg" block onClick={aoIrParaPainel}>
          Ir para o painel
        </Button>
      </Cartao>
    )
  }

  return (
    <Cartao selo={<X />} tom="erro" titulo="Pagamento não concluído">
      <p className="text-sm text-muted-foreground">Nada foi cobrado. Você pode tentar de novo.</p>
      <Button size="lg" block onClick={() => aoTentarDeNovo(ehPlanoPago(assinatura.planoPedido) ? assinatura.planoPedido : 'solo')}>
        Tentar de novo
      </Button>
      <Button variant="outline" size="lg" block onClick={aoIrParaPainel}>
        Ir para o painel
      </Button>
    </Cartao>
  )
}
```

O `assinatura` entra nas dependências do efeito de propósito. Cada resposta nova do servidor, mesmo ainda pendente, arma o próximo relógio.

- [ ] **Passo 4: rodar e ver passar**

Rode: `npx vitest run src/ui/publico/TelaVoltaPagamento.test.tsx`
Esperado: PASS.

- [ ] **Passo 5: verificar tudo e fazer o commit**

Rode: `npm run check`. O lint pode pedir para as constantes exportadas saírem do arquivo do componente (`react-refresh/only-export-components`: é aviso, não erro). Se virar erro, tire o `export` das duas constantes.

```bash
git add src/ui/publico/TelaVoltaPagamento.tsx src/ui/publico/TelaVoltaPagamento.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(cobranca): tela de volta do pagamento que confere sozinha`.

---

## Onda 1 · Montagem e publicação

### Tarefa 24: Montagem no App: rotas, portão da conta e dono dos dados

Cobre CA-137, CA-142, CA-148 a CA-154, CB-40, CB-41, CB-42 e CB-49. Liga no `App` as telas das Tarefas 18 a 23. Cobre também o item 2 do foco de revisão.

**Arquivos:**
- Criar: `src/ui/publico/conta/TelaOutraConta.tsx`
- Alterar: `src/App.tsx`
- Criar: `src/AppConta.test.tsx`

**Interfaces:**
- Consome: tudo das Tarefas 5 a 23.
- Produz: `TelaOutraConta({ email: string; aoSair: () => void; aoApagar: () => void })`

- [ ] **Passo 1: escrever os testes que falham**

`src/AppConta.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App.tsx'
import { CHAVE_DONO } from './domain/donoDosDados.ts'
import { CHAVE_AVISO_VISTO } from './ui/casos/AvisoPrimeiroAcesso.tsx'
import type { ValorConta } from './ui/estado/usarConta.ts'
import { contaFalsa } from './ui/publico/conta/contaFalsa.test-utils.ts'
import { ProvedorTema } from './ui/tema/ProvedorTema.tsx'

const estado = vi.hoisted(() => ({ conta: null as unknown }))

vi.mock('./ui/estado/usarConta.ts', () => ({ useConta: () => estado.conta }))
vi.mock('./ui/estado/usarAssinatura.ts', () => ({
  useAssinatura: () => ({
    assinatura: { plano: 'free', planoPedido: 'free', status: 'sem-assinatura', precoTravado: false, expiraEm: null },
    carregado: true,
    carregando: false,
    vagasRestantes: 186,
    assinar: vi.fn(),
    recarregar: vi.fn(),
  }),
}))

const comSessao = (id: string): ValorConta => contaFalsa({ sessao: { id, email: `${id}@exemplo.com`, nome: 'Maria' } })
const tela = () => (
  <ProvedorTema>
    <App />
  </ProvedorTema>
)

describe('App com a conta ligada (spec estilo-spora)', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(CHAVE_AVISO_VISTO, '1')
    window.location.hash = ''
    estado.conta = contaFalsa()
  })

  it('CA-148 e CA-137: tela de trabalho sem sessão mostra Entrar, e abre sozinha quando a sessão chega', () => {
    window.location.hash = '#/pacientes'
    const { rerender } = render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByText('Entre para continuar de onde parou.')).toBeInTheDocument()

    estado.conta = comSessao('conta-1')
    rerender(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Pacientes' })).toBeInTheDocument()
  })

  it('CA-149: termos abrem sem sessão', () => {
    window.location.hash = '#/termos'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Termos de uso' })).toBeInTheDocument()
  })

  it('CA-150: sem servidor, o app abre no modo local', () => {
    estado.conta = contaFalsa({ disponivel: false })
    window.location.hash = '#/pacientes'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Pacientes' })).toBeInTheDocument()
  })

  it('CA-151: a primeira conta adota os dados do aparelho', () => {
    localStorage.setItem('metanutri:casos', '[]')
    estado.conta = comSessao('conta-1')
    window.location.hash = '#/painel'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
    expect(localStorage.getItem(CHAVE_DONO)).toBe('conta-1')
  })

  it('CA-152 e CA-153: outra conta não vê nada, e apagar pede confirmação antes', async () => {
    localStorage.setItem(CHAVE_DONO, 'conta-1')
    localStorage.setItem('metanutri:casos', '["x"]')
    localStorage.setItem('metanutri:caso:x', '{}')
    estado.conta = comSessao('conta-2')
    window.location.hash = '#/painel'
    render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Este aparelho tem dados de outra conta' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1, name: 'Painel' })).not.toBeInTheDocument()

    const usuario = userEvent.setup()
    await usuario.click(screen.getByRole('button', { name: 'Apagar os dados deste aparelho e continuar' }))
    expect(localStorage.getItem('metanutri:casos')).toBe('["x"]')
    await usuario.click(screen.getByRole('button', { name: 'Apagar e continuar' }))
    expect(localStorage.getItem('metanutri:casos')).toBeNull()
    expect(localStorage.getItem('metanutri:caso:x')).toBeNull()
    expect(localStorage.getItem(CHAVE_DONO)).toBe('conta-2')
  })

  it('CA-164: checkout sem sessão pede para entrar; com sessão, abre', () => {
    window.location.hash = '#/assinar/solo/anual'
    const { rerender } = render(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    estado.conta = comSessao('conta-1')
    rerender(tela())
    expect(screen.getByRole('heading', { level: 1, name: 'Revise sua assinatura' })).toBeInTheDocument()
  })

  it('CB-49: o link do paciente abre sem pedir entrada', () => {
    window.location.hash = '#/missoes/abc123'
    render(tela())
    expect(screen.queryByRole('heading', { level: 1, name: 'Entrar' })).not.toBeInTheDocument()
  })

  it('CA-117: Começar grátis leva ao cadastro com o Free', async () => {
    window.location.hash = '#/inicio'
    render(tela())
    await userEvent.setup().click(screen.getAllByRole('button', { name: /Começar grátis/ })[0] as HTMLElement)
    expect(window.location.hash).toBe('#/criar-conta')
    expect(screen.getByRole('heading', { level: 1, name: 'Crie sua conta' })).toBeInTheDocument()
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/AppConta.test.tsx`
Esperado: FAIL (não há portão nem as rotas novas).

- [ ] **Passo 3: `TelaOutraConta.tsx`**

```tsx
import { useState } from 'react'
import { Button } from '@ds/componentes/forms/button.tsx'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { MolduraConta } from './MolduraConta.tsx'

interface TelaOutraContaProps {
  readonly email: string
  readonly aoSair: () => void
  readonly aoApagar: () => void
}

/**
 * Outra conta entrou num aparelho que já tem dono (spec estilo-spora, CA-152 e CA-153).
 * Nenhum plano ou paciente aparece antes da escolha, e apagar pede confirmação.
 */
export function TelaOutraConta({ email, aoSair, aoApagar }: TelaOutraContaProps) {
  const [confirmando, setConfirmando] = useState(false)
  return (
    <MolduraConta
      titulo="Este aparelho tem dados de outra conta"
      subtitulo={`Você entrou como ${email}. Os planos e pacientes guardados aqui são de outra conta e, por isso, não aparecem.`}
      aoIrParaInicio={aoSair}
    >
      {confirmando ? (
        <AvisoFormulario tipo="erro">
          <p>Vão ser apagados deste aparelho os planos, pacientes, produtos, modelos e acompanhamentos da outra conta. Não tem volta, a menos que exista um backup.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="destructive" size="sm" onClick={aoApagar}>
              Apagar e continuar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirmando(false)}>
              Voltar
            </Button>
          </div>
        </AvisoFormulario>
      ) : (
        <div className="flex flex-col gap-3">
          <Button size="lg" block onClick={aoSair}>
            Sair e entrar com a outra conta
          </Button>
          <Button variant="outline" size="lg" block onClick={() => setConfirmando(true)}>
            Apagar os dados deste aparelho e continuar
          </Button>
        </div>
      )}
    </MolduraConta>
  )
}
```

- [ ] **Passo 4: `App.tsx`, os ganchos**

1. Acrescente os imports:

```tsx
import { useEffect, useState } from 'react'
import { apagarDadosDoAparelho, registrarDono, situacaoAoEntrar } from './domain/donoDosDados.ts'
import { armazenamentoLocal } from './ui/estado/armazenamentoLocal.ts'
import { destinoDepoisDoCadastro, guardarDestino } from './ui/fluxoConta.ts'
import { ehRotaLivre } from './ui/navegacao.ts'
import { TelaConfirmarEmail } from './ui/publico/conta/TelaConfirmarEmail.tsx'
import { TelaCriarConta } from './ui/publico/conta/TelaCriarConta.tsx'
import { TelaEsqueciSenha } from './ui/publico/conta/TelaEsqueciSenha.tsx'
import { TelaNovaSenha } from './ui/publico/conta/TelaNovaSenha.tsx'
import { TelaOutraConta } from './ui/publico/conta/TelaOutraConta.tsx'
import { TelaCheckout } from './ui/publico/TelaCheckout.tsx'
import { TelaPrivacidade } from './ui/publico/TelaPrivacidade.tsx'
import { TelaTermos } from './ui/publico/TelaTermos.tsx'
import { TelaVoltaPagamento } from './ui/publico/TelaVoltaPagamento.tsx'
```

(junte com os imports que já existem de `./ui/fluxoConta.ts`, `./ui/navegacao.ts` e `./ui/estado/armazenamentoLocal.ts`, sem repetir).

2. Troque `const { assinatura } = useAssinatura(conta.sessao !== null)` por:

```tsx
  const cobranca = useAssinatura(conta.sessao !== null)
  const { assinatura } = cobranca
  const [emailPendente, setEmailPendente] = useState<string | null>(null)
  const arm = armazenamentoLocal()

  // Dono dos dados do aparelho (spec estilo-spora, D-24): quem entra primeiro adota;
  // outra conta não vê nada até escolher (CA-151 e CA-152).
  const sessao = conta.sessao
  const situacao = sessao ? situacaoAoEntrar(arm, sessao.id) : 'mesmo'
  useEffect(() => {
    if (sessao && situacao === 'adotar') registrarDono(armazenamentoLocal(), sessao.id)
  }, [sessao, situacao])
```

Todos esses ganchos ficam antes do primeiro `return` do componente, que é o da rota `missoes`.

- [ ] **Passo 5: `App.tsx`, o portão e as rotas novas**

Logo depois do bloco `if (rota.tela === 'missoes') { ... }`, acrescente:

```tsx
  // Portão da conta (CA-148): com servidor, tela de trabalho pede sessão. O login
  // aparece no lugar da tela pedida, e ela abre sozinha quando a sessão chega (CA-137).
  if (conta.disponivel && !ehRotaLivre(rota)) {
    if (conta.carregando) {
      return (
        <div role="status" className="grid min-h-dvh place-content-center bg-background text-sm text-muted-foreground">
          Carregando…
        </div>
      )
    }
    if (!sessao) {
      return (
        <TelaEntrar
          conta={conta}
          pedidoPorTela
          aoEntrou={() => undefined}
          aoCriarConta={() => navegar(rotaCriarConta(null, 'mensal'))}
          aoEsqueci={() => navegar({ tela: 'esqueci-senha' })}
          aoIrParaInicio={() => navegar({ tela: 'inicio' })}
          aoAbrirSistema={() => navegar({ tela: 'painel' })}
        />
      )
    }
    if (situacao === 'conflito') {
      return (
        <TelaOutraConta
          email={sessao.email}
          aoSair={() => void conta.sair().then(() => navegar({ tela: 'inicio' }))}
          aoApagar={() => {
            apagarDadosDoAparelho(arm)
            registrarDono(arm, sessao.id)
            // Os provedores leram os dados antigos ao montar: recarregar é o jeito seguro de esquecê-los.
            globalThis.location.reload()
          }}
        />
      )
    }
  }

  if (rota.tela === 'criar-conta') {
    const ciclo = rota.ciclo ?? 'mensal'
    return (
      <TelaCriarConta
        conta={conta}
        plano={rota.plano ?? null}
        ciclo={ciclo}
        aoCriada={(criada) => {
          const destino = destinoDepoisDoCadastro(criada.plano, ciclo)
          if (!criada.confirmarEmail) return navegar(destino)
          // O link do e-mail pode ser aberto em outra aba: o destino fica no aparelho.
          guardarDestino(arm, destino)
          setEmailPendente(criada.email)
          navegar({ tela: 'confirmar-email' })
        }}
        aoEntrar={() => navegar({ tela: 'entrar' })}
        aoTrocarPlano={() => navegar({ tela: 'precos' })}
        aoIrParaInicio={() => navegar({ tela: 'inicio' })}
        aoAbrirSistema={() => navegar({ tela: 'painel' })}
      />
    )
  }

  if (rota.tela === 'confirmar-email') {
    return (
      <TelaConfirmarEmail
        conta={conta}
        email={emailPendente}
        vencido={rota.vencido === true}
        aoIrParaInicio={() => navegar({ tela: 'inicio' })}
        aoEntrar={() => navegar({ tela: 'entrar' })}
      />
    )
  }

  if (rota.tela === 'esqueci-senha') {
    return <TelaEsqueciSenha conta={conta} aoIrParaInicio={() => navegar({ tela: 'inicio' })} aoEntrar={() => navegar({ tela: 'entrar' })} />
  }

  if (rota.tela === 'nova-senha') {
    return (
      <TelaNovaSenha
        conta={conta}
        vencido={rota.vencido === true}
        aoSenhaTrocada={() => navegar({ tela: 'painel' })}
        aoPedirOutro={() => navegar({ tela: 'esqueci-senha' })}
        aoIrParaInicio={() => navegar({ tela: 'inicio' })}
      />
    )
  }

  if (rota.tela === 'termos' || rota.tela === 'privacidade') {
    return (
      <MolduraPublica atual={rota.tela} temSessao={sessao !== null} aoIrPara={irPara}>
        {rota.tela === 'termos' ? <TelaTermos /> : <TelaPrivacidade />}
      </MolduraPublica>
    )
  }

  if (rota.tela === 'assinar') {
    return (
      <TelaCheckout
        plano={rota.plano}
        ciclo={rota.ciclo}
        email={sessao?.email ?? ''}
        assinaturaAtual={assinatura}
        vagasRestantes={cobranca.vagasRestantes}
        disponivel={conta.disponivel}
        aoTrocar={(plano, ciclo) => navegar({ tela: 'assinar', plano, ciclo })}
        aoPagar={cobranca.assinar}
        aoIrParaPainel={() => navegar({ tela: 'painel' })}
        aoIrParaInicio={() => navegar({ tela: 'inicio' })}
      />
    )
  }

  if (rota.tela === 'pagamento') {
    return (
      <TelaVoltaPagamento
        assinatura={assinatura}
        carregado={cobranca.carregado}
        recarregar={cobranca.recarregar}
        aoIrParaPainel={() => navegar({ tela: 'painel' })}
        aoTentarDeNovo={(plano) => navegar({ tela: 'assinar', plano, ciclo: 'mensal' })}
      />
    )
  }
```

`TelaEntrar` aqui é a da Tarefa 19, já importada de `./ui/publico/conta/TelaEntrar.tsx`. O bloco da rota `entrar` continua depois deste, como a Tarefa 19 deixou.

- [ ] **Passo 6: rodar e ver passar**

Rode: `npx vitest run src/AppConta.test.tsx src/App.test.tsx`
Esperado: PASS nos dois. O `App.test.tsx` antigo continua passando porque, sem servidor nos testes, o portão fica desligado (CA-150). Se o jsdom imprimir "Not implemented: navigation" no teste do CA-153, é o `location.reload()`: é esperado e não falha o teste.

- [ ] **Passo 7: verificar tudo e fazer o commit**

Rode: `npm run check` e `npx playwright test`.

```bash
git add src/ui/publico/conta/TelaOutraConta.tsx src/App.tsx src/AppConta.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): conta obrigatória, dono dos dados e rotas de conta e pagamento no App`.

### Tarefa 25: Conta e plano, e o limite que leva a Preços

Cobre CA-156, CA-176, CA-177, CA-178, CA-189 (parte) e CA-191.

**Arquivos:**
- Alterar: `src/ui/fluxoConta.ts` (+ teste): `rotaDePlanos`
- Alterar: `src/ui/conta/TelaConta.tsx`
- Criar: `src/ui/conta/TelaConta.test.tsx`
- Alterar: `src/ui/missoes/CartaoLinkMissoes.tsx`, `src/ui/missoes/TelaAdesao.tsx`
- Alterar: `src/App.tsx`

**Interfaces:**
- Consome: `planoSeguinte` (Tarefa 5).
- Produz:
  - `rotaDePlanos(atual: IdPlano): Rota`, que é Preços com o plano seguinte em destaque
  - `TelaConta` com a prop nova `aoSaiu: () => void`
  - `CartaoLinkMissoes` e `TelaAdesao` com a prop nova `aoVerPlanos?: () => void`

- [ ] **Passo 1: escrever os testes que falham**

No fim de `src/ui/fluxoConta.test.ts` (acrescente `rotaDePlanos` ao import):

```ts
describe('limite leva a Preços (CA-177)', () => {
  it('abre Preços com o plano seguinte em destaque', () => {
    expect(rotaDePlanos('free')).toEqual({ tela: 'precos', destaque: 'solo' })
    expect(rotaDePlanos('solo')).toEqual({ tela: 'precos', destaque: 'pro' })
    expect(rotaDePlanos('clinica')).toEqual({ tela: 'precos' })
  })
})
```

`src/ui/conta/TelaConta.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Assinatura } from '@/domain/assinatura.ts'
import { contaFalsa } from '../publico/conta/contaFalsa.test-utils.ts'
import { TelaConta } from './TelaConta.tsx'

const estado = vi.hoisted(() => ({
  assinatura: { plano: 'free', planoPedido: 'free', status: 'sem-assinatura', precoTravado: false, expiraEm: null } as Assinatura,
}))
vi.mock('../estado/usarAssinatura.ts', () => ({ useAssinatura: () => ({ assinatura: estado.assinatura }) }))

function montar() {
  const conta = contaFalsa({ sessao: { id: 'u1', email: 'maria@usp.br', nome: 'Maria' } })
  const props = { conta, aoEntrar: vi.fn(), aoVerPrecos: vi.fn(), aoIrParaConfig: vi.fn(), aoAssinar: vi.fn(), aoSaiu: vi.fn() }
  render(<TelaConta {...props} />)
  return { ...props, usuario: userEvent.setup() }
}

describe('TelaConta', () => {
  it('CA-156: sair leva para fora da área de trabalho', async () => {
    const { usuario, conta, aoSaiu } = montar()
    await usuario.click(screen.getByRole('button', { name: 'Sair' }))
    expect(conta.sair).toHaveBeenCalledOnce()
    expect(aoSaiu).toHaveBeenCalledOnce()
  })

  it('CA-176: no Free, explica como entra o plano Estudante', () => {
    montar()
    expect(screen.getByText(/O plano Estudante vale para conta criada com o e-mail da faculdade/)).toBeInTheDocument()
  })

  it('CA-191: no Estudante, mostra até quando vale', () => {
    estado.assinatura = { plano: 'estudante', planoPedido: 'estudante', status: 'ativa', precoTravado: false, expiraEm: '2027-09-28T12:00:00Z' }
    montar()
    expect(screen.getByText('Vale até 28/09/2027.')).toBeInTheDocument()
  })
})
```

- [ ] **Passo 2: rodar e ver falhar**

Rode: `npx vitest run src/ui/fluxoConta.test.ts src/ui/conta/TelaConta.test.tsx`
Esperado: FAIL.

- [ ] **Passo 3: `rotaDePlanos` em `src/ui/fluxoConta.ts`**

Acrescente `planoSeguinte` ao import de `@/domain/conta.ts` e, no fim do arquivo:

```ts
/** Do aviso de limite para Preços, com o plano seguinte em destaque (CA-177). */
export function rotaDePlanos(atual: IdPlano): Rota {
  const seguinte = planoSeguinte(atual)
  return seguinte ? { tela: 'precos', destaque: seguinte } : { tela: 'precos' }
}
```

- [ ] **Passo 4: `TelaConta.tsx`**

1. Acrescente `readonly aoSaiu: () => void` às props e receba `aoSaiu`.
2. Troque `sair` por:

```tsx
  const sair = async () => {
    setSaindo(true)
    await conta.sair()
    setSaindo(false)
    aoSaiu()
  }
```

3. Logo depois do bloco que mostra o nome e o preço do plano (a `div` com `BadgeCheck`), acrescente:

```tsx
        {assinatura.plano === 'estudante' && assinatura.expiraEm ? (
          <p className="text-sm text-muted-foreground">{`Vale até ${new Date(assinatura.expiraEm).toLocaleDateString('pt-BR')}.`}</p>
        ) : null}

        {assinatura.plano === 'free' ? (
          <p className="rounded-xl bg-surfacerow p-4 text-sm text-foreground">
            <strong className="font-semibold text-heading">Estudante de nutrição?</strong> O plano Estudante vale para conta criada com o e-mail da faculdade e é
            liberado sozinho quando o e-mail é confirmado.
          </p>
        ) : null}
```

Se o teste do CA-191 falhar por fuso (a data aparecer como 27/09), passe `{ timeZone: 'UTC' }` para `toLocaleDateString`.

- [ ] **Passo 5: aviso de limite com "Ver planos"**

Em `src/ui/missoes/CartaoLinkMissoes.tsx`, acrescente à interface:

```tsx
  /** Leva a Preços quando o limite de links acaba (CA-177). */
  readonly aoVerPlanos?: (() => void) | undefined
```

receba `aoVerPlanos` na função e troque o `<p>` do limite por:

```tsx
              <div className="mt-4 rounded-xl border border-statelow/40 bg-lightwarning p-3 text-sm text-warningtext">
                <p>
                  Você usou {planoAtual?.limiteLinksPaciente} de {planoAtual?.limiteLinksPaciente} links de missões do seu plano. Apague um acompanhamento em
                  Adesão ou mude de plano para gerar outro.
                </p>
                {aoVerPlanos ? (
                  <Button size="sm" variant="outline" className="mt-2" onClick={aoVerPlanos}>
                    Ver planos
                  </Button>
                ) : null}
              </div>
```

Em `src/ui/missoes/TelaAdesao.tsx`, acrescente a mesma prop `aoVerPlanos` e, dentro do cartão "Pacientes ativos", logo depois do último `<p>`:

```tsx
          {limite.excedeu && aoVerPlanos ? (
            <Button size="sm" variant="outline" className="mt-2" onClick={aoVerPlanos}>
              Ver planos
            </Button>
          ) : null}
```

Nada é apagado nem escondido: só o botão novo aparece (CA-178).

- [ ] **Passo 6: `App.tsx`**

Na `TelaConta`, acrescente `aoSaiu={() => navegar({ tela: 'inicio' })}`. Na `TelaAdesao` e no `CartaoLinkMissoes`, acrescente `aoVerPlanos={() => navegar(rotaDePlanos(assinatura.plano))}` (importe `rotaDePlanos` de `./ui/fluxoConta.ts`).

- [ ] **Passo 7: rodar e ver passar**

Rode: `npx vitest run src/ui/fluxoConta.test.ts src/ui/conta/TelaConta.test.tsx src/ui/missoes`
Esperado: PASS.

- [ ] **Passo 8: verificar tudo e fazer o commit**

Rode: `npm run check`.

```bash
git add src/ui/fluxoConta.ts src/ui/fluxoConta.test.ts src/ui/conta/TelaConta.tsx src/ui/conta/TelaConta.test.tsx src/ui/missoes/CartaoLinkMissoes.tsx src/ui/missoes/TelaAdesao.tsx src/App.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `feat(conta): sair leva ao site, Estudante explicado e limite que leva a Preços`.

### Tarefa 26: e2e da conta, documentação e publicação

Cobre CA-120 e CB-48 nas telas novas, CB-47 (conferência) e a entrega da Onda 1.

**Arquivos:**
- Criar: `e2e/conta.spec.ts`
- Alterar: `README.md`, `docs/decisoes.md`, `docs/pendencias.md`

- [ ] **Passo 1: escrever o e2e**

`e2e/conta.spec.ts` (sem Supabase: `playwright.config.ts` desliga o servidor, Tarefa 1):

```ts
import { expect, test } from '@playwright/test'

test.describe('Caminhos da conta sem servidor (spec estilo-spora)', () => {
  test('CA-122: Assinar Solo no anual leva ao cadastro com o Solo anual marcado', async ({ page }) => {
    await page.goto('/#/precos')
    await page.getByRole('radio', { name: /Anual/ }).click()
    await page.getByRole('button', { name: 'Assinar Solo' }).first().click()
    await expect(page).toHaveURL(/#\/criar-conta\/solo\/anual$/)
    await expect(page.getByText('Plano escolhido')).toBeVisible()
    await expect(page.getByText(/R\$ 299/)).toBeVisible()
    await expect(page.getByRole('img', { name: 'Passo 1 de 3' })).toBeVisible()
  })

  test('CA-117: Começar grátis na landing leva ao cadastro do Free', async ({ page }) => {
    await page.goto('/#/inicio')
    await page.getByRole('banner').getByRole('button', { name: 'Começar grátis' }).click()
    await expect(page).toHaveURL(/#\/criar-conta$/)
    await expect(page.getByText('No Free você já tem')).toBeVisible()
  })

  test('CA-150: sem servidor, o cadastro explica e abre o sistema', async ({ page }) => {
    await page.goto('/#/criar-conta')
    await page.getByRole('button', { name: 'Abrir o sistema' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Painel' })).toBeVisible()
  })

  for (const rota of ['/#/criar-conta/solo', '/#/entrar', '/#/assinar/pro/anual', '/#/termos']) {
    test(`CB-48: ${rota} cabe em 360 px sem rolagem para o lado`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 })
      await page.goto(rota)
      const larguras = await page.evaluate(() => ({ documento: document.documentElement.scrollWidth, janela: window.innerWidth }))
      expect(larguras.documento).toBeLessThanOrEqual(larguras.janela)
    })
  }
})
```

- [ ] **Passo 2: rodar**

Rode: `npx playwright test`
Esperado: todos os e2e passam, os antigos e os novos. Se um teste de 360 px falhar, ache o elemento largo pelo trace (`npx playwright show-trace`) e ponha `min-w-0` ou `break-words` nele.

- [ ] **Passo 3: conferência visual nos dois temas (CB-47)**

Com `npm run dev`, abra `#/inicio`, `#/precos`, `#/criar-conta/solo/anual`, `#/entrar`, `#/assinar/solo/anual` e `#/termos` no tema claro e no escuro (seletor de tema no menu do app ou `prefers-color-scheme`). Confira que nenhum texto some no escuro e que a composição de pratos continua legível. Tire uma captura de cada uma e junte ao relatório da tarefa. Corrija o que estiver ilegível antes de seguir.

- [ ] **Passo 4: README (o que fica com o usuário)**

Acrescente ao `README.md` a seção:

```md
## Ligar conta, e-mail e pagamento (Onda 1 do estilo novo)

O site já pede conta. Para os e-mails e o pagamento funcionarem de verdade:

1. **Supabase > Authentication > URL Configuration.** Em *Site URL*, ponha `https://matheusrv0.github.io/metanutri/`.
   Em *Redirect URLs*, acrescente `https://matheusrv0.github.io/metanutri/**` e, para testar em casa, `http://localhost:5173/**`.
2. **Resend.** Crie a conta e o domínio de envio, gere uma chave e ligue em *Supabase > Authentication > SMTP Settings*
   (host `smtp.resend.com`, porta 465, usuário `resend`, senha = a chave). Sem isso, o Supabase manda poucos e-mails por hora.
3. **SQL do Estudante.** Antes, confira em *Authentication > Sign In / Providers > Email* que **Confirm email** está LIGADO:
   desligado, qualquer um que digitar um e-mail de faculdade ganha o Estudante sem ter a caixa de entrada.
   Depois rode `supabase/005-estudante.sql` no SQL Editor e confira com as consultas que estão no fim do próprio arquivo
   (e-mails de teste que devem dar verdadeiro e falso). Para aceitar uma faculdade que falta, acrescente o domínio em
   `COMPLEMENTO`, no `scripts/dominios-faculdades.mjs`, rode o script e rode o SQL de novo.
4. **Mercado Pago.** Crie a aplicação, guarde o token em *Edge Functions > Secrets* como `MERCADOPAGO_ACCESS_TOKEN`,
   o segredo do webhook como `MERCADOPAGO_WEBHOOK_SECRET` e `SITE_URL` = `https://matheusrv0.github.io/metanutri/`.
   Publique as duas funções (`supabase functions deploy assinar` e `supabase functions deploy webhook-mercadopago`)
   e cadastre o webhook apontando para a `webhook-mercadopago`. Teste o anual no ambiente de teste antes de abrir.
```

- [ ] **Passo 5: decisões e pendências**

Em `docs/decisoes.md`, acrescente uma entrada datada de 28/09/2026 que resume D-20 a D-31 da spec `specs/estilo-spora/SPEC.md`, em uma linha cada, e aponta para ela. Em `docs/pendencias.md`, atualize a data do topo e acrescente um bloco "Atualizado em 28/09" dizendo que a Onda 1 está no ar e que faltam os quatro passos do README (seção nova), mais as Ondas 2 e 3 da spec, com plano próprio.

- [ ] **Passo 6: verificar tudo e fazer o commit**

Rode: `npm run check` e `npx playwright test`.

```bash
git add e2e/conta.spec.ts README.md docs/decisoes.md docs/pendencias.md
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

Mensagem: `docs: como ligar conta, e-mail e pagamento, e o e2e dos caminhos da conta`.

- [ ] **Passo 7: publicar (pedido do usuário: cada onda vai ao ar e é testada)**

```bash
git push
gh workflow run publicar.yml --ref main
gh run watch "$(gh run list --workflow=publicar.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
```

Esperado: o fluxo termina verde. Depois, abra `https://matheusrv0.github.io/metanutri/#/inicio` num navegador (MCP do Playwright) e confira três coisas: a landing nova, `#/painel` pedindo para entrar e `#/criar-conta/solo/anual` com o Solo anual marcado. Mande ao usuário as capturas da landing e do checkout.

---

## Cobertura da spec (Onda 1)

| Critérios | Tarefa |
|---|---|
| CA-100, CA-101 | 1 |
| CA-102, CA-103 (conferência na 26) | 2, 26 |
| CA-104 | regra global; conferida na revisão de cada tarefa de tela |
| CA-105 | já existe (lint) |
| CA-106 a CA-110 | 3, 4 |
| CA-111 | 10, 15 |
| CA-112 a CA-120, CA-116a | 14, 15, 26 |
| CA-121 a CA-126 | 16 (destinos na 7) |
| CA-127 a CA-134a | 18 (regras na 5) |
| CA-135 a CA-139 | 19, 24 |
| CA-140 a CA-147 | 8, 12, 20 |
| CA-148 a CA-156 | 9, 19, 24, 25 |
| CA-157 a CA-165 | 11, 13, 22, 24 |
| CA-166 a CA-170 | 5, 8, 23 |
| CA-171 a CA-176 | 10, 12, 18, 25 |
| CA-177, CA-178 | 5, 16, 25 |
| CA-189 (parte), CA-190, CA-191 | 13, 25 |
| CA-220 a CA-224 | 12, 14, 21 |
| CB-40 a CB-49 | 24 (CB-40 a CB-42, CB-49), 22 (CB-43), 11 (CB-44, o preço vem do servidor), 12 (CB-45), 24 (CB-46: landing sem sessão), 26 (CB-47, CB-48) |

Ficam para os planos das Ondas 2 e 3: CA-179 a CA-219, com exceção de CA-190 e CA-191, que já entram aqui.
