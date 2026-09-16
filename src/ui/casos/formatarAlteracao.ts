const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const data = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** "Alterado hoje às 14:05", "Alterado ontem às 09:30" ou "Alterado em 03/09/2026". */
export function formatarAlteracao(iso: string, agora: Date = new Date()): string {
  const quando = new Date(iso)
  if (Number.isNaN(quando.getTime())) return 'Data de alteração desconhecida'
  const dias = Math.round((inicioDoDia(agora) - inicioDoDia(quando)) / 86_400_000)
  if (dias === 0) return `Alterado hoje às ${hora.format(quando)}`
  if (dias === 1) return `Alterado ontem às ${hora.format(quando)}`
  return `Alterado em ${data.format(quando)}`
}
