import { useState } from 'react'
import { resumoParaOLeitor } from './anel.ts'
import { AnelDaAdequacao } from './AnelDaAdequacao.tsx'
import { META_DA_ADEQUACAO, NUTRIENTES_DO_EXEMPLO } from './exemploDaLanding.ts'
import { APOIO, CARTAO_DA_V9, ESPACO_DE_SECAO, MARGEM, TITULO_DE_SECAO } from './estiloDaLanding.ts'

/** A luz de cima dos cartões e do painel (D-676), atrás do conteúdo. */
const LUZ = 'before:absolute before:inset-0 before:-z-10 before:content-[""]'

/** O toque nos botões da Adequação: afundam um pouco, sem esperar (emil-design-eng). */
const TOQUE = 'transition-[background-color,border-color,scale] duration-200 active:scale-[.985] motion-reduce:active:scale-100'

/**
 * "Adequação de micronutrientes com sugestão do que comer" (spec landing-v3, D-656 a D-658): as abas do cálcio, da vitamina
 * E e da vitamina D do plano de exemplo e o painel com o anel e as sugestões, com os números do motor
 * (`exemploDaLanding.ts`). Trocar de aba abre na sugestão escolhida dela (CB-655). A troca é anunciada por um resumo
 * escondido, não pelo painel inteiro (revisão da v9).
 */
export function AdequacaoDoExemplo() {
  const [escolha, setEscolha] = useState(() => ({ nutriente: 0, sugestao: NUTRIENTES_DO_EXEMPLO[0]?.escolhida ?? 0 }))
  const nutriente = NUTRIENTES_DO_EXEMPLO[escolha.nutriente] ?? NUTRIENTES_DO_EXEMPLO[0]
  const sugestao = nutriente?.sugestoes[escolha.sugestao] ?? nutriente?.sugestoes[0]
  if (!nutriente || !sugestao) return null

  return (
    <section id="adequacao" aria-labelledby="titulo-adequacao" className={`bg-landing-afundado ${ESPACO_DE_SECAO} ${MARGEM}`}>
      <h2 id="titulo-adequacao" data-surge="" className={TITULO_DE_SECAO}>
        Adequação de micronutrientes com sugestão do que comer
      </h2>
      <p data-surge="" className={APOIO}>
        Cada vitamina e mineral abaixo da meta vem com até 5 alimentos, a porção em gramas e quanto da falta cada um cobre.
      </p>
      <div className="mt-12 grid grid-cols-[minmax(0,4fr)_minmax(0,7fr)] items-start gap-14 max-[1100px]:grid-cols-1">
        <div data-surge="" className="grid gap-2.5">
          <div role="group" aria-label="Nutrientes do plano de exemplo" className="grid gap-2.5">
            {NUTRIENTES_DO_EXEMPLO.map((n, i) => (
              <button
                key={n.chave}
                type="button"
                aria-pressed={i === escolha.nutriente}
                onClick={() => setEscolha({ nutriente: i, sugestao: n.escolhida })}
                className={`group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-[18px] border border-landing-borda bg-transparent px-5 py-[18px] text-left text-landing-tinta hover:bg-landing-cartao aria-pressed:border-landing-destaque aria-pressed:bg-landing-cartao aria-pressed:shadow-(--landing-sombra-cartao) ${TOQUE}`}
              >
                <strong className="text-lg font-extrabold">{n.nome}</strong>{' '}
                <span className="col-start-1 text-sm text-landing-tinta-suave">{n.total}</span>{' '}
                <em className="col-start-2 row-span-2 row-start-1 text-[22px] font-extrabold tracking-[-0.02em] text-landing-tinta-suave not-italic group-aria-pressed:text-landing-destaque">
                  {`${n.pct}%`}
                </em>
              </button>
            ))}
          </div>
          <p className="mt-2">{`Plano de exemplo: Maria, 28 anos. A meta é ${META_DA_ADEQUACAO}% da referência para a idade e o sexo.`}</p>
        </div>
        {/* Revisão da v9: o leitor de tela ouve só o resumo da escolha, não o painel inteiro de novo. */}
        <p aria-live="polite" className="sr-only">
          {resumoParaOLeitor(nutriente, sugestao)}
        </p>
        <div
          data-surge=""
          data-painel-adequacao=""
          className={`grid grid-cols-[260px_minmax(0,1fr)] items-center gap-9 rounded-[28px] p-9 ${CARTAO_DA_V9} ${LUZ} before:bg-[radial-gradient(70%_60%_at_20%_30%,var(--landing-luz-cartao),transparent_70%)] max-[720px]:grid-cols-1 max-[720px]:justify-items-center max-[720px]:p-6`}
        >
          <AnelDaAdequacao nutriente={nutriente} sugestao={sugestao} />
          <div className="w-full min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <strong className="text-xl font-extrabold">{nutriente.nome}</strong>
              <span className="text-[13px] text-landing-tinta-suave">{nutriente.total}</span>
            </div>
            <div role="group" aria-label="Sugestões para completar" className="mt-[18px] grid gap-2.5">
              {nutriente.sugestoes.map((s, i) => (
                <button
                  key={s.nome}
                  type="button"
                  aria-pressed={i === escolha.sugestao}
                  onClick={() => setEscolha({ nutriente: escolha.nutriente, sugestao: i })}
                  className={`group flex w-full flex-wrap items-center gap-x-3.5 gap-y-1 rounded-2xl border border-landing-borda bg-landing-afundado px-4 py-3.5 text-left text-landing-tinta aria-pressed:border-landing-destaque aria-pressed:bg-landing-cartao ${TOQUE}`}
                >
                  <i
                    aria-hidden="true"
                    className="size-[22px] flex-none rounded-full shadow-[inset_0_0_0_2px_var(--landing-tinta-suave)] transition-shadow duration-200 group-aria-pressed:shadow-[inset_0_0_0_7px_var(--landing-destaque)]"
                  />
                  {/* A base de 9rem decide a quebra: a cobertura só desce quando o texto grande não deixa nem isso. */}
                  <span className="min-w-0 flex-[1_1_9rem]">
                    <strong className="block text-[15px] font-extrabold">{s.nome}</strong>{' '}
                    <span className="block text-[13px] text-landing-tinta-suave">{`${s.gramas} · +${s.kcal} kcal`}</span>
                  </span>{' '}
                  <em className="ml-auto flex-none text-lg font-extrabold text-landing-destaque not-italic">{`${s.cobre}%`}</em>
                </button>
              ))}
            </div>
            <p className="mt-4 text-[13px] text-landing-tinta-suave">Você escolhe; o alimento entra na refeição com os gramas.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
