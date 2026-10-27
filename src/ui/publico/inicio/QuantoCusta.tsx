import type { Ciclo, IdPlano } from '@/domain/conta.ts'
import { BOTAO, ESPACO_DE_SECAO, MARGEM, TITULO_L } from './estiloDaLanding.ts'
import { precosDaLanding } from './precosDaLanding.ts'

const BASE = import.meta.env.BASE_URL

interface QuantoCustaProps {
  readonly aoEscolher: (plano: IdPlano, ciclo: Ciclo) => void
}

/** "Quanto custa" (D-544): o plano em destaque em número grande e uma linha para cada um dos outros, tudo de `PLANOS`. */
export function QuantoCusta({ aoEscolher }: QuantoCustaProps) {
  const { destaque, outros } = precosDaLanding()

  return (
    <section
      id="quanto-custa"
      aria-labelledby="titulo-quanto-custa"
      data-capitulo="chao"
      className={`grid grid-cols-[minmax(0,4fr)_minmax(0,7fr)] items-start gap-x-[6vw] gap-y-11 bg-landing-chao max-[720px]:grid-cols-1 ${ESPACO_DE_SECAO} ${MARGEM}`}
    >
      <div data-surge="">
        <h2 id="titulo-quanto-custa" className={TITULO_L}>
          Quanto custa
        </h2>
        <p className="mt-3.5 max-w-[34ch] text-landing-tinta-suave">
          Todas as assinaturas têm as mesmas funções. O que muda é quantos pacientes ativos você acompanha.
        </p>
      </div>
      <div data-surge="" className="relative">
        <p className="flex items-start text-(length:--landing-fs-display) leading-[.85] font-extrabold tracking-[-0.05em] text-landing-marfim max-[720px]:flex-wrap max-[720px]:text-[19vw]">
          <span className="sr-only">{destaque.falado}</span>
          <span aria-hidden="true" className="mt-[.12em] mr-[.18em] text-[.38em] tracking-[-0.02em]">
            R$
          </span>
          <span aria-hidden="true">{destaque.valor}</span>
          <span
            aria-hidden="true"
            className="mb-[.4em] ml-[.4em] self-end text-[17px] font-semibold tracking-normal text-landing-tinta-suave max-[720px]:m-0 max-[720px]:mt-2.5 max-[720px]:basis-full max-[720px]:whitespace-nowrap"
          >
            por mês
          </span>
        </p>
        <img
          src={`${BASE}marca/simbolo-fundo-escuro.svg`}
          alt=""
          width={120}
          height={120}
          className="absolute top-[-10%] left-[min(42vw,500px)] w-[clamp(64px,8vw,124px)] max-[720px]:top-[-22%] max-[720px]:right-0 max-[720px]:left-auto max-[720px]:w-[18vw]"
        />
        <ul className="mt-9 grid list-none gap-1.5 p-0 text-(length:--landing-fs-lead)">
          {destaque.itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <button type="button" className={`mt-[26px] ${BOTAO}`} onClick={() => aoEscolher(destaque.id, 'mensal')}>
          {`Assinar o ${destaque.nome}`}
        </button>
      </div>
      <div className="col-span-full mt-9 grid grid-cols-4 gap-5 max-[720px]:grid-cols-2">
        {outros.map((plano) => (
          <div key={plano.nome} data-surge="" className="rounded-xl bg-landing-cartao p-[18px]">
            <strong className="block text-(length:--landing-fs-lead)">{plano.nome}</strong>
            <span className="mt-1 block text-(length:--landing-fs-s) text-landing-tinta-suave">{plano.texto}</span>
          </div>
        ))}
      </div>
      <p className="col-span-full text-(length:--landing-fs-s) text-landing-tinta-suave">
        O pagamento é com cartão de crédito, aqui no site. Você cancela quando quiser em Conta e assinatura.
      </p>
    </section>
  )
}
