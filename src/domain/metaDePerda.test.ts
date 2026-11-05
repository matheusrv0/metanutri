import { criarCasoVazio } from './caso.ts'
import { FONTES } from './fontesAntropometria.ts'
import { metaDePerda, pesoAlvo, type ResultadoDaMeta } from './metaDePerda.ts'
import { prioridadeDoCaso } from './prioridadeClinica.ts'
import type { Caso } from './tipos.ts'

const vazio = criarCasoVazio('c')
/** 90 kg em 1,70 m (IMC 31,1) e 35% de gordura na bioimpedância. */
const caso = (p: Partial<Caso> = {}, gorduraPct: number | null = 35): Caso => ({
  ...vazio,
  sexo: 'F',
  idadeAnos: 40,
  pesoKg: 90,
  estaturaCm: 170,
  ...p,
  composicao: { ...vazio.composicao, bioimpedancia: { ...vazio.composicao.bioimpedancia, gorduraPct } },
})
function mostrada(r: ResultadoDaMeta | null) {
  if (!r?.mostra) throw new Error('a meta não veio')
  return r
}

describe('peso-alvo (spec antropometria-completa, CA-2067)', () => {
  it('CA-2067: 90 kg, 35% de gordura e alvo de 25% → 78,0 kg (massa magra preservada) e 72,0 kg (perda típica)', () => {
    expect(pesoAlvo(90, 35, 25)).toEqual({ preservandoMassaMagraKg: expect.closeTo(78, 10), perdaTipicaKg: expect.closeTo(72, 10) })
  })

  it('CB-1012: alvo igual ou acima do atual, ou denominador de 0 ou menos → sem peso-alvo', () => {
    expect(pesoAlvo(90, 25, 25)).toBeNull()
    expect(pesoAlvo(90, 25, 30)).toBeNull()
    expect(pesoAlvo(90, 80, 76)).toBeNull()
  })
})

describe('meta de perda (spec antropometria-completa, CA-2067 a CA-2069)', () => {
  it('CA-2067: teto de 0,9 kg/semana, prazo mínimo de 20 semanas e fase 1 de 4,5 a 9 kg em cerca de 26 semanas', () => {
    const r = mostrada(metaDePerda(caso(), { gorduraAlvoPct: 25 }))
    expect(r.tetoKgPorSemana).toBeCloseTo(0.9, 10)
    expect(r.prazoMinimoSemanas?.perdaTipica).toBeCloseTo(20, 10)
    expect(r.prazoMinimoSemanas?.preservandoMassaMagra).toBeCloseTo(12 / 0.9, 10)
    expect(r.limitarAFase1).toBe(true)
    expect(r.fase1.minKg).toBeCloseTo(4.5, 10)
    expect(r.fase1.maxKg).toBeCloseTo(9, 10)
    expect(r.fase1.semanas).toBe(26)
    expect(r.atletaKgPorSemana).toBeNull()
    expect(r.fonte.curta).toBe(FONTES.metaDePerda.curta)
  })

  it('CA-2067: atleta, também 0,7% do peso por semana (0,63 kg)', () => {
    expect(mostrada(metaDePerda(caso(), { gorduraAlvoPct: 25, atleta: true })).atletaKgPorSemana).toBeCloseTo(0.63, 10)
  })

  it('CA-2067: sem alvo, só a fase 1 e o ritmo; alvo acima do atual, sem peso-alvo', () => {
    const semAlvo = mostrada(metaDePerda(caso()))
    expect(semAlvo.pesoAlvo).toBeNull()
    expect(semAlvo.prazoMinimoSemanas).toBeNull()
    expect(semAlvo.fase1.maxKg).toBeCloseTo(9, 10)
    const alvoAcima = mostrada(metaDePerda(caso(), { gorduraAlvoPct: 40 }))
    expect(alvoAcima.pesoAlvo).toBeNull()
    expect(alvoAcima.avisos.join(' ')).toMatch(/não está abaixo do atual/)
  })

  it('CA-2068: déficit de 300–500 kcal no sobrepeso (IMC 27) e de 500–750 nos outros (IMC 32), teto 1.000', () => {
    const imc27 = mostrada(metaDePerda(caso({ pesoKg: 27 * 1.7 ** 2, objetivo: 'emagrecer' })))
    expect(imc27.deficitKcal).toEqual({ min: 300, max: 500, teto: 1000 })
    const imc32 = mostrada(metaDePerda(caso({ pesoKg: 32 * 1.7 ** 2 })))
    expect(imc32.deficitKcal).toEqual({ min: 500, max: 750, teto: 1000 })
  })

  it('CA-2068: com gasto total de 1.400 kcal, a energia sugerida nunca fica abaixo de 800 kcal/dia', () => {
    const r = mostrada(metaDePerda(caso({ pesoKg: 32 * 1.7 ** 2 }), { gastoTotalKcal: 1400 }))
    expect(r.energiaSugeridaKcal).toEqual({ min: 800, max: 900 })
    expect(r.avisos.join(' ')).toMatch(/supervisão médica/)
    const folgado = mostrada(metaDePerda(caso({ pesoKg: 32 * 1.7 ** 2 }), { gastoTotalKcal: 2400 }))
    expect(folgado.energiaSugeridaKcal).toEqual({ min: 1650, max: 1900 })
  })

  it('CA-2069: prioridade 0 e objetivo que não é emagrecer → não vem; "emagrecer" → vem', () => {
    const eutrofica = caso({ pesoKg: 22 * 1.7 ** 2, circunferenciaCinturaCm: 70, objetivo: 'manter' })
    expect(metaDePerda(eutrofica)).toBeNull()
    expect(metaDePerda({ ...eutrofica, objetivo: 'emagrecer' })?.mostra).toBe(true)
  })

  it('CA-2069: com a sobreposição de risco nutricional, não sugere perda e diz por quê', () => {
    const r = metaDePerda(caso({ pesoKg: 17.8 * 1.7 ** 2, objetivo: 'emagrecer' }))
    expect(r?.mostra).toBe(false)
    if (r && !r.mostra) expect(r.motivo).toMatch(/massa magra/)
  })

  it('abaixo de 18 anos e na gestação não vem; na lactação, diz que não há fonte', () => {
    expect(metaDePerda(caso({ idadeAnos: 16 }))).toBeNull()
    expect(metaDePerda(caso({ condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 80 } }))).toBeNull()
    const lactante = metaDePerda(caso({ condicao: { tipo: 'lactante', mesesPosParto: 4 } }))
    expect(lactante?.mostra).toBe(false)
  })
})

describe('idoso (spec antropometria-completa, revisão, CA-2073)', () => {
  const idosa = (idadeAnos: number, pesoKg: number): Caso => ({ ...criarCasoVazio('i'), sexo: 'F', idadeAnos, pesoKg, estaturaCm: 155, objetivo: 'emagrecer' })

  it('CA-2073: com IMC de 22 ou menos (baixo peso pelo SISVAN), não há meta de perda', () => {
    for (const [idade, peso] of [
      [65, 49.6],
      [68, 52],
    ] as const) {
      const r = metaDePerda(idosa(idade, peso))
      expect.soft(r?.mostra, `${idade} anos`).toBe(false)
      if (r && !r.mostra) expect.soft(r.motivo, `${idade} anos`).toMatch(/baixo peso/)
    }
  })

  it('CA-2073: de 22 a 27, a faixa de referência do idoso, também não', () => {
    const r = metaDePerda(idosa(72, 54))
    expect(r?.mostra).toBe(false)
    if (r && !r.mostra) expect(r.motivo).toMatch(/faixa de referência/)
  })

  it('CA-2073: com IMC 28, há', () => {
    expect(metaDePerda(idosa(70, 28 * 1.55 ** 2))?.mostra).toBe(true)
  })
})

describe('déficit abaixo de IMC 25 (spec antropometria-completa, revisão, CA-2076)', () => {
  it('CA-2076: IMC 23 com "emagrecer" → 300–500 kcal/dia, nunca maior que o do sobrepeso', () => {
    const normal = mostrada(metaDePerda(caso({ pesoKg: 23 * 1.7 ** 2, objetivo: 'emagrecer' })))
    const sobrepeso = mostrada(metaDePerda(caso({ pesoKg: 27 * 1.7 ** 2, objetivo: 'emagrecer' })))
    expect(normal.deficitKcal).toEqual({ min: 300, max: 500, teto: 1000 })
    expect(normal.deficitKcal.max).toBeLessThanOrEqual(sobrepeso.deficitKcal.max)
    expect(mostrada(metaDePerda(caso({ pesoKg: 30 * 1.7 ** 2 }))).deficitKcal).toEqual({ min: 500, max: 750, teto: 1000 })
  })
})

describe('proposta do app (spec antropometria-completa, revisão, CA-2083)', () => {
  it('CA-2083: o peso-alvo e o prazo mínimo avisam que são proposta do app', () => {
    expect(mostrada(metaDePerda(caso(), { gorduraAlvoPct: 25 })).avisos.join(' ')).toMatch(/Proposta do app \(sem diretriz\)/)
  })
})

describe('objetivo do plano (spec antropometria-completa, revisão, CA-2086)', () => {
  it.each(['ganhar', 'manter'] as const)('CA-2086: objetivo "%s" com prioridade ≥ 1 → sem meta de perda; a prioridade vem', (objetivo) => {
    const c = caso({ objetivo })
    expect(prioridadeDoCaso(c)?.nivel).toBeGreaterThanOrEqual(1)
    expect(metaDePerda(c)).toBeNull()
  })

  it('CA-2086: sem objetivo, a mesma prioridade traz a meta', () => {
    expect(metaDePerda(caso({ objetivo: null }))?.mostra).toBe(true)
  })
})

describe('idoso com IMC de 27 a 29,99: a posição da ESPEN (spec antropometria-completa, rodada 2, CA-2092)', () => {
  const comImc = (idadeAnos: number, imc: number): Caso => ({ ...criarCasoVazio('i'), sexo: 'F', idadeAnos, pesoKg: imc * 1.55 ** 2, estaturaCm: 155, objetivo: 'emagrecer' })
  const ESPEN = /ESPEN em geriatria só considera dieta para perder peso com obesidade e problema de saúde ligado ao peso, e junto com exercício \(ESPEN, geriatria, 2019 e 2022\)/

  it('CA-2092: idoso com IMC 27,00, 28 e 29,99 → a meta vem, com o aviso da ESPEN', () => {
    for (const imc of [27, 28, 29.99]) {
      const r = metaDePerda(comImc(70, imc))
      expect.soft(r?.mostra, `IMC ${imc}`).toBe(true)
      if (r?.mostra) expect.soft(r.avisos.join(' '), `IMC ${imc}`).toMatch(ESPEN)
    }
  })

  it('CA-2092: com IMC 30, e no adulto de 59 anos com IMC 28, sem esse aviso', () => {
    expect(mostrada(metaDePerda(comImc(70, 30))).avisos.join(' ')).not.toMatch(/ESPEN/)
    expect(mostrada(metaDePerda(comImc(59, 28))).avisos.join(' ')).not.toMatch(/ESPEN/)
  })

  it('CA-2092: a fonte está no lugar das fontes, com a citação completa', () => {
    expect(FONTES.espenGeriatria.citacao).toMatch(/Volkert D et al\..*Clin Nutr 2019;38:10-47.*PMID 35306388/)
  })
})

describe('o texto pelo sexo da pessoa (spec antropometria-telas, D-1527; revisão r1, B2)', () => {
  it('CB-1487: risco nutricional numa idosa: "panturrilha baixa na idosa"; num idoso, "no idoso"', () => {
    const idosa = metaDePerda(caso({ idadeAnos: 70, objetivo: 'emagrecer', pesoKg: 50, estaturaCm: 160 }))
    if (!idosa || idosa.mostra) throw new Error('a meta não devia vir')
    expect(idosa.motivo).toMatch(/panturrilha baixa na idosa/)
    const idoso = metaDePerda(caso({ sexo: 'M', idadeAnos: 70, objetivo: 'emagrecer', pesoKg: 50, estaturaCm: 160 }))
    if (!idoso || idoso.mostra) throw new Error('a meta não devia vir')
    expect(idoso.motivo).toMatch(/panturrilha baixa no idoso/)
  })
})
