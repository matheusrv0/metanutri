import { CHAVE_MUDANCAS, lerMudancas, registrarMudanca } from './copiaDaConta.ts'
import type { Armazenamento } from './persistencia.ts'
import { criarRepositorioProdutos, idsDeProdutoEm, produtoComoAlimento } from './produtos.ts'
import { buscarAlimento } from './tabelas.ts'
import { CHAVES_NUTRIENTES, totaisDeItens, totaisDoPlano } from './totais.ts'
import type { Alimento, Plano } from './tipos.ts'

class Memoria implements Armazenamento {
  readonly dados = new Map<string, string>()
  getItem(k: string) {
    return this.dados.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.dados.set(k, v)
  }
  removeItem(k: string) {
    this.dados.delete(k)
  }
}

const rotulo = { marca: '', porcaoG: 100, medidaCaseira: '', porPorcao: {} }

describe('id de produto (spec dados-na-nuvem, DP-21)', () => {
  it('os ids de produto citados nas marcas e lápides', () => {
    expect(idsDeProdutoEm(['produtos/900003', 'pacientes/ana', 'produtos/x', 'chave/metanutri:produtos', 'produtos/900010'])).toEqual([900003, 900010])
  })

  it('o produto novo nunca reaproveita um id excluído (com lápide) nem marcado', () => {
    const arm = new Memoria()
    arm.setItem('metanutri:produtos', JSON.stringify([{ id: 900000, nome: 'Iogurte', codigoBarras: '', criadoEm: '2026-10-08', ...rotulo }]))
    arm.setItem('metanutri:mudancas', JSON.stringify({ alterados: { 'produtos/900000': '2026-10-08' }, excluidos: { 'produtos/900005': '2026-10-08' } }))
    expect(criarRepositorioProdutos(arm).salvar({ nome: 'Granola', ...rotulo }).id).toBe(900006)
  })

  it('sem marcas, o próximo id é o de sempre', () => {
    const arm = new Memoria()
    expect(criarRepositorioProdutos(arm).salvar({ nome: 'Granola', ...rotulo }).id).toBe(900000)
  })
})

describe('D-171: salvar um produto não mexe nos outros (spec dados-na-nuvem)', () => {
  it('CA-595: editar, criar e apagar um produto só marca ele; os outros ficam como estavam guardados', () => {
    const arm = new Memoria()
    const iogurte = { id: 900000, nome: 'Iogurte', codigoBarras: '', criadoEm: '2026-10-08', ...rotulo, campoDoFuturo: true }
    const granola = { id: 900001, nome: 'Granola', codigoBarras: '', criadoEm: '2026-10-08', ...rotulo }
    arm.setItem('metanutri:produtos', JSON.stringify([iogurte, granola]))
    const observado: Armazenamento = {
      getItem: (k) => arm.getItem(k),
      setItem: (k, v) => {
        const antes = arm.getItem(k)
        arm.setItem(k, v)
        registrarMudanca(arm, k, antes, v, '2026-10-15T12:00:00.000Z')
      },
      removeItem: (k) => arm.removeItem(k),
    }
    const repo = criarRepositorioProdutos(observado)
    repo.salvar({ ...granola, nome: 'Granola caseira' })
    repo.salvar({ nome: 'Pão', ...rotulo })
    repo.excluir(900001)
    expect(lerMudancas(arm.getItem(CHAVE_MUDANCAS))).toEqual({ alterados: { 'produtos/900002': '2026-10-15T12:00:00.000Z' }, excluidos: { 'produtos/900001': '2026-10-15T12:00:00.000Z' } })
    expect((JSON.parse(arm.getItem('metanutri:produtos') ?? '[]') as { id: number }[]).find((p) => p.id === 900000)).toEqual(iogurte)
  })
})
describe('produto de rótulo e dado guardado antes do complemento do USDA (spec vitaminas-usda)', () => {
  // Guardado como o app guardava antes de 20/10/2026: só as chaves do rótulo.
  const GUARDADO = {
    id: 900000,
    codigoBarras: '',
    nome: 'Iogurte natural',
    marca: 'Marca X',
    porcaoG: 170,
    medidaCaseira: '1 pote',
    porPorcao: { energia_kcal: 110, carboidrato_g: 12, acucares_g: 10, proteina_g: 8, lipideos_g: 3, gordura_saturada_g: 2, fibra_g: 0, sodio_mg: 60, calcio_mg: 250 },
    criadoEm: '2026-09-15T12:00:00.000Z',
  }

  const produtoGuardado = (): Alimento => {
    const arm = new Memoria()
    arm.setItem('metanutri:produtos', JSON.stringify([GUARDADO]))
    const [produto] = criarRepositorioProdutos(arm).listar()
    if (!produto) throw new Error('o produto guardado não foi lido')
    return produtoComoAlimento(produto)
  }

  it('CA-951: o produto entra com todas as chaves; as que o rótulo não traz ficam nulas, nunca indefinidas', () => {
    const alimento = produtoGuardado()
    for (const chave of CHAVES_NUTRIENTES) expect(alimento.nutrientes[chave], chave).not.toBeUndefined()
    expect(alimento.nutrientes.vitamina_d_mcg).toBeNull()
    expect(alimento.nutrientes.vitamina_a_rae_mcg).toBeNull()
    expect(alimento.nutrientes.calcio_mg).toBe(147.06)
    expect(alimento.usda).toBeUndefined()
  })

  it('CA-951 e CB-304: no plano, nenhum total sai NaN e as chaves novas contam o produto como sem dado', () => {
    const alimento = produtoGuardado()
    const buscar = (id: number) => (id === alimento.id ? alimento : buscarAlimento(id))
    const t = totaisDeItens([{ id: 'a', alimentoId: alimento.id, gramas: 170 }, { id: 'b', alimentoId: 317, gramas: 100 }], buscar)
    for (const chave of CHAVES_NUTRIENTES) expect(Number.isNaN(t.nutrientes[chave].total), chave).toBe(false)
    expect(t.nutrientes.vitamina_d_mcg.total).toBeCloseTo(13.1, 6)
    expect(t.nutrientes.vitamina_d_mcg.semDado).toBe(1)
    // O salmão não tem vitamina C na TACO; o rótulo do iogurte também não traz.
    expect(t.nutrientes.vitamina_c_mg.semDado).toBe(2)
  })

  it('CA-952 e CB-305: um plano guardado no formato de antes soma as chaves novas a partir da base', () => {
    const guardado = JSON.stringify({
      refeicoes: [{ id: 'r1', nome: 'Jantar', horario: '19:00', opcoes: { principal: [{ id: 'i1', alimentoId: 488, gramas: 100 }], substituto1: [], substituto2: [] } }],
    })
    const plano = JSON.parse(guardado) as Plano
    const t = totaisDoPlano(plano, buscarAlimento)
    expect(t.nutrientes.vitamina_d_mcg.total).toBeCloseTo(2.2, 6)
    expect(t.nutrientes.vitamina_b12_mcg.total).toBeCloseTo(1.11, 6)
    expect(t.nutrientes.selenio_mcg.semDado).toBe(0)
  })
})
