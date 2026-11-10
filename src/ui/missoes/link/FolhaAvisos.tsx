import { useState } from 'react'
import { NOME_DO_AVISO, TIPOS_DE_AVISO, type AvisosDoLink, type TipoDeAviso } from '../../../../supabase/functions/_shared/avisos/tipos.ts'
import { desligarAviso, ligarAviso, type ClienteDosEmails } from '@/domain/emailsDoLink.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Switch } from '@ds/componentes/forms/switch.tsx'
import { FolhaDoLink } from './FolhaDoLink.tsx'

interface FolhaAvisosProps {
  readonly aberta: boolean
  readonly aoFechar: () => void
  readonly cor: string | null
  readonly token: string
  readonly cliente: ClienteDosEmails | null
  readonly emailMascarado: string | null
  readonly nutricionista: string | null
  readonly avisos: AvisosDoLink
  /** O aviso desligado aqui muda o estado da tela (a folha "Meu plano" conta os ligados). */
  readonly aoMudar: (tipo: TipoDeAviso, estado: 'ligado' | 'desligado') => void
}

/** Quando cada aviso chega (seção 6 da SPEC). */
const quando = (tipo: TipoDeAviso, nutricionista: string | null): string =>
  tipo === 'plano' ? `Quando ${nutricionista ?? 'a nutricionista'} mudar o plano` : tipo === 'semana' ? 'Uma vez por semana, às 8h' : 'Depois de 3 dias sem marcar'

/**
 * "Avisos por e-mail" no link (D-1226, CA-2242 e CA-2256): o endereço mascarado e um interruptor por aviso que a
 * nutricionista oferece. Desligar vale na hora; ligar manda o e-mail de confirmação daquele aviso (o S3), e o aviso só
 * liga quando o paciente confirma no e-mail.
 */
export function FolhaAvisos({ aberta, aoFechar, cor, token, cliente, emailMascarado, nutricionista, avisos, aoMudar }: FolhaAvisosProps) {
  const [esperando, setEsperando] = useState<readonly TipoDeAviso[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState<TipoDeAviso | null>(null)
  const oferecidos = TIPOS_DE_AVISO.filter((tipo) => avisos[tipo] !== 'nao-oferecido')

  const mudar = async (tipo: TipoDeAviso, ligar: boolean) => {
    setErro(null)
    setOcupado(tipo)
    if (ligar) {
      const r = await ligarAviso(cliente, token, tipo)
      setOcupado(null)
      if (!r.ok) return setErro(r.erro)
      setEsperando((atuais) => (atuais.includes(tipo) ? atuais : [...atuais, tipo]))
      return
    }
    // Desligar vale na hora (CA-2256): a tela muda já; se o servidor não responder, volta e avisa.
    aoMudar(tipo, 'desligado')
    const r = await desligarAviso(cliente, token, tipo)
    setOcupado(null)
    if (!r.ok) {
      aoMudar(tipo, 'ligado')
      setErro(r.erro)
    }
  }

  return (
    <FolhaDoLink aberta={aberta} aoFechar={aoFechar} titulo="Avisos por e-mail" descricao={emailMascarado ?? undefined} cor={cor}>
      <div className="flex flex-col">
        {oferecidos.map((tipo) => {
          const ligado = avisos[tipo] === 'ligado'
          const pendente = !ligado && esperando.includes(tipo)
          return (
            <div key={tipo} className="flex min-h-16 items-center gap-3.5 border-t border-border py-2 first:border-0">
              <span className="min-w-0 flex-1">
                <span className="block text-base font-bold text-heading">{NOME_DO_AVISO[tipo]}</span>
                <span className="block text-sm text-muted-foreground">{pendente ? 'Confirme no e-mail para ligar.' : quando(tipo, nutricionista)}</span>
              </span>
              <Switch
                checked={ligado}
                disabled={ocupado === tipo}
                onCheckedChange={(ligar) => void mudar(tipo, ligar)}
                aria-label={NOME_DO_AVISO[tipo]}
                className="data-[state=checked]:bg-stateok"
              />
            </div>
          )
        })}
      </div>
      {erro ? (
        <Alert variant="error" role="alert">
          {erro}
        </Alert>
      ) : null}
      <p className="text-sm text-muted-foreground">Ligar um aviso manda um e-mail de confirmação.</p>
    </FolhaDoLink>
  )
}
