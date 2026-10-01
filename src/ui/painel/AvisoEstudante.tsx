import { CircleCheck, Clock, FileText, TriangleAlert, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatarDataLonga, type AvisoEstudante } from '@/domain/pedidoEstudante.ts'
import { cn } from '@/lib/utils'
import { Button } from '@ds/componentes/forms/button.tsx'

interface AvisoDoEstudanteProps {
  readonly aviso: NonNullable<AvisoEstudante>
  readonly aoEnviar: () => void
  readonly aoFechar: (pedidoId: string) => void
}

interface Tom {
  readonly icone: ReactNode
  readonly fundo: string
  readonly titulo: string
  readonly texto: string
}

function tomDo(aviso: NonNullable<AvisoEstudante>): Tom {
  switch (aviso.tipo) {
    case 'enviar':
      return { icone: <FileText aria-hidden="true" />, fundo: 'bg-lightwarning text-warningtext', titulo: 'Envie seu comprovante de matrícula', texto: 'Até a aprovação, sua conta funciona como Free.' }
    case 'renovar':
      return { icone: <FileText aria-hidden="true" />, fundo: 'bg-lightwarning text-warningtext', titulo: 'Seu plano Estudante venceu', texto: 'Envie o comprovante do semestre para renovar. Até lá, sua conta funciona como Free.' }
    case 'analise':
      return { icone: <Clock aria-hidden="true" />, fundo: 'bg-lightinfo text-infotext', titulo: 'Comprovante em análise', texto: 'Até 2 dias úteis. Enquanto isso, sua conta funciona como Free.' }
    case 'recusado':
      return { icone: <TriangleAlert aria-hidden="true" />, fundo: 'bg-lighterror text-errortext', titulo: 'Não conseguimos aprovar seu comprovante', texto: `Motivo: ${aviso.motivo}.` }
    case 'aprovado':
      return { icone: <CircleCheck aria-hidden="true" />, fundo: 'bg-lightsuccess text-successtext', titulo: 'Plano Estudante ativo', texto: `Vale até ${formatarDataLonga(aviso.expiraEm)}.` }
  }
}

/** O aviso da estudante no topo do painel (spec conta-e-verificacao, US-B4; protótipo "Aviso no painel"). */
export function AvisoDoEstudante({ aviso, aoEnviar, aoFechar }: AvisoDoEstudanteProps) {
  const tom = tomDo(aviso)
  return (
    <section aria-label="Plano Estudante" className="flex flex-wrap items-center gap-3.5 rounded-3xl bg-card p-4 sm:flex-nowrap sm:px-5">
      <span className={cn('grid size-10 shrink-0 place-content-center rounded-md [&_svg]:size-5', tom.fundo)}>{tom.icone}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-titulo text-base font-semibold text-heading">{tom.titulo}</span>
        <span className="text-sm text-muted-foreground">{tom.texto}</span>
      </span>
      {aviso.tipo === 'enviar' || aviso.tipo === 'renovar' ? (
        <Button size="sm" onClick={aoEnviar}>
          Enviar comprovante
        </Button>
      ) : null}
      {aviso.tipo === 'recusado' ? (
        <Button size="sm" onClick={aoEnviar}>
          Enviar outro
        </Button>
      ) : null}
      {aviso.tipo === 'aprovado' ? (
        <Button variant="ghost" size="icon" aria-label="Fechar aviso" onClick={() => aoFechar(aviso.pedidoId)}>
          <X aria-hidden="true" />
        </Button>
      ) : null}
    </section>
  )
}
