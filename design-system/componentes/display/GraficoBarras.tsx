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

export function GraficoBarras({ descricao, barras, marcas, className }: GraficoBarrasProps) {
  const topo = Math.max(marcas.at(-1)?.valor ?? 0, ...barras.map((b) => b.valor), 1)
  const altura = (valor: number) => `${Math.max(0, Math.min(100, (valor / topo) * 100))}%`

  return (
    <div className={cn('grid grid-cols-[auto_minmax(0,1fr)] gap-x-3', className)}>
      <div aria-hidden="true" className="relative h-48 w-12">
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
          {barras.map((b) => (
            <li
              key={b.chave}
              tabIndex={0}
              aria-label={b.dica}
              className="group relative flex h-full flex-1 items-end justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span
                className={cn('block w-full max-w-14 rounded-t-sm transition-[filter] group-hover:brightness-110', b.destaque ? 'bg-primary' : 'bg-primary/35')}
                style={{ height: altura(b.valor) }}
              />
              {b.destaque && b.valorEscrito ? (
                <span
                  aria-hidden="true"
                  className="numeros absolute inset-x-0 text-center text-xs font-bold text-heading transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0"
                  style={{ bottom: `calc(${altura(b.valor)} + 0.375rem)` }}
                >
                  {b.valorEscrito}
                </span>
              ) : null}
              <span
                aria-hidden="true"
                className="numeros pointer-events-none absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-heading px-2.5 py-1.5 text-xs font-semibold text-card opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                style={{ bottom: `calc(${altura(b.valor)} + 0.5rem)` }}
              >
                {b.dica}
              </span>
            </li>
          ))}
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
