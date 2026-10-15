// A quantidade que a folha do paciente mostra (spec impressao-do-plano, D-183 e D-189).
//
// A medida é a mesma do planejador (`medidaEquivalente`), com duas regras só da folha: manteiga e margarina em "ponta
// de faca" quando ela serve (CA-642), e, na troca, medida de pedaço com mais de 4 pedaços vira o peso (CA-644). O peso
// vai ao lado, discreto, só quando a medida é vaga (D-189).
import { medidaEquivalente, medidasDoAlimento } from './busca.ts'
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

/** Medidas de pedaço: na troca, mais de 4 não serve ("Omelete · 5 fatias"), e a folha mostra o peso (CA-644). */
const PEDACOS = new Set(['fatia', 'pedaço', 'rodela', 'gomo', 'banda', 'metade'])
const MAXIMO_DE_PEDACOS_NA_TROCA = 4

const PONTA_DE_FACA = 'ponta de faca'
const MAXIMO_DE_PONTAS = 3
const ERRO_MAXIMO = 0.15

/** D-189: a medida é vaga para este tipo de alimento (a categoria da base). */
export function medidaVaga(medida: string, categoria: string): boolean {
  if (SEMPRE_VAGAS.has(medida)) return true
  if (UNIDADES.has(medida)) return UNIDADE_VAGA_EM.test(categoria)
  if (COLHERES.has(medida)) return COLHER_VAGA_EM.test(categoria)
  return false
}

/** "meia ponta de faca", "1 ponta de faca e meia", "2 pontas de faca". */
function pontasDeFaca(quantidade: number): string {
  const inteiro = Math.floor(quantidade)
  const meia = quantidade - inteiro === 0.5
  if (inteiro === 0) return 'meia ponta de faca'
  const nome = inteiro >= 2 ? 'pontas de faca' : 'ponta de faca'
  return meia ? `${inteiro} ${nome} e meia` : `${inteiro} ${nome}`
}

/** CA-642: manteiga e margarina em ponta de faca, quando a base tem essa medida e ela fica dentro de 15% do peso. */
function emPontaDeFaca(alimentoId: number, gramas: number): string | null {
  const ponta = medidasDoAlimento(alimentoId).find((m) => m.nome === PONTA_DE_FACA)
  if (!ponta || !(gramas > 0)) return null
  const quantidade = Math.max(0.5, Math.round((gramas / ponta.gramas) * 2) / 2)
  if (quantidade > MAXIMO_DE_PONTAS) return null
  return Math.abs(quantidade * ponta.gramas - gramas) / gramas <= ERRO_MAXIMO ? pontasDeFaca(quantidade) : null
}

/** A quantidade de um alimento na folha: na refeição (e na lista de compras) ou numa troca. */
export function quantidadeNaFolha(alimentoId: number, gramas: number, buscar: BuscarAlimento, uso: 'refeicao' | 'troca' = 'refeicao'): QuantidadeNaFolha {
  const ponta = emPontaDeFaca(alimentoId, gramas)
  if (ponta !== null) return { medida: ponta, gramas, comPeso: false }
  const medida = medidaEquivalente(alimentoId, gramas)
  if (!medida) return { medida: null, gramas, comPeso: false }
  if (uso === 'troca' && PEDACOS.has(medida.medida) && medida.quantidade > MAXIMO_DE_PEDACOS_NA_TROCA) return { medida: null, gramas, comPeso: false }
  return { medida: medida.texto, gramas, comPeso: medidaVaga(medida.medida, buscar(alimentoId)?.categoria ?? '') }
}
