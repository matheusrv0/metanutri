// Lê a assinatura da conta e manda assinar. O preço não passa por aqui: quem decide
// valor é a Edge Function, porque preço vindo do navegador é preço escolhido por
// quem paga.
import { useCallback, useEffect, useState } from 'react'
import { daLinhaAssinatura, SEM_ASSINATURA, type Assinatura } from '@/domain/assinatura.ts'
import type { IdPlano } from '@/domain/conta.ts'
import { obterSupabase } from './supabase.ts'

export interface ValorAssinatura {
  readonly assinatura: Assinatura
  readonly carregando: boolean
  /** Devolve a mensagem de erro, ou nulo quando o navegador foi levado ao pagamento. */
  readonly assinar: (plano: IdPlano) => Promise<string | null>
  readonly recarregar: () => void
}

export function useAssinatura(temSessao: boolean): ValorAssinatura {
  // Guardar a chave junto com o resultado deixa "sem assinatura" ser derivado do
  // render. Se o efeito tivesse que zerar o estado ao sair da conta, seria um
  // setState dentro de efeito, que dispara renderização em cascata.
  const [carga, setCarga] = useState<{ readonly chave: string; readonly assinatura: Assinatura } | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [versao, setVersao] = useState(0)

  const chave = temSessao ? `com-sessao:${versao}` : 'sem-sessao'
  const assinatura = carga?.chave === chave ? carga.assinatura : SEM_ASSINATURA

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useEffect(() => {
    const cliente = obterSupabase()
    if (!cliente || !temSessao) return

    let vivo = true
    void cliente
      .from('assinaturas')
      .select('plano, status, preco_travado')
      .maybeSingle()
      .then(({ data }) => {
        if (vivo) setCarga({ chave, assinatura: daLinhaAssinatura(data) })
      })

    return () => {
      vivo = false
    }
  }, [temSessao, chave])

  const assinar = useCallback(async (plano: IdPlano): Promise<string | null> => {
    const cliente = obterSupabase()
    if (!cliente) return 'A conta na nuvem não está configurada neste MetaNutri.'

    setCarregando(true)
    try {
      const { data, error } = await cliente.functions.invoke<{ pagamento?: string; erro?: string }>('assinar', { body: { plano } })
      if (error) return 'Não consegui falar com o servidor de cobrança. Tente de novo em alguns minutos.'
      if (!data?.pagamento) return data?.erro ?? 'O servidor de cobrança não devolveu o link de pagamento.'

      // O pagamento acontece no Mercado Pago, não aqui: nenhum dado de cartão
      // encosta no MetaNutri.
      globalThis.location.assign(data.pagamento)
      return null
    } finally {
      setCarregando(false)
    }
  }, [])

  return { assinatura, carregando, assinar, recarregar }
}
