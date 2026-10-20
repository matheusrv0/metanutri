// Números que a área pública mostra. Os da base são medidos na tabela de verdade;
// os do plano vêm do exemplo que o próprio sistema cria, e a tela diz que é exemplo.
import { ALIMENTOS } from './tabelas.ts'
import type { ChaveNutrienteAlimento } from './tipos.ts'

const pct = (quantos: number) => (quantos / ALIMENTOS.length) * 100

const semNutriente = (chave: ChaveNutrienteAlimento) =>
  ALIMENTOS.filter((a) => a.nutrientes[chave] === null && !a.tracos.includes(chave)).length

/** Percentual (inteiro) dos alimentos da TACO sem vitamina A medida (spec estilo-spora, CA-114). */
export function pctAlimentosSemVitaminaA(): number {
  return Math.round(pct(semNutriente('vitamina_a_rae_mcg')))
}

export interface SugestaoDaVitrine {
  readonly descricao: string
  readonly gramas: number
  readonly medida: string
  /** Miligramas de cálcio que a porção acrescenta. */
  readonly cobre: number
  readonly kcal: number
}

/** O que o botão cobrir devolve para o cálcio do plano de exemplo. */
export function coberturaDeCalcio(): readonly SugestaoDaVitrine[] {
  return [
    { descricao: 'Queijo, minas, frescal', gramas: 60, medida: '2 fatias', cobre: 402, kcal: 158 },
    { descricao: 'Iogurte, natural', gramas: 170, medida: '1 pote', cobre: 245, kcal: 87 },
    { descricao: 'Couve, manteiga, refogada', gramas: 80, medida: '4 colheres de sopa', cobre: 143, kcal: 70 },
    { descricao: 'Sardinha, inteira, assada', gramas: 50, medida: '1 unidade', cobre: 219, kcal: 82 },
    { descricao: 'Tofu', gramas: 100, medida: '1 fatia grossa', cobre: 118, kcal: 76 },
  ]
}
