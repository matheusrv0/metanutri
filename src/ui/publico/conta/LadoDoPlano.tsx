import { Check } from 'lucide-react'
import { planoPorId, valorNoCiclo, type Ciclo, type IdPlano } from '@/domain/conta.ts'

interface LadoDoPlanoProps {
  readonly plano: IdPlano | null
  readonly ciclo: Ciclo
  readonly aoTrocarPlano?: (() => void) | undefined
}

const reais = (valor: number) =>
  valor.toLocaleString('pt-BR', { minimumFractionDigits: Number.isInteger(valor) ? 0 : 2, maximumFractionDigits: 2 })

/** O que a pessoa leva: o plano escolhido, ou o Free quando não escolheu nenhum. */
export function LadoDoPlano({ plano, ciclo, aoTrocarPlano }: LadoDoPlanoProps) {
  const escolhido = planoPorId(plano ?? 'free')
  if (!escolhido) return null
  const itens = [...escolhido.recursos, ...escolhido.inclui.slice(1)].slice(0, 5)
  const valor = valorNoCiclo(escolhido, ciclo)
  const anualDeVerdade = ciclo === 'anual' && escolhido.anual > 0

  return (
    <>
      <div className="rounded-3xl bg-card p-5">
        <p className="rotulo">{plano === null ? 'No Free você já tem' : 'Plano escolhido'}</p>
        <p className="mt-2 font-titulo text-xl font-bold text-heading">{escolhido.nome}</p>
        {escolhido.mensal > 0 ? (
          <p className="mt-2 font-titulo text-3xl font-bold text-heading">
            R$ {reais(valor)} <span className="font-sans text-sm font-semibold text-muted-foreground">{anualDeVerdade ? '/ano' : '/mês'}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm font-semibold text-heading">Grátis</p>
        )}
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {itens.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      {aoTrocarPlano ? (
        <button type="button" onClick={aoTrocarPlano} className="w-fit rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Trocar de plano
        </button>
      ) : (
        <p className="text-xs text-muted-foreground">Seus planos ficam salvos no aparelho e funcionam sem internet depois do primeiro acesso.</p>
      )}
    </>
  )
}
