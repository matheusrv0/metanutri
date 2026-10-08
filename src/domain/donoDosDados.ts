// De quem são os dados guardados neste aparelho.
//
// Antes (spec estilo-spora, D-24), o aparelho tinha um conjunto só de dados, com um dono.
// Agora cada conta tem o seu espaço (spec dados-por-conta, D-120), e o dono marca a quem
// pertencem os dados sem prefixo, os de antes desta mudança (D-123).
import { armazenamentoDaConta } from './armazenamentoDaConta.ts'
import { CHAVES_DE_DADOS, expandirChaves } from './perfil.ts'
import type { Armazenamento, ArmazenamentoListavel } from './persistencia.ts'

export const CHAVE_DONO = 'metanutri:dono'

/**
 * Dado da pessoa que não entra no backup, mas também é dela (DP-2): o aviso de primeiro
 * acesso que ela já viu (CB-122) e a chave antiga dos alimentos frequentes, sem uso no app.
 */
export const OUTRAS_CHAVES_DA_PESSOA = ['metanutri:aviso-inicial-visto', 'metanutri:frequentes'] as const

const PREFIXO_CASO = 'metanutri:caso:'

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

/**
 * As chaves sem prefixo de conta que guardam dado da pessoa e existem no aparelho. Os planos
 * vêm primeiro, o índice depois: o que já foi movido nunca aponta para plano que ainda não foi.
 */
function chavesSemConta(base: ArmazenamentoListavel): string[] {
  const planos: string[] = []
  for (let i = 0; i < base.length; i += 1) {
    const chave = base.key(i)
    if (chave?.startsWith(PREFIXO_CASO)) planos.push(chave)
  }
  const doIndice = expandirChaves(base, ['metanutri:casos']).filter((c) => c.startsWith(PREFIXO_CASO))
  const todas = new Set([...planos, ...doIndice, ...CHAVES_DE_DADOS, ...OUTRAS_CHAVES_DA_PESSOA])
  return [...todas].filter((chave) => base.getItem(chave) !== null)
}

/** `nada`: não havia dado sem conta. `conflito`: a conta já tem outro valor numa das chaves (DP-5). */
export type ResultadoMigracao = 'nada' | 'movido' | 'conflito' | 'falhou'

/**
 * D-123: os dados sem prefixo vão para o espaço de quem é dono deles. Sem dono, a conta que
 * entra vira dona (CA-468). Com dono, vão para ele, mesmo que outra conta esteja entrando.
 *
 * Chave por chave (DP-4): copia, confere e só então apaga a original. Nenhuma chave some dos
 * dois lugares ao mesmo tempo, e rodar de novo termina o que ficou pela metade.
 */
export function migrarDadosSemConta(base: ArmazenamentoListavel | null, usuarioId: string): ResultadoMigracao {
  if (!base) return 'nada'
  try {
    const chaves = chavesSemConta(base)
    if (chaves.length === 0) return 'nada'

    // DP-6: o dono é marcado antes da primeira cópia e fica. Fechar o navegador no meio não
    // deixa os dados sem dono para a próxima conta que entrar.
    const donoAtual = base.getItem(CHAVE_DONO) || null
    const dono = donoAtual ?? usuarioId
    if (donoAtual === null) base.setItem(CHAVE_DONO, dono)
    const destino = armazenamentoDaConta(base, dono)

    // DP-5: valor diferente já na conta é conflito, e nada se move. Valor igual é cópia interrompida.
    const conflito = chaves.some((chave) => {
      const naConta = destino.getItem(chave)
      return naConta !== null && naConta !== base.getItem(chave)
    })
    if (conflito) return 'conflito'

    for (const chave of chaves) {
      const valor = base.getItem(chave)
      if (valor === null) continue
      if (destino.getItem(chave) === null) destino.setItem(chave, valor)
      if (destino.getItem(chave) !== valor) return 'falhou'
      base.removeItem(chave)
    }
    return 'movido'
  } catch {
    // Aparelho cheio ou bloqueado: o que não foi movido continua onde estava.
    return 'falhou'
  }
}

/**
 * D-124: "Sair e apagar os dados deste aparelho" leva só o espaço da conta que sai. Se ela é a
 * dona dos dados sem prefixo, eles vão junto, e ela deixa de ser dona.
 */
export function apagarDadosDaConta(base: ArmazenamentoListavel | null, usuarioId: string): void {
  if (!base) return
  try {
    armazenamentoDaConta(base, usuarioId).clear()
    if (base.getItem(CHAVE_DONO) !== usuarioId) return
    for (const chave of chavesSemConta(base)) base.removeItem(chave)
    base.removeItem(CHAVE_DONO)
  } catch {
    // sem armazenamento: não há o que apagar
  }
}
