// Os tetos de envio (spec lado-do-paciente, D-1237, DP-LP-11 e DP-LP-12). O Resend grátis manda 100 por dia e 3.000 por
// mês, e o dia dele vira à meia-noite UTC (21h de Brasília). 30 por dia ficam para os códigos de conta, que o MetaNutri
// não conta: as funções mandam até 70 por dia, dos quais até 45 são avisos; no mês, 1.900 avisos e 2.100 no total. Com
// 2.100, só S1 e S3 (pedidos pelo paciente) ainda saem, e só dentro do teto do dia.
//
// Puro: os números chegam do ambiente da função (lidos a cada chamada, CA-2274) e a contagem, do banco.
import { porPrioridade } from './regras.ts'
import { ehAviso, type TipoDeEmail } from './tipos.ts'

export interface Tetos {
  /** `TETO_DIA`: tudo o que as funções mandam no dia UTC. */
  readonly dia: number
  /** `TETO_AVISOS_DIA`: os avisos (A1 a A4) do dia; sem a variável, `TETO_DIA − 25`. */
  readonly avisosDia: number
  /** `TETO_MES`: tudo o que as funções mandam no mês UTC. */
  readonly mes: number
  /** `TETO_AVISOS_MES`: os avisos do mês; sem a variável, `TETO_MES − 200`. */
  readonly avisosMes: number
  /**
   * `TETO_CONTA_DIA` (D-1254): o que cada conta manda no dia UTC, somando serviço, avisos e o N1; sem a variável, 30 ou
   * 40% do `TETO_DIA`, o que for mais. Ausente: sem teto por conta.
   */
  readonly conta?: number
}

/** DP-LP-11: o que fica para o serviço quando a variável dos avisos não é dita. */
const FOLGA_DO_SERVICO_NO_DIA = 25
const FOLGA_DO_SERVICO_NO_MES = 200

/** D-1254: o teto por conta mínimo e a parte do teto do dia que uma conta pode usar. */
const TETO_CONTA_MINIMO = 30
const PARTE_DA_CONTA = 0.4

const tetoDaConta = (dia: number): number => Math.max(TETO_CONTA_MINIMO, Math.floor(PARTE_DA_CONTA * dia))

export const TETOS_PADRAO: Tetos = { dia: 70, avisosDia: 70 - FOLGA_DO_SERVICO_NO_DIA, mes: 2100, avisosMes: 2100 - FOLGA_DO_SERVICO_NO_MES, conta: tetoDaConta(70) }

/** Um inteiro positivo da variável, ou nulo. */
function inteiro(valor: string | undefined): number | null {
  if (valor === undefined || !/^\d+$/.test(valor.trim())) return null
  const n = Number(valor.trim())
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

/** CA-2274: os tetos do ambiente da função, lidos a cada chamada (`TETO_DIA`, `TETO_AVISOS_DIA`, `TETO_MES`, `TETO_AVISOS_MES`). */
export function lerTetos(ler: (nome: string) => string | undefined): Tetos {
  const dia = inteiro(ler('TETO_DIA')) ?? TETOS_PADRAO.dia
  const mes = inteiro(ler('TETO_MES')) ?? TETOS_PADRAO.mes
  return {
    dia,
    avisosDia: inteiro(ler('TETO_AVISOS_DIA')) ?? Math.max(dia - FOLGA_DO_SERVICO_NO_DIA, 0),
    mes,
    avisosMes: inteiro(ler('TETO_AVISOS_MES')) ?? Math.max(mes - FOLGA_DO_SERVICO_NO_MES, 0),
    conta: inteiro(ler('TETO_CONTA_DIA')) ?? tetoDaConta(dia),
  }
}

/** CA-2271: o dia do teto é o do Resend, que vira à meia-noite UTC. */
export const inicioDoDiaDoTeto = (agora: Date): Date => new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()))

/** O mês do teto, também em UTC. */
export const inicioDoMesDoTeto = (agora: Date): Date => new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1))

/** Quantos e-mails das funções já saíram no dia e no mês do teto (só os que contam no teto). */
export interface Contagem {
  readonly dia: number
  readonly mes: number
  readonly avisosDia: number
  readonly avisosMes: number
  /** D-1254: o que cada conta (o id da nutricionista) já mandou no dia do teto. */
  readonly porConta?: ReadonlyMap<string, number>
}

export interface Corte<T> {
  /** Cabem: saem agora, nesta ordem. */
  readonly vao: readonly T[]
  /** A1, A2 e N1 que não couberam: vão no próximo horário (D-1237). */
  readonly adiados: readonly T[]
  /** Lembretes que não couberam: não ficam para depois; a regra roda de novo no dia seguinte (D-1237). */
  readonly descartados: readonly T[]
  /** Serviço que não coube: a função responde que não deu para enviar agora (CB-1216). */
  readonly barrados: readonly T[]
  /** Os que não couberam porque a conta deles chegou ao `TETO_CONTA_DIA` (também estão numa das listas acima). */
  readonly pelaConta: readonly T[]
}

/** S1 e S3 são pedidos do próprio paciente: passam do teto do mês (não do dia). */
const PASSA_DO_MES: readonly TipoDeEmail[] = ['S1', 'S3']
const LEMBRETES: readonly TipoDeEmail[] = ['A3', 'A4']

/**
 * D-1237, D-1254, CA-2271 a CA-2273 e CA-2299: a fila por prioridade (serviço > N1 > A1 > A3/A4 > A2), cortada no que
 * sobra dos tetos de todos e no teto da conta de cada item. A conta anda dentro da chamada: o segundo item vê o primeiro.
 */
export function cortarNoTeto<T extends { readonly tipo: TipoDeEmail; readonly nutricionistaId?: string | null }>(fila: readonly T[], contagem: Contagem, tetos: Tetos): Corte<T> {
  const vao: T[] = []
  const adiados: T[] = []
  const descartados: T[] = []
  const barrados: T[] = []
  const pelaConta: T[] = []
  let { dia, mes, avisosDia, avisosMes } = contagem
  const daConta = new Map(contagem.porConta ?? [])
  for (const item of porPrioridade(fila)) {
    const aviso = ehAviso(item.tipo)
    const conta = item.nutricionistaId ?? null
    const cabeNaConta = tetos.conta === undefined || conta === null || (daConta.get(conta) ?? 0) < tetos.conta
    const cabeEmTodos =
      dia < tetos.dia && (mes < tetos.mes || PASSA_DO_MES.includes(item.tipo)) && (!aviso || (avisosDia < tetos.avisosDia && avisosMes < tetos.avisosMes))
    if (cabeEmTodos && cabeNaConta) {
      vao.push(item)
      dia += 1
      mes += 1
      if (conta !== null) daConta.set(conta, (daConta.get(conta) ?? 0) + 1)
      if (aviso) {
        avisosDia += 1
        avisosMes += 1
      }
      continue
    }
    if (cabeEmTodos) pelaConta.push(item)
    if (item.tipo.startsWith('S')) barrados.push(item)
    else if (LEMBRETES.includes(item.tipo)) descartados.push(item)
    else adiados.push(item)
  }
  return { vao, adiados, descartados, barrados, pelaConta }
}
