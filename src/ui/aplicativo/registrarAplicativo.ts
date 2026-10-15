// O service worker do aplicativo (PWA), pelo módulo do plugin, dentro do pacote: nenhum script escrito na página
// (spec dados-na-nuvem, D-172, CA-603). O plugin deixa de injetar o registerSW.js quando o app usa este módulo.
import { registerSW } from 'virtual:pwa-register'

/**
 * Liga o service worker. Com `registerType: 'autoUpdate'`, a versão nova assume sozinha; em vez de recarregar a página
 * (o que perderia o que a pessoa está digitando), o plugin chama `onNeedReload`, e o app mostra o aviso (CA-602). O
 * registro espera a página carregar, como o script de antes.
 */
export function registrarAplicativo(aoTerVersaoNova: () => void): void {
  registerSW({ onNeedReload: aoTerVersaoNova })
}
