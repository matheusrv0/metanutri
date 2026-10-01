// Situação de quem usa o MetaNutri e o CRN (spec conta-e-verificacao, D-40 e D-44).
// Regras puras: a tela usa para avisar antes; quem decide de verdade é o banco.
import { ehEmailDeFaculdade } from './estudante.ts'

export type Situacao = 'estudante' | 'nutricionista'
export const ehSituacao = (valor: unknown): valor is Situacao => valor === 'estudante' || valor === 'nutricionista'

export interface Crn {
  readonly regiao: number
  readonly numero: string
}

export type StatusCrn = 'em_conferencia' | 'conferido' | 'nao_encontrado'
const STATUS_CRN: readonly string[] = ['em_conferencia', 'conferido', 'nao_encontrado']

/** Os 11 conselhos regionais. */
export const REGIOES_CRN: readonly number[] = Array.from({ length: 11 }, (_, i) => i + 1)

const NUMERO_CRN = /^\d{1,7}P?$/

export const normalizarNumeroCrn = (numero: string): string => numero.replace(/[\s.]/g, '').toUpperCase()

export const formatarCrn = (crn: Crn): string => `CRN-${crn.regiao} ${crn.numero}`

export function validarCrn(regiao: number | null, numero: string): 'crn-regiao' | 'crn-numero' | null {
  if (regiao === null || !REGIOES_CRN.includes(regiao)) return 'crn-regiao'
  if (!NUMERO_CRN.test(normalizarNumeroCrn(numero))) return 'crn-numero'
  return null
}

/** O que a pessoa marcou no "Você é" (cadastro e Completar cadastro). */
export interface DadosSituacao {
  readonly situacao: Situacao | null
  readonly regiao: number | null
  readonly numero: string
  readonly declarouCrn: boolean
  readonly declarouMatricula: boolean
}

export const SITUACAO_VAZIA: DadosSituacao = { situacao: null, regiao: null, numero: '', declarouCrn: false, declarouMatricula: false }

export type ErroSituacao = 'situacao-vazia' | 'crn-regiao' | 'crn-numero' | 'declaracao-crn' | 'declaracao-matricula' | 'email-faculdade'

export const MENSAGEM_ERRO_SITUACAO: Readonly<Record<ErroSituacao, string>> = {
  'situacao-vazia': 'Escolha se você é nutricionista ou estudante de Nutrição.',
  'crn-regiao': 'Escolha a região do seu CRN.',
  'crn-numero': 'O número do CRN tem só algarismos e pode terminar em P, se a inscrição for provisória.',
  'declaracao-crn': 'Marque a declaração de que o CRN é seu e está ativo.',
  'declaracao-matricula': 'Marque a declaração de matrícula ativa no curso de Nutrição.',
  'email-faculdade': 'Use o e-mail que a sua faculdade forneceu.',
}

/** CA-263 a CA-268. O e-mail entra porque estudante só cria conta com o da faculdade. */
export function validarSituacao(dados: DadosSituacao, email: string): ErroSituacao | null {
  if (dados.situacao === null) return 'situacao-vazia'
  if (dados.situacao === 'nutricionista') {
    const erroCrn = validarCrn(dados.regiao, dados.numero)
    if (erroCrn) return erroCrn
    return dados.declarouCrn ? null : 'declaracao-crn'
  }
  if (!ehEmailDeFaculdade(email)) return 'email-faculdade'
  return dados.declarouMatricula ? null : 'declaracao-matricula'
}

/** O CRN pronto para o servidor, ou nulo quando não é nutricionista. */
export function crnDe(dados: DadosSituacao): Crn | null {
  if (dados.situacao !== 'nutricionista' || dados.regiao === null) return null
  return { regiao: dados.regiao, numero: normalizarNumeroCrn(dados.numero) }
}

/** A linha de `perfis`, como o app lê. */
export interface PerfilConta {
  readonly nome: string
  readonly situacao: Situacao
  readonly crn: Crn | null
  readonly statusCrn: StatusCrn | null
  readonly crnDeclaradoEm: string | null
  readonly crnDecididoEm: string | null
}

const texto = (v: unknown): string | null => (typeof v === 'string' ? v : null)

export function daLinhaPerfil(linha: unknown): PerfilConta | null {
  if (typeof linha !== 'object' || linha === null) return null
  const o = linha as Record<string, unknown>
  if (!ehSituacao(o['situacao'])) return null
  const regiao = typeof o['crn_regiao'] === 'number' ? o['crn_regiao'] : null
  const numero = texto(o['crn_numero'])
  const status = texto(o['crn_status'])
  return {
    nome: texto(o['nome']) ?? '',
    situacao: o['situacao'],
    crn: regiao !== null && numero !== null ? { regiao, numero } : null,
    statusCrn: status !== null && STATUS_CRN.includes(status) ? (status as StatusCrn) : null,
    crnDeclaradoEm: texto(o['crn_declarado_em']),
    crnDecididoEm: texto(o['crn_decidido_em']),
  }
}

/** D-44: dias para corrigir o CRN não encontrado. */
export const PRAZO_CORRECAO_CRN_DIAS = 7
const DIA_MS = 24 * 60 * 60 * 1000

/** Quantos dias inteiros faltam (0 quando o prazo acabou). Nulo quando não há o que corrigir. */
export function diasParaCorrigir(perfil: PerfilConta | null, agora: Date): number | null {
  if (!perfil || perfil.statusCrn !== 'nao_encontrado' || !perfil.crnDecididoEm) return null
  const fim = new Date(perfil.crnDecididoEm).getTime() + PRAZO_CORRECAO_CRN_DIAS * DIA_MS
  return Math.max(0, Math.ceil((fim - agora.getTime()) / DIA_MS))
}

/** CA-290: passou do prazo sem corrigir, exportar fica bloqueado. */
export function exportacaoBloqueada(perfil: PerfilConta | null, agora: Date): boolean {
  return diasParaCorrigir(perfil, agora) === 0
}

export const MOTIVO_EXPORTACAO_BLOQUEADA = 'Exportar está bloqueado até você corrigir o CRN, no painel.'
