import { UserRound } from 'lucide-react'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import type { Caso } from '@/domain/tipos.ts'
import { Card, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'

interface CartaoIdentificacaoProps {
  readonly caso: Caso
  readonly aoAlterar: (mudanca: Partial<Caso>) => void
  readonly pacientes: readonly { readonly id: string; readonly nome: string }[]
  readonly aoVincularPaciente?: ((pacienteId: string | null) => void) | undefined
  readonly assinatura?: AssinaturaDoPlano | null | undefined
  /** Estagiário(a) e Preceptor(a) aparecem (spec ajustes-de-uso, CA-251 e CB-51). */
  readonly camposDeEstagio: boolean
}

/** Identificação do plano: o que sai no cabeçalho dos documentos (CA-329). */
export function CartaoIdentificacao({ caso, aoAlterar, pacientes, aoVincularPaciente, assinatura, camposDeEstagio }: CartaoIdentificacaoProps) {
  const situacao = assinatura?.situacao ?? null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Identificação</CardTitle>
      </CardHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        {aoVincularPaciente ? (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="paciente-do-plano">Paciente</Label>
            <select
              id="paciente-do-plano"
              value={caso.pacienteId ?? ''}
              onChange={(e) => aoVincularPaciente(e.target.value || null)}
              className="h-10 rounded-md border border-input bg-card px-3 text-sm"
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
        <CampoTexto rotulo="Nome do plano" valor={caso.nome} aoMudar={(v) => aoAlterar({ nome: v })} placeholder="Maria, 28 anos…" />
        <CampoTexto rotulo="Data da consulta" tipo="date" valor={caso.dataConsulta ?? ''} aoMudar={(v) => aoAlterar({ dataConsulta: v || null })} />
        <CampoTexto rotulo="Diagnóstico clínico" valor={caso.diagnosticoClinico} aoMudar={(v) => aoAlterar({ diagnosticoClinico: v })} />
        <CampoTexto rotulo="Ocupação" valor={caso.ocupacao} aoMudar={(v) => aoAlterar({ ocupacao: v })} />
        {camposDeEstagio ? (
          <>
            <CampoTexto rotulo="Estagiário(a)" valor={caso.estagiario} aoMudar={(v) => aoAlterar({ estagiario: v })} />
            <CampoTexto rotulo="Preceptor(a)" valor={caso.preceptor} aoMudar={(v) => aoAlterar({ preceptor: v })} />
          </>
        ) : null}
      </div>

      {camposDeEstagio && situacao === 'estudante' && assinatura ? (
        <p className="text-xs text-muted-foreground">
          {assinatura.origem === 'conta'
            ? 'Em plano novo, Estagiário(a) vem do nome da sua conta e Preceptor(a) de Configurações › Quem assina. Dá para trocar neste plano.'
            : 'Em plano novo, Estagiário(a) e Preceptor(a) vêm de Configurações › Quem assina. Dá para trocar neste plano.'}
        </p>
      ) : null}

      {camposDeEstagio || !assinatura ? null : (
        <div className="flex items-center gap-3 rounded-lg bg-lightprimary px-4 py-3">
          <UserRound className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm text-foreground">
            Assina este plano:{' '}
            <strong className="font-semibold text-heading">{assinatura.linhaNutricionista ?? 'nome e CRN não informados'}</strong>
            <span className="block text-xs text-muted-foreground">
              {assinatura.linhaNutricionista === null
                ? assinatura.origem === 'conta'
                  ? 'Confira nome e CRN em Conta e plano.'
                  : 'Preencha em Configurações › Quem assina.'
                : assinatura.origem === 'conta'
                  ? 'Vem do seu cadastro.'
                  : 'Vem de Configurações › Quem assina.'}
            </span>
          </p>
        </div>
      )}
    </Card>
  )
}
