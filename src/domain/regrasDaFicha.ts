// Quando cada pergunta aparece (spec ficha-unica, D-348 e seção 3: R1 a R13). A idade é a de hoje na ficha e a da
// data da consulta no plano. Sem sexo ou sem data de nascimento, o que depende deles não aparece (R13).
import { FAIXAS } from './caso.ts'
import type { MomentoDeVida } from './momentoDeVida.ts'
import type { Sexo } from './tipos.ts'

export interface PerfilDaFicha {
  readonly sexo: Sexo | null
  readonly idadeAnos: number | null
  /** O tipo de `momentoDeVida` da ficha; `null` quando não informado. */
  readonly momento: MomentoDeVida['tipo'] | null
  /** R12: o paciente já tem plano. */
  readonly temPlano: boolean
}

/** As regras que prendem um bloco (seção 3). */
export type RegraDoBloco = 'gestante' | 'lactante' | 'saude-mulher' | 'infancia' | 'a-partir-de-3' | 'a-partir-de-12' | 'idoso' | 'retorno'

export const ETIQUETA_DA_REGRA: Readonly<Record<RegraDoBloco, string>> = {
  gestante: 'Só gestante',
  lactante: 'Só lactante',
  'saude-mulher': 'Mulheres a partir de 10 anos',
  infancia: 'De 1 a 9 anos',
  'a-partir-de-3': 'A partir de 3 anos',
  'a-partir-de-12': 'A partir de 12 anos',
  idoso: 'A partir de 60 anos',
  retorno: 'Só no retorno',
}

/** Para quem o bloco vale, no aviso do bloco à vista fora da regra (D-348). */
const PARA_QUEM: Readonly<Record<RegraDoBloco, string>> = {
  gestante: 'Este bloco vale só para gestante.',
  lactante: 'Este bloco vale só para lactante.',
  'saude-mulher': 'Este bloco vale para o sexo feminino, a partir de 10 anos e fora da gestação.',
  infancia: 'Este bloco vale de 1 a 9 anos.',
  'a-partir-de-3': 'Este bloco vale a partir de 3 anos.',
  'a-partir-de-12': 'Este bloco vale a partir de 12 anos.',
  idoso: 'Este bloco vale a partir de 60 anos.',
  retorno: 'Este bloco vale a partir do segundo plano.',
}

export const FRASE_SEM_PERFIL = 'Preencha sexo e data de nascimento para ver as perguntas da fase de vida.'
export const RESPOSTAS_GUARDADAS = 'As respostas continuam guardadas.'

const completo = (p: PerfilDaFicha): p is PerfilDaFicha & { readonly sexo: Sexo; readonly idadeAnos: number } => p.sexo !== null && p.idadeAnos !== null

/** R1: gestação ou lactação valem para o sexo feminino de 14 a 50 anos. */
export function podeGestarOuLactar(p: Pick<PerfilDaFicha, 'sexo' | 'idadeAnos'>): boolean {
  const faixa = FAIXAS.idadeGestacaoLactacao
  return p.sexo === 'F' && p.idadeAnos !== null && p.idadeAnos >= faixa.min && p.idadeAnos <= faixa.max
}

/** Se o bloco vale para a pessoa (R2 a R7, R12, R13). */
export function aplicaRegra(regra: RegraDoBloco, p: PerfilDaFicha): boolean {
  if (regra === 'retorno') return p.temPlano
  // D-458: a atividade física é de quase todos; sem a idade, ela aparece (só some quando a idade diz menos de 3 anos).
  if (regra === 'a-partir-de-3') return p.idadeAnos === null || p.idadeAnos >= 3
  if (!completo(p)) return false
  switch (regra) {
    case 'gestante':
      return podeGestarOuLactar(p) && p.momento === 'gestante'
    case 'lactante':
      return podeGestarOuLactar(p) && p.momento === 'lactante'
    case 'saude-mulher':
      return p.sexo === 'F' && p.idadeAnos >= 10 && !(p.momento === 'gestante' && podeGestarOuLactar(p))
    case 'infancia':
      return p.idadeAnos >= 1 && p.idadeAnos <= 9
    case 'a-partir-de-12':
      return p.idadeAnos >= 12
    case 'idoso':
      return p.idadeAnos >= 60
  }
}

/** O aviso do bloco à vista fora da regra: para quem vale, ou o que falta (R13). */
export function avisoForaDaRegra(regra: RegraDoBloco, p: PerfilDaFicha): string {
  const precisaDoPerfil = regra !== 'retorno' && regra !== 'a-partir-de-3'
  const motivo = precisaDoPerfil && !completo(p) ? 'Preencha sexo e data de nascimento.' : PARA_QUEM[regra]
  return `${motivo} ${RESPOSTAS_GUARDADAS}`
}

/** R13: a ficha ainda não sabe sexo ou idade. */
export const faltaPerfil = (p: PerfilDaFicha): boolean => !completo(p)

/** Abaixo de 18 anos (Escola e ano, Responsável, Tempo de tela). Sem idade, `false`. */
export const menorDe18 = (p: Pick<PerfilDaFicha, 'idadeAnos'>): boolean => p.idadeAnos !== null && p.idadeAnos < 18

/** O rótulo do campo de ocupação pela idade (D-458): "Escola ou creche" de 1 a 5 anos, "Escola e ano" até 17, "Ocupação". */
export function rotuloDaOcupacao(p: Pick<PerfilDaFicha, 'idadeAnos'>): string {
  if (p.idadeAnos !== null && p.idadeAnos < 6) return 'Escola ou creche'
  return menorDe18(p) ? 'Escola e ano' : 'Ocupação'
}
