import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import {
  acrescentarPergunta,
  BLOCOS_ANAMNESE,
  renomearPergunta,
  ROTEIRO_PADRAO,
  tirarPergunta,
  type RoteiroAnamnese,
} from '@/domain/anamnese.ts'
import { Recolhivel } from '@ds/componentes/display/Recolhivel.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'

interface DialogoRoteiroProps {
  /** O roteiro de agora; a janela trabalha numa cópia até "Salvar roteiro". */
  readonly roteiro: RoteiroAnamnese
  readonly aoSalvar: (roteiro: RoteiroAnamnese) => void
  readonly aoFechar: () => void
}

const quantas = (n: number) => (n === 0 ? 'Nenhuma pergunta' : n === 1 ? '1 pergunta' : `${n} perguntas`)

/**
 * Editar o roteiro da conta (CA-565): as perguntas de cada bloco, com tirar e acrescentar. Os blocos são
 * fixos (D-160). Nada é gravado antes de "Salvar roteiro"; "Cancelar" e fechar descartam.
 */
export function DialogoRoteiro({ roteiro, aoSalvar, aoFechar }: DialogoRoteiroProps) {
  const [rascunho, setRascunho] = useState(roteiro)
  const [nova, setNova] = useState<string | null>(null)

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Roteiro da anamnese</DialogTitle>
          <DialogDescription>Vale para todos os pacientes. Tirar uma pergunta não apaga as respostas já escritas.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {BLOCOS_ANAMNESE.map(({ id: bloco, titulo }) => {
            const perguntas = rascunho.perguntas[bloco]
            return (
              <Recolhivel key={bloco} titulo={titulo} resumo={quantas(perguntas.length)}>
                <ol className="flex flex-col gap-2">
                  {perguntas.map((pergunta, i) => (
                    <li key={pergunta.id} className="flex items-center gap-2">
                      <Input
                        aria-label={`Pergunta ${i + 1} de ${titulo}`}
                        value={pergunta.texto}
                        maxLength={200}
                        autoFocus={pergunta.id === nova}
                        onChange={(e) => setRascunho((r) => renomearPergunta(r, bloco, pergunta.id, e.target.value))}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Tirar a pergunta ${i + 1} de ${titulo}`}
                        onClick={() => setRascunho((r) => tirarPergunta(r, bloco, pergunta.id))}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ol>
                <Button
                  size="sm"
                  variant="ghost"
                  className="self-start"
                  aria-label={`Acrescentar pergunta em ${titulo}`}
                  onClick={() => {
                    const id = `p-${globalThis.crypto.randomUUID()}`
                    setNova(id)
                    setRascunho((r) => acrescentarPergunta(r, bloco, id))
                  }}
                >
                  <Plus aria-hidden="true" />
                  Acrescentar pergunta
                </Button>
              </Recolhivel>
            )
          })}
        </div>

        <DialogFooter className="sm:justify-between">
          {/* CA-589: os blocos que esta versão não conhece continuam guardados. */}
          <Button variant="ghost" onClick={() => setRascunho((r) => ({ ...ROTEIRO_PADRAO, outros: r.outros }))}>
            Voltar ao roteiro padrão
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="ghost" onClick={aoFechar}>
              Cancelar
            </Button>
            <Button onClick={() => aoSalvar(rascunho)}>Salvar roteiro</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
