import { NIVEIS_ATIVIDADE } from '@/domain/energia.ts'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'

interface CampoNivelAtividadeProps {
  readonly fator: number
  readonly aoEscolher: (fator: number) => void
}

const comVirgula = (n: number) => String(n).replace('.', ',')

/** CA-225 e CA-232: os cinco níveis com o fator de cada um; fator próprio não marca nenhum. */
export function CampoNivelAtividade({ fator, aoEscolher }: CampoNivelAtividadeProps) {
  const nivel = NIVEIS_ATIVIDADE.find((n) => n.fator === fator)
  return (
    <div className="flex flex-col gap-1.5">
      <GrupoOpcoes
        rotulo="Nível de atividade"
        opcoes={NIVEIS_ATIVIDADE.map((n) => ({ valor: n.id, rotulo: `${n.rotulo} (${comVirgula(n.fator)})` }))}
        valor={nivel?.id ?? null}
        aoEscolher={(id) => {
          const escolhido = NIVEIS_ATIVIDADE.find((n) => n.id === id)
          if (escolhido) aoEscolher(escolhido.fator)
        }}
      />
      {nivel ? null : <p className="text-xs text-muted-foreground">{`Fator próprio: ${comVirgula(fator)}`}</p>}
    </div>
  )
}
