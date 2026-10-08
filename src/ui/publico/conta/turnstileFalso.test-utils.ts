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
