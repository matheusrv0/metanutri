// A tela que responde a pergunta que o plano de negócio vende: quem está sumindo?
// Ordena por urgência, não por data: quem parou de marcar aparece primeiro.
import { UserRoundX } from 'lucide-react'
import { useState } from 'react'
import {
  diasMarcadosNaSemana,
  estadoDoAcompanhamento,
  ultimaAtividade,
  ultimaMarcacao,
  DIAS_NA_SEMANA_PARA_EM_DIA,
  type Acompanhamento,
  type EstadoAcompanhamento,
} from '@/domain/acompanhamento.ts'
import { estadoDoLimite, pacientesAtivos, planoPorId, PLANO_PADRAO, type IdPlano } from '@/domain/conta.ts'
import { dataCompleta } from '@/domain/formatarData.ts'
import type { Paciente } from '@/domain/pacientes.ts'
import { agoraEmBrasilia, consultaPassou, lerConsulta, pacienteDoAcompanhamento, quando, type Momento } from '@/domain/retorno.ts'
import { textoDeContato } from '@/domain/whatsapp.ts'
import { useAcompanhamentos, useLerDaNuvemAoAbrir } from '@/ui/estado/contextoAcompanhamentos.ts'
import { useCasosOpcional } from '@/ui/estado/contextoCasos.ts'
import { useAgora } from '@/ui/estado/usarAgora.ts'
import { usePacientesOpcional } from '@/ui/estado/contextoPacientes.ts'
import { BotaoWhatsApp } from '@/ui/whatsapp/BotaoWhatsApp.tsx'
import type { PacienteDoWhatsApp } from '@/ui/whatsapp/DialogoWhatsApp.tsx'
import { Button } from '@ds/componentes/forms/button.tsx'
import { SeloEstado } from './SeloEstado.tsx'

interface TelaAdesaoProps {
  readonly aoAbrirPlano: (casoId: string) => void
  /** Plano da conta, para comparar os pacientes ativos com o limite. */
  readonly plano?: IdPlano
  /** Injetável no teste; por padrão, o dia de Brasília (D-144). */
  readonly hoje?: string | undefined
  /** Injetável no teste; decide se o retorno já passou (hora de Brasília, spec whatsapp-e-retorno). */
  readonly agora?: Date | undefined
  /** Leva a Preços quando o limite de pacientes ativos acaba (CA-177). */
  readonly aoVerPlanos?: (() => void) | undefined
  /** Abre a ficha com o cursor no Telefone, quando o WhatsApp não tem número (CA-505). */
  readonly aoCadastrarTelefone?: ((pacienteId: string) => void) | undefined
}

/** Sumindo primeiro: é quem precisa de telefonema hoje. */
const URGENCIA: Readonly<Record<EstadoAcompanhamento, number>> = { sumindo: 0, atencao: 1, 'nao-comecou': 2, 'em-dia': 3 }

/** CA-524: "Retorno sexta, 16/10 às 14:30" ao lado do nome, enquanto a consulta não passou. */
function textoDoRetorno(paciente: Paciente | null, momento: Momento): string | null {
  const consulta = lerConsulta(paciente?.proximaConsulta)
  if (!consulta || consultaPassou(consulta, momento)) return null
  return `Retorno ${quando(consulta, momento.dia)}`
}

export function TelaAdesao({ aoAbrirPlano, plano = PLANO_PADRAO, hoje: hojeFixo, agora: agoraFixo, aoVerPlanos, aoCadastrarTelefone }: TelaAdesaoProps) {
  const { acompanhamentos, avisoNuvem, foraDaNuvem, remover, lerDaNuvem } = useAcompanhamentos()
  const fichas = usePacientesOpcional()
  const planos = useCasosOpcional()
  // CA-529: a hora é refeita a cada minuto e ao voltar para a aba; o teste pode fixá-la.
  const relogio = useAgora()
  const momento = agoraEmBrasilia(agoraFixo ?? relogio)
  // D-144: o mesmo "hoje" do Painel, o de Brasília.
  const hoje = hojeFixo ?? momento.dia
  // D-104: as marcações do paciente vêm da nuvem, ao abrir e ao voltar para a aba.
  useLerDaNuvemAoAbrir()

  /** A ficha de quem marca: a do paciente do plano ou, se o plano não tem paciente, a gravada no link (D-147). */
  const fichaDe = (acompanhamento: Acompanhamento): Paciente | null => {
    const id = pacienteDoAcompanhamento(acompanhamento, planos?.casos ?? [])
    return id ? (fichas?.pacientes.find((p) => p.id === id) ?? null) : null
  }

  const comEstado = acompanhamentos
    .map((a) => ({ acompanhamento: a, estado: estadoDoAcompanhamento(a, hoje) }))
    .sort((a, b) => URGENCIA[a.estado] - URGENCIA[b.estado] || a.acompanhamento.nome.localeCompare(b.acompanhamento.nome, 'pt-BR'))

  const sumindo = comEstado.filter((i) => i.estado === 'sumindo').length
  const ativos = pacientesAtivos(acompanhamentos.map(ultimaAtividade), new Date(`${hoje}T12:00:00Z`))
  const planoAtual = planoPorId(plano) ?? planoPorId(PLANO_PADRAO)
  const limite = planoAtual ? estadoDoLimite(planoAtual, ativos) : { ativos, limite: null, excedeu: false, restantes: null }

  // CB-106: sem internet, a tela segue com a cópia do aparelho e diz isso.
  const aviso = avisoNuvem ? (
    <p role="status" className="rounded-xl border border-statelow/40 bg-lightwarning p-3 text-sm text-warningtext">
      {avisoNuvem}
    </p>
  ) : null

  if (acompanhamentos.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {aviso}
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <span aria-hidden="true" className="mx-auto mb-4 grid size-12 place-content-center rounded-full bg-muted text-muted-foreground">
          <UserRoundX className="size-6" />
        </span>
        <h2 className="font-titulo text-xl font-bold text-heading">Nenhum paciente em acompanhamento</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Abra um plano e gere o link do paciente. Ele marca no celular o que cumpriu no dia, e esta tela passa a mostrar quem parou de marcar.
        </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {aviso}
      <section aria-label="Resumo da adesão" className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Pararam de marcar</p>
          <p className="numeros font-titulo text-2xl font-bold text-heading">{sumindo}</p>
          <p className="mt-1 text-xs text-muted-foreground">{sumindo === 0 ? 'Ninguém parou de marcar.' : 'Mande uma mensagem hoje.'}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Em acompanhamento</p>
          <p className="numeros font-titulo text-2xl font-bold text-heading">{acompanhamentos.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Links do paciente gerados.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Pacientes ativos</p>
          <p className="numeros font-titulo text-2xl font-bold text-heading">
            {limite.ativos}
            {limite.limite === null ? '' : <span className="text-base text-muted-foreground">/{limite.limite}</span>}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {limite.limite === null
              ? 'Sua assinatura não tem limite.'
              : limite.excedeu
                ? 'Acima do limite da sua assinatura.'
                : limite.restantes === 1
                  ? 'Ainda cabe 1.'
                  : `Ainda cabem ${limite.restantes ?? 0}.`}
          </p>
          {limite.excedeu && aoVerPlanos ? (
            <Button size="sm" variant="outline" className="mt-2" onClick={aoVerPlanos}>
              Ver preços
            </Button>
          ) : null}
        </div>
      </section>

      <ul className="flex flex-col gap-2.5">
        {comEstado.map(({ acompanhamento, estado }) => {
          const ficha = fichaDe(acompanhamento)
          return (
            <li key={acompanhamento.id}>
              <LinhaPaciente
                acompanhamento={acompanhamento}
                estado={estado}
                hoje={hoje}
                retorno={textoDoRetorno(ficha, momento)}
                ficha={ficha}
                foraDaNuvem={foraDaNuvem.get(acompanhamento.id)}
                aoAbrirPlano={aoAbrirPlano}
                aoRemover={() => remover(acompanhamento.id)}
                aoTentarDeNovo={lerDaNuvem}
                aoCadastrarTelefone={aoCadastrarTelefone}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function LinhaPaciente({
  acompanhamento,
  estado,
  hoje,
  retorno,
  ficha,
  foraDaNuvem,
  aoAbrirPlano,
  aoRemover,
  aoTentarDeNovo,
  aoCadastrarTelefone,
}: {
  readonly acompanhamento: Acompanhamento
  readonly estado: EstadoAcompanhamento
  readonly hoje: string
  /** "Retorno sexta, 16/10 às 14:30", ou nulo sem consulta por vir (CA-524). */
  readonly retorno: string | null
  /** A ficha de quem recebe o WhatsApp; nula sem paciente vinculado. */
  readonly ficha: PacienteDoWhatsApp | null
  /** O motivo de o link ainda não estar na nuvem (CA-443). */
  readonly foraDaNuvem: string | undefined
  readonly aoAbrirPlano: (casoId: string) => void
  /** Devolve o motivo quando a nuvem não removeu (CA-440). */
  readonly aoRemover: () => Promise<string | null>
  /** Lê a nuvem de novo: sobe o que não subiu e manda o que ficou pendente (CA-443, CB-108). */
  readonly aoTentarDeNovo: () => Promise<void>
  readonly aoCadastrarTelefone: ((pacienteId: string) => void) | undefined
}) {
  const naSemana = diasMarcadosNaSemana(acompanhamento, hoje)
  const ultima = ultimaMarcacao(acompanhamento)
  const [confirmando, setConfirmando] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  const [falhou, setFalhou] = useState(false)
  const [tentando, setTentando] = useState(false)

  const tentarDeNovo = async () => {
    setTentando(true)
    await aoTentarDeNovo()
    setTentando(false)
  }

  const remover = async () => {
    setRemovendo(true)
    setFalhou(false)
    const motivo = await aoRemover()
    // Deu certo: a linha sai da lista. Só a falha precisa de estado.
    if (motivo !== null) {
      setRemovendo(false)
      setConfirmando(false)
      setFalhou(true)
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-heading">{acompanhamento.nome || 'Paciente sem nome'}</p>
            <SeloEstado estado={estado} />
            {retorno ? <span className="text-xs font-medium text-muted-foreground">{retorno}</span> : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {naSemana} de {DIAS_NA_SEMANA_PARA_EM_DIA} dias na semana · {ultima ? `última marcação em ${dataCompleta(ultima)}` : 'nunca marcou'}
          </p>
          {foraDaNuvem ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-xs text-warningtext">{`Ainda não está na nuvem. ${foraDaNuvem}`}</p>
              <Button type="button" size="sm" variant="outline" loading={tentando} onClick={() => void tentarDeNovo()}>
                Tentar de novo
              </Button>
            </div>
          ) : null}
        </div>
        {/* M-029 (spec ajustes-mobile): "Remover link" é destrutivo e fica por último, longe do WhatsApp, onde o polegar
            mira; na mesma linha, com um vão maior. */}
        <div className="flex flex-wrap items-center gap-2">
          {/* CA-509: a mensagem é para quem está sumindo ou marcando pouco. */}
          {estado === 'sumindo' || estado === 'atencao' ? (
            <BotaoWhatsApp paciente={ficha} texto={textoDeContato(ficha?.nome ?? '', estado)} aoCadastrarTelefone={aoCadastrarTelefone} />
          ) : null}
          <Button type="button" variant="outline" onClick={() => aoAbrirPlano(acompanhamento.casoId)}>
            Abrir plano
          </Button>
          <Button type="button" variant="ghost" className="sm:ml-2" onClick={() => setConfirmando(true)} disabled={confirmando}>
            Remover link
          </Button>
        </div>
      </div>

      {confirmando ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-surfacesunken p-3">
          <p className="mr-auto text-sm text-foreground">O paciente não consegue mais abrir as missões, e as marcações são apagadas.</p>
          <Button type="button" variant="destructive" loading={removendo} onClick={() => void remover()}>
            Remover
          </Button>
          <Button type="button" variant="ghost" disabled={removendo} onClick={() => setConfirmando(false)}>
            Cancelar
          </Button>
        </div>
      ) : null}

      {falhou ? (
        <p role="alert" className="mt-3 text-sm text-errortext">
          Não foi possível remover o link. Ele continua valendo. Tente de novo.
        </p>
      ) : null}
    </div>
  )
}
