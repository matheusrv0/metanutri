import pofCsv from '../../dados-brutos/pof/pof_medidas_caseiras.csv?raw'
import tabela from './alimentos.json'
import medidas from './medidas-caseiras.json'

type Registro = { pof: { codigo: string; descricao: string; preparacao: string }; medidas: { nome: string; gramas: number }[] }
const porId = medidas.alimentos as unknown as Record<string, Registro>

/** Leitura independente do CSV bruto da POF (sem usar o script de importação). */
const pof = (() => {
  const dividir = (linha: string) => {
    const campos: string[] = []
    let atual = ''
    let aspas = false
    for (const c of linha) {
      if (c === '"') aspas = !aspas
      else if (c === ',' && !aspas) {
        campos.push(atual)
        atual = ''
      } else atual += c
    }
    campos.push(atual)
    return campos
  }
  const [cab, ...linhas] = pofCsv.split(/\r?\n/).filter(Boolean)
  const h = dividir(cab ?? '')
  return linhas.map((l) => Object.fromEntries(dividir(l).map((v, i) => [h[i], v])) as Record<string, string>)
})()

const gramasNaPof = (codigo: string, preparacao: string, medida: string) =>
  Number(pof.find((r) => r['codigo_alimento'] === codigo && r['descricao_preparacao'] === preparacao && r['descricao_medida'] === medida)?.['quantidade_g'])

// [id TACO, medida exibida, medida na POF]
const CONFERIDOS: ReadonlyArray<[number, string, string]> = [
  [3, 'colher de sopa', 'COLHER DE SOPA'], // arroz tipo 1 cozido
  [3, 'colher de servir', 'COLHER DE ARROZ/SERVIR'],
  [561, 'concha', 'CONCHA'], // feijão carioca cozido
  [53, 'unidade', 'UNIDADE'], // pão francês
  [182, 'unidade', 'UNIDADE'], // banana prata
  [488, 'unidade', 'UNIDADE'], // ovo cozido
  [410, 'peito', 'PEITO'], // frango, peito, grelhado
  [396, 'coxa', 'COXA'], // frango, coxa, assada
  [7, 'colher de sopa', 'COLHER DE SOPA'], // aveia
  [458, 'copo americano', 'COPO AMERICANO'], // leite integral
  [494, 'colher de sopa', 'COLHER DE SOPA'], // açúcar refinado
  [260, 'colher de sopa', 'COLHER DE SOPA'], // azeite
  [461, 'fatia', 'FATIA'], // queijo minas frescal
  [222, 'unidade', 'UNIDADE'], // maçã fuji
  [91, 'colher de sopa', 'COLHER DE SOPA'], // batata inglesa cozida
  [326, 'colher de sopa', 'COLHER DE SOPA'], // carne moída cozida
  [377, 'bife', 'BIFE'], // patinho grelhado
  [157, 'colher de sopa', 'COLHER DE SOPA'], // tomate
  [589, 'unidade', 'UNIDADE'], // castanha-do-brasil
  [471, 'xícara de chá', 'XICARA DE CHA'], // café
]

const descricao = (id: number) => tabela.alimentos.find((a) => a.id === id)?.descricao

describe('medidas-caseiras.json', () => {
  it('cobre ao menos 150 alimentos da TACO, todos existentes', () => {
    const ids = Object.keys(porId).map(Number)
    expect(ids.length).toBeGreaterThanOrEqual(150)
    for (const id of ids) expect(descricao(id), String(id)).toBeDefined()
  })

  it.each(CONFERIDOS)('TACO %i: %s confere com a POF', (id, nome, medidaPof) => {
    const r = porId[id]
    if (!r) throw new Error(`sem medidas para ${id}`)
    const medida = r.medidas.find((m) => m.nome === nome)
    expect(medida, `${descricao(id)} · ${nome}`).toBeDefined()
    expect(medida?.gramas).toBe(gramasNaPof(r.pof.codigo, r.pof.preparacao, medidaPof))
  })

  it('não traz medidas de peso, volume em litro ou embalagem', () => {
    for (const r of Object.values(porId)) {
      for (const m of r.medidas) expect(m.nome).not.toMatch(/^(grama|quilo|mililitro|litro|garrafa|lata|pacote|saco|sache)/)
    }
  })

  it('fruta inteira não tem medida de copo ou caneca (que descreve suco)', () => {
    for (const [id, r] of Object.entries(porId)) {
      const a = tabela.alimentos.find((x) => x.id === Number(id))
      if (a?.categoria !== 'Frutas e derivados') continue
      for (const m of r.medidas) expect(m.nome, a.descricao).not.toMatch(/^(copo|caneca|caneco)/)
    }
  })

  it('cortes de frango só têm a medida do próprio corte', () => {
    expect(porId[396]?.medidas.map((m) => m.nome)).not.toContain('peito')
    expect(porId[410]?.medidas.map((m) => m.nome)).not.toContain('coxa')
  })

  it('CB-07: alimento sem correspondência revisada não recebe medida inventada', () => {
    expect(porId[131]).toBeUndefined() // Mandioca, farofa, temperada
    expect(porId[2]).toBeUndefined() // Arroz, integral, cru
    expect(porId[40]).toBeUndefined() // Macarrão, trigo, cru
  })

  it('gramas são positivas', () => {
    for (const r of Object.values(porId)) for (const m of r.medidas) expect(m.gramas).toBeGreaterThan(0)
  })
})
