// Spec base-ampliada, CA-1727: as 5 sugestões do Cobrir antes desta spec (o `main` de 29/10/2026, só a TACO) e depois
// (base ampliada e a regra da folha crua, D-716a), no plano de exemplo da Maria e no plano vazio dela (porção automática,
// chave de ingredientes desligada). A tabela do PLAN é esta.
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

type Tabela = Readonly<Record<'ferro_mg' | 'piridoxina_mg' | 'vitamina_d_mcg' | 'calcio_mg' | 'vitamina_b12_mcg' | 'folato_dfe_mcg', readonly string[]>>

/** Antes: o Cobrir do `main` (5842846), só a TACO, sem a regra da folha crua. Registro, não muda mais. */
const ANTES_EXEMPLO: Tabela = {
  ferro_mg: ['Alface, roxa, crua', 'Pão, glúten, forma', 'Soja, queijo (tofu)', 'Carne, bovina, maminha, grelhada', 'Estrogonofe de carne'],
  piridoxina_mg: ['Aipo, cru', 'Pão, de soja', 'Banana, pacova, crua', 'Salada, de legumes, cozida no vapor', 'Carne, bovina, maminha, grelhada'],
  vitamina_d_mcg: ['Salmão, filé, com pele, fresco,  grelhado', 'Salmão, sem pele, fresco, grelhado', 'Atum, conserva em óleo', 'Ovo, de galinha, gema, cozida/10minutos', 'Porco, lombo, assado'],
  calcio_mg: ['Rúcula, crua', 'Iogurte, natural, desnatado', 'Sardinha, assada', 'Soja, queijo (tofu)', 'Laranja, da terra, crua'],
  vitamina_b12_mcg: [],
  folato_dfe_mcg: [],
}
const ANTES_VAZIO: Tabela = {
  ferro_mg: ['Agrião, cru', 'Pão, glúten, forma', 'Soja, queijo (tofu)', 'Carne, bovina, maminha, grelhada', 'Estrogonofe de carne'],
  piridoxina_mg: ['Aipo, cru', 'Pão, de soja', 'Banana, pacova, crua', 'Carne, bovina, maminha, grelhada', 'Castanha-de-caju, torrada, salgada'],
  vitamina_d_mcg: ['Salmão, filé, com pele, fresco,  grelhado', 'Salmão, sem pele, fresco, grelhado', 'Atum, conserva em óleo', 'Sardinha, conserva em óleo', 'Ovo, de galinha, gema, cozida/10minutos'],
  calcio_mg: ['Leite, de vaca, desnatado, UHT', 'Quiabo, cru', 'Sardinha, assada', 'Soja, queijo (tofu)', 'Laranja, da terra, crua'],
  vitamina_b12_mcg: ['Carne, bovina, contra-filé, sem gordura, grelhado', 'Merluza, filé, assado', 'Carne, bovina, filé mingnon, sem gordura, grelhado', 'Leite, de vaca, desnatado, UHT', 'Ovo, de galinha, inteiro, cozido/10minutos'],
  folato_dfe_mcg: ['Chicória, crua', 'Feijão, fradinho, cozido', 'Goiaba, branca, com casca, crua', 'Pão, glúten, forma', 'Ovo, de galinha, gema, cozida/10minutos'],
}

const DEPOIS_EXEMPLO: Tabela = {
  ferro_mg: ['Espinafre, cozido', 'Feijão, branco, cozido', 'Pão, glúten, forma', 'Carne, bovina, coxão mole, sem gordura, grelhado', 'Atum, em conserva em água'],
  piridoxina_mg: ['Espinafre, Nova Zelândia, cozido', 'Carne, bovina, coxão mole, sem gordura, grelhado', 'Atum, em conserva em água', 'Ervilha, fresca, cozida', 'Pão, de soja'],
  vitamina_d_mcg: ['Truta, grelhada', 'Salmão, filé, com pele, fresco,  grelhado', 'Salmão, sem pele, fresco, grelhado', 'Ovo, de galinha, gema, cozida/10minutos', 'Porco, lombo, assado'],
  calcio_mg: ['Rúcula, crua', 'Iogurte, natural, desnatado', 'Sardinha, assada', 'Tofu, firme', 'Chia, semente'],
  vitamina_b12_mcg: [],
  folato_dfe_mcg: [],
}
const DEPOIS_VAZIO: Tabela = {
  ferro_mg: ['Espinafre, cozido', 'Feijão, branco, cozido', 'Pão, glúten, forma', 'Carne, bovina, coxão mole, sem gordura, grelhado', 'Atum, em conserva em água'],
  piridoxina_mg: ['Espinafre, Nova Zelândia, cozido', 'Carne, bovina, coxão mole, sem gordura, grelhado', 'Atum, em conserva em água', 'Ervilha, fresca, cozida', 'Pão, de soja'],
  vitamina_d_mcg: ['Truta, grelhada', 'Salmão, filé, com pele, fresco,  grelhado', 'Salmão, sem pele, fresco, grelhado', 'Linguado, filé, grelhado', 'Ovo, de galinha, gema, cozida/10minutos'],
  calcio_mg: ['Espinafre, cozido', 'Leite, de vaca, desnatado, UHT', 'Sardinha, assada', 'Tofu, firme', 'Chia, semente'],
  vitamina_b12_mcg: ['Polaca-do-alasca, filé, grelhada', 'Atum, em conserva em água', 'Carne, bovina, contra-filé, sem gordura, grelhado', 'Leite, de vaca, desnatado, UHT', 'Ovo, de galinha, inteiro, cozido/10minutos'],
  folato_dfe_mcg: ['Espinafre, cozido', 'Feijão, fradinho, cozido', 'Goiaba, branca, com casca, crua', 'Pão, glúten, forma', 'Ovo, de galinha, gema, cozida/10minutos'],
}

const CHAVES = Object.keys(DEPOIS_EXEMPLO) as (keyof Tabela)[]

beforeEach(() => registrarBaseAmpliada(decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada)))
afterEach(() => registrarBaseAmpliada([]))

describe('CA-1727: o Cobrir depois da base ampliada e da regra da folha crua', () => {
  it.each(CHAVES)('%s no exemplo', (chave) => {
    expect(sugestoes(exemplo, chave)).toEqual(DEPOIS_EXEMPLO[chave])
  })

  it.each(CHAVES)('%s no plano vazio', (chave) => {
    expect(sugestoes(VAZIO, chave)).toEqual(DEPOIS_VAZIO[chave])
  })

  it('nada estranho entrou: nenhuma sugestão nova é folha crua, aipo, pão, bebida, miúdo ou frito; a alface roxa e o aipo saíram, o pão de glúten ficou', () => {
    for (const [antes, depois] of [
      [ANTES_EXEMPLO, DEPOIS_EXEMPLO],
      [ANTES_VAZIO, DEPOIS_VAZIO],
    ] as const) {
      for (const chave of CHAVES) {
        const novas = depois[chave].filter((d) => !antes[chave].includes(d))
        for (const d of novas) expect(d, chave).not.toMatch(/, cru[ao]?$|^(Alface|Aipo|Pão|Biscoito|Chá|Café|Suco)|f[ií]gado|frit[oa]/i)
      }
    }
    expect(DEPOIS_EXEMPLO.ferro_mg).not.toContain('Alface, roxa, crua')
    expect(DEPOIS_EXEMPLO.ferro_mg).toContain('Pão, glúten, forma')
    expect(DEPOIS_EXEMPLO.piridoxina_mg).not.toContain('Aipo, cru')
  })
})
