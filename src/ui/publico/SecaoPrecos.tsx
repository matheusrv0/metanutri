// Página de preços em tabela comparativa, no formato da referência (Outline).
//
// Por que não são cartões: quatro cartões repetem a mesma lista de linhas e escondem
// justamente o que a pessoa veio comparar. Pior, faziam Free e Estudante aparecerem
// como dois preços diferentes quando os dois custam R$ 0. Na tabela, a diferença entre
// as colunas é a única coisa que se lê.
//
// O conteúdo vem de `comparativoDosPlanos()`, derivado dos próprios planos: a tela não
// tem como afirmar limite que o plano não tem.
import NumberFlow from '@number-flow/react'
import { Check, GraduationCap, Minus } from 'lucide-react'
import { motion } from 'motion/react'
import { useRef, useState } from 'react'
import {
  comparativoDosPlanos,
  descontoAnualPct,
  mensalizadoDoAnual,
  planoPorId,
  PLANOS,
  PLANOS_COMPARADOS,
  VAGAS_PRECO_FUNDADOR,
  type IdPlano,
  type PlanoAssinatura,
  type ValorComparativo,
} from '@/domain/conta.ts'
import { cn } from '@/lib/utils'
import { OriginButton } from '@ds/componentes/efeitos/origin-button.tsx'
import { TimelineContent } from '@ds/componentes/efeitos/timeline-animation.tsx'

interface SecaoPrecosProps {
  readonly aoEscolher: (plano: IdPlano) => void
}

const entrada = {
  visible: (i: number) => ({ y: 0, opacity: 1, filter: 'blur(0px)', transition: { delay: i * 0.1, duration: 0.5 } }),
  hidden: { filter: 'blur(10px)', y: -16, opacity: 0 },
}

const colunas = PLANOS_COMPARADOS.map((id) => planoPorId(id)).filter((p): p is PlanoAssinatura => p !== null)

function Chave({ anual, aoTrocar }: { readonly anual: boolean; readonly aoTrocar: (anual: boolean) => void }) {
  const emDestaque = PLANOS.find((p) => p.destaque)
  const desconto = emDestaque ? descontoAnualPct(emDestaque) : 0

  return (
    <div role="radiogroup" aria-label="Período de cobrança" className="mx-auto flex w-fit rounded-full border border-border bg-muted p-1">
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
              'relative z-10 h-10 rounded-full px-5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
  )
}

/** O preço de uma coluna, com a ação embaixo. É a única parte que muda com a chave. */
function Preco({ plano, anual, aoEscolher }: { readonly plano: PlanoAssinatura; readonly anual: boolean; readonly aoEscolher: () => void }) {
  const temAnual = plano.anual > 0
  const valor = anual && temAnual ? mensalizadoDoAnual(plano) : plano.mensal
  const casas = Number.isInteger(valor) ? 0 : 2
  const gratis = plano.mensal === 0

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-baseline gap-1">
        <span className="numeros font-titulo text-lg font-semibold text-muted-foreground">R$</span>
        <NumberFlow value={valor} locales="pt-BR" format={{ minimumFractionDigits: casas, maximumFractionDigits: casas }} className="numeros font-titulo text-4xl font-bold text-heading" />
        {gratis ? null : <span className="text-sm text-muted-foreground">/mês</span>}
      </div>

      <p className="h-8 text-xs text-muted-foreground">
        {gratis ? 'Para sempre, sem cartão.' : anual && temAnual ? `R$ ${plano.anual.toLocaleString('pt-BR')} uma vez por ano.` : anual ? 'Só no mensal.' : 'Cancele quando quiser.'}
      </p>

      <OriginButton
        onClick={aoEscolher}
        tom={plano.destaque ? 'verde' : 'contorno'}
        className={cn(
          'w-full',
          plano.destaque
            ? 'border-transparent bg-primary text-primary-foreground hover:bg-primaryemphasis'
            : 'border-borderdefault bg-transparent text-foreground hover:border-primary',
        )}
      >
        {plano.acaoTexto}
      </OriginButton>
    </div>
  )
}

/** Incluído vira marca; ausente vira travessão. Texto passa direto. */
function Celula({ valor }: { readonly valor: ValorComparativo }) {
  if (valor === true) {
    return (
      <>
        <Check className="mx-auto size-5 text-heading" aria-hidden="true" />
        <span className="sr-only">Incluído</span>
      </>
    )
  }
  if (valor === false) {
    return (
      <>
        <Minus className="mx-auto size-4 text-textsubtle" aria-hidden="true" />
        <span className="sr-only">Não incluído</span>
      </>
    )
  }
  return <span className="numeros text-sm font-semibold text-heading">{valor}</span>
}

/** A nota do plano Estudante, que não merece uma coluna: é o Grátis com comprovante. */
function NotaEstudante() {
  const estudante = planoPorId('estudante')
  if (!estudante) return null

  return (
    <div className="flex items-start gap-3 rounded-xl border border-stateinfo/40 bg-lightinfo p-4">
      <GraduationCap className="mt-0.5 size-5 shrink-0 text-infotext" aria-hidden="true" />
      <p className="text-sm text-foreground">
        <strong className="font-semibold text-infotext">Estudante de nutrição:</strong> envie o comprovante de matrícula e o Grátis sobe para{' '}
        <strong>{estudante.limitePacientesAtivos} pacientes</strong> e <strong>{estudante.limiteLinksPaciente} links</strong>, até a formatura. Conta de
        estágio é de uso não comercial: o PDF sai marcado e a tela do paciente avisa que não é atendimento profissional.
      </p>
    </div>
  )
}

export function SecaoPrecos({ aoEscolher }: SecaoPrecosProps) {
  const [anual, setAnual] = useState(false)
  const secao = useRef<HTMLDivElement>(null)
  const linhas = comparativoDosPlanos()

  return (
    <div ref={secao} className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-8">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <TimelineContent as="h2" animationNum={0} timelineRef={secao} customVariants={entrada} className="font-titulo text-3xl font-bold text-heading sm:text-5xl">
          Grátis na faculdade, barato ao se <span className="rounded-md bg-surfaceaccent px-2 text-textonaccent">formar</span>
        </TimelineContent>
        <TimelineContent as="p" animationNum={1} timelineRef={secao} customVariants={entrada} className="mt-4 text-sm text-muted-foreground sm:text-base">
          Você paga por paciente ativo — quem teve plano ou missão nos últimos 30 dias. Quem parou de atender não conta, e você sobe de plano só quando crescer.
        </TimelineContent>
      </div>

      <TimelineContent as="div" animationNum={2} timelineRef={secao} customVariants={entrada}>
        <Chave anual={anual} aoTrocar={setAnual} />
      </TimelineContent>

      {/* Tabela: a partir de md. No celular a mesma informação vira uma lista por plano. */}
      <TimelineContent as="div" animationNum={3} timelineRef={secao} customVariants={entrada} className="mt-10 hidden md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Comparativo dos planos do MetaNutri</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[28%] p-0" />
              {colunas.map((plano) => (
                <th
                  key={plano.id}
                  scope="col"
                  className={cn('rounded-t-2xl px-4 pb-5 pt-6 align-top', plano.destaque ? 'bg-card' : 'bg-surfacesunken')}
                >
                  <span className="flex flex-col items-center gap-1">
                    <span className="font-titulo text-xl font-bold text-heading">{plano.nome}</span>
                    {plano.destaque ? (
                      <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">Mais escolhido</span>
                    ) : (
                      <span className="h-[1.125rem]" />
                    )}
                    <span className="mt-3 w-full font-normal">
                      <Preco plano={plano} anual={anual} aoEscolher={() => aoEscolher(plano.id)} />
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {linhas.map((linha, i) => (
              <tr key={linha.rotulo} className="border-t border-bordersubtle">
                <th scope="row" className="py-3.5 pr-6 text-left align-middle font-medium text-foreground">
                  {linha.rotulo}
                  {linha.detalhe ? <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{linha.detalhe}</span> : null}
                </th>
                {linha.valores.map((valor, coluna) => {
                  const plano = colunas[coluna]
                  const ultima = i === linhas.length - 1
                  return (
                    <td
                      key={plano?.id ?? coluna}
                      className={cn(
                        'px-4 py-3.5 text-center align-middle',
                        plano?.destaque ? 'bg-card' : 'bg-surfacesunken',
                        ultima ? 'rounded-b-2xl' : null,
                      )}
                    >
                      <Celula valor={valor} />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6">
          <NotaEstudante />
        </div>
      </TimelineContent>

      {/* Celular: uma lista por plano, com os mesmos valores da tabela. */}
      <div className="mt-8 flex flex-col gap-4 md:hidden">
        {colunas.map((plano, i) => (
          <TimelineContent key={plano.id} as="div" animationNum={3 + i} timelineRef={secao} customVariants={entrada}>
            <section
              aria-label={`Plano ${plano.nome}`}
              className={cn('rounded-2xl border p-5', plano.destaque ? 'border-primary/60 bg-card' : 'border-border bg-card')}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-titulo text-xl font-bold text-heading">{plano.nome}</h3>
                {plano.destaque ? <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">Mais escolhido</span> : null}
              </div>

              <div className="mt-4">
                <Preco plano={plano} anual={anual} aoEscolher={() => aoEscolher(plano.id)} />
              </div>

              <dl className="mt-5 flex flex-col gap-2 border-t border-bordersubtle pt-4">
                {linhas.map((linha) => {
                  const valor = linha.valores[colunas.indexOf(plano)]
                  if (valor === false) return null
                  return (
                    <div key={linha.rotulo} className="flex items-baseline justify-between gap-4">
                      <dt className="text-sm text-foreground">{linha.rotulo}</dt>
                      <dd className="shrink-0 text-sm font-semibold text-heading">
                        {valor === true ? <Check className="size-4" aria-label="Incluído" /> : <span className="numeros">{valor}</span>}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </section>
          </TimelineContent>
        ))}

        <NotaEstudante />
      </div>

      <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-muted-foreground">
        Os planos pagos ainda não estão no ar: nenhuma cobrança é feita e nada é bloqueado hoje. Preço de fundador para as {VAGAS_PRECO_FUNDADOR} primeiras
        assinaturas — quem entra nessa faixa fica nela para sempre, mesmo quando o preço subir.
      </p>
    </div>
  )
}
