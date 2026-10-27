import type { PrecoNoCiclo } from './precosDaLanding.ts'

/** O preço de um ciclo num cartão de plano (spec landing-v3, D-668): o número grande, que o leitor de tela lê de um texto
 * escondido, o período e a linha de baixo. */
export function PrecoDoPlano({ preco }: { readonly preco: PrecoNoCiclo }) {
  return (
    <>
      <p className="flex items-start gap-1.5 leading-[.9] font-extrabold tracking-[-0.045em]">
        <span className="sr-only">{preco.falado}</span>
        <span aria-hidden="true" className="mt-3 text-[22px] tracking-normal text-landing-tinta-suave">
          R$
        </span>
        <span aria-hidden="true" className="text-[clamp(56px,5.2vw,76px)]">
          {preco.valor}
        </span>
      </p>
      <p className="mt-3 min-h-[3em] text-[15px] leading-normal font-bold">
        {preco.periodo}
        {preco.detalhe ? <span className="block font-medium text-landing-tinta-suave">{preco.detalhe}</span> : null}
      </p>
    </>
  )
}
