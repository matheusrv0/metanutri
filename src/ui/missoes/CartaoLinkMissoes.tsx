// O lado do nutricionista: gerar o link do paciente e ver se ele está marcando.
// Fica junto do plano, porque é do plano que as missões saem.
import { Check, Copy, Link2, RefreshCw, ShieldCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
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
import { dataCompleta } from '@/domain/formatarData.ts'
import { LIMITE_DE_LINKS } from '@/domain/fonteSupabase.ts'
import type { Missao } from '@/domain/missoes.ts'
import { linkDeUsoNaoComercial, planoPorId, podeGerarLink, PLANO_PADRAO, type IdPlano } from '@/domain/conta.ts'
import { agoraEmBrasilia } from '@/domain/retorno.ts'
import type { Situacao } from '@/domain/situacao.ts'
import { textoDoLink } from '@/domain/whatsapp.ts'
import { useAcompanhamentos, useLerDaNuvemAoAbrir } from '@/ui/estado/contextoAcompanhamentos.ts'
import { usePacientesOpcional } from '@/ui/estado/contextoPacientes.ts'
import { LINK_GRANDE_DEMAIS } from '@/ui/estado/mensagemDoBanco.ts'
import { BotaoWhatsApp } from '@/ui/whatsapp/BotaoWhatsApp.tsx'
import type { PacienteDoWhatsApp } from '@/ui/whatsapp/DialogoWhatsApp.tsx'
import { enderecoDoPaciente } from './endereco.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { SeloEstado } from './SeloEstado.tsx'

/** CA-439: a cópia do aparelho ficou, mas o paciente ainda não abre o link. */
const NAO_SALVOU = 'Não consegui salvar o link na nuvem. O paciente ainda não consegue abrir. Tente de novo.'

interface CartaoLinkMissoesProps {
  readonly casoId: string
  readonly pacienteId: string | null
  readonly nome: string
  readonly missoes: readonly Missao[]
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
}

export function CartaoLinkMissoes({
  casoId,
  pacienteId,
  nome,
  missoes,
  plano = PLANO_PADRAO,
  situacao = null,
  hoje = agoraEmBrasilia(new Date()).dia,
  aoVerPlanos,
  aoCadastrarTelefone,
}: CartaoLinkMissoesProps) {
  const { repositorio, salvar, acompanhamentos, foraDaNuvem } = useAcompanhamentos()
  const fichas = usePacientesOpcional()
  useLerDaNuvemAoAbrir()
  const planoAtual = planoPorId(plano) ?? planoPorId(PLANO_PADRAO)
  const naoComercial = linkDeUsoNaoComercial(planoAtual, situacao)
  const [copiado, setCopiado] = useState(false)
  const [pedindoConsentimento, setPedindoConsentimento] = useState(false)
  // CA-442: a nuvem recusou pelo limite do plano e o aparelho voltou ao que era.
  const [noLimite, setNoLimite] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const acompanhamento = repositorio.porCaso(casoId)

  const gravar = async (novo: Acompanhamento) => {
    setSalvando(true)
    const motivo = await salvar(novo)
    setNoLimite(motivo === LIMITE_DE_LINKS)
    setSalvando(false)
  }

  // Gerar de novo troca o token do mesmo registro, em vez de criar um segundo:
  // dois acompanhamentos para o mesmo plano fariam a tela mostrar o link velho.
  // CA-421: o aviso, uma vez no link, não sai; e entra no link antigo de conta de estudante.
  const gerar = () => {
    setCopiado(false)
    setPedindoConsentimento(false)
    void gravar(
      acompanhamento
        ? { ...regerarLink(acompanhamento, { nome, missoes }), usoNaoComercial: acompanhamento.usoNaoComercial || naoComercial }
        : criarAcompanhamento({ casoId, pacienteId, nome, missoes, usoNaoComercial: naoComercial }),
    )
  }

  // O link que não chegou à nuvem fica marcado até subir (CA-439, CA-443). O grande demais (CA-446) não
  // oferece mandar de novo: o mesmo link seria recusado de novo; a frase diz o que fazer.
  const motivo = noLimite ? LIMITE_DE_LINKS : acompanhamento ? foraDaNuvem.get(acompanhamento.id) : undefined
  const avisoDaNuvem =
    motivo === undefined ? null : motivo === LINK_GRANDE_DEMAIS ? (
      <div role="alert" className="mt-4 rounded-xl border border-statelow/40 bg-lightwarning p-3 text-sm text-warningtext">
        <p>{LINK_GRANDE_DEMAIS}</p>
      </div>
    ) : motivo === LIMITE_DE_LINKS ? (
      <div role="alert" className="mt-4 rounded-xl border border-statelow/40 bg-lightwarning p-3 text-sm text-warningtext">
        <p>{LIMITE_DE_LINKS}</p>
        {aoVerPlanos ? (
          <Button size="sm" variant="outline" className="mt-2" onClick={aoVerPlanos}>
            Ver planos
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

  // Regerar não conta: já existe link para este plano. O limite vale para o link novo.
  const outrosLinks = acompanhamentos.filter((a) => a.casoId !== casoId).length
  const cabeMaisUm = planoAtual !== null && podeGerarLink(planoAtual, outrosLinks)

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
          Missões do paciente
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">Monte o plano primeiro: as missões saem das refeições que você montar.</p>
      </section>
    )
  }

  if (acompanhamento === null) {
    return (
      <section aria-labelledby="titulo-missoes" className="rounded-2xl border border-border bg-card p-5">
        <h2 id="titulo-missoes" className="font-titulo text-lg font-semibold text-heading">
          Missões do paciente
        </h2>

        {pedindoConsentimento ? (
          <div className="mt-3 rounded-xl border border-stateinfo/40 bg-lightinfo p-4">
            <p className="flex items-center gap-2 font-medium text-infotext">
              <ShieldCheck className="size-4" aria-hidden="true" />
              Antes de gerar: o paciente autorizou?
            </p>
            <p className="mt-2 text-sm text-foreground">
              O acompanhamento registra dado de saúde, que a LGPD trata como sensível. Quem colhe a autorização é você, o
              nutricionista — o MetaNutri só guarda. Há um texto pronto em <code>docs/lgpd-rascunhos.md</code>.
            </p>
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
              Gere um link para o paciente abrir no celular. Ele marca o que fez no dia e você vê quem está sumindo antes de sumir de vez.
            </p>
            <p className="mt-3 text-sm text-foreground">
              {missoes.length} {missoes.length === 1 ? 'missão sai' : 'missões saem'} deste plano.
            </p>

            {cabeMaisUm ? (
              <>
                <Button type="button" onClick={() => setPedindoConsentimento(true)} className="mt-4">
                  <Link2 className="size-4" aria-hidden="true" />
                  Gerar link das missões
                </Button>
                {naoComercial ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Conta de estudante: até {planoAtual.limiteLinksPaciente} links, de uso não comercial. A tela do paciente avisa que o
                    acompanhamento é de estágio.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-statelow/40 bg-lightwarning p-3 text-sm text-warningtext">
                <p>
                  Você usou {planoAtual?.limiteLinksPaciente} de {planoAtual?.limiteLinksPaciente} links de missões do seu plano. Apague um acompanhamento em
                  Adesão ou mude de plano para gerar outro.
                </p>
                {aoVerPlanos ? (
                  <Button size="sm" variant="outline" className="mt-2" onClick={aoVerPlanos}>
                    Ver planos
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
  const idDoPaciente = pacienteId ?? acompanhamento.pacienteId
  const paciente = idDoPaciente ? (fichas?.pacientes.find((p) => p.id === idDoPaciente) ?? null) : null

  return (
    <PainelDoLink
      acompanhamento={acompanhamento}
      hoje={hoje}
      copiado={copiado}
      gerando={salvando}
      aviso={avisoDaNuvem}
      paciente={paciente}
      aoCopiar={copiar}
      aoGerarNovo={gerar}
      aoCadastrarTelefone={aoCadastrarTelefone}
    />
  )
}

function PainelDoLink({
  acompanhamento,
  hoje,
  copiado,
  gerando,
  aviso,
  paciente,
  aoCopiar,
  aoGerarNovo,
  aoCadastrarTelefone,
}: {
  readonly acompanhamento: Acompanhamento
  readonly hoje: string
  readonly copiado: boolean
  readonly gerando: boolean
  /** O link ainda não chegou à nuvem (CA-439, CA-442). */
  readonly aviso: ReactNode
  /** A ficha de quem recebe o link pelo WhatsApp; nula sem paciente vinculado. */
  readonly paciente: PacienteDoWhatsApp | null
  readonly aoCopiar: (endereco: string) => void
  readonly aoGerarNovo: () => void
  readonly aoCadastrarTelefone: ((pacienteId: string) => void) | undefined
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
          Missões do paciente
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
          Link do paciente
        </label>
        <div className="mt-1 flex flex-wrap gap-2">
          <input
            id="endereco-missoes"
            readOnly
            value={endereco}
            onFocus={(e) => e.currentTarget.select()}
            // No celular o endereço ocupa a linha e Copiar e WhatsApp vão para baixo (spec whatsapp-e-retorno, CA-527).
            className="w-full min-w-0 rounded-lg border border-border bg-surfacesunken px-3 py-2 text-sm text-foreground sm:w-auto sm:flex-1"
          />
          <Button type="button" variant="outline" onClick={() => aoCopiar(endereco)}>
            {copiado ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copiado ? 'Copiado' : 'Copiar'}
          </Button>
          <BotaoWhatsApp paciente={paciente} texto={textoDoLink(paciente?.nome ?? '', endereco)} aoCadastrarTelefone={aoCadastrarTelefone} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" disabled={gerando} onClick={aoGerarNovo}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Gerar link novo
        </Button>
        <p className="text-xs text-muted-foreground">Gerar de novo atualiza as missões com o plano atual. O link antigo para de valer.</p>
      </div>
    </section>
  )
}
