import { Monitor, Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useTema, type PreferenciaTema } from '../tema/contextoTema.ts'

const OPCOES: readonly { readonly valor: PreferenciaTema; readonly rotulo: string; readonly icone: ReactNode }[] = [
  { valor: 'claro', rotulo: 'Claro', icone: <Sun aria-hidden="true" /> },
  { valor: 'escuro', rotulo: 'Escuro', icone: <Moon aria-hidden="true" /> },
  { valor: 'sistema', rotulo: 'Sistema', icone: <Monitor aria-hidden="true" /> },
]

/**
 * Aparência em três opções sempre visíveis: claro, escuro ou igual ao aparelho. M-020 (spec ajustes-mobile): 44 px de
 * toque e letra de 12 px, na pílula do seletor segmentado do sistema (DESIGN.md, Shapes), no lugar do quadrado antigo.
 */
export function SeletorTema() {
  const { preferencia, definir } = useTema()

  return (
    <div role="radiogroup" aria-label="Aparência" className="grid grid-cols-3 gap-0.5 rounded-full border border-border p-0.5">
      {OPCOES.map((o) => {
        const marcado = preferencia === o.valor
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={marcado}
            onClick={() => definir(o.valor)}
            className={cn(
              'flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-full px-1 text-xs font-medium transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              marcado ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {o.icone}
            {o.rotulo}
          </button>
        )
      })}
    </div>
  )
}
