import { Lock } from 'lucide-react'
import { useId } from 'react'
import { PORCAO_REDUZIDA } from '@/domain/iaConferencia.ts'
import type { ItemDaMudanca, MudancaConferida, ResumoDoPlano } from '@/domain/iaMudancas.ts'
import { unidadeDo } from '@/domain/liquido.ts'
import { nomeParaPaciente } from '@/domain/nomeParaPaciente.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import type { Plano } from '@/domain/tipos.ts'
import { cn } from '@/lib/utils'

interface MudancasDaIaProps {
  /** O plano como estava quando o pedido saiu (os números de item são dele). */
  readonly plano: Plano
  readonly mudancas: readonly MudancaConferida[]
  readonly recusadas: ReadonlySet<number>
  readonly aoDecidir: (indice: number, aceita: boolean) => void
  readonly efeito: { readonly antes: ResumoDoPlano; readonly depois: ResumoDoPlano; readonly reduzidas: ReadonlySet<number> }
  /** Os nutrientes das lacunas, pelo rótulo da adequação. */
  readonly nutrientes: readonly string[]
}

const numero = (v: number, casas = 0): string => v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
const pct = (v: number | null | undefined): string => (v === null || v === undefined ? '—' : `${numero(v)}%`)
const item = (i: ItemDaMudanca): string => `${nomeParaPaciente(buscarAlimento(i.alimentoId))} ${numero(i.gramas)} ${unidadeDo(buscarAlimento(i.alimentoId))}`

/** O texto da mudança: "Pão francês 100 g → 50 g", "Biscoito 30 g → Mamão 170 g", "+ Amendoim 20 g", "Tirar Café 50 g". */
function troca(c: MudancaConferida): string {
  const m = c.mudanca
  const para = c.para ?? (m.alimentoId !== null && m.gramas !== null ? { alimentoId: m.alimentoId, gramas: m.gramas } : null)
  if (m.tipo === 'adicionar') return para ? `+ ${item(para)}` : '+ alimento'
  if (!c.de) return 'Item que não está mais no plano'
  if (m.tipo === 'remover') return `Tirar ${item(c.de)}`
  if (m.tipo === 'gramas') return `${item(c.de)} → ${para ? `${numero(para.gramas)} ${unidadeDo(buscarAlimento(c.de.alimentoId))}` : '—'}`
  return `${item(c.de)} → ${para ? item(para) : '—'}`
}

type Tom = 'melhor' | 'ainda' | ''

interface Linha {
  readonly nome: string
  readonly antes: string
  readonly depois: string
  readonly tom: Tom
}

const perto = (v: number | null): number => (v === null ? Number.POSITIVE_INFINITY : Math.abs(v - 100))
const foraDaFaixa = (v: number | null): boolean => v !== null && (v < 90 || v > 110)

function linhasDoEfeito(antes: ResumoDoPlano, depois: ResumoDoPlano, nutrientes: readonly string[]): readonly Linha[] {
  const tomDaEnergia: Tom = foraDaFaixa(depois.pctDaMeta) ? 'ainda' : perto(depois.pctDaMeta) < perto(antes.pctDaMeta) ? 'melhor' : ''
  const gKg = (v: number | null) => (v === null ? '—' : `${numero(v, 1)} g/kg`)
  return [
    { nome: 'Energia', antes: `${numero(antes.kcal)} kcal`, depois: `${numero(depois.kcal)} kcal`, tom: tomDaEnergia },
    { nome: 'Em relação à meta', antes: pct(antes.pctDaMeta), depois: pct(depois.pctDaMeta), tom: tomDaEnergia },
    { nome: 'Proteína', antes: gKg(antes.proteinaGKg), depois: gKg(depois.proteinaGKg), tom: '' },
    { nome: 'Carboidrato', antes: pct(antes.carboidratoPct), depois: pct(depois.carboidratoPct), tom: '' },
    { nome: 'Gordura', antes: pct(antes.gorduraPct), depois: pct(depois.gorduraPct), tom: '' },
    ...nutrientes.map((n): Linha => {
      const a = antes.nutrientes[n] ?? null
      const d = depois.nutrientes[n] ?? null
      return { nome: n, antes: pct(a), depois: pct(d), tom: d !== null && d < 100 ? 'ainda' : d !== null && a !== null && d > a ? 'melhor' : '' }
    }),
  ]
}

/** D-1309: o "Efeito no plano" (antes → depois, pelo app) e as mudanças, cada uma com "Aceitar | Recusar". */
export function MudancasDaIa({ plano, mudancas, recusadas, aoDecidir, efeito, nutrientes }: MudancasDaIaProps) {
  const id = useId()
  const linhas = linhasDoEfeito(efeito.antes, efeito.depois, nutrientes)
  const livres = mudancas.filter((c) => c.barrada === null).length
  const aceitas = mudancas.filter((c, i) => c.barrada === null && !recusadas.has(i)).length
  const cobrirMelhor = efeito.depois.abaixoNoCobrir < efeito.antes.abaixoNoCobrir
  const tomDe = (tom: Tom) => cn('numeros text-right font-semibold', tom === 'melhor' && 'text-successtext', tom === 'ainda' && 'text-warningtext', tom === '' && 'text-heading')
  const ondeDe = (c: MudancaConferida) => {
    const nome = plano.refeicoes[c.mudanca.refeicao]?.nome ?? `Refeição ${c.mudanca.refeicao + 1}`
    return `${nome}${c.mudanca.opcao === 'opcao2' ? ', opção 2' : ''}${c.mudanca.tipo === 'adicionar' ? ' · adicionar' : ''}`
  }

  return (
    <div className="flex flex-col">
      <section className="flex flex-col gap-2.5 py-4">
        <h3 id={`${id}-efeito`} className="text-sm font-bold text-heading">
          Efeito no plano
        </h3>
        <div role="table" aria-labelledby={`${id}-efeito`} className="rounded-lg border border-bordersubtle text-sm">
          <div role="row" className="grid grid-cols-[minmax(0,1fr)_5rem_1rem_5rem] gap-1.5 px-3 pb-1 pt-2 text-xs text-muted-foreground sm:grid-cols-[minmax(0,1fr)_5.5rem_1.125rem_5.5rem]">
            <span role="columnheader">No dia</span>
            <span role="columnheader" className="text-right">
              Antes
            </span>
            <span aria-hidden="true" />
            <span role="columnheader" className="text-right">
              Depois
            </span>
          </div>
          {linhas.map((l) => (
            <div key={l.nome} role="row" className="grid grid-cols-[minmax(0,1fr)_5rem_1rem_5rem] gap-1.5 border-t border-bordersubtle px-3 py-1.5 sm:grid-cols-[minmax(0,1fr)_5.5rem_1.125rem_5.5rem]">
              <span role="cell" className="min-w-0 text-foreground">
                {l.nome}
              </span>
              <span role="cell" className="numeros text-right text-muted-foreground">
                {l.antes}
              </span>
              <span aria-hidden="true" className="text-center text-muted-foreground">
                →
              </span>
              <span role="cell" className={tomDe(l.tom)}>
                {l.depois}
              </span>
            </div>
          ))}
          <div role="row" className="grid grid-cols-[minmax(0,1fr)_5rem_1rem_5rem] gap-1.5 rounded-b-lg border-t border-bordersubtle bg-surfacesunken px-3 py-1.5 sm:grid-cols-[minmax(0,1fr)_5.5rem_1.125rem_5.5rem]">
            <span role="cell" className="min-w-0 text-foreground">
              Abaixo da meta no Cobrir
            </span>
            <span role="cell" className="numeros text-right text-muted-foreground">
              {efeito.antes.abaixoNoCobrir}
            </span>
            <span aria-hidden="true" className="text-center text-muted-foreground">
              →
            </span>
            <span role="cell" className={tomDe(cobrirMelhor ? 'melhor' : '')}>
              {efeito.depois.abaixoNoCobrir}
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-1 border-t border-bordersubtle py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 id={`${id}-mud`} className="text-sm font-bold text-heading">
            Mudanças
          </h3>
          <span className="numeros text-xs text-muted-foreground">{`${aceitas} de ${livres} aceitas`}</span>
        </div>
        <ul aria-labelledby={`${id}-mud`} className="flex flex-col">
          {mudancas.map((c, i) => {
            const recusada = recusadas.has(i)
            const marcas = [...c.marcas, ...(efeito.reduzidas.has(i) && !c.marcas.includes(PORCAO_REDUZIDA) ? [PORCAO_REDUZIDA] : [])]
            return (
              <li key={i} className="grid grid-cols-1 items-center gap-x-3 gap-y-1 border-t border-bordersubtle py-3 first:border-t-0 first:pt-1 sm:grid-cols-[minmax(0,1fr)_auto]">
                <span className="text-xs text-muted-foreground sm:col-start-1">{ondeDe(c)}</span>
                <span className={cn('break-words text-sm sm:col-start-1', c.barrada ? 'text-foreground' : recusada ? 'text-muted-foreground' : 'text-heading')}>{troca(c)}</span>
                {c.barrada ? (
                  <>
                    <span className="flex items-center gap-1.5 text-sm text-warningtext sm:col-start-1">
                      <Lock className="size-3.5 shrink-0" aria-hidden="true" />
                      {c.barrada}
                    </span>
                    <span className="justify-self-start text-xs text-muted-foreground sm:col-start-2 sm:row-span-3 sm:row-start-1 sm:justify-self-end">Barrada</span>
                  </>
                ) : (
                  <>
                    {c.mudanca.motivo || marcas.length > 0 ? (
                      <span className={cn('text-sm sm:col-start-1', recusada ? 'text-muted-foreground' : 'text-foreground')}>
                        {[c.mudanca.motivo, ...marcas].filter(Boolean).join(' · ')}
                      </span>
                    ) : null}
                    <div role="group" aria-label={`Decidir: ${troca(c)}`} className="inline-flex w-fit gap-0.5 rounded-full bg-surfacerow p-0.5 sm:col-start-2 sm:row-span-3 sm:row-start-1">
                      {([true, false] as const).map((aceita) => {
                        const marcada = aceita ? !recusada : recusada
                        return (
                          <button
                            key={String(aceita)}
                            type="button"
                            aria-pressed={marcada}
                            onClick={() => aoDecidir(i, aceita)}
                            className={cn(
                              'min-h-11 rounded-full px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8 sm:pointer-coarse:min-h-11',
                              marcada ? (aceita ? 'bg-primary text-primary-foreground' : 'bg-card text-heading shadow-xs') : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {aceita ? 'Aceitar' : 'Recusar'}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
