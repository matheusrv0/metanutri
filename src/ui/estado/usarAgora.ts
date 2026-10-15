import { useEffect, useState } from 'react'

const UM_MINUTO = 60_000

/**
 * A hora de agora, refeita a cada minuto e quando o nutricionista volta para a aba (spec whatsapp-e-retorno,
 * CA-529): o Painel e a Adesão abertos o dia inteiro não ficam com "hoje" e "já passou" velhos. A hora só muda
 * dentro do intervalo e do evento, nunca durante a renderização.
 */
export function useAgora(): Date {
  const [agora, setAgora] = useState(() => new Date())

  useEffect(() => {
    const atualizar = () => setAgora(new Date())
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') atualizar()
    }
    const intervalo = globalThis.setInterval(atualizar, UM_MINUTO)
    document.addEventListener('visibilitychange', aoVoltar)
    return () => {
      globalThis.clearInterval(intervalo)
      document.removeEventListener('visibilitychange', aoVoltar)
    }
  }, [])

  return agora
}
