// Onde o macro está em relação à faixa recomendada: perto, longe, dentro ou passou.
// O WebDiet mostra isso num gráfico a cada alimento adicionado; a estudante pediu o mesmo.
import type { EstadoFaixa, ResultadoMacro } from './macros.ts'

export interface Medidor {
  /** O número comparado com a meta: % das kcal ou g por kg, conforme a meta em uso. */
  readonly valor: number
  readonly unidade: '%' | 'g/kg'
  readonly min: number
  readonly max: number
  /** Fim do trilho, na unidade do valor. */
  readonly escala: number
  /** Posição do marcador e da faixa no trilho, de 0 a 100. */
  readonly posicao: number
  readonly faixaInicio: number
  readonly faixaFim: number
  readonly estado: EstadoFaixa
  /** Zero dentro da faixa; fora, quanto falta ou sobra, na unidade do valor. */
  readonly distancia: number
  readonly frase: string
}

/** Abaixo disso de distância, a frase diz "quase lá" em vez de só o número. */
export const PERTO = { '%': 3, 'g/kg': 0.15 } as const

const arredondar = (v: number, casas: number) => Math.round(v * 10 ** casas) / 10 ** casas

function formatar(v: number, unidade: Medidor['unidade']): string {
  const casas = unidade === '%' ? 1 : 2
  const texto = arredondar(v, casas).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas })
  return unidade === '%' ? `${texto} ${Math.abs(v) === 1 ? 'ponto' : 'pontos'}` : `${texto} g/kg`
}

function frase(estado: EstadoFaixa, distancia: number, unidade: Medidor['unidade']): string {
  if (estado === 'dentro') return 'Dentro da faixa'
  const perto = distancia <= PERTO[unidade]
  if (estado === 'abaixo') return perto ? `Quase lá: faltam ${formatar(distancia, unidade)}` : `Faltam ${formatar(distancia, unidade)} para a faixa`
  return perto ? `Passou de leve: ${formatar(distancia, unidade)} acima` : `${formatar(distancia, unidade)} acima da faixa`
}

/**
 * Sem meta ou sem valor não há o que medir: devolve `null` e a tela diz o que falta.
 * Em %, o trilho vai até 100 (é a parte das kcal). Em g/kg, até 1,6 vezes o máximo,
 * a mesma proporção da barra de adequação, para as duas escalas se parecerem.
 */
export function medirMacro(macro: ResultadoMacro): Medidor | null {
  if (!macro.meta || macro.estado === null) return null
  const unidade: Medidor['unidade'] = macro.meta.tipo === 'g_kg' ? 'g/kg' : '%'
  const valor = unidade === '%' ? macro.pctKcal : macro.gPorKg
  if (valor === null) return null

  const { min, max } = macro.meta
  const escala = unidade === '%' ? 100 : max * 1.6
  const paraTrilho = (v: number) => Math.min(Math.max((v / escala) * 100, 0), 100)

  const distancia = macro.estado === 'abaixo' ? min - valor : macro.estado === 'acima' ? valor - max : 0

  return {
    valor,
    unidade,
    min,
    max,
    escala,
    posicao: paraTrilho(valor),
    faixaInicio: paraTrilho(min),
    faixaFim: paraTrilho(max),
    estado: macro.estado,
    distancia: arredondar(distancia, unidade === '%' ? 1 : 2),
    frase: frase(macro.estado, distancia, unidade),
  }
}
