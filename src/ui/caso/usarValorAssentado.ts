import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

/**
 * O valor depois que a pessoa para de mexer nele: acompanha `valor` só `ms` depois da última mudança, ou na hora com
 * `assentar` (ao sair do campo ou no Tab). Assim, o que depende de um número digitado não pisca a cada tecla
 * (spec revisao-geral-trabalho, D-244). Trocar a `chave` (outro plano) vale na hora, sem esperar (CA-784).
 */
export function useValorAssentado<T>(valor: T, ms: number, chave: unknown = null): readonly [T, () => void] {
  const [assentado, setAssentado] = useState(valor)
  const [chaveConhecida, setChaveConhecida] = useState(chave)

  // Ajuste durante a renderização (padrão do React): outro plano não espera o meio segundo.
  let atual = assentado
  if (!Object.is(chave, chaveConhecida)) {
    setChaveConhecida(chave)
    setAssentado(valor)
    atual = valor
  }

  useEffect(() => {
    if (Object.is(valor, assentado)) return
    const espera = globalThis.setTimeout(() => setAssentado(valor), ms)
    return () => globalThis.clearTimeout(espera)
  }, [valor, assentado, ms])

  // flushSync: no Tab, o campo que aparece precisa estar na página antes de o navegador escolher o próximo foco.
  const assentar = () => {
    if (!Object.is(valor, atual)) flushSync(() => setAssentado(valor))
  }

  return [atual, assentar] as const
}
