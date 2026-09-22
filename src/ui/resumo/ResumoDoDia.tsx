import { Flame, Settings2, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { calcularEnergia, percentualDoGasto } from '@/domain/energia.ts'
import { calcularMacros, type EstadoFaixa, type ResultadoMacro } from '@/domain/macros.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Alert } from '../componentes/alert.tsx'
import { Badge } from '../componentes/badge.tsx'
import { Button } from '../componentes/button.tsx'
import { Card, CardTitle } from '../componentes/card.tsx'
import { Progress } from '../componentes/progress.tsx'
import { CampoNumero } from '../caso/CampoNumero.tsx'
import { AjusteEnergia } from './AjusteEnergia.tsx'
import { MedidorMacro } from './MedidorMacro.tsx'
import { DialogoMetas } from './DialogoMetas.tsx'

interface ResumoDoDiaProps {
  readonly caso: Caso
  readonly plano: Plano
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
}

const VARIANTE: Record<EstadoFaixa, 'lightSuccess' | 'lightWarning' | 'lightError'> = {
  dentro: 'lightSuccess',
  abaixo: 'lightWarning',
  acima: 'lightError',
}


function descreverMeta(macro: ResultadoMacro): string | null {
  if (!macro.meta) return null
  const ehPct = macro.meta.tipo === 'pct'
  const unidade = ehPct ? '%' : ' g/kg'
  const casas = ehPct ? 0 : 1
  const origem = macro.origemMeta === 'usuario' ? 'sua meta' : 'faixa da idade'
  return `Meta: ${formatarNumero(macro.meta.min, casas)} a ${formatarNumero(macro.meta.max, casas)}${unidade} (${origem})`
}


/** Painel lateral com energia do dia e macronutrientes do plano (CA-06 a CA-11, CA-22 a CA-24). */
export function ResumoDoDia({ caso, plano, aoAlterar }: ResumoDoDiaProps) {
  const [ajustando, setAjustando] = useState(false)
  const [editandoMetas, setEditandoMetas] = useState(false)

  const totais = useMemo(() => totaisDoPlano(plano, buscarAlimento), [plano])
  const energia = useMemo(
    () => calcularEnergia(caso, { fator: caso.energia.fator, formula: caso.energia.formula, getManual: caso.energia.getManual }),
    [caso],
  )
  const macros = useMemo(() => calcularMacros(totais, caso, caso.metasMacros), [totais, caso])

  const kcalPlano = totais.nutrientes.energia_kcal.total
  const doGet = percentualDoGasto(kcalPlano, energia.get)
  const ehAdulto = (caso.idadeAnos ?? 0) >= 19 && caso.condicao.tipo === 'nenhuma'

  return (
    <section aria-label="Resumo do dia" className="flex flex-col gap-4">
      <Card className="gap-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Flame className="size-4 text-primary" aria-hidden="true" />
            <CardTitle>Resumo do dia</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setAjustando((v) => !v)} aria-expanded={ajustando}>
            <Settings2 aria-hidden="true" />
            Ajustar
          </Button>
        </div>

        {ajustando ? (
          caso.modo === 'rapido' ? (
            <div className="flex flex-col gap-3 border border-fio bg-muted p-4">
              <CampoNumero
                rotulo="Meta de energia"
                valor={caso.metaEnergiaKcal}
                aoMudar={(v) => aoAlterar({ metaEnergiaKcal: v })}
                sufixo="kcal"
                dica="Na prescrição rápida, a meta substitui o cálculo por fórmula."
              />
            </div>
          ) : (
            <AjusteEnergia caso={caso} aoAlterar={aoAlterar} mostrarFormula={ehAdulto} />
          )
        ) : null}

        {energia.motivoSemCalculo ? (
          <Alert variant="warning">
            <TriangleAlert aria-hidden="true" />
            <p>{energia.motivoSemCalculo}</p>
          </Alert>
        ) : null}

        {energia.avisos.map((a) => (
          <Alert key={a} variant="info">
            <TriangleAlert aria-hidden="true" />
            <p>{a}</p>
          </Alert>
        ))}

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-muted-foreground">Energia do plano</span>
            <span className="numeros text-2xl font-bold text-heading">{`${formatarNumero(kcalPlano, 0)} kcal`}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm text-muted-foreground">{energia.getManual ? 'GET definido manualmente' : 'GET calculado'}</span>
            <span className="numeros text-base font-semibold text-heading">{energia.get === null ? '—' : `${formatarNumero(energia.get, 0)} kcal`}</span>
          </div>
          {doGet ? (
            <>
              <Progress value={doGet.pct} />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{`${formatarNumero(doGet.pct, 0)}% do GET`}</span>
                <Badge variant={VARIANTE[doGet.estado]}>
                  {doGet.estado === 'dentro' ? 'Entre 90% e 110%' : doGet.estado === 'abaixo' ? 'Abaixo de 90%' : 'Acima de 110%'}
                </Badge>
              </div>
            </>
          ) : null}
        </div>

        {caso.modo === 'completo' && (energia.tmb !== null || energia.get !== null) ? (
          <dl className="flex flex-col gap-1.5 border-t border-border pt-3 text-sm">
            {energia.tmb !== null ? (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">TMB</dt>
                <dd className="numeros font-medium text-heading">{`${formatarNumero(energia.tmb, 0)} kcal`}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Fator de atividade</dt>
              <dd className="numeros font-medium text-heading">
                {`${formatarNumero(caso.energia.fator, 2)}${energia.categoriaAtividade ? ` · ${energia.categoriaAtividade}` : ''}`}
              </dd>
            </div>
            {energia.adicionais.map((a) => (
              <div key={a.descricao} className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{a.descricao}</dt>
                <dd className="numeros font-medium text-heading">{`${a.kcal > 0 ? '+' : ''}${formatarNumero(a.kcal, 0)} kcal`}</dd>
              </div>
            ))}
            {energia.fonte ? <p className="pt-1 text-xs text-muted-foreground">Fonte: {energia.fonte}</p> : null}
          </dl>
        ) : null}
      </Card>

      <Card className="gap-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Macronutrientes</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setEditandoMetas(true)}>
            <SlidersHorizontal aria-hidden="true" />
            Metas
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          <MedidorMacro nome="Proteína" macro={macros.proteina} meta={descreverMeta(macros.proteina)} />
          <MedidorMacro nome="Carboidrato" macro={macros.carboidrato} meta={descreverMeta(macros.carboidrato)} />
          <MedidorMacro nome="Gordura" macro={macros.gordura} meta={descreverMeta(macros.gordura)} />
        </div>
      </Card>

      <DialogoMetas
        aberto={editandoMetas}
        metas={caso.metasMacros}
        aoFechar={() => setEditandoMetas(false)}
        aoConfirmar={(metasMacros) => {
          aoAlterar({ metasMacros })
          setEditandoMetas(false)
        }}
      />
    </section>
  )
}
