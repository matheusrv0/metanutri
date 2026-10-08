// A mesma interface `FonteAcompanhamentos`, agora contra o Supabase. É o que faz o
// link do paciente abrir no aparelho dele. Nenhuma tela muda por causa deste arquivo.
//
// Duas pessoas diferentes chegam aqui:
//   - o paciente, que só lê e marca pelo token (funções RPC), com conta ou sem;
//   - o nutricionista, logado, que grava o link pelas funções do fim do arquivo (tabela com RLS).
// Ver `supabase/001-acompanhamentos.sql`.
import { FALHA_DE_REDE, mensagemDoBanco } from '@/ui/estado/mensagemDoBanco.ts'
import type { Acompanhamento, MarcacaoDia } from './acompanhamento.ts'
import type { Missao } from './missoes.ts'
import type { FonteAcompanhamentos } from './repositorioAcompanhamentos.ts'

interface ErroDoBanco {
  readonly message: string
  readonly code?: string
}

interface Resposta<T> {
  readonly data: T | null
  readonly error: ErroDoBanco | null
}

/** D-98: a tela recebe a frase traduzida, nunca o texto técnico do banco. */
const traduzido = (erro: ErroDoBanco): string => mensagemDoBanco(erro) ?? FALHA_DE_REDE

/** Um pedido ao banco. O do cliente de verdade aceita um sinal para desistir dele (CA-439). */
type Pedido = PromiseLike<Resposta<unknown>> & { abortSignal?(sinal: AbortSignal): PromiseLike<Resposta<unknown>> }

/** O pedaço do cliente Supabase que este arquivo usa — o resto não interessa aqui. */
export interface ClienteMissoes {
  rpc(nome: string, parametros: Record<string, unknown>): Pedido
  from(tabela: string): {
    select(colunas: string): { eq(coluna: string, valor: string): Pedido }
    upsert(linha: Record<string, unknown>, opcoes?: { onConflict?: string; ignoreDuplicates?: boolean }): Pedido & { select(colunas: string): Pedido }
    update(campos: Record<string, unknown>): { eq(coluna: string, valor: string): { select(colunas: string): Pedido } }
    delete(): { eq(coluna: string, valor: string): Pedido }
  }
  auth: {
    getSession(): PromiseLike<{ data: { session: { user: { id: string } } | null }; error?: { readonly message: string } | null }>
  }
}

const TABELA = 'acompanhamentos'

function ehListaDeMissoes(v: unknown): v is readonly Missao[] {
  return Array.isArray(v) && v.every((m) => typeof m === 'object' && m !== null && typeof (m as Missao).id === 'string')
}

function ehListaDeMarcacoes(v: unknown): v is readonly MarcacaoDia[] {
  return Array.isArray(v) && v.every((m) => typeof m === 'object' && m !== null && typeof (m as MarcacaoDia).dia === 'string' && Array.isArray((m as MarcacaoDia).feitas))
}

/** Linha do banco → acompanhamento. Devolve nulo se vier coisa que não dá para usar. */
export function daLinha(linha: unknown): Acompanhamento | null {
  if (typeof linha !== 'object' || linha === null) return null
  const o = linha as Record<string, unknown>
  if (typeof o['id'] !== 'string' || typeof o['token'] !== 'string' || typeof o['caso_id'] !== 'string') return null

  return {
    id: o['id'],
    token: o['token'],
    casoId: o['caso_id'],
    pacienteId: typeof o['paciente_id'] === 'string' ? o['paciente_id'] : null,
    nome: typeof o['nome'] === 'string' ? o['nome'] : '',
    criadoEm: typeof o['criado_em'] === 'string' ? o['criado_em'] : new Date().toISOString(),
    missoes: ehListaDeMissoes(o['missoes']) ? o['missoes'] : [],
    marcacoes: ehListaDeMarcacoes(o['marcacoes']) ? o['marcacoes'] : [],
    // Na dúvida, avisa. Linha antiga sem a coluna vira link de estudante e mostra o
    // aviso — errar para o lado de avisar demais é o lado certo aqui.
    usoNaoComercial: o['uso_nao_comercial'] !== false,
  }
}

function paraLinha(a: Acompanhamento, nutricionistaId: string): Record<string, unknown> {
  return {
    id: a.id,
    nutricionista_id: nutricionistaId,
    token: a.token,
    caso_id: a.casoId,
    paciente_id: a.pacienteId,
    nome: a.nome,
    criado_em: a.criadoEm,
    missoes: a.missoes,
    marcacoes: a.marcacoes,
    uso_nao_comercial: a.usoNaoComercial,
  }
}

export interface OpcoesFonteSupabase {
  /** Chamado quando a rede falha, para a tela poder avisar em vez de fingir que salvou. */
  readonly aoFalhar?: (mensagem: string) => void
}

export function fonteSupabase(cliente: ClienteMissoes, opcoes: OpcoesFonteSupabase = {}): FonteAcompanhamentos {
  const avisar = opcoes.aoFalhar ?? (() => undefined)

  return {
    naNuvem: true,

    async porToken(token) {
      if (!token) return null
      const { data, error } = await cliente.rpc('missoes_por_token', { p_token: token })
      if (error) {
        avisar(traduzido(error))
        return null
      }
      // A função devolve uma tabela: vem lista, mesmo com uma linha só.
      const linha = Array.isArray(data) ? data[0] : data
      return daLinha(linha)
    },

    /**
     * A tela do paciente grava só as marcações, pela função, com conta ou sem. Gravar a
     * linha inteira daqui deixaria uma aba velha (ou a nutricionista testando o link no
     * próprio aparelho) desfazer o token novo e as missões do link.
     */
    async salvar(acompanhamento) {
      const { error } = await cliente.rpc('marcar_missoes', { p_token: acompanhamento.token, p_marcacoes: acompanhamento.marcacoes })
      if (error) avisar(traduzido(error))
      return acompanhamento
    },
  }
}

/**
 * O dono da sessão. Servidor ligado e sem sessão (ou com a sessão falhando, como o token
 * vencido sem internet) é nulo, e quem chama trata como falha: nunca como "deu certo".
 */
async function usuarioDaSessao(cliente: { readonly auth: ClienteMissoes['auth'] }): Promise<string | null> {
  const { data, error } = await cliente.auth.getSession()
  if (error) return null
  return data.session?.user.id ?? null
}

/**
 * O dono da sessão, desde que seja a conta para a qual o aparelho está trabalhando (spec
 * dados-por-conta, CA-474). A sessão que trocou de conta no meio de uma leitura é nula, e nada é
 * pedido: o link de uma conta nunca vai para a outra. Sem conta esperada, vale a da sessão.
 */
async function usuarioEsperado(cliente: { readonly auth: ClienteMissoes['auth'] }, esperado: string | null | undefined): Promise<string | null> {
  const usuario = await usuarioDaSessao(cliente)
  if (usuario === null) return null
  return esperado === undefined || esperado === null || esperado === usuario ? usuario : null
}

/**
 * Apaga da nuvem tudo que é deste nutricionista. É o que a LGPD chama de direito à
 * eliminação, e o que a tela de Configurações precisa para não prometer o que não faz.
 * Devolve a mensagem de erro já traduzida, ou nulo quando deu certo.
 */
export async function apagarAcompanhamentosDaNuvem(cliente: ClienteMissoes, esperado?: string | null): Promise<string | null> {
  const usuario = await usuarioEsperado(cliente, esperado)
  if (usuario === null) return FALHA_DE_REDE

  const { error } = await cliente.from(TABELA).delete().eq('nutricionista_id', usuario)
  return error ? traduzido(error) : null
}

// ---------- O lado do nutricionista: o link na nuvem (spec missoes-na-nuvem) ----------

/**
 * A frase que o banco levanta quando o plano não comporta mais um link (supabase/010,
 * `errcode 'P0001'`). É a única cópia dela no app: o cliente e os testes usam esta.
 */
export const LIMITE_DE_LINKS = 'Você chegou ao limite de links do seu plano.'

/** O P0001 é de qualquer `raise exception`: o limite é o P0001 com esta frase. */
const ehLimiteDeLinks = (erro: ErroDoBanco): boolean => erro.code === 'P0001' && erro.message === LIMITE_DE_LINKS

/** O motivo que a tela mostra para um erro do banco ao gravar o link. */
const motivoDoErro = (erro: ErroDoBanco): string => (ehLimiteDeLinks(erro) ? LIMITE_DE_LINKS : traduzido(erro))

/** CA-439: a nuvem que não responde neste tempo conta como falha, em vez de prender a tela. */
export const PRAZO_DA_NUVEM_MS = 15_000

/**
 * Corre a ida à nuvem contra o relógio. Exceção e demora viram a falha de rede de sempre,
 * e na demora o pedido é cancelado, para não chegar ao banco depois que a tela desistiu.
 */
async function comPrazo<T>(ida: (sinal: AbortSignal) => Promise<T>, falhou: (mensagem: string) => T): Promise<T> {
  const controle = new AbortController()
  let relogio: ReturnType<typeof setTimeout> | undefined
  const esgotou = new Promise<T>((resolver) => {
    relogio = setTimeout(() => {
      controle.abort()
      resolver(falhou(FALHA_DE_REDE))
    }, PRAZO_DA_NUVEM_MS)
  })
  try {
    return await Promise.race([ida(controle.signal).catch(() => falhou(FALHA_DE_REDE)), esgotou])
  } finally {
    clearTimeout(relogio)
  }
}

/** Liga o sinal de desistir ao pedido, quando o cliente sabe desistir. */
const comSinal = (pedido: Pedido, sinal: AbortSignal): PromiseLike<Resposta<unknown>> => (pedido.abortSignal ? pedido.abortSignal(sinal) : pedido)

const mensagem = (texto: string): string => texto

/** O pedido devolveu ao menos uma linha (`.select('id')` depois de gravar). */
const tocouAlgumaLinha = (data: unknown): boolean => Array.isArray(data) && data.length > 0

export type LeituraDaNuvem = { readonly tipo: 'lida'; readonly itens: readonly Acompanhamento[] } | { readonly tipo: 'falhou'; readonly mensagem: string }

/**
 * D-104: os links da conta, com o que o paciente marcou no celular dele. Filtra pelo dono
 * além do RLS: uma política mais larga no futuro não pode trazer paciente de outra conta.
 * Qualquer coisa que não seja uma lista é falha: lista vazia faria o aparelho apagar links (CB-107).
 */
export async function listarAcompanhamentosDaNuvem(cliente: ClienteMissoes, esperado?: string | null): Promise<LeituraDaNuvem> {
  return comPrazo<LeituraDaNuvem>(
    async (sinal) => {
      const usuario = await usuarioEsperado(cliente, esperado)
      if (usuario === null) return { tipo: 'falhou', mensagem: FALHA_DE_REDE }
      const { data, error } = await comSinal(cliente.from(TABELA).select('*').eq('nutricionista_id', usuario), sinal)
      if (error) return { tipo: 'falhou', mensagem: traduzido(error) }
      if (!Array.isArray(data)) return { tipo: 'falhou', mensagem: FALHA_DE_REDE }
      const linhas: readonly unknown[] = data
      return { tipo: 'lida', itens: linhas.map(daLinha).filter((a): a is Acompanhamento => a !== null) }
    },
    (texto) => ({ tipo: 'falhou', mensagem: texto }),
  )
}

/**
 * D-105: sobe um link que só existe neste aparelho, com as marcações feitas aqui. Só cria:
 * se a linha já estiver na nuvem, nada muda (CB-105). Devolve o motivo, se não subiu.
 */
export async function subirAcompanhamento(cliente: ClienteMissoes, a: Acompanhamento, esperado?: string | null): Promise<string | null> {
  return comPrazo<string | null>(async (sinal) => {
    const usuario = await usuarioEsperado(cliente, esperado)
    if (usuario === null) return FALHA_DE_REDE
    const { error } = await comSinal(cliente.from(TABELA).upsert(paraLinha(a, usuario), { onConflict: 'id', ignoreDuplicates: true }), sinal)
    return error ? motivoDoErro(error) : null
  }, mensagem)
}

/** O que aconteceu ao gravar o link. `sumiu`: a linha não está mais na nuvem (CB-107). */
export type ResultadoDoLink = { readonly tipo: 'salvo' } | { readonly tipo: 'sumiu' } | { readonly tipo: 'falhou'; readonly motivo: string }

/**
 * D-103: criar, gerar de novo ou mudar o link.
 *
 * Link que nunca esteve na nuvem: cria a linha se faltar (com as marcações daqui); se
 * acabou de criar, pronto. Se já existia, ou se o link já esteve na nuvem, atualiza o resto
 * pelo id, sem tocar nas marcações que o paciente fez no celular. A atualização nunca
 * recria: linha apagada em outro aparelho volta como `sumiu`, não como link de novo (CB-107).
 */
export async function salvarLinkNaNuvem(
  cliente: ClienteMissoes,
  a: Acompanhamento,
  opcoes: { readonly jaEsteveNaNuvem: boolean; readonly esperado?: string | null },
): Promise<ResultadoDoLink> {
  return comPrazo<ResultadoDoLink>(
    async (sinal) => {
      const usuario = await usuarioEsperado(cliente, opcoes.esperado)
      if (usuario === null) return { tipo: 'falhou', motivo: FALHA_DE_REDE }
      const linha = paraLinha(a, usuario)

      if (!opcoes.jaEsteveNaNuvem) {
        const criado = await comSinal(cliente.from(TABELA).upsert(linha, { onConflict: 'id', ignoreDuplicates: true }).select('id'), sinal)
        if (criado.error) return { tipo: 'falhou', motivo: motivoDoErro(criado.error) }
        if (tocouAlgumaLinha(criado.data)) return { tipo: 'salvo' }
      }

      const semMarcacoes = Object.fromEntries(Object.entries(linha).filter(([coluna]) => coluna !== 'marcacoes'))
      const atualizado = await comSinal(cliente.from(TABELA).update(semMarcacoes).eq('id', a.id).select('id'), sinal)
      if (atualizado.error) return { tipo: 'falhou', motivo: motivoDoErro(atualizado.error) }
      // Só uma lista vazia diz que a linha sumiu; resposta sem lista não diz nada, é falha.
      if (!Array.isArray(atualizado.data)) return { tipo: 'falhou', motivo: FALHA_DE_REDE }
      return tocouAlgumaLinha(atualizado.data) ? { tipo: 'salvo' } : { tipo: 'sumiu' }
    },
    (motivo) => ({ tipo: 'falhou', motivo }),
  )
}

/** CA-440: tira um link da nuvem. Devolve o erro traduzido, ou nulo quando deu certo. */
export async function removerAcompanhamentoDaNuvem(cliente: ClienteMissoes, id: string, esperado?: string | null): Promise<string | null> {
  return comPrazo<string | null>(async (sinal) => {
    const usuario = await usuarioEsperado(cliente, esperado)
    if (usuario === null) return FALHA_DE_REDE
    const { error } = await comSinal(cliente.from(TABELA).delete().eq('id', id), sinal)
    return error ? traduzido(error) : null
  }, mensagem)
}
