import { useId } from 'react'
import { doencasDaPessoa } from '@/domain/doencas.ts'
import type { Paciente } from '@/domain/pacientes.ts'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { EscolhaMultipla } from './EscolhaMultipla.tsx'

interface CamposDaSaudeProps {
  readonly paciente: Paciente
  readonly aoAlterar: (mudanca: Partial<Paciente>) => void
}

/**
 * Os campos da ficha no bloco Saúde (spec ficha-unica, D-349 e D-360): doenças e diagnósticos em escolhas, com o texto
 * livre de antes em "Outros diagnósticos", e os medicamentos em uso. O Word do plano lê o diagnóstico daqui.
 */
export function CamposDaSaude({ paciente, aoAlterar }: CamposDaSaudeProps) {
  const id = useId()
  const opcoes = doencasDaPessoa(paciente.sexo, paciente.doencas).map((d) => ({ valor: d.id, rotulo: d.rotulo }))
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <span id={`${id}-doencas`} className="text-sm font-medium text-foreground">
          Doenças e diagnósticos
        </span>
        <EscolhaMultipla rotuloId={`${id}-doencas`} opcoes={opcoes} marcados={paciente.doencas} aoMudar={(doencas) => aoAlterar({ doencas })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-outros`}>Outros diagnósticos</Label>
        <Textarea id={`${id}-outros`} rows={2} className="min-h-16" value={paciente.condicoesClinicas} onChange={(e) => aoAlterar({ condicoesClinicas: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-medicamentos`}>Medicamentos em uso</Label>
        <Textarea id={`${id}-medicamentos`} rows={2} className="min-h-16" value={paciente.medicamentos} onChange={(e) => aoAlterar({ medicamentos: e.target.value })} />
      </div>
    </>
  )
}
