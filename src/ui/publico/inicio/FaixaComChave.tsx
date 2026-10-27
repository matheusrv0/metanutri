import { MARGEM } from './estiloDaLanding.ts'

/** A cor que a faixa ganha quando a chave liga. A "marfim" é o bloco do tema: marfim no escuro, teal claro no claro. */
export type CorDaFaixa = 'teal' | 'cartao' | 'teal-medio' | 'marfim'

const LIGADA: Readonly<Record<CorDaFaixa, string>> = {
  teal: 'bg-landing-teal text-landing-marfim',
  cartao: 'bg-landing-cartao text-landing-tinta',
  'teal-medio': 'bg-landing-teal-medio text-landing-marfim',
  marfim: 'bg-landing-bloco text-landing-bloco-tinta',
}

interface FaixaComChaveProps {
  readonly frase: string
  readonly efeito: string
  readonly cor: CorDaFaixa
  readonly ligada: boolean
  readonly aoVirar: () => void
}

/**
 * Uma faixa de "O plano sai do seu jeito" (D-539): a frase, a chave e, ligada, a cor e o efeito. A chave é um `switch`
 * de verdade (Enter e Espaço pelo botão); a área de toque passa da bolinha para 44 px (D-551). O efeito que aparece é
 * anunciado ao leitor de tela.
 */
export function FaixaComChave({ frase, efeito, cor, ligada, aoVirar }: FaixaComChaveProps) {
  return (
    <div
      className={`grid min-h-[18vh] grid-cols-[minmax(0,1fr)_auto] items-center gap-6 py-[26px] transition-colors duration-[350ms] max-[720px]:min-h-[124px] ${MARGEM} ${
        ligada ? LIGADA[cor] : 'bg-landing-chao text-landing-apagado'
      }`}
    >
      <div data-surge="">
        <p className="text-(length:--landing-fs-frase) leading-[1.1] font-bold tracking-[-0.025em] max-[720px]:text-[5.8vw]">{frase}</p>
        <div aria-live="polite">
          {ligada ? <p className="mt-2 text-(length:--landing-fs-corpo) font-medium max-[720px]:text-[15px]">{efeito}</p> : null}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={ligada}
        aria-label={frase}
        onClick={aoVirar}
        className="relative h-[1.25em] w-[2.3em] rounded-full bg-landing-contorno p-0 text-[clamp(20px,2.2vw,30px)] transition-colors duration-200 before:absolute before:-inset-[10px] before:content-[''] after:absolute after:top-[.15em] after:left-[.15em] after:size-[.95em] after:rounded-full after:bg-landing-branco after:transition-transform after:duration-200 after:content-[''] focus-visible:outline-current aria-checked:bg-landing-laranja aria-checked:after:translate-x-[1.05em] max-[720px]:text-[20px]"
      />
    </div>
  )
}
