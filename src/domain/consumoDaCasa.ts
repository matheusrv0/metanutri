// Óleo, sal e açúcar por mês na casa, e o valor por pessoa por dia (spec ficha-unica, D-361). Só a conta: sem
// julgar, a conduta é do nutricionista.

export interface ConsumoMensal {
  /** Litros de óleo por mês. */
  readonly oleoL: number | null
  /** Quilos de sal por mês. */
  readonly salKg: number | null
  /** Quilos de açúcar por mês. */
  readonly acucarKg: number | null
}

export const CONSUMO_VAZIO: ConsumoMensal = { oleoL: null, salKg: null, acucarKg: null }

const positivo = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null)

/** D-365: o que não se lê vira vazio. */
export function lerConsumo(valor: unknown): ConsumoMensal {
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) return CONSUMO_VAZIO
  const o = valor as Record<string, unknown>
  return { ...o, oleoL: positivo(o['oleoL']), salKg: positivo(o['salKg']), acucarKg: positivo(o['acucarKg']) }
}

const DIAS_NO_MES = 30

/**
 * "≈ 8 ml de óleo, 8 g de sal e 8 g de açúcar por pessoa por dia."; `null` sem pessoas na casa ou sem nenhum dos três.
 */
export function consumoPorPessoa(consumo: ConsumoMensal, pessoas: number | null): string | null {
  if (pessoas === null || !(pessoas >= 1)) return null
  const porDia = (total: number) => Math.round((total * 1000) / pessoas / DIAS_NO_MES)
  const partes = [
    consumo.oleoL === null ? null : `${porDia(consumo.oleoL)} ml de óleo`,
    consumo.salKg === null ? null : `${porDia(consumo.salKg)} g de sal`,
    consumo.acucarKg === null ? null : `${porDia(consumo.acucarKg)} g de açúcar`,
  ].filter((p): p is string => p !== null)
  if (partes.length === 0) return null
  const lista = partes.length === 1 ? (partes[0] ?? '') : `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1] ?? ''}`
  return `≈ ${lista} por pessoa por dia.`
}
