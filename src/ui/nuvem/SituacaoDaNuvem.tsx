import { useNuvem } from '../estado/contextoNuvem.ts'

/**
 * D-129 (spec dados-na-nuvem): "Salvando…" enquanto há mudança que ainda não está na nuvem (esperando
 * os 2 s ou indo), "Salvo" quando não há. Com a área travada, a trava fala por si (DP-17). O leitor de
 * tela só ouve o "Salvo": "Salvando…" a cada tecla seria barulho (DP-27).
 */
export function SituacaoDaNuvem() {
  const nuvem = useNuvem()
  if (nuvem === null) return null
  const { fase, trava, pendente, salvando } = nuvem.estado
  if (fase !== 'pronta' || trava !== null) return null
  const salvo = !pendente && !salvando
  return (
    <p role="status" className="shrink-0 text-xs text-muted-foreground">
      {salvo ? <span>Salvo</span> : <span aria-hidden="true">Salvando…</span>}
    </p>
  )
}
