import { FileText } from 'lucide-react'
import { textoDoTamanho } from '@/domain/fotosDaAvaliacao.ts'
import type { ArquivoDaAvaliacao } from '@/domain/tipos.ts'
import { Button } from '@ds/componentes/forms/button.tsx'

interface ListaDeAnexosProps {
  readonly anexos: readonly ArquivoDaAvaliacao[]
  readonly aoAbrir: (anexo: ArquivoDaAvaliacao) => void
  readonly aoExcluir: (anexo: ArquivoDaAvaliacao) => void
}

/** Os anexos da avaliação (D-1511): o nome, o tamanho, "Abrir" (numa aba nova, para ler) e "Excluir". */
export function ListaDeAnexos({ anexos, aoAbrir, aoExcluir }: ListaDeAnexosProps) {
  if (anexos.length === 0) return null
  return (
    <ul aria-label="Anexos" className="flex flex-col">
      {anexos.map((anexo) => (
        <li key={anexo.id} className="flex min-h-11 flex-wrap items-center gap-x-2.5 gap-y-0.5 border-t border-border py-1 first:border-t-0">
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 break-words text-sm text-foreground">{anexo.nome}</span>
          <span className="numeros text-xs text-muted-foreground">{textoDoTamanho(anexo.bytes)}</span>
          <span className="flex items-center">
            <Button variant="link" size="sm" className="px-2" aria-label={`Abrir ${anexo.nome}`} onClick={() => aoAbrir(anexo)}>
              Abrir
            </Button>
            <Button variant="link" size="sm" className="px-2 text-muted-foreground" aria-label={`Excluir ${anexo.nome}`} onClick={() => aoExcluir(anexo)}>
              Excluir
            </Button>
          </span>
        </li>
      ))}
    </ul>
  )
}
