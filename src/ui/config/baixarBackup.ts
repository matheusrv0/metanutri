import { CHAVES_DE_DADOS, montarBackup } from '@/domain/perfil.ts'
import type { Armazenamento } from '@/domain/persistencia.ts'
import { baixarBlob } from '../exportar/baixar.ts'

/**
 * O backup em arquivo de tudo o que a conta guarda neste navegador (spec dados-por-conta, D-125). Configurações e a
 * janela de excluir a conta baixam o mesmo arquivo (spec exclusao-de-conta, CA-804).
 */
export function baixarBackup(armazenamento: Armazenamento | null, agora: Date = new Date()): void {
  const quando = agora.toISOString()
  const backup = montarBackup(armazenamento, [...CHAVES_DE_DADOS], quando)
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  baixarBlob(blob, `metanutri-backup-${quando.slice(0, 10)}.json`)
}
