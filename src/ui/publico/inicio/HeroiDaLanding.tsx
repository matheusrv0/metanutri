import { useState } from 'react'
import { rolarAte } from '../navegacaoPublica.ts'
import { PORCAO_DO_TOPO } from './exemploDaLanding.ts'
import { BOTAO_FIXO, LEAD, MARGEM } from './estiloDaLanding.ts'

interface HeroiDaLandingProps {
  readonly aoComecar: () => void
}

/**
 * D-549: o título sobe ao abrir só quando a landing chega pelo app. Aberta pela página pré-desenhada (D-331), o React
 * troca o desenho do build pelo dele; animar ali faria o título pular duas vezes. O estado é lido no primeiro desenho,
 * antes de o React limpar o `#root`; no build (sem `document`), não anima.
 */
const veioPeloApp = () => typeof document !== 'undefined' && document.querySelector('[data-vitrine]') === null

/**
 * O topo (D-535; spec landing-v3, D-601): só palavra, cor e espaço, em gramas. A bolinha laranja é o ponto do título; o
 * ponto continua para o leitor de tela.
 */
export function HeroiDaLanding({ aoComecar }: HeroiDaLandingProps) {
  const [animar] = useState(veioPeloApp)
  const sobe = animar ? 'motion-safe:animate-landing-sobe' : ''

  return (
    <section
      aria-labelledby="titulo-inicio"
      data-capitulo="teal"
      className={`grid min-h-[calc(640px-var(--landing-barra))] grid-rows-[1fr_auto] bg-landing-teal pb-9 text-landing-marfim max-[1100px]:min-h-0 max-[1100px]:gap-y-16 max-[1100px]:pb-[52px] ${MARGEM}`}
    >
      <h1
        id="titulo-inicio"
        className="pt-[calc(150px-var(--landing-barra))] text-(length:--landing-fs-display) leading-[.92] font-extrabold tracking-[-0.045em] max-[720px]:text-[clamp(28px,8.6vw,60px)]"
      >
        <span className={`block text-landing-teal-claro ${sobe}`}>Falta cálcio?</span>{' '}
        <span className={`block text-landing-marfim ${sobe} motion-safe:[animation-delay:.12s]`}>
          {PORCAO_DO_TOPO}
          <span aria-hidden="true" className="ml-[.04em] inline-block size-[.2em] rounded-full bg-landing-laranja" />
          <span className="sr-only">.</span>
        </span>
      </h1>
      <div
        className={`flex flex-wrap items-end justify-between gap-7 max-[720px]:flex-col max-[720px]:items-start ${sobe} motion-safe:[animation-delay:.3s]`}
      >
        <div className="flex flex-wrap items-center gap-x-[22px] gap-y-3">
          <button type="button" className={BOTAO_FIXO} onClick={aoComecar}>
            Criar conta grátis
          </button>
          <a
            href="#/inicio"
            className="inline-flex min-h-11 items-center font-semibold underline underline-offset-[5px]"
            onClick={(evento) => {
              evento.preventDefault()
              rolarAte('plano-de-exemplo')
            }}
          >
            Ver no plano de exemplo
          </a>
        </div>
        <p className={`max-w-[34ch] ${LEAD} max-[720px]:text-[17px]`}>
          Para nutricionistas: o MetaNutri calcula quanto falta de cada vitamina e mineral no plano alimentar e mostra o que comer para completar, em
          gramas.
        </p>
      </div>
    </section>
  )
}
