// O lado do nutricionista: gerar o link do paciente e ver se ele está marcando.
// Fica junto do plano, porque é do plano que as missões e a dieta do link saem. Desde a spec lado-do-paciente, o link é
// do paciente (D-1214): o plano novo de quem já tem link pergunta se atualiza o mesmo endereço, o plano sem paciente
// pergunta para quem é o link (D-1216), e "Gerar link novo" virou "Trocar o endereço" (D-1215).
import { Check, Copy, Link2, RefreshCw, ShieldCheck, UserRoundPlus } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import {
  criarAcompanhamento,
  regerarLink,
  diasMarcadosNaSemana,
  estadoDoAcompanhamento,
  progressoDoDia,
  ultimaMarcacao,
  EXPLICACAO_ESTADO,
  type Acompanhamento,
} from '@/domain/acompanhamento.ts'
import { avisoLigado } from '@/domain/avisosNaFicha.ts'
import { copiarDieta, dietaMudou, temDieta, type DietaDoPlano } from '@/domain/dietaDoLink.ts'
import { pedirEnvio } from '@/domain/emailsDoLink.ts'
import { dataCompleta } from '@/domain/formatarData.ts'
import { LIMITE_DE_LINKS } from '@/domain/fonteSupabase.ts'
import { atualizarComPlano, contarPacientesComLink, linkDoPaciente, precisaAtualizarComPlano, textoDoLimite } from '@/domain/linkFixo.ts'
import type { Missao } from '@/domain/missoes.ts'
import { linkDeUsoNaoComercial, planoPorId, podeGerarLink, PLANO_PADRAO, type IdPlano } from '@/domain/conta.ts'
import { agoraEmBrasilia, pacienteDoAcompanhamento } from '@/domain/retorno.ts'
import type { Situacao } from '@/domain/situacao.ts'
import { primeiroNome, textoDoLink } from '@/domain/whatsapp.ts'
import { useAcompanhamentos, useLerDaNuvemAoAbrir } from '@/ui/estado/contextoAcompanhamentos.ts'
import { useCasosOpcional } from '@/ui/estado/contextoCasos.ts'
import { usePacientesOpcional } from '@/ui/estado/contextoPacientes.ts'
import { DIETA_GRANDE_DEMAIS, LINK_GRANDE_DEMAIS } from '@/ui/estado/mensagemDoBanco.ts'
import { useClienteDosEmails, useEmailsDoLink } from '@/ui/estado/usarEmailsDoLink.ts'
import { BotaoWhatsApp } from '@/ui/whatsapp/BotaoWhatsApp.tsx'
import type { PacienteDoWhatsApp } from '@/ui/whatsapp/DialogoWhatsApp.tsx'
import { mascararEmail } from '../../../supabase/functions/_shared/avisos/email.ts'
import { CaixaDietaNoLink } from './CaixaDietaNoLink.tsx'
import { DialogoTrocarEndereco } from './DialogoTrocarEndereco.tsx'
import { enderecoDoPaciente } from './endereco.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { SeloEstado } from './SeloEstado.tsx'

/** CA-439: a cópia do aparelho ficou, mas o paciente ainda não abre o link. */
const NAO_SALVOU = 'Não foi possível salvar o link. O paciente ainda não consegue abri-lo. Tente de novo.'

interface CartaoLinkMissoesProps {
  readonly casoId: string
  readonly pacienteId: string | null
  readonly nome: string
  readonly missoes: readonly Missao[]
  /**
   * A dieta do plano de agora, no que o paciente vê (spec dieta-no-link). Sem ela, o cartão não
   * oferece a dieta e o link sai sem ela (DP-152).
   */
  readonly dieta?: DietaDoPlano | undefined
  /** Plano da conta: decide quantos links cabem. */
  readonly plano?: IdPlano
  /** Situação da conta: estudante, aprovada ou não, gera o link com o aviso de uso não comercial (D-95). */
  readonly situacao?: Situacao | null
  /** Injetável no teste; por padrão, o dia de Brasília, o mesmo do Painel e da Adesão (spec whatsapp-e-retorno, D-144). */
  readonly hoje?: string
  /** Leva a Preços quando o limite de links acaba (CA-177). */
  readonly aoVerPlanos?: (() => void) | undefined
  /** Abre a ficha com o cursor no Telefone, quando o WhatsApp não tem número (spec whatsapp-e-retorno, CA-505). */
  readonly aoCadastrarTelefone?: ((pacienteId: string) => void) | undefined
  /**
   * D-1216 e CA-2224: o plano sem paciente pergunta "Para quem é este link?" e cria a ficha com o nome escrito, ligando
   * o plano a ela. Devolve o id do paciente criado. Sem esta função (os testes de antes), o link sai sem paciente.
   */
  readonly aoCriarPaciente?: ((nome: string) => string | null) | undefined
}

export function CartaoLinkMissoes({
  casoId,
  pacienteId,
  nome,
  missoes,
  dieta,
  plano = PLANO_PADRAO,
  situacao = null,
  hoje = agoraEmBrasilia(new Date()).dia,
  aoVerPlanos,
  aoCadastrarTelefone,
  aoCriarPaciente,
}: CartaoLinkMissoesProps) {
  const { salvar, acompanhamentos, foraDaNuvem } = useAcompanhamentos()
  const fichas = usePacientesOpcional()
  const planos = useCasosOpcional()?.casos ?? []
  const clienteDosEmails = useClienteDosEmails()
  useLerDaNuvemAoAbrir()
  const planoAtual = planoPorId(plano) ?? planoPorId(PLANO_PADRAO)
  const naoComercial = linkDeUsoNaoComercial(planoAtual, situacao)
  const [copiado, setCopiado] = useState(false)
  const [pedindoConsentimento, setPedindoConsentimento] = useState(false)
  // CA-442: a nuvem recusou pelo limite do plano e o aparelho voltou ao que era.
  const [noLimite, setNoLimite] = useState(false)
  const [salvando, setSalvando] = useState(false)
  // D-152: antes do primeiro link, a caixa vem marcada (decisão do dono, a revisar).
  const [mostrarDieta, setMostrarDieta] = useState(true)
  // CA-544: ligar a dieta num link que já existe espera a confirmação de autorização.
  const [autorizandoDieta, setAutorizandoDieta] = useState(false)
  // CA-2224: o paciente criado por "Para quem é este link?", enquanto o plano ainda não chegou com o vínculo.
  const [pacienteCriado, setPacienteCriado] = useState<string | null>(null)
  const [perguntandoQuem, setPerguntandoQuem] = useState(false)
  // CA-2223: o diálogo de "Trocar o endereço" e o que aconteceu depois.
  const [trocando, setTrocando] = useState(false)
  const [depoisDaTroca, setDepoisDaTroca] = useState<string | null>(null)
  // CA-2249: "Avisar Juliana por e-mail" ao atualizar; nulo é o padrão (marcada quando ela aceitou o aviso).
  const [avisarEscolha, setAvisarEscolha] = useState<boolean | null>(null)
  const pacienteAtual = pacienteId ?? pacienteCriado
  // D-1214: o link é do paciente; o plano sem paciente (os links de antes) continua achando o link pelo plano.
  const acompanhamento: Acompanhamento | null =
    (pacienteAtual ? linkDoPaciente(acompanhamentos, pacienteAtual, planos) : null) ?? acompanhamentos.find((a) => a.casoId === casoId) ?? null
  const { emails, recarregar: recarregarEmails } = useEmailsDoLink(acompanhamento?.id ?? null)
  const emailQueFunciona = emails?.email && emails.supressao === null ? mascararEmail(emails.email) : null
  const nomeCurto = primeiroNome(nome)
  const podeAvisar = emails !== null && avisoLigado(emails, 'plano')
  const avisar = avisarEscolha ?? podeAvisar
  const dietaVai = dieta !== undefined && mostrarDieta

  const gravar = async (novo: Acompanhamento) => {
    setSalvando(true)
    const motivo = await salvar(novo)
    setNoLimite(motivo === LIMITE_DE_LINKS)
    setSalvando(false)
    return motivo
  }

  // O primeiro link do paciente. CA-421: o aviso de estágio entra no link de conta de estudante.
  // CA-547: o link novo leva a dieta de agora quando ela está ligada.
  const gerar = () => {
    setCopiado(false)
    setPedindoConsentimento(false)
    void gravar(criarAcompanhamento({ casoId, pacienteId: pacienteAtual, nome, missoes, usoNaoComercial: naoComercial, dieta: dieta && mostrarDieta ? copiarDieta(dieta, hoje) : null }))
  }

  /**
   * D-1215 e CA-2223: "Trocar o endereço" troca o token (o antigo deixa de abrir), com as missões do plano de agora.
   * Com e-mail no link, o S4 sai na hora; sem, a frase manda usar o WhatsApp do cartão.
   */
  const trocarEndereco = async () => {
    if (!acompanhamento) return
    setTrocando(false)
    setCopiado(false)
    const dietaNova = acompanhamento.dieta && dieta ? { dieta: copiarDieta(dieta, hoje) } : {}
    const novo = { ...regerarLink(acompanhamento, { nome, missoes, ...dietaNova }), usoNaoComercial: acompanhamento.usoNaoComercial || naoComercial }
    const motivo = await gravar(novo)
    if (motivo !== null) return
    if (emailQueFunciona === null) {
      setDepoisDaTroca('Endereço trocado. Mande o novo pelo WhatsApp.')
      return
    }
    const envio = await pedirEnvio(clienteDosEmails, 'trocou', novo.id)
    setDepoisDaTroca(envio.ok ? `Endereço trocado. O novo foi para ${emailQueFunciona}.` : `Endereço trocado. ${envio.erro} Mande o novo pelo WhatsApp.`)
    recarregarEmails()
  }

  /** CA-2222 e CA-2249: atualizar o link do paciente com este plano; com a caixa marcada, o A1 é agendado. */
  const atualizarComEstePlano = async () => {
    if (!acompanhamento) return
    const motivo = await gravar({
      ...atualizarComPlano(acompanhamento, { casoId, pacienteId: pacienteAtual, nome, missoes, dieta }, hoje),
      usoNaoComercial: acompanhamento.usoNaoComercial || naoComercial,
    })
    if (motivo === null && avisar && podeAvisar) {
      await pedirEnvio(clienteDosEmails, 'atualizou', acompanhamento.id, true)
      recarregarEmails()
    }
  }

  /** CA-2224: "Para quem é este link?" cria a ficha e segue para a autorização. */
  const criarPaciente = (nomeDoPaciente: string) => {
    if (!aoCriarPaciente) return
    const id = aoCriarPaciente(nomeDoPaciente.trim())
    if (id === null) return
    setPacienteCriado(id)
    setPerguntandoQuem(false)
    setPedindoConsentimento(true)
  }

  // CA-543, CA-544 e CA-545: ligar, desligar ou atualizar a dieta não troca o endereço nem as missões.
  const trocarDieta = (ligar: boolean) => {
    if (!acompanhamento) return
    setAutorizandoDieta(false)
    void gravar({ ...acompanhamento, dieta: ligar && dieta ? copiarDieta(dieta, hoje) : null })
  }

  // CA-555 e D-153: "Atualizar a dieta no link" traz a dieta e as missões de agora, com o mesmo endereço. As
  // marcações ficam: os ids das missões são estáveis (refeição pelo id da refeição; frutas, vegetais e água fixos).
  const atualizarDieta = () => {
    if (!acompanhamento || !dieta) return
    void gravar({ ...acompanhamento, missoes, dieta: copiarDieta(dieta, hoje) })
  }

  // CA-544: marcar a caixa num link sem dieta pergunta pela autorização; desmarcar grava na hora.
  const mudarCaixa = (marcar: boolean) => {
    if (marcar && acompanhamento?.dieta === null) setAutorizandoDieta(true)
    else trocarDieta(marcar)
  }

  // O link que não chegou à nuvem fica marcado até subir (CA-439, CA-443). O grande demais (CA-446) e a dieta
  // grande demais (CB-152) não oferecem mandar de novo: o mesmo link seria recusado de novo; a frase diz o que fazer.
  const motivo = noLimite ? LIMITE_DE_LINKS : acompanhamento ? foraDaNuvem.get(acompanhamento.id) : undefined
  const avisoDaNuvem =
    motivo === undefined ? null : motivo === LINK_GRANDE_DEMAIS || motivo === DIETA_GRANDE_DEMAIS ? (
      <div role="alert" className="mt-4 rounded-xl border border-statelow/40 bg-lightwarning p-3 text-sm text-warningtext">
        <p>{motivo}</p>
      </div>
    ) : motivo === LIMITE_DE_LINKS ? (
      <div role="alert" className="mt-4 rounded-xl border border-statelow/40 bg-lightwarning p-3 text-sm text-warningtext">
        <p>{LIMITE_DE_LINKS}</p>
        {aoVerPlanos ? (
          <Button size="sm" variant="outline" className="mt-2" onClick={aoVerPlanos}>
            Ver preços
          </Button>
        ) : null}
      </div>
    ) : (
      <div role="alert" className="mt-4 rounded-xl border border-statelow/40 bg-lightwarning p-3 text-sm text-warningtext">
        <p>{NAO_SALVOU}</p>
        {acompanhamento ? (
          <Button size="sm" variant="outline" className="mt-2" loading={salvando} onClick={() => void gravar(acompanhamento)}>
            Tentar de novo
          </Button>
        ) : null}
      </div>
    )

  // O limite vale para o paciente novo e conta pacientes com link (D-1214); o próprio paciente não conta de novo.
  const deOutros = acompanhamentos.filter((a) => a.casoId !== casoId && (pacienteAtual === null || pacienteDoAcompanhamento(a, planos) !== pacienteAtual))
  const cabeMaisUm = planoAtual !== null && podeGerarLink(planoAtual, contarPacientesComLink(deOutros, planos))

  const copiar = async (endereco: string) => {
    try {
      await globalThis.navigator.clipboard.writeText(endereco)
      setCopiado(true)
    } catch {
      // Navegador sem permissão de área de transferência: o endereço está na tela para copiar na mão.
      setCopiado(false)
    }
  }

  if (missoes.length === 0) {
    return (
      <section aria-labelledby="titulo-missoes" className="rounded-2xl border border-border bg-card p-5">
        <h2 id="titulo-missoes" className="font-titulo text-lg font-semibold text-heading">
          Link do paciente
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">Monte as refeições primeiro: as missões são criadas a partir delas.</p>
      </section>
    )
  }

  if (acompanhamento === null) {
    return (
      <section aria-labelledby="titulo-missoes" className="rounded-2xl border border-border bg-card p-5">
        <h2 id="titulo-missoes" className="font-titulo text-lg font-semibold text-heading">
          Link do paciente
        </h2>

        {perguntandoQuem ? (
          <ParaQuem nomeSugerido={nome} aoConfirmar={criarPaciente} aoDesistir={() => setPerguntandoQuem(false)} />
        ) : pedindoConsentimento ? (
          <div className="mt-3 rounded-xl border border-stateinfo/40 bg-lightinfo p-4">
            <p className="flex items-center gap-2 font-medium text-infotext">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Antes de gerar: o paciente autorizou?
            </p>
            <p className="mt-2 text-sm text-foreground">
              O acompanhamento registra dado de saúde, que a LGPD trata como sensível. Cabe a você, nutricionista, obter a
              autorização do paciente; o MetaNutri apenas armazena os dados.
            </p>
            {/* D-1244 (spec lado-do-paciente): a autorização fala também do e-mail do paciente. */}
            <p className="mt-2 text-sm text-foreground">
              Com o e-mail do paciente na ficha, o MetaNutri manda o link por e-mail quando você pedir e oferece os avisos, que só chegam se ele
              aceitar.
            </p>
            {/* CA-542: o link passa a levar o plano alimentar, e quem autoriza precisa saber. */}
            {dietaVai ? <p className="mt-2 text-sm text-foreground">O link também mostra o plano alimentar a qualquer pessoa que tenha o endereço.</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={gerar}>
                Já tenho a autorização, gerar link
              </Button>
              <Button type="button" variant="ghost" onClick={() => setPedindoConsentimento(false)}>
                Agora não
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Gere um link para o paciente abrir no celular. Ele marca o que cumpriu no dia, e você vê quem parou de marcar antes que abandone o
              plano.
            </p>
            <p className="mt-3 text-sm text-foreground">
              {missoes.length === 1 ? 'Este plano gera 1 missão.' : `Este plano gera ${missoes.length} missões.`}
            </p>

            {cabeMaisUm ? (
              <>
                {dieta ? <CaixaDietaNoLink marcada={mostrarDieta} aoMudar={setMostrarDieta} /> : null}
                <Button
                  type="button"
                  onClick={() => (pacienteAtual === null && aoCriarPaciente ? setPerguntandoQuem(true) : setPedindoConsentimento(true))}
                  className="mt-4"
                >
                  <Link2 className="size-4" aria-hidden="true" />
                  Gerar link do paciente
                </Button>
                {naoComercial ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Conta de estudante: até {planoAtual.limiteLinksPaciente} pacientes com link, de uso não comercial. A tela do paciente avisa que
                    o acompanhamento é de estágio.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-statelow/40 bg-lightwarning p-3 text-sm text-warningtext">
                <p>{textoDoLimite(planoAtual?.limiteLinksPaciente)}</p>
                {aoVerPlanos ? (
                  <Button size="sm" variant="outline" className="mt-2" onClick={aoVerPlanos}>
                    Ver preços
                  </Button>
                ) : null}
              </div>
            )}
          </>
        )}
        {avisoDaNuvem}
      </section>
    )
  }

  // O telefone é o da ficha: a do plano ou, se o plano perdeu o vínculo, a do link (D-142).
  const idDoPaciente = pacienteAtual ?? acompanhamento.pacienteId
  const paciente = idDoPaciente ? (fichas?.pacientes.find((p) => p.id === idDoPaciente) ?? null) : null

  // CA-2222: o paciente já tem link, com outro plano. O mesmo endereço passa a mostrar este quando ela confirma.
  if (precisaAtualizarComPlano(acompanhamento, casoId)) {
    return (
      <PerguntaAtualizar
        nome={nomeCurto}
        endereco={enderecoDoPaciente(acompanhamento.token)}
        podeAvisar={podeAvisar}
        avisar={avisar}
        aoMudarAvisar={setAvisarEscolha}
        ocupado={salvando}
        aviso={avisoDaNuvem}
        aoAtualizar={() => void atualizarComEstePlano()}
      />
    )
  }

  return (
    <PainelDoLink
      acompanhamento={acompanhamento}
      hoje={hoje}
      copiado={copiado}
      gerando={salvando}
      aviso={avisoDaNuvem}
      paciente={paciente}
      caixaDaDieta={
        dieta ? (
          <CaixaDietaNoLink
            marcada={acompanhamento.dieta !== null}
            aoMudar={mudarCaixa}
            ocupada={salvando}
            desatualizada={acompanhamento.dieta !== null && dietaMudou(acompanhamento.dieta, dieta)}
            copiaVazia={!temDieta(acompanhamento.dieta)}
            aoAtualizar={atualizarDieta}
            pedindoAutorizacao={autorizandoDieta && acompanhamento.dieta === null}
            aoAutorizar={() => trocarDieta(true)}
            aoDesistir={() => setAutorizandoDieta(false)}
          />
        ) : null
      }
      aoCopiar={copiar}
      aoTrocarEndereco={() => {
        setDepoisDaTroca(null)
        setTrocando(true)
      }}
      depoisDaTroca={depoisDaTroca}
      aoCadastrarTelefone={aoCadastrarTelefone}
      dialogo={
        <DialogoTrocarEndereco
          aberto={trocando}
          aoFechar={() => setTrocando(false)}
          aoConfirmar={() => void trocarEndereco()}
          primeiroNome={nomeCurto}
          emailMascarado={emailQueFunciona}
          ocupado={salvando}
        />
      }
    />
  )
}

/** CA-2224: "Para quem é este link?", com o nome do plano já escrito. Confirmar cria a ficha, e o link é dela. */
function ParaQuem({ nomeSugerido, aoConfirmar, aoDesistir }: { readonly nomeSugerido: string; readonly aoConfirmar: (nome: string) => void; readonly aoDesistir: () => void }) {
  const id = useId()
  const [nome, setNome] = useState(nomeSugerido)
  return (
    <form
      className="mt-3 flex flex-col gap-3 rounded-xl border border-stateinfo/40 bg-lightinfo p-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (nome.trim()) aoConfirmar(nome)
      }}
    >
      <p className="flex items-center gap-2 font-medium text-infotext">
        <UserRoundPlus className="size-4" aria-hidden="true" />
        Para quem é este link?
      </p>
      <p className="text-sm text-foreground">O link é do paciente. Confirmar cria a ficha com este nome, e o plano fica ligado a ela.</p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          Nome do paciente
        </label>
        <input
          id={id}
          value={nome}
          maxLength={120}
          onChange={(e) => setNome(e.target.value)}
          className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-base text-foreground sm:min-h-0 sm:text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!nome.trim()}>
          Criar a ficha e seguir
        </Button>
        <Button type="button" variant="ghost" onClick={aoDesistir}>
          Agora não
        </Button>
      </div>
    </form>
  )
}

/** CA-2222: "Juliana já tem link. Atualizar com este plano?", sim por padrão, com o aviso por e-mail (CA-2249). */
function PerguntaAtualizar({
  nome,
  endereco,
  podeAvisar,
  avisar,
  aoMudarAvisar,
  ocupado,
  aviso,
  aoAtualizar,
}: {
  readonly nome: string
  readonly endereco: string
  readonly podeAvisar: boolean
  readonly avisar: boolean
  readonly aoMudarAvisar: (avisar: boolean) => void
  readonly ocupado: boolean
  readonly aviso: ReactNode
  readonly aoAtualizar: () => void
}) {
  const id = useId()
  return (
    <section aria-labelledby="titulo-missoes" className="rounded-2xl border border-border bg-card p-5">
      <h2 id="titulo-missoes" className="font-titulo text-lg font-semibold text-heading">
        Link do paciente
      </h2>
      <div className="mt-3 flex flex-col gap-3 rounded-xl border border-stateinfo/40 bg-lightinfo p-4">
        <p className="font-medium text-infotext [overflow-wrap:anywhere]">{`${nome || 'O paciente'} já tem link. Atualizar com este plano?`}</p>
        <p className="text-sm text-foreground">O endereço continua o mesmo, e as marcações dos dias anteriores ficam.</p>
        <p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">{endereco}</p>
        {podeAvisar ? (
          <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              id={id}
              type="checkbox"
              checked={avisar}
              onChange={(e) => aoMudarAvisar(e.target.checked)}
              className="size-5 shrink-0 cursor-pointer accent-[var(--brand-primary)]"
            />
            <span className="text-sm text-foreground [overflow-wrap:anywhere]">{nome ? `Avisar ${nome} por e-mail` : 'Avisar o paciente por e-mail'}</span>
          </label>
        ) : null}
        <div>
          <Button type="button" loading={ocupado} onClick={aoAtualizar}>
            <RefreshCw aria-hidden="true" />
            Atualizar
          </Button>
        </div>
      </div>
      {aviso}
    </section>
  )
}

function PainelDoLink({
  acompanhamento,
  hoje,
  copiado,
  gerando,
  aviso,
  paciente,
  caixaDaDieta,
  aoCopiar,
  aoTrocarEndereco,
  depoisDaTroca,
  aoCadastrarTelefone,
  dialogo,
}: {
  readonly acompanhamento: Acompanhamento
  readonly hoje: string
  readonly copiado: boolean
  readonly gerando: boolean
  /** O link ainda não chegou à nuvem (CA-439, CA-442). */
  readonly aviso: ReactNode
  /** A ficha de quem recebe o link pelo WhatsApp; nula sem paciente vinculado. */
  readonly paciente: PacienteDoWhatsApp | null
  /** Ligar, desligar e atualizar a dieta do link (spec dieta-no-link). */
  readonly caixaDaDieta: ReactNode
  readonly aoCopiar: (endereco: string) => void
  readonly aoTrocarEndereco: () => void
  /** CA-2223: o que aconteceu depois de trocar (o S4 saiu, ou mandar pelo WhatsApp). */
  readonly depoisDaTroca: string | null
  readonly aoCadastrarTelefone: ((pacienteId: string) => void) | undefined
  readonly dialogo: ReactNode
}) {
  const endereco = enderecoDoPaciente(acompanhamento.token)
  const estado = estadoDoAcompanhamento(acompanhamento, hoje)
  const naSemana = diasMarcadosNaSemana(acompanhamento, hoje)
  const doDia = progressoDoDia(acompanhamento, hoje)
  const ultima = ultimaMarcacao(acompanhamento)

  return (
    <section aria-labelledby="titulo-missoes" className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-missoes" className="font-titulo text-lg font-semibold text-heading">
          Link do paciente
        </h2>
        <SeloEstado estado={estado} />
      </div>

      <p className="mt-2 text-sm text-muted-foreground">{EXPLICACAO_ESTADO[estado]}</p>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-surfacesunken p-3">
          <dt className="text-xs text-muted-foreground">Hoje</dt>
          <dd className="numeros font-titulo text-lg font-semibold text-heading">
            {doDia.feitas}/{doDia.total}
          </dd>
        </div>
        <div className="rounded-xl bg-surfacesunken p-3">
          <dt className="text-xs text-muted-foreground">Dias na semana</dt>
          <dd className="numeros font-titulo text-lg font-semibold text-heading">{naSemana}</dd>
        </div>
        <div className="rounded-xl bg-surfacesunken p-3">
          <dt className="text-xs text-muted-foreground">Última marcação</dt>
          <dd className="font-titulo text-lg font-semibold text-heading">{ultima ? dataCompleta(ultima) : '—'}</dd>
        </div>
      </dl>

      {aviso}

      <div className="mt-4">
        <label htmlFor="endereco-missoes" className="text-xs font-medium text-muted-foreground">
          Endereço do link
        </label>
        <div className="mt-1 flex flex-wrap gap-2">
          <input
            id="endereco-missoes"
            readOnly
            value={endereco}
            onFocus={(e) => e.currentTarget.select()}
            // No celular o endereço ocupa a linha e Copiar e WhatsApp vão para baixo (spec whatsapp-e-retorno, CA-527).
            className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-surfacesunken px-3 py-2 text-base text-foreground sm:min-h-0 sm:w-auto sm:flex-1 sm:text-sm"
          />
          <Button type="button" variant="outline" onClick={() => aoCopiar(endereco)}>
            {copiado ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copiado ? 'Copiado' : 'Copiar'}
          </Button>
          {/* CA-596: o texto cita o plano alimentar quando o paciente vê a dieta no link (a mesma regra da tela dele). */}
          <BotaoWhatsApp
            paciente={paciente}
            texto={textoDoLink(paciente?.nome ?? '', endereco, temDieta(acompanhamento.dieta))}
            aoCadastrarTelefone={aoCadastrarTelefone}
          />
        </div>
      </div>

      {caixaDaDieta}

      {depoisDaTroca ? (
        <p role="status" className="mt-4 rounded-xl bg-surfacesunken p-3 text-sm text-foreground [overflow-wrap:anywhere]">
          {depoisDaTroca}
        </p>
      ) : null}

      {/* D-1215: "Gerar link novo" virou "Trocar o endereço", para quando o link vazou. */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" className="text-errortext hover:text-errortext" disabled={gerando} onClick={aoTrocarEndereco}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Trocar o endereço
        </Button>
        <p className="text-xs text-muted-foreground">Para quando o link vazou: o endereço atual deixa de abrir.</p>
      </div>
      {dialogo}
    </section>
  )
}
