import { useId, useRef, useState, type FormEvent } from 'react'
import { MENSAGEM_ERRO, validarEntrada, type ErroConta } from '@/domain/conta.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { ENDERECO_DO_SITE } from '../../enderecos.ts'
import { armazenamentoLocal } from '../../estado/armazenamentoLocal.ts'
import type { ValorConta } from '../../estado/usarConta.ts'
import { lerSaida, textoDaSaida } from '../../sessao/motivoDaSaida.ts'
import { AvisoContaExcluida } from '../AvisoContaExcluida.tsx'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { AvisoSemServidor } from './AvisoSemServidor.tsx'
import { CampoSenha } from './CampoSenha.tsx'
import { LadoDoPlano } from './LadoDoPlano.tsx'
import { MolduraConta } from './MolduraConta.tsx'
import { useVerificacao } from './usarVerificacao.ts'
import { VerificacaoContraRobos } from './VerificacaoContraRobos.tsx'

interface TelaEntrarProps {
  readonly conta: ValorConta
  readonly aoEntrou: () => void
  readonly aoCriarConta: () => void
  readonly aoEsqueci: () => void
  /** Conta sem e-mail confirmado: vai para a tela do código, com o e-mail (spec confirmacao-por-codigo, CA-411). */
  readonly aoConfirmarEmail: (email: string) => void
  readonly aoIrParaInicio: () => void
  readonly aoAbrirSistema: () => void
  /** Veio de uma tela que pede sessão (CA-148): o subtítulo diz isso. */
  readonly pedidoPorTela?: boolean | undefined
}

const BOTAO_TEXTO =
  'inline-flex min-h-11 items-center rounded-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

/** Entrar (spec estilo-spora, US-1.4; mockup conta e checkout v1). */
export function TelaEntrar({ conta, aoEntrou, aoCriarConta, aoEsqueci, aoConfirmarEmail, aoIrParaInicio, aoAbrirSistema, pedidoPorTela = false }: TelaEntrarProps) {
  const id = useId()
  // Spec separacao-site-app, D-526 e DP-SA-22: depois da saída por tempo, "Entre de novo" e uma frase só. O motivo fica
  // guardado até alguém entrar (DP-SA-19), então todas as abas e as recargas mostram o mesmo.
  const [subtituloDaSaida] = useState(() => {
    const saida = lerSaida(armazenamentoLocal())
    return saida === null ? null : textoDaSaida(saida, Date.now())
  })
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<ErroConta | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)
  const verificacao = useVerificacao('login')
  const semInternet = globalThis.navigator?.onLine === false

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    const problema = validarEntrada(email, senha)
    if (problema) {
      setErro(problema)
      return
    }
    // D-113: a verificação contra robôs vai junto. Ainda conferindo, nada sai (CA-458); sem o script, segue sem ela (D-119).
    const pedido = verificacao.tomar()
    if (!pedido.ok) {
      setErro(pedido.erro)
      return
    }
    setErro(null)
    enviandoRef.current = true
    setEnviando(true)
    const resultado = await conta.entrar(email, senha, ...pedido.extra)
    enviandoRef.current = false
    setEnviando(false)
    if (!resultado.ok) {
      setErro(resultado.erro)
      return
    }
    aoEntrou()
  }

  return (
    <MolduraConta
      titulo={subtituloDaSaida === null ? 'Entrar' : 'Entre de novo'}
      subtitulo={subtituloDaSaida ?? (pedidoPorTela ? 'Entre para continuar de onde parou.' : 'Continue de onde parou.')}
      aoIrParaInicio={aoIrParaInicio}
      lado={<LadoDoPlano plano={null} ciclo="mensal" />}
      // Spec separacao-site-app, DP-SA-49: depois de excluir a conta, o aviso fica no topo daqui (a landing é de outro endereço).
      aviso={<AvisoContaExcluida />}
    >
      {conta.disponivel ? null : <AvisoSemServidor aoAbrirSistema={aoAbrirSistema} />}
      {semInternet ? <AvisoFormulario tipo="erro">Você está sem internet. Conecte-se para entrar e abrir seus dados.</AvisoFormulario> : null}

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
                <Button size="sm" variant="outline" onClick={() => aoConfirmarEmail(email.trim())}>
                  Digitar o código
                </Button>
              </div>
            ) : null}
          </AvisoFormulario>
        ) : null}

        <VerificacaoContraRobos verificacao={verificacao}>
          <Button type="submit" size="lg" block loading={enviando} disabled={!conta.disponivel}>
            Entrar
          </Button>
        </VerificacaoContraRobos>

        <p className="text-center text-sm text-muted-foreground">
          Ainda não tem conta?{' '}
          <button type="button" onClick={aoCriarConta} className={BOTAO_TEXTO}>
            Criar conta grátis
          </button>
        </p>
        {/* Spec separacao-site-app, D-504 e CA-1409: o site fica em outro endereço; daqui, um link para ele. */}
        <p className="-mt-2 text-center text-sm">
          <a href={ENDERECO_DO_SITE} className={BOTAO_TEXTO}>
            Conheça o MetaNutri
          </a>
        </p>
      </form>
    </MolduraConta>
  )
}
