// Anamnese com roteiro (spec anamnese-e-prescricoes, D-160 a D-163).
//
// O roteiro é da conta: oito blocos fixos, com as perguntas que o nutricionista edita. As respostas são do
// paciente e ficam na ficha dele, cada uma com o texto da pergunta, para nunca se perder quando o roteiro muda.
import type { Armazenamento } from './persistencia.ts'

export const CHAVE_ROTEIRO = 'metanutri:roteiro-anamnese'

export type IdBloco = 'objetivo' | 'rotina' | 'intestino' | 'agua' | 'alcool-fumo' | 'atividade' | 'preferencias' | 'recordatorio'

export interface BlocoAnamnese {
  readonly id: IdBloco
  readonly titulo: string
}

/** D-160: os blocos e a ordem deles não mudam nesta versão. */
export const BLOCOS_ANAMNESE: readonly BlocoAnamnese[] = [
  { id: 'objetivo', titulo: 'Objetivo e queixa' },
  { id: 'rotina', titulo: 'Rotina e sono' },
  { id: 'intestino', titulo: 'Intestino' },
  { id: 'agua', titulo: 'Água' },
  { id: 'alcool-fumo', titulo: 'Álcool e fumo' },
  { id: 'atividade', titulo: 'Atividade física' },
  { id: 'preferencias', titulo: 'Preferências e aversões' },
  { id: 'recordatorio', titulo: 'Recordatório de 24 horas' },
]

const IDS_BLOCO: ReadonlySet<string> = new Set(BLOCOS_ANAMNESE.map((b) => b.id))
const ehIdBloco = (v: unknown): v is IdBloco => typeof v === 'string' && IDS_BLOCO.has(v)

export interface PerguntaRoteiro {
  readonly id: string
  readonly texto: string
}

export interface RoteiroAnamnese {
  readonly perguntas: Readonly<Record<IdBloco, readonly PerguntaRoteiro[]>>
}

const p = (id: string, texto: string): PerguntaRoteiro => ({ id, texto })

/** Seção 2 da spec. Os ids são estáveis: as respostas dos pacientes apontam para eles. */
export const ROTEIRO_PADRAO: RoteiroAnamnese = {
  perguntas: {
    objetivo: [p('queixa', 'Queixa principal'), p('historico-peso', 'Histórico do peso'), p('dietas', 'Dietas que já fez')],
    rotina: [
      p('rotina-trabalho', 'Rotina de trabalho ou estudo'),
      p('refeicoes-onde', 'Quem prepara as refeições e onde come'),
      p('sono-horario', 'Horário de dormir e de acordar'),
      p('sono-qualidade', 'Qualidade do sono'),
    ],
    intestino: [p('evacuacao', 'Frequência de evacuação'), p('fezes', 'Consistência das fezes'), p('desconforto', 'Gases, estufamento ou desconforto')],
    agua: [p('agua-dia', 'Quanta água bebe por dia'), p('outras-bebidas', 'Outras bebidas ao longo do dia')],
    'alcool-fumo': [p('alcool', 'Bebida alcoólica: o quê e quanto'), p('fumo', 'Fumo')],
    atividade: [p('atividade-tipo', 'Atividade que pratica'), p('atividade-frequencia', 'Frequência e duração'), p('atividade-horario', 'Horário')],
    preferencias: [p('gosta', 'Alimentos de que gosta'), p('nao-gosta', 'Alimentos de que não gosta'), p('vontades', 'Vontade de doce ou salgado')],
    recordatorio: [
      p('r24-acordar', 'Ao acordar'),
      p('r24-cafe', 'Café da manhã'),
      p('r24-lanche-manha', 'Lanche da manhã'),
      p('r24-almoco', 'Almoço'),
      p('r24-lanche-tarde', 'Lanche da tarde'),
      p('r24-jantar', 'Jantar'),
      p('r24-ceia', 'Ceia'),
    ],
  },
}

/**
 * O roteiro como o app usa: só os blocos conhecidos, na ordem deles (CB-162). Bloco que falta usa o padrão;
 * bloco esvaziado de propósito continua vazio. Pergunta sem texto sai (CB-161), e o id vale uma vez só.
 */
function normalizarRoteiro(blocos: unknown): RoteiroAnamnese {
  const fonte = typeof blocos === 'object' && blocos !== null && !Array.isArray(blocos) ? (blocos as Record<string, unknown>) : {}
  const vistos = new Set<string>()
  const perguntas = {} as Record<IdBloco, readonly PerguntaRoteiro[]>
  for (const { id } of BLOCOS_ANAMNESE) {
    const lista = Object.hasOwn(fonte, id) ? fonte[id] : ROTEIRO_PADRAO.perguntas[id]
    perguntas[id] = (Array.isArray(lista) ? lista : ROTEIRO_PADRAO.perguntas[id]).flatMap((item: unknown) => {
      if (typeof item !== 'object' || item === null) return []
      const { id: idPergunta, texto } = item as Record<string, unknown>
      if (typeof idPergunta !== 'string' || idPergunta === '' || typeof texto !== 'string' || texto.trim() === '' || vistos.has(idPergunta)) return []
      vistos.add(idPergunta)
      return [{ id: idPergunta, texto: texto.trim() }]
    })
  }
  return { perguntas }
}

/** O roteiro da conta. Sem armazenamento, sem nada guardado ou com dado que não se lê, o padrão (CB-160, CB-162). */
export function lerRoteiro(armazenamento: Armazenamento | null): RoteiroAnamnese {
  if (!armazenamento) return ROTEIRO_PADRAO
  try {
    const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE_ROTEIRO) ?? 'null')
    if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return ROTEIRO_PADRAO
    return normalizarRoteiro((bruto as Record<string, unknown>)['blocos'])
  } catch {
    return ROTEIRO_PADRAO
  }
}

/** `false` quando o aparelho não guardou: o roteiro vale só até fechar a página (CB-160). */
export function gravarRoteiro(armazenamento: Armazenamento | null, roteiro: RoteiroAnamnese): boolean {
  if (!armazenamento) return false
  try {
    armazenamento.setItem(CHAVE_ROTEIRO, JSON.stringify({ formato: 1, blocos: normalizarRoteiro(roteiro.perguntas).perguntas }))
    return true
  } catch {
    return false
  }
}

// ---------- Editar o roteiro (CA-565) ----------

const comBloco = (roteiro: RoteiroAnamnese, bloco: IdBloco, perguntas: readonly PerguntaRoteiro[]): RoteiroAnamnese => ({
  perguntas: { ...roteiro.perguntas, [bloco]: perguntas },
})

export const acrescentarPergunta = (roteiro: RoteiroAnamnese, bloco: IdBloco, id: string): RoteiroAnamnese =>
  comBloco(roteiro, bloco, [...roteiro.perguntas[bloco], { id, texto: '' }])

export const renomearPergunta = (roteiro: RoteiroAnamnese, bloco: IdBloco, id: string, texto: string): RoteiroAnamnese =>
  comBloco(
    roteiro,
    bloco,
    roteiro.perguntas[bloco].map((pergunta) => (pergunta.id === id ? { ...pergunta, texto } : pergunta)),
  )

export const tirarPergunta = (roteiro: RoteiroAnamnese, bloco: IdBloco, id: string): RoteiroAnamnese =>
  comBloco(
    roteiro,
    bloco,
    roteiro.perguntas[bloco].filter((pergunta) => pergunta.id !== id),
  )

// ---------- As respostas do paciente (D-163) ----------

export interface RespostaAnamnese {
  readonly perguntaId: string
  readonly blocoId: IdBloco
  /** O texto da pergunta quando foi respondida: é o que aparece se ela sair do roteiro (CA-568). */
  readonly pergunta: string
  readonly resposta: string
}

/** CA-588: o que não é lista vira lista vazia; resposta estragada ou vazia sai; o id vale uma vez só. */
export function normalizarRespostas(valor: unknown): RespostaAnamnese[] {
  if (!Array.isArray(valor)) return []
  const vistos = new Set<string>()
  return valor.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null) return []
    const { perguntaId, blocoId, pergunta, resposta } = item as Record<string, unknown>
    if (typeof perguntaId !== 'string' || !ehIdBloco(blocoId) || typeof pergunta !== 'string' || typeof resposta !== 'string') return []
    if (resposta.trim() === '' || vistos.has(perguntaId)) return []
    vistos.add(perguntaId)
    return [{ perguntaId, blocoId, pergunta, resposta }]
  })
}

/** CA-561: grava a resposta (com o texto atual da pergunta). Resposta só com espaço sai da ficha. */
export function responder(respostas: readonly RespostaAnamnese[], pergunta: PerguntaRoteiro, blocoId: IdBloco, resposta: string): RespostaAnamnese[] {
  if (resposta.trim() === '') return respostas.filter((r) => r.perguntaId !== pergunta.id)
  const nova: RespostaAnamnese = { perguntaId: pergunta.id, blocoId, pergunta: pergunta.texto, resposta }
  return respostas.some((r) => r.perguntaId === pergunta.id) ? respostas.map((r) => (r.perguntaId === pergunta.id ? nova : r)) : [...respostas, nova]
}

export interface PerguntaDaFicha {
  readonly id: string
  readonly texto: string
  readonly resposta: string
  /** A pergunta saiu do roteiro, mas a resposta ficou (CA-568). */
  readonly foraDoRoteiro: boolean
}

export interface BlocoDaFicha {
  readonly id: IdBloco
  readonly titulo: string
  readonly perguntas: readonly PerguntaDaFicha[]
  readonly respondidas: number
}

/**
 * Os blocos como a ficha mostra: as perguntas do roteiro com a resposta, depois as respostas cuja pergunta
 * saiu do roteiro. Bloco sem nada para mostrar some (CB-161).
 */
export function blocosDaFicha(roteiro: RoteiroAnamnese, respostas: readonly RespostaAnamnese[]): BlocoDaFicha[] {
  const porId = new Map(respostas.map((r) => [r.perguntaId, r]))
  const noRoteiro = new Set(BLOCOS_ANAMNESE.flatMap((b) => roteiro.perguntas[b.id].map((pergunta) => pergunta.id)))
  return BLOCOS_ANAMNESE.flatMap(({ id, titulo }) => {
    const doRoteiro = roteiro.perguntas[id].map((pergunta) => ({ id: pergunta.id, texto: pergunta.texto, resposta: porId.get(pergunta.id)?.resposta ?? '', foraDoRoteiro: false }))
    const fora = respostas
      .filter((r) => r.blocoId === id && !noRoteiro.has(r.perguntaId))
      .map((r) => ({ id: r.perguntaId, texto: r.pergunta, resposta: r.resposta, foraDoRoteiro: true }))
    const perguntas = [...doRoteiro, ...fora]
    if (perguntas.length === 0) return []
    return [{ id, titulo, perguntas, respondidas: perguntas.filter((pergunta) => pergunta.resposta.trim() !== '').length }]
  })
}

/** CA-560: "2 de 3 respondidas", "1 de 3 respondida" ou "Sem respostas". */
export function resumoDoBloco(bloco: BlocoDaFicha): string {
  if (bloco.respondidas === 0) return 'Sem respostas'
  return `${bloco.respondidas} de ${bloco.perguntas.length} ${bloco.respondidas === 1 ? 'respondida' : 'respondidas'}`
}
