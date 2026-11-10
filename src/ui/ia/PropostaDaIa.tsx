import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import type { ItemConferido, PropostaConferida } from '@/domain/iaConferencia.ts'
import { unidadeDo } from '@/domain/liquido.ts'
import { medidaNaLinha } from '@/domain/medidaDoItem.ts'
import { nomeParaPaciente } from '@/domain/nomeParaPaciente.ts'
import { nomeSemAlimento } from '@/domain/produtos.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { cn } from '@/lib/utils'

interface PropostaDaIaProps {
  readonly proposta: PropostaConferida
}

const numero = (v: number, casas = 0): string => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const pct = (v: number | null): string => (v === null ? '—' : `${numero(v)}%`)

/** "1 unidade · 50 g": a medida que o app mostra (a automática) e os gramas, ou só os gramas. */
function quantidade(i: ItemConferido): string {
  const unidade = unidadeDo(buscarAlimento(i.alimentoId))
  const medida = medidaNaLinha({ alimentoId: i.alimentoId, gramas: i.gramas })
  const gramas = `${numero(i.gramas)} ${unidade}`
  return medida ? `${medida.texto} · ${gramas}` : gramas
}

const nome = (alimentoId: number): string => buscarAlimento(alimentoId)?.descricao ?? nomeSemAlimento(alimentoId)
const curto = (i: ItemConferido): string => `${nomeParaPaciente(buscarAlimento(i.alimentoId))} ${numero(i.gramas)} ${unidadeDo(buscarAlimento(i.alimentoId))}`

/**
 * D-1307: a proposta já conferida. Os números são do app (D-1310); o que a conferência retirou, reduziu e marcou vem
 * com o motivo. As ações ficam no rodapé da gaveta.
 */
export function PropostaDaIa({ proposta }: PropostaDaIaProps) {
  const id = useId()
  const [retAberto, setRetAberto] = useState(true)
  const { totais } = proposta
  const nomeDaRefeicao = (r: number) => proposta.refeicoes[r]?.nome ?? `Refeição ${r + 1}`

  return (
    <div className="flex flex-col">
      <div role="group" aria-label="Totais calculados pelo app" className="flex flex-col gap-2.5 py-4">
        <p className="flex items-baseline gap-2.5">
          <b className="numeros text-2xl font-bold tracking-tight text-heading">{`${numero(totais.kcal)} kcal`}</b>
          {totais.pctDaMeta === null ? null : <span className="text-sm text-foreground">{`${numero(totais.pctDaMeta)}% da meta`}</span>}
        </p>
        <dl className="grid grid-cols-3 rounded-lg border border-bordersubtle">
          {[
            ['Proteína', `${numero(totais.proteinaG)} g${totais.proteinaGKg === null ? '' : ` · ${numero(totais.proteinaGKg, 1)} g/kg`}`],
            ['Carboidrato', pct(totais.carboidratoPct)],
            ['Gordura', pct(totais.gorduraPct)],
          ].map(([rotulo, valor], i) => (
            <div key={rotulo} className={cn('min-w-0 px-3 py-2', i > 0 && 'border-l border-bordersubtle')}>
              <dt className="text-xs text-muted-foreground">{rotulo}</dt>
              <dd className="numeros text-sm font-semibold text-heading">{valor}</dd>
            </div>
          ))}
        </dl>
        {proposta.marcasDoPlano.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {proposta.marcasDoPlano.map((m) => (
              <li key={m} className="text-xs font-medium text-warningtext">
                {m}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col">
        {proposta.refeicoes.map((r) => (
          <section key={r.refeicao} aria-labelledby={`${id}-r${r.refeicao}`} className="border-t border-bordersubtle py-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 id={`${id}-r${r.refeicao}`} className="text-sm font-bold text-heading">
                {r.nome}
                <span className="numeros ml-1.5 font-medium text-muted-foreground">{r.horario}</span>
              </h3>
              {r.principal.length > 0 ? <b className="numeros whitespace-nowrap text-sm font-semibold text-heading">{`${numero(r.kcal)} kcal`}</b> : null}
            </div>
            {r.principal.length === 0 ? (
              <p className="mt-1.5 text-sm text-muted-foreground">Sem itens sugeridos.</p>
            ) : (
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {r.principal.map((i, k) => (
                  <li key={`${i.alimentoId}-${k}`} className="flex items-baseline justify-between gap-3 py-0.5">
                    <span className="min-w-0 break-words text-sm text-foreground">
                      {nome(i.alimentoId)}
                      {i.marcas.map((m) => (
                        <em key={m} className="block text-xs not-italic text-infotext">
                          {m}
                        </em>
                      ))}
                    </span>
                    <span className="numeros shrink-0 text-right text-sm text-muted-foreground">{quantidade(i)}</span>
                  </li>
                ))}
              </ul>
            )}
            {r.opcao2.length > 0 ? (
              <p className="mt-1.5 text-sm text-muted-foreground">
                <b className="mr-1 font-semibold text-foreground">Opção 2</b>
                {r.opcao2.map(curto).join(' · ')}
              </p>
            ) : null}
          </section>
        ))}
      </div>

      {proposta.retirados.length > 0 ? (
        <section className="flex flex-col gap-2.5 border-t border-bordersubtle py-4">
          <button
            type="button"
            aria-expanded={retAberto}
            aria-controls={`${id}-ret`}
            onClick={() => setRetAberto(!retAberto)}
            className="flex min-h-11 w-full items-center gap-2 text-left text-sm font-bold text-heading sm:min-h-8"
          >
            Retirados pela conferência
            <span className="numeros inline-grid h-5 min-w-5 place-items-center rounded-full bg-surfacerow px-1.5 text-xs font-semibold text-foreground">{proposta.retirados.length}</span>
            <ChevronDown aria-hidden="true" className={cn('ml-auto size-4 text-muted-foreground transition-transform', retAberto && 'rotate-180')} />
          </button>
          {retAberto ? (
            <ul id={`${id}-ret`} className="flex flex-col gap-2.5">
              {proposta.retirados.map((x, k) => (
                <li key={`${x.alimentoId}-${k}`} className="flex flex-col">
                  <b className="text-sm font-semibold text-foreground">{`${x.nome} · ${numero(x.gramas)} ${unidadeDo(buscarAlimento(x.alimentoId))}`}</b>
                  <span className="text-xs text-muted-foreground">{x.opcao === 'opcao2' ? `${nomeDaRefeicao(x.refeicao)}, opção 2` : nomeDaRefeicao(x.refeicao)}</span>
                  <span className="text-sm text-foreground">{x.motivo}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {proposta.abaixoDaMeta.length > 0 ? (
        <section aria-labelledby={`${id}-abaixo`} className="flex flex-col gap-1.5 border-t border-bordersubtle py-4">
          <h3 id={`${id}-abaixo`} className="text-sm font-bold text-heading">
            Abaixo da meta
          </h3>
          <p className="numeros text-sm font-semibold text-foreground">{proposta.abaixoDaMeta.map((a) => `${a.nutriente} ${numero(a.pct)}%`).join(' · ')}</p>
          <p className="text-sm text-muted-foreground">Depois de usar, complete pelo Cobrir.</p>
        </section>
      ) : null}

      {proposta.pontosAConfirmar.length > 0 ? (
        <section aria-labelledby={`${id}-pontos`} className="flex flex-col gap-1.5 border-t border-bordersubtle py-4">
          <h3 id={`${id}-pontos`} className="text-sm font-bold text-heading">
            Pontos a confirmar
          </h3>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-foreground marker:text-muted-foreground">
            {proposta.pontosAConfirmar.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
