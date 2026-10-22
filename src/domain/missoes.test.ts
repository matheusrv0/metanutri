import { horaNoTexto, litrosDeAgua, missoesDoPlano } from './missoes.ts'
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
    expect(missoes.some((m) => m.texto.includes('Almoço por volta das 12h'))).toBe(true)
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

/** Um plano com estes alimentos no almoço. */
const comNoAlmoco = (...alimentos: readonly number[]) => {
  const plano = criarPlanoPadrao(ids)
  const almoco = plano.refeicoes[2]
  if (!almoco) throw new Error('plano incompleto')
  return alimentos.reduce((p, alimentoId) => adicionarItem(p, almoco.id, 'principal', { alimentoId, gramas: 100 }, ids), plano)
}

const ALFACE = 78
const BROCOLIS = 100
const CENOURA = 109
const ALHO_PORO = 83
const FEIJAO = 561
const BATATA = 91
const MANDIOCA = 129
const PAO_DE_QUEIJO = 140
const FARINHA_DE_MANDIOCA = 122
const ALHO = 82
const EXTRATO_DE_TOMATE = 158

describe('CA-1192 (spec textos-e-promessas, D-411): a missão das verduras conta só verdura e legume', () => {
  const vegetais = (plano: ReturnType<typeof comNoAlmoco>) => missoesDoPlano(plano).find((m) => m.id === 'vegetais')

  it('com verdura ou legume, a missão diz o que é, sem prometer almoço e jantar', () => {
    for (const alimento of [ALFACE, BROCOLIS, CENOURA, ALHO_PORO]) {
      expect(vegetais(comNoAlmoco(alimento)), String(alimento)).toEqual({
        id: 'vegetais',
        texto: 'Comer as verduras e os legumes do plano',
        origem: 'Verduras e legumes que estão no plano',
      })
    }
  })

  it('feijão é leguminosa, não verdura: sozinho, não cria a missão', () => {
    expect(vegetais(comNoAlmoco(FEIJAO))).toBeUndefined()
  })

  it('batata e mandioca (raízes e tubérculos), pão de queijo e farinha (amido) e temperos não criam a missão', () => {
    for (const alimento of [BATATA, MANDIOCA, PAO_DE_QUEIJO, FARINHA_DE_MANDIOCA, ALHO, EXTRATO_DE_TOMATE]) {
      expect(vegetais(comNoAlmoco(alimento)), String(alimento)).toBeUndefined()
    }
  })

  it('CB-389: com uma verdura junto, a batata não atrapalha', () => {
    expect(vegetais(comNoAlmoco(BATATA, ALFACE))?.texto).toBe('Comer as verduras e os legumes do plano')
  })

  it('CB-381: o id continua "vegetais", para as marcações dos links já enviados valerem', () => {
    expect(vegetais(comNoAlmoco(ALFACE))?.id).toBe('vegetais')
  })
})

describe('CA-1192 (spec textos-e-promessas, D-412): a hora no texto da missão', () => {
  it.each([
    ['12:00', 'por volta das 12h'],
    ['12:30', 'por volta das 12h30'],
    ['07:00', 'por volta das 7h'],
    ['01:00', 'por volta da 1h'],
    ['00:30', 'por volta da 0h30'],
  ])('%s vira "%s"', (antes, depois) => {
    expect(horaNoTexto(antes)).toBe(depois)
  })

  it('CB-388: fora do formato, o horário como veio', () => {
    expect(horaNoTexto('meio-dia')).toBe('por volta de meio-dia')
  })

  it('a missão da refeição usa a hora no texto', () => {
    expect(missoesDoPlano(comNoAlmoco(ALFACE)).find((m) => m.origem === 'Refeição do plano')?.texto).toBe('Almoço por volta das 12h')
  })
})
