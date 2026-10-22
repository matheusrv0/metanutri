import { Ruler } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import type { SugestaoDeNivel } from '@/domain/anamneseNoPlano.ts'
import { avaliarAntropometria } from '@/domain/antropometria.ts'
import { mostraCamposDeEstagio, mostraReceitas, type AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { validarCaso } from '@/domain/caso.ts'
import { casoComFicha, type PlanoComFicha } from '@/domain/fichaNoPlano.ts'
import type { Paciente } from '@/domain/pacientes.ts'
import type { Caso } from '@/domain/tipos.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { CartaoDocumento } from './CartaoDocumento.tsx'
import { CartaoIdentificacao } from './CartaoIdentificacao.tsx'
import { CartaoMedidas } from './CartaoMedidas.tsx'
import { PainelAntropometria } from './PainelAntropometria.tsx'
import { useValorAssentado } from './usarValorAssentado.ts'

/** D-244: quanto esperar depois da última tecla da idade para mostrar ou esconder os campos que dependem dela. */
const ESPERA_DA_IDADE_MS = 500

interface TelaCasoProps {
  /** O caso como vale: com paciente, já com o que vem da ficha (spec ficha-unica, D-340). */
  readonly caso: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  /** Pacientes cadastrados, para vincular este plano a uma ficha. */
  readonly pacientes?: readonly { readonly id: string; readonly nome: string }[]
  readonly aoVincularPaciente?: (pacienteId: string | null) => void
  /** Painéis extras da coluna da direita (ex.: Resumo do dia). */
  readonly lateral?: ReactNode
  /** Quem assina e a situação (US-A2, US-A4); sem ela, o plano fica como era (CB-69). */
  readonly assinatura?: AssinaturaDoPlano | null | undefined
  /** A ficha do paciente do plano e o que ela dá ao plano (D-340 a D-344). */
  readonly paciente?: Paciente | null | undefined
  readonly comFicha?: PlanoComFicha | undefined
  readonly aoAlterarPaciente?: ((mudanca: Partial<Paciente>) => void) | undefined
  readonly aoAbrirFicha?: (() => void) | undefined
  /** D-358: o peso da última consulta do paciente. */
  readonly pesoAnterior?: { readonly pesoKg: number; readonly data: string } | null | undefined
  /** D-356 e CA-1071: o que a anamnese diz da atividade e da hidratação. */
  readonly sugestaoNivel?: SugestaoDeNivel | null | undefined
  readonly lembreteAgua?: string | null | undefined
}

/**
 * Etapa 1 (spec ficha-unica, D-345): Identificação, Medidas e energia, e Orientações e documento, só com o que vale
 * para o paciente (US-B4), e a avaliação ao lado.
 */
export function TelaCaso({
  caso,
  aoAlterar,
  lateral,
  assinatura,
  pacientes = [],
  aoVincularPaciente,
  paciente = null,
  comFicha,
  aoAlterarPaciente,
  aoAbrirFicha,
  pesoAnterior,
  sugestaoNivel,
  lembreteAgua,
}: TelaCasoProps) {
  const validacao = useMemo(() => validarCaso(caso), [caso])
  const antropometria = useMemo(() => avaliarAntropometria(caso), [caso])
  const situacao = assinatura?.situacao ?? null
  // D-244 (spec revisao-geral-trabalho): os campos que dependem da idade seguem a idade que a pessoa terminou de
  // digitar; outro plano mostra os campos dele na hora (CA-784).
  const [idadeAssentada, assentarIdade] = useValorAssentado(caso.idadeAnos, ESPERA_DA_IDADE_MS, caso.id)

  // Quais campos aparecem se decide quando o plano abre (ou a situação muda), não a cada tecla:
  // senão apagar todo o texto de Receitas, por exemplo, faria o campo sumir no meio da edição.
  const [visibilidade, setVisibilidade] = useState(() => ({ id: caso.id, situacao, estagio: mostraCamposDeEstagio(situacao, caso), receitas: mostraReceitas(situacao, caso) }))
  let atual = visibilidade
  if (visibilidade.id !== caso.id || visibilidade.situacao !== situacao) {
    atual = { id: caso.id, situacao, estagio: mostraCamposDeEstagio(situacao, caso), receitas: mostraReceitas(situacao, caso) }
    setVisibilidade(atual)
  }
  const rapido = caso.modo === 'rapido'
  const ficha = comFicha ?? casoComFicha(caso, null, caso.dataConsulta ?? '')

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-6">
        <CartaoIdentificacao
          caso={caso}
          aoAlterar={aoAlterar}
          pacientes={pacientes}
          aoVincularPaciente={aoVincularPaciente}
          paciente={paciente}
          comFicha={ficha}
          aoAlterarPaciente={aoAlterarPaciente}
          aoAbrirFicha={aoAbrirFicha}
          erros={validacao.erros}
          idadeAssentada={idadeAssentada}
          assentarIdade={assentarIdade}
        />

        <CartaoMedidas
          caso={caso}
          aoAlterar={aoAlterar}
          erros={validacao.erros}
          idadeAssentada={idadeAssentada}
          pesoAnterior={pesoAnterior}
          sugestaoNivel={sugestaoNivel}
        />

        <CartaoDocumento
          caso={caso}
          aoAlterar={aoAlterar}
          assinatura={assinatura}
          camposDeEstagio={atual.estagio}
          comReceitas={atual.receitas}
          lembreteAgua={lembreteAgua}
        />
      </div>

      <div className="flex flex-col gap-6">
        {rapido ? (
          <Card className="gap-3">
            <div className="flex items-center gap-2">
              <Ruler className="size-4 text-primary" aria-hidden="true" />
              <CardTitle>Sem avaliação neste plano</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Esta é uma prescrição rápida: sem avaliação antropométrica, e o documento exportado diz isso.</p>
            <Button variant="lightprimary" className="self-start" onClick={() => aoAlterar({ modo: 'completo' })}>
              Mudar para atendimento completo
            </Button>
          </Card>
        ) : (
          <PainelAntropometria resultado={antropometria} />
        )}
        {lateral}
      </div>
    </div>
  )
}
