// Spec busca-substitutos, revisão independente rodada 2 (04/11/2026). D-1125: a troca equivalente no mesmo grupo, a
// lista que abre sozinha (o macro dominante marcado, "Só do mesmo grupo" ligado). As regras se conferem aqui por fórmula,
// sem as funções do código: o macro dominante pelos fatores de Atwater (4, 4 e 9 kcal/g), a energia na porção pela regra
// de três e o pó pelo nome. Rodada 3 (04/11/2026): D-1133, o macro dominante só fora dos grupos da seção 3 da spec.
import arquivo from '../data/base-ampliada.json'
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from './baseAmpliada.ts'
import { buscarSubstitutos, ENERGIA_QUASE_ZERO_KCAL, mesmoAlimentoDe, naTrocaEquivalente, nutrienteInicial, textoDaPorcao, type Candidato } from './buscaDeSubstitutos.ts'
import { grupoDeSubstituicao } from './grupoDeSubstituicao.ts'
import { ehDeUsoComum, ehPoOuDesidratado, ehPrescritivel } from './prescritivel.ts'
import { montarRestricoes } from './restricoes.ts'
import { ALIMENTOS, alimentosParaSugerir, buscarAlimento, registrarBaseAmpliada } from './tabelas.ts'
import type { Alimento, ChaveNutrienteAlimento } from './tipos.ts'

const porNome = (nome: string): Alimento => {
  const a = [...ALIMENTOS, ...alimentosParaSugerir()].find((x) => x.descricao.trim() === nome)
  if (!a) throw new Error(`sem ${nome}`)
  return a
}

/** O macro que mais dá energia, pelos fatores de Atwater; `null` sem macro. */
function macroPelaFormula(a: Alimento): string | null {
  const kcal: [string, number][] = [
    ['proteina_g', (a.nutrientes.proteina_g ?? 0) * 4],
    ['carboidrato_g', (a.nutrientes.carboidrato_g ?? 0) * 4],
    ['lipideos_g', (a.nutrientes.lipideos_g ?? 0) * 9],
  ]
  const maior = kcal.reduce((x, y) => (y[1] > x[1] ? y : x))
  return maior[1] > 0 ? maior[0] : null
}

const energiaNaPorcao = (a: Alimento, gramas: number): number | null => {
  const v = a.nutrientes.energia_kcal
  return v === null ? null : (v * gramas) / 100
}
const EM_PO_OU_SECO = /(^|[\s,])pó($|[\s,])|desidratad|(^|[\s,-])(sec[oa]s?|passas?)($|[\s,])/i
const emPoOuSeco = (a: Alimento): boolean => EM_PO_OU_SECO.test(a.descricao) && !/cozid[oa]/i.test(a.descricao)

function vista(base: Alimento, gramas: number, nutrientes: readonly ChaveNutrienteAlimento[] = [nutrienteInicial(base)], mesmoGrupo = true, limite = 1000): readonly Candidato[] {
  const r = buscarSubstitutos({ alimentoId: base.id, gramas }, { nutrientes, mesmoGrupo, alimentos: alimentosParaSugerir(), limite }, buscarAlimento)
  return r.tipo === 'lista' ? r.candidatos : []
}

/** Os grupos da tabela da seção 3 da spec (D-1108); fora deles, "os demais", o grupo da tabela de composição. */
const GRUPOS_DA_SECAO_3: ReadonlySet<string> = new Set(['amido', 'pao', 'cereal-do-cafe', 'leguminosa', 'carne', 'ovo-queijo', 'leite', 'fruta', 'verdura', 'oleaginosa'])
const noGrupoDaSecao3 = (a: Alimento): boolean => GRUPOS_DA_SECAO_3.has(grupoDeSubstituicao(a).id)

/** O que fura alguma das três regras, para a mensagem do teste. */
function foraDaTroca(base: Alimento, gramas: number, c: Candidato): string | null {
  const a = c.alimento
  // D-1133: a regra (a) só quando o grupo do item ou do candidato é desconhecido.
  const valeOMacro = !noGrupoDaSecao3(base) || !noGrupoDaSecao3(a)
  if (valeOMacro && macroPelaFormula(a) !== macroPelaFormula(base)) return 'macro dominante diferente, fora dos grupos da seção 3'
  const kBase = base.nutrientes.energia_kcal
  if (kBase !== null && kBase > 4) {
    const k = energiaNaPorcao(a, c.gramas)
    const kItem = (kBase * gramas) / 100
    if (k === null) return 'sem energia na tabela (CB-1111)'
    if (k < kItem / 2 - 1e-9 || k > 2 * kItem + 1e-9) return `energia ×${(k / kItem).toFixed(2)}`
  }
  if (emPoOuSeco(a) && !emPoOuSeco(base)) return 'pó ou desidratado no lugar de quem não é'
  return null
}

beforeAll(() => registrarBaseAmpliada(decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada)))
afterAll(() => registrarBaseAmpliada([]))

describe('D-1125: a troca equivalente no mesmo grupo', () => {
  it('CA-2136: na lista que abre sozinha, os casos da revisão somem', () => {
    const nomes = (base: string, gramas: number) => vista(porNome(base), gramas).slice(0, 6).map((c) => `${c.alimento.descricao.trim()} · ${textoDaPorcao(c)}`)
    for (const [base, gramas] of [
      ['Leite, de vaca, integral', 100],
      ['Leite, de vaca, integral', 150],
      ['Iogurte, natural', 100],
      ['Iogurte, natural', 170],
    ] as const) {
      expect(nomes(base, gramas).filter((n) => /pó/.test(n)), `${base} ${gramas}`).toEqual([])
    }
    expect(vista(porNome('Banana, prata, crua'), 100).some((c) => /^Abacate/.test(c.alimento.descricao))).toBe(false)
    expect(vista(porNome('Pinhão, cozido'), 50).some((c) => /^Castanha/.test(c.alimento.descricao))).toBe(false)
    expect(vista(porNome('Ovo, de galinha, clara, cozida/10minutos'), 100).some((c) => /requeijão/.test(c.alimento.descricao))).toBe(false)
  })

  it('CA-2136: nos 6 da tela, nenhum passa do dobro da energia do item, nem fica abaixo da metade', () => {
    for (const [base, gramas] of [
      ['Leite, de vaca, integral', 150],
      ['Iogurte, natural', 170],
      ['Banana, prata, crua', 100],
      ['Maçã, Fuji, com casca, crua', 130],
      ['Arroz, tipo 1, cozido', 150],
      ['Feijão, carioca, cozido', 140],
    ] as const) {
      const item = porNome(base)
      const kItem = ((item.nutrientes.energia_kcal ?? 0) * gramas) / 100
      for (const c of vista(item, gramas).slice(0, 6)) {
        const k = energiaNaPorcao(c.alimento, c.gramas) ?? Number.NaN
        expect(k / kItem, `${base} → ${c.alimento.descricao}`).toBeGreaterThanOrEqual(0.5)
        expect(k / kItem, `${base} → ${c.alimento.descricao}`).toBeLessThanOrEqual(2)
      }
    }
  })

  it('CA-2136 e CB-1111: toda a TACO e a base ampliada como item, com 1 e 2 nutrientes, cumprem as três regras (a regra a, só fora dos grupos)', () => {
    const erros = new Map<string, string>()
    let candidatos = 0
    const bases = [...ALIMENTOS, ...alimentosParaSugerir().filter((a) => a.id > 100_000)]
    for (const base of bases) {
      const inicial = nutrienteInicial(base)
      const segundo: ChaveNutrienteAlimento = inicial === 'proteina_g' ? 'lipideos_g' : 'proteina_g'
      for (const nutrientes of [[inicial], [inicial, segundo]]) {
        for (const gramas of [30, 150]) {
          for (const c of vista(base, gramas, nutrientes)) {
            candidatos += 1
            const motivo = foraDaTroca(base, gramas, c)
            if (motivo && !erros.has(motivo)) erros.set(motivo, `${base.descricao.trim()} ${gramas} g ${nutrientes.join('+')} → ${c.alimento.descricao.trim()} · ${textoDaPorcao(c)}`)
          }
        }
      }
    }
    expect(candidatos).toBeGreaterThan(10_000)
    expect(Object.fromEntries(erros)).toEqual({})
  }, 600_000)

  it('CA-2137: com o filtro desligado, as três regras não valem', () => {
    const leite = porNome('Leite, de vaca, integral')
    const todos = vista(leite, 150, ['lipideos_g'], false, 1000)
    expect(todos.some((c) => foraDaTroca(leite, 150, c) !== null)).toBe(true)
  })

  it('CA-2137: o item desidratado aceita outro desidratado', () => {
    const ameixa = porNome('Ameixa, seca')
    const secos = vista(ameixa, 30).filter((c) => emPoOuSeco(c.alimento))
    expect(secos.length).toBeGreaterThan(0)
  })

  it('CA-2137: o item com energia quase zero (até 4 kcal em 100 g) ou sem energia não passa pela regra da energia', () => {
    expect(ENERGIA_QUASE_ZERO_KCAL).toBe(4)
    const alface = porNome('Alface, lisa, crua')
    const comEnergia = (kcal: number | null): Alimento => ({ ...alface, id: 900_301, nutrientes: { ...alface.nutrientes, energia_kcal: kcal } })
    const cenoura = porNome('Cenoura, cozida')
    // 100 g de cenoura cozida (30 kcal) no lugar de 100 g da "alface" com 3 kcal: 10 vezes a energia, e o mesmo macro.
    expect(macroPelaFormula(cenoura)).toBe(macroPelaFormula(alface))
    expect(naTrocaEquivalente(comEnergia(3), 100)(cenoura, 100)).toBe(true)
    expect(naTrocaEquivalente(comEnergia(4), 100)(cenoura, 100)).toBe(true)
    expect(naTrocaEquivalente(comEnergia(null), 100)(cenoura, 100)).toBe(true)
    expect(naTrocaEquivalente(comEnergia(5), 100)(cenoura, 100)).toBe(false)
  })

  it('CA-2137: as bordas da regra da energia, metade e dobro, entram', () => {
    const arroz = porNome('Arroz, tipo 1, cozido')
    const batata = porNome('Batata, inglesa, cozida')
    const kArroz = arroz.nutrientes.energia_kcal ?? 0
    const kBatata = batata.nutrientes.energia_kcal ?? 0
    const gramasPara = (vezes: number) => (vezes * kArroz * 100) / kBatata
    const naTroca = naTrocaEquivalente(arroz, 100)
    expect(naTroca(batata, gramasPara(0.5))).toBe(true)
    expect(naTroca(batata, gramasPara(2))).toBe(true)
    expect(naTroca(batata, gramasPara(0.49))).toBe(false)
    expect(naTroca(batata, gramasPara(2.01))).toBe(false)
  })

  it('CB-1111: com a regra da energia valendo, o candidato sem energia na tabela não entra', () => {
    const arroz = porNome('Arroz, tipo 1, cozido')
    const batata = porNome('Batata, inglesa, cozida')
    expect(naTrocaEquivalente(arroz, 150)({ ...batata, nutrientes: { ...batata.nutrientes, energia_kcal: null } }, 350)).toBe(false)
  })

  it('CA-2143 (D-1130): do arroz tipo 1, só uma variação do arroz, a integral, com o filtro ligado ou não', () => {
    const arroz = porNome('Arroz, tipo 1, cozido')
    for (const mesmoGrupo of [true, false]) {
      const arrozes = vista(arroz, 150, ['carboidrato_g'], mesmoGrupo, 1000)
        .filter((c) => /^Arroz,/.test(c.alimento.descricao))
        .map((c) => c.alimento.descricao)
      expect(arrozes, mesmoGrupo ? 'grupo' : 'todos').toEqual(['Arroz, integral, cozido'])
    }
    // A batata inglesa, a doce e a baroa são alimentos diferentes: o limite por nome das trocas não vem (CA-2103).
    const batatas = vista(arroz, 150, ['carboidrato_g']).filter((c) => /^Batata, (inglesa|doce|baroa), cozida$/.test(c.alimento.descricao))
    expect(batatas).toHaveLength(3)
  })

  it('CA-2143 (D-1130, rodada 3): do feijão carioca, o feijão preto; cada feijão é outro alimento e aparece uma vez só', () => {
    const carioca = porNome('Feijão, carioca, cozido')
    for (const nutrientes of [['proteina_g', 'carboidrato_g'], ['carboidrato_g']] as const) {
      const feijoes = vista(carioca, 140, nutrientes)
        .filter((c) => /^Feijão,/.test(c.alimento.descricao))
        .map((c) => c.alimento.descricao)
      expect(feijoes, nutrientes.join('+')).toContain('Feijão, preto, cozido')
      expect(new Set(feijoes).size, nutrientes.join('+')).toBe(feijoes.length)
    }
  })

  it('CA-2143 (D-1130): a fruta inteira não troca pela mesma fruta de outra variedade (D-422); o suco troca por uma', () => {
    for (const mesmoGrupo of [true, false]) {
      const bananas = vista(porNome('Banana, prata, crua'), 100, ['carboidrato_g'], mesmoGrupo, 1000).filter((c) => /^Banana,/.test(c.alimento.descricao))
      expect(bananas.map((c) => c.alimento.descricao)).toEqual([])
    }
    const laranjas = vista(porNome('Laranja, pêra, suco'), 200, ['carboidrato_g']).filter((c) => /^Laranja,/.test(c.alimento.descricao))
    expect(laranjas.length).toBeLessThanOrEqual(1)
  })

  it('CA-2144 (D-1131): no lugar da fruta inteira, nem suco nem polpa; no lugar do suco, a fruta inteira', () => {
    const sucoOuPolpa = (c: Candidato) => c.alimento.categoria === 'Frutas e derivados' && /(^|[\s,])(suco|polpa)($|[\s,])/i.test(c.alimento.descricao)
    for (const [nome, gramas] of [
      ['Banana, prata, crua', 100],
      ['Mamão, Papaia, cru', 150],
    ] as const) {
      expect(vista(porNome(nome), gramas).filter(sucoOuPolpa).map((c) => c.alimento.descricao), nome).toEqual([])
    }
    const doSuco = vista(porNome('Laranja, pêra, suco'), 200)
    expect(doSuco.some((c) => /^Laranja, [^,]+, crua$/.test(c.alimento.descricao))).toBe(true)
    // O in natura vem antes: o primeiro do suco é fruta inteira.
    expect(doSuco[0] && sucoOuPolpa(doSuco[0])).toBe(false)
  })

  it('CA-2144 (D-1131): com o filtro desligado, o suco vem depois do in natura da mesma faixa', () => {
    const banana = porNome('Banana, prata, crua')
    const todos = vista(banana, 100, ['carboidrato_g'], false, 1000)
    const sucoOuPolpa = (c: Candidato) => c.alimento.categoria === 'Frutas e derivados' && /(^|[\s,])(suco|polpa)($|[\s,])/i.test(c.alimento.descricao)
    const melhor = Math.min(...todos.map((c) => c.proximidade))
    const faixa = (c: Candidato) => Math.floor((c.proximidade - melhor) / 0.05 + 1e-9)
    const fora: string[] = []
    todos.forEach((suco, i) => {
      if (!sucoOuPolpa(suco)) return
      for (const depois of todos.slice(i + 1)) {
        // A ordem da D-1109: o de uso comum antes do pouco usual (item 2) vem antes da faixa (item 3) e do in natura (item 4).
        const inNatura = depois.alimento.categoria === 'Frutas e derivados' && !sucoOuPolpa(depois)
        const mesmoUso = ehDeUsoComum(depois.alimento) === ehDeUsoComum(suco.alimento)
        if (inNatura && mesmoUso && faixa(depois) === faixa(suco)) fora.push(`${suco.alimento.descricao} antes de ${depois.alimento.descricao}`)
      }
    })
    expect(todos.some(sucoOuPolpa)).toBe(true)
    expect(fora).toEqual([])
  })

  it('CA-2136: pó só no lugar de pó; o que volta cozido não é desidratado', () => {
    const leite = porNome('Leite, de vaca, integral')
    const emPo = porNome('Leite, de vaca, integral, pó')
    // A mesma energia e o mesmo macro: só a regra do pó tira.
    const gramas = ((leite.nutrientes.energia_kcal ?? 0) * 150) / (emPo.nutrientes.energia_kcal ?? 1)
    expect(macroPelaFormula(emPo)).toBe(macroPelaFormula(leite))
    expect(naTrocaEquivalente(leite, 150)(emPo, gramas)).toBe(false)
    expect(naTrocaEquivalente(emPo, gramas)(leite, 150)).toBe(true)
    for (const nome of ['Leite, de vaca, desnatado, pó', 'Uva-passa, preta, sem semente', 'Damasco, seco', 'Ameixa, seca', 'Coentro, folhas desidratadas']) {
      expect(ehPoOuDesidratado(porNome(nome)), nome).toBe(true)
    }
    for (const nome of ['Carne, bovina, seca, cozida', 'Ervilha, seca, partida, cozida', 'Aveia, flocos, crua', 'Leite, de vaca, integral']) {
      expect(ehPoOuDesidratado(porNome(nome)), nome).toBe(false)
    }
    // O nome livre, sem acento: "Leite em po integral".
    expect(ehPoOuDesidratado({ ...leite, descricao: 'Leite em po integral' })).toBe(true)
  })
})

describe('D-1133: o grupo da tabela já diz que a troca é equivalente', () => {
  const nomes = (base: string, gramas: number, nutriente: ChaveNutrienteAlimento, extras: { restricoes?: ReturnType<typeof montarRestricoes> } = {}) => {
    const r = buscarSubstitutos(
      { alimentoId: porNome(base).id, gramas },
      { nutrientes: [nutriente], mesmoGrupo: true, alimentos: alimentosParaSugerir(), limite: 1000, ...extras },
      buscarAlimento,
    )
    return r.tipo === 'lista' ? r.candidatos.map((c) => c.alimento.descricao.trim()) : [r.motivo]
  }
  const SOJA = 'Soja, extrato solúvel, natural, fluido'

  it('CA-2146: o leite integral troca com a bebida de soja, o iogurte e o desnatado; o desnatado, com o integral', () => {
    expect(nomes('Leite, de vaca, integral', 150, 'lipideos_g')).toEqual(expect.arrayContaining([SOJA, 'Iogurte, natural']))
    for (const n of ['proteina_g', 'carboidrato_g'] as const) {
      expect(nomes('Leite, de vaca, integral', 150, n), n).toEqual(expect.arrayContaining(['Leite, de vaca, desnatado, UHT', SOJA]))
    }
    expect(nomes('Leite, de vaca, desnatado, UHT', 200, 'carboidrato_g')).toContain('Leite, de vaca, integral')
  })

  it('CA-2146: com intolerância à lactose, a bebida de soja no lugar do leite integral e do iogurte', () => {
    const restricoes = montarRestricoes({ marcadas: ['lactose'], texto: '', doencas: [], naoGosta: '' })
    for (const n of ['lipideos_g', 'proteina_g', 'carboidrato_g'] as const) {
      expect(nomes('Leite, de vaca, integral', 150, n, { restricoes }), n).toContain(SOJA)
    }
    expect(nomes('Iogurte, natural', 170, 'lipideos_g', { restricoes })).toContain(SOJA)
  })

  it('CA-2146: o agrião tem verduras, e o tofu, o tremoço', () => {
    const verduras = nomes('Agrião, cru', 100, 'proteina_g')
    expect(verduras.length, verduras.join(' | ')).toBeGreaterThanOrEqual(5)
    expect(verduras.every((n) => grupoDeSubstituicao(porNome(n)).id === 'verdura')).toBe(true)
    expect(nomes('Soja, queijo (tofu)', 100, 'lipideos_g')).toContain('Tremoço, em conserva')
  })

  it('CA-2146: a energia e o pó continuam valendo: nem leite em pó no lugar do leite e do iogurte, nem abacate no lugar da banana', () => {
    for (const [base, gramas] of [
      ['Leite, de vaca, integral', 100],
      ['Leite, de vaca, integral', 150],
      ['Iogurte, natural', 100],
      ['Iogurte, natural', 170],
    ] as const) {
      for (const n of ['lipideos_g', 'proteina_g', 'carboidrato_g'] as const) {
        expect(nomes(base, gramas, n).filter((x) => /(^|[\s,])pó($|[\s,])/.test(x)), `${base} ${gramas} ${n}`).toEqual([])
      }
    }
    expect(nomes('Banana, prata, crua', 100, 'carboidrato_g').some((x) => /^Abacate/.test(x))).toBe(false)
    // A bebida de soja e o leite integral têm macros dominantes diferentes; no grupo dos leites, a troca vale.
    const leite = porNome('Leite, de vaca, integral')
    const soja = porNome(SOJA)
    expect(macroPelaFormula(soja)).not.toBe(macroPelaFormula(leite))
    const mesmaEnergia = ((leite.nutrientes.energia_kcal ?? 0) * 150) / (soja.nutrientes.energia_kcal ?? 1)
    expect(naTrocaEquivalente(leite, 150)(soja, mesmaEnergia)).toBe(true)
  })

  it('CA-2146: fora dos grupos da seção 3 (os pratos prontos), o macro dominante continua valendo', () => {
    const frango = porNome('Frango, com açafrão')
    const quibebe = porNome('Quibebe')
    expect(noGrupoDaSecao3(frango) || noGrupoDaSecao3(quibebe)).toBe(false)
    expect(grupoDeSubstituicao(frango).id).toBe(grupoDeSubstituicao(quibebe).id)
    expect(macroPelaFormula(frango)).not.toBe(macroPelaFormula(quibebe))
    const mesmaEnergia = ((frango.nutrientes.energia_kcal ?? 0) * 100) / (quibebe.nutrientes.energia_kcal ?? 1)
    expect(naTrocaEquivalente(frango, 100)(quibebe, mesmaEnergia)).toBe(false)
    expect(nomes('Frango, com açafrão', 100, 'lipideos_g')).not.toContain('Quibebe')
  })
})

describe('D-1130 e D-1134 (rodada 3): o mesmo alimento, em toda a lista', () => {
  const mesmo = (x: string, y: string) => mesmoAlimentoDe(porNome(x)) === mesmoAlimentoDe(porNome(y))

  it('CA-2148: o que difere só pelo preparo, pelo estado, pelo "tipo N" ou por "com/sem" é o mesmo alimento', () => {
    for (const [x, y] of [
      ['Arroz, tipo 1, cozido', 'Arroz, tipo 2, cozido'],
      ['Arroz, tipo 1, cozido', 'Arroz, parboilizado, cozido'],
      ['Pintado, assado', 'Pintado, grelhado'],
      ['Abadejo, filé, congelado, assado', 'Abadejo, filé, congelado,cozido'],
      ['Abadejo, filé, congelado, assado', 'Abadejo, filé, congelado, grelhado'],
      ['Carne, bovina, filé mingnon, sem gordura, grelhado', 'Carne, bovina, filé-mignon, sem gordura, assado'],
      ['Frango, peito, sem pele, grelhado', 'Frango, peito, com pele, assado'],
      ['Ovo, de galinha, inteiro, cozido/10minutos', 'Ovo, de galinha, inteiro, pochê'],
      ['Batata, inglesa, cozida', 'Batata, inglesa, com casca, assada'],
      ['Cereais, milho, flocos, com sal', 'Cereais, milho, flocos, sem sal'],
      ['Farinha, de mandioca, crua', 'Farinha, de mandioca, torrada'],
      ['Sardinha, assada', 'Sardinha, conserva em óleo'],
      ['Banana, prata, crua', 'Banana, nanica, crua'],
      ['Manga, Haden, crua', 'Manga, Palmer, crua'],
    ] as const) {
      expect(mesmo(x, y), `${x} = ${y}`).toBe(true)
    }
  })

  it('CA-2148: o resto do nome diz o alimento: tipos de queijo, de feijão e de batata, cortes, leites e o suco são outros', () => {
    for (const [x, y] of [
      ['Arroz, integral, cozido', 'Arroz, tipo 1, cozido'],
      ['Queijo, minas, frescal', 'Queijo, ricota'],
      ['Queijo, minas, frescal', 'Queijo, minas, meia cura'],
      ['Batata, inglesa, cozida', 'Batata, doce, cozida'],
      ['Batata, inglesa, cozida', 'Batata, baroa, cozida'],
      ['Carne, bovina, patinho, sem gordura, grelhado', 'Carne, bovina, alcatra, sem gordura, assada'],
      ['Feijão, carioca, cozido', 'Feijão, preto, cozido'],
      ['Leite, de vaca, integral', 'Leite, de vaca, desnatado, UHT'],
      ['Pão, trigo, francês', 'Pão, trigo, forma, integral'],
      ['Laranja, pêra, suco', 'Laranja, pêra, crua'],
    ] as const) {
      expect(mesmo(x, y), `${x} ≠ ${y}`).toBe(false)
    }
  })

  const nomesDaVista = (base: string, gramas: number) => vista(porNome(base), gramas).map((c) => c.alimento.descricao.trim())
  const queijos = (nomes: readonly string[]) => nomes.filter((n) => /^Queijo,/.test(n))

  it('CA-2147: cada queijo troca por outros queijos', () => {
    for (const gramas of [30, 100]) {
      const n = nomesDaVista('Queijo, minas, frescal', gramas)
      expect(queijos(n).length, `${gramas} g: ${n.join(' | ')}`).toBeGreaterThanOrEqual(3)
    }
    // Os queijos que a nutricionista prescreve (o petit suisse de morango é ultraprocessado).
    for (const queijo of ALIMENTOS.filter((a) => /^Queijo,/.test(a.descricao.trim()) && ehPrescritivel(a))) {
      const n = nomesDaVista(queijo.descricao.trim(), 30)
      expect(queijos(n).length, `${queijo.descricao}: ${n.join(' | ')}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('CA-2147: a batata inglesa traz a batata-doce e a baroa, e o arroz uma vez só', () => {
    const n = nomesDaVista('Batata, inglesa, cozida', 150)
    expect(n).toEqual(expect.arrayContaining(['Batata, doce, cozida', 'Batata, baroa, cozida']))
    expect(n.filter((x) => /^Arroz, tipo [12], cozido$/.test(x)), n.join(' | ')).toHaveLength(1)
  })

  it('CA-2147: o patinho traz outros cortes bovinos, e nenhum alimento em duas formas', () => {
    const n = nomesDaVista('Carne, bovina, patinho, sem gordura, grelhado', 100)
    expect(n.filter((x) => /^Carne, bovina,/.test(x)).length, n.join(' | ')).toBeGreaterThanOrEqual(2)
    expect(n.filter((x) => /^Pintado,/.test(x)).length, n.join(' | ')).toBeLessThanOrEqual(1)
    expect(n.filter((x) => /^Abadejo,/.test(x)).length, n.join(' | ')).toBeLessThanOrEqual(1)
  })

  it('CA-2147: em toda busca, nenhum candidato é o mesmo alimento do item nem o de outro candidato', () => {
    const erros = new Map<string, string>()
    const bases = [...ALIMENTOS, ...alimentosParaSugerir().filter((a) => a.id > 100_000)]
    for (const base of bases) {
      for (const mesmoGrupo of [true, false]) {
        const candidatos = vista(base, 100, [nutrienteInicial(base)], mesmoGrupo, 1000)
        const vistos = new Map<string, string>()
        for (const c of candidatos) {
          const alimento = mesmoAlimentoDe(c.alimento)
          const onde = `${base.descricao.trim()} (${mesmoGrupo ? 'grupo' : 'todos'}) → ${c.alimento.descricao.trim()}`
          if (alimento === mesmoAlimentoDe(base) && !erros.has('o mesmo alimento do item')) erros.set('o mesmo alimento do item', onde)
          const antes = vistos.get(alimento)
          if (antes !== undefined && !erros.has('dois do mesmo alimento')) erros.set('dois do mesmo alimento', `${onde} e ${antes}`)
          vistos.set(alimento, c.alimento.descricao.trim())
        }
      }
    }
    expect(Object.fromEntries(erros)).toEqual({})
  }, 600_000)
})
