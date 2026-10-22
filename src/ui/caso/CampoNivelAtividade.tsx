import type { SugestaoDeNivel } from '@/domain/anamneseNoPlano.ts'
import { NIVEIS_ATIVIDADE } from '@/domain/energia.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'

interface CampoNivelAtividadeProps {
  readonly fator: number
  readonly aoEscolher: (fator: number) => void
  /** R11 (spec ficha-unica): o número do fator só na equação de adulto; nas do NASEM, o nome da categoria basta. */
  readonly comFator?: boolean | undefined
  /** O que a anamnese diz da atividade, com o nível sugerido (D-356); `null` sem resposta. */
  readonly sugestao?: SugestaoDeNivel | null | undefined
}

const comVirgula = (n: number) => String(n).replace('.', ',')

/**
 * CA-225 e CA-232: os cinco níveis; fator próprio não marca nenhum. Spec ficha-unica, CA-1069 e CA-1070: o fator ao
 * lado do nome só para adulto sem gestação nem lactação, e o lembrete da anamnese com "Usar" quando o nível é outro.
 */
export function CampoNivelAtividade({ fator, aoEscolher, comFator = true, sugestao = null }: CampoNivelAtividadeProps) {
  const nivel = NIVEIS_ATIVIDADE.find((n) => n.fator === fator)
  return (
    <div className="flex flex-col gap-1.5">
      <GrupoOpcoes
        rotulo="Nível de atividade"
        opcoes={NIVEIS_ATIVIDADE.map((n) => ({ valor: n.id, rotulo: comFator ? `${n.rotulo} (${comVirgula(n.fator)})` : n.rotulo }))}
        valor={nivel?.id ?? null}
        aoEscolher={(id) => {
          const escolhido = NIVEIS_ATIVIDADE.find((n) => n.id === id)
          if (escolhido) aoEscolher(escolhido.fator)
        }}
      />
      {nivel ? null : <p className="text-xs text-muted-foreground">{`Fator próprio: ${comVirgula(fator)}`}</p>}
      {sugestao ? (
        <div className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          <p>{sugestao.frase}</p>
          {sugestao.fator === fator ? null : (
            <Button variant="link" size="sm" className="h-auto min-h-11 px-0 sm:min-h-8" aria-label="Usar o nível sugerido" onClick={() => aoEscolher(sugestao.fator)}>
              Usar
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
