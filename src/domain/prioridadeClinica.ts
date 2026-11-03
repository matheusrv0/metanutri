// Nível de prioridade de 0 a 4 pelas medidas: IMC, cintura e RCE (spec antropometria-completa, D-1033; pesquisa 4.4,
// R4.4a e R4.4b). É "risco pelas medidas antropométricas", nunca o risco do paciente, que depende de doenças e outros
// fatores (R4.4e). Regra montada pela pesquisa a partir de cortes de evidência forte (NHLBI, RCE 0,5) e limitada (Ross, NICE).
import { calcularImc } from './antropometria.ts'
import { FONTES, type Fonte } from './fontesAntropometria.ts'
import { ladoMedido } from './indicadoresCorporais.ts'
import { medidaValida, naPrecisao } from './linhaDoResultado.ts'
import type { Caso, PontoDaCintura, Sexo } from './tipos.ts'

export type NivelDePrioridade = 0 | 1 | 2 | 3 | 4

export const ROTULO_DA_PRIORIDADE: Readonly<Record<NivelDePrioridade, string>> = {
  0: 'Sem risco aumentado pelas medidas',
  1: 'Aumentado',
  2: 'Alto',
  3: 'Muito alto',
  4: 'Extremamente alto',
}

export interface Gatilho {
  readonly nivel: NivelDePrioridade
  readonly descricao: string
  readonly fonte: Fonte
}

export interface Prioridade {
  readonly nivel: NivelDePrioridade
  readonly rotulo: string
  /** Todos os gatilhos que dispararam, com a fonte; o nível é o maior. */
  readonly gatilhos: readonly Gatilho[]
  /** IMC baixo pelo GLIM (R4.4b): vale mais que qualquer meta de perda de peso. */
  readonly riscoNutricional: boolean
  readonly avisos: readonly string[]
}

export interface EntradaDaPrioridade {
  readonly sexo: Sexo
  readonly idadeAnos: number
  readonly imc: number
  readonly cinturaCm: number | null
  readonly estaturaCm: number | null
  /** D-1004: a RCE só vale no ponto médio (ou não registrado); a cintura não vale no menor perímetro. */
  readonly pontoDaCintura?: PontoDaCintura | null | 'desconhecido'
  /** Idoso: a panturrilha abaixo do corte da D-1029 liga a sobreposição de risco nutricional (R4.4b). */
  readonly panturrilhaCm?: number | null
}

const IDADE_IDOSO = 60
/** D-1029 (Pagotto 2018): abaixo de 34 cm (homem) e de 33 cm (mulher), redução de massa muscular. */
const CORTE_DA_PANTURRILHA: Readonly<Record<Sexo, number>> = { M: 34, F: 33 }

/** Ross et al. 2020 (IAS/ICCR): cintura de risco por faixa de IMC, em cm [V1]. */
function corteDeRoss(imc: number, sexo: Sexo): number | null {
  if (imc < 18.5) return null
  if (imc < 25) return sexo === 'F' ? 80 : 90
  if (imc < 30) return sexo === 'F' ? 90 : 100
  if (imc < 35) return sexo === 'F' ? 105 : 110
  return sexo === 'F' ? 115 : 125
}

const AVISO_SEM_CINTURA = 'Cintura não medida: a prioridade pode estar subestimada.'

/** R4.4a, exatamente: IMC com 2 casas, RCE com 2 casas, cintura alta > 102 (homem) / > 88 (mulher). */
export function nivelDePrioridade(e: EntradaDaPrioridade): Prioridade {
  const imc = naPrecisao(e.imc, 2)
  const ponto = e.pontoDaCintura ?? null
  const cinturaValida = medidaValida(e.cinturaCm)
  const cinturaVale = ponto === null || ponto === 'ponto-medio' || ponto === 'crista-iliaca'
  const cintura = cinturaVale && cinturaValida !== null ? naPrecisao(cinturaValida, 1) : null
  const estatura = medidaValida(e.estaturaCm)
  const rceVale = ponto === null || ponto === 'ponto-medio'
  const rce = rceVale && cintura !== null && estatura !== null ? naPrecisao(cintura / estatura, 2) : null
  const cinturaAlta = cintura !== null && (e.sexo === 'M' ? cintura > 102 : cintura > 88)
  // Revisão (item 1): no idoso, o sobrepeso do SISVAN começa em 27 (Quadro 18), e a matriz do NHLBI segue esse começo.
  const idoso = e.idadeAnos >= IDADE_IDOSO
  const sobrepeso = idoso ? 27 : 25
  const faixaDoSobrepeso = idoso ? 'IMC de 27 a 29,99 (idoso)' : 'IMC de 25 a 29,99'

  const gatilhos: Gatilho[] = []
  const se = (condicao: boolean, nivel: NivelDePrioridade, descricao: string, fonte: Fonte) => {
    if (condicao) gatilhos.push({ nivel, descricao, fonte })
  }
  const nhlbi = FONTES.nhlbiGuia2000
  se(imc >= 40, 4, 'IMC de 40 ou mais', nhlbi)
  se(imc >= 35 && imc < 40, 3, 'IMC de 35 a 39,99', nhlbi)
  se(imc >= 30 && imc < 35 && cinturaAlta, 3, 'IMC de 30 a 34,99 com cintura alta', nhlbi)
  se(imc >= 30 && imc < 35 && !cinturaAlta, 2, 'IMC de 30 a 34,99', nhlbi)
  se(imc >= sobrepeso && imc < 30 && cinturaAlta, 2, `${faixaDoSobrepeso} com cintura alta`, nhlbi)
  se(rce !== null && rce >= 0.6 && imc < 35, 2, 'Razão cintura/estatura de 0,60 ou mais', FONTES.nice2025)
  se(imc >= sobrepeso && imc < 30, 1, faixaDoSobrepeso, nhlbi)
  se(rce !== null && rce >= 0.5 && rce < 0.6, 1, 'Razão cintura/estatura de 0,50 a 0,59', FONTES.abeso2016)
  const ross = corteDeRoss(imc, e.sexo)
  se(ross !== null && cintura !== null && cintura >= ross, 1, 'Cintura acima do corte de Ross para a faixa de IMC', FONTES.ross2020)

  const nivel = gatilhos.reduce<NivelDePrioridade>((maior, g) => (g.nivel > maior ? g.nivel : maior), 0)
  // GLIM 2019: IMC < 20 abaixo de 70 anos; < 22 de 70 em diante (critério fenotípico).
  const imcBaixo = e.idadeAnos >= 70 ? imc < 22 : imc < 20
  // R4.4b: no idoso, a panturrilha baixa também liga a sobreposição (corte da D-1029, decidido com 1 casa).
  const panturrilha = medidaValida(e.panturrilhaCm)
  const panturrilhaBaixa = idoso && panturrilha !== null && naPrecisao(panturrilha, 1) < CORTE_DA_PANTURRILHA[e.sexo]
  const riscoNutricional = imcBaixo || panturrilhaBaixa
  const avisos: string[] = []
  if (cinturaValida === null) avisos.push(AVISO_SEM_CINTURA)
  else if (!cinturaVale) avisos.push('A cintura no menor perímetro não entra na prioridade: ela pode estar subestimada.')
  if (imcBaixo) avisos.push('IMC baixo pelo GLIM (critério fenotípico): preservar ou recuperar a massa magra vem antes de qualquer meta de perda de peso.')
  if (panturrilhaBaixa) avisos.push('Panturrilha abaixo do corte do idoso (redução de massa muscular): preservar ou recuperar a massa magra vem antes de qualquer meta de perda de peso.')
  if (idoso) avisos.push('Idoso: a faixa de referência do IMC é > 22 e < 27 kg/m² (SISVAN).')
  avisos.push('Risco pelas medidas antropométricas; o risco do paciente depende também de doenças e fatores de risco.')
  return { nivel, rotulo: ROTULO_DA_PRIORIDADE[nivel], gatilhos, riscoNutricional, avisos }
}

const PONTOS: readonly PontoDaCintura[] = ['ponto-medio', 'crista-iliaca', 'menor-perimetro']

/** A prioridade do caso: adulto de 18 anos em diante, fora da gestação, com peso e estatura; senão, `null`. */
export function prioridadeDoCaso(caso: Caso): Prioridade | null {
  const { sexo, idadeAnos } = caso
  const peso = medidaValida(caso.pesoKg)
  const estatura = medidaValida(caso.estaturaCm)
  if (sexo === null || idadeAnos === null || idadeAnos < 18 || caso.condicao.tipo === 'gestante' || peso === null || estatura === null) return null
  const gravado: unknown = caso.medidasCorporais.pontoDaCintura
  const ponto = gravado === null || gravado === undefined ? null : (PONTOS.find((p) => p === gravado) ?? 'desconhecido')
  return nivelDePrioridade({
    sexo,
    idadeAnos,
    imc: calcularImc(peso, estatura),
    cinturaCm: caso.circunferenciaCinturaCm,
    estaturaCm: estatura,
    pontoDaCintura: ponto,
    panturrilhaCm: ladoMedido(caso.circunferenciaPanturrilhaCm, caso.medidasCorporais.panturrilhaEsquerdaCm)?.valor ?? null,
  })
}
