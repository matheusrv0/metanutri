// Navegação por endereço (#/casos, #/caso/<id>/<aba>, #/fontes), sem biblioteca de rotas (PLAN R-8).

export type AbaPlanejador = 'caso' | 'plano' | 'adequacao'

export type Rota =
  | { readonly tela: 'painel' }
  | { readonly tela: 'casos' }
  | { readonly tela: 'planejador'; readonly casoId: string; readonly aba: AbaPlanejador }
  | { readonly tela: 'pacientes' }
  | { readonly tela: 'paciente'; readonly pacienteId: string }
  | { readonly tela: 'produtos' }
  | { readonly tela: 'config' }

export const ABAS: readonly AbaPlanejador[] = ['caso', 'plano', 'adequacao']

export const ROTA_INICIAL: Rota = { tela: 'painel' }

export function lerRota(hash: string): Rota {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  const [tela, id, aba] = partes
  if (tela === 'produtos') return { tela: 'produtos' }
  if (tela === 'config') return { tela: 'config' }
  if (tela === 'casos') return { tela: 'casos' }
  if (tela === 'pacientes') return { tela: 'pacientes' }
  if (tela === 'paciente' && id) return { tela: 'paciente', pacienteId: id }
  if (tela === 'caso' && id) {
    return { tela: 'planejador', casoId: id, aba: ABAS.includes(aba as AbaPlanejador) ? (aba as AbaPlanejador) : 'caso' }
  }
  return ROTA_INICIAL
}

export function escreverRota(rota: Rota): string {
  switch (rota.tela) {
    case 'painel':
      return '#/painel'
    case 'casos':
      return '#/casos'
    case 'pacientes':
      return '#/pacientes'
    case 'paciente':
      return `#/paciente/${encodeURIComponent(rota.pacienteId)}`
    case 'produtos':
      return '#/produtos'
    case 'config':
      return '#/config'
    case 'planejador':
      return `#/caso/${encodeURIComponent(rota.casoId)}/${rota.aba}`
  }
}

export interface Etapa {
  readonly aba: AbaPlanejador
  readonly numero: number
  readonly rotulo: string
  readonly descricao: string
}

/** Etapas do planejador na ordem em que a estudante trabalha. */
export const ETAPAS: readonly Etapa[] = [
  { aba: 'caso', numero: 1, rotulo: 'Dados e medidas', descricao: 'Pessoa, medidas e energia' },
  { aba: 'plano', numero: 2, rotulo: 'Plano alimentar', descricao: 'Refeições e alimentos' },
  { aba: 'adequacao', numero: 3, rotulo: 'Adequação', descricao: 'Vitaminas e minerais' },
]
