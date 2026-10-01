// Que campos da etapa 1 aparecem: só os que valem para o caso, e nunca um que já tem dado
// (spec pdf-e-telas-limpas, CA-331, CA-332, CB-73 e CB-74).
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
    // Gestação e lactação não valem para o sexo masculino; marcada, continua à vista com o erro.
    condicao: caso.sexo !== 'M' || caso.condicao.tipo !== 'nenhuma',
    // As curvas da OMS usam os meses até 19 anos.
    mesesAlemDosAnos: (idade !== null && idade < 19) || caso.idadeMesesAdicionais !== 0,
    cintura: completo,
    // A panturrilha é avaliada a partir de 60 anos.
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
