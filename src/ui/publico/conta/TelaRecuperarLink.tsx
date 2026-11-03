import { ChevronLeft, Mail } from 'lucide-react'
import { useId, useRef, useState, type FormEvent } from 'react'
import { emailValido } from '../../../../supabase/functions/_shared/avisos/email.ts'
import { MENSAGEM_ERRO } from '@/domain/conta.ts'
import { CONFIRA_O_EMAIL, recuperarLink, RESPOSTA_DA_RECUPERACAO, type ClienteDosEmails } from '@/domain/emailsDoLink.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { Label } from '@ds/componentes/forms/label.tsx'
import { obterSupabase } from '../../estado/supabase.ts'
import { AvisoFormulario } from './AvisoFormulario.tsx'
import { MolduraConta } from './MolduraConta.tsx'
import { useVerificacao } from './usarVerificacao.ts'
import { VerificacaoContraRobos } from './VerificacaoContraRobos.tsx'

interface TelaRecuperarLinkProps {
  readonly aoVoltar: () => void
  /** As funções do servidor; por padrão, o Supabase do app. Injetável no teste. */
  readonly cliente?: ClienteDosEmails | null
}

const clientePadrao = (): ClienteDosEmails | null => obterSupabase() as unknown as ClienteDosEmails | null

/**
 * "Recuperar meu link" (spec lado-do-paciente, D-1220, CA-2233 e CA-2234): celular novo ou dados apagados, sem pedir à
 * nutricionista. O e-mail, a verificação contra robôs (Turnstile) e "Enviar o link". A resposta é sempre a mesma, com
 * cadastro ou sem: a tela não revela quem é paciente. O e-mail que chega leva o link de cada nutricionista (S1).
 */
export function TelaRecuperarLink({ aoVoltar, cliente: clienteInjetado }: TelaRecuperarLinkProps) {
  const id = useId()
  const [cliente] = useState(() => (clienteInjetado === undefined ? clientePadrao() : clienteInjetado))
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const enviandoRef = useRef(false)
  const verificacao = useVerificacao('recuperar-link')

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (enviandoRef.current) return
    if (!emailValido(email)) {
      setErro(CONFIRA_O_EMAIL)
      return
    }
    // D-113: a verificação contra robôs vai junto; ainda conferindo, nada sai (CA-458).
    const pedido = verificacao.tomar()
    if (!pedido.ok) {
      setErro(MENSAGEM_ERRO[pedido.erro])
      return
    }
    setErro(null)
    enviandoRef.current = true
    setEnviando(true)
    const resultado = await recuperarLink(cliente, email, pedido.extra[0] ?? null)
    enviandoRef.current = false
    setEnviando(false)
    if (!resultado.ok) {
      setErro(resultado.erro)
      return
    }
    setEnviado(true)
  }

  return (
    <MolduraConta titulo="Recuperar meu link" subtitulo="Digite o e-mail que você deu à sua nutricionista.">
      <button
        type="button"
        onClick={aoVoltar}
        className="-mt-2 -ml-2 inline-flex min-h-11 w-fit items-center gap-1 rounded-full pr-2.5 pl-1 text-base font-semibold text-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
        Voltar
      </button>
      {enviado ? (
        <div role="status" className="flex flex-col items-center gap-3 py-2 text-center">
          <span aria-hidden="true" className="grid size-13 place-content-center rounded-full bg-lightsuccess text-successtext">
            <Mail className="size-6" />
          </span>
          <p className="text-base text-foreground">{RESPOSTA_DA_RECUPERACAO}</p>
        </div>
      ) : (
        <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-email`}>E-mail</Label>
            <Input
              id={`${id}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={erro === CONFIRA_O_EMAIL}
            />
          </div>
          {erro ? <AvisoFormulario tipo="erro">{erro}</AvisoFormulario> : null}
          <VerificacaoContraRobos verificacao={verificacao}>
            <Button type="submit" size="lg" block loading={enviando}>
              Enviar o link
            </Button>
          </VerificacaoContraRobos>
          <p className="text-sm text-muted-foreground">O link também está na mensagem da sua nutricionista no WhatsApp.</p>
        </form>
      )}
    </MolduraConta>
  )
}
