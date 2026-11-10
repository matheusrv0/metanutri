// O armazenamento das fotos e dos anexos da avaliação (spec antropometria-telas, D-1457, D-1504 e D-1513): o balde
// privado `fotos-avaliacao` do Supabase, pelo supabase-js da sessão. A regra (tipos, limites, frases) mora em
// src/domain/fotosDaAvaliacao.ts; aqui só se traduz cada pedido. Sem servidor (modo local), não há armazenamento.
//
// A tela recebe a porta por contexto: o teste de componente passa uma falsa, e o app usa esta, criada uma vez.
import type { SupabaseClient } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'
import { BALDE_DAS_FOTOS, VALIDADE_DA_URL_S, type ArmazenamentoDeFotos, type ArquivoNoArmazenamento } from '@/domain/fotosDaAvaliacao.ts'
import { obterSupabase } from '../estado/supabase.ts'

/** O servidor respondeu (recusou) quando o erro traz o status HTTP; sem ele, o pedido nem chegou (sem internet). */
const respondeu = (erro: unknown): boolean => typeof erro === 'object' && erro !== null && 'status' in erro && typeof erro.status === 'number'

/** As duas subpastas de um plano (DP-AT-20): a lista do armazenamento não entra em subpasta sozinha. */
const SUBPASTAS = ['fotos', 'anexos'] as const

/** O tamanho que o armazenamento diz (`metadata.size`); sem ele, 0. */
const tamanhoDe = (metadados: unknown): number => {
  const tamanho = typeof metadados === 'object' && metadados !== null && 'size' in metadados ? metadados.size : null
  return typeof tamanho === 'number' && Number.isFinite(tamanho) && tamanho > 0 ? tamanho : 0
}

export function criarArmazenamentoDeFotos(cliente: SupabaseClient): ArmazenamentoDeFotos {
  const balde = () => cliente.storage.from(BALDE_DAS_FOTOS)
  /** DP-AT-21: os arquivos de `fotos/` e de `anexos/` da pasta do plano; nula quando uma das leituras falhou. */
  const listar = async (pasta: string): Promise<ArquivoNoArmazenamento[] | null> => {
    const lidos: ArquivoNoArmazenamento[] = []
    for (const sub of SUBPASTAS) {
      const { data, error } = await balde().list(`${pasta}/${sub}`, { limit: 100 })
      if (error) return null
      for (const item of data ?? []) {
        // Sem `id`, é uma subpasta, não um arquivo.
        if (item.id) lidos.push({ caminho: `${pasta}/${sub}/${item.name}`, bytes: tamanhoDe(item.metadata), criadoEm: item.created_at || null })
      }
    }
    return lidos
  }
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
    async listar(pasta) {
      try {
        return await listar(pasta)
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
        const lidos = await listar(pasta)
        if (lidos === null) return false
        if (lidos.length === 0) return true
        const { error } = await balde().remove(lidos.map((a) => a.caminho))
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
