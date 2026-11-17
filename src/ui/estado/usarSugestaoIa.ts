// O pedido à função sugerir-plano no navegador (spec assistente-ia, D-1306, D-1330, D-1347 e D-1354): o contador pelo
// modo `uso`; um pedido por vez (CB-1301); a cópia da conta vai à nuvem antes, para a autorização recém-ligada já estar
// lá (CA-2403); sem internet nada sai (CB-1315); "Cancelar" só fecha a espera e descarta a resposta que chegar depois
// (o servidor não para, D-1330). O navegador nunca fala com a Anthropic: só com a função (D-1324).
// D-1366: a espera e a resposta ficam na aba pelo dono (o caso e o paciente do plano), fora do componente: a tela do
// plano pode sair no meio da espera, e a resposta que chegar fica para quando ela voltar ao mesmo plano.
import { useCallback, useState, useSyncExternalStore } from 'react'
import type { ContextoDaResposta, CorpoDoPedidoIa, UsoDoMes } from '../../../supabase/functions/_shared/iaContrato.ts'
import { erroDaIa, lerRespostaDaFuncao, lerUso, type ErroDaIa, type FalhaDaIa, type RespostaDaFuncao } from '@/domain/iaGaveta.ts'
import { useNuvem } from './contextoNuvem.ts'
import { aoEsquecerTudo } from './memoriaDaAba.ts'
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
  /** D-1368: outro plano da aba espera a IA; este não pede até ela terminar. */
  readonly outroEsperando: boolean
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

// ---------- A espera de cada plano, na aba (D-1366) ----------

interface Espera {
  readonly estado: EstadoDaSugestao
  /** A vez do pedido: cancelar troca a vez, e a resposta da vez velha não muda nada (CB-1300). */
  readonly vez: number
}

/** Só os donos fora do pedido têm espera guardada: a volta ao pedido a apaga. */
const esperas = new Map<string, Espera>()
let ultimaVez = 0
/** D-1368: um pedido por vez na aba: o dono e a vez do pedido que está saindo. */
let emAndamento: { readonly dono: string; readonly vez: number } | null = null
const donoEmAndamento = (): string | null => emAndamento?.dono ?? null
const ouvintes = new Set<() => void>()
const avisar = () => {
  for (const ouvir of ouvintes) ouvir()
}
const assinar = (ouvir: () => void) => {
  ouvintes.add(ouvir)
  return () => {
    ouvintes.delete(ouvir)
  }
}
const estadoDe = (dono: string): EstadoDaSugestao => esperas.get(dono)?.estado ?? PEDIDO
const vezDe = (dono: string): number | null => esperas.get(dono)?.vez ?? null
function mudar(dono: string, estado: EstadoDaSugestao, vez: number | null = vezDe(dono)): void {
  if (estado.fase === 'pedido' || vez === null) esperas.delete(dono)
  else esperas.set(dono, { estado, vez })
  // A espera que acabou (ou foi cancelada) libera a aba.
  if (emAndamento !== null && emAndamento.dono === dono && (estado.fase !== 'esperando' || vez !== emAndamento.vez)) emAndamento = null
  avisar()
}
aoEsquecerTudo(() => {
  esperas.clear()
  emAndamento = null
  avisar()
})

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

/**
 * `dono` é o caso e o paciente do plano (D-1356): a espera, a resposta e o erro são dele, e a mesma tela que volta a ele
 * os reencontra (D-1366). O contador do mês é da conta e fica com quem o leu.
 */
export function useSugestaoIa(dono: string, dependencias?: DependenciasDaSugestao): ValorSugestaoIa {
  const padrao = useDependenciasPadrao()
  const d = dependencias ?? padrao
  const estado = useSyncExternalStore(assinar, () => estadoDe(dono))
  const [uso, setUso] = useState<UsoDoMes | null>(null)
  const ocupado = estado.fase === 'esperando'
  const quemEspera = useSyncExternalStore(assinar, donoEmAndamento)
  const outroEsperando = quemEspera !== null && quemEspera !== dono

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
      // CB-1301 e D-1368: um pedido por vez neste plano e na aba.
      if (estadoDe(dono).fase === 'esperando' || emAndamento !== null) return
      const minha = ++ultimaVez
      const falhou = (falha: FalhaDaIa) => mudar(dono, { fase: 'erro', erro: erroDaIa(falha, uso, new Date()) }, minha)
      if (!estaOnline()) return falhou(SEM_CONEXAO)
      emAndamento = { dono, vez: minha }
      mudar(dono, { fase: 'esperando', inicio: Date.now() }, minha)
      // A resposta só vale enquanto a vez é esta: cancelar (ou fechar) a troca, e a tela que saiu do plano não.
      const valeAinda = () => vezDe(dono) === minha
      let lido: Awaited<ReturnType<DependenciasDaSugestao['chamar']>>
      try {
        if (salvarAgora && !(await salvarAgora())) {
          if (valeAinda()) falhou(SEM_CONEXAO)
          return
        }
        lido = await chamar(FUNCAO_DA_IA, { ...corpo })
      } catch {
        // As duas não lançam; se lançarem, a espera não fica presa.
        if (valeAinda()) falhou(SEM_CONEXAO)
        return
      }
      const { dados, falha } = lido
      if (!valeAinda()) return
      if (falha) {
        falhou(falha)
        if (falha.status === 429 && falha.codigo === 'limite-mes') lerUsoAgora()
        return
      }
      const lida = lerRespostaDaFuncao(dados, contexto)
      if (!lida) return falhou(RESPOSTA_INVALIDA)
      mudar(dono, { fase: 'resposta', resposta: lida }, minha)
      if (lida.uso) setUso(lida.uso)
      else {
        // D-1355: a função não conseguiu reler o contador, mas a sugestão já contou. Fica a estimativa e o pedido de
        // releitura; o contador vazio nunca faz a sugestão sumir.
        setUso((antes) => (antes ? { ...antes, usados: antes.usados + 1 } : null))
        lerUsoAgora()
      }
    },
    [dono, chamar, salvarAgora, estaOnline, uso, lerUsoAgora],
  )

  const cancelar = useCallback(() => mudar(dono, PEDIDO), [dono])

  const voltar = useCallback(() => mudar(dono, PEDIDO), [dono])

  return { estado, uso, ocupado, outroEsperando, lerUso: lerUsoAgora, pedir, cancelar, voltar }
}
