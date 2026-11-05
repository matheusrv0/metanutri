import { FileText } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { diaLocal } from '@/domain/acompanhamento.ts'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { avaliacoesDoPaciente, type AvaliacaoNaLista } from '@/domain/avaliacoesDoPaciente.ts'
import { casoNasFaixas } from '@/domain/caso.ts'
import { propostaNaDieta } from '@/domain/documentoDoPaciente.ts'
import { casoComFicha } from '@/domain/fichaNoPlano.ts'
import { assinaturaDaFolha } from '@/domain/folhaDieta.ts'
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
import { DialogoDocumentoAvaliacao } from './DialogoDocumentoAvaliacao.tsx'
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
  /** Quem assina o documento (D-1431, D-1495); `null` sem ninguém. */
  readonly assinatura?: AssinaturaDoPlano | null | undefined
  /** A exportação bloqueada pelo CRN (CA-290): "Gerar documento" fica desligado com este motivo (CA-2462). */
  readonly bloqueio?: string | null | undefined
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
export function TelaAntropometria({ rota, navegar, moldura, aoNovaAvaliacao, assinatura = null, bloqueio = null, agora = new Date() }: TelaAntropometriaProps) {
  const [documentoAberto, abrirDocumento] = useState(false)
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
  // D-1523: o número fora da faixa da etapa 1 fica no campo com o aviso, mas não entra em conta nem no documento.
  const caso = casoNasFaixas(comFicha.caso)
  const titulo = paciente ? paciente.nome.trim() || 'Paciente sem nome' : registro.caso.nome.trim() || 'Plano sem nome'
  const trilha = paciente ? [irParaPacientes] : [{ rotulo: 'Planos', aoClicar: () => navegar({ tela: 'casos' }) }]
  const linha = linhaDaPessoa(caso, paciente)
  // D-1425: o Histórico só se monta na vista dele; o resumo vai para a barra, no lugar da lista (como o protótipo).
  const historico = vista === 'historico' && paciente ? historicoAntropometrico(avaliacoesParaHistorico(avaliacoes, paciente, hoje)) : null
  const irParaVista = (nova: VistaDaAntropometria) => navegar({ tela: 'antropometria', casoId: registro.caso.id, vista: nova })

  // "Gerar documento" nas duas vistas; o Histórico começa a próxima avaliação (D-1405, D-1429, D-1489).
  const idDoBloqueio = `bloqueio-documento-${registro.caso.id}`
  const acoes = (
    <>
      {/* Pior caso (390 px): no celular, só o ícone, para o nome do paciente não virar "Mari a..." ao lado de dois botões. */}
      <Button
        size="sm"
        variant="outline"
        className="max-sm:size-11 max-sm:px-0"
        disabled={bloqueio !== null}
        aria-describedby={bloqueio ? idDoBloqueio : undefined}
        onClick={() => abrirDocumento(true)}
      >
        <FileText className="sm:hidden" aria-hidden="true" />
        <span className="max-sm:sr-only">Gerar documento</span>
      </Button>
      {vista === 'historico' && paciente ? (
        <Button size="sm" onClick={() => aoNovaAvaliacao(paciente.id)}>
          Nova avaliação
        </Button>
      ) : null}
    </>
  )
  const dataDaAvaliacao = registro.caso.dataConsulta ?? registro.atualizadoEm.slice(0, 10)

  return moldura(
    { titulo, trilha, acoes },
    <div className="flex flex-col gap-5">
      {linha ? <p className="text-sm text-muted-foreground">{linha}</p> : null}
      {paciente ? abas(paciente.id) : null}
      <BarraDaAvaliacao
        avaliacoes={paciente ? avaliacoes : null}
        casoId={registro.caso.id}
        data={dataDaAvaliacao}
        aoEscolherAvaliacao={(id) => navegar({ tela: 'antropometria', casoId: id, vista })}
        resumo={historico?.resumo ?? null}
        modalidade={registro.caso.avaliacao.modalidade}
        aoMudarModalidade={(modalidade) => alterarAvaliacao({ modalidade })}
        vista={vista}
        aoMudarVista={paciente ? irParaVista : null}
      />
      {bloqueio ? (
        <p id={idDoBloqueio} className="text-xs text-warningtext print:hidden">
          {bloqueio}
        </p>
      ) : null}
      {documentoAberto ? (
        <DialogoDocumentoAvaliacao
          entrada={{
            atual: { casoId: registro.caso.id, data: dataDaAvaliacao, caso },
            avaliacoes: paciente ? avaliacoesParaHistorico(avaliacoes, paciente, hoje) : [],
            paciente,
            hoje,
          }}
          assinatura={assinaturaDaFolha(assinatura, registro.caso)}
          proposta={propostaNaDieta(assinatura, registro.caso)}
          aoAlterar={alterarAvaliacao}
          aoFechar={() => abrirDocumento(false)}
        />
      ) : null}
      {historico ? (
        <VistaHistorico historico={historico} />
      ) : (
        <VistaAvaliacao caso={caso} bruto={registro.caso} paciente={paciente} aoAlterar={alterarCaso} />
      )}
    </div>,
  )
}
