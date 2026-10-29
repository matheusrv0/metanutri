// Spec base-ampliada, D-716a e CA-1728: a folha crua só entra no Cobrir com cobertura de verdade na porção real, pela
// mesma regra na TACO e na base ampliada (rodada do coordenador, 29/10/2026).
import arquivo from '../data/base-ampliada.json'
import { calcularAdequacao, MICRONUTRIENTES_ADEQUACAO } from './adequacao.ts'
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from './baseAmpliada.ts'
import { COBERTURA_MINIMA_FOLHA_CRUA_PCT, ehFolhaCrua, sugerirParaCobrir } from './cobrir.ts'
import { criarExemplo } from './exemplo.ts'
import { alimentosParaSugerir, buscarAlimento, registrarBaseAmpliada } from './tabelas.ts'
import { totaisDoPlano } from './totais.ts'
import type { ChaveNutrienteAlimento, Plano } from './tipos.ts'

const BASE = decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada)
let n = 0
const { caso, plano: exemplo } = criarExemplo(() => `ex-${++n}`, '2026-10-29')
const VAZIO: Plano = { refeicoes: [] }

function cobrir(plano: Plano, chave: ChaveNutrienteAlimento) {
  const totais = totaisDoPlano(plano, buscarAlimento)
  const ad = calcularAdequacao(totais, caso, caso.adequacao.preset)
  return sugerirParaCobrir(chave, totais, ad, { gastoEnergetico: 1620, alimentos: alimentosParaSugerir() }).sugestoes
}

afterEach(() => registrarBaseAmpliada([]))

describe('CA-1728: folha crua com cobertura fraca fica fora do Cobrir', () => {
  it('a regra é uma só: reconhece a folha crua da TACO e a da base ampliada', () => {
    const folhaCrua = (nome: string) => {
      const a = [...alimentosParaSugerir(), ...BASE].find((x) => x.descricao.trim() === nome)
      if (!a) throw new Error(`Sem ${nome}.`)
      return ehFolhaCrua(a)
    }
    for (const nome of ['Alface, roxa, crua', 'Rúcula, crua', 'Agrião, cru', 'Chicória, crua', 'Alface, romana, crua', 'Couve, kale, crua']) expect(folhaCrua(nome), nome).toBe(true)
    for (const nome of ['Couve, kale, cozida', 'Espinafre, cozido', 'Brócolis, cozido']) expect(folhaCrua(nome), nome).toBe(false)
    expect(COBERTURA_MINIMA_FOLHA_CRUA_PCT).toBe(25)
  })

  it('o ferro do exemplo perde a alface roxa e mantém o pão de glúten, com e sem a base ampliada', () => {
    for (const comBase of [false, true]) {
      registrarBaseAmpliada(comBase ? BASE : [])
      const nomes = cobrir(exemplo, 'ferro_mg').map((s) => s.descricao.trim())
      expect(nomes, String(comBase)).not.toContain('Alface, roxa, crua')
      expect(nomes, String(comBase)).toContain('Pão, glúten, forma')
    }
  })

  it('a folha crua forte continua: a rúcula no cálcio do exemplo', () => {
    const rucula = cobrir(exemplo, 'calcio_mg').find((s) => s.descricao.trim() === 'Rúcula, crua')
    expect(rucula?.coberturaPct).toBeGreaterThanOrEqual(COBERTURA_MINIMA_FOLHA_CRUA_PCT)
  })

  it('nenhuma folha crua sugerida cobre menos que o mínimo, em nenhuma linha, no exemplo e no plano vazio, com a base', () => {
    registrarBaseAmpliada(BASE)
    for (const plano of [exemplo, VAZIO]) {
      for (const chave of MICRONUTRIENTES_ADEQUACAO) {
        for (const s of cobrir(plano, chave)) {
          const a = buscarAlimento(s.alimentoId)
          if (a && ehFolhaCrua(a)) expect(s.coberturaPct, `${chave}: ${s.descricao}`).toBeGreaterThanOrEqual(COBERTURA_MINIMA_FOLHA_CRUA_PCT)
        }
      }
    }
  })

  it('a folha crua da base ampliada volta a ser sugerível: quem decide é a regra do Cobrir', () => {
    for (const nome of ['Alface, romana, crua', 'Couve, kale, crua']) expect(BASE.find((a) => a.descricao === nome)?.ampliada?.sugerivel, nome).toBe(true)
  })
})
