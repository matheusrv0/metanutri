// A cópia de trabalho da conta e como juntar duas versões dela (spec dados-na-nuvem).
//
// A cópia é o backup de sempre (formato 1) com duas chaves a mais: o aviso de primeiro acesso e
// `metanutri:mudancas`, onde fica a hora da última mudança de cada item e a lápide de cada item
// excluído (DP-1, DP-2). Com isso, duas cópias que mudaram em aparelhos diferentes se juntam
// item por item, e a mudança mais nova de cada item vence (D-132, D-133, DP-3).
import { CHAVES_DE_DADOS, montarBackup, type Backup } from './perfil.ts'
import type { Armazenamento } from './persistencia.ts'
import { idsDeProdutoEm, PRIMEIRO_ID_PRODUTO } from './produtos.ts'
import { CHAVE_ACOMPANHAMENTOS, semMudancasPendentes } from './repositorioAcompanhamentos.ts'

/** As marcas de mudança e as lápides, dentro da cópia. */
export const CHAVE_MUDANCAS = 'metanutri:mudancas'
const CHAVE_AVISO = 'metanutri:aviso-inicial-visto'
/** O aviso único de que os dados agora ficam na nuvem (DP-26; a mesma de `ui/nuvem/chavesDosAvisos.ts`). */
const CHAVE_AVISO_NUVEM = 'metanutri:aviso-nuvem-visto'
const INDICE = 'metanutri:casos'
const PREFIXO_PLANO = 'metanutri:caso:'
const OCULTOS = 'metanutri:sugestoes-ocultas'

/** O que vai para a nuvem: o backup, os avisos já vistos (não voltam a cada entrada) e as marcas. */
export const CHAVES_DA_NUVEM: readonly string[] = [...CHAVES_DE_DADOS, CHAVE_AVISO, CHAVE_AVISO_NUVEM, CHAVE_MUDANCAS]

/**
 * DP-39: os valores retidos deste navegador (referência → a marca mais nova que a nuvem conhece dela). O valor
 * retido é mais velho que essa marca: fica aqui, mas não sobe (D-173). Fica fora da cópia da nuvem.
 */
export const CHAVE_RETIDOS = 'metanutri:retidos'

export const lerRetidos = (texto: string | null): Record<string, string> => textos(lerJson(texto))

/** Grava os retidos (sem nenhum, tira a chave). */
function gravarRetidos(armazenamento: Armazenamento, retidos: Readonly<Record<string, string>>): void {
  const texto = Object.keys(retidos).length === 0 ? null : JSON.stringify(retidos)
  if (armazenamento.getItem(CHAVE_RETIDOS) === texto) return
  if (texto === null) armazenamento.removeItem(CHAVE_RETIDOS)
  else armazenamento.setItem(CHAVE_RETIDOS, texto)
}

/** Lápide com mais que isto sai da cópia (DP-3, R6). */
export const DIAS_DAS_LAPIDES = 90

/** A chave é da cópia que vai para a nuvem (o observador só marca estas). */
export const ehChaveDaNuvem = (chave: string): boolean => chave.startsWith(PREFIXO_PLANO) || CHAVES_DA_NUVEM.includes(chave)

export interface Mudancas {
  /** Referência (`pacientes/<id>`, `chave/<nome>`…) → hora da última mudança, pelo relógio de quem mudou. */
  readonly alterados: Readonly<Record<string, string>>
  /** Referência → hora da exclusão. O excluído não volta pelo outro aparelho (D-132). */
  readonly excluidos: Readonly<Record<string, string>>
}

const SEM_MUDANCAS: Mudancas = { alterados: {}, excluidos: {} }

function lerJson(texto: string | null | undefined): unknown {
  if (texto === null || texto === undefined) return undefined
  try {
    return JSON.parse(texto) as unknown
  } catch {
    return undefined
  }
}

const textos = (v: unknown): Record<string, string> => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {}
  return Object.fromEntries(Object.entries(v).filter((par): par is [string, string] => typeof par[1] === 'string'))
}

export function lerMudancas(texto: string | null): Mudancas {
  const v = lerJson(texto)
  if (typeof v !== 'object' || v === null) return SEM_MUDANCAS
  const o = v as Record<string, unknown>
  return { alterados: textos(o['alterados']), excluidos: textos(o['excluidos']) }
}

// ---------- As listas com id ----------

interface Lista {
  /** O nome na referência: `pacientes/<id>`. */
  readonly nome: string
  /** A data do próprio item, para quando não há marca (dados de antes desta mudança). */
  readonly tempo: (item: Record<string, unknown>) => string | null
}

const campo = (item: Record<string, unknown>, nome: string): string | null => (typeof item[nome] === 'string' ? (item[nome] as string) : null)

const LISTAS: Readonly<Record<string, Lista>> = {
  'metanutri:pacientes': { nome: 'pacientes', tempo: (i) => campo(i, 'atualizadoEm') },
  'metanutri:produtos': { nome: 'produtos', tempo: (i) => campo(i, 'atualizadoEm') ?? campo(i, 'criadoEm') },
  'metanutri:modelos': { nome: 'modelos', tempo: (i) => campo(i, 'criadoEm') },
  [CHAVE_ACOMPANHAMENTOS]: { nome: 'acompanhamentos', tempo: (i) => campo(i, 'criadoEm') },
  // Spec anamnese-e-prescricoes, D-166: modelo por modelo, com lápide. O roteiro de anamnese não entra aqui:
  // é uma chave inteira, e a edição mais nova vence (D-161).
  'metanutri:modelos-suplemento': { nome: 'modelos-suplemento', tempo: (i) => campo(i, 'atualizadoEm') ?? campo(i, 'criadoEm') },
}

type Item = Record<string, unknown>

const idDe = (item: unknown): string | null => {
  if (typeof item !== 'object' || item === null) return null
  const id = (item as Item)['id']
  return typeof id === 'string' || typeof id === 'number' ? String(id) : null
}

/** Os itens de uma lista guardada. Os links ficam dentro de um arquivo (`itens`); `null` quando não dá para ler. */
function itensDe(chave: string, texto: string | null | undefined): Item[] | null {
  const v = lerJson(texto)
  const lista = chave === CHAVE_ACOMPANHAMENTOS ? (typeof v === 'object' && v !== null ? (v as Item)['itens'] : undefined) : v
  if (!Array.isArray(lista)) return null
  return lista.filter((item): item is Item => idDe(item) !== null)
}

const porId = (itens: readonly Item[]): Map<string, Item> => new Map(itens.map((item) => [idDe(item) ?? '', item]))

// ---------- Marcar o que mudou (DP-2) ----------

interface Refs {
  readonly alterados: readonly string[]
  readonly excluidos: readonly string[]
}

function refsDaMudanca(chave: string, antes: string | null, depois: string | null): Refs {
  if (!ehChaveDaNuvem(chave) || chave === INDICE || chave === CHAVE_MUDANCAS) return { alterados: [], excluidos: [] }
  if (chave.startsWith(PREFIXO_PLANO)) {
    const ref = `planos/${chave.slice(PREFIXO_PLANO.length)}`
    return depois === null ? { alterados: [], excluidos: [ref] } : { alterados: [ref], excluidos: [] }
  }
  const lista = LISTAS[chave]
  if (lista === undefined) {
    const ref = `chave/${chave}`
    return depois === null ? { alterados: [], excluidos: [ref] } : { alterados: [ref], excluidos: [] }
  }
  const eram = porId(itensDe(chave, antes) ?? [])
  const sao = itensDe(chave, depois)
  if (sao === null && depois !== null) return { alterados: [], excluidos: [] }
  const agora = porId(sao ?? [])
  return {
    alterados: [...agora].filter(([id, item]) => JSON.stringify(eram.get(id)) !== JSON.stringify(item)).map(([id]) => `${lista.nome}/${id}`),
    excluidos: [...eram.keys()].filter((id) => !agora.has(id)).map((id) => `${lista.nome}/${id}`),
  }
}

/**
 * Guarda a hora de cada item que mudou ou entrou e a lápide de cada um que saiu (DP-2). O item que
 * volta perde a lápide. Quem chama grava `depois` no armazenamento; esta função só cuida das marcas.
 */
export function registrarMudanca(armazenamento: Armazenamento, chave: string, antes: string | null, depois: string | null, agora: string): void {
  const refs = refsDaMudanca(chave, antes, depois)
  if (refs.alterados.length === 0 && refs.excluidos.length === 0) return
  const atual = lerMudancas(armazenamento.getItem(CHAVE_MUDANCAS))
  const alterados = new Map(Object.entries(atual.alterados))
  const excluidos = new Map(Object.entries(atual.excluidos))
  for (const ref of refs.alterados) {
    alterados.set(ref, agora)
    excluidos.delete(ref)
  }
  for (const ref of refs.excluidos) {
    excluidos.set(ref, agora)
    alterados.delete(ref)
  }
  armazenamento.setItem(CHAVE_MUDANCAS, JSON.stringify({ alterados: Object.fromEntries(alterados), excluidos: Object.fromEntries(excluidos) }))
  // DP-39 e CA-609: a pessoa mexeu no valor retido: a edição dela é a mais nova e sobe como qualquer outra.
  const retidos = lerRetidos(armazenamento.getItem(CHAVE_RETIDOS))
  const soltos = [...refs.alterados, ...refs.excluidos].filter((ref) => ref in retidos)
  if (soltos.length > 0) gravarRetidos(armazenamento, Object.fromEntries(Object.entries(retidos).filter(([ref]) => !soltos.includes(ref))))
}

// ---------- A cópia ----------

/** A lápide mais velha que fica. Sem uma data que se leia, nenhuma sai. */
const limiteDasLapides = (agora: string): string => {
  const instante = Date.parse(agora)
  return Number.isNaN(instante) ? '' : new Date(instante - DIAS_DAS_LAPIDES * 24 * 60 * 60 * 1000).toISOString()
}

const recentes = (excluidos: Readonly<Record<string, string>>, agora: string): Record<string, string> => {
  const limite = limiteDasLapides(agora)
  return Object.fromEntries(Object.entries(excluidos).filter(([, quando]) => quando >= limite))
}

/** A lista guardada sem os itens dados; o arquivo dos links leva as marcas dos que ficam. `null` quando não dá para ler. */
function listaSem(chave: string, valor: string, ids: ReadonlySet<string>): string | null {
  const itens = itensDe(chave, valor)
  if (itens === null) return null
  const ficam = itens.filter((item) => !ids.has(idDe(item) ?? ''))
  if (ficam.length === itens.length) return valor
  if (chave !== CHAVE_ACOMPANHAMENTOS) return JSON.stringify(ficam)
  const arquivo = lerJson(valor) as Item
  const soDosQueFicam = (v: unknown): unknown => (Array.isArray(v) ? v.filter((id) => typeof id === 'string' && !ids.has(id)) : v)
  return JSON.stringify({ ...arquivo, itens: ficam, naNuvem: soDosQueFicam(arquivo['naNuvem']), pendentes: soDosQueFicam(arquivo['pendentes']) })
}

/**
 * DP-40: a lista da cópia com os itens daqui que ficaram, no fim. No arquivo dos links, as marcas de "na nuvem" e de
 * pendente que esses itens tinham aqui vão junto.
 */
function listaCom(chave: string, daNuvem: string, extras: readonly Item[], daqui: string): string {
  const itens = [...(itensDe(chave, daNuvem) ?? []), ...extras]
  if (chave !== CHAVE_ACOMPANHAMENTOS) return JSON.stringify(itens)
  const arquivo = (texto: string): Item => {
    const v = lerJson(texto)
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Item) : {}
  }
  const daCopia = arquivo(daNuvem)
  const local = arquivo(daqui)
  const ids = new Set(extras.map((item) => idDe(item)))
  const junto = (campo: string): string[] => {
    const lista = (v: unknown): string[] => (Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string') : [])
    return [...new Set([...lista(daCopia[campo]), ...lista(local[campo]).filter((id) => ids.has(id))])]
  }
  return JSON.stringify({ ...daCopia, formato: 1, itens, naNuvem: junto('naNuvem'), pendentes: junto('pendentes') })
}

/** DP-39: a cópia que sobe sem os valores retidos (a chave inteira, ou só o item na lista). As marcas ficam. */
function semRetidos(dados: Record<string, string>, retidos: Readonly<Record<string, string>>): Record<string, string> {
  const refs = Object.keys(retidos)
  if (refs.length === 0) return dados
  const chavesRetidas = new Set(refs.filter((ref) => ref.startsWith('chave/')).map((ref) => ref.slice('chave/'.length)))
  const saida: Record<string, string> = Object.fromEntries(Object.entries(dados).filter(([chave]) => !chavesRetidas.has(chave)))
  for (const [chave, lista] of Object.entries(LISTAS)) {
    const valor = saida[chave]
    const ids = new Set(refs.filter((ref) => ref.startsWith(`${lista.nome}/`)).map((ref) => ref.slice(lista.nome.length + 1)))
    if (valor === undefined || ids.size === 0) continue
    const sem = listaSem(chave, valor, ids)
    if (sem !== null) saida[chave] = sem
  }
  return saida
}

/** A cópia de trabalho como vai para a nuvem, sem as lápides velhas e sem os valores retidos (D-173). */
export function montarCopia(armazenamento: Armazenamento | null, agora: string): Backup {
  const copia = montarBackup(armazenamento, CHAVES_DA_NUVEM, agora)
  const dados = semRetidos(copia.dados, lerRetidos(armazenamento?.getItem(CHAVE_RETIDOS) ?? null))
  const marcas = dados[CHAVE_MUDANCAS]
  if (marcas === undefined) return { ...copia, dados }
  const lidas = lerMudancas(marcas)
  return { ...copia, dados: { ...dados, [CHAVE_MUDANCAS]: JSON.stringify({ alterados: lidas.alterados, excluidos: recentes(lidas.excluidos, agora) }) } }
}

/** Uma referência da chave que ficou, com a hora do valor daqui (a marca; sem marca, a data do item). */
interface RefMantida {
  readonly ref: string
  readonly tempo: string
}

/** O que ficou de uma chave daqui que a cópia não trouxe (D-170): o valor e as referências dele. */
interface Mantida {
  readonly valor: string
  readonly refs: readonly RefMantida[]
}

/**
 * D-170 e DP-32: a chave daqui que a cópia não traz. Uma versão antiga do site salva sem as chaves que ela
 * não conhece, então a falta sozinha não é exclusão: só a lápide é. Na chave inteira, vale a lápide da
 * chave; na lista, a de cada item (igual ou mais nova que a hora dele, como na junção), e a lista fica com
 * os itens sem lápide. Planos e o índice seguem a cópia (CB-170): toda versão com a nuvem os conhece.
 * `null` quando a chave sai.
 */
function manterSemLapide(chave: string, valor: string, lapides: Readonly<Record<string, string>>, marcas: Readonly<Record<string, string>>): Mantida | null {
  if (chave === INDICE || chave === CHAVE_MUDANCAS || chave.startsWith(PREFIXO_PLANO)) return null
  const tempoDe = (ref: string, doItem: string | null): string => marcas[ref] ?? doItem ?? ''
  const apagado = (ref: RefMantida): boolean => {
    const lapide = lapides[ref.ref]
    return lapide !== undefined && lapide >= ref.tempo
  }
  const lista = LISTAS[chave]
  if (lista === undefined) {
    const ref = `chave/${chave}`
    const mantida = { ref, tempo: tempoDe(ref, null) }
    return apagado(mantida) ? null : { valor, refs: [mantida] }
  }
  const itens = itensDe(chave, valor)
  if (itens === null) return null
  const comRef = itens.map((item) => {
    const ref = `${lista.nome}/${idDe(item) ?? ''}`
    return { item, ref: { ref, tempo: tempoDe(ref, lista.tempo(item)) } }
  })
  const ficam = comRef.filter(({ ref }) => !apagado(ref))
  if (ficam.length === 0) return null
  const refs = ficam.map(({ ref }) => ref)
  // Sem item a tirar, o texto fica exatamente o mesmo.
  if (ficam.length === itens.length) return { valor, refs }
  const itensQueFicam = ficam.map(({ item }) => item)
  if (chave !== CHAVE_ACOMPANHAMENTOS) return { valor: JSON.stringify(itensQueFicam), refs }
  const arquivo = lerJson(valor) as Item
  const ids = new Set(itensQueFicam.map((item) => idDe(item)))
  const soDosQueFicam = (v: unknown): unknown => (Array.isArray(v) ? v.filter((id) => typeof id === 'string' && ids.has(id)) : v)
  return { valor: JSON.stringify({ ...arquivo, itens: itensQueFicam, naNuvem: soDosQueFicam(arquivo['naNuvem']), pendentes: soDosQueFicam(arquivo['pendentes']) }), refs }
}

/** O que aplicar a cópia fez na cópia de trabalho. */
export interface Aplicacao {
  /** Algo mudou aqui. */
  readonly mudou: boolean
  /**
   * D-170: as chaves daqui que a cópia não trazia, que ficaram (sem lápide: uma versão antiga do site salvou
   * sem elas) e que precisam voltar para a nuvem, porque o valor daqui é igual ou mais novo que a marca que a
   * cópia traz delas (DP-35). Quem aplica conta uma mudança. A chave daqui mais velha também fica, mas não
   * entra aqui: outro aparelho tem o valor mais novo e o devolve.
   */
  readonly mantidas: readonly string[]
}

/** O plano de uma aplicação: o que a cópia de trabalho fica, o que sobe de volta e o que fica retido. */
interface Plano {
  readonly alvo: Record<string, string>
  readonly mantidas: string[]
  readonly retidos: Record<string, string>
}

/** A marca mais nova entre as dadas (as que existem). */
const maisNova = (...marcas: (string | undefined)[]): string | undefined => marcas.filter((m): m is string => m !== undefined).sort().at(-1)

/** O que a cópia de trabalho deve ficar depois de aplicar a cópia, sem gravar nada. */
function planejarAplicacao(atual: Readonly<Record<string, string>>, copia: Backup, retidosAntes: Readonly<Record<string, string>>): Plano {
  const alvo: Record<string, string> = Object.fromEntries(Object.entries(copia.dados).filter(([chave]) => ehChaveDaNuvem(chave)))
  const daCopia = lerMudancas(alvo[CHAVE_MUDANCAS] ?? null)
  const marcasDaqui = lerMudancas(atual[CHAVE_MUDANCAS] ?? null).alterados
  const mantidas: string[] = []
  const retidos: Record<string, string> = {}
  const alterados = new Map(Object.entries(daCopia.alterados))
  let marcasMudaram = false
  for (const [chave, valor] of Object.entries(atual)) {
    if (chave in alvo) continue
    const mantida = manterSemLapide(chave, valor, daCopia.excluidos, marcasDaqui)
    if (mantida === null) continue
    alvo[chave] = mantida.valor
    let sobe = false
    for (const { ref, tempo } of mantida.refs) {
      const naCopia = daCopia.alterados[ref]
      const jaRetido = retidosAntes[ref]
      // D-173 e DP-39: o valor daqui mais velho que a marca que a cópia conhece fica aqui, retido: não sobe, nem ao
      // aplicar de novo, e a marca é a mais nova que se conhece (a nuvem continua sabendo dela).
      if (jaRetido !== undefined || (naCopia !== undefined && tempo < naCopia)) {
        const marca = maisNova(naCopia, jaRetido) ?? tempo
        retidos[ref] = marca
        if (marca !== naCopia) {
          alterados.set(ref, marca)
          marcasMudaram = true
        }
        continue
      }
      // DP-35: o valor daqui igual ou mais novo volta para a nuvem, com a marca daqui.
      sobe = true
      const marca = marcasDaqui[ref]
      if (marca !== undefined && marca !== naCopia) {
        alterados.set(ref, marca)
        marcasMudaram = true
      }
    }
    if (sobe) mantidas.push(chave)
  }
  // DP-40: a lista que a cópia traz sem um item daqui. Item que some de uma lista deixa lápide; sem lápide e com a marca
  // dele na cópia (ou retido aqui), o item faltou porque a cópia veio de quem o reteve ou de uma versão antiga: ele fica,
  // e sobe só se for igual ou mais novo que a marca da cópia. Sem marca, vale a cópia, como antes.
  for (const [chave, lista] of Object.entries(LISTAS)) {
    const daqui = atual[chave]
    const daNuvem = alvo[chave]
    if (daqui === undefined || daNuvem === undefined || daqui === daNuvem) continue
    const itensDaqui = itensDe(chave, daqui)
    const itensDaNuvem = itensDe(chave, daNuvem)
    if (itensDaqui === null || itensDaNuvem === null) continue
    const naCopiaIds = new Set(itensDaNuvem.map((item) => idDe(item)))
    const ficam: Item[] = []
    let sobe = false
    for (const item of itensDaqui) {
      const id = idDe(item)
      if (id === null || naCopiaIds.has(id)) continue
      const ref = `${lista.nome}/${id}`
      const naCopia = daCopia.alterados[ref]
      const jaRetido = retidosAntes[ref]
      if (naCopia === undefined && jaRetido === undefined) continue
      const tempo = marcasDaqui[ref] ?? lista.tempo(item) ?? ''
      const lapide = daCopia.excluidos[ref]
      if (lapide !== undefined && lapide >= tempo) continue
      ficam.push(item)
      if (jaRetido !== undefined || (naCopia !== undefined && tempo < naCopia)) {
        const marca = maisNova(naCopia, jaRetido) ?? tempo
        retidos[ref] = marca
        if (marca !== naCopia) {
          alterados.set(ref, marca)
          marcasMudaram = true
        }
        continue
      }
      sobe = true
      const marca = marcasDaqui[ref]
      if (marca !== undefined && marca !== naCopia) {
        alterados.set(ref, marca)
        marcasMudaram = true
      }
    }
    if (ficam.length === 0) continue
    alvo[chave] = listaCom(chave, daNuvem, ficam, daqui)
    if (sobe) mantidas.push(chave)
  }
  if (marcasMudaram) {
    alvo[CHAVE_MUDANCAS] = JSON.stringify({ alterados: Object.fromEntries(alterados), excluidos: daCopia.excluidos })
  }
  return { alvo, mantidas, retidos }
}

/** O que está aqui agora: as chaves da nuvem e os retidos. */
const lerAqui = (armazenamento: Armazenamento) => ({
  atual: montarBackup(armazenamento, CHAVES_DA_NUVEM, '').dados,
  retidos: lerRetidos(armazenamento.getItem(CHAVE_RETIDOS)),
})

/**
 * DP-36: as chaves que ficariam aqui e voltariam para a nuvem se a cópia fosse aplicada, sem gravar nada. Com a
 * mesma versão da nuvem, o motor só aplica quando há alguma (uma aba antiga deste navegador mandou sem elas). O
 * valor retido nunca conta (D-173).
 */
export function chavesMantidas(armazenamento: Armazenamento, copia: Backup): readonly string[] {
  const { atual, retidos } = lerAqui(armazenamento)
  return planejarAplicacao(atual, copia, retidos).mantidas
}

/**
 * Escreve a cópia na cópia de trabalho: tira o que ela não tem e grava o que mudou (só entre as chaves
 * da nuvem; o resto do aparelho fica). A chave daqui que a cópia não traz e sem lápide fica (D-170); a mais
 * velha que a marca da cópia fica retida (D-173). Os planos vão antes do índice. Sem espaço, a exceção sobe:
 * o valor de antes de cada chave não gravada continua lá.
 */
export function aplicarCopia(armazenamento: Armazenamento, copia: Backup): Aplicacao {
  const aqui = lerAqui(armazenamento)
  const atual = aqui.atual
  const { alvo, mantidas, retidos } = planejarAplicacao(atual, copia, aqui.retidos)
  const entradas = Object.entries(alvo).sort(([a], [b]) => Number(a === INDICE) - Number(b === INDICE))
  let mudou = false
  // As que saem vão antes (DP-23): o espaço delas fica livre para as que entram.
  for (const chave of Object.keys(atual)) {
    if (chave in alvo) continue
    armazenamento.removeItem(chave)
    mudou = true
  }
  for (const [chave, valor] of entradas) {
    if (atual[chave] === valor) continue
    armazenamento.setItem(chave, valor)
    mudou = true
  }
  // A lista é refeita a cada cópia: o valor que chegou solta o retido (DP-39).
  gravarRetidos(armazenamento, retidos)
  return { mudou, mantidas }
}

/** DP-15: a marca de link pendente que vem da nuvem é de outro aparelho; aqui, vale a tabela dos links. */
export function semPendencias(copia: Backup): Backup {
  const links = copia.dados[CHAVE_ACOMPANHAMENTOS]
  return links === undefined ? copia : { ...copia, dados: { ...copia.dados, [CHAVE_ACOMPANHAMENTOS]: semMudancasPendentes(links) } }
}

/** Planos e itens das listas: o que a pessoa chamaria de "meus dados". */
export function itensDaCopia(copia: Backup): number {
  const planos = Object.keys(copia.dados).filter((chave) => chave.startsWith(PREFIXO_PLANO)).length
  return Object.keys(LISTAS).reduce((total, chave) => total + (itensDe(chave, copia.dados[chave])?.length ?? 0), planos)
}

/** Sem item nenhum e sem lápide: uma cópia assim não veio de a pessoa apagar tudo (DP-11). */
export function copiaSemItens(copia: Backup): boolean {
  return itensDaCopia(copia) === 0 && Object.keys(lerMudancas(copia.dados[CHAVE_MUDANCAS] ?? null).excluidos).length === 0
}

/** As mesmas chaves com os mesmos valores (a hora em que foi montada não conta). */
export function copiasIguais(a: Backup, b: Backup): boolean {
  const chaves = Object.keys(a.dados)
  return chaves.length === Object.keys(b.dados).length && chaves.every((chave) => a.dados[chave] === b.dados[chave])
}

// ---------- Juntar (D-132, D-133) ----------

type Lado = 'daqui' | 'nuvem' | 'igual'

/** Quem fica no empate de valores diferentes sem marca nem data que decida (DP-3). */
export type Desempate = 'daqui' | 'nuvem'

interface Escolha {
  readonly valor: string
  readonly lado: Lado
}

interface Juncao {
  readonly daqui: Mudancas
  readonly nuvem: Mudancas
  /** As lápides dos dois lados, a mais nova de cada referência. */
  readonly lapides: ReadonlyMap<string, string>
  /** As referências que ficaram na cópia junta. */
  readonly presentes: Set<string>
  readonly desempate: Desempate
}

/**
 * O valor que fica para uma referência: o lado com a mudança mais nova (a marca; sem marca, a data do
 * item; sem nada, vazio). Mesmo valor dos dois lados não é conflito; empate com valor diferente fica
 * com o lado do desempate (a nuvem, salvo na primeira junção, DP-3). A lápide igual ou mais nova que
 * a mudança que venceu apaga o item (`null`).
 */
function escolher(juncao: Juncao, ref: string, daqui: string | undefined, nuvem: string | undefined, tempoDe: (valor: string) => string | null): Escolha | null {
  const tempo = (valor: string, marcas: Mudancas): string => marcas.alterados[ref] ?? tempoDe(valor) ?? ''
  let escolha: Escolha
  let quando: string
  if (daqui === undefined && nuvem === undefined) return null
  if (nuvem === undefined || daqui === nuvem) {
    if (daqui === undefined) return null
    escolha = { valor: daqui, lado: nuvem === undefined ? 'daqui' : 'igual' }
    quando = tempo(daqui, juncao.daqui)
    const naNuvem = nuvem === undefined ? '' : tempo(nuvem, juncao.nuvem)
    if (naNuvem > quando) quando = naNuvem
  } else if (daqui === undefined) {
    escolha = { valor: nuvem, lado: 'nuvem' }
    quando = tempo(nuvem, juncao.nuvem)
  } else {
    const tDaqui = tempo(daqui, juncao.daqui)
    const tNuvem = tempo(nuvem, juncao.nuvem)
    const ficaDaqui = tDaqui > tNuvem || (tDaqui === tNuvem && juncao.desempate === 'daqui')
    escolha = ficaDaqui ? { valor: daqui, lado: 'daqui' } : { valor: nuvem, lado: 'nuvem' }
    quando = ficaDaqui ? tDaqui : tNuvem
  }
  const lapide = juncao.lapides.get(ref)
  if (lapide !== undefined && lapide >= quando) return null
  juncao.presentes.add(ref)
  return escolha
}

/** Troca, em qualquer profundidade, o `alimentoId` do produto que mudou de id (DP-4). */
function trocarAlimentos(valor: unknown, trocas: ReadonlyMap<number, number>): unknown {
  if (Array.isArray(valor)) return valor.map((v) => trocarAlimentos(v, trocas))
  if (typeof valor !== 'object' || valor === null) return valor
  return Object.fromEntries(
    Object.entries(valor).map(([nome, v]) => [nome, nome === 'alimentoId' && typeof v === 'number' ? (trocas.get(v) ?? v) : trocarAlimentos(v, trocas)]),
  )
}

/** O valor que veio daqui passa a apontar para os ids novos dos produtos daqui (DP-4). */
function comAlimentosTrocados(chave: string, escolha: Escolha, trocas: ReadonlyMap<number, number>): string {
  if (trocas.size === 0 || escolha.lado !== 'daqui') return escolha.valor
  const v = lerJson(escolha.valor)
  if (v === undefined) return escolha.valor
  if (chave === OCULTOS && Array.isArray(v)) return JSON.stringify(v.map((id) => (typeof id === 'number' ? (trocas.get(id) ?? id) : id)))
  return JSON.stringify(trocarAlimentos(v, trocas))
}

/**
 * DP-4: o id de produto é o próximo número de cada aparelho, então o mesmo id com criação diferente é
 * outro produto. O daqui ganha id novo acima do maior, e a marca dele vai junto. Devolve as trocas.
 * O maior conta também os ids das marcas e lápides dos dois lados (DP-21): o id novo nunca cai num
 * produto excluído, que levaria a lápide dele e sumiria.
 */
function separarProdutos(daqui: Item[], nuvem: readonly Item[], marcas: Map<string, string>, referencias: Iterable<string>): Map<number, number> {
  const naNuvem = porId(nuvem)
  const usados = [...daqui, ...nuvem].map((p) => p['id']).filter((id): id is number => typeof id === 'number')
  let maior = Math.max(PRIMEIRO_ID_PRODUTO - 1, ...usados, ...idsDeProdutoEm(referencias))
  const trocas = new Map<number, number>()
  daqui.forEach((produto, i) => {
    const id = produto['id']
    const outro = naNuvem.get(String(id))
    if (typeof id !== 'number' || outro === undefined || JSON.stringify(outro) === JSON.stringify(produto)) return
    const criado = campo(produto, 'criadoEm')
    if (criado === null || criado === campo(outro, 'criadoEm')) return
    maior += 1
    trocas.set(id, maior)
    daqui[i] = { ...produto, id: maior }
    const marca = marcas.get(`produtos/${id}`)
    marcas.delete(`produtos/${id}`)
    if (marca !== undefined) marcas.set(`produtos/${maior}`, marca)
  })
  return trocas
}

/** Junta uma lista com id. O arquivo dos links leva as marcas dele (DP-15). */
function juntarLista(juncao: Juncao, chave: string, lista: Lista, daquiTexto: string | undefined, nuvemTexto: string | undefined, trocas: Map<number, number>, marcasDaqui: Map<string, string>): string | undefined {
  if (daquiTexto === undefined && nuvemTexto === undefined) return undefined
  const daqui = daquiTexto === undefined ? [] : itensDe(chave, daquiTexto)
  const nuvem = nuvemTexto === undefined ? [] : itensDe(chave, nuvemTexto)
  // Lado que não dá para ler fica de fora: vale o outro, como na migração (D-127).
  if (daqui === null) return nuvemTexto ?? daquiTexto
  if (nuvem === null) return daquiTexto

  if (chave === 'metanutri:produtos') {
    const referencias = [...marcasDaqui.keys(), ...Object.keys(juncao.nuvem.alterados), ...juncao.lapides.keys()]
    for (const [de, para] of separarProdutos(daqui, nuvem, marcasDaqui, referencias)) trocas.set(de, para)
  }
  const juncaoDaLista: Juncao = { ...juncao, daqui: { ...juncao.daqui, alterados: Object.fromEntries(marcasDaqui) } }

  const deDaqui = porId(daqui)
  const daNuvem = porId(nuvem)
  const ids = [...deDaqui.keys(), ...[...daNuvem.keys()].filter((id) => !deDaqui.has(id))]
  const lados = new Map<string, Lado>()
  const itens: unknown[] = []
  for (const id of ids) {
    const tempo = (valor: string) => {
      const item = lerJson(valor)
      return typeof item === 'object' && item !== null ? lista.tempo(item as Item) : null
    }
    const daquiItem = deDaqui.get(id)
    const nuvemItem = daNuvem.get(id)
    const escolha = escolher(
      juncaoDaLista,
      `${lista.nome}/${id}`,
      daquiItem === undefined ? undefined : JSON.stringify(daquiItem),
      nuvemItem === undefined ? undefined : JSON.stringify(nuvemItem),
      tempo,
    )
    if (escolha === null) continue
    lados.set(id, escolha.lado)
    itens.push(lerJson(comAlimentosTrocados(chave, escolha, trocas)))
  }

  if (chave !== CHAVE_ACOMPANHAMENTOS) return JSON.stringify(itens)
  const arquivo = (texto: string | undefined): Item => {
    const v = lerJson(texto)
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Item) : {}
  }
  const marcasDe = (o: Item, nome: string): Set<string> => new Set(Array.isArray(o[nome]) ? (o[nome] as unknown[]).filter((x): x is string => typeof x === 'string') : [])
  const doDaqui = arquivo(daquiTexto)
  const daNuvemArquivo = arquivo(nuvemTexto)
  const naNuvem = new Set([...marcasDe(doDaqui, 'naNuvem'), ...marcasDe(daNuvemArquivo, 'naNuvem')])
  const pendentes = marcasDe(doDaqui, 'pendentes')
  const ficaram = [...lados.keys()]
  return JSON.stringify({
    ...daNuvemArquivo,
    ...doDaqui,
    formato: 1,
    itens,
    naNuvem: ficaram.filter((id) => naNuvem.has(id)),
    pendentes: ficaram.filter((id) => lados.get(id) !== 'nuvem' && pendentes.has(id)),
  })
}

/**
 * A data mais nova que a cópia carrega: marcas, lápides e as datas dos planos e dos itens. Na primeira
 * junção (dados de antes, sem marcas), diz qual lado foi usado por último e fica com o empate (DP-3).
 */
export function momentoDaCopia(copia: Backup): string {
  const marcas = lerMudancas(copia.dados[CHAVE_MUDANCAS] ?? null)
  const datas = [...Object.values(marcas.alterados), ...Object.values(marcas.excluidos)]
  for (const [chave, valor] of Object.entries(copia.dados)) {
    if (chave.startsWith(PREFIXO_PLANO)) datas.push(tempoDoPlano(valor) ?? '')
    const lista = LISTAS[chave]
    if (lista !== undefined) for (const item of itensDe(chave, valor) ?? []) datas.push(lista.tempo(item) ?? '')
  }
  return datas.reduce((maior, data) => (data > maior ? data : maior), '')
}

const idsDoIndice = (texto: string | undefined): string[] => {
  const v = lerJson(texto)
  return Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string') : []
}

const tempoDoPlano = (valor: string): string | null => {
  const v = lerJson(valor)
  return typeof v === 'object' && v !== null ? campo(v as Item, 'atualizadoEm') : null
}

/** DP-19: o plano da nuvem que passa por cima de outro daqui fica com a versão maior, e o aviso de outra aba continua valendo. */
function planoComVersaoMaior(daNuvem: string, daqui: string): string {
  const nuvem = lerJson(daNuvem)
  const local = lerJson(daqui)
  const versao = (v: unknown): number => (typeof v === 'object' && v !== null && typeof (v as Item)['versao'] === 'number' ? ((v as Item)['versao'] as number) : 0)
  if (typeof nuvem !== 'object' || nuvem === null) return daNuvem
  return JSON.stringify({ ...(nuvem as Item), versao: Math.max(versao(nuvem), versao(local)) + 1 })
}

/**
 * Junta a cópia daqui com a da nuvem, item por item (D-132): itens diferentes ficam os dois, o mesmo
 * item fica com a mudança mais nova, e o excluído não volta. Serve também para os dados de antes desta
 * mudança, que não têm marcas (D-133): aí vale a data de cada item.
 */
export function juntarCopias(daqui: Backup, nuvem: Backup, agora: string, desempate: Desempate = 'nuvem'): Backup {
  const marcasDaqui = lerMudancas(daqui.dados[CHAVE_MUDANCAS] ?? null)
  const marcasDaNuvem = lerMudancas(nuvem.dados[CHAVE_MUDANCAS] ?? null)
  const lapides = new Map(Object.entries(marcasDaqui.excluidos))
  for (const [ref, quando] of Object.entries(marcasDaNuvem.excluidos)) if ((lapides.get(ref) ?? '') < quando) lapides.set(ref, quando)
  const marcasDosProdutos = new Map(Object.entries(marcasDaqui.alterados))
  const juncao: Juncao = { daqui: marcasDaqui, nuvem: marcasDaNuvem, lapides, presentes: new Set(), desempate }
  const dados: Record<string, string> = {}
  const trocas = new Map<number, number>()

  // Os produtos primeiro: o id novo de um produto daqui muda os planos, modelos e sugestões daqui (DP-4).
  const listas = Object.entries(LISTAS).sort(([a], [b]) => Number(b === 'metanutri:produtos') - Number(a === 'metanutri:produtos'))
  for (const [chave, lista] of listas) {
    const valor = juntarLista(juncao, chave, lista, daqui.dados[chave], nuvem.dados[chave], trocas, marcasDosProdutos)
    if (valor !== undefined) dados[chave] = valor
  }
  const juncaoComProdutos: Juncao = { ...juncao, daqui: { ...marcasDaqui, alterados: Object.fromEntries(marcasDosProdutos) } }

  const planos = new Set([...Object.keys(daqui.dados), ...Object.keys(nuvem.dados)].filter((chave) => chave.startsWith(PREFIXO_PLANO)))
  const ficaram: string[] = []
  for (const chave of planos) {
    const id = chave.slice(PREFIXO_PLANO.length)
    const local = daqui.dados[chave]
    const escolha = escolher(juncaoComProdutos, `planos/${id}`, local, nuvem.dados[chave], tempoDoPlano)
    if (escolha === null) continue
    dados[chave] = escolha.lado === 'nuvem' && local !== undefined ? planoComVersaoMaior(escolha.valor, local) : comAlimentosTrocados(chave, escolha, trocas)
    ficaram.push(id)
  }
  if (INDICE in daqui.dados || INDICE in nuvem.dados || ficaram.length > 0) {
    const ordem = [...idsDoIndice(daqui.dados[INDICE]), ...idsDoIndice(nuvem.dados[INDICE]), ...ficaram]
    dados[INDICE] = JSON.stringify([...new Set(ordem)].filter((id) => ficaram.includes(id)))
  }

  const tratadas = new Set([...Object.keys(LISTAS), INDICE, CHAVE_MUDANCAS])
  const outras = new Set([...Object.keys(daqui.dados), ...Object.keys(nuvem.dados)].filter((chave) => !tratadas.has(chave) && !chave.startsWith(PREFIXO_PLANO)))
  for (const chave of outras) {
    const escolha = escolher(juncaoComProdutos, `chave/${chave}`, daqui.dados[chave], nuvem.dados[chave], () => null)
    if (escolha !== null) dados[chave] = comAlimentosTrocados(chave, escolha, trocas)
  }

  // As marcas da cópia junta: a hora mais nova de cada item que ficou e as lápides recentes do que saiu.
  const alterados = new Map<string, string>()
  for (const marcas of [juncaoComProdutos.daqui.alterados, marcasDaNuvem.alterados]) {
    for (const [ref, quando] of Object.entries(marcas)) if (juncao.presentes.has(ref) && (alterados.get(ref) ?? '') < quando) alterados.set(ref, quando)
  }
  const limite = limiteDasLapides(agora)
  const excluidos = [...lapides].filter(([ref, quando]) => !juncao.presentes.has(ref) && quando >= limite)
  if (CHAVE_MUDANCAS in daqui.dados || CHAVE_MUDANCAS in nuvem.dados || alterados.size > 0 || excluidos.length > 0) {
    dados[CHAVE_MUDANCAS] = JSON.stringify({ alterados: Object.fromEntries(alterados), excluidos: Object.fromEntries(excluidos) })
  }
  return { formato: 1, geradoEm: agora, dados }
}
