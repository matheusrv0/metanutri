import { useId, useState, type FormEvent } from 'react'
import { MENSAGEM_ERRO, SENHA_MINIMA, type ErroConta } from '@/domain/conta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import type { ValorConta } from '../../estado/usarConta.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { CampoSenha } from './CampoSenha.tsx'
import { MolduraConta } from './MolduraConta.tsx'

interface TelaNovaSenhaProps {
  readonly conta: ValorConta
  readonly vencido: boolean
  readonly aoSenhaTrocada: () => void
  readonly aoPedirOutro: () => void
  readonly aoIrParaInicio: () => void
}

/** Senha nova, depois do link do e-mail (spec estilo-spora, CA-145 a CA-147). */
export function TelaNovaSenha({ conta, vencido, aoSenhaTrocada, aoPedirOutro, aoIrParaInicio }: TelaNovaSenhaProps) {
  const id = useId()
  const [senha, setSenha] = useState('')
  const [repetida, setRepetida] = useState('')
  const [erro, setErro] = useState<ErroConta | null>(null)
  const [salvando, setSalvando] = useState(false)
  // Só dá para trocar quem chegou pelo link (modo de recuperação) ou já está conectado.
  const podeTrocar = !vencido && (conta.emRecuperacao || conta.sessao !== null)

  if (!podeTrocar) {
    return (
      <MolduraConta titulo="Este link não vale mais" subtitulo="O link de troca de senha venceu ou já foi usado. Peça outro, ele chega em alguns minutos." aoIrParaInicio={aoIrParaInicio}>
        <Button size="lg" block onClick={aoPedirOutro}>
          Pedir outro link
        </Button>
      </MolduraConta>
    )
  }

  const salvar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (senha.length < SENHA_MINIMA) {
      setErro('senha-curta')
      return
    }
    if (senha !== repetida) {
      setErro('senha-diferente')
      return
    }
    setErro(null)
    setSalvando(true)
    const resultado = await conta.trocarSenha(senha)
    setSalvando(false)
    if (!resultado.ok) {
      setErro(resultado.erro)
      return
    }
    aoSenhaTrocada()
  }

  return (
    <MolduraConta titulo="Crie uma senha nova" subtitulo={`Pelo menos ${SENHA_MINIMA} caracteres.`} aoIrParaInicio={aoIrParaInicio}>
      <form onSubmit={(e) => void salvar(e)} noValidate className="flex flex-col gap-4">
        <CampoSenha id={`${id}-nova`} rotulo="Senha nova" valor={senha} aoMudar={setSenha} novaSenha invalido={erro === 'senha-curta'} />
        <CampoSenha id={`${id}-repetida`} rotulo="Repita a senha" valor={repetida} aoMudar={setRepetida} novaSenha invalido={erro === 'senha-diferente'} />
        {erro ? <AvisoFormulario tipo="erro">{MENSAGEM_ERRO[erro]}</AvisoFormulario> : null}
        <Button type="submit" size="lg" block loading={salvando}>
          Salvar a senha
        </Button>
      </form>
    </MolduraConta>
  )
}
