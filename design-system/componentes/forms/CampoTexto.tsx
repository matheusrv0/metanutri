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
  readonly tipo?: 'text' | 'date' | 'time'
  /** Teclado numérico no celular e vírgula aceita (CB-12). */
  readonly numerico?: boolean
  readonly sufixo?: string
  readonly placeholder?: string
  /** Mantém o rótulo só para leitores de tela (linhas de tabela onde a coluna já nomeia o campo). */
  readonly rotuloOculto?: boolean
  readonly desativado?: boolean | undefined
  /** Põe o cursor no campo ao abrir a tela (o endereço da ficha que leva ao Telefone, spec whatsapp-e-retorno). */
  readonly focar?: boolean | undefined
  /** Quando o campo perde o foco (o horário apagado da próxima consulta só vale aí). */
  readonly aoSair?: (() => void) | undefined
}

/**
 * A folga da direita é a do sufixo, que fica a 10 px da borda (M-002, D-803 da spec ajustes-mobile). Medido em Manrope
 * 12 px: "g" e "%" ocupam até 10 px; "ml", "kg" e "mm", até 21; "kcal" e "anos", até 25; "meses", "litros",
 * "g ou ml" e "semanas", até 46. Com 4 px de respiro, o número digitado não entra por baixo da unidade, e a unidade curta
 * não rouba o lugar dos algarismos.
 */
function folgaDoSufixo(sufixo: string): string {
  if (sufixo.length === 1) return 'pr-6'
  if (sufixo.length === 2) return 'pr-9'
  if (sufixo.length <= 4) return 'pr-10'
  if (sufixo.length <= 7) return 'pr-15'
  return 'pr-20'
}

export function CampoTexto({
  rotulo,
  valor,
  aoMudar,
  erro,
  dica,
  tipo = 'text',
  numerico = false,
  sufixo,
  placeholder,
  rotuloOculto = false,
  desativado = false,
  focar = false,
  aoSair,
}: CampoTextoProps) {
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
          disabled={desativado}
          autoFocus={focar}
          onBlur={aoSair}
          className={sufixo ? folgaDoSufixo(sufixo) : undefined}
        />
        {sufixo ? <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">{sufixo}</span> : null}
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
