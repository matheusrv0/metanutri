interface LinhaCalculoProps {
  readonly rotulo: string
  readonly valor: string
}

/** Uma linha de "Ver cálculo" no Resumo do dia: o nome à esquerda, o número à direita. */
export function LinhaCalculo({ rotulo, valor }: LinhaCalculoProps) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="numeros text-right font-medium text-heading">{valor}</dd>
    </div>
  )
}
