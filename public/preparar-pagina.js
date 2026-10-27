// Roda antes do primeiro desenho (script no <head>, arquivo próprio porque a CSP não aceita script escrito na página).
// Spec site-publico-profissional, D-332:
// 1. aplica o tema guardado pelo app (a chave é a CHAVE_TEMA de src/ui/tema/contextoTema.ts), ou o do sistema, para
//    a página não pintar clara antes de o app montar (CA-1017);
// 2. esconde o conteúdo pré-desenhado quando o endereço pede outra tela (link do paciente, área de trabalho, volta do
//    e-mail, com ?volta=) ou quando há sessão aberta e o endereço é a raiz, que leva ao painel (CA-1016, CA-1024);
// 3. marca o <html> com o tema claro da landing, quando é o escolhido no botão dela (a chave é a CHAVE_TEMA_DA_LANDING
//    de src/ui/publico/inicio/temaDaLanding.ts), para a landing pré-desenhada nascer clara (spec landing-v3, D-613).
// Nada é pré-carregado daqui (spec landing-escura, CA-1485): a foto do topo da v9 já está no HTML pré-desenhado, com
// prioridade alta, e o navegador a acha na primeira leitura (spec landing-v3, D-654).
;(function () {
  var raiz = document.documentElement
  var escolha = null
  var temaDaLanding = null
  var temSessao = false
  try {
    escolha = localStorage.getItem('metanutri:tema')
    temaDaLanding = localStorage.getItem('metanutri:tema-da-landing')
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
  if (temaDaLanding === 'claro') raiz.setAttribute('data-tema-da-landing', 'claro')

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
