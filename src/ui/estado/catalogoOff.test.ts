// Spec base-ampliada, fase 2: o catálogo de rótulos chega sob demanda (D-758, D-759; CA-1764, CB-750 a CB-752).
import type { ArquivoFatia, ArquivoIndice } from '@/domain/catalogoOff.ts'
import {
  carregarIndiceDoCatalogo,
  estadoDoCatalogo,
  indiceDoCatalogo,
  inscreverNoCatalogo,
  prepararCatalogoParaTeste,
  procurarRotulo,
  rotuloDoCatalogoPorCodigo,
  valoresDoProdutoDoCatalogo,
  VERSAO_DO_CATALOGO,
} from './catalogoOff.ts'

const INDICE: ArquivoIndice = {
  versao: VERSAO_DO_CATALOGO,
  campos: ['codigo', 'nome', 'marca', 'porcaoG', 'porcaoTexto', 'ml', 'kcal'],
  produtos: [['7891000100103', 'Iogurte Natural Integral', 'Nestlé', 170, '1 pote (170 g)', 0, 60]],
}
const FATIA: ArquivoFatia = { chaves: ['energia_kcal', 'proteina_g'], produtos: { '7891000100103': [60, 4] } }

/** O servidor de mentira: responde pelo caminho e conta os pedidos. */
function servidor(falhas: Partial<Record<string, number>> = {}) {
  const pedidos: string[] = []
  const restantes = { ...falhas }
  const buscar = vi.fn(async (caminho: string) => {
    pedidos.push(caminho)
    const arquivo = caminho.split('/').slice(-1)[0] ?? ''
    if ((restantes[arquivo] ?? 0) > 0) {
      restantes[arquivo] = (restantes[arquivo] ?? 0) - 1
      throw new Error('sem rede')
    }
    if (caminho.endsWith('indice.json')) return INDICE
    if (caminho.endsWith('/03.json')) return FATIA
    return { chaves: ['energia_kcal'], produtos: {} }
  })
  return { buscar, pedidos }
}

afterEach(() => prepararCatalogoParaTeste({ automatico: false }))

describe('o índice de nomes', () => {
  it('é pedido uma vez, no caminho da versão, e avisa os inscritos', async () => {
    const { buscar, pedidos } = servidor()
    prepararCatalogoParaTeste({ buscar })
    const aviso = vi.fn()
    const sair = inscreverNoCatalogo(aviso)
    expect(estadoDoCatalogo()).toBe('parado')
    await Promise.all([carregarIndiceDoCatalogo(), carregarIndiceDoCatalogo()])
    expect(pedidos).toEqual([`catalogo-off/${VERSAO_DO_CATALOGO}/indice.json`])
    expect(estadoDoCatalogo()).toBe('pronto')
    expect(indiceDoCatalogo()?.produtos).toHaveLength(1)
    expect(aviso).toHaveBeenCalled()
    sair()
  })

  it('CB-750: sem rede fica em erro, e o próximo pedido tenta de novo (o fetch não guarda a falha)', async () => {
    const { buscar } = servidor({ 'indice.json': 1 })
    prepararCatalogoParaTeste({ buscar })
    await carregarIndiceDoCatalogo()
    expect(estadoDoCatalogo()).toBe('erro')
    await carregarIndiceDoCatalogo()
    expect(estadoDoCatalogo()).toBe('pronto')
  })
})

describe('as fatias', () => {
  it('a fatia é pedida uma vez e dá os valores do produto', async () => {
    const { buscar, pedidos } = servidor()
    prepararCatalogoParaTeste({ buscar })
    await carregarIndiceDoCatalogo()
    const [iogurte] = indiceDoCatalogo()?.produtos.map((p) => p.produto) ?? []
    if (!iogurte) throw new Error('sem iogurte')
    expect(await valoresDoProdutoDoCatalogo(iogurte)).toEqual({ energia_kcal: 60, proteina_g: 4 })
    await valoresDoProdutoDoCatalogo(iogurte)
    expect(pedidos.filter((p) => p.endsWith('03.json'))).toHaveLength(1)
  })

  it('CB-751: a fatia que falha rejeita e pode ser pedida de novo; CB-752: o produto fora da fatia rejeita', async () => {
    const { buscar } = servidor({ '03.json': 1 })
    prepararCatalogoParaTeste({ buscar })
    await carregarIndiceDoCatalogo()
    const [iogurte] = indiceDoCatalogo()?.produtos.map((p) => p.produto) ?? []
    if (!iogurte) throw new Error('sem iogurte')
    await expect(valoresDoProdutoDoCatalogo(iogurte)).rejects.toThrow()
    expect(await valoresDoProdutoDoCatalogo(iogurte)).toEqual({ energia_kcal: 60, proteina_g: 4 })
    await expect(valoresDoProdutoDoCatalogo({ ...iogurte, codigo: '7891000100199' })).rejects.toThrow(/não está/)
  })
})

describe('D-759: o código de barras procura no catálogo', () => {
  it('o código do catálogo vira o rótulo, com a versão na fonte; o que não está dá nulo', async () => {
    const { buscar } = servidor()
    prepararCatalogoParaTeste({ buscar })
    const rotulo = await rotuloDoCatalogoPorCodigo('7891000100103')
    expect(rotulo).toMatchObject({ codigo: '7891000100103', nome: 'Iogurte Natural Integral', marca: 'Nestlé', por100: { energia_kcal: 60, proteina_g: 4 } })
    expect(rotulo?.fonte).toContain(VERSAO_DO_CATALOGO)
    expect(await rotuloDoCatalogoPorCodigo('7890000000000')).toBeNull()
  })
})

describe('D-759 e CA-1762: no cadastro, o código procura primeiro no catálogo', () => {
  const aoVivoAchou = () => vi.fn(() => Promise.resolve({ codigo: '7890000000000', nome: 'Ao vivo', marca: '', por100: {}, porcao: null, unidade: 'g' as const, fonte: 'Open Food Facts' }))

  it('achado no catálogo, o OFF ao vivo não é chamado', async () => {
    prepararCatalogoParaTeste({ buscar: servidor().buscar })
    const aoVivo = aoVivoAchou()
    expect((await procurarRotulo('7891000100103', aoVivo))?.nome).toBe('Iogurte Natural Integral')
    expect(aoVivo).not.toHaveBeenCalled()
  })

  it('fora do catálogo, ou com o catálogo sem rede ou com arquivo estragado, o OFF ao vivo é chamado como hoje', async () => {
    prepararCatalogoParaTeste({ buscar: servidor().buscar })
    const aoVivo = aoVivoAchou()
    expect((await procurarRotulo('7890000000000', aoVivo))?.nome).toBe('Ao vivo')
    prepararCatalogoParaTeste({ buscar: servidor({ 'indice.json': 1 }).buscar })
    expect((await procurarRotulo('7891000100103', aoVivo))?.nome).toBe('Ao vivo')
    prepararCatalogoParaTeste({ buscar: () => Promise.resolve({ estragado: true }) })
    expect((await procurarRotulo('7891000100103', aoVivo))?.nome).toBe('Ao vivo')
    expect(aoVivo).toHaveBeenCalledTimes(3)
  })
})
