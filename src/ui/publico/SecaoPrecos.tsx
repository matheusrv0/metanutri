import NumberFlow from '@number-flow/react'
import { BadgeCheck, CalendarClock, CloudUpload, GraduationCap, Users } from 'lucide-react'
import { motion } from 'motion/react'
import { useRef, useState, type ReactNode } from 'react'
import { descontoAnualPct, mensalizadoDoAnual, planoPorId, PLANOS, VAGAS_PRECO_FUNDADOR, type IdPlano, type PlanoAssinatura } from '@/domain/conta.ts'
import { cn } from '@/lib/utils'
import { OriginButton } from '@ds/componentes/efeitos/origin-button.tsx'
import { TimelineContent } from '@ds/componentes/efeitos/timeline-animation.tsx'

interface SecaoPrecosProps {
  readonly aoEscolher: (plano: IdPlano) => void
}

const ICONES: Readonly<Record<IdPlano, readonly ReactNode[]>> = {
  free: [<Users key="a" className="size-5" />, <BadgeCheck key="b" className="size-5" />, <CalendarClock key="c" className="size-5" />],
  estudante: [<Users key="a" className="size-5" />, <BadgeCheck key="b" className="size-5" />, <CalendarClock key="c" className="size-5" />],
  solo: [<Users key="a" className="size-5" />, <BadgeCheck key="b" className="size-5" />, <CloudUpload key="c" className="size-5" />],
  pro: [<Users key="a" className="size-5" />, <BadgeCheck key="b" className="size-5" />, <CloudUpload key="c" className="size-5" />],
  clinica: [<Users key="a" className="size-5" />, <Users key="b" className="size-5" />, <BadgeCheck key="c" className="size-5" />],
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
      <div role="radiogroup" aria-label="Período de cobrança" className="relative mx-auto flex w-fit rounded-full border border-border bg-muted p-1">
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
                'relative z-10 h-11 rounded-full px-6 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                ativo ? 'text-textoninverse' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {ativo ? (
                <motion.span layoutId="chave-preco" className="absolute inset-0 rounded-full bg-surfaceinverse" transition={{ type: 'spring', stiffness: 500, damping: 34 }} />
              ) : null}
              <span className="relative flex items-center gap-2">
                {opcao.texto}
                {opcao.valor && desconto > 0 ? (
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', ativo ? 'bg-surfaceaccent text-textonaccent' : 'bg-card text-muted-foreground')}>
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
  const temAnual = plano.anual > 0
  const valor = anual && temAnual ? mensalizadoDoAnual(plano) : plano.mensal
  const gratis = plano.mensal === 0
  const casas = Number.isInteger(valor) ? 0 : 2
  const limite = plano.limitePacientesAtivos

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-md border p-6 text-left backdrop-blur transition-colors',
        plano.destaque ? 'border-primary/60 bg-card shadow-[0_0_0_1px_var(--color-primary)]' : 'border-border bg-card',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-titulo text-2xl font-bold text-foreground">{plano.nome}</h3>
        {plano.destaque ? <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Mais escolhido</span> : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{plano.resumo}</p>

      <div className="mt-5 flex items-baseline gap-1">
        {gratis ? (
          <span className="font-titulo text-4xl font-bold text-foreground">Grátis</span>
        ) : (
          <>
            <span className="numeros font-titulo text-xl font-semibold text-foreground">R$</span>
            <NumberFlow
              value={valor}
              locales="pt-BR"
              format={{ minimumFractionDigits: casas, maximumFractionDigits: casas }}
              className="numeros font-titulo text-4xl font-bold text-foreground"
            />
            <span className="text-sm text-muted-foreground">/mês</span>
          </>
        )}
      </div>
      <p className="mt-1 h-4 text-xs text-muted-foreground">
        {gratis
          ? 'Para sempre, sem cartão.'
          : anual && temAnual
            ? `R$ ${plano.anual.toLocaleString('pt-BR')} cobrados uma vez por ano.`
            : anual
              ? 'Este plano é só no mensal.'
              : 'Cancele quando quiser.'}
      </p>
      <p className="mt-2 text-xs font-medium text-foreground">
        {limite === null ? 'Pacientes ativos ilimitados' : `Até ${limite} ${limite === 1 ? 'paciente ativo' : 'pacientes ativos'}`}
      </p>

      <div className="mt-5">
        <OriginButton
          onClick={aoEscolher}
          tom={plano.destaque ? 'verde' : 'contorno'}
          className={cn(
            'w-full',
            plano.destaque ? 'border-transparent bg-primary text-primary-foreground hover:bg-primaryemphasis' : 'border-borderdefault bg-transparent text-foreground hover:border-primary',
          )}
        >
          {plano.acaoTexto}
        </OriginButton>
      </div>

      <ul className="mt-6 flex flex-col gap-2.5">
        {plano.recursos.map((recurso, i) => (
          <li key={recurso} className="flex items-center gap-3 text-sm text-foreground">
            <span aria-hidden="true" className="text-primary">
              {ICONES[plano.id][i]}
            </span>
            {recurso}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-1 flex-col gap-2.5 border-t border-border pt-5">
        <p className="text-sm font-semibold text-foreground">{plano.inclui[0]}</p>
        <ul className="flex flex-col gap-2">
          {plano.inclui.slice(1).map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-muted-foreground">
              <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-content-center rounded-full border border-primary/30 bg-lightprimary">
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

/**
 * Free e Estudante custam os dois R$ 0, e a única diferença é o comprovante de
 * matrícula. Dois cartões dizendo "Grátis" lado a lado faziam a pessoa comparar
 * preço onde não há preço; aqui viram um cartão só, com a subida por dentro.
 */
function CartaoGratis({ aoEscolher }: { readonly aoEscolher: (plano: IdPlano) => void }) {
  const gratis = planoPorId('free')
  const estudante = planoPorId('estudante')
  if (!gratis) return null

  return (
    <div className="flex h-full flex-col rounded-md border border-border bg-card p-6 text-left backdrop-blur">
      <h3 className="font-titulo text-2xl font-bold text-foreground">Grátis</h3>
      <p className="mt-2 text-sm text-muted-foreground">Para conhecer o sistema com um caso real e para o estágio.</p>

      <div className="mt-5 flex items-baseline gap-1">
        <span className="font-titulo text-4xl font-bold text-foreground">R$ 0</span>
      </div>
      <p className="mt-1 h-4 text-xs text-muted-foreground">Para sempre, sem cartão.</p>
      <p className="mt-2 text-xs font-medium text-foreground">Até {gratis.limitePacientesAtivos} pacientes ativos</p>

      <div className="mt-5">
        <OriginButton
          onClick={() => aoEscolher(gratis.id)}
          tom="contorno"
          className="w-full border-borderdefault bg-transparent text-foreground hover:border-primary"
        >
          {gratis.acaoTexto}
        </OriginButton>
      </div>

      <ul className="mt-6 flex flex-col gap-2.5">
        {gratis.inclui.slice(1).map((item) => (
          <li key={item} className="flex items-start gap-3 text-sm text-foreground">
            <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-content-center rounded-full border border-primary/30 bg-lightprimary">
              <BadgeCheck className="size-3 text-primary" />
            </span>
            {item}
          </li>
        ))}
      </ul>

      {estudante ? (
        <div className="mt-6 flex flex-1 flex-col gap-2 rounded-xl border border-stateinfo/40 bg-lightinfo p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-infotext">
            <GraduationCap className="size-4" aria-hidden="true" />
            Estudante de nutrição?
          </p>
          <p className="text-sm text-foreground">
            Envie o comprovante de matrícula e o mesmo plano sobe para{' '}
            <strong>{estudante.limitePacientesAtivos} pacientes</strong> e <strong>{estudante.limiteLinksPaciente} links de missões</strong>, até a formatura.
          </p>
          <p className="text-xs text-muted-foreground">
            Conta de estágio é de uso não comercial: o PDF sai marcado e a tela do paciente avisa que não é atendimento profissional.
          </p>
          <button
            type="button"
            onClick={() => aoEscolher(estudante.id)}
            className="mt-1 self-start text-sm font-semibold text-infotext underline underline-offset-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {estudante.acaoTexto}
          </button>
        </div>
      ) : null}
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
        <TimelineContent as="h2" animationNum={0} timelineRef={secao} customVariants={entrada} className="font-titulo text-3xl font-bold text-foreground sm:text-5xl">
          Grátis na faculdade, barato ao se{' '}
          <span className="rounded-md bg-surfaceaccent px-2 text-textonaccent">formar</span>
        </TimelineContent>
        <TimelineContent as="p" animationNum={1} timelineRef={secao} customVariants={entrada} className="mt-4 text-sm text-muted-foreground sm:text-base">
          Você paga por paciente ativo — quem teve plano ou missão nos últimos 30 dias. Quem parou de atender não conta, e você sobe de plano só quando crescer.
        </TimelineContent>
      </div>

      <TimelineContent as="div" animationNum={2} timelineRef={secao} customVariants={entrada}>
        <Chave anual={anual} aoTrocar={setAnual} />
      </TimelineContent>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TimelineContent as="div" animationNum={3} timelineRef={secao} customVariants={entrada} className="h-full">
          <CartaoGratis aoEscolher={aoEscolher} />
        </TimelineContent>

        {PLANOS.filter((plano) => plano.mensal > 0).map((plano, i) => (
          <TimelineContent key={plano.id} as="div" animationNum={4 + i} timelineRef={secao} customVariants={entrada} className="h-full">
            <CartaoPlano plano={plano} anual={anual} aoEscolher={() => aoEscolher(plano.id)} />
          </TimelineContent>
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
        Os planos pagos ainda não estão no ar: nenhuma cobrança é feita e nada é bloqueado hoje. Preço de fundador para as {VAGAS_PRECO_FUNDADOR} primeiras
        assinaturas — quem entra nessa faixa fica nela para sempre, mesmo quando o preço subir.
      </p>
    </div>
  )
}
