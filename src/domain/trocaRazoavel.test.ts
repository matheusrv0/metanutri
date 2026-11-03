// Spec busca-substitutos, D-1121 e CA-2129 (revisão independente de 03/11/2026, achado 4): a "troca razoável" das trocas
// da folha corrigida na origem. A palavra "doce", "chocolate", "bolo" e "mostarda" não corta mais o que não é doce.
import { ehPrescritivel } from './prescritivel.ts'
import { ALIMENTOS, alimentosParaSugerir, buscarAlimento } from './tabelas.ts'
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

  it('a folha passa a oferecer batata-doce entre as trocas de um acompanhamento (a intenção do papel, D-421)', () => {
    const acompanhamentos = ALIMENTOS.filter((a) => papelDe(a) === 'acompanhamento' && a.id !== BATATA_DOCE)
    const comBatataDoce = acompanhamentos.filter((a) =>
      trocasDoAlimento({ alimentoId: a.id, gramas: 150 }, { porAlimento: 50, alimentos: alimentosParaSugerir() }).some((t) => t.alimentoId === BATATA_DOCE),
    )
    expect(comBatataDoce.length).toBeGreaterThan(0)
  })
})
