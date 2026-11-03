// "Ponto de partida": gasto de repouso pela massa magra e proteína pelo objetivo (spec antropometria-completa, D-1031 e
// D-1032). São sugestões para a nutricionista, com a fonte e a base de cálculo ao lado; nada vai sozinho ao paciente.
import { calcularImc } from './antropometria.ts'
import { FONTES, PROPOSTA_DO_APP, type Fonte } from './fontesAntropometria.ts'
import { CAMPOS } from './indicadoresCorporais.ts'
import { gorduraDoCaso, inicioDoSobrepesoDeGallagher, origemDoPercentual, type GorduraDoCaso, type OpcoesDaGordura, type OrigemDoPercentual } from './indicadoresDeGordura.ts'
import { idadeValida, medidaValida, naPrecisao, type CampoQueFalta } from './linhaDoResultado.ts'
import { pesoDeReferencia, type BaseDoPeso, type OpcaoDePeso } from './pesoDeReferencia.ts'
import type { Caso } from './tipos.ts'

/** Marcado pela nutricionista (pesquisa 4.10, D2); o plano ainda não guarda. */
export type PerfilDeAtividade = 'sedentario' | 'ativo' | 'atleta'

/** Os selos de evidência da pesquisa (4.10, D17). */
export type Evidencia = 'forte' | 'limitada' | 'proposta-do-app'

const GORDURA: CampoQueFalta = { campo: 'composicao', nome: 'o % de gordura (dobras ou bioimpedância)' }

const imcDoCaso = (caso: Caso): number | null => {
  const peso = medidaValida(caso.pesoKg)
  const estatura = medidaValida(caso.estaturaCm)
  return peso === null || estatura === null ? null : naPrecisao(calcularImc(peso, estatura), 2)
}

/** Adulto de 18 anos em diante e fora da gestação (pesquisa 4.10, D19). */
const adultoForaDaGestacao = (caso: Caso) => (idadeValida(caso.idadeAnos) ?? -1) >= 18 && caso.condicao.tipo !== 'gestante'

// --- Gasto de repouso ---------------------------------------------------------------------------------------------

export interface GastoDeRepouso {
  readonly calculou: true
  readonly equacao: 'cunningham-1980' | 'cunningham-1991'
  readonly nome: string
  /** kcal/dia, sem arredondar. */
  readonly kcalDia: number
  /** kcal/dia; a tela arredonda os extremos para a dezena (`arredondarPara`). */
  readonly faixa: { readonly min: number; readonly max: number }
  readonly arredondarPara: 10
  readonly massaMagraKg: number
  readonly fonte: Fonte
  /** R4.2a: evidência limitada (estudos de validação de 37 a 102 atletas); a faixa é proposta do app (D-1036). */
  readonly evidencia: 'limitada'
  /** De onde veio o % da massa magra (spec antropometria-telas, D-1422). */
  readonly origemDoPercentual: OrigemDoPercentual
  readonly avisos: readonly string[]
}
export type ResultadoDoGasto = GastoDeRepouso | { readonly calculou: false; readonly motivo: string; readonly falta: readonly CampoQueFalta[] }

/** Erro da % de gordura por dobras, em pontos (3 a 4 contra DXA); a faixa usa 3,5 (pesquisa 4.10, D3). */
const ERRO_DO_PERCENTUAL = 0.035
/** RMSE da equação, emprestado de ten Haaf e Weijs 2014 (136 a 148 kcal/dia); a faixa usa 140 (D3). */
const ERRO_DA_EQUACAO = 140

/** D-1424 (spec antropometria-telas): o 0,035 é o erro das dobras; o da bioimpedância a pesquisa não traz. */
const AVISO_DA_FAIXA: Readonly<Record<GorduraDoCaso['origem'], string>> = {
  dobras: `${PROPOSTA_DO_APP}: a faixa soma o erro das dobras ao da equação.`,
  bioimpedancia: `${PROPOSTA_DO_APP}: a faixa usa o erro típico das dobras (3,5 pontos de %); o erro da bioimpedância depende do aparelho e não foi conferido.`,
}

/**
 * Cunningham 1991 (370 + 21,6 × MLG) no geral; Cunningham 1980 (500 + 22 × MLG) para ativo ou atleta com IMC < 30.
 * Faixa = valor ± √((b × peso × 0,035)² + 140²), com b o coeficiente da MLG (R4.2a–f; D-1031).
 */
export function gastoDeRepouso(caso: Caso, perfil: PerfilDeAtividade, opcoes: OpcoesDaGordura = {}): ResultadoDoGasto | null {
  if (!adultoForaDaGestacao(caso)) return null
  const peso = medidaValida(caso.pesoKg)
  const g = gorduraDoCaso(caso, opcoes)
  if (peso === null || g === null || g.massaMagraKg === null) {
    return { calculou: false, motivo: 'O gasto de repouso pela massa magra precisa do peso e do % de gordura.', falta: [...(peso === null ? [CAMPOS.peso] : []), ...(g === null ? [GORDURA] : [])] }
  }
  const imc = imcDoCaso(caso)
  const ativo = perfil !== 'sedentario'
  const de1980 = ativo && imc !== null && imc < 30
  const [constante, b] = de1980 ? [500, 22] : [370, 21.6]
  const kcalDia = constante + b * g.massaMagraKg
  const erro = Math.sqrt((b * peso * ERRO_DO_PERCENTUAL) ** 2 + ERRO_DA_EQUACAO ** 2)
  const avisos = [
    'Estimativa; a calorimetria indireta é o padrão.',
    'O erro de ± 140 kcal/dia da equação é emprestado de ten Haaf e Weijs (2014).',
    AVISO_DA_FAIXA[g.origem],
  ]
  if (!de1980) avisos.unshift('Katch-McArdle é a mesma fórmula de Cunningham 1991.')
  if (perfil === 'atleta') avisos.push('Em atletas, todas as equações tendem a subestimar o gasto de repouso.')
  if (imc !== null && imc >= 30) avisos.push('IMC de 30 ou mais: compare com a equação por peso.')
  if (ativo && imc === null) avisos.push('Sem a estatura, não dá para saber o IMC: usada a equação geral.')
  // D-1423: os avisos do % (inclusive o da D-1042) vêm depois dos do gasto.
  avisos.push(...g.avisos)
  return {
    calculou: true,
    equacao: de1980 ? 'cunningham-1980' : 'cunningham-1991',
    nome: de1980 ? 'Cunningham, 1980' : 'Cunningham, 1991',
    kcalDia,
    faixa: { min: kcalDia - erro, max: kcalDia + erro },
    arredondarPara: 10,
    massaMagraKg: g.massaMagraKg,
    fonte: de1980 ? FONTES.cunningham1980 : FONTES.cunningham1991,
    evidencia: 'limitada',
    origemDoPercentual: { origem: g.origem, metodo: g.metodo },
    avisos,
  }
}

// --- Proteína -----------------------------------------------------------------------------------------------------

export interface FaixaDeProteina {
  /** g/kg/dia da base; `max` `null` = "a partir de". */
  readonly min: number
  readonly max: number | null
}

export interface SugestaoDeProteina {
  readonly calculou: true
  readonly faixaGKg: FaixaDeProteina
  /** A base da faixa; `null` = a nutricionista escolhe entre `bases` (IMC ≥ 30; R4.3a). */
  readonly base: BaseDoPeso | null
  readonly bases: readonly OpcaoDePeso[]
  /** g/dia na base escolhida; `null` até a escolha. */
  readonly gDia: FaixaDeProteina | null
  /** A faixa em g/kg de peso atual, quando a base é outra (R4.3c). */
  readonly gKgDePeso: FaixaDeProteina | null
  readonly fonte: Fonte
  readonly evidencia: Evidencia
  /** De onde veio o % quando a sugestão usou o % de gordura (Helms, a decisão do atleta, a base massa magra); senão, `null` (D-1422). */
  readonly origemDoPercentual: OrigemDoPercentual | null
  readonly avisos: readonly string[]
}
export type ResultadoDaProteina = SugestaoDeProteina | { readonly calculou: false; readonly motivo: string; readonly falta: readonly CampoQueFalta[] }

export interface EntradaDaProteina {
  readonly perfil: PerfilDeAtividade
  /** Doença aguda ou crônica, ou risco de desnutrição (PROT-AGE). */
  readonly doencaAgudaOuCronica?: boolean
  /** TFGe < 30 mL/min/1,73 m² sem diálise (R4.3e). */
  readonly doencaRenalGrave?: boolean
  /** A base escolhida pela nutricionista quando o IMC é 30 ou mais. */
  readonly base?: BaseDoPeso
  readonly gordura?: OpcoesDaGordura
}

interface Regra {
  readonly faixa: FaixaDeProteina
  /** `peso`: o peso de referência (o atual abaixo de IMC 30); `massa-magra`: Helms 2014. */
  readonly sobre: 'peso' | 'massa-magra'
  readonly fonte: Fonte
  readonly evidencia: Evidencia
  readonly avisos: readonly string[]
  /** A regra olhou o % de gordura (Helms e a decisão do atleta; D-1422). */
  readonly usaPercentual?: boolean
}

const SEM_NUMERO = 'Sem número conferido para este perfil: a RDA de 0,8 g/kg não foi conferida na pesquisa.'

/** A linha da tabela R4.3b que vale para o caso, ou o motivo de não haver (D-1032). */
function regraDaProteina(caso: Caso, entrada: EntradaDaProteina, imc: number | null): Regra | { readonly motivo: string; readonly falta: readonly CampoQueFalta[] } {
  // Só chega aqui o adulto com idade válida (adultoForaDaGestacao, D-1040).
  const idade = idadeValida(caso.idadeAnos) ?? 18
  const ativo = entrada.perfil !== 'sedentario'
  if (idade >= 65) {
    // PROT-AGE 2013 e ESPEN 2014.
    if (entrada.doencaAgudaOuCronica) return { faixa: { min: 1.2, max: 1.5 }, sobre: 'peso', fonte: FONTES.protAge2013, evidencia: 'limitada', avisos: [] }
    if (ativo) return { faixa: { min: 1.2, max: null }, sobre: 'peso', fonte: FONTES.protAge2013, evidencia: 'limitada', avisos: [] }
    return { faixa: { min: 1, max: 1.2 }, sobre: 'peso', fonte: FONTES.protAge2013, evidencia: 'limitada', avisos: [] }
  }
  const { objetivo } = caso
  if (objetivo === null) return { motivo: 'Escolha o objetivo do plano.', falta: [{ campo: 'objetivo', nome: 'o objetivo' }] }
  if (objetivo === 'ganhar') {
    // Morton 2018: platô em ~1,6 g/kg (IC95% 1,03–2,20); "pode ser prudente" ~2,2 para maximizar.
    return { faixa: { min: 1.6, max: 2.2 }, sobre: 'peso', fonte: FONTES.morton2018, evidencia: 'forte', avisos: ['Com treino resistido. O ganho para de crescer em ~1,6 g/kg; até 2,2 para quem quer maximizar.'] }
  }
  if (objetivo === 'manter') {
    if (ativo) return { faixa: { min: 1.4, max: 2 }, sobre: 'peso', fonte: FONTES.issn2017, evidencia: 'limitada', avisos: [] }
    return { motivo: SEM_NUMERO, falta: [] }
  }
  if (imc !== null && imc >= 30) {
    return { faixa: { min: 1.2, max: 1.5 }, sobre: 'peso', fonte: FONTES.proteinaObesoProposta, evidencia: 'proposta-do-app', avisos: ['Nenhuma diretriz de consultório define a faixa nem o peso de referência na obesidade.'] }
  }
  // Revisão (item 8): Helms só para o atleta magro, a população de origem; o ativo e o atleta que não é magro, ISSN.
  const issn: Regra = { faixa: { min: 1.4, max: 2 }, sobre: 'peso', fonte: FONTES.issn2017, evidencia: 'limitada', avisos: [] }
  if (entrada.perfil === 'atleta') {
    const g = gorduraDoCaso(caso, entrada.gordura)
    const limite = caso.sexo === null ? null : inicioDoSobrepesoDeGallagher(caso.sexo, idade)
    if (g !== null && limite !== null && naPrecisao(g.gorduraPct, 1) < limite) {
      // Rodada 2: Helms não define "magro"; o corte por Gallagher é nosso (D-1032 e D-1036 revistas).
      const avisos = [
        'População de origem: fisiculturistas naturais em preparação para competição, magros e treinados (Helms 2014).',
        `${PROPOSTA_DO_APP}: "magro" é o % de gordura abaixo do início do sobrepeso de Gallagher, um corte do app.`,
      ]
      return { faixa: { min: 2.3, max: 3.1 }, sobre: 'massa-magra', fonte: FONTES.helms2014, evidencia: 'proposta-do-app', avisos, usaPercentual: true }
    }
    const motivo =
      g === null || limite === null
        ? 'Sem o % de gordura (ou fora de 20 a 79 anos), não dá para saber se o atleta é magro: vale a ISSN; a faixa de Helms (2014) é de atletas magros.'
        : 'A faixa de Helms (2014) é de atletas magros (% de gordura abaixo do início do sobrepeso de Gallagher): para este atleta, vale a ISSN.'
    return { ...issn, avisos: [motivo], usaPercentual: g !== null }
  }
  if (ativo) return issn
  return { motivo: SEM_NUMERO, falta: [] }
}

const vezes = (faixa: FaixaDeProteina, kg: number): FaixaDeProteina => ({ min: faixa.min * kg, max: faixa.max === null ? null : faixa.max * kg })

/** Proteína pelo objetivo do plano, com a base de cálculo sempre ao lado (R4.3a–f; D-1032). */
export function proteinaPorObjetivo(caso: Caso, entrada: EntradaDaProteina): ResultadoDaProteina | null {
  if (!adultoForaDaGestacao(caso) || caso.condicao.tipo === 'lactante') return null
  if (entrada.doencaRenalGrave) {
    return { calculou: false, motivo: 'TFGe abaixo de 30 sem diálise: faixa alta de proteína não sugerida. Pode ser preciso limitar a proteína (PROT-AGE 2013).', falta: [] }
  }
  const peso = medidaValida(caso.pesoKg)
  if (peso === null) return { calculou: false, motivo: 'Informe o peso.', falta: [CAMPOS.peso] }
  const imc = imcDoCaso(caso)
  const regra = regraDaProteina(caso, entrada, imc)
  if ('motivo' in regra) return { calculou: false, motivo: regra.motivo, falta: regra.falta }

  const base = { fonte: regra.fonte, evidencia: regra.evidencia, faixaGKg: regra.faixa }
  // D-1422 e D-1423: a origem e os avisos do %, quando a sugestão o usou.
  const comPercentual = (g: GorduraDoCaso | null, avisos: readonly string[]) =>
    g === null ? { origemDoPercentual: null, avisos } : { origemDoPercentual: origemDoPercentual(g), avisos: [...avisos, ...g.avisos] }
  if (regra.sobre === 'massa-magra') {
    const g = gorduraDoCaso(caso, entrada.gordura)
    if (g === null || g.massaMagraKg === null) return { calculou: false, motivo: 'A faixa de Helms (2014) é por kg de massa magra: precisa do % de gordura.', falta: [GORDURA] }
    const fracaoMagra = g.massaMagraKg / peso
    return {
      calculou: true,
      ...base,
      base: 'massa-magra',
      bases: [{ base: 'massa-magra', pesoKg: g.massaMagraKg, motivo: null }],
      gDia: vezes(regra.faixa, g.massaMagraKg),
      gKgDePeso: vezes(regra.faixa, fracaoMagra),
      ...comPercentual(g, regra.avisos),
    }
  }

  const referencia = pesoDeReferencia(caso, { gordura: entrada.gordura ?? {} })
  const bases = referencia?.opcoes ?? [{ base: 'peso-atual' as const, pesoKg: peso, motivo: null }]
  const escolhida = referencia?.sugerido ?? entrada.base ?? null
  const kg = escolhida === null ? null : (bases.find((o) => o.base === escolhida)?.pesoKg ?? null)
  const avisos = [...regra.avisos]
  if (referencia?.sugerido === null && escolhida === null) avisos.push('IMC de 30 ou mais: escolha o peso de referência (ideal, ajustado ou massa magra).')
  const usou = regra.usaPercentual === true || escolhida === 'massa-magra'
  return {
    calculou: true,
    ...base,
    base: escolhida,
    bases,
    gDia: kg === null ? null : vezes(regra.faixa, kg),
    gKgDePeso: kg === null || escolhida === 'peso-atual' ? null : vezes(regra.faixa, kg / peso),
    ...comPercentual(usou ? gorduraDoCaso(caso, entrada.gordura) : null, avisos),
  }
}
