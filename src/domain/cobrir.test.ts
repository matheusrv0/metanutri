import { calcularAdequacao, MICRONUTRIENTES_ADEQUACAO } from './adequacao.ts'
import { COBERTURA_MINIMA_PCT, PORCAO_MAXIMA_PADRAO_G, porcaoMaximaDoGrupo, sugerirParaCobrir } from './cobrir.ts'
import { criarExemplo } from './exemplo.ts'
import { CAFE_OU_CHA, FORMA_DE_INGREDIENTE, NUNCA_APARECE } from './naoProposto.test-utils.ts'
import { ehDeUsoComum, regraQueExclui } from './prescritivel.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'
import type { Totais } from './totais.ts'
import { CHAVES_NUTRIENTES, totaisDeItens, totaisDoPlano } from './totais.ts'
import type { Alimento, ChaveNutrienteAlimento } from './tipos.ts'

const totais = (v: Partial<Record<ChaveNutrienteAlimento, number>>): Totais => ({
  itens: 3,
  nutrientes: Object.fromEntries(CHAVES_NUTRIENTES.map((k) => [k, { total: v[k] ?? 0, semDado: 0 }])) as Totais['nutrientes'],
})

const MULHER_28 = { sexo: 'F' as const, idadeAnos: 28, condicao: { tipo: 'nenhuma' as const } }

const alimento = (id: number, descricao: string, n: Partial<Record<ChaveNutrienteAlimento, number | null>>): Alimento => ({
  id,
  descricao,
  categoria: 'Teste',
  base: null,
  preparo: null,
  qualificadores: null,
  tracos: [],
  nutrientes: Object.fromEntries(CHAVES_NUTRIENTES.map((k) => [k, n[k] === undefined ? 0 : n[k]])) as Alimento['nutrientes'],
})

// Base controlada: meta de ferro individual para mulher de 28 anos = 90% de 18 mg = 16,2 mg.
const BASE: Alimento[] = [
  alimento(1, 'Rico e leve', { energia_kcal: 50, ferro_mg: 10 }), // falta 6,2 mg -> 62 g, arredonda para 65 g -> 32,5 kcal
  alimento(2, 'Rico e calórico', { energia_kcal: 500, ferro_mg: 10 }),
  alimento(3, 'Pobre', { energia_kcal: 20, ferro_mg: 0.5 }), // 200 g cobre 1 mg = 16%
  alimento(4, 'Sem ferro', { energia_kcal: 10, ferro_mg: 0 }),
  alimento(5, 'Ferro não analisado', { energia_kcal: 10, ferro_mg: null }),
  alimento(6, 'Sem kcal na base', { energia_kcal: null, ferro_mg: 50 }),
  alimento(7, 'Quase nada', { energia_kcal: 5, ferro_mg: 0.1 }), // 200 g cobre 0,2 mg = 3%
  alimento(8, 'Rico com muito cálcio', { energia_kcal: 40, ferro_mg: 10, calcio_mg: 3000 }),
]

describe('sugerirParaCobrir', () => {
  const plano = totais({ energia_kcal: 1800, ferro_mg: 10, calcio_mg: 1000 })
  const adequacao = calcularAdequacao(plano, MULHER_28, { tipo: 'individual' })

  it('CA-35: informa quanto falta para a meta e a porção de cada sugestão', () => {
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE })
    expect(r.falta).toBeCloseTo(6.2, 6)
    expect(r.unidade).toBe('mg')
    const leve = r.sugestoes.find((s) => s.alimentoId === 1)
    expect(leve).toMatchObject({ gramas: 65, coberturaPct: 100 })
    expect(leve?.kcalAdicionadas).toBeCloseTo(32.5, 6)
  })

  it('CA-36: prioriza o menor acréscimo de kcal por parte da falta coberta', () => {
    // kcal por mg de ferro: alimento 8 = 4 · alimento 1 = 5 · alimento 3 = 40 · alimento 2 = 50
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE })
    expect(r.sugestoes.map((s) => s.alimentoId)).toEqual([8, 1, 3, 2])
    const pobre = r.sugestoes.find((s) => s.alimentoId === 3)
    expect(pobre).toMatchObject({ gramas: PORCAO_MAXIMA_PADRAO_G, parcial: true })
    expect(pobre?.coberturaPct).toBeCloseTo(16.129, 2)
  })

  it('CA-36 e D-5: porção máxima é editável', () => {
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE, porcaoMaximaG: 50 })
    const leve = r.sugestoes.find((s) => s.alimentoId === 1)
    expect(leve).toMatchObject({ gramas: 50, parcial: true })
  })

  it('CB-06 e CA-32: ignora alimento sem kcal, sem o nutriente ou com o nutriente não analisado', () => {
    const ids = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE }).sugestoes.map((s) => s.alimentoId)
    expect(ids).not.toContain(4)
    expect(ids).not.toContain(5)
    expect(ids).not.toContain(6)
  })

  it(`descarta sugestão que cobre menos de ${COBERTURA_MINIMA_PCT}% da falta`, () => {
    const ids = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE }).sugestoes.map((s) => s.alimentoId)
    expect(ids).not.toContain(7)
  })

  it('CA-35: prefere grupos alimentares diferentes antes de repetir grupo', () => {
    const doGrupo = (id: number, cat: string, kcal: number): Alimento => ({ ...alimento(id, `${cat} ${id}`, { energia_kcal: kcal, ferro_mg: 10 }), categoria: cat })
    const base = [
      doGrupo(1, 'Verduras', 10),
      doGrupo(2, 'Verduras', 11),
      doGrupo(3, 'Verduras', 12),
      doGrupo(4, 'Carnes', 100),
      doGrupo(5, 'Leguminosas', 80),
    ]
    const ids = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 5000, alimentos: base }).sugestoes.map((s) => s.alimentoId)
    // os três grupos entram; depois completa com as verduras seguintes, tudo na ordem de prioridade
    expect(ids).toEqual([1, 2, 3, 5, 4])
    const quatro = [...base, doGrupo(6, 'Pescados', 90), doGrupo(7, 'Frutas', 95)]
    const escolhidos = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 5000, alimentos: quatro }).sugestoes.map((s) => s.alimentoId)
    expect(escolhidos).toEqual([1, 5, 6, 7, 4])
  })

  it('devolve no máximo 5 sugestões', () => {
    const muitos = Array.from({ length: 12 }, (_, i) => alimento(100 + i, `Fonte ${i}`, { energia_kcal: 30 + i, ferro_mg: 20 }))
    expect(sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: muitos }).sugestoes).toHaveLength(5)
  })

  it('CA-37: avisa quando a sugestão faria passar do GET', () => {
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 1850, alimentos: BASE })
    // 65 g de um alimento com 500 kcal/100 g = 325 kcal; cabem só 50 kcal até o GET -> 275 acima
    expect(r.sugestoes.find((s) => s.alimentoId === 2)?.avisos).toContainEqual({ tipo: 'excede-gasto', kcalAcima: expect.closeTo(275, 3) })
    expect(r.sugestoes.find((s) => s.alimentoId === 1)?.avisos).toEqual([])
    expect(r.kcalDisponiveis).toBeCloseTo(50, 6)
  })

  it('CA-37: avisa quando a sugestão faria passar do UL de outro nutriente', () => {
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE })
    const rica = r.sugestoes.find((s) => s.alimentoId === 8)
    // 65 g -> +1950 mg de cálcio; plano tem 1000; UL 2500
    expect(rica?.avisos).toContainEqual({ tipo: 'excede-limite', chave: 'calcio_mg', rotulo: 'Cálcio' })
  })

  it('CA-789 (spec revisao-geral-trabalho): sem o dado de energia de algum alimento, não diz quantas kcal cabem nem avisa do gasto', () => {
    const semEnergia: Totais = { ...plano, nutrientes: { ...plano.nutrientes, energia_kcal: { total: 1800, semDado: 1 } } }
    const r = sugerirParaCobrir('ferro_mg', semEnergia, adequacao, { gastoEnergetico: 1850, alimentos: BASE })
    expect(r.kcalDisponiveis).toBeNull()
    expect(r.sugestoes.every((s) => s.avisos.every((a) => a.tipo !== 'excede-gasto'))).toBe(true)
  })

  it('sem GET informado, não avisa sobre energia', () => {
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: null, alimentos: BASE })
    expect(r.kcalDisponiveis).toBeNull()
    expect(r.sugestoes.every((s) => s.avisos.every((a) => a.tipo !== 'excede-gasto'))).toBe(true)
  })

  it('CA-39: explica quando nenhum alimento cobre parte da falta', () => {
    const insuficientes = BASE.filter((a) => a.id === 4 || a.id === 7)
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: insuficientes })
    expect(r.sugestoes).toEqual([])
    expect(r.motivoSemSugestao).toMatch(/Nenhum alimento/)
  })

  it('CA-40: não sugere alimentos ocultados pelo usuário', () => {
    const ids = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE, ocultos: new Set([8, 1]) }).sugestoes.map((s) => s.alimentoId)
    expect(ids).toEqual([3, 2])
  })

  it('CA-34: nutriente que já atingiu a meta não tem o que cobrir', () => {
    const r = sugerirParaCobrir('calcio_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE })
    expect(r.falta).toBe(0)
    expect(r.sugestoes).toEqual([])
    expect(r.motivoSemSugestao).toMatch(/já atingiu/)
  })

  it('sem estágio de vida não sugere nada', () => {
    const semEstagio = calcularAdequacao(plano, { sexo: null, idadeAnos: null, condicao: { tipo: 'nenhuma' } }, { tipo: 'individual' })
    const r = sugerirParaCobrir('ferro_mg', plano, semEstagio, { gastoEnergetico: 2000, alimentos: BASE })
    expect(r.sugestoes).toEqual([])
    expect(r.motivoSemSugestao).toMatch(/referências/)
  })

  it('funciona com a TACO completa e sugere fontes reais de ferro', () => {
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: ALIMENTOS })
    expect(r.sugestoes.length).toBe(5)
    expect(r.sugestoes.every((s) => s.gramas <= PORCAO_MAXIMA_PADRAO_G && s.gramas > 0)).toBe(true)
  })

  it('CA-36a: com a TACO completa, não sugere ingrediente nem forma crua de alimento que se cozinha', () => {
    for (const chave of ['ferro_mg', 'magnesio_mg', 'potassio_mg', 'zinco_mg', 'fibra_g', 'calcio_mg'] as const) {
      const vazio = totais({ energia_kcal: 1600 })
      const ad = calcularAdequacao(vazio, MULHER_28, { tipo: 'individual' })
      const descricoes = sugerirParaCobrir(chave, vazio, ad, { gastoEnergetico: 2000, alimentos: ALIMENTOS }).sugestoes.map((s) => s.descricao)
      for (const d of descricoes) {
        expect(d, chave).not.toMatch(/(^|[\s,])pó($|[\s,])|desidratad|^Feijão, [^,]+, cru$|^Café, pó|^Fermento|^Farinha, de (arroz|trigo)/)
      }
    }
  })

  it('CA-36a: o usuário pode incluir ingredientes', () => {
    const vazio = totais({ energia_kcal: 1600 })
    const ad = calcularAdequacao(vazio, MULHER_28, { tipo: 'individual' })
    const com = sugerirParaCobrir('ferro_mg', vazio, ad, { gastoEnergetico: 2000, alimentos: ALIMENTOS, incluirIngredientes: true })
    // Com a chave ligada, entra ao menos um item que o filtro de consumo barraria.
    // (Coentro desidratado era o exemplo; desde 27/09 tempero perde a frente, e o teste
    // passou a conferir a regra, não um alimento específico.)
    const porDescricao = new Map(ALIMENTOS.map((a) => [a.descricao, a]))
    const barrados = com.sugestoes.filter((s) => {
      const a = porDescricao.get(s.descricao)
      return a !== undefined && regraQueExclui(a)?.nivel === 'ingrediente'
    })
    expect(barrados.length).toBeGreaterThan(0)
  })
})

describe('uso comum nas sugestões', () => {
  it('sarapatel, fígado e caranguejo saem da frente', () => {
    expect(ehDeUsoComum({ descricao: 'Sarapatel' } as Alimento)).toBe(false)
    expect(ehDeUsoComum({ descricao: 'Fígado, bovino, grelhado' } as Alimento)).toBe(false)
    // Pedido do usuário: nada de alimento que só uma região conhece.
    expect(ehDeUsoComum({ descricao: 'Caruru, cru' } as Alimento)).toBe(false)
    expect(ehDeUsoComum({ descricao: 'Lambari, congelado, frito' } as Alimento)).toBe(false)
    expect(ehDeUsoComum({ descricao: 'Cereais, mistura para vitamina, trigo, cevada e aveia' } as Alimento)).toBe(false)
    // Tempero e semente não viram sugestão de refeição: 100 g de manjericão não é prato.
    expect(ehDeUsoComum({ descricao: 'Manjericão, cru' } as Alimento)).toBe(false)
    expect(ehDeUsoComum({ descricao: 'Gergelim, semente' } as Alimento)).toBe(false)
    expect(ehDeUsoComum({ descricao: 'Leite, de vaca, integral' } as Alimento)).toBe(true)
    expect(ehDeUsoComum({ descricao: 'Caranguejo, cozido' } as Alimento)).toBe(false)
    expect(ehDeUsoComum({ descricao: 'Feijão, carioca, cozido' } as Alimento)).toBe(true)
    expect(ehDeUsoComum({ descricao: 'Couve, manteiga, refogada' } as Alimento)).toBe(true)
  })

  it('a primeira sugestão de ferro é de uso comum', () => {
    const totais = totaisDeItens([], buscarAlimento)
    const perfil = { sexo: 'F' as const, idadeAnos: 28, condicao: { tipo: 'nenhuma' as const } }
    const adequacao = calcularAdequacao(totais, perfil, { tipo: 'individual' })
    const r = sugerirParaCobrir('ferro_mg', totais, adequacao, { alimentos: ALIMENTOS, gastoEnergetico: 1800 })
    const primeira = r.sugestoes[0]
    expect(primeira).toBeDefined()
    expect(ehDeUsoComum({ descricao: primeira?.descricao ?? '' } as Alimento)).toBe(true)
  })
})

describe('sugestões com critério (spec sugestoes-com-criterio)', () => {
  const plano = totais({ energia_kcal: 1800, ferro_mg: 10, calcio_mg: 1000 })
  const adequacao = calcularAdequacao(plano, MULHER_28, { tipo: 'individual' })
  const comoNaTaco = (base: Alimento, categoria: string, preparo: string | null = null): Alimento => ({ ...base, categoria, preparo })
  const BEBIDAS = 'Bebidas (alcoólicas e não alcoólicas)'

  // Todos mais ricos em ferro e mais leves que qualquer item da BASE: só a regra os tira da frente.
  const CERVEJA = comoNaTaco(alimento(20, 'Cerveja, pilsen 2', { energia_kcal: 5, ferro_mg: 40 }), BEBIDAS)
  const REFRIGERANTE = comoNaTaco(alimento(21, 'Refrigerante, tipo cola', { energia_kcal: 5, ferro_mg: 40 }), BEBIDAS)
  const OLEO = comoNaTaco(alimento(22, 'Óleo, de soja', { energia_kcal: 5, ferro_mg: 40 }), 'Gorduras e óleos')
  const FEIJAO_CRU = comoNaTaco(alimento(23, 'Feijão, carioca, cru', { energia_kcal: 5, ferro_mg: 40 }), 'Leguminosas e derivados', 'cru')
  const CHA = comoNaTaco(alimento(24, 'Chá, preto, infusão 5%', { energia_kcal: 2, ferro_mg: 40 }), BEBIDAS)
  const CAFE = comoNaTaco(alimento(25, 'Café, infusão 10%', { energia_kcal: 2, ferro_mg: 40 }), BEBIDAS)
  const COM_EXCLUIDOS = [CERVEJA, REFRIGERANTE, OLEO, FEIJAO_CRU, CHA, CAFE, ...BASE]

  const ids = (incluirIngredientes: boolean) =>
    sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: COM_EXCLUIDOS, incluirIngredientes }).sugestoes.map((s) => s.alimentoId)

  it('CA-650: bebida alcoólica nunca entra, com a chave ligada ou desligada', () => {
    expect(ids(false)).not.toContain(CERVEJA.id)
    expect(ids(true)).not.toContain(CERVEJA.id)
  })

  it('CA-651: com a chave desligada, refrigerante, gordura e forma crua ficam de fora', () => {
    expect(ids(false)).toEqual([8, 1, 3, 2])
  })

  it('CA-652: a chave ligada traz de volta só a forma de ingrediente', () => {
    const comChave = ids(true)
    expect(comChave).toContain(FEIJAO_CRU.id)
    expect(comChave).not.toContain(REFRIGERANTE.id)
    expect(comChave).not.toContain(OLEO.id)
  })

  it('CA-654: café e chá não entram como fonte, com a chave ligada ou desligada', () => {
    for (const incluir of [false, true]) {
      expect(ids(incluir)).not.toContain(CHA.id)
      expect(ids(incluir)).not.toContain(CAFE.id)
    }
  })

  it('CA-654 e CA-665: com a chave ligada, café em pó, capuccino, gelatina, sal, shoyu, tempero e fermento não entram', () => {
    const MISC = 'Miscelâneas'
    const rico = (id: number, descricao: string) => comoNaTaco(alimento(id, descricao, { energia_kcal: 5, ferro_mg: 40 }), MISC)
    const daCozinha = [
      rico(30, 'Café, pó, torrado'),
      rico(31, 'Capuccino, pó'),
      rico(32, 'Gelatina, sabores variados, pó'),
      rico(33, 'Sal, grosso'),
      rico(34, 'Shoyu'),
      rico(35, 'Tempero a base de sal'),
      rico(36, 'Fermento, biológico, levedura, tablete'),
    ]
    const comChave = sugerirParaCobrir('ferro_mg', plano, adequacao, {
      gastoEnergetico: 2000,
      alimentos: [...daCozinha, ...BASE],
      incluirIngredientes: true,
    }).sugestoes.map((s) => s.descricao)
    for (const a of daCozinha) expect(comChave).not.toContain(a.descricao)
  })

  it('CA-655: uso comum primeiro, depois menos kcal por falta coberta, e grupo novo antes de repetir grupo', () => {
    const verdura = (id: number, kcal: number) => comoNaTaco(alimento(id, `Verdura ${id}`, { energia_kcal: kcal, ferro_mg: 40 }), 'Verduras')
    const base = [
      verdura(41, 10),
      verdura(42, 11),
      verdura(43, 12),
      verdura(44, 13),
      comoNaTaco(alimento(45, 'Lentilha, cozida', { energia_kcal: 50, ferro_mg: 40 }), 'Leguminosas e derivados'),
      // O mais leve de todos, mas pouco usual: vai para o fim.
      comoNaTaco(alimento(46, 'Carne, bovina, fígado, grelhado', { energia_kcal: 5, ferro_mg: 40 }), 'Carnes e derivados'),
    ]
    const ordem = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 5000, alimentos: base }).sugestoes.map((s) => s.alimentoId)
    // A quarta verdura perde a vaga para a lentilha e o fígado, que são de outros grupos.
    expect(ordem).toEqual([41, 42, 43, 45, 46])
  })

  describe('CA-673: porção máxima por grupo (seção 7.1)', () => {
    const rico = (id: number, descricao: string, categoria: string, kcal = 300) =>
      comoNaTaco(alimento(id, descricao, { energia_kcal: kcal, ferro_mg: 3 }), categoria)
    const gramasDe = (a: Alimento, porcaoMaximaG?: number) =>
      sugerirParaCobrir('ferro_mg', plano, adequacao, {
        gastoEnergetico: 5000,
        alimentos: [a],
        ...(porcaoMaximaG === undefined ? {} : { porcaoMaximaG }),
      }).sugestoes[0]?.gramas

    it.each([
      ['Castanha-de-caju, torrada, salgada', 'Nozes e sementes', 30],
      ['Amendoim, torrado, salgado', 'Leguminosas e derivados', 30],
      ['Queijo, mozarela', 'Leite e derivados', 50],
      ['Pão, trigo, francês', 'Cereais e derivados', 50],
      ['Biscoito, salgado, cream cracker', 'Cereais e derivados', 50],
      ['Tamarindo, cru', 'Frutas e derivados', 30],
      ['Carne, bovina, picanha, com gordura, grelhada', 'Carnes e derivados', 100],
      ['Frango, coxa, com pele, assada', 'Carnes e derivados', 100],
    ] as const)('"%s" (%s) não passa de %s g', (descricao, categoria, maximo) => {
      // Falta de 6,2 mg com 3 mg em 100 g: precisaria de 210 g.
      expect(gramasDe(rico(50, descricao, categoria))).toBe(maximo)
    })

    it('a ricota é magra e fica na porção padrão', () => {
      expect(gramasDe(rico(51, 'Queijo, ricota', 'Leite e derivados', 140))).toBe(200)
    })

    it('fruta comum não tem porção de grupo', () => {
      expect(gramasDe(rico(52, 'Banana, prata, crua', 'Frutas e derivados', 98))).toBe(200)
    })

    it('CB-197: vale a menor entre a porção do grupo e a escolhida', () => {
      const castanha = comoNaTaco(alimento(53, 'Castanha-de-caju, torrada, salgada', { energia_kcal: 570, ferro_mg: 6 }), 'Nozes e sementes')
      expect(gramasDe(castanha, 20)).toBe(20)
      expect(gramasDe(castanha, 200)).toBe(30)
    })

    it('CB-198: o que não cobre 10% da falta na porção do grupo sai da lista', () => {
      const fraco = comoNaTaco(alimento(54, 'Noz, crua', { energia_kcal: 620, ferro_mg: 1 }), 'Nozes e sementes')
      // 30 g com 1 mg em 100 g = 0,3 mg, menos de 10% de 6,2 mg.
      expect(gramasDe(fraco)).toBeUndefined()
    })

    it('com a base inteira, nenhuma sugestão dos grupos passa da porção do grupo', () => {
      const vazio = totaisDeItens([], buscarAlimento)
      const ad = calcularAdequacao(vazio, MULHER_28, { tipo: 'individual' })
      for (const chave of MICRONUTRIENTES_ADEQUACAO) {
        for (const s of sugerirParaCobrir(chave, vazio, ad, { gastoEnergetico: 2000, alimentos: ALIMENTOS }).sugestoes) {
          const nome = s.descricao.trim()
          if (/^(Castanha|Amêndoa|Noz|Amendoim|Gergelim|Linhaça|Coco, cru)/.test(nome)) expect(s.gramas, nome).toBeLessThanOrEqual(30)
          if (/^Queijo,/.test(nome) && !/ricota/.test(nome)) expect(s.gramas, nome).toBeLessThanOrEqual(50)
          if (/^(Pão|Biscoito|Torrada)/.test(nome)) expect(s.gramas, nome).toBeLessThanOrEqual(50)
          // O grupo é de carne gorda e ave com pele (D-199b): peixe com pele, como o salmão que a vitamina D do USDA
          // trouxe para as sugestões (spec vitaminas-usda), não é corte gordo e fica na porção padrão.
          const carne = buscarAlimento(s.alimentoId)?.categoria === 'Carnes e derivados'
          if (carne && /com gordura|com pele|costela|cupim|bisteca/.test(nome)) expect(s.gramas, nome).toBeLessThanOrEqual(100)
        }
      }
    })
  })

  it('CA-674: corte magro e ave sem pele vêm antes de corte gordo e ave com pele', () => {
    const carne = (id: number, descricao: string, kcal: number) =>
      comoNaTaco(alimento(id, descricao, { energia_kcal: kcal, ferro_mg: 40 }), 'Carnes e derivados')
    const base = [
      carne(60, 'Carne, bovina, picanha, com gordura, grelhada', 100),
      carne(61, 'Frango, peito, com pele, assado', 110),
      carne(62, 'Carne, bovina, patinho, sem gordura, grelhado', 200),
      carne(63, 'Frango, peito, sem pele, grelhado', 210),
    ]
    const ordem = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 5000, alimentos: base }).sugestoes.map((s) => s.alimentoId)
    expect(ordem).toEqual([62, 63, 60, 61])
  })

  it('CA-675: a restrição do paciente filtra antes da escolha das 5', () => {
    const queijo = (id: number, kcal: number) => comoNaTaco(alimento(id, `Queijo ${id}`, { energia_kcal: kcal, ferro_mg: 40 }), `Grupo ${id}`)
    const queijos = [queijo(70, 10), queijo(71, 11), queijo(72, 12), queijo(73, 13), queijo(74, 14)]
    const verdura = comoNaTaco(alimento(75, 'Couve, refogada', { energia_kcal: 90, ferro_mg: 40 }), 'Verduras')
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 5000, alimentos: [...queijos, verdura], restricoes: ['queijo'] })
    expect(r.sugestoes.map((s) => s.alimentoId)).toEqual([75])
  })

  it('CA-675: se a restrição tira tudo, a mensagem diz isso', () => {
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE, restricoes: ['rico', 'pobre'] })
    expect(r.sugestoes).toEqual([])
    expect(r.motivoSemSugestao).toBe(
      'Nenhum alimento de rotina, dentro das restrições do paciente, cobre ao menos 10% da falta em até 200 g. Pela busca do plano, qualquer alimento entra.',
    )
  })

  it('CA-678: o sódio não se cobre com alimento, com qualquer chave e porção', () => {
    const vazio = totaisDeItens([], buscarAlimento)
    const ad = calcularAdequacao(vazio, MULHER_28, { tipo: 'individual' })
    for (const incluirIngredientes of [false, true]) {
      for (const porcaoMaximaG of [50, 200]) {
        const r = sugerirParaCobrir('sodio_mg', vazio, ad, { gastoEnergetico: 2000, alimentos: ALIMENTOS, incluirIngredientes, porcaoMaximaG })
        expect(r.falta).toBeGreaterThan(0)
        expect(r.sugestoes).toEqual([])
        expect(r.motivoSemSugestao).toBe('O sódio não se cobre com alimento: o sal de cozinha e os temperos já completam o dia.')
      }
    }
  })

  it('CA-675: a mensagem só fala da restrição quando ela tirou algum alimento que cobriria a falta', () => {
    const semFonte = BASE.filter((a) => a.id === 4 || a.id === 7)
    const semEfeito = (restricoes: readonly string[]) =>
      sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: [CERVEJA, ...semFonte], restricoes }).motivoSemSugestao
    const MENSAGEM_PADRAO = 'Nenhum alimento de rotina cobre ao menos 10% da falta em até 200 g. Pela busca do plano, qualquer alimento entra.'
    // Restrição que não casa com nada, e restrição que só tira quem não cobriria 10% ("Quase nada").
    expect(semEfeito(['abacaxi'])).toBe(MENSAGEM_PADRAO)
    expect(semEfeito(['quase'])).toBe(MENSAGEM_PADRAO)
  })

  it('CA-656: quando só item fora da regra cobriria, explica e aponta a busca', () => {
    const semFonte = BASE.filter((a) => a.id === 4 || a.id === 7)
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: [CERVEJA, REFRIGERANTE, OLEO, CHA, ...semFonte] })
    expect(r.sugestoes).toEqual([])
    expect(r.motivoSemSugestao).toBe('Nenhum alimento de rotina cobre ao menos 10% da falta em até 200 g. Pela busca do plano, qualquer alimento entra.')
  })

  it('CA-656: a mensagem leva a porção máxima escolhida', () => {
    const r = sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 2000, alimentos: BASE, porcaoMaximaG: 5 })
    expect(r.sugestoes).toEqual([])
    expect(r.motivoSemSugestao).toBe('Nenhum alimento de rotina cobre ao menos 10% da falta em até 5 g. Pela busca do plano, qualquer alimento entra.')
  })

  describe('CA-657 e CA-957: plano de exemplo e plano vazio, todas as linhas da adequação', () => {
    let n = 0
    const { caso, plano: exemplo } = criarExemplo(() => `ex-${++n}`, '2026-10-15')
    const doExemplo = totaisDoPlano(exemplo, buscarAlimento)
    const vazio = totaisDeItens([], buscarAlimento)
    const cenarios = [
      ['exemplo', doExemplo],
      ['plano vazio', vazio],
    ] as const

    // CA-657 e CA-667: trava por texto, escrita à mão no teste, sem usar a regra (revisão I3).
    const variacoes = cenarios.flatMap(([nome, t]) =>
      [false, true].flatMap((incluirIngredientes) => [50, 100, 200].map((porcaoMaximaG) => ({ nome, t, incluirIngredientes, porcaoMaximaG }))),
    )

    it.each(variacoes)(
      '$nome, chave $incluirIngredientes, porção $porcaoMaximaG g: nada do que nunca aparece',
      ({ t, incluirIngredientes, porcaoMaximaG }) => {
        const ad = calcularAdequacao(t, caso, caso.adequacao.preset)
        for (const chave of MICRONUTRIENTES_ADEQUACAO) {
          const r = sugerirParaCobrir(chave, t, ad, { gastoEnergetico: 1620, alimentos: ALIMENTOS, incluirIngredientes, porcaoMaximaG })
          for (const s of r.sugestoes) {
            const nome = s.descricao.trim()
            expect(nome, chave).not.toMatch(NUNCA_APARECE)
            expect(nome, chave).not.toMatch(CAFE_OU_CHA)
            if (!incluirIngredientes) expect(nome, chave).not.toMatch(FORMA_DE_INGREDIENTE)
          }
        }
      },
    )

    it('a piridoxina do exemplo não sugere mais cerveja', () => {
      const ad = calcularAdequacao(doExemplo, caso, caso.adequacao.preset)
      const r = sugerirParaCobrir('piridoxina_mg', doExemplo, ad, { gastoEnergetico: 1620, alimentos: ALIMENTOS })
      expect(r.falta).toBeGreaterThan(0)
      expect(r.sugestoes.length).toBeGreaterThan(0)
      expect(r.sugestoes.map((s) => s.descricao)).not.toContain('Cerveja, pilsen 2')
    })
  })
})

describe('Cobrir das vitaminas do USDA, plano vazio da Maria (spec vitaminas-usda)', () => {
  const vazio = totaisDeItens([], buscarAlimento)
  const ad = calcularAdequacao(vazio, MULHER_28, { tipo: 'individual' })
  const cobrir = (chave: ChaveNutrienteAlimento) => sugerirParaCobrir(chave, vazio, ad, { gastoEnergetico: 2000, alimentos: ALIMENTOS })
  const categoria = (id: number) => buscarAlimento(id)?.categoria ?? ''
  /** Depois do primeiro pouco usual (fígado, miúdos), só vem pouco usual (D-306). */
  const usuaisAntes = (ids: readonly number[]) => {
    const comum = ids.map((id) => ehDeUsoComum({ descricao: buscarAlimento(id)?.descricao ?? '' }))
    return comum.every((c, i) => c || comum.slice(i).every((d) => !d))
  }

  it('as cinco aparecem na adequação do plano vazio, e o Cobrir funciona para todas', () => {
    for (const chave of ['selenio_mcg', 'vitamina_d_mcg', 'vitamina_e_mg', 'folato_dfe_mcg', 'vitamina_b12_mcg'] as const) {
      const r = cobrir(chave)
      expect(r.falta, chave).toBeGreaterThan(0)
      expect(r.sugestoes.length, chave).toBeGreaterThan(0)
    }
  })

  it('CA-955: vitamina D sai de peixe e ovo, nunca de leite ou derivado, e o fígado fica para o fim', () => {
    const r = cobrir('vitamina_d_mcg')
    const ids = r.sugestoes.map((s) => s.alimentoId)
    const categorias = new Set(ids.map(categoria))
    expect(categorias.has('Pescados e frutos do mar')).toBe(true)
    expect(categorias.has('Ovos e derivados')).toBe(true)
    expect(categorias.has('Leite e derivados')).toBe(false)
    expect(usuaisAntes(ids)).toBe(true)
    for (const s of r.sugestoes) expect(s.gramas, s.descricao).toBeLessThanOrEqual(PORCAO_MAXIMA_PADRAO_G)
  })

  it('CA-956: B12 sai de carne, peixe, leite ou derivado e ovo, com miúdos no fim e queijo até 50 g', () => {
    const r = cobrir('vitamina_b12_mcg')
    const ids = r.sugestoes.map((s) => s.alimentoId)
    const categorias = new Set(ids.map(categoria))
    for (const c of ['Carnes e derivados', 'Pescados e frutos do mar', 'Leite e derivados', 'Ovos e derivados']) expect(categorias.has(c), c).toBe(true)
    expect(usuaisAntes(ids)).toBe(true)
    for (const s of r.sugestoes) {
      expect(s.gramas, s.descricao).toBeLessThanOrEqual(PORCAO_MAXIMA_PADRAO_G)
      if (/^Queijo,/.test(s.descricao) && !/ricota/.test(s.descricao)) expect(s.gramas, s.descricao).toBeLessThanOrEqual(50)
    }
  })

  it('CA-957 e D-306: a castanha-do-pará cobre o selênio com 5 g, dentro da porção do grupo', () => {
    const castanha = cobrir('selenio_mcg').sugestoes.find((s) => s.alimentoId === 589)
    expect(castanha).toMatchObject({ gramas: 5, coberturaPct: 100 })
  })

  it('CB-306: a sugestão que passaria do UL de selênio recebe o aviso', () => {
    // Plano com 390 µg de selênio: quase no UL de 400 µg. Cobrir a vitamina D com peixe passa do limite.
    const plano = totais({ energia_kcal: 1500, selenio_mcg: 390 })
    const adequacao = calcularAdequacao(plano, MULHER_28, { tipo: 'individual' })
    const r = sugerirParaCobrir('vitamina_d_mcg', plano, adequacao, { gastoEnergetico: 2000, alimentos: ALIMENTOS })
    const peixe = r.sugestoes.find((s) => categoria(s.alimentoId) === 'Pescados e frutos do mar')
    expect(peixe?.avisos).toContainEqual({ tipo: 'excede-limite', chave: 'selenio_mcg', rotulo: 'Selênio' })
  })
})

describe('Aviso de limite só de quem traz o nutriente (spec vitaminas-usda, CA-957b)', () => {
  // Plano já acima do UL de selênio (400 µg). Falta de ferro: 6,2 mg.
  const plano = totais({ energia_kcal: 1500, ferro_mg: 10, selenio_mcg: 600 })
  const adequacao = calcularAdequacao(plano, MULHER_28, { tipo: 'individual' })
  const base = [
    { ...alimento(90, 'Sem selênio', { energia_kcal: 50, ferro_mg: 10, selenio_mcg: 0 }), categoria: 'Grupo A' },
    { ...alimento(91, 'Selênio sem dado', { energia_kcal: 50, ferro_mg: 10, selenio_mcg: null }), categoria: 'Grupo B' },
    { ...alimento(92, 'Com selênio', { energia_kcal: 50, ferro_mg: 10, selenio_mcg: 10 }), categoria: 'Grupo C' },
  ]
  const avisosDe = (id: number) =>
    sugerirParaCobrir('ferro_mg', plano, adequacao, { gastoEnergetico: 3000, alimentos: base }).sugestoes.find((s) => s.alimentoId === id)?.avisos ?? []
  const SELENIO = { tipo: 'excede-limite', chave: 'selenio_mcg', rotulo: 'Selênio' }

  it('o plano já passou do limite: quem não traz selênio não recebe o aviso', () => {
    expect(adequacao.linhas.find((l) => l.chave === 'selenio_mcg')?.estado).toBe('acima-limite')
    expect(avisosDe(90)).not.toContainEqual(SELENIO)
    expect(avisosDe(91)).not.toContainEqual(SELENIO)
  })

  it('quem traz selênio recebe o aviso, como antes', () => {
    expect(avisosDe(92)).toContainEqual(SELENIO)
  })
})

describe('Porção máxima de ovo no Cobrir (spec vitaminas-usda, D-306 e CA-957a)', () => {
  const OVOS_INTEIROS = [485, 488, 489, 490]
  const GEMA = 487
  const CLARA = 486
  const OMELETE = 484
  const porcao = (id: number) => {
    const a = buscarAlimento(id)
    if (!a) throw new Error(`alimento ${id} não existe`)
    return porcaoMaximaDoGrupo(a)
  }

  it('ovo inteiro até 100 g (2 ovos), gema até 40 g (2 gemas), clara até 100 g; a omelete não tem porção de grupo', () => {
    for (const id of OVOS_INTEIROS) expect(porcao(id), String(id)).toBe(100)
    expect(porcao(GEMA)).toBe(40)
    expect(porcao(CLARA)).toBe(100)
    expect(porcao(OMELETE)).toBeNull()
  })

  it('no plano vazio e no exemplo, nenhuma sugestão de ovo passa da porção, em nenhuma linha da adequação', () => {
    let n = 0
    const { caso, plano } = criarExemplo(() => `ovo-${++n}`, '2026-10-15')
    for (const t of [totaisDeItens([], buscarAlimento), totaisDoPlano(plano, buscarAlimento)]) {
      const ad = calcularAdequacao(t, caso, caso.adequacao.preset)
      for (const chave of MICRONUTRIENTES_ADEQUACAO) {
        for (const s of sugerirParaCobrir(chave, t, ad, { gastoEnergetico: 2000, alimentos: ALIMENTOS, porcaoMaximaG: 200 }).sugestoes) {
          if (OVOS_INTEIROS.includes(s.alimentoId)) expect(s.gramas, `${chave} ${s.descricao}`).toBeLessThanOrEqual(100)
          if (s.alimentoId === GEMA) expect(s.gramas, chave).toBeLessThanOrEqual(40)
          if (s.alimentoId === CLARA) expect(s.gramas, chave).toBeLessThanOrEqual(100)
        }
      }
    }
  })

  it('a gema para a vitamina D sai com 40 g, e a porção escolhida menor continua valendo', () => {
    const vazio = totaisDeItens([], buscarAlimento)
    const ad = calcularAdequacao(vazio, MULHER_28, { tipo: 'individual' })
    const gema = (porcaoMaximaG: number) =>
      sugerirParaCobrir('vitamina_d_mcg', vazio, ad, { gastoEnergetico: 2000, alimentos: ALIMENTOS, porcaoMaximaG }).sugestoes.find((s) => s.alimentoId === GEMA)
    expect(gema(200)).toMatchObject({ gramas: 40, parcial: true })
    // 20 g de gema cobrem 8% da falta (menos de 10%): sai da lista, em vez de passar dos 20 g escolhidos.
    expect(gema(20)).toBeUndefined()
  })
})
