import { useId } from 'react'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'

interface CampoTextoProps {
  readonly rotulo: string
  readonly valor: string
  readonly aoMudar: (valor: string) => void
  readonly erro?: string | undefined
  /** Explicação curta abaixo do campo (ex.: unidade ou exemplo). */
  readonly dica?: string | undefined
  readonly tipo?: 'text' | 'date'
  /** Teclado numérico no celular e vírgula aceita (CB-12). */
  readonly numerico?: boolean
  readonly sufixo?: string
  readonly placeholder?: string
  /** Mantém o rótulo só para leitores de tela (linhas de tabela onde a coluna já nomeia o campo). */
  readonly rotuloOculto?: boolean
}

export function CampoTexto({ rotulo, valor, aoMudar, erro, dica, tipo = 'text', numerico = false, sufixo, placeholder, rotuloOculto = false }: CampoTextoProps) {
  const id = useId()
  const idErro = `${id}-erro`
  const idDica = `${id}-dica`
  const descricao = [erro ? idErro : null, dica ? idDica : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className={rotuloOculto ? 'sr-only' : undefined}>
        {rotulo}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={tipo}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descricao || undefined}
          inputMode={numerico ? 'decimal' : undefined}
          placeholder={placeholder}
          className={sufixo ? 'pr-9' : undefined}
        />
        {sufixo ? <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{sufixo}</span> : null}
      </div>
      {erro ? (
        <p id={idErro} role="alert" className="text-xs text-errortext">
          {erro}
        </p>
      ) : dica ? (
        <p id={idDica} className="text-xs text-muted-foreground">
          {dica}
        </p>
      ) : null}
    </div>
  )
}
