/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/vanillajs" />

interface ImportMetaEnv {
  /** O endereço do app (spec separacao-site-app, DP-SA-3). Sem ela, o de produção; só os testes de navegador mudam. */
  readonly VITE_ENDERECO_DO_APP?: string
  /** O endereço do site público, com a mesma regra. */
  readonly VITE_ENDERECO_DO_SITE?: string
}
