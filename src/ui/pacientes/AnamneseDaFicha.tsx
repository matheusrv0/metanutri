import { Pencil } from 'lucide-react'
import { useCallback, useId, useState } from 'react'
import { blocosDaFicha, CHAVE_ROTEIRO, gravarRoteiro, lerRoteiro, limparRoteiro, responder, resumoDoBloco, type RoteiroAnamnese } from '@/domain/anamnese.ts'
import type { Paciente } from '@/domain/pacientes.ts'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { Recolhivel } from '@ds/componentes/display/Recolhivel.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { useArmazenamento } from '../estado/contextoArmazenamento.ts'
import { useOutraAbaGravou } from '../estado/usarOutraAba.ts'
import { DialogoRoteiro } from './DialogoRoteiro.tsx'

interface AnamneseDaFichaProps {
  readonly paciente: Paciente
  readonly aoAlterar: (mudanca: Partial<Paciente>) => void
}

/**
 * A anamnese com roteiro (spec anamnese-e-prescricoes, US-AP1): os oito blocos do roteiro da conta, cada um
 * recolhido até ter resposta, e o bloco "Observações" com o texto livre de antes, no mesmo campo (D-162).
 */
export function AnamneseDaFicha({ paciente, aoAlterar }: AnamneseDaFichaProps) {
  const armazenamento = useArmazenamento()
  const [roteiro, setRoteiro] = useState<RoteiroAnamnese>(() => lerRoteiro(armazenamento))
  const [editando, setEditando] = useState(false)
  const [naoGuardou, setNaoGuardou] = useState(false)
  const id = useId()

  // CB-124 (spec dados-na-nuvem): outra aba da conta salvou o roteiro; esta relê.
  const reler = useCallback(() => setRoteiro(lerRoteiro(armazenamento)), [armazenamento])
  useOutraAbaGravou(CHAVE_ROTEIRO, reler)

  const salvarRoteiro = (novo: RoteiroAnamnese) => {
    const guardou = gravarRoteiro(armazenamento, novo)
    // CB-160: sem armazenamento, o roteiro vale até fechar a página.
    setRoteiro(guardou ? lerRoteiro(armazenamento) : limparRoteiro(novo))
    setNaoGuardou(!guardou)
    setEditando(false)
  }

  const blocos = blocosDaFicha(roteiro, paciente.respostasAnamnese)
  const temObservacoes = paciente.anamnese.trim() !== '' || paciente.observacoes.trim() !== ''

  return (
    <Card role="region" aria-labelledby={`${id}-titulo`}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id={`${id}-titulo`}>Anamnese</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setEditando(true)}>
            <Pencil aria-hidden="true" />
            Editar roteiro
          </Button>
        </div>
        <CardDescription>Todas as perguntas são opcionais.</CardDescription>
      </CardHeader>

      {naoGuardou ? (
        <p role="status" className="text-xs text-warningtext">
          Este navegador não guardou o roteiro. Ele vale até fechar a página.
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        {blocos.map((bloco) => (
          <Recolhivel key={bloco.id} titulo={bloco.titulo} resumo={resumoDoBloco(bloco)} abertoInicial={bloco.respondidas > 0}>
            {bloco.perguntas.map((pergunta) => {
              const campo = `${id}-${bloco.id}-${pergunta.id}`
              return (
                <div key={pergunta.id} data-pergunta="" className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label htmlFor={campo}>{pergunta.texto}</Label>
                    {pergunta.foraDoRoteiro ? <Badge variant="muted">Fora do roteiro</Badge> : null}
                  </div>
                  <Textarea
                    id={campo}
                    rows={2}
                    className="min-h-16"
                    value={pergunta.resposta}
                    placeholder={bloco.id === 'recordatorio' ? 'Horário, o que comeu e quanto…' : undefined}
                    onChange={(e) => aoAlterar({ respostasAnamnese: responder(paciente.respostasAnamnese, pergunta, bloco.id, e.target.value) })}
                  />
                </div>
              )
            })}
          </Recolhivel>
        ))}

        <Recolhivel titulo="Observações" abertoInicial={temObservacoes}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="anamnese">Anotações</Label>
            <Textarea id="anamnese" rows={4} value={paciente.anamnese} onChange={(e) => aoAlterar({ anamnese: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="obs-paciente">Observações</Label>
            <Textarea id="obs-paciente" rows={3} value={paciente.observacoes} onChange={(e) => aoAlterar({ observacoes: e.target.value })} />
          </div>
        </Recolhivel>
      </div>

      {editando ? <DialogoRoteiro roteiro={roteiro} aoSalvar={salvarRoteiro} aoFechar={() => setEditando(false)} /> : null}
    </Card>
  )
}
