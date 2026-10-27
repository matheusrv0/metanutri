import { Logo } from '@ds/componentes/display/Logo.tsx'
import { irComAncora, navegarPeloApp, rolarAte, type DestinoPublico } from '../navegacaoPublica.ts'
import { BotaoDeTema } from './BotaoDeTema.tsx'
import { MARGEM } from './estiloDaLanding.ts'
import type { TemaDaLanding } from './temaDaLanding.ts'

interface BarraDaLandingProps {
  readonly temSessao: boolean
  readonly aoIrPara: (destino: DestinoPublico) => void
  readonly tema: TemaDaLanding
  readonly aoTrocarTema: () => void
}

/** As seções que a barra alcança (D-651); o `id` é o de cada seção na página. */
const SECOES: readonly { readonly texto: string; readonly id: string }[] = [
  { texto: 'Funcionalidades', id: 'funcionalidades' },
  { texto: 'Como funciona', id: 'como-funciona' },
  { texto: 'Planos', id: 'planos' },
]

const LINK = 'inline-flex min-h-11 items-center no-underline underline-offset-4 hover:underline'

/** A ação da barra: a do tema (marfim no escuro, teal no claro), um pouco menor que a do topo, com 44 px de alvo. */
const ACAO =
  'inline-flex min-h-11 items-center justify-center rounded-full bg-landing-acao px-[18px] text-sm leading-none font-bold whitespace-nowrap text-landing-acao-tinta no-underline transition-[scale,background-color] duration-200 hover:bg-landing-acao-hover active:scale-[.97] max-[420px]:px-3.5'

/**
 * A barra do topo da landing (spec landing-v3, D-651): de vidro, presa no alto o tempo todo, com a logo, as três seções,
 * o botão de tema, "Entrar" e "Criar conta grátis" (com sessão, "Ir para o painel"). O texto, a logo e a ação seguem o
 * tema da landing, não a seção embaixo.
 */
export function BarraDaLanding({ temSessao, aoIrPara, tema, aoTrocarTema }: BarraDaLandingProps) {
  return (
    <header
      className={`sticky top-0 z-50 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-landing-vidro py-3 text-landing-tinta shadow-[0_1px_0_var(--landing-borda)] backdrop-blur-[18px] backdrop-saturate-[1.6] max-[420px]:gap-x-2 ${MARGEM}`}
    >
      <a
        id="inicio-da-landing"
        href="#/inicio"
        aria-label="MetaNutri, início"
        className="inline-flex min-h-11 items-center rounded-full"
        onClick={(evento) => navegarPeloApp(evento, () => irComAncora(aoIrPara, 'inicio'))}
      >
        {/* As duas versões da logo, e o CSS mostra a do tema: a página pré-desenhada já nasce com a certa (D-613). Até
            373 px, só o símbolo (D-622); o nome da marca continua no rótulo do link. */}
        {(['escuro', 'claro'] as const).map((versao) => (
          <span key={versao} data-logo={versao} className={versao === 'escuro' ? 'contents landing-clara:hidden' : 'hidden landing-clara:contents'}>
            <span className="max-[373px]:hidden">
              <Logo variante={versao} tamanho={30} />
            </span>
            <span className="hidden max-[373px]:inline">
              <Logo variante={versao} tamanho={30} soSimbolo />
            </span>
          </span>
        ))}
      </a>
      {/* Com o texto grande do sistema, a barra quebra em linhas em vez de esconder "Entrar" e "Criar conta" (CB-608). */}
      <nav
        aria-label="Principal"
        className="flex flex-wrap items-center justify-end gap-x-[clamp(12px,1.8vw,24px)] gap-y-2 text-(length:--landing-fs-s) font-semibold max-[420px]:gap-x-2"
      >
        {SECOES.map((secao) => (
          <a
            key={secao.id}
            href="#/inicio"
            className={`${LINK} max-[720px]:hidden`}
            onClick={(evento) => navegarPeloApp(evento, () => rolarAte(secao.id))}
          >
            {secao.texto}
          </a>
        ))}
        <BotaoDeTema tema={tema} aoTrocar={aoTrocarTema} />
        {temSessao ? (
          <a href="#/painel" className={ACAO} onClick={(evento) => navegarPeloApp(evento, () => aoIrPara('painel'))}>
            Ir para o painel
          </a>
        ) : (
          <>
            <a href="#/entrar" className={LINK} onClick={(evento) => navegarPeloApp(evento, () => aoIrPara('entrar'))}>
              Entrar
            </a>
            <a href="#/criar-conta" className={ACAO} onClick={(evento) => navegarPeloApp(evento, () => aoIrPara('criar-conta'))}>
              <span>
                Criar conta <span className="max-[720px]:hidden">grátis</span>
              </span>
            </a>
          </>
        )}
      </nav>
    </header>
  )
}
