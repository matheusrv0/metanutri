// Spec busca-substitutos, revisão independente rodada 2 (04/11/2026). D-1125: a troca equivalente no mesmo grupo, a
// lista que abre sozinha (o macro dominante marcado, "Só do mesmo grupo" ligado). As regras se conferem aqui por fórmula,
// sem as funções do código: o macro dominante pelos fatores de Atwater (4, 4 e 9 kcal/g), a energia na porção pela regra
// de três e o pó pelo nome.
import arquivo from '../data/base-ampliada.json'
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from './baseAmpliada.ts'
import { buscarSubstitutos, ENERGIA_QUASE_ZERO_KCAL, naTrocaEquivalente, nutrienteInicial, textoDaPorcao, type Candidato } from './buscaDeSubstitutos.ts'
import { ehDeUsoComum, ehPoOuDesidratado } from './prescritivel.ts'
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

/** O que fura alguma das três regras, para a mensagem do teste. */
function foraDaTroca(base: Alimento, gramas: number, c: Candidato): string | null {
  const a = c.alimento
  if (macroPelaFormula(a) !== macroPelaFormula(base)) return 'macro dominante diferente'
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

  it('CA-2136 e CB-1111: toda a TACO e a base ampliada como item, com 1 e 2 nutrientes, cumprem as três regras', () => {
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

  it('CA-2143 (D-1130): do feijão carioca, a variação mais consumida (POF), o feijão preto, e nenhum outro feijão', () => {
    const carioca = porNome('Feijão, carioca, cozido')
    for (const nutrientes of [['proteina_g', 'carboidrato_g'], ['carboidrato_g']] as const) {
      const feijoes = vista(carioca, 140, nutrientes).filter((c) => /^Feijão,/.test(c.alimento.descricao))
      expect(feijoes.map((c) => c.alimento.descricao), nutrientes.join('+')).toEqual(['Feijão, preto, cozido'])
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
