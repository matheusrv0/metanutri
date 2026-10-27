import { Logo } from '@ds/componentes/display/Logo.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import type { EstadoDaMudanca } from './remetente.ts'

interface TelaContinuarProps {
  readonly estado: EstadoDaMudanca
  /** Abre o app em aba nova (CA-1430); de novo, se a aba foi bloqueada ou fechada. */
  readonly aoContinuar: () => void
}

/** Os textos do D-526, um por estado. */
const TEXTOS: Readonly<Record<EstadoDaMudanca, string>> = {
  parado: 'Clique em Continuar e entre na sua conta. Os dados deste navegador vão junto.',
  esperando: 'Entre na sua conta na aba que abriu. Deixe esta aba aberta.',
  bloqueada: 'O navegador bloqueou a aba nova. Permita janelas deste site e clique em Continuar.',
  pronto: 'Pronto. Pode fechar esta aba.',
}

/**
 * A tela "Continuar" do site (spec separacao-site-app, D-512, D-526 e D-527): o caminho para o app achou dado que só
 * existe neste endereço. Só o botão "Continuar", em qualquer estado até o fim: o navegador só abre a aba nova com um
 * clique, e a mudança para o app é obrigatória.
 */
export function TelaContinuar({ estado, aoContinuar }: TelaContinuarProps) {
  return (
    <main className="grid min-h-dvh place-content-center bg-background px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl bg-card p-6 sm:p-10">
        <div className="inline-flex min-h-11 w-fit items-center">
          <Logo tamanho={24} />
        </div>
        <h1 className="text-3xl font-bold leading-tight [overflow-wrap:anywhere]">O MetaNutri mudou para app.metanutri.com.br</h1>
        <p role="status" className="text-sm text-muted-foreground">
          {TEXTOS[estado]}
        </p>
        {estado === 'pronto' ? null : (
          <Button size="lg" block onClick={aoContinuar}>
            Continuar
          </Button>
        )}
      </div>
    </main>
  )
}
