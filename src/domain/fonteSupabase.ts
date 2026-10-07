// A mesma interface `FonteAcompanhamentos`, agora contra o Supabase. É o que faz o
// link do paciente abrir no aparelho dele. Nenhuma tela muda por causa deste arquivo.
//
// Duas pessoas diferentes chegam aqui:
//   - o paciente, sem conta, que só pode ler e marcar pelo token (funções RPC);
//   - o nutricionista, logado, que grava a linha inteira (tabela com RLS).
// Ver `supabase/001-acompanhamentos.sql`.
import { FALHA_DE_REDE, mensagemDoBanco } from '@/ui/estado/mensagemDoBanco.ts'
import type { Acompanhamento, MarcacaoDia } from './acompanhamento.ts'
import type { Missao } from './missoes.ts'
import type { FonteAcompanhamentos } from './repositorioAcompanhamentos.ts'

interface Resposta<T> {
  readonly data: T | null
  readonly error: { readonly message: string; readonly code?: string } | null
}

/** D-98: a tela recebe a frase traduzida, nunca o texto técnico do banco. */
const traduzido = (erro: { readonly message: string; readonly code?: string }): string => mensagemDoBanco(erro) ?? FALHA_DE_REDE

/** O pedaço do cliente Supabase que este arquivo usa — o resto não interessa aqui. */
export interface ClienteMissoes {
  rpc(nome: string, parametros: Record<string, unknown>): PromiseLike<Resposta<unknown>>
  from(tabela: string): {
    select(colunas: string): { eq(coluna: string, valor: string): PromiseLike<Resposta<unknown>> }
    upsert(linha: Record<string, unknown>, opcoes?: { onConflict?: string; ignoreDuplicates?: boolean }): PromiseLike<Resposta<unknown>>
    delete(): { eq(coluna: string, valor: string): PromiseLike<Resposta<unknown>> }
  }
  auth: {
    getSession(): PromiseLike<{ data: { session: { user: { id: string } } | null } }>
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

    async salvar(acompanhamento) {
      const { data } = await cliente.auth.getSession()
      const usuario = data.session?.user.id ?? null

      // Sem sessão é o paciente marcando: só as marcações, só na linha do token dele.
      if (usuario === null) {
        const { error } = await cliente.rpc('marcar_missoes', { p_token: acompanhamento.token, p_marcacoes: acompanhamento.marcacoes })
        if (error) avisar(traduzido(error))
        return acompanhamento
      }

      const { error } = await cliente.from(TABELA).upsert(paraLinha(acompanhamento, usuario), { onConflict: 'id' })
      if (error) avisar(traduzido(error))
      return acompanhamento
    },
  }
}

/**
 * Apaga da nuvem tudo que é deste nutricionista. É o que a LGPD chama de direito à
 * eliminação, e o que a tela de Configurações precisa para não prometer o que não faz.
 * Devolve a mensagem de erro já traduzida, ou nulo quando deu certo.
 */
export async function apagarAcompanhamentosDaNuvem(cliente: ClienteMissoes): Promise<string | null> {
  const { data } = await cliente.auth.getSession()
  const usuario = data.session?.user.id ?? null
  if (usuario === null) return null

  const { error } = await cliente.from(TABELA).delete().eq('nutricionista_id', usuario)
  return error ? traduzido(error) : null
}

// ---------- O lado do nutricionista: o link na nuvem (spec missoes-na-nuvem) ----------

/** A frase que o banco levanta quando o plano não comporta mais um link (supabase/010). */
export const LIMITE_DE_LINKS = 'Você chegou ao limite de links do seu plano.'

/** CA-439: a nuvem que não responde neste tempo conta como falha, em vez de prender a tela. */
export const PRAZO_DA_NUVEM_MS = 15_000

/** Corre a ida à nuvem contra o relógio. Exceção e demora viram a falha de rede de sempre. */
async function comPrazo<T>(ida: () => Promise<T>, falhou: (mensagem: string) => T): Promise<T> {
  let relogio: ReturnType<typeof setTimeout> | undefined
  const esgotou = new Promise<T>((resolver) => {
    relogio = setTimeout(() => resolver(falhou(FALHA_DE_REDE)), PRAZO_DA_NUVEM_MS)
  })
  try {
    return await Promise.race([ida().catch(() => falhou(FALHA_DE_REDE)), esgotou])
  } finally {
    clearTimeout(relogio)
  }
}

const mensagem = (texto: string): string => texto

async function usuarioDaSessao(cliente: ClienteMissoes): Promise<string | null> {
  const { data } = await cliente.auth.getSession()
  return data.session?.user.id ?? null
}

export type LeituraDaNuvem =
  | { readonly tipo: 'sem-conta' }
  | { readonly tipo: 'lida'; readonly itens: readonly Acompanhamento[] }
  | { readonly tipo: 'falhou'; readonly mensagem: string }

/**
 * D-104: os links da conta, com o que o paciente marcou no celular dele. Filtra pelo dono
 * além do RLS: uma política mais larga no futuro não pode trazer paciente de outra conta.
 */
export async function listarAcompanhamentosDaNuvem(cliente: ClienteMissoes): Promise<LeituraDaNuvem> {
  return comPrazo<LeituraDaNuvem>(
    async () => {
      const usuario = await usuarioDaSessao(cliente)
      if (usuario === null) return { tipo: 'sem-conta' }
      const { data, error } = await cliente.from(TABELA).select('*').eq('nutricionista_id', usuario)
      if (error) return { tipo: 'falhou', mensagem: traduzido(error) }
      const linhas: readonly unknown[] = Array.isArray(data) ? data : []
      return { tipo: 'lida', itens: linhas.map(daLinha).filter((a): a is Acompanhamento => a !== null) }
    },
    (texto) => ({ tipo: 'falhou', mensagem: texto }),
  )
}

/** Cria a linha só se ela ainda não existe: o que já está na nuvem nunca é sobrescrito. */
async function criarSeFaltar(cliente: ClienteMissoes, a: Acompanhamento, usuario: string): Promise<string | null> {
  const { error } = await cliente.from(TABELA).upsert(paraLinha(a, usuario), { onConflict: 'id', ignoreDuplicates: true })
  return error ? traduzido(error) : null
}

/**
 * D-105: sobe um link que só existe neste aparelho, com as marcações feitas aqui. Se a
 * linha já estiver na nuvem, nada muda (CB-105). Devolve o motivo, se não subiu.
 */
export async function subirAcompanhamento(cliente: ClienteMissoes, a: Acompanhamento): Promise<string | null> {
  return comPrazo<string | null>(async () => {
    const usuario = await usuarioDaSessao(cliente)
    return usuario === null ? null : criarSeFaltar(cliente, a, usuario)
  }, mensagem)
}

/**
 * D-103: criar, gerar de novo ou mudar o link. Em dois passos, para não apagar o que o
 * paciente marcou no celular depois que esta tela leu a nuvem: primeiro cria a linha se
 * faltar (com as marcações daqui); depois atualiza o resto, sem tocar nas marcações.
 */
export async function salvarLinkNaNuvem(cliente: ClienteMissoes, a: Acompanhamento): Promise<string | null> {
  return comPrazo<string | null>(async () => {
    const usuario = await usuarioDaSessao(cliente)
    if (usuario === null) return null
    const criado = await criarSeFaltar(cliente, a, usuario)
    if (criado !== null) return criado
    const semMarcacoes = Object.fromEntries(Object.entries(paraLinha(a, usuario)).filter(([coluna]) => coluna !== 'marcacoes'))
    const { error } = await cliente.from(TABELA).upsert(semMarcacoes, { onConflict: 'id' })
    return error ? traduzido(error) : null
  }, mensagem)
}

/** CA-440: tira um link da nuvem. Devolve o erro traduzido, ou nulo quando deu certo. */
export async function removerAcompanhamentoDaNuvem(cliente: ClienteMissoes, id: string): Promise<string | null> {
  return comPrazo<string | null>(async () => {
    const usuario = await usuarioDaSessao(cliente)
    if (usuario === null) return null
    const { error } = await cliente.from(TABELA).delete().eq('id', id)
    return error ? traduzido(error) : null
  }, mensagem)
}
