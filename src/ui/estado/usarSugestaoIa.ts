// O pedido à função sugerir-plano no navegador (spec assistente-ia, D-1306, D-1330, D-1347 e D-1354): o contador pelo
// modo `uso`; um pedido por vez (CB-1301); a cópia da conta vai à nuvem antes, para a autorização recém-ligada já estar
// lá (CA-2403); sem internet nada sai (CB-1315); "Cancelar" só fecha a espera e descarta a resposta que chegar depois
// (o servidor não para, D-1330). O navegador nunca fala com a Anthropic: só com a função (D-1324).
import { useCallback, useRef, useState } from 'react'
import type { ContextoDaResposta, CorpoDoPedidoIa, UsoDoMes } from '../../../supabase/functions/_shared/iaContrato.ts'
import { erroDaIa, lerRespostaDaFuncao, lerUso, type ErroDaIa, type FalhaDaIa, type RespostaDaFuncao } from '@/domain/iaGaveta.ts'
import { useNuvem } from './contextoNuvem.ts'
import { obterSupabase } from './supabase.ts'

export const FUNCAO_DA_IA = 'sugerir-plano'

export type EstadoDaSugestao =
  | { readonly fase: 'pedido' }
  | { readonly fase: 'esperando'; readonly inicio: number }
  | { readonly fase: 'resposta'; readonly resposta: RespostaDaFuncao }
  | { readonly fase: 'erro'; readonly erro: ErroDaIa }

export interface DependenciasDaSugestao {
  readonly chamar: (nome: string, corpo: Record<string, unknown>) => Promise<{ readonly dados: unknown; readonly falha: FalhaDaIa | null }>
  /** Manda a cópia de trabalho à nuvem; nulo sem nuvem (o app sem servidor). */
  readonly salvarAgora: (() => Promise<boolean>) | null
  readonly online: () => boolean
}

export interface ValorSugestaoIa {
  readonly estado: EstadoDaSugestao
  /** O contador do mês; nulo enquanto não foi lido, ou quando a função não respondeu (CB-1321). */
  readonly uso: UsoDoMes | null
  readonly ocupado: boolean
  readonly lerUso: () => void
  readonly pedir: (corpo: CorpoDoPedidoIa, contexto: ContextoDaResposta) => Promise<void>
  /** CA-2366: volta ao pedido; a resposta que chegar depois é descartada. */
  readonly cancelar: () => void
  /** Do erro ou da resposta de volta ao pedido. */
  readonly voltar: () => void
}

const PEDIDO: EstadoDaSugestao = { fase: 'pedido' }
const SEM_CONEXAO: FalhaDaIa = { status: null, codigo: null, erro: null }
const RESPOSTA_INVALIDA: FalhaDaIa = { status: 502, codigo: 'resposta-invalida', erro: null }

const online = () => globalThis.navigator?.onLine !== false

const ehResposta = (v: unknown): v is { readonly status: number; json(): Promise<unknown> } =>
  typeof v === 'object' && v !== null && typeof (v as { readonly status?: unknown }).status === 'number' && typeof (v as { readonly json?: unknown }).json === 'function'

/**
 * A chamada à função com a sessão da conta, como as de cobrança (`{ erro, codigo }` no corpo do erro). Sem servidor
 * configurado, status 0; sem resposta (sem internet), status nulo. Nunca lança.
 */
async function chamarFuncao(nome: string, corpo: Record<string, unknown>): Promise<{ readonly dados: unknown; readonly falha: FalhaDaIa | null }> {
  try {
    const cliente = obterSupabase()
    if (!cliente) return { dados: null, falha: { status: 0, codigo: null, erro: null } }
    const { data, error } = await cliente.functions.invoke<unknown>(nome, { body: corpo })
    if (!error) return { dados: data, falha: null }
    const contexto: unknown = typeof error === 'object' && error !== null && 'context' in error ? (error as { readonly context: unknown }).context : null
    if (!ehResposta(contexto)) return { dados: null, falha: SEM_CONEXAO }
    try {
      const lido: unknown = await contexto.json()
      const o = typeof lido === 'object' && lido !== null ? (lido as Record<string, unknown>) : {}
      return { dados: null, falha: { status: contexto.status, codigo: typeof o['codigo'] === 'string' ? o['codigo'] : null, erro: typeof o['erro'] === 'string' ? o['erro'] : null } }
    } catch {
      return { dados: null, falha: { status: contexto.status, codigo: null, erro: null } }
    }
  } catch {
    return { dados: null, falha: SEM_CONEXAO }
  }
}

function useDependenciasPadrao(): DependenciasDaSugestao {
  const nuvem = useNuvem()
  return { chamar: chamarFuncao, salvarAgora: nuvem ? nuvem.salvarAgora : null, online }
}

export function useSugestaoIa(dependencias?: DependenciasDaSugestao): ValorSugestaoIa {
  const padrao = useDependenciasPadrao()
  const d = dependencias ?? padrao
  const [estado, setEstado] = useState<EstadoDaSugestao>(PEDIDO)
  const [uso, setUso] = useState<UsoDoMes | null>(null)
  const [ocupado, setOcupado] = useState(false)
  // A vez do pedido: cancelar troca a vez, e a resposta da vez velha não muda nada (CB-1300).
  const vez = useRef(0)
  const emAndamento = useRef(false)

  const { chamar, salvarAgora } = d
  const estaOnline = d.online

  const lerUsoAgora = useCallback(() => {
    void chamar(FUNCAO_DA_IA, { modo: 'uso' }).then(({ dados, falha }) => {
      if (falha) return
      const lido = typeof dados === 'object' && dados !== null ? lerUso((dados as Record<string, unknown>)['uso']) : null
      if (lido) setUso(lido)
    })
  }, [chamar])

  const pedir = useCallback(
    async (corpo: CorpoDoPedidoIa, contexto: ContextoDaResposta) => {
      if (emAndamento.current) return
      const minha = ++vez.current
      const falhou = (falha: FalhaDaIa) => setEstado({ fase: 'erro', erro: erroDaIa(falha, uso, new Date()) })
      if (!estaOnline()) return falhou(SEM_CONEXAO)
      emAndamento.current = true
      setOcupado(true)
      setEstado({ fase: 'esperando', inicio: Date.now() })
      try {
        if (salvarAgora && !(await salvarAgora())) {
          if (vez.current === minha) falhou(SEM_CONEXAO)
          return
        }
        const { dados, falha } = await chamar(FUNCAO_DA_IA, { ...corpo })
        if (vez.current !== minha) return
        if (falha) {
          falhou(falha)
          if (falha.status === 429 && falha.codigo === 'limite-mes') lerUsoAgora()
          return
        }
        const lida = lerRespostaDaFuncao(dados, contexto)
        if (!lida) return falhou(RESPOSTA_INVALIDA)
        setUso(lida.uso)
        setEstado({ fase: 'resposta', resposta: lida })
      } finally {
        if (vez.current === minha) {
          emAndamento.current = false
          setOcupado(false)
        }
      }
    },
    [chamar, salvarAgora, estaOnline, uso, lerUsoAgora],
  )

  const cancelar = useCallback(() => {
    vez.current += 1
    emAndamento.current = false
    setOcupado(false)
    setEstado(PEDIDO)
  }, [])

  const voltar = useCallback(() => setEstado(PEDIDO), [])

  return { estado, uso, ocupado, lerUso: lerUsoAgora, pedir, cancelar, voltar }
}
