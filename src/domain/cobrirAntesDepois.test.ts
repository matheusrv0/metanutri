// Spec base-ampliada, CA-1727: as 5 sugestões do Cobrir antes e depois da base ampliada, no plano de exemplo da Maria
// (porção automática, chave de ingredientes desligada). A tabela do PLAN é esta.
import arquivo from '../data/base-ampliada.json'
import { calcularAdequacao } from './adequacao.ts'
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from './baseAmpliada.ts'
import { sugerirParaCobrir } from './cobrir.ts'
import { criarExemplo } from './exemplo.ts'
import { alimentosParaSugerir, buscarAlimento, registrarBaseAmpliada } from './tabelas.ts'
import { totaisDoPlano } from './totais.ts'
import type { ChaveNutrienteAlimento, Plano } from './tipos.ts'

let n = 0
const { caso, plano: exemplo } = criarExemplo(() => `ex-${++n}`, '2026-10-29')
const VAZIO: Plano = { refeicoes: [] }

function sugestoes(plano: Plano, chave: ChaveNutrienteAlimento): readonly string[] {
  const totais = totaisDoPlano(plano, buscarAlimento)
  const ad = calcularAdequacao(totais, caso, caso.adequacao.preset)
  return sugerirParaCobrir(chave, totais, ad, { gastoEnergetico: 1620, alimentos: alimentosParaSugerir() }).sugestoes.map((s) => s.descricao.trim())
}

const ANTES: Readonly<Partial<Record<ChaveNutrienteAlimento, readonly string[]>>> = {
  ferro_mg: ['Alface, roxa, crua', 'Pão, glúten, forma', 'Soja, queijo (tofu)', 'Carne, bovina, maminha, grelhada', 'Estrogonofe de carne'],
  piridoxina_mg: ['Aipo, cru', 'Pão, de soja', 'Banana, pacova, crua', 'Salada, de legumes, cozida no vapor', 'Carne, bovina, maminha, grelhada'],
  vitamina_d_mcg: ['Salmão, filé, com pele, fresco,  grelhado', 'Salmão, sem pele, fresco, grelhado', 'Atum, conserva em óleo', 'Ovo, de galinha, gema, cozida/10minutos', 'Porco, lombo, assado'],
  calcio_mg: ['Rúcula, crua', 'Iogurte, natural, desnatado', 'Sardinha, assada', 'Soja, queijo (tofu)', 'Laranja, da terra, crua'],
  vitamina_b12_mcg: [],
  folato_dfe_mcg: [],
}

const DEPOIS: typeof ANTES = {
  ferro_mg: ['Alface, roxa, crua', 'Feijão, branco, cozido', 'Pão, glúten, forma', 'Carne, bovina, coxão mole, sem gordura, grelhado', 'Atum, em conserva em água'],
  piridoxina_mg: ['Espinafre, Nova Zelândia, cozido', 'Carne, bovina, coxão mole, sem gordura, grelhado', 'Atum, em conserva em água', 'Ervilha, fresca, cozida', 'Pão, de soja'],
  vitamina_d_mcg: ['Truta, grelhada', 'Salmão, filé, com pele, fresco,  grelhado', 'Salmão, sem pele, fresco, grelhado', 'Ovo, de galinha, gema, cozida/10minutos', 'Porco, lombo, assado'],
  calcio_mg: ['Rúcula, crua', 'Iogurte, natural, desnatado', 'Sardinha, assada', 'Tofu, firme', 'Chia, semente'],
  vitamina_b12_mcg: [],
  folato_dfe_mcg: [],
}

afterEach(() => registrarBaseAmpliada([]))

describe('CA-1727: antes e depois do Cobrir no plano de exemplo', () => {
  const chaves = Object.keys(ANTES) as ChaveNutrienteAlimento[]

  it.each(chaves)('%s antes (só a TACO)', (chave) => {
    expect(sugestoes(exemplo, chave)).toEqual(ANTES[chave])
  })

  it.each(chaves)('%s depois (com a base ampliada)', (chave) => {
    registrarBaseAmpliada(decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada))
    expect(sugestoes(exemplo, chave)).toEqual(DEPOIS[chave])
  })

  it('nenhuma sugestão nova é alface, aipo, pão ou bebida; o aipo sai da B6', () => {
    registrarBaseAmpliada(decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada))
    for (const chave of chaves) {
      const novas = (DEPOIS[chave] ?? []).filter((d) => !(ANTES[chave] ?? []).includes(d))
      for (const d of novas) expect(d, chave).not.toMatch(/^(Alface|Aipo|Pão|Biscoito|Chá|Café|Suco)|suco/i)
    }
    expect(sugestoes(exemplo, 'piridoxina_mg')).not.toContain('Aipo, cru')
  })

  it('a B12 e o folato do exemplo já estão na meta; no plano vazio, a B12 ganha peixes da base ampliada', () => {
    expect(sugestoes(VAZIO, 'vitamina_b12_mcg').slice(0, 2)).toEqual(['Carne, bovina, contra-filé, sem gordura, grelhado', 'Merluza, filé, assado'])
    registrarBaseAmpliada(decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada))
    expect(sugestoes(VAZIO, 'vitamina_b12_mcg').slice(0, 2)).toEqual(['Polaca-do-alasca, filé, grelhada', 'Atum, em conserva em água'])
    expect(sugestoes(VAZIO, 'folato_dfe_mcg')).toEqual(['Chicória, crua', 'Feijão, fradinho, cozido', 'Goiaba, branca, com casca, crua', 'Pão, glúten, forma', 'Ovo, de galinha, gema, cozida/10minutos'])
  })
})
