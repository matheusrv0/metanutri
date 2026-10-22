import { Info } from 'lucide-react'
import { aguaDoCaso, litros, METODOS_AGUA, metodoDaAgua, referenciaDaDri, textoDaReferencia, type MetodoAgua } from '@/domain/agua.ts'
import type { Caso } from '@/domain/tipos.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'

interface CampoAguaProps {
  /** O caso como vale (com o que vem da ficha). */
  readonly caso: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  /** O que a anamnese diz da hidratação ("Na anamnese: 1 litro por dia · urina 5 · Amarelo-escuro"); nulo sem resposta. */
  readonly lembrete?: string | null | undefined
}

/**
 * A meta de água do plano (spec ficha-unica, D-355 e seção 4): pelo peso (faixa da idade, peso ajustado, Holliday-Segar,
 * gestação e lactação) ou por 1 ml/kcal. A conta aparece com o nome do método; o valor digitado vale para o plano
 * impresso e para a missão do link; apagar tira a linha (D-298); "Usar a calculada" volta à conta. A AI da DRI é só
 * referência.
 */
export function CampoAgua({ caso, aoAlterar, lembrete }: CampoAguaProps) {
  const agua = aguaDoCaso(caso)
  const metodo = metodoDaAgua(caso)
  const textoAntigo = typeof caso.linhaDaAgua === 'string' && caso.linhaDaAgua.trim() !== '' ? caso.linhaDaAgua.trim() : null
  const referencia = referenciaDaDri(caso)
  const mexida = agua.editada || agua.semLinha || textoAntigo !== null
  const semDado = metodo === 'ml-kg' ? 'Informe o peso para a meta automática.' : 'Sem meta de energia, não há meta por kcal.'
  const dica = agua.semLinha
    ? 'Sem meta de água no plano impresso e na missão do link.'
    : agua.calculo
      ? `${agua.calculo.metodo} · ${agua.calculo.conta}`
      : semDado

  return (
    <div className="flex flex-col gap-3">
      <GrupoOpcoes<MetodoAgua> rotulo="Cálculo da meta de água" opcoes={METODOS_AGUA} valor={metodo} aoEscolher={(metodoAgua) => aoAlterar({ metodoAgua })} />
      <div className="flex flex-col gap-1.5">
        <CampoNumero
          rotulo="Meta de água"
          valor={agua.semLinha ? null : agua.litros}
          aoMudar={(v) => aoAlterar(v === null ? { aguaLitros: null, linhaDaAgua: '' } : { aguaLitros: v, linhaDaAgua: null })}
          sufixo="litros"
          dica={dica}
        />
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {agua.editada && agua.calculo ? <p>{`Valor digitado. A conta dá ${litros(agua.calculo.litros)} L.`}</p> : null}
          {agua.calculo?.nota && !agua.semLinha ? <p>{agua.calculo.nota}</p> : null}
          <p>Aparece no início das orientações do plano impresso e na missão de água do link.</p>
          {referencia ? <p>{textoDaReferencia(referencia)}</p> : null}
          {lembrete ? <p className="text-foreground">{lembrete}</p> : null}
        </div>
        {mexida ? (
          <Button variant="link" size="sm" className="h-auto min-h-11 self-start px-0 sm:min-h-8" onClick={() => aoAlterar({ aguaLitros: null, linhaDaAgua: null })}>
            Usar a calculada
          </Button>
        ) : null}
      </div>
      {textoAntigo ? (
        <Alert variant="info">
          <Info aria-hidden="true" />
          <p>{`Linha escrita antes: “${textoAntigo}”. Ela continua no plano impresso até você usar a calculada.`}</p>
        </Alert>
      ) : null}
    </div>
  )
}
