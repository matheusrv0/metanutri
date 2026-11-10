import { ClipboardList, Copy, Plus, Trash, UserRound } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { diaLocal } from '@/domain/acompanhamento.ts'
import { resumoDaAdesao } from '@/domain/adesaoNoRetorno.ts'
import type { AssinaturaDoPlano } from '@/domain/assinaturaDoPlano.ts'
import { proximoDoLink } from '@/domain/avisosNaFicha.ts'
import { dietaDoPlano } from '@/domain/dietaDoLink.ts'
import { apagarEmailsDoLink, definirEmailDaFicha } from '@/domain/emailsDoLink.ts'
import { perfilDaFicha } from '@/domain/fichaNoPlano.ts'
import { dataCompleta } from '@/domain/formatarData.ts'
import { linkDoPaciente } from '@/domain/linkFixo.ts'
import { pacienteDoAcompanhamento } from '@/domain/retorno.ts'
import type { Paciente } from '@/domain/pacientes.ts'
import { lerPerfil } from '@/domain/perfil.ts'
import { ultimoLinkPorPaciente } from '@/domain/retorno.ts'
import type { ModoPlano } from '@/domain/tipos.ts'
import { formatarAlteracao } from '../casos/formatarAlteracao.ts'
import { EscolherModo } from '../caso/EscolherModo.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import { useAcompanhamentosOpcional } from '../estado/contextoAcompanhamentos.ts'
import { useCasos } from '../estado/contextoCasos.ts'
import { usePacientes } from '../estado/contextoPacientes.ts'
import { useArmazenamento } from '../estado/contextoArmazenamento.ts'
import { useClienteDosEmails, useEmailsDoLink } from '../estado/usarEmailsDoLink.ts'
import { CartaoAvisosPorEmail } from './CartaoAvisosPorEmail.tsx'
import { CartaoEnviados } from './CartaoEnviados.tsx'
import { AnamneseDaFicha } from './AnamneseDaFicha.tsx'
import { CartaoDadosDoPaciente } from './CartaoDadosDoPaciente.tsx'
import { CartaoExames } from './CartaoExames.tsx'
import { CartaoLinkDoPaciente, type PlanoNoLink } from './CartaoLinkDoPaciente.tsx'
import { CartaoProximaConsulta } from './CartaoProximaConsulta.tsx'
import { CartaoProximoEmail } from './CartaoProximoEmail.tsx'
import { CartaoSuplementos } from './CartaoSuplementos.tsx'
import { baixarTermoDeIa } from '../exportar/baixar.ts'
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
  /** Abre a ficha com o cursor no Telefone, quando o WhatsApp do link não tem número (spec whatsapp-e-retorno, CA-505). */
  readonly aoCadastrarTelefone?: ((pacienteId: string) => void) | undefined
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
  aoCadastrarTelefone,
  aoAbrirAntropometria,
}: TelaPacienteProps) {
  const { repositorio, atualizar } = usePacientes()
  const { casos, repositorio: repoCasos, atualizar: atualizarCasos } = useCasos()
  const contextoDosLinks = useAcompanhamentosOpcional()
  const acompanhamentos = contextoDosLinks?.acompanhamentos ?? null
  const salvarLink = contextoDosLinks?.salvar ?? null
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [falhaAoExcluir, setFalhaAoExcluir] = useState(false)
  const idConduta = useId()

  const paciente = repositorio.obter(pacienteId)
  const hoje = diaLocal(agora)

  const planos = useMemo(() => casos.filter((c) => c.pacienteId === pacienteId), [casos, pacienteId])

  const evolucao = useMemo<readonly PontoEvolucao[]>(() => {
    return planos
      .map((resumo) => {
        const registro = repoCasos.obter(resumo.id)
        const peso = registro?.caso.pesoKg ?? null
        const data = registro?.caso.dataConsulta ?? resumo.atualizadoEm.slice(0, 10)
        return peso === null ? null : { data, pesoKg: peso }
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

  // Spec lado-do-paciente, D-1214: o link fixo do paciente, que a ficha mostra e atualiza.
  const link = acompanhamentos !== null && paciente ? linkDoPaciente(acompanhamentos, paciente.id, casos) : null
  const emailsDoLink = useEmailsDoLink(link?.id ?? null)
  const registroDoLink = link === null ? null : repoCasos.obter(link.casoId)
  const planoNoLink: PlanoNoLink | null =
    link === null || !registroDoLink
      ? null
      : {
          rotulo: registroDoLink.caso.dataConsulta ? `Plano de ${dataCompleta(registroDoLink.caso.dataConsulta)}` : registroDoLink.caso.nome.trim() || 'Plano sem nome',
          maisRecente: planos[0]?.id === link.casoId,
          dieta: dietaDoPlano(registroDoLink.caso, registroDoLink.plano),
        }

  // DP-LP-7: o e-mail da ficha vai para o link quando muda (o servidor só troca se ele mudou desde a última vez).
  const clienteDosEmails = useClienteDosEmails()
  const emailDaFicha = paciente?.email.trim() ?? ''
  const linkId = link?.id ?? null
  const recarregarEmails = emailsDoLink.recarregar
  useEffect(() => {
    if (linkId === null || clienteDosEmails === null) return
    let vivo = true
    void definirEmailDaFicha(clienteDosEmails, linkId, emailDaFicha === '' ? null : emailDaFicha).then((r) => {
      if (vivo && r.ok) recarregarEmails()
    })
    return () => {
      vivo = false
    }
  }, [linkId, clienteDosEmails, emailDaFicha, recarregarEmails])

  // O nome e o registro que assinam os e-mails, na prévia do próximo (D-1234).
  const perfilLocal = lerPerfil(useArmazenamento())
  const registro = perfilLocal.tipo === 'estudante' ? 'Estágio de nutrição, sob supervisão' : perfilLocal.crn.trim() ? `Nutricionista · ${perfilLocal.crn.trim()}` : 'Nutricionista'

  // D-1209 e CA-2214: a próxima consulta da ficha sobe para o link quando a ficha muda, sem link novo.
  const consultaDaFicha = paciente?.proximaConsulta ?? null
  useEffect(() => {
    if (link === null || salvarLink === null || (link.proximaConsulta ?? null) === consultaDaFicha) return
    void salvarLink({ ...link, proximaConsulta: consultaDaFicha })
  }, [link, salvarLink, consultaDaFicha])

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

  const perfil = perfilDaFicha(paciente, hoje, planos.length > 0)
  const proximo = link !== null && emailsDoLink.emails !== null ? proximoDoLink(link, emailsDoLink.emails, agora) : null

  /**
   * DP-LP-26 e CA-2284: excluir o paciente apaga o link dele (os antigos, substituídos, também), com o e-mail, os aceites
   * e os envios; a supressão do endereço fica (D-1243). A nuvem primeiro: se ela não apagar, a ficha fica e a tela avisa.
   */
  const excluirPaciente = async () => {
    setExcluindo(true)
    setFalhaAoExcluir(false)
    const doPaciente = (contextoDosLinks?.repositorio.listar() ?? []).filter((l) => pacienteDoAcompanhamento(l, casos) === paciente.id || l.pacienteId === paciente.id)
    for (const l of doPaciente) {
      // CB-1228: sem apagar os e-mails do link, o link fica (e a ficha também).
      const apagados = await apagarEmailsDoLink(clienteDosEmails, l.id)
      const motivo = apagados.ok ? ((await contextoDosLinks?.remover(l.id)) ?? null) : apagados.erro
      if (motivo !== null) {
        setExcluindo(false)
        setFalhaAoExcluir(true)
        return
      }
    }
    repositorio.excluir(paciente.id)
    atualizar()
    aoVoltar()
  }

  /** CA-2261: "Cadastrar na ficha" e "Corrigir na ficha" levam o cursor ao campo E-mail desta ficha. */
  const irParaOEmail = () => {
    const campo = Array.from(document.querySelectorAll('label')).find((rotulo) => rotulo.textContent?.trim() === 'E-mail')?.control
    if (!(campo instanceof HTMLElement)) return
    campo.scrollIntoView?.({ block: 'center' })
    campo.focus()
  }

  // Spec lado-do-paciente: a coluna da direita ganha os e-mails do link, depois do histórico e do peso; abaixo da tela
  // larga, eles vêm depois da ficha (o histórico e o peso continuam antes, CA-587).
  const ficha = (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:grid-rows-[auto_1fr]">
      <div className="flex flex-col gap-6 xl:row-span-2">
        <CartaoDadosDoPaciente
          paciente={paciente}
          perfil={perfil}
          hoje={hoje}
          aoAlterar={alterar}
          focarTelefone={focar === 'telefone'}
          focarEmail={focar === 'email'}
          aoBaixarTermoIa={() => void baixarTermoDeIa(assinatura, paciente.nome)}
        />

        <AnamneseDaFicha key={paciente.id} paciente={paciente} aoAlterar={alterar} perfil={perfil} hoje={hoje} adesao={adesao} />

        <section aria-labelledby={idConduta} className="flex flex-col gap-4">
          <h2 id={idConduta} className="card-title px-1">
            Conduta
          </h2>
          <CartaoSuplementos key={paciente.id} paciente={paciente} assinatura={assinatura} bloqueio={bloqueio} aoAlterar={alterar} focar={focar === 'suplementos'} />
          <CartaoExames key={`exames-${paciente.id}`} paciente={paciente} assinatura={assinatura} bloqueio={bloqueio} aoAlterar={alterar} />
          <CartaoProximaConsulta valor={paciente.proximaConsulta} agora={agora} aoMudar={(proximaConsulta) => alterar({ proximaConsulta })} />
          {/* D-1214 e D-359: o cartão do link vem depois da próxima consulta. */}
          {link !== null ? (
            <CartaoLinkDoPaciente
              paciente={paciente}
              link={link}
              planoNoLink={planoNoLink}
              emails={emailsDoLink.emails}
              aoMudarEmails={emailsDoLink.recarregar}
              hoje={hoje}
              aoCadastrarTelefone={aoCadastrarTelefone}
            />
          ) : null}
        </section>

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

      {link !== null ? (
        <div className="flex flex-col gap-6 xl:col-start-2">
          <CartaoAvisosPorEmail
            nomeDoPaciente={paciente.nome}
            linkId={link.id}
            emails={emailsDoLink.emails}
            erro={emailsDoLink.erro}
            aoMudar={emailsDoLink.recarregar}
            aoCadastrarEmail={irParaOEmail}
            agora={agora}
          />
          <CartaoProximoEmail link={link} emails={emailsDoLink.emails} proximo={proximo} nomeDoPaciente={paciente.nome} nutricionista={perfilLocal.nome} registro={registro} />
          <CartaoEnviados emails={emailsDoLink.emails} proximo={proximo} />
        </div>
      ) : null}

      {/* CA-587 (B6 da revisão r1): "Excluir paciente" é o último cartão abaixo da tela larga, depois dos e-mails do link;
          na tela larga, fica no fim da coluna da ficha. */}
      <div className="flex flex-col xl:col-start-1">
        <Card className="gap-3">
          <CardHeader>
            <CardTitle>Excluir paciente</CardTitle>
            <CardDescription>
              {link !== null
                ? 'Os planos continuam salvos, mas perdem o vínculo com esta ficha. O link do paciente deixa de abrir.'
                : 'Os planos continuam salvos, mas perdem o vínculo com esta ficha.'}
            </CardDescription>
          </CardHeader>
          {falhaAoExcluir ? (
            <p role="alert" className="text-sm text-errortext">
              Não foi possível apagar o link do paciente. Confira a internet e tente de novo.
            </p>
          ) : null}
          {confirmandoExclusao ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="destructive" loading={excluindo} onClick={() => void excluirPaciente()}>
                <Trash aria-hidden="true" />
                Excluir paciente
              </Button>
              <Button variant="ghost" onClick={() => setConfirmandoExclusao(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <Button variant="outline" className="self-start" onClick={() => setConfirmandoExclusao(true)}>
              <Trash aria-hidden="true" />
              Excluir paciente
            </Button>
          )}
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
