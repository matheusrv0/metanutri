import { Check, Clock, WifiOff, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { respostaDaVolta, type Assinatura } from '@/domain/assinatura.ts'
import { planoPorId } from '@/domain/conta.ts'
import { cn } from '@/lib/utils'
import { Logo } from '@ds/componentes/display/Logo.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { ehPlanoPago, type PlanoPago } from '../navegacao.ts'

interface TelaVoltaPagamentoProps {
  readonly assinatura: Assinatura
  readonly carregado: boolean
  readonly recarregar: () => void
  readonly aoIrParaPainel: () => void
  readonly aoTentarDeNovo: (plano: PlanoPago) => void
}

const INTERVALO_MS = 10_000
const LIMITE_MS = 10 * 60_000

function Cartao({ selo, tom, titulo, children }: { readonly selo: ReactNode; readonly tom: 'ok' | 'analise' | 'erro' | 'neutro'; readonly titulo: string; readonly children: ReactNode }) {
  const cores = { ok: 'bg-lightsuccess text-successtext', analise: 'bg-lightwarning text-warningtext', erro: 'bg-lighterror text-errortext', neutro: 'bg-surfacerow text-muted-foreground' }
  return (
    <div className="min-h-dvh bg-background px-4 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto flex max-w-[560px] flex-col gap-4 rounded-2xl bg-card p-7 sm:p-10">
        <Logo tamanho={24} />
        <span className={cn('grid size-12 place-content-center rounded-full [&_svg]:size-6', cores[tom])} aria-hidden="true">
          {selo}
        </span>
        <h1 className="text-3xl font-bold">{titulo}</h1>
        {children}
      </div>
    </div>
  )
}

/** A volta do Mercado Pago (spec estilo-spora, US-1.9). O plano só muda com a confirmação do servidor. */
export function TelaVoltaPagamento({ assinatura, carregado, recarregar, aoIrParaPainel, aoTentarDeNovo }: TelaVoltaPagamentoProps) {
  const [inicio, setInicio] = useState(() => Date.now())
  const [esgotou, setEsgotou] = useState(false)
  const resposta = respostaDaVolta(assinatura)
  const semInternet = globalThis.navigator?.onLine === false

  // CA-167: enquanto está em análise, confere de novo a cada 10 s, por até 10 minutos.
  useEffect(() => {
    if (!carregado || resposta !== 'analise' || esgotou || semInternet) return
    const relogio = globalThis.setTimeout(() => {
      if (Date.now() - inicio >= LIMITE_MS) setEsgotou(true)
      else recarregar()
    }, INTERVALO_MS)
    return () => globalThis.clearTimeout(relogio)
  }, [carregado, resposta, esgotou, semInternet, inicio, recarregar, assinatura])

  const conferirDeNovo = () => {
    setInicio(Date.now())
    setEsgotou(false)
    recarregar()
  }

  if (semInternet) {
    return (
      <Cartao selo={<WifiOff />} tom="neutro" titulo="Não consegui conferir">
        <p className="text-sm text-muted-foreground">Parece que você está sem internet. Assim que voltar, confira de novo.</p>
        <Button size="lg" block onClick={conferirDeNovo}>
          Conferir de novo
        </Button>
      </Cartao>
    )
  }

  if (!carregado) {
    return (
      <Cartao selo={<Clock />} tom="neutro" titulo="Conferindo o pagamento…">
        <p role="status" className="text-sm text-muted-foreground">
          Um instante.
        </p>
      </Cartao>
    )
  }

  if (resposta === 'ativa') {
    return (
      <Cartao selo={<Check />} tom="ok" titulo="Assinatura ativa">
        <p className="text-sm text-muted-foreground">Seu plano agora é o {planoPorId(assinatura.plano)?.nome}. Já dá para usar tudo o que ele inclui.</p>
        <Button size="lg" block onClick={aoIrParaPainel}>
          Ir para o painel
        </Button>
      </Cartao>
    )
  }

  if (resposta === 'analise') {
    return (
      <Cartao selo={<Clock />} tom="analise" titulo="Pagamento em análise">
        <p className="text-sm text-muted-foreground">Alguns pagamentos levam uns minutos para confirmar. Até lá, vale o Free. Esta tela confere sozinha.</p>
        {esgotou ? (
          <Button size="lg" block onClick={conferirDeNovo}>
            Conferir de novo
          </Button>
        ) : null}
        <Button variant="outline" size="lg" block onClick={aoIrParaPainel}>
          Ir para o painel
        </Button>
      </Cartao>
    )
  }

  return (
    <Cartao selo={<X />} tom="erro" titulo="Pagamento não concluído">
      <p className="text-sm text-muted-foreground">Nada foi cobrado. Você pode tentar de novo.</p>
      <Button size="lg" block onClick={() => aoTentarDeNovo(ehPlanoPago(assinatura.planoPedido) ? assinatura.planoPedido : 'solo')}>
        Tentar de novo
      </Button>
      <Button variant="outline" size="lg" block onClick={aoIrParaPainel}>
        Ir para o painel
      </Button>
    </Cartao>
  )
}
