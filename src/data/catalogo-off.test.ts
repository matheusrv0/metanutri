// Spec base-ampliada, fase 2: CA-1750 a CA-1754 e CB-757. O script do catálogo de rótulos e os arquivos que ele publica.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { alergenicosDoRegistro, CHAVES_DO_CATALOGO, colunasQueFaltam, EH_PO, energiaIncoerente, montarCatalogo, porCem, produtoDoRegistro, type RegistroOff } from '../../scripts/dados/importar-catalogo-off.mjs'
import { produtoDosDados } from '../domain/alimentoProprio.ts'
import { dadosDaCopia, decodificarFatia, decodificarIndice, fatiaDoCodigo, rotuloDoCatalogo, type ArquivoFatia, type ArquivoIndice } from '../domain/catalogoOff.ts'
import { nutrientesPor100 } from '../domain/codigoBarras.ts'
import { energiaIncoerente as energiaIncoerenteDoApp, produtoComoAlimento, type Produto } from '../domain/produtos.ts'
import { montarRestricoes, restricaoDoAlimento } from '../domain/restricoes.ts'
import fonte from './catalogo-off-fonte.json'
import tabelaDoOff from './off-nutrientes.json'

/** Uma linha do CSV do OFF, só com o que o teste diz; o resto vazio, como no arquivo. */
const registro = (r: Partial<Record<string, string>>): RegistroOff => ({
  code: '7891000100103',
  product_name: 'Iogurte natural',
  brands: 'Marca A,Marca B',
  countries_tags: 'en:brazil',
  quantity: '170 g',
  serving_size: '170 g',
  serving_quantity: '170',
  'energy-kcal_100g': '60',
  proteins_100g: '4',
  fat_100g: '3',
  carbohydrates_100g: '5',
  ...r,
})

describe('CA-1752 (D-751): a conversão é a mesma da leitura ao vivo', () => {
  it.each([
    ['tudo presente', registro({ 'calcium_100g': '0.12', 'vitamin-d_100g': '0.0000025', sodium_100g: '0.05' })],
    ['kJ sem kcal', registro({ 'energy-kcal_100g': '', energy_100g: '251' })],
    ['sal sem sódio', registro({ salt_100g: '0.5' })],
    ['texto e negativo', registro({ fiber_100g: 'traços', 'iron_100g': '-1' })],
  ])('%s', (_caso, r) => {
    const app = nutrientesPor100(r)
    const script = porCem(r)
    for (const chave of CHAVES_DO_CATALOGO) expect(script[chave] ?? null, chave).toEqual(app[chave as keyof typeof app] ?? null)
  })

  it('a energia incoerente é a regra de Meus alimentos (D-384)', () => {
    for (const v of [
      { energia_kcal: 60, proteina_g: 4, lipideos_g: 3, carboidrato_g: 5 },
      { energia_kcal: 600, proteina_g: 4, lipideos_g: 3, carboidrato_g: 5 },
      { energia_kcal: 100, proteina_g: 25, lipideos_g: 0, carboidrato_g: 0 },
      { energia_kcal: 10, proteina_g: null, lipideos_g: 3, carboidrato_g: 5 },
    ]) expect(energiaIncoerente(v), JSON.stringify(v)).toBe(energiaIncoerenteDoApp(v))
  })
})

describe('CA-1750 e CA-1751 (D-752): a peneira', () => {
  it('fica o produto do Brasil com código, nome, energia e macros coerentes; a marca é a primeira; a porção vira gramas', () => {
    const p = produtoDoRegistro(registro({}))
    expect(p).toMatchObject({ codigo: '7891000100103', nome: 'Iogurte natural', marca: 'Marca A', porcaoG: 170, porcaoTexto: '170 g', unidade: 'g' })
  })

  it.each([
    ['de outro país', { countries_tags: 'en:france' }, 'país'],
    ['sem código válido', { code: '12ab' }, 'código'],
    ['sem nome', { product_name: '  ' }, 'nome'],
    ['sem energia', { 'energy-kcal_100g': '', energy_100g: '' }, 'energia'],
    ['sem proteína', { proteins_100g: '' }, 'macros'],
    ['energia incoerente', { 'energy-kcal_100g': '600' }, 'incoerente'],
    ['macro acima de 100 g', { carbohydrates_100g: '150', 'energy-kcal_100g': '650' }, 'macros'],
    ['energia acima de 900 kcal', { 'energy-kcal_100g': '950', fat_100g: '100', proteins_100g: '0', carbohydrates_100g: '0' }, 'energia'],
  ])('sai o produto %s', (_caso, r, motivo) => {
    expect(produtoDoRegistro(registro(r))).toEqual({ descartado: expect.stringContaining(motivo) })
  })

  it('o que falta ou não é número fica nulo, nunca zero; o líquido é em ml', () => {
    const p = produtoDoRegistro(registro({ fiber_100g: '', calcium_100g: 'x', quantity: '1 L', serving_size: '200 ml', serving_quantity: '200' }))
    if (!p || 'descartado' in p) throw new Error('descartado')
    expect(p.valores.fibra_g).toBeNull()
    expect(p.valores.calcio_mg).toBeNull()
    expect(p.unidade).toBe('ml')
  })

  it('CB-757: o CSV sem uma coluna necessária para dizendo qual', () => {
    expect(colunasQueFaltam(['code', 'product_name'])).toContain('countries_tags')
    const todas = [...Object.keys(registro({})), 'energy_100g', 'sodium_100g', 'salt_100g', 'product_quantity', 'categories_tags', 'allergens', 'traces_tags', 'ingredients_text', ...tabelaDoOff.map((t) => `${t.off}_100g`)]
    expect(colunasQueFaltam(todas)).toEqual([])
  })
})

describe('CA-1754: o mesmo arquivo dá a mesma saída', () => {
  it('ordena pelo código e tira o código repetido (fica o de nome mais completo)', () => {
    const registros = [registro({ code: '7890000000002' }), registro({ code: '7890000000001', product_name: 'Iogurte' }), registro({ code: '7890000000001', product_name: 'Iogurte natural integral' })]
    const a = montarCatalogo(registros)
    expect(a.produtos.map((p) => [p.codigo, p.nome])).toEqual([
      ['7890000000001', 'Iogurte natural integral'],
      ['7890000000002', 'Iogurte natural'],
    ])
    expect(JSON.stringify(montarCatalogo([...registros].reverse()))).toBe(JSON.stringify(a))
  })
})

describe('CA-1753 (D-753): os arquivos publicados', () => {
  const pasta = join(process.cwd(), 'public', fonte.caminho)
  const indice = JSON.parse(readFileSync(join(pasta, 'indice.json'), 'utf8')) as { readonly versao: string; readonly produtos: readonly (readonly unknown[])[] }

  it('o cabeçalho diz a fonte, a licença, a versão e a contagem do índice', () => {
    expect(fonte.licenca).toMatch(/ODbL/)
    expect(fonte.caminho).toBe(`catalogo-off/${fonte.versao}/`)
    expect(indice.versao).toBe(fonte.versao)
    expect(indice.produtos.length).toBe(fonte.produtos)
    expect(fonte.produtos).toBeGreaterThan(20_000)
  })

  it('as 100 fatias têm cada código do índice, na fatia dos dois últimos dígitos, com os valores na ordem das chaves', () => {
    const fatias = readdirSync(join(pasta, 'fatias')).sort()
    expect(fatias).toHaveLength(100)
    const porFatia = new Map<string, { readonly chaves: readonly string[]; readonly produtos: Record<string, readonly (number | null)[]> }>()
    for (const f of fatias) porFatia.set(f.replace('.json', ''), JSON.parse(readFileSync(join(pasta, 'fatias', f), 'utf8')))
    for (const [codigo] of indice.produtos as readonly (readonly [string])[]) {
      const fatia = porFatia.get(codigo.slice(-2))
      expect(fatia?.chaves).toEqual(CHAVES_DO_CATALOGO)
      // D-761: depois dos valores, "contém", "pode conter" e "sem informação".
      expect(fatia?.produtos[codigo], codigo).toHaveLength(CHAVES_DO_CATALOGO.length + 3)
    }
  })

  it('o aviso de licença está ao lado dos arquivos (a oferta "compartilhar igual")', () => {
    expect(existsSync(join(pasta, 'LICENCA.txt'))).toBe(true)
    expect(readFileSync(join(pasta, 'LICENCA.txt'), 'utf8')).toMatch(/Open Database License/)
  })
})

describe('D-754: a atualização mensal abre um pull request', () => {
  const caminho = join(process.cwd(), '.github', 'workflows', 'atualizar-catalogo-off.yml')

  it('roda todo mês e à mão, regenera pelo script e abre o PR para o dono revisar, sem publicar', () => {
    expect(existsSync(caminho)).toBe(true)
    const yml = readFileSync(caminho, 'utf8')
    expect(yml).toMatch(/schedule:\s*\n\s*- cron: '0 6 1 \* \*'/)
    expect(yml).toContain('workflow_dispatch:')
    expect(yml).toContain('node scripts/dados/importar-catalogo-off.mjs --baixar')
    expect(yml).toContain('gh pr create')
    expect(yml).toMatch(/pull-requests: write/)
    expect(yml).not.toMatch(/deploy|pages: write|wrangler/i)
    // Cada ação fixada pelo commit, como no publicar.yml.
    for (const uso of yml.match(/uses: .+/g) ?? []) expect(uso).toMatch(/@[0-9a-f]{40}\b/)
  })
})

describe('D-761: os alergênicos de cada produto (revisão da fase 2, achado 1)', () => {
  it('"contém" das tags do OFF e dos ingredientes; "pode conter" das traces e do trecho "pode conter"', () => {
    expect(alergenicosDoRegistro(registro({ allergens: 'en:gluten,en:milk,en:soybeans', traces_tags: 'en:eggs', ingredients_text: '' }))).toEqual({
      contem: ['trigo', 'gluten', 'leite', 'lactose', 'soja'],
      podeConter: ['ovo'],
      semInformacao: false,
    })
    expect(alergenicosDoRegistro(registro({ ingredients_text: 'Farinha de trigo enriquecida, açúcar, gordura vegetal, soro de leite em pó. PODE CONTER AMENDOIM E CASTANHAS.' }))).toEqual({
      contem: ['trigo', 'gluten', 'leite', 'lactose'],
      podeConter: ['amendoim', 'castanhas'],
      semInformacao: false,
    })
    expect(alergenicosDoRegistro(registro({ ingredients_text: '40% wheat flour, sugar, whole milk powder, oatmeal, eggs, soy lecithin' })).contem).toEqual(['trigo', 'gluten', 'leite', 'lactose', 'ovo', 'soja'])
  })

  it('o que lembra e não é: leite de coco, manteiga de cacau, óleo de soja e noz-moscada', () => {
    expect(alergenicosDoRegistro(registro({ ingredients_text: 'leite de coco, manteiga de cacau, óleo de soja, noz-moscada' })).contem).toEqual([])
  })

  it('o produto "zero lactose" com leite pega leite, não lactose', () => {
    expect(alergenicosDoRegistro(registro({ product_name: 'Leite zero lactose', allergens: 'en:milk' })).contem).toEqual(['leite'])
  })

  it('sem tags, sem traces e sem ingredientes: sem informação', () => {
    expect(alergenicosDoRegistro(registro({ allergens: '', traces_tags: '', ingredients_text: '' }))).toEqual({ contem: [], podeConter: [], semInformacao: true })
  })
})

describe('D-761: os produtos reais da revisão acusam o que o rótulo diz', () => {
  const pasta = join(process.cwd(), 'public', fonte.caminho)
  const indice = decodificarIndice(JSON.parse(readFileSync(join(pasta, 'indice.json'), 'utf8')) as ArquivoIndice)
  const marcadas = (...ids: string[]) => montarRestricoes({ marcadas: ids, texto: '', doencas: [], naoGosta: '' })
  const celiaca = montarRestricoes({ marcadas: [], texto: '', doencas: ['celiaca'], naoGosta: '' })
  /** A cópia em Meus alimentos, como a entrada rápida grava. */
  const copia = (codigo: string) => {
    const p = indice.produtos.find((x) => x.produto.codigo === codigo)?.produto
    if (!p) throw new Error(`${codigo} fora do catálogo`)
    const detalhe = decodificarFatia(JSON.parse(readFileSync(join(pasta, 'fatias', `${fatiaDoCodigo(codigo)}.json`), 'utf8')) as ArquivoFatia).get(codigo)
    if (!detalhe) throw new Error(`${codigo} fora da fatia`)
    const dados = produtoDosDados(dadosDaCopia(rotuloDoCatalogo(p, detalhe, fonte.versao)))
    return produtoComoAlimento({ ...dados, id: 900_900, criadoEm: '2026-10-29' } as Produto)
  }

  it.each([
    ['7891000352175', 'Nescau', ['leite', 'gluten', 'soja']],
    ['7891000051436', 'Passatempo', ['gluten', 'leite']],
    ['7895000318254', 'Biscoito de Polvilho Qualitá', ['leite', 'ovo']],
    ['7896004002194', 'Sucrilhos chocolate', ['gluten']],
    ['7897173049171', 'Panettone pavê', ['gluten', 'leite', 'ovo']],
    ['7896336006686', 'Paçoquita', ['amendoim']],
    ['7894321711478', 'Toddy', ['gluten', 'soja', 'leite']],
    ['5897400140307', 'Ninho Forti+', ['leite', 'lactose']],
  ])('%s (%s) acusa %j', (codigo, _nome, restricoes) => {
    const alimento = copia(codigo)
    for (const r of restricoes) expect(restricaoDoAlimento(alimento, marcadas(r)), r).not.toBeNull()
    if (restricoes.includes('gluten')) expect(restricaoDoAlimento(alimento, celiaca)).not.toBeNull()
  })
})

describe('D-761: ingredientes em espanhol', () => {
  it('"en polvo" é pó, não polvo; leche, huevo, maní e pescado contam', () => {
    expect(alergenicosDoRegistro(registro({ ingredients_text: 'azúcar, cacao en polvo, leche descremada en polvo, huevo, maní, pescado' })).contem).toEqual(['leite', 'lactose', 'ovo', 'amendoim', 'peixe'])
  })
})

describe('D-762: a porção do rótulo que não é porção sai (revisão da fase 2, achado 2)', () => {
  const porcao = (r: Partial<Record<string, string>>) => {
    const p = produtoDoRegistro(registro(r))
    if (!p || 'descartado' in p) throw new Error('descartado')
    return p.porcaoG
  }

  it('igual ou maior que a embalagem, acima de 300 g, ou molho e condimento acima de 50 g: fica só por 100 g', () => {
    expect(porcao({ product_name: 'Shoyu Light', serving_quantity: '500', product_quantity: '500', 'energy-kcal_100g': '60', proteins_100g: '6', fat_100g: '0', carbohydrates_100g: '9' })).toBeNull()
    expect(porcao({ product_name: 'Maionese verde', serving_quantity: '872', product_quantity: '', categories_tags: 'en:sauces,en:mayonnaises' })).toBeNull()
    expect(porcao({ product_name: 'Pão de queijo', serving_quantity: '1000', product_quantity: '1000' })).toBeNull()
    expect(porcao({ product_name: 'Molho de tomate', serving_quantity: '60', product_quantity: '340', categories_tags: 'en:sauces' })).toBeNull()
  })

  it('a porção de verdade fica', () => {
    expect(porcao({ serving_quantity: '170', product_quantity: '510' })).toBe(170)
    expect(porcao({ product_name: 'Ketchup', serving_quantity: '12', product_quantity: '400', categories_tags: 'en:condiments' })).toBe(12)
  })
})

describe('D-763: pó é em gramas (revisão da fase 2, achado 4)', () => {
  it.each(['Whey Protein Baunilha', 'Achocolatado em pó', 'Cappuccino Classic', 'Leite em pó integral', 'Nescau 2.0'])('"%s" com a porção em ml continua em g', (nome) => {
    const p = produtoDoRegistro(registro({ product_name: nome, quantity: '400 ml', serving_size: '200 ml', serving_quantity: '20' }))
    if (!p || 'descartado' in p) throw new Error('descartado')
    expect(p.unidade).toBe('g')
  })

  it('a bebida pronta continua em ml', () => {
    const p = produtoDoRegistro(registro({ product_name: 'Bebida láctea sabor chocolate', quantity: '200 ml', serving_size: '200 ml', serving_quantity: '200' }))
    if (!p || 'descartado' in p) throw new Error('descartado')
    expect(p.unidade).toBe('ml')
  })
})

it('D-763: a regra do pó é a mesma no script e na leitura ao vivo', () => {
  expect(readFileSync(join(process.cwd(), 'src', 'domain', 'codigoBarras.ts'), 'utf8')).toContain(`const EH_PO = ${EH_PO.toString()}`)
})

describe('D-764: genérico sem marca repetido sai (revisão da fase 2, achado 3)', () => {
  it('o sem marca com o mesmo nome e os mesmos nutrientes de outro produto sai; entre dois sem marca, fica um', () => {
    const r = montarCatalogo([
      registro({ code: '7890000000011', brands: 'Marca A' }),
      registro({ code: '7890000000028', brands: '' }),
      registro({ code: '7890000000035', brands: '', product_name: 'Arroz branco', carbohydrates_100g: '28', proteins_100g: '2.5', fat_100g: '0.2', 'energy-kcal_100g': '124' }),
      registro({ code: '7890000000042', brands: '', product_name: 'Arroz branco', carbohydrates_100g: '28', proteins_100g: '2.5', fat_100g: '0.2', 'energy-kcal_100g': '124' }),
      registro({ code: '7890000000059', brands: '', product_name: 'Arroz branco', carbohydrates_100g: '30', proteins_100g: '2.5', fat_100g: '0.2', 'energy-kcal_100g': '132' }),
    ])
    expect(r.produtos.map((p) => p.codigo)).toEqual(['7890000000011', '7890000000035', '7890000000059'])
    expect(r.descartados['genérico repetido']).toBe(2)
  })
})

it('D-765: o aviso de licença lista os endereços do índice e das 100 fatias (a oferta da ODbL)', () => {
  const aviso = readFileSync(join(process.cwd(), 'public', fonte.caminho, 'LICENCA.txt'), 'utf8')
  const base = `https://app.metanutri.com.br/${fonte.caminho}`
  expect(aviso).toContain(`${base}indice.json`)
  for (let n = 0; n < 100; n += 1) expect(aviso).toContain(`${base}fatias/${String(n).padStart(2, '0')}.json`)
})

it('D-766: o workflow testa o catálogo e confere o tamanho antes do PR, com o ramo nomeado por data e hora', () => {
  const yml = readFileSync(join(process.cwd(), '.github', 'workflows', 'atualizar-catalogo-off.yml'), 'utf8')
  const antesDoPr = yml.slice(0, yml.indexOf('gh pr create'))
  expect(antesDoPr).toContain('npm ci')
  expect(antesDoPr).toContain('npx vitest run src/data/catalogo-off.test.ts')
  expect(antesDoPr).toMatch(/du -sm public\/catalogo-off/)
  expect(antesDoPr).toContain('-gt 30')
  expect(yml).toContain('ramo="catalogo-off-$(date -u +%Y-%m-%d-%H%M)"')
})
