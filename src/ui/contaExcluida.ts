// O aviso "Sua conta foi excluída." da página inicial (spec exclusao-de-conta, D-255). A saída recarrega a página
// (depoisDeSair, em App.tsx), então o aviso atravessa a recarga no armazenamento da aba: outra aba não o vê, e ele some
// quando a aba fecha. Não é dado da conta: não entra em CHAVES_DE_DADOS nem vai para a nuvem.

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

export function marcarContaExcluida(base: ArmazenamentoDaAba | null = daAba()): void {
  try {
    base?.setItem(CHAVE, '1')
  } catch {
    // sem armazenamento: a página inicial abre sem o aviso
  }
}

export function contaFoiExcluida(base: ArmazenamentoDaAba | null = daAba()): boolean {
  try {
    return base?.getItem(CHAVE) === '1'
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
