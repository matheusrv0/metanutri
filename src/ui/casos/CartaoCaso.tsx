import { ClipboardList, Copy, EllipsisVertical, Pencil, Trash } from 'lucide-react'
import type { ResumoCaso } from '@/domain/persistencia.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card } from '@ds/componentes/display/card.tsx'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@ds/componentes/overlay/dropdown-menu.tsx'
import { formatarAlteracao } from './formatarAlteracao.ts'

interface CartaoCasoProps {
  readonly caso: ResumoCaso
  /** O nome do paciente do plano, quando há (M-007 da spec ajustes-mobile). */
  readonly paciente?: string | null | undefined
  readonly aoAbrir: () => void
  readonly aoRenomear: () => void
  readonly aoDuplicar: () => void
  readonly aoExcluir: () => void
}

export function CartaoCaso({ caso, paciente, aoAbrir, aoRenomear, aoDuplicar, aoExcluir }: CartaoCasoProps) {
  const nome = caso.nome.trim() || 'Plano sem nome'
  const detalhe = [paciente?.trim() || null, formatarAlteracao(caso.atualizadoEm)].filter(Boolean).join(' · ')

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-lightprimary text-primary">
          <ClipboardList className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          {/* M-007 (spec ajustes-mobile, D-801): até 2 linhas. Cortado numa, "Plano de reeducação al…" ficava igual em
              dez cartões; o paciente, no detalhe, separa os planos de mesmo nome. */}
          <h2 className="card-title line-clamp-2 break-words text-base" title={nome}>
            {nome}
          </h2>
          <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{detalhe}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="iconsm" aria-label={`Mais ações para ${nome}`}>
              <EllipsisVertical aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={aoRenomear}>
              <Pencil aria-hidden="true" />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={aoDuplicar}>
              <Copy aria-hidden="true" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={aoExcluir} className="text-errortext focus:bg-lighterror focus:text-errortext">
              <Trash aria-hidden="true" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Button variant="lightprimary" className="w-full" onClick={aoAbrir} aria-label={`Abrir ${nome}`}>
        Abrir plano
      </Button>
    </Card>
  )
}
