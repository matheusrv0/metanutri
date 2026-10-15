import { useId } from 'react'
import { agoraEmBrasilia, consultaPassou, escreverConsulta, lerConsulta } from '@/domain/retorno.ts'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'

interface CartaoProximaConsultaProps {
  /** O `proximaConsulta` da ficha, como está guardado. */
  readonly valor: string | null
  readonly agora: Date
  readonly aoMudar: (valor: string | null) => void
}

/** A próxima consulta na ficha (spec whatsapp-e-retorno, D-143 e CA-512 a CA-515): dia, horário opcional e limpar. */
export function CartaoProximaConsulta({ valor, agora, aoMudar }: CartaoProximaConsultaProps) {
  const idTitulo = useId()
  const consulta = lerConsulta(valor)
  const dia = consulta?.dia ?? ''
  const hora = consulta?.hora ?? ''
  const passou = consulta !== null && consultaPassou(consulta, agoraEmBrasilia(agora))

  return (
    <Card>
      <CardHeader>
        <CardTitle id={idTitulo}>Próxima consulta</CardTitle>
        <CardDescription>Aparece no Painel na semana da consulta.</CardDescription>
      </CardHeader>
      <div role="group" aria-labelledby={idTitulo} className="flex flex-col gap-3">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto rotulo="Dia" tipo="date" valor={dia} aoMudar={(v) => aoMudar(escreverConsulta(v, hora))} />
          <CampoTexto rotulo="Horário" tipo="time" valor={hora} desativado={dia === ''} aoMudar={(v) => aoMudar(escreverConsulta(dia, v))} />
        </div>
        {consulta ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {passou ? <p className="text-xs text-warningtext">Essa data já passou.</p> : <span />}
            <Button variant="ghost" size="sm" onClick={() => aoMudar(null)}>
              Limpar
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
