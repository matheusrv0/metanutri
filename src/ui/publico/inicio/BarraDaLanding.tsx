import { Logo } from '@ds/componentes/display/Logo.tsx'
import { useEffect, useRef, useState } from 'react'
import { irComAncora, navegarPeloApp, rolarAte, type DestinoPublico } from '../navegacaoPublica.ts'
import { barraSome, tintaDaBarra, type Capitulo, type FaixaDoCapitulo, type TintaDaBarra } from './barraDoTopo.ts'
import { BotaoDeTema } from './BotaoDeTema.tsx'
import { MARGEM } from './estiloDaLanding.ts'
import type { TemaDaLanding } from './temaDaLanding.ts'

interface BarraDaLandingProps {
  readonly temSessao: boolean
  readonly aoIrPara: (destino: DestinoPublico) => void
  readonly tema: TemaDaLanding
  readonly aoTrocarTema: () => void
}

type CorDaBarra = Exclude<TintaDaBarra, 'escondida'>

const FUNDO: Readonly<Record<CorDaBarra, string>> = {
  teal: 'bg-landing-teal',
  chao: 'bg-landing-chao',
  afundado: 'bg-landing-afundado',
}

const CAPITULOS: readonly Capitulo[] = ['teal', 'chao', 'afundado', 'marfim', 'fim']
const ehCapitulo = (valor: string | undefined): valor is Capitulo => CAPITULOS.includes(valor as Capitulo)

/** As seções da página, onde estão agora. */
function faixasDaPagina(): FaixaDoCapitulo[] {
  return [...globalThis.document.querySelectorAll<HTMLElement>('[data-capitulo]')].flatMap((el) => {
    const capitulo = el.dataset['capitulo']
    if (!ehCapitulo(capitulo)) return []
    const caixa = el.getBoundingClientRect()
    return [{ capitulo, topo: caixa.top, base: caixa.bottom }]
  })
}

const LINK = 'inline-flex min-h-11 items-center no-underline underline-offset-4 hover:underline'

/** O botão da barra, um pouco menor que o do topo da página, com os mesmos 44 px de alvo. */
const PILULA =
  'inline-flex min-h-11 items-center justify-center rounded-full px-[18px] text-sm leading-none font-bold whitespace-nowrap no-underline transition-[scale,background-color] duration-200 active:scale-[.97]'

/** Sobre o teal, o marfim nos dois temas; sobre o chão, a ação do tema (spec landing-v3, D-612). */
const ACAO_SOBRE_TEAL = `${PILULA} bg-landing-marfim text-landing-teal hover:bg-landing-branco`
const ACAO_SOBRE_O_CHAO = `${PILULA} bg-landing-acao text-landing-acao-tinta hover:bg-landing-acao-hover`

/**
 * A barra do topo da landing (D-545): a logo, "Como funciona", "Preços", o botão de tema, "Entrar" e "Criar conta
 * grátis" (com sessão, "Ir para o painel"). Presa no alto, pinta a cor da seção embaixo dela, sai ao descer a página e
 * volta ao subir ou ao receber foco; no rodapé, sai (CA-1457 a CA-1460). Nos dois temas, o texto, a logo e os botões
 * acompanham a seção: sobre o teal, marfim; sobre o chão, a tinta do tema (spec landing-v3, D-612).
 */
export function BarraDaLanding({ temSessao, aoIrPara, tema, aoTrocarTema }: BarraDaLandingProps) {
  const barra = useRef<HTMLElement>(null)
  const [cor, setCor] = useState<CorDaBarra>('teal')
  const [some, setSome] = useState(false)
  const [noRodape, setNoRodape] = useState(false)

  useEffect(() => {
    let anterior = globalThis.scrollY
    const medir = () => {
      const meio = (barra.current?.offsetHeight ?? 0) / 2
      const tinta = tintaDaBarra(faixasDaPagina(), meio)
      setNoRodape(tinta === 'escondida')
      if (tinta !== 'escondida') setCor(tinta)
      const y = globalThis.scrollY
      setSome(barraSome(y, anterior))
      anterior = y
    }
    medir()
    globalThis.addEventListener('scroll', medir, { passive: true })
    return () => globalThis.removeEventListener('scroll', medir)
  }, [])

  const sobreTeal = cor === 'teal'
  const ACAO = sobreTeal ? ACAO_SOBRE_TEAL : ACAO_SOBRE_O_CHAO

  return (
    <header
      ref={barra}
      data-tinta={noRodape ? 'escondida' : cor}
      className={`sticky top-0 z-50 flex items-center justify-between gap-4 py-3 transition-[background-color,translate] duration-300 focus-within:translate-y-0 ${MARGEM} ${FUNDO[cor]} ${
        sobreTeal ? 'text-landing-marfim' : 'text-landing-tinta'
      } ${
        some || noRodape ? '-translate-y-full' : ''
      }`}
    >
      <a
        id="inicio-da-landing"
        href="#/inicio"
        aria-label="MetaNutri, início"
        className="inline-flex min-h-11 items-center rounded-full"
        onClick={(evento) => navegarPeloApp(evento, () => irComAncora(aoIrPara, 'inicio'))}
      >
        <Logo variante={sobreTeal || tema === 'escuro' ? 'escuro' : 'claro'} tamanho={30} />
      </a>
      <nav aria-label="Principal" className="flex items-center gap-[clamp(14px,2vw,26px)] text-(length:--landing-fs-s) font-semibold">
        <a href="#/inicio" className={`${LINK} max-[720px]:hidden`} onClick={(evento) => navegarPeloApp(evento, () => rolarAte('como-funciona'))}>
          Como funciona
        </a>
        <a href="#/inicio" className={`${LINK} max-[720px]:hidden`} onClick={(evento) => navegarPeloApp(evento, () => rolarAte('quanto-custa'))}>
          Preços
        </a>
        <BotaoDeTema tema={tema} aoTrocar={aoTrocarTema} sobreTeal={sobreTeal} />
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
