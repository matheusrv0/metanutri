import { Ruler } from 'lucide-react'
import type { SugestaoDeNivel } from '@/domain/anamneseNoPlano.ts'
import { camposDaPessoa, temDadoDeComposicao } from '@/domain/camposVisiveis.ts'
import type { ResultadoValidacao } from '@/domain/caso.ts'
import { dataCompleta } from '@/domain/formatarData.ts'
import type { Caso } from '@/domain/tipos.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Card, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { Recolhivel } from '@ds/componentes/display/Recolhivel.tsx'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { CampoMetaEnergia } from './CampoMetaEnergia.tsx'
import { CampoNivelAtividade } from './CampoNivelAtividade.tsx'
import { CamposComposicao } from './CamposComposicao.tsx'

interface CartaoMedidasProps {
  /** O caso como vale (com o que vem da ficha). */
  readonly caso: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  readonly erros: ResultadoValidacao['erros']
  /** A idade depois que a pessoa terminou de digitar (D-244): decide cintura e panturrilha. */
  readonly idadeAssentada: number | null
  /** D-358: o peso da última consulta do paciente, para a dica do retorno. */
  readonly pesoAnterior?: { readonly pesoKg: number; readonly data: string } | null | undefined
  /** D-356: o nível de atividade que a anamnese sugere. */
  readonly sugestaoNivel?: SugestaoDeNivel | null | undefined
}

const quilos = (kg: number) => String(kg).replace('.', ',')

/**
 * Medidas desta consulta e energia (spec ficha-unica, D-345): peso (com a última medida no retorno), estatura, cintura
 * (R8), panturrilha (R7), composição corporal recolhida, nível de atividade (com o lembrete da anamnese) e, na
 * prescrição rápida, a meta.
 */
export function CartaoMedidas({ caso, aoAlterar, erros, idadeAssentada, pesoAnterior, sugestaoNivel }: CartaoMedidasProps) {
  const rapido = caso.modo === 'rapido'
  const campos = camposDaPessoa({ ...caso, idadeAnos: idadeAssentada })
  const numero = (campo: keyof Caso) => (valor: number | null) => aoAlterar({ [campo]: valor } as Partial<Caso>)
  // R11: o número do fator só aparece na equação de adulto (19 anos ou mais, sem gestação nem lactação).
  const equacaoDeAdulto = caso.idadeAnos !== null && caso.idadeAnos >= 19 && caso.condicao.tipo === 'nenhuma'
  const dicaDoPeso = pesoAnterior ? `Última: ${quilos(pesoAnterior.pesoKg)} kg em ${dataCompleta(pesoAnterior.data)}.` : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medidas e energia</CardTitle>
      </CardHeader>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        <CampoNumero rotulo="Peso" valor={caso.pesoKg} aoMudar={numero('pesoKg')} sufixo="kg" erro={erros.pesoKg} dica={dicaDoPeso} />
        <CampoNumero rotulo="Estatura" valor={caso.estaturaCm} aoMudar={numero('estaturaCm')} sufixo="cm" erro={erros.estaturaCm} />
        {campos.cintura ? (
          <CampoNumero
            rotulo="Circunferência da cintura"
            valor={caso.circunferenciaCinturaCm}
            aoMudar={numero('circunferenciaCinturaCm')}
            sufixo="cm"
            erro={erros.circunferenciaCinturaCm}
          />
        ) : null}
        {campos.panturrilha ? (
          <CampoNumero
            rotulo="Circunferência da panturrilha"
            valor={caso.circunferenciaPanturrilhaCm}
            aoMudar={numero('circunferenciaPanturrilhaCm')}
            sufixo="cm"
            erro={erros.circunferenciaPanturrilhaCm}
          />
        ) : null}
      </div>

      {rapido ? null : (
        <Recolhivel key={`composicao-${caso.id}`} titulo="Composição corporal" resumo="Dobras ou bioimpedância. Opcional." abertoInicial={temDadoDeComposicao(caso)}>
          <CamposComposicao caso={caso} aoAlterar={aoAlterar} />
        </Recolhivel>
      )}

      <CampoNivelAtividade
        fator={caso.energia.fator}
        aoEscolher={(fator) => aoAlterar({ energia: { ...caso.energia, fator } })}
        comFator={equacaoDeAdulto}
        sugestao={sugestaoNivel}
      />

      {rapido ? <CampoMetaEnergia caso={caso} aoMudar={numero('metaEnergiaKcal')} erro={erros.metaEnergiaKcal} /> : null}

      {rapido ? (
        <Alert variant="info">
          <Ruler aria-hidden="true" />
          <p>Na prescrição rápida, peso e estatura servem só para estimar a meta e calcular a proteína em g/kg. Não há classificação nem diagnóstico.</p>
        </Alert>
      ) : null}
    </Card>
  )
}
