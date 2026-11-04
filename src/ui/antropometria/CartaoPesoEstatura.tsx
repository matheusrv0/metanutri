import { useState } from 'react'
import type { Caso } from '@/domain/tipos.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { AJUDAS } from './ajudas.ts'
import { CampoMedida } from './CampoMedida.tsx'
import { Escolha } from './Escolha.tsx'
import { PainelEstimar } from './PainelEstimar.tsx'
import { PainelPesoIdeal } from './PainelPesoIdeal.tsx'
import { opcoesDaOrigem } from './textosDaAvaliacao.ts'

interface CartaoPesoEstaturaProps {
  /** O plano como vale (com a ficha). */
  readonly caso: Caso
  /** O plano gravado, sobre o qual as mudanças se aplicam. */
  readonly bruto: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
}

type Painel = 'estimar' | 'ideal' | null

/**
 * "Peso e estatura" (spec antropometria-telas, D-1407 a D-1409): os dois campos do plano (os mesmos da etapa 1), a
 * origem deles e os painéis "Estimar altura e peso atual" e "Estimar peso ideal", um aberto por vez.
 */
export function CartaoPesoEstatura({ caso, bruto, aoAlterar }: CartaoPesoEstaturaProps) {
  const [painel, setPainel] = useState<Painel>(null)
  const alternar = (qual: Exclude<Painel, null>) => setPainel((atual) => (atual === qual ? null : qual))
  const fechar = () => setPainel(null)

  return (
    <section aria-labelledby="titulo-peso">
      <Card className="gap-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <CardTitle id="titulo-peso">Peso e estatura</CardTitle>
          <Escolha
            rotulo="Origem do peso e da estatura"
            rotuloOculto
            compacto
            className="w-full sm:ml-auto sm:w-56"
            vazio="Origem não informada"
            opcoes={opcoesDaOrigem(caso.sexo)}
            valor={bruto.avaliacao.origemPesoEstatura}
            aoEscolher={(origemPesoEstatura) => aoAlterar({ avaliacao: { ...bruto.avaliacao, origemPesoEstatura } })}
          />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <CampoMedida rotulo="Peso" unidade="kg" valor={bruto.pesoKg} aoMudar={(pesoKg) => aoAlterar({ pesoKg })} ajuda={AJUDAS.peso} />
          <CampoMedida rotulo="Estatura" unidade="cm" valor={bruto.estaturaCm} aoMudar={(estaturaCm) => aoAlterar({ estaturaCm })} ajuda={AJUDAS.estatura} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" aria-expanded={painel === 'estimar'} onClick={() => alternar('estimar')}>
            Estimar altura e peso atual
          </Button>
          <Button variant="outline" size="sm" aria-expanded={painel === 'ideal'} onClick={() => alternar('ideal')}>
            Estimar peso ideal
          </Button>
        </div>
        {painel === 'estimar' ? <PainelEstimar caso={caso} bruto={bruto} aoAlterar={aoAlterar} aoFechar={fechar} /> : null}
        {painel === 'ideal' ? <PainelPesoIdeal caso={caso} bruto={bruto} aoAlterar={aoAlterar} aoFechar={fechar} /> : null}
      </Card>
    </section>
  )
}
