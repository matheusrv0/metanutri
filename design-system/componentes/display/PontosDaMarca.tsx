import { cn } from '@ds/lib/cn.ts'

/*
 * Os quatro pontos da logo, do menor ao maior; o último é laranja, a meta cumprida
 * (spec checkout-proprio, D-73). Com `pulsando`, dizem "esperando" no lugar da roda do
 * Button, que é ícone de biblioteca (CA-383): o botão fica `disabled` e `aria-busy`, com
 * os pontos dentro. Pulsam só com movimento liberado (`motion-safe`), e o
 * prefers-reduced-motion do app ainda zera a duração de toda animação.
 */
const PONTOS = [
  { tamanho: 'size-1', cor: 'bg-current opacity-45', atraso: '' },
  { tamanho: 'size-1.5', cor: 'bg-current opacity-70', atraso: '[animation-delay:150ms]' },
  { tamanho: 'size-2', cor: 'bg-current', atraso: '[animation-delay:300ms]' },
  { tamanho: 'size-2.5', cor: 'bg-laranja', atraso: '[animation-delay:450ms]' },
] as const

interface PontosDaMarcaProps {
  readonly pulsando?: boolean | undefined
  readonly className?: string | undefined
}

export function PontosDaMarca({ pulsando = false, className }: PontosDaMarcaProps) {
  return (
    <span aria-hidden="true" data-pontos-da-marca="" className={cn('inline-flex shrink-0 items-center gap-1', className)}>
      {PONTOS.map((ponto) => (
        <span key={ponto.tamanho} className={cn('block rounded-full', ponto.tamanho, ponto.cor, pulsando && 'motion-safe:animate-pulse', pulsando && ponto.atraso)} />
      ))}
    </span>
  )
}
