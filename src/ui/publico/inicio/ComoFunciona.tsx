import { ADEQUACAO_DO_EXEMPLO, COBRIR_CALCIO, FEIJAO_NA_CONCHA } from './exemploDaLanding.ts'
import { ESPACO_DE_SECAO, MARGEM, TITULO_XL } from './estiloDaLanding.ts'
import { ListaDoCobrir } from './ListaDoCobrir.tsx'
import { PassoDeComoFunciona } from './PassoDeComoFunciona.tsx'

/** A seta do seletor do fragmento. */
const SETA = (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
)

const SELETOR =
  'inline-flex min-h-[34px] items-center gap-2 rounded-[10px] border border-landing-contorno bg-landing-chao px-3 text-[13px] whitespace-nowrap'

/** O cartão do fragmento de interface (D-550): a borda é a do app, não enfeite. */
const CARTAO = 'rounded-[18px] border border-landing-trilho bg-landing-cartao p-5 text-sm leading-[1.4] text-landing-tinta'

/** O botão "Cobrir" do fragmento: imagem do botão, não controle (D-550). */
const COBRIR_DO_FRAGMENTO =
  'inline-flex min-h-[34px] flex-none items-center rounded-full border border-landing-contorno px-3.5 text-[13px] leading-none font-bold whitespace-nowrap text-landing-tinta'

/** "Como funciona" (D-534): três passos, sem número, cada um com o que se digita e o que o app mostra. */
export function ComoFunciona() {
  return (
    <section id="como-funciona" aria-labelledby="titulo-como-funciona" data-capitulo="chao" className={`bg-landing-chao ${ESPACO_DE_SECAO} ${MARGEM}`}>
      <div className="ml-[clamp(0px,22vw,340px)] grid max-w-[540px] gap-20 max-[1100px]:ml-0">
        <h2 id="titulo-como-funciona" data-surge="" className={TITULO_XL}>
          Como funciona
        </h2>

        <PassoDeComoFunciona
          frase="Primeiro, digite o que a paciente come."
          chamada={
            <>
              {FEIJAO_NA_CONCHA.digitado}
              <span
                aria-hidden="true"
                className="ml-[3px] inline-block h-[1.1em] w-[3px] bg-landing-laranja align-[-0.15em] motion-safe:animate-landing-piscar"
              />
            </>
          }
        >
          <div className={CARTAO}>
            <div className="flex items-center justify-between gap-3 rounded-[14px] bg-landing-afundado py-[11px] pr-[11px] pl-3.5">
              <div className="min-w-0">
                <div className="font-bold">{FEIJAO_NA_CONCHA.nome}</div>
                <div className="text-[13px] text-landing-tinta-suave">{`${FEIJAO_NA_CONCHA.gramas} · ${FEIJAO_NA_CONCHA.kcal}`}</div>
              </div>
              <span className={SELETOR}>
                {FEIJAO_NA_CONCHA.medida}
                {SETA}
              </span>
            </div>
          </div>
        </PassoDeComoFunciona>

        <PassoDeComoFunciona frase="Depois, veja quanto falta." chamada="Etapa Adequação">
          <ul className={`${CARTAO} grid list-none gap-2`}>
            {ADEQUACAO_DO_EXEMPLO.map((linha) => (
              <li key={linha.nome} className="flex items-center justify-between gap-3 rounded-[14px] bg-landing-afundado py-[11px] pr-[11px] pl-3.5">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{linha.nome}</div>
                  <div className="text-[13px] text-landing-tinta-suave">{linha.quanto}</div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-landing-trilho">
                    <i className="block h-full rounded-full bg-landing-destaque" style={{ width: `${linha.pct}%` }} />
                  </div>
                </div>
                <span aria-hidden="true" className={COBRIR_DO_FRAGMENTO}>
                  Cobrir
                </span>
              </li>
            ))}
          </ul>
        </PassoDeComoFunciona>

        <PassoDeComoFunciona frase="Então, cubra o que falta." chamada="Cobrir cálcio" larga>
          <div className={CARTAO}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <strong className="text-[17px] font-bold">Cobrir cálcio</strong>
              <span className="text-[13px] text-landing-tinta-suave">{`Faltam ${COBRIR_CALCIO.falta}`}</span>
            </div>
            <p className="mt-1.5 text-[13px] text-landing-tinta-suave">
              {'Adicionar em '}
              <span className={SELETOR}>
                Refeição de cada alimento
                {SETA}
              </span>
            </p>
            <ListaDoCobrir linhas={COBRIR_CALCIO.linhas} daFaltaNaPrimeira />
          </div>
        </PassoDeComoFunciona>
      </div>
    </section>
  )
}
