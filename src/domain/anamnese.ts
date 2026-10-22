// Anamnese com roteiro (spec anamnese-e-prescricoes, D-160 a D-163; spec conduta-da-nutricionista, D-299; spec
// ficha-unica, D-347 a D-350).
//
// O roteiro é da conta: os blocos na ordem do Processo de Cuidado em Nutrição, com as perguntas que o nutricionista
// edita. As respostas são do paciente e ficam na ficha dele, cada uma com o texto da pergunta, para nunca se perder
// quando o roteiro muda. Os campos fixos da ficha (objetivo, doenças, restrições, exames…) não são do roteiro.
import type { Armazenamento } from './persistencia.ts'
import { aplicaRegra, avisoForaDaRegra, menorDe18, type PerfilDaFicha, type RegraDoBloco } from './regrasDaFicha.ts'

export const CHAVE_ROTEIRO = 'metanutri:roteiro-anamnese'

export type IdBloco =
  | 'retorno'
  | 'motivo'
  | 'saude'
  | 'gestacao'
  | 'lactacao'
  | 'saude-mulher'
  | 'digestao'
  | 'rotina'
  | 'atividade'
  | 'agua'
  | 'alcool-fumo'
  | 'alimentacao'
  | 'infancia'
  | 'idoso'
  | 'recordatorio'

export interface BlocoAnamnese {
  readonly id: IdBloco
  readonly titulo: string
  /** Para quem o bloco vale (spec ficha-unica, seção 3); sem regra, para todos. */
  readonly regra?: RegraDoBloco
}

/** D-347: a ordem do PCN; o Retorno vem antes de todos. Exames recentes e Outras anotações são da ficha. */
export const BLOCOS_ANAMNESE: readonly BlocoAnamnese[] = [
  { id: 'retorno', titulo: 'Retorno', regra: 'retorno' },
  { id: 'motivo', titulo: 'Motivo da consulta' },
  { id: 'saude', titulo: 'Saúde' },
  { id: 'gestacao', titulo: 'Gestação', regra: 'gestante' },
  { id: 'lactacao', titulo: 'Lactação', regra: 'lactante' },
  { id: 'saude-mulher', titulo: 'Saúde da mulher', regra: 'saude-mulher' },
  { id: 'digestao', titulo: 'Digestão' },
  { id: 'rotina', titulo: 'Rotina e sono' },
  // D-458: a equação do NASEM de 1 e 2 anos não usa atividade, e "prática de exercício" não se pergunta a quem tem 2 anos.
  { id: 'atividade', titulo: 'Atividade física', regra: 'a-partir-de-3' },
  { id: 'agua', titulo: 'Hidratação' },
  { id: 'alcool-fumo', titulo: 'Álcool e tabagismo', regra: 'a-partir-de-12' },
  { id: 'alimentacao', titulo: 'Alimentação' },
  { id: 'infancia', titulo: 'Infância', regra: 'infancia' },
  { id: 'idoso', titulo: 'Pessoa idosa', regra: 'idoso' },
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

/** Seção 2 da spec ficha-unica (versão 3). Os ids são estáveis: as respostas dos pacientes apontam para eles. */
export const ROTEIRO_PADRAO: RoteiroAnamnese = {
  perguntas: {
    retorno: [
      p('retorno-seguir', 'Seguir o plano'),
      p('retorno-ajudou', 'O que ajudou e o que atrapalhou'),
      p('retorno-mudancas', 'Mudanças desde a última consulta'),
      p('retorno-sintomas', 'Sintomas novos'),
      p('retorno-recordatorio', 'Recordatório de hoje'),
    ],
    motivo: [p('queixa', 'Queixa principal'), p('historico-peso', 'Histórico do peso'), p('dietas', 'Dietas que já fez')],
    saude: [p('suplementos-uso', 'Suplementos em uso'), p('cirurgias', 'Cirurgias e internações'), p('doencas-familia', 'Doenças na família')],
    gestacao: [p('gestacao-enjoo', 'Náusea ou vômito'), p('gestacao-desejos', 'Desejos'), p('gestacao-intercorrencias', 'Diabetes gestacional ou pressão alta')],
    lactacao: [p('lactacao-mamadas', 'Mamadas por dia'), p('lactacao-dificuldades', 'Dificuldades na amamentação')],
    'saude-mulher': [p('menstruacao', 'Menstruação'), p('fluxo-intenso', 'Fluxo menstrual intenso'), p('hormonios', 'Anticoncepcional ou reposição hormonal')],
    digestao: [
      p('evacuacao', 'Frequência de evacuação'),
      p('fezes', 'Consistência das fezes'),
      p('desconforto', 'Gases, estufamento ou azia'),
      p('apetite', 'Apetite'),
      p('mastigacao', 'Mastigação e deglutição'),
    ],
    rotina: [
      p('rotina-trabalho', 'Rotina de trabalho ou estudo'),
      p('sono-horario', 'Horário de dormir e de acordar'),
      p('sono-qualidade', 'Qualidade do sono'),
      p('tempo-de-tela', 'Tempo de tela por dia'),
    ],
    atividade: [
      p('atividade-pratica', 'Prática de exercício'),
      p('atividade-tipo', 'Tipo de atividade'),
      p('atividade-vezes', 'Vezes por semana'),
      p('atividade-minutos', 'Minutos por vez'),
      p('atividade-horario', 'Horário do exercício'),
    ],
    agua: [p('agua-dia', 'Água por dia'), p('cor-da-urina', 'Cor da urina'), p('outras-bebidas', 'Outras bebidas')],
    'alcool-fumo': [p('alcool', 'Álcool'), p('fumo', 'Tabagismo')],
    alimentacao: [
      p('gosta', 'Alimentos de que gosta'),
      p('nao-gosta', 'Alimentos de que não gosta'),
      p('vontades', 'Vontade de doce ou salgado'),
      p('refeicoes-onde', 'Quem prepara as refeições e onde come'),
    ],
    infancia: [
      p('aleitamento', 'Aleitamento materno'),
      p('introducao-alimentar', 'Introdução alimentar'),
      p('lanche-escola', 'Lanche e merenda da escola'),
      p('variedade', 'Variedade de alimentos'),
    ],
    // D-454: "Com quem mora" saiu; repetia "Pessoas que moram na casa", e quem cozinha está em Alimentação.
    idoso: [p('perda-de-peso', 'Perda de peso sem querer'), p('quedas', 'Quedas')],
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

// ---------- Dicas e tipos de pergunta ----------

/** Dicas embaixo do rótulo, pelo id da pergunta (seção 2). Num `Map`, um id como "constructor" não acha nada. */
const DICAS: ReadonlyMap<string, string> = new Map([
  ['retorno-mudancas', 'Saúde, remédios, suplementos e rotina.'],
  ['historico-peso', 'Peso habitual, maior e menor peso na vida adulta.'],
  ['suplementos-uso', 'O que o paciente já toma. A suplementação que você prescreve fica em Conduta.'],
  ['gestacao-desejos', 'Inclusive de algo que não é alimento, como gelo ou terra.'],
  ['evacuacao', 'Quantas vezes por semana.'],
  ['fezes', 'Escala de Bristol: de 1 (bolinhas duras) a 7 (líquida); 3 e 4 são o esperado.'],
  ['agua-dia', 'Em copos ou litros.'],
  ['cor-da-urina', 'Escala de Armstrong: de 1 (quase incolor) a 8 (marrom); de 1 a 3, boa hidratação.'],
  ['outras-bebidas', 'Refrigerante, suco, café, chá.'],
  ['alcool', 'O que bebe, quanto e quantas vezes por semana.'],
  ['fumo', 'Cigarro comum ou eletrônico e quanto por dia.'],
  ['aleitamento', 'Até quando mamou no peito.'],
  ['variedade', 'Se come poucos alimentos ou recusa grupos inteiros.'],
  ['perda-de-peso', 'Nos últimos 3 meses.'],
  ['quedas', 'No último ano.'],
])

/** A idade da pessoa, quando a ficha sabe; `null` sem perfil ou sem data de nascimento. */
const idadeDe = (perfil: PerfilDaFicha | null): number | null => perfil?.idadeAnos ?? null

/** A dica da pergunta; algumas mudam com a pessoa (spec ficha-unica, D-363, seção 2 e D-452). */
export function dicaDaPergunta(id: string, perfil: PerfilDaFicha | null = null): string | undefined {
  const fixa = DICAS.get(id)
  const idade = idadeDe(perfil)
  if (id === 'suplementos-uso' && perfil?.momento === 'gestante') return `${fixa ?? ''} Na gestação, anote ferro e ácido fólico.`
  if (id === 'mastigacao' && idade !== null && idade >= 60) return 'Prótese, dificuldade para mastigar ou engasgos.'
  // D-452: abaixo de 18 anos não há "vida adulta": a criança e o adolescente têm o histórico do crescimento.
  if (id === 'historico-peso' && idade !== null && idade < 18) return 'Peso ao nascer e como o peso e a estatura vêm mudando (caderneta de saúde).'
  return fixa
}

/** Como a pergunta se responde. O tipo vem do id: renomear a pergunta não muda o tipo. */
export type TipoPergunta = 'texto' | 'cor-da-urina' | 'escolha' | 'numero'

const ESCOLHAS: ReadonlyMap<string, readonly string[]> = new Map([
  ['retorno-seguir', ['Fácil', 'Médio', 'Difícil']],
  ['menstruacao', ['Regular', 'Irregular', 'Não menstrua', 'Menopausa']],
  ['fluxo-intenso', ['Sim', 'Não']],
  ['atividade-pratica', ['Sim', 'Não']],
  // A escala de Bristol, com o número e o nome, como a da urina (seção 2).
  [
    'fezes',
    ['1 · Bolinhas duras', '2 · Salsicha encaroçada', '3 · Salsicha com rachaduras', '4 · Salsicha lisa e macia', '5 · Pedaços macios', '6 · Pastosa', '7 · Líquida'],
  ],
])

const NUMEROS: ReadonlySet<string> = new Set(['atividade-vezes', 'atividade-minutos'])

export function tipoDaPergunta(id: string): TipoPergunta {
  if (id === 'cor-da-urina') return 'cor-da-urina'
  if (ESCOLHAS.has(id)) return 'escolha'
  if (NUMEROS.has(id)) return 'numero'
  return 'texto'
}

// D-453: antes dos 40 anos a parada da menstruação é insuficiência ovariana prematura (vai em Outros diagnósticos), e
// depois dos 55 a menopausa já é tardia: as opções acompanham a idade.
const MENOPAUSA = 'Menopausa'
const AINDA_MENSTRUA = 'Ainda menstrua'
const NAO_MENSTRUA = 'Não menstrua'
const MENSTRUACAO_ANTES_DOS_40: readonly string[] = ['Regular', 'Irregular', NAO_MENSTRUA]
const MENSTRUACAO_DE_56_EM_DIANTE: readonly string[] = [MENOPAUSA, AINDA_MENSTRUA]

/** As opções de uma pergunta de escolha, na ordem da tela; a menstruação muda com a idade (D-453). */
export function opcoesDaPergunta(id: string, perfil: PerfilDaFicha | null = null): readonly string[] {
  const idade = idadeDe(perfil)
  if (id === 'menstruacao' && idade !== null) {
    if (idade < 40) return MENSTRUACAO_ANTES_DOS_40
    if (idade >= 56) return MENSTRUACAO_DE_56_EM_DIANTE
  }
  return ESCOLHAS.get(id) ?? []
}

/** D-453: a menopausa marcada, ou 56 anos ou mais sem "Ainda menstrua". */
function depoisDaMenopausa(perfil: PerfilDaFicha, respostas: ReadonlyMap<string, RespostaAnamnese>): boolean {
  const menstruacao = respostas.get('menstruacao')?.resposta.trim() ?? ''
  const idade = idadeDe(perfil)
  return menstruacao === MENOPAUSA || (idade !== null && idade >= 56 && menstruacao !== AINDA_MENSTRUA)
}

/** A escala de 8 cores de Armstrong, da urina mais clara à mais escura (seção 1.1 da spec da conduta). */
export const ESCALA_DA_URINA: readonly { readonly numero: number; readonly nome: string }[] = [
  { numero: 1, nome: 'Quase incolor' },
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

/** A resposta "Não gestante" do Trimestre antigo: não segura o bloco Gestação (D-348). */
const RESPOSTA_SEM_INFORMACAO = (perguntaId: string, resposta: string) => perguntaId === 'gestacao-trimestre' && resposta.trim() === 'Não gestante'

// ---------- O roteiro guardado ----------

/**
 * A versão do roteiro padrão. A 2 trouxe a "Cor da urina" (spec conduta-da-nutricionista, D-299); a 3 trouxe os blocos
 * da ficha única (D-347), e o roteiro salvo antes passa por `daVersao2`.
 */
const VERSAO_DO_ROTEIRO = 3

/** O roteiro padrão da versão 2, para saber o que a conta editou antes (D-350). */
const BLOCOS_V2 = ['objetivo', 'rotina', 'intestino', 'agua', 'alcool-fumo', 'atividade', 'preferencias', 'intolerancias', 'gestacao', 'recordatorio'] as const
type IdBlocoV2 = (typeof BLOCOS_V2)[number]

const PADRAO_V2: Readonly<Record<IdBlocoV2, readonly PerguntaRoteiro[]>> = {
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
}

/** D-350: o bloco novo de cada bloco antigo. */
const BLOCO_NOVO: Readonly<Record<IdBlocoV2, IdBloco>> = {
  objetivo: 'motivo',
  rotina: 'rotina',
  intestino: 'digestao',
  agua: 'agua',
  'alcool-fumo': 'alcool-fumo',
  atividade: 'atividade',
  preferencias: 'alimentacao',
  intolerancias: 'alimentacao',
  gestacao: 'gestacao',
  recordatorio: 'recordatorio',
}

/** Viraram campo da ficha ou escolha: saem do roteiro mesmo renomeadas (D-350). */
const SUBSTITUIDAS: ReadonlySet<string> = new Set(['intolerancias-alimentares', 'alergias-alimentares', 'gestacao-trimestre', 'oleo-sal-acucar', 'atividade-frequencia'])
/** Saem do padrão; ficam só quando a conta as renomeou. */
const SAEM_SE_NAO_RENOMEADAS: ReadonlySet<string> = new Set(['gestacao-anotacoes'])
/** Onde a resposta de uma pergunta que saiu aparece (o bloco do campo da ficha que a substitui). */
const BLOCO_DA_RESPOSTA_ANTIGA: ReadonlyMap<string, IdBloco> = new Map([['oleo-sal-acucar', 'alimentacao']])

const PADRAO_V2_POR_ID: ReadonlyMap<string, PerguntaRoteiro> = new Map(BLOCOS_V2.flatMap((b) => PADRAO_V2[b].map((q) => [q.id, q] as const)))
const BLOCO_PADRAO_V3: ReadonlyMap<string, IdBloco> = new Map(BLOCOS_ANAMNESE.flatMap((b) => ROTEIRO_PADRAO.perguntas[b.id].map((q) => [q.id, b.id] as const)))

/** As perguntas válidas de um bloco guardado: id em texto, texto não vazio, id ainda não visto (CB-161). */
function perguntasValidas(lista: unknown, vistos: Set<string>): PerguntaRoteiro[] {
  if (!Array.isArray(lista)) return []
  return lista.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null) return []
    const { id: idPergunta, texto } = item as Record<string, unknown>
    if (typeof idPergunta !== 'string' || idPergunta === '' || typeof texto !== 'string' || texto.trim() === '' || vistos.has(idPergunta)) return []
    vistos.add(idPergunta)
    return [{ id: idPergunta, texto: texto.trim() }]
  })
}

/**
 * D-350: o roteiro salvo na versão 1 ou 2 vira o da versão 3. Pergunta própria continua, no bloco novo do antigo;
 * padrão renomeada mantém o texto; padrão tirada continua fora; as substituídas saem.
 */
function daVersao2(fonte: Readonly<Record<string, unknown>>, versaoGuardada: number): Record<IdBloco, readonly PerguntaRoteiro[]> {
  const perguntas = Object.fromEntries(BLOCOS_ANAMNESE.map(({ id }) => [id, [...ROTEIRO_PADRAO.perguntas[id]]])) as Record<IdBloco, PerguntaRoteiro[]>
  const tirar = (id: string) => {
    for (const bloco of BLOCOS_ANAMNESE) perguntas[bloco.id] = perguntas[bloco.id].filter((q) => q.id !== id)
  }
  const renomear = (id: string, texto: string) => {
    for (const bloco of BLOCOS_ANAMNESE) perguntas[bloco.id] = perguntas[bloco.id].map((q) => (q.id === id ? { id, texto } : q))
  }
  const existe = (id: string) => BLOCOS_ANAMNESE.some((b) => perguntas[b.id].some((q) => q.id === id))
  const vistos = new Set<string>()
  for (const antigo of BLOCOS_V2) {
    // Bloco que não estava guardado (o roteiro é de antes dele) não tira nada.
    if (!Object.hasOwn(fonte, antigo)) continue
    const salvas = perguntasValidas(fonte[antigo], vistos)
    for (const padrao of PADRAO_V2[antigo]) {
      // A cor da urina entrou na versão 2: ausente de um roteiro de antes não foi tirada pela conta.
      if (padrao.id === 'cor-da-urina' && versaoGuardada < 2) continue
      if (!salvas.some((q) => q.id === padrao.id) && BLOCO_PADRAO_V3.has(padrao.id)) tirar(padrao.id)
    }
    for (const salva of salvas) {
      const padrao = PADRAO_V2_POR_ID.get(salva.id)
      if (padrao && SUBSTITUIDAS.has(salva.id)) continue
      if (padrao && BLOCO_PADRAO_V3.has(salva.id)) {
        if (salva.texto !== padrao.texto) renomear(salva.id, salva.texto)
        continue
      }
      if (padrao && SAEM_SE_NAO_RENOMEADAS.has(salva.id) && salva.texto === padrao.texto) continue
      const destino = BLOCO_NOVO[antigo]
      if (!existe(salva.id)) perguntas[destino] = [...perguntas[destino], salva]
    }
  }
  return perguntas
}

/** Saíram do padrão da versão 3 depois de publicada (D-454): saem do roteiro guardado com o texto padrão. */
const RETIRADAS_DA_V3: ReadonlyMap<string, string> = new Map([['mora-com', 'Com quem mora']])
const retirada = (q: PerguntaRoteiro) => RETIRADAS_DA_V3.get(q.id) === q.texto

const BLOCOS_SO_DA_V3: readonly string[] = BLOCOS_ANAMNESE.map((b) => b.id).filter((id) => !(BLOCOS_V2 as readonly string[]).includes(id))
const BLOCOS_SO_DA_V2: readonly IdBlocoV2[] = BLOCOS_V2.filter((id) => !IDS_BLOCO.has(id))

/**
 * D-465: no roteiro da versão 3 regravado por uma versão antiga, a pergunta própria que uma aba antiga criou num bloco
 * que só a versão 2 tem ("Objetivo e queixa", "Intestino", "Preferências e aversões", "Intolerâncias e alergias") vai
 * para o bloco novo dele e sai do bloco antigo guardado, para não voltar depois de tirada. As padrão da versão 2 ficam.
 */
function trazerDosBlocosDaV2(
  fonte: Readonly<Record<string, unknown>>,
  perguntas: Record<IdBloco, readonly PerguntaRoteiro[]>,
  vistos: Set<string>,
): Record<string, unknown> {
  const outros: Record<string, unknown> = Object.fromEntries(Object.entries(fonte).filter(([id]) => !IDS_BLOCO.has(id)))
  for (const antigo of BLOCOS_SO_DA_V2) {
    const lista = fonte[antigo]
    if (!Object.hasOwn(fonte, antigo) || !Array.isArray(lista)) continue
    const trazidas = new Set<string>()
    for (const q of perguntasValidas(lista, new Set())) {
      if (PADRAO_V2_POR_ID.has(q.id) || vistos.has(q.id)) continue
      vistos.add(q.id)
      trazidas.add(q.id)
      const destino = BLOCO_NOVO[antigo]
      perguntas[destino] = [...perguntas[destino], q]
    }
    if (trazidas.size > 0) {
      outros[antigo] = lista.filter((item: unknown) => {
        const id = typeof item === 'object' && item !== null ? (item as Record<string, unknown>)['id'] : undefined
        return typeof id !== 'string' || !trazidas.has(id)
      })
    }
  }
  return outros
}

/**
 * O roteiro como o app usa: os blocos conhecidos, na ordem deles (CB-162). Bloco que falta usa o padrão; bloco
 * esvaziado de propósito continua vazio. Pergunta sem texto sai (CB-161), e o id vale uma vez só. Bloco desconhecido
 * vai para `outros`, como veio (CA-589). `Object.fromEntries` cria chave própria até para `__proto__`.
 */
function normalizarRoteiro(blocos: unknown, versaoGuardada: number = VERSAO_DO_ROTEIRO): RoteiroAnamnese {
  const fonte = typeof blocos === 'object' && blocos !== null && !Array.isArray(blocos) ? (blocos as Record<string, unknown>) : {}
  // CB-348: um roteiro da versão 3 salvo de novo por uma versão antiga volta sem versão, mas com os blocos novos.
  const ehV3 = versaoGuardada >= 3 || BLOCOS_SO_DA_V3.some((id) => Object.hasOwn(fonte, id))
  if (ehV3) {
    const vistos = new Set<string>()
    const perguntas = {} as Record<IdBloco, readonly PerguntaRoteiro[]>
    for (const { id } of BLOCOS_ANAMNESE) {
      const lista = Object.hasOwn(fonte, id) ? fonte[id] : ROTEIRO_PADRAO.perguntas[id]
      perguntas[id] = perguntasValidas(Array.isArray(lista) ? lista : ROTEIRO_PADRAO.perguntas[id], vistos).filter((q) => !retirada(q))
    }
    return { perguntas, outros: trazerDosBlocosDaV2(fonte, perguntas, vistos) }
  }
  const conhecidos = new Set<string>([...IDS_BLOCO, ...BLOCOS_V2])
  return { perguntas: daVersao2(fonte, versaoGuardada), outros: Object.fromEntries(Object.entries(fonte).filter(([id]) => !conhecidos.has(id))) }
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
  /** Um dos blocos de `BLOCOS_ANAMNESE` (ou um da versão 2, que aparece no bloco novo); outro fica guardado e não aparece (CA-589). */
  readonly blocoId: string
  /** O texto da pergunta quando foi respondida: é o que aparece se ela sair do roteiro (CA-568). */
  readonly pergunta: string
  readonly resposta: string
  /** O dia da última resposta, AAAA-MM-DD (spec ficha-unica, D-358); resposta de antes não tem. */
  readonly respondidaEm?: string
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

/** CA-561: grava a resposta (com o texto atual da pergunta e o dia). Resposta só com espaço sai da ficha. */
export function responder(
  respostas: readonly RespostaAnamnese[],
  pergunta: PerguntaRoteiro,
  blocoId: IdBloco,
  resposta: string,
  dia: string | null = null,
): RespostaAnamnese[] {
  if (resposta.trim() === '') return respostas.filter((r) => r.perguntaId !== pergunta.id)
  const nova: RespostaAnamnese = { perguntaId: pergunta.id, blocoId, pergunta: pergunta.texto, resposta, ...(dia ? { respondidaEm: dia } : {}) }
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
  /** Bloco à vista fora da regra, porque tem resposta (D-348); `null` dentro da regra. */
  readonly aviso: string | null
  /** O dia da resposta mais recente do bloco (D-358); `null` quando nenhuma tem data. */
  readonly ultimaResposta: string | null
}

/** O bloco em que a resposta aparece quando a pergunta dela não está no roteiro. */
function blocoDaResposta(r: RespostaAnamnese): string {
  return BLOCO_PADRAO_V3.get(r.perguntaId) ?? BLOCO_DA_RESPOSTA_ANTIGA.get(r.perguntaId) ?? (BLOCO_NOVO as Readonly<Record<string, IdBloco>>)[r.blocoId] ?? r.blocoId
}

/** Pergunta que só vale para parte das pessoas, dentro de um bloco de todos (seção 2 e tabela 10.2). */
function perguntaAparece(id: string, perfil: PerfilDaFicha | null, respostas: ReadonlyMap<string, RespostaAnamnese>): boolean {
  if (perfil === null) return true
  const idade = idadeDe(perfil)
  if (id === 'tempo-de-tela') return menorDe18(perfil)
  // D-452: criança não faz dieta por conta própria; a restrição da família vai em Alimentação.
  if (id === 'dietas') return idade === null || idade >= 12
  // D-453: o fluxo é de quem menstrua; o anticoncepcional, da idade fértil (R1 começa aos 14).
  if (id === 'fluxo-intenso') return respostas.get('menstruacao')?.resposta.trim() !== NAO_MENSTRUA && !depoisDaMenopausa(perfil, respostas)
  if (id === 'hormonios') return idade === null || idade >= 14
  // D-356: com "Não" em Prática de exercício, as outras perguntas da atividade não se aplicam.
  if (id.startsWith('atividade-') && id !== 'atividade-pratica') return respostas.get('atividade-pratica')?.resposta.trim() !== 'Não'
  return true
}

const TEXTO_PADRAO: ReadonlyMap<string, string> = new Map(BLOCOS_ANAMNESE.flatMap((b) => ROTEIRO_PADRAO.perguntas[b.id].map((q) => [q.id, q.texto] as const)))

/**
 * O texto da pergunta para a pessoa (D-453, D-458): o padrão muda com ela; o renomeado pela conta fica como a conta escreveu.
 */
function textoParaAPessoa(pergunta: PerguntaRoteiro, perfil: PerfilDaFicha | null, respostas: ReadonlyMap<string, RespostaAnamnese>): string {
  if (perfil === null || TEXTO_PADRAO.get(pergunta.id) !== pergunta.texto) return pergunta.texto
  if (pergunta.id === 'hormonios' && depoisDaMenopausa(perfil, respostas)) return 'Reposição hormonal'
  // D-458: abaixo de 14 anos não há trabalho; a rotina é a da escola. D-488 (correção C): até 5 anos, da creche ou da escola.
  const idade = idadeDe(perfil)
  if (pergunta.id === 'rotina-trabalho' && idade !== null && idade < 14) return idade < 6 ? 'Rotina da creche ou da escola' : 'Rotina da escola'
  return pergunta.texto
}

/**
 * Os blocos como a ficha mostra: as perguntas do roteiro com a resposta, depois as respostas cuja pergunta saiu do
 * roteiro. Bloco sem nada para mostrar some (CB-161). Com o perfil, o bloco fora da regra some, a não ser que tenha
 * resposta: aí fica, com o aviso (D-348). Sem perfil (`null`), todos os blocos aparecem. Os blocos de `comCampos`
 * têm campos da ficha (D-349): não somem por estar sem pergunta.
 */
export function blocosDaFicha(
  roteiro: RoteiroAnamnese,
  respostas: readonly RespostaAnamnese[],
  perfil: PerfilDaFicha | null,
  comCampos: ReadonlySet<IdBloco> = new Set(),
): BlocoDaFicha[] {
  const porId = new Map(respostas.map((r) => [r.perguntaId, r]))
  const noRoteiro = new Set(BLOCOS_ANAMNESE.flatMap((b) => roteiro.perguntas[b.id].map((pergunta) => pergunta.id)))
  const comResposta = (id: string) => (porId.get(id)?.resposta.trim() ?? '') !== ''
  return BLOCOS_ANAMNESE.flatMap(({ id, titulo, regra }) => {
    const doRoteiro = roteiro.perguntas[id]
      .filter((pergunta) => comResposta(pergunta.id) || perguntaAparece(pergunta.id, perfil, porId))
      .map((pergunta) => ({ id: pergunta.id, texto: textoParaAPessoa(pergunta, perfil, porId), resposta: porId.get(pergunta.id)?.resposta ?? '', foraDoRoteiro: false }))
    const fora = respostas
      .filter((r) => blocoDaResposta(r) === id && !noRoteiro.has(r.perguntaId) && r.resposta.trim() !== '')
      .map((r) => ({ id: r.perguntaId, texto: r.pergunta, resposta: r.resposta, foraDoRoteiro: true }))
    const perguntas = [...doRoteiro, ...fora]
    if (perguntas.length === 0 && !comCampos.has(id)) return []
    const temDado = perguntas.some((q) => q.resposta.trim() !== '' && !RESPOSTA_SEM_INFORMACAO(q.id, q.resposta))
    const dentro = perfil === null || regra === undefined || aplicaRegra(regra, perfil)
    if (!dentro && !temDado) return []
    const datas = perguntas.flatMap((q) => {
      const dia = porId.get(q.id)?.respondidaEm
      return q.resposta.trim() !== '' && typeof dia === 'string' ? [dia] : []
    })
    return [
      {
        id,
        titulo,
        perguntas,
        respondidas: perguntas.filter((pergunta) => pergunta.resposta.trim() !== '').length,
        aviso: dentro || regra === undefined || perfil === null ? null : avisoForaDaRegra(regra, perfil),
        ultimaResposta: datas.sort().at(-1) ?? null,
      },
    ]
  })
}

/** Os campos da ficha contados no resumo do bloco (D-349). */
export interface CamposDoBloco {
  readonly total: number
  readonly preenchidos: number
}

const dataCurta = (dia: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dia)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

/** CA-560 e CA-1065: "2 de 3 respondidas", "1 de 3 respondida" ou "Sem respostas", e a data da última resposta. */
export function resumoDoBloco(bloco: Pick<BlocoDaFicha, 'perguntas' | 'respondidas' | 'ultimaResposta'>, campos: CamposDoBloco = { total: 0, preenchidos: 0 }): string {
  const respondidas = bloco.respondidas + campos.preenchidos
  const total = bloco.perguntas.length + campos.total
  if (respondidas === 0) return 'Sem respostas'
  const contagem = `${respondidas} de ${total} ${respondidas === 1 ? 'respondida' : 'respondidas'}`
  return bloco.ultimaResposta ? `${contagem} · ${dataCurta(bloco.ultimaResposta)}` : contagem
}

/** Os blocos do roteiro com regra, para a etiqueta na janela "Editar roteiro" (CA-1060). */
export const regraDoBloco = (id: IdBloco): RegraDoBloco | undefined => BLOCOS_ANAMNESE.find((b) => b.id === id)?.regra
