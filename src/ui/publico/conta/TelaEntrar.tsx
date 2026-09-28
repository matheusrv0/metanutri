import { useId, useRef, useState, type FormEvent } from 'react'
import { MENSAGEM_ERRO, validarEntrada, type ErroConta } from '@/domain/conta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import type { ValorConta } from '../../estado/usarConta.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { AvisoSemServidor } from './AvisoSemServidor.tsx'
import { CampoSenha } from './CampoSenha.tsx'
import { LadoDoPlano } from './LadoDoPlano.tsx'
import { MolduraConta } from './MolduraConta.tsx'

interface TelaEntrarProps {
  readonly conta: ValorConta
  readonly aoEntrou: () => void
  readonly aoCriarConta: () => void
  readonly aoEsqueci: () => void
  readonly aoIrParaInicio: () => void
  readonly aoAbrirSistema: () => void
  /** Veio de uma tela que pede sessão (CA-148): o subtítulo diz isso. */
  readonly pedidoPorTela?: boolean | undefined
}

type Reenvio = 'nada' | 'enviado' | ErroConta

const BOTAO_TEXTO =
  'inline-flex min-h-11 items-center rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Entrar (spec estilo-spora, US-1.4; mockup conta e checkout v1). */
export function TelaEntrar({ conta, aoEntrou, aoCriarConta, aoEsqueci, aoIrParaInicio, aoAbrirSistema, pedidoPorTela = false }: TelaEntrarProps) {
  const id = useId()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<ErroConta | null>(null)
  const [reenvio, setReenvio] = useState<Reenvio>('nada')
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)
  const semInternet = globalThis.navigator?.onLine === false

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    const problema = validarEntrada(email, senha)
    if (problema) {
      setErro(problema)
      return
    }
    setErro(null)
    setReenvio('nada')
    enviandoRef.current = true
    setEnviando(true)
    const resultado = await conta.entrar(email, senha)
    enviandoRef.current = false
    setEnviando(false)
    if (!resultado.ok) {
      setErro(resultado.erro)
      return
    }
    aoEntrou()
  }

  const reenviar = async () => {
    const resultado = await conta.reenviarConfirmacao(email)
    setReenvio(resultado.ok ? 'enviado' : (resultado.erro ?? 'falha-rede'))
  }

  return (
    <MolduraConta
      titulo="Entrar"
      subtitulo={pedidoPorTela ? 'Entre para continuar de onde parou.' : 'Continue de onde parou.'}
      aoIrParaInicio={aoIrParaInicio}
      lado={<LadoDoPlano plano={null} ciclo="mensal" />}
    >
      {conta.disponivel ? null : <AvisoSemServidor aoAbrirSistema={aoAbrirSistema} />}
      {semInternet ? <AvisoFormulario tipo="erro">Você está sem internet. O primeiro acesso em cada aparelho precisa de internet.</AvisoFormulario> : null}

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
            aria-invalid={erro === 'email-invalido' || erro === 'credencial-invalida'}
          />
        </div>

        <CampoSenha id={`${id}-senha`} rotulo="Senha" valor={senha} aoMudar={setSenha} novaSenha={false} invalido={erro === 'senha-curta' || erro === 'credencial-invalida'} />

        <button type="button" onClick={aoEsqueci} className={`-mt-2 self-end text-sm ${BOTAO_TEXTO}`}>
          Esqueci a senha
        </button>

        {erro ? (
          <AvisoFormulario tipo="erro">
            {MENSAGEM_ERRO[erro]}
            {erro === 'email-nao-confirmado' ? (
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={() => void reenviar()}>
                  Reenviar o link
                </Button>
              </div>
            ) : null}
          </AvisoFormulario>
        ) : null}

        {reenvio === 'enviado' ? <AvisoFormulario tipo="ok">Mandamos outro link para {email.trim()}.</AvisoFormulario> : null}
        {reenvio !== 'nada' && reenvio !== 'enviado' ? <AvisoFormulario tipo="erro">{MENSAGEM_ERRO[reenvio]}</AvisoFormulario> : null}

        <Button type="submit" size="lg" block loading={enviando} disabled={!conta.disponivel}>
          Entrar
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem conta?{' '}
          <button type="button" onClick={aoCriarConta} className={BOTAO_TEXTO}>
            Criar grátis
          </button>
        </p>
      </form>
    </MolduraConta>
  )
}
