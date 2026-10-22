// O que o build desenha no servidor (spec site-publico-profissional, D-331): cada página indexável dentro da moldura
// pública, sem sessão. Só o plugin do build (pluginSeo.ts) carrega este arquivo; ele não entra no pacote do site.
import type { ReactElement } from 'react'
import { renderToString } from 'react-dom/server'
import { CONTATO_EMAIL } from '@/domain/legal.ts'
import { MolduraPublica } from '@/ui/publico/MolduraPublica.tsx'
import { SecaoPrecos } from '@/ui/publico/SecaoPrecos.tsx'
import { TelaFontes } from '@/ui/publico/TelaFontes.tsx'
import { TelaInicio } from '@/ui/publico/TelaInicio.tsx'
import { TelaPrivacidade } from '@/ui/publico/TelaPrivacidade.tsx'
import { TelaTermos } from '@/ui/publico/TelaTermos.tsx'
import { cabecalhoDaPagina } from './cabecalho.ts'
import type { PaginaDesenhada } from './montarPagina.ts'
import { PAGINAS, type RotaIndexavel } from './paginas.ts'

const nada = () => undefined

const TELAS: Readonly<Record<RotaIndexavel, () => ReactElement>> = {
  inicio: () => <TelaInicio aoComecar={nada} aoVerPrecos={nada} />,
  precos: () => <SecaoPrecos contato={CONTATO_EMAIL} aoEscolher={nada} />,
  termos: () => <TelaTermos />,
  privacidade: () => <TelaPrivacidade />,
  fontes: () => <TelaFontes />,
}

export function desenharPaginas(): readonly PaginaDesenhada[] {
  return PAGINAS.map((pagina) => ({
    rota: pagina.rota,
    caminho: pagina.caminho,
    cabecalho: cabecalhoDaPagina(pagina),
    corpo: renderToString(
      <MolduraPublica atual={pagina.rota} temSessao={false} aoIrPara={nada} recarregar={nada}>
        {TELAS[pagina.rota]()}
      </MolduraPublica>,
    ),
  }))
}
