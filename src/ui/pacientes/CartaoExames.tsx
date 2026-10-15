import { Eraser, Printer } from 'lucide-react'
import { useId, useState } from 'react'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { dataDeHoje } from '@/domain/documentoDoPaciente.ts'
import { EXAMES, limparPedido, marcarExame, pedidoVazio } from '@/domain/exames.ts'
import type { Paciente } from '@/domain/pacientes.ts'
import { Card, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { DialogoDocumento } from '../exportar/DialogoDocumento.tsx'
import { FolhaExames } from '../exportar/FolhaExames.tsx'

interface CartaoExamesProps {
  readonly paciente: Paciente
  /** Quem assina a folha (D-167). */
  readonly assinatura: AssinaturaDoPlano | null
  /** O exportar bloqueado pelo CRN (CA-290): a folha fica desligada com o mesmo aviso da dieta (CA-578, CA-581). */
  readonly bloqueio: string | null
  readonly aoAlterar: (mudanca: Partial<Paciente>) => void
}

/**
 * O pedido de exames do paciente (spec anamnese-e-prescricoes, US-AP3): dez exames para marcar, nenhum marcado
 * sozinho (D-164), o campo "Outros exames" e a folha para imprimir.
 */
export function CartaoExames({ paciente, assinatura, bloqueio, aoAlterar }: CartaoExamesProps) {
  const [dataDaFolha, setDataDaFolha] = useState<string | null>(null)
  const id = useId()
  const pedido = paciente.pedidoExames
  const marcados = new Set(pedido.marcados)
  const vazio = pedidoVazio(pedido)

  return (
    <Card role="region" aria-labelledby={`${id}-titulo`}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id={`${id}-titulo`}>Pedido de exames</CardTitle>
          <div className="flex flex-wrap gap-2">
            {/* CA-579: começa um pedido novo. Sem nada no pedido, não há o que limpar. */}
            <Button size="sm" variant="ghost" disabled={vazio} onClick={() => aoAlterar({ pedidoExames: limparPedido(pedido) })}>
              <Eraser aria-hidden="true" />
              Limpar pedido
            </Button>
            <Button size="sm" variant="outline" disabled={vazio || bloqueio !== null} aria-describedby={bloqueio ? `${id}-bloqueio` : vazio ? `${id}-vazio` : undefined} onClick={() => setDataDaFolha(dataDeHoje())}>
              <Printer aria-hidden="true" />
              Imprimir pedido
            </Button>
          </div>
        </div>
      </CardHeader>

      {bloqueio ? (
        <p id={`${id}-bloqueio`} className="text-xs text-warningtext">
          {bloqueio}
        </p>
      ) : null}

      <fieldset className="min-w-0">
        <legend className="sr-only">Exames</legend>
        <div className="grid gap-x-4 sm:grid-cols-2">
          {EXAMES.map((exame) => (
            <label key={exame.id} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={marcados.has(exame.id)}
                onChange={(e) => aoAlterar({ pedidoExames: marcarExame(pedido, exame.id, e.target.checked) })}
                className="size-5 shrink-0 cursor-pointer accent-[var(--brand-primary)]"
              />
              <span>{exame.nome}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-outros`}>Outros exames</Label>
        <Textarea
          id={`${id}-outros`}
          rows={3}
          className="min-h-20"
          value={pedido.outros}
          placeholder="Um por linha…"
          onChange={(e) => aoAlterar({ pedidoExames: { ...pedido, outros: e.target.value } })}
        />
      </div>

      {vazio ? (
        <p id={`${id}-vazio`} className="text-xs text-muted-foreground">
          Marque um exame ou escreva em Outros exames.
        </p>
      ) : null}

      {dataDaFolha !== null ? (
        <DialogoDocumento titulo="Pedido de exames para imprimir" aoFechar={() => setDataDaFolha(null)}>
          <FolhaExames paciente={paciente.nome} nascimento={paciente.nascimento} pedido={pedido} assinatura={assinatura} data={dataDaFolha} />
        </DialogoDocumento>
      ) : null}
    </Card>
  )
}
