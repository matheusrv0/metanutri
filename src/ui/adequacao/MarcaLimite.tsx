interface MarcaLimiteProps {
  /** Por que o limite superior da tabela não vale para os alimentos; `null` sem nota. */
  readonly nota: string | null
}

/** A marca ‡: o limite superior da tabela não vale para a forma presente nos alimentos. */
export function MarcaLimite({ nota }: MarcaLimiteProps) {
  if (!nota) return null
  return (
    <abbr title={nota} className="ml-0.5 cursor-help align-super text-[10px] font-semibold text-muted-foreground no-underline">
      ‡
    </abbr>
  )
}
