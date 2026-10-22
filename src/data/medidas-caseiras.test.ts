import pofCsv from '../../dados-brutos/pof/pof_medidas_caseiras.csv?raw'
import tabela from './alimentos.json'
import medidas from './medidas-caseiras.json'
import revisao from './medidas-revisao.md?raw'
import { VERDURAS_QUE_SE_COMEM_COZIDAS } from '../domain/nomeParaPaciente.ts'

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
      // O suco de fruta é medido em copo (spec alimentos-e-gramaturas, A9).
      if (a?.categoria !== 'Frutas e derivados' || /(^|, )suco/.test(a.descricao)) continue
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

// ---------- Camada de plausibilidade (spec alimentos-e-gramaturas, D-430 e D-431) ----------
// As regras abaixo são escritas à mão, sem usar o script de importação: o teste confere o JSON gerado.

const semAcento = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

type AlimentoDaBase = (typeof tabela.alimentos)[number]
const comMedidas: readonly (readonly [AlimentoDaBase, Registro])[] = tabela.alimentos.flatMap((a) => {
  const r = porId[a.id]
  return r ? [[a, r] as const] : []
})
const nomes = (id: number) => porId[id]?.medidas.map((m) => m.nome) ?? []
const peso = (id: number, nome: string) => porId[id]?.medidas.find((m) => m.nome === nome)?.gramas

/** O nome da medida na POF: sem acento e em maiúscula, menos a colher de servir, que a POF chama "de arroz". */
const nomeNaPof = (nome: string) => (nome === 'colher de servir' ? 'COLHER DE ARROZ/SERVIR' : semAcento(nome).toUpperCase())
const fonteNaPof = (r: Registro, nomePof: string) =>
  pof.find((l) => l['codigo_alimento'] === r.pof.codigo && l['descricao_preparacao'] === r.pof.preparacao && l['descricao_medida'] === nomePof)?.['descricao_fonte']
// D-424: o "copo de requeijão" pode ser o "copo médio" de 240 da POF, com o nome de um copo só.
const fonteDe = (r: Registro, nome: string) =>
  semAcento(fonteNaPof(r, nomeNaPof(nome)) ?? (nome === 'copo de requeijão' ? fonteNaPof(r, 'COPO MEDIO') : undefined) ?? '')

const FOLHAS_CRUAS = [77, 78, 79, 80, 152, 75, 84, 111, 119, 135, 155, 156, 104, 105]
const SO_DE_FOLHA = new Set(['folha', 'ramo', 'pires', 'prato de sobremesa', 'prato raso', 'porção'])

describe('medidas plausíveis (D-430)', () => {
  it('CA-1220: folha crua só em folha, ramo, pires e prato', () => {
    for (const id of FOLHAS_CRUAS) for (const nome of nomes(id)) expect(SO_DE_FOLHA.has(nome), `${descricao(id)} · ${nome}`).toBe(true)
    expect(nomes(78)).toContain('folha') // Alface, crespa, crua
  })

  it('CA-1221: alimento cru, cozido ou frito não leva a medida de outro preparo (fonte da POF)', () => {
    const COZIDO = /(cozid|refogad|ensopad|assad|grelhad|frit|corad|empanad|milanesa)/
    const CRU = /\bcru(a|s|as)?\b/
    for (const [a, r] of comMedidas) {
      for (const m of r.medidas) {
        const fonte = fonteDe(r, m.nome)
        const rotulo = `${a.descricao} · ${m.nome} · ${fonte}`
        // D-381: a unidade do ovo com casca é a mesma crua ou cozida (a POF só mede a do cozido).
        if (a.id === 489 && (m.nome === 'unidade' || m.nome === 'metade')) continue
        // Carne, ave e peixe: grelhado, assado, frito e cozido dão peças do mesmo tamanho; só cru contra pronto conta.
        if (a.categoria === 'Carnes e derivados' || a.categoria === 'Pescados e frutos do mar') {
          if (a.preparo === 'cru') expect(COZIDO.test(fonte), rotulo).toBe(false)
          else if (a.preparo) expect(CRU.test(fonte), rotulo).toBe(false)
          continue
        }
        if (a.preparo === 'cru') expect(COZIDO.test(fonte), rotulo).toBe(false)
        if (a.preparo === 'cozido' || a.preparo === 'refogado' || a.preparo === 'assado' || a.preparo === 'grelhado') {
          expect(CRU.test(fonte) || /frit/.test(fonte), rotulo).toBe(false)
        }
        if (a.preparo === 'frito') expect(/(cozid|refogad|ensopad|assad|grelhad)/.test(fonte) || CRU.test(fonte), rotulo).toBe(false)
      }
    }
    // Os casos da revisão: abóbora crua e chicória crua sem colher nem concha do refogado.
    for (const id of [65, 66, 67, 69, 111, 71]) for (const nome of nomes(id)) expect(nome, descricao(id)).not.toMatch(/^(colher|concha|escumadeira|pegador)/)
  })

  it('CA-1222: fruta inteira em unidade, fatia ou pedaço; colher só no abacate e no cupuaçu', () => {
    const FRUTA = new Set(['unidade', 'unidade pequena', 'fatia', 'pedaço', 'banda', 'metade', 'gomo', 'bago', 'rodela', 'cacho', 'taça', 'xícara de chá', 'porção'])
    for (const [a, r] of comMedidas) {
      if (a.categoria !== 'Frutas e derivados' || a.preparo !== 'cru') continue
      const comColher = /^(Abacate|Cupuaçu),/.test(a.descricao)
      for (const m of r.medidas) {
        if (comColher && /^(colher|pote|tigela)/.test(m.nome)) continue
        expect(FRUTA.has(m.nome), `${a.descricao} · ${m.nome}`).toBe(true)
      }
    }
    expect(nomes(229)).not.toContain('colher de servir') // Manga Palmer
    expect(nomes(225)).not.toContain('colher de sopa') // Mamão Formosa
  })

  it('CA-1223: milho e ervilha em conserva só em colher', () => {
    for (const id of [45, 560]) for (const nome of nomes(id)) expect(nome, descricao(id)).toMatch(/^(colher|porção)/)
  })

  it('CA-1224: carne sem fatia acima de 100 g; grelhado, assado ou frito sem colher; ovo frito em unidade', () => {
    for (const [a, r] of comMedidas) {
      if (a.categoria !== 'Carnes e derivados' && a.categoria !== 'Pescados e frutos do mar') continue
      for (const m of r.medidas) {
        if (m.nome === 'fatia') expect(m.gramas, a.descricao).toBeLessThanOrEqual(100)
        if (a.preparo === 'grelhado' || a.preparo === 'assado' || a.preparo === 'frito') expect(m.nome, a.descricao).not.toMatch(/^(colher|concha|escumadeira|pegador|garfada)/)
      }
    }
    expect(nomes(432)).not.toContain('fatia') // Porco, lombo, assado: "fatia · 190 g"
    expect(nomes(490).filter((n) => n !== 'porção')).toEqual(['unidade']) // Ovo frito
  })

  it('CA-1225: a unidade de uma variedade não vale para outra (a banana maçã, pela D-425, tem a da prata)', () => {
    for (const id of [175, 177, 179, 180, 181]) {
      for (const nome of ['unidade', 'unidade pequena', 'banda', 'metade']) expect(nomes(id), `${descricao(id)} · ${nome}`).not.toContain(nome)
    }
    expect(peso(182, 'unidade')).toBe(75) // a banana prata continua
    for (const id of [228, 229, 231]) for (const nome of ['unidade', 'unidade pequena', 'banda', 'metade']) expect(nomes(id), descricao(id)).not.toContain(nome)
    for (const nome of ['unidade', 'metade', 'pedaço']) expect(nomes(225), `Mamão Formosa · ${nome}`).not.toContain(nome)
    expect(peso(226, 'unidade')).toBe(310) // o papaia continua
  })

  it('CA-1226: colheres com peso razoável e na proporção da de sopa; nenhuma medida por procuração', () => {
    const LIMITE: Readonly<Record<string, number>> = { 'colher de sopa': 45, 'colher de servir': 120, 'colher de sobremesa': 30, 'colher de chá': 12, 'colher de café': 6, concha: 200, escumadeira: 160, unidade: 800 }
    const PROPORCAO: Readonly<Record<string, readonly [number, number]>> = { 'colher de chá': [0.15, 0.5], 'colher de sobremesa': [0.35, 0.85], 'colher de café': [0.05, 0.3] }
    for (const [a, r] of comMedidas) {
      const sopa = r.medidas.find((m) => m.nome === 'colher de sopa')?.gramas
      for (const m of r.medidas) {
        const rotulo = `${a.descricao} · ${m.nome} ${m.gramas} g`
        const limite = LIMITE[m.nome]
        if (limite !== undefined) expect(m.gramas, rotulo).toBeLessThanOrEqual(limite)
        if (m.nome === 'fatia') expect(m.gramas, rotulo).toBeLessThanOrEqual(a.categoria === 'Frutas e derivados' ? 250 : 100)
        const faixa = PROPORCAO[m.nome]
        if (faixa && sopa) {
          expect(m.gramas / sopa, rotulo).toBeGreaterThanOrEqual(faixa[0])
          expect(m.gramas / sopa, rotulo).toBeLessThanOrEqual(faixa[1])
        }
        // Procuração: a fonte da POF tem de falar do mesmo utensílio.
        const fonte = fonteDe(r, m.nome)
        if (m.nome === 'concha') expect(fonte, rotulo).toMatch(/concha/)
        if (m.nome.startsWith('copo')) expect(fonte, rotulo).toMatch(/copo|cafezinho|xicara/)
        if (m.nome.startsWith('prato')) expect(fonte, rotulo).toMatch(/prato/)
        if (m.nome === 'garfada') expect(fonte, rotulo).toMatch(/garfada/)
        if (m.nome === 'pegador') expect(fonte, rotulo).toMatch(/pegador/)
      }
    }
    expect(nomes(594)).not.toContain('colher de chá') // Linhaça: 1,5 g não é colher de chá
    expect(nomes(78)).not.toContain('concha') // Alface: a "concha" era 4 colheres de sopa
    expect(nomes(3)).not.toContain('copo americano') // Arroz: o "copo" era um prato fundo raso
  })

  it('D-431: farinha e pó não se medem em concha, escumadeira nem prato (farinha de mandioca, leite em pó)', () => {
    for (const [a, r] of comMedidas) {
      if (!/^(Farinha|Milho, fubá|Milho, amido)|, pó$/.test(a.descricao.trim())) continue
      for (const m of r.medidas) expect(m.nome, a.descricao).not.toMatch(/^(concha|escumadeira|prato|pires)/)
    }
    expect(nomes(121)).toContain('colher de sopa') // Farinha de mandioca crua: a colher fica
  })

  it('CA-1227: a revisão lista cada medida tirada, com o motivo, e cobre os 597 alimentos', () => {
    expect(revisao).toMatch(/## Medidas tiradas pela camada de plausibilidade/)
    expect(revisao).toMatch(/\| 78 \| Alface, crespa, crua \| concha \| 32 g \| /)
    expect(revisao).toMatch(/\| 432 \| Porco, lombo, assado \| fatia \| 190 g \| /)
    const linhas = revisao.split('\n')
    const cobertos = new Set(linhas.flatMap((l) => /^\| (\d+) \|/.exec(l)?.[1] ?? /^- (\d+) /.exec(l)?.[1] ?? []).map(Number))
    for (const a of tabela.alimentos) expect(cobertos.has(a.id), a.descricao).toBe(true)
  })
})

describe('sobras da caminhada dos 4 pacientes (spec alimentos-e-gramaturas, seção 6)', () => {
  it('CA-1209 (D-424): nenhum alimento tem dois copos com o mesmo peso; os iogurtes e os leites leem o mesmo copo', () => {
    for (const [a, r] of comMedidas) {
      const copos = r.medidas.filter((m) => m.nome.startsWith('copo'))
      const pesos = copos.map((m) => m.gramas)
      expect(new Set(pesos).size, `${a.descricao}: ${copos.map((m) => `${m.nome} ${m.gramas}`).join(', ')}`).toBe(pesos.length)
      expect(copos.some((m) => m.nome === 'copo médio' && m.gramas === 240), a.descricao).toBe(false)
    }
    for (const id of [448, 449, 454, 457, 458]) {
      expect(peso(id, 'copo de requeijão'), descricao(id)).toBe(240)
      expect(nomes(id), descricao(id)).not.toContain('copo médio')
    }
  })

  it('CA-1210 (D-425): a banana maçã tem a unidade da prata; nanica, ouro, figo e as mangas ficam em gramas', () => {
    expect(peso(178, 'unidade')).toBe(75)
    for (const id of [177, 179, 180, 228, 229, 231]) expect(nomes(id), descricao(id)).not.toContain('unidade')
    expect(revisao).toMatch(/## Unidade emprestada de outra variedade/)
    expect(revisao).toContain('| 178 | Banana, maçã, crua | unidade | 75 g | Banana, prata, crua |')
    expect(revisao).toMatch(/## Variedades que ficam em gramas/)
    for (const id of [177, 179, 180, 228, 229, 231]) expect(revisao, descricao(id)).toContain(`| ${id} | ${descricao(id)} |`)
  })
})

describe('menores da 3ª revisão (spec alimentos-e-gramaturas, D-483a)', () => {
  it('CA-1345: verdura crua que se come cozida não tem colher, concha nem escumadeira (são do cozido)', () => {
    for (const [a, r] of comMedidas) {
      if (!a.categoria.startsWith('Verduras') || a.preparo !== 'cru' || !VERDURAS_QUE_SE_COMEM_COZIDAS.has(a.base ?? '')) continue
      for (const m of r.medidas) expect(m.nome, a.descricao).not.toMatch(/^(colher|concha|escumadeira)/)
    }
    expect(nomes(127)).not.toContain('colher de servir') // Jiló, cru
  })

  it('CA-1345: a romã não tem "unidade"; filé de peixe só em filé e porção', () => {
    expect(nomes(249)).not.toContain('unidade')
    for (const [a, r] of comMedidas) {
      if (a.categoria !== 'Pescados e frutos do mar' || !/filé/.test(a.descricao)) continue
      for (const m of r.medidas) expect(['filé', 'porção'], `${a.descricao}: ${m.nome}`).toContain(m.nome)
    }
    expect(revisao).toContain('| 127 | Jiló, cru | colher de servir | 95 g | verdura crua que se come cozida não tem medida do cozido |')
    expect(revisao).toContain('| 249 | Romã, crua | unidade | 70 g | romã só em gramas (a unidade da POF é a parte comestível) |')
    expect(revisao).toContain('| 301 | Merluza, filé, assado | unidade pequena | 150 g | filé de peixe só em filé ou porção |')
  })
})

describe('sobras do G2 na 2ª revisão (spec alimentos-e-gramaturas, correção C, D-483)', () => {
  it('CA-1332: cereal matinal só em xícara de chá e porção', () => {
    for (const nome of nomes(25)) expect(['xícara de chá', 'porção'], nome).toContain(nome)
    expect(nomes(25)).toContain('xícara de chá')
  })

  it('CA-1332: queijo e gordura sem colher de sopa acima de 30 g (a ricota de 44 g sai)', () => {
    for (const [a, r] of comMedidas) {
      if (a.categoria !== 'Gorduras e óleos' && !/^Queijo,/.test(a.descricao)) continue
      const sopa = r.medidas.find((m) => m.nome === 'colher de sopa')
      if (sopa) expect(sopa.gramas, a.descricao).toBeLessThanOrEqual(30)
    }
    expect(nomes(469)).not.toContain('colher de sopa')
  })

  it('CA-1332: pão de forma só em fatia; creme de leite sem copo; camarão grande sem colher', () => {
    for (const [a, r] of comMedidas) {
      if (/^Pão, .*forma/.test(a.descricao)) expect(r.medidas.map((m) => m.nome), a.descricao).toEqual(['fatia'])
    }
    for (const nome of nomes(447)) expect(nome, 'Creme de Leite').not.toMatch(/^copo/)
    for (const nome of nomes(284)) expect(nome, 'Camarão grande').not.toMatch(/^colher/)
    expect(nomes(284)).toContain('unidade')
  })

  it('CA-1332: a revisão traz cada medida tirada com o motivo novo', () => {
    expect(revisao).toContain('| 25 | Cereal matinal, milho | colher de servir | 8 g | cereal matinal só em xícara ou porção |')
    expect(revisao).toContain('| 469 | Queijo, ricota | colher de sopa | 44 g | colher de sopa de queijo ou gordura acima de 30 g |')
    expect(revisao).toContain('| 51 | Pão, milho, forma | unidade | 70 g | pão de forma só em fatia |')
    expect(revisao).toContain('| 447 | Creme de Leite | copo americano | 150 g | creme de leite só em colher ou ponta de faca |')
    expect(revisao).toContain('| 284 | Camarão, Rio Grande, grande, cozido | colher de sopa | 20 g | camarão grande só em unidade, porção ou punhado |')
  })
})
