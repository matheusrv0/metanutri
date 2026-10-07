// O pedido do plano Estudante: lê o mais recente e envia comprovante + dados.
// O arquivo vai primeiro para o balde privado; o pedido só nasce se o banco
// aceitar. Se o banco recusar, o arquivo enviado é apagado (foco de revisão 2).
import { useCallback, useEffect, useState } from 'react'
import { caminhoDoComprovante, daLinhaPedido, LIMITE_DE_COMPROVANTES, MENSAGEM_COMPROVANTES_DEMAIS, type PedidoEstudante } from '@/domain/pedidoEstudante.ts'
import { FALHA_DE_REDE, mensagemDoBanco } from './mensagemDoBanco.ts'
import { obterSupabase } from './supabase.ts'

export interface DadosEnvioPedido {
  readonly instituicao: string
  readonly matricula: string
  readonly periodo: number
  /** AAAA-MM. */
  readonly formatura: string
}

export interface ValorPedidoEstudante {
  readonly pedido: PedidoEstudante | null
  readonly carregado: boolean
  readonly enviar: (dados: DadosEnvioPedido, arquivo: File) => Promise<string | null>
  readonly fecharAviso: (pedidoId: string) => Promise<void>
  readonly recarregar: () => void
}

const COLUNAS = 'id, instituicao, matricula, periodo, formatura, status, motivo, enviado_em, decidido_em, aviso_fechado'

export function usePedidoEstudante(usuarioId: string | null): ValorPedidoEstudante {
  const [cliente] = useState(() => obterSupabase())
  const [carga, setCarga] = useState<{ readonly chave: string; readonly pedido: PedidoEstudante | null } | null>(null)
  const [versao, setVersao] = useState(0)
  const chave = usuarioId ? `${usuarioId}:${versao}` : 'sem-sessao'
  const atual = carga?.chave === chave ? carga : null
  const carregado = usuarioId === null || cliente === null || atual !== null

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useEffect(() => {
    if (!cliente || !usuarioId) return
    let vivo = true
    // O administrador lê todos os pedidos (RLS): o filtro garante o da própria conta.
    void cliente
      .from('pedidos_estudante')
      .select(COLUNAS)
      .eq('usuario', usuarioId)
      .order('enviado_em', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (vivo) setCarga({ chave, pedido: daLinhaPedido(data) })
      })
    return () => {
      vivo = false
    }
  }, [cliente, usuarioId, chave])

  const enviar = useCallback(
    async (dados: DadosEnvioPedido, arquivo: File): Promise<string | null> => {
      const c = obterSupabase()
      if (!c || !usuarioId) return FALHA_DE_REDE
      const caminho = caminhoDoComprovante(usuarioId, arquivo.name, new Date())
      const envio = await c.storage.from('comprovantes').upload(caminho, arquivo, { contentType: arquivo.type, upsert: false })
      if (envio.error) {
        // CA-428: a política de envio recusa quando a conta já tem o limite de arquivos. A mesma
        // contagem que ela usa diz se foi isso; qualquer outra falha fica com a mensagem de rede.
        const { data: arquivos } = await c.rpc('comprovantes_da_conta')
        return typeof arquivos === 'number' && arquivos >= LIMITE_DE_COMPROVANTES ? MENSAGEM_COMPROVANTES_DEMAIS : FALHA_DE_REDE
      }

      const { error } = await c.rpc('enviar_pedido_estudante', {
        p_instituicao: dados.instituicao.trim(),
        p_matricula: dados.matricula.trim(),
        p_periodo: dados.periodo,
        p_formatura: `${dados.formatura}-01`,
        p_arquivo: caminho,
      })
      if (error) {
        await c.storage.from('comprovantes').remove([caminho])
        return mensagemDoBanco(error)
      }
      setVersao((v) => v + 1)
      return null
    },
    [usuarioId],
  )

  const fecharAviso = useCallback(async (pedidoId: string) => {
    const c = obterSupabase()
    if (!c) return
    await c.rpc('fechar_aviso_estudante', { p_pedido: pedidoId })
    setVersao((v) => v + 1)
  }, [])

  return { pedido: atual?.pedido ?? null, carregado, enviar, fecharAviso, recarregar }
}
