import { ClipboardList, Ruler } from 'lucide-react'
import type { ModoPlano } from '@/domain/tipos.ts'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@ds/componentes/overlay/dropdown-menu.tsx'

interface EscolherModoProps {
  readonly gatilho: React.ReactNode
  readonly aoEscolher: (modo: ModoPlano) => void
}

const OPCOES = [
  {
    modo: 'rapido' as const,
    icone: ClipboardList,
    titulo: 'Prescrição rápida',
    descricao: 'Só nome, sexo, idade e a meta de kcal. Sem medidas.',
  },
  {
    modo: 'completo' as const,
    icone: Ruler,
    titulo: 'Atendimento completo',
    descricao: 'Com antropometria e gasto energético calculado.',
  },
]

/** Todo plano começa aqui: a escolha do modo é feita uma vez e vale para o caso inteiro. */
export function EscolherModo({ gatilho, aoEscolher }: EscolherModoProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{gatilho}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[19rem]">
        {OPCOES.map(({ modo, icone: Icone, titulo, descricao }) => (
          <DropdownMenuItem key={modo} onSelect={() => aoEscolher(modo)} className="items-start gap-3 py-2.5">
            <Icone className="mt-0.5" aria-hidden="true" />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{titulo}</span>
              <span className="text-xs text-muted-foreground">{descricao}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
