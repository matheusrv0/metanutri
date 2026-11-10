import { Info } from 'lucide-react'
import { useId, useState } from 'react'
import type { Fonte } from '@/domain/fontesAntropometria.ts'
import { cn } from '@ds/lib/cn.ts'

interface CabecaDoBlocoProps {
  readonly nome: string
  /** O selo de evidência ("Evidência limitada"); `null` sem sugestão. */
  readonly evidencia: string | null
  /** As fontes inteiras e os avisos que o protótipo não mostra (CB-1453); vazio, sem "ⓘ". */
  readonly fontes?: readonly Fonte[]
  readonly avisos?: readonly string[]
}

/**
 * O cabeçalho de um bloco do "Ponto de partida" (spec antropometria-telas, D-1418, D-1419 e CB-1453): o nome, o selo de
 * evidência e o "ⓘ", que abre embaixo a citação completa das fontes e os avisos fixos do motor, como o "ⓘ" do
 * resultado. A tela fica com o texto do protótipo; a fonte inteira continua a um toque.
 */
export function CabecaDoBloco({ nome, evidencia, fontes = [], avisos = [] }: CabecaDoBlocoProps) {
  const id = useId()
  const [aberta, setAberta] = useState(false)
  const temAjuda = fontes.length > 0 || avisos.length > 0
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
        <h3 className="text-sm font-semibold text-muted-foreground">{nome}</h3>
        {temAjuda ? (
          <button
            type="button"
            aria-label={`Fonte: ${nome}`}
            aria-expanded={aberta}
            aria-controls={aberta ? `${id}-fonte` : undefined}
            onClick={() => setAberta((a) => !a)}
            className={cn(
              'inline-grid size-5.5 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'max-sm:-m-2.75 max-sm:size-11 sm:pointer-coarse:-m-2.75 sm:pointer-coarse:size-11',
              aberta && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
            )}
          >
            <Info className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
        {evidencia ? <span className="ml-auto text-xs text-muted-foreground">{evidencia}</span> : null}
      </div>
      {aberta ? (
        <div id={`${id}-fonte`} className="grid gap-1.5 rounded-xl bg-surfacerow px-3.5 py-3 text-sm text-foreground">
          {fontes.map((f) => (
            <p key={f.citacao}>{`Fonte: ${f.citacao}`}</p>
          ))}
          {avisos.length > 0 ? (
            <ul className="grid list-disc gap-1 pl-4 text-muted-foreground">
              {avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
