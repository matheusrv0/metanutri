// A anotação de exclusão pedida (spec exclusao-de-conta, CB-250; L6 da revisão de segurança). Antes de pedir a exclusão,
// o navegador anota de qual conta é. Se a resposta se perder e a sessão cair depois (a renovação falha porque o login
// não existe mais), a conta pode já ter sido apagada: quem vê a sessão cair (usarConta.ts) apaga a cópia de trabalho
// daquela conta. Uma resposta do servidor, sim ou não, tira a anotação; ela vence em 1 dia.
//
// Fica no aparelho, fora do espaço da conta: não é dado da conta, não entra em CHAVES_DE_DADOS, não vai para a nuvem
// nem para o backup.

const CHAVE = 'metanutri:exclusao-pedida'
export const EXCLUSAO_PEDIDA_VALE_MS = 24 * 60 * 60 * 1000

type ArmazenamentoDoAparelho = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function doAparelho(): ArmazenamentoDoAparelho | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    // navegador que bloqueia o armazenamento: sem anotação, e nada quebra
    return null
  }
}

export function anotarExclusaoPedida(usuarioId: string, base: ArmazenamentoDoAparelho | null = doAparelho(), agora: number = Date.now()): void {
  try {
    base?.setItem(CHAVE, JSON.stringify({ conta: usuarioId, em: agora }))
  } catch {
    // sem armazenamento: só a sessão que cair não apaga a cópia sozinha
  }
}

/** A exclusão desta conta foi pedida há menos de 1 dia e ainda não teve resposta. */
export function exclusaoPedidaPor(usuarioId: string, base: ArmazenamentoDoAparelho | null = doAparelho(), agora: number = Date.now()): boolean {
  try {
    const lido: unknown = JSON.parse(base?.getItem(CHAVE) ?? 'null')
    if (typeof lido !== 'object' || lido === null) return false
    const { conta, em } = lido as { readonly conta?: unknown; readonly em?: unknown }
    return conta === usuarioId && typeof em === 'number' && agora - em <= EXCLUSAO_PEDIDA_VALE_MS
  } catch {
    return false
  }
}

/** A conta da anotação, quando ela ainda vale; senão, nula. */
export function contaDaExclusaoPedida(base: ArmazenamentoDoAparelho | null = doAparelho(), agora: number = Date.now()): string | null {
  try {
    const lido: unknown = JSON.parse(base?.getItem(CHAVE) ?? 'null')
    const conta = typeof lido === 'object' && lido !== null ? (lido as { readonly conta?: unknown }).conta : null
    return typeof conta === 'string' && exclusaoPedidaPor(conta, base, agora) ? conta : null
  } catch {
    return null
  }
}

export function esquecerExclusaoPedida(base: ArmazenamentoDoAparelho | null = doAparelho()): void {
  try {
    base?.removeItem(CHAVE)
  } catch {
    // sem armazenamento: não havia anotação
  }
}
