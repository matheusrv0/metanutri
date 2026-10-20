// Anamnese com roteiro (spec anamnese-e-prescricoes, D-160 a D-163; spec conduta-da-nutricionista, D-299).
//
// O roteiro é da conta: dez blocos fixos, com as perguntas que o nutricionista edita. As respostas são do
// paciente e ficam na ficha dele, cada uma com o texto da pergunta, para nunca se perder quando o roteiro muda.
import type { Armazenamento } from './persistencia.ts'

export const CHAVE_ROTEIRO = 'metanutri:roteiro-anamnese'

export type IdBloco =
  | 'objetivo'
  | 'rotina'
  | 'intestino'
  | 'agua'
  | 'alcool-fumo'
  | 'atividade'
  | 'preferencias'
  | 'intolerancias'
  | 'gestacao'
  | 'recordatorio'

export interface BlocoAnamnese {
  readonly id: IdBloco
  readonly titulo: string
}

/** D-160: os blocos e a ordem deles são fixos; "Intolerâncias e alergias" e "Gestação" entraram em 20/10 (D-299). */
export const BLOCOS_ANAMNESE: readonly BlocoAnamnese[] = [
  { id: 'objetivo', titulo: 'Objetivo e queixa' },
  { id: 'rotina', titulo: 'Rotina e sono' },
  { id: 'intestino', titulo: 'Intestino' },
  { id: 'agua', titulo: 'Água' },
  { id: 'alcool-fumo', titulo: 'Álcool e fumo' },
  { id: 'atividade', titulo: 'Atividade física' },
  { id: 'preferencias', titulo: 'Preferências e aversões' },
  { id: 'intolerancias', titulo: 'Intolerâncias e alergias' },
  { id: 'gestacao', titulo: 'Gestação' },
  { id: 'recordatorio', titulo: 'Recordatório de 24 horas' },
]

const IDS_BLOCO: ReadonlySet<string> = new Set(BLOCOS_ANAMNESE.map((b) => b.id))

export interface PerguntaRoteiro {
  readonly id: string
  readonly texto: string
}

export interface RoteiroAnamnese {
  readonly perguntas: Readonly<Record<IdBloco, readonly PerguntaRoteiro[]>>
  /** CA-589: blocos que esta versão não conhece, guardados como vieram e gravados de volta. */
  readonly outros: Readonly<Record<string, unknown>>
}

const p = (id: string, texto: string): PerguntaRoteiro => ({ id, texto })

/** Seção 2 da spec. Os ids são estáveis: as respostas dos pacientes apontam para eles. */
export const ROTEIRO_PADRAO: RoteiroAnamnese = {
  perguntas: {
    objetivo: [
      p('queixa', 'Queixa principal'),
      p('historico-peso', 'Histórico do peso'),
      p('dietas', 'Dietas que já fez'),
      p('suplementos-uso', 'Suplementos que já usa'),
      p('doencas-familia', 'Doenças na família'),
    ],
    rotina: [
      p('rotina-trabalho', 'Rotina de trabalho ou estudo'),
      p('refeicoes-onde', 'Quem prepara as refeições e onde come'),
      p('oleo-sal-acucar', 'Óleo, sal e açúcar por mês em casa'),
      p('sono-horario', 'Horário de dormir e de acordar'),
      p('sono-qualidade', 'Qualidade do sono'),
    ],
    intestino: [p('evacuacao', 'Frequência de evacuação'), p('fezes', 'Consistência das fezes'), p('desconforto', 'Gases, estufamento ou desconforto')],
    agua: [p('agua-dia', 'Quanta água bebe por dia'), p('cor-da-urina', 'Cor da urina'), p('outras-bebidas', 'Outras bebidas ao longo do dia')],
    'alcool-fumo': [p('alcool', 'Bebida alcoólica: o quê e quanto'), p('fumo', 'Fumo')],
    atividade: [p('atividade-tipo', 'Atividade que pratica'), p('atividade-frequencia', 'Frequência e duração'), p('atividade-horario', 'Horário')],
    preferencias: [
      p('gosta', 'Alimentos de que gosta'),
      p('nao-gosta', 'Alimentos de que não gosta'),
      p('vontades', 'Vontade de doce ou salgado'),
      p('apetite', 'Apetite e mastigação'),
    ],
    intolerancias: [p('intolerancias-alimentares', 'Intolerâncias alimentares'), p('alergias-alimentares', 'Alergias alimentares')],
    gestacao: [p('gestacao-trimestre', 'Trimestre'), p('gestacao-anotacoes', 'Anotações da gestação')],
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
  outros: {},
}

/** Dicas embaixo do rótulo, pelo id da pergunta (seção 2). Num `Map`, um id como "constructor" não acha nada. */
const DICAS: ReadonlyMap<string, string> = new Map([
  ['fezes', 'Escala de Bristol: de 1 (bolinhas duras) a 7 (líquida); 3 e 4 são o esperado.'],
  ['cor-da-urina', 'Escala de Armstrong: de 1 (quase transparente) a 8 (marrom); de 1 a 3, boa hidratação.'],
  ['alergias-alimentares', 'Para o cobrir não sugerir o alimento, escreva-o também em Restrições e saúde.'],
])

export const dicaDaPergunta = (id: string): string | undefined => DICAS.get(id)

// ---------- Perguntas de escolha (spec conduta-da-nutricionista, D-299) ----------

/** Como a pergunta se responde. O tipo vem do id: renomear a pergunta não muda o tipo. */
export type TipoPergunta = 'texto' | 'cor-da-urina' | 'trimestre'

const TIPOS: ReadonlyMap<string, TipoPergunta> = new Map([
  ['cor-da-urina', 'cor-da-urina'],
  ['gestacao-trimestre', 'trimestre'],
])

export const tipoDaPergunta = (id: string): TipoPergunta => TIPOS.get(id) ?? 'texto'

/** A escala de 8 cores de Armstrong, da urina mais clara à mais escura (seção 1.1 da spec). */
export const ESCALA_DA_URINA: readonly { readonly numero: number; readonly nome: string }[] = [
  { numero: 1, nome: 'Quase transparente' },
  { numero: 2, nome: 'Amarelo muito claro' },
  { numero: 3, nome: 'Amarelo-claro' },
  { numero: 4, nome: 'Amarelo' },
  { numero: 5, nome: 'Amarelo-escuro' },
  { numero: 6, nome: 'Âmbar' },
  { numero: 7, nome: 'Âmbar-escuro' },
  { numero: 8, nome: 'Marrom' },
]

/** A resposta como fica na ficha: legível sem o app ("3 · Amarelo-claro"). */
export function respostaDaUrina(numero: number): string {
  const cor = ESCALA_DA_URINA.find((c) => c.numero === numero)
  return cor ? `${cor.numero} · ${cor.nome}` : ''
}

/** O número da escala numa resposta guardada; `null` quando ela não é da escala (CB-297: texto de versão antiga). */
export function numeroDaUrina(resposta: string): number | null {
  const achado = /^([1-8]) · /.exec(resposta.trim())
  return achado ? Number(achado[1]) : null
}

/** As respostas do trimestre, na ordem da tela. */
export const TRIMESTRES: readonly string[] = ['Não gestante', '1º trimestre', '2º trimestre', '3º trimestre']

// ---------- O roteiro guardado ----------

/**
 * A versão do roteiro padrão. A 2 trouxe a "Cor da urina" na Água (D-299): o roteiro salvo antes a recebe uma vez só,
 * ao ser lido; salvo de novo, ele leva a versão, e tirar a pergunta passa a valer.
 */
const VERSAO_DO_ROTEIRO = 2

const PERGUNTAS_NOVAS: readonly { readonly versao: number; readonly bloco: IdBloco; readonly pergunta: PerguntaRoteiro; readonly depoisDe: string }[] = [
  { versao: 2, bloco: 'agua', pergunta: p('cor-da-urina', 'Cor da urina'), depoisDe: 'agua-dia' },
]

/** CA-936: acrescenta ao roteiro salvo antes as perguntas das versões que ele não conhecia, sem mexer nas edições. */
function comPerguntasNovas(
  perguntas: Record<IdBloco, readonly PerguntaRoteiro[]>,
  fonte: Readonly<Record<string, unknown>>,
  versaoGuardada: number,
): Record<IdBloco, readonly PerguntaRoteiro[]> {
  const resultado = { ...perguntas }
  for (const nova of PERGUNTAS_NOVAS) {
    // Bloco que faltava já veio do padrão, com a pergunta nova.
    if (nova.versao <= versaoGuardada || !Object.hasOwn(fonte, nova.bloco)) continue
    if (BLOCOS_ANAMNESE.some(({ id }) => resultado[id].some((q) => q.id === nova.pergunta.id))) continue
    const lista = resultado[nova.bloco]
    const depois = lista.findIndex((q) => q.id === nova.depoisDe)
    resultado[nova.bloco] = depois < 0 ? [...lista, nova.pergunta] : [...lista.slice(0, depois + 1), nova.pergunta, ...lista.slice(depois + 1)]
  }
  return resultado
}

/**
 * O roteiro como o app usa: os blocos conhecidos, na ordem deles (CB-162). Bloco que falta usa o padrão;
 * bloco esvaziado de propósito continua vazio. Pergunta sem texto sai (CB-161), e o id vale uma vez só. Bloco
 * desconhecido vai para `outros`, como veio (CA-589). `Object.fromEntries` cria chave própria até para
 * `__proto__`: o dado de fora não mexe no protótipo.
 */
function normalizarRoteiro(blocos: unknown, versaoGuardada: number = VERSAO_DO_ROTEIRO): RoteiroAnamnese {
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
  return {
    perguntas: comPerguntasNovas(perguntas, fonte, versaoGuardada),
    outros: Object.fromEntries(Object.entries(fonte).filter(([id]) => !IDS_BLOCO.has(id))),
  }
}

/** O roteiro editado como fica depois de salvo: sem pergunta vazia e sem id repetido (CB-161). */
export const limparRoteiro = (roteiro: RoteiroAnamnese): RoteiroAnamnese => ({ ...normalizarRoteiro(roteiro.perguntas), outros: roteiro.outros })

/** O roteiro da conta. Sem armazenamento, sem nada guardado ou com dado que não se lê, o padrão (CB-160, CB-162). */
export function lerRoteiro(armazenamento: Armazenamento | null): RoteiroAnamnese {
  if (!armazenamento) return ROTEIRO_PADRAO
  try {
    const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE_ROTEIRO) ?? 'null')
    if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) return ROTEIRO_PADRAO
    const { blocos, versao } = bruto as Record<string, unknown>
    // Sem versão: roteiro salvo antes da versão 2 (ou por uma versão antiga do app, CB-296).
    return normalizarRoteiro(blocos, typeof versao === 'number' ? versao : 1)
  } catch {
    return ROTEIRO_PADRAO
  }
}

/** `false` quando o aparelho não guardou: o roteiro vale só até fechar a página (CB-160). */
export function gravarRoteiro(armazenamento: Armazenamento | null, roteiro: RoteiroAnamnese): boolean {
  if (!armazenamento) return false
  try {
    armazenamento.setItem(
      CHAVE_ROTEIRO,
      JSON.stringify({ formato: 1, versao: VERSAO_DO_ROTEIRO, blocos: { ...roteiro.outros, ...normalizarRoteiro(roteiro.perguntas).perguntas } }),
    )
    return true
  } catch {
    return false
  }
}

// ---------- Editar o roteiro (CA-565) ----------

const comBloco = (roteiro: RoteiroAnamnese, bloco: IdBloco, perguntas: readonly PerguntaRoteiro[]): RoteiroAnamnese => ({
  ...roteiro,
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
  /** Um dos blocos de `BLOCOS_ANAMNESE`; outro valor (de uma versão mais nova) fica guardado e não aparece (CA-589). */
  readonly blocoId: string
  /** O texto da pergunta quando foi respondida: é o que aparece se ela sair do roteiro (CA-568). */
  readonly pergunta: string
  readonly resposta: string
}

/**
 * CA-588: o que não é lista vira lista vazia; resposta estragada sai; o id vale uma vez só. CA-589: resposta de bloco
 * desconhecido e campo a mais ficam guardados; só a ficha os deixa de fora.
 */
export function normalizarRespostas(valor: unknown): RespostaAnamnese[] {
  if (!Array.isArray(valor)) return []
  const vistos = new Set<string>()
  return valor.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null) return []
    const o = item as Record<string, unknown>
    const { perguntaId, blocoId, pergunta, resposta } = o
    if (typeof perguntaId !== 'string' || typeof blocoId !== 'string' || typeof pergunta !== 'string' || typeof resposta !== 'string') return []
    if (vistos.has(perguntaId)) return []
    vistos.add(perguntaId)
    return [{ ...o, perguntaId, blocoId, pergunta, resposta }]
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
      .filter((r) => r.blocoId === id && !noRoteiro.has(r.perguntaId) && r.resposta.trim() !== '')
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
