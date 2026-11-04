// O domínio do "Documento da avaliação" (spec antropometria-telas, D-1429 a D-1433, D-1490 a D-1498; T17).
import { criarCasoVazio } from './caso.ts'
import { documentoDaAvaliacao, rascunhoDoDiagnostico } from './documentoDaAvaliacao.ts'
import type { AvaliacaoDoHistorico } from './historicoAntropometrico.ts'
import { criarPacienteVazio, type Paciente } from './pacientes.ts'
import type { Caso } from './tipos.ts'

const RENATA: Paciente = { ...criarPacienteVazio('renata', '2026-05-12T10:00:00.000Z'), nome: 'Renata Oliveira Campos', sexo: 'F', nascimento: '1992-05-12' }

type Dobras7 = readonly [tri: number, sub: number, peit: number, axil: number, supraAnt: number, abd: number, coxa: number]

const DOBRAS: Readonly<Record<string, Dobras7>> = {
  '2026-05-12': [27, 23.5, 14, 18.5, 25, 35, 39],
  '2026-07-07': [26, 22.5, 13.5, 17.5, 23, 32.5, 36.5],
  '2026-09-08': [24.5, 21, 12.5, 16.5, 21.5, 30.5, 35.5],
  '2026-11-03': [24, 20.5, 12, 16, 21, 30, 34.5],
}
const PESO: Readonly<Record<string, number>> = { '2026-05-12': 75.8, '2026-07-07': 74.1, '2026-09-08': 72.6, '2026-11-03': 71.5 }
const CINTURA: Readonly<Record<string, number>> = { '2026-05-12': 89.5, '2026-07-07': 87.0, '2026-09-08': 85.2, '2026-11-03': 84.0 }

/** A avaliação de exemplo do protótipo do documento (paciente inventada, 34 anos). */
function casoCompleto(data: string): Caso {
  const v = criarCasoVazio(`caso-${data}`)
  const [tricipital, subescapular, peitoral, axilarMedia, suprailiacaAnt, abdominal, coxa] = DOBRAS[data] ?? [0, 0, 0, 0, 0, 0, 0]
  return {
    ...v,
    modo: 'completo',
    pacienteId: 'renata',
    dataConsulta: data,
    sexo: 'F',
    idadeAnos: 34,
    pesoKg: PESO[data] ?? null,
    estaturaCm: 164.0,
    circunferenciaCinturaCm: CINTURA[data] ?? null,
    circunferenciaPanturrilhaCm: 37.0,
    medidasCorporais: {
      ...v.medidasCorporais,
      pontoDaCintura: 'ponto-medio',
      quadrilCm: 104.0,
      pescocoCm: 33.8,
      bracoRelaxadoDireitoCm: 31.0,
      bracoRelaxadoEsquerdoCm: 30.6,
      punhoCm: 15.4,
      panturrilhaEsquerdaCm: 36.8,
      diametroPunhoCm: 5.1,
      diametroCotoveloCm: 6.2,
      diametroJoelhoCm: 9.1,
    },
    composicao: {
      ...v.composicao,
      protocolo: 'jackson-pollock-7',
      dobras: { ...v.composicao.dobras, tricipital, subescapular, peitoral, axilarMedia, suprailiacaAnt, abdominal, coxa, bicipital: 10.5, suprailiacaMed: 23, panturrilhaMedial: 19 },
    },
    avaliacao: { ...v.avaliacao, modalidade: 'presencial', adipometro: 'lange', origemPesoEstatura: 'aferidas' },
  }
}

const av = (caso: Caso): AvaliacaoDoHistorico => ({ casoId: caso.id, data: caso.dataConsulta ?? '', caso })
const QUATRO = ['2026-05-12', '2026-07-07', '2026-09-08', '2026-11-03'].map((d) => av(casoCompleto(d)))
const ATUAL = QUATRO[3] as AvaliacaoDoHistorico

const doc = (atual: AvaliacaoDoHistorico = ATUAL, avaliacoes: readonly AvaliacaoDoHistorico[] = QUATRO, paciente: Paciente | null = RENATA) =>
  documentoDaAvaliacao({ atual, avaliacoes, paciente, hoje: '2026-11-03' })

describe('documentoDaAvaliacao: a avaliação de exemplo (CA-2459)', () => {
  const d = doc()

  it('a data e o paciente: nome, nascimento com a idade, sexo, "Retorno · 4ª avaliação" e a modalidade', () => {
    expect(d.data).toBe('03/11/2026')
    expect(d.paciente).toEqual([
      { rotulo: 'Nome', valor: 'Renata Oliveira Campos' },
      { rotulo: 'Nascimento', valor: '12/05/1992 · 34 anos' },
      { rotulo: 'Sexo', valor: 'Feminino' },
      { rotulo: 'Avaliação', valor: 'Retorno · 4ª avaliação' },
      { rotulo: 'Modalidade', valor: 'Presencial' },
    ])
  })

  it('os métodos: o protocolo com a conversão e o adipômetro, o ponto da cintura, o lado e a origem', () => {
    expect(d.metodos[0]).toMatch(/^Dobras: Jackson & Pollock, 7 dobras, conversão de Siri \(.+\)\. Adipômetro Lange\.$/)
    expect(d.metodos).toContain('Cintura no ponto médio entre a última costela e a crista ilíaca (OMS).')
    expect(d.metodos).toContain('Medidas no lado direito, salvo as da coluna do lado esquerdo.')
    expect(d.metodos).toContain('Peso e estatura aferidos na consulta.')
  })

  it('as medidas básicas, com a origem e a classificação do IMC com a fonte', () => {
    expect(d.basicas.map((b) => [b.rotulo, b.valor, b.nota])).toEqual([
      ['Peso', '71,5 kg', 'aferido'],
      ['Estatura', '164,0 cm', 'aferida'],
      ['IMC', '26,58 kg/m²', expect.stringMatching(/^Sobrepeso · .+/)],
    ])
  })

  it('D-1492: membros com direito e esquerdo; o punho num campo só; o tronco com o ponto da cintura', () => {
    expect(d.membros).toEqual([
      { nome: 'Braço relaxado', direito: '31,0', esquerdo: '30,6' },
      { nome: 'Punho', unico: '15,4' },
      { nome: 'Panturrilha', direito: '37,0', esquerdo: '36,8' },
    ])
    expect(d.tronco).toEqual([
      { nome: 'Pescoço', valor: '33,8' },
      { nome: 'Cintura, ponto médio', valor: '84,0' },
      { nome: 'Quadril', valor: '104,0' },
    ])
  })

  it('D-1493: as dobras com "●" nas que entraram na conta, e a soma', () => {
    expect(d.dobras.filter((x) => x.usada).map((x) => x.nome)).toEqual(['Tríceps', 'Subescapular', 'Peitoral', 'Axilar média', 'Suprailíaca, axilar anterior', 'Abdominal', 'Coxa'])
    expect(d.dobras.filter((x) => !x.usada).map((x) => x.nome)).toEqual(['Bíceps', 'Suprailíaca, axilar média', 'Panturrilha medial'])
    expect(d.somaDasDobras).toBe('Soma das 7 dobras: 158,0 mm')
  })

  it('os diâmetros numa linha', () => {
    expect(d.diametros).toBe('Punho (biestiloide) 5,1 · Cotovelo (úmero) 6,2 · Joelho (fêmur) 9,1 cm')
  })

  it('D-1491: os resultados com valor, na ordem do motor, sem a soma das dobras, com os nomes do protótipo', () => {
    const nomes = d.resultados.map((r) => r.nome)
    expect(nomes.slice(0, 4)).toEqual(['IMC', 'Gordura corporal', 'Massa gorda', 'Massa magra'])
    expect(nomes).toContain('Cintura/quadril')
    expect(nomes).toContain('Circunferência do braço (CB)')
    expect(d.resultados.every((r) => r.linha.valor !== null && r.linha.id !== 'soma-de-dobras')).toBe(true)
  })

  it('D-1494: a comparação com a anterior pela data', () => {
    expect(d.comparacao?.antes).toBe('08/09/2026')
    expect(d.comparacao?.agora).toBe('03/11/2026')
    expect(d.comparacao?.linhas.find((l) => l.nome === 'Peso (kg)')?.variacao).toBe('−1,1 kg')
  })

  it('D-1494: a avaliação aberta antiga compara com a anterior a ela, não com a penúltima da lista', () => {
    const setembro = QUATRO[2] as AvaliacaoDoHistorico
    const outro = doc(setembro)
    expect(outro.comparacao?.antes).toBe('07/07/2026')
    expect(outro.paciente.find((c) => c.rotulo === 'Avaliação')?.valor).toBe('Retorno · 3ª avaliação')
  })

  it('as referências, sem repetir', () => {
    expect(d.referencias.length).toBeGreaterThan(3)
    expect(new Set(d.referencias).size).toBe(d.referencias.length)
  })
})

describe('documentoDaAvaliacao: seção sem dado não sai', () => {
  it('CA-2460: só peso e estatura, sem circunferências, dobras, diâmetros nem comparação', () => {
    const v = criarCasoVazio('so')
    const caso: Caso = { ...v, modo: 'completo', pacienteId: 'renata', dataConsulta: '2026-11-03', sexo: 'F', idadeAnos: 34, pesoKg: 71.5, estaturaCm: 164 }
    const d = doc(av(caso), [av(caso)])
    expect(d.membros).toEqual([])
    expect(d.tronco).toEqual([])
    expect(d.dobras).toEqual([])
    expect(d.somaDasDobras).toBeNull()
    expect(d.diametros).toBeNull()
    expect(d.comparacao).toBeNull()
    expect(d.basicas.map((b) => b.rotulo)).toEqual(['Peso', 'Estatura', 'IMC'])
    expect(d.resultados.map((r) => r.linha.id)).toContain('imc')
    expect(d.paciente.find((c) => c.rotulo === 'Avaliação')?.valor).toBe('Primeira avaliação')
    expect(d.referencias.length).toBeGreaterThan(0)
  })

  it('CB-1444: plano novo sem medida: sem métodos, medidas, resultados nem referências', () => {
    const v = criarCasoVazio('vazio')
    const caso: Caso = { ...v, modo: 'completo', pacienteId: 'renata', dataConsulta: '2026-11-03', sexo: 'F', idadeAnos: 34 }
    const d = doc(av(caso), [av(caso)])
    expect(d.metodos).toEqual([])
    expect(d.basicas).toEqual([])
    expect(d.resultados).toEqual([])
    expect(d.referencias).toEqual([])
    expect(d.diagnostico).toBe('')
  })

  it('CB-1447: ficha sem nascimento: sem "Nascimento", com "Idade" do plano', () => {
    const d = doc(ATUAL, QUATRO, { ...RENATA, nascimento: null })
    expect(d.paciente.map((c) => c.rotulo)).not.toContain('Nascimento')
    expect(d.paciente.find((c) => c.rotulo === 'Idade')?.valor).toBe('34 anos')
  })

  it('D-1498: plano sem paciente: o nome do plano, sem "Avaliação" e sem comparação', () => {
    const caso: Caso = { ...casoCompleto('2026-11-03'), pacienteId: null, nome: 'Caso de estudo 3' }
    const d = doc(av(caso), [], null)
    expect(d.paciente).toEqual([
      { rotulo: 'Nome', valor: 'Caso de estudo 3' },
      { rotulo: 'Idade', valor: '34 anos' },
      { rotulo: 'Sexo', valor: 'Feminino' },
      { rotulo: 'Modalidade', valor: 'Presencial' },
    ])
    expect(d.comparacao).toBeNull()
  })

  it('o diagnóstico e as observações escritos pela nutricionista vão como vieram', () => {
    const caso: Caso = { ...ATUAL.caso, avaliacao: { ...ATUAL.caso.avaliacao, diagnostico: '  Sobrepeso.  ', observacoesDaMedida: 'Em jejum de 3 horas.' } }
    const d = doc({ ...ATUAL, caso })
    expect(d.diagnostico).toBe('Sobrepeso.')
    expect(d.observacoes).toBe('Em jejum de 3 horas.')
  })
})

describe('rascunhoDoDiagnostico (D-1497, CA-2461)', () => {
  it('o método da gordura com a fonte e uma linha por indicador classificado, sem adjetivo', () => {
    const r = rascunhoDoDiagnostico(ATUAL.caso)
    const linhas = r.split('\n')
    expect(linhas[0]).toMatch(/^Gordura corporal estimada por Jackson & Pollock, 7 dobras \(.+\)\.$/)
    expect(linhas).toContainEqual(expect.stringMatching(/^IMC: Sobrepeso \(26,58 kg\/m²; .+\)\.$/))
    expect(linhas.every((l) => l.endsWith('.'))).toBe(true)
  })

  it('sem medida, vazio', () => {
    expect(rascunhoDoDiagnostico(criarCasoVazio('x'))).toBe('')
  })
})
