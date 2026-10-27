// Roda antes do primeiro desenho do site (script no <head>, arquivo próprio porque a CSP não aceita script escrito na
// página). Spec site-publico-profissional, D-332, e spec separacao-site-app, D-503 e D-510:
// 1. aplica o tema guardado pelo app (a chave é a CHAVE_TEMA de src/ui/tema/contextoTema.ts), ou o do sistema, para
//    a página não pintar clara antes de o pacote montar (CA-1017);
// 2. marca o <html> com o tema claro da landing, quando é o escolhido no botão dela (a chave é a CHAVE_TEMA_DA_LANDING
//    de src/ui/publico/inicio/temaDaLanding.ts), para a landing pré-desenhada nascer clara (spec landing-v3, D-613);
// 3. o link do paciente antigo (#/missoes/<token>) vai ao app na hora, antes de desenhar qualquer coisa (CA-1423), depois
//    de apagar a sessão guardada (DP-SA-58);
// 4. as rotas antigas de página (#/inicio, #/precos[/<plano>], #/termos, #/privacidade, #/fontes) vão à página própria,
//    com o plano em destaque (CA-1405);
// 5. tela do app, volta do e-mail ou do pagamento (?volta=) e o ícone instalado escondem a vitrine: quem decide entre ir
//    ao app e "Continuar" é o pacote do site (D-527), depois da limpeza do D-511.
// Não procura sessão: o site não usa nenhuma (D-501). O endereço do app vem do <html> (data-app, que o build põe).
// Nada é pré-carregado daqui (spec landing-escura, CA-1485).
;(function () {
  var raiz = document.documentElement
  var escolha = null
  var temaDaLanding = null
  try {
    escolha = localStorage.getItem('metanutri:tema')
    temaDaLanding = localStorage.getItem('metanutri:tema-da-landing')
  } catch (e) {
    // Armazenamento bloqueado: vale o tema do sistema e a landing fica escura.
  }
  var consulta = function (midia) {
    return typeof window.matchMedia === 'function' && window.matchMedia(midia).matches
  }
  if (escolha === 'escuro' || (escolha !== 'claro' && consulta('(prefers-color-scheme: dark)'))) {
    raiz.classList.add('dark')
    raiz.style.colorScheme = 'dark'
  }
  if (temaDaLanding === 'claro') raiz.setAttribute('data-tema-da-landing', 'claro')

  var app = raiz.getAttribute('data-app') || 'https://app.metanutri.com.br/'
  var rota = location.hash.indexOf('#/') === 0 ? location.hash.slice(2).split('/') : []
  var tela = rota[0] || ''

  if (tela === 'missoes' && rota[1]) {
    // DP-SA-58: a limpeza do D-511 vale em toda visita, e esta sai antes do pacote do site. Aqui, só a sessão guardada
    // (sb-<ref>-auth-token, -code-verifier e -user, como em src/site/limpeza.ts); o resto fica para a próxima visita.
    try {
      var sessoes = []
      for (var i = 0; i < localStorage.length; i += 1) {
        var chave = localStorage.key(i)
        if (chave !== null && /^sb-.+-auth-token(?:-code-verifier|-user)?$/.test(chave)) sessoes.push(chave)
      }
      for (var j = 0; j < sessoes.length; j += 1) localStorage.removeItem(sessoes[j])
    } catch (e) {
      // Armazenamento bloqueado: o link segue mesmo assim.
    }
    location.replace(app + location.hash)
    return
  }

  var paginas = { inicio: '', precos: 'precos/', termos: 'termos/', privacidade: 'privacidade/', fontes: 'fontes/' }
  if (Object.prototype.hasOwnProperty.call(paginas, tela)) {
    var pagina = new URL(paginas[tela], document.baseURI)
    if (tela === 'precos' && /^(free|estudante|solo|pro|clinica)$/.test(rota[1] || '')) pagina.search = '?destaque=' + rota[1]
    location.replace(pagina.href)
    return
  }

  var instalado = consulta('(display-mode: standalone)') || window.navigator.standalone === true
  if (tela !== '' || /[?&]volta=/.test(location.search) || instalado) raiz.classList.add('sem-vitrine')
})()
