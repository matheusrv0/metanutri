import { useId } from 'react'
import { metaDeAgua, textoDaMetaDeAgua } from '@/domain/agua.ts'
import { linhaDaAguaAutomatica } from '@/domain/folhaDieta.ts'
import type { Caso } from '@/domain/tipos.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'

interface CampoAguaProps {
  readonly caso: Pick<Caso, 'sexo' | 'idadeAnos' | 'condicao' | 'linhaDaAgua'>
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  /** O que a anamnese diz da hidratação ("Na anamnese: 1 litro por dia · urina 5 · Amarelo-escuro"); nulo sem resposta. */
  readonly lembrete?: string | null | undefined
}

const ONDE_APARECE = 'Aparece no início das orientações do plano impresso. Se ficar vazio, não aparece.'

/**
 * A linha da água do plano impresso (spec conduta-da-nutricionista, D-298; spec ficha-unica, D-355): mostra a
 * automática, pela fase de vida, até a nutricionista escrever outra; vazio tira a linha da folha; "Usar a automática"
 * volta à conta.
 */
export function CampoAgua({ caso, aoAlterar, lembrete }: CampoAguaProps) {
  const id = useId()
  const meta = metaDeAgua(caso)
  const automatica = linhaDaAguaAutomatica(caso)
  const editada = typeof caso.linhaDaAgua === 'string'
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 sm:min-h-8">
        <Label htmlFor={id}>Meta de água</Label>
        {editada ? (
          <Button variant="link" size="sm" className="h-auto min-h-11 px-0 sm:min-h-8" onClick={() => aoAlterar({ linhaDaAgua: null })}>
            Usar a automática
          </Button>
        ) : null}
      </div>
      <Input
        id={id}
        value={editada ? (caso.linhaDaAgua ?? '') : (automatica ?? '')}
        placeholder={automatica === null ? 'Informe sexo e idade para a meta automática.' : undefined}
        aria-describedby={`${id}-dica`}
        className="h-11 sm:h-10"
        onChange={(e) => aoAlterar({ linhaDaAgua: e.target.value })}
      />
      <div id={`${id}-dica`} className="flex flex-col gap-1 text-xs text-muted-foreground">
        {meta ? <p>{textoDaMetaDeAgua(meta)}</p> : null}
        <p>{ONDE_APARECE}</p>
        {lembrete ? <p className="text-foreground">{lembrete}</p> : null}
      </div>
    </div>
  )
}
