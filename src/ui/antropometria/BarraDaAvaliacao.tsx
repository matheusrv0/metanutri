import { rotulosDaLista } from '@/domain/avaliacoesDoPaciente.ts'
import type { ModalidadeDaAvaliacao } from '@/domain/tipos.ts'
import { Escolha } from './Escolha.tsx'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'
import type { VistaDaAntropometria } from '../navegacao.ts'

interface BarraDaAvaliacaoProps {
  /** As avaliações do paciente (D-1404); `null` no plano sem paciente. */
  readonly avaliacoes: readonly { readonly casoId: string; readonly data: string }[] | null
  readonly casoId: string
  /** A data da avaliação aberta, AAAA-MM-DD. */
  readonly data: string
  readonly aoEscolherAvaliacao: (casoId: string) => void
  /** No Histórico, o resumo ("4 avaliações · de ... a ...") no lugar da lista e da modalidade, como o protótipo. */
  readonly resumo?: string | null | undefined
  readonly modalidade: ModalidadeDaAvaliacao | null
  readonly aoMudarModalidade: (modalidade: ModalidadeDaAvaliacao) => void
  readonly vista: VistaDaAntropometria
  /** `null` sem paciente: não há histórico (D-1402). */
  readonly aoMudarVista: ((vista: VistaDaAntropometria) => void) | null
}

/** A barra da tela: qual avaliação, a modalidade e "Avaliação | Histórico" (spec antropometria-telas, D-1404 e D-1529). */
export function BarraDaAvaliacao({
  avaliacoes,
  casoId,
  data,
  aoEscolherAvaliacao,
  resumo = null,
  modalidade,
  aoMudarModalidade,
  vista,
  aoMudarVista,
}: BarraDaAvaliacaoProps) {
  const rotulos = avaliacoes ? rotulosDaLista(avaliacoes) : []
  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3 print:hidden">
      {resumo !== null ? (
        <p className="min-w-0 flex-1 text-sm text-muted-foreground max-sm:basis-full">{resumo}</p>
      ) : (
        // CB-1452: no celular a lista ocupa a linha toda, sem dividir com o seletor da vista (o texto inteiro à vista).
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3 max-sm:basis-full">
          {avaliacoes && avaliacoes.length > 0 ? (
            <Escolha
              rotulo="Avaliação"
              rotuloOculto
              className="w-full sm:w-64"
              opcoes={avaliacoes.map((a, i) => ({
                valor: a.casoId,
                rotulo: rotulos[i] ?? '',
              }))}
              valor={casoId}
              aoEscolher={aoEscolherAvaliacao}
            />
          ) : (
            <p className="text-sm font-semibold text-heading">{rotulosDaLista([{ casoId, data }])[0]}</p>
          )}
          <Escolha
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
      )}
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
