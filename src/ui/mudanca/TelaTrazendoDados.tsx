import { Button } from '@ds/componentes/forms/button.tsx'

interface TelaTrazendoDadosProps {
  readonly estado: 'trazendo' | 'sem-espaco'
  /** "Continuar" da tela sem espaço: a conta abre com a nuvem (CB-501, DP-SA-41). */
  readonly aoContinuar: () => void
}

/**
 * O app recebendo os dados do endereço antigo (spec separacao-site-app, D-512 e D-526): "Trazendo seus dados…" no lugar
 * da área de trabalho, até a mudança terminar; sem espaço no navegador, a tela diz e "Continuar" segue com a nuvem.
 */
export function TelaTrazendoDados({ estado, aoContinuar }: TelaTrazendoDadosProps) {
  if (estado === 'trazendo') {
    return (
      <div role="status" className="grid min-h-dvh place-content-center bg-background text-sm text-muted-foreground">
        Trazendo seus dados…
      </div>
    )
  }
  return (
    <main className="grid min-h-dvh place-content-center bg-background px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-card p-6 sm:p-10">
        <h1 className="text-3xl font-bold leading-tight">Sem espaço neste navegador</h1>
        <p className="text-sm text-muted-foreground">Libere espaço e abra o MetaNutri de novo. Nada foi perdido.</p>
        <Button size="lg" block onClick={aoContinuar}>
          Continuar
        </Button>
      </div>
    </main>
  )
}
