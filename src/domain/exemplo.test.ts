import { calcularEnergia } from './energia.ts'
import { criarExemplo, entradasSemAlimento, NOME_DO_EXEMPLO } from './exemplo.ts'
import { nomeParaPaciente } from './nomeParaPaciente.ts'
import { regraQueExclui } from './prescritivel.ts'
import { buscarAlimento } from './tabelas.ts'
import { totaisDoPlano } from './totais.ts'

const contador = () => {
  let n = 0
  return () => `ex-${++n}`
}

describe('Plano de exemplo', () => {
  it('todos os alimentos escritos existem na tabela', () => {
    expect(entradasSemAlimento()).toEqual([])
  })

  it('o nome diz que é exemplo', () => {
    expect(criarExemplo(contador(), '2026-09-16').caso.nome).toBe(NOME_DO_EXEMPLO)
    expect(NOME_DO_EXEMPLO.toLowerCase()).toContain('exemplo')
  })

  it('tem comida em todas as seis refeições', () => {
    const { plano } = criarExemplo(contador(), '2026-09-16')
    expect(plano.refeicoes).toHaveLength(6)
    for (const r of plano.refeicoes) {
      expect(r.opcoes.principal.length).toBeGreaterThan(0)
    }
  })

  it('o almoço traz os dois substitutos, que é o ponto do produto', () => {
    const { plano } = criarExemplo(contador(), '2026-09-16')
    const almoco = plano.refeicoes.find((r) => r.nome === 'Almoço')
    expect(almoco?.opcoes.substituto1.length).toBeGreaterThan(0)
    expect(almoco?.opcoes.substituto2.length).toBeGreaterThan(0)
  })

  it('o dia bate com o gasto calculado, entre 90% e 110%', () => {
    const { caso, plano } = criarExemplo(contador(), '2026-09-16')
    const kcal = totaisDoPlano(plano, buscarAlimento).nutrientes.energia_kcal.total
    const get = calcularEnergia(caso, { fator: caso.energia.fator }).get
    expect(get).not.toBeNull()
    const proporcao = kcal / (get ?? 1)
    expect(proporcao).toBeGreaterThan(0.9)
    expect(proporcao).toBeLessThan(1.1)
  })

  it('CA-917: nenhum item do exemplo é "nunca"; a margarina é a com óleo interesterificado e sai como "Margarina com sal"', () => {
    const { plano } = criarExemplo(contador(), '2026-10-20')
    const itens = plano.refeicoes.flatMap((r) => [...r.opcoes.principal, ...r.opcoes.substituto1, ...r.opcoes.substituto2])
    for (const item of itens) {
      const alimento = buscarAlimento(item.alimentoId)
      expect(alimento && regraQueExclui(alimento)?.nivel, alimento?.descricao).not.toBe('nunca')
    }
    const margarina = itens.map((i) => buscarAlimento(i.alimentoId)).find((a) => a?.descricao.startsWith('Margarina'))
    expect(margarina?.descricao).toBe('Margarina, com óleo interesterificado, com sal (65%de lipídeos)')
    expect(nomeParaPaciente(margarina)).toBe('Margarina com sal')
  })

  it('D-298: as orientações do exemplo não repetem a água, que a folha já traz pela conta automática', () => {
    const { caso } = criarExemplo(contador(), '2026-10-20')
    expect(caso.orientacoes).not.toMatch(/água/i)
    expect(caso.linhaDaAgua).toBeNull()
  })

  it('vem com dados completos para a avaliação funcionar', () => {
    const { caso } = criarExemplo(contador(), '2026-09-16')
    expect(caso.modo).toBe('completo')
    expect(caso.sexo).toBe('F')
    expect(caso.pesoKg).not.toBeNull()
    expect(caso.estaturaCm).not.toBeNull()
    expect(caso.dataConsulta).toBe('2026-09-16')
  })
})
