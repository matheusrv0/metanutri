import { useId } from 'react'
import { Label } from '@ds/componentes/forms/label.tsx'
import { cn } from '@ds/lib/cn.ts'
import { comToque } from '@ds/lib/toque.ts'

export interface OpcaoDaEscolha<T extends string> {
  readonly valor: T
  readonly rotulo: string
  readonly desativada?: boolean | undefined
}

interface EscolhaProps<T extends string> {
  readonly rotulo: string
  readonly opcoes: readonly OpcaoDaEscolha<T>[]
  /** `null` (ou um valor que a lista não tem, de uma versão mais nova) mostra o `vazio`. */
  readonly valor: T | null
  readonly aoEscolher: (valor: T) => void
  /** O texto do valor vazio, como "Origem não informada"; não se escolhe de volta. */
  readonly vazio?: string | undefined
  readonly rotuloOculto?: boolean | undefined
  /** 32 px com mouse, para a escolha dentro do cabeçalho de um cartão; 44 px no toque (D-1439). */
  readonly compacto?: boolean | undefined
  readonly desativado?: boolean | undefined
  readonly className?: string | undefined
}

/**
 * Uma escolha da antropometria: o rótulo ligado à lista do navegador, que no celular abre a do aparelho, e o texto do
 * valor vazio para o plano gravado antes (spec antropometria-telas, D-1404 e D-1407).
 */
export function Escolha<T extends string>({ rotulo, opcoes, valor, aoEscolher, vazio = 'Escolha', rotuloOculto = false, compacto = false, desativado = false, className }: EscolhaProps<T>) {
  const id = useId()
  const conhecido = valor !== null && opcoes.some((o) => o.valor === valor)
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Label htmlFor={id} className={rotuloOculto ? 'sr-only' : undefined}>
        {rotulo}
      </Label>
      <select
        id={id}
        value={conhecido ? valor : ''}
        disabled={desativado}
        onChange={(e) => {
          const escolhida = opcoes.find((o) => o.valor === e.target.value)
          if (escolhida) aoEscolher(escolhida.valor)
        }}
        className={comToque(
          cn(
            'h-11 w-full min-w-0 truncate rounded-md border border-input bg-card px-3 text-base text-foreground sm:h-10 sm:text-sm',
            'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            compacto && 'sm:h-8 sm:pointer-coarse:h-11',
          ),
        )}
      >
        {conhecido ? null : (
          <option value="" disabled>
            {vazio}
          </option>
        )}
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor} disabled={o.desativada}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </div>
  )
}
