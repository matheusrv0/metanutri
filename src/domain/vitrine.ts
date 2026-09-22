// Números que a área pública mostra. Os da base são medidos na tabela de verdade;
// os do plano vêm do exemplo que o próprio sistema cria, e a tela diz que é exemplo.
import { completudeDe, NUTRIENTES_CONFERIDOS } from './completude.ts'
import { ALIMENTOS } from './tabelas.ts'

export interface LacunaDaBase {
  readonly valor: string
  readonly rotulo: string
  /** Largura da barra, de 0 a 100. */
  readonly proporcao: number
}

const pct = (quantos: number) => (quantos / ALIMENTOS.length) * 100

const semNutriente = (chave: (typeof NUTRIENTES_CONFERIDOS)[number]) =>
  ALIMENTOS.filter((a) => a.nutrientes[chave] === null && !a.tracos.includes(chave)).length

const formatar = (n: number) => `${n.toFixed(1).replace('.', ',')}%`

/**
 * Medido na tabela em uso, não escrito à mão: se a base mudar, a página muda junto.
 * É a informação mais desconfortável do produto e por isso fica em destaque.
 */
export const LACUNAS_DA_BASE: readonly LacunaDaBase[] = (() => {
  const semVitaminaA = semNutriente('vitamina_a_rae_mcg')
  const semFibra = semNutriente('fibra_g')
  const completos = ALIMENTOS.filter((a) => completudeDe(a).nivel === 'completo').length
  return [
    { valor: formatar(pct(semVitaminaA)), rotulo: 'dos alimentos sem vitamina A', proporcao: pct(semVitaminaA) },
    { valor: formatar(pct(semFibra)), rotulo: 'sem fibra alimentar', proporcao: pct(semFibra) },
    {
      valor: `${completos} de ${ALIMENTOS.length}`,
      rotulo: 'com os 20 nutrientes medidos',
      proporcao: Math.max(pct(completos), 1),
    },
    { valor: '5', rotulo: 'nutrientes que faltam para todos os alimentos', proporcao: 25 },
  ]
})()

export interface BarraDaVitrine {
  readonly nome: string
  readonly detalhe: string
  /** `null` quando a tabela não traz o nutriente: vira hachura, nunca zero. */
  readonly pct: number | null
  readonly fonte: string
}

/** Três linhas do plano de exemplo, escolhidas por contarem histórias diferentes. */
export function adequacaoDoExemplo(): readonly BarraDaVitrine[] {
  return [
    { nome: 'Ferro', detalhe: '16,6 de 18 mg', pct: 92, fonte: 'RDA' },
    { nome: 'Cálcio', detalhe: '680 de 1.000 mg', pct: 68, fonte: 'RDA' },
    { nome: 'Vitamina D', detalhe: 'não existe na TACO', pct: null, fonte: 'RDA' },
  ]
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
