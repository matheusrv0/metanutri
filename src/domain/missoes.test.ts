import { listaDeCompras, missoesDoPlano } from './missoes.ts'
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

  it('a água usa 35 ml por quilo quando há peso', () => {
    const missoes = missoesDoPlano(comAlimentos(), { pesoKg: 60 })
    expect(missoes.find((m) => m.id === 'agua')?.texto).toBe('Beber cerca de 2,1 litros de água')
  })

  it('sem peso, a missão da água continua existindo sem inventar número', () => {
    const missoes = missoesDoPlano(comAlimentos())
    expect(missoes.find((m) => m.id === 'agua')?.texto).toBe('Beber água ao longo do dia')
  })

  it('plano vazio não gera missão nenhuma', () => {
    expect(missoesDoPlano(criarPlanoPadrao(ids))).toEqual([])
  })

  it('a lista de compras soma o mesmo alimento em refeições diferentes', () => {
    const compras = listaDeCompras(comAlimentos())
    expect(compras.find((c) => c.descricao.startsWith('Arroz'))?.gramas).toBe(200)
    expect(compras.find((c) => c.descricao.startsWith('Batata'))?.gramas).toBe(100)
  })
})
