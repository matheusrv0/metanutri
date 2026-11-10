// A assinatura dos eventos do Resend (spec lado-do-paciente, DP-LP-18, CA-2277): o Resend assina pelo Svix. O conteúdo
// assinado é `id.momento.corpo`; a assinatura é HMAC-SHA256 com o segredo `whsec_…` (base64 depois do prefixo), em base64,
// no cabeçalho `svix-signature` como `v1,<assinatura>` (pode vir mais de uma, separadas por espaço). Sem pacote: WebCrypto,
// que o Deno e o Node têm. Puro: o relógio chega de fora.

/** O evento mais velho (ou mais adiantado) que se aceita: 5 minutos. */
export const TOLERANCIA_DO_EVENTO_S = 5 * 60

export interface EventoAssinado {
  /** `RESEND_WEBHOOK_SECRET`. */
  readonly segredo: string | null
  /** `svix-id`. */
  readonly id: string | null
  /** `svix-timestamp`, em segundos. */
  readonly momento: string | null
  /** `svix-signature`. */
  readonly assinaturas: string | null
  /** O corpo do pedido, como chegou (sem reformatar). */
  readonly corpo: string
  readonly agora: Date
}

function base64ParaBytes(texto: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binario = atob(texto)
    const bytes = new Uint8Array(binario.length)
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

const bytesParaBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes))

/** Compara sem parar no primeiro caractere diferente. */
function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diferenca = 0
  for (let i = 0; i < a.length; i++) diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diferenca === 0
}

/** CA-2277: verdadeiro só com o segredo configurado, o evento dentro do prazo e uma assinatura `v1` que confere. */
export async function assinaturaConfere(e: EventoAssinado): Promise<boolean> {
  if (!e.segredo || !e.id || !e.momento || !e.assinaturas) return false
  if (!/^\d{1,12}$/.test(e.momento)) return false
  const segundos = Number(e.momento)
  if (Math.abs(e.agora.getTime() / 1000 - segundos) > TOLERANCIA_DO_EVENTO_S) return false
  const chave = base64ParaBytes(e.segredo.startsWith('whsec_') ? e.segredo.slice('whsec_'.length) : e.segredo)
  if (chave === null || chave.length === 0) return false
  const assinador = await globalThis.crypto.subtle.importKey('raw', chave, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const assinado = await globalThis.crypto.subtle.sign('HMAC', assinador, new TextEncoder().encode(`${e.id}.${e.momento}.${e.corpo}`))
  const esperada = bytesParaBase64(new Uint8Array(assinado))
  return e.assinaturas
    .split(' ')
    .map((parte) => parte.trim())
    .filter((parte) => parte.startsWith('v1,'))
    .some((parte) => iguais(parte.slice(3), esperada))
}
