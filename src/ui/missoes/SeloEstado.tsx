// O selo que diz, numa palavra, como o paciente está. Cor é estado, nunca enfeite
// (DESIGN.md): verde dentro da meta, âmbar abaixo, vermelho quem sumiu.
import { ROTULO_ESTADO, type EstadoAcompanhamento } from '@/domain/acompanhamento.ts'
import { cn } from '@/lib/utils'

const COR: Readonly<Record<EstadoAcompanhamento, string>> = {
  'em-dia': 'bg-lightsuccess text-successtext',
  atencao: 'bg-lightwarning text-warningtext',
  sumindo: 'bg-lighterror text-errortext',
  'nao-comecou': 'bg-muted text-muted-foreground',
}

export function SeloEstado({ estado, className }: { readonly estado: EstadoAcompanhamento; readonly className?: string }) {
  return <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', COR[estado], className)}>{ROTULO_ESTADO[estado]}</span>
}
