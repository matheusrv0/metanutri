import { useId, useState, type FormEvent } from 'react'
import { MENSAGEM_ERRO, SENHA_MINIMA, type ErroConta } from '@/domain/conta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import type { ValorConta } from '../../estado/usarConta.ts'
import { DIGITOS_DO_APP } from '../../estado/usarSegundoFator.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { CampoCodigo } from './CampoCodigo.tsx'
import { CampoSenha } from './CampoSenha.tsx'
import { MolduraConta } from './MolduraConta.tsx'

interface TelaNovaSenhaProps {
  readonly conta: ValorConta
  readonly vencido: boolean
  readonly aoSenhaTrocada: () => void
  readonly aoPedirOutro: () => void
  readonly aoIrParaInicio: () => void
}

/**
 * Senha nova, depois do link do e-mail (spec estilo-spora, CA-145 a CA-147). O e-mail
 * agora traz código (TelaCodigoSenha); esta tela fica para o link antigo (spec
 * confirmacao-por-codigo, CA-414).
 */
export function TelaNovaSenha({ conta, vencido, aoSenhaTrocada, aoPedirOutro, aoIrParaInicio }: TelaNovaSenhaProps) {
  const id = useId()
  const [senha, setSenha] = useState('')
  const [repetida, setRepetida] = useState('')
  const [erro, setErro] = useState<ErroConta | null>(null)
  const [salvando, setSalvando] = useState(false)
  // D-268: conta com o app autenticador; o servidor pediu o código do app para gravar a senha.
  const [pedeApp, setPedeApp] = useState(false)
  const [codigoApp, setCodigoApp] = useState('')
  // Só troca quem confirmou o código de troca (ou o link) agora: a sessão aberta sozinha não basta, para quem
  // pega um computador com a conta aberta não trocar a senha de outra pessoa (spec seguranca-lote-5, D-266).
  const podeTrocar = !vencido && conta.emRecuperacao

  if (!podeTrocar) {
    return (
      <MolduraConta titulo="Este link não vale mais" subtitulo="O link de troca de senha venceu ou já foi usado." aoIrParaInicio={aoIrParaInicio}>
        <Button size="lg" block onClick={aoPedirOutro}>
          Pedir um código
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
    if (pedeApp && codigoApp.length !== DIGITOS_DO_APP) {
      setErro('codigo-do-app-incompleto')
      return
    }
    setErro(null)
    setSalvando(true)
    const resultado = pedeApp ? await conta.trocarSenha(senha, codigoApp) : await conta.trocarSenha(senha)
    setSalvando(false)
    if (!resultado.ok) {
      if (resultado.erro === 'precisa-codigo-do-app') setPedeApp(true)
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
        {pedeApp ? (
          <CampoCodigo
            id={`${id}-app`}
            rotulo={`Código do app (${DIGITOS_DO_APP} dígitos)`}
            digitos={DIGITOS_DO_APP}
            valor={codigoApp}
            aoMudar={setCodigoApp}
            invalido={erro === 'codigo-do-app-invalido' || erro === 'codigo-do-app-incompleto'}
          />
        ) : null}
        {erro ? <AvisoFormulario tipo="erro">{MENSAGEM_ERRO[erro]}</AvisoFormulario> : null}
        <Button type="submit" size="lg" block loading={salvando}>
          Salvar a senha
        </Button>
      </form>
    </MolduraConta>
  )
}
