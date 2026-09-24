import type { LucideIcon } from 'lucide-react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Ícone do sistema. Lucide é o único conjunto; o que este componente acrescenta
 * são as regras do design system: traço 1,75, três tamanhos (16 em linha, 18 no
 * menu, 20 em cabeçalho) e a pastilha redonda em que o ícone costuma sentar.
 *
 * Diferença em relação ao export: lá o ícone chegava pelo nome em kebab-case
 * ("layout-dashboard") porque a ferramenta carregava o Lucide de CDN. Aqui o
 * componente entra direto, que é como o resto do app já importa — e é o que
 * mantém o pacote pequeno, porque o app roda offline.
 */
export type TamanhoIcone = 'linha' | 'menu' | 'cabecalho'
export type PastilhaIcone = 'nenhuma' | 'cinza' | 'forte' | 'acento'

const PX: Record<TamanhoIcone, number> = { linha: 16, menu: 18, cabecalho: 20 }

const PASTILHA: Record<PastilhaIcone, string> = {
  nenhuma: '',
  cinza: 'bg-muted text-textstrong',
  forte: 'bg-surfaceinverse text-surfaceaccent',
  acento: 'bg-surfaceaccent text-textonaccent',
}

export interface IconProps {
  /** O componente do Lucide, importado nominalmente: `import { Flame } from 'lucide-react'`. */
  glifo: LucideIcon
  tamanho?: TamanhoIcone
  /** Fundo redondo atrás do ícone. */
  pastilha?: PastilhaIcone
  /** Rótulo para leitor de tela. Sem ele o ícone é decorativo e fica escondido. */
  titulo?: string
  className?: string
}

export function Icon({ glifo: Glifo, tamanho = 'linha', pastilha = 'nenhuma', titulo, className }: IconProps) {
  const px = PX[tamanho]
  const svg = (
    <Glifo
      size={px}
      strokeWidth={1.75}
      aria-hidden={titulo ? undefined : 'true'}
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      className={pastilha === 'nenhuma' ? className : undefined}
    />
  )

  if (pastilha === 'nenhuma') return svg

  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center rounded-full', PASTILHA[pastilha], tamanho === 'cabecalho' ? 'size-9' : 'size-8', className)}>
      {svg}
    </span>
  )
}
