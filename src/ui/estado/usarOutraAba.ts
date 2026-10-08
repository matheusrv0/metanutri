import { useEffect } from 'react'
import { chaveDoEvento } from '@/domain/armazenamentoDaConta.ts'
import { useArmazenamento } from './contextoArmazenamento.ts'

/**
 * CB-124 (spec dados-na-nuvem): outra aba da mesma conta gravou esta chave (ou limpou tudo). Quem guarda
 * uma cópia do dado na tela relê. As chaves de outras contas não contam.
 */
export function useOutraAbaGravou(chave: string, aoGravar: () => void): void {
  const armazenamento = useArmazenamento()
  useEffect(() => {
    const aoMudar = (evento: StorageEvent) => {
      if (evento.key === null || chaveDoEvento(armazenamento, evento.key) === chave) aoGravar()
    }
    window.addEventListener('storage', aoMudar)
    return () => window.removeEventListener('storage', aoMudar)
  }, [armazenamento, chave, aoGravar])
}
