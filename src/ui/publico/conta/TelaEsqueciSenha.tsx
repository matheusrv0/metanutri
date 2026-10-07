import { useId, useRef, useState, type FormEvent } from 'react'
import { ehEmailValido, MENSAGEM_ERRO, type ErroConta } from '@/domain/conta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import type { ValorConta } from '../../estado/usarConta.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { MolduraConta } from './MolduraConta.tsx'

interface TelaEsqueciSenhaProps {
  readonly conta: ValorConta
  /** O código foi pedido: segue para a tela que pede o código e a senha nova (CA-412). */
  readonly aoEnviado: (email: string) => void
  readonly aoIrParaInicio: () => void
  readonly aoEntrar: () => void
}

/** Pedir o código de troca de senha (spec confirmacao-por-codigo, D-90; spec estilo-spora, CA-144). */
export function TelaEsqueciSenha({ conta, aoEnviado, aoIrParaInicio, aoEntrar }: TelaEsqueciSenhaProps) {
  const id = useId()
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<ErroConta | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    if (!ehEmailValido(email)) {
      setErro('email-invalido')
      return
    }
    setErro(null)
    enviandoRef.current = true
    setEnviando(true)
    // CA-144: a resposta é a mesma exista a conta ou não; só a falta de internet volta como erro.
    const resultado = await conta.pedirTrocaDeSenha(email)
    enviandoRef.current = false
    setEnviando(false)
    if (!resultado.ok) {
      setErro(resultado.erro ?? 'falha-rede')
      return
    }
    aoEnviado(email.trim())
  }

  return (
    <MolduraConta titulo="Esqueci a senha" subtitulo="Digite o e-mail da conta. Mandamos um código para criar uma senha nova." aoIrParaInicio={aoIrParaInicio}>
      <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-email`}>E-mail</Label>
          <Input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            aria-invalid={erro === 'email-invalido'}
          />
        </div>
        {erro ? <AvisoFormulario tipo="erro">{MENSAGEM_ERRO[erro]}</AvisoFormulario> : null}
        <Button type="submit" size="lg" block loading={enviando}>
          Mandar o código
        </Button>
        <button type="button" onClick={aoEntrar} className="inline-flex min-h-11 items-center self-center rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Lembrei, quero entrar
        </button>
      </form>
    </MolduraConta>
  )
}
