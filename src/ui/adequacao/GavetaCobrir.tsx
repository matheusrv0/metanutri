import { EyeOff, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ResultadoAdequacao } from '@/domain/adequacao.ts'
import { sugerirParaCobrir, type Sugestao } from '@/domain/cobrir.ts'
import { medidaEquivalente } from '@/domain/busca.ts'
import { ALIMENTOS } from '@/domain/tabelas.ts'
import type { Totais } from '@/domain/totais.ts'
import type { Caso, ChaveNutrienteAlimento, OpcaoId, Plano } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { CampoNumero } from '../caso/CampoNumero.tsx'
import { Alert } from '../componentes/alert.tsx'
import { Button } from '../componentes/button.tsx'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '../componentes/sheet.tsx'
import { Switch } from '../componentes/switch.tsx'

interface GavetaCobrirProps {
  /** Nutriente a cobrir; `null` mantém a gaveta fechada. */
  readonly chave: ChaveNutrienteAlimento | null
  readonly rotulo: string
  readonly caso: Caso
  readonly plano: Plano
  readonly totais: Totais
  readonly adequacao: ResultadoAdequacao
  readonly gastoEnergetico: number | null
  readonly aoAlterarCaso: (mudanca: Partial<Caso>) => void
  readonly aoAdicionar: (refeicaoId: string, opcao: OpcaoId, alimentoId: number, gramas: number) => void
  readonly aoFechar: () => void
}

function descreverAvisos(s: Sugestao): readonly string[] {
  return s.avisos.map((a) =>
    a.tipo === 'excede-gasto'
      ? `Passa ${formatarNumero(a.kcalAcima, 0)} kcal do gasto energético.`
      : `Passa do limite superior de ${a.rotulo}.`,
  )
}

/** CA-34 a CA-40: sugestões de alimentos para cobrir a falta de um micronutriente. */
export function GavetaCobrir({
  chave,
  rotulo,
  caso,
  plano,
  totais,
  adequacao,
  gastoEnergetico,
  aoAlterarCaso,
  aoAdicionar,
  aoFechar,
}: GavetaCobrirProps) {
  const { adequacao: prefs } = caso
  const [refeicaoId, setRefeicaoId] = useState(plano.refeicoes[0]?.id ?? '')
  const [opcao] = useState<OpcaoId>('principal')

  const resultado = useMemo(
    () =>
      chave === null
        ? null
        : sugerirParaCobrir(chave, totais, adequacao, {
            alimentos: ALIMENTOS,
            gastoEnergetico,
            porcaoMaximaG: prefs.porcaoMaximaG,
            incluirIngredientes: prefs.incluirIngredientes,
            ocultos: new Set(prefs.ocultos),
          }),
    [chave, totais, adequacao, gastoEnergetico, prefs],
  )

  const ocultar = (alimentoId: number) => aoAlterarCaso({ adequacao: { ...prefs, ocultos: [...prefs.ocultos, alimentoId] } })

  return (
    <Sheet open={chave !== null} onOpenChange={(v) => !v && aoFechar()}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-md">
        <SheetTitle>{`Cobrir ${rotulo}`}</SheetTitle>
        <SheetDescription>
          {resultado
            ? `Faltam ${formatarNumero(resultado.falta, 2)} ${resultado.unidade} para a meta.${
                resultado.kcalDisponiveis === null ? '' : ` Cabem ${formatarNumero(resultado.kcalDisponiveis, 0)} kcal até o gasto energético.`
              }`
            : ''}
        </SheetDescription>

        <div className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-4">
          <CampoNumero
            rotulo="Porção máxima por sugestão"
            valor={prefs.porcaoMaximaG}
            aoMudar={(v) => v !== null && v > 0 && aoAlterarCaso({ adequacao: { ...prefs, porcaoMaximaG: v } })}
            sufixo="g"
          />
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Incluir ingredientes e alimentos crus</span>
            <Switch
              checked={prefs.incluirIngredientes}
              onCheckedChange={(v) => aoAlterarCaso({ adequacao: { ...prefs, incluirIngredientes: v } })}
              aria-label="Incluir ingredientes e alimentos crus"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="refeicao-destino">
            Adicionar em
          </label>
          <select
            id="refeicao-destino"
            value={refeicaoId}
            onChange={(e) => setRefeicaoId(e.target.value)}
            className="h-10 rounded-full border border-input bg-card px-4 text-sm"
          >
            {plano.refeicoes.map((r) => (
              <option key={r.id} value={r.id}>
                {`${r.horario} ${r.nome}`}
              </option>
            ))}
          </select>
        </div>

        {resultado?.motivoSemSugestao ? (
          <Alert variant="warning">
            <TriangleAlert aria-hidden="true" />
            <p>{resultado.motivoSemSugestao}</p>
          </Alert>
        ) : null}

        <ul aria-label="Sugestões para cobrir" className="flex flex-col gap-3">
          {(resultado?.sugestoes ?? []).map((s) => {
            const medida = medidaEquivalente(s.alimentoId, s.gramas)
            return (
              <li key={s.alimentoId} className="flex flex-col gap-2 rounded-2xl border border-border p-3">
                <p className="text-sm font-semibold text-heading">{s.descricao}</p>
                <p className="numeros text-sm text-muted-foreground">
                  {`${formatarNumero(s.gramas, 0)} g${medida ? ` · ${medida.texto}` : ''} · cobre ${formatarNumero(s.coberturaPct, 0)}% da falta · +${formatarNumero(
                    s.kcalAdicionadas,
                    0,
                  )} kcal`}
                </p>
                {descreverAvisos(s).map((a) => (
                  <p key={a} className="text-xs text-warningtext">
                    {a}
                  </p>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => aoAdicionar(refeicaoId, opcao, s.alimentoId, s.gramas)}>
                    Adicionar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => ocultar(s.alimentoId)} aria-label={`Ocultar ${s.descricao}`}>
                    <EyeOff aria-hidden="true" />
                    Ocultar
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
