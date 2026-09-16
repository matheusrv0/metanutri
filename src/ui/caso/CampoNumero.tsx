import { useState } from 'react'
import { lerNumero } from '@/domain/caso.ts'
import { CampoTexto } from './CampoTexto.tsx'

interface CampoNumeroProps {
  readonly rotulo: string
  readonly valor: number | null
  readonly aoMudar: (valor: number | null) => void
  readonly erro?: string | undefined
  readonly dica?: string | undefined
  readonly sufixo?: string
  readonly rotuloOculto?: boolean
}

const paraTexto = (valor: number | null) => (valor === null ? '' : String(valor).replace('.', ','))

/**
 * Campo numérico que guarda o texto digitado enquanto a pessoa escreve.
 * Sem isso, digitar "68," (ainda sem número válido) apagaria o campo (CB-12).
 */
export function CampoNumero({ rotulo, valor, aoMudar, erro, dica, sufixo, rotuloOculto = false }: CampoNumeroProps) {
  const [texto, setTexto] = useState(() => paraTexto(valor))
  const [valorConhecido, setValorConhecido] = useState(valor)

  // Ajuste durante a renderização (padrão do React): só reescreve o texto quando o valor veio de fora.
  if (valor !== valorConhecido) {
    setValorConhecido(valor)
    if (lerNumero(texto) !== valor) setTexto(paraTexto(valor))
  }

  return (
    <CampoTexto
      rotulo={rotulo}
      valor={texto}
      aoMudar={(v) => {
        setTexto(v)
        aoMudar(lerNumero(v))
      }}
      numerico
      rotuloOculto={rotuloOculto}
      erro={erro}
      dica={dica}
      {...(sufixo ? { sufixo } : {})}
    />
  )
}
