// A verificação contra robôs em "Recuperar meu link" (spec lado-do-paciente, D-1220, DP-LP-19): o token que o navegador
// manda é conferido no `siteverify` da Cloudflare, com o segredo `TURNSTILE_SECRET_KEY`. Só vale com a ação
// `recuperar-link` e o endereço do app na resposta (D-1251): um token de outro formulário ou de outro site não passa.
// Sem o segredo, sem o token ou sem resposta, não confere: a função responde a frase de sempre e não manda nada.
import { buscarComPrazo, jsonOuNulo, objeto, type Buscar } from './http.ts'

export const VERIFICACAO_DO_TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
export const ACAO_DA_RECUPERACAO = 'recuperar-link'
const PRAZO_MS = 5_000

export interface PedidoDeVerificacao {
  readonly buscar: Buscar
  readonly segredo: string | null
  readonly token: string | null
  /** O endereço de internet de quem pede, quando a função sabe. */
  readonly ip: string | null
  /** O host do app (o de `ENDERECO_DO_APP`, app.metanutri.com.br): o `hostname` da resposta tem que ser ele (D-1251). */
  readonly host: string
}

export async function turnstileConfere(p: PedidoDeVerificacao): Promise<boolean> {
  if (!p.segredo || !p.token || p.token.length > 2048) return false
  const corpo = new URLSearchParams({ secret: p.segredo, response: p.token, ...(p.ip ? { remoteip: p.ip } : {}) })
  try {
    const resposta = await buscarComPrazo(
      p.buscar,
      VERIFICACAO_DO_TURNSTILE,
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corpo.toString() },
      PRAZO_MS,
    )
    if (resposta.status !== 200) return false
    const dados = objeto(await jsonOuNulo(resposta))
    return dados['success'] === true && dados['action'] === ACAO_DA_RECUPERACAO && typeof dados['hostname'] === 'string' && dados['hostname'] === p.host
  } catch {
    return false
  }
}
