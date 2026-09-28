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
