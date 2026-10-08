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
  /** D-119: o desafio que pediu um clique não foi resolvido a tempo. */
  readonly 'timeout-callback': () => void
  /** D-119: o navegador não roda o Turnstile. */
  readonly 'unsupported-callback': () => void
  readonly 'before-interactive-callback': () => void
  /** O desafio que pediu um clique fechou (com ou sem o token). */
  readonly 'after-interactive-callback': () => void
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
