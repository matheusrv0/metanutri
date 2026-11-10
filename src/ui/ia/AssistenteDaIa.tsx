import { useRef, useState, type ReactNode } from 'react'
import { IDS_DO_CATALOGO_IA } from '../../../supabase/functions/_shared/iaCatalogo.ts'
import type { ContextoDaResposta, CorpoDoPedidoIa, LacunasIa } from '../../../supabase/functions/_shared/iaContrato.ts'
import { diaLocal } from '@/domain/acompanhamento.ts'
import { calcularEnergia } from '@/domain/energia.ts'
import { conferirSugestao, propostaParaPlano, type ContextoDaConferencia } from '@/domain/iaConferencia.ts'
import {
  chaveDoItem,
  diaNaTela,
  erroDaIa,
  fichaNaGaveta,
  itensDoQueAjustar,
  lacunasMarcadas,
  motivoDoAdequar,
  perguntasQueFaltam,
  refeicoesDaGaveta,
  responderNaFicha,
  textoDaMeta,
  textoDoSono,
  textosDoVaiPara,
  type ErroDaIa as Erro,
  type IdPerguntaDaGaveta,
  type ModoDaGaveta,
  TITULO_DA_GAVETA,
  type PerguntaDaGaveta,
} from '@/domain/iaGaveta.ts'
import { textoDoContador } from '@/domain/iaLimites.ts'
import { aplicarMudancas, conferirMudancas, efeitoDasMudancas } from '@/domain/iaMudancas.ts'
import { gastoCalculado, lacunasDoPlano, montarPedidoIa, motivoParaNaoUsarIa, metaDeEnergia } from '@/domain/iaPedido.ts'
import { autorizacaoDeIa, type Paciente } from '@/domain/pacientes.ts'
import { produtoComoAlimento } from '@/domain/produtos.ts'
import type { RestricoesDoPaciente } from '@/domain/restricoes.ts'
import type { PerfilConta } from '@/domain/situacao.ts'
import { alimentosParaSugerir, buscarAlimento } from '@/domain/tabelas.ts'
import type { Caso, OpcaoId, OrigemIa, Plano } from '@/domain/tipos.ts'
import { cn } from '@/lib/utils'
import { Button } from '@ds/componentes/forms/button.tsx'
import { useMediaQuery } from '../estado/usarMediaQuery.ts'
import { useMeusAlimentos } from '../estado/usarMeusAlimentos.ts'
import { useSugestaoIa, type DependenciasDaSugestao } from '../estado/usarSugestaoIa.ts'
import { AdequarComIa } from './AdequarComIa.tsx'
import { AutorizacaoNaGaveta } from './AutorizacaoNaGaveta.tsx'
import { BotoesDaIa } from './BotoesDaIa.tsx'
import { AVISO_DO_CANCELAR, EsperaDaIa } from './EsperaDaIa.tsx'
import { ErroDaIa } from './ErroDaIa.tsx'
import { FaixaDaIa } from './FaixaDaIa.tsx'
import { GavetaIa, type LugarDaGaveta } from './GavetaIa.tsx'
import { MudancasDaIa } from './MudancasDaIa.tsx'
import { PedidoDaIa, type RespostasDaGaveta } from './PedidoDaIa.tsx'
import { PropostaDaIa } from './PropostaDaIa.tsx'
import { RodapeDaIa } from './RodapeDaIa.tsx'

/** O que a tela do plano recebe para mostrar a IA nela (D-1350). */
export interface ExtrasDoPlano {
  /** A linha de "Modelos de plano" com os botões da IA. */
  readonly ferramentas: (modelos: ReactNode) => ReactNode
  /** A faixa "Sugestão da IA no plano…" ou "N mudanças aplicadas.", com "Desfazer". */
  readonly topo: ReactNode
  /** "Vai para …" no item que a mudança aceita muda (CA-2371). */
  readonly vaiPara: ((refeicao: number, opcao: OpcaoId, item: number) => string | null) | undefined
}

interface AssistenteDaIaProps {
  /** O caso como vale (casoComFicha). */
  readonly caso: Caso
  readonly aoAlterarCaso: (mudanca: Partial<Caso>) => void
  readonly plano: Plano
  readonly aoAlterarPlano: (novo: Plano) => void
  readonly paciente: Paciente | null
  readonly aoAlterarPaciente: (novo: Paciente) => void
  readonly restricoes: RestricoesDoPaciente
  readonly perfil: PerfilConta | null
  readonly estudanteAprovado: boolean
  /** CB-1307: a base ampliada chegou; sem ela, a conferência espera. */
  readonly basePronta: boolean
  readonly aoVerPlanos: () => void
  readonly aoEditarNaFicha: () => void
  /** O termo de autorização em Word (D-1304, CA-2376). */
  readonly aoBaixarTermo?: (() => void) | undefined
  readonly conteudo: (extras: ExtrasDoPlano) => ReactNode
  /** A coluna da direita (Resumo do dia e Micronutrientes), que a gaveta aberta substitui a partir de 1180 px. */
  readonly lateral: ReactNode
  /** Para os testes: a função falsa. */
  readonly dependencias?: DependenciasDaSugestao | undefined
}

/** CA-2373: o plano mudou depois do pedido do adequar. */
const PLANO_MUDOU: Erro = { frase: 'O plano mudou enquanto a IA respondia. Gere de novo.', acao: 'tentar' }
const SEM_REFEICAO = 'Deixe ao menos uma refeição.'
const RASCUNHO = 'Sugestão da IA no plano, como rascunho.'

const idNovo = () => globalThis.crypto.randomUUID()
/** D-1356: o estado da gaveta é do caso e do paciente em que ela abriu. */
const donoDo = (caso: Caso, paciente: Paciente | null): string => JSON.stringify([caso.id, paciente?.id ?? null])
const temItens = (plano: Plano) => plano.refeicoes.some((r) => r.opcoes.principal.length > 0 || r.opcoes.substituto1.length > 0)
const metaDoTexto = (texto: string): number | null => {
  const n = Number(texto.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 500 && n <= 6000 ? Math.round(n) : null
}

interface Formulario {
  readonly perguntas: readonly PerguntaDaGaveta[]
  readonly respostas: RespostasDaGaveta
  readonly meta: string
  readonly tiradas: ReadonlySet<number>
  readonly algoMais: string
  readonly outro: string
  readonly desmarcadas: ReadonlySet<string>
}

interface PedidoFeito {
  /** O caso e o paciente para quem o pedido foi feito (D-1356): a resposta só vale para eles. */
  readonly dono: string
  readonly corpo: CorpoDoPedidoIa
  readonly contexto: ContextoDaResposta
  readonly conferencia: ContextoDaConferencia
  /** O plano quando o pedido saiu, em texto: o adequar descarta a resposta se ele mudou (CA-2373). */
  readonly planoDoPedido: Plano
  readonly assinaturaDoPlano: string
}

interface Desfazer {
  /** O plano de origem (D-1356): a faixa e o "Desfazer" só valem nele. */
  readonly dono: string
  readonly plano: Plano
  readonly origemIa: OrigemIa | null
  readonly texto: string
}

/**
 * O assistente de IA na etapa Refeições (spec assistente-ia, D-1300 a D-1309, D-1350 a D-1352): os botões, a gaveta, a
 * faixa com "Desfazer" e o "Vai para …". A IA só sugere; o que entra no plano é o que a nutricionista usa ou aplica.
 */
export function AssistenteDaIa(p: AssistenteDaIaProps) {
  const { caso, plano, paciente } = p
  const sugestao = useSugestaoIa(p.dependencias)
  const meus = useMeusAlimentos()
  const largo = useMediaQuery('(min-width: 1180px)')
  const estreito = useMediaQuery('(max-width: 639.98px)')
  const [abertaEm, setAbertaEm] = useState<{ readonly modo: ModoDaGaveta; readonly dono: string } | null>(null)
  const [form, setForm] = useState<Formulario | null>(null)
  const [pedido, setPedido] = useState<PedidoFeito | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [recusadas, setRecusadas] = useState<ReadonlySet<number>>(new Set())
  const [desfazer, setDesfazer] = useState<Desfazer | null>(null)
  const [erroLocal, setErroLocal] = useState<Erro | null>(null)
  // D-1359: o botão que abriu a gaveta, para o foco voltar a ele quando ela fecha.
  const quemAbriu = useRef<HTMLElement | null>(null)

  // D-1356: aberta noutro plano (a tela trocou sem desmontar), a gaveta não aparece neste.
  const dono = donoDo(caso, paciente)
  const aberta = abertaEm !== null && abertaEm.dono === dono ? abertaEm.modo : null
  const agora = new Date()
  const hoje = diaLocal(agora)
  const consentimento = paciente?.consentimentoIa ?? null
  const situacao = { comPaciente: paciente !== null, perfil: p.perfil, estudanteAprovado: p.estudanteAprovado, caso, agora }
  // CA-2360: o botão da etapa desliga pelo que a gaveta não resolve; a autorização e o limite ficam dentro dela.
  const motivoDoBotao = motivoParaNaoUsarIa({ ...situacao, consentimento: true, uso: null })
  const motivoDaGaveta = motivoParaNaoUsarIa({ ...situacao, consentimento: consentimento !== null, uso: sugestao.uso })
  const noLimite = sugestao.uso !== null && sugestao.uso.usados >= sugestao.uso.limite
  const calculada = calcularEnergia(caso, { fator: caso.energia.fator, formula: caso.energia.formula }).get
  const contador = sugestao.uso ? textoDoContador(sugestao.uso, agora) : null

  const proprios = meus.lista.map(produtoComoAlimento)
  const conferencia = (refeicoes: CorpoDoPedidoIa['refeicoes'], metaKcal: number): ContextoDaConferencia => ({
    buscar: buscarAlimento,
    caso,
    restricoes: p.restricoes,
    metaKcal,
    gastoCalculado: gastoCalculado(caso),
    refeicoes,
    idsDoCatalogo: new Set(IDS_DO_CATALOGO_IA),
    idsProprios: new Set(proprios.map((a) => a.id)),
  })

  const abrir = (modo: ModoDaGaveta, botao: HTMLElement) => {
    quemAbriu.current = botao
    if (aberta === modo) return fechar()
    if (abertaEm !== null) sugestao.cancelar()
    setAbertaEm({ modo, dono })
    setPedido(null)
    setConfirmando(false)
    setErroLocal(null)
    sugestao.voltar()
    // D-1351: as perguntas são escolhidas ao abrir e ficam à vista até fechar (CB-1320).
    setForm({
      perguntas: paciente ? perguntasQueFaltam(paciente, caso) : [],
      respostas: {},
      meta: String(Math.round(metaDeEnergia(caso) ?? calculada ?? 0) || ''),
      tiradas: new Set(),
      algoMais: '',
      outro: '',
      desmarcadas: new Set(),
    })
    // CB-1300: o contador é relido ao abrir.
    sugestao.lerUso()
  }

  const fechar = () => {
    sugestao.cancelar()
    setAbertaEm(null)
    setPedido(null)
    setConfirmando(false)
    setErroLocal(null)
  }

  const mudarForm = (mudanca: Partial<Formulario>) => setForm((f) => (f ? { ...f, ...mudanca } : f))

  // D-1351: a resposta vai para a ficha ao sair do campo e ao tocar em "Sugerir plano".
  const gravarNaFicha = (pac: Paciente, id: IdPerguntaDaGaveta, respostas: RespostasDaGaveta): Paciente => {
    const valor = id === 'sono-horario' ? textoDoSono(respostas['sono-acorda'] ?? '', respostas['sono-dorme'] ?? '') : (respostas[id] ?? '').trim()
    if (valor === '') return pac
    return responderNaFicha(pac, id, valor, hoje)
  }
  const gravarResposta = (id: IdPerguntaDaGaveta, respostas: RespostasDaGaveta = form?.respostas ?? {}) => {
    if (!paciente) return
    const novo = gravarNaFicha(paciente, id, respostas)
    if (novo !== paciente) p.aoAlterarPaciente(novo)
  }
  const gravarTodas = (): Paciente | null => {
    if (!paciente || !form) return paciente
    let novo = paciente
    for (const q of form.perguntas) novo = gravarNaFicha(novo, q.id, form.respostas)
    if (novo !== paciente) p.aoAlterarPaciente(novo)
    return novo
  }

  const autorizar = (ligada: boolean) => {
    if (paciente) p.aoAlterarPaciente({ ...paciente, consentimentoIa: ligada ? autorizacaoDeIa(hoje) : null })
  }

  const refeicoesDoPlano = refeicoesDaGaveta(plano)
  const lacunas: (LacunasIa & { readonly adequacao: unknown }) | null =
    aberta === 'ajustar' && form
      ? lacunasDoPlano(plano, { caso, metaKcal: metaDoTexto(form.meta) ?? calculada ?? 2000, buscar: buscarAlimento, alimentosParaSugerir: alimentosParaSugerir(), restricoes: p.restricoes })
      : null
  const itensAjuste = lacunas ? itensDoQueAjustar(lacunas) : []

  const pedir = () => {
    if (!form || !aberta || motivoDaGaveta) return
    const atual = gravarTodas()
    if (!atual) return
    const metaKcal = metaDoTexto(form.meta) ?? Math.round(calculada ?? 0)
    // CA-2363: a meta mudada na gaveta vale para o plano (a meta manual do caso).
    if (calculada !== null && metaKcal !== Math.round(calculada) && caso.energia.getManual !== metaKcal) p.aoAlterarCaso({ energia: { ...caso.energia, getManual: metaKcal } })
    const refeicoes = aberta === 'gerar' ? refeicoesDoPlano.filter((_, i) => !form.tiradas.has(i)) : plano.refeicoes.map((r) => ({ nome: r.nome, horario: r.horario }))
    const corpo = montarPedidoIa({
      modo: aberta,
      caso,
      paciente: atual,
      restricoes: p.restricoes,
      refeicoes,
      metaKcal,
      algoMais: aberta === 'gerar' ? form.algoMais : '',
      outroPedido: aberta === 'ajustar' ? form.outro : '',
      catalogo: IDS_DO_CATALOGO_IA,
      buscar: buscarAlimento,
      proprios,
      plano,
      ...(lacunas ? { lacunas: lacunasMarcadas(lacunas, form.desmarcadas) } : {}),
    })
    const contexto: ContextoDaResposta = {
      modo: aberta,
      refeicoes: refeicoes.length,
      idsPermitidos: new Set([...IDS_DO_CATALOGO_IA, ...corpo.meusAlimentos.map((a) => a.id)]),
      plano: corpo.plano,
    }
    const feito: PedidoFeito = { dono, corpo, contexto, conferencia: conferencia(refeicoes, metaKcal), planoDoPedido: plano, assinaturaDoPlano: JSON.stringify(plano) }
    setPedido(feito)
    setRecusadas(new Set())
    setConfirmando(false)
    setErroLocal(null)
    void sugestao.pedir(corpo, contexto)
  }
  const deNovo = () => {
    if (!pedido) return pedir()
    setRecusadas(new Set())
    setConfirmando(false)
    setErroLocal(null)
    void sugestao.pedir(pedido.corpo, pedido.contexto)
  }

  const estado = sugestao.estado
  const resposta = estado.fase === 'resposta' && pedido && pedido.dono === dono ? estado.resposta : null
  const planoMudou = resposta !== null && pedido !== null && pedido.corpo.modo === 'ajustar' && JSON.stringify(plano) !== pedido.assinaturaDoPlano
  const proposta = resposta && pedido && pedido.corpo.modo === 'gerar' && p.basePronta ? conferirSugestao(resposta.resposta, pedido.conferencia) : null
  const mudancas = resposta && pedido && pedido.corpo.modo === 'ajustar' && p.basePronta && !planoMudou ? conferirMudancas(resposta.resposta.mudancas, pedido.planoDoPedido, pedido.conferencia) : null
  const nutrientes = pedido?.corpo.lacunas?.abaixo.map((a) => a.nutriente) ?? []
  const aceitas = new Set((mudancas ?? []).map((_, i) => i).filter((i) => !recusadas.has(i) && mudancas?.[i]?.barrada === null))
  const efeito = mudancas && pedido ? efeitoDasMudancas(pedido.planoDoPedido, mudancas, aceitas, pedido.conferencia, nutrientes) : null

  const marcarIa = (modelo: string) => ({ em: hoje, modelo: modelo || 'claude' })
  const usar = () => {
    // D-1356: a proposta pedida para outro caso ou paciente não entra neste plano.
    if (!proposta || !resposta || pedido?.dono !== dono) return
    if (temItens(plano) && !confirmando) return setConfirmando(true)
    setDesfazer({ dono, plano, origemIa: caso.origemIa, texto: RASCUNHO })
    p.aoAlterarPlano(propostaParaPlano(proposta, idNovo))
    p.aoAlterarCaso({ origemIa: marcarIa(resposta.modelo) })
    fechar()
  }
  const aplicar = () => {
    if (!mudancas || !resposta || !pedido || pedido.dono !== dono || aceitas.size === 0) return
    if (JSON.stringify(plano) !== pedido.assinaturaDoPlano) return setErroLocal(PLANO_MUDOU)
    setDesfazer({ dono, plano, origemIa: caso.origemIa, texto: aceitas.size === 1 ? '1 mudança aplicada.' : `${aceitas.size} mudanças aplicadas.` })
    p.aoAlterarPlano(aplicarMudancas(plano, mudancas, aceitas, idNovo))
    p.aoAlterarCaso({ origemIa: marcarIa(resposta.modelo) })
    fechar()
  }
  const desfazerAgora = () => {
    if (!desfazer || desfazer.dono !== dono) return
    p.aoAlterarPlano(desfazer.plano)
    p.aoAlterarCaso({ origemIa: desfazer.origemIa })
    setDesfazer(null)
  }

  // ---------- A gaveta ----------

  const erro: Erro | null = erroLocal ?? (planoMudou ? PLANO_MUDOU : estado.fase === 'erro' ? estado.erro : null)
  const titulo = aberta ? TITULO_DA_GAVETA[aberta] : ''
  const autorizacao = (
    <AutorizacaoNaGaveta desde={consentimento?.em ?? null} aoMudar={autorizar} aoBaixarTermo={p.aoBaixarTermo} />
  )

  let corpo: ReactNode = null
  let rodape: ReactNode = null
  if (aberta && form) {
    const limite = noLimite && sugestao.uso ? erroDaIa({ status: 429, codigo: 'limite-mes', erro: null }, sugestao.uso, agora) : null
    if (estado.fase === 'esperando') {
      corpo = <EsperaDaIa inicio={estado.inicio} modo={aberta} />
      rodape = (
        <RodapeDaIa
          acoes={
            <Button variant="secondary" onClick={() => sugestao.cancelar()}>
              Cancelar
            </Button>
          }
          motivo={AVISO_DO_CANCELAR}
          contador={contador}
        />
      )
    } else if (erro) {
      corpo = <ErroDaIa erro={erro} aoVerPlanos={p.aoVerPlanos} />
      const acao =
        erro.acao === 'ver-planos' ? (
          <Button disabled>{aberta === 'gerar' ? 'Sugerir plano' : 'Sugerir ajustes'}</Button>
        ) : erro.acao === 'voltar' ? (
          <Button
            variant="secondary"
            onClick={() => {
              setErroLocal(null)
              sugestao.voltar()
            }}
          >
            Voltar ao pedido
          </Button>
        ) : erro.acao === 'tentar' ? (
          <Button onClick={erro === PLANO_MUDOU ? pedir : deNovo}>Tentar de novo</Button>
        ) : (
          <Button variant="secondary" onClick={fechar}>
            Fechar
          </Button>
        )
      rodape = <RodapeDaIa acoes={acao} contador={contador} />
    } else if (resposta && !p.basePronta) {
      // CB-1307: o id da base ampliada seria "fora da base" por engano; a conferência espera por ela.
      corpo = (
        <p role="status" className="py-6 text-sm text-foreground">
          O app confere com a ficha e as regras.
        </p>
      )
      rodape = <RodapeDaIa acoes={null} contador={contador} />
    } else if (proposta) {
      corpo = <PropostaDaIa proposta={proposta} />
      rodape = confirmando ? (
        <div role="alertdialog" aria-labelledby="confirmar-substituir" className="flex flex-col gap-2.5">
          <p id="confirmar-substituir" className="text-sm font-semibold text-heading">
            O plano atual será substituído.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Button onClick={usar}>Substituir</Button>
            <Button variant="secondary" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
          </div>
          {contador ? <p className="numeros text-xs text-muted-foreground">{contador}</p> : null}
        </div>
      ) : (
        <RodapeDaIa
          acoes={
            <>
              <Button onClick={usar}>Usar como rascunho</Button>
              <Button variant="secondary" onClick={deNovo}>
                Gerar de novo
              </Button>
              <Button variant="outline" onClick={fechar}>
                Fechar
              </Button>
            </>
          }
          contador={contador}
        />
      )
    } else if (mudancas && efeito) {
      corpo = <MudancasDaIa plano={pedido?.planoDoPedido ?? plano} mudancas={mudancas} recusadas={recusadas} aoDecidir={(i, aceita) => setRecusadas((r) => (aceita ? new Set([...r].filter((x) => x !== i)) : new Set([...r, i])))} efeito={efeito} nutrientes={nutrientes} />
      rodape = (
        <RodapeDaIa
          acoes={
            <>
              <Button disabled={aceitas.size === 0} onClick={aplicar}>
                {aceitas.size === 1 ? 'Aplicar 1 mudança' : `Aplicar ${aceitas.size} mudanças`}
              </Button>
              <Button variant="secondary" onClick={deNovo}>
                Gerar de novo
              </Button>
              <Button variant="outline" onClick={fechar}>
                Cancelar
              </Button>
            </>
          }
          contador={contador}
        />
      )
    } else if (limite) {
      corpo = <ErroDaIa erro={limite} aoVerPlanos={p.aoVerPlanos} />
      rodape = <RodapeDaIa acoes={<Button disabled>{aberta === 'gerar' ? 'Sugerir plano' : 'Sugerir ajustes'}</Button>} contador={contador} />
    } else if (aberta === 'gerar') {
      const semRefeicao = form.tiradas.size >= refeicoesDoPlano.length
      const motivo = motivoDaGaveta ?? (semRefeicao ? SEM_REFEICAO : null)
      corpo = (
        <PedidoDaIa
          ficha={paciente ? fichaNaGaveta(caso, paciente, p.restricoes) : []}
          aoEditarNaFicha={p.aoEditarNaFicha}
          meta={form.meta}
          aoMudarMeta={(meta) => mudarForm({ meta })}
          textoDaMeta={textoDaMeta(metaDoTexto(form.meta) ?? 0, calculada)}
          perguntas={form.perguntas}
          respostas={form.respostas}
          aoMudarResposta={(id, valor) => {
            const respostas = { ...form.respostas, [id]: valor }
            mudarForm({ respostas })
            // A escolha do orçamento não tem "sair do campo": grava na hora.
            if (id === 'orcamento') gravarResposta('orcamento', respostas)
          }}
          aoGravarResposta={(id) => gravarResposta(id)}
          refeicoes={refeicoesDoPlano}
          tiradas={form.tiradas}
          aoTirar={(i) => mudarForm({ tiradas: new Set([...form.tiradas, i]) })}
          aoRecolocar={() => mudarForm({ tiradas: new Set() })}
          algoMais={form.algoMais}
          aoMudarAlgoMais={(algoMais) => mudarForm({ algoMais })}
          autorizacao={autorizacao}
        />
      )
      rodape = (
        <RodapeDaIa
          acoes={
            <Button disabled={motivo !== null || sugestao.ocupado} onClick={pedir}>
              Sugerir plano
            </Button>
          }
          motivo={motivo}
          contador={contador}
        />
      )
    } else {
      const motivo = motivoDaGaveta ?? motivoDoAdequar(itensAjuste, form.desmarcadas, form.outro)
      corpo = (
        <AdequarComIa
          itens={itensAjuste}
          desmarcadas={form.desmarcadas}
          aoAlternar={(id) => mudarForm({ desmarcadas: form.desmarcadas.has(id) ? new Set([...form.desmarcadas].filter((x) => x !== id)) : new Set([...form.desmarcadas, id]) })}
          outro={form.outro}
          aoMudarOutro={(outro) => mudarForm({ outro })}
          autorizacao={
            consentimento ? (
              <p className="border-t border-bordersubtle pb-1 pt-3 text-sm text-muted-foreground">{`Autorização do paciente na ficha desde ${diaNaTela(consentimento.em)}.`}</p>
            ) : (
              autorizacao
            )
          }
        />
      )
      rodape = (
        <RodapeDaIa
          acoes={
            <Button disabled={motivo !== null || sugestao.ocupado} onClick={pedir}>
              Sugerir ajustes
            </Button>
          }
          motivo={motivo}
          contador={contador}
        />
      )
    }
  }

  const lugar: LugarDaGaveta | null = aberta === null ? null : estreito ? 'folha' : largo ? 'lado' : 'fluxo'
  const gaveta = lugar && aberta ? <GavetaIa titulo={titulo} lugar={lugar} aoFechar={fechar} quemAbriu={quemAbriu} corpo={corpo} rodape={rodape} /> : null

  const vaiParaTextos = mudancas && lugar !== null ? textosDoVaiPara(mudancas, recusadas, buscarAlimento) : null
  const extras: ExtrasDoPlano = {
    ferramentas: (modelos) => <BotoesDaIa modelos={modelos} podeAdequar={temItens(plano)} motivo={motivoDoBotao} aberta={aberta} aoAbrir={abrir} />,
    // D-1357: de 640 a 1180 px, a gaveta entra logo abaixo da linha dos botões, acima da faixa e das refeições.
    topo: (
      <>
        {lugar === 'fluxo' ? gaveta : null}
        {desfazer && desfazer.dono === dono ? <FaixaDaIa texto={desfazer.texto} aoDesfazer={desfazerAgora} /> : null}
      </>
    ),
    vaiPara: vaiParaTextos
      ? (refeicao, opcao, item) => (opcao === 'substituto2' ? null : (vaiParaTextos.get(chaveDoItem(refeicao, opcao === 'principal' ? 'principal' : 'opcao2', item)) ?? null))
      : undefined,
  }

  return (
    <div className={cn('grid grid-cols-[minmax(0,1fr)] gap-6', lugar === 'lado' ? 'grid-cols-[minmax(0,1fr)_500px]' : 'xl:grid-cols-[minmax(0,1fr)_360px]')}>
      {p.conteudo(extras)}
      {lugar === 'lado' ? gaveta : p.lateral}
      {lugar === 'folha' ? gaveta : null}
    </div>
  )
}
