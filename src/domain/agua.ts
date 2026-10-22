// A meta de água do plano (spec ficha-unica, D-355 e seção 4, na correção do dono de 21/10/2026): pelo peso, ajustado
// pela idade e pela situação, ou, por escolha do plano, 1 ml por kcal da meta de energia. A conta aparece com o nome do
// método; a nutricionista pode trocar o valor. A AI de água da DRI fica só como referência.
import { FAIXAS } from './caso.ts'
import { calcularEnergia } from './energia.ts'
import type { Caso } from './tipos.ts'

export const FONTE_AGUA = [
  'Faixas de ml/kg: prática clínica (Waitzberg e Dias, Guia Básico de Terapia Nutricional, Atheneu, 2005).',
  'Holliday MA, Segar WE. The maintenance need for water in parenteral fluid therapy. Pediatrics 1957;19:823-32.',
  'Gestação e lactação: EFSA, Scientific Opinion on Dietary Reference Values for water, 2010.',
  'Referência: Institute of Medicine. Dietary Reference Intakes for Water, Potassium, Sodium, Chloride, and Sulfate. 2005.',
].join(' ')

export type MetodoAgua = 'ml-kg' | 'ml-kcal'

export const METODOS_AGUA: readonly { readonly valor: MetodoAgua; readonly rotulo: string }[] = [
  { valor: 'ml-kg', rotulo: 'Por peso' },
  { valor: 'ml-kcal', rotulo: 'Por energia (1 ml/kcal)' },
]

/** O método do plano; plano antigo, sem o campo, ou com valor estranho, usa "Por peso" (CA-1091). */
export function metodoDaAgua(caso: { readonly metodoAgua?: unknown }): MetodoAgua {
  return caso.metodoAgua === 'ml-kcal' ? 'ml-kcal' : 'ml-kg'
}

export interface CalculoDaAgua {
  /** A meta em litros por dia, com uma casa. */
  readonly litros: number
  /** "Por peso: 35 ml/kg (18 a 55 anos)". */
  readonly metodo: string
  /** "35 ml × 72 kg = 2,5 L". */
  readonly conta: string
  /** O peso ajustado, quando entra. */
  readonly nota: string | null
}

const umaCasa = (n: number): number => Math.round(n * 10) / 10
/** "2,5": uma casa, com vírgula. */
export const litros = (l: number): string => l.toFixed(1).replace('.', ',')
/** "76" ou "68,1": a casa só quando não é zero. */
const quilos = (kg: number): string => String(umaCasa(kg)).replace('.', ',')
const mililitros = (ml: number): string => Math.round(ml).toLocaleString('pt-BR')
const paraLitros = (ml: number): number => Math.round(ml / 100) / 10

const ACRESCIMO_GESTACAO_ML = 300
const ACRESCIMO_LACTACAO_ML = 700

/** As faixas de ml/kg do adulto pela idade (seção 4.1). */
function faixaDoAdulto(idade: number): { readonly mlPorKg: number; readonly faixa: string } {
  if (idade <= 55) return { mlPorKg: 35, faixa: '18 a 55 anos' }
  if (idade <= 65) return { mlPorKg: 30, faixa: '56 a 65 anos' }
  return { mlPorKg: 25, faixa: 'acima de 65 anos' }
}

/** Holliday-Segar: 100 ml/kg nos primeiros 10 kg, 50 ml/kg nos 10 seguintes e 20 ml/kg acima de 20 kg. */
function hollidaySegar(peso: number): { readonly ml: number; readonly partes: string } {
  if (peso <= 10) return { ml: 100 * peso, partes: `100 ml × ${quilos(peso)} kg` }
  if (peso <= 20) return { ml: 1000 + 50 * (peso - 10), partes: `1.000 ml + 50 ml × ${quilos(peso - 10)} kg` }
  return { ml: 1500 + 20 * (peso - 20), partes: `1.000 ml + 500 ml + 20 ml × ${quilos(peso - 20)} kg` }
}

type DadosDaConta = Pick<Caso, 'idadeAnos' | 'pesoKg' | 'estaturaCm' | 'condicao'> & { readonly metodoAgua?: unknown }

/**
 * A meta calculada; `null` sem o dado que o método pede (peso e idade; ou a meta de energia). `get` é a meta de energia
 * do plano, em kcal.
 */
export function calcularAgua(caso: DadosDaConta, get: number | null): CalculoDaAgua | null {
  if (metodoDaAgua(caso) === 'ml-kcal') {
    if (get === null || !(get > 0)) return null
    const l = paraLitros(get)
    return { litros: l, metodo: 'Por energia: 1 ml/kcal', conta: `1 ml × ${mililitros(get)} kcal = ${litros(l)} L`, nota: null }
  }
  const { idadeAnos, pesoKg, estaturaCm, condicao } = caso
  if (idadeAnos === null || idadeAnos < 1 || pesoKg === null || pesoKg < FAIXAS.pesoKg.min || pesoKg > FAIXAS.pesoKg.max) return null

  const acrescimo = condicao.tipo === 'gestante' ? ACRESCIMO_GESTACAO_ML : condicao.tipo === 'lactante' ? ACRESCIMO_LACTACAO_ML : 0
  const textoDoAcrescimo = acrescimo === 0 ? '' : ` + ${acrescimo} ml da ${condicao.tipo === 'gestante' ? 'gestação' : 'lactação'}`

  if (idadeAnos < 18) {
    const { ml, partes } = hollidaySegar(pesoKg)
    const l = paraLitros(ml + acrescimo)
    return { litros: l, metodo: 'Por peso: Holliday-Segar (abaixo de 18 anos)', conta: `Holliday-Segar: ${partes}${textoDoAcrescimo} = ${litros(l)} L`, nota: null }
  }

  const { mlPorKg, faixa } = faixaDoAdulto(idadeAnos)
  const estatura = estaturaCm !== null && estaturaCm >= FAIXAS.estaturaCm.min && estaturaCm <= FAIXAS.estaturaCm.max ? estaturaCm / 100 : null
  const imc = estatura === null ? null : pesoKg / (estatura * estatura)
  const ideal = estatura === null ? null : 25 * estatura * estatura
  const ajustado = imc !== null && imc >= 30 && ideal !== null ? ideal + 0.25 * (pesoKg - ideal) : null
  const peso = ajustado ?? pesoKg
  const l = paraLitros(mlPorKg * peso + acrescimo)
  return {
    litros: l,
    metodo: `Por peso: ${mlPorKg} ml/kg (${faixa})`,
    conta: `${mlPorKg} ml × ${quilos(peso)} kg${ajustado === null ? '' : ' (peso ajustado)'}${textoDoAcrescimo} = ${litros(l)} L`,
    nota: ajustado === null || ideal === null ? null : `IMC de 30 ou mais: usado o peso ajustado, o peso ideal (IMC 25, ${quilos(ideal)} kg) mais 25% do excesso.`,
  }
}

export interface AguaDoPlano {
  /** A meta que vale: a digitada, ou a calculada; `null` sem meta (sem dado, ou tirada da folha). */
  readonly litros: number | null
  readonly calculo: CalculoDaAgua | null
  /** A nutricionista digitou o valor (CA-1093). */
  readonly editada: boolean
  /** O campo foi apagado: sem linha na folha e sem número na missão (D-298). */
  readonly semLinha: boolean
}

const litrosValidos = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) && v > 0 && v <= 20 ? v : null)

/** A meta de água do plano (CA-1093): a digitada vale; o campo apagado tira a meta. */
export function aguaDoPlano(caso: DadosDaConta & Pick<Caso, 'linhaDaAgua'> & { readonly aguaLitros?: unknown }, get: number | null): AguaDoPlano {
  const calculo = calcularAgua(caso, get)
  const digitada = litrosValidos(caso.aguaLitros)
  const semLinha = caso.linhaDaAgua === ''
  return {
    litros: semLinha ? null : digitada ?? calculo?.litros ?? null,
    calculo,
    editada: digitada !== null,
    semLinha,
  }
}

/** A meta do caso como ele está, com a meta de energia do plano quando o método é por energia. */
export function aguaDoCaso(caso: Caso): AguaDoPlano {
  let get: number | null = null
  if (metodoDaAgua(caso) === 'ml-kcal') {
    try {
      get = calcularEnergia(caso, caso.energia).get
    } catch {
      get = null
    }
  }
  return aguaDoPlano(caso, get)
}

// ---------- A referência da DRI (só uma linha discreta) ----------

export interface ReferenciaDaDri {
  readonly totalL: number
  readonly bebidasL: number
  /** "mulheres de 19 anos ou mais". */
  readonly fase: string
}

const ref = (totalL: number, bebidasL: number, fase: string): ReferenciaDaDri => ({ totalL, bebidasL, fase })

/** A AI de água da DRI para a fase de vida; `null` sem idade ou, de 9 anos em diante, sem sexo. */
export function referenciaDaDri(perfil: Pick<Caso, 'sexo' | 'idadeAnos' | 'condicao'>): ReferenciaDaDri | null {
  const { sexo, idadeAnos, condicao } = perfil
  if (idadeAnos === null || idadeAnos < 1) return null
  if (condicao.tipo === 'gestante') return ref(3.0, 2.3, 'gestantes')
  if (condicao.tipo === 'lactante') return ref(3.8, 3.1, 'lactantes')
  if (idadeAnos <= 3) return ref(1.3, 0.9, 'crianças de 1 a 3 anos')
  if (idadeAnos <= 8) return ref(1.7, 1.2, 'crianças de 4 a 8 anos')
  if (sexo === null) return null
  const homem = sexo === 'M'
  if (idadeAnos <= 13) return homem ? ref(2.4, 1.8, 'meninos de 9 a 13 anos') : ref(2.1, 1.6, 'meninas de 9 a 13 anos')
  if (idadeAnos <= 18) return homem ? ref(3.3, 2.6, 'rapazes de 14 a 18 anos') : ref(2.3, 1.8, 'moças de 14 a 18 anos')
  return homem ? ref(3.7, 3.0, 'homens de 19 anos ou mais') : ref(2.7, 2.2, 'mulheres de 19 anos ou mais')
}

export function textoDaReferencia(r: ReferenciaDaDri): string {
  return `Referência da DRI para ${r.fase}: ${litros(r.totalL)} L de água total, cerca de ${litros(r.bebidasL)} L em bebidas.`
}
