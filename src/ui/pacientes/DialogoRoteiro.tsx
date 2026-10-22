import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import {
  acrescentarPergunta,
  BLOCOS_ANAMNESE,
  renomearPergunta,
  ROTEIRO_PADRAO,
  tirarPergunta,
  type IdBloco,
  type RoteiroAnamnese,
} from '@/domain/anamnese.ts'
import { ETIQUETA_DA_REGRA } from '@/domain/regrasDaFicha.ts'
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

/** Os campos da ficha de cada bloco (spec ficha-unica, D-349): aparecem na janela, mas não se editam aqui. */
const CAMPOS_DA_FICHA: Partial<Readonly<Record<IdBloco, string>>> = {
  motivo: 'Objetivo do paciente',
  saude: 'Doenças e diagnósticos, Medicamentos em uso',
  alimentacao: 'Alergias, Intolerâncias, Não come por escolha, Outros alimentos que não come, Óleo, sal e açúcar por mês',
}

/**
 * Editar o roteiro da conta (CA-565; spec ficha-unica, CA-1060): as perguntas de cada bloco, com tirar e adicionar; a
 * etiqueta de quem vê o bloco; os campos da ficha, que não são do roteiro. Nada é gravado antes de "Salvar roteiro".
 */
export function DialogoRoteiro({ roteiro, aoSalvar, aoFechar }: DialogoRoteiroProps) {
  const [rascunho, setRascunho] = useState(roteiro)
  const [nova, setNova] = useState<string | null>(null)

  return (
    <Dialog open onOpenChange={(v) => !v && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Roteiro da anamnese</DialogTitle>
          <DialogDescription>Vale para todos os pacientes. Tirar uma pergunta não apaga as respostas já registradas.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {BLOCOS_ANAMNESE.map(({ id: bloco, titulo, regra }) => {
            const perguntas = rascunho.perguntas[bloco]
            const campos = CAMPOS_DA_FICHA[bloco]
            return (
              <Recolhivel key={bloco} titulo={titulo} resumo={regra ? `${quantas(perguntas.length)} · ${ETIQUETA_DA_REGRA[regra]}` : quantas(perguntas.length)}>
                {campos ? <p className="text-xs text-muted-foreground">{`Campos da ficha, sempre presentes: ${campos}.`}</p> : null}
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
                  aria-label={`Adicionar pergunta em ${titulo}`}
                  onClick={() => {
                    const id = `p-${globalThis.crypto.randomUUID()}`
                    setNova(id)
                    setRascunho((r) => acrescentarPergunta(r, bloco, id))
                  }}
                >
                  <Plus aria-hidden="true" />
                  Adicionar pergunta
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
