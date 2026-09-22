// Datas em pt-BR num lugar só, pelo Intl. Três telas montavam "dd/mm" na mão,
// duas delas com a mesma função copiada.

/**
 * Data de calendário (AAAA-MM-DD ou ISO completo) lida em UTC.
 * Sem o UTC, "2026-09-12" viraria 11/09 à noite no Brasil: a meia-noite UTC
 * cai no dia anterior no fuso local.
 */
function lerData(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return null
  const [ano, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  // O Date "corrige" mês 13 para janeiro do ano seguinte e 30/02 para 2 de março.
  // Se o que saiu não é o que entrou, a data não existe.
  const existe = data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  return existe ? data : null
}

const DIA_MES = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })
const COMPLETA = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

/** "2026-09-12" → "12/09". Entrada inválida ou vazia devolve vazio. */
export function dataCurta(iso: string | null | undefined): string {
  const data = lerData(iso)
  return data ? DIA_MES.format(data) : ''
}

/** "2026-09-12" → "12/09/2026". Entrada inválida ou vazia devolve vazio. */
export function dataCompleta(iso: string | null | undefined): string {
  const data = lerData(iso)
  return data ? COMPLETA.format(data) : ''
}
