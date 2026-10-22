// A meta de água pela fase de vida (spec ficha-unica, D-355 e seção 4): a AI de água total da DRI e a parte que vem
// de bebidas, que é a da linha da folha e a da missão do link. Substitui os 35 ml por kg (D-298 da conduta).
import type { Caso } from './tipos.ts'

export const FONTE_AGUA =
  'Institute of Medicine. Dietary Reference Intakes for Water, Potassium, Sodium, Chloride, and Sulfate. Washington: National Academies Press; 2005.'

export interface MetaDeAgua {
  /** AI de água total, em litros por dia (bebidas e alimentos). */
  readonly totalL: number
  /** A parte que vem de bebidas, em litros por dia. */
  readonly bebidasL: number
  /** "mulheres de 19 anos ou mais", para a dica. */
  readonly fase: string
}

const meta = (totalL: number, bebidasL: number, fase: string): MetaDeAgua => ({ totalL, bebidasL, fase })

/** A meta da fase de vida; `null` sem idade, abaixo de 1 ano ou, de 9 anos em diante, sem sexo. */
export function metaDeAgua(perfil: Pick<Caso, 'sexo' | 'idadeAnos' | 'condicao'>): MetaDeAgua | null {
  const { sexo, idadeAnos, condicao } = perfil
  if (idadeAnos === null || idadeAnos < 1) return null
  if (condicao.tipo === 'gestante') return meta(3.0, 2.3, 'gestantes')
  if (condicao.tipo === 'lactante') return meta(3.8, 3.1, 'lactantes')
  if (idadeAnos <= 3) return meta(1.3, 0.9, 'crianças de 1 a 3 anos')
  if (idadeAnos <= 8) return meta(1.7, 1.2, 'crianças de 4 a 8 anos')
  if (sexo === null) return null
  const homem = sexo === 'M'
  if (idadeAnos <= 13) return homem ? meta(2.4, 1.8, 'meninos de 9 a 13 anos') : meta(2.1, 1.6, 'meninas de 9 a 13 anos')
  if (idadeAnos <= 18) return homem ? meta(3.3, 2.6, 'rapazes de 14 a 18 anos') : meta(2.3, 1.8, 'moças de 14 a 18 anos')
  return homem ? meta(3.7, 3.0, 'homens de 19 anos ou mais') : meta(2.7, 2.2, 'mulheres de 19 anos ou mais')
}

/** "2,2": uma casa, com vírgula. */
export const litros = (l: number): string => l.toFixed(1).replace('.', ',')

/** A dica do campo "Meta de água" na etapa 1. */
export function textoDaMetaDeAgua(m: MetaDeAgua): string {
  return `Referência de água da DRI para ${m.fase}: ${litros(m.totalL)} litros por dia, dos quais cerca de ${litros(m.bebidasL)} litros em bebidas; o resto vem dos alimentos.`
}
