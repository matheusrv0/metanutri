import { lerPerfil, PERFIL_VAZIO } from './perfil.ts'
import type { Armazenamento } from './persistencia.ts'

const guardando = (texto: string): Armazenamento => ({ getItem: () => texto, setItem: () => undefined, removeItem: () => undefined })

describe('lerPerfil', () => {
  it('item 7: campo com tipo errado cai no vazio, campo a campo', () => {
    const perfil = lerPerfil(guardando('{"nome":null,"tipo":"profissional","crn":7}'))
    expect(perfil.nome).toBe('')
    expect(perfil.tipo).toBe('profissional')
    expect(perfil.crn).toBe('')
  })

  it('aproveita os campos de tipo certo e ignora tipo desconhecido', () => {
    const perfil = lerPerfil(guardando('{"nome":"Ana","tipo":"outro","logo":3,"responsavel":"Dra. Bia"}'))
    expect(perfil).toEqual({ ...PERFIL_VAZIO, nome: 'Ana', responsavel: 'Dra. Bia' })
  })
})
