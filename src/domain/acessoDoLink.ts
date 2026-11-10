// O último acesso do paciente ao link, como a nutricionista lê (spec lado-do-paciente, D-1223, CA-2239): "Abriu hoje ·
// marcou há 5 dias" ou "Nunca abriu". O acesso é o dia de Brasília que a nuvem guardou; a marcação, o dia em que o
// paciente marcou. Puro.
import { diasEntre, ultimaMarcacao, type Acompanhamento } from './acompanhamento.ts'
import { agoraEmBrasilia } from './retorno.ts'

function quantoTempo(dias: number): string {
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'ontem'
  return `há ${dias} dias`
}

/**
 * CA-2239: "Abriu hoje · marcou há 5 dias", "Abriu há 2 dias · nunca marcou" ou "Nunca abriu". O link de antes do 017
 * não tem o acesso guardado; com marcação, diz só quando marcou.
 */
export function textoDoAcesso(link: Pick<Acompanhamento, 'ultimoAcesso' | 'marcacoes'>, hoje: string): string {
  const marcou = ultimaMarcacao(link)
  const diasDaMarcacao = marcou === null ? Number.NaN : diasEntre(marcou, hoje)
  const marcacao = marcou === null || Number.isNaN(diasDaMarcacao) ? 'nunca marcou' : `marcou ${quantoTempo(diasDaMarcacao)}`
  const acesso = link.ultimoAcesso ?? null
  const diasDoAcesso = acesso === null ? Number.NaN : diasEntre(acesso, hoje)
  if (acesso === null || Number.isNaN(diasDoAcesso)) return marcou === null ? 'Nunca abriu' : `M${marcacao.slice(1)}`
  return `Abriu ${quantoTempo(diasDoAcesso)} · ${marcacao}`
}

/** "3/11": o dia de Brasília de um instante, para "No link desde 3/11" e "confirmado em 03/11". */
export function diaEMes(iso: string | null | undefined, comZero = false): string {
  if (!iso) return ''
  const quando = new Date(iso)
  if (Number.isNaN(quando.getTime())) return ''
  const [, mes = '', dia = ''] = agoraEmBrasilia(quando).dia.split('-')
  return `${comZero ? dia : String(Number(dia))}/${mes}`
}
