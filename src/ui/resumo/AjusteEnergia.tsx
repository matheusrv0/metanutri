import type { Caso, FormulaTmb } from '@/domain/tipos.ts'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'
import { CampoNivelAtividade } from '../caso/CampoNivelAtividade.tsx'

interface AjusteEnergiaProps {
  readonly caso: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  /** Mifflin e Harris-Benedict só valem para adultos (CA-06a). */
  readonly mostrarFormula: boolean
}

/** Controles do cálculo: fórmula, nível de atividade, fator próprio e GET manual (CA-06 a CA-09). */
export function AjusteEnergia({ caso, aoAlterar, mostrarFormula }: AjusteEnergiaProps) {
  const { energia } = caso
  const alterarEnergia = (mudanca: Partial<Caso['energia']>) => aoAlterar({ energia: { ...energia, ...mudanca } })

  return (
    <div className="flex flex-col gap-4 border border-border bg-muted p-4">
      {mostrarFormula ? (
        <GrupoOpcoes<FormulaTmb>
          rotulo="Fórmula da TMB"
          opcoes={[
            { valor: 'mifflin', rotulo: 'Mifflin-St Jeor' },
            { valor: 'harris-benedict', rotulo: 'Harris-Benedict' },
          ]}
          valor={energia.formula}
          aoEscolher={(formula) => alterarEnergia({ formula })}
        />
      ) : null}

      <CampoNivelAtividade fator={energia.fator} aoEscolher={(fator) => alterarEnergia({ fator })} />

      <div className="grid gap-4 sm:grid-cols-2">
        <CampoNumero
          rotulo="Fator próprio"
          valor={energia.fator}
          aoMudar={(v) => v !== null && alterarEnergia({ fator: v })}
          dica="Use quando a conduta pedir outro fator."
        />
        <CampoNumero
          rotulo="GET manual"
          valor={energia.getManual}
          aoMudar={(v) => alterarEnergia({ getManual: v })}
          sufixo="kcal"
          dica="Deixe vazio para usar o calculado."
        />
      </div>
    </div>
  )
}
