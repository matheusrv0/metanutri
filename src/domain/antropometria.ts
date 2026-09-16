// Avaliação antropométrica (SPEC CA-02, CA-02a, CA-02b, CA-02c, CA-03, CA-04, CA-05).
import referencias from '../data/antropometria.json'
import curvas from '../data/curvas-oms.json'
import { validarCaso } from './caso.ts'
import type { Caso, Sexo } from './tipos.ts'

export interface Faixa {
  readonly classe: string
  readonly min: number | null
  readonly minInclusivo: boolean
  readonly max: number | null
  readonly maxInclusivo: boolean
}

export interface Lms {
  readonly L: number
  readonly M: number
  readonly S: number
  readonly sd2neg: number
  readonly sd2: number
  readonly sd3neg: number
  readonly sd3: number
}

export type ClasseImcPreGestacional = 'baixo-peso' | 'eutrofia' | 'sobrepeso' | 'obesidade'

const FONTES = referencias.fontes as Readonly<Record<string, string>>
const fonte = (chave: string) => FONTES[chave] ?? chave

export const IDADE_ADULTO = 20
export const IDADE_IDOSO = 60
const MESES_ULTIMA_REFERENCIA = 228
const MESES_CINCO_ANOS = 60

export function calcularImc(pesoKg: number, estaturaCm: number): number {
  const m = estaturaCm / 100
  return pesoKg / (m * m)
}

export function classificar(valor: number, faixas: readonly Faixa[]): Faixa {
  const encontrada = faixas.find(
    (f) =>
      (f.min === null || (f.minInclusivo ? valor >= f.min : valor > f.min)) &&
      (f.max === null || (f.maxInclusivo ? valor <= f.max : valor < f.max)),
  )
  if (!encontrada) throw new Error(`Valor ${valor} fora de todas as faixas.`)
  return encontrada
}

/**
 * Escore-z pela fórmula LMS da OMS. Para IMC (`corrigirExtremos`), valores além de ±3 usam
 * a distância entre SD2 e SD3, como no método da OMS; estatura não recebe essa correção.
 */
export function escoreZ(valor: number, lms: Lms, corrigirExtremos: boolean): number {
  const { L, M, S } = lms
  const z = L === 0 ? Math.log(valor / M) / S : ((valor / M) ** L - 1) / (L * S)
  if (!corrigirExtremos) return z
  if (z > 3) return 3 + (valor - lms.sd3) / (lms.sd3 - lms.sd2)
  if (z < -3) return -3 + (valor - lms.sd3neg) / (lms.sd2neg - lms.sd3neg)
  return z
}

export function classificarImcPreGestacional(imc: number): ClasseImcPreGestacional {
  return classificar(imc, referencias.gestacao.imcPreGestacional).classe as ClasseImcPreGestacional
}

type CurvaPorSexo = Readonly<Record<Sexo, readonly (Lms & { readonly meses: number })[]>>
const CURVA_IMC: CurvaPorSexo = curvas.imcIdade
const CURVA_ESTATURA: CurvaPorSexo = curvas.estaturaIdade

const linhaCurva = (curva: CurvaPorSexo, sexo: Sexo, meses: number) => curva[sexo].find((l) => l.meses === meses)

export interface ResultadoAntropometria {
  readonly imc: { readonly valor: number; readonly referencia: 'adulto' | 'idoso'; readonly classe: string; readonly grau: string | null; readonly fonte: string } | null
  readonly imcIdade: { readonly valorImc: number; readonly z: number; readonly classe: string; readonly mesesReferencia: number; readonly fonte: string } | null
  readonly estaturaIdade: { readonly z: number; readonly classe: string; readonly mesesReferencia: number; readonly fonte: string } | null
  readonly gestacao: {
    readonly imcPreGestacional: number
    readonly classe: ClasseImcPreGestacional
    readonly rotulo: string
    readonly ganhoRecomendadoKg: { readonly min: number; readonly max: number }
    readonly ganhoAtualKg: number
    readonly fonte: string
  } | null
  readonly cintura: { readonly classe: string; readonly fonte: string } | null
  readonly panturrilha: { readonly classe: string; readonly fonte: string; readonly nota: string } | null
  readonly avisos: readonly string[]
}

export function avaliarAntropometria(caso: Caso): ResultadoAntropometria {
  const avisos: string[] = []
  const vazio: ResultadoAntropometria = { imc: null, imcIdade: null, estaturaIdade: null, gestacao: null, cintura: null, panturrilha: null, avisos }
  const validacao = validarCaso(caso)
  const { sexo, idadeAnos, pesoKg, estaturaCm, condicao } = caso

  if (!validacao.podeCalcular || sexo === null || idadeAnos === null || pesoKg === null || estaturaCm === null) {
    const nomes: Record<string, string> = { sexo: 'sexo', idadeAnos: 'idade', pesoKg: 'peso', estaturaCm: 'estatura' }
    const faltando = validacao.faltando.map((c) => nomes[c] ?? c)
    if (faltando.length) avisos.push(`Informe ${faltando.join(', ')} para a avaliação antropométrica.`)
    if (Object.keys(validacao.erros).length) avisos.push('Corrija os campos inválidos para a avaliação antropométrica.')
    return vazio
  }

  let imc: ResultadoAntropometria['imc'] = null
  let imcIdade: ResultadoAntropometria['imcIdade'] = null
  let estaturaIdade: ResultadoAntropometria['estaturaIdade'] = null
  let gestacao: ResultadoAntropometria['gestacao'] = null
  let cintura: ResultadoAntropometria['cintura'] = null
  let panturrilha: ResultadoAntropometria['panturrilha'] = null
  const valorImc = calcularImc(pesoKg, estaturaCm)

  if (condicao.tipo === 'gestante') {
    if (condicao.pesoPreGestacionalKg === null) {
      avisos.push('Informe o peso pré-gestacional para classificar o IMC pré-gestacional e o ganho de peso.')
    } else {
      const imcPre = calcularImc(condicao.pesoPreGestacionalKg, estaturaCm)
      const faixa = classificar(imcPre, referencias.gestacao.imcPreGestacional) as Faixa & { rotulo: string }
      const classe = faixa.classe as ClasseImcPreGestacional
      gestacao = {
        imcPreGestacional: imcPre,
        classe,
        rotulo: faixa.rotulo,
        ganhoRecomendadoKg: referencias.gestacao.ganhoPesoTotalAte40SemanasKg[classe],
        ganhoAtualKg: Math.round((pesoKg - condicao.pesoPreGestacionalKg) * 10) / 10,
        fonte: fonte(referencias.gestacao.fonte),
      }
    }
    if (idadeAnos < 19) avisos.push(referencias.gestacao.notaAdolescentes)
  } else if (idadeAnos >= IDADE_ADULTO) {
    const idoso = idadeAnos >= IDADE_IDOSO
    const tabela = idoso ? referencias.imcIdoso : referencias.imcAdulto
    const faixa = classificar(valorImc, tabela.faixas)
    const grau = !idoso && faixa.classe === 'Obesidade' ? classificar(valorImc, referencias.imcAdulto.grausObesidade.faixas).classe : null
    imc = { valor: valorImc, referencia: idoso ? 'idoso' : 'adulto', classe: faixa.classe, grau, fonte: fonte(tabela.fonte) }
  } else {
    const meses = Math.min(idadeAnos * 12 + caso.idadeMesesAdicionais, MESES_ULTIMA_REFERENCIA)
    const lmsImc = linhaCurva(CURVA_IMC, sexo, meses)
    const lmsEst = linhaCurva(CURVA_ESTATURA, sexo, meses)
    if (!lmsImc || !lmsEst) throw new Error(`Curva OMS sem ${meses} meses.`)
    const zImc = escoreZ(valorImc, lmsImc, true)
    const zEst = escoreZ(estaturaCm, lmsEst, false)
    const classesImc = meses < MESES_CINCO_ANOS ? referencias.imcIdadeEscoreZ.menoresDe5Anos : referencias.imcIdadeEscoreZ.de5a19Anos
    const f = fonte(referencias.imcIdadeEscoreZ.fonte)
    imcIdade = { valorImc, z: zImc, classe: classificar(zImc, classesImc).classe, mesesReferencia: meses, fonte: f }
    estaturaIdade = { z: zEst, classe: classificar(zEst, referencias.estaturaIdadeEscoreZ.faixas).classe, mesesReferencia: meses, fonte: f }
  }

  if (caso.circunferenciaCinturaCm !== null && idadeAnos >= IDADE_ADULTO && condicao.tipo !== 'gestante') {
    cintura = { classe: classificar(caso.circunferenciaCinturaCm, referencias.cintura[sexo]).classe, fonte: fonte(referencias.cintura.fonte) }
  }

  if (caso.circunferenciaPanturrilhaCm !== null && idadeAnos >= referencias.panturrilha.idadeMin) {
    panturrilha = {
      classe: classificar(caso.circunferenciaPanturrilhaCm, referencias.panturrilha.faixas).classe,
      fonte: fonte(referencias.panturrilha.fonte),
      nota: referencias.panturrilha.notaAlternativa,
    }
  }

  return { imc, imcIdade, estaturaIdade, gestacao, cintura, panturrilha, avisos }
}
