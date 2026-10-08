import { useId, useRef, useState, type FormEvent } from 'react'
import { crnDe, MENSAGEM_ERRO_SITUACAO, SITUACAO_VAZIA, validarSituacao, type DadosSituacao, type ErroSituacao } from '@/domain/situacao.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { DialogoSair } from '../../conta/DialogoSair.tsx'
import type { ValorPerfilConta } from '../../estado/usarPerfilConta.ts'
import { useSaida } from '../../estado/usarSaida.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { CamposSituacao } from './CamposSituacao.tsx'
import { MolduraConta } from './MolduraConta.tsx'

interface TelaCompletarCadastroProps {
  readonly email: string
  readonly informarSituacao: ValorPerfilConta['informarSituacao']
  /** Sai da conta e apaga a cópia de trabalho deste navegador (spec dados-na-nuvem, D-131). */
  readonly sair: () => Promise<void>
  readonly aoSaiu: () => void
}

/** CB-68: conta sem situação (criada pelo painel do Supabase) informa uma vez, antes de usar. */
export function TelaCompletarCadastro({ email, informarSituacao, sair, aoSaiu }: TelaCompletarCadastroProps) {
  const id = useId()
  const [dados, setDados] = useState<DadosSituacao>(SITUACAO_VAZIA)
  const [erro, setErro] = useState<ErroSituacao | null>(null)
  const [falha, setFalha] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  // D-131: só "Sair"; a pergunta (CA-479) só quando há mudança que não chegou à nuvem.
  const saida = useSaida({ sair }, aoSaiu)
  const enviandoRef = useRef(false)

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    const problema = validarSituacao(dados, email)
    setErro(problema)
    setFalha(null)
    if (problema || dados.situacao === null) return
    enviandoRef.current = true
    setEnviando(true)
    const resposta = await informarSituacao(dados.situacao, crnDe(dados))
    enviandoRef.current = false
    setEnviando(false)
    if (resposta) setFalha(resposta)
  }

  return (
    <MolduraConta
      titulo="Complete seu cadastro"
      subtitulo={`Falta dizer quem você é para usar o MetaNutri com ${email}.`}
      aoIrParaInicio={() => void saida.pedirSair()}
    >
      <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-4">
        <CamposSituacao id={id} valor={dados} aoMudar={setDados} erro={erro} />
        {erro ? <AvisoFormulario tipo="erro">{MENSAGEM_ERRO_SITUACAO[erro]}</AvisoFormulario> : null}
        {falha ? <AvisoFormulario tipo="erro">{falha}</AvisoFormulario> : null}
        <Button type="submit" size="lg" block loading={enviando}>
          Continuar
        </Button>
        <button
          type="button"
          onClick={() => void saida.pedirSair()}
          disabled={saida.saindo}
          className="inline-flex min-h-11 items-center self-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Sair
        </button>
      </form>
      <DialogoSair aberto={saida.perguntando} saindo={saida.saindo} aoFicar={saida.ficar} aoSairMesmoAssim={() => void saida.sairMesmoAssim()} />
    </MolduraConta>
  )
}
