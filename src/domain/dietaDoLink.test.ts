import { criarCasoVazio } from './caso.ts'
import { copiarDieta, dietaDoPlano, dietaMudou, lerDieta, temDieta, type DietaDoLink } from './dietaDoLink.ts'
import { adicionarItem, atualizarGramas, criarPlanoPadrao, mudarHorario } from './plano.ts'
import { buscarAlimento } from './tabelas.ts'
import type { Alimento, Caso, Plano } from './tipos.ts'

let n = 0
const ids = () => `id${++n}`

const ARROZ = 3
const BATATA = 91
const MACARRAO_CRU = 40

const caso = (p: Partial<Caso> = {}): Caso => ({ ...criarCasoVazio('c1'), nome: 'Maria, 28 anos', ...p })

/** Arroz no almoço, com batata de substituto; macarrão cru no jantar (sem medida caseira); o resto vazio. */
function planoCheio(): Plano {
  let plano = criarPlanoPadrao(ids)
  const almoco = plano.refeicoes[2]
  const jantar = plano.refeicoes[4]
  if (!almoco || !jantar) throw new Error('plano padrão mudou')
  plano = adicionarItem(plano, almoco.id, 'principal', { alimentoId: ARROZ, gramas: 150 }, ids)
  plano = adicionarItem(plano, almoco.id, 'substituto1', { alimentoId: BATATA, gramas: 120 }, ids)
  plano = adicionarItem(plano, jantar.id, 'principal', { alimentoId: MACARRAO_CRU, gramas: 80 }, ids)
  return plano
}

describe('dietaDoPlano: a dieta que vai para o link (D-150)', () => {
  it('CA-531: refeições na ordem do plano, com horário, nome, medida caseira, peso e alimento', () => {
    const dieta = dietaDoPlano(caso(), planoCheio())
    expect(dieta.refeicoes.map((r) => `${r.horario} ${r.nome}`)).toEqual(['12:00 Almoço', '19:00 Jantar'])
    expect(dieta.refeicoes[0]?.opcoes[0]).toEqual([{ medida: '6 colheres de sopa', gramas: 150, alimento: 'Arroz, tipo 1, cozido' }])
  })

  it('CB-156: alimento sem medida caseira conhecida vai só com o peso, como na folha', () => {
    const jantar = dietaDoPlano(caso(), planoCheio()).refeicoes[1]
    expect(jantar?.opcoes[0]).toEqual([{ medida: null, gramas: 80, alimento: buscarAlimento(MACARRAO_CRU)?.descricao }])
  })

  it('CA-532 e D-155: os substitutos vêm depois da principal, e opção vazia não entra', () => {
    const almoco = dietaDoPlano(caso(), planoCheio()).refeicoes[0]
    expect(almoco?.opcoes).toHaveLength(2)
    expect(almoco?.opcoes[1]?.map((i) => i.alimento)).toEqual(['Batata, inglesa, cozida'])
  })

  it('D-155: refeição sem nenhum alimento não entra; item com zero grama também não', () => {
    let plano = planoCheio()
    const cafe = plano.refeicoes[0]
    if (!cafe) throw new Error('sem café')
    plano = adicionarItem(plano, cafe.id, 'principal', { alimentoId: ARROZ, gramas: 100 }, ids)
    const item = plano.refeicoes[0]?.opcoes.principal[0]
    if (!item) throw new Error('sem item')
    plano = atualizarGramas(plano, cafe.id, 'principal', item.id, 0)
    expect(dietaDoPlano(caso(), plano).refeicoes.map((r) => r.nome)).toEqual(['Almoço', 'Jantar'])
  })

  it('D-155: refeição só com substituto entra, com a opção que tem alimento', () => {
    let plano = criarPlanoPadrao(ids)
    const ceia = plano.refeicoes[5]
    if (!ceia) throw new Error('sem ceia')
    plano = adicionarItem(plano, ceia.id, 'substituto2', { alimentoId: BATATA, gramas: 120 }, ids)
    const [so] = dietaDoPlano(caso(), plano).refeicoes
    expect(so?.nome).toBe(ceia.nome)
    expect(so?.opcoes).toHaveLength(1)
  })

  it('CA-533: orientações e receitas vão com as quebras de linha, sem espaço sobrando nas pontas', () => {
    const dieta = dietaDoPlano(caso({ orientacoes: '  Beber água.\nEvitar fritura.  ', receitas: 'Bolo de banana\n2 ovos' }), planoCheio())
    expect(dieta.orientacoes).toBe('Beber água.\nEvitar fritura.')
    expect(dieta.receitas).toBe('Bolo de banana\n2 ovos')
  })

  it('CA-534: nenhum número além do peso do alimento: sem kcal, sem macro e sem nutriente', () => {
    const dieta = dietaDoPlano(caso({ metaEnergiaKcal: 1800 }), planoCheio())
    const texto = JSON.stringify(dieta)
    expect(texto).not.toMatch(/kcal|energia|proteina|carboidrato|lipidio|fibra|nutriente/i)
    for (const refeicao of dieta.refeicoes) for (const opcao of refeicao.opcoes) for (const item of opcao) expect(Object.keys(item).sort()).toEqual(['alimento', 'gramas', 'medida'])
  })

  it('CB-155: produto próprio vai com o nome em texto; alimento que saiu da tabela vira "Alimento removido"', () => {
    const PRODUTO = 900001
    const produto = { ...buscarAlimento(ARROZ), id: PRODUTO, descricao: 'Granola da casa' } as Alimento
    const buscar = (id: number) => (id === PRODUTO ? produto : undefined)
    let plano = criarPlanoPadrao(ids)
    const almoco = plano.refeicoes[2]
    if (!almoco) throw new Error('sem almoço')
    plano = adicionarItem(plano, almoco.id, 'principal', { alimentoId: PRODUTO, gramas: 40 }, ids)
    plano = adicionarItem(plano, almoco.id, 'principal', { alimentoId: 123456, gramas: 30 }, ids)
    const nomes = dietaDoPlano(caso(), plano, buscar).refeicoes[0]?.opcoes[0]?.map((i) => i.alimento)
    expect(nomes).toEqual(['Granola da casa', 'Alimento removido'])
  })
})

describe('a escolha de quantidade do plano no link (spec conduta-da-nutricionista, D-297)', () => {
  it('CA-928: em "Gramas", a cópia vai sem medida: qualquer versão do app mostra só o peso', () => {
    const dieta = dietaDoPlano(caso({ quantidades: 'gramas' }), planoCheio())
    for (const item of dieta.refeicoes.flatMap((r) => r.opcoes.flat())) expect(item.medida).toBeNull()
    expect(dieta.refeicoes[0]?.opcoes[0]).toEqual([{ medida: null, gramas: 150, alimento: 'Arroz, tipo 1, cozido' }])
  })

  it('CA-927 e CA-928: em "Medida caseira", a medida para a paciente, com a ponta de faca da manteiga', () => {
    let plano = planoCheio()
    const desjejum = plano.refeicoes[0]
    if (!desjejum) throw new Error('sem desjejum')
    plano = adicionarItem(plano, desjejum.id, 'principal', { alimentoId: 261, gramas: 5 }, ids)
    plano = adicionarItem(plano, desjejum.id, 'principal', { alimentoId: 490, gramas: 55 }, ids)
    const itens = dietaDoPlano(caso(), plano).refeicoes[0]?.opcoes[0]
    expect(itens?.map((i) => i.medida)).toEqual(['1 ponta de faca', '1 unidade'])
  })

  it('CA-933: a linha automática da água não vai para o link (as missões já têm a água)', () => {
    const dieta = dietaDoPlano(caso({ pesoKg: 62, orientacoes: 'Coma devagar.' }), planoCheio())
    expect(dieta.orientacoes).toBe('Coma devagar.')
  })

  it('CB-292: link enviado antes, com a manteiga em colher de chá, avisa uma vez que o plano mudou (agora é ponta de faca)', () => {
    let plano = planoCheio()
    const desjejum = plano.refeicoes[0]
    if (!desjejum) throw new Error('sem desjejum')
    plano = adicionarItem(plano, desjejum.id, 'principal', { alimentoId: 261, gramas: 5 }, ids)
    const agora = dietaDoPlano(caso(), plano)
    const antes = {
      ...agora,
      refeicoes: agora.refeicoes.map((r) => ({ ...r, opcoes: r.opcoes.map((o) => o.map((i) => (i.alimento.startsWith('Manteiga') ? { ...i, medida: '1 colher de chá' } : i))) })),
    }
    expect(dietaMudou(copiarDieta(antes, '2026-10-15'), agora)).toBe(true)
    expect(lerDieta(copiarDieta(antes, '2026-10-15'))?.refeicoes[0]?.opcoes[0]?.[0]?.medida).toBe('1 colher de chá')
  })

  it('CA-930: trocar a escolha muda o que a paciente vê, e o link avisa que o plano mudou', () => {
    const noLink = copiarDieta(dietaDoPlano(caso(), planoCheio()), '2026-10-20')
    expect(dietaMudou(noLink, dietaDoPlano(caso(), planoCheio()))).toBe(false)
    expect(dietaMudou(noLink, dietaDoPlano(caso({ quantidades: 'gramas' }), planoCheio()))).toBe(true)
  })
})

describe('copiarDieta, dietaMudou e temDieta', () => {
  it('D-158: a cópia guarda o dia em que foi feita', () => {
    const copia = copiarDieta(dietaDoPlano(caso(), planoCheio()), '2026-10-14')
    expect(copia.copiadaEm).toBe('2026-10-14')
    expect(copia.refeicoes).toHaveLength(2)
  })

  it('CA-546: o mesmo plano em outro dia não conta como mudança; meta de kcal e medidas do paciente também não', () => {
    const plano = planoCheio()
    const copia = copiarDieta(dietaDoPlano(caso(), plano), '2026-10-01')
    expect(dietaMudou(copia, dietaDoPlano(caso({ metaEnergiaKcal: 1500, pesoKg: 70 }), plano))).toBe(false)
  })

  it('CA-545: quantidade, horário, alimento e orientações mudados contam como mudança', () => {
    const plano = planoCheio()
    const copia = copiarDieta(dietaDoPlano(caso(), plano), '2026-10-01')
    const almoco = plano.refeicoes[2]
    const arroz = almoco?.opcoes.principal[0]
    if (!almoco || !arroz) throw new Error('plano padrão mudou')
    expect(dietaMudou(copia, dietaDoPlano(caso(), atualizarGramas(plano, almoco.id, 'principal', arroz.id, 200)))).toBe(true)
    expect(dietaMudou(copia, dietaDoPlano(caso(), mudarHorario(plano, almoco.id, '12:30')))).toBe(true)
    expect(dietaMudou(copia, dietaDoPlano(caso(), adicionarItem(plano, almoco.id, 'principal', { alimentoId: BATATA, gramas: 50 }, ids)))).toBe(true)
    expect(dietaMudou(copia, dietaDoPlano(caso({ orientacoes: 'Beber água.' }), plano))).toBe(true)
  })

  it('CB-159: dieta sem refeição, sem orientação e sem receita conta como sem dieta; só com orientações, conta', () => {
    const vazia = copiarDieta(dietaDoPlano(caso(), criarPlanoPadrao(ids)), '2026-10-14')
    expect(temDieta(vazia)).toBe(false)
    expect(temDieta(null)).toBe(false)
    expect(temDieta({ ...vazia, orientacoes: 'Beber água.' })).toBe(true)
    expect(temDieta(copiarDieta(dietaDoPlano(caso(), planoCheio()), '2026-10-14'))).toBe(true)
  })
})

describe('lerDieta: o que chega da nuvem ou do aparelho (CB-153)', () => {
  const BOA: DietaDoLink = copiarDieta(dietaDoPlano(caso({ orientacoes: 'Beber água.' }), planoCheio()), '2026-10-14')

  it('a dieta boa volta igual', () => {
    expect(lerDieta(JSON.parse(JSON.stringify(BOA)))).toEqual(BOA)
  })

  it('CB-150: nada, nulo ou formato estranho conta como sem dieta', () => {
    for (const lixo of [undefined, null, 'dieta', 42, [], { refeicoes: 'x' }, { refeicoes: [], orientacoes: 3 }]) expect(lerDieta(lixo)).toBeNull()
  })

  it('refeição ou item estragado sai, e o resto fica', () => {
    const v = {
      ...BOA,
      refeicoes: [
        { horario: '12:00', nome: 'Almoço', opcoes: [[{ medida: null, gramas: 100, alimento: 'Arroz' }, { gramas: 'muito' }], 'lixo'] },
        { nome: 'Sem horário' },
      ],
    }
    expect(lerDieta(v)?.refeicoes).toEqual([{ horario: '12:00', nome: 'Almoço', opcoes: [[{ medida: null, gramas: 100, alimento: 'Arroz' }]] }])
  })

  it('CA-534: campo a mais (kcal, por exemplo) é descartado', () => {
    const v = {
      ...BOA,
      kcal: 1800,
      refeicoes: [{ horario: '12:00', nome: 'Almoço', kcal: 600, opcoes: [[{ medida: '1 unidade', gramas: 100, alimento: 'Pão', kcal: 300 }]] }],
    }
    expect(JSON.stringify(lerDieta(v))).not.toContain('kcal')
  })

  it('sem o dia da cópia, ou com dia estranho, o dia fica vazio e a dieta continua', () => {
    expect(lerDieta({ ...BOA, copiadaEm: 7 })?.copiadaEm).toBe('')
  })
})
