import { navegarPeloApp } from '../navegacaoPublica.ts'
import { MARGEM } from './estiloDaLanding.ts'

interface FaixaComecarProps {
  readonly aoComecar: () => void
}

/**
 * A faixa final (CA-1480): a página inteira vira um link para Criar conta. No hover e no foco, o fundo vai a branco e a
 * seta vira laranja e anda (D-532: o laranja nunca fica atrás de texto).
 */
export function FaixaComecar({ aoComecar }: FaixaComecarProps) {
  return (
    <a
      href="#/criar-conta"
      data-capitulo="marfim"
      onClick={(evento) => navegarPeloApp(evento, aoComecar)}
      className={`group relative block min-h-[max(46svh,min(34vw,600px))] overflow-hidden bg-landing-marfim pt-[30px] pb-[22px] text-landing-teal no-underline transition-colors duration-150 hover:bg-landing-branco focus-visible:bg-landing-branco focus-visible:outline-landing-teal focus-visible:-outline-offset-8 max-[720px]:min-h-[320px] ${MARGEM}`}
    >
      <p className="max-w-[26ch] text-(length:--landing-fs-lead) font-semibold max-[720px]:max-w-[70%] max-[720px]:text-base">
        Crie a conta e monte o primeiro plano hoje. Sem cartão.
      </p>
      <svg
        viewBox="0 0 48 48"
        aria-hidden="true"
        className="absolute top-[30px] right-(--landing-margem) size-11 transition-[translate,color] duration-200 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-landing-laranja group-focus-visible:text-landing-laranja max-[720px]:size-[30px]"
      >
        <path d="M14 34L34 14M18 14h16v16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {/* O cedilha não é cortado pela borda da faixa: a palavra sobe a profundidade dele (no protótipo, ele sumia). */}
      <span className="absolute bottom-[calc(22px+.22em)] left-(--landing-margem) text-[clamp(80px,22.5vw,380px)] leading-[.78] font-extrabold tracking-[-0.06em] max-[720px]:text-[20vw]">
        Começar
      </span>
    </a>
  )
}
