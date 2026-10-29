// Spec base-ampliada, D-716d (achado 3 da revisão): verdura com muito oxalato não entra no Cobrir de cálcio, na TACO e
// na base ampliada; o cálcio dela quase não é absorvido. No ferro, no folato e no magnésio ela continua.
import arquivo from '../data/base-ampliada.json'
import { calcularAdequacao } from './adequacao.ts'
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from './baseAmpliada.ts'
import { ehAltoOxalato, sugerirParaCobrir } from './cobrir.ts'
import { criarExemplo } from './exemplo.ts'
import { alimentosParaSugerir, buscarAlimento, registrarBaseAmpliada } from './tabelas.ts'
import { totaisDoPlano } from './totais.ts'
import type { ChaveNutrienteAlimento, Plano } from './tipos.ts'

const BASE = decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada)
let n = 0
const { caso, plano: exemplo } = criarExemplo(() => `ex-${++n}`, '2026-10-29')
const VAZIO: Plano = { refeicoes: [] }

function nomes(plano: Plano, chave: ChaveNutrienteAlimento): readonly string[] {
  const totais = totaisDoPlano(plano, buscarAlimento)
  const ad = calcularAdequacao(totais, caso, caso.adequacao.preset)
  return sugerirParaCobrir(chave, totais, ad, { gastoEnergetico: 1620, alimentos: alimentosParaSugerir() }).sugestoes.map((s) => s.descricao.trim())
}

afterEach(() => registrarBaseAmpliada([]))

describe('D-716d: verdura com muito oxalato fora do Cobrir de cálcio', () => {
  it('a regra é uma só e reconhece o espinafre, a acelga suíça e a folha de beterraba das duas bases', () => {
    registrarBaseAmpliada(BASE)
    const porId = (id: number) => {
      const a = buscarAlimento(id)
      if (!a) throw new Error(`Sem ${id}.`)
      return a
    }
    for (const id of [119, 120, 100479, 100507, 100508, 100509, 100439, 100440, 100428, 100429]) expect(ehAltoOxalato(porId(id)), porId(id).descricao).toBe(true)
    // A acelga da TACO e a "acelga" da base são a couve-chinesa (magnésio de 10 mg), não a acelga suíça; a massa de
    // espinafre não é verdura; a beterraba é a raiz.
    for (const id of [74, 100434, 100365, 97]) expect(ehAltoOxalato(porId(id)), porId(id).descricao).toBe(false)
  })

  it('nenhuma sugestão de cálcio tem muito oxalato, no exemplo e no plano vazio, com e sem a base ampliada', () => {
    for (const comBase of [false, true]) {
      registrarBaseAmpliada(comBase ? BASE : [])
      for (const plano of [exemplo, VAZIO]) {
        for (const nome of nomes(plano, 'calcio_mg')) expect(nome, `${String(comBase)}: ${nome}`).not.toMatch(/^(Espinafre|Acelga, suíça|Beterraba, folha)/)
      }
    }
  })

  it('no ferro, no folato e no magnésio do plano vazio o espinafre cozido continua', () => {
    registrarBaseAmpliada(BASE)
    for (const chave of ['ferro_mg', 'folato_dfe_mcg', 'magnesio_mg'] as const) expect(nomes(VAZIO, chave), chave).toContain('Espinafre, cozido')
  })
})
