import { contarUso } from './usoDaConta.ts'
import type { Plano } from './tipos.ts'

const item = (id: string, alimentoId: number) => ({ id, alimentoId, gramas: 100 })

describe('uso da conta (spec alimentos-e-gramaturas, D-370)', () => {
  it('conta os itens das três opções de todos os planos', () => {
    const plano: Plano = {
      refeicoes: [
        { id: 'r1', nome: 'Almoço', horario: '12:00', opcoes: { principal: [item('a', 3), item('b', 561)], substituto1: [item('c', 3)], substituto2: [] } },
        { id: 'r2', nome: 'Jantar', horario: '19:00', opcoes: { principal: [item('d', 3)], substituto1: [], substituto2: [] } },
      ],
    }
    const uso = contarUso([plano, plano])
    expect(uso.get(3)).toBe(6)
    expect(uso.get(561)).toBe(2)
  })

  it('não conta o item de receita nem quebra com plano estragado', () => {
    const estragado = { refeicoes: [{ opcoes: { principal: 'x' } }, null] } as unknown as Plano
    const comReceita: Plano = { refeicoes: [{ id: 'r', nome: 'Lanche', horario: '16:00', opcoes: { principal: [item('a', 0)], substituto1: [], substituto2: [] } }] }
    expect(contarUso([estragado, comReceita, null, undefined]).size).toBe(0)
  })
})
