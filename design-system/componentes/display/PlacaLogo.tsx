import { cn } from '@ds/lib/cn.ts'

/*
 * A placa da logo da nutricionista (spec marca-no-link, D-957). Branca nos dois temas: uma logo de letra escura não
 * some no celular escuro, e um JPG de fundo branco não vira um retângulo solto. No claro, um fio por dentro separa a
 * placa da mesa; no escuro, o branco já se separa sozinho.
 *
 *   link     o topo do link do paciente: a logo em até 40 × 200 px, na proporção dela (CA-1972)
 *   grande   a parte "Logo" de "Sua marca": uma faixa de 96 px com a logo em até 56 × 240 px
 *
 * A logo nunca estica: os dois lados são limitados e o outro fica automático (`object-contain`).
 */
interface PlacaLogoProps {
  readonly src: string
  readonly alt: string
  readonly tamanho?: 'link' | 'grande'
  /** A imagem não abriu (CA-1973): quem usa volta à logo do MetaNutri. */
  readonly aoFalhar?: () => void
  readonly className?: string
}

export function PlacaLogo({ src, alt, tamanho = 'link', aoFalhar, className }: PlacaLogoProps) {
  const grande = tamanho === 'grande'
  return (
    <span
      className={cn(
        'bg-linkplaca ring-1 ring-inset ring-linkplacafio',
        grande ? 'flex h-24 w-full items-center justify-center rounded-lg px-4' : 'inline-flex items-center rounded-md px-3 py-2',
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        onError={aoFalhar}
        draggable={false}
        className={cn('block h-auto w-auto object-contain', grande ? 'max-h-14 max-w-60' : 'max-h-10 max-w-50')}
      />
    </span>
  )
}
