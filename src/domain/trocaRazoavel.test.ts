// Spec busca-substitutos, D-1121 e CA-2129 (revisão independente de 03/11/2026, achado 4): a "troca razoável" das trocas
// da folha corrigida na origem. A palavra "doce", "chocolate", "bolo" e "mostarda" não corta mais o que não é doce.
import arquivo from '../data/base-ampliada.json'
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from './baseAmpliada.ts'
import { TROCAS_NA_FOLHA, TROCAS_PEDIDAS_PELA_FOLHA, trocasDaFolha } from './folhaDieta.ts'
import { ehPrescritivel } from './prescritivel.ts'
import { ALIMENTOS, alimentosParaSugerir, buscarAlimento, registrarBaseAmpliada } from './tabelas.ts'
import { ehTrocaRazoavel, papelDe, trocasDoAlimento } from './trocas.ts'
import type { Alimento } from './tipos.ts'

const porId = (id: number): Alimento => {
  const a = buscarAlimento(id)
  if (!a) throw new Error(`sem o alimento ${id}`)
  return a
}

const BATATA_DOCE = 88

describe('CA-2129: a troca razoável', () => {
  it('batata-doce, caqui "chocolate", folha de mostarda e macarrão à bolonhesa não são cortados', () => {
    for (const id of [BATATA_DOCE, 89, 189, 135, 542]) expect(ehTrocaRazoavel(porId(id)), porId(id).descricao).toBe(true)
  })

  it('doce de leite, doce de abóbora, goiabada, doce em calda, chocolate e biscoito doce continuam cortados', () => {
    for (const id of [501, 500, 198, 199, 224, 176, 498, 495, 8, 16]) expect(ehTrocaRazoavel(porId(id)), porId(id).descricao).toBe(false)
  })

  it('entre os prescritíveis, a regra só corta o chocolate meio amargo (que a conduta da parceira libera no Cobrir)', () => {
    const cortados = alimentosParaSugerir()
      .filter((a) => ehPrescritivel(a) && !ehTrocaRazoavel(a))
      .map((a) => a.descricao.trim())
    expect(cortados).toEqual(['Chocolate, meio amargo'])
  })

  it('a batata-doce volta à lista longa das trocas de um acompanhamento (a intenção do papel, D-421)', () => {
    const acompanhamentos = ALIMENTOS.filter((a) => papelDe(a) === 'acompanhamento' && a.id !== BATATA_DOCE)
    const comBatataDoce = acompanhamentos.filter((a) =>
      trocasDoAlimento({ alimentoId: a.id, gramas: 150 }, { porAlimento: 50, alimentos: alimentosParaSugerir() }).some((t) => t.alimentoId === BATATA_DOCE),
    )
    expect(comBatataDoce.length).toBeGreaterThan(0)
  })
})

describe('CA-2129 (revisão rodada 2, M3): o que muda na folha de verdade', () => {
  beforeAll(() => registrarBaseAmpliada(decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada)))
  afterAll(() => registrarBaseAmpliada([]))

  /** As trocas que a folha imprime: `TROCAS_PEDIDAS_PELA_FOLHA` pedidas, `TROCAS_NA_FOLHA` mostradas, sem restrição. */
  function naFolha(alimentoId: number, gramas: number): readonly number[] {
    const base = porId(alimentoId)
    const trocas = trocasDoAlimento({ alimentoId, gramas }, { porAlimento: TROCAS_PEDIDAS_PELA_FOLHA, alimentos: alimentosParaSugerir() })
    const grupo = { alimentoId, descricao: base.descricao, gramas, medida: null, categoria: base.categoria, trocas }
    const folha = trocasDaFolha(trocas.length > 0 ? [grupo] : [], buscarAlimento)
    const ids = (folha[0]?.trocas ?? []).map((t) => t.alimentoId)
    expect(ids.length).toBeLessThanOrEqual(TROCAS_NA_FOLHA)
    return ids
  }
  const ALMEIRAO_CRU = 84
  const ATEMOIA = 174
  const TAPIOCA_COM_MANTEIGA = 551

  it('o almeirão cru oferece a folha de mostarda, a atemóia o caqui "chocolate" e a tapioca o macarrão à bolonhesa', () => {
    expect(TROCAS_PEDIDAS_PELA_FOLHA).toBe(4)
    expect(TROCAS_NA_FOLHA).toBe(2)
    expect(naFolha(ALMEIRAO_CRU, 30)).toContain(135)
    expect(naFolha(ATEMOIA, 330)).toContain(189)
    expect(naFolha(TAPIOCA_COM_MANTEIGA, 30)).toContain(542)
  })

  it('nenhum acompanhamento, de 30 a 400 g, mostra a batata-doce na folha (a batata inglesa e a mandioca vêm antes)', () => {
    const acompanhamentos = ALIMENTOS.filter((a) => papelDe(a) === 'acompanhamento' && a.id !== BATATA_DOCE)
    const onde: string[] = []
    for (const a of acompanhamentos) {
      for (let gramas = 30; gramas <= 400; gramas += 10) if (naFolha(a.id, gramas).includes(BATATA_DOCE)) onde.push(`${a.descricao} ${gramas} g`)
    }
    expect(onde).toEqual([])
  })
})
