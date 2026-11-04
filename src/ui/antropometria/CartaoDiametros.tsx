import { useState } from 'react'
import type { Caso, MedidasCorporais } from '@/domain/tipos.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Card } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { AJUDAS } from './ajudas.ts'
import { LinhaDeMedida } from './LinhaDeMedida.tsx'
import { TRAVESSAO } from './textosDaAvaliacao.ts'

interface CartaoDiametrosProps {
  readonly bruto: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
}

type ChaveDoDiametro = 'diametroPunhoCm' | 'diametroCotoveloCm' | 'diametroJoelhoCm'

const numero = (v: number | null) => (v === null ? TRAVESSAO : formatarNumero(v, 1))

/**
 * "Diâmetros ósseos" (spec antropometria-telas, D-1411): punho, cotovelo e joelho, num cartão que nasce fechado com o
 * resumo dos três. O joelho diz "Técnica em conferência" no lugar da ajuda (a técnica do fêmur é [NV]).
 */
export function CartaoDiametros({ bruto, aoAlterar }: CartaoDiametrosProps) {
  const [aberto, setAberto] = useState(false)
  const m = bruto.medidasCorporais
  const lado = (chave: ChaveDoDiametro) => ({ valor: m[chave], aoMudar: (v: number | null) => aoAlterar({ medidasCorporais: { ...m, [chave]: v } satisfies MedidasCorporais }) })

  return (
    <section aria-labelledby="titulo-diametros">
      <Card className="gap-3">
        <div className="flex min-h-8 items-center gap-3">
          <h2 id="titulo-diametros" className="card-title leading-tight">
            Diâmetros ósseos
          </h2>
          <Button variant="link" size="sm" className="ml-auto px-1" aria-expanded={aberto} aria-controls="corpo-diametros" onClick={() => setAberto((a) => !a)}>
            {aberto ? 'Ocultar' : 'Exibir'}
          </Button>
        </div>
        {aberto ? (
          <div id="corpo-diametros" role="group" aria-labelledby="titulo-diametros" className="grid">
            <LinhaDeMedida nome="Punho (biestiloide)" ajuda={AJUDAS.diametroPunho} direito={lado('diametroPunhoCm')} comLados={false} />
            <LinhaDeMedida nome="Cotovelo (úmero)" ajuda={AJUDAS.diametroCotovelo} direito={lado('diametroCotoveloCm')} comLados={false} />
            <LinhaDeMedida
              nome="Joelho (fêmur)"
              direito={lado('diametroJoelhoCm')}
              comLados={false}
              abaixoDoNome={<span className="text-xs text-muted-foreground">Técnica em conferência</span>}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{`Punho ${numero(m.diametroPunhoCm)} · cotovelo ${numero(m.diametroCotoveloCm)} · joelho ${numero(m.diametroJoelhoCm)} cm`}</p>
        )}
      </Card>
    </section>
  )
}
