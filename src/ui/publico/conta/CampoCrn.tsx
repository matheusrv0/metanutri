import { REGIOES_CRN } from '@/domain/situacao.ts'
import { Input } from '@ds/componentes/forms/input.tsx'

interface CampoCrnProps {
  readonly id: string
  readonly regiao: number | null
  readonly numero: string
  readonly aoMudar: (crn: { readonly regiao: number | null; readonly numero: string }) => void
  readonly invalido?: boolean | undefined
  readonly dica?: string | undefined
}

/** CRN em duas partes: a região (CRN-1 a CRN-11) e o número da inscrição (spec conta-e-verificacao, CA-263). */
export function CampoCrn({ id, regiao, numero, aoMudar, invalido = false, dica }: CampoCrnProps) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold leading-none text-heading">CRN</legend>
      <div className="grid grid-cols-[8.25rem_minmax(0,1fr)] gap-2.5">
        <select
          id={`${id}-regiao`}
          aria-label="Região do CRN"
          value={regiao ?? ''}
          aria-invalid={invalido}
          onChange={(e) => aoMudar({ regiao: e.target.value ? Number(e.target.value) : null, numero })}
          className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground aria-[invalid=true]:border-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Região</option>
          {REGIOES_CRN.map((r) => (
            <option key={r} value={r}>{`CRN-${r}`}</option>
          ))}
        </select>
        <Input
          id={`${id}-numero`}
          aria-label="Número do CRN"
          value={numero}
          aria-invalid={invalido}
          onChange={(e) => aoMudar({ regiao, numero: e.target.value })}
          placeholder="Número"
          spellCheck={false}
        />
      </div>
      {dica ? <p className="text-xs text-muted-foreground">{dica}</p> : null}
    </fieldset>
  )
}
