import NumberFlow from '@number-flow/react'
import { BadgeCheck, CalendarClock, CloudUpload, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { useRef, useState, type ReactNode } from 'react'
import { descontoAnualPct, mensalizadoDoAnual, PLANOS, type IdPlano, type PlanoAssinatura } from '@/domain/conta.ts'
import { cn } from '@/lib/utils'
import { OriginButton } from '../componentes/origin-button.tsx'
import { TimelineContent } from '../componentes/timeline-animation.tsx'

interface SecaoPrecosProps {
  readonly aoEscolher: (plano: IdPlano) => void
}

const ICONES: Readonly<Record<IdPlano, readonly ReactNode[]>> = {
  estudante: [<CalendarClock key="a" className="size-5" />, <CloudUpload key="b" className="size-5" />, <Users key="c" className="size-5" />],
  profissional: [<CloudUpload key="a" className="size-5" />, <CalendarClock key="b" className="size-5" />, <BadgeCheck key="c" className="size-5" />],
  clinica: [<Users key="a" className="size-5" />, <BadgeCheck key="b" className="size-5" />, <CalendarClock key="c" className="size-5" />],
}

const entrada = {
  visible: (i: number) => ({ y: 0, opacity: 1, filter: 'blur(0px)', transition: { delay: i * 0.12, duration: 0.5 } }),
  hidden: { filter: 'blur(10px)', y: -20, opacity: 0 },
}

function Chave({ anual, aoTrocar }: { readonly anual: boolean; readonly aoTrocar: (anual: boolean) => void }) {
  const emDestaque = PLANOS.find((p) => p.destaque)
  const desconto = emDestaque ? descontoAnualPct(emDestaque) : 0
  return (
    <div className="flex justify-center">
      <div role="radiogroup" aria-label="Período de cobrança" className="relative mx-auto flex w-fit rounded-full border border-lombadafio bg-white/5 p-1 backdrop-blur">
        {[
          { valor: false, texto: 'Mensal' },
          { valor: true, texto: 'Anual' },
        ].map((opcao) => {
          const ativo = anual === opcao.valor
          return (
            <button
              key={opcao.texto}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => aoTrocar(opcao.valor)}
              className={cn(
                'relative z-10 h-11 rounded-full px-6 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                ativo ? 'text-lombada' : 'text-lombadatexto/70 hover:text-lombadatexto',
              )}
            >
              {ativo ? (
                <motion.span layoutId="chave-preco" className="absolute inset-0 rounded-full bg-lombadatexto" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />
              ) : null}
              <span className="relative flex items-center gap-2">
                {opcao.texto}
                {opcao.valor && desconto > 0 ? (
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', ativo ? 'bg-primary text-primary-foreground' : 'bg-white/10 text-lombadatexto')}>
                    {`-${desconto}%`}
                  </span>
                ) : null}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CartaoPlano({ plano, anual, aoEscolher }: { readonly plano: PlanoAssinatura; readonly anual: boolean; readonly aoEscolher: () => void }) {
  const valor = anual ? mensalizadoDoAnual(plano) : plano.mensal
  const gratis = plano.mensal === 0

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-md border p-6 text-left backdrop-blur transition-colors',
        plano.destaque ? 'border-primary/60 bg-white/[0.07] shadow-[0_0_0_1px_var(--color-primary)]' : 'border-lombadafio bg-white/[0.03]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-titulo text-2xl font-bold text-lombadatexto">{plano.nome}</h3>
        {plano.destaque ? <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Mais escolhido</span> : null}
      </div>
      <p className="mt-2 text-sm text-lombadafraca">{plano.resumo}</p>

      <div className="mt-5 flex items-baseline gap-1">
        {gratis ? (
          <span className="font-titulo text-4xl font-bold text-lombadatexto">Grátis</span>
        ) : (
          <>
            <span className="numeros font-titulo text-xl font-semibold text-lombadatexto">R$</span>
            <NumberFlow value={valor} locales="pt-BR" format={{ maximumFractionDigits: 2 }} className="numeros font-titulo text-4xl font-bold text-lombadatexto" />
            <span className="text-sm text-lombadafraca">/mês</span>
          </>
        )}
      </div>
      <p className="mt-1 h-4 text-xs text-lombadafraca">
        {gratis ? 'Para sempre, sem cartão.' : anual ? `R$ ${plano.anual.toLocaleString('pt-BR')} cobrados uma vez por ano.` : 'Cancele quando quiser.'}
      </p>

      <div className="mt-5">
        <OriginButton
          onClick={aoEscolher}
          tom={plano.destaque ? 'verde' : 'contorno'}
          className={cn('w-full', plano.destaque ? 'border-primary/60 bg-primary/10 text-lombadatexto' : 'border-lombadafio bg-transparent text-lombadatexto')}
        >
          {plano.acaoTexto}
        </OriginButton>
      </div>

      <ul className="mt-6 flex flex-col gap-2.5">
        {plano.recursos.map((recurso, i) => (
          <li key={recurso} className="flex items-center gap-3 text-sm text-lombadatexto">
            <span aria-hidden="true" className="text-primary">
              {ICONES[plano.id][i]}
            </span>
            {recurso}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-1 flex-col gap-2.5 border-t border-lombadafio pt-5">
        <p className="text-sm font-semibold text-lombadatexto">{plano.inclui[0]}</p>
        <ul className="flex flex-col gap-2">
          {plano.inclui.slice(1).map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-lombadafraca">
              <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-content-center rounded-full border border-primary/50 bg-primary/10">
                <BadgeCheck className="size-3 text-primary" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Página de preços. Ainda não cobra nada: o botão leva para a criação de conta. */
export function SecaoPrecos({ aoEscolher }: SecaoPrecosProps) {
  const [anual, setAnual] = useState(false)
  const secao = useRef<HTMLDivElement>(null)

  return (
    <div ref={secao} className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <TimelineContent as="h2" animationNum={0} timelineRef={secao} customVariants={entrada} className="font-titulo text-3xl font-bold text-lombadatexto sm:text-5xl">
          Um preço que cabe em quem está{' '}
          <span className="rounded-md border border-dashed border-primary/60 bg-primary/10 px-2 text-primary">começando</span>
        </TimelineContent>
        <TimelineContent as="p" animationNum={1} timelineRef={secao} customVariants={entrada} className="mt-4 text-sm text-lombadafraca sm:text-base">
          O plano do estágio continua de graça, para sempre. Você paga só quando precisar dos dados fora deste computador.
        </TimelineContent>
      </div>

      <TimelineContent as="div" animationNum={2} timelineRef={secao} customVariants={entrada}>
        <Chave anual={anual} aoTrocar={setAnual} />
      </TimelineContent>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {PLANOS.map((plano, i) => (
          <TimelineContent key={plano.id} as="div" animationNum={3 + i} timelineRef={secao} customVariants={entrada} className="h-full">
            <CartaoPlano plano={plano} anual={anual} aoEscolher={() => aoEscolher(plano.id)} />
          </TimelineContent>
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-lombadafraca">
        Os planos pagos ainda não estão no ar: nenhuma cobrança é feita e nada é bloqueado hoje. Criar a conta agora garante o preço de lançamento.
      </p>
    </div>
  )
}
