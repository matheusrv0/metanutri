import { useId, useRef, useState, type FormEvent } from 'react'
import { codigoCompleto, ehEmailValido, MENSAGEM_ERRO, SENHA_MINIMA, type ErroConta } from '@/domain/conta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import type { Resultado, ValorConta } from '../../estado/usarConta.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { BotaoReenviar } from './BotaoReenviar.tsx'
import { CampoCodigo } from './CampoCodigo.tsx'
import { CampoSenha } from './CampoSenha.tsx'
import { MolduraConta } from './MolduraConta.tsx'
import { useVerificacao } from './usarVerificacao.ts'
import { VerificacaoContraRobos } from './VerificacaoContraRobos.tsx'

interface TelaCodigoSenhaProps {
  readonly conta: ValorConta
  /** O e-mail digitado em "Esqueci a senha". `null` quando a página foi aberta de novo. */
  readonly email: string | null
  readonly aoSenhaTrocada: () => void
  readonly aoIrParaInicio: () => void
}

type Aviso = 'nada' | 'enviado' | ErroConta

/** O código do e-mail e a senha nova, na mesma tela (spec confirmacao-por-codigo, D-90 e CA-412). */
export function TelaCodigoSenha({ conta, email, aoSenhaTrocada, aoIrParaInicio }: TelaCodigoSenhaProps) {
  const id = useId()
  const [digitado, setDigitado] = useState(email ?? '')
  const [codigo, setCodigo] = useState('')
  const [senha, setSenha] = useState('')
  const [repetida, setRepetida] = useState('')
  const [aviso, setAviso] = useState<Aviso>('nada')
  const [salvando, setSalvando] = useState(false)
  const salvandoRef = useRef(false)
  // O código vale uma vez: aceito ele e recusada a senha (sem internet, por exemplo), a
  // nova tentativa só grava a senha, com a sessão de recuperação que o código abriu.
  const codigoAceitoRef = useRef(false)
  // D-113: só o reenvio leva a verificação; conferir o código e gravar a senha não usam (CA-457).
  const verificacao = useVerificacao('reenviar')

  const validar = (): ErroConta | null => {
    if (!ehEmailValido(digitado)) return 'email-invalido'
    if (!codigoCompleto(codigo)) return 'codigo-incompleto'
    if (senha.length < SENHA_MINIMA) return 'senha-curta'
    if (senha !== repetida) return 'senha-diferente'
    return null
  }

  const gravar = async (): Promise<Resultado> => {
    if (!codigoAceitoRef.current) {
      const conferido = await conta.conferirCodigoDeSenha(digitado, codigo)
      if (!conferido.ok) return conferido
      codigoAceitoRef.current = true
    }
    return conta.trocarSenha(senha)
  }

  const salvar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (salvandoRef.current) return
    const problema = validar()
    if (problema) {
      setAviso(problema)
      return
    }
    setAviso('nada')
    salvandoRef.current = true
    setSalvando(true)
    const resultado = await gravar()
    salvandoRef.current = false
    setSalvando(false)
    if (!resultado.ok) {
      setAviso(resultado.erro ?? 'falha-rede')
      return
    }
    aoSenhaTrocada()
  }

  const reenviar = async (): Promise<boolean> => {
    if (!ehEmailValido(digitado)) {
      setAviso('email-invalido')
      return false
    }
    const pedido = verificacao.tomar()
    if (!pedido.ok) {
      setAviso(pedido.erro)
      return false
    }
    const resultado = await conta.pedirTrocaDeSenha(digitado, ...pedido.extra)
    setAviso(resultado.ok ? 'enviado' : (resultado.erro ?? 'falha-rede'))
    return resultado.ok
  }

  const subtitulo =
    email === null
      ? 'Digite o e-mail da conta, o código que mandamos e a senha nova.'
      : `Se existir conta com ${email}, o código chega em alguns minutos. Olhe também o spam.`

  return (
    <MolduraConta titulo="Crie uma senha nova" subtitulo={subtitulo} aoIrParaInicio={aoIrParaInicio}>
      <form onSubmit={(e) => void salvar(e)} noValidate className="flex flex-col gap-4">
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

        <CampoCodigo id={`${id}-codigo`} valor={codigo} aoMudar={setCodigo} invalido={aviso === 'codigo-invalido' || aviso === 'codigo-incompleto'} />
        <CampoSenha
          id={`${id}-nova`}
          rotulo="Senha nova"
          valor={senha}
          aoMudar={setSenha}
          novaSenha
          invalido={aviso === 'senha-curta'}
          dica={`Pelo menos ${SENHA_MINIMA} caracteres.`}
        />
        <CampoSenha id={`${id}-repetida`} rotulo="Repita a senha" valor={repetida} aoMudar={setRepetida} novaSenha invalido={aviso === 'senha-diferente'} />

        {aviso === 'enviado' ? <AvisoFormulario tipo="ok">Mandamos um código novo para {digitado.trim()}.</AvisoFormulario> : null}
        {aviso !== 'nada' && aviso !== 'enviado' ? <AvisoFormulario tipo="erro">{MENSAGEM_ERRO[aviso]}</AvisoFormulario> : null}

        <Button type="submit" size="lg" block loading={salvando}>
          Salvar a senha
        </Button>
      </form>
      <VerificacaoContraRobos verificacao={verificacao}>
        <BotaoReenviar rotulo="Reenviar o código" aoReenviar={reenviar} />
      </VerificacaoContraRobos>
    </MolduraConta>
  )
}
