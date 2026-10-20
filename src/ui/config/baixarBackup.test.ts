import { armazenamentoDaConta } from '@/domain/armazenamentoDaConta.ts'
import type { Backup } from '@/domain/perfil.ts'
import { baixarBackup } from './baixarBackup.ts'

const baixado = vi.hoisted(() => ({ blob: null as Blob | null, nome: '' }))

vi.mock('../exportar/baixar.ts', () => ({
  baixarBlob: (blob: Blob, nome: string) => {
    baixado.blob = blob
    baixado.nome = nome
  },
}))

describe('baixarBackup: o backup de Configurações, também na janela de excluir a conta (spec exclusao-de-conta, CA-804)', () => {
  beforeEach(() => {
    localStorage.clear()
    baixado.blob = null
    baixado.nome = ''
  })

  it('baixa os dados da conta que está dentro, com o nome do dia', async () => {
    localStorage.setItem('metanutri:conta:conta-a:pacientes', '[{"id":"ana"}]')
    localStorage.setItem('metanutri:conta:conta-b:pacientes', '[{"id":"bia"}]')
    baixarBackup(armazenamentoDaConta(localStorage, 'conta-a'), new Date('2026-10-19T15:00:00.000Z'))
    expect(baixado.nome).toBe('metanutri-backup-2026-10-19.json')
    expect(baixado.blob?.type).toBe('application/json')
    const lido = JSON.parse((await baixado.blob?.text()) ?? '{}') as Backup
    expect(lido).toMatchObject({ formato: 1, geradoEm: '2026-10-19T15:00:00.000Z', dados: { 'metanutri:pacientes': '[{"id":"ana"}]' } })
    expect(Object.keys(lido.dados)).toEqual(['metanutri:pacientes'])
  })
})
