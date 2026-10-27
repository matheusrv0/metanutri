import { useEffect, useState, useSyncExternalStore } from 'react'
import { CONTATO_EMAIL } from './domain/legal.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { AreaDeTrabalho } from './ui/AreaDeTrabalho.tsx'
import { armazenamentoLocal } from './ui/estado/armazenamentoLocal.ts'
import { ProvedorArmazenamento } from './ui/estado/ProvedorArmazenamento.tsx'
import { ProvedoresDeDados } from './ui/estado/ProvedoresDeDados.tsx'
import { ProvedorNuvem } from './ui/estado/ProvedorNuvem.tsx'
import { useAprovacoes } from './ui/estado/usarAprovacoes.ts'
import { useAssinatura } from './ui/estado/usarAssinatura.ts'
import { useConta, type ResultadoConfirmacao, type ValorConta } from './ui/estado/usarConta.ts'
import { useNegocio } from './ui/estado/usarNegocio.ts'
import { useSegundoFator } from './ui/estado/usarSegundoFator.ts'
import { usePedidoEstudante } from './ui/estado/usarPedidoEstudante.ts'
import { usePerfilConta, type ValorPerfilConta } from './ui/estado/usarPerfilConta.ts'
import { esquecerEmailPendente, guardarEmailPendente, lerEmailPendente } from './ui/emailPendente.ts'
import { destinoDepoisDoCadastro, destinoDoPlano, guardarDestino, tirarDestino } from './ui/fluxoConta.ts'
import { ehEnderecoDaRaiz, ehRotaLivre, enderecoNoSite, escreverRota, lerRota, rotaCriarConta, type Rota } from './ui/navegacao.ts'
import { sairParaOSite } from './ui/enderecos.ts'
import { PortaoDaNuvem } from './ui/nuvem/PortaoDaNuvem.tsx'
import { processadorDoSite } from './ui/pagamento/processadorMercadoPago.ts'
import { TelaCheckout } from './ui/publico/TelaCheckout.tsx'
import { TelaComprovarMatricula } from './ui/publico/conta/TelaComprovarMatricula.tsx'
import { TelaCompletarCadastro } from './ui/publico/conta/TelaCompletarCadastro.tsx'
import { MolduraConta } from './ui/publico/conta/MolduraConta.tsx'
import { TelaCriarConta } from './ui/publico/conta/TelaCriarConta.tsx'
import { TelaEntrar } from './ui/publico/conta/TelaEntrar.tsx'
import { TelaCodigoSenha } from './ui/publico/conta/TelaCodigoSenha.tsx'
import { TelaConfirmarEmail } from './ui/publico/conta/TelaConfirmarEmail.tsx'
import { TelaEsqueciSenha } from './ui/publico/conta/TelaEsqueciSenha.tsx'
import { TelaNovaSenha } from './ui/publico/conta/TelaNovaSenha.tsx'
import { TelaVoltaPagamento } from './ui/publico/TelaVoltaPagamento.tsx'
import { Redirecionar } from './ui/Redirecionar.tsx'
import { AvisoDeInatividade } from './ui/sessao/AvisoDeInatividade.tsx'
import { CapaEncerrando } from './ui/sessao/CapaEncerrando.tsx'
import { ContextoEnvios } from './ui/sessao/contextoEnvios.ts'
import { ContextoFimDaSessao } from './ui/sessao/contextoSessao.ts'
import { useTempoDeSessao } from './ui/sessao/usarTempoDeSessao.ts'
import { useRota } from './ui/usarRota.ts'

const ROTA_CODIGO: Rota = { tela: 'confirmar-email' }

interface ConteudoProps {
  readonly conta: ValorConta
  /** A conta cujos dados aparecem; `null` sem sessão ou sem servidor de conta. */
  readonly usuarioId: string | null
  /** Lido em `ContaComTempo`, que também precisa dele (spec separacao-site-app, DP-SA-21). */
  readonly perfilConta: ValorPerfilConta
}

const ROTA_PAINEL: Rota = { tela: 'painel' }

function Conteudo({ conta, usuarioId, perfilConta }: ConteudoProps) {
  const [rota, navegar] = useRota()

  // Spec separacao-site-app, D-504 e CA-1412: início, Preços, Termos, Privacidade e Fontes são páginas do site.
  const paraOSite = enderecoNoSite(rota)
  useEffect(() => {
    if (paraOSite !== null) sairParaOSite(paraOSite)
  }, [paraOSite])

  // DP-SA-51: Criar conta aberto com sessão vai aonde o plano levaria (D-504, CA-1413). Vale a sessão de quando a pessoa
  // chegou (depois de conferida); a que nasce do próprio cadastro segue o caminho do cadastro.
  const enderecoDaRota = escreverRota(rota)
  const [cadastroAberto, setCadastroAberto] = useState<{ readonly endereco: string; readonly comSessao: boolean } | null>(null)
  if (rota.tela !== 'criar-conta') {
    if (cadastroAberto !== null) setCadastroAberto(null)
  } else if (!(conta.disponivel && conta.carregando) && cadastroAberto?.endereco !== enderecoDaRota) {
    setCadastroAberto({ endereco: enderecoDaRota, comSessao: conta.sessao !== null })
  }

  // DP-15: a conta trocou direto (A → B, sem passar por Entrar) numa tela de trabalho. O endereço
  // pode ser de um plano ou paciente da conta anterior: a conta nova vai para o painel, uma vez.
  const [contaNaTela, setContaNaTela] = useState(usuarioId)
  const [enderecoDaTroca, setEnderecoDaTroca] = useState<string | null>(null)
  if (usuarioId !== contaNaTela) {
    setContaNaTela(usuarioId)
    setEnderecoDaTroca(contaNaTela !== null && usuarioId !== null && !ehRotaLivre(rota) ? escreverRota(rota) : null)
  }
  if (enderecoDaTroca !== null && rota.tela === 'painel') setEnderecoDaTroca(null)
  const trocouDeContaAqui = enderecoDaTroca !== null && enderecoDaTroca === escreverRota(rota)
  const cobranca = useAssinatura(conta.sessao?.id ?? null)
  const { assinatura } = cobranca

  // O e-mail que a tela do código mostra: o do cadastro, o de quem tentou entrar sem
  // confirmar ou o de "Esqueci a senha". Só em memória: aberta depois, a tela pede (CA-410).
  const [emailPendente, setEmailPendente] = useState<string | null>(null)
  // O e-mail e o destino pendentes são do aparelho, não da conta (D-126).
  const aparelho = armazenamentoLocal()
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

  // Situação, pedido de estudante e filas do administrador (spec conta-e-verificacao).
  const { perfil } = perfilConta
  const pedidoEstudante = usePedidoEstudante(perfil?.situacao === 'estudante' && sessao ? sessao.id : null)
  const aprovacoes = useAprovacoes(perfilConta.ehAdmin)
  // Só lê com a tela aberta: são as contas inteiras, não precisa a cada abertura do app.
  const negocio = useNegocio(perfilConta.ehAdmin && rota.tela === 'negocio')
  // O app autenticador do administrador (spec seguranca-lote-5, D-261): só nas telas dele, e aqui em cima para o
  // código QR não mudar quando ele passa de Negócio para Aprovações no meio do cadastro.
  const segundoFator = useSegundoFator(
    perfilConta.precisaSegundoFator && (rota.tela === 'negocio' || rota.tela === 'aprovacoes'),
    sessao?.id ?? null,
    perfilConta.recarregar,
  )

  // D-96: sem sessão, a área de trabalho e os dados da conta saem da tela. Sair apaga a cópia de
  // trabalho (spec dados-na-nuvem, D-131); recarregar também descarta o que ainda estava a caminho
  // (uma leitura da nuvem, por exemplo). Spec separacao-site-app, D-504 e CA-1415: depois de sair, Entrar do app.
  const depoisDeSair = () => {
    navegar({ tela: 'entrar' })
    globalThis.location.reload()
  }

  // A área de trabalho e o link do paciente leem os dados da conta e remontam quando ela muda
  // (spec dados-por-conta, CB-120). As telas de conta, aqui fora, não remontam (DP-11). A área do
  // nutricionista espera os dados chegarem da nuvem; o link do paciente, não (spec dados-na-nuvem, CB-126).
  const areaDeTrabalho = (
    <PortaoDaNuvem areaDoNutricionista={rota.tela !== 'missoes'} conta={conta} aoSaiu={depoisDeSair}>
      <ProvedoresDeDados usuarioId={usuarioId}>
        <AreaDeTrabalho
          rota={rota}
          navegar={navegar}
          conta={conta}
          cobranca={cobranca}
          perfilConta={perfilConta}
          pedidoEstudante={pedidoEstudante}
          aprovacoes={aprovacoes}
          negocio={negocio}
          segundoFator={segundoFator}
          depoisDeSair={depoisDeSair}
        />
      </ProvedoresDeDados>
    </PortaoDaNuvem>
  )

  // O link do paciente abre sozinho: sem menu, sem conta e sem nada da área do nutricionista.
  if (rota.tela === 'missoes') return areaDeTrabalho

  const telaCarregando = (
    <div role="status" className="grid min-h-dvh place-content-center bg-background text-sm text-muted-foreground">
      Carregando…
    </div>
  )

  // A página do site já está a caminho (o efeito de cima); nada do app aparece nesse meio-tempo.
  if (paraOSite !== null) return telaCarregando

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
      // Spec separacao-site-app, D-504 e CA-1409: no app, a raiz sem sessão abre Entrar (o CA-730 vale só no site). Na raiz,
      // com o subtítulo de sempre; a tela de trabalho pedida pelo endereço diz que pede a entrada (CA-148, DP-SA-52).
      return (
        <TelaEntrar
          conta={conta}
          pedidoPorTela={!ehEnderecoDaRaiz(globalThis.location.hash)}
          aoEntrou={() => undefined}
          aoCriarConta={() => navegar(rotaCriarConta(null, 'mensal'))}
          aoEsqueci={() => navegar({ tela: 'esqueci-senha' })}
          aoConfirmarEmail={irParaCodigo}
          aoIrParaInicio={() => navegar({ tela: 'inicio' })}
          aoAbrirSistema={() => navegar({ tela: 'painel' })}
        />
      )
    }
    // Sem o perfil, nenhuma tela decide nada: Aprovações mandaria o administrador para o painel.
    if (!perfilConta.carregado) return telaCarregando

    // CB-68: conta sem situação completa o cadastro antes de qualquer tela de trabalho.
    // CA-842: o administrador sem o código do app também não completa cadastro.
    if (perfilConta.carregado && !perfilConta.falhou && perfil === null && !perfilConta.ehAdmin && !perfilConta.precisaSegundoFator) {
      return (
        <TelaCompletarCadastro
          email={sessao.email}
          informarSituacao={perfilConta.informarSituacao}
          sair={conta.sair}
          aoSaiu={depoisDeSair}
        />
      )
    }
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
    if (conta.disponivel && conta.carregando) return telaCarregando
    if (sessao && cadastroAberto?.comSessao) {
      return <Redirecionar para={destinoDoPlano(rota.plano ?? 'free', ciclo, true) ?? ROTA_PAINEL} navegar={navegar} />
    }
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
          guardarDestino(aparelho, destino)
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

  if (trocouDeContaAqui) return <Redirecionar para={ROTA_PAINEL} navegar={navegar} />

  return areaDeTrabalho
}

/** O endereço da página, para o vigia saber se está no link do paciente sem um segundo `useRota` (DP-SA-21). */
const assinarEndereco = (avisar: () => void): (() => void) => {
  globalThis.addEventListener('hashchange', avisar)
  return () => globalThis.removeEventListener('hashchange', avisar)
}
const lerEndereco = (): string => globalThis.location.hash

/** D-517, passo 5: depois da saída por tempo, Entrar; recarregar descarta o que ainda estava a caminho, como o "Sair". */
const irParaEntrar = (): void => {
  globalThis.location.hash = escreverRota({ tela: 'entrar' })
  globalThis.location.reload()
}

/**
 * Spec separacao-site-app, D-514 a D-517 e DP-SA-21: o vigia da sessão por cima de toda tela da conta. Roda com servidor
 * e sessão, nunca no link do paciente (CA-1455, CA-1456); o aviso e a capa ficam por cima de qualquer tela (CB-510), e
 * a faixa e os envios chegam à área de trabalho pelos contextos.
 */
function ContaComTempo({ conta, usuarioId }: Omit<ConteudoProps, 'perfilConta'>) {
  const sessao = conta.sessao
  const perfilConta = usePerfilConta(sessao?.id ?? null)
  const noLinkDoPaciente = lerRota(useSyncExternalStore(assinarEndereco, lerEndereco)).tela === 'missoes'
  const tempo = useTempoDeSessao({
    ativo: conta.disponivel && sessao !== null && !noLinkDoPaciente,
    usuarioId: sessao?.id ?? null,
    // CB-526: administrador com ou sem o código do app.
    admin: perfilConta.ehAdmin || perfilConta.precisaSegundoFator,
    sairPorTempo: conta.sairPorTempo,
    aoSair: irParaEntrar,
  })
  return (
    <ContextoEnvios.Provider value={tempo.envios}>
      <ContextoFimDaSessao.Provider value={tempo.faixa}>
        <Conteudo conta={conta} usuarioId={usuarioId} perfilConta={perfilConta} />
        <AvisoDeInatividade aberto={tempo.aviso} aoContinuar={tempo.continuar} />
        {tempo.capa ? <CapaEncerrando /> : null}
      </ContextoFimDaSessao.Provider>
    </ContextoEnvios.Provider>
  )
}

export function App() {
  const conta = useConta()
  // Cada conta tem os próprios dados no aparelho (spec dados-por-conta, D-120), e a nuvem é a fonte
  // deles (spec dados-na-nuvem, D-128). Sem servidor de conta, ou sem sessão, valem os do aparelho,
  // como antes (CA-150, DP-3, DP-14).
  const usuarioId = conta.disponivel ? (conta.sessao?.id ?? null) : null
  return (
    <ProvedorArmazenamento usuarioId={usuarioId}>
      <ProvedorNuvem usuarioId={usuarioId}>
        <ContaComTempo conta={conta} usuarioId={usuarioId} />
      </ProvedorNuvem>
    </ProvedorArmazenamento>
  )
}
