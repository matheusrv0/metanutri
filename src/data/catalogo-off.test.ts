// Spec base-ampliada, fase 2: CA-1750 a CA-1754 e CB-757. O script do catálogo de rótulos e os arquivos que ele publica.
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { CHAVES_DO_CATALOGO, colunasQueFaltam, energiaIncoerente, montarCatalogo, porCem, produtoDoRegistro, type RegistroOff } from '../../scripts/dados/importar-catalogo-off.mjs'
import { nutrientesPor100 } from '../domain/codigoBarras.ts'
import { energiaIncoerente as energiaIncoerenteDoApp } from '../domain/produtos.ts'
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
    const todas = [...Object.keys(registro({})), 'energy_100g', 'sodium_100g', 'salt_100g', ...tabelaDoOff.map((t) => `${t.off}_100g`)]
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
      expect(fatia?.produtos[codigo], codigo).toHaveLength(CHAVES_DO_CATALOGO.length)
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
