// Os textos da vista Avaliação, puros (spec antropometria-telas, D-1407 a D-1421).
import { criarCasoVazio } from '@/domain/caso.ts'
import type { LinhaDoResultado } from '@/domain/linhaDoResultado.ts'
import { resultadoAntropometrico } from '@/domain/resultadoAntropometrico.ts'
import type { Caso } from '@/domain/tipos.ts'
import { FONTES } from '@/domain/fontesAntropometria.ts'
import type { SugestaoDeProteina } from '@/domain/pontoDePartida.ts'
import {
  apresentarLinha,
  comUnidade,
  faixaEmDezenas,
  faixaEmGKg,
  faixaEmGramas,
  faixaEmKg,
  fraseDoImcAlvo,
  gruposDoResultado,
  opcoesDaOrigem,
  opcoesDoPerfil,
  proteinaParaOPlano,
  textoDaFalta,
  textoDoErro,
  textoDosLados,
  tomDoNivel,
} from './textosDaAvaliacao.ts'

describe('os textos de peso e estatura (spec antropometria-telas, D-1407 a D-1409)', () => {
  it('comUnidade: as casas do motor, a unidade e "—" sem valor (nunca 0)', () => {
    expect(comUnidade(26.584, 2, 'kg/m²')).toBe('26,58 kg/m²')
    expect(comUnidade(29.49, 1, '%')).toBe('29,5%')
    expect(comUnidade(10.12, 1, '')).toBe('10,1')
    expect(comUnidade(null, 1, 'kg')).toBe('—')
  })

  it('CA-2432: a frase do que falta', () => {
    expect(textoDaFalta([{ campo: 'circunferenciaCinturaCm', nome: 'a cintura' }])).toBe('Falta a cintura')
    expect(textoDaFalta([{ campo: 'pesoKg', nome: 'o peso' }, { campo: 'estaturaCm', nome: 'a estatura' }])).toBe('Faltam o peso e a estatura')
    expect(
      textoDaFalta([
        { campo: 'composicao.dobras.coxa', nome: 'a dobra coxa' },
        { campo: 'composicao.dobras.peitoral', nome: 'a dobra peitoral' },
        { campo: 'composicao.dobras.abdominal', nome: 'a dobra abdominal' },
      ]),
    ).toBe('Faltam 3 dobras')
    expect(textoDaFalta([])).toBe('')
  })

  it('D-1407 e CB-1411: a origem com o sexo da ficha; sem sexo, "pela pessoa"', () => {
    expect(opcoesDaOrigem('F').map((o) => o.rotulo)).toEqual(['Aferidos na consulta', 'Informados pela paciente', 'Estimados'])
    expect(opcoesDaOrigem('M')[1]?.rotulo).toBe('Informados pelo paciente')
    expect(opcoesDaOrigem(null)[1]?.rotulo).toBe('Informados pela pessoa')
  })

  it('D-1408: o erro e o lado de cada estimativa', () => {
    expect(textoDoErro({ valor: 6, unidade: 'cm', descricao: '' })).toBe('± 6 cm')
    expect(textoDoErro({ valor: 2.2, unidade: '%', descricao: '' })).toBe('erro médio de 2,2%')
    expect(textoDoErro({ valor: 6, unidade: '%', descricao: '' })).toBe('erro médio de 6%')
    expect(textoDoErro(null)).toBeNull()
    expect(textoDosLados([{ medida: 'braço', lado: 'esquerdo' }, { medida: 'panturrilha', lado: 'esquerdo' }])).toBe('lado esquerdo')
    expect(textoDosLados([{ medida: 'braço', lado: 'direito' }, { medida: 'panturrilha', lado: 'esquerdo' }])).toBe('braço direito, panturrilha esquerda')
    expect(textoDosLados([])).toBeNull()
  })

  it('D-1409 e D-1463: de onde vem o IMC-alvo, e a faixa em kg', () => {
    expect(fraseDoImcAlvo('compleicao', 'media')).toBe('Padrão da compleição média. Edite se quiser.')
    expect(fraseDoImcAlvo('compleicao', null)).toBe('Padrão da compleição média. Edite se quiser.')
    expect(fraseDoImcAlvo('compleicao', 'grande')).toBe('Padrão da compleição grande. Edite se quiser.')
    expect(fraseDoImcAlvo('padrao-do-idoso', null)).toBe('Padrão do idoso. Edite se quiser.')
    expect(fraseDoImcAlvo('digitado', 'media')).toBe('Definido por você.')
    expect(faixaEmKg(53.465, 72.2211)).toBe('53,5 a 72,2 kg')
  })
})

const vazio = criarCasoVazio('c')

/** A paciente de exemplo do protótipo: 34 anos, 71,5 kg, 164 cm, JP 7 dobras. */
const RENATA: Caso = {
  ...vazio,
  sexo: 'F',
  idadeAnos: 34,
  pesoKg: 71.5,
  estaturaCm: 164,
  circunferenciaCinturaCm: 84,
  circunferenciaPanturrilhaCm: 37,
  medidasCorporais: { ...vazio.medidasCorporais, pontoDaCintura: 'ponto-medio', quadrilCm: 104, pescocoCm: 33.8, bracoRelaxadoDireitoCm: 31, bracoRelaxadoEsquerdoCm: 30.6, punhoCm: 15.4 },
  composicao: {
    ...vazio.composicao,
    protocolo: 'jackson-pollock-7',
    dobras: { ...vazio.composicao.dobras, tricipital: 24, bicipital: 10.5, subescapular: 20.5, peitoral: 12, axilarMedia: 16, suprailiacaAnt: 21, suprailiacaMed: 23, abdominal: 30, coxa: 34.5, panturrilhaMedial: 19 },
  },
}

const linha = (id: LinhaDoResultado['id'], caso: Caso = RENATA) => {
  const l = resultadoAntropometrico(caso).find((x) => x.id === id)
  if (!l) throw new Error(`sem a linha ${id}`)
  return l
}

describe('a linha do resultado na tela (spec antropometria-telas, CA-2430 a CA-2435)', () => {
  it('CA-2430: o real nas casas do motor, com a unidade; a recomendação e o selo do motor', () => {
    const imc = apresentarLinha(linha('imc'))
    expect(imc.nome).toBe('IMC')
    expect(imc.real).toBe('26,58 kg/m²')
    expect(imc.recomendacao).toBe('18,50 – 24,99 kg/m²')
    expect(imc.selo).toEqual({ rotulo: 'Sobrepeso', tom: 'baixo' })
    const gordura = apresentarLinha(linha('gordura'))
    expect(gordura.real).toBe('29,5%')
    expect(gordura.selo?.rotulo).toBe('Saudável')
  })

  it('CA-2430: os grupos da tela, na ordem do motor, e grupo sem linha some', () => {
    const grupos = gruposDoResultado(resultadoAntropometrico(RENATA))
    expect(grupos.map((g) => g.nome)).toEqual(['Peso e composição', 'Gordura central', 'Braço · Frisancho', 'Outras'])
    expect(grupos[0]?.linhas.map((l) => l.id)).toEqual(['imc', 'gordura', 'massa-gorda', 'massa-magra', 'soma-de-dobras'])
    expect(grupos[1]?.linhas.map((l) => l.id)).toEqual(['cintura', 'rcq', 'rce', 'pescoco'])
    expect(grupos[3]?.linhas.map((l) => l.id)).toEqual(['compleicao'])
    // CA-2435: no adolescente, sem cintura, RCQ, RCE, pescoço e compleição: o grupo some.
    const adolescente = gruposDoResultado(resultadoAntropometrico({ ...RENATA, idadeAnos: 15 }))
    expect(adolescente.map((g) => g.nome)).not.toContain('Gordura central')
  })

  it('CA-2431: cada nível do motor tem o seu tom de selo', () => {
    expect(tomDoNivel('adequado')).toBe('ok')
    expect(tomDoNivel('atencao')).toBe('baixo')
    expect(tomDoNivel('alterado')).toBe('alto')
    expect(tomDoNivel('grave')).toBe('alto')
    expect(tomDoNivel('informativo')).toBe('neutro')
  })

  it('CA-2432: sem valor, "—" e a frase do que falta; com o motivo da recusa, o motivo', () => {
    const semCintura = apresentarLinha(linha('cintura', { ...RENATA, circunferenciaCinturaCm: null }))
    expect(semCintura.real).toBe('—')
    expect(semCintura.recomendacao).toBe('—')
    expect(semCintura.selo).toBeNull()
    expect(semCintura.nota).toBe('Falta a cintura')
    const recusada = apresentarLinha(
      linha('gordura', { ...RENATA, composicao: { ...RENATA.composicao, protocolo: 'petroski', dobras: { ...RENATA.composicao.dobras, subescapular: 45, suprailiacaMed: 45, coxa: 50 } } }),
    )
    expect(recusada.real).toBe('—')
    expect(recusada.nota).toBe('Petroski só vale até 115,5 mm de soma, o pico da equação: escolha outro protocolo ou informe o % da bioimpedância.')
  })

  it('CB-1405: sem as dobras e sem bioimpedância, a gordura diz o que falta e lembra a bioimpedância', () => {
    const semDobras = apresentarLinha(linha('gordura', { ...RENATA, composicao: { ...RENATA.composicao, dobras: vazio.composicao.dobras } }))
    expect(semDobras.nota).toBe('Faltam 7 dobras. Ou informe o % de gordura da bioimpedância.')
  })

  it('CA-2433: o painel da fonte traz a citação completa, os avisos e os valores de apoio', () => {
    const gordura = apresentarLinha(linha('gordura'))
    expect(gordura.fonte?.citacao).toMatch(/^Gallagher D/)
    expect(gordura.apoio).toContainEqual(expect.stringMatching(/^Densidade corporal: 1,0\d{4} g\/ml$/))
    expect(gordura.avisos).toEqual(linha('gordura').avisos)
  })

  it('CA-2434: o detalhe curto diz o método, o ponto da cintura e o percentil', () => {
    expect(apresentarLinha(linha('gordura'), { metodoDaGordura: 'Jackson & Pollock, 7 dobras · Siri' }).subtitulo).toBe('Jackson & Pollock, 7 dobras · Siri')
    expect(apresentarLinha(linha('cintura'), { pontoDaCintura: 'ponto-medio' }).subtitulo).toBe('Ponto médio (OMS)')
    expect(apresentarLinha(linha('cintura'), { pontoDaCintura: null }).subtitulo).toBe('Ponto não registrado')
    expect(apresentarLinha(linha('cb')).subtitulo).toMatch(/^P\d+(–P\d+)?/)
    expect(apresentarLinha(linha('compleicao')).nome).toBe('Compleição')
    expect(apresentarLinha(linha('compleicao')).subtitulo).toBe('Estatura ÷ punho')
  })

  it('CA-2435: no adolescente, o IMC é o escore-z, com o IMC embaixo', () => {
    const imc = apresentarLinha(linha('imc', { ...RENATA, idadeAnos: 15 }))
    expect(imc.nome).toBe('IMC para a idade')
    expect(imc.real).toMatch(/^escore-z [+−]\d,\d{2}$/)
    expect(imc.subtitulo).toBe('IMC 26,58 kg/m²')
  })
})

describe('os textos do ponto de partida (spec antropometria-telas, D-1418 a D-1421 e D-1468)', () => {
  it('D-1418: a faixa do gasto em dezenas, a proteína em g/dia e em g/kg', () => {
    expect(faixaEmDezenas(1513.5, 1818.5)).toBe('1.510 – 1.820')
    expect(faixaEmGramas({ min: 112, max: 154 })).toBe('112 – 154')
    expect(faixaEmGramas({ min: 84.4, max: null })).toBe('a partir de 84')
    expect(faixaEmGKg({ min: 1.6, max: 2.2 }, 'peso')).toBe('1,6 a 2,2 g/kg de peso')
    expect(faixaEmGKg({ min: 1.2, max: null }, 'peso')).toBe('a partir de 1,2 g/kg de peso')
  })

  it('CB-1411: o perfil pelo sexo; sem sexo, nenhum rótulo assume sexo', () => {
    expect(opcoesDoPerfil('F').map((o) => o.rotulo)).toEqual(['Sedentária', 'Ativa', 'Atleta'])
    expect(opcoesDoPerfil('M').map((o) => o.rotulo)).toEqual(['Sedentário', 'Ativo', 'Atleta'])
    expect(opcoesDoPerfil(null).map((o) => o.rotulo)).toEqual(['Sem atividade regular', 'Com atividade regular', 'Atleta'])
  })

  it('D-1421 e D-1468: o que vai para o plano, em g/kg de peso atual com 2 casas, ou o motivo', () => {
    const base: SugestaoDeProteina = {
      calculou: true,
      faixaGKg: { min: 1.2, max: 1.5 },
      base: 'peso-ajustado',
      bases: [],
      gDia: { min: 91.9, max: 114.9 },
      gKgDePeso: { min: 1.02566, max: 1.28208 },
      fonte: FONTES.proteinaObesoProposta,
      evidencia: 'proposta-do-app',
      origemDoPercentual: null,
      avisos: [],
    }
    expect(proteinaParaOPlano(base)).toEqual({ min: 1.03, max: 1.28 })
    expect(proteinaParaOPlano({ ...base, base: 'peso-atual', gKgDePeso: null })).toEqual({ min: 1.2, max: 1.5 })
    expect(proteinaParaOPlano({ ...base, base: null, gDia: null })).toEqual({ motivo: 'Escolha o peso de referência para levar a proteína ao plano.' })
    expect(proteinaParaOPlano({ ...base, base: 'peso-atual', faixaGKg: { min: 1.2, max: null }, gDia: { min: 84, max: null } })).toHaveProperty('motivo')
  })
})
