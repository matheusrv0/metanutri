import { useMemo } from 'react'
import type { ResumoCaso } from '@/domain/persistencia.ts'
import { contarUso } from '@/domain/usoDaConta.ts'
import { useCasosOpcional } from './contextoCasos.ts'

const SEM_USO: ReadonlyMap<number, number> = new Map()

/** Uma conta por lista de planos: a lista muda quando um plano é salvo, e a busca relê só quando alguém digita. */
const contas = new WeakMap<readonly ResumoCaso[], ReadonlyMap<number, number>>()

/**
 * O uso de cada alimento nos planos da conta (spec alimentos-e-gramaturas, D-370). Só é contado quando `ligado` (a
 * pessoa começou a digitar), para não ler todos os planos a cada tecla nem a cada salvamento.
 */
export function useUsoDaConta(ligado: boolean): ReadonlyMap<number, number> {
  const valor = useCasosOpcional()
  const lista = valor?.casos
  const repositorio = valor?.repositorio
  return useMemo(() => {
    if (!ligado || !lista || !repositorio) return SEM_USO
    const conhecida = contas.get(lista)
    if (conhecida) return conhecida
    const uso = contarUso(lista.map((c) => repositorio.obter(c.id)?.plano))
    contas.set(lista, uso)
    return uso
  }, [ligado, lista, repositorio])
}
