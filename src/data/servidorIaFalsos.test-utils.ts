// O pedido, o banco e o modelo de mentira dos testes da função sugerir-plano (spec assistente-ia). O nome não termina
// em `.test.ts`, então o Vitest não roda este arquivo como teste.
import type { ModoIa } from '../../supabase/functions/_shared/iaContrato.ts'
import type { BancoDaIa, ChamadaDaIa, ConclusaoDoUso, ContaParaIa, ModeloDaIa, RespostaDoModelo } from '../../supabase/functions/_shared/iaPortas.ts'

/** Um pedido completo do modo gerar, como o navegador manda (a gestante do desenho, seção 10.2). */
export const PEDIDO_BASE = {
  versao: 1,
  modo: 'gerar',
  consentimento: true,
  paciente: {
    idadeAnos: 34,
    idadeMeses: 2,
    sexo: 'F',
    pesoKg: 72.3,
    estaturaCm: 165,
    fase: { tipo: 'gestante', semanas: 24 },
    atividade: 'Pouco ativo',
    objetivo: 'manter',
    objetivoTexto: 'ter mais disposição',
    doencas: ['Anemia'],
    outrosDiagnosticos: '',
    medicamentos: 'sulfato ferroso',
  },
  restricoes: { avisos: ['Alergia: leite e derivados'], textos: ['coentro'], naoGosta: ['figado', 'jilo'], cuidados: ['Na gestação, evite fígado.'] },
  rotina: { sono: 'acorda 6h, dorme 23h', trabalho: 'escritório, 8h às 17h', ondeCome: 'marmita no almoço', orcamento: 'economico', gosta: 'tapioca, frango', exercicio: '', extra: '' },
  metas: { kcal: 2150, proteina: { tipo: 'g_kg', min: 1.1, max: 1.5 }, carboidrato: { tipo: 'pct', min: 45, max: 65 }, gordura: { tipo: 'pct', min: 20, max: 35 }, foco: ['ferro', 'folato', 'cálcio'] },
  refeicoes: [
    { nome: 'Café da manhã', horario: '06:30' },
    { nome: 'Almoço', horario: '12:00' },
  ],
  naoUsar: [513, 488, 512, 488],
  meusAlimentos: [{ id: 900012, nome: 'Pão de fermentação natural', grupo: 'Cereais e derivados', unidade: 'g', kcal: 250, p: 9, c: 48, g: 1.5 }],
  plano: null,
  lacunas: null,
  pedido: '',
  // D-1347: o id da ficha, só para a função achar a autorização na cópia da conta; nunca vai à IA.
  pacienteId: 'paciente-1',
} as const

export interface OpcoesDoFluxo {
  readonly texto: string
  readonly modelo?: string
  readonly parada?: string
  readonly categoria?: string
  /** Um bloco de pensamento vazio antes do texto, como o Opus 5.5 manda. */
  readonly pensamento?: boolean
  /** Em quantos pedaços o texto chega. */
  readonly partes?: number
  readonly iteracoes?: readonly Readonly<Record<string, unknown>>[]
  readonly erroNoMeio?: string
  readonly semFim?: boolean
}

const FIM_DE_LINHA = '\n'

/** Um fluxo SSE da Messages API, como a API manda com `stream: true`. */
export function fluxoSse(o: OpcoesDoFluxo): string {
  const evento = (tipo: string, dados: Readonly<Record<string, unknown>>) =>
    `event: ${tipo}${FIM_DE_LINHA}data: ${JSON.stringify({ type: tipo, ...dados })}${FIM_DE_LINHA}${FIM_DE_LINHA}`
  const modelo = o.modelo ?? 'claude-opus-5-5'
  let saida = evento('message_start', {
    message: {
      id: 'msg_1',
      type: 'message',
      role: 'assistant',
      model: modelo,
      content: [],
      usage: { input_tokens: 1500, cache_creation_input_tokens: 0, cache_read_input_tokens: 10_000, output_tokens: 1 },
    },
  })
  saida += evento('ping', {})
  let indice = 0
  if (o.pensamento) {
    saida += evento('content_block_start', { index: indice, content_block: { type: 'thinking', thinking: '' } })
    saida += evento('content_block_delta', { index: indice, delta: { type: 'signature_delta', signature: 'abc' } })
    saida += evento('content_block_stop', { index: indice })
    indice++
  }
  saida += evento('content_block_start', { index: indice, content_block: { type: 'text', text: '' } })
  const partes = Math.max(1, o.partes ?? 1)
  const tamanho = Math.max(1, Math.ceil(o.texto.length / partes))
  for (let i = 0; i < o.texto.length; i += tamanho) saida += evento('content_block_delta', { index: indice, delta: { type: 'text_delta', text: o.texto.slice(i, i + tamanho) } })
  if (o.erroNoMeio) return saida + evento('error', { error: { type: o.erroNoMeio, message: 'Overloaded' } })
  if (o.semFim) return saida
  saida += evento('content_block_stop', { index: indice })
  saida += evento('message_delta', {
    delta: { stop_reason: o.parada ?? 'end_turn', stop_sequence: null, ...(o.categoria ? { stop_details: { type: 'refusal', category: o.categoria } } : {}) },
    usage: { output_tokens: 6000, ...(o.iteracoes ? { iterations: o.iteracoes } : {}) },
  })
  return saida + evento('message_stop', {})
}

// ---------- O banco e o modelo de mentira ----------


/** 3/11/2026, 12h em Brasília. */
export const AGORA_IA = new Date('2026-11-03T15:00:00.000Z')
export const CONTA_IA = { id: '11111111-2222-3333-4444-555555555555', email: 'ana@exemplo.com' }

export interface UsoGuardado {
  readonly id: number
  readonly conta: string
  readonly modo: ModoIa
  status: 'reservado' | 'ok' | 'recusa' | 'erro'
  readonly criadoEm: Date
  custo: number
  conclusao: ConclusaoDoUso | null
}

export type MetodoDoBanco = keyof BancoDaIa

export const CONTA_PADRAO: ContaParaIa = {
  perfil: { situacao: 'nutricionista', crnStatus: 'conferido' },
  pedidoAprovado: false,
  assinatura: { plano: 'solo', status: 'ativa', expiraEm: null },
}

/**
 * O banco da IA em memória, com a mesma conta do 016: o mês conta 'ok' e as reservas de menos de 10 minutos desde o
 * início do mês; a hora conta tudo da última hora. `falhas` faz um método rejeitar. `ordem` guarda cada consulta.
 */
export function bancoDaIaFalso(
  o: {
    readonly conta?: ContaParaIa
    readonly usos?: readonly Omit<UsoGuardado, 'id' | 'conclusao'>[]
    readonly gastoDoDia?: number
    readonly falhas?: readonly MetodoDoBanco[]
    readonly agora?: () => Date
    /** D-1347: os ids das fichas com a autorização gravada na cópia da conta (padrão: a do `PEDIDO_BASE`). */
    readonly consentimentos?: ReadonlySet<string>
  } = {},
) {
  const agora = o.agora ?? (() => AGORA_IA)
  const usos: UsoGuardado[] = (o.usos ?? []).map((u, i) => ({ ...u, id: i + 1, conclusao: null }))
  const ordem: string[] = []
  const fichas: (readonly [string, string])[] = []
  const consentimentos = o.consentimentos ?? new Set([PEDIDO_BASE.pacienteId])
  const falhas = new Set(o.falhas ?? [])
  const talvezFalhar = (metodo: MetodoDoBanco) => {
    ordem.push(metodo)
    if (falhas.has(metodo)) throw new Error(`o banco não respondeu (${metodo})`)
  }
  const contaDoMes = (conta: string, inicio: Date) =>
    usos.filter((u) => u.conta === conta && u.criadoEm.getTime() >= inicio.getTime() && (u.status === 'ok' || (u.status === 'reservado' && u.criadoEm.getTime() > agora().getTime() - 10 * 60_000))).length
  const banco: BancoDaIa = {
    async lerConta() {
      talvezFalhar('lerConta')
      return o.conta ?? CONTA_PADRAO
    },
    async consentimentoNaFicha(conta, pacienteId) {
      talvezFalhar('consentimentoNaFicha')
      fichas.push([conta, pacienteId])
      return consentimentos.has(pacienteId)
    },
    async reservar(conta, modo, limiteMes, inicio, limiteHora) {
      talvezFalhar('reservar')
      if (contaDoMes(conta, inicio) >= limiteMes) return { motivo: 'limite-mes' }
      if (usos.filter((u) => u.conta === conta && u.criadoEm.getTime() > agora().getTime() - 3_600_000).length >= limiteHora) return { motivo: 'limite-hora' }
      const id = usos.length + 1
      usos.push({ id, conta, modo, status: 'reservado', criadoEm: agora(), custo: 0, conclusao: null })
      return { reserva: id }
    },
    async concluir(reserva, conclusao) {
      ordem.push('concluir')
      const uso = usos.find((u) => u.id === reserva && u.status === 'reservado')
      if (!uso || falhas.has('concluir')) return
      uso.status = conclusao.status
      uso.custo = conclusao.custoMicrodolares
      uso.conclusao = conclusao
    },
    async usosNoMes(conta, inicio) {
      talvezFalhar('usosNoMes')
      return contaDoMes(conta, inicio)
    },
    async custoDesde(desde) {
      talvezFalhar('custoDesde')
      return (o.gastoDoDia ?? 0) + usos.filter((u) => u.criadoEm.getTime() > desde.getTime()).reduce((s, u) => s + u.custo, 0)
    },
  }
  return { banco, usos, ordem, fichas }
}

/** O modelo de mentira: cada chamada tira a primeira resposta da lista (a última fica valendo). */
export function modeloFalsoDeTeste(respostas: readonly RespostaDoModelo[]) {
  const chamadas: ChamadaDaIa[] = []
  const fila = [...respostas]
  const modelo: ModeloDaIa = async (chamada) => {
    chamadas.push(chamada)
    const resposta = fila.length > 1 ? fila.shift() : fila[0]
    if (!resposta) throw new Error('o teste não deu resposta ao modelo')
    return resposta
  }
  return { modelo, chamadas }
}
