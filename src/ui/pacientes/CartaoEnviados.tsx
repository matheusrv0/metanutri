// "Enviados" na ficha (spec lado-do-paciente, CA-2264; protótipo AvisosNutri): os e-mails do link nos últimos 30 dias,
// com o dia e a hora, o tipo, o assunto e o estado, e a linha do próximo.
import { useId } from 'react'
import { diaEHora, ESTADO_NA_FICHA, linhaDoProximo, tipoNaFicha, type TomDoEstado } from '@/domain/avisosNaFicha.ts'
import type { EmailsDoLink } from '@/domain/emailsDoLink.ts'
import { Badge, type BadgeProps } from '@ds/componentes/display/badge.tsx'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import type { ProximoAviso } from '../../../supabase/functions/_shared/avisos/regras.ts'

const SELO: Readonly<Record<TomDoEstado, BadgeProps['variant']>> = { ok: 'lightSuccess', neutro: 'lightWarning', erro: 'lightError', desligado: 'outline' }

export function CartaoEnviados({ emails, proximo }: { readonly emails: EmailsDoLink | null; readonly proximo: ProximoAviso | null }) {
  const idTitulo = useId()
  const envios = emails?.envios ?? []
  return (
    <Card className="gap-3" aria-labelledby={idTitulo}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <CardTitle id={idTitulo}>Enviados</CardTitle>
        <span className="text-xs text-muted-foreground">Últimos 30 dias</span>
      </div>
      {proximo ? <p className="text-sm font-medium text-heading">{linhaDoProximo(proximo)}</p> : null}
      {envios.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum e-mail enviado.</p>
      ) : (
        <ul className="flex flex-col" aria-label="E-mails enviados">
          {envios.map((e) => {
            const estado = ESTADO_NA_FICHA[e.estado]
            return (
              <li key={`${e.criadoEm}-${e.tipo}`} className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1 border-b border-border py-2.5 last:border-0 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
                <span className="numeros text-xs text-muted-foreground">{diaEHora(e.criadoEm)}</span>
                <span className="min-w-0 text-sm">
                  <span className="block text-heading [overflow-wrap:anywhere]">{e.assunto}</span>
                  <span className="block text-xs text-muted-foreground">{tipoNaFicha(e.tipo)}</span>
                </span>
                <span className="col-start-2 text-sm sm:col-start-auto">
                  {estado.tom ? <Badge variant={SELO[estado.tom]}>{estado.texto}</Badge> : <span className="text-muted-foreground">{estado.texto}</span>}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
