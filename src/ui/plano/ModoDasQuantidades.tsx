import type { ModoQuantidade } from '@/domain/tipos.ts'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'

const OPCOES: readonly { readonly valor: ModoQuantidade; readonly rotulo: string }[] = [
  { valor: 'medida-e-gramas', rotulo: 'Medida e gramas' },
  { valor: 'medida-caseira', rotulo: 'Só medida' },
  { valor: 'gramas', rotulo: 'Só gramas' },
]

interface ModoDasQuantidadesProps {
  readonly modo: ModoQuantidade
  readonly aoMudar: (modo: ModoQuantidade) => void
}

/**
 * Como o paciente lê as quantidades no plano impresso, no link e no Word (spec alimentos-e-gramaturas, D-376): no topo
 * da etapa Refeições e na janela de imprimir.
 */
export function ModoDasQuantidades({ modo, aoMudar }: ModoDasQuantidadesProps) {
  return <GrupoOpcoes<ModoQuantidade> rotulo="Quantidades para o paciente" opcoes={OPCOES} valor={modo} aoEscolher={aoMudar} />
}
