import { Info } from 'lucide-react'

/** Sem as chaves do Supabase (desenvolvimento), não há conta: o app abre no modo local (CA-150). */
export function AvisoSemServidor({ aoAbrirSistema }: { readonly aoAbrirSistema: () => void }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-surfacerow p-4 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
      <div>
        <p className="font-semibold text-heading">A conta na nuvem não está ligada neste MetaNutri.</p>
        <p className="mt-1 text-muted-foreground">Neste modo, tudo fica salvo neste navegador e não precisa de conta.</p>
        <button type="button" onClick={aoAbrirSistema} className="mt-2 rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Abrir o sistema
        </button>
      </div>
    </div>
  )
}
