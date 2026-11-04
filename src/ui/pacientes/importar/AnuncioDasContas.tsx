import { useEffect, useRef, useState } from 'react'

/** Quanto esperar depois da última mudança antes de anunciar: digitar a data não vira um anúncio por tecla. */
export const PAUSA_DO_ANUNCIO_MS = 700

interface AnuncioDasContasProps {
  readonly prontos: number
  readonly comProblema: number
}

const quantos = (n: number, um: string, varios: string): string => `${n.toLocaleString('pt-BR')} ${n === 1 ? um : varios}`

/**
 * CA-1947: o leitor de tela ouve as contas da prévia quando elas mudam de fato, uma vez, depois de uma pausa. Ao abrir a
 * prévia, nada: o foco vai ao título, e as contas estão logo abaixo dele.
 */
export function AnuncioDasContas({ prontos, comProblema }: AnuncioDasContasProps) {
  const texto = `${quantos(prontos, 'pronto para importar', 'prontos para importar')}, ${quantos(comProblema, 'com problema', 'com problema')}.`
  const anterior = useRef(texto)
  const [anuncio, setAnuncio] = useState('')

  useEffect(() => {
    if (texto === anterior.current) return
    const espera = setTimeout(() => {
      anterior.current = texto
      setAnuncio(texto)
    }, PAUSA_DO_ANUNCIO_MS)
    return () => clearTimeout(espera)
  }, [texto])

  return (
    <p role="status" aria-label="Anúncio das contas" className="sr-only">
      {anuncio}
    </p>
  )
}
