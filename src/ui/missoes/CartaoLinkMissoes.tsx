// O lado do nutricionista: gerar o link do paciente e ver se ele está marcando.
// Fica junto do plano, porque é do plano que as missões saem.
import { Check, Copy, Link2, RefreshCw, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import {
  criarAcompanhamento,
  regerarLink,
  diaLocal,
  diasMarcadosNaSemana,
  estadoDoAcompanhamento,
  progressoDoDia,
  ultimaMarcacao,
  EXPLICACAO_ESTADO,
  type Acompanhamento,
} from '@/domain/acompanhamento.ts'
import { dataCompleta } from '@/domain/formatarData.ts'
import type { Missao } from '@/domain/missoes.ts'
import { linkDeUsoNaoComercial, planoPorId, podeGerarLink, PLANO_PADRAO, type IdPlano } from '@/domain/conta.ts'
import type { Situacao } from '@/domain/situacao.ts'
import { useAcompanhamentos } from '@/ui/estado/contextoAcompanhamentos.ts'
import { enderecoDoPaciente } from './endereco.ts'
import { Button } from '@ds/componentes/forms/button.tsx'
import { SeloEstado } from './SeloEstado.tsx'

interface CartaoLinkMissoesProps {
  readonly casoId: string
  readonly pacienteId: string | null
  readonly nome: string
  readonly missoes: readonly Missao[]
  /** Plano da conta: decide quantos links cabem. */
  readonly plano?: IdPlano
  /** Situação da conta: estudante, aprovada ou não, gera o link com o aviso de uso não comercial (D-95). */
  readonly situacao?: Situacao | null
  /** Injetável no teste; por padrão é o dia de hoje no fuso de quem olha. */
  readonly hoje?: string
  /** Leva a Preços quando o limite de links acaba (CA-177). */
  readonly aoVerPlanos?: (() => void) | undefined
}

export function CartaoLinkMissoes({
  casoId,
  pacienteId,
  nome,
  missoes,
  plano = PLANO_PADRAO,
  situacao = null,
  hoje = diaLocal(),
  aoVerPlanos,
}: CartaoLinkMissoesProps) {
  const { repositorio, salvar, acompanhamentos } = useAcompanhamentos()
  const planoAtual = planoPorId(plano) ?? planoPorId(PLANO_PADRAO)
  const naoComercial = linkDeUsoNaoComercial(planoAtual, situacao)
  const [copiado, setCopiado] = useState(false)
  const [pedindoConsentimento, setPedindoConsentimento] = useState(false)
  const acompanhamento = repositorio.porCaso(casoId)

  // Gerar de novo troca o token do mesmo registro, em vez de criar um segundo:
  // dois acompanhamentos para o mesmo plano fariam a tela mostrar o link velho.
  // CA-421: o aviso, uma vez no link, não sai; e entra no link antigo de conta de estudante.
  const gerar = () => {
    salvar(
      acompanhamento
        ? { ...regerarLink(acompanhamento, { nome, missoes }), usoNaoComercial: acompanhamento.usoNaoComercial || naoComercial }
        : criarAcompanhamento({ casoId, pacienteId, nome, missoes, usoNaoComercial: naoComercial }),
    )
    setCopiado(false)
    setPedindoConsentimento(false)
  }

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
      </section>
    )
  }

  return <PainelDoLink acompanhamento={acompanhamento} hoje={hoje} copiado={copiado} aoCopiar={copiar} aoGerarNovo={gerar} />
}

function PainelDoLink({
  acompanhamento,
  hoje,
  copiado,
  aoCopiar,
  aoGerarNovo,
}: {
  readonly acompanhamento: Acompanhamento
  readonly hoje: string
  readonly copiado: boolean
  readonly aoCopiar: (endereco: string) => void
  readonly aoGerarNovo: () => void
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
            className="min-w-0 flex-1 rounded-lg border border-border bg-surfacesunken px-3 py-2 text-sm text-foreground"
          />
          <Button type="button" variant="outline" onClick={() => aoCopiar(endereco)}>
            {copiado ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copiado ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" variant="ghost" onClick={aoGerarNovo}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Gerar link novo
        </Button>
        <p className="text-xs text-muted-foreground">Gerar de novo atualiza as missões com o plano atual. O link antigo para de valer.</p>
      </div>
    </section>
  )
}
