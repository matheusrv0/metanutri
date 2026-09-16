import { completudeDe, explicarCompletude, NUTRIENTES_CONFERIDOS } from './completude.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'
import type { Alimento, ChaveNutrienteAlimento } from './tipos.ts'

const alimento = (preenchidos: readonly ChaveNutrienteAlimento[], tracos: readonly ChaveNutrienteAlimento[] = []): Alimento => {
  const nutrientes = Object.fromEntries(NUTRIENTES_CONFERIDOS.map((c) => [c, preenchidos.includes(c) ? 1 : null])) as Alimento['nutrientes']
  return {
    id: 1,
    descricao: 'Teste',
    categoria: 'Teste',
    base: null,
    preparo: null,
    qualificadores: null,
    nutrientes: { ...nutrientes, acucares_g: null, gordura_saturada_g: null, colesterol_mg: null },
    tracos,
  }
}

describe('Completude do alimento', () => {
  it('tudo preenchido é completo e não explica nada', () => {
    const a = alimento(NUTRIENTES_CONFERIDOS)
    expect(completudeDe(a).nivel).toBe('completo')
    expect(explicarCompletude(a)).toBeNull()
  })

  it('traço conta como dado medido, não como falta', () => {
    const semFibra = NUTRIENTES_CONFERIDOS.filter((c) => c !== 'fibra_g')
    expect(completudeDe(alimento(semFibra, ['fibra_g'])).nivel).toBe('completo')
    expect(completudeDe(alimento(semFibra)).nivel).toBe('parcial')
  })

  it('abaixo de 70% dos nutrientes é mínimo', () => {
    const metade = NUTRIENTES_CONFERIDOS.slice(0, 10)
    expect(completudeDe(alimento(metade)).nivel).toBe('minimo')
  })

  it('aponta a falta de energia, que impede somar o dia', () => {
    const semEnergia = NUTRIENTES_CONFERIDOS.filter((c) => c !== 'energia_kcal')
    expect(completudeDe(alimento(semEnergia)).semEnergia).toBe(true)
  })

  it('a explicação diz quantos nutrientes existem e o que falta', () => {
    const texto = explicarCompletude(alimento(NUTRIENTES_CONFERIDOS.filter((c) => c !== 'vitamina_a_rae_mcg')))
    expect(texto).toContain('19 dos 20')
    expect(texto).toContain('vitamina A')
  })

  it('a base real tem alimento completo e alimento incompleto', () => {
    const niveis = new Set(ALIMENTOS.map((a) => completudeDe(a).nivel))
    expect(niveis.has('completo')).toBe(true)
    expect(niveis.size).toBeGreaterThan(1)
  })

  it('leite de vaca integral, que não tem energia na TACO, é apontado', () => {
    const leite = ALIMENTOS.find((a) => a.descricao === 'Leite, de vaca, integral')
    expect(leite).toBeDefined()
    expect(leite && completudeDe(leite).semEnergia).toBe(true)
    expect(leite && buscarAlimento(leite.id)).toBeDefined()
  })
})
