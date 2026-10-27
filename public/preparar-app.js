// Roda antes do primeiro desenho do app (script no <head>, arquivo próprio porque a CSP não aceita script escrito na
// página). Spec separacao-site-app, DP-SA-2: só o tema guardado pelo app (a chave é a CHAVE_TEMA de
// src/ui/tema/contextoTema.ts), ou o do sistema, para a página não pintar clara antes de o app montar. A vitrine e os
// repasses são do site (preparar-pagina.js).
;(function () {
  var raiz = document.documentElement
  var escolha = null
  try {
    escolha = localStorage.getItem('metanutri:tema')
  } catch (e) {
    // Armazenamento bloqueado: vale o tema do sistema.
  }
  var sistemaEscuro = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
  if (escolha === 'escuro' || (escolha !== 'claro' && sistemaEscuro)) {
    raiz.classList.add('dark')
    raiz.style.colorScheme = 'dark'
  }
})()
