import { useState, useSyncExternalStore } from 'react'
import type { IdPlano } from '@/domain/conta.ts'
import type { RotaIndexavel } from '@/seo/paginas.ts'
import { PaginaDoSite } from './PaginaDoSite.tsx'
import type { EstadoDaMudanca, Remetente } from './remetente.ts'
import { TelaContinuar } from './TelaContinuar.tsx'

interface SiteProps {
  readonly rota: RotaIndexavel
  readonly destaque: IdPlano | null
  /** Sobrou dado que só existe neste endereço (D-511): todo caminho para o app passa por "Continuar" (D-527). */
  readonly remetente: Remetente | null
  /** O endereço já pedia o app (tela do app, volta, ícone instalado) e há dado só aqui: começa em "Continuar". */
  readonly comecarEmContinuar: boolean
  /** Vai ao app, sem dado só aqui. Os testes passam um dublê. */
  readonly irAoApp?: (endereco: string) => void
}

const semAssinatura = () => () => undefined
const parado = (): EstadoDaMudanca => 'parado'
const irNoNavegador = (endereco: string) => globalThis.location.assign(endereco)

/**
 * O que o pacote do site mostra (spec separacao-site-app, DP-SA-53): a página da rota ou, quando um caminho para o app
 * acha dado que só existe aqui, a tela "Continuar", ligada ao remetente da mudança (CA-1429, CA-1430).
 */
export function Site({ rota, destaque, remetente, comecarEmContinuar, irAoApp = irNoNavegador }: SiteProps) {
  const [continuar, setContinuar] = useState(comecarEmContinuar && remetente !== null)
  const estado = useSyncExternalStore(remetente?.assinar ?? semAssinatura, () => remetente?.estado ?? 'parado', parado)

  if (continuar && remetente !== null) return <TelaContinuar estado={estado} aoContinuar={remetente.continuar} />
  return <PaginaDoSite rota={rota} destaque={destaque} aoIrAoApp={(endereco) => (remetente === null ? irAoApp(endereco) : setContinuar(true))} />
}
