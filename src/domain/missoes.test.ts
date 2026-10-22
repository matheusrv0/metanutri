import { missoesDoPlano } from './missoes.ts'
import { adicionarItem, criarPlanoPadrao } from './plano.ts'

let n = 0
const ids = () => `id${++n}`

const comAlimentos = () => {
  const plano = criarPlanoPadrao(ids)
  const almoco = plano.refeicoes[2]
  const desjejum = plano.refeicoes[0]
  if (!almoco || !desjejum) throw new Error('plano incompleto')
  const a = adicionarItem(plano, almoco.id, 'principal', { alimentoId: 3, gramas: 150 }, ids)
  const b = adicionarItem(a, almoco.id, 'principal', { alimentoId: 91, gramas: 100 }, ids)
  return adicionarItem(b, desjejum.id, 'principal', { alimentoId: 3, gramas: 50 }, ids)
}

describe('missões do dia', () => {
  it('cria uma missão por refeição que tem alimento', () => {
    const missoes = missoesDoPlano(comAlimentos())
    expect(missoes.filter((m) => m.origem === 'Refeição do plano')).toHaveLength(2)
    expect(missoes.some((m) => m.texto.includes('Almoço por volta das 12:00'))).toBe(true)
  })

  it('CA-1094 (spec ficha-unica): a missão usa a meta de água do plano, a mesma da folha', () => {
    const crianca = missoesDoPlano(comAlimentos(), { aguaL: 1.5 })
    expect(crianca.find((m) => m.id === 'agua')).toEqual({ id: 'agua', texto: 'Beber cerca de 1,5 litro de água', origem: 'Meta de água do plano' })
    expect(missoesDoPlano(comAlimentos(), { aguaL: 2.5 }).find((m) => m.id === 'agua')?.texto).toBe('Beber cerca de 2,5 litros de água')
  })

  it('sem meta de água (sem peso, ou tirada da folha), a missão continua existindo sem inventar número', () => {
    const missoes = missoesDoPlano(comAlimentos())
    expect(missoes.find((m) => m.id === 'agua')?.texto).toBe('Beber água ao longo do dia')
  })

  it('CA-555 (spec dieta-no-link): os ids das missões não mudam quando o plano muda, e o que foi marcado continua valendo', () => {
    const antes = comAlimentos()
    const almoco = antes.refeicoes[2]
    const lanche = antes.refeicoes[3]
    if (!almoco || !lanche) throw new Error('plano incompleto')
    const depois = adicionarItem(adicionarItem(antes, almoco.id, 'principal', { alimentoId: 3, gramas: 40 }, ids), lanche.id, 'principal', { alimentoId: 3, gramas: 30 }, ids)
    const idsAntes = missoesDoPlano(antes).map((m) => m.id)
    const idsDepois = missoesDoPlano(depois).map((m) => m.id)
    expect(idsDepois).toEqual(expect.arrayContaining(idsAntes))
    expect(idsDepois).toContain(`refeicao-${lanche.id}`)
  })

  it('plano vazio não gera missão nenhuma', () => {
    expect(missoesDoPlano(criarPlanoPadrao(ids))).toEqual([])
  })
})
