// Roda antes do primeiro desenho (script no <head>, arquivo próprio porque a CSP não aceita script escrito na página).
// Spec site-publico-profissional, D-332:
// 1. aplica o tema guardado pelo app (a chave é a CHAVE_TEMA de src/ui/tema/contextoTema.ts), ou o do sistema, para
//    a página não pintar clara antes de o app montar (CA-1017);
// 2. esconde o conteúdo pré-desenhado quando o endereço pede outra tela (link do paciente, área de trabalho, volta do
//    e-mail, com ?volta=) ou quando há sessão aberta e o endereço é a raiz, que leva ao painel (CA-1016, CA-1024).
;(function () {
  var raiz = document.documentElement
  var escolha = null
  var temSessao = false
  try {
    escolha = localStorage.getItem('metanutri:tema')
    for (var i = 0; i < localStorage.length; i++) {
      if (/^sb-.+-auth-token$/.test(localStorage.key(i) || '')) temSessao = true
    }
  } catch (e) {
    // Armazenamento bloqueado: vale o tema do sistema e a vitrine aparece.
  }
  var sistemaEscuro = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
  if (escolha === 'escuro' || (escolha !== 'claro' && sistemaEscuro)) {
    raiz.classList.add('dark')
    raiz.style.colorScheme = 'dark'
  }

  var pagina = raiz.getAttribute('data-rota') || 'inicio'
  var pedida = location.hash.replace(/^#\/?/, '').split('/')[0]
  var outraTela = pedida !== '' ? pedida !== pagina : pagina === 'inicio' && temSessao
  // A volta do e-mail (CA-1024): /?volta=confirmacao&code=… ou /?volta=recuperacao&code=…, que o app troca pela tela certa.
  if (/[?&]volta=/.test(location.search)) outraTela = true
  // A página inicial entregue pelo service worker em /precos, sem a barra (CA-1025): o app abre Preços, não a landing.
  var noCaminho = location.pathname.match(/\/(precos|termos|privacidade|fontes)\/?$/)
  if (noCaminho && noCaminho[1] !== pagina) outraTela = true
  if (outraTela) raiz.classList.add('sem-vitrine')
})()
