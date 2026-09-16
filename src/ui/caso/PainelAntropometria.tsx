import { Info, Ruler, TriangleAlert } from 'lucide-react'
import type { ResultadoAntropometria } from '@/domain/antropometria.ts'
import { formatarNumero } from '@/export/copiar-tabela.ts'
import { Alert } from '../componentes/alert.tsx'
import { Card, CardTitle } from '../componentes/card.tsx'

interface LinhaProps {
  readonly rotulo: string
  readonly valor: string
  readonly detalhe?: string | undefined
  /** CA-05: fonte com nome e ano ao lado de cada referência. */
  readonly fonte: string
}

function Linha({ rotulo, valor, detalhe, fonte }: LinhaProps) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border pb-3 last:border-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted-foreground">{rotulo}</span>
        <span className="numeros text-base font-semibold text-heading">{valor}</span>
      </div>
      {detalhe ? <span className="text-sm text-foreground">{detalhe}</span> : null}
      <span className="text-xs text-muted-foreground">Fonte: {fonte}</span>
    </div>
  )
}

/** Avaliação antropométrica do caso (CA-02 a CA-05), sempre com a fonte de cada referência. */
export function PainelAntropometria({ resultado }: { readonly resultado: ResultadoAntropometria }) {
  const { imc, imcIdade, estaturaIdade, gestacao, cintura, panturrilha, avisos } = resultado
  const temResultado = imc ?? imcIdade ?? estaturaIdade ?? gestacao ?? cintura ?? panturrilha

  return (
    <section aria-label="Avaliação antropométrica">
    <Card className="gap-4">
      <div className="flex items-center gap-2">
        <Ruler className="size-4 text-primary" aria-hidden="true" />
        <CardTitle>Avaliação antropométrica</CardTitle>
      </div>

      {avisos.map((a) => (
        <Alert key={a} variant="warning">
          <TriangleAlert aria-hidden="true" />
          <p>{a}</p>
        </Alert>
      ))}

      {!temResultado && avisos.length === 0 ? (
        <Alert variant="info">
          <Info aria-hidden="true" />
          <p>Preencha sexo, idade, peso e estatura para ver a avaliação.</p>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-3">
        {imc ? (
          <Linha
            rotulo={`IMC (referência de ${imc.referencia})`}
            valor={`${formatarNumero(imc.valor, 1)} kg/m²`}
            detalhe={imc.grau ? `${imc.classe} — ${imc.grau}` : imc.classe}
            fonte={imc.fonte}
          />
        ) : null}

        {imcIdade ? (
          <Linha
            rotulo="IMC-para-idade"
            valor={`escore-z ${formatarNumero(imcIdade.z, 2)}`}
            detalhe={`${imcIdade.classe} — IMC ${formatarNumero(imcIdade.valorImc, 1)} kg/m² aos ${imcIdade.mesesReferencia} meses`}
            fonte={imcIdade.fonte}
          />
        ) : null}

        {estaturaIdade ? (
          <Linha
            rotulo="Estatura-para-idade"
            valor={`escore-z ${formatarNumero(estaturaIdade.z, 2)}`}
            detalhe={estaturaIdade.classe}
            fonte={estaturaIdade.fonte}
          />
        ) : null}

        {gestacao ? (
          <Linha
            rotulo="IMC pré-gestacional"
            valor={`${formatarNumero(gestacao.imcPreGestacional, 1)} kg/m²`}
            detalhe={`${gestacao.rotulo} — ganho recomendado de ${formatarNumero(gestacao.ganhoRecomendadoKg.min, 1)} a ${formatarNumero(
              gestacao.ganhoRecomendadoKg.max,
              1,
            )} kg até 40 semanas; ganho atual de ${formatarNumero(gestacao.ganhoAtualKg, 1)} kg`}
            fonte={gestacao.fonte}
          />
        ) : null}

        {cintura ? <Linha rotulo="Circunferência da cintura" valor={cintura.classe} fonte={cintura.fonte} /> : null}

        {panturrilha ? <Linha rotulo="Circunferência da panturrilha" valor={panturrilha.classe} detalhe={panturrilha.nota} fonte={panturrilha.fonte} /> : null}
      </div>
    </Card>
    </section>
  )
}
