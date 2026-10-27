import { Clock } from 'lucide-react'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { horaEMinuto } from '@/domain/tempoDeSessao.ts'
import { useFimDaSessao } from './contextoSessao.ts'

/**
 * D-516 e CA-1444 (spec separacao-site-app): 10 minutos antes do limite total, a faixa no topo da área de trabalho, no
 * fluxo da página (não cobre nada), como o aviso de versão nova. Sem botão: o limite total não se estende.
 */
export function FaixaDoLimite() {
  const fim = useFimDaSessao()
  if (fim === null) return null
  return (
    <Alert variant="info" className="mb-6 print:hidden">
      <Clock aria-hidden="true" />
      <p className="min-w-0 flex-1">A sessão termina às {horaEMinuto(fim)}.</p>
    </Alert>
  )
}
