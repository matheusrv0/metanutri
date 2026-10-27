import { telaNoApp } from '../../enderecos.ts'
import { navegarPeloApp } from '../navegacaoPublica.ts'
import { MARGEM } from './estiloDaLanding.ts'

interface FaixaComecarProps {
  readonly aoComecar: () => void
}

/**
 * A faixa final (CA-1480): a página inteira vira um link para Criar conta, no app (spec separacao-site-app, D-501). Marfim no escuro e teal no claro (spec
 * landing-v3, D-610). No hover e no foco, o fundo clareia (branco no escuro, teal médio no claro) e a seta vira laranja e
 * anda (D-532: o laranja nunca fica atrás de texto).
 *
 * Spec landing-v3, D-673: a altura acompanha a palavra. A faixa mede 176 px mais 1,02 vez a letra de "Começar" (até 720
 * px, o maior entre 320 px e 150 px mais 1,05 vez a letra), e a palavra fica a 22 px mais 0,22 da letra da borda de
 * baixo: a frase nunca fica embaixo dela, e o cedilha cabe inteiro na faixa.
 */
export function FaixaComecar({ aoComecar }: FaixaComecarProps) {
  return (
    <a
      href={telaNoApp('#/criar-conta')}
      data-faixa-final=""
      onClick={(evento) => navegarPeloApp(evento, aoComecar)}
      className={`group relative block min-h-[calc(176px+clamp(80px,22.5vw,380px)*1.02)] overflow-hidden bg-landing-chamar pt-[30px] pb-[22px] text-landing-chamar-tinta no-underline transition-colors duration-150 hover:bg-landing-chamar-hover focus-visible:bg-landing-chamar-hover focus-visible:outline-landing-chamar-tinta focus-visible:-outline-offset-8 max-[720px]:min-h-[max(320px,calc(150px+20vw*1.05))] ${MARGEM}`}
    >
      <p className="max-w-[30ch] text-(length:--landing-fs-lead) font-semibold max-[720px]:max-w-[70%] max-[720px]:text-base">
        Crie sua conta e monte o primeiro plano hoje, sem cartão de crédito.
      </p>
      <svg
        viewBox="0 0 48 48"
        aria-hidden="true"
        className="absolute top-[30px] right-(--landing-margem) size-11 transition-[translate,color] duration-200 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-landing-laranja group-focus-visible:text-landing-laranja max-[720px]:size-[30px]"
      >
        <path d="M14 34L34 14M18 14h16v16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span
        data-palavra=""
        className="absolute bottom-[calc(22px+.22em)] left-(--landing-margem) text-[clamp(80px,22.5vw,380px)] leading-[.78] font-extrabold tracking-[-0.06em] max-[720px]:text-[20vw]"
      >
        Começar
      </span>
    </a>
  )
}
