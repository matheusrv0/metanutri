import { criarCasoVazio } from './caso.ts'
import { estimativasDeAltura, estimativasDePeso } from './estimativas.ts'
import { faseDaVida, linhaCintura, linhaImc, linhaPanturrilha } from './indicadoresCorporais.ts'
import { linhaGordura } from './indicadoresDeGordura.ts'
import { linhaAdequacao, linhaCb, medidasDoBraco } from './indicadoresDoBraco.ts'
import { idadeValida } from './linhaDoResultado.ts'
import { metaDePerda } from './metaDePerda.ts'
import { linhaCompleicao, pesoAjustado, pesoIdeal } from './pesoDeReferencia.ts'
import { gastoDeRepouso, proteinaPorObjetivo } from './pontoDePartida.ts'
import { prioridadeDoCaso } from './prioridadeClinica.ts'
import { aplicacaoDoProtocolo, calcularProtocolo, converterDensidade, type PacienteDoProtocolo } from './protocolosDeDobras.ts'
import type { Caso } from './tipos.ts'

const vazio = criarCasoVazio('i')
/** Homem de 100 kg em 1,75 m (IMC 32,7), com tudo medido; só a idade muda. */
const caso = (idadeAnos: number | null): Caso => ({
  ...vazio,
  sexo: 'M',
  idadeAnos,
  pesoKg: 100,
  estaturaCm: 175,
  objetivo: 'emagrecer',
  circunferenciaCinturaCm: 110,
  circunferenciaPanturrilhaCm: 30,
  medidasCorporais: {
    ...vazio.medidasCorporais,
    bracoRelaxadoDireitoCm: 32,
    quadrilCm: 105,
    pescocoCm: 40,
    abdomenCm: 112,
    alturaDoJoelhoCm: 54,
    semienvergaduraCm: 90,
    diametroPunhoCm: 6,
  },
  composicao: {
    ...vazio.composicao,
    protocolo: 'faulkner-4',
    dobras: { ...vazio.composicao.dobras, tricipital: 15, subescapular: 20, suprailiaca: 18, abdominal: 25, peitoral: 12, coxa: 18 },
  },
})
const paciente = (idadeAnos: number | null): PacienteDoProtocolo => ({ sexo: 'M', idadeAnos, pesoKg: 100, estaturaCm: 175, gestante: false })

const INVALIDAS = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -3, null] as const
const IDADE = { campo: 'idadeAnos', nome: 'a idade' }

describe('idade não informada (spec antropometria-completa, revisão, CA-2085 e CB-1016)', () => {
  it('D-1040: idade é número finito de 0 em diante; o resto é não informada', () => {
    expect(INVALIDAS.map(idadeValida)).toEqual([null, null, null, null, null])
    expect(idadeValida(undefined)).toBeNull()
    expect([0, 17, 40.5, 120].map(idadeValida)).toEqual([0, 17, 40.5, 120])
  })

  it.each(INVALIDAS)('CA-2085: idade %s → sem fase da vida, e os protocolos pedem a idade', (idade) => {
    expect(faseDaVida(caso(idade))).toBeNull()
    const jp3 = calcularProtocolo('jackson-pollock-3', paciente(idade), caso(idade).composicao.dobras)
    expect(jp3).toMatchObject({ calculou: false, motivo: 'Informe a idade.' })
    const ap = aplicacaoDoProtocolo('jackson-pollock-3', paciente(idade), caso(idade).composicao.dobras)
    expect(ap.entradasQueFaltam).toEqual(['idade'])
    expect(ap.aplicaPelaIdade).toBeNull()
    // Guedes não tem idade na conta: com Siri escolhida, calcula, sem comparar a idade com a da amostra (17 a 27).
    const guedes = calcularProtocolo('guedes', paciente(idade), caso(idade).composicao.dobras, { conversao: 'siri' })
    if (!guedes.calculou) throw new Error(guedes.motivo)
    expect(guedes.avisos.join(' ')).not.toMatch(/população de origem/)
    expect(aplicacaoDoProtocolo('guedes', paciente(idade), caso(idade).composicao.dobras).aplicaPelaIdade).toBeNull()
    expect(converterDensidade(1.05, 'automatica', 'M', idade)).toBeNull()
  })

  it.each(INVALIDAS)('CA-2085: idade %s → as linhas com faixa por idade dizem que falta a idade', (idade) => {
    const c = caso(idade)
    const imc = linhaImc(c)
    expect(imc?.valor).toBeCloseTo(100 / 1.75 ** 2, 10)
    expect(imc?.situacao).toBeNull()
    expect(imc?.falta).toEqual([IDADE])
    const gordura = linhaGordura(c)
    expect(gordura?.valor).toBeCloseTo(0.153 * 78 + 5.783, 10)
    expect(gordura?.falta).toEqual([IDADE])
    expect(gordura?.avisos.join(' ')).not.toMatch(/sem referência para a idade/)
    expect(linhaCb(c).falta).toEqual([IDADE])
    expect(linhaAdequacao(c, 'cb')?.falta).toEqual([IDADE])
    expect(medidasDoBraco(32, 15, 'M', idade)?.ambCorrigidaCm2).toBeNull()
  })

  it.each(INVALIDAS)('CA-2085: idade %s → o que depende da fase não vem', (idade) => {
    const c = caso(idade)
    expect(linhaPanturrilha(c)).toBeNull()
    expect(linhaCintura(c)).toBeNull()
    expect(linhaCompleicao(c)).toBeNull()
    expect(pesoIdeal(c)).toBeNull()
    expect(pesoAjustado(c)).toBeNull()
    expect(estimativasDeAltura(c)).toEqual([])
    expect(estimativasDePeso(c)).toEqual([])
    expect(prioridadeDoCaso(c)).toBeNull()
    expect(metaDePerda(c)).toBeNull()
    expect(gastoDeRepouso(c, 'sedentario')).toBeNull()
    expect(proteinaPorObjetivo(c, { perfil: 'ativo' })).toBeNull()
  })

  it('CA-2085: com idade válida, os mesmos dados calculam (controle)', () => {
    const c = caso(40)
    expect(faseDaVida(c)).toBe('adulto')
    expect(calcularProtocolo('jackson-pollock-3', paciente(40), c.composicao.dobras).calculou).toBe(true)
    expect(linhaImc(c)?.falta).toEqual([])
    expect(prioridadeDoCaso(c)).not.toBeNull()
    expect(metaDePerda(c)).not.toBeNull()
    expect(estimativasDePeso(c).length).toBeGreaterThan(0)
  })
})
