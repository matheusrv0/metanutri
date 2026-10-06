// O painel do dono (spec painel-do-dono): contas, receita e funil, a partir do que o
// banco devolve para o administrador. Tudo aqui é puro; a tela só mostra.
// Dinheiro em centavos, sem arredondar: o anual dividido por 12 tem fração, e quem
// arredonda é o texto (negocioTextos.ts).
import { ehCiclo, ehIdPlano, planoPorId, type Ciclo, type IdPlano } from './conta.ts'
import type { StatusCrn } from './situacao.ts'

export type StatusAssinatura = 'ativa' | 'pendente' | 'pausada' | 'cancelada'
export type StatusPedido = 'em_analise' | 'aprovado' | 'recusado'
export type GrupoDeContas = 'todas' | 'nutricionistas' | 'estudantes' | 'assinantes'

/** D-57: só estes rendem. Estudante e Free são R$ 0. */
export const PLANOS_PAGOS: readonly IdPlano[] = ['solo', 'pro', 'clinica']

/** O Brasil não tem horário de verão desde 2019: Brasília é UTC−3 o ano todo. */
export const FUSO_BRASILIA_MS = 3 * 3_600_000

const DIA_MS = 86_400_000
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const
const STATUS_ASSINATURA: readonly string[] = ['ativa', 'pendente', 'pausada', 'cancelada']
const STATUS_PEDIDO: readonly string[] = ['em_analise', 'aprovado', 'recusado']
const STATUS_CRN: readonly string[] = ['em_conferencia', 'conferido', 'nao_encontrado']

export interface AssinaturaNoPainel {
  readonly plano: IdPlano
  readonly status: StatusAssinatura
  /** Nulo em plano que não é pago (Estudante, Free). */
  readonly ciclo: Ciclo | null
  readonly valorCentavos: number
  readonly expiraEm: string | null
  readonly atualizadaEm: string
}

export interface ContaNoPainel {
  readonly id: string
  readonly nome: string
  readonly email: string
  readonly criadaEm: string
  readonly emailConfirmadoEm: string | null
  /** Último login com e-mail e senha (D-60), não a última vez que abriu o app. */
  readonly ultimoLoginEm: string | null
  readonly situacao: 'nutricionista' | 'estudante' | null
  readonly crnRegiao: number | null
  readonly crnStatus: StatusCrn | null
  /** O pedido de estudante mais recente. */
  readonly pedidoStatus: StatusPedido | null
  readonly assinatura: AssinaturaNoPainel | null
}

export interface MudancaDeAssinatura {
  readonly conta: string
  readonly plano: IdPlano
  readonly status: StatusAssinatura
  readonly ciclo: Ciclo | null
  readonly valorCentavos: number
  readonly quando: string
}

export interface UsoNoPainel {
  readonly links30Dias: number
  readonly copias30Dias: number
}

type Rende = Pick<AssinaturaNoPainel, 'plano' | 'status' | 'ciclo' | 'valorCentavos'>

const txt = (v: unknown): string => (typeof v === 'string' ? v : '')
const textoOuNulo = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null)
const numero = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const instante = (iso: string): number => Date.parse(iso)
const ha30Dias = (agora: Date): number => agora.getTime() - 30 * DIA_MS

/** D-59: o ciclo vem do banco; sem ele (assinatura de antes do 007), o preço do anual decide. */
export function cicloDe(plano: IdPlano, ciclo: unknown, valorCentavos: number): Ciclo | null {
  if (!PLANOS_PAGOS.includes(plano)) return null
  if (ehCiclo(ciclo)) return ciclo
  const anual = planoPorId(plano)?.anual ?? 0
  return anual > 0 && valorCentavos === Math.round(anual * 100) ? 'anual' : 'mensal'
}

export function daLinhaContaNoPainel(linha: unknown): ContaNoPainel | null {
  if (typeof linha !== 'object' || linha === null) return null
  const o = linha as Record<string, unknown>
  const id = o['id']
  const criadaEm = o['criada_em']
  if (typeof id !== 'string' || typeof criadaEm !== 'string') return null
  const situacao = o['situacao']
  const crnStatus = o['crn_status']
  const pedidoStatus = o['pedido_status']
  const plano = o['plano']
  const status = o['status']
  const valorCentavos = numero(o['valor_centavos'])
  return {
    id,
    nome: txt(o['nome']).trim(),
    email: txt(o['email']),
    criadaEm,
    emailConfirmadoEm: textoOuNulo(o['email_confirmado_em']),
    ultimoLoginEm: textoOuNulo(o['ultimo_login_em']),
    situacao: situacao === 'nutricionista' || situacao === 'estudante' ? situacao : null,
    crnRegiao: typeof o['crn_regiao'] === 'number' ? o['crn_regiao'] : null,
    crnStatus: typeof crnStatus === 'string' && STATUS_CRN.includes(crnStatus) ? (crnStatus as StatusCrn) : null,
    pedidoStatus: typeof pedidoStatus === 'string' && STATUS_PEDIDO.includes(pedidoStatus) ? (pedidoStatus as StatusPedido) : null,
    assinatura:
      ehIdPlano(plano) && typeof status === 'string' && STATUS_ASSINATURA.includes(status)
        ? {
            plano,
            status: status as StatusAssinatura,
            ciclo: cicloDe(plano, o['ciclo'], valorCentavos),
            valorCentavos,
            expiraEm: textoOuNulo(o['expira_em']),
            atualizadaEm: txt(o['assinatura_atualizada_em']),
          }
        : null,
  }
}

export function daLinhaMudanca(linha: unknown): MudancaDeAssinatura | null {
  if (typeof linha !== 'object' || linha === null) return null
  const o = linha as Record<string, unknown>
  const conta = o['nutricionista_id']
  const plano = o['plano']
  const status = o['status']
  const quando = o['quando']
  if (typeof conta !== 'string' || !ehIdPlano(plano) || typeof status !== 'string' || !STATUS_ASSINATURA.includes(status) || typeof quando !== 'string') return null
  const valorCentavos = numero(o['valor_centavos'])
  return {
    conta,
    plano,
    status: status as StatusAssinatura,
    ciclo: cicloDe(plano, o['ciclo'], valorCentavos),
    valorCentavos,
    quando,
  }
}

/** A função devolve uma linha só, dentro de uma lista. */
export function daLinhaUso(dados: unknown): UsoNoPainel {
  const linha: unknown = Array.isArray(dados) ? dados[0] : dados
  const o = typeof linha === 'object' && linha !== null ? (linha as Record<string, unknown>) : {}
  return { links30Dias: numero(o['links_30_dias']), copias30Dias: numero(o['copias_30_dias']) }
}

/** D-57: plano pago e ativo. */
export function ehPaga(a: Pick<AssinaturaNoPainel, 'plano' | 'status'> | null): boolean {
  return a !== null && a.status === 'ativa' && PLANOS_PAGOS.includes(a.plano)
}

/** D-57: quanto rende por mês, em centavos. O anual entra dividido por 12. */
export function rendaMensal(a: Rende | null): number {
  if (!a || !ehPaga(a)) return 0
  return a.ciclo === 'anual' ? a.valorCentavos / 12 : a.valorCentavos
}

/** A receita num instante: a última mudança de cada conta até ali (CA-350, CB-81). */
export function receitaNoHistorico(historico: readonly MudancaDeAssinatura[], ate: number): number {
  const ultima = new Map<string, MudancaDeAssinatura>()
  for (const m of historico) {
    const t = instante(m.quando)
    if (!(t <= ate)) continue
    const anterior = ultima.get(m.conta)
    if (!anterior || instante(anterior.quando) <= t) ultima.set(m.conta, m)
  }
  let total = 0
  for (const m of ultima.values()) total += rendaMensal(m)
  return total
}

export interface ResumoDoNegocio {
  readonly receitaCentavos: number
  readonly diferenca30DiasCentavos: number
  readonly assinaturasAtivas: number
  /** De 0 a 1. Nulo sem nenhuma conta. */
  readonly parteQuePaga: number | null
  readonly contas: number
  readonly contasNovas30Dias: number
}

/** CA-346 a CA-348. A receita de agora vem das assinaturas; a de 30 dias antes, do histórico. */
export function resumirNegocio(contas: readonly ContaNoPainel[], historico: readonly MudancaDeAssinatura[], agora: Date): ResumoDoNegocio {
  const receita = contas.reduce((soma, c) => soma + rendaMensal(c.assinatura), 0)
  const pagas = contas.filter((c) => ehPaga(c.assinatura))
  return {
    receitaCentavos: receita,
    diferenca30DiasCentavos: receita - receitaNoHistorico(historico, ha30Dias(agora)),
    assinaturasAtivas: pagas.length,
    parteQuePaga: contas.length === 0 ? null : pagas.length / contas.length,
    contas: contas.length,
    contasNovas30Dias: contas.filter((c) => instante(c.criadaEm) > ha30Dias(agora)).length,
  }
}

export interface BarraDeReceita {
  /** AAAA-MM. */
  readonly chave: string
  /** "set". */
  readonly mes: string
  readonly centavos: number
  readonly atual: boolean
}

/** Índice do mês (ano × 12 + mês) de um instante, no horário de Brasília (CB-85). */
const indiceDoMes = (t: number): number => {
  const d = new Date(t - FUSO_BRASILIA_MS)
  return d.getUTCFullYear() * 12 + d.getUTCMonth()
}

/** Último milissegundo do mês, em Brasília: 00h de Brasília do mês seguinte é 03h UTC. */
const fimDoMes = (indice: number): number => Date.UTC(Math.floor((indice + 1) / 12), (indice + 1) % 12, 1) + FUSO_BRASILIA_MS - 1

/** CA-350: até `meses` meses, terminando no atual e começando no primeiro mês do histórico (D-58). */
export function receitaPorMes(historico: readonly MudancaDeAssinatura[], receitaDeAgora: number, agora: Date, meses = 6): BarraDeReceita[] {
  const atual = indiceDoMes(agora.getTime())
  const primeiro = historico.reduce((menor, m) => {
    const t = instante(m.quando)
    return Number.isFinite(t) ? Math.min(menor, indiceDoMes(t)) : menor
  }, atual)
  const barras: BarraDeReceita[] = []
  for (let indice = Math.max(primeiro, atual - meses + 1); indice <= atual; indice++) {
    const mes = indice % 12
    barras.push({
      chave: `${Math.floor(indice / 12)}-${String(mes + 1).padStart(2, '0')}`,
      mes: MESES[mes] ?? '',
      centavos: indice === atual ? receitaDeAgora : receitaNoHistorico(historico, fimDoMes(indice)),
      atual: indice === atual,
    })
  }
  return barras
}

export interface LinhaDePlano {
  /** "pro-mensal". */
  readonly chave: string
  readonly plano: IdPlano
  readonly ciclo: Ciclo
  readonly quantidade: number
  readonly centavosPorMes: number
  /** De 0 a 1 da receita. */
  readonly parte: number
}

/** CA-352: cada plano e ciclo com assinatura ativa, da que rende mais para a que rende menos. */
export function assinaturasPorPlano(contas: readonly ContaNoPainel[]): LinhaDePlano[] {
  const grupos = new Map<string, Omit<LinhaDePlano, 'parte'>>()
  for (const c of contas) {
    const a = c.assinatura
    if (!a || !ehPaga(a)) continue
    const ciclo: Ciclo = a.ciclo ?? 'mensal'
    const chave = `${a.plano}-${ciclo}`
    const grupo = grupos.get(chave) ?? { chave, plano: a.plano, ciclo, quantidade: 0, centavosPorMes: 0 }
    grupos.set(chave, { ...grupo, quantidade: grupo.quantidade + 1, centavosPorMes: grupo.centavosPorMes + rendaMensal(a) })
  }
  const total = [...grupos.values()].reduce((soma, g) => soma + g.centavosPorMes, 0)
  return [...grupos.values()]
    .map((g) => ({ ...g, parte: total > 0 ? g.centavosPorMes / total : 0 }))
    .sort((x, y) => y.centavosPorMes - x.centavosPorMes || x.chave.localeCompare(y.chave))
}

export interface SituacoesDeAssinatura {
  readonly pendentes: number
  readonly pausadas: number
  readonly canceladas30Dias: number
}

/**
 * Quando a conta passou para `cancelada`: a primeira linha cancelada depois da última linha não cancelada
 * do histórico. Sem essa linha (assinatura de antes do 007), nulo.
 */
function canceladaEm(historico: readonly MudancaDeAssinatura[], id: string): number | null {
  const linhas = historico.filter((m) => m.conta === id).sort((x, y) => instante(x.quando) - instante(y.quando))
  let ultimaNaoCancelada = -1
  linhas.forEach((m, i) => {
    if (m.status !== 'cancelada') ultimaNaoCancelada = i
  })
  const virada = linhas[ultimaNaoCancelada + 1]
  return virada?.status === 'cancelada' ? instante(virada.quando) : null
}

/** CA-353. A cancelada conta pela mudança do histórico que a cancelou; sem histórico, pela atualizadaEm. */
export function situacoesDeAssinatura(
  contas: readonly ContaNoPainel[],
  historico: readonly MudancaDeAssinatura[],
  agora: Date,
): SituacoesDeAssinatura {
  let pendentes = 0
  let pausadas = 0
  let canceladas30Dias = 0
  for (const c of contas) {
    const a = c.assinatura
    if (!a) continue
    if (a.status === 'pendente') pendentes += 1
    else if (a.status === 'pausada') pausadas += 1
    else if (a.status === 'cancelada' && (canceladaEm(historico, c.id) ?? instante(a.atualizadaEm)) > ha30Dias(agora)) canceladas30Dias += 1
  }
  return { pendentes, pausadas, canceladas30Dias }
}

export interface EtapaDoFunil {
  readonly chave: 'criaram' | 'confirmaram' | 'verificadas' | 'assinaram'
  readonly rotulo: string
  readonly quantidade: number
  /** De 0 a 1, sobre quem criou conta (D-62). Nulo na primeira etapa e sem ninguém novo. */
  readonly parte: number | null
}

/** Nutricionista com CRN conferido ou estudante com matrícula aprovada. */
export function ehVerificada(c: ContaNoPainel): boolean {
  return (c.situacao === 'nutricionista' && c.crnStatus === 'conferido') || (c.situacao === 'estudante' && c.pedidoStatus === 'aprovado')
}

/** CA-354: as contas criadas nos últimos 30 dias, etapa por etapa. Assinar não depende de verificar (D-62). */
export function funilDe30Dias(contas: readonly ContaNoPainel[], agora: Date): EtapaDoFunil[] {
  const novas = contas.filter((c) => instante(c.criadaEm) > ha30Dias(agora))
  const confirmaram = novas.filter((c) => c.emailConfirmadoEm !== null)
  const verificadas = confirmaram.filter(ehVerificada)
  const assinaram = confirmaram.filter((c) => ehPaga(c.assinatura))
  const parte = (n: number): number | null => (novas.length === 0 ? null : n / novas.length)
  return [
    { chave: 'criaram', rotulo: 'criaram conta', quantidade: novas.length, parte: null },
    { chave: 'confirmaram', rotulo: 'confirmaram o e-mail', quantidade: confirmaram.length, parte: parte(confirmaram.length) },
    { chave: 'verificadas', rotulo: 'foram verificadas', quantidade: verificadas.length, parte: parte(verificadas.length) },
    { chave: 'assinaram', rotulo: 'assinaram um plano pago', quantidade: assinaram.length, parte: parte(assinaram.length) },
  ]
}

const semAcento = (s: string): string => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

function noGrupo(c: ContaNoPainel, grupo: GrupoDeContas): boolean {
  if (grupo === 'nutricionistas') return c.situacao === 'nutricionista'
  if (grupo === 'estudantes') return c.situacao === 'estudante'
  if (grupo === 'assinantes') return ehPaga(c.assinatura)
  return true
}

/** CA-356, CA-360 e CA-361: a mais nova primeiro; a busca olha nome e e-mail, sem acento. */
export function filtrarContas(
  contas: readonly ContaNoPainel[],
  grupo: GrupoDeContas,
  busca: string,
): { readonly visiveis: readonly ContaNoPainel[]; readonly totalDoGrupo: number } {
  const doGrupo = contas.filter((c) => noGrupo(c, grupo)).sort((x, y) => instante(y.criadaEm) - instante(x.criadaEm))
  const termo = semAcento(busca.trim())
  const visiveis = termo === '' ? doGrupo : doGrupo.filter((c) => semAcento(c.nome).includes(termo) || semAcento(c.email).includes(termo))
  return { visiveis, totalDoGrupo: doGrupo.length }
}

/** Marcas do eixo, em centavos: zero e três degraus redondos (1, 2, 2,5 ou 5 × 10ⁿ). Piso de R$ 150. */
export function marcasDoEixo(maiorCentavos: number): number[] {
  const alvo = Math.max(maiorCentavos, 15000) / 3
  let potencia = 1
  while (potencia * 10 <= alvo) potencia *= 10
  const degrau = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((d) => d >= alvo) ?? 10 * potencia
  return [0, degrau, 2 * degrau, 3 * degrau]
}
