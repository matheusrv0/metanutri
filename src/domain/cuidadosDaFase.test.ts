// Os cuidados da fase de vida: gestação sem fígado e criança sem cafeína (spec sugestoes-com-criterio, correção A,
// D-442 e D-443).
import { calcularAdequacao, MICRONUTRIENTES_ADEQUACAO } from './adequacao.ts'
import { sugerirParaCobrir } from './cobrir.ts'
import {
  AVISO_CRIANCA_CAFEINA,
  AVISO_GESTACAO_FIGADO,
  comCuidadosDaFase,
  cuidadosDaFase,
  montarRestricoes,
  restricaoDoAlimento,
  restricaoDoItem,
  SEM_RESTRICOES,
} from './restricoes.ts'
import { ALIMENTOS, buscarAlimento } from './tabelas.ts'
import { totaisDeItens } from './totais.ts'
import { trocasDoAlimento } from './trocas.ts'
import type { CondicaoFisiologica } from './tipos.ts'

const GESTANTE: CondicaoFisiologica = { tipo: 'gestante', semanasGestacao: 24, pesoPreGestacionalKg: 60 }
const NENHUMA: CondicaoFisiologica = { tipo: 'nenhuma' }
const FIGADOS = [355, 356, 400, 548] // fígado de boi cru e grelhado, fígado de frango cru, sarapatel
const CAFEINA = [471, 476, 477, 480, 481, 511, 512] // café infusão, chá-mate, chá preto, refrigerante de cola e de guaraná, café em pó, capuccino
const CHA_DE_ERVA_DOCE = 475
const vazio = totaisDeItens([], buscarAlimento)
const alimento = (id: number) => {
  const a = buscarAlimento(id)
  if (!a) throw new Error(`alimento ${id} não existe`)
  return a
}

describe('gestação sem fígado (D-442)', () => {
  const gestante = comCuidadosDaFase(SEM_RESTRICOES, { condicao: GESTANTE, idadeAnos: 28 })
  const perfil = { sexo: 'F' as const, idadeAnos: 28, condicao: GESTANTE }

  it('o cuidado vem da condição do plano; sem gestação, nada', () => {
    expect(cuidadosDaFase({ condicao: GESTANTE, idadeAnos: 28 }).map((c) => c.id)).toEqual(['gestacao-figado'])
    expect(cuidadosDaFase({ condicao: NENHUMA, idadeAnos: 28 })).toEqual([])
    expect(cuidadosDaFase({ condicao: { tipo: 'lactante', mesesPosParto: 3 }, idadeAnos: 28 })).toEqual([])
  })

  it('CA-1250: o Cobrir, em todas as linhas da adequação, não traz fígado nem sarapatel', () => {
    const ad = calcularAdequacao(vazio, perfil, { tipo: 'individual' })
    // Desde a correção C (D-471), o fígado só cabe no limite da vitamina A pelo de frango cru, com a chave ligada, e
    // perde a frente para os de uso comum: a base só de fígados mostra que ele apareceria sem o cuidado.
    const soFigados = FIGADOS.map(alimento)
    const sem = MICRONUTRIENTES_ADEQUACAO.flatMap((chave) =>
      sugerirParaCobrir(chave, vazio, ad, { alimentos: soFigados, gastoEnergetico: 2400, incluirIngredientes: true }).sugestoes.map((s) => s.alimentoId),
    )
    // O fígado aparece sem o cuidado (a revisão o viu na vitamina A): o teste não passa à toa.
    expect(sem.some((id) => FIGADOS.includes(id))).toBe(true)
    for (const chave of MICRONUTRIENTES_ADEQUACAO) {
      for (const alimentos of [ALIMENTOS, soFigados]) {
        for (const incluirIngredientes of [false, true]) {
          const ids = sugerirParaCobrir(chave, vazio, ad, { alimentos, gastoEnergetico: 2400, restricoes: gestante, incluirIngredientes }).sugestoes.map((s) => s.alimentoId)
          expect(ids.filter((id) => FIGADOS.includes(id)), chave).toEqual([])
        }
      }
    }
  })

  it('CA-1250: o Cobrir da vitamina A da gestante começa por fonte vegetal (carotenoides)', () => {
    const ad = calcularAdequacao(vazio, perfil, { tipo: 'individual' })
    const r = sugerirParaCobrir('vitamina_a_rae_mcg', vazio, ad, { alimentos: ALIMENTOS, gastoEnergetico: 2400, restricoes: gestante })
    const animal = new Set(['Carnes e derivados', 'Pescados e frutos do mar', 'Ovos e derivados', 'Leite e derivados'])
    const categorias = r.sugestoes.map((s) => alimento(s.alimentoId).categoria)
    expect(categorias.length).toBeGreaterThan(0)
    expect(animal.has(categorias[0] ?? '')).toBe(false)
    const primeiroAnimal = categorias.findIndex((c) => animal.has(c))
    if (primeiroAnimal >= 0) expect(categorias.slice(primeiroAnimal).every((c) => animal.has(c))).toBe(true)
  })

  it('CA-1250: as trocas de nenhum alimento oferecem fígado à gestante', () => {
    for (const a of ALIMENTOS) {
      const ids = trocasDoAlimento({ alimentoId: a.id, gramas: 100 }, { alimentos: ALIMENTOS, restricoes: gestante, porAlimento: 4 }).map((t) => t.alimentoId)
      expect(ids.filter((id) => FIGADOS.includes(id)), a.descricao).toEqual([])
    }
  })

  it('CA-1251 e CB-408: a linha com fígado avisa; o alimento próprio com "fígado" no nome também', () => {
    expect(restricaoDoItem({ id: 'i', alimentoId: 356, gramas: 100 }, buscarAlimento, gestante)).toBe(AVISO_GESTACAO_FIGADO)
    expect(AVISO_GESTACAO_FIGADO).toBe('Na gestação, evite fígado: o excesso de vitamina A (retinol) faz mal ao bebê.')
    expect(restricaoDoAlimento({ id: 900_001, descricao: 'Patê de fígado da casa' }, gestante)).toBe(AVISO_GESTACAO_FIGADO)
    // Coração, língua e bucho não concentram retinol.
    for (const id of [394, 395, 365, 332]) expect(restricaoDoAlimento(alimento(id), gestante), alimento(id).descricao).toBeNull()
  })

  it('CB-409: com uma restrição marcada também, o cuidado da fase vem primeiro na linha', () => {
    const ambas = comCuidadosDaFase(montarRestricoes({ marcadas: [], texto: 'fígado', doencas: [], naoGosta: '' }), { condicao: GESTANTE, idadeAnos: 28 })
    expect(restricaoDoAlimento(alimento(356), ambas)).toBe(AVISO_GESTACAO_FIGADO)
  })
})

describe('criança sem cafeína (D-443)', () => {
  const crianca = comCuidadosDaFase(SEM_RESTRICOES, { condicao: NENHUMA, idadeAnos: 6 })

  it('abaixo de 12 anos; com 12 ou mais, nada; sem idade, nada (CB-406)', () => {
    expect(cuidadosDaFase({ condicao: NENHUMA, idadeAnos: 11 }).map((c) => c.id)).toEqual(['crianca-cafeina'])
    expect(cuidadosDaFase({ condicao: NENHUMA, idadeAnos: 12 })).toEqual([])
    expect(cuidadosDaFase({ condicao: NENHUMA, idadeAnos: null })).toEqual([])
  })

  it('CA-1252: café, chá preto, mate e refrigerante de cola e guaraná avisam; chá de erva-doce não', () => {
    for (const id of CAFEINA) expect(restricaoDoAlimento(alimento(id), crianca), alimento(id).descricao).toBe(AVISO_CRIANCA_CAFEINA)
    expect(restricaoDoAlimento(alimento(CHA_DE_ERVA_DOCE), crianca)).toBeNull()
    expect(AVISO_CRIANCA_CAFEINA).toBe('Café, chá preto ou mate e refrigerante com cafeína não são indicados para crianças.')
  })

  it('CA-1252: as trocas não oferecem cafeína à criança, e o Cobrir não propõe', () => {
    for (const a of ALIMENTOS) {
      const ids = trocasDoAlimento({ alimentoId: a.id, gramas: 200 }, { alimentos: ALIMENTOS, restricoes: crianca, porAlimento: 4 }).map((t) => t.alimentoId)
      expect(ids.filter((id) => CAFEINA.includes(id)), a.descricao).toEqual([])
    }
    const ad = calcularAdequacao(vazio, { sexo: 'F', idadeAnos: 6, condicao: NENHUMA }, { tipo: 'individual' })
    for (const chave of MICRONUTRIENTES_ADEQUACAO) {
      const ids = sugerirParaCobrir(chave, vazio, ad, { alimentos: ALIMENTOS, gastoEnergetico: 1300, restricoes: crianca, incluirIngredientes: true, idadeAnos: 6 }).sugestoes.map((s) => s.alimentoId)
      expect(ids.filter((id) => CAFEINA.includes(id)), chave).toEqual([])
    }
  })
})
