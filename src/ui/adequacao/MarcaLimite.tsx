interface MarcaLimiteProps {
  /** Para que forma o limite superior da tabela vale; `null` sem nota. */
  readonly nota: string | null
}

/** A marca ‡: para que forma do nutriente o limite superior da tabela vale (D-470 da spec sugestoes-com-criterio). */
export function MarcaLimite({ nota }: MarcaLimiteProps) {
  if (!nota) return null
  return (
    <abbr title={nota} className="ml-0.5 cursor-help align-super text-[10px] font-semibold text-muted-foreground no-underline">
      ‡
    </abbr>
  )
}
