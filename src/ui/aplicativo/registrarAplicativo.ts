// O service worker do aplicativo (PWA), pelo módulo do plugin, dentro do pacote: nenhum script escrito na página
// (spec dados-na-nuvem, D-172, CA-603). O plugin deixa de injetar o registerSW.js quando o app usa este módulo.
import { registerSW } from 'virtual:pwa-register'

/** Spec receitas-com-calculo, D-274c: de quanto em quanto tempo uma aba aberta confere se há versão nova. */
export const CONFERIR_VERSAO_A_CADA_MS = 60 * 60 * 1000

/**
 * D-274c e CA-888b: a versão nova é conferida também quando a aba volta para a frente e a cada 60 minutos, não só ao
 * navegar; uma aba aberta desde ontem passa a ver o aviso. Sem internet, a conferência falha em silêncio.
 */
function conferirVersaoNova(registro: ServiceWorkerRegistration): void {
  const conferir = () => {
    registro.update().catch(() => undefined)
  }
  setInterval(conferir, CONFERIR_VERSAO_A_CADA_MS)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') conferir()
  })
}

/**
 * Liga o service worker. Com `registerType: 'autoUpdate'`, a versão nova assume sozinha; em vez de recarregar a página
 * (o que perderia o que a pessoa está digitando), o plugin chama `onNeedReload`, e o app mostra o aviso (CA-602). O
 * registro espera a página carregar, como o script de antes.
 */
export function registrarAplicativo(aoTerVersaoNova: () => void): void {
  registerSW({
    onNeedReload: aoTerVersaoNova,
    onRegisteredSW: (_endereco, registro) => {
      if (registro) conferirVersaoNova(registro)
    },
  })
}
