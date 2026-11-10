import { ImageOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { FRASES, type ArmazenamentoDeFotos } from '@/domain/fotosDaAvaliacao.ts'

interface QuadroDaFotoProps {
  readonly armazenamento: ArmazenamentoDeFotos
  readonly caminho: string
  /** "Foto de frente, 03/11/2026". */
  readonly alt: string
}

interface Carga {
  /** O caminho e a vez do pedido a que esta resposta pertence. */
  readonly chave: string
  readonly url: string | null
}

/**
 * Uma foto da avaliação, em 3:4, pela URL assinada de 10 minutos (D-1457). A imagem que não abre (o link venceu) pede
 * um link novo uma vez; falhando de novo, o quadro diz "Não foi possível abrir a foto." (CB-1414). Nada de baixar nem de
 * compartilhar (D-1456).
 */
export function QuadroDaFoto({ armazenamento, caminho, alt }: QuadroDaFotoProps) {
  const [vez, setVez] = useState(0)
  const [falhou, setFalhou] = useState(false)
  const [carga, setCarga] = useState<Carga | null>(null)
  const chave = `${caminho}#${vez}`

  useEffect(() => {
    let vivo = true
    void armazenamento.assinar(caminho).then((url) => {
      if (vivo) setCarga({ chave: `${caminho}#${vez}`, url })
    })
    return () => {
      vivo = false
    }
  }, [armazenamento, caminho, vez])

  const atual = carga?.chave === chave ? carga : null
  const semImagem = falhou || (atual !== null && atual.url === null)

  return (
    <div className="relative grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-md border border-border bg-surfacesunken text-muted-foreground">
      {semImagem ? (
        <p className="flex flex-col items-center gap-1.5 px-2 text-center text-xs">
          <ImageOff className="size-5" aria-hidden="true" />
          {FRASES.abrir}
        </p>
      ) : atual?.url ? (
        <img
          src={atual.url}
          alt={alt}
          draggable={false}
          className="size-full object-cover"
          onError={() => {
            if (vez === 0) setVez(1)
            else setFalhou(true)
          }}
        />
      ) : (
        <span role="status" className="sr-only">
          Abrindo a foto…
        </span>
      )}
    </div>
  )
}
