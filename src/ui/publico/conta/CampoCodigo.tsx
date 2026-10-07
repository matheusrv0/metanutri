import { soDigitos } from '@/domain/conta.ts'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'

interface CampoCodigoProps {
  readonly id: string
  readonly valor: string
  readonly aoMudar: (valor: string) => void
  readonly invalido?: boolean | undefined
}

/**
 * O código que chega por e-mail (spec confirmacao-por-codigo, CA-406). Só aceita
 * dígitos e não tem `maxLength`: colar "123 456" cortaria o último número antes de
 * o espaço sair (CB-100). O teclado numérico vem do `inputMode`.
 */
export function CampoCodigo({ id, valor, aoMudar, invalido = false }: CampoCodigoProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Código de 6 dígitos</Label>
      <Input
        id={id}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        spellCheck={false}
        value={valor}
        onChange={(e) => aoMudar(soDigitos(e.target.value))}
        aria-invalid={invalido}
        className="numeros h-12 text-center text-xl font-semibold tracking-[0.3em]"
      />
    </div>
  )
}
