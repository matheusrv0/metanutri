import { calcularAdequacao, estagioDeVida, MICRONUTRIENTES_ADEQUACAO } from './adequacao.ts'
import { DRI } from './tabelas.ts'
import type { Totais } from './totais.ts'
import { CHAVES_NUTRIENTES } from './totais.ts'
import type { Caso, ChaveNutrienteAlimento, CondicaoFisiologica } from './tipos.ts'

type PerfilCaso = Pick<Caso, 'sexo' | 'idadeAnos' | 'condicao'>
const perfil = (sexo: 'M' | 'F' | null, idadeAnos: number | null, condicao: CondicaoFisiologica = { tipo: 'nenhuma' }): PerfilCaso => ({
  sexo,
  idadeAnos,
  condicao,
})

const totais = (v: Partial<Record<ChaveNutrienteAlimento, number>>, semDado: Partial<Record<ChaveNutrienteAlimento, number>> = {}): Totais => ({
  itens: 3,
  nutrientes: Object.fromEntries(CHAVES_NUTRIENTES.map((k) => [k, { total: v[k] ?? 0, semDado: semDado[k] ?? 0 }])) as Totais['nutrientes'],
})

const linha = (r: ReturnType<typeof calcularAdequacao>, chave: ChaveNutrienteAlimento) => {
  const l = r.linhas.find((x) => x.chave === chave)
  if (!l) throw new Error(`linha ${chave} ausente`)
  return l
}

const MULHER_28 = perfil('F', 28)

describe('estagioDeVida (CA-31)', () => {
  it.each([
    [perfil(null, 2), 'crianca-1-3'],
    [perfil('F', 8), 'crianca-4-8'],
    [perfil('M', 10), 'masculino-9-13'],
    [perfil('F', 18), 'feminino-14-18'],
    [perfil('F', 19), 'feminino-19-30'],
    [perfil('M', 50), 'masculino-31-50'],
    [perfil('M', 51), 'masculino-51-70'],
    [perfil('F', 70), 'feminino-51-70'],
    [perfil('F', 71), 'feminino-71+'],
    [perfil('F', 95), 'feminino-71+'],
    [perfil('F', 16, { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 55 }), 'gestante-14-18'],
    [perfil('F', 25, { tipo: 'gestante', semanasGestacao: null, pesoPreGestacionalKg: null }), 'gestante-19-30'],
    [perfil('F', 35, { tipo: 'lactante', mesesPosParto: 3 }), 'lactante-31-50'],
  ] as const)('%o -> %s', (p, esperado) => {
    expect(estagioDeVida(p)?.id).toBe(esperado)
  })

  it.each([
    perfil('F', null),
    perfil(null, 30),
    perfil('F', 0),
    perfil('M', 30, { tipo: 'gestante', semanasGestacao: 10, pesoPreGestacionalKg: 70 }),
    perfil('F', 55, { tipo: 'lactante', mesesPosParto: 2 }),
  ])('sem estágio para %o', (p) => {
    expect(estagioDeVida(p)).toBeNull()
  })
})

describe('calcularAdequacao', () => {
  it('CA-25: lista cada micronutriente com total, referência, % e estado', () => {
    const r = calcularAdequacao(totais({ ferro_mg: 9 }), MULHER_28, { tipo: 'individual' })
    expect(r.linhas.map((l) => l.chave)).toEqual(MICRONUTRIENTES_ADEQUACAO)
    const ferro = linha(r, 'ferro_mg')
    expect(ferro).toMatchObject({ total: 9, referencia: { tipo: 'rda', valor: 18 }, adequacaoPct: 50, metaPct: 90, estado: 'abaixo', unidade: 'mg', rotulo: 'Ferro' })
  })

  it('CA-26: Individual usa RDA com meta de 90%', () => {
    const ferro = linha(calcularAdequacao(totais({ ferro_mg: 16.2 }), MULHER_28, { tipo: 'individual' }), 'ferro_mg')
    expect(ferro.adequacaoPct).toBeCloseTo(90, 6)
    expect(ferro.estado).toBe('adequado')
  })

  it('CA-27: Coletivo usa EAR com meta de 50%', () => {
    const ferro = linha(calcularAdequacao(totais({ ferro_mg: 9 }), MULHER_28, { tipo: 'coletivo' }), 'ferro_mg')
    expect(ferro.referencia).toEqual({ tipo: 'ear', valor: 8.1 })
    expect(ferro.metaPct).toBe(50)
    expect(ferro.estado).toBe('adequado')
  })

  it('CA-28: Personalizado usa a referência e a porcentagem escolhidas', () => {
    const r = calcularAdequacao(totais({ ferro_mg: 9 }), MULHER_28, { tipo: 'personalizado', referencia: 'rda', minimoPct: 50 })
    expect(linha(r, 'ferro_mg')).toMatchObject({ referencia: { tipo: 'rda', valor: 18 }, metaPct: 50, estado: 'adequado' })
  })

  it('CA-29 (D-4): sem RDA ou EAR usa AI e sinaliza', () => {
    const individual = linha(calcularAdequacao(totais({ potassio_mg: 1300 }), MULHER_28, { tipo: 'individual' }), 'potassio_mg')
    expect(individual.referencia).toEqual({ tipo: 'ai', valor: 2600 })
    expect(individual.usouAi).toBe(true)
    const coletivo = linha(calcularAdequacao(totais({ manganes_mg: 1 }), MULHER_28, { tipo: 'coletivo' }), 'manganes_mg')
    expect(coletivo.referencia).toEqual({ tipo: 'ai', valor: 1.8 })
    expect(coletivo.usouAi).toBe(true)
    expect(linha(calcularAdequacao(totais({}), MULHER_28, { tipo: 'individual' }), 'ferro_mg').usouAi).toBe(false)
  })

  it('CA-30: acima do UL gera alerta mesmo com adequação alta', () => {
    const ferro = linha(calcularAdequacao(totais({ ferro_mg: 50 }), MULHER_28, { tipo: 'coletivo' }), 'ferro_mg')
    expect(ferro.limite).toEqual({ tipo: 'ul', valor: 45 })
    expect(ferro.estado).toBe('acima-limite')
  })

  it('sódio usa a CDRR como limite superior', () => {
    const sodio = linha(calcularAdequacao(totais({ sodio_mg: 2500 }), MULHER_28, { tipo: 'individual' }), 'sodio_mg')
    expect(sodio.limite).toEqual({ tipo: 'cdrr', valor: 2300 })
    expect(sodio.estado).toBe('acima-limite')
    const crianca = linha(calcularAdequacao(totais({ sodio_mg: 1300 }), perfil(null, 2), { tipo: 'individual' }), 'sodio_mg')
    expect(crianca.limite).toEqual({ tipo: 'cdrr', valor: 1200 })
  })

  it('UL que não vale para alimentos não gera alerta e traz a nota', () => {
    const magnesio = linha(calcularAdequacao(totais({ magnesio_mg: 400 }), MULHER_28, { tipo: 'individual' }), 'magnesio_mg')
    expect(magnesio.limite).toBeNull()
    expect(magnesio.estado).toBe('adequado')
    expect(magnesio.notaLimite).toMatch(/farmacológico/)
    const vitA = linha(calcularAdequacao(totais({ vitamina_a_rae_mcg: 5000 }), MULHER_28, { tipo: 'individual' }), 'vitamina_a_rae_mcg')
    expect(vitA.limite).toBeNull()
    expect(vitA.notaLimite).toMatch(/pré-formada/)
    const niacina = linha(calcularAdequacao(totais({ niacina_mg: 60 }), MULHER_28, { tipo: 'individual' }), 'niacina_mg')
    expect(niacina.limite).toBeNull()
  })

  it('nutriente sem UL não tem limite nem nota', () => {
    const tiamina = linha(calcularAdequacao(totais({ tiamina_mg: 5 }), MULHER_28, { tipo: 'individual' }), 'tiamina_mg')
    expect(tiamina.limite).toBeNull()
    expect(tiamina.notaLimite).toBeNull()
  })

  it('CA-31: referências mudam com o estágio de vida', () => {
    const t = totais({ ferro_mg: 20 })
    expect(linha(calcularAdequacao(t, MULHER_28, { tipo: 'individual' }), 'ferro_mg').estado).toBe('adequado')
    const gestante = perfil('F', 28, { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 60 })
    const ferroGestante = linha(calcularAdequacao(t, gestante, { tipo: 'individual' }), 'ferro_mg')
    expect(ferroGestante.referencia.valor).toBe(27)
    expect(ferroGestante.estado).toBe('abaixo')
  })

  it('CA-32: nutriente com alimento sem dado fica marcado como subestimado', () => {
    const r = calcularAdequacao(totais({ vitamina_c_mg: 40 }, { vitamina_c_mg: 2 }), MULHER_28, { tipo: 'individual' })
    expect(linha(r, 'vitamina_c_mg')).toMatchObject({ semDado: 2, subestimado: true })
    expect(linha(r, 'ferro_mg').subestimado).toBe(false)
  })

  it('CA-33: expõe a fonte das referências', () => {
    const r = calcularAdequacao(totais({}), MULHER_28, { tipo: 'individual' })
    expect(r.fonte).toContain('Dietary Reference Intakes')
  })

  it('CB-05: plano vazio tem 0% em tudo e o estado é abaixo', () => {
    const r = calcularAdequacao(totais({}), MULHER_28, { tipo: 'individual' })
    expect(r.linhas.every((l) => l.adequacaoPct === 0 && l.estado === 'abaixo')).toBe(true)
  })

  it('sem estágio de vida não calcula e explica', () => {
    const r = calcularAdequacao(totais({ ferro_mg: 9 }), perfil('F', null), { tipo: 'individual' })
    expect(r.estagio).toBeNull()
    expect(r.linhas).toEqual([])
    expect(r.motivoSemCalculo).toMatch(/sexo e idade/)
  })

  it('personalizado recusa porcentagem inválida', () => {
    expect(() => calcularAdequacao(totais({}), MULHER_28, { tipo: 'personalizado', referencia: 'ear', minimoPct: 0 })).toThrow(RangeError)
  })
})

describe('as cinco do complemento do USDA (spec vitaminas-usda)', () => {
  it('CA-953: 21 linhas, na ordem do D-304, com rótulo e unidade do dri.json', () => {
    expect(MICRONUTRIENTES_ADEQUACAO).toEqual([
      'calcio_mg',
      'ferro_mg',
      'magnesio_mg',
      'zinco_mg',
      'potassio_mg',
      'fosforo_mg',
      'sodio_mg',
      'cobre_mg',
      'manganes_mg',
      'selenio_mcg',
      'vitamina_a_rae_mcg',
      'vitamina_c_mg',
      'vitamina_d_mcg',
      'vitamina_e_mg',
      'tiamina_mg',
      'riboflavina_mg',
      'piridoxina_mg',
      'niacina_mg',
      'folato_dfe_mcg',
      'vitamina_b12_mcg',
      'fibra_g',
    ])
    const r = calcularAdequacao(totais({ vitamina_d_mcg: 6 }), MULHER_28, { tipo: 'individual' })
    expect(r.linhas).toHaveLength(21)
    expect(linha(r, 'vitamina_d_mcg')).toMatchObject({ rotulo: 'Vitamina D', unidade: 'µg', referencia: { tipo: 'rda', valor: 15 }, adequacaoPct: 40, estado: 'abaixo' })
    expect(linha(r, 'vitamina_b12_mcg')).toMatchObject({ rotulo: 'Vitamina B12', unidade: 'µg', referencia: { tipo: 'rda', valor: 2.4 } })
    expect(linha(r, 'folato_dfe_mcg')).toMatchObject({ rotulo: 'Folato (DFE)', unidade: 'µg', referencia: { tipo: 'rda', valor: 400 } })
    expect(linha(r, 'vitamina_e_mg')).toMatchObject({ rotulo: 'Vitamina E', unidade: 'mg', referencia: { tipo: 'rda', valor: 15 } })
    expect(linha(r, 'selenio_mcg')).toMatchObject({ rotulo: 'Selênio', unidade: 'µg', referencia: { tipo: 'rda', valor: 55 } })
    expect(r.linhas.some((l) => (l.chave as string) === 'gordura_trans_g')).toBe(false)
  })

  it('CA-953: nenhum estágio de vida fica sem referência para as cinco, nos três tipos de meta', () => {
    for (const estagio of DRI.estagios) {
      const p = perfil(estagio.sexo, estagio.idadeMin, estagio.gestante ? { tipo: 'gestante', semanasGestacao: null, pesoPreGestacionalKg: null } : estagio.lactante ? { tipo: 'lactante', mesesPosParto: null } : { tipo: 'nenhuma' })
      for (const preset of [{ tipo: 'individual' }, { tipo: 'coletivo' }, { tipo: 'personalizado', referencia: 'ear', minimoPct: 70 }] as const) {
        const r = calcularAdequacao(totais({}), p, preset)
        expect(r.estagio?.id, estagio.id).toBe(estagio.id)
        expect(r.linhas, estagio.id).toHaveLength(21)
      }
    }
  })

  it('CA-954 e CB-306: selênio acima do UL fica acima do limite; folato e vitamina E têm nota, sem alerta', () => {
    const r = calcularAdequacao(totais({ selenio_mcg: 600, folato_dfe_mcg: 1500, vitamina_e_mg: 1200 }), MULHER_28, { tipo: 'individual' })
    expect(linha(r, 'selenio_mcg')).toMatchObject({ limite: { tipo: 'ul', valor: 400 }, estado: 'acima-limite', notaLimite: null })
    for (const chave of ['folato_dfe_mcg', 'vitamina_e_mg'] as const) {
      expect(linha(r, chave).limite, chave).toBeNull()
      expect(linha(r, chave).estado, chave).toBe('adequado')
      expect(linha(r, chave).notaLimite, chave).toMatch(/sintéticas/)
    }
    expect(linha(r, 'vitamina_b12_mcg').limite).toBeNull()
    expect(linha(r, 'vitamina_d_mcg').limite).toEqual({ tipo: 'ul', valor: 100 })
  })

  it('CB-303: plano vazio deixa as cinco abaixo, sem dado de nenhum alimento', () => {
    const r = calcularAdequacao(totais({}), MULHER_28, { tipo: 'individual' })
    for (const chave of ['selenio_mcg', 'vitamina_d_mcg', 'vitamina_e_mg', 'folato_dfe_mcg', 'vitamina_b12_mcg'] as const) {
      expect(linha(r, chave)).toMatchObject({ adequacaoPct: 0, estado: 'abaixo', subestimado: false })
    }
  })
})
