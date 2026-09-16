// Necessidade energética (SPEC CA-06 a CA-11, CA-06a a CA-06d, CB-02b).
import tabela from '../data/energia.json'
import { calcularImc, classificarImcPreGestacional, type ClasseImcPreGestacional } from './antropometria.ts'
import { validarCaso } from './caso.ts'
import type { Caso, Sexo } from './tipos.ts'

export type CategoriaAtividade = 'inativo' | 'pouco-ativo' | 'ativo' | 'muito-ativo'
export type FormulaAdulto = 'mifflin' | 'harris-benedict'

export const NIVEIS_ATIVIDADE: readonly { readonly id: string; readonly rotulo: string; readonly fator: number; readonly categoria: CategoriaAtividade }[] = [
  { id: 'sedentario', rotulo: 'Sedentário', fator: 1.2, categoria: 'inativo' },
  { id: 'pouco-ativo', rotulo: 'Pouco ativo', fator: 1.37, categoria: 'pouco-ativo' },
  { id: 'moderadamente-ativo', rotulo: 'Moderadamente ativo', fator: 1.55, categoria: 'ativo' },
  { id: 'muito-ativo', rotulo: 'Muito ativo', fator: 1.7, categoria: 'muito-ativo' },
  { id: 'extremamente-ativo', rotulo: 'Extremamente ativo', fator: 1.9, categoria: 'muito-ativo' },
]

const FONTE_FORMULA: Readonly<Record<FormulaAdulto, string>> = {
  mifflin: 'Mifflin MD, St Jeor ST, et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr 1990;51:241-7.',
  'harris-benedict': 'Harris JA, Benedict FG. A biometric study of human basal metabolism. Proc Natl Acad Sci USA 1918;4:370-3 (coeficientes originais de 1919).',
}

/** CA-06d: categoria do NASEM correspondente a um fator; fator livre usa o nível de fator mais próximo. */
export function categoriaDoFator(fator: number): CategoriaAtividade {
  let melhor = NIVEIS_ATIVIDADE[0]
  if (!melhor) throw new Error('Níveis de atividade não configurados.')
  for (const n of NIVEIS_ATIVIDADE) {
    if (Math.abs(n.fator - fator) < Math.abs(melhor.fator - fator)) melhor = n
  }
  return melhor.categoria
}

interface Coeficientes {
  readonly constante: number
  readonly idade: number
  readonly estatura: number
  readonly peso: number
  readonly gestacaoSemanas: number
}

type PorCategoria = Readonly<Record<CategoriaAtividade, Coeficientes>>
const EQ = tabela.equacoes as unknown as {
  readonly 'crianca-1-2-M': Coeficientes
  readonly 'crianca-1-2-F': Coeficientes
  readonly '3-18-M': PorCategoria
  readonly '3-18-F': PorCategoria
  readonly 'adulto-M': PorCategoria
  readonly 'adulto-F': PorCategoria
  readonly gestacao: PorCategoria
}
// Cast acima: a forma do JSON é conferida em src/data/energia.test.ts.

const aplicar = (c: Coeficientes, idade: number, estatura: number, peso: number, semanas = 0) =>
  c.constante + c.idade * idade + c.estatura * estatura + c.peso * peso + c.gestacaoSemanas * semanas

export function tmbAdulto(formula: FormulaAdulto, sexo: Sexo, idade: number, pesoKg: number, estaturaCm: number): number {
  if (formula === 'mifflin') return 10 * pesoKg + 6.25 * estaturaCm - 5 * idade + (sexo === 'M' ? 5 : -161)
  return sexo === 'M'
    ? 66.473 + 13.7516 * pesoKg + 5.0033 * estaturaCm - 6.755 * idade
    : 655.0955 + 9.5634 * pesoKg + 1.8496 * estaturaCm - 4.6756 * idade
}

export interface Adicional {
  readonly descricao: string
  readonly kcal: number
}

export interface ResultadoEnergia {
  readonly metodo: FormulaAdulto | 'nasem-2023' | null
  /** Só existe no cálculo de adultos por Mifflin ou Harris-Benedict. */
  readonly tmb: number | null
  readonly fator: number
  /** Categoria usada nas equações do NASEM (CA-06d); `null` fora delas ou na equação única de 1 a 2 anos. */
  readonly categoriaAtividade: CategoriaAtividade | null
  readonly adicionais: readonly Adicional[]
  readonly get: number | null
  readonly getManual: boolean
  readonly fonte: string | null
  readonly avisos: readonly string[]
  readonly motivoSemCalculo: string | null
}

export interface OpcoesEnergia {
  readonly fator: number
  readonly formula?: FormulaAdulto
  readonly getManual?: number | null
}

const FONTE_NASEM = `${tabela.fonte.publicacao} ${tabela.fonte.nome}.`

const ROTULO_IMC: Readonly<Record<ClasseImcPreGestacional, string>> = {
  'baixo-peso': 'baixo peso',
  eutrofia: 'eutrofia',
  sobrepeso: 'sobrepeso',
  obesidade: 'obesidade',
}

export function calcularEnergia(caso: Caso, opcoes: OpcoesEnergia): ResultadoEnergia {
  if (!(opcoes.fator > 0) || opcoes.fator > 3) throw new RangeError(`Fator de atividade inválido: ${opcoes.fator}.`)
  const formula = opcoes.formula ?? 'mifflin'
  const manual = opcoes.getManual ?? null
  const avisos: string[] = []

  const resultado = (parcial: Omit<ResultadoEnergia, 'fator' | 'getManual' | 'avisos'>): ResultadoEnergia => ({
    ...parcial,
    fator: opcoes.fator,
    get: manual ?? parcial.get,
    getManual: manual !== null,
    avisos,
  })

  const validacao = validarCaso(caso)
  const { sexo, idadeAnos, pesoKg, estaturaCm, condicao } = caso
  if (!validacao.podeCalcular || sexo === null || idadeAnos === null || pesoKg === null || estaturaCm === null) {
    const nomes: Record<string, string> = { sexo: 'sexo', idadeAnos: 'idade', pesoKg: 'peso', estaturaCm: 'estatura' }
    const faltando = validacao.faltando.map((c) => nomes[c] ?? c)
    const motivo = faltando.length
      ? `Informe ${faltando.join(', ')} para calcular a energia.`
      : 'Corrija os campos inválidos do caso para calcular a energia.'
    return resultado({ metodo: null, tmb: null, categoriaAtividade: null, adicionais: [], get: null, fonte: null, motivoSemCalculo: motivo })
  }

  const idadeDecimal = idadeAnos + caso.idadeMesesAdicionais / 12
  const categoria = categoriaDoFator(opcoes.fator)
  const adicionais: Adicional[] = []
  const nasem = (get: number, cat: CategoriaAtividade | null) =>
    resultado({ metodo: 'nasem-2023', tmb: null, categoriaAtividade: cat, adicionais, get, fonte: FONTE_NASEM, motivoSemCalculo: null })

  /** EER de não gestante: equação de adulto (19+) ou de meninas/meninos de 3 a 18 anos. */
  const eerNaoGestante = (cat: CategoriaAtividade) =>
    idadeAnos >= 19
      ? aplicar(EQ[sexo === 'M' ? 'adulto-M' : 'adulto-F'][cat], idadeDecimal, estaturaCm, pesoKg)
      : aplicar(EQ[sexo === 'M' ? '3-18-M' : '3-18-F'][cat], idadeDecimal, estaturaCm, pesoKg)

  if (condicao.tipo === 'gestante') {
    const semanas = condicao.semanasGestacao
    const segundoOuTerceiro = semanas !== null && semanas >= tabela.gestacao.semanaInicioSegundoTrimestre
    if (semanas === null) avisos.push('Informe a idade gestacional: sem ela, a energia é calculada como não gestante.')
    if (!segundoOuTerceiro) return nasem(eerNaoGestante(categoria), categoria)

    let get = aplicar(EQ.gestacao[categoria], idadeDecimal, estaturaCm, pesoKg, semanas)
    if (condicao.pesoPreGestacionalKg === null) {
      avisos.push('Informe o peso pré-gestacional para somar o depósito de energia da gestação.')
    } else {
      const classe = classificarImcPreGestacional(calcularImc(condicao.pesoPreGestacionalKg, estaturaCm))
      const kcal = tabela.gestacao.depositoPorImcPreGestacional[classe]
      adicionais.push({ descricao: `Depósito de energia na gestação (${ROTULO_IMC[classe]})`, kcal })
      get += kcal
    }
    return nasem(get, categoria)
  }

  if (condicao.tipo === 'lactante') {
    let get = eerNaoGestante(categoria)
    const meses = condicao.mesesPosParto
    const { exclusiva, parcial } = tabela.lactacao
    if (meses === null) {
      avisos.push('Informe o tempo pós-parto para somar o custo de produção de leite.')
    } else if (meses <= exclusiva.mesesMax) {
      adicionais.push({ descricao: 'Produção de leite (0 a 6 meses)', kcal: exclusiva.producaoLeite })
      adicionais.push({ descricao: 'Mobilização de reservas (0 a 6 meses)', kcal: -exclusiva.mobilizacao })
      get += exclusiva.producaoLeite - exclusiva.mobilizacao
    } else if (meses <= parcial.mesesMax) {
      adicionais.push({ descricao: 'Produção de leite (7 a 12 meses)', kcal: parcial.producaoLeite })
      get += parcial.producaoLeite
    } else {
      avisos.push('Não há adicional de lactação definido nas referências para mais de 12 meses pós-parto.')
    }
    return nasem(get, categoria)
  }

  if (idadeAnos < 19) {
    if (opcoes.formula) avisos.push(`${opcoes.formula === 'mifflin' ? 'Mifflin-St Jeor' : 'Harris-Benedict'} não vale para menores de 19 anos; usada a equação do NASEM 2023.`)
    const crescimento = tabela.custoCrescimento.find((c) => c.sexo === sexo && idadeAnos >= c.idadeMin && idadeAnos <= c.idadeMax)
    if (!crescimento) throw new Error(`Custo de crescimento ausente para ${sexo}, ${idadeAnos} anos.`)
    adicionais.push({ descricao: 'Custo energético do crescimento', kcal: crescimento.kcal })
    if (idadeAnos < 3) {
      const eer = aplicar(EQ[sexo === 'M' ? 'crianca-1-2-M' : 'crianca-1-2-F'], idadeDecimal, estaturaCm, pesoKg)
      return nasem(eer + crescimento.kcal, null)
    }
    return nasem(eerNaoGestante(categoria) + crescimento.kcal, categoria)
  }

  const tmb = tmbAdulto(formula, sexo, idadeAnos, pesoKg, estaturaCm)
  return resultado({
    metodo: formula,
    tmb,
    categoriaAtividade: null,
    adicionais: [],
    get: tmb * opcoes.fator,
    fonte: FONTE_FORMULA[formula],
    motivoSemCalculo: null,
  })
}

/** CA-10: kcal do plano como % do GET, com limites editáveis (padrão 90% a 110%). */
export function percentualDoGasto(
  kcalPlano: number,
  get: number | null,
  limites: { readonly min: number; readonly max: number } = { min: 90, max: 110 },
): { readonly pct: number; readonly estado: 'abaixo' | 'dentro' | 'acima' } | null {
  if (get === null || get <= 0) return null
  const pct = Math.round((kcalPlano / get) * 100 * 1e6) / 1e6
  return { pct, estado: pct < limites.min ? 'abaixo' : pct > limites.max ? 'acima' : 'dentro' }
}
