// O que o build desenha no servidor (spec site-publico-profissional, D-331): cada página indexável, sem sessão. Só o
// plugin do build (pluginSeo.ts) carrega este arquivo; ele não entra em pacote nenhum. Spec separacao-site-app,
// DP-SA-30: a página é a mesma que o pacote do site monta por cima (src/site/PaginaDoSite.tsx).
import { renderToString } from 'react-dom/server'
import { PaginaDoSite } from '@/site/PaginaDoSite.tsx'
import { cabecalhoDaPagina } from './cabecalho.ts'
import type { PaginaDesenhada } from './montarPagina.ts'
import { PAGINAS } from './paginas.ts'

const nada = () => undefined

export function desenharPaginas(): readonly PaginaDesenhada[] {
  return PAGINAS.map((pagina) => ({
    rota: pagina.rota,
    caminho: pagina.caminho,
    cabecalho: cabecalhoDaPagina(pagina),
    corpo: renderToString(<PaginaDoSite rota={pagina.rota} aoIrAoApp={nada} abrirPagina={nada} />),
  }))
}
