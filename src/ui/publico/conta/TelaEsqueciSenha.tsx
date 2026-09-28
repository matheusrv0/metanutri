import { useId, useState, type FormEvent } from 'react'
import { ehEmailValido, MENSAGEM_ERRO, type ErroConta } from '@/domain/conta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import type { ValorConta } from '../../estado/usarConta.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { MolduraConta } from './MolduraConta.tsx'

interface TelaEsqueciSenhaProps {
  readonly conta: ValorConta
  readonly aoIrParaInicio: () => void
  readonly aoEntrar: () => void
}

/** Pedir o link de troca de senha (spec estilo-spora, CA-144). */
export function TelaEsqueciSenha({ conta, aoIrParaInicio, aoEntrar }: TelaEsqueciSenhaProps) {
  const id = useId()
  const [email, setEmail] = useState('')
  const [estado, setEstado] = useState<'nada' | 'enviado' | ErroConta>('nada')
  const [enviando, setEnviando] = useState(false)

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (!ehEmailValido(email)) {
      setEstado('email-invalido')
      return
    }
    setEnviando(true)
    const resultado = await conta.pedirTrocaDeSenha(email)
    setEnviando(false)
    setEstado(resultado.ok ? 'enviado' : (resultado.erro ?? 'falha-rede'))
  }

  return (
    <MolduraConta titulo="Esqueci a senha" subtitulo="Digite o e-mail da conta. Mandamos um link para criar uma senha nova." aoIrParaInicio={aoIrParaInicio}>
      <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-email`}>E-mail</Label>
          <Input id={`${id}-email`} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
        </div>
        {estado === 'enviado' ? <AvisoFormulario tipo="ok">Se existir conta com esse e-mail, o link chega em alguns minutos. Olhe também o spam.</AvisoFormulario> : null}
        {estado !== 'nada' && estado !== 'enviado' ? <AvisoFormulario tipo="erro">{MENSAGEM_ERRO[estado]}</AvisoFormulario> : null}
        <Button type="submit" size="lg" block loading={enviando}>
          Mandar o link
        </Button>
        <button type="button" onClick={aoEntrar} className="inline-flex min-h-11 items-center self-center rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Lembrei, quero entrar
        </button>
      </form>
    </MolduraConta>
  )
}
