// Spec base-ampliada, CA-1700 a CA-1710, CB-700, CB-701 e CB-703: a base ampliada do USDA e os scripts que a geram.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CHAVES, GRUPOS, MAXIMOS, PREPAROS, PRIMEIRO_ID, ULTIMO_ID, medidasDaCuradoria, montarBase, type AlimentoDaBase, type ItemDaCuradoria } from '../../scripts/dados/importar-base-ampliada.mjs'
import { valoresDoAlimento, type AlimentoUsda, type PorcaoUsda } from '../../scripts/dados/usda-fonte.mjs'
import { energiaIncoerente } from '../domain/produtos.ts'
import base from './base-ampliada.json'
import fonte from './base-ampliada-fonte.json'
import taco from './alimentos.json'

const curadoria: readonly ItemDaCuradoria[] = JSON.parse(readFileSync(join(process.cwd(), 'dados-brutos', 'usda', 'curadoria-base-ampliada.json'), 'utf8'))
// O JSON importado é tipado de forma ampla; a forma é a do script (conferida aqui).
const alimentos = base.alimentos as unknown as readonly AlimentoDaBase[]
const nomesDaTaco = new Set(taco.alimentos.map((a) => a.descricao.trim().toLowerCase()))
const valor = (a: AlimentoDaBase, chave: string): number | null => a.valores[CHAVES.indexOf(chave)] ?? null
const porNome = (nome: string) => alimentos.find((a) => a.nome === nome)

describe('base ampliada: arquivo gerado (spec base-ampliada)', () => {
  it('CA-1700: o cabeçalho cita a fonte, a licença, a data, os dois conjuntos, e as contagens batem com a base', () => {
    expect(fonte.fonte.nome).toBe('USDA FoodData Central')
    expect(fonte.fonte.autor).toBe('U.S. Department of Agriculture, Agricultural Research Service')
    expect(fonte.fonte.citacao).toContain('FoodData Central')
    expect(fonte.fonte.licenca).toBe('CC0 1.0 Universal (domínio público)')
    expect(fonte.fonte.baixadoEm).toBe('2026-10-29')
    expect(fonte.fonte.conjuntos.map((c) => [c.nome, c.versao])).toEqual([
      ['SR Legacy', '2018-04'],
      ['Foundation Foods', '2026-10'],
    ])
    for (const c of fonte.fonte.conjuntos) {
      expect(c.sha256).toMatch(/^[0-9a-f]{64}$/)
      expect(c.url).toMatch(/^https:\/\/fdc\.nal\.usda\.gov\/fdc-datasets\//)
    }
    expect(fonte.alimentos).toBe(alimentos.length)
    expect(fonte.sugeriveis).toBe(alimentos.filter((a) => a.sugerivel).length)
    expect(fonte.porConjunto['Foundation Foods'] + fonte.porConjunto['SR Legacy']).toBe(alimentos.length)
    const porGrupo: Record<string, number> = {}
    for (const a of alimentos) porGrupo[a.grupo] = (porGrupo[a.grupo] ?? 0) + 1
    expect(fonte.porGrupo).toEqual(porGrupo)
    expect(base.chaves).toEqual(CHAVES)
  })

  it('CA-1701: id na faixa e único, fdcId único, conjunto conhecido e nome original guardado', () => {
    const ids = alimentos.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => Number.isInteger(id) && id >= PRIMEIRO_ID && id <= ULTIMO_ID)).toBe(true)
    expect(PRIMEIRO_ID).toBe(100_001)
    expect(ULTIMO_ID).toBe(199_999)
    const fdc = alimentos.map((a) => a.fdcId)
    expect(new Set(fdc).size).toBe(fdc.length)
    for (const a of alimentos) {
      expect(['SR Legacy', 'Foundation Foods']).toContain(a.conjunto)
      expect(a.original.trim()).not.toBe('')
      expect(a.valores).toHaveLength(CHAVES.length)
    }
  })

  it('CA-1702: nome em português no padrão da TACO, único, grupo e preparo válidos e nome para o paciente', () => {
    const nomes = new Set<string>()
    for (const a of alimentos) {
      expect(a.nome).toMatch(/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ]/)
      expect(nomesDaTaco.has(a.nome.toLowerCase())).toBe(false)
      expect(nomes.has(a.nome.toLowerCase())).toBe(false)
      nomes.add(a.nome.toLowerCase())
      expect(GRUPOS).toContain(a.grupo)
      if (a.preparo !== null) expect(PREPAROS).toContain(a.preparo)
      expect(a.paciente.trim()).not.toBe('')
      // Nada de inglês de cozinha no nome (o glossário traduz o preparo).
      expect(a.nome).not.toMatch(/\b(raw|cooked|boiled|roasted|grilled|fried|baked|dried|fresh)\b/i)
    }
    expect(GRUPOS).toHaveLength(15)
    expect(new Set(GRUPOS)).toEqual(new Set(taco.alimentos.map((a) => a.categoria)))
  })

  it('CA-1703: todo valor é número finito não negativo ou nulo, dentro da faixa plausível', () => {
    expect(MAXIMOS).toMatchObject({
      energia_kcal: 902,
      proteina_g: 100,
      lipideos_g: 100,
      carboidrato_g: 100,
      colesterol_mg: 3100,
      calcio_mg: 2500,
      ferro_mg: 130,
      vitamina_d_mcg: 60,
      folato_dfe_mcg: 1000,
      vitamina_b12_mcg: 100,
      selenio_mcg: 2000,
    })
    for (const a of alimentos) {
      CHAVES.forEach((c, i) => {
        const v = a.valores[i]
        if (v === null || v === undefined) return
        expect(Number.isFinite(v), `${a.nome}: ${c}`).toBe(true)
        expect(v, `${a.nome}: ${c}`).toBeGreaterThanOrEqual(0)
        expect(v, `${a.nome}: ${c}`).toBeLessThanOrEqual(MAXIMOS[c] ?? 0)
      })
    }
  })

  it('CA-1704: todo alimento tem energia, coerente com os macros pela regra do app', () => {
    for (const a of alimentos) {
      const v = Object.fromEntries(CHAVES.map((c, i) => [c, a.valores[i] ?? null]))
      expect(v.energia_kcal, a.nome).not.toBeNull()
      expect(energiaIncoerente(v), a.nome).toBe(false)
    }
  })

  it('CA-1705: a tilápia está na base, grelhada (SR) e crua (Foundation completada pelo SR)', () => {
    const grelhada = porNome('Tilápia, filé, grelhada')
    expect(grelhada).toMatchObject({ fdcId: 175177, conjunto: 'SR Legacy', grupo: 'Pescados e frutos do mar', preparo: 'grelhado', original: 'Fish, tilapia, cooked, dry heat' })
    expect(grelhada?.medidas).toContainEqual(['filé', 87])
    expect(grelhada ? valor(grelhada, 'energia_kcal') : null).toBe(128)
    expect(grelhada ? valor(grelhada, 'proteina_g') : null).toBe(26.15)
    expect(grelhada ? valor(grelhada, 'vitamina_d_mcg') : null).toBe(3.7)
    expect(grelhada ? valor(grelhada, 'vitamina_b12_mcg') : null).toBe(1.86)
    expect(grelhada ? valor(grelhada, 'selenio_mcg') : null).toBe(54.4)
    const crua = porNome('Tilápia, filé, crua')
    expect(crua).toMatchObject({ fdcId: 2684442, conjunto: 'Foundation Foods', preparo: 'cru' })
    expect(crua?.complemento?.fdcId).toBe(175176)
  })

  it('CA-1706 e CA-1710: complemento só nas chaves nulas da Foundation; naoCopiar e fortificação ficam nulos', () => {
    const daCuradoria = new Map(curadoria.map((c) => [c.fdcId, c]))
    for (const a of alimentos) {
      const item = daCuradoria.get(a.fdcId)
      expect(item?.decisao).toBe('incluir')
      expect(item?.id).toBe(a.id)
      if (a.complemento) {
        expect(a.conjunto).toBe('Foundation Foods')
        expect(item?.complemento).toBe(a.complemento.fdcId)
        for (const c of a.complemento.chaves) {
          expect(CHAVES).toContain(c)
          expect(valor(a, c)).not.toBeNull()
        }
      }
      for (const c of item?.naoCopiar ?? []) expect(valor(a, c), `${a.nome}: ${c}`).toBeNull()
      expect(a.nome).not.toMatch(/fortificad/i)
    }
    const kefir = porNome('Kefir, natural, semidesnatado')
    expect(kefir ? [valor(kefir, 'vitamina_a_rae_mcg'), valor(kefir, 'vitamina_d_mcg')] : null).toEqual([null, null])
    expect(kefir?.ml).toBe(true)
  })

  it('CA-1709: medidas com nome da POF, uma por nome, carne e peixe só em peça, gordura em colher, nenhuma acima do peso máximo', () => {
    const permitidas = new Set(['xícara de chá', 'colher de sopa', 'colher de chá', 'filé', 'bife', 'bisteca', 'fatia', 'unidade', 'unidade grande', 'unidade pequena', 'pedaço', 'peito', 'coxa', 'sobrecoxa', 'asa', 'folha'])
    const pecas = new Set(['filé', 'bife', 'fatia', 'pedaço', 'unidade', 'unidade grande', 'unidade pequena', 'peito', 'coxa', 'sobrecoxa', 'asa', 'bisteca'])
    const maximo: Record<string, number> = { 'colher de sopa': 45, 'colher de chá': 12, 'xícara de chá': 300, fatia: 250 }
    for (const a of alimentos) {
      const nomes = a.medidas.map(([n]) => n)
      expect(new Set(nomes).size, a.nome).toBe(nomes.length)
      for (const [nome, gramas] of a.medidas) {
        expect(permitidas.has(nome), `${a.nome}: ${nome}`).toBe(true)
        expect(gramas).toBeGreaterThan(0)
        expect(gramas, `${a.nome}: ${nome}`).toBeLessThanOrEqual(maximo[nome] ?? 800)
        if (a.grupo === 'Carnes e derivados' || a.grupo === 'Pescados e frutos do mar') expect(pecas.has(nome), `${a.nome}: ${nome}`).toBe(true)
        if (a.grupo === 'Gorduras e óleos') expect(nome.startsWith('colher'), `${a.nome}: ${nome}`).toBe(true)
      }
    }
  })
})

// ---------- Os scripts, com dados escritos aqui ----------

const porcao = (modificador: string, gramas: number, quantidade = 1, ordem = 1, unidade = ''): PorcaoUsda => ({ quantidade, unidade, modificador, descricao: '', gramas, ordem })

/** Um alimento do USDA falso: os ids dos nutrientes são os do FoodData Central. */
function falso(fdcId: number, conjunto: 'SR Legacy' | 'Foundation Foods', descricao: string, nutrientes: Record<number, number>, porcoes: PorcaoUsda[] = []): AlimentoUsda {
  return { fdcId, conjunto, versao: conjunto === 'SR Legacy' ? '2018-04' : '2026-10', descricao, categoria: 'Finfish and Shellfish Products', nutrientes: new Map(Object.entries(nutrientes).map(([k, v]) => [Number(k), v])), porcoes }
}

// Peixe grelhado: 128 kcal, P 26, G 2,6, C 0; vitamina D 3,7 µg; sem selênio na Foundation.
const PEIXE = { 1008: 128, 1003: 26, 1004: 2.6, 1005: 0, 1114: 3.7, 1178: 1.9 }
const USDA = new Map<number, AlimentoUsda>([
  [1, falso(1, 'Foundation Foods', 'Fish, test, raw', { 1008: 96, 1003: 20, 1004: 1.7, 1005: 0 }, [porcao('fillet', 116)])],
  [2, falso(2, 'SR Legacy', 'Fish, test, raw', { 1008: 99, 1003: 21, 1004: 1.5, 1005: 0, 1103: 41.8, 1114: 3.1 }, [porcao('fillet', 120)])],
  [3, falso(3, 'SR Legacy', 'Fish, test, cooked, dry heat', PEIXE, [porcao('fillet', 87), porcao('oz', 85, 3, 2)])],
  [4, falso(4, 'SR Legacy', 'Spice, test', { 1008: 250, 1003: 10, 1004: 3, 1005: 80 })],
])
const incluir = (fdcId: number, id: number, nome: string, extra: Partial<ItemDaCuradoria> = {}): ItemDaCuradoria => ({
  fdcId,
  decisao: 'incluir',
  id,
  nome,
  grupo: 'Pescados e frutos do mar',
  preparo: 'cru',
  paciente: nome,
  sugerivel: false,
  ...extra,
})
const SEM_TACO = new Set<string>()

describe('importar-base-ampliada: montarBase (CA-1707, CB-701)', () => {
  const boa: readonly ItemDaCuradoria[] = [
    incluir(1, 100001, 'Peixe, teste, cru', { complemento: 2 }),
    { fdcId: 2, decisao: 'excluir', motivo: 'duplicata da Foundation 1' },
    incluir(3, 100002, 'Peixe, teste, grelhado', { preparo: 'grelhado', sugerivel: true }),
  ]

  it('monta a base com a Foundation primeiro e o SR só nas chaves nulas (CA-1706)', () => {
    const { alimentos: saida } = montarBase(boa, USDA, SEM_TACO)
    const cru = saida.find((a) => a.id === 100001)
    const v = (c: string) => cru?.valores[CHAVES.indexOf(c)]
    expect(v('energia_kcal')).toBe(96)
    expect(v('proteina_g')).toBe(20)
    expect(v('selenio_mcg')).toBe(41.8)
    expect(v('vitamina_d_mcg')).toBe(3.1)
    expect(cru?.complemento).toEqual({ fdcId: 2, chaves: ['vitamina_d_mcg', 'selenio_mcg'] })
    expect(cru?.medidas).toEqual([['filé', 116]])
    const grelhado = saida.find((a) => a.id === 100002)
    expect(grelhado?.medidas).toEqual([['filé', 87]])
    expect(grelhado?.sugerivel).toBe(true)
    expect(grelhado?.complemento).toBeUndefined()
  })

  it('dá a mesma saída duas vezes', () => {
    expect(JSON.stringify(montarBase(boa, USDA, SEM_TACO))).toBe(JSON.stringify(montarBase(boa, USDA, SEM_TACO)))
  })

  it.each<[string, readonly ItemDaCuradoria[], ReadonlySet<string>, ReadonlyMap<number, number> | undefined, RegExp]>([
    ['id fora da faixa', [incluir(3, 99, 'Peixe, teste, grelhado')], SEM_TACO, undefined, /id 99 fora da faixa/],
    ['id repetido', [incluir(3, 100002, 'Peixe, a'), incluir(1, 100002, 'Peixe, b')], SEM_TACO, undefined, /repetido/],
    ['id que mudou', [incluir(3, 100009, 'Peixe, teste, grelhado')], SEM_TACO, new Map([[3, 100002]]), /o id mudou de 100002 para 100009/],
    ['nome repetido', [incluir(3, 100002, 'Peixe, a'), incluir(1, 100001, 'Peixe, a')], SEM_TACO, undefined, /nome repetido/],
    ['nome da TACO', [incluir(3, 100002, 'Pintado, grelhado')], new Set(['pintado, grelhado']), undefined, /nome repetido/],
    ['grupo desconhecido', [incluir(3, 100002, 'Peixe, a', { grupo: 'Peixes' })], SEM_TACO, undefined, /grupo "Peixes"/],
    ['preparo desconhecido', [incluir(3, 100002, 'Peixe, a', { preparo: 'defumado' })], SEM_TACO, undefined, /preparo "defumado"/],
    ['complemento que não é SR', [incluir(1, 100001, 'Peixe, a', { complemento: 1 })], SEM_TACO, undefined, /complemento 1 precisa ser SR Legacy/],
    ['naoCopiar desconhecido', [incluir(3, 100002, 'Peixe, a', { naoCopiar: ['vitamina_x'] })], SEM_TACO, undefined, /naoCopiar com chave desconhecida/],
    ['energia incoerente', [incluir(4, 100004, 'Tempero, teste')], SEM_TACO, undefined, /energia incoerente/],
    ['fdcId fora do USDA (CB-701)', [incluir(77, 100002, 'Peixe, a')], SEM_TACO, undefined, /fdcId 77 não está nos arquivos do USDA/],
    ['decisão desconhecida (CB-701)', [{ fdcId: 3, decisao: 'talvez' }], SEM_TACO, undefined, /decisão "talvez"/],
    ['exclusão sem motivo (CB-701)', [{ fdcId: 3, decisao: 'excluir' }], SEM_TACO, undefined, /exclusão sem motivo/],
  ])('recusa %s', (_caso, curadoriaRuim, nomesTaco, antes, mensagem) => {
    expect(() => montarBase(curadoriaRuim, USDA, nomesTaco, antes)).toThrow(mensagem)
  })

  it('recusa valor fora da faixa', () => {
    const usda = new Map([[5, falso(5, 'SR Legacy', 'Fish oil, test', { 1008: 900, 1003: 0, 1004: 100, 1005: 0, 1114: 250 })]])
    expect(() => montarBase([incluir(5, 100005, 'Óleo, de peixe, teste', { grupo: 'Gorduras e óleos', preparo: null })], usda, SEM_TACO)).toThrow(/vitamina_d_mcg = 250 fora da faixa/)
  })
})

describe('usda-fonte: valoresDoAlimento (CA-1708, CB-703)', () => {
  const v = (descricao: string, nutrientes: Record<number, number>) => valoresDoAlimento({ descricao, nutrientes: new Map(Object.entries(nutrientes).map(([k, x]) => [Number(k), x])) })

  it('vitamina D em µg, ou UI ÷ 40', () => {
    expect(v('a', { 1114: 2.5 }).vitamina_d_mcg).toBe(2.5)
    expect(v('a', { 1110: 100 }).vitamina_d_mcg).toBe(2.5)
  })

  it('vitamina A em RAE, ou a soma das partes; UI sozinha nunca vira µg', () => {
    expect(v('a', { 1106: 50, 1104: 999 }).vitamina_a_rae_mcg).toBe(50)
    expect(v('a', { 1105: 10, 1107: 120, 1108: 24, 1120: 48 }).vitamina_a_rae_mcg).toBe(10 + 10 + 1 + 2)
    expect(v('a', { 1104: 999 }).vitamina_a_rae_mcg).toBeNull()
  })

  it('folato em DFE; sem ele, o do alimento + 1,7 × ácido fólico; o total só sem enriquecimento', () => {
    expect(v('a', { 1190: 80 }).folato_dfe_mcg).toBe(80)
    expect(v('a', { 1187: 40, 1186: 10 }).folato_dfe_mcg).toBe(57)
    expect(v('Pasta, plain', { 1177: 30 }).folato_dfe_mcg).toBe(30)
    expect(v('Pasta, enriched', { 1177: 30 }).folato_dfe_mcg).toBeNull()
  })

  it('energia "Energy" antes de Atwater; ausente é nulo, zero publicado é zero, negativo é nulo', () => {
    expect(v('a', { 1008: 100, 2048: 90 }).energia_kcal).toBe(100)
    expect(v('a', { 2048: 90, 2047: 95 }).energia_kcal).toBe(90)
    expect(v('a', {}).ferro_mg).toBeNull()
    expect(v('a', { 1089: 0 }).ferro_mg).toBe(0)
    expect(v('a', { 1005: -0.06 }).carboidrato_g).toBeNull()
  })
})

describe('importar-base-ampliada: medidasDaCuradoria (CA-1709)', () => {
  it('traduz para a POF, divide pela quantidade, tira onça, embalagem e serving, e uma por nome', () => {
    const medidas = medidasDaCuradoria({ nome: 'Quinoa, cozida', grupo: 'Cereais e derivados', preparo: 'cozido' }, [
      porcao('cup', 185),
      porcao('oz', 28, 1, 2),
      porcao('serving', 100, 1, 3),
      porcao('tbsp', 23, 2, 4),
      porcao('cup, packed', 200, 1, 5),
      porcao('package (10 oz)', 284, 1, 6),
    ])
    expect(medidas).toEqual([
      ['xícara de chá', 185],
      ['colher de sopa', 11.5],
    ])
  })

  it('carne e peixe só em peça; gordura só em colher; folha crua só em folha; peso máximo; o ovo "large" é a unidade', () => {
    expect(medidasDaCuradoria({ nome: 'Peixe, a', grupo: 'Pescados e frutos do mar', preparo: 'grelhado' }, [porcao('cup, flaked', 136), porcao('fillet', 87, 1, 2)])).toEqual([['filé', 87]])
    expect(medidasDaCuradoria({ nome: 'Óleo, a', grupo: 'Gorduras e óleos', preparo: null }, [porcao('cup', 218), porcao('tbsp', 13.6, 1, 2)])).toEqual([['colher de sopa', 13.6]])
    expect(medidasDaCuradoria({ nome: 'Alface, romana, crua', grupo: 'Verduras, hortaliças e derivados', preparo: 'cru' }, [porcao('cup, shredded', 47), porcao('leaf', 6, 1, 2)])).toEqual([['folha', 6]])
    expect(medidasDaCuradoria({ nome: 'Feijão, a', grupo: 'Leguminosas e derivados', preparo: 'cozido' }, [porcao('tbsp', 60)])).toEqual([])
    expect(medidasDaCuradoria({ nome: 'Ovo, de galinha, inteiro, pochê', grupo: 'Ovos e derivados', preparo: null }, [porcao('large', 50)])).toEqual([['unidade', 50]])
  })
})

describe('importar-base-ampliada: cache (CB-700)', () => {
  const SCRIPT = join(process.cwd(), 'scripts', 'dados', 'importar-base-ampliada.mjs')
  const rodar = (cache: string): string => {
    try {
      execFileSync(process.execPath, [SCRIPT, cache], { encoding: 'utf8', stdio: 'pipe' })
      return ''
    } catch (erro) {
      return String((erro as { stderr?: unknown }).stderr ?? '')
    }
  }
  let pasta = ''
  beforeEach(() => {
    pasta = mkdtempSync(join(tmpdir(), 'usda-cache-'))
  })
  afterEach(() => rmSync(pasta, { recursive: true, force: true }))

  it('sem o zip, para dizendo qual falta e de onde baixar, sem gravar', () => {
    const antes = readFileSync(join(process.cwd(), 'src', 'data', 'base-ampliada.json'), 'utf8')
    const erro = rodar(pasta)
    expect(erro).toContain('Falta FoodData_Central_sr_legacy_food_csv_2018-04.zip')
    expect(erro).toContain('https://fdc.nal.usda.gov/fdc-datasets/')
    expect(readFileSync(join(process.cwd(), 'src', 'data', 'base-ampliada.json'), 'utf8')).toBe(antes)
  })

  it('com o SHA-256 diferente, para', () => {
    writeFileSync(join(pasta, 'FoodData_Central_sr_legacy_food_csv_2018-04.zip'), 'não é o arquivo oficial')
    expect(rodar(pasta)).toMatch(/SHA-256 [0-9a-f]{64} diferente do esperado/)
  })
})
