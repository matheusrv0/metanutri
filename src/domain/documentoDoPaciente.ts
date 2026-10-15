// As folhas do paciente: suplementação e solicitação de exames (spec anamnese-e-prescricoes, D-167).
//
// Quem assina vem do mesmo `AssinaturaDoPlano` da dieta. A conta de estudante sai como proposta do estágio,
// para o(a) preceptor(a): é a regra de uso não comercial da conta (`conta.ts`) e o que a Lei 8.234/1991 pede
// de quem ainda não tem CRN. O plano de assinatura não muda as folhas: quem decide é a situação da conta.
import type { AssinaturaDoPlano } from './assinaturaDoPlano.ts'
import { assinaturaDaFolha, assinaturaEmTexto, type AssinaturaDaFolha } from './folhaDieta.ts'
import type { Caso } from './tipos.ts'

export const FRASE_PROPOSTA = 'Proposta do estágio para avaliação do(a) preceptor(a). Só vale com a assinatura do(a) preceptor(a).'

/** CA-576, CA-582 e CA-583: nutricionista com nome e CRN; estudante com o nome da conta e o responsável técnico. */
export function assinaturaDoDocumento(assinatura: AssinaturaDoPlano | null): AssinaturaDaFolha {
  if (assinatura?.situacao === 'nutricionista') return { tipo: 'nutricionista', linha: assinatura.linhaNutricionista ?? '' }
  if (assinatura?.situacao === 'estudante') return { tipo: 'estagio', estagiario: assinatura.nome.trim(), preceptor: assinatura.responsavelTecnico.trim() }
  return { tipo: 'vazia' }
}

/** CA-582: a folha sai como proposta do estágio. */
export const ehProposta = (assinatura: AssinaturaDoPlano | null): boolean => assinatura?.situacao === 'estudante'

/** CA-584: na dieta e no Word, a seção de suplementos leva a frase em plano de estágio. */
export const propostaNaDieta = (assinatura: AssinaturaDoPlano | null, caso: Caso): boolean =>
  ehProposta(assinatura) || assinaturaDaFolha(assinatura, caso).tipo === 'estagio'

export type TipoDocumento = 'suplementos' | 'exames'

const TITULOS: Readonly<Record<TipoDocumento, readonly [normal: string, proposta: string]>> = {
  suplementos: ['Suplementação', 'Proposta de suplementação'],
  exames: ['Solicitação de exames', 'Proposta de solicitação de exames'],
}

export const tituloDoDocumento = (tipo: TipoDocumento, proposta: boolean): string => TITULOS[tipo][proposta ? 1 : 0]

/** CA-576 e CA-580: a linha fina da segunda página em diante, como a da dieta (CA-316): título, paciente e quem assina. */
export function linhaFinaDoDocumento(titulo: string, paciente: string, assinatura: AssinaturaDaFolha): { readonly esquerda: string; readonly direita: string } {
  return { esquerda: `${titulo} · ${paciente.trim() || 'Paciente sem nome'}`, direita: assinaturaEmTexto(assinatura) }
}

/** A data do dia no relógio de quem imprime (AAAA-MM-DD). `toISOString` daria o dia seguinte depois das 21 h no Brasil. */
export function dataDeHoje(agora: Date = new Date()): string {
  const dois = (n: number) => String(n).padStart(2, '0')
  return `${agora.getFullYear()}-${dois(agora.getMonth() + 1)}-${dois(agora.getDate())}`
}
