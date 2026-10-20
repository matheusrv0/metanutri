// A quantidade que a folha do paciente mostra (spec impressao-do-plano, D-183 e D-189).
//
// A medida é a mesma do planejador (`medidaParaMostrar`, spec revisao-geral-trabalho, D-242): manteiga e margarina em
// "ponta de faca" quando ela serve (CA-642), e medida de pedaço com mais de 4 pedaços vira o peso (CA-644). O peso vai
// ao lado, discreto, só quando a medida é vaga (D-189). A refeição, a lista de compras e as trocas usam a mesma regra.
import { medidaParaMostrar } from './busca.ts'
import type { BuscarAlimento } from './tipos.ts'

export interface QuantidadeNaFolha {
  /** A medida caseira ("1 unidade e meia"); nula quando nenhuma serve: a folha mostra só o peso. */
  readonly medida: string | null
  /** O peso prescrito, em gramas. */
  readonly gramas: number
  /** A medida é vaga (D-189): o peso vai ao lado dela, discreto. */
  readonly comPeso: boolean
}

/** D-189: medidas que não dizem um tamanho certo, em qualquer alimento. */
const SEMPRE_VAGAS = new Set(['fatia', 'pedaço', 'bife', 'filé', 'posta', 'banda', 'metade', 'rodela', 'gomo', 'coxa', 'sobrecoxa', 'peito'])
/** "Unidade" é vaga em alimento que não tem um tamanho só: verdura e legume, carne e peixe. */
const UNIDADES = new Set(['unidade', 'unidade pequena'])
const UNIDADE_VAGA_EM = /^(Verduras|Carnes|Pescados)/
/** Colher e concha são vagas em alimento de pedaço irregular: fruta, verdura e legume, carne e peixe. */
const COLHERES = new Set(['colher de sopa', 'colher de servir', 'colher de sobremesa', 'concha', 'escumadeira'])
const COLHER_VAGA_EM = /^(Frutas|Verduras|Carnes|Pescados)/

/** D-189: a medida é vaga para este tipo de alimento (a categoria da base). */
export function medidaVaga(medida: string, categoria: string): boolean {
  if (SEMPRE_VAGAS.has(medida)) return true
  if (UNIDADES.has(medida)) return UNIDADE_VAGA_EM.test(categoria)
  if (COLHERES.has(medida)) return COLHER_VAGA_EM.test(categoria)
  return false
}

/** A quantidade de um alimento na folha: na refeição, na lista de compras e nas trocas, pela mesma regra. */
export function quantidadeNaFolha(alimentoId: number, gramas: number, buscar: BuscarAlimento): QuantidadeNaFolha {
  const medida = medidaParaMostrar(alimentoId, gramas)
  if (!medida) return { medida: null, gramas, comPeso: false }
  return { medida: medida.texto, gramas, comPeso: medidaVaga(medida.medida, buscar(alimentoId)?.categoria ?? '') }
}
