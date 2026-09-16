// Composição corporal por dobras cutâneas e por bioimpedância.
// Fórmulas clássicas, com a fonte junto de cada uma. Nenhuma foi conferida por nutricionista ainda.
import type { Sexo } from './tipos.ts'

export type ProtocoloDobras = 'jackson-pollock-3' | 'faulkner-4'

export interface Dobras {
  readonly tricipital: number | null
  readonly subescapular: number | null
  readonly suprailiaca: number | null
  readonly abdominal: number | null
  readonly peitoral: number | null
  readonly coxa: number | null
}

export const DOBRAS_VAZIAS: Dobras = {
  tricipital: null,
  subescapular: null,
  suprailiaca: null,
  abdominal: null,
  peitoral: null,
  coxa: null,
}

export interface Protocolo {
  readonly id: ProtocoloDobras
  readonly nome: string
  readonly fonte: string
  /** Quais dobras esse protocolo usa, por sexo. */
  readonly necessarias: (sexo: Sexo) => readonly (keyof Dobras)[]
}

export const PROTOCOLOS: readonly Protocolo[] = [
  {
    id: 'jackson-pollock-3',
    nome: 'Jackson e Pollock, 3 dobras',
    fonte:
      'Jackson AS, Pollock ML. Generalized equations for predicting body density of men. Br J Nutr 1978;40:497-504 · Jackson AS, Pollock ML, Ward A. Generalized equations for predicting body density of women. Med Sci Sports Exerc 1980;12:175-81. Percentual por Siri WE (1961).',
    necessarias: (sexo) => (sexo === 'M' ? ['peitoral', 'abdominal', 'coxa'] : ['tricipital', 'suprailiaca', 'coxa']),
  },
  {
    id: 'faulkner-4',
    nome: 'Faulkner, 4 dobras',
    fonte: 'Faulkner JA. Physiology of swimming and diving. In: Falls H. Exercise physiology. Baltimore: Academic Press; 1968.',
    necessarias: () => ['tricipital', 'subescapular', 'suprailiaca', 'abdominal'],
  },
]

export interface ResultadoComposicao {
  readonly gorduraPct: number | null
  readonly massaGordaKg: number | null
  readonly massaMagraKg: number | null
  readonly protocolo: string
  readonly fonte: string
  readonly motivoSemCalculo: string | null
}

const arred = (n: number, casas = 1) => Math.round(n * 10 ** casas) / 10 ** casas

/** Siri: converte densidade corporal em percentual de gordura. */
export function siri(densidade: number): number {
  return 495 / densidade - 450
}

function densidadeJacksonPollock(sexo: Sexo, soma: number, idadeAnos: number): number {
  return sexo === 'M'
    ? 1.10938 - 0.0008267 * soma + 0.0000016 * soma ** 2 - 0.0002574 * idadeAnos
    : 1.0994921 - 0.0009929 * soma + 0.0000023 * soma ** 2 - 0.0001392 * idadeAnos
}

export interface EntradaComposicao {
  readonly protocolo: ProtocoloDobras
  readonly sexo: Sexo | null
  readonly idadeAnos: number | null
  readonly pesoKg: number | null
  readonly dobras: Dobras
}

export function calcularComposicao(entrada: EntradaComposicao): ResultadoComposicao {
  const protocolo = PROTOCOLOS.find((p) => p.id === entrada.protocolo) ?? PROTOCOLOS[0]
  if (!protocolo) throw new Error('Protocolo de dobras desconhecido.')
  const vazio = (motivo: string): ResultadoComposicao => ({
    gorduraPct: null,
    massaGordaKg: null,
    massaMagraKg: null,
    protocolo: protocolo.nome,
    fonte: protocolo.fonte,
    motivoSemCalculo: motivo,
  })

  const { sexo, idadeAnos, pesoKg, dobras } = entrada
  if (sexo === null) return vazio('Informe o sexo para escolher a equação.')
  if (idadeAnos === null && protocolo.id === 'jackson-pollock-3') return vazio('Jackson e Pollock usa a idade na equação.')

  const necessarias = protocolo.necessarias(sexo)
  const faltando = necessarias.filter((k) => dobras[k] === null || (dobras[k] ?? 0) <= 0)
  if (faltando.length > 0) return vazio(`Faltam dobras: ${faltando.join(', ')}.`)

  const soma = necessarias.reduce((total, k) => total + (dobras[k] ?? 0), 0)

  const gorduraPct =
    protocolo.id === 'jackson-pollock-3'
      ? siri(densidadeJacksonPollock(sexo, soma, idadeAnos ?? 0))
      : // Faulkner: percentual direto da soma das quatro dobras.
        soma * 0.153 + 5.783

  if (!Number.isFinite(gorduraPct) || gorduraPct <= 0 || gorduraPct >= 70) {
    return vazio('As dobras informadas levam a um resultado fora do plausível. Confira as medidas.')
  }

  const massaGordaKg = pesoKg === null ? null : arred((gorduraPct / 100) * pesoKg)
  const massaMagraKg = pesoKg === null || massaGordaKg === null ? null : arred(pesoKg - massaGordaKg)

  return {
    gorduraPct: arred(gorduraPct),
    massaGordaKg,
    massaMagraKg,
    protocolo: protocolo.nome,
    fonte: protocolo.fonte,
    motivoSemCalculo: null,
  }
}

export interface Bioimpedancia {
  readonly gorduraPct: number | null
  readonly massaMagraKg: number | null
  readonly aguaPct: number | null
  readonly aparelho: string
}

export const BIOIMPEDANCIA_VAZIA: Bioimpedancia = { gorduraPct: null, massaMagraKg: null, aguaPct: null, aparelho: '' }

/** Com o percentual do aparelho e o peso, completa massa gorda e massa magra. */
export function completarBioimpedancia(bio: Bioimpedancia, pesoKg: number | null): { readonly massaGordaKg: number | null; readonly massaMagraKg: number | null } {
  if (pesoKg === null || bio.gorduraPct === null) return { massaGordaKg: null, massaMagraKg: bio.massaMagraKg }
  const massaGordaKg = arred((bio.gorduraPct / 100) * pesoKg)
  return { massaGordaKg, massaMagraKg: bio.massaMagraKg ?? arred(pesoKg - massaGordaKg) }
}
