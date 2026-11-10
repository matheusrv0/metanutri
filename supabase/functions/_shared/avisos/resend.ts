// O envio pelo Resend (spec lado-do-paciente, D-1236, DP-LP-13 e DP-LP-14): a API HTTP, sem pacote, em lotes de até 100
// e-mails por pedido, no máximo 5 pedidos por segundo (o limite do Resend é 10). Só a API de envio: nunca Contatos,
// Segmentos ou Broadcasts, onde o e-mail do paciente não pode entrar (D-1242, CA-2283).
//
// Puro: o `fetch`, a chave e a espera chegam de fora. Uma resposta 429, um erro do Resend ou a rede caída param o lote
// ali: o que saiu fica como saiu, e o resto volta como "não enviado", para quem chamou adiar (CA-2275) sem repetir nada.
import { buscarComPrazo, jsonOuNulo, objeto, type Buscar } from './http.ts'
import type { TipoDeEmail } from './tipos.ts'

export const API_DO_RESEND = 'https://api.resend.com'
/** CA-2275: até 100 e-mails por pedido em lote. */
export const LOTE_MAXIMO = 100
/** 5 pedidos por segundo. */
export const ESPERA_ENTRE_PEDIDOS_MS = 200
/** Um pedido ao Resend que passa disto conta como fora do ar (CB-1216). */
export const PRAZO_DO_RESEND_MS = 15_000

export interface EmailParaEnviar {
  /** "Ana Lima via MetaNutri" ou "MetaNutri" (D-1225). */
  readonly nomeDoRemetente: string
  readonly para: string
  /** O e-mail do Perfil da nutricionista, ou o da conta (D-1225, CA-2259); nulo sem resposta. */
  readonly responderPara: string | null
  readonly assunto: string
  readonly html: string
  readonly texto: string
  /** Os cabeçalhos do descadastro de um clique (D-1235), nos avisos, no S2 e no N1. */
  readonly cabecalhos?: Readonly<Record<string, string>>
  readonly tipo: TipoDeEmail
}

export type ResultadoDoEnvio =
  | { readonly ok: true; readonly id: string }
  /** `limite`: o Resend respondeu 429; `fora`: erro dele ou da rede (CB-1216); `recusado`: ele recusou o lote (4xx). */
  | { readonly ok: false; readonly motivo: 'limite' | 'fora' | 'recusado' }

export interface DependenciasDoResend {
  readonly buscar: Buscar
  /** `RESEND_API_KEY`: só de envio, presa ao subdomínio dos avisos (CA-2282). Nula: nada sai. */
  readonly chave: string | null
  /** `REMETENTE_DOS_AVISOS`: avisos@avisos.metanutri.com.br (D-1238, CA-2279). */
  readonly endereco: string
  readonly esperar: (ms: number) => Promise<void>
}

/** O nome do remetente vai entre aspas, sem quebra de linha nem aspas soltas (o cabeçalho não pode ser injetado). */
export function remetente(nome: string, endereco: string): string {
  const limpo = nome.replace(/[\r\n"\\<>]/g, ' ').replace(/\s+/g, ' ').trim() || 'MetaNutri'
  return `"${limpo}" <${endereco}>`
}

function corpoDoEmail(email: EmailParaEnviar, endereco: string): Record<string, unknown> {
  return {
    from: remetente(email.nomeDoRemetente, endereco),
    to: [email.para],
    ...(email.responderPara ? { reply_to: email.responderPara } : {}),
    subject: email.assunto,
    html: email.html,
    text: email.texto,
    ...(email.cabecalhos ? { headers: { ...email.cabecalhos } } : {}),
    // Só o tipo, para o painel do Resend separar os e-mails; nenhum dado da pessoa.
    tags: [{ name: 'tipo', value: email.tipo }],
  }
}

/**
 * CA-2275 e CA-2276: manda em lotes de 100, com a chave de idempotência de cada lote (`<idempotencia>-<n>`), e devolve o
 * resultado de cada e-mail, na mesma ordem. Depois de um 429 ou de uma falha, nenhum outro lote sai.
 */
export async function enviarEmLote(emails: readonly EmailParaEnviar[], idempotencia: string, deps: DependenciasDoResend): Promise<readonly ResultadoDoEnvio[]> {
  if (deps.chave === null || deps.chave === '') return emails.map(() => ({ ok: false, motivo: 'fora' }))
  const resultados: ResultadoDoEnvio[] = []
  let parado: 'limite' | 'fora' | null = null
  for (let inicio = 0, n = 0; inicio < emails.length; inicio += LOTE_MAXIMO, n++) {
    const lote = emails.slice(inicio, inicio + LOTE_MAXIMO)
    if (parado !== null) {
      for (let i = 0; i < lote.length; i++) resultados.push({ ok: false, motivo: parado })
      continue
    }
    if (n > 0) await deps.esperar(ESPERA_ENTRE_PEDIDOS_MS)
    let status: number
    let dados: unknown
    try {
      const resposta = await buscarComPrazo(
        deps.buscar,
        `${API_DO_RESEND}/emails/batch`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${deps.chave}`, 'Content-Type': 'application/json', 'Idempotency-Key': `${idempotencia}-${n}` },
          body: JSON.stringify(lote.map((e) => corpoDoEmail(e, deps.endereco))),
        },
        PRAZO_DO_RESEND_MS,
      )
      status = resposta.status
      dados = await jsonOuNulo(resposta)
    } catch {
      parado = 'fora'
      for (let i = 0; i < lote.length; i++) resultados.push({ ok: false, motivo: 'fora' })
      continue
    }
    if (status === 429 || status >= 500) {
      parado = status === 429 ? 'limite' : 'fora'
      for (let i = 0; i < lote.length; i++) resultados.push({ ok: false, motivo: parado })
      continue
    }
    if (status < 200 || status >= 300) {
      for (let i = 0; i < lote.length; i++) resultados.push({ ok: false, motivo: 'recusado' })
      continue
    }
    const lista = objeto(dados)['data']
    const ids = Array.isArray(lista) ? lista.map((item) => objeto(item)['id']) : []
    lote.forEach((_, i) => {
      const id = ids[i]
      resultados.push(typeof id === 'string' && id !== '' ? { ok: true, id } : { ok: false, motivo: 'fora' })
    })
  }
  return resultados
}
