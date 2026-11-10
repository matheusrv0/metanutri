import type { ResultadoDaMeta } from '@/domain/metaDePerda.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { CabecaDoBloco } from './CabecaDoBloco.tsx'
import { CampoMedida } from './CampoMedida.tsx'
import { ROTULO_DA_EVIDENCIA, avisosNaTela } from './textosDaAvaliacao.ts'

interface BlocoMetaDePerdaProps {
  /** A meta do motor; `null` quando não se aplica (objetivo "ganhar" ou "manter", prioridade 0 sem "emagrecer"). */
  readonly resultado: ResultadoDaMeta | null
  readonly gorduraAlvoPct: number | null
  readonly aoMudarGorduraAlvo: (valor: number | null) => void
  /** O gasto total do plano usado na energia sugerida (D-1469). */
  readonly gastoTotalKcal: number | null
}

const kg = (v: number) => `${formatarNumero(v, 1)} kg`
const kcal = (v: number) => formatarNumero(Math.round(v), 0)
const semanas = (v: number) => formatarNumero(Math.ceil(v), 0)

/**
 * O bloco "Meta de perda" do ponto de partida (spec antropometria-telas, D-1418 e D-1469): a fase 1 (5 a 10% do peso em
 * cerca de 26 semanas), o teto do ritmo, o déficit, a energia sugerida pelo gasto do plano, a gordura alvo digitada, o
 * peso-alvo nos dois cenários e o prazo mínimo.
 */
export function BlocoMetaDePerda({ resultado, gorduraAlvoPct, aoMudarGorduraAlvo, gastoTotalKcal }: BlocoMetaDePerdaProps) {
  if (resultado === null) return null
  const meta = resultado.mostra ? resultado : null
  const avisos = meta ? avisosNaTela('meta', meta.avisos) : { visiveis: [], naAjuda: [] }
  return (
    <div className="grid gap-1.5 border-t border-border pt-3.5">
      <CabecaDoBloco nome="Meta de perda" evidencia={meta ? ROTULO_DA_EVIDENCIA.forte : null} fontes={meta ? [meta.fonte] : []} avisos={avisos.naAjuda} />
      {meta ? (
        <>
          <p className="numeros text-2xl font-semibold tracking-tight text-heading">{`${formatarNumero(meta.fase1.minKg, 1)} a ${kg(meta.fase1.maxKg)} em cerca de 6 meses`}</p>
          <p className="text-sm text-muted-foreground">
            {`5 a 10% do peso, sem passar de ${kg(meta.tetoKgPorSemana)} por semana${meta.atletaKgPorSemana !== null ? ` (no atleta, ${kg(meta.atletaKgPorSemana)})` : ''}. Déficit de ${meta.deficitKcal.min} a ${meta.deficitKcal.max} kcal/dia.`}
          </p>
          {meta.energiaSugeridaKcal && gastoTotalKcal !== null ? (
            <p className="text-sm text-muted-foreground">{`Energia sugerida: ${kcal(meta.energiaSugeridaKcal.min)} a ${kcal(meta.energiaSugeridaKcal.max)} kcal/dia, pelo gasto do plano de ${kcal(gastoTotalKcal)} kcal/dia.`}</p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-end gap-2">
            <CampoMedida rotulo="Gordura alvo, definida por você" unidade="%" valor={gorduraAlvoPct} aoMudar={aoMudarGorduraAlvo} className="w-full sm:w-56" />
          </div>
          {meta.pesoAlvo ? (
            <>
              <div className="mt-1 grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-2">
                <div className="grid gap-0.5 rounded-xl bg-surfacerow px-3 py-2.5">
                  <b className="numeros text-lg font-semibold text-heading">{kg(meta.pesoAlvo.preservandoMassaMagraKg)}</b>
                  <span className="text-xs leading-snug text-muted-foreground">se a massa magra for preservada</span>
                </div>
                <div className="grid gap-0.5 rounded-xl bg-surfacerow px-3 py-2.5">
                  <b className="numeros text-lg font-semibold text-heading">{kg(meta.pesoAlvo.perdaTipicaKg)}</b>
                  <span className="text-xs leading-snug text-muted-foreground">na perda típica, com um quarto do peso perdido em massa magra</span>
                </div>
              </div>
              {meta.prazoMinimoSemanas ? (
                <p className="text-sm text-muted-foreground">{`Prazo mínimo: ${semanas(meta.prazoMinimoSemanas.preservandoMassaMagra)} a ${semanas(meta.prazoMinimoSemanas.perdaTipica)} semanas, no teto do ritmo.`}</p>
              ) : null}
              {meta.limitarAFase1 ? <p className="text-sm text-muted-foreground">A perda até o alvo passa de 10% do peso: fique na fase 1 e reavalie.</p> : null}
            </>
          ) : null}
          <ul className="grid gap-0.5 text-xs text-muted-foreground">
            {avisos.visiveis.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </>
      ) : resultado.mostra ? null : (
        <p className="text-sm text-muted-foreground">{resultado.motivo}</p>
      )}
    </div>
  )
}
