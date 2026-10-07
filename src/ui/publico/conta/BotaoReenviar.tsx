import { useEffect, useRef, useState } from 'react'
import { Button } from '@ds/componentes/forms/button.tsx'

interface BotaoReenviarProps {
  readonly rotulo: string
  /** Pede o código de novo. Devolve se mandou: só então o botão espera. */
  readonly aoReenviar: () => Promise<boolean>
}

const ESPERA_S = 60

/** Pedir outro código e esperar 60 segundos antes de poder pedir de novo (spec confirmacao-por-codigo, CA-409). */
export function BotaoReenviar({ rotulo, aoReenviar }: BotaoReenviarProps) {
  const [espera, setEspera] = useState(0)
  const [enviando, setEnviando] = useState(false)
  // Trava de verdade contra o clique duplo: o estado só muda no próximo render.
  const enviandoRef = useRef(false)

  useEffect(() => {
    if (espera <= 0) return
    const relogio = globalThis.setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => globalThis.clearTimeout(relogio)
  }, [espera])

  const reenviar = async () => {
    if (enviandoRef.current) return
    enviandoRef.current = true
    setEnviando(true)
    const mandou = await aoReenviar()
    enviandoRef.current = false
    setEnviando(false)
    if (mandou) setEspera(ESPERA_S)
  }

  return (
    <Button variant="outline" size="lg" block disabled={espera > 0} loading={enviando} onClick={() => void reenviar()}>
      {espera > 0 ? `Reenviar em ${espera} s` : rotulo}
    </Button>
  )
}
