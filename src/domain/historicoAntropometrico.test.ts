// O domínio do Histórico da antropometria (spec antropometria-telas, D-1425 a D-1428, D-1480 a D-1488; T15).
import { criarCasoVazio } from './caso.ts'
import { criarPacienteVazio, type Paciente } from './pacientes.ts'
import type { CasoSalvo } from './persistencia.ts'
import { avaliacoesDoPaciente } from './avaliacoesDoPaciente.ts'
import {
  avaliacoesParaHistorico,
  comparacaoEntre,
  historicoAntropometrico,
  type AvaliacaoDoHistorico,
  type HistoricoAntropometrico,
  type LinhaDoHistorico,
} from './historicoAntropometrico.ts'
import type { Caso, ComposicaoCorporal, PontoDaCintura } from './tipos.ts'

type Dobras7 = readonly [tri: number, sub: number, peit: number, axil: number, supraAnt: number, abd: number, coxa: number]

interface Medidas {
  readonly data: string
  readonly peso: number | null
  readonly dobras: Dobras7 | null
  readonly cintura: number | null
  readonly quadril: number | null
  readonly braco: number | null
}

/** As quatro avaliações do protótipo (paciente inventada, 34 anos, 164,0 cm): somas de 182,0, 171,5, 162,0 e 158,0 mm. */
const PROTOTIPO: readonly Medidas[] = [
  { data: '2026-05-12', peso: 75.8, dobras: [27, 23.5, 14, 18.5, 25, 35, 39], cintura: 89.5, quadril: 107.0, braco: 32.0 },
  { data: '2026-07-07', peso: 74.1, dobras: [26, 22.5, 13.5, 17.5, 23, 32.5, 36.5], cintura: 87.0, quadril: 105.8, braco: 31.6 },
  { data: '2026-09-08', peso: 72.6, dobras: [24.5, 21, 12.5, 16.5, 21.5, 30.5, 35.5], cintura: 85.2, quadril: 104.6, braco: 31.2 },
  { data: '2026-11-03', peso: 71.5, dobras: [24, 20.5, 12, 16, 21, 30, 34.5], cintura: 84.0, quadril: 104.0, braco: 31.0 },
]

const DOBRAS_VAZIAS = criarCasoVazio('x').composicao.dobras

function dobrasDe(d: Dobras7 | null): ComposicaoCorporal['dobras'] {
  if (d === null) return DOBRAS_VAZIAS
  const [tricipital, subescapular, peitoral, axilarMedia, suprailiacaAnt, abdominal, coxa] = d
  return { ...DOBRAS_VAZIAS, tricipital, subescapular, peitoral, axilarMedia, suprailiacaAnt, abdominal, coxa }
}

function casoDe(m: Medidas, mais: Partial<Caso> = {}, ponto: PontoDaCintura | null = 'ponto-medio'): Caso {
  const vazio = criarCasoVazio(`caso-${m.data}`)
  return {
    ...vazio,
    pacienteId: 'renata',
    dataConsulta: m.data,
    sexo: 'F',
    idadeAnos: 34,
    pesoKg: m.peso,
    estaturaCm: 164.0,
    circunferenciaCinturaCm: m.cintura,
    medidasCorporais: { ...vazio.medidasCorporais, pontoDaCintura: ponto, quadrilCm: m.quadril, bracoRelaxadoDireitoCm: m.braco },
    composicao: { ...vazio.composicao, protocolo: 'jackson-pollock-7', dobras: dobrasDe(m.dobras) },
    ...mais,
  }
}

const avaliacao = (caso: Caso): AvaliacaoDoHistorico => ({ casoId: caso.id, data: caso.dataConsulta ?? '', caso })

const QUATRO = PROTOTIPO.map((m) => avaliacao(casoDe(m)))

const linha = (h: HistoricoAntropometrico, id: LinhaDoHistorico['id']): LinhaDoHistorico => {
  const achada = h.grupos.flatMap((g) => g.linhas).find((l) => l.id === id)
  if (!achada) throw new Error(`sem a linha ${id}`)
  return achada
}

describe('historicoAntropometrico: o que entra (D-1425)', () => {
  it('CA-2449: "4 avaliações · de 12/05/2026 a 03/11/2026", as 4 datas e "Desde 08/09" e "Desde 12/05"', () => {
    const h = historicoAntropometrico(QUATRO)
    expect(h.resumo).toBe('4 avaliações · de 12/05/2026 a 03/11/2026')
    expect(h.comecaNaSegunda).toBe(false)
    expect(h.colunas.map((c) => [c.data, c.papel])).toEqual([
      ['12/05/2026', 'primeira'],
      ['07/07/2026', null],
      ['08/09/2026', null],
      ['03/11/2026', 'atual'],
    ])
    expect(h.desdeAnterior).toBe('Desde 08/09')
    expect(h.desdePrimeira).toBe('Desde 12/05')
  })

  it('ordena da mais velha à mais nova, qualquer que seja a ordem de entrada', () => {
    const h = historicoAntropometrico([...QUATRO].reverse())
    expect(h.colunas.map((c) => c.data)).toEqual(['12/05/2026', '07/07/2026', '08/09/2026', '03/11/2026'])
  })

  it('CA-2455: com uma avaliação, o histórico começa na segunda e não há gráfico nem painel da MMD', () => {
    const h = historicoAntropometrico(QUATRO.slice(3))
    expect(h.resumo).toBe('1 avaliação · 03/11/2026')
    expect(h.comecaNaSegunda).toBe(true)
    expect(h.mudancaMinima).toBeNull()
    expect(h.leitura).toBeNull()
    expect(linha(h, 'peso').textos).toEqual(['71,5'])
    expect(linha(h, 'peso').desdeAnterior).toBeNull()
  })

  it('D-1486: com 2 avaliações, só a coluna "Desde <primeira>"', () => {
    const h = historicoAntropometrico(QUATRO.slice(2))
    expect(h.desdeAnterior).toBeNull()
    expect(h.desdePrimeira).toBe('Desde 08/09')
    expect(linha(h, 'peso').desdeAnterior).toBeNull()
    expect(linha(h, 'peso').desdePrimeira?.texto).toBe('−1,1')
  })

  it('CB-1440: duas avaliações no mesmo dia: as duas colunas, a alterada por último à direita, e o mesmo x no gráfico', () => {
    const renata: Paciente = { ...criarPacienteVazio('renata', '2026-05-12T10:00:00.000Z'), nome: 'Renata', sexo: 'F', nascimento: '1992-06-01' }
    const manha = { ...casoDe(PROTOTIPO[2] as Medidas), id: 'manha', dataConsulta: '2026-11-03' }
    const tarde = { ...casoDe(PROTOTIPO[3] as Medidas), id: 'tarde', dataConsulta: '2026-11-03' }
    const salvos: CasoSalvo[] = [
      { caso: tarde, plano: { refeicoes: [] }, versao: 1, atualizadoEm: '2026-11-03T18:00:00.000Z' },
      { caso: manha, plano: { refeicoes: [] }, versao: 1, atualizadoEm: '2026-11-03T12:00:00.000Z' },
    ]
    const h = historicoAntropometrico(avaliacoesParaHistorico(avaliacoesDoPaciente('renata', salvos), renata, '2026-11-04'))
    expect(h.colunas.map((c) => [c.casoId, c.data])).toEqual([
      ['manha', '03/11/2026'],
      ['tarde', '03/11/2026'],
    ])
    const peso = h.graficos[0]
    expect(peso?.pontos.map((p) => [p.chave, p.x])).toEqual([
      ['manha', 0],
      ['tarde', 0],
    ])
  })

  it('CB-1441: valores extremos (350 kg e 45 kg) entram na tabela e no gráfico sem "NaN"', () => {
    const pesado = casoDe({ ...(PROTOTIPO[2] as Medidas), peso: 350 })
    const leve = casoDe({ ...(PROTOTIPO[3] as Medidas), peso: 45 })
    const h = historicoAntropometrico([avaliacao(pesado), avaliacao(leve)])
    expect(linha(h, 'peso').textos).toEqual(['350,0', '45,0'])
    expect(linha(h, 'peso').desdePrimeira?.texto).toBe('−305,0')
    expect(h.graficos[0]?.rotuloDoUltimo).toBe('45,0 kg')
    expect(JSON.stringify(h)).not.toMatch(/NaN|undefined|Infinity/)
  })

  it('CB-1484 (D-1523): peso fora da faixa, gravado pela etapa 1, não entra no Histórico', () => {
    const renata: Paciente = { ...criarPacienteVazio('renata', '2026-05-12T10:00:00.000Z'), nome: 'Renata', sexo: 'F', nascimento: '1992-06-01' }
    const salvos: CasoSalvo[] = PROTOTIPO.slice(2).map((m, i) => {
      const caso = { ...casoDe(m), pesoKg: i === 1 ? 9999 : m.peso }
      return { caso, plano: { refeicoes: [] }, versao: 1, atualizadoEm: `${m.data}T12:00:00.000Z` }
    })
    const lista = avaliacoesParaHistorico(avaliacoesDoPaciente('renata', salvos), renata, '2026-11-04')
    expect(lista.map((a) => a.caso.pesoKg)).toEqual([72.6, null])
    expect(linha(historicoAntropometrico(lista), 'peso').textos).toEqual(['72,6', '—'])
  })

  it('avaliacoesParaHistorico: a ficha entra na data de cada avaliação, da mais velha à mais nova', () => {
    const renata: Paciente = { ...criarPacienteVazio('renata', '2026-05-12T10:00:00.000Z'), nome: 'Renata', sexo: 'F', nascimento: '1992-06-01' }
    const salvos: CasoSalvo[] = PROTOTIPO.slice(2).map((m) => {
      const caso = { ...casoDe(m), sexo: null, idadeAnos: null }
      return { caso, plano: { refeicoes: [] }, versao: 1, atualizadoEm: `${m.data}T12:00:00.000Z` }
    })
    const lista = avaliacoesParaHistorico(avaliacoesDoPaciente('renata', salvos), renata, '2026-11-04')
    expect(lista.map((a) => [a.data, a.caso.sexo, a.caso.idadeAnos])).toEqual([
      ['2026-09-08', 'F', 34],
      ['2026-11-03', 'F', 34],
    ])
  })
})

describe('historicoAntropometrico: a tabela "Avaliações" (D-1428)', () => {
  const h = historicoAntropometrico(QUATRO)

  it('os grupos e as linhas, com o subtítulo do ponto, do lado e do protocolo', () => {
    expect(h.grupos.map((g) => [g.nome, g.linhas.map((l) => `${l.nome} | ${l.sub}`)])).toEqual([
      [
        'Medidas',
        ['Peso | kg', 'IMC | kg/m²', 'Cintura | cm · ponto médio (OMS)', 'Quadril | cm', 'Cintura/quadril | ', 'Cintura/estatura | ', 'Braço relaxado | cm · direito'],
      ],
      ['Dobras · Jackson & Pollock, 7 dobras', ['Soma das 7 dobras | mm']],
      ['Composição estimada pelas dobras', ['Gordura corporal | % · Siri', 'Massa gorda | kg', 'Massa magra | kg']],
    ])
  })

  it('os valores nas casas do motor, com "—" onde falta', () => {
    expect(linha(h, 'peso').textos).toEqual(['75,8', '74,1', '72,6', '71,5'])
    expect(linha(h, 'imc').textos).toEqual(['28,18', '27,55', '26,99', '26,58'])
    expect(linha(h, 'soma').textos).toEqual(['182,0', '171,5', '162,0', '158,0'])
    expect(linha(h, 'gordura').textos.at(-1)).toBe('29,5')
    expect(linha(h, 'rcq').textos.at(-1)).toBe('0,81')
  })

  it('CA-2450: soma de 162,0 para 158,0 é "−4,0" dentro do erro; de 182,0 para 158,0, "−24,0" mudança real', () => {
    const soma = linha(h, 'soma')
    expect(soma.desdeAnterior).toMatchObject({ texto: '−4,0', nota: 'dentro do erro', leitura: 'erro' })
    expect(soma.desdePrimeira).toMatchObject({ texto: '−24,0', nota: 'mudança real', leitura: 'real' })
  })

  it('CA-2451: cintura de 85,2 para 84,0 no mesmo ponto é "−1,2" dentro do erro (MMD de 3,5 cm)', () => {
    const cintura = linha(h, 'cintura')
    expect(cintura.desdeAnterior).toMatchObject({ texto: '−1,2', nota: 'dentro do erro', leitura: 'erro' })
    expect(cintura.desdeAnterior?.mmd).toBeCloseTo(3.52, 2)
  })

  it('CA-2451 e D-1481: com pontos diferentes, "ponto diferente", sem número e sem leitura; RCQ e RCE também', () => {
    const outra = historicoAntropometrico([...QUATRO.slice(0, 3), avaliacao(casoDe(PROTOTIPO[3] as Medidas, {}, 'crista-iliaca'))])
    for (const id of ['cintura', 'rcq', 'rce'] as const) {
      expect(linha(outra, id).desdeAnterior).toEqual({ texto: '—', nota: 'ponto diferente', leitura: null, diferenca: null, mmd: null })
    }
    expect(linha(outra, 'cintura').sub).toBe('cm · pontos diferentes')
  })

  it('D-1482: o ponto não registrado conta como o ponto médio', () => {
    const antigo = historicoAntropometrico([avaliacao(casoDe(PROTOTIPO[2] as Medidas, {}, null)), QUATRO[3] as AvaliacaoDoHistorico])
    expect(linha(antigo, 'cintura').desdePrimeira).toMatchObject({ texto: '−1,2', nota: 'dentro do erro' })
    expect(antigo.mudancaMinima?.marcas).toContainEqual({ concorda: true, texto: 'Mesmo ponto de cintura: ponto médio (OMS), assumido onde não foi registrado' })
  })

  it('CA-2452: peso "balança"; IMC, RCQ e RCE "calculado"; gordura e massas pelas dobras "veja a soma"', () => {
    expect(linha(h, 'peso').desdeAnterior).toMatchObject({ texto: '−1,1', nota: 'balança', leitura: null })
    for (const id of ['imc', 'rcq', 'rce'] as const) expect(linha(h, id).desdeAnterior?.nota).toBe('calculado')
    for (const id of ['gordura', 'massa-gorda', 'massa-magra'] as const) expect(linha(h, id).desdeAnterior?.nota).toBe('veja a soma')
    expect(linha(h, 'quadril').desdeAnterior?.nota).toBe('dentro do erro')
    expect(linha(h, 'braco').desdeAnterior?.nota).toBe('dentro do erro')
  })

  it('CA-2452 e D-1480: protocolo diferente entre as duas, a soma e a gordura dizem "protocolo diferente", sem número', () => {
    const petroski = casoDe(PROTOTIPO[3] as Medidas, {
      composicao: { ...criarCasoVazio('p').composicao, protocolo: 'petroski', dobras: { ...dobrasDe(PROTOTIPO[3]?.dobras ?? null), suprailiacaMed: 22 } },
    })
    const outra = historicoAntropometrico([...QUATRO.slice(0, 3), avaliacao(petroski)])
    expect(linha(outra, 'soma').desdeAnterior).toMatchObject({ texto: '—', nota: 'protocolo diferente' })
    expect(linha(outra, 'gordura').desdeAnterior).toMatchObject({ texto: '—', nota: 'protocolo diferente' })
    expect(outra.grupos.map((g) => g.nome)).toContain('Dobras')
    expect(linha(outra, 'soma').nome).toBe('Soma das dobras do protocolo')
    expect(linha(outra, 'soma').sub).toBe('mm · protocolo de cada avaliação')
  })

  it('D-1480: dobras numa e bioimpedância na outra é "método diferente"; bioimpedância nas duas, "bioimpedância"', () => {
    const bio = (m: Medidas, pct: number) =>
      casoDe({ ...m, dobras: null }, { composicao: { ...criarCasoVazio('b').composicao, bioimpedancia: { gorduraPct: pct, massaMagraKg: null, aguaPct: null, aparelho: 'InBody 270' } } })
    const misto = historicoAntropometrico([QUATRO[2] as AvaliacaoDoHistorico, avaliacao(bio(PROTOTIPO[3] as Medidas, 31))])
    expect(linha(misto, 'gordura').desdePrimeira).toMatchObject({ texto: '—', nota: 'método diferente' })
    const soBio = historicoAntropometrico([avaliacao(bio(PROTOTIPO[2] as Medidas, 32)), avaliacao(bio(PROTOTIPO[3] as Medidas, 31))])
    expect(linha(soBio, 'gordura').desdePrimeira).toMatchObject({ texto: '−1,0', nota: 'bioimpedância' })
    expect(soBio.grupos.map((g) => g.nome)).toEqual(['Medidas', 'Composição pela bioimpedância'])
    expect(linha(soBio, 'gordura').sub).toBe('% · bioimpedância')
  })

  it('D-1485: braço pelo esquerdo quando falta o direito; lados diferentes, "lado diferente"', () => {
    const esquerdo = casoDe(PROTOTIPO[3] as Medidas)
    const soEsquerdo = { ...esquerdo, medidasCorporais: { ...esquerdo.medidasCorporais, bracoRelaxadoDireitoCm: null, bracoRelaxadoEsquerdoCm: 30.8 } }
    const h2 = historicoAntropometrico([QUATRO[2] as AvaliacaoDoHistorico, avaliacao(soEsquerdo)])
    expect(linha(h2, 'braco').textos).toEqual(['31,2', '30,8'])
    expect(linha(h2, 'braco').sub).toBe('cm · esquerdo')
    expect(linha(h2, 'braco').desdePrimeira).toMatchObject({ texto: '—', nota: 'lado diferente' })
  })

  it('CA-2453: avaliação sem peso no meio: "—" na tabela e na variação que depende dela', () => {
    const semPeso = casoDe({ ...(PROTOTIPO[2] as Medidas), peso: null })
    const h3 = historicoAntropometrico([QUATRO[0] as AvaliacaoDoHistorico, QUATRO[1] as AvaliacaoDoHistorico, avaliacao(semPeso), QUATRO[3] as AvaliacaoDoHistorico])
    expect(linha(h3, 'peso').textos).toEqual(['75,8', '74,1', '—', '71,5'])
    expect(linha(h3, 'peso').desdeAnterior).toEqual({ texto: '—', nota: '', leitura: null, diferenca: null, mmd: null })
    expect(linha(h3, 'peso').desdePrimeira?.texto).toBe('−4,3')
  })

  it('D-1486: linha sem valor em nenhuma avaliação não aparece; grupo sem linha também não', () => {
    const soPeso = historicoAntropometrico(PROTOTIPO.slice(2).map((m) => avaliacao(casoDe({ ...m, dobras: null, cintura: null, quadril: null, braco: null }))))
    expect(soPeso.grupos.map((g) => [g.nome, g.linhas.map((l) => l.id)])).toEqual([['Medidas', ['peso', 'imc']]])
  })

  it('a concordância do cabeçalho da tabela: "Mesmo protocolo e mesmo ponto de cintura nas quatro"', () => {
    expect(h.concordancia).toBe('Mesmo protocolo e mesmo ponto de cintura nas quatro')
    expect(historicoAntropometrico(QUATRO.slice(2)).concordancia).toBe('Mesmo protocolo e mesmo ponto de cintura nas duas')
  })
})

describe('historicoAntropometrico: os gráficos (D-1426, D-1484)', () => {
  const h = historicoAntropometrico(QUATRO)
  const [peso, gordura] = h.graficos

  it('CA-2449: peso e gordura, um ponto por avaliação, x pelos dias e o último valor escrito', () => {
    expect(peso).toMatchObject({ id: 'peso', titulo: 'Peso', sub: 'kg', rotuloDoUltimo: '71,5 kg', nota: null })
    expect(peso?.pontos.map((p) => [p.x, p.valor, p.rotulo])).toEqual([
      [0, 75.8, '12/05'],
      [56, 74.1, '07/07'],
      [119, 72.6, '08/09'],
      [175, 71.5, '03/11'],
    ])
    expect(gordura).toMatchObject({ id: 'gordura', titulo: 'Gordura corporal', sub: '% · Jackson & Pollock, 7 dobras', rotuloDoUltimo: '29,5%' })
  })

  it('CA-2456: a dica diz a data, o valor e a variação desde a anterior ("Primeira avaliação" na primeira)', () => {
    expect(peso?.pontos.map((p) => p.dica)).toEqual([
      { titulo: '12/05/2026', valor: '75,8 kg', detalhe: 'Primeira avaliação' },
      { titulo: '07/07/2026', valor: '74,1 kg', detalhe: '−1,7 kg desde 12/05' },
      { titulo: '08/09/2026', valor: '72,6 kg', detalhe: '−1,5 kg desde 07/07' },
      { titulo: '03/11/2026', valor: '71,5 kg', detalhe: '−1,1 kg desde 08/09' },
    ])
    expect(gordura?.pontos[3]?.dica.detalhe).toMatch(/^−\d,\d pontos? desde 08\/09$/)
  })

  it('CA-2453: sem peso no meio, o ponto vem vazio e a dica seguinte conta desde a última com peso', () => {
    const semPeso = casoDe({ ...(PROTOTIPO[2] as Medidas), peso: null })
    const h3 = historicoAntropometrico([QUATRO[0] as AvaliacaoDoHistorico, QUATRO[1] as AvaliacaoDoHistorico, avaliacao(semPeso), QUATRO[3] as AvaliacaoDoHistorico])
    const serie = h3.graficos[0]
    expect(serie?.pontos.map((p) => p.valor)).toEqual([75.8, 74.1, null, 71.5])
    expect(serie?.pontos[3]?.dica.detalhe).toBe('−2,6 kg desde 07/07')
  })

  it('D-1484: a gordura usa só o método da mais recente, e diz quantas ficam fora', () => {
    const bio = casoDe({ ...(PROTOTIPO[3] as Medidas), dobras: null }, { composicao: { ...criarCasoVazio('b').composicao, bioimpedancia: { gorduraPct: 31, massaMagraKg: null, aguaPct: null, aparelho: '' } } })
    const h2 = historicoAntropometrico([...QUATRO.slice(0, 3), avaliacao(bio)])
    const g = h2.graficos[1]
    expect(g?.sub).toBe('% · Bioimpedância')
    expect(g?.pontos.map((p) => p.valor)).toEqual([null, null, null, 31])
    expect(g?.nota).toBe('3 avaliações por outro método ficam fora do gráfico.')
  })

  it('D-1487 e CB-1442: sem % de gordura em nenhuma, o gráfico diz isso', () => {
    const semSexo = historicoAntropometrico(QUATRO.slice(2).map((a) => ({ ...a, caso: { ...a.caso, sexo: null } })))
    expect(semSexo.graficos[1]?.pontos.every((p) => p.valor === null)).toBe(true)
    expect(semSexo.graficos[1]?.vazio).toBe('Nenhuma avaliação tem o % de gordura.')
  })

  it('CB-1443: a gestante não tem % de gordura no motor: a linha diz "—" e o gráfico não tem ponto nela', () => {
    const gestante = { ...(QUATRO[2] as AvaliacaoDoHistorico), caso: { ...(QUATRO[2] as AvaliacaoDoHistorico).caso, condicao: { tipo: 'gestante', semanasGestacao: 12, pesoPreGestacionalKg: 70 } as const } }
    const h2 = historicoAntropometrico([QUATRO[1] as AvaliacaoDoHistorico, gestante, QUATRO[3] as AvaliacaoDoHistorico])
    expect(linha(h2, 'gordura').textos[1]).toBe('—')
    expect(h2.graficos[1]?.pontos[1]?.valor).toBeNull()
  })
})

describe('historicoAntropometrico: a mudança mínima detectável (D-1427, D-1488)', () => {
  const h = historicoAntropometrico(QUATRO)

  it('CA-2454: a MMD da soma, da cintura e do quadril entre a penúltima e a última, e as marcas', () => {
    expect(h.mudancaMinima?.linhas).toEqual([
      { nome: 'Soma das 7 dobras', valor: '13,2 mm', detalhe: 'ETM de 7,5% em cada dobra, padrão da ISAK nível 1' },
      { nome: 'Cintura', valor: '3,5 cm', detalhe: 'ETM de 1,5% nas circunferências, padrão da ISAK nível 1' },
      { nome: 'Quadril', valor: '4,3 cm', detalhe: 'Mesmo ETM, sobre a medida do quadril' },
    ])
    expect(h.mudancaMinima?.marcas).toEqual([
      { concorda: true, texto: 'Mesmo protocolo: Jackson & Pollock, 7 dobras' },
      { concorda: true, texto: 'Mesmo ponto de cintura: ponto médio (OMS)' },
    ])
  })

  it('D-1488: protocolos ou pontos diferentes: "—", o motivo e a marca que não concorda', () => {
    const petroski = casoDe(PROTOTIPO[3] as Medidas, { composicao: { ...criarCasoVazio('p').composicao, protocolo: 'petroski', dobras: dobrasDe(PROTOTIPO[3]?.dobras ?? null) } }, 'crista-iliaca')
    const outra = historicoAntropometrico([QUATRO[2] as AvaliacaoDoHistorico, avaliacao(petroski)])
    expect(outra.mudancaMinima?.linhas.slice(0, 2)).toEqual([
      { nome: 'Soma das dobras', valor: '—', detalhe: 'Protocolos diferentes nas duas avaliações.' },
      { nome: 'Cintura', valor: '—', detalhe: 'Pontos de cintura diferentes nas duas avaliações.' },
    ])
    expect(outra.mudancaMinima?.marcas).toEqual([
      { concorda: false, texto: 'Protocolos diferentes: Jackson & Pollock, 7 dobras em 08/09 e Petroski em 03/11. A soma não se compara.' },
      { concorda: false, texto: 'Pontos de cintura diferentes: ponto médio (OMS) em 08/09 e crista ilíaca (NIH) em 03/11. A cintura não se compara.' },
    ])
  })

  it('D-1488: a medida que falta numa das duas diz em qual', () => {
    const semCintura = casoDe({ ...(PROTOTIPO[3] as Medidas), cintura: null })
    const outra = historicoAntropometrico([QUATRO[2] as AvaliacaoDoHistorico, avaliacao(semCintura)])
    expect(outra.mudancaMinima?.linhas[1]).toEqual({ nome: 'Cintura', valor: '—', detalhe: 'Falta a cintura em 03/11/2026.' })
  })
})

describe('historicoAntropometrico: a leitura em frase (D-1426, D-1483)', () => {
  it('desde a primeira e desde a penúltima, pela MMD do motor', () => {
    expect(historicoAntropometrico(QUATRO).leitura).toBe(
      'Desde 12/05, a soma das dobras caiu 24,0 mm e a cintura caiu 5,5 cm: mudança real. Desde 08/09, a soma das dobras caiu 4,0 mm e a cintura caiu 1,2 cm: dentro do erro de medida.',
    )
  })

  it('leituras diferentes no mesmo período vão entre parênteses', () => {
    const cinturaCaiu = casoDe({ ...(PROTOTIPO[3] as Medidas), cintura: 80.5 })
    expect(historicoAntropometrico([QUATRO[2] as AvaliacaoDoHistorico, avaliacao(cinturaCaiu)]).leitura).toBe(
      'Desde 08/09, a soma das dobras caiu 4,0 mm (dentro do erro de medida) e a cintura caiu 4,7 cm (mudança real).',
    )
  })

  it('sem soma nem cintura comparáveis, não há frase', () => {
    const soPeso = PROTOTIPO.slice(2).map((m) => avaliacao(casoDe({ ...m, dobras: null, cintura: null })))
    expect(historicoAntropometrico(soPeso).leitura).toBeNull()
  })
})

describe('comparacaoEntre: a comparação do documento (D-1494)', () => {
  it('peso, cintura, quadril, soma, gordura e massa magra, com a leitura e a legenda da MMD', () => {
    const c = comparacaoEntre(QUATRO[2] as AvaliacaoDoHistorico, QUATRO[3] as AvaliacaoDoHistorico)
    expect(c.antes).toBe('08/09/2026')
    expect(c.agora).toBe('03/11/2026')
    expect(c.linhas.map((l) => [l.nome, l.antes, l.agora, l.variacao, l.leitura])).toEqual([
      ['Peso (kg)', '72,6', '71,5', '−1,1 kg', ''],
      ['Cintura (cm)', '85,2', '84,0', '−1,2 cm', 'dentro do erro de medida'],
      ['Quadril (cm)', '104,6', '104,0', '−0,6 cm', 'dentro do erro de medida'],
      ['Soma das 7 dobras (mm)', '162,0', '158,0', '−4,0 mm', 'dentro do erro de medida'],
      ['Gordura corporal (%)', expect.stringMatching(/^\d\d,\d$/), '29,5', expect.stringMatching(/^−\d,\d pontos?$/), ''],
      ['Massa magra (kg)', expect.stringMatching(/^\d\d,\d$/), expect.stringMatching(/^\d\d,\d$/), expect.stringMatching(/^[−+]?\d,\d kg$/), ''],
    ])
    expect(c.legenda).toBe('Mudança mínima detectável (95%), com o ETM padrão da ISAK nível 1: dobras 13,2 mm; cintura 3,5 cm; quadril 4,3 cm.')
  })

  it('linha sem valor nas duas não sai, e sem medida comparável não há legenda', () => {
    const soPeso = PROTOTIPO.slice(2).map((m) => avaliacao(casoDe({ ...m, dobras: null, cintura: null, quadril: null })))
    const c = comparacaoEntre(soPeso[0] as AvaliacaoDoHistorico, soPeso[1] as AvaliacaoDoHistorico)
    expect(c.linhas.map((l) => l.nome)).toEqual(['Peso (kg)'])
    expect(c.legenda).toBeNull()
  })
})
