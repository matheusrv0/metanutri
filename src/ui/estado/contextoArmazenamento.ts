import { createContext, useContext } from 'react'
import type { ResultadoMigracao } from '@/domain/donoDosDados.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { armazenamentoLocal } from './armazenamentoLocal.ts'

/**
 * Onde ficam os dados da pessoa (spec dados-por-conta, D-120). `undefined` fora do
 * provedor: aí vale o armazenamento do aparelho, como antes (telas testadas sozinhas).
 */
export const ContextoArmazenamento = createContext<Armazenamento | null | undefined>(undefined)

/** Os dados da conta que entrou, ou os do aparelho sem conta; `null` com o navegador bloqueado (CB-121). */
export function useArmazenamento(): Armazenamento | null {
  const valor = useContext(ContextoArmazenamento)
  return valor === undefined ? armazenamentoLocal() : valor
}

/** Como foi levar para a conta os dados de antes desta mudança (D-123). */
export const ContextoMigracao = createContext<ResultadoMigracao>('nada')

/** CA-473: sobrou dado de antes que o armazenamento cheio não deixou mover. */
export function useMigracaoIncompleta(): boolean {
  return useContext(ContextoMigracao) === 'incompleto'
}
