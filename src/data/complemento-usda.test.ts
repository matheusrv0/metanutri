// Spec vitaminas-usda, CA-940 a CA-947, CB-307 e CB-308: o complemento do USDA e o script que o gera.
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import complemento from './complemento-usda.json'
import dri from './dri.json'
import taco from './alimentos.json'

const CHAVES = ['vitamina_d_mcg', 'vitamina_e_mg', 'folato_dfe_mcg', 'vitamina_b12_mcg', 'selenio_mcg', 'gordura_trans_g'] as const
type Chave = (typeof CHAVES)[number]

/** Faixa plausível por 100 g (CA-943): o maior valor de alimento comum fica bem abaixo disto. */
const MAXIMO: Readonly<Record<Chave, number>> = {
  vitamina_d_mcg: 50,
  vitamina_e_mg: 50,
  folato_dfe_mcg: 1000,
  vitamina_b12_mcg: 100,
  selenio_mcg: 2000,
  gordura_trans_g: 5,
}

interface ItemComplemento {
  readonly id: number
  readonly fdcId: number
  readonly conjunto: string
  readonly versao: string
  readonly confianca: string
  readonly valores: Readonly<Record<string, number | null>>
  readonly ajuste?: { readonly fator: number; readonly base: string }
}

const itens = complemento.alimentos as readonly ItemComplemento[]
const porId = new Map(itens.map((i) => [i.id, i]))
const valor = (id: number, chave: Chave) => porId.get(id)?.valores[chave]

describe('complemento do USDA (spec vitaminas-usda)', () => {
  it('CA-940: o cabeçalho cita a fonte, a licença, a data e os dois conjuntos com versão', () => {
    const { fonte } = complemento
    expect(fonte.nome).toBe('USDA FoodData Central')
    expect(fonte.autor).toBe('U.S. Department of Agriculture, Agricultural Research Service')
    expect(fonte.citacao).toBe('U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, 2019. fdc.nal.usda.gov.')
    expect(fonte.licenca).toBe('CC0 1.0 Universal (domínio público)')
    expect(fonte.url).toBe('https://fdc.nal.usda.gov/')
    expect(fonte.baixadoEm).toBe('2026-10-20')
    expect(fonte.base).toBe('100 g de parte comestível')
    expect(fonte.conjuntos.map((c) => [c.nome, c.versao, c.arquivo, c.sha256])).toEqual([
      ['SR Legacy', '2018-04', 'FoodData_Central_sr_legacy_food_csv_2018-04.zip', 'b80817294b8850530aaedf2e515c02593b1824f763a0ff356e5c2081643e6fd0'],
      [
        'Foundation Foods',
        '2026-04',
        'FoodData_Central_foundation_food_csv_2026-04-30.zip',
        '70457ee9d9342f43bda2010318c85f04210c689fdeb9cd2da4c513b0e8dbc655',
      ],
    ])
  })

  it('CA-941: as seis chaves, com as unidades do dri.json nas cinco que têm referência', () => {
    expect(complemento.nutrientes.map((n) => n.chave)).toEqual(CHAVES)
    const nutrientesDri = dri.nutrientes as Readonly<Record<string, { readonly unidade: string }>>
    for (const n of complemento.nutrientes) {
      if (n.chave === 'gordura_trans_g') {
        expect(n.unidade).toBe('g')
        expect(nutrientesDri[n.chave]).toBeUndefined()
      } else {
        expect(n.unidade, n.chave).toBe(nutrientesDri[n.chave]?.unidade)
      }
    }
  })

  it('CA-942: cada alimento existe na TACO, uma vez só, com equivalente de confiança alta ou média', () => {
    const idsTaco = new Set(taco.alimentos.map((a) => a.id))
    expect(new Set(itens.map((i) => i.id)).size).toBe(itens.length)
    for (const i of itens) {
      expect(idsTaco.has(i.id), String(i.id)).toBe(true)
      expect(Number.isInteger(i.fdcId) && i.fdcId > 0, String(i.id)).toBe(true)
      expect([['SR Legacy', '2018-04'], ['Foundation Foods', '2026-04']], String(i.id)).toContainEqual([i.conjunto, i.versao])
      expect(['alta', 'media'], String(i.id)).toContain(i.confianca)
      expect(Object.keys(i.valores), String(i.id)).toEqual(CHAVES)
      expect(CHAVES.some((c) => i.valores[c] !== null), String(i.id)).toBe(true)
    }
    expect(itens.map((i) => i.id)).toEqual([...itens.map((i) => i.id)].sort((a, b) => a - b))
  })

  it('CA-943: cada valor é número finito, não negativo e plausível, ou nulo', () => {
    for (const i of itens) {
      for (const c of CHAVES) {
        const v = i.valores[c]
        if (v === null) continue
        expect(typeof v === 'number' && Number.isFinite(v), `${i.id} ${c}`).toBe(true)
        expect(v, `${i.id} ${c}`).toBeGreaterThanOrEqual(0)
        expect(v, `${i.id} ${c}`).toBeLessThanOrEqual(MAXIMO[c])
      }
    }
  })

  it('CA-944: 308 alimentos; os de confiança baixa e as preparações sem equivalente ficam fora', () => {
    expect(itens).toHaveLength(308)
    expect(itens.filter((i) => i.conjunto === 'Foundation Foods').map((i) => i.id)).toEqual([7])
    for (const id of [10, 16, 195, 224, 324, 325, 418, 419, 420, 455, 465, 468, 512]) expect(porId.has(id), `baixa ${id}`).toBe(false)
    for (const id of [15, 533, 551]) expect(porId.has(id), `sem ${id}`).toBe(false)
  })

  it('CA-945: nada de fortificação americana', () => {
    for (const id of [23, 24, 25, 26, 36, 46, 263, 264, 265, 266]) expect(porId.has(id), String(id)).toBe(false)
    for (const id of [456, 457, 458, 459]) expect(valor(id, 'vitamina_d_mcg'), String(id)).toBeLessThanOrEqual(0.5)
    expect(valor(454, 'vitamina_d_mcg')).toBeNull()
    expect(valor(461, 'vitamina_d_mcg')).toBeNull()
  })

  it('CA-946: as regras do dono (castanha, flocão, farinha enriquecida, ajuste do feijão)', () => {
    expect(valor(589, 'selenio_mcg')).toBe(1917)
    expect(valor(21, 'folato_dfe_mcg')).toBe(30)
    expect(valor(22, 'folato_dfe_mcg')).toBe(30)
    expect(valor(35, 'folato_dfe_mcg')).toBeGreaterThanOrEqual(140)
    expect(valor(561, 'folato_dfe_mcg')).toBe(91.92)
    expect(porId.get(561)?.ajuste).toEqual({ fator: 0.5344, base: 'energia' })
  })

  // Conferência independente: valores lidos da tabela de aprovação (revisao.md, seção 6) em 20/10/2026.
  it.each([
    [317, 'Salmão grelhado', { vitamina_d_mcg: 13.1, vitamina_b12_mcg: 2.8, selenio_mcg: 41.4 }],
    [488, 'Ovo cozido', { vitamina_d_mcg: 2.2, vitamina_b12_mcg: 1.11, folato_dfe_mcg: 44, vitamina_e_mg: 1.03, selenio_mcg: 30.8 }],
    [458, 'Leite integral', { vitamina_d_mcg: 0.1, vitamina_b12_mcg: 0.45, folato_dfe_mcg: 5, vitamina_e_mg: 0.07, selenio_mcg: 3.7 }],
    [7, 'Aveia', { vitamina_d_mcg: null, vitamina_b12_mcg: null, vitamina_e_mg: null, selenio_mcg: 25.35 }],
  ] as const)('%s (%s) traz os valores da revisão', (id, _nome, esperado) => {
    for (const [chave, v] of Object.entries(esperado)) expect(valor(id, chave as Chave), chave).toBe(v)
  })
})

describe('script importar-usda (CA-947, CB-307, CB-308)', () => {
  // O Vitest roda na raiz do projeto.
  const SCRIPT = join(process.cwd(), 'scripts', 'dados', 'importar-usda.mjs')
  let pasta = ''
  beforeEach(() => {
    pasta = mkdtempSync(join(tmpdir(), 'usda-'))
  })
  afterEach(() => rmSync(pasta, { recursive: true, force: true }))

  const VALORES = { vitamina_d_mcg: 0, vitamina_b12_mcg: 0, folato_dfe_mcg: 9, vitamina_e_mg: 0.17, selenio_mcg: 5.8, gordura_trans_g: null }

  const item = (tacoId: number, confianca: string, extra: Record<string, unknown> = {}) => ({
    tacoId,
    taco: `Alimento ${tacoId}`,
    confianca,
    escolha: confianca === 'sem' ? null : 1000 + tacoId,
    candidatos:
      confianca === 'sem'
        ? []
        : [{ fdcId: 1000 + tacoId, dataset: tacoId === 3 ? 'Foundation Foods (abr/2026)' : 'SR Legacy (abr/2018)', naoCopiar: [] }],
    valoresPropostos: confianca === 'sem' ? Object.fromEntries(Object.keys(VALORES).map((k) => [k, null])) : { ...VALORES },
    ...extra,
  })

  const rodar = (proposta: unknown, saida = join(pasta, 'saida.json')) => {
    const entrada = join(pasta, 'proposta.json')
    writeFileSync(entrada, typeof proposta === 'string' ? proposta : JSON.stringify(proposta))
    execFileSync(process.execPath, [SCRIPT, entrada, saida], { stdio: 'pipe' })
    return readFileSync(saida, 'utf8')
  }

  const PROPOSTA = [
    item(1, 'alta', { ajuste: { fator: 0.6, base: 'energia', explicacao: 'mais água' } }),
    item(2, 'baixa'),
    item(3, 'media'),
    item(4, 'sem'),
  ]

  it('CA-947: grava só alta e média, com os valores copiados, o conjunto, a versão e o ajuste', () => {
    const gerado = JSON.parse(rodar(PROPOSTA)) as { alimentos: ItemComplemento[]; fonte: { conjuntos: unknown[] } }
    expect(gerado.alimentos).toEqual([
      { id: 1, fdcId: 1001, conjunto: 'SR Legacy', versao: '2018-04', confianca: 'alta', valores: { ...VALORES }, ajuste: { fator: 0.6, base: 'energia' } },
      { id: 3, fdcId: 1003, conjunto: 'Foundation Foods', versao: '2026-04', confianca: 'media', valores: { ...VALORES } },
    ])
    expect(Object.keys(gerado.alimentos[0]?.valores ?? {})).toEqual(CHAVES)
    expect(gerado.fonte.conjuntos).toHaveLength(2)
  })

  it('CA-947: duas rodadas dão o mesmo arquivo, byte a byte', () => {
    expect(rodar(PROPOSTA, join(pasta, 'a.json'))).toBe(rodar(PROPOSTA, join(pasta, 'b.json')))
  })

  it.each([
    ['id que não existe na TACO', [item(9999, 'alta')]],
    ['id repetido', [item(1, 'alta'), item(1, 'media')]],
    ['confiança desconhecida', [item(1, 'otima')]],
    ['valor negativo', [item(1, 'alta', { valoresPropostos: { ...VALORES, selenio_mcg: -1 } })]],
    ['valor fora da faixa', [item(1, 'alta', { valoresPropostos: { ...VALORES, vitamina_d_mcg: 500 } })]],
    ['chave faltando', [item(1, 'alta', { valoresPropostos: { vitamina_d_mcg: 1 } })]],
    [
      'nutriente marcado "não copiar" com valor',
      [item(1, 'alta', { candidatos: [{ fdcId: 1001, dataset: 'SR Legacy (abr/2018)', naoCopiar: ['vitamina_d_mcg'] }] })],
    ],
    ['conjunto desconhecido', [item(1, 'alta', { candidatos: [{ fdcId: 1001, dataset: 'Branded (2025)', naoCopiar: [] }] })]],
    ['escolha fora dos candidatos', [item(1, 'alta', { escolha: 42 })]],
    ['tudo nulo', [item(1, 'alta', { valoresPropostos: { ...VALORES, vitamina_d_mcg: null, vitamina_b12_mcg: null, folato_dfe_mcg: null, vitamina_e_mg: null, selenio_mcg: null } })]],
  ])('CB-307: recusa %s e não grava nada', (_caso, proposta) => {
    const saida = join(pasta, 'recusada.json')
    expect(() => rodar(proposta, saida)).toThrow()
    expect(existsSync(saida)).toBe(false)
  })

  it('CB-308: sem o caminho da proposta, ou com arquivo que não é JSON, para com a mensagem de uso', () => {
    let erro = ''
    try {
      execFileSync(process.execPath, [SCRIPT], { stdio: 'pipe' })
    } catch (e) {
      erro = String((e as { stderr?: Buffer }).stderr ?? '')
    }
    expect(erro).toContain('Uso: node scripts/dados/importar-usda.mjs <proposta.json> [saída]')
    const saida = join(pasta, 'nao-json.json')
    expect(() => rodar('isto não é JSON', saida)).toThrow()
    expect(existsSync(saida)).toBe(false)
  })
})
