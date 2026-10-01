// Perfil de quem usa: nome, registro e o que sai nos documentos.
import type { Armazenamento } from './persistencia.ts'

const CHAVE = 'metanutri:perfil'

export interface Perfil {
  readonly nome: string
  /** Estudante ou profissional; muda o texto de responsabilidade dos documentos. */
  readonly tipo: 'estudante' | 'profissional'
  readonly crn: string
  readonly instituicao: string
  /** Quem assina junto, quando a pessoa é estudante. */
  readonly responsavel: string
  readonly telefone: string
  readonly email: string
  /** Logo em data URI, guardada no próprio aparelho. */
  readonly logo: string | null
}

export const PERFIL_VAZIO: Perfil = {
  nome: '',
  tipo: 'estudante',
  crn: '',
  instituicao: '',
  responsavel: '',
  telefone: '',
  email: '',
  logo: null,
}

/** Linha de responsabilidade que vai no rodapé dos documentos. */
export function linhaDeResponsabilidade(perfil: Perfil): string {
  if (perfil.tipo === 'profissional' && perfil.crn.trim()) {
    return `${perfil.nome.trim() || 'Nutricionista'} · CRN ${perfil.crn.trim()}`
  }
  if (perfil.tipo === 'estudante') {
    const responsavel = perfil.responsavel.trim()
    return responsavel
      ? `${perfil.nome.trim() || 'Estudante'} · responsável técnico: ${responsavel}`
      : `${perfil.nome.trim() || 'Estudante'} · documento de estudo, sem responsável técnico informado`
  }
  return perfil.nome.trim()
}

export function lerPerfil(armazenamento: Armazenamento | null): Perfil {
  if (!armazenamento) return PERFIL_VAZIO
  try {
    const bruto: unknown = JSON.parse(armazenamento.getItem(CHAVE) ?? 'null')
    return bruto && typeof bruto === 'object' ? { ...PERFIL_VAZIO, ...(bruto as Partial<Perfil>) } : PERFIL_VAZIO
  } catch {
    return PERFIL_VAZIO
  }
}

export function gravarPerfil(armazenamento: Armazenamento | null, perfil: Perfil): void {
  try {
    armazenamento?.setItem(CHAVE, JSON.stringify(perfil))
  } catch {
    // sem armazenamento: o perfil vale só nesta sessão
  }
}

/** Tudo que o MetaNutri guarda neste aparelho, para exportar e reimportar. */
export const CHAVES_DE_DADOS = [
  'metanutri:casos',
  'metanutri:pacientes',
  'metanutri:produtos',
  'metanutri:modelos',
  'metanutri:perfil',
  'metanutri:sugestoes-ocultas',
  'metanutri:acompanhamentos',
  'metanutri:sugestoes-por-refeicao',
] as const

export interface Backup {
  readonly formato: 1
  readonly geradoEm: string
  readonly dados: Record<string, string>
}

/**
 * Os planos não moram numa chave só: `metanutri:casos` guarda a lista de ids e cada
 * plano fica em `metanutri:caso:<id>`. Sem expandir, o backup levava o índice e
 * deixava os planos para trás — restaurar em outro aparelho dava zero planos.
 */
function chavesDosCasos(armazenamento: Armazenamento): string[] {
  try {
    const indice: unknown = JSON.parse(armazenamento.getItem('metanutri:casos') ?? '[]')
    if (!Array.isArray(indice)) return []
    return indice.filter((id): id is string => typeof id === 'string').map((id) => `metanutri:caso:${id}`)
  } catch {
    return []
  }
}

/**
 * A lista de chaves com os planos já expandidos. Quem leva dado embora (backup) e
 * quem apaga dado (excluir tudo) precisam das duas coisas, senão um deixa o plano
 * para trás e o outro deixa o plano no aparelho.
 */
export function expandirChaves(armazenamento: Armazenamento | null, chaves: readonly string[]): string[] {
  if (!armazenamento) return [...chaves]
  return [...chaves, ...(chaves.includes('metanutri:casos') ? chavesDosCasos(armazenamento) : [])]
}

export function montarBackup(armazenamento: Armazenamento | null, chaves: readonly string[], agora: string): Backup {
  const dados: Record<string, string> = {}
  if (armazenamento) {
    const todas = expandirChaves(armazenamento, chaves)
    for (const chave of todas) {
      const valor = armazenamento.getItem(chave)
      if (valor !== null) dados[chave] = valor
    }
  }
  return { formato: 1, geradoEm: agora, dados }
}

export interface ResultadoRestauracao {
  readonly restaurados: number
  readonly erro: string | null
}

export function restaurarBackup(armazenamento: Armazenamento | null, texto: string): ResultadoRestauracao {
  try {
    const bruto: unknown = JSON.parse(texto)
    const backup = bruto as Partial<Backup>
    if (!backup || backup.formato !== 1 || typeof backup.dados !== 'object' || backup.dados === null) {
      return { restaurados: 0, erro: 'Este arquivo não é um backup do MetaNutri.' }
    }
    let restaurados = 0
    for (const [chave, valor] of Object.entries(backup.dados)) {
      if (!chave.startsWith('metanutri:') || typeof valor !== 'string') continue
      armazenamento?.setItem(chave, valor)
      restaurados += 1
    }
    return { restaurados, erro: null }
  } catch {
    return { restaurados: 0, erro: 'Não consegui ler o arquivo. Ele precisa ser o JSON exportado pelo MetaNutri.' }
  }
}
