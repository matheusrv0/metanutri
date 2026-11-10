// A mensagem da nutricionista e a próxima consulta no link (spec lado-do-paciente, D-1208 e D-1209): como Hoje e Semana
// as escrevem. A consulta vem da ficha (D-143) e some quando passa (D-145, com a mesma regra do Painel).
import { MENSAGEM_MAXIMA } from './acompanhamento.ts'
import { agoraEmBrasilia, consultaPassou, lerConsulta } from './retorno.ts'

export { MENSAGEM_MAXIMA }

const DIAS_CURTOS = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'] as const
const DIAS_LONGOS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const
const MESES_CURTOS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'] as const
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'] as const

/** "Ana Lima · 3 nov." (CA-2212); sem nome, só a data; sem data, só o nome. O dia é o de Brasília. */
export function assinaturaDaMensagem(nutricionista: string | null, mensagemEm: string | null | undefined): string {
  const quando = mensagemEm ? Date.parse(mensagemEm) : Number.NaN
  const data = Number.isNaN(quando) ? '' : (() => {
    const dia = agoraEmBrasilia(new Date(quando)).dia
    return `${Number(dia.slice(8, 10))} ${MESES_CURTOS[Number(dia.slice(5, 7)) - 1] ?? ''}`
  })()
  return [nutricionista?.trim() || '', data].filter((parte) => parte !== '').join(' · ')
}

/** A mensagem que aparece: texto sem espaço nas pontas, até 400; vazia, nenhuma (o cartão some, CA-2212). */
export function mensagemDoLink(mensagem: string | null | undefined): string | null {
  const texto = mensagem?.trim() ?? ''
  return texto === '' ? null : texto.slice(0, MENSAGEM_MAXIMA)
}

const diaDaSemana = (dia: string): number => new Date(`${dia}T00:00:00Z`).getUTCDay()

/** A consulta que ainda vale: sem consulta, com valor estranho ou já passada (D-145), nula. */
function consultaQueVale(valor: string | null | undefined, agora: Date) {
  const consulta = lerConsulta(valor)
  return consulta && !consultaPassou(consulta, agoraEmBrasilia(agora)) ? consulta : null
}

/** Em Hoje (CA-2214): "Próxima consulta: ter., 17/11, às 14:30"; sem horário, "Próxima consulta: ter., 17/11". */
export function consultaEmHoje(valor: string | null | undefined, agora: Date): string | null {
  const consulta = consultaQueVale(valor, agora)
  if (!consulta) return null
  const data = `${DIAS_CURTOS[diaDaSemana(consulta.dia)] ?? ''}, ${consulta.dia.slice(8, 10)}/${consulta.dia.slice(5, 7)}`
  return `Próxima consulta: ${data}${consulta.hora ? `, às ${consulta.hora}` : ''}`
}

/** Em Semana (CA-2214): "Próxima consulta: terça, 17 de novembro, às 14:30". */
export function consultaEmSemana(valor: string | null | undefined, agora: Date): string | null {
  const consulta = consultaQueVale(valor, agora)
  if (!consulta) return null
  const dia = Number(consulta.dia.slice(8, 10))
  const data = `${DIAS_LONGOS[diaDaSemana(consulta.dia)] ?? ''}, ${dia === 1 ? '1º' : dia} de ${MESES[Number(consulta.dia.slice(5, 7)) - 1] ?? ''}`
  return `Próxima consulta: ${data}${consulta.hora ? `, às ${consulta.hora}` : ''}`
}
