/** DP-28: quanto uma aba espera a trava antes de seguir sem ela. */
export const PRAZO_DA_TRAVA_MS = 20_000

/** O pedaço do `navigator.locks` que a trava usa. */
export interface Travas {
  request<T>(nome: string, opcoes: { signal?: AbortSignal }, fazer: () => Promise<T>): Promise<T>
}

type Trancar = <T>(fazer: (comTrava: boolean) => Promise<T>) => Promise<T>

/**
 * Spec dados-na-nuvem, DP-27 e DP-28: com `navigator.locks`, uma aba da conta vai à nuvem por vez. Uma aba
 * congelada não prende as outras: sem a trava em 20 s, a ida segue sem ela, e o motor confere a versão
 * antes de mandar (`comTrava` falso). Sem `navigator.locks`, cada aba segue na própria fila.
 */
export function travaEntreAbas(travas: Travas | undefined, usuarioId: string): { readonly trancar?: Trancar } {
  if (travas === undefined) return {}
  const trancar: Trancar = async <T,>(fazer: (comTrava: boolean) => Promise<T>): Promise<T> => {
    const desistir = new AbortController()
    const relogio = setTimeout(() => desistir.abort(), PRAZO_DA_TRAVA_MS)
    let entrou = false
    try {
      return await travas.request(`metanutri:nuvem:${usuarioId}`, { signal: desistir.signal }, () => {
        entrou = true
        clearTimeout(relogio)
        return fazer(true)
      })
    } catch (erro) {
      // A trava não veio a tempo (ou o navegador recusou): segue sem ela. Erro de dentro da ida sobe.
      if (entrou) throw erro
      return fazer(false)
    } finally {
      clearTimeout(relogio)
    }
  }
  return { trancar }
}
