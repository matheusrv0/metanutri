// O cartão "Link do paciente" na ficha (spec lado-do-paciente, D-1214, D-1208, D-1215; protótipo AvisosNutri): o endereço
// fixo do paciente, com Copiar, WhatsApp e E-mail, o plano que está no link, a dieta, a mensagem e "Trocar o endereço".
import { Check, Copy, Mail, RefreshCw } from 'lucide-react'
import { useId, useState } from 'react'
import { regerarLink, MENSAGEM_MAXIMA, type Acompanhamento } from '@/domain/acompanhamento.ts'
import { diaEMes, textoDoAcesso } from '@/domain/acessoDoLink.ts'
import { copiarDieta, temDieta, type DietaDoPlano } from '@/domain/dietaDoLink.ts'
import { pedirEnvio, type EmailsDoLink } from '@/domain/emailsDoLink.ts'
import type { Paciente } from '@/domain/pacientes.ts'
import { primeiroNome, textoDoLink } from '@/domain/whatsapp.ts'
import { useAcompanhamentos } from '@/ui/estado/contextoAcompanhamentos.ts'
import { useClienteDosEmails } from '@/ui/estado/usarEmailsDoLink.ts'
import { CaixaDietaNoLink } from '@/ui/missoes/CaixaDietaNoLink.tsx'
import { DialogoTrocarEndereco } from '@/ui/missoes/DialogoTrocarEndereco.tsx'
import { enderecoDoPaciente } from '@/ui/missoes/endereco.ts'
import { BotaoWhatsApp } from '@/ui/whatsapp/BotaoWhatsApp.tsx'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Separator } from '@ds/componentes/display/separator.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Textarea } from '@ds/componentes/forms/textarea.tsx'
import { mascararEmail } from '../../../supabase/functions/_shared/avisos/email.ts'
import { DialogoEnviarLink } from './DialogoEnviarLink.tsx'

/** O plano que está no link, como a ficha o descreve ("No link: Plano de 03/11/2026"). */
export interface PlanoNoLink {
  /** "Plano de 03/11/2026"; o nome do plano quando ele não tem data. */
  readonly rotulo: string
  /** É o plano mais novo do paciente: o selo diz "Atualizado". */
  readonly maisRecente: boolean
  /** A dieta do plano de agora, no que o paciente vê; sem ela, a caixa da dieta não aparece. */
  readonly dieta?: DietaDoPlano | undefined
}

interface CartaoLinkDoPacienteProps {
  readonly paciente: Paciente
  readonly link: Acompanhamento
  readonly planoNoLink: PlanoNoLink | null
  /** Os e-mails do link (`emails_do_link`); nulos sem servidor ou enquanto carregam. */
  readonly emails: EmailsDoLink | null
  readonly aoMudarEmails: () => void
  readonly hoje: string
  readonly aoCadastrarTelefone?: ((pacienteId: string) => void) | undefined
  /** Injetável no teste. */
  readonly agora?: () => Date
}

/** O E-mail do cartão só vai com um e-mail que funciona e sem o pedido de parar (CA-2254, CA-2265). */
function motivoSemEmail(emails: EmailsDoLink | null, nome: string): string | null {
  if (emails === null) return null
  if (emails.parouTudoEm !== null) return `${nome || 'O paciente'} pediu para não receber e-mails.`
  return null
}

export function CartaoLinkDoPaciente({ paciente, link, planoNoLink, emails, aoMudarEmails, hoje, aoCadastrarTelefone, agora = () => new Date() }: CartaoLinkDoPacienteProps) {
  const { salvar } = useAcompanhamentos()
  const cliente = useClienteDosEmails()
  const idTitulo = useId()
  const idMensagem = useId()
  const nome = primeiroNome(paciente.nome)
  const endereco = enderecoDoPaciente(link.token)
  const [copiado, setCopiado] = useState(false)
  const [rascunho, setRascunho] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [trocando, setTrocando] = useState(false)
  const [enviandoDialogo, setEnviandoDialogo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erroDoEnvio, setErroDoEnvio] = useState<string | null>(null)
  const [autorizandoDieta, setAutorizandoDieta] = useState(false)

  const salva = link.mensagem ?? ''
  const mensagem = rascunho ?? salva
  const passou = mensagem.length > MENSAGEM_MAXIMA
  const mudou = mensagem.trim() !== salva.trim()
  const emailQueFunciona = emails?.email && emails.supressao === null && emails.parouTudoEm === null ? emails.email : null
  const semEmail = motivoSemEmail(emails, nome)
  const comConvite = emails !== null && (['plano', 'semana', 'lembrete'] as const).some((t) => emails.ofertas[t] && !emails.aceites.some((a) => a.tipo === t && a.saiuEm === null))

  const copiar = async () => {
    try {
      await globalThis.navigator.clipboard.writeText(endereco)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  // D-1208 e CA-2212: a mensagem sobe para o link; apagar o texto tira o cartão de Hoje.
  const salvarMensagem = async () => {
    if (passou) return
    const texto = mensagem.trim()
    setSalvando(true)
    const motivo = await salvar({ ...link, mensagem: texto === '' ? null : texto, mensagemEm: texto === '' ? null : agora().toISOString() })
    setSalvando(false)
    if (motivo === null) setRascunho(null)
    else setStatus(motivo)
  }

  // D-1215 e CA-2223: o endereço novo, com o S4 quando o link tem e-mail.
  const trocarEndereco = async () => {
    setTrocando(false)
    setCopiado(false)
    const novo = regerarLink(link, { missoes: link.missoes })
    setSalvando(true)
    const motivo = await salvar(novo)
    setSalvando(false)
    if (motivo !== null) {
      setStatus(motivo)
      return
    }
    if (emailQueFunciona === null) {
      setStatus('Endereço trocado. Mande o novo pelo WhatsApp.')
      return
    }
    const envio = await pedirEnvio(cliente, 'trocou', novo.id)
    setStatus(envio.ok ? `Endereço trocado. O novo foi para ${mascararEmail(emailQueFunciona)}.` : `Endereço trocado. ${envio.erro} Mande o novo pelo WhatsApp.`)
    aoMudarEmails()
  }

  // CA-2262: o S2, pelo servidor; a recusa (o teto de 30 da conta) fica no diálogo, e nada sai.
  const enviarEmail = async () => {
    setEnviando(true)
    const envio = await pedirEnvio(cliente, 'enviar', link.id)
    setEnviando(false)
    if (!envio.ok) {
      setErroDoEnvio(envio.erro)
      return
    }
    setEnviandoDialogo(false)
    setStatus(`Link enviado para ${mascararEmail(envio.enviadoPara ?? emailQueFunciona ?? '')}.`)
    aoMudarEmails()
  }

  const trocarDieta = (ligar: boolean) => {
    setAutorizandoDieta(false)
    void salvar({ ...link, dieta: ligar && planoNoLink?.dieta ? copiarDieta(planoNoLink.dieta, hoje) : null })
  }

  return (
    <Card className="gap-4" aria-labelledby={idTitulo}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <CardTitle id={idTitulo}>Link do paciente</CardTitle>
        {/* D-1223 e CA-2239: o último acesso, só a data. */}
        <span className="text-xs text-muted-foreground">{textoDoAcesso(link, hoje)}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${idTitulo}-endereco`} className="text-xs font-medium text-muted-foreground">
          Endereço do link
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id={`${idTitulo}-endereco`}
            readOnly
            value={endereco}
            onFocus={(e) => e.currentTarget.select()}
            className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-surfacesunken px-3 py-2 text-base text-foreground sm:min-h-0 sm:w-auto sm:flex-1 sm:text-sm"
          />
          <Button type="button" variant="outline" onClick={() => void copiar()}>
            {copiado ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copiado ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <BotaoWhatsApp paciente={paciente} texto={textoDoLink(paciente.nome, endereco, temDieta(link.dieta))} aoCadastrarTelefone={aoCadastrarTelefone} />
        <Button
          type="button"
          variant="outline"
          disabled={emailQueFunciona === null}
          onClick={() => {
            setErroDoEnvio(null)
            setEnviandoDialogo(true)
          }}
        >
          <Mail aria-hidden="true" />
          E-mail
        </Button>
        {semEmail ? <p className="text-xs text-muted-foreground">{semEmail}</p> : null}
      </div>

      {planoNoLink ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surfacesunken p-3">
          <p className="min-w-0 flex-1 text-sm">
            <span className="block font-semibold text-heading [overflow-wrap:anywhere]">{`No link: ${planoNoLink.rotulo}`}</span>
            <span className="block text-muted-foreground">{`O plano vigente de ${nome || 'do paciente'}. Plano novo pergunta se atualiza o link.`}</span>
          </p>
          <Badge variant={planoNoLink.maisRecente ? 'muted' : 'lightWarning'}>{planoNoLink.maisRecente ? 'Atualizado' : 'Há um plano mais novo'}</Badge>
        </div>
      ) : null}

      {planoNoLink?.dieta ? (
        <CaixaDietaNoLink
          titulo="Mostrar a dieta no link"
          marcada={link.dieta !== null}
          aoMudar={(marcar) => (marcar && link.dieta === null ? setAutorizandoDieta(true) : trocarDieta(marcar))}
          ocupada={salvando}
          pedindoAutorizacao={autorizandoDieta && link.dieta === null}
          aoAutorizar={() => trocarDieta(true)}
          aoDesistir={() => setAutorizandoDieta(false)}
        />
      ) : null}

      <Separator />

      {/* D-1208: a mensagem aparece em Hoje, no link; nunca vai por e-mail (CA-2213). */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={idMensagem} className="text-sm font-semibold text-heading [overflow-wrap:anywhere]">
          {nome ? `Mensagem para ${nome}` : 'Mensagem para o paciente'}
        </label>
        <Textarea
          id={idMensagem}
          value={mensagem}
          rows={4}
          aria-invalid={passou}
          aria-describedby={`${idMensagem}-conta`}
          onChange={(e) => setRascunho(e.target.value)}
          className="[overflow-wrap:anywhere]"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span id={`${idMensagem}-conta`} className={passou ? 'numeros text-xs font-semibold text-errortext' : 'numeros text-xs text-muted-foreground'}>
            {passou ? 'Até 400 caracteres.' : `${mensagem.length} de ${MENSAGEM_MAXIMA}`}
          </span>
          <div className="flex flex-wrap items-center gap-3">
            {!mudou && salva !== '' && link.mensagemEm ? (
              <span role="status" className="flex items-center gap-1 text-xs font-semibold text-successtext">
                <Check className="size-3.5" aria-hidden="true" />
                {`No link desde ${diaEMes(link.mensagemEm)}`}
              </span>
            ) : null}
            <Button type="button" variant="lightprimary" size="sm" disabled={!mudou || passou} loading={salvando} onClick={() => void salvarMensagem()}>
              Salvar mensagem
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">A mensagem aparece em Hoje, no link. Não vai por e-mail.</p>
      </div>

      {status ? (
        <p role="status" className="rounded-xl bg-surfacesunken p-3 text-sm text-foreground [overflow-wrap:anywhere]">
          {status}
        </p>
      ) : null}

      <Separator />

      <div>
        <Button type="button" variant="ghost" className="text-errortext hover:text-errortext" disabled={salvando} onClick={() => setTrocando(true)}>
          <RefreshCw aria-hidden="true" />
          Trocar o endereço
        </Button>
      </div>

      <DialogoTrocarEndereco
        aberto={trocando}
        aoFechar={() => setTrocando(false)}
        aoConfirmar={() => void trocarEndereco()}
        primeiroNome={nome}
        emailMascarado={emailQueFunciona ? mascararEmail(emailQueFunciona) : null}
        ocupado={salvando}
      />
      {emailQueFunciona ? (
        <DialogoEnviarLink
          aberto={enviandoDialogo}
          aoFechar={() => setEnviandoDialogo(false)}
          aoEnviar={() => void enviarEmail()}
          email={emailQueFunciona}
          comConvite={comConvite}
          enviando={enviando}
          erro={erroDoEnvio}
        />
      ) : null}
    </Card>
  )
}
