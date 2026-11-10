// Os avisos por e-mail como a nutricionista os vê (spec lado-do-paciente, D-1227, CA-2260 a CA-2265): o estado de cada
// aviso para o paciente, o convite, a origem do endereço e o próximo e-mail. Puro: lê o que `emails_do_link` devolveu e
// usa a mesma regra da função `avisos` para o próximo (DP-LP-25).
import { proximoAviso, semanaDoResumo, type AceiteAtivo, type LembreteEnviado, type ProximoAviso } from '../../supabase/functions/_shared/avisos/regras.ts'
import { NOME_DO_AVISO, TIPOS_DE_AVISO, todoDia, type TipoDeAviso } from '../../supabase/functions/_shared/avisos/tipos.ts'
import { diaEMes } from './acessoDoLink.ts'
import type { Acompanhamento } from './acompanhamento.ts'
import type { EmailsDoLink, EnvioDoLink, EstadoDoEnvio } from './emailsDoLink.ts'
import { agoraEmBrasilia } from './retorno.ts'

/** O paciente recebe este aviso agora: oferecido, aceito para o e-mail de agora, sem ter saído, sem devolução nem pedido de parar. */
export function avisoLigado(emails: EmailsDoLink, tipo: TipoDeAviso): boolean {
  if (!emails.ofertas[tipo] || emails.supressao !== null || emails.parouTudoEm !== null) return false
  return emails.aceites.some((a) => a.tipo === tipo && a.saiuEm === null)
}

/** O tom do selo do estado: verde quando recebe, vermelho quando o e-mail não funciona, cinza no resto. */
export type TomDoEstado = 'ok' | 'neutro' | 'erro' | 'desligado'

export interface EstadoDoAvisoNaFicha {
  readonly texto: string
  readonly tom: TomDoEstado
}

/** CA-2227: o convite (S2 com o pedido de aceite) sai uma vez por mês, no máximo. */
export const DIAS_ENTRE_CONVITES = 30
/** O pedido de aceite vale 7 dias (CB-1222): depois disso, sem aceite, "Não aceitou". */
const DIAS_DO_ACEITE = 7
const DIA_MS = 24 * 60 * 60 * 1000

const diasDesde = (iso: string | null, agora: Date): number => (iso === null ? Number.POSITIVE_INFINITY : (agora.getTime() - new Date(iso).getTime()) / DIA_MS)

/**
 * CA-2260, CA-2263 e CA-2265: o estado de um aviso para o paciente. A ordem conta: o interruptor dela vem primeiro
 * ("Desligado por você"), depois o endereço que não funciona, e só então o aceite do paciente.
 */
export function estadoDoAviso(emails: EmailsDoLink, tipo: TipoDeAviso, agora: Date): EstadoDoAvisoNaFicha {
  if (!emails.ofertas[tipo]) return { texto: 'Desligado por você', tom: 'desligado' }
  if (emails.supressao === 'devolvido') return { texto: 'E-mail devolvido', tom: 'erro' }
  if (emails.supressao === 'queixa') return { texto: 'Pediu para não receber', tom: 'erro' }
  if (emails.parouTudoEm !== null) return { texto: `Saiu em ${diaEMes(emails.parouTudoEm, true)}`, tom: 'neutro' }
  const ativo = emails.aceites.find((a) => a.tipo === tipo && a.saiuEm === null)
  if (ativo) return tipo === 'semana' && ativo.pausadoEm !== null ? { texto: 'Pausado: sem uso há 3 semanas', tom: 'neutro' } : { texto: 'Recebe', tom: 'ok' }
  const saiu = emails.aceites.filter((a) => a.tipo === tipo && a.saiuEm !== null).sort((a, b) => (b.saiuEm ?? '').localeCompare(a.saiuEm ?? ''))[0]
  if (saiu?.saiuEm) return { texto: `Saiu em ${diaEMes(saiu.saiuEm, true)}`, tom: 'neutro' }
  if (emails.pendentes.includes(tipo) || diasDesde(emails.conviteEm, agora) < DIAS_DO_ACEITE) return { texto: 'Esperando o aceite', tom: 'neutro' }
  if (emails.conviteEm !== null) return { texto: 'Não aceitou', tom: 'neutro' }
  return { texto: 'Sem aceite', tom: 'neutro' }
}

/** O dia da semana (0 é domingo) de um aceite, no dia de Brasília: o resumo sai nesse dia (D-1229). */
export const diaDaSemanaDoAceite = (aceitoEm: string): number => new Date(`${agoraEmBrasilia(new Date(aceitoEm)).dia}T00:00:00Z`).getUTCDay()

/** A linha de baixo de cada aviso na ficha (protótipo AvisosNutri). */
export function quandoDoAviso(emails: EmailsDoLink, tipo: TipoDeAviso): string {
  if (tipo === 'plano') return 'Quando você atualizar o link'
  if (tipo === 'lembrete') return 'Depois de 3 dias sem marcar; 2 por pausa, no máximo'
  const aceite = emails.aceites.find((a) => a.tipo === 'semana' && a.saiuEm === null)
  return aceite ? `${todoDia(diaDaSemanaDoAceite(aceite.aceitoEm))}, às 8h` : 'Toda semana, às 8h, no dia do aceite'
}

/** "da ficha · avisos aceitos por Juliana em 22/10" ou "confirmado por Juliana em 03/11" (CA-2260). */
export function origemDoEmail(emails: EmailsDoLink, primeiroNome: string): string {
  const quem = primeiroNome || 'o paciente'
  if (emails.origem === 'paciente') return emails.confirmadoEm ? `confirmado por ${quem} em ${diaEMes(emails.confirmadoEm, true)}` : `dado por ${quem} no link`
  const primeiro = emails.aceites
    .filter((a) => a.saiuEm === null)
    .map((a) => a.aceitoEm)
    .sort()[0]
  return primeiro ? `da ficha · avisos aceitos por ${quem} em ${diaEMes(primeiro, true)}` : 'da ficha'
}

/**
 * D-1227 e CA-2265: "Enviar convite" aparece com um e-mail que funciona e algum aviso oferecido que o paciente ainda não
 * recebe. Pode mandar se o último convite foi há um mês ou mais.
 */
export function convite(emails: EmailsDoLink, agora: Date): { readonly aparece: boolean; readonly pode: boolean; readonly nota: string } {
  const funciona = emails.email !== null && emails.supressao === null && emails.parouTudoEm === null
  const falta = TIPOS_DE_AVISO.some((t) => emails.ofertas[t] && !emails.aceites.some((a) => a.tipo === t && a.saiuEm === null))
  const pode = diasDesde(emails.conviteEm, agora) >= DIAS_ENTRE_CONVITES
  const nota = emails.conviteEm === null ? 'Um convite por mês, no máximo.' : `Último convite em ${diaEMes(emails.conviteEm, true)}. Um por mês.`
  return { aparece: funciona && falta, pode, nota }
}

// ---------- O próximo e-mail (DP-LP-25) e os enviados (CA-2264) ----------

const SAIU: readonly EstadoDoEnvio[] = ['enviado', 'entregue', 'devolvido', 'devolucao-temporaria', 'queixa']

/** O que a ficha precisa para prever: o link (marcações, plano, acesso) e os e-mails dele. */
export function proximoDoLink(link: Pick<Acompanhamento, 'marcacoes' | 'planoEm' | 'ultimoAcesso'>, emails: EmailsDoLink, agora: Date): ProximoAviso | null {
  if (emails.email === null || emails.supressao !== null || emails.parouTudoEm !== null) return null
  const aceites: AceiteAtivo[] = emails.aceites
    .filter((a) => a.saiuEm === null && emails.ofertas[a.tipo])
    .map((a) => ({ tipo: a.tipo, aceitoEm: a.aceitoEm, diaDaSemana: diaDaSemanaDoAceite(a.aceitoEm), pausado: a.pausadoEm !== null }))
  const lembretes: LembreteEnviado[] = emails.envios
    .filter((e): e is EnvioDoLink & { readonly tipo: 'A3' | 'A4' } => (e.tipo === 'A3' || e.tipo === 'A4') && SAIU.includes(e.estado))
    .map((e) => ({ tipo: e.tipo, dia: agoraEmBrasilia(new Date(e.criadoEm)).dia }))
  return proximoAviso({ agora, marcacoes: link.marcacoes, planoEm: link.planoEm ?? null, ultimoAcesso: link.ultimoAcesso ?? null, a1Para: emails.a1Para, aceites, lembretes })
}

/** O nome do tipo do próximo, como a ficha escreve ("Resumo da semana", "Lembrete"). */
export const NOME_DO_PROXIMO: Readonly<Record<ProximoAviso['tipo'], string>> = { A1: NOME_DO_AVISO.plano, A2: NOME_DO_AVISO.semana, A3: 'Lembrete', A4: 'Último lembrete' }

const SEMANA_CURTA = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })

/** "quinta, 5/11, 8h" (CA-2264): o dia da semana sem "-feira", o dia e o mês, a hora cheia de Brasília. */
export function quandoNoTexto(quando: Date): string {
  const { dia, hora } = agoraEmBrasilia(quando)
  const semana = SEMANA_CURTA.format(quando).replace('-feira', '')
  const [, mes = '', d = ''] = dia.split('-')
  const [h = '0', m = '00'] = hora.split(':')
  return `${semana}, ${Number(d)}/${mes}, ${Number(h)}h${m === '00' ? '' : m}`
}

/** "Próximo: Resumo da semana, quinta, 5/11, 8h" (CA-2264). */
export const linhaDoProximo = (proximo: ProximoAviso): string => `Próximo: ${NOME_DO_PROXIMO[proximo.tipo]}, ${quandoNoTexto(proximo.quando)}`

/** A prévia do próximo e-mail: o assunto, a frase e, no resumo, os 7 dias até agora (protótipo AvisosNutri). */
export interface PreviaDoProximo {
  readonly assunto: string
  readonly frase: string
  readonly dias: readonly { readonly dia: string; readonly feitas: number }[] | null
  readonly missoes: number
}

export function previaDoProximo(proximo: ProximoAviso, link: Pick<Acompanhamento, 'marcacoes' | 'missoes'>, primeiroNome: string, nutricionista: string): PreviaDoProximo {
  const com = (frase: string) => (primeiroNome ? `${primeiroNome}, ${frase}` : `${frase.charAt(0).toUpperCase()}${frase.slice(1)}`)
  const ela = nutricionista.trim() || 'sua nutricionista'
  if (proximo.tipo === 'A2') {
    const semana = semanaDoResumo(link.marcacoes, agoraEmBrasilia(proximo.quando).dia)
    const dias = semana.filter((d) => d.feitas > 0).length
    return {
      assunto: `Sua semana: ${dias} de 7 dias`,
      frase: dias > 0 ? com(`você marcou missão em ${dias} dos últimos 7 dias.`) : com('estes são os seus últimos 7 dias.'),
      dias: semana,
      missoes: link.missoes.length,
    }
  }
  if (proximo.tipo === 'A1') return { assunto: 'Seu plano foi atualizado', frase: com(`${ela} atualizou o seu plano.`), dias: null, missoes: link.missoes.length }
  if (proximo.tipo === 'A4') {
    return { assunto: 'Uma semana sem marcar as missões', frase: com('faz uma semana que você não marca as missões.'), dias: null, missoes: link.missoes.length }
  }
  return { assunto: 'Ainda dá tempo de marcar hoje', frase: com('faz 3 dias que você não marca as missões do plano.'), dias: null, missoes: link.missoes.length }
}

/** Por que não há próximo e-mail (protótipo AvisosNutri). */
export function semProximo(emails: EmailsDoLink | null, primeiroNome: string): string {
  const quem = primeiroNome || 'O paciente'
  if (emails === null || emails.email === null) return 'Nenhum: sem e-mail na ficha.'
  if (emails.supressao === 'devolvido') return 'Nenhum: o e-mail voltou.'
  if (emails.supressao === 'queixa' || emails.parouTudoEm !== null) return `Nenhum: ${quem} pediu para não receber.`
  if (!emails.aceites.some((a) => a.saiuEm === null)) return `Nenhum: ${quem} ainda não aceitou os avisos.`
  return 'Nenhum e-mail a caminho.'
}

/** CA-2264: o estado de cada envio, como a ficha escreve, e se ele leva destaque. */
export const ESTADO_NA_FICHA: Readonly<Record<EstadoDoEnvio, { readonly texto: string; readonly tom: TomDoEstado | null }>> = {
  enviado: { texto: 'Enviado', tom: null },
  entregue: { texto: 'Entregue', tom: null },
  devolvido: { texto: 'Devolvido', tom: 'erro' },
  'devolucao-temporaria': { texto: 'Não entregue: caixa cheia', tom: 'neutro' },
  queixa: { texto: 'Marcado como spam', tom: 'erro' },
  adiado: { texto: 'Adiado pelo teto', tom: 'neutro' },
  pausado: { texto: 'Não saiu: pausado', tom: 'neutro' },
  falhou: { texto: 'Não saiu', tom: 'erro' },
}

/** "Serviço" ou "Aviso" (CA-2264). */
export const tipoNaFicha = (tipo: EnvioDoLink['tipo']): string => (tipo.startsWith('A') ? 'Aviso' : 'Serviço')

/** "03/11 10:15": o dia e a hora de Brasília. */
export function diaEHora(iso: string): string {
  const { dia, hora } = agoraEmBrasilia(new Date(iso))
  const [, mes = '', d = ''] = dia.split('-')
  return `${d}/${mes} ${hora}`
}
