// "Avisos por e-mail" na ficha (spec lado-do-paciente, D-1227, CA-2260 a CA-2265; protótipo AvisosNutri): o endereço e
// a origem dele, os três avisos com o interruptor da nutricionista e o estado do paciente, e o convite. O interruptor
// oferece ou desliga; quem aceita é o dono do endereço.
import { CircleAlert } from 'lucide-react'
import { useId, useState } from 'react'
import { convite, estadoDoAviso, origemDoEmail, quandoDoAviso, type TomDoEstado } from '@/domain/avisosNaFicha.ts'
import { definirOfertas, EMAILS_INDISPONIVEIS, pedirEnvio, type EmailsDoLink } from '@/domain/emailsDoLink.ts'
import { primeiroNome } from '@/domain/whatsapp.ts'
import { useClienteDosEmails } from '@/ui/estado/usarEmailsDoLink.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Badge, type BadgeProps } from '@ds/componentes/display/badge.tsx'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Switch } from '@ds/componentes/forms/switch.tsx'
import { NOME_DO_AVISO, TIPOS_DE_AVISO, type TipoDeAviso } from '../../../supabase/functions/_shared/avisos/tipos.ts'

const SELO: Readonly<Record<TomDoEstado, BadgeProps['variant']>> = { ok: 'lightSuccess', neutro: 'muted', erro: 'lightError', desligado: 'outline' }

interface CartaoAvisosPorEmailProps {
  readonly nomeDoPaciente: string
  readonly linkId: string
  /** Os e-mails do link; nulos enquanto carregam ou sem servidor. */
  readonly emails: EmailsDoLink | null
  readonly erro: string | null
  readonly aoMudar: () => void
  /** "Cadastrar na ficha" e "Corrigir na ficha": o cursor vai para o campo E-mail (CA-2261). */
  readonly aoCadastrarEmail: () => void
  readonly agora: Date
}

export function CartaoAvisosPorEmail({ nomeDoPaciente, linkId, emails, erro, aoMudar, aoCadastrarEmail, agora }: CartaoAvisosPorEmailProps) {
  const cliente = useClienteDosEmails()
  const idTitulo = useId()
  const nome = primeiroNome(nomeDoPaciente)
  // O interruptor muda na hora na tela (D-1227: desligar vale na hora); a nuvem confirma na próxima leitura.
  const [ofertasNaTela, setOfertasNaTela] = useState<Readonly<Record<TipoDeAviso, boolean>> | null>(null)
  const [convidando, setConvidando] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const ofertas = ofertasNaTela ?? emails?.ofertas ?? null
  const vistos = emails && ofertas ? { ...emails, ofertas } : emails
  const devolvido = vistos?.supressao === 'devolvido'

  const mudarOferta = async (tipo: TipoDeAviso, oferecer: boolean) => {
    if (!vistos) return
    const novas = { ...vistos.ofertas, [tipo]: oferecer }
    setOfertasNaTela(novas)
    const r = await definirOfertas(cliente, linkId, novas)
    if (!r.ok) {
      setOfertasNaTela(null)
      setStatus(r.erro)
      return
    }
    setStatus(null)
    aoMudar()
  }

  const convidar = async () => {
    setConvidando(true)
    const r = await pedirEnvio(cliente, 'convite', linkId)
    setConvidando(false)
    setStatus(r.ok ? 'Convite enviado. O próximo, só daqui a um mês.' : r.erro)
    if (r.ok) aoMudar()
  }

  const corpo = (() => {
    if (vistos === null) return <p className="text-sm text-muted-foreground">{erro ?? 'Carregando…'}</p>
    if (vistos.email === null) {
      // CA-2261: sem e-mail na ficha e sem e-mail confirmado.
      return (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-4">
          <p className="text-sm">
            <strong className="block font-semibold text-heading">Sem e-mail</strong>
            <span className="text-muted-foreground">{`${nome || 'O paciente'} não tem e-mail na ficha.`}</span>
          </p>
          <Button variant="outline" onClick={aoCadastrarEmail}>
            Cadastrar na ficha
          </Button>
        </div>
      )
    }
    const conviteAgora = convite(vistos, agora)
    return (
      <>
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <strong className="min-w-0 font-semibold text-heading [overflow-wrap:anywhere]">{vistos.email}</strong>
          <span className="text-xs text-muted-foreground">{origemDoEmail(vistos, nome)}</span>
        </p>
        {devolvido ? (
          <Alert variant="error" role="alert">
            <CircleAlert aria-hidden="true" />
            <span>O e-mail voltou: o endereço não existe. Confira na ficha. Nenhum aviso vai até corrigir.</span>
          </Alert>
        ) : null}
        <ul className="flex flex-col">
          {TIPOS_DE_AVISO.map((tipo) => {
            const estado = estadoDoAviso(vistos, tipo, agora)
            return (
              <li key={tipo} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border py-3 last:border-0">
                <span className="min-w-0 flex-1 text-sm">
                  <span className="block font-semibold text-heading">{NOME_DO_AVISO[tipo]}</span>
                  <span className="block text-xs text-muted-foreground">{quandoDoAviso(vistos, tipo)}</span>
                </span>
                <Badge variant={SELO[estado.tom]} className="whitespace-normal text-left">
                  {estado.texto}
                </Badge>
                <Switch checked={vistos.ofertas[tipo]} disabled={devolvido} aria-label={`Oferecer ${NOME_DO_AVISO[tipo]}`} onCheckedChange={(v) => void mudarOferta(tipo, v)} />
              </li>
            )
          })}
        </ul>
        {conviteAgora.aparece ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" disabled={!conviteAgora.pode} loading={convidando} onClick={() => void convidar()}>
              Enviar convite
            </Button>
            <span className="text-xs text-muted-foreground">{conviteAgora.nota}</span>
          </div>
        ) : null}
        {devolvido ? (
          <div>
            <Button variant="outline" onClick={aoCadastrarEmail}>
              Corrigir na ficha
            </Button>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">O interruptor é seu: oferece ou desliga o aviso. O paciente escolhe o que recebe e sai pelo próprio e-mail.</p>
      </>
    )
  })()

  return (
    <Card className="gap-4" aria-labelledby={idTitulo}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <CardTitle id={idTitulo}>Avisos por e-mail</CardTitle>
        {vistos?.email ? <span className="text-xs text-muted-foreground">Teto: 1 por dia, 3 por semana</span> : null}
      </div>
      {corpo}
      {status ? (
        <p role="status" className="text-sm text-foreground [overflow-wrap:anywhere]">
          {status}
        </p>
      ) : null}
      {erro && vistos !== null && erro !== EMAILS_INDISPONIVEIS ? <p className="text-xs text-muted-foreground">{erro}</p> : null}
    </Card>
  )
}
