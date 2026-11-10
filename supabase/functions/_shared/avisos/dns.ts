// O domínio do e-mail recebe e-mail? (spec lado-do-paciente, D-1221, D-1239, DP-LP-17). Pergunta ao DNS sobre HTTPS da
// Cloudflare, sem pacote: com registro MX (que não seja o "MX nulo" da RFC 7505), recebe; sem MX, o registro A (ou AAAA)
// também recebe; domínio que não existe, não recebe. Consulta que falha ou demora não recusa: nulo, "não deu para saber".
import { buscarComPrazo, jsonOuNulo, objeto, type Buscar } from './http.ts'

export const DNS_SOBRE_HTTPS = 'https://cloudflare-dns.com/dns-query'
export const PRAZO_DO_DNS_MS = 3_000

const TIPO_A = 1
const TIPO_MX = 15
const TIPO_AAAA = 28
/** NXDOMAIN: o domínio não existe. */
const NAO_EXISTE = 3

interface Resposta {
  readonly estado: number
  readonly registros: readonly { readonly tipo: number; readonly dado: string }[]
}

async function consultar(dominio: string, tipo: 'MX' | 'A', buscar: Buscar, prazoMs: number): Promise<Resposta | null> {
  try {
    const resposta = await buscarComPrazo(
      buscar,
      `${DNS_SOBRE_HTTPS}?name=${encodeURIComponent(dominio)}&type=${tipo}`,
      { method: 'GET', headers: { accept: 'application/dns-json' } },
      prazoMs,
    )
    if (resposta.status !== 200) return null
    const dados = objeto(await jsonOuNulo(resposta))
    const estado = dados['Status']
    if (typeof estado !== 'number') return null
    const lista = Array.isArray(dados['Answer']) ? dados['Answer'] : []
    const registros = lista.map(objeto).map((r) => ({ tipo: typeof r['type'] === 'number' ? r['type'] : 0, dado: typeof r['data'] === 'string' ? r['data'] : '' }))
    return { estado, registros }
  } catch {
    return null
  }
}

/** O "MX nulo" (RFC 7505): prioridade 0 e destino ".", o domínio que diz que não recebe e-mail. */
const ehMxNulo = (dado: string): boolean => /^0\s+\.?$/.test(dado.trim())

/** Verdadeiro: recebe e-mail; falso: não recebe (D-1221: "Confira o e-mail."); nulo: não deu para saber. */
export async function temServidorDeEmail(dominio: string, buscar: Buscar, prazoMs = PRAZO_DO_DNS_MS): Promise<boolean | null> {
  const mx = await consultar(dominio, 'MX', buscar, prazoMs)
  if (mx === null) return null
  if (mx.estado === NAO_EXISTE) return false
  if (mx.estado !== 0) return null
  const destinos = mx.registros.filter((r) => r.tipo === TIPO_MX)
  if (destinos.length > 0) return !destinos.every((r) => ehMxNulo(r.dado))
  const a = await consultar(dominio, 'A', buscar, prazoMs)
  if (a === null || a.estado !== 0) return a?.estado === NAO_EXISTE ? false : null
  return a.registros.some((r) => r.tipo === TIPO_A || r.tipo === TIPO_AAAA)
}
