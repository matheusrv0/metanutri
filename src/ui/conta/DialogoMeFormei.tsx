import { TriangleAlert } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { MENSAGEM_ERRO_SITUACAO, normalizarNumeroCrn, validarCrn, type Crn } from '@/domain/situacao.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@ds/componentes/overlay/dialog.tsx'
import { CaixaDeclaracao } from '../publico/conta/CaixaDeclaracao.tsx'
import { CampoCrn } from '../publico/conta/CampoCrn.tsx'

interface DialogoMeFormeiProps {
  readonly aberto: boolean
  readonly aoFechar: () => void
  readonly meFormei: (crn: Crn) => Promise<string | null>
  readonly aoFormado: () => void
}

/** CA-286 a CA-288: a única troca de situação que existe na tela, e ela pede o CRN. */
export function DialogoMeFormei({ aberto, aoFechar, meFormei, aoFormado }: DialogoMeFormeiProps) {
  const id = useId()
  const [regiao, setRegiao] = useState<number | null>(null)
  const [numero, setNumero] = useState('')
  const [declarou, setDeclarou] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [crnInvalido, setCrnInvalido] = useState(false)
  const [declaracaoInvalida, setDeclaracaoInvalida] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)

  const confirmar = async () => {
    if (enviandoRef.current) return
    const problema = validarCrn(regiao, numero) ?? (declarou ? null : 'declaracao-crn')
    if (problema || regiao === null) {
      const problemaFinal = problema ?? 'crn-regiao'
      setErro(MENSAGEM_ERRO_SITUACAO[problemaFinal])
      setCrnInvalido(problemaFinal === 'crn-regiao' || problemaFinal === 'crn-numero')
      setDeclaracaoInvalida(problemaFinal === 'declaracao-crn')
      return
    }
    setCrnInvalido(false)
    setDeclaracaoInvalida(false)
    enviandoRef.current = true
    setEnviando(true)
    const falha = await meFormei({ regiao, numero: normalizarNumeroCrn(numero) })
    enviandoRef.current = false
    setEnviando(false)
    if (falha) {
      setErro(falha)
      return
    }
    aoFormado()
  }

  return (
    <Dialog open={aberto} onOpenChange={(abrir) => (abrir ? undefined : aoFechar())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Me formei</DialogTitle>
          <DialogDescription>Informe seu CRN para a conta passar a ser de nutricionista.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <CampoCrn
            id={id}
            regiao={regiao}
            numero={numero}
            aoMudar={(crn) => {
              setRegiao(crn.regiao)
              setNumero(crn.numero)
            }}
            invalido={crnInvalido}
          />
          <CaixaDeclaracao id={`${id}-declara`} marcada={declarou} aoMudar={setDeclarou} invalido={declaracaoInvalida}>
            Declaro que este CRN é meu e está ativo.
          </CaixaDeclaracao>
          <div className="flex items-start gap-2 rounded-xl bg-lightwarning p-3 text-sm text-warningtext">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>O plano Estudante termina agora e a conta vai para o Free. Seus planos alimentares e pacientes continuam salvos.</p>
          </div>
          {erro ? (
            <p role="alert" className="text-sm text-errortext">
              {erro}
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button onClick={() => void confirmar()} loading={enviando}>
            Mudar para nutricionista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
