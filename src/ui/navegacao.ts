// Navegação por endereço (#/casos, #/caso/<id>/<aba>, #/fontes), sem biblioteca de rotas (PLAN R-8).

export type AbaPlanejador = 'caso' | 'plano' | 'adequacao'

/** Telas públicas: quem ainda não trabalha no sistema, ou está entrando nele. */
export const TELAS_PUBLICAS = ['inicio', 'precos', 'entrar'] as const
export type TelaPublica = (typeof TELAS_PUBLICAS)[number]

export type Rota =
  | { readonly tela: 'inicio' }
  | { readonly tela: 'precos' }
  | { readonly tela: 'entrar' }
  | { readonly tela: 'conta' }
  | { readonly tela: 'painel' }
  | { readonly tela: 'casos' }
  | { readonly tela: 'planejador'; readonly casoId: string; readonly aba: AbaPlanejador }
  | { readonly tela: 'pacientes' }
  | { readonly tela: 'paciente'; readonly pacienteId: string }
  | { readonly tela: 'alimentos' }
  | { readonly tela: 'produtos' }
  | { readonly tela: 'config' }
  | { readonly tela: 'ajuda' }
  | { readonly tela: 'designsystem' }

export const ABAS: readonly AbaPlanejador[] = ['caso', 'plano', 'adequacao']

export const ROTA_INICIAL: Rota = { tela: 'painel' }

export function lerRota(hash: string): Rota {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  const [tela, id, aba] = partes
  if (tela === 'inicio') return { tela: 'inicio' }
  if (tela === 'precos') return { tela: 'precos' }
  if (tela === 'entrar') return { tela: 'entrar' }
  if (tela === 'conta') return { tela: 'conta' }
  if (tela === 'alimentos') return { tela: 'alimentos' }
  if (tela === 'produtos') return { tela: 'produtos' }
  if (tela === 'config') return { tela: 'config' }
  if (tela === 'ajuda') return { tela: 'ajuda' }
  if (tela === 'design-system') return { tela: 'designsystem' }
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
    case 'inicio':
      return '#/inicio'
    case 'precos':
      return '#/precos'
    case 'entrar':
      return '#/entrar'
    case 'conta':
      return '#/conta'
    case 'painel':
      return '#/painel'
    case 'casos':
      return '#/casos'
    case 'pacientes':
      return '#/pacientes'
    case 'paciente':
      return `#/paciente/${encodeURIComponent(rota.pacienteId)}`
    case 'alimentos':
      return '#/alimentos'
    case 'produtos':
      return '#/produtos'
    case 'config':
      return '#/config'
    case 'ajuda':
      return '#/ajuda'
    case 'designsystem':
      return '#/design-system'
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

/** A moldura da área pública é outra: sem menu lateral, com fundo escuro. */
export function ehTelaPublica(rota: Rota): boolean {
  return (TELAS_PUBLICAS as readonly string[]).includes(rota.tela)
}
