import type { ReactNode } from 'react'
import type { MissaoDoDia, ProgressoDia } from '@/domain/acompanhamento.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { BarraDoDia } from './BarraDoDia.tsx'
import { CartaoMensagem } from './CartaoMensagem.tsx'
import { LinhaDaMissao } from './LinhaDaMissao.tsx'
import { LinhaDaSemana } from './LinhaDaSemana.tsx'
import { dataDeHoje, tituloDeHoje } from './textosDoLink.ts'

export interface VerNoPlano {
  readonly rotulo: string
  readonly aoVer: () => void
}

interface ParteHojeProps {
  readonly hoje: string
  readonly primeiroNome: string
  readonly missoes: readonly MissaoDoDia[]
  readonly progresso: ProgressoDia
  readonly naoSalvou: string | null
  /** A mensagem e a consulta (D-1208, D-1209); sem as duas, o cartão não aparece. */
  readonly mensagem: string | null
  readonly nutricionista: string | null
  readonly dataDaMensagem: string
  readonly consulta: string | null
  /** A linha da semana: os 7 pontos, os dias e a frase da meta. */
  readonly pontos: readonly boolean[]
  readonly dias: number
  readonly frase: string
  /** O movimento do último toque (D-1204). */
  readonly acabouDeMarcar: string | null
  readonly segmentoNovo: number | null
  readonly brilhar: boolean
  readonly aoAlternar: (missaoId: string, feita: boolean) => void
  readonly verNoPlano: (missao: MissaoDoDia) => VerNoPlano | null
  readonly aoAbrirSemana: () => void
  /** O cartão Instalar (D-1219), quando cabe. */
  readonly instalar?: ReactNode
  /** O MetaNutri pequeno, quando a logo dela ocupa o topo (D-957). */
  readonly rodape?: ReactNode
}

/**
 * Hoje (D-1203): a data e o título, a barra do dia, a mensagem, as missões, a linha da semana e o cartão Instalar, nesta
 * ordem. A primeira missão cabe na primeira tela de um celular de 390 × 844 (CA-2201).
 */
export function ParteHoje(props: ParteHojeProps) {
  const { progresso, missoes } = props
  const tudoFeito = progresso.total > 0 && progresso.feitas === progresso.total
  return (
    <div className="flex flex-col gap-4">
      <header>
        <p className="text-sm text-muted-foreground">{dataDeHoje(props.hoje)}</p>
        <h1 className="mt-0.5 font-titulo text-2xl leading-tight font-extrabold tracking-tight text-heading [overflow-wrap:anywhere]">
          {tituloDeHoje(tudoFeito, props.primeiroNome)}
        </h1>
      </header>

      {missoes.length > 0 ? <BarraDoDia feitas={progresso.feitas} total={progresso.total} segmentoNovo={props.segmentoNovo} brilhar={props.brilhar} /> : null}

      {props.mensagem || props.consulta ? (
        <CartaoMensagem mensagem={props.mensagem} nutricionista={props.nutricionista} data={props.dataDaMensagem} consulta={props.consulta} />
      ) : null}

      {props.naoSalvou ? (
        <Alert variant="error" role="alert">
          {props.naoSalvou}
        </Alert>
      ) : null}

      {missoes.length > 0 ? (
        <ul aria-label="Missões de hoje" className="flex flex-col gap-2">
          {missoes.map((missao) => (
            <LinhaDaMissao
              key={missao.id}
              missao={missao}
              acabouDeMarcar={props.acabouDeMarcar === missao.id}
              aoAlternar={props.aoAlternar}
              ver={props.verNoPlano(missao)}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">Seu plano ainda não tem missões.</p>
      )}

      <LinhaDaSemana pontos={props.pontos} dias={props.dias} frase={props.frase} aoAbrir={props.aoAbrirSemana} />

      {props.instalar}
      {props.rodape}
    </div>
  )
}
