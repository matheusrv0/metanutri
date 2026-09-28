import { Check, LockKeyhole, Star } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Assinatura } from '@/domain/assinatura.ts'
import { descontoAnualPct, mensalizadoDoAnual, planoPorId, VAGAS_PRECO_FUNDADOR, valorNoCiclo, type Ciclo } from '@/domain/conta.ts'
import { cn } from '@/lib/utils'
import { Logo } from '@ds/componentes/display/Logo.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'
import type { PlanoPago } from '../navegacao.ts'
import { AvisoFormulario } from './conta/AvisoFormulario.tsx'

interface TelaCheckoutProps {
  readonly plano: PlanoPago
  readonly ciclo: Ciclo
  readonly email: string
  readonly assinaturaAtual: Assinatura
  readonly vagasRestantes: number | null
  readonly disponivel: boolean
  readonly aoTrocar: (plano: PlanoPago, ciclo: Ciclo) => void
  readonly aoPagar: (plano: PlanoPago, ciclo: Ciclo) => Promise<string | null>
  readonly aoIrParaPainel: () => void
  readonly aoIrParaInicio: () => void
}

const PAGOS: readonly PlanoPago[] = ['solo', 'pro']
const reais = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Revisar e pagar (spec estilo-spora, US-1.8; mockup conta e checkout v1). */
export function TelaCheckout({ plano, ciclo, email, assinaturaAtual, vagasRestantes, disponivel, aoTrocar, aoPagar, aoIrParaPainel, aoIrParaInicio }: TelaCheckoutProps) {
  const [erro, setErro] = useState<string | null>(null)
  const [pagando, setPagando] = useState(false)
  const pagandoRef = useRef(false)

  const escolhido = planoPorId(plano)
  if (!escolhido) return null

  const total = valorNoCiclo(escolhido, ciclo)
  const desconto = descontoAnualPct(escolhido)
  const jaAssina = assinaturaAtual.status === 'ativa' && (assinaturaAtual.plano === 'solo' || assinaturaAtual.plano === 'pro')
  // O servidor troca a linha para "pendente" assim que a assinatura é aberta: quem está
  // no Estudante precisa saber, antes de pagar, que ele deixa de valer na hora (CB-controlador).
  const estudanteAtivo = assinaturaAtual.status === 'ativa' && assinaturaAtual.plano === 'estudante'

  const pagar = async () => {
    if (pagandoRef.current) return
    pagandoRef.current = true
    setPagando(true)
    setErro(null)
    const mensagem = await aoPagar(plano, ciclo)
    pagandoRef.current = false
    setPagando(false)
    if (mensagem) setErro(mensagem)
  }

  return (
    <div className="min-h-dvh bg-background px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-[1100px]">
        <button
          type="button"
          onClick={aoIrParaInicio}
          aria-label="MetaNutri, início"
          className="mb-6 inline-flex min-h-11 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo tamanho={26} />
        </button>

        <div className="grid overflow-hidden rounded-2xl bg-card lg:grid-cols-[1.25fr_0.9fr]">
          <main className="flex flex-col gap-5 p-6 sm:p-9">
            <ol aria-label="Etapas" className="flex gap-4 text-xs font-semibold text-muted-foreground">
              <li className="text-successtext">✓ Conta</li>
              <li aria-current="step" className="text-heading">
                2 Plano
              </li>
              <li>3 Pagamento</li>
            </ol>
            <h1 className="text-3xl font-bold">Revise sua assinatura</h1>

            <SeletorSegmentado
              rotulo="Período de cobrança"
              valor={ciclo}
              aoEscolher={(c) => aoTrocar(plano, c)}
              opcoes={[
                { valor: 'mensal', rotulo: 'Mensal' },
                { valor: 'anual', rotulo: <>Anual{desconto > 0 ? <span className="text-acento">{`−${desconto}%`}</span> : null}</> },
              ]}
            />

            <div role="radiogroup" aria-label="Plano" className="grid gap-3 sm:grid-cols-2">
              {PAGOS.map((id) => {
                const p = planoPorId(id)
                if (!p) return null
                const marcado = id === plano
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={marcado}
                    onClick={() => aoTrocar(id, ciclo)}
                    className={cn(
                      'flex flex-col gap-1 rounded-3xl p-4 text-left ring-1 ring-inset transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      marcado ? 'ring-2 ring-primary' : 'ring-border hover:ring-primary/50',
                    )}
                  >
                    <span className="font-semibold text-heading">{p.nome}</span>
                    <span className="font-titulo text-2xl font-bold text-heading">
                      R$ {reais(valorNoCiclo(p, ciclo))} <span className="font-sans text-xs font-semibold text-muted-foreground">{ciclo === 'anual' ? '/ano' : '/mês'}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {ciclo === 'anual' ? `Sai R$ ${reais(mensalizadoDoAnual(p))} por mês. ` : ''}
                      {p.recursos[0]}
                    </span>
                  </button>
                )
              })}
            </div>

            {vagasRestantes === 0 ? null : (
              <div className="flex items-start gap-3 rounded-xl bg-acentoclaro p-4 text-sm">
                <span className="grid size-8 shrink-0 place-content-center rounded-full bg-acentofundo text-textoacento">
                  <Star className="size-4" aria-hidden="true" />
                </span>
                <p>
                  <strong>Preço de fundador.</strong> Enquanto a assinatura estiver ativa, esse valor não sobe.
                  {vagasRestantes !== null ? ` Restam ${vagasRestantes} de ${VAGAS_PRECO_FUNDADOR} vagas.` : ''}
                </p>
              </div>
            )}

            <ul className="flex flex-col gap-2 text-sm">
              {[...escolhido.recursos, 'Cancele quando quiser'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </main>

          <section aria-label="Resumo" className="flex flex-col gap-4 bg-surfacerow p-6 sm:p-9">
            <p className="rotulo">Resumo</p>
            <dl className="flex flex-col gap-2.5 rounded-3xl bg-card p-5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Plano</dt>
                <dd className="font-semibold text-heading">{escolhido.nome}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Cobrança</dt>
                <dd className="font-semibold text-heading">{ciclo === 'anual' ? 'Anual' : 'Mensal'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Conta</dt>
                <dd className="truncate font-semibold text-heading">{email}</dd>
              </div>
              <div className="mt-1 flex items-end justify-between gap-3 border-t border-border pt-3">
                <dt className="text-muted-foreground">Total hoje</dt>
                <dd className="font-titulo text-3xl font-bold text-heading">R$ {reais(total)}</dd>
              </div>
            </dl>

            {!disponivel ? (
              <AvisoFormulario tipo="erro">A conta na nuvem não está configurada neste MetaNutri.</AvisoFormulario>
            ) : jaAssina ? (
              <>
                <AvisoFormulario tipo="ok">
                  Você já tem uma assinatura ativa: {planoPorId(assinaturaAtual.plano)?.nome}. A troca de plano pago ainda não é feita pelo site.
                </AvisoFormulario>
                <Button size="lg" block onClick={aoIrParaPainel}>
                  Ir para o painel
                </Button>
              </>
            ) : (
              <>
                {estudanteAtivo ? (
                  <AvisoFormulario tipo="ok">Você está no plano Estudante. Ao assinar, ele deixa de valer, e até o pagamento confirmar vale o Free.</AvisoFormulario>
                ) : null}
                <Button variant="laranja" size="lg" block loading={pagando} onClick={() => void pagar()}>
                  Pagar com Mercado Pago
                </Button>
              </>
            )}

            {erro ? <AvisoFormulario tipo="erro">{erro}</AvisoFormulario> : null}

            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Você termina o pagamento no site do Mercado Pago, com cartão. Nenhum dado de cartão passa pelo MetaNutri. Depois você volta para cá sozinho.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
