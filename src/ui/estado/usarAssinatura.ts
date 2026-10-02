// Lê a assinatura da conta e manda assinar, cancelar e trocar o cartão (spec
// checkout-proprio). O preço não passa por aqui (CA-375): o navegador manda o plano, o
// ciclo e o código de uso único do cartão, e quem decide o valor é a função `assinar`.
// Um pedido por vez (CA-371, CB-92). Depois de cada resposta, a linha é lida de novo,
// para a tela mostrar o que o servidor gravou (CA-372, CB-93).
import { useCallback, useEffect, useRef, useState } from 'react'
import { daLinhaAssinatura, SEM_ASSINATURA, type Assinatura } from '@/domain/assinatura.ts'
import { mensagemDaRecusa, SERVIDOR_FORA, type DadosDoCartao } from '@/domain/cartao.ts'
import { VAGAS_PRECO_FUNDADOR, type Ciclo } from '@/domain/conta.ts'
import type { PlanoPago } from '../navegacao.ts'
import { obterSupabase } from './supabase.ts'

export type ResultadoDaAssinatura =
  | { readonly ok: true; readonly ativa: boolean; readonly proximaCobranca: string | null }
  | { readonly ok: false; readonly erro: string }

export type ResultadoDaMudanca = { readonly ok: true } | { readonly ok: false; readonly erro: string }

export interface ValorAssinatura {
  readonly assinatura: Assinatura
  /** A primeira resposta do servidor chegou (ou não há sessão, ou não há servidor). */
  readonly carregado: boolean
  /** Um pedido de assinar, cancelar ou trocar o cartão está em andamento. */
  readonly carregando: boolean
  /** Vagas de preço de fundador que sobram. `null` quando o servidor não respondeu (CA-160). */
  readonly vagasRestantes: number | null
  readonly assinar: (plano: PlanoPago, ciclo: Ciclo, cartao: DadosDoCartao) => Promise<ResultadoDaAssinatura>
  readonly cancelar: () => Promise<ResultadoDaMudanca>
  readonly trocarCartao: (cartao: DadosDoCartao) => Promise<ResultadoDaMudanca>
  readonly recarregar: () => void
}

export const SEM_NUVEM = 'A conta na nuvem não está configurada neste MetaNutri.'
export const PEDIDO_EM_ANDAMENTO = 'Espere terminar o pedido anterior.'
export const SESSAO_TERMINOU = 'Sua sessão terminou. Entre de novo na sua conta e tente outra vez.'

/** O que deu errado: `status` nulo é rede ou servidor fora (CA-374). */
interface Falha {
  readonly status: number | null
  readonly erro: string | null
  readonly codigo: string | null
}

const SEM_RESPOSTA: Falha = { status: null, erro: null, codigo: null }

const ehResposta = (valor: unknown): valor is { readonly status: number; json(): Promise<unknown> } =>
  typeof valor === 'object' &&
  valor !== null &&
  typeof (valor as { readonly status?: unknown }).status === 'number' &&
  typeof (valor as { readonly json?: unknown }).json === 'function'

/** A função responde erro com `{ erro, codigo }` no corpo; o supabase-js guarda a resposta em `context`. */
async function lerFalha(erro: unknown): Promise<Falha> {
  const contexto = typeof erro === 'object' && erro !== null && 'context' in erro ? (erro as { readonly context: unknown }).context : null
  if (!ehResposta(contexto)) return SEM_RESPOSTA
  try {
    const corpo: unknown = await contexto.json()
    const o = typeof corpo === 'object' && corpo !== null ? (corpo as Record<string, unknown>) : {}
    const frase = o['erro']
    const codigo = o['codigo']
    return { status: contexto.status, erro: typeof frase === 'string' ? frase : null, codigo: typeof codigo === 'string' ? codigo : null }
  } catch {
    return { status: contexto.status, erro: null, codigo: null }
  }
}

/** CA-373 e CB-90: a recusa (402) em português pelo código; o resto, a frase do servidor; sem resposta, CA-374. */
function mensagemDaFalha(falha: Falha): string {
  if (falha.status === null) return SERVIDOR_FORA
  if (falha.status === 402) return mensagemDaRecusa(falha.codigo)
  if (falha.status === 401 && falha.erro === null) return SESSAO_TERMINOU
  return falha.erro ?? SERVIDOR_FORA
}

/** Sem resposta, erro de servidor ou conflito: o servidor pode ter mudado algo, então a tela lê de novo. A recusa (402) não muda nada. */
const ehAmbigua = (falha: Falha): boolean => falha.status === null || falha.status >= 500 || falha.status === 409

async function chamar<T>(nome: string, corpo: Record<string, unknown>): Promise<{ readonly dados: T | null; readonly falha: Falha | null }> {
  const cliente = obterSupabase()
  if (!cliente) return { dados: null, falha: { status: 0, erro: SEM_NUVEM, codigo: null } }
  try {
    const { data, error } = await cliente.functions.invoke<T>(nome, { body: corpo })
    if (error) return { dados: null, falha: await lerFalha(error) }
    return { dados: data, falha: null }
  } catch {
    return { dados: null, falha: SEM_RESPOSTA }
  }
}

/** D-70: o navegador manda o código do cartão e, para mostrar em Conta e plano, a bandeira e o final. */
const doCartao = (cartao: DadosDoCartao) => ({ card_token_id: cartao.token, cartao: { bandeira: cartao.bandeira, final: cartao.final } })

export function useAssinatura(temSessao: boolean): ValorAssinatura {
  // Guardar a chave junto com o resultado deixa "sem assinatura" ser derivado do
  // render. Se o efeito tivesse que zerar o estado ao sair da conta, seria um
  // setState dentro de efeito, que dispara renderização em cascata.
  const [carga, setCarga] = useState<{ readonly chave: string; readonly assinatura: Assinatura } | null>(null)
  const [usadas, setUsadas] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [versao, setVersao] = useState(0)
  const [cliente] = useState(() => obterSupabase())
  const ocupado = useRef(false)

  const chave = temSessao ? `com-sessao:${versao}` : 'sem-sessao'
  const assinatura = carga?.chave === chave ? carga.assinatura : SEM_ASSINATURA
  const carregado = !temSessao || cliente === null || carga?.chave === chave

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useEffect(() => {
    if (!cliente || !temSessao) return
    let vivo = true
    // A linha inteira: se o 008 ainda não rodou no banco, as colunas do cartão só faltam, e nada quebra.
    void cliente
      .from('assinaturas')
      .select('*')
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

  /** Um pedido por vez: o segundo, enquanto o primeiro corre, nem sai (CA-371, CB-92). */
  const umPorVez = useCallback(async <T>(ocupadoAgora: T, fazer: () => Promise<T>): Promise<T> => {
    if (ocupado.current) return ocupadoAgora
    ocupado.current = true
    setCarregando(true)
    try {
      return await fazer()
    } finally {
      ocupado.current = false
      setCarregando(false)
    }
  }, [])

  const assinar = useCallback(
    (plano: PlanoPago, ciclo: Ciclo, cartao: DadosDoCartao) =>
      umPorVez<ResultadoDaAssinatura>({ ok: false, erro: PEDIDO_EM_ANDAMENTO }, async () => {
        const { dados, falha } = await chamar<{ readonly status?: unknown; readonly proximaCobranca?: unknown }>('assinar', { plano, ciclo, ...doCartao(cartao) })
        if (falha) {
          // A resposta pode ter se perdido depois de o servidor cobrar: lê de novo para o app não ficar no Free.
          if (ehAmbigua(falha)) recarregar()
          return { ok: false, erro: mensagemDaFalha(falha) }
        }
        // CA-372: o plano pago já vale no app, lido do servidor.
        recarregar()
        const proxima = dados?.proximaCobranca
        return { ok: true, ativa: dados?.status === 'ativa', proximaCobranca: typeof proxima === 'string' ? proxima : null }
      }),
    [umPorVez, recarregar],
  )

  const cancelar = useCallback(
    () =>
      umPorVez<ResultadoDaMudanca>({ ok: false, erro: PEDIDO_EM_ANDAMENTO }, async () => {
        const { falha } = await chamar('gerenciar-assinatura', { acao: 'cancelar' })
        // CB-93: deu certo ou não, a tela passa a mostrar o que o servidor tem.
        recarregar()
        return falha ? { ok: false, erro: mensagemDaFalha(falha) } : { ok: true }
      }),
    [umPorVez, recarregar],
  )

  const trocarCartao = useCallback(
    (cartao: DadosDoCartao) =>
      umPorVez<ResultadoDaMudanca>({ ok: false, erro: PEDIDO_EM_ANDAMENTO }, async () => {
        const { falha } = await chamar('gerenciar-assinatura', { acao: 'trocar_cartao', ...doCartao(cartao) })
        recarregar()
        return falha ? { ok: false, erro: mensagemDaFalha(falha) } : { ok: true }
      }),
    [umPorVez, recarregar],
  )

  const vagasRestantes = usadas === null ? null : Math.max(0, VAGAS_PRECO_FUNDADOR - usadas)
  return { assinatura, carregado, carregando, vagasRestantes, assinar, cancelar, trocarCartao, recarregar }
}
