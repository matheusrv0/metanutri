import { IDS_DO_CATALOGO_IA } from '../../supabase/functions/_shared/iaCatalogo.ts'
import type { RespostaDaIa } from '../../supabase/functions/_shared/iaContrato.ts'
import { casoDaGestante, gerarId, pacienteDaGestante, restricoesDoCaso } from './ia.test-utils.ts'
import {
  conferirOpcao,
  conferirSugestao,
  ENERGIA_INCOERENTE,
  FORA_DA_BASE,
  GESTACAO_ABAIXO,
  IDADE_ABAIXO,
  LACTACAO_ABAIXO,
  NAO_GOSTA,
  PORCAO_AJUSTADA,
  PORCAO_REDUZIDA,
  PROPRIO_FORA_DO_COBRIR,
  propostaParaPlano,
  QUANTIDADE_FORA,
  type ContextoDaConferencia,
} from './iaConferencia.ts'
import { gastoCalculado } from './iaPedido.ts'
import { AVISO_GESTACAO_FIGADO, SEM_RESTRICOES } from './restricoes.ts'
import arquivo from '../data/base-ampliada.json'
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from './baseAmpliada.ts'
import { buscarAlimento, registrarBaseAmpliada } from './tabelas.ts'
import { totaisDoPlano } from './totais.ts'
import type { Alimento, BuscarAlimento, Caso } from './tipos.ts'

const CATALOGO = new Set(IDS_DO_CATALOGO_IA)
const REFEICOES = [
  { nome: 'Café da manhã', horario: '07:00' },
  { nome: 'Almoço', horario: '12:00' },
]

function contexto(mudar: Partial<ContextoDaConferencia> = {}): ContextoDaConferencia {
  const caso = mudar.caso ?? casoDaGestante()
  return {
    buscar: buscarAlimento,
    caso,
    restricoes: restricoesDoCaso(caso),
    metaKcal: 2150,
    gastoCalculado: gastoCalculado(caso),
    refeicoes: REFEICOES,
    idsDoCatalogo: CATALOGO,
    idsProprios: new Set(),
    ...mudar,
  }
}

const resposta = (cafe: readonly (readonly [number, number])[], almoco: readonly (readonly [number, number])[] = [], opcao2Cafe: readonly (readonly [number, number])[] = []): RespostaDaIa => ({
  refeicoes: [
    { refeicao: 0, principal: cafe.map(([alimentoId, gramas]) => ({ alimentoId, gramas })), opcao2: opcao2Cafe.map(([alimentoId, gramas]) => ({ alimentoId, gramas })) },
    { refeicao: 1, principal: almoco.map(([alimentoId, gramas]) => ({ alimentoId, gramas })), opcao2: [] },
  ],
  mudancas: [],
  pontosAConfirmar: [],
})

/** Com a meta igual à energia do que fica depois das conferências 1 a 8, o ajuste de energia não mexe em nada. */
function semAjuste(r: RespostaDaIa, mudar: Partial<ContextoDaConferencia> = {}) {
  const ctx = contexto(mudar)
  const ficam = r.refeicoes.map((x) => ({ principal: conferirOpcao(x.principal, x.refeicao, 'principal', ctx, []) }))
  const plano = { refeicoes: ficam.map((x, i) => ({ id: `r${i}`, nome: '', horario: '12:00', opcoes: { principal: x.principal.map((it, j) => ({ id: `${i}-${j}`, alimentoId: it.alimentoId, gramas: it.gramas })), substituto1: [], substituto2: [] } })) }
  const kcal = totaisDoPlano(plano, ctx.buscar).nutrientes.energia_kcal.total
  return conferirSugestao(r, { ...ctx, metaKcal: Math.max(kcal, 1) })
}

const adulto = (): Caso => ({ ...casoDaGestante(), condicao: { tipo: 'nenhuma' } })

describe('spec assistente-ia, seção 5: as conferências que retiram', () => {
  it('CA-2336 (1): id fora do catálogo e dos próprios do pedido sai como "Alimento fora da base"', () => {
    const p = semAjuste(resposta([[53, 50], [777_777, 30]]))
    expect(p.retirados).toEqual([{ alimentoId: 777_777, nome: 'Alimento 777777', gramas: 30, refeicao: 0, opcao: 'principal', motivo: FORA_DA_BASE }])
    expect(p.refeicoes[0]?.principal.map((i) => i.alimentoId)).toEqual([53])
  })

  it('CA-2337 (2): a restrição da ficha sai com o aviso dela, também na opção 2', () => {
    const p = semAjuste(resposta([[53, 50]], [], [[458, 200]]))
    expect(p.retirados).toEqual([{ alimentoId: 458, nome: 'Leite, de vaca, integral', gramas: 200, refeicao: 0, opcao: 'opcao2', motivo: 'Alergia: leite e derivados' }])
  })

  it('CA-2337 (2): o texto livre da ficha ("Não come: coentro")', () => {
    const caso = casoDaGestante()
    const restricoes = restricoesDoCaso(caso, pacienteDaGestante({ restricoes: 'banana' }))
    const p = semAjuste(resposta([[182, 75], [53, 50]]), { restricoes })
    expect(p.retirados[0]?.motivo).toBe('Não come: banana')
  })

  it('CA-2338 (3): o cuidado da fase de vida: fígado na gestação', () => {
    const p = semAjuste(resposta([], [[356, 100], [3, 150]]))
    expect(p.retirados).toEqual([{ alimentoId: 356, nome: 'Carne, bovina, fígado, grelhado', gramas: 100, refeicao: 1, opcao: 'principal', motivo: AVISO_GESTACAO_FIGADO }])
  })

  describe('CA-2339 e CA-2340 (4 e 5): a regra prescritível e o alimento próprio', () => {
    const base = buscarAlimento(1) as Alimento
    const proprio = (id: number, mudar: Partial<Alimento>, sugerir = true, energiaIncoerente = false): Alimento => ({
      ...base,
      id,
      descricao: `Próprio ${id}`,
      categoria: 'Cereais e derivados',
      proprio: { tipo: 'alimento', nomeParaPaciente: '', sugerir, energiaIncoerente },
      ...mudar,
    })
    const proprios = [
      proprio(900_001, { descricao: 'Cerveja artesanal da casa' }),
      proprio(900_002, { categoria: 'Suplementos', descricao: 'Whey de baunilha' }),
      proprio(900_003, {}, true, true),
      proprio(900_004, {}, false),
      proprio(900_005, { descricao: 'Pão de fermentação natural' }),
    ]
    const buscar: BuscarAlimento = (id) => proprios.find((a) => a.id === id) ?? buscarAlimento(id)
    const ctx = { buscar, idsProprios: new Set(proprios.map((a) => a.id)), restricoes: SEM_RESTRICOES, caso: adulto() }

    it.each([
      [900_001, 'Bebida alcoólica'],
      [900_002, 'Suplemento'],
      [900_003, ENERGIA_INCOERENTE],
      [900_004, PROPRIO_FORA_DO_COBRIR],
    ])('o próprio %i sai com "%s"', (id, motivo) => {
      const p = semAjuste(resposta([[id, 50], [900_005, 50]]), ctx)
      expect(p.retirados.map((r) => [r.alimentoId, r.motivo])).toEqual([[id, motivo]])
      expect(p.refeicoes[0]?.principal.map((i) => i.alimentoId)).toEqual([900_005])
    })
  })
})

describe('as conferências que marcam e ajustam a porção', () => {
  it('CA-2341 (6): o não gosta fica e é marcado', () => {
    const p = semAjuste(resposta([], [[127, 50], [3, 150]]))
    expect(p.retirados).toEqual([])
    expect(p.refeicoes[1]?.principal.find((i) => i.alimentoId === 127)?.marcas).toEqual([NAO_GOSTA])
  })

  it('CA-2342 (7): acima do máximo do grupo reduz ao máximo e marca', () => {
    const p = semAjuste(resposta([], [[3, 400]]))
    expect(p.refeicoes[1]?.principal).toEqual([{ alimentoId: 3, gramas: 150, marcas: [PORCAO_REDUZIDA] }])
  })

  it('CA-2342 (7): na criança, o máximo do grupo encolhe com a idade', () => {
    const crianca: Caso = { ...casoDaGestante(), idadeAnos: 6, condicao: { tipo: 'nenhuma' } }
    const p = semAjuste(resposta([], [[3, 150]]), { caso: crianca, restricoes: SEM_RESTRICOES })
    expect(p.refeicoes[1]?.principal[0]).toEqual({ alimentoId: 3, gramas: 100, marcas: [PORCAO_REDUZIDA] })
  })

  it('CA-2343 (8): acima de 2.000 g sai; abaixo da mínima de servir sobe e marca', () => {
    const p = semAjuste(resposta([[53, 50]], [[3, 2500], [410, 10]]))
    expect(p.retirados.map((r) => [r.alimentoId, r.motivo])).toEqual([[3, QUANTIDADE_FORA]])
    expect(p.refeicoes[1]?.principal).toEqual([{ alimentoId: 410, gramas: 50, marcas: [QUANTIDADE_FORA] }])
  })

  it('CB-1305: o mesmo alimento duas vezes na mesma opção vira um item com os gramas somados', () => {
    const p = semAjuste(resposta([], [[3, 60], [3, 60]]))
    expect(p.refeicoes[1]?.principal).toEqual([{ alimentoId: 3, gramas: 120, marcas: [] }])
  })

  it('CB-1304: a refeição que a IA não preencheu sai vazia, com o nome e o horário do pedido', () => {
    const p = semAjuste({ refeicoes: [{ refeicao: 1, principal: [{ alimentoId: 3, gramas: 120 }], opcao2: [] }], mudancas: [], pontosAConfirmar: [] })
    expect(p.refeicoes.map((r) => [r.nome, r.horario, r.principal.length])).toEqual([
      ['Café da manhã', '07:00', 0],
      ['Almoço', '12:00', 1],
    ])
  })
})

describe('CA-2344 e CA-2349 (9): o ajuste de energia', () => {
  const sugestao = resposta(
    [[53, 50], [488, 50], [226, 170]],
    [[3, 100], [561, 100], [410, 90], [78, 30]],
    [[533, 135]],
  )
  const kcalDe = (r: RespostaDaIa) =>
    totaisDoPlano({ refeicoes: r.refeicoes.map((x, i) => ({ id: `r${i}`, nome: '', horario: '12:00', opcoes: { principal: x.principal.map((it, j) => ({ id: `${i}-${j}`, ...it })), substituto1: [], substituto2: [] } })) }, buscarAlimento).nutrientes.energia_kcal.total

  it('energia abaixo de 90%: as porções sobem pelo mesmo fator (no máximo 1,25 por rodada), dentro do grupo, e são marcadas', () => {
    const antes = kcalDe(sugestao)
    const meta = antes / 0.8
    const p = conferirSugestao(sugestao, contexto({ metaKcal: meta, caso: adulto(), restricoes: SEM_RESTRICOES }))
    expect(p.totais.kcal).toBeGreaterThan(antes)
    expect(p.totais.pctDaMeta).toBeGreaterThan(85)
    const almoco = p.refeicoes[1]?.principal ?? []
    expect(almoco.some((i) => i.marcas.includes(PORCAO_AJUSTADA))).toBe(true)
    // Nenhuma porção passa do máximo do grupo: arroz até 150 g, frango até 120 g.
    expect(almoco.find((i) => i.alimentoId === 3)?.gramas ?? 0).toBeLessThanOrEqual(150)
    expect(almoco.find((i) => i.alimentoId === 410)?.gramas ?? 0).toBeLessThanOrEqual(120)
    // A opção 2 recebe o fator da principal.
    expect(p.refeicoes[0]?.opcao2[0]?.marcas).toContain(PORCAO_AJUSTADA)
  })

  it('energia acima de 110%: as porções descem, nunca abaixo da mínima de servir', () => {
    const antes = kcalDe(sugestao)
    const p = conferirSugestao(sugestao, contexto({ metaKcal: antes / 1.2, caso: adulto(), restricoes: SEM_RESTRICOES }))
    expect(p.totais.kcal).toBeLessThan(antes)
    expect(p.refeicoes[1]?.principal.find((i) => i.alimentoId === 410)?.gramas ?? 0).toBeGreaterThanOrEqual(50)
  })

  it('dentro de 90% a 110%: nada muda e nada é marcado', () => {
    const antes = kcalDe(sugestao)
    const p = conferirSugestao(sugestao, contexto({ metaKcal: antes, caso: adulto(), restricoes: SEM_RESTRICOES }))
    expect(p.refeicoes.flatMap((r) => [...r.principal, ...r.opcao2]).every((i) => !i.marcas.includes(PORCAO_AJUSTADA))).toBe(true)
  })

  it('ainda fora depois de 2 rodadas: só marca no plano', () => {
    const antes = kcalDe(sugestao)
    const p = conferirSugestao(sugestao, contexto({ metaKcal: antes * 3, caso: adulto(), restricoes: SEM_RESTRICOES }))
    expect(p.marcasDoPlano.some((m) => /^Energia \d+% da meta \(fora de 90% a 110%\)$/.test(m))).toBe(true)
  })
})

describe('as marcas do plano', () => {
  it('CA-2345 (10): macro fora da meta, na frase da linha dos totais', () => {
    const caso: Caso = { ...adulto(), metasMacros: { proteina: { tipo: 'g_kg', min: 0.8, max: 1 } } }
    const p = semAjuste(resposta([[488, 100]], [[3, 150], [410, 120], [377, 120]]), { caso, restricoes: SEM_RESTRICOES })
    expect(p.marcasDoPlano.some((m) => /^Proteína \d+,\d g\/kg \(meta até 1\)$/.test(m))).toBe(true)
  })

  it('CA-2346 (11): vitamina A acima do limite (fígado fora da gestação)', () => {
    const p = semAjuste(resposta([], [[356, 100], [3, 150]]), { caso: adulto(), restricoes: SEM_RESTRICOES })
    expect(p.retirados).toEqual([])
    expect(p.marcasDoPlano).toContain('Vitamina A acima do limite')
  })

  it('CA-2347 (12): gestante abaixo de 95% do gasto calculado é marcada; lactante também', () => {
    const caso = casoDaGestante()
    const gasto = gastoCalculado(caso) ?? 0
    const p = conferirSugestao(resposta([[53, 50]], [[3, 150], [561, 140], [410, 100]]), contexto({ caso, metaKcal: gasto * 0.5 }))
    expect(p.marcasDoPlano).toContain(GESTACAO_ABAIXO)
    const lactante: Caso = { ...caso, condicao: { tipo: 'lactante', mesesPosParto: 3 } }
    const q = conferirSugestao(resposta([[53, 50]], [[3, 150]]), contexto({ caso: lactante, gastoCalculado: gastoCalculado(lactante), metaKcal: 800 }))
    expect(q.marcasDoPlano).toContain(LACTACAO_ABAIXO)
  })

  it('CA-2347 (12): no gasto calculado, a gestante não é marcada; a regra só marca, não retira', () => {
    const caso = casoDaGestante()
    const gasto = gastoCalculado(caso) ?? 0
    const p = conferirSugestao(resposta([[53, 50]], [[3, 150]]), contexto({ caso, metaKcal: gasto, gastoCalculado: gasto * 0.1 }))
    expect(p.marcasDoPlano).not.toContain(GESTACAO_ABAIXO)
  })

  it('CA-2348 (13): menor de 18 anos abaixo de 90% do gasto calculado é marcado', () => {
    const adolescente: Caso = { ...casoDaGestante(), idadeAnos: 15, condicao: { tipo: 'nenhuma' } }
    const gasto = gastoCalculado(adolescente)
    expect(gasto).not.toBeNull()
    const p = conferirSugestao(resposta([[53, 50]], [[3, 150]]), contexto({ caso: adolescente, restricoes: SEM_RESTRICOES, gastoCalculado: gasto, metaKcal: 600 }))
    expect(p.marcasDoPlano).toContain(IDADE_ABAIXO)
    const adultoAbaixo = conferirSugestao(resposta([[53, 50]], [[3, 150]]), contexto({ caso: adulto(), restricoes: SEM_RESTRICOES, gastoCalculado: gasto, metaKcal: 600 }))
    expect(adultoAbaixo.marcasDoPlano).not.toContain(IDADE_ABAIXO)
  })

  it('os totais e o abaixo da meta saem do app', () => {
    const p = semAjuste(resposta([[53, 50]], [[3, 150], [561, 140]]))
    expect(p.totais.kcal).toBeGreaterThan(0)
    expect(p.totais.proteinaGKg).not.toBeNull()
    expect(p.abaixoDaMeta.length).toBeGreaterThan(0)
    expect(p.abaixoDaMeta.map((a) => a.nutriente)).not.toContain('Sódio')
  })
})

describe('CA-2386 e D-1332: a quantidade vale depois de somar, e o ajuste não infla o que não tem grupo', () => {
  it('o mesmo alimento três vezes com 800 g: o total (2.400 g) passa de 2.000 g e sai', () => {
    const p = semAjuste(resposta([[53, 50]], [[471, 800], [471, 800], [471, 800], [3, 150]]), { caso: adulto(), restricoes: SEM_RESTRICOES })
    expect(p.retirados).toEqual([{ alimentoId: 471, nome: 'Café, infusão 10%', gramas: 2400, refeicao: 1, opcao: 'principal', motivo: QUANTIDADE_FORA }])
    expect(p.refeicoes[1]?.principal.map((i) => i.alimentoId)).toEqual([3])
  })

  it('a revisão: dez vezes 1.000 g de café somam 10.000 g e saem; nada passa de 2.000 g depois do ajuste', () => {
    const dez = Array.from({ length: 10 }, () => [471, 1000] as const)
    const p = conferirSugestao(resposta([], dez), contexto({ caso: adulto(), restricoes: SEM_RESTRICOES, metaKcal: 2150 }))
    expect(p.retirados.map((r) => [r.alimentoId, r.gramas, r.motivo])).toEqual([[471, 10_000, QUANTIDADE_FORA]])
    for (const item of p.refeicoes.flatMap((r) => [...r.principal, ...r.opcao2])) expect(item.gramas).toBeLessThanOrEqual(2000)
  })

  it('o ajuste de energia não mexe no café nem no chá (sem porção de grupo)', () => {
    const p = conferirSugestao(resposta([[471, 100], [53, 50]], [[3, 100], [561, 100], [410, 90]]), contexto({ caso: adulto(), restricoes: SEM_RESTRICOES, metaKcal: 4000 }))
    const cafe = p.refeicoes[0]?.principal.find((i) => i.alimentoId === 471)
    expect(cafe).toEqual({ alimentoId: 471, gramas: 100, marcas: [] })
    expect(p.refeicoes[1]?.principal.some((i) => i.marcas.includes(PORCAO_AJUSTADA))).toBe(true)
  })
})

describe('os casos de borda da conferência', () => {
  it('CB-1306: todos os itens de uma refeição retirados: a refeição sai vazia, com os retirados listados', () => {
    const p = semAjuste(resposta([[53, 50]], [[458, 200], [356, 100]]))
    expect(p.refeicoes[1]?.principal).toEqual([])
    expect(p.retirados.map((r) => [r.refeicao, r.alimentoId])).toEqual([
      [1, 458],
      [1, 356],
    ])
  })

  it('CB-1308: o alimento próprio apagado entre o pedido e a resposta sai como "Alimento fora da base"', () => {
    const p = semAjuste(resposta([[900_123, 50], [53, 50]]), { idsProprios: new Set([900_123]) })
    expect(p.retirados).toEqual([{ alimentoId: 900_123, nome: 'Alimento 900123', gramas: 50, refeicao: 0, opcao: 'principal', motivo: FORA_DA_BASE }])
  })

  it('CB-1311: o alimento medido em ml fica com a quantidade em ml, conferida pelo grupo, e soma pela energia por 100 ml', () => {
    registrarBaseAmpliada(decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada))
    const leite = buscarAlimento(100_101)
    expect(leite?.unidade).toBe('ml')
    const p = semAjuste(resposta([[100_101, 200], [53, 50]]), { caso: adulto(), restricoes: SEM_RESTRICOES })
    expect(p.retirados).toEqual([])
    expect(p.refeicoes[0]?.principal[0]).toEqual({ alimentoId: 100_101, gramas: 200, marcas: [] })
    const plano = propostaParaPlano(p, gerarId)
    expect(plano.refeicoes[0]?.opcoes.principal[0]?.gramas).toBe(200)
    expect(p.refeicoes[0]?.kcal).toBeCloseTo(((leite?.nutrientes.energia_kcal ?? 0) * 200) / 100 + ((buscarAlimento(53)?.nutrientes.energia_kcal ?? 0) * 50) / 100, 6)
  })
})

describe('CA-2350: a proposta vira o plano', () => {
  it('as refeições do pedido, ids novos, a opção 2 no substituto 1, o substituto 2 vazio e o item sem medida', () => {
    const p = semAjuste(resposta([[53, 50]], [[3, 150]], [[533, 135]]))
    const plano = propostaParaPlano(p, gerarId)
    expect(plano.refeicoes.map((r) => [r.nome, r.horario])).toEqual([
      ['Café da manhã', '07:00'],
      ['Almoço', '12:00'],
    ])
    const cafe = plano.refeicoes[0]
    expect(cafe?.opcoes.principal.map((i) => [i.alimentoId, i.gramas])).toEqual([[53, 50]])
    expect(cafe?.opcoes.substituto1.map((i) => [i.alimentoId, i.gramas])).toEqual([[533, 135]])
    expect(cafe?.opcoes.substituto2).toEqual([])
    expect(cafe?.opcoes.principal[0]).not.toHaveProperty('medida')
    const ids = plano.refeicoes.flatMap((r) => [r.id, ...r.opcoes.principal.map((i) => i.id), ...r.opcoes.substituto1.map((i) => i.id)])
    expect(new Set(ids).size).toBe(ids.length)
  })
})
