// Estimativas de altura e peso de quem não fica em pé (spec antropometria-completa, D-1030): Chumlea no idoso, Rabito
// no adulto brasileiro. Medidas em cm, dobra em mm, idade em anos, resultado em cm ou kg, sempre "estimado".
import { FONTES, type Fonte } from './fontesAntropometria.ts'
import { medidaValida, type CampoQueFalta } from './linhaDoResultado.ts'
import type { Caso, Sexo } from './tipos.ts'

/** Chumlea, Roche & Steinbaugh 1985, 60 a 90 anos, altura do joelho deitado [V2]: H = 64,19 − 0,04·idade + 2,02·AJ; M = 84,88 − 0,24·idade + 1,83·AJ. */
export const chumlea1985Altura = (sexo: Sexo, idadeAnos: number, alturaDoJoelhoCm: number): number =>
  sexo === 'M' ? 64.19 - 0.04 * idadeAnos + 2.02 * alturaDoJoelhoCm : 84.88 - 0.24 * idadeAnos + 1.83 * alturaDoJoelhoCm

/** Chumlea et al. 1988, idoso que não anda [coeficientes V2]: CB e panturrilha em cm, subescapular em mm, AJ em cm. */
export function chumlea1988Peso(sexo: Sexo, cbCm: number, panturrilhaCm: number, subescapularMm: number, alturaDoJoelhoCm: number): number {
  return sexo === 'M'
    ? 1.73 * cbCm + 0.98 * panturrilhaCm + 0.37 * subescapularMm + 1.16 * alturaDoJoelhoCm - 81.69
    : 0.98 * cbCm + 1.27 * panturrilhaCm + 0.4 * subescapularMm + 0.87 * alturaDoJoelhoCm - 62.35
}

/** Rabito 2006: S = 1 no masculino e 2 no feminino (não é 0/1). */
const s = (sexo: Sexo) => (sexo === 'M' ? 1 : 2)

/** Rabito 2006, altura VII [V2]: 63,525 − 3,237·S − 0,06904·idade + 1,293·semienvergadura. */
export const rabitoAlturaVII = (sexo: Sexo, idadeAnos: number, semienvergaduraCm: number): number => 63.525 - 3.237 * s(sexo) - 0.06904 * idadeAnos + 1.293 * semienvergaduraCm

/** Rabito 2006, peso III [V2]: com CB, abdômen, panturrilha e subescapular. */
export const rabitoPesoIII = (cbCm: number, abdomenCm: number, panturrilhaCm: number, subescapularMm: number): number =>
  0.503 * cbCm + 0.5634 * abdomenCm + 1.318 * panturrilhaCm + 0.0339 * subescapularMm - 43.156

/** Rabito 2006, peso IV [V2]: só fita (CB, abdômen e panturrilha). */
export const rabitoPesoIV = (cbCm: number, abdomenCm: number, panturrilhaCm: number): number => 0.4808 * cbCm + 0.5646 * abdomenCm + 1.316 * panturrilhaCm - 42.245

/** Rabito 2006, peso V [V2]: fita e sexo; a constante é −32,9241 (a tabela do original imprime "±", o resumo diz "−"). */
export const rabitoPesoV = (sexo: Sexo, cbCm: number, abdomenCm: number, panturrilhaCm: number): number =>
  0.5759 * cbCm + 0.5263 * abdomenCm + 1.2452 * panturrilhaCm - 4.8689 * s(sexo) - 32.9241

export interface ErroDaEstimativa {
  readonly valor: number
  /** `cm`: erro absoluto; `%`: erro médio em relação ao valor real. */
  readonly unidade: 'cm' | '%'
  readonly descricao: string
}

export interface Estimativa {
  readonly equacao: 'chumlea-1985' | 'chumlea-1988' | 'rabito-vii' | 'rabito-iii' | 'rabito-iv' | 'rabito-v'
  readonly nome: string
  readonly medida: 'altura' | 'peso'
  /** Sempre estimado; `null` quando falta medida. */
  readonly valor: number | null
  readonly unidade: 'cm' | 'kg'
  /** `null`: o erro não foi publicado nas fontes lidas. */
  readonly erro: ErroDaEstimativa | null
  readonly fonte: Fonte
  readonly falta: readonly CampoQueFalta[]
  /** O lado do braço e da panturrilha usados (D-1030 revista). */
  readonly lados: readonly LadoUsado[]
  readonly avisos: readonly string[]
}

export type Lado = 'direito' | 'esquerdo'

export interface LadoUsado {
  readonly medida: 'braço' | 'panturrilha'
  readonly lado: Lado
}

const CAMPOS = {
  sexo: { campo: 'sexo', nome: 'o sexo' },
  idade: { campo: 'idadeAnos', nome: 'a idade' },
  alturaDoJoelho: { campo: 'medidasCorporais.alturaDoJoelhoCm', nome: 'a altura do joelho' },
  semienvergadura: { campo: 'medidasCorporais.semienvergaduraCm', nome: 'a semienvergadura' },
  abdomen: { campo: 'medidasCorporais.abdomenCm', nome: 'o abdômen' },
  subescapular: { campo: 'composicao.dobras.subescapular', nome: 'a dobra subescapular' },
} as const satisfies Readonly<Record<string, CampoQueFalta>>

/** O braço e a panturrilha que faltam apontam o campo do lado preferido da equação (D-1030 revista). */
const CAMPO_DO_LADO: Readonly<Record<Lado, { readonly braco: CampoQueFalta; readonly panturrilha: CampoQueFalta }>> = {
  direito: { braco: { campo: 'medidasCorporais.bracoRelaxadoDireitoCm', nome: 'o braço relaxado' }, panturrilha: { campo: 'circunferenciaPanturrilhaCm', nome: 'a panturrilha' } },
  esquerdo: { braco: { campo: 'medidasCorporais.bracoRelaxadoEsquerdoCm', nome: 'o braço relaxado' }, panturrilha: { campo: 'medidasCorporais.panturrilhaEsquerdaCm', nome: 'a panturrilha' } },
}

interface Medidas {
  readonly sexo: Sexo | null
  readonly idade: number | null
  readonly alturaDoJoelho: number | null
  readonly semienvergadura: number | null
  readonly braco: number | null
  readonly panturrilha: number | null
  readonly abdomen: number | null
  readonly subescapular: number | null
}

interface MedidasComLado {
  readonly valores: Medidas
  /** O lado preferido da equação: Chumlea, o direito (padrão do app); Rabito, o esquerdo (o do estudo). */
  readonly preferido: Lado
  readonly ladoDoBraco: Lado | null
  readonly ladoDaPanturrilha: Lado | null
}

/** O lado preferido; sem ele, o outro. */
function noLado(direito: number | null, esquerdo: number | null, preferido: Lado): { readonly valor: number; readonly lado: Lado } | null {
  const ordem: readonly [Lado, number | null][] = preferido === 'direito' ? [['direito', direito], ['esquerdo', esquerdo]] : [['esquerdo', esquerdo], ['direito', direito]]
  for (const [lado, v] of ordem) {
    const valor = medidaValida(v)
    if (valor !== null) return { valor, lado }
  }
  return null
}

function medidasDoCaso(caso: Caso, preferido: Lado): MedidasComLado {
  const braco = noLado(caso.medidasCorporais.bracoRelaxadoDireitoCm, caso.medidasCorporais.bracoRelaxadoEsquerdoCm, preferido)
  const panturrilha = noLado(caso.circunferenciaPanturrilhaCm, caso.medidasCorporais.panturrilhaEsquerdaCm, preferido)
  return {
    valores: {
      sexo: caso.sexo,
      idade: caso.idadeAnos,
      alturaDoJoelho: medidaValida(caso.medidasCorporais.alturaDoJoelhoCm),
      semienvergadura: medidaValida(caso.medidasCorporais.semienvergaduraCm),
      braco: braco?.valor ?? null,
      panturrilha: panturrilha?.valor ?? null,
      abdomen: medidaValida(caso.medidasCorporais.abdomenCm),
      subescapular: medidaValida(caso.composicao.dobras.subescapular),
    },
    preferido,
    ladoDoBraco: braco?.lado ?? null,
    ladoDaPanturrilha: panturrilha?.lado ?? null,
  }
}

type Chave = keyof Medidas

const campoQueFalta = (k: Chave, preferido: Lado): CampoQueFalta => (k === 'braco' || k === 'panturrilha' ? CAMPO_DO_LADO[preferido][k] : CAMPOS[k])

/** A estimativa com as medidas que ela pede; se faltar alguma, valor `null` e a lista do que falta. */
function estimar(
  base: Omit<Estimativa, 'valor' | 'falta' | 'lados'>,
  m: MedidasComLado,
  pede: readonly Chave[],
  conta: (v: { readonly [K in Chave]: NonNullable<Medidas[K]> }) => number,
): Estimativa {
  const falta = pede.filter((k) => m.valores[k] === null).map((k) => campoQueFalta(k, m.preferido))
  const lados: LadoUsado[] = []
  if (pede.includes('braco') && m.ladoDoBraco) lados.push({ medida: 'braço', lado: m.ladoDoBraco })
  if (pede.includes('panturrilha') && m.ladoDaPanturrilha) lados.push({ medida: 'panturrilha', lado: m.ladoDaPanturrilha })
  if (falta.length > 0) return { ...base, valor: null, falta, lados }
  // Todas as pedidas existem; as outras não entram na conta.
  return { ...base, valor: conta(m.valores as { readonly [K in Chave]: NonNullable<Medidas[K]> }), falta: [], lados }
}

const ERRO_RABITO = (pct: number): ErroDaEstimativa => ({ valor: pct, unidade: '%', descricao: 'erro médio em hospitalizados brasileiros' })

function chumleaAltura(m: MedidasComLado): Estimativa {
  const { idade } = m.valores
  const fora = idade !== null && (idade < 60 || idade > 90)
  return estimar(
    {
      equacao: 'chumlea-1985',
      nome: 'Altura pela altura do joelho (Chumlea, 1985)',
      medida: 'altura',
      unidade: 'cm',
      erro: { valor: 6, unidade: 'cm', descricao: 'limites de 90% para uma pessoa (±)' },
      fonte: FONTES.chumlea1985,
      avisos: ['A equação usa a altura do joelho medida deitado.', ...(fora ? ['Fora da população de origem da equação (60 a 90 anos).'] : [])],
    },
    m,
    ['sexo', 'idade', 'alturaDoJoelho'],
    (v) => chumlea1985Altura(v.sexo, v.idade, v.alturaDoJoelho),
  )
}

const rabitoAltura = (m: MedidasComLado): Estimativa =>
  estimar(
    { equacao: 'rabito-vii', nome: 'Altura pela semienvergadura (Rabito, 2006)', medida: 'altura', unidade: 'cm', erro: ERRO_RABITO(2.2), fonte: FONTES.rabito2006, avisos: [] },
    m,
    ['sexo', 'idade', 'semienvergadura'],
    (v) => rabitoAlturaVII(v.sexo, v.idade, v.semienvergadura),
  )

const chumleaPeso = (m: MedidasComLado): Estimativa =>
  estimar(
    { equacao: 'chumlea-1988', nome: 'Peso por braço, panturrilha, subescapular e joelho (Chumlea, 1988)', medida: 'peso', unidade: 'kg', erro: null, fonte: FONTES.chumlea1988, avisos: ['O erro-padrão da equação não foi publicado nas fontes lidas.'] },
    m,
    ['sexo', 'braco', 'panturrilha', 'subescapular', 'alturaDoJoelho'],
    (v) => chumlea1988Peso(v.sexo, v.braco, v.panturrilha, v.subescapular, v.alturaDoJoelho),
  )

const rabitoV = (m: MedidasComLado): Estimativa =>
  estimar(
    { equacao: 'rabito-v', nome: 'Peso por fita e sexo (Rabito V, 2006)', medida: 'peso', unidade: 'kg', erro: ERRO_RABITO(6), fonte: FONTES.rabito2006, avisos: [] },
    m,
    ['sexo', 'braco', 'abdomen', 'panturrilha'],
    (v) => rabitoPesoV(v.sexo, v.braco, v.abdomen, v.panturrilha),
  )

const rabitoIV = (m: MedidasComLado): Estimativa =>
  estimar(
    { equacao: 'rabito-iv', nome: 'Peso só por fita (Rabito IV, 2006)', medida: 'peso', unidade: 'kg', erro: ERRO_RABITO(6.7), fonte: FONTES.rabito2006, avisos: [] },
    m,
    ['braco', 'abdomen', 'panturrilha'],
    (v) => rabitoPesoIV(v.braco, v.abdomen, v.panturrilha),
  )

const rabitoIII = (m: MedidasComLado): Estimativa =>
  estimar(
    { equacao: 'rabito-iii', nome: 'Peso por fita e subescapular (Rabito III, 2006)', medida: 'peso', unidade: 'kg', erro: ERRO_RABITO(7), fonte: FONTES.rabito2006, avisos: [] },
    m,
    ['braco', 'abdomen', 'panturrilha', 'subescapular'],
    (v) => rabitoPesoIII(v.braco, v.abdomen, v.panturrilha, v.subescapular),
  )

/** Para quem as estimativas valem: adulto de 18 anos em diante, fora da gestação; o idoso é de 60 em diante (D-1030). */
function fase(caso: Caso): 'adulto' | 'idoso' | null {
  if (caso.condicao.tipo === 'gestante' || caso.idadeAnos === null || caso.idadeAnos < 18) return null
  return caso.idadeAnos >= 60 ? 'idoso' : 'adulto'
}

/** As estimativas de altura, a recomendada primeiro: idoso Chumlea 1985 e Rabito VII; adulto Rabito VII. */
export function estimativasDeAltura(caso: Caso): Estimativa[] {
  const f = fase(caso)
  const rabito = rabitoAltura(medidasDoCaso(caso, 'esquerdo'))
  if (f === 'idoso') return [chumleaAltura(medidasDoCaso(caso, 'direito')), rabito]
  return f === 'adulto' ? [rabito] : []
}

/** As estimativas de peso, a recomendada primeiro: idoso Chumlea 1988, depois Rabito V, IV e III; adulto Rabito V, IV e III. */
export function estimativasDePeso(caso: Caso): Estimativa[] {
  const f = fase(caso)
  // D-1030 revista: Rabito mediu no lado esquerdo; Chumlea, no padrão do app (direito).
  const esquerdo = medidasDoCaso(caso, 'esquerdo')
  const rabito = [rabitoV(esquerdo), rabitoIV(esquerdo), rabitoIII(esquerdo)]
  if (f === 'idoso') return [chumleaPeso(medidasDoCaso(caso, 'direito')), ...rabito]
  return f === 'adulto' ? rabito : []
}
