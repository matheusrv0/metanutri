import { useId } from 'react'
import type { Paciente } from '@/domain/pacientes.ts'
import { DOENCA_CELIACA, RESTRICOES, type TipoRestricao } from '@/domain/restricoes.ts'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { EscolhaMultipla } from './EscolhaMultipla.tsx'

interface CamposDaAlimentacaoProps {
  readonly paciente: Paciente
  readonly aoAlterar: (mudanca: Partial<Paciente>) => void
}

const GRUPOS: readonly { readonly tipo: TipoRestricao; readonly rotulo: string }[] = [
  { tipo: 'alergia', rotulo: 'Alergias' },
  { tipo: 'intolerancia', rotulo: 'Intolerâncias' },
  { tipo: 'escolha', rotulo: 'Não come por escolha' },
]

/**
 * As restrições no bloco Alimentação (spec ficha-unica, D-351): alergias, intolerâncias e escolhas marcadas, que tiram
 * os alimentos das sugestões, do Cobrir e das trocas, e o texto livre para o resto. Cada grupo guarda só os ids dele;
 * os de outra versão ficam guardados.
 */
export function CamposDaAlimentacao({ paciente, aoAlterar }: CamposDaAlimentacaoProps) {
  const id = useId()
  const celiacaSemGluten = paciente.doencas.includes(DOENCA_CELIACA) && !paciente.restricoesMarcadas.includes('gluten')
  return (
    <>
      {GRUPOS.map((grupo) => {
        const doGrupo = RESTRICOES.filter((r) => r.tipo === grupo.tipo)
        const idsDoGrupo = new Set<string>(doGrupo.map((r) => r.id))
        const rotuloId = `${id}-${grupo.tipo}`
        return (
          <div key={grupo.tipo} className="flex flex-col gap-1.5">
            <span id={rotuloId} className="text-sm font-medium text-foreground">
              {grupo.rotulo}
            </span>
            <EscolhaMultipla
              rotuloId={rotuloId}
              opcoes={doGrupo.map((r) => ({ valor: r.id, rotulo: r.rotulo }))}
              marcados={paciente.restricoesMarcadas.filter((m) => idsDoGrupo.has(m))}
              aoMudar={(marcados) => aoAlterar({ restricoesMarcadas: [...paciente.restricoesMarcadas.filter((m) => !idsDoGrupo.has(m)), ...marcados] })}
            />
          </div>
        )
      })}
      {celiacaSemGluten ? <p className="text-xs text-muted-foreground">A doença celíaca, marcada em Saúde, já tira o glúten das sugestões.</p> : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-outros`}>Outros alimentos que não come</Label>
        <p id={`${id}-outros-dica`} className="text-xs text-muted-foreground">
          Um por linha. Esses alimentos não aparecem nas sugestões nem no Cobrir.
        </p>
        <Textarea
          id={`${id}-outros`}
          aria-describedby={`${id}-outros-dica`}
          rows={2}
          className="min-h-16"
          value={paciente.restricoes}
          onChange={(e) => aoAlterar({ restricoes: e.target.value })}
          placeholder={'camarão\ncarne de porco'}
        />
      </div>
    </>
  )
}
