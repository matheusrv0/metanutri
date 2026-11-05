// Spec busca-substitutos: a conta, a porção, as frases, os filtros, as restrições, a ordem e a comparação.
// Os números de CA-2103 a CA-2105 são os do protótipo aprovado em 03/11/2026 (D-1119), cuja réplica da medida caseira
// bateu com o app em 17.014 casos.
import arquivo from '../data/base-ampliada.json'
import { decodificarBaseAmpliada, type ArquivoBaseAmpliada } from './baseAmpliada.ts'
import {
  buscarSubstitutos,
  compararNaPorcao,
  fraseDaDiferenca,
  LIMITE_DA_BUSCA,
  mensagemSemCandidato,
  nutrienteInicial,
  OUTROS_NUTRIENTES_DA_BUSCA,
  textoDaPorcao,
  faixaDeProximidade,
  type Candidato,
  type OpcoesDaBusca,
  type ResultadoDaBusca,
} from './buscaDeSubstitutos.ts'
import { CAFE_OU_CHA, ehDeUsoComum, ehFrito, ehPratoComposto, ehPrescritivel, ehUltraprocessado } from './prescritivel.ts'
import { comCuidadosDaFase, montarRestricoes, SEM_RESTRICOES } from './restricoes.ts'
import { ALIMENTOS, alimentosParaSugerir, buscarAlimento, registrarBaseAmpliada, registrarProdutos } from './tabelas.ts'
import type { Alimento, ChaveNutrienteAlimento } from './tipos.ts'
import { MICRONUTRIENTES_ADEQUACAO } from './adequacao.ts'
import { MEDIDAS_DE_CONTAR, MAXIMO_DE_PEDACOS } from './busca.ts'

const ARROZ = 3
const FRANGO_GRELHADO = 410
const FEIJAO_CARIOCA = 561
const OVO_COZIDO = 488
const BROCOLIS_COZIDO = 100

const CHO: ChaveNutrienteAlimento = 'carboidrato_g'
const PTN: ChaveNutrienteAlimento = 'proteina_g'
const LIP: ChaveNutrienteAlimento = 'lipideos_g'

const BASE_AMPLIADA = decodificarBaseAmpliada(arquivo as unknown as ArquivoBaseAmpliada)

function buscar(alimentoId: number, gramas: number, nutrientes: readonly ChaveNutrienteAlimento[], extras: Partial<OpcoesDaBusca> = {}): ResultadoDaBusca {
  return buscarSubstitutos({ alimentoId, gramas }, { nutrientes, mesmoGrupo: true, alimentos: alimentosParaSugerir(), ...extras }, buscarAlimento)
}

function lista(resultado: ResultadoDaBusca): readonly Candidato[] {
  if (resultado.tipo !== 'lista') throw new Error(`sem lista: ${resultado.motivo}`)
  return resultado.candidatos
}

/** "Polenta, pré-cozida · 3 colheres de servir · 180 g · 0,1 g de carboidrato a menos". */
const cartao = (c: Candidato): string => [c.alimento.descricao, textoDaPorcao(c), ...c.diferencas.map((d) => d.texto)].join(' · ')
const cartaoDe = (candidatos: readonly Candidato[], nome: string): string | undefined => {
  const c = candidatos.find((x) => x.alimento.descricao.trim() === nome)
  return c ? cartao(c) : undefined
}

describe('D-1110: o nutriente que vem marcado ao abrir', () => {
  it('CA-2102: o macro que mais dá energia ao alimento', () => {
    const porId = (id: number) => buscarAlimento(id) as Alimento
    expect(nutrienteInicial(porId(ARROZ))).toBe(CHO)
    expect(nutrienteInicial(porId(FRANGO_GRELHADO))).toBe(PTN)
    // Castanha-do-Brasil: a gordura.
    expect(nutrienteInicial(porId(589))).toBe(LIP)
  })

  it('a lista de "Outro nutriente": energia, fibra e os micronutrientes da Adequação', () => {
    expect(OUTROS_NUTRIENTES_DA_BUSCA[0]).toBe('energia_kcal')
    for (const chave of MICRONUTRIENTES_ADEQUACAO) expect(OUTROS_NUTRIENTES_DA_BUSCA).toContain(chave)
    expect(OUTROS_NUTRIENTES_DA_BUSCA).not.toContain(CHO)
  })
})

describe('D-1103 a D-1105: a conta, com o gabarito do protótipo (D-1119)', () => {
  it('CA-2103: arroz tipo 1 cozido, 150 g, por carboidrato, no mesmo grupo', () => {
    const candidatos = lista(buscar(ARROZ, 150, [CHO]))
    expect(cartaoDe(candidatos, 'Polenta, pré-cozida')).toBe('Polenta, pré-cozida · 3 colheres de servir · 180 g · 0,1 g de carboidrato a menos')
    expect(cartaoDe(candidatos, 'Batata, inglesa, cozida')).toBe('Batata, inglesa, cozida · 2 unidades e meia · 350 g · 0,3 g de carboidrato a menos')
    expect(cartaoDe(candidatos, 'Cará, cozido')).toBe('Cará, cozido · 7 colheres de sopa e meia · 225 g · 0,3 g de carboidrato a mais')
    expect(cartaoDe(candidatos, 'Cuscuz, de milho, cozido com sal')).toBe(
      'Cuscuz, de milho, cozido com sal · 7 colheres de servir · 168 g · 0,4 g de carboidrato a mais',
    )
    expect(cartaoDe(candidatos, 'Batata, baroa, cozida')).toBe('Batata, baroa, cozida · 4 colheres de servir · 220 g · 0,4 g de carboidrato a menos')
    expect(cartaoDe(candidatos, 'Batata, doce, cozida')).toBe('Batata, doce, cozida · 5 colheres de sopa e meia · 231 g · 0,5 g de carboidrato a mais')
    expect(cartaoDe(candidatos, 'Arroz, integral, cozido')).toBe('Arroz, integral, cozido · 8 colheres de sopa · 160 g · 0,8 g de carboidrato a menos')
  })

  it('CA-2103: a porção guarda a medida que vai para o plano (D-379)', () => {
    const batata = lista(buscar(ARROZ, 150, [CHO])).find((c) => c.alimento.id === 91)
    expect(batata?.gramas).toBe(350)
    expect(batata?.medida).toEqual({ nome: 'unidade', quantidade: 2.5, gramasPorMedida: 140 })
  })

  it('CA-2104: carboidrato e proteína; quem fica com ajuste acima de 25% sai', () => {
    const candidatos = lista(buscar(ARROZ, 150, [CHO, PTN]))
    expect(cartaoDe(candidatos, 'Cuscuz, de milho, cozido com sal')).toBe(
      'Cuscuz, de milho, cozido com sal · 7 colheres de servir · 168 g · 0,4 g de carboidrato a mais · 0,2 g de proteína a menos',
    )
    expect(cartaoDe(candidatos, 'Batata, inglesa, cozida')).toBe(
      'Batata, inglesa, cozida · 2 unidades e meia · 350 g · 0,3 g de carboidrato a menos · 0,3 g de proteína a mais',
    )
    expect(cartaoDe(candidatos, 'Polenta, pré-cozida')).toBe(
      'Polenta, pré-cozida · 5 colheres de sopa · 175 g · 1,3 g de carboidrato a menos · 0,2 g de proteína a mais',
    )
    for (const nome of ['Mandioca, cozida', 'Batata, doce, cozida', 'Batata, baroa, cozida']) expect(cartaoDe(candidatos, nome)).toBeUndefined()
    for (const c of candidatos) expect(c.ajuste).not.toBeNull()
    for (const c of candidatos) expect(c.ajuste ?? 1).toBeLessThanOrEqual(0.25)
  })

  it('CA-2105: frango por proteína e lipídeo; feijão por proteína e carboidrato', () => {
    const doFrango = lista(buscar(FRANGO_GRELHADO, 100, [PTN, LIP]))
    expect(doFrango.find((c) => c.alimento.id === 368)?.gramas).toBe(103)
    for (const id of [377, 370, 301]) expect(doFrango.some((c) => c.alimento.id === id)).toBe(false)

    const doFeijao = lista(buscar(FEIJAO_CARIOCA, 140, [PTN, CHO]))
    expect(cartaoDe(doFeijao, 'Feijão, preto, cozido')).toBe(
      'Feijão, preto, cozido · 1 concha · 140 g · 0,4 g de proteína a menos · 0,6 g de carboidrato a mais',
    )
  })

  it('com 1 nutriente, a mesma porção da calculadora de hoje (sem nota de ajuste)', () => {
    const candidatos = lista(buscar(ARROZ, 150, [CHO]))
    for (const c of candidatos) expect(c.ajuste).toBeNull()
  })
})

describe('D-1105: a frase da diferença', () => {
  it('CA-2106: a mais, a menos e igual', () => {
    expect(fraseDaDiferenca(CHO, 0.72)).toEqual({ texto: '0,7 g de carboidrato a mais', igual: false })
    expect(fraseDaDiferenca(PTN, -1.24)).toEqual({ texto: '1,2 g de proteína a menos', igual: false })
    expect(fraseDaDiferenca(LIP, 0.3)).toEqual({ texto: '0,3 g de lipídeo a mais', igual: false })
    expect(fraseDaDiferenca(CHO, 0.04)).toEqual({ texto: 'Carboidrato igual', igual: true })
    expect(fraseDaDiferenca(CHO, -0.04)).toEqual({ texto: 'Carboidrato igual', igual: true })
  })

  it('CA-2106: energia sem casa; micronutriente com uma casa abaixo de 100 e nenhuma de 100 em diante', () => {
    expect(fraseDaDiferenca('energia_kcal', 11.6)).toEqual({ texto: '12 kcal a mais', igual: false })
    expect(fraseDaDiferenca('energia_kcal', 0.4)).toEqual({ texto: 'Energia igual', igual: true })
    expect(fraseDaDiferenca('ferro_mg', -3.46)).toEqual({ texto: '3,5 mg de ferro a menos', igual: false })
    expect(fraseDaDiferenca('potassio_mg', 543.2)).toEqual({ texto: '543 mg de potássio a mais', igual: false })
    expect(fraseDaDiferenca('vitamina_b12_mcg', 0.24)).toEqual({ texto: '0,2 µg de vitamina B12 a mais', igual: false })
    expect(fraseDaDiferenca('vitamina_c_mg', 0)).toEqual({ texto: 'Vitamina C igual', igual: true })
  })
})

describe('D-1104: a porção', () => {
  it('CA-2107: sem medida caseira que sirva, os gramas inteiros', () => {
    // Banana prata, 75 g, por carboidrato: o melão sai em gramas (fatia demais, meia unidade erra mais de 20%).
    const melao = lista(buscar(182, 75, [CHO], { limite: 500 })).find((c) => c.alimento.id === 236)
    expect(melao?.medida).toBeNull()
    expect(melao && textoDaPorcao(melao)).toBe('259 g')
  })

  it('CA-2107: nenhuma porção abaixo de 5 g, acima de 600 g ou com mais de 4 unidades ou pedaços', () => {
    for (const [id, gramas, nutriente] of [
      [ARROZ, 150, CHO],
      [ARROZ, 150, PTN],
      [FRANGO_GRELHADO, 100, PTN],
      [OVO_COZIDO, 45, PTN],
      [53, 50, CHO],
    ] as const) {
      for (const c of lista(buscar(id, gramas, [nutriente], { mesmoGrupo: false }))) {
        expect(c.gramas).toBeGreaterThanOrEqual(5)
        expect(c.gramas).toBeLessThanOrEqual(600)
        if (c.medida && MEDIDAS_DE_CONTAR.has(c.medida.nome)) expect(c.medida.quantidade).toBeLessThanOrEqual(MAXIMO_DE_PEDACOS)
      }
    }
  })

  it('CA-2107 (revisão, achado 2): a faixa vale para a porção final, depois da meia medida', () => {
    // Mamão 2 unidades · 620 g, frango 3 peitos e meio · 630 g, leite em pó meia colher · 4,5 g, melão 1 unidade · 660 g.
    for (const [id, gramas, nutriente, mesmoGrupo] of [
      [210, 400, 'lipideos_g', true],
      [318, 400, 'potassio_mg', true],
      [448, 30, PTN, true],
      [ARROZ, 150, CHO, false],
    ] as const) {
      const fora = lista(buscar(id, gramas, [nutriente], { mesmoGrupo, limite: 1000 }))
        .filter((c) => c.gramas < 5 || c.gramas > 600)
        .map((c) => `${c.alimento.descricao} · ${textoDaPorcao(c)}`)
      expect(fora).toEqual([])
    }
  })

  it('a porção em ml no líquido', () => {
    const leite = lista(buscar(448, 150, [PTN])).find((c) => c.alimento.id === 458)
    expect(leite && textoDaPorcao(leite)).toMatch(/ ml$/)
  })
})

describe('D-1106: os filtros clínicos', () => {
  it('CA-2108 e CA-2129: a batata-doce não é "doce", e o caqui "chocolate" é fruta', () => {
    expect(lista(buscar(ARROZ, 150, [CHO])).some((c) => c.alimento.id === 88)).toBe(true)
    expect(lista(buscar(182, 75, [CHO], { limite: 1000 })).some((c) => c.alimento.id === 189)).toBe(true)
  })

  it('CA-2128 (revisão, achado 1): café e chá nunca, nem em 1º lugar com o filtro desligado, nem na gestante', () => {
    const gestante = comCuidadosDaFase(SEM_RESTRICOES, { condicao: { tipo: 'gestante', semanasGestacao: null, pesoPreGestacionalKg: null }, idadeAnos: 30 })
    for (const [id, gramas, nutriente, restricoes] of [
      [ARROZ, 150, PTN, undefined],
      [91, 150, 'potassio_mg', undefined],
      [182, 150, 'potassio_mg', undefined],
      [62, 150, PTN, undefined],
      [ARROZ, 150, PTN, gestante],
    ] as const) {
      const candidatos = lista(buscar(id, gramas, [nutriente], { mesmoGrupo: false, limite: 1000, restricoes }))
      expect(candidatos.length).toBeGreaterThan(0)
      expect(candidatos.filter((c) => CAFE_OU_CHA.test(c.alimento.descricao.trim())).map((c) => c.alimento.descricao)).toEqual([])
    }
  })

  it('CA-2128 (revisão, achado 5): nada do grupo "Produtos açucarados", nem o mel que o Cobrir libera', () => {
    for (const [id, nutriente] of [
      [ARROZ, CHO],
      [ARROZ, 'energia_kcal'],
      [182, CHO],
      [182, 'energia_kcal'],
      [91, CHO],
    ] as const) {
      const acucarados = lista(buscar(id, 150, [nutriente], { mesmoGrupo: false, limite: 1000 }))
        .filter(
          (c) =>
            c.alimento.categoria === 'Produtos açucarados' ||
            /(^|[\s,])(doce|goiabada|marmelada|mel|melado)([\s,]|$)/i.test(c.alimento.descricao.replace(/^Batata, doce/, '')),
        )
        .map((c) => c.alimento.descricao)
      expect(acucarados).toEqual([])
    }
  })

  it('CA-2108: nada frito, fígado, não prescritível, ultraprocessado nem prato composto, em todos os grupos', () => {
    for (const [id, gramas, nutriente] of [
      [ARROZ, 150, CHO],
      [ARROZ, 150, PTN],
      [FRANGO_GRELHADO, 100, PTN],
      [377, 100, 'ferro_mg'],
      [OVO_COZIDO, 45, PTN],
      [458, 200, 'calcio_mg'],
      [182, 75, 'energia_kcal'],
      [182, 150, 'potassio_mg'],
    ] as const) {
      for (const c of lista(buscar(id, gramas, [nutriente], { mesmoGrupo: false, limite: 500 }))) {
        const a = c.alimento
        expect(ehFrito(a), a.descricao).toBe(false)
        expect(/f[ií]gado|sarapatel/i.test(a.descricao), a.descricao).toBe(false)
        expect(ehPrescritivel(a), a.descricao).toBe(true)
        expect(ehUltraprocessado(a), a.descricao).toBe(false)
        expect(ehPratoComposto(a), a.descricao).toBe(false)
        expect(a.descricao).not.toMatch(
          /biscoito|bolo(?!gn)|(?<!caqui, )chocolate|^doce|doce em|salsicha|lingui[çc]a|presunto|bacon|cerveja|vinho|cacha[çc]a|^(caf[ée]|ch[áa]|mel),/i,
        )
        expect(a.categoria, a.descricao).not.toBe('Produtos açucarados')
      }
    }
  })

  it('CA-2108: candidato sem o nutriente na tabela (não analisado ou zero) não entra', () => {
    const candidatos = lista(buscar(ARROZ, 150, ['fibra_g'], { mesmoGrupo: false, limite: 1000 }))
    expect(candidatos.length).toBeGreaterThan(0)
    for (const c of candidatos) expect(c.alimento.nutrientes.fibra_g ?? 0).toBeGreaterThan(0)
  })
})

describe('D-1107: as restrições do paciente, no padrão do Cobrir', () => {
  const alergiaALeite = montarRestricoes({ marcadas: ['leite'], texto: '', doencas: [], naoGosta: '' })

  it('CA-2109: com alergia a leite, nenhum queijo no lugar do ovo', () => {
    const sem = lista(buscar(OVO_COZIDO, 45, [PTN]))
    expect(sem.some((c) => /^Queijo/.test(c.alimento.descricao))).toBe(true)
    const com = lista(buscar(OVO_COZIDO, 45, [PTN], { restricoes: alergiaALeite }))
    expect(com.some((c) => /^Queijo/.test(c.alimento.descricao))).toBe(false)
  })

  it('CA-2109: o que o paciente não gosta vai para o fim', () => {
    const naoGostaDePolenta = montarRestricoes({ marcadas: [], texto: '', doencas: [], naoGosta: 'polenta' })
    const candidatos = lista(buscar(ARROZ, 150, [CHO], { restricoes: naoGostaDePolenta }))
    expect(candidatos.at(-1)?.alimento.descricao).toBe('Polenta, pré-cozida')
  })

  it('CA-2110: a restrição que tira todos diz isso na mensagem', () => {
    // Ricota por proteína, no mesmo grupo (ovos e queijos), para quem tem alergia a leite e a ovo: não sobra ninguém.
    const restricoes = montarRestricoes({ marcadas: ['leite', 'ovo'], texto: '', doencas: [], naoGosta: '' })
    const resultado = buscar(469, 50, [PTN], { restricoes })
    expect(resultado).toEqual({ tipo: 'lista', candidatos: [], restricaoTirou: true })
    expect(mensagemSemCandidato(true)).toBe(
      'Nenhum substituto com esses nutrientes dentro das restrições do paciente. Tire um nutriente, desligue “Só do mesmo grupo” ou adicione manualmente.',
    )
    expect(mensagemSemCandidato(false)).toBe('Nenhum substituto com esses nutrientes. Tire um nutriente, desligue “Só do mesmo grupo” ou adicione manualmente.')
  })
})

describe('D-1108: "Só do mesmo grupo"', () => {
  it('CA-2111: ligado, só cereais, tubérculos e raízes; desligado, outros grupos', () => {
    const ligado = lista(buscar(ARROZ, 150, [CHO], { limite: 500 }))
    expect(ligado.some((c) => c.alimento.categoria === 'Frutas e derivados')).toBe(false)
    const desligado = lista(buscar(ARROZ, 150, [CHO], { mesmoGrupo: false, limite: 500 }))
    expect(desligado.some((c) => c.alimento.categoria === 'Frutas e derivados')).toBe(true)
  })

  it('CA-2112: ovo inteiro sem gema nem clara; brócolis cozido sem verdura crua', () => {
    expect(lista(buscar(OVO_COZIDO, 45, [PTN])).some((c) => /gema|clara/i.test(c.alimento.descricao))).toBe(false)
    expect(lista(buscar(BROCOLIS_COZIDO, 60, ['fibra_g'], { limite: 500 })).some((c) => c.alimento.preparo === 'cru')).toBe(false)
  })
})

describe('D-1102: as bases que entram', () => {
  afterEach(() => {
    registrarBaseAmpliada([])
    registrarProdutos([])
  })

  it('CA-2113: da base ampliada, só o sugerível', () => {
    registrarBaseAmpliada(BASE_AMPLIADA)
    const candidatos = lista(buscar(ARROZ, 150, [CHO], { limite: 500 }))
    // D-1134: "Macarrão, trigo, cozido" e "Macarrão, trigo, com ovos, cozido" são o mesmo alimento; a lista traz um.
    expect(candidatos.some((c) => /^Macarrão, trigo,( com ovos,)? cozido$/.test(c.alimento.descricao))).toBe(true)
    const naoSugeriveis = new Set(BASE_AMPLIADA.filter((a) => a.ampliada?.sugerivel !== true).map((a) => a.id))
    expect(lista(buscar(ARROZ, 150, [CHO], { mesmoGrupo: false, limite: 1000 })).some((c) => naoSugeriveis.has(c.alimento.id))).toBe(false)
  })

  it('CA-2113: o alimento próprio só com "Pode aparecer no Cobrir e nas trocas" ligado', () => {
    const batata = buscarAlimento(91) as Alimento
    const proprio = (sugerir: boolean): Alimento =>
      ({
        ...batata,
        id: 900_001,
        descricao: 'Batata da roça cozida',
        proprio: { tipo: 'alimento', sugerir, energiaIncoerente: false },
      }) as Alimento
    registrarProdutos([proprio(true)])
    expect(lista(buscar(ARROZ, 150, [CHO], { limite: 500 })).some((c) => c.alimento.id === 900_001)).toBe(true)
    registrarProdutos([proprio(false)])
    expect(lista(buscar(ARROZ, 150, [CHO], { limite: 500 })).some((c) => c.alimento.id === 900_001)).toBe(false)
  })
})

describe('D-1109: a ordem e o limite', () => {
  it('CA-2135 (revisão, leve 1): a faixa de 5% conta a partir do melhor candidato', () => {
    expect(faixaDeProximidade(0, 0)).toBe(0)
    expect(faixaDeProximidade(0.049, 0)).toBe(0)
    // Com degraus fixos, 0,04 e 0,051 caíam em faixas diferentes; a partir do melhor (0,04), os dois estão na primeira.
    expect(faixaDeProximidade(0.051, 0.04)).toBe(0)
    expect(faixaDeProximidade(0.095, 0.04)).toBe(1)
    expect(faixaDeProximidade(0.04 + 0.05 * 3 + 0.001, 0.04)).toBe(3)
  })

  it('CA-2114: com o filtro desligado, a polenta com medida caseira vem antes da melancia em gramas', () => {
    const candidatos = lista(buscar(ARROZ, 150, [CHO], { mesmoGrupo: false, limite: 500 }))
    const posicao = (id: number) => candidatos.findIndex((c) => c.alimento.id === id)
    expect(posicao(62)).toBeGreaterThanOrEqual(0)
    expect(posicao(235)).toBeGreaterThanOrEqual(0)
    expect(posicao(62)).toBeLessThan(posicao(235))
  })

  it('CA-2114: o pouco usual depois do comum', () => {
    const candidatos = lista(buscar(FRANGO_GRELHADO, 100, [PTN], { limite: 500 }))
    const pouco = candidatos.findIndex((c) => !ehDeUsoComum(c.alimento))
    expect(pouco).toBeGreaterThan(0)
    expect(candidatos.slice(pouco).every((c) => !ehDeUsoComum(c.alimento))).toBe(true)
  })

  it('CA-2114: no máximo 20 candidatos', () => {
    expect(LIMITE_DA_BUSCA).toBe(20)
    expect(lista(buscar(ARROZ, 150, [CHO], { mesmoGrupo: false })).length).toBe(20)
  })
})

describe('D-1111: sem alvo', () => {
  it('CA-2116: o alimento sem o nutriente na tabela', () => {
    expect(buscar(ARROZ, 150, ['vitamina_c_mg'])).toEqual({
      tipo: 'sem-alvo',
      motivo: 'Arroz, tipo 1, cozido não tem vitamina C na tabela. Escolha outro nutriente.',
    })
    expect(buscar(ARROZ, 150, ['vitamina_c_mg', 'vitamina_b12_mcg'])).toEqual({
      tipo: 'sem-alvo',
      motivo: 'Arroz, tipo 1, cozido não tem vitamina C nem vitamina B12 na tabela. Escolha outro nutriente.',
    })
  })

  it('CA-2116: o item com 0 g', () => {
    expect(buscar(ARROZ, 0, [CHO])).toEqual({ tipo: 'sem-alvo', motivo: 'Informe os gramas de Arroz, tipo 1, cozido para buscar substitutos.' })
  })

  it('CA-2145 (D-1132): café e chá como item não montam lista, com o filtro ligado ou não', () => {
    const CAFE = 471
    const CHA_MATE = 476
    registrarBaseAmpliada(BASE_AMPLIADA)
    try {
      for (const id of [CAFE, CHA_MATE]) {
        for (const mesmoGrupo of [true, false]) {
          expect(buscar(id, 100, [nutrienteInicial(buscarAlimento(id) as Alimento)], { mesmoGrupo })).toEqual({
            tipo: 'sem-alvo',
            motivo: 'Café e chá não têm substituto por nutriente. Escolha em “Adicionar manualmente”.',
          })
        }
      }
    } finally {
      registrarBaseAmpliada([])
    }
  })

  it('sem nutriente escolhido e com alimento que não existe', () => {
    expect(buscar(ARROZ, 150, [])).toEqual({ tipo: 'sem-alvo', motivo: 'Selecione um ou mais nutrientes.' })
    expect(buscar(999_999, 150, [CHO])).toEqual({ tipo: 'sem-alvo', motivo: 'Este alimento não está mais na base.' })
  })
})

describe('D-1112: Comparar alimentos', () => {
  it('CA-2117: as linhas, as porções, os escolhidos e o que não foi analisado', () => {
    const arroz = buscarAlimento(ARROZ) as Alimento
    const batata = buscarAlimento(91) as Alimento
    const linhas = compararNaPorcao({ alimento: arroz, gramas: 150 }, { alimento: batata, gramas: 350 }, [CHO, PTN])
    expect(linhas.map((l) => l.rotulo)).toEqual([
      'Energia',
      'Carboidrato',
      'Proteína',
      'Lipídeos',
      'Fibra alimentar',
      'Cálcio',
      'Ferro',
      'Magnésio',
      'Potássio',
      'Sódio',
      'Vitamina C',
    ])
    expect(linhas.filter((l) => l.escolhido).map((l) => l.rotulo)).toEqual(['Carboidrato', 'Proteína'])
    const carboidrato = linhas[1]
    expect(carboidrato).toMatchObject({ original: '42,1 g', substituto: '41,8 g', diferenca: '−0,3 g' })
    // A TACO não analisou a vitamina C do arroz cozido.
    expect(linhas.at(-1)).toMatchObject({ original: 'não analisado', diferenca: '—' })
  })

  it('CA-2117: o escolhido fora das 11 linhas entra no fim; a diferença que zera diz "igual"', () => {
    const arroz = buscarAlimento(ARROZ) as Alimento
    const linhas = compararNaPorcao({ alimento: arroz, gramas: 150 }, { alimento: arroz, gramas: 150 }, ['zinco_mg'])
    expect(linhas.at(-1)).toMatchObject({ rotulo: 'Zinco', escolhido: true, diferenca: 'igual' })
  })
})

describe('CB-1109: a busca roda sobre a base inteira sem travar', () => {
  it('cada busca em menos de 300 ms, mesmo com a base ampliada', () => {
    registrarBaseAmpliada(BASE_AMPLIADA)
    try {
      const inicio = performance.now()
      for (const id of [ARROZ, FRANGO_GRELHADO, FEIJAO_CARIOCA]) buscar(id, 100, [CHO, PTN], { mesmoGrupo: false })
      expect((performance.now() - inicio) / 3).toBeLessThan(300)
    } finally {
      registrarBaseAmpliada([])
    }
  })

  it('a base da TACO tem o que o gabarito pede', () => {
    expect(ALIMENTOS.length).toBe(597)
  })
})
