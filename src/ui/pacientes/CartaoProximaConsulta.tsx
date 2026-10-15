import { useId, useState } from 'react'
import { agoraEmBrasilia, consultaPassou, diaValido, escreverConsulta, lerConsulta } from '@/domain/retorno.ts'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'

interface CartaoProximaConsultaProps {
  /** O `proximaConsulta` da ficha, como está guardado. */
  readonly valor: string | null
  readonly agora: Date
  readonly aoMudar: (valor: string | null) => void
}

/** O que está na tela e ainda não foi gravado: valor de passagem enquanto o nutricionista digita. */
interface Rascunho {
  readonly dia?: string
  readonly hora?: string
}

const HORA_COMPLETA = /^\d{2}:\d{2}/

/**
 * A próxima consulta na ficha (spec whatsapp-e-retorno, D-143 e CA-512 a CA-515): dia, horário opcional e
 * limpar. Só valor completo e válido vai para a ficha (e para a nuvem). No meio da digitação o navegador manda
 * `''` e anos como `0002`: isso fica só na tela, e o horário não se perde (CA-514). Só "Limpar" tira a consulta.
 */
export function CartaoProximaConsulta({ valor, agora, aoMudar }: CartaoProximaConsultaProps) {
  const idTitulo = useId()
  const [rascunho, setRascunho] = useState<Rascunho>({})
  const consulta = lerConsulta(valor)
  const dia = rascunho.dia ?? consulta?.dia ?? ''
  const hora = rascunho.hora ?? consulta?.hora ?? ''
  const passou = consulta !== null && consultaPassou(consulta, agoraEmBrasilia(agora))

  const gravar = (novoDia: string, novaHora: string) => {
    aoMudar(escreverConsulta(novoDia, novaHora))
    setRascunho({})
  }

  const mudarDia = (v: string) => {
    if (!diaValido(v)) {
      setRascunho((r) => ({ ...r, dia: v }))
      return
    }
    // O horário que vai junto: o da tela, se estiver completo; senão, o que já estava gravado.
    gravar(v, HORA_COMPLETA.test(hora) ? hora : (consulta?.hora ?? ''))
  }

  const mudarHora = (v: string) => {
    if (v === '' || !diaValido(dia)) {
      setRascunho((r) => ({ ...r, hora: v }))
      return
    }
    gravar(dia, v)
  }

  // Apagar só o horário vale quando o campo perde o foco vazio: no meio da digitação, vazio é passagem.
  const sairDoHorario = () => {
    if (hora === '' && consulta?.hora && diaValido(dia)) gravar(dia, '')
  }

  const limpar = () => {
    aoMudar(null)
    setRascunho({})
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle id={idTitulo}>Próxima consulta</CardTitle>
        <CardDescription>Aparece no Painel na semana da consulta.</CardDescription>
      </CardHeader>
      <div role="group" aria-labelledby={idTitulo} className="flex flex-col gap-3">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto rotulo="Dia" tipo="date" valor={dia} aoMudar={mudarDia} erro={dia !== '' && !diaValido(dia) ? 'Confira a data.' : undefined} />
          <CampoTexto rotulo="Horário" tipo="time" valor={hora} desativado={dia === ''} aoMudar={mudarHora} aoSair={sairDoHorario} />
        </div>
        {consulta ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {passou ? <p className="text-xs text-warningtext">Essa consulta já passou.</p> : <span />}
            <Button variant="ghost" size="sm" onClick={limpar}>
              Limpar
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  )
}
