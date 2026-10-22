import type { ResultadoValidacao } from '@/domain/caso.ts'
import type { PlanoComFicha } from '@/domain/fichaNoPlano.ts'
import type { Paciente } from '@/domain/pacientes.ts'
import type { Caso } from '@/domain/tipos.ts'
import { Card, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { CamposDoPlanoSemPaciente } from './CamposDoPlanoSemPaciente.tsx'
import { ResumoDoPaciente } from './ResumoDoPaciente.tsx'

interface CartaoIdentificacaoProps {
  /** O caso guardado: é nele que os campos do plano sem paciente gravam. */
  readonly caso: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  readonly pacientes: readonly { readonly id: string; readonly nome: string }[]
  readonly aoVincularPaciente?: ((pacienteId: string | null) => void) | undefined
  /** A ficha do paciente do plano; `null` sem paciente (ou fora da área de trabalho). */
  readonly paciente: Paciente | null
  readonly comFicha: PlanoComFicha
  readonly aoAlterarPaciente?: ((mudanca: Partial<Paciente>) => void) | undefined
  readonly aoAbrirFicha?: (() => void) | undefined
  readonly erros: ResultadoValidacao['erros']
  readonly idadeAssentada: number | null
  readonly assentarIdade: () => void
}

/**
 * Identificação do plano (spec ficha-unica, D-345): a lista Paciente; com paciente, o resumo da ficha, só de leitura;
 * sem paciente, os dados do caso de estudo. A data da consulta nos dois.
 */
export function CartaoIdentificacao({
  caso,
  aoAlterar,
  pacientes,
  aoVincularPaciente,
  paciente,
  comFicha,
  aoAlterarPaciente,
  aoAbrirFicha,
  erros,
  idadeAssentada,
  assentarIdade,
}: CartaoIdentificacaoProps) {
  const errosDaFicha = [erros.condicao, erros.idadeAnos].filter((e): e is string => e !== undefined)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Identificação</CardTitle>
      </CardHeader>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
        {aoVincularPaciente ? (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="paciente-do-plano">Paciente</Label>
            <select
              id="paciente-do-plano"
              value={caso.pacienteId ?? ''}
              onChange={(e) => aoVincularPaciente(e.target.value || null)}
              className="h-11 w-full min-w-0 truncate rounded-md border border-input bg-card px-3 text-base sm:text-sm"
            >
              <option value="">Sem paciente vinculado</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome.trim() || 'Paciente sem nome'}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {paciente && aoAlterarPaciente ? (
          <ResumoDoPaciente
            paciente={paciente}
            comFicha={comFicha}
            aoAlterarPaciente={aoAlterarPaciente}
            aoUsarDaFicha={() => aoAlterar({ condicao: { tipo: 'nenhuma' } })}
            aoAbrirFicha={aoAbrirFicha}
            erros={errosDaFicha}
          />
        ) : (
          <CamposDoPlanoSemPaciente caso={caso} aoAlterar={aoAlterar} erros={erros} idadeAssentada={idadeAssentada} assentarIdade={assentarIdade} />
        )}

        <CampoTexto rotulo="Data da consulta" tipo="date" valor={caso.dataConsulta ?? ''} aoMudar={(v) => aoAlterar({ dataConsulta: v || null })} />
      </div>
    </Card>
  )
}
