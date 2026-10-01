// As filas do administrador e as decisões. Cada chamada é conferida no banco
// (eh_admin): esconder a tela de quem não é administrador é só conforto (CA-297).
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  contarPendentes,
  daLinhaCrnParaConferir,
  daLinhaPedidoParaAprovar,
  type CrnParaConferir,
  type PedidoParaAprovar,
  type Pendentes,
} from '@/domain/aprovacoes.ts'
import type { StatusCrn } from '@/domain/situacao.ts'
import { FALHA_DE_REDE, mensagemDoBanco } from './mensagemDoBanco.ts'
import { obterSupabase } from './supabase.ts'

export interface ValorAprovacoes {
  readonly pedidos: readonly PedidoParaAprovar[]
  readonly crns: readonly CrnParaConferir[]
  readonly pendentes: Pendentes
  readonly carregado: boolean
  readonly erro: string | null
  readonly decidirPedido: (id: string, aprovar: boolean, motivo: string | null) => Promise<string | null>
  readonly decidirCrn: (usuario: string, status: StatusCrn) => Promise<string | null>
  /** Endereço temporário (5 minutos) para abrir o comprovante. */
  readonly abrirComprovante: (caminho: string) => Promise<string | null>
  readonly recarregar: () => void
}

interface Carga {
  readonly versao: number
  readonly pedidos: readonly PedidoParaAprovar[]
  readonly crns: readonly CrnParaConferir[]
  readonly erro: string | null
}

const lista = <T,>(dados: unknown, ler: (linha: unknown) => T | null): T[] =>
  Array.isArray(dados) ? dados.map(ler).filter((x): x is T => x !== null) : []

export function useAprovacoes(ativo: boolean): ValorAprovacoes {
  const [cliente] = useState(() => obterSupabase())
  const [carga, setCarga] = useState<Carga | null>(null)
  const [versao, setVersao] = useState(0)
  const recarregar = useCallback(() => setVersao((v) => v + 1), [])

  useEffect(() => {
    if (!cliente || !ativo) return
    let vivo = true
    void Promise.all([cliente.rpc('pedidos_em_analise'), cliente.rpc('crn_para_conferir')]).then(([pedidos, crns]) => {
      if (!vivo) return
      setCarga({
        versao,
        pedidos: lista(pedidos.data, daLinhaPedidoParaAprovar),
        crns: lista(crns.data, daLinhaCrnParaConferir),
        erro: pedidos.error || crns.error ? mensagemDoBanco(pedidos.error ?? crns.error) : null,
      })
    })
    return () => {
      vivo = false
    }
  }, [cliente, ativo, versao])

  // CA-299: a limpeza dos 30 dias acontece quando o administrador abre o app.
  useEffect(() => {
    if (!cliente || !ativo) return
    void cliente.rpc('comprovantes_para_apagar').then(async ({ data }) => {
      const caminhos = lista(data, (l) => (typeof l === 'object' && l !== null && typeof (l as { caminho?: unknown }).caminho === 'string' ? (l as { caminho: string }).caminho : null))
      if (caminhos.length === 0) return
      const { error } = await cliente.storage.from('comprovantes').remove(caminhos)
      if (!error) await cliente.rpc('marcar_comprovantes_apagados', { p_caminhos: caminhos })
    })
  }, [cliente, ativo])

  const decidir = useCallback(async (funcao: string, args: Record<string, unknown>): Promise<string | null> => {
    const c = obterSupabase()
    if (!c) return FALHA_DE_REDE
    const { error } = await c.rpc(funcao, args)
    // Recarrega mesmo no erro: "já foi decidido" precisa sumir da lista (CB-61).
    setVersao((v) => v + 1)
    return error ? mensagemDoBanco(error) : null
  }, [])

  const decidirPedido = useCallback(
    (id: string, aprovar: boolean, motivo: string | null) => decidir('decidir_pedido', { p_pedido: id, p_aprovar: aprovar, p_motivo: motivo }),
    [decidir],
  )
  const decidirCrn = useCallback((usuario: string, status: StatusCrn) => decidir('decidir_crn', { p_usuario: usuario, p_status: status }), [decidir])

  const abrirComprovante = useCallback(async (caminho: string): Promise<string | null> => {
    const c = obterSupabase()
    if (!c) return null
    const { data, error } = await c.storage.from('comprovantes').createSignedUrl(caminho, 300)
    return error ? null : data.signedUrl
  }, [])

  const pedidos = useMemo(() => carga?.pedidos ?? [], [carga])
  const crns = useMemo(() => carga?.crns ?? [], [carga])
  const pendentes = useMemo(() => contarPendentes(pedidos, crns), [pedidos, crns])

  return {
    pedidos,
    crns,
    pendentes,
    carregado: !ativo || cliente === null || carga !== null,
    erro: carga?.erro ?? null,
    decidirPedido,
    decidirCrn,
    abrirComprovante,
    recarregar,
  }
}
