// "Recarregar" da tela de erro (spec receitas-com-calculo, D-274b): antes de recarregar, pede ao service worker a versão
// nova do app. Sem isso, o primeiro F5 pode servir de novo a versão antiga guardada pelo navegador (R-270).

/** O que a recarga usa do navegador; os testes passam um de mentira. */
export interface AmbienteDeRecarga {
  readonly serviceWorker: { getRegistration(): Promise<{ update(): Promise<unknown> } | undefined> } | undefined
  readonly recarregar: () => void
  /** Quanto esperar o navegador responder antes de recarregar assim mesmo. */
  readonly prazoMs?: number
}

const PRAZO_PADRAO_MS = 5000

/** Espera a promessa até o prazo; passou do prazo, segue sem ela. */
function comPrazo<T>(promessa: Promise<T>, prazoMs: number): Promise<T | undefined> {
  return Promise.race([promessa, new Promise<undefined>((seguir) => setTimeout(() => seguir(undefined), prazoMs))])
}

function ambienteDoNavegador(): AmbienteDeRecarga {
  return {
    serviceWorker: globalThis.navigator?.serviceWorker,
    recarregar: () => globalThis.location.reload(),
  }
}

/**
 * Pede a versão nova (`registration.update()`) e recarrega a página. Sem internet, sem service worker ou com o navegador
 * calado, recarrega assim mesmo. Não apaga nada: o que não tinha subido para a nuvem continua contado no aparelho.
 */
export async function recarregarComVersaoNova(ambiente: AmbienteDeRecarga = ambienteDoNavegador()): Promise<void> {
  const prazo = ambiente.prazoMs ?? PRAZO_PADRAO_MS
  try {
    const registro = ambiente.serviceWorker ? await comPrazo(ambiente.serviceWorker.getRegistration(), prazo) : undefined
    if (registro) await comPrazo(registro.update(), prazo)
  } catch {
    // Sem internet para buscar a versão nova: recarrega com a que houver.
  }
  ambiente.recarregar()
}
