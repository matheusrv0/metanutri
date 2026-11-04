import { useCallback, useMemo, type ReactNode } from 'react'
import { diaLocal } from '@/domain/acompanhamento.ts'
import { avaliacoesDoPaciente, type AvaliacaoNaLista } from '@/domain/avaliacoesDoPaciente.ts'
import { casoComFicha } from '@/domain/fichaNoPlano.ts'
import { avaliacoesParaHistorico, historicoAntropometrico } from '@/domain/historicoAntropometrico.ts'
import type { Paciente } from '@/domain/pacientes.ts'
import type { CasoSalvo } from '@/domain/persistencia.ts'
import type { Caso, DadosDaAvaliacao } from '@/domain/tipos.ts'
import { Card } from '@ds/componentes/display/card.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { useCasos } from '../estado/contextoCasos.ts'
import { usePacientes } from '../estado/contextoPacientes.ts'
import { useCasoAberto } from '../estado/usarCasoAberto.ts'
import type { PassoTrilha } from '../layout/Cabecalho.tsx'
import type { Rota, VistaDaAntropometria } from '../navegacao.ts'
import { AbasDaFicha } from './AbasDaFicha.tsx'
import { BarraDaAvaliacao } from './BarraDaAvaliacao.tsx'
import { VistaAvaliacao } from './VistaAvaliacao.tsx'
import { VistaHistorico } from './VistaHistorico.tsx'

/** O cabeçalho que a moldura do app desenha (o título, a trilha e as ações). */
export interface CabecaDaTela {
  readonly titulo: string
  readonly trilha: readonly PassoTrilha[]
  readonly acoes: ReactNode
}

export type MolduraDaTela = (cabeca: CabecaDaTela, conteudo: ReactNode) => ReactNode

export type RotaDaAntropometria = Extract<Rota, { readonly tela: 'antropometria' | 'antropometria-do-paciente' }>

interface TelaAntropometriaProps {
  readonly rota: RotaDaAntropometria
  readonly navegar: (rota: Rota) => void
  /** A `Estrutura` do app, com o cabeçalho que a tela decide (o pedaço da tela chega por `lazy`, DP-AT-10). */
  readonly moldura: MolduraDaTela
  /** D-1405: começa a avaliação nova do paciente (o retorno da mais recente, ou um plano completo novo). */
  readonly aoNovaAvaliacao: (pacienteId: string) => void
  /** Injetável no teste: a idade da ficha na data da avaliação e o "hoje". */
  readonly agora?: Date | undefined
}

const SEXO = { F: 'Feminino', M: 'Masculino' } as const

/** "Feminino · 34 anos · objetivo: perder gordura": só o que a ficha (ou o plano) sabe (D-1403). */
function linhaDaPessoa(caso: Caso, paciente: Paciente | null): string {
  const idade = caso.idadeAnos
  const textoDaIdade =
    idade === null ? null : idade === 0 ? `${caso.idadeMesesAdicionais} ${caso.idadeMesesAdicionais === 1 ? 'mês' : 'meses'}` : `${idade} ${idade === 1 ? 'ano' : 'anos'}`
  const objetivo = paciente?.objetivo.trim()
  return [caso.sexo ? SEXO[caso.sexo] : null, textoDaIdade, objetivo ? `objetivo: ${objetivo}` : null].filter((p) => p !== null).join(' · ')
}

/** Os planos completos do paciente, lidos só quando o paciente muda ou um plano dele é salvo. */
function useAvaliacoes(pacienteId: string | null): readonly AvaliacaoNaLista[] {
  const { casos, repositorio } = useCasos()
  return useMemo(() => {
    if (pacienteId === null) return []
    const dele: CasoSalvo[] = casos
      .filter((c) => c.pacienteId === pacienteId && c.modo === 'completo')
      .flatMap((c) => repositorio.obter(c.id) ?? [])
    return avaliacoesDoPaciente(pacienteId, dele)
  }, [casos, repositorio, pacienteId])
}

/**
 * A tela "Avaliação antropométrica" (spec antropometria-telas, D-1400 a D-1405): a avaliação é o plano completo do
 * paciente, lido e gravado pelo mesmo caminho da etapa 1 (salva a cada mudança). Vista Avaliação ou Histórico.
 */
export function TelaAntropometria({ rota, navegar, moldura, aoNovaAvaliacao, agora = new Date() }: TelaAntropometriaProps) {
  const { pacientes } = usePacientes()
  const pacienteDaRota = rota.tela === 'antropometria-do-paciente' ? rota.pacienteId : null
  const daRota = useAvaliacoes(pacienteDaRota)
  const casoId = rota.tela === 'antropometria' ? rota.casoId : (daRota[0]?.casoId ?? '')
  const vista: VistaDaAntropometria = rota.tela === 'antropometria' ? rota.vista : 'avaliacao'
  const { registro, alterarCaso } = useCasoAberto(casoId)
  const pacienteId = registro?.caso.pacienteId ?? pacienteDaRota
  const paciente = pacienteId ? (pacientes.find((p) => p.id === pacienteId) ?? null) : null
  const avaliacoes = useAvaliacoes(registro?.caso.pacienteId ?? null)
  const hoje = diaLocal(agora)

  const alterarAvaliacao = useCallback(
    (mudanca: Partial<DadosDaAvaliacao>) => {
      if (registro) alterarCaso({ avaliacao: { ...registro.caso.avaliacao, ...mudanca } })
    },
    [registro, alterarCaso],
  )

  const irParaPacientes: PassoTrilha = { rotulo: 'Pacientes', aoClicar: () => navegar({ tela: 'pacientes' }) }
  const abas = (id: string) => <AbasDaFicha atual="antropometria" aoIrPara={(aba) => (aba === 'ficha' ? navegar({ tela: 'paciente', pacienteId: id }) : undefined)} />

  // O paciente da aba "Antropometria" sem nenhuma avaliação: o vazio, com "Nova avaliação" (CA-2402).
  if (pacienteDaRota !== null && daRota.length === 0) {
    const doPaciente = pacientes.find((p) => p.id === pacienteDaRota)
    if (!doPaciente) {
      return moldura(
        { titulo: 'Paciente não encontrado', trilha: [irParaPacientes], acoes: null },
        <Card className="items-start gap-4">
          <p>Este paciente não existe mais. Ele pode ter sido excluído em outra aba ou em outro aparelho.</p>
          <Button variant="lightprimary" onClick={() => navegar({ tela: 'pacientes' })}>
            Voltar para Pacientes
          </Button>
        </Card>,
      )
    }
    return moldura(
      { titulo: doPaciente.nome.trim() || 'Paciente sem nome', trilha: [irParaPacientes], acoes: null },
      <div className="flex flex-col gap-6">
        {abas(doPaciente.id)}
        <Card className="items-start gap-4">
          <p>Nenhuma avaliação ainda.</p>
          <Button onClick={() => aoNovaAvaliacao(doPaciente.id)}>Nova avaliação</Button>
        </Card>
      </div>,
    )
  }

  if (!registro) {
    return moldura(
      { titulo: 'Avaliação não encontrada', trilha: [irParaPacientes], acoes: null },
      <Card className="items-start gap-4">
        <p>Esta avaliação não existe mais. Ela pode ter sido excluída em outra aba ou em outro aparelho.</p>
        <Button variant="lightprimary" onClick={() => navegar({ tela: 'pacientes' })}>
          Voltar para Pacientes
        </Button>
      </Card>,
    )
  }

  // D-340 (spec ficha-unica): o plano lê a ficha (sexo, idade e gestação na data da avaliação).
  const comFicha = casoComFicha(registro.caso, paciente, hoje)
  const caso = comFicha.caso
  const titulo = paciente ? paciente.nome.trim() || 'Paciente sem nome' : registro.caso.nome.trim() || 'Plano sem nome'
  const trilha = paciente ? [irParaPacientes] : [{ rotulo: 'Planos', aoClicar: () => navegar({ tela: 'casos' }) }]
  const linha = linhaDaPessoa(caso, paciente)
  // D-1425: o Histórico só se monta na vista dele; o resumo vai para a barra, no lugar da lista (como o protótipo).
  const historico = vista === 'historico' && paciente ? historicoAntropometrico(avaliacoesParaHistorico(avaliacoes, paciente, hoje)) : null
  const irParaVista = (nova: VistaDaAntropometria) => navegar({ tela: 'antropometria', casoId: registro.caso.id, vista: nova })

  // O histórico começa a próxima avaliação; a vista Avaliação gera o documento (D-1405, D-1429).
  const acoes =
    vista === 'historico' && paciente ? (
      <Button size="sm" onClick={() => aoNovaAvaliacao(paciente.id)}>
        Nova avaliação
      </Button>
    ) : null

  return moldura(
    { titulo, trilha, acoes },
    <div className="flex flex-col gap-5">
      {linha ? <p className="text-sm text-muted-foreground">{linha}</p> : null}
      {paciente ? abas(paciente.id) : null}
      <BarraDaAvaliacao
        avaliacoes={paciente ? avaliacoes : null}
        casoId={registro.caso.id}
        data={registro.caso.dataConsulta ?? registro.atualizadoEm.slice(0, 10)}
        aoEscolherAvaliacao={(id) => navegar({ tela: 'antropometria', casoId: id, vista })}
        resumo={historico?.resumo ?? null}
        modalidade={registro.caso.avaliacao.modalidade}
        aoMudarModalidade={(modalidade) => alterarAvaliacao({ modalidade })}
        vista={vista}
        aoMudarVista={paciente ? irParaVista : null}
      />
      {historico ? (
        <VistaHistorico historico={historico} />
      ) : (
        <VistaAvaliacao caso={caso} bruto={registro.caso} paciente={paciente} aoAlterar={alterarCaso} />
      )}
    </div>,
  )
}
