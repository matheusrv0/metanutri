import { Barcode, ClipboardList, Gauge, ScanSearch, Sparkles, Timer } from 'lucide-react'
import { useRef } from 'react'
import { ALIMENTOS } from '@/domain/tabelas.ts'
import { OriginButton } from '../componentes/origin-button.tsx'
import { TimelineContent } from '../componentes/timeline-animation.tsx'

interface TelaInicioProps {
  readonly aoAbrirSistema: () => void
  readonly aoVerPrecos: () => void
  readonly aoVerExemplo: () => void
}

const entrada = {
  visible: (i: number) => ({ y: 0, opacity: 1, filter: 'blur(0px)', transition: { delay: i * 0.12, duration: 0.55 } }),
  hidden: { filter: 'blur(10px)', y: 20, opacity: 0 },
}

const NUMEROS = [
  { valor: ALIMENTOS.length.toString(), rotulo: 'alimentos da TACO' },
  { valor: '20', rotulo: 'nutrientes conferidos' },
  { valor: '0', rotulo: 'dado enviado para servidor' },
]

const RECURSOS = [
  {
    icone: Timer,
    titulo: 'Escreva como você fala',
    texto: 'Digite “150 arroz integral” e tecle Enter. A medida caseira e as kcal aparecem sozinhas, com a fonte do número ao lado.',
  },
  {
    icone: ScanSearch,
    titulo: 'O que falta, e o que fecha a falta',
    texto: 'O concorrente mostra a adequação e para. O botão cobrir sugere até cinco alimentos de grupos diferentes para fechar o micronutriente em falta.',
  },
  {
    icone: Barcode,
    titulo: 'Industrializado pelo rótulo',
    texto: 'Leia o código de barras pela câmera. Os dados vêm preenchidos da Open Food Facts para você conferir com a embalagem.',
  },
  {
    icone: ClipboardList,
    titulo: 'Sai pronto para entregar',
    texto: 'Dieta para imprimir, aconselhamento em Word no modelo do estágio e memorial de cálculo. Com lista de trocas para o paciente.',
  },
  {
    icone: Gauge,
    titulo: 'Dois caminhos',
    texto: 'Prescrição rápida para retorno e ajuste; atendimento completo com antropometria e gasto energético. Um vira o outro quando precisar.',
  },
  {
    icone: Sparkles,
    titulo: 'Honesto com o dado',
    texto: 'Falta de dado aparece como falta, nunca como zero. A busca avisa quando a tabela só tem parte dos nutrientes daquele alimento.',
  },
]

/** Porta de entrada pública: o que é, para quem é e por que confiar no número. */
export function TelaInicio({ aoAbrirSistema, aoVerPrecos, aoVerExemplo }: TelaInicioProps) {
  const heroi = useRef<HTMLDivElement>(null)
  const grade = useRef<HTMLDivElement>(null)

  return (
    <>
      <section ref={heroi} className="mx-auto w-full max-w-4xl px-4 py-20 text-center sm:px-8 sm:py-28">
        <TimelineContent
          as="p"
          animationNum={0}
          timelineRef={heroi}
          customVariants={entrada}
          className="rotulo mx-auto mb-5 w-fit rounded-full border border-lombadafio bg-white/5 px-4 py-1.5 text-lombadatexto"
        >
          Para estudante de nutrição e recém-formado
        </TimelineContent>

        <TimelineContent
          as="h1"
          animationNum={1}
          timelineRef={heroi}
          customVariants={entrada}
          className="font-titulo text-4xl font-bold leading-[1.05] text-lombadatexto sm:text-6xl"
        >
          O plano alimentar inteiro em <span className="text-primary">minutos</span>, não em horas
        </TimelineContent>

        <TimelineContent as="p" animationNum={2} timelineRef={heroi} customVariants={entrada} className="mx-auto mt-5 max-w-2xl text-base text-lombadafraca sm:text-lg">
          Monte as refeições, confira a adequação de vitaminas e minerais e saia com o documento pronto para a preceptora assinar. Roda no navegador, sem instalar nada.
        </TimelineContent>

        <TimelineContent as="div" animationNum={3} timelineRef={heroi} customVariants={entrada} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <OriginButton onClick={aoVerExemplo} className="border-primary/60 bg-primary/10 text-lombadatexto">
            Ver um plano pronto
          </OriginButton>
          <OriginButton onClick={aoAbrirSistema} tom="contorno" className="border-lombadafio bg-transparent text-lombadatexto">
            Começar do zero
          </OriginButton>
        </TimelineContent>

        <TimelineContent as="dl" animationNum={4} timelineRef={heroi} customVariants={entrada} className="mx-auto mt-14 grid max-w-xl grid-cols-3 gap-4">
          {NUMEROS.map((n) => (
            <div key={n.rotulo} className="rounded-md border border-lombadafio bg-white/[0.03] px-3 py-4 backdrop-blur">
              <dt className="sr-only">{n.rotulo}</dt>
              <dd className="numeros font-titulo text-3xl font-bold text-lombadatexto">{n.valor}</dd>
              <p aria-hidden="true" className="rotulo mt-1 text-lombadafraca">
                {n.rotulo}
              </p>
            </div>
          ))}
        </TimelineContent>
      </section>

      <section ref={grade} className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {RECURSOS.map((recurso, i) => (
            <TimelineContent key={recurso.titulo} as="div" animationNum={i} timelineRef={grade} customVariants={entrada} className="h-full">
              <article className="flex h-full flex-col gap-3 rounded-md border border-lombadafio bg-white/[0.03] p-6 backdrop-blur transition-colors hover:border-primary/50 hover:bg-white/[0.06]">
                <span aria-hidden="true" className="grid size-10 place-content-center rounded-md border border-primary/40 bg-primary/10 text-primary">
                  <recurso.icone className="size-5" />
                </span>
                <h2 className="font-titulo text-lg font-semibold text-lombadatexto">{recurso.titulo}</h2>
                <p className="text-sm leading-relaxed text-lombadafraca">{recurso.texto}</p>
              </article>
            </TimelineContent>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 rounded-md border border-lombadafio bg-white/[0.04] px-6 py-10 text-center backdrop-blur">
          <h2 className="font-titulo text-2xl font-bold text-lombadatexto sm:text-3xl">O plano do estágio é de graça, para sempre</h2>
          <p className="max-w-xl text-sm text-lombadafraca">Você só paga quando precisar dos dados em outro aparelho. Sem cartão para começar.</p>
          <OriginButton onClick={aoVerPrecos} className="border-primary/60 bg-primary/10 text-lombadatexto">
            Ver os planos
          </OriginButton>
        </div>
      </section>
    </>
  )
}
