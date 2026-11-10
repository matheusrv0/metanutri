// "Próximo e-mail" na ficha (spec lado-do-paciente, DP-LP-25; protótipo AvisosNutri): o aviso que a função `avisos`
// mandaria a seguir, com uma prévia do texto. Sem aviso a caminho, o motivo.
import { useId } from 'react'
import { NOME_DO_PROXIMO, previaDoProximo, quandoNoTexto, semProximo } from '@/domain/avisosNaFicha.ts'
import type { Acompanhamento } from '@/domain/acompanhamento.ts'
import type { EmailsDoLink } from '@/domain/emailsDoLink.ts'
import { primeiroNome } from '@/domain/whatsapp.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import type { ProximoAviso } from '../../../supabase/functions/_shared/avisos/regras.ts'

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

interface CartaoProximoEmailProps {
  readonly link: Pick<Acompanhamento, 'marcacoes' | 'missoes'>
  readonly emails: EmailsDoLink | null
  readonly proximo: ProximoAviso | null
  readonly nomeDoPaciente: string
  /** O nome que assina os e-mails (o do Perfil). */
  readonly nutricionista: string
  readonly registro: string
}

export function CartaoProximoEmail({ link, emails, proximo, nomeDoPaciente, nutricionista, registro }: CartaoProximoEmailProps) {
  const idTitulo = useId()
  const nome = primeiroNome(nomeDoPaciente)
  const previa = proximo ? previaDoProximo(proximo, link, nome, nutricionista) : null
  return (
    <Card className="gap-4" aria-labelledby={idTitulo}>
      <CardTitle id={idTitulo}>Próximo e-mail</CardTitle>
      {proximo && previa ? (
        <>
          <p className="text-sm">
            <strong className="block font-semibold text-heading">{previa.assunto}</strong>
            <span className="text-muted-foreground">{`${NOME_DO_PROXIMO[proximo.tipo]} · ${quandoNoTexto(proximo.quando)}${proximo.tipo === 'A2' ? ' · com os dias até agora' : ''}`}</span>
          </p>
          {/* A prévia: o cartão do e-mail, sem a cor e sem o botão de verdade (o e-mail é que leva os dois). */}
          <div aria-label="Prévia do e-mail" role="group" className="rounded-xl bg-surfacesunken p-3">
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <p className="text-sm">
                <strong className="block font-semibold text-heading [overflow-wrap:anywhere]">{nutricionista || 'Sua nutricionista'}</strong>
                <span className="text-xs text-muted-foreground">{registro}</span>
              </p>
              <p className="text-sm text-foreground [overflow-wrap:anywhere]">{previa.frase}</p>
              {previa.dias ? (
                <ol className="grid grid-cols-7 gap-1" aria-label="Os 7 dias do resumo">
                  {previa.dias.map((d) => (
                    <li key={d.dia} className="flex flex-col items-center gap-1 text-2xs text-muted-foreground">
                      <span>{DIAS_CURTOS[new Date(`${d.dia}T00:00:00Z`).getUTCDay()]}</span>
                      <span className={d.feitas > 0 ? 'numeros w-full rounded-md bg-lightsuccess py-1 text-center font-semibold text-successtext' : 'w-full rounded-md bg-muted py-1 text-center'}>
                        {d.feitas > 0 ? `${d.feitas}/${Math.max(previa.missoes, d.feitas)}` : '–'}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{semProximo(emails, nome)}</p>
      )}
    </Card>
  )
}
