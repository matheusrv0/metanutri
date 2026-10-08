import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
// Só o nome da marca usa esta (kit de 27/09/2026); embutida, como as outras, porque o app roda offline.
import '@fontsource-variable/bricolage-grotesque'
import './ui/tema/globals.css'
import { App } from './App.tsx'
import { AvisoMoldura } from './ui/AvisoMoldura.tsx'
import { armazenamentoLocal } from './ui/estado/armazenamentoLocal.ts'
import { estaEmMoldura } from './ui/moldura.ts'
import { obterSupabase } from './ui/estado/supabase.ts'
import { tirarDestino } from './ui/fluxoConta.ts'
import { escreverRota } from './ui/navegacao.ts'
import { ProvedorTema } from './ui/tema/ProvedorTema.tsx'
import { destinoDaVolta, lerVolta } from './ui/voltaExterna.ts'

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
          <App />
        </ProvedorTema>
      </StrictMode>,
    )
  })
}
