// As linhas "Real | Recomendação | Situação" da avaliação, na ordem da tela (spec antropometria-completa, CA-2056).
// A linha que não vale para a pessoa não vem; a que vale e não tem dado vem com o que falta (D-1016).
import { linhaCintura, linhaImc, linhaPanturrilha, linhaPescoco, linhaRce, linhaRcq } from './indicadoresCorporais.ts'
import { linhaGordura, linhaMassaGorda, linhaMassaMagra, linhaSomaDeDobras, type OpcoesDaGordura } from './indicadoresDeGordura.ts'
import { linhasDoBraco } from './indicadoresDoBraco.ts'
import type { LinhaDoResultado } from './linhaDoResultado.ts'
import { linhaCompleicao } from './pesoDeReferencia.ts'
import type { Caso } from './tipos.ts'

export interface OpcoesDoResultado extends OpcoesDaGordura {
  /** D-1021: a OMS é o padrão; Bray & Gray, a opção por idade. */
  readonly rcq?: 'oms' | 'bray-gray'
}

export function resultadoAntropometrico(caso: Caso, opcoes: OpcoesDoResultado = {}): LinhaDoResultado[] {
  const linhas: (LinhaDoResultado | null)[] = [
    linhaImc(caso),
    linhaGordura(caso, opcoes),
    linhaMassaGorda(caso, opcoes),
    linhaMassaMagra(caso, opcoes),
    linhaSomaDeDobras(caso, opcoes),
    linhaCintura(caso),
    linhaRcq(caso, opcoes.rcq ?? 'oms'),
    linhaRce(caso),
    linhaPescoco(caso),
    ...linhasDoBraco(caso),
    linhaPanturrilha(caso),
    linhaCompleicao(caso),
  ]
  return linhas.filter((l): l is LinhaDoResultado => l !== null)
}
