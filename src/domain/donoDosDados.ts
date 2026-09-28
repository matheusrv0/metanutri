// De quem são os planos e pacientes guardados neste aparelho (spec estilo-spora, D-24).
//
// Os dados continuam no navegador, e a conta passou a ser obrigatória. Sem dono, uma
// segunda pessoa que entrasse no mesmo navegador veria os pacientes da primeira.
import { CHAVES_DE_DADOS, expandirChaves } from './perfil.ts'
import type { Armazenamento } from './persistencia.ts'

export const CHAVE_DONO = 'metanutri:dono'

export type SituacaoAoEntrar = 'mesmo' | 'adotar' | 'conflito'

function lerDono(arm: Armazenamento | null): string | null {
  try {
    return arm?.getItem(CHAVE_DONO) ?? null
  } catch {
    return null
  }
}

/** Aparelho sem dono é adotado (inclusive dados de antes da conta existir, CA-151). */
export function situacaoAoEntrar(arm: Armazenamento | null, usuarioId: string): SituacaoAoEntrar {
  const dono = lerDono(arm)
  if (dono === null) return 'adotar'
  return dono === usuarioId ? 'mesmo' : 'conflito'
}

export function registrarDono(arm: Armazenamento | null, usuarioId: string): void {
  try {
    arm?.setItem(CHAVE_DONO, usuarioId)
  } catch {
    // sem armazenamento: não há dado para proteger
  }
}

/** Apaga tudo o que o MetaNutri guarda de paciente neste aparelho, e o dono (CA-153). */
export function apagarDadosDoAparelho(arm: Armazenamento | null): void {
  if (!arm) return
  for (const chave of expandirChaves(arm, [...CHAVES_DE_DADOS])) arm.removeItem(chave)
  arm.removeItem(CHAVE_DONO)
}
