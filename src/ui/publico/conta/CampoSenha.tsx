import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'

interface CampoSenhaProps {
  readonly id: string
  readonly rotulo: string
  readonly valor: string
  readonly aoMudar: (valor: string) => void
  /** `true` no cadastro e na troca: o navegador sugere senha forte. */
  readonly novaSenha: boolean
  readonly invalido?: boolean | undefined
  readonly dica?: string | undefined
}

/** Campo de senha com o olho para mostrar o que foi digitado (mockup conta e checkout v1). */
export function CampoSenha({ id, rotulo, valor, aoMudar, novaSenha, invalido = false, dica }: CampoSenhaProps) {
  const [visivel, setVisivel] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visivel ? 'text' : 'password'}
          autoComplete={novaSenha ? 'new-password' : 'current-password'}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          aria-invalid={invalido}
          aria-describedby={dica ? `${id}-dica` : undefined}
          className="pr-12"
        />
        <button
          type="button"
          onClick={() => setVisivel((v) => !v)}
          aria-label={visivel ? 'Esconder a senha' : 'Mostrar a senha'}
          aria-pressed={visivel}
          className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-content-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visivel ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
      {dica ? (
        <p id={`${id}-dica`} className="text-xs text-muted-foreground">
          {dica}
        </p>
      ) : null}
    </div>
  )
}
