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
import { enderecoOficial } from './ui/enderecos.ts'
import { armazenamentoLocal } from './ui/estado/armazenamentoLocal.ts'
import { estaEmMoldura } from './ui/moldura.ts'
import { obterSupabase } from './ui/estado/supabase.ts'
import { tirarDestino } from './ui/fluxoConta.ts'
import { escreverRota } from './ui/navegacao.ts'
import { ProvedorTema } from './ui/tema/ProvedorTema.tsx'
import { destinoDaVolta, lerVolta } from './ui/voltaExterna.ts'

// Spec separacao-site-app, D-509 e CA-1417: aberto no endereço da Cloudflare (ou numa prévia), vai ao oficial, com a mesma
// consulta e o mesmo #, antes de tudo: lá o Turnstile e as funções não aceitam o endereço. A regra da Cloudflare faz o
// mesmo antes (passo 10 do dono); esta é a reserva.
const oficial = enderecoOficial(globalThis.location)

// D-172: o service worker do aplicativo; a versão nova avisa na área de trabalho em vez de recarregar sozinha.
if (oficial === null) registrarAplicativo(avisarVersaoNova)

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

if (oficial !== null) {
  globalThis.location.replace(oficial)
} else if (estaEmMoldura(globalThis)) {
  // D-99: aberto dentro de outro site, não monta o app: só o aviso com o link para abrir direto.
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
