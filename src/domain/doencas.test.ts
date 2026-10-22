// Doenças e diagnósticos (spec ficha-unica, D-360, CA-1056) e o consumo da casa (D-361, CA-1058).
import { consumoPorPessoa, lerConsumo } from './consumoDaCasa.ts'
import { DOENCAS, doencasDaPessoa, textoDasDoencas } from './doencas.ts'

describe('Doenças e diagnósticos (CA-1056)', () => {
  it('tem as nove escolhas do D-360, na ordem da tela', () => {
    expect(DOENCAS.map((d) => d.rotulo)).toEqual([
      'Diabetes',
      'Hipertensão',
      'Colesterol ou triglicerídeos altos',
      'Doença renal crônica',
      'Doença celíaca',
      'Anemia',
      'Hipotireoidismo',
      'Síndrome dos ovários policísticos',
      'Esteatose hepática',
    ])
  })

  it('a síndrome dos ovários policísticos só aparece para o sexo feminino, ou marcada', () => {
    const sop = (sexo: 'F' | 'M' | null, marcadas: string[] = []) => doencasDaPessoa(sexo, marcadas).some((d) => d.id === 'sop')
    expect(sop('F')).toBe(true)
    expect(sop('M')).toBe(false)
    expect(sop(null)).toBe(false)
    expect(sop('M', ['sop'])).toBe(true)
  })

  it('o "Diagnóstico clínico" do Word junta as marcadas em frase e o texto livre', () => {
    expect(textoDasDoencas({ doencas: ['hipertensao', 'diabetes', 'anemia'], condicoesClinicas: '' })).toBe('Diabetes, hipertensão e anemia.')
    expect(textoDasDoencas({ doencas: ['hipertensao'], condicoesClinicas: 'Gastrite\nRefluxo' })).toBe('Hipertensão. Gastrite; Refluxo')
    expect(textoDasDoencas({ doencas: [], condicoesClinicas: ' Eutrofia ' })).toBe('Eutrofia')
    expect(textoDasDoencas({ doencas: ['doenca-do-futuro'], condicoesClinicas: '' })).toBe('')
  })
})

describe('Óleo, sal e açúcar por pessoa (CA-1058)', () => {
  it('divide o mês pelas pessoas e pelos 30 dias', () => {
    expect(consumoPorPessoa({ oleoL: 0.9, salKg: 1, acucarKg: 1 }, 4)).toBe('≈ 8 ml de óleo, 8 g de sal e 8 g de açúcar por pessoa por dia.')
    expect(consumoPorPessoa({ oleoL: null, salKg: 1, acucarKg: null }, 2)).toBe('≈ 17 g de sal por pessoa por dia.')
  })

  it('sem pessoas na casa ou sem nenhum número, não há conta', () => {
    expect(consumoPorPessoa({ oleoL: 0.9, salKg: 1, acucarKg: 1 }, null)).toBeNull()
    expect(consumoPorPessoa({ oleoL: null, salKg: null, acucarKg: null }, 4)).toBeNull()
  })

  it('o que não se lê vira vazio (CA-1088)', () => {
    expect(lerConsumo('muito')).toEqual({ oleoL: null, salKg: null, acucarKg: null })
    expect(lerConsumo({ oleoL: '1', salKg: -1, acucarKg: 2 })).toEqual({ oleoL: null, salKg: null, acucarKg: 2 })
  })
})
