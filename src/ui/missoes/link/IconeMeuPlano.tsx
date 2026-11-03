import { cn } from '@/lib/utils'
import { ICONES_DO_MEU_PLANO } from './manifesto.ts'

/** O ícone do "Meu plano" (o mesmo da tela inicial, D-1213), para o cartão de entrar e as folhas de instalar. */
export function IconeMeuPlano({ className, redondo = false }: { readonly className?: string; readonly redondo?: boolean }) {
  return <img src={ICONES_DO_MEU_PLANO.grande} alt="" aria-hidden="true" className={cn('block ring-1 ring-border', redondo ? 'rounded-full' : 'rounded-xl', className)} />
}
