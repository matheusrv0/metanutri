import { ExternalLink } from 'lucide-react'
import { FONTES_DA_BASE, NOME_DA_BASE, resumoDaBase } from '@/domain/baseMetanutri.ts'

/** Página pública que cita as fontes da Base MetaNutri, como manda a licença da TACO (CA-322). */
export function TelaFontes() {
  const resumo = resumoDaBase()
  return (
    <article className="mx-auto flex max-w-[72ch] flex-col gap-3 px-4 py-12 text-sm leading-relaxed text-foreground sm:px-8">
      <h1 className="text-4xl font-bold">Fontes da base</h1>
      <p className="text-base">
        {`A ${NOME_DA_BASE} reúne ${resumo.alimentos} alimentos, com os ${resumo.nutrientes} nutrientes que o MetaNutri confere (energia, macronutrientes, fibra, vitaminas e minerais), e as medidas caseiras de ${resumo.comMedidaCaseira} deles. O MetaNutri organiza e confere esses dados a partir destas fontes públicas.`}
      </p>
      <ul className="mt-4 flex flex-col">
        {FONTES_DA_BASE.map((fonte) => (
          <li key={fonte.assunto} className="grid gap-2 border-t border-border py-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
            <h2 className="text-base font-semibold text-heading">{fonte.assunto}</h2>
            <div className="flex flex-col gap-1.5">
              <p>{fonte.citacao}</p>
              <p className="text-muted-foreground">{fonte.uso}</p>
              <a
                href={fonte.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 w-fit items-center gap-1 rounded-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {fonte.rotuloLink}
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </article>
  )
}
