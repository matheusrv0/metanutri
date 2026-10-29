import { cn } from '@ds/lib/cn.ts'

/*
 * Barras verticais de uma série só (a receita por mês do painel do dono). A cor é a
 * da ação, `bg-primary`: a barra em destaque cheia, as outras mais claras. Laranja
 * nunca, porque isto é painel de dado. Passar o mouse ou chegar pelo teclado numa
 * barra mostra a dica; só a barra em destaque tem o valor escrito em cima. O leitor
 * de tela lê a dica de cada barra, que é o nome do item.
 */
export interface BarraDoGrafico {
  readonly chave: string
  /** Embaixo da barra: "set". */
  readonly rotulo: string
  readonly valor: number
  /** Nome da barra e texto da dica: "set · R$ 1.026,45". */
  readonly dica: string
  readonly destaque?: boolean | undefined
  /** Escrito em cima da barra em destaque. */
  readonly valorEscrito?: string | undefined
}

interface GraficoBarrasProps {
  readonly descricao: string
  readonly barras: readonly BarraDoGrafico[]
  /** Marcas do eixo, da menor para a maior. A última é o topo do gráfico. */
  readonly marcas: readonly { readonly valor: number; readonly rotulo: string }[]
  readonly className?: string | undefined
}

/**
 * Onde o texto de cima da barra se prende (spec ajustes-mobile, M-015): a primeira barra pela esquerda, a última pela
 * direita, as do meio pelo centro. Centrado na barra da ponta, o valor passava da borda do cartão e era cortado.
 */
const ANCORA = {
  inicio: 'left-0 text-left',
  meio: 'left-1/2 -translate-x-1/2 text-center',
  fim: 'right-0 text-right',
} as const

const ancoraDa = (posicao: number, total: number): keyof typeof ANCORA => {
  if (total > 1 && posicao === total - 1) return 'fim'
  if (total > 1 && posicao === 0) return 'inicio'
  return 'meio'
}

export function GraficoBarras({ descricao, barras, marcas, className }: GraficoBarrasProps) {
  const topo = Math.max(marcas.at(-1)?.valor ?? 0, ...barras.map((b) => b.valor), 1)
  const altura = (valor: number) => `${Math.max(0, Math.min(100, (valor / topo) * 100))}%`
  // A coluna do eixo tem a largura da marca mais longa ("60.000.000"), não 48 px fixos: as marcas são absolutas e não
  // a alargariam sozinhas. A marca longa entra só como conteúdo do pseudo-elemento, invisível e sem altura.
  const marcaMaisLonga = marcas.reduce((maior, m) => (m.rotulo.length > maior.length ? m.rotulo : maior), '')

  return (
    <div className={cn('grid grid-cols-[auto_minmax(0,1fr)] gap-x-3', className)}>
      <div
        aria-hidden="true"
        data-marca-mais-longa={marcaMaisLonga}
        className="numeros relative h-48 min-w-12 text-2xs after:invisible after:block after:h-0 after:overflow-hidden after:content-[attr(data-marca-mais-longa)]"
      >
        {marcas.map((m) => (
          <span key={m.valor} className="numeros absolute right-0 translate-y-1/2 text-2xs text-muted-foreground" style={{ bottom: altura(m.valor) }}>
            {m.rotulo}
          </span>
        ))}
      </div>

      <div className="relative h-48">
        {marcas.map((m) => (
          <span
            key={m.valor}
            aria-hidden="true"
            className={cn('absolute inset-x-0 h-px', m.valor === 0 ? 'bg-borderdefault' : 'bg-border')}
            style={{ bottom: altura(m.valor) }}
          />
        ))}
        <ul aria-label={descricao} className="absolute inset-0 flex items-end gap-2 px-1 sm:gap-3.5">
          {barras.map((b, i) => {
            const ancora = ANCORA[ancoraDa(i, barras.length)]
            return (
              <li
                key={b.chave}
                tabIndex={0}
                aria-label={b.dica}
                className="group relative flex h-full flex-1 items-end justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {/* O texto de cima se prende à barra (não ao item, que no computador é mais largo que ela). */}
                <span className="relative block w-full max-w-14" style={{ height: altura(b.valor) }}>
                  <span className={cn('block size-full rounded-t-sm transition-[filter] group-hover:brightness-110', b.destaque ? 'bg-primary' : 'bg-primary/35')} />
                  {b.destaque && b.valorEscrito ? (
                    // Fundo do cartão: quando o valor passa por cima da barra vizinha, continua legível.
                    <span
                      aria-hidden="true"
                      className={cn(
                        'numeros absolute bottom-full mb-1.5 whitespace-nowrap rounded-xs bg-card px-1 text-xs font-bold text-heading transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0',
                        ancora,
                      )}
                    >
                      {b.valorEscrito}
                    </span>
                  ) : null}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'numeros pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg bg-heading px-2.5 py-1.5 text-xs font-semibold text-card opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100',
                      ancora,
                    )}
                  >
                    {b.dica}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <div aria-hidden="true" />
      <div aria-hidden="true" className="flex gap-2 px-1 pt-2 sm:gap-3.5">
        {barras.map((b) => (
          <span key={b.chave} className="flex-1 text-center text-xs text-muted-foreground">
            {b.rotulo}
          </span>
        ))}
      </div>
    </div>
  )
}
