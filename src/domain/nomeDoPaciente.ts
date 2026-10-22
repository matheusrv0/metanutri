// O nome que vai ao paciente e aos documentos (spec textos-e-promessas, D-409).
//
// O nome do plano é da nutricionista: serve para achar o plano na lista ("Maria, 28 anos, gestante", "Cópia do plano
// (cópia 2)"). No plano impresso, no Word, no nome do arquivo e no link, quem aparece é o paciente.
import type { Caso } from './tipos.ts'

/** Sem paciente e sem nome no plano (CB-380). */
export const PACIENTE_SEM_NOME = 'Paciente sem nome'

/**
 * O nome do paciente vinculado ao plano; sem paciente vinculado (ou com o nome vazio), o nome do plano; sem os dois,
 * nulo (quem chama decide o que mostrar).
 */
export function nomeDoPacienteDoPlano(caso: Pick<Caso, 'nome'>, paciente: { readonly nome: string } | null | undefined): string | null {
  const doPaciente = paciente?.nome.trim() ?? ''
  if (doPaciente) return doPaciente
  const doPlano = caso.nome.trim()
  return doPlano || null
}
