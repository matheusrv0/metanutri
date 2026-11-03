import { DOBRAS_VAZIAS, calcularComposicao } from './composicao.ts'
import { naPrecisao } from './linhaDoResultado.ts'
import {
  PROTOCOLOS_DE_DOBRAS,
  aplicacaoDoProtocolo,
  brozek,
  calcularProtocolo,
  converterDensidade,
  lohman,
  siri,
  type IdProtocolo,
  type PacienteDoProtocolo,
  type ResultadoDoProtocolo,
} from './protocolosDeDobras.ts'
import type { ComposicaoCorporal, Sexo } from './tipos.ts'

type Dobras = ComposicaoCorporal['dobras']
const dobras = (parcial: Partial<Dobras>): Dobras => ({ ...DOBRAS_VAZIAS, ...parcial })
const paciente = (sexo: Sexo, idadeAnos: number, extra: Partial<PacienteDoProtocolo> = {}): PacienteDoProtocolo => ({
  sexo,
  idadeAnos,
  pesoKg: null,
  estaturaCm: null,
  gestante: false,
  ...extra,
})

/** O resultado que calculou; falha o teste se não calculou. */
function calculado(r: ResultadoDoProtocolo) {
  if (!r.calculou) throw new Error(`não calculou: ${r.motivo}`)
  return r
}

describe('catálogo (spec antropometria-completa, CA-2010)', () => {
  it('CA-2010: os 8 protocolos do lançamento, nesta ordem, com os metadados por sexo', () => {
    expect(PROTOCOLOS_DE_DOBRAS.map((p) => p.id)).toEqual([
      'jackson-pollock-3',
      'jackson-pollock-7',
      'durnin-womersley',
      'petroski',
      'guedes',
      'faulkner-4',
      'slaughter-triceps-subescapular',
      'slaughter-triceps-panturrilha',
    ])
    for (const p of PROTOCOLOS_DE_DOBRAS) {
      for (const sexo of ['M', 'F'] as const) {
        const v = p.porSexo[sexo]
        expect.soft(v.dobras.length, `${p.id} ${sexo}`).toBeGreaterThan(0)
        expect.soft(v.populacao.length, `${p.id} ${sexo}`).toBeGreaterThan(5)
        expect.soft(v.fonte.citacao.length, `${p.id} ${sexo}`).toBeGreaterThan(20)
      }
    }
  })

  it('CA-2010: as dobras exigidas são as da tabela da seção 4 da spec', () => {
    const exigidas = (id: IdProtocolo, sexo: Sexo) => PROTOCOLOS_DE_DOBRAS.find((p) => p.id === id)?.porSexo[sexo].dobras
    expect(exigidas('jackson-pollock-3', 'M')).toEqual(['peitoral', 'abdominal', 'coxa'])
    expect(exigidas('jackson-pollock-3', 'F')).toEqual(['tricipital', 'suprailiacaAnt', 'coxa'])
    const sete = ['peitoral', 'axilarMedia', 'tricipital', 'subescapular', 'abdominal', 'suprailiacaAnt', 'coxa']
    expect(exigidas('jackson-pollock-7', 'M')).toEqual(sete)
    expect(exigidas('jackson-pollock-7', 'F')).toEqual(sete)
    expect(exigidas('durnin-womersley', 'F')).toEqual(['bicipital', 'tricipital', 'subescapular', 'suprailiacaMed'])
    expect(exigidas('petroski', 'M')).toEqual(['subescapular', 'tricipital', 'suprailiacaMed', 'panturrilhaMedial'])
    expect(exigidas('petroski', 'F')).toEqual(['subescapular', 'suprailiacaMed', 'coxa'])
    expect(exigidas('guedes', 'M')).toEqual(['tricipital', 'suprailiaca', 'abdominal'])
    expect(exigidas('guedes', 'F')).toEqual(['subescapular', 'suprailiaca', 'coxa'])
    expect(exigidas('faulkner-4', 'M')).toEqual(['tricipital', 'subescapular', 'suprailiaca', 'abdominal'])
    expect(exigidas('slaughter-triceps-subescapular', 'M')).toEqual(['tricipital', 'subescapular'])
    expect(exigidas('slaughter-triceps-panturrilha', 'F')).toEqual(['tricipital', 'panturrilhaMedial'])
  })

  it('D-1008: a forma da equação é um dado do protocolo (log10 em Durnin & Womersley e Guedes)', () => {
    const forma = (id: IdProtocolo) => PROTOCOLOS_DE_DOBRAS.find((p) => p.id === id)?.porSexo.M.forma
    expect(forma('jackson-pollock-7')).toBe('quadratica')
    expect(forma('durnin-womersley')).toBe('log10')
    expect(forma('guedes')).toBe('log10')
    expect(forma('faulkner-4')).toBe('linear')
  })
})

describe('se o protocolo se aplica (spec antropometria-completa, CA-2011)', () => {
  it('CA-2011: diz as dobras que faltam, na ordem do protocolo, e se vale pelo sexo e pela idade', () => {
    const a = aplicacaoDoProtocolo('jackson-pollock-3', paciente('M', 30), dobras({ peitoral: 7, abdominal: 25 }))
    expect(a.dobrasExigidas).toEqual(['peitoral', 'abdominal', 'coxa'])
    expect(a.dobrasQueFaltam).toEqual(['coxa'])
    expect(a.entradasQueFaltam).toEqual([])
    expect(a.aplicaPeloSexo).toBe(true)
    expect(a.aplicaPelaIdade).toBe(true)
    expect(aplicacaoDoProtocolo('jackson-pollock-3', paciente('M', 65), dobras({})).aplicaPelaIdade).toBe(false)
  })

  it('CA-2011 e CB-1000: dobra 0 ou negativa conta como faltando', () => {
    const a = aplicacaoDoProtocolo('jackson-pollock-3', paciente('F', 30), dobras({ tricipital: 0, suprailiaca: -2, coxa: 20 }))
    // D-1039: a falta da suprailíaca aponta o campo da linha do protocolo (JP: axilar anterior).
    expect(a.dobrasQueFaltam).toEqual(['tricipital', 'suprailiacaAnt'])
  })

  it('CB-1001: sem sexo ou sem idade, não dá para dizer', () => {
    const semSexo = aplicacaoDoProtocolo('jackson-pollock-3', { ...paciente('M', 30), sexo: null }, dobras({}))
    expect(semSexo.dobrasExigidas).toEqual([])
    expect(semSexo.aplicaPeloSexo).toBeNull()
    expect(semSexo.entradasQueFaltam).toContain('sexo')
    const semIdade = aplicacaoDoProtocolo('jackson-pollock-3', { ...paciente('M', 30), idadeAnos: null }, dobras({}))
    expect(semIdade.aplicaPelaIdade).toBeNull()
    expect(semIdade.entradasQueFaltam).toEqual(['idade'])
  })

  it('CA-2017: Petroski na mulher pede peso e estatura', () => {
    const a = aplicacaoDoProtocolo('petroski', paciente('F', 30, { pesoKg: 60 }), dobras({ subescapular: 15, suprailiaca: 15, coxa: 25 }))
    expect(a.entradasQueFaltam).toEqual(['estatura'])
  })
})

describe('Jackson & Pollock (spec antropometria-completa, CA-2012 a CA-2015)', () => {
  // Pesquisa 2.2.1 e 2.2.2: conferido no original (JP78) e em fontes secundárias independentes (JPW80).
  it('CA-2012: JP 7 dobras, homem de 30 anos, Σ7 = 120 mm → D 1,05907 e 17,39%', () => {
    const r = calculado(
      calcularProtocolo('jackson-pollock-7', paciente('M', 30), dobras({ peitoral: 15, axilarMedia: 15, tricipital: 15, subescapular: 20, abdominal: 25, suprailiaca: 15, coxa: 15 })),
    )
    expect(r.somaMm).toBe(120)
    expect(r.densidade).toBeCloseTo(1.05907, 5)
    expect(r.gorduraPct).toBeCloseTo(17.39, 2)
    expect(r.conversao).toBe('siri')
  })

  it('CA-2013: JP 3 dobras, homem de 30 anos, Σ3 = 60 mm → D 1,05782 e 17,95%', () => {
    const r = calculado(calcularProtocolo('jackson-pollock-3', paciente('M', 30), dobras({ peitoral: 15, abdominal: 25, coxa: 20 })))
    expect(r.densidade).toBeCloseTo(1.05782, 5)
    expect(r.gorduraPct).toBeCloseTo(17.95, 2)
  })

  it('CA-2014: JP 7 dobras, mulher de 30 anos, Σ7 = 140 mm → D 1,03837 e 26,71%', () => {
    const r = calculado(
      calcularProtocolo('jackson-pollock-7', paciente('F', 30), dobras({ peitoral: 10, axilarMedia: 15, tricipital: 25, subescapular: 20, abdominal: 30, suprailiaca: 20, coxa: 20 })),
    )
    expect(r.densidade).toBeCloseTo(1.03837, 5)
    expect(r.gorduraPct).toBeCloseTo(26.71, 2)
  })

  it('CA-2015: JP 3 dobras, mulher de 30 anos, Σ3 = 70 mm → D 1,03708 e 27,30%', () => {
    const r = calculado(calcularProtocolo('jackson-pollock-3', paciente('F', 30), dobras({ tricipital: 25, suprailiaca: 20, coxa: 25 })))
    expect(r.densidade).toBeCloseTo(1.03708, 5)
    expect(r.gorduraPct).toBeCloseTo(27.3, 2)
  })

  it('CA-2015: os dois ids de hoje dão o mesmo número de calcularComposicao', () => {
    const casos = [
      { protocolo: 'jackson-pollock-3', sexo: 'M', idade: 41, d: dobras({ peitoral: 12, abdominal: 28, coxa: 17 }) },
      { protocolo: 'jackson-pollock-3', sexo: 'F', idade: 29, d: dobras({ tricipital: 21, suprailiaca: 18, coxa: 30 }) },
      { protocolo: 'faulkner-4', sexo: 'F', idade: 35, d: dobras({ tricipital: 10, subescapular: 12, suprailiaca: 14, abdominal: 16 }) },
    ] as const
    for (const c of casos) {
      const antigo = calcularComposicao({ protocolo: c.protocolo, sexo: c.sexo, idadeAnos: c.idade, pesoKg: 70, dobras: c.d })
      const novo = calculado(calcularProtocolo(c.protocolo, paciente(c.sexo, c.idade, { pesoKg: 70 }), c.d))
      expect(naPrecisao(novo.gorduraPct, 1)).toBe(antigo.gorduraPct)
    }
  })
})

describe('Durnin & Womersley 1974 (spec antropometria-completa, CA-2016)', () => {
  // Grade da pesquisa (2.2.4), saída do script exemplos_protocolos.py: sexo, faixa, Σ4, D, %G (Siri).
  const GRADE = `H,17-19,40,1.06107,16.51
H,17-19,50,1.05496,19.21
H,20-29,40,1.06185,16.17
H,20-29,50,1.05573,18.87
H,30-39,40,1.05505,19.17
H,30-39,50,1.04978,21.53
H,40-49,40,1.04986,21.49
H,40-49,50,1.04307,24.56
H,50+,40,1.04670,22.92
H,50+,50,1.03915,26.35
H,17-72,40,1.05731,18.17
H,17-72,50,1.05010,21.39
M,16-19,40,1.04628,23.10
M,16-19,50,1.03971,26.09
M,20-29,40,1.04503,23.67
M,20-29,50,1.03808,26.84
M,30-39,40,1.04105,25.48
M,30-39,50,1.03493,28.30
M,40-49,40,1.03525,28.14
M,40-49,50,1.02932,30.90
M,50+,40,1.03057,30.32
M,50+,50,1.02432,33.25
M,16-68,40,1.04183,25.12
M,16-68,50,1.03488,28.31`
  // Uma idade dentro de cada faixa (a "todas as idades" é pedida pela opção).
  const IDADE: Readonly<Record<string, number>> = { '17-19': 18, '16-19': 18, '20-29': 25, '30-39': 35, '40-49': 45, '50+': 60, '17-72': 35, '16-68': 35 }

  it.each(GRADE.split('\n').map((l) => l.split(',')))('CA-2016: %s %s com Σ4 = %s mm → D %s e %s%%', (sx, faixa, soma, d, pct) => {
    const sexo: Sexo = sx === 'H' ? 'M' : 'F'
    const todas = faixa === '17-72' || faixa === '16-68'
    const s = Number(soma) / 4
    const r = calculado(
      calcularProtocolo('durnin-womersley', paciente(sexo, IDADE[faixa ?? ''] ?? 0), dobras({ bicipital: s, tricipital: s, subescapular: s, suprailiaca: s }), {
        // A grade da pesquisa converte por Siri em toda faixa, inclusive 16–19.
        conversao: 'siri',
        durninTodasAsIdades: todas,
      }),
    )
    expect(r.densidade).toBeCloseTo(Number(d), 5)
    expect(r.gorduraPct).toBeCloseTo(Number(pct), 2)
  })

  it('CA-2016: os valores da Tabela 9 do original saem a ± 0,2 ponto', () => {
    const dw = (sexo: Sexo, idade: number, soma: number) =>
      calculado(
        calcularProtocolo('durnin-womersley', paciente(sexo, idade), dobras({ bicipital: soma / 4, tricipital: soma / 4, subescapular: soma / 4, suprailiaca: soma / 4 })),
      ).gorduraPct
    expect(Math.abs(dw('M', 35, 40) - 19.2)).toBeLessThanOrEqual(0.2)
    expect(Math.abs(dw('M', 45, 40) - 21.4)).toBeLessThanOrEqual(0.2)
    expect(Math.abs(dw('F', 35, 50) - 28.2)).toBeLessThanOrEqual(0.2)
    expect(Math.abs(dw('F', 45, 50) - 31.0)).toBeLessThanOrEqual(0.2)
  })

  it('CA-2016 e D-1011: a primeira faixa feminina é 16–19; abaixo da primeira faixa vale a "todas as idades", com aviso', () => {
    const quatro = dobras({ bicipital: 10, tricipital: 10, subescapular: 10, suprailiaca: 10 })
    const menina = calculado(calcularProtocolo('durnin-womersley', paciente('F', 16), quatro, { conversao: 'siri' }))
    expect(menina.densidade).toBeCloseTo(1.04628, 5)
    expect(menina.avisos.join(' ')).not.toMatch(/fora da população/i)
    const menino = calculado(calcularProtocolo('durnin-womersley', paciente('M', 16), quatro, { conversao: 'siri' }))
    expect(menino.densidade).toBeCloseTo(1.05731, 5)
    expect(menino.avisos.join(' ')).toMatch(/fora da população de origem/i)
  })

  it('D-8 da pesquisa (2.4.1): log10, não ln — com ln a densidade sairia outra', () => {
    const r = calculado(calcularProtocolo('durnin-womersley', paciente('M', 35), dobras({ bicipital: 10, tricipital: 10, subescapular: 10, suprailiaca: 10 }), { conversao: 'siri' }))
    expect(r.densidade).toBeCloseTo(1.1422 - 0.0544 * Math.log10(40), 10)
    expect(r.densidade).not.toBeCloseTo(1.1422 - 0.0544 * Math.log(40), 3)
  })
})

describe('Petroski 1995 (spec antropometria-completa, CA-2017)', () => {
  it('CA-2017: homem de 30 anos, SE+TR+SI+PM = 60 mm → D 1,05365 e 19,79%', () => {
    const r = calculado(calcularProtocolo('petroski', paciente('M', 30), dobras({ subescapular: 15, tricipital: 15, suprailiaca: 15, panturrilhaMedial: 15 })))
    expect(r.densidade).toBeCloseTo(1.05365, 5)
    expect(r.gorduraPct).toBeCloseTo(19.79, 2)
  })

  it('CA-2017: mulher de 30 anos, 60 kg, 165 cm, SE+SI+CX = 55 mm → D 1,04554 e 23,44%', () => {
    const r = calculado(calcularProtocolo('petroski', paciente('F', 30, { pesoKg: 60, estaturaCm: 165 }), dobras({ subescapular: 15, suprailiaca: 15, coxa: 25 })))
    expect(r.densidade).toBeCloseTo(1.04554, 5)
    expect(r.gorduraPct).toBeCloseTo(23.44, 2)
  })

  it('CA-2017: sem o peso ou a estatura, a mulher não calcula e diz qual falta', () => {
    const r = calcularProtocolo('petroski', paciente('F', 30, { pesoKg: 60 }), dobras({ subescapular: 15, suprailiaca: 15, coxa: 25 }))
    expect(r.calculou).toBe(false)
    if (!r.calculou) expect(r.motivo).toMatch(/estatura/)
  })
})

describe('Guedes 1985 (spec antropometria-completa, CA-2018)', () => {
  it('CA-2018: homem TR+SI+AB = 50 mm → D 1,05743 e 18,12%; mulher SE+SI+CX = 60 mm → D 1,04091 e 25,55%', () => {
    const h = calculado(calcularProtocolo('guedes', paciente('M', 22), dobras({ tricipital: 15, suprailiaca: 15, abdominal: 20 })))
    expect(h.densidade).toBeCloseTo(1.05743, 5)
    expect(h.gorduraPct).toBeCloseTo(18.12, 2)
    const m = calculado(calcularProtocolo('guedes', paciente('F', 22), dobras({ subescapular: 15, suprailiaca: 15, coxa: 30 })))
    expect(m.densidade).toBeCloseTo(1.04091, 5)
    expect(m.gorduraPct).toBeCloseTo(25.55, 2)
  })

  it('CA-2018 e D-1013: os coeficientes de 5 casas arredondados a 4 casas são os da versão [V2]', () => {
    // 1,17136 − 0,06706 · log10 Σ (H) e 1,16650 − 0,07063 · log10 Σ (M): as de 4 casas são 1,1714/0,0671 e 1,1665/0,0706.
    // A densidade é c − m · log10(Σ): dois pontos (Σ = 20 e 100 mm) dão c e m.
    const h = calculado(calcularProtocolo('guedes', paciente('M', 22), dobras({ tricipital: 10, suprailiaca: 5, abdominal: 5 }), { conversao: 'siri' }))
    const h2 = calculado(calcularProtocolo('guedes', paciente('M', 22), dobras({ tricipital: 50, suprailiaca: 25, abdominal: 25 }), { conversao: 'siri' }))
    const m = ((h.densidade ?? 0) - (h2.densidade ?? 0)) / (Math.log10(100) - Math.log10(20))
    const c = (h.densidade ?? 0) + m * Math.log10(20)
    expect(naPrecisao(c, 4)).toBe(1.1714)
    expect(naPrecisao(m, 4)).toBe(0.0671)
    const f = calculado(calcularProtocolo('guedes', paciente('F', 22), dobras({ subescapular: 10, suprailiaca: 5, coxa: 5 }), { conversao: 'siri' }))
    const f2 = calculado(calcularProtocolo('guedes', paciente('F', 22), dobras({ subescapular: 50, suprailiaca: 25, coxa: 25 }), { conversao: 'siri' }))
    const mf = ((f.densidade ?? 0) - (f2.densidade ?? 0)) / (Math.log10(100) - Math.log10(20))
    expect(naPrecisao((f.densidade ?? 0) + mf * Math.log10(20), 4)).toBe(1.1665)
    expect(naPrecisao(mf, 4)).toBe(0.0706)
  })
})

describe('Faulkner (Yuhasz) (spec antropometria-completa, CA-2019)', () => {
  it('CA-2019: Σ4 = 52 mm → 13,739% (o gabarito publicado), sem conversão, com o aviso da amostra', () => {
    const r = calculado(calcularProtocolo('faulkner-4', paciente('M', 24), dobras({ tricipital: 10, subescapular: 12, suprailiaca: 14, abdominal: 16 })))
    expect(r.gorduraPct).toBeCloseTo(13.739, 3)
    expect(r.densidade).toBeNull()
    expect(r.conversao).toBeNull()
    expect(r.avisos.join(' ')).toMatch(/amostra de origem desconhecida/i)
  })
})

describe('Slaughter 1988 (spec antropometria-completa, CA-2020 e CA-2021)', () => {
  const trse = (soma: number) => dobras({ tricipital: soma / 2, subescapular: soma / 2 })

  it('CA-2020: meninos com soma até 35 mm pela maturação e pelo grupo do estudo', () => {
    const pubere = calculado(calcularProtocolo('slaughter-triceps-subescapular', paciente('M', 13), trse(18), { maturacao: 'pubere', grupo: 'branco' }))
    expect(pubere.gorduraPct).toBeCloseTo(15.79, 2)
    const pos = calculado(calcularProtocolo('slaughter-triceps-subescapular', paciente('M', 16), trse(18), { maturacao: 'pos-pubere', grupo: 'branco' }))
    expect(pos.gorduraPct).toBeCloseTo(13.69, 2)
  })

  it('CA-2020: menina com 30 mm → 25,70% (o bodycomp, sem o quadrado, dá 37,0%)', () => {
    const r = calculado(calcularProtocolo('slaughter-triceps-subescapular', paciente('F', 12), trse(30)))
    expect(r.gorduraPct).toBeCloseTo(25.7, 2)
  })

  it('CA-2020: acima de 35 mm, a linear; com 35 mm exatos, a quadrática (D-1012)', () => {
    expect(calculado(calcularProtocolo('slaughter-triceps-subescapular', paciente('M', 12), trse(40))).gorduraPct).toBeCloseTo(32.92, 2)
    expect(calculado(calcularProtocolo('slaughter-triceps-subescapular', paciente('F', 12), trse(40))).gorduraPct).toBeCloseTo(31.54, 2)
    const menino35 = calculado(calcularProtocolo('slaughter-triceps-subescapular', paciente('M', 16), trse(35), { maturacao: 'pos-pubere', grupo: 'branco' }))
    expect(menino35.gorduraPct).toBeCloseTo(27.05, 2)
    expect(calculado(calcularProtocolo('slaughter-triceps-subescapular', paciente('F', 12), trse(35))).gorduraPct).toBeCloseTo(28.13, 2)
  })

  it('CA-2020: menino com soma até 35 mm sem maturação ou sem grupo não calcula e diz o que falta', () => {
    const r = calcularProtocolo('slaughter-triceps-subescapular', paciente('M', 13), trse(18), { maturacao: 'pubere' })
    expect(r.calculou).toBe(false)
    if (!r.calculou) {
      expect(r.motivo).toMatch(/grupo/)
      expect(r.aplicacao?.entradasQueFaltam).toEqual(['grupo'])
    }
    const semNada = aplicacaoDoProtocolo('slaughter-triceps-subescapular', paciente('M', 13), trse(18))
    expect(semNada.entradasQueFaltam).toEqual(['maturacao', 'grupo'])
  })

  it('CA-2021: tríceps + panturrilha medial de 25 mm → menino 19,38% e menina 20,35%', () => {
    const tp = dobras({ tricipital: 12.5, panturrilhaMedial: 12.5 })
    expect(calculado(calcularProtocolo('slaughter-triceps-panturrilha', paciente('M', 10), tp)).gorduraPct).toBeCloseTo(19.38, 2)
    expect(calculado(calcularProtocolo('slaughter-triceps-panturrilha', paciente('F', 10), tp)).gorduraPct).toBeCloseTo(20.35, 2)
  })
})

describe('conversão da densidade (spec antropometria-completa, CA-2022 e CA-2023)', () => {
  it('CA-2022: D = 1,0500 → Siri 21,43% e Brozek 21,04%', () => {
    expect(siri(1.05)).toBeCloseTo(21.43, 2)
    expect(brozek(1.05)).toBeCloseTo(21.04, 2)
  })

  it('CA-2022: as constantes de Lohman de 7 a 19 anos (pesquisa 2.3.2, D = 1,0500)', () => {
    const LOHMAN = `M,7,15.38
M,9,15.76
M,11,17.1
M,13,18.86
M,15,20.05
M,17,21.29
F,7,14.14
F,9,14.52
F,11,16.0
F,13,18.62
F,15,18.86
F,17,18.95`
    for (const [sexo, idade, pct] of LOHMAN.split('\n').map((l) => l.split(','))) {
      const s: Sexo = sexo === 'M' ? 'M' : 'F'
      expect.soft(lohman(1.05, s, Number(idade)), `${sexo} ${idade}`).toBeCloseTo(Number(pct), 2)
      // A outra idade da mesma faixa dá o mesmo.
      expect.soft(lohman(1.05, s, Number(idade) + 1), `${sexo} ${Number(idade) + 1}`).toBeCloseTo(Number(pct), 2)
    }
    expect(lohman(1.05, 'M', 20)).toBeNull()
    expect(lohman(1.05, 'F', 6)).toBeNull()
  })

  it('CA-2022 e D-1009: a automática usa Lohman de 7 a 19 anos e Siri de 20 em diante; Siri e Brozek escolhidos valem em qualquer idade', () => {
    expect(converterDensidade(1.05, 'automatica', 'M', 17)).toEqual({ gorduraPct: lohman(1.05, 'M', 17), conversao: 'lohman' })
    expect(converterDensidade(1.05, 'automatica', 'F', 20)).toEqual({ gorduraPct: siri(1.05), conversao: 'siri' })
    expect(converterDensidade(1.05, 'automatica', 'F', 75)).toEqual({ gorduraPct: siri(1.05), conversao: 'siri' })
    expect(converterDensidade(1.05, 'siri', 'M', 12)).toEqual({ gorduraPct: siri(1.05), conversao: 'siri' })
    expect(converterDensidade(1.05, 'brozek', 'F', 30)).toEqual({ gorduraPct: brozek(1.05), conversao: 'brozek' })
    expect(converterDensidade(1.05, 'automatica', 'M', 5)).toBeNull()
  })

  it('CA-2023: Faulkner e Slaughter já dão o %: escolher Brozek não muda nada', () => {
    const quatro = dobras({ tricipital: 10, subescapular: 12, suprailiaca: 14, abdominal: 16 })
    const f1 = calculado(calcularProtocolo('faulkner-4', paciente('M', 24), quatro))
    const f2 = calculado(calcularProtocolo('faulkner-4', paciente('M', 24), quatro, { conversao: 'brozek' }))
    expect(f2.gorduraPct).toBe(f1.gorduraPct)
    const tp = dobras({ tricipital: 12.5, panturrilhaMedial: 12.5 })
    expect(calculado(calcularProtocolo('slaughter-triceps-panturrilha', paciente('M', 10), tp, { conversao: 'brozek' })).gorduraPct).toBeCloseTo(19.38, 2)
  })

  it('JP 3 dobras num adolescente de 17 anos, com a automática escolhida, converte por Lohman (e avisa que está fora da população)', () => {
    const r = calculado(calcularProtocolo('jackson-pollock-3', paciente('M', 17), dobras({ peitoral: 15, abdominal: 25, coxa: 20 }), { conversao: 'automatica' }))
    expect(r.conversao).toBe('lohman')
    expect(r.avisos.join(' ')).toMatch(/fora da população de origem/i)
  })
})

describe('massas, soma e casos de borda (spec antropometria-completa, CA-2024 e CA-2025)', () => {
  const tres = dobras({ peitoral: 15, abdominal: 25, coxa: 20 })

  it('CA-2024: com o peso, massa gorda e massa magra; sem o peso, só o %', () => {
    const com = calculado(calcularProtocolo('jackson-pollock-3', paciente('M', 30, { pesoKg: 80 }), tres))
    expect(com.somaMm).toBe(60)
    expect(com.massaGordaKg).toBeCloseTo((80 * com.gorduraPct) / 100, 10)
    expect(com.massaMagraKg).toBeCloseTo(80 - (com.massaGordaKg ?? 0), 10)
    const sem = calculado(calcularProtocolo('jackson-pollock-3', paciente('M', 30), tres))
    expect(sem.massaGordaKg).toBeNull()
    expect(sem.massaMagraKg).toBeNull()
  })

  it('CA-2025: fora da faixa de idade calcula e avisa, com a faixa', () => {
    const r = calculado(calcularProtocolo('jackson-pollock-3', paciente('M', 65), tres))
    expect(r.avisos.join(' ')).toMatch(/fora da população de origem.*18 a 61 anos/i)
  })

  it('CA-2025: resultado de 70% ou mais não sai, e o motivo pede para conferir', () => {
    const r = calcularProtocolo('slaughter-triceps-subescapular', paciente('M', 12), dobras({ tricipital: 60, subescapular: 60 }))
    expect(r.calculou).toBe(false)
    if (!r.calculou) expect(r.motivo).toMatch(/fora do plausível/)
  })

  it('CA-2025 e CB-1002: na gestação, nenhum protocolo calcula', () => {
    const r = calcularProtocolo('jackson-pollock-3', paciente('F', 30, { gestante: true }), dobras({ tricipital: 25, suprailiaca: 20, coxa: 25 }))
    expect(r.calculou).toBe(false)
    if (!r.calculou) expect(r.motivo).toMatch(/gestação/)
  })

  it('CB-1001: sem sexo, não calcula e diz que falta o sexo', () => {
    const r = calcularProtocolo('jackson-pollock-3', { ...paciente('M', 30), sexo: null }, tres)
    expect(r.calculou).toBe(false)
    if (!r.calculou) expect(r.motivo).toMatch(/sexo/)
  })

  it('CB-1001: falta dobra → diz qual', () => {
    const r = calcularProtocolo('jackson-pollock-3', paciente('M', 30), dobras({ peitoral: 7, abdominal: 25 }))
    expect(r.calculou).toBe(false)
    if (!r.calculou) expect(r.motivo).toBe('Faltam as dobras: coxa.')
  })

  it('CB-1009 (revisto, rodada 2): protocolo desconhecido não lança e diz o que fazer', () => {
    const r = calcularProtocolo('protocolo-do-futuro' as IdProtocolo, paciente('M', 30), tres)
    expect(r.calculou).toBe(false)
    if (!r.calculou) expect(r.motivo).toBe('Protocolo desconhecido nesta versão do app: escolha outro protocolo ou informe o % da bioimpedância.')
  })

  it('Jackson, Pollock e Ward: acima de 40 anos, a cautela dos autores', () => {
    const r = calculado(calcularProtocolo('jackson-pollock-3', paciente('F', 45), dobras({ tricipital: 25, suprailiaca: 20, coxa: 25 })))
    expect(r.avisos.join(' ')).toMatch(/cautela acima de 40 anos/i)
  })
})

describe('pico da parábola e faixa da amostra (spec antropometria-completa, revisão, CA-2074 e CA-2075)', () => {
  /** As dobras exigidas com a soma pedida, em partes iguais. */
  const comSoma = (id: IdProtocolo, sexo: Sexo, soma: number): Dobras => {
    const exigidas = PROTOCOLOS_DE_DOBRAS.find((p) => p.id === id)?.porSexo[sexo].dobras ?? []
    return dobras(Object.fromEntries(exigidas.map((d) => [d, soma / exigidas.length])))
  }
  const pacienteDe = (sexo: Sexo) => paciente(sexo, 30, { pesoKg: 60, estaturaCm: 165 })
  const pct = (id: IdProtocolo, sexo: Sexo, soma: number) => {
    const r = calcularProtocolo(id, pacienteDe(sexo), comSoma(id, sexo, soma), { conversao: 'siri' })
    return r.calculou ? r.gorduraPct : null
  }
  const variante = (id: IdProtocolo, sexo: Sexo) => PROTOCOLOS_DE_DOBRAS.find((p) => p.id === id)?.porSexo[sexo]

  it('CA-2074: o catálogo traz o pico das quadráticas (Σ = b ÷ 2c)', () => {
    expect(variante('jackson-pollock-3', 'M')?.picoDaSomaMm).toBeCloseTo(258.34, 2)
    expect(variante('jackson-pollock-3', 'F')?.picoDaSomaMm).toBeCloseTo(215.85, 2)
    expect(variante('jackson-pollock-7', 'M')?.picoDaSomaMm).toBeCloseTo(395.45, 2)
    expect(variante('jackson-pollock-7', 'F')?.picoDaSomaMm).toBeCloseTo(419.38, 2)
    expect(variante('petroski', 'M')?.picoDaSomaMm).toBeCloseTo(191.51, 2)
    expect(variante('petroski', 'F')?.picoDaSomaMm).toBeCloseTo(115.47, 2)
    expect(variante('durnin-womersley', 'M')?.picoDaSomaMm).toBeNull()
    expect(variante('guedes', 'F')?.picoDaSomaMm).toBeNull()
    expect(variante('faulkner-4', 'M')?.picoDaSomaMm).toBeNull()
  })

  it('CA-2074 (revisto, rodada 2): acima do pico não calcula e o motivo diz o pico e o que fazer', () => {
    for (const [id, sexo, soma, nome, pico] of [
      ['petroski', 'F', 116, 'Petroski', '115,5'],
      ['petroski', 'M', 192, 'Petroski', '191,5'],
      ['jackson-pollock-3', 'F', 216, 'Jackson & Pollock, 3 dobras', '215,8'],
      ['jackson-pollock-3', 'M', 259, 'Jackson & Pollock, 3 dobras', '258,3'],
    ] as const) {
      const r = calcularProtocolo(id, pacienteDe(sexo), comSoma(id, sexo, soma), { conversao: 'siri' })
      expect.soft(r.calculou, `${id} ${sexo} ${soma}`).toBe(false)
      if (!r.calculou) {
        expect.soft(r.motivo, `${id} ${sexo} ${soma}`).toBe(`${nome} só vale até ${pico} mm de soma, o pico da equação: escolha outro protocolo ou informe o % da bioimpedância.`)
      }
    }
  })

  it('CA-2088: a recusa traz a causa e o que fazer, e o motivo é as duas juntas; falta de dado não é recusa', () => {
    const r = calcularProtocolo('petroski', pacienteDe('F'), comSoma('petroski', 'F', 140))
    if (r.calculou) throw new Error('acima do pico não devia calcular')
    expect(r.recusa).toEqual({ causa: 'Petroski só vale até 115,5 mm de soma, o pico da equação', oQueFazer: 'escolha outro protocolo ou informe o % da bioimpedância' })
    const implausivel = calcularProtocolo('slaughter-triceps-subescapular', paciente('M', 12), dobras({ tricipital: 60, subescapular: 60 }))
    if (implausivel.calculou) throw new Error('implausível não devia calcular')
    expect(implausivel.recusa?.causa).toBe('o % calculado fica fora do plausível')
    expect(implausivel.motivo).toBe('O % calculado fica fora do plausível: confira as medidas ou informe o % da bioimpedância.')
    const falta = calcularProtocolo('petroski', pacienteDe('F'), dobras({ subescapular: 20 }))
    expect(!falta.calculou && falta.recusa).toBeNull()
    const gestante = calcularProtocolo('petroski', { ...pacienteDe('F'), gestante: true }, comSoma('petroski', 'F', 60))
    expect(!gestante.calculou && gestante.recusa).toBeNull()
  })

  it('CA-2074: até o pico, o % de gordura cresce com a soma', () => {
    for (const [id, sexo] of [
      ['jackson-pollock-3', 'M'],
      ['jackson-pollock-3', 'F'],
      ['jackson-pollock-7', 'M'],
      ['jackson-pollock-7', 'F'],
      ['petroski', 'M'],
      ['petroski', 'F'],
    ] as const) {
      const pico = variante(id, sexo)?.picoDaSomaMm ?? 0
      const valores: number[] = []
      for (let s = 30; s <= pico; s += 5) valores.push(pct(id, sexo, s) ?? Number.NaN)
      const crescente = valores.every((v, i) => i === 0 || v > (valores[i - 1] ?? Number.POSITIVE_INFINITY))
      expect.soft(crescente, `${id} ${sexo}`).toBe(true)
    }
  })

  it('CA-2075: fora da faixa da amostra e até o pico, calcula e avisa com a faixa', () => {
    const avisos = (id: IdProtocolo, sexo: Sexo, soma: number) => {
      const r = calcularProtocolo(id, pacienteDe(sexo), comSoma(id, sexo, soma), { conversao: 'siri' })
      if (!r.calculou) throw new Error(`não calculou: ${r.motivo}`)
      return r.avisos.join(' ')
    }
    expect(avisos('jackson-pollock-3', 'M', 13)).toMatch(/fora da faixa da amostra da equação \(14 a 118 mm\)/)
    expect(avisos('jackson-pollock-3', 'M', 119)).toMatch(/14 a 118 mm/)
    expect(avisos('jackson-pollock-3', 'M', 60)).not.toMatch(/faixa da amostra/)
    expect(avisos('jackson-pollock-7', 'M', 280)).toMatch(/32 a 272 mm/)
    expect(avisos('durnin-womersley', 'M', 220)).toMatch(/15 a 210 mm/)
    expect(avisos('petroski', 'F', 20)).toMatch(/21 a 118 mm, inferida pela faixa de cada dobra/)
    expect(avisos('guedes', 'M', 200)).not.toMatch(/faixa da amostra/)
  })
})

describe('conversão dos dois ids de hoje (spec antropometria-completa, revisão, CA-2015 e CA-2077)', () => {
  it('CA-2015: JP 3 dobras e Faulkner dão o número de calcularComposicao em toda idade, também abaixo de 20 e de 7 anos', () => {
    for (const sexo of ['M', 'F'] as const) {
      for (const idade of [6, 12, 15, 18, 19, 20, 30]) {
        const d = sexo === 'M' ? dobras({ peitoral: 12, abdominal: 25, coxa: 18 }) : dobras({ tricipital: 25, suprailiaca: 20, coxa: 25 })
        const hoje = calcularComposicao({ protocolo: 'jackson-pollock-3', sexo, idadeAnos: idade, pesoKg: 60, dobras: d })
        const novo = calcularProtocolo('jackson-pollock-3', paciente(sexo, idade, { pesoKg: 60, estaturaCm: 165 }), d)
        expect.soft(novo.calculou && naPrecisao(novo.gorduraPct, 1), `JP3 ${sexo} ${idade}`).toBe(hoje.gorduraPct)
        expect.soft(novo.calculou && novo.conversao, `JP3 ${sexo} ${idade}`).toBe('siri')
        const quatro = dobras({ tricipital: 10, subescapular: 12, suprailiaca: 14, abdominal: 16 })
        const faulknerHoje = calcularComposicao({ protocolo: 'faulkner-4', sexo, idadeAnos: idade, pesoKg: 60, dobras: quatro })
        const faulkner = calcularProtocolo('faulkner-4', paciente(sexo, idade, { pesoKg: 60 }), quatro)
        expect.soft(faulkner.calculou && naPrecisao(faulkner.gorduraPct, 1), `Faulkner ${sexo} ${idade}`).toBe(faulknerHoje.gorduraPct)
      }
    }
  })

  it('CA-2077: protocolo novo abaixo de 20 anos converte por Lohman, nomeia a conversão e avisa o degrau dos 20', () => {
    const sete = dobras({ peitoral: 10, axilarMedia: 10, tricipital: 12, subescapular: 12, abdominal: 18, suprailiaca: 12, coxa: 16 })
    const aos17 = calculado(calcularProtocolo('jackson-pollock-7', paciente('M', 17), sete))
    expect(aos17.conversao).toBe('lohman')
    expect(aos17.avisos.join(' ')).toMatch(/aos 20 anos a conta passa para Siri/)
    const dw = calculado(calcularProtocolo('durnin-womersley', paciente('F', 17), dobras({ bicipital: 8, tricipital: 14, subescapular: 12, suprailiaca: 12 })))
    expect(dw.conversao).toBe('lohman')
    const aos20 = calculado(calcularProtocolo('jackson-pollock-7', paciente('M', 20), sete))
    expect(aos20.conversao).toBe('siri')
    expect(aos20.avisos.join(' ')).not.toMatch(/aos 20 anos/)
  })

  it('CA-2077: a conversão escolhida vale também nos dois ids de hoje', () => {
    const r = calculado(calcularProtocolo('jackson-pollock-3', paciente('F', 30), dobras({ tricipital: 25, suprailiaca: 20, coxa: 25 }), { conversao: 'brozek' }))
    expect(r.conversao).toBe('brozek')
  })
})

describe('suprailíaca pela linha (spec antropometria-completa, revisão, CA-2078 e CA-2079)', () => {
  const mulher = paciente('F', 30, { pesoKg: 60, estaturaCm: 165 })
  const jp3 = (d: Partial<Dobras>) => calcularProtocolo('jackson-pollock-3', mulher, dobras({ tricipital: 25, coxa: 25, ...d }))

  it('CA-2078: JP 3 dobras usa a da linha axilar anterior, sem aviso de linha; com as duas linhas, a anterior', () => {
    const r = calculado(jp3({ suprailiacaAnt: 20 }))
    expect(r.densidade).toBeCloseTo(1.03708, 5)
    expect(r.avisos.join(' ')).not.toMatch(/linha/)
    expect(calculado(jp3({ suprailiacaAnt: 20, suprailiacaMed: 30 })).somaMm).toBe(70)
  })

  it('CA-2078: só com a de linha não informada (plano de antes), o mesmo número e o aviso', () => {
    const antes = calculado(jp3({ suprailiaca: 20 }))
    expect(antes.gorduraPct).toBe(calculado(jp3({ suprailiacaAnt: 20 })).gorduraPct)
    expect(antes.avisos.join(' ')).toMatch(/sem a linha informada.*axilar anterior/)
  })

  it('CA-2078: só com a da outra linha, calcula e avisa que pode estar deslocado; sem nenhuma, falta a da linha do protocolo', () => {
    const outra = calculado(jp3({ suprailiacaMed: 20 }))
    expect(outra.avisos.join(' ')).toMatch(/linha axilar média; o protocolo pede a da linha axilar anterior.*deslocado/)
    const nenhuma = calcularProtocolo('jackson-pollock-3', mulher, dobras({ tricipital: 25, coxa: 25 }))
    expect(nenhuma.calculou).toBe(false)
    if (!nenhuma.calculou) expect(nenhuma.aplicacao?.dobrasQueFaltam).toEqual(['suprailiacaAnt'])
  })

  it('CA-2078: Durnin & Womersley e Petroski usam a da linha axilar média', () => {
    const dw = calculado(calcularProtocolo('durnin-womersley', paciente('M', 35), dobras({ bicipital: 10, tricipital: 10, subescapular: 10, suprailiacaMed: 10, suprailiacaAnt: 30 }), { conversao: 'siri' }))
    expect(dw.somaMm).toBe(40)
    expect(dw.avisos.join(' ')).not.toMatch(/linha/)
    const petroski = calculado(calcularProtocolo('petroski', paciente('M', 30), dobras({ subescapular: 15, tricipital: 15, suprailiacaMed: 15, panturrilhaMedial: 15, suprailiacaAnt: 40 })))
    expect(petroski.densidade).toBeCloseTo(1.05365, 5)
  })

  it('CA-2079 (revisto, rodada 2): Guedes e Faulkner, sem linha registrada: a de linha não informada, depois a média, depois a anterior, e avisa qual', () => {
    const quatro = { tricipital: 10, subescapular: 12, abdominal: 16 }
    const semLinha = calculado(calcularProtocolo('faulkner-4', paciente('M', 24), dobras({ ...quatro, suprailiaca: 14, suprailiacaAnt: 40, suprailiacaMed: 40 })))
    expect(semLinha.gorduraPct).toBeCloseTo(13.739, 3)
    expect(semLinha.avisos.join(' ')).toMatch(/não registra a linha da suprailíaca/)
    const media = calculado(calcularProtocolo('faulkner-4', paciente('M', 24), dobras({ ...quatro, suprailiacaMed: 14, suprailiacaAnt: 40 })))
    expect(media.gorduraPct).toBeCloseTo(13.739, 3)
    expect(media.avisos.join(' ')).toMatch(/não registra a linha da suprailíaca deste protocolo: usada a da linha axilar média/)
    const guedes = calculado(calcularProtocolo('guedes', paciente('M', 22), dobras({ tricipital: 15, suprailiacaMed: 15, suprailiacaAnt: 40, abdominal: 20 })))
    expect(guedes.densidade).toBeCloseTo(1.05743, 5)
    const anterior = calculado(calcularProtocolo('guedes', paciente('M', 22), dobras({ tricipital: 15, suprailiacaAnt: 15, abdominal: 20 })))
    expect(anterior.densidade).toBeCloseTo(1.05743, 5)
    expect(anterior.avisos.join(' ')).toMatch(/usada a da linha axilar anterior/)
  })
})

describe('soma perto do pico: o resultado satura (spec antropometria-completa, rodada 2, CA-2093)', () => {
  const SATURA = /Soma perto do pico da equação \(115,5 mm\): o resultado satura, e o % quase não sobe com mais dobra\. Compare com outro protocolo\./
  const petroskiMulher = (soma: number) =>
    calculado(calcularProtocolo('petroski', paciente('F', 30, { pesoKg: 70, estaturaCm: 165 }), dobras({ subescapular: soma / 3, suprailiacaMed: soma / 3, coxa: soma / 3 })))

  it('CA-2093: Petroski mulher com Σ 104 e 114 mm calcula e avisa que satura; com 103 mm, não', () => {
    const r104 = petroskiMulher(104)
    const r114 = petroskiMulher(114)
    expect(naPrecisao(r104.gorduraPct, 2)).toBe(32.34)
    expect(naPrecisao(r114.gorduraPct, 2)).toBe(32.58)
    expect(r104.avisos.join(' ')).toMatch(SATURA)
    expect(r114.avisos.join(' ')).toMatch(SATURA)
    expect(petroskiMulher(103).avisos.join(' ')).not.toMatch(/satura/)
  })

  it('CA-2093: vale para toda quadrática com pico (JP 3 dobras no homem: 90% de 258,3 é 232,5)', () => {
    const jp3 = (soma: number) => calculado(calcularProtocolo('jackson-pollock-3', paciente('M', 30), dobras({ peitoral: soma / 3, abdominal: soma / 3, coxa: soma / 3 }))).avisos.join(' ')
    expect(jp3(233)).toMatch(/Soma perto do pico da equação \(258,3 mm\): o resultado satura/)
    expect(jp3(230)).not.toMatch(/satura/)
  })
})
