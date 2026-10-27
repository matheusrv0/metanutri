// A entrada do site público (spec separacao-site-app, D-502 e DP-SA-2). Sem Supabase, Mercado Pago, Turnstile, motor da
// nuvem nem service worker: nada disso entra no pacote do site. A ordem (T23): a limpeza do endereço antigo (D-511);
// depois o repasse ao app ou "Continuar" (D-510 e D-527); por fim, a página da rota que o build pré-desenhou
// (`data-rota` no <html>; sem ela, a landing), montada por cima do HTML pronto.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
// Só o nome da marca usa esta (kit de 27/09/2026); embutida, como as outras.
import '@fontsource-variable/bricolage-grotesque'
import '../ui/tema/globals.css'
import { ehIdPlano } from '../domain/conta.ts'
import { PAGINAS, type RotaIndexavel } from '../seo/paginas.ts'
import { armazenamentoLocal } from '../ui/estado/armazenamentoLocal.ts'
import { ProvedorTema } from '../ui/tema/ProvedorTema.tsx'
import { ehLinkDoPaciente, enderecoNoApp, limparEnderecoAntigo } from './limpeza.ts'
import { criarRemetente } from './remetente.ts'
import { Site } from './Site.tsx'

const base = armazenamentoLocal()
const dadoSoAqui = limparEnderecoAntigo(base)
// D-524: o ícone instalado do endereço antigo abre o site como aplicativo.
const navegador = globalThis.navigator as Navigator & { readonly standalone?: boolean }
const instalado = globalThis.matchMedia?.('(display-mode: standalone)').matches === true || navegador.standalone === true
const paraOApp = enderecoNoApp(globalThis.location, instalado)

if (paraOApp !== null && (!dadoSoAqui || ehLinkDoPaciente(globalThis.location.hash))) {
  // CA-1424 a CA-1426: sem dado só aqui, direto ao app, na mesma aba.
  globalThis.location.replace(paraOApp)
} else {
  const marcada = document.documentElement.dataset['rota']
  const rota: RotaIndexavel = PAGINAS.find((pagina) => pagina.rota === marcada)?.rota ?? 'inicio'
  // DP-SA-37: o plano em destaque em Preços vem da consulta (`/precos/?destaque=pro`).
  const pedido = new URLSearchParams(globalThis.location.search).get('destaque')
  const destaque = ehIdPlano(pedido) ? pedido : null

  const raiz = document.getElementById('root')
  if (!raiz) throw new Error('Elemento #root não encontrado em index.html')
  createRoot(raiz).render(
    <StrictMode>
      <ProvedorTema>
        <Site rota={rota} destaque={destaque} remetente={dadoSoAqui ? criarRemetente({ base, instalado }) : null} comecarEmContinuar={paraOApp !== null} />
      </ProvedorTema>
    </StrictMode>,
  )
}
