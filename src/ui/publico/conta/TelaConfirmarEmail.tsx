import { useId, useRef, useState, type FormEvent } from 'react'
import { codigoCompleto, ehEmailValido, MENSAGEM_ERRO, type ErroConta } from '@/domain/conta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import type { ResultadoConfirmacao, ValorConta } from '../../estado/usarConta.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { BotaoReenviar } from './BotaoReenviar.tsx'
import { CampoCodigo } from './CampoCodigo.tsx'
import { MolduraConta } from './MolduraConta.tsx'

interface TelaConfirmarEmailProps {
  readonly conta: ValorConta
  /** O e-mail do cadastro recém-feito, ou de quem tentou entrar sem confirmar. `null` quando a página foi aberta de novo. */
  readonly email: string | null
  /** Chegou por um link antigo de confirmação, que venceu ou já foi usado (CA-414). */
  readonly vencido: boolean
  /** Sem ele, a logo não leva a lugar nenhum: o e-mail está pendente e a pessoa fica aqui (D-93). */
  readonly aoIrParaInicio?: (() => void) | undefined
  /** Só com o e-mail pendente: esquece o e-mail e volta ao cadastro (CA-418). */
  readonly aoErreiOEmail?: (() => void) | undefined
  readonly aoConfirmado: (resultado: ResultadoConfirmacao) => void
}

type Aviso = 'nada' | 'enviado' | ErroConta

/**
 * Confirmar o e-mail com o código de 6 dígitos (spec confirmacao-por-codigo, CA-406 a
 * CA-410). O e-mail não traz link: o antivírus do Microsoft 365 abre todo link sozinho e
 * confirmava a conta sem a dona da caixa.
 */
export function TelaConfirmarEmail({ conta, email, vencido, aoIrParaInicio, aoErreiOEmail, aoConfirmado }: TelaConfirmarEmailProps) {
  const id = useId()
  const [digitado, setDigitado] = useState(email ?? '')
  const [codigo, setCodigo] = useState('')
  const [aviso, setAviso] = useState<Aviso>('nada')
  const [confirmando, setConfirmando] = useState(false)
  // Trava de verdade contra o clique duplo (CB-101): o estado só muda no próximo render.
  const confirmandoRef = useRef(false)

  const confirmar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (confirmandoRef.current) return
    if (!ehEmailValido(digitado)) {
      setAviso('email-invalido')
      return
    }
    if (!codigoCompleto(codigo)) {
      setAviso('codigo-incompleto')
      return
    }
    setAviso('nada')
    confirmandoRef.current = true
    setConfirmando(true)
    const resultado = await conta.confirmarCodigo(digitado, codigo)
    confirmandoRef.current = false
    setConfirmando(false)
    // Código errado, vencido ou sem internet: só o aviso muda, o código fica no campo (CA-408, CB-102).
    if (!resultado.ok) {
      setAviso(resultado.erro ?? 'falha-rede')
      return
    }
    aoConfirmado(resultado)
  }

  const reenviar = async (): Promise<boolean> => {
    if (!ehEmailValido(digitado)) {
      setAviso('email-invalido')
      return false
    }
    const resultado = await conta.reenviarConfirmacao(digitado)
    setAviso(resultado.ok ? 'enviado' : (resultado.erro ?? 'falha-rede'))
    return resultado.ok
  }

  const codigoErrado = aviso === 'codigo-invalido' || aviso === 'codigo-incompleto'
  const subtitulo = vencido
    ? 'O link de confirmação venceu ou já foi usado.'
    : email === null
      ? 'Digite o e-mail da conta e o código que mandamos. Não chegou? Olhe a caixa de spam.'
      : `Mandamos um código para ${email}. Não chegou? Olhe a caixa de spam.`

  return (
    <MolduraConta titulo={vencido ? 'Este link não vale mais' : 'Confira seu e-mail'} subtitulo={subtitulo} aoIrParaInicio={aoIrParaInicio}>
      <form onSubmit={(e) => void confirmar(e)} noValidate className="flex flex-col gap-4">
        {email === null ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-email`}>E-mail</Label>
            <Input
              id={`${id}-email`}
              type="email"
              autoComplete="email"
              spellCheck={false}
              value={digitado}
              onChange={(e) => setDigitado(e.target.value)}
              placeholder="voce@exemplo.com"
              aria-invalid={aviso === 'email-invalido'}
            />
          </div>
        ) : null}

        <CampoCodigo id={`${id}-codigo`} valor={codigo} aoMudar={setCodigo} invalido={codigoErrado} />

        {aviso === 'enviado' ? <AvisoFormulario tipo="ok">Mandamos um código novo para {digitado.trim()}.</AvisoFormulario> : null}
        {aviso !== 'nada' && aviso !== 'enviado' ? <AvisoFormulario tipo="erro">{MENSAGEM_ERRO[aviso]}</AvisoFormulario> : null}

        <Button type="submit" size="lg" block loading={confirmando}>
          Confirmar
        </Button>
      </form>
      <BotaoReenviar rotulo={vencido ? 'Pedir um código' : 'Reenviar o código'} aoReenviar={reenviar} />
      {aoErreiOEmail ? (
        <Button variant="link" size="lg" block onClick={aoErreiOEmail}>
          Errei o e-mail
        </Button>
      ) : null}
    </MolduraConta>
  )
}
