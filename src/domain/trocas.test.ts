import { criarExemplo } from './exemplo.ts'
import { adicionarItem, criarPlanoPadrao } from './plano.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'
import { trocasDoAlimento, trocasDoPlano } from './trocas.ts'

const contador = () => {
  let n = 0
  return () => `t-${++n}`
}

const opcoes = { alimentos: ALIMENTOS }
const porDescricao = (descricao: string) => {
  const a = ALIMENTOS.find((x) => x.descricao === descricao)
  if (!a) throw new Error(`Alimento "${descricao}" não existe na tabela.`)
  return a
}

describe('Trocas por grupo', () => {
  it('só sugere alimento da mesma categoria', () => {
    const arroz = porDescricao('Arroz, tipo 1, cozido')
    const trocas = trocasDoAlimento({ alimentoId: arroz.id, gramas: 150 }, opcoes)
    expect(trocas.length).toBeGreaterThan(0)
    for (const t of trocas) {
      expect(buscarAlimento(t.alimentoId)?.categoria).toBe(arroz.categoria)
    }
  })

  it('a porção sugerida tem a mesma energia da original, com arredondamento de grama', () => {
    const arroz = porDescricao('Arroz, tipo 1, cozido')
    const kcalOriginal = ((arroz.nutrientes.energia_kcal ?? 0) * 150) / 100
    for (const t of trocasDoAlimento({ alimentoId: arroz.id, gramas: 150 }, opcoes)) {
      const kcalTroca = ((buscarAlimento(t.alimentoId)?.nutrientes.energia_kcal ?? 0) * t.gramas) / 100
      expect(Math.abs(kcalTroca - kcalOriginal)).toBeLessThan(kcalOriginal * 0.02 + 2)
    }
  })

  it('respeita a restrição do paciente', () => {
    const leite = porDescricao('Queijo, minas, frescal')
    const comQueijo = trocasDoAlimento({ alimentoId: leite.id, gramas: 30 }, opcoes)
    const semQueijo = trocasDoAlimento({ alimentoId: leite.id, gramas: 30 }, { ...opcoes, restricoes: ['queijo'] })
    expect(comQueijo.length).toBeGreaterThan(0)
    expect(semQueijo.every((t) => !t.descricao.toLowerCase().includes('queijo'))).toBe(true)
  })

  it('não sugere porção fora do que alguém come', () => {
    for (const a of ALIMENTOS.slice(0, 120)) {
      for (const t of trocasDoAlimento({ alimentoId: a.id, gramas: 100 }, opcoes)) {
        expect(t.gramas).toBeGreaterThanOrEqual(5)
        expect(t.gramas).toBeLessThanOrEqual(600)
      }
    }
  })

  it('alimento sem energia na tabela não gera troca', () => {
    const leite = porDescricao('Leite, de vaca, integral')
    expect(leite.nutrientes.energia_kcal).toBeNull()
    expect(trocasDoAlimento({ alimentoId: leite.id, gramas: 200 }, opcoes)).toEqual([])
  })

  it('o plano de exemplo gera lista de trocas para as refeições', () => {
    const { plano } = criarExemplo(contador(), '2026-09-16')
    const grupos = trocasDoPlano(plano, buscarAlimento, opcoes)
    expect(grupos.length).toBeGreaterThan(4)
    expect(grupos.every((g) => g.trocas.length > 0)).toBe(true)
  })

  it('alimento repetido no dia aparece uma vez, na maior porção', () => {
    const gerar = contador()
    const arroz = porDescricao('Arroz, tipo 1, cozido')
    let plano = criarPlanoPadrao(gerar)
    const almoco = plano.refeicoes.find((r) => r.nome === 'Almoço')
    const jantar = plano.refeicoes.find((r) => r.nome === 'Jantar')
    if (!almoco || !jantar) throw new Error('Plano padrão sem almoço ou jantar.')
    plano = adicionarItem(plano, almoco.id, 'principal', { alimentoId: arroz.id, gramas: 150 }, gerar)
    plano = adicionarItem(plano, jantar.id, 'principal', { alimentoId: arroz.id, gramas: 100 }, gerar)

    const grupos = trocasDoPlano(plano, buscarAlimento, opcoes)
    expect(grupos.filter((g) => g.alimentoId === arroz.id)).toHaveLength(1)
    expect(grupos[0]?.gramas).toBe(150)
  })
})
