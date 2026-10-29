// Spec base-ampliada, CA-1700 a CA-1710, CB-700, CB-701 e CB-703: a base ampliada do USDA e os scripts que a geram.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CHAVES, energiaIncoerente, FOLATO_ENRIQUECIDO, folatoTotalEnriquecido, GRUPOS, MAXIMOS, PREPAROS, PRIMEIRO_ID, ULTIMO_ID, medidasDaCuradoria, montarBase, type AlimentoDaBase, type ItemDaCuradoria } from '../../scripts/dados/importar-base-ampliada.mjs'
import { valoresDoAlimento, type AlimentoUsda, type PorcaoUsda } from '../../scripts/dados/usda-fonte.mjs'
import { energiaIncoerente as energiaIncoerenteDoApp } from '../domain/produtos.ts'
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

  it('D-716m: o aviso de terceiros conta os alimentos da base de hoje', () => {
    const avisos = readFileSync(join(process.cwd(), 'THIRD_PARTY_NOTICES.md'), 'utf8')
    expect(avisos).toContain(`Os ${alimentos.length} alimentos de \`src/data/base-ampliada.json\``)
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

  it('CA-1704 (D-708 revista): todo alimento tem energia, coerente com os macros pelos fatores de Atwater da fonte', () => {
    for (const a of alimentos) {
      const v = Object.fromEntries(CHAVES.map((c, i) => [c, a.valores[i] ?? null]))
      expect(v.energia_kcal, a.nome).not.toBeNull()
      expect(energiaIncoerente(v, a.atwater ?? null), a.nome).toBe(false)
    }
    // Os de fibra alta que a regra 4/4/9 tirava voltam (decisão do coordenador, 29/10/2026).
    for (const nome of ['Farelo, de aveia, cru', 'Farelo, de trigo, cru', 'Cacau, em pó', 'Canela, em pó', 'Alfarroba, farinha', 'Limão-siciliano, cru', 'Orégano, seco']) {
      expect(porNome(nome), nome).toBeDefined()
    }
    expect(porNome('Cacau, em pó')?.atwater).toEqual([1.83, 8.37, 1.33])
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
  alergenicos: ['peixe'],
  ...extra,
})
const SEM_TACO = new Set<string>()
const semAlergenicos = (i: ItemDaCuradoria): ItemDaCuradoria => Object.fromEntries(Object.entries(i).filter(([k]) => k !== 'alergenicos')) as unknown as ItemDaCuradoria

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
    expect(grelhado?.alergenicos).toEqual(['peixe'])
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
    ['sem alergênicos (D-716b)', [semAlergenicos(incluir(3, 100002, 'Peixe, a'))], SEM_TACO, undefined, /alergenicos precisa ser uma lista/],
    ['alergênico desconhecido (D-716b)', [incluir(3, 100002, 'Peixe, a', { alergenicos: ['mostarda'] })], SEM_TACO, undefined, /alergenicos precisa ser uma lista/],
    ['alergênico repetido (D-716b)', [incluir(3, 100002, 'Peixe, a', { alergenicos: ['peixe', 'peixe'] })], SEM_TACO, undefined, /alergenicos precisa ser uma lista/],
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

  it('D-716j: bife, filé e asa acima de 200 g não viram medida; queijo não se mede em xícara', () => {
    expect(medidasDaCuradoria({ nome: 'Carne, a, grelhada', grupo: 'Carnes e derivados', preparo: 'grelhado' }, [porcao('steak', 277), porcao('piece', 85, 1, 2)])).toEqual([['pedaço', 85]])
    expect(medidasDaCuradoria({ nome: 'Peixe, a', grupo: 'Pescados e frutos do mar', preparo: 'grelhado' }, [porcao('fillet', 318)])).toEqual([])
    expect(medidasDaCuradoria({ nome: 'Peru, asa, assada', grupo: 'Carnes e derivados', preparo: 'assado' }, [porcao('wing', 375)])).toEqual([])
    expect(medidasDaCuradoria({ nome: 'Peixe, b', grupo: 'Pescados e frutos do mar', preparo: 'grelhado' }, [porcao('fillet', 200)])).toEqual([['filé', 200]])
    expect(medidasDaCuradoria({ nome: 'Queijo, a', grupo: 'Leite e derivados', preparo: null }, [porcao('cup, diced', 132), porcao('slice', 28, 1, 2)])).toEqual([['fatia', 28]])
  })

  it('D-716p: bisteca e pedaço (a peça avulsa) acima de 200 g também não viram medida', () => {
    expect(medidasDaCuradoria({ nome: 'Vitela, a, grelhada', grupo: 'Carnes e derivados', preparo: 'grelhado' }, [porcao('chop', 352)])).toEqual([])
    expect(medidasDaCuradoria({ nome: 'Carne, a, cozida', grupo: 'Carnes e derivados', preparo: 'cozido' }, [porcao('piece', 289)])).toEqual([])
    expect(medidasDaCuradoria({ nome: 'Carne, b, cozida', grupo: 'Carnes e derivados', preparo: 'cozido' }, [porcao('piece', 150)])).toEqual([['pedaço', 150]])
    for (const a of alimentos) {
      for (const [nome, gramas] of a.medidas) if (['bisteca', 'pedaço'].includes(nome)) expect(gramas, `${a.nome}: ${nome}`).toBeLessThanOrEqual(200)
    }
    for (const id of [100257, 100169]) expect(alimentos.find((a) => a.id === id)?.medidas.filter(([, g]) => g > 200), String(id)).toEqual([])
  })

  it('D-716j: no arquivo, nenhum bife, filé ou asa passa de 200 g, e nenhum queijo tem xícara', () => {
    for (const a of alimentos) {
      for (const [nome, gramas] of a.medidas) {
        if (['bife', 'filé', 'asa'].includes(nome)) expect(gramas, `${a.nome}: ${nome}`).toBeLessThanOrEqual(200)
        if (a.nome.startsWith('Queijo')) expect(nome, a.nome).not.toBe('xícara de chá')
      }
    }
  })
})

describe('importar-base-ampliada: folatoTotalEnriquecido (D-716s)', () => {
  const cereal = (folatoTotal: number) => falso(10, 'Foundation Foods', 'Flour, test', { 1008: 360, 1003: 12, 1004: 1.5, 1005: 73, 1177: folatoTotal })
  const par = (folatoDoAlimento: number, acidoFolico: number) => falso(11, 'SR Legacy', 'Flour, test, unenriched', { 1008: 360, 1003: 12, 1004: 1.5, 1005: 73, 1177: folatoDoAlimento + acidoFolico, 1186: acidoFolico, 1187: folatoDoAlimento })

  it('o limite é explícito: 50% e 40 µg acima do folato do alimento no par do SR', () => {
    expect(FOLATO_ENRIQUECIDO).toEqual({ razao: 1.5, diferencaMcg: 40 })
  })

  it('nulo quando o par do SR tem ácido fólico, ou quando o total passa do limite', () => {
    expect(folatoTotalEnriquecido(cereal(157), par(25, 86), 'Cereais e derivados')).toBe(true)
    expect(folatoTotalEnriquecido(cereal(168), par(72, 0), 'Cereais e derivados')).toBe(true)
    expect(folatoTotalEnriquecido(cereal(124), par(69, 0), 'Cereais e derivados')).toBe(true)
  })

  it('fica quando está abaixo de um dos dois limites, fora dos cereais, sem par ou com DFE publicado', () => {
    expect(folatoTotalEnriquecido(cereal(64.4), par(75, 0), 'Cereais e derivados')).toBe(false)
    expect(folatoTotalEnriquecido(cereal(16), par(4, 0), 'Cereais e derivados')).toBe(false)
    expect(folatoTotalEnriquecido(cereal(182), par(52, 0), 'Verduras, hortaliças e derivados')).toBe(false)
    expect(folatoTotalEnriquecido(cereal(168), null, 'Cereais e derivados')).toBe(false)
    const comDfe = falso(12, 'Foundation Foods', 'Flour, test', { 1008: 360, 1003: 12, 1004: 1.5, 1005: 73, 1177: 168, 1190: 168 })
    expect(folatoTotalEnriquecido(comDfe, par(72, 0), 'Cereais e derivados')).toBe(false)
  })
})

describe('importar-base-ampliada: energiaIncoerente (D-708 revista)', () => {
  // Cacau em pó do SR Legacy (fdcId 169593): 228 kcal pelos fatores de Atwater dele (1,83, 8,37 e 1,33).
  const CACAU = { energia_kcal: 228, proteina_g: 19.6, lipideos_g: 13.7, carboidrato_g: 57.9, fibra_g: 37 }
  const FATORES_DO_CACAU = [1.83, 8.37, 1.33] as const
  // Farinha de alfarroba (173755): sem fatores publicados e 39,8 g de fibra.
  const ALFARROBA = { energia_kcal: 222, proteina_g: 4.62, lipideos_g: 0.65, carboidrato_g: 88.88, fibra_g: 39.8 }

  it('com os fatores da fonte, a energia publicada fecha; 4/4/9 do app não fecharia', () => {
    expect(energiaIncoerente(CACAU, FATORES_DO_CACAU)).toBe(false)
    expect(energiaIncoerenteDoApp(CACAU)).toBe(true)
  })

  it('pega o erro de verdade: energia × 1000, carboidrato e gordura trocados, proteína e gordura trocadas', () => {
    expect(energiaIncoerente({ ...CACAU, energia_kcal: 228_000 }, FATORES_DO_CACAU)).toBe(true)
    expect(energiaIncoerente({ ...CACAU, carboidrato_g: 13.7, lipideos_g: 57.9 }, FATORES_DO_CACAU)).toBe(true)
    expect(energiaIncoerente({ ...CACAU, proteina_g: 13.7, lipideos_g: 19.6 }, FATORES_DO_CACAU)).toBe(true)
  })

  it('sem fatores, a fibra conta 2 kcal/g e, com 10 g ou mais de fibra, a tolerância é de 30%; o erro de verdade continua pego', () => {
    expect(energiaIncoerente(ALFARROBA, null)).toBe(false)
    expect(energiaIncoerente({ ...ALFARROBA, energia_kcal: 222_000 }, null)).toBe(true)
    expect(energiaIncoerente({ ...ALFARROBA, carboidrato_g: 0.65, lipideos_g: 88.88 }, null)).toBe(true)
    // Pouca fibra: a tolerância de 20% de sempre.
    expect(energiaIncoerente({ energia_kcal: 100, proteina_g: 20, lipideos_g: 10, carboidrato_g: 0, fibra_g: 0 }, null)).toBe(true)
    expect(energiaIncoerente({ energia_kcal: 128, proteina_g: 26.15, lipideos_g: 2.65, carboidrato_g: 0, fibra_g: 0 }, null)).toBe(false)
  })

  it('montarBase aceita o alimento de fibra alta pelos fatores da fonte', () => {
    const cacau: AlimentoUsda = { ...falso(9, 'SR Legacy', 'Cocoa, test', { 1008: 228, 1003: 19.6, 1004: 13.7, 1005: 57.9, 1079: 37 }), fatores: [1.83, 8.37, 1.33] }
    const { alimentos: saida } = montarBase([incluir(9, 100009, 'Cacau, teste, em pó', { grupo: 'Miscelâneas', preparo: null })], new Map([[9, cacau]]), SEM_TACO)
    expect(saida[0]?.atwater).toEqual([1.83, 8.37, 1.33])
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

describe('D-716b: alergênicos da curadoria (achado 1 da revisão)', () => {
  const ALERGENICOS = ['trigo', 'gluten', 'leite', 'lactose', 'ovo', 'soja', 'amendoim', 'castanhas', 'peixe', 'frutos-do-mar']
  const incluidos = curadoria.filter((c) => c.decisao === 'incluir')

  it('todo item incluído tem o campo, só com alergênicos conhecidos, sem repetir e na ordem da lista', () => {
    for (const c of incluidos) {
      expect(Array.isArray(c.alergenicos), c.nome).toBe(true)
      const lista = c.alergenicos ?? []
      expect(lista, c.nome).toEqual(ALERGENICOS.filter((a) => lista.includes(a)))
    }
  })

  it('conferido contra o nome em inglês: o que o nome diz está no campo', () => {
    const SEM_GLUTEN = /gluten-free|^Rice noodles|cellophane|^Tortilla, corn|^Buckwheat|^Flour, buckwheat/i
    const diz: Readonly<Record<string, (o: string, g: string) => boolean>> = {
      trigo: (o) => !SEM_GLUTEN.test(o) && /\b(wheat|bulgur|couscous|semolina|spelt|durum|bread|pita|croissants?|focaccia|phyllo|crackers?|pasta|noodles|soba)\b/i.test(o),
      gluten: (o) => /\b(barley|rye|oats?|oat bran)\b/i.test(o),
      leite: (o, g) => g === 'Leite e derivados' || (/\b(cheese|milk|yogurt|kefir|whey|butter(?!nut))\b/i.test(o) && !/(peanut|almond|cashew|sesame) butter|coconut/i.test(o)),
      ovo: (o, g) => g === 'Ovos e derivados' || /\beggs?\b|mayonnaise|^Pasta, fresh/i.test(o),
      soja: (o) => /\b(soy|soybeans?|tofu|tempeh|edamame|miso|natto)\b/i.test(o),
      amendoim: (o) => /peanut/i.test(o),
      castanhas: (o) => /\b(almonds?|cashews?|chestnuts|hazelnuts|filberts|macadamia|pecans|pine nuts|pistachio|walnuts?)\b/i.test(o),
      peixe: (o, g) => g === 'Pescados e frutos do mar' && !/crustaceans|mollusks|lobster|scallops|squid|shrimp|crab|clam|oyster|mussel|octopus/i.test(o),
      'frutos-do-mar': (o) => !/^Mushroom/i.test(o) && /crustaceans|mollusks|lobster|scallops|squid|shrimp|crab|clam|oyster|mussel|octopus|surimi/i.test(o),
    }
    for (const c of incluidos) {
      for (const [alergenico, regra] of Object.entries(diz)) {
        if (regra(c.original ?? '', c.grupo ?? '')) expect(c.alergenicos, `${c.nome} (${c.original ?? ''}): ${alergenico}`).toContain(alergenico)
      }
    }
  })

  it('o arquivo gerado leva o campo quando ele não é vazio', () => {
    const porId = new Map(alimentos.map((a) => [a.id, a]))
    for (const c of incluidos) {
      const lista = c.alergenicos ?? []
      expect(porId.get(c.id ?? 0)?.alergenicos ?? [], c.nome).toEqual(lista)
    }
  })
})

describe('nomes e sugeríveis da revisão (achados 5 a 7)', () => {
  const porId = (id: number) => alimentos.find((a) => a.id === id)

  it('D-716f: o tofu firme diz o coagulante, também no nome que o paciente vê', () => {
    expect(porId(100296)?.nome).toBe('Tofu, firme, com sulfato de cálcio')
    expect(porId(100296)?.paciente).toBe('Tofu firme com sulfato de cálcio')
  })

  it('D-716g: o "whiting" do USDA é merluza, não pescada-branca; o cru continua fora porque a TACO tem a merluza crua', () => {
    expect(porId(100052)?.nome).toBe('Merluza, filé, grelhado')
    expect(porId(100052)?.paciente).toBe('Filé de merluza grelhado')
    expect(alimentos.some((a) => /pescada/i.test(a.nome))).toBe(false)
    const cru = curadoria.find((c) => c.fdcId === 173713)
    expect(cru?.decisao).toBe('excluir')
    expect(cru?.motivo).toMatch(/merluza/i)
  })

  it('D-716h: a polaca grelhada com aditivo (sódio de 419 mg) diz isso no nome e não é sugerível; a cozida, sem aditivo, é', () => {
    const comAditivo = porId(100036)
    expect(comAditivo?.nome).toBe('Polaca-do-alasca, filé, grelhada, com aditivo')
    expect(comAditivo?.paciente).toMatch(/com aditivo/)
    expect(comAditivo?.sugerivel).toBe(false)
    expect(comAditivo ? valor(comAditivo, 'sodio_mg') : null).toBe(419)
    const semAditivo = porId(100035)
    expect(semAditivo?.original).not.toMatch(/additive/i)
    expect(semAditivo?.sugerivel).toBe(true)
    // Nenhum sugerível tem aditivo no nome da fonte.
    for (const a of alimentos.filter((x) => x.sugerivel)) expect(a.original, a.nome).not.toMatch(/additive/i)
  })

  it('D-716k: massa fresca de espinafre, pão sem glúten e macarrão integral cru da Foundation sem B1, B2 e B3 da fortificação americana; o pão de forma sem o folato', () => {
    for (const id of [100365, 100366, 100397, 100398, 100364]) {
      const a = porId(id)
      for (const chave of ['tiamina_mg', 'riboflavina_mg', 'niacina_mg']) expect(a ? valor(a, chave) : 'sem', `${a?.nome ?? id}: ${chave}`).toBeNull()
    }
    const forma = porId(100407)
    expect(forma ? valor(forma, 'folato_dfe_mcg') : 'sem').toBeNull()
    // O resto do alimento continua: energia, ferro e cálcio.
    expect(forma ? valor(forma, 'energia_kcal') : null).toBeGreaterThan(0)
    expect(porId(100364)?.conjunto).toBe('Foundation Foods')
  })

  it('D-716s: regra única do folato total enriquecido, nos itens da base', () => {
    for (const id of [100407, 100419, 100418, 100351, 100364]) {
      const a = porId(id)
      expect(a ? valor(a, 'folato_dfe_mcg') : 'sem', a?.nome ?? String(id)).toBeNull()
    }
    // Abaixo do limite, ou fora dos cereais, o folato fica.
    for (const [id, folato] of [[100400, 64.4], [100354, 44], [100571, 68], [100426, 182]] as const) {
      const a = porId(id)
      expect(a ? valor(a, 'folato_dfe_mcg') : null, a?.nome ?? String(id)).toBe(folato)
    }
    // A regra substitui a lista: nenhum item marca o folato à mão.
    expect(curadoria.filter((c) => c.naoCopiar?.includes('folato_dfe_mcg')).map((c) => c.id)).toEqual([])
  })

  it('D-716r: a tortilha de trigo fica sem o folato, como o pão de forma; o pão multigrãos, sem sinal de ácido fólico, fica com ele', () => {
    const tortilha = porId(100419)
    expect(tortilha ? valor(tortilha, 'folato_dfe_mcg') : 'sem').toBeNull()
    const multigraos = porId(100400)
    expect(multigraos ? valor(multigraos, 'folato_dfe_mcg') : null).toBe(64.4)
  })
})
