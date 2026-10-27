import { useState } from 'react'
import { PLANOS } from '@/domain/conta.ts'
import { rolarAte } from '../navegacaoPublica.ts'
import { atrasoDoTopo } from './atrasoDoTopo.ts'
import { NUTRIENTES_DO_EXEMPLO, VITAMINAS_E_MINERAIS } from './exemploDaLanding.ts'
import { MARGEM } from './estiloDaLanding.ts'

interface HeroiDaLandingProps {
  readonly aoComecar: () => void
}

const BASE = import.meta.env.BASE_URL

/** O atraso da etiqueta no movimento dela (0,9 s, D-655). */
const ATRASO_DA_ETIQUETA_MS = 900

/** A ação principal do topo: a do tema, maior que a da barra (52 px). */
const ACAO_DO_TOPO =
  'inline-flex min-h-[52px] items-center justify-center rounded-full bg-landing-acao px-7 text-[17px] leading-none font-bold whitespace-nowrap text-landing-acao-tinta transition-[scale,background-color] duration-200 hover:bg-landing-acao-hover active:scale-[.97]'

/** A foto do topo é a primeira coisa da tela (D-654). Em minúscula: o React 18 não conhece `fetchPriority`. */
const PRIORIDADE_ALTA: Readonly<Record<string, string>> = { fetchpriority: 'high' }

const minuscula = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1)

/** D-653: a etiqueta sai da sugestão escolhida do cálcio (o iogurte), com o nome da paciente. */
function textoDaEtiqueta(): { readonly falta: string; readonly porcao: string; readonly cobre: string } | null {
  const calcio = NUTRIENTES_DO_EXEMPLO.find((n) => n.chave === 'calcio')
  const sugestao = calcio?.sugestoes[calcio.escolhida]
  if (!calcio || !sugestao) return null
  return {
    falta: `No plano de exemplo, falta ${minuscula(calcio.nome)}`,
    porcao: `${sugestao.gramas} de ${minuscula(sugestao.nome)} cobrem `,
    cobre: `${sugestao.cobre}%`,
  }
}

/**
 * O topo em foto (spec landing-v3, D-652 a D-655): a foto de ponta a ponta com o véu do tema, o título, o texto de apoio,
 * as duas ações e a linha do Free; a etiqueta de vidro com o exemplo do cálcio, escondida no celular. A foto assenta e a
 * etiqueta surge só com movimento; sobre a página pré-desenhada, o movimento continua de onde estava (CA-1657).
 */
export function HeroiDaLanding({ aoComecar }: HeroiDaLandingProps) {
  const [jaAnimado] = useState(atrasoDoTopo)
  const etiqueta = textoDaEtiqueta()
  const free = PLANOS.find((p) => p.id === 'free')

  return (
    <section
      aria-labelledby="titulo-inicio"
      className={`landing-veu relative isolate flex min-h-[720px] items-center overflow-hidden bg-landing-chao-fundo pt-24 pb-[120px] text-landing-topo-tinta max-[720px]:min-h-[640px] max-[720px]:items-end max-[720px]:pb-[72px] ${MARGEM}`}
    >
      <img
        src={`${BASE}imagens/iogurte-com-frutas.webp`}
        srcSet={`${BASE}imagens/iogurte-com-frutas-800.webp 800w, ${BASE}imagens/iogurte-com-frutas.webp 1600w`}
        sizes="(max-width: 720px) 900px, 100vw"
        width={1600}
        height={1172}
        {...PRIORIDADE_ALTA}
        decoding="async"
        alt="Copo de iogurte com frutas vermelhas, granola e amêndoas sobre a mesa."
        style={jaAnimado > 0 ? { animationDelay: `${-jaAnimado}ms` } : undefined}
        className="absolute inset-0 -z-20 size-full object-cover object-[78%_50%] motion-safe:animate-landing-assentar max-[720px]:object-[70%_40%]"
      />
      <div className="max-w-[780px]">
        <h1 id="titulo-inicio" className="max-w-[16ch] text-(length:--landing-fs-topo) leading-[1.02] font-extrabold tracking-[-0.045em] text-inherit">
          Planos alimentares completos em vitaminas e minerais
        </h1>
        <p className="mt-7 max-w-[46ch] text-(length:--landing-fs-lead) leading-normal text-landing-topo-suave max-[720px]:text-[17px]">
          {`O MetaNutri calcula a adequação de ${VITAMINAS_E_MINERAIS} vitaminas e minerais e sugere os alimentos, em gramas, para completar o que falta. Depois, acompanha a adesão do paciente pelo celular.`}
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-x-[22px] gap-y-3">
          {/* D-688: o botão fixo do celular só aparece depois que este sai da tela (`data-acao-do-topo`). */}
          <button type="button" data-acao-do-topo="" className={ACAO_DO_TOPO} onClick={aoComecar}>
            Criar conta grátis
          </button>
          <a
            href="#/inicio"
            className="inline-flex min-h-11 items-center font-semibold underline underline-offset-[5px]"
            onClick={(evento) => {
              evento.preventDefault()
              rolarAte('adequacao')
            }}
          >
            Ver o plano de exemplo
          </a>
        </div>
        {free ? (
          <p className="mt-3.5 text-(length:--landing-fs-s) text-landing-topo-suave">{`Grátis com ${free.limitePacientesAtivos ?? ''} pacientes ativos. Sem cartão de crédito.`}</p>
        ) : null}
      </div>
      {etiqueta ? (
        <div
          aria-hidden="true"
          data-etiqueta=""
          style={jaAnimado > 0 ? { animationDelay: `${ATRASO_DA_ETIQUETA_MS - jaAnimado}ms` } : undefined}
          className="absolute right-[clamp(24px,9vw,160px)] bottom-[150px] grid max-w-[280px] gap-1 rounded-[18px] bg-landing-vidro-cartao px-[18px] py-4 shadow-(--landing-etiqueta-sombra) backdrop-blur-[16px] backdrop-saturate-[1.5] motion-safe:animate-landing-surgir max-[1024px]:hidden"
        >
          <span className="text-[13px] font-semibold text-landing-topo-suave">{etiqueta.falta}</span>
          <strong className="text-[17px] font-extrabold tracking-[-0.01em]">
            {etiqueta.porcao}
            <b className="text-landing-etiqueta-numero">{etiqueta.cobre}</b>
          </strong>
        </div>
      ) : null}
    </section>
  )
}
