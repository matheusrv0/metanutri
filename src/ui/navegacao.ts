// Navegação por endereço (#/casos, #/caso/<id>/<aba>, #/assinar/solo/anual), sem biblioteca de rotas (PLAN R-8).
import { ehCiclo, ehIdPlano, type Ciclo, type IdPlano } from '@/domain/conta.ts'

export type AbaPlanejador = 'caso' | 'plano' | 'adequacao'

/** Os planos que se paga pelo checkout. Clínica é conversa; Free e Estudante não pagam. */
export type PlanoPago = 'solo' | 'pro'
export const ehPlanoPago = (valor: unknown): valor is PlanoPago => valor === 'solo' || valor === 'pro'

/** Telas que abrem sem sessão, mesmo com o servidor configurado (spec estilo-spora, CA-149). */
export const TELAS_LIVRES = ['inicio', 'precos', 'entrar', 'criar-conta', 'confirmar-email', 'esqueci-senha', 'nova-senha', 'termos', 'privacidade', 'fontes', 'missoes'] as const

/** Telas fora da moldura do app (sem menu lateral). Checkout e volta do pagamento pedem sessão. */
export const TELAS_PUBLICAS = [...TELAS_LIVRES, 'assinar', 'pagamento', 'comprovar-matricula'] as const
export type TelaPublica = (typeof TELAS_PUBLICAS)[number]

export type Rota =
  | { readonly tela: 'inicio' }
  // Tela do paciente: abre pelo link, no aparelho dele, sem conta e sem menu.
  | { readonly tela: 'missoes'; readonly token: string }
  | { readonly tela: 'precos'; readonly destaque?: IdPlano }
  | { readonly tela: 'entrar' }
  // Sem `plano`, é o Free. Sem `ciclo`, é o mensal.
  | { readonly tela: 'criar-conta'; readonly plano?: IdPlano; readonly ciclo?: Ciclo }
  | { readonly tela: 'confirmar-email'; readonly vencido?: true }
  // `codigo`: o segundo passo, que pede o código do e-mail e a senha nova (spec confirmacao-por-codigo, CA-412).
  | { readonly tela: 'esqueci-senha'; readonly codigo?: true }
  | { readonly tela: 'nova-senha'; readonly vencido?: true }
  | { readonly tela: 'termos' }
  | { readonly tela: 'privacidade' }
  | { readonly tela: 'fontes' }
  | { readonly tela: 'assinar'; readonly plano: PlanoPago; readonly ciclo: Ciclo }
  | { readonly tela: 'pagamento' }
  | { readonly tela: 'comprovar-matricula' }
  | { readonly tela: 'conta' }
  | { readonly tela: 'painel' }
  | { readonly tela: 'casos' }
  | { readonly tela: 'planejador'; readonly casoId: string; readonly aba: AbaPlanejador }
  | { readonly tela: 'pacientes' }
  | { readonly tela: 'adesao' }
  | { readonly tela: 'paciente'; readonly pacienteId: string }
  | { readonly tela: 'alimentos' }
  | { readonly tela: 'produtos' }
  | { readonly tela: 'config' }
  | { readonly tela: 'ajuda' }
  | { readonly tela: 'designsystem' }
  | { readonly tela: 'aprovacoes' }
  | { readonly tela: 'negocio' }

export const ABAS: readonly AbaPlanejador[] = ['caso', 'plano', 'adequacao']

export const ROTA_INICIAL: Rota = { tela: 'painel' }

/** A rota de Criar conta, sem gravar o que é padrão (Free, mensal). Ciclo só vale para plano pago. */
export function rotaCriarConta(plano: IdPlano | null, ciclo: Ciclo): Rota {
  if (plano === null || plano === 'free' || plano === 'clinica') return { tela: 'criar-conta' }
  return ciclo === 'anual' && ehPlanoPago(plano) ? { tela: 'criar-conta', plano, ciclo } : { tela: 'criar-conta', plano }
}

export function lerRota(hash: string): Rota {
  const partes = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  const [tela, id, aba] = partes
  if (tela === 'missoes' && id) return { tela: 'missoes', token: id }
  if (tela === 'inicio') return { tela: 'inicio' }
  if (tela === 'precos') return ehIdPlano(id) ? { tela: 'precos', destaque: id } : { tela: 'precos' }
  if (tela === 'entrar') return { tela: 'entrar' }
  if (tela === 'criar-conta') return rotaCriarConta(ehIdPlano(id) ? id : null, aba === 'anual' ? 'anual' : 'mensal')
  if (tela === 'confirmar-email') return id === 'vencido' ? { tela: 'confirmar-email', vencido: true } : { tela: 'confirmar-email' }
  if (tela === 'esqueci-senha') return id === 'codigo' ? { tela: 'esqueci-senha', codigo: true } : { tela: 'esqueci-senha' }
  if (tela === 'nova-senha') return id === 'vencido' ? { tela: 'nova-senha', vencido: true } : { tela: 'nova-senha' }
  if (tela === 'termos') return { tela: 'termos' }
  if (tela === 'privacidade') return { tela: 'privacidade' }
  if (tela === 'fontes') return { tela: 'fontes' }
  if (tela === 'assinar') return ehPlanoPago(id) ? { tela: 'assinar', plano: id, ciclo: ehCiclo(aba) ? aba : 'mensal' } : { tela: 'precos' }
  if (tela === 'pagamento') return { tela: 'pagamento' }
  if (tela === 'conta') return { tela: 'conta' }
  if (tela === 'alimentos') return { tela: 'alimentos' }
  if (tela === 'produtos') return { tela: 'produtos' }
  if (tela === 'config') return { tela: 'config' }
  if (tela === 'ajuda') return { tela: 'ajuda' }
  if (tela === 'design-system') return { tela: 'designsystem' }
  if (tela === 'casos') return { tela: 'casos' }
  if (tela === 'pacientes') return { tela: 'pacientes' }
  if (tela === 'adesao') return { tela: 'adesao' }
  if (tela === 'paciente' && id) return { tela: 'paciente', pacienteId: id }
  if (tela === 'aprovacoes') return { tela: 'aprovacoes' }
  if (tela === 'negocio') return { tela: 'negocio' }
  if (tela === 'comprovar-matricula') return { tela: 'comprovar-matricula' }
  if (tela === 'caso' && id) {
    return { tela: 'planejador', casoId: id, aba: ABAS.includes(aba as AbaPlanejador) ? (aba as AbaPlanejador) : 'caso' }
  }
  return ROTA_INICIAL
}

export function escreverRota(rota: Rota): string {
  switch (rota.tela) {
    case 'missoes':
      return `#/missoes/${encodeURIComponent(rota.token)}`
    case 'inicio':
      return '#/inicio'
    case 'precos':
      return rota.destaque ? `#/precos/${rota.destaque}` : '#/precos'
    case 'entrar':
      return '#/entrar'
    case 'criar-conta':
      return rota.plano ? `#/criar-conta/${rota.plano}${rota.ciclo === 'anual' ? '/anual' : ''}` : '#/criar-conta'
    case 'confirmar-email':
      return rota.vencido ? '#/confirmar-email/vencido' : '#/confirmar-email'
    case 'esqueci-senha':
      return rota.codigo ? '#/esqueci-senha/codigo' : '#/esqueci-senha'
    case 'nova-senha':
      return rota.vencido ? '#/nova-senha/vencido' : '#/nova-senha'
    case 'termos':
      return '#/termos'
    case 'privacidade':
      return '#/privacidade'
    case 'fontes':
      return '#/fontes'
    case 'assinar':
      return `#/assinar/${rota.plano}/${rota.ciclo}`
    case 'pagamento':
      return '#/pagamento'
    case 'comprovar-matricula':
      return '#/comprovar-matricula'
    case 'conta':
      return '#/conta'
    case 'painel':
      return '#/painel'
    case 'casos':
      return '#/casos'
    case 'pacientes':
      return '#/pacientes'
    case 'adesao':
      return '#/adesao'
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
    case 'aprovacoes':
      return '#/aprovacoes'
    case 'negocio':
      return '#/negocio'
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

/** A moldura da área pública é outra: sem menu lateral. */
export function ehTelaPublica(rota: Rota): boolean {
  return (TELAS_PUBLICAS as readonly string[]).includes(rota.tela)
}

/** Abre sem sessão mesmo com o servidor configurado (CA-149). */
export function ehRotaLivre(rota: Rota): boolean {
  return (TELAS_LIVRES as readonly string[]).includes(rota.tela)
}
