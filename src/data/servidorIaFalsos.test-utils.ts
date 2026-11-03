// O pedido, o banco e o modelo de mentira dos testes da função sugerir-plano (spec assistente-ia). O nome não termina
// em `.test.ts`, então o Vitest não roda este arquivo como teste.

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
