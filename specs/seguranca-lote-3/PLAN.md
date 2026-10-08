# Segurança, lote 3 · Plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar este plano tarefa por tarefa. Os passos usam caixa (`- [ ]`) para acompanhar.

**Objetivo:** cadastro, Entrar, "Esqueci a senha" e "Reenviar o código" passam a levar a verificação contra robôs do Cloudflare Turnstile, que o Supabase confere no servidor. Ela fica escondida e só aparece, logo acima do botão, quando o Cloudflare pede um clique.

**Arquitetura:** um módulo novo, `src/ui/publico/conta/turnstile.ts`, põe o script do Cloudflare na página uma vez só (o mesmo jeito do script do pagamento em `processadorMercadoPago.ts`) e lê a chave pública do build. Um gancho, `usarVerificacao.ts`, desenha o widget de forma explícita, guarda o token e o entrega uma vez só, já pedindo outro (D-115). Um componente, `VerificacaoContraRobos.tsx`, põe a caixa do widget logo acima do botão de cada tela. `useConta` ganha um último argumento opcional, `captchaToken`, nos quatro pedidos que o Supabase confere, e traduz a recusa da verificação conforme o pedido levou ou não o token (CA-460 ou CA-461). Se o script do Cloudflare não carregar, ou o widget falhar, o clique envia sem o token (D-119). Sem a chave pública, nada disso aparece e os pedidos saem como hoje (CA-463).

**Stack:** React 18 + TypeScript strict + Vite + Tailwind v4 · supabase-js 2.116 · Vitest + Testing Library · Playwright. Nenhum pacote novo: o script do Turnstile é carregado da página do Cloudflare, sem npm.

**Spec:** `specs/seguranca-lote-3/SPEC.md` (D-113 a D-119, CA-454 a CA-464, CB-116 a CB-119, R-43 a R-45), aprovada pelo dono em 07/10/2026 e emendada no mesmo dia com o D-119 e o CA-461 novo (commit 85d8f04).

## Restrições globais (Global Constraints)

**Frases da tela (copiadas da spec, sem mudar nada)**
- CA-458: `Espere a verificação de segurança terminar.`
- CA-460: `Não deu para confirmar que é você. Tente de novo.`
- CA-461 (só depois de o servidor recusar, por falta da verificação, um pedido que foi **sem** o token): `A verificação de segurança não carregou. Confira a internet ou desative o bloqueador e recarregue a página.`
- CA-464 (Política de privacidade, seção "Onde os dados ficam"): `Nas telas de conta, o Cloudflare Turnstile recebe dados técnicos do navegador, como o endereço IP, para separar pessoas de robôs.`

**Verificação (D-113 a D-119, conferido pelo controlador em 07/10/2026)**
- Levam a verificação: cadastro (`signUp`), Entrar (`signInWithPassword`), "Esqueci a senha" (`resetPasswordForEmail`) e "Reenviar o código" (`resend` na tela de confirmar o e-mail; `resetPasswordForEmail` na tela do código da senha).
- Nunca levam: conferir o código de 8 dígitos (`verifyOtp`), gravar a senha nova (`updateUser`) e renovar a sessão (CA-457).
- No supabase-js: `options: { captchaToken }` em `signUp`, `signInWithPassword` e `resend`; `{ redirectTo, captchaToken }` em `resetPasswordForEmail`. A recusa chega como erro com o código `captcha_failed` (mensagem `captcha protection: request disallowed (...)`).
- Script: `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`, só nas telas de conta, uma vez por página.
- Widget: `sitekey` de `VITE_TURNSTILE_SITE_KEY`; `action` por tela (`signup`, `login`, `recuperar`, `reenviar`); `appearance: 'interaction-only'` (D-114); `language: 'pt-br'`; tema do site; `refresh-expired: 'auto'`; `reset(widgetId)` a cada token entregue (D-115); `remove(widgetId)` ao sair da tela (CB-119).
- Cada token vale um pedido só (D-115).
- Enquanto o script carrega ou o Cloudflare confere (sem falha ainda), o clique mostra a frase do CA-458 e nada sai.
- Script que não carrega (rede, bloqueador, Cloudflare fora) ou widget que falha: o clique **envia sem o token** (D-119), e a tela não mostra aviso antes da resposta. Se o servidor recusar por falta da verificação (`captcha_failed`) um pedido que foi sem o token, a tela mostra a frase do CA-461; num pedido que foi com o token, a do CA-460. Com o captcha desligado no Supabase, o pedido sem token passa: desligar o captcha no painel basta para o login voltar (R-43).
- Sem a chave (vazia ou `desligado`): nada aparece, nenhum script é pedido e os pedidos saem exatamente como hoje (CA-463).
- A **chave secreta** nunca entra no código, no chat nem no repositório: o dono a cola só no painel do Supabase, depois do site novo no ar (D-116).
- A chave de teste do Cloudflare que sempre aprova, `1x00000000000000000000AA`, só aparece como valor nos testes de unidade. Nenhum teste (unidade ou navegador) carrega o script de verdade (R-45).

**Código**
- Nenhuma dependência nova. Nada de `any` nem `as any`; nada de `!` (ESLint strict).
- TypeScript ligado: `exactOptionalPropertyTypes` (opcional entra por spread condicional), `noUncheckedIndexedAccess`, `verbatimModuleSyntax` (tipo entra com `import type` ou `type` no import).
- Componentes funcionais, um por arquivo, export nomeado.
- Regras do React Compiler no ESLint: nada de `setState` síncrono no corpo de efeito; `ref.current` só em manipulador, em `.then`/`.catch`, em callback do Turnstile e na limpeza do efeito.
- Toque mínimo de 44 px: os botões das telas já são `size="lg"`; o widget é do Cloudflare.

**Texto**
- Tudo que a pessoa vê em português do Brasil, com acento, curto, sem slogan, sem ponto de exclamação. A tela não cita o Cloudflare; a Política cita (D-118); comentário e docs podem citar.
- O repositório é **público**: comentário, teste, doc e mensagem de commit dizem o que o sistema faz.

**Processo**
- TDD: o teste de cada passo é escrito e visto falhar antes do código.
- Toda tarefa termina com `npm run check` verde (lint + typecheck + testes). As Tarefas 5 e 7 rodam também o Playwright.
- Um teste por critério de aceite, com o ID no nome (`CA-454` … `CA-464`, `CB-116` … `CB-119`).
- Commit em Conventional Commits, em português. A mensagem vai num arquivo UTF-8 **sem BOM** `../_msg.txt` (fora do repositório; escreva com a ferramenta de arquivo, não com `Out-File`/`Set-Content` do PowerShell 5.1), terminando com uma linha em branco e `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Comando: `git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt`. Branch `feat/seguranca-lote-3` (já existe).
- O `.env.local` tem `VITE_SUPABASE_ANON_KEY` em branco de propósito. Não mexa nele.
- Antes de rodar o Playwright, feche qualquer `vite preview` aberto na porta 4173: o Playwright reaproveita um servidor aberto, com o build antigo.
- **Nenhum deploy dentro das tarefas**: nem site, nem painel do Supabase. Quem faz é o dono, com a ordem da Tarefa 7.
- Faltou algo no plano: pare e escreva a suposição em "Decisões do plano" antes de seguir.

## Foco de revisão (Review Focus)

Cinco situações que a spec não cobre com critério próprio e que mais podem pegar quem usa, cada uma com o teste na tarefa dona do código:

1. **Clicar com o formulário incompleto não pode gastar a verificação:** a validação vem antes; senão a tentativa certa, logo depois, cairia no "Espere a verificação de segurança terminar." sem motivo (Tarefa 4, teste "Foco: …" em `TelaCriarConta.test.tsx`).
2. **A chave no `.env.local` desta máquina não pode ligar a verificação nos testes:** o widget aceita `localhost`, então o dono pode pôr a chave ali; os testes de unidade e de navegador continuam sem ela (Tarefa 1, teste "Foco: …" em `turnstile.test.ts`).
3. **O Turnstile que recusa desenhar o widget** (chave com formato errado, caixa inválida) não pode quebrar a tela nem travar o botão: conta como script que não carregou, e o clique segue sem a verificação (D-119) (Tarefa 3, teste "Foco: …").
4. **A resposta atrasada de um widget que já saiu** (a pessoa saiu da tela e voltou) não vale para a tela nova (Tarefa 3, teste "Foco: …").
5. **O tema do site muda com a tela aberta** (o aparelho troca para o escuro à noite): o widget é desenhado de novo no tema novo, e continua um só (Tarefa 3, teste "Foco: …").

---

## Ordem e dependências

| # | Tarefa | Depende de |
|---|---|---|
| 1 | O script e a chave da verificação (`turnstile.ts`, build e testes sem a chave) | — |
| 2 | Os pedidos de conta levam a verificação (`useConta` e as frases) | — |
| 3 | A verificação na tela (gancho, componente e o Turnstile de mentira) | 1, 2 |
| 4 | Entrar e Criar conta | 3 |
| 5 | Esqueci a senha, Confirmar o e-mail e o Código da senha | 3 |
| 6 | Política de privacidade e versão dos termos | — |
| 7 | Documentação e validação final | 1 a 6 |

As Tarefas 1, 2 e 6 não dependem de nada. A 3 anda depois da 1 e da 2; a 4 e a 5, depois da 3.

## Mapa de arquivos

| Arquivo | Tarefa | O que faz |
|---|---|---|
| `src/ui/publico/conta/turnstile.ts` (novo) | 1 | `URL_DO_TURNSTILE`, os tipos do widget, `carregarTurnstile`, `esquecerTurnstile`, `chaveDaVerificacao`, `tamanhoDoWidget`, `temaDoWidget` |
| `src/ui/publico/conta/turnstile.test.ts` (novo) | 1 | o script uma vez só, a falha, a chave, o tamanho, o tema, o build e os testes sem a chave |
| `vite.config.ts` | 1 | `test.env`: os testes de unidade começam com a verificação desligada |
| `playwright.config.ts` | 1 | o build dos testes de navegador sai sem a chave |
| `.github/workflows/publicar.yml` | 1 | o build publicado recebe `VITE_TURNSTILE_SITE_KEY` da variável do GitHub |
| `src/domain/conta.ts` + `conta.test.ts` | 2 | três `ErroConta` novos e as frases do CA-458, CA-460 e CA-461 |
| `src/ui/estado/usarConta.ts` + `usarConta.test.ts` | 2 | `captchaToken` nos quatro pedidos; `captcha_failed` vira `verificacao-recusada` com token e `verificacao-nao-carregou` sem token, também na troca de senha |
| `src/ui/publico/conta/usarVerificacao.ts` (novo) | 3 | `useVerificacao`: desenha, guarda o token, entrega uma vez e renova; sem o script ou com o widget em falha, libera o pedido sem token |
| `src/ui/publico/conta/VerificacaoContraRobos.tsx` (novo) | 3 | a caixa do widget logo acima do botão |
| `src/ui/publico/conta/turnstileFalso.test-utils.ts` (novo) | 3 | o Turnstile de mentira dos testes |
| `src/ui/publico/conta/VerificacaoContraRobos.test.tsx` (novo) | 3 | CA-458, CA-459, CA-461 a CA-463, D-119, CB-116, CB-118, CB-119 e três focos, numa tela mínima |
| `src/ui/publico/conta/TelaEntrar.tsx` + teste | 4 | ação `login` |
| `src/ui/publico/conta/TelaCriarConta.tsx` + teste | 4 | ação `signup` |
| `src/ui/publico/conta/TelaEsqueciSenha.tsx` | 5 | ação `recuperar` |
| `src/ui/publico/conta/TelaConfirmarEmail.tsx` | 5 | ação `reenviar`, acima de "Reenviar o código" |
| `src/ui/publico/conta/TelaCodigoSenha.tsx` | 5 | ação `reenviar`, acima de "Reenviar o código" |
| `src/ui/publico/conta/senha.test.tsx` | 5 | os testes das três telas |
| `e2e/conta.spec.ts` | 5 | nenhuma tela de conta pede o script sem a chave |
| `src/domain/legal.ts` + `legal.test.ts` | 6 | versão dos termos `2026-10-07` (D-118) |
| `src/ui/publico/TelaPrivacidade.tsx`, `src/ui/publico/legal.test.tsx` | 6 | o item do Turnstile em "Onde os dados ficam" (CA-464) |
| `README.md`, `docs/pendencias.md`, `docs/decisoes.md`, `.env.example` | 7 | registro, ordem para pôr no ar e como desligar (D-116, D-119, R-43) |

---

### Tarefa 1: O script e a chave da verificação

Cobre o carregamento do D-113, a chave do D-117, o lado do build do CA-463 e do R-45, e as funções puras do CA-462 e do CB-118.

**Files:**
- Create: `src/ui/publico/conta/turnstile.ts`
- Create: `src/ui/publico/conta/turnstile.test.ts`
- Modify: `vite.config.ts:52-62` (o bloco `test`)
- Modify: `playwright.config.ts:23-25`
- Modify: `.github/workflows/publicar.yml:42-45`

**Interfaces:**
- Consumes: nada.
- Produces (`src/ui/publico/conta/turnstile.ts`, nomes exatos):
  - `export const URL_DO_TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'`
  - `export type AcaoDaVerificacao = 'signup' | 'login' | 'recuperar' | 'reenviar'`
  - `export type TamanhoDoWidget = 'flexible' | 'compact'`
  - `export type TemaDoWidget = 'light' | 'dark' | 'auto'`
  - `export interface OpcoesDoWidget` com `sitekey`, `action`, `appearance: 'interaction-only'`, `theme`, `language: 'pt-br'`, `size`, `'refresh-expired': 'auto'`, `'response-field': false`, `callback(token: string)`, `'expired-callback'()`, `'error-callback'(codigo: string)`, `'before-interactive-callback'()`
  - `export interface ApiDoTurnstile { render(alvo: HTMLElement, opcoes: OpcoesDoWidget): string | null | undefined; reset(widgetId: string): void; remove(widgetId: string): void }`
  - `export function carregarTurnstile(tempoLimiteMs?: number): Promise<ApiDoTurnstile>`
  - `export function esquecerTurnstile(): void` (só testes)
  - `export function chaveDaVerificacao(): string | null`
  - `export const LARGURA_MINIMA_FLEXIVEL = 300`
  - `export function tamanhoDoWidget(largura: number): TamanhoDoWidget`
  - `export function temaDoWidget(aplicado: 'claro' | 'escuro' | null): TemaDoWidget`

- [ ] **Step 1: Escrever os testes que falham**

Crie `src/ui/publico/conta/turnstile.test.ts`:

```ts
import playwright from '../../../../playwright.config.ts?raw'
import publicar from '../../../../.github/workflows/publicar.yml?raw'
import vite from '../../../../vite.config.ts?raw'
import {
  carregarTurnstile,
  chaveDaVerificacao,
  esquecerTurnstile,
  LARGURA_MINIMA_FLEXIVEL,
  tamanhoDoWidget,
  temaDoWidget,
  URL_DO_TURNSTILE,
  type ApiDoTurnstile,
} from './turnstile.ts'

const API: ApiDoTurnstile = { render: () => 'widget-1', reset: () => undefined, remove: () => undefined }
const scripts = () => document.querySelectorAll<HTMLScriptElement>(`script[src="${URL_DO_TURNSTILE}"]`)

beforeEach(() => {
  esquecerTurnstile()
  for (const script of document.querySelectorAll('script')) script.remove()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('o script da verificação (D-113, R-43)', () => {
  it('R-43: põe o script do Cloudflare uma vez só, com a renderização explícita, e devolve o Turnstile quando ele carrega', async () => {
    const primeiro = carregarTurnstile()
    const segundo = carregarTurnstile()
    expect(URL_DO_TURNSTILE).toBe('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit')
    expect(scripts()).toHaveLength(1)
    expect(scripts()[0]?.async).toBe(true)
    expect(segundo).toBe(primeiro)
    vi.stubGlobal('turnstile', API)
    scripts()[0]?.dispatchEvent(new Event('load'))
    await expect(primeiro).resolves.toBe(API)
  })

  it('CB-119: com o Turnstile já na página, não põe outro script', async () => {
    vi.stubGlobal('turnstile', API)
    await expect(carregarTurnstile()).resolves.toBe(API)
    expect(scripts()).toHaveLength(0)
  })

  it('CA-461: script que não carrega rejeita, sai da página, e a próxima tela de conta tenta de novo', async () => {
    const tentativa = carregarTurnstile()
    scripts()[0]?.dispatchEvent(new Event('error'))
    await expect(tentativa).rejects.toThrow('O script da verificação não carregou.')
    expect(scripts()).toHaveLength(0)
    vi.useFakeTimers()
    void carregarTurnstile().catch(() => undefined)
    expect(scripts()).toHaveLength(1)
  })

  it('CA-461: script que demora demais também desiste', async () => {
    vi.useFakeTimers()
    const tentativa = carregarTurnstile(1000)
    vi.advanceTimersByTime(1000)
    await expect(tentativa).rejects.toThrow()
  })

  it('CA-461: script que carrega sem o Turnstile conta como falha', async () => {
    const tentativa = carregarTurnstile()
    scripts()[0]?.dispatchEvent(new Event('load'))
    await expect(tentativa).rejects.toThrow()
  })
})

describe('a chave pública (D-117, CA-463)', () => {
  it('D-117: a chave vem da variável do build, sem espaço em volta', () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', ' 0xCHAVE_DE_EXEMPLO_DO_SITE ')
    expect(chaveDaVerificacao()).toBe('0xCHAVE_DE_EXEMPLO_DO_SITE')
  })

  it('D-117: a chave de teste do Cloudflare também liga (só como valor, nos testes de unidade)', () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '1x00000000000000000000AA')
    expect(chaveDaVerificacao()).toBe('1x00000000000000000000AA')
  })

  it.each(['', '   ', 'desligado', 'undefined'])('CA-463: com "%s", não há verificação', (valor) => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', valor)
    expect(chaveDaVerificacao()).toBeNull()
  })

  it('Foco: nos testes de unidade, a verificação começa desligada, mesmo com a chave no .env.local desta máquina', () => {
    expect(vite).toContain("env: { VITE_TURNSTILE_SITE_KEY: 'desligado' }")
    expect(chaveDaVerificacao()).toBeNull()
  })

  it('CA-463 e R-45: os testes de navegador montam o site sem a chave', () => {
    expect(playwright).toContain("VITE_TURNSTILE_SITE_KEY: 'desligado'")
  })

  it('D-117: o site publicado recebe a chave pública de uma variável do GitHub, como a do pagamento', () => {
    expect(publicar).toContain('VITE_TURNSTILE_SITE_KEY: ${{ vars.VITE_TURNSTILE_SITE_KEY }}')
    expect(publicar).not.toMatch(/secrets\.[A-Z_]*TURNSTILE/)
  })
})

describe('o jeito do widget (CA-462, CB-118)', () => {
  it.each([
    [0, 'compact'],
    [280, 'compact'],
    [299, 'compact'],
    [300, 'flexible'],
    [432, 'flexible'],
  ] as const)('CB-118: com %i px de largura, o widget é %s', (largura, tamanho) => {
    expect(tamanhoDoWidget(largura)).toBe(tamanho)
  })

  it('CB-118: o flexível começa nos 300 px que o Cloudflare exige', () => {
    expect(LARGURA_MINIMA_FLEXIVEL).toBe(300)
  })

  it.each([
    ['claro', 'light'],
    ['escuro', 'dark'],
    [null, 'auto'],
  ] as const)('CA-462: o tema %s do site vira %s no widget', (aplicado, tema) => {
    expect(temaDoWidget(aplicado)).toBe(tema)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/publico/conta/turnstile.test.ts`
Expected: FAIL, com `Failed to resolve import "./turnstile.ts"` (o módulo ainda não existe).

- [ ] **Step 3: O módulo do Turnstile**

Crie `src/ui/publico/conta/turnstile.ts`:

```ts
// A verificação contra robôs das telas de conta (spec seguranca-lote-3, D-113 a D-117).
//
// O script vem de https://challenges.cloudflare.com/turnstile/v0/api.js, com a renderização
// explícita: carregado uma vez por página, só quando uma tela de conta abre, sem pacote npm
// (o mesmo jeito dos campos do cartão, em ui/pagamento/processadorMercadoPago.ts). O Cloudflare
// devolve um token de uso único, e o Supabase o confere no servidor com a chave secreta, que
// fica só no painel dele. A tela nunca vê a chave secreta.

export const URL_DO_TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

/** O nome de cada pedido no painel do Cloudflare. O Supabase não confere este nome (spec, seção 4). */
export type AcaoDaVerificacao = 'signup' | 'login' | 'recuperar' | 'reenviar'

export type TamanhoDoWidget = 'flexible' | 'compact'

export type TemaDoWidget = 'light' | 'dark' | 'auto'

/** As opções do widget que o MetaNutri usa, escritas à mão (nenhum pacote de tipos). */
export interface OpcoesDoWidget {
  readonly sitekey: string
  readonly action: AcaoDaVerificacao
  /** D-114: escondida; só aparece quando o Cloudflare pede um clique. */
  readonly appearance: 'interaction-only'
  readonly theme: TemaDoWidget
  readonly language: 'pt-br'
  readonly size: TamanhoDoWidget
  /** CB-116: a verificação vencida se renova sozinha. */
  readonly 'refresh-expired': 'auto'
  /** O token vai pelo JavaScript, não por um campo escondido dentro do formulário. */
  readonly 'response-field': false
  readonly callback: (token: string) => void
  readonly 'expired-callback': () => void
  readonly 'error-callback': (codigo: string) => void
  readonly 'before-interactive-callback': () => void
}

/** O pedaço do Turnstile que o MetaNutri usa. */
export interface ApiDoTurnstile {
  render(alvo: HTMLElement, opcoes: OpcoesDoWidget): string | null | undefined
  reset(widgetId: string): void
  remove(widgetId: string): void
}

const apiGlobal = (): ApiDoTurnstile | null => {
  const api: unknown = (globalThis as unknown as { readonly turnstile?: unknown }).turnstile
  if (typeof api !== 'object' || api === null) return null
  return typeof (api as { readonly render?: unknown }).render === 'function' ? (api as ApiDoTurnstile) : null
}

let carregando: Promise<ApiDoTurnstile> | null = null

/** Põe o script na página uma vez só. Se falhar ou demorar demais, a próxima tela de conta tenta de novo (CA-461, CB-119). */
export function carregarTurnstile(tempoLimiteMs = 20_000): Promise<ApiDoTurnstile> {
  const pronta = apiGlobal()
  if (pronta) return Promise.resolve(pronta)
  if (carregando) return carregando
  const minha: Promise<ApiDoTurnstile> = new Promise<ApiDoTurnstile>((resolver, rejeitar) => {
    const script = document.createElement('script')
    const encerrar = () => {
      clearTimeout(relogio)
      script.removeEventListener('error', falhar)
      script.removeEventListener('load', aoCarregar)
    }
    // Um erro tardio de um script que já saiu não pode apagar a tentativa seguinte: só zera se ainda é a minha.
    const falhar = () => {
      encerrar()
      script.remove()
      if (carregando === minha) carregando = null
      rejeitar(new Error('O script da verificação não carregou.'))
    }
    const aoCarregar = () => {
      const api = apiGlobal()
      if (!api) {
        falhar()
        return
      }
      encerrar()
      resolver(api)
    }
    const relogio = setTimeout(falhar, tempoLimiteMs)
    script.src = URL_DO_TURNSTILE
    script.async = true
    script.addEventListener('error', falhar)
    script.addEventListener('load', aoCarregar)
    document.head.append(script)
  })
  carregando = minha
  return minha
}

/** Só para os testes: esquece o script em andamento. */
export function esquecerTurnstile(): void {
  carregando = null
}

/**
 * D-117: a chave pública vem do build (`VITE_TURNSTILE_SITE_KEY`). Só uma chave no formato do Turnstile
 * (`0x…`, ou `1x…` a `3x…` nas chaves de teste do Cloudflare) liga a verificação. Vazia ou "desligado"
 * (os testes), não há verificação e os pedidos seguem como antes (CA-463).
 */
export function chaveDaVerificacao(): string | null {
  const chave: unknown = import.meta.env['VITE_TURNSTILE_SITE_KEY']
  if (typeof chave !== 'string') return null
  const limpa = chave.trim()
  return /^\dx[\w-]+$/.test(limpa) ? limpa : null
}

/** O Cloudflare desenha o widget flexível com 300 px no mínimo; o compacto tem 150 px. */
export const LARGURA_MINIMA_FLEXIVEL = 300

/** CB-118: no celular de 360 px sobram 280 px na moldura da conta, e ali só o compacto cabe. */
export function tamanhoDoWidget(largura: number): TamanhoDoWidget {
  return largura >= LARGURA_MINIMA_FLEXIVEL ? 'flexible' : 'compact'
}

/** CA-462: o widget segue o tema aplicado no site; fora do provedor de tema, segue o do aparelho. */
export function temaDoWidget(aplicado: 'claro' | 'escuro' | null): TemaDoWidget {
  if (aplicado === 'escuro') return 'dark'
  if (aplicado === 'claro') return 'light'
  return 'auto'
}
```

- [ ] **Step 4: Testes sem a chave e o build publicado com ela**

Em `vite.config.ts`, troque:

```ts
    testTimeout: 20000,
    css: false,
  },
```

por:

```ts
    testTimeout: 20000,
    css: false,
    // CA-463: os testes começam sem a verificação contra robôs, mesmo com a chave no .env.local desta
    // máquina. O teste que precisa dela liga a chave sozinho (vi.stubEnv).
    env: { VITE_TURNSTILE_SITE_KEY: 'desligado' },
  },
```

Em `playwright.config.ts`, troque:

```ts
    // Sem servidor de conta nos testes de navegador: o app abre no modo local
    // (SPEC CA-150), mesmo que exista um .env.local com as chaves nesta máquina.
    env: { VITE_SUPABASE_URL: 'desligado', VITE_SUPABASE_ANON_KEY: 'desligado' },
```

por:

```ts
    // Sem servidor de conta nos testes de navegador: o app abre no modo local
    // (SPEC CA-150), mesmo que exista um .env.local com as chaves nesta máquina.
    // Sem a verificação contra robôs também (spec seguranca-lote-3, CA-463 e R-45):
    // o script do Cloudflare nunca carrega aqui.
    env: { VITE_SUPABASE_URL: 'desligado', VITE_SUPABASE_ANON_KEY: 'desligado', VITE_TURNSTILE_SITE_KEY: 'desligado' },
```

Em `.github/workflows/publicar.yml`, logo depois da linha `          VITE_MERCADOPAGO_PUBLIC_KEY: ${{ vars.VITE_MERCADOPAGO_PUBLIC_KEY }}`, acrescente (mesma indentação):

```yaml
          # A chave PÚBLICA da verificação contra robôs (Cloudflare Turnstile, D-117). É variável,
          # não segredo: vai no JavaScript do site. A chave secreta fica só no painel do Supabase.
          # Sem ela, as telas de conta não mostram a verificação e os pedidos seguem sem ela.
          VITE_TURNSTILE_SITE_KEY: ${{ vars.VITE_TURNSTILE_SITE_KEY }}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/ui/publico/conta/turnstile.test.ts src/data/sqlCheckout.test.ts`
Expected: PASS (o `sqlCheckout` confirma que o workflow continua com 5 ações fixadas por SHA).

Run: `npm run check`
Expected: verde.

- [ ] **Step 6: Commit**

`../_msg.txt`:

```text
feat(conta): carregador da verificação contra robôs

O script do Cloudflare Turnstile entra na página uma vez só, com a
renderização explícita, e a chave pública vem da variável do build.
Testes de unidade e de navegador montam o site sem a chave; o build
publicado recebe a chave da variável do GitHub.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

```bash
git add src/ui/publico/conta/turnstile.ts src/ui/publico/conta/turnstile.test.ts vite.config.ts playwright.config.ts .github/workflows/publicar.yml
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 2: Os pedidos de conta levam a verificação

Cobre o lado do pedido de D-113 (CA-454 a CA-457), a tradução do CA-460 e do CA-461 (com e sem o token, D-119), o CA-463 nos pedidos e as frases do CA-458, CA-460 e CA-461.

**Files:**
- Modify: `src/domain/conta.ts:231-269` (`ErroConta` e `MENSAGEM_ERRO`)
- Modify: `src/domain/conta.test.ts` (um `describe` no fim)
- Modify: `src/ui/estado/usarConta.ts:46-51, 59-78, 128-195`
- Modify: `src/ui/estado/usarConta.test.ts` (oito testes e duas linhas nas tabelas do `traduzir`)

**Interfaces:**
- Consumes: nada das outras tarefas.
- Produces:
  - `ErroConta` ganha `'verificacao-pendente' | 'verificacao-recusada' | 'verificacao-nao-carregou'`, com as frases da spec em `MENSAGEM_ERRO`.
  - `ValorConta` (exato): `entrar: (email: string, senha: string, captchaToken?: string) => Promise<Resultado>`, `cadastrar: (dados: DadosCadastro, captchaToken?: string) => Promise<Resultado>`, `reenviarConfirmacao: (email: string, captchaToken?: string) => Promise<Resultado>`, `pedirTrocaDeSenha: (email: string, captchaToken?: string) => Promise<Resultado>`. `confirmarCodigo`, `conferirCodigoDeSenha` e `trocarSenha` não mudam.
  - `traduzir(mensagem, 'captcha_failed')` e mensagem com "captcha" devolvem `'verificacao-recusada'`.
  - Dentro de `usarConta.ts` (não exportada): `erroDoPedido(erro, captchaToken)`. A recusa da verificação num pedido que foi **com** o token vira `'verificacao-recusada'` (CA-460); num pedido que foi **sem** o token, `'verificacao-nao-carregou'` (CA-461, D-119). Os quatro pedidos com verificação usam ela; as telas só mostram `MENSAGEM_ERRO[erro]`.

- [ ] **Step 1: Escrever os testes que falham**

Em `src/domain/conta.test.ts`, no fim do arquivo, acrescente:

```ts
describe('Verificação contra robôs (spec seguranca-lote-3)', () => {
  it('CA-458, CA-460 e CA-461: as frases da verificação são as da spec', () => {
    expect(MENSAGEM_ERRO['verificacao-pendente']).toBe('Espere a verificação de segurança terminar.')
    expect(MENSAGEM_ERRO['verificacao-recusada']).toBe('Não deu para confirmar que é você. Tente de novo.')
    expect(MENSAGEM_ERRO['verificacao-nao-carregou']).toBe(
      'A verificação de segurança não carregou. Confira a internet ou desative o bloqueador e recarregue a página.',
    )
  })
})
```

Em `src/ui/estado/usarConta.test.ts`:

1. Na tabela `it.each` de `describe('traduzir as mensagens do Supabase')`, logo depois de `    ['Token has expired or is invalid', 'codigo-invalido'],`, acrescente:

```ts
    ['captcha protection: request disallowed (timeout-or-duplicate)', 'verificacao-recusada'],
```

2. Na tabela dos códigos, logo depois de `    ['otp_expired', 'codigo-invalido'],`, acrescente:

```ts
    ['captcha_failed', 'verificacao-recusada'],
```

3. Logo antes da linha `describe('traduzir as mensagens do Supabase', () => {` (o `describe('useConta')` já terminou na linha de cima, com `})`), acrescente um `describe` novo, no nível de cima do arquivo:

```ts
describe('useConta com a verificação contra robôs (spec seguranca-lote-3)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('CA-454: o cadastro leva a verificação junto com o resto do pedido', async () => {
    auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      await result.current.cadastrar(dados, 'tok-cadastro')
    })
    const pedido = auth.signUp.mock.calls[0]?.[0]
    expect(pedido.options.captchaToken).toBe('tok-cadastro')
    expect(pedido.options.emailRedirectTo).toMatch(/\?volta=confirmacao$/)
    expect(pedido.options.data).toMatchObject({ nome: 'Maria', situacao: 'nutricionista', termos_versao: '2026-09-28' })
  })

  it('CA-455: entrar leva a verificação', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.entrar(' maria@usp.br ', 'senhaforte1', 'tok-entrar')).toEqual({ ok: true, erro: null })
    })
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'maria@usp.br', password: 'senhaforte1', options: { captchaToken: 'tok-entrar' } })
  })

  it('CA-456: pedir o código da troca de senha leva a verificação', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.pedirTrocaDeSenha(' maria@usp.br ', 'tok-senha')).toEqual({ ok: true, erro: null })
    })
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('maria@usp.br', { redirectTo: expect.stringMatching(/\?volta=recuperacao$/), captchaToken: 'tok-senha' })
  })

  it('CA-457: reenviar o código leva a verificação; confirmar o código não', async () => {
    auth.resend.mockResolvedValue({ error: null })
    auth.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      await result.current.reenviarConfirmacao('maria@usp.br', 'tok-reenviar')
      await result.current.confirmarCodigo('maria@usp.br', '12345678')
    })
    expect(auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'maria@usp.br',
      options: { emailRedirectTo: expect.stringMatching(/\?volta=confirmacao$/), captchaToken: 'tok-reenviar' },
    })
    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'maria@usp.br', token: '12345678', type: 'email' })
  })

  it('CA-460: a recusa da verificação num pedido que foi com o token volta como "verificacao-recusada" em entrar, cadastrar e reenviar', async () => {
    const recusa = new AuthApiError('captcha protection: request disallowed (invalid-input-response)', 400, 'captcha_failed')
    auth.signInWithPassword.mockResolvedValue({ error: recusa })
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: recusa })
    auth.resend.mockResolvedValue({ error: recusa })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.entrar('maria@usp.br', 'senhaforte1', 'tok')).toEqual({ ok: false, erro: 'verificacao-recusada' })
      expect(await result.current.cadastrar(dados, 'tok')).toEqual({ ok: false, erro: 'verificacao-recusada' })
      expect(await result.current.reenviarConfirmacao('maria@usp.br', 'tok')).toEqual({ ok: false, erro: 'verificacao-recusada' })
    })
  })

  it('CA-461: a recusa da verificação num pedido que foi sem o token (o script não carregou, D-119) volta como "verificacao-nao-carregou"', async () => {
    const recusa = new AuthApiError('captcha protection: request disallowed (no captcha response (captcha_token) found in request)', 400, 'captcha_failed')
    auth.signInWithPassword.mockResolvedValue({ error: recusa })
    auth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: recusa })
    auth.resend.mockResolvedValue({ error: recusa })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.entrar('maria@usp.br', 'senhaforte1')).toEqual({ ok: false, erro: 'verificacao-nao-carregou' })
      expect(await result.current.cadastrar(dados)).toEqual({ ok: false, erro: 'verificacao-nao-carregou' })
      expect(await result.current.reenviarConfirmacao('maria@usp.br')).toEqual({ ok: false, erro: 'verificacao-nao-carregou' })
    })
  })

  it('CA-460, CA-461 e CA-144: na troca de senha, a recusa da verificação aparece, com e sem o token (o servidor a confere antes de procurar a conta)', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: new AuthApiError('captcha protection: request disallowed (timeout-or-duplicate)', 400, 'captcha_failed') })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      expect(await result.current.pedirTrocaDeSenha('ninguem@exemplo.com', 'tok')).toEqual({ ok: false, erro: 'verificacao-recusada' })
      expect(await result.current.pedirTrocaDeSenha('ninguem@exemplo.com')).toEqual({ ok: false, erro: 'verificacao-nao-carregou' })
    })
  })

  it('CA-463: sem verificação, os quatro pedidos saem como antes, sem o campo do token', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null })
    auth.signUp.mockResolvedValue({ data: { user: { identities: [{}] }, session: null }, error: null })
    auth.resend.mockResolvedValue({ error: null })
    auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    const { result } = renderHook(() => useConta())
    await waitFor(() => expect(result.current.carregando).toBe(false))
    await act(async () => {
      await result.current.entrar('maria@usp.br', 'senhaforte1')
      await result.current.cadastrar(dados)
      await result.current.reenviarConfirmacao('maria@usp.br')
      await result.current.pedirTrocaDeSenha('maria@usp.br')
    })
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'maria@usp.br', password: 'senhaforte1' })
    expect(auth.signUp.mock.calls[0]?.[0].options).not.toHaveProperty('captchaToken')
    expect(auth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'maria@usp.br', options: { emailRedirectTo: expect.stringMatching(/\?volta=confirmacao$/) } })
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('maria@usp.br', { redirectTo: expect.stringMatching(/\?volta=recuperacao$/) })
  })
})

```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/conta.test.ts src/ui/estado/usarConta.test.ts`
Expected: FAIL. `MENSAGEM_ERRO['verificacao-pendente']` é `undefined`; os pedidos saem sem `captchaToken`; `traduzir` devolve `falha-rede` para `captcha_failed`, com ou sem o token; a troca de senha devolve `{ ok: true }` na recusa.

- [ ] **Step 3: Os erros e as frases**

Em `src/domain/conta.ts`, troque:

```ts
  | 'muitas-tentativas'
  | 'sem-servidor'
  | 'falha-rede'
```

por:

```ts
  | 'muitas-tentativas'
  | 'verificacao-pendente'
  | 'verificacao-recusada'
  | 'verificacao-nao-carregou'
  | 'sem-servidor'
  | 'falha-rede'
```

E, em `MENSAGEM_ERRO`, logo depois da linha `  'muitas-tentativas': 'Muitas tentativas seguidas. Espere um minuto e tente de novo.',`, acrescente:

```ts
  // Verificação contra robôs (spec seguranca-lote-3): CA-458, CA-460 e CA-461.
  'verificacao-pendente': 'Espere a verificação de segurança terminar.',
  'verificacao-recusada': 'Não deu para confirmar que é você. Tente de novo.',
  'verificacao-nao-carregou': 'A verificação de segurança não carregou. Confira a internet ou desative o bloqueador e recarregue a página.',
```

- [ ] **Step 4: O token nos pedidos**

Em `src/ui/estado/usarConta.ts`:

1. Em `ValorConta`, troque:

```ts
  readonly entrar: (email: string, senha: string) => Promise<Resultado>
  readonly cadastrar: (dados: DadosCadastro) => Promise<Resultado>
  readonly reenviarConfirmacao: (email: string) => Promise<Resultado>
  /** Confirma a conta com o código do e-mail; dando certo, a pessoa já entra (CA-407). */
  readonly confirmarCodigo: (email: string, codigo: string) => Promise<ResultadoConfirmacao>
  readonly pedirTrocaDeSenha: (email: string) => Promise<Resultado>
```

por:

```ts
  /*
   * D-113: entrar, cadastrar, reenviar e pedir a troca de senha levam o token da verificação contra
   * robôs (`captchaToken`). Sem ele, o pedido sai igual ao de antes (CA-463). Confirmar o código não leva (CA-457).
   */
  readonly entrar: (email: string, senha: string, captchaToken?: string) => Promise<Resultado>
  readonly cadastrar: (dados: DadosCadastro, captchaToken?: string) => Promise<Resultado>
  readonly reenviarConfirmacao: (email: string, captchaToken?: string) => Promise<Resultado>
  /** Confirma a conta com o código do e-mail; dando certo, a pessoa já entra (CA-407). */
  readonly confirmarCodigo: (email: string, codigo: string) => Promise<ResultadoConfirmacao>
  readonly pedirTrocaDeSenha: (email: string, captchaToken?: string) => Promise<Resultado>
```

2. Troque:

```ts
const SEM_SERVIDOR: Resultado = { ok: false, erro: 'sem-servidor' }
const OK: Resultado = { ok: true, erro: null }
```

por:

```ts
const SEM_SERVIDOR: Resultado = { ok: false, erro: 'sem-servidor' }
const OK: Resultado = { ok: true, erro: null }

/** D-113: o token da verificação vai só quando existe; sem ele, o pedido sai igual ao de antes (CA-463). */
const comVerificacao = (captchaToken: string | undefined): { readonly captchaToken?: string } => (captchaToken ? { captchaToken } : {})

/**
 * O erro de um pedido que leva a verificação. A recusa dela diz coisas diferentes: com o token, a
 * verificação foi feita e o servidor não aceitou (CA-460); sem o token, o script do Cloudflare não
 * carregou e o pedido seguiu mesmo assim (D-119), mas o captcha está ligado no Supabase (CA-461).
 */
function erroDoPedido(erro: { readonly message: string; readonly code?: string | undefined }, captchaToken: string | undefined): ErroConta {
  const traduzido = traduzir(erro.message, erro.code)
  return traduzido === 'verificacao-recusada' && !captchaToken ? 'verificacao-nao-carregou' : traduzido
}
```

3. Em `traduzir`, troque:

```ts
  if (codigo === 'email_not_confirmed') return 'email-nao-confirmado'
  // O Supabase usa o mesmo código para o código digitado errado e para o vencido.
  if (codigo === 'otp_expired') return 'codigo-invalido'
  const texto = mensagem.toLowerCase()
```

por:

```ts
  if (codigo === 'email_not_confirmed') return 'email-nao-confirmado'
  // CA-460: o servidor recusou a verificação contra robôs (vencida, já usada ou falsa).
  if (codigo === 'captcha_failed') return 'verificacao-recusada'
  // O Supabase usa o mesmo código para o código digitado errado e para o vencido.
  if (codigo === 'otp_expired') return 'codigo-invalido'
  const texto = mensagem.toLowerCase()
  if (texto.includes('captcha')) return 'verificacao-recusada'
```

4. Troque o `entrar` inteiro:

```ts
  const entrar = useCallback(async (email: string, senha: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.signInWithPassword({ email: email.trim(), password: senha })
    return error ? { ok: false, erro: traduzir(error.message, error.code) } : OK
  }, [])
```

por:

```ts
  const entrar = useCallback(async (email: string, senha: string, captchaToken?: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.signInWithPassword({ email: email.trim(), password: senha, ...(captchaToken ? { options: { captchaToken } } : {}) })
    return error ? { ok: false, erro: erroDoPedido(error, captchaToken) } : OK
  }, [])
```

5. Em `cadastrar`, troque `  const cadastrar = useCallback(async (dados: DadosCadastro): Promise<Resultado> => {` por `  const cadastrar = useCallback(async (dados: DadosCadastro, captchaToken?: string): Promise<Resultado> => {` e, dentro de `options`, troque:

```ts
          ...(versaoTermos ? { termos_versao: versaoTermos, termos_aceitos_em: new Date().toISOString() } : {}),
        },
      },
    })
    if (error) return { ok: false, erro: traduzir(error.message, error.code) }
```

por:

```ts
          ...(versaoTermos ? { termos_versao: versaoTermos, termos_aceitos_em: new Date().toISOString() } : {}),
        },
        ...comVerificacao(captchaToken),
      },
    })
    if (error) return { ok: false, erro: erroDoPedido(error, captchaToken) }
```

6. Troque o `reenviarConfirmacao` inteiro:

```ts
  const reenviarConfirmacao = useCallback(async (email: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: enderecoDeVolta('confirmacao') } })
    return error ? { ok: false, erro: traduzir(error.message, error.code) } : OK
  }, [])
```

por:

```ts
  const reenviarConfirmacao = useCallback(async (email: string, captchaToken?: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: enderecoDeVolta('confirmacao'), ...comVerificacao(captchaToken) },
    })
    return error ? { ok: false, erro: erroDoPedido(error, captchaToken) } : OK
  }, [])
```

7. Troque o começo do `pedirTrocaDeSenha`:

```ts
  const pedirTrocaDeSenha = useCallback(async (email: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.resetPasswordForEmail(email.trim(), { redirectTo: enderecoDeVolta('recuperacao') })
    if (!error) return OK
```

por:

```ts
  const pedirTrocaDeSenha = useCallback(async (email: string, captchaToken?: string): Promise<Resultado> => {
    const c = obterSupabase()
    if (!c) return SEM_SERVIDOR
    const { error } = await c.auth.resetPasswordForEmail(email.trim(), { redirectTo: enderecoDeVolta('recuperacao'), ...comVerificacao(captchaToken) })
    if (!error) return OK
    // CA-460 e CA-461: a recusa da verificação aparece. Ela não diz se a conta existe: o servidor confere a
    // verificação antes de procurar a conta, então a resposta é a mesma para quem tem e quem não tem (CA-144).
    const recusa = erroDoPedido(error, captchaToken)
    if (recusa === 'verificacao-recusada' || recusa === 'verificacao-nao-carregou') return { ok: false, erro: recusa }
```

O resto do `pedirTrocaDeSenha` (o comentário do CA-144, a falta de internet e o `return OK`) fica como está.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/domain/conta.test.ts src/ui/estado/usarConta.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: verde. As telas ainda chamam os pedidos sem o token, e os testes delas continuam passando.

- [ ] **Step 6: Commit**

`../_msg.txt`:

```text
feat(conta): pedidos de conta levam a verificação

Entrar, cadastrar, reenviar o código e pedir a troca de senha passam
o token da verificação contra robôs ao Supabase quando ele existe;
sem ele, o pedido sai igual ao de antes. A recusa do servidor vira
"Não deu para confirmar que é você. Tente de novo." no pedido com o
token e "A verificação de segurança não carregou..." no pedido sem
ele, também na troca de senha. Confirmar o código não leva a
verificação.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

```bash
git add src/domain/conta.ts src/domain/conta.test.ts src/ui/estado/usarConta.ts src/ui/estado/usarConta.test.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 3: A verificação na tela

Cobre o comportamento do widget: D-114, D-115, D-119, CA-458, CA-459, CA-461 a CA-463, CB-116, CB-118 e CB-119, numa tela mínima (a frase do CA-460 e a do CA-461 vêm do `useConta`, Tarefa 2, e aparecem nas telas, Tarefas 4 e 5). As telas de verdade entram nas Tarefas 4 e 5.

**Files:**
- Create: `src/ui/publico/conta/usarVerificacao.ts`
- Create: `src/ui/publico/conta/VerificacaoContraRobos.tsx`
- Create: `src/ui/publico/conta/turnstileFalso.test-utils.ts`
- Create: `src/ui/publico/conta/VerificacaoContraRobos.test.tsx`

**Interfaces:**
- Consumes: de `turnstile.ts` (Tarefa 1) `carregarTurnstile`, `chaveDaVerificacao`, `esquecerTurnstile`, `tamanhoDoWidget`, `temaDoWidget`, `URL_DO_TURNSTILE`, `AcaoDaVerificacao`, `ApiDoTurnstile`, `OpcoesDoWidget`; de `conta.ts` (Tarefa 2) `ErroConta` e `MENSAGEM_ERRO`; de `src/ui/tema/contextoTema.ts` `ContextoTema` (o `aplicado`, `'claro' | 'escuro'`).
- Produces (`src/ui/publico/conta/usarVerificacao.ts`, exatos):
  - `export type ExtraDoPedido = readonly [] | readonly [captchaToken: string]`
  - `export type PedidoDaVerificacao = { readonly ok: true; readonly extra: ExtraDoPedido } | { readonly ok: false; readonly erro: ErroConta }`
  - `export interface Verificacao { readonly ligada: boolean; readonly visivel: boolean; readonly naoCarregou: boolean; readonly container: RefObject<HTMLDivElement>; readonly tomar: () => PedidoDaVerificacao }`
  - `export function useVerificacao(acao: AcaoDaVerificacao): Verificacao`
  - O que `tomar()` devolve: sem a chave, `{ ok: true, extra: [] }` (CA-463); com o token pronto, `{ ok: true, extra: [token] }` e o widget já se renova (D-115); com o script que não carregou ou o widget em falha, `{ ok: true, extra: [] }` (D-119; com o widget em falha, ele também se renova); enquanto o script carrega ou o Cloudflare confere, `{ ok: false, erro: 'verificacao-pendente' }` (CA-458).
  - Como a tela usa: depois de validar o formulário, `const pedido = verificacao.tomar()`; se `!pedido.ok`, mostra `pedido.erro` e para; senão chama o pedido com `...pedido.extra` no fim (Tarefa 2 aceita o último argumento opcional e traduz a recusa conforme o token foi ou não).
- Produces (`src/ui/publico/conta/VerificacaoContraRobos.tsx`): `export function VerificacaoContraRobos({ verificacao, children }: { readonly verificacao: Verificacao; readonly children: ReactNode })`. O `children` é o botão que leva a verificação. Tem de estar na mesma tela do `useVerificacao`, sempre (o efeito do gancho procura a caixa ao montar).
- Produces (`src/ui/publico/conta/turnstileFalso.test-utils.ts`): `CHAVE_DE_TESTE`, `ligarTurnstileFalso(opcoes?: { chave?: string; carregado?: boolean }): TurnstileFalso`, com `api.render/reset/remove` (espiões), `widgets`, `ativo()`, `pronto()`, `aprovar(token)`, `vencer()`, `falhar()`, `pedirClique()`, `chegarScript()`, `falharScript()`. Os testes das Tarefas 4 e 5 usam e desligam com `vi.unstubAllEnvs()` e `vi.unstubAllGlobals()` no `afterEach`.

- [ ] **Step 1: O Turnstile de mentira e os testes que falham**

Crie `src/ui/publico/conta/turnstileFalso.test-utils.ts`:

```ts
// Turnstile de mentira para os testes: guarda cada widget desenhado e deixa o teste fazer o papel
// do Cloudflare (aprovar, vencer, falhar, pedir um clique). O script de verdade nunca carrega nos
// testes (R-45). O nome não termina em `.test.ts`, então o Vitest não roda este arquivo como teste.
import { act, waitFor } from '@testing-library/react'
import type { Mock } from 'vitest'
import { esquecerTurnstile, URL_DO_TURNSTILE, type ApiDoTurnstile, type OpcoesDoWidget } from './turnstile.ts'

/** A chave de teste do Cloudflare que sempre aprova. Aqui é só um valor: nenhum pedido sai para o Cloudflare. */
export const CHAVE_DE_TESTE = '1x00000000000000000000AA'

export interface WidgetFalso {
  readonly id: string
  readonly alvo: HTMLElement
  readonly opcoes: OpcoesDoWidget
  removido: boolean
}

export interface TurnstileFalso {
  readonly api: {
    readonly render: Mock<ApiDoTurnstile['render']>
    readonly reset: Mock<ApiDoTurnstile['reset']>
    readonly remove: Mock<ApiDoTurnstile['remove']>
  }
  readonly widgets: readonly WidgetFalso[]
  /** O widget na tela agora: o último desenhado que não saiu. */
  readonly ativo: () => WidgetFalso
  /** Espera a tela desenhar o widget (o script chega numa promessa). */
  readonly pronto: () => Promise<void>
  /** O Cloudflare terminou e entregou o token. */
  readonly aprovar: (token: string) => void
  /** O token passou dos 5 minutos (CB-116). */
  readonly vencer: () => void
  /** O Cloudflare não confirmou (erro no widget). */
  readonly falhar: () => void
  /** O Cloudflare quer um clique: o widget vai aparecer (D-114). */
  readonly pedirClique: () => void
  /** O script chega: o Turnstile aparece na página e a tag avisa que carregou. */
  readonly chegarScript: () => Promise<void>
  /** Rede fora, bloqueador ou Cloudflare fora: a tag avisa que falhou (CA-461, D-119). */
  readonly falharScript: () => Promise<void>
}

interface OpcoesDoFalso {
  /** A chave do build. Vazia, a verificação fica desligada (CA-463). */
  readonly chave?: string
  /** Falso: o script ainda não chegou; o teste decide com `chegarScript` ou `falharScript`. */
  readonly carregado?: boolean
}

export function ligarTurnstileFalso({ chave = CHAVE_DE_TESTE, carregado = true }: OpcoesDoFalso = {}): TurnstileFalso {
  esquecerTurnstile()
  for (const script of document.querySelectorAll(`script[src="${URL_DO_TURNSTILE}"]`)) script.remove()
  const widgets: WidgetFalso[] = []
  const api = {
    render: vi.fn<ApiDoTurnstile['render']>((alvo, opcoes) => {
      const widget: WidgetFalso = { id: `widget-${widgets.length + 1}`, alvo, opcoes, removido: false }
      widgets.push(widget)
      return widget.id
    }),
    reset: vi.fn<ApiDoTurnstile['reset']>(),
    remove: vi.fn<ApiDoTurnstile['remove']>((id) => {
      for (const widget of widgets) if (widget.id === id) widget.removido = true
    }),
  }
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', chave)
  if (carregado) vi.stubGlobal('turnstile', api)
  const ativo = (): WidgetFalso => {
    const widget = widgets.filter((w) => !w.removido).at(-1)
    if (!widget) throw new Error('Nenhuma verificação na tela.')
    return widget
  }
  const tag = () => document.querySelector(`script[src="${URL_DO_TURNSTILE}"]`)
  return {
    api,
    widgets,
    ativo,
    pronto: async () => {
      await waitFor(() => ativo())
    },
    aprovar: (token) => {
      act(() => {
        ativo().opcoes.callback(token)
      })
    },
    vencer: () => {
      act(() => {
        ativo().opcoes['expired-callback']()
      })
    },
    falhar: () => {
      act(() => {
        ativo().opcoes['error-callback']('600010')
      })
    },
    pedirClique: () => {
      act(() => {
        ativo().opcoes['before-interactive-callback']()
      })
    },
    chegarScript: async () => {
      vi.stubGlobal('turnstile', api)
      await act(async () => {
        tag()?.dispatchEvent(new Event('load'))
      })
    },
    falharScript: async () => {
      await act(async () => {
        tag()?.dispatchEvent(new Event('error'))
        // A falha passa por algumas promessas até chegar à tela: espera todas antes de seguir.
        await new Promise((resolver) => setTimeout(resolver, 0))
      })
    },
  }
}
```

Crie `src/ui/publico/conta/VerificacaoContraRobos.test.tsx`:

```tsx
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { MENSAGEM_ERRO } from '@/domain/conta.ts'
import { CHAVE_TEMA, useTema } from '../../tema/contextoTema.ts'
import { ProvedorTema } from '../../tema/ProvedorTema.tsx'
import { URL_DO_TURNSTILE, type AcaoDaVerificacao } from './turnstile.ts'
import { CHAVE_DE_TESTE, ligarTurnstileFalso, type TurnstileFalso } from './turnstileFalso.test-utils.ts'
import { useVerificacao, type PedidoDaVerificacao } from './usarVerificacao.ts'
import { VerificacaoContraRobos } from './VerificacaoContraRobos.tsx'

/** Uma tela mínima: a verificação logo acima de um botão que entrega o que o clique levaria. */
function Anfitriao({ acao = 'login', aoPedir }: { readonly acao?: AcaoDaVerificacao; readonly aoPedir: (pedido: PedidoDaVerificacao) => void }) {
  const verificacao = useVerificacao(acao)
  return (
    <VerificacaoContraRobos verificacao={verificacao}>
      <button type="button" onClick={() => aoPedir(verificacao.tomar())}>
        Enviar
      </button>
    </VerificacaoContraRobos>
  )
}

/** O botão de tema do site, para trocar o tema com a tela aberta. */
function TrocarTema() {
  const { alternar } = useTema()
  return (
    <button type="button" onClick={alternar}>
      Trocar tema
    </button>
  )
}

const enviar = () => screen.getByRole('button', { name: 'Enviar' })
const espiao = () => vi.fn<(pedido: PedidoDaVerificacao) => void>()
const ativos = (falso: TurnstileFalso) => falso.widgets.filter((widget) => !widget.removido)

describe('a verificação contra robôs na tela (spec seguranca-lote-3)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('CA-463: sem a chave, só o botão aparece, nenhum script é pedido e o clique segue sem verificação', async () => {
    const falso = ligarTurnstileFalso({ chave: '' })
    const aoPedir = espiao()
    const { container } = render(<Anfitriao aoPedir={aoPedir} />)
    expect(container.firstElementChild).toBe(enviar())
    await userEvent.setup().click(enviar())
    expect(aoPedir).toHaveBeenCalledWith({ ok: true, extra: [] })
    expect(falso.api.render).not.toHaveBeenCalled()
    expect(document.querySelector(`script[src="${URL_DO_TURNSTILE}"]`)).toBeNull()
  })

  it.each([
    ['claro', 'light'],
    ['escuro', 'dark'],
  ] as const)('CA-462: escondida logo acima do botão até o Cloudflare pedir um clique, em português, no tema %s do site', async (tema, doWidget) => {
    localStorage.setItem(CHAVE_TEMA, tema)
    const falso = ligarTurnstileFalso()
    render(
      <ProvedorTema>
        <Anfitriao aoPedir={espiao()} />
      </ProvedorTema>,
    )
    await falso.pronto()
    const widget = falso.ativo()
    expect(widget.opcoes).toMatchObject({
      sitekey: CHAVE_DE_TESTE,
      action: 'login',
      appearance: 'interaction-only',
      language: 'pt-br',
      theme: doWidget,
      'refresh-expired': 'auto',
      'response-field': false,
    })
    expect(widget.alvo.nextElementSibling).toBe(enviar())
    expect(widget.alvo).toHaveAttribute('aria-hidden', 'true')
    expect(widget.alvo).toHaveClass('h-0')
    falso.pedirClique()
    expect(widget.alvo).not.toHaveAttribute('aria-hidden')
    expect(widget.alvo).not.toHaveClass('h-0')
    falso.aprovar('tok-1')
    expect(widget.alvo).toHaveAttribute('aria-hidden', 'true')
  })

  it('CA-458: antes de o script chegar ou de o Cloudflare terminar, o clique volta com o aviso de esperar', async () => {
    const falso = ligarTurnstileFalso({ carregado: false })
    const aoPedir = espiao()
    render(<Anfitriao aoPedir={aoPedir} />)
    const usuario = userEvent.setup()
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: false, erro: 'verificacao-pendente' })
    await falso.chegarScript()
    await falso.pronto()
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: false, erro: 'verificacao-pendente' })
    expect(MENSAGEM_ERRO['verificacao-pendente']).toBe('Espere a verificação de segurança terminar.')
  })

  it('CA-459: cada verificação sai uma vez só; ao sair, o widget se renova e a tentativa seguinte espera a nova', async () => {
    const falso = ligarTurnstileFalso()
    const aoPedir = espiao()
    render(<Anfitriao aoPedir={aoPedir} />)
    await falso.pronto()
    const usuario = userEvent.setup()
    falso.aprovar('tok-1')
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: ['tok-1'] })
    expect(falso.api.reset).toHaveBeenCalledTimes(1)
    expect(falso.api.reset).toHaveBeenCalledWith('widget-1')
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: false, erro: 'verificacao-pendente' })
    falso.aprovar('tok-2')
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: ['tok-2'] })
    expect(falso.api.reset).toHaveBeenCalledTimes(2)
  })

  it('D-119: o Cloudflare não confirma (erro no widget): o clique segue sem a verificação, e o widget se renova para a próxima', async () => {
    const falso = ligarTurnstileFalso()
    const aoPedir = espiao()
    render(<Anfitriao aoPedir={aoPedir} />)
    await falso.pronto()
    falso.aprovar('tok-1')
    falso.falhar()
    const usuario = userEvent.setup()
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: [] })
    expect(falso.api.reset).toHaveBeenCalledWith('widget-1')
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: false, erro: 'verificacao-pendente' })
    falso.aprovar('tok-2')
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: ['tok-2'] })
  })

  it('CA-461: o script não carrega: a caixa sai, nenhum aviso aparece antes da resposta, e o clique segue sem a verificação', async () => {
    const falso = ligarTurnstileFalso({ carregado: false })
    const aoPedir = espiao()
    const { container } = render(<Anfitriao aoPedir={aoPedir} />)
    await falso.falharScript()
    await waitFor(() => expect(container.firstElementChild).toBe(enviar()))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    const usuario = userEvent.setup()
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: [] })
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: [] })
    expect(falso.api.render).not.toHaveBeenCalled()
  })

  it('CB-116: a verificação vencida volta a "espere" até a nova chegar, sem a tela renovar por conta própria', async () => {
    const falso = ligarTurnstileFalso()
    const aoPedir = espiao()
    render(<Anfitriao aoPedir={aoPedir} />)
    await falso.pronto()
    expect(falso.ativo().opcoes['refresh-expired']).toBe('auto')
    falso.aprovar('tok-1')
    falso.vencer()
    const usuario = userEvent.setup()
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: false, erro: 'verificacao-pendente' })
    expect(falso.api.reset).not.toHaveBeenCalled()
    falso.aprovar('tok-2')
    await usuario.click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: ['tok-2'] })
  })

  it.each([
    [280, 'compact'],
    [432, 'flexible'],
  ] as const)('CB-118: com %i px para o widget, o tamanho é %s (no celular de 360 px sobram 280)', async (largura, tamanho) => {
    // O jsdom não mede nada: a largura da caixa vem daqui, como o navegador mediria na moldura da conta.
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockReturnValue(largura)
    const falso = ligarTurnstileFalso()
    render(<Anfitriao aoPedir={espiao()} />)
    await falso.pronto()
    expect(falso.ativo().opcoes.size).toBe(tamanho)
    expect(falso.ativo().alvo).toHaveClass('w-full')
  })

  it('CB-119: sair da tela tira o widget; voltar desenha um só, sem erro', async () => {
    const falso = ligarTurnstileFalso()
    const primeira = render(<Anfitriao aoPedir={espiao()} />)
    await falso.pronto()
    primeira.unmount()
    expect(falso.api.remove).toHaveBeenCalledWith('widget-1')
    render(<Anfitriao aoPedir={espiao()} />)
    await falso.pronto()
    expect(falso.api.render).toHaveBeenCalledTimes(2)
    expect(ativos(falso)).toHaveLength(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('CB-119: no modo estrito do React (monta, desmonta e monta de novo), fica um widget só', async () => {
    const falso = ligarTurnstileFalso()
    render(
      <StrictMode>
        <Anfitriao aoPedir={espiao()} />
      </StrictMode>,
    )
    await falso.pronto()
    expect(ativos(falso)).toHaveLength(1)
  })

  it('CB-119: sair antes de o script chegar não desenha nada depois', async () => {
    const falso = ligarTurnstileFalso({ carregado: false })
    const { unmount } = render(<Anfitriao aoPedir={espiao()} />)
    expect(document.querySelectorAll(`script[src="${URL_DO_TURNSTILE}"]`)).toHaveLength(1)
    unmount()
    await falso.chegarScript()
    expect(falso.api.render).not.toHaveBeenCalled()
  })

  it('Foco: o Turnstile que recusa desenhar o widget não quebra a tela nem trava o botão: o clique segue sem a verificação', async () => {
    const falso = ligarTurnstileFalso()
    falso.api.render.mockImplementation(() => {
      throw new Error('chave com formato errado')
    })
    const aoPedir = espiao()
    const { container } = render(<Anfitriao aoPedir={aoPedir} />)
    await waitFor(() => expect(container.firstElementChild).toBe(enviar()))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await userEvent.setup().click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: true, extra: [] })
  })

  it('Foco: a resposta atrasada de um widget que já saiu não vale para a tela nova', async () => {
    const falso = ligarTurnstileFalso()
    const aoPedir = espiao()
    const primeira = render(<Anfitriao aoPedir={aoPedir} />)
    await falso.pronto()
    const velho = falso.ativo()
    primeira.unmount()
    render(<Anfitriao aoPedir={aoPedir} />)
    await falso.pronto()
    act(() => {
      velho.opcoes.callback('token-velho')
    })
    await userEvent.setup().click(enviar())
    expect(aoPedir).toHaveBeenLastCalledWith({ ok: false, erro: 'verificacao-pendente' })
  })

  it('Foco: o tema do site muda com a tela aberta: o widget é desenhado de novo, no tema novo, um só', async () => {
    localStorage.setItem(CHAVE_TEMA, 'claro')
    const falso = ligarTurnstileFalso()
    render(
      <ProvedorTema>
        <Anfitriao aoPedir={espiao()} />
        <TrocarTema />
      </ProvedorTema>,
    )
    await falso.pronto()
    expect(falso.ativo().opcoes.theme).toBe('light')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Trocar tema' }))
    await waitFor(() => expect(falso.ativo().opcoes.theme).toBe('dark'))
    expect(falso.api.remove).toHaveBeenCalledWith('widget-1')
    expect(ativos(falso)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/publico/conta/VerificacaoContraRobos.test.tsx`
Expected: FAIL, com `Failed to resolve import "./usarVerificacao.ts"`.

- [ ] **Step 3: O gancho**

Crie `src/ui/publico/conta/usarVerificacao.ts`:

```ts
// A verificação contra robôs de uma tela de conta (spec seguranca-lote-3, D-113 a D-115 e D-119).
import { useContext, useEffect, useRef, useState, type RefObject } from 'react'
import type { ErroConta } from '@/domain/conta.ts'
import { ContextoTema } from '../../tema/contextoTema.ts'
import { carregarTurnstile, chaveDaVerificacao, tamanhoDoWidget, temaDoWidget, type AcaoDaVerificacao, type ApiDoTurnstile } from './turnstile.ts'

/** O que vai a mais no pedido ao Supabase: o token, quando há um; nada, quando não há (CA-463, D-119). */
export type ExtraDoPedido = readonly [] | readonly [captchaToken: string]

/** O resultado do clique: o pedido segue (com ou sem o token), ou a tela pede para esperar (CA-458). */
export type PedidoDaVerificacao = { readonly ok: true; readonly extra: ExtraDoPedido } | { readonly ok: false; readonly erro: ErroConta }

export interface Verificacao {
  /** Falso sem a chave pública: nada aparece e os pedidos seguem como antes (CA-463). */
  readonly ligada: boolean
  /** D-114: o Cloudflare pediu um clique; só então o widget aparece. */
  readonly visivel: boolean
  /** D-119: o script não carregou (rede, bloqueador, Cloudflare fora) ou o widget não abriu; os pedidos seguem sem o token. */
  readonly naoCarregou: boolean
  /** A caixa onde o widget é desenhado, logo acima do botão (`VerificacaoContraRobos`). */
  readonly container: RefObject<HTMLDivElement>
  /**
   * Chamado no clique, depois de conferir o formulário. Entrega o token uma vez só e já pede outro ao
   * Cloudflare (D-115, CA-459). Enquanto o script carrega ou o Cloudflare confere, pede para esperar
   * (CA-458). Sem o script, ou com o widget em falha, libera o pedido sem o token (D-119): quem decide é o
   * servidor, e a tela traduz a recusa dele (CA-461).
   */
  readonly tomar: () => PedidoDaVerificacao
}

const SEM_VERIFICACAO: PedidoDaVerificacao = { ok: true, extra: [] }

export function useVerificacao(acao: AcaoDaVerificacao): Verificacao {
  const chave = chaveDaVerificacao()
  const tema = temaDoWidget(useContext(ContextoTema)?.aplicado ?? null)
  const container = useRef<HTMLDivElement>(null)
  const apiRef = useRef<ApiDoTurnstile | null>(null)
  const widgetRef = useRef<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  const widgetFalhouRef = useRef(false)
  const [visivel, setVisivel] = useState(false)
  const [naoCarregou, setNaoCarregou] = useState(false)

  useEffect(() => {
    const alvo = container.current
    if (chave === null || alvo === null) return
    // `vivo` cala o widget que já saiu: resposta atrasada dele não vale para a tela nova (CB-119).
    let vivo = true
    let desenhado: { readonly api: ApiDoTurnstile; readonly id: string } | null = null
    const desenhar = (api: ApiDoTurnstile) => {
      if (!vivo) return
      const id = api.render(alvo, {
        sitekey: chave,
        action: acao,
        appearance: 'interaction-only',
        theme: tema,
        language: 'pt-br',
        size: tamanhoDoWidget(alvo.clientWidth),
        'refresh-expired': 'auto',
        'response-field': false,
        callback: (token) => {
          if (!vivo) return
          tokenRef.current = token
          widgetFalhouRef.current = false
          setVisivel(false)
        },
        // CB-116: o Cloudflare renova sozinho; até o novo chegar, o clique pede para esperar.
        'expired-callback': () => {
          if (vivo) tokenRef.current = null
        },
        // D-119: o desafio falhou (rede, Cloudflare fora). O próximo clique segue sem o token.
        'error-callback': () => {
          if (!vivo) return
          tokenRef.current = null
          widgetFalhouRef.current = true
        },
        'before-interactive-callback': () => {
          if (vivo) setVisivel(true)
        },
      })
      if (typeof id !== 'string') throw new Error('O widget da verificação não abriu.')
      desenhado = { api, id }
      apiRef.current = api
      widgetRef.current = id
    }
    // D-119: script que não carrega, ou widget que não abre, libera os pedidos sem o token. Nenhum aviso
    // aparece agora: a frase do CA-461 só vem se o servidor recusar o pedido sem a verificação.
    void carregarTurnstile()
      .then(desenhar)
      .catch(() => {
        if (vivo) setNaoCarregou(true)
      })
    return () => {
      vivo = false
      if (desenhado) {
        try {
          desenhado.api.remove(desenhado.id)
        } catch {
          // o widget já tinha saído da página
        }
      }
      apiRef.current = null
      widgetRef.current = null
      tokenRef.current = null
      widgetFalhouRef.current = false
    }
  }, [chave, acao, tema])

  /** D-115: o token que saiu não vale mais; o Cloudflare começa outro na hora. */
  const renovar = () => {
    tokenRef.current = null
    widgetFalhouRef.current = false
    setVisivel(false)
    const api = apiRef.current
    const id = widgetRef.current
    if (api === null || id === null) return
    try {
      api.reset(id)
    } catch {
      // o widget já tinha saído da página
    }
  }

  const tomar = (): PedidoDaVerificacao => {
    if (chave === null || naoCarregou) return SEM_VERIFICACAO
    if (widgetFalhouRef.current) {
      // D-119: segue sem o token, e o widget tenta de novo para a próxima tentativa (D-115).
      renovar()
      return SEM_VERIFICACAO
    }
    const token = tokenRef.current
    if (token === null) return { ok: false, erro: 'verificacao-pendente' }
    renovar()
    return { ok: true, extra: [token] }
  }

  return { ligada: chave !== null, visivel, naoCarregou, container, tomar }
}
```

- [ ] **Step 4: O componente**

Crie `src/ui/publico/conta/VerificacaoContraRobos.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { Verificacao } from './usarVerificacao.ts'

interface VerificacaoContraRobosProps {
  readonly verificacao: Verificacao
  /** O botão que leva a verificação: ela fica logo acima dele (CA-462). */
  readonly children: ReactNode
}

/**
 * O lugar da verificação contra robôs, logo acima do botão (spec seguranca-lote-3, D-114). Enquanto o
 * Cloudflare confere sozinho, a caixa tem altura zero e não empurra nada; quando ele pede um clique, ela
 * abre. Sem a chave (CA-463) ou sem o script (D-119), só o botão: a tela fica limpa, e a frase do CA-461
 * só aparece se o servidor recusar o pedido.
 */
export function VerificacaoContraRobos({ verificacao, children }: VerificacaoContraRobosProps) {
  // Desmontado aqui de propósito: lido como `verificacao.visivel` ao lado de `ref={verificacao.container}`,
  // a regra `react-hooks/refs` toma o objeto todo por ref e recusa a leitura durante a renderização.
  const { ligada, visivel, naoCarregou, container } = verificacao
  if (!ligada || naoCarregou) return <>{children}</>
  return (
    <div className="flex flex-col">
      <div ref={container} aria-hidden={visivel ? undefined : true} className={visivel ? 'mb-4 w-full' : 'h-0 w-full overflow-hidden'} />
      {children}
    </div>
  )
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/ui/publico/conta/VerificacaoContraRobos.test.tsx src/ui/publico/conta/turnstile.test.ts`
Expected: PASS.

Run: `npm run check`
Expected: verde (o ESLint com as regras do React Compiler aceita: nenhum `setState` síncrono no efeito, `ref.current` só no efeito, nos callbacks e nas funções chamadas no clique).

- [ ] **Step 6: Commit**

`../_msg.txt`:

```text
feat(conta): verificação escondida acima do botão

O gancho desenha o widget do Turnstile, guarda o token e o entrega uma
vez só, já pedindo outro. A caixa fica logo acima do botão, com altura
zero até o Cloudflare pedir um clique, em português e no tema do site.
Sem o script, ou com o widget em falha, o clique segue sem a
verificação e o servidor decide; sem a chave, só o botão.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

```bash
git add src/ui/publico/conta/usarVerificacao.ts src/ui/publico/conta/VerificacaoContraRobos.tsx src/ui/publico/conta/turnstileFalso.test-utils.ts src/ui/publico/conta/VerificacaoContraRobos.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 4: Entrar e Criar conta

Cobre CA-454 e CA-455 nas telas, e CA-458, CA-459, CA-460, CA-461, CA-462, CA-463, D-119 e CB-117 em Entrar.

**Files:**
- Modify: `src/ui/publico/conta/TelaEntrar.tsx:1-11, 36, 39-50, 104-106`
- Modify: `src/ui/publico/conta/TelaEntrar.test.tsx` (imports e um `describe` no fim)
- Modify: `src/ui/publico/conta/TelaCriarConta.tsx:1-16, 53, 71-83, 162-164`
- Modify: `src/ui/publico/conta/TelaCriarConta.test.tsx` (import e um `describe` no fim)

**Interfaces:**
- Consumes: `useVerificacao`, `PedidoDaVerificacao` e `VerificacaoContraRobos` (Tarefa 3); `ValorConta.entrar(email, senha, captchaToken?)` e `ValorConta.cadastrar(dados, captchaToken?)` (Tarefa 2); `ligarTurnstileFalso` (Tarefa 3) nos testes.
- Produces: nada para outras tarefas.

- [ ] **Step 1: Escrever os testes que falham**

Em `src/ui/publico/conta/TelaEntrar.test.tsx`:

1. Troque `import type { ValorConta } from '../../estado/usarConta.ts'` por `import type { Resultado, ValorConta } from '../../estado/usarConta.ts'`.
2. Logo depois de `import { TelaEntrar } from './TelaEntrar.tsx'`, acrescente:

```tsx
import { URL_DO_TURNSTILE } from './turnstile.ts'
import { ligarTurnstileFalso } from './turnstileFalso.test-utils.ts'
```

3. No fim do arquivo, acrescente:

```tsx
describe('TelaEntrar com a verificação contra robôs (spec seguranca-lote-3)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('CA-455: "Entrar" leva a verificação, com a ação de entrar', async () => {
    const falso = ligarTurnstileFalso()
    const { usuario, conta, aoEntrou } = montar()
    await falso.pronto()
    expect(falso.ativo().opcoes.action).toBe('login')
    falso.aprovar('tok-entrar')
    await entrar(usuario)
    expect(conta.entrar).toHaveBeenCalledWith('maria@exemplo.com', 'senhaforte1', 'tok-entrar')
    expect(aoEntrou).toHaveBeenCalledOnce()
  })

  it('CA-458: antes de a verificação terminar, a tela pede para esperar e nada é enviado', async () => {
    const falso = ligarTurnstileFalso()
    const { usuario, conta } = montar()
    await falso.pronto()
    await entrar(usuario)
    expect(screen.getByRole('alert')).toHaveTextContent('Espere a verificação de segurança terminar.')
    expect(conta.entrar).not.toHaveBeenCalled()
  })

  it('CA-459: depois de uma tentativa errada, a seguinte espera a verificação nova e leva ela', async () => {
    const falso = ligarTurnstileFalso()
    const conta = contaFalsa({ entrar: vi.fn(async () => ({ ok: false, erro: 'credencial-invalida' as const })) })
    const { usuario } = montar(conta)
    await falso.pronto()
    falso.aprovar('tok-1')
    await entrar(usuario)
    expect(conta.entrar).toHaveBeenLastCalledWith('maria@exemplo.com', 'senhaforte1', 'tok-1')
    expect(falso.api.reset).toHaveBeenCalledWith('widget-1')

    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Espere a verificação de segurança terminar.')
    expect(conta.entrar).toHaveBeenCalledTimes(1)

    falso.aprovar('tok-2')
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(conta.entrar).toHaveBeenLastCalledWith('maria@exemplo.com', 'senhaforte1', 'tok-2')
    expect(conta.entrar).toHaveBeenCalledTimes(2)
  })

  it('CA-460: o servidor recusa a verificação: a tela pede para tentar de novo, e a verificação já se renovou', async () => {
    const falso = ligarTurnstileFalso()
    const conta = contaFalsa({ entrar: vi.fn(async () => ({ ok: false, erro: 'verificacao-recusada' as const })) })
    const { usuario, aoEntrou } = montar(conta)
    await falso.pronto()
    falso.aprovar('tok-1')
    await entrar(usuario)
    expect(screen.getByRole('alert')).toHaveTextContent('Não deu para confirmar que é você. Tente de novo.')
    expect(falso.api.reset).toHaveBeenCalledWith('widget-1')
    expect(aoEntrou).not.toHaveBeenCalled()
  })

  it('CA-461: sem o script, "Entrar" segue sem a verificação; se o servidor exigir, a tela diz que a verificação não carregou', async () => {
    const falso = ligarTurnstileFalso({ carregado: false })
    const conta = contaFalsa({ entrar: vi.fn(async () => ({ ok: false, erro: 'verificacao-nao-carregou' as const })) })
    const { usuario, aoEntrou } = montar(conta)
    await falso.falharScript()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await entrar(usuario)
    expect(conta.entrar).toHaveBeenCalledWith('maria@exemplo.com', 'senhaforte1')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A verificação de segurança não carregou. Confira a internet ou desative o bloqueador e recarregue a página.',
    )
    expect(aoEntrou).not.toHaveBeenCalled()
  })

  it('D-119 e R-43: sem o script e com o captcha desligado no Supabase, "Entrar" entra normalmente', async () => {
    const falso = ligarTurnstileFalso({ carregado: false })
    const { usuario, conta, aoEntrou } = montar()
    await falso.falharScript()
    await entrar(usuario)
    expect(conta.entrar).toHaveBeenCalledWith('maria@exemplo.com', 'senhaforte1')
    expect(aoEntrou).toHaveBeenCalledOnce()
  })

  it('CA-462: a verificação fica logo acima de "Entrar"', async () => {
    const falso = ligarTurnstileFalso()
    montar()
    await falso.pronto()
    expect(falso.ativo().alvo.nextElementSibling).toBe(screen.getByRole('button', { name: 'Entrar' }))
  })

  it('CB-117: clique duplo em "Entrar" faz um pedido só e gasta uma verificação só', async () => {
    const falso = ligarTurnstileFalso()
    let terminar: (resultado: Resultado) => void = () => undefined
    const conta = contaFalsa({ entrar: vi.fn(() => new Promise<Resultado>((resolver) => (terminar = resolver))) })
    const { usuario } = montar(conta)
    await falso.pronto()
    falso.aprovar('tok-1')
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.type(screen.getByLabelText('Senha'), 'senhaforte1')
    await usuario.dblClick(screen.getByRole('button', { name: 'Entrar' }))
    terminar({ ok: true, erro: null })
    expect(conta.entrar).toHaveBeenCalledTimes(1)
    expect(falso.api.reset).toHaveBeenCalledTimes(1)
  })

  it('CA-463: sem a chave pública, "Entrar" envia como antes, sem verificação e sem pedir o script', async () => {
    const { usuario, conta } = montar()
    await entrar(usuario)
    expect(conta.entrar).toHaveBeenCalledWith('maria@exemplo.com', 'senhaforte1')
    expect(document.querySelector(`script[src="${URL_DO_TURNSTILE}"]`)).toBeNull()
  })
})
```

Em `src/ui/publico/conta/TelaCriarConta.test.tsx`:

1. Logo depois de `import { TelaCriarConta } from './TelaCriarConta.tsx'`, acrescente `import { ligarTurnstileFalso } from './turnstileFalso.test-utils.ts'`.
2. No fim do arquivo, acrescente:

```tsx
describe('TelaCriarConta com a verificação contra robôs (spec seguranca-lote-3)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('CA-454: "Criar conta" leva a verificação, com a ação de cadastro, e a verificação se renova', async () => {
    const falso = ligarTurnstileFalso()
    const { usuario, conta, aoCriada } = montar()
    await falso.pronto()
    expect(falso.ativo().opcoes.action).toBe('signup')
    falso.aprovar('tok-cadastro')
    await preencherBase(usuario)
    await comoNutricionista(usuario)
    await usuario.click(botaoCriar())
    expect(conta.cadastrar).toHaveBeenCalledWith(expect.objectContaining({ situacao: 'nutricionista', versaoTermos: VERSAO_TERMOS }), 'tok-cadastro')
    expect(falso.api.reset).toHaveBeenCalledWith('widget-1')
    expect(aoCriada).toHaveBeenCalledOnce()
  })

  it('CA-458: antes de a verificação terminar, "Criar conta" pede para esperar e não cria nada', async () => {
    const falso = ligarTurnstileFalso()
    const { usuario, conta } = montar()
    await falso.pronto()
    await preencherBase(usuario)
    await comoNutricionista(usuario)
    await usuario.click(botaoCriar())
    expect(screen.getByRole('alert')).toHaveTextContent('Espere a verificação de segurança terminar.')
    expect(conta.cadastrar).not.toHaveBeenCalled()
  })

  it('CA-462: a verificação fica logo acima do botão de criar a conta', async () => {
    const falso = ligarTurnstileFalso()
    montar()
    await falso.pronto()
    expect(falso.ativo().alvo.nextElementSibling).toBe(botaoCriar())
  })

  it('Foco: clicar com o formulário incompleto não gasta a verificação; a tentativa certa leva a mesma', async () => {
    const falso = ligarTurnstileFalso()
    const { usuario, conta } = montar()
    await falso.pronto()
    falso.aprovar('tok-cadastro')
    await preencherBase(usuario)
    await usuario.click(botaoCriar())
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha se você é nutricionista ou estudante de Nutrição.')
    expect(falso.api.reset).not.toHaveBeenCalled()
    await comoNutricionista(usuario)
    await usuario.click(botaoCriar())
    expect(conta.cadastrar).toHaveBeenCalledWith(expect.objectContaining({ situacao: 'nutricionista' }), 'tok-cadastro')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/publico/conta/TelaEntrar.test.tsx src/ui/publico/conta/TelaCriarConta.test.tsx`
Expected: FAIL nos testes novos que esperam o widget: `pronto()` estoura o tempo com "Nenhuma verificação na tela.", porque as telas ainda não usam o gancho. Já passam o CA-463, o CA-461 e o D-119 de Entrar: sem o gancho, a tela já envia sem o token e mostra a frase que a Tarefa 2 traduz; eles continuam valendo como trava depois do Step 3. Os testes antigos continuam passando.

- [ ] **Step 3: A verificação em Entrar**

Em `src/ui/publico/conta/TelaEntrar.tsx`:

1. Logo depois de `import { MolduraConta } from './MolduraConta.tsx'`, acrescente:

```tsx
import { useVerificacao } from './usarVerificacao.ts'
import { VerificacaoContraRobos } from './VerificacaoContraRobos.tsx'
```

2. Logo depois de `  const enviandoRef = useRef(false)`, acrescente `  const verificacao = useVerificacao('login')`.

3. Em `enviar`, troque:

```tsx
    if (problema) {
      setErro(problema)
      return
    }
    setErro(null)
    enviandoRef.current = true
    setEnviando(true)
    const resultado = await conta.entrar(email, senha)
```

por:

```tsx
    if (problema) {
      setErro(problema)
      return
    }
    // D-113: a verificação contra robôs vai junto. Ainda conferindo, nada sai (CA-458); sem o script, segue sem ela (D-119).
    const pedido = verificacao.tomar()
    if (!pedido.ok) {
      setErro(pedido.erro)
      return
    }
    setErro(null)
    enviandoRef.current = true
    setEnviando(true)
    const resultado = await conta.entrar(email, senha, ...pedido.extra)
```

4. Troque:

```tsx
        <Button type="submit" size="lg" block loading={enviando} disabled={!conta.disponivel}>
          Entrar
        </Button>
```

por:

```tsx
        <VerificacaoContraRobos verificacao={verificacao}>
          <Button type="submit" size="lg" block loading={enviando} disabled={!conta.disponivel}>
            Entrar
          </Button>
        </VerificacaoContraRobos>
```

- [ ] **Step 4: A verificação em Criar conta**

Em `src/ui/publico/conta/TelaCriarConta.tsx`:

1. Logo depois de `import { MolduraConta } from './MolduraConta.tsx'`, acrescente:

```tsx
import { useVerificacao } from './usarVerificacao.ts'
import { VerificacaoContraRobos } from './VerificacaoContraRobos.tsx'
```

2. Logo depois de `  const enviandoRef = useRef(false)`, acrescente `  const verificacao = useVerificacao('signup')`.

3. Em `enviar`, troque:

```tsx
    if (problemaConta || problemaSituacao || situacao.situacao === null) return

    enviandoRef.current = true
    setEnviando(true)
    const resultado = await conta.cadastrar({
      nome,
      email,
      senha,
      planoDesejado: plano ?? 'free',
      versaoTermos: VERSAO_TERMOS,
      situacao: situacao.situacao,
      crn: crnDe(situacao),
    })
```

por:

```tsx
    if (problemaConta || problemaSituacao || situacao.situacao === null) return
    // D-113: a verificação contra robôs vai junto. Ainda conferindo, nada sai (CA-458); sem o script, segue sem ela (D-119).
    const pedido = verificacao.tomar()
    if (!pedido.ok) {
      setErroConta(pedido.erro)
      return
    }

    enviandoRef.current = true
    setEnviando(true)
    const resultado = await conta.cadastrar(
      {
        nome,
        email,
        senha,
        planoDesejado: plano ?? 'free',
        versaoTermos: VERSAO_TERMOS,
        situacao: situacao.situacao,
        crn: crnDe(situacao),
      },
      ...pedido.extra,
    )
```

4. Troque:

```tsx
        <Button type="submit" size="lg" block loading={enviando} disabled={!conta.disponivel}>
          {pago || estudante ? 'Criar conta e continuar' : 'Criar conta'}
        </Button>
```

por:

```tsx
        <VerificacaoContraRobos verificacao={verificacao}>
          <Button type="submit" size="lg" block loading={enviando} disabled={!conta.disponivel}>
            {pago || estudante ? 'Criar conta e continuar' : 'Criar conta'}
          </Button>
        </VerificacaoContraRobos>
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/ui/publico/conta/TelaEntrar.test.tsx src/ui/publico/conta/TelaCriarConta.test.tsx`
Expected: PASS, os testes antigos e os novos (sem a chave, a tela é a mesma de antes: o CA-137 ainda vê `conta.entrar` com dois argumentos).

Run: `npm run check`
Expected: verde.

- [ ] **Step 6: Commit**

`../_msg.txt`:

```text
feat(conta): entrar e criar conta com a verificação

Entrar e Criar conta levam a verificação contra robôs, logo acima do
botão. Enquanto ela confere, a tela pede para esperar e nada sai; sem
o script do Cloudflare, o pedido segue sem ela. O formulário com erro
não gasta a verificação; cada tentativa leva uma verificação nova.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

```bash
git add src/ui/publico/conta/TelaEntrar.tsx src/ui/publico/conta/TelaEntrar.test.tsx src/ui/publico/conta/TelaCriarConta.tsx src/ui/publico/conta/TelaCriarConta.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 5: Esqueci a senha, Confirmar o e-mail e o Código da senha

Cobre CA-456 e CA-457 nas telas, e CA-458, CA-460, CA-461, CA-462 e CB-117 nos botões de pedir e reenviar o código. Fecha o CA-463 no navegador.

**Files:**
- Modify: `src/ui/publico/conta/TelaEsqueciSenha.tsx:1-8, 24, 29-37, 64-66`
- Modify: `src/ui/publico/conta/TelaConfirmarEmail.tsx:1-10, 39, 66-74, 111`
- Modify: `src/ui/publico/conta/TelaCodigoSenha.tsx:1-11, 35, 75-83, 128`
- Modify: `src/ui/publico/conta/senha.test.tsx` (import e três `describe` no fim)
- Modify: `e2e/conta.spec.ts` (um teste dentro do `describe`)

**Interfaces:**
- Consumes: `useVerificacao` e `VerificacaoContraRobos` (Tarefa 3); `ValorConta.pedirTrocaDeSenha(email, captchaToken?)` e `ValorConta.reenviarConfirmacao(email, captchaToken?)` (Tarefa 2); `ligarTurnstileFalso` (Tarefa 3).
- Produces: nada para outras tarefas.

- [ ] **Step 1: Escrever os testes que falham**

Em `src/ui/publico/conta/senha.test.tsx`:

1. Logo depois de `import { TelaNovaSenha } from './TelaNovaSenha.tsx'`, acrescente `import { ligarTurnstileFalso } from './turnstileFalso.test-utils.ts'`.
2. No fim do arquivo, acrescente:

```tsx
describe('TelaEsqueciSenha com a verificação contra robôs (spec seguranca-lote-3)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('CA-456: "Mandar o código" leva a verificação, com a ação de recuperar, logo acima do botão', async () => {
    const falso = ligarTurnstileFalso()
    const conta = contaFalsa()
    const aoEnviado = vi.fn()
    render(<TelaEsqueciSenha conta={conta} aoEnviado={aoEnviado} aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    await falso.pronto()
    expect(falso.ativo().opcoes.action).toBe('recuperar')
    expect(falso.ativo().alvo.nextElementSibling).toBe(screen.getByRole('button', { name: 'Mandar o código' }))
    falso.aprovar('tok-senha')
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.click(screen.getByRole('button', { name: 'Mandar o código' }))
    expect(conta.pedirTrocaDeSenha).toHaveBeenCalledWith('maria@exemplo.com', 'tok-senha')
    expect(aoEnviado).toHaveBeenCalledWith('maria@exemplo.com')
  })

  it('CA-460: o servidor recusa a verificação: a tela pede para tentar de novo e fica onde está', async () => {
    const falso = ligarTurnstileFalso()
    const conta = contaFalsa({ pedirTrocaDeSenha: vi.fn(async () => ({ ok: false, erro: 'verificacao-recusada' as const })) })
    const aoEnviado = vi.fn()
    render(<TelaEsqueciSenha conta={conta} aoEnviado={aoEnviado} aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    await falso.pronto()
    falso.aprovar('tok-senha')
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.click(screen.getByRole('button', { name: 'Mandar o código' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Não deu para confirmar que é você. Tente de novo.')
    expect(falso.api.reset).toHaveBeenCalledWith('widget-1')
    expect(aoEnviado).not.toHaveBeenCalled()
  })

  it('CA-461: sem o script, "Mandar o código" segue sem a verificação; se o servidor exigir, a tela diz que a verificação não carregou', async () => {
    const falso = ligarTurnstileFalso({ carregado: false })
    const conta = contaFalsa({ pedirTrocaDeSenha: vi.fn(async () => ({ ok: false, erro: 'verificacao-nao-carregou' as const })) })
    const aoEnviado = vi.fn()
    render(<TelaEsqueciSenha conta={conta} aoEnviado={aoEnviado} aoIrParaInicio={vi.fn()} aoEntrar={vi.fn()} />)
    await falso.falharScript()
    const usuario = userEvent.setup()
    await usuario.type(screen.getByLabelText('E-mail'), 'maria@exemplo.com')
    await usuario.click(screen.getByRole('button', { name: 'Mandar o código' }))
    expect(conta.pedirTrocaDeSenha).toHaveBeenCalledWith('maria@exemplo.com')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A verificação de segurança não carregou. Confira a internet ou desative o bloqueador e recarregue a página.',
    )
    expect(aoEnviado).not.toHaveBeenCalled()
  })
})

describe('TelaConfirmarEmail com a verificação contra robôs (spec seguranca-lote-3)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('CA-457: "Reenviar o código" leva a verificação; "Confirmar" não usa nem gasta a verificação', async () => {
    const falso = ligarTurnstileFalso()
    const conta = contaFalsa()
    montarConfirmar({ conta })
    await falso.pronto()
    expect(falso.ativo().opcoes.action).toBe('reenviar')
    falso.aprovar('tok-1')
    const usuario = userEvent.setup()
    await usuario.type(campoCodigo(), '12345678')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(conta.confirmarCodigo).toHaveBeenCalledWith('maria@exemplo.com', '12345678')
    expect(falso.api.reset).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('button', { name: 'Reenviar o código' }))
    expect(conta.reenviarConfirmacao).toHaveBeenCalledWith('maria@exemplo.com', 'tok-1')
    expect(falso.api.reset).toHaveBeenCalledWith('widget-1')
  })

  it('CA-458: reenviar antes de a verificação terminar pede para esperar, e o botão não entra na espera de 60 s', async () => {
    const falso = ligarTurnstileFalso()
    const conta = contaFalsa()
    montarConfirmar({ conta })
    await falso.pronto()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reenviar o código' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Espere a verificação de segurança terminar.')
    expect(conta.reenviarConfirmacao).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Reenviar o código' })).toBeEnabled()
  })

  it('CA-461: sem o script, "Reenviar o código" segue sem a verificação; se o servidor exigir, a tela diz que a verificação não carregou', async () => {
    const falso = ligarTurnstileFalso({ carregado: false })
    const conta = contaFalsa({ reenviarConfirmacao: vi.fn(async () => ({ ok: false, erro: 'verificacao-nao-carregou' as const })) })
    montarConfirmar({ conta })
    await falso.falharScript()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Reenviar o código' }))
    expect(conta.reenviarConfirmacao).toHaveBeenCalledWith('maria@exemplo.com')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'A verificação de segurança não carregou. Confira a internet ou desative o bloqueador e recarregue a página.',
    )
  })

  it('CA-462: a verificação fica logo acima de "Reenviar o código"', async () => {
    const falso = ligarTurnstileFalso()
    montarConfirmar()
    await falso.pronto()
    expect(falso.ativo().alvo.nextElementSibling).toBe(screen.getByRole('button', { name: 'Reenviar o código' }))
  })

  it('CB-117: clique duplo em "Reenviar o código" manda um pedido só e gasta uma verificação só', async () => {
    const falso = ligarTurnstileFalso()
    const { promessa, resolver } = pedidoPendurado()
    const conta = contaFalsa({ reenviarConfirmacao: vi.fn(() => promessa) })
    montarConfirmar({ conta })
    await falso.pronto()
    falso.aprovar('tok-1')
    await userEvent.setup().dblClick(screen.getByRole('button', { name: 'Reenviar o código' }))
    resolver({ ok: true, erro: null })
    await waitFor(() => expect(screen.getByRole('button', { name: /Reenviar em 60 s/ })).toBeInTheDocument())
    expect(conta.reenviarConfirmacao).toHaveBeenCalledTimes(1)
    expect(falso.api.reset).toHaveBeenCalledTimes(1)
  })
})

describe('TelaCodigoSenha com a verificação contra robôs (spec seguranca-lote-3)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('CA-457: "Reenviar o código" pede outro código com a verificação; "Salvar a senha" não usa', async () => {
    const falso = ligarTurnstileFalso()
    const { usuario, conta } = montarCodigoSenha()
    await falso.pronto()
    expect(falso.ativo().opcoes.action).toBe('reenviar')
    expect(falso.ativo().alvo.nextElementSibling).toBe(screen.getByRole('button', { name: 'Reenviar o código' }))
    falso.aprovar('tok-2')
    await preencherSenha(usuario, '12345678', 'novasenha1')
    expect(conta.conferirCodigoDeSenha).toHaveBeenCalledWith('maria@exemplo.com', '12345678')
    expect(falso.api.reset).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('button', { name: 'Reenviar o código' }))
    expect(conta.pedirTrocaDeSenha).toHaveBeenCalledWith('maria@exemplo.com', 'tok-2')
  })
})
```

Em `e2e/conta.spec.ts`, logo depois do teste `'CA-412: a troca de senha pede o e-mail, o código e a senha nova duas vezes'` (antes do `for` do CB-48), acrescente:

```ts
  test('CA-463: sem a chave pública, as telas de conta não pedem o script da verificação', async ({ page }) => {
    const doCloudflare: string[] = []
    page.on('request', (pedido) => {
      if (pedido.url().includes('challenges.cloudflare.com')) doCloudflare.push(pedido.url())
    })
    for (const [rota, titulo] of [
      ['/#/entrar', 'Entrar'],
      ['/#/criar-conta', 'Crie sua conta'],
      ['/#/esqueci-senha', 'Esqueci a senha'],
      ['/#/esqueci-senha/codigo', 'Crie uma senha nova'],
      ['/#/confirmar-email', 'Confira seu e-mail'],
    ] as const) {
      await page.goto(rota)
      await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible()
    }
    expect(doCloudflare).toEqual([])
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/ui/publico/conta/senha.test.tsx`
Expected: FAIL nos testes novos que esperam o widget: `pronto()` estoura o tempo com "Nenhuma verificação na tela.". Os dois CA-461 já passam (sem o gancho, a tela já envia sem o token e mostra a frase que a Tarefa 2 traduz) e ficam como trava. Os testes antigos continuam passando.

- [ ] **Step 3: A verificação em "Esqueci a senha"**

Em `src/ui/publico/conta/TelaEsqueciSenha.tsx`:

1. Logo depois de `import { MolduraConta } from './MolduraConta.tsx'`, acrescente:

```tsx
import { useVerificacao } from './usarVerificacao.ts'
import { VerificacaoContraRobos } from './VerificacaoContraRobos.tsx'
```

2. Logo depois de `  const enviandoRef = useRef(false)`, acrescente `  const verificacao = useVerificacao('recuperar')`.

3. Em `enviar`, troque:

```tsx
    if (!ehEmailValido(email)) {
      setErro('email-invalido')
      return
    }
    setErro(null)
    enviandoRef.current = true
    setEnviando(true)
    // CA-144: a resposta é a mesma exista a conta ou não; só a falta de internet volta como erro.
    const resultado = await conta.pedirTrocaDeSenha(email)
```

por:

```tsx
    if (!ehEmailValido(email)) {
      setErro('email-invalido')
      return
    }
    // D-113: a verificação contra robôs vai junto. Ainda conferindo, nada sai (CA-458); sem o script, segue sem ela (D-119).
    const pedido = verificacao.tomar()
    if (!pedido.ok) {
      setErro(pedido.erro)
      return
    }
    setErro(null)
    enviandoRef.current = true
    setEnviando(true)
    // CA-144: a resposta é a mesma exista a conta ou não; só a falta de internet e a recusa da verificação voltam como erro.
    const resultado = await conta.pedirTrocaDeSenha(email, ...pedido.extra)
```

4. Troque:

```tsx
        <Button type="submit" size="lg" block loading={enviando}>
          Mandar o código
        </Button>
```

por:

```tsx
        <VerificacaoContraRobos verificacao={verificacao}>
          <Button type="submit" size="lg" block loading={enviando}>
            Mandar o código
          </Button>
        </VerificacaoContraRobos>
```

- [ ] **Step 4: A verificação no reenvio das duas telas do código**

Em `src/ui/publico/conta/TelaConfirmarEmail.tsx`:

1. Logo depois de `import { MolduraConta } from './MolduraConta.tsx'`, acrescente:

```tsx
import { useVerificacao } from './usarVerificacao.ts'
import { VerificacaoContraRobos } from './VerificacaoContraRobos.tsx'
```

2. Logo depois de `  const confirmandoRef = useRef(false)`, acrescente:

```tsx
  // D-113: só o reenvio leva a verificação; confirmar o código não usa (CA-457).
  const verificacao = useVerificacao('reenviar')
```

3. Troque:

```tsx
  const reenviar = async (): Promise<boolean> => {
    if (!ehEmailValido(digitado)) {
      setAviso('email-invalido')
      return false
    }
    const resultado = await conta.reenviarConfirmacao(digitado)
```

por:

```tsx
  const reenviar = async (): Promise<boolean> => {
    if (!ehEmailValido(digitado)) {
      setAviso('email-invalido')
      return false
    }
    const pedido = verificacao.tomar()
    if (!pedido.ok) {
      setAviso(pedido.erro)
      return false
    }
    const resultado = await conta.reenviarConfirmacao(digitado, ...pedido.extra)
```

4. Troque:

```tsx
      <BotaoReenviar rotulo={vencido ? 'Pedir um código' : 'Reenviar o código'} aoReenviar={reenviar} />
```

por:

```tsx
      <VerificacaoContraRobos verificacao={verificacao}>
        <BotaoReenviar rotulo={vencido ? 'Pedir um código' : 'Reenviar o código'} aoReenviar={reenviar} />
      </VerificacaoContraRobos>
```

Em `src/ui/publico/conta/TelaCodigoSenha.tsx`:

1. Logo depois de `import { MolduraConta } from './MolduraConta.tsx'`, acrescente:

```tsx
import { useVerificacao } from './usarVerificacao.ts'
import { VerificacaoContraRobos } from './VerificacaoContraRobos.tsx'
```

2. Logo depois de `  const codigoAceitoRef = useRef(false)`, acrescente:

```tsx
  // D-113: só o reenvio leva a verificação; conferir o código e gravar a senha não usam (CA-457).
  const verificacao = useVerificacao('reenviar')
```

3. Troque:

```tsx
  const reenviar = async (): Promise<boolean> => {
    if (!ehEmailValido(digitado)) {
      setAviso('email-invalido')
      return false
    }
    const resultado = await conta.pedirTrocaDeSenha(digitado)
```

por:

```tsx
  const reenviar = async (): Promise<boolean> => {
    if (!ehEmailValido(digitado)) {
      setAviso('email-invalido')
      return false
    }
    const pedido = verificacao.tomar()
    if (!pedido.ok) {
      setAviso(pedido.erro)
      return false
    }
    const resultado = await conta.pedirTrocaDeSenha(digitado, ...pedido.extra)
```

4. Troque:

```tsx
      <BotaoReenviar rotulo="Reenviar o código" aoReenviar={reenviar} />
```

por:

```tsx
      <VerificacaoContraRobos verificacao={verificacao}>
        <BotaoReenviar rotulo="Reenviar o código" aoReenviar={reenviar} />
      </VerificacaoContraRobos>
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run src/ui/publico/conta/senha.test.tsx`
Expected: PASS, os antigos e os novos.

Run: `npm run check`
Expected: verde.

Run (feche antes qualquer `vite preview` na porta 4173): `npx playwright test e2e/conta.spec.ts`
Expected: todos passam, inclusive o CA-463 novo e os CB-48 de 360 px (o build sai com `VITE_TURNSTILE_SITE_KEY: 'desligado'`, então nenhuma tela desenha a verificação).

- [ ] **Step 6: Commit**

`../_msg.txt`:

```text
feat(conta): senha e reenvio do código com a verificação

"Esqueci a senha" e "Reenviar o código" levam a verificação contra
robôs, logo acima do botão; sem o script do Cloudflare, o pedido segue
sem ela. Confirmar o código e gravar a senha nova não usam. Sem a
chave pública, nenhuma tela de conta pede o script.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

```bash
git add src/ui/publico/conta/TelaEsqueciSenha.tsx src/ui/publico/conta/TelaConfirmarEmail.tsx src/ui/publico/conta/TelaCodigoSenha.tsx src/ui/publico/conta/senha.test.tsx e2e/conta.spec.ts
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 6: Política de privacidade e versão dos termos

Cobre D-118 e CA-464.

**Files:**
- Modify: `src/domain/legal.ts:13-14`
- Modify: `src/domain/legal.test.ts` (o teste da versão)
- Modify: `src/ui/publico/TelaPrivacidade.tsx:54`
- Modify: `src/ui/publico/legal.test.tsx:15-16, 30, 52` e um teste novo

**Interfaces:**
- Consumes: nada das outras tarefas.
- Produces: `VERSAO_TERMOS = '2026-10-07'` e `DATA_TERMOS = '7 de outubro de 2026'`, gravados nos cadastros novos (CA-223) e mostrados no topo dos Termos e da Política.

- [ ] **Step 1: Escrever os testes que falham**

Em `src/domain/legal.test.ts`, troque o arquivo inteiro por:

```ts
import { DATA_TERMOS, VERSAO_TERMOS } from './legal.ts'

describe('versão dos termos', () => {
  it('D-118: a política ganhou a verificação contra robôs, e a versão passa a ser a do dia da publicação', () => {
    expect(VERSAO_TERMOS).toBe('2026-10-07')
    expect(DATA_TERMOS).toBe('7 de outubro de 2026')
  })
})
```

Em `src/ui/publico/legal.test.tsx`:

1. No `vi.mock`, troque `  DATA_TERMOS: '5 de outubro de 2026',` por `  DATA_TERMOS: '7 de outubro de 2026',` e `  VERSAO_TERMOS: '2026-10-05',` por `  VERSAO_TERMOS: '2026-10-07',`.
2. Troque `    expect(screen.getByText(/Versão de 5 de outubro de 2026/)).toBeInTheDocument()` por `    expect(screen.getByText(/Versão de 7 de outubro de 2026/)).toBeInTheDocument()`.
3. Troque `    expect(texto).toContain('5 de outubro de 2026')` por `    expect(texto).toContain('7 de outubro de 2026')`.
4. No fim do `describe('documentos legais')`, logo depois do teste `'M1 (LGPD): …'`, acrescente:

```tsx
  it('CA-464: a política diz, em "Onde os dados ficam", que o Cloudflare Turnstile recebe dados técnicos do navegador nas telas de conta', () => {
    render(<TelaPrivacidade />)
    const lista = screen.getByRole('heading', { name: 'Onde os dados ficam' }).nextElementSibling
    expect(lista).toHaveTextContent(
      'Nas telas de conta, o Cloudflare Turnstile recebe dados técnicos do navegador, como o endereço IP, para separar pessoas de robôs.',
    )
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/legal.test.ts src/ui/publico/legal.test.tsx`
Expected: FAIL. A versão ainda é `2026-10-05` e a política não cita o Turnstile.

- [ ] **Step 3: O texto e a versão**

Em `src/domain/legal.ts`, troque:

```ts
export const VERSAO_TERMOS = '2026-10-05'
export const DATA_TERMOS = '5 de outubro de 2026'
```

por:

```ts
export const VERSAO_TERMOS = '2026-10-07'
export const DATA_TERMOS = '7 de outubro de 2026'
```

Em `src/ui/publico/TelaPrivacidade.tsx`, troque:

```tsx
        <li>Os e-mails de confirmação e de troca de senha são enviados pelo Resend, com o endereço do MetaNutri.</li>
      </ul>
```

por:

```tsx
        <li>Os e-mails de confirmação e de troca de senha são enviados pelo Resend, com o endereço do MetaNutri.</li>
        <li>Nas telas de conta, o Cloudflare Turnstile recebe dados técnicos do navegador, como o endereço IP, para separar pessoas de robôs.</li>
      </ul>
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/domain/legal.test.ts src/ui/publico/legal.test.tsx src/ui/publico/conta/TelaCriarConta.test.tsx`
Expected: PASS (o cadastro grava a versão nova: o CA-269 compara com `VERSAO_TERMOS`).

Run: `npm run check`
Expected: verde.

- [ ] **Step 5: Commit**

`../_msg.txt`:

```text
feat(legal): política cita a verificação contra robôs

A Política de privacidade diz, em "Onde os dados ficam", que o
Cloudflare Turnstile recebe dados técnicos do navegador nas telas de
conta. A versão dos termos passa a ser 2026-10-07.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

```bash
git add src/domain/legal.ts src/domain/legal.test.ts src/ui/publico/TelaPrivacidade.tsx src/ui/publico/legal.test.tsx
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

### Tarefa 7: Documentação e validação final

Registra o lote e deixa a ordem para pôr no ar (D-116) e o jeito de desligar (D-119, R-43) prontos para o dono. Nenhum código muda aqui.

**Files:**
- Modify: `README.md:94-96, 134, 220`
- Modify: `docs/pendencias.md:125`
- Modify: `docs/decisoes.md:81`
- Modify: `.env.example` (fim do arquivo)

**Interfaces:**
- Consumes: tudo das Tarefas 1 a 6.
- Produces: nada para outras tarefas.

- [ ] **Step 1: README**

Em `README.md`:

1. Troque:

```markdown
  cancelar. Só funciona sem conta quando o Supabase não está configurado (modo local); com ele, a conta é obrigatória.
  Veja abaixo.
```

por:

```markdown
  cancelar. Só funciona sem conta quando o Supabase não está configurado (modo local); com ele, a conta é obrigatória.
  Criar conta, entrar e pedir código levam uma verificação contra robôs, escondida até o Cloudflare pedir um clique
  (passo 8 de "Projeto já ligado"). Veja abaixo.
```

2. Em "Projeto novo", passo 2, troque o começo da linha:

```markdown
2. `cp .env.example .env.local` e preencha `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e, para o checkout, `VITE_MERCADOPAGO_PUBLIC_KEY` (a Public Key do Mercado Pago). Reinicie o
```

por:

```markdown
2. `cp .env.example .env.local` e preencha `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, para o checkout, `VITE_MERCADOPAGO_PUBLIC_KEY` (a Public Key do Mercado Pago) e, para a verificação contra robôs, `VITE_TURNSTILE_SITE_KEY` (a Site Key do Turnstile, passo 8 de "Projeto já ligado"). Reinicie o
```

3. Em "Projeto já ligado", logo depois da linha `   "O pagamento não está disponível agora." Para testar na sua máquina, ponha a mesma chave no `.env.local`.`, acrescente:

````markdown
8. **Verificação contra robôs (spec seguranca-lote-3).** Cadastro, Entrar, "Esqueci a senha" e "Reenviar o código"
   levam uma verificação do Cloudflare Turnstile, que o Supabase confere no servidor. Ela fica escondida e só
   aparece, logo acima do botão, quando o Cloudflare pede um clique. No Cloudflare, em *Turnstile*, o widget
   "MetaNutri" (modo *Managed*) tem os domínios `metanutri.com.br`, `localhost` e `127.0.0.1`. A **Site Key** é
   pública e vai como variável do GitHub, que o build publicado lê:
   ```bash
   gh variable set VITE_TURNSTILE_SITE_KEY --body "<a Site Key>"
   ```
   A **Secret Key** nunca vai para o repositório nem para o chat: só para o painel do Supabase. **Ordem para ligar
   (D-116):** primeiro publique o site com a Site Key; só depois, em *Supabase > Authentication > Attack Protection*,
   ligue *Enable Captcha protection*, escolha *Turnstile*, cole a Secret Key e salve. Nunca o contrário: com o
   captcha ligado e o site antigo, ninguém entra nem se cadastra. Para conferir, crie uma conta de teste no site
   publicado. Se o script do Cloudflare não carregar (rede, bloqueador), o site tenta mesmo assim, sem a verificação
   (D-119): com o captcha ligado, o Supabase recusa e a tela diz "A verificação de segurança não carregou".
   **Se o Cloudflare cair (R-43):** desligue o captcha no mesmo painel; o login volta na hora, sem publicar o site
   de novo. Quando o Cloudflare voltar, ligue o captcha outra vez. Com o captcha ligado, o `npm run dev` só entra na
   conta com a mesma Site Key no `.env.local`.
````

- [ ] **Step 2: Pendências**

Em `docs/pendencias.md`, logo depois da linha `> Fica para depois (spec, seção 4): captcha no cadastro e no login (lote 3) e a regra de conteúdo do navegador (CSP).`, acrescente:

```markdown
>
> **Atualizado em 07/10 (segurança, lote 3):** cadastro, Entrar, "Esqueci a senha" e "Reenviar o código" passam a
> levar a verificação contra robôs do Cloudflare Turnstile, conferida pelo Supabase (spec `seguranca-lote-3`, D-113 a
> D-119). Ela fica escondida e só aparece, logo acima do botão, quando o Cloudflare pede um clique. Confirmar o código
> de 8 dígitos não usa verificação. Se o script do Cloudflare não carregar, o site tenta mesmo assim, sem a
> verificação; com o captcha ligado, a tela diz que a verificação não carregou. A Política de privacidade cita o
> Turnstile, e a versão dos termos passa a ser `2026-10-07`.
>
> **A ordem para pôr no ar (você roda; nunca ligue o captcha antes do site novo, D-116):**
>
> 1. juntar o ramo na `main` (feito pelo assistente; não publica nada sozinho);
> 2. conferir que a variável existe: `gh variable list` mostra `VITE_TURNSTILE_SITE_KEY`;
> 3. publicar o site: `gh workflow run publicar.yml --ref main`, e esperar terminar
>    (`gh run list --workflow publicar.yml --limit 1` mostra `completed` e `success`);
> 4. no site publicado, entrar com a sua conta: com o captcha ainda desligado no Supabase, tudo funciona como antes;
> 5. no Supabase, em *Authentication > Attack Protection*: ligar *Enable Captcha protection*, escolher *Turnstile*,
>    colar a **Secret Key** (só ali, nunca no chat) e salvar;
> 6. conferir: criar uma conta de teste com outro e-mail, sair, entrar de novo e pedir "Esqueci a senha".
>
> **Se o Cloudflare cair (R-43, D-119):** desligar o captcha no mesmo painel (*Authentication > Attack Protection*).
> O login volta na hora, sem publicar o site de novo: sem o script, o site já manda os pedidos sem a verificação, e o
> Supabase, com o captcha desligado, aceita. Quando o Cloudflare voltar, ligar o captcha outra vez.
>
> **Se a publicação não for em 07/10:** a versão dos termos (`VERSAO_TERMOS` e `DATA_TERMOS` em
> `src/domain/legal.ts`, e o teste em `src/domain/legal.test.ts`) deve ser a do dia em que o site vai ao ar (D-118).
>
> Fica para depois (spec, seção 4): verificação em outras ações e a regra de conteúdo do navegador (CSP), que terá
> de liberar o Cloudflare.
```

- [ ] **Step 3: Decisões e `.env.example`**

Em `docs/decisoes.md`, logo depois da linha da tabela que começa com `| 07/10/2026 | **Segurança, lote 2**`, acrescente a linha:

```markdown
| 07/10/2026 | **Segurança, lote 3** (D-113 a D-119 da `specs/seguranca-lote-3/SPEC.md`, resumidas aqui): D-113 cadastro, Entrar, "Esqueci a senha" e "Reenviar o código" exigem a verificação do Cloudflare Turnstile, conferida pelo Supabase · D-114 a verificação fica escondida e só aparece, acima do botão, quando o Cloudflare pede um clique · D-115 cada verificação vale para um pedido · D-116 primeiro o site, depois o captcha no painel · D-117 a chave pública vem da variável do GitHub · D-118 a Política cita o Turnstile e a versão dos termos muda · D-119 sem o script do Cloudflare, o site tenta sem a verificação, e desligar o captcha no painel basta para o login voltar | auditoria de segurança de 07/10/2026 (A1) | usuário |
```

Em `.env.example`, no fim do arquivo, acrescente:

```bash

# Verificação contra robôs nas telas de conta (spec seguranca-lote-3, D-117): a chave PÚBLICA do
# Cloudflare Turnstile (Cloudflare > Turnstile > o widget MetaNutri > Site Key). Ela vai no navegador
# de propósito. A chave SECRETA (Secret Key) nunca entra aqui: ela fica só no painel do Supabase.
# Sem a pública, as telas de conta não mostram a verificação e os pedidos seguem sem ela.
VITE_TURNSTILE_SITE_KEY=
```

- [ ] **Step 4: Validação completa**

Run: `npm run check`
Expected: lint, typecheck e todos os testes verdes.

Run (feche antes qualquer `vite preview` na porta 4173): `npx playwright test`
Expected: todos os testes e2e passam (o build sai sem a chave; nenhum teste carrega o script do Cloudflare).

Run: `npx vitest run -t "CA-45[4-9]|CA-46[0-4]|CB-11[6-9]|D-119"`
Expected: PASS, com pelo menos um teste para cada ID de CA-454 a CA-464, de CB-116 a CB-119 e do D-119 (confira na "Cobertura da spec" abaixo).

Run: `git grep -n "captchaToken" -- src`
Expected: só em `src/ui/estado/usarConta.ts`, `src/ui/estado/usarConta.test.ts` e `src/ui/publico/conta/usarVerificacao.ts` (o nome do item do `ExtraDoPedido`).

Run: `git grep -n "challenges.cloudflare.com" -- src e2e`
Expected: só em `src/ui/publico/conta/turnstile.ts` (o endereço), `src/ui/publico/conta/turnstile.test.ts` e `e2e/conta.spec.ts`.

Run: `git grep -n "0x4AAAA"`
Expected: nenhuma linha (as chaves reais do Turnstile começam assim; nenhuma está no repositório).

Confira, uma a uma, as linhas da "Cobertura da spec" e as "Decisões do plano". Qualquer diferença entre código e spec vai para o relatório final ao dono.

- [ ] **Step 5: Commit**

`../_msg.txt`:

```text
docs: segurança, lote 3 registrado e ordem para pôr no ar

README com o passo da verificação contra robôs, pendências com a ordem
para ligar (site antes do captcha) e o jeito de desligar se o
Cloudflare cair (só o painel do Supabase), decisões D-113 a D-119 e a
chave no .env.example.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

```bash
git add README.md docs/pendencias.md docs/decisoes.md .env.example
git -c i18n.commitEncoding=UTF-8 commit -q -F ../_msg.txt
```

---

## Cobertura da spec

| ID | Tarefa | Teste |
|---|---|---|
| CA-454 | 2, 4 | `usarConta.test.ts` › "CA-454: o cadastro leva a verificação junto com o resto do pedido"; `TelaCriarConta.test.tsx` › "CA-454: "Criar conta" leva a verificação, com a ação de cadastro, e a verificação se renova" |
| CA-455 | 2, 4 | `usarConta.test.ts` › "CA-455: entrar leva a verificação"; `TelaEntrar.test.tsx` › "CA-455: "Entrar" leva a verificação, com a ação de entrar" |
| CA-456 | 2, 5 | `usarConta.test.ts` › "CA-456: pedir o código da troca de senha leva a verificação"; `senha.test.tsx` › "CA-456: "Mandar o código" leva a verificação, com a ação de recuperar, logo acima do botão" |
| CA-457 | 2, 5 | `usarConta.test.ts` › "CA-457: reenviar o código leva a verificação; confirmar o código não"; `senha.test.tsx` › "CA-457: "Reenviar o código" leva a verificação; "Confirmar" não usa nem gasta a verificação" e "CA-457: "Reenviar o código" pede outro código com a verificação; "Salvar a senha" não usa" |
| CA-458 | 2, 3, 4, 5 | `conta.test.ts` › "CA-458, CA-460 e CA-461: as frases da verificação são as da spec"; `VerificacaoContraRobos.test.tsx` › "CA-458: antes de o script chegar ou de o Cloudflare terminar…"; `TelaEntrar.test.tsx` › "CA-458: antes de a verificação terminar, a tela pede para esperar…"; `TelaCriarConta.test.tsx` › "CA-458: … "Criar conta" pede para esperar e não cria nada"; `senha.test.tsx` › "CA-458: reenviar antes de a verificação terminar pede para esperar…" |
| CA-459 | 3, 4 | `VerificacaoContraRobos.test.tsx` › "CA-459: cada verificação sai uma vez só; ao sair, o widget se renova…"; `TelaEntrar.test.tsx` › "CA-459: depois de uma tentativa errada, a seguinte espera a verificação nova e leva ela"; o "certo" também: `TelaCriarConta.test.tsx` › "CA-454" confere o `reset` depois do cadastro aceito |
| CA-460 | 2, 4, 5 | `usarConta.test.ts` › "CA-460: a recusa da verificação num pedido que foi com o token…" e "CA-460, CA-461 e CA-144: na troca de senha…" (e as linhas novas das tabelas do `traduzir`); `TelaEntrar.test.tsx` › "CA-460: o servidor recusa a verificação…"; `senha.test.tsx` › "CA-460: o servidor recusa a verificação: a tela pede para tentar de novo e fica onde está". A renovação é a do CA-459 (o token já saiu renovando) |
| CA-461 | 1, 2, 3, 4, 5 | `turnstile.test.ts` › os três "CA-461: script que…" (o script que falha ou demora); `usarConta.test.ts` › "CA-461: a recusa da verificação num pedido que foi sem o token…" e "CA-460, CA-461 e CA-144: na troca de senha…"; `VerificacaoContraRobos.test.tsx` › "CA-461: o script não carrega: a caixa sai, nenhum aviso aparece antes da resposta, e o clique segue sem a verificação"; `TelaEntrar.test.tsx` › "CA-461: sem o script, "Entrar" segue sem a verificação…"; `senha.test.tsx` › "CA-461: sem o script, "Mandar o código" segue…" e "CA-461: sem o script, "Reenviar o código" segue…" |
| CA-462 | 1, 3, 4, 5 | `turnstile.test.ts` › "CA-462: o tema %s do site vira %s no widget"; `VerificacaoContraRobos.test.tsx` › "CA-462: escondida logo acima do botão até o Cloudflare pedir um clique, em português, no tema %s do site"; `TelaEntrar.test.tsx` › "CA-462: a verificação fica logo acima de "Entrar""; `TelaCriarConta.test.tsx` › "CA-462: … logo acima do botão de criar a conta"; `senha.test.tsx` › "CA-462: a verificação fica logo acima de "Reenviar o código"" (e a posição nos dois CA-456/CA-457) |
| CA-463 | 1, 2, 3, 4, 5 | `turnstile.test.ts` › "CA-463: com "%s", não há verificação" e "CA-463 e R-45: os testes de navegador montam o site sem a chave"; `usarConta.test.ts` › "CA-463: sem verificação, os quatro pedidos saem como antes…"; `VerificacaoContraRobos.test.tsx` › "CA-463: sem a chave, só o botão aparece…"; `TelaEntrar.test.tsx` › "CA-463: sem a chave pública, "Entrar" envia como antes…"; `e2e/conta.spec.ts` › "CA-463: sem a chave pública, as telas de conta não pedem o script da verificação". Os testes antigos das telas (CA-137, CA-409, CA-412, CA-143) seguem conferindo os argumentos exatos de hoje |
| CA-464 | 6 | `legal.test.tsx` › "CA-464: a política diz, em "Onde os dados ficam", que o Cloudflare Turnstile recebe dados técnicos do navegador nas telas de conta" |
| CB-116 | 1, 3 | `VerificacaoContraRobos.test.tsx` › "CB-116: a verificação vencida volta a "espere" até a nova chegar, sem a tela renovar por conta própria" (e o `refresh-expired: 'auto'` no CA-462) |
| CB-117 | 4, 5 | `TelaEntrar.test.tsx` › "CB-117: clique duplo em "Entrar" faz um pedido só e gasta uma verificação só"; `senha.test.tsx` › "CB-117: clique duplo em "Reenviar o código" manda um pedido só e gasta uma verificação só". Os antigos CA-134, CA-409, CB-101 e "clique duplo em "Mandar o código"" continuam |
| CB-118 | 1, 3, 5 | `turnstile.test.ts` › "CB-118: com %i px de largura, o widget é %s" e "CB-118: o flexível começa nos 300 px que o Cloudflare exige"; `VerificacaoContraRobos.test.tsx` › "CB-118: com %i px para o widget, o tamanho é %s (no celular de 360 px sobram 280)"; os e2e CB-48 de 360 px seguem passando (sem a chave) |
| CB-119 | 1, 3 | `turnstile.test.ts` › "CB-119: com o Turnstile já na página, não põe outro script"; `VerificacaoContraRobos.test.tsx` › "CB-119: sair da tela tira o widget; voltar desenha um só, sem erro", "CB-119: no modo estrito do React…" e "CB-119: sair antes de o script chegar não desenha nada depois" |
| D-113 a D-117 | 1 a 5 | as linhas acima; D-117 também em `turnstile.test.ts` › "D-117: a chave vem da variável do build…", "D-117: a chave de teste do Cloudflare também liga…" e "D-117: o site publicado recebe a chave pública de uma variável do GitHub…" |
| D-118 | 6 | `legal.test.ts` › "D-118: a política ganhou a verificação contra robôs, e a versão passa a ser a do dia da publicação" |
| D-119 | 2, 3, 4, 5 | os CA-461 acima; `VerificacaoContraRobos.test.tsx` › "D-119: o Cloudflare não confirma (erro no widget): o clique segue sem a verificação…" e "Foco: o Turnstile que recusa desenhar o widget não quebra a tela nem trava o botão…"; `TelaEntrar.test.tsx` › "D-119 e R-43: sem o script e com o captcha desligado no Supabase, "Entrar" entra normalmente" |
| R-43, R-44 | 1, 3, 4, 7 | o script uma vez, a falha e o tempo limite (`turnstile.test.ts`); o pedido sem o token e a frase do CA-461 (Tarefas 2 a 5); "D-119 e R-43…" em `TelaEntrar.test.tsx`; desligar só no painel está no README e em pendências |
| R-45 | 1, 3, 5 | `turnstile.test.ts` › "CA-463 e R-45…"; o Turnstile de mentira; o e2e CA-463 |

## Decisões do plano

Pontos que o plano decidiu, ou achou no código, e que o dono precisa saber.

1. **O token sai uma vez e a verificação se renova no clique, não depois da resposta.** `tomar()` entrega o token e já chama `reset(widgetId)`. Assim o D-115 e o CA-459 valem para todo pedido, certo ou errado, sem a tela precisar lembrar de renovar, e o Cloudflare começa a próxima verificação o mais cedo possível (menos chance de cair no "Espere…" ao tentar de novo). O token entregue continua valendo no servidor: `reset` só limpa o widget na página.
2. **No celular, o widget é o compacto (CB-118); o controlador pediu `size: 'flexible'`.** A moldura da conta deixa 280 px para o formulário num celular de 360 px (16 px de margem e 24 px de respiro de cada lado), e o flexível do Cloudflare tem 300 px no mínimo: ficaria cortado. O tamanho é escolhido pela largura da caixa ao desenhar: 300 px ou mais, flexível; menos, compacto (150 × 140 px). Girar o celular depois não troca o tamanho; o compacto cabe sempre.
3. **"Escondida" é uma caixa de altura zero, com `aria-hidden`.** Ela abre no `before-interactive-callback` (o Cloudflare pediu o clique) e fecha quando o token chega ou quando a verificação se renova. Assim não sobra espaço vazio entre o formulário e o botão. Se o Cloudflare mostrar a própria tela de erro sem pedir clique, ela fica escondida; o `error-callback` marca a falha e o clique segue sem a verificação (item 6).
4. **Nas duas telas do código, a verificação fica acima de "Reenviar o código", não de "Confirmar" ou "Salvar a senha".** É o único botão dali que a usa (CA-457). A ação é `reenviar` nas duas, embora na tela da senha o pedido seja o mesmo do "Esqueci a senha".
5. **A frase do CA-461 só aparece depois da recusa do servidor, nunca ao abrir a tela.** Quando o script falha, a caixa da verificação sai e a tela fica igual à de hoje (D-119: o pedido segue). Quem decide se faltou a verificação é o `useConta`, que sabe se o pedido levou o token: `captcha_failed` num pedido **sem** o token vira a frase do CA-461; num pedido **com** o token, a do CA-460. Com o captcha desligado no Supabase, o pedido sem token passa e nenhuma frase aparece.
6. **O widget que falha também libera o pedido sem o token, e se renova.** O `error-callback` (desafio que falhou, Cloudflare fora com o script em cache, navegador sem suporte) não tem frase própria na spec. Travar o botão ali iria contra o D-119 (desligar o captcha no painel não destravaria a tela), então o clique segue sem o token, o widget recomeça para a próxima tentativa, e uma recusa do servidor mostra a frase do CA-461. O `render` que lança (chave com formato errado, caixa inválida) conta como script que não carregou. Enquanto o script carrega (até 20 s) ou o Cloudflare confere, sem falha ainda, continua o CA-458.
7. **"Esqueci a senha" passa a mostrar a recusa da verificação (CA-460 ou CA-461), uma exceção ao CA-144.** Hoje a tela cala todo erro, menos a falta de internet, para não revelar quem tem conta. O servidor do Supabase confere a verificação antes de procurar a conta, então mostrar a recusa não revela nada; calar deixaria a pessoa esperando um código que nunca vem.
8. **O token passa como último argumento opcional dos quatro pedidos de `useConta`, e as telas espalham `...pedido.extra`.** Sem a chave, `extra` é vazio e a chamada fica idêntica à de hoje: os testes antigos que conferem os argumentos exatos (CA-137, CA-409, CA-412, CA-143) continuam valendo sem mudança. O TypeScript do projeto aceita o espalhamento (conferido com o compilador do projeto).
9. **Só uma chave no formato do Turnstile liga a verificação; os testes usam "desligado".** O `test.env` do `vite.config.ts` e o `env` do Playwright põem `VITE_TURNSTILE_SITE_KEY: 'desligado'` (o mesmo jeito do Supabase nos e2e: um texto não vazio passa pelo `npm run build` do Windows sem risco de virar "variável ausente", e aí o Vite leria a do `.env.local`). Isso protege os testes quando o dono puser a chave no `.env.local` para testar em `localhost`, que está nos domínios do widget.
10. **R-43 se resolve só no painel do Supabase (D-119, decisão do dono em 07/10/2026).** Sem o script do Cloudflare, ou com o widget em falha, a tela manda o pedido sem o token; desligar o captcha em *Authentication > Attack Protection* faz o login voltar na hora, sem mexer na variável nem publicar o site. README e pendências dizem isso. Efeito colateral aceito: sem a chave pública e com o captcha ligado (só num `npm run dev` apontado para a produção), a recusa também mostra a frase do CA-461, porque o pedido foi sem o token.
11. **O tema segue o tema aplicado do site e redesenha o widget se ele mudar com a tela aberta.** O gancho lê o `ContextoTema` direto (sem `useTema`, que exige o provedor): fora dele, como nos testes das telas, o tema é `auto`. Redesenhar pede uma verificação nova.
12. **A verificação depende só da chave, não de `conta.disponivel`.** Com a chave e sem o Supabase (só em desenvolvimento), o script carrega à toa; sem efeito para quem usa.
13. **Versão dos termos `2026-10-07` (dia do plano).** Se o site for ao ar em outro dia, `VERSAO_TERMOS`, `DATA_TERMOS` e o teste mudam antes de publicar (anotado em pendências). O teste que conferia a data do CA-391 passa a conferir a do D-118; o CA-391 continua coberto em `legal.test.tsx`. A frase da Política acrescenta "como o endereço IP", para dizer qual dado técnico vai.
14. **Tudo da verificação mora em `src/ui/publico/conta/`, inclusive o gancho.** Os ganchos do projeto costumam ficar em `src/ui/estado/`, mas este só serve às telas de conta (outras ações estão fora de escopo) e muda junto com o módulo e o componente.
15. **`response-field: false`.** O Turnstile não põe campo escondido dentro do formulário; o token vai só pelo JavaScript.
16. **Conferido antes de entregar o plano, numa cópia fora do repositório:** com as sete tarefas aplicadas ao pé da letra, o typecheck passa, o ESLint passa nos arquivos mudados (foi assim que apareceu a regra `react-hooks/refs` que obrigou a desmontar `verificacao` no componente) e os 140 arquivos de teste de unidade passam (2424 testes, conferido de novo depois da emenda do D-119). O Playwright não foi rodado nessa conferência: roda nas Tarefas 5 e 7.
17. **Arquivos além dos que a spec cita:** `vite.config.ts` e `playwright.config.ts` (testes sem a chave), `e2e/conta.spec.ts` (CA-463 no navegador), `.env.example` (a chave documentada), `docs/decisoes.md` (D-113 a D-119, como no lote 2). O `SECURITY-AUDIT.md` não entra no plano: ele fica só no computador do dono (fora do Git, repositório público) e é atualizado pelo controlador.
