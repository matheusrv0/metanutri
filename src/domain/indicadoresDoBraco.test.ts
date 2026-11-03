import frisancho from '../data/frisancho.json'
import { criarCasoVazio } from './caso.ts'
import { FONTES } from './fontesAntropometria.ts'
import { faixasDoBraco, linhaAdequacao, linhaAgb, linhaAmb, linhaCb, linhaCmb, linhaDct, linhasDoBraco, medidasDoBraco, posicaoNosPercentis } from './indicadoresDoBraco.ts'
import { situacaoNaFaixa } from './linhaDoResultado.ts'
import type { Caso, MedidasCorporais, Sexo } from './tipos.ts'

const caso = (cb: number | null, dct: number | null, p: Partial<Caso> = {}, medidas: Partial<MedidasCorporais> = {}): Caso => {
  const vazio = criarCasoVazio('c')
  return {
    ...vazio,
    sexo: 'M',
    idadeAnos: 30,
    pesoKg: 80,
    estaturaCm: 178,
    ...p,
    medidasCorporais: { ...vazio.medidasCorporais, bracoRelaxadoDireitoCm: cb, ...medidas },
    composicao: { ...vazio.composicao, dobras: { ...vazio.composicao.dobras, tricipital: dct } },
  }
}
/** A linha de Frisancho 1981 da idade, em mm. */
const linha1981 = (tabela: 'cmb' | 'amb', sexo: Sexo, de: number) => frisancho.frisancho1981[tabela][sexo].find((l) => l.de === de)?.valores ?? []
const linha1990 = (tabela: 'cb' | 'dct' | 'ambCorrigida' | 'agb', sexo: Sexo, de: number) => frisancho.frisancho1990[tabela][sexo].find((l) => l.de === de)?.valores ?? []

describe('fórmulas do braço (spec antropometria-completa, CA-2040)', () => {
  it('CA-2040: CB 35 cm e DCT 13,5 mm (o caso do Dietbox), com π exato', () => {
    const h = medidasDoBraco(35, 13.5, 'M', 30)
    expect(h?.cmbCm).toBeCloseTo(30.759, 3)
    expect(h?.ambCm2).toBeCloseTo(75.289, 3)
    expect(h?.agbCm2).toBeCloseTo(22.194, 3)
    expect(h?.ambCorrigidaCm2).toBeCloseTo(65.289, 3)
    expect(medidasDoBraco(35, 13.5, 'F', 30)?.ambCorrigidaCm2).toBeCloseTo(68.789, 3)
  })

  it('D-1024: a AGB usa sempre a AMB sem correção', () => {
    const m = medidasDoBraco(35, 13.5, 'M', 30)
    expect(m?.agbCm2).toBeCloseTo((m?.areaTotalCm2 ?? 0) - (m?.ambCm2 ?? 0), 12)
    expect(m?.agbCm2).not.toBeCloseTo((m?.areaTotalCm2 ?? 0) - (m?.ambCorrigidaCm2 ?? 0), 3)
  })

  it('CB-1006: dobra tricipital grande demais para o braço → não calcula e pede para conferir', () => {
    expect(medidasDoBraco(20, 70, 'M', 30)).toBeNull()
    const l = linhaCmb(caso(20, 70))
    expect(l.valor).toBeNull()
    expect(l.avisos.join(' ')).toMatch(/Confira as medidas/)
  })
})

describe('AMB corrigida só de 18 anos em diante (spec antropometria-completa, CA-2041)', () => {
  it('CA-2041: aos 17 anos, a AMB sem correção contra Frisancho 1981; aos 18, a corrigida contra 1990', () => {
    const aos17 = linhaAmb(caso(28, 10, { idadeAnos: 17 }))
    expect(aos17.nome).toBe('Área muscular do braço (AMB)')
    expect(aos17.valor).toBeCloseTo(medidasDoBraco(28, 10, 'M', 17)?.ambCm2 ?? 0, 10)
    expect(aos17.fonte?.curta).toBe(FONTES.frisancho1981.curta)
    const aos18 = linhaAmb(caso(28, 10, { idadeAnos: 18 }))
    expect(aos18.nome).toBe('Área muscular do braço corrigida (AMBc)')
    expect(aos18.valor).toBeCloseTo(medidasDoBraco(28, 10, 'M', 18)?.ambCorrigidaCm2 ?? 0, 10)
    expect(aos18.fonte?.curta).toBe(`${FONTES.frisancho1990.curta}; ${FONTES.heymsfield1982.curta}`)
    expect(aos18.detalhes).toContainEqual({ tipo: 'numero', rotulo: 'AMB sem correção', valor: medidasDoBraco(28, 10, 'M', 18)?.ambCm2, unidade: 'cm²', casas: 2 })
  })
})

describe('percentis de Frisancho (spec antropometria-completa, CA-2042)', () => {
  it('CA-2042: homem de 30 anos, CB 35 e DCT 13,5 → AMBc entre P75 e P85 e AGB entre P50 e P75, as duas em eutrofia', () => {
    const amb = linhaAmb(caso(35, 13.5))
    expect(amb.valor).toBeCloseTo(65.289, 3)
    expect(amb.situacao).toEqual({ rotulo: 'Eutrofia', nivel: 'adequado' })
    expect(amb.recomendacao?.texto).toBe('40,9 – 70,8 cm²')
    expect(amb.detalhes).toContainEqual({ tipo: 'texto', rotulo: 'Percentil', texto: 'P75–P85' })
    const agb = linhaAgb(caso(35, 13.5))
    expect(agb.valor).toBeCloseTo(22.194, 3)
    expect(agb.situacao).toEqual({ rotulo: 'Eutrofia', nivel: 'adequado' })
    expect(agb.detalhes).toContainEqual({ tipo: 'texto', rotulo: 'Percentil', texto: 'P50–P75' })
    expect(agb.fonte?.curta).toBe(FONTES.frisancho1990.curta)
  })

  it('CA-2042 e D-1025: as fronteiras da gordura (CB, DCT, AGB) na dobra tricipital do homem de 30 anos', () => {
    const [p5, , p15, , , , p85] = linha1990('dct', 'M', 30)
    const dct = (mm: number) => linhaDct(caso(35, mm)).situacao?.rotulo
    expect(dct((p5 ?? 0) - 0.1)).toBe('Desnutrição')
    expect(dct(p5 ?? 0)).toBe('Risco para desnutrição')
    expect(dct(p15 ?? 0)).toBe('Eutrofia')
    expect(dct(p85 ?? 0)).toBe('Eutrofia')
    expect(dct((p85 ?? 0) + 0.1)).toBe('Obesidade')
    expect(linhaDct(caso(35, (p85 ?? 0) + 0.1)).situacao?.nivel).toBe('alterado')
  })

  it('CA-2042 e D-1025: as fronteiras do músculo (CMB, AMB) na CMB do homem de 30 anos (Frisancho 1981)', () => {
    const [p5, p10, , , , p90] = linha1981('cmb', 'M', 25).map((mm) => mm / 10)
    // CMB = CB − π · DCT/10: com DCT de 1 mm, a CB que dá a CMB pedida.
    const cmb = (cm: number) => linhaCmb(caso(cm + Math.PI / 10, 1)).situacao?.rotulo
    expect(cmb((p5 ?? 0) - 0.1)).toBe('Deficiência de massa magra')
    expect(cmb(p5 ?? 0)).toBe('Baixa massa magra')
    expect(cmb(p10 ?? 0)).toBe('Eutrofia')
    expect(cmb(p90 ?? 0)).toBe('Eutrofia')
    expect(cmb((p90 ?? 0) + 0.1)).toBe('Musculatura desenvolvida')
    expect(linhaCmb(caso((p90 ?? 0) + 0.1 + Math.PI / 10, 1)).situacao?.nivel).toBe('informativo')
    expect(linhaCmb(caso(30, 10)).fonte?.curta).toBe(FONTES.frisancho1981.curta)
  })

  it('faixasDoBraco e posicaoNosPercentis com uma linha qualquer', () => {
    const percentis = new Map([
      [5, 10],
      [10, 11],
      [15, 12],
      [25, 13],
      [50, 15],
      [75, 17],
      [85, 18],
      [90, 19],
      [95, 21],
    ])
    expect(situacaoNaFaixa(18, 1, faixasDoBraco('gordura', percentis))?.rotulo).toBe('Eutrofia')
    expect(situacaoNaFaixa(19, 1, faixasDoBraco('musculo', percentis))?.rotulo).toBe('Eutrofia')
    expect(posicaoNosPercentis(9, percentis)).toBe('< P5')
    expect(posicaoNosPercentis(15, percentis)).toBe('P50')
    expect(posicaoNosPercentis(16, percentis)).toBe('P50–P75')
    expect(posicaoNosPercentis(22, percentis)).toBe('> P95')
  })

  it('CB-1007: sem o braço direito, usa o esquerdo e diz o lado', () => {
    const l = linhaCb(caso(null, 13.5, {}, { bracoRelaxadoEsquerdoCm: 33 }))
    expect(l.valor).toBe(33)
    expect(l.detalhes).toContainEqual({ tipo: 'texto', rotulo: 'Lado', texto: 'esquerdo' })
  })

  it('sem braço nem dobra, cada linha diz o que falta', () => {
    expect(linhaCb(caso(null, null)).falta).toEqual([{ campo: 'medidasCorporais.bracoRelaxadoDireitoCm', nome: 'o braço relaxado' }])
    expect(linhaAmb(caso(35, null)).falta).toEqual([{ campo: 'composicao.dobras.tricipital', nome: 'a dobra tricipital' }])
  })
})

describe('adequação (spec antropometria-completa, CA-2043)', () => {
  it('CA-2043: homem de 30 anos com CB 35 cm → 107,7% (P50 32,5) → Eutrofia', () => {
    const l = linhaAdequacao(caso(35, 13.5), 'cb')
    expect(l?.valor).toBeCloseTo(107.6923, 4)
    expect(l?.situacao).toEqual({ rotulo: 'Eutrofia', nivel: 'adequado' })
    expect(l?.detalhes).toContainEqual({ tipo: 'numero', rotulo: 'P50 de referência', valor: 32.5, unidade: 'cm', casas: 1 })
  })

  it('CA-2043: as faixas de Blackburn com os sinais do UFMA', () => {
    const adequacao = (pct: number) => linhaAdequacao(caso((32.5 * pct) / 100, 13.5), 'cb')?.situacao?.rotulo
    expect(adequacao(70)).toBe('Desnutrição grave')
    expect(adequacao(70.1)).toBe('Desnutrição moderada')
    expect(adequacao(80.1)).toBe('Desnutrição leve')
    expect(adequacao(90.1)).toBe('Eutrofia')
    expect(adequacao(110.1)).toBe('Sobrepeso')
    expect(adequacao(120.1)).toBe('Obesidade')
  })

  it('CA-2043: a CMB não tem faixa de excesso (125% → Eutrofia), com o P50 de 1981', () => {
    const p50 = (linha1981('cmb', 'M', 25)[3] ?? 0) / 10
    const l = linhaAdequacao(caso(1.25 * p50 + Math.PI / 10, 1), 'cmb')
    expect(l?.valor).toBeCloseTo(125, 6)
    expect(l?.situacao?.rotulo).toBe('Eutrofia')
    expect(l?.recomendacao?.texto).toBe('Acima de 90%')
  })

  it('a adequação da DCT usa o P50 de Frisancho 1990', () => {
    const p50 = linha1990('dct', 'F', 45)[4] ?? 0
    expect(linhaAdequacao(caso(30, p50, { sexo: 'F', idadeAnos: 45 }), 'dct')?.valor).toBeCloseTo(100, 10)
  })
})

describe('idade e gestação (spec antropometria-completa, CA-2045 e CB-1002)', () => {
  it('CA-2045: de 75 anos em diante, os valores sem situação, com o aviso', () => {
    for (const l of linhasDoBraco(caso(30, 12, { idadeAnos: 80 }))) {
      expect.soft(l.situacao, l.id).toBeNull()
      expect.soft(l.avisos.join(' '), l.id).toMatch(/74,9 anos/)
    }
    expect(linhaCb(caso(30, 12, { idadeAnos: 80 })).valor).toBe(30)
  })

  it('CB-1002: na gestação, os valores sem situação', () => {
    const l = linhaCb(caso(28, 15, { sexo: 'F', idadeAnos: 30, condicao: { tipo: 'gestante', semanasGestacao: 20, pesoPreGestacionalKg: 60 } }))
    expect(l.valor).toBe(28)
    expect(l.situacao).toBeNull()
    expect(l.avisos.join(' ')).toMatch(/gestantes/)
  })

  it('as oito linhas do braço, na ordem', () => {
    expect(linhasDoBraco(caso(35, 13.5)).map((l) => l.id)).toEqual(['cb', 'dct', 'cmb', 'amb', 'agb', 'adequacao-cb', 'adequacao-dct', 'adequacao-cmb'])
  })
})

describe('critério de adultos (spec antropometria-completa, revisão, CA-2080)', () => {
  it('CA-2080: aos 17 anos, valor e percentil sem situação nem recomendação; a adequação não vem', () => {
    const adolescente = caso(28, 10, { idadeAnos: 17 })
    for (const l of [linhaCb(adolescente), linhaDct(adolescente), linhaCmb(adolescente), linhaAmb(adolescente), linhaAgb(adolescente)]) {
      expect.soft(l.valor, l.id).not.toBeNull()
      expect.soft(l.situacao, l.id).toBeNull()
      expect.soft(l.recomendacao, l.id).toBeNull()
      expect.soft(l.detalhes.some((d) => d.rotulo === 'Percentil'), l.id).toBe(true)
      expect.soft(l.avisos.join(' '), l.id).toMatch(/critério .* é de adultos/)
    }
    expect(linhaAdequacao(adolescente, 'cb')).toBeNull()
    expect(linhaAdequacao(adolescente, 'dct')).toBeNull()
    expect(linhaAdequacao(adolescente, 'cmb')).toBeNull()
    expect(linhasDoBraco(adolescente).map((l) => l.id)).toEqual(['cb', 'dct', 'cmb', 'amb', 'agb'])
  })

  it('CA-2080: aos 18, vêm todas, com a situação', () => {
    const adulto = caso(28, 10, { idadeAnos: 18 })
    expect(linhasDoBraco(adulto).map((l) => l.id)).toEqual(['cb', 'dct', 'cmb', 'amb', 'agb', 'adequacao-cb', 'adequacao-dct', 'adequacao-cmb'])
    for (const l of linhasDoBraco(adulto)) expect.soft(l.situacao, l.id).not.toBeNull()
  })
})
