// O aviso "Sua conta foi excluída." da página inicial (spec exclusao-de-conta, D-255). A saída recarrega a página
// (depoisDeSair, em App.tsx), então o aviso atravessa a recarga no armazenamento da aba: outra aba não o vê, e ele some
// quando a aba fecha. Não é dado da conta: não entra em CHAVES_DE_DADOS nem vai para a nuvem.
//
// A marca guarda a hora em que foi feita. A página inicial chega a aparecer antes de a recarga terminar, na mesma
// página em que a conta foi excluída; ali a marca é mais nova que a abertura da página e não vale (nem é gasta). Ela
// vale na página que abre depois, que é mais nova que a marca.

const CHAVE = 'metanutri:conta-excluida'

type ArmazenamentoDaAba = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function daAba(): ArmazenamentoDaAba | null {
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    // navegador que bloqueia o armazenamento: sem aviso, e nada quebra
    return null
  }
}

/** A hora em que esta página abriu, em ms desde 1970 (a mesma escala do Date.now). */
const aberturaDestaPagina = (): number => globalThis.performance?.timeOrigin ?? 0

export function marcarContaExcluida(base: ArmazenamentoDaAba | null = daAba(), agora: number = Date.now()): void {
  try {
    base?.setItem(CHAVE, String(agora))
  } catch {
    // sem armazenamento: a página inicial abre sem o aviso
  }
}

/** A conta foi excluída antes de esta página abrir (`abertura`). */
export function contaFoiExcluida(base: ArmazenamentoDaAba | null = daAba(), abertura: number = aberturaDestaPagina()): boolean {
  try {
    const marca = Number(base?.getItem(CHAVE) ?? Number.NaN)
    return Number.isFinite(marca) && marca < abertura
  } catch {
    return false
  }
}

export function esquecerContaExcluida(base: ArmazenamentoDaAba | null = daAba()): void {
  try {
    base?.removeItem(CHAVE)
  } catch {
    // sem armazenamento: não havia aviso para esquecer
  }
}
