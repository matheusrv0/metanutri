import { litrosDeAgua, missoesDoPlano } from './missoes.ts'
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

  it('D-298 (spec conduta-da-nutricionista): a conta dos litros é uma só, para as missões e para a folha', () => {
    expect(litrosDeAgua(62)).toBe(2.2)
    expect(litrosDeAgua(60)).toBe(2.1)
    expect(litrosDeAgua(null)).toBeNull()
    expect(litrosDeAgua(0)).toBeNull()
  })

  it('sem peso, a missão da água continua existindo sem inventar número', () => {
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
