import { arcosDoAnel, CENTRO_DO_ANEL, centroDoAnel, RAIO_DO_ANEL } from './anel.ts'
import { META_DA_ADEQUACAO, type NutrienteDoExemplo, type SugestaoDoExemplo } from './exemploDaLanding.ts'

interface AnelDaAdequacaoProps {
  readonly nutriente: NutrienteDoExemplo
  readonly sugestao: SugestaoDoExemplo
}

/** O deslize dos arcos (D-679): 0,9 s, saída forte; com menos movimento, troca na hora. */
const DESLIZE = 'transition-[stroke-dasharray,transform] duration-900 ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:transition-none'

/**
 * O anel da Adequação (spec landing-v3, D-656 e D-658): o trilho, a base do plano em destaque, a soma da sugestão (marfim
 * no escuro, teal claro no claro) começando onde a base termina, e a bolinha laranja na meta, só grafismo. No centro, o
 * que ainda falta com a sugestão, ou "Meta atingida".
 */
export function AnelDaAdequacao({ nutriente, sugestao }: AnelDaAdequacaoProps) {
  const arcos = arcosDoAnel({ base: nutriente.pct, meta: META_DA_ADEQUACAO, cobre: sugestao.cobre })
  const centro = centroDoAnel(nutriente, sugestao)
  const circulo = { cx: CENTRO_DO_ANEL, cy: CENTRO_DO_ANEL, r: RAIO_DO_ANEL, pathLength: 100, fill: 'none', strokeWidth: 16 } as const

  return (
    <div className="relative size-[260px] max-[720px]:size-[220px]">
      <svg viewBox="0 0 260 260" aria-hidden="true" className="size-full -rotate-90 overflow-visible">
        <circle {...circulo} className="stroke-landing-trilho" />
        <circle {...circulo} strokeLinecap="round" strokeDasharray={`${arcos.base} 100`} className={`stroke-landing-destaque ${DESLIZE}`} />
        <circle
          {...circulo}
          strokeLinecap="round"
          strokeDasharray={`${arcos.soma} 100`}
          style={{ transform: `rotate(${arcos.giroDaSoma}deg)`, transformOrigin: `${CENTRO_DO_ANEL}px ${CENTRO_DO_ANEL}px` }}
          className={`stroke-landing-anel-soma ${DESLIZE}`}
        />
        <circle cx={arcos.bolinha.x} cy={arcos.bolinha.y} r={9} strokeWidth={4} className="fill-landing-laranja stroke-landing-cartao" />
      </svg>
      <div className="absolute inset-0 grid place-content-center gap-0.5 text-center">
        <small className="text-[13px] font-semibold text-landing-tinta-suave">{centro.rotulo}</small>
        <strong className="text-[40px] leading-[1.05] font-extrabold tracking-[-0.04em] max-[720px]:text-[34px]">{centro.valor}</strong>
        <span className="text-sm font-semibold text-landing-tinta-suave">{centro.nota}</span>
      </div>
    </div>
  )
}
