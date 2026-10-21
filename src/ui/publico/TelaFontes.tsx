import { ExternalLink } from 'lucide-react'
import { FONTES_DA_BASE, NOME_DA_BASE, resumoDaBase } from '@/domain/baseMetanutri.ts'

/** Página pública que cita as fontes da Base MetaNutri, como manda a licença da TACO (CA-322). */
export function TelaFontes() {
  const resumo = resumoDaBase()
  return (
    <article className="mx-auto flex max-w-[72ch] flex-col gap-3 px-4 py-12 text-sm leading-relaxed text-foreground sm:px-8">
      <h1 className="text-4xl font-bold">Fontes da base</h1>
      <p className="text-base">
        {`A ${NOME_DA_BASE} reúne ${resumo.alimentos} alimentos, com os ${resumo.nutrientes} nutrientes da tabela brasileira (energia, macronutrientes, fibra, vitaminas e minerais) e as medidas caseiras de ${resumo.comMedidaCaseira} deles. Para ${resumo.comComplementoUsda}, traz também vitamina D, vitamina E, folato, vitamina B12 e selênio. O MetaNutri organiza e confere esses dados a partir destas fontes públicas.`}
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
      {/* D-324 (spec site-publico-profissional): as referências saíram do rodapé e ficam aqui, sem link novo. */}
      <section aria-labelledby="referencias-dos-calculos" className="border-t border-border pt-5">
        <h2 id="referencias-dos-calculos" className="text-base font-semibold text-heading">
          Referências dos cálculos
        </h2>
        <p className="mt-2">
          A adequação e a energia seguem as DRI do NASEM (2019 e 2023); a antropometria, as curvas da OMS (2006 e 2007) e os pontos de corte do SISVAN
          (2011); o ganho de peso na gestação, Kac (2021).
        </p>
      </section>
    </article>
  )
}
