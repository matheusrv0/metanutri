import { Check } from 'lucide-react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Os passos de um fluxo curto (importar planilha: Arquivo, Colunas, Prévia). O mesmo desenho das etapas do plano
 * (EtapasDoCaso), sem conhecer o domínio: o número no círculo, o atual em destaque e marcado com
 * `aria-current="step"`, o feito com o visto. Volta-se a um passo já alcançado pelo botão dele; o que ainda não foi
 * alcançado é só texto. 44 px de toque no celular e no tablet (spec ajustes-mobile, D-802).
 */
interface PassosProps<T extends string> {
  /** O nome da navegação para o leitor de tela ("Passos da importação"). */
  readonly rotulo: string
  readonly passos: readonly { readonly valor: T; readonly rotulo: string }[]
  /** O passo em que a pessoa está; `null` quando o fluxo terminou (todos feitos, nenhum atual). */
  readonly atual: T | null
  /** Os passos a que já dá para ir, além dos anteriores ao atual (voltar e avançar de novo sem refazer). */
  readonly alcancados?: readonly T[] | undefined
  /** Alcançados, mas que agora não abrem (falta o que o passo pede): aparecem desligados. */
  readonly bloqueados?: readonly T[] | undefined
  readonly aoEscolher: (valor: T) => void
  readonly className?: string | undefined
}

export function Passos<T extends string>({ rotulo, passos, atual, alcancados = [], bloqueados = [], aoEscolher, className }: PassosProps<T>) {
  const posicaoAtual = atual === null ? passos.length : passos.findIndex((p) => p.valor === atual)
  return (
    <nav aria-label={rotulo} className={cn('rounded-lg border border-border bg-card p-1.5 shadow-card', className)}>
      <ol className="grid auto-cols-fr grid-flow-col">
        {passos.map((passo, posicao) => {
          const ehAtual = posicao === posicaoAtual
          const feito = posicao < posicaoAtual
          const alcancavel = !ehAtual && (feito || alcancados.includes(passo.valor))
          const bloqueado = alcancavel && bloqueados.includes(passo.valor)
          const conteudo = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  'numeros flex size-7 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                  ehAtual ? 'border-transparent bg-surfaceinverse text-surfaceaccent' : feito ? 'border-primary/30 bg-lightprimary text-primary' : 'border-borderdefault bg-card text-muted-foreground',
                )}
              >
                {feito ? <Check className="size-3.5" strokeWidth={2.5} /> : posicao + 1}
              </span>
              <span className={cn('min-w-0 text-xs leading-tight font-semibold sm:text-sm', ehAtual || alcancavel ? 'text-heading' : 'text-muted-foreground')}>
                <span className="sr-only">{`Passo ${posicao + 1}${feito ? ', feito' : ''}:`}</span> {passo.rotulo}
              </span>
            </>
          )
          const caixa = 'flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-md px-2 py-1.5 text-center sm:min-h-10 sm:flex-row sm:justify-start sm:gap-2.5 sm:px-3 sm:text-left sm:pointer-coarse:min-h-11'
          return (
            <li key={passo.valor} className="flex">
              {alcancavel ? (
                <button
                  type="button"
                  disabled={bloqueado}
                  onClick={() => aoEscolher(passo.valor)}
                  className={cn(
                    caixa,
                    'transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:-outline-offset-2 active:scale-[0.98]',
                    'disabled:pointer-events-none disabled:opacity-50',
                  )}
                >
                  {conteudo}
                </button>
              ) : (
                <span aria-current={ehAtual ? 'step' : undefined} className={cn(caixa, ehAtual && 'bg-lightprimary')}>
                  {conteudo}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
