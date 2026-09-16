// Duplicar plano: o retorno do paciente começa do plano anterior, não do zero.
import { clonarPlano } from './modelos.ts'
import type { Caso, Plano } from './tipos.ts'

export interface OpcoesDuplicar {
  /** Data da nova consulta no formato AAAA-MM-DD; `null` deixa o campo em branco. */
  readonly hoje?: string | null
}

const SUFIXO = /\s*\(cópia(?: (\d+))?\)$/

/** "Plano" → "Plano (cópia)" → "Plano (cópia 2)": não empilha parênteses. */
export function nomeDaCopia(nome: string): string {
  const base = nome.trim()
  if (base === '') return 'Cópia do plano'
  const achado = SUFIXO.exec(base)
  if (!achado) return `${base} (cópia)`
  const anterior = achado[1] === undefined ? 1 : Number(achado[1])
  return `${base.replace(SUFIXO, '')} (cópia ${anterior + 1})`
}

/**
 * Cópia independente do caso e do plano: ids novos em tudo, mesmo paciente,
 * mesma antropometria, data da consulta trocada pela de hoje.
 */
export function duplicarCaso(
  registro: { readonly caso: Caso; readonly plano: Plano },
  gerarId: () => string,
  opcoes: OpcoesDuplicar = {},
): { readonly caso: Caso; readonly plano: Plano } {
  const hoje = opcoes.hoje === undefined ? new Date().toISOString().slice(0, 10) : opcoes.hoje
  return {
    caso: { ...registro.caso, id: gerarId(), nome: nomeDaCopia(registro.caso.nome), dataConsulta: hoje },
    plano: clonarPlano(registro.plano, gerarId),
  }
}
