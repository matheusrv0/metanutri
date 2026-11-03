// O link fixo por paciente (spec lado-do-paciente, D-1214 a D-1217). O link é do paciente, não do plano: mostra o plano
// vigente dele, e um plano novo atualiza o mesmo endereço, mantendo as marcações (PLAN, DP-LP-4). Os links de antes, um
// por plano, passam a apontar para o mais recente do mesmo paciente (D-1217, DP-LP-5): o paciente não perde nada.
import type { Acompanhamento } from './acompanhamento.ts'
import { copiarDieta, type DietaDoPlano } from './dietaDoLink.ts'
import type { Missao } from './missoes.ts'
import { pacienteDoAcompanhamento } from './retorno.ts'

type Planos = readonly { readonly id: string; readonly pacienteId: string | null }[]

/** Os links que valem: sem os substituídos pela migração (D-1217). A Adesão, a ficha e o limite só olham estes. */
export const linksVigentes = (links: readonly Acompanhamento[]): readonly Acompanhamento[] => links.filter((l) => !l.substituidoPor)

/** O link fixo do paciente: o vigente mais recente dele (o paciente do plano primeiro, D-147). */
export function linkDoPaciente(links: readonly Acompanhamento[], pacienteId: string, planos: Planos): Acompanhamento | null {
  const deles = linksVigentes(links).filter((l) => pacienteDoAcompanhamento(l, planos) === pacienteId)
  return [...deles].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0] ?? null
}

/**
 * D-1217 e CA-2225: em cada paciente com mais de um link vigente, o mais recente (`criadoEm`) vira o fixo e os outros
 * apontam para ele. Devolve só os links que mudaram, para gravar. Link sem paciente continua como está.
 */
export function migrarParaLinkFixo(links: readonly Acompanhamento[], planos: Planos): readonly Acompanhamento[] {
  const porPaciente = new Map<string, Acompanhamento[]>()
  for (const l of linksVigentes(links)) {
    const paciente = pacienteDoAcompanhamento(l, planos)
    if (paciente === null) continue
    porPaciente.set(paciente, [...(porPaciente.get(paciente) ?? []), l])
  }
  const mudados: Acompanhamento[] = []
  for (const deles of porPaciente.values()) {
    if (deles.length < 2) continue
    const [fixo, ...antigos] = [...deles].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    if (!fixo) continue
    for (const antigo of antigos) mudados.push({ ...antigo, substituidoPor: fixo.id })
  }
  return mudados
}

/**
 * D-1214 e CB-1224: o limite da assinatura conta pacientes com link (o "paciente ativo" da régua). Um link sem paciente
 * conta sozinho; os substituídos não contam.
 */
export function contarPacientesComLink(links: readonly Acompanhamento[], planos: Planos = []): number {
  const chaves = new Set(linksVigentes(links).map((l) => pacienteDoAcompanhamento(l, planos) ?? `link:${l.id}`))
  return chaves.size
}

/** CA-2226: o aviso do limite conta pacientes com link (D-1214), com a mesma régua do CA-1190. */
export const textoDoLimite = (limite: number | null | undefined): string =>
  `Você já tem ${limite ?? 0} pacientes com link, o limite da sua assinatura. Remova um link em Adesão ou mude de assinatura para gerar outro.`

/** O plano no link não é este: o cartão pergunta "Juliana já tem link. Atualizar com este plano?" (CA-2222). */
export const precisaAtualizarComPlano = (link: Acompanhamento, casoId: string): boolean => link.casoId !== casoId

export interface PlanoParaOLink {
  readonly casoId: string
  readonly pacienteId: string | null
  readonly nome: string
  readonly missoes: readonly Missao[]
  /** A dieta do plano novo; sem ela, o link fica sem dieta. */
  readonly dieta?: DietaDoPlano | undefined
}

/**
 * CA-2222 (DP-LP-4): "Atualizar" grava no mesmo link o plano, as missões e a dieta do plano novo e mantém o endereço e as
 * marcações. A dieta só vai se o link já mostrava a dieta ("Mostrar a dieta no link" continua como estava).
 */
export function atualizarComPlano(link: Acompanhamento, plano: PlanoParaOLink, hoje: string): Acompanhamento {
  return {
    ...link,
    casoId: plano.casoId,
    pacienteId: plano.pacienteId ?? link.pacienteId,
    nome: plano.nome.trim() || link.nome,
    missoes: plano.missoes,
    dieta: link.dieta !== null && plano.dieta ? copiarDieta(plano.dieta, hoje) : null,
  }
}
