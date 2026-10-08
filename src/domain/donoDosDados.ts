// De quem são os dados guardados neste aparelho.
//
// Antes (spec estilo-spora, D-24), o aparelho tinha um conjunto só de dados, com um dono, e
// outra conta caía na tela "Este aparelho tem dados de outra conta". Agora cada conta tem o
// seu espaço (spec dados-por-conta, D-120 e D-122), e o dono marca a quem pertencem os dados
// sem prefixo, os de antes desta mudança (D-123).
import { armazenamentoDaConta } from './armazenamentoDaConta.ts'
import { CHAVES_DE_DADOS, expandirChaves } from './perfil.ts'
import { ehQuotaExcedida, type Armazenamento, type ArmazenamentoListavel } from './persistencia.ts'

export const CHAVE_DONO = 'metanutri:dono'

/**
 * Dado da pessoa que não entra no backup, mas também é dela (DP-2): o aviso de primeiro
 * acesso que ela já viu (CB-122) e a chave antiga dos alimentos frequentes, sem uso no app.
 */
export const OUTRAS_CHAVES_DA_PESSOA = ['metanutri:aviso-inicial-visto', 'metanutri:frequentes'] as const

const PREFIXO_CASO = 'metanutri:caso:'

/**
 * As chaves sem prefixo de conta que guardam dado da pessoa e existem no aparelho. Os planos
 * vêm primeiro, o índice depois: o que já foi movido nunca aponta para plano que ainda não foi.
 */
function chavesSemConta(base: ArmazenamentoListavel): string[] {
  const planos: string[] = []
  for (let i = 0; i < base.length; i += 1) {
    const chave = base.key(i)
    if (chave?.startsWith(PREFIXO_CASO)) planos.push(chave)
  }
  const doIndice = expandirChaves(base, ['metanutri:casos']).filter((c) => c.startsWith(PREFIXO_CASO))
  const todas = new Set([...planos, ...doIndice, ...CHAVES_DE_DADOS, ...OUTRAS_CHAVES_DA_PESSOA])
  return [...todas].filter((chave) => base.getItem(chave) !== null)
}

// ---------- Juntar o que já está na conta com o que veio de fora (D-127) ----------

/** JSON que não dá para ler volta `undefined`: quem chama trata como valor ilegível. */
function lerJson(texto: string): unknown {
  try {
    return JSON.parse(texto) as unknown
  } catch {
    return undefined
  }
}

type Id = string | number
const idDe = (item: unknown): Id | null => {
  if (typeof item !== 'object' || item === null) return null
  const id = (item as Record<string, unknown>)['id']
  return typeof id === 'string' || typeof id === 'number' ? id : null
}

/** Listas com id (pacientes, produtos, modelos): no mesmo id, fica o da conta. */
function juntarPorId(daConta: unknown, deFora: unknown): { readonly lista: unknown[] } | { readonly ilegivel: 'conta' | 'fora' } {
  if (!Array.isArray(daConta)) return { ilegivel: 'conta' }
  if (!Array.isArray(deFora)) return { ilegivel: 'fora' }
  const naConta = new Set(daConta.map(idDe))
  return { lista: [...daConta, ...deFora.filter((item) => idDe(item) !== null && !naConta.has(idDe(item)))] }
}

/** Listas simples (índice de planos, sugestões ocultas): a ordem da conta, depois o que faltava. */
function uniao(daConta: unknown, deFora: unknown): { readonly lista: unknown[] } | { readonly ilegivel: 'conta' | 'fora' } {
  if (!Array.isArray(daConta)) return { ilegivel: 'conta' }
  if (!Array.isArray(deFora)) return { ilegivel: 'fora' }
  return { lista: [...daConta, ...deFora.filter((v) => !daConta.includes(v))] }
}

const textos = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

/** O arquivo dos acompanhamentos: os itens juntam por id, e cada item leva as próprias marcas. */
function juntarAcompanhamentos(daConta: unknown, deFora: unknown): { readonly valor: unknown } | { readonly ilegivel: 'conta' | 'fora' } {
  const arquivo = (v: unknown) => (typeof v === 'object' && v !== null && Array.isArray((v as Record<string, unknown>)['itens']) ? (v as Record<string, unknown>) : null)
  const conta = arquivo(daConta)
  const fora = arquivo(deFora)
  if (!conta) return { ilegivel: 'conta' }
  if (!fora) return { ilegivel: 'fora' }
  const itensDaConta = conta['itens'] as unknown[]
  const naConta = new Set(itensDaConta.map(idDe))
  const trazidos = (fora['itens'] as unknown[]).filter((item) => idDe(item) !== null && !naConta.has(idDe(item)))
  const idsTrazidos = new Set(trazidos.map(idDe))
  const marcas = (campo: string) => [...new Set([...textos(conta[campo]), ...textos(fora[campo]).filter((id) => idsTrazidos.has(id))])]
  return { valor: { ...conta, itens: [...itensDaConta, ...trazidos], naNuvem: marcas('naNuvem'), pendentes: marcas('pendentes') } }
}

/**
 * O valor que fica na conta quando ela e o aparelho têm valores diferentes na mesma chave
 * (D-127). Configurações e o que não se sabe juntar ficam com o valor da conta. Valor de fora
 * que o app não lê fica de fora; valor da conta ilegível dá lugar ao de fora.
 */
function juntar(chave: string, daConta: string, deFora: string): string {
  const conta = lerJson(daConta)
  const fora = lerJson(deFora)
  const resultado =
    chave === 'metanutri:casos' || chave === 'metanutri:sugestoes-ocultas'
      ? uniao(conta, fora)
      : chave === 'metanutri:pacientes' || chave === 'metanutri:produtos' || chave === 'metanutri:modelos'
        ? juntarPorId(conta, fora)
        : chave === 'metanutri:acompanhamentos'
          ? juntarAcompanhamentos(conta, fora)
          : null
  if (resultado === null) return daConta
  if ('ilegivel' in resultado) return resultado.ilegivel === 'conta' ? deFora : daConta
  return JSON.stringify('lista' in resultado ? resultado.lista : resultado.valor)
}

/** Um plano como o repositório grava (`persistencia.ts`): o caso, com id, e quando foi salvo. */
function lerPlano(texto: string): (Record<string, unknown> & { readonly caso: Record<string, unknown>; readonly atualizadoEm: string }) | null {
  const v = lerJson(texto)
  if (typeof v !== 'object' || v === null) return null
  const o = v as Record<string, unknown>
  const caso = o['caso']
  if (typeof caso !== 'object' || caso === null || typeof (caso as Record<string, unknown>)['id'] !== 'string' || typeof o['atualizadoEm'] !== 'string') {
    return null
  }
  return { ...o, caso: caso as Record<string, unknown>, atualizadoEm: o['atualizadoEm'] }
}

/** Põe o plano no índice da conta, se ainda não estiver: plano fora do índice não aparece. */
function incluirNoIndice(destino: Armazenamento, id: string): void {
  const indice = textos(lerJson(destino.getItem('metanutri:casos') ?? '[]'))
  if (!indice.includes(id)) destino.setItem('metanutri:casos', JSON.stringify([...indice, id]))
}

/**
 * Grava na conta e só então tira do aparelho (DP-4). Sem espaço (DP-12), na mesma tarefa
 * síncrona: o valor fica em memória, a chave sem prefixo sai e a com prefixo é gravada; se ainda
 * assim não couber, a sem prefixo volta (cabe: o espaço dela acabou de ser liberado). Devolve se
 * a chave saiu do aparelho.
 */
function gravarETirar(base: ArmazenamentoListavel, destino: Armazenamento, chave: string, valor: string): boolean {
  const original = base.getItem(chave)
  if (destino.getItem(chave) !== valor) {
    try {
      destino.setItem(chave, valor)
    } catch (erro) {
      if (!ehQuotaExcedida(erro) || original === null) throw erro
      base.removeItem(chave)
      try {
        destino.setItem(chave, valor)
      } catch (deNovo) {
        base.setItem(chave, original)
        if (ehQuotaExcedida(deNovo)) return false
        throw deNovo
      }
    }
  }
  if (destino.getItem(chave) !== valor) {
    if (original !== null && base.getItem(chave) === null) base.setItem(chave, original)
    return false
  }
  base.removeItem(chave)
  return true
}

/**
 * Move um plano e o põe no índice da conta na hora (CA-473): plano fora do índice não aparece.
 * Se o índice não couber, o plano volta para onde estava e fica para a próxima entrada.
 */
function gravarPlanoETirar(base: ArmazenamentoListavel, destino: Armazenamento, chave: string, valor: string): boolean {
  const original = base.getItem(chave)
  const jaNaConta = destino.getItem(chave)
  if (!gravarETirar(base, destino, chave, valor)) return false
  try {
    incluirNoIndice(destino, chave.slice(PREFIXO_CASO.length))
    return true
  } catch (erro) {
    if (!ehQuotaExcedida(erro)) throw erro
    if (jaNaConta === null) destino.removeItem(chave)
    if (original !== null) base.setItem(chave, original)
    return false
  }
}

function moverDado(base: ArmazenamentoListavel, destino: Armazenamento, chave: string): void {
  const deFora = base.getItem(chave)
  if (deFora === null) return
  const daConta = destino.getItem(chave)
  gravarETirar(base, destino, chave, daConta === null || daConta === deFora ? deFora : juntar(chave, daConta, deFora))
}

/**
 * Dois planos diferentes com o mesmo id ficam os dois (D-127): o mais novo pelo `atualizadoEm`
 * fica com o id; o outro ganha id novo e entra no índice. A cópia com id novo é gravada antes de
 * mexer no id antigo: fechar no meio deixa, no pior caso, uma cópia a mais (DP-17), nunca menos.
 */
function moverPlano(base: ArmazenamentoListavel, destino: Armazenamento, chave: string, gerarId: () => string): void {
  const deFora = base.getItem(chave)
  if (deFora === null) return
  const daConta = destino.getItem(chave)
  if (daConta === null || daConta === deFora) {
    gravarPlanoETirar(base, destino, chave, deFora)
    return
  }
  const planoDeFora = lerPlano(deFora)
  const planoDaConta = lerPlano(daConta)
  if (planoDeFora === null) {
    base.removeItem(chave)
    return
  }
  if (planoDaConta === null) {
    gravarPlanoETirar(base, destino, chave, deFora)
    return
  }
  const deForaMaisNovo = planoDeFora.atualizadoEm > planoDaConta.atualizadoEm
  const maisVelho = deForaMaisNovo ? planoDaConta : planoDeFora
  const chaveNova = `${PREFIXO_CASO}${gerarId()}`
  destino.setItem(chaveNova, JSON.stringify({ ...maisVelho, caso: { ...maisVelho.caso, id: chaveNova.slice(PREFIXO_CASO.length) } }))
  try {
    incluirNoIndice(destino, chaveNova.slice(PREFIXO_CASO.length))
  } catch (erro) {
    // Sem índice a cópia não apareceria: sai, e o conflito fica para a próxima entrada.
    destino.removeItem(chaveNova)
    throw erro
  }
  if (deForaMaisNovo) gravarPlanoETirar(base, destino, chave, deFora)
  else base.removeItem(chave)
}

/**
 * `nada`: não havia dado sem conta. `incompleto`: o armazenamento encheu e sobrou dado sem
 * prefixo, que volta a ser tentado na próxima entrada (CA-473). `falhou`: o navegador não deixou
 * mexer no armazenamento.
 */
export type ResultadoMigracao = 'nada' | 'movido' | 'incompleto' | 'falhou'

export interface OpcoesMigracao {
  /** Id novo para o plano que perde o seu num conflito; o app gera ids de plano assim. */
  readonly gerarId?: () => string
}

/**
 * D-123: os dados sem prefixo vão para o espaço de quem é dono deles. Sem dono, a conta que
 * entra vira dona (CA-468). Com dono, vão para ele, mesmo que outra conta esteja entrando.
 *
 * Chave por chave (DP-4): copia, confere e só então apaga a original. Nenhuma chave some dos
 * dois lugares ao mesmo tempo, e rodar de novo termina o que ficou pela metade. Valor que já
 * existe na conta é juntado, nunca escondido (D-127, CA-472).
 */
export function migrarDadosSemConta(base: ArmazenamentoListavel | null, usuarioId: string, opcoes: OpcoesMigracao = {}): ResultadoMigracao {
  if (!base) return 'nada'
  const gerarId = opcoes.gerarId ?? (() => globalThis.crypto.randomUUID())
  try {
    const chaves = chavesSemConta(base)
    if (chaves.length === 0) return 'nada'

    // DP-6: o dono é marcado antes da primeira cópia e fica. Fechar o navegador no meio não
    // deixa os dados sem dono para a próxima conta que entrar.
    const donoAtual = base.getItem(CHAVE_DONO) || null
    const dono = donoAtual ?? usuarioId
    if (donoAtual === null) base.setItem(CHAVE_DONO, dono)
    const destino = armazenamentoDaConta(base, dono)

    // Uma chave que não coube não para as outras (CA-473).
    for (const chave of chaves) {
      try {
        if (chave.startsWith(PREFIXO_CASO)) moverPlano(base, destino, chave, gerarId)
        else moverDado(base, destino, chave)
      } catch (erro) {
        if (!ehQuotaExcedida(erro)) throw erro
      }
    }
    return chavesSemConta(base).length === 0 ? 'movido' : 'incompleto'
  } catch (erro) {
    // O que não foi movido continua onde estava.
    return ehQuotaExcedida(erro) ? 'incompleto' : 'falhou'
  }
}

/**
 * D-124: "Sair e apagar os dados deste aparelho" leva só o espaço da conta que sai. Se ela é a
 * dona dos dados sem prefixo, eles vão junto, e ela deixa de ser dona.
 */
export function apagarDadosDaConta(base: ArmazenamentoListavel | null, usuarioId: string): void {
  if (!base) return
  try {
    armazenamentoDaConta(base, usuarioId).clear()
    if (base.getItem(CHAVE_DONO) !== usuarioId) return
    for (const chave of chavesSemConta(base)) base.removeItem(chave)
    base.removeItem(CHAVE_DONO)
  } catch {
    // sem armazenamento: não há o que apagar
  }
}
