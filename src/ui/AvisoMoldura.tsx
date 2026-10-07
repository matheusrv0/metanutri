import { ENDERECO_DO_SITE } from './moldura.ts'

/** CA-431: dentro de uma moldura, nada do app aparece; só o caminho para abrir o site direto. */
export function AvisoMoldura() {
  return (
    <main className="grid min-h-dvh place-content-center justify-items-center gap-2 bg-background px-4 text-center">
      <p className="text-base text-foreground">Abra o MetaNutri direto no navegador.</p>
      <a href={ENDERECO_DO_SITE} target="_top" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">
        metanutri.com.br
      </a>
    </main>
  )
}
