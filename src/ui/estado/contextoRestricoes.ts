import { createContext, useContext } from 'react'
import { SEM_RESTRICOES, type RestricoesDoPaciente } from '@/domain/restricoes.ts'

/**
 * As restrições do paciente do plano aberto (spec ficha-unica, D-353): a etapa 2 as lê sem passar por cada
 * componente do plano. Fora do plano, ou sem paciente, não há restrição.
 */
export const ContextoRestricoes = createContext<RestricoesDoPaciente>(SEM_RESTRICOES)

export function useRestricoesDoPlano(): RestricoesDoPaciente {
  return useContext(ContextoRestricoes)
}
