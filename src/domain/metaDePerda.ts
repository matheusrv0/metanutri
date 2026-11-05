// Meta de perda em ritmo seguro e peso-alvo (spec antropometria-completa, D-1034; pesquisa 4.5, R4.5a–h). Pesos em kg,
// % de gordura em pontos (25 = 25%), energia em kcal/dia. Sugestão para a nutricionista; nada vai sozinho ao paciente.
import { calcularImc } from './antropometria.ts'
import { FONTES, PROPOSTA_DO_APP, type Fonte } from './fontesAntropometria.ts'
import { gorduraDoCaso, origemDoPercentual, type OpcoesDaGordura, type OrigemDoPercentual } from './indicadoresDeGordura.ts'
import { idadeValida, medidaValida, naPrecisao } from './linhaDoResultado.ts'
import { prioridadeDoCaso } from './prioridadeClinica.ts'
import type { Caso } from './tipos.ts'

export interface PesoAlvo {
  /** f = 0: a massa magra preservada (treino resistido e proteína alta). */
  readonly preservandoMassaMagraKg: number
  /** f = 0,25: a perda típica, ¼ como massa magra (Heymsfield 2014). */
  readonly perdaTipicaKg: number
}

/**
 * Peso-alvo = peso × (1 − %G − f) ÷ (1 − %G alvo − f), nos dois cenários (R4.5d; conta da pesquisa, por álgebra).
 * Alvo igual ou acima do atual, ou denominador ou massa magra final de 0 ou menos: `null` (CB-1012).
 */
export function pesoAlvo(pesoKg: number, gorduraPct: number, gorduraAlvoPct: number): PesoAlvo | null {
  if (gorduraAlvoPct >= gorduraPct) return null
  const cenario = (f: number): number | null => {
    const numerador = 1 - gorduraPct / 100 - f
    const denominador = 1 - gorduraAlvoPct / 100 - f
    return numerador <= 0 || denominador <= 0 ? null : (pesoKg * numerador) / denominador
  }
  const preservando = cenario(0)
  const tipica = cenario(0.25)
  return preservando === null || tipica === null ? null : { preservandoMassaMagraKg: preservando, perdaTipicaKg: tipica }
}

export interface MetaDePerda {
  readonly mostra: true
  /** Fase 1: 5 a 10% do peso em cerca de 26 semanas, depois manutenção e reavaliação (R4.5a). */
  readonly fase1: { readonly minKg: number; readonly maxKg: number; readonly semanas: 26 }
  /** O menor entre 1,0 kg e 1% do peso por semana (R4.5e). */
  readonly tetoKgPorSemana: number
  /** Atleta: 0,7% do peso por semana (Garthe 2011). */
  readonly atletaKgPorSemana: number | null
  readonly pesoAlvo: PesoAlvo | null
  /** Perda até o peso-alvo ÷ teto, em semanas, nos dois cenários. */
  readonly prazoMinimoSemanas: { readonly preservandoMassaMagra: number; readonly perdaTipica: number } | null
  /** A perda até o alvo (perda típica) passa de 10% do peso: fase 1 e reavaliação (R4.5a). */
  readonly limitarAFase1: boolean
  /** kcal/dia; o teto é 1.000 (R4.5b). */
  readonly deficitKcal: { readonly min: number; readonly max: number; readonly teto: 1000 }
  /** Gasto total − déficit, nunca abaixo de 800 kcal/dia (R4.5c). */
  readonly energiaSugeridaKcal: { readonly min: number; readonly max: number } | null
  readonly fonte: Fonte
  /** De onde veio o % atual do peso-alvo; sem gordura alvo (ou sem %), `null` (spec antropometria-telas, D-1422). */
  readonly origemDoPercentual: OrigemDoPercentual | null
  readonly avisos: readonly string[]
}
export type ResultadoDaMeta = MetaDePerda | { readonly mostra: false; readonly motivo: string }

export interface EntradaDaMeta {
  /** O % de gordura alvo que a nutricionista digita; não há padrão (R4.5d). */
  readonly gorduraAlvoPct?: number | null
  readonly atleta?: boolean
  /** O gasto energético total do plano, em kcal/dia. */
  readonly gastoTotalKcal?: number | null
  readonly gordura?: OpcoesDaGordura
}

const PISO_KCAL = 800

/** A meta de perda do caso (D-1034): com prioridade ≥ 1 ou objetivo "emagrecer"; nunca com "ganhar", "manter" ou risco nutricional. */
export function metaDePerda(caso: Caso, entrada: EntradaDaMeta = {}): ResultadoDaMeta | null {
  const idade = idadeValida(caso.idadeAnos)
  if (idade === null || idade < 18 || caso.condicao.tipo === 'gestante') return null
  // Observação da revisão (D-1034): "ganhar" ou "manter" escolhido pela nutricionista manda sobre a prioridade.
  if (caso.objetivo === 'ganhar' || caso.objetivo === 'manter') return null
  if (caso.condicao.tipo === 'lactante') return { mostra: false, motivo: 'Nenhuma fonte conferida trata da meta de perda na lactação.' }
  const peso = medidaValida(caso.pesoKg)
  const estatura = medidaValida(caso.estaturaCm)
  const prioridade = prioridadeDoCaso(caso)
  if (peso === null || estatura === null || prioridade === null) return { mostra: false, motivo: 'A meta de perda precisa do peso e da estatura.' }
  if (prioridade.riscoNutricional) {
    // Spec antropometria-telas, D-1527: "na idosa" ou "no idoso", pelo sexo (a prioridade só sai com sexo).
    const quem = caso.sexo === 'F' ? 'na idosa' : 'no idoso'
    return { mostra: false, motivo: `Risco nutricional (IMC baixo pelo GLIM ou panturrilha baixa ${quem}): a prioridade é preservar ou recuperar a massa magra, não perder peso.` }
  }
  if (prioridade.nivel === 0 && caso.objetivo !== 'emagrecer') return null

  const imc = naPrecisao(calcularImc(peso, estatura), 2)
  // Revisão (item 1): no idoso, só com sobrepeso pelo SISVAN (IMC de 27 ou mais, Quadro 18).
  if (idade >= 60 && imc < 27) {
    return {
      mostra: false,
      motivo:
        imc <= 22
          ? 'Idoso com IMC de 22 ou menos (baixo peso pelo SISVAN): sem meta de perda de peso.'
          : 'Idoso com IMC na faixa de referência (> 22 e < 27, SISVAN): sem meta de perda de peso.',
    }
  }
  const tetoKgPorSemana = Math.min(1, 0.01 * peso)
  const gordura = gorduraDoCaso(caso, entrada.gordura)
  const alvo = medidaValida(entrada.gorduraAlvoPct)
  const avisos: string[] = [
    'A perda desacelera: cerca de metade do efeito de um corte calórico permanente aparece em ~1 ano (Hall 2011).',
    `${PROPOSTA_DO_APP}: o prazo mínimo e o peso-alvo são contas a partir das fontes.`,
  ]
  // Rodada 2 (D-1034 revista; a Mor revisa): o idoso com sobrepeso, abaixo da obesidade, leva a posição da ESPEN.
  if (idade >= 60 && imc < 30) {
    avisos.push(
      `Idoso com IMC de 27 a 29,99: a ESPEN em geriatria só considera dieta para perder peso com obesidade e problema de saúde ligado ao peso, e junto com exercício (${FONTES.espenGeriatria.curta}).`,
    )
  }
  let alvoKg: PesoAlvo | null = null
  if (alvo !== null && gordura !== null) {
    alvoKg = pesoAlvo(peso, gordura.gorduraPct, alvo)
    if (alvoKg === null) avisos.push('O % de gordura alvo não está abaixo do atual: sem peso-alvo.')
  } else if (alvo !== null) {
    avisos.push('Sem o % de gordura atual, não há peso-alvo.')
  }
  const prazo = alvoKg && { preservandoMassaMagra: (peso - alvoKg.preservandoMassaMagraKg) / tetoKgPorSemana, perdaTipica: (peso - alvoKg.perdaTipicaKg) / tetoKgPorSemana }
  // R4.5b e revisão (item 3): abaixo de IMC 30, 300–500 (NHLBI 2000), também com IMC < 25; de 30 em diante, 500–750.
  const deficitKcal = imc < 30 ? { min: 300, max: 500, teto: 1000 as const } : { min: 500, max: 750, teto: 1000 as const }
  const get = medidaValida(entrada.gastoTotalKcal)
  let energiaSugeridaKcal: { readonly min: number; readonly max: number } | null = null
  if (get !== null) {
    energiaSugeridaKcal = { min: Math.max(PISO_KCAL, get - deficitKcal.max), max: Math.max(PISO_KCAL, get - deficitKcal.min) }
    if (get - deficitKcal.max < PISO_KCAL) avisos.push('Abaixo de 800 kcal/dia, só com supervisão médica (ABESO 2016): a sugestão para em 800.')
  }
  return {
    mostra: true,
    fase1: { minKg: 0.05 * peso, maxKg: 0.1 * peso, semanas: 26 },
    tetoKgPorSemana,
    atletaKgPorSemana: entrada.atleta ? 0.007 * peso : null,
    pesoAlvo: alvoKg,
    prazoMinimoSemanas: prazo,
    limitarAFase1: alvoKg !== null && peso - alvoKg.perdaTipicaKg > 0.1 * peso,
    deficitKcal,
    energiaSugeridaKcal,
    fonte: FONTES.metaDePerda,
    origemDoPercentual: alvo !== null ? origemDoPercentual(gordura) : null,
    // D-1423: com gordura alvo, os avisos do % (inclusive o da D-1042) vêm depois dos da meta.
    avisos: alvo !== null && gordura !== null ? [...avisos, ...gordura.avisos] : avisos,
  }
}
