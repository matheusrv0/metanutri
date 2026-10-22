// Os cuidados da fase de vida: gestação sem fígado (spec sugestoes-com-criterio, correção A, D-442).
import { calcularAdequacao, MICRONUTRIENTES_ADEQUACAO } from './adequacao.ts'
import { sugerirParaCobrir } from './cobrir.ts'
import {
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
    const sem = MICRONUTRIENTES_ADEQUACAO.flatMap((chave) => sugerirParaCobrir(chave, vazio, ad, { alimentos: ALIMENTOS, gastoEnergetico: 2400 }).sugestoes.map((s) => s.alimentoId))
    // O fígado aparece sem o cuidado (a revisão o viu na vitamina A): o teste não passa à toa.
    expect(sem.some((id) => FIGADOS.includes(id))).toBe(true)
    for (const chave of MICRONUTRIENTES_ADEQUACAO) {
      for (const incluirIngredientes of [false, true]) {
        const ids = sugerirParaCobrir(chave, vazio, ad, { alimentos: ALIMENTOS, gastoEnergetico: 2400, restricoes: gestante, incluirIngredientes }).sugestoes.map((s) => s.alimentoId)
        expect(ids.filter((id) => FIGADOS.includes(id)), chave).toEqual([])
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
