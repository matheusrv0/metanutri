import { Flame, Settings2, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { arredondarNoEstado } from '@/domain/arredondarNoEstado.ts'
import { calcularEnergia, FAIXA_DO_GASTO_PADRAO, percentualDoGasto } from '@/domain/energia.ts'
import { calcularMacros, type EstadoFaixa, type ResultadoMacro, type ResultadoMacros } from '@/domain/macros.ts'
import { buscarAlimento } from '@/domain/tabelas.ts'
import { totaisDoPlano } from '@/domain/totais.ts'
import type { Caso, Plano } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { cn } from '@/lib/utils'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Fontes } from '@ds/componentes/display/Fontes.tsx'
import { Recolhivel } from '@ds/componentes/display/Recolhivel.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Progress } from '@ds/componentes/display/progress.tsx'
import { CampoMetaEnergia } from '../caso/CampoMetaEnergia.tsx'
import { AjusteEnergia } from './AjusteEnergia.tsx'
import { MedidorMacro } from '@ds/componentes/nutricao/MedidorMacro.tsx'
import { DialogoMetas } from './DialogoMetas.tsx'
import { LinhaCalculo } from './LinhaCalculo.tsx'

interface ResumoDoDiaProps {
  readonly caso: Caso
  readonly plano: Plano
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
}

/* A barra e a frase carregam o mesmo estado: cor sempre significa alguma coisa. */
const VARIANTE_BARRA: Record<EstadoFaixa, 'success' | 'warning' | 'error'> = {
  dentro: 'success',
  abaixo: 'warning',
  acima: 'error',
}

const COR_FRASE: Record<EstadoFaixa, string> = {
  dentro: 'text-successtext',
  abaixo: 'text-warningtext',
  acima: 'text-errortext',
}

/* O limite vai na mesma frase do percentual: era um selo à parte (spec painel-lateral-enxuto, D-200). */
const FAIXA_DO_GASTO: Record<EstadoFaixa, string> = {
  dentro: 'entre 90% e 110%',
  abaixo: 'abaixo de 90%',
  acima: 'acima de 110%',
}

/** A meta curta, ao lado da frase do medidor: "10 a 35%" ou "1,2 a 1,6 g/kg · sua meta" (D-202). */
function descreverMeta(macro: ResultadoMacro): string | null {
  if (!macro.meta) return null
  const ehPct = macro.meta.tipo === 'pct'
  const unidade = ehPct ? '%' : ' g/kg'
  const casas = ehPct ? 0 : 1
  const faixa = `${formatarNumero(macro.meta.min, casas)} a ${formatarNumero(macro.meta.max, casas)}${unidade}`
  return macro.origemMeta === 'usuario' ? `${faixa} · sua meta` : faixa
}

/** De onde vêm as metas dos três macros, dito uma vez em "Ver cálculo" (D-202). */
function origemDasMetas(macros: ResultadoMacros): string | null {
  const origens = new Set([macros.proteina, macros.carboidrato, macros.gordura].map((m) => m.origemMeta))
  const daIdade = origens.has('amdr')
  const suas = origens.has('usuario')
  if (daIdade && suas) return 'faixa da idade e suas metas'
  if (daIdade) return 'faixa da idade'
  if (suas) return 'suas metas'
  return null
}

/**
 * Painel lateral com energia do dia e macronutrientes do plano (CA-06 a CA-11, CA-22 a CA-24).
 * Cada fato aparece uma vez; o resto fica em "Ajustar" e em "Ver cálculo" (spec painel-lateral-enxuto).
 */
export function ResumoDoDia({ caso, plano, aoAlterar }: ResumoDoDiaProps) {
  const [ajustando, setAjustando] = useState(false)
  const [editandoMetas, setEditandoMetas] = useState(false)

  const totais = useMemo(() => totaisDoPlano(plano, buscarAlimento), [plano])
  const energia = useMemo(
    () => calcularEnergia(caso, { fator: caso.energia.fator, formula: caso.energia.formula, getManual: caso.energia.getManual }),
    [caso],
  )
  const macros = useMemo(() => calcularMacros(totais, caso, caso.metasMacros), [totais, caso])

  const rapido = caso.modo === 'rapido'
  const kcalPlano = totais.nutrientes.energia_kcal.total
  const doGet = percentualDoGasto(kcalPlano, energia.get)
  const ehAdulto = (caso.idadeAnos ?? 0) >= 19 && caso.condicao.tipo === 'nenhuma'
  const rotuloEnergia = rapido
    ? energia.getManual
      ? 'Meta definida por você'
      : energia.get === null
        ? 'Meta de energia'
        : 'Meta calculada'
    : energia.getManual
      ? 'GET definido manualmente'
      : 'GET calculado'

  const mostraCalculo = (!rapido || !energia.getManual) && (energia.tmb !== null || energia.get !== null)
  const origem = origemDasMetas(macros)
  // Com meta em g/kg, o número já está na linha do macro: aqui não se repete (CA-702).
  const gPorKg = (m: ResultadoMacro) => (m.gPorKg === null || m.meta?.tipo === 'g_kg' ? null : `${formatarNumero(m.gPorKg, 2)} g/kg`)
  const carboidratoGkg = gPorKg(macros.carboidrato)
  const gorduraGkg = gPorKg(macros.gordura)
  const temCalculo = mostraCalculo || carboidratoGkg !== null || gorduraGkg !== null || origem !== null

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
          <div className="flex flex-col gap-3">
            {rapido ? (
              <div className="flex flex-col gap-3 border border-border bg-muted p-4">
                <CampoMetaEnergia caso={caso} aoMudar={(v) => aoAlterar({ metaEnergiaKcal: v })} />
              </div>
            ) : (
              <AjusteEnergia caso={caso} aoAlterar={aoAlterar} mostrarFormula={ehAdulto} />
            )}
            <Button variant="outline" size="sm" className="self-start" onClick={() => setEditandoMetas(true)}>
              <SlidersHorizontal aria-hidden="true" />
              Metas de macronutrientes
            </Button>
          </div>
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
            <span className="text-sm text-muted-foreground">{rotuloEnergia}</span>
            <span className="numeros text-base font-semibold text-heading">{energia.get === null ? '—' : `${formatarNumero(energia.get, 0)} kcal`}</span>
          </div>
          {doGet ? (
            <>
              <Progress value={doGet.pct} variant={VARIANTE_BARRA[doGet.estado]} aria-label="Energia do plano em relação ao alvo" />
              <p className={cn('numeros text-xs font-medium', COR_FRASE[doGet.estado])}>
                {`${formatarNumero(arredondarNoEstado(doGet.pct, doGet.estado, FAIXA_DO_GASTO_PADRAO), 0)}% ${rapido ? 'da meta' : 'do GET'}, ${FAIXA_DO_GASTO[doGet.estado]}`}
              </p>
            </>
          ) : null}
        </div>

        <div className="flex flex-col gap-3.5 border-t border-border pt-4">
          <MedidorMacro nome="Proteína" macro={macros.proteina} meta={descreverMeta(macros.proteina)} comGPorKg />
          <MedidorMacro nome="Carboidrato" macro={macros.carboidrato} meta={descreverMeta(macros.carboidrato)} />
          <MedidorMacro nome="Gordura" macro={macros.gordura} meta={descreverMeta(macros.gordura)} />
        </div>

        {temCalculo ? (
          <Recolhivel titulo="Ver cálculo">
            <dl className="flex flex-col gap-1.5 text-sm">
              {mostraCalculo && energia.tmb !== null ? <LinhaCalculo rotulo="TMB" valor={`${formatarNumero(energia.tmb, 0)} kcal`} /> : null}
              {mostraCalculo ? (
                <LinhaCalculo
                  rotulo="Fator de atividade"
                  valor={`${formatarNumero(caso.energia.fator, 2)}${energia.categoriaAtividade ? ` · ${energia.categoriaAtividade}` : ''}`}
                />
              ) : null}
              {mostraCalculo
                ? energia.adicionais.map((a) => (
                    <LinhaCalculo key={a.descricao} rotulo={a.descricao} valor={`${a.kcal > 0 ? '+' : ''}${formatarNumero(a.kcal, 0)} kcal`} />
                  ))
                : null}
              {/* A fonte é da fórmula da energia: vem logo depois dela, antes dos macros (CA-702). */}
              {mostraCalculo && energia.fonte ? <Fontes itens={[{ texto: energia.fonte }]} className="pb-1" /> : null}
              {carboidratoGkg ? <LinhaCalculo rotulo="Carboidrato no plano" valor={carboidratoGkg} /> : null}
              {gorduraGkg ? <LinhaCalculo rotulo="Gordura no plano" valor={gorduraGkg} /> : null}
              {origem ? <LinhaCalculo rotulo="Metas dos macronutrientes" valor={origem} /> : null}
            </dl>
          </Recolhivel>
        ) : null}
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
