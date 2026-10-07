import { ArrowRight, FolderOpen, Plus, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { calcularEnergia } from './domain/energia.ts'
import { apagarDadosDoAparelho, registrarDono, situacaoAoEntrar } from './domain/donoDosDados.ts'
import { CONTATO_EMAIL } from './domain/legal.ts'
import { criarExemplo } from './domain/exemplo.ts'
import { missoesDoPlano } from './domain/missoes.ts'
import { idadeDe, listaDeRestricoes } from './domain/pacientes.ts'
import { avisoDoEstudante } from './domain/pedidoEstudante.ts'
import { assinaturaDoPlano, camposDeEstagioIniciais } from './domain/assinaturaDoPlano.ts'
import { lerPerfil } from './domain/perfil.ts'
import { exportacaoBloqueada, MOTIVO_EXPORTACAO_BLOQUEADA } from './domain/situacao.ts'
import type { ModoPlano } from './domain/tipos.ts'
import { TelaAdequacao } from './ui/adequacao/TelaAdequacao.tsx'
import { TelaAprovacoes } from './ui/aprovacoes/TelaAprovacoes.tsx'
import { TelaNegocio } from './ui/negocio/TelaNegocio.tsx'
import { EscolherModo } from './ui/caso/EscolherModo.tsx'
import { TelaCaso } from './ui/caso/TelaCaso.tsx'
import { TelaCasos } from './ui/casos/TelaCasos.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card } from '@ds/componentes/display/card.tsx'
import { useCasos } from './ui/estado/contextoCasos.ts'
import { ProvedorCasos } from './ui/estado/ProvedorCasos.tsx'
import { ProvedorAcompanhamentos } from './ui/estado/ProvedorAcompanhamentos.tsx'
import { useAcompanhamentos } from './ui/estado/contextoAcompanhamentos.ts'
import { ProvedorPacientes } from './ui/estado/ProvedorPacientes.tsx'
import { usePacientes } from './ui/estado/contextoPacientes.ts'
import { useAprovacoes } from './ui/estado/usarAprovacoes.ts'
import { useNegocio } from './ui/estado/usarNegocio.ts'
import { useCasoAberto } from './ui/estado/usarCasoAberto.ts'
import { usePedidoEstudante } from './ui/estado/usarPedidoEstudante.ts'
import { usePerfilConta } from './ui/estado/usarPerfilConta.ts'
import { TelaPlano } from './ui/plano/TelaPlano.tsx'
import { TelaPainel } from './ui/painel/TelaPainel.tsx'
import { AvisoCrn } from './ui/painel/AvisoCrn.tsx'
import { AvisoDoEstudante } from './ui/painel/AvisoEstudante.tsx'
import { TelaPaciente } from './ui/pacientes/TelaPaciente.tsx'
import { TelaPacientes } from './ui/pacientes/TelaPacientes.tsx'
import { TelaAjuda } from './ui/ajuda/TelaAjuda.tsx'
import { TelaAlimentos } from './ui/alimentos/TelaAlimentos.tsx'
import { TelaDesignSystem } from '@ds/vitrine/TelaDesignSystem.tsx'
import { TelaConta } from './ui/conta/TelaConta.tsx'
import { CartaoLinkMissoes } from './ui/missoes/CartaoLinkMissoes.tsx'
import { TelaAdesao } from './ui/missoes/TelaAdesao.tsx'
import { TelaMissoesPaciente } from './ui/missoes/TelaMissoesPaciente.tsx'
import { MolduraPublica, type DestinoPublico } from './ui/publico/MolduraPublica.tsx'
import { SecaoPrecos } from './ui/publico/SecaoPrecos.tsx'
import { TelaCheckout } from './ui/publico/TelaCheckout.tsx'
import { TelaComprovarMatricula } from './ui/publico/conta/TelaComprovarMatricula.tsx'
import { TelaCompletarCadastro } from './ui/publico/conta/TelaCompletarCadastro.tsx'
import { MolduraConta } from './ui/publico/conta/MolduraConta.tsx'
import { TelaCriarConta } from './ui/publico/conta/TelaCriarConta.tsx'
import { TelaEntrar } from './ui/publico/conta/TelaEntrar.tsx'
import { TelaOutraConta } from './ui/publico/conta/TelaOutraConta.tsx'
import { TelaCodigoSenha } from './ui/publico/conta/TelaCodigoSenha.tsx'
import { TelaConfirmarEmail } from './ui/publico/conta/TelaConfirmarEmail.tsx'
import { TelaEsqueciSenha } from './ui/publico/conta/TelaEsqueciSenha.tsx'
import { TelaNovaSenha } from './ui/publico/conta/TelaNovaSenha.tsx'
import { TelaInicio } from './ui/publico/TelaInicio.tsx'
import { TelaPrivacidade } from './ui/publico/TelaPrivacidade.tsx'
import { TelaFontes } from './ui/publico/TelaFontes.tsx'
import { TelaTermos } from './ui/publico/TelaTermos.tsx'
import { TelaVoltaPagamento } from './ui/publico/TelaVoltaPagamento.tsx'
import { useConta, type ResultadoConfirmacao } from './ui/estado/usarConta.ts'
import { useAssinatura } from './ui/estado/usarAssinatura.ts'
import { processadorDoSite } from './ui/pagamento/processadorMercadoPago.ts'
import { armazenamentoLocal } from './ui/estado/armazenamentoLocal.ts'
import { esquecerEmailPendente, guardarEmailPendente, lerEmailPendente } from './ui/emailPendente.ts'
import { destinoDepoisDoCadastro, destinoDoPlano, guardarDestino, rotaDePlanos, tirarDestino } from './ui/fluxoConta.ts'
import { TelaConfiguracoes } from './ui/config/TelaConfiguracoes.tsx'
import { TelaProdutos } from './ui/produtos/TelaProdutos.tsx'
import { FaixaResumo } from './ui/resumo/FaixaResumo.tsx'
import { ResumoDoDia } from './ui/resumo/ResumoDoDia.tsx'
import { MenuExportar } from './ui/exportar/MenuExportar.tsx'
import { EtapasDoCaso } from '@ds/componentes/navigation/EtapasDoCaso.tsx'
import { Estrutura } from './ui/layout/Estrutura.tsx'
import type { CasoAtual } from './ui/layout/MenuLateral.tsx'
import { ehRotaLivre, escreverRota, ETAPAS, rotaCriarConta, type Rota } from './ui/navegacao.ts'
import { Redirecionar } from './ui/Redirecionar.tsx'
import { useRota } from './ui/usarRota.ts'

const ROTA_CODIGO: Rota = { tela: 'confirmar-email' }

function Conteudo() {
  const [rota, navegar] = useRota()
  const { casos, repositorio, atualizar } = useCasos()
  const { pacientes } = usePacientes()
  const { registro, alterarCaso, alterarPlano } = useCasoAberto(rota.tela === 'planejador' ? rota.casoId : '')
  const conta = useConta()
  const cobranca = useAssinatura(conta.sessao?.id ?? null)
  const { assinatura } = cobranca
  const { fonte } = useAcompanhamentos()

  // O e-mail que a tela do código mostra: o do cadastro, o de quem tentou entrar sem
  // confirmar ou o de "Esqueci a senha". Só em memória: aberta depois, a tela pede (CA-410).
  const [emailPendente, setEmailPendente] = useState<string | null>(null)
  const arm = armazenamentoLocal()
  const sessao = conta.sessao

  // Cadastro feito e código ainda não digitado (D-93): a pessoa fica na tela do código. Vem do aparelho,
  // para fechar e abrir o site também voltar para ela (CA-417); passa de 24 h, é esquecido (CB-103).
  const [travado, setTravado] = useState<string | null>(() => lerEmailPendente(armazenamentoLocal(), new Date()))
  // CB-104: com sessão aberta, o pendente não prende ninguém.
  if (sessao && travado !== null) setTravado(null)
  useEffect(() => {
    if (sessao) esquecerEmailPendente(armazenamentoLocal())
  }, [sessao])
  const pendente = sessao ? null : travado

  const irParaCodigo = (email: string) => {
    setEmailPendente(email)
    setTravado(email)
    guardarEmailPendente(armazenamentoLocal(), email, new Date())
    navegar({ tela: 'confirmar-email' })
  }

  const esquecerPendente = () => {
    setTravado(null)
    esquecerEmailPendente(armazenamentoLocal())
  }

  // CA-407: segue para onde iria depois do cadastro. O destino guardado no cadastro vem
  // primeiro (sabe o ciclo do plano pago); sem ele, vale o que a pessoa marcou.
  const aoEmailConfirmado = (confirmado: ResultadoConfirmacao) => {
    const guardado = tirarDestino(armazenamentoLocal())
    const marcado = confirmado.situacao ? destinoDepoisDoCadastro(confirmado.planoDesejado ?? null, 'mensal', confirmado.situacao) : null
    setEmailPendente(null)
    esquecerPendente()
    navegar(guardado ?? marcado ?? { tela: 'painel' })
  }

  // Dono dos dados do aparelho (spec estilo-spora, D-24): quem entra primeiro adota;
  // outra conta não vê nada até escolher (CA-151 e CA-152).
  const situacaoDoAparelho = sessao ? situacaoAoEntrar(arm, sessao.id) : 'mesmo'
  useEffect(() => {
    if (sessao && situacaoDoAparelho === 'adotar') registrarDono(armazenamentoLocal(), sessao.id)
  }, [sessao, situacaoDoAparelho])

  // Situação, pedido de estudante e filas do administrador (spec conta-e-verificacao).
  const perfilConta = usePerfilConta(sessao?.id ?? null)
  const { perfil } = perfilConta
  const pedidoEstudante = usePedidoEstudante(perfil?.situacao === 'estudante' && sessao ? sessao.id : null)
  const aprovacoes = useAprovacoes(perfilConta.ehAdmin)
  // Só lê com a tela aberta: são as contas inteiras, não precisa a cada abertura do app.
  const negocio = useNegocio(perfilConta.ehAdmin && rota.tela === 'negocio')
  const agora = new Date()
  const bloqueio = exportacaoBloqueada(perfil, agora) ? MOTIVO_EXPORTACAO_BLOQUEADA : null
  // Quem assina os planos: a conta, ou Configurações quando não há servidor (spec ajustes-de-uso, D-37).
  const quemAssina = assinaturaDoPlano({ servidor: conta.disponivel, perfilConta: perfil, nomeDaSessao: sessao?.nome ?? '', perfilLocal: lerPerfil(arm) })

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

  // Primeiro acesso: um dia inteiro montado, para entender o sistema mexendo nele.
  const verExemplo = () => {
    const salvo = repositorio.salvar(criarExemplo(() => globalThis.crypto.randomUUID(), new Date().toISOString().slice(0, 10)))
    atualizar()
    navegar({ tela: 'planejador', casoId: salvo.caso.id, aba: 'plano' })
  }

  const irPara = (destino: DestinoPublico) => navegar(destino === 'criar-conta' ? rotaCriarConta(null, 'mensal') : { tela: destino })

  // O link do paciente abre sozinho: sem menu, sem conta e sem nada da área do nutricionista.
  if (rota.tela === 'missoes') {
    return <TelaMissoesPaciente token={rota.token} fonte={fonte} />
  }

  const telaCarregando = (
    <div role="status" className="grid min-h-dvh place-content-center bg-background text-sm text-muted-foreground">
      Carregando…
    </div>
  )

  // CA-416: com o e-mail pendente, o resto do site leva de volta para a tela do código.
  if (pendente !== null && rota.tela !== 'confirmar-email' && rota.tela !== 'termos' && rota.tela !== 'privacidade') {
    if (conta.disponivel && conta.carregando) return telaCarregando
    if (!sessao) return <Redirecionar para={ROTA_CODIGO} navegar={navegar} />
  }

  // Portão da conta (CA-148): com servidor, tela de trabalho pede sessão. O login
  // aparece no lugar da tela pedida, e ela abre sozinha quando a sessão chega (CA-137).
  if (conta.disponivel && !ehRotaLivre(rota)) {
    if (conta.carregando) return telaCarregando
    if (!sessao) {
      return (
        <TelaEntrar
          conta={conta}
          pedidoPorTela
          aoEntrou={() => undefined}
          aoCriarConta={() => navegar(rotaCriarConta(null, 'mensal'))}
          aoEsqueci={() => navegar({ tela: 'esqueci-senha' })}
          aoConfirmarEmail={irParaCodigo}
          aoIrParaInicio={() => navegar({ tela: 'inicio' })}
          aoAbrirSistema={() => navegar({ tela: 'painel' })}
        />
      )
    }
    if (situacaoDoAparelho === 'conflito') {
      return (
        <TelaOutraConta
          email={sessao.email}
          aoSair={() => void conta.sair().then(() => navegar({ tela: 'inicio' }))}
          aoApagar={() => {
            apagarDadosDoAparelho(arm)
            registrarDono(arm, sessao.id)
            // Os provedores leram os dados antigos ao montar: recarregar é o jeito seguro de esquecê-los.
            globalThis.location.reload()
          }}
        />
      )
    }

    // Sem o perfil, nenhuma tela decide nada: Aprovações mandaria o administrador para o painel.
    if (!perfilConta.carregado) return telaCarregando

    // CB-68: conta sem situação completa o cadastro antes de qualquer tela de trabalho.
    if (perfilConta.carregado && !perfilConta.falhou && perfil === null && !perfilConta.ehAdmin) {
      return (
        <TelaCompletarCadastro
          email={sessao.email}
          informarSituacao={perfilConta.informarSituacao}
          aoSair={() => void conta.sair().then(() => navegar({ tela: 'inicio' }))}
        />
      )
    }
  }

  if (rota.tela === 'inicio') {
    return (
      <MolduraPublica atual="inicio" temSessao={sessao !== null} aoIrPara={irPara}>
        <TelaInicio aoComecar={() => navegar(rotaCriarConta(null, 'mensal'))} aoVerPrecos={() => navegar({ tela: 'precos' })} />
      </MolduraPublica>
    )
  }

  if (rota.tela === 'precos') {
    return (
      <MolduraPublica atual="precos" temSessao={sessao !== null} aoIrPara={irPara}>
        <SecaoPrecos
          contato={CONTATO_EMAIL}
          {...(rota.destaque ? { destaque: rota.destaque } : {})}
          aoEscolher={(plano, ciclo) => {
            const destino = destinoDoPlano(plano, ciclo, sessao !== null)
            if (destino) navegar(destino)
          }}
        />
      </MolduraPublica>
    )
  }

  if (rota.tela === 'entrar') {
    return (
      <TelaEntrar
        conta={conta}
        aoEntrou={() => navegar(tirarDestino(armazenamentoLocal()) ?? { tela: 'painel' })}
        aoCriarConta={() => navegar(rotaCriarConta(null, 'mensal'))}
        aoEsqueci={() => navegar({ tela: 'esqueci-senha' })}
        aoConfirmarEmail={irParaCodigo}
        aoIrParaInicio={() => navegar({ tela: 'inicio' })}
        aoAbrirSistema={() => navegar({ tela: 'painel' })}
      />
    )
  }

  if (rota.tela === 'criar-conta') {
    const ciclo = rota.ciclo ?? 'mensal'
    return (
      <TelaCriarConta
        // Trocar de endereço (outro plano) recomeça o formulário.
        key={escreverRota(rota)}
        conta={conta}
        plano={rota.plano ?? null}
        ciclo={ciclo}
        contato={CONTATO_EMAIL}
        aoCriada={(criada) => {
          const destino = destinoDepoisDoCadastro(criada.plano, ciclo, criada.situacao)
          if (!criada.confirmarEmail) return navegar(destino)
          // O destino fica no aparelho: o código pode ser digitado depois, e o link antigo abre em outra aba.
          guardarDestino(arm, destino)
          irParaCodigo(criada.email)
        }}
        aoEntrar={() => navegar({ tela: 'entrar' })}
        aoTrocarPlano={() => navegar({ tela: 'precos' })}
        aoIrParaInicio={() => navegar({ tela: 'inicio' })}
        aoAbrirSistema={() => navegar({ tela: 'painel' })}
      />
    )
  }

  if (rota.tela === 'confirmar-email') {
    const errarEmail = () => {
      esquecerPendente()
      setEmailPendente(null)
      navegar(rotaCriarConta(null, 'mensal'))
    }
    return (
      <TelaConfirmarEmail
        conta={conta}
        email={pendente ?? emailPendente}
        vencido={rota.vencido === true}
        {...(pendente === null ? { aoIrParaInicio: () => navegar({ tela: 'inicio' }) } : { aoErreiOEmail: errarEmail })}
        aoConfirmado={aoEmailConfirmado}
      />
    )
  }

  if (rota.tela === 'esqueci-senha' && rota.codigo) {
    return (
      <TelaCodigoSenha
        conta={conta}
        email={emailPendente}
        aoSenhaTrocada={() => {
          setEmailPendente(null)
          navegar({ tela: 'painel' })
        }}
        aoIrParaInicio={() => navegar({ tela: 'inicio' })}
      />
    )
  }

  if (rota.tela === 'esqueci-senha') {
    return (
      <TelaEsqueciSenha
        conta={conta}
        aoEnviado={(email) => {
          setEmailPendente(email)
          navegar({ tela: 'esqueci-senha', codigo: true })
        }}
        aoIrParaInicio={() => navegar({ tela: 'inicio' })}
        aoEntrar={() => navegar({ tela: 'entrar' })}
      />
    )
  }

  if (rota.tela === 'nova-senha') {
    return (
      <TelaNovaSenha
        conta={conta}
        vencido={rota.vencido === true}
        aoSenhaTrocada={() => navegar({ tela: 'painel' })}
        aoPedirOutro={() => navegar({ tela: 'esqueci-senha' })}
        aoIrParaInicio={() => navegar({ tela: 'inicio' })}
      />
    )
  }

  if (rota.tela === 'comprovar-matricula') {
    // CA-305: o botão do Estudante, numa conta de nutricionista, explica por que não serve.
    if (perfil?.situacao === 'nutricionista') {
      return (
        <MolduraConta
          titulo="Esta conta é de nutricionista"
          subtitulo="O plano Estudante é para quem cria a conta como estudante, com o e-mail da faculdade."
          aoIrParaInicio={() => navegar({ tela: 'inicio' })}
        >
          <Button size="lg" block onClick={() => navegar({ tela: 'painel' })}>
            Ir para o painel
          </Button>
        </MolduraConta>
      )
    }
    if (perfilConta.carregado && perfil?.situacao !== 'estudante') return <Redirecionar para={{ tela: 'painel' }} navegar={navegar} />
    // O formulário nasce com os dados do pedido recusado (CA-281): só monta quando ele chegou.
    if (!pedidoEstudante.carregado) return telaCarregando
    return (
      <TelaComprovarMatricula
        email={sessao?.email ?? ''}
        pedido={pedidoEstudante.pedido}
        enviar={pedidoEstudante.enviar}
        aoEnviado={() => navegar({ tela: 'painel' })}
        aoDepois={() => navegar({ tela: 'painel' })}
        aoIrParaInicio={() => navegar({ tela: 'inicio' })}
      />
    )
  }

  if (rota.tela === 'assinar') {
    // Quem já assina não pode ver o formulário (nem carregar o script do cartão) antes de a assinatura chegar.
    if (!cobranca.carregado) return telaCarregando
    return (
      <TelaCheckout
        plano={rota.plano}
        ciclo={rota.ciclo}
        email={sessao?.email ?? ''}
        assinaturaAtual={assinatura}
        disponivel={conta.disponivel}
        aoTrocar={(plano, ciclo) => navegar({ tela: 'assinar', plano, ciclo })}
        criarProcessador={processadorDoSite()}
        aoAssinar={cobranca.assinar}
        aoIrParaPainel={() => navegar({ tela: 'painel' })}
        aoIrParaConta={() => navegar({ tela: 'conta' })}
        aoIrParaInicio={() => navegar({ tela: 'inicio' })}
      />
    )
  }

  if (rota.tela === 'pagamento') {
    return (
      <TelaVoltaPagamento
        assinatura={assinatura}
        carregado={cobranca.carregado && !cobranca.carregando}
        recarregar={cobranca.recarregar}
        aoIrParaPainel={() => navegar({ tela: 'painel' })}
        aoTentarDeNovo={(plano) => navegar({ tela: 'assinar', plano, ciclo: 'mensal' })}
      />
    )
  }

  if (rota.tela === 'termos' || rota.tela === 'privacidade' || rota.tela === 'fontes') {
    return (
      <MolduraPublica atual={rota.tela} temSessao={sessao !== null} aoIrPara={irPara}>
        {rota.tela === 'termos' ? <TelaTermos /> : rota.tela === 'privacidade' ? <TelaPrivacidade /> : <TelaFontes />}
      </MolduraPublica>
    )
  }

  const base = { rota, navegar, casoAtual, aoNovoCaso: novoCaso, aprovacoesPendentes: perfilConta.ehAdmin ? aprovacoes.pendentes.total : null } as const
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
          aoAbrirPlano={(casoId) => navegar({ tela: 'planejador', casoId, aba: 'caso' })}
          aoNovoPlano={(pacienteId, modo) => novoCaso(modo, pacienteId)}
          aoVoltar={() => navegar({ tela: 'pacientes' })}
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
          aoSaiu={() => navegar({ tela: 'inicio' })}
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
            <p>Este plano não existe mais neste aparelho. Ele pode ter sido excluído em outra aba.</p>
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
                <ResumoDoDia caso={registro.caso} plano={registro.plano} aoAlterar={alterarCaso} />
              </div>
              <CartaoLinkMissoes
                casoId={registro.caso.id}
                pacienteId={registro.caso.pacienteId}
                nome={registro.caso.nome}
                missoes={missoesDoPlano(registro.plano, { pesoKg: registro.caso.pesoKg })}
                aoVerPlanos={() => navegar(rotaDePlanos(assinatura.plano))}
                situacao={perfil?.situacao ?? null}
                {...(sessao ? { plano: assinatura.plano } : {})}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <FaixaResumo caso={registro.caso} plano={registro.plano} aoAlterar={alterarCaso} />
              <TelaAdequacao
                caso={registro.caso}
                plano={registro.plano}
                gastoEnergetico={
                  calcularEnergia(registro.caso, {
                    fator: registro.caso.energia.fator,
                    formula: registro.caso.energia.formula,
                    getManual: registro.caso.energia.getManual,
                  }).get
                }
                restricoes={restricoesDoPaciente}
                aoAlterarCaso={alterarCaso}
                aoAlterarPlano={alterarPlano}
                aoAbrirFontes={() => navegar({ tela: 'fontes' })}
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

export function App() {
  return (
    <ProvedorCasos>
      <ProvedorPacientes>
        <ProvedorAcompanhamentos>
          <Conteudo />
        </ProvedorAcompanhamentos>
      </ProvedorPacientes>
    </ProvedorCasos>
  )
}
