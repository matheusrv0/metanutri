import { DIGITOS_DO_CODIGO, soDigitos } from '@/domain/conta.ts'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'

interface CampoCodigoProps {
  readonly id: string
  readonly valor: string
  readonly aoMudar: (valor: string) => void
  readonly invalido?: boolean | undefined
  /** Quantos dígitos o código tem: 8 no e-mail; 6 no app autenticador (spec seguranca-lote-5, CA-835). */
  readonly digitos?: number | undefined
  /** Rótulo próprio, quando a tela tem dois códigos (o do e-mail e o do app; spec seguranca-lote-5, CA-858). */
  readonly rotulo?: string | undefined
}

/**
 * O código que chega por e-mail (spec confirmacao-por-codigo, CA-406 e D-106) ou o do app
 * autenticador. Só aceita dígitos e não tem `maxLength`: colar "1234 5678" cortaria o
 * último número antes de o espaço sair (CB-100). O teclado numérico vem do `inputMode`.
 */
export function CampoCodigo({ id, valor, aoMudar, invalido = false, digitos = DIGITOS_DO_CODIGO, rotulo }: CampoCodigoProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{rotulo ?? `Código de ${digitos} dígitos`}</Label>
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
