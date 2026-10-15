import { CHAVE_MUDANCAS, lerMudancas, registrarMudanca } from './copiaDaConta.ts'
import { criarRepositorioModelos } from './modelos.ts'
import type { Armazenamento } from './persistencia.ts'

class Memoria implements Armazenamento {
  readonly dados = new Map<string, string>()
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

describe('D-171: salvar um modelo de plano não mexe nos outros (spec dados-na-nuvem)', () => {
  it('CA-595: criar e apagar um modelo só marca ele; o outro fica como estava guardado', () => {
    const arm = new Memoria()
    const gestante = { id: 'm1', nome: 'Gestante', descricao: '', criadoEm: '2026-10-08T12:00:00.000Z', plano: { refeicoes: [] }, campoDoFuturo: 1 }
    const vegetariano = { ...gestante, id: 'm2', nome: 'Vegetariano' }
    arm.setItem('metanutri:modelos', JSON.stringify([gestante, vegetariano]))
    const observado: Armazenamento = {
      getItem: (k) => arm.getItem(k),
      setItem: (k, v) => {
        const antes = arm.getItem(k)
        arm.setItem(k, v)
        registrarMudanca(arm, k, antes, v, '2026-10-15T12:00:00.000Z')
      },
      removeItem: (k) => arm.removeItem(k),
    }
    const repo = criarRepositorioModelos(observado, { agora: () => '2026-10-15T12:00:00.000Z', gerarId: () => 'm3' })
    repo.salvar({ nome: 'Atleta', descricao: '', plano: { refeicoes: [] } })
    repo.excluir('m2')
    expect(lerMudancas(arm.getItem(CHAVE_MUDANCAS))).toEqual({ alterados: { 'modelos/m3': '2026-10-15T12:00:00.000Z' }, excluidos: { 'modelos/m2': '2026-10-15T12:00:00.000Z' } })
    expect((JSON.parse(arm.getItem('metanutri:modelos') ?? '[]') as unknown[])[0]).toEqual(gestante)
  })
})
