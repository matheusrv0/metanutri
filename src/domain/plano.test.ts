import {
  adicionarItem,
  adicionarRefeicao,
  atualizarGramas,
  criarPlanoPadrao,
  mudarHorario,
  removerItem,
  removerRefeicao,
  renomearRefeicao,
} from './plano.ts'
import type { Plano } from './tipos.ts'

const gerador = () => {
  let n = 0
  return () => `id${++n}`
}

const refeicao = (plano: Plano, nome: string) => {
  const r = plano.refeicoes.find((x) => x.nome === nome)
  if (!r) throw new Error(`refeição ${nome} ausente`)
  return r
}

describe('criarPlanoPadrao (CA-12, CA-14)', () => {
  it('começa com as seis refeições do modelo de estágio, cada uma com três opções vazias', () => {
    const plano = criarPlanoPadrao(gerador())
    expect(plano.refeicoes.map((r) => [r.horario, r.nome])).toEqual([
      ['06:00', 'Desjejum'],
      ['09:00', 'Lanche da manhã'],
      ['12:00', 'Almoço'],
      ['16:00', 'Lanche da tarde'],
      ['19:00', 'Jantar'],
      ['21:00', 'Ceia'],
    ])
    for (const r of plano.refeicoes) {
      expect(r.opcoes).toEqual({ principal: [], substituto1: [], substituto2: [] })
    }
    expect(new Set(plano.refeicoes.map((r) => r.id)).size).toBe(6)
  })
})

describe('operações de refeição (CA-13)', () => {
  it('renomeia', () => {
    const plano = criarPlanoPadrao(gerador())
    const alterado = renomearRefeicao(plano, refeicao(plano, 'Ceia').id, 'Lanche da noite')
    expect(alterado.refeicoes.map((r) => r.nome)).toContain('Lanche da noite')
    expect(plano.refeicoes.map((r) => r.nome)).toContain('Ceia') // imutável
  })

  it('recusa nome vazio', () => {
    const plano = criarPlanoPadrao(gerador())
    expect(() => renomearRefeicao(plano, refeicao(plano, 'Ceia').id, '   ')).toThrow(/nome/)
  })

  it('muda o horário e reordena as refeições por horário', () => {
    const plano = criarPlanoPadrao(gerador())
    const alterado = mudarHorario(plano, refeicao(plano, 'Ceia').id, '07:30')
    expect(alterado.refeicoes.map((r) => r.nome).slice(0, 2)).toEqual(['Desjejum', 'Ceia'])
  })

  it.each(['7:30', '24:00', '12:60', 'meio-dia', ''])('recusa horário inválido "%s"', (h) => {
    const plano = criarPlanoPadrao(gerador())
    expect(() => mudarHorario(plano, refeicao(plano, 'Ceia').id, h)).toThrow(/HH:MM/)
  })

  it('adiciona refeição na posição do horário', () => {
    const id = gerador()
    const plano = adicionarRefeicao(criarPlanoPadrao(id), { nome: 'Pós-treino', horario: '17:30' }, id)
    expect(plano.refeicoes.map((r) => r.nome)).toEqual(['Desjejum', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Pós-treino', 'Jantar', 'Ceia'])
    expect(refeicao(plano, 'Pós-treino').opcoes.principal).toEqual([])
  })

  it('remove refeição', () => {
    const plano = criarPlanoPadrao(gerador())
    const alterado = removerRefeicao(plano, refeicao(plano, 'Lanche da manhã').id)
    expect(alterado.refeicoes).toHaveLength(5)
  })

  it('operar em refeição inexistente é erro', () => {
    expect(() => renomearRefeicao(criarPlanoPadrao(gerador()), 'nao-existe', 'X')).toThrow(/nao-existe/)
  })
})

describe('operações de item', () => {
  it('adiciona item na opção escolhida', () => {
    const id = gerador()
    const plano = criarPlanoPadrao(id)
    const almoco = refeicao(plano, 'Almoço').id
    const p1 = adicionarItem(plano, almoco, 'principal', { alimentoId: 3, gramas: 150 }, id)
    const p2 = adicionarItem(p1, almoco, 'substituto1', { alimentoId: 91, gramas: 350 }, id)
    const r = refeicao(p2, 'Almoço')
    expect(r.opcoes.principal).toEqual([{ id: expect.any(String), alimentoId: 3, gramas: 150 }])
    expect(r.opcoes.substituto1).toEqual([{ id: expect.any(String), alimentoId: 91, gramas: 350 }])
    expect(r.opcoes.substituto2).toEqual([])
  })

  it('edita gramas e remove item', () => {
    const id = gerador()
    const plano = criarPlanoPadrao(id)
    const almoco = refeicao(plano, 'Almoço').id
    const comItem = adicionarItem(plano, almoco, 'principal', { alimentoId: 3, gramas: 150 }, id)
    const itemId = refeicao(comItem, 'Almoço').opcoes.principal[0]?.id ?? ''
    const editado = atualizarGramas(comItem, almoco, 'principal', itemId, 200)
    expect(refeicao(editado, 'Almoço').opcoes.principal[0]?.gramas).toBe(200)
    const semItem = removerItem(editado, almoco, 'principal', itemId)
    expect(refeicao(semItem, 'Almoço').opcoes.principal).toEqual([])
  })

  it('CB-04: aceita 0 g e recusa quantidade negativa', () => {
    const id = gerador()
    const plano = criarPlanoPadrao(id)
    const almoco = refeicao(plano, 'Almoço').id
    expect(() => adicionarItem(plano, almoco, 'principal', { alimentoId: 3, gramas: 0 }, id)).not.toThrow()
    expect(() => adicionarItem(plano, almoco, 'principal', { alimentoId: 3, gramas: -1 }, id)).toThrow(RangeError)
    const comItem = adicionarItem(plano, almoco, 'principal', { alimentoId: 3, gramas: 10 }, id)
    const itemId = refeicao(comItem, 'Almoço').opcoes.principal[0]?.id ?? ''
    expect(() => atualizarGramas(comItem, almoco, 'principal', itemId, -5)).toThrow(RangeError)
  })

  it('editar item inexistente é erro', () => {
    const plano = criarPlanoPadrao(gerador())
    expect(() => atualizarGramas(plano, refeicao(plano, 'Almoço').id, 'principal', 'x', 10)).toThrow(/x/)
  })
})
