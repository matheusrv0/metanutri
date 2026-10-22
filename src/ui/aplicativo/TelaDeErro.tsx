import { RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Logo } from '@ds/componentes/display/Logo.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'

interface TelaDeErroProps {
  readonly aoRecarregar: () => Promise<void>
}

/**
 * Spec receitas-com-calculo, D-274b: o que aparece no lugar de uma tela que quebrou ao desenhar. Simples de propósito:
 * não depende de conta, de nuvem nem de dado, que podem ser a causa do erro.
 */
export function TelaDeErro({ aoRecarregar }: TelaDeErroProps) {
  const [recarregando, setRecarregando] = useState(false)
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex w-full max-w-md flex-col items-start gap-5 rounded-3xl bg-card p-6">
        <Logo tamanho={24} />
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-heading">Não foi possível abrir esta tela.</h1>
          <p className="text-sm text-muted-foreground">Seus dados continuam salvos. Recarregue a página para abrir a versão mais nova.</p>
        </div>
        <Button
          loading={recarregando}
          onClick={() => {
            setRecarregando(true)
            void aoRecarregar()
          }}
        >
          {recarregando ? null : <RefreshCw aria-hidden="true" />}
          Recarregar
        </Button>
      </div>
    </main>
  )
}
