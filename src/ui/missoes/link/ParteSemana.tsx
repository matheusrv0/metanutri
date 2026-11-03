import { CalendarDays } from 'lucide-react'
import type { DiaDaSemana, SemanaAnterior } from '@/domain/semanaDoPaciente.ts'
import { cn } from '@/lib/utils'

interface ParteSemanaProps {
  readonly dias: readonly DiaDaSemana[]
  /** Os dias com missão nos últimos 7 (a conta da Adesão). */
  readonly diasMarcados: number
  readonly frase: string
  readonly anteriores: readonly SemanaAnterior[]
  /** "Próxima consulta: terça, 17 de novembro, às 14:30"; nula sem consulta. */
  readonly consulta: string | null
}

/**
 * Semana (D-1207, CA-2211): "3 de 7 dias" com a frase da meta; os últimos 7 dias em colunas, com as missões de cada um e
 * hoje com contorno; as 4 semanas anteriores; e a próxima consulta. Sem cor de enfeite: verde é dia com missão (estado),
 * traço é dia sem.
 */
export function ParteSemana({ dias, diasMarcados, frase, anteriores, consulta }: ParteSemanaProps) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-titulo text-2xl leading-tight font-extrabold tracking-tight text-heading">Sua semana</h1>
      <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <strong className="numeros text-4xl leading-none font-extrabold tracking-tight text-heading">{`${diasMarcados} de 7 dias`}</strong>
        <span className="text-base text-muted-foreground">{frase}</span>
      </p>

      <ul aria-label="Missões feitas por dia" className="grid grid-cols-7 gap-1.5 rounded-2xl border border-border bg-card px-2 pt-4 pb-3 min-[400px]:px-3">
        {dias.map((dia) => {
          const altura = dia.total === 0 ? 0 : Math.round((dia.feitas / dia.total) * 100)
          return (
            <li
              key={dia.dia}
              aria-label={dia.rotulo}
              className={cn('flex min-w-0 flex-col items-center gap-1 rounded-xl pt-1.5 pb-2', dia.hoje ? 'ring-[1.5px] ring-heading ring-inset' : null)}
            >
              <span aria-hidden="true" className="relative h-28 w-3.5 overflow-hidden rounded-full bg-surfacesunken">
                {dia.feitas > 0 ? <span className="absolute inset-x-0 bottom-0 rounded-full bg-stateok" style={{ height: `${altura}%` }} /> : null}
              </span>
              <span aria-hidden="true" className={cn('numeros text-sm', dia.feitas > 0 ? 'font-bold text-heading' : 'font-semibold text-muted-foreground')}>
                {dia.texto}
              </span>
              <span aria-hidden="true" className="text-xs font-bold text-heading">
                {dia.nome}
              </span>
              <span aria-hidden="true" className="numeros text-xs text-muted-foreground">
                {dia.numero}
              </span>
            </li>
          )
        })}
      </ul>

      <h2 className="mt-1.5 text-base font-extrabold text-heading">Semanas anteriores</h2>
      <ul className="flex flex-col rounded-2xl border border-border bg-card px-4 py-1">
        {anteriores.map((semana) => (
          <li key={semana.inicio} className="grid min-h-13 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-border text-sm first:border-0">
            <span className="min-w-0">{semana.datas}</span>
            <span aria-hidden="true" className="inline-flex gap-1.25">
              {semana.pontos.map((marcado, i) => (
                <span key={i} className={cn('size-2.25 rounded-full', marcado ? 'bg-stateok' : 'bg-surfacesunken ring-[1.5px] ring-borderstrong ring-inset')} />
              ))}
            </span>
            <strong className="numeros min-w-13 text-right font-bold text-heading">{semana.texto}</strong>
          </li>
        ))}
      </ul>

      {consulta ? (
        <p className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm text-foreground">
          <CalendarDays className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 [overflow-wrap:anywhere]">{consulta}</span>
        </p>
      ) : null}
    </div>
  )
}
