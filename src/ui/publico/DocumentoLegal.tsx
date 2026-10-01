import type { ReactNode } from 'react'
import { CONTATO_EMAIL, DATA_TERMOS, RESPONSAVEL } from '@/domain/legal.ts'

/** Moldura de leitura dos documentos legais. Sem responsável e contato, o texto não vai ao ar (D-46). */
export function DocumentoLegal({ titulo, children }: { readonly titulo: string; readonly children: ReactNode }) {
  const pronto = RESPONSAVEL !== null && CONTATO_EMAIL !== null
  return (
    <article className="mx-auto max-w-[72ch] px-4 py-12 text-sm leading-relaxed text-foreground sm:px-8 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="text-4xl font-bold">{titulo}</h1>
      {pronto ? (
        <>
          <p className="text-muted-foreground">Versão de {DATA_TERMOS}.</p>
          {children}
        </>
      ) : (
        <p className="text-muted-foreground">Este texto está sendo finalizado e entra no ar em breve.</p>
      )}
    </article>
  )
}
