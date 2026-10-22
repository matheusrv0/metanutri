import { TriangleAlert } from 'lucide-react'
import { FAIXAS } from '@/domain/caso.ts'
import { AMAMENTACOES, mesesEntre, semanasNaData, type Amamentacao, type MomentoDeVida } from '@/domain/momentoDeVida.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { CampoNumero } from '@ds/componentes/forms/CampoNumero.tsx'
import { CampoTexto } from '@ds/componentes/forms/CampoTexto.tsx'
import { GrupoOpcoes } from '@ds/componentes/forms/GrupoOpcoes.tsx'

type Tipo = MomentoDeVida['tipo']

const OPCOES: readonly { readonly valor: Tipo; readonly rotulo: string }[] = [
  { valor: 'nenhum', rotulo: 'Não' },
  { valor: 'gestante', rotulo: 'Gestante' },
  { valor: 'lactante', rotulo: 'Lactante' },
]

interface CampoGestacaoLactacaoProps {
  readonly valor: MomentoDeVida | null
  /** O dia de hoje (AAAA-MM-DD): as semanas e os meses são os de hoje. */
  readonly hoje: string
  /** R1: a pessoa pode gestar ou lactar; fora disso o campo só aparece com dado, com o aviso (CB-341). */
  readonly valeParaAPessoa: boolean
  readonly aoMudar: (valor: MomentoDeVida) => void
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`

/**
 * Gestação ou lactação na ficha (spec ficha-unica, D-342): as semanas informadas hoje andam sozinhas; a lactação guarda
 * a data do parto e a amamentação. O plano lê daqui na data da consulta.
 */
export function CampoGestacaoLactacao({ valor, hoje, valeParaAPessoa, aoMudar }: CampoGestacaoLactacaoProps) {
  const trocar = (tipo: Tipo) => {
    if (tipo === valor?.tipo) return
    aoMudar(
      tipo === 'gestante'
        ? { tipo: 'gestante', semanas: null, semanasEm: null, pesoPreGestacionalKg: null }
        : tipo === 'lactante'
          ? { tipo: 'lactante', dataDoParto: null, amamentacao: null }
          : { tipo: 'nenhum' },
    )
  }
  const semanasHoje = valor?.tipo === 'gestante' ? semanasNaData(valor, hoje) ?? valor.semanas : null
  const passou = semanasHoje !== null && semanasHoje > FAIXAS.semanasGestacao.max
  const meses = valor?.tipo === 'lactante' && valor.dataDoParto ? mesesEntre(valor.dataDoParto, hoje) : null

  return (
    <div className="flex flex-col gap-4 sm:col-span-2">
      <GrupoOpcoes<Tipo> rotulo="Gestação ou lactação" opcoes={OPCOES} valor={valor?.tipo ?? null} aoEscolher={trocar} />
      {valeParaAPessoa ? null : (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <p>Gestação e lactação valem para o sexo feminino de 14 a 50 anos. Confira o sexo e a data de nascimento.</p>
        </Alert>
      )}
      {valor?.tipo === 'gestante' ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <CampoNumero
            rotulo="Idade gestacional"
            valor={semanasHoje}
            aoMudar={(semanas) => aoMudar({ ...valor, semanas, semanasEm: semanas === null ? null : hoje })}
            sufixo="semanas"
            dica="Avança sozinha a cada semana."
          />
          <CampoNumero
            rotulo="Peso pré-gestacional"
            valor={valor.pesoPreGestacionalKg}
            aoMudar={(pesoPreGestacionalKg) => aoMudar({ ...valor, pesoPreGestacionalKg })}
            sufixo="kg"
          />
        </div>
      ) : null}
      {passou ? (
        <Alert variant="warning">
          <TriangleAlert aria-hidden="true" />
          <p>Pela data informada, a gestação passou de 42 semanas. Se o bebê nasceu, marque Lactante ou Não.</p>
        </Alert>
      ) : null}
      {valor?.tipo === 'lactante' ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <CampoTexto
            rotulo="Data do parto"
            tipo="date"
            valor={valor.dataDoParto ?? ''}
            aoMudar={(v) => aoMudar({ ...valor, dataDoParto: v || null })}
            dica={meses === null ? undefined : `${plural(meses, 'mês', 'meses')} após o parto.`}
          />
          <GrupoOpcoes<Amamentacao>
            rotulo="Amamentação"
            opcoes={AMAMENTACOES}
            valor={valor.amamentacao}
            aoEscolher={(amamentacao) => aoMudar({ ...valor, amamentacao })}
          />
        </div>
      ) : null}
    </div>
  )
}
