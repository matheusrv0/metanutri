import { ENDERECO_DO_APP } from './enderecos.ts'

/** CA-431 e CA-1420: dentro de uma moldura, nada do app aparece; só o caminho para abrir o app direto. */
export function AvisoMoldura() {
  return (
    <main className="grid min-h-dvh place-content-center justify-items-center gap-2 bg-background px-4 text-center">
      <p className="text-base text-foreground">Abra o MetaNutri direto no navegador.</p>
      <a href={ENDERECO_DO_APP} target="_top" className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4">
        {new URL(ENDERECO_DO_APP).host}
      </a>
    </main>
  )
}
