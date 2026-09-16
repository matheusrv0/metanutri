import { ClipboardList, Copy, EllipsisVertical, Pencil, Trash } from 'lucide-react'
import type { ResumoCaso } from '@/domain/persistencia.ts'
import { Button } from '../componentes/button.tsx'
import { Card } from '../componentes/card.tsx'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../componentes/dropdown-menu.tsx'
import { formatarAlteracao } from './formatarAlteracao.ts'

interface CartaoCasoProps {
  readonly caso: ResumoCaso
  readonly aoAbrir: () => void
  readonly aoRenomear: () => void
  readonly aoDuplicar: () => void
  readonly aoExcluir: () => void
}

export function CartaoCaso({ caso, aoAbrir, aoRenomear, aoDuplicar, aoExcluir }: CartaoCasoProps) {
  const nome = caso.nome.trim() || 'Caso sem nome'

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xs border border-primary/25 bg-lightprimary text-primary">
          <ClipboardList className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="card-title truncate text-base" title={nome}>
            {nome}
          </h2>
          <p className="text-xs text-muted-foreground">{formatarAlteracao(caso.atualizadoEm)}</p>
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
        Abrir caso
      </Button>
    </Card>
  )
}
