interface MarcaSemDadoProps {
  /** Quantos alimentos do plano não têm o nutriente na tabela. */
  readonly semDado: number
}

/** A marca † de total possivelmente subestimado: falta de dado nunca entra como zero (CA-32). */
export function MarcaSemDado({ semDado }: MarcaSemDadoProps) {
  if (semDado <= 0) return null
  return (
    <abbr
      title={`${semDado} ${semDado === 1 ? 'alimento do plano não tem' : 'alimentos do plano não têm'} este nutriente na tabela: total possivelmente subestimado.`}
      className="ml-0.5 cursor-help align-super text-[10px] font-semibold text-warningtext no-underline"
    >
      †
    </abbr>
  )
}
