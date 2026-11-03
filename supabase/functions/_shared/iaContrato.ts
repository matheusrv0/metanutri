// O contrato da função sugerir-plano (spec assistente-ia): o pedido que o navegador manda, limpo de novo aqui por
// lista branca (D-1314, CA-2303, CA-2304 e CA-2311), a resposta da IA conferida por código (CA-2314 e CA-2317) e os
// limites por assinatura e o mês de Brasília (D-1318). Puro: sem Deno, sem rede e sem relógio. O navegador importa
// daqui os tipos, a limpeza dos textos e os limites (src/domain/iaPedido.ts e iaLimites.ts), para os dois lados
// dizerem o mesmo.

// ---------- Limites (D-1318) ----------

export type PlanoDaConta = 'free' | 'estudante' | 'solo' | 'pro' | 'clinica'

/** Sugestões por mês em cada assinatura. A Clínica fica com o do Pro até o contrato dizer outro número. */
export const LIMITE_DE_SUGESTOES_IA: Readonly<Record<PlanoDaConta, number>> = { free: 3, estudante: 5, solo: 20, pro: 40, clinica: 40 }
/** Pedidos à IA por conta na última hora, com qualquer resultado (DP-IA-7). */
export const LIMITE_DE_SUGESTOES_IA_POR_HORA = 10

/** Brasília é UTC−3 o ano todo. */
const BRASILIA_MS = 3 * 60 * 60 * 1000

/** A meia-noite do dia 1º do mês de `agora`, no calendário de Brasília. */
export function inicioDoMesEmBrasilia(agora: Date): Date {
  const local = new Date(agora.getTime() - BRASILIA_MS)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) + BRASILIA_MS)
}

/** O dia em que o limite renova: o 1º do mês seguinte, em Brasília ("2026-12-01"). */
export function renovaEm(agora: Date): string {
  const local = new Date(agora.getTime() - BRASILIA_MS)
  const proximo = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1))
  return proximo.toISOString().slice(0, 10)
}

export const MESES: readonly string[] = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** O mês de `agora` no calendário de Brasília, pelo nome. */
export function mesEmBrasilia(agora: Date): string {
  return MESES[inicioDoMesEmBrasilia(agora).getUTCMonth()] ?? ''
}

/** "Renovam em 1º de dezembro", do dia AAAA-MM-DD de `renovaEm`. */
export function textoDaRenovacao(dia: string): string {
  return `Renovam em 1º de ${MESES[Number(dia.slice(5, 7)) - 1] ?? ''}`
}

/** CA-2374: "As 20 sugestões de novembro foram usadas. Renovam em 1º de dezembro." */
export const textoDoLimite = (limite: number, agora: Date): string => `As ${limite} sugestões de ${mesEmBrasilia(agora)} foram usadas. ${textoDaRenovacao(renovaEm(agora))}.`

export interface UsoDoMes {
  readonly usados: number
  readonly limite: number
  /** AAAA-MM-DD. */
  readonly renovaEm: string
}

// ---------- O pedido ----------

export type ModoIa = 'gerar' | 'ajustar'
export type Orcamento = 'economico' | 'intermediario' | 'sem-restricao' | ''

export type FaseIa =
  | { readonly tipo: 'nenhuma' }
  | { readonly tipo: 'gestante'; readonly semanas: number | null }
  | { readonly tipo: 'lactante'; readonly meses: number | null; readonly amamentacao: 'exclusiva' | 'mista' }

export interface PacienteIa {
  readonly idadeAnos: number
  readonly idadeMeses: number
  readonly sexo: 'F' | 'M'
  readonly pesoKg: number | null
  readonly estaturaCm: number | null
  readonly fase: FaseIa
  readonly atividade: string
  readonly objetivo: 'emagrecer' | 'manter' | 'ganhar' | null
  readonly objetivoTexto: string
  readonly doencas: readonly string[]
  readonly outrosDiagnosticos: string
  readonly medicamentos: string
}

export interface RestricoesIa {
  /** Os avisos dos grupos ligados ("Alergia: leite e derivados"). */
  readonly avisos: readonly string[]
  /** As linhas de "Outros alimentos que não come". */
  readonly textos: readonly string[]
  readonly naoGosta: readonly string[]
  /** Os cuidados da fase de vida. */
  readonly cuidados: readonly string[]
}

export interface RotinaIa {
  readonly sono: string
  readonly trabalho: string
  readonly ondeCome: string
  readonly orcamento: Orcamento
  readonly gosta: string
  readonly exercicio: string
  /** "Algo mais": vai só neste pedido. */
  readonly extra: string
}

export interface FaixaIa {
  readonly tipo: 'pct' | 'g_kg'
  readonly min: number
  readonly max: number
}

export interface MetasIa {
  readonly kcal: number
  readonly proteina: FaixaIa | null
  readonly carboidrato: FaixaIa | null
  readonly gordura: FaixaIa | null
  /** Os nutrientes em foco (D-1313), pelo nome. */
  readonly foco: readonly string[]
}

export interface RefeicaoIa {
  readonly nome: string
  /** HH:MM. */
  readonly horario: string
}

/** Um alimento da conta ("Meus alimentos"), com os valores por 100 g (ou 100 ml) do cadastro. */
export interface MeuAlimentoIa {
  readonly id: number
  readonly nome: string
  readonly grupo: string
  readonly unidade: 'g' | 'ml'
  readonly kcal: number
  readonly p: number
  readonly c: number
  readonly g: number
}

export type OpcaoIa = 'principal' | 'opcao2'

/** Um item do plano atual, no modo ajustar: só ids e gramas. */
export interface ItemDoPlanoIa {
  readonly refeicao: number
  readonly opcao: OpcaoIa
  readonly item: number
  readonly alimentoId: number
  readonly gramas: number
}

export interface CandidatoIa {
  readonly alimentoId: number
  readonly gramas: number
  readonly coberturaPct: number
}

export interface LacunasIa {
  /** A energia da opção principal em % da meta; nula sem meta. */
  readonly energiaPct: number | null
  /** Os macros fora da faixa, em frase ("Carboidrato 68% (meta até 65%)"). */
  readonly macros: readonly string[]
  readonly abaixo: readonly { readonly nutriente: string; readonly pct: number; readonly candidatos: readonly CandidatoIa[] }[]
  /** Os nutrientes acima do limite, pelo nome. */
  readonly acima: readonly string[]
}

export interface PedidoDeSugestao {
  readonly versao: 1
  readonly modo: ModoIa
  readonly consentimento: true
  readonly paciente: PacienteIa
  readonly restricoes: RestricoesIa
  readonly rotina: RotinaIa
  readonly metas: MetasIa
  readonly refeicoes: readonly RefeicaoIa[]
  readonly naoUsar: readonly number[]
  readonly meusAlimentos: readonly MeuAlimentoIa[]
  /** Só no modo ajustar. */
  readonly plano: readonly ItemDoPlanoIa[] | null
  /** Só no modo ajustar. */
  readonly lacunas: LacunasIa | null
  /** "Outro pedido" da nutricionista. */
  readonly pedido: string
}

/** O modo `uso` só pergunta o contador (CA-2306). */
export type PedidoDaFuncao = { readonly modo: 'uso' } | PedidoDeSugestao

// ---------- Limpeza dos textos (D-1314) ----------

export const REMOVIDO = '[removido]'

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu
const ENDERECO_WEB = /\b(?:https?:\/\/|www\.)\S+/giu
const CPF = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g
const CEP = /\b\d{5}-\d{3}\b/g
/** Celular e fixo, com ou sem DDI, DDD, parênteses, espaço ou traço: 8 ou 9 algarismos no fim. */
const TELEFONE = /(?:\+?55[\s.-]?)?(?:\(?\b\d{2}\)?[\s.-]?)?\b9?\d{4}[\s.-]?\d{4}\b/g

/** Tira e-mail, endereço web, CPF, CEP e telefone do texto livre. */
export function limparTexto(texto: string): string {
  return texto
    .replace(EMAIL, REMOVIDO)
    .replace(ENDERECO_WEB, REMOVIDO)
    .replace(CPF, REMOVIDO)
    .replace(CEP, REMOVIDO)
    .replace(TELEFONE, REMOVIDO)
}

/** O texto limpo, sem controle, com os espaços normalizados e cortado no limite. Não texto vira vazio. */
export function textoCurto(valor: unknown, limite: number): string {
  if (typeof valor !== 'string') return ''
  const limpo = limparTexto(valor.replace(/[\p{Cc}\p{Cf}]+/gu, ' ').replace(/\s+/g, ' ').trim())
  return limpo.length <= limite ? limpo : limpo.slice(0, limite).trimEnd()
}

// ---------- Limites do pedido (D-1314, CA-2311) ----------

export const LIMITES_DO_PEDIDO = {
  textoCurto: 200,
  extra: 300,
  aviso: 120,
  avisos: 20,
  textoDeRestricao: 60,
  textosDeRestricao: 20,
  naoGosta: 40,
  naoGostas: 30,
  cuidado: 200,
  cuidados: 5,
  doenca: 60,
  doencas: 12,
  foco: 30,
  focos: 6,
  nomeDaRefeicao: 40,
  refeicoes: 8,
  naoUsar: 1000,
  meusAlimentos: 150,
  nomeDoAlimento: 80,
  grupo: 60,
  itensDoPlano: 200,
  lacunasAbaixo: 21,
  candidatos: 3,
  macros: 3,
  acima: 21,
} as const

const ehObjeto = (v: unknown): v is Readonly<Record<string, unknown>> => typeof v === 'object' && v !== null && !Array.isArray(v)
const numeroNaFaixa = (v: unknown, min: number, max: number): number | null => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null)
const inteiroNaFaixa = (v: unknown, min: number, max: number): number | null => (Number.isInteger(v) ? numeroNaFaixa(v, min, max) : null)
const lista = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : [])
const textos = (v: unknown, cadaUm: number, quantos: number): readonly string[] =>
  lista(v)
    .map((t) => textoCurto(t, cadaUm))
    .filter((t) => t !== '')
    .slice(0, quantos)
const HORARIO = /^([01]\d|2[0-3]):[0-5]\d$/

/** Ids de alimento: a TACO e a base ampliada (1 a 199.999) e os próprios (900.000 em diante). */
export const ehIdDeAlimento = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 2_000_000_000

function faixa(v: unknown, maxPct: number, maxGKg: number): FaixaIa | null {
  if (!ehObjeto(v)) return null
  const tipo = v['tipo'] === 'pct' || v['tipo'] === 'g_kg' ? v['tipo'] : null
  if (tipo === null) return null
  const teto = tipo === 'pct' ? maxPct : maxGKg
  const min = numeroNaFaixa(v['min'], 0, teto)
  const max = numeroNaFaixa(v['max'], 0, teto)
  return min !== null && max !== null && min <= max ? { tipo, min, max } : null
}

function fase(v: unknown): FaseIa {
  if (!ehObjeto(v)) return { tipo: 'nenhuma' }
  if (v['tipo'] === 'gestante') return { tipo: 'gestante', semanas: inteiroNaFaixa(v['semanas'], 1, 42) }
  if (v['tipo'] === 'lactante') return { tipo: 'lactante', meses: inteiroNaFaixa(v['meses'], 0, 60), amamentacao: v['amamentacao'] === 'mista' ? 'mista' : 'exclusiva' }
  return { tipo: 'nenhuma' }
}

const OBJETIVOS = new Set(['emagrecer', 'manter', 'ganhar'])
const ORCAMENTOS = new Set(['economico', 'intermediario', 'sem-restricao'])

function paciente(v: unknown): PacienteIa | null {
  if (!ehObjeto(v)) return null
  const idadeAnos = inteiroNaFaixa(v['idadeAnos'], 2, 120)
  const sexo = v['sexo'] === 'F' || v['sexo'] === 'M' ? v['sexo'] : null
  if (idadeAnos === null || sexo === null) return null
  const peso = numeroNaFaixa(v['pesoKg'], 5, 400)
  const fasePedida = fase(v['fase'])
  return {
    idadeAnos,
    idadeMeses: inteiroNaFaixa(v['idadeMeses'], 0, 11) ?? 0,
    sexo,
    pesoKg: peso === null ? null : Math.round(peso * 2) / 2,
    estaturaCm: numeroNaFaixa(v['estaturaCm'], 40, 250),
    // Gestação e lactação só valem para o sexo feminino.
    fase: sexo === 'F' ? fasePedida : { tipo: 'nenhuma' },
    atividade: textoCurto(v['atividade'], 40),
    objetivo: typeof v['objetivo'] === 'string' && OBJETIVOS.has(v['objetivo']) ? (v['objetivo'] as PacienteIa['objetivo']) : null,
    objetivoTexto: textoCurto(v['objetivoTexto'], LIMITES_DO_PEDIDO.textoCurto),
    doencas: textos(v['doencas'], LIMITES_DO_PEDIDO.doenca, LIMITES_DO_PEDIDO.doencas),
    outrosDiagnosticos: textoCurto(v['outrosDiagnosticos'], LIMITES_DO_PEDIDO.textoCurto),
    medicamentos: textoCurto(v['medicamentos'], LIMITES_DO_PEDIDO.textoCurto),
  }
}

function restricoes(v: unknown): RestricoesIa {
  const o = ehObjeto(v) ? v : {}
  return {
    avisos: textos(o['avisos'], LIMITES_DO_PEDIDO.aviso, LIMITES_DO_PEDIDO.avisos),
    textos: textos(o['textos'], LIMITES_DO_PEDIDO.textoDeRestricao, LIMITES_DO_PEDIDO.textosDeRestricao),
    naoGosta: textos(o['naoGosta'], LIMITES_DO_PEDIDO.naoGosta, LIMITES_DO_PEDIDO.naoGostas),
    cuidados: textos(o['cuidados'], LIMITES_DO_PEDIDO.cuidado, LIMITES_DO_PEDIDO.cuidados),
  }
}

function rotina(v: unknown): RotinaIa {
  const o = ehObjeto(v) ? v : {}
  const curto = (chave: string) => textoCurto(o[chave], LIMITES_DO_PEDIDO.textoCurto)
  return {
    sono: curto('sono'),
    trabalho: curto('trabalho'),
    ondeCome: curto('ondeCome'),
    orcamento: typeof o['orcamento'] === 'string' && ORCAMENTOS.has(o['orcamento']) ? (o['orcamento'] as Orcamento) : '',
    gosta: curto('gosta'),
    exercicio: curto('exercicio'),
    extra: textoCurto(o['extra'], LIMITES_DO_PEDIDO.extra),
  }
}

function metas(v: unknown): MetasIa | null {
  if (!ehObjeto(v)) return null
  const kcal = numeroNaFaixa(v['kcal'], 500, 6000)
  if (kcal === null) return null
  return {
    kcal: Math.round(kcal),
    proteina: faixa(v['proteina'], 100, 5),
    carboidrato: faixa(v['carboidrato'], 100, 20),
    gordura: faixa(v['gordura'], 100, 5),
    foco: textos(v['foco'], LIMITES_DO_PEDIDO.foco, LIMITES_DO_PEDIDO.focos),
  }
}

function refeicoes(v: unknown): readonly RefeicaoIa[] | null {
  const todas = lista(v)
  if (todas.length < 1 || todas.length > LIMITES_DO_PEDIDO.refeicoes) return null
  const limpas: RefeicaoIa[] = []
  for (const r of todas) {
    if (!ehObjeto(r)) return null
    const nome = textoCurto(r['nome'], LIMITES_DO_PEDIDO.nomeDaRefeicao)
    const horario = typeof r['horario'] === 'string' && HORARIO.test(r['horario']) ? r['horario'] : null
    if (nome === '' || horario === null) return null
    limpas.push({ nome, horario })
  }
  return limpas
}

function meuAlimento(v: unknown): MeuAlimentoIa | null {
  if (!ehObjeto(v)) return null
  const id = ehIdDeAlimento(v['id']) ? v['id'] : null
  const nome = textoCurto(v['nome'], LIMITES_DO_PEDIDO.nomeDoAlimento)
  const kcal = numeroNaFaixa(v['kcal'], 0, 900)
  const p = numeroNaFaixa(v['p'], 0, 100)
  const c = numeroNaFaixa(v['c'], 0, 100)
  const g = numeroNaFaixa(v['g'], 0, 100)
  if (id === null || nome === '' || kcal === null || p === null || c === null || g === null) return null
  return { id, nome, grupo: textoCurto(v['grupo'], LIMITES_DO_PEDIDO.grupo), unidade: v['unidade'] === 'ml' ? 'ml' : 'g', kcal, p, c, g }
}

function itemDoPlano(v: unknown, refeicoesNoPedido: number): ItemDoPlanoIa | null {
  if (!ehObjeto(v)) return null
  const refeicao = inteiroNaFaixa(v['refeicao'], 0, refeicoesNoPedido - 1)
  const opcao = v['opcao'] === 'principal' || v['opcao'] === 'opcao2' ? v['opcao'] : null
  const item = inteiroNaFaixa(v['item'], 0, 99)
  const alimentoId = ehIdDeAlimento(v['alimentoId']) ? v['alimentoId'] : null
  const gramas = numeroNaFaixa(v['gramas'], 0.1, 5000)
  if (refeicao === null || opcao === null || item === null || alimentoId === null || gramas === null) return null
  return { refeicao, opcao, item, alimentoId, gramas }
}

function lacunas(v: unknown): LacunasIa | null {
  if (!ehObjeto(v)) return null
  const abaixo = lista(v['abaixo'])
    .flatMap((a) => {
      if (!ehObjeto(a)) return []
      const nutriente = textoCurto(a['nutriente'], LIMITES_DO_PEDIDO.foco)
      const pct = numeroNaFaixa(a['pct'], 0, 1000)
      if (nutriente === '' || pct === null) return []
      const candidatos = lista(a['candidatos'])
        .flatMap((cand) => {
          if (!ehObjeto(cand) || !ehIdDeAlimento(cand['alimentoId'])) return []
          const gramas = numeroNaFaixa(cand['gramas'], 1, 1000)
          const coberturaPct = numeroNaFaixa(cand['coberturaPct'], 0, 100)
          return gramas === null || coberturaPct === null ? [] : [{ alimentoId: cand['alimentoId'], gramas, coberturaPct }]
        })
        .slice(0, LIMITES_DO_PEDIDO.candidatos)
      return [{ nutriente, pct, candidatos }]
    })
    .slice(0, LIMITES_DO_PEDIDO.lacunasAbaixo)
  return {
    energiaPct: numeroNaFaixa(v['energiaPct'], 0, 1000),
    macros: textos(v['macros'], LIMITES_DO_PEDIDO.aviso, LIMITES_DO_PEDIDO.macros),
    abaixo,
    acima: textos(v['acima'], LIMITES_DO_PEDIDO.foco, LIMITES_DO_PEDIDO.acima),
  }
}

export type PedidoLido = { readonly ok: true; readonly pedido: PedidoDaFuncao } | { readonly ok: false; readonly codigo: 'pedido-invalido' | 'sem-consentimento' }

const INVALIDO: PedidoLido = { ok: false, codigo: 'pedido-invalido' }

/**
 * O pedido reescrito por lista branca: um objeto novo, só com os campos conhecidos, nos limites. Campo desconhecido
 * some; texto livre perde o contato (CA-2311). Sem o essencial, `pedido-invalido` (CA-2303); sem a autorização,
 * `sem-consentimento` (CA-2304).
 */
export function limparPedido(corpo: unknown): PedidoLido {
  if (!ehObjeto(corpo) || corpo['versao'] !== 1) return INVALIDO
  const modo = corpo['modo']
  if (modo === 'uso') return { ok: true, pedido: { modo: 'uso' } }
  if (modo !== 'gerar' && modo !== 'ajustar') return INVALIDO
  if (corpo['consentimento'] !== true) return { ok: false, codigo: 'sem-consentimento' }
  const p = paciente(corpo['paciente'])
  const m = metas(corpo['metas'])
  const r = refeicoes(corpo['refeicoes'])
  if (p === null || m === null || r === null) return INVALIDO
  const naoUsar = [...new Set(lista(corpo['naoUsar']).filter(ehIdDeAlimento))].sort((a, b) => a - b).slice(0, LIMITES_DO_PEDIDO.naoUsar)
  const meus = lista(corpo['meusAlimentos'])
    .map(meuAlimento)
    .filter((a): a is MeuAlimentoIa => a !== null)
    .slice(0, LIMITES_DO_PEDIDO.meusAlimentos)
  let plano: readonly ItemDoPlanoIa[] | null = null
  let faltas: LacunasIa | null = null
  if (modo === 'ajustar') {
    plano = lista(corpo['plano'])
      .map((i) => itemDoPlano(i, r.length))
      .filter((i): i is ItemDoPlanoIa => i !== null)
      .slice(0, LIMITES_DO_PEDIDO.itensDoPlano)
    if (plano.length === 0) return INVALIDO
    faltas = lacunas(corpo['lacunas'])
  }
  return {
    ok: true,
    pedido: {
      versao: 1,
      modo,
      consentimento: true,
      paciente: p,
      restricoes: restricoes(corpo['restricoes']),
      rotina: rotina(corpo['rotina']),
      metas: m,
      refeicoes: r,
      naoUsar,
      meusAlimentos: meus,
      plano,
      lacunas: faltas,
      pedido: textoCurto(corpo['pedido'], LIMITES_DO_PEDIDO.extra),
    },
  }
}

// ---------- A resposta da IA (CA-2314 e CA-2317) ----------

export interface ItemSugerido {
  readonly alimentoId: number
  readonly gramas: number
}

export interface RefeicaoSugerida {
  readonly refeicao: number
  readonly principal: readonly ItemSugerido[]
  readonly opcao2: readonly ItemSugerido[]
}

export type TipoDeMudanca = 'trocar' | 'gramas' | 'adicionar' | 'remover'

export interface MudancaSugerida {
  readonly tipo: TipoDeMudanca
  readonly refeicao: number
  readonly opcao: OpcaoIa
  readonly item: number | null
  readonly alimentoId: number | null
  readonly gramas: number | null
  readonly motivo: string
}

export interface RespostaDaIa {
  readonly refeicoes: readonly RefeicaoSugerida[]
  readonly mudancas: readonly MudancaSugerida[]
  readonly pontosAConfirmar: readonly string[]
}

export const LIMITES_DA_RESPOSTA = { gramasMin: 1, gramasMax: 1000, itensPorOpcao: 10, mudancas: 8, pontos: 3, ponto: 200, motivo: 90 } as const

export interface ContextoDaResposta {
  readonly modo: ModoIa
  readonly refeicoes: number
  /** Os ids que a IA pode usar: o catálogo e os "Meus alimentos" do pedido. */
  readonly idsPermitidos: ReadonlySet<number>
  /** Só no modo ajustar: os itens do plano atual. */
  readonly plano: readonly ItemDoPlanoIa[] | null
}

export type RespostaConferida =
  | { readonly ok: true; readonly resposta: RespostaDaIa; readonly foraDaBase: number }
  | { readonly ok: false; readonly motivo: string }

const temSoAsChaves = (o: Readonly<Record<string, unknown>>, chaves: readonly string[]): boolean =>
  Object.keys(o).every((k) => chaves.includes(k)) && chaves.every((k) => Object.hasOwn(o, k))

/** Confere a forma do esquema por código (a saída estruturada já garante; aqui é a segunda trava). */
function formaDoEsquema(json: unknown): string | null {
  if (!ehObjeto(json) || !temSoAsChaves(json, ['refeicoes', 'mudancas', 'pontosAConfirmar'])) return 'o objeto não tem as três listas'
  const { refeicoes: rs, mudancas: ms, pontosAConfirmar: ps } = json
  if (!Array.isArray(rs) || !Array.isArray(ms) || !Array.isArray(ps)) return 'as listas não são listas'
  const itemValido = (i: unknown) => ehObjeto(i) && temSoAsChaves(i, ['alimentoId', 'gramas']) && Number.isInteger(i['alimentoId']) && typeof i['gramas'] === 'number' && Number.isFinite(i['gramas'])
  for (const r of rs) {
    if (!ehObjeto(r) || !temSoAsChaves(r, ['refeicao', 'principal', 'opcao2']) || !Number.isInteger(r['refeicao'])) return 'refeição fora do esquema'
    if (!Array.isArray(r['principal']) || !Array.isArray(r['opcao2']) || ![...r['principal'], ...r['opcao2']].every(itemValido)) return 'item fora do esquema'
  }
  const inteiroOuNulo = (v: unknown) => v === null || Number.isInteger(v)
  for (const m of ms) {
    if (!ehObjeto(m) || !temSoAsChaves(m, ['tipo', 'refeicao', 'opcao', 'item', 'alimentoId', 'gramas', 'motivo'])) return 'mudança fora do esquema'
    if (!['trocar', 'gramas', 'adicionar', 'remover'].includes(String(m['tipo'])) || !Number.isInteger(m['refeicao'])) return 'mudança fora do esquema'
    if (m['opcao'] !== 'principal' && m['opcao'] !== 'opcao2') return 'mudança fora do esquema'
    if (!inteiroOuNulo(m['item']) || !inteiroOuNulo(m['alimentoId'])) return 'mudança fora do esquema'
    if (!(m['gramas'] === null || (typeof m['gramas'] === 'number' && Number.isFinite(m['gramas']))) || typeof m['motivo'] !== 'string') return 'mudança fora do esquema'
  }
  if (!ps.every((p) => typeof p === 'string')) return 'ponto fora do esquema'
  return null
}

const cortar = (texto: string, limite: number): string => {
  const limpo = texto.replace(/\s+/g, ' ').trim()
  return limpo.length <= limite ? limpo : `${limpo.slice(0, limite - 1).trimEnd()}…`
}

const gramasValidas = (g: unknown): g is number =>
  typeof g === 'number' && Number.isFinite(g) && g >= LIMITES_DA_RESPOSTA.gramasMin && g <= LIMITES_DA_RESPOSTA.gramasMax

/**
 * O texto da IA vira a resposta conferida. Texto que não é JSON ou fora do esquema: `ok: false` (CA-2314). Dentro do
 * esquema, sai o que não pode ficar (CA-2317): id fora do permitido (conta em `foraDaBase`), gramas fora de 1 a 1000,
 * refeição que não existe e mudança sem os campos do tipo; e ficam no máximo 10 itens por opção, 8 mudanças e 3 pontos.
 */
export function conferirResposta(texto: string, contexto: ContextoDaResposta): RespostaConferida {
  let json: unknown
  try {
    json = JSON.parse(texto)
  } catch {
    return { ok: false, motivo: 'o texto não é JSON' }
  }
  const forma = formaDoEsquema(json)
  if (forma !== null) return { ok: false, motivo: forma }
  const bruto = json as { readonly refeicoes: readonly RefeicaoSugerida[]; readonly mudancas: readonly MudancaSugerida[]; readonly pontosAConfirmar: readonly string[] }
  let foraDaBase = 0
  const permitido = (id: number): boolean => {
    if (contexto.idsPermitidos.has(id)) return true
    foraDaBase++
    return false
  }
  const itens = (lista: readonly ItemSugerido[]): readonly ItemSugerido[] =>
    lista
      .filter((i) => gramasValidas(i.gramas))
      .filter((i) => permitido(i.alimentoId))
      .slice(0, LIMITES_DA_RESPOSTA.itensPorOpcao)
      .map((i) => ({ alimentoId: i.alimentoId, gramas: i.gramas }))

  const refeicoes: RefeicaoSugerida[] = []
  if (contexto.modo === 'gerar') {
    for (const r of bruto.refeicoes) {
      // CB-1304: a refeição que não existe sai; a repetida vale a primeira.
      if (r.refeicao < 0 || r.refeicao >= contexto.refeicoes || refeicoes.some((x) => x.refeicao === r.refeicao)) continue
      refeicoes.push({ refeicao: r.refeicao, principal: itens(r.principal), opcao2: itens(r.opcao2) })
    }
    refeicoes.sort((a, b) => a.refeicao - b.refeicao)
  }

  const mudancas: MudancaSugerida[] = []
  if (contexto.modo === 'ajustar') {
    const existe = (m: MudancaSugerida) => (contexto.plano ?? []).some((i) => i.refeicao === m.refeicao && i.opcao === m.opcao && i.item === m.item)
    for (const m of bruto.mudancas) {
      if (mudancas.length === LIMITES_DA_RESPOSTA.mudancas) break
      if (m.refeicao < 0 || m.refeicao >= contexto.refeicoes) continue
      const motivo = cortar(m.motivo, LIMITES_DA_RESPOSTA.motivo)
      const base = { tipo: m.tipo, refeicao: m.refeicao, opcao: m.opcao, motivo }
      if (m.tipo === 'remover') {
        if (m.item !== null && existe(m)) mudancas.push({ ...base, item: m.item, alimentoId: null, gramas: null })
      } else if (m.tipo === 'gramas') {
        if (m.item !== null && existe(m) && gramasValidas(m.gramas)) mudancas.push({ ...base, item: m.item, alimentoId: null, gramas: m.gramas })
      } else if (m.tipo === 'trocar') {
        const gramas = m.gramas === null ? null : gramasValidas(m.gramas) ? m.gramas : undefined
        if (m.item !== null && existe(m) && m.alimentoId !== null && gramas !== undefined && permitido(m.alimentoId)) {
          mudancas.push({ ...base, item: m.item, alimentoId: m.alimentoId, gramas })
        }
      } else if (m.alimentoId !== null && gramasValidas(m.gramas) && permitido(m.alimentoId)) {
        mudancas.push({ ...base, item: null, alimentoId: m.alimentoId, gramas: m.gramas })
      }
    }
  }

  const pontosAConfirmar = bruto.pontosAConfirmar
    .map((p) => cortar(p, LIMITES_DA_RESPOSTA.ponto))
    .filter((p) => p !== '')
    .slice(0, LIMITES_DA_RESPOSTA.pontos)

  return { ok: true, resposta: { refeicoes, mudancas, pontosAConfirmar }, foraDaBase }
}
