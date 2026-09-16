import { Monitor, Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useTema, type PreferenciaTema } from '../tema/contextoTema.ts'

const OPCOES: readonly { readonly valor: PreferenciaTema; readonly rotulo: string; readonly icone: ReactNode }[] = [
  { valor: 'claro', rotulo: 'Claro', icone: <Sun aria-hidden="true" /> },
  { valor: 'escuro', rotulo: 'Escuro', icone: <Moon aria-hidden="true" /> },
  { valor: 'sistema', rotulo: 'Sistema', icone: <Monitor aria-hidden="true" /> },
]

/** Aparência em três opções sempre visíveis: claro, escuro ou igual ao aparelho. */
export function SeletorTema() {
  const { preferencia, definir } = useTema()

  return (
    <div role="radiogroup" aria-label="Aparência" className="grid grid-cols-3 border border-lombadafio">
      {OPCOES.map((o, i) => {
        const marcado = preferencia === o.valor
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={marcado}
            onClick={() => definir(o.valor)}
            className={cn(
              'flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium transition-colors [&_svg]:size-3.5 [&_svg]:shrink-0',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lombadatexto/60',
              i > 0 && 'border-l border-lombadafio',
              marcado ? 'bg-papel text-tinta' : 'text-lombadafraca hover:text-lombadatexto',
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
