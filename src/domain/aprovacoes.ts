// As filas do administrador: comprovantes de estudante e CRN para conferir
// (spec conta-e-verificacao, US-B8). Os dados vêm das funções do banco.
import type { Crn, StatusCrn } from './situacao.ts'

export const URL_CONSULTA_CFN = 'https://cnn.cfn.org.br/application/index/consulta-nacional'

export interface PedidoParaAprovar {
  readonly id: string
  readonly usuario: string
  readonly nome: string
  readonly email: string
  readonly instituicao: string
  readonly matricula: string
  readonly periodo: number
  /** AAAA-MM. */
  readonly formatura: string
  readonly enviadoEm: string
  /** Nulo depois que o arquivo foi apagado. */
  readonly arquivo: string | null
}

export interface CrnParaConferir {
  readonly usuario: string
  readonly nome: string
  readonly email: string
  readonly crn: Crn
  readonly contaCriadaEm: string
  readonly status: StatusCrn
  readonly decididoEm: string | null
}

const txt = (v: unknown): string => (typeof v === 'string' ? v : '')

export function daLinhaPedidoParaAprovar(linha: unknown): PedidoParaAprovar | null {
  if (typeof linha !== 'object' || linha === null) return null
  const o = linha as Record<string, unknown>
  if (typeof o['id'] !== 'string' || typeof o['usuario'] !== 'string') return null
  return {
    id: o['id'],
    usuario: o['usuario'],
    nome: txt(o['nome']),
    email: txt(o['email']),
    instituicao: txt(o['instituicao']),
    matricula: txt(o['matricula']),
    periodo: typeof o['periodo'] === 'number' ? o['periodo'] : 0,
    formatura: txt(o['formatura']).slice(0, 7),
    enviadoEm: txt(o['enviado_em']),
    arquivo: typeof o['arquivo'] === 'string' ? o['arquivo'] : null,
  }
}

const STATUS: readonly string[] = ['em_conferencia', 'conferido', 'nao_encontrado']

export function daLinhaCrnParaConferir(linha: unknown): CrnParaConferir | null {
  if (typeof linha !== 'object' || linha === null) return null
  const o = linha as Record<string, unknown>
  const status = o['crn_status']
  if (typeof o['usuario'] !== 'string' || typeof o['crn_regiao'] !== 'number' || typeof status !== 'string' || !STATUS.includes(status)) return null
  return {
    usuario: o['usuario'],
    nome: txt(o['nome']),
    email: txt(o['email']),
    crn: { regiao: o['crn_regiao'], numero: txt(o['crn_numero']) },
    contaCriadaEm: txt(o['conta_criada_em']),
    status: status as StatusCrn,
    decididoEm: typeof o['crn_decidido_em'] === 'string' ? o['crn_decidido_em'] : null,
  }
}

export interface Pendentes {
  readonly estudantes: number
  readonly crn: number
  readonly total: number
}

/** CA-291: o que ainda espera decisão. Os CRN decididos nos últimos 30 dias não contam. */
export function contarPendentes(pedidos: readonly PedidoParaAprovar[], crns: readonly CrnParaConferir[]): Pendentes {
  const crn = crns.filter((c) => c.status === 'em_conferencia').length
  return { estudantes: pedidos.length, crn, total: pedidos.length + crn }
}
