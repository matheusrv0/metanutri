import { CheckCircle2, Info, Loader2, TriangleAlert } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { MENSAGEM_ERRO, SENHA_MINIMA, validarCadastro, validarEntrada, type ErroConta } from '@/domain/conta.ts'
import { cn } from '@/lib/utils'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { OriginButton } from '@ds/componentes/efeitos/origin-button.tsx'
import type { ValorConta } from '../estado/usarConta.ts'

interface TelaEntrarProps {
  readonly conta: ValorConta
  readonly aoEntrar: () => void
  readonly aoAbrirSistema: () => void
}

type Modo = 'entrar' | 'cadastrar'

/** Entrar ou criar conta. Sem servidor configurado, explica e manda usar o sistema local. */
export function TelaEntrar({ conta, aoEntrar, aoAbrirSistema }: TelaEntrarProps) {
  const [modo, setModo] = useState<Modo>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<ErroConta | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const id = useId()

  const trocarModo = (novo: Modo) => {
    setModo(novo)
    setErro(null)
    setAviso(null)
  }

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    setAviso(null)
    const problema = modo === 'entrar' ? validarEntrada(email, senha) : validarCadastro(email, senha, confirmacao)
    if (problema) {
      setErro(problema)
      return
    }

    setErro(null)
    setEnviando(true)
    const resultado = modo === 'entrar' ? await conta.entrar(email, senha) : await conta.cadastrar(email, senha)
    setEnviando(false)

    if (!resultado.ok) {
      setErro(resultado.erro)
      return
    }
    if (resultado.confirmarEmail) {
      setAviso('Conta criada. Confira seu e-mail e clique no link de confirmação antes de entrar.')
      return
    }
    aoEntrar()
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-16 sm:px-0 sm:py-24">
      <div className="text-center">
        <h1 className="font-titulo text-3xl font-bold text-foreground">{modo === 'entrar' ? 'Entrar na sua conta' : 'Criar sua conta'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {modo === 'entrar' ? 'Para levar seus planos para outro aparelho.' : 'Leva menos de um minuto. O plano do estágio é de graça.'}
        </p>
      </div>

      <div role="tablist" aria-label="Entrar ou criar conta" className="flex rounded-full border border-border bg-muted p-1">
        {(['entrar', 'cadastrar'] as const).map((valor) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={modo === valor}
            onClick={() => trocarModo(valor)}
            className={cn(
              'flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              modo === valor ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {valor === 'entrar' ? 'Já tenho conta' : 'Criar conta'}
          </button>
        ))}
      </div>

      {!conta.disponivel ? (
        <div className="flex items-start gap-3 rounded-md border border-border bg-card p-4 text-sm text-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-secondary" aria-hidden="true" />
          <div>
            <p className="font-medium">A conta na nuvem ainda não está ligada.</p>
            <p className="mt-1 text-muted-foreground">
              O MetaNutri funciona inteiro sem ela: os planos ficam salvos neste navegador e o backup em Configurações leva tudo para outro aparelho.
            </p>
            <button
              type="button"
              onClick={aoAbrirSistema}
              className="mt-3 rounded-md text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Abrir o sistema mesmo assim
            </button>
          </div>
        </div>
      ) : null}

      <form onSubmit={(e) => void enviar(e)} className="flex flex-col gap-4 rounded-md border border-border bg-card p-6">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-email`} className="text-foreground">
            E-mail
          </Label>
          <Input
            id={`${id}-email`}
            type="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com…"
            aria-invalid={erro === 'email-invalido' || erro === 'email-em-uso'}
            className="border-border bg-background/40 text-foreground placeholder:text-muted-foreground/70"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-senha`} className="text-foreground">
            Senha
          </Label>
          <Input
            id={`${id}-senha`}
            type="password"
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            aria-invalid={erro === 'senha-curta' || erro === 'credencial-invalida'}
            aria-describedby={modo === 'cadastrar' ? `${id}-dica` : undefined}
            className="border-border bg-background/40 text-foreground"
          />
          {modo === 'cadastrar' ? (
            <p id={`${id}-dica`} className="text-xs text-muted-foreground">{`Pelo menos ${SENHA_MINIMA} caracteres.`}</p>
          ) : null}
        </div>

        {modo === 'cadastrar' ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-confirma`} className="text-foreground">
              Repita a senha
            </Label>
            <Input
              id={`${id}-confirma`}
              type="password"
              autoComplete="new-password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              aria-invalid={erro === 'senha-diferente'}
              className="border-border bg-background/40 text-foreground"
            />
          </div>
        ) : null}

        {erro ? (
          <p role="alert" className="flex items-start gap-2 rounded-md border border-error/35 bg-lighterror p-3 text-sm text-errortext">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-error" aria-hidden="true" />
            {MENSAGEM_ERRO[erro]}
          </p>
        ) : null}

        {aviso ? (
          <p role="status" className="flex items-start gap-2 rounded-md border border-primary/30 bg-lightprimary p-3 text-sm text-primary">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {aviso}
          </p>
        ) : null}

        <OriginButton type="submit" loading={enviando} className="w-full border-transparent bg-primary text-primary-foreground hover:bg-primaryemphasis">
          {enviando ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </OriginButton>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        Seus planos e pacientes continuam salvos neste navegador. A conta serve para levar os dados para outro aparelho.
      </p>
    </div>
  )
}
