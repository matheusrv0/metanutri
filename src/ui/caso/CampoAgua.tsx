import { useId } from 'react'
import { linhaDaAguaAutomatica } from '@/domain/folhaDieta.ts'
import type { Caso } from '@/domain/tipos.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'

interface CampoAguaProps {
  readonly caso: Pick<Caso, 'pesoKg' | 'linhaDaAgua'>
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
}

/**
 * A linha da água da dieta impressa (spec conduta-da-nutricionista, D-298): mostra a automática (35 ml por kg) até a
 * nutricionista escrever outra; vazio tira a linha da folha; "Usar a automática" volta à conta pelo peso.
 */
export function CampoAgua({ caso, aoAlterar }: CampoAguaProps) {
  const id = useId()
  const automatica = linhaDaAguaAutomatica(caso.pesoKg)
  const editada = typeof caso.linhaDaAgua === 'string'
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 sm:min-h-8">
        <Label htmlFor={id}>Água na dieta</Label>
        {editada ? (
          <Button variant="link" size="sm" className="h-auto min-h-11 px-0 sm:min-h-8" onClick={() => aoAlterar({ linhaDaAgua: null })}>
            Usar a automática
          </Button>
        ) : null}
      </div>
      <Input
        id={id}
        value={editada ? (caso.linhaDaAgua ?? '') : (automatica ?? '')}
        placeholder={automatica === null ? 'Informe o peso para a meta automática' : undefined}
        aria-describedby={`${id}-dica`}
        className="h-11 sm:h-10"
        onChange={(e) => aoAlterar({ linhaDaAgua: e.target.value })}
      />
      <p id={`${id}-dica`} className="text-xs text-muted-foreground">
        Sai no começo das orientações da dieta impressa. Vazio, não sai.
      </p>
    </div>
  )
}
