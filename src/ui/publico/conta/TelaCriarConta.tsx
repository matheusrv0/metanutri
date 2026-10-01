import { useId, useRef, useState, type FormEvent } from 'react'
import { MENSAGEM_ERRO, SENHA_MINIMA, validarCadastro, type Ciclo, type ErroConta, type IdPlano } from '@/domain/conta.ts'
import { VERSAO_TERMOS } from '@/domain/legal.ts'
import { crnDe, MENSAGEM_ERRO_SITUACAO, SITUACAO_VAZIA, validarSituacao, type DadosSituacao, type ErroSituacao, type Situacao } from '@/domain/situacao.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import type { ValorConta } from '../../estado/usarConta.ts'
import { ehPlanoPago } from '../../navegacao.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { AvisoSemServidor } from './AvisoSemServidor.tsx'
import { CaixaDeclaracao } from './CaixaDeclaracao.tsx'
import { CampoSenha } from './CampoSenha.tsx'
import { CamposSituacao } from './CamposSituacao.tsx'
import { LadoDoPlano } from './LadoDoPlano.tsx'
import { MolduraConta } from './MolduraConta.tsx'

export interface ContaCriada {
  readonly email: string
  readonly plano: IdPlano
  readonly situacao: Situacao
  readonly confirmarEmail: boolean
}

interface TelaCriarContaProps {
  readonly conta: ValorConta
  readonly plano: IdPlano | null
  readonly ciclo: Ciclo
  /** E-mail do MetaNutri, para pedir a inclusão de uma faculdade (CB-60). Nulo até existir. */
  readonly contato: string | null
  readonly aoCriada: (criada: ContaCriada) => void
  readonly aoEntrar: () => void
  readonly aoTrocarPlano: () => void
  readonly aoIrParaInicio: () => void
  readonly aoAbrirSistema: () => void
}

const LINK = 'font-semibold text-primary underline underline-offset-4'

/** Criar conta com a situação (spec conta-e-verificacao, US-B2; protótipo "Criar conta"). */
export function TelaCriarConta({ conta, plano, ciclo, contato, aoCriada, aoEntrar, aoTrocarPlano, aoIrParaInicio, aoAbrirSistema }: TelaCriarContaProps) {
  const id = useId()
  const viaEstudante = plano === 'estudante'
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [aceitou, setAceitou] = useState(false)
  const [situacao, setSituacao] = useState<DadosSituacao>(viaEstudante ? { ...SITUACAO_VAZIA, situacao: 'estudante' } : SITUACAO_VAZIA)
  const [erroConta, setErroConta] = useState<ErroConta | null>(null)
  const [erroSituacao, setErroSituacao] = useState<ErroSituacao | null>(null)
  const [enviando, setEnviando] = useState(false)
  // Trava de verdade contra o clique duplo (CA-134): o estado só muda no próximo render.
  const enviandoRef = useRef(false)

  const pago = plano !== null && ehPlanoPago(plano)
  const estudante = situacao.situacao === 'estudante'
  const passo = pago ? { atual: 1, total: 3 } : estudante ? { atual: 1, total: 2 } : undefined
  const subtitulo = pago
    ? 'Passo 1 de 3. Depois você revisa o plano e paga.'
    : estudante
      ? 'Passo 1 de 2. Depois você envia o comprovante de matrícula.'
      : 'Grátis, sem cartão.'

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    const problemaConta = validarCadastro({ nome, email, senha, aceitouTermos: aceitou })
    const problemaSituacao = problemaConta ? null : validarSituacao(situacao, email)
    setErroConta(problemaConta)
    setErroSituacao(problemaSituacao)
    if (problemaConta || problemaSituacao || situacao.situacao === null) return

    enviandoRef.current = true
    setEnviando(true)
    const resultado = await conta.cadastrar({
      nome,
      email,
      senha,
      planoDesejado: plano ?? 'free',
      versaoTermos: VERSAO_TERMOS,
      situacao: situacao.situacao,
      crn: crnDe(situacao),
    })
    enviandoRef.current = false
    setEnviando(false)
    if (!resultado.ok) {
      setErroConta(resultado.erro)
      return
    }
    aoCriada({ email: email.trim(), plano: plano ?? 'free', situacao: situacao.situacao, confirmarEmail: resultado.confirmarEmail === true })
  }

  return (
    <MolduraConta
      titulo={estudante ? 'Crie sua conta de estudante' : 'Crie sua conta'}
      subtitulo={subtitulo}
      passo={passo}
      aoIrParaInicio={aoIrParaInicio}
      lado={<LadoDoPlano plano={plano} ciclo={ciclo} aoTrocarPlano={plano !== null ? aoTrocarPlano : undefined} />}
    >
      {conta.disponivel ? null : <AvisoSemServidor aoAbrirSistema={aoAbrirSistema} />}

      <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-nome`}>Nome completo</Label>
          <Input id={`${id}-nome`} autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} aria-invalid={erroConta === 'nome-vazio'} />
          {estudante ? <p className="text-xs text-muted-foreground">Igual ao do comprovante de matrícula.</p> : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-email`}>{estudante ? 'E-mail da faculdade' : 'E-mail'}</Label>
          <Input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={estudante ? 'voce@aluno.faculdade.br' : 'voce@exemplo.com'}
            aria-invalid={erroConta === 'email-invalido' || erroConta === 'email-em-uso' || erroSituacao === 'email-faculdade'}
          />
          {estudante ? <p className="text-xs text-muted-foreground">O e-mail que a faculdade forneceu a você. É por ele que confirmamos o vínculo.</p> : null}
        </div>

        <CampoSenha id={`${id}-senha`} rotulo="Senha" valor={senha} aoMudar={setSenha} novaSenha invalido={erroConta === 'senha-curta'} dica={`Pelo menos ${SENHA_MINIMA} caracteres.`} />

        <CamposSituacao id={id} valor={situacao} aoMudar={setSituacao} erro={erroSituacao} travarEstudante={viaEstudante} />

        <CaixaDeclaracao id={`${id}-termos`} marcada={aceitou} aoMudar={setAceitou} invalido={erroConta === 'termos'}>
          Li e aceito os{' '}
          <a href="#/termos" target="_blank" rel="noreferrer" className={LINK}>
            Termos de uso
          </a>{' '}
          e a{' '}
          <a href="#/privacidade" target="_blank" rel="noreferrer" className={LINK}>
            Política de privacidade
          </a>
          .
        </CaixaDeclaracao>

        {erroSituacao ? (
          <AvisoFormulario tipo="erro">
            {MENSAGEM_ERRO_SITUACAO[erroSituacao]}
            {erroSituacao === 'email-faculdade' && contato ? ` Se a sua faculdade não aparece, escreva para ${contato} pedindo a inclusão.` : null}
          </AvisoFormulario>
        ) : null}

        {erroConta ? (
          <AvisoFormulario tipo="erro">
            {MENSAGEM_ERRO[erroConta]}
            {erroConta === 'email-em-uso' ? (
              <>
                {' '}
                <button type="button" onClick={aoEntrar} className="font-semibold underline underline-offset-4">
                  Entrar
                </button>
              </>
            ) : null}
          </AvisoFormulario>
        ) : null}

        <Button type="submit" size="lg" block loading={enviando} disabled={!conta.disponivel}>
          {pago || estudante ? 'Criar conta e continuar' : 'Criar conta'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <button type="button" onClick={aoEntrar} className="inline-flex min-h-11 items-center rounded-sm font-semibold text-primary underline-offset-4 hover:underline">
            Entrar
          </button>
        </p>
      </form>
    </MolduraConta>
  )
}
