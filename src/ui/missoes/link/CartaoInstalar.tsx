import { useId } from 'react'
import { Button } from '@ds/componentes/forms/button.tsx'
import { IconeMeuPlano } from './IconeMeuPlano.tsx'

/** O cartão Instalar em Hoje (D-1219, CA-2232): o ícone, o que ele faz, "Instalar" e "Agora não". */
export function CartaoInstalar({ aoInstalar, aoAgoraNao }: { readonly aoInstalar: () => void; readonly aoAgoraNao: () => void }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-x-3.5 gap-y-3 rounded-2xl border border-border bg-card p-4">
      <IconeMeuPlano className="size-13" />
      <div className="min-w-0">
        <h2 id={id} className="text-base font-bold text-heading">
          Instalar o Meu plano
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">Um ícone na tela inicial abre o seu plano.</p>
      </div>
      <div className="col-span-2 flex flex-wrap gap-2">
        <Button size="lg" onClick={aoInstalar} className="bg-linkacao text-linkacaotexto hover:bg-linkacao hover:brightness-110">
          Instalar
        </Button>
        <Button size="lg" variant="ghost" onClick={aoAgoraNao} className="text-heading">
          Agora não
        </Button>
      </div>
    </section>
  )
}
