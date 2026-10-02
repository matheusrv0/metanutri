import type { ReactNode } from 'react'
import { cn } from '@ds/lib/cn.ts'

/*
 * Os ícones da marca (spec checkout-proprio, D-73): o traço arredondado de 1,8 e um ponto,
 * como a linha com pontos da logo. Desenhados no protótipo "Checkout MetaNutri" v2. Servem
 * ao checkout, a Conta e plano e à volta do pagamento, onde ícone de biblioteca não entra
 * (CA-383); o resto do app continua no Lucide, pelo `Icon`.
 *
 * A cor é a do texto (`currentColor`). `destaque` pinta o ponto principal de laranja, como
 * a última bolinha da logo: é grafismo, nunca texto. O tamanho vem da classe (`size-5`
 * por padrão). Sem `titulo`, o ícone é decorativo e fica escondido do leitor de tela.
 * O `data-icone` marca o ícone como da marca: os testes de tela contam os que não têm.
 */
export type NomeIconeMarca = 'cadeado' | 'cartao' | 'calendario' | 'check' | 'alerta' | 'fechar' | 'recibo' | 'seta' | 'estrela'

export const NOMES_ICONE_MARCA: readonly NomeIconeMarca[] = ['cadeado', 'cartao', 'calendario', 'check', 'alerta', 'fechar', 'recibo', 'seta', 'estrela']

const TRACO = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** O desenho de cada ícone. `ponto` é a classe do ponto principal, o que fica laranja no destaque. */
function desenho(nome: NomeIconeMarca, ponto: string): ReactNode {
  switch (nome) {
    case 'cadeado':
      return (
        <>
          <g {...TRACO}>
            <rect x="4.5" y="10.5" width="15" height="10" rx="3" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
          </g>
          <circle cx="12" cy="15.5" r="1.7" className={ponto} />
        </>
      )
    case 'cartao':
      return (
        <>
          <g {...TRACO}>
            <rect x="3" y="5.5" width="18" height="13" rx="3" />
            <path d="M3 10h18" />
          </g>
          <circle cx="7.5" cy="14.8" r="1.4" className={ponto} />
          <circle cx="11" cy="14.8" r="1" className="fill-current" opacity={0.55} />
        </>
      )
    case 'calendario':
      return (
        <>
          <g {...TRACO}>
            <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
            <path d="M8 3v4M16 3v4M3.5 10h17" />
          </g>
          <circle cx="15.5" cy="15" r="1.8" className={ponto} />
        </>
      )
    case 'check':
      return (
        <>
          <path d="M4 12.5l5 5L20 6.5" {...TRACO} opacity={0.5} />
          <circle cx="4" cy="12.5" r="1.4" className="fill-current" opacity={0.55} />
          <circle cx="9" cy="17.5" r="1.8" className="fill-current" opacity={0.8} />
          <circle cx="20" cy="6.5" r="2.4" className={ponto} />
        </>
      )
    case 'alerta':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" {...TRACO} />
          <path d="M12 7.5v5" {...TRACO} />
          <circle cx="12" cy="16.2" r="1.4" className={ponto} />
        </>
      )
    case 'fechar':
      return <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...TRACO} />
    case 'recibo':
      return (
        <>
          <g {...TRACO}>
            <rect x="3" y="5.5" width="18" height="13" rx="3" />
            <path d="M3.5 7l8.5 6 8.5-6" />
          </g>
          <circle cx="18.5" cy="16" r="1.5" className={ponto} />
        </>
      )
    case 'seta':
      return (
        <>
          <path d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5" {...TRACO} />
          <circle cx="5" cy="12" r="1.6" className={ponto} />
        </>
      )
    case 'estrela':
      return (
        <>
          <circle cx="6" cy="16" r="1.6" className="fill-current" opacity={0.5} />
          <circle cx="11" cy="12" r="2.2" className="fill-current" opacity={0.75} />
          <circle cx="17.5" cy="7" r="3.2" className={ponto} />
        </>
      )
  }
}

interface IconeMarcaProps {
  readonly nome: NomeIconeMarca
  /** Nome para o leitor de tela. Sem ele, o ícone é decorativo. */
  readonly titulo?: string | undefined
  /** Pinta o ponto principal de laranja, como a logo. */
  readonly destaque?: boolean | undefined
  /** Tamanho e cor: `size-4`, `text-muted-foreground`. */
  readonly className?: string | undefined
}

export function IconeMarca({ nome, titulo, destaque = false, className }: IconeMarcaProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      data-icone={nome}
      focusable="false"
      aria-hidden={titulo ? undefined : true}
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      className={cn('size-5 shrink-0', className)}
    >
      {desenho(nome, destaque ? 'fill-laranja' : 'fill-current')}
    </svg>
  )
}
