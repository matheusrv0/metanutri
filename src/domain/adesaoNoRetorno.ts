// O resumo do último link do paciente no bloco Retorno da anamnese (spec ficha-unica, D-358 e CA-1064).
import { diasEntre, type Acompanhamento } from './acompanhamento.ts'
import { dataCompleta } from './formatarData.ts'

const dia = (iso: string) => dataCompleta(iso)

/** "Link de 10/09/2026: missão marcada em 12 de 30 dias. Última marcação em 18/10/2026." */
export function resumoDaAdesao(acompanhamento: Acompanhamento, hoje: string): string {
  const inicio = acompanhamento.criadoEm.slice(0, 10)
  const passados = diasEntre(inicio, hoje)
  const dias = Math.max(1, (Number.isNaN(passados) ? 0 : passados) + 1)
  const marcados = acompanhamento.marcacoes.filter((m) => m.feitas.length > 0 && m.dia >= inicio && m.dia <= hoje).map((m) => m.dia)
  const abertura = `Link de ${dia(inicio)}`
  if (marcados.length === 0) return `${abertura}: nenhuma missão marcada ainda.`
  const ultima = [...marcados].sort().at(-1) ?? inicio
  const contagem = `missão marcada em ${marcados.length} de ${dias} ${dias === 1 ? 'dia' : 'dias'}`
  return `${abertura}: ${contagem}. Última marcação em ${dia(ultima)}.`
}
