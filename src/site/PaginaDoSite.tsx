import type { ReactElement } from 'react'
import type { Ciclo, IdPlano } from '@/domain/conta.ts'
import { CONTATO_EMAIL } from '@/domain/legal.ts'
import { paginaDaRota, type RotaIndexavel } from '@/seo/paginas.ts'
import { telaNoApp } from '@/ui/enderecos.ts'
import { destinoDoPlano } from '@/ui/fluxoConta.ts'
import { escreverRota, rotaCriarConta } from '@/ui/navegacao.ts'
import { MolduraPublica, type DestinoPublico } from '@/ui/publico/MolduraPublica.tsx'
import { SecaoPrecos } from '@/ui/publico/SecaoPrecos.tsx'
import { TelaFontes } from '@/ui/publico/TelaFontes.tsx'
import { TelaInicio } from '@/ui/publico/TelaInicio.tsx'
import { TelaPrivacidade } from '@/ui/publico/TelaPrivacidade.tsx'
import { TelaTermos } from '@/ui/publico/TelaTermos.tsx'

interface PaginaDoSiteProps {
  readonly rota: RotaIndexavel
  /**
   * Vai a uma tela do app (D-501): "Entrar", "Começar grátis" e os planos. Quem monta a página decide: o site vai ao app
   * ou, com dado que só existe neste endereço, mostra "Continuar" (D-527).
   */
  readonly aoIrAoApp: (endereco: string) => void
  /** Abre outra página do site (D-503: cada uma no próprio endereço). Os testes passam um dublê. */
  readonly abrirPagina?: (endereco: string) => void
}

const abrirNoNavegador = (endereco: string) => globalThis.location.assign(endereco)

/**
 * Uma página do site público (spec separacao-site-app, D-502 e DP-SA-30): a moldura pública com a tela da rota. É o que o
 * build pré-desenha (src/seo/vitrine.tsx) e o que o pacote do site monta por cima (src/site/main.tsx).
 */
export function PaginaDoSite({ rota, aoIrAoApp, abrirPagina = abrirNoNavegador }: PaginaDoSiteProps) {
  const irAoApp = (destino: Parameters<typeof escreverRota>[0]) => aoIrAoApp(telaNoApp(escreverRota(destino)))

  const irPara = (destino: DestinoPublico) => {
    if (destino === 'entrar') return aoIrAoApp(telaNoApp())
    if (destino === 'criar-conta') return irAoApp(rotaCriarConta(null, 'mensal'))
    if (destino === 'painel') return irAoApp({ tela: 'painel' })
    // A página em que a pessoa já está só volta ao alto (quem chama rola); as outras abrem no endereço delas.
    if (destino === rota) return undefined
    abrirPagina(new URL(paginaDaRota(destino).caminho, globalThis.document.baseURI).href)
  }

  // Quem chega pelo site não tem sessão aqui: o plano leva a Criar conta, e o app decide se a pessoa já tem conta (D-504).
  const escolher = (plano: IdPlano, ciclo: Ciclo) => {
    const destino = destinoDoPlano(plano, ciclo, false)
    if (destino) irAoApp(destino)
  }

  const telas: Readonly<Record<RotaIndexavel, () => ReactElement>> = {
    inicio: () => <TelaInicio aoComecar={() => irPara('criar-conta')} aoEscolher={escolher} />,
    precos: () => <SecaoPrecos contato={CONTATO_EMAIL} aoEscolher={escolher} />,
    termos: () => <TelaTermos />,
    privacidade: () => <TelaPrivacidade />,
    fontes: () => <TelaFontes />,
  }

  return (
    <MolduraPublica atual={rota} temSessao={false} aoIrPara={irPara}>
      {telas[rota]()}
    </MolduraPublica>
  )
}
