// "E-mails" no Painel do dono (spec lado-do-paciente, D-1240, CA-2273, CA-2278 e CA-2281): enviados hoje e no mês contra
// os tetos, adiados, devolução e queixa em 7 dias, e o estado dos avisos, com "Retomar" quando a pausa automática parou.
import { useCallback, useEffect, useState } from 'react'
import { lerPainelDeEmails, retomarAvisos, type PainelDeEmails } from '@/domain/emailsDoLink.ts'
import { inteiro } from '@/domain/negocioTextos.ts'
import { useClienteDosEmails } from '@/ui/estado/usarEmailsDoLink.ts'
import { Card, CardTitle } from '@ds/componentes/display/card.tsx'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'

/** DP-LP-11: os avisos param 200 antes do teto do mês (1.900 de 2.100), a não ser que o dono mude a variável. */
const RESERVA_DO_SERVICO_NO_MES = 200

const UMA_CASA = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })
const porcento = (valor: number): string => `${UMA_CASA.format(valor)}%`

/** O estado dos avisos: "Enviando", "Pausado: devolução 2,4%" ou "Avisos pausados: cota do mês" (CA-2273, CA-2278). */
function estadoDosAvisos(p: PainelDeEmails): { readonly texto: string; readonly pausado: boolean; readonly retoma: boolean } {
  if (p.pausadoEm !== null) return { texto: `Pausado: ${p.motivo ?? 'pelo dono'}`, pausado: true, retoma: true }
  if (p.mes >= p.tetoMes - RESERVA_DO_SERVICO_NO_MES) return { texto: 'Avisos pausados: cota do mês', pausado: true, retoma: false }
  return { texto: 'Enviando', pausado: false, retoma: false }
}

export function CartaoEmailsDoDono() {
  const cliente = useClienteDosEmails()
  const [painel, setPainel] = useState<PainelDeEmails | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [retomando, setRetomando] = useState(false)

  const ler = useCallback(async () => {
    const r = await lerPainelDeEmails(cliente)
    if (r.ok) {
      setPainel(r.painel)
      setErro(null)
    } else setErro(r.erro)
  }, [cliente])

  useEffect(() => {
    let vivo = true
    void lerPainelDeEmails(cliente).then((r) => {
      if (!vivo) return
      if (r.ok) setPainel(r.painel)
      else setErro(r.erro)
    })
    return () => {
      vivo = false
    }
  }, [cliente])

  const retomar = async () => {
    setRetomando(true)
    const r = await retomarAvisos(cliente)
    setRetomando(false)
    if (!r.ok) setErro(r.erro)
    else await ler()
  }

  const estado = painel ? estadoDosAvisos(painel) : null

  return (
    <section aria-labelledby="titulo-emails-do-dono">
      <Card className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle id="titulo-emails-do-dono">E-mails</CardTitle>
          {estado ? <Badge variant={estado.pausado ? 'lightWarning' : 'lightSuccess'}>{estado.texto}</Badge> : null}
        </div>
        {painel === null ? (
          <p className="text-sm text-muted-foreground">{erro ?? 'Lendo os números…'}</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <div className="flex flex-col">
                <dt className="order-2 text-sm text-muted-foreground">Enviados hoje</dt>
                <dd className="numeros font-titulo text-2xl font-bold text-heading">
                  {inteiro(painel.hoje)}
                  <span className="text-base font-semibold text-muted-foreground">{` de ${inteiro(painel.tetoDia)}`}</span>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="order-2 text-sm text-muted-foreground">No mês</dt>
                <dd className="numeros font-titulo text-2xl font-bold text-heading">
                  {inteiro(painel.mes)}
                  <span className="text-base font-semibold text-muted-foreground">{` de ${inteiro(painel.tetoMes)}`}</span>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="order-2 text-sm text-muted-foreground">Adiados pelo teto em 7 dias</dt>
                <dd className="numeros font-titulo text-2xl font-bold text-heading">{inteiro(painel.adiados7d)}</dd>
              </div>
              <div className="flex flex-col">
                <dt className="order-2 text-sm text-muted-foreground">Devolução em 7 dias</dt>
                <dd className="numeros font-titulo text-2xl font-bold text-heading">{porcento(painel.devolucao7d)}</dd>
              </div>
              <div className="flex flex-col">
                <dt className="order-2 text-sm text-muted-foreground">Queixa em 7 dias</dt>
                <dd className="numeros font-titulo text-2xl font-bold text-heading">{porcento(painel.queixa7d)}</dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">{`${inteiro(painel.envios7d)} envios nos últimos 7 dias. A pausa automática vale com 200 envios ou mais: devolução acima de 2% ou queixa acima de 0,05%.`}</p>
            {estado?.retoma ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" loading={retomando} onClick={() => void retomar()}>
                  Retomar
                </Button>
                {erro ? <span className="text-sm text-errortext">{erro}</span> : null}
              </div>
            ) : null}
          </>
        )}
      </Card>
    </section>
  )
}
