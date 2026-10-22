// Que campos da etapa 1 aparecem: só os que valem para o caso, e nunca um que já tem dado
// (spec pdf-e-telas-limpas, CA-331, CA-332, CB-73 e CB-74; spec ficha-unica, R1, R7, R8 e R9).
import { podeGestarOuLactar } from './regrasDaFicha.ts'
import type { Caso } from './tipos.ts'

export interface CamposDaPessoa {
  readonly condicao: boolean
  readonly mesesAlemDosAnos: boolean
  readonly cintura: boolean
  readonly panturrilha: boolean
}

export function camposDaPessoa(caso: Caso): CamposDaPessoa {
  const idade = caso.idadeAnos
  const completo = caso.modo === 'completo'
  return {
    // R1: gestação e lactação valem para o sexo feminino de 14 a 50 anos; marcada, continua à vista com o erro (CB-74).
    condicao: podeGestarOuLactar(caso) || caso.condicao.tipo !== 'nenhuma',
    // R9: as curvas da OMS usam os meses até 19 anos; o adulto não tem o campo.
    mesesAlemDosAnos: idade !== null && idade < 19,
    // R8: a cintura é classificada de 20 anos em diante e fora da gestação.
    cintura: completo && ((idade !== null && idade >= 20 && caso.condicao.tipo !== 'gestante') || caso.circunferenciaCinturaCm !== null),
    // R7: a panturrilha é avaliada a partir de 60 anos.
    panturrilha: completo && ((idade !== null && idade >= 60) || caso.circunferenciaPanturrilhaCm !== null),
  }
}

/** Alguma dobra, medida de bioimpedância ou aparelho preenchido. */
export function temDadoDeComposicao(caso: Caso): boolean {
  const { dobras, bioimpedancia } = caso.composicao
  return (
    Object.values(dobras).some((v) => v !== null) ||
    bioimpedancia.gorduraPct !== null ||
    bioimpedancia.massaMagraKg !== null ||
    bioimpedancia.aguaPct !== null ||
    bioimpedancia.aparelho.trim() !== ''
  )
}

/**
 * D-458 (spec ficha-unica): o nível de atividade e o fator só entram na conta de 3 anos em diante; a equação do NASEM
 * de 1 e 2 anos não usa atividade. Sem a idade, aparece.
 */
export const mostraNivelDeAtividade = (caso: Pick<Caso, 'idadeAnos'>): boolean => caso.idadeAnos === null || caso.idadeAnos >= 3

/**
 * D-458: as equações de dobras do app (Jackson e Pollock; Faulkner) são de adultos e não valem na gestação; a
 * bioimpedância continua para todos. Dobra já preenchida continua à vista (CB-73).
 */
export function mostraDobras(caso: Caso): boolean {
  if (Object.values(caso.composicao.dobras).some((v) => v !== null)) return true
  return (caso.idadeAnos === null || caso.idadeAnos >= 18) && caso.condicao.tipo !== 'gestante'
}
