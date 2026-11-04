import { dataCompleta } from '@/domain/formatarData.ts'
import type { ModalidadeDaAvaliacao } from '@/domain/tipos.ts'
import { CampoEscolha } from '@ds/componentes/forms/CampoEscolha.tsx'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'
import type { VistaDaAntropometria } from '../navegacao.ts'

interface BarraDaAvaliacaoProps {
  /** As avaliações do paciente (D-1404); `null` no plano sem paciente. */
  readonly avaliacoes: readonly { readonly casoId: string; readonly data: string }[] | null
  readonly casoId: string
  /** A data da avaliação aberta, AAAA-MM-DD. */
  readonly data: string
  readonly aoEscolherAvaliacao: (casoId: string) => void
  readonly modalidade: ModalidadeDaAvaliacao | null
  readonly aoMudarModalidade: (modalidade: ModalidadeDaAvaliacao) => void
  readonly vista: VistaDaAntropometria
  /** `null` sem paciente: não há histórico (D-1402). */
  readonly aoMudarVista: ((vista: VistaDaAntropometria) => void) | null
}

const rotuloDaData = (data: string) => `Avaliação de ${dataCompleta(data) || 'data não informada'}`

/** A barra da tela: qual avaliação, a modalidade e "Avaliação | Histórico" (spec antropometria-telas, D-1404). */
export function BarraDaAvaliacao({ avaliacoes, casoId, data, aoEscolherAvaliacao, modalidade, aoMudarModalidade, vista, aoMudarVista }: BarraDaAvaliacaoProps) {
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3 print:hidden">
      <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
        {avaliacoes && avaliacoes.length > 0 ? (
          <CampoEscolha
            rotulo="Avaliação"
            rotuloOculto
            className="w-full sm:w-64"
            opcoes={avaliacoes.map((a) => ({ valor: a.casoId, rotulo: rotuloDaData(a.data) }))}
            valor={casoId}
            aoEscolher={aoEscolherAvaliacao}
          />
        ) : (
          <p className="text-sm font-semibold text-heading">{rotuloDaData(data)}</p>
        )}
        <CampoEscolha
          rotulo="Modalidade"
          rotuloOculto
          compacto
          className="w-full sm:w-44"
          vazio="Modalidade"
          opcoes={[
            { valor: 'presencial', rotulo: 'Presencial' },
            { valor: 'telenutricao', rotulo: 'Telenutrição' },
          ]}
          valor={modalidade}
          aoEscolher={aoMudarModalidade}
        />
      </div>
      {aoMudarVista ? (
        <SeletorSegmentado
          rotulo="Vista"
          opcoes={[
            { valor: 'avaliacao', rotulo: 'Avaliação' },
            { valor: 'historico', rotulo: 'Histórico' },
          ]}
          valor={vista}
          aoEscolher={aoMudarVista}
        />
      ) : null}
    </div>
  )
}
