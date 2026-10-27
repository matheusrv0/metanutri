import { useId, useState } from 'react'
import { CARTOES_DA_VITRINE } from './exemploDaLanding.ts'
import { ESPACO_DE_SECAO, LEAD, MARGEM, TITULO_L } from './estiloDaLanding.ts'
import { ListaDoCobrir } from './ListaDoCobrir.tsx'
import { chaveDaPergunta } from './perguntaDaVitrine.ts'

const EXEMPLOS = ['falta cálcio', 'falta vitamina E', 'falta vitamina D'] as const

/**
 * O campo vivo (D-536): o que se digita escolhe o cartão do Cobrir do plano de exemplo, com os números do motor
 * (D-537). Os três botões preenchem o campo; sem cálcio, vitamina E ou vitamina D, o cartão diz o que experimentar.
 */
export function VitrineDoCobrir() {
  const [pergunta, setPergunta] = useState<string>(EXEMPLOS[0])
  const campo = useId()
  const chave = chaveDaPergunta(pergunta)
  const cartao = chave ? CARTOES_DA_VITRINE[chave] : null

  return (
    <section id="plano-de-exemplo" aria-labelledby="titulo-vitrine" data-capitulo="afundado" className={`bg-landing-afundado ${ESPACO_DE_SECAO} ${MARGEM}`}>
      <h2 id="titulo-vitrine" data-surge="" className={TITULO_L}>
        O que falta no plano da Maria, 28 anos?
      </h2>
      <label htmlFor={campo} className="sr-only">
        Digite o nutriente que falta
      </label>
      <input
        id={campo}
        type="text"
        value={pergunta}
        onChange={(evento) => setPergunta(evento.target.value)}
        autoComplete="off"
        spellCheck={false}
        data-ui=""
        data-surge=""
        className="mt-3.5 block w-full border-0 bg-transparent p-0 text-(length:--landing-fs-xl) leading-[1.05] font-extrabold tracking-[-0.04em] text-landing-teal-claro caret-landing-laranja focus-visible:outline-offset-[6px] max-[720px]:text-[10vw]"
      />
      <div className="mt-10 grid grid-cols-[minmax(0,520px)_minmax(0,1fr)] items-start gap-x-14 gap-y-10 max-[720px]:grid-cols-1">
        <div data-ui="" data-surge="" aria-live="polite" className="text-sm leading-[1.4] text-landing-tinta">
          <div className="rounded-[18px] bg-landing-cartao p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <strong className="text-[17px] font-bold">{cartao ? cartao.nome : 'Neste exemplo'}</strong>
              {cartao ? <span className="text-[13px] text-landing-tinta-suave">{cartao.total}</span> : null}
            </div>
            <p className="mt-1.5 text-[13px] text-landing-tinta-suave">
              {cartao ? (
                <>
                  {'Faltam '}
                  <b className="font-bold text-landing-tinta">{cartao.falta}</b>
                  {' para a meta.'}
                </>
              ) : (
                'Experimente cálcio, vitamina E ou vitamina D.'
              )}
            </p>
            {cartao ? <ListaDoCobrir linhas={cartao.linhas} /> : null}
          </div>
        </div>
        <p data-surge="" className={`max-w-[34ch] pt-2 ${LEAD} leading-[1.55] text-landing-tinta-suave`}>
          O cálculo usa as referências de ingestão para a idade e o sexo da paciente. Cada sugestão traz a porção, quanto da falta ela cobre e as
          calorias que soma ao dia. Você escolhe o que entra.
        </p>
      </div>
      <div role="group" aria-label="Outros exemplos" data-surge="" className="mt-9 flex flex-wrap gap-2.5">
        {EXEMPLOS.map((exemplo) => (
          <button
            key={exemplo}
            type="button"
            aria-pressed={chaveDaPergunta(exemplo) === chave}
            onClick={() => setPergunta(exemplo)}
            className="min-h-11 rounded-full bg-landing-cartao px-[18px] text-(length:--landing-fs-s) leading-none font-semibold whitespace-nowrap text-landing-tinta transition-colors duration-200 hover:bg-landing-cartao-hover aria-pressed:bg-landing-marfim aria-pressed:text-landing-teal"
          >
            {exemplo}
          </button>
        ))}
      </div>
    </section>
  )
}
