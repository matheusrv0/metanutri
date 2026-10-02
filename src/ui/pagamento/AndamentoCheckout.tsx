import { Fragment } from 'react'
import { cn } from '@/lib/utils'

const PASSOS = [
  { chave: 'conta', rotulo: 'Conta', ponto: 'size-2.5' },
  { chave: 'plano', rotulo: 'Plano', ponto: 'size-3.5' },
  { chave: 'pagamento', rotulo: 'Pagamento', ponto: 'size-5' },
  { chave: 'pronto', rotulo: 'Pronto', ponto: 'size-6' },
] as const

/**
 * O andamento do checkout com os pontos da logo, que crescem a cada passo (protótipo v2,
 * CA-383), no lugar de "✓ Conta · 2 Plano". O passo de agora ganha um halo; o "Pronto"
 * fica laranja quando a assinatura é aprovada, como a última bolinha da logo.
 */
export function AndamentoCheckout({ atual }: { readonly atual: 'pagamento' | 'pronto' }) {
  const indiceAtual = PASSOS.findIndex((passo) => passo.chave === atual)
  return (
    <ol aria-label="Andamento" className="flex items-end">
      {PASSOS.map((passo, i) => {
        const feito = i < indiceAtual
        const agora = i === indiceAtual
        const ultimo = passo.chave === 'pronto'
        return (
          <Fragment key={passo.chave}>
            {i > 0 ? <li aria-hidden="true" className={cn('mb-7 h-0.5 max-w-16 flex-1', i <= indiceAtual ? 'bg-primary/50' : 'bg-borderdefault')} /> : null}
            <li aria-current={agora ? 'step' : undefined} className="flex min-w-16 flex-col items-center gap-2 sm:min-w-22">
              <span
                aria-hidden="true"
                className={cn(
                  'block rounded-full',
                  passo.ponto,
                  feito || agora ? (ultimo ? 'bg-laranja' : 'bg-primary') : 'ring-2 ring-inset ring-borderdefault',
                  feito && i === 0 && 'opacity-45',
                  feito && i === 1 && 'opacity-70',
                  agora && (ultimo ? 'ring-4 ring-laranja/20' : 'ring-4 ring-primary/15'),
                )}
              />
              <span className={cn('text-xs font-semibold', agora ? 'text-heading' : 'text-muted-foreground')}>{passo.rotulo}</span>
              {feito ? <span className="sr-only">concluído</span> : null}
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}
