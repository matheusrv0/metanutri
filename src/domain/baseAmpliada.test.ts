// Spec base-ampliada, CA-1715, CA-1720, CB-702 e CB-705: o alimento da base ampliada no domínio.
import arquivo from '../data/base-ampliada.json'
import { decodificarBaseAmpliada, ehDaBaseAmpliada, FONTE_BASE_AMPLIADA, planoUsaBaseAmpliada, type ArquivoBaseAmpliada } from './baseAmpliada.ts'
import { dietaDoPlano } from './dietaDoLink.ts'
import { nomeParaPaciente } from './nomeParaPaciente.ts'
import { criarPlanoPadrao } from './plano.ts'
import { alimentosComProdutos, alimentosDaBase, alimentosParaSugerir, ALIMENTOS, buscarAlimento, registrarBaseAmpliada } from './tabelas.ts'
import { CHAVES_NUTRIENTES, totaisDoPlano } from './totais.ts'
import type { Plano } from './tipos.ts'

const BASE = decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada)
const TILAPIA = 100044

/** Um plano com os itens no almoço, para os totais e o link. */
function planoCom(itens: readonly { readonly alimentoId: number; readonly gramas: number }[]): Plano {
  let n = 0
  const plano = criarPlanoPadrao(() => `id-${++n}`)
  return {
    refeicoes: plano.refeicoes.map((r, i) => (i === 0 ? { ...r, opcoes: { ...r.opcoes, principal: itens.map((x, j) => ({ id: `item-${j}`, ...x })) } } : r)),
  }
}

afterEach(() => registrarBaseAmpliada([]))

describe('decodificarBaseAmpliada', () => {
  it('monta o alimento com as 29 chaves, as medidas, a origem e o nome para o paciente', () => {
    expect(BASE).toHaveLength(arquivo.alimentos.length)
    const tilapia = BASE.find((a) => a.id === TILAPIA)
    expect(tilapia).toMatchObject({
      descricao: 'Tilápia, filé, grelhada',
      categoria: 'Pescados e frutos do mar',
      base: 'Tilápia',
      preparo: 'grelhado',
      tracos: [],
      medidas: [{ nome: 'filé', gramas: 87 }],
      ampliada: { fdcId: 175177, conjunto: 'SR Legacy', versao: '2018-04', nomeOriginal: 'Fish, tilapia, cooked, dry heat', nomeParaPaciente: 'Tilápia grelhada', sugerivel: true },
    })
    expect(Object.keys(tilapia?.nutrientes ?? {}).sort()).toEqual([...CHAVES_NUTRIENTES].sort())
    expect(tilapia?.nutrientes.energia_kcal).toBe(128)
    expect(tilapia?.nutrientes.vitamina_d_mcg).toBe(3.7)
  })

  it('o Foundation completado traz o SR com as chaves; o líquido é medido em ml', () => {
    const crua = BASE.find((a) => a.descricao === 'Tilápia, filé, crua')
    expect(crua?.ampliada?.conjunto).toBe('Foundation Foods')
    expect(crua?.ampliada?.versao).toBe('2026-10')
    expect(crua?.ampliada?.complemento).toMatchObject({ fdcId: 175176, conjunto: 'SR Legacy', versao: '2018-04' })
    expect(crua?.ampliada?.complemento?.chaves.length).toBeGreaterThan(0)
    expect(BASE.find((a) => a.descricao === 'Kefir, natural, semidesnatado')?.unidade).toBe('ml')
  })

  it('CB-702: nutriente que nenhuma das duas fontes publicou fica nulo', () => {
    expect(BASE.some((a) => Object.values(a.nutrientes).some((v) => v === null))).toBe(true)
    expect(BASE.every((a) => Object.values(a.nutrientes).every((v) => v === null || (typeof v === 'number' && v >= 0)))).toBe(true)
  })

  it('a citação e as contagens vêm do arquivo pequeno', () => {
    expect(FONTE_BASE_AMPLIADA.alimentos).toBe(BASE.length)
    expect(FONTE_BASE_AMPLIADA.fonte.baixadoEm).toBe('2026-10-29')
  })
})

describe('ids e planos', () => {
  it('a faixa da base ampliada não toca a TACO nem os alimentos próprios', () => {
    expect(ehDaBaseAmpliada(TILAPIA)).toBe(true)
    expect(ehDaBaseAmpliada(597)).toBe(false)
    expect(ehDaBaseAmpliada(900_000)).toBe(false)
    expect(BASE.every((a) => ehDaBaseAmpliada(a.id))).toBe(true)
  })

  it('o plano usa a base ampliada pelo item, pelo substituto ou pelo ingrediente da receita', () => {
    expect(planoUsaBaseAmpliada(planoCom([{ alimentoId: 3, gramas: 100 }]))).toBe(false)
    expect(planoUsaBaseAmpliada(planoCom([{ alimentoId: TILAPIA, gramas: 100 }]))).toBe(true)
    const base = planoCom([])
    const comSubstituto: Plano = {
      refeicoes: base.refeicoes.map((r, i) => (i === 1 ? { ...r, opcoes: { ...r.opcoes, substituto2: [{ id: 's', alimentoId: TILAPIA, gramas: 50 }] } } : r)),
    }
    expect(planoUsaBaseAmpliada(comSubstituto)).toBe(true)
    const comReceita: Plano = {
      refeicoes: base.refeicoes.map((r, i) =>
        i === 2
          ? {
              ...r,
              opcoes: {
                ...r.opcoes,
                principal: [
                  {
                    id: 'r',
                    alimentoId: 0,
                    gramas: 200,
                    receita: { origemId: 'x', nome: 'Moqueca', ingredientes: [{ alimentoId: TILAPIA, gramas: 300 }], porcoes: 2, nomeDaPorcao: 'porção', pesoProntoG: null, preparo: '' },
                  },
                ],
              },
            }
          : r,
      ),
    }
    expect(planoUsaBaseAmpliada(comReceita)).toBe(true)
  })
})

describe('registrarBaseAmpliada (tabelas)', () => {
  it('sem registro, as listas são as de antes e a tilápia não existe', () => {
    expect(buscarAlimento(TILAPIA)).toBeUndefined()
    expect(alimentosComProdutos()).toBe(ALIMENTOS)
    expect(alimentosParaSugerir()).toBe(ALIMENTOS)
    expect(alimentosDaBase()).toBe(ALIMENTOS)
  })

  it('registrada, a busca, a base e o Cobrir a veem; o Cobrir só com sugerivel', () => {
    registrarBaseAmpliada(BASE)
    expect(buscarAlimento(TILAPIA)?.descricao).toBe('Tilápia, filé, grelhada')
    expect(alimentosComProdutos()).toHaveLength(ALIMENTOS.length + BASE.length)
    expect(alimentosDaBase()).toHaveLength(ALIMENTOS.length + BASE.length)
    const paraSugerir = alimentosParaSugerir().filter((a) => a.ampliada)
    expect(paraSugerir.length).toBe(BASE.filter((a) => a.ampliada?.sugerivel).length)
    expect(paraSugerir.every((a) => a.ampliada?.sugerivel === true)).toBe(true)
    // A mesma lista enquanto nada muda (a busca indexa por identidade).
    expect(alimentosComProdutos()).toBe(alimentosComProdutos())
  })

  it('CA-1715: o plano guarda id e gramas, e os totais somam o alimento novo', () => {
    registrarBaseAmpliada(BASE)
    const plano = planoCom([{ alimentoId: TILAPIA, gramas: 150 }])
    const item = plano.refeicoes[0]?.opcoes.principal[0]
    expect(Object.keys(item ?? {}).sort()).toEqual(['alimentoId', 'gramas', 'id'])
    const totais = totaisDoPlano(plano, buscarAlimento)
    expect(totais.nutrientes.energia_kcal.total).toBeCloseTo(192, 5)
    expect(totais.nutrientes.vitamina_d_mcg.total).toBeCloseTo(5.55, 5)
    expect(totais.nutrientes.energia_kcal.semDado).toBe(0)
  })

  it('CB-705: o id que saiu da base é "Alimento removido" e não soma', () => {
    registrarBaseAmpliada(BASE)
    expect(buscarAlimento(199_999)).toBeUndefined()
    expect(nomeParaPaciente(buscarAlimento(199_999))).toBe('Alimento removido')
  })
})

describe('CA-1720: nome para o paciente', () => {
  it('a folha e o link usam o nome da curadoria', () => {
    registrarBaseAmpliada(BASE)
    expect(nomeParaPaciente(buscarAlimento(TILAPIA))).toBe('Tilápia grelhada')
    const dieta = dietaDoPlano({ orientacoes: '', receitas: '', quantidades: 'medida-e-gramas' }, planoCom([{ alimentoId: TILAPIA, gramas: 87 }]), buscarAlimento)
    const nomes = dieta.refeicoes.flatMap((r) => r.opcoes.flat().map((i) => i.alimento))
    expect(nomes).toContain('Tilápia grelhada')
  })
})
