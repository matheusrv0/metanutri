import { ChevronsDownUp, ChevronsUpDown, Pencil } from 'lucide-react'
import { useCallback, useId, useState } from 'react'
import { blocosDaFicha, CHAVE_ROTEIRO, dicaDaPergunta, gravarRoteiro, lerRoteiro, limparRoteiro, responder, resumoDoBloco, type RoteiroAnamnese } from '@/domain/anamnese.ts'
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

/** O último bloco, fora do roteiro (CA-564). */
const OUTRAS = 'outras-anotacoes'

/**
 * A anamnese com roteiro (spec anamnese-e-prescricoes, US-AP1): os oito blocos do roteiro da conta, todos
 * recolhidos ao abrir a ficha, com o resumo das respostas à vista (CA-563), e o bloco "Outras anotações", com o
 * texto livre de antes no mesmo campo (D-162). Quem usa leva a chave do paciente: o estado não passa de uma ficha
 * para outra.
 */
export function AnamneseDaFicha({ paciente, aoAlterar }: AnamneseDaFichaProps) {
  const armazenamento = useArmazenamento()
  const [roteiro, setRoteiro] = useState<RoteiroAnamnese>(() => lerRoteiro(armazenamento))
  const [editando, setEditando] = useState(false)
  const [naoGuardou, setNaoGuardou] = useState(false)
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(() => new Set())
  // CA-564: "Anamnese de antes" aparece quando a ficha abre com texto; não some no meio de uma edição.
  const [comAnamneseDeAntes] = useState(() => paciente.anamnese.trim() !== '')
  const id = useId()

  // CB-124 (spec dados-na-nuvem): outra aba da conta salvou o roteiro; esta relê.
  const reler = useCallback(() => setRoteiro(lerRoteiro(armazenamento)), [armazenamento])
  useOutraAbaGravou(CHAVE_ROTEIRO, reler)

  // CA-565: a janela sempre parte do roteiro salvo mais recente. Sem armazenamento (CB-160), vale o desta página.
  const editarRoteiro = () => {
    if (!naoGuardou) setRoteiro(lerRoteiro(armazenamento))
    setEditando(true)
  }

  const salvarRoteiro = (novo: RoteiroAnamnese) => {
    const guardou = gravarRoteiro(armazenamento, novo)
    // CB-160: sem armazenamento, o roteiro vale até fechar a página.
    setRoteiro(guardou ? lerRoteiro(armazenamento) : limparRoteiro(novo))
    setNaoGuardou(!guardou)
    setEditando(false)
  }

  const blocos = blocosDaFicha(roteiro, paciente.respostasAnamnese)
  const todos = [...blocos.map((b) => b.id), OUTRAS]
  const tudoAberto = todos.every((b) => abertos.has(b))
  const alternar = (bloco: string) => (aberto: boolean) =>
    setAbertos((atuais) => {
      const novos = new Set(atuais)
      if (aberto) novos.add(bloco)
      else novos.delete(bloco)
      return novos
    })
  const temAnotacoes = paciente.anamnese.trim() !== '' || paciente.observacoes.trim() !== ''

  return (
    <Card role="region" aria-labelledby={`${id}-titulo`}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle id={`${id}-titulo`}>Anamnese</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAbertos(tudoAberto ? new Set() : new Set(todos))}>
              {tudoAberto ? <ChevronsDownUp aria-hidden="true" /> : <ChevronsUpDown aria-hidden="true" />}
              {tudoAberto ? 'Recolher tudo' : 'Abrir tudo'}
            </Button>
            <Button size="sm" variant="outline" onClick={editarRoteiro}>
              <Pencil aria-hidden="true" />
              Editar roteiro
            </Button>
          </div>
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
          <Recolhivel key={bloco.id} titulo={bloco.titulo} resumo={resumoDoBloco(bloco)} aberto={abertos.has(bloco.id)} aoAlternar={alternar(bloco.id)}>
            {bloco.perguntas.map((pergunta) => {
              const campo = `${id}-${bloco.id}-${pergunta.id}`
              const dica = dicaDaPergunta(pergunta.id)
              return (
                <div key={pergunta.id} data-pergunta="" className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label htmlFor={campo}>{pergunta.texto}</Label>
                    {pergunta.foraDoRoteiro ? <Badge variant="muted">Fora do roteiro</Badge> : null}
                  </div>
                  {dica ? (
                    <p id={`${campo}-dica`} className="text-xs text-muted-foreground">
                      {dica}
                    </p>
                  ) : null}
                  <Textarea
                    id={campo}
                    aria-describedby={dica ? `${campo}-dica` : undefined}
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

        <Recolhivel titulo="Outras anotações" resumo={temAnotacoes ? 'Com anotações' : 'Sem anotações'} aberto={abertos.has(OUTRAS)} aoAlternar={alternar(OUTRAS)}>
          {comAnamneseDeAntes ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="anamnese">Anamnese de antes</Label>
              <Textarea id="anamnese" rows={4} value={paciente.anamnese} onChange={(e) => aoAlterar({ anamnese: e.target.value })} />
            </div>
          ) : null}
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
