// Quem assina o plano e o que a situação muda nele (spec ajustes-de-uso, US-A2 e US-A4, D-37 e D-38).
import type { Perfil } from './perfil.ts'
import { formatarCrn, type PerfilConta, type Situacao } from './situacao.ts'
import type { Caso } from './tipos.ts'

export interface AssinaturaDoPlano {
  /** `null` em conta sem situação (administrador): o plano fica como era (CB-69). */
  readonly situacao: Situacao | null
  /** "Ana Souza · CRN-6 12345"; `null` quando não é nutricionista ou falta nome e CRN. */
  readonly linhaNutricionista: string | null
  /** De onde vêm os dados, para a tela dizer onde mudar. */
  readonly origem: 'conta' | 'aparelho'
  /** Estagiário(a) de plano novo de estudante (CA-253). */
  readonly nome: string
  /** Preceptor(a) de plano novo de estudante: o responsável técnico de Quem assina (CA-253). */
  readonly responsavelTecnico: string
}

export interface EntradaAssinatura {
  /** Servidor configurado: a situação vem da conta. Sem ele, de Configurações (CB-54). */
  readonly servidor: boolean
  readonly perfilConta: PerfilConta | null
  readonly nomeDaSessao: string
  readonly perfilLocal: Perfil
}

export function assinaturaDoPlano({ servidor, perfilConta, nomeDaSessao, perfilLocal }: EntradaAssinatura): AssinaturaDoPlano {
  const responsavelTecnico = perfilLocal.responsavel.trim()
  if (servidor) {
    const situacao = perfilConta?.situacao ?? null
    const nome = perfilConta?.nome.trim() || nomeDaSessao.trim()
    const crn = situacao === 'nutricionista' ? (perfilConta?.crn ?? null) : null
    return { situacao, linhaNutricionista: crn ? `${nome} · ${formatarCrn(crn)}` : null, origem: 'conta', nome, responsavelTecnico }
  }
  const situacao: Situacao = perfilLocal.tipo === 'profissional' ? 'nutricionista' : 'estudante'
  const nome = perfilLocal.nome.trim()
  const linha = situacao === 'nutricionista' ? [nome, perfilLocal.crn.trim()].filter(Boolean).join(' · ') : ''
  return { situacao, linhaNutricionista: linha || null, origem: 'aparelho', nome, responsavelTecnico }
}

/** CA-251, CB-51 e CB-69: nutricionista não vê estagiário nem preceptor, salvo plano antigo que já tem um deles. */
export function mostraCamposDeEstagio(situacao: Situacao | null, caso: Caso): boolean {
  return situacao !== 'nutricionista' || caso.estagiario.trim() !== '' || caso.preceptor.trim() !== ''
}

/** CA-234, CA-236 e CB-50: receitas só para estudante, salvo plano que já tem receitas escritas. */
export function mostraReceitas(situacao: Situacao | null, caso: Caso): boolean {
  return situacao !== 'nutricionista' || caso.receitas.trim() !== ''
}

/**
 * CA-252 e CB-51: a linha "Nutricionista:" do Word, ou `null` para o Word de estágio de sempre.
 * Texto vazio quando falta nome e CRN: o documento sai com o campo em branco, nunca com "null".
 */
export function nutricionistaDoWord(assinatura: AssinaturaDoPlano | null, caso: Caso): string | null {
  if (assinatura?.situacao !== 'nutricionista') return null
  if (caso.estagiario.trim() || caso.preceptor.trim()) return null
  return assinatura.linhaNutricionista ?? ''
}

/** CA-253: plano novo de estudante já nasce com estagiário e preceptor; os outros, com os dois vazios. */
export function camposDeEstagioIniciais(assinatura: AssinaturaDoPlano): Pick<Caso, 'estagiario' | 'preceptor'> {
  return assinatura.situacao === 'estudante'
    ? { estagiario: assinatura.nome, preceptor: assinatura.responsavelTecnico }
    : { estagiario: '', preceptor: '' }
}
