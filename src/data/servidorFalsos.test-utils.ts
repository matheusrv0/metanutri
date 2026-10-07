// A operadora e o banco de mentira dos testes do servidor (spec cobranca-em-producao, D-88).
// O nome não termina em `.test.ts`, então o Vitest não roda este arquivo como teste.
import type { CartaoInformado } from '../../supabase/functions/_shared/cobranca.ts'
import type {
  AvisoAnotado,
  BancoDaCobranca,
  CartaoDaReserva,
  FalhaDoBanco,
  LinhaDaAssinatura,
  Operadora,
  Registro,
  RespostaDaOperadora,
  TipoDeChamada,
} from '../../supabase/functions/_shared/portas.ts'

/** 6/10/2026, 12h em Brasília. */
export const AGORA = new Date('2026-10-06T15:00:00.000Z')
export const CARTAO: CartaoInformado = { bandeira: 'Mastercard', final: '6351' }

export const responde = (status: number, dados: Readonly<Record<string, unknown>> | null = {}): RespostaDaOperadora => ({
  ok: status >= 200 && status < 300,
  status,
  dados,
})

export interface PedidoFeito {
  readonly metodo: 'GET' | 'POST' | 'PUT'
  readonly caminho: string
  readonly corpo: Readonly<Record<string, unknown>> | undefined
}

/** O que o banco de mentira guarda por conta: a linha que os núcleos leem e o resto que foi gravado nela. */
export type LinhaGuardada = LinhaDaAssinatura & {
  readonly valor_centavos?: number
  readonly cartao_bandeira?: string | null
  readonly atualizado_em?: string
}

/** Uma tentativa de cartão guardada (a tabela tentativas_de_cartao). */
export interface TentativaGuardada {
  readonly conta: string
  readonly quando: Date
  readonly recusada: boolean
}

/** Uma chamada à operadora anotada (a tabela chamadas_da_cobranca). */
export interface ChamadaGuardada {
  readonly conta: string
  readonly tipo: TipoDeChamada
  readonly quando: Date
}

type LinhaParcial = Partial<LinhaDaAssinatura> & { readonly nutricionista_id: string }

export const linhaDe = (parcial: LinhaParcial): LinhaGuardada => ({
  plano: 'free',
  status: 'pendente',
  ciclo: null,
  preapproval_id: null,
  cartao_final: null,
  proxima_cobranca: null,
  expira_em: null,
  ultima_cobranca_paga: null,
  encerrada_por: null,
  encerrada_em: null,
  ...parcial,
})

const HORA_MS = 3_600_000

/**
 * Um cenário de teste com três peças:
 * - o banco, guardado em memória;
 * - a operadora, que responde pela rota ("PUT /preapproval/pre-1"): cada rota tem uma lista de
 *   respostas, cada pedido tira a primeira e a última fica valendo; rota sem lista, ou `null` na
 *   lista, é rede caída;
 * - o registro.
 * `ordem` guarda, em sequência, cada consulta ao banco e cada pedido à operadora.
 */
export function cenario(linhas: readonly LinhaParcial[] = [], rotas: Readonly<Record<string, readonly (RespostaDaOperadora | null)[]>> = {}) {
  const ordem: string[] = []
  const pedidos: PedidoFeito[] = []
  const filas = new Map(Object.entries(rotas).map(([rota, respostas]): [string, (RespostaDaOperadora | null)[]] => [rota, [...respostas]]))
  const operadora: Operadora = async (metodo, caminho, corpo) => {
    pedidos.push({ metodo, caminho, corpo })
    ordem.push(`${metodo} ${caminho}`)
    const fila = filas.get(`${metodo} ${caminho}`) ?? []
    return (fila.length > 1 ? fila.shift() : fila[0]) ?? null
  }

  const assinaturas = new Map<string, LinhaGuardada>(linhas.map((l) => [l.nutricionista_id, linhaDe(l)]))
  const reservas = new Map<string, { readonly desde: string } & CartaoDaReserva>()
  const avisos: AvisoAnotado[] = []
  /** A hora de cada aviso no registro (o banco grava recebido_em = now()) e se a assinatura dele conferiu. */
  const horasDosAvisos: { readonly quando: Date; readonly conferido: boolean }[] = []
  const apagadosAntesDe: string[] = []
  const tentativas: TentativaGuardada[] = []
  const chamadas: ChamadaGuardada[] = []
  const falhas = new Map<keyof BancoDaCobranca, { restam: number; readonly falha: FalhaDoBanco }>()
  /** Anota a consulta e diz se ela deve falhar desta vez. */
  const consultar = (nome: keyof BancoDaCobranca): FalhaDoBanco | null => {
    ordem.push(nome)
    const marcada = falhas.get(nome)
    if (!marcada || marcada.restam <= 0) return null
    marcada.restam -= 1
    return marcada.falha
  }

  const banco: BancoDaCobranca = {
    async lerDaConta(conta) {
      const falha = consultar('lerDaConta')
      return { linha: falha ? null : (assinaturas.get(conta) ?? null), falha }
    },
    async lerDaOperadora(preapprovalId) {
      const falha = consultar('lerDaOperadora')
      return { linha: falha ? null : ([...assinaturas.values()].find((l) => l.preapproval_id === preapprovalId) ?? null), falha }
    },
    async gravar(nova) {
      const falha = consultar('gravar')
      if (!falha) assinaturas.set(nova.nutricionista_id, { ...assinaturas.get(nova.nutricionista_id), ...nova })
      return falha
    },
    async mudar(conta, preapprovalId, mudanca) {
      const falha = consultar('mudar')
      const linha = assinaturas.get(conta)
      if (falha || !linha || linha.preapproval_id !== preapprovalId) return { linhas: 0, falha }
      assinaturas.set(conta, { ...linha, ...mudanca })
      return { linhas: 1, falha: null }
    },
    async soltarReservaVencida(conta, antesDe) {
      const falha = consultar('soltarReservaVencida')
      const reserva = reservas.get(conta)
      if (!falha && reserva && reserva.desde < antesDe) reservas.delete(conta)
      return falha
    },
    async reservar(conta, cartao) {
      const falha = consultar('reservar')
      if (falha) return falha
      if (reservas.has(conta)) return { mensagem: 'duplicate key value violates unique constraint', codigo: '23505' }
      reservas.set(conta, { desde: AGORA.toISOString(), cartao_bandeira: cartao.bandeira, cartao_final: cartao.final })
      return null
    },
    async lerReserva(conta) {
      const reserva = consultar('lerReserva') ? undefined : reservas.get(conta)
      return reserva ? { cartao_bandeira: reserva.cartao_bandeira, cartao_final: reserva.cartao_final } : null
    },
    async soltarReserva(conta) {
      const falha = consultar('soltarReserva')
      if (!falha) reservas.delete(conta)
      return falha
    },
    async anotarAviso(aviso) {
      const falha = consultar('anotarAviso')
      if (!falha) {
        avisos.push(aviso)
        horasDosAvisos.push({ quando: AGORA, conferido: aviso.assinatura_confere === true })
      }
      return falha
    },
    async apagarAvisosAntesDe(data) {
      const falha = consultar('apagarAvisosAntesDe')
      if (!falha) apagadosAntesDe.push(data)
      return falha
    },
    async contarAvisosNaoConferidos(desde) {
      const falha = consultar('contarAvisosNaoConferidos')
      if (falha) throw new Error(falha.mensagem)
      return horasDosAvisos.filter((a) => !a.conferido && a.quando.getTime() > desde.getTime()).length
    },
    async contarRecusas(conta, agora) {
      const falha = consultar('contarRecusas')
      if (falha) throw new Error(falha.mensagem)
      const agoraMs = agora.getTime()
      const recusadas = tentativas.filter((t) => t.recusada)
      const daConta24h = recusadas.filter((t) => t.conta === conta && t.quando.getTime() > agoraMs - 24 * HORA_MS)
      const ultimoSucesso = Math.max(
        Number.NEGATIVE_INFINITY,
        ...tentativas.filter((t) => t.conta === conta && !t.recusada).map((t) => t.quando.getTime()),
      )
      return {
        daConta24h: daConta24h.length,
        seguidasDaConta: daConta24h.filter((t) => t.quando.getTime() > ultimoSucesso).length,
        doSite1h: recusadas.filter((t) => t.quando.getTime() > agoraMs - HORA_MS).length,
      }
    },
    async anotarTentativa(conta, recusada) {
      if (consultar('anotarTentativa')) return
      tentativas.push({ conta, quando: AGORA, recusada })
    },
    async apagarTentativasAntesDe(data) {
      if (consultar('apagarTentativasAntesDe')) return
      const ficam = tentativas.filter((t) => t.quando.getTime() >= data.getTime())
      tentativas.splice(0, tentativas.length, ...ficam)
    },
    async anotarChamada(conta, tipo, limite, desde) {
      const falha = consultar('anotarChamada')
      if (falha) throw new Error(falha.mensagem)
      // A mesma janela estrita do banco: só conta o que é mais novo que `desde`. Contar e anotar sem pausa no meio.
      const naJanela = chamadas.filter((ch) => ch.conta === conta && ch.tipo === tipo && ch.quando.getTime() > desde.getTime()).length
      if (naJanela >= limite) return false
      chamadas.push({ conta, tipo, quando: AGORA })
      return true
    },
    async apagarChamadasAntesDe(data) {
      if (consultar('apagarChamadasAntesDe')) return
      const ficam = chamadas.filter((ch) => ch.quando.getTime() >= data.getTime())
      chamadas.splice(0, chamadas.length, ...ficam)
    },
  }

  const log = vi.fn<Registro>()
  const agora = () => AGORA
  return {
    operadora,
    pedidos,
    banco,
    assinaturas,
    reservas,
    avisos,
    apagadosAntesDe,
    tentativas,
    chamadas,
    ordem,
    log,
    /** As dependências de assinar e gerenciar-assinatura; o webhook acrescenta `segredo`. */
    deps: { operadora, banco, agora, log },
    /** A consulta falha `vezes` vezes (padrão: sempre). Nas contagens (`contarRecusas`, `anotarChamada` e `contarAvisosNaoConferidos`) a falha vira uma rejeição. */
    falhar: (nome: keyof BancoDaCobranca, vezes = Number.POSITIVE_INFINITY, falha: FalhaDoBanco = { mensagem: 'banco fora', codigo: null }) => {
      falhas.set(nome, { restam: vezes, falha })
    },
    /** Uma reserva já feita, como se outro pedido de assinar estivesse em andamento. */
    comReserva: (conta: string, desde = AGORA.toISOString(), cartao: CartaoInformado = CARTAO) => {
      reservas.set(conta, { desde, cartao_bandeira: cartao.bandeira, cartao_final: cartao.final })
    },
    /** Tentativas de cartão do passado, como se a conta já tivesse tentado antes. */
    semearTentativas: (conta: string, passadas: readonly { readonly quando: Date; readonly recusada: boolean }[]) => {
      for (const p of passadas) tentativas.push({ conta, quando: p.quando, recusada: p.recusada })
    },
    /** `n` chamadas à operadora do passado, como se a conta já tivesse pedido antes. */
    semearChamadas: (conta: string, tipo: TipoDeChamada, n: number, quando: Date) => {
      for (let i = 0; i < n; i++) chamadas.push({ conta, tipo, quando })
    },
    /** `n` avisos já no registro, chegados em `quando`; `conferido` diz se a assinatura deles conferiu. Não entram em `avisos`. */
    semearAvisos: (n: number, quando: Date, conferido = false) => {
      for (let i = 0; i < n; i++) horasDosAvisos.push({ quando, conferido })
    },
  }
}

export type Cenario = ReturnType<typeof cenario>
