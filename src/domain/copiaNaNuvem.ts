// A cópia da conta na nuvem: uma linha por conta em `copias` (supabase/002-copia-na-nuvem.sql).
//
// Ela é a fonte da verdade dos dados da conta (spec dados-na-nuvem, D-128); o navegador guarda só
// a cópia de trabalho. Este arquivo só lê e grava a linha. Quem decide quando, e como juntar duas
// versões, é o motor de sincronia (`sincronia.ts`), com as regras de `copiaDaConta.ts`.
//
// Gravar confere a versão (D-132): o `update` só pega a linha se o `atualizado_em` ainda for o
// que este aparelho conhece. Nenhuma linha atualizada quer dizer que outro aparelho salvou antes.
import { COPIA_GRANDE_DEMAIS, mensagemDoBanco } from '@/ui/estado/mensagemDoBanco.ts'
import { PRAZO_DA_NUVEM_MS } from './fonteSupabase.ts'
import type { Backup } from './perfil.ts'

interface Resposta {
  readonly data: unknown
  readonly error: { readonly message: string; readonly code?: string } | null
  /** O status HTTP. O servidor pode recusar a cópia grande antes de ela chegar ao banco (413, R-41). */
  readonly status?: number
}

/** O pedaço do cliente do Supabase que a cópia usa. */
export interface ClienteDaCopia {
  from(tabela: string): {
    select(colunas: string): { eq(coluna: string, valor: string): { maybeSingle(): PromiseLike<Resposta> } }
    insert(linha: Record<string, unknown>): { select(colunas: string): PromiseLike<Resposta> }
    update(campos: Record<string, unknown>): { eq(coluna: string, valor: string): { eq(coluna: string, valor: string): { select(colunas: string): PromiseLike<Resposta> } } }
  }
  auth: {
    getSession(): PromiseLike<{ data: { session: { user: { id: string } } | null } }>
  }
}

const TABELA = 'copias'

/** `formato`: a linha existe, mas não é uma cópia que este MetaNutri saiba ler (nunca vira cópia vazia). */
export type Leitura =
  | { readonly tipo: 'lida'; readonly copia: Backup | null; readonly versao: string | null }
  | { readonly tipo: 'falhou'; readonly motivo: 'rede' | 'formato' }

/** `mudou`: outro aparelho salvou depois da versão conhecida; nada foi gravado. */
export type Gravacao = { readonly tipo: 'gravada'; readonly versao: string } | { readonly tipo: 'mudou' } | { readonly tipo: 'falhou'; readonly motivo: 'rede' | 'grande' }

export interface PedidoDeGravar {
  readonly copia: Backup
  /** O `atualizado_em` da nuvem que este aparelho conhece; `null` quando não há linha. */
  readonly versao: string | null
  readonly aparelho: string
  /** A conta dona dos dados: com a sessão de outra, nada é pedido (spec dados-por-conta, CA-474). */
  readonly esperado: string
  /** A versão nova. Escrita pelo aparelho, serve só para conferir (DP-5). */
  readonly agora: string
}

export function ehBackup(v: unknown): v is Backup {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Partial<Backup>
  if (o.formato !== 1 || typeof o.geradoEm !== 'string' || typeof o.dados !== 'object' || o.dados === null) return false
  return Object.values(o.dados).every((valor) => typeof valor === 'string')
}

/** Nome curto do aparelho, só para a pessoa reconhecer de onde veio a cópia. */
export function apelidoDoAparelho(agente: string): string {
  if (/android/i.test(agente)) return 'Celular Android'
  if (/iphone|ipad|ipod/i.test(agente)) return 'iPhone ou iPad'
  if (/macintosh|mac os/i.test(agente)) return 'Mac'
  if (/windows/i.test(agente)) return 'Windows'
  if (/linux/i.test(agente)) return 'Linux'
  return 'Este aparelho'
}

/** A conta da sessão, se for a esperada. Sem sessão, ou com a de outra conta, nada é pedido. */
async function sessaoDa(cliente: ClienteDaCopia, esperado: string): Promise<boolean> {
  const { data } = await cliente.auth.getSession()
  return data.session?.user.id === esperado
}

/**
 * Corre a ida à nuvem contra o relógio (DP-7). Exceção e demora viram a falha de rede. O pedido que
 * chegar depois é resolvido pela conferência de versão: a próxima gravação vê "mudou" e junta.
 */
async function comPrazo<T>(ida: () => Promise<T>, prazoMs: number, naFalha: T): Promise<T> {
  let relogio: ReturnType<typeof setTimeout> | undefined
  const esgotou = new Promise<T>((resolver) => {
    relogio = setTimeout(() => resolver(naFalha), prazoMs)
  })
  try {
    return await Promise.race([ida().catch(() => naFalha), esgotou])
  } finally {
    clearTimeout(relogio)
  }
}

const versaoDa = (linhas: unknown, reserva: string): string => {
  const primeira: unknown = Array.isArray(linhas) ? linhas[0] : linhas
  const valor = typeof primeira === 'object' && primeira !== null ? (primeira as Record<string, unknown>)['atualizado_em'] : undefined
  return typeof valor === 'string' ? valor : reserva
}

/** CB-123: a cópia passou da trava de tamanho, no banco (D-107) ou antes dele (413). O resto é rede. */
const motivoDa = (resposta: Resposta): 'rede' | 'grande' =>
  resposta.status === 413 || (resposta.error !== null && mensagemDoBanco(resposta.error) === COPIA_GRANDE_DEMAIS) ? 'grande' : 'rede'

const FALHA_DE_LEITURA: Leitura = { tipo: 'falhou', motivo: 'rede' }
const FALHA_DE_GRAVACAO: Gravacao = { tipo: 'falhou', motivo: 'rede' }

export function lerCopia(cliente: ClienteDaCopia, esperado: string, prazoMs = PRAZO_DA_NUVEM_MS): Promise<Leitura> {
  return comPrazo(
    async () => {
      if (!(await sessaoDa(cliente, esperado))) return FALHA_DE_LEITURA
      const resposta = await cliente.from(TABELA).select('dados, atualizado_em').eq('nutricionista_id', esperado).maybeSingle()
      if (resposta.error) return FALHA_DE_LEITURA
      if (resposta.data === null) return { tipo: 'lida', copia: null, versao: null }
      const linha = resposta.data as Record<string, unknown>
      const dados = linha['dados']
      const versao = linha['atualizado_em']
      if (!ehBackup(dados) || typeof versao !== 'string') return { tipo: 'falhou', motivo: 'formato' }
      return { tipo: 'lida', copia: dados, versao }
    },
    prazoMs,
    FALHA_DE_LEITURA,
  )
}

export type LeituraDaVersao = { readonly tipo: 'lida'; readonly versao: string | null } | { readonly tipo: 'falhou' }

const FALHA_DA_VERSAO: LeituraDaVersao = { tipo: 'falhou' }

/** Só a versão da linha (DP-20): conferir se outro aparelho salvou custa um pedido pequeno. */
export function lerVersao(cliente: ClienteDaCopia, esperado: string, prazoMs = PRAZO_DA_NUVEM_MS): Promise<LeituraDaVersao> {
  return comPrazo(
    async (): Promise<LeituraDaVersao> => {
      if (!(await sessaoDa(cliente, esperado))) return FALHA_DA_VERSAO
      const resposta = await cliente.from(TABELA).select('atualizado_em').eq('nutricionista_id', esperado).maybeSingle()
      if (resposta.error) return FALHA_DA_VERSAO
      if (resposta.data === null) return { tipo: 'lida', versao: null }
      const versao = (resposta.data as Record<string, unknown>)['atualizado_em']
      return typeof versao === 'string' ? { tipo: 'lida', versao } : FALHA_DA_VERSAO
    },
    prazoMs,
    FALHA_DA_VERSAO,
  )
}

export function gravarCopia(cliente: ClienteDaCopia, pedido: PedidoDeGravar, prazoMs = PRAZO_DA_NUVEM_MS): Promise<Gravacao> {
  return comPrazo(
    async (): Promise<Gravacao> => {
      const { copia, versao, aparelho, esperado, agora } = pedido
      if (!(await sessaoDa(cliente, esperado))) return FALHA_DE_GRAVACAO
      const campos = { dados: copia, aparelho, atualizado_em: agora }

      if (versao === null) {
        const resposta = await cliente
          .from(TABELA)
          .insert({ nutricionista_id: esperado, ...campos })
          .select('atualizado_em')
        // A linha nasceu em outro aparelho depois da última leitura daqui.
        if (resposta.error?.code === '23505') return { tipo: 'mudou' }
        if (resposta.error || resposta.status === 413) return { tipo: 'falhou', motivo: motivoDa(resposta) }
        return { tipo: 'gravada', versao: versaoDa(resposta.data, agora) }
      }

      const resposta = await cliente.from(TABELA).update(campos).eq('nutricionista_id', esperado).eq('atualizado_em', versao).select('atualizado_em')
      if (resposta.error || resposta.status === 413) return { tipo: 'falhou', motivo: motivoDa(resposta) }
      if (!Array.isArray(resposta.data)) return FALHA_DE_GRAVACAO
      if (resposta.data.length === 0) return { tipo: 'mudou' }
      return { tipo: 'gravada', versao: versaoDa(resposta.data, agora) }
    },
    prazoMs,
    FALHA_DE_GRAVACAO,
  )
}
