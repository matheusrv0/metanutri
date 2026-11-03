import { Mail } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { emailValido, mascararEmail, normalizarEmail, sugerirCorrecao } from '../../../../supabase/functions/_shared/avisos/email.ts'
import { PEDIDO_DO_AVISO, TIPOS_DE_AVISO, type AvisosDoLink, type TipoDeAviso } from '../../../../supabase/functions/_shared/avisos/tipos.ts'
import { CONFIRA_O_EMAIL, receberLinkPorEmail, type ClienteDosEmails } from '@/domain/emailsDoLink.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Input } from '@ds/componentes/forms/input.tsx'
import { FolhaDoLink } from './FolhaDoLink.tsx'

interface FolhaReceberPorEmailProps {
  readonly aberta: boolean
  readonly aoFechar: () => void
  readonly cor: string | null
  readonly token: string
  readonly cliente: ClienteDosEmails | null
  /** "j•••a@gmail.com": o e-mail que o link já tem (o da ficha); nulo sem e-mail (CA-2235). */
  readonly emailMascarado: string | null
  /** Os avisos do link: só os oferecidos e ainda não ligados aparecem para marcar (CA-2242). */
  readonly avisos: AvisosDoLink
}

type Envio = { readonly tipo: 'formulario' } | { readonly tipo: 'enviado'; readonly para: string; readonly confirmar: boolean }

/**
 * "Receber meu link por e-mail" (D-1221, D-1226, CA-2235 a CA-2237, CA-2240 e CB-1216): o e-mail da ficha mascarado, com
 * "Usar outro"; o erro comum de digitação vira uma pergunta com a correção; os avisos oferecidos vêm desmarcados. O link
 * vai na hora (S1); com algum aviso marcado, chega também a confirmação (S3).
 */
export function FolhaReceberPorEmail({ aberta, aoFechar, cor, token, cliente, emailMascarado, avisos }: FolhaReceberPorEmailProps) {
  const id = useId()
  const [usarOutro, setUsarOutro] = useState(emailMascarado === null)
  const [digitado, setDigitado] = useState('')
  const [escolhidos, setEscolhidos] = useState<readonly TipoDeAviso[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [envio, setEnvio] = useState<Envio>({ tipo: 'formulario' })
  const oferecidos = TIPOS_DE_AVISO.filter((tipo) => avisos[tipo] === 'desligado')
  const sugestao = usarOutro ? sugerirCorrecao(digitado) : null

  const fechar = () => {
    aoFechar()
    // De volta ao começo para a próxima vez, sem o e-mail digitado.
    setEnvio({ tipo: 'formulario' })
    setErro(null)
    setDigitado('')
    setEscolhidos([])
    setUsarOutro(emailMascarado === null)
  }

  const enviar = async (evento: FormEvent) => {
    evento.preventDefault()
    if (enviando) return
    const email = usarOutro ? normalizarEmail(digitado) : null
    if (email !== null && !emailValido(email)) {
      setErro(CONFIRA_O_EMAIL)
      return
    }
    setErro(null)
    setEnviando(true)
    const resultado = await receberLinkPorEmail(cliente, { token, email, avisos: escolhidos })
    setEnviando(false)
    if (!resultado.ok) {
      setErro(resultado.erro)
      return
    }
    setEnvio({ tipo: 'enviado', para: resultado.enviadoPara || (email ? mascararEmail(email) : (emailMascarado ?? '')), confirmar: resultado.confirmar || escolhidos.length > 0 })
  }

  const alternar = (tipo: TipoDeAviso, marcar: boolean) =>
    setEscolhidos((atuais) => (marcar ? TIPOS_DE_AVISO.filter((t) => t === tipo || atuais.includes(t)) : atuais.filter((t) => t !== tipo)))

  return (
    <FolhaDoLink aberta={aberta} aoFechar={fechar} titulo="Receber por e-mail" cor={cor}>
      {envio.tipo === 'enviado' ? (
        <div className="flex flex-col gap-4">
          <div role="status" className="flex flex-col items-center gap-2.5 pt-2 text-center">
            <span aria-hidden="true" className="grid size-13 place-content-center rounded-full bg-lightsuccess text-successtext">
              <Mail className="size-6" />
            </span>
            <p className="text-base text-foreground [overflow-wrap:anywhere]">{`Enviamos o link para ${envio.para}.`}</p>
            {envio.confirmar ? <p className="text-sm text-muted-foreground">Para receber os avisos, toque em Confirmar no e-mail.</p> : null}
          </div>
          <Button size="lg" block variant="outline" onClick={fechar}>
            Fechar
          </Button>
        </div>
      ) : (
        <form onSubmit={(e) => void enviar(e)} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {usarOutro ? (
              <>
                <label htmlFor={`${id}-email`} className="text-sm font-bold text-heading">
                  Seu e-mail
                </label>
                <Input
                  id={`${id}-email`}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  spellCheck={false}
                  value={digitado}
                  onChange={(e) => setDigitado(e.target.value)}
                  aria-invalid={erro === CONFIRA_O_EMAIL}
                  aria-describedby={`${id}-sugestao`}
                  className="h-12.5 text-base"
                />
                <div id={`${id}-sugestao`} aria-live="polite">
                  {sugestao ? (
                    <p className="text-sm text-muted-foreground">
                      Você quis dizer{' '}
                      <button
                        type="button"
                        onClick={() => setDigitado(sugestao)}
                        className="inline-flex min-h-9 items-center font-bold text-heading underline underline-offset-4 [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {sugestao}
                      </button>
                      ?
                    </p>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <span className="text-sm font-bold text-heading">Seu e-mail</span>
                <div className="flex min-h-12.5 items-center justify-between gap-2.5 rounded-2xl bg-surfacesunken py-1 pr-1.5 pl-3.5">
                  <span className="min-w-0 text-base font-semibold text-heading [overflow-wrap:anywhere]">{emailMascarado}</span>
                  <Button variant="ghost" onClick={() => setUsarOutro(true)} className="shrink-0 font-bold text-heading">
                    Usar outro
                  </Button>
                </div>
              </>
            )}
          </div>

          {oferecidos.length > 0 ? (
            <fieldset className="flex flex-col">
              <legend className="mb-1.5 text-sm font-bold text-heading">Avisos</legend>
              {oferecidos.map((tipo) => (
                <label key={tipo} className="flex min-h-12 cursor-pointer items-center gap-3 text-base text-foreground">
                  <input
                    type="checkbox"
                    checked={escolhidos.includes(tipo)}
                    onChange={(e) => alternar(tipo, e.target.checked)}
                    className="size-6 shrink-0 cursor-pointer accent-[var(--link-acao)]"
                  />
                  <span>{PEDIDO_DO_AVISO[tipo]}</span>
                </label>
              ))}
            </fieldset>
          ) : null}

          {erro ? (
            <Alert variant="error" role="alert">
              {erro}
            </Alert>
          ) : null}

          <Button type="submit" size="lg" block loading={enviando} className="bg-linkacao text-linkacaotexto hover:bg-linkacao hover:brightness-110">
            Enviar
          </Button>
          <p className="text-sm text-muted-foreground">Você sai de qualquer aviso pelo próprio e-mail.</p>
        </form>
      )}
    </FolhaDoLink>
  )
}
