// Estimativas de altura e peso de quem não fica em pé (spec antropometria-completa, D-1030): Chumlea no idoso, Rabito
// no adulto brasileiro. Medidas em cm, dobra em mm, idade em anos, resultado em cm ou kg, sempre "estimado".
import { FONTES, type Fonte } from './fontesAntropometria.ts'
import { ladoMedido } from './indicadoresCorporais.ts'
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
  readonly avisos: readonly string[]
}

const CAMPOS = {
  sexo: { campo: 'sexo', nome: 'o sexo' },
  idade: { campo: 'idadeAnos', nome: 'a idade' },
  alturaDoJoelho: { campo: 'medidasCorporais.alturaDoJoelhoCm', nome: 'a altura do joelho' },
  semienvergadura: { campo: 'medidasCorporais.semienvergaduraCm', nome: 'a semienvergadura' },
  braco: { campo: 'medidasCorporais.bracoRelaxadoDireitoCm', nome: 'o braço relaxado' },
  panturrilha: { campo: 'circunferenciaPanturrilhaCm', nome: 'a panturrilha' },
  abdomen: { campo: 'medidasCorporais.abdomenCm', nome: 'o abdômen' },
  subescapular: { campo: 'composicao.dobras.subescapular', nome: 'a dobra subescapular' },
} as const satisfies Readonly<Record<string, CampoQueFalta>>

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

const medidasDoCaso = (caso: Caso): Medidas => ({
  sexo: caso.sexo,
  idade: caso.idadeAnos,
  alturaDoJoelho: medidaValida(caso.medidasCorporais.alturaDoJoelhoCm),
  semienvergadura: medidaValida(caso.medidasCorporais.semienvergaduraCm),
  braco: ladoMedido(caso.medidasCorporais.bracoRelaxadoDireitoCm, caso.medidasCorporais.bracoRelaxadoEsquerdoCm)?.valor ?? null,
  panturrilha: ladoMedido(caso.circunferenciaPanturrilhaCm, caso.medidasCorporais.panturrilhaEsquerdaCm)?.valor ?? null,
  abdomen: medidaValida(caso.medidasCorporais.abdomenCm),
  subescapular: medidaValida(caso.composicao.dobras.subescapular),
})

type Chave = keyof Medidas

/** A estimativa com as medidas que ela pede; se faltar alguma, valor `null` e a lista do que falta. */
function estimar(
  base: Omit<Estimativa, 'valor' | 'falta'>,
  m: Medidas,
  pede: readonly Chave[],
  conta: (v: { readonly [K in Chave]: NonNullable<Medidas[K]> }) => number,
): Estimativa {
  const falta = pede.filter((k) => m[k] === null).map((k) => CAMPOS[k])
  if (falta.length > 0) return { ...base, valor: null, falta }
  // Todas as pedidas existem; as outras não entram na conta.
  return { ...base, valor: conta(m as { readonly [K in Chave]: NonNullable<Medidas[K]> }), falta: [] }
}

const ERRO_RABITO = (pct: number): ErroDaEstimativa => ({ valor: pct, unidade: '%', descricao: 'erro médio em hospitalizados brasileiros' })

function chumleaAltura(m: Medidas): Estimativa {
  const fora = m.idade !== null && (m.idade < 60 || m.idade > 90)
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

const rabitoAltura = (m: Medidas): Estimativa =>
  estimar(
    { equacao: 'rabito-vii', nome: 'Altura pela semienvergadura (Rabito, 2006)', medida: 'altura', unidade: 'cm', erro: ERRO_RABITO(2.2), fonte: FONTES.rabito2006, avisos: [] },
    m,
    ['sexo', 'idade', 'semienvergadura'],
    (v) => rabitoAlturaVII(v.sexo, v.idade, v.semienvergadura),
  )

const chumleaPeso = (m: Medidas): Estimativa =>
  estimar(
    { equacao: 'chumlea-1988', nome: 'Peso por braço, panturrilha, subescapular e joelho (Chumlea, 1988)', medida: 'peso', unidade: 'kg', erro: null, fonte: FONTES.chumlea1988, avisos: ['O erro-padrão da equação não foi publicado nas fontes lidas.'] },
    m,
    ['sexo', 'braco', 'panturrilha', 'subescapular', 'alturaDoJoelho'],
    (v) => chumlea1988Peso(v.sexo, v.braco, v.panturrilha, v.subescapular, v.alturaDoJoelho),
  )

const rabitoV = (m: Medidas): Estimativa =>
  estimar(
    { equacao: 'rabito-v', nome: 'Peso por fita e sexo (Rabito V, 2006)', medida: 'peso', unidade: 'kg', erro: ERRO_RABITO(6), fonte: FONTES.rabito2006, avisos: [] },
    m,
    ['sexo', 'braco', 'abdomen', 'panturrilha'],
    (v) => rabitoPesoV(v.sexo, v.braco, v.abdomen, v.panturrilha),
  )

const rabitoIV = (m: Medidas): Estimativa =>
  estimar(
    { equacao: 'rabito-iv', nome: 'Peso só por fita (Rabito IV, 2006)', medida: 'peso', unidade: 'kg', erro: ERRO_RABITO(6.7), fonte: FONTES.rabito2006, avisos: [] },
    m,
    ['braco', 'abdomen', 'panturrilha'],
    (v) => rabitoPesoIV(v.braco, v.abdomen, v.panturrilha),
  )

const rabitoIII = (m: Medidas): Estimativa =>
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
  const m = medidasDoCaso(caso)
  if (f === 'idoso') return [chumleaAltura(m), rabitoAltura(m)]
  return f === 'adulto' ? [rabitoAltura(m)] : []
}

/** As estimativas de peso, a recomendada primeiro: idoso Chumlea 1988, depois Rabito V, IV e III; adulto Rabito V, IV e III. */
export function estimativasDePeso(caso: Caso): Estimativa[] {
  const f = fase(caso)
  const m = medidasDoCaso(caso)
  const rabito = [rabitoV(m), rabitoIV(m), rabitoIII(m)]
  if (f === 'idoso') return [chumleaPeso(m), ...rabito]
  return f === 'adulto' ? rabito : []
}
