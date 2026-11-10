import { ClipboardList, Copy, Plus, Trash, UserRound } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { diaLocal } from '@/domain/acompanhamento.ts'
import { resumoDaAdesao } from '@/domain/adesaoNoRetorno.ts'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { dataDaAvaliacao } from '@/domain/avaliacoesDoPaciente.ts'
import { perfilDaFicha } from '@/domain/fichaNoPlano.ts'
import { apagarArquivosDoPlano, semArquivos, temArquivos } from '@/domain/fotosDaAvaliacao.ts'
import type { Paciente } from '@/domain/pacientes.ts'
import { ultimoLinkPorPaciente } from '@/domain/retorno.ts'
import type { ModoPlano } from '@/domain/tipos.ts'
import { useArmazenamentoDeFotos } from '../antropometria/armazenamentoDeFotos.ts'
import { formatarAlteracao } from '../casos/formatarAlteracao.ts'
import { EscolherModo } from '../caso/EscolherModo.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { useAcompanhamentosOpcional } from '../estado/contextoAcompanhamentos.ts'
import { useCasos } from '../estado/contextoCasos.ts'
import { usePacientes } from '../estado/contextoPacientes.ts'
import { AnamneseDaFicha } from './AnamneseDaFicha.tsx'
import { CartaoDadosDoPaciente } from './CartaoDadosDoPaciente.tsx'
import { CartaoExames } from './CartaoExames.tsx'
import { CartaoProximaConsulta } from './CartaoProximaConsulta.tsx'
import { CartaoSuplementos } from './CartaoSuplementos.tsx'
import type { CampoDaFicha } from '../navegacao.ts'
import { EvolucaoPeso, type PontoEvolucao } from './EvolucaoPeso.tsx'
import { AbasDaFicha } from '../antropometria/AbasDaFicha.tsx'

interface TelaPacienteProps {
  readonly pacienteId: string
  /** Quem assina as folhas de suplementos e de exames (spec anamnese-e-prescricoes, D-167). */
  readonly assinatura?: AssinaturaDoPlano | null | undefined
  /** O exportar bloqueado pelo CRN (CA-290): as folhas de suplementos e de exames ficam desligadas. */
  readonly bloqueio?: string | null | undefined
  readonly aoAbrirPlano: (casoId: string) => void
  readonly aoNovoPlano: (pacienteId: string, modo: ModoPlano) => void
  readonly aoVoltar: () => void
  /** O campo que recebe o cursor ao abrir: o WhatsApp sem telefone leva até ele (CA-517); o Cobrir do ferro da gestante, à Suplementação prescrita (D-476). */
  readonly focar?: CampoDaFicha | undefined
  /** Injetável no teste; decide se a próxima consulta já passou, a idade de hoje e as semanas de gestação. */
  readonly agora?: Date | undefined
  /** A aba "Antropometria" (spec antropometria-telas, D-1402); sem ela, a ficha abre sem as abas. */
  readonly aoAbrirAntropometria?: (() => void) | undefined
}

/**
 * Ficha do paciente (spec ficha-unica, D-359): Dados do paciente, Anamnese na ordem do PCN e Conduta (suplementação
 * prescrita, pedido de exames e próxima consulta), com o histórico de planos e a evolução do peso ao lado.
 */
export function TelaPaciente({
  pacienteId,
  assinatura = null,
  bloqueio = null,
  aoAbrirPlano,
  aoNovoPlano,
  aoVoltar,
  focar,
  agora = new Date(),
  aoAbrirAntropometria,
}: TelaPacienteProps) {
  const { repositorio, atualizar } = usePacientes()
  const { casos, repositorio: repoCasos, atualizar: atualizarCasos, salvar: salvarCaso } = useCasos()
  const fotos = useArmazenamentoDeFotos()
  const acompanhamentos = useAcompanhamentosOpcional()?.acompanhamentos ?? null
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erroDaExclusao, setErroDaExclusao] = useState<string | null>(null)
  const idConduta = useId()

  const paciente = repositorio.obter(pacienteId)
  const hoje = diaLocal(agora)

  const planos = useMemo(() => casos.filter((c) => c.pacienteId === pacienteId), [casos, pacienteId])

  const evolucao = useMemo<readonly PontoEvolucao[]>(() => {
    return planos
      .map((resumo) => {
        const registro = repoCasos.obter(resumo.id)
        const peso = registro?.caso.pesoKg ?? null
        // Spec antropometria-telas, D-1502: sem data da consulta, o dia da última alteração no relógio de quem usa.
        return peso === null || !registro ? null : { data: dataDaAvaliacao(registro), pesoKg: peso }
      })
      .filter((p): p is PontoEvolucao => p !== null)
      .sort((a, b) => a.data.localeCompare(b.data))
  }, [planos, repoCasos])

  // CA-1064: o último link do paciente, resumido no bloco Retorno.
  const adesao = useMemo(() => {
    if (acompanhamentos === null) return null
    const link = ultimoLinkPorPaciente(acompanhamentos, casos).get(pacienteId)
    return link ? resumoDaAdesao(link, hoje) : null
  }, [acompanhamentos, casos, pacienteId, hoje])

  if (!paciente) {
    return (
      <Card className="items-start gap-4">
        <p>Este paciente não existe mais. Ele pode ter sido excluído em outra aba ou em outro aparelho.</p>
        <Button variant="lightprimary" onClick={aoVoltar}>
          Voltar para Pacientes
        </Button>
      </Card>
    )
  }

  /** O retorno começa do plano anterior: copia o plano sem as medidas do dia (D-367), troca a data e abre a cópia. */
  const duplicar = (casoId: string) => {
    const copia = repoCasos.duplicar(casoId, { nascimento: paciente.nascimento })
    atualizarCasos()
    aoAbrirPlano(copia.caso.id)
  }

  const alterar = (mudanca: Partial<Paciente>) => {
    repositorio.salvar({ ...paciente, ...mudanca })
    atualizar()
  }

  // D-1503 e D-1534 (spec antropometria-telas): sem paciente, o cartão das fotos não aparece. A pasta de cada avaliação
  // sai antes do balde, e o plano cuja pasta saiu perde a lista; se alguma não sair, a ficha fica e o aviso diz.
  const excluirPaciente = async () => {
    setExcluindo(true)
    setErroDaExclusao(null)
    let falhou = false
    for (const resumo of planos) {
      if (fotos && !(await apagarArquivosDoPlano(fotos, resumo.id))) {
        falhou = true
        continue
      }
      const registro = repoCasos.obter(resumo.id)
      if (registro && temArquivos(registro.caso.avaliacao)) {
        salvarCaso({ caso: { ...registro.caso, avaliacao: semArquivos(registro.caso.avaliacao) }, plano: registro.plano })
      }
    }
    setExcluindo(false)
    if (falhou) {
      setErroDaExclusao('Não foi possível apagar as fotos e os anexos das avaliações. A ficha continua. Confira a internet e tente de novo.')
      return
    }
    repositorio.excluir(paciente.id)
    atualizar()
    aoVoltar()
  }

  const perfil = perfilDaFicha(paciente, hoje, planos.length > 0)

  const ficha = (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-6">
        <CartaoDadosDoPaciente paciente={paciente} perfil={perfil} hoje={hoje} aoAlterar={alterar} focarTelefone={focar === 'telefone'} />

        <AnamneseDaFicha key={paciente.id} paciente={paciente} aoAlterar={alterar} perfil={perfil} hoje={hoje} adesao={adesao} />

        <section aria-labelledby={idConduta} className="flex flex-col gap-4">
          <h2 id={idConduta} className="card-title px-1">
            Conduta
          </h2>
          <CartaoSuplementos key={paciente.id} paciente={paciente} assinatura={assinatura} bloqueio={bloqueio} aoAlterar={alterar} focar={focar === 'suplementos'} />
          <CartaoExames key={`exames-${paciente.id}`} paciente={paciente} assinatura={assinatura} bloqueio={bloqueio} aoAlterar={alterar} />
          <CartaoProximaConsulta valor={paciente.proximaConsulta} agora={agora} aoMudar={(proximaConsulta) => alterar({ proximaConsulta })} />
        </section>

        <Card className="gap-3">
          <CardHeader>
            <CardTitle>Excluir paciente</CardTitle>
            <CardDescription>Os planos continuam salvos, mas perdem o vínculo com esta ficha. As fotos e os anexos das avaliações são apagados.</CardDescription>
          </CardHeader>
          {confirmandoExclusao ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="destructive" disabled={excluindo} onClick={() => void excluirPaciente()}>
                <Trash aria-hidden="true" />
                Excluir paciente
              </Button>
              <Button variant="ghost" onClick={() => setConfirmandoExclusao(false)}>
                Cancelar
              </Button>
              {erroDaExclusao ? (
                <p role="alert" className="w-full text-sm text-errortext">
                  {erroDaExclusao}
                </p>
              ) : null}
            </div>
          ) : (
            <Button variant="outline" className="self-start" onClick={() => setConfirmandoExclusao(true)}>
              <Trash aria-hidden="true" />
              Excluir paciente
            </Button>
          )}
        </Card>
      </div>

      {/* CA-587: abaixo da tela larga, o histórico e o peso vêm antes dos cartões longos; "Excluir paciente" fica por último. */}
      <div className="order-first flex flex-col gap-6 xl:order-none">
        <Card className="gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="size-4 text-primary" aria-hidden="true" />
              <CardTitle>Histórico de planos</CardTitle>
            </div>
            <EscolherModo
              aoEscolher={(modo) => aoNovoPlano(paciente.id, modo)}
              gatilho={
                <Button size="sm" variant="lightprimary">
                  <Plus aria-hidden="true" />
                  Novo plano
                </Button>
              }
            />
          </div>
          {planos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum plano para este paciente ainda.</p>
          ) : (
            <ul className="flex flex-col" aria-label="Planos do paciente">
              {planos.map((p) => (
                <li key={p.id} className="flex items-center gap-3 border-b border-border py-2 last:border-0">
                  <div className="min-w-0 flex-1">
                    {/* M-007 (spec ajustes-mobile, D-801): até 2 linhas, e o nome inteiro no `title`. */}
                    <p className="line-clamp-2 break-words text-sm font-medium text-heading" title={p.nome.trim() || 'Plano sem nome'}>
                      {p.nome.trim() || 'Plano sem nome'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {`${p.modo === 'rapido' ? 'Prescrição rápida' : 'Atendimento completo'} · ${formatarAlteracao(p.atualizadoEm).toLowerCase()}`}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => duplicar(p.id)} title="Começar o retorno a partir deste plano">
                    <Copy aria-hidden="true" />
                    <span className="sr-only">{`Duplicar ${p.nome.trim() || 'plano sem nome'}`}</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => aoAbrirPlano(p.id)}>
                    Abrir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="gap-4">
          <div className="flex items-center gap-2">
            <UserRound className="size-4 text-primary" aria-hidden="true" />
            <CardTitle>Evolução do peso</CardTitle>
          </div>
          <EvolucaoPeso pontos={evolucao} />
        </Card>
      </div>
    </div>
  )

  if (!aoAbrirAntropometria) return ficha
  return (
    <div className="flex flex-col gap-6">
      <AbasDaFicha atual="ficha" aoIrPara={(aba) => (aba === 'antropometria' ? aoAbrirAntropometria() : undefined)} />
      {ficha}
    </div>
  )
}
