// Spec base-ampliada, CA-1724 a CA-1726 e CB-709: o Cobrir com a base ampliada (lista de permissão, D-716).
import arquivo from '../data/base-ampliada.json'
import { calcularAdequacao, MICRONUTRIENTES_ADEQUACAO } from './adequacao.ts'
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from './baseAmpliada.ts'
import { porcaoDoGrupo, sugerirParaCobrir } from './cobrir.ts'
import { criarExemplo } from './exemplo.ts'
import { CAFE_OU_CHA, FORMA_DE_INGREDIENTE, NUNCA_APARECE } from './naoProposto.test-utils.ts'
import { ehPrescritivel } from './prescritivel.ts'
import { alimentosParaSugerir, buscarAlimento, registrarBaseAmpliada } from './tabelas.ts'
import { totaisDeItens, totaisDoPlano } from './totais.ts'

const BASE = decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada)
const SUGERIVEIS = BASE.filter((a) => a.ampliada?.sugerivel)

beforeEach(() => registrarBaseAmpliada(BASE))
afterEach(() => registrarBaseAmpliada([]))

describe('CA-1725: cada alimento sugerível', () => {
  it.each(SUGERIVEIS.map((a) => [a.descricao, a] as const))('%s passa pela regra prescritível, tem porção de grupo e nenhum cuidado', (_nome, a) => {
    expect(ehPrescritivel(a)).toBe(true)
    expect(porcaoDoGrupo(a)).not.toBeNull()
    expect(a.descricao).not.toMatch(/f[ií]gado|(^|[\s,])rim($|[\s,])|cora[çc][ãa]o|moela|(^|[\s,])l[ií]ngua($|[\s,])|frit[oa]s?\b|^(P[ãa]o|Biscoito|Torrada|Tortilha)|espadarte|ca[çc][ãa]o|cavala-rei|peixe-batata|at[uú]m-azul/i)
    expect(a.categoria).not.toMatch(/^Bebidas|Miscel|Gorduras|Produtos açucarados|Outros alimentos/)
  })

  it('a porção de grupo das sementes é a das oleaginosas, a da quinoa e do milho verde é a do cereal cozido', () => {
    const grupo = (nome: string) => {
      const a = BASE.find((x) => x.descricao === nome)
      return a ? porcaoDoGrupo(a) : null
    }
    expect(grupo('Chia, semente')).toMatchObject({ grupo: 'Oleaginosas e sementes', maxima: 30 })
    expect(grupo('Semente, de abóbora, sem casca, crua')).toMatchObject({ grupo: 'Oleaginosas e sementes', maxima: 30 })
    expect(grupo('Quinoa, cozida')).toMatchObject({ grupo: 'Cereal e tubérculo cozidos', maxima: 150 })
    expect(grupo('Milho, verde, cozido')).toMatchObject({ grupo: 'Cereal e tubérculo cozidos', maxima: 150 })
    expect(grupo('Batata, inglesa, com casca, assada')).toMatchObject({ grupo: 'Cereal e tubérculo cozidos', maxima: 150 })
  })
})

describe('CA-1724 e CA-1726: o Cobrir do exemplo e do plano vazio, todas as linhas', () => {
  let n = 0
  const { caso, plano: exemplo } = criarExemplo(() => `ex-${++n}`, '2026-10-29')
  const cenarios = [
    ['exemplo', () => totaisDoPlano(exemplo, buscarAlimento)],
    ['plano vazio', () => totaisDeItens([], buscarAlimento)],
  ] as const
  const variacoes = cenarios.flatMap(([nome, t]) => [false, true].flatMap((incluirIngredientes) => [50, 100, 200].map((porcaoMaximaG) => ({ nome, t, incluirIngredientes, porcaoMaximaG }))))

  it.each(variacoes)('$nome, chave $incluirIngredientes, porção $porcaoMaximaG g', ({ t, incluirIngredientes, porcaoMaximaG }) => {
    const totais = t()
    const ad = calcularAdequacao(totais, caso, caso.adequacao.preset)
    for (const chave of MICRONUTRIENTES_ADEQUACAO) {
      const r = sugerirParaCobrir(chave, totais, ad, { gastoEnergetico: 1620, alimentos: alimentosParaSugerir(), incluirIngredientes, porcaoMaximaG })
      for (const s of r.sugestoes) {
        const a = buscarAlimento(s.alimentoId)
        expect(a, s.descricao).toBeDefined()
        expect(s.descricao, chave).not.toMatch(NUNCA_APARECE)
        expect(s.descricao, chave).not.toMatch(CAFE_OU_CHA)
        if (!incluirIngredientes) expect(s.descricao, chave).not.toMatch(FORMA_DE_INGREDIENTE)
        if (!a?.ampliada) continue
        expect(a.ampliada.sugerivel, s.descricao).toBe(true)
        expect(ehPrescritivel(a, { incluirIngredientes }), s.descricao).toBe(true)
        expect(s.gramas, s.descricao).toBeLessThanOrEqual(porcaoDoGrupo(a)?.maxima ?? 0)
        expect(s.gramas, s.descricao).toBeLessThanOrEqual(porcaoMaximaG)
      }
    }
  })

  it('CB-709: sem a base registrada, o Cobrir sugere só da TACO', () => {
    registrarBaseAmpliada([])
    const totais = totaisDoPlano(exemplo, buscarAlimento)
    const ad = calcularAdequacao(totais, caso, caso.adequacao.preset)
    const r = sugerirParaCobrir('ferro_mg', totais, ad, { gastoEnergetico: 1620, alimentos: alimentosParaSugerir() })
    expect(r.sugestoes.length).toBeGreaterThan(0)
    expect(r.sugestoes.every((s) => s.alimentoId <= 597)).toBe(true)
  })
})
