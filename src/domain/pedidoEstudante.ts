// Pedido do plano Estudante: comprovante de matrícula e dados do curso (spec
// conta-e-verificacao, D-41 a D-43). Quem aprova é o administrador, no banco.
import type { Assinatura } from './assinatura.ts'

export type StatusPedido = 'em_analise' | 'aprovado' | 'recusado'
const STATUS_PEDIDO: readonly string[] = ['em_analise', 'aprovado', 'recusado']

export interface PedidoEstudante {
  readonly id: string
  readonly instituicao: string
  readonly matricula: string
  readonly periodo: number
  /** AAAA-MM. */
  readonly formatura: string
  readonly status: StatusPedido
  readonly motivo: string | null
  readonly enviadoEm: string
  readonly decididoEm: string | null
  readonly avisoFechado: boolean
}

export function daLinhaPedido(linha: unknown): PedidoEstudante | null {
  if (typeof linha !== 'object' || linha === null) return null
  const o = linha as Record<string, unknown>
  const status = o['status']
  if (typeof o['id'] !== 'string' || typeof status !== 'string' || !STATUS_PEDIDO.includes(status)) return null
  return {
    id: o['id'],
    instituicao: typeof o['instituicao'] === 'string' ? o['instituicao'] : '',
    matricula: typeof o['matricula'] === 'string' ? o['matricula'] : '',
    periodo: typeof o['periodo'] === 'number' ? o['periodo'] : 0,
    formatura: typeof o['formatura'] === 'string' ? o['formatura'].slice(0, 7) : '',
    status: status as StatusPedido,
    motivo: typeof o['motivo'] === 'string' ? o['motivo'] : null,
    enviadoEm: typeof o['enviado_em'] === 'string' ? o['enviado_em'] : '',
    decididoEm: typeof o['decidido_em'] === 'string' ? o['decidido_em'] : null,
    avisoFechado: o['aviso_fechado'] === true,
  }
}

/** D-43: até 5 MB, PDF, JPG ou PNG. O balde do Storage tem o mesmo limite. */
export const ARQUIVO_MAXIMO_BYTES = 5 * 1024 * 1024
export const TIPOS_DE_ARQUIVO: readonly string[] = ['application/pdf', 'image/jpeg', 'image/png']
export const ACEITA_ARQUIVO = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png'

export interface DadosPedido {
  readonly instituicao: string
  readonly matricula: string
  readonly periodo: number | null
  /** AAAA-MM, ou vazio. */
  readonly formatura: string
  readonly arquivo: { readonly tipo: string; readonly tamanho: number } | null
}

export type ErroPedido = 'instituicao' | 'matricula' | 'periodo' | 'formatura' | 'arquivo-vazio' | 'arquivo-tipo' | 'arquivo-grande'

export const MENSAGEM_ERRO_PEDIDO: Readonly<Record<ErroPedido, string>> = {
  instituicao: 'Escreva o nome da instituição.',
  matricula: 'Escreva o número da matrícula.',
  periodo: 'Escolha o período que você está cursando.',
  formatura: 'Escolha a previsão de formatura, deste mês em diante.',
  'arquivo-vazio': 'Escolha o arquivo do comprovante.',
  'arquivo-tipo': 'O comprovante precisa ser PDF, JPG ou PNG.',
  'arquivo-grande': 'O comprovante passa de 5 MB. Tire uma foto menor ou exporte o PDF de novo.',
}

const MES = /^\d{4}-(0[1-9]|1[0-2])$/

export const mesAtual = (hoje: Date): string => `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

export function validarPedido(dados: DadosPedido, hoje: Date): ErroPedido | null {
  if (dados.instituicao.trim().length < 2) return 'instituicao'
  if (dados.matricula.trim().length < 3) return 'matricula'
  if (dados.periodo === null || dados.periodo < 1 || dados.periodo > 12) return 'periodo'
  if (!MES.test(dados.formatura) || dados.formatura < mesAtual(hoje)) return 'formatura'
  if (!dados.arquivo) return 'arquivo-vazio'
  if (!TIPOS_DE_ARQUIVO.includes(dados.arquivo.tipo)) return 'arquivo-tipo'
  if (dados.arquivo.tamanho > ARQUIVO_MAXIMO_BYTES) return 'arquivo-grande'
  return null
}

/** CA-295: motivos prontos; "Outro motivo" é escrito à mão. */
export const MOTIVOS_RECUSA: readonly string[] = ['Ilegível', 'Sem o seu nome', 'Não mostra o semestre atual', 'Outro curso']

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "2027-07" → "julho de 2027", sem passar por Date (que puxaria o fuso). */
export function formatarMesAno(mes: string): string {
  const [ano, numero] = mes.split('-')
  const nome = MESES[Number(numero) - 1]
  return nome && ano ? `${nome} de ${ano}` : mes
}

/** A data no dia de quem usa (São Paulo), por extenso: "31 de julho de 2027". */
export function formatarDataLonga(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' })
}

/** Pasta da pessoa no balde e um nome sem acento nem espaço, para não quebrar a URL. */
export function caminhoDoComprovante(usuarioId: string, nomeDoArquivo: string, agora: Date): string {
  const ponto = nomeDoArquivo.lastIndexOf('.')
  const base = ponto > 0 ? nomeDoArquivo.slice(0, ponto) : nomeDoArquivo
  const extensao = ponto > 0 ? nomeDoArquivo.slice(ponto + 1).toLowerCase() : ''
  const seguro = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'comprovante'
  return `${usuarioId}/${agora.getTime()}-${seguro}${extensao ? `.${extensao}` : ''}`
}

export type AvisoEstudante =
  | { readonly tipo: 'enviar' }
  | { readonly tipo: 'renovar' }
  | { readonly tipo: 'analise' }
  | { readonly tipo: 'recusado'; readonly motivo: string }
  | { readonly tipo: 'aprovado'; readonly pedidoId: string; readonly expiraEm: string }
  | null

/** CA-279 e CA-285: o aviso que a estudante vê no painel. */
export function avisoDoEstudante(pedido: PedidoEstudante | null, assinatura: Assinatura): AvisoEstudante {
  const estudanteVencido = assinatura.planoPedido === 'estudante' && assinatura.status === 'vencida'
  if (!pedido) return estudanteVencido ? { tipo: 'renovar' } : { tipo: 'enviar' }
  if (pedido.status === 'em_analise') return { tipo: 'analise' }
  if (pedido.status === 'recusado') return { tipo: 'recusado', motivo: pedido.motivo ?? 'sem motivo informado' }
  if (estudanteVencido) return { tipo: 'renovar' }
  if (!pedido.avisoFechado && assinatura.plano === 'estudante' && assinatura.expiraEm) {
    return { tipo: 'aprovado', pedidoId: pedido.id, expiraEm: assinatura.expiraEm }
  }
  return null
}
