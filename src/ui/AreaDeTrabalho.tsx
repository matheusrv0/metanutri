import { ArrowRight, FolderOpen, Plus, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { dietaDoPlano } from '@/domain/dietaDoLink.ts'
import { calcularEnergia } from '@/domain/energia.ts'
import { criarExemplo } from '@/domain/exemplo.ts'
import { missoesDoPlano } from '@/domain/missoes.ts'
import { idadeDe, listaDeRestricoes } from '@/domain/pacientes.ts'
import { avisoDoEstudante } from '@/domain/pedidoEstudante.ts'
import { assinaturaDoPlano, camposDeEstagioIniciais } from '@/domain/assinaturaDoPlano.ts'
import { lerPerfil } from '@/domain/perfil.ts'
import { exportacaoBloqueada, MOTIVO_EXPORTACAO_BLOQUEADA } from '@/domain/situacao.ts'
import type { ModoPlano } from '@/domain/tipos.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card } from '@ds/componentes/display/card.tsx'
import { EtapasDoCaso } from '@ds/componentes/navigation/EtapasDoCaso.tsx'
import { TelaDesignSystem } from '@ds/vitrine/TelaDesignSystem.tsx'
import { TelaAdequacao } from './adequacao/TelaAdequacao.tsx'
import { MicrosDoDia } from './adequacao/MicrosDoDia.tsx'
import { TelaAjuda } from './ajuda/TelaAjuda.tsx'
import { TelaAlimentos } from './alimentos/TelaAlimentos.tsx'
import { TelaAprovacoes } from './aprovacoes/TelaAprovacoes.tsx'
import { EscolherModo } from './caso/EscolherModo.tsx'
import { TelaCaso } from './caso/TelaCaso.tsx'
import { TelaCasos } from './casos/TelaCasos.tsx'
import { TelaConfiguracoes } from './config/TelaConfiguracoes.tsx'
import { TelaConta } from './conta/TelaConta.tsx'
import { useAcompanhamentos } from './estado/contextoAcompanhamentos.ts'
import { useArmazenamento } from './estado/contextoArmazenamento.ts'
import { useCasos } from './estado/contextoCasos.ts'
import { usePacientes } from './estado/contextoPacientes.ts'
import type { ValorAprovacoes } from './estado/usarAprovacoes.ts'
import type { ValorAssinatura } from './estado/usarAssinatura.ts'
import { useCasoAberto } from './estado/usarCasoAberto.ts'
import type { ValorConta } from './estado/usarConta.ts'
import type { ValorNegocio } from './estado/usarNegocio.ts'
import type { ValorPedidoEstudante } from './estado/usarPedidoEstudante.ts'
import type { ValorPerfilConta } from './estado/usarPerfilConta.ts'
import type { ValorSegundoFator } from './estado/usarSegundoFator.ts'
import { MenuExportar } from './exportar/MenuExportar.tsx'
import { rotaDePlanos } from './fluxoConta.ts'
import { Estrutura } from './layout/Estrutura.tsx'
import type { CasoAtual } from './layout/MenuLateral.tsx'
import { CartaoLinkMissoes } from './missoes/CartaoLinkMissoes.tsx'
import { TelaAdesao } from './missoes/TelaAdesao.tsx'
import { TelaMissoesPaciente } from './missoes/TelaMissoesPaciente.tsx'
import { ETAPAS, type Rota } from './navegacao.ts'
import { TelaNegocio } from './negocio/TelaNegocio.tsx'
import { TelaSegundoFator } from './segundoFator/TelaSegundoFator.tsx'
import { TelaPaciente } from './pacientes/TelaPaciente.tsx'
import { TelaPacientes } from './pacientes/TelaPacientes.tsx'
import { processadorDoSite } from './pagamento/processadorMercadoPago.ts'
import { AvisoCrn } from './painel/AvisoCrn.tsx'
import { AvisoDoEstudante } from './painel/AvisoEstudante.tsx'
import { TelaPainel } from './painel/TelaPainel.tsx'
import { TelaPlano } from './plano/TelaPlano.tsx'
import { TelaProdutos } from './produtos/TelaProdutos.tsx'
import { Redirecionar } from './Redirecionar.tsx'
import { FaixaResumo } from './resumo/FaixaResumo.tsx'
import { ResumoDoDia } from './resumo/ResumoDoDia.tsx'

interface AreaDeTrabalhoProps {
  readonly rota: Rota
  readonly navegar: (rota: Rota) => void
  readonly conta: ValorConta
  readonly cobranca: ValorAssinatura
  readonly perfilConta: ValorPerfilConta
  readonly pedidoEstudante: ValorPedidoEstudante
  readonly aprovacoes: ValorAprovacoes
  readonly negocio: ValorNegocio
  /** O passo do app autenticador do administrador (spec seguranca-lote-5, D-261). */
  readonly segundoFator: ValorSegundoFator
  /** Depois de sair da conta; a cópia de trabalho do navegador já foi apagada (spec dados-na-nuvem, D-131). */
  readonly depoisDeSair: () => void
}

/**
 * As telas que mostram os dados da conta: o link do paciente e a área do nutricionista. Fica
 * dentro de ProvedoresDeDados, que a remonta quando a conta muda (spec dados-por-conta, CB-120).
 */
export function AreaDeTrabalho({ rota, navegar, conta, cobranca, perfilConta, pedidoEstudante, aprovacoes, negocio, segundoFator, depoisDeSair }: AreaDeTrabalhoProps) {
  const { casos, repositorio, atualizar } = useCasos()
  const { pacientes } = usePacientes()
  const { registro, alterarCaso, alterarPlano } = useCasoAberto(rota.tela === 'planejador' ? rota.casoId : '')
  const { fonte } = useAcompanhamentos()
  // "Ver todos" do cartão da etapa 2 leva ao título da etapa 3 (spec painel-lateral-enxuto, CA-701).
  const [focarAdequacao, setFocarAdequacao] = useState(false)
  // O perfil de Configurações é da conta que entrou (D-120).
  const dadosDaConta = useArmazenamento()
  const sessao = conta.sessao
  const { assinatura } = cobranca
  const { perfil } = perfilConta
  const agora = new Date()
  const bloqueio = exportacaoBloqueada(perfil, agora) ? MOTIVO_EXPORTACAO_BLOQUEADA : null
  // Quem assina os planos: a conta, ou Configurações quando não há servidor (spec ajustes-de-uso, D-37).
  const quemAssina = assinaturaDoPlano({ servidor: conta.disponivel, perfilConta: perfil, nomeDaSessao: sessao?.nome ?? '', perfilLocal: lerPerfil(dadosDaConta) })

  const recente = casos[0]
  const casoAtual: CasoAtual | null = registro
    ? { id: registro.caso.id, nome: registro.caso.nome }
    : recente
      ? { id: recente.id, nome: recente.nome }
      : null

  const novoCaso = (modo: ModoPlano, pacienteId: string | null = null) => {
    const criado = repositorio.criar('')
    const paciente = pacienteId ? pacientes.find((p) => p.id === pacienteId) ?? null : null
    const idade = paciente ? idadeDe(paciente.nascimento) : null
    const salvo = repositorio.salvar({
      caso: {
        ...criado.caso,
        modo,
        pacienteId,
        // CA-253: plano de estudante nasce com estagiário e preceptor.
        ...camposDeEstagioIniciais(quemAssina),
        // O plano já nasce com o que a ficha do paciente sabe.
        nome: paciente?.nome ?? criado.caso.nome,
        sexo: paciente?.sexo ?? criado.caso.sexo,
        idadeAnos: idade?.anos ?? criado.caso.idadeAnos,
        idadeMesesAdicionais: idade?.meses ?? criado.caso.idadeMesesAdicionais,
      },
      plano: criado.plano,
    })
    atualizar()
    navegar({ tela: 'planejador', casoId: salvo.caso.id, aba: 'caso' })
  }

  // O WhatsApp sem telefone leva à ficha, com o cursor no campo (spec whatsapp-e-retorno, CA-505).
  const cadastrarTelefone = (pacienteId: string) => navegar({ tela: 'paciente', pacienteId, campo: 'telefone' })

  // Primeiro acesso: um dia inteiro montado, para entender o sistema mexendo nele.
  const verExemplo = () => {
    const salvo = repositorio.salvar(criarExemplo(() => globalThis.crypto.randomUUID(), new Date().toISOString().slice(0, 10)))
    atualizar()
    navegar({ tela: 'planejador', casoId: salvo.caso.id, aba: 'plano' })
  }

  // O link do paciente abre sozinho: sem menu, sem conta e sem nada da área do nutricionista.
  if (rota.tela === 'missoes') {
    return <TelaMissoesPaciente token={rota.token} fonte={fonte} />
  }

  // CA-839: sem o código do app, o menu do administrador aparece sem o número de pendências (nada foi lido).
  const pendentes = perfilConta.ehAdmin ? aprovacoes.pendentes.total : perfilConta.precisaSegundoFator ? 0 : null
  const base = { rota, navegar, casoAtual, aoNovoCaso: novoCaso, aprovacoesPendentes: pendentes } as const
  const irParaCasos = { rotulo: 'Planos', aoClicar: () => navegar({ tela: 'casos' }) }

  const aviso = perfil?.situacao === 'estudante' && pedidoEstudante.carregado ? avisoDoEstudante(pedidoEstudante.pedido, assinatura) : null
  const avisoDaConta =
    perfil?.situacao === 'nutricionista' ? (
      <AvisoCrn perfil={perfil} agora={agora} aoCorrigir={perfilConta.corrigirCrn} />
    ) : aviso ? (
      <AvisoDoEstudante aviso={aviso} aoEnviar={() => navegar({ tela: 'comprovar-matricula' })} aoFechar={(id) => void pedidoEstudante.fecharAviso(id)} />
    ) : null

  if (rota.tela === 'painel') {
    return (
      <Estrutura
        {...base}
        titulo="Painel"
        acoes={
          <EscolherModo
            aoEscolher={(modo) => novoCaso(modo)}
            gatilho={
              <Button size="sm">
                <Plus aria-hidden="true" />
                Novo plano
              </Button>
            }
          />
        }
      >
        <TelaPainel
          aoAbrirPlano={(casoId) => navegar({ tela: 'planejador', casoId, aba: 'caso' })}
          aoIrPara={(tela) => navegar({ tela })}
          aoVerExemplo={verExemplo}
          aviso={avisoDaConta}
          aoCadastrarTelefone={cadastrarTelefone}
        />
      </Estrutura>
    )
  }

  if (rota.tela === 'pacientes') {
    return (
      <Estrutura {...base} titulo="Pacientes">
        <TelaPacientes aoAbrir={(id) => navegar({ tela: 'paciente', pacienteId: id })} />
      </Estrutura>
    )
  }

  if (rota.tela === 'paciente') {
    const paciente = pacientes.find((p) => p.id === rota.pacienteId)
    return (
      <Estrutura
        {...base}
        titulo={paciente?.nome.trim() || 'Paciente sem nome'}
        trilha={[{ rotulo: 'Pacientes', aoClicar: () => navegar({ tela: 'pacientes' }) }]}
      >
        <TelaPaciente
          pacienteId={rota.pacienteId}
          assinatura={quemAssina}
          bloqueio={bloqueio}
          aoAbrirPlano={(casoId) => navegar({ tela: 'planejador', casoId, aba: 'caso' })}
          aoNovoPlano={(pacienteId, modo) => novoCaso(modo, pacienteId)}
          aoVoltar={() => navegar({ tela: 'pacientes' })}
          focar={rota.campo}
        />
      </Estrutura>
    )
  }

  if (rota.tela === 'adesao') {
    return (
      <Estrutura {...base} titulo="Adesão">
        <TelaAdesao
          aoAbrirPlano={(casoId) => navegar({ tela: 'planejador', casoId, aba: 'plano' })}
          aoVerPlanos={() => navegar(rotaDePlanos(assinatura.plano))}
          aoCadastrarTelefone={cadastrarTelefone}
          {...(sessao ? { plano: assinatura.plano } : {})}
        />
      </Estrutura>
    )
  }

  if (rota.tela === 'ajuda') {
    return (
      <Estrutura {...base} titulo="Ajuda">
        <TelaAjuda aoIrPara={(tela) => navegar({ tela })} />
      </Estrutura>
    )
  }

  // D-261: o administrador sem o código do app vê o passo do app no lugar de Negócio e de Aprovações.
  if ((rota.tela === 'negocio' || rota.tela === 'aprovacoes') && perfilConta.precisaSegundoFator) {
    return (
      <Estrutura {...base} titulo={rota.tela === 'negocio' ? 'Negócio' : 'Aprovações'}>
        <TelaSegundoFator segundoFator={segundoFator} />
      </Estrutura>
    )
  }

  if (rota.tela === 'negocio') {
    if (!perfilConta.ehAdmin) return <Redirecionar para={{ tela: 'painel' }} navegar={navegar} />
    return (
      <Estrutura
        {...base}
        titulo="Negócio"
        acoes={
          <Button variant="outline" loading={negocio.carregando} onClick={negocio.atualizar}>
            <RefreshCw aria-hidden="true" />
            Atualizar
          </Button>
        }
      >
        <TelaNegocio negocio={negocio} />
      </Estrutura>
    )
  }

  if (rota.tela === 'aprovacoes') {
    if (!perfilConta.ehAdmin) return <Redirecionar para={{ tela: 'painel' }} navegar={navegar} />
    return (
      <Estrutura {...base} titulo="Aprovações">
        <TelaAprovacoes aprovacoes={aprovacoes} />
      </Estrutura>
    )
  }

  if (rota.tela === 'designsystem') {
    return (
      <Estrutura {...base} titulo="Design system">
        <TelaDesignSystem />
      </Estrutura>
    )
  }

  if (rota.tela === 'alimentos') {
    return (
      <Estrutura {...base} titulo="Tabela de alimentos">
        <TelaAlimentos aoAbrirFontes={() => navegar({ tela: 'fontes' })} />
      </Estrutura>
    )
  }

  if (rota.tela === 'conta') {
    return (
      <Estrutura {...base} titulo="Conta e plano">
        <TelaConta
          conta={conta}
          perfil={perfil}
          pedido={pedidoEstudante.pedido}
          meFormei={perfilConta.meFormei}
          corrigirCrn={perfilConta.corrigirCrn}
          aoEnviarComprovante={() => navegar({ tela: 'comprovar-matricula' })}
          aoMudouSituacao={() => {
            perfilConta.recarregar()
            pedidoEstudante.recarregar()
            cobranca.recarregar()
          }}
          aoSaiu={depoisDeSair}
          aoEntrar={() => navegar({ tela: 'entrar' })}
          aoVerPrecos={() => navegar({ tela: 'precos' })}
          aoIrParaConfig={() => navegar({ tela: 'config' })}
          aoAssinar={(plano, ciclo) => navegar({ tela: 'assinar', plano, ciclo })}
          aoMudouAssinatura={() => cobranca.recarregar()}
          criarProcessador={processadorDoSite()}
        />
      </Estrutura>
    )
  }

  if (rota.tela === 'config') {
    return (
      <Estrutura {...base} titulo="Configurações">
        <TelaConfiguracoes />
      </Estrutura>
    )
  }

  if (rota.tela === 'produtos') {
    return (
      <Estrutura {...base} titulo="Meus produtos">
        <TelaProdutos />
      </Estrutura>
    )
  }

  if (rota.tela === 'planejador') {
    if (!registro) {
      return (
        <Estrutura {...base} titulo="Plano não encontrado" trilha={[irParaCasos]}>
          <Card className="items-start gap-4">
            <p>Este plano não existe mais. Ele pode ter sido excluído em outra aba ou em outro aparelho.</p>
            <Button variant="lightprimary" onClick={() => navegar({ tela: 'casos' })}>
              <FolderOpen aria-hidden="true" />
              Voltar para Planos
            </Button>
          </Card>
        </Estrutura>
      )
    }

    const pacienteDoPlano = registro.caso.pacienteId ? pacientes.find((p) => p.id === registro.caso.pacienteId) ?? null : null
    const restricoesDoPaciente = pacienteDoPlano ? listaDeRestricoes(pacienteDoPlano.restricoes) : []
    // O gasto energético limita as sugestões do Cobrir, na etapa 2 e na 3.
    const gastoEnergetico = calcularEnergia(registro.caso, {
      fator: registro.caso.energia.fator,
      formula: registro.caso.energia.formula,
      getManual: registro.caso.energia.getManual,
    }).get

    const indice = ETAPAS.findIndex((e) => e.aba === rota.aba)
    const proxima = ETAPAS[indice + 1]
    return (
      <Estrutura
        {...base}
        titulo={registro.caso.nome || 'Plano sem nome'}
        trilha={[irParaCasos]}
        acoes={<MenuExportar caso={registro.caso} plano={registro.plano} bloqueio={bloqueio} assinatura={quemAssina} />}
      >
        <div className="flex flex-col gap-6">
          <EtapasDoCaso abaAtual={rota.aba} aoEscolher={(aba) => navegar({ tela: 'planejador', casoId: rota.casoId, aba })} />

          {rota.aba === 'caso' ? (
            <TelaCaso
              caso={registro.caso}
              aoAlterar={alterarCaso}
              assinatura={quemAssina}
              pacientes={pacientes.map((p) => ({ id: p.id, nome: p.nome }))}
              aoVincularPaciente={(pacienteId) => alterarCaso({ pacienteId })}
              lateral={<ResumoDoDia caso={registro.caso} plano={registro.plano} aoAlterar={alterarCaso} />}
            />
          ) : rota.aba === 'plano' ? (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <TelaPlano plano={registro.plano} aoAlterarPlano={alterarPlano} />
                <div className="flex flex-col gap-6">
                  <ResumoDoDia caso={registro.caso} plano={registro.plano} aoAlterar={alterarCaso} />
                  <MicrosDoDia
                    key={registro.caso.id}
                    caso={registro.caso}
                    plano={registro.plano}
                    gastoEnergetico={gastoEnergetico}
                    restricoes={restricoesDoPaciente}
                    aoAlterarCaso={alterarCaso}
                    aoAlterarPlano={alterarPlano}
                    aoVerTodos={() => {
                      setFocarAdequacao(true)
                      navegar({ tela: 'planejador', casoId: rota.casoId, aba: 'adequacao' })
                    }}
                  />
                </div>
              </div>
              <CartaoLinkMissoes
                casoId={registro.caso.id}
                pacienteId={registro.caso.pacienteId}
                nome={registro.caso.nome}
                missoes={missoesDoPlano(registro.plano, { pesoKg: registro.caso.pesoKg })}
                dieta={dietaDoPlano(registro.caso, registro.plano)}
                aoVerPlanos={() => navegar(rotaDePlanos(assinatura.plano))}
                aoCadastrarTelefone={cadastrarTelefone}
                situacao={perfil?.situacao ?? null}
                {...(sessao ? { plano: assinatura.plano } : {})}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <FaixaResumo caso={registro.caso} plano={registro.plano} aoAlterar={alterarCaso} />
              {/* Um estado por plano: trocar de plano (até pelo voltar) abre o recolhido fechado (CA-704). */}
              <TelaAdequacao
                key={registro.caso.id}
                caso={registro.caso}
                plano={registro.plano}
                gastoEnergetico={gastoEnergetico}
                restricoes={restricoesDoPaciente}
                aoAlterarCaso={alterarCaso}
                aoAlterarPlano={alterarPlano}
                aoAbrirFontes={() => navegar({ tela: 'fontes' })}
                focarTitulo={focarAdequacao}
                aoFocarTitulo={() => setFocarAdequacao(false)}
              />
            </div>
          )}

          {proxima ? (
            <div className="flex justify-end">
              <Button onClick={() => navegar({ tela: 'planejador', casoId: rota.casoId, aba: proxima.aba })}>
                Próxima etapa: {proxima.rotulo}
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </div>
      </Estrutura>
    )
  }

  return (
    <Estrutura
      {...base}
      titulo="Planos"
      acoes={
        <EscolherModo
          aoEscolher={novoCaso}
          gatilho={
            <Button size="sm" className="xl:hidden">
              <Plus aria-hidden="true" />
              Novo plano
            </Button>
          }
        />
      }
    >
      <TelaCasos aoAbrir={(id) => navegar({ tela: 'planejador', casoId: id, aba: 'caso' })} aoNovoCaso={novoCaso} />
    </Estrutura>
  )
}
