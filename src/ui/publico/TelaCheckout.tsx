import { useId, useRef, useState, type ReactNode } from 'react'
import type { Assinatura } from '@/domain/assinatura.ts'
import { depoisDeHoje, emReais, fraseDaAssinaturaAtiva, nomeComCiclo, proximaCobrancaPrevista } from '@/domain/assinaturaTextos.ts'
import { ACEITE_FALTANDO, PAGAMENTO_INDISPONIVEL, type DadosDoCartao } from '@/domain/cartao.ts'
import { descontoAnualPct, mensalizadoDoAnual, planoPorId, VAGAS_PRECO_FUNDADOR, valorNoCiclo, type Ciclo } from '@/domain/conta.ts'
import { formatarDataLonga } from '@/domain/pedidoEstudante.ts'
import { cn } from '@/lib/utils'
import { IconeMarca, type NomeIconeMarca } from '@ds/componentes/display/IconeMarca.tsx'
import { Logo } from '@ds/componentes/display/Logo.tsx'
import { PontosDaMarca } from '@ds/componentes/display/PontosDaMarca.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { SeletorSegmentado } from '@ds/componentes/navigation/SeletorSegmentado.tsx'
import type { ResultadoDaAssinatura } from '../estado/usarAssinatura.ts'
import type { PlanoPago } from '../navegacao.ts'
import { AndamentoCheckout } from '../pagamento/AndamentoCheckout.tsx'
import { AvisoPagamento } from '../pagamento/AvisoPagamento.tsx'
import { FormularioCartao } from '../pagamento/FormularioCartao.tsx'
import type { ControleDoCartao, CriarProcessador } from '../pagamento/processadorCartao.ts'

interface TelaCheckoutProps {
  readonly plano: PlanoPago
  readonly ciclo: Ciclo
  readonly email: string
  readonly assinaturaAtual: Assinatura
  readonly vagasRestantes: number | null
  readonly disponivel: boolean
  /** Os campos seguros do cartão; nulo quando o site não tem a chave pública (CB-89). */
  readonly criarProcessador: CriarProcessador | null
  readonly aoTrocar: (plano: PlanoPago, ciclo: Ciclo) => void
  readonly aoAssinar: (plano: PlanoPago, ciclo: Ciclo, cartao: DadosDoCartao) => Promise<ResultadoDaAssinatura>
  readonly aoIrParaPainel: () => void
  readonly aoIrParaInicio: () => void
  /** Hoje, para a próxima cobrança prevista; os testes fixam a data. */
  readonly agora?: Date | undefined
}

const PAGOS: readonly PlanoPago[] = ['solo', 'pro']

/** Ref estável: o título da tela de resultado recebe o foco uma vez, quando aparece (leitor de tela). */
const focarAoAparecer = (el: HTMLElement | null) => el?.focus()

/** O topo do checkout: a marca, "Pagamento protegido" e o andamento com os pontos da logo. */
function Moldura({ passo, aoIrParaInicio, travado = false, children }: { readonly passo: 'pagamento' | 'pronto'; readonly aoIrParaInicio: () => void; readonly travado?: boolean; readonly children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={aoIrParaInicio}
            disabled={travado}
            aria-label="MetaNutri, início"
            className="inline-flex min-h-11 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo tamanho={28} />
          </button>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <IconeMarca nome="cadeado" className="size-4" />
            Pagamento protegido
          </span>
        </div>
        <AndamentoCheckout atual={passo} />
        {children}
      </div>
    </div>
  )
}

/** Uma linha do cartão do resumo: ícone, rótulo e valor. */
function LinhaDoResumo({ icone, rotulo, valor }: { readonly icone: NomeIconeMarca; readonly rotulo: string; readonly valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="inline-flex items-center gap-2 text-textoninverse/75">
        <IconeMarca nome={icone} className="size-4" />
        {rotulo}
      </dt>
      <dd className="min-w-0 text-right font-bold [overflow-wrap:anywhere]">{valor}</dd>
    </div>
  )
}

interface Concluida {
  /** O que foi enviado: a tela de resultado não segue as props, que podem mudar durante o envio. */
  readonly plano: PlanoPago
  readonly ciclo: Ciclo
  readonly ativa: boolean
  readonly proximaCobranca: string
}

/** O checkout dentro do site (spec checkout-proprio, US-B1; protótipo v2). Nenhuma outra marca aparece (CA-367, D-71). */
export function TelaCheckout({
  plano,
  ciclo,
  email,
  assinaturaAtual,
  vagasRestantes,
  disponivel,
  criarProcessador,
  aoTrocar,
  aoAssinar,
  aoIrParaPainel,
  aoIrParaInicio,
  agora = new Date(),
}: TelaCheckoutProps) {
  const id = useId()
  const controle = useRef<ControleDoCartao>(null)
  const refAceite = useRef<HTMLInputElement>(null)
  const enviandoRef = useRef(false)
  const [pronto, setPronto] = useState(false)
  const [aceite, setAceite] = useState(false)
  const [erroAceite, setErroAceite] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [concluida, setConcluida] = useState<Concluida | null>(null)

  const escolhido = planoPorId(plano)
  if (!escolhido) return null

  const total = valorNoCiclo(escolhido, ciclo)
  const desconto = descontoAnualPct(escolhido)
  const prevista = proximaCobrancaPrevista(ciclo, agora)
  // CB-91: quem já paga não vê formulário. A cancelada no prazo pode assinar de novo (CA-380).
  const jaAssina = assinaturaAtual.status === 'ativa' && (assinaturaAtual.plano === 'solo' || assinaturaAtual.plano === 'pro' || assinaturaAtual.plano === 'clinica')
  const estudanteAtivo = assinaturaAtual.status === 'ativa' && assinaturaAtual.plano === 'estudante'

  const assinar = async () => {
    const formulario = controle.current
    if (enviandoRef.current || !formulario) return
    // CA-370: confere tudo de uma vez; o foco vai para o primeiro erro, na ordem da tela.
    const cartaoCerto = formulario.conferir()
    setErroAceite(!aceite)
    setErro(null)
    if (!cartaoCerto) return
    if (!aceite) {
      refAceite.current?.focus()
      return
    }
    // CA-371: daqui até a resposta, um pedido só, mesmo com clique duplo.
    enviandoRef.current = true
    setEnviando(true)
    // Plano e ciclo de agora: ficam travados até a resposta, mas o resultado usa estes valores.
    const enviado = { plano, ciclo, prevista }
    const gerado = await formulario.gerar()
    const resultado: ResultadoDaAssinatura = gerado.ok ? await aoAssinar(enviado.plano, enviado.ciclo, gerado.dados) : { ok: false, erro: gerado.erro }
    enviandoRef.current = false
    setEnviando(false)
    if (resultado.ok) {
      setConcluida({ plano: enviado.plano, ciclo: enviado.ciclo, ativa: resultado.ativa, proximaCobranca: resultado.proximaCobranca ?? enviado.prevista })
      return
    }
    setErro(resultado.erro)
    // CA-373: o código de uso único já foi gasto; o de segurança é apagado para a próxima tentativa.
    if (gerado.ok) formulario.limparCodigo()
  }

  if (concluida) {
    return (
      <Moldura passo={concluida.ativa ? 'pronto' : 'pagamento'} aoIrParaInicio={aoIrParaInicio}>
        <section className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 rounded-2xl bg-card p-7 sm:p-10">
          {concluida.ativa ? (
            <>
              <Logo soSimbolo tamanho={92} />
              <h1 ref={focarAoAparecer} tabIndex={-1} className="font-titulo text-3xl font-bold text-heading focus:outline-none">Assinatura ativa</h1>
              <p className="text-sm text-muted-foreground">{fraseDaAssinaturaAtiva(concluida.plano, concluida.ciclo, email, concluida.proximaCobranca)}</p>
              <Button size="lg" block onClick={aoIrParaPainel}>
                Ir para o painel
                <IconeMarca nome="seta" />
              </Button>
            </>
          ) : (
            <>
              <span aria-hidden="true" className="grid size-12 place-content-center rounded-full bg-lightwarning text-warningtext [&_svg]:size-6">
                <IconeMarca nome="calendario" />
              </span>
              <h1 ref={focarAoAparecer} tabIndex={-1} className="font-titulo text-3xl font-bold text-heading focus:outline-none">Pagamento em análise</h1>
              <p className="text-sm text-muted-foreground">O banco ainda está confirmando o cartão. Até lá, vale o Free. Assim que confirmar, o plano libera sozinho.</p>
              <Button variant="outline" size="lg" block onClick={aoIrParaPainel}>
                Ir para o painel
              </Button>
            </>
          )}
        </section>
      </Moldura>
    )
  }

  const acoes = !disponivel ? (
    <AvisoPagamento tipo="erro">A conta na nuvem não está configurada neste MetaNutri.</AvisoPagamento>
  ) : jaAssina ? (
    <>
      <AvisoPagamento tipo="ok">
        Você já tem uma assinatura ativa: {planoPorId(assinaturaAtual.plano)?.nome}. A troca de plano pago ainda não é feita pelo site.
      </AvisoPagamento>
      <Button variant="outline" size="lg" block onClick={aoIrParaPainel}>
        Ir para o painel
      </Button>
    </>
  ) : criarProcessador === null ? (
    <AvisoPagamento tipo="erro">{PAGAMENTO_INDISPONIVEL}</AvisoPagamento>
  ) : (
    <>
      {estudanteAtivo ? <AvisoPagamento tipo="ok">Você está no plano Estudante. Quando o banco autorizar o cartão, o plano pago fica no lugar dele.</AvisoPagamento> : null}
      <label htmlFor={`${id}-aceite`} className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed">
        <input
          ref={refAceite}
          id={`${id}-aceite`}
          type="checkbox"
          checked={aceite}
          disabled={enviando}
          aria-invalid={erroAceite || undefined}
          aria-describedby={erroAceite ? `${id}-aceite-erro` : undefined}
          onChange={(e) => {
            setAceite(e.target.checked)
            setErroAceite(false)
          }}
          className="mt-0.5 size-5 shrink-0 cursor-pointer accent-textoninverse"
        />
        <span>
          {`Autorizo a cobrança de ${emReais(total)} ${ciclo === 'anual' ? 'todo ano' : 'todo mês'} neste cartão até eu cancelar, e li os `}
          <a href="#/termos" target="_blank" rel="noreferrer" className="font-bold underline underline-offset-2">
            Termos de uso
          </a>
          .
        </span>
      </label>
      {erroAceite ? (
        <div id={`${id}-aceite-erro`}>
          <AvisoPagamento tipo="erro">{ACEITE_FALTANDO}</AvisoPagamento>
        </div>
      ) : null}
      {erro ? <AvisoPagamento tipo="erro">{erro}</AvisoPagamento> : null}
      <Button type="submit" variant="laranja" size="lg" block disabled={!pronto || enviando} aria-busy={enviando || undefined}>
        {enviando ? (
          <>
            <PontosDaMarca pulsando />
            Confirmando com o banco…
          </>
        ) : (
          <>
            {`Assinar por ${emReais(total)}${ciclo === 'anual' ? '/ano' : '/mês'}`}
            <IconeMarca nome="seta" />
          </>
        )}
      </Button>
    </>
  )

  return (
    <Moldura passo="pagamento" aoIrParaInicio={aoIrParaInicio} travado={enviando}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void assinar()
        }}
        className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.85fr)]"
      >
        <main className="flex min-w-0 flex-col gap-7 rounded-2xl bg-card p-5 sm:p-8">
          <fieldset disabled={enviando} className="contents">
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h1 className="font-titulo text-3xl font-bold leading-tight text-heading">Assine o MetaNutri</h1>
              <SeletorSegmentado
                rotulo="Período de cobrança"
                valor={ciclo}
                aoEscolher={(c) => aoTrocar(plano, c)}
                opcoes={[
                  { valor: 'mensal', rotulo: 'Mensal' },
                  { valor: 'anual', rotulo: <>Anual{desconto > 0 ? <span className="font-dados text-xs font-bold text-acento">{`−${desconto}%`}</span> : null}</> },
                ]}
              />
            </div>

            <div role="radiogroup" aria-label="Plano" className="grid gap-3 sm:grid-cols-2">
              {PAGOS.map((idPlano) => {
                const p = planoPorId(idPlano)
                if (!p) return null
                const marcado = idPlano === plano
                return (
                  <button
                    key={idPlano}
                    type="button"
                    role="radio"
                    aria-checked={marcado}
                    onClick={() => aoTrocar(idPlano, ciclo)}
                    className={cn(
                      'relative flex flex-col gap-1 rounded-3xl p-4 text-left transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      marcado ? 'bg-card ring-2 ring-inset ring-primary' : 'bg-surfacesunken hover:ring-1 hover:ring-inset hover:ring-primary/40',
                    )}
                  >
                    {marcado ? <IconeMarca nome="check" destaque className="absolute right-3.5 top-3.5 text-primary" /> : null}
                    <span className="font-semibold text-heading">{p.nome}</span>
                    <span className="font-titulo text-3xl font-bold leading-tight text-heading">
                      {emReais(valorNoCiclo(p, ciclo))} <span className="font-sans text-xs font-semibold text-muted-foreground">{ciclo === 'anual' ? '/ano' : '/mês'}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {ciclo === 'anual' ? `Sai ${emReais(mensalizadoDoAnual(p))} por mês. ` : ''}
                      {p.recursos[0]}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          </fieldset>

          {disponivel && !jaAssina && criarProcessador ? (
            <section aria-labelledby={`${id}-cartao`} className="flex flex-col gap-3.5">
              <h2 id={`${id}-cartao`} className="font-titulo text-lg font-bold text-heading">
                Cartão de crédito
              </h2>
              <FormularioCartao ref={controle} criarProcessador={criarProcessador} travado={enviando} aoMudarPronto={setPronto} />
            </section>
          ) : null}
        </main>

        <section aria-label="Resumo" className="flex min-w-0 flex-col gap-4 rounded-2xl bg-surfaceinverse p-5 text-textoninverse sm:p-7 lg:sticky lg:top-4">
          <p className="font-titulo text-2xs font-bold uppercase tracking-[0.12em] text-textoninverse/75">Você paga hoje</p>
          <div className="flex flex-col gap-1">
            <p className="font-titulo text-5xl font-bold leading-none tracking-tight">{emReais(total)}</p>
            <p className="text-sm text-textoninverse/75">{depoisDeHoje(total, ciclo, prevista)}</p>
          </div>
          <dl className="flex flex-col gap-2.5 border-y border-textoninverse/20 py-4 text-sm">
            <LinhaDoResumo icone="check" rotulo="Plano" valor={nomeComCiclo(plano, ciclo)} />
            <LinhaDoResumo icone="calendario" rotulo="Próxima cobrança" valor={formatarDataLonga(prevista)} />
            <LinhaDoResumo icone="recibo" rotulo="Recibo para" valor={email} />
          </dl>

          {vagasRestantes === 0 ? null : (
            <p className="flex items-start gap-2.5 text-sm">
              <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full bg-laranja" />
              <span>
                <strong>Preço de fundador.</strong> Enquanto a assinatura estiver ativa, esse valor não sobe.
                {vagasRestantes !== null ? ` Restam ${vagasRestantes} de ${VAGAS_PRECO_FUNDADOR} vagas.` : ''}
              </span>
            </p>
          )}

          {acoes}

          <p className="flex items-start gap-2.5 text-xs leading-relaxed text-textoninverse/75">
            <IconeMarca nome="cadeado" className="mt-0.5 size-4" />
            O número do cartão vai criptografado direto para a operadora de pagamento. O MetaNutri não vê nem guarda o cartão.
          </p>
        </section>
      </form>
    </Moldura>
  )
}
