import { BadgeCheck, GraduationCap } from 'lucide-react'
import { formatarDataLonga, formatarMesAno, type PedidoEstudante } from '@/domain/pedidoEstudante.ts'
import { formatarCrn, type PerfilConta, type StatusCrn } from '@/domain/situacao.ts'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'

interface CartaoSituacaoProps {
  readonly perfil: PerfilConta
  readonly pedido: PedidoEstudante | null
  readonly aoMeFormei: () => void
  /** Leva a Comprovar matrícula (CA-304). */
  readonly aoEnviarComprovante: () => void
}

type Variante = 'lightSuccess' | 'lightInfo' | 'lightWarning' | 'lightError'

const SELO_CRN: Readonly<Record<StatusCrn, { readonly texto: string; readonly variante: Variante }>> = {
  em_conferencia: { texto: 'CRN em conferência', variante: 'lightInfo' },
  conferido: { texto: 'CRN conferido', variante: 'lightSuccess' },
  nao_encontrado: { texto: 'CRN não encontrado', variante: 'lightError' },
}

function seloDoPedido(pedido: PedidoEstudante | null): { readonly texto: string; readonly variante: Variante } {
  if (!pedido) return { texto: 'Falta enviar', variante: 'lightWarning' }
  if (pedido.status === 'aprovado') return { texto: 'Matrícula verificada', variante: 'lightSuccess' }
  if (pedido.status === 'em_analise') return { texto: 'Em análise', variante: 'lightInfo' }
  return { texto: 'Recusada', variante: 'lightError' }
}

function Dado({ rotulo, valor }: { readonly rotulo: string; readonly valor: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="text-sm font-semibold text-heading">{valor}</dd>
    </div>
  )
}

/** A situação da conta em Conta e plano (spec conta-e-verificacao, CA-282, CA-283 e CA-304). */
export function CartaoSituacao({ perfil, pedido, aoMeFormei, aoEnviarComprovante }: CartaoSituacaoProps) {
  if (perfil.situacao === 'nutricionista') {
    const selo = perfil.statusCrn ? SELO_CRN[perfil.statusCrn] : SELO_CRN.em_conferencia
    return (
      <Card className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BadgeCheck className="size-5 text-primary" aria-hidden="true" />
            <CardTitle>Nutricionista</CardTitle>
          </div>
          <Badge variant={selo.variante}>{selo.texto}</Badge>
        </div>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5">
          <Dado rotulo="CRN" valor={perfil.crn ? formatarCrn(perfil.crn) : 'Não informado'} />
          <Dado rotulo="Declarado em" valor={perfil.crnDeclaradoEm ? formatarDataLonga(perfil.crnDeclaradoEm) : '—'} />
        </dl>
        <p className="border-t border-border pt-3.5 text-sm text-muted-foreground">Você já pode usar tudo. Seu nome e CRN saem na folha da dieta.</p>
      </Card>
    )
  }

  const selo = seloDoPedido(pedido)
  return (
    <Card className="gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <GraduationCap className="size-5 text-primary" aria-hidden="true" />
          <CardTitle>Estudante de Nutrição</CardTitle>
        </div>
        <Badge variant={selo.variante}>{selo.texto}</Badge>
      </div>
      {pedido ? (
        <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5">
          <Dado rotulo="Instituição" valor={pedido.instituicao} />
          <Dado rotulo="Previsão de formatura" valor={formatarMesAno(pedido.formatura)} />
          <Dado rotulo="Matrícula" valor={pedido.matricula} />
          <Dado rotulo="Verificada em" valor={pedido.status === 'aprovado' && pedido.decididoEm ? formatarDataLonga(pedido.decididoEm) : '—'} />
        </dl>
      ) : null}
      {pedido === null || pedido.status === 'recusado' ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
          <span className="text-sm text-muted-foreground">O plano Estudante libera depois que o comprovante de matrícula for aprovado.</span>
          <Button onClick={aoEnviarComprovante}>Enviar comprovante</Button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3.5">
        <span className="text-sm text-muted-foreground">Já se formou e tem CRN?</span>
        <Button variant="outline" onClick={aoMeFormei}>
          Me formei
        </Button>
      </div>
    </Card>
  )
}
