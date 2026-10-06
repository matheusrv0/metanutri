import { useRef, useState } from 'react'
import { canceladaNoPrazo, temAssinaturaPaga, type StatusAssinatura } from '@/domain/assinatura.ts'
import { emReais, linhaDaCobranca, linhaDoCartao, nomeComCiclo, recadoDaAssinatura } from '@/domain/assinaturaTextos.ts'
import { planoPorId, PLANOS, type Ciclo } from '@/domain/conta.ts'
import { formatarDataLonga, type PedidoEstudante } from '@/domain/pedidoEstudante.ts'
import type { Crn, PerfilConta } from '@/domain/situacao.ts'
import { useAssinatura } from '../estado/usarAssinatura.ts'
import { ehPlanoPago, type PlanoPago } from '../navegacao.ts'
import { AvisoPagamento } from '../pagamento/AvisoPagamento.tsx'
import type { CriarProcessador } from '../pagamento/processadorCartao.ts'
import { Alert } from '@ds/componentes/display/alert.tsx'
import { Badge } from '@ds/componentes/display/badge.tsx'
import { IconeMarca } from '@ds/componentes/display/IconeMarca.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { Card, CardDescription, CardHeader, CardTitle } from '@ds/componentes/display/card.tsx'
import type { ValorConta } from '../estado/usarConta.ts'
import { AvisoCrn } from '../painel/AvisoCrn.tsx'
import { CartaoSituacao } from './CartaoSituacao.tsx'
import { DialogoCancelarAssinatura } from './DialogoCancelarAssinatura.tsx'
import { DialogoMeFormei } from './DialogoMeFormei.tsx'
import { DialogoTrocarCartao } from './DialogoTrocarCartao.tsx'
import { MiniCartao } from './MiniCartao.tsx'

interface TelaContaProps {
  readonly conta: ValorConta
  readonly aoEntrar: () => void
  readonly aoVerPrecos: () => void
  readonly aoIrParaConfig: () => void
  /** Leva ao checkout. O "Assinar de novo" reabre o plano e o ciclo de antes (CA-380). */
  readonly aoAssinar: (plano: PlanoPago, ciclo: Ciclo) => void
  /** Depois de cancelar ou trocar o cartão: o App relê a sua cópia da assinatura (CA-380). */
  readonly aoMudouAssinatura: () => void
  /** Os campos seguros do cartão, para "Trocar cartão"; nulo quando o site não tem a chave pública. */
  readonly criarProcessador: CriarProcessador | null
  /** Situação e CRN (spec conta-e-verificacao). Nulo no modo local, sem servidor. */
  readonly perfil: PerfilConta | null
  readonly pedido: PedidoEstudante | null
  readonly meFormei: (crn: Crn) => Promise<string | null>
  /** Avisa o App para reler o perfil e a assinatura depois do "Me formei". */
  readonly aoMudouSituacao: () => void
  /** CA-289: corrigir o CRN não encontrado também daqui. */
  readonly corrigirCrn: (crn: Crn) => Promise<string | null>
  /** CA-304: estudante sem pedido ou recusada vai para Comprovar matrícula. */
  readonly aoEnviarComprovante: () => void
  readonly aoSaiu: () => void
}

/** Estado da conta: quem está conectado, qual plano, o cartão que paga e o que fazer sem conta (spec checkout-proprio, US-B2). */
export function TelaConta({
  conta,
  aoEntrar,
  aoVerPrecos,
  aoIrParaConfig,
  aoAssinar,
  aoMudouAssinatura,
  criarProcessador,
  perfil,
  pedido,
  meFormei,
  aoMudouSituacao,
  corrigirCrn,
  aoEnviarComprovante,
  aoSaiu,
}: TelaContaProps) {
  const [saindo, setSaindo] = useState(false)
  const { assinatura, recarregar, cancelar, trocarCartao } = useAssinatura(conta.sessao?.id ?? null)
  const [formando, setFormando] = useState(false)
  // O status de quando a confirmação abriu: se a linha mudar com ela aberta, o texto ficaria errado, então ela fecha.
  const [cancelando, setCancelando] = useState<StatusAssinatura | null>(null)
  const [trocando, setTrocando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const refAviso = useRef<HTMLDivElement>(null)

  const plano = planoPorId(assinatura.plano)
  const paga = temAssinaturaPaga(assinatura)
  const noPrazo = canceladaNoPrazo(assinatura)
  // CA-380: cancelada, dentro ou fora do prazo, oferece assinar de novo o mesmo plano.
  const planoDeNovo = conta.sessao && assinatura.status === 'cancelada' && ehPlanoPago(assinatura.planoPedido) ? assinatura.planoPedido : null
  // Pendente ou pausada do fluxo novo (tem cartão gravado): só dá para cancelar, e vira Free na hora.
  const travadaNova = (assinatura.status === 'pendente' || assinatura.status === 'pausada') && ehPlanoPago(assinatura.planoPedido) && assinatura.cartaoFinal !== null
  const linhaCobranca = linhaDaCobranca(assinatura)
  const recado = recadoDaAssinatura(assinatura)
  const inicial = (conta.sessao?.nome.trim()[0] ?? conta.sessao?.email[0] ?? '?').toUpperCase()

  const sair = async () => {
    setSaindo(true)
    await conta.sair()
    setSaindo(false)
    aoSaiu()
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Sua conta</CardTitle>
          {/* D-79: logado, o nome e o e-mail logo abaixo já dizem que está conectado. */}
          {conta.sessao ? null : <CardDescription>O MetaNutri funciona sem conta. Ela serve para usar em mais de um aparelho.</CardDescription>}
        </CardHeader>

        {conta.carregando ? (
          <p className="text-sm text-muted-foreground">Conferindo a sessão…</p>
        ) : conta.sessao ? (
          <div className="flex flex-wrap items-center gap-4">
            <span aria-hidden="true" className="grid size-12 shrink-0 place-content-center rounded-full bg-lightprimary font-titulo text-lg font-bold text-primary">
              {inicial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-titulo text-lg font-semibold text-heading">{conta.sessao.nome}</p>
              <p className="truncate text-sm text-muted-foreground">{conta.sessao.email}</p>
            </div>
            <Button variant="outline" onClick={() => void sair()} disabled={saindo}>
              {saindo ? 'Saindo…' : 'Sair'}
            </Button>
          </div>
        ) : conta.disponivel ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-sm text-muted-foreground">Você está usando o modo local: tudo salvo neste navegador.</p>
            <Button onClick={aoEntrar}>Entrar ou criar conta</Button>
          </div>
        ) : (
          <Alert variant="info">
            <IconeMarca nome="alerta" />
            <div>
              <p className="font-medium">A conta na nuvem ainda não foi ligada neste projeto.</p>
              <p className="mt-1 text-sm">
                Falta criar o projeto no Supabase e preencher as duas chaves em <code className="rounded-md bg-muted px-1">.env.local</code>. O passo a passo está no
                README. Enquanto isso, o backup em Configurações leva tudo para outro aparelho.
              </p>
              <Button variant="lightprimary" size="sm" className="mt-3" onClick={aoIrParaConfig}>
                Ir para o backup
              </Button>
            </div>
          </Alert>
        )}
      </Card>

      {perfil?.situacao === 'nutricionista' ? <AvisoCrn perfil={perfil} agora={new Date()} aoCorrigir={corrigirCrn} /> : null}

      {perfil ? <CartaoSituacao perfil={perfil} pedido={pedido} aoMeFormei={() => setFormando(true)} aoEnviarComprovante={aoEnviarComprovante} /> : null}

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Seu plano</CardTitle>
          {recado ? <CardDescription>{recado}</CardDescription> : null}
        </CardHeader>

        {paga ? (
          <div className="grid items-center gap-4 rounded-3xl bg-surfacerow p-4 sm:grid-cols-[auto_minmax(0,1fr)]">
            {/* CA-389: o mini cartão já mostra a bandeira e o final; o texto ao lado não repete. */}
            <MiniCartao bandeira={assinatura.cartaoBandeira} final={assinatura.cartaoFinal} nome={linhaDoCartao(assinatura)} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="font-titulo text-xl font-bold text-heading">{nomeComCiclo(assinatura.plano, assinatura.ciclo)}</p>
                <Badge variant={noPrazo ? 'muted' : 'lightSuccess'} dot>
                  {noPrazo ? 'Cancelada' : 'Ativa'}
                </Badge>
              </div>
              <div className="mt-1.5 flex flex-col gap-1.5 text-sm text-muted-foreground">
                {linhaCobranca ? (
                  <span className="inline-flex items-center gap-2">
                    <IconeMarca nome="calendario" className="size-4" />
                    {linhaCobranca}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-surfacerow p-4">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-content-center rounded-full bg-lightprimary text-primary">
              <IconeMarca nome="check" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-heading">{plano?.nome ?? PLANOS[0]?.nome ?? 'Free'}</p>
              <p className="text-sm text-muted-foreground">{plano?.resumo ?? PLANOS[0]?.resumo}</p>
            </div>
            <span className="numeros font-titulo text-xl font-bold text-heading">{(plano?.mensal ?? 0) === 0 ? 'Grátis' : `${emReais(plano?.mensal ?? 0)}/mês`}</span>
          </div>
        )}

        {assinatura.plano === 'estudante' && assinatura.expiraEm ? (
          <p className="text-sm text-muted-foreground">{`Vale até ${formatarDataLonga(assinatura.expiraEm)}.`}</p>
        ) : null}

        {aviso ? (
          <div tabIndex={-1} ref={refAviso} className="outline-none">
            <AvisoPagamento tipo="ok">{aviso}</AvisoPagamento>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {(paga && !noPrazo) || travadaNova ? (
            <>
              {criarProcessador && !travadaNova ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setAviso(null)
                    setTrocando(true)
                  }}
                >
                  Trocar cartão
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={() => {
                  setAviso(null)
                  setCancelando(assinatura.status)
                }}
              >
                Cancelar assinatura
              </Button>
            </>
          ) : null}

          {planoDeNovo ? <Button onClick={() => aoAssinar(planoDeNovo, assinatura.ciclo ?? 'mensal')}>Assinar de novo</Button> : null}

          <Button variant="outline" onClick={aoVerPrecos}>
            Mudar de plano
          </Button>

          {conta.sessao && !travadaNova && assinatura.status !== 'ativa' && assinatura.status !== 'cancelada'
            ? PLANOS.filter((p) => ehPlanoPago(p.id)).map((p) => (
                <Button key={p.id} onClick={() => ehPlanoPago(p.id) && aoAssinar(p.id, 'mensal')}>
                  Assinar {p.nome} · {emReais(p.mensal)}/mês
                </Button>
              ))
            : null}
        </div>

        {conta.sessao && !paga && assinatura.status !== 'ativa' ? (
          <p className="text-xs text-muted-foreground">O pagamento é com cartão de crédito, aqui no site.</p>
        ) : null}
      </Card>

      <DialogoMeFormei
        aberto={formando}
        aoFechar={() => setFormando(false)}
        meFormei={meFormei}
        aoFormado={() => {
          setFormando(false)
          recarregar()
          aoMudouSituacao()
        }}
      />

      <DialogoCancelarAssinatura
        aberto={cancelando === assinatura.status && ((paga && !noPrazo) || travadaNova)}
        assinatura={assinatura}
        cancelar={cancelar}
        aoFechar={() => setCancelando(null)}
        aoDevolverFoco={() => refAviso.current?.focus()}
        aoCancelada={() => {
          setCancelando(null)
          setAviso('Pronto. Não haverá novas cobranças.')
          aoMudouAssinatura()
        }}
      />

      {criarProcessador ? (
        <DialogoTrocarCartao
          aberto={trocando}
          criarProcessador={criarProcessador}
          trocarCartao={trocarCartao}
          aoFechar={() => setTrocando(false)}
          aoTrocado={() => {
            setTrocando(false)
            setAviso('Cartão trocado.')
            aoMudouAssinatura()
          }}
        />
      ) : null}
    </div>
  )
}
