// A entrada do site público (spec separacao-site-app, D-502 e DP-SA-2): a página da rota que o build pré-desenhou
// (`data-rota` no <html>; sem ela, a landing), montada por cima do HTML pronto. Sem Supabase, Mercado Pago, Turnstile,
// motor da nuvem nem service worker: nada disso entra no pacote do site.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
// Só o nome da marca usa esta (kit de 27/09/2026); embutida, como as outras.
import '@fontsource-variable/bricolage-grotesque'
import '../ui/tema/globals.css'
import { PAGINAS, type RotaIndexavel } from '../seo/paginas.ts'
import { ProvedorTema } from '../ui/tema/ProvedorTema.tsx'
import { PaginaDoSite } from './PaginaDoSite.tsx'

const marcada = document.documentElement.dataset['rota']
const rota: RotaIndexavel = PAGINAS.find((pagina) => pagina.rota === marcada)?.rota ?? 'inicio'

const raiz = document.getElementById('root')
if (!raiz) throw new Error('Elemento #root não encontrado em index.html')

createRoot(raiz).render(
  <StrictMode>
    <ProvedorTema>
      <PaginaDoSite rota={rota} aoIrAoApp={(endereco) => globalThis.location.assign(endereco)} />
    </ProvedorTema>
  </StrictMode>,
)
