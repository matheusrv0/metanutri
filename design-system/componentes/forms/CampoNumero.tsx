import { useState } from 'react'
import { lerNumero } from '@/domain/caso.ts'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'

interface CampoNumeroProps {
  readonly rotulo: string
  readonly valor: number | null
  /** O número lido e o texto como foi digitado (quem chama pode marcar o texto que não é número). */
  readonly aoMudar: (valor: number | null, texto: string) => void
  readonly erro?: string | undefined
  readonly dica?: string | undefined
  readonly sufixo?: string
  readonly rotuloOculto?: boolean
  /** Texto-guia do campo vazio (ex.: a meta calculada, que só vira número quando a pessoa digita). */
  readonly placeholder?: string | undefined
  /** Como o texto vira número; padrão, `lerNumero` (CB-12). "Meus alimentos" lê como o rótulo (D-497). */
  readonly ler?: (texto: string) => number | null
}

const paraTexto = (valor: number | null) => (valor === null ? '' : String(valor).replace('.', ','))

/**
 * Campo numérico que guarda o texto digitado enquanto a pessoa escreve.
 * Sem isso, digitar "68," (ainda sem número válido) apagaria o campo (CB-12).
 */
export function CampoNumero({ rotulo, valor, aoMudar, erro, dica, sufixo, rotuloOculto = false, placeholder, ler = lerNumero }: CampoNumeroProps) {
  const [texto, setTexto] = useState(() => paraTexto(valor))
  const [valorConhecido, setValorConhecido] = useState(valor)

  // Ajuste durante a renderização (padrão do React): só reescreve o texto quando o valor veio de fora.
  if (valor !== valorConhecido) {
    setValorConhecido(valor)
    if (ler(texto) !== valor) setTexto(paraTexto(valor))
  }

  return (
    <CampoTexto
      rotulo={rotulo}
      valor={texto}
      aoMudar={(v) => {
        setTexto(v)
        aoMudar(ler(v), v)
      }}
      numerico
      rotuloOculto={rotuloOculto}
      erro={erro}
      dica={dica}
      {...(sufixo ? { sufixo } : {})}
      {...(placeholder ? { placeholder } : {})}
    />
  )
}
