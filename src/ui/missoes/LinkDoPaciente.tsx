// O que o paciente vê no link aberto (spec lado-do-paciente, D-1202 a D-1211): o aviso de estágio, o topo com a marca e o
// botão Mais, e as três partes (Hoje, Plano e Semana) com a barra de baixo. Só desenha: quem busca, marca e abre as
// folhas é a `TelaMissoesPaciente`. A prévia de "Sua marca" desenha este mesmo componente, num celular claro e num escuro
// (spec marca-no-link, DP-ML-15): o que a nutricionista vê é o que o paciente vê.
import { Ellipsis, GraduationCap } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { missoesDoDia, progressoDoDia, type Acompanhamento, type MissaoDoDia } from '@/domain/acompanhamento.ts'
import { SEM_DADOS_DO_LINK, type DadosDoLink } from '@/domain/dadosDoLink.ts'
import { temDieta } from '@/domain/dietaDoLink.ts'
import type { MarcaDoLink } from '@/domain/marca.ts'
import { assinaturaDaMensagem, consultaEmHoje, consultaEmSemana, mensagemDoLink } from '@/domain/mensagemDoLink.ts'
import { minutosAgora, refeicaoDaHora } from '@/domain/refeicaoDaHora.ts'
import { diasDaSemana, fraseDaMeta, pontosDaSemana, semanasAnteriores, ultimosSeteDias } from '@/domain/semanaDoPaciente.ts'
import { cn } from '@/lib/utils'
import { armazenamentoLocal } from '../estado/armazenamentoLocal.ts'
import { BarraDeAbas, type ParteDoLink } from './link/BarraDeAbas.tsx'
import { brilharHoje, vibrarAoMarcar } from './link/movimentoDoMarcar.ts'
import './link/movimento.css'
import { ParteHoje, type VerNoPlano } from './link/ParteHoje.tsx'
import { ParteSemana } from './link/ParteSemana.tsx'
import { primeiroNomeDoLink, refeicaoDaMissao, rotuloDoVer } from './link/textosDoLink.ts'
import { useLogoDoLink, type TemaDaPrevia } from './marcaNoLink.ts'
import { MeuPlano } from './MeuPlano.tsx'
import { MolduraDoLink } from './MolduraDoLink.tsx'
import { RodapeDoLink } from './RodapeDoLink.tsx'
import { TopoDoLink } from './TopoDoLink.tsx'

interface LinkDoPacienteProps {
  readonly acompanhamento: Acompanhamento
  readonly marca: MarcaDoLink
  readonly hoje: string
  /** D-232: a frase de quando a última marcação não chegou à nuvem. */
  readonly naoSalvou: string | null
  readonly aoAlternar: (missaoId: string, feita: boolean) => void
  /** A prévia de "Sua marca": o celular claro ou o escuro. */
  readonly previa?: TemaDaPrevia
  /** O nome da nutricionista, o e-mail mascarado e os avisos (spec lado-do-paciente); sem eles, o link abre do mesmo jeito. */
  readonly dados?: DadosDoLink
  /** A hora de agora (a refeição da hora e a consulta que passou); injetável no teste. */
  readonly agora?: Date
  /** O cartão Instalar, quando cabe (D-1219). */
  readonly instalar?: ReactNode
  /** O botão Mais abre a folha "Meu plano" (D-1212). Sem ele (a prévia), os três pontos são só desenho. */
  readonly aoAbrirMais?: () => void
}

export function LinkDoPaciente({ acompanhamento, marca, hoje, naoSalvou, aoAlternar, previa, dados = SEM_DADOS_DO_LINK, agora, instalar, aoAbrirMais }: LinkDoPacienteProps) {
  // D-1202: abre sempre em Hoje.
  const [parte, setParte] = useState<ParteDoLink>('hoje')
  const [rolarPara, setRolarPara] = useState<number | null>(null)
  // O movimento do último toque (D-1204): a missão que acabou de ser marcada e o segmento que encheu.
  const [toque, setToque] = useState<{ readonly id: string; readonly segmento: number } | null>(null)
  const [brilhar, setBrilhar] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  // CA-1973: a logo que não abriu volta à do MetaNutri.
  const { logo, aoFalhar } = useLogoDoLink(marca.logo)

  const momento = agora ?? new Date()
  const missoes = missoesDoDia(acompanhamento, hoje)
  const progresso = progressoDoDia(acompanhamento, hoje)
  const primeiroNome = primeiroNomeDoLink(acompanhamento.nome)
  // CA-536 e CB-159: link sem dieta, ou com a dieta vazia: Hoje e Semana (CA-2200, CB-1208).
  const dieta = temDieta(acompanhamento.dieta) ? acompanhamento.dieta : null
  const partes: readonly ParteDoLink[] = dieta ? ['hoje', 'plano', 'semana'] : ['hoje', 'semana']
  const daHora = dieta ? refeicaoDaHora(dieta.refeicoes.map((r) => r.horario), minutosAgora(momento)) : null
  const diasMarcados = diasDaSemana(acompanhamento, hoje)

  const irPara = (destino: ParteDoLink, refeicao: number | null = null) => {
    setParte(destino)
    // D-1206: o Plano abre na refeição pedida ("Ver") ou na da hora; o resto, no topo.
    setRolarPara(destino === 'plano' ? (refeicao ?? daHora?.indice ?? null) : null)
    if (destino !== 'plano' || (refeicao ?? daHora?.indice ?? null) === null) raiz.current?.scrollIntoView?.({ block: 'start' })
  }

  const alternar = (missaoId: string, feita: boolean) => {
    aoAlternar(missaoId, feita)
    if (!feita) {
      // D-1204: desmarcar volta na hora, sem movimento; CB-1217: o dia deixa de estar completo.
      setToque(null)
      setBrilhar(false)
      return
    }
    setToque({ id: missaoId, segmento: progresso.feitas })
    vibrarAoMarcar()
    // CA-2204: a última missão do dia brilha a barra uma vez, na primeira vez do dia.
    const completa = progresso.total > 0 && progresso.feitas + 1 >= progresso.total
    setBrilhar(completa && !previa && brilharHoje(armazenamentoLocal(), acompanhamento.token, hoje))
  }

  const verNoPlano = (missao: MissaoDoDia): VerNoPlano | null => {
    if (!dieta) return null
    const indice = refeicaoDaMissao(missao, dieta.refeicoes)
    const refeicao = indice === null ? undefined : dieta.refeicoes[indice]
    return indice === null || !refeicao ? null : { rotulo: rotuloDoVer(refeicao.nome), aoVer: () => irPara('plano', indice) }
  }

  const missaoDaRefeicao = (indice: number): MissaoDoDia | null => (dieta ? (missoes.find((m) => refeicaoDaMissao(m, dieta.refeicoes) === indice) ?? null) : null)

  const barra = <BarraDeAbas partes={partes} atual={parte} aoIr={(destino) => irPara(destino)} endereco={`/p/${acompanhamento.token}`} previa={previa} />
  // D-957: com a logo dela no topo, o MetaNutri fica pequeno no rodapé de Hoje, em todos os planos (D-959).
  const rodape = logo ? <RodapeDoLink previa={previa} /> : null

  return (
    <MolduraDoLink cor={marca.cor} previa={previa}>
      <div ref={raiz} className={cn('scroll-mt-8', previa ? null : 'pb-24 sm:pb-0')}>
        {/* D-958 e CA-1970: o aviso de estágio vem antes de tudo, antes da logo dela inclusive. */}
        {acompanhamento.usoNaoComercial ? (
          <aside className="mb-5 flex items-start gap-3 rounded-2xl border border-stateinfo/40 bg-lightinfo p-4">
            <GraduationCap className="mt-0.5 size-5 shrink-0 text-infotext" aria-hidden="true" />
            <p className="text-sm text-infotext">
              Este acompanhamento é de <strong>estágio de nutrição</strong>, feito por estudante sob supervisão. Não substitui consulta com nutricionista
              e não é atendimento profissional.
            </p>
          </aside>
        ) : null}

        {/* D-957: a logo dela no lugar da do MetaNutri, numa placa branca; ao lado, o botão Mais (D-1202). */}
        <div className="relative">
          <TopoDoLink logo={logo} aoFalhar={aoFalhar} previa={previa} />
          {aoAbrirMais ? (
            <button
              type="button"
              aria-label="Mais opções"
              onClick={aoAbrirMais}
              className="absolute -top-0.5 -right-2 grid size-11 place-content-center rounded-full text-heading hover:bg-surfacerow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Ellipsis className="size-5.5" aria-hidden="true" />
            </button>
          ) : previa ? (
            <span aria-hidden="true" className="absolute -top-0.5 -right-2 grid size-11 place-content-center text-heading">
              <Ellipsis className="size-5.5" />
            </span>
          ) : null}
        </div>

        {previa ? null : barra}

        {parte === 'hoje' ? (
          <ParteHoje
            hoje={hoje}
            primeiroNome={primeiroNome}
            missoes={missoes}
            progresso={progresso}
            naoSalvou={naoSalvou}
            mensagem={mensagemDoLink(acompanhamento.mensagem)}
            nutricionista={dados.nutricionista}
            dataDaMensagem={assinaturaDaMensagem(null, acompanhamento.mensagemEm)}
            consulta={consultaEmHoje(acompanhamento.proximaConsulta, momento)}
            pontos={pontosDaSemana(acompanhamento, hoje)}
            dias={diasMarcados}
            frase={fraseDaMeta(diasMarcados)}
            acabouDeMarcar={toque?.id ?? null}
            segmentoNovo={toque?.segmento ?? null}
            brilhar={brilhar}
            aoAlternar={alternar}
            verNoPlano={verNoPlano}
            aoAbrirSemana={() => irPara('semana')}
            instalar={instalar}
            rodape={rodape}
          />
        ) : null}

        {parte === 'plano' && dieta ? (
          <MeuPlano
            dieta={dieta}
            primeiroNome={primeiroNome}
            hoje={hoje}
            missaoDaRefeicao={missaoDaRefeicao}
            aoAlternar={alternar}
            acabouDeMarcar={toque?.id ?? null}
            daHora={daHora}
            rolarPara={rolarPara}
          />
        ) : null}

        {parte === 'semana' ? (
          <ParteSemana
            dias={ultimosSeteDias(acompanhamento, hoje)}
            diasMarcados={diasMarcados}
            frase={fraseDaMeta(diasMarcados)}
            anteriores={semanasAnteriores(acompanhamento, hoje)}
            consulta={consultaEmSemana(acompanhamento.proximaConsulta, momento)}
          />
        ) : null}

        {previa ? <div className="mt-6">{barra}</div> : null}
      </div>
    </MolduraDoLink>
  )
}
