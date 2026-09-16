import kac from '../../dados-brutos/antropometria/kac-2021-curvas-ganho-peso-gestacional.txt?raw'
import sisvan from '../../dados-brutos/antropometria/sisvan-norma-tecnica-2011.txt?raw'
import ref from './antropometria.json'

type Faixa = { classe: string; min: number | null; minInclusivo: boolean; max: number | null; maxInclusivo: boolean }

/** Faixas precisam cobrir a reta toda, em ordem, sem buraco nem sobreposição. */
function expectContinuas(faixas: readonly Faixa[]) {
  expect(faixas[0]?.min).toBeNull()
  expect(faixas.at(-1)?.max).toBeNull()
  for (let i = 1; i < faixas.length; i++) {
    const anterior = faixas[i - 1]
    const atual = faixas[i]
    expect(atual?.min, atual?.classe).toBe(anterior?.max)
    expect(atual?.minInclusivo, atual?.classe).toBe(!anterior?.maxInclusivo)
  }
}

const compacto = (s: string) => s.replace(/\s+/g, ' ')

describe('antropometria.json', () => {
  it('toda tabela de faixas é contínua', () => {
    const tabelas: Faixa[][] = [
      ref.imcAdulto.faixas,
      ref.imcAdulto.grausObesidade.faixas.map((f, i) => (i === 0 ? { ...f, min: null } : f)),
      ref.imcIdoso.faixas,
      ref.imcIdadeEscoreZ.menoresDe5Anos,
      ref.imcIdadeEscoreZ.de5a19Anos,
      ref.estaturaIdadeEscoreZ.faixas,
      ref.cintura.M,
      ref.cintura.F,
      ref.panturrilha.faixas,
      ref.gestacao.imcPreGestacional,
    ]
    tabelas.forEach(expectContinuas)
  })

  it('adultos: pontos de corte do Quadro 16 do SISVAN', () => {
    const texto = compacto(sisvan)
    expect(texto).toContain('Quadro 16 - Pontos de corte estabelecidos para adultos')
    expect(texto).toMatch(/< 18,5 Baixo Peso 18,5 e < 25 Adequado ou Eutrófico 25 e < 30 Sobrepeso/)
    expect(ref.imcAdulto.faixas.map((f) => f.max)).toEqual([18.5, 25, 30, null])
  })

  it('idosos: pontos de corte do Quadro 18 do SISVAN (≤ 22, > 22 e < 27, ≥ 27)', () => {
    const texto = compacto(sisvan)
    expect(texto).toContain('Quadro 18 - Pontos de corte estabelecidos para idosos')
    expect(texto).toContain('> 22 e < 27 Adequado ou Eutrófico')
    expect(texto).toContain('Fonte: (THE NUTRITION SCREENING INITIATIVE, 1994)')
    expect(ref.imcIdoso.faixas[0]).toMatchObject({ max: 22, maxInclusivo: true })
    expect(ref.imcIdoso.faixas[2]).toMatchObject({ min: 27, minInclusivo: true })
  })

  it('crianças e adolescentes: classes dos Quadros 10, 11 e 13 do SISVAN', () => {
    const texto = compacto(sisvan)
    expect(texto).toContain('Quadro 10 - Classificação do estado nutricional de crianças menores de cinco anos')
    expect(texto).toContain('Quadro 13 - Pontos de corte de IMC-para-idade estabelecidos para adolescentes')
    expect(ref.imcIdadeEscoreZ.menoresDe5Anos.map((f) => f.classe)).toEqual([
      'Magreza acentuada', 'Magreza', 'Eutrofia', 'Risco de sobrepeso', 'Sobrepeso', 'Obesidade',
    ])
    expect(ref.imcIdadeEscoreZ.de5a19Anos.map((f) => f.classe)).toEqual([
      'Magreza acentuada', 'Magreza', 'Eutrofia', 'Sobrepeso', 'Obesidade', 'Obesidade grave',
    ])
    expect(ref.estaturaIdadeEscoreZ.faixas.map((f) => f.max)).toEqual([-3, -2, null])
  })

  it('cintura: primeiro ponto de corte igual ao do Quadro 17 do SISVAN', () => {
    const texto = compacto(sisvan)
    expect(texto).toContain('80,0 cm Para Mulheres 94,0 cm Para Homens')
    expect(ref.cintura.M[1]?.min).toBe(94)
    expect(ref.cintura.F[1]?.min).toBe(80)
    expect([ref.cintura.M[2]?.min, ref.cintura.F[2]?.min]).toEqual([102, 88])
  })

  it('gestação: ganho de peso das curvas brasileiras (Kac et al., 2021)', () => {
    const texto = compacto(kac)
    expect(texto).toMatch(/BAIXO PESO \(IMC < 18,5 kg\/m2\).*?Ganho de peso recomendado até 40 semanas de gestação: 9,7 - 12,2 kg/)
    expect(texto).toMatch(/EUTROFIA .*?Ganho de peso recomendado até 40 semanas de gestação: 8 - 12 kg/)
    expect(texto).toMatch(/SOBREPESO .*?Ganho de peso recomendado até 40 semanas de gestação: 7 - 9 kg/)
    expect(texto).toMatch(/OBESIDADE .*?Ganho de peso recomendado até 40 semanas de gestação: 5 - 7,2 kg/)
    expect(texto).toContain('Am J Clin Nutr 2021;113:1351-1360')
    expect(ref.gestacao.ganhoPesoTotalAte40SemanasKg).toEqual({
      'baixo-peso': { min: 9.7, max: 12.2 },
      eutrofia: { min: 8, max: 12 },
      sobrepeso: { min: 7, max: 9 },
      obesidade: { min: 5, max: 7.2 },
    })
  })

  it('toda seção aponta para uma fonte cadastrada', () => {
    const fontes = Object.keys(ref.fontes)
    for (const f of [ref.imcAdulto.fonte, ref.imcAdulto.grausObesidade.fonte, ref.imcIdoso.fonte, ref.imcIdadeEscoreZ.fonte, ref.estaturaIdadeEscoreZ.fonte, ref.cintura.fonte, ref.panturrilha.fonte, ref.gestacao.fonte]) {
      expect(fontes).toContain(f)
    }
  })
})
