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

/**
 * D-119 (R-43): o prazo do widget desenhado. Passado esse tempo sem o token, sem erro e sem desafio aberto
 * para a pessoa, o widget conta como falha, e o clique segue sem o token.
 */
const PRAZO_DO_WIDGET_MS = 30_000

export function useVerificacao(acao: AcaoDaVerificacao): Verificacao {
  const chave = chaveDaVerificacao()
  const tema = temaDoWidget(useContext(ContextoTema)?.aplicado ?? null)
  const container = useRef<HTMLDivElement>(null)
  const apiRef = useRef<ApiDoTurnstile | null>(null)
  const widgetRef = useRef<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  const widgetFalhouRef = useRef(false)
  /** Recomeça o prazo do widget na tela (D-119); nulo enquanto nenhum widget está desenhado. */
  const recomecarPrazoRef = useRef<(() => void) | null>(null)
  const [visivel, setVisivel] = useState(false)
  const [naoCarregou, setNaoCarregou] = useState(false)

  useEffect(() => {
    const alvo = container.current
    if (chave === null || alvo === null) return
    // `vivo` cala o widget que já saiu: resposta atrasada dele não vale para a tela nova (CB-119).
    let vivo = true
    let desenhado: { readonly api: ApiDoTurnstile; readonly id: string } | null = null
    // D-119: o prazo corre enquanto a tela espera o token sem desafio aberto. Ao vencer, conta como falha.
    let prazo: ReturnType<typeof setTimeout> | undefined
    const pararPrazo = () => {
      clearTimeout(prazo)
      prazo = undefined
    }
    // D-119: o desafio falhou (rede, Cloudflare fora), ficou sem resposta, o navegador não roda o
    // Turnstile, ou o prazo venceu. O próximo clique segue sem o token, e o widget se renova.
    const falhou = () => {
      if (!vivo) return
      pararPrazo()
      tokenRef.current = null
      widgetFalhouRef.current = true
    }
    const contarPrazo = () => {
      pararPrazo()
      if (vivo) prazo = setTimeout(falhou, PRAZO_DO_WIDGET_MS)
    }
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
          pararPrazo()
          tokenRef.current = token
          widgetFalhouRef.current = false
          setVisivel(false)
        },
        // CB-116: o Cloudflare renova sozinho; até o novo chegar, o clique pede para esperar, dentro do prazo.
        'expired-callback': () => {
          if (!vivo) return
          tokenRef.current = null
          contarPrazo()
        },
        'error-callback': falhou,
        'timeout-callback': falhou,
        'unsupported-callback': falhou,
        // O Cloudflare mostra um desafio à pessoa: o prazo para enquanto ela responde.
        'before-interactive-callback': () => {
          if (!vivo) return
          pararPrazo()
          setVisivel(true)
        },
        'after-interactive-callback': () => {
          if (vivo && tokenRef.current === null) contarPrazo()
        },
      })
      if (typeof id !== 'string') throw new Error('O widget da verificação não abriu.')
      desenhado = { api, id }
      apiRef.current = api
      widgetRef.current = id
      recomecarPrazoRef.current = contarPrazo
      contarPrazo()
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
      pararPrazo()
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
      recomecarPrazoRef.current = null
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
    // D-119: o widget renovado tem de novo o prazo inteiro para entregar o token.
    recomecarPrazoRef.current?.()
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
