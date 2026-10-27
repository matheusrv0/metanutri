import type { CSSProperties } from 'react'
import { ESPACO_DE_SECAO, MARGEM, TITULO_DE_SECAO } from './estiloDaLanding.ts'

/** Os quatro passos do protótipo v9 (spec landing-v3, D-664), sem os exemplos. */
const PASSOS: readonly { readonly titulo: string; readonly texto: string }[] = [
  {
    titulo: 'Monte o plano',
    texto: 'Escolha prescrição rápida ou atendimento completo, busque os alimentos na Base MetaNutri e ajuste os gramas.',
  },
  {
    titulo: 'Analise a adequação',
    texto: 'Veja cada vitamina e mineral em relação à referência para a idade, o sexo e a fase da vida do paciente.',
  },
  {
    titulo: 'Complete com as sugestões',
    texto: 'Escolha entre os alimentos sugeridos, com a porção em gramas, quanto cobrem da falta e as calorias.',
  },
  {
    titulo: 'Entregue e acompanhe',
    texto: 'Gere o PDF ou o Word, envie o link ao paciente e acompanhe a adesão na tela Adesão.',
  },
]

/** Quando cada número acende, em s: quando a linha (1,8 s, depois de 0,2 s) chega nele. */
const ACENDE_EM = ['0s', '0.6s', '1.1s', '1.6s'] as const

/**
 * "Como funciona" (spec landing-v3, D-664): quatro passos numerados. A linha entre os números acende da esquerda para a
 * direita quando a lista entra na tela (`data-revela`), e cada número acende quando ela chega nele; na página
 * pré-desenhada, sem JavaScript e com menos movimento, tudo já nasce aceso (globals.css). A lista ordenada diz a ordem ao
 * leitor de tela; o número desenhado é enfeite.
 */
export function ComoFunciona() {
  return (
    <section id="como-funciona" aria-labelledby="titulo-como-funciona" className={`bg-landing-afundado ${ESPACO_DE_SECAO} ${MARGEM}`}>
      <h2 id="titulo-como-funciona" data-surge="" className={TITULO_DE_SECAO}>
        Como funciona
      </h2>
      <ol
        data-revela=""
        className="landing-etapas relative mt-14 grid list-none grid-cols-4 gap-8 p-0 max-[1100px]:grid-cols-2 max-[1100px]:gap-y-12 max-[720px]:grid-cols-1"
      >
        {PASSOS.map((passo, i) => (
          <li key={passo.titulo} className="relative">
            <span
              aria-hidden="true"
              className="landing-numero relative z-10 grid size-14 place-items-center rounded-full bg-landing-destaque text-xl font-extrabold text-landing-chao shadow-[0_0_0_8px_var(--landing-afundado)]"
              style={{ '--landing-atraso-numero': ACENDE_EM[i] } as CSSProperties}
            >
              {i + 1}
            </span>
            <h3 className="mt-7 text-[clamp(22px,1.9vw,26px)] leading-[1.15] font-extrabold tracking-[-0.02em]">{passo.titulo}</h3>
            <p className="mt-2.5 max-w-[32ch] text-landing-tinta-suave">{passo.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
