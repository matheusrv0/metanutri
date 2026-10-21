import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
// Só o nome da marca usa esta (kit de 27/09/2026); embutida, como as outras, porque o app roda offline.
import '@fontsource-variable/bricolage-grotesque'
import './ui/tema/globals.css'
import { App } from './App.tsx'
import { LimiteDeErro } from './ui/aplicativo/LimiteDeErro.tsx'
import { registrarAplicativo } from './ui/aplicativo/registrarAplicativo.ts'
import { avisarVersaoNova } from './ui/aplicativo/versaoNova.ts'
import { AvisoMoldura } from './ui/AvisoMoldura.tsx'
import { armazenamentoLocal } from './ui/estado/armazenamentoLocal.ts'
import { estaEmMoldura } from './ui/moldura.ts'
import { obterSupabase, supabaseConfigurado } from './ui/estado/supabase.ts'
import { tirarDestino } from './ui/fluxoConta.ts'
import { escreverRota } from './ui/navegacao.ts'
import { ProvedorTema } from './ui/tema/ProvedorTema.tsx'
import { destinoDaVolta, lerVolta } from './ui/voltaExterna.ts'
import { enderecoDaVitrine, enderecoDoApp } from './seo/rotaDaPagina.ts'

// D-331 (spec site-publico-profissional): aberta pela página própria (/precos/, /termos/…), o app passa ao endereço da
// raiz com a rota da página, sem recarregar. Antes de tudo: o resto do app lê o endereço.
const enderecoDaPagina = enderecoDoApp(document.documentElement.dataset['rota'], globalThis.location.hash, globalThis.location.search, document.baseURI)
if (enderecoDaPagina) globalThis.history.replaceState(null, '', enderecoDaPagina)
// D-337: a raiz sem sessão vai para a landing já no endereço dela, sem passar pelo "Carregando…" do portão da conta.
const enderecoDaLanding = enderecoDaVitrine({
  hash: globalThis.location.hash,
  busca: globalThis.location.search,
  caminho: globalThis.location.pathname,
  comServidor: supabaseConfigurado(),
  vitrineEscondida: document.documentElement.classList.contains('sem-vitrine'),
})
if (enderecoDaLanding) globalThis.history.replaceState(null, '', enderecoDaLanding)

// D-172: o service worker do aplicativo; a versão nova avisa na área de trabalho em vez de recarregar sozinha.
// D-320 (spec site-publico-profissional): na vitrine, a moldura pública recarrega a página.
registrarAplicativo(avisarVersaoNova)

const raiz = document.getElementById('root')
if (!raiz) throw new Error('Elemento #root não encontrado em index.html')

/*
 * Volta do e-mail ou do pagamento (spec estilo-spora, R-10 e R-11). O Supabase lê o
 * login que veio no endereço quando o cliente nasce; só depois de `getSession` dá
 * para limpar o endereço e pôr a rota certa, sem perder a sessão.
 */
async function tratarVolta(): Promise<void> {
  const volta = lerVolta(globalThis.location.search, globalThis.location.hash)
  if (volta.tipo === null && !volta.linkVencido) return
  await obterSupabase()
    ?.auth.getSession()
    .catch(() => undefined)
  const guardado = volta.tipo === 'confirmacao' ? tirarDestino(armazenamentoLocal()) : null
  globalThis.history.replaceState(null, '', `${globalThis.location.pathname}${escreverRota(destinoDaVolta(volta, guardado))}`)
}

// D-99: aberto dentro de outro site, não monta o app: só o aviso com o link para abrir direto.
if (estaEmMoldura(globalThis)) {
  createRoot(raiz).render(
    <StrictMode>
      <ProvedorTema>
        <AvisoMoldura />
      </ProvedorTema>
    </StrictMode>,
  )
} else {
  void tratarVolta().finally(() => {
    createRoot(raiz).render(
      <StrictMode>
        <ProvedorTema>
          {/* Spec receitas-com-calculo, D-274b: tela que quebra ao desenhar mostra "Recarregar", não a página em branco. */}
          <LimiteDeErro>
            <App />
          </LimiteDeErro>
        </ProvedorTema>
      </StrictMode>,
    )
  })
}
