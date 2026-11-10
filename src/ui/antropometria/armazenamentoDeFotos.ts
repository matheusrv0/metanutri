// O armazenamento das fotos e dos anexos da avaliação (spec antropometria-telas, D-1457, D-1504 e D-1513): o balde
// privado `fotos-avaliacao` do Supabase, pelo supabase-js da sessão. A regra (tipos, limites, frases) mora em
// src/domain/fotosDaAvaliacao.ts; aqui só se traduz cada pedido. Sem servidor (modo local), não há armazenamento.
//
// A tela recebe a porta por contexto: o teste de componente passa uma falsa, e o app usa esta, criada uma vez.
import type { SupabaseClient } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import { BALDE_DAS_FOTOS, VALIDADE_DA_URL_S, type ArmazenamentoDeFotos } from '@/domain/fotosDaAvaliacao.ts'
import { obterSupabase } from '../estado/supabase.ts'

/** O servidor respondeu (recusou) quando o erro traz o status HTTP; sem ele, o pedido nem chegou (sem internet). */
const respondeu = (erro: unknown): boolean => typeof erro === 'object' && erro !== null && 'status' in erro && typeof erro.status === 'number'

/** As duas subpastas de um plano (DP-AT-20): a lista do armazenamento não entra em subpasta sozinha. */
const SUBPASTAS = ['fotos', 'anexos'] as const

export function criarArmazenamentoDeFotos(cliente: SupabaseClient): ArmazenamentoDeFotos {
  const balde = () => cliente.storage.from(BALDE_DAS_FOTOS)
  return {
    async conta() {
      try {
        const { data } = await cliente.auth.getSession()
        return data.session?.user.id ?? null
      } catch {
        return null
      }
    },
    async enviar(caminho, arquivo, tipo) {
      try {
        // O supabase-js manda o Blob num formulário, com o tipo do próprio Blob: ele leva o tipo conferido pelo conteúdo.
        const corpo = arquivo.type === tipo ? arquivo : arquivo.slice(0, arquivo.size, tipo)
        // D-1513: o arquivo sai do servidor com "max-age=0": o navegador não guarda a foto entre uma visita e outra.
        const { error } = await balde().upload(caminho, corpo, { contentType: tipo, upsert: false, cacheControl: '0' })
        if (!error) return 'ok'
        return respondeu(error) ? 'recusado' : 'sem-rede'
      } catch {
        return 'sem-rede'
      }
    },
    async contar(pasta) {
      try {
        const { data, error } = await balde().list(pasta, { limit: 100 })
        if (error) return null
        return (data ?? []).filter((item) => item.id).length
      } catch {
        return null
      }
    },
    async assinar(caminho) {
      try {
        const { data, error } = await balde().createSignedUrl(caminho, VALIDADE_DA_URL_S)
        return error ? null : (data?.signedUrl ?? null)
      } catch {
        return null
      }
    },
    async apagar(caminhos) {
      if (caminhos.length === 0) return true
      try {
        const { error } = await balde().remove([...caminhos])
        return error === null
      } catch {
        return false
      }
    },
    async apagarPasta(pasta) {
      try {
        const caminhos: string[] = []
        for (const sub of SUBPASTAS) {
          const { data, error } = await balde().list(`${pasta}/${sub}`, { limit: 100 })
          if (error) return false
          for (const item of data ?? []) if (item.id) caminhos.push(`${pasta}/${sub}/${item.name}`)
        }
        if (caminhos.length === 0) return true
        const { error } = await balde().remove(caminhos)
        return error === null
      } catch {
        return false
      }
    },
  }
}

let doApp: ArmazenamentoDeFotos | null | undefined

/** O armazenamento do app: o do Supabase configurado, ou nulo no modo local. */
function armazenamentoDoApp(): ArmazenamentoDeFotos | null {
  if (doApp !== undefined) return doApp
  const cliente = obterSupabase()
  doApp = cliente ? criarArmazenamentoDeFotos(cliente) : null
  return doApp
}

/** `undefined`: ninguém disse (vale o do app); `null`: sem armazenamento (o modo local, nos testes). */
export const ContextoArmazenamentoDeFotos = createContext<ArmazenamentoDeFotos | null | undefined>(undefined)

/** O armazenamento das fotos, ou nulo no modo local (D-1459). */
export function useArmazenamentoDeFotos(): ArmazenamentoDeFotos | null {
  const dado = useContext(ContextoArmazenamentoDeFotos)
  return dado === undefined ? armazenamentoDoApp() : dado
}
