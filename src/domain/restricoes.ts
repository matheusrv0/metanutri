// Restrições do paciente aplicadas às sugestões de alimento e à linha do plano (spec ficha-unica, D-351 a D-354).
// Grupos marcados na ficha valem pela lista revisada da base (`restricoesDaBase.ts`) e, fora dela, pelo nome; o texto
// livre vale pelo pedaço do nome, como antes, e a linha que nomeia um grupo liga o grupo.
import { idsDaRestricao, TERMOS_POR_RESTRICAO, ULTIMO_ID_DA_BASE, type IdRestricaoDaBase } from './restricoesDaBase.ts'
import { nomeParaPaciente } from './nomeParaPaciente.ts'
import { nomeDaReceita, receitaDoItem } from './receitaNoPlano.ts'
import { OPCOES, type BuscarAlimento, type CondicaoFisiologica, type IdAlergenico, type ItemPlano, type Plano } from './tipos.ts'

export type IdRestricao = IdRestricaoDaBase
export type TipoRestricao = 'alergia' | 'intolerancia' | 'escolha'

export interface Restricao {
  readonly id: IdRestricao
  readonly tipo: TipoRestricao
  readonly rotulo: string
}

/** D-351: a ordem é a da tela. */
export const RESTRICOES: readonly Restricao[] = [
  { id: 'leite', tipo: 'alergia', rotulo: 'Leite e derivados' },
  { id: 'ovo', tipo: 'alergia', rotulo: 'Ovo' },
  { id: 'trigo', tipo: 'alergia', rotulo: 'Trigo' },
  { id: 'soja', tipo: 'alergia', rotulo: 'Soja' },
  { id: 'amendoim', tipo: 'alergia', rotulo: 'Amendoim' },
  { id: 'castanhas', tipo: 'alergia', rotulo: 'Castanhas' },
  { id: 'peixe', tipo: 'alergia', rotulo: 'Peixe' },
  { id: 'frutos-do-mar', tipo: 'alergia', rotulo: 'Crustáceos e frutos do mar' },
  { id: 'lactose', tipo: 'intolerancia', rotulo: 'Lactose' },
  { id: 'gluten', tipo: 'intolerancia', rotulo: 'Glúten' },
  { id: 'vegetariano', tipo: 'escolha', rotulo: 'Vegetariano' },
  { id: 'vegano', tipo: 'escolha', rotulo: 'Vegano' },
]

const POR_ID: ReadonlyMap<string, Restricao> = new Map(RESTRICOES.map((r) => [r.id, r]))

export const ehIdRestricao = (v: unknown): v is IdRestricao => typeof v === 'string' && POR_ID.has(v)

/** O id da doença celíaca em "Doenças e diagnósticos": marcada, conta como glúten (D-351). */
export const DOENCA_CELIACA = 'celiaca'

const PREFIXO_DO_TIPO: Readonly<Record<TipoRestricao, string>> = {
  alergia: 'Alergia',
  intolerancia: 'Intolerância',
  escolha: 'Não come por escolha',
}

export interface GrupoAtivo {
  readonly id: IdRestricao
  /** O aviso da linha do plano: "Alergia: leite e derivados". */
  readonly aviso: string
}

export interface RestricoesDoPaciente {
  /** Os grupos ligados, na ordem de prioridade do aviso: marcados, doença e texto. */
  readonly grupos: readonly GrupoAtivo[]
  /** As linhas de texto livre, como foram escritas. */
  readonly textos: readonly string[]
  /** Os alimentos de que não gosta, sem acento e em minúscula (D-354). */
  readonly naoGosta: readonly string[]
  /**
   * Os cuidados da fase de vida (spec sugestoes-com-criterio, correção A, D-442 e D-443): vêm da condição e da idade do
   * plano, não da ficha, e valem antes das restrições na linha do plano.
   */
  readonly cuidados?: readonly CuidadoDaFase[]
}

export type IdCuidado = 'gestacao-figado' | 'crianca-cafeina' | 'crianca-figado'

export interface CuidadoDaFase {
  readonly id: IdCuidado
  /** O aviso da linha do plano. */
  readonly aviso: string
}

export const AVISO_GESTACAO_FIGADO = 'Na gestação, evite fígado: o excesso de vitamina A (retinol) faz mal ao bebê.'
export const AVISO_CRIANCA_CAFEINA = 'Café, chá preto ou mate e refrigerante com cafeína não são indicados para crianças.'
export const AVISO_CRIANCA_FIGADO = 'Para crianças, evite fígado: pouca quantidade já passa do limite de vitamina A.'

/** D-443: abaixo desta idade, nada com cafeína; D-472 (correção C): nem fígado. */
export const IDADE_DA_CAFEINA = 12

/**
 * O que cada cuidado tira, pelo nome sem acento. D-442: o fígado (de boi ou de frango) e o sarapatel concentram retinol
 * pré-formado; coração, língua e bucho não. D-443: café (infusão e pó), capuccino, chá preto, mate e refrigerante de cola e
 * de guaraná têm cafeína; o chá de erva-doce, não. D-472: o limite de vitamina A da criança (600 a 1.700 µg) passa com
 * pouco fígado.
 */
const ALIMENTOS_DO_CUIDADO: Readonly<Record<IdCuidado, RegExp>> = {
  'gestacao-figado': /(figado|sarapatel)/,
  'crianca-cafeina': /^(cafe,|capuccino|cha, (preto|mate)|refrigerante, tipo (cola|guarana))/,
  'crianca-figado': /(figado|sarapatel)/,
}

const CUIDADOS: Readonly<Record<IdCuidado, CuidadoDaFase>> = {
  'gestacao-figado': { id: 'gestacao-figado', aviso: AVISO_GESTACAO_FIGADO },
  'crianca-cafeina': { id: 'crianca-cafeina', aviso: AVISO_CRIANCA_CAFEINA },
  'crianca-figado': { id: 'crianca-figado', aviso: AVISO_CRIANCA_FIGADO },
}

/** A fase de vida do plano: a condição (gestante, lactante) e a idade em anos. */
export interface FaseDoPlano {
  readonly condicao: CondicaoFisiologica
  readonly idadeAnos: number | null
}

/** Os cuidados que a fase de vida do plano pede. */
export function cuidadosDaFase(fase: FaseDoPlano): readonly CuidadoDaFase[] {
  const cuidados: CuidadoDaFase[] = []
  if (fase.condicao.tipo === 'gestante') cuidados.push(CUIDADOS['gestacao-figado'])
  if (fase.idadeAnos !== null && fase.idadeAnos < IDADE_DA_CAFEINA) cuidados.push(CUIDADOS['crianca-cafeina'], CUIDADOS['crianca-figado'])
  return cuidados
}

/** As restrições do paciente com os cuidados da fase de vida do plano. */
export function comCuidadosDaFase(restricoes: RestricoesDoPaciente, fase: FaseDoPlano): RestricoesDoPaciente {
  const cuidados = cuidadosDaFase(fase)
  return cuidados.length === 0 ? restricoes : { ...restricoes, cuidados }
}

/** O cuidado da fase de vida que o alimento pega, ou `null`. */
export function cuidadoDoAlimento(alimento: AlimentoParaRestricao, restricoes: RestricoesDoPaciente): CuidadoDaFase | null {
  if (!restricoes.cuidados || restricoes.cuidados.length === 0) return null
  const nome = semAcento(alimento.descricao)
  return restricoes.cuidados.find((c) => ALIMENTOS_DO_CUIDADO[c.id]?.test(nome)) ?? null
}

export const SEM_RESTRICOES: RestricoesDoPaciente = { grupos: [], textos: [], naoGosta: [] }

/** Sem acento, em minúscula, com os espaços normalizados. */
export const semAcento = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/** O texto livre que nomeia um grupo (D-352): "lactose", "glúten", "leite"… */
const APELIDOS: ReadonlyMap<string, IdRestricao> = new Map([
  ['leite', 'leite'],
  ['leite e derivados', 'leite'],
  ['laticinios', 'leite'],
  ['derivados do leite', 'leite'],
  ['proteina do leite', 'leite'],
  ['aplv', 'leite'],
  ['lactose', 'lactose'],
  ['ovo', 'ovo'],
  ['ovos', 'ovo'],
  ['trigo', 'trigo'],
  ['gluten', 'gluten'],
  ['soja', 'soja'],
  ['amendoim', 'amendoim'],
  ['castanha', 'castanhas'],
  ['castanhas', 'castanhas'],
  ['oleaginosas', 'castanhas'],
  ['nozes', 'castanhas'],
  ['peixe', 'peixe'],
  ['peixes', 'peixe'],
  ['frutos do mar', 'frutos-do-mar'],
  ['fruto do mar', 'frutos-do-mar'],
  ['crustaceos', 'frutos-do-mar'],
  ['vegetariano', 'vegetariano'],
  ['vegetariana', 'vegetariano'],
  ['vegano', 'vegano'],
  ['vegana', 'vegano'],
])

/** Uma restrição por linha ou vírgula; linhas vazias são ignoradas. */
export function listaDeTexto(texto: string): readonly string[] {
  return texto
    .split(/\r?\n|,/)
    .map((l) => l.trim())
    .filter((l) => l !== '')
}

/** "Fígado, jiló e quiabo" → ["figado", "jilo", "quiabo"]. */
function listaDoQueNaoGosta(texto: string): readonly string[] {
  return texto
    .split(/\r?\n|[,;]|\s+e\s+/i)
    .map(semAcento)
    .filter((t) => t.length >= 3)
}

export interface DadosDasRestricoes {
  /** Os ids marcados na ficha (alergias, intolerâncias e escolhas); id desconhecido não conta (D-365). */
  readonly marcadas: readonly string[]
  /** "Outros alimentos que não come". */
  readonly texto: string
  /** Os ids de "Doenças e diagnósticos". */
  readonly doencas: readonly string[]
  /** A resposta "Alimentos de que não gosta". */
  readonly naoGosta: string
}

export function montarRestricoes(dados: DadosDasRestricoes): RestricoesDoPaciente {
  const grupos: GrupoAtivo[] = []
  const ligar = (id: IdRestricao, aviso: string) => {
    if (!grupos.some((g) => g.id === id)) grupos.push({ id, aviso })
  }
  // As marcadas, na ordem do catálogo: com duas que pegam o mesmo alimento, vale a primeira (a alergia).
  for (const r of RESTRICOES) {
    if (dados.marcadas.includes(r.id)) ligar(r.id, `${PREFIXO_DO_TIPO[r.tipo]}: ${r.rotulo.toLowerCase()}`)
  }
  if (dados.doencas.includes(DOENCA_CELIACA)) ligar('gluten', 'Doença celíaca: glúten')
  const textos = listaDeTexto(dados.texto)
  for (const linha of textos) {
    const id = APELIDOS.get(semAcento(linha))
    const restricao = id ? POR_ID.get(id) : undefined
    if (restricao) ligar(restricao.id, `Não come: ${restricao.rotulo.toLowerCase()}`)
  }
  return { grupos, textos, naoGosta: listaDoQueNaoGosta(dados.naoGosta) }
}

/** As restrições como as telas e o domínio recebem; a lista de texto de antes da ficha única vira texto. */
export function comoRestricoes(valor: RestricoesDoPaciente | readonly string[] | undefined): RestricoesDoPaciente {
  if (valor === undefined) return SEM_RESTRICOES
  if (Array.isArray(valor)) return { grupos: [], textos: [...(valor as readonly string[])], naoGosta: [] }
  return valor as RestricoesDoPaciente
}

/** Uma chave estável das restrições, para memorizar o que depende delas. */
export const chaveDasRestricoes = (r: RestricoesDoPaciente): string =>
  JSON.stringify([r.grupos.map((g) => g.id), r.textos, r.naoGosta, (r.cuidados ?? []).map((c) => c.id)])

// ---------- Casar alimento com restrição ----------

export interface AlimentoParaRestricao {
  readonly id: number
  readonly descricao: string
  /** O grupo: no alimento próprio, o que a nutricionista escolheu (D-492). A receita não tem. */
  readonly categoria?: string
  /** Na base ampliada, os alergênicos da curadoria (spec base-ampliada, D-716b). */
  readonly ampliada?: { readonly alergenicos?: readonly IdAlergenico[] }
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** O termo vira expressão: palavra inteira, ou começo de palavra com `*`, ou começo do nome com `^`. */
function expressao(termo: string): RegExp {
  const noInicio = termo.startsWith('^')
  const prefixo = termo.endsWith('*')
  const corpo = escapar(semAcento(termo.replace(/^\^/, '').replace(/\*$/, '')))
  return new RegExp(`${noInicio ? '^' : '(?<![a-z0-9])'}${corpo}${prefixo ? '' : '(?![a-z0-9])'}`)
}

/**
 * D-716e (spec base-ampliada): a exceção compara o nome sem pontuação ("Couve, manteiga, cozida" é "couve manteiga
 * cozida", e a exceção "couve-manteiga" é "couve manteiga"). O "%" fica ("0% lactose").
 */
const semPontuacao = (s: string): string =>
  s
    .replace(/[^\p{L}\p{N}% ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const EXPRESSOES: ReadonlyMap<IdRestricao, { readonly termos: readonly RegExp[]; readonly excecoes: readonly string[] }> = new Map(
  Object.entries(TERMOS_POR_RESTRICAO).map(([id, { termos, excecoes }]) => [
    id as IdRestricao,
    { termos: termos.map(expressao), excecoes: excecoes.map((e) => semPontuacao(semAcento(e))) },
  ]),
)

function casaPeloNome(id: IdRestricao, nome: string): boolean {
  if (id === 'vegano') return (['vegetariano', 'leite', 'ovo'] as const).some((outro) => casaPeloNome(outro, nome)) || casaSoOsTermos(id, nome)
  return casaSoOsTermos(id, nome)
}

function casaSoOsTermos(id: IdRestricao, nome: string): boolean {
  const regra = EXPRESSOES.get(id)
  if (!regra) return false
  const limpo = semPontuacao(nome)
  if (regra.excecoes.some((e) => limpo.includes(e))) return false
  return regra.termos.some((t) => t.test(nome))
}

const daBase = (id: number) => id >= 1 && id <= ULTIMO_ID_DA_BASE

/**
 * D-492 (G1 da revisão da publicação 2): o grupo que a nutricionista escolheu para o alimento próprio liga a restrição,
 * além do nome. "Pescados e frutos do mar" junta peixe e crustáceo: numa alergia, sobrar é mais seguro que faltar.
 */
const RESTRICOES_DO_GRUPO: Readonly<Record<string, readonly IdRestricao[]>> = {
  'Leite e derivados': ['leite', 'lactose'],
  'Ovos e derivados': ['ovo'],
  'Pescados e frutos do mar': ['peixe', 'frutos-do-mar', 'vegetariano'],
  'Carnes e derivados': ['vegetariano'],
}

const PESCADOS = 'Pescados e frutos do mar'

/**
 * D-511: o grupo de pescados junta peixe e crustáceo, e o nome não diz qual ("Pirarucu de manta" na alergia a
 * crustáceos). Quando a alergia vem só do grupo, o aviso diz o grupo, para a nutricionista não estranhar.
 */
const DIZ_O_GRUPO: ReadonlySet<IdRestricao> = new Set(['peixe', 'frutos-do-mar'])

/** O leite sem lactose é feito para quem tem a intolerância: pelo grupo, só esse nome tira a restrição. */
const SEM_LACTOSE: readonly string[] = ['sem lactose', 'zero lactose', '0% lactose', 'lactose free']

function casaPeloGrupo(id: IdRestricao, categoria: string | undefined, nome: string): boolean {
  if (categoria === undefined) return false
  if (id === 'vegano') return (['vegetariano', 'leite', 'ovo'] as const).some((outro) => casaPeloGrupo(outro, categoria, nome))
  if (!(RESTRICOES_DO_GRUPO[categoria] ?? []).includes(id)) return false
  return id !== 'lactose' || !SEM_LACTOSE.some((e) => nome.includes(e))
}

/**
 * D-716b (spec base-ampliada): os alergênicos que a curadoria marcou no alimento da base ampliada ligam a restrição,
 * além do nome e do grupo. O trigo conta para o glúten; a lactose, para o leite; leite, ovo, peixe e fruto do mar,
 * para o vegano; peixe e fruto do mar, para o vegetariano.
 */
const RESTRICOES_DO_ALERGENICO: Readonly<Record<IdAlergenico, readonly IdRestricao[]>> = {
  trigo: ['trigo', 'gluten'],
  gluten: ['gluten'],
  leite: ['leite', 'vegano'],
  lactose: ['lactose', 'leite', 'vegano'],
  ovo: ['ovo', 'vegano'],
  soja: ['soja'],
  amendoim: ['amendoim'],
  castanhas: ['castanhas'],
  peixe: ['peixe', 'vegetariano', 'vegano'],
  'frutos-do-mar': ['frutos-do-mar', 'vegetariano', 'vegano'],
}

const casaPeloCampo = (id: IdRestricao, alimento: AlimentoParaRestricao): boolean =>
  (alimento.ampliada?.alergenicos ?? []).some((a) => RESTRICOES_DO_ALERGENICO[a].includes(id))

/** O aviso da restrição que o alimento pega, ou `null`. */
export function restricaoDoAlimento(alimento: AlimentoParaRestricao, valor: RestricoesDoPaciente | readonly string[]): string | null {
  const restricoes = comoRestricoes(valor)
  // O cuidado da fase de vida vem antes (CB-409).
  const cuidado = cuidadoDoAlimento(alimento, restricoes)
  if (cuidado) return cuidado.aviso
  const nome = semAcento(alimento.descricao)
  for (const grupo of restricoes.grupos) {
    // A base vale pela lista revisada; fora dela, pelo nome e pelo grupo (D-492).
    if (daBase(alimento.id)) {
      if (idsDaRestricao(grupo.id).has(alimento.id)) return grupo.aviso
      continue
    }
    if (casaPeloNome(grupo.id, nome) || casaPeloCampo(grupo.id, alimento)) return grupo.aviso
    if (casaPeloGrupo(grupo.id, alimento.categoria, nome)) {
      return alimento.categoria === PESCADOS && DIZ_O_GRUPO.has(grupo.id) ? `${grupo.aviso} (grupo ${PESCADOS})` : grupo.aviso
    }
  }
  for (const linha of restricoes.textos) {
    const termo = semAcento(linha)
    if (termo.length >= 3 && nome.includes(termo)) return `Não come: ${linha.trim().toLowerCase()}`
  }
  return null
}

/** Verdadeiro quando o alimento pega alguma restrição do paciente. */
export const casaRestricao = (alimento: AlimentoParaRestricao, restricoes: RestricoesDoPaciente | readonly string[]): boolean =>
  restricaoDoAlimento(alimento, restricoes) !== null

/** O aviso da linha do plano: o alimento, ou, na receita, o nome dela e cada ingrediente. */
export function restricaoDoItem(item: ItemPlano, buscar: BuscarAlimento, restricoes: RestricoesDoPaciente): string | null {
  if (restricoes.grupos.length === 0 && restricoes.textos.length === 0 && (restricoes.cuidados ?? []).length === 0) return null
  const receita = receitaDoItem(item)
  if (receita) {
    for (const ingrediente of receita.ingredientes) {
      const alimento = buscar(ingrediente.alimentoId)
      const aviso = alimento ? restricaoDoAlimento(alimento, restricoes) : null
      if (aviso) return aviso
    }
    // O nome da receita conta como alimento fora da base.
    return restricaoDoAlimento({ id: Number.MAX_SAFE_INTEGER, descricao: receita.nome }, restricoes)
  }
  const alimento = buscar(item.alimentoId)
  return alimento ? restricaoDoAlimento(alimento, restricoes) : null
}

/**
 * D-480 (spec impressao-do-plano, correção C): os avisos da janela de imprimir, um por alimento do plano (todas as
 * opções) que bate com a ficha ou com um cuidado da fase de vida, com o nome que o paciente lê. O mesmo alimento em duas
 * refeições dá uma linha só (CB-448).
 */
export function avisosParaImprimir(plano: Plano, buscar: BuscarAlimento, restricoes: RestricoesDoPaciente): readonly string[] {
  const avisos: string[] = []
  for (const refeicao of plano.refeicoes) {
    for (const opcao of OPCOES) {
      for (const item of refeicao.opcoes[opcao]) {
        const aviso = restricaoDoItem(item, buscar, restricoes)
        if (aviso === null) continue
        const receita = receitaDoItem(item)
        const nome = receita ? nomeDaReceita(receita) : nomeParaPaciente(buscar(item.alimentoId))
        // O cuidado da fase não vem da ficha: a frase diz o cuidado.
        const doCuidado = (restricoes.cuidados ?? []).some((c) => c.aviso === aviso)
        const frase = doCuidado
          ? `Este plano tem ${nome}. ${aviso} Confira antes de imprimir.`
          : `Este plano tem ${nome}, e a ficha diz ${aviso}. Confira antes de imprimir.`
        if (!avisos.includes(frase)) avisos.push(frase)
      }
    }
  }
  return avisos
}

/** D-354: o alimento está no que o paciente não gosta (vai para o fim do Cobrir). */
export function ehNaoGosta(alimento: AlimentoParaRestricao, restricoes: RestricoesDoPaciente): boolean {
  if (restricoes.naoGosta.length === 0) return false
  const nome = semAcento(alimento.descricao)
  return restricoes.naoGosta.some((t) => nome.includes(t))
}
