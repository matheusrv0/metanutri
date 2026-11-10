import { FileText } from 'lucide-react'
import { diaLocal } from '@/domain/acompanhamento.ts'
import { dataCompleta } from '@/domain/formatarData.ts'
import { textoDoTamanho } from '@/domain/fotosDaAvaliacao.ts'
import type { ArquivoDaAvaliacao } from '@/domain/tipos.ts'
import { Button } from '@ds/componentes/forms/button.tsx'

interface ListaDeAnexosProps {
  readonly anexos: readonly ArquivoDaAvaliacao[]
  readonly aoAbrir: (anexo: ArquivoDaAvaliacao) => void
  readonly aoExcluir: (anexo: ArquivoDaAvaliacao) => void
}

/** O dia do envio no relógio de quem usa ("03/11/2026"); sem data que se leia, nada. */
const diaDoEnvio = (iso: string): string => {
  const data = new Date(iso)
  return Number.isNaN(data.getTime()) ? '' : dataCompleta(diaLocal(data))
}

/**
 * Os anexos da avaliação (D-1511 e D-1536): o nome neutro ("anexo-1.pdf"), o dia do envio e o tamanho, "Abrir" (numa aba
 * nova, para ler) e "Excluir".
 */
export function ListaDeAnexos({ anexos, aoAbrir, aoExcluir }: ListaDeAnexosProps) {
  if (anexos.length === 0) return null
  return (
    <ul aria-label="Anexos" className="flex flex-col">
      {anexos.map((anexo) => (
        <li key={anexo.id} className="flex min-h-11 flex-wrap items-center gap-x-2.5 gap-y-0.5 border-t border-border py-1 first:border-t-0">
          <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 break-words text-sm text-foreground">{anexo.nome}</span>
          <span className="numeros text-xs text-muted-foreground">{[diaDoEnvio(anexo.enviadoEm), textoDoTamanho(anexo.bytes)].filter(Boolean).join(' · ')}</span>
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
