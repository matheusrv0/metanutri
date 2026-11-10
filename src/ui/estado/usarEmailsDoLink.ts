// Os e-mails de um link, para a ficha e para o cartão do plano (spec lado-do-paciente, D-1227). O cliente sai do
// contexto quando há um (os testes passam um falso) e, sem ele, do Supabase do app; sem servidor, a ficha diz
// "Indisponível no momento." (DP-LP-30).
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { buscarEmailsDoLink, EMAILS_INDISPONIVEIS, type ClienteDosEmails, type EmailsDoLink } from '@/domain/emailsDoLink.ts'
import { obterSupabase } from './supabase.ts'

/** `undefined` (sem provedor): o Supabase do app. Os testes passam um cliente falso, ou `null` para "sem servidor". */
export const ContextoClienteDosEmails = createContext<ClienteDosEmails | null | undefined>(undefined)

export function useClienteDosEmails(): ClienteDosEmails | null {
  const doContexto = useContext(ContextoClienteDosEmails)
  // O tipo do supabase-js é fundo demais para casar com a interface pequena (TS2589), como em `ProvedorAcompanhamentos`.
  const [doApp] = useState(() => obterSupabase() as unknown as ClienteDosEmails | null)
  return doContexto === undefined ? doApp : doContexto
}

export interface ValorEmailsDoLink {
  /** Nulo enquanto carrega e quando não deu para ler. */
  readonly emails: EmailsDoLink | null
  readonly erro: string | null
  readonly carregando: boolean
  readonly recarregar: () => void
}

/** Lê os e-mails do link ao abrir, quando o link muda e quando a tela pede (depois de enviar ou mudar um interruptor). */
export function useEmailsDoLink(linkId: string | null): ValorEmailsDoLink {
  const cliente = useClienteDosEmails()
  const [versao, setVersao] = useState(0)
  const [carga, setCarga] = useState<{ readonly chave: string; readonly emails: EmailsDoLink | null; readonly erro: string | null } | null>(null)
  const chave = `${linkId ?? ''}:${versao}`

  useEffect(() => {
    if (linkId === null) return
    let vivo = true
    if (cliente === null) {
      queueMicrotask(() => {
        if (vivo) setCarga({ chave, emails: null, erro: EMAILS_INDISPONIVEIS })
      })
    } else {
      void buscarEmailsDoLink(cliente, linkId).then((r) => {
        if (vivo) setCarga({ chave, emails: r.ok ? r.emails : null, erro: r.ok ? null : r.erro })
      })
    }
    return () => {
      vivo = false
    }
  }, [cliente, linkId, chave])

  const recarregar = useCallback(() => setVersao((v) => v + 1), [])
  // Recarregar não esconde o que já foi lido: a tela segue com os e-mails de antes até os novos chegarem.
  const daqui = carga !== null && carga.chave.startsWith(`${linkId ?? ''}:`)
  return {
    emails: daqui ? carga.emails : null,
    erro: daqui ? carga.erro : null,
    carregando: linkId !== null && carga?.chave !== chave,
    recarregar,
  }
}
