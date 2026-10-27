import { Check, User, Users } from 'lucide-react'
import type { PointerEvent } from 'react'
import type { Ciclo } from '@/domain/conta.ts'
import { BOTAO } from './estiloDaLanding.ts'
import { PrecoDoPlano } from './PrecoDoPlano.tsx'
import { textoDaAcao, type CartaoDePlanoDaLanding } from './precosDaLanding.ts'

interface CartaoDePlanoProps {
  readonly cartao: CartaoDePlanoDaLanding
  readonly ciclo: Ciclo
  readonly indicado: boolean
  readonly aoEscolher: () => void
}

/** A ação dos cartões que não são o indicado (D-670): o afundado com a tinta do tema. */
const BOTAO_DISCRETO =
  'inline-flex min-h-11 items-center justify-center rounded-full border border-landing-borda bg-landing-afundado px-[22px] text-base leading-none font-bold whitespace-nowrap text-landing-tinta transition-[scale,background-color] duration-200 hover:bg-landing-borda active:scale-[.97]'

/** A troca dos preços (D-668): opacidade e desfoque em 0,35 s, deslize em 0,5 s; com menos movimento, só a opacidade. */
const TROCA =
  'col-start-1 row-start-1 [transition:opacity_.35s_ease,filter_.35s_ease,translate_.5s_cubic-bezier(.16,1,.3,1)] motion-reduce:translate-y-0 motion-reduce:blur-none'

/** O ícone do nome, do protótipo: ninguém no Free, uma pessoa no Solo, duas no Pro. */
const ICONE = { free: null, solo: User, pro: Users } as const

/** D-669: a luz segue o ponteiro (só com mouse, pelo CSS de `.landing-plano`). */
function seguirOPonteiro(evento: PointerEvent<HTMLElement>) {
  const cartao = evento.currentTarget
  const caixa = cartao.getBoundingClientRect()
  cartao.style.setProperty('--landing-px', `${evento.clientX - caixa.left}px`)
  cartao.style.setProperty('--landing-py', `${evento.clientY - caixa.top}px`)
}

/**
 * Um cartão de "Planos e preços" (spec landing-v3, D-667 a D-670): o nome, o selo "Indicado", a descrição, o preço do
 * ciclo, o botão e os limites. O indicado sobe, ganha o brilho e o feixe laranja que gira (só grafismo, atrás de nada
 * escrito). O preço do ciclo que não vale fica escondido do leitor de tela.
 */
export function CartaoDePlano({ cartao, ciclo, indicado, aoEscolher }: CartaoDePlanoProps) {
  const Icone = ICONE[cartao.id]
  const anual = ciclo === 'anual'
  const titulo = `plano-${cartao.id}`

  return (
    <article
      aria-labelledby={titulo}
      data-indicado={indicado ? '' : undefined}
      onPointerMove={seguirOPonteiro}
      className={`landing-plano relative isolate grid h-full grid-rows-[auto_auto_auto_auto_1fr] overflow-hidden rounded-[22px] border bg-linear-180 from-landing-cartao-alto to-landing-cartao p-8 transition-[translate,border-color] duration-[600ms,400ms] ease-[cubic-bezier(.16,1,.3,1)] ${
        indicado ? '-translate-y-2.5 border-transparent max-[1100px]:translate-y-0 motion-reduce:translate-y-0' : 'border-landing-borda'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-[-190px] left-1/2 -z-10 h-[360px] w-[140%] -translate-x-1/2 bg-[radial-gradient(closest-side,var(--landing-brilho),transparent)] transition-opacity duration-700 ${
          indicado ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <span aria-hidden="true" className={`landing-feixe transition-opacity duration-700 ${indicado ? 'opacity-100 motion-safe:animate-landing-girar' : 'opacity-0'}`} />
      <div className="flex items-center justify-between gap-3">
        <h3 id={titulo} className="flex items-center gap-2.5 text-lg font-extrabold">
          {Icone ? <Icone aria-hidden="true" size={18} strokeWidth={2} className="text-landing-tinta-suave" /> : null}
          {cartao.nome}
        </h3>
        <span
          aria-hidden={!indicado}
          className={`inline-flex h-[26px] items-center rounded-full bg-landing-destaque px-[11px] text-xs font-extrabold text-landing-chao transition-[opacity,scale] duration-300 ease-[cubic-bezier(.16,1,.3,1)] ${
            indicado ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
          }`}
        >
          Indicado
        </span>
      </div>
      <p className="mt-2 min-h-[3.1em] text-[15px] leading-normal text-landing-tinta-suave">{cartao.descricao}</p>
      <div className="mt-[26px] grid">
        {cartao.anual === null ? (
          <div className="col-start-1 row-start-1">
            <PrecoDoPlano preco={cartao.mensal} />
          </div>
        ) : (
          <>
            <div aria-hidden={anual} className={`${TROCA} ${anual ? 'pointer-events-none -translate-y-[36%] opacity-0 blur-[6px]' : ''}`}>
              <PrecoDoPlano preco={cartao.mensal} />
            </div>
            <div aria-hidden={!anual} className={`${TROCA} ${anual ? '' : 'pointer-events-none translate-y-[36%] opacity-0 blur-[6px]'}`}>
              <PrecoDoPlano preco={cartao.anual} />
            </div>
          </>
        )}
      </div>
      <button type="button" onClick={aoEscolher} className={`mt-[22px] w-full ${indicado ? BOTAO : BOTAO_DISCRETO}`}>
        {textoDaAcao(cartao, ciclo)}
      </button>
      <ul className="mt-[26px] grid list-none gap-3 self-start p-0 text-[15px]">
        {cartao.itens.map((item) => (
          <li key={item} className="flex items-start gap-2.5">
            <Check aria-hidden="true" size={16} strokeWidth={2.5} className="mt-0.5 flex-none text-landing-destaque" />
            {item}
          </li>
        ))}
      </ul>
    </article>
  )
}
