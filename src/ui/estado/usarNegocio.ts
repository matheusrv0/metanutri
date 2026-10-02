// As leituras do painel do dono (spec painel-do-dono). O banco confere eh_admin em
// cada uma (CA-344): esconder a tela de quem não é administrador é só conforto.
// Uma leitura por vez (CB-86); leitura que falha não apaga a anterior (CB-79).
import { useCallback, useEffect, useState } from 'react'
import {
  daLinhaContaNoPainel,
  daLinhaMudanca,
  daLinhaUso,
  type ContaNoPainel,
  type MudancaDeAssinatura,
  type UsoNoPainel,
} from '@/domain/negocio.ts'
import { obterSupabase } from './supabase.ts'

export const FALHA_AO_LER_NEGOCIO = 'Não consegui ler os números agora. Confira a internet e toque em Atualizar.'

export interface DadosDoNegocio {
  readonly contas: readonly ContaNoPainel[]
  readonly historico: readonly MudancaDeAssinatura[]
  readonly uso: UsoNoPainel
  readonly lidoEm: Date
}

export interface ValorNegocio {
  readonly dados: DadosDoNegocio | null
  readonly carregando: boolean
  readonly erro: string | null
  readonly atualizar: () => void
}

interface Leitura {
  readonly pedido: number
  readonly dados: DadosDoNegocio | null
  readonly erro: string | null
}

const lista = <T,>(dados: unknown, ler: (linha: unknown) => T | null): T[] =>
  Array.isArray(dados) ? dados.map(ler).filter((x): x is T => x !== null) : []

/** CA-344: a recusa do banco tem a própria frase; o resto é rede ou servidor fora (CB-78). */
const mensagem = (erro: { readonly message?: string; readonly code?: string }): string =>
  erro.code === '42501' && erro.message ? erro.message : FALHA_AO_LER_NEGOCIO

export function useNegocio(ativo: boolean): ValorNegocio {
  const [cliente] = useState(() => obterSupabase())
  const [pedido, setPedido] = useState(0)
  const [leitura, setLeitura] = useState<Leitura | null>(null)

  useEffect(() => {
    if (!cliente || !ativo) return
    let vivo = true
    const falhou = (erro: string) => setLeitura((anterior) => ({ pedido, dados: anterior?.dados ?? null, erro }))
    void Promise.all([cliente.rpc('painel_contas'), cliente.rpc('painel_historico_assinaturas'), cliente.rpc('painel_uso')]).then(
      ([contas, historico, uso]) => {
        if (!vivo) return
        const erro = contas.error ?? historico.error ?? uso.error
        if (erro) {
          falhou(mensagem(erro))
          return
        }
        setLeitura({
          pedido,
          erro: null,
          dados: {
            contas: lista(contas.data, daLinhaContaNoPainel),
            historico: lista(historico.data, daLinhaMudanca),
            uso: daLinhaUso(uso.data),
            lidoEm: new Date(),
          },
        })
      },
      () => {
        if (vivo) falhou(FALHA_AO_LER_NEGOCIO)
      },
    )
    return () => {
      vivo = false
    }
  }, [cliente, ativo, pedido])

  const carregando = ativo && cliente !== null && leitura?.pedido !== pedido
  const atualizar = useCallback(() => {
    if (!carregando) setPedido((p) => p + 1)
  }, [carregando])

  return {
    dados: leitura?.dados ?? null,
    carregando,
    erro: ativo && cliente === null ? FALHA_AO_LER_NEGOCIO : (leitura?.erro ?? null),
    atualizar,
  }
}
