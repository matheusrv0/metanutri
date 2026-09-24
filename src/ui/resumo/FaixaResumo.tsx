import { Settings2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { calcularEnergia, percentualDoGasto } from '@/domain/energia.ts'
import { calcularMacros, type EstadoFaixa } from '@/domain/macros.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { cn } from '@/lib/utils'
import { Button } from '@ds/componentes/forms/button.tsx'
import { AjusteEnergia } from './AjusteEnergia.tsx'

interface FaixaResumoProps {
  readonly caso: Caso
  readonly plano: Plano
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
}

const COR: Record<EstadoFaixa, string> = {
  dentro: 'text-successtext',
  abaixo: 'text-warningtext',
  acima: 'text-errortext',
}

function Celula({ rotulo, valor, cor }: { readonly rotulo: string; readonly valor: string; readonly cor?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 border-b border-r border-border px-4 py-2.5 last:border-r-0 sm:[&:nth-child(3n)]:border-r-0 xl:border-b-0 xl:border-r xl:first:pl-0 xl:[&:nth-child(3n)]:border-r">
      <span className="rotulo">{rotulo}</span>
      <span className={cn('numeros truncate text-base font-semibold text-heading', cor)}>{valor}</span>
    </div>
  )
}

/** Cabeçalho numérico da folha: o dia inteiro em uma linha, para a tabela de adequação ocupar a largura toda. */
export function FaixaResumo({ caso, plano, aoAlterar }: FaixaResumoProps) {
  const [ajustando, setAjustando] = useState(false)

  const totais = useMemo(() => totaisDoPlano(plano, buscarAlimento), [plano])
  const energia = useMemo(
    () => calcularEnergia(caso, { fator: caso.energia.fator, formula: caso.energia.formula, getManual: caso.energia.getManual }),
    [caso],
  )
  const macros = useMemo(() => calcularMacros(totais, caso, caso.metasMacros), [totais, caso])
  const kcalPlano = totais.nutrientes.energia_kcal.total
  const doGet = percentualDoGasto(kcalPlano, energia.get)
  const ehAdulto = (caso.idadeAnos ?? 0) >= 19 && caso.condicao.tipo === 'nenhuma'

  const macro = (nome: string, m: (typeof macros)['proteina']) => (
    <Celula
      rotulo={nome}
      valor={`${formatarNumero(m.gramas, 0)} g${m.pctKcal === null ? '' : ` · ${formatarNumero(m.pctKcal, 0)}%`}`}
      {...(m.estado ? { cor: COR[m.estado] } : {})}
    />
  )

  return (
    <section aria-label="Resumo do dia" className="flex flex-col border border-border bg-card">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:flex xl:flex-wrap xl:items-center xl:px-4">
        <Celula rotulo="Energia do plano" valor={`${formatarNumero(kcalPlano, 0)} kcal`} />
        <Celula rotulo={energia.getManual ? 'GET manual' : 'GET calculado'} valor={energia.get === null ? '—' : `${formatarNumero(energia.get, 0)} kcal`} />
        <Celula
          rotulo="Do gasto"
          valor={doGet ? `${formatarNumero(doGet.pct, 0)}%` : '—'}
          {...(doGet ? { cor: COR[doGet.estado] } : {})}
        />
        {macro('Proteína', macros.proteina)}
        {macro('Carboidrato', macros.carboidrato)}
        {macro('Gordura', macros.gordura)}
        <div className="col-span-2 flex justify-end px-4 py-2 sm:col-span-3 xl:col-span-1 xl:ml-auto xl:px-0">
          <Button variant="ghost" size="sm" onClick={() => setAjustando((v) => !v)} aria-expanded={ajustando}>
            <Settings2 aria-hidden="true" />
            Ajustar
          </Button>
        </div>
      </div>
      {ajustando ? (
        <div className="border-t border-border p-4">
          <AjusteEnergia caso={caso} aoAlterar={aoAlterar} mostrarFormula={ehAdulto} />
        </div>
      ) : null}
    </section>
  )
}
